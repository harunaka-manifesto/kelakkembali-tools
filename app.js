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

  /* Also a check constraint, and also the options in the Source select. The
     intake table deliberately does not constrain its own copy — a stranger's
     answer is reconciled against this list when the enquiry is accepted, not
     when it arrives. */
  const SOURCES = ['Instagram', 'TikTok', 'Referral', 'Walk-in', 'Other'];

  /* Where a customer is, in the same spirit as the order ladder above: read off
     what has already happened rather than set by hand. Every one of these is
     implied by a record that exists anyway — so there is nothing to keep true,
     and nothing to forget to update.

       In consultation  no orders yet
       Ordering         at least one order exists
       Active           at least one order has a first payment
       Completed        the wedding date has passed
       Cancelled        the one fact nothing else implies — see cancelCustomer

     Order matters below: it is the precedence, most decisive first. */
  const CUSTOMER_STATUSES =
    ['Cancelled', 'Completed', 'Active', 'Ordering', 'In consultation'];

  /* The one automatic chase left. While a customer has no order they are a
     conversation that can go quiet without anything noticing, which is exactly
     what a nudge is for; once an order exists the order's own dates take over
     and a second reminder is noise. Counted from the moodboard when there is
     one, because that is the date with a promise attached. */
  const CONSULT_NUDGE = { label: 'Check in', days: 3 };
  const MOODBOARD_NUDGE = { label: 'Follow up moodboard', days: 3 };

  const REMOVE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  const CALC_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/>' +
    '<path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/></svg>';

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
    homeHero: $('#homeHero'),
    homeActions: $('#homeActions'),
    homeCustomers: $('#homeCustomers'),
    homeFooter: $('#homeFooter'),
    heroGreeting: $('#heroGreeting'),
    heroDeadline: $('#heroDeadline'),
    customerSearch: $('#customerSearch'),
    customerList: $('#customerList'),

    viewCustomer: $('#viewCustomer'),
    customerViewCard: $('#customerViewCard'),
    dPhone: $('#dPhone'),
    dInstagram: $('#dInstagram'),
    dSource: $('#dSource'),
    dWedding: $('#dWedding'),
    dNotes: $('#dNotes'),
    dCreated: $('#dCreated'),
    dMoodboard: $('#dMoodboard'),
    dMoodboardRow: $('#dMoodboardRow'),
    dCancelled: $('#dCancelled'),
    dCancelledRow: $('#dCancelledRow'),
    followUpLine: $('#followUpLine'),
    cancelCustomer: $('#cancelCustomer'),
    reopenCustomer: $('#reopenCustomer'),
    customerEditCard: $('#customerEditCard'),
    cName: $('#cName'),
    errCName: $('#errCName'),
    cPhone: $('#cPhone'),
    cInstagram: $('#cInstagram'),
    cSource: $('#cSource'),
    cWedding: $('#cWedding'),
    cWeddingMonth: $('#cWeddingMonth'),
    cWeddingPrecision: $('#cWeddingPrecision'),
    cMoodboardDate: $('#cMoodboardDate'),
    cFollowUpDate: $('#cFollowUpDate'),
    cFollowUpLabel: $('#cFollowUpLabel'),
    cCancelledReason: $('#cCancelledReason'),
    cCancelledField: $('#cCancelledField'),
    cNotes: $('#cNotes'),
    customerOrdersCard: $('#customerOrdersCard'),
    ordersTotal: $('#ordersTotal'),
    orderList: $('#orderList'),
    newOrder: $('#newOrder'),

    viewOrder: $('#viewOrder'),
    oDocNameDisplay: $('#oDocNameDisplay'),
    oFirstPaymentDisplay: $('#oFirstPaymentDisplay'),
    oSecondPaymentDisplay: $('#oSecondPaymentDisplay'),
    oFinalPaymentDisplay: $('#oFinalPaymentDisplay'),
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
    fittingHistoryCard: $('#fittingHistoryCard'),
    fittingHistoryList: $('#fittingHistoryList'),
    logNewFittingBtn: $('#logNewFittingBtn'),

    viewCalendar: $('#viewCalendar'),
    gcalState: $('#gcalState'),
    gcalConnect: $('#gcalConnect'),
    gcalDisconnect: $('#gcalDisconnect'),
    gcalErr: $('#gcalErr'),

    enquiriesCard: $('#enquiriesCard'),
    enquiriesCount: $('#enquiriesCount'),
    viewEnquiry: $('#viewEnquiry'),
    enquiryWhen: $('#enquiryWhen'),
    enquiryAnswers: $('#enquiryAnswers'),
    enquiryNote: $('#enquiryNote'),
    enquiryAccept: $('#enquiryAccept'),
    enquiryDismiss: $('#enquiryDismiss'),

    viewMoodboard: $('#viewMoodboard'),
    viewFittingJournal: $('#viewFittingJournal'),
    fittingJournal: $('#fittingJournal'),
    fittingJournalBar: $('#fittingJournalBar'),
    fittingJournalAdd: $('#fittingJournalAdd'),
    viewOrderEdit: $('#viewOrderEdit'),
    oTitle: $('#oTitle'),
    oDocName: $('#oDocName'),
    oFirstPayment: $('#oFirstPayment'),
    oSecondPayment: $('#oSecondPayment'),
    oFinalPayment: $('#oFinalPayment'),
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
    toast: $('#toast'),

    calcSheet: $('#calcSheet'),
    calcItemLabel: $('#calcItemLabel'),
    calcRowList: $('#calcRowList'),
    calcAddRow: $('#calcAddRow'),
    calcTotal: $('#calcTotal'),
    calcApply: $('#calcApply'),
    calcBack: $('#calcBack'),
    mbPresentation: $('#mbPresentation'),
    mbPresentationClose: $('#mbPresentationClose')
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
    customerOrders: [],      // the open customer's orders — what their status is read from
    enquiry: null,           // the intake submission being reviewed
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
      : (!el.savebar.hidden ? el.savebar : (!el.fittingJournalBar.hidden ? el.fittingJournalBar : null));
    document.documentElement.style.setProperty(
      '--bottombar-h', bar ? Math.round(bar.getBoundingClientRect().height) + 'px' : '0px');
  }

  /* iOS does not reliably resize fixed UI with its virtual keyboard. Publishing
     the visual-viewport gap lets the thumb-zone bars stay above it instead. */
  function syncVisualViewport() {
    const vv = window.visualViewport;
    const offset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty('--keyboard-offset', Math.round(offset) + 'px');
    syncBottomBar();
  }

  function keepFocusedControlVisible(target) {
    if (!target.matches('input, select, textarea, button')) return;
    requestAnimationFrame(() => setTimeout(() => {
      if (document.activeElement === target) target.scrollIntoView({
        block: 'center', inline: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }, 80));
  }

  function trapModalFocus(event, modal) {
    if (event.key !== 'Tab' || !modal || modal.hidden) return;
    const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.hidden && node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
    document.body.classList.toggle('is-homepage', !!opts.homepage);

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
     downloading an invoice means it has been confirmed, the deposit that pays
     for cloth means it is in production, and the last deposit means it is
     delivered. Reading it off those events is both less work and harder to get
     wrong than remembering to change a dropdown. */

  const statusSlug = (status) => String(status).toLowerCase().replace(/\s+/g, '-');

  const badgeClass = (status) => 'badge badge--' + statusSlug(status);

  /** Never backwards: re-downloading a quotation for an order already in
      production says nothing new about it. */
  function atLeast(current, floor) {
    const a = STATUSES.indexOf(current);
    const b = STATUSES.indexOf(floor);
    return b > a ? floor : (a === -1 ? STATUSES[0] : current);
  }

  /* The last step used to be "the wedding date has passed", which quietly filed
     away every order still owed money the morning after the day. The final
     deposit is asked for before delivery, so it is the event that actually says
     the garment went out — and an order the wedding has passed without one is
     precisely the order you still need to see. */
  function effectiveStatus(order) {
    const stored = STATUSES.includes(order.status) ? order.status : STATUSES[0];
    return order.final_payment_date ? 'Delivered' : stored;
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
    const status = effectiveStatus(state.order);
    el.viewSub.innerHTML = '<span class="' + badgeClass(status) + '">' +
      U.escapeHtml(status) + '</span>';
    el.viewSub.hidden = false;
  }

  /* ---------------------------- Customer status --------------------------- */

  /* Derived, like the order status above and for the same reason: every one of
     these is already implied by a record that exists anyway, so reading it off
     them is both less work and harder to get wrong than a control you have to
     remember to move.

     `orders` is whatever the caller has in hand — the customer page has the
     real list, the homepage has the overview projection. Both carry the two
     fields this needs, so neither has to fetch anything extra. */
  /* Completed is the last payment, not the last day. A wedding in the past used
     to end the story, which meant an unpaid final balance disappeared off the
     list the morning after the wedding — exactly the balance you most need to
     chase. Every order settled, and there is nothing left to do. */
  function customerStatus(customer, orders) {
    if (!customer) return 'In consultation';
    if (customer.cancelled_at) return 'Cancelled';
    const list = orders || [];
    if (list.length && list.every((o) => o.final_payment_date)) return 'Completed';
    if (list.some(orderIsPaid)) return 'Active';
    return list.length ? 'Ordering' : 'In consultation';
  }

  /* Two ways of knowing the same thing, and both are consulted because they
     came along at different times. first_payment_date is the precise answer and
     the one the fitting schedule counts from — but it is only written when a
     deposit is logged, and it did not exist for the app's first year, so orders
     paid before then have nothing in it. Reaching 'In production' is the older
     record of the same event: bumpStatus is called from logDeposit and nowhere
     else, so an order at or past that rung was paid for, whatever the column
     says. schema.sql backfills the dates from order_history; this makes the
     status right even where that could not reach. */
  const orderIsPaid = (o) => !!o.first_payment_date ||
    STATUSES.indexOf(o.status) >= STATUSES.indexOf('In production');

  /* ------------------------------- The anchors ---------------------------- */

  /* Two payments start two different things. The first commissions the design,
     which needs nothing but itself to be scheduled. The second commissions the
     garment, and it is what the measurements and fittings count from.

     A custom scheme has no second term we can reason about — it might have two
     stages or five, and none of them necessarily means "design approved" — so
     it gets no gate: its first payment starts everything at once. The standard
     35/35/30 is the one we know the shape of. */
  const productionIndex = (order) => (order && order.payment_scheme === 'other' ? 0 : 1);

  const designAnchor = (order) => (order && order.first_payment_date) || null;

  const productionAnchor = (order) => (!order ? null
    : order.payment_scheme === 'other' ? order.first_payment_date
    : order.second_payment_date) || null;

  /** The orders the open customer page already loaded, for customerStatus. */
  const openCustomerOrders = () => state.customerOrders || [];

  const addDays = (iso, n) => cal.fromDay(cal.toDay(iso) + n);

  /* created_at is a timestamptz; the date columns are already plain days. Both
     arrive here as nudge anchors, and cal.toDay only accepts the plain form. */
  const dateOnly = (value) => String(value || '').slice(0, 10);

  /* The Google event id is deliberately preserved across a change of date or
     label: the same one appointment is moving, so the sync updates it in place
     rather than leaving the old one behind. Clearing synced_at is what marks it
     as no longer matching what Google holds. */
  function followUpPatch(nudge, fromISO) {
    if (!nudge || !fromISO) {
      return { follow_up_date: null, follow_up_label: null, follow_up_synced_at: null };
    }
    return {
      follow_up_date: addDays(fromISO, nudge.days),
      follow_up_label: nudge.label,
      follow_up_synced_at: null
    };
  }

  /**
   * The chase a customer with no order should be carrying.
   *
   * Recomputed rather than remembered, so recording a moodboard that went out
   * last week puts the follow-up where it actually falls instead of a week
   * late. Returns nothing once there is an order — from then on the order's own
   * dates are the thing to look at.
   */
  function consultNudgeFor(customer, orders, moodboardISO) {
    if (!customer || customer.cancelled_at || (orders || []).length) {
      return followUpPatch(null, null);
    }
    const moodboard = moodboardISO === undefined ? customer.moodboard_date : moodboardISO;
    return moodboard
      ? followUpPatch(MOODBOARD_NUDGE, dateOnly(moodboard))
      : followUpPatch(CONSULT_NUDGE, dateOnly(customer.created_at));
  }

  /** Sets the nudge on the open customer, if it is not already what it should be. */
  async function setFollowUp(patch) {
    const c = state.customer;
    if (!c || !c.id) return;
    if (patch.follow_up_date === c.follow_up_date &&
        patch.follow_up_label === c.follow_up_label) return;
    state.customer = await db.updateCustomer(c.id, patch);
    await pushFollowUp();
  }

  /* Unlike the fitting schedule, this syncs itself rather than waiting for a
     button. A schedule is five events that get recomputed on every save, which
     is why sending it is a decision; a nudge is one event whose whole purpose
     is to fire when you would otherwise forget, and one that needs remembering
     to sync is not a nudge. Best-effort: a failure leaves synced_at null and
     the page says so, which is recoverable, and blocking a stage change on
     Google being reachable would not be. */
  async function pushFollowUp() {
    const c = state.customer;
    if (!c || !c.id) return;
    if (!c.follow_up_date && !c.follow_up_google_event_id) return;
    try {
      await db.syncFollowUp(c.id);
      // Re-read for the event id and synced_at the function just wrote.
      state.customer = await db.getCustomer(c.id);
    } catch (err) {
      console.error('Follow-up not synced to Google Calendar:', err);
    }
  }

  /* Cancelling is the one thing about a customer's status that no other record
     implies, so it is the one thing stored. Offered only while there is no
     money in — after a payment the answer is not "cancel the customer", it is a
     conversation about a refund, and a button would be pretending otherwise. */
  const canCancel = (customer, orders) =>
    !!customer && !!customer.id && !customer.cancelled_at &&
    !(orders || []).some((o) => o.first_payment_date);

  async function cancelCustomer() {
    const c = state.customer;
    if (!canCancel(c, openCustomerOrders())) return;
    if (!window.confirm('Mark ' + c.name + ' as not proceeding?\n\n' +
      'Everything is kept — they just stop appearing as live work.')) return;
    try {
      state.customer = await db.updateCustomer(c.id, {
        cancelled_at: new Date().toISOString(),
        /* The chase goes with them, in Google too. A reminder to follow up
           someone who has said no is worse than no reminder. */
        follow_up_date: null, follow_up_label: null, follow_up_synced_at: null
      });
      await pushFollowUp();
      renderCustomerReadOnly(state.customer);
      showToast('Marked as not proceeding');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not update the customer');
    }
  }

  /** People change their minds, so the door opens both ways. */
  async function reopenCustomer() {
    const c = state.customer;
    if (!c || !c.id || !c.cancelled_at) return;
    try {
      state.customer = await db.updateCustomer(c.id, Object.assign(
        { cancelled_at: null, cancelled_reason: null },
        consultNudgeFor(Object.assign({}, c, { cancelled_at: null }), openCustomerOrders())
      ));
      await pushFollowUp();
      renderCustomerReadOnly(state.customer);
      showToast('Reopened');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not reopen the customer');
    }
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
    if (parts[0] === 'order' && parts[1] && parts[2] === 'moodboard' && parts[3] === 'preview') {
      return { view: 'moodboardPreview', id: parts[1], query };
    }
    if (parts[0] === 'order' && parts[1] && parts[2] === 'moodboard') return { view: 'moodboard', id: parts[1], query };
    if (parts[0] === 'order' && parts[1] && parts[2] === 'fitting' && parts[3] === 'new') return { view: 'fittingNew', id: parts[1], query };
    if (parts[0] === 'order' && parts[1] && parts[2] === 'fitting' && parts[3]) return { view: 'fittingJournal', id: parts[1], sessionId: parts[3], query };
    if (parts[0] === 'order' && parts[1] && parts[2] === 'fittings') return { view: 'order', id: parts[1], query };
    if (parts[0] === 'order' && parts[1]) return { view: 'order', id: parts[1], query };
    if (parts[0] === 'calendar') return { view: 'calendar', query };
    if (parts[0] === 'enquiry' && parts[1]) return { view: 'enquiry', id: parts[1], query };
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
    const previous = state.route;

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
    const wasMoodboard = previous && (previous.view === 'moodboard' || previous.view === 'moodboardPreview');
    const isMoodboard = next.view === 'moodboard' || next.view === 'moodboardPreview';
    if (wasMoodboard && !isMoodboard) {
      closeMoodboardPresentation();
      mb.cleanup();
      activeMoodboardOrderId = null;
    }
    state.route = next;

    el.viewCustomers.hidden = next.view !== 'customers';
    el.viewCustomer.hidden = next.view !== 'customer';
    el.viewOrder.hidden = next.view !== 'order';
    el.viewOrderEdit.hidden = next.view !== 'orderEdit';
    el.viewMoodboard.hidden = !isMoodboard;
    el.viewFittingJournal.hidden = next.view !== 'fittingNew' && next.view !== 'fittingJournal';
    el.fittingJournalBar.hidden = next.view !== 'fittingJournal' && next.view !== 'fittingNew';
    document.body.classList.toggle('has-fitting-journal-bar', !el.fittingJournalBar.hidden);
    el.viewCalendar.hidden = next.view !== 'calendar';
    el.viewEnquiry.hidden = next.view !== 'enquiry';
    if (previous && (previous.view === 'fittingNew' || previous.view === 'fittingJournal') &&
        (next.view !== previous.view || next.id !== previous.id || next.sessionId !== previous.sessionId)) {
      KK.fittings.closeAll();
    }
    syncBottomBar();
    window.scrollTo(0, 0);

    const render = async () => {
      if (next.view === 'customers') await showCustomers();
      else if (next.view === 'customer') await showCustomer(next.id, next.query);
      else if (next.view === 'orderEdit') await showOrderEdit(next.id);
      else if (next.view === 'moodboard') await showMoodboard(next.id);
      else if (next.view === 'moodboardPreview') await showMoodboardPreview(next.id);
      else if (next.view === 'fittingNew') await showFittingNew(next.id);
      else if (next.view === 'fittingJournal') await showFittingJournal(next.id, next.sessionId);
      else if (next.view === 'calendar') await showCalendarSettings();
      else if (next.view === 'enquiry') await showEnquiry(next.id);
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

  /** Returns both the greeting text and the time-of-day key, so the hero
      gradient can key off the same hour split as the words above it. */
  function greetingForNow() {
    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
    const label = timeOfDay === 'morning' ? 'Good morning' : timeOfDay === 'afternoon' ? 'Good afternoon' : 'Good evening';
    return { text: label + ', Ichaku', timeOfDay };
  }

  const SKELETON_CARD = '<div class="home-customer-card home-customer-card--skeleton">' +
    '<span class="home-customer-card__top">' +
      '<span class="skeleton-block" style="width:60%;height:24px"></span>' +
      '<span class="skeleton-block" style="width:72px;height:16px"></span>' +
    '</span>' +
    '<span class="skeleton-block skeleton-block--divider"></span>' +
    '<span class="home-customer-card__meta">' +
      '<span class="skeleton-block" style="width:64px;height:16px"></span>' +
      '<span class="skeleton-block" style="width:96px;height:16px"></span>' +
    '</span>' +
  '</div>';

  function renderCustomerListError(networkIssue) {
    el.customerList.innerHTML =
      '<div class="home-error">' +
        '<p class="home-error__message">' + (networkIssue
          ? 'No connection — check your network'
          : 'Could not load customers') + '</p>' +
        '<button type="button" class="home-error__retry btn btn--outline btn--sm">Try again</button>' +
      '</div>';
    const retry = el.customerList.querySelector('.home-error__retry');
    if (retry) retry.addEventListener('click', () => { showCustomers(); });
    el.enquiriesCard.hidden = true;
  }

  async function showCustomers() {
    setChrome({ title: 'Customers', up: null, save: false, actions: false, homepage: true });
    state.customer = null;
    state.order = null;

    const greeting = greetingForNow();
    el.heroGreeting.textContent = greeting.text;
    el.homeHero.dataset.time = greeting.timeOfDay;
    [el.homeHero, el.homeActions, el.homeCustomers, el.homeFooter, el.enquiriesCard].forEach((section) => {
      section.classList.toggle('no-animate', !!state.homepageEntered);
    });

    el.customerList.innerHTML = SKELETON_CARD.repeat(3);

    /* The schedule and intake tables are the newest things in the schema, and
       the homepage is the first page anyone lands on. If either is missing —
       schema.sql not yet re-run against this project — that section goes quiet
       and the rest of the page still works. Losing the whole customer list over
       a table that has not been created yet would be out of all proportion.

       A stale token is re-thrown rather than swallowed: that one is not a
       missing table, and handleRoute knows how to retry it. */
    const optional = (label) => (err) => {
      if (db.isStaleToken(err)) throw err;
      console.warn('No ' + label + ' yet:', err.message);
      return [];
    };

    let customers, allOrders, allEvents, enquiries;
    try {
      [customers, allOrders, allEvents, enquiries] = await Promise.all([
        db.listCustomers(),
        db.listAllOrders(),
        db.listAllOrderEvents().catch(optional('order_events')),
        db.listIntake('new').catch(optional('intake_submissions'))
      ]);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      console.error(err);
      renderCustomerListError(err instanceof TypeError);
      showToast(err.message || 'Could not load customers');
      state.homepageEntered = true;
      return;
    }

    state.customers = customers;
    state.overview = buildOverview(allOrders, allEvents);
    renderHomepageAlert(enquiries);
    renderHeroDeadline();
    renderCustomerList();
    state.homepageEntered = true;
  }

  /* ----------------------------- Enquiry queue ---------------------------- */

  /* Form submissions waiting to be read. They are not customers yet and are not
     shown as any — accepting one is a judgement about whether it is real, and
     that judgement is the reason the queue exists rather than a direct write. */

  function renderHomepageAlert(rows) {
    el.enquiriesCard.hidden = !rows.length;
    if (!rows.length) return;
    el.enquiriesCount.textContent = rows.length + ' new order submission' + (rows.length === 1 ? '' : 's');
  }

  // TODO: navigate to submissions page
  function onEnquiriesCardActivate() {}
  el.enquiriesCard.addEventListener('click', onEnquiriesCardActivate);
  el.enquiriesCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEnquiriesCardActivate(); }
  });

  const enquirySummary = (r) => [
    r.wedding_date
      ? 'Wedding ' + (r.wedding_date_precision === 'month'
          ? U.formatLongDate(r.wedding_date).replace(/^\d+\s/, '')
          : U.formatShortDate(r.wedding_date))
      : 'No wedding date',
    r.phone || r.instagram || 'No contact'
  ].join(' · ');

  async function showEnquiry(id) {
    setChrome({
      title: 'Enquiry', up: { label: 'Customers', hash: '#/customers' },
      save: false, actions: false
    });
    state.enquiry = await db.getIntake(id);
    const r = state.enquiry;

    el.enquiryWhen.textContent = U.formatShortDate(r.created_at);
    el.enquiryAnswers.innerHTML = answerRows(r).map((row) =>
      '<div class="infolist__stack"><dt>' + U.escapeHtml(row.label) + '</dt>' +
        '<dd>' + U.escapeHtml(row.value) + '</dd></div>').join('') ||
      '<div class="infolist__stack"><dt>Answers</dt><dd>Nothing readable in this submission.</dd></div>';

    const resolved = r.status !== 'new';
    el.enquiryNote.textContent = resolved
      ? (r.status === 'accepted' ? 'Already accepted.' : 'Dismissed.')
      : 'Creating the customer files them at Enquiry, with a reminder to book ' +
        'the consultation in two days. Dismissing keeps the submission but ' +
        'creates nothing.';
    el.enquiryAccept.hidden = resolved;
    el.enquiryDismiss.hidden = resolved;
  }

  /* Read straight out of the stored payload rather than off the extracted
     columns, so a question added to the Tally form shows up here without this
     app needing to know about it. */
  function answerRows(r) {
    const fields = (r.payload && r.payload.data && r.payload.data.fields) || [];
    const rows = fields.map((f) => ({
      label: String(f.label || 'Answer'),
      value: readableAnswer(f)
    })).filter((row) => row.value);
    return rows.length ? rows : [
      { label: 'Name', value: r.name || '' },
      { label: 'Phone', value: r.phone || '' },
      { label: 'Instagram', value: r.instagram || '' },
      { label: 'Source', value: r.source || '' },
      { label: 'Notes', value: r.notes || '' }
    ].filter((row) => row.value);
  }

  /** Tally sends select answers as option ids; show the text they stand for. */
  function readableAnswer(field) {
    const v = field && field.value;
    if (v === null || v === undefined || v === '') return '';
    if (!Array.isArray(v)) return typeof v === 'object' ? JSON.stringify(v) : String(v);
    const options = field.options || [];
    return v.map((item) => {
      const hit = options.filter((o) => o.id === item)[0];
      return hit ? hit.text : String(item);
    }).filter(Boolean).join(', ');
  }

  async function acceptEnquiry() {
    const r = state.enquiry;
    if (!r || r.status !== 'new') return;
    try {
      /* The customer first, then the submission. In that order a failure leaves
         a submission still marked new — something to retry — rather than one
         marked accepted with no customer behind it. */
      const customer = await db.createCustomer(Object.assign({
        name: r.name || 'Unnamed enquiry',
        phone: r.phone,
        instagram: r.instagram,
        source: SOURCES.includes(r.source) ? r.source : 'Other',
        wedding_date: r.wedding_date,
        wedding_date_precision: r.wedding_date_precision === 'month' ? 'month' : 'day',
        notes: r.notes
      }, followUpPatch(CONSULT_NUDGE, U.todayISO())));

      await db.resolveIntake(r.id, 'accepted', customer.id);
      state.customer = customer;
      state.customerOrders = [];
      await pushFollowUp();
      showToast('Customer created');
      leaveFormFor('#/customer/' + customer.id);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not create the customer');
    }
  }

  async function dismissEnquiry() {
    const r = state.enquiry;
    if (!r || r.status !== 'new') return;
    if (!window.confirm('Dismiss this enquiry? It stays on record but creates nothing.')) return;
    try {
      await db.resolveIntake(r.id, 'dismissed', null);
      showToast('Enquiry dismissed');
      leaveFormFor('#/customers');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not dismiss the enquiry');
    }
  }

  function renderCustomerList() {
    const q = el.customerSearch.value.trim().toLowerCase();
    const rows = state.customers.filter((c) => !q ||
      [c.name, c.phone, c.instagram].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort(compareHomepageCustomers);

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
        : '<p class="empty">No customers yet.</p>';
      return;
    }

    el.customerList.innerHTML = rows.map((c, i) => {
      const orders = (state.overview.ordersByCustomer[c.id] || []);
      const gross = orders.reduce((sum, o) => sum + docs.computeTotal(o.items), 0);
      const display = homepageStatus(c, orders);
      const count = orders.length + ' order' + (orders.length === 1 ? '' : 's');
      return '<a class="home-customer-card home-customer-card--' + display.tone +
        '" style="--card-index:' + Math.min(i, 8) + ';--stack-index:' + i + '"' +
        ' href="#/customer/' + encodeURIComponent(c.id) + '">' +
        '<span class="home-customer-card__top"><span class="home-customer-card__name">' +
          U.escapeHtml(c.name || 'Unnamed customer') + '</span><span class="home-customer-card__badge">' +
          U.escapeHtml(display.label) + '</span></span>' +
        '<img class="home-customer-card__divider" src="assets/home-vector-1.svg" alt="">' +
        '<span class="home-customer-card__meta"><span>' + U.escapeHtml(count) +
          '</span><span>' + U.formatRupiah(gross) + '</span></span>' +
      '</a>';
    }).join('');
  }

  function homepageStatus(customer, orders) {
    const list = orders || [];
    /* A cancellation closes the customer record even if an older order still
       carries a workflow label; it always sorts after live work. */
    if (customer.cancelled_at) return { label: 'Cancelled', tone: 'quiet', rank: 5 };
    if (list.some((o) => o.status === 'In production')) return { label: 'In production', tone: 'production', rank: 0 };
    if (list.some((o) => o.status === 'Confirmed')) return { label: 'Invoice sent', tone: 'invoice', rank: 1 };
    if (list.some((o) => o.status === 'Quoted')) return { label: 'Quote sent', tone: 'invoice', rank: 2 };
    if (!list.length) return { label: 'In consultation', tone: 'consultation', rank: 3 };
    if (list.some((o) => o.status === 'Delivered')) return { label: 'Finished', tone: 'quiet', rank: 4 };
    return { label: 'Finished', tone: 'quiet', rank: 4 };
  }

  function compareHomepageCustomers(a, b) {
    const aStatus = homepageStatus(a, state.overview.ordersByCustomer[a.id] || []);
    const bStatus = homepageStatus(b, state.overview.ordersByCustomer[b.id] || []);
    if (aStatus.rank !== bStatus.rank) return aStatus.rank - bStatus.rank;
    const aDeadline = nextDeadline(a);
    const bDeadline = nextDeadline(b);
    const aDate = aDeadline ? aDeadline.date : '9999-12-31';
    const bDate = bDeadline ? bDeadline.date : '9999-12-31';
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    const aWedding = a.wedding_date || '9999-12-31';
    const bWedding = b.wedding_date || '9999-12-31';
    if (aWedding !== bWedding) return aWedding.localeCompare(bWedding);
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
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

  /** A customer is live work until the last payment is in, or until they say
      no. Someone with no orders yet counts — they are the ones who need one, and
      so does someone whose wedding has been and gone still owing a balance.
      Reads straight off the derived status so the strip and the badges can
      never disagree about who is still going. */
  const isActive = (customer) =>
    !['Cancelled', 'Completed'].includes(
      customerStatus(customer, state.overview.ordersByCustomer[customer.id]));

  /* Whichever date comes first, named. A fitting three days out matters more
     than a wedding three months out, and which one it is changes what you do
     about it — so the card says.

     Three sources: the stored fitting schedule, the follow-up nudge for whoever
     is still in the early pipeline, and the wedding itself. Before the deposit
     lands a customer has only the last two, which is exactly when the nudge is
     the thing worth surfacing. */
  function nextDeadline(customer) {
    const today = U.todayISO();
    const dates = [];
    if (customer.wedding_date) dates.push({ date: customer.wedding_date, what: 'Wedding' });
    if (customer.follow_up_date) {
      dates.push({ date: customer.follow_up_date, what: customer.follow_up_label || 'Follow up' });
    }

    /* Rows with an end date are blocks of work rather than appointments — the
       design phase is a fortnight you are inside, not a day to be somewhere.
       The deadline that closes it is its own row and shows up here on its own
       merits, which is the one worth a tile. */
    (state.overview.eventsByCustomer[customer.id] || [])
      .filter((e) => !e.end_date)
      .forEach((e) => dates.push({ date: e.event_date, what: e.stage }));

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

  function renderHeroDeadline() {
    const soon = state.customers
      .filter(isActive)
      .map((customer) => ({ customer, deadline: nextDeadline(customer) }))
      .filter((row) => row.deadline)
      .sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))[0];
    el.heroDeadline.hidden = !soon;
    if (!soon) return;
    const days = Math.ceil((new Date(soon.deadline.date) - new Date(U.todayISO())) / 86400000);
    const when = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days';
    el.heroDeadline.textContent = when + ': ' + firstName(soon.customer.name) + ' - ' + soon.deadline.what;
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

    /* The form owns these fields while it is open, and a customer who does not
       exist yet cannot be marked as not proceeding. Their real visibility is
       decided by renderCustomerStatus; this only takes them away. */
    if (editMode || isNew) {
      el.cancelCustomer.hidden = true;
      el.reopenCustomer.hidden = true;
      /* The badge describes the record as it stands; while the form is open the
         head says "Edit customer" and the two would be talking past each
         other. renderCustomerStatus puts it back on the way out. */
      el.viewSub.hidden = true;
    }
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

  const isApproximateWedding = (c) =>
    !!(c && c.wedding_date && c.wedding_date_precision === 'month');

  /** How the wedding date reads anywhere it is shown, hedged when it is a guess. */
  function weddingText(c) {
    if (!c || !c.wedding_date) return 'Not set';
    return isApproximateWedding(c)
      ? U.formatLongDate(c.wedding_date).replace(/^\d+\s/, '') + ' (approximate)'
      : U.formatShortDate(c.wedding_date);
  }

  function renderCustomerReadOnly(c) {
    const phoneDigits = String(c.phone || '').replace(/\D/g, '').replace(/^0/, '62');
    el.dPhone.innerHTML = c.phone && phoneDigits.length >= 8
      ? '<a class="contact-link" href="https://wa.me/' + encodeURIComponent(phoneDigits) +
        '" target="_blank" rel="noopener" aria-label="Message on WhatsApp">' + U.escapeHtml(c.phone) + '</a>'
      : U.escapeHtml(c.phone || '—');
    const instagramHandle = String(c.instagram || '').trim().replace(/^@/, '');
    el.dInstagram.innerHTML = instagramHandle
      ? '<a class="contact-link" href="https://www.instagram.com/' + encodeURIComponent(instagramHandle) +
        '/" target="_blank" rel="noopener">@' + U.escapeHtml(instagramHandle) + '</a>'
      : '—';
    el.dSource.textContent = c.source || '—';
    el.dNotes.textContent = c.notes || '—';
    el.dCreated.textContent = c.created_at ? U.formatShortDate(c.created_at) : '—';

    /* The date that drives every other deadline, given in the unit people
       actually plan in — sitting on the date itself rather than on a line of
       its own repeating the word "wedding". */
    el.dWedding.textContent = c.wedding_date
      ? weddingText(c) + ' · ' + relativeToToday(c.wedding_date)
      : 'Not set';

    /* Rows that only mean something once they have happened. An empty
       "Moodboard sent —" on a first-day enquiry is noise pretending to be
       information. */
    el.dMoodboard.textContent = showDate(c.moodboard_date);
    el.dMoodboardRow.hidden = !c.moodboard_date;
    el.dCancelled.textContent = c.cancelled_reason ||
      (c.cancelled_at ? 'No reason recorded' : '');
    el.dCancelledRow.hidden = !c.cancelled_at;

    renderCustomerStatus(c);
  }

  /* The status is a read-out, not a control — there is nothing here to set.
     It sits in the page head beside the name, the same place an order's status
     sits, because the two answer the same kind of question. */
  function renderCustomerStatus(c) {
    const orders = openCustomerOrders();
    const status = customerStatus(c, orders);

    el.viewSub.innerHTML = '<span class="' + badgeClass(status) + '">' +
      U.escapeHtml(status) + '</span>';
    el.viewSub.hidden = false;

    /* Only while a customer is still a conversation. Once money is in, the
       button would be offering something it cannot honestly do. */
    el.cancelCustomer.hidden = !canCancel(c, orders);
    el.reopenCustomer.hidden = !c.cancelled_at;

    el.followUpLine.hidden = !!c.cancelled_at;
    el.followUpLine.textContent = !c.follow_up_date
      ? (orders.length ? '' : 'Nothing to follow up.')
      : (c.follow_up_label || 'Follow up') + ' · ' +
        U.formatShortDate(c.follow_up_date) + ' · ' + relativeToToday(c.follow_up_date) +
        (c.follow_up_synced_at ? '' : ' · not in Google Calendar');
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

    state.customerOrders = [];
    // Arrived from a search that found nothing: the name is already known.
    const seeded = isNew ? String((query && query.get('name')) || '').trim() : '';

    if (isNew) {
      state.customer = Object.assign({}, BLANK_CUSTOMER);
      if (seeded) state.customer.name = seeded;
      fillCustomerForm(state.customer);
      // A new customer has nothing to read, so it opens straight into the form.
      setCustomerMode(true);
      setDirty(true);
      el.viewSub.hidden = true;
      /* With the name filled in, the next empty field is what needs the caret —
         landing on Name would only mean tabbing past what you just typed. */
      (seeded ? el.cPhone : el.cName).focus();
      return;
    }

    /* Both in one go: the status is derived from the orders, so rendering the
       page before they land would print "In consultation" over somebody who has
       three orders and then correct itself a moment later. */
    el.orderList.innerHTML = '<p class="empty">Loading…</p>';
    const [customer, orders] = await Promise.all([db.getCustomer(id), db.listOrders(id)]);
    state.customer = customer;
    state.customerOrders = orders;

    fillCustomerForm(customer);
    setCustomerMode(false);
    setDirty(false);
    renderCustomerReadOnly(customer);
    renderOrderList(orders);
  }

  function fillCustomerForm(c) {
    el.cName.value = c.name || '';
    el.cPhone.value = c.phone || '';
    el.cInstagram.value = c.instagram || '';
    el.cSource.value = c.source || '';
    el.cNotes.value = c.notes || '';

    el.cWedding.value = c.wedding_date || '';
    el.cWeddingMonth.value = (c.wedding_date || '').slice(0, 7);
    setWeddingPrecision(c.wedding_date_precision === 'month' ? 'month' : 'day');

    el.cMoodboardDate.value = c.moodboard_date || '';
    el.cFollowUpDate.value = c.follow_up_date || '';
    el.cFollowUpLabel.value = c.follow_up_label || '';
    el.cCancelledReason.value = c.cancelled_reason || '';
    el.cCancelledField.hidden = !c.cancelled_at;

    el.cName.classList.remove('is-invalid');
    el.errCName.hidden = true;
  }

  /** Which of the two date inputs is live. The other keeps its value but is
      hidden, so flipping back and forth does not lose what was typed. */
  function setWeddingPrecision(precision) {
    const month = precision === 'month';
    el.cWedding.hidden = month;
    el.cWeddingMonth.hidden = !month;
    $$('.segmented__btn', el.cWeddingPrecision).forEach((b) => {
      const on = (b.dataset.precision === 'month') === month;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  const weddingPrecision = () => el.cWeddingMonth.hidden ? 'day' : 'month';

  /** "2026-06" -> "2026-06-30". Last day, because a schedule built on the
      earliest possible wedding would run late for every date after it. */
  function lastDayOfMonth(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0));
    return cal.fromDay(Math.round(d.getTime() / 86400000));
  }

  function readCustomerForm() {
    const month = weddingPrecision() === 'month';
    return {
      name: el.cName.value.trim(),
      phone: orNull(el.cPhone.value),
      instagram: orNull(el.cInstagram.value),
      source: orNull(el.cSource.value),
      wedding_date: month ? lastDayOfMonth(el.cWeddingMonth.value) : orNull(el.cWedding.value),
      wedding_date_precision: month ? 'month' : 'day',
      moodboard_date: orNull(el.cMoodboardDate.value),
      follow_up_date: orNull(el.cFollowUpDate.value),
      follow_up_label: orNull(el.cFollowUpLabel.value),
      cancelled_reason: orNull(el.cCancelledReason.value),
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
      /* Recomputed rather than read from order_events: the programme is a pure
         function of these dates, so a row of it costs nothing here and saves
         the customer page a second query it would otherwise need. Pins are the
         one thing it cannot know without that query — a hand-moved date shows
         up here on the next visit to the order page, which is soon enough for
         a one-line summary. */
      const next = cal.computeProduction(productionAnchor(o), wedding).events
        .map((e) => e.event_date).filter((d) => d >= U.todayISO())[0];
      const status = effectiveStatus(o);
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
      const before = state.customer;
      state.customer = await db.updateCustomer(state.customer.id, patch);
      setDirty(false);

      /* The wedding is one end of every fitting programme this customer has, so
         moving it moves all of them. Doing it here rather than leaving each
         order to notice on its next save is the difference between a schedule
         that is wrong and one that is merely out of date. */
      if (before.wedding_date !== state.customer.wedding_date) {
        await rescheduleAllOrders();
      }
      /* Recording a moodboard that went out last Tuesday should put the chase
         where it actually falls, not a week late — so the nudge follows that
         date rather than the day you got round to typing it. Only when the date
         moved: any other edit leaves a hand-picked follow-up alone. */
      if (before.moodboard_date !== state.customer.moodboard_date) {
        await setFollowUp(consultNudgeFor(state.customer, openCustomerOrders()));
      } else if (before.follow_up_date !== state.customer.follow_up_date ||
                 before.follow_up_label !== state.customer.follow_up_label) {
        await pushFollowUp();
      }

      renderCustomerReadOnly(state.customer);
      setCustomerMode(false);
      showToast('Customer saved');
    } else {
      /* A new enquiry with nothing chasing it is how enquiries get forgotten,
         which is the whole reason the pipeline exists. The stage itself comes
         from the column default. */
      state.customer = await db.createCustomer(Object.assign(patch,
        patch.follow_up_date ? {} : followUpPatch(CONSULT_NUDGE, U.todayISO())));
      setDirty(false);
      showToast('Customer created');
      /* replace, not push: the blank form is not somewhere to come back to,
         and leaving it in the history is what made Back reopen it. */
      leaveFormFor('#/customer/' + state.customer.id);
    }
    return true;
  }

  /** Rebuild every order's programme after the wedding date moved under them. */
  async function rescheduleAllOrders() {
    try {
      const orders = await db.listOrders(state.customer.id);
      for (const order of orders) {
        /* Only the fittings hang off the wedding date, so an order that has not
           reached production has nothing here to rebuild. */
        if (!productionAnchor(order)) continue;
        const res = await rescheduleOrder(order, state.customer);
        if (res.changed) {
          await db.logOrderHistory(order.id, 'scheduled', {
            count: res.rows.length, dropped: res.computed.dropped
          });
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Saved, but the fitting schedules could not be rebuilt');
    }
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
      const pinned = (row.detail && row.detail.pinned) || 0;
      return 'Synced ' + n + (n === 1 ? ' date' : ' dates') + ' to Google Calendar' +
        (pinned ? ', ' + pinned + ' kept as moved' : '');
    }
    if (row.action === 'moodboard_generated') return 'Moodboard generated';
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
      label: r.kind === 'moodboard' ? 'Moodboard saved' :
        (r.kind === 'invoice' ? 'Invoice' : 'Quotation') + ' downloaded',
      amount: r.total,
      link: r.drive_link || null
    }))).sort((a, b) => new Date(b.when) - new Date(a.when));

    /* What happened reads down the left, when it happened down the right: the
       dates line up as a column you can run your eye along, and the amount sits
       under the entry it belongs to rather than competing with the date for the
       end of the row. */
    el.historyLog.innerHTML = merged.length ? merged.map((r) => {
      const labelHtml = r.link
        ? '<a class="logrow__kind logrow__link" href="' + U.escapeHtml(r.link) + '" target="_blank" rel="noopener">' +
            U.escapeHtml(r.label) + '</a>'
        : '<span class="logrow__kind">' + U.escapeHtml(r.label) + '</span>';
      return '<div class="logrow logrow--stacked">' +
        '<span class="logrow__what">' +
          labelHtml +
          (r.amount != null
            ? '<span class="logrow__total">' + U.formatRupiah(r.amount) + '</span>' : '') +
        '</span>' +
        '<span class="logrow__when">' + U.escapeHtml(U.formatShortDate(r.when)) + '</span>' +
      '</div>';
    }).join('') : '<p class="empty">No history yet.</p>';
  }

  /** What docs.render/download need — read from the saved record, since this
      page has no form fields of its own. A document is dated the day it is
      issued, so the date is stamped here rather than typed into the editor. */
  function orderDataFromState() {
    return {
      docName: state.order.doc_name || state.customer.name || '',
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
    el.oFirstPaymentDisplay.textContent = showDate(state.order.first_payment_date);
    el.oSecondPaymentDisplay.textContent = showDate(state.order.second_payment_date);
    el.oFinalPaymentDisplay.textContent = showDate(state.order.final_payment_date);
    el.oWeddingDisplay.textContent = weddingText(state.customer);

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
       without an order or customer name would address it to nobody. */
    const priced = namedItems.length > 0 && total > 0;
    const hasDocName = String(state.order.doc_name || state.customer.name || '').trim() !== '';
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
    await refreshFittingHistory();
    syncBottomBar();
  }

  async function refreshFittingHistory() {
    const result = await Promise.all([db.listFittingSessions(state.order.id), db.listFittingPhotos(state.order.id)]);
    const hasHistory = result[0].length || result[1].length;
    el.fittingHistoryCard.hidden = !hasHistory;
    if (hasHistory) KK.fittings.renderHistoryList(el.fittingHistoryList, result[0], result[1], state.order.id);
  }

  async function showFittingNew(id) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);
    setChrome({ title: 'New fitting', up: { label: orderLabel(state.order), hash: '#/order/' + id }, save: false, actions: false });
    el.fittingJournalBar.hidden = true;
    document.body.classList.remove('has-fitting-journal-bar');
    syncBottomBar();
    const result = await Promise.all([db.listOrderEvents(id), db.listFittingSessions(id)]);
    const active = result[1].find((session) => session.status === 'active');
    if (active) { go('#/order/' + id + '/fitting/' + active.id); return; }
    const scheduledStages = result[0].filter((event) => cal.isProductionStage(event.stage));
    /* A fitting journal records what happened, whether or not the payment-led
       calendar programme has been generated yet. Without a programme, offer
       every production stage for a manual log; these placeholders are never
       persisted as calendar events. */
    const stages = scheduledStages.length ? scheduledStages
      : cal.PRODUCTION_STAGES.map((stage) => ({ stage: stage }));
    const begin = async (stage) => {
      try {
        const session = await db.createFittingSession({ order_id: id, stage: stage, status: 'active' });
        setChrome({ title: stage, up: { label: orderLabel(state.order), hash: '#/order/' + id }, action: { label: 'Done', onClick: () => KK.fittings.endSession(session, () => go('#/order/' + id)) }, save: false, actions: false });
        el.fittingJournalBar.hidden = false;
        document.body.classList.add('has-fitting-journal-bar');
        syncBottomBar();
        KK.fittings.renderJournal(el.fittingJournal, { order: state.order, customer: state.customer, session: session, photos: [], onToast: showToast });
        KK.fittings.startSession(session, { order: state.order, customer: state.customer, photos: [] }, showToast);
      } catch (err) { showToast(err.message || 'Could not start fitting session'); }
    };
    const stage = KK.fittings.detectStage(scheduledStages);
    if (stage) await begin(stage);
    else KK.fittings.showStagePicker(stages, begin, () => go('#/order/' + id));
  }

  async function showFittingJournal(id, sessionId) {
    state.order = await db.getOrder(id);
    state.customer = await db.getCustomer(state.order.customer_id);
    const result = await Promise.all([db.getFittingSession(sessionId), db.listFittingPhotos(id)]);
    const session = result[0], photos = result[1].filter((photo) => photo.session_id === session.id);
    setChrome({
      title: session.stage,
      up: { label: orderLabel(state.order), hash: '#/order/' + id },
      action: session.status === 'active' ? { label: 'Done', onClick: () => KK.fittings.endSession(session, () => go('#/order/' + id)) } : null,
      save: false, actions: false
    });
    el.fittingJournalBar.hidden = session.status !== 'active';
    document.body.classList.toggle('has-fitting-journal-bar', !el.fittingJournalBar.hidden);
    syncBottomBar();
    KK.fittings.renderJournal(el.fittingJournal, { order: state.order, customer: state.customer, session: session, photos: photos, onToast: showToast });
  }

  /* ------------------------------- Schedule ------------------------------- */

  /* The card shows what is stored, not what would be computed right now. The
     two are the same the moment after a save, and they have to be allowed to
     differ before one: the stored rows are what carry the Google event ids, so
     re-deriving them for display would quietly claim a sync that never
     happened. */

  /* The anchors live on two different records — the money on the order, the
     wedding on the customer — so every caller needs both. `pins` comes from the
     stored rows: an appointment moved by hand in Google is a fact about the
     world that the calculator has to be told, not one it can derive. */
  const scheduleFor = (order, customer, rows) => cal.computeSchedule(
    designAnchor(order),
    productionAnchor(order),
    customer && customer.wedding_date,
    cal.pinsFrom(rows)
  );

  async function refreshSchedule() {
    const order = state.order;

    let rows = [];
    try {
      rows = await db.listOrderEvents(order.id);
    } catch (err) {
      // A schedule that will not load is not a reason to lose the whole page.
      console.error(err);
    }

    const computed = scheduleFor(order, state.customer, rows);
    state.schedule = { computed: computed, rows: rows };

    const synced = rows.filter((r) => r.google_event_id);
    const pending = rows.filter((r) => !r.synced_at);

    cal.renderSchedule(el.scheduleList, {
      events: rows,
      warning: computed.warning,
      reason: computed.reason || 'No schedule yet — save the order to build one.'
    }, {
      /* The design block can exist on its own for a fortnight before there is
         anything else to show. Saying why the rest is missing is the difference
         between a schedule that is waiting and one that looks broken. */
      note: rows.length && !rows.some((r) => cal.isProductionStage(r.stage))
        ? computed.production.reason : ''
    });

    el.scheduleCount.textContent = rows.length ? rows.length + ' dates' : '';

    /* Sync is offered only once there is something to send. Whether Google is
       connected is a question for the settings page, not a reason to hide the
       button — pressing it says so, which is a shorter path than discovering
       the menu. */
    /* A fitting built on "sometime in June" is a guess, and a guess in a real
       calendar is worse than no entry at all — you stop trusting the ones that
       are right. The design block is not a guess: it counts from the payment
       and never from the wedding, so it syncs either way, and only the
       appointments that do depend on the wedding are held back. The Edge
       Function draws the same line; this is the version of that answer you get
       before pressing the button. */
    const approximate = isApproximateWedding(state.customer);
    const guesses = approximate && rows.some((r) => cal.isProductionStage(r.stage));
    const sendable = approximate ? rows.filter((r) => cal.isDesignStage(r.stage)) : rows;

    el.syncCalendarBtn.hidden = !sendable.length;
    el.syncCalendarBtn.disabled = false;
    el.syncCalendarBtn.textContent = synced.length && !pending.length
      ? 'Re-sync to Google Calendar'
      : 'Sync to Google Calendar';

    const pinned = rows.filter((r) => r.pinned).length;
    const pinNote = pinned
      ? ' ' + pinned + (pinned === 1 ? ' date was' : ' dates were') +
        ' moved in Google and will be kept as is.'
      : '';

    el.scheduleSyncNote.textContent = !rows.length ? ''
      : (guesses
          ? 'The fittings are estimates until the exact wedding date is confirmed — only the design block will sync.'
          : !synced.length ? 'Not in Google Calendar yet.'
          : pending.length ? pending.length + ' of ' + rows.length + ' dates changed since the last sync.'
          : 'All ' + rows.length + ' dates are in Google Calendar.') + pinNote;
  }

  /** What the dates in the editor will build, as they are typed. */
  function renderScheduleHint() {
    /* Read off the form rather than the record: the point of the hint is to
       answer "what would this date do" before it has been saved. */
    const draft = {
      payment_scheme: el.oScheme.value,
      first_payment_date: el.oFirstPayment.value,
      second_payment_date: el.oSecondPayment.value
    };
    const r = cal.computeSchedule(
      designAnchor(draft),
      productionAnchor(draft),
      state.customer && state.customer.wedding_date,
      cal.pinsFrom(state.schedule && state.schedule.rows)
    );

    /* A bullet apiece: what the design dates produce, what the fitting dates
       produce, and then one line per thing the window cost. Run together as a
       paragraph these were a wall of prose nobody finished reading, and the
       compromises — which are the only part worth acting on — were buried in
       the middle of it. */
    const facts = [];
    facts.push(r.design.events.length
      ? 'Design phase ' + U.formatShortDate(r.design.events[0].event_date) +
        ' – ' + U.formatShortDate(r.design.events[0].end_date)
      : r.design.reason);
    facts.push(r.production.events.length
      ? r.production.events.length + ' appointments from ' +
        U.formatShortDate(r.production.events[0].event_date) + ' to the wedding'
      : r.production.reason);

    /* The warnings are written as sentences because the schedule card runs them
       together into a paragraph. A bullet is not a sentence — the stop at the
       end of a line that already ends is just a mark to trip over. */
    const warnings = (r.production.events.length ? (r.production.warnings || []) : [])
      .map((t) => t.replace(/\.$/, ''));

    el.oScheduleHint.innerHTML =
      '<ul class="hintbox__list">' +
        facts.map((t) =>
          '<li>' + U.escapeHtml(t.replace(/\.$/, '')) + '</li>').join('') +
        warnings.map((t) =>
          '<li class="hintbox__warn">' + U.escapeHtml(t) + '</li>').join('') +
      '</ul>';
  }

  /** Rebuild the stored programme from the order's anchors. Returns what
      changed, so the caller can decide whether it is worth logging. */
  async function rescheduleOrder(order, customer) {
    const before = await db.listOrderEvents(order.id);
    const computed = scheduleFor(order, customer, before);

    /* The two groups are persisted one at a time, and this is why: a first
       payment with no wedding date yet produces a design block and no fittings,
       and writing that as one wholesale replacement would delete every fitting
       the order already had. Each group is only ever allowed to rewrite itself.

       Within a group, a missing date is a question, not an answer. Replacing a
       stored group with the empty result would delete its appointments — and,
       through googleForget, every calendar entry with them — as a side effect
       of a save that was only ever about an item price. An unworkable window
       still rewrites, because that is a real answer about real dates. */
    const groups = [
      { stages: cal.DESIGN_STAGES, result: computed.design },
      { stages: cal.PRODUCTION_STAGES, result: computed.production }
    ];

    let rows = before;
    const removed = [];

    for (const g of groups) {
      const held = before.filter((r) => g.stages.indexOf(r.stage) !== -1);
      if (g.result.missingAnchor && held.length) continue;

      const after = await db.replaceOrderEvents(order.id, g.result.events, g.stages);
      removed.push.apply(removed, after.removed);
      rows = after.events;
    }

    /* A stage that a tighter window cut out still has an event sitting in
       Google. Nobody is going to notice a fitting that quietly stopped being
       scheduled, so it is taken out rather than left to be believed. */
    const orphans = removed.map((r) => r.google_event_id).filter(Boolean);
    if (orphans.length) {
      try {
        await db.googleForget(orphans);
      } catch (err) {
        console.error('Dropped events left in Google Calendar:', err);
      }
    }

    const key = (r) => r.stage + '@' + r.event_date + (r.end_date ? '→' + r.end_date : '');
    const was = before.map(key).sort().join('|');
    const now = rows.map(key).sort().join('|');
    return { computed: computed, changed: was !== now, rows: rows };
  }

  async function syncCalendar() {
    const btn = el.syncCalendarBtn;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Syncing…';
    try {
      const res = await db.syncOrderCalendar(state.order.id);
      const n = (res && res.count) || 0;
      const pinned = (res && res.pinned) || 0;

      showToast(pinned
        ? pinned + (pinned === 1 ? ' date had' : ' dates had') + ' been moved in Google — kept'
        : n + (n === 1 ? ' date' : ' dates') + ' in Google Calendar');

      try {
        await db.logOrderHistory(state.order.id, 'calendar_synced', {
          count: n, pinned: pinned
        });
      } catch (err) {
        console.error(err);
      }

      /* The sync is the only thing that can discover a hand-moved date, and a
         new fixed point changes where everything after it belongs. Rebuilding
         here is what makes the reflow happen on the sync that found it rather
         than on whatever unrelated save comes next. */
      if (pinned) {
        try {
          await rescheduleOrder(state.order, state.customer);
        } catch (err) {
          console.error('Could not reflow around the moved date:', err);
        }
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
  const GOOGLE_SCOPE = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ');

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
    el.oFirstPayment.value = state.order.first_payment_date || '';
    el.oSecondPayment.value = state.order.second_payment_date || '';
    el.oFinalPayment.value = state.order.final_payment_date || '';

    /* The scheme decides which payment starts production, so the hint cannot be
       drawn until the select holds the right value. */
    el.oScheme.value = state.order.payment_scheme === 'other' ? 'other' : 'standard';
    buildTerms(state.order);
    syncSchemeCard();

    renderScheduleHint();

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
      first_payment_date: orNull(el.oFirstPayment.value),
      second_payment_date: orNull(el.oSecondPayment.value),
      final_payment_date: orNull(el.oFinalPayment.value)
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
      const res = await rescheduleOrder(state.order, state.customer);
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
        '<div class="costfield-row">' +
          '<span class="prefixed">' +
            '<span class="prefix">Rp</span>' +
            '<input class="input js-cost" type="text" inputmode="numeric" placeholder="0">' +
          '</span>' +
          '<button type="button" class="js-cost-calc calc-trigger" aria-label="Break down cost">' +
            CALC_ICON +
          '</button>' +
        '</div>' +
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

  /* --------------------------- Cost calculator ---------------------------- */

  /* A scratchpad, not a record: nothing here is saved to the order. It exists
     because production cost is one number on the item row, but arriving at it
     usually means adding up fabric, tailor, transport, dry cleaning — numbers
     nobody wants to add in their head or in a notes app. Flat categories only:
     a breakdown of fabric into main fabric/tulle/etc. is just more rows, not
     a nested level. */

  const DEFAULT_COST_CATEGORIES = ['Fabric', 'Tailor', 'Transport', 'Dry Cleaning'];

  function createCalcRow(cat) {
    const row = document.createElement('div');
    row.className = 'calcrow';
    row.innerHTML =
      '<button type="button" class="calcrow__remove js-remove-calcrow" aria-label="Remove category">' +
        CLOSE_ICON +
      '</button>' +
      '<label class="field calcrow__label">' +
        '<span class="field__label">Category</span>' +
        '<input class="input js-clabel" type="text" maxlength="40" placeholder="e.g. Fabric">' +
      '</label>' +
      '<label class="field calcrow__amount">' +
        '<span class="field__label">Amount</span>' +
        '<span class="prefixed">' +
          '<span class="prefix">Rp</span>' +
          '<input class="input js-camount" type="text" inputmode="numeric" placeholder="0">' +
        '</span>' +
      '</label>';

    $('.js-clabel', row).value = (cat && cat.label) || '';
    $('.js-camount', row).value = (cat && cat.amount) ? U.groupDigits(cat.amount) : '';
    return row;
  }

  function addCalcRow(cat, focus) {
    const row = createCalcRow(cat);
    el.calcRowList.appendChild(row);
    refreshCalcRemoveButtons();
    refreshCalcTotal();
    if (focus) $('.js-clabel', row).focus();
    return row;
  }

  const calcRowElements = () => $$('.calcrow', el.calcRowList);

  function refreshCalcRemoveButtons() {
    const rows = calcRowElements();
    rows.forEach((row) => { $('.js-remove-calcrow', row).disabled = rows.length <= 1; });
  }

  function readCalcRows() {
    return calcRowElements().map((row) => ({
      label: $('.js-clabel', row).value.trim(),
      amountRaw: U.digitsOnly($('.js-camount', row).value),
      get amount() { return this.amountRaw === '' ? 0 : Number(this.amountRaw); }
    }));
  }

  function refreshCalcTotal() {
    const total = readCalcRows().reduce((sum, c) => sum + c.amount, 0);
    el.calcTotal.textContent = U.formatRupiah(total);
    return total;
  }

  /* One draft per item row, not per item index — rows have no stable id and
     can be removed, so an index would silently reattach to the wrong item.
     Keyed on the row's own element, a deleted row's draft needs no explicit
     cleanup: nothing can reach that key once the row is gone. showOrderEdit()
     also rebuilds every item row from scratch on entry, which is exactly
     when a draft ought to be forgotten. */
  const costCalcDrafts = new WeakMap();
  let calcTargetRow = null;
  let calcFocusBeforeOpen = null;

  function snapshotCalcDraft() {
    if (!calcTargetRow) return;
    costCalcDrafts.set(calcTargetRow, readCalcRows().map((c) => ({ label: c.label, amount: c.amount })));
  }

  function openCostCalc(itemRow) {
    calcFocusBeforeOpen = document.activeElement;
    calcTargetRow = itemRow;
    const name = $('.js-name', itemRow).value.trim();
    el.calcItemLabel.textContent = name ? 'For "' + name + '"' : 'For this item';

    const draft = costCalcDrafts.get(itemRow);
    const seed = draft || DEFAULT_COST_CATEGORIES.map((label) => ({ label: label, amount: 0 }));
    el.calcRowList.innerHTML = '';
    seed.forEach((cat) => addCalcRow(cat, false));

    el.calcSheet.hidden = false;
    document.body.classList.add('has-app-modal');
    requestAnimationFrame(() => $('.js-clabel', el.calcRowList)?.focus());
  }

  function closeCostCalc() {
    snapshotCalcDraft();
    el.calcSheet.hidden = true;
    document.body.classList.remove('has-app-modal');
    calcTargetRow = null;
    if (calcFocusBeforeOpen && document.contains(calcFocusBeforeOpen)) calcFocusBeforeOpen.focus();
    calcFocusBeforeOpen = null;
  }

  function applyCostCalc() {
    const total = refreshCalcTotal();
    $('.js-cost', calcTargetRow).value = U.groupDigits(total);
    refreshItemTotals();
    setDirty(true);
    showToast('Cost updated');
    closeCostCalc();
  }

  /* ----------------------------- Moodboard -------------------------------- */

  const mb = KK.moodboard;
  let activeMoodboardOrderId = null;
  let moodboardView = null;
  let moodboardFilesBusy = false;
  let moodboardFocusBeforeOpen = null;

  async function showMoodboard(orderId) {
    state.order = await db.getOrder(orderId);
    [state.customer, state.customerOrders] = await Promise.all([
      db.getCustomer(state.order.customer_id),
      db.listOrders(state.order.customer_id)
    ]);

    setChrome({
      title: 'Moodboard',
      up: { label: orderLabel(state.order), hash: '#/order/' + orderId },
      save: false, actions: false
    });
    el.actionbar.hidden = true;
    setSaveBar(false);
    closeMoodboardPresentation();

    if (activeMoodboardOrderId !== orderId || !mb.images.length) {
      mb.init({
        orderId: state.order.id,
        customerId: state.customer.id,
        customerName: state.customer.name,
        docName: state.order.doc_name || state.customer.name,
        orderRef: state.order.title || ''
      });
      activeMoodboardOrderId = orderId;
    }
    $('#mbEditor').hidden = false;
    $('#mbGenerate').hidden = false;
  }

  async function showMoodboardPreview(orderId) {
    if (!mb.images.length || activeMoodboardOrderId !== orderId) {
      go('#/order/' + orderId + '/moodboard');
      return;
    }

    setChrome({
      title: 'Moodboard preview',
      up: { label: 'Images', hash: '#/order/' + orderId + '/moodboard' },
      save: false, actions: false
    });
    el.actionbar.hidden = true;
    setSaveBar(false);
    $('#mbEditor').hidden = true;
    $('#mbGenerate').hidden = true;
    enterMoodboardPresentation();
  }

  function setupMoodboardListeners() {
    const dropzone = $('#mbDropzone');
    const fileInput = $('#mbFileInput');
    const addMore = $('#mbAddMore');
    const randomize = $('#mbRandomize');
    const generate = $('#mbGenerate');
    const download = $('#mbDownload');
    const thumbs = $('#mbThumbs');

    dropzone.addEventListener('click', function (e) {
      if (moodboardFilesBusy) return;
      if (e.target.closest('.mb-thumb__remove') || e.target.closest('.mb-thumb')) return;
      if (!dropzone.classList.contains('has-images')) fileInput.click();
    });

    addMore.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', async function () {
      if (fileInput.files.length) await addMoodboardFiles(fileInput.files);
      fileInput.value = '';
    });

    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('is-over');
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('is-over');
    });
    dropzone.addEventListener('drop', async function (e) {
      e.preventDefault();
      dropzone.classList.remove('is-over');
      if (moodboardFilesBusy) return;
      if (e.dataTransfer.files.length) await addMoodboardFiles(e.dataTransfer.files);
    });

    thumbs.addEventListener('click', function (e) {
      const btn = e.target.closest('.mb-thumb__remove');
      if (!btn) return;
      mb.removeImage(Number(btn.dataset.i));
    });

    randomize.addEventListener('click', function () {
      mb.randomize();
      renderMoodboardPresentation();
    });

    generate.addEventListener('click', openMoodboardPresentation);
    download.addEventListener('click', downloadMoodboard);

    setupMoodboardZoom($('#mbPresentationCanvas'));
  }

  async function addMoodboardFiles(files) {
    if (moodboardFilesBusy) return;

    const loading = $('#mbLoading');
    const loadingText = $('#mbLoadingText');
    const addMore = $('#mbAddMore');
    const generate = $('#mbGenerate');
    const total = Math.min(Array.from(files).length, mb.MAX_IMAGES - mb.images.length);

    moodboardFilesBusy = true;
    loading.hidden = false;
    $('#mbDropzone').classList.add('is-loading');
    $('#mbDropzone').setAttribute('aria-busy', 'true');
    loadingText.textContent = total > 1 ? 'Preparing 1 of ' + total + ' photos…' : 'Preparing photo…';
    addMore.disabled = true;
    generate.disabled = true;

    /* Yield once so the loading state reaches the screen before a large phone
       photo starts decoding or HEIC conversion occupies the main thread. */
    await new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });

    try {
      const result = await mb.addFiles(files, function (completed, count) {
        loadingText.textContent = count > 1
          ? 'Preparing ' + completed + ' of ' + count + ' photos…'
          : 'Preparing photo…';
      });
      if (result.rejected) {
        showToast(result.rejected === 1
          ? 'One image could not be opened and was skipped'
          : result.rejected + ' images could not be opened and were skipped');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not prepare those photos — ' + (err.message || 'please try again'));
    } finally {
      moodboardFilesBusy = false;
      loading.hidden = true;
      $('#mbDropzone').classList.remove('is-loading');
      $('#mbDropzone').removeAttribute('aria-busy');
      addMore.disabled = false;
      generate.disabled = mb.images.length === 0;
    }
  }

  function openMoodboardPresentation() {
    if (!mb.images.length) return;
    go('#/order/' + state.order.id + '/moodboard/preview');
  }

  function enterMoodboardPresentation() {
    moodboardFocusBeforeOpen = document.activeElement;
    el.mbPresentation.hidden = false;
    document.body.classList.add('moodboard-presenting');
    document.body.classList.add('has-app-modal');
    resetMoodboardView();
    requestAnimationFrame(() => { renderMoodboardPresentation(true); el.mbPresentationClose.focus(); });
  }

  function resetMoodboardView() {
    moodboardView = { zoom: 1, x: 0, y: 0, baseScale: 1, clone: null, pointers: new Map() };
  }

  function applyMoodboardTransform() {
    if (!moodboardView || !moodboardView.clone) return;
    const scale = moodboardView.baseScale * moodboardView.zoom;
    moodboardView.clone.style.transform =
      'translate(calc(-50% + ' + moodboardView.x + 'px),calc(-50% + ' + moodboardView.y + 'px)) scale(' + scale + ')';
  }

  function renderMoodboardPresentation(reset) {
    const presentation = $('#mbPresentation');
    const canvas = $('#mbPresentationCanvas');
    const stageEl = mb.stage;
    if (!presentation || presentation.hidden || !canvas || !stageEl) return;

    const rect = canvas.getBoundingClientRect();
    if (!moodboardView || reset) resetMoodboardView();
    moodboardView.baseScale = Math.min(rect.width / 1920, rect.height / 1080);
    const clone = stageEl.cloneNode(true);
    clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    clone.removeAttribute('id');
    clone.style.cssText =
      'position:absolute;left:50%;top:50%;width:1920px;height:1080px;' +
      'transform-origin:50% 50%;pointer-events:none;';
    canvas.replaceChildren(clone);
    moodboardView.clone = clone;
    applyMoodboardTransform();
  }

  function setupMoodboardZoom(canvas) {
    if (!canvas) return;

    const clampZoom = (value) => Math.max(1, Math.min(5, value));
    const point = (e) => ({ x: e.clientX, y: e.clientY });

    canvas.addEventListener('pointerdown', function (e) {
      if (!moodboardView) return;
      canvas.setPointerCapture(e.pointerId);
      moodboardView.pointers.set(e.pointerId, point(e));
      moodboardView.lastDistance = null;
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!moodboardView || !moodboardView.pointers.has(e.pointerId)) return;
      const previous = moodboardView.pointers.get(e.pointerId);
      moodboardView.pointers.set(e.pointerId, point(e));
      const points = Array.from(moodboardView.pointers.values());

      if (points.length >= 2) {
        const dx = points[0].x - points[1].x;
        const dy = points[0].y - points[1].y;
        const distance = Math.hypot(dx, dy);
        if (moodboardView.lastDistance) {
          moodboardView.zoom = clampZoom(moodboardView.zoom * distance / moodboardView.lastDistance);
        }
        moodboardView.lastDistance = distance;
      } else if (moodboardView.zoom > 1) {
        moodboardView.x += e.clientX - previous.x;
        moodboardView.y += e.clientY - previous.y;
      }
      applyMoodboardTransform();
    });

    const endPointer = function (e) {
      if (!moodboardView) return;
      moodboardView.pointers.delete(e.pointerId);
      moodboardView.lastDistance = null;
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    canvas.addEventListener('wheel', function (e) {
      if (!moodboardView) return;
      e.preventDefault();
      moodboardView.zoom = clampZoom(moodboardView.zoom * (e.deltaY < 0 ? 1.12 : 0.89));
      if (moodboardView.zoom === 1) moodboardView.x = moodboardView.y = 0;
      applyMoodboardTransform();
    }, { passive: false });

    canvas.addEventListener('dblclick', function () {
      if (!moodboardView) return;
      moodboardView.zoom = moodboardView.zoom > 1 ? 1 : 2;
      if (moodboardView.zoom === 1) moodboardView.x = moodboardView.y = 0;
      applyMoodboardTransform();
    });
  }

  function closeMoodboardPresentation() {
    const presentation = el.mbPresentation;
    const wasOpen = presentation && !presentation.hidden;
    if (presentation) presentation.hidden = true;
    const canvas = $('#mbPresentationCanvas');
    if (canvas) canvas.replaceChildren();
    document.body.classList.remove('moodboard-presenting');
    document.body.classList.remove('has-app-modal');
    moodboardView = null;
    if (wasOpen && moodboardFocusBeforeOpen && document.contains(moodboardFocusBeforeOpen)) moodboardFocusBeforeOpen.focus();
    moodboardFocusBeforeOpen = null;
  }

  async function downloadMoodboard() {
    const btn = $('#mbDownload');
    let downloaded = false;
    let driveCopied = false;
    btn.disabled = true;
    btn.classList.add('is-busy');
    $('.btn__label', btn).textContent = 'Preparing PDF…';

    try {
      const pdf = await mb.generatePDF();
      const fileName = mb.buildFilename(new Date());

      /* The browser download is the primary action. Drive receives a copy only
         after that action has been triggered, and gets the exact same bytes. */
      pdf.save(fileName);
      downloaded = true;

      $('.btn__label', btn).textContent = 'Saving copy…';
      const pdfBase64 = mb.pdfToBase64(pdf);
      const result = await db.driveSaveMoodboardPdf(fileName, pdfBase64);
      driveCopied = true;

      await db.logMoodboard(state.order.id, result.drive_link);
      await db.logOrderHistory(state.order.id, 'moodboard_generated', {
        drive_link: result.drive_link,
        file_name: result.file_name
      });

      state.customer = await db.updateCustomer(state.customer.id, {
        moodboard_date: U.todayISO()
      });

      const nudge = consultNudgeFor(state.customer, state.customerOrders, U.todayISO());
      if (nudge) {
        await db.updateCustomer(state.customer.id, nudge);
        try { await db.syncFollowUp(state.customer.id); } catch (_) { /* best effort */ }
      }

      mb.cleanup();
      closeMoodboardPresentation();
      showToast('Moodboard downloaded and copied to Google Drive');
      go('#/order/' + state.order.id);
    } catch (err) {
      console.error(err);
      showToast(!downloaded
        ? 'Could not generate the moodboard — ' + (err.message || 'please try again')
        : driveCopied
          ? 'PDF downloaded and copied, but its record could not be finished — ' + (err.message || 'please try again')
          : 'PDF downloaded, but the Drive copy failed — ' + (err.message || 'please try again'));
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-busy');
      $('.btn__label', btn).textContent = 'Download';
    }
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

  /* Each deposit is a date on the order as well as a line in the history, and
     which date depends on where it sits in the terms. The first commissions the
     design, the production one commissions the garment, and the last is asked
     for before delivery — so logging it is what finishes the order.

     Stamped as today because that is when you are standing here; the order edit
     form can correct any of them for the transfer that landed on Friday and got
     logged on Monday. Each is written once — a date already set is the answer
     to when that payment came in, and re-logging cannot improve on it. */
  function paymentPatch(order, i, terms) {
    const patch = {};
    if (i === 0 && !order.first_payment_date) patch.first_payment_date = U.todayISO();
    if (i === productionIndex(order) && !order.second_payment_date) {
      patch.second_payment_date = U.todayISO();
    }
    if (i === terms.length - 1 && !order.final_payment_date) {
      patch.final_payment_date = U.todayISO();
    }
    return patch;
  }

  async function logDeposit(i) {
    const total = docs.computeTotal(state.order.items);
    const terms = docs.termsFor(state.order);
    const amount = docs.termAmounts(total, terms)[i];
    const patch = paymentPatch(state.order, i, terms);

    /* A one-term scheme collapses the whole ladder into a single click: the
       same payment starts the design, starts production and closes the order.
       That is a legitimate way to sell something, but it is not what anyone
       expects a "log payment" button to do, so it is said out loud first. */
    if (patch.first_payment_date && patch.final_payment_date) {
      const ok = window.confirm(
        'This is the only payment term, so logging it starts the schedule and ' +
        'marks the order finished at the same time. Log it?');
      if (!ok) return;
    }

    try {
      await db.logOrderHistory(state.order.id, 'payment_logged', {
        deposit_index: i, deposit_label: docs.termLabel(terms[i]), amount: amount
      });
      el.paymentChooserOptions.hidden = true;
      showToast(terms[i].label + ' logged');

      if (Object.keys(patch).length) {
        state.order = await db.updateOrder(state.order.id, patch);
      }
      /* Only an anchor moving changes the programme. The final payment is money
         and nothing else — rebuilding on it would be work that cannot produce a
         different answer. */
      if (patch.first_payment_date || patch.second_payment_date) {
        await startSchedule();
      }

      /* The rung this deposit earns. Quoted and Confirmed come from downloads;
         these are the two the money says. atLeast keeps it monotonic, so a
         custom scheme whose first payment is also its last lands on Delivered
         and stays there. */
      if (patch.final_payment_date) await bumpStatus('Delivered');
      else if (patch.second_payment_date) await bumpStatus('In production');
      else if (patch.first_payment_date) await bumpStatus('Confirmed');

      await refreshHistory();
      renderOrderStatus();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not log payment');
    }
  }

  /** Build the programme for the first time and say what came of it. */
  async function startSchedule() {
    try {
      const res = await rescheduleOrder(state.order, state.customer);
      const fittings = res.rows.filter((r) => cal.isProductionStage(r.stage)).length;
      if (fittings) {
        await db.logOrderHistory(state.order.id, 'scheduled', {
          count: res.rows.length, dropped: res.computed.dropped
        });
        showToast(fittings + ' fittings scheduled');
      } else if (res.rows.length) {
        /* Design block only, which is the ordinary state of things between the
           two payments. Worth confirming, not worth a warning. */
        await db.logOrderHistory(state.order.id, 'scheduled', {
          count: res.rows.length, dropped: res.computed.dropped
        });
        showToast('Design phase scheduled');
      } else if (res.computed.reason) {
        showToast(res.computed.reason);
      }
      await refreshSchedule();
    } catch (err) {
      console.error(err);
      showToast('Payment logged, but the schedule could not be built');
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

    /* The two date inputs are one field wearing two hats — see the comment on
       the markup. Switching marks the form dirty like any other edit. */
    el.cWeddingPrecision.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented__btn');
      if (!btn || btn.dataset.precision === weddingPrecision()) return;
      setWeddingPrecision(btn.dataset.precision);
      setDirty(true);
    });

    el.cancelCustomer.addEventListener('click', cancelCustomer);
    el.reopenCustomer.addEventListener('click', reopenCustomer);

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
        /* The customer's status follows from this order existing — nothing to
           set. What does need clearing is the consultation chase: the
           conversation it was guarding against has plainly not gone quiet. */
        state.customerOrders = (state.customerOrders || []).concat(order);
        try {
          await setFollowUp(consultNudgeFor(state.customer, state.customerOrders));
        } catch (err) { console.error(err); }
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

    /* -- moodboard -- */

    $('#createMoodboardBtn').addEventListener('click', function () {
      if (state.order) go('#/order/' + state.order.id + '/moodboard');
    });
    el.mbPresentationClose.addEventListener('click', function () {
      if (state.order) go('#/order/' + state.order.id + '/moodboard');
    });
    el.logNewFittingBtn.addEventListener('click', function () {
      if (state.order) go('#/order/' + state.order.id + '/fitting/new');
    });
    el.fittingJournalAdd.addEventListener('click', () => KK.fittings.openCamera());
    KK.fittings.bindOverlays();
    setupMoodboardListeners();

    /* -- calendar -- */

    el.syncCalendarBtn.addEventListener('click', syncCalendar);
    el.gcalConnect.addEventListener('click', connectGoogle);
    el.gcalDisconnect.addEventListener('click', disconnectGoogle);

    el.enquiryAccept.addEventListener('click', acceptEnquiry);
    el.enquiryDismiss.addEventListener('click', dismissEnquiry);
    el.menuCalendar.addEventListener('click', closeMenu);

    /* -- order edit -- */

    $$('.js-ofield').forEach((input) => {
      input.addEventListener('input', () => setDirty(true));
      input.addEventListener('change', () => setDirty(true));
    });

    /* What the anchor dates will produce, said while they are still being
       chosen. A window too short to hold the full programme is worth knowing
       about before saving, not after. The scheme is in here because it decides
       which payment starts production. */
    [el.oFirstPayment, el.oSecondPayment, el.oScheme].forEach((input) => {
      input.addEventListener('input', renderScheduleHint);
      input.addEventListener('change', renderScheduleHint);
    });

    el.addItem.addEventListener('click', () => {
      addItemRow({ name: '', qty: 1, price: '', cost: '' }, true);
      setDirty(true);
    });

    el.itemList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.js-remove');
      if (removeBtn && !removeBtn.disabled) {
        removeBtn.closest('.item').remove();
        refreshRemoveButtons();
        refreshItemTotals();
        setDirty(true);
        return;
      }
      const calcBtn = e.target.closest('.js-cost-calc');
      if (calcBtn) openCostCalc(calcBtn.closest('.item'));
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

    /* -- cost calculator --

       A scratchpad: edits here never call setDirty. The order is only ever
       touched, and only ever marked dirty, at the moment Apply writes the
       total into the item's own cost field. */

    el.calcAddRow.addEventListener('click', () => addCalcRow(null, true));

    el.calcRowList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove-calcrow');
      if (!btn || btn.disabled) return;
      btn.closest('.calcrow').remove();
      refreshCalcRemoveButtons();
      refreshCalcTotal();
    });

    el.calcRowList.addEventListener('input', (e) => {
      if (e.target.classList.contains('js-camount')) U.reformatPriceField(e.target);
      refreshCalcTotal();
    });

    el.calcApply.addEventListener('click', applyCostCalc);
    el.calcBack.addEventListener('click', closeCostCalc);

    el.customInclude.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomInclude();
      }
    });

    /* Keep fixed bars and the zoomable moodboard fitted to the viewport. */
    window.addEventListener('resize', function () {
      syncVisualViewport();
      renderMoodboardPresentation();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncVisualViewport);
      window.visualViewport.addEventListener('scroll', syncVisualViewport);
    }
    window.addEventListener('offline', () => showToast("You're offline — changes won't save until you're back online"));
    window.addEventListener('online', () => showToast("Back online"));
    document.addEventListener('focusin', (e) => keepFocusedControlVisible(e.target));
    document.addEventListener('keydown', (e) => {
      trapModalFocus(e, el.calcSheet);
      trapModalFocus(e, el.mbPresentation);
      if (e.key !== 'Escape') return;
      if (!el.calcSheet.hidden) { e.preventDefault(); closeCostCalc(); }
      else if (!el.mbPresentation.hidden && state.order) { e.preventDefault(); go('#/order/' + state.order.id + '/moodboard'); }
    });

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
