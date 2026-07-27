/* Kelak Kembali — public intake webhook.
 *
 * Tally posts a form response here and it lands in intake_submissions, where it
 * waits to be read and accepted. Nothing here creates a customer: that is a
 * decision, and it is made in the app by someone who has looked at the answers.
 *
 * This is the only function in the project with verify_jwt off (declared in
 * supabase/config.toml), because Tally has no Supabase session to present. That
 * makes the signature check below the entire security boundary — everything
 * past it runs with the service-role key. So it comes first, it works on the
 * raw bytes, and it says nothing about why it failed.
 *
 * Read that last point literally. A 401 that distinguishes "no signature" from
 * "wrong signature" from "unknown form" is a 401 that helps someone guess, and
 * there is nobody on the other end of this endpoint who needs the help: Tally
 * either signs correctly or it does not.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, tally-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

/* --------------------------------- Auth ---------------------------------- */

/**
 * Constant-time compare. A plain === leaks where the first differing byte is,
 * and with enough attempts that is a signature. Length is compared first and
 * openly, which is fine: the length of a SHA-256 digest is not a secret.
 */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureValid(raw: string, provided: string | null) {
  const secret = Deno.env.get('TALLY_SIGNING_SECRET');
  if (!secret) {
    /* Refuse rather than accept. An unset secret is a misconfiguration, and the
       failure mode of guessing otherwise is an open endpoint into the database
       — the one outcome this whole file exists to prevent. */
    console.error('TALLY_SIGNING_SECRET is not set; rejecting.');
    return false;
  }
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return safeEqual(expected, provided.trim());
}

/* ------------------------------ Field mapping ----------------------------- */

/* Matched on the question label rather than Tally's field key, because the keys
   are opaque generated ids and the labels are the thing you can see and edit in
   Tally. Substring and case-insensitive so "Your name" and "Name" both land,
   and so a later reword does not silently start dropping answers.

   Whatever this misses is not lost: the whole body is stored in `payload`, and
   the review screen prints every answer it finds there. */
const MATCHERS: Record<string, string[]> = {
  name: ['name'],
  phone: ['whatsapp', 'phone', 'nomor'],
  // Not a bare 'ig': it is a substring of "design", "signature" and plenty else.
  instagram: ['instagram', 'handle'],
  source: ['hear about', 'how did you', 'source'],
  notes: ['looking for', 'tell us', 'message', 'anything else']
};

type Field = { label?: string; value?: unknown; type?: string; options?: unknown };

/** Tally sends select answers as an array of option ids; flatten to readable text. */
function readable(field: Field): string {
  const v = field.value;
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) {
    const options = (field.options as { id: string; text: string }[] | undefined) || [];
    return v.map((item) => {
      const hit = options.find((o) => o.id === item);
      return hit ? hit.text : String(item);
    }).filter(Boolean).join(', ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const looksLikeDate = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s);

/** "June 2027", "2027-06" -> "2027-06-30". Last day, matching the app's rule. */
function monthToLastDay(s: string): string | null {
  const iso = /^(\d{4})-(\d{2})$/.exec(s.trim());
  let year: number, month: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
  } else {
    const named = /^([A-Za-z]+)\s+(\d{4})$/.exec(s.trim());
    if (!named) return null;
    const i = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
      'august', 'september', 'october', 'november', 'december']
      .indexOf(named[1].toLowerCase());
    if (i < 0) return null;
    year = Number(named[2]);
    month = i + 1;
  }
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function extract(payload: Record<string, unknown>) {
  const fields = ((payload?.data as { fields?: Field[] })?.fields || []) as Field[];
  const out: Record<string, string | null> = {
    name: null, phone: null, instagram: null, source: null, notes: null,
    wedding_date: null, wedding_date_precision: null
  };

  for (const field of fields) {
    const label = String(field.label || '').toLowerCase();
    const value = readable(field).trim();
    if (!value) continue;

    /* The wedding is the one answer that can arrive in two shapes, so it is
       read off the value rather than the label — whether the form asks for a
       date or a month, what matters is which one came back. */
    if (label.includes('wedding') || label.includes('date')) {
      if (looksLikeDate(value)) {
        out.wedding_date = value.slice(0, 10);
        out.wedding_date_precision = 'day';
        continue;
      }
      const month = monthToLastDay(value);
      if (month) {
        out.wedding_date = month;
        out.wedding_date_precision = 'month';
        continue;
      }
    }

    for (const [column, needles] of Object.entries(MATCHERS)) {
      if (out[column]) continue;   // first match wins; later questions do not overwrite
      if (needles.some((n) => label.includes(n))) { out[column] = value; break; }
    }
  }

  return out;
}

/* --------------------------------- Router --------------------------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  /* Text, not .json(). The signature covers the exact bytes Tally sent, and
     a parse-then-restringify would not reproduce them. */
  const raw = await req.text();

  if (!await signatureValid(raw, req.headers.get('tally-signature'))) {
    return json({ ok: false }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false }, 400);
  }

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { error } = await db.from('intake_submissions')
      .insert({ payload, ...extract(payload) });
    if (error) throw error;

    /* Tally retries on a non-2xx, so this has to be honest about success and
       nothing more. The response body reaches a webhook log, not a person. */
    return json({ ok: true });
  } catch (err) {
    console.error('Intake insert failed:', err);
    return json({ ok: false }, 500);
  }
});
