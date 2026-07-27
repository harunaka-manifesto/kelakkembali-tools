/* Kelak Kembali — Google Calendar sync.
 *
 * The only server-side code in this project, and it exists for one reason: a
 * Google refresh token is a standing grant over a calendar, and the browser is
 * not a place to keep one. Everywhere else the app talks to Postgres directly,
 * because RLS makes that safe. Here it cannot, so this function holds the
 * credential and the app asks it for outcomes instead.
 *
 * One endpoint, several actions — the deploy story is simpler and they share
 * all their plumbing:
 *
 *   exchange       { code, redirect_uri } -> store a refresh token
 *   status         {}                     -> is there one? (never returns it)
 *   sync           { order_id }           -> write that order's schedule to Google
 *   sync_follow_up { customer_id }        -> write that customer's one nudge
 *   forget         { google_event_ids }   -> delete events that no longer apply
 *   disconnect     {}                     -> revoke at Google and forget it
 *
 * verify_jwt is left on (the default), so Supabase rejects anything without a
 * valid session before this code runs. The service-role client below is
 * therefore acting for an already-authenticated caller, not on its own.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';

/* Reminders are given in minutes before the start of the event. For an all-day
   event Google counts from midnight at the start of that day, so these land at
   exactly 7 days and 3 days ahead rather than at some hour of its choosing. */
const REMINDERS = [
  { method: 'popup', minutes: 7 * 24 * 60 },
  { method: 'popup', minutes: 3 * 24 * 60 }
];

/* A chase is a this-week thing, so one reminder the day before is enough.
   Giving it the fitting schedule's week-out warning would mean two nudges about
   a nudge, and the whole point of the follow-up is that it is small. */
const FOLLOW_UP_REMINDERS = [{ method: 'popup', minutes: 24 * 60 }];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

/**
 * Thrown for anything the caller should see verbatim rather than as a 500.
 *
 * `status` is what we answer the app with; `httpStatus` is what Google actually
 * said, kept separate because the two are not the same question. Collapsing
 * them meant a transient 500 from Google was indistinguishable from a 404, and
 * the sync treated both as "the event is gone" — which quietly created a
 * duplicate every time Google hiccuped.
 */
class Told extends Error {
  status: number;
  httpStatus: number;
  constructor(message: string, status = 400, httpStatus = 0) {
    super(message);
    this.status = status;
    this.httpStatus = httpStatus;
  }
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

function googleClient() {
  const id = Deno.env.get('GOOGLE_CLIENT_ID');
  const secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!id || !secret) {
    throw new Told('Google is not configured on the server — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.', 500);
  }
  return { id, secret };
}

/* ------------------------------- Credentials ------------------------------ */

/**
 * Trade a fresh authorization code for a refresh token and keep it.
 *
 * Google only returns a refresh token when the consent screen was asked for one
 * (access_type=offline&prompt=consent — see connectGoogle in app.js). If it did
 * not, saying so plainly beats storing nothing and failing an hour later.
 */
async function exchange(code: string, redirectUri: string) {
  const { id, secret } = googleClient();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Told('Google rejected the sign-in: ' + (body.error_description || body.error || res.status));
  }
  if (!body.refresh_token) {
    throw new Told('Google did not return a refresh token. Remove this app at ' +
      'myaccount.google.com/permissions and connect again.');
  }

  const db = serviceClient();
  const { error } = await db.from('google_credentials').upsert({
    id: 1,
    refresh_token: body.refresh_token,
    calendar_id: 'primary',
    connected_at: new Date().toISOString()
  });
  if (error) throw new Told('Could not store the credential: ' + error.message, 500);

  return { connected: true };
}

async function readCredential() {
  const db = serviceClient();
  const { data, error } = await db
    .from('google_credentials')
    .select('refresh_token,calendar_id,connected_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Told('Could not read the credential: ' + error.message, 500);
  return data;
}

/** An access token, minted fresh each call. Nothing caches it: the function is
    short-lived, and a token held across invocations would be a token to leak. */
async function accessToken(refreshToken: string) {
  const { id, secret } = googleClient();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const body = await res.json();
  if (!res.ok) {
    /* invalid_grant means the grant is gone for good — revoked in the Google
       account, or the app's credentials changed. Retrying will never fix it,
       so the message says what will. */
    if (body.error === 'invalid_grant') {
      throw new Told('Google access was revoked. Reconnect from the Google Calendar page.', 401);
    }
    throw new Told('Google refused the stored credential: ' + (body.error_description || body.error), 401);
  }
  return body.access_token as string;
}

async function disconnect() {
  const cred = await readCredential();
  if (cred) {
    // Best effort: a token Google has already forgotten still has to go.
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: cred.refresh_token })
      });
    } catch (err) {
      console.error('Revoke failed, deleting anyway:', err);
    }
  }
  const db = serviceClient();
  const { error } = await db.from('google_credentials').delete().eq('id', 1);
  if (error) throw new Told('Could not disconnect: ' + error.message, 500);
  return { connected: false };
}

/* ---------------------------------- Sync ---------------------------------- */

/** "2026-03-21" -> "2026-03-22". Google's all-day end date is exclusive. */
function nextDay(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/* Kept in step with eventTitle in calendar.js. Duplicated rather than shared
   because the two runtimes share no module system, and a title is cheap to
   restate; the scheduling rules, which are not, live in one place only. */
function eventTitle(stage: string, customerName: string, orderTitle: string) {
  const first = String(customerName || '').trim().split(/\s+/)[0] || 'Client';
  const label = String(orderTitle || '').trim();
  return `${stage} — ${first}${label ? ` (${label})` : ''}`;
}

async function callCalendar(
  token: string, calendarId: string, path: string, method: string, body?: unknown
) {
  const res = await fetch(
    `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }
  );

  // DELETE answers 204 with no body.
  if (res.status === 204) return null;

  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Told(
      'Google Calendar: ' + (out.error?.message || res.statusText || res.status),
      res.status === 401 || res.status === 403 ? 401 : 502,
      res.status
    );
  }
  return out;
}

/** 404 and 410 both mean the event is not there any more — deleted by hand in
    Google, most likely. Anything else is a failure and must not be papered
    over by making a second event. */
const isGone = (err: unknown) =>
  err instanceof Told && (err.httpStatus === 404 || err.httpStatus === 410);

/**
 * Make Google match the stored schedule for one order.
 *
 * Every row carries the id of the event it created, so a moved date is a PATCH
 * to that event rather than a second one on a new day. That id is the whole
 * reason the schedule is stored rather than recomputed on read.
 */
async function sync(orderId: string) {
  const cred = await readCredential();
  if (!cred) throw new Told('Google Calendar is not connected.', 409);

  const db = serviceClient();

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id,title,customer_id')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) throw new Told('That order no longer exists.', 404);

  const { data: customer } = await db
    .from('customers')
    .select('name,wedding_date,wedding_date_precision')
    .eq('id', order.customer_id)
    .single();

  /* Every date in the schedule is measured back from the wedding, so when the
     wedding is "sometime in June" every one of them is a guess. A guess in a
     real calendar is worse than a gap: you stop trusting the entries that are
     right. Checked here and not only in the app, because this is the door. */
  if (customer?.wedding_date_precision === 'month') {
    throw new Told(
      'Confirm the exact wedding date before syncing — the schedule is only an estimate.',
      409
    );
  }

  const { data: events, error: eventsErr } = await db
    .from('order_events')
    .select('id,stage,event_date,google_event_id')
    .eq('order_id', orderId)
    .order('event_date', { ascending: true });
  if (eventsErr) throw new Told('Could not read the schedule: ' + eventsErr.message, 500);
  if (!events?.length) throw new Told('This order has no schedule to sync.', 409);

  const token = await accessToken(cred.refresh_token);
  const calendarId = cred.calendar_id || 'primary';

  const appUrl = Deno.env.get('APP_URL') || '';
  const description = [
    customer?.wedding_date ? `Wedding: ${customer.wedding_date}` : '',
    appUrl ? `${appUrl}#/order/${orderId}` : ''
  ].filter(Boolean).join('\n');

  let count = 0;
  for (const row of events) {
    const body = {
      summary: eventTitle(row.stage, customer?.name || '', order.title || ''),
      description,
      start: { date: row.event_date },
      end: { date: nextDay(row.event_date) },
      reminders: { useDefault: false, overrides: REMINDERS }
    };

    let googleId: string | null = row.google_event_id;
    if (googleId) {
      /* A PATCH to an event deleted by hand in Google answers 404 or 410. That
         is not worth failing the sync over — the event is gone, so make a new
         one and adopt its id. Every other error is real and is raised: creating
         a replacement on, say, a 500 would leave two events behind. */
      try {
        await callCalendar(token, calendarId, `/${encodeURIComponent(googleId)}`, 'PATCH', body);
      } catch (err) {
        if (!isGone(err)) throw err;
        googleId = null;
      }
    }
    if (!googleId) {
      const created = await callCalendar(token, calendarId, '', 'POST', body);
      googleId = created?.id ?? null;
    }

    await db.from('order_events')
      .update({ google_event_id: googleId, synced_at: new Date().toISOString() })
      .eq('id', row.id);
    count++;
  }

  return { count, calendar_id: calendarId };
}

/**
 * Make Google match the one follow-up nudge a customer carries.
 *
 * Same PATCH-or-POST shape as sync, with one extra case: the nudge can be
 * cleared as well as moved. Reaching a stage that chases nothing (Ordering,
 * Lost) or taking a deposit leaves follow_up_date null, and the event has to go
 * with it — a reminder to chase someone who has already paid is worse than no
 * reminder at all.
 */
async function syncFollowUp(customerId: string) {
  const cred = await readCredential();
  if (!cred) throw new Told('Google Calendar is not connected.', 409);

  const db = serviceClient();

  const { data: customer, error } = await db
    .from('customers')
    .select('id,name,follow_up_date,follow_up_label,follow_up_google_event_id')
    .eq('id', customerId)
    .single();
  if (error || !customer) throw new Told('That customer no longer exists.', 404);

  const token = await accessToken(cred.refresh_token);
  const calendarId = cred.calendar_id || 'primary';
  const existing = customer.follow_up_google_event_id;

  if (!customer.follow_up_date) {
    if (existing) {
      try {
        await callCalendar(token, calendarId, `/${encodeURIComponent(existing)}`, 'DELETE');
      } catch (err) {
        // Already gone is the outcome we wanted.
        if (!isGone(err)) throw err;
      }
    }
    await db.from('customers')
      .update({ follow_up_google_event_id: null, follow_up_synced_at: null })
      .eq('id', customerId);
    return { cleared: true };
  }

  const first = String(customer.name || '').trim().split(/\s+/)[0] || 'Client';
  const appUrl = Deno.env.get('APP_URL') || '';
  const body = {
    summary: `${customer.follow_up_label || 'Follow up'} — ${first}`,
    description: appUrl ? `${appUrl}#/customer/${customerId}` : '',
    start: { date: customer.follow_up_date },
    end: { date: nextDay(customer.follow_up_date) },
    reminders: { useDefault: false, overrides: FOLLOW_UP_REMINDERS }
  };

  let googleId: string | null = existing;
  if (googleId) {
    try {
      await callCalendar(token, calendarId, `/${encodeURIComponent(googleId)}`, 'PATCH', body);
    } catch (err) {
      if (!isGone(err)) throw err;
      googleId = null;
    }
  }
  if (!googleId) {
    const created = await callCalendar(token, calendarId, '', 'POST', body);
    googleId = created?.id ?? null;
  }

  await db.from('customers').update({
    follow_up_google_event_id: googleId,
    follow_up_synced_at: new Date().toISOString()
  }).eq('id', customerId);

  return { synced: true, date: customer.follow_up_date };
}

/**
 * Remove events for stages that no longer exist.
 *
 * Called with the ids the app dropped when a tighter window cut the programme
 * down. Failures are logged rather than raised: an event that cannot be deleted
 * is a stale entry in a calendar, not a reason to refuse the rest of the work.
 */
async function forget(googleEventIds: string[]) {
  const cred = await readCredential();
  if (!cred || !googleEventIds.length) return { deleted: 0 };

  const token = await accessToken(cred.refresh_token);
  const calendarId = cred.calendar_id || 'primary';

  let deleted = 0;
  for (const id of googleEventIds) {
    try {
      await callCalendar(token, calendarId, `/${encodeURIComponent(id)}`, 'DELETE');
      deleted++;
    } catch (err) {
      // Already gone is the outcome we wanted, not a failure.
      if (isGone(err)) { deleted++; continue; }
      console.error('Could not delete ' + id + ':', err);
    }
  }
  return { deleted };
}

/* --------------------------------- Router --------------------------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'exchange': {
        if (!body.code || !body.redirect_uri) throw new Told('Missing code or redirect_uri.');
        return json(await exchange(body.code, body.redirect_uri));
      }
      case 'status': {
        const cred = await readCredential();
        return json({ connected: !!cred, connected_at: cred?.connected_at ?? null });
      }
      case 'sync': {
        if (!body.order_id) throw new Told('Missing order_id.');
        return json(await sync(body.order_id));
      }
      case 'sync_follow_up': {
        if (!body.customer_id) throw new Told('Missing customer_id.');
        return json(await syncFollowUp(body.customer_id));
      }
      case 'forget': {
        return json(await forget(body.google_event_ids || []));
      }
      case 'disconnect': {
        return json(await disconnect());
      }
      default:
        throw new Told('Unknown action: ' + String(action));
    }
  } catch (err) {
    const told = err instanceof Told;
    if (!told) console.error(err);
    return json(
      { error: told ? err.message : 'Something went wrong on the calendar service.' },
      told ? (err as Told).status : 500
    );
  }
});
