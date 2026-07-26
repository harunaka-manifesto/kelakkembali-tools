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
    if (res.error) throw new Error(res.error.message || 'Request failed');
    return res.data;
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
    'id,customer_id,title,document_date,status,items,includes,fitting_1_date,final_fitting_date,created_at';

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

  return {
    isConfigured, init, currentSession, signIn, signOut,
    rememberPreference, savedPassword,
    listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    listOrders, listAllOrders, getOrder, createOrder, updateOrder, deleteOrder,
    logDocument, listDocumentLog,
    logOrderHistory, listOrderHistory, listAllPaymentLog
  };
})();
