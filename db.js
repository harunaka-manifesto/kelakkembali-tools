/* Kelak Kembali — data layer.

   Every call to Supabase lives here. The views never touch the client
   directly, so the shape of a "customer" or an "order" is defined in exactly
   one place, and swapping the backend later means rewriting only this file.

   Auth is one shared account: the email is in config.js, the password is what
   the gate asks for. Row-level security (see schema.sql) grants nothing to
   anonymous callers, so the anon key being public costs nothing. */

window.KK = window.KK || {};

KK.db = (function () {
  'use strict';

  const CFG = window.KK_CONFIG || {};
  let client = null;

  /** True once config.js has been filled in with something plausible. */
  function isConfigured() {
    return /^https:\/\/.+\.supabase\.co\/?$/.test(String(CFG.SUPABASE_URL || '')) &&
      String(CFG.SUPABASE_ANON_KEY || '').length > 40;
  }

  /* ----------------------------- Remember me ------------------------------

     Checked: the Supabase client's own storage is localStorage, so the
     session (and its auto-refresh) survives closing the browser — and the
     password itself is saved alongside it so the gate can pre-fill it.
     Unchecked: storage is sessionStorage instead, so the session ends the
     moment the tab closes, and no password is kept anywhere.

     Saving the password in localStorage carries the same trust model the
     shared-password gate already has: whoever has access to this browser
     profile already has full access to the data once signed in. It is not
     an additional secret being exposed. */

  const REMEMBER_KEY = 'kk_remember_me';
  const PASSWORD_KEY = 'kk_saved_password';

  function rememberPreference() {
    const v = localStorage.getItem(REMEMBER_KEY);
    return v === null ? true : v === '1';
  }

  function setRememberPreference(remember) {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }

  function savedPassword() {
    return localStorage.getItem(PASSWORD_KEY) || '';
  }

  function savePassword(password) {
    localStorage.setItem(PASSWORD_KEY, password);
  }

  function clearSavedPassword() {
    localStorage.removeItem(PASSWORD_KEY);
  }

  /* The storage choice is fixed at client construction, so it has to be
     decided before createClient runs — toggling the checkbox mid-session
     does nothing until the next sign-in rebuilds the client. */
  function init() {
    if (client) return client;
    if (!isConfigured()) return null;
    client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: rememberPreference() ? window.localStorage : window.sessionStorage
      }
    });
    return client;
  }

  /** Unwrap a PostgREST response, turning its error into a thrown one. */
  function unwrap(res) {
    if (res.error) {
      const err = new Error(res.error.message || 'Request failed');
      err.code = res.error.code || '';
      throw err;
    }
    return res.data;
  }

  /* PostgREST rejects a token whose `exp`, `iat` or `nbf` is outside a 30-second
     window around its own clock, and answers PGRST301 — "JWT expired", "JWT not
     yet valid", "JWT issued at future". Every one of those means the same thing
     to us: the token in hand is not usable and a fresh one might be. See
     isStaleToken's caller in app.js for what we do about it. */
  function isStaleToken(err) {
    return !!err && (err.code === 'PGRST301' || /\bJWT\b/i.test(err.message || ''));
  }

  /** Mint a new access token from the stored refresh token. */
  async function refreshSession() {
    if (!init()) return null;
    const { data, error } = await client.auth.refreshSession();
    if (error) throw new Error(error.message || 'Could not refresh the session');
    return data.session || null;
  }

  /* --------------------------------- Auth -------------------------------- */

  async function currentSession() {
    if (!init()) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function signIn(password, remember) {
    // The storage choice is baked into the client at construction, so a
    // change of heart on "remember me" means throwing the boot-time client
    // away and building a fresh one. Safe here: nothing has authenticated on
    // it yet, the only prior use was a currentSession() check at boot.
    setRememberPreference(remember);
    client = null;
    if (!init()) throw new Error('Supabase is not configured — see config.js');
    const { error } = await client.auth.signInWithPassword({
      email: CFG.SHARED_EMAIL,
      password: password
    });
    // Supabase says "Invalid login credentials" for a bad password, which reads
    // oddly when the email is fixed and invisible to the user.
    if (error) throw new Error(/credential/i.test(error.message) ? 'Wrong password' : error.message);

    if (remember) savePassword(password);
    else clearSavedPassword();
  }

  async function signOut() {
    if (!init()) return;
    await client.auth.signOut();
    clearSavedPassword();
  }

  /* ------------------------------- Customers ------------------------------ */

  const CUSTOMER_FIELDS =
    'id,name,phone,instagram,source,wedding_date,notes,created_at';

  /** Soonest wedding first; customers without a date sink to the bottom. */
  async function listCustomers() {
    return unwrap(await init()
      .from('customers')
      .select(CUSTOMER_FIELDS)
      .order('wedding_date', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }));
  }

  async function getCustomer(id) {
    return unwrap(await init()
      .from('customers').select(CUSTOMER_FIELDS).eq('id', id).single());
  }

  async function createCustomer(patch) {
    return unwrap(await init()
      .from('customers').insert(patch).select(CUSTOMER_FIELDS).single());
  }

  async function updateCustomer(id, patch) {
    return unwrap(await init()
      .from('customers').update(patch).eq('id', id).select(CUSTOMER_FIELDS).single());
  }

  /** Orders and document log cascade from the schema, so this is one call. */
  async function deleteCustomer(id) {
    unwrap(await init().from('customers').delete().eq('id', id));
  }

  /* --------------------------------- Orders ------------------------------- */

  const ORDER_FIELDS =
    'id,customer_id,title,doc_name,document_date,status,items,includes,' +
    'payment_scheme,payment_terms,fitting_1_date,final_fitting_date,created_at';

  /** Lightweight: every order across every customer, for the homepage overview. */
  const ORDER_OVERVIEW_FIELDS = 'id,customer_id,status,items,fitting_1_date,final_fitting_date';

  async function listOrders(customerId) {
    return unwrap(await init()
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('customer_id', customerId)
      .order('document_date', { ascending: false }));
  }

  async function listAllOrders() {
    return unwrap(await init().from('orders').select(ORDER_OVERVIEW_FIELDS));
  }

  async function getOrder(id) {
    return unwrap(await init()
      .from('orders').select(ORDER_FIELDS).eq('id', id).single());
  }

  async function createOrder(patch) {
    return unwrap(await init()
      .from('orders').insert(patch).select(ORDER_FIELDS).single());
  }

  async function updateOrder(id, patch) {
    return unwrap(await init()
      .from('orders').update(patch).eq('id', id).select(ORDER_FIELDS).single());
  }

  async function deleteOrder(id) {
    unwrap(await init().from('orders').delete().eq('id', id));
  }

  /* ------------------------------ Document log ---------------------------- */

  /* Written only after a PDF has actually been saved, so the log never claims a
     download that failed. Rows are kept verbatim when the order is later
     edited — that is the whole point of having them. */

  async function logDocument(orderId, kind, total) {
    unwrap(await init()
      .from('document_log').insert({ order_id: orderId, kind: kind, total: total }));
  }

  async function listDocumentLog(orderId) {
    return unwrap(await init()
      .from('document_log')
      .select('id,kind,total,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }));
  }

  /* ------------------------------ Order history ---------------------------- */

  /* created / edited / payment-logged events. Separate from document_log
     (downloads) — the two are merged only when the order detail page renders
     its History section. */

  async function logOrderHistory(orderId, action, detail) {
    unwrap(await init()
      .from('order_history').insert({ order_id: orderId, action: action, detail: detail || {} }));
  }

  async function listOrderHistory(orderId) {
    return unwrap(await init()
      .from('order_history')
      .select('id,action,detail,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }));
  }

  /** Every payment-logged event across every order, for the homepage overview. */
  async function listAllPaymentLog() {
    return unwrap(await init()
      .from('order_history')
      .select('id,order_id,detail,created_at')
      .eq('action', 'payment_logged'));
  }

  /* ------------------------------ Order events ---------------------------- */

  /* The fitting schedule. Computed by KK.calendar from the order's two anchor
     dates and written here so each appointment can remember the Google event
     it created. */

  const EVENT_FIELDS = 'id,order_id,stage,event_date,google_event_id,synced_at';

  async function listOrderEvents(orderId) {
    return unwrap(await init()
      .from('order_events')
      .select(EVENT_FIELDS)
      .eq('order_id', orderId)
      .order('event_date', { ascending: true }));
  }

  /** Every appointment across every order, for the homepage overview. */
  async function listAllOrderEvents() {
    return unwrap(await init()
      .from('order_events').select('order_id,stage,event_date'));
  }

  /**
   * Make the stored schedule match a freshly computed one.
   *
   * Rewritten rather than diffed, because the computation is whole-programme:
   * moving one anchor moves everything. The one thing that must survive the
   * rewrite is google_event_id — losing it would orphan the event in Google
   * and create a second one on the next sync — so surviving stages are updated
   * in place and only genuinely gone ones are deleted.
   *
   * Returns the rows that no longer exist, so the caller can have their Google
   * events deleted too.
   */
  async function replaceOrderEvents(orderId, events) {
    const existing = await listOrderEvents(orderId);
    const byStage = {};
    existing.forEach((row) => { byStage[row.stage] = row; });

    const wanted = {};
    events.forEach((e) => { wanted[e.stage] = e; });

    const removed = existing.filter((row) => !wanted[row.stage]);
    if (removed.length) {
      unwrap(await init()
        .from('order_events').delete().in('id', removed.map((r) => r.id)));
    }

    for (const e of events) {
      const prior = byStage[e.stage];
      if (!prior) {
        unwrap(await init().from('order_events')
          .insert({ order_id: orderId, stage: e.stage, event_date: e.event_date }));
      } else if (prior.event_date !== e.event_date) {
        // synced_at is cleared, not the event id: the event still exists in
        // Google, it is just no longer showing the right day.
        unwrap(await init().from('order_events')
          .update({ event_date: e.event_date, synced_at: null }).eq('id', prior.id));
      }
    }

    return { removed: removed, events: await listOrderEvents(orderId) };
  }

  /* ---------------------------- Google Calendar --------------------------- */

  /* Everything here goes through the google-calendar Edge Function. The
     refresh token lives in a table no policy grants access to (see
     schema.sql), so the browser can ask for a sync but can never hold the
     credential that performs one. */

  async function callGoogle(action, payload) {
    const c = init();
    if (!c) throw new Error('Supabase is not configured — see config.js');
    const { data, error } = await c.functions.invoke('google-calendar', {
      body: Object.assign({ action: action }, payload || {})
    });
    /* FunctionsHttpError carries the useful message in the response body, not
       in error.message, which is only ever "Edge Function returned a non-2xx
       status code". */
    if (error) {
      let detail = '';
      try { detail = (await error.context.json()).error || ''; } catch (e) { /* not JSON */ }
      throw new Error(detail || error.message || 'Google Calendar request failed');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  const googleStatus = () => callGoogle('status');
  const googleExchange = (code, redirectUri) =>
    callGoogle('exchange', { code: code, redirect_uri: redirectUri });
  const googleDisconnect = () => callGoogle('disconnect');
  const googleForget = (ids) => callGoogle('forget', { google_event_ids: ids });
  const syncOrderCalendar = (orderId) => callGoogle('sync', { order_id: orderId });

  return {
    isConfigured, init, currentSession, signIn, signOut,
    refreshSession, isStaleToken,
    rememberPreference, savedPassword,
    listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    listOrders, listAllOrders, getOrder, createOrder, updateOrder, deleteOrder,
    logDocument, listDocumentLog,
    logOrderHistory, listOrderHistory, listAllPaymentLog,
    listOrderEvents, listAllOrderEvents, replaceOrderEvents,
    googleStatus, googleExchange, googleDisconnect, googleForget, syncOrderCalendar
  };
})();
