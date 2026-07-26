/* Kelak Kembali — app shell.

   Three views behind a hash route — customer list, customer detail, order
   editor — plus the password gate. Owns all form state and navigation;
   defers to KK.db for persistence and KK.docs for the PDFs.

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
  const STATUSES = ['Draft', 'Quoted', 'Confirmed', 'In production', 'Delivered'];

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
    gateErr: $('#gateErr'),
    gateSubmit: $('#gateSubmit'),

    app: $('#app'),
    backBtn: $('#backBtn'),
    viewTitle: $('#viewTitle'),
    viewSub: $('#viewSub'),
    saveBtn: $('#saveBtn'),
    signOutBtn: $('#signOutBtn'),

    viewCustomers: $('#viewCustomers'),
    customerSearch: $('#customerSearch'),
    customerList: $('#customerList'),
    newCustomer: $('#newCustomer'),

    viewCustomer: $('#viewCustomer'),
    cName: $('#cName'),
    errCName: $('#errCName'),
    cPhone: $('#cPhone'),
    cInstagram: $('#cInstagram'),
    cSource: $('#cSource'),
    cWedding: $('#cWedding'),
    cFitting1: $('#cFitting1'),
    cFittingFinal: $('#cFittingFinal'),
    cNotes: $('#cNotes'),
    customerOrdersCard: $('#customerOrdersCard'),
    orderList: $('#orderList'),
    newOrder: $('#newOrder'),
    deleteCustomer: $('#deleteCustomer'),

    viewOrder: $('#viewOrder'),
    oDate: $('#oDate'),
    oStatus: $('#oStatus'),
    itemList: $('#itemList'),
    addItem: $('#addItem'),
    includesList: $('#includesList'),
    customInclude: $('#customInclude'),
    addInclude: $('#addInclude'),
    docLogCard: $('#docLogCard'),
    docLog: $('#docLog'),
    deleteOrder: $('#deleteOrder'),

    actionbar: $('#actionbar'),
    totalDisplay: $('#totalDisplay'),
    downloadQuote: $('#downloadQuote'),
    downloadInvoice: $('#downloadInvoice'),
    toast: $('#toast')
  };

  const DOWNLOAD_BUTTONS = { quotation: el.downloadQuote, invoice: el.downloadInvoice };

  /* --------------------------------- State ------------------------------- */

  const state = {
    route: null,        // { view, id }
    customers: [],      // the whole list, filtered client-side
    customer: null,     // record backing the customer view
    order: null,        // record backing the order view
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
    el.saveBtn.textContent = state.saving ? 'Saving…' : (dirty ? 'Save' : 'Saved');
  }

  function setChrome(opts) {
    el.viewTitle.textContent = opts.title;
    el.viewSub.textContent = opts.sub || 'Kelak Kembali';
    el.backBtn.hidden = !opts.back;
    el.saveBtn.hidden = !opts.save;
    el.actionbar.hidden = !opts.actions;
    document.body.classList.toggle('has-actionbar', !!opts.actions);
  }

  /* -------------------------------- Routing ------------------------------ */

  /** #/customers | #/customer/new | #/customer/:id | #/order/:id */
  function parseHash() {
    const parts = String(location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'customer' && parts[1]) return { view: 'customer', id: parts[1] };
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
    window.scrollTo(0, 0);

    try {
      if (next.view === 'customers') await showCustomers();
      else if (next.view === 'customer') await showCustomer(next.id);
      else await showOrder(next.id);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not load that');
    }
  }

  /* ---------------------------- Customer list ----------------------------- */

  async function showCustomers() {
    setChrome({ title: 'Customers', back: false, save: false, actions: false });
    state.customer = null;
    state.order = null;
    el.customerList.innerHTML = '<p class="empty">Loading…</p>';
    state.customers = await db.listCustomers();
    renderCustomerList();
  }

  function renderCustomerList() {
    const q = el.customerSearch.value.trim().toLowerCase();
    const rows = state.customers.filter((c) => !q || [c.name, c.phone, c.instagram]
      .some((v) => String(v || '').toLowerCase().includes(q)));

    if (!rows.length) {
      el.customerList.innerHTML = '<p class="empty">' +
        (state.customers.length ? 'No customer matches that.' : 'No customers yet.') + '</p>';
      return;
    }

    el.customerList.innerHTML = rows.map((c) => {
      const meta = [
        c.wedding_date ? 'Wedding ' + U.formatShortDate(c.wedding_date) : '',
        c.phone || '',
        c.instagram || ''
      ].filter(Boolean).join(' · ');
      return '<a class="row" href="#/customer/' + c.id + '">' +
        '<span class="row__main">' +
          '<span class="row__title">' + U.escapeHtml(c.name) + '</span>' +
          (meta ? '<span class="row__meta">' + U.escapeHtml(meta) + '</span>' : '') +
        '</span>' +
        '<span class="row__chev" aria-hidden="true">›</span>' +
      '</a>';
    }).join('');
  }

  /* --------------------------- Customer detail ---------------------------- */

  const BLANK_CUSTOMER = {
    id: null, name: '', phone: '', instagram: '', source: '',
    wedding_date: '', fitting_1_date: '', final_fitting_date: '', notes: ''
  };

  async function showCustomer(id) {
    const isNew = id === 'new';
    setChrome({
      title: isNew ? 'New customer' : 'Customer',
      back: true, save: true, actions: false
    });

    state.customer = isNew ? Object.assign({}, BLANK_CUSTOMER) : await db.getCustomer(id);
    fillCustomerForm(state.customer);

    el.customerOrdersCard.hidden = isNew;
    el.deleteCustomer.hidden = isNew;
    setDirty(isNew);

    if (isNew) {
      el.cName.focus();
      return;
    }

    el.viewSub.textContent = state.customer.name;
    el.orderList.innerHTML = '<p class="empty">Loading…</p>';
    renderOrderList(await db.listOrders(id));
  }

  function fillCustomerForm(c) {
    el.cName.value = c.name || '';
    el.cPhone.value = c.phone || '';
    el.cInstagram.value = c.instagram || '';
    el.cSource.value = c.source || '';
    el.cWedding.value = c.wedding_date || '';
    el.cFitting1.value = c.fitting_1_date || '';
    el.cFittingFinal.value = c.final_fitting_date || '';
    el.cNotes.value = c.notes || '';
    el.cName.classList.remove('is-invalid');
    el.errCName.hidden = true;
  }

  /** Empty text fields go to the database as NULL, not "". */
  const orNull = (v) => (String(v || '').trim() === '' ? null : String(v).trim());

  function readCustomerForm() {
    return {
      name: el.cName.value.trim(),
      phone: orNull(el.cPhone.value),
      instagram: orNull(el.cInstagram.value),
      source: orNull(el.cSource.value),
      wedding_date: orNull(el.cWedding.value),
      fitting_1_date: orNull(el.cFitting1.value),
      final_fitting_date: orNull(el.cFittingFinal.value),
      notes: orNull(el.cNotes.value)
    };
  }

  function renderOrderList(orders) {
    if (!orders.length) {
      el.orderList.innerHTML = '<p class="empty">No orders yet.</p>';
      return;
    }
    el.orderList.innerHTML = orders.map((o) => {
      const items = o.items || [];
      const label = items.length && items[0].name
        ? items[0].name + (items.length > 1 ? ' + ' + (items.length - 1) + ' more' : '')
        : 'Empty order';
      return '<a class="row" href="#/order/' + o.id + '">' +
        '<span class="row__main">' +
          '<span class="row__title">' + U.escapeHtml(label) + '</span>' +
          '<span class="row__meta">' + U.escapeHtml(U.formatShortDate(o.document_date)) +
            ' · ' + U.formatRupiah(docs.computeTotal(items)) + '</span>' +
        '</span>' +
        '<span class="badge badge--' + o.status.toLowerCase().replace(/\s+/g, '-') + '">' +
          U.escapeHtml(o.status) + '</span>' +
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
      showToast('Customer saved');
    } else {
      state.customer = await db.createCustomer(patch);
      setDirty(false);
      showToast('Customer created');
      go('#/customer/' + state.customer.id);
    }
    return true;
  }

  /* ------------------------------ Order editor ---------------------------- */

  async function showOrder(id) {
    setChrome({ title: 'Order', back: true, save: true, actions: true });

    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);
    el.viewSub.textContent = state.customer.name;

    el.oDate.value = state.order.document_date || U.todayISO();
    el.oStatus.value = STATUSES.includes(state.order.status) ? state.order.status : 'Draft';

    el.itemList.innerHTML = '';
    const items = (state.order.items || []).length
      ? state.order.items
      : [{ name: '', qty: 1, price: '' }];
    items.forEach((item) => addItemRow(item, false));

    buildIncludes(state.order.includes || []);
    el.customInclude.value = '';

    setDirty(false);
    renderDocuments();
    await refreshDocLog();
  }

  function orderData() {
    return {
      customerName: state.customer ? state.customer.name : '',
      date: el.oDate.value,
      items: readItems().map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
      includes: checkedIncludes()
    };
  }

  /** Push the current form into both templates and the running total. */
  function renderDocuments() {
    el.totalDisplay.textContent = U.formatRupiah(docs.render(orderData()));
  }

  async function saveOrder() {
    state.order = await db.updateOrder(state.order.id, {
      document_date: el.oDate.value || U.todayISO(),
      status: el.oStatus.value,
      items: orderData().items,
      includes: checkedIncludes()
    });
    setDirty(false);
    return true;
  }

  async function refreshDocLog() {
    const rows = await db.listDocumentLog(state.order.id);
    el.docLogCard.hidden = !rows.length;
    el.docLog.innerHTML = rows.map((r) =>
      '<div class="logrow">' +
        '<span class="logrow__kind">' + (r.kind === 'invoice' ? 'Invoice' : 'Quotation') + '</span>' +
        '<span class="logrow__when">' + U.escapeHtml(U.formatShortDate(r.created_at)) + '</span>' +
        '<span class="logrow__total">' + U.formatRupiah(r.total) + '</span>' +
      '</div>'
    ).join('');
  }

  /* ------------------------------- Item rows ----------------------------- */

  function createItemRow(data) {
    const item = data || { name: '', qty: 1, price: '' };
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
      '<span class="err js-err" hidden></span>';

    $('.js-name', row).value = item.name || '';
    $('.js-qty', row).value = item.qty == null ? 1 : item.qty;
    $('.js-price', row).value = item.price === '' || item.price == null
      ? '' : U.groupDigits(item.price);
    return row;
  }

  function addItemRow(data, focus) {
    const row = createItemRow(data);
    el.itemList.appendChild(row);
    refreshRemoveButtons();
    if (focus) $('.js-name', row).focus();
    return row;
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
      get qty() { return this.qtyRaw === '' ? 0 : Number(this.qtyRaw); },
      get price() { return this.priceRaw === '' ? 0 : Number(this.priceRaw); }
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
      renderDocuments();
      setDirty(true);
      showToast('"' + label + '" is already on the list');
      return;
    }

    el.includesList.insertAdjacentHTML('beforeend', customChip(label, true));
    el.customInclude.value = '';
    el.customInclude.focus();
    renderDocuments();
    setDirty(true);
  }

  /* ------------------------------- Validation ---------------------------- */

  function validateOrder() {
    let firstBad = null;

    readItems().forEach((it) => {
      const errNode = $('.js-err', it.row);
      const nameInput = $('.js-name', it.row);
      const qtyInput = $('.js-qty', it.row);
      const priceInput = $('.js-price', it.row);
      const problems = [];

      const hasName = it.name !== '';
      const hasQty = it.qtyRaw !== '' && it.qty >= 1;
      const hasPrice = it.priceRaw !== '';

      if (!hasName) problems.push('a description');
      if (!hasQty) problems.push('a quantity of at least 1');
      if (!hasPrice) problems.push('a price');

      nameInput.classList.toggle('is-invalid', !hasName);
      qtyInput.classList.toggle('is-invalid', !hasQty);
      priceInput.classList.toggle('is-invalid', !hasPrice);

      if (problems.length) {
        errNode.textContent = 'This item needs ' + problems.join(', ') + '.';
        errNode.hidden = false;
        if (!firstBad) firstBad = !hasName ? nameInput : (!hasQty ? qtyInput : priceInput);
      } else {
        errNode.hidden = true;
      }
    });

    if (firstBad) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBad.focus({ preventScroll: true });
    }
    return !firstBad;
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
    if (!validateOrder()) {
      showToast('Please complete the highlighted fields');
      return;
    }

    setBusy(kind, true);
    let total;
    try {
      // The log is a record of what was sent, so what was sent has to be what
      // is stored. Save first, always.
      if (state.dirty) await saveOrder();
      total = await docs.download(kind, orderData());
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
      await refreshDocLog();
    } catch (err) {
      console.error(err);
      showToast('Downloaded, but could not record it');
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
        else if (state.route.view === 'order') { await saveOrder(); showToast('Order saved'); }
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not save');
      } finally {
        state.saving = false;
        setDirty(state.dirty);
      }
    });

    el.signOutBtn.addEventListener('click', async () => {
      if (!confirmLeave()) return;
      await db.signOut();
      location.hash = '';
      showGate();
    });

    /* -- customer list -- */

    el.customerSearch.addEventListener('input', renderCustomerList);

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
          status: 'Draft',
          items: [],
          includes: INCLUDES.slice()   // the standing package, all ticked
        });
        go('#/order/' + order.id);
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not create the order');
      }
    });

    el.deleteCustomer.addEventListener('click', async () => {
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
    });

    /* -- order editor -- */

    $$('.js-ofield').forEach((input) => {
      input.addEventListener('input', () => { setDirty(true); renderDocuments(); });
      input.addEventListener('change', () => { setDirty(true); renderDocuments(); });
    });

    el.addItem.addEventListener('click', () => {
      addItemRow({ name: '', qty: 1, price: '' }, true);
      setDirty(true);
      renderDocuments();
    });

    el.itemList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove');
      if (!btn || btn.disabled) return;
      btn.closest('.item').remove();
      refreshRemoveButtons();
      setDirty(true);
      renderDocuments();
    });

    el.itemList.addEventListener('input', (e) => {
      const input = e.target;
      if (input.classList.contains('js-qty')) {
        input.value = U.digitsOnly(input.value).replace(/^0+(?=\d)/, '');
      } else if (input.classList.contains('js-price')) {
        U.reformatPriceField(input);
      }
      input.classList.remove('is-invalid');
      const errNode = $('.js-err', input.closest('.item'));
      if (errNode) errNode.hidden = true;
      setDirty(true);
      renderDocuments();
    });

    el.itemList.addEventListener('focusout', (e) => {
      if (e.target.classList.contains('js-qty') && U.digitsOnly(e.target.value) === '') {
        e.target.value = '1';
        renderDocuments();
      }
    });

    el.includesList.addEventListener('change', (e) => {
      const cb = e.target;
      if (cb.type !== 'checkbox') return;
      cb.closest('.chip').classList.toggle('is-checked', cb.checked);
      setDirty(true);
      renderDocuments();
    });

    el.includesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove-include');
      if (!btn) return;
      e.preventDefault();
      btn.closest('.chip').remove();
      setDirty(true);
      renderDocuments();
    });

    el.addInclude.addEventListener('click', addCustomInclude);

    el.customInclude.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomInclude();
      }
    });

    el.deleteOrder.addEventListener('click', async () => {
      if (!window.confirm('Delete this order and its download record? This cannot be undone.')) return;
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
    });

    el.downloadQuote.addEventListener('click', () => download('quotation'));
    el.downloadInvoice.addEventListener('click', () => download('invoice'));

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
    el.gatePassword.value = '';
    el.gateErr.hidden = true;
    el.gatePassword.focus();
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
        await db.signIn(el.gatePassword.value);
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
