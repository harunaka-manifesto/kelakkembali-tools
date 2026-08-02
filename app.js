/* SPA composition root.
   
   - Owns: Hash routing, page state management, DOM rendering and events, validation, and workflow orchestration across customers, orders, documents, schedules, moodboards, fittings, and intake.
   - Does NOT own: Data persistence queries (delegates to db.js), document watermark layout (delegates to docs.js), or pure schedule policy (delegates to calendar.js).
   - Entry points: window.KK.app
*/
window.KK = window.KK || {};

KK.app = (function () {
  'use strict';

  /* ----------------- Core Dependencies & Helper Aliases ----------------- */

  const U = KK.util;
  const db = KK.db;
  const docs = KK.docs;
  const calendar = KK.calendar;

  const $ = U.$;
  const $$ = U.$$;

  /* --------------------------- Domain Constants -------------------------- */

  const INCLUDES_PRESETS = [
    "Custom design & consultation",
    "Production",
    "Standard fabric",
    "Plain veil",
    "Fitting",
    "Laundry"
  ];

  const ORDER_STATUSES = ["Quoted", "Confirmed", "In production", "Delivered"];
  const CUSTOMER_SOURCES = ["Instagram", "TikTok", "Referral", "Walk-in", "Other"];

  const CHECK_IN_CONFIG = { label: "Check in", days: 3 };
  const FOLLOW_UP_CONFIG = { label: "Follow up moodboard", days: 3 };

  /* ------------------------------- SVG Icons ------------------------------ */

  const SVG_TRASH = U.ICONS.trash;
  const SVG_CLOSE = U.ICONS.close;
  const SVG_CHECK = U.ICONS.check;

  /* ----------------------- Element Registry ------------------------ */

  const elements = {
    boot: $("#boot"),
    gate: $("#gate"),
    gateForm: $("#gateForm"),
    gatePassword: $("#gatePassword"),
    gateRemember: $("#gateRemember"),
    gateErr: $("#gateErr"),
    gateSubmit: $("#gateSubmit"),
    app: $("#app"),
    upLink: $("#upLink"),
    upLabel: $("#upLabel"),
    appbarBrand: $("#appbarBrand"),
    homeLink: $("#homeLink"),
    routeLoader: $("#routeLoader"),
    routeLoaderError: $("#routeLoaderError"),
    routeLoaderStatus: $("#routeLoaderStatus"),
    viewTitle: $("#viewTitle"),
    viewSub: $("#viewSub"),
    pageAction: $("#pageAction"),
    savebar: $("#savebar"),
    saveBtn: $("#saveBtn"),
    menu: $("#menu"),
    menuBtn: $("#menuBtn"),
    menuList: $("#menuList"),
    menuDelete: $("#menuDelete"),
    menuCalendar: $("#menuCalendar"),
    menuSignOut: $("#menuSignOut"),
    viewCustomers: $("#viewCustomers"),
    homeStage: $("#homeStage"),
    homeLoading: $("#homeLoading"),
    homeError: $("#homeError"),
    homeReady: $("#homeReady"),
    homeHero: $("#homeHero"),
    homeActions: $("#homeActions"),
    homeNav: $("#homeNav"),
    homeNavHome: $("#homeNavHome"),
    homeNavMenu: $("#homeNavMenu"),
    homeNavMenuWrapper: $("#homeNavMenuWrapper"),
    homeCustomers: $("#homeCustomers"),
    homeFooter: $("#homeFooter"),
    homeSummary: $("#homeSummary"),
    heroGreeting: $("#heroGreeting"),
    heroDeadline: $("#heroDeadline"),
    customerSearch: $("#customerSearch"),
    customerList: $("#customerList"),
    viewCustomer: $("#viewCustomer"),
    custBackBtn: $("#custBackBtn"),
    custEditBtn: $("#custEditBtn"),
    custHeroName: $("#custHeroName"),
    custWeddingText: $("#custWeddingText"),
    custNextLabel: $("#custNextLabel"),
    custNextDate: $("#custNextDate"),
    custOrdersCount: $("#custOrdersCount"),
    custOrdersSum: $("#custOrdersSum"),
    custOrderList: $("#custOrderList"),
    custFittingBanner: $("#custFittingBanner"),
    viewFittingLogs: $("#viewFittingLogs"),
    fitlogBackBtn: $("#fitlogBackBtn"),
    fitlogBackLabel: $("#fitlogBackLabel"),
    fitlogNewBtn: $("#fitlogNewBtn"),
    fitlogTitle: $("#fitlogTitle"),
    fitlogSearchSection: $("#fitlogSearchSection"),
    fitlogSearch: $("#fitlogSearch"),
    fitlogSearchClear: $("#fitlogSearchClear"),
    fitlogStages: $("#fitlogStages"),
    fitlogFeed: $("#fitlogFeed"),
    fitlogList: $("#fitlogList"),
    fitlogState: $("#fitlogState"),
    fitlogSentinel: $("#fitlogSentinel"),
    fitlogStatus: $("#fitlogStatus"),
    viewFittingDetail: $("#viewFittingDetail"),
    fitdetBackBtn: $("#fitdetBackBtn"),
    fitdetPdfBtn: $("#fitdetPdfBtn"),
    fitdetTitle: $("#fitdetTitle"),
    fitdetStage: $("#fitdetStage"),
    fitdetCustomer: $("#fitdetCustomer"),
    fitdetDate: $("#fitdetDate"),
    fitdetBody: $("#fitdetBody"),
    fitdetList: $("#fitdetList"),
    fitdetState: $("#fitdetState"),
    fitdetStatus: $("#fitdetStatus"),
    fitdetBar: $("#fitdetBar"),
    fitdetEndBtn: $("#fitdetEndBtn"),
    fitdetAddBtn: $("#fitdetAddBtn"),
    fitdetDeleteBtn: $("#fitdetDeleteBtn"),
    fitdetPhotoInput: $("#fitdetPhotoInput"),
    viewFittingPhotoAdd: $("#viewFittingPhotoAdd"),
    fitaddBackBtn: $("#fitaddBackBtn"),
    fitaddBackLabel: $("#fitaddBackLabel"),
    fitaddTitle: $("#fitaddTitle"),
    fitaddBody: $("#fitaddBody"),
    fitaddList: $("#fitaddList"),
    fitaddState: $("#fitaddState"),
    fitaddStatus: $("#fitaddStatus"),
    fitaddFileInput: $("#fitaddFileInput"),
    fitaddBar: $("#fitaddBar"),
    fitaddPickBtn: $("#fitaddPickBtn"),
    fitaddSaveBtn: $("#fitaddSaveBtn"),
    fitaddSaveFace: $("#fitaddSaveFace"),
    fitaddUndo: $("#fitaddUndo"),
    fitaddUndoCopy: $("#fitaddUndoCopy"),
    fitaddUndoBtn: $("#fitaddUndoBtn"),
    viewFittingPhotoEdit: $("#viewFittingPhotoEdit"),
    fiteditBackBtn: $("#fiteditBackBtn"),
    fiteditTitle: $("#fiteditTitle"),
    fiteditPreview: $("#fiteditPreview"),
    fiteditReplaceBtn: $("#fiteditReplaceBtn"),
    fiteditCaption: $("#fiteditCaption"),
    fiteditDeleteBtn: $("#fiteditDeleteBtn"),
    fiteditFileInput: $("#fiteditFileInput"),
    fiteditStatus: $("#fiteditStatus"),
    fiteditBar: $("#fiteditBar"),
    fiteditSaveBtn: $("#fiteditSaveBtn"),
    fittingPhotoViewer: $("#fittingPhotoViewer"),
    fittingPhotoViewerImage: $("#fittingPhotoViewerImage"),
    fittingPhotoViewerCaption: $("#fittingPhotoViewerCaption"),
    fittingPhotoViewerClose: $("#fittingPhotoViewerClose"),
    viewCustomerEdit: $("#viewCustomerEdit"),
    custEditCancel: $("#custEditCancel"),
    custEditTitle: $("#custEditTitle"),
    cancelCustomer: $("#cancelCustomer"),
    reopenCustomer: $("#reopenCustomer"),
    deleteCustomer: $("#deleteCustomer"),
    deleteCustomerRow: $("#deleteCustomerRow"),
    cName: $("#cName"),
    errCName: $("#errCName"),
    cPhone: $("#cPhone"),
    cInstagram: $("#cInstagram"),
    cSource: $("#cSource"),
    cWedding: $("#cWedding"),
    cWeddingMonth: $("#cWeddingMonth"),
    cWeddingPrecision: $("#cWeddingPrecision"),
    cMoodboardDate: $("#cMoodboardDate"),
    cFollowUpDate: $("#cFollowUpDate"),
    cFollowUpLabel: $("#cFollowUpLabel"),
    cCancelledReason: $("#cCancelledReason"),
    cCancelledField: $("#cCancelledField"),
    cNotes: $("#cNotes"),
    viewOrder: $("#viewOrder"),
    orderStage: $("#orderStage"),
    orderLoading: $("#orderLoading"),
    orderLoadingStatus: $("#orderLoadingStatus"),
    orderError: $("#orderError"),
    orderReady: $("#orderReady"),
    orderBackBtn: $("#orderBackBtn"),
    orderBackLabel: $("#orderBackLabel"),
    orderHistoryBtn: $("#orderHistoryBtn"),
    orderEditBtn: $("#orderEditBtn"),
    orderTitle: $("#orderTitle"),
    oItemsDisplay: $("#oItemsDisplay"),
    paymentSummary: $("#paymentSummary"),
    paymentError: $("#paymentError"),
    logPaymentBtn: $("#logPaymentBtn"),
    paymentChooser: $("#paymentChooser"),
    paymentChooserOptions: $("#paymentChooserOptions"),
    scheduleList: $("#scheduleList"),
    createMoodboardBtn: $("#createMoodboardBtn"),
    logNewFittingBtn: $("#logNewFittingBtn"),
    viewCalendar: $("#viewCalendar"),
    gcalState: $("#gcalState"),
    gcalConnect: $("#gcalConnect"),
    gcalDisconnect: $("#gcalDisconnect"),
    gcalErr: $("#gcalErr"),
    enquiriesCard: $("#enquiriesCard"),
    enquiriesCount: $("#enquiriesCount"),
    viewEnquiry: $("#viewEnquiry"),
    enquiryWhen: $("#enquiryWhen"),
    enquiryAnswers: $("#enquiryAnswers"),
    enquiryNote: $("#enquiryNote"),
    enquiryAccept: $("#enquiryAccept"),
    enquiryDismiss: $("#enquiryDismiss"),
    viewMoodboard: $("#viewMoodboard"),
    viewFittingJournal: $("#viewFittingJournal"),
    mbBackBtn: $("#mbBackBtn"),
    mbBackLabel: $("#mbBackLabel"),
    mbTitle: $("#mbTitle"),
    fittingJournal: $("#fittingJournal"),
    fittingJournalBar: $("#fittingJournalBar"),
    fittingJournalAdd: $("#fittingJournalAdd"),
    viewOrderEdit: $("#viewOrderEdit"),
    oTitle: $("#oTitle"),
    oDocName: $("#oDocName"),
    oFirstPayment: $("#oFirstPayment"),
    oSecondPayment: $("#oSecondPayment"),
    oFinalPayment: $("#oFinalPayment"),
    oScheduleHint: $("#oScheduleHint"),
    oScheme: $("#oScheme"),
    termsCard: $("#termsCard"),
    termList: $("#termList"),
    addTerm: $("#addTerm"),
    termsSum: $("#termsSum"),
    errTerms: $("#errTerms"),
    itemList: $("#itemList"),
    itemsTotal: $("#itemsTotal"),
    addItem: $("#addItem"),
    includesList: $("#includesList"),
    customInclude: $("#customInclude"),
    addInclude: $("#addInclude"),
    downloadNote: $("#downloadNote"),
    downloadQuote: $("#downloadQuote"),
    downloadInvoice: $("#downloadInvoice"),
    toast: $("#toast"),
    calcSheet: $("#calcSheet"),
    calcItemLabel: $("#calcItemLabel"),
    calcRowList: $("#calcRowList"),
    calcAddRow: $("#calcAddRow"),
    calcTotal: $("#calcTotal"),
    calcApply: $("#calcApply"),
    calcBack: $("#calcBack"),
    mbEditor: $("#mbEditor"),
    mbCanvas: $("#mbCanvas"),
    mbCanvasBack: $("#mbCanvasBack"),
    mbRotate: $("#mbRotate"),
    mbBoard: $("#mbBoard"),
    mbBoardScaler: $("#mbBoardScaler"),
    mbRandomize: $("#mbRandomize"),
    mbUpload: $("#mbUpload"),
    mbDownload: $("#mbDownload"),
    mbExportStatus: $("#mbExportStatus"),
    mbOverlay: $("#mbOverlay"),
    mbOverlayCanvas: $("#mbOverlayCanvas"),
    mbOverlayClose: $("#mbOverlayClose")
  };

  const docButtons = {
    quotation: elements.downloadQuote,
    invoice: elements.downloadInvoice
  };

  /* ----------------------- Application State ----------------------- */

  const state = {
    route: null, // { view, id, query }
    customers: [], // whole list, filtered client-side
    customer: null, // record backing the customer view
    order: null, // record backing the order views
    overview: null, // { ordersByCustomer, eventsByCustomer }
    loggedDeposits: {}, // { depositIndex: loggedAt }
    schedule: null, // computed programme + stored rows for open order
    customerOrders: [], // open customer's orders
    enquiry: null, // intake submission being reviewed
    googleConnected: null, // null until checked
    dirty: false,
    saving: false,
    navigation: { token: 0 },
    homepage: { phase: "idle", visit: 0, loadToken: 0, popPlayedForVisit: 0 },
    /* The fitting-log feed keeps its own island of state: it is a different
       query with a different lifetime from state.customerOrders or the fitting
       journal, and mixing them would let one page's stale rows render on the
       other. */
    fittingLogs: {
      phase: "idle", // idle | initial-loading | ready | initial-error
      items: [],
      query: "",
      selectedStages: [],
      customerSeed: null, // { id, originalQuery } until the user edits the field
      nextCursor: null,
      hasMore: true,
      loadingMore: false,
      loadMoreError: null,
      requestToken: 0,
      renderedToken: 0,
      observer: null,
      searchTimer: null,
      alignPending: false,
      errorAnnounced: false,
      lastStatus: "",
      /* Set when a card is tapped and consumed by the next visit to the feed
         route, which is what makes Back land on the same list and offset. Any
         exit from the fitting-log route family clears it, and a reload never
         sees it at all. */
      retainHash: "",
      retainScroll: 0
    },
    /* One fitting_sessions record and everything its page needs. Kept apart
       from the journal's own session state so a stale journal render can never
       paint into this page. */
    fittingDetail: {
      phase: "idle", // idle | loading | ready
      loadToken: 0,
      sessionId: null,
      session: null,
      order: null,
      customer: null,
      photos: [],
      bridge: null, // shared object handed to KK.fittings for Add photo
      pdfBusy: false,
      sharingId: null,
      blobCache: new Map(), // photoId -> { blob, url } for this page lifetime
      viewerReturn: null,
      source: "feed"
    },
    fittingEditor: {
      phase: "idle",
      loadToken: 0,
      sessionId: null,
      photoId: null,
      photo: null,
      session: null,
      order: null,
      customer: null,
      staged: null, // { blob, url } prepared replacement, not yet uploaded
      uploaded: null, // { drive_file_id, drive_link } kept for a retry
      saving: false,
      source: "feed"
    },
    /* The Add fitting photos review page. Nothing here is written until Save
       changes: captions, deletions and selected files are all local proposals,
       which is why the persisted records and the local edits are kept apart
       rather than merged into one mutable list. */
    fittingPhotoAdd: {
      phase: "idle", // idle | loading | ready | error | saving
      loadToken: 0,
      sessionId: null,
      session: null,
      order: null,
      customer: null,
      source: "feed",
      existing: [], // persisted rows, deterministic order
      captionPatches: new Map(), // photoId -> locally saved caption
      deleted: new Map(), // photoId -> { photo, originalIndex }
      newPhotos: [], // local drafts, see makeDraft
      openEditors: new Set(), // card keys with an editor on screen
      /* Draft text is kept apart from the locally saved caption so card Cancel
         can restore the previous value and Save changes can tell an untouched
         open editor from an edited one. */
      editorDrafts: new Map(), // card key -> current textarea text
      keySeq: 0,
      seeded: false, // drafts staged by the detail picker before navigation
      preparing: false,
      preparingDone: 0,
      preparingTotal: 0,
      failedPreparationCount: 0,
      admitting: false,
      saving: false,
      undoPhotoId: null,
      undoTimer: null,
      loadError: null,
      lastStatus: ""
    },
    orderDetail: {
      phase: "idle", // idle | loading | ready | error
      loadToken: 0,
      orderId: null,
      vm: null,
      sectionErrors: {},
      paymentBusy: false,
      documentBusy: null
    }
  };

  let toastTimer = null;
  let pageActionHandler = null;

  /* --------------------- UI Utilities & Chrome ---------------------- */

  function showToast(msg) {
    elements.toast.textContent = msg;
    elements.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  function setDirty(isDirty) {
    state.dirty = isDirty;
    elements.saveBtn.disabled = !isDirty || state.saving;
    $(".btn__label", elements.saveBtn).textContent = state.saving ? "Saving…" : isDirty ? "Save changes" : "Saved";
  }

  function syncBottomBar() {
    // Whichever fixed bar is actually showing publishes its height, so content,
    // toasts, and focus targets clear exactly one of them.
    const activeBar = [
      elements.savebar,
      elements.fittingJournalBar,
      elements.fitdetBar,
      elements.fiteditBar,
      elements.fitaddBar
    ].filter((bar) => bar && !bar.hidden)[0] || null;
    document.documentElement.style.setProperty(
      "--bottombar-h",
      activeBar ? Math.round(activeBar.getBoundingClientRect().height) + "px" : "0px"
    );
  }

  function syncVisualViewport() {
    const vp = window.visualViewport;
    const offset = vp ? Math.max(0, window.innerHeight - vp.height - vp.offsetTop) : 0;
    document.documentElement.style.setProperty("--keyboard-offset", Math.round(offset) + "px");
    syncBottomBar();
  }

  function trapModalFocus(event, modalEl) {
    if (event.key !== "Tab" || !modalEl || modalEl.hidden) return;
    const focusables = Array.from(
      modalEl.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hidden && el.getClientRects().length);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setSaveBar(show) {
    elements.savebar.hidden = !show;
    document.body.classList.toggle("has-savebar", !!show);
    syncBottomBar();
  }

  function setPageAction(actionConfig) {
    pageActionHandler = actionConfig ? actionConfig.onClick : null;
    elements.pageAction.hidden = !actionConfig;
    if (actionConfig) {
      elements.pageAction.textContent = actionConfig.label;
    }
  }

  function setChrome(cfg) {
    elements.viewTitle.textContent = cfg.title;
    document.body.classList.toggle("is-homepage", !!cfg.homepage);
    document.body.classList.toggle("is-custpage", !!cfg.custpage);
    document.body.classList.toggle("is-custeditpage", !!cfg.custedit);
    document.body.classList.toggle("is-orderpage", !!cfg.orderpage);
    document.body.classList.toggle("is-moodboardpage", !!cfg.moodboardpage);
    document.body.classList.toggle("is-fittinglogspage", !!cfg.fittinglogspage);
    document.body.classList.toggle("is-fitdetailpage", !!cfg.fitdetailpage);

    elements.viewSub.innerHTML = cfg.sub || "";
    elements.viewSub.hidden = !cfg.sub;

    const up = cfg.up || null;
    elements.upLink.hidden = !up;
    elements.appbarBrand.hidden = !!up;
    if (up) {
      elements.upLink.href = up.hash;
      elements.upLabel.textContent = up.label;
    }

    elements.homeLink.hidden = !up || "#/customers" === up.hash;
    setPageAction(cfg.action || null);
    setSaveBar(!!cfg.save);
    closeMenu();

    elements.menuDelete.hidden = !cfg.destroy;
    elements.menuDelete.className = "menu__item menu__item--danger";
    if (cfg.destroy) {
      elements.menuDelete.textContent = "order" === cfg.destroy ? "Delete order" : "Delete customer";
      elements.menuDelete.dataset.kind = cfg.destroy;
    }
    syncBottomBar();
  }

  function closeMenu() {
    elements.menuList.hidden = true;
    elements.menuBtn.setAttribute("aria-expanded", "false");
    if (elements.homeNavMenu) {
      elements.homeNavMenu.setAttribute("aria-expanded", "false");
    }
  }

  /* ------------------- Routing & View Transition ------------------ */

  const CURTAIN_TRANSITION_MS = 520;
  let curtainCovered = !elements.boot.hidden;
  let curtainCoverPromise = null;
  let routeLoaderShownAt = 0;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function coverCurtain() {
    if (curtainCovered) return;
    if (curtainCoverPromise) return curtainCoverPromise;
    curtainCoverPromise = (async () => {
      document.body.classList.add("is-page-transitioning");
      elements.boot.hidden = false;
      elements.boot.classList.remove("is-animating");
      elements.boot.classList.add("is-below");
      elements.boot.offsetHeight;
      if (!reducedMotion()) {
        elements.boot.classList.add("is-animating");
        elements.boot.classList.remove("is-below");
        await wait(CURTAIN_TRANSITION_MS);
      } else {
        elements.boot.classList.remove("is-below");
      }
      curtainCovered = true;
    })();
    await curtainCoverPromise;
    curtainCoverPromise = null;
  }

  async function revealCurtain() {
    if (!curtainCovered) return;
    if (!reducedMotion()) {
      elements.boot.classList.add("is-animating", "is-below");
      await wait(CURTAIN_TRANSITION_MS);
    }
    elements.boot.hidden = true;
    elements.boot.classList.remove("is-animating", "is-below");
    curtainCovered = false;
    document.body.classList.remove("is-page-transitioning");
  }

  /* The add-photos page draws its own card skeletons inside the real ledger
     inset and reports its own load failure, so the generic route loader would
     only be a second, differently-shaped wait on top of it. */
  const routeHasOwnLoader = (r) =>
    "customers" === r.view || "order" === r.view || "fittingLogs" === r.view || "fittingPhotoAdd" === r.view;
  const routeLoaderKind = (r) =>
    "fittingLogDetail" === r.view
      ? "fitdet"
      : "customer" === r.view || "customerEdit" === r.view || "fittingPhotoEdit" === r.view
      ? "ledger"
      : "moodboard" === r.view || "moodboardPreview" === r.view
      ? "moodboard"
      : "form";

  function beginRouteLoader(r) {
    if (routeHasOwnLoader(r)) return hideRouteLoader(true);
    routeLoaderShownAt = Date.now();
    elements.routeLoader.dataset.kind = routeLoaderKind(r);
    elements.routeLoader.setAttribute("aria-busy", "true");
    elements.routeLoader.classList.remove("is-leaving");
    $(".route-loader__canvas", elements.routeLoader).hidden = false;
    elements.routeLoaderError.hidden = true;

    const labelMap = {
      customer: "customer",
      customerEdit: "customer editor",
      orderEdit: "order editor",
      moodboard: "moodboard",
      fittingNew: "fitting journal",
      fittingJournal: "fitting journal",
      fittingLogDetail: "fitting log",
      fittingPhotoEdit: "photo editor",
      calendar: "calendar settings",
      enquiry: "enquiry"
    };

    elements.routeLoaderStatus.textContent = "Loading " + (labelMap[r.view] || "page") + ".";
    elements.routeLoader.hidden = false;
  }

  async function hideRouteLoader(force) {
    if (elements.routeLoader.hidden) return;
    if (force || curtainCovered) {
      elements.routeLoader.hidden = true;
      elements.routeLoader.setAttribute("aria-busy", "false");
      elements.routeLoader.classList.remove("is-leaving");
      elements.routeLoaderStatus.textContent = "";
      return;
    }
    await wait(Math.max(0, 180 - (Date.now() - routeLoaderShownAt)));
    elements.routeLoader.classList.add("is-leaving");
    await wait(reducedMotion() ? 0 : 180);
    elements.routeLoader.hidden = true;
    elements.routeLoader.setAttribute("aria-busy", "false");
    elements.routeLoader.classList.remove("is-leaving");
    elements.routeLoaderStatus.textContent = "";
  }

  function showRouteError(err, r) {
    console.error(err);
    elements.routeLoader.dataset.kind = routeLoaderKind(r);
    elements.routeLoader.hidden = false;
    elements.routeLoader.classList.remove("is-leaving");
    $(".route-loader__canvas", elements.routeLoader).hidden = true;
    elements.routeLoaderError.hidden = false;
    elements.routeLoader.setAttribute("aria-busy", "false");
    elements.routeLoaderStatus.textContent = "";

    elements.routeLoaderError.innerHTML =
      '<h2 class="route-loader__error-title">Could not open this page.</h2>' +
      '<p class="route-loader__error-copy">' + U.escapeHtml((err && err.message) || "Check your connection and try again.") + '</p>' +
      '<div class="route-loader__error-actions">' +
      '<button type="button" class="btn btn--primary js-route-retry">Try again</button>' +
      '<a class="btn btn--outline" href="#/customers">Customers</a>' +
      '</div>';

    const retryBtn = $(".js-route-retry", elements.routeLoaderError);
    retryBtn.addEventListener("click", () => handleRoute(true), { once: true });
    requestAnimationFrame(() => retryBtn.focus({ preventScroll: true }));
  }

  function focusRoute(r) {
    const focusTarget =
      "customers" === r.view
        ? elements.heroGreeting
        : "customer" === r.view
        ? elements.custHeroName
        : "customerEdit" === r.view
        ? elements.custEditTitle
        : "order" === r.view
        ? elements.orderTitle
        : "moodboard" === r.view
        ? elements.mbTitle
        : "moodboardPreview" === r.view
        ? elements.mbCanvasBack
        : "fittingLogs" === r.view
        ? elements.fitlogTitle
        : "fittingLogDetail" === r.view
        ? elements.fitdetTitle
        : "fittingPhotoEdit" === r.view
        ? elements.fiteditTitle
        : "fittingPhotoAdd" === r.view
        ? elements.fitaddTitle
        : elements.viewTitle;

    if (focusTarget) {
      focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
      focusTarget.addEventListener("blur", () => focusTarget.removeAttribute("tabindex"), { once: true });
    }
  }

  /* ----------------- Status Helpers & Data Transformations ----------------- */

  const badgeClass = (statusStr) => "badge badge--" + String(statusStr).toLowerCase().replace(/\s+/g, "-");

  function effectiveStatus(orderRecord) {
    const statusVal = ORDER_STATUSES.includes(orderRecord.status) ? orderRecord.status : ORDER_STATUSES[0];
    return orderRecord.final_payment_date ? "Delivered" : statusVal;
  }

  async function bumpStatus(newStatus) {
    const prevIdx = ORDER_STATUSES.indexOf(state.order.status);
    const nextIdx = ORDER_STATUSES.indexOf(newStatus);
    const targetStatus = nextIdx > prevIdx ? newStatus : prevIdx === -1 ? ORDER_STATUSES[0] : state.order.status;

    if (targetStatus !== state.order.status) {
      try {
        state.order = await db.updateOrder(state.order.id, { status: targetStatus });
        renderOrderStatus();
      } catch (err) {
        console.error(err);
      }
    }
  }

  function renderOrderStatus() {
    const statusVal = effectiveStatus(state.order);
    elements.viewSub.innerHTML = '<span class="' + badgeClass(statusVal) + '">' + U.escapeHtml(statusVal) + '</span>';
    elements.viewSub.hidden = false;
  }

  function customerStatus(customerRecord, ordersList) {
    if (!customerRecord) return "In consultation";
    if (customerRecord.cancelled_at) return "Cancelled";
    const orders = ordersList || [];
    if (orders.length && orders.every((o) => o.final_payment_date)) return "Completed";
    if (orders.some(orderIsPaid)) return "Active";
    if (orders.length) return "Ordering";
    return "In consultation";
  }

  const orderIsPaid = (o) => !!o.first_payment_date || ORDER_STATUSES.indexOf(o.status) >= ORDER_STATUSES.indexOf("In production");
  const designAnchor = (o) => (o && o.first_payment_date) || null;
  const productionAnchor = (o) => (o ? ("other" === o.payment_scheme ? o.first_payment_date : o.second_payment_date) : null) || null;
  const openCustomerOrders = () => state.customerOrders || [];
  const dateOnly = (dateStr) => String(dateStr || "").slice(0, 10);

  function followUpPatch(cfg, anchorDateIso) {
    if (!cfg || !anchorDateIso) {
      return {
        follow_up_date: null,
        follow_up_label: null,
        follow_up_synced_at: null
      };
    }
    return {
      follow_up_date: calendar.fromDay(calendar.toDay(anchorDateIso) + cfg.days),
      follow_up_label: cfg.label,
      follow_up_synced_at: null
    };
  }

  function consultNudgeFor(customerRecord, ordersList, moodboardDateOverride) {
    if (!customerRecord || customerRecord.cancelled_at || (ordersList || []).length) {
      return followUpPatch(null, null);
    }
    const mbDate = void 0 === moodboardDateOverride ? customerRecord.moodboard_date : moodboardDateOverride;
    return mbDate
      ? followUpPatch(FOLLOW_UP_CONFIG, dateOnly(mbDate))
      : followUpPatch(CHECK_IN_CONFIG, dateOnly(customerRecord.created_at));
  }

  async function setFollowUp(patchObj) {
    const cust = state.customer;
    if (cust && cust.id) {
      if (patchObj.follow_up_date !== cust.follow_up_date || patchObj.follow_up_label !== cust.follow_up_label) {
        state.customer = await db.updateCustomer(cust.id, patchObj);
        await pushFollowUp();
      }
    }
  }

  async function pushFollowUp() {
    const cust = state.customer;
    if (cust && cust.id && (cust.follow_up_date || cust.follow_up_google_event_id)) {
      try {
        await db.syncFollowUp(cust.id);
        state.customer = await db.getCustomer(cust.id);
      } catch (err) {
        console.error("Follow-up not synced to Google Calendar:", err);
      }
    }
  }

  const canCancel = (cust, orders) => !(!cust || !cust.id || cust.cancelled_at || (orders || []).some((o) => o.first_payment_date));

  async function cancelCustomer() {
    const cust = state.customer;
    if (canCancel(cust, openCustomerOrders()) && window.confirm("Mark " + cust.name + " as not proceeding?\n\nEverything is kept — they just stop appearing as live work.")) {
      try {
        state.customer = await db.updateCustomer(cust.id, {
          cancelled_at: new Date().toISOString(),
          follow_up_date: null,
          follow_up_label: null,
          follow_up_synced_at: null
        });
        await pushFollowUp();
        renderCustomerReadOnly(state.customer);
        showToast("Marked as not proceeding");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not update the customer");
      }
    }
  }

  async function deleteCustomerRecord() {
    const cust = state.customer;
    if (!cust || !cust.id) return;
    const nameStr = cust.name || "this customer";
    if (window.confirm("Delete " + nameStr + ", along with every order and download record? This cannot be undone.")) {
      try {
        await db.deleteCustomer(cust.id);
        setDirty(false);
        showToast("Customer deleted");
        go("#/customers");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not delete");
      }
    }
  }

  async function reopenCustomer() {
    const cust = state.customer;
    if (cust && cust.id && cust.cancelled_at) {
      try {
        state.customer = await db.updateCustomer(
          cust.id,
          Object.assign(
            { cancelled_at: null, cancelled_reason: null },
            consultNudgeFor(Object.assign({}, cust, { cancelled_at: null }), openCustomerOrders())
          )
        );
        await pushFollowUp();
        renderCustomerReadOnly(state.customer);
        showToast("Reopened");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not reopen the customer");
      }
    }
  }

  function go(hash) {
    if (location.hash === hash) handleRoute();
    else location.hash = hash;
  }

  function leaveFormFor(hash) {
    if (lastVisitedHash !== hash) {
      if (location.hash !== hash) {
        history.replaceState(null, "", location.pathname + location.search + hash);
        currentHash = hash;
        handleRoute();
      } else {
        handleRoute();
      }
    } else {
      history.back();
    }
  }

  function confirmLeave() {
    return !state.dirty || window.confirm("You have unsaved changes. Leave without saving?");
  }

  let currentHash = "";
  let lastVisitedHash = "";

  async function handleRoute(skipAnimationFlag) {
    const skipMotion = skipAnimationFlag === true;
    const targetRoute = (function () {
      const hashStr = String(location.hash || "").replace(/^#\/?/, "");
      const qIdx = hashStr.indexOf("?");
      const segments = (-1 === qIdx ? hashStr : hashStr.slice(0, qIdx)).split("/").filter(Boolean);
      const query = new URLSearchParams(-1 === qIdx ? "" : hashStr.slice(qIdx + 1));

      if ("customer" === segments[0] && segments[1] && "edit" === segments[2]) {
        return { view: "customerEdit", id: segments[1], query };
      }
      if ("customer" === segments[0] && segments[1]) {
        return { view: "customer", id: segments[1], query };
      }
      if ("order" === segments[0] && segments[1] && "edit" === segments[2]) {
        return { view: "orderEdit", id: segments[1], query };
      }
      if ("order" === segments[0] && segments[1] && "moodboard" === segments[2] && "preview" === segments[3]) {
        return { view: "moodboardPreview", id: segments[1], query };
      }
      if ("order" === segments[0] && segments[1] && "moodboard" === segments[2]) {
        return { view: "moodboard", id: segments[1], query };
      }
      if ("order" === segments[0] && segments[1] && "fitting" === segments[2] && "new" === segments[3]) {
        return { view: "fittingNew", id: segments[1], query };
      }
      if ("order" === segments[0] && segments[1] && "fitting" === segments[2] && segments[3]) {
        return { view: "fittingJournal", id: segments[1], sessionId: segments[3], query };
      }
      if (("order" === segments[0] && segments[1] && "fittings" === segments[2]) || ("order" === segments[0] && segments[1])) {
        return { view: "order", id: segments[1], query };
      }
      // Both fitting-log detail routes are matched before the general feed, and
      // each carries only ids: they fetch and validate their own records so a
      // pasted URL behaves exactly like a tapped card.
      if ("fittings" === segments[0] && segments[1] && "photo" === segments[2] && segments[3] && "edit" === segments[4]) {
        return { view: "fittingPhotoEdit", sessionId: segments[1], photoId: segments[3], query };
      }
      if ("fittings" === segments[0] && segments[1] && "photos" === segments[2] && "add" === segments[3]) {
        return { view: "fittingPhotoAdd", sessionId: segments[1], query };
      }
      if ("fittings" === segments[0] && segments[1]) {
        return { view: "fittingLogDetail", sessionId: segments[1], query };
      }
      if ("fittings" === segments[0]) {
        return { view: "fittingLogs", query };
      }
      if ("calendar" === segments[0]) {
        return { view: "calendar", query };
      }
      if ("enquiry" === segments[0] && segments[1]) {
        return { view: "enquiry", id: segments[1], query };
      }
      return { view: "customers", query };
    })();

    const prevRoute = state.route;

    if (state.dirty && currentHash !== location.hash) {
      if (!confirmLeave()) {
        location.hash = currentHash;
        return;
      }
      setDirty(false);
    }

    if (location.hash !== currentHash) {
      lastVisitedHash = currentHash;
    }
    currentHash = location.hash;

    const routeToken = ++state.navigation.token;
    if (!skipMotion) await coverCurtain();
    if (routeToken !== state.navigation.token) return;

    const wasMoodboard = prevRoute && ("moodboard" === prevRoute.view || "moodboardPreview" === prevRoute.view);
    const isMoodboard = "moodboard" === targetRoute.view || "moodboardPreview" === targetRoute.view;

    if (prevRoute && "moodboardPreview" === prevRoute.view && "moodboardPreview" !== targetRoute.view) {
      closeMoodboardOverlay();
    }
    if (wasMoodboard && !isMoodboard) {
      KK.moodboard.cleanup();
      activeMoodboardOrderId = null;
    }

    state.route = targetRoute;
    elements.viewCustomers.hidden = "customers" !== targetRoute.view;
    elements.viewCustomer.hidden = "customer" !== targetRoute.view;
    elements.viewCustomerEdit.hidden = "customerEdit" !== targetRoute.view;
    elements.viewOrder.hidden = "order" !== targetRoute.view;
    elements.viewOrderEdit.hidden = "orderEdit" !== targetRoute.view;
    elements.viewMoodboard.hidden = !isMoodboard;
    elements.viewFittingJournal.hidden = "fittingNew" !== targetRoute.view && "fittingJournal" !== targetRoute.view;
    elements.fittingJournalBar.hidden = "fittingJournal" !== targetRoute.view && "fittingNew" !== targetRoute.view;
    document.body.classList.toggle("has-fitting-journal-bar", !elements.fittingJournalBar.hidden);
    elements.viewFittingLogs.hidden = "fittingLogs" !== targetRoute.view;
    elements.viewFittingDetail.hidden = "fittingLogDetail" !== targetRoute.view;
    elements.viewFittingPhotoEdit.hidden = "fittingPhotoEdit" !== targetRoute.view;
    elements.viewFittingPhotoAdd.hidden = "fittingPhotoAdd" !== targetRoute.view;
    elements.viewCalendar.hidden = "calendar" !== targetRoute.view;
    elements.viewEnquiry.hidden = "enquiry" !== targetRoute.view;

    // Leaving the feed must take its observer, debounce, and in-flight page
    // tokens with it, or a late response can render into a hidden view. Moving
    // deeper into the fitting-log family instead parks the feed intact so Back
    // can restore the same list, the same pages, and the same offset.
    if (!inFittingFamily(targetRoute)) {
      if (prevRoute && "fittingLogs" === prevRoute.view) cleanupFittingLogs();
      cleanupFittingDetail();
      cleanupFittingEditor();
      cleanupFittingPhotoAdd();
    } else {
      if (prevRoute && "fittingLogs" === prevRoute.view && "fittingLogs" !== targetRoute.view) {
        parkFittingLogs();
      }
      if (prevRoute && "fittingPhotoEdit" === prevRoute.view && "fittingPhotoEdit" !== targetRoute.view) {
        cleanupFittingEditor();
      }
      if (prevRoute && "fittingPhotoAdd" === prevRoute.view && "fittingPhotoAdd" !== targetRoute.view) {
        cleanupFittingPhotoAdd();
      }
    }
    if (prevRoute && "fittingLogDetail" === prevRoute.view && "fittingLogDetail" !== targetRoute.view) {
      closeFittingPhotoViewer();
      elements.fitdetBar.hidden = true;
      document.body.classList.remove("has-fitdet-bar");
    }
    if ("fittingPhotoEdit" !== targetRoute.view) {
      elements.fiteditBar.hidden = true;
      document.body.classList.remove("has-fitedit-bar");
    }
    if ("fittingPhotoAdd" !== targetRoute.view) {
      elements.fitaddBar.hidden = true;
      elements.fitaddUndo.hidden = true;
      document.body.classList.remove("has-fitadd-bar");
    }

    if (!prevRoute || ("fittingNew" !== prevRoute.view && "fittingJournal" !== prevRoute.view) ||
        (targetRoute.view === prevRoute.view && targetRoute.id === prevRoute.id && targetRoute.sessionId === prevRoute.sessionId)) {
      // Keep fitting overlay active
    } else {
      KK.fittings.closeAll();
    }

    syncBottomBar();
    window.scrollTo(0, 0);
    beginRouteLoader(targetRoute);

    const renderFn = async () => {
      if ("customers" === targetRoute.view) {
        await showCustomers();
      } else if ("customer" === targetRoute.view) {
        await showCustomerDetail(targetRoute.id);
      } else if ("customerEdit" === targetRoute.view) {
        await showCustomerEdit(targetRoute.id, targetRoute.query);
      } else if ("orderEdit" === targetRoute.view) {
        await (async function (orderId) {
          state.order = await db.getOrder(orderId);
          state.customer = await db.getCustomer(state.order.customer_id);
          setChrome({
            title: "Edit order",
            up: { label: orderLabel(state.order), hash: "#/order/" + orderId },
            save: true,
            destroy: "order"
          });
          elements.oTitle.value = state.order.title || "";
          elements.oDocName.value = state.order.doc_name || "";
          elements.oFirstPayment.value = state.order.first_payment_date || "";
          elements.oSecondPayment.value = state.order.second_payment_date || "";
          elements.oFinalPayment.value = state.order.final_payment_date || "";
          elements.oScheme.value = "other" === state.order.payment_scheme ? "other" : "standard";

          buildTerms(state.order);
          syncSchemeCard();
          renderScheduleHint();
          elements.itemList.innerHTML = "";

          const itemsToRender = (state.order.items || []).length ? state.order.items : [{ name: "", qty: 1, price: "", cost: "" }];
          itemsToRender.forEach((item) => addItemRow(item, false));

          (function (includesArr) {
            const list = includesArr || [];
            const isTicked = (val) => list.some((item) => item.toLowerCase() === val.toLowerCase());
            const customItems = list.filter((item) => !INCLUDES_PRESETS.some((preset) => preset.toLowerCase() === item.toLowerCase()));

            elements.includesList.innerHTML =
              INCLUDES_PRESETS.map((preset) => (function (lbl, checked) {
                return '<label class="chip' + (checked ? ' is-checked' : '') + '" data-label="' + U.escapeHtml(lbl) + '"><input type="checkbox"' + (checked ? ' checked' : '') + '><span class="chip__box">' + SVG_CHECK + '</span><span>' + U.escapeHtml(lbl) + '</span></label>';
              })(preset, isTicked(preset))).join('') +
              customItems.map((lbl) => customChip(lbl, true)).join('');
          })(state.order.includes || []);

          elements.customInclude.value = "";
          refreshItemTotals();
          setDirty(false);
        })(targetRoute.id);
      } else if ("moodboard" === targetRoute.view) {
        await (async function (orderId) {
          state.order = await db.getOrder(orderId);
          const res = await Promise.all([db.getCustomer(state.order.customer_id), db.listOrders(state.order.customer_id)]);
          state.customer = res[0];
          state.customerOrders = res[1];

          setChrome({ title: "Create moodboard", save: false, moodboardpage: true });
          setSaveBar(false);
          closeMoodboardOverlay();

          elements.mbBackBtn.href = "#/order/" + orderId;
          elements.mbBackLabel.textContent = orderLabel(state.order);
          elements.mbBackBtn.setAttribute("aria-label", "Back to " + orderLabel(state.order));

          if (activeMoodboardOrderId !== orderId || !KK.moodboard.images.length) {
            KK.moodboard.init({
              orderId: state.order.id,
              customerId: state.customer.id,
              customerName: state.customer.name,
              docName: state.order.doc_name || state.customer.name,
              orderRef: state.order.title || ""
            });
            activeMoodboardOrderId = orderId;
          }
          elements.mbCanvas.hidden = true;
          elements.mbEditor.hidden = false;
        })(targetRoute.id);
      } else if ("moodboardPreview" === targetRoute.view) {
        await (async function (orderId) {
          if (!KK.moodboard.images.length || activeMoodboardOrderId !== orderId) {
            return go("#/order/" + orderId + "/moodboard");
          }
          setChrome({ title: "Moodboard", save: false, moodboardpage: true });
          setSaveBar(false);
          closeMoodboardOverlay();
          elements.mbEditor.hidden = true;
          elements.mbCanvas.hidden = false;
          elements.mbCanvasBack.href = "#/order/" + orderId + "/moodboard";
          resetMoodboardExports();
          requestAnimationFrame(() => syncMoodboardCanvas());
        })(targetRoute.id);
      } else if ("fittingNew" === targetRoute.view) {
        await (async function (orderId) {
          state.order = await db.getOrder(orderId);
          state.customer = await db.getCustomer(state.order.customer_id);
          setChrome({ title: "New fitting", up: { label: orderLabel(state.order), hash: "#/order/" + orderId }, save: false });
          elements.fittingJournalBar.hidden = true;
          document.body.classList.remove("has-fitting-journal-bar");
          syncBottomBar();

          const startSessionFn = async (stageName) => {
            try {
              if (calendar.PRODUCTION_STAGES.indexOf(stageName) === -1) throw new Error("Choose a valid fitting stage");
              const existing = await db.getFittingSessionByStage(orderId, stageName);
              if (existing) return go("#/fittings/" + existing.id + "?source=order");

              const draft = {
                order: state.order,
                customer: state.customer,
                session: null,
                stage: stageName,
                photos: [],
                onToast: showToast,
                ensureSession: async () => {
                  if (draft.session) return draft.session;
                  try {
                    draft.session = await db.createFittingSession({ order_id: orderId, stage: stageName, status: "active" });
                  } catch (err) {
                    if (!err || "23505" !== err.code) throw err;
                    draft.session = await db.getFittingSessionByStage(orderId, stageName);
                    if (!draft.session) throw err;
                  }
                  return draft.session;
                },
                onSession: (session) => { draft.session = session; },
                onChange: () => {
                  KK.fittings.renderJournal(elements.fittingJournal, draft);
                  elements.pageAction.disabled = !draft.photos.length;
                }
              };
              setChrome({
                title: U.fittingStage(stageName).label,
                up: { label: orderLabel(state.order), hash: "#/order/" + orderId },
                action: { label: "Save log", onClick: () => KK.fittings.endSession(draft.session, () => go("#/order/" + orderId)) },
                save: false
              });
              elements.pageAction.disabled = true;
              elements.fittingJournalBar.hidden = false;
              document.body.classList.add("has-fitting-journal-bar");
              syncBottomBar();
              KK.fittings.renderJournal(elements.fittingJournal, draft);
              KK.fittings.attachSession(draft);
              KK.fittings.addPhoto();
            } catch (err) {
              showToast(err.message || "Could not start fitting log");
            }
          };

          const explicitStage = targetRoute.query.get("stage");
          if (calendar.PRODUCTION_STAGES.indexOf(explicitStage) !== -1) {
            await startSessionFn(explicitStage);
          } else {
            KK.fittings.showStagePicker([], startSessionFn, () => go("#/order/" + orderId));
          }
        })(targetRoute.id);
      } else if ("fittingJournal" === targetRoute.view) {
        // Old order-scoped bookmarks join the canonical detail route.
        return go("#/fittings/" + encodeURIComponent(targetRoute.sessionId) + "?source=order");
      } else if ("fittingLogs" === targetRoute.view) {
        await showFittingLogs(targetRoute.query);
      } else if ("fittingLogDetail" === targetRoute.view) {
        await showFittingLogDetail(targetRoute.sessionId, targetRoute.query);
      } else if ("fittingPhotoEdit" === targetRoute.view) {
        await showFittingPhotoEditor(targetRoute.sessionId, targetRoute.photoId, targetRoute.query);
      } else if ("fittingPhotoAdd" === targetRoute.view) {
        await showFittingPhotoAdd(targetRoute.sessionId, targetRoute.query);
      } else if ("calendar" === targetRoute.view) {
        await showCalendarSettings();
      } else if ("enquiry" === targetRoute.view) {
        await (async function (enquiryId) {
          setChrome({ title: "Enquiry", up: { label: "Customers", hash: "#/customers" }, save: false });
          state.enquiry = await db.getIntake(enquiryId);
          const enq = state.enquiry;
          elements.enquiryWhen.textContent = U.formatShortDate(enq.created_at);

          elements.enquiryAnswers.innerHTML = (function (sub) {
            const fields = (sub.payload && sub.payload.data && sub.payload.data.fields) || [];
            const answers = fields.map((f) => ({ label: String(f.label || "Answer"), value: readableAnswer(f) })).filter((a) => a.value);
            if (answers.length) return answers;
            return [
              { label: "Name", value: sub.name || "" },
              { label: "Phone", value: sub.phone || "" },
              { label: "Instagram", value: sub.instagram || "" },
              { label: "Source", value: sub.source || "" },
              { label: "Notes", value: sub.notes || "" }
            ].filter((a) => a.value);
          })(enq).map((a) => '<div class="infolist__stack"><dt>' + U.escapeHtml(a.label) + '</dt><dd>' + U.escapeHtml(a.value) + '</dd></div>').join('') ||
          '<div class="infolist__stack"><dt>Answers</dt><dd>Nothing readable in this submission.</dd></div>';

          const isHandled = "new" !== enq.status;
          elements.enquiryNote.textContent = isHandled
            ? ("accepted" === enq.status ? "Already accepted." : "Dismissed.")
            : "Creating the customer files them at Enquiry, with a reminder to book the consultation in two days. Dismissing keeps the submission but creates nothing.";

          elements.enquiryAccept.hidden = isHandled;
          elements.enquiryDismiss.hidden = isHandled;
        })(targetRoute.id);
      } else {
        await showOrderDetail(targetRoute.id);
      }
    };

    const loadTask = (async () => {
      try {
        await renderFn();
      } catch (err) {
        if (!db.isStaleToken(err)) throw err;
        console.warn("Stale token, refreshing and retrying:", err.message);
        await db.refreshSession();
        await renderFn();
      }
    })();

    const settledTask = loadTask.then(() => ({ ok: true }), (err) => ({ ok: false, error: err }));
    let earlyResult = null;

    if (!skipMotion) {
      earlyResult = await Promise.race([settledTask, wait(400).then(() => null)]);
      if (routeToken !== state.navigation.token) return;

      if (earlyResult && earlyResult.ok) {
        await hideRouteLoader(true);
      } else if (earlyResult && !earlyResult.ok && !routeHasOwnLoader(targetRoute)) {
        showRouteError(earlyResult.error, targetRoute);
      }
      await revealCurtain();
    }

    const finalResult = earlyResult || (await settledTask);
    if (routeToken !== state.navigation.token) return;

    if (finalResult.ok) {
      await hideRouteLoader(false);
      focusRoute(targetRoute);
    } else if (routeHasOwnLoader(targetRoute)) {
      showToast((finalResult.error && finalResult.error.message) || "Could not load that");
    } else {
      showRouteError(finalResult.error, targetRoute);
    }
  }

  const orNull = (str) => "" === String(str || "").trim() ? null : String(str).trim();

  function orderLabel(orderRecord) {
    if (orderRecord.title) return orderRecord.title;
    const items = orderRecord.items || [];
    return items.length && items[0].name ? items[0].name + (items.length > 1 ? " + " + (items.length - 1) + " more" : "") : "Empty order";
  }

  const isCosted = (item) => (Number(item.cost) || 0) > 0;
  const isNamed = (item) => "" !== String(item.name || "").trim();

  function greetingForClock(clockObj) {
    const period = clockObj.period;
    return ("dawn" === period || "morning" === period ? "Good morning" : "noon" === period || "afternoon" === period ? "Good afternoon" : "Good evening") + ", Ichaku";
  }

  function homepageOverview(ordersList, eventsList) {
    const ordersByCustomer = {};
    const orderToCustMap = {};
    const eventsByCustomer = {};

    ordersList.forEach((o) => {
      (ordersByCustomer[o.customer_id] = ordersByCustomer[o.customer_id] || []).push(o);
      orderToCustMap[o.id] = o.customer_id;
    });

    eventsList.forEach((e) => {
      const custId = orderToCustMap[e.order_id];
      if (custId) {
        (eventsByCustomer[custId] = eventsByCustomer[custId] || []).push(e);
      }
    });

    return { ordersByCustomer, eventsByCustomer };
  }

  const reducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let homePopTimers = [];

  function clearHomepagePops() {
    homePopTimers.forEach(clearTimeout);
    homePopTimers = [];
  }

  function clearHomepagePresses() {
    document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
  }

  function isCurrentHomepageLoad(token) {
    return token === state.homepage.loadToken && "customers" === state.route.view;
  }

  function beginHomepageLoad() {
    const token = ++state.homepage.loadToken;
    state.homepage.phase = "loading";
    clearHomepagePops();
    clearHomepagePresses();

    elements.homeStage.setAttribute("aria-busy", "true");
    elements.homeStage.style.height = "";
    elements.homeLoading.hidden = false;
    elements.homeLoading.classList.remove("is-transitioning", "is-hidden");
    elements.homeError.hidden = true;
    elements.homeReady.hidden = true;
    elements.homeReady.classList.remove("is-transitioning", "is-visible");
    elements.homeReady.style.visibility = "";

    return token;
  }

  function renderHomepageError(err, token) {
    if (!isCurrentHomepageLoad(token)) return;
    state.homepage.phase = "error";
    elements.homeLoading.hidden = true;
    elements.homeLoading.classList.remove("is-transitioning", "is-hidden");
    elements.homeError.hidden = false;
    elements.homeStage.setAttribute("aria-busy", "false");

    elements.homeError.innerHTML =
      '<div class="home-error-panel">' +
      '<p class="home-error-panel__title">Could not load the homepage.</p>' +
      '<p class="home-error-panel__hint">' + U.escapeHtml(err instanceof TypeError ? "Check your connection and try again." : (err && err.message) || "Try again in a moment.") + '</p>' +
      '<button type="button" class="home-error__retry">Try again</button>' +
      '</div>';

    const retryBtn = elements.homeError.querySelector(".home-error__retry");
    retryBtn.addEventListener("click", () => { showCustomers(true); });
    requestAnimationFrame(() => retryBtn.focus({ preventScroll: true }));
  }

  function renderHomepageHero() {
    const hour = new Date().getHours();
    const activeDeadlineCust = state.customers
      .filter(isActive)
      .map((c) => ({ customer: c, deadline: nextDeadline(c) }))
      .filter((c) => c.deadline)
      .sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))[0];

    elements.heroGreeting.textContent = greetingForClock({ period: hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening" });

    if (!activeDeadlineCust) {
      elements.heroDeadline.textContent = "No upcoming deadline. All clear!";
      return;
    }

    const diffDays = Math.ceil((new Date(activeDeadlineCust.deadline.date) - new Date(U.todayISO())) / 86400000);
    const relativeText = diffDays <= 0 ? "today" : diffDays === 1 ? "tomorrow" : "in " + diffDays + " days";
    elements.heroDeadline.innerHTML =
      "Nearest deadline is <strong>" + U.escapeHtml(firstName(activeDeadlineCust.customer.name) + " - " + activeDeadlineCust.deadline.what) + "</strong> " + relativeText + ". Prep up!";
  }

  function renderHomepageAlert(submissionsList) {
    elements.enquiriesCard.hidden = !submissionsList.length;
    if (submissionsList.length) {
      elements.enquiriesCount.textContent = submissionsList.length + " new order submission" + (1 === submissionsList.length ? "" : "s");
    }
  }

  function renderHomepageSummary() {
    const totalCusts = state.customers.length;
    const prodCount = state.customers.filter((c) => "In production" === homepageStatus(c, state.overview.ordersByCustomer[c.id] || []).label).length;
    elements.homeSummary.innerHTML = '<span>' + totalCusts + ' total customer' + (1 === totalCusts ? '' : 's') + '</span><i></i><span>' + prodCount + ' in production</span>';
  }

  function renderHomepageReady(dataObj) {
    renderHomepageHero();
    renderHomepageAlert(dataObj.submissions);
    renderHomepageSummary();
    renderCustomerList();
    elements.homeReady.hidden = false;
    elements.homeReady.classList.add("is-measuring");
  }

  function prepareShortcutAppearState() {
    if (state.homepage.popPlayedForVisit >= state.homepage.visit || reducedMotion()) return;
    elements.homeActions.querySelectorAll(".home-action").forEach((el) => el.classList.add("is-appear-pressed"));
  }

  function playShortcutAppear() {
    if (state.homepage.popPlayedForVisit >= state.homepage.visit) return;
    state.homepage.popPlayedForVisit = state.homepage.visit;
    elements.homeActions.querySelectorAll(".home-action").forEach((el, idx) => {
      homePopTimers.push(setTimeout(() => el.classList.remove("is-appear-pressed"), 80 * idx));
    });
  }

  async function revealHomepage(token) {
    await (document.fonts && document.fonts.ready || Promise.resolve());
    await new Promise((res) => requestAnimationFrame(res));
    if (!isCurrentHomepageLoad(token)) return;

    elements.homeStage.style.height = Math.ceil(elements.homeReady.getBoundingClientRect().height || elements.homeReady.scrollHeight) + "px";
    elements.homeReady.classList.remove("is-measuring");
    elements.homeReady.classList.add("is-transitioning");
    elements.homeLoading.classList.add("is-transitioning");

    requestAnimationFrame(() => {
      if (isCurrentHomepageLoad(token)) {
        elements.homeReady.classList.add("is-visible");
        elements.homeLoading.classList.add("is-hidden");
        playShortcutAppear();
      }
    });

    setTimeout(() => {
      if (isCurrentHomepageLoad(token)) {
        elements.homeLoading.hidden = true;
        elements.homeLoading.classList.remove("is-transitioning", "is-hidden");
        elements.homeReady.classList.remove("is-transitioning", "is-visible");
        elements.homeStage.style.height = "";
        elements.homeStage.setAttribute("aria-busy", "false");
        state.homepage.phase = "ready";
      }
    }, reducedMotion() ? 0 : 180);
  }

  async function showCustomers(isRefresh) {
    setChrome({ title: "Customers", up: null, save: false, homepage: true });
    state.customer = null;
    state.order = null;

    if (!isRefresh) state.homepage.visit++;
    const token = beginHomepageLoad();

    try {
      const res = await Promise.all([db.listCustomers(), db.listAllOrders(), db.listAllOrderEvents(), db.listIntake("new")]);
      if (!isCurrentHomepageLoad(token)) return;
      state.customers = res[0];
      state.overview = homepageOverview(res[1], res[2]);
      renderHomepageReady({ customers: res[0], submissions: res[3] });
      prepareShortcutAppearState();
      await revealHomepage(token);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      console.error(err);
      renderHomepageError(err, token);
    }
  }

  function hapticTap() {
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (_) {}
  }

  elements.viewCustomers.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".home-action,.home-alert,.home-customer-card,.home-nav-btn");
    if (target) {
      target.classList.add("is-pressed");
      if (target.matches(".home-action")) hapticTap();
    }
  });

  ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((evtName) =>
    window.addEventListener(evtName, clearHomepagePresses, true)
  );

  window.addEventListener("scroll", () => {
    if ("ready" === state.homepage.phase) clearHomepagePresses();
  }, { passive: true });

  elements.viewCustomers.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".home-action,.home-alert,.home-customer-card,.home-nav-btn");
    if (target) {
      target.classList.add("is-pressed");
      if (target.matches(".home-action")) hapticTap();
      if (target.matches(".home-action,.home-alert,.home-nav-btn") && !target.matches(".home-action--fitting")) e.preventDefault();
    }
  });

  window.addEventListener("keyup", clearHomepagePresses);
  // Fitting is the one shortcut that leads somewhere; its unfinished siblings
  // stay inert.
  elements.homeReady.addEventListener("click", (e) => {
    if (e.target.closest(".home-action,.home-alert") && !e.target.closest(".home-action--fitting")) e.preventDefault();
  });

  elements.viewCustomer.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".cust-banner,.cust-nav-btn,.cust-order-card");
    if (target) target.classList.add("is-pressed");
  });

  elements.viewCustomer.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".cust-banner,.cust-nav-btn,.cust-order-card");
    if (target) {
      target.classList.add("is-pressed");
      if (target.matches(".cust-banner") && !target.matches(".cust-banner--fittings")) e.preventDefault();
    }
  });

  window.addEventListener("scroll", () => {
    if (document.body.classList.contains("is-custpage") ||
        document.body.classList.contains("is-custeditpage") ||
        document.body.classList.contains("is-orderpage") ||
        document.body.classList.contains("is-moodboardpage") ||
        document.body.classList.contains("is-fittinglogspage")) {
      clearHomepagePresses();
    }
  }, { passive: true });

  // Same rule on the customer page: only the Fitting logs banner navigates.
  elements.viewCustomer.addEventListener("click", (e) => {
    if (e.target.closest(".cust-banner") && !e.target.closest(".cust-banner--fittings")) e.preventDefault();
  });

  elements.viewOrder.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".order-nav-btn,.order-action,.order-schedule-record,.order-choice");
    if (target && !target.disabled) target.classList.add("is-pressed");
  });

  elements.viewOrder.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".order-nav-btn,.order-action,.order-schedule-record,.order-choice");
    if (target && !target.disabled) {
      target.classList.add("is-pressed");
      if (" " === e.key && target.matches("#orderHistoryBtn,.order-schedule-record")) e.preventDefault();
    }
  });
  elements.viewOrder.addEventListener("keyup", (e) => {
    const target = e.target.closest(".order-schedule-record");
    if (!target) return;
    target.classList.remove("is-pressed");
    if (" " === e.key && "A" === target.tagName) {
      e.preventDefault();
      target.click();
    }
  });

  elements.viewOrder.addEventListener("click", (e) => {
    if (e.target.closest("#orderHistoryBtn,#uploadDesignBtn")) e.preventDefault();
    const stageBtn = e.target.closest("button.order-schedule-record[data-stage]");
    if (stageBtn && state.order) {
      go("#/order/" + encodeURIComponent(state.order.id) + "/fitting/new?stage=" + encodeURIComponent(stageBtn.dataset.stage));
      return;
    }
    if (e.target.closest(".js-order-schedule-retry")) retryOrderSchedule();
  });

  elements.viewCustomerEdit.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".cust-banner,.cust-nav-btn,.custedit-segmented__btn,.custedit-danger__btn");
    if (target) target.classList.add("is-pressed");
  });

  elements.viewCustomerEdit.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".cust-banner,.cust-nav-btn,.custedit-segmented__btn,.custedit-danger__btn");
    if (target) target.classList.add("is-pressed");
  });

  elements.saveBtn.addEventListener("pointerdown", () => {
    if (document.body.classList.contains("is-custeditpage")) elements.saveBtn.classList.add("is-pressed");
  });

  /* ------------------------- Fitting logs feed -------------------------- */

  /* Figma nodes 218:1958 / 219:2547 / 219:2731. A read-only global feed: it
     searches, filters, and pages, and does nothing else. Creating, opening, or
     editing a fitting log is deliberately not reachable from here.

     Everything the page can show — cards, skeletons, empty, no-match, and both
     failure states — is inset in the same ledger rhythm, so the chrome above
     the feed never moves between them. */

  const FITTING_FEED_STAGES = [
    { key: "sizing", label: "Sizing" },
    { key: "fitting-1", label: "Fitting 1" },
    { key: "fitting-2", label: "Fitting 2" },
    { key: "fitting-3", label: "Fitting 3" },
    { key: "final-fitting", label: "Final fitting" }
  ];

  const FITTING_SEARCH_DEBOUNCE_MS = 250;
  // Starts the next batch roughly a screen before the footer comes into view.
  const FITTING_SENTINEL_MARGIN = "0px 0px 300px 0px";
  const FITTING_SEARCH_GAP = 8;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const feed = () => state.fittingLogs;
  const isFittingRoute = () => !!state.route && "fittingLogs" === state.route.view;

  function fittingStageLabel(key) {
    const match = FITTING_FEED_STAGES.filter((s) => s.key === key)[0];
    return match ? match.label : "";
  }

  function fittingStageListText(keys) {
    const labels = (keys || []).map(fittingStageLabel).filter(Boolean);
    if (labels.length < 2) return labels[0] || "";
    return labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1];
  }

  const fittingPhotoText = (count) => count + (1 === count ? " photo" : " photos");

  /* Every block in the feed — card, panel, or skeleton — is a 24px inset
     between two full-width rules, preceded by a 24px tick row. */
  function fittingBlockHtml(inner) {
    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitlog-inset">' + inner + '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  function fittingCardHtml(item) {
    const stageKey = FITTING_FEED_STAGES.some((s) => s.key === item.stage_key) ? item.stage_key : "";
    const previews = Array.isArray(item.preview_photos) ? item.preview_photos : [];
    const count = Number(item.photo_count) || 0;

    // Explicit dimensions and a colour behind the box, so a slow or dead Drive
    // thumbnail can never resize the card or show a broken-image glyph. The
    // count beside them already describes the set, so the images stay silent.
    const thumbs = previews.slice(0, 3)
      .map((p) => KK.fittings.thumbURL(p && p.drive_file_id, 100))
      .filter(Boolean)
      .map((url) => '<img class="fitlog-card__thumb" src="' + U.escapeHtml(url) + '" alt="" width="32" height="32" loading="lazy" decoding="async" onerror="this.removeAttribute(\'src\')">')
      .join('');

    // The whole record is one link and holds nothing else interactive, so it
    // stays a single target for touch, keyboard, and assistive technology.
    const label = [
      item.customer_name || "Unnamed customer",
      item.order_label || "Empty order",
      item.stage_label || "",
      U.formatShortDate(item.log_date),
      fittingPhotoText(count)
    ].filter(Boolean).join(", ");

    return '<a class="fitlog-card-link" href="#/fittings/' + U.escapeHtml(encodeURIComponent(item.id)) +
      '" aria-label="' + U.escapeHtml(label) + '">' +
    '<article class="fitlog-card' + (stageKey ? ' fitlog-card--' + stageKey : '') + '">' +
      '<div class="fitlog-card__top">' +
        '<div class="fitlog-card__names">' +
          '<span class="fitlog-card__customer">' + U.escapeHtml((item.customer_name || "Unnamed customer") + ":") + '</span>' +
          '<span class="fitlog-card__order">' + U.escapeHtml(item.order_label || "Empty order") + '</span>' +
        '</div>' +
        '<span class="fitlog-card__stage">' + U.escapeHtml(item.stage_label || "") + '</span>' +
      '</div>' +
      '<div class="fitlog-card__divider" aria-hidden="true"></div>' +
      '<div class="fitlog-card__bottom">' +
        '<span class="fitlog-card__thumbs">' + thumbs + '</span>' +
        '<span class="fitlog-card__meta">' +
          '<span>' + U.escapeHtml(U.formatShortDate(item.log_date)) + '</span>' +
          '<span class="fitlog-card__dot" aria-hidden="true"></span>' +
          '<span>' + U.escapeHtml(fittingPhotoText(count)) + '</span>' +
        '</span>' +
      '</div>' +
    '</article>' +
    '<span class="fitlog-card__rail" aria-hidden="true"></span>' +
    '</a>';
  }

  /* The card's exact outer geometry, so swapping a skeleton for a record moves
     nothing: same padding, same 32px boxes, same divider, same rail. */
  function fittingSkeletonHtml() {
    return '<div class="fitlog-card fitlog-skel" aria-hidden="true">' +
      '<div class="fitlog-card__top">' +
        '<div class="fitlog-card__names">' +
          '<span class="fitlog-skel__line"><i class="fitlog-skel__block" style="width:52%;height:14px"></i></span>' +
          '<span class="fitlog-skel__line"><i class="fitlog-skel__block" style="width:74%;height:14px"></i></span>' +
        '</div>' +
        '<span class="fitlog-card__stage"><i class="fitlog-skel__block" style="width:64px;height:14px;margin-left:auto"></i></span>' +
      '</div>' +
      '<div class="fitlog-card__divider"></div>' +
      '<div class="fitlog-card__bottom">' +
        '<span class="fitlog-card__thumbs"><i class="fitlog-skel__thumb"></i><i class="fitlog-skel__thumb"></i><i class="fitlog-skel__thumb"></i></span>' +
        '<span class="fitlog-card__meta"><i class="fitlog-skel__block" style="width:136px;height:14px"></i></span>' +
      '</div>' +
    '</div>' +
    '<span class="fitlog-card__rail" aria-hidden="true"></span>';
  }

  function fittingPanelHtml(title, copyHtml, extraAttr, actionHtml) {
    return '<div class="fitlog-panel"' + (extraAttr || '') + '>' +
      '<p class="fitlog-panel__title">' + U.escapeHtml(title) + '</p>' +
      '<p class="fitlog-panel__copy">' + copyHtml + '</p>' +
      (actionHtml || '') +
    '</div>';
  }

  /* Figma 219:2731 for the designed case — a query inside one stage. The other
     combinations reuse the same panel with copy proposed in the plan; they are
     not designer-authored and are flagged for review there. */
  function fittingEmptyHtml() {
    const fs = feed();
    const typed = fs.customerSeed ? fs.customerSeed.originalQuery : fs.query.trim();
    const stageText = fittingStageListText(fs.selectedStages);

    if (!typed && !stageText) {
      return fittingPanelHtml(
        "No fitting logs yet",
        "New fitting logs will appear here after a fitting is started."
      );
    }
    if (typed && stageText) {
      return fittingPanelHtml("Nothing matched your search",
        "We couldn't find <b>" + U.escapeHtml(typed) + "</b> in <b>" + U.escapeHtml(stageText) +
        "</b>. Check the spelling or search another stage.");
    }
    if (typed) {
      return fittingPanelHtml("Nothing matched your search",
        "We couldn't find <b>" + U.escapeHtml(typed) + "</b>. Check the spelling or try another search.");
    }
    return fittingPanelHtml("Nothing matched your search",
      "No fitting logs in <b>" + U.escapeHtml(stageText) + "</b>. Choose another stage to see more logs.");
  }

  function fittingStateHtml() {
    const fs = feed();

    if ("initial-loading" === fs.phase) {
      return fittingBlockHtml(fittingSkeletonHtml()) +
        fittingBlockHtml(fittingSkeletonHtml()) +
        fittingBlockHtml(fittingSkeletonHtml());
    }
    if ("initial-error" === fs.phase) {
      // Alerted once; a retry that fails again must not shout a second time.
      return fittingBlockHtml(fittingPanelHtml(
        "Couldn't load fitting logs",
        "Check your connection and try again.",
        fs.errorAnnounced ? '' : ' role="alert"',
        '<button type="button" class="fitlog-panel__retry js-fitlog-retry">Try again</button>'
      ));
    }
    if (!fs.items.length) return fittingBlockHtml(fittingEmptyHtml());
    if (fs.loadingMore) return fittingBlockHtml(fittingSkeletonHtml());
    if (fs.loadMoreError) {
      // Page 1 stays exactly where it is; only the bottom slot changes.
      return fittingBlockHtml(fittingPanelHtml(
        "Couldn't load more fitting logs",
        "Check your connection and try again.",
        '',
        '<button type="button" class="fitlog-panel__retry js-fitlog-retry-more">Try again</button>'
      ));
    }
    return '';
  }

  function announceFittingStatus(text) {
    const fs = feed();
    if (fs.lastStatus === text) return;
    fs.lastStatus = text;
    elements.fitlogStatus.textContent = text;
  }

  function renderFittingStages() {
    const fs = feed();
    $$(".fitlog-stage", elements.fitlogStages).forEach((btn) => {
      btn.setAttribute("aria-pressed", fs.selectedStages.indexOf(btn.dataset.stage) !== -1 ? "true" : "false");
    });
  }

  function renderFittingSearchClear() {
    elements.fitlogSearchClear.hidden = !elements.fitlogSearch.value;
  }

  /* Append-only: rows already on screen are never re-rendered, so appending a
     batch cannot move or reflow what the user is reading. The list is cleared
     only when the request token changes, which is exactly when the results are
     a different query. */
  function renderFittingFeed() {
    const fs = feed();

    if (fs.renderedToken !== fs.requestToken) {
      elements.fitlogList.innerHTML = "";
      fs.renderedToken = fs.requestToken;
    }
    const rendered = elements.fitlogList.children.length;
    if (rendered < fs.items.length) {
      elements.fitlogList.insertAdjacentHTML("beforeend", fs.items.slice(rendered).map(
        (item) => '<li class="fitlog-record">' + fittingBlockHtml(fittingCardHtml(item)) + '</li>'
      ).join(''));
    }

    elements.fitlogState.innerHTML = fittingStateHtml();
    const busy = "initial-loading" === fs.phase || fs.loadingMore;
    elements.fitlogFeed.setAttribute("aria-busy", busy ? "true" : "false");
    elements.fitlogStages.setAttribute("aria-busy", "initial-loading" === fs.phase ? "true" : "false");
    elements.fitlogFeed.classList.toggle("fitlog-feed--initial", "initial-loading" === fs.phase);

    if ("initial-loading" === fs.phase) announceFittingStatus("Loading fitting logs");
    else if ("initial-error" === fs.phase) announceFittingStatus("");
    else if (fs.loadingMore) announceFittingStatus("Loading more fitting logs");
    else if (fs.items.length) announceFittingStatus(fs.items.length + fittingPhotoSuffix(fs.items.length));
    else announceFittingStatus("No fitting logs matched");
  }

  const fittingPhotoSuffix = (count) => 1 === count ? " fitting log found" : " fitting logs found";

  /* ------------------------- Feed requests & paging ------------------------ */

  function fittingRequestArgs() {
    const fs = feed();
    return {
      // An untouched Customer seed scopes by id instead of by text, so two
      // customers with the same name cannot mix on the first render.
      query: fs.customerSeed ? "" : fs.query,
      stages: fs.selectedStages,
      customerId: fs.customerSeed ? fs.customerSeed.id : null,
      limit: db.FITTING_FEED_PAGE_SIZE
    };
  }

  function ensureFittingObserver() {
    const fs = feed();
    if (fs.observer || !fs.hasMore || !window.IntersectionObserver) return;
    fs.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreFittingLogs();
    }, { root: null, rootMargin: FITTING_SENTINEL_MARGIN, threshold: 0 });
    fs.observer.observe(elements.fitlogSentinel);
  }

  function stopFittingObserver() {
    const fs = feed();
    if (fs.observer) {
      fs.observer.disconnect();
      fs.observer = null;
    }
  }

  async function startFittingFirstPage() {
    const fs = feed();
    // Bumping the token is what makes a slower earlier search unable to
    // overwrite these results when it finally lands.
    const token = ++fs.requestToken;

    fs.phase = "initial-loading";
    fs.items = [];
    fs.nextCursor = null;
    fs.hasMore = true;
    fs.loadingMore = false;
    fs.loadMoreError = null;
    stopFittingObserver();
    renderFittingFeed();

    try {
      const page = await db.listFittingLogs(fittingRequestArgs());
      if (token !== fs.requestToken || !isFittingRoute()) return;
      fs.items = page.items;
      fs.nextCursor = page.nextCursor;
      fs.hasMore = page.hasMore;
      fs.phase = "ready";
    } catch (err) {
      console.error(err);
      if (token !== fs.requestToken || !isFittingRoute()) return;
      fs.phase = "initial-error";
    }

    renderFittingFeed();
    if ("initial-error" === fs.phase) fs.errorAnnounced = true;
    else ensureFittingObserver();
  }

  async function loadMoreFittingLogs() {
    const fs = feed();
    if (!isFittingRoute() || "ready" !== fs.phase) return;
    if (fs.loadingMore || !fs.hasMore || fs.loadMoreError || !fs.nextCursor) return;

    const token = fs.requestToken;
    fs.loadingMore = true;
    renderFittingFeed();

    try {
      const page = await db.listFittingLogs(Object.assign(fittingRequestArgs(), { before: fs.nextCursor }));
      if (token !== fs.requestToken || !isFittingRoute()) return;

      // Cursor paging already prevents overlap; this is a cheap guard against a
      // repeated request ever doubling a row.
      const seen = {};
      fs.items.forEach((item) => { seen[item.id] = true; });
      page.items.forEach((item) => {
        if (!seen[item.id]) {
          seen[item.id] = true;
          fs.items.push(item);
        }
      });

      fs.nextCursor = page.nextCursor;
      fs.hasMore = page.hasMore;
      fs.loadingMore = false;
      // End of feed adds no banner: the footer already closes the page.
      if (!fs.hasMore) stopFittingObserver();
    } catch (err) {
      console.error(err);
      if (token !== fs.requestToken || !isFittingRoute()) return;
      fs.loadingMore = false;
      fs.loadMoreError = err;
      // Paused until the explicit retry, so a failing page cannot spin.
      stopFittingObserver();
    }
    renderFittingFeed();
  }

  function cleanupFittingLogs() {
    const fs = feed();
    stopFittingObserver();
    clearTimeout(fs.searchTimer);
    fs.searchTimer = null;
    fs.requestToken++;
    fs.phase = "idle";
    fs.items = [];
    fs.loadingMore = false;
    fs.loadMoreError = null;
    fs.alignPending = false;
    fs.lastStatus = "";
    fs.retainHash = "";
    fs.retainScroll = 0;
    elements.fitlogList.innerHTML = "";
    fs.renderedToken = -1;
  }

  /* The three routes that are one experience. Moving between them keeps the
     feed's search, filters, loaded pages, DOM, and offset alive; leaving them
     for anything else is an ordinary teardown. */
  const FITTING_ROUTE_FAMILY = ["fittingLogs", "fittingLogDetail", "fittingPhotoEdit", "fittingPhotoAdd"];
  const inFittingFamily = (r) => !!r && FITTING_ROUTE_FAMILY.indexOf(r.view) !== -1;

  /* Everything with a timer or a callback stops; everything with a result
     stays. lastVisitedHash is still the feed's own hash at this point, which is
     what a later visit compares against before trusting the snapshot. */
  function parkFittingLogs() {
    const fs = feed();
    stopFittingObserver();
    clearTimeout(fs.searchTimer);
    fs.searchTimer = null;
    fs.alignPending = false;
    fs.retainHash = "ready" === fs.phase && fs.items.length ? lastVisitedHash : "";
  }

  /* --------------------------- Search focus space -------------------------- */

  /* The document-wide focusin handler centres a focused field, which on this
     page would bury the search under the software keyboard. Here the field is
     scrolled to sit directly under the fixed navigation instead, measured from
     the nav's own box rather than assumed from a keyboard height. */
  function alignFittingSearch() {
    if (!isFittingRoute() || document.activeElement !== elements.fitlogSearch) return;
    const nav = $(".cust-nav", elements.viewFittingLogs);
    if (!nav) return;

    const delta = Math.round(
      elements.fitlogSearchSection.getBoundingClientRect().top -
      nav.getBoundingClientRect().bottom -
      FITTING_SEARCH_GAP
    );
    if (Math.abs(delta) < 2) return;
    window.scrollBy({ top: delta, left: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  /* One correction per settle. The pending flag is what stops the scroll this
     causes from asking for another correction. */
  function scheduleFittingSearchAlign() {
    const fs = feed();
    if (fs.alignPending) return;
    fs.alignPending = true;
    requestAnimationFrame(() => setTimeout(() => {
      fs.alignPending = false;
      alignFittingSearch();
    }, 140));
  }

  /* ------------------------------ Feed events ------------------------------ */

  elements.fitlogSearch.addEventListener("input", () => {
    const fs = feed();
    const value = elements.fitlogSearch.value;

    // Editing the pre-filled name drops the hidden exact-customer scope, so a
    // deep link can never trap the user inside one customer.
    if (fs.customerSeed && value !== fs.customerSeed.originalQuery) fs.customerSeed = null;
    fs.query = value;
    renderFittingSearchClear();

    clearTimeout(fs.searchTimer);
    fs.searchTimer = setTimeout(() => {
      fs.searchTimer = null;
      startFittingFirstPage();
    }, FITTING_SEARCH_DEBOUNCE_MS);
  });

  elements.fitlogSearchClear.addEventListener("click", () => {
    const fs = feed();
    clearTimeout(fs.searchTimer);
    fs.searchTimer = null;
    fs.customerSeed = null;
    fs.query = "";
    elements.fitlogSearch.value = "";
    renderFittingSearchClear();
    elements.fitlogSearch.focus({ preventScroll: true });
    startFittingFirstPage();
  });

  elements.fitlogSearch.addEventListener("focus", scheduleFittingSearchAlign);

  elements.fitlogStages.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".fitlog-stage");
    if (!btn) return;
    btn.classList.add("is-pressed");
    // Toggling a stage mid-query must not close the keyboard.
    if (document.activeElement === elements.fitlogSearch) e.preventDefault();
  });
  ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach((type) => {
    elements.fitlogStages.addEventListener(type, () => {
      elements.fitlogStages.querySelectorAll(".is-pressed").forEach((btn) => btn.classList.remove("is-pressed"));
    }, "scroll" === type ? { passive: true } : undefined);
  });
  elements.fitlogStages.addEventListener("focusin", (e) => {
    const btn = e.target.closest(".fitlog-stage");
    if (btn) btn.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  elements.fitlogStages.addEventListener("focusout", (e) => e.target.classList.remove("is-pressed"));
  elements.fitlogStages.addEventListener("keyup", (e) => e.target.classList.remove("is-pressed"));

  elements.fitlogStages.addEventListener("click", (e) => {
    const btn = e.target.closest(".fitlog-stage");
    if (!btn) return;
    const fs = feed();
    const idx = fs.selectedStages.indexOf(btn.dataset.stage);
    if (-1 === idx) fs.selectedStages.push(btn.dataset.stage);
    else fs.selectedStages.splice(idx, 1);
    renderFittingStages();
    startFittingFirstPage();
  });

  elements.viewFittingLogs.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".cust-nav-btn,.fitlog-panel__retry,.fitlog-card-link");
    if (target && !target.disabled) target.classList.add("is-pressed");
  });

  elements.viewFittingLogs.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".cust-nav-btn,.fitlog-stage,.fitlog-panel__retry");
    if (target && !target.disabled) {
      target.classList.add("is-pressed");
    }
  });

  elements.viewFittingLogs.addEventListener("click", (e) => {
    if (e.target.closest("#fitlogNewBtn")) {
      e.preventDefault();
      return;
    }
    // Recorded before the hash changes, because after navigation the feed is
    // no longer the scrolling document.
    if (e.target.closest(".fitlog-card-link")) {
      feed().retainScroll = window.scrollY || window.pageYOffset || 0;
      return;
    }
    if (e.target.closest(".js-fitlog-retry")) {
      startFittingFirstPage();
      return;
    }
    if (e.target.closest(".js-fitlog-retry-more")) {
      const fs = feed();
      fs.loadMoreError = null;
      renderFittingFeed();
      ensureFittingObserver();
      loadMoreFittingLogs();
    }
  });

  /* ------------------------------ Route entry ------------------------------ */

  async function showFittingLogs(queryParams) {
    const params = queryParams || new URLSearchParams("");
    const seedName = String(params.get("q") || "");
    const seedId = String(params.get("customerId") || "");
    const hasSeed = "customer" === params.get("from") && UUID_PATTERN.test(seedId);

    setChrome({ title: "Fitting logs", save: false, fittinglogspage: true });
    setSaveBar(false);

    const fs = feed();

    /* Returning from a detail or editor page inside the same history visit:
       the rows, the cursor, the DOM, and the offset are all still here, so the
       first page is deliberately not requested again. Any other arrival — a
       fresh link, a reload, a different query — falls through and rebuilds. */
    if (fs.retainHash && fs.retainHash === location.hash && "ready" === fs.phase && fs.items.length) {
      fs.retainHash = "";
      renderFittingStages();
      renderFittingSearchClear();
      renderFittingFeed();
      ensureFittingObserver();
      restoreFittingScroll(fs.retainScroll);
      return;
    }
    fs.retainHash = "";
    fs.retainScroll = 0;

    fs.query = seedName;
    fs.selectedStages = [];
    fs.customerSeed = hasSeed ? { id: seedId, originalQuery: seedName } : null;
    fs.errorAnnounced = false;
    fs.lastStatus = "";
    fs.loadMoreError = null;

    elements.fitlogSearch.value = seedName;
    renderFittingSearchClear();
    setFittingBackControl(hasSeed ? { id: seedId, name: seedName } : null);
    renderFittingStages();

    // A customer deleted after the link was made falls back to an ordinary
    // global search rather than failing the route; the check runs alongside
    // the first page so it costs no visible time.
    const seedCheck = hasSeed
      ? db.getCustomer(seedId).then(() => true, () => false)
      : Promise.resolve(true);

    await startFittingFirstPage();

    if (!(await seedCheck) && isFittingRoute() && fs.customerSeed && fs.customerSeed.id === seedId) {
      fs.customerSeed = null;
      setFittingBackControl(null);
      await startFittingFirstPage();
    }
  }

  /* The router scrolls to the top before any view renders, and the curtain
     reveal runs after it, so the offset is reapplied once layout has settled
     rather than in the same frame. */
  function restoreFittingScroll(offset) {
    const target = Math.max(0, Number(offset) || 0);
    if (!target) return;
    const apply = () => {
      if (!isFittingRoute()) return;
      window.scrollTo(0, target);
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
    setTimeout(apply, 120);
  }

  function setFittingBackControl(origin) {
    const label = origin && origin.name ? origin.name : "Home";
    elements.fitlogBackLabel.textContent = label;
    elements.fitlogBackBtn.href = origin ? "#/customer/" + encodeURIComponent(origin.id) : "#/customers";
    elements.fitlogBackBtn.setAttribute("aria-label", "Back to " + label);
  }

  /* ====================== Fitting log session detail ====================== */

  /* Figma 229:2847. Exactly one fitting_sessions record — never a stage, never
     an order, never a merge of several sessions. Both this page and the photo
     editor fetch their own records, so a pasted URL and a tapped card produce
     identical state. */

  const detail = () => state.fittingDetail;
  const editor = () => state.fittingEditor;
  const isDetailRoute = () => !!state.route && "fittingLogDetail" === state.route.view;
  const isEditorRoute = () => !!state.route && "fittingPhotoEdit" === state.route.view;

  /* Drive thumbnail width only. Image preparation itself lives in
     KK.fittings.prepareImage, which owns the 2560px / 0.90 contract every
     fitting path now shares. */
  const FITTING_IMAGE_MAX = 1600;

  function invalidateFittingFeed() {
    const fs = feed();
    fs.phase = "idle";
    fs.items = [];
    fs.requestToken++;
    fs.renderedToken = -1;
  }

  /* Deterministic even when two rows share a position and a timestamp, because
     the detail page, the share filename, and the PDF all number photos from
     this one order. */
  function sortFittingPhotos(photos) {
    return (photos || []).slice().sort((a, b) =>
      (Number(a.position) || 0) - (Number(b.position) || 0) ||
      String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
      String(a.id).localeCompare(String(b.id))
    );
  }

  function fittingPhotoState(photo) {
    if (KK.fittings.localURLs.get(photo.id)) {
      return KK.fittings.isBackingUp(photo.id) ? "backing-up" : "ready-local";
    }
    if (photo.drive_file_id) return "ready-drive";
    return "unavailable";
  }

  const fittingPhotoDisplayURL = (photo) =>
    KK.fittings.localURLs.get(photo.id) || KK.fittings.thumbURL(photo.drive_file_id, FITTING_IMAGE_MAX);

  /* ------------------------------ Detail render ---------------------------- */

  function fittingDetailCardHtml(photo, index) {
    const d = detail();
    const displayState = fittingPhotoState(photo);
    const url = fittingPhotoDisplayURL(photo);
    const alt = photo.caption ? "Fitting photo: " + photo.caption : "Fitting photo " + (index + 1);

    const frame = "unavailable" === displayState
      ? '<div class="fitdet-missing">' +
          '<p class="fitdet-missing__title">Photo unavailable</p>' +
          '<p class="fitdet-missing__copy">This record has no image on this device or in Drive. Its note is kept below.</p>' +
        '</div>'
      : '<button type="button" class="fitdet-card__frame js-fitdet-open" data-id="' + U.escapeHtml(photo.id) + '" ' +
          'aria-label="Open photo ' + (index + 1) + ' full screen">' +
          '<img class="fitdet-card__image" src="' + U.escapeHtml(url) + '" alt="' + U.escapeHtml(alt) + '" loading="lazy" decoding="async">' +
        '</button>';

    const pending = "backing-up" === displayState
      ? '<p class="fitdet-pending"><span class="fitdet-pending__dot" aria-hidden="true"></span>Backing up to Drive…</p>'
      : '';

    // An empty caption removes its region entirely rather than printing a
    // placeholder sentence a client-facing PDF would then have to carry.
    const caption = photo.caption
      ? '<p class="fitdet-card__caption">' + U.escapeHtml(photo.caption) + '</p>'
      : '';

    const shareDisabled = "unavailable" === displayState;
    const shareLabel = shareDisabled
      ? "Share photo " + (index + 1) + " (unavailable — this photo has no image to share)"
      : "Share photo " + (index + 1);

    const editHref = "#/fittings/" + encodeURIComponent(d.sessionId) +
      "/photo/" + encodeURIComponent(photo.id) + "/edit?source=" + d.source;

    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitdet-inset">' +
        '<article class="fitdet-card">' + frame + pending + caption + '</article>' +
        '<div class="fitdet-actions">' +
          '<a class="fitdet-action" href="' + U.escapeHtml(editHref) + '" aria-label="Edit photo ' + (index + 1) + '">' +
            '<span class="fitdet-action__face"><img src="assets/fitlog-edit-icon.svg" alt="" width="20" height="20"><span>Edit</span></span>' +
            '<span class="fitdet-action__rail" aria-hidden="true"></span>' +
          '</a>' +
          '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
          '<button type="button" class="fitdet-action js-fitdet-share" data-id="' + U.escapeHtml(photo.id) + '"' +
            (shareDisabled ? ' disabled' : '') + ' aria-label="' + U.escapeHtml(shareLabel) + '">' +
            '<span class="fitdet-action__face"><img src="assets/fitlog-share-icon.svg" alt="" width="20" height="20"><span>Share</span></span>' +
            '<span class="fitdet-action__rail" aria-hidden="true"></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  function fittingDetailEmptyHtml() {
    const d = detail();
    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitlog-inset">' +
        fittingPanelHtml(
          "No photos in this fitting log",
          "Use Add photo below to add the first entry."
        ) +
      '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  function announceDetailStatus(text) {
    if (elements.fitdetStatus.textContent === text) return;
    elements.fitdetStatus.textContent = text;
  }

  function renderFittingDetail() {
    const d = detail();
    if (!d.session) return;

    const stage = U.fittingStage(d.session.stage);
    const isActive = "active" === d.session.status;

    elements.fitdetTitle.textContent = d.order ? orderLabel(d.order) : "Fitting log";
    elements.fitdetStage.textContent = stage.label;
    elements.fitdetStage.hidden = !stage.label;
    elements.fitdetStage.className = "fitdet-stage" + (stage.key ? " fitdet-stage--" + stage.key : "");
    elements.fitdetCustomer.textContent = (d.customer && d.customer.name) || "Unnamed customer";
    elements.fitdetDate.textContent = U.formatJakartaLongDate(d.session.created_at);

    const photos = d.photos;
    elements.fitdetList.innerHTML = photos.map(
      (photo, index) => '<li class="fitdet-record">' + fittingDetailCardHtml(photo, index) + '</li>'
    ).join('');
    elements.fitdetState.innerHTML = photos.length ? '' : fittingDetailEmptyHtml();
    elements.fitdetBody.setAttribute("aria-busy", "false");

    // Nothing to print is not an error state; the control simply cannot act.
    elements.fitdetPdfBtn.disabled = !photos.length || d.pdfBusy;
    elements.fitdetPdfBtn.setAttribute("aria-busy", d.pdfBusy ? "true" : "false");
    elements.fitdetPdfBtn.setAttribute(
      "aria-label",
      d.pdfBusy ? "Preparing the PDF" : photos.length ? "Download this fitting log as a PDF" : "Download PDF (this log has no photos)"
    );

    elements.fitdetBar.hidden = false;
    elements.fitdetBar.classList.toggle("fitdet-bar--single", !isActive);
    elements.fitdetEndBtn.hidden = !isActive;
    elements.fitdetEndBtn.disabled = isActive && !photos.length;
    document.body.classList.add("has-fitdet-bar");
    syncBottomBar();

    announceDetailStatus(
      photos.length ? photos.length + (1 === photos.length ? " photo in this fitting log" : " photos in this fitting log")
        : "This fitting log has no photos"
    );
  }

  /* ------------------------------- Photo bytes ----------------------------- */

  /* Local first, Drive second, and cached only for as long as this page is
     open. The Drive read resolves its own file id server-side, so nothing here
     can ask for a file this app did not create. */
  async function fittingPhotoBlob(photo) {
    const d = detail();
    const cached = d.blobCache.get(photo.id);
    if (cached) return cached;

    const localUrl = KK.fittings.localURLs.get(photo.id);
    if (localUrl) {
      const blob = await fetch(localUrl).then((res) => res.blob());
      d.blobCache.set(photo.id, blob);
      return blob;
    }

    if (!photo.drive_file_id) throw new Error("This photo has no image to use.");

    const result = await db.driveGetFittingPhoto(photo.id);
    const raw = atob(String(result.image_base64 || ""));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: result.mime_type || "image/jpeg" });
    d.blobCache.set(photo.id, blob);
    return blob;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.readAsDataURL(blob);
    });
  }

  function measureImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not decode that image."));
      img.src = dataUrl;
    });
  }

  function fittingShareFilename(photo, index) {
    const d = detail();
    const parts = [
      U.sanitizeForFilename((d.customer && d.customer.name) || "") || "Customer",
      U.sanitizeForFilename(U.fittingStage(d.session && d.session.stage).label) || "Fitting",
      String(index + 1).padStart(2, "0")
    ];
    return parts.join("-") + ".jpg";
  }

  /* -------------------------------- Sharing -------------------------------- */

  /* An actual image file plus the caption, or a clear explanation. No Drive
     link, no WhatsApp, no clipboard, and no silent download: those are
     different actions wearing this one's label. */
  async function shareFittingPhoto(photoId, button) {
    const d = detail();
    if (d.sharingId) return;

    const index = d.photos.findIndex((p) => p.id === photoId);
    const photo = d.photos[index];
    if (!photo) return;

    if ("unavailable" === fittingPhotoState(photo)) {
      showToast("This photo has no image to share");
      return;
    }
    if (!navigator.share || !navigator.canShare) {
      showToast("This browser cannot share image files");
      return;
    }

    d.sharingId = photoId;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }

    try {
      const blob = await fittingPhotoBlob(photo);
      const file = new File([blob], fittingShareFilename(photo, index), {
        type: blob.type || "image/jpeg"
      });

      if (!navigator.canShare({ files: [file] })) {
        showToast("This browser cannot share image files");
        return;
      }

      const payload = { files: [file] };
      if (photo.caption) payload.text = photo.caption;
      await navigator.share(payload);
    } catch (err) {
      // Dismissing the native sheet is a decision, not a failure.
      if (!err || "AbortError" !== err.name) {
        console.error(err);
        showToast((err && err.message) || "Could not share that photo");
      }
    } finally {
      d.sharingId = null;
      if (button && document.contains(button)) {
        button.disabled = false;
        button.setAttribute("aria-busy", "false");
      }
    }
  }

  /* ------------------------------ PDF download ----------------------------- */

  async function downloadFittingPdf() {
    const d = detail();
    if (d.pdfBusy || !d.photos.length || !d.session) return;
    const targetSessionId = d.sessionId;

    d.pdfBusy = true;
    renderFittingDetail();
    announceDetailStatus("Preparing the PDF");

    try {
      // A photo still uploading has usable local bytes; waiting keeps the
      // document and the archive describing the same session.
      if (KK.fittings.hasPendingBackups(d.sessionId)) {
        announceDetailStatus("Waiting for photo backups to finish");
        await KK.fittings.waitForSessionBackups(d.sessionId);
        if (!isDetailRoute() || d.sessionId !== targetSessionId) return;
      }

      const resolved = [];
      const failed = [];
      for (let i = 0; i < d.photos.length; i++) {
        try {
          const blob = await fittingPhotoBlob(d.photos[i]);
          const dataUrl = await blobToDataUrl(blob);
          const size = await measureImage(dataUrl);
          resolved.push({
            dataUrl,
            width: size.width,
            height: size.height,
            format: /png/i.test(blob.type || "") ? "PNG" : "JPEG"
          });
        } catch (err) {
          console.error(err);
          resolved.push(null);
          failed.push(i + 1);
        }
      }

      // All or nothing: a client document that quietly omits a photo is worse
      // than one that was never produced.
      if (failed.length) {
        throw new Error(
          "Photo " + failed.join(", ") + " could not be prepared, so no PDF was saved."
        );
      }
      if (!isDetailRoute()) return;

      const doc = await KK.fittingPdf.generate({
        session: d.session,
        customer: d.customer || {},
        photos: d.photos,
        resolveImage: (photo) => resolved[d.photos.indexOf(photo)]
      });

      doc.save(KK.fittingPdf.buildFilename({ session: d.session, customer: d.customer || {} }));
      announceDetailStatus("PDF saved");
      showToast("PDF saved");
    } catch (err) {
      console.error(err);
      announceDetailStatus("PDF failed");
      showToast((err && err.message) || "Could not create the PDF");
    } finally {
      d.pdfBusy = false;
      if (isDetailRoute()) renderFittingDetail();
    }
  }

  /* ------------------------------ Photo viewer ----------------------------- */

  function openFittingPhotoViewer(photoId, originButton) {
    const d = detail();
    const photo = d.photos.filter((p) => p.id === photoId)[0];
    if (!photo || "unavailable" === fittingPhotoState(photo)) return;

    d.viewerReturn = originButton || null;
    elements.fittingPhotoViewerImage.src = fittingPhotoDisplayURL(photo);
    elements.fittingPhotoViewerImage.alt = photo.caption || "Fitting photo";
    elements.fittingPhotoViewerCaption.textContent = photo.caption || "";
    elements.fittingPhotoViewer.hidden = false;
    document.body.classList.add("has-modal");
    requestAnimationFrame(() => elements.fittingPhotoViewerClose.focus());
  }

  function closeFittingPhotoViewer() {
    if (elements.fittingPhotoViewer.hidden) return;
    const d = detail();
    elements.fittingPhotoViewer.hidden = true;
    elements.fittingPhotoViewerImage.removeAttribute("src");
    document.body.classList.remove("has-modal");
    if (d.viewerReturn && document.contains(d.viewerReturn)) d.viewerReturn.focus();
    d.viewerReturn = null;
  }

  /* --------------------------- Active-session actions ---------------------- */

  /* The capture, compression, and Drive archival path is the journal's; only
     the surface it renders into is this page's. */
  function fittingDetailBridge() {
    const d = detail();
    return {
      order: d.order,
      customer: d.customer,
      session: d.session,
      photos: d.photos,
      onToast: showToast,
      onChange: (sessionState) => {
        if (!isDetailRoute()) return;
        d.photos = sortFittingPhotos(sessionState.photos);
        sessionState.photos = d.photos;
        invalidateFittingFeed();
        renderFittingDetail();
      }
    };
  }

  /* Gallery first, and native: the studio adds photos it already took far more
     often than it shoots into the app, and the custom camera overlay cannot
     select several at once. The journal keeps the camera flow untouched. */
  function addFittingDetailPhoto() {
    const d = detail();
    if (!d.session) return;
    elements.fitdetPhotoInput.click();
  }

  /* Only a returned file opens the review page. A dismissed picker leaves this
     page exactly as it was, with nothing staged and no route change. */
  function detailPhotosPicked(fileList) {
    const d = detail();
    const files = Array.from(fileList || []);
    if (!files.length || !d.session) return;
    seedFittingPhotoAdd(files);
    go("#/fittings/" + encodeURIComponent(d.sessionId) + "/photos/add?source=" + d.source);
  }

  async function endFittingDetailSession() {
    const d = detail();
    if (!d.session || "active" !== d.session.status) return;
    d.bridge = d.bridge || fittingDetailBridge();
    KK.fittings.attachSession(d.bridge);

    await KK.fittings.endSession(d.session, async () => {
      if (!isDetailRoute()) return;
      try {
        d.session = await db.getFittingSession(d.sessionId);
      } catch (_) {
        d.session = Object.assign({}, d.session, {
          status: "completed",
          completed_at: new Date().toISOString()
        });
      }
      d.bridge.session = d.session;
      invalidateFittingFeed();
      go("#/order/" + encodeURIComponent(d.order.id));
      showToast("Fitting log saved");
    });
  }

  async function deleteFittingDetailLog() {
    const d = detail();
    if (!d.session || !d.order) return;
    const stage = U.fittingStage(d.session.stage).label;
    const name = orderLabel(d.order);
    if (!confirm('Delete the ' + stage + ' log for ' + name + '?\n\nThe log and photo records will disappear from the app. Drive archive copies will remain.')) return;
    elements.fitdetDeleteBtn.disabled = true;
    try {
      const retainedFeedHash = feed().retainHash;
      await db.deleteFittingSession(d.session.id);
      d.photos.forEach((photo) => KK.fittings.releaseLocalURL(photo.id));
      feed().items = feed().items.filter((item) => item.id !== d.session.id);
      invalidateFittingFeed();
      const destination = "order" === d.source ? "#/order/" + encodeURIComponent(d.order.id) : (retainedFeedHash || "#/fittings");
      cleanupFittingDetail();
      go(destination);
      showToast("Fitting log deleted");
    } catch (err) {
      console.error(err);
      elements.fitdetDeleteBtn.disabled = false;
      showToast((err && err.message) || "Could not delete fitting log");
    }
  }

  function cleanupFittingDetail() {
    const d = detail();
    d.loadToken++;
    d.phase = "idle";
    d.blobCache.clear();
    d.pdfBusy = false;
    d.sharingId = null;
    if (d.bridge) KK.fittings.detachSession(d.bridge);
    d.bridge = null;
    KK.fittings.closeAll();
    closeFittingPhotoViewer();
  }

  /* -------------------------------- Route entry ---------------------------- */

  async function showFittingLogDetail(sessionId, queryParams) {
    const d = detail();
    const token = ++d.loadToken;

    setChrome({ title: "Fitting log", save: false, fitdetailpage: true });
    setSaveBar(false);
    setDirty(false);

    d.phase = "loading";
    d.sessionId = sessionId;
    d.blobCache.clear();
    elements.fitdetBody.setAttribute("aria-busy", "true");
    elements.fitdetList.innerHTML = "";
    elements.fitdetState.innerHTML = "";
    elements.fitdetBar.hidden = true;
    elements.fitdetDeleteBtn.disabled = true;
    document.body.classList.remove("has-fitdet-bar");
    d.source = queryParams && "order" === queryParams.get("source") ? "order" : "feed";
    /* The originating order id only arrives with the session, so Back stays on
       the always-reachable feed for as long as this page is still loading. */
    elements.fitdetBackBtn.href = feed().retainHash || "#/fittings";

    let session;
    let order;
    let customer;
    let photos;
    try {
      session = await db.getFittingSession(sessionId);
      order = await db.getOrder(session.order_id);
      const res = await Promise.all([
        db.getCustomer(order.customer_id),
        db.listFittingPhotosBySession(sessionId)
      ]);
      customer = res[0];
      photos = sortFittingPhotos(res[1]);
    } catch (err) {
      console.error(err);
      if (token !== d.loadToken) return;
      // No broken shell is left behind: the route that cannot resolve returns
      // to the one that always can.
      showToast("That fitting log is no longer available");
      return go("#/fittings");
    }
    if (token !== d.loadToken || !isDetailRoute()) return;

    d.session = session;
    d.order = order;
    d.customer = customer;
    d.photos = photos;
    d.phase = "ready";
    d.bridge = fittingDetailBridge();
    elements.fitdetBackBtn.href = "order" === d.source ? "#/order/" + encodeURIComponent(order.id) : (feed().retainHash || "#/fittings");
    elements.fitdetDeleteBtn.disabled = false;
    KK.fittings.attachSession(d.bridge);

    renderFittingDetail();
  }

  /* ========================= Fitting photo editor ========================== */

  /* Temporary layout, permanent contract: caption, replacement, and deletion
     behave the same however this page is later redrawn. */

  function fittingEditorDirty() {
    const ed = editor();
    if (!ed.photo) return false;
    if (ed.staged || ed.uploaded) return true;
    return elements.fiteditCaption.value !== String(ed.photo.caption || "");
  }

  function syncFittingEditorDirty() {
    setDirty(fittingEditorDirty());
  }

  function renderFittingEditor() {
    const ed = editor();
    if (!ed.photo) return;

    const url = ed.staged ? ed.staged.url : fittingPhotoDisplayURL(ed.photo);
    if (url) {
      elements.fiteditPreview.src = url;
      elements.fiteditPreview.hidden = false;
    } else {
      elements.fiteditPreview.removeAttribute("src");
      elements.fiteditPreview.hidden = true;
    }

    const busy = ed.saving;
    elements.fiteditSaveBtn.disabled = busy;
    elements.fiteditSaveBtn.setAttribute("aria-busy", busy ? "true" : "false");
    $(".fitdet-bar__face", elements.fiteditSaveBtn).textContent = busy ? "Saving…" : "Save changes";
    elements.fiteditReplaceBtn.disabled = busy;
    elements.fiteditDeleteBtn.disabled = busy;
    elements.fiteditCaption.disabled = busy;
  }

  function clearStagedReplacement() {
    const ed = editor();
    if (ed.staged && ed.staged.url) URL.revokeObjectURL(ed.staged.url);
    ed.staged = null;
  }

  async function stageFittingReplacement(file) {
    const ed = editor();
    try {
      const prepared = await KK.fittings.prepareImage(file);
      if (!isEditorRoute()) return;
      clearStagedReplacement();
      // A staged replacement is only a picture on screen until Save succeeds;
      // the stored record and its Drive file are untouched until then.
      ed.staged = { blob: prepared, url: URL.createObjectURL(prepared) };
      ed.uploaded = null;
      renderFittingEditor();
      syncFittingEditorDirty();
      elements.fiteditStatus.textContent = "Replacement ready. Save changes to keep it.";
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not prepare that photo");
    }
  }

  /* Upload first, write once. The old record and its image stay usable until
     the single update lands, so a failed upload costs nothing, and a failed
     update can be retried without uploading a second copy. */
  async function saveFittingEditor() {
    const ed = editor();
    if (ed.saving || !ed.photo) return;

    const caption = elements.fiteditCaption.value.trim();
    if (!fittingEditorDirty()) {
      elements.fiteditStatus.textContent = "Nothing to save.";
      return;
    }

    ed.saving = true;
    renderFittingEditor();
    elements.fiteditStatus.textContent = ed.staged ? "Uploading the replacement…" : "Saving…";

    try {
      if (ed.staged && !ed.uploaded) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const result = await KK.db.driveSaveFittingPhoto(
          await KK.fittings.base64(ed.staged.blob),
          "image/jpeg",
          "Fitting-" + ed.photo.stage + "-" + timestamp + ".jpg",
          (ed.customer && ed.customer.name) || "Unnamed customer",
          (ed.order && (ed.order.title || ed.order.doc_name)) || "Untitled order",
          ed.photo.stage
        );
        ed.uploaded = { drive_file_id: result.file_id, drive_link: result.drive_link };
      }

      const patch = { caption: caption || null };
      if (ed.uploaded) {
        patch.drive_file_id = ed.uploaded.drive_file_id;
        patch.drive_link = ed.uploaded.drive_link;
      }
      const updated = await KK.db.updateFittingPhoto(ed.photo.id, patch);

      if (ed.staged) {
        KK.fittings.adoptLocalURL(updated.id, ed.staged.url);
        ed.staged = null; // ownership moved to the shared local-URL map
      }
      ed.photo = updated;
      ed.uploaded = null;
      invalidateFittingFeed();

      // The detail page holds this record too; update it in place so returning
      // does not need a second round trip.
      const d = detail();
      const idx = d.photos.findIndex((p) => p.id === updated.id);
      if (idx !== -1) {
        d.photos[idx] = updated;
        d.blobCache.delete(updated.id);
      }

      ed.saving = false;
      setDirty(false);
      showToast("Photo updated");
      leaveFormFor("#/fittings/" + encodeURIComponent(ed.sessionId) + "?source=" + ed.source);
    } catch (err) {
      console.error(err);
      ed.saving = false;
      renderFittingEditor();
      elements.fiteditStatus.textContent = "";
      showToast((err && err.message) || "Could not save those changes");
    }
  }

  async function deleteFittingEditorPhoto() {
    const ed = editor();
    if (ed.saving || !ed.photo) return;
    if (!window.confirm("Delete this photo from the fitting log? It disappears from the log, and its Google Drive archive copy is kept.")) return;

    ed.saving = true;
    renderFittingEditor();

    try {
      await db.deleteFittingPhoto(ed.photo.id);
      KK.fittings.releaseLocalURL(ed.photo.id);
      clearStagedReplacement();

      const d = detail();
      d.photos = d.photos.filter((p) => p.id !== ed.photo.id);
      d.blobCache.delete(ed.photo.id);
      if (d.bridge) d.bridge.photos = d.photos;
      invalidateFittingFeed();

      ed.saving = false;
      setDirty(false);
      showToast("Photo deleted");
      leaveFormFor("#/fittings/" + encodeURIComponent(ed.sessionId) + "?source=" + ed.source);
    } catch (err) {
      console.error(err);
      ed.saving = false;
      renderFittingEditor();
      showToast((err && err.message) || "Could not delete that photo");
    }
  }

  function cleanupFittingEditor() {
    const ed = editor();
    ed.loadToken++;
    clearStagedReplacement();
    ed.uploaded = null;
    ed.saving = false;
    ed.phase = "idle";
    ed.photo = null;
    elements.fiteditStatus.textContent = "";
    setDirty(false);
  }

  async function showFittingPhotoEditor(sessionId, photoId, queryParams) {
    const ed = editor();
    const token = ++ed.loadToken;
    const source = queryParams && "order" === queryParams.get("source") ? "order" : "feed";
    const detailHash = "#/fittings/" + encodeURIComponent(sessionId) + "?source=" + source;

    setChrome({ title: "Edit photo", save: false, fitdetailpage: true });
    setSaveBar(false);
    setDirty(false);

    clearStagedReplacement();
    ed.uploaded = null;
    ed.saving = false;
    ed.sessionId = sessionId;
    ed.source = source;
    ed.photoId = photoId;
    ed.photo = null;
    elements.fiteditStatus.textContent = "";
    elements.fiteditBackBtn.href = detailHash;

    let session;
    let photo;
    let order;
    let customer;
    try {
      const res = await Promise.all([db.getFittingSession(sessionId), db.getFittingPhoto(photoId)]);
      session = res[0];
      photo = res[1];

      // A photo id from another session is a wrong URL, not a permission story.
      if (photo.session_id !== session.id) {
        showToast("That photo belongs to a different fitting log");
        return go(detailHash);
      }

      order = await db.getOrder(session.order_id);
      customer = await db.getCustomer(order.customer_id);
    } catch (err) {
      console.error(err);
      if (token !== ed.loadToken) return;
      showToast("That photo is no longer available");
      return go(detailHash);
    }
    if (token !== ed.loadToken || !isEditorRoute()) return;

    ed.session = session;
    ed.photo = photo;
    ed.order = order;
    ed.customer = customer;
    ed.phase = "ready";

    elements.fiteditTitle.textContent = "Edit photo";
    elements.fiteditCaption.value = String(photo.caption || "");
    elements.fiteditBar.hidden = false;
    document.body.classList.add("has-fitedit-bar");
    renderFittingEditor();
    syncBottomBar();
  }

  /* ---------------------- Detail & editor event wiring --------------------- */

  function setupFittingDetailListeners() {
    const pressable = ".cust-nav-btn,.fitdet-action,.fitdet-bar__btn,.fitdet-delete,.fitedit-delete";

    [elements.viewFittingDetail, elements.viewFittingPhotoEdit, elements.viewFittingPhotoAdd].forEach((view) => {
      view.addEventListener("pointerdown", (e) => {
        const target = e.target.closest(pressable);
        if (target && !target.disabled) target.classList.add("is-pressed");
      });
      view.addEventListener("keydown", (e) => {
        if (" " !== e.key && "Enter" !== e.key) return;
        const target = e.target.closest(pressable);
        if (target && !target.disabled) target.classList.add("is-pressed");
      });
    });

    [elements.fitdetBar, elements.fiteditBar, elements.fitaddBar].forEach((bar) => {
      bar.addEventListener("pointerdown", (e) => {
        const target = e.target.closest(".fitdet-bar__btn");
        if (target && !target.disabled) target.classList.add("is-pressed");
      });
    });

    /* Back returns through history when the feed is the page behind this one,
       so its retained list and offset are restored instead of rebuilt. */
    elements.fitdetBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const d = detail();
      leaveFormFor("order" === d.source && d.order ? "#/order/" + encodeURIComponent(d.order.id) : (feed().retainHash || "#/fittings"));
    });

    elements.fiteditBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const ed = editor();
      leaveFormFor("#/fittings/" + encodeURIComponent(ed.sessionId || "") + "?source=" + ed.source);
    });

    elements.fitdetPdfBtn.addEventListener("click", downloadFittingPdf);
    elements.fitdetAddBtn.addEventListener("click", addFittingDetailPhoto);
    elements.fitdetPhotoInput.addEventListener("change", (e) => {
      const files = e.target.files;
      const picked = files && files.length ? Array.from(files) : [];
      e.target.value = "";
      detailPhotosPicked(picked);
    });
    elements.fitdetEndBtn.addEventListener("click", endFittingDetailSession);
    elements.fitdetDeleteBtn.addEventListener("click", deleteFittingDetailLog);

    elements.viewFittingDetail.addEventListener("click", (e) => {
      const opener = e.target.closest(".js-fitdet-open");
      if (opener) {
        openFittingPhotoViewer(opener.dataset.id, opener);
        return;
      }
      const sharer = e.target.closest(".js-fitdet-share");
      if (sharer && !sharer.disabled) shareFittingPhoto(sharer.dataset.id, sharer);
    });

    elements.fittingPhotoViewerClose.addEventListener("click", closeFittingPhotoViewer);

    elements.fiteditReplaceBtn.addEventListener("click", () => elements.fiteditFileInput.click());
    elements.fiteditFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) stageFittingReplacement(file);
    });
    elements.fiteditCaption.addEventListener("input", syncFittingEditorDirty);
    elements.fiteditSaveBtn.addEventListener("click", saveFittingEditor);
    elements.fiteditDeleteBtn.addEventListener("click", deleteFittingEditorPhoto);

    document.addEventListener("keydown", (e) => {
      if (elements.fittingPhotoViewer.hidden) return;
      trapModalFocus(e, elements.fittingPhotoViewer);
      if ("Escape" === e.key) {
        e.preventDefault();
        closeFittingPhotoViewer();
      }
    });
  }


  /* ========================== Add fitting photos ========================== */

  /* Figma 266:3522. A staging page: captions, deletions and selected files are
     local proposals until one atomic Save changes applies the whole batch
     through db.saveFittingPhotoBatch. Nothing here writes on its own, which is
     what makes Back a discard rather than a rollback. */

  const add = () => state.fittingPhotoAdd;
  const isAddRoute = () => !!state.route && "fittingPhotoAdd" === state.route.view;

  const FITTING_PHOTO_LIMIT = 20;
  const FITTING_UNDO_MS = 5000;

  const addDetailHash = () =>
    "#/fittings/" + encodeURIComponent(add().sessionId || "") + "?source=" + add().source;

  /* ------------------------------ Derived state ---------------------------- */

  const addVisibleExisting = () => add().existing.filter((photo) => !add().deleted.has(photo.id));
  const addVisibleCount = () => addVisibleExisting().length + add().newPhotos.length;
  const addRemainingSlots = () => Math.max(0, FITTING_PHOTO_LIMIT - addVisibleCount());

  function addCaptionFor(photo) {
    const a = add();
    return a.captionPatches.has(photo.id) ? a.captionPatches.get(photo.id) : String(photo.caption || "");
  }

  const addDraftByKey = (key) => add().newPhotos.filter((draft) => draft.clientKey === key)[0] || null;
  const addExistingById = (id) => add().existing.filter((photo) => photo.id === id)[0] || null;

  /* The value a card's editor would return to if it were cancelled right now. */
  function addSavedCaptionForKey(key) {
    const draft = addDraftByKey(key);
    if (draft) return draft.caption;
    const photo = addExistingById(key);
    return photo ? addCaptionFor(photo) : "";
  }

  function addDirty() {
    const a = add();
    if (a.newPhotos.length || a.deleted.size) return true;

    let changed = false;
    a.captionPatches.forEach((caption, id) => {
      const photo = addExistingById(id);
      if (photo && String(photo.caption || "") !== caption) changed = true;
    });
    if (changed) return true;

    a.openEditors.forEach((key) => {
      if (String(a.editorDrafts.get(key) || "") !== addSavedCaptionForKey(key)) changed = true;
    });
    return changed;
  }

  const syncAddDirty = () => setDirty(addDirty());

  function announceAddStatus(text) {
    const a = add();
    if (a.lastStatus === text) return;
    a.lastStatus = text;
    elements.fitaddStatus.textContent = text;
  }

  /* ------------------------------ Local drafts ----------------------------- */

  /* A draft has no database identity until Save changes returns, so it carries
     a page-local key instead. The load token is part of it so a response that
     belongs to an abandoned visit can never be matched to a live card. */
  function makeAddDraft(file) {
    const a = add();
    let sourceUrl = null;
    try {
      sourceUrl = URL.createObjectURL(file);
    } catch (_) {
      sourceUrl = null; // no raw preview; the prepared one still arrives
    }
    return {
      clientKey: "draft-" + a.loadToken + "-" + (++a.keySeq),
      file,
      sourceUrl,
      preparedBlob: null,
      preparedUrl: null,
      status: "queued", // queued | preparing | ready
      caption: ""
    };
  }

  /* keepPrepared is set exactly once: when KK.fittings.localURLs has adopted
     the prepared URL and revoking it here would blank a saved photo. */
  function releaseAddDraft(draft, keepPrepared) {
    if (draft.sourceUrl) URL.revokeObjectURL(draft.sourceUrl);
    draft.sourceUrl = null;
    if (!keepPrepared && draft.preparedUrl) URL.revokeObjectURL(draft.preparedUrl);
    if (!keepPrepared) draft.preparedUrl = null;
  }

  function removeAddDraft(draft) {
    const a = add();
    a.openEditors.delete(draft.clientKey);
    a.editorDrafts.delete(draft.clientKey);
    releaseAddDraft(draft, false);
    a.newPhotos = a.newPhotos.filter((entry) => entry !== draft);
  }

  /* Keeps the first files that fit and says how many it dropped, rather than
     refusing the whole selection over its tail. */
  function admitAddFiles(fileList) {
    const a = add();
    const files = Array.from(fileList || []);
    if (!files.length) return 0;

    const slots = addRemainingSlots();
    const accepted = files.slice(0, slots);
    const skipped = files.length - accepted.length;

    accepted.forEach((file) => a.newPhotos.push(makeAddDraft(file)));
    if (skipped) {
      showToast(
        skipped + (1 === skipped ? " photo was skipped" : " photos were skipped") +
        " — a fitting log holds at most " + FITTING_PHOTO_LIMIT + " photos."
      );
    }
    return accepted.length;
  }

  /* ------------------------- Sequential preparation ------------------------ */

  /* One image at a time. Twenty full-resolution phone photos decoded in
     parallel is how a mobile browser runs out of memory mid-selection; a
     second picker selection joins this queue instead of starting its own. */
  async function runAddPreparationQueue() {
    const a = add();
    if (a.preparing) return;
    const token = a.loadToken;
    a.preparing = true;

    try {
      for (;;) {
        const draft = a.newPhotos.filter((entry) => "queued" === entry.status)[0];
        if (!draft) break;

        draft.status = "preparing";
        a.preparingDone = a.newPhotos.filter((entry) => "ready" === entry.status).length;
        a.preparingTotal = a.newPhotos.length;
        patchAddDraftCard(draft);
        announceAddStatus("Preparing photo " + (a.preparingDone + 1) + " of " + a.preparingTotal);

        try {
          const blob = await KK.fittings.prepareImage(draft.file);
          if (token !== a.loadToken) return;
          draft.preparedBlob = blob;
          draft.preparedUrl = URL.createObjectURL(blob);
          draft.status = "ready";
          await patchAddDraftCard(draft);
          // The raw preview is only worth its memory until the prepared one is
          // on screen.
          if (draft.sourceUrl) {
            URL.revokeObjectURL(draft.sourceUrl);
            draft.sourceUrl = null;
          }
        } catch (err) {
          if (token !== a.loadToken) return;
          console.error(err);
          a.failedPreparationCount++;
          removeAddDraft(draft);
          renderFittingPhotoAdd();
        }
      }
    } finally {
      if (token === a.loadToken) {
        a.preparing = false;
        a.preparingDone = 0;
        a.preparingTotal = 0;
        reportAddPreparationFailures();
        renderFittingPhotoAdd();
        syncAddDirty();
      }
    }
  }

  /* One sentence for the batch, not one per file — and never called an upload
     failure, because none of this has reached Drive or Postgres yet. */
  function reportAddPreparationFailures() {
    const a = add();
    const failed = a.failedPreparationCount;
    if (!failed) {
      announceAddStatus(a.newPhotos.length ? a.newPhotos.length + " photo" + (1 === a.newPhotos.length ? "" : "s") + " ready" : "");
      return;
    }
    a.failedPreparationCount = 0;
    const copy = 1 === failed ? "1 photo couldn't be added." : failed + " photos couldn't be added.";
    announceAddStatus(copy);
    showToast(copy);

    // Nothing was selected, nothing exists, nothing was edited: this page has
    // no reason to stay open.
    if (!a.newPhotos.length && !addVisibleExisting().length && !addDirty() && isAddRoute()) {
      go(addDetailHash());
    }
  }

  /* ------------------------------- Undo toast ------------------------------ */

  function clearAddUndo() {
    const a = add();
    if (a.undoTimer) clearTimeout(a.undoTimer);
    a.undoTimer = null;
    a.undoPhotoId = null;
    elements.fitaddUndo.hidden = true;
    elements.fitaddUndoCopy.textContent = "";
  }

  function showAddUndo(photoId) {
    const a = add();
    clearAddUndo();
    a.undoPhotoId = photoId;
    elements.fitaddUndoCopy.textContent = "Photo removed. It is deleted when you save.";
    elements.fitaddUndo.hidden = false;
    a.undoTimer = setTimeout(() => {
      if (isAddRoute()) clearAddUndo();
    }, FITTING_UNDO_MS);
  }

  function undoAddDeletion() {
    const a = add();
    const photoId = a.undoPhotoId;
    if (!photoId || !a.deleted.has(photoId)) return clearAddUndo();

    // Restoring must not push the log over the ceiling a staged addition has
    // already claimed.
    if (addVisibleCount() >= FITTING_PHOTO_LIMIT) {
      showToast("Remove another photo first — a fitting log holds at most " + FITTING_PHOTO_LIMIT + " photos.");
      return;
    }

    a.deleted.delete(photoId);
    clearAddUndo();
    renderFittingPhotoAdd();
    syncAddDirty();
    announceAddStatus("Photo restored");

    const card = elements.fitaddList.querySelector('[data-key="' + cssEscapeAttr(photoId) + '"]');
    if (card) {
      const box = card.getBoundingClientRect();
      const offscreen = box.top < 0 || box.bottom > window.innerHeight;
      if (offscreen) card.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }

  // Ids and draft keys are uuids and "draft-n-n"; quoting them is enough.
  const cssEscapeAttr = (value) => String(value).replace(/["\\]/g, "\\$&");

  /* --------------------------------- Render -------------------------------- */

  function fitaddStageHtml(url, alt, eager, statusHtml) {
    if (!url) {
      return '<div class="fitadd-stage">' +
        '<div class="fitadd-stage__missing">' +
          '<b>Photo unavailable</b>' +
          '<span>No image on this device or in Drive. Its caption is kept.</span>' +
        '</div>' +
      '</div>';
    }
    return '<div class="fitadd-stage">' +
      '<img class="fitadd-stage__image" data-role="image" src="' + U.escapeHtml(url) + '" ' +
        'alt="' + U.escapeHtml(alt) + '" loading="' + (eager ? "eager" : "lazy") + '" decoding="async">' +
      (statusHtml || '') +
    '</div>';
  }

  function fitaddActionHtml(cls, key, kind, label, ariaLabel, iconSrc, disabled) {
    return '<button type="button" class="fitdet-action ' + cls + '" ' +
      'data-key="' + U.escapeHtml(key) + '" data-kind="' + kind + '"' + (disabled ? ' disabled' : '') + ' ' +
      'aria-label="' + U.escapeHtml(ariaLabel) + '">' +
      '<span class="fitdet-action__face">' +
        (iconSrc ? '<img src="' + iconSrc + '" alt="" width="20" height="20">' : '') +
        '<span>' + U.escapeHtml(label) + '</span>' +
      '</span>' +
      '<span class="fitdet-action__rail" aria-hidden="true"></span>' +
    '</button>';
  }

  function fitaddCardHtml(options) {
    const a = add();
    const key = options.key;
    const editing = a.openEditors.has(key);
    const caption = options.caption;
    const number = options.number;

    const busy = a.saving;

    const body = editing
      ? '<div class="fitadd-editor">' +
          '<label class="fitadd-editor__label" for="fitaddCaption-' + U.escapeHtml(key) + '">Caption</label>' +
          '<textarea class="fitadd-textarea" id="fitaddCaption-' + U.escapeHtml(key) + '" ' +
            'data-key="' + U.escapeHtml(key) + '" rows="2" enterkeyhint="done" ' +
            'placeholder="What changed in this fitting?" ' +
            'aria-label="Caption for photo ' + number + '">' +
            U.escapeHtml(String(a.editorDrafts.get(key) || "")) +
          '</textarea>' +
        '</div>'
      : caption
      ? '<p class="fitdet-card__caption">' + U.escapeHtml(caption) + '</p>'
      : '';

    const actions = editing
      ? fitaddActionHtml("fitadd-action--cancel js-fitadd-cancel", key, options.kind, "Cancel",
          "Cancel the caption for photo " + number, "", busy) +
        '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
        fitaddActionHtml("fitadd-action--save js-fitadd-save", key, options.kind, "Save",
          "Save the caption for photo " + number, "", busy)
      : fitaddActionHtml("js-fitadd-delete", key, options.kind, "Delete",
          "Delete photo " + number, "", busy || !options.canDelete) +
        '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
        fitaddActionHtml("js-fitadd-caption", key, options.kind, caption ? "Edit caption" : "Add caption",
          (caption ? "Edit the caption for photo " : "Add a caption to photo ") + number,
          "assets/fitlog-edit-icon.svg", busy || !options.canCaption);

    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitdet-inset" data-key="' + U.escapeHtml(key) + '" data-kind="' + options.kind + '">' +
        '<article class="fitdet-card">' + options.stage + body + '</article>' +
        '<div class="fitdet-actions">' + actions + '</div>' +
      '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  function fitaddDraftStatusHtml(draft) {
    if ("ready" === draft.status) return '';
    return '<p class="fitadd-stage__status">' +
      '<span class="fitadd-stage__dot" aria-hidden="true"></span>' +
      ("preparing" === draft.status ? "Preparing photo…" : "Waiting to prepare…") +
    '</p>';
  }

  function fitaddSkeletonHtml() {
    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitdet-inset">' +
        '<div class="fitdet-card"><i class="fitadd-skel__stage"></i></div>' +
        '<div class="fitdet-actions"><span class="fitadd-skel__actions"></span></div>' +
      '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  function fitaddStateHtml() {
    const a = add();
    if ("error" === a.phase) {
      return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
        '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
        '<div class="fitlog-inset">' +
          fittingPanelHtml(
            "Couldn't open this fitting log",
            U.escapeHtml((a.loadError && a.loadError.message) || "Check your connection and try again."),
            ' role="alert"',
            '<button type="button" class="fitlog-panel__retry js-fitadd-retry">Try again</button>'
          ) +
        '</div>' +
        '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
    }
    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitlog-inset">' +
        fittingPanelHtml("No photos in this fitting log", "Use Add photos below to choose the first ones.") +
      '</div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>';
  }

  /* Re-rendering the list replaces an open textarea, so its focus and caret are
     carried across rather than dropped mid-sentence. */
  function captureAddFocus() {
    const el = document.activeElement;
    if (!el || !el.matches || !el.matches(".fitadd-textarea")) return null;
    return { key: el.dataset.key, start: el.selectionStart, end: el.selectionEnd };
  }

  function restoreAddFocus(snapshot) {
    if (!snapshot) return;
    const el = elements.fitaddList.querySelector('.fitadd-textarea[data-key="' + cssEscapeAttr(snapshot.key) + '"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    try {
      el.setSelectionRange(snapshot.start, snapshot.end);
    } catch (_) {
      // Some browsers refuse a range on a field that is not yet laid out.
    }
    growAddTextarea(el);
  }

  function renderFittingPhotoAdd() {
    const a = add();

    if ("loading" === a.phase) {
      elements.fitaddBody.setAttribute("aria-busy", "true");
      elements.fitaddList.innerHTML = '<li class="fitdet-record">' + fitaddSkeletonHtml() + '</li>' +
        '<li class="fitdet-record">' + fitaddSkeletonHtml() + '</li>';
      elements.fitaddState.innerHTML = '';
      renderAddBar();
      return;
    }

    if ("error" === a.phase) {
      elements.fitaddBody.setAttribute("aria-busy", "false");
      elements.fitaddList.innerHTML = '';
      elements.fitaddState.innerHTML = fitaddStateHtml();
      renderAddBar();
      return;
    }

    const focusSnapshot = captureAddFocus();
    const visible = addVisibleExisting();
    const drafts = a.newPhotos;
    const total = visible.length + drafts.length;

    const existingHtml = visible.map((photo, index) => {
      const caption = addCaptionFor(photo);
      const number = index + 1;
      const url = fittingPhotoDisplayURL(photo);
      const alt = caption ? "Fitting photo: " + caption : "Fitting photo " + number;
      return '<li class="fitdet-record">' + fitaddCardHtml({
        key: photo.id,
        kind: "existing",
        number,
        caption,
        canDelete: true,
        canCaption: true,
        stage: fitaddStageHtml(url, alt, 0 === index, '')
      }) + '</li>';
    }).join('');

    // New photos land after the stored ones, in the order the picker returned.
    const draftHtml = drafts.map((draft, index) => {
      const number = visible.length + index + 1;
      const url = draft.preparedUrl || draft.sourceUrl || "";
      const alt = draft.caption ? "Selected photo: " + draft.caption : "Selected photo " + number;
      return '<li class="fitdet-record">' + fitaddCardHtml({
        key: draft.clientKey,
        kind: "new",
        number,
        caption: draft.caption,
        canDelete: true,
        canCaption: true,
        stage: fitaddStageHtml(url, alt, true, fitaddDraftStatusHtml(draft))
      }) + '</li>';
    }).join('');

    elements.fitaddBody.setAttribute("aria-busy", "false");
    elements.fitaddList.innerHTML = existingHtml + draftHtml;
    elements.fitaddState.innerHTML = total ? '' : fitaddStateHtml();

    elements.fitaddList.querySelectorAll(".fitadd-textarea").forEach(growAddTextarea);
    restoreAddFocus(focusSnapshot);
    renderAddBar();
  }

  /* One card, in place. Used while the queue runs so a background swap never
     remounts a neighbouring card or moves the scroll position. */
  async function patchAddDraftCard(draft) {
    const card = elements.fitaddList.querySelector('[data-kind="new"][data-key="' + cssEscapeAttr(draft.clientKey) + '"]');
    if (!card) return renderFittingPhotoAdd();

    const stage = $(".fitadd-stage", card);
    if (!stage) return;

    const status = $(".fitadd-stage__status", stage);
    const statusHtml = fitaddDraftStatusHtml(draft);
    if (status && !statusHtml) status.remove();
    else if (status && statusHtml) status.outerHTML = statusHtml;
    else if (statusHtml) stage.insertAdjacentHTML("beforeend", statusHtml);

    const url = draft.preparedUrl || draft.sourceUrl || "";
    const img = $(".fitadd-stage__image", stage);
    if (!url || !img || img.getAttribute("src") === url) return;

    // Only the pixels change: the same <img> keeps the same box, so the card
    // and the scroll position stay exactly where they were.
    if (!reducedMotion()) img.classList.add("is-swapping");
    const next = new Image();
    next.src = url;
    try {
      if (next.decode) await next.decode();
    } catch (_) {
      // A decode that refuses still has the normal load/error path below.
    }
    if (!document.contains(img)) return;
    img.src = url;
    img.classList.remove("is-swapping");
  }

  function renderAddBar() {
    const a = add();
    const ready = "ready" === a.phase;
    const slots = addRemainingSlots();

    elements.fitaddBar.hidden = !ready;
    document.body.classList.toggle("has-fitadd-bar", ready);

    elements.fitaddPickBtn.disabled = !ready || a.saving || a.admitting || !slots;
    elements.fitaddPickBtn.setAttribute(
      "aria-label",
      slots ? "Add photos" : "Add photos (this fitting log already holds " + FITTING_PHOTO_LIMIT + " photos)"
    );

    // An open editor keeps Save actionable on purpose: tapping it is how the
    // user is told which caption is still unsaved.
    elements.fitaddSaveBtn.disabled = !ready || a.saving || !(addDirty() || a.openEditors.size);
    elements.fitaddSaveBtn.setAttribute("aria-busy", a.saving ? "true" : "false");
    elements.fitaddSaveFace.textContent = a.saving ? "Saving…" : "Save changes";

    syncBottomBar();
  }

  /* ------------------------------ Card actions ----------------------------- */

  function growAddTextarea(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function openAddEditor(key) {
    const a = add();
    if (a.saving || a.openEditors.has(key)) return;
    a.openEditors.add(key);
    a.editorDrafts.set(key, addSavedCaptionForKey(key));
    renderFittingPhotoAdd();
    syncAddDirty();

    // Focus after the field is painted, or a mobile browser may open no
    // keyboard at all.
    requestAnimationFrame(() => {
      const el = elements.fitaddList.querySelector('.fitadd-textarea[data-key="' + cssEscapeAttr(key) + '"]');
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    });
  }

  function closeAddEditor(key, focusBack) {
    const a = add();
    a.openEditors.delete(key);
    a.editorDrafts.delete(key);
    renderFittingPhotoAdd();
    syncAddDirty();
    if (!focusBack) return;
    const btn = elements.fitaddList.querySelector('.js-fitadd-caption[data-key="' + cssEscapeAttr(key) + '"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  function saveAddEditor(key) {
    const a = add();
    if (a.saving) return;
    const value = String(a.editorDrafts.get(key) || "").trim();

    const draft = addDraftByKey(key);
    if (draft) {
      draft.caption = value;
    } else {
      const photo = addExistingById(key);
      if (!photo) return closeAddEditor(key, true);
      a.captionPatches.set(key, value);
    }
    closeAddEditor(key, true);
  }

  function deleteAddCard(key, kind) {
    const a = add();
    if (a.saving) return;

    if ("new" === kind) {
      const draft = addDraftByKey(key);
      if (!draft) return;
      // Nothing was ever stored, so there is nothing to undo.
      removeAddDraft(draft);
      renderFittingPhotoAdd();
      syncAddDirty();
      announceAddStatus("Photo removed");
      return;
    }

    const photo = addExistingById(key);
    if (!photo || a.deleted.has(key)) return;
    // Staged only: the row survives until Save changes, and its Drive archive
    // copy survives that too.
    a.deleted.set(key, { photo, originalIndex: a.existing.indexOf(photo) });
    a.openEditors.delete(key);
    a.editorDrafts.delete(key);
    showAddUndo(key);
    renderFittingPhotoAdd();
    syncAddDirty();
  }

  function focusFirstOpenAddEditor() {
    const el = $(".fitadd-textarea", elements.fitaddList);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    // One focus, after the scroll settles — not one animation per open editor.
    setTimeout(() => {
      if (document.contains(el)) el.focus({ preventScroll: true });
    }, reducedMotion() ? 0 : 280);
  }

  /* ------------------------------ Picker entry ----------------------------- */

  function addPhotosFromReview() {
    const a = add();
    if (a.saving || !addRemainingSlots()) return;
    elements.fitaddFileInput.click();
  }

  function addPhotosPicked(files) {
    const a = add();
    if (!files.length || "ready" !== a.phase) return;

    a.admitting = true;
    renderAddBar();
    const accepted = admitAddFiles(files);
    a.admitting = false;

    renderFittingPhotoAdd();
    syncAddDirty();
    if (accepted) runAddPreparationQueue();
    else renderAddBar();
  }

  /* --------------------------------- Saving -------------------------------- */

  /* One RPC for captions, deletions and insertions together. Drive is
     deliberately after the commit: uploading first would strand archive files
     whenever the Postgres transaction failed. */
  async function saveFittingPhotoAdd() {
    const a = add();
    if (a.saving || "ready" !== a.phase) return;

    if (a.openEditors.size) {
      showToast("Save your open captions first");
      announceAddStatus("A caption is still open");
      focusFirstOpenAddEditor();
      return;
    }
    if (a.preparing || a.newPhotos.some((draft) => "ready" !== draft.status)) {
      announceAddStatus("Photos are still being prepared");
      showToast("Still preparing photos — try again in a moment");
      return;
    }
    if (!addDirty()) {
      announceAddStatus("Nothing to save.");
      showToast("Nothing to save.");
      return;
    }

    const captionUpdates = [];
    a.captionPatches.forEach((caption, id) => {
      if (a.deleted.has(id)) return;
      const photo = addExistingById(id);
      if (!photo || String(photo.caption || "") === caption) return;
      captionUpdates.push({ id, caption: caption || null });
    });
    const deleteIds = Array.from(a.deleted.keys());
    const drafts = a.newPhotos.slice();
    const newPhotos = drafts.map((draft) => ({ client_key: draft.clientKey, caption: draft.caption || null }));

    const sessionId = a.sessionId;
    const source = a.source;

    a.saving = true;
    clearAddUndo();
    renderFittingPhotoAdd();
    announceAddStatus("Saving changes");

    let result;
    try {
      result = await db.saveFittingPhotoBatch(sessionId, captionUpdates, deleteIds, newPhotos);
    } catch (err) {
      console.error(err);
      // Every draft, caption and staged deletion survives for the retry.
      a.saving = false;
      renderFittingPhotoAdd();
      announceAddStatus("Save failed");
      showToast((err && err.message) || "Could not save those changes");
      return;
    }

    const photos = sortFittingPhotos((result && result.photos) || []);
    const created = (result && result.created) || [];

    /* Ownership of a prepared object URL moves to the shared map the moment its
       row exists, so the detail page shows the local image immediately and
       nothing here may revoke it afterwards. */
    const backups = [];
    created.forEach((entry) => {
      const draft = drafts.filter((item) => item.clientKey === entry.client_key)[0];
      if (!draft || !entry.photo) return;
      if (draft.preparedUrl) {
        KK.fittings.adoptLocalURL(entry.photo.id, draft.preparedUrl);
        draft.preparedUrl = null;
      }
      if (draft.preparedBlob) backups.push({ photo: entry.photo, blob: draft.preparedBlob });
    });
    drafts.forEach((draft) => releaseAddDraft(draft, false));

    const d = detail();
    if (d.sessionId === sessionId) {
      d.photos = photos;
      d.blobCache.clear();
      if (d.bridge) d.bridge.photos = photos;
    }
    invalidateFittingFeed();

    const backupContext = {
      order: a.order,
      customer: a.customer,
      session: a.session,
      photos: photos.slice(),
      onToast: showToast
    };

    a.newPhotos = [];
    a.captionPatches.clear();
    a.deleted.clear();
    a.openEditors.clear();
    a.editorDrafts.clear();
    a.existing = photos;
    a.saving = false;
    setDirty(false);

    const addedCount = created.length;
    go("#/fittings/" + encodeURIComponent(sessionId) + "?source=" + source);
    showToast(
      addedCount
        ? addedCount + (1 === addedCount ? " photo added" : " photos added")
        : "Fitting log updated"
    );

    startAddBackups(sessionId, backups, backupContext);
  }

  /* --------------------------- Drive backup handoff ------------------------ */

  /* The bridge attached before navigation is not necessarily the one the detail
     page is using afterwards, so settlement patches the page's own records and
     re-renders it directly rather than trusting object identity. */
  function applyAddBackupResult(sessionId, photo) {
    const d = detail();
    if (!photo || d.sessionId !== sessionId) return;
    const idx = d.photos.findIndex((entry) => entry.id === photo.id);
    if (-1 !== idx) d.photos[idx] = photo;
    if (d.bridge) d.bridge.photos = d.photos;
    if (isDetailRoute()) renderFittingDetail();
  }

  function startAddBackups(sessionId, entries, context) {
    if (!entries.length) return;

    const settled = entries.map((entry) =>
      KK.fittings.backupPhoto(entry.photo, { blob: entry.blob }, context).then(
        (updated) => {
          applyAddBackupResult(sessionId, updated);
          return true;
        },
        (err) => {
          console.error(err);
          // The record and its local image are durable; only the archive failed.
          applyAddBackupResult(sessionId, entry.photo);
          return false;
        }
      )
    );

    Promise.all(settled).then((results) => {
      const failures = results.filter((ok) => !ok).length;
      if (!failures) return;
      showToast(
        failures + (1 === failures ? " Drive backup failed" : " Drive backups failed") +
        ", but the photos are saved."
      );
    });
  }

  /* ------------------------------- Lifecycle ------------------------------- */

  function resetFittingPhotoAdd() {
    const a = add();
    a.loadToken++;
    a.newPhotos.forEach((draft) => releaseAddDraft(draft, false));
    a.newPhotos = [];
    a.captionPatches.clear();
    a.deleted.clear();
    a.openEditors.clear();
    a.editorDrafts.clear();
    a.existing = [];
    a.session = null;
    a.order = null;
    a.customer = null;
    a.phase = "idle";
    a.saving = false;
    a.preparing = false;
    a.admitting = false;
    a.preparingDone = 0;
    a.preparingTotal = 0;
    a.failedPreparationCount = 0;
    a.keySeq = 0;
    a.seeded = false;
    a.loadError = null;
    a.lastStatus = "";
    elements.fitaddStatus.textContent = "";
    clearAddUndo();
  }

  function cleanupFittingPhotoAdd() {
    resetFittingPhotoAdd();
    elements.fitaddBar.hidden = true;
    document.body.classList.remove("has-fitadd-bar");
    setDirty(false);
  }

  /* The detail page stages its selection here before navigating, so the review
     route can paint real previews on its first frame instead of flashing an
     empty list. */
  function seedFittingPhotoAdd(files) {
    const d = detail();
    resetFittingPhotoAdd();
    const a = add();
    a.sessionId = d.sessionId;
    a.session = d.session;
    a.order = d.order;
    a.customer = d.customer;
    a.source = d.source;
    a.existing = d.photos.slice();
    a.phase = "ready";
    a.seeded = true;
    admitAddFiles(files);
  }

  /* -------------------------------- Route entry ---------------------------- */

  async function showFittingPhotoAdd(sessionId, queryParams) {
    const a = add();
    const seeded = a.seeded && a.sessionId === sessionId;
    const source = queryParams && "order" === queryParams.get("source") ? "order" : "feed";

    setChrome({ title: "Add fitting photos", save: false, fitdetailpage: true });
    setSaveBar(false);

    if (seeded) {
      a.seeded = false;
      a.source = source;
      elements.fitaddBackBtn.href = addDetailHash();
      renderFittingPhotoAdd();
      syncAddDirty();
      runAddPreparationQueue();
      return;
    }

    resetFittingPhotoAdd();
    const token = a.loadToken;
    a.sessionId = sessionId;
    a.source = source;
    a.phase = "loading";
    elements.fitaddBackBtn.href = addDetailHash();
    elements.fitaddBar.hidden = true;
    document.body.classList.remove("has-fitadd-bar");
    renderFittingPhotoAdd();
    announceAddStatus("Loading this fitting log");

    let session;
    let order;
    let customer;
    let photos;
    try {
      session = await db.getFittingSession(sessionId);
      order = await db.getOrder(session.order_id);
      const res = await Promise.all([
        db.getCustomer(order.customer_id),
        db.listFittingPhotosBySession(sessionId)
      ]);
      customer = res[0];
      photos = sortFittingPhotos(res[1]);
    } catch (err) {
      console.error(err);
      if (token !== a.loadToken) return;
      // A permanent skeleton is the one outcome this page may not produce.
      a.phase = "error";
      a.loadError = err;
      renderFittingPhotoAdd();
      announceAddStatus("Could not open this fitting log");
      return;
    }
    if (token !== a.loadToken || !isAddRoute()) return;

    // One render once everything has resolved, rather than a list that grows a
    // card per response.
    a.session = session;
    a.order = order;
    a.customer = customer;
    a.existing = photos;
    a.phase = "ready";
    renderFittingPhotoAdd();
    syncAddDirty();
    announceAddStatus(
      photos.length
        ? photos.length + (1 === photos.length ? " photo in this fitting log" : " photos in this fitting log")
        : "This fitting log has no photos"
    );
  }

  /* ------------------------------ Event wiring ----------------------------- */

  function setupFittingPhotoAddListeners() {
    elements.fitaddBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      leaveFormFor(addDetailHash());
    });

    elements.fitaddPickBtn.addEventListener("click", addPhotosFromReview);
    elements.fitaddSaveBtn.addEventListener("click", saveFittingPhotoAdd);
    elements.fitaddUndoBtn.addEventListener("click", undoAddDeletion);

    elements.fitaddFileInput.addEventListener("change", (e) => {
      const files = e.target.files;
      const picked = files && files.length ? Array.from(files) : [];
      e.target.value = "";
      addPhotosPicked(picked);
    });

    elements.viewFittingPhotoAdd.addEventListener("click", (e) => {
      if (e.target.closest(".js-fitadd-retry")) {
        return showFittingPhotoAdd(add().sessionId, state.route && state.route.query);
      }
      const action = e.target.closest(".fitdet-action");
      if (!action || action.disabled) return;
      const key = action.dataset.key;
      const kind = action.dataset.kind;
      if (action.matches(".js-fitadd-delete")) deleteAddCard(key, kind);
      else if (action.matches(".js-fitadd-caption")) openAddEditor(key);
      else if (action.matches(".js-fitadd-cancel")) closeAddEditor(key, true);
      else if (action.matches(".js-fitadd-save")) saveAddEditor(key);
    });

    elements.fitaddList.addEventListener("input", (e) => {
      const el = e.target;
      if (!el.matches || !el.matches(".fitadd-textarea")) return;
      add().editorDrafts.set(el.dataset.key, el.value);
      growAddTextarea(el);
      syncAddDirty();
      renderAddBar();
    });

    /* A Drive thumbnail that 404s resolves to the reserved unavailable state
       instead of collapsing its <img>. Image errors do not bubble, so this
       listener runs in the capture phase. */
    elements.fitaddList.addEventListener("error", (e) => {
      const img = e.target;
      if (!img.matches || !img.matches(".fitadd-stage__image")) return;
      const stage = img.closest(".fitadd-stage");
      if (!stage) return;
      stage.innerHTML = '<div class="fitadd-stage__missing">' +
        '<b>Photo unavailable</b>' +
        '<span>No image on this device or in Drive. Its caption is kept.</span>' +
      '</div>';
    }, true);
  }

  function readableAnswer(fieldObj) {
    const val = fieldObj && fieldObj.value;
    if (null == val || "" === val) return "";
    if (!Array.isArray(val)) return "object" === typeof val ? JSON.stringify(val) : String(val);
    const opts = fieldObj.options || [];
    return val.map((id) => {
      const match = opts.filter((o) => o.id === id)[0];
      return match ? match.text : String(id);
    }).filter(Boolean).join(", ");
  }

  async function acceptEnquiry() {
    const enq = state.enquiry;
    if (enq && "new" === enq.status) {
      try {
        const createdCust = await db.createCustomer(
          Object.assign(
            {
              name: enq.name || "Unnamed enquiry",
              phone: enq.phone,
              instagram: enq.instagram,
              source: CUSTOMER_SOURCES.includes(enq.source) ? enq.source : "Other",
              wedding_date: enq.wedding_date,
              wedding_date_precision: "month" === enq.wedding_date_precision ? "month" : "day",
              notes: enq.notes
            },
            followUpPatch(CHECK_IN_CONFIG, U.todayISO())
          )
        );
        await db.resolveIntake(enq.id, "accepted", createdCust.id);
        state.customer = createdCust;
        state.customerOrders = [];
        await pushFollowUp();
        showToast("Customer created");
        leaveFormFor("#/customer/" + createdCust.id);
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not create the customer");
      }
    }
  }

  async function dismissEnquiry() {
    const enq = state.enquiry;
    if (enq && "new" === enq.status && window.confirm("Dismiss this enquiry? It stays on record but creates nothing.")) {
      try {
        await db.resolveIntake(enq.id, "dismissed", null);
        showToast("Enquiry dismissed");
        leaveFormFor("#/customers");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not dismiss the enquiry");
      }
    }
  }

  function renderCustomerList() {
    const query = elements.customerSearch.value.trim().toLowerCase();
    const filtered = state.customers
      .filter((c) => !query || [c.name, c.phone, c.instagram].some((val) => String(val || "").toLowerCase().includes(query)))
      .sort(compareHomepageCustomers);

    if (!filtered.length) {
      const searchVal = elements.customerSearch.value.trim();
      elements.customerList.innerHTML = state.customers.length
        ? '<p class="empty">No match for “' + U.escapeHtml(searchVal) + '”.</p><a class="btn btn--outline btn--new btn--block btn--empty" href="#/customer/new/edit?name=' + encodeURIComponent(searchVal) + '">+ Add “' + U.escapeHtml(searchVal) + '” as a new customer</a>'
        : '<p class="empty">No customers yet.</p>';
      return;
    }

    elements.customerList.innerHTML = filtered.map((c) => {
      const orders = state.overview.ordersByCustomer[c.id] || [];
      const sumTotal = orders.reduce((acc, o) => acc + docs.computeTotal(o.items), 0);
      const statusInfo = homepageStatus(c, orders);
      const metaText = orders.length + " order" + (1 === orders.length ? "" : "s");

      return '<div class="home-customer-record"><div class="home-grid-rule"></div><div class="home-customer-record__inset"><a class="home-customer-card home-customer-card--' + statusInfo.tone + '" href="#/customer/' + encodeURIComponent(c.id) + '" aria-label="' + U.escapeHtml((c.name || "Unnamed customer") + ", " + statusInfo.label) + '"><span class="home-customer-card__face"><span class="home-customer-card__top"><span class="home-customer-card__name">' + U.escapeHtml(c.name || "Unnamed customer") + '</span><span class="home-customer-card__badge">' + U.escapeHtml(statusInfo.label) + '</span></span>' + ("Cancelled" === statusInfo.label ? "" : '<span class="home-customer-card__meta"><span>' + U.escapeHtml(metaText) + '</span><span>' + U.formatRupiah(sumTotal) + '</span></span>') + '</span><span class="home-customer-card__rail"></span></a></div><div class="home-grid-rule"></div><div class="home-grid-spacer" aria-hidden="true"></div></div>';
    }).join('');
  }

  function homepageStatus(customerRecord, ordersList) {
    const orders = ordersList || [];
    if (customerRecord.cancelled_at) {
      return { label: "Cancelled", tone: "quiet", rank: 5 };
    }
    if (orders.some((o) => "In production" === o.status)) {
      return { label: "In production", tone: "production", rank: 0 };
    }
    if (orders.some((o) => "Confirmed" === o.status)) {
      return { label: "Invoice sent", tone: "invoice", rank: 1 };
    }
    if (orders.some((o) => "Quoted" === o.status)) {
      return { label: "Quote sent", tone: "invoice", rank: 2 };
    }
    if (orders.length) {
      return { label: "Finished", tone: "quiet", rank: 4 };
    }
    return { label: "In consultation", tone: "consultation", rank: 3 };
  }

  function compareHomepageCustomers(a, b) {
    const statusA = homepageStatus(a, state.overview.ordersByCustomer[a.id] || []);
    const statusB = homepageStatus(b, state.overview.ordersByCustomer[b.id] || []);
    if (statusA.rank !== statusB.rank) return statusA.rank - statusB.rank;

    const deadA = nextDeadline(a);
    const deadB = nextDeadline(b);
    const dateA = deadA ? deadA.date : "9999-12-31";
    const dateB = deadB ? deadB.date : "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const wedA = a.wedding_date || "9999-12-31";
    const wedB = b.wedding_date || "9999-12-31";
    if (wedA !== wedB) return wedA.localeCompare(wedB);

    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  }

  const isActive = (c) => !["Cancelled", "Completed"].includes(customerStatus(c, state.overview.ordersByCustomer[c.id]));

  function nextDeadline(customerRecord) {
    const today = U.todayISO();
    const list = [];
    if (customerRecord.wedding_date) list.push({ date: customerRecord.wedding_date, what: "Wedding" });
    if (customerRecord.follow_up_date) list.push({ date: customerRecord.follow_up_date, what: customerRecord.follow_up_label || "Follow up" });

    (state.overview.eventsByCustomer[customerRecord.id] || []).filter((e) => !e.end_date).forEach((e) => {
      list.push({ date: e.event_date, what: e.stage });
    });

    return list.filter((item) => item.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  }

  const relativeDays = (days) => (0 === days ? "today" : 1 === days ? "tomorrow" : "in " + days + " days");
  const firstName = (fullName) => (fullName || "").trim().split(/\s+/)[0] || "";

  const NEW_CUSTOMER_TEMPLATE = {
    id: null,
    name: "",
    phone: "",
    instagram: "",
    source: "",
    wedding_date: "",
    notes: ""
  };

  const daysUntil = (targetIso) => Math.round((new Date(targetIso) - new Date(U.todayISO())) / 86400000);
  const isApproximateWedding = (cust) => !(!cust || !cust.wedding_date || "month" !== cust.wedding_date_precision);

  function weddingText(cust) {
    if (!cust || !cust.wedding_date) return "Not set";
    return isApproximateWedding(cust)
      ? U.formatLongDate(cust.wedding_date).replace(/^\d+\s/, "") + " (approximate)"
      : U.formatShortDate(cust.wedding_date);
  }

  /* ---------------- Customer Detail & Edit Controller --------------- */

  async function showCustomerDetail(customerId) {
    if ("new" === customerId) {
      const hashVal = String(location.hash || "");
      const qIdx = hashVal.indexOf("?");
      return go("#/customer/new/edit" + (-1 === qIdx ? "" : hashVal.slice(qIdx)));
    }
    setChrome({ title: "Customer", up: { label: "Customers", hash: "#/customers" }, save: false, custpage: true });
    state.order = null;
    state.schedule = null;
    state.loggedDeposits = {};
    state.customerOrders = [];

    elements.custEditBtn.href = "#/customer/" + encodeURIComponent(customerId) + "/edit";
    elements.custOrderList.innerHTML = "";

    const res = await Promise.all([db.getCustomer(customerId), db.listOrders(customerId)]);
    state.customer = res[0];
    state.customerOrders = res[1];

    fillCustomerForm(res[0]);
    setDirty(false);
    renderCustomerDetail(res[0], res[1]);
    renderCustomerReadOnly(res[0]);
  }

  async function showCustomerEdit(customerId, queryParams) {
    const isNew = "new" === customerId;
    const backHash = isNew ? "#/customers" : "#/customer/" + encodeURIComponent(customerId);

    setChrome({
      title: isNew ? "New customer" : "Edit customer",
      up: { label: isNew ? "Customers" : "Customer", hash: backHash },
      save: true,
      custedit: true
    });

    state.order = null;
    state.schedule = null;
    state.loggedDeposits = {};
    state.customerOrders = [];

    elements.custEditCancel.href = backHash;
    elements.custEditTitle.textContent = isNew ? "New customer" : "Edit customer";

    if (isNew) {
      const initialName = String((queryParams && queryParams.get("name")) || "").trim();
      state.customer = Object.assign({}, NEW_CUSTOMER_TEMPLATE);
      if (initialName) state.customer.name = initialName;

      fillCustomerForm(state.customer);
      setDirty(!!initialName);

      elements.viewSub.hidden = true;
      elements.cancelCustomer.hidden = true;
      elements.reopenCustomer.hidden = true;
      elements.deleteCustomerRow.hidden = true;

      (initialName ? elements.cPhone : elements.cName).focus();
      return;
    }

    const res = await Promise.all([db.getCustomer(customerId), db.listOrders(customerId)]);
    state.customer = res[0];
    state.customerOrders = res[1];
    fillCustomerForm(res[0]);
    setDirty(false);
    renderCustomerReadOnly(res[0]);
  }

  function renderCustomerReadOnly(customerRecord) {
    const orders = openCustomerOrders();
    const statusVal = customerStatus(customerRecord, orders);
    elements.viewSub.innerHTML = '<span class="' + badgeClass(statusVal) + '">' + U.escapeHtml(statusVal) + '</span>';
    elements.viewSub.hidden = false;
    elements.cancelCustomer.hidden = !canCancel(customerRecord, orders);
    elements.reopenCustomer.hidden = !customerRecord.cancelled_at;
    elements.deleteCustomerRow.hidden = !customerRecord.id;
  }

  function custNextEvent(customerRecord, ordersList) {
    const today = U.todayISO();
    const events = [];

    if (customerRecord.follow_up_date) {
      events.push({ date: customerRecord.follow_up_date, what: customerRecord.follow_up_label || "Follow up" });
    }
    (ordersList || []).forEach((o) => {
      const anchor = productionAnchor(o);
      if (anchor) {
        calendar.computeProduction(anchor, customerRecord.wedding_date).events.forEach((evt) => {
          events.push({ date: evt.event_date, what: evt.stage });
        });
      }
    });
    if (customerRecord.wedding_date) {
      events.push({ date: customerRecord.wedding_date, what: "Wedding" });
    }

    return events.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  }

  function custOrderStatus(orderRecord) {
    const effStatus = effectiveStatus(orderRecord);
    if ("In production" === effStatus) return { label: "In production", tone: "production" };
    if ("Confirmed" === effStatus) return { label: "Invoice sent", tone: "invoice" };
    if ("Quoted" === effStatus) return { label: "Quote sent", tone: "invoice" };
    return { label: "Finished", tone: "quiet" };
  }

  function renderCustomerDetail(customerRecord, ordersList) {
    const orders = ordersList || [];
    elements.custHeroName.textContent = customerRecord.name || "Unnamed customer";

    // The feed shows the name the way Figma does, and scopes exactly by id so
    // two customers sharing a name cannot bleed into each other on first paint.
    const fittingName = customerRecord.name || "";
    elements.custFittingBanner.href = "#/fittings?q=" + encodeURIComponent(fittingName) +
      "&from=customer&customerId=" + encodeURIComponent(customerRecord.id || "");
    elements.custFittingBanner.setAttribute("aria-label", "Fitting logs for " + (fittingName || "this customer"));

    elements.custWeddingText.textContent = customerRecord.wedding_date
      ? (isApproximateWedding(customerRecord) ? weddingText(customerRecord) : U.formatShortDate(customerRecord.wedding_date)) + " (" + relativeToToday(customerRecord.wedding_date) + ")"
      : "Not set";

    const nextEvt = custNextEvent(customerRecord, orders);
    elements.custNextLabel.textContent = nextEvt ? "Next: " + nextEvt.what : "Next event";
    elements.custNextDate.textContent = nextEvt ? U.formatShortDate(nextEvt.date) + " (" + relativeToToday(nextEvt.date) + ")" : "Nothing scheduled";
    elements.custOrdersCount.textContent = orders.length + " order" + (1 === orders.length ? "" : "s");
    elements.custOrdersSum.textContent = U.formatRupiah(orders.reduce((sum, o) => sum + docs.computeTotal(o.items), 0));

    elements.custOrderList.innerHTML = orders.length
      ? orders.map((o) => {
          const st = custOrderStatus(o);
          const itemLen = (o.items || []).length;
          return '<div class="cust-grid-spacer" aria-hidden="true"></div><div class="cust-grid-rule"></div><div class="cust-order-record__inset"><a class="cust-order-card cust-order-card--' + st.tone + '" href="#/order/' + encodeURIComponent(o.id) + '" aria-label="' + U.escapeHtml(orderLabel(o) + ", " + st.label) + '"><span class="cust-order-card__face"><span class="cust-order-card__top"><span class="cust-order-card__name">' + U.escapeHtml(orderLabel(o)) + '</span><span class="cust-order-card__badge">' + U.escapeHtml(st.label) + '</span></span><span class="cust-order-card__meta"><span>' + itemLen + " item" + (1 === itemLen ? "" : "s") + '</span><span>' + U.formatRupiah(docs.computeTotal(o.items)) + '</span></span></span><span class="cust-order-card__rail" aria-hidden="true"></span></a></div><div class="cust-grid-rule"></div>';
        }).join('') + '<div class="cust-grid-spacer" aria-hidden="true"></div>'
      : '<div class="cust-grid-spacer" aria-hidden="true"></div><p class="empty">No orders for this customer yet.</p><div class="cust-grid-spacer" aria-hidden="true"></div>';
  }

  function relativeToToday(isoDate) {
    const diff = daysUntil(isoDate);
    if (diff >= 0) return relativeDays(diff);
    const abs = Math.abs(diff);
    return abs + (1 === abs ? " day" : " days") + " ago";
  }

  function fillCustomerForm(cust) {
    elements.cName.value = cust.name || "";
    elements.cPhone.value = cust.phone || "";
    elements.cInstagram.value = cust.instagram || "";
    elements.cSource.value = cust.source || "";
    elements.cNotes.value = cust.notes || "";
    elements.cWedding.value = cust.wedding_date || "";
    elements.cWeddingMonth.value = (cust.wedding_date || "").slice(0, 7);
    setWeddingPrecision("month" === cust.wedding_date_precision ? "month" : "day");
    elements.cMoodboardDate.value = cust.moodboard_date || "";
    elements.cFollowUpDate.value = cust.follow_up_date || "";
    elements.cFollowUpLabel.value = cust.follow_up_label || "";
    elements.cCancelledReason.value = cust.cancelled_reason || "";
    elements.cCancelledField.hidden = !cust.cancelled_at;
    setNameError(false);
  }

  function setNameError(isErr) {
    const cardEl = elements.cName.closest(".custedit-card");
    elements.cName.classList.toggle("is-invalid", isErr);
    if (cardEl) cardEl.classList.toggle("is-invalid", isErr);
    elements.cName.setAttribute("aria-invalid", String(!!isErr));
    elements.errCName.hidden = !isErr;
  }

  function setWeddingPrecision(prec) {
    const isMonth = "month" === prec;
    elements.cWedding.hidden = isMonth;
    elements.cWeddingMonth.hidden = !isMonth;
    $$(".custedit-segmented__btn", elements.cWeddingPrecision).forEach((btn) => {
      const active = ("month" === btn.dataset.precision) === isMonth;
      btn.classList.toggle("is-on", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  const weddingPrecision = () => elements.cWeddingMonth.hidden ? "day" : "month";

  function lastDayOfMonth(yearMonthStr) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonthStr || ""));
    if (!match) return null;
    const dateObj = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0));
    return calendar.fromDay(Math.round(dateObj.getTime() / 86400000));
  }

  async function saveCustomer() {
    if ("" === elements.cName.value.trim()) {
      setNameError(true);
      elements.cName.scrollIntoView({ block: "center", behavior: "smooth" });
      elements.cName.focus({ preventScroll: true });
      showToast("Add the customer name to save");
      return false;
    }

    const payload = (function () {
      const isMonth = "month" === weddingPrecision();
      return {
        name: elements.cName.value.trim(),
        phone: orNull(elements.cPhone.value),
        instagram: orNull(elements.cInstagram.value),
        source: orNull(elements.cSource.value),
        wedding_date: isMonth ? lastDayOfMonth(elements.cWeddingMonth.value) : orNull(elements.cWedding.value),
        wedding_date_precision: isMonth ? "month" : "day",
        moodboard_date: orNull(elements.cMoodboardDate.value),
        follow_up_date: orNull(elements.cFollowUpDate.value),
        follow_up_label: orNull(elements.cFollowUpLabel.value),
        cancelled_reason: orNull(elements.cCancelledReason.value),
        notes: orNull(elements.cNotes.value)
      };
    })();

    if (state.customer.id) {
      const prevCust = state.customer;
      state.customer = await db.updateCustomer(state.customer.id, payload);
      setDirty(false);

      if (prevCust.wedding_date !== state.customer.wedding_date) {
        await (async function () {
          try {
            const orders = await db.listOrders(state.customer.id);
            for (const o of orders) {
              if (!productionAnchor(o)) continue;
              const res = await rescheduleOrder(o, state.customer);
              if (res.changed) {
                await db.logOrderHistory(o.id, "scheduled", { count: res.rows.length, dropped: res.computed.dropped });
              }
            }
          } catch (err) {
            console.error(err);
            showToast("Saved, but the fitting schedules could not be rebuilt");
          }
        })();
      }

      if (prevCust.moodboard_date !== state.customer.moodboard_date) {
        await setFollowUp(consultNudgeFor(state.customer, openCustomerOrders()));
      } else if (prevCust.follow_up_date !== state.customer.follow_up_date || prevCust.follow_up_label !== state.customer.follow_up_label) {
        await pushFollowUp();
      }

      renderCustomerReadOnly(state.customer);
      showToast("Customer saved");
      leaveFormFor("#/customer/" + state.customer.id);
    } else {
      state.customer = await db.createCustomer(
        Object.assign(payload, payload.follow_up_date ? {} : followUpPatch(CHECK_IN_CONFIG, U.todayISO()))
      );
      setDirty(false);
      showToast("Customer created");
      leaveFormFor("#/customer/" + state.customer.id);
    }
    return true;
  }

  const scheduleFor = (orderRec, custRec, eventsList) =>
    calendar.computeSchedule(designAnchor(orderRec), productionAnchor(orderRec), custRec && custRec.wedding_date, calendar.pinsFrom(eventsList));

  /* ------------------ Order Detail ViewModel & UI ------------------ */

  function isCurrentOrderLoad(token, orderId) {
    return token === state.orderDetail.loadToken && !!state.route && "order" === state.route.view && state.route.id === orderId;
  }

  function clearOrderPresses() {
    elements.viewOrder.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
  }

  function closeOrderPaymentChooser() {
    elements.paymentChooser.classList.remove("is-open");
    elements.paymentChooser.hidden = true;
    elements.logPaymentBtn.setAttribute("aria-expanded", "false");
  }

  function beginOrderLoad(orderId) {
    const token = ++state.orderDetail.loadToken;
    state.orderDetail.phase = "loading";
    state.orderDetail.orderId = orderId;
    state.orderDetail.vm = null;
    state.orderDetail.sectionErrors = {};
    state.orderDetail.paymentBusy = false;
    state.orderDetail.documentBusy = null;

    clearOrderPresses();
    closeOrderPaymentChooser();

    elements.paymentError.hidden = true;
    elements.orderStage.setAttribute("aria-busy", "true");
    elements.orderStage.style.height = "";
    elements.orderLoadingStatus.textContent = "Loading order details.";
    elements.orderLoading.hidden = false;
    elements.orderLoading.classList.remove("is-transitioning", "is-hidden");
    elements.orderError.hidden = true;
    elements.orderError.innerHTML = "";
    elements.orderReady.hidden = true;
    elements.orderReady.classList.remove("is-transitioning", "is-visible", "is-measuring");

    return token;
  }

  function orderErrorCopy(err) {
    if (err && ("PGRST116" === err.code || /0 rows/i.test(err.message || ""))) return "This order no longer exists.";
    if (err instanceof TypeError) return "Could not load this order. Check your connection and try again.";
    if (db.isStaleToken(err)) return "Your session expired. Unlock the app and try again.";
    return err && err.message ? "Could not load this order. " + err.message : "Could not load this order. Try again in a moment.";
  }

  function renderOrderError(err, token, orderId, custId) {
    if (!isCurrentOrderLoad(token, orderId)) return;
    console.error(err);
    state.orderDetail.phase = "error";
    elements.orderLoading.hidden = true;
    elements.orderLoading.classList.remove("is-transitioning", "is-hidden");
    elements.orderReady.hidden = true;
    elements.orderStage.style.height = "";
    elements.orderStage.setAttribute("aria-busy", "false");
    elements.orderLoadingStatus.textContent = "";
    elements.orderError.hidden = false;

    elements.orderError.innerHTML =
      '<div class="order-error-panel">' +
      '<p class="order-error-panel__title">Could not open this order.</p>' +
      '<p class="order-error-panel__hint">' + U.escapeHtml(orderErrorCopy(err)) + '</p>' +
      '<div class="order-error-panel__actions">' +
      '<button type="button" class="order-error__btn js-order-retry">Try again</button>' +
      '<a class="order-error__btn order-error__btn--quiet" href="' + (custId ? "#/customer/" + encodeURIComponent(custId) : "#/customers") + '">' + (custId ? "Back to customer" : "Back to customers") + '</a>' +
      '</div></div>';

    const retryBtn = elements.orderError.querySelector(".js-order-retry");
    retryBtn.addEventListener("click", () => { showOrderDetail(orderId); });
    requestAnimationFrame(() => retryBtn.focus({ preventScroll: true }));
  }

  const orderFirstName = (fullName) => {
    const fName = String(fullName || "").trim().split(/\s+/)[0] || "";
    return fName ? "(" + fName + ")" : "Back";
  };

  function orderDateLabel(isoDate) {
    const fmt = U.formatShortDate(isoDate);
    if (!fmt) return "";
    return String(isoDate).slice(0, 4) === U.todayISO().slice(0, 4) ? fmt.replace(/\s\d{4}$/, "") : fmt;
  }

  function pushInto(mapObj, key, val) {
    const list = mapObj.get(key) || [];
    list.push(val);
    mapObj.set(key, list);
  }

  function deriveLoggedDeposits(historyList) {
    const result = {};
    (historyList || []).forEach((item) => {
      if ("payment_logged" !== item.action) return;
      const idx = item.detail && item.detail.deposit_index;
      if (null != idx) result[idx] = item.created_at;
    });
    return result;
  }

  function orderScheduleModel(orderDetailObj) {
    const eventMap = new Map();
    (orderDetailObj.events || []).filter((e) => calendar.isProductionStage(e.stage))
      .forEach((e) => eventMap.set(e.stage, e));

    const stageSessionMap = new Map();
    const sessionListMap = new Map();
    const photoListMap = new Map();

    (orderDetailObj.sessions || []).forEach((s) => {
      stageSessionMap.set(s.id, s.stage);
      pushInto(sessionListMap, s.stage, s);
    });

    (orderDetailObj.photos || []).forEach((p) => {
      const stageName = p.session_id && stageSessionMap.get(p.session_id) || p.stage;
      if (stageName) pushInto(photoListMap, stageName, p);
    });

    const records = calendar.PRODUCTION_STAGES.map((stageName) => {
      const e = eventMap.get(stageName) || null;
      const sessions = (sessionListMap.get(stageName) || []).slice().sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id))
      );
      const session = sessions[0] || null;
      const photos = (photoListMap.get(stageName) || []).filter((p) => !session || p.session_id === session.id);
      const week = e && calendar.plannedWeek(e.event_date);
      return {
        stage: stageName,
        sessionId: session && session.id,
        dateLabel: week ? U.formatShortDate(week.start) + " – " + U.formatShortDate(week.end) : "Not scheduled",
        completed: !!session && "completed" === session.status,
        photoCount: photos.length,
        thumbnails: photos.slice(0, 3).map((p) => KK.fittings.imageURL(p, 100)).filter(Boolean)
      };
    });

    const sched = scheduleFor(orderDetailObj.order, orderDetailObj.customer, orderDetailObj.events || []);
    return {
      records,
      message: sched.production.reason || sched.reason || "",
      warning: eventMap.size && isApproximateWedding(orderDetailObj.customer) ? "These dates are estimates until the exact wedding date is confirmed." : ""
    };
  }

  function buildOrderDetailViewModel(paramObj) {
    const ord = paramObj.order;
    const cust = paramObj.customer;
    const items = ord.items || [];
    const validItems = items.filter(isNamed);
    const totalAmount = docs.computeTotal(items);
    const costedItems = validItems.filter(isCosted);

    const estProfit = costedItems.reduce((acc, it) => acc + ((Number(it.price) || 0) - (Number(it.cost) || 0)) * (Number(it.qty) || 0), 0);
    const docName = String(ord.doc_name || (cust && cust.name) || "").trim();
    const canDownloadDocs = validItems.length > 0 && totalAmount > 0;
    const terms = docs.termsFor(ord);
    const termAmts = docs.termAmounts(totalAmount, terms);
    const deposits = paramObj.loggedDeposits || {};

    return {
      order: ord,
      customer: cust,
      title: orderLabel(ord),
      backHref: "#/customer/" + encodeURIComponent(ord.customer_id),
      backLabel: orderFirstName(cust && cust.name),
      editHref: "#/order/" + encodeURIComponent(ord.id) + "/edit",
      items: validItems.map((it) => ({
        name: String(it.name),
        qtyLabel: String(Number(it.qty) || 0),
        priceLabel: U.formatRupiah(it.price)
      })),
      total: totalAmount,
      totalLabel: U.formatRupiah(totalAmount),
      profit: {
        value: estProfit,
        label: costedItems.length ? U.formatRupiah(estProfit) : "—",
        caveat: costedItems.length
          ? (costedItems.length < validItems.length ? "Based on " + costedItems.length + " of " + validItems.length + " costed items." : "")
          : (validItems.length ? "No production costs filled in yet." : "")
      },
      documents: {
        canDownload: canDownloadDocs && "" !== docName,
        disabledReason: canDownloadDocs
          ? ("" !== docName ? "" : "Add the name for documents to enable downloads.")
          : "Add a priced item to enable downloads."
      },
      paymentsPriced: totalAmount > 0,
      paymentsUnknown: !!paramObj.paymentsUnknown,
      payments: terms.map((t, idx) => ({
        index: idx,
        label: t.label,
        amount: termAmts[idx],
        amountLabel: U.formatRupiah(termAmts[idx]),
        paidAt: deposits[idx] || null,
        paidDateLabel: deposits[idx] ? "Paid " + orderDateLabel(deposits[idx]) : ""
      })),
      schedule: orderScheduleModel(paramObj)
    };
  }

  function renderOrderItems(vm) {
    const rowsHtml = vm.items.map((it) =>
      '<div class="order-items__row"><span class="order-items__name" title="' + U.escapeHtml(it.name) + '">' + U.escapeHtml(it.name) + '</span><span class="order-items__qty">' + U.escapeHtml(it.qtyLabel) + '</span><span class="order-items__price">' + U.escapeHtml(it.priceLabel) + '</span></div>'
    ).join('');

    const caveatText = vm.profit.caveat;
    elements.oItemsDisplay.innerHTML =
      '<div class="order-items__row order-items__row--head"><span class="order-items__name">Name</span><span class="order-items__qty">Qty</span><span class="order-items__price">Price</span></div>' +
      (rowsHtml || '<p class="order-items__empty">No items yet. Tap edit to add one.</p>') +
      '<div class="order-items__rule" aria-hidden="true"></div>' +
      '<div class="order-items__totals"><div class="order-items__row order-items__row--total"><span class="order-items__name">Total</span><span class="order-items__price">' + U.escapeHtml(vm.totalLabel) + '</span></div><div class="order-items__row order-items__row--profit"><span class="order-items__name">Est. profit</span><span class="order-items__price"' + (caveatText ? ' title="' + U.escapeHtml(caveatText) + '"' : '') + '>' + U.escapeHtml(vm.profit.label) + '</span></div>' +
      (caveatText ? '<p class="sr-only">' + U.escapeHtml(caveatText) + '</p>' : '') +
      '</div>';
  }

  function renderOrderDocumentState(vm) {
    const enabled = vm.documents.canDownload && !state.orderDetail.documentBusy;
    elements.downloadQuote.disabled = !enabled;
    elements.downloadInvoice.disabled = !enabled;
    elements.downloadNote.textContent = vm.documents.disabledReason;
    elements.createMoodboardBtn.disabled = !state.order;
  }

  function renderOrderPayments(vm) {
    elements.paymentError.hidden = !elements.paymentError.textContent;
    if (!vm.paymentsPriced) {
      elements.paymentSummary.innerHTML = '<p class="order-items__empty">Price the items to work out the payment terms.</p>';
      elements.logPaymentBtn.disabled = true;
      $(".order-action__label", elements.logPaymentBtn).textContent = "Log a payment";
      closeOrderPaymentChooser();
      return;
    }

    elements.paymentSummary.innerHTML = vm.payments.map((p, idx) =>
      (idx ? '<div class="order-payments__rule" aria-hidden="true"></div>' : '') +
      '<div class="order-payment"><span class="order-payment__main"><span class="order-payment__head"><span class="order-payment__label">' + U.escapeHtml(p.label) + '</span>' +
      (p.paidAt ? '<img class="order-payment__tick" src="assets/order-tick-icon.svg" alt="" width="16" height="16">' : '') +
      '</span>' + (p.paidAt ? '<span class="order-payment__when">' + U.escapeHtml(p.paidDateLabel) + '</span>' : '<span class="sr-only">' + (vm.paymentsUnknown ? "Payment status unavailable" : "Outstanding") + '</span>') +
      '</span><span class="order-payment__amount">' + U.escapeHtml(p.amountLabel) + '</span></div>'
    ).join('');

    const unpaidCount = vm.payments.filter((p) => !p.paidAt).length;
    elements.logPaymentBtn.disabled = state.orderDetail.paymentBusy || !unpaidCount || vm.paymentsUnknown;
    $(".order-action__label", elements.logPaymentBtn).textContent = state.orderDetail.paymentBusy ? "Logging…" : unpaidCount ? "Log a payment" : "All payments logged";

    if (!unpaidCount || vm.paymentsUnknown) closeOrderPaymentChooser();
    if (!elements.paymentChooser.hidden) renderOrderPaymentChoices(vm);
  }

  function renderOrderPaymentChoices(vm) {
    elements.paymentChooserOptions.innerHTML = vm.payments
      .filter((p) => !p.paidAt)
      .map((p) =>
        '<button type="button" class="order-choice js-log-deposit" data-i="' + p.index + '"' + (state.orderDetail.paymentBusy ? ' disabled' : '') + '><span class="order-choice__face"><span>' + U.escapeHtml(p.label) + '</span><span>' + U.escapeHtml(p.amountLabel) + '</span></span><span class="order-choice__rail" aria-hidden="true"></span></button>'
      ).join('');
  }

  function renderOrderSchedule(vm) {
    const sched = vm.schedule || { records: [], message: "", warning: "" };
    const errors = state.orderDetail.sectionErrors || {};
    const errorHtml = (errors.events || errors.logs)
      ? '<div class="order-schedule__record"><div class="order-schedule__message" role="status">' +
        U.escapeHtml(errors.events && errors.logs ? "Could not load planned weeks or fitting logs." : errors.events ? "Could not load planned weeks; fitting logs are still shown." : "Could not load fitting logs; planned weeks are still shown.") +
        '<br><button type="button" class="order-schedule__retry js-order-schedule-retry">Retry</button></div></div><div class="order-schedule__spacer" aria-hidden="true"></div>'
      : '';

    elements.scheduleList.innerHTML =
      errorHtml + (sched.warning ? '<p class="order-schedule__warning">' + U.escapeHtml(sched.warning) + '</p>' : '') +
      sched.records.map((r) => {
        const dateStr = r.dateLabel || "Not scheduled";
        const noteStr = r.photoCount ? r.photoCount + " photo" + (1 === r.photoCount ? "" : "s") + " & notes logged" : "";
        const ariaLbl = [r.stage, dateStr, r.completed ? "saved" : "", noteStr, r.sessionId ? "Open fitting log" : "Start fitting log"].filter(Boolean).join(", ");
        const tag = r.sessionId ? "a" : "button";
        const target = r.sessionId
          ? ' href="#/fittings/' + encodeURIComponent(r.sessionId) + '?source=order"'
          : ' type="button" data-stage="' + U.escapeHtml(r.stage) + '"';

        return '<div class="order-schedule__record"><' + tag + target + ' class="order-schedule-record' + (r.photoCount ? ' order-schedule-record--photos' : '') + '" aria-label="' + U.escapeHtml(ariaLbl) + '"><span class="order-schedule-record__face"><span class="order-schedule-record__head"><span class="order-schedule-record__stage">' + U.escapeHtml(U.fittingStage(r.stage).label) + (r.completed ? '<img class="order-schedule-record__tick" src="assets/order-tick-icon.svg" alt="" width="16" height="16">' : '') + '</span><span class="order-schedule-record__date">' + U.escapeHtml(dateStr) + '</span></span>' + (r.photoCount ? '<span class="order-schedule-record__rule" aria-hidden="true"></span><span class="order-schedule-record__photos"><span class="order-schedule-record__thumbs">' + r.thumbnails.map((t) => '<img class="order-schedule-record__thumb" src="' + U.escapeHtml(t) + '" alt="" width="32" height="32" loading="lazy" onerror="this.style.visibility=\'hidden\'">').join('') + '</span><span class="order-schedule-record__count">' + U.escapeHtml(noteStr) + '</span></span>' : '') + '</span><span class="order-schedule-record__rail" aria-hidden="true"></span></' + tag + '></div>';
      }).join('<div class="order-schedule__spacer" aria-hidden="true"></div>') +
      '<div class="order-schedule__spacer" aria-hidden="true"></div>';
  }

  function renderOrderReady(vm) {
    state.orderDetail.vm = vm;
    elements.orderBackBtn.href = vm.backHref;
    elements.orderBackLabel.textContent = vm.backLabel;
    elements.orderBackBtn.setAttribute("aria-label", "Back to " + (vm.customer && vm.customer.name || "customer"));
    elements.orderEditBtn.href = vm.editHref;
    elements.orderTitle.textContent = vm.title;

    renderOrderItems(vm);
    renderOrderDocumentState(vm);
    renderOrderPayments(vm);
    renderOrderSchedule(vm);

    elements.orderReady.hidden = false;
    elements.orderReady.classList.add("is-measuring");
  }

  async function revealOrder(token) {
    await (document.fonts && document.fonts.ready || Promise.resolve());
    await new Promise((res) => requestAnimationFrame(res));
    if (!isCurrentOrderLoad(token, state.orderDetail.orderId)) return;

    elements.orderStage.style.height = Math.ceil(elements.orderReady.getBoundingClientRect().height || elements.orderReady.scrollHeight) + "px";
    elements.orderReady.classList.remove("is-measuring");
    elements.orderReady.classList.add("is-transitioning");
    elements.orderLoading.classList.add("is-transitioning");

    requestAnimationFrame(() => {
      if (isCurrentOrderLoad(token, state.orderDetail.orderId)) {
        elements.orderReady.classList.add("is-visible");
        elements.orderLoading.classList.add("is-hidden");
      }
    });

    setTimeout(() => {
      if (isCurrentOrderLoad(token, state.orderDetail.orderId)) {
        elements.orderLoading.hidden = true;
        elements.orderLoading.classList.remove("is-transitioning", "is-hidden");
        elements.orderReady.classList.remove("is-transitioning", "is-visible");
        elements.orderStage.style.height = "";
        elements.orderStage.setAttribute("aria-busy", "false");
        elements.orderLoadingStatus.textContent = "";
        state.orderDetail.phase = "ready";
      }
    }, reducedMotion() ? 0 : 180);
  }

  async function showOrderDetail(orderId) {
    setChrome({ title: "Order", up: { label: "Customers", hash: "#/customers" }, save: false, destroy: "order", orderpage: true });
    setDirty(false);
    const token = beginOrderLoad(orderId);

    let ordRec, custRec;
    try {
      ordRec = await db.getOrder(orderId);
      if (!isCurrentOrderLoad(token, orderId)) return;
      custRec = await db.getCustomer(ordRec.customer_id);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      return renderOrderError(err, token, orderId, ordRec && ordRec.customer_id);
    }

    if (!isCurrentOrderLoad(token, orderId)) return;
    state.order = ordRec;
    state.customer = custRec;

    let historyList = null;
    let historyErr = false;
    try {
      historyList = await db.listOrderHistory(orderId);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      console.error(err);
      historyErr = true;
    }
    if (!isCurrentOrderLoad(token, orderId)) return;

    let eventsList = [];
    let sessionsList = [];
    let photosList = [];
    const fittingParts = await Promise.allSettled([
      db.listOrderEvents(orderId), db.listFittingSessions(orderId), db.listFittingPhotos(orderId)
    ]);
    fittingParts.forEach((part) => { if ("rejected" === part.status) console.error(part.reason); });
    if ("fulfilled" === fittingParts[0].status) eventsList = fittingParts[0].value;
    if ("fulfilled" === fittingParts[1].status) sessionsList = fittingParts[1].value;
    if ("fulfilled" === fittingParts[1].status && "fulfilled" === fittingParts[2].status) photosList = fittingParts[2].value;

    if (!isCurrentOrderLoad(token, orderId)) return;

    state.loggedDeposits = deriveLoggedDeposits(historyList);
    state.schedule = { computed: scheduleFor(ordRec, custRec, eventsList), rows: eventsList };
    state.orderDetail.sectionErrors = {
      events: "rejected" === fittingParts[0].status,
      logs: "rejected" === fittingParts[1].status || "rejected" === fittingParts[2].status
    };
    elements.paymentError.textContent = "";

    renderOrderReady(
      buildOrderDetailViewModel({
        order: ordRec,
        customer: custRec,
        loggedDeposits: state.loggedDeposits,
        paymentsUnknown: historyErr,
        events: eventsList,
        sessions: sessionsList,
        photos: photosList
      })
    );
    await revealOrder(token);
  }

  async function refreshOrderPayments() {
    const currentOrderId = state.orderDetail.orderId;
    if (!currentOrderId || !state.order || state.order.id !== currentOrderId) return;

    let historyList = null;
    let historyErr = false;
    try {
      historyList = await db.listOrderHistory(currentOrderId);
    } catch (err) {
      console.error(err);
      historyErr = true;
    }
    if (state.orderDetail.orderId !== currentOrderId) return;

    state.loggedDeposits = deriveLoggedDeposits(historyList);
    const existingVm = state.orderDetail.vm;
    const newVm = buildOrderDetailViewModel({
      order: state.order,
      customer: state.customer,
      loggedDeposits: state.loggedDeposits,
      paymentsUnknown: historyErr,
      events: (state.schedule && state.schedule.rows) || [],
      sessions: [],
      photos: []
    });

    if (existingVm) newVm.schedule = existingVm.schedule;
    state.orderDetail.vm = newVm;

    renderOrderItems(newVm);
    renderOrderDocumentState(newVm);
    renderOrderPayments(newVm);
  }

  async function refreshOrderSchedule() {
    const currentOrderId = state.orderDetail.orderId;
    if (!currentOrderId || !state.order || state.order.id !== currentOrderId) return;

    try {
      const settled = await Promise.allSettled([db.listOrderEvents(currentOrderId), db.listFittingSessions(currentOrderId), db.listFittingPhotos(currentOrderId)]);
      if (state.orderDetail.orderId !== currentOrderId) return;
      settled.forEach((part) => { if ("rejected" === part.status) console.error(part.reason); });
      const previous = state.orderDetail.vm && state.orderDetail.vm.schedule;
      const events = "fulfilled" === settled[0].status ? settled[0].value : [];
      const sessions = "fulfilled" === settled[1].status ? settled[1].value : [];
      const photos = "fulfilled" === settled[1].status && "fulfilled" === settled[2].status ? settled[2].value : [];
      state.orderDetail.sectionErrors = {
        events: "rejected" === settled[0].status,
        logs: "rejected" === settled[1].status || "rejected" === settled[2].status
      };
      state.schedule = { computed: scheduleFor(state.order, state.customer, events), rows: events };

      const schedModel = orderScheduleModel({
        order: state.order,
        customer: state.customer,
        events: state.orderDetail.sectionErrors.events && previous ? [] : events,
        sessions,
        photos
      });

      if (state.orderDetail.vm) {
        state.orderDetail.vm.schedule = schedModel;
        renderOrderSchedule(state.orderDetail.vm);
      } else {
        renderOrderSchedule({ schedule: schedModel });
      }
    } catch (err) {
      console.error(err);
      state.orderDetail.sectionErrors = { events: true, logs: true };
      renderOrderSchedule(state.orderDetail.vm || {});
    }
  }

  function retryOrderSchedule() {
    elements.scheduleList.innerHTML = '<div class="order-schedule__record"><div class="order-schedule__message">Loading the schedule…</div></div>';
    state.orderDetail.sectionErrors = {};
    refreshOrderSchedule();
  }

  function toggleOrderPaymentChooser() {
    const vm = state.orderDetail.vm;
    if (!vm || elements.logPaymentBtn.disabled) return;
    if (!elements.paymentChooser.hidden) return closeOrderPaymentChooser();

    renderOrderPaymentChoices(vm);
    elements.paymentChooser.hidden = false;
    elements.logPaymentBtn.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => elements.paymentChooser.classList.add("is-open"));
  }

  function setOrderPaymentBusy(isBusy) {
    state.orderDetail.paymentBusy = isBusy;
    elements.logPaymentBtn.setAttribute("aria-busy", isBusy ? "true" : "false");
    const vm = state.orderDetail.vm;
    if (vm) {
      if (!elements.paymentChooser.hidden) renderOrderPaymentChoices(vm);
      renderOrderPayments(vm);
    }
  }

  function renderScheduleHint() {
    const paramObj = {
      payment_scheme: elements.oScheme.value,
      first_payment_date: elements.oFirstPayment.value,
      second_payment_date: elements.oSecondPayment.value
    };

    const sched = calendar.computeSchedule(
      designAnchor(paramObj),
      productionAnchor(paramObj),
      state.customer && state.customer.wedding_date,
      calendar.pinsFrom(state.schedule && state.schedule.rows)
    );

    const hints = [];
    hints.push(
      sched.design.events.length
        ? "Design phase " + U.formatShortDate(sched.design.events[0].event_date) + " – " + U.formatShortDate(sched.design.events[0].end_date)
        : sched.design.reason
    );
    hints.push(
      sched.production.events.length
        ? sched.production.events.length + " appointments from " + U.formatShortDate(sched.production.events[0].event_date) + " to the wedding"
        : sched.production.reason
    );

    const warns = (sched.production.events.length && sched.production.warnings || []).map((w) => w.replace(/\.$/, ""));

    elements.oScheduleHint.innerHTML =
      '<ul class="hintbox__list">' +
      hints.map((h) => '<li>' + U.escapeHtml(h.replace(/\.$/, "")) + '</li>').join('') +
      warns.map((w) => '<li class="hintbox__warn">' + U.escapeHtml(w) + '</li>').join('') +
      '</ul>';
  }

  async function rescheduleOrder(orderRecord, customerRecord) {
    const existingEvents = await db.listOrderEvents(orderRecord.id);
    const sched = scheduleFor(orderRecord, customerRecord, existingEvents);
    const phases = [
      { stages: calendar.DESIGN_STAGES, result: sched.design },
      { stages: calendar.PRODUCTION_STAGES, result: sched.production }
    ];

    let currentEvents = existingEvents;
    const removedEvents = [];

    for (const phase of phases) {
      const stageEvents = existingEvents.filter((e) => -1 !== phase.stages.indexOf(e.stage));
      if (phase.result.missingAnchor && stageEvents.length) continue;

      const res = await db.replaceOrderEvents(orderRecord.id, phase.result.events, phase.stages);
      removedEvents.push.apply(removedEvents, res.removed);
      currentEvents = res.events;
    }

    const googleEventIds = removedEvents.map((e) => e.google_event_id).filter(Boolean);
    if (googleEventIds.length) {
      try {
        await db.googleForget(googleEventIds);
      } catch (err) {
        console.error("Dropped events left in Google Calendar:", err);
      }
    }

    const eventKey = (e) => e.stage + "@" + e.event_date + (e.end_date ? "→" + e.end_date : "");
    return {
      computed: sched,
      changed: existingEvents.map(eventKey).sort().join("|") !== currentEvents.map(eventKey).sort().join("|"),
      rows: currentEvents
    };
  }

  /* ---------------- Order Editor & Cost Calculator ----------------- */

  const OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.file"
  ].join(" ");

  const googleRedirectUri = () => location.origin + location.pathname;

  function connectGoogle() {
    const clientId = (window.KK_CONFIG || {}).GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      elements.gcalErr.hidden = false;
      elements.gcalErr.textContent = 'No GOOGLE_CLIENT_ID in config.js — see “Google Calendar” in the README.';
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleRedirectUri(),
      response_type: "code",
      scope: OAUTH_SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true"
    });
    location.href = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  }

  async function showCalendarSettings() {
    setChrome({ title: "Google Calendar", up: { label: "Customers", hash: "#/customers" }, save: false });
    elements.gcalErr.hidden = true;
    elements.gcalConnect.hidden = true;
    elements.gcalDisconnect.hidden = true;
    elements.gcalState.textContent = "Checking…";

    let statusRes;
    try {
      statusRes = await db.googleStatus();
    } catch (err) {
      console.error(err);
      elements.gcalState.textContent = "Could not reach the calendar service.";
      elements.gcalErr.hidden = false;
      elements.gcalErr.textContent = err.message || "";
      elements.gcalConnect.hidden = false;
      return;
    }

    state.googleConnected = !(!statusRes || !statusRes.connected);
    elements.gcalState.textContent = state.googleConnected
      ? "Connected" + (statusRes.connected_at ? " since " + U.formatShortDate(String(statusRes.connected_at).slice(0, 10)) : "") + "."
      : "Not connected. Fitting dates stay in this app until you connect.";

    elements.gcalConnect.hidden = state.googleConnected;
    elements.gcalDisconnect.hidden = !state.googleConnected;
  }

  async function disconnectGoogle() {
    if (window.confirm("Disconnect Google Calendar? Events already created stay where they are.")) {
      try {
        await db.googleDisconnect();
        state.googleConnected = false;
        showToast("Disconnected");
        await showCalendarSettings();
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not disconnect");
      }
    }
  }

  async function saveOrder() {
    if (!validateTerms()) return false;

    const itemsPayload = readItems().filter(isNamed).map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      cost: it.cost
    }));

    const schemeVal = "other" === elements.oScheme.value ? "other" : "standard";

    state.order = await db.updateOrder(state.order.id, {
      title: orNull(elements.oTitle.value),
      doc_name: orNull(elements.oDocName.value),
      items: itemsPayload,
      includes: checkedIncludes(),
      payment_scheme: schemeVal,
      payment_terms: "other" === schemeVal ? readTerms() : [],
      first_payment_date: orNull(elements.oFirstPayment.value),
      second_payment_date: orNull(elements.oSecondPayment.value),
      final_payment_date: orNull(elements.oFinalPayment.value)
    });

    setDirty(false);

    try {
      await db.logOrderHistory(state.order.id, "updated", {});
    } catch (err) {
      console.error(err);
    }

    try {
      const res = await rescheduleOrder(state.order, state.customer);
      if (res.changed) {
        await db.logOrderHistory(state.order.id, "scheduled", { count: res.rows.length, dropped: res.computed.dropped });
      }
    } catch (err) {
      console.error(err);
      showToast("Saved, but the schedule could not be rebuilt");
    }

    return true;
  }

  function validateTerms() {
    elements.errTerms.hidden = true;
    if ("other" !== elements.oScheme.value) return true;
    const terms = readTerms();
    if (!terms.length) return showTermsError("Add at least one payment term.");
    if (terms.some((t) => !t.label)) return showTermsError("Every term needs a label.");
    if (terms.some((t) => null == t.percent || t.percent <= 0)) return showTermsError("Every term needs a share above 0%.");

    const totalPct = roundPct(termsTotal(terms));
    if (100 !== totalPct) return showTermsError("The shares add up to " + totalPct + "%. They have to add up to 100%.");

    return true;
  }

  function addItemRow(itemData, focusNew) {
    const rowEl = (function (data) {
      const it = data || { name: "", qty: 1, price: "", cost: "" };
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML =
        '<div class="item__head"><span class="item__idx"></span><button type="button" class="item__remove js-remove" aria-label="Remove item">' + SVG_TRASH + '</button></div>' +
        '<label class="field"><span class="field__label">Description</span><input class="input js-name" type="text" placeholder="e.g. Bridal skirt"></label>' +
        '<div class="item__row2"><label class="field field--qty"><span class="field__label">Qty</span><input class="input js-qty" type="text" inputmode="numeric" value="1"></label><label class="field field--price"><span class="field__label">Price</span><span class="prefixed"><span class="prefix">Rp</span><input class="input js-price" type="text" inputmode="numeric" placeholder="0"></span></label></div>' +
        '<span class="item__sum js-sum"></span>' +
        '<label class="field"><span class="field__label">Est. production cost <span class="tag">Internal</span></span><div class="costfield-row"><span class="prefixed"><span class="prefix">Rp</span><input class="input js-cost" type="text" inputmode="numeric" placeholder="0"></span><button type="button" class="js-cost-calc calc-trigger" aria-label="Break down cost"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/></svg></button></div><span class="field__hint js-costhint"></span></label>' +
        '<span class="err js-err" hidden></span>';

      $(".js-name", el).value = it.name || "";
      $(".js-qty", el).value = null == it.qty ? 1 : it.qty;
      $(".js-price", el).value = "" === it.price || null == it.price ? "" : U.groupDigits(it.price);
      $(".js-cost", el).value = "" === it.cost || null == it.cost ? "" : U.groupDigits(it.cost);
      return el;
    })(itemData);

    elements.itemList.appendChild(rowEl);
    refreshRemoveButtons();
    refreshItemTotals();
    if (focusNew) $(".js-name", rowEl).focus();
    return rowEl;
  }

  const MARGIN_TARGET_PCT = 0.35;

  function refreshItemTotals() {
    let grandTotal = 0;
    readItems().forEach((it) => {
      const lineTotal = it.qty * it.price;
      grandTotal += lineTotal;

      const sumEl = $(".js-sum", it.row);
      if (sumEl) sumEl.textContent = it.qty > 1 && it.price > 0 ? U.formatRupiah(lineTotal) : "";

      const hintEl = $(".js-costhint", it.row);
      if (hintEl) {
        const costHint = (function (priceVal, costVal) {
          if (!priceVal) return { text: "", over: false };
          const maxCost = Math.round(priceVal * MARGIN_TARGET_PCT);
          return costVal > maxCost
            ? { text: U.formatRupiah(costVal - maxCost) + " over the 35% target", over: true }
            : { text: "Keep under " + U.formatRupiah(maxCost) + " (35% of price)", over: false };
        })(it.price, it.cost);

        hintEl.textContent = costHint.text;
        hintEl.classList.toggle("field__hint--over", costHint.over);
      }
    });
    elements.itemsTotal.textContent = grandTotal > 0 ? U.formatRupiah(grandTotal) : "";
  }

  const rowElements = () => $$(".item", elements.itemList);

  function refreshRemoveButtons() {
    const rows = rowElements();
    rows.forEach((r) => {
      $(".js-remove", r).disabled = rows.length <= 1;
    });
  }

  function readItems() {
    return rowElements().map((r) => ({
      row: r,
      name: $(".js-name", r).value.trim(),
      qtyRaw: U.digitsOnly($(".js-qty", r).value),
      priceRaw: U.digitsOnly($(".js-price", r).value),
      costRaw: U.digitsOnly($(".js-cost", r).value),
      get qty() { return "" === this.qtyRaw ? 0 : Number(this.qtyRaw); },
      get price() { return "" === this.priceRaw ? 0 : Number(this.priceRaw); },
      get cost() { return "" === this.costRaw ? 0 : Number(this.costRaw); }
    }));
  }

  function customChip(labelStr, isChecked) {
    return (
      '<span class="chip chip--custom' + (isChecked ? ' is-checked' : '') + '" data-label="' + U.escapeHtml(labelStr) + '">' +
      '<label class="chip__main"><input type="checkbox"' + (isChecked ? ' checked' : '') + '><span class="chip__box">' + SVG_CHECK + '</span><span>' + U.escapeHtml(labelStr) + '</span></label>' +
      '<button type="button" class="chip__remove js-remove-include" aria-label="Remove ' + U.escapeHtml(labelStr) + '">' + SVG_CLOSE + '</button>' +
      '</span>'
    );
  }

  const checkedIncludes = () => $$(".chip", elements.includesList).filter((el) => $("input", el).checked).map((el) => el.dataset.label);

  function addCustomInclude() {
    const textVal = elements.customInclude.value.trim().replace(/\s+/g, " ");
    if (!textVal) return;

    const existingIdx = $$("[data-label]", elements.includesList)
      .map((el) => el.dataset.label)
      .findIndex((lbl) => lbl.toLowerCase() === textVal.toLowerCase());

    if (-1 !== existingIdx) {
      const chipEl = $$(".chip", elements.includesList)[existingIdx];
      $("input", chipEl).checked = true;
      chipEl.classList.add("is-checked");
      elements.customInclude.value = "";
      setDirty(true);
      showToast('"' + textVal + '" is already on the list');
      return;
    }

    elements.includesList.insertAdjacentHTML("beforeend", customChip(textVal, true));
    elements.customInclude.value = "";
    elements.customInclude.focus();
    setDirty(true);
  }

  function addTermRow(termData, focusNew) {
    const termEl = (function (data) {
      const t = data || { label: "", percent: "", desc: "" };
      const el = document.createElement("div");
      el.className = "term";
      el.innerHTML =
        '<div class="item__head"><span class="term__idx"></span><button type="button" class="item__remove js-remove-term" aria-label="Remove term">' + SVG_TRASH + '</button></div>' +
        '<div class="term__row"><label class="field term__namefield"><span class="field__label">Label</span><input class="input js-tlabel" type="text" maxlength="40" placeholder="e.g. Down payment"></label><label class="field term__pctfield"><span class="field__label">Share</span><span class="prefixed prefixed--suffix"><input class="input js-tpct" type="text" inputmode="decimal" placeholder="0"><span class="suffix">%</span></span></label></div>' +
        '<label class="field"><span class="field__label">Description (optional)</span><input class="input js-tdesc" type="text" maxlength="120" placeholder="Printed under the share on the quotation"></label>';

      $(".js-tlabel", el).value = t.label || "";
      $(".js-tpct", el).value = "" === t.percent || null == t.percent ? "" : String(t.percent);
      $(".js-tdesc", el).value = t.desc || "";
      return el;
    })(termData);

    elements.termList.appendChild(termEl);
    refreshTermRemoveButtons();
    refreshTermsSum();
    if (focusNew) $(".js-tlabel", termEl).focus();
    return termEl;
  }

  const termRowElements = () => $$(".term", elements.termList);

  function refreshTermRemoveButtons() {
    const terms = termRowElements();
    terms.forEach((t) => {
      $(".js-remove-term", t).disabled = terms.length <= 1;
    });
  }

  const parsePercent = (valStr) => {
    const cleaned = String(valStr || "").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    return "" === cleaned || "." === cleaned ? null : Number(cleaned);
  };

  function readTerms() {
    return termRowElements().map((el) => ({
      label: $(".js-tlabel", el).value.trim(),
      percent: parsePercent($(".js-tpct", el).value),
      desc: $(".js-tdesc", el).value.trim()
    }));
  }

  const termsTotal = (termsList) => termsList.reduce((acc, t) => acc + (t.percent || 0), 0);
  const roundPct = (num) => Math.round(100 * num) / 100;

  function refreshTermsSum() {
    const sumVal = roundPct(termsTotal(readTerms()));
    const diff = roundPct(100 - sumVal);
    elements.termsSum.textContent = "Shares total " + sumVal + "%" + (0 === diff ? "" : diff > 0 ? " — " + diff + "% short" : " — " + -diff + "% over");
    elements.termsSum.classList.toggle("termsum--off", 0 !== diff);
  }

  function showTermsError(msg) {
    elements.errTerms.textContent = msg;
    elements.errTerms.hidden = false;
    elements.termsCard.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  }

  function buildTerms(orderRecord) {
    elements.termList.innerHTML = "";
    const termsList = (orderRecord && orderRecord.payment_terms) || [];
    const initialList = termsList.length ? termsList : [
      { label: "Down payment", percent: 50, desc: "" },
      { label: "Final payment", percent: 50, desc: "" }
    ];
    initialList.forEach((t) => addTermRow(t, false));
  }

  function syncSchemeCard() {
    elements.termsCard.hidden = "other" !== elements.oScheme.value;
    if (!elements.termsCard.hidden && !termRowElements().length) {
      buildTerms(null);
    }
    elements.errTerms.hidden = true;
    refreshTermsSum();
  }

  const COST_CALC_PRESETS = ["Fabric", "Tailor", "Transport", "Dry Cleaning"];

  function addCalcRow(rowObj, focusNew) {
    const calcEl = (function (data) {
      const el = document.createElement("div");
      el.className = "calcrow";
      el.innerHTML =
        '<button type="button" class="calcrow__remove js-remove-calcrow" aria-label="Remove category">' + SVG_CLOSE + '</button>' +
        '<label class="field calcrow__label"><span class="field__label">Category</span><input class="input js-clabel" type="text" maxlength="40" placeholder="e.g. Fabric"></label>' +
        '<label class="field calcrow__amount"><span class="field__label">Amount</span><span class="prefixed"><span class="prefix">Rp</span><input class="input js-camount" type="text" inputmode="numeric" placeholder="0"></span></label>';

      $(".js-clabel", el).value = (data && data.label) || "";
      $(".js-camount", el).value = data && data.amount ? U.groupDigits(data.amount) : "";
      return el;
    })(rowObj);

    elements.calcRowList.appendChild(calcEl);
    refreshCalcRemoveButtons();
    refreshCalcTotal();
    if (focusNew) $(".js-clabel", calcEl).focus();
    return calcEl;
  }

  const calcRowElements = () => $$(".calcrow", elements.calcRowList);

  function refreshCalcRemoveButtons() {
    const rows = calcRowElements();
    rows.forEach((r) => {
      $(".js-remove-calcrow", r).disabled = rows.length <= 1;
    });
  }

  function readCalcRows() {
    return calcRowElements().map((r) => ({
      label: $(".js-clabel", r).value.trim(),
      amountRaw: U.digitsOnly($(".js-camount", r).value),
      get amount() { return "" === this.amountRaw ? 0 : Number(this.amountRaw); }
    }));
  }

  function refreshCalcTotal() {
    const totalVal = readCalcRows().reduce((acc, r) => acc + r.amount, 0);
    elements.calcTotal.textContent = U.formatRupiah(totalVal);
    return totalVal;
  }

  const calcStateMap = new WeakMap();
  let activeCalcItemRow = null;
  let activeCalcFocusTarget = null;

  function closeCostCalc() {
    if (activeCalcItemRow) {
      calcStateMap.set(
        activeCalcItemRow,
        readCalcRows().map((r) => ({ label: r.label, amount: r.amount }))
      );
    }
    elements.calcSheet.hidden = true;
    document.body.classList.remove("has-app-modal");
    activeCalcItemRow = null;
    if (activeCalcFocusTarget && document.contains(activeCalcFocusTarget)) {
      activeCalcFocusTarget.focus();
    }
    activeCalcFocusTarget = null;
  }

  function applyCostCalc() {
    const totalVal = refreshCalcTotal();
    $(".js-cost", activeCalcItemRow).value = U.groupDigits(totalVal);
    refreshItemTotals();
    setDirty(true);
    showToast("Cost updated");
    closeCostCalc();
  }

  /* ------------------- Moodboard Integration ------------------- */

  let activeMoodboardOrderId = null;
  let activeMoodboardFocusTarget = null;
  let isMoodboardExportBusy = false;

  let moodboardPresenterState = null;
  let isMoodboardOverlayBusy = false;

  let moodboardResizeObserver = null;

  const MB_EXPORTS = {
    drive: { el: "mbUpload", idle: "Upload", busy: "Uploading…", done: "Uploaded" },
    download: { el: "mbDownload", idle: "Download", busy: "Preparing PDF…", done: "Downloaded" }
  };

  const MB_EXPORT_TIMERS = {};
  const MB_RECONNECT_REGEX = /not connected|revoked|reconnect|stored credential|not configured on the server/i;
  const MB_MAX_ZOOM = 5;

  function setupMoodboardListeners() {
    const dropzoneEl = $("#mbDropzone");
    const fileInputEl = $("#mbFileInput");
    const addMoreBtn = $("#mbAddMore");
    const generateBtn = $("#mbGenerate");
    const thumbsEl = $("#mbThumbs");

    let dragCounter = 0;

    elements.viewMoodboard.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".order-nav-btn,.moodboard-action,.moodboard-strip");
      if (btn && !btn.disabled) btn.classList.add("is-pressed");
    });

    elements.viewMoodboard.addEventListener("keydown", (e) => {
      if (" " !== e.key && "Enter" !== e.key) return;
      const btn = e.target.closest(".order-nav-btn,.moodboard-action,.moodboard-strip");
      if (btn && !btn.disabled) {
        btn.classList.add("is-pressed");
        if (btn.matches("#mbFileBtn")) e.preventDefault();
      }
    });

    elements.viewMoodboard.addEventListener("click", (e) => {
      if (e.target.closest("#mbFileBtn")) e.preventDefault();
    });

    dropzoneEl.addEventListener("click", (e) => {
      if (!isMoodboardExportBusy && !e.target.closest(".mb-thumb__remove") && e.target.closest(".mb-upload-cell--empty")) {
        fileInputEl.click();
      }
    });

    addMoreBtn.addEventListener("click", () => fileInputEl.click());
    fileInputEl.addEventListener("change", async () => {
      if (fileInputEl.files.length) await addMoodboardFiles(fileInputEl.files);
      fileInputEl.value = "";
    });

    dropzoneEl.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      dropzoneEl.classList.add("is-over");
    });

    dropzoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzoneEl.classList.add("is-over");
    });

    dropzoneEl.addEventListener("dragleave", () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropzoneEl.classList.remove("is-over");
      }
    });

    dropzoneEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropzoneEl.classList.remove("is-over");
      if (!isMoodboardExportBusy && e.dataTransfer.files.length) {
        await addMoodboardFiles(e.dataTransfer.files);
      }
    });

    thumbsEl.addEventListener("click", (e) => {
      const rmBtn = e.target.closest(".mb-thumb__remove");
      if (rmBtn) KK.moodboard.removeImage(Number(rmBtn.dataset.i));
    });

    generateBtn.addEventListener("click", openMoodboardCanvas);

    elements.mbRandomize.addEventListener("click", () => {
      if (!isMoodboardOverlayBusy) {
        KK.moodboard.randomize();
        syncMoodboardCanvas();
      }
    });

    elements.mbRotate.addEventListener("click", () => {
      if (!isMoodboardOverlayBusy) {
        KK.moodboard.toggleOrientation();
        syncMoodboardCanvas();
      }
    });

    elements.mbBoard.addEventListener("click", openMoodboardOverlay);
    elements.mbOverlayClose.addEventListener("click", closeMoodboardOverlay);

    elements.mbUpload.addEventListener("click", () => exportMoodboard("drive"));
    elements.mbDownload.addEventListener("click", () => exportMoodboard("download"));

    bindMoodboardOverlayGestures(elements.mbOverlayCanvas);
  }

  async function addMoodboardFiles(filesList) {
    if (isMoodboardExportBusy) return;

    const loadingTextEl = $("#mbLoadingText");
    const addMoreBtn = $("#mbAddMore");
    const generateBtn = $("#mbGenerate");

    const batchCount = Math.min(Array.from(filesList).length, KK.moodboard.MAX_IMAGES - KK.moodboard.images.length);
    isMoodboardExportBusy = true;

    loadingTextEl.textContent = batchCount > 1 ? "Preparing 1 of " + batchCount + " photos…" : "Preparing photo…";
    addMoreBtn.disabled = true;
    generateBtn.disabled = true;

    await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));

    try {
      const result = await KK.moodboard.addFiles(filesList, (curr, total) => {
        loadingTextEl.textContent = total > 1 ? "Preparing " + curr + " of " + total + " photos…" : "Preparing photo…";
      });

      if (result.rejected) {
        showToast(1 === result.rejected ? "One image could not be opened and was skipped" : result.rejected + " images could not be opened and were skipped");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not prepare those photos — " + (err.message || "please try again"));
    } finally {
      isMoodboardExportBusy = false;
      loadingTextEl.textContent = "";
      addMoreBtn.disabled = KK.moodboard.images.length >= KK.moodboard.MAX_IMAGES;
      generateBtn.disabled = 0 === KK.moodboard.images.length;
    }
  }

  function openMoodboardCanvas() {
    if (KK.moodboard.images.length) {
      go("#/order/" + state.order.id + "/moodboard/preview");
    }
  }

  function moodboardStageClone() {
    const stage = KK.moodboard.stage;
    if (!stage) return null;
    const clone = stage.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  function syncMoodboardCanvas() {
    if (elements.mbCanvas.hidden) return;
    const stageClone = moodboardStageClone();
    if (!stageClone) return;

    const isPortrait = "portrait" === KK.moodboard.orientation;

    elements.mbBoardScaler.style.width = KK.moodboard.stageWidth + "px";
    elements.mbBoardScaler.style.height = KK.moodboard.stageHeight + "px";
    elements.mbBoardScaler.replaceChildren(stageClone);

    fitMoodboardBoard();

    elements.mbRotate.setAttribute("aria-label", isPortrait ? "Rotate to landscape" : "Rotate to portrait");
    elements.mbBoard.setAttribute(
      "aria-label",
      isPortrait
        ? "Open the portrait moodboard full screen"
        : "Open the landscape moodboard full screen. It is shown sideways here — turn your device to read it upright."
    );

    if (!moodboardResizeObserver && typeof ResizeObserver === "function") {
      moodboardResizeObserver = new ResizeObserver(fitMoodboardBoard);
      moodboardResizeObserver.observe(elements.mbBoard);
    }
    renderMoodboardOverlay(true);
  }

  function fitMoodboardBoard() {
    const w = elements.mbBoard.clientWidth;
    const h = elements.mbBoard.clientHeight;
    if (!w || !h) return;

    const isPortrait = "portrait" === KK.moodboard.orientation;
    const scale = isPortrait
      ? Math.min(w / KK.moodboard.stageWidth, h / KK.moodboard.stageHeight)
      : Math.min(h / KK.moodboard.stageWidth, w / KK.moodboard.stageHeight);

    elements.mbBoardScaler.style.transform = "translate(-50%, -50%) " + (isPortrait ? "" : "rotate(90deg) ") + "scale(" + scale + ")";
  }

  function openMoodboardOverlay() {
    if (isMoodboardOverlayBusy || !KK.moodboard.images.length || !elements.mbOverlay.hidden) return;
    activeMoodboardFocusTarget = document.activeElement;
    elements.mbOverlay.hidden = false;

    document.body.classList.add("moodboard-presenting");
    document.body.classList.add("has-app-modal");

    moodboardPresenterState = {
      zoom: 1,
      x: 0,
      y: 0,
      fit: 1,
      clone: null,
      pointers: new Map(),
      lastDistance: null,
      lastTap: 0
    };

    requestAnimationFrame(() => {
      renderMoodboardOverlay(true);
      elements.mbOverlayClose.focus();
    });
  }

  function closeMoodboardOverlay() {
    const overlay = elements.mbOverlay;
    const isVisible = overlay && !overlay.hidden;
    if (overlay) overlay.hidden = true;

    elements.mbOverlayCanvas.replaceChildren();
    document.body.classList.remove("moodboard-presenting");
    document.body.classList.remove("has-app-modal");

    moodboardPresenterState = null;
    if (isVisible && activeMoodboardFocusTarget && document.contains(activeMoodboardFocusTarget)) {
      activeMoodboardFocusTarget.focus();
    }
    activeMoodboardFocusTarget = null;
  }

  function renderMoodboardOverlay(rebuild) {
    if (!moodboardPresenterState || elements.mbOverlay.hidden) return;
    const rect = elements.mbOverlayCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    moodboardPresenterState.fit = Math.min(rect.width / KK.moodboard.stageWidth, rect.height / KK.moodboard.stageHeight) * 0.94;

    if (rebuild) {
      const stageClone = moodboardStageClone();
      if (!stageClone) return;
      stageClone.style.cssText =
        "position:absolute;left:50%;top:50%;width:" + KK.moodboard.stageWidth + "px;height:" + KK.moodboard.stageHeight + "px;transform-origin:50% 50%;pointer-events:none;";
      elements.mbOverlayCanvas.replaceChildren(stageClone);
      moodboardPresenterState.clone = stageClone;
    }

    clampMoodboardPan();
    applyMoodboardTransform();
  }

  function moodboardZoomAt(newZoom, originX, originY) {
    if (!moodboardPresenterState) return;
    const clampedZoom = Math.max(1, Math.min(MB_MAX_ZOOM, newZoom));
    if (clampedZoom === moodboardPresenterState.zoom) return;

    const scaleFactor = clampedZoom / moodboardPresenterState.zoom;
    if (void 0 === originX) {
      moodboardPresenterState.x *= scaleFactor;
      moodboardPresenterState.y *= scaleFactor;
    } else {
      const rect = elements.mbOverlayCanvas.getBoundingClientRect();
      const offsetX = originX - (rect.left + rect.width / 2);
      const offsetY = originY - (rect.top + rect.height / 2);
      moodboardPresenterState.x = offsetX - (offsetX - moodboardPresenterState.x) * scaleFactor;
      moodboardPresenterState.y = offsetY - (offsetY - moodboardPresenterState.y) * scaleFactor;
    }

    moodboardPresenterState.zoom = clampedZoom;
    if (1 === moodboardPresenterState.zoom) {
      moodboardPresenterState.x = moodboardPresenterState.y = 0;
    }
    clampMoodboardPan();
    applyMoodboardTransform();
  }

  function clampMoodboardPan() {
    if (!moodboardPresenterState) return;
    const rect = elements.mbOverlayCanvas.getBoundingClientRect();
    const effectiveScale = moodboardPresenterState.fit * moodboardPresenterState.zoom;

    const maxX = Math.max(0, (KK.moodboard.stageWidth * effectiveScale - rect.width) / 2);
    const maxY = Math.max(0, (KK.moodboard.stageHeight * effectiveScale - rect.height) / 2);

    moodboardPresenterState.x = Math.max(-maxX, Math.min(maxX, moodboardPresenterState.x));
    moodboardPresenterState.y = Math.max(-maxY, Math.min(maxY, moodboardPresenterState.y));
  }

  function applyMoodboardTransform() {
    if (!moodboardPresenterState || !moodboardPresenterState.clone) return;
    const effectiveScale = moodboardPresenterState.fit * moodboardPresenterState.zoom;
    moodboardPresenterState.clone.style.transform =
      "translate(calc(-50% + " + moodboardPresenterState.x + "px),calc(-50% + " + moodboardPresenterState.y + "px)) scale(" + effectiveScale + ")";
  }

  function bindMoodboardOverlayGestures(containerEl) {
    if (!containerEl) return;
    const pt = (e) => ({ x: e.clientX, y: e.clientY });

    containerEl.addEventListener("pointerdown", (e) => {
      if (moodboardPresenterState) {
        containerEl.setPointerCapture(e.pointerId);
        moodboardPresenterState.pointers.set(e.pointerId, pt(e));
        moodboardPresenterState.lastDistance = null;
      }
    });

    containerEl.addEventListener("pointermove", (e) => {
      if (!moodboardPresenterState || !moodboardPresenterState.pointers.has(e.pointerId)) return;
      const prevPt = moodboardPresenterState.pointers.get(e.pointerId);
      moodboardPresenterState.pointers.set(e.pointerId, pt(e));

      const points = Array.from(moodboardPresenterState.pointers.values());
      if (points.length >= 2) {
        const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (moodboardPresenterState.lastDistance) {
          moodboardZoomAt(
            moodboardPresenterState.zoom * dist / moodboardPresenterState.lastDistance,
            (points[0].x + points[1].x) / 2,
            (points[0].y + points[1].y) / 2
          );
        }
        moodboardPresenterState.lastDistance = dist;
      } else if (moodboardPresenterState.zoom > 1) {
        moodboardPresenterState.x += e.clientX - prevPt.x;
        moodboardPresenterState.y += e.clientY - prevPt.y;
        clampMoodboardPan();
        applyMoodboardTransform();
      }
    });

    const endPointer = (e) => {
      if (moodboardPresenterState) {
        moodboardPresenterState.pointers.delete(e.pointerId);
        moodboardPresenterState.lastDistance = null;
      }
    };

    containerEl.addEventListener("pointerup", (e) => {
      if (moodboardPresenterState && "mouse" !== e.pointerType && 1 === moodboardPresenterState.pointers.size) {
        const now = Date.now();
        if (now - moodboardPresenterState.lastTap < 300) {
          moodboardZoomAt(moodboardPresenterState.zoom > 1 ? 1 : 2.5, e.clientX, e.clientY);
          moodboardPresenterState.lastTap = 0;
        } else {
          moodboardPresenterState.lastTap = now;
        }
      }
      endPointer(e);
    });

    containerEl.addEventListener("pointercancel", endPointer);
    containerEl.addEventListener("wheel", (e) => {
      if (moodboardPresenterState) {
        e.preventDefault();
        moodboardZoomAt(moodboardPresenterState.zoom * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
      }
    }, { passive: false });

    containerEl.addEventListener("dblclick", (e) => {
      if (moodboardPresenterState) {
        moodboardZoomAt(moodboardPresenterState.zoom > 1 ? 1 : 2.5, e.clientX, e.clientY);
      }
    });
  }

  function handleMoodboardOverlayKey(e) {
    if (!moodboardPresenterState || elements.mbOverlay.hidden) return false;
    if ("Escape" === e.key) {
      e.preventDefault();
      closeMoodboardOverlay();
      return true;
    }
    if ("+" === e.key || "=" === e.key) {
      e.preventDefault();
      moodboardZoomAt(moodboardPresenterState.zoom * 1.25);
      return true;
    }
    if ("-" === e.key || "_" === e.key) {
      e.preventDefault();
      moodboardZoomAt(moodboardPresenterState.zoom / 1.25);
      return true;
    }
    if ("0" === e.key) {
      e.preventDefault();
      moodboardZoomAt(1);
      return true;
    }
    return false;
  }

  /* ------------------------------- Exports --------------------------------- */

  function setMoodboardExportBusy(isBusy) {
    isMoodboardOverlayBusy = isBusy;
    [elements.mbRotate, elements.mbRandomize, elements.mbUpload, elements.mbDownload, elements.mbBoard].forEach((btn) => {
      btn.disabled = isBusy;
    });
  }

  function setMoodboardExportState(exportKind, statusStr, customLabel) {
    const btn = elements[MB_EXPORTS[exportKind].el];
    btn.classList.toggle("is-busy", "busy" === statusStr);
    btn.classList.toggle("is-done", "done" === statusStr);
    btn.classList.toggle("is-error", "error" === statusStr);

    if ("busy" === statusStr) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");

    $(".moodboard-action__label", btn).textContent = customLabel || MB_EXPORTS[exportKind].idle;
  }

  function flashMoodboardExportState(exportKind, statusStr, customLabel) {
    clearTimeout(MB_EXPORT_TIMERS[exportKind]);
    setMoodboardExportState(exportKind, statusStr, customLabel);
    MB_EXPORT_TIMERS[exportKind] = setTimeout(() => setMoodboardExportState(exportKind, "idle"), 2600);
  }

  function resetMoodboardExports() {
    Object.keys(MB_EXPORTS).forEach((k) => {
      clearTimeout(MB_EXPORT_TIMERS[k]);
      setMoodboardExportState(k, "idle");
    });
    setMoodboardExportBusy(false);
  }

  async function recordMoodboardExport(orderId, fileName, exportKind, driveLink) {
    const isFirstExport = !await db.countMoodboards(orderId);
    await db.logMoodboard(orderId, driveLink);
    await db.logOrderHistory(orderId, "moodboard_generated", {
      file_name: fileName,
      orientation: KK.moodboard.orientation,
      destination: "drive" === exportKind ? "drive" : "download",
      drive_link: driveLink || null
    });

    if (!isFirstExport) return;

    state.customer = await db.updateCustomer(state.customer.id, { moodboard_date: U.todayISO() });
    const nudgePatch = consultNudgeFor(state.customer, state.customerOrders, U.todayISO());

    if (nudgePatch) {
      await db.updateCustomer(state.customer.id, nudgePatch);
      try {
        await db.syncFollowUp(state.customer.id);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function offerGoogleReconnect(msgStr) {
    showToast(msgStr);
    if (window.confirm(msgStr + "\n\nOpen Google settings to reconnect?")) {
      window.open(location.pathname + location.search + "#/calendar", "_blank", "noopener");
    }
  }

  async function exportMoodboard(exportKind) {
    if (isMoodboardOverlayBusy || !KK.moodboard.images.length || !state.order) return;
    const cfg = MB_EXPORTS[exportKind];
    const orderId = state.order.id;
    let recordedSuccess = false;

    clearTimeout(MB_EXPORT_TIMERS[exportKind]);
    setMoodboardExportBusy(true);
    setMoodboardExportState(exportKind, "busy", cfg.busy);
    elements.mbExportStatus.textContent = cfg.busy;

    try {
      const pdfDoc = await KK.moodboard.generatePDF();
      const fileName = KK.moodboard.buildFilename(new Date());
      let driveLink = null;

      if ("drive" === exportKind) {
        const driveRes = await db.driveSaveMoodboardPdf(
          fileName,
          KK.moodboard.pdfToBase64(pdfDoc),
          state.customer && state.customer.name || "",
          state.order.title || state.order.doc_name || "Untitled order"
        );
        driveLink = driveRes && driveRes.drive_link || null;
      } else {
        pdfDoc.save(fileName);
      }

      recordedSuccess = true;
      await recordMoodboardExport(orderId, fileName, exportKind, driveLink);
      flashMoodboardExportState(exportKind, "done", cfg.done);
      elements.mbExportStatus.textContent = cfg.done;
      showToast("drive" === exportKind ? "Moodboard saved to Google Drive" : "Moodboard PDF downloaded");
    } catch (err) {
      console.error(err);
      const errText = err && err.message || "please try again";
      flashMoodboardExportState(exportKind, "error", recordedSuccess ? "Not recorded" : "Failed");
      elements.mbExportStatus.textContent = errText;

      if (!recordedSuccess && "drive" === exportKind && MB_RECONNECT_REGEX.test(errText)) {
        offerGoogleReconnect(errText);
      } else {
        showToast(
          recordedSuccess
            ? "The moodboard was exported, but its record could not be finished — " + errText
            : ("drive" === exportKind ? "Could not upload to Drive — " : "Could not download the PDF — ") + errText
        );
      }
    } finally {
      setMoodboardExportBusy(false);
    }
  }

  function setDocumentBusy(docType, isBusy) {
    state.orderDetail.documentBusy = isBusy ? docType : null;
    const vm = state.orderDetail.vm;
    const canDownload = !vm || vm.documents.canDownload;

    Object.keys(docButtons).forEach((k) => {
      docButtons[k].disabled = isBusy || !canDownload;
    });

    const targetBtn = docButtons[docType];
    targetBtn.classList.toggle("is-busy", isBusy);
    if (isBusy) targetBtn.setAttribute("aria-busy", "true");
    else targetBtn.removeAttribute("aria-busy");

    $(".order-action__label", targetBtn).textContent = isBusy ? "Generating…" : "quotation" === docType ? "Get quotation" : "Get invoice";
  }

  async function downloadDocument(docType) {
    let totalAmt;
    setDocumentBusy(docType, true);

    try {
      totalAmt = await docs.download(docType, {
        docName: state.order.doc_name || state.customer.name || "",
        date: U.todayISO(),
        items: state.order.items || [],
        includes: state.order.includes || [],
        terms: docs.termsFor(state.order)
      });
    } catch (err) {
      console.error(err);
      showToast("Could not generate the PDF — please try again");
      setDocumentBusy(docType, false);
      return;
    }

    setDocumentBusy(docType, false);
    showToast(docs.DOCS[docType].name + " downloaded");
    await bumpStatus("invoice" === docType ? "Confirmed" : "Quoted");

    try {
      await db.logDocument(state.order.id, docType, totalAmt);
      await refreshOrderPayments();
    } catch (err) {
      console.error(err);
      showToast("Downloaded, but could not record it");
    }
  }

  async function logDeposit(depositIndex) {
    if (!state.orderDetail.paymentBusy) {
      elements.paymentError.textContent = "";
      elements.paymentError.hidden = true;
      setOrderPaymentBusy(true);
      try {
        await logDepositRequest(depositIndex);
      } finally {
        setOrderPaymentBusy(false);
      }
    }
  }

  async function logDepositRequest(depositIndex) {
    const grandTotal = docs.computeTotal(state.order.items);
    const terms = docs.termsFor(state.order);
    const termAmt = docs.termAmounts(grandTotal, terms)[depositIndex];

    const patchObj = (function (ordRec, idx, termsList) {
      const patch = {};
      if (0 === idx && !ordRec.first_payment_date) patch.first_payment_date = U.todayISO();
      const prodIdx = "other" === ordRec.payment_scheme ? 0 : 1;
      if (idx === prodIdx && !ordRec.second_payment_date) patch.second_payment_date = U.todayISO();
      if (idx === termsList.length - 1 && !ordRec.final_payment_date) patch.final_payment_date = U.todayISO();
      return patch;
    })(state.order, depositIndex, terms);

    if (patchObj.first_payment_date && patchObj.final_payment_date) {
      if (!window.confirm("This is the only payment term, so logging it starts the schedule and marks the order finished at the same time. Log it?")) {
        return;
      }
    }

    try {
      await db.logOrderHistory(state.order.id, "payment_logged", {
        deposit_index: depositIndex,
        deposit_label: docs.termLabel(terms[depositIndex]),
        amount: termAmt
      });
      closeOrderPaymentChooser();
      showToast(terms[depositIndex].label + " logged");

      if (Object.keys(patchObj).length) {
        state.order = await db.updateOrder(state.order.id, patchObj);
      }

      if (patchObj.first_payment_date || patchObj.second_payment_date) {
        await (async function () {
          try {
            const res = await rescheduleOrder(state.order, state.customer);
            const count = res.rows.filter((e) => calendar.isProductionStage(e.stage)).length;
            if (count) {
              await db.logOrderHistory(state.order.id, "scheduled", { count: res.rows.length, dropped: res.computed.dropped });
              showToast(count + " fittings scheduled");
            } else if (res.rows.length) {
              await db.logOrderHistory(state.order.id, "scheduled", { count: res.rows.length, dropped: res.computed.dropped });
              showToast("Design phase scheduled");
            } else if (res.computed.reason) {
              showToast(res.computed.reason);
            }
            await refreshOrderSchedule();
          } catch (err) {
            console.error(err);
            showToast("Payment logged, but the schedule could not be built");
          }
        })();
      }

      if (patchObj.final_payment_date) {
        await bumpStatus("Delivered");
      } else if (patchObj.second_payment_date) {
        await bumpStatus("In production");
      } else if (patchObj.first_payment_date) {
        await bumpStatus("Confirmed");
      }

      await refreshOrderPayments();
      renderOrderStatus();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not log payment");
      elements.paymentError.textContent = err.message || "Could not log that payment. Try again.";
      elements.paymentError.hidden = false;
    }
  }

  async function signOutFromMenu() {
    closeMenu();
    if (confirmLeave()) {
      await coverCurtain();
      try {
        await db.signOut();
        location.hash = "";
        await showGate();
      } catch (err) {
        await revealCurtain();
        showToast(err.message || "Could not sign out");
      }
    }
  }

  /* -------------------- Boot & Event Listeners --------------------- */

  function bindEvents() {
    window.addEventListener("hashchange", handleRoute);

    elements.pageAction.addEventListener("click", () => {
      if (pageActionHandler) pageActionHandler();
    });

    elements.saveBtn.addEventListener("click", async () => {
      if (state.saving) return;
      state.saving = true;
      setDirty(state.dirty);
      try {
        if ("customer" === state.route.view) {
          await saveCustomer();
        } else if ("orderEdit" === state.route.view) {
          const ordId = state.order.id;
          if (!await saveOrder()) return;
          showToast("Order saved");
          leaveFormFor("#/order/" + ordId);
        }
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not save");
      } finally {
        state.saving = false;
        setDirty(state.dirty);
      }
    });

    if (elements.homeNavHome) {
      elements.homeNavHome.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (elements.homeNavMenu) {
      elements.homeNavMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = elements.menuList.hidden;
        if (isHidden) {
          if (elements.menuList.parentNode !== elements.homeNavMenuWrapper) {
            elements.homeNavMenuWrapper.appendChild(elements.menuList);
          }
          elements.menuList.hidden = false;
          elements.homeNavMenu.setAttribute("aria-expanded", "true");
        } else {
          closeMenu();
        }
      });
    }

    elements.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = elements.menuList.hidden;
      if (elements.menuList.parentNode !== elements.menu) {
        elements.menu.appendChild(elements.menuList);
      }
      elements.menuList.hidden = !isHidden;
      elements.menuBtn.setAttribute("aria-expanded", String(isHidden));
    });

    document.addEventListener("click", (e) => {
      if (elements.menuList.hidden) return;
      if (elements.menu.contains(e.target) || (elements.homeNavMenuWrapper && elements.homeNavMenuWrapper.contains(e.target))) return;
      closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if ("Escape" !== e.key || elements.menuList.hidden) return;
      closeMenu();
      elements.menuBtn.focus();
    });

    elements.menuSignOut.addEventListener("click", signOutFromMenu);
    elements.menuDelete.addEventListener("click", () => {
      closeMenu();
      if ("order" === elements.menuDelete.dataset.kind) {
        (async function () {
          if (window.confirm("Delete this order and its payment and download record? This cannot be undone.")) {
            try {
              const custId = state.order.customer_id;
              await db.deleteOrder(state.order.id);
              setDirty(false);
              showToast("Order deleted");
              go("#/customer/" + custId);
            } catch (err) {
              console.error(err);
              showToast(err.message || "Could not delete");
            }
          }
        })();
      } else {
        deleteCustomerRecord();
      }
    });

    elements.deleteCustomer.addEventListener("click", deleteCustomerRecord);
    elements.customerSearch.addEventListener("input", renderCustomerList);

    $$(".js-cfield").forEach((f) => {
      f.addEventListener("input", () => {
        if (f === elements.cName && f.value.trim()) setNameError(false);
        setDirty(true);
      });
      f.addEventListener("change", () => setDirty(true));
    });

    elements.cWeddingPrecision.addEventListener("click", (e) => {
      const btn = e.target.closest(".custedit-segmented__btn");
      if (btn && btn.dataset.precision !== weddingPrecision()) {
        setWeddingPrecision(btn.dataset.precision);
        setDirty(true);
      }
    });

    elements.cancelCustomer.addEventListener("click", cancelCustomer);
    elements.reopenCustomer.addEventListener("click", reopenCustomer);

    elements.logPaymentBtn.addEventListener("click", toggleOrderPaymentChooser);
    elements.paymentChooserOptions.addEventListener("click", (e) => {
      const choiceBtn = e.target.closest(".js-log-deposit");
      if (choiceBtn) logDeposit(Number(choiceBtn.dataset.i));
    });

    elements.downloadQuote.addEventListener("click", () => downloadDocument("quotation"));
    elements.downloadInvoice.addEventListener("click", () => downloadDocument("invoice"));

    elements.createMoodboardBtn.addEventListener("click", () => {
      if (state.order) go("#/order/" + state.order.id + "/moodboard");
    });
    elements.logNewFittingBtn.addEventListener("click", () => {
      if (state.order) go("#/order/" + state.order.id + "/fitting/new");
    });

    elements.fittingJournalAdd.addEventListener("click", () => KK.fittings.openCamera());
    KK.fittings.bindOverlays();
    setupFittingDetailListeners();
    setupFittingPhotoAddListeners();
    setupMoodboardListeners();

    elements.gcalConnect.addEventListener("click", connectGoogle);
    elements.gcalDisconnect.addEventListener("click", disconnectGoogle);

    elements.enquiryAccept.addEventListener("click", acceptEnquiry);
    elements.enquiryDismiss.addEventListener("click", dismissEnquiry);
    elements.menuCalendar.addEventListener("click", closeMenu);

    $$(".js-ofield").forEach((f) => {
      f.addEventListener("input", () => setDirty(true));
      f.addEventListener("change", () => setDirty(true));
    });

    [elements.oFirstPayment, elements.oSecondPayment, elements.oScheme].forEach((f) => {
      f.addEventListener("input", renderScheduleHint);
      f.addEventListener("change", renderScheduleHint);
    });

    elements.addItem.addEventListener("click", () => {
      addItemRow({ name: "", qty: 1, price: "", cost: "" }, true);
      setDirty(true);
    });

    elements.itemList.addEventListener("click", (e) => {
      const rmBtn = e.target.closest(".js-remove");
      if (rmBtn && !rmBtn.disabled) {
        rmBtn.closest(".item").remove();
        refreshRemoveButtons();
        refreshItemTotals();
        setDirty(true);
        return;
      }
      const calcBtn = e.target.closest(".js-cost-calc");
      if (calcBtn) {
        (function (itemRowEl) {
          activeCalcFocusTarget = document.activeElement;
          activeCalcItemRow = itemRowEl;
          const desc = $(".js-name", itemRowEl).value.trim();
          elements.calcItemLabel.textContent = desc ? 'For "' + desc + '"' : "For this item";

          const savedRows = calcStateMap.get(itemRowEl) || COST_CALC_PRESETS.map((lbl) => ({ label: lbl, amount: 0 }));
          elements.calcRowList.innerHTML = "";
          savedRows.forEach((r) => addCalcRow(r, false));

          elements.calcSheet.hidden = false;
          document.body.classList.add("has-app-modal");
          requestAnimationFrame(() => $(".js-clabel", elements.calcRowList)?.focus());
        })(calcBtn.closest(".item"));
      }
    });

    elements.itemList.addEventListener("input", (e) => {
      const target = e.target;
      if (target.classList.contains("js-qty")) {
        target.value = U.digitsOnly(target.value).replace(/^0+(?=\d)/, "");
      } else if (target.classList.contains("js-price") || target.classList.contains("js-cost")) {
        U.reformatPriceField(target);
      }
      target.classList.remove("is-invalid");
      const errEl = $(".js-err", target.closest(".item"));
      if (errEl) errEl.hidden = true;
      refreshItemTotals();
      setDirty(true);
    });

    elements.itemList.addEventListener("focusout", (e) => {
      if (e.target.classList.contains("js-qty") && "" === U.digitsOnly(e.target.value)) {
        e.target.value = "1";
        refreshItemTotals();
      }
    });

    elements.includesList.addEventListener("change", (e) => {
      const target = e.target;
      if ("checkbox" === target.type) {
        target.closest(".chip").classList.toggle("is-checked", target.checked);
        setDirty(true);
      }
    });

    elements.includesList.addEventListener("click", (e) => {
      const rmBtn = e.target.closest(".js-remove-include");
      if (rmBtn) {
        e.preventDefault();
        rmBtn.closest(".chip").remove();
        setDirty(true);
      }
    });

    elements.addInclude.addEventListener("click", addCustomInclude);
    elements.oScheme.addEventListener("change", () => {
      syncSchemeCard();
      setDirty(true);
    });

    elements.addTerm.addEventListener("click", () => {
      addTermRow(null, true);
      setDirty(true);
    });

    elements.termList.addEventListener("click", (e) => {
      const rmBtn = e.target.closest(".js-remove-term");
      if (rmBtn && !rmBtn.disabled) {
        rmBtn.closest(".term").remove();
        refreshTermRemoveButtons();
        refreshTermsSum();
        setDirty(true);
      }
    });

    elements.termList.addEventListener("input", (e) => {
      const target = e.target;
      if (target.classList.contains("js-tpct")) {
        target.value = target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
      }
      elements.errTerms.hidden = true;
      refreshTermsSum();
      setDirty(true);
    });

    elements.calcAddRow.addEventListener("click", () => addCalcRow(null, true));

    elements.calcRowList.addEventListener("click", (e) => {
      const rmBtn = e.target.closest(".js-remove-calcrow");
      if (rmBtn && !rmBtn.disabled) {
        rmBtn.closest(".calcrow").remove();
        refreshCalcRemoveButtons();
        refreshCalcTotal();
      }
    });

    elements.calcRowList.addEventListener("input", (e) => {
      if (e.target.classList.contains("js-camount")) {
        U.reformatPriceField(e.target);
      }
      refreshCalcTotal();
    });

    elements.calcApply.addEventListener("click", applyCostCalc);
    elements.calcBack.addEventListener("click", closeCostCalc);

    elements.customInclude.addEventListener("keydown", (e) => {
      if ("Enter" === e.key) {
        e.preventDefault();
        addCustomInclude();
      }
    });

    ["resize", "orientationchange"].forEach((evtName) =>
      window.addEventListener(evtName, () => {
        syncVisualViewport();
        fitMoodboardBoard();
        renderMoodboardOverlay(false);
      })
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncVisualViewport);
      window.visualViewport.addEventListener("scroll", syncVisualViewport);
      // The software keyboard changing the visual viewport is the only signal
      // that the search field's position has actually settled.
      window.visualViewport.addEventListener("resize", scheduleFittingSearchAlign);
    }

    window.addEventListener("offline", () => showToast("You're offline — changes won't save until you're back online"));
    window.addEventListener("online", () => showToast("Back online"));

    document.addEventListener("focusin", (e) => {
      const target = e.target;
      // The fitting-log search aligns itself to the fixed nav; centring it here
      // would fight that and leave the field under the software keyboard.
      if (target === elements.fitlogSearch) return;
      if (target.matches("input, select, textarea, button")) {
        requestAnimationFrame(() =>
          setTimeout(() => {
            if (document.activeElement === target) {
              target.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
              });
            }
          }, 80)
        );
      }
    });

    document.addEventListener("keydown", (e) => {
      trapModalFocus(e, elements.calcSheet);
      trapModalFocus(e, elements.mbOverlay);
      ["fittingCamera", "fittingConfirm", "fittingCaptionStep", "fittingPicker", "fittingEditSheet"].forEach((id) => trapModalFocus(e, $("#" + id)));
      if (elements.calcSheet.hidden) {
        handleMoodboardOverlayKey(e);
      } else if ("Escape" === e.key) {
        e.preventDefault();
        closeCostCalc();
      }
    });

    window.addEventListener("beforeunload", (e) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  }

  async function showGate() {
    await coverCurtain();
    elements.app.hidden = true;
    elements.gate.hidden = false;
    elements.gateRemember.checked = db.rememberPreference();
    elements.gatePassword.value = elements.gateRemember.checked ? db.savedPassword() : "";
    elements.gateErr.hidden = true;
    elements.gatePassword.removeAttribute("aria-invalid");
    await revealCurtain();

    if (elements.gatePassword.value) {
      elements.gateSubmit.focus();
    } else {
      elements.gatePassword.focus();
    }
  }

  async function showApp() {
    await coverCurtain();
    elements.gate.hidden = true;
    elements.app.hidden = false;
    await handleRoute();

    await (async function () {
      const queryParams = new URLSearchParams(location.search);
      const codeVal = queryParams.get("code");
      const errVal = queryParams.get("error");
      if (!codeVal && !errVal) return;

      const cleanUrl = () => history.replaceState(null, "", location.pathname + location.hash);
      if (errVal) {
        cleanUrl();
        return showToast("access_denied" === errVal ? "Google Calendar was not connected" : "Google sign-in failed");
      }
      cleanUrl();

      try {
        await db.googleExchange(codeVal, googleRedirectUri());
        state.googleConnected = true;
        showToast("Google Calendar connected");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Could not connect Google Calendar");
      }
    })();
  }

  /* ------------------------------ App Boot -------------------------------- */

  return (function () {
    elements.gateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!elements.gateSubmit.disabled) {
        elements.gateErr.hidden = true;
        elements.gatePassword.removeAttribute("aria-invalid");
        elements.gateSubmit.disabled = true;
        elements.gateSubmit.classList.add("is-busy");
        $(".btn__label", elements.gateSubmit).textContent = "Unlocking…";

        try {
          await db.signIn(elements.gatePassword.value, elements.gateRemember.checked);
          await showApp();
        } catch (err) {
          elements.gateErr.textContent = err.message || "Could not sign in";
          elements.gateErr.hidden = false;
          elements.gatePassword.setAttribute("aria-invalid", "true");
          elements.gatePassword.select();
        } finally {
          elements.gateSubmit.disabled = false;
          elements.gateSubmit.classList.remove("is-busy");
          $(".btn__label", elements.gateSubmit).textContent = "Unlock";
        }
      }
    });

    bindEvents();

    if (db.isConfigured()) {
      (async function () {
        try {
          if (await db.currentSession()) {
            await showApp();
          } else {
            await showGate();
          }
        } catch (err) {
          console.error(err);
          await showGate();
        }
      })();
    } else {
      elements.boot.innerHTML =
        '<div class="boot__msg"><strong>Not connected.</strong><span>Fill in <code>config.js</code> with your Supabase URL and anon key — see “Setting up the database” in the README.</span></div>';
    }

    return { state };
  })();
})();
