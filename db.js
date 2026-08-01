/* Sole browser data-access layer.
   
   - Owns: Supabase client initialization, authentication/session persistence, PostgREST table projections and CRUD operations, and Edge Function invocation (Google Calendar / Google Drive).
   - Does NOT own: DOM rendering, schedule calculation, PDF rendering, or UI state.
   - Used by: app.js, fittings.js, moodboard.js
*/
window.KK = window.KK || {};

KK.db = (function () {
  'use strict';

  const config = window.KK_CONFIG || {};
  let client = null;

  function isConfigured() {
    return /^https:\/\/.+\.supabase\.co\/?$/.test(String(config.SUPABASE_URL || '')) && String(config.SUPABASE_ANON_KEY || '').length > 40;
  }

  const STORAGE_KEY_REMEMBER = 'kk_remember_me';
  const STORAGE_KEY_PASSWORD = 'kk_saved_password';

  function rememberPreference() {
    const val = localStorage.getItem(STORAGE_KEY_REMEMBER);
    return val === null || val === '1';
  }

  function clearSavedPassword() {
    localStorage.removeItem(STORAGE_KEY_PASSWORD);
  }

  function init() {
    if (client) return client;
    if (!isConfigured()) return null;
    client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: rememberPreference() ? window.localStorage : window.sessionStorage
      }
    });
    return client;
  }

  function unwrap(res) {
    if (res.error) {
      const err = new Error(res.error.message || 'Request failed');
      err.code = res.error.code || '';
      throw err;
    }
    return res.data;
  }

  /* -------------------------- Table Column Projections -------------------- */

  const PROJECTION_CUSTOMERS = 'id,name,phone,instagram,source,wedding_date,wedding_date_precision,notes,moodboard_date,cancelled_at,cancelled_reason,follow_up_date,follow_up_label,follow_up_google_event_id,follow_up_synced_at,created_at';
  const PROJECTION_ORDERS = 'id,customer_id,title,doc_name,document_date,status,items,includes,payment_scheme,payment_terms,first_payment_date,second_payment_date,final_payment_date,created_at';
  const PROJECTION_ORDER_EVENTS = 'id,order_id,stage,event_date,end_date,pinned,google_event_id,synced_at';
  const PROJECTION_FITTING_PHOTOS = 'id,order_id,session_id,stage,caption,drive_file_id,drive_link,position,created_at';
  const PROJECTION_FITTING_SESSIONS = 'id,order_id,stage,status,created_at,completed_at';
  const PROJECTION_INTAKE = 'id,payload,name,phone,instagram,source,wedding_date,wedding_date_precision,notes,status,customer_id,created_at,reviewed_at';

  /* --------------------------- Edge Function Helpers ---------------------- */

  async function callGoogle(action, payload) {
    const sb = init();
    if (!sb) throw new Error('Supabase is not configured — see config.js');

    const { data, error } = await sb.functions.invoke('google-calendar', {
      body: Object.assign({ action }, payload || {})
    });

    if (error) {
      let detail = '';
      try { detail = (await error.context.json()).error || ''; } catch (_) {}
      throw new Error(detail || error.message || 'Google Calendar request failed');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  async function callDrive(action, payload) {
    const sb = init();
    if (!sb) throw new Error('Supabase is not configured — see config.js');

    const { data, error } = await sb.functions.invoke('google-drive', {
      body: Object.assign({ action }, payload || {})
    });

    if (error) {
      let detail = '';
      try { detail = (await error.context.json()).error || ''; } catch (_) {}
      throw new Error(detail || error.message || 'Google Drive request failed');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    isConfigured,
    init,

    currentSession: async function () {
      if (!init()) return null;
      const { data } = await client.auth.getSession();
      return data.session || null;
    },

    signIn: async function (password, rememberMe) {
      localStorage.setItem(STORAGE_KEY_REMEMBER, rememberMe ? '1' : '0');
      client = null; // Reset client to use selected storage
      if (!init()) throw new Error('Supabase is not configured — see config.js');

      const { error } = await client.auth.signInWithPassword({
        email: config.SHARED_EMAIL,
        password
      });

      if (error) {
        throw new Error(/credential/i.test(error.message) ? 'Wrong password' : error.message);
      }

      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_PASSWORD, password);
      } else {
        clearSavedPassword();
      }
    },

    signOut: async function () {
      if (init()) {
        await client.auth.signOut();
        clearSavedPassword();
      }
    },

    refreshSession: async function () {
      if (!init()) return null;
      const { data, error } = await client.auth.refreshSession();
      if (error) throw new Error(error.message || 'Could not refresh the session');
      return data.session || null;
    },

    isStaleToken: function (err) {
      return !!err && (err.code === 'PGRST301' || /\bJWT\b/i.test(err.message || ''));
    },

    rememberPreference,

    savedPassword: function () {
      return localStorage.getItem(STORAGE_KEY_PASSWORD) || '';
    },

    /* ----------------------------- Customer CRUD --------------------------- */

    listCustomers: async function () {
      return unwrap(await init().from('customers').select(PROJECTION_CUSTOMERS).order('wedding_date', { ascending: true, nullsFirst: false }).order('name', { ascending: true }));
    },

    getCustomer: async function (id) {
      return unwrap(await init().from('customers').select(PROJECTION_CUSTOMERS).eq('id', id).single());
    },

    createCustomer: async function (record) {
      return unwrap(await init().from('customers').insert(record).select(PROJECTION_CUSTOMERS).single());
    },

    updateCustomer: async function (id, record) {
      return unwrap(await init().from('customers').update(record).eq('id', id).select(PROJECTION_CUSTOMERS).single());
    },

    deleteCustomer: async function (id) {
      unwrap(await init().from('customers').delete().eq('id', id));
    },

    /* ------------------------------ Order CRUD ----------------------------- */

    listOrders: async function (customerId) {
      return unwrap(await init().from('orders').select(PROJECTION_ORDERS).eq('customer_id', customerId).order('document_date', { ascending: false }));
    },

    listAllOrders: async function () {
      return unwrap(await init().from('orders').select('id,customer_id,status,items,first_payment_date,second_payment_date,final_payment_date'));
    },

    getOrder: async function (id) {
      return unwrap(await init().from('orders').select(PROJECTION_ORDERS).eq('id', id).single());
    },

    createOrder: async function (record) {
      return unwrap(await init().from('orders').insert(record).select(PROJECTION_ORDERS).single());
    },

    updateOrder: async function (id, record) {
      return unwrap(await init().from('orders').update(record).eq('id', id).select(PROJECTION_ORDERS).single());
    },

    deleteOrder: async function (id) {
      unwrap(await init().from('orders').delete().eq('id', id));
    },

    /* --------------------------- Document & History ------------------------ */

    logDocument: async function (orderId, kind, total) {
      unwrap(await init().from('document_log').insert({ order_id: orderId, kind, total }));
    },

    listDocumentLog: async function (orderId) {
      const res = await init().from('document_log').select('id,kind,total,drive_link,created_at').eq('order_id', orderId).order('created_at', { ascending: false });
      if (res.error && /drive_link/.test(res.error.message)) {
        return unwrap(await init().from('document_log').select('id,kind,total,created_at').eq('order_id', orderId).order('created_at', { ascending: false }));
      }
      return unwrap(res);
    },

    logOrderHistory: async function (orderId, action, detail) {
      unwrap(await init().from('order_history').insert({ order_id: orderId, action, detail: detail || {} }));
    },

    listOrderHistory: async function (orderId) {
      return unwrap(await init().from('order_history').select('id,action,detail,created_at').eq('order_id', orderId).order('created_at', { ascending: false }));
    },

    /* ----------------------------- Order Events ---------------------------- */

    listOrderEvents: async function (orderId) {
      return unwrap(await init().from('order_events').select(PROJECTION_ORDER_EVENTS).eq('order_id', orderId).order('event_date', { ascending: true }));
    },

    listAllOrderEvents: async function () {
      return unwrap(await init().from('order_events').select('order_id,stage,event_date,end_date'));
    },

    replaceOrderEvents: async function (orderId, newEvents, allowedStages) {
      const currentEvents = await this.listOrderEvents(orderId);
      const currentByStage = {};
      currentEvents.forEach((e) => { currentByStage[e.stage] = e; });

      const newByStage = {};
      newEvents.forEach((e) => { newByStage[e.stage] = e; });

      const toRemove = currentEvents.filter((e) => {
        if (allowedStages && allowedStages.indexOf(e.stage) === -1) return false;
        return !newByStage[e.stage];
      });

      if (toRemove.length) {
        unwrap(await init().from('order_events').delete().in('id', toRemove.map((e) => e.id)));
      }

      for (const item of newEvents) {
        const existing = currentByStage[item.stage];
        const endDateVal = item.end_date || null;
        if (existing) {
          if (existing.event_date !== item.event_date || (existing.end_date || null) !== endDateVal) {
            if (existing.pinned) continue;
            unwrap(await init().from('order_events').update({
              event_date: item.event_date,
              end_date: endDateVal,
              synced_at: null
            }).eq('id', existing.id));
          }
        } else {
          unwrap(await init().from('order_events').insert({
            order_id: orderId,
            stage: item.stage,
            event_date: item.event_date,
            end_date: endDateVal
          }));
        }
      }

      return {
        removed: toRemove,
        events: await this.listOrderEvents(orderId)
      };
    },

    /* --------------------------- Fitting Sessions -------------------------- */

    listFittingSessions: async function (orderId) {
      return unwrap(await init().from('fitting_sessions').select(PROJECTION_FITTING_SESSIONS).eq('order_id', orderId).order('created_at', { ascending: false }));
    },

    getFittingSession: async function (id) {
      return unwrap(await init().from('fitting_sessions').select(PROJECTION_FITTING_SESSIONS).eq('id', id).single());
    },

    createFittingSession: async function (record) {
      return unwrap(await init().from('fitting_sessions').insert(record).select(PROJECTION_FITTING_SESSIONS).single());
    },

    updateFittingSession: async function (id, record) {
      return unwrap(await init().from('fitting_sessions').update(record).eq('id', id).select(PROJECTION_FITTING_SESSIONS).single());
    },

    listFittingPhotos: async function (orderId) {
      return unwrap(await init().from('fitting_photos').select(PROJECTION_FITTING_PHOTOS).eq('order_id', orderId).order('position', { ascending: true }));
    },

    createFittingPhoto: async function (record) {
      return unwrap(await init().from('fitting_photos').insert(record).select(PROJECTION_FITTING_PHOTOS).single());
    },

    updateFittingPhoto: async function (id, record) {
      return unwrap(await init().from('fitting_photos').update(record).eq('id', id).select(PROJECTION_FITTING_PHOTOS).single());
    },

    deleteFittingPhoto: async function (id) {
      unwrap(await init().from('fitting_photos').delete().eq('id', id));
    },

    /* ----------------------------- Intake Enquiries ------------------------- */

    listIntake: async function (statusFilter) {
      let query = init().from('intake_submissions').select(PROJECTION_INTAKE);
      if (statusFilter) query = query.eq('status', statusFilter);
      return unwrap(await query.order('created_at', { ascending: false }));
    },

    getIntake: async function (id) {
      return unwrap(await init().from('intake_submissions').select(PROJECTION_INTAKE).eq('id', id).single());
    },

    resolveIntake: async function (id, status, customerId) {
      return unwrap(await init().from('intake_submissions').update({
        status,
        customer_id: customerId || null,
        reviewed_at: new Date().toISOString()
      }).eq('id', id).select(PROJECTION_INTAKE).single());
    },

    /* ----------------------------- Google Integrations ---------------------- */

    googleStatus: () => callGoogle('status'),
    googleExchange: (code, redirectUri) => callGoogle('exchange', { code, redirect_uri: redirectUri }),
    googleDisconnect: () => callGoogle('disconnect'),
    googleForget: (eventIds) => callGoogle('forget', { google_event_ids: eventIds }),
    syncOrderCalendar: (orderId) => callGoogle('sync', { order_id: orderId }),
    syncFollowUp: (customerId) => callGoogle('sync_follow_up', { customer_id: customerId }),

    driveSaveMoodboardPdf: (fileName, pdfBase64, customerName, orderTitle) =>
      callDrive('save_moodboard_pdf', { file_name: fileName, pdf_base64: pdfBase64, customer_name: customerName, order_title: orderTitle }),
    driveSaveFittingPhoto: (imageBase64, mimeType, fileName, customerName, orderTitle, stage) =>
      callDrive('save_fitting_photo', { image_base64: imageBase64, mime_type: mimeType, file_name: fileName, customer_name: customerName, order_title: orderTitle, stage }),

    logMoodboard: async function (orderId, driveLink) {
      unwrap(await init().from('document_log').insert({ order_id: orderId, kind: 'moodboard', total: null, drive_link: driveLink || null }));
    },

    countMoodboards: async function (orderId) {
      const { count, error } = await init().from('document_log').select('id', { count: 'exact', head: true }).eq('order_id', orderId).eq('kind', 'moodboard');
      if (error) throw new Error(error.message || 'Could not read the moodboard log');
      return count || 0;
    }
  };
})();
