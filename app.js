/* Kelak Kembali — app shell.

   Four views behind a hash route — customer list, customer detail, order
   detail, order edit — plus the password gate. Owns all form state and
   navigation; defers to KK.db for persistence and KK.docs for the PDFs.

   Saving is explicit. An order editor that autosaved would write a row on
   every keystroke and, worse, would silently rewrite a record you were only
   glancing at. The Save button in the app bar lights up when something has
   changed, and leaving with unsaved work asks first. */

window.KK = window.KK || {};

KK.app = (function () {
  'use strict';

  const U = KK.util;
  const db = KK.db;
  const docs = KK.docs;
  const cal = KK.calendar;
  const $ = U.$;
  const $$ = U.$$;

  /* ------------------------------- Constants ----------------------------- */

  /* The standing package. A new order starts with all six ticked, because that
     is what the studio actually includes; untick what a given order drops. */
  const INCLUDES = [
    'Custom design & consultation',
    'Production',
    'Standard fabric',
    'Plain veil',
    'Fitting',
    'Laundry'
  ];

  /* Must match the check constraint in schema.sql. */
  const STATUSES = ['Quoted', 'Confirmed', 'In production', 'Delivered'];

  const REMOVE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  /* -------------------------------- Elements ----------------------------- */

  const el = {
    boot: $('#boot'),
    gate: $('#gate'),
    gateForm: $('#gateForm'),
    gatePassword: $('#gatePassword'),
    gateRemember: $('#gateRemember'),
    gateErr: $('#gateErr'),
    gateSubmit: $('#gateSubmit'),

    app: $('#app'),
    upLink: $('#upLink'),
    upLabel: $('#upLabel'),
    appbarBrand: $('#appbarBrand'),
    homeLink: $('#homeLink'),
    viewTitle: $('#viewTitle'),
    viewSub: $('#viewSub'),
    pageAction: $('#pageAction'),
    savebar: $('#savebar'),
    saveBtn: $('#saveBtn'),
    menu: $('#menu'),
    menuBtn: $('#menuBtn'),
    menuList: $('#menuList'),
    menuDelete: $('#menuDelete'),
    menuCalendar: $('#menuCalendar'),
    menuSignOut: $('#menuSignOut'),

    viewCustomers: $('#viewCustomers'),
    deadlines: $('#deadlines'),
    deadlineCards: $('#deadlineCards'),
    customerSearch: $('#customerSearch'),
    customerSort: $('#customerSort'),
    customerList: $('#customerList'),
    newCustomer: $('#newCustomer'),

    viewCustomer: $('#viewCustomer'),
    customerViewCard: $('#customerViewCard'),
    dPhone: $('#dPhone'),
    dInstagram: $('#dInstagram'),
    dSource: $('#dSource'),
    dWedding: $('#dWedding'),
    dNotes: $('#dNotes'),
    dCreated: $('#dCreated'),
    customerEditCard: $('#customerEditCard'),
    cName: $('#cName'),
    errCName: $('#errCName'),
    cPhone: $('#cPhone'),
    cInstagram: $('#cInstagram'),
    cSource: $('#cSource'),
    cWedding: $('#cWedding'),
    cNotes: $('#cNotes'),
    customerOrdersCard: $('#customerOrdersCard'),
    ordersTotal: $('#ordersTotal'),
    orderList: $('#orderList'),
    newOrder: $('#newOrder'),

    viewOrder: $('#viewOrder'),
    oDocNameDisplay: $('#oDocNameDisplay'),
    oFitting1Display: $('#oFitting1Display'),
    oFittingFinalDisplay: $('#oFittingFinalDisplay'),
    oWeddingDisplay: $('#oWeddingDisplay'),
    oItemsDisplay: $('#oItemsDisplay'),
    oIncludesDisplay: $('#oIncludesDisplay'),
    historyLog: $('#historyLog'),
    paymentSummary: $('#paymentSummary'),
    logPaymentBtn: $('#logPaymentBtn'),
    paymentChooserOptions: $('#paymentChooserOptions'),
    scheduleCard: $('#scheduleCard'),
    scheduleCount: $('#scheduleCount'),
    scheduleList: $('#scheduleList'),
    syncCalendarBtn: $('#syncCalendarBtn'),
    scheduleSyncNote: $('#scheduleSyncNote'),

    viewCalendar: $('#viewCalendar'),
    gcalState: $('#gcalState'),
    gcalConnect: $('#gcalConnect'),
    gcalDisconnect: $('#gcalDisconnect'),
    gcalErr: $('#gcalErr'),

    viewOrderEdit: $('#viewOrderEdit'),
    oTitle: $('#oTitle'),
    oDocName: $('#oDocName'),
    oFitting1: $('#oFitting1'),
    oFittingFinal: $('#oFittingFinal'),
    oScheduleHint: $('#oScheduleHint'),
    oScheme: $('#oScheme'),
    termsCard: $('#termsCard'),
    termList: $('#termList'),
    addTerm: $('#addTerm'),
    termsSum: $('#termsSum'),
    errTerms: $('#errTerms'),
    itemList: $('#itemList'),
    itemsTotal: $('#itemsTotal'),
    addItem: $('#addItem'),
    includesList: $('#includesList'),
    customInclude: $('#customInclude'),
    addInclude: $('#addInclude'),

    actionbar: $('#actionbar'),
    totalDisplay: $('#totalDisplay'),
    downloadNote: $('#downloadNote'),
    downloadQuote: $('#downloadQuote'),
    downloadInvoice: $('#downloadInvoice'),
    toast: $('#toast')
  };

  const DOWNLOAD_BUTTONS = { quotation: el.downloadQuote, invoice: el.downloadInvoice };

  /* --------------------------------- State ------------------------------- */

  const state = {
    route: null,             // { view, id }
    customers: [],           // the whole list, filtered client-side
    customer: null,          // record backing the customer view
    order: null,             // record backing the order views
    overview: null,          // { ordersByCustomer } — every order, for the homepage
    loggedDeposits: {},      // { depositIndex: loggedAt } for the open order
    schedule: null,          // computed programme + stored rows for the open order
    googleConnected: null,   // null until asked; cached for the session
    dirty: false,
    saving: false
  };

  /* -------------------------------- Chrome ------------------------------- */

  let toastTimer;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2600);
  }

  function setDirty(dirty) {
    state.dirty = dirty;
    el.saveBtn.disabled = !dirty || state.saving;
    $('.btn__label', el.saveBtn).textContent =
      state.saving ? 'Saving…' : (dirty ? 'Save changes' : 'Saved');
  }

  /* Both bottom bars are fixed, and the toast and the page's bottom padding
     have to clear whichever one is up. Measuring beats hard-coding: the two
     differ in height, and the action bar grows when its hint shows. */
  function syncBottomBar() {
    const bar = !el.actionbar.hidden ? el.actionbar
      : (!el.savebar.hidden ? el.savebar : null);
    document.documentElement.style.setProperty(
      '--bottombar-h', bar ? Math.round(bar.getBoundingClientRect().height) + 'px' : '0px');
  }

  /** Toggles the save bar independently of the view, so reading a customer
      shows no bar and editing one does. */
  function setSaveBar(visible) {
    el.savebar.hidden = !visible;
    document.body.classList.toggle('has-savebar', !!visible);
    syncBottomBar();
  }

  /* One control, reconfigured per view — Edit while reading a record, Cancel
     while editing one. Two buttons that are never both relevant. */
  let pageActionHandler = null;
  function setPageAction(action) {
    pageActionHandler = action ? action.onClick : null;
    el.pageAction.hidden = !action;
    if (action) el.pageAction.textContent = action.label;
  }

  function setChrome(opts) {
    el.viewTitle.textContent = opts.title;

    /* The subtitle carries a badge on the order page, so it takes HTML —
       every caller builds it from escaped parts. */
    el.viewSub.innerHTML = opts.sub || '';
    el.viewSub.hidden = !opts.sub;

    /* Up is a fixed link to the parent, so it is the same destination however
       you arrived. Home is suppressed when Up already goes there. */
    const up = opts.up || null;
    el.upLink.hidden = !up;
    el.appbarBrand.hidden = !!up;
    if (up) {
      el.upLink.href = up.hash;
      el.upLabel.textContent = up.label;
    }
    el.homeLink.hidden = !up || up.hash === '#/customers';

    setPageAction(opts.action || null);
    el.actionbar.hidden = !opts.actions;
    document.body.classList.toggle('has-actionbar', !!opts.actions);
    setSaveBar(!!opts.save);
    closeMenu();

    // Delete belongs to a record, so the menu only offers it on a record page.
    el.menuDelete.hidden = !opts.destroy;
    el.menuDelete.className = 'menu__item menu__item--danger';
    if (opts.destroy) {
      el.menuDelete.textContent = opts.destroy === 'order' ? 'Delete order' : 'Delete customer';
      el.menuDelete.dataset.kind = opts.destroy;
    }
    syncBottomBar();
  }

  /* -------------------------------- Menu --------------------------------- */

  function closeMenu() {
    el.menuList.hidden = true;
    el.menuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    const open = el.menuList.hidden;
    el.menuList.hidden = !open;
    el.menuBtn.setAttribute('aria-expanded', String(open));
  }

  /* ------------------------------ Order status ---------------------------- */

  /* The status is no longer something you set; it is what the record already
     says about itself. Downloading a quotation means it has been quoted,
     downloading an invoice means it has been confirmed, logging a deposit
     means it is in production, and a wedding in the past means it is done.
     Reading it off those events is both less work and harder to get wrong
     than remembering to change a dropdown. */

  const badgeClass = (status) =>
    'badge badge--' + String(status).toLowerCase().replace(/\s+/g, '-');

  /** Never backwards: re-downloading a quotation for an order already in
      production says nothing new about it. */
  function atLeast(current, floor) {
    const a = STATUSES.indexOf(current);
    const b = STATUSES.indexOf(floor);
    return b > a ? floor : (a === -1 ? STATUSES[0] : current);
  }

  /* The last step is derived rather than stored: nobody marks a wedding as
     having happened, and the date that decides it lives on the customer, where
     it can still be corrected afterwards. */
  function effectiveStatus(order, weddingDate) {
    const stored = STATUSES.includes(order.status) ? order.status : STATUSES[0];
    return (weddingDate && weddingDate < U.todayISO()) ? 'Delivered' : stored;
  }

  /** Writes the advance, if it is one. Called after the event it describes has
      already succeeded, so a failure here never invents one. */
  async function bumpStatus(floor) {
    const next = atLeast(state.order.status, floor);
    if (next === state.order.status) return;
    try {
      state.order = await db.updateOrder(state.order.id, { status: next });
      renderOrderStatus();
    } catch (err) {
      console.error(err);
    }
  }

  function renderOrderStatus() {
    const status = effectiveStatus(state.order, state.customer && state.customer.wedding_date);
    el.viewSub.innerHTML = '<span class="' + badgeClass(status) + '">' +
      U.escapeHtml(status) + '</span>';
    el.viewSub.hidden = false;
  }

  /* -------------------------------- Routing ------------------------------ */

  /* #/customers | #/customer/new | #/customer/:id | #/order/:id | #/order/:id/edit

     A route may carry a query — only `#/customer/new?name=` uses one today, to
     seed the form from what was typed into the search field. It rides in the
     hash rather than in a variable so a reload of that URL still prefills. */
  function parseHash() {
    const raw = String(location.hash || '').replace(/^#\/?/, '');
    const cut = raw.indexOf('?');
    const parts = (cut === -1 ? raw : raw.slice(0, cut)).split('/').filter(Boolean);
    const query = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
    if (parts[0] === 'customer' && parts[1]) return { view: 'customer', id: parts[1], query };
    if (parts[0] === 'order' && parts[1] && parts[2] === 'edit') return { view: 'orderEdit', id: parts[1], query };
    if (parts[0] === 'order' && parts[1]) return { view: 'order', id: parts[1], query };
    if (parts[0] === 'calendar') return { view: 'calendar', query };
    return { view: 'customers', query };
  }

  function go(hash) {
    if (location.hash === hash) handleRoute();
    else location.hash = hash;
  }

  /* For the transitions that finish a page rather than leave it — creating a
     customer, saving an order. The form you just completed is not a place the
     browser's Back should be able to return you to.

     Where the destination is the entry we came from, unwinding is better than
     replacing: replacing would leave two identical entries side by side, and
     the first Back press would then appear to do nothing. */
  function leaveFormFor(hash) {
    if (prevHash === hash) { history.back(); return; }
    if (location.hash === hash) { handleRoute(); return; }
    history.replaceState(null, '', location.pathname + location.search + hash);
    lastHash = hash;
    handleRoute();
  }

  /* Unsaved work is only ever one confirm away from being lost, never zero. */
  function confirmLeave() {
    if (!state.dirty) return true;
    return window.confirm('You have unsaved changes. Leave without saving?');
  }

  let lastHash = '';
  let prevHash = '';
  async function handleRoute() {
    const next = parseHash();

    // Guard the transition, and put the URL back if it is refused.
    if (state.dirty && lastHash !== location.hash) {
      if (!confirmLeave()) {
        location.hash = lastHash;
        return;
      }
      setDirty(false);
    }
    if (location.hash !== lastHash) prevHash = lastHash;
    lastHash = location.hash;
    state.route = next;

    el.viewCustomers.hidden = next.view !== 'customers';
    el.viewCustomer.hidden = next.view !== 'customer';
    el.viewOrder.hidden = next.view !== 'order';
    el.viewOrderEdit.hidden = next.view !== 'orderEdit';
    el.viewCalendar.hidden = next.view !== 'calendar';
    window.scrollTo(0, 0);

    const render = async () => {
      if (next.view === 'customers') await showCustomers();
      else if (next.view === 'customer') await showCustomer(next.id, next.query);
      else if (next.view === 'orderEdit') await showOrderEdit(next.id);
      else if (next.view === 'calendar') await showCalendarSettings();
      else await showOrder(next.id);
    };

    /* The stored token can be a moment stale — expired between tabs, or minted
       far enough either side of the API's clock to fall outside its 30-second
       window ("JWT expired", "JWT issued at future"). The first load after
       opening the app is exactly when that lands, and it used to arrive as a
       toast of raw PostgREST wording over a half-drawn page. It is not
       something to tell anyone about: get a fresh token and draw the page
       again. Only a second failure is real, and only that one speaks up. */
    try {
      await render();
    } catch (err) {
      if (!db.isStaleToken(err)) {
        console.error(err);
        showToast(err.message || 'Could not load that');
        return;
      }
      console.warn('Stale token, refreshing and retrying:', err.message);
      try {
        await db.refreshSession();
        await render();
      } catch (retryErr) {
        console.error(retryErr);
        showToast(db.isStaleToken(retryErr)
          ? 'Your session expired — please unlock again'
          : (retryErr.message || 'Could not load that'));
      }
    }
  }

  /* ------------------------------- Shared helpers -------------------------- */

  /** Empty text fields go to the database as NULL, not "". */
  const orNull = (v) => (String(v || '').trim() === '' ? null : String(v).trim());

  /** Falls back to the item list when no title was set for the order. */
  function orderLabel(o) {
    if (o.title) return o.title;
    const items = o.items || [];
    return items.length && items[0].name
      ? items[0].name + (items.length > 1 ? ' + ' + (items.length - 1) + ' more' : '')
      : 'Empty order';
  }

  /* A blank production cost means nobody has worked it out yet, not that the
     item is free to make. Counting it as zero turned every unpriced item into
     pure margin and quietly overstated the figure, so those items sit out of
     the sum entirely and the page says how many did. */
  const isCosted = (it) => (Number(it.cost) || 0) > 0;

  const isNamed = (it) => String(it.name || '').trim() !== '';

  /** Internal-only figure: never fed into docs.render, never on a PDF. */
  function nettProfit(items) {
    return (items || []).filter(isCosted).reduce((sum, it) =>
      sum + ((Number(it.price) || 0) - (Number(it.cost) || 0)) * (Number(it.qty) || 0), 0);
  }

  /* ---------------------------- Customer list ----------------------------- */

  async function showCustomers() {
    setChrome({ title: 'Customers', up: null, save: false, actions: false });
    state.customer = null;
    state.order = null;
    el.customerList.innerHTML = '<p class="empty">Loading…</p>';

    /* The schedule table is the newest thing in the schema, and the homepage is
       the first page anyone lands on. If it is missing — schema.sql not yet
       re-run against this project — the strip falls back to the raw anchor
       dates, which is what it showed before schedules existed. Losing the whole
       customer list over it would be out of all proportion. */
    const [customers, allOrders, allEvents] = await Promise.all([
      db.listCustomers(),
      db.listAllOrders(),
      db.listAllOrderEvents().catch((err) => {
        if (db.isStaleToken(err)) throw err;
        console.warn('No order_events yet:', err.message);
        return [];
      })
    ]);
    state.customers = customers;
    state.overview = buildOverview(allOrders, allEvents);
    renderDeadlines();
    renderCustomerList();
  }

  /* Which order the list is in, kept across sessions — it is a working
     preference, not something to re-pick every time the page loads. The
     database already returns soonest-wedding order, so that mode sorts
     nothing; alphabetical re-sorts a copy. */
  const SORT_KEY = 'kk_customer_sort';
  const SORT_MODES = ['wedding', 'name'];

  function savedSort() {
    const v = localStorage.getItem(SORT_KEY);
    return SORT_MODES.includes(v) ? v : SORT_MODES[0];
  }

  function sortCustomers(rows) {
    if (el.customerSort.value !== 'name') return rows;
    return rows.slice().sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }

  function renderCustomerList() {
    const q = el.customerSearch.value.trim().toLowerCase();
    const rows = sortCustomers(state.customers.filter((c) => !q ||
      [c.name, c.phone, c.instagram].some((v) => String(v || '').toLowerCase().includes(q))));

    /* Searching for a name that is not here is how you find out a customer has
       not been entered yet — so the dead end offers the next step instead of
       just reporting the miss, and carries the name you already typed into the
       form rather than making you type it a second time. */
    if (!rows.length) {
      const typed = el.customerSearch.value.trim();
      el.customerList.innerHTML = state.customers.length
        ? '<p class="empty">No match for “' + U.escapeHtml(typed) + '”.</p>' +
          '<a class="btn btn--outline btn--new btn--block btn--empty" ' +
             'href="#/customer/new?name=' + encodeURIComponent(typed) + '">' +
            '+ Add “' + U.escapeHtml(typed) + '” as a new customer' +
          '</a>'
        : '<p class="empty">No customers yet. Add the first one with New, above.</p>';
      return;
    }

    /* Two meta lines, both load-bearing: the wedding date is what the list is
       sorted by by default, and the order count is what tells you whether there
       is anything to open. The old "Created" line was neither. */
    el.customerList.innerHTML = rows.map((c) => {
      const orders = (state.overview.ordersByCustomer[c.id] || []);
      const gross = orders.reduce((sum, o) => sum + docs.computeTotal(o.items), 0);
      return '<a class="row row--kanban" href="#/customer/' + c.id + '">' +
        '<span class="row__main">' +
          '<span class="row__title">' + U.escapeHtml(c.name) + '</span>' +
          '<span class="row__meta">' +
            (c.wedding_date ? 'Wedding ' + U.escapeHtml(U.formatShortDate(c.wedding_date)) : 'No wedding date') +
          '</span>' +
          '<span class="row__meta">' +
            (orders.length ? orders.length + (orders.length === 1 ? ' order' : ' orders') : 'No orders') +
          '</span>' +
        '</span>' +
        '<span class="row__amount">' + U.formatRupiah(gross) + '</span>' +
      '</a>';
    }).join('');
  }

  /* ------------------------------- Overview -------------------------------- */

  function buildOverview(allOrders, allEvents) {
    const ordersByCustomer = {};
    allOrders.forEach((o) => {
      (ordersByCustomer[o.customer_id] = ordersByCustomer[o.customer_id] || []).push(o);
    });

    /* Appointments are keyed by order, and the strip is per customer, so they
       are re-keyed here rather than joined in the query — the whole table is
       five rows per order and already in hand. */
    const orderCustomer = {};
    allOrders.forEach((o) => { orderCustomer[o.id] = o.customer_id; });

    const eventsByCustomer = {};
    (allEvents || []).forEach((e) => {
      const cid = orderCustomer[e.order_id];
      if (!cid) return;
      (eventsByCustomer[cid] = eventsByCustomer[cid] || []).push(e);
    });

    return { ordersByCustomer, eventsByCustomer };
  }

  /** A customer is active until every order they have is delivered. Someone
      with no orders yet is active — they are the ones who need one. */
  function isActive(customer) {
    const orders = state.overview.ordersByCustomer[customer.id] || [];
    return !orders.length ||
      !orders.every((o) => effectiveStatus(o, customer.wedding_date) === 'Delivered');
  }

  /* Whichever date comes first, named. A fitting three days out matters more
     than a wedding three months out, and which one it is changes what you do
     about it — so the card says.

     The appointments come from the stored schedule, which includes the two
     anchor dates as its first and last rows. Reading the anchor columns as
     well would list the same two days twice. Orders with no schedule yet fall
     back to their raw anchors, so nothing disappears from the strip while the
     order is waiting to be saved. */
  function nextDeadline(customer) {
    const today = U.todayISO();
    const dates = [];
    if (customer.wedding_date) dates.push({ date: customer.wedding_date, what: 'Wedding' });

    const scheduled = state.overview.eventsByCustomer[customer.id] || [];
    scheduled.forEach((e) => dates.push({ date: e.event_date, what: e.stage }));

    const hasSchedule = {};
    scheduled.forEach((e) => { hasSchedule[e.order_id] = true; });
    (state.overview.ordersByCustomer[customer.id] || []).forEach((o) => {
      if (hasSchedule[o.id]) return;
      if (o.fitting_1_date) dates.push({ date: o.fitting_1_date, what: 'Body measurements' });
      if (o.final_fitting_date) dates.push({ date: o.final_fitting_date, what: 'Final fitting' });
    });

    return dates.filter((d) => d.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  }

  const relativeDays = (days) =>
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days';

  /** Full names vary too much in length to keep the calendar tile a fixed
      width — the first name is enough to recognize who, and truncation
      handles the rest. */
  const firstName = (name) => (name || '').trim().split(/\s+/)[0] || '';

  /** "2026-03-21" -> { day: "21", mon: "MAR" }, for the calendar tile's head. */
  function calendarParts(iso) {
    const parts = U.formatShortDate(iso).split(' ');
    return { day: parts[0] || '', mon: (parts[1] || '').toUpperCase() };
  }

  /* Stacked full-width rows, each of them mostly empty space, cost three
     screenfuls of height to say three dates. As calendar tiles in one
     horizontal strip the section is a fifth of the height and holds twice as
     many — and a date reads faster as a date than as a sentence about one. */
  const DEADLINE_LIMIT = 8;

  function renderDeadlines() {
    const soon = state.customers
      .filter(isActive)
      .map((c) => ({ customer: c, deadline: nextDeadline(c) }))
      .filter((r) => r.deadline)
      .sort((a, b) => (a.deadline.date < b.deadline.date ? -1 : 1))
      .slice(0, DEADLINE_LIMIT);

    el.deadlines.hidden = !soon.length;
    if (!soon.length) return;

    el.deadlineCards.innerHTML = soon.map((r) => {
      const days = daysUntil(r.deadline.date);
      const cal = calendarParts(r.deadline.date);
      return '<a class="dcal" href="#/customer/' + r.customer.id + '">' +
        '<span class="dcal__date">' +
          '<span class="dcal__day">' + U.escapeHtml(cal.day) + '</span>' +
          '<span class="dcal__month">' + U.escapeHtml(cal.mon) + '</span>' +
        '</span>' +
        '<span class="dcal__body">' +
          '<span class="dcal__name">' + U.escapeHtml(firstName(r.customer.name)) + '</span>' +
          '<span class="dcal__what">' + U.escapeHtml(r.deadline.what) + '</span>' +
          '<span class="dcal__when">' + relativeDays(days) + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
  }

  /* --------------------------- Customer detail ---------------------------- */

  const BLANK_CUSTOMER = {
    id: null, name: '', phone: '', instagram: '', source: '', wedding_date: '', notes: ''
  };

  /* The save bar follows the edit card, not the view: there is nothing to save
     while you are only reading a customer. */
  function setCustomerMode(editMode) {
    const isNew = !state.customer || !state.customer.id;
    el.customerViewCard.hidden = editMode;
    el.customerEditCard.hidden = !editMode;
    el.customerOrdersCard.hidden = editMode || isNew;
    setSaveBar(editMode);

    el.viewTitle.textContent = isNew ? 'New customer'
      : (editMode ? 'Edit customer' : state.customer.name);

    /* A new customer has nothing to cancel back to — the form is the page. */
    setPageAction(isNew ? null : (editMode
      ? { label: 'Cancel', onClick: cancelCustomerEdit }
      : { label: 'Edit', onClick: () => setCustomerMode(true) }));
  }

  function cancelCustomerEdit() {
    if (!confirmLeave()) return;
    fillCustomerForm(state.customer);
    setDirty(false);
    setCustomerMode(false);
  }

  /** Days between today and an ISO date, negative once it has passed. */
  const daysUntil = (iso) =>
    Math.round((new Date(iso) - new Date(U.todayISO())) / 86400000);

  function renderCustomerReadOnly(c) {
    el.dPhone.textContent = c.phone || '—';
    el.dInstagram.textContent = c.instagram || '—';
    el.dSource.textContent = c.source || '—';
    el.dNotes.textContent = c.notes || '—';
    el.dCreated.textContent = c.created_at ? U.formatShortDate(c.created_at) : '—';

    /* The date that drives every other deadline, given in the unit people
       actually plan in — sitting on the date itself rather than on a line of
       its own repeating the word "wedding". */
    el.dWedding.textContent = c.wedding_date
      ? U.formatShortDate(c.wedding_date) + ' · ' + relativeToToday(c.wedding_date)
      : 'Not set';
  }

  /** Reads naturally on both sides of today, which a plain day count does not. */
  function relativeToToday(iso) {
    const days = daysUntil(iso);
    if (days >= 0) return relativeDays(days);
    const ago = Math.abs(days);
    return ago + (ago === 1 ? ' day' : ' days') + ' ago';
  }

  async function showCustomer(id, query) {
    const isNew = id === 'new';
    setChrome({
      title: isNew ? 'New customer' : 'Customer',
      up: { label: 'Customers', hash: '#/customers' },
      save: false, actions: false,
      destroy: isNew ? null : 'customer'
    });

    state.customer = isNew ? Object.assign({}, BLANK_CUSTOMER) : await db.getCustomer(id);
    // Arrived from a search that found nothing: the name is already known.
    const seeded = isNew ? String((query && query.get('name')) || '').trim() : '';
    if (seeded) state.customer.name = seeded;
    fillCustomerForm(state.customer);
    // A new customer has nothing to read, so it opens straight into the form.
    setCustomerMode(isNew);
    setDirty(isNew);

    if (isNew) {
      /* With the name filled in, the next empty field is what needs the caret —
         landing on Name would only mean tabbing past what you just typed. */
      (seeded ? el.cPhone : el.cName).focus();
      return;
    }

    renderCustomerReadOnly(state.customer);

    el.orderList.innerHTML = '<p class="empty">Loading…</p>';
    renderOrderList(await db.listOrders(id));
  }

  function fillCustomerForm(c) {
    el.cName.value = c.name || '';
    el.cPhone.value = c.phone || '';
    el.cInstagram.value = c.instagram || '';
    el.cSource.value = c.source || '';
    el.cWedding.value = c.wedding_date || '';
    el.cNotes.value = c.notes || '';
    el.cName.classList.remove('is-invalid');
    el.errCName.hidden = true;
  }

  function readCustomerForm() {
    return {
      name: el.cName.value.trim(),
      phone: orNull(el.cPhone.value),
      instagram: orNull(el.cInstagram.value),
      source: orNull(el.cSource.value),
      wedding_date: orNull(el.cWedding.value),
      notes: orNull(el.cNotes.value)
    };
  }

  function itemsSnippet(items) {
    const names = (items || [])
      .filter((it) => String(it.name || '').trim() !== '')
      .map((it) => it.name);
    return names.length ? names.join(', ') : 'No items yet';
  }

  function renderOrderList(orders) {
    el.ordersTotal.textContent = orders.length
      ? U.formatRupiah(orders.reduce((sum, o) => sum + docs.computeTotal(o.items), 0))
      : '';
    if (!orders.length) {
      el.orderList.innerHTML = '<p class="empty">No orders yet.</p>';
      return;
    }
    const wedding = state.customer && state.customer.wedding_date;
    /* Status, then the next fitting still ahead. The old third line printed
       both fitting dates and truncated mid-word on a phone, and read
       "1st fit not set · Final fit not set" on every new order. */
    el.orderList.innerHTML = orders.map((o) => {
      const next = [o.fitting_1_date, o.final_fitting_date]
        .filter((d) => d && d >= U.todayISO()).sort()[0];
      const status = effectiveStatus(o, wedding);
      return '<a class="row row--kanban" href="#/order/' + o.id + '">' +
        '<span class="row__main">' +
          '<span class="row__title">' + U.escapeHtml(orderLabel(o)) + '</span>' +
          '<span class="row__meta">' + U.escapeHtml(itemsSnippet(o.items)) + '</span>' +
          '<span class="row__tags">' +
            '<span class="' + badgeClass(status) + '">' + U.escapeHtml(status) + '</span>' +
            (next ? '<span class="row__meta">Fitting ' + U.escapeHtml(U.formatShortDate(next)) + '</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="row__amount">' + U.formatRupiah(docs.computeTotal(o.items)) + '</span>' +
      '</a>';
    }).join('');
  }

  async function saveCustomer() {
    if (el.cName.value.trim() === '') {
      el.cName.classList.add('is-invalid');
      el.errCName.hidden = false;
      el.cName.focus();
      return false;
    }
    const patch = readCustomerForm();
    if (state.customer.id) {
      state.customer = await db.updateCustomer(state.customer.id, patch);
      setDirty(false);
      renderCustomerReadOnly(state.customer);
      setCustomerMode(false);
      showToast('Customer saved');
    } else {
      state.customer = await db.createCustomer(patch);
      setDirty(false);
      showToast('Customer created');
      /* replace, not push: the blank form is not somewhere to come back to,
         and leaving it in the history is what made Back reopen it. */
      leaveFormFor('#/customer/' + state.customer.id);
    }
    return true;
  }

  /* ------------------------------ Order detail ----------------------------- */

  function historyLabel(row) {
    if (row.action === 'created') return 'Order created';
    if (row.action === 'updated') return 'Order updated';
    if (row.action === 'payment_logged') {
      const label = (row.detail && row.detail.deposit_label) || 'Payment';
      return label.split(' - ')[0] + ' logged';
    }
    if (row.action === 'scheduled') {
      const n = (row.detail && row.detail.count) || 0;
      const dropped = (row.detail && row.detail.dropped) || [];
      return 'Schedule set — ' + n + (n === 1 ? ' date' : ' dates') +
        (dropped.length ? ', ' + dropped.length + ' left out' : '');
    }
    if (row.action === 'calendar_synced') {
      const n = (row.detail && row.detail.count) || 0;
      return 'Synced ' + n + (n === 1 ? ' date' : ' dates') + ' to Google Calendar';
    }
    return row.action;
  }

  /* A term's printed label carries the percentage because the invoice needs it.
     On screen the rupiah amount is on the same row, so the percentage is just
     the same fact twice — and it pushed every label onto two lines. */

  /* Which terms have already been logged, so the page can show what is
     outstanding and the chooser can stop offering the same one twice. */
  function renderPayments(historyRows) {
    const total = docs.computeTotal(state.order.items);
    const terms = docs.termsFor(state.order);
    const amounts = docs.termAmounts(total, terms);
    const logged = {};
    historyRows.forEach((r) => {
      if (r.action !== 'payment_logged') return;
      const i = r.detail && r.detail.deposit_index;
      if (i != null) logged[i] = r.created_at;
    });
    state.loggedDeposits = logged;

    /* Every term is a share of the total, so with no priced items there is
       nothing to log but a column of Rp0 rows. */
    if (total <= 0) {
      el.paymentSummary.innerHTML = '<p class="empty">Price the items to work out the payment terms.</p>';
      el.logPaymentBtn.hidden = true;
      el.paymentChooserOptions.hidden = true;
      return;
    }

    el.paymentSummary.innerHTML = terms.map((t, i) =>
      '<div class="logrow">' +
        '<span class="logrow__kind">' + U.escapeHtml(t.label) + '</span>' +
        '<span class="logrow__when">' +
          (logged[i] ? 'Paid ' + U.escapeHtml(U.formatShortDate(logged[i])) : 'Outstanding') +
        '</span>' +
        '<span class="logrow__total">' + U.formatRupiah(amounts[i]) + '</span>' +
      '</div>'
    ).join('');

    const outstanding = terms.some((_, i) => !logged[i]);
    el.logPaymentBtn.hidden = !outstanding;
    if (!outstanding) el.paymentChooserOptions.hidden = true;
  }

  async function refreshHistory() {
    const [historyRows, docRows] = await Promise.all([
      db.listOrderHistory(state.order.id),
      db.listDocumentLog(state.order.id)
    ]);
    renderPayments(historyRows);
    const merged = historyRows.map((r) => ({
      when: r.created_at,
      label: historyLabel(r),
      amount: r.action === 'payment_logged' ? (r.detail && r.detail.amount) : null
    })).concat(docRows.map((r) => ({
      when: r.created_at,
      label: (r.kind === 'invoice' ? 'Invoice' : 'Quotation') + ' downloaded',
      amount: r.total
    }))).sort((a, b) => new Date(b.when) - new Date(a.when));

    el.historyLog.innerHTML = merged.length ? merged.map((r) =>
      '<div class="logrow">' +
        '<span class="logrow__kind">' + U.escapeHtml(r.label) + '</span>' +
        '<span class="logrow__when">' + U.escapeHtml(U.formatShortDate(r.when)) + '</span>' +
        (r.amount != null ? '<span class="logrow__total">' + U.formatRupiah(r.amount) + '</span>' : '') +
      '</div>'
    ).join('') : '<p class="empty">No history yet.</p>';
  }

  /** What docs.render/download need — read from the saved record, since this
      page has no form fields of its own. A document is dated the day it is
      issued, so the date is stamped here rather than typed into the editor. */
  function orderDataFromState() {
    return {
      docName: state.order.doc_name || '',
      date: U.todayISO(),
      items: state.order.items || [],
      includes: state.order.includes || [],
      terms: docs.termsFor(state.order)
    };
  }

  const showDate = (iso) => (iso ? U.formatShortDate(iso) : '—');

  /* The quotation's own three columns, plus the row it never carries. Reading
     down the right-hand edge, every figure — line prices, Total, Nett profit —
     lands on the same rule. */
  function renderItemsTable(items) {
    const named = items.filter(isNamed);
    const total = docs.computeTotal(items);

    if (!named.length) {
      el.oItemsDisplay.innerHTML = '<p class="empty">No items yet. Tap Edit to add one.</p>';
      return;
    }

    /* Say which figure this is. With some costs unfilled it is the profit on
       part of the order, and a number that quietly means something narrower
       than its label is worse than no number. */
    const uncosted = named.filter((it) => !isCosted(it)).length;
    const profitNote = !uncosted ? ''
      : uncosted === named.length
        ? 'No production costs filled in yet.'
        : 'Excludes ' + uncosted + ' of ' + named.length +
          ' items with no production cost.';

    el.oItemsDisplay.innerHTML =
      '<div class="table__row table__row--head">' +
        '<span class="table__item">Item</span>' +
        '<span class="table__qty">Qty</span>' +
        '<span class="table__price">Price</span>' +
      '</div>' +
      named.map((it) =>
        '<div class="table__row">' +
          '<span class="table__item">' + U.escapeHtml(it.name) + '</span>' +
          '<span class="table__qty">' + (Number(it.qty) || 0) + '</span>' +
          '<span class="table__price">' + U.formatRupiah(it.price) + '</span>' +
        '</div>'
      ).join('') +
      '<div class="table__row table__row--total">' +
        '<span class="table__item">Total</span>' +
        '<span class="table__price">' + U.formatRupiah(total) + '</span>' +
      '</div>' +
      '<div class="table__row table__row--profit">' +
        '<span class="table__item">Nett profit <span class="tag">Internal</span></span>' +
        '<span class="table__price">' +
          (uncosted === named.length ? '—' : U.formatRupiah(nettProfit(items))) +
        '</span>' +
      '</div>' +
      (profitNote ? '<p class="table__note">' + U.escapeHtml(profitNote) + '</p>' : '');
  }

  async function showOrder(id) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);

    setChrome({
      title: orderLabel(state.order),
      up: { label: state.customer.name, hash: '#/customer/' + state.customer.id },
      save: false, actions: true, destroy: 'order',
      action: { label: 'Edit', onClick: () => go('#/order/' + state.order.id + '/edit') }
    });
    renderOrderStatus();

    el.oDocNameDisplay.textContent = state.order.doc_name || 'Not set';
    el.oFitting1Display.textContent = showDate(state.order.fitting_1_date);
    el.oFittingFinalDisplay.textContent = showDate(state.order.final_fitting_date);
    el.oWeddingDisplay.textContent = showDate(state.customer.wedding_date);

    const items = state.order.items || [];
    const total = docs.computeTotal(items);
    const namedItems = items.filter(isNamed);
    renderItemsTable(items);

    /* Six filled black pills made the least important block on the page the
       loudest. One muted line, joined the way the PDF itself joins them. */
    const inc = state.order.includes || [];
    el.oIncludesDisplay.textContent = inc.length
      ? 'Includes: ' + inc.join(' · ')
      : '';

    el.totalDisplay.textContent = U.formatRupiah(total);
    el.paymentChooserOptions.hidden = true;

    /* An empty order would export a document with no lines on it, and one
       without a document name would address it to nobody. The name is no
       longer inherited from the customer, so it has to be asked for. */
    const priced = namedItems.length > 0 && total > 0;
    const hasDocName = String(state.order.doc_name || '').trim() !== '';
    const sellable = priced && hasDocName;
    el.downloadQuote.disabled = !sellable;
    el.downloadInvoice.disabled = !sellable;
    el.downloadNote.hidden = sellable;
    el.downloadNote.textContent = !priced
      ? 'Add an item to enable downloads.'
      : 'Add the name for documents to enable downloads.';

    setDirty(false);
    await refreshSchedule();
    await refreshHistory();
    syncBottomBar();
  }

  /* ------------------------------- Schedule ------------------------------- */

  /* The card shows what is stored, not what would be computed right now. The
     two are the same the moment after a save, and they have to be allowed to
     differ before one: the stored rows are what carry the Google event ids, so
     re-deriving them for display would quietly claim a sync that never
     happened. */

  async function refreshSchedule() {
    const order = state.order;
    const computed = cal.computeSchedule(order.fitting_1_date, order.final_fitting_date);

    let rows = [];
    try {
      rows = await db.listOrderEvents(order.id);
    } catch (err) {
      // A schedule that will not load is not a reason to lose the whole page.
      console.error(err);
    }
    state.schedule = { computed: computed, rows: rows };

    const synced = rows.filter((r) => r.google_event_id);
    const pending = rows.filter((r) => !r.synced_at);

    cal.renderSchedule(el.scheduleList, {
      events: rows,
      warning: computed.warning,
      reason: computed.reason || 'No schedule yet — save the order to build one.'
    });

    el.scheduleCount.textContent = rows.length ? rows.length + ' dates' : '';

    /* Sync is offered only once there is something to send. Whether Google is
       connected is a question for the settings page, not a reason to hide the
       button — pressing it says so, which is a shorter path than discovering
       the menu. */
    el.syncCalendarBtn.hidden = !rows.length;
    el.syncCalendarBtn.disabled = false;
    el.syncCalendarBtn.textContent = synced.length && !pending.length
      ? 'Re-sync to Google Calendar'
      : 'Sync to Google Calendar';

    el.scheduleSyncNote.textContent = !rows.length ? ''
      : !synced.length ? 'Not in Google Calendar yet.'
      : pending.length ? pending.length + ' of ' + rows.length + ' dates changed since the last sync.'
      : 'All ' + rows.length + ' dates are in Google Calendar.';
  }

  /** One line under the date fields saying what the pair of them will build. */
  function renderScheduleHint() {
    const r = cal.computeSchedule(el.oFitting1.value, el.oFittingFinal.value);
    el.oScheduleHint.textContent = r.events.length
      ? r.events.length + ' appointments will be scheduled between these dates.' +
        (r.warning ? ' ' + r.warning : '')
      : r.reason;
  }

  /** Rebuild the stored programme from the order's anchors. Returns what
      changed, so the caller can decide whether it is worth logging. */
  async function rescheduleOrder(order) {
    const computed = cal.computeSchedule(order.fitting_1_date, order.final_fitting_date);
    const before = await db.listOrderEvents(order.id);
    const after = await db.replaceOrderEvents(order.id, computed.events);

    /* A stage that a tighter window cut out still has an event sitting in
       Google. Nobody is going to notice a fitting that quietly stopped being
       scheduled, so it is taken out rather than left to be believed. */
    const orphans = after.removed.map((r) => r.google_event_id).filter(Boolean);
    if (orphans.length) {
      try {
        await db.googleForget(orphans);
      } catch (err) {
        console.error('Dropped events left in Google Calendar:', err);
      }
    }

    const was = before.map((r) => r.stage + '@' + r.event_date).sort().join('|');
    const now = after.events.map((r) => r.stage + '@' + r.event_date).sort().join('|');
    return { computed: computed, changed: was !== now, rows: after.events };
  }

  async function syncCalendar() {
    const btn = el.syncCalendarBtn;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Syncing…';
    try {
      const res = await db.syncOrderCalendar(state.order.id);
      const n = (res && res.count) || 0;
      showToast(n + (n === 1 ? ' date' : ' dates') + ' in Google Calendar');
      try {
        await db.logOrderHistory(state.order.id, 'calendar_synced', { count: n });
      } catch (err) {
        console.error(err);
      }
      await refreshSchedule();
      await refreshHistory();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not sync to Google Calendar');
      btn.textContent = label;
      btn.disabled = false;
    }
    syncBottomBar();
  }

  /* --------------------------- Google Calendar ---------------------------- */

  /* The consent round trip leaves and re-enters the app, so it cannot use the
     hash route — Google refuses a redirect_uri with a fragment in it. It comes
     back to the page's own origin with ?code=, which boot picks up, spends, and
     then scrubs out of the address bar. */

  const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

  /** Where Google sends the browser back to. Must match a redirect URI
      registered on the OAuth client, for localhost and for the live domain. */
  const googleRedirectUri = () => location.origin + location.pathname;

  function connectGoogle() {
    const clientId = (window.KK_CONFIG || {}).GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      el.gcalErr.hidden = false;
      el.gcalErr.textContent =
        'No GOOGLE_CLIENT_ID in config.js — see “Google Calendar” in the README.';
      return;
    }
    /* access_type=offline is what asks for a refresh token at all, and
       prompt=consent is what makes Google issue a new one rather than assume
       we kept the first. Without both, a re-connect silently yields an access
       token that dies in an hour and a sync that works only today. */
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: GOOGLE_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    });
    location.href = GOOGLE_AUTH_URL + '?' + params.toString();
  }

  async function showCalendarSettings() {
    setChrome({
      title: 'Google Calendar',
      up: { label: 'Customers', hash: '#/customers' },
      save: false, actions: false
    });

    el.gcalErr.hidden = true;
    el.gcalConnect.hidden = true;
    el.gcalDisconnect.hidden = true;
    el.gcalState.textContent = 'Checking…';

    let status;
    try {
      status = await db.googleStatus();
    } catch (err) {
      console.error(err);
      el.gcalState.textContent = 'Could not reach the calendar service.';
      el.gcalErr.hidden = false;
      el.gcalErr.textContent = err.message || '';
      el.gcalConnect.hidden = false;
      return;
    }

    state.googleConnected = !!(status && status.connected);
    el.gcalState.textContent = state.googleConnected
      ? 'Connected' + (status.connected_at
        ? ' since ' + U.formatShortDate(String(status.connected_at).slice(0, 10)) : '') + '.'
      : 'Not connected. Fitting dates stay in this app until you connect.';
    el.gcalConnect.hidden = state.googleConnected;
    el.gcalDisconnect.hidden = !state.googleConnected;
  }

  async function disconnectGoogle() {
    if (!window.confirm('Disconnect Google Calendar? Events already created stay where they are.')) return;
    try {
      await db.googleDisconnect();
      state.googleConnected = false;
      showToast('Disconnected');
      await showCalendarSettings();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not disconnect');
    }
  }

  /* Spends the ?code= Google sent us back with, then takes it out of the URL so
     a reload cannot try to spend it twice — an authorization code is single
     use, and the second attempt fails noisily for no reason. */
  async function consumeGoogleRedirect() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');
    if (!code && !error) return;

    const clean = () =>
      history.replaceState(null, '', location.pathname + location.hash);

    if (error) {
      clean();
      showToast(error === 'access_denied' ? 'Google Calendar was not connected' : 'Google sign-in failed');
      return;
    }

    clean();
    try {
      await db.googleExchange(code, googleRedirectUri());
      state.googleConnected = true;
      showToast('Google Calendar connected');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not connect Google Calendar');
    }
  }

  /* ------------------------------- Order edit ------------------------------ */

  async function showOrderEdit(id) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);

    setChrome({
      title: 'Edit order',
      up: { label: orderLabel(state.order), hash: '#/order/' + id },
      save: true, actions: false, destroy: 'order'
    });

    el.oTitle.value = state.order.title || '';
    el.oDocName.value = state.order.doc_name || '';
    el.oFitting1.value = state.order.fitting_1_date || '';
    el.oFittingFinal.value = state.order.final_fitting_date || '';

    renderScheduleHint();

    el.oScheme.value = state.order.payment_scheme === 'other' ? 'other' : 'standard';
    buildTerms(state.order);
    syncSchemeCard();

    el.itemList.innerHTML = '';
    const items = (state.order.items || []).length
      ? state.order.items
      : [{ name: '', qty: 1, price: '', cost: '' }];
    items.forEach((item) => addItemRow(item, false));

    buildIncludes(state.order.includes || []);
    el.customInclude.value = '';

    refreshItemTotals();
    setDirty(false);
  }

  async function saveOrder() {
    if (!validateTerms()) return false;

    const items = readItems().map((it) => ({ name: it.name, qty: it.qty, price: it.price, cost: it.cost }));
    const scheme = el.oScheme.value === 'other' ? 'other' : 'standard';
    /* Neither document_date nor status is sent: the first is stamped when a
       PDF is generated, the second is set by the events that earn it. */
    state.order = await db.updateOrder(state.order.id, {
      title: orNull(el.oTitle.value),
      doc_name: orNull(el.oDocName.value),
      items: items,
      includes: checkedIncludes(),
      payment_scheme: scheme,
      /* Standard orders store nothing, so switching back to the package does
         not leave a stale list behind to be read the next time it is edited. */
      payment_terms: scheme === 'other' ? readTerms() : [],
      fitting_1_date: orNull(el.oFitting1.value),
      final_fitting_date: orNull(el.oFittingFinal.value)
    });
    setDirty(false);
    try {
      await db.logOrderHistory(state.order.id, 'updated', {});
    } catch (err) {
      console.error(err);
    }

    /* The programme follows the anchors, so it is rebuilt on every save and
       logged only when it actually moved. Failing here must not undo a save
       that already succeeded — the schedule is derived and can be rebuilt by
       saving again, the order cannot. */
    try {
      const res = await rescheduleOrder(state.order);
      if (res.changed) {
        await db.logOrderHistory(state.order.id, 'scheduled', {
          count: res.rows.length,
          dropped: res.computed.dropped
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Saved, but the schedule could not be rebuilt');
    }
    return true;
  }

  /* ------------------------------- Item rows ----------------------------- */

  function createItemRow(data) {
    const item = data || { name: '', qty: 1, price: '', cost: '' };
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML =
      '<div class="item__head">' +
        '<span class="item__idx"></span>' +
        '<button type="button" class="item__remove js-remove" aria-label="Remove item">' +
          REMOVE_ICON +
        '</button>' +
      '</div>' +
      '<label class="field">' +
        '<span class="field__label">Description</span>' +
        '<input class="input js-name" type="text" placeholder="e.g. Bridal skirt">' +
      '</label>' +
      '<div class="item__row2">' +
        '<label class="field field--qty">' +
          '<span class="field__label">Qty</span>' +
          '<input class="input js-qty" type="text" inputmode="numeric" value="1">' +
        '</label>' +
        '<label class="field field--price">' +
          '<span class="field__label">Price</span>' +
          '<span class="prefixed">' +
            '<span class="prefix">Rp</span>' +
            '<input class="input js-price" type="text" inputmode="numeric" placeholder="0">' +
          '</span>' +
        '</label>' +
      '</div>' +
      '<span class="item__sum js-sum"></span>' +
      '<label class="field">' +
        '<span class="field__label">Est. production cost <span class="tag">Internal</span></span>' +
        '<span class="prefixed">' +
          '<span class="prefix">Rp</span>' +
          '<input class="input js-cost" type="text" inputmode="numeric" placeholder="0">' +
        '</span>' +
        '<span class="field__hint js-costhint"></span>' +
      '</label>' +
      '<span class="err js-err" hidden></span>';

    $('.js-name', row).value = item.name || '';
    $('.js-qty', row).value = item.qty == null ? 1 : item.qty;
    $('.js-price', row).value = item.price === '' || item.price == null
      ? '' : U.groupDigits(item.price);
    $('.js-cost', row).value = item.cost === '' || item.cost == null
      ? '' : U.groupDigits(item.cost);
    return row;
  }

  function addItemRow(data, focus) {
    const row = createItemRow(data);
    el.itemList.appendChild(row);
    refreshRemoveButtons();
    refreshItemTotals();
    if (focus) $('.js-name', row).focus();
    return row;
  }

  /* The ceiling a unit's production cost should stay under to leave the
     studio its margin. Same figure as the first deposit, by coincidence — this
     one is about what an item costs to make, not what has been paid for it. */
  const COST_BUDGET_SHARE = 0.35;

  /** Nothing to aim at until there is a price to take a share of. */
  function costHint(price, cost) {
    if (!price) return { text: '', over: false };
    const budget = Math.round(price * COST_BUDGET_SHARE);
    if (cost > budget) {
      return { text: U.formatRupiah(cost - budget) + ' over the 35% target', over: true };
    }
    return { text: 'Keep under ' + U.formatRupiah(budget) + ' (35% of price)', over: false };
  }

  /* Qty × price per row, and the order total in the card header — the editor
     otherwise made you hold both sums in your head until you saved. */
  function refreshItemTotals() {
    let total = 0;
    readItems().forEach((it) => {
      const line = it.qty * it.price;
      total += line;
      const sum = $('.js-sum', it.row);
      if (sum) sum.textContent = (it.qty > 1 && it.price > 0) ? U.formatRupiah(line) : '';

      const hintNode = $('.js-costhint', it.row);
      if (hintNode) {
        const hint = costHint(it.price, it.cost);
        hintNode.textContent = hint.text;
        hintNode.classList.toggle('field__hint--over', hint.over);
      }
    });
    el.itemsTotal.textContent = total > 0 ? U.formatRupiah(total) : '';
  }

  const rowElements = () => $$('.item', el.itemList);

  function refreshRemoveButtons() {
    const rows = rowElements();
    rows.forEach((row) => { $('.js-remove', row).disabled = rows.length <= 1; });
  }

  /** Reads the current item state straight from the DOM inputs. */
  function readItems() {
    return rowElements().map((row) => ({
      row: row,
      name: $('.js-name', row).value.trim(),
      qtyRaw: U.digitsOnly($('.js-qty', row).value),
      priceRaw: U.digitsOnly($('.js-price', row).value),
      costRaw: U.digitsOnly($('.js-cost', row).value),
      get qty() { return this.qtyRaw === '' ? 0 : Number(this.qtyRaw); },
      get price() { return this.priceRaw === '' ? 0 : Number(this.priceRaw); },
      get cost() { return this.costRaw === '' ? 0 : Number(this.costRaw); }
    }));
  }

  /* -------------------------------- Includes ----------------------------- */

  /** A standing chip: label only, toggled on and off. */
  function fixedChip(label, checked) {
    return '<label class="chip' + (checked ? ' is-checked' : '') + '" ' +
      'data-label="' + U.escapeHtml(label) + '">' +
      '<input type="checkbox"' + (checked ? ' checked' : '') + '>' +
      '<span class="chip__box">' + CHECK_ICON + '</span>' +
      '<span>' + U.escapeHtml(label) + '</span>' +
    '</label>';
  }

  /**
   * A user-added chip. The remove button sits beside the label rather than
   * inside it — nesting a button in a <label> makes every click on it toggle
   * the checkbox too.
   */
  function customChip(label, checked) {
    return '<span class="chip chip--custom' + (checked ? ' is-checked' : '') + '" ' +
      'data-label="' + U.escapeHtml(label) + '">' +
      '<label class="chip__main">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') + '>' +
        '<span class="chip__box">' + CHECK_ICON + '</span>' +
        '<span>' + U.escapeHtml(label) + '</span>' +
      '</label>' +
      '<button type="button" class="chip__remove js-remove-include" ' +
        'aria-label="Remove ' + U.escapeHtml(label) + '">' + CLOSE_ICON + '</button>' +
    '</span>';
  }

  /**
   * The six standing options, ticked to match the saved order, followed by any
   * saved label that is not one of them — those came from a previous "add your
   * own" and would otherwise vanish on reload.
   */
  function buildIncludes(saved) {
    const ticked = saved || [];
    const isTicked = (label) => ticked.some((l) => l.toLowerCase() === label.toLowerCase());
    const extra = ticked.filter((l) =>
      !INCLUDES.some((s) => s.toLowerCase() === l.toLowerCase()));

    el.includesList.innerHTML =
      INCLUDES.map((label) => fixedChip(label, isTicked(label))).join('') +
      extra.map((label) => customChip(label, true)).join('');
  }

  const includeLabels = () =>
    $$('[data-label]', el.includesList).map((chip) => chip.dataset.label);

  const checkedIncludes = () =>
    $$('.chip', el.includesList)
      .filter((chip) => $('input', chip).checked)
      .map((chip) => chip.dataset.label);

  function addCustomInclude() {
    const label = el.customInclude.value.trim().replace(/\s+/g, ' ');
    if (!label) return;

    const existing = includeLabels();
    const match = existing.findIndex((l) => l.toLowerCase() === label.toLowerCase());
    if (match !== -1) {
      // Already on the list — just make sure it is ticked, and say so.
      const chip = $$('.chip', el.includesList)[match];
      $('input', chip).checked = true;
      chip.classList.add('is-checked');
      el.customInclude.value = '';
      setDirty(true);
      showToast('"' + label + '" is already on the list');
      return;
    }

    el.includesList.insertAdjacentHTML('beforeend', customChip(label, true));
    el.customInclude.value = '';
    el.customInclude.focus();
    setDirty(true);
  }

  /* ----------------------------- Payment terms ---------------------------- */

  /* The 35/35/30 split is the wedding-attire package's, and hard-coding it made
     every other thing the studio sells un-quotable. An order on "other
     services" carries its own list instead.

     The one rule is that the shares add up to the whole job: terms that sum to
     90% mean an invoice whose instalments do not reach its own total, which is
     the kind of error that surfaces as an argument about money months later.
     So the sum is shown live and the save is refused until it lands on 100. */

  function createTermRow(t) {
    const term = t || { label: '', percent: '', desc: '' };
    const row = document.createElement('div');
    row.className = 'term';
    row.innerHTML =
      '<div class="item__head">' +
        '<span class="term__idx"></span>' +
        '<button type="button" class="item__remove js-remove-term" aria-label="Remove term">' +
          REMOVE_ICON +
        '</button>' +
      '</div>' +
      '<div class="term__row">' +
        '<label class="field term__namefield">' +
          '<span class="field__label">Label</span>' +
          '<input class="input js-tlabel" type="text" maxlength="40" placeholder="e.g. Down payment">' +
        '</label>' +
        '<label class="field term__pctfield">' +
          '<span class="field__label">Share</span>' +
          '<span class="prefixed prefixed--suffix">' +
            '<input class="input js-tpct" type="text" inputmode="decimal" placeholder="0">' +
            '<span class="suffix">%</span>' +
          '</span>' +
        '</label>' +
      '</div>' +
      '<label class="field">' +
        '<span class="field__label">Description (optional)</span>' +
        '<input class="input js-tdesc" type="text" maxlength="120" ' +
          'placeholder="Printed under the share on the quotation">' +
      '</label>';

    $('.js-tlabel', row).value = term.label || '';
    $('.js-tpct', row).value = term.percent === '' || term.percent == null ? '' : String(term.percent);
    $('.js-tdesc', row).value = term.desc || '';
    return row;
  }

  function addTermRow(data, focus) {
    const row = createTermRow(data);
    el.termList.appendChild(row);
    refreshTermRemoveButtons();
    refreshTermsSum();
    if (focus) $('.js-tlabel', row).focus();
    return row;
  }

  const termRowElements = () => $$('.term', el.termList);

  function refreshTermRemoveButtons() {
    const rows = termRowElements();
    rows.forEach((row) => { $('.js-remove-term', row).disabled = rows.length <= 1; });
  }

  /** Blank stays blank rather than becoming 0 — an empty field is unanswered. */
  const parsePercent = (raw) => {
    const cleaned = String(raw || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    return cleaned === '' || cleaned === '.' ? null : Number(cleaned);
  };

  function readTerms() {
    return termRowElements().map((row) => ({
      label: $('.js-tlabel', row).value.trim(),
      percent: parsePercent($('.js-tpct', row).value),
      desc: $('.js-tdesc', row).value.trim()
    }));
  }

  const termsTotal = (terms) =>
    terms.reduce((sum, t) => sum + (t.percent || 0), 0);

  /* Rounded before comparing: three thirds typed as 33.33 are 99.99, and
     refusing that would be pedantry rather than protection. */
  const roundPct = (n) => Math.round(n * 100) / 100;

  function refreshTermsSum() {
    const total = roundPct(termsTotal(readTerms()));
    const off = roundPct(100 - total);
    el.termsSum.textContent = 'Shares total ' + total + '%' +
      (off === 0 ? '' : (off > 0 ? ' — ' + off + '% short' : ' — ' + (-off) + '% over'));
    el.termsSum.classList.toggle('termsum--off', off !== 0);
  }

  function showTermsError(message) {
    el.errTerms.textContent = message;
    el.errTerms.hidden = false;
    el.termsCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
  }

  /** Only ever checked for the custom scheme — the package's terms are fixed. */
  function validateTerms() {
    el.errTerms.hidden = true;
    if (el.oScheme.value !== 'other') return true;

    const terms = readTerms();
    if (!terms.length) return showTermsError('Add at least one payment term.');
    if (terms.some((t) => !t.label)) return showTermsError('Every term needs a label.');
    if (terms.some((t) => t.percent == null || t.percent <= 0)) {
      return showTermsError('Every term needs a share above 0%.');
    }

    const total = roundPct(termsTotal(terms));
    if (total !== 100) {
      return showTermsError('The shares add up to ' + total + '%. They have to add up to 100%.');
    }
    return true;
  }

  /** Seeds the list on the first switch to custom, so it is never empty. */
  function buildTerms(order) {
    el.termList.innerHTML = '';
    const saved = (order && order.payment_terms) || [];
    const rows = saved.length ? saved : [{ label: 'Down payment', percent: 50, desc: '' },
                                         { label: 'Final payment', percent: 50, desc: '' }];
    rows.forEach((t) => addTermRow(t, false));
  }

  function syncSchemeCard() {
    el.termsCard.hidden = el.oScheme.value !== 'other';
    if (!el.termsCard.hidden && !termRowElements().length) buildTerms(null);
    el.errTerms.hidden = true;
    refreshTermsSum();
  }

  /* ------------------------------ PDF download ---------------------------- */

  /** Both buttons lock during a capture; only the pressed one spins. */
  function setBusy(kind, busy) {
    Object.keys(DOWNLOAD_BUTTONS).forEach((k) => { DOWNLOAD_BUTTONS[k].disabled = busy; });
    const btn = DOWNLOAD_BUTTONS[kind];
    btn.classList.toggle('is-busy', busy);
    $('.btn__label', btn).textContent = busy ? 'Generating…' : docs.DOCS[kind].name + ' PDF';
  }

  async function download(kind) {
    setBusy(kind, true);
    let total;
    try {
      total = await docs.download(kind, orderDataFromState());
    } catch (err) {
      console.error(err);
      showToast('Could not generate the PDF — please try again');
      setBusy(kind, false);
      return;
    }
    setBusy(kind, false);
    showToast(docs.DOCS[kind].name + ' downloaded');

    // Sending a quotation means it has been quoted; sending an invoice means
    // the order is confirmed. Only ever forward.
    await bumpStatus(kind === 'invoice' ? 'Confirmed' : 'Quoted');

    // The file is already on disk by now. A log failure is worth reporting but
    // must not read as a failed download.
    try {
      await db.logDocument(state.order.id, kind, total);
      await refreshHistory();
    } catch (err) {
      console.error(err);
      showToast('Downloaded, but could not record it');
    }
  }

  /* ----------------------------- Payment logging --------------------------- */

  /* Only offers what is still outstanding — the log had no guard against
     recording the same deposit twice. */
  function openPaymentChooser() {
    const total = docs.computeTotal(state.order.items);
    const terms = docs.termsFor(state.order);
    const amounts = docs.termAmounts(total, terms);
    const logged = state.loggedDeposits || {};
    el.paymentChooserOptions.innerHTML = terms
      .map((t, i) => (logged[i] ? '' :
        '<button type="button" class="btn btn--outline btn--block js-log-deposit" data-i="' + i + '">' +
          U.escapeHtml(t.label) + ' — ' + U.formatRupiah(amounts[i]) +
        '</button>')).join('');
    el.paymentChooserOptions.hidden = false;
  }

  async function logDeposit(i) {
    const total = docs.computeTotal(state.order.items);
    const terms = docs.termsFor(state.order);
    const amount = docs.termAmounts(total, terms)[i];
    try {
      await db.logOrderHistory(state.order.id, 'payment_logged', {
        deposit_index: i, deposit_label: docs.termLabel(terms[i]), amount: amount
      });
      el.paymentChooserOptions.hidden = true;
      showToast(terms[i].label + ' logged');
      // Money down means the work is under way.
      await bumpStatus('In production');
      await refreshHistory();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not log payment');
    }
  }

  /* -------------------------------- Deleting ------------------------------- */

  /* Both live in the app bar's overflow menu, two taps from anything you might
     be reaching for, and both still confirm by name. */

  async function deleteCustomer() {
    const name = state.customer.name || 'this customer';
    if (!window.confirm('Delete ' + name + ', along with every order and download record? This cannot be undone.')) return;
    try {
      await db.deleteCustomer(state.customer.id);
      setDirty(false);
      showToast('Customer deleted');
      go('#/customers');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not delete');
    }
  }

  async function deleteOrder() {
    if (!window.confirm('Delete this order and its payment and download record? This cannot be undone.')) return;
    try {
      const customerId = state.order.customer_id;
      await db.deleteOrder(state.order.id);
      setDirty(false);
      showToast('Order deleted');
      go('#/customer/' + customerId);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not delete');
    }
  }

  /* --------------------------------- Events ------------------------------ */

  function bindEvents() {
    window.addEventListener('hashchange', handleRoute);

    /* Up and Home are plain <a href="#/…">, so they route through hashchange
       and pick up the unsaved-changes guard for free — no handlers needed. */
    el.pageAction.addEventListener('click', () => {
      if (pageActionHandler) pageActionHandler();
    });

    el.saveBtn.addEventListener('click', async () => {
      if (state.saving) return;
      state.saving = true;
      setDirty(state.dirty);
      try {
        if (state.route.view === 'customer') await saveCustomer();
        else if (state.route.view === 'orderEdit') {
          const id = state.order.id;
          // Refused by validation: stay on the form, where the error is.
          if (!await saveOrder()) return;
          showToast('Order saved');
          leaveFormFor('#/order/' + id);
        }
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not save');
      } finally {
        state.saving = false;
        setDirty(state.dirty);
      }
    });

    /* -- overflow menu -- */

    el.menuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });

    document.addEventListener('click', (e) => {
      if (!el.menuList.hidden && !el.menu.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || el.menuList.hidden) return;
      closeMenu();
      el.menuBtn.focus();
    });

    el.menuSignOut.addEventListener('click', async () => {
      closeMenu();
      if (!confirmLeave()) return;
      await db.signOut();
      location.hash = '';
      showGate();
    });

    el.menuDelete.addEventListener('click', () => {
      closeMenu();
      if (el.menuDelete.dataset.kind === 'order') deleteOrder();
      else deleteCustomer();
    });

    /* -- customer list / overview -- */

    el.customerSearch.addEventListener('input', renderCustomerList);

    el.customerSort.addEventListener('change', () => {
      localStorage.setItem(SORT_KEY, el.customerSort.value);
      renderCustomerList();
    });

    el.newCustomer.addEventListener('click', () => go('#/customer/new'));

    /* -- customer detail -- */

    $$('.js-cfield').forEach((input) => {
      input.addEventListener('input', () => {
        if (input === el.cName && input.value.trim()) {
          input.classList.remove('is-invalid');
          el.errCName.hidden = true;
        }
        setDirty(true);
      });
      input.addEventListener('change', () => setDirty(true));
    });

    el.newOrder.addEventListener('click', async () => {
      if (!confirmLeave()) return;
      setDirty(false);
      try {
        const order = await db.createOrder({
          customer_id: state.customer.id,
          document_date: U.todayISO(),
          status: 'Quoted',
          items: [],
          includes: INCLUDES.slice()   // the standing package, all ticked
        });
        await db.logOrderHistory(order.id, 'created', {});
        go('#/order/' + order.id + '/edit');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not create the order');
      }
    });

    /* -- order detail -- */

    el.logPaymentBtn.addEventListener('click', () => {
      if (!el.paymentChooserOptions.hidden) { el.paymentChooserOptions.hidden = true; return; }
      openPaymentChooser();
    });

    el.paymentChooserOptions.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-log-deposit');
      if (!btn) return;
      logDeposit(Number(btn.dataset.i));
    });

    el.downloadQuote.addEventListener('click', () => download('quotation'));
    el.downloadInvoice.addEventListener('click', () => download('invoice'));

    /* -- calendar -- */

    el.syncCalendarBtn.addEventListener('click', syncCalendar);
    el.gcalConnect.addEventListener('click', connectGoogle);
    el.gcalDisconnect.addEventListener('click', disconnectGoogle);
    el.menuCalendar.addEventListener('click', closeMenu);

    /* -- order edit -- */

    $$('.js-ofield').forEach((input) => {
      input.addEventListener('input', () => setDirty(true));
      input.addEventListener('change', () => setDirty(true));
    });

    /* What the two anchor dates will produce, said while they are still being
       chosen. A window too short to hold the full programme is worth knowing
       about before saving, not after. */
    [el.oFitting1, el.oFittingFinal].forEach((input) => {
      input.addEventListener('input', renderScheduleHint);
      input.addEventListener('change', renderScheduleHint);
    });

    el.addItem.addEventListener('click', () => {
      addItemRow({ name: '', qty: 1, price: '', cost: '' }, true);
      setDirty(true);
    });

    el.itemList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove');
      if (!btn || btn.disabled) return;
      btn.closest('.item').remove();
      refreshRemoveButtons();
      refreshItemTotals();
      setDirty(true);
    });

    el.itemList.addEventListener('input', (e) => {
      const input = e.target;
      if (input.classList.contains('js-qty')) {
        input.value = U.digitsOnly(input.value).replace(/^0+(?=\d)/, '');
      } else if (input.classList.contains('js-price') || input.classList.contains('js-cost')) {
        U.reformatPriceField(input);
      }
      input.classList.remove('is-invalid');
      const errNode = $('.js-err', input.closest('.item'));
      if (errNode) errNode.hidden = true;
      refreshItemTotals();
      setDirty(true);
    });

    el.itemList.addEventListener('focusout', (e) => {
      if (e.target.classList.contains('js-qty') && U.digitsOnly(e.target.value) === '') {
        e.target.value = '1';
        refreshItemTotals();
      }
    });

    el.includesList.addEventListener('change', (e) => {
      const cb = e.target;
      if (cb.type !== 'checkbox') return;
      cb.closest('.chip').classList.toggle('is-checked', cb.checked);
      setDirty(true);
    });

    el.includesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove-include');
      if (!btn) return;
      e.preventDefault();
      btn.closest('.chip').remove();
      setDirty(true);
    });

    el.addInclude.addEventListener('click', addCustomInclude);

    /* -- payment terms -- */

    el.oScheme.addEventListener('change', () => {
      syncSchemeCard();
      setDirty(true);
    });

    el.addTerm.addEventListener('click', () => {
      addTermRow(null, true);
      setDirty(true);
    });

    el.termList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove-term');
      if (!btn || btn.disabled) return;
      btn.closest('.term').remove();
      refreshTermRemoveButtons();
      refreshTermsSum();
      setDirty(true);
    });

    el.termList.addEventListener('input', (e) => {
      const input = e.target;
      // One dot, digits either side of it, nothing else.
      if (input.classList.contains('js-tpct')) {
        input.value = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
      }
      el.errTerms.hidden = true;
      refreshTermsSum();
      setDirty(true);
    });

    el.customInclude.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomInclude();
      }
    });

    /* The bars change height with orientation, and with the download hint. */
    window.addEventListener('resize', syncBottomBar);

    /* A reload is outside the router's reach, so it gets its own guard. */
    window.addEventListener('beforeunload', (e) => {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  /* ---------------------------------- Gate -------------------------------- */

  function showGate() {
    el.boot.hidden = true;
    el.app.hidden = true;
    el.gate.hidden = false;
    el.gateRemember.checked = db.rememberPreference();
    el.gatePassword.value = el.gateRemember.checked ? db.savedPassword() : '';
    el.gateErr.hidden = true;
    if (el.gatePassword.value) el.gateSubmit.focus();
    else el.gatePassword.focus();
  }

  function showApp() {
    el.boot.hidden = true;
    el.gate.hidden = true;
    el.app.hidden = false;
    handleRoute();
    /* After the route, not before: exchanging the code needs a signed-in
       session, and its only visible result is a toast. */
    consumeGoogleRedirect();
  }

  function bindGate() {
    el.gateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (el.gateSubmit.disabled) return;

      el.gateErr.hidden = true;
      el.gateSubmit.disabled = true;
      el.gateSubmit.classList.add('is-busy');
      $('.btn__label', el.gateSubmit).textContent = 'Unlocking…';
      try {
        await db.signIn(el.gatePassword.value, el.gateRemember.checked);
        showApp();
      } catch (err) {
        el.gateErr.textContent = err.message || 'Could not sign in';
        el.gateErr.hidden = false;
        el.gatePassword.select();
      } finally {
        el.gateSubmit.disabled = false;
        el.gateSubmit.classList.remove('is-busy');
        $('.btn__label', el.gateSubmit).textContent = 'Unlock';
      }
    });
  }

  /* ---------------------------------- Init -------------------------------- */

  async function init() {
    bindGate();
    bindEvents();
    el.customerSort.value = savedSort();

    if (!db.isConfigured()) {
      el.boot.innerHTML =
        '<div class="boot__msg"><strong>Not connected.</strong>' +
        '<span>Fill in <code>config.js</code> with your Supabase URL and anon key — ' +
        'see “Setting up the database” in the README.</span></div>';
      return;
    }

    try {
      const session = await db.currentSession();
      if (session) showApp(); else showGate();
    } catch (err) {
      console.error(err);
      showGate();
    }
  }

  init();

  return { state };
})();
