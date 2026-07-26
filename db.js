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

  function init() {
    if (client) return client;
    if (!isConfigured()) return null;
    client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
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

  async function signIn(password) {
    if (!init()) throw new Error('Supabase is not configured — see config.js');
    const { error } = await client.auth.signInWithPassword({
      email: CFG.SHARED_EMAIL,
      password: password
    });
    // Supabase says "Invalid login credentials" for a bad password, which reads
    // oddly when the email is fixed and invisible to the user.
    if (error) throw new Error(/credential/i.test(error.message) ? 'Wrong password' : error.message);
  }

  async function signOut() {
    if (!init()) return;
    await client.auth.signOut();
  }

  /* ------------------------------- Customers ------------------------------ */

  const CUSTOMER_FIELDS =
    'id,name,phone,instagram,source,wedding_date,fitting_1_date,final_fitting_date,notes,created_at';

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

  const ORDER_FIELDS = 'id,customer_id,document_date,status,items,includes,created_at';

  async function listOrders(customerId) {
    return unwrap(await init()
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('customer_id', customerId)
      .order('document_date', { ascending: false }));
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

  return {
    isConfigured, init, currentSession, signIn, signOut,
    listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    listOrders, getOrder, createOrder, updateOrder, deleteOrder,
    logDocument, listDocumentLog
  };
})();
