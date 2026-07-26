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
    breadcrumbs: $('#breadcrumbs'),
    backBtn: $('#backBtn'),
    appbarMark: $('#appbarMark'),
    viewTitle: $('#viewTitle'),
    viewSub: $('#viewSub'),
    savebar: $('#savebar'),
    saveBtn: $('#saveBtn'),
    menu: $('#menu'),
    menuBtn: $('#menuBtn'),
    menuList: $('#menuList'),
    menuDelete: $('#menuDelete'),
    menuSignOut: $('#menuSignOut'),

    viewCustomers: $('#viewCustomers'),
    overviewRange: $('#overviewRange'),
    overviewActive: $('#overviewActive'),
    overviewFinished: $('#overviewFinished'),
    overviewGross: $('#overviewGross'),
    overviewProfit: $('#overviewProfit'),
    overviewNearest: $('#overviewNearest'),
    customerSearch: $('#customerSearch'),
    customerList: $('#customerList'),
    newCustomer: $('#newCustomer'),

    viewCustomer: $('#viewCustomer'),
    customerViewCard: $('#customerViewCard'),
    editCustomerBtn: $('#editCustomerBtn'),
    dName: $('#dName'),
    dPhone: $('#dPhone'),
    dInstagram: $('#dInstagram'),
    dSource: $('#dSource'),
    dWedding: $('#dWedding'),
    dNotes: $('#dNotes'),
    dCreated: $('#dCreated'),
    customerEditCard: $('#customerEditCard'),
    cancelCustomerBtn: $('#cancelCustomerBtn'),
    cName: $('#cName'),
    errCName: $('#errCName'),
    cPhone: $('#cPhone'),
    cInstagram: $('#cInstagram'),
    cSource: $('#cSource'),
    cWedding: $('#cWedding'),
    cNotes: $('#cNotes'),
    customerOrdersCard: $('#customerOrdersCard'),
    orderList: $('#orderList'),
    newOrder: $('#newOrder'),

    viewOrder: $('#viewOrder'),
    editOrderBtn: $('#editOrderBtn'),
    oStatusBadge: $('#oStatusBadge'),
    oDateDisplay: $('#oDateDisplay'),
    oFitting1Display: $('#oFitting1Display'),
    oFittingFinalDisplay: $('#oFittingFinalDisplay'),
    oItemsDisplay: $('#oItemsDisplay'),
    oIncludesDisplay: $('#oIncludesDisplay'),
    oNettProfit: $('#oNettProfit'),
    historyLog: $('#historyLog'),
    paymentSummary: $('#paymentSummary'),
    logPaymentBtn: $('#logPaymentBtn'),
    paymentChooserOptions: $('#paymentChooserOptions'),

    viewOrderEdit: $('#viewOrderEdit'),
    oTitle: $('#oTitle'),
    oDate: $('#oDate'),
    oStatus: $('#oStatus'),
    oFitting1: $('#oFitting1'),
    oFittingFinal: $('#oFittingFinal'),
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
    overview: null,          // { ordersByCustomer, nettProfitByOrder, paymentRows, nearest }
    overviewRange: 'month',  // 'month' | 'all' — Gross/Profit tiles only
    loggedDeposits: {},      // { depositIndex: loggedAt } for the open order
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

  function setChrome(opts) {
    el.viewTitle.textContent = opts.title;
    el.viewSub.textContent = opts.sub || 'Kelak Kembali';
    el.backBtn.hidden = !opts.back;
    // The logo only shows where nothing else needs the corner.
    el.appbarMark.hidden = !!opts.back;
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

  /** segments: [{ label, hash? }] — the last segment (or any without a hash)
      renders as plain text, everything else as a link back to that level. */
  function renderBreadcrumbs(segments) {
    el.breadcrumbs.innerHTML = segments.map((seg, i) => {
      const label = U.escapeHtml(seg.label);
      const isLast = i === segments.length - 1;
      return (isLast || !seg.hash)
        ? '<span class="breadcrumbs__item breadcrumbs__item--current">' + label + '</span>'
        : '<a class="breadcrumbs__item" href="' + seg.hash + '">' + label + '</a>';
    }).join('<span class="breadcrumbs__sep" aria-hidden="true">/</span>');
  }

  /* -------------------------------- Routing ------------------------------ */

  /** #/customers | #/customer/new | #/customer/:id | #/order/:id | #/order/:id/edit */
  function parseHash() {
    const parts = String(location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'customer' && parts[1]) return { view: 'customer', id: parts[1] };
    if (parts[0] === 'order' && parts[1] && parts[2] === 'edit') return { view: 'orderEdit', id: parts[1] };
    if (parts[0] === 'order' && parts[1]) return { view: 'order', id: parts[1] };
    return { view: 'customers' };
  }

  function go(hash) {
    if (location.hash === hash) handleRoute();
    else location.hash = hash;
  }

  /* Unsaved work is only ever one confirm away from being lost, never zero. */
  function confirmLeave() {
    if (!state.dirty) return true;
    return window.confirm('You have unsaved changes. Leave without saving?');
  }

  let lastHash = '';
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
    lastHash = location.hash;
    state.route = next;

    el.viewCustomers.hidden = next.view !== 'customers';
    el.viewCustomer.hidden = next.view !== 'customer';
    el.viewOrder.hidden = next.view !== 'order';
    el.viewOrderEdit.hidden = next.view !== 'orderEdit';
    window.scrollTo(0, 0);

    try {
      if (next.view === 'customers') await showCustomers();
      else if (next.view === 'customer') await showCustomer(next.id);
      else if (next.view === 'orderEdit') await showOrderEdit(next.id);
      else await showOrder(next.id);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not load that');
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

  /** Internal-only figure: never fed into docs.render, never on a PDF. */
  function nettProfit(items) {
    return (items || []).reduce((sum, it) =>
      sum + ((Number(it.price) || 0) - (Number(it.cost) || 0)) * (Number(it.qty) || 0), 0);
  }

  /* ---------------------------- Customer list ----------------------------- */

  async function showCustomers() {
    setChrome({ title: 'Customers', back: false, save: false, actions: false });
    renderBreadcrumbs([{ label: 'Customers' }]);
    state.customer = null;
    state.order = null;
    el.customerList.innerHTML = '<p class="empty">Loading…</p>';

    const [customers, allOrders, paymentRows] = await Promise.all([
      db.listCustomers(), db.listAllOrders(), db.listAllPaymentLog()
    ]);
    state.customers = customers;
    state.overview = buildOverview(allOrders, paymentRows);
    el.overviewRange.value = state.overviewRange;
    renderOverview();
    renderCustomerList();
  }

  function renderCustomerList() {
    const q = el.customerSearch.value.trim().toLowerCase();
    const rows = state.customers.filter((c) => !q || [c.name, c.phone, c.instagram]
      .some((v) => String(v || '').toLowerCase().includes(q)));

    if (!rows.length) {
      el.customerList.innerHTML = '<p class="empty">' +
        (state.customers.length
          ? 'No match for “' + U.escapeHtml(el.customerSearch.value.trim()) + '”.'
          : 'No customers yet. Add the first one below.') + '</p>';
      return;
    }

    /* Two meta lines, both load-bearing: the wedding date is what the list is
       sorted by, and the order count is what tells you whether there is
       anything to open. The old "Created" line was neither. */
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

  function buildOverview(allOrders, paymentRows) {
    const ordersByCustomer = {};
    const nettProfitByOrder = {};
    allOrders.forEach((o) => {
      (ordersByCustomer[o.customer_id] = ordersByCustomer[o.customer_id] || []).push(o);
      nettProfitByOrder[o.id] = nettProfit(o.items);
    });

    // Soonest upcoming fitting across every order, today or later.
    let nearest = null;
    const today = U.todayISO();
    allOrders.forEach((o) => {
      [o.fitting_1_date, o.final_fitting_date].forEach((d) => {
        if (!d || d < today) return;
        if (!nearest || d < nearest.date) nearest = { date: d, customerId: o.customer_id };
      });
    });

    return { ordersByCustomer, nettProfitByOrder, paymentRows, nearest };
  }

  /* Gross and profit are driven by the payment log, not order status or
     document date — "this month" is when a deposit was actually logged.
     Every deposit is always exactly a fixed 35/35/30 share of its order's
     total, so profit is recognised using that same share rather than a
     prorated dollar amount — keeping both figures cash-basis and tied to
     the same logged event. */
  function overviewMoney(range) {
    const now = new Date();
    const inRange = (iso) => {
      if (range === 'all') return true;
      const d = new Date(iso);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };

    let gross = 0;
    let profit = 0;
    (state.overview.paymentRows || []).forEach((r) => {
      if (!inRange(r.created_at)) return;
      const detail = r.detail || {};
      gross += Number(detail.amount) || 0;
      const share = docs.DEPOSIT_SHARES[detail.deposit_index] || 0;
      profit += (state.overview.nettProfitByOrder[r.order_id] || 0) * share;
    });
    return { gross, profit };
  }

  function renderOverview() {
    const ov = state.overview;

    let active = 0;
    let finished = 0;
    state.customers.forEach((c) => {
      const orders = ov.ordersByCustomer[c.id] || [];
      const isFinished = orders.length > 0 && orders.every((o) => o.status === 'Delivered');
      if (isFinished) finished++; else active++;
    });
    el.overviewActive.textContent = String(active);
    el.overviewFinished.textContent = String(finished);
    renderOverviewMoney();

    if (ov.nearest) {
      const customer = state.customers.find((c) => c.id === ov.nearest.customerId);
      const days = daysUntil(ov.nearest.date);
      const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days';
      el.overviewNearest.textContent = 'Next fitting ' + when + ' — ' +
        (customer ? customer.name : 'a customer') + ', ' + U.formatShortDate(ov.nearest.date);
    } else {
      el.overviewNearest.textContent = 'No upcoming fittings.';
    }
  }

  function renderOverviewMoney() {
    const money = overviewMoney(state.overviewRange);
    el.overviewGross.textContent = U.formatRupiah(money.gross);
    el.overviewProfit.textContent = U.formatRupiah(money.profit);
  }

  /* --------------------------- Customer detail ---------------------------- */

  const BLANK_CUSTOMER = {
    id: null, name: '', phone: '', instagram: '', source: '', wedding_date: '', notes: ''
  };

  /* The save bar follows the edit card, not the view: there is nothing to save
     while you are only reading a customer. */
  function setCustomerMode(editMode) {
    el.customerViewCard.hidden = editMode;
    el.customerEditCard.hidden = !editMode;
    el.customerOrdersCard.hidden = editMode || !state.customer || !state.customer.id;
    setSaveBar(editMode);
  }

  /** Days between today and an ISO date, negative once it has passed. */
  const daysUntil = (iso) =>
    Math.round((new Date(iso) - new Date(U.todayISO())) / 86400000);

  function renderCustomerReadOnly(c) {
    el.dName.textContent = c.name || '—';
    el.dPhone.textContent = c.phone || '—';
    el.dInstagram.textContent = c.instagram || '—';
    el.dSource.textContent = c.source || '—';
    el.dNotes.textContent = c.notes || '—';
    el.dCreated.textContent = c.created_at ? U.formatShortDate(c.created_at) : '—';

    /* The date that drives every other deadline, given in the unit people
       actually plan in — sitting on the date itself rather than on a line of
       its own repeating the word "wedding". */
    if (!c.wedding_date) {
      el.dWedding.textContent = 'Not set';
      return;
    }
    const days = daysUntil(c.wedding_date);
    const rel = days > 1 ? 'in ' + days + ' days'
      : days === 1 ? 'tomorrow'
        : days === 0 ? 'today'
          : Math.abs(days) + (Math.abs(days) === 1 ? ' day' : ' days') + ' ago';
    el.dWedding.textContent = U.formatShortDate(c.wedding_date) + ' · ' + rel;
  }

  async function showCustomer(id) {
    const isNew = id === 'new';
    setChrome({
      title: isNew ? 'New customer' : 'Customer',
      back: true, save: false, actions: false,
      destroy: isNew ? null : 'customer'
    });

    state.customer = isNew ? Object.assign({}, BLANK_CUSTOMER) : await db.getCustomer(id);
    fillCustomerForm(state.customer);
    // A new customer has nothing to read, so it opens straight into the form.
    el.cancelCustomerBtn.hidden = isNew;
    setCustomerMode(isNew);
    setDirty(isNew);

    if (isNew) {
      renderBreadcrumbs([{ label: 'Customers', hash: '#/customers' }, { label: 'New customer' }]);
      el.cName.focus();
      return;
    }

    el.viewSub.textContent = state.customer.name;
    renderBreadcrumbs([{ label: 'Customers', hash: '#/customers' }, { label: state.customer.name }]);
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
    if (!orders.length) {
      el.orderList.innerHTML = '<p class="empty">No orders yet.</p>';
      return;
    }
    /* Status, then the next fitting still ahead. The old third line printed
       both fitting dates and truncated mid-word on a phone, and read
       "1st fit not set · Final fit not set" on every new order. */
    el.orderList.innerHTML = orders.map((o) => {
      const next = [o.fitting_1_date, o.final_fitting_date]
        .filter((d) => d && d >= U.todayISO()).sort()[0];
      const status = String(o.status || '');
      return '<a class="row row--kanban" href="#/order/' + o.id + '">' +
        '<span class="row__main">' +
          '<span class="row__title">' + U.escapeHtml(orderLabel(o)) + '</span>' +
          '<span class="row__meta">' + U.escapeHtml(itemsSnippet(o.items)) + '</span>' +
          '<span class="row__tags">' +
            '<span class="badge badge--' + status.toLowerCase().replace(/\s+/g, '-') + '">' +
              U.escapeHtml(status) + '</span>' +
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
      el.viewSub.textContent = state.customer.name;
      renderBreadcrumbs([{ label: 'Customers', hash: '#/customers' }, { label: state.customer.name }]);
      renderCustomerReadOnly(state.customer);
      setCustomerMode(false);
      showToast('Customer saved');
    } else {
      state.customer = await db.createCustomer(patch);
      setDirty(false);
      showToast('Customer created');
      go('#/customer/' + state.customer.id);
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
    return row.action;
  }

  /* docs.DEPOSIT_LABELS carry the percentage because the invoice prints it.
     On screen the rupiah amount is on the same row, so the percentage is just
     the same fact twice — and it pushed every label onto two lines. */
  const depositName = (i) => docs.DEPOSIT_LABELS[i].split(' - ')[0];

  /* Which deposits have already been logged, so the page can show what is
     outstanding and the chooser can stop offering a deposit twice. */
  function renderPayments(historyRows) {
    const total = docs.computeTotal(state.order.items);
    const amounts = docs.depositAmounts(total);
    const logged = {};
    historyRows.forEach((r) => {
      if (r.action !== 'payment_logged') return;
      const i = r.detail && r.detail.deposit_index;
      if (i != null) logged[i] = r.created_at;
    });
    state.loggedDeposits = logged;

    /* Deposits are shares of the total, so with no priced items there is
       nothing to log but three Rp0 rows. */
    if (total <= 0) {
      el.paymentSummary.innerHTML = '<p class="empty">Price the items to work out the deposits.</p>';
      el.logPaymentBtn.hidden = true;
      el.paymentChooserOptions.hidden = true;
      return;
    }

    el.paymentSummary.innerHTML = docs.DEPOSIT_LABELS.map((label, i) =>
      '<div class="logrow">' +
        '<span class="logrow__kind">' + U.escapeHtml(depositName(i)) + '</span>' +
        '<span class="logrow__when">' +
          (logged[i] ? 'Paid ' + U.escapeHtml(U.formatShortDate(logged[i])) : 'Outstanding') +
        '</span>' +
        '<span class="logrow__total">' + U.formatRupiah(amounts[i]) + '</span>' +
      '</div>'
    ).join('');

    const outstanding = docs.DEPOSIT_LABELS.some((_, i) => !logged[i]);
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
      page has no form fields of its own. */
  function orderDataFromState() {
    return {
      customerName: state.customer ? state.customer.name : '',
      date: state.order.document_date,
      items: state.order.items || [],
      includes: state.order.includes || []
    };
  }

  async function showOrder(id) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);
    const label = orderLabel(state.order);

    setChrome({
      title: 'Order', sub: state.customer.name,
      back: true, save: false, actions: true, destroy: 'order'
    });
    renderBreadcrumbs([
      { label: 'Customers', hash: '#/customers' },
      { label: state.customer.name, hash: '#/customer/' + state.customer.id },
      { label: label }
    ]);

    el.oStatusBadge.className = 'badge badge--' + state.order.status.toLowerCase().replace(/\s+/g, '-');
    el.oStatusBadge.textContent = state.order.status;
    el.oDateDisplay.textContent = U.formatShortDate(state.order.document_date);
    el.oFitting1Display.textContent = state.order.fitting_1_date ? U.formatShortDate(state.order.fitting_1_date) : '—';
    el.oFittingFinalDisplay.textContent = state.order.final_fitting_date ? U.formatShortDate(state.order.final_fitting_date) : '—';

    const items = state.order.items || [];
    const total = docs.computeTotal(items);
    const namedItems = items.filter((it) => String(it.name || '').trim() !== '');
    el.oItemsDisplay.innerHTML = (namedItems.length ? namedItems.map((it) =>
      '<div class="logrow">' +
        '<span class="logrow__kind">' + U.escapeHtml(it.name) + ' × ' + (Number(it.qty) || 0) + '</span>' +
        '<span class="logrow__total">' + U.formatRupiah((Number(it.price) || 0) * (Number(it.qty) || 0)) + '</span>' +
      '</div>'
    ).join('') : '<p class="empty">No items yet.</p>') +
      '<div class="logrow"><span class="logrow__kind">Total</span>' +
      '<span class="logrow__total">' + U.formatRupiah(total) + '</span></div>';

    /* Six filled black pills made the least important block on the page the
       loudest. One muted line, joined the way the PDF itself joins them. */
    const inc = state.order.includes || [];
    el.oIncludesDisplay.textContent = inc.length
      ? 'Includes: ' + inc.join(' · ')
      : '';

    el.oNettProfit.textContent = U.formatRupiah(nettProfit(items));
    el.totalDisplay.textContent = U.formatRupiah(total);
    el.paymentChooserOptions.hidden = true;

    /* An empty order would export a document with no lines on it. */
    const sellable = namedItems.length > 0 && total > 0;
    el.downloadQuote.disabled = !sellable;
    el.downloadInvoice.disabled = !sellable;
    el.downloadNote.hidden = sellable;

    setDirty(false);
    await refreshHistory();
    syncBottomBar();
  }

  /* ------------------------------- Order edit ------------------------------ */

  async function showOrderEdit(id) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);
    const label = orderLabel(state.order);

    setChrome({
      title: 'Edit order', sub: state.customer.name,
      back: true, save: true, actions: false, destroy: 'order'
    });
    renderBreadcrumbs([
      { label: 'Customers', hash: '#/customers' },
      { label: state.customer.name, hash: '#/customer/' + state.customer.id },
      { label: label, hash: '#/order/' + id },
      { label: 'Edit' }
    ]);

    el.oTitle.value = state.order.title || '';
    el.oDate.value = state.order.document_date || U.todayISO();
    el.oStatus.value = STATUSES.includes(state.order.status) ? state.order.status : 'Quoted';
    el.oFitting1.value = state.order.fitting_1_date || '';
    el.oFittingFinal.value = state.order.final_fitting_date || '';

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
    const items = readItems().map((it) => ({ name: it.name, qty: it.qty, price: it.price, cost: it.cost }));
    state.order = await db.updateOrder(state.order.id, {
      title: orNull(el.oTitle.value),
      document_date: el.oDate.value || U.todayISO(),
      status: el.oStatus.value,
      items: items,
      includes: checkedIncludes(),
      fitting_1_date: orNull(el.oFitting1.value),
      final_fitting_date: orNull(el.oFittingFinal.value)
    });
    setDirty(false);
    try {
      await db.logOrderHistory(state.order.id, 'updated', {});
    } catch (err) {
      console.error(err);
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
      '<label class="field field--cost">' +
        '<span class="field__label">Production cost <span class="tag">Internal</span></span>' +
        '<span class="prefixed">' +
          '<span class="prefix">Rp</span>' +
          '<input class="input js-cost" type="text" inputmode="numeric" placeholder="0">' +
        '</span>' +
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

  /* Qty × price per row, and the order total in the card header — the editor
     otherwise made you hold both sums in your head until you saved. */
  function refreshItemTotals() {
    let total = 0;
    readItems().forEach((it) => {
      const line = it.qty * it.price;
      total += line;
      const sum = $('.js-sum', it.row);
      if (sum) sum.textContent = (it.qty > 1 && it.price > 0) ? U.formatRupiah(line) : '';
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
    const amounts = docs.depositAmounts(total);
    const logged = state.loggedDeposits || {};
    el.paymentChooserOptions.innerHTML = docs.DEPOSIT_LABELS
      .map((label, i) => (logged[i] ? '' :
        '<button type="button" class="btn btn--outline btn--block js-log-deposit" data-i="' + i + '">' +
          U.escapeHtml(depositName(i)) + ' — ' + U.formatRupiah(amounts[i]) +
        '</button>')).join('');
    el.paymentChooserOptions.hidden = false;
  }

  async function logDeposit(i) {
    const total = docs.computeTotal(state.order.items);
    const amount = docs.depositAmounts(total)[i];
    try {
      await db.logOrderHistory(state.order.id, 'payment_logged', {
        deposit_index: i, deposit_label: docs.DEPOSIT_LABELS[i], amount: amount
      });
      el.paymentChooserOptions.hidden = true;
      showToast(depositName(i) + ' logged');
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

    el.backBtn.addEventListener('click', () => history.back());

    el.saveBtn.addEventListener('click', async () => {
      if (state.saving) return;
      state.saving = true;
      setDirty(state.dirty);
      try {
        if (state.route.view === 'customer') await saveCustomer();
        else if (state.route.view === 'orderEdit') {
          const id = state.order.id;
          await saveOrder();
          showToast('Order saved');
          go('#/order/' + id);
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
    el.overviewRange.addEventListener('change', () => {
      state.overviewRange = el.overviewRange.value;
      renderOverviewMoney();
    });

    el.newCustomer.addEventListener('click', () => go('#/customer/new'));

    /* -- customer detail -- */

    el.editCustomerBtn.addEventListener('click', () => setCustomerMode(true));

    /* Opening the form and changing nothing used to leave you stuck in it. */
    el.cancelCustomerBtn.addEventListener('click', () => {
      if (!confirmLeave()) return;
      fillCustomerForm(state.customer);
      setDirty(false);
      setCustomerMode(false);
    });

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

    el.editOrderBtn.addEventListener('click', () => go('#/order/' + state.order.id + '/edit'));

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

    /* -- order edit -- */

    $$('.js-ofield').forEach((input) => {
      input.addEventListener('input', () => setDirty(true));
      input.addEventListener('change', () => setDirty(true));
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
