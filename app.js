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

  /* Mirrors --motion-sheet-out in pages.css. The stylesheet owns the animation
     and this owns how long the element stays mounted for it; if one changes the
     other has to. */
  const SHEET_OUT_MS = 180;

  /* Fittings are part of the daily round again, so the tile is on the shortcut
     row with the rest of them.

     A flag rather than a `hidden` attribute because the row's shape depends on
     it: it also sets body.has-fitting-shortcut, which is what pairs Moodboard
     with Fitting on the second row. Off, Moodboard has no partner and spans
     that row alone as a band. */
  const SHOW_FITTING_SHORTCUT = true;

  /* ------------------------------- SVG Icons ------------------------------ */

  const SVG_TRASH = U.ICONS.trash;
  const SVG_CLOSE = U.ICONS.close;
  const SVG_CHECK = U.ICONS.check;

  /* ----------------------- Element Registry ------------------------ */

  const elements = {
    boot: $("#boot"),
    bootPanel: $("#bootPanel"),
    bootKicker: $("#bootKicker"),
    bootQuote: $("#bootQuote"),
    page: $("main.page"),
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
    homeAtmosphere: $("#homeAtmosphere"),
    homeAtmosphereSceneA: $("#homeAtmosphereSceneA"),
    homeAtmosphereSceneB: $("#homeAtmosphereSceneB"),
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
    custNextBanner: $("#custNextBanner"),
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
    fitdetAddBtn: $("#fitdetAddBtn"),
    fitdetEditBtn: $("#fitdetEditBtn"),
    fitdetDeleteBtn: $("#fitdetDeleteBtn"),
    fitdetPhotoInput: $("#fitdetPhotoInput"),
    viewFittingPhotoAdd: $("#viewFittingPhotoAdd"),
    fitaddBackBtn: $("#fitaddBackBtn"),
    fitaddBackLabel: $("#fitaddBackLabel"),
    fitaddTitle: $("#fitaddTitle"),
    fitaddStage: $("#fitaddStage"),
    fitaddCustomer: $("#fitaddCustomer"),
    fitaddDate: $("#fitaddDate"),
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
    fitmark: $("#fitmark"),
    fitmarkTitle: $("#fitmarkTitle"),
    fitmarkStage: $("#fitmarkStage"),
    fitmarkImage: $("#fitmarkImage"),
    fitmarkCanvas: $("#fitmarkCanvas"),
    fitmarkCancel: $("#fitmarkCancel"),
    fitmarkDone: $("#fitmarkDone"),
    fitmarkUndo: $("#fitmarkUndo"),
    fitmarkClear: $("#fitmarkClear"),
    fitmarkStatus: $("#fitmarkStatus"),
    fittingPhotoViewer: $("#fittingPhotoViewer"),
    fittingPhotoViewerFrame: $("#fittingPhotoViewerFrame"),
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
    custDeleteBtn: $("#custDeleteBtn"),
    orderDeleteBtn: $("#orderDeleteBtn"),
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
    homeFittingBtn: $("#homeFittingBtn"),
    homeMoodboardBtn: $("#homeMoodboardBtn"),
    homeAddOrderBtn: $("#homeAddOrderBtn"),
    enquiriesCard: $("#enquiriesCard"),
    enquiriesCount: $("#enquiriesCount"),
    viewEnquiry: $("#viewEnquiry"),
    enquiryWhen: $("#enquiryWhen"),
    enquiryAnswers: $("#enquiryAnswers"),
    enquiryNote: $("#enquiryNote"),
    enquiryAccept: $("#enquiryAccept"),
    enquiryDismiss: $("#enquiryDismiss"),
    viewMoodboard: $("#viewMoodboard"),
    mbBackBtn: $("#mbBackBtn"),
    mbBackLabel: $("#mbBackLabel"),
    mbTitle: $("#mbTitle"),
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
    mbOverlayClose: $("#mbOverlayClose"),
    viewSchedules: $("#viewSchedules"),
    schedcalBackBtn: $("#schedcalBackBtn"),
    schedcalTodayBtn: $("#schedcalTodayBtn"),
    schedcalTitle: $("#schedcalTitle"),
    schedcalPrev: $("#schedcalPrev"),
    schedcalNext: $("#schedcalNext"),
    schedcalMonthbar: $("#schedcalMonthbar"),
    schedcalMonthLabel: $("#schedcalMonthLabel"),
    schedcalApprox: $("#schedcalApprox"),
    schedcalBody: $("#schedcalBody"),
    schedcalGrid: $("#schedcalGrid"),
    schedcalWeeks: $("#schedcalWeeks"),
    schedcalState: $("#schedcalState"),
    schedcalLegend: $("#schedcalLegend"),
    schedcalStatus: $("#schedcalStatus"),
    schedcalSheet: $("#schedcalSheet"),
    schedcalSheetBackdrop: $("#schedcalSheetBackdrop"),
    schedcalSheetTitle: $("#schedcalSheetTitle"),
    schedcalSheetCount: $("#schedcalSheetCount"),
    schedcalSheetList: $("#schedcalSheetList"),
    schedcalSheetClose: $("#schedcalSheetClose"),
    viewDocuments: $("#viewDocuments"),
    doclistBackBtn: $("#doclistBackBtn"),
    doclistBackLabel: $("#doclistBackLabel"),
    doclistNewBtn: $("#doclistNewBtn"),
    doclistTitle: $("#doclistTitle"),
    doclistSearchSection: $("#doclistSearchSection"),
    doclistSearch: $("#doclistSearch"),
    doclistSearchClear: $("#doclistSearchClear"),
    doclistFeed: $("#doclistFeed"),
    doclistList: $("#doclistList"),
    doclistState: $("#doclistState"),
    doclistSentinel: $("#doclistSentinel"),
    doclistStatus: $("#doclistStatus"),
    docnewSheet: $("#docnewSheet"),
    docnewBackdrop: $("#docnewBackdrop"),
    docnewTitle: $("#docnewTitle"),
    docnewHint: $("#docnewHint"),
    docnewSearch: $("#docnewSearch"),
    docnewList: $("#docnewList"),
    docnewBack: $("#docnewBack"),
    docnewCancel: $("#docnewCancel"),
    docnewStatus: $("#docnewStatus"),
    custQuotationBanner: $("#custQuotationBanner"),
    custInvoiceBanner: $("#custInvoiceBanner"),
    viewPenjahit: $("#viewPenjahit"),
    viewPenjahitEdit: $("#viewPenjahitEdit"),
    viewProductionEdit: $("#viewProductionEdit"),
    viewProductionJob: $("#viewProductionJob"),
    homePenjahit: $("#homePenjahit"),
    homeSearchSection: $("#homeSearchSection"),
    productionBar: $("#productionBar"),
    productionDraftRows: $("#productionDraftRows"),
    productionPaymentForm: $("#productionPaymentForm")
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
    production: {
      available: null, penjahit: [], jobs: [], sources: [], profile: null, job: null,
      payments: [], draft: null, batchRequest: null, paymentRequest: null,
      paymentId: null, voidId: null, creatingOrder: false, createdCustomerId: null,
      ledgerTab: "customers", ledgerLoaded: false, scrollY: 0,
      search: { customers: "", penjahit: "" }, filters: {}
    },
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
      pdfBusy: false,
      sharingId: null,
      blobCache: new Map(), // photoId -> { blob, url } for this page lifetime
      viewerReturn: null,
      source: "feed"
    },
    /* The fitting workspace — the one place a fitting log is edited. Nothing
       here is written until Save fitting log: captions, marks, deletions and
       selected files are all local proposals, which is why the persisted
       records and the local edits are kept apart rather than merged into one
       mutable list. */
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
      /* Marks follow captions exactly: a local proposal until Save changes.
         A value of null is a cleared annotation, which is why this is a Map
         and not a sparse patch on the record. */
      annotationPatches: new Map(), // photoId -> normalized annotation | null
      /* Set when this page created the fitting log on its way in, from the
         order page or the calendar. Leaving without saving a single photo
         deletes it again rather than leaving an empty log in the feed. */
      provisionalSessionId: null,
      focusPhotoId: null, // ?focus= target, scrolled to once after the first ready render
      /* The marking overlay. It is modal, and it resolves through Done or
         Cancel before anything else on the page can run, so its working strokes
         never have to take part in the page's dirty calculation. */
      mark: {
        open: false,
        key: null,
        kind: null, // existing | new
        natW: 0,
        natH: 0,
        strokes: [],
        baseline: "null", // JSON of the strokes at open, for Cancel
        drawing: false,
        pointerId: null,
        last: null
      },
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
    },
    /* The calendar joins four sources in the browser. That joined index is
       expensive enough to build that paging months must not rebuild it, and
       stale enough after any write that it is dropped on leaving the route.
       Separate from state.overview because that join is per-customer and this
       one is per-day. */
    schedules: {
      phase: "idle", // idle | loading | ready | error
      loadToken: 0,
      cursor: { year: 0, month: 0 }, // month on screen; month is 0-based
      focusedDate: "", // ISO of the cell holding tabindex="0"
      openDate: "", // ISO of the day whose sheet is open, "" when closed
      sheetReturn: null, // element focus returns to when the sheet closes
      items: [], // one entry per calendar object, all four sources
      byDay: null, // Map<isoDate, item[]>, rebuilt only on a data load
      approximate: [], // month-precision weddings, named above the grid
      lastStatus: "",
      error: null
    },
    /* Quotations and invoices are one page parameterised by kind: the route
       sets it, the feed filters on it, and nothing else about the page differs.
       One island rather than two, because two would guarantee they drift. */
    documents: {
      kind: "quotation", // quotation | invoice
      phase: "idle", // idle | initial-loading | ready | initial-error
      items: [],
      query: "",
      customerSeed: null,
      nextCursor: null,
      hasMore: true,
      loadingMore: false,
      loadMoreError: null,
      requestToken: 0,
      renderedToken: -1,
      observer: null,
      searchTimer: null,
      alignPending: false,
      errorAnnounced: false,
      lastStatus: "",
      retainHash: "",
      retainScroll: 0,
      /* The create flow. Nothing is written until Generate, and state.order is
         deliberately left alone so a picker that never opened the order page
         cannot corrupt what that page is showing. */
      picker: {
        open: false,
        /* Not read off the enclosing feed's kind: the feed's kind is set by the
           documents route, and the picker also opens for a moodboard, which has
           no route of its own to set it. Whoever opens the sheet says what for. */
        mode: "quotation", // quotation | invoice | moodboard | fitting | neworder
        step: "customer", // customer | order | termin
        orderToken: 0,
        customers: null,
        customerId: null,
        customer: null,
        orders: null,
        selectedOrder: null,
        loggedDeposits: {},
        directOrder: false,
        query: "",
        loading: false,
        generating: false,
        error: null,
        returnEl: null
      }
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
    const route = state.route || {};
    // The assignment wizard has its own bar; this one never labels for it.
    const isNew = route.id === "new";
    const label = isNew && route.view === "customerEdit" ? "Create customer"
      : isNew && route.view === "orderEdit" ? "Create order"
      : isNew && route.view === "penjahitEdit" ? "Create penjahit" : "Save changes";
    elements.saveBtn.disabled = state.saving || (!isDirty && !isNew);
    $(".btn__label", elements.saveBtn).textContent = state.saving ? "Saving…" : isNew || isDirty ? label : "Saved";
  }

  let fieldErrorSequence = 0;

  function setFieldError(field, message) {
    if (!field) return false;
    if (!field.id) field.id = "formField" + (++fieldErrorSequence);
    const id = field.id + "Error";
    let error = document.getElementById(id);
    if (!error && message) {
      error = document.createElement("span");
      error.id = id;
      error.className = "err field-error";
      error.setAttribute("aria-live", "polite");
      (field.closest(".field,.custedit-card") || field.parentElement).appendChild(error);
      const described = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      field.setAttribute("aria-describedby", described.concat(id).join(" "));
    }
    if (error) { error.textContent = message || ""; error.hidden = !message; }
    field.setAttribute("aria-invalid", message ? "true" : "false");
    field.classList.toggle("is-invalid", !!message);
    return !message;
  }

  function focusInvalid(container) {
    const field = container.querySelector('[aria-invalid="true"]');
    if (field) {
      field.scrollIntoView({ block: "nearest", behavior: "auto" });
      field.focus({ preventScroll: true });
    }
    return !field;
  }

  /* The browser's own messages are announced only by its bubble, which never
     appears on a form this app submits itself. These say the same things in the
     app's voice, and go in the page where a screen reader can reach them. */
  function fieldValidityMessage(field) {
    const value = String(field.value).trim();
    if (field.required && !value) return "This field is needed.";
    const v = field.validity;
    if (v.valid) return "";
    if (v.rangeUnderflow) return "Enter " + (field.min || "a higher number") + " or more.";
    if (v.rangeOverflow) return "Enter " + (field.max || "a lower number") + " or less.";
    if (v.stepMismatch) return "Enter a whole number.";
    if (v.tooLong) return "Shorten this to " + field.maxLength + " characters or fewer.";
    if (v.badInput || v.typeMismatch) return field.type === "date" ? "Enter a date as year, month, and day." : "Enter a valid value.";
    return "Enter a valid value.";
  }

  function validateFields(container) {
    container.querySelectorAll("input,select,textarea").forEach((field) => {
      // offsetParent catches a field inside a hidden section, which field.hidden
      // alone misses and which the reader cannot be sent to.
      if (field.disabled || field.hidden || !field.willValidate || !field.offsetParent) return;
      setFieldError(field, fieldValidityMessage(field));
    });
    return focusInvalid(container);
  }

  function showFormError(message, container) {
    const root = container || document.querySelector(".view:not([hidden])") || elements.savebar;
    let error = root.querySelector(".form-error");
    if (!error) {
      error = document.createElement("p");
      error.className = "form-error";
      error.setAttribute("role", "alert");
      /* On the ledger pages the nav is fixed over the top 67px of the view, so
         an error prepended to the view sat underneath it. It goes under the
         page title instead, where the eye already is. */
      const title = root.querySelector(".custedit-title, .order-title-band");
      if (title) title.after(error);
      else root.prepend(error);
    }
    error.textContent = message || "";
    error.hidden = !message;
    return error;
  }

  function syncBottomBar() {
    // Whichever fixed bar is actually showing publishes its height, so content,
    // toasts, and focus targets clear exactly one of them.
    const activeBar = [
      elements.savebar,
      elements.productionBar,
      elements.fitdetBar,
      elements.fitaddBar,
      elements.schedcalMonthbar
    ].filter((bar) => bar && !bar.hidden)[0] || null;
    document.documentElement.style.setProperty(
      "--bottombar-h",
      activeBar ? Math.round(activeBar.getBoundingClientRect().height) + "px" : "0px"
    );
  }

  /* Publishes the keyboard's height and nothing else. It deliberately does not
     re-measure the bars: a bar's height does not change because the keyboard
     opened, and --bottombar-h feeds the page's bottom padding — so re-writing
     it here reflowed the page several times per keyboard animation, under a
     caret the user was aiming at. Bar heights are measured when a bar is shown
     or hidden, which is when they actually change.

     The reference is documentElement.clientHeight, NOT window.innerHeight.
     Every fixed bar sits at the bottom of the initial containing block, which
     is exactly what clientHeight measures, and it changes in the same layout
     pass the visual viewport does. window.innerHeight is a separate reading
     that lags on the browsers which shrink the layout viewport for the
     keyboard: a stale 760 against a fresh 424 published a 336px lift on a
     viewport that had already moved, and the bar flew into the middle of the
     screen. The window resize listener below corrected it a frame later, which
     is why the fault read as an intermittent jump rather than a broken bar.

     Coalesced through one frame because the keyboard reports its height in
     several steps, and each of resize/scroll/orientationchange can fire inside
     the same one. */
  let viewportFrame = 0;

  function measureVisualViewport() {
    viewportFrame = 0;
    const vp = window.visualViewport;
    const layoutBottom = document.documentElement.clientHeight;
    const visualBottom = vp && vp.scale === 1 ? vp.offsetTop + vp.height : layoutBottom;
    const offset = Math.max(0, Math.min(layoutBottom, layoutBottom - visualBottom));
    document.documentElement.style.setProperty("--keyboard-offset", Math.round(offset) + "px");
  }

  function syncVisualViewport() {
    if (viewportFrame) return;
    viewportFrame = requestAnimationFrame(measureVisualViewport);
  }

  /* ------------------------------- Swipe rows ----------------------------- */

  /* Swipe a ledger row left, a Delete button appears under it. One delegated
     listener serves every list, because a per-row listener on a feed that
     re-renders on every keystroke is a leak waiting to happen.

     touch-action: pan-y on the pane is what keeps this out of a fight with the
     page: the browser still owns vertical scrolling natively and hands us only
     the horizontal pan, so nothing here has to guess whether the user meant to
     scroll. We only decide which axis a gesture is on, once, and then stay on
     it.

     The gesture is never the only way to delete: every row's button stays in
     the tab order and opens its own row on focus, and both detail pages carry
     a delete row of their own. A gesture nobody can discover is not an
     affordance. */
  const SWIPE_REVEAL = 96; /* must equal .swipe__actions width */
  const SWIPE_SLOP = 8;
  const SWIPE_FLICK = 0.4; /* px per ms leftward that opens regardless of distance */

  let swipeDrag = null;
  let swipeMoved = false;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  /* A row can open either way: left reveals the trailing action (Delete),
     right reveals the leading one (Done) on rows that render one. `side` is
     "end", "start", or false for shut. */
  function closeSwipeRows(except) {
    $$(".swipe.is-open, .swipe.is-open-start").forEach((row) => {
      if (row === except) return;
      row.classList.add("is-settling");
      row.classList.remove("is-open", "is-open-start");
    });
  }

  function setSwipeRow(row, side) {
    $(".swipe__pane", row).style.removeProperty("--swipe-x");
    row.classList.add("is-settling");
    row.classList.toggle("is-open", "end" === side || true === side);
    row.classList.toggle("is-open-start", "start" === side);
    if (side) closeSwipeRows(row);
  }

  const swipeBase = (row) => row.classList.contains("is-open") ? -SWIPE_REVEAL
    : row.classList.contains("is-open-start") ? SWIPE_REVEAL : 0;
  const swipeReach = (row) => row.querySelector(".swipe__actions--start") ? SWIPE_REVEAL : 0;
  const SWIPE_ACTIONS = ".swipe__delete,.swipe__done";

  function bindSwipeRows() {
    document.addEventListener("pointerdown", (e) => {
      const pane = e.target.closest && e.target.closest(".swipe__pane");
      // A tap on the revealed button is not a drag on the row behind it.
      if (!pane || (e.target.closest && e.target.closest(SWIPE_ACTIONS))) return;
      if ("mouse" === e.pointerType && 0 !== e.button) return;
      const row = pane.closest(".swipe");
      swipeMoved = false;
      swipeDrag = {
        row: row,
        pane: pane,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startAt: e.timeStamp,
        base: swipeBase(row),
        reach: swipeReach(row),
        axis: ""
      };
      row.classList.remove("is-settling");
    });

    document.addEventListener("pointermove", (e) => {
      const drag = swipeDrag;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (!drag.axis) {
        // Whichever axis clears the slop first owns the gesture for good.
        if (Math.abs(dy) > SWIPE_SLOP && Math.abs(dy) >= Math.abs(dx)) {
          swipeDrag = null;
          return;
        }
        if (Math.abs(dx) <= SWIPE_SLOP) return;
        drag.axis = "x";
        swipeMoved = true;
        if (drag.pane.setPointerCapture) {
          try { drag.pane.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
        }
      }
      drag.pane.style.setProperty("--swipe-x", clamp(drag.base + dx, -SWIPE_REVEAL, drag.reach) + "px");
    });

    const endSwipe = (e) => {
      const drag = swipeDrag;
      if (!drag || e.pointerId !== drag.pointerId) return;
      swipeDrag = null;
      if (!drag.axis) {
        drag.row.classList.add("is-settling");
        return;
      }
      const dx = e.clientX - drag.startX;
      const travelled = clamp(drag.base + dx, -SWIPE_REVEAL, drag.reach);
      const elapsed = Math.max(1, e.timeStamp - drag.startAt);
      const flick = Math.abs(dx) / elapsed > SWIPE_FLICK;
      /* A flick moves one position in its direction — shut to open, or open
         back to shut — and never skips from one side straight to the other.
         A slow drag settles wherever it was let go, past halfway or not. */
      let side;
      if (flick) {
        const from = drag.base < 0 ? -1 : drag.base > 0 ? 1 : 0;
        const to = clamp(from + (dx < 0 ? -1 : 1), drag.reach ? -1 : -1, drag.reach ? 1 : 0);
        side = to < 0 ? "end" : to > 0 ? "start" : false;
      } else {
        side = travelled <= -SWIPE_REVEAL / 2 ? "end" : travelled >= SWIPE_REVEAL / 2 ? "start" : false;
      }
      setSwipeRow(drag.row, side);
    };
    document.addEventListener("pointerup", endSwipe);
    document.addEventListener("pointercancel", (e) => {
      const drag = swipeDrag;
      if (!drag || e.pointerId !== drag.pointerId) return;
      swipeDrag = null;
      setSwipeRow(drag.row, drag.base < 0 ? "end" : drag.base > 0 ? "start" : false);
    });

    /* Capture phase, because the pane holds a link: a drag that ends on a card
       and a tap on an already-open row both have to stop before navigation. */
    document.addEventListener("click", (e) => {
      const pane = e.target.closest && e.target.closest(".swipe__pane");
      if (!pane) {
        // A tap anywhere else puts the ledger back.
        if (!(e.target.closest && e.target.closest(SWIPE_ACTIONS))) closeSwipeRows(null);
        return;
      }
      const row = pane.closest(".swipe");
      const dragged = swipeMoved;
      swipeMoved = false;
      if (dragged) {
        /* The drag has already settled this row open or shut. Suppress the
           navigation the pointer sequence would otherwise trigger, and leave
           the state the gesture chose — closing here undid every swipe the
           moment it finished. */
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!swipeBase(row)) return;
      // A real tap on an open row puts it back rather than opening the record.
      e.preventDefault();
      e.stopPropagation();
      setSwipeRow(row, false);
    }, true);

    // Keyboard and screen-reader users reach the button through the tab order,
    // so the row has to open when it does.
    document.addEventListener("focusin", (e) => {
      const btn = e.target.closest && e.target.closest(SWIPE_ACTIONS);
      if (btn) setSwipeRow(btn.closest(".swipe"), btn.matches(".swipe__done") ? "start" : "end");
      else if (!(e.target.closest && e.target.closest(".swipe__pane"))) closeSwipeRows(null);
    });

    document.addEventListener("keydown", (e) => {
      if ("Escape" !== e.key) return;
      const open = $(".swipe.is-open, .swipe.is-open-start");
      if (open) setSwipeRow(open, false);
    });

    /* Every pane holds a link, and a mouse drag on a link starts the browser's
       own drag-and-drop — which fires pointercancel and killed the gesture one
       move in. Touch never hit this; a trackpad hit it every time. */
    document.addEventListener("dragstart", (e) => {
      if (e.target.closest && e.target.closest(".swipe__pane")) e.preventDefault();
    });
  }

  /* Wraps one ledger row so it can be swiped. `deleteAttr` is the data
     attribute the delete handler reads; `label` names the record for anyone
     who hears the button rather than sees which row it belongs to. `start`,
     when given, is the action a right swipe reveals: { attr, text, undo }. */
  function swipeRowHtml(cardHtml, deleteAttr, label, start) {
    return '<div class="swipe">' +
      (start ? '<div class="swipe__actions swipe__actions--start">' +
        '<button type="button" class="swipe__done' + (start.undo ? ' is-undo' : '') + '"' + start.attr + '>' + U.escapeHtml(start.text) +
          '<span class="sr-only"> ' + U.escapeHtml(label || "this record") + '</span>' +
        '</button>' +
      '</div>' : '') +
      '<div class="swipe__actions">' +
        '<button type="button" class="swipe__delete"' + deleteAttr + '>Delete' +
          '<span class="sr-only"> ' + U.escapeHtml(label || "this record") + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="swipe__pane">' + cardHtml + '</div>' +
    '</div>';
  }

  /* ------------------------------ Sheet motion ---------------------------- */

  /* A bottom sheet has to stay mounted while it slides back down, so hiding it
     is deferred rather than immediate. Two things that costs us, both handled
     here rather than at each call site:

       - Reopening mid-close. The pending hide is cancelled on open, otherwise
         the sheet you just reopened hides itself a beat later.
       - Reduced motion. No animation runs, so nothing should be waited for. */
  const sheetCloseTimers = new Map();

  function cancelSheetClose(sheetEl) {
    const pending = sheetCloseTimers.get(sheetEl);
    if (pending) {
      clearTimeout(pending);
      sheetCloseTimers.delete(sheetEl);
    }
    sheetEl.classList.remove("is-closing");
  }

  function closeSheetElement(sheetEl) {
    cancelSheetClose(sheetEl);
    if (reducedMotion()) {
      sheetEl.hidden = true;
      return;
    }
    sheetEl.classList.add("is-closing");
    sheetCloseTimers.set(sheetEl, setTimeout(() => {
      sheetCloseTimers.delete(sheetEl);
      sheetEl.classList.remove("is-closing");
      sheetEl.hidden = true;
    }, SHEET_OUT_MS));
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
      last.focus(); // focus-scroll-ok: tab wrapping inside a modal should reveal the item it lands on
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus(); // focus-scroll-ok: as above
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
    $$(".form-error").forEach((error) => { error.hidden = true; });
    elements.viewTitle.textContent = cfg.title;
    document.body.classList.toggle("is-homepage", !!cfg.homepage);
    document.body.classList.toggle("is-custpage", !!cfg.custpage);
    document.body.classList.toggle("is-custeditpage", !!cfg.custedit);
    document.body.classList.toggle("is-ordereditpage", !!cfg.orderedit);
    document.body.classList.toggle("is-orderpage", !!cfg.orderpage);
    document.body.classList.toggle("is-moodboardpage", !!cfg.moodboardpage);
    document.body.classList.toggle("is-fittinglogspage", !!cfg.fittinglogspage);
    document.body.classList.toggle("is-fitdetailpage", !!cfg.fitdetailpage);
    document.body.classList.toggle("is-schedulespage", !!cfg.schedulespage);
    document.body.classList.toggle("is-doclistpage", !!cfg.doclistpage);
    document.body.classList.toggle("is-productionpage", !!cfg.productionpage);
    document.body.classList.toggle("is-productioneditpage", !!cfg.productionedit);

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

  /* The curtain is no longer part of a route change. It survives for the two
     moments that really are a whole-app context switch — cold boot and the
     gate swap — where covering the screen is the point rather than a cost. */
  const CURTAIN_TRANSITION_MS = 300;
  const ROUTE_LEAVE_MS = 120;
  const ROUTE_ENTER_MS = 180;
  const SKELETON_DELAY_MS = 120;
  const SKELETON_MIN_MS = 250;

  /* Something to read while the app boots. The first load is the only one long
     enough to be worth filling — a route change raises the same curtain for
     300ms, and copy that appears and vanishes inside a third of a second is
     noise, so the panel is retired the first time the curtain comes down.

     KK.quotes decides what is eligible; this only decides when to swap. The
     rotation is what keeps a slow connection from staring at one line. */
  const BOOT_QUOTE_MS = 5200;
  let bootQuoteTimer = 0;
  let bootQuoteDone = false;

  function writeBootQuote() {
    const entry = KK.quotes.pick(new Date());
    elements.bootKicker.textContent = entry.label;
    elements.bootQuote.textContent = entry.text;
  }

  function startBootQuotes() {
    if (bootQuoteDone || elements.boot.hidden) return;
    writeBootQuote();
    elements.bootPanel.hidden = false;
    bootQuoteTimer = setInterval(() => {
      elements.bootQuote.classList.add("is-swapping");
      setTimeout(() => {
        writeBootQuote();
        elements.bootQuote.classList.remove("is-swapping");
      }, reducedMotion() ? 0 : 240);
    }, BOOT_QUOTE_MS);
  }

  function stopBootQuotes() {
    bootQuoteDone = true;
    if (bootQuoteTimer) clearInterval(bootQuoteTimer);
    bootQuoteTimer = 0;
    elements.bootPanel.hidden = true;
  }

  let curtainCovered = !elements.boot.hidden;
  let curtainCoverPromise = null;
  let routeLoaderShownAt = 0;
  let routeLoaderTimer = 0;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* A frame, or 32ms, whichever comes first. requestAnimationFrame does not
     fire at all while the document is hidden, so anything that awaits a bare
     frame stalls until the tab is looked at again — which for a route reveal
     means a page that never arrives. */
  const nextPaint = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, 32);
  });

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
    stopBootQuotes();
    document.body.classList.remove("is-page-transitioning");
  }

  /* Route motion. leaveView runs while the data request is already in flight,
     so the 120ms it costs is 120ms of the wait rather than 120ms on top of it.
     Input is locked for that window only — long enough to stop a double tap
     landing on a view that is halfway out, short enough not to feel dead. */
  async function leaveView() {
    if (curtainCovered) return;
    if (reducedMotion()) return;
    document.body.classList.add("is-page-transitioning");
    elements.page.classList.remove("is-entering", "is-entered");
    elements.page.classList.add("is-leaving");
    await wait(ROUTE_LEAVE_MS);
  }

  function armEnterView() {
    if (curtainCovered || reducedMotion()) return;
    elements.page.classList.remove("is-leaving");
    elements.page.classList.add("is-entering");
  }

  async function enterView() {
    document.body.classList.remove("is-page-transitioning");
    if (reducedMotion() || !elements.page.classList.contains("is-entering")) {
      elements.page.classList.remove("is-leaving", "is-entering", "is-entered");
      settlePageTransitions();
      return;
    }
    /* A forced reflow, not requestAnimationFrame. The entering state has to be
       committed before is-entered can transition off it, and rAF is paused in a
       backgrounded tab — a navigation that happened while the tab was hidden
       would otherwise sit at opacity 0 until the tab came back. */
    void elements.page.offsetHeight;
    elements.page.classList.add("is-entered");
    await wait(ROUTE_ENTER_MS);
    elements.page.classList.remove("is-entering", "is-entered");
    settlePageTransitions();
  }

  /* A transition that started while the document was hidden is frozen at its
     first frame — the animation clock does not run for a hidden document — and
     dropping the class it came from does not unfreeze it. Finishing them
     explicitly is what guarantees the page ends at its resting style rather
     than at whatever opacity the interrupted fade was holding. */
  function settlePageTransitions() {
    if (!elements.page.getAnimations) return;
    elements.page.getAnimations().forEach((anim) => {
      try { anim.finish(); } catch (_) { /* already finished or not fillable */ }
    });
  }

  /* is-entering holds the page at opacity 0, so anything that leaves it set is
     a blank screen. Every exit from a navigation goes through here. */
  function clearRouteMotion() {
    document.body.classList.remove("is-page-transitioning");
    elements.page.classList.remove("is-leaving", "is-entering", "is-entered");
    settlePageTransitions();
  }

  /* The add-photos page draws its own card skeletons inside the real ledger
     inset and reports its own load failure, so the generic route loader would
     only be a second, differently-shaped wait on top of it. */
  const routeHasOwnLoader = (r) =>
    "customers" === r.view || "order" === r.view || "fittingLogs" === r.view ||
    "fittingPhotoAdd" === r.view || "schedules" === r.view || "documents" === r.view;
  /* Announced by both the progress bar and the skeleton's live region, so a
     screen reader hears one name for the page rather than two. */
  const ROUTE_PROGRESS_LABELS = {
    customers: "customers",
    customer: "customer",
    customerEdit: "customer editor",
    order: "order",
    orderEdit: "order editor",
    moodboard: "moodboard",
    moodboardPreview: "moodboard",
    fittingNew: "new fitting",
    fittingLogs: "fitting logs",
    fittingLogDetail: "fitting log",
    fittingPhotoAdd: "fitting notes",
    schedules: "schedules",
    documents: "documents",
    calendar: "calendar settings",
    enquiry: "enquiry"
  };

  const routeLoaderKind = (r) =>
    "fittingLogDetail" === r.view
      ? "fitdet"
      : "customer" === r.view || "customerEdit" === r.view
      ? "ledger"
      : "moodboard" === r.view || "moodboardPreview" === r.view
      ? "moodboard"
      : "form";

  /* The skeleton is armed, not shown. A route that resolves inside
     SKELETON_DELAY_MS never paints one at all, which is what stops a warm
     navigation from flashing a shimmer it does not need; a route that is
     genuinely slow gets the skeleton and then holds it long enough to read. */
  function armRouteLoader(r) {
    cancelRouteLoader();
    if (routeHasOwnLoader(r)) return hideRouteLoader(true);
    /* The delay stands even under reduced motion: it is a debounce against a
       skeleton nobody needed, not an animation. */
    routeLoaderTimer = setTimeout(() => {
      routeLoaderTimer = 0;
      paintRouteLoader(r);
    }, SKELETON_DELAY_MS);
  }

  function cancelRouteLoader() {
    if (routeLoaderTimer) {
      clearTimeout(routeLoaderTimer);
      routeLoaderTimer = 0;
    }
  }

  function paintRouteLoader(r) {
    if (routeHasOwnLoader(r)) return hideRouteLoader(true);
    routeLoaderShownAt = Date.now();
    elements.routeLoader.dataset.kind = routeLoaderKind(r);
    elements.routeLoader.setAttribute("aria-busy", "true");
    elements.routeLoader.classList.remove("is-leaving");
    $(".route-loader__canvas", elements.routeLoader).hidden = false;
    elements.routeLoaderError.hidden = true;
    elements.routeLoaderStatus.textContent = "Loading " + (ROUTE_PROGRESS_LABELS[r.view] || "page") + ".";
    elements.routeLoader.hidden = false;
  }

  async function hideRouteLoader(force) {
    // An armed-but-never-painted loader costs nothing to dismiss: cancelling
    // the timer is the whole of it.
    cancelRouteLoader();
    if (elements.routeLoader.hidden) return;
    if (force || curtainCovered || reducedMotion()) {
      elements.routeLoader.hidden = true;
      elements.routeLoader.setAttribute("aria-busy", "false");
      elements.routeLoader.classList.remove("is-leaving");
      elements.routeLoaderStatus.textContent = "";
      return;
    }
    // The minimum dwell only applies to a loader that actually reached the
    // screen, so it can never be a floor on a fast route.
    await wait(Math.max(0, SKELETON_MIN_MS - (Date.now() - routeLoaderShownAt)));
    elements.routeLoader.classList.add("is-leaving");
    await wait(ROUTE_ENTER_MS);
    elements.routeLoader.hidden = true;
    elements.routeLoader.setAttribute("aria-busy", "false");
    elements.routeLoader.classList.remove("is-leaving");
    elements.routeLoaderStatus.textContent = "";
  }

  function showRouteError(err, r) {
    console.error(err);
    cancelRouteLoader();
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
        : "schedules" === r.view
        ? elements.schedcalTitle
        : "documents" === r.view
        ? elements.doclistTitle
        : "fittingLogs" === r.view
        ? elements.fitlogTitle
        : "fittingLogDetail" === r.view
        ? elements.fitdetTitle
        : "fittingPhotoAdd" === r.view
        ? elements.fitaddTitle
        : elements.viewTitle;

    /* Placing initial focus is this function's job only while nothing else has
       claimed it. A route that opens a dialog on arrival — the document picker
       on an empty list — focuses the field inside it, and moving focus back to
       the heading behind the sheet is what made the software keyboard rise and
       drop again a moment later. */
    const openDialog = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest('[role="dialog"]:not([hidden])')
      : null;
    if (openDialog) return;

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

  /* Status only ever moves forward: re-issuing a quotation for an order that is
     already Confirmed must not demote it back to Quoted. Extracted from
     bumpStatus so the document picker — which issues documents for an order the
     order page is not showing — can apply the same rule without touching that
     page's chrome. */
  function advancedStatus(current, target) {
    const prevIdx = ORDER_STATUSES.indexOf(current);
    const nextIdx = ORDER_STATUSES.indexOf(target);
    return nextIdx > prevIdx ? target : prevIdx === -1 ? ORDER_STATUSES[0] : current;
  }

  async function bumpStatus(newStatus) {
    const targetStatus = advancedStatus(state.order.status, newStatus);

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

  /* A ledger row deletes in place: the row goes, the summary re-counts, and the
     page you were reading stays the page you are reading. Navigating away from
     a list because one row left it would lose the scroll position and the
     search you were in the middle of. */
  async function deleteCustomerFromLedger(customerId) {
    const cust = (state.customers || []).filter((c) => c.id === customerId)[0];
    if (!cust) return;
    if (!window.confirm("Delete " + (cust.name || "this customer") + ", along with every order and download record? This cannot be undone.")) return;
    try {
      await db.deleteCustomer(customerId);
      state.customers = state.customers.filter((c) => c.id !== customerId);
      delete state.overview.ordersByCustomer[customerId];
      renderHomepageSummary();
      renderCustomerList();
      showToast("Customer deleted");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not delete");
    }
  }

  /* Swipe right on a customer: done, and to the foot of the ledger. Swiping a
     done customer right again offers Undo, which puts them back where their
     orders say they belong. The row re-sorts in place; scroll and search stay. */
  async function toggleCustomerDone(customerId) {
    const cust = (state.customers || []).find((c) => c.id === customerId);
    if (!cust) return;
    const completedAt = cust.completed_at ? null : new Date().toISOString();
    try {
      const saved = await db.updateCustomer(customerId, { completed_at: completedAt });
      state.customers = state.customers.map((c) => (c.id === customerId ? Object.assign({}, c, saved) : c));
      renderHomepageSummary();
      renderCustomerList();
      showToast(completedAt ? (cust.name || "Customer") + " marked done" : (cust.name || "Customer") + " is back in the list");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not update that customer");
    }
  }

  /* A penjahit with jobs cannot be deleted — the jobs carry money — so the
     database refuses and says why; this checks first so the refusal comes
     before the confirm, not after it. */
  async function deletePenjahitById(penjahitId, fromDetail) {
    const tailor = (state.production.penjahit || []).find((t) => t.id === penjahitId) || state.production.profile;
    if (!tailor) return;
    const name = tailor.name || "this penjahit";
    const linked = (state.production.jobs || []).filter((job) => job.penjahit_id === penjahitId).length;
    if (linked) {
      window.alert(name + " has " + linked + (1 === linked ? " job" : " jobs") + " on record, so they can't be deleted — their payments would lose their history. Archive them from Edit instead.");
      return;
    }
    if (!window.confirm("Delete " + name + "? This cannot be undone.")) return;
    try {
      await db.deletePenjahit(penjahitId);
      state.production.penjahit = state.production.penjahit.filter((t) => t.id !== penjahitId);
      showToast("Penjahit deleted");
      if (fromDetail) go("#/customers?tab=penjahit");
      else { $("#penjahitTabCount").textContent = state.production.penjahit.length || ""; renderPenjahitLedger(); }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not delete");
    }
  }

  async function deleteOrderFromCustomer(orderId) {
    const order = (state.customerOrders || []).filter((o) => o.id === orderId)[0];
    if (!order) return;
    if (!window.confirm("Delete " + orderLabel(order) + " and its payment and download record? This cannot be undone.")) return;
    try {
      await db.deleteOrder(orderId);
      state.customerOrders = state.customerOrders.filter((o) => o.id !== orderId);
      renderCustomerDetail(state.customer, state.customerOrders);
      renderCustomerReadOnly(state.customer);
      showToast("Order deleted");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not delete");
    }
  }

  /* The order twin of deleteCustomerRecord. It used to live inline in the
     app-bar menu's handler, which is why the delete rows at the bottom of the
     two detail pages could not reuse it. */
  async function deleteOrderRecord() {
    const order = state.order;
    if (!order || !order.id) return;
    if (!window.confirm("Delete this order and its payment and download record? This cannot be undone.")) return;
    const custId = order.customer_id;
    try {
      await db.deleteOrder(order.id);
      setDirty(false);
      showToast("Order deleted");
      go("#/customer/" + encodeURIComponent(custId));
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not delete");
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

  /* Hash -> route descriptor. Extracted from handleRoute so prefetch can ask
     what a link leads to without navigating to it. */
  function parseRoute(hash) {
    const hashStr = String(hash || "").replace(/^#\/?/, "");
    const qIdx = hashStr.indexOf("?");
    const segments = (-1 === qIdx ? hashStr : hashStr.slice(0, qIdx)).split("/").filter(Boolean);
    const query = new URLSearchParams(-1 === qIdx ? "" : hashStr.slice(qIdx + 1));

    if ("penjahit" === segments[0] && segments[1]) {
      return { view: segments[2] === "edit" ? "penjahitEdit" : "penjahit", id: segments[1], query };
    }
    if ("production" === segments[0] && segments[1]) {
      return { view: segments[1] === "new" ? "productionNew" : segments[2] === "edit" ? "productionEdit" : "productionJob", id: segments[1], query };
    }

    if ("customer" === segments[0] && segments[1] && "edit" === segments[2]) {
      return { view: "customerEdit", id: segments[1], query };
    }
    /* A new order is the one order route that cannot be keyed on an order id,
       because there is no row yet — it is keyed on the customer it will
       belong to, exactly as #/customer/new/edit is keyed on nothing at all.
       Matched before the bare customer route, which would otherwise swallow
       it on segments[1] alone. */
    if ("customer" === segments[0] && segments[1] && "order" === segments[2] && "new" === segments[3] && "edit" === segments[4]) {
      return { view: "orderEdit", id: "new", customerId: segments[1], query };
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
      return { view: "fittingLogRedirect", id: segments[1], sessionId: segments[3], query };
    }
    if (("order" === segments[0] && segments[1] && "fittings" === segments[2]) || ("order" === segments[0] && segments[1])) {
      return { view: "order", id: segments[1], query };
    }
    // Both fitting routes below are matched before the general feed, and each
    // carries only ids: they fetch and validate their own records so a pasted
    // URL behaves exactly like a tapped card.
    /* The per-photo editor is retired: a caption and a mark were the only
       things it could change, and the workspace changes both. An old link
       still resolves — it opens the workspace on the photo it named. */
    if ("fittings" === segments[0] && segments[1] && "photo" === segments[2] && segments[3] && "edit" === segments[4]) {
      return { view: "fittingPhotoRedirect", sessionId: segments[1], photoId: segments[3], query };
    }
    if ("fittings" === segments[0] && segments[1] && "edit" === segments[2]) {
      return { view: "fittingPhotoAdd", sessionId: segments[1], query };
    }
    // The workspace's first name, kept so an in-flight link still lands.
    if ("fittings" === segments[0] && segments[1] && "photos" === segments[2] && "add" === segments[3]) {
      return { view: "fittingPhotoAdd", sessionId: segments[1], query };
    }
    if ("fittings" === segments[0] && segments[1]) {
      return { view: "fittingLogDetail", sessionId: segments[1], query };
    }
    if ("fittings" === segments[0]) {
      return { view: "fittingLogs", query };
    }
    // Not "#/calendar" — that name already belongs to the Google Calendar
    // connection settings, which is a different page about a different thing.
    if ("schedules" === segments[0]) {
      return { view: "schedules", query };
    }
    // One view, two routes: the kind is the only thing that differs.
    if ("quotations" === segments[0]) {
      return { view: "documents", kind: "quotation", query };
    }
    if ("invoices" === segments[0]) {
      return { view: "documents", kind: "invoice", query };
    }
    if ("calendar" === segments[0]) {
      return { view: "calendar", query };
    }
    if ("enquiry" === segments[0] && segments[1]) {
      return { view: "enquiry", id: segments[1], query };
    }
    return { view: "customers", query };
  }

  /* ---------------------------- Prefetch on intent ------------------------ */

  /* A tap is not the first moment we know where someone is going — pointerdown
     is, and on a phone that lands 80–150ms before the hash changes; a desktop
     hover buys longer still. Firing the route's opening query then means the
     navigation frequently finds its answer already sitting in db's cache.

     Only the first query of a route is warmed. The rest of the chain needs ids
     this one has not returned yet, and speculatively fanning out on every link
     someone's thumb brushes past is a good way to spend a data plan. */
  const prefetched = new Map();
  const PREFETCH_COOLDOWN_MS = 5000;

  function prefetchRoute(hash) {
    if (!hash || hash === location.hash) return;
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(String(conn.effectiveType || "")))) return;

    const last = prefetched.get(hash);
    if (last && Date.now() - last < PREFETCH_COOLDOWN_MS) return;
    prefetched.set(hash, Date.now());

    let route;
    try { route = parseRoute(hash); } catch (_) { return; }

    // Speculative: a failure here is not the user's problem, and the real
    // navigation will surface it properly a moment later.
    const swallow = (promise) => { if (promise && promise.catch) promise.catch(() => {}); };

    if ("customer" === route.view || "customerEdit" === route.view) {
      swallow(db.getCustomer(route.id));
    } else if ("order" === route.view || "orderEdit" === route.view || "moodboard" === route.view ||
               "moodboardPreview" === route.view || "fittingNew" === route.view) {
      if ("new" !== route.id) swallow(db.getOrder(route.id));
    } else if ("fittingLogDetail" === route.view || "fittingPhotoAdd" === route.view) {
      swallow(db.getFittingSession(route.sessionId || route.id));
    } else if ("customers" === route.view) {
      swallow(db.listCustomers());
    } else if ("enquiry" === route.view) {
      swallow(db.getIntake(route.id));
    }
  }

  function bindPrefetch() {
    const hashFor = (target) => {
      const link = target && target.closest && target.closest('a[href^="#/"]');
      return link ? link.getAttribute("href") : "";
    };
    document.addEventListener("pointerdown", (ev) => prefetchRoute(hashFor(ev.target)), { passive: true });
    // Hover is a much weaker signal than a press, so it is only trusted on
    // pointers that can actually hover.
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      document.addEventListener("pointerover", (ev) => prefetchRoute(hashFor(ev.target)), { passive: true });
    }
  }

  async function handleRoute(skipAnimationFlag) {
    const skipMotion = skipAnimationFlag === true;
    const targetRoute = parseRoute(location.hash);

    const prevRoute = state.route;
    if (prevRoute && prevRoute.view === "customers") {
      state.production.scrollY = window.scrollY;
    }

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
    if (!skipMotion) {
      KK.progress.start(ROUTE_PROGRESS_LABELS[targetRoute.view] || "page");
      await leaveView();
    }
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

    if ("customers" !== targetRoute.view) {
      cleanupHomepageAtmosphere();
    }

    state.route = targetRoute;
    elements.viewCustomers.hidden = "customers" !== targetRoute.view;
    elements.viewCustomer.hidden = "customer" !== targetRoute.view;
    elements.viewCustomerEdit.hidden = "customerEdit" !== targetRoute.view;
    elements.viewOrder.hidden = "order" !== targetRoute.view;
    elements.viewOrderEdit.hidden = "orderEdit" !== targetRoute.view;
    elements.viewMoodboard.hidden = !isMoodboard;
    elements.viewFittingLogs.hidden = "fittingLogs" !== targetRoute.view;
    elements.viewFittingDetail.hidden = "fittingLogDetail" !== targetRoute.view;
    elements.viewFittingPhotoAdd.hidden = "fittingPhotoAdd" !== targetRoute.view;
    elements.viewCalendar.hidden = "calendar" !== targetRoute.view;
    elements.viewEnquiry.hidden = "enquiry" !== targetRoute.view;
    elements.viewSchedules.hidden = "schedules" !== targetRoute.view;
    elements.viewDocuments.hidden = "documents" !== targetRoute.view;
    elements.viewPenjahit.hidden = "penjahit" !== targetRoute.view;
    elements.viewPenjahitEdit.hidden = "penjahitEdit" !== targetRoute.view;
    elements.viewProductionEdit.hidden = !["productionNew", "productionEdit"].includes(targetRoute.view);
    if (elements.viewProductionEdit.hidden) elements.productionBar.hidden = true;
    elements.viewProductionJob.hidden = "productionJob" !== targetRoute.view;
    elements.productionPaymentForm.hidden = true;

    // Leaving the feed must take its observer, debounce, and in-flight page
    // tokens with it, or a late response can render into a hidden view. Moving
    // deeper into the fitting-log family instead parks the feed intact so Back
    // can restore the same list, the same pages, and the same offset.
    if (!inFittingFamily(targetRoute)) {
      if (prevRoute && "fittingLogs" === prevRoute.view) cleanupFittingLogs();
      cleanupFittingDetail();
      cleanupFittingPhotoAdd();
    } else {
      if (prevRoute && "fittingLogs" === prevRoute.view && "fittingLogs" !== targetRoute.view) {
        parkFittingLogs();
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
    // The calendar has no cursor and no scroll depth worth restoring, and its
    // data is a snapshot that must not survive a write, so it tears down rather
    // than parking. Only the month on screen is retained.
    if (prevRoute && "schedules" === prevRoute.view && "schedules" !== targetRoute.view) {
      cleanupSchedules();
    }
    /* The document feed has no route family — a row goes to the order and Back
       comes straight here. That one hop is worth keeping the list, cursor and
       offset alive for; every other exit is an ordinary teardown. */
    if (prevRoute && "documents" === prevRoute.view && "documents" !== targetRoute.view) {
      if ("order" === targetRoute.view) parkDocuments();
      else cleanupDocuments();
    }
    if ("documents" !== targetRoute.view) closeDocumentPicker(true);
    if ("fittingPhotoAdd" !== targetRoute.view) {
      elements.fitaddBar.hidden = true;
      elements.fitaddUndo.hidden = true;
      document.body.classList.remove("has-fitadd-bar");
    }

    // The stage picker is the only fitting overlay left, and it belongs to the
    // one route that opens it.
    if ("fittingNew" !== targetRoute.view) KK.fittings.closeAll();

    syncBottomBar();
    window.scrollTo(0, 0);
    armRouteLoader(targetRoute);
    if (!skipMotion) armEnterView();

    const renderFn = async () => {
      if ("customers" === targetRoute.view) {
        await showCustomers();
      } else if (["penjahit", "penjahitEdit", "productionNew", "productionEdit", "productionJob"].includes(targetRoute.view)) {
        await showProductionRoute(targetRoute);
      } else if ("customer" === targetRoute.view) {
        await showCustomerDetail(targetRoute.id);
      } else if ("customerEdit" === targetRoute.view) {
        await showCustomerEdit(targetRoute.id, targetRoute.query);
      } else if ("orderEdit" === targetRoute.view) {
        await (async function (orderId, newCustomerId) {
          /* The one difference a new order makes is where the record comes
             from — a template instead of the database, and the customer read
             straight off the route. Everything below it fills the same form
             from the same shape, which is the whole reason this is the order
             editor rather than a second, smaller one bolted onto the picker. */
          const isNew = "new" === orderId;

          if (isNew) {
            state.order = Object.assign({}, NEW_ORDER_TEMPLATE);
            state.customer = await db.getCustomer(newCustomerId);
            // Stale from whichever order was open before; the schedule hint
            // reads it for pins and a new order has none.
            state.schedule = null;
            state.customerOrders = [];
          } else {
            const rec = splitOrder(await db.getOrder(orderId));
            state.order = rec.order;
            state.customer = rec.customer || await db.getCustomer(rec.order.customer_id);
          }

          setChrome(isNew ? {
            title: "New order",
            // The customer's own name, not orderFirstName's parenthesised form:
            // that one is shaped for the order page's back button, and the up
            // link names the page it returns to plainly.
            up: { label: (state.customer && state.customer.name) || "Customer", hash: "#/customer/" + encodeURIComponent(state.customer.id) },
            save: true,
            orderedit: true
          } : {
            title: "Edit order",
            up: { label: orderLabel(state.order), hash: "#/order/" + orderId },
            save: true,
            destroy: "order",
            orderedit: true
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
          if (isNew) elements.oTitle.focus({ preventScroll: true });
        })(targetRoute.id, targetRoute.customerId);
      } else if ("moodboard" === targetRoute.view) {
        await (async function (orderId) {
          const rec = splitOrder(await db.getOrder(orderId));
          state.order = rec.order;
          const res = await Promise.all([
            rec.customer ? Promise.resolve(rec.customer) : db.getCustomer(rec.order.customer_id),
            db.listOrders(rec.order.customer_id)
          ]);
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
          const rec = splitOrder(await db.getOrder(orderId));
          state.order = rec.order;
          state.customer = rec.customer || await db.getCustomer(rec.order.customer_id);
          const fromFeed = "fittings" === targetRoute.query.get("from");
          setChrome({
            title: "New fitting",
            up: fromFeed
              ? { label: "Fitting logs", hash: "#/fittings" }
              : { label: orderLabel(state.order), hash: "#/order/" + orderId },
            save: false
          });

          /* The workspace edits one durable fitting log, so the row exists
             before its route does. Creating it here rather than lazily at the
             first save keeps every part of that page — capacity, undo, backup,
             the atomic batch — working against a real session id instead of a
             null one. Leaving without saving a single photo deletes it again,
             so an abandoned pick still costs nothing. */
          /* The fitting feed can start a log too, through the picker, and Back
             belongs on whatever you actually came from. source is already
             strictly binary — anything that is not "order" is read as "feed" —
             so the feed case simply omits it rather than adding a third value
             for every downstream branch to learn. */
          const editHash = (sessionId, isNew) => "#/fittings/" + encodeURIComponent(sessionId) + "/edit" +
            (fromFeed ? (isNew ? "?new=1" : "") : "?source=order" + (isNew ? "&new=1" : ""));

          const openStage = async (stageName) => {
            try {
              if (calendar.PRODUCTION_STAGES.indexOf(stageName) === -1) throw new Error("Choose a valid fitting stage");

              const existing = await db.getFittingSessionByStage(orderId, stageName);
              if (existing) return go(editHash(existing.id, false));

              let created;
              try {
                created = await db.createFittingSession({ order_id: orderId, stage: stageName, status: "active" });
              } catch (err) {
                // Another tab won the race for this order and stage; join its log.
                if (!err || "23505" !== err.code) throw err;
                created = await db.getFittingSessionByStage(orderId, stageName);
                if (!created) throw err;
              }
              go(editHash(created.id, true));
            } catch (err) {
              showToast(err.message || "Could not start fitting log");
            }
          };

          const explicitStage = targetRoute.query.get("stage");
          if (calendar.PRODUCTION_STAGES.indexOf(explicitStage) !== -1) await openStage(explicitStage);
          else KK.fittings.showStagePicker([], openStage, () => go(fromFeed ? "#/fittings" : "#/order/" + orderId));
        })(targetRoute.id);
      } else if ("fittingLogRedirect" === targetRoute.view) {
        // Old order-scoped bookmarks join the canonical detail route.
        return go("#/fittings/" + encodeURIComponent(targetRoute.sessionId) + "?source=order");
      } else if ("schedules" === targetRoute.view) {
        await showSchedules(targetRoute.query);
      } else if ("documents" === targetRoute.view) {
        await showDocuments(targetRoute.kind, targetRoute.query);
      } else if ("fittingLogs" === targetRoute.view) {
        await showFittingLogs(targetRoute.query);
      } else if ("fittingLogDetail" === targetRoute.view) {
        await showFittingLogDetail(targetRoute.sessionId, targetRoute.query);
      } else if ("fittingPhotoRedirect" === targetRoute.view) {
        const editSource = "order" === targetRoute.query.get("source") ? "order" : "feed";
        return go(
          "#/fittings/" + encodeURIComponent(targetRoute.sessionId) +
          "/edit?source=" + editSource + "&focus=" + encodeURIComponent(targetRoute.photoId)
        );
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

    /* No grace period and no second animation. The page appears the moment its
       data is in, because the only motion left to pay for — the enter — was
       already armed before the request settled. */
    const finalResult = await settledTask;
    if (routeToken !== state.navigation.token) {
      // Superseded mid-flight: the navigation that replaced this one owns both
      // the bar and the page's motion state, so neither is settled here.
      return;
    }

    try {
      if (curtainCovered) await revealCurtain();

      if (finalResult.ok) {
        await hideRouteLoader(false);
        await enterView();
        KK.progress.done();
        focusRoute(targetRoute);
        if (targetRoute.view === "customers") window.scrollTo(0, state.production.scrollY || 0);
      } else {
        KK.progress.fail();
        await enterView();
        if (routeHasOwnLoader(targetRoute)) {
          showToast((finalResult.error && finalResult.error.message) || "Could not load that");
        } else {
          showRouteError(finalResult.error, targetRoute);
        }
      }
    } finally {
      // Whatever went wrong above, the page does not get left at opacity 0 with
      // input locked.
      if (routeToken === state.navigation.token) {
        clearRouteMotion();
        cancelRouteLoader();
        if (KK.progress.isActive()) KK.progress.done();
      }
    }
  }

  /* db.getOrder and db.getFittingSession embed their parent rows so one round
     trip answers what used to take three or four. The embed is split off again
     the moment it arrives: state.order has to stay the exact shape the order
     writers send back to PostgREST, and a stray `customers` key on an update
     payload is a 400. */
  function splitOrder(rec) {
    const order = Object.assign({}, rec);
    const customer = rec.customers || null;
    delete order.customers;
    return { order, customer };
  }

  function splitSession(rec) {
    const session = Object.assign({}, rec);
    delete session.orders;
    const nested = rec.orders ? splitOrder(rec.orders) : { order: null, customer: null };
    return { session, order: nested.order, customer: nested.customer };
  }

  const orNull = (str) => "" === String(str || "").trim() ? null : String(str).trim();

  function orderLabel(orderRecord) {
    if (orderRecord.title) return orderRecord.title;
    const items = orderRecord.items || [];
    return items.length && items[0].name ? items[0].name + (items.length > 1 ? " + " + (items.length - 1) + " more" : "") : "Empty order";
  }

  const isCosted = (item) => (Number(item.cost) || 0) > 0;
  const isNamed = (item) => "" !== String(item.name || "").trim();

  const HOME_ATMOSPHERE_PHASES = {
    dawn: {
      key: "dawn",
      greetingPeriod: "morning",
      base: "#DCE9FF",
      palette: ["#7FB9E8", "#A596D9", "#C97ABF", "#F5B3A2", "#FFD7A8", "#F6E7D7"],
      line: "rgba(23,21,15,.10)",
      scrim: "#EAF1FF",
      /* Dawn is the one genuinely pastel palette, so its fields need more of
         themselves before they read as colour at all. */
      depth: 1.22,
      ink: "#17150F",
      skeleton: "rgba(23,21,15,.16)",
      skeletonPeak: "rgba(23,21,15,.28)"
    },
    morning: {
      key: "morning",
      greetingPeriod: "morning",
      base: "#DDF8F8",
      palette: ["#04A8D6", "#49CFE2", "#7CD4C4", "#F7E733", "#FFF6A8", "#F36F32"],
      line: "rgba(23,21,15,.10)",
      scrim: "#E6FBF6",
      ink: "#17150F",
      skeleton: "rgba(23,21,15,.16)",
      skeletonPeak: "rgba(23,21,15,.28)"
    },
    afternoon: {
      key: "afternoon",
      greetingPeriod: "afternoon",
      base: "#FFEFA1",
      palette: ["#18A9DC", "#75D4EA", "#FFF000", "#FFB52E", "#FF6533", "#DD3C9D"],
      line: "rgba(23,21,15,.10)",
      scrim: "#FFF3C4",
      ink: "#17150F",
      skeleton: "rgba(23,21,15,.16)",
      skeletonPeak: "rgba(23,21,15,.28)"
    },
    evening: {
      key: "evening",
      greetingPeriod: "evening",
      base: "#44265F",
      palette: ["#244F9B", "#6A3FA0", "#C32C95", "#EF3F67", "#FF7A2E", "#FFB34D"],
      line: "rgba(254,250,241,.10)",
      scrim: "#2A1740",
      ink: "#FEFAF1",
      skeleton: "rgba(254,250,241,.18)",
      skeletonPeak: "rgba(254,250,241,.32)"
    },
    night: {
      key: "night",
      greetingPeriod: "evening",
      base: "#071B3D",
      palette: ["#0C2556", "#173F7A", "#315AA8", "#5267A6", "#372D72", "#1C6F82"],
      line: "rgba(254,250,241,.09)",
      scrim: "#04122A",
      ink: "#FEFAF1",
      skeleton: "rgba(254,250,241,.18)",
      skeletonPeak: "rgba(254,250,241,.32)"
    }
  };

  const homeAtmosphereState = {
    activeIndex: 0,
    seedKey: "",
    phase: "",
    greetingPeriod: "morning",
    timer: null,
    transitionTimer: null,
    transitionToken: 0
  };

  function homepageAtmospherePhase(dateObj) {
    const hour = dateObj.getHours();
    if (hour < 5) return HOME_ATMOSPHERE_PHASES.night;
    if (hour < 8) return HOME_ATMOSPHERE_PHASES.dawn;
    if (hour < 12) return HOME_ATMOSPHERE_PHASES.morning;
    if (hour < 17) return HOME_ATMOSPHERE_PHASES.afternoon;
    if (hour < 20) return HOME_ATMOSPHERE_PHASES.evening;
    return HOME_ATMOSPHERE_PHASES.night;
  }

  function homepageAtmosphereSeedKey(dateObj, phaseKey) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const w = dateObj.getDay();
    return yyyy + "-" + mm + "-" + dd + "-" + w + "-" + phaseKey;
  }

  function homepageAtmosphereHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function homepageAtmosphereRandom(seed) {
    return function () {
      seed += 0x6D2B79F5;
      let value = seed;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Five soft colour fields laid over the phase's base, seeded by the day so the
     picture is different every morning and identical all through one. Anchors
     rather than free placement: five random points bunch, and a mesh gradient
     only reads as one if the fields are spread and overlapping. */
  const ATMOSPHERE_BLOB_ANCHORS = [[20, 24], [80, 18], [50, 55], [16, 80], [86, 72]];

  function buildHomepageAtmosphereScene(scene, config, seedKey) {
    const random = homepageAtmosphereRandom(homepageAtmosphereHash(seedKey));
    const fragment = document.createDocumentFragment();

    // Shuffled, not sampled: every field gets a different hue from the palette.
    const picks = config.palette.slice();
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const swap = picks[i];
      picks[i] = picks[j];
      picks[j] = swap;
    }

    ATMOSPHERE_BLOB_ANCHORS.forEach((anchor, index) => {
      const blob = document.createElement("i");
      blob.className = "home-atmosphere__blob";
      const duration = 18 + random() * 14;

      blob.style.setProperty("--blob-color", picks[index % picks.length]);
      blob.style.setProperty("--blob-x", (anchor[0] + (-13 + random() * 26)).toFixed(2) + "%");
      blob.style.setProperty("--blob-y", (anchor[1] + (-13 + random() * 26)).toFixed(2) + "%");
      blob.style.setProperty("--blob-size", (64 + random() * 46).toFixed(2) + "%");
      blob.style.setProperty("--blob-opacity", ((0.58 + random() * 0.3) * (config.depth || 1)).toFixed(2));
      /* Enough travel to move the colour from one pixel cell to the next, but
         still slow enough to read as changing light rather than wallpaper. */
      blob.style.setProperty("--blob-from-x", (-9 + random() * 18).toFixed(2) + "%");
      blob.style.setProperty("--blob-from-y", (-9 + random() * 18).toFixed(2) + "%");
      blob.style.setProperty("--blob-to-x", (-9 + random() * 18).toFixed(2) + "%");
      blob.style.setProperty("--blob-to-y", (-9 + random() * 18).toFixed(2) + "%");
      blob.style.setProperty("--blob-from-scale", (0.88 + random() * 0.14).toFixed(3));
      blob.style.setProperty("--blob-to-scale", (1.04 + random() * 0.16).toFixed(3));
      blob.style.setProperty("--blob-duration", duration.toFixed(2) + "s");
      // Negative delay drops each field somewhere else in its own cycle, so they
      // never swing together.
      blob.style.setProperty("--blob-delay", (-(random() * duration)).toFixed(2) + "s");

      fragment.appendChild(blob);
    });

    scene.replaceChildren(fragment);
  }

  function seedHomepageAtmosphereSafeArea(seedKey) {
    if (!elements.homeAtmosphere) return;
    const random = homepageAtmosphereRandom(homepageAtmosphereHash(seedKey + "-safe-area"));
    const duration = 21 + random() * 12;

    /* The exclusion field follows its own nearby path, so the protected area
       belongs to the moving picture instead of looking pinned behind the copy. */
    elements.homeAtmosphere.style.setProperty("--safe-from-x", (-2 + random() * 4).toFixed(2) + "%");
    elements.homeAtmosphere.style.setProperty("--safe-from-y", (-1.5 + random() * 3).toFixed(2) + "%");
    elements.homeAtmosphere.style.setProperty("--safe-to-x", (-2 + random() * 4).toFixed(2) + "%");
    elements.homeAtmosphere.style.setProperty("--safe-to-y", (-1.5 + random() * 3).toFixed(2) + "%");
    elements.homeAtmosphere.style.setProperty("--safe-from-scale", (0.96 + random() * 0.05).toFixed(3));
    elements.homeAtmosphere.style.setProperty("--safe-to-scale", (1.01 + random() * 0.05).toFixed(3));
    elements.homeAtmosphere.style.setProperty("--safe-duration", duration.toFixed(2) + "s");
    elements.homeAtmosphere.style.setProperty("--safe-delay", (-(random() * duration)).toFixed(2) + "s");
  }

  function homepageAtmosphereNextBoundary(dateObj) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();

    const candidates = [
      new Date(y, m, d, 5, 0, 0, 0),
      new Date(y, m, d, 8, 0, 0, 0),
      new Date(y, m, d, 12, 0, 0, 0),
      new Date(y, m, d, 17, 0, 0, 0),
      new Date(y, m, d, 20, 0, 0, 0),
      new Date(y, m, d + 1, 0, 0, 0, 0)
    ];

    const nowMs = dateObj.getTime();
    const valid = candidates.filter((c) => c.getTime() > nowMs);
    valid.sort((a, b) => a.getTime() - b.getTime());
    return valid[0];
  }

  function scheduleHomepageAtmosphere(dateObj) {
    if (homeAtmosphereState.timer) {
      clearTimeout(homeAtmosphereState.timer);
      homeAtmosphereState.timer = null;
    }
    const next = homepageAtmosphereNextBoundary(dateObj);
    const delay = Math.max(0, next.getTime() - Date.now() + 250);
    homeAtmosphereState.timer = setTimeout(() => {
      syncHomepageAtmosphere({ instant: false });
    }, delay);
  }

  function syncHomepageAtmosphere(options) {
    const now = new Date();
    const config = homepageAtmospherePhase(now);
    const seedKey = homepageAtmosphereSeedKey(now, config.key);

    scheduleHomepageAtmosphere(now);

    homeAtmosphereState.greetingPeriod = config.greetingPeriod;

    if (elements.viewCustomers) {
      elements.viewCustomers.dataset.atmospherePhase = config.key;
      elements.viewCustomers.style.setProperty("--home-hero-ink", config.ink);
      elements.viewCustomers.style.setProperty("--home-hero-skeleton", config.skeleton);
      elements.viewCustomers.style.setProperty("--home-hero-skeleton-peak", config.skeletonPeak);
    }
    if (elements.homeAtmosphere) {
      elements.homeAtmosphere.style.setProperty("--home-atmosphere-base", config.base);
      elements.homeAtmosphere.style.setProperty("--home-atmosphere-line", config.line);
      // The greeting's safe area is the phase's own base colour, so it always
      // pushes the field the way that phase's ink needs it to go.
      elements.homeAtmosphere.style.setProperty("--home-atmosphere-scrim", config.scrim);
    }

    if (state.route && "customers" === state.route.view && elements.heroGreeting && elements.heroGreeting.textContent) {
      renderHomepageHero();
    }

    homeAtmosphereState.transitionToken++;
    if (homeAtmosphereState.transitionTimer) {
      clearTimeout(homeAtmosphereState.transitionTimer);
      homeAtmosphereState.transitionTimer = null;
    }

    if (homeAtmosphereState.seedKey && elements.homeAtmosphereSceneA && elements.homeAtmosphereSceneB) {
      if (homeAtmosphereState.activeIndex === 0) {
        elements.homeAtmosphereSceneA.classList.add("is-visible");
        elements.homeAtmosphereSceneB.classList.remove("is-visible");
      } else {
        elements.homeAtmosphereSceneB.classList.add("is-visible");
        elements.homeAtmosphereSceneA.classList.remove("is-visible");
      }
    }

    if (seedKey === homeAtmosphereState.seedKey) {
      return;
    }

    const isInitialScene = !homeAtmosphereState.seedKey;
    const targetIndex = isInitialScene ? 0 : 1 - homeAtmosphereState.activeIndex;
    const targetScene = targetIndex === 0 ? elements.homeAtmosphereSceneA : elements.homeAtmosphereSceneB;
    const oldScene = isInitialScene ? null : homeAtmosphereState.activeIndex === 0 ? elements.homeAtmosphereSceneA : elements.homeAtmosphereSceneB;

    if (!targetScene) return;

    buildHomepageAtmosphereScene(targetScene, config, seedKey);
    seedHomepageAtmosphereSafeArea(seedKey);
    homeAtmosphereState.seedKey = seedKey;
    homeAtmosphereState.phase = config.key;

    const isInstant = !!(options && options.instant) || reducedMotion();

    if (isInitialScene && !isInstant) {
      requestAnimationFrame(() => {
        targetScene.classList.add("is-visible");
        homeAtmosphereState.activeIndex = targetIndex;
      });
      return;
    }

    if (isInstant) {
      targetScene.classList.add("is-instant", "is-visible");
      if (oldScene && oldScene !== targetScene) {
        oldScene.classList.remove("is-visible");
        oldScene.replaceChildren();
      }
      homeAtmosphereState.activeIndex = targetIndex;
      requestAnimationFrame(() => {
        targetScene.classList.remove("is-instant");
      });
    } else {
      const capturedToken = homeAtmosphereState.transitionToken;
      const capturedOldScene = oldScene;

      requestAnimationFrame(() => {
        targetScene.classList.add("is-visible");
        capturedOldScene.classList.remove("is-visible");
        homeAtmosphereState.activeIndex = targetIndex;

        homeAtmosphereState.transitionTimer = setTimeout(() => {
          if (homeAtmosphereState.transitionToken === capturedToken) {
            capturedOldScene.replaceChildren();
            homeAtmosphereState.transitionTimer = null;
          }
        }, 1400);
      });
    }
  }

  function cleanupHomepageAtmosphere() {
    if (homeAtmosphereState.timer) {
      clearTimeout(homeAtmosphereState.timer);
      homeAtmosphereState.timer = null;
    }
    if (homeAtmosphereState.transitionTimer) {
      clearTimeout(homeAtmosphereState.transitionTimer);
      homeAtmosphereState.transitionTimer = null;
    }
    homeAtmosphereState.transitionToken++;
    if (elements.homeAtmosphereSceneA && elements.homeAtmosphereSceneB) {
      if (homeAtmosphereState.activeIndex === 0) {
        elements.homeAtmosphereSceneA.classList.add("is-visible");
        elements.homeAtmosphereSceneB.classList.remove("is-visible");
      } else {
        elements.homeAtmosphereSceneB.classList.add("is-visible");
        elements.homeAtmosphereSceneA.classList.remove("is-visible");
      }
    }
  }

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
    syncHomepageAtmosphere({ instant: reducedMotion() });
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
    const activeDeadlineCust = state.customers
      .filter(isActive)
      .map((c) => ({ customer: c, deadline: nextDeadline(c) }))
      .filter((c) => c.deadline)
      .sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))[0];

    elements.heroGreeting.textContent = greetingForClock({ period: homeAtmosphereState.greetingPeriod });

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
    /* This used to wait on document.fonts.ready before revealing anything,
       which pinned first paint to a webfont that font-display already governs.
       One frame is all the measurement below actually needs. */
    await nextPaint();
    if (!isCurrentHomepageLoad(token)) return;

    elements.homeStage.style.height = Math.ceil(elements.homeReady.getBoundingClientRect().height || elements.homeReady.scrollHeight) + "px";
    elements.homeReady.classList.remove("is-measuring");
    elements.homeReady.classList.add("is-transitioning");
    elements.homeLoading.classList.add("is-transitioning");

    nextPaint().then(() => {
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
      // Before the ledger renders, not after: renderHomepageReady filters the
      // customer list by whatever is in the shared search field, and coming
      // back from the penjahit tab that is still the penjahit query.
      state.production.ledgerLoaded = false;
      elements.homeCustomers.style.minHeight = "";
      elements.homePenjahit.style.minHeight = "";
      syncLedgerTab();
      renderHomepageReady({ customers: res[0], submissions: res[3] });
      try { await showHomepageLedger(); } catch (error) {
        if (isCurrentHomepageLoad(token)) showFormError(error.message || "Could not load penjahit. Try again.", elements.homePenjahit.hidden ? elements.viewCustomers : elements.homePenjahit);
      }
      if (!isCurrentHomepageLoad(token)) return;
      prepareShortcutAppearState();
      await revealHomepage(token);
      // The tab nobody is looking at, fetched after the page is on screen, so
      // the first switch is a render rather than a wait.
      if (state.production.available && !state.production.ledgerLoaded) loadPenjahitLedger(false).catch(() => {});
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
      /* Only the inert card. Every shortcut here is a <button>, and cancelling
         the key that presses one cancels the click it would have synthesised —
         so a blanket preventDefault leaves them mouse-only. */
      if (target.matches('[aria-disabled="true"]')) e.preventDefault();
    }
  });

  window.addEventListener("keyup", clearHomepagePresses);
  /* Enquiries is the one shortcut that still leads nowhere, and it says so in
     the markup rather than here — naming it would mean editing this line the
     day it is finished. Everything else either navigates as an <a> or has its
     own handler, and must be left alone. */
  elements.homeReady.addEventListener("click", (e) => {
    if (e.target.closest('.home-action[aria-disabled="true"],.home-alert[aria-disabled="true"]')) e.preventDefault();
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
      if (target.matches(".cust-banner") && !target.matches("a.cust-banner")) e.preventDefault();
    }
  });

  elements.viewSchedules.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".cust-nav-btn,.schedcal-day,.schedcal-panel__retry");
    if (target) target.classList.add("is-pressed");
  });

  elements.viewSchedules.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".cust-nav-btn,.schedcal-day,.schedcal-panel__retry");
    if (target) target.classList.add("is-pressed");
  });

  /* The month bar and the day sheet are siblings of the views, not descendants,
     so their keys need their own listeners to get the same press state
     everything else on the page has. clearHomepagePresses sweeps the whole
     document, so release is already handled. */
  elements.schedcalMonthbar.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".schedcal-monthbar__btn");
    if (target) {
      target.classList.add("is-pressed");
      hapticTap();
    }
  });

  elements.schedcalMonthbar.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".schedcal-monthbar__btn");
    if (target) target.classList.add("is-pressed");
  });

  elements.schedcalSheet.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".schedcal-sheet__link,.schedcal-sheet__close");
    if (target) target.classList.add("is-pressed");
  });

  elements.schedcalSheet.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".schedcal-sheet__link,.schedcal-sheet__close");
    if (target) target.classList.add("is-pressed");
  });

  window.addEventListener("scroll", () => {
    if (document.body.classList.contains("is-custpage") ||
        document.body.classList.contains("is-custeditpage") ||
        document.body.classList.contains("is-orderpage") ||
        document.body.classList.contains("is-moodboardpage") ||
        document.body.classList.contains("is-schedulespage") ||
        document.body.classList.contains("is-doclistpage") ||
        document.body.classList.contains("is-fittinglogspage")) {
      clearHomepagePresses();
    }
  }, { passive: true });

  // Same self-maintaining rule on the customer page: a banner navigates iff it
  // is an <a>.
  elements.viewCustomer.addEventListener("click", (e) => {
    if (e.target.closest(".cust-banner") && !e.target.closest("a.cust-banner")) e.preventDefault();
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

  /* ------------------------- Schedules calendar ------------------------- */

  /* One month of everything the studio has committed to, joined in the browser
     from the four places dates are stored: order_events, wedding dates,
     follow-ups, and logged payments. It sits beside the homepage rather than
     the fitting feed because it reads the same three tables the homepage
     already reads on every visit.

     The whole working set is loaded once per visit and every month change is
     computed locally, so paging costs no request. That is affordable because
     order_events caps at seven rows per order — see the note on
     db.listAllOrderEvents for the point at which it stops being. */

  const SCHEDULE_LANES = 3;
  const SCHEDULE_MONTH_PATTERN = /^\d{4}-\d{2}$/;

  const sched = () => state.schedules;
  const isSchedulesRoute = () => !!state.route && "schedules" === state.route.view;

  function beginSchedulesLoad() {
    const sc = sched();
    sc.loadToken += 1;
    return sc.loadToken;
  }

  const isCurrentSchedulesLoad = (token) => isSchedulesRoute() && sched().loadToken === token;

  /* The five production stages already own a colour; the two design rows share
     one. Nothing here is a hex — the token block in pages.css holds those. */
  const scheduleStageColorKey = (stage) => U.fittingStage(stage).key || "design";

  const scheduleSpanLabel = (item) =>
    item.start === item.end
      ? U.formatShortDate(item.start)
      : U.formatShortDate(item.start) + " – " + U.formatShortDate(item.end);

  /* Where a tapped appointment goes. Only the five production stages can own a
     fitting log — fitting_sessions.stage is constrained to them, and the
     #/order/:id/fitting/new route rejects anything else — so the two design
     rows and every point event land on the record they belong to instead. */
  function scheduleItemHref(item) {
    if ("stage" === item.kind && calendar.PRODUCTION_STAGES.indexOf(item.stage) !== -1) {
      /* source=order, not a third value: showFittingLogDetail treats source as
         strictly binary, and "feed" would send Back to the fitting-log feed,
         which is not where you came from. You tapped a fitting belonging to an
         order, so Back belongs on that order. Adding a real "schedules" origin
         means touching all five coupled decision points — the back-href writes
         at 2613 and 2647, the detail bridge at 2570, and the editor and
         add-photo entries at 2831 and 3828. */
      return item.sessionId
        ? "#/fittings/" + encodeURIComponent(item.sessionId) + "?source=order"
        : "#/order/" + encodeURIComponent(item.orderId) + "/fitting/new?stage=" + encodeURIComponent(item.stage);
    }
    if ("wedding" === item.kind || "follow-up" === item.kind) {
      return "#/customer/" + encodeURIComponent(item.customerId);
    }
    return "#/order/" + encodeURIComponent(item.orderId);
  }

  const SCHEDULE_PAYMENT_FIELDS = [
    { field: "first_payment_date", label: "First payment" },
    { field: "second_payment_date", label: "Production payment" },
    { field: "final_payment_date", label: "Final payment" }
  ];

  /* One flat, normalised list from four differently-shaped sources, so that
     everything downstream — indexing, lanes, cells, the day sheet — handles a
     single kind of object. Approximate weddings are separated out here rather
     than filtered at every use. */
  function buildScheduleItems(customers, orders, events, sessions) {
    const customersById = {};
    (customers || []).forEach((c) => { customersById[c.id] = c; });
    const ordersById = {};
    (orders || []).forEach((o) => { ordersById[o.id] = o; });
    const sessionByOrderStage = {};
    (sessions || []).forEach((s) => { sessionByOrderStage[s.order_id + "|" + s.stage] = s; });

    const items = [];
    const approximate = [];

    const push = (item) => {
      const span = calendar.eventSpan(item.stage, item.date, item.endDate);
      if (!span) return;
      items.push({
        key: item.key,
        kind: item.kind,
        stage: item.stage || "",
        colorKey: item.colorKey,
        label: item.label,
        start: span.start,
        end: span.end,
        isBand: "stage" === item.kind,
        pinned: !!item.pinned,
        customerId: item.customerId || "",
        customerName: item.customerName || "",
        orderId: item.orderId || "",
        orderLabel: item.orderLabel || "",
        sessionId: item.sessionId || ""
      });
    };

    (events || []).forEach((evt) => {
      const order = ordersById[evt.order_id];
      if (!order) return; // an event whose order has gone is not a thing to draw
      const customer = customersById[order.customer_id];
      if (!customer) return;
      const session = sessionByOrderStage[evt.order_id + "|" + evt.stage];
      push({
        key: "stage:" + evt.id,
        kind: "stage",
        stage: evt.stage,
        colorKey: scheduleStageColorKey(evt.stage),
        label: U.fittingStage(evt.stage).label,
        date: evt.event_date,
        endDate: evt.end_date,
        pinned: evt.pinned,
        customerId: customer.id,
        customerName: customer.name,
        orderId: order.id,
        orderLabel: orderLabel(order),
        sessionId: session ? session.id : ""
      });
    });

    (customers || []).forEach((cust) => {
      if (cust.cancelled_at) return;
      if (cust.wedding_date) {
        // Stored as the last day of the month when only the month is known, so
        // drawing it on a cell would put a real commitment on a made-up day.
        if (isApproximateWedding(cust)) {
          approximate.push({ id: cust.id, name: cust.name, date: cust.wedding_date });
        } else {
          push({
            key: "wedding:" + cust.id,
            kind: "wedding",
            colorKey: "wedding",
            label: "Wedding",
            date: cust.wedding_date,
            customerId: cust.id,
            customerName: cust.name
          });
        }
      }
      if (cust.follow_up_date) {
        push({
          key: "followup:" + cust.id,
          kind: "follow-up",
          colorKey: "follow-up",
          label: cust.follow_up_label || "Follow up",
          date: cust.follow_up_date,
          customerId: cust.id,
          customerName: cust.name
        });
      }
    });

    (orders || []).forEach((order) => {
      const customer = customersById[order.customer_id];
      if (!customer || customer.cancelled_at) return;
      SCHEDULE_PAYMENT_FIELDS.forEach((entry, index) => {
        if (!order[entry.field]) return;
        push({
          key: "payment:" + order.id + ":" + index,
          kind: "payment",
          colorKey: "payment",
          label: entry.label,
          date: order[entry.field],
          customerId: customer.id,
          customerName: customer.name,
          orderId: order.id,
          orderLabel: orderLabel(order)
        });
      });
    });

    return { items, approximate };
  }

  /* Every day an item covers points at that item, so a cell never has to scan
     the whole list. Built once per data load, not per month. */
  function indexScheduleItems(items) {
    const byDay = new Map();
    (items || []).forEach((item) => {
      const startDay = calendar.toDay(item.start);
      const endDay = calendar.toDay(item.end);
      if (startDay === null || endDay === null) return;
      for (let day = startDay; day <= endDay; day++) {
        const iso = calendar.fromDay(day);
        const bucket = byDay.get(iso);
        if (bucket) bucket.push(item);
        else byDay.set(iso, [item]);
      }
    });
    byDay.forEach((bucket) => {
      bucket.sort((a, b) => {
        const orderA = calendar.stageOrder(a.stage);
        const orderB = calendar.stageOrder(b.stage);
        if (orderA !== orderB) return orderA - orderB;
        return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
      });
    });
    return byDay;
  }

  const scheduleDayItems = (iso) => {
    const sc = sched();
    return (sc.byDay && sc.byDay.get(iso)) || [];
  };

  /* -------------------------- Calendar rendering ------------------------- */

  function schedcalPanelHtml(title, copyHtml, extraAttr, actionHtml) {
    return '<div class="schedcal-panel"' + (extraAttr || '') + '>' +
      '<h2 class="schedcal-panel__title">' + U.escapeHtml(title) + '</h2>' +
      '<p class="schedcal-panel__copy">' + copyHtml + '</p>' +
      (actionHtml || '') +
    '</div>';
  }

  function schedcalStateHtml() {
    const sc = sched();
    if ("error" === sc.phase) {
      return schedcalPanelHtml(
        "Couldn't load schedules",
        "Check your connection and try again.",
        ' role="alert"',
        '<button type="button" class="schedcal-panel__retry js-schedcal-retry">' +
          '<span class="schedcal-panel__retry-face">Try again</span>' +
          '<span class="schedcal-panel__retry-rail" aria-hidden="true"></span>' +
        '</button>'
      );
    }
    if ("ready" === sc.phase && !sc.items.length) {
      return schedcalPanelHtml(
        "Nothing scheduled yet",
        "Appointments appear here once an order has its payment dates and a wedding date to work back from."
      );
    }
    return '';
  }

  /* One day, as one key. A single <button role="gridcell"> rather than a div
     wrapping a button: one target, nothing focusable inside it.

     Three states, and which one applies is the whole visual language of the
     page: a day carrying anything is a raised cream key, a day in the month
     carrying nothing is the same key unpopped, and a day outside the month is
     no key at all. The bands that used to live in here are drawn once per week
     by schedcalBandsHtml. */
  function schedcalCellHtml(cell, todayIso, focusedIso, openIso) {
    const items = cell.inMonth ? scheduleDayItems(cell.iso) : [];
    const points = items.filter((item) => !item.isBand && "wedding" !== item.kind);
    const isWedding = items.some((item) => "wedding" === item.kind);

    const dotsHtml = points.slice(0, 2).map((item, index) =>
      '<i class="schedcal-dot schedcal-dot--' +
        U.escapeHtml(points.length > 2 && 1 === index ? "more" : item.colorKey) + '"></i>'
    ).join('');

    const weekdayName = calendar.WEEKDAYS[calendar.weekdayIndex(cell.iso)] || "";
    const monthName = U.MONTHS[Number(cell.iso.slice(5, 7)) - 1] || "";
    const label = cell.inMonth
      ? weekdayName + " " + cell.day + " " + monthName + " " + cell.iso.slice(0, 4) + ", " +
        (items.length ? items.length + (1 === items.length ? " event" : " events") : "nothing scheduled")
      : weekdayName + " " + cell.day + " " + monthName + " " + cell.iso.slice(0, 4) + ", not in this month";

    const classes = ["schedcal-day"];
    if (!cell.inMonth) classes.push("schedcal-day--outside");
    else if (!items.length) classes.push("schedcal-day--quiet");
    if (isWedding) classes.push("schedcal-day--wedding");
    if (cell.iso === todayIso) classes.push("schedcal-day--today");

    return '<button type="button" role="gridcell" class="' + classes.join(" ") + '"' +
      ' data-date="' + U.escapeHtml(cell.iso) + '"' +
      ' tabindex="' + (cell.iso === focusedIso ? "0" : "-1") + '"' +
      (cell.iso === todayIso ? ' aria-current="date"' : '') +
      (cell.iso === openIso ? ' aria-selected="true"' : '') +
      ' aria-label="' + U.escapeHtml(label) + '">' +
      '<span class="schedcal-day__face">' +
        '<span class="schedcal-day__num">' + cell.day + '</span>' +
        '<span class="schedcal-day__dots" aria-hidden="true">' + dotsHtml + '</span>' +
      '</span>' +
      '<span class="schedcal-day__rail" aria-hidden="true"></span>' +
    '</button>';
  }

  /* The bands for one week, drawn once onto the week's own seven columns rather
     than as a strip inside each of the seven cells.

     A stored production date means its whole Monday-Sunday week, and monthGrid
     is Monday-first, so such a band always spans this row's full 1/8 and is one
     unbroken bar. A design phase carries a real end_date, so it spans only the
     days it covers and picks up its own lane again on the next row. Placement is
     grid-column arithmetic on ISO day numbers — nothing is measured, so nothing
     has to be recomputed when the canvas resizes.

     These are decoration over the gridcells that already carry the truth in
     their labels, which is why the whole track is aria-hidden by omission: the
     <i> elements have no role and no text. */
  function schedcalBandsHtml(weekDays, laneByKey) {
    const weekStart = calendar.toDay(weekDays[0].iso);
    const weekEnd = weekStart + 6;
    const lastLane = SCHEDULE_LANES - 1;
    const drawn = [];
    const overflow = [];

    sched().items.forEach((item) => {
      if (!item.isBand) return;
      const start = calendar.toDay(item.start);
      const end = calendar.toDay(item.end);
      if (start === null || end === null || end < weekStart || start > weekEnd) return;
      const from = Math.max(start, weekStart) - weekStart + 1;
      const to = Math.min(end, weekEnd) - weekStart + 2;
      const lane = laneByKey.get(item.key);
      if (lane === undefined || lane >= SCHEDULE_LANES) overflow.push({ lane, from, to });
      else drawn.push({ lane, from, to, colorKey: item.colorKey });
    });

    /* The last lane is where "there is more here than fits" gets said, so a week
       that overflows gives it up as a real band. Nothing is lost: the cell's own
       label and the day sheet both still carry everything. */
    const bars = overflow.length ? drawn.filter((bar) => bar.lane !== lastLane) : drawn;
    let html = bars.map((bar) =>
      '<i class="schedcal-band schedcal-band--' + U.escapeHtml(bar.colorKey) + '"' +
      ' style="grid-row:' + (bar.lane + 2) + ';grid-column:' + bar.from + '/' + bar.to + '"></i>'
    ).join('');

    if (overflow.length) {
      const spans = overflow.concat(drawn.filter((bar) => bar.lane === lastLane));
      const from = Math.min.apply(null, spans.map((span) => span.from));
      const to = Math.max.apply(null, spans.map((span) => span.to));
      html += '<i class="schedcal-band schedcal-band--more"' +
        ' style="grid-row:' + (lastLane + 2) + ';grid-column:' + from + '/' + to + '"></i>';
    }
    return html;
  }

  /* The same six rows, the same 42 boxes, the same reserved lanes — the skeleton
     is the unpopped state of the real grid, so arriving data changes colours and
     numbers and never a height. */
  function schedcalSkeletonHtml() {
    let html = '';
    for (let week = 0; week < 6; week++) {
      let cells = '';
      for (let day = 0; day < 7; day++) {
        cells += '<div class="schedcal-day schedcal-day--skel" aria-hidden="true">' +
          '<span class="schedcal-day__face">' +
            '<span class="schedcal-day__num"><i class="schedcal-skel__block"></i></span>' +
            '<span class="schedcal-day__dots"></span>' +
          '</span>' +
          '<span class="schedcal-day__rail"></span>' +
        '</div>';
      }
      html += '<div class="schedcal-week" role="presentation">' + cells + '</div>';
    }
    return html;
  }

  function renderScheduleApprox() {
    const sc = sched();
    const cursorMonth = sc.cursor.year + "-" + String(sc.cursor.month + 1).padStart(2, "0");
    const thisMonth = sc.approximate.filter((entry) => entry.date.slice(0, 7) === cursorMonth);

    elements.schedcalApprox.hidden = !thisMonth.length;
    if (!thisMonth.length) {
      elements.schedcalApprox.innerHTML = '';
      return;
    }
    const one = 1 === thisMonth.length;
    elements.schedcalApprox.innerHTML =
      '<div class="schedcal-note">' +
        '<h2 class="schedcal-note__title">Day not set</h2>' +
        '<p class="schedcal-note__copy">' +
          (one ? "This wedding is" : "These weddings are") + " in " +
          U.escapeHtml(U.MONTHS[sc.cursor.month]) + ", but the day is still unconfirmed, so " +
          (one ? "it is" : "they are") + " not on the grid.</p>" +
        '<ul class="schedcal-note__list">' +
          thisMonth.map((entry) =>
            '<li class="schedcal-note__row">' +
              '<i class="schedcal-note__tick" aria-hidden="true"></i>' +
              U.escapeHtml(entry.name) +
            '</li>').join('') +
        '</ul>' +
      '</div>';
  }

  function renderScheduleLegend() {
    const sc = sched();
    const cursorMonth = sc.cursor.year + "-" + String(sc.cursor.month + 1).padStart(2, "0");
    const present = [];
    sc.items.forEach((item) => {
      if (item.start.slice(0, 7) !== cursorMonth && item.end.slice(0, 7) !== cursorMonth) return;
      if (present.some((entry) => entry.colorKey === item.colorKey)) return;
      present.push({ colorKey: item.colorKey, label: "stage" === item.kind ? item.label : item.kind });
    });
    elements.schedcalLegend.innerHTML = present.map((entry) =>
      '<span class="schedcal-legend__item">' +
        '<i class="schedcal-legend__swatch schedcal-legend__swatch--' + U.escapeHtml(entry.colorKey) + '"></i>' +
        '<span>' + U.escapeHtml("follow-up" === entry.label ? "Follow up" :
          "payment" === entry.label ? "Payment" : "wedding" === entry.label ? "Wedding" : entry.label) + '</span>' +
      '</span>'
    ).join('');
  }

  function renderSchedulesMonth() {
    const sc = sched();
    const grid = calendar.monthGrid(sc.cursor.year, sc.cursor.month);
    if (!grid) return;

    /* The month is the <h1> the grid is labelled by, so it carries the year for
       anything reading it aloud even though the year is set smaller. */
    elements.schedcalTitle.innerHTML = U.escapeHtml(U.MONTHS[sc.cursor.month]) +
      '<span class="schedcal-title__year">' + sc.cursor.year + '</span>';
    // Same words in the bar, so the month is still on screen once the title has
    // scrolled away. aria-hidden there, so it is announced once, not twice.
    elements.schedcalMonthLabel.textContent = U.MONTHS[sc.cursor.month] + " " + sc.cursor.year;
    elements.schedcalBody.setAttribute("aria-busy", "loading" === sc.phase ? "true" : "false");

    if ("loading" === sc.phase) {
      elements.schedcalWeeks.innerHTML = schedcalSkeletonHtml();
      elements.schedcalState.innerHTML = '';
      elements.schedcalApprox.hidden = true;
      elements.schedcalLegend.innerHTML = '';
      return;
    }

    /* Lanes are assigned across the whole visible window, not per week: a band
       only reads as one continuous bar if every cell it touches agrees on which
       row to draw it in, and a Monday-first grid puts a planned fitting week on
       exactly one row. */
    const windowStart = calendar.toDay(grid.days[0].iso);
    const windowEnd = calendar.toDay(grid.days[41].iso);
    const visibleBands = sc.items.filter((item) =>
      item.isBand && calendar.toDay(item.end) >= windowStart && calendar.toDay(item.start) <= windowEnd);
    const lanes = calendar.assignLanes(visibleBands);
    const laneByKey = new Map();
    visibleBands.forEach((band, index) => { laneByKey.set(band.key, lanes[index]); });

    if (!sc.focusedDate || sc.focusedDate.slice(0, 7) !== grid.start.slice(0, 7)) {
      const today = U.todayISO();
      sc.focusedDate = today.slice(0, 7) === grid.start.slice(0, 7) ? today : grid.start;
    }

    const todayIso = U.todayISO();
    let html = '';
    for (let week = 0; week < 6; week++) {
      const weekDays = grid.days.slice(week * 7, week * 7 + 7);
      const cells = weekDays
        .map((cell) => schedcalCellHtml(cell, todayIso, sc.focusedDate, sc.openDate))
        .join('');
      html += '<div class="schedcal-week" role="row">' + cells +
        schedcalBandsHtml(weekDays, laneByKey) + '</div>';
    }
    elements.schedcalWeeks.innerHTML = html;
    elements.schedcalState.innerHTML = schedcalStateHtml();
    renderScheduleApprox();
    renderScheduleLegend();
  }

  function announceSchedulesStatus(text) {
    const sc = sched();
    if (sc.lastStatus === text) return;
    sc.lastStatus = text;
    elements.schedcalStatus.textContent = text;
  }

  function scheduleCellFor(iso) {
    return elements.schedcalWeeks.querySelector('[data-date="' + iso + '"]');
  }

  /* Moves the single tab stop. A month change rewrites all 42 cells, so focus
     has to be re-applied after the write, in the same synchronous turn. */
  function focusScheduleCell(iso) {
    const sc = sched();
    const previous = sc.focusedDate && scheduleCellFor(sc.focusedDate);
    if (previous) previous.tabIndex = -1;
    sc.focusedDate = iso;
    const target = scheduleCellFor(iso);
    if (target) {
      target.tabIndex = 0;
      target.focus({ preventScroll: true });
    }
  }

  function goToMonth(year, month, focusIso) {
    const sc = sched();
    sc.cursor = { year, month };
    sc.focusedDate = focusIso || "";
    renderSchedulesMonth();
    announceSchedulesStatus(U.MONTHS[month] + " " + year);
    if (focusIso) focusScheduleCell(focusIso);
  }

  function shiftScheduleFocus(deltaDays) {
    const sc = sched();
    const day = calendar.toDay(sc.focusedDate);
    if (day === null) return;
    const targetIso = calendar.fromDay(day + deltaDays);
    const targetMonth = Number(targetIso.slice(5, 7)) - 1;
    const targetYear = Number(targetIso.slice(0, 4));
    // Walking past the edge pages the month rather than dead-ending, and keeps
    // focus on the day you actually asked for.
    if (targetYear !== sc.cursor.year || targetMonth !== sc.cursor.month) {
      goToMonth(targetYear, targetMonth, targetIso);
      return;
    }
    focusScheduleCell(targetIso);
  }

  function shiftScheduleMonth(delta) {
    const sc = sched();
    const next = calendar.addMonths(sc.cursor.year, sc.cursor.month, delta);
    const range = calendar.monthRange(next.year, next.month);
    const focusedDay = Number(sc.focusedDate.slice(8, 10)) || 1;
    const lastDay = Number(range.end.slice(8, 10));
    const clamped = Math.min(focusedDay, lastDay);
    goToMonth(next.year, next.month,
      range.start.slice(0, 8) + String(clamped).padStart(2, "0"));
  }

  /* ----------------------------- The day sheet --------------------------- */

  function renderScheduleSheet(iso) {
    const items = scheduleDayItems(iso);
    const weekdayName = calendar.WEEKDAYS[calendar.weekdayIndex(iso)] || "";
    elements.schedcalSheetTitle.textContent = weekdayName + " " + U.formatShortDate(iso);
    elements.schedcalSheetCount.textContent = items.length
      ? items.length + (1 === items.length ? " event" : " events")
      : "Nothing scheduled";

    if (!items.length) {
      elements.schedcalSheetList.innerHTML =
        '<li class="schedcal-sheet__empty">Nothing scheduled on this day.</li>';
      return;
    }

    elements.schedcalSheetList.innerHTML = items.map((item) => {
      const destination = "stage" === item.kind && calendar.PRODUCTION_STAGES.indexOf(item.stage) !== -1
        ? (item.sessionId ? "open fitting log" : "start a fitting log")
        : "wedding" === item.kind || "follow-up" === item.kind ? "open customer" : "open order";
      const context = item.orderLabel || item.customerName;
      const ariaLabel = [item.label, "for " + item.customerName, context, scheduleSpanLabel(item), destination]
        .filter(Boolean).join(", ");

      return '<li class="schedcal-sheet__row">' +
        '<a class="schedcal-sheet__link schedcal-sheet__link--' + U.escapeHtml(item.colorKey) + '"' +
          ' href="' + U.escapeHtml(scheduleItemHref(item)) + '"' +
          ' aria-label="' + U.escapeHtml(ariaLabel) + '">' +
          '<span class="schedcal-sheet__face">' +
            '<span class="schedcal-sheet__lines">' +
              '<span class="schedcal-sheet__who">' + U.escapeHtml(item.customerName) + '</span>' +
              '<span class="schedcal-sheet__what">' + U.escapeHtml(item.label) +
                (item.orderLabel ? ' · ' + U.escapeHtml(item.orderLabel) : '') + '</span>' +
            '</span>' +
            '<span class="schedcal-sheet__when">' + U.escapeHtml(scheduleSpanLabel(item)) + '</span>' +
          '</span>' +
          '<span class="schedcal-sheet__rail" aria-hidden="true"></span>' +
        '</a>' +
      '</li>';
    }).join('');
  }

  function openScheduleDay(iso, returnEl) {
    const sc = sched();
    if (calendar.toDay(iso) === null) return;
    sc.openDate = iso;
    sc.sheetReturn = returnEl || document.activeElement;
    renderScheduleSheet(iso);
    // Tapping a second day while the first is still closing: cancel that hide
    // before showing, or it lands on the sheet that just opened.
    cancelSheetClose(elements.schedcalSheet);
    elements.schedcalSheet.hidden = false;
    document.body.classList.add("has-schedcal-sheet");
    const cell = scheduleCellFor(iso);
    if (cell) cell.setAttribute("aria-selected", "true");
    /* Synchronously, not in a frame: preventScroll means there is no layout to
       wait for, and a deferred focus simply never lands if the frame does not
       come (a backgrounded tab). Opening a dialog must move focus, always. */
    elements.schedcalSheetTitle.focus({ preventScroll: true });
    const count = scheduleDayItems(iso).length;
    announceSchedulesStatus(elements.schedcalSheetTitle.textContent + ", " +
      (count ? count + (1 === count ? " event" : " events") : "nothing scheduled"));
  }

  function closeScheduleDay() {
    const sc = sched();
    if (!sc.openDate) return;
    const cell = scheduleCellFor(sc.openDate);
    if (cell) cell.removeAttribute("aria-selected");
    const returnEl = sc.sheetReturn;
    sc.openDate = "";
    sc.sheetReturn = null;
    closeSheetElement(elements.schedcalSheet);
    document.body.classList.remove("has-schedcal-sheet");
    if (returnEl && document.contains(returnEl)) returnEl.focus({ preventScroll: true });
  }

  /* --------------------------- Keyboard & lifecycle ---------------------- */

  function handleSchedulesGridKey(e) {
    const cell = e.target.closest(".schedcal-day");
    if (!cell) return;

    if ("ArrowLeft" === e.key) { e.preventDefault(); shiftScheduleFocus(-1); return; }
    if ("ArrowRight" === e.key) { e.preventDefault(); shiftScheduleFocus(1); return; }
    if ("ArrowUp" === e.key) { e.preventDefault(); shiftScheduleFocus(-7); return; }
    if ("ArrowDown" === e.key) { e.preventDefault(); shiftScheduleFocus(7); return; }
    if ("PageUp" === e.key) { e.preventDefault(); shiftScheduleMonth(-1); return; }
    if ("PageDown" === e.key) { e.preventDefault(); shiftScheduleMonth(1); return; }

    if ("Home" === e.key || "End" === e.key) {
      e.preventDefault();
      const day = calendar.toDay(sched().focusedDate);
      if (day === null) return;
      const monday = calendar.mondayOnOrBefore(day);
      shiftScheduleFocus(("Home" === e.key ? monday : monday + 6) - day);
      return;
    }
    if ("Enter" === e.key || " " === e.key) {
      // Space would otherwise scroll the page out from under the grid.
      e.preventDefault();
      openScheduleDay(cell.dataset.date, cell);
    }
  }

  /* The bar is a real fixed bar, not an overlay, so it has to publish its height
     and take it back off the page — otherwise the footer sits behind it. */
  function showScheduleMonthbar(visible) {
    elements.schedcalMonthbar.hidden = !visible;
    document.body.classList.toggle("has-schedcal-monthbar", !!visible);
    syncBottomBar();
  }

  function cleanupSchedules() {
    const sc = sched();
    closeScheduleDay();
    showScheduleMonthbar(false);
    sc.loadToken += 1;
    sc.phase = "idle";
    sc.items = [];
    sc.byDay = null;
    sc.approximate = [];
    sc.focusedDate = "";
    sc.lastStatus = "";
    sc.error = null;
    elements.schedcalWeeks.innerHTML = '';
    elements.schedcalState.innerHTML = '';
    elements.schedcalStatus.textContent = '';
    // sc.cursor is kept on purpose: coming back should land on the month you
    // left, and the data is refetched anyway so nothing can go stale.
  }

  async function showSchedules(queryParams) {
    const sc = sched();
    const params = queryParams || new URLSearchParams("");
    setChrome({ title: "Schedules", up: null, save: false, schedulespage: true });
    showScheduleMonthbar(true);

    const focusParam = params.get("focus") || "";
    const monthParam = params.get("month") || "";
    const focusIso = calendar.toDay(focusParam) === null ? "" : focusParam;

    if (focusIso) {
      sc.cursor = { year: Number(focusIso.slice(0, 4)), month: Number(focusIso.slice(5, 7)) - 1 };
    } else if (SCHEDULE_MONTH_PATTERN.test(monthParam) &&
               calendar.toDay(monthParam + "-01") !== null) {
      sc.cursor = { year: Number(monthParam.slice(0, 4)), month: Number(monthParam.slice(5, 7)) - 1 };
    } else if (!sc.cursor.year) {
      const today = U.todayISO();
      sc.cursor = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 };
    }

    // The grid paints before the request goes out, so the page never shows an
    // empty frame and the swap to real data moves nothing.
    sc.phase = "loading";
    sc.focusedDate = "";
    renderSchedulesMonth();

    const token = beginSchedulesLoad();
    let res;
    try {
      res = await Promise.all([
        db.listCustomers(),
        db.listAllOrders(),
        db.listAllOrderEvents(),
        db.listAllFittingSessions()
      ]);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      if (!isCurrentSchedulesLoad(token)) return;
      console.error(err);
      sc.phase = "error";
      sc.error = err;
      renderSchedulesMonth();
      return;
    }
    if (!isCurrentSchedulesLoad(token)) return;

    const built = buildScheduleItems(res[0], res[1], res[2], res[3]);
    sc.items = built.items;
    sc.approximate = built.approximate;
    sc.byDay = indexScheduleItems(built.items);
    sc.phase = "ready";
    renderSchedulesMonth();
    announceSchedulesStatus(U.MONTHS[sc.cursor.month] + " " + sc.cursor.year);
    if (focusIso) openScheduleDay(focusIso, null);
  }

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
  const FITTING_ROUTE_FAMILY = ["fittingLogs", "fittingLogDetail", "fittingPhotoAdd"];
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
  /* Generalised over the view rather than copied per page: the document feed
     needs the identical correction, and a second copy would be a third by the
     next ledger page. */
  function alignLedgerSearch(viewEl, sectionEl, inputEl) {
    if (document.activeElement !== inputEl) return;
    const nav = $(".cust-nav", viewEl);
    if (!nav) return;

    const delta = Math.round(
      sectionEl.getBoundingClientRect().top -
      nav.getBoundingClientRect().bottom -
      FITTING_SEARCH_GAP
    );
    if (Math.abs(delta) < 2) return;
    window.scrollBy({ top: delta, left: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function alignFittingSearch() {
    if (!isFittingRoute()) return;
    alignLedgerSearch(elements.viewFittingLogs, elements.fitlogSearchSection, elements.fitlogSearch);
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
    /* Live now. A fitting needs an order context, and the picker is exactly
       that context: customer, then order, then the fittingNew route's stage
       question. The key sat honestly disabled until there was something behind
       it. */
    if (e.target.closest("#fitlogNewBtn")) {
      e.preventDefault();
      openDocumentPicker("fitting");
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

  /* ---------------------------- Document feed --------------------------- */

  /* Quotations and invoices, one page and two routes. Structurally the fitting
     feed — same append-only render, same cursor paging, same server-side
     search, same shared state slot — because it is the same kind of object: a
     read-only global list of records you can search and open.

     What differs is what a record IS. A quotation is not stored; only the total
     it was sent for is. So a row shows the logged number, never a recomputed
     one, and opening a row goes to the order the document was rendered from. */

  const DOCUMENT_SEARCH_DEBOUNCE_MS = 250;

  const docFeed = () => state.documents;
  const isDocumentsRoute = () => !!state.route && "documents" === state.route.view;

  const documentKindName = (kind) => "invoice" === kind ? "Invoice" : "Quotation";
  const documentKindPlural = (kind) => "invoice" === kind ? "Invoices" : "Quotations";
  const documentRouteFor = (kind) => "invoice" === kind ? "#/invoices" : "#/quotations";

  function documentBlockHtml(innerHtml) {
    return '<div class="doclist-grid-rule" aria-hidden="true"></div>' +
      '<div class="doclist-inset">' + innerHtml + '</div>' +
      '<div class="doclist-grid-rule" aria-hidden="true"></div>' +
      '<div class="doclist-grid-spacer" aria-hidden="true"></div>';
  }

  function documentCardHtml(item) {
    const terminLabel = "invoice" === item.kind && item.term_number && item.term_count
      ? " · Termin " + item.term_number + " of " + item.term_count
      : "";
    const kindLabel = documentKindName(item.kind) + terminLabel;
    /* item.total, never docs.computeTotal(order.items). Nothing about a
       document is snapshotted except this number, so recomputing it would let
       an order edited afterwards silently rewrite what was already sent —
       which is the exact thing the column exists to prevent. */
    const hasTotal = item.total !== null && item.total !== undefined;
    const amountLabel = hasTotal ? U.formatRupiah(item.total) : "—";
    const dateLabel = U.formatShortDate(item.issued_date);

    const label = [
      item.customer_name,
      item.order_label,
      kindLabel,
      dateLabel,
      hasTotal ? amountLabel : "amount not recorded"
    ].filter(Boolean).join(", ");

    return '<a class="doclist-card-link" href="#/order/' + U.escapeHtml(encodeURIComponent(item.order_id)) +
      '" aria-label="' + U.escapeHtml(label) + '">' +
      '<article class="doclist-card doclist-card--' + U.escapeHtml(item.kind) + '">' +
        '<div class="doclist-card__top">' +
          '<div class="doclist-card__names">' +
            '<span class="doclist-card__who">' + U.escapeHtml(item.customer_name) + '</span>' +
            '<span class="doclist-card__order">' + U.escapeHtml(item.order_label) + '</span>' +
          '</div>' +
          '<span class="doclist-card__kind">' + U.escapeHtml(kindLabel) + '</span>' +
        '</div>' +
        '<div class="doclist-card__divider"></div>' +
        '<div class="doclist-card__bottom">' +
          '<span class="doclist-card__date">' + U.escapeHtml(dateLabel) + '</span>' +
          '<span class="doclist-card__amount' + (hasTotal ? '' : ' doclist-card__amount--none') + '">' +
            U.escapeHtml(amountLabel) + '</span>' +
        '</div>' +
      '</article>' +
      '<span class="doclist-card__rail" aria-hidden="true"></span>' +
    '</a>';
  }

  function documentSkeletonHtml() {
    return '<div class="doclist-card doclist-skel" aria-hidden="true">' +
      '<div class="doclist-card__top">' +
        '<div class="doclist-card__names">' +
          '<span class="doclist-skel__line"><i class="doclist-skel__block" style="width:48%;height:14px"></i></span>' +
          '<span class="doclist-skel__line"><i class="doclist-skel__block" style="width:70%;height:14px"></i></span>' +
        '</div>' +
        '<span class="doclist-card__kind doclist-skel__line"><i class="doclist-skel__block" style="width:64px;height:14px;margin-left:auto"></i></span>' +
      '</div>' +
      '<div class="doclist-card__divider"></div>' +
      '<div class="doclist-card__bottom">' +
        '<span class="doclist-skel__line"><i class="doclist-skel__block" style="width:80px;height:14px"></i></span>' +
        '<span class="doclist-skel__line"><i class="doclist-skel__block" style="width:104px;height:14px"></i></span>' +
      '</div>' +
    '</div>' +
    '<span class="doclist-card__rail" aria-hidden="true"></span>';
  }

  function documentPanelHtml(title, copyHtml, extraAttr, actionHtml) {
    return '<div class="doclist-panel"' + (extraAttr || '') + '>' +
      '<p class="doclist-panel__title">' + U.escapeHtml(title) + '</p>' +
      '<p class="doclist-panel__copy">' + copyHtml + '</p>' +
      (actionHtml || '') +
    '</div>';
  }

  /* Three cases, not the feed's four: there is no second filter axis here, so
     no combination of query-and-filter to word separately. */
  function documentEmptyHtml() {
    const ds = docFeed();
    const plural = documentKindPlural(ds.kind).toLowerCase();
    const typed = ds.customerSeed ? ds.customerSeed.originalQuery : ds.query.trim();

    if (ds.customerSeed && !typed) {
      return documentPanelHtml("No " + plural + " yet",
        "Documents generated for this customer will appear here.");
    }
    if (typed) {
      return documentPanelHtml("Nothing matched your search",
        "We couldn't find <b>" + U.escapeHtml(typed) + "</b>. Check the spelling or try another search.");
    }
    return documentPanelHtml("No " + plural + " yet",
      documentKindPlural(ds.kind) + " you generate will appear here.");
  }

  function documentStateHtml() {
    const ds = docFeed();
    const plural = documentKindPlural(ds.kind).toLowerCase();

    if ("initial-loading" === ds.phase) {
      return documentBlockHtml(documentSkeletonHtml()) +
        documentBlockHtml(documentSkeletonHtml()) +
        documentBlockHtml(documentSkeletonHtml());
    }
    if ("initial-error" === ds.phase) {
      return documentBlockHtml(documentPanelHtml(
        "Couldn't load " + plural,
        "Check your connection and try again.",
        ds.errorAnnounced ? '' : ' role="alert"',
        '<button type="button" class="doclist-panel__retry js-doclist-retry">Try again</button>'
      ));
    }
    if (!ds.items.length) return documentBlockHtml(documentEmptyHtml());
    if (ds.loadingMore) return documentBlockHtml(documentSkeletonHtml());
    if (ds.loadMoreError) {
      return documentBlockHtml(documentPanelHtml(
        "Couldn't load more " + plural,
        "Check your connection and try again.",
        '',
        '<button type="button" class="doclist-panel__retry js-doclist-retry-more">Try again</button>'
      ));
    }
    return '';
  }

  function announceDocumentStatus(text) {
    const ds = docFeed();
    if (ds.lastStatus === text) return;
    ds.lastStatus = text;
    elements.doclistStatus.textContent = text;
  }

  function renderDocumentSearchClear() {
    elements.doclistSearchClear.hidden = !elements.doclistSearch.value;
  }

  function renderDocumentFeed() {
    const ds = docFeed();
    const plural = documentKindPlural(ds.kind).toLowerCase();

    if (ds.renderedToken !== ds.requestToken) {
      elements.doclistList.innerHTML = "";
      ds.renderedToken = ds.requestToken;
    }
    const rendered = elements.doclistList.children.length;
    if (rendered < ds.items.length) {
      elements.doclistList.insertAdjacentHTML("beforeend", ds.items.slice(rendered).map(
        (item) => '<li class="doclist-record">' + documentBlockHtml(documentCardHtml(item)) + '</li>'
      ).join(''));
    }

    elements.doclistState.innerHTML = documentStateHtml();
    const busy = "initial-loading" === ds.phase || ds.loadingMore;
    elements.doclistFeed.setAttribute("aria-busy", busy ? "true" : "false");
    elements.doclistFeed.classList.toggle("doclist-feed--initial", "initial-loading" === ds.phase);

    if ("initial-loading" === ds.phase) announceDocumentStatus("Loading " + plural);
    else if ("initial-error" === ds.phase) announceDocumentStatus("");
    else if (ds.loadingMore) announceDocumentStatus("Loading more " + plural);
    else if (ds.items.length) {
      announceDocumentStatus(ds.items.length + " " +
        (1 === ds.items.length ? documentKindName(ds.kind).toLowerCase() : plural) + " found");
    } else announceDocumentStatus("No " + plural + " matched");
  }

  function documentRequestArgs() {
    const ds = docFeed();
    return {
      kind: ds.kind,
      query: ds.customerSeed ? "" : ds.query,
      customerId: ds.customerSeed ? ds.customerSeed.id : null,
      limit: db.DOCUMENT_FEED_PAGE_SIZE
    };
  }

  function ensureDocumentObserver() {
    const ds = docFeed();
    if (ds.observer || !ds.hasMore || !window.IntersectionObserver) return;
    ds.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreDocuments();
    }, { root: null, rootMargin: FITTING_SENTINEL_MARGIN, threshold: 0 });
    ds.observer.observe(elements.doclistSentinel);
  }

  function stopDocumentObserver() {
    const ds = docFeed();
    if (ds.observer) {
      ds.observer.disconnect();
      ds.observer = null;
    }
  }

  async function startDocumentFirstPage() {
    const ds = docFeed();
    const token = ++ds.requestToken;

    ds.phase = "initial-loading";
    ds.items = [];
    ds.nextCursor = null;
    ds.hasMore = true;
    ds.loadingMore = false;
    ds.loadMoreError = null;
    stopDocumentObserver();
    renderDocumentFeed();

    try {
      const page = await db.listDocumentFeed(documentRequestArgs());
      if (token !== ds.requestToken || !isDocumentsRoute()) return;
      ds.items = page.items;
      ds.nextCursor = page.nextCursor;
      ds.hasMore = page.hasMore;
      ds.phase = "ready";
    } catch (err) {
      console.error(err);
      if (token !== ds.requestToken || !isDocumentsRoute()) return;
      ds.phase = "initial-error";
    }

    renderDocumentFeed();
    if ("initial-error" === ds.phase) ds.errorAnnounced = true;
    else ensureDocumentObserver();
  }

  async function loadMoreDocuments() {
    const ds = docFeed();
    if (!isDocumentsRoute() || "ready" !== ds.phase) return;
    if (ds.loadingMore || !ds.hasMore || ds.loadMoreError || !ds.nextCursor) return;

    const token = ds.requestToken;
    ds.loadingMore = true;
    renderDocumentFeed();

    try {
      const page = await db.listDocumentFeed(Object.assign(documentRequestArgs(), { before: ds.nextCursor }));
      if (token !== ds.requestToken || !isDocumentsRoute()) return;

      const seen = {};
      ds.items.forEach((item) => { seen[item.id] = true; });
      page.items.forEach((item) => {
        if (!seen[item.id]) {
          seen[item.id] = true;
          ds.items.push(item);
        }
      });

      ds.nextCursor = page.nextCursor;
      ds.hasMore = page.hasMore;
      ds.loadingMore = false;
      if (!ds.hasMore) stopDocumentObserver();
    } catch (err) {
      console.error(err);
      if (token !== ds.requestToken || !isDocumentsRoute()) return;
      ds.loadingMore = false;
      ds.loadMoreError = err;
      stopDocumentObserver();
    }
    renderDocumentFeed();
  }

  function cleanupDocuments() {
    const ds = docFeed();
    stopDocumentObserver();
    clearTimeout(ds.searchTimer);
    ds.searchTimer = null;
    ds.requestToken++;
    ds.phase = "idle";
    ds.items = [];
    ds.loadingMore = false;
    ds.loadMoreError = null;
    ds.alignPending = false;
    ds.lastStatus = "";
    ds.retainHash = "";
    ds.retainScroll = 0;
    elements.doclistList.innerHTML = "";
    ds.renderedToken = -1;
  }

  /* A row goes to the order, so there is no route family to belong to — only
     the one hop out and straight back. That single case is worth keeping the
     list alive for; anything else rebuilds. */
  function parkDocuments() {
    const ds = docFeed();
    stopDocumentObserver();
    clearTimeout(ds.searchTimer);
    ds.searchTimer = null;
    ds.alignPending = false;
    ds.retainHash = "ready" === ds.phase && ds.items.length ? lastVisitedHash : "";
  }

  function alignDocumentSearch() {
    if (!isDocumentsRoute()) return;
    alignLedgerSearch(elements.viewDocuments, elements.doclistSearchSection, elements.doclistSearch);
  }

  function scheduleDocumentSearchAlign() {
    const ds = docFeed();
    if (ds.alignPending) return;
    ds.alignPending = true;
    requestAnimationFrame(() => setTimeout(() => {
      ds.alignPending = false;
      alignDocumentSearch();
    }, 140));
  }

  function setDocumentBackControl(origin) {
    const label = origin && origin.name ? origin.name : "Home";
    elements.doclistBackLabel.textContent = label;
    elements.doclistBackBtn.href = origin ? "#/customer/" + encodeURIComponent(origin.id) : "#/customers";
    elements.doclistBackBtn.setAttribute("aria-label", "Back to " + label);
  }

  function restoreDocumentScroll(offset) {
    const target = Math.max(0, Number(offset) || 0);
    if (!target) return;
    const apply = () => {
      if (!isDocumentsRoute()) return;
      window.scrollTo(0, target);
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
    setTimeout(apply, 120);
  }

  async function showDocuments(kind, queryParams) {
    const params = queryParams || new URLSearchParams("");
    const seedName = String(params.get("q") || "");
    const seedId = String(params.get("customerId") || "");
    const hasSeed = "customer" === params.get("from") && UUID_PATTERN.test(seedId);
    const wanted = db.normalizeDocumentKind(kind) || "quotation";

    setChrome({ title: documentKindPlural(wanted), save: false, doclistpage: true });
    setSaveBar(false);

    const ds = docFeed();
    const kindChanged = ds.kind !== wanted;
    ds.kind = wanted;
    elements.doclistTitle.textContent = documentKindPlural(wanted);
    // Icon-only key: the label is the only thing that says which kind it makes,
    // so it carries the title too rather than leaving a bare tooltip-less glyph.
    elements.doclistNewBtn.setAttribute("aria-label", "New " + documentKindName(wanted).toLowerCase());
    elements.doclistNewBtn.setAttribute("title", "New " + documentKindName(wanted).toLowerCase());
    elements.doclistSearch.setAttribute("placeholder", "Search customer, order, or date");

    /* The homepage shortcut lands here with ?new=1 rather than opening the
       sheet itself, so the kind comes from the route that is already about to
       set it. The flag is dropped from the hash straight away: it describes one
       arrival, and leaving it in would reopen the sheet on every refresh and on
       the way back from whatever the picker opened. currentHash moves with it,
       or the next navigation would file the stripped hash as a different page
       and throw away the feed it is holding.

       Whether the sheet actually opens is decided further down, once the feed
       has loaded and the answer is knowable. */
    const wantsNew = !!params.get("new");
    if (wantsNew) {
      params.delete("new");
      const rest = params.toString();
      const cleanHash = documentRouteFor(wanted) + (rest ? "?" + rest : "");
      history.replaceState(null, "", location.pathname + location.search + cleanHash);
      currentHash = cleanHash;
    }

    /* An empty list has nothing to look at, so the shortcut may as well go
       straight to making one. A list with rows in it is what the user asked to
       see — opening the sheet over it buries the thing they came for.

       Deferred until after the feed resolves for two reasons: the row count is
       not knowable before then (ds.items is stale or empty until
       startDocumentFirstPage fills it), and focusRoute runs when this function
       returns — focusing the search field before that point only to have the
       heading take focus back is what made the keyboard flash up and drop. */
    const openPickerIfEmpty = () => {
      if (!wantsNew || !isDocumentsRoute() || ds.kind !== wanted) return;
      openDocumentPicker(wanted);
    };

    // Coming back from the order a row opened, in the same history visit: the
    // rows, cursor, DOM and offset are all still here. A kind change is never
    // that, whatever the hash says.
    if (!kindChanged && ds.retainHash && ds.retainHash === location.hash &&
        "ready" === ds.phase && ds.items.length) {
      ds.retainHash = "";
      renderDocumentSearchClear();
      renderDocumentFeed();
      ensureDocumentObserver();
      restoreDocumentScroll(ds.retainScroll);
      // A retained feed has rows by definition, so this never opens; it runs
      // for the one case that matters, which is that the flag is answered on
      // every path out of this function rather than only the slow one.
      openPickerIfEmpty();
      return;
    }
    ds.retainHash = "";
    ds.retainScroll = 0;

    ds.query = seedName;
    ds.customerSeed = hasSeed ? { id: seedId, originalQuery: seedName } : null;
    ds.errorAnnounced = false;
    ds.lastStatus = "";
    ds.loadMoreError = null;

    elements.doclistSearch.value = seedName;
    renderDocumentSearchClear();
    setDocumentBackControl(hasSeed ? { id: seedId, name: seedName } : null);

    const seedCheck = hasSeed
      ? db.getCustomer(seedId).then(() => true, () => false)
      : Promise.resolve(true);

    await startDocumentFirstPage();

    if (!(await seedCheck) && isDocumentsRoute() && ds.customerSeed && ds.customerSeed.id === seedId) {
      ds.customerSeed = null;
      setDocumentBackControl(null);
      await startDocumentFirstPage();
    }

    openPickerIfEmpty();
  }

  /* --------------------------- New document picker ----------------------- */

  const picker = () => state.documents.picker;

  function docnewRowHtml(attrs, titleText, metaText, extraClass, describedById) {
    return '<button type="button" class="docnew__row' + (extraClass || '') + '"' + attrs +
      (describedById ? ' aria-describedby="' + describedById + '"' : '') + '>' +
      '<span class="docnew__row-title">' + U.escapeHtml(titleText) + '</span>' +
      (metaText ? '<span class="docnew__row-meta">' + U.escapeHtml(metaText) + '</span>' : '') +
    '</button>';
  }

  /* Five modes, in two shapes. quotation and invoice run both steps and end in
     a generated PDF; moodboard and fitting run both steps and end in a
     navigation; neworder stops after the customer, because the order it is
     about does not exist yet. Named neworder rather than order: pk.step already
     spends the word "order" on the second step. */
  const isMoodboardPicker = () => "moodboard" === picker().mode;
  const isFittingPicker = () => "fitting" === picker().mode;
  const isNewOrderPicker = () => "neworder" === picker().mode;
  const PICKER_THING_NAMES = { moodboard: "Moodboard", fitting: "Fitting log", neworder: "Order", invoice: "Invoice", quotation: "Quotation" };
  const pickerThingName = () => PICKER_THING_NAMES[picker().mode] || "Quotation";

  function renderDocumentPicker() {
    const pk = picker();
    const kindLabel = pickerThingName();

    elements.docnewTitle.textContent = "New " + kindLabel.toLowerCase();
    elements.docnewBack.hidden = "customer" === pk.step || ("termin" === pk.step && pk.directOrder);
    elements.docnewBack.disabled = pk.generating;
    elements.docnewCancel.disabled = pk.generating;

    if ("customer" === pk.step) {
      elements.docnewHint.textContent = "Which customer?";
      elements.docnewSearch.hidden = false;

      if (pk.loading || !pk.customers) {
        elements.docnewList.innerHTML = '<span class="sr-only">Loading customers…</span>' + '<div class="docnew__skeleton-row" aria-hidden="true"><i></i><i></i></div>'.repeat(3);
        return;
      }
      if (pk.error) {
        elements.docnewList.innerHTML =
          '<p class="docnew__error" role="alert">Couldn\'t load customers. Check your connection.</p>' +
          '<button type="button" class="btn btn--outline js-docnew-retry">Try again</button>';
        return;
      }

      const rawNeedle = pk.query.trim();
      const needle = rawNeedle.toLowerCase();
      const matches = pk.customers.filter((c) =>
        !needle || String(c.name || "").toLowerCase().indexOf(needle) !== -1);

      /* The same dead end the order step below already answers: a document
         needs a customer, and "add one from the home page first" is an
         instruction to leave and come back. This row goes to the customer
         editor and carries whatever name was typed into the search with it, so
         a search that found nobody is one tap from creating them.

         Last, exactly where renderCustomerList puts the ledger's own add row.
         It used to be first, which cost the one row a keyboard-shrunk sheet had
         left: the first thing in a sheet whose job is to show customers has to
         be a customer. When the search finds nobody it is the only row anyway,
         so the position costs that case nothing. */
      const addRow = docnewRowHtml(
        ' data-new-customer="1"',
        rawNeedle ? 'Add “' + rawNeedle + '” as a new customer' : "Add new customer",
        // The title and the meta share one row. When the title already carries
        // the typed name it needs the whole width, and a meta beside it only
        // truncates the name the row exists to show.
        rawNeedle || matches.length ? "" : "No customers yet",
        ' docnew__row--new');

      elements.docnewList.innerHTML = matches.map((c) => docnewRowHtml(
        ' data-customer="' + U.escapeHtml(c.id) + '"', c.name, weddingText(c)
      )).join('') + addRow;
      announceDocumentPickerStatus(matches.length + (1 === matches.length ? " customer" : " customers"));
      return;
    }

    if ("termin" === pk.step) {
      const order = pk.selectedOrder;
      const terms = order ? docs.termsFor(order) : [];
      const amounts = order ? docs.termAmounts(docs.computeTotal(order.items), terms) : [];
      elements.docnewHint.textContent = "Which termin are you invoicing?";
      elements.docnewSearch.hidden = true;

      if (pk.generating) {
        elements.docnewList.innerHTML = '<p class="docnew__loading">Generating invoice…</p>' +
          '<div class="docnew__skeleton-row" aria-hidden="true"><i></i><i></i></div>'.repeat(Math.min(3, terms.length) || 1);
        return;
      }
      if (pk.loading) {
        elements.docnewList.innerHTML = '<span class="sr-only">Loading payment status…</span>' +
          '<div class="docnew__skeleton-row" aria-hidden="true"><i></i><i></i></div>'.repeat(Math.min(3, terms.length) || 1);
        return;
      }
      if (pk.error) {
        elements.docnewList.innerHTML =
          '<p class="docnew__error" role="alert">Couldn\'t load payment status. Check your connection.</p>' +
          '<button type="button" class="btn btn--outline js-docnew-retry">Try again</button>';
        return;
      }

      elements.docnewList.innerHTML = terms.map((term, index) => {
        const paid = !!pk.loggedDeposits[index];
        const meta = termLabelForPicker(term, amounts[index]) + (paid ? " · Paid" : "");
        return docnewRowHtml(' data-termin="' + index + '"', "Termin " + (index + 1) + " of " + terms.length, meta);
      }).join('');
      announceDocumentPickerStatus(terms.length + (1 === terms.length ? " termin" : " termins"));
      return;
    }

    elements.docnewHint.textContent = "Which order?";
    elements.docnewSearch.hidden = true;

    if (pk.generating) {
      elements.docnewList.innerHTML = '<p class="docnew__loading">Generating ' +
        U.escapeHtml(kindLabel.toLowerCase()) + '…</p>' +
        '<div class="docnew__skeleton-row" aria-hidden="true"><i></i><i></i></div>'.repeat(Math.min(3, (pk.orders || []).length) || 1);
      return;
    }
    if (pk.loading || !pk.orders) {
      elements.docnewList.innerHTML = '<span class="sr-only">Loading orders…</span>' + '<div class="docnew__skeleton-row" aria-hidden="true"><i></i><i></i></div>'.repeat(3);
      return;
    }
    if (pk.error) {
      elements.docnewList.innerHTML =
        '<p class="docnew__error" role="alert">Couldn\'t load orders. Check your connection.</p>' +
        '<button type="button" class="btn btn--outline js-docnew-retry">Try again</button>';
      return;
    }

    /* An order is the only thing a document or a moodboard hangs off, so a
       customer with none used to be a dead end here. It leads to the order
       editor now — the same one the edit route opens, because a new order needs
       priced items before it is worth anything, and that is the form that
       takes them. */
    const addRow = docnewRowHtml(
      ' data-new-order="1"', "Add new order",
      pk.orders.length ? "" : "This customer has none yet",
      ' docnew__row--new');

    if (!pk.orders.length) {
      elements.docnewList.innerHTML = addRow;
      announceDocumentPickerStatus("No orders for this customer");
      return;
    }

    /* Neither a moodboard nor a fitting log is a rendering of the order's items
       — each needs the order only for whose it is — so the readiness gate that
       blocks an unpriced order from becoming a quotation must not block it from
       becoming one of those. */
    const gated = !isMoodboardPicker() && !isFittingPicker();

    elements.docnewList.innerHTML = addRow + pk.orders.map((order, index) => {
      const ready = gated ? documentReadiness(order, pk.customer) : { canDownload: true, disabledReason: "" };
      const itemCount = (order.items || []).length;
      const meta = itemCount + (1 === itemCount ? " item" : " items") + " · " +
        U.formatRupiah(docs.computeTotal(order.items));
      const reasonId = ready.canDownload ? "" : "docnewReason" + index;

      return docnewRowHtml(
        ' data-order="' + U.escapeHtml(order.id) + '"' + (ready.canDownload ? '' : ' disabled'),
        orderLabel(order),
        meta,
        ready.canDownload ? '' : ' docnew__row--blocked',
        reasonId
      ) + (ready.canDownload ? ''
        : '<p class="docnew__reason" id="' + reasonId + '">' + U.escapeHtml(ready.disabledReason) + '</p>');
    }).join('');
    announceDocumentPickerStatus(pk.orders.length + (1 === pk.orders.length ? " order" : " orders"));
  }

  function announceDocumentPickerStatus(text) {
    elements.docnewStatus.textContent = text;
  }

  function termLabelForPicker(term, amount) {
    return docs.termLabel(term) + " · " + U.formatRupiah(amount);
  }

  async function openDocumentPicker(mode) {
    const pk = picker();
    if (pk.open) return;

    pk.open = true;
    pk.mode = mode || "quotation";
    pk.step = "customer";
    pk.customerId = null;
    pk.customer = null;
    pk.orders = null;
    pk.selectedOrder = null;
    pk.loggedDeposits = {};
    pk.directOrder = false;
    pk.query = "";
    pk.error = null;
    pk.generating = false;
    pk.returnEl = document.activeElement;

    elements.docnewSearch.value = "";
    // Reopening while the last close is still sliding: drop the pending hide,
    // or it fires and takes this one with it.
    cancelSheetClose(elements.docnewSheet);
    elements.docnewSheet.hidden = false;
    document.body.classList.add("has-docnew");
    /* A warm reopen paints the list it already has and swaps the fresh one in
       when it lands, so only a cold open shows skeletons. */
    pk.loading = !pk.customers;
    renderDocumentPicker();
    /* Focus stays on the title. Focusing the search field raised the software
       keyboard on every open, which collapsed the panel to two rows and made a
       sheet whose whole job is to show a list look like a sheet that demands
       typing. The field is a filter you reach for, not a greeting. */
    elements.docnewTitle.focus({ preventScroll: true });

    /* Refetched every open, never reused for the life of the page: the list was
       cached on first open and nothing cleared it, so a customer added after
       that was missing from the picker until a full reload. db.listCustomers is
       already a TTL cache with epoch invalidation, and createCustomer
       invalidates it, so a repeat open inside the TTL costs a Map read. */
    try {
      pk.customers = await db.listCustomers();
      pk.error = null;
    } catch (err) {
      console.error(err);
      pk.error = err;
    }
    pk.loading = false;
    if (pk.open) renderDocumentPicker();
  }

  function closeDocumentPicker(force) {
    const pk = picker();
    if (!pk.open || (pk.generating && !force)) return;
    const returnEl = pk.returnEl;
    pk.orderToken++;
    pk.open = false;
    state.production.creatingOrder = false;
    pk.returnEl = null;
    pk.generating = false;
    closeSheetElement(elements.docnewSheet);
    document.body.classList.remove("has-docnew");
    elements.docnewStatus.textContent = "";
    // Focus goes back now, not when the animation ends: it must never sit on a
    // sheet that has already slid away.
    if (returnEl && document.contains(returnEl)) returnEl.focus({ preventScroll: true });
  }

  async function pickDocumentCustomer(customerId) {
    const pk = picker();

    /* Adding an order needs the customer and nothing else, so this is the whole
       flow — there is no order step to advance to, and fetching the orders of a
       customer whose order is about to be written would only be a wait. */
    if (isNewOrderPicker()) {
      const fromProduction = state.production.creatingOrder && !!state.production.draft;
      closeDocumentPicker();
      state.production.creatingOrder = false;
      if (fromProduction) setDirty(false);
      go("#/customer/" + encodeURIComponent(customerId) + "/order/new/edit" + (fromProduction ? "?from=production" : ""));
      return;
    }

    const token = ++pk.orderToken;
    pk.customerId = customerId;
    pk.customer = (pk.customers || []).filter((c) => c.id === customerId)[0] || null;
    pk.step = "order";
    pk.orders = null;
    pk.error = null;
    pk.loading = true;
    renderDocumentPicker();

    let orders = null;
    let error = null;
    try {
      orders = await db.listOrders(customerId);
    } catch (err) {
      console.error(err);
      error = err;
    }
    if (token !== pk.orderToken || !pk.open || "order" !== pk.step || pk.customerId !== customerId) return;
    pk.orders = orders;
    pk.error = error;
    pk.loading = false;
    renderDocumentPicker();
  }

  function backToDocumentCustomers() {
    const pk = picker();
    if (pk.generating) return;
    if ("termin" === pk.step && !pk.directOrder) {
      pk.step = "order";
      pk.selectedOrder = null;
      pk.loggedDeposits = {};
      pk.error = null;
      pk.loading = false;
      renderDocumentPicker();
      elements.docnewTitle.focus({ preventScroll: true });
      return;
    }
    pk.orderToken++;
    pk.step = "customer";
    pk.orders = null;
    pk.error = null;
    pk.loading = false;
    renderDocumentPicker();
    /* The row that was focused has just been replaced by innerHTML, so focus
       would otherwise fall to <body> and leave the dialog. The title, not the
       search field — see openDocumentPicker on why the keyboard stays down. */
    elements.docnewTitle.focus({ preventScroll: true });
  }

  async function selectInvoiceOrder(orderId) {
    const pk = picker();
    const order = (pk.orders || []).filter((o) => o.id === orderId)[0];
    if (!order || pk.generating) return;
    const terms = docs.termsFor(order);
    pk.selectedOrder = order;

    if (1 === terms.length) {
      await generateDocumentFor(orderId, 0);
      return;
    }

    const token = ++pk.orderToken;
    pk.step = "termin";
    pk.loading = true;
    pk.error = null;
    renderDocumentPicker();
    try {
      pk.loggedDeposits = deriveLoggedDeposits(await db.listOrderHistory(orderId));
      pk.error = null;
    } catch (err) {
      console.error(err);
      pk.error = err;
    }
    if (token !== pk.orderToken || !pk.open || order !== pk.selectedOrder) return;
    pk.loading = false;
    renderDocumentPicker();
  }

  function openInvoiceTerminPicker() {
    const pk = picker();
    if (pk.open || !state.order) return;
    const terms = docs.termsFor(state.order);

    pk.open = true;
    pk.mode = "invoice";
    pk.step = "termin";
    pk.customer = state.customer;
    pk.orders = [state.order];
    pk.selectedOrder = state.order;
    pk.loggedDeposits = Object.assign({}, state.loggedDeposits);
    pk.directOrder = true;
    pk.loading = false;
    pk.generating = false;
    pk.error = null;
    pk.returnEl = document.activeElement;

    cancelSheetClose(elements.docnewSheet);
    elements.docnewSheet.hidden = false;
    document.body.classList.add("has-docnew");
    if (1 === terms.length) {
      generateDocumentFor(state.order.id, 0);
      return;
    }
    renderDocumentPicker();
    elements.docnewTitle.focus({ preventScroll: true });
  }

  /* Generates the PDF and records it, in exactly the order downloadDocument
     uses on the order page. docs.download fills the offscreen #quotation /
     #invoice templates and reads its own DOM nodes — it never touches app
     state and does not need the order view to be showing, which is what makes
     issuing a document from a list page possible at all. */
  async function generateDocumentFor(orderId, invoiceTermIndex) {
    const pk = picker();
    const order = (pk.orders || []).filter((o) => o.id === orderId)[0];
    if (!order || pk.generating) return;

    // pk.mode, not the feed's kind: the sheet opens from the homepage too,
    // where the feed carries whichever kind was last looked at.
    const kind = pk.mode;
    const terms = docs.termsFor(order);
    const isInvoice = "invoice" === kind;
    if (isInvoice && (!Number.isInteger(invoiceTermIndex) || invoiceTermIndex < 0 || invoiceTermIndex >= terms.length)) {
      pk.step = "termin";
      pk.error = null;
      renderDocumentPicker();
      showToast("Choose a valid invoice termin");
      return;
    }
    pk.generating = true;
    elements.docnewSheet.setAttribute("aria-busy", "true");
    renderDocumentPicker();
    announceDocumentPickerStatus("Generating " + documentKindName(kind).toLowerCase());

    let totalAmt;
    try {
      totalAmt = await docs.download(kind, {
        docName: order.doc_name || (pk.customer && pk.customer.name) || "",
        date: U.todayISO(),
        items: order.items || [],
        includes: order.includes || [],
        terms,
        invoiceTermIndex: isInvoice ? invoiceTermIndex : undefined
      });
    } catch (err) {
      console.error(err);
      // Nothing is logged and no status moves: the document was never produced.
      pk.generating = false;
      elements.docnewSheet.setAttribute("aria-busy", "false");
      renderDocumentPicker();
      showToast("Could not generate the PDF — please try again");
      return;
    }

    pk.generating = false;
    elements.docnewSheet.setAttribute("aria-busy", "false");
    showToast(documentKindName(kind) + " downloaded");

    try {
      if (pk.directOrder) {
        await bumpStatus(isInvoice ? "Confirmed" : "Quoted");
      } else {
        const nextStatus = advancedStatus(order.status, isInvoice ? "Confirmed" : "Quoted");
        if (nextStatus !== order.status) await db.updateOrder(order.id, { status: nextStatus });
      }
      await db.logDocument(order.id, kind, totalAmt,
        isInvoice ? invoiceTermIndex + 1 : null,
        isInvoice ? terms.length : null);
    } catch (err) {
      console.error(err);
      showToast("Downloaded, but could not record it");
    }

    closeDocumentPicker();
    // The feed is append-only, so a clean first page is how a new row is
    // introduced — never a splice into the middle of rendered DOM.
    if (isDocumentsRoute()) await startDocumentFirstPage();
  }

  /* ----------------------------- Document events ------------------------- */

  elements.doclistSearch.addEventListener("input", () => {
    const ds = docFeed();
    const value = elements.doclistSearch.value;

    if (ds.customerSeed && value !== ds.customerSeed.originalQuery) ds.customerSeed = null;
    ds.query = value;
    renderDocumentSearchClear();

    clearTimeout(ds.searchTimer);
    ds.searchTimer = setTimeout(() => {
      ds.searchTimer = null;
      startDocumentFirstPage();
    }, DOCUMENT_SEARCH_DEBOUNCE_MS);
  });

  elements.doclistSearchClear.addEventListener("click", () => {
    const ds = docFeed();
    clearTimeout(ds.searchTimer);
    ds.searchTimer = null;
    ds.customerSeed = null;
    ds.query = "";
    elements.doclistSearch.value = "";
    renderDocumentSearchClear();
    elements.doclistSearch.focus({ preventScroll: true });
    startDocumentFirstPage();
  });

  elements.doclistSearch.addEventListener("focus", scheduleDocumentSearchAlign);

  elements.viewDocuments.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".cust-nav-btn,.doclist-panel__retry,.doclist-card-link");
    if (target && !target.disabled) target.classList.add("is-pressed");
  });

  elements.viewDocuments.addEventListener("keydown", (e) => {
    if (" " !== e.key && "Enter" !== e.key) return;
    const target = e.target.closest(".cust-nav-btn,.doclist-panel__retry");
    if (target && !target.disabled) target.classList.add("is-pressed");
  });

  elements.viewDocuments.addEventListener("click", (e) => {
    if (e.target.closest("#doclistNewBtn")) {
      openDocumentPicker(docFeed().kind);
      return;
    }
    if (e.target.closest(".doclist-card-link")) {
      docFeed().retainScroll = window.scrollY || window.pageYOffset || 0;
      return;
    }
    if (e.target.closest(".js-doclist-retry")) {
      startDocumentFirstPage();
      return;
    }
    if (e.target.closest(".js-doclist-retry-more")) {
      const ds = docFeed();
      ds.loadMoreError = null;
      renderDocumentFeed();
      ensureDocumentObserver();
      loadMoreDocuments();
    }
  });

  elements.docnewSearch.addEventListener("input", () => {
    picker().query = elements.docnewSearch.value;
    renderDocumentPicker();
  });

  elements.docnewList.addEventListener("click", (e) => {
    const pk = picker();
    if (e.target.closest(".js-docnew-retry")) {
      if ("customer" === pk.step) {
        pk.customers = null;
        pk.error = null;
        pk.step = "customer";
        openDocumentPickerReload();
      } else if ("termin" === pk.step && pk.selectedOrder) {
        selectInvoiceOrder(pk.selectedOrder.id);
      } else if (pk.customerId) {
        pickDocumentCustomer(pk.customerId);
      }
      return;
    }
    const row = e.target.closest(".docnew__row");
    if (!row || row.disabled) return;

    if (row.dataset.termin) {
      const index = Number(row.dataset.termin);
      if (pk.selectedOrder) generateDocumentFor(pk.selectedOrder.id, index);
      return;
    }

    if (row.dataset.customer) {
      pickDocumentCustomer(row.dataset.customer);
      return;
    }
    if (row.dataset.newCustomer) {
      // Seeded with the search text, exactly as the ledger's own add row is.
      const seed = picker().query.trim();
      const fromProduction = state.production.creatingOrder && !!state.production.draft;
      closeDocumentPicker();
      if (fromProduction) setDirty(false);
      const params = new URLSearchParams();
      if (seed) params.set("name", seed);
      if (fromProduction) params.set("from", "production");
      go("#/customer/new/edit" + (params.toString() ? "?" + params.toString() : ""));
      return;
    }
    if (row.dataset.newOrder) {
      const customerId = pk.customerId;
      closeDocumentPicker();
      if (customerId) go("#/customer/" + encodeURIComponent(customerId) + "/order/new/edit");
      return;
    }
    if (!row.dataset.order) return;

    /* A moodboard is not generated from the order, only anchored to it, so
       there is nothing to wait on here — the sheet closes and the editor opens. */
    if (isMoodboardPicker()) {
      const orderId = row.dataset.order;
      closeDocumentPicker();
      go("#/order/" + encodeURIComponent(orderId) + "/moodboard");
      return;
    }

    /* The picker answers "which order?"; the fittingNew route already answers
       "which stage?" and resolves or creates the session, race recovery and
       all. from=fittings is what tells it the answer to "back to where?" is the
       feed this started on rather than an order page never visited. */
    if (isFittingPicker()) {
      const orderId = row.dataset.order;
      closeDocumentPicker();
      go("#/order/" + encodeURIComponent(orderId) + "/fitting/new?from=fittings");
      return;
    }
    if ("invoice" === pk.mode) selectInvoiceOrder(row.dataset.order);
    else generateDocumentFor(row.dataset.order);
  });

  async function openDocumentPickerReload() {
    const pk = picker();
    pk.loading = true;
    renderDocumentPicker();
    try {
      pk.customers = await db.listCustomers();
      pk.error = null;
    } catch (err) {
      console.error(err);
      pk.error = err;
    }
    pk.loading = false;
    if (pk.open) renderDocumentPicker();
  }

  elements.docnewBack.addEventListener("click", backToDocumentCustomers);
  /* Wrapped, not passed by reference: closeDocumentPicker's second parameter is
     `force`, and handing it a MouseEvent made a Cancel or backdrop tap satisfy
     the mid-generation guard that the Escape path correctly respects. */
  elements.docnewCancel.addEventListener("click", () => closeDocumentPicker());
  elements.docnewBackdrop.addEventListener("click", () => closeDocumentPicker());
  elements.docnewSheet.addEventListener("keydown", (e) => {
    if ("Escape" === e.key) {
      // A generate in flight owns the sheet until the PDF resolves.
      if (picker().generating) return;
      e.preventDefault();
      closeDocumentPicker();
      return;
    }
    trapModalFocus(e, elements.docnewSheet);
  });

  /* ====================== Fitting log session detail ====================== */

  /* Figma 229:2847. Exactly one fitting_sessions record — never a stage, never
     an order, never a merge of several sessions. Both this page and the photo
     editor fetch their own records, so a pasted URL and a tapped card produce
     identical state. */

  const detail = () => state.fittingDetail;
  const isDetailRoute = () => !!state.route && "fittingLogDetail" === state.route.view;

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
          // Drawn over the photo, never into it: the archived original is clean.
          U.annotationSvg(photo.annotation) +
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

    /* One editor for the whole log, opened on the photo you tapped. There is no
       per-photo route any more: a caption and a mark were the only things it
       could change, and both live in the workspace now. */
    const editHref = "#/fittings/" + encodeURIComponent(d.sessionId) +
      "/edit?source=" + d.source + "&focus=" + encodeURIComponent(photo.id);

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
    // Uint8Array.from does the same walk in one native pass; the hand-rolled
    // loop was several megabytes of scripting on a large photo.
    const raw = String(result.image_base64 || "");
    const bytes = Uint8Array.from(atob(raw), (ch) => ch.charCodeAt(0));
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

  function openFittingPhotoViewerImage(url, caption, alt, originButton, annotation) {
    if (!url) return;
    const d = detail();
    d.viewerReturn = originButton || null;
    /* The marks belong to the photo, so enlarging it enlarges them. A viewer
       that quietly showed the clean original would be describing a revision
       nobody can see. */
    const existingLayer = $(".fitmark-layer", elements.fittingPhotoViewerFrame);
    if (existingLayer) existingLayer.remove();
    const layer = U.annotationSvg(annotation);
    if (layer) elements.fittingPhotoViewerFrame.insertAdjacentHTML("beforeend", layer);
    elements.fittingPhotoViewerImage.src = url;
    elements.fittingPhotoViewerImage.alt = alt || caption || "Fitting photo";
    elements.fittingPhotoViewerCaption.textContent = caption || "";
    elements.fittingPhotoViewer.hidden = false;
    document.body.classList.add("has-modal");
    requestAnimationFrame(() => elements.fittingPhotoViewerClose.focus({ preventScroll: true }));
  }

  function openFittingPhotoViewer(photoId, originButton) {
    const d = detail();
    const photo = d.photos.filter((p) => p.id === photoId)[0];
    if (!photo || "unavailable" === fittingPhotoState(photo)) return;
    openFittingPhotoViewerImage(
      fittingPhotoDisplayURL(photo),
      photo.caption,
      photo.caption || "Fitting photo",
      originButton,
      photo.annotation
    );
  }

  function closeFittingPhotoViewer() {
    if (elements.fittingPhotoViewer.hidden) return;
    const d = detail();
    elements.fittingPhotoViewer.hidden = true;
    elements.fittingPhotoViewerImage.removeAttribute("src");
    const layer = $(".fitmark-layer", elements.fittingPhotoViewerFrame);
    if (layer) layer.remove();
    document.body.classList.remove("has-modal");
    if (d.viewerReturn && document.contains(d.viewerReturn)) d.viewerReturn.focus({ preventScroll: true });
    d.viewerReturn = null;
  }

  /* --------------------------- Photo entry & deletion ---------------------- */

  /* Gallery first, and native: the studio adds photos it already took far more
     often than it shoots into the app, and the native sheet is the only picker
     that can return several at once. It also already offers Take Photo, which
     is why this app no longer owns a camera of its own. */
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
    go("#/fittings/" + encodeURIComponent(d.sessionId) + "/edit?source=" + d.source);
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
      // Session, order, customer and photos in one round trip apiece rather
      // than a three-deep chain.
      let landed = 0;
      const countPart = (promise) => promise.then((value) => {
        KK.progress.step(++landed, 2);
        return value;
      });
      const parts = await Promise.all([
        countPart(db.getFittingSession(sessionId)),
        countPart(db.listFittingPhotosBySession(sessionId))
      ]);
      const rec = splitSession(parts[0]);
      session = rec.session;
      order = rec.order || await db.getOrder(session.order_id);
      customer = rec.customer || await db.getCustomer(order.customer_id);
      photos = sortFittingPhotos(parts[1]);
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
    elements.fitdetBackBtn.href = "order" === d.source ? "#/order/" + encodeURIComponent(order.id) : (feed().retainHash || "#/fittings");
    elements.fitdetDeleteBtn.disabled = false;

    renderFittingDetail();
  }

  /* -------------------------- Detail event wiring -------------------------- */

  function setupFittingDetailListeners() {
    const pressable = ".cust-nav-btn,.fitdet-action,.fitdet-bar__btn,.fitdet-delete";

    [elements.viewFittingDetail, elements.viewFittingPhotoAdd].forEach((view) => {
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

    [elements.fitdetBar, elements.fitaddBar].forEach((bar) => {
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

    elements.fitdetPdfBtn.addEventListener("click", downloadFittingPdf);
    /* Two doors into the same workspace. Edit opens it on what is already
       saved; Add photos opens the gallery sheet first and only then navigates,
       so a dismissed picker leaves this page exactly as it was. */
    elements.fitdetEditBtn.addEventListener("click", () => {
      const d = detail();
      if (!d.session) return;
      go("#/fittings/" + encodeURIComponent(d.sessionId) + "/edit?source=" + d.source);
    });
    elements.fitdetAddBtn.addEventListener("click", addFittingDetailPhoto);
    elements.fitdetPhotoInput.addEventListener("change", (e) => {
      const files = e.target.files;
      const picked = files && files.length ? Array.from(files) : [];
      e.target.value = "";
      detailPhotosPicked(picked);
    });
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

  /* The marks a card would show right now: the local proposal if one exists,
     otherwise whatever was last saved. The caption twin of this is addCaptionFor,
     and the two are deliberately identical in shape. */
  function addAnnotationFor(photo) {
    const a = add();
    return a.annotationPatches.has(photo.id)
      ? a.annotationPatches.get(photo.id)
      : U.normalizeAnnotation(photo.annotation);
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

  /* Both sides of an annotation comparison go through normalizeAnnotation, so
     key order is fixed and the JSON comparison is honest rather than accidental. */
  const addAnnotationJson = (value) => JSON.stringify(U.normalizeAnnotation(value));

  function addDirty() {
    const a = add();
    if (a.newPhotos.length || a.deleted.size) return true;

    let changed = false;
    a.captionPatches.forEach((caption, id) => {
      const photo = addExistingById(id);
      if (photo && String(photo.caption || "") !== caption) changed = true;
    });
    if (changed) return true;

    a.annotationPatches.forEach((annotation, id) => {
      const photo = addExistingById(id);
      if (photo && addAnnotationJson(annotation) !== addAnnotationJson(photo.annotation)) changed = true;
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
      caption: "",
      annotation: null
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

  function fitaddStageHtml(url, alt, eager, statusHtml, key, kind, annotation) {
    if (!url) {
      return '<div class="fitadd-stage fitadd-stage--missing">' +
        '<div class="fitadd-stage__missing">' +
          '<b>Photo unavailable</b>' +
          '<span>No image on this device or in Drive. Its caption is kept.</span>' +
        '</div>' +
      '</div>';
    }
    return '<button type="button" class="fitadd-stage js-fitadd-open" data-key="' + U.escapeHtml(key) +
      '" data-kind="' + U.escapeHtml(kind) + '" aria-label="Enlarge ' + U.escapeHtml(alt) + '">' +
      '<img class="fitadd-stage__image" data-role="image" src="' + U.escapeHtml(url) + '" ' +
        'alt="' + U.escapeHtml(alt) + '" loading="' + (eager ? "eager" : "lazy") + '" decoding="async">' +
      // The marks sit over the pixels, not in them: the stored photo is clean.
      U.annotationSvg(annotation) +
      (statusHtml || '') +
    '</button>';
  }

  function fitaddIconHtml(kind) {
    const symbol = "save" === kind ? "confirm" : kind;
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="assets/fitadd-icons.svg#' + symbol + '"></use></svg>';
  }

  function fitaddActionHtml(cls, key, kind, label, ariaLabel, iconSrc, disabled) {
    return '<button type="button" class="fitdet-action ' + cls + '" ' +
      'data-key="' + U.escapeHtml(key) + '" data-kind="' + kind + '"' + (disabled ? ' disabled' : '') + ' ' +
      'aria-label="' + U.escapeHtml(ariaLabel) + '">' +
      '<span class="fitdet-action__face">' +
        (iconSrc ? ("<" === iconSrc.charAt(0) ? iconSrc : '<img src="' + iconSrc + '" alt="" width="20" height="20">') : '') +
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
          '<label class="sr-only" for="fitaddCaption-' + U.escapeHtml(key) + '">Caption</label>' +
          '<textarea class="fitadd-textarea" id="fitaddCaption-' + U.escapeHtml(key) + '" ' +
            'data-key="' + U.escapeHtml(key) + '" rows="2" enterkeyhint="done" ' +
            'placeholder="What changed in this fitting?" ' +
            'aria-label="Caption for photo ' + number + '">' +
            U.escapeHtml(String(a.editorDrafts.get(key) || "")) +
          '</textarea><span class="fitadd-textarea__rail" aria-hidden="true"></span>' +
        '</div>'
      : caption
      ? '<p class="fitdet-card__caption">' + U.escapeHtml(caption) + '</p>'
      : '';

    /* Resting: delete, mark, caption. The mark label says what tapping it does
       to the marks that are already there, and a photo with no image on this
       device says so rather than opening an editor over nothing. */
    const markLabel = options.hasMark ? "Edit mark" : "Mark";
    const markAria = !options.canMark
      ? "Mark photo " + number + " (this photo has no image to mark)"
      : options.hasMark
      ? "Edit the marks on photo " + number
      : "Draw a mark on photo " + number;

    const actions = editing
      ? fitaddActionHtml("fitadd-action--cancel js-fitadd-cancel", key, options.kind, "Cancel",
          "Cancel the caption for photo " + number, fitaddIconHtml("cancel"), busy) +
        '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
        fitaddActionHtml("fitadd-action--save js-fitadd-save", key, options.kind, "Save",
          "Save the caption for photo " + number, fitaddIconHtml("save"), busy)
      : fitaddActionHtml("js-fitadd-delete", key, options.kind, "Delete",
          "Delete photo " + number, "", busy || !options.canDelete) +
        '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
        fitaddActionHtml("js-fitadd-mark", key, options.kind, markLabel, markAria,
          "", busy || !options.canMark) +
        '<span class="fitdet-actions__rule" aria-hidden="true"></span>' +
        fitaddActionHtml("js-fitadd-caption", key, options.kind, caption ? "Edit caption" : "Add caption",
          (caption ? "Edit the caption for photo " : "Add a caption to photo ") + number,
          "", busy || !options.canCaption);

    return '<div class="fitlog-grid-spacer" aria-hidden="true"></div>' +
      '<div class="fitlog-grid-rule" aria-hidden="true"></div>' +
      '<div class="fitdet-inset" data-key="' + U.escapeHtml(key) + '" data-kind="' + options.kind + '">' +
        '<article class="fitdet-card">' + options.stage + body + '</article>' +
        '<div class="fitdet-actions' + (editing ? '' : ' fitdet-actions--trio') + '">' + actions + '</div>' +
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

    if (a.session) {
      const stage = U.fittingStage(a.session.stage);
      elements.fitaddBackLabel.textContent = stage.label || "Fitting log";
      elements.fitaddStage.textContent = stage.label;
      elements.fitaddStage.hidden = !stage.label;
      elements.fitaddStage.className = "fitdet-stage" + (stage.key ? " fitdet-stage--" + stage.key : "");
      elements.fitaddCustomer.textContent = (a.customer && a.customer.name) || "Unnamed customer";
      elements.fitaddDate.textContent = U.formatJakartaLongDate(a.session.created_at);
    }

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
      const annotation = addAnnotationFor(photo);
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
        // You cannot mark what you cannot see; the note stays editable either way.
        canMark: !!url,
        hasMark: !!annotation,
        stage: fitaddStageHtml(url, alt, 0 === index, '', photo.id, "existing", annotation)
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
        // Marking a half-prepared photo would measure the raw file and then
        // have its coordinates replaced under it.
        canMark: "ready" === draft.status,
        hasMark: !!draft.annotation,
        stage: fitaddStageHtml(url, alt, true, fitaddDraftStatusHtml(draft), draft.clientKey, "new", draft.annotation)
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
    // A draft cannot be marked before it is ready, so there is no marks layer
    // here to preserve across the swap — only the image element itself.


    // Reuse the same <img> so focus and the action state survive preparation;
    // its natural ratio may refine once the prepared pixels replace the source.
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
    elements.fitaddSaveFace.textContent = a.saving ? "Saving…" : "Save fitting log";

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
      el.focus(); // focus-scroll-ok: the caption editor is being opened on purpose, and scrollIntoView follows
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

  /* ---------------------------- Photo annotation --------------------------- */

  /* A red pen over one fitting photo, and nothing more: no colours, no shapes,
     no text. The job is to circle the seam that has to move.

     Full screen on purpose. Drawing inside the scrolling card list would put
     every stroke in a fight with the page scroll on a phone, and the card image
     is too small to circle anything accurately. */

  const mark = () => add().mark;
  const markStrokesJson = () => JSON.stringify(mark().strokes);

  /* The photo a card is showing right now — a prepared draft, a local image, or
     a Drive thumbnail. Marking never fetches its own copy. */
  function fittingMarkSource(key, kind) {
    if ("new" === kind) {
      const draft = addDraftByKey(key);
      if (!draft || "ready" !== draft.status) return null;
      return { url: draft.preparedUrl || draft.sourceUrl || "", annotation: draft.annotation };
    }
    const photo = addExistingById(key);
    if (!photo) return null;
    return { url: fittingPhotoDisplayURL(photo), annotation: addAnnotationFor(photo) };
  }

  /* The card's own number, so the overlay title and the announcement agree with
     what the list behind it says. */
  function fittingMarkNumber(key, kind) {
    const a = add();
    const visible = addVisibleExisting();
    if ("new" === kind) {
      const index = a.newPhotos.findIndex((draft) => draft.clientKey === key);
      return -1 === index ? 0 : visible.length + index + 1;
    }
    const index = visible.findIndex((photo) => photo.id === key);
    return index + 1;
  }

  /* The canvas covers the image, not the stage. object-fit: contain letterboxes
     a photo inside a box of a different shape, and a canvas stretched over the
     whole box would put every mark in the wrong place by exactly the size of
     those bars. */
  function layoutFittingMark() {
    const m = mark();
    if (!m.open || !m.natW || !m.natH) return;

    const box = elements.fitmarkStage.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const fit = KK.fittingPdf.fitContain(m.natW, m.natH, box.width, box.height);
    const canvas = elements.fitmarkCanvas;
    canvas.style.left = ((box.width - fit.w) / 2) + "px";
    canvas.style.top = ((box.height - fit.h) / 2) + "px";
    canvas.style.width = fit.w + "px";
    canvas.style.height = fit.h + "px";

    /* Capped at 3: beyond that the backing store costs memory a phone would
       rather spend on the photo itself, and no eye can tell. */
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(fit.w * dpr));
    canvas.height = Math.max(1, Math.round(fit.h * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redrawFittingMark();
  }

  /* Canvas pixels are never read back, so a rotation or a resize is lossless:
     every stroke redraws from the normalized array it was stored in. */
  function redrawFittingMark() {
    const canvas = elements.fitmarkCanvas;
    const ctx = canvas.getContext("2d");
    const width = parseFloat(canvas.style.width) || 0;
    const height = parseFloat(canvas.style.height) || 0;
    ctx.clearRect(0, 0, width, height);
    mark().strokes.forEach((stroke) => drawFittingMarkStroke(stroke));
  }

  function drawFittingMarkStroke(stroke) {
    const canvas = elements.fitmarkCanvas;
    const ctx = canvas.getContext("2d");
    const width = parseFloat(canvas.style.width) || 0;
    const height = parseFloat(canvas.style.height) || 0;
    if (!stroke.points.length) return;

    /* The stored width is a fraction of the image's longest edge, so it stays
       the same mark whether it is drawn on a phone or printed on A4. The floor
       keeps it visible on a small screen. */
    ctx.lineWidth = Math.max(2, stroke.width * Math.max(width, height));
    ctx.strokeStyle = U.ANNOTATION_COLOR;
    ctx.fillStyle = U.ANNOTATION_COLOR;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // A tap is a mark too, and a path of one point draws nothing.
    if (1 === stroke.points.length) {
      ctx.beginPath();
      ctx.arc(stroke.points[0][0] * width, stroke.points[0][1] * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point[0] * width;
      const y = point[1] * height;
      if (index) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  /* Clamped, so a finger dragged past the edge of the photo stops at the edge
     instead of storing a point that is not on the image at all. */
  function fittingMarkPoint(e) {
    const box = elements.fitmarkCanvas.getBoundingClientRect();
    const x = box.width ? (e.clientX - box.left) / box.width : 0;
    const y = box.height ? (e.clientY - box.top) / box.height : 0;
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
  }

  function onFittingMarkDown(e) {
    const m = mark();
    // Only the first pointer draws: a second finger must not fork the stroke.
    if (!m.open || m.drawing) return;
    if (m.strokes.length >= U.ANNOTATION_MAX_STROKES) {
      elements.fitmarkStatus.textContent = "This photo has as many marks as it can hold";
      return;
    }

    e.preventDefault();
    m.drawing = true;
    m.pointerId = e.pointerId;
    try {
      elements.fitmarkCanvas.setPointerCapture(e.pointerId);
    } catch (_) {
      // Capture is a convenience; the pointerup handler works without it.
    }

    const point = fittingMarkPoint(e);
    m.last = point;
    m.strokes.push({ width: U.ANNOTATION_DEFAULT_WIDTH, points: [point] });
    drawFittingMarkStroke(m.strokes[m.strokes.length - 1]);
    syncFittingMarkTools();
  }

  function onFittingMarkMove(e) {
    const m = mark();
    if (!m.drawing || e.pointerId !== m.pointerId) return;
    e.preventDefault();

    const stroke = m.strokes[m.strokes.length - 1];
    if (!stroke) return;

    const box = elements.fitmarkCanvas.getBoundingClientRect();
    const point = fittingMarkPoint(e);
    /* A raw 120Hz pointer stream is thousands of points describing the same
       curve. Dropping anything under 1.5 CSS px keeps the stroke identical and
       the payload small. */
    const movedX = Math.abs(point[0] - m.last[0]) * box.width;
    const movedY = Math.abs(point[1] - m.last[1]) * box.height;
    if (movedX < 1.5 && movedY < 1.5) return;

    stroke.points.push(point);
    m.last = point;

    // Draw only the new segment; a full redraw per pointermove is what makes a
    // canvas feel laggy under a finger.
    const ctx = elements.fitmarkCanvas.getContext("2d");
    const width = parseFloat(elements.fitmarkCanvas.style.width) || 0;
    const height = parseFloat(elements.fitmarkCanvas.style.height) || 0;
    const previous = stroke.points[stroke.points.length - 2];
    ctx.lineWidth = Math.max(2, stroke.width * Math.max(width, height));
    ctx.strokeStyle = U.ANNOTATION_COLOR;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previous[0] * width, previous[1] * height);
    ctx.lineTo(point[0] * width, point[1] * height);
    ctx.stroke();
  }

  /* A stroke a system gesture interrupted is still a stroke; it is kept rather
     than thrown away, because losing a mark is worse than keeping a short one. */
  function onFittingMarkUp(e) {
    const m = mark();
    if (!m.drawing || e.pointerId !== m.pointerId) return;
    m.drawing = false;
    m.pointerId = null;
    m.last = null;
    try {
      elements.fitmarkCanvas.releasePointerCapture(e.pointerId);
    } catch (_) {
      // Already released, or never captured.
    }
    syncFittingMarkTools();
  }

  function undoFittingMark() {
    const m = mark();
    if (!m.strokes.length) return;
    m.strokes.pop();
    redrawFittingMark();
    syncFittingMarkTools();
    elements.fitmarkStatus.textContent = m.strokes.length
      ? m.strokes.length + (1 === m.strokes.length ? " mark" : " marks") + " on this photo"
      : "No marks on this photo";
  }

  function clearFittingMark() {
    const m = mark();
    if (!m.strokes.length) return;
    m.strokes = [];
    redrawFittingMark();
    syncFittingMarkTools();
    elements.fitmarkStatus.textContent = "Marks cleared";
  }

  function syncFittingMarkTools() {
    const empty = !mark().strokes.length;
    elements.fitmarkUndo.disabled = empty;
    elements.fitmarkClear.disabled = empty;
  }

  function fittingMarkImageReady(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise((resolve) => {
      const settle = () => {
        img.removeEventListener("load", settle);
        img.removeEventListener("error", settle);
        resolve();
      };
      img.addEventListener("load", settle);
      img.addEventListener("error", settle);
    });
  }

  async function openFittingMark(key, kind) {
    const a = add();
    if (a.saving || a.mark.open) return;

    const source = fittingMarkSource(key, kind);
    if (!source || !source.url) return showToast("That photo has no image to mark");

    const number = fittingMarkNumber(key, kind);
    const existing = U.normalizeAnnotation(source.annotation);
    const m = a.mark;
    m.open = true;
    m.key = key;
    m.kind = kind;
    m.natW = 0;
    m.natH = 0;
    m.strokes = existing ? existing.strokes.map((stroke) => ({ width: stroke.width, points: stroke.points.slice() })) : [];
    m.baseline = markStrokesJson();
    m.drawing = false;
    m.pointerId = null;
    m.last = null;

    elements.fitmarkTitle.textContent = "Photo " + number + " of " + (addVisibleCount() || 1);
    elements.fitmarkStatus.textContent = "";
    elements.fitmark.classList.add("is-loading");
    elements.fitmark.hidden = false;
    document.body.classList.add("has-modal");
    syncFittingMarkTools();

    const img = elements.fitmarkImage;
    img.alt = "Fitting photo " + number;
    if (img.getAttribute("src") !== source.url) img.src = source.url;

    /* Load first, decode second. decode() is the nicer wait — it avoids a paint
       hitch — but it rejects on sources that load perfectly well, and treating
       that rejection as "no image" closed the overlay on a photo that was
       merely still arriving. */
    await fittingMarkImageReady(img);
    try {
      if (img.decode) await img.decode();
    } catch (_) {
      // A decode that refuses still leaves a loaded image behind.
    }
    // Re-entrancy: a fast Cancel can close this overlay while the image loads.
    if (!m.open || m.key !== key) return;

    if (!img.naturalWidth || !img.naturalHeight) {
      closeFittingMark(false);
      return showToast("That photo has no image to mark");
    }

    m.natW = img.naturalWidth;
    m.natH = img.naturalHeight;
    elements.fitmark.classList.remove("is-loading");
    layoutFittingMark();
    window.addEventListener("resize", layoutFittingMark);
    window.addEventListener("orientationchange", layoutFittingMark);
    requestAnimationFrame(() => elements.fitmarkDone.focus({ preventScroll: true }));
  }

  /* Done writes a local proposal, exactly like a caption's card Save. An empty
     stroke list commits null, so "cleared" and "never marked" are one state. */
  function commitFittingMark() {
    const a = add();
    const m = a.mark;
    const value = U.normalizeAnnotation({ v: U.ANNOTATION_VERSION, w: m.natW, h: m.natH, strokes: m.strokes });

    if ("new" === m.kind) {
      const draft = addDraftByKey(m.key);
      if (draft) draft.annotation = value;
    } else if (addExistingById(m.key)) {
      a.annotationPatches.set(m.key, value);
    }

    const count = value ? value.strokes.length : 0;
    announceAddStatus(count ? "Marks saved on this photo" : "Marks cleared from this photo");
  }

  function closeFittingMark(commit) {
    const a = add();
    const m = a.mark;
    if (!m.open) return;

    if (commit) commitFittingMark();

    window.removeEventListener("resize", layoutFittingMark);
    window.removeEventListener("orientationchange", layoutFittingMark);

    const key = m.key;
    m.open = false;
    m.drawing = false;
    m.pointerId = null;
    m.last = null;
    m.strokes = [];
    m.key = null;
    m.kind = null;

    elements.fitmark.hidden = true;
    elements.fitmark.classList.remove("is-loading");
    elements.fitmarkImage.removeAttribute("src");
    document.body.classList.remove("has-modal");

    renderFittingPhotoAdd();
    syncAddDirty();

    const button = elements.fitaddList.querySelector('.js-fitadd-mark[data-key="' + cssEscapeAttr(key) + '"]');
    if (button) button.focus({ preventScroll: true });
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

    /* One entry per photo, carrying only the keys that actually changed. The
       RPC reads key presence, so a caption edit never silently overwrites a
       mark the same batch did not touch. */
    const updates = new Map();
    a.captionPatches.forEach((caption, id) => {
      if (a.deleted.has(id)) return;
      const photo = addExistingById(id);
      if (!photo || String(photo.caption || "") === caption) return;
      updates.set(id, Object.assign(updates.get(id) || { id }, { caption: caption || null }));
    });
    a.annotationPatches.forEach((annotation, id) => {
      if (a.deleted.has(id)) return;
      const photo = addExistingById(id);
      if (!photo) return;
      const next = U.normalizeAnnotation(annotation);
      if (addAnnotationJson(next) === addAnnotationJson(photo.annotation)) return;
      updates.set(id, Object.assign(updates.get(id) || { id }, { annotation: next }));
    });
    const photoUpdates = Array.from(updates.values());
    const deleteIds = Array.from(a.deleted.keys());
    const drafts = a.newPhotos.slice();
    const newPhotos = drafts.map((draft) => ({
      client_key: draft.clientKey,
      caption: draft.caption || null,
      annotation: U.normalizeAnnotation(draft.annotation)
    }));

    const sessionId = a.sessionId;
    const source = a.source;

    a.saving = true;
    clearAddUndo();
    renderFittingPhotoAdd();
    announceAddStatus("Saving changes");

    let result;
    try {
      result = await db.saveFittingPhotoBatch(sessionId, photoUpdates, deleteIds, newPhotos);
    } catch (err) {
      console.error(err);
      // Every draft, caption and staged deletion survives for the retry.
      a.saving = false;
      renderFittingPhotoAdd();
      announceAddStatus("Save failed");
      showFormError((err && err.message) || "Could not save those changes", elements.viewFittingPhotoAdd);
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
    a.annotationPatches.clear();
    a.deleted.clear();
    a.openEditors.clear();
    a.editorDrafts.clear();
    a.existing = photos;
    // A log holding a committed photo is no longer a log nobody asked for.
    a.provisionalSessionId = null;
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
    a.annotationPatches.clear();
    a.deleted.clear();
    a.openEditors.clear();
    a.editorDrafts.clear();
    a.existing = [];
    a.focusPhotoId = null;
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
    a.provisionalSessionId = null;
    closeFittingMark(false);
    elements.fitaddBackLabel.textContent = "Fitting log";
    elements.fitaddStage.hidden = true;
    elements.fitaddCustomer.textContent = "";
    elements.fitaddDate.textContent = "";
    elements.fitaddStatus.textContent = "";
    clearAddUndo();
  }

  /* A fitting log created on the way in and left without a single photo should
     not survive as an empty row in the feed. Best effort on purpose: a failed
     delete leaves a log the user can still delete from its own detail page,
     which is better than holding navigation hostage to a network call. */
  function discardProvisionalFittingLog() {
    const a = add();
    const sessionId = a.provisionalSessionId;
    a.provisionalSessionId = null;
    if (!sessionId || a.existing.length || a.newPhotos.length) return;
    db.deleteFittingSession(sessionId).then(invalidateFittingFeed, (err) => console.error(err));
  }

  function cleanupFittingPhotoAdd() {
    discardProvisionalFittingLog();
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

  /* An old per-photo editor link, and the detail page's own per-card Edit, both
     name the photo they were about; the workspace scrolls to it rather than
     dropping the reader at the top of a twenty-card list. */
  function scrollToFocusPhoto() {
    const a = add();
    const photoId = a.focusPhotoId;
    a.focusPhotoId = null;
    if (!photoId) return;
    requestAnimationFrame(() => {
      const card = elements.fitaddList.querySelector('[data-kind="existing"][data-key="' + cssEscapeAttr(photoId) + '"]');
      if (card) card.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    });
  }

  async function showFittingPhotoAdd(sessionId, queryParams) {
    const a = add();
    const seeded = a.seeded && a.sessionId === sessionId;
    const source = queryParams && "order" === queryParams.get("source") ? "order" : "feed";
    const focusId = (queryParams && queryParams.get("focus")) || null;
    /* Set by the order page's stage entry, which created this log a moment ago.
       It is what lets an abandoned empty log delete itself again. */
    const provisional = !!(queryParams && "1" === queryParams.get("new"));

    setChrome({ title: "Fitting notes", save: false, fitdetailpage: true });
    setSaveBar(false);

    if (seeded) {
      a.seeded = false;
      a.source = source;
      a.focusPhotoId = focusId;
      elements.fitaddBackBtn.href = addDetailHash();
      renderFittingPhotoAdd();
      syncAddDirty();
      scrollToFocusPhoto();
      runAddPreparationQueue();
      return;
    }

    resetFittingPhotoAdd();
    const token = a.loadToken;
    a.sessionId = sessionId;
    a.source = source;
    a.focusPhotoId = focusId;
    a.provisionalSessionId = provisional ? sessionId : null;
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
      const parts = await Promise.all([
        db.getFittingSession(sessionId),
        db.listFittingPhotosBySession(sessionId)
      ]);
      const rec = splitSession(parts[0]);
      session = rec.session;
      order = rec.order || await db.getOrder(session.order_id);
      customer = rec.customer || await db.getCustomer(order.customer_id);
      photos = sortFittingPhotos(parts[1]);
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
    scrollToFocusPhoto();
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
      const opener = e.target.closest(".js-fitadd-open");
      if (opener) {
        const key = opener.dataset.key;
        const draft = "new" === opener.dataset.kind ? addDraftByKey(key) : null;
        const photo = draft || addExistingById(key);
        const url = draft
          ? draft.preparedUrl || draft.sourceUrl || ""
          : photo ? fittingPhotoDisplayURL(photo) : "";
        const caption = draft ? draft.caption : photo ? addCaptionFor(photo) : "";
        // The marks on screen, not the marks in the database: an unsaved edit
        // is what this card is showing.
        const annotation = draft ? draft.annotation : photo ? addAnnotationFor(photo) : null;
        const image = opener.querySelector("img");
        return openFittingPhotoViewerImage(url, caption, image && image.alt, opener, annotation);
      }
      const action = e.target.closest(".fitdet-action");
      if (!action || action.disabled) return;
      const key = action.dataset.key;
      const kind = action.dataset.kind;
      if (action.matches(".js-fitadd-delete")) deleteAddCard(key, kind);
      else if (action.matches(".js-fitadd-mark")) openFittingMark(key, kind);
      else if (action.matches(".js-fitadd-caption")) openAddEditor(key);
      else if (action.matches(".js-fitadd-cancel")) closeAddEditor(key, true);
      else if (action.matches(".js-fitadd-save")) saveAddEditor(key);
    });

    /* Pointer Events only: one code path covers touch, pen and mouse, and
       pointer capture is what keeps a stroke alive when the finger leaves the
       canvas mid-drag. The canvas carries touch-action: none, which is what
       stops the page scrolling under the stroke. */
    elements.fitmarkCanvas.addEventListener("pointerdown", onFittingMarkDown);
    elements.fitmarkCanvas.addEventListener("pointermove", onFittingMarkMove);
    elements.fitmarkCanvas.addEventListener("pointerup", onFittingMarkUp);
    elements.fitmarkCanvas.addEventListener("pointercancel", onFittingMarkUp);

    elements.fitmarkUndo.addEventListener("click", undoFittingMark);
    elements.fitmarkClear.addEventListener("click", clearFittingMark);
    elements.fitmarkCancel.addEventListener("click", () => closeFittingMark(false));
    elements.fitmarkDone.addEventListener("click", () => closeFittingMark(true));

    document.addEventListener("keydown", (e) => {
      if (elements.fitmark.hidden) return;
      trapModalFocus(e, elements.fitmark);
      if ("Escape" === e.key) {
        e.preventDefault();
        closeFittingMark(false);
      }
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
      stage.classList.remove("js-fitadd-open");
      stage.classList.add("fitadd-stage--missing");
      stage.disabled = true;
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

    /* Adding a customer happens here and nowhere else, so the ledger always
       ends with the way to do it — not only when the list is empty. It used to
       render on the no-match branch alone, which reads fine right up until the
       ledger holds one customer: the homepage shortcut was then the single
       remaining entry point, and taking that tile away would have left none. */
    const searchVal = elements.customerSearch.value.trim();
    const addHref = "#/customer/new/edit" + (searchVal ? "?name=" + encodeURIComponent(searchVal) : "");
    const addLabel = searchVal
      ? '+ Add “' + U.escapeHtml(searchVal) + '” as a new customer'
      : "+ Add a customer";
    const addRow = '<a class="btn btn--outline btn--new btn--block btn--empty" href="' + U.escapeHtml(addHref) + '">' + addLabel + '</a>';

    if (!filtered.length) {
      elements.customerList.innerHTML =
        '<p class="empty">' + (state.customers.length
          ? 'No match for “' + U.escapeHtml(searchVal) + '”.'
          : "No customers yet.") + '</p>' + addRow;
      return;
    }

    elements.customerList.innerHTML = filtered.map((c) => {
      const orders = state.overview.ordersByCustomer[c.id] || [];
      const sumTotal = orders.reduce((acc, o) => acc + docs.computeTotal(o.items), 0);
      const statusInfo = homepageStatus(c, orders);
      const metaText = orders.length + " order" + (1 === orders.length ? "" : "s");

      const cardHtml = '<a class="home-customer-card home-customer-card--' + statusInfo.tone + '" href="#/customer/' + encodeURIComponent(c.id) + '" aria-label="' + U.escapeHtml((c.name || "Unnamed customer") + ", " + statusInfo.label) + '"><span class="home-customer-card__face"><span class="home-customer-card__top"><span class="home-customer-card__name">' + U.escapeHtml(c.name || "Unnamed customer") + '</span><span class="home-customer-card__badge">' + U.escapeHtml(statusInfo.label) + '</span></span>' + ("Cancelled" === statusInfo.label ? "" : '<span class="home-customer-card__meta"><span>' + U.escapeHtml(metaText) + '</span><span>' + U.formatRupiah(sumTotal) + '</span></span>') + '</span><span class="home-customer-card__rail"></span></a>';

      const done = !!c.completed_at;
      return '<div class="home-customer-record"><div class="home-grid-rule"></div><div class="home-customer-record__inset">' +
        swipeRowHtml(cardHtml, ' data-delete-customer="' + U.escapeHtml(c.id) + '"', c.name || "Unnamed customer",
          { attr: ' data-done-customer="' + U.escapeHtml(c.id) + '"', text: done ? "Undo" : "Done", undo: done }) +
        '</div><div class="home-grid-rule"></div><div class="home-grid-spacer" aria-hidden="true"></div></div>';
    }).join('') + addRow;
  }

  function homepageStatus(customerRecord, ordersList) {
    const orders = ordersList || [];
    /* Marked done by hand, so it outranks everything derived from orders and
       goes to the very foot of the ledger — below cancelled, which is at least
       a customer someone might still call. */
    if (customerRecord.completed_at) {
      return { label: "Done", tone: "quiet", rank: 6 };
    }
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

  /* A null id is what saveOrder reads to decide between an insert and an
     update, so it is the field that matters here; the rest exist only so the
     form fills from the same shape a real row has. No customer_id: the route
     supplies it, and a template carrying a stale one would be a bug waiting. */
  const NEW_ORDER_TEMPLATE = {
    id: null,
    title: "",
    doc_name: "",
    items: [],
    includes: [],
    payment_scheme: "standard",
    payment_terms: [],
    first_payment_date: null,
    second_payment_date: null,
    final_payment_date: null
  };

  const daysUntil = (targetIso) => Math.round((new Date(targetIso) - new Date(U.todayISO())) / 86400000);
  const isApproximateWedding = (cust) => !(!cust || !cust.wedding_date || "month" !== cust.wedding_date_precision);

  function weddingText(cust) {
    if (!cust || !cust.wedding_date) return "Not set";
    return isApproximateWedding(cust)
      ? U.formatLongDate(cust.wedding_date).replace(/^\d+\s/, "") + " (approximate)"
      : U.formatShortDate(cust.wedding_date);
  }

  /* ----------------------- Penjahit production ledger -------------------- */

  /* Probed once a session and remembered across them. The answer only changes
     when a migration is applied, and the stored value is what lets the homepage
     skeleton reserve the assignment tile's row instead of growing a tile under
     the reader's thumb the moment the probe lands. */
  const PRODUCTION_READY_KEY = "kk.production.available";

  function rememberProductionReady(available) {
    try { localStorage.setItem(PRODUCTION_READY_KEY, available ? "1" : "0"); } catch (err) { /* private mode */ }
  }

  function productionReadyGuess() {
    try { return localStorage.getItem(PRODUCTION_READY_KEY) === "1"; } catch (err) { return false; }
  }

  function applyProductionEntries(available) {
    $$("[data-production-entry]").forEach((element) => { element.hidden = !available; });
    document.body.classList.toggle("has-production", !!available);
  }

  async function productionReady() {
    if (state.production.available === null) {
      state.production.available = await db.productionAvailable();
      rememberProductionReady(state.production.available);
    }
    applyProductionEntries(state.production.available);
    return state.production.available;
  }

  function productionBalance(job) {
    return Number(job.amount) - Number(job.paid) + Number(job.refunded);
  }

  function productionTotals(jobs) {
    return jobs.reduce((totals, job) => {
      const balance = productionBalance(job);
      totals.amount += Number(job.amount);
      totals.paid += Number(job.paid);
      totals.refunded += Number(job.refunded);
      totals.outstanding += Math.max(0, balance);
      totals.credit += Math.max(0, -balance);
      totals.ongoing += ["Assigned", "In progress"].includes(job.status) ? 1 : 0;
      return totals;
    }, { amount: 0, paid: 0, refunded: 0, outstanding: 0, credit: 0, ongoing: 0 });
  }

  /* Agreed cost and Paid are always here, because their absence is itself a
     fact worth reading. Refunded and Credit appear only once there is one:
     a column of Rp 0 rows is four lines of nothing to scan past, and it makes
     a real credit harder to spot rather than easier. Outstanding and credit are
     never netted — see productionTotals. */
  function productionTotalsHtml(jobs) {
    const totals = productionTotals(jobs);
    return [
      ["Agreed cost", totals.amount, false, true],
      ["Paid", totals.paid, false, true],
      ["Refunded", totals.refunded, false, totals.refunded > 0],
      ["Outstanding", totals.outstanding, true, true],
      ["Credit", totals.credit, true, totals.credit > 0]
    ].filter(([, , , show]) => show).map(([label, amount, lead]) =>
      '<div' + (lead ? ' class="production-totals__lead"' : '') + '><dt>' + label + '</dt><dd>' + U.formatRupiah(amount) + '</dd></div>').join("");
  }

  function productionJobHtml(job) {
    const balance = productionBalance(job);
    const label = balance > 0 ? "Outstanding" : balance < 0 ? "Credit" : "Settled";
    const late = job.due_date && job.due_date < U.todayISO() && ["Assigned", "In progress"].includes(job.status);
    return '<a class="production-job" href="#/production/' + encodeURIComponent(job.id) + '">' +
      '<span class="production-job__face"><span class="production-job__top"><strong>' + U.escapeHtml(job.description) + '</strong><span class="production-status">' + U.escapeHtml(job.status) + '</span></span>' +
      '<span>' + U.escapeHtml(job.customer_name + " · " + job.order_title) + '</span>' +
      '<span class="production-job__meta">' + U.escapeHtml(job.item_name + " · " + job.quantity + " × ") + U.formatRupiah(job.unit_price) + '</span>' +
      '<span class="production-job__meta">' + U.escapeHtml(job.penjahit_name) + (job.due_date ? ' · ' + (late ? 'Overdue · ' : 'Due ') + U.escapeHtml(U.formatLongDate(job.due_date)) : '') + '</span></span>' +
      '<span class="production-job__rail"><span>' + label + '</span><strong>' + U.formatRupiah(Math.abs(balance)) + '</strong></span></a>';
  }

  /* Synchronous, and separate from the load below, because the search field is
     shared: the query leaving with the outgoing tab has to be put down and the
     incoming tab's picked up before anything renders from it. */
  function syncLedgerTab() {
    const tab = state.route.query.get("tab") === "penjahit" && state.production.available !== false ? "penjahit" : "customers";
    if (state.production.ledgerTab !== tab) {
      state.production.search[state.production.ledgerTab] = elements.customerSearch.value;
      elements.customerSearch.value = state.production.search[tab] || "";
    }
    state.production.ledgerTab = tab;
    elements.homeSearchSection.setAttribute("aria-label", tab === "penjahit" ? "Penjahit search" : "Customer search");
    elements.customerSearch.placeholder = tab === "penjahit" ? "Search penjahit name" : "Search customer name";
    $$("[data-ledger-tab]").forEach((link) => {
      if (link.dataset.ledgerTab === tab) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    return tab;
  }

  async function showHomepageLedger() {
    const tab = syncLedgerTab();
    const token = state.navigation.token;
    const available = await productionReady();
    if (token !== state.navigation.token) return;
    $("#customersTabCount").textContent = state.customers.length || "";
    elements.homeCustomers.hidden = tab === "penjahit" && available;
    elements.homePenjahit.hidden = !(tab === "penjahit" && available);
    if (!available) return;
    await loadPenjahitLedger(tab === "penjahit");
  }

  /* Fetched once per homepage visit and then kept: switching tabs is a filter
     on what is already here, not a new page. The penjahit tab loads eagerly in
     the background when the customer tab is showing, so the first switch is
     usually instant; `quiet` is what keeps that background load from painting
     a loading state over a list nobody is looking at. */
  async function loadPenjahitLedger(visible) {
    const token = state.navigation.token;
    if (state.production.ledgerLoaded) { if (visible) renderPenjahitLedger(); return; }
    if (visible) $("#penjahitList").innerHTML = '<p class="empty">Loading penjahit…</p>';
    try {
      const [tailors, jobs] = await Promise.all([db.listPenjahit(), db.listProductionJobs()]);
      if (token !== state.navigation.token) return;
      state.production.penjahit = tailors;
      state.production.jobs = jobs;
      state.production.ledgerLoaded = true;
      $("#penjahitTabCount").textContent = tailors.length || "";
      if (!elements.homePenjahit.hidden) renderPenjahitLedger();
    } catch (err) {
      if (token !== state.navigation.token) return;
      if (!elements.homePenjahit.hidden) {
        $("#penjahitList").innerHTML = '<p class="empty">' + U.escapeHtml(err.message || "Could not load penjahit.") +
          '</p><button type="button" class="btn btn--outline btn--new btn--block btn--empty" id="retryPenjahitLedger">Try again</button>';
      }
      throw err;
    }
  }

  /* A tab is a filter, not a destination. Switching used to go through the
     router, which meant a full route change, four refetched queries and the
     homepage skeleton — for swapping one list with another that was already in
     memory. The hash still moves, so the tab can be linked to and restored;
     replaceState is what stops it being a navigation. */
  function switchLedgerTab(tab) {
    if (state.production.ledgerTab === tab) return;
    const hash = tab === "penjahit" ? "#/customers?tab=penjahit" : "#/customers";
    history.replaceState(null, "", location.pathname + location.search + hash);
    currentHash = hash;
    state.route.query = new URLSearchParams(tab === "penjahit" ? "tab=penjahit" : "");
    syncLedgerTab();
    const penjahit = tab === "penjahit";
    const outgoing = penjahit ? elements.homeCustomers : elements.homePenjahit;
    const incoming = penjahit ? elements.homePenjahit : elements.homeCustomers;
    /* One scroll position for both tabs, so the tabs never move under the
       finger that tapped them. The incoming list holds at least the outgoing
       one's height: a shorter list would let the page end above the current
       scroll, and the browser would clamp it — the jump this exists to stop. */
    const y = window.scrollY;
    incoming.style.minHeight = outgoing.offsetHeight + "px";
    outgoing.hidden = true;
    incoming.hidden = false;
    if (penjahit) loadPenjahitLedger(true).catch(() => {});
    else renderCustomerList();
    window.scrollTo(0, y);
  }

  /* Deliberately the customer ledger's own shape — the same summary rail, grid
     rules, card, and add row at the foot of the list. Two ledgers reached by
     two tabs should not be two designs. */
  function renderPenjahitLedger() {
    const searchVal = elements.customerSearch.value.trim();
    const query = searchVal.toLowerCase();
    /* Archived penjahit are listed, not hidden behind a toggle: last, and
       labelled. A toggle nobody understood was the only way to find them. */
    const tailors = state.production.penjahit
      .filter((tailor) => [tailor.name, tailor.phone].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((a, b) => (!!a.archived_at - !!b.archived_at) || String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
    const ongoing = productionTotals(state.production.jobs).ongoing;
    const active = state.production.penjahit.filter((t) => !t.archived_at).length;

    $("#penjahitSummary").innerHTML = '<span>' + active + ' penjahit</span><i></i><span>' + ongoing + ' ongoing ' + (1 === ongoing ? 'job' : 'jobs') + '</span>';

    const addHref = "#/penjahit/new/edit" + (searchVal ? "?name=" + encodeURIComponent(searchVal) : "");
    const addLabel = searchVal ? '+ Add \u201c' + U.escapeHtml(searchVal) + '\u201d as a new penjahit' : "+ Add a penjahit";
    const addRow = '<a class="btn btn--outline btn--new btn--block btn--empty" href="' + U.escapeHtml(addHref) + '">' + addLabel + '</a>';

    if (!tailors.length) {
      $("#penjahitList").innerHTML = '<p class="empty">' + (state.production.penjahit.length
        ? 'No match for \u201c' + U.escapeHtml(searchVal) + '\u201d.'
        : "No penjahit yet.") + '</p>' + addRow;
      return;
    }

    /* The customer card exactly, span for span: its meta row is laid out by
       span:first-child and span:last-child, and a <strong> in the second slot
       is what left the amount stranded beside its label instead of at the
       right edge. */
    $("#penjahitList").innerHTML = tailors.map((tailor) => {
      const jobs = state.production.jobs.filter((job) => job.penjahit_id === tailor.id);
      const totals = productionTotals(jobs);
      const badge = tailor.archived_at ? "Archived" : totals.ongoing ? totals.ongoing + " ongoing" : jobs.length ? "No work in hand" : "No jobs yet";
      const tone = tailor.archived_at ? "quiet" : totals.ongoing ? "production" : "consultation";
      const money = totals.outstanding > 0 ? { label: "Owed", amount: totals.outstanding }
        : totals.credit > 0 ? { label: "Credit held", amount: totals.credit }
        : { label: jobs.length ? "Settled" : "Nothing owed", amount: 0 };
      const label = tailor.name + ", " + badge + ", " + money.label + " " + U.formatRupiah(money.amount);
      const cardHtml = '<a class="home-customer-card home-customer-card--' + tone + '" href="#/penjahit/' + encodeURIComponent(tailor.id) + '" aria-label="' + U.escapeHtml(label) + '">' +
        '<span class="home-customer-card__face"><span class="home-customer-card__top">' +
        '<span class="home-customer-card__name">' + U.escapeHtml(tailor.name) + '</span>' +
        '<span class="home-customer-card__badge">' + U.escapeHtml(badge) + '</span></span>' +
        '<span class="home-customer-card__meta"><span>' + U.escapeHtml(money.label) + '</span><span>' + U.formatRupiah(money.amount) + '</span></span>' +
        (totals.credit > 0 && totals.outstanding > 0
          ? '<span class="home-customer-card__meta"><span>Credit held</span><span>' + U.formatRupiah(totals.credit) + '</span></span>' : '') +
        '</span><span class="home-customer-card__rail"></span></a>';
      return '<div class="home-customer-record"><div class="home-grid-rule"></div><div class="home-customer-record__inset">' +
        swipeRowHtml(cardHtml, ' data-delete-penjahit="' + U.escapeHtml(tailor.id) + '"', tailor.name) +
        '</div><div class="home-grid-rule"></div><div class="home-grid-spacer" aria-hidden="true"></div></div>';
    }).join("") + addRow;
  }


  /* Jobs are listed the way a customer's orders are: the same record card, the
     same rules and spacers, the name and badge on top and the money on the
     right of the meta row. */
  function setJobFilter(filter) {
    state.production.filters[state.production.profile.id] = filter;
    $$("[data-job-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.jobFilter === filter)));
    renderProductionJobs();
  }

  function renderProductionJobs() {
    const filter = state.production.filters[state.production.profile.id] || "Ongoing";
    const all = state.production.jobs;
    const jobs = all.filter((job) => filter === "All" ||
      (filter === "Ongoing" ? ["Assigned", "In progress"].includes(job.status)
        : filter === "Outstanding" ? productionBalance(job) > 0 : job.status === filter));
    $("#penjahitJobsCount").textContent = all.length + (all.length === 1 ? " job" : " jobs");
    $("#penjahitJobsSum").textContent = U.formatRupiah(productionTotals(all).amount);
    const today = U.todayISO();
    const tones = { Assigned: "assigned", "In progress": "progress", Done: "done", Cancelled: "cancelled" };
    const empty = { Ongoing: "No work in hand right now.", Outstanding: "Nothing owed to this penjahit.", Done: "No finished jobs yet.", Cancelled: "No cancelled jobs.", All: "No jobs yet." }[filter];
    $("#productionJobs").innerHTML = jobs.length ? jobs.map((job) => {
      const balance = productionBalance(job);
      const money = balance > 0 ? U.formatRupiah(balance) + " owed" : balance < 0 ? U.formatRupiah(-balance) + " credit" : "Settled";
      const late = job.due_date && job.due_date < today && ["Assigned", "In progress"].includes(job.status);
      const card = '<a class="cust-order-card cust-order-card--' + tones[job.status] + '" href="#/production/' + encodeURIComponent(job.id) + '" aria-label="' + U.escapeHtml(job.description + ", " + job.status + ", " + money) + '">' +
        '<span class="cust-order-card__face"><span class="cust-order-card__top"><span class="cust-order-card__name">' + U.escapeHtml(job.description) + '</span>' +
        '<span class="cust-order-card__badge">' + U.escapeHtml(job.status) + '</span></span>' +
        '<span class="cust-order-card__meta' + (balance > 0 ? ' cust-order-card__meta--owed' : '') + '"><span>' + U.escapeHtml(job.customer_name + " · " + job.item_name + " ×" + job.quantity) + '</span><span>' + U.escapeHtml(money) + '</span></span>' +
        (job.due_date ? '<span class="cust-order-card__meta ' + (late ? 'cust-order-card__meta--late' : 'cust-order-card__meta--due') + '"><span>' + (late ? "Overdue since " : "Due ") + U.escapeHtml(U.formatLongDate(job.due_date)) + '</span></span>' : '') +
        '</span><span class="cust-order-card__rail" aria-hidden="true"></span></a>';
      return '<div class="cust-grid-spacer" aria-hidden="true"></div><div class="cust-grid-rule"></div><div class="cust-order-record__inset">' + card + '</div><div class="cust-grid-rule"></div>';
    }).join("") + '<div class="cust-grid-spacer" aria-hidden="true"></div>'
      : '<div class="cust-grid-spacer" aria-hidden="true"></div><p class="empty">' + empty + '</p>';
  }


  /* ------------------------- The assignment wizard ----------------------- */

  const productionDraft = () => state.production.draft;

  function productionStepCount() {
    return state.route.view === "productionEdit" ? 1 : 3;
  }

  const PRODUCTION_STEPS = {
    1: { title: "Who is doing the work?" },
    2: { title: "What are they making?" },
    3: { title: "What is the work, and what does it cost?" }
  };

  function showProductionStep(step) {
    const draft = productionDraft();
    const single = productionStepCount() === 1;
    draft.step = single ? 3 : Math.min(3, Math.max(1, step));
    $$("[data-step]", elements.viewProductionEdit).forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== draft.step;
    });
    $("#productionStepper").hidden = single;
    $("#productionKicker").textContent = single ? "Production work" : "Step " + draft.step + " of 3";
    $("#productionTitle").textContent = single ? "Edit this job" : PRODUCTION_STEPS[draft.step].title;
    $$("[data-step-dot]").forEach((dot) => {
      const n = Number(dot.dataset.stepDot);
      dot.classList.toggle("is-current", n === draft.step);
      dot.classList.toggle("is-done", n < draft.step);
    });
    if (draft.step === 1) renderProductionTailors();
    if (draft.step === 2) renderProductionSources();
    if (draft.step === 3) renderProductionDraft();
    syncProductionBar();
    const heading = $("#productionTitle");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }


  /* The bar says where the next tap leads, and what it is carrying. "Continue"
     alone made the reader scroll back up to check whether the taps had
     registered; "Continue · 3 items" answers that where the thumb already is. */
  /* The bar says where the next tap leads, and what it is carrying. "Continue"
     alone made the reader scroll back up to check whether the taps had
     registered; "Continue · 3 items" answers that where the thumb already is. */
  function syncProductionBar() {
    const draft = productionDraft();
    if (!draft) return;
    const single = productionStepCount() === 1;
    const step = draft.step;
    const chosen = draft.jobs.length;
    const text = $("#productionNextText");
    const sub = $("#productionNextSub");

    if (step === 3) {
      text.textContent = state.saving ? "Saving…" : single ? "Save changes" : chosen === 1 ? "Save 1 assignment" : "Save " + chosen + " assignments";
      sub.textContent = state.production.draftTotal ? U.formatRupiah(state.production.draftTotal) : "";
    } else if (step === 2) {
      text.textContent = "Continue";
      sub.textContent = chosen ? chosen + (chosen === 1 ? " item" : " items") + " selected" : "Choose at least one item";
    } else {
      text.textContent = "Continue";
      const tailor = state.production.penjahit.find((t) => t.id === draft.penjahit_id);
      sub.textContent = tailor ? tailor.name : "Choose a penjahit";
    }
    $("#productionNext").disabled = state.saving ||
      (step === 1 && !draft.penjahit_id) || (step === 2 && !chosen);
    $("#productionBackLabel").textContent = single || step === 1 ? "Cancel" : "Back";
    sub.hidden = !sub.textContent;
  }


  const ledgerRecord = (inner) => '<div class="cust-grid-rule" aria-hidden="true"></div><div class="cust-inset">' + inner +
    '</div><div class="cust-grid-rule" aria-hidden="true"></div><div class="cust-grid-spacer" aria-hidden="true"></div>';

  function renderProductionTailors() {
    const draft = productionDraft();
    const query = $("#productionTailorSearch").value.trim().toLowerCase();
    const tailors = state.production.penjahit.filter((tailor) =>
      !tailor.archived_at && [tailor.name, tailor.phone].filter(Boolean).join(" ").toLowerCase().includes(query));
    $("#productionTailorList").innerHTML = tailors.map((tailor) => {
      const totals = productionTotals(state.production.jobs.filter((job) => job.penjahit_id === tailor.id));
      const on = tailor.id === draft.penjahit_id;
      return ledgerRecord('<button type="button" class="pcard' + (on ? ' is-chosen' : '') + '" role="radio" aria-checked="' + on + '" data-tailor="' + U.escapeHtml(tailor.id) + '">' +
        '<span class="pcard__face"><span class="pmark" aria-hidden="true"></span>' +
        '<span class="pcard__body"><strong>' + U.escapeHtml(tailor.name) + '</strong>' +
        '<span>' + U.escapeHtml(tailor.phone || "No phone on file") + '</span></span>' +
        '<span class="pcard__side">' + U.escapeHtml(on ? "Chosen" : totals.ongoing + " ongoing") + '</span></span>' +
        '<span class="pcard__rail" aria-hidden="true"></span></button>');
    }).join("") || '<p class="empty production-list-empty">' + (query ? "No matching penjahit." : "No penjahit yet. Add one to start assigning work.") + '</p>';
  }


  /* Grouped by customer, then order. The flat list this replaces put "Bridal
     skirt" from four different weddings next to each other with the customer
     name buried in a meta line — the one thing you need to tell them apart. */
  /* One card per order, its items as rows inside it, so the customer and the
     order are read once at the top of the card instead of repeated on every
     row. The rail under the card turns green once anything in it is chosen. */
  function renderProductionSources() {
    const draft = productionDraft();
    const query = $("#productionSearch").value.trim().toLowerCase();
    const chosen = new Set(draft.jobs.map((job) => job.item_id));
    let shown = 0;
    const html = state.production.sources.map((order) => {
      const customer = (order.customers && order.customers.name) || "Customer";
      const label = orderLabel(order);
      const context = customer + " · " + label;
      const named = (order.items || []).filter((item) => item.id && item.name && item.qty > 0);
      const items = named.filter((item) => (context + " " + item.name).toLowerCase().includes(query));
      const head = '<div class="psource__head"><strong>' + U.escapeHtml(customer) + '</strong><span>' + U.escapeHtml(label) + '</span></div>';
      if (!items.length) {
        // An order with nothing named in it is still a real answer to a search
        // for that customer: offer the way to give it an item.
        if (named.length || !context.toLowerCase().includes(query)) return "";
        shown++;
        return ledgerRecord('<div class="psource">' + head + '<a class="psource__empty" href="#/order/' + encodeURIComponent(order.id) + '/edit?from=production">No items on this order yet — add one</a></div>' +
          '<span class="pcard__rail" aria-hidden="true"></span>');
      }
      shown += items.length;
      const any = items.some((item) => chosen.has(item.id));
      return ledgerRecord('<div class="psource">' + head +
        items.map((item) => {
          const on = chosen.has(item.id);
          return '<button type="button" class="psource__item' + (on ? ' is-chosen' : '') + '" aria-pressed="' + on + '"' +
            ' data-production-item="' + U.escapeHtml(item.id) + '" data-order-id="' + U.escapeHtml(order.id) + '">' +
            '<span class="pmark pmark--check" aria-hidden="true"></span>' +
            '<span class="pcard__body"><strong>' + U.escapeHtml(item.name) + '</strong>' +
            '<span>' + U.escapeHtml(item.qty + (item.qty === 1 ? " piece" : " pieces")) + '</span></span>' +
            '<span class="pcard__side">' + (on ? "Selected" : "Tap to add") + '</span></button>';
        }).join("") + '</div><span class="pcard__rail' + (any ? ' is-chosen' : '') + '" aria-hidden="true"></span>');
    }).join("");
    $("#productionSourceList").innerHTML = shown ? html
      : '<p class="empty production-list-empty">' + (query ? 'No item matches “' + U.escapeHtml($("#productionSearch").value.trim()) + '”.' : "No saved order items yet.") + '</p>';
  }


  function productionField(label, key, value, type, required, extra) {
    return '<div class="pfield"><label class="custedit-card__label">' + label + (required ? '<span class="custedit-card__req" aria-hidden="true">*</span>' : '') +
      '</label><input class="custedit-input" data-pfield="' + key + '" type="' + (type || "text") + '" value="' + U.escapeHtml(value == null ? "" : value) + '"' +
      ' aria-label="' + U.escapeHtml(label) + '"' + (required ? ' required aria-required="true"' : '') + (extra || '') + '></div>';
  }


  /* A row per item, collapsed to what changes between them — quantity and the
     line total. Description, price and dates come from the shared card above
     and are only spelled out here when this item differs from the rest. */
  /* A card per item, collapsed to what changes between them — quantity and the
     line total. Description, price and deadline come from the shared card and
     are only spelled out here when this item differs from the rest. */
  function renderProductionDraft() {
    const draft = productionDraft();
    const editing = state.route.view === "productionEdit";
    $("#productionShared").hidden = editing;
    elements.productionDraftRows.innerHTML = draft.jobs.map((job) => {
      const custom = !editing && job.custom;
      return '<div class="custedit-field"><div class="cust-grid-rule" aria-hidden="true"></div><div class="cust-inset">' +
        '<div class="custedit-card pjob' + (custom ? ' is-custom' : '') + '" data-job-id="' + U.escapeHtml(job.id) + '">' +
        '<div class="pjob__head"><div><strong class="pjob__name">' + U.escapeHtml(job.item_name) + '</strong>' +
        '<span class="pjob__ctx">' + U.escapeHtml(job.customer_name + " · " + job.order_title) + '</span></div>' +
        (editing ? '' : '<button type="button" class="pjob__drop" data-remove-job="' + U.escapeHtml(job.id) + '" aria-label="Remove ' + U.escapeHtml(job.item_name) + '">Remove</button>') + '</div>' +
        '<div class="pjob__line"><div class="pfield pjob__qty"><label class="custedit-card__label">Qty<span class="custedit-card__req" aria-hidden="true">*</span></label>' +
        '<input class="custedit-input" data-pfield="quantity" type="number" min="1" step="1" max="' + U.escapeHtml(job.max_quantity) + '" inputmode="numeric" required aria-required="true" aria-label="Quantity for ' + U.escapeHtml(job.item_name) + '" value="' + U.escapeHtml(job.quantity) + '"></div>' +
        '<p class="pjob__total" data-job-total></p></div>' +
        '<details class="pjob__more"' + (custom || editing ? ' open' : '') + '><summary>' + (editing ? 'Job details' : custom ? 'Custom for this item' : 'Own work, price or deadline') + '</summary><div class="pfields">' +
        productionField("Work description", "description", job.description, "text", true, ' maxlength="500"') +
        '<div class="ppair">' +
        productionField("Price / piece", "unit_price", job.unit_price === "" ? "" : U.groupDigits(job.unit_price), "text", true, ' inputmode="numeric" placeholder="Rp"') +
        productionField("Deadline", "due_date", job.due_date, "date", false) + '</div>' +
        productionField("Assigned on", "assigned_date", job.assigned_date, "date", true) +
        productionField("Notes", "notes", job.notes, "text", false) +
        (editing ? '<div class="pfield"><label class="custedit-card__label">Progress<span class="custedit-card__req" aria-hidden="true">*</span></label><select class="custedit-input" data-pfield="status" aria-label="Progress" required>' +
          ["Assigned", "In progress", "Done", "Cancelled"].map((status) => '<option' + (job.status === status ? ' selected' : '') + '>' + status + '</option>').join("") + '</select></div>' +
          '<div class="pfields" data-cancellation' + (job.status !== "Cancelled" ? ' hidden' : '') + '><p class="custedit-card__hint">Confirm the final agreed charge. Payments stay recorded; anything paid beyond it becomes credit.</p>' +
          productionField("Final agreed charge", "cancellation_charge", job.cancellation_charge == null ? "" : U.groupDigits(job.cancellation_charge), "text", job.status === "Cancelled", ' inputmode="numeric" placeholder="Rp"') + '</div>' : '') +
        '</div></details></div><div class="custedit-card__rail" aria-hidden="true"></div></div>' +
        '<div class="cust-grid-rule" aria-hidden="true"></div></div><div class="cust-grid-spacer" aria-hidden="true"></div>';
    }).join("") || '<p class="empty production-list-empty">No items selected yet.</p>';
    renderProductionDraftTotals();
  }


  /* Writes the shared card into every row that has not been given its own
     answer. A row becomes its own once its field is edited directly, and stops
     following the card from then on. */
  function applyProductionShared() {
    const draft = productionDraft();
    if (state.route.view === "productionEdit") return;
    draft.shared = { description: $("#psDescription").value, unit_price: $("#psPrice").value, due_date: $("#psDue").value };
    draft.jobs.forEach((job) => {
      if (job.custom) return;
      job.description = draft.shared.description;
      job.unit_price = draft.shared.unit_price;
      job.due_date = draft.shared.due_date;
    });
    $$("[data-job-id]", elements.productionDraftRows).forEach((row) => {
      const job = draft.jobs.find((item) => item.id === row.dataset.jobId);
      if (!job || job.custom) return;
      $('[data-pfield="description"]', row).value = job.description;
      $('[data-pfield="unit_price"]', row).value = job.unit_price;
      $('[data-pfield="due_date"]', row).value = job.due_date;
    });
    renderProductionDraftTotals();
  }

  /* Editing a row's own description, price or deadline is how it stops taking
     them from the shared card. Quantity is not one of those: it differs per
     item by nature and saying so should not detach the row from the card. */
  function markProductionRowCustom(row, field) {
    if (state.route.view === "productionEdit") return;
    if (!field.matches('[data-pfield="description"],[data-pfield="unit_price"],[data-pfield="due_date"]')) return;
    const job = state.production.draft.jobs.find((item) => item.id === row.dataset.jobId);
    if (!job || job.custom) return;
    job.custom = true;
    row.classList.add("is-custom");
  }

  function snapshotProductionDraft() {
    const draft = productionDraft();
    if (!draft || state.production.batchRequest) return;
    $$("[data-job-id]", elements.productionDraftRows).forEach((row) => {
      const job = draft.jobs.find((item) => item.id === row.dataset.jobId);
      if (!job) return;
      $$("[data-pfield]", row).forEach((field) => { job[field.dataset.pfield] = field.value; });
    });
  }

  function renderProductionDraftTotals() {
    const draft = productionDraft();
    let total = 0;
    let priced = 0;
    $$("[data-job-id]", elements.productionDraftRows).forEach((row) => {
      const qty = Number($('[data-pfield="quantity"]', row).value);
      const price = U.parseRupiahInput($('[data-pfield="unit_price"]', row).value);
      const cancel = $('[data-pfield="status"]', row);
      const charge = $('[data-pfield="cancellation_charge"]', row);
      const cancelled = cancel && cancel.value === "Cancelled";
      if (charge) { charge.required = !!cancelled; charge.disabled = !cancelled; $('[data-cancellation]', row).hidden = !cancelled; }
      const amount = cancelled ? U.parseRupiahInput(charge.value) : qty * price;
      const blank = !String((cancelled ? charge : $('[data-pfield="unit_price"]', row)).value).trim();
      const valid = price !== null && Number.isSafeInteger(amount) && amount >= 0;
      /* A blank price is not yet a wrong one. Saying so keeps the row quiet
         until there is something to check, instead of accusing an untouched
         field or, worse, reporting a confident Rp 0. */
      $('[data-job-total]', row).textContent = blank ? (cancelled ? "Enter the final charge" : "Needs a price")
        : valid ? (cancelled ? "Final charge · " : "") + U.formatRupiah(amount) : "Check quantity and price";
      if (valid && !blank) { total += amount; priced++; }
    });
    state.production.draftTotal = total;
    const count = draft ? draft.jobs.length : 0;
    $("#productionDraftTotalsField").hidden = !count;
    $("#productionDraftTotals").innerHTML = count
      ? '<div><dt>' + (count === 1 ? "1 job" : count + " jobs") + '</dt><dd>' + (priced === count ? "All priced" : priced + " of " + count + " priced") + '</dd></div>' +
        '<div class="production-totals__lead"><dt>Total agreed cost</dt><dd>' + U.formatRupiah(total) + '</dd></div>'
      : "";
    syncProductionBar();
  }

  function setProductionBusy(root, busy) {
    root.setAttribute("aria-busy", String(busy));
    root.querySelectorAll("input,select,textarea,button").forEach((field) => {
      if (busy) { if (!field.hasAttribute("data-was-disabled")) field.dataset.wasDisabled = String(field.disabled); field.disabled = true; }
      else if (field.hasAttribute("data-was-disabled")) { field.disabled = field.dataset.wasDisabled === "true"; delete field.dataset.wasDisabled; }
    });
  }

  async function showProductionRoute(route) {
    const token = state.navigation.token;
    /* Reading pages wear the order page's chrome, forms the customer editor's.
       Both hide the generic app bar and bring their own fixed nav. */
    const form = ["penjahitEdit", "productionNew", "productionEdit"].includes(route.view);
    setChrome({ title: "Production", save: false, productionpage: !form, custedit: form, productionedit: form });
    elements.productionBar.hidden = true;
    if (!await productionReady()) throw new Error("Production is not available yet. Please try again later.");
    const tailors = await db.listPenjahit();
    if (token !== state.navigation.token) return;
    state.production.penjahit = tailors;
    if (route.view === "penjahit" || route.view === "penjahitEdit") {
      const isNew = route.id === "new";
      const profile = isNew ? { id: crypto.randomUUID(), name: "", phone: "", notes: "" } : tailors.find((tailor) => tailor.id === route.id);
      if (!profile) throw new Error("This penjahit could not be found.");
      state.production.profile = profile;
      if (route.view === "penjahitEdit") {
        $("#penjahitEditTitle").textContent = isNew ? "New penjahit" : "Edit penjahit";
        $("#penjahitEditCancel").href = route.query.get("from") === "production" ? "#/production/new?resume=1"
          : isNew ? "#/customers?tab=penjahit" : "#/penjahit/" + encodeURIComponent(profile.id);
        // Seeded from the ledger's add row, the way the customer form is: the
        // name was already typed into the search once.
        $("#pName").value = profile.name || (isNew ? route.query.get("name") || "" : "");
        $("#pPhone").value = profile.phone || "";
        $("#pNotes").value = profile.notes || "";
        setPenjahitArchived(!!profile.archived_at);
        $("#pArchiveField").hidden = isNew;
        if ($("#pArchiveField").nextElementSibling) $("#pArchiveField").nextElementSibling.hidden = isNew;
        setSaveBar(true);
        setDirty(false);
        return;
      }
      const jobs = await db.listProductionJobs({ penjahitId: profile.id });
      if (token !== state.navigation.token) return;
      state.production.jobs = jobs;
      const totals = productionTotals(jobs);
      const contact = [profile.phone, profile.archived_at ? "Archived" : ""].filter(Boolean).join(" · ");
      $("#penjahitTitle").textContent = profile.name;
      $("#penjahitContact").textContent = contact + (profile.notes ? (contact ? " — " : "") + profile.notes : "");
      $("#penjahitContact").hidden = !$("#penjahitContact").textContent;
      $("#penjahitEditLink").href = "#/penjahit/" + encodeURIComponent(profile.id) + "/edit";
      $("#penjahitAssignLink").href = "#/production/new?penjahit=" + encodeURIComponent(profile.id);
      $("#penjahitAssignLink").hidden = !!profile.archived_at;
      $("#penjahitOngoing").textContent = totals.ongoing ? totals.ongoing + " ongoing" : "";
      $("#penjahitTotals").innerHTML = productionTotalsHtml(jobs);
      setJobFilter(state.production.filters[profile.id] || "Ongoing");
      return;
    }
    if (route.view === "productionJob") {
      const [jobs, payments] = await Promise.all([db.listProductionJobs({ id: route.id }), db.listProductionPayments(route.id)]);
      if (token !== state.navigation.token) return;
      if (!jobs[0]) throw new Error("This production job could not be found.");
      state.production.job = jobs[0];
      state.production.payments = payments;
      state.production.paymentRequest = null;
      state.production.paymentId = null;
      renderProductionJob();
      setDirty(false);
      return;
    }

    const editing = route.view === "productionEdit";
    const [sources, jobs] = await Promise.all([
      db.listProductionSources(),
      editing ? db.listProductionJobs({ id: route.id }) : db.listProductionJobs()
    ]);
    if (token !== state.navigation.token) return;
    state.production.sources = sources;
    if (editing) {
      if (!jobs[0]) throw new Error("This production job could not be found.");
      const job = jobs[0];
      const order = sources.find((source) => source.id === job.order_id);
      const item = order && order.items.find((source) => source.id === job.item_id);
      state.production.draft = { penjahit_id: job.penjahit_id, step: 3, shared: null,
        jobs: [Object.assign({}, job, { custom: true, max_quantity: Math.max(job.quantity, Number(item && item.qty || 0)) })] };
      state.production.batchRequest = null;
    } else {
      state.production.jobs = jobs;
      if (!route.query.has("resume") || !state.production.draft) {
        // Arriving from a penjahit page answers step 1 on the way in, so the
        // flow opens on the first question that is still unanswered.
        const seeded = route.query.get("penjahit") || "";
        state.production.draft = { penjahit_id: seeded, step: seeded ? 2 : 1, shared: null, jobs: [] };
        state.production.batchRequest = null;
        // A customer made for an abandoned assignment must not still be the one
        // the next "+ New order" writes against.
        state.production.createdCustomerId = null;
      }
    }

    const draft = state.production.draft;
    $("#productionTailorSearch").value = "";
    /* Seeded only when the order is genuinely in the list. orderLabel of a
       missing record answers "Empty order", which as a filter matches nothing
       and would hide every item the reader came back to pick. */
    const seedOrder = route.query.get("order") && sources.find((source) => source.id === route.query.get("order"));
    if (seedOrder) $("#productionSearch").value = orderLabel(seedOrder);
    else if (!route.query.has("resume")) $("#productionSearch").value = "";
    $("#psDescription").value = (draft.shared && draft.shared.description) || "";
    $("#psPrice").value = (draft.shared && draft.shared.unit_price) || "";
    $("#psDue").value = (draft.shared && draft.shared.due_date) || "";

    setSaveBar(false);
    elements.productionBar.hidden = false;
    setProductionBusy(elements.viewProductionEdit, false);
    if (state.production.batchRequest) setProductionBusy(elements.viewProductionEdit, true);
    $("#productionRetryNote").hidden = !state.production.batchRequest;
    // Arriving with a penjahit already chosen skips the question it answers.
    showProductionStep(editing ? 3 : draft.step || 1);
    syncBottomBar();
    setDirty(draft.jobs.length > 0);
  }

  function productionStepBack() {
    const draft = productionDraft();
    if (productionStepCount() === 1 || draft.step === 1) {
      if (state.dirty && !confirmLeave()) return;
      setDirty(false);
      go(state.route.view === "productionEdit" ? "#/production/" + state.route.id
        : draft.penjahit_id ? "#/penjahit/" + draft.penjahit_id : "#/customers?tab=penjahit");
      return;
    }
    snapshotProductionDraft();
    showProductionStep(draft.step - 1);
  }

  async function productionStepNext() {
    const draft = productionDraft();
    if (draft.step === 1) {
      if (!draft.penjahit_id) { showFormError("Choose a penjahit to continue.", elements.viewProductionEdit); return; }
      showFormError("", elements.viewProductionEdit);
      showProductionStep(2);
      return;
    }
    if (draft.step === 2) {
      if (!draft.jobs.length) { showFormError("Choose at least one item to continue.", elements.viewProductionEdit); return; }
      showFormError("", elements.viewProductionEdit);
      showProductionStep(3);
      applyProductionShared();
      return;
    }
    if (state.saving) return;
    state.saving = true;
    syncProductionBar();
    try {
      showFormError("", elements.viewProductionEdit);
      await saveProductionDraft();
    } catch (err) {
      console.error(err);
      showFormError(err.message || "Could not save. Your entries are still here; try again.", elements.viewProductionEdit);
      showToast(err.message || "Could not save");
    } finally {
      state.saving = false;
      syncProductionBar();
    }
  }

  function setPenjahitArchived(archived) {
    $$("[data-archived]", elements.viewPenjahitEdit).forEach((button) => {
      const on = (button.dataset.archived === "true") === archived;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-checked", String(on));
    });
  }

  const penjahitArchivedChoice = () => !!$('[data-archived="true"].is-on', elements.viewPenjahitEdit);

  async function savePenjahitForm() {
    if (!validateFields(elements.viewPenjahitEdit)) return false;
    const record = Object.assign({}, state.production.profile, {
      name: $("#pName").value.trim(), phone: orNull($("#pPhone").value), notes: orNull($("#pNotes").value),
      archived_at: penjahitArchivedChoice() ? state.production.profile.archived_at || new Date().toISOString() : null
    });
    const saved = await db.savePenjahit(record);
    setDirty(false);
    if (state.route.query.get("from") === "production" && state.production.draft) {
      state.production.draft.penjahit_id = saved.id;
      go("#/production/new?resume=1");
    } else go("#/penjahit/" + saved.id);
    return true;
  }

  async function saveProductionDraft() {
    const editing = state.route.view === "productionEdit";
    if (!state.production.batchRequest) {
      snapshotProductionDraft();
      const draft = state.production.draft;
      if (!draft.jobs.length) { showFormError("Choose at least one customer item.", elements.viewProductionEdit); return false; }
      /* A row whose own fields are folded away still has to be checked, and a
         message inside a closed disclosure is a message nobody reads — so any
         row carrying an error is opened before focus is sent to it. */
      let valid = validateFields($('[data-step="3"]', elements.viewProductionEdit));
      $$("[data-job-id]", elements.productionDraftRows).forEach((row) => {
        ["unit_price", "cancellation_charge"].forEach((key) => {
          const field = $('[data-pfield="' + key + '"]', row);
          if (field && !field.disabled && !setFieldError(field, U.parseRupiahInput(field.value) === null ? "Enter a whole rupiah amount, digits only." : "")) valid = false;
        });
        const quantity = Number($('[data-pfield="quantity"]', row).value);
        const price = U.parseRupiahInput($('[data-pfield="unit_price"]', row).value);
        if (!Number.isSafeInteger(quantity * price)) { setFieldError($('[data-pfield="unit_price"]', row), "The job total is too large."); valid = false; }
        const details = $(".pjob__more", row);
        if (details && row.querySelector('[aria-invalid="true"]')) details.open = true;
      });
      if (!valid) { focusInvalid($('[data-step="3"]', elements.viewProductionEdit)); return false; }
      state.production.batchRequest = draft.jobs.map((job) => ({
        id: job.id, penjahit_id: draft.penjahit_id, order_id: job.order_id, item_id: job.item_id,
        description: job.description.trim(), quantity: Number(job.quantity), unit_price: U.parseRupiahInput(job.unit_price),
        assigned_date: job.assigned_date, due_date: job.due_date || null, notes: job.notes || null,
        ...(editing ? { status: job.status, cancellation_charge: job.status === "Cancelled" ? U.parseRupiahInput(job.cancellation_charge) : null } : {})
      }));
    }
    setProductionBusy(elements.viewProductionEdit, true);
    try {
      const request = state.production.batchRequest;
      if (editing) await db.updateProductionJob(request[0]);
      else await db.saveProductionJobs(request);
      const destination = editing ? "#/production/" + request[0].id : "#/penjahit/" + request[0].penjahit_id;
      const count = request.length;
      state.production.batchRequest = null;
      state.production.draft = null;
      setDirty(false);
      showToast(editing ? "Production job saved"
        : count === 1 ? "1 assignment saved" : count + " assignments saved");
      go(destination);
      return true;
    } catch (err) {
      // A database rejection rolls back the transaction. A lost response may
      // have committed, so preserve the exact request for an idempotent retry.
      if (err.code) { state.production.batchRequest = null; setProductionBusy(elements.viewProductionEdit, false); }
      $("#productionRetryNote").hidden = !state.production.batchRequest;
      throw err;
    }
  }

  function renderProductionJob() {
    const job = state.production.job;
    const amounts = U.productionAmounts(job, state.production.payments);
    Object.assign(job, { amount: amounts.amount, paid: amounts.paid, refunded: amounts.refunded });
    const tone = { Assigned: "var(--home-grid)", "In progress": "#e72a90", Done: "#17761a", Cancelled: "var(--home-grid)" }[job.status];
    $("#productionJobTitle").textContent = job.description;
    $("#productionJobContext").textContent = [job.customer_name, job.order_title].filter(Boolean).join(" · ");
    $("#productionJobStatus").textContent = job.status;
    $("#productionJobStatus").style.color = tone || "";
    $("#productionJobBack").href = "#/penjahit/" + encodeURIComponent(job.penjahit_id);
    $("#productionJobBackLabel").textContent = job.penjahit_name || "Penjahit";
    $("#productionJobOrder").href = "#/order/" + encodeURIComponent(job.order_id);
    $("#productionJobEdit").href = "#/production/" + encodeURIComponent(job.id) + "/edit";
    const late = job.due_date && job.due_date < U.todayISO() && ["Assigned", "In progress"].includes(job.status);
    $("#productionJobFacts").innerHTML = [
      ["Penjahit", U.escapeHtml(job.penjahit_name || "—")],
      ["Item", U.escapeHtml(job.item_name)],
      ["Quantity", U.escapeHtml(job.quantity + " × " + U.formatRupiah(job.unit_price))],
      ["Assigned", U.escapeHtml(U.formatLongDate(job.assigned_date))],
      ["Deadline", job.due_date ? U.escapeHtml(U.formatLongDate(job.due_date)) + (late ? " · overdue" : "") : "None set"],
      job.notes ? ["Notes", U.escapeHtml(job.notes)] : null
    ].filter(Boolean).map(([label, value]) => '<div' + (label === "Deadline" && late ? ' class="production-totals__owed"' : '') + '><dt>' + label + '</dt><dd>' + value + '</dd></div>').join("");
    $("#productionJobTotals").innerHTML = productionTotalsHtml([job]);
    $("#productionPaymentHistory").innerHTML = state.production.payments.map((entry) =>
      '<article class="ppay' + (entry.voided_at ? ' is-voided' : '') + '"><div class="ppay__top"><span>' + (entry.kind === "refund" ? "Refund" : "Payment") + '</span><span>' + U.formatRupiah(entry.amount) + '</span></div>' +
      '<p>' + U.escapeHtml(U.formatLongDate(entry.payment_date)) + (entry.notes ? ' · ' + U.escapeHtml(entry.notes) : '') + '</p>' +
      (entry.voided_at ? '<p>Voided · ' + U.escapeHtml(entry.void_reason) + '</p>' : '<button type="button" class="ppay__fix" data-correct-payment="' + U.escapeHtml(entry.id) + '">Correct this entry</button>') + '</article>').join("") ||
      '<p class="production-empty">No payments recorded yet.</p>';
  }


  function openProductionPayment(entryId) {
    const entry = state.production.payments.find((payment) => payment.id === entryId);
    state.production.voidId = entry ? entry.id : null;
    state.production.paymentId = crypto.randomUUID();
    state.production.paymentRequest = null;
    const form = elements.productionPaymentForm;
    form.reset();
    setProductionBusy(form, false);
    $$("[aria-invalid]", form).forEach((field) => setFieldError(field, ""));
    showFormError("", form);
    $("#productionPaymentTitle").textContent = entry ? "Correct entry" : "Record payment or refund";
    $("#ppKind").value = entry ? entry.kind : "payment";
    $('#ppKind option[value="void"]').hidden = !entry;
    $("#ppAmount").value = entry ? U.groupDigits(entry.amount) : "";
    $("#ppDate").value = entry ? entry.payment_date : U.todayISO();
    $("#ppNotes").value = entry && entry.notes || "";
    $("#ppReasonField").hidden = !entry;
    $("#ppReason").required = !!entry;
    form.hidden = false;
    syncProductionPaymentKind();
    $("#productionPaymentNew").hidden = true;
    form.scrollIntoView({ block: "nearest" });
    $("#productionPaymentTitle").tabIndex = -1;
    $("#productionPaymentTitle").focus({ preventScroll: true });
  }

  function syncProductionPaymentKind() {
    const voidOnly = $("#ppKind").value === "void";
    ["Amount", "Date"].forEach((name) => {
      $("#pp" + name + "Field").hidden = voidOnly;
      $("#pp" + name).disabled = voidOnly;
      $("#pp" + name).required = !voidOnly;
    });
  }

  async function saveProductionPayment(event) {
    event.preventDefault();
    if (state.saving) return;
    const form = elements.productionPaymentForm;
    if (!state.production.paymentRequest) {
      if (!validateFields(form)) return;
      const kind = $("#ppKind").value;
      const amount = U.parseRupiahInput($("#ppAmount").value);
      if (kind !== "void" && (amount === null || amount <= 0)) {
        setFieldError($("#ppAmount"), "Enter a whole rupiah amount greater than zero.");
        focusInvalid(form); return;
      }
      state.production.paymentRequest = {
        id: state.production.paymentId, job_id: state.production.job.id, kind,
        amount: kind === "void" ? null : amount, payment_date: kind === "void" ? null : $("#ppDate").value,
        notes: orNull($("#ppNotes").value), void_entry_id: state.production.voidId,
        void_reason: state.production.voidId ? $("#ppReason").value.trim() : null
      };
    }
    state.saving = true;
    setProductionBusy(form, true);
    showFormError("", form);
    $("#productionPaymentSave").textContent = "Recording…";
    try {
      const payments = await db.recordProductionPayment(state.production.paymentRequest);
      state.production.payments = payments;
      state.production.paymentRequest = null;
      renderProductionJob();
      form.hidden = true;
      $("#productionPaymentNew").hidden = false;
      setDirty(false);
      showToast("Entry recorded");
      $("#productionPaymentNew").focus({ preventScroll: true });
    } catch (err) {
      if (err.code) state.production.paymentRequest = null;
      showFormError((err.message || "Could not confirm this entry.") + (state.production.paymentRequest ? " Retry this entry to confirm it safely." : ""), form);
    } finally {
      state.saving = false;
      setProductionBusy(form, false);
      /* An unconfirmed entry must be retried exactly as it was sent, so the
         fields stay locked — but Cancel does not, or the only way out of an
         unanswered save would be to leave the page. */
      if (state.production.paymentRequest) {
        setProductionBusy(form, true);
        $("#productionPaymentSave").disabled = false;
        $("#productionPaymentCancel").disabled = false;
      }
      $("#productionPaymentSave").textContent = state.production.paymentRequest ? "Retry entry" : "Record entry";
    }
  }

  async function renderOrderProduction(orderId) {
    const token = state.navigation.token;
    const root = $("#orderProductionJobs");
    $("#orderProductionCosts").textContent = "";
    root.textContent = "Loading production work…";
    $("#orderProductionAssign").href = "#/production/new?order=" + encodeURIComponent(orderId);
    try {
      if (!await productionReady() || token !== state.navigation.token) return;
      const jobs = await db.listProductionJobs({ orderId });
      if (token !== state.navigation.token) return;
      root.innerHTML = jobs.map(productionJobHtml).join("") || '<p class="empty">No penjahit work assigned yet.</p>';
      /* The estimate the item was quoted at, and what the penjahit work on it
         actually costs, on two aligned lines. Neither is derived from the
         other: the estimate is a promise already made to the customer and is
         never rewritten by what a penjahit agreed to later. */
      $("#orderProductionCosts").innerHTML = (state.order.items || []).map((item) => {
        const linked = jobs.filter((job) => job.item_id === item.id);
        const estimate = Number(item.cost || 0) * Number(item.qty || 0);
        const actual = productionTotals(linked).amount;
        const over = actual > estimate && estimate > 0;
        return '<div class="production-cost"><strong>' + U.escapeHtml(item.name) + '</strong>' +
          '<span><span>Estimated cost</span><span>' + U.formatRupiah(estimate) + '</span></span>' +
          '<span><span>Assigned to penjahit</span><span>' + U.formatRupiah(actual) + '</span></span>' +
          (over ? '<span class="production-cost__over"><span>Over the estimate by</span><span>' + U.formatRupiah(actual - estimate) + '</span></span>'
                : linked.length ? '' : '<span class="production-cost__none">No penjahit work assigned to this item</span>') +
          '</div>';
      }).join("");
    } catch (err) {
      if (token === state.navigation.token) root.innerHTML = '<p class="form-error">' + U.escapeHtml(err.message || "Could not load production work.") + '</p><button type="button" class="btn btn--outline" id="retryOrderProduction">Try again</button>';
    }
  }

  function bindProductionEvents() {
    $("#homeLedgerTabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-ledger-tab]");
      if (!tab || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
      event.preventDefault();
      switchLedgerTab(tab.dataset.ledgerTab);
    });
    $("#penjahitList").addEventListener("click", (event) => {
      if (!event.target.closest("#retryPenjahitLedger")) return;
      state.production.ledgerLoaded = false;
      loadPenjahitLedger(true).catch(() => {});
    });
    $("#viewPenjahit .production-filter").addEventListener("click", (event) => {
      const button = event.target.closest("[data-job-filter]");
      if (button) setJobFilter(button.dataset.jobFilter);
    });
    $("#penjahitDeleteBtn").addEventListener("click", () => {
      if (state.production.profile) deletePenjahitById(state.production.profile.id, true);
    });
    elements.viewPenjahitEdit.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-archived]");
      if (!choice) return;
      setPenjahitArchived(choice.dataset.archived === "true");
      setDirty(true);
    });
    /* Press feedback on the production pages, the way the order and customer
       pages give it: the rail moves into the face while the finger is down. */
    const PRESSABLE = ".order-nav-btn,.order-action,.cust-nav-btn,.cust-order-card,.custedit-danger__btn,.custedit-segmented__btn,.pcard";
    [elements.viewPenjahit, elements.viewPenjahitEdit, elements.viewProductionEdit, elements.viewProductionJob].forEach((view) => {
      view.addEventListener("pointerdown", (event) => {
        const target = event.target.closest(PRESSABLE);
        if (target && !target.disabled) target.classList.add("is-pressed");
      });
    });
    ["pointerup", "pointercancel", "blur"].forEach((type) => window.addEventListener(type, () => {
      $$(".production .is-pressed, .production-form .is-pressed").forEach((el) => el.classList.remove("is-pressed"));
    }));
    $("#productionSearch").addEventListener("input", renderProductionSources);
    $("#productionTailorSearch").addEventListener("input", renderProductionTailors);
    $("#productionBack").addEventListener("click", productionStepBack);
    $("#productionNext").addEventListener("click", productionStepNext);
    elements.viewPenjahitEdit.addEventListener("input", () => setDirty(true));

    // The shared card and the rows write to the same jobs, so the shared card
    // is handled first and separately: a row edit makes that row its own and
    // must not then be overwritten by the card it has stopped following.
    $("#productionShared").addEventListener("input", applyProductionShared);
    $("#productionShared").addEventListener("change", applyProductionShared);
    $("#psPrice").addEventListener("input", () => U.reformatPriceField($("#psPrice")));

    elements.productionDraftRows.addEventListener("input", (event) => {
      const row = event.target.closest("[data-job-id]");
      if (!row) return;
      if (event.target.matches('[data-pfield="unit_price"],[data-pfield="cancellation_charge"]')) U.reformatPriceField(event.target);
      markProductionRowCustom(row, event.target);
      snapshotProductionDraft(); renderProductionDraftTotals(); setDirty(true);
    });
    elements.productionDraftRows.addEventListener("change", (event) => {
      const row = event.target.closest("[data-job-id]");
      if (!row) return;
      markProductionRowCustom(row, event.target);
      snapshotProductionDraft(); renderProductionDraftTotals(); setDirty(true);
    });

    elements.viewProductionEdit.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-tailor]");
      const add = event.target.closest("[data-production-item]");
      const remove = event.target.closest("[data-remove-job]");
      if (state.production.batchRequest || (!pick && !add && !remove)) return;
      const draft = state.production.draft;
      if (pick) {
        draft.penjahit_id = pick.dataset.tailor;
        renderProductionTailors();
        syncProductionBar();
        // Chosen is chosen: the step has one question and it has been answered,
        // so advancing is the next thing the reader wanted anyway.
        showProductionStep(2);
        return;
      }
      snapshotProductionDraft();
      if (add) {
        const existing = draft.jobs.find((job) => job.item_id === add.dataset.productionItem);
        if (existing) {
          draft.jobs = draft.jobs.filter((job) => job !== existing);
        } else {
          const order = state.production.sources.find((source) => source.id === add.dataset.orderId);
          const item = order.items.find((source) => source.id === add.dataset.productionItem);
          const shared = draft.shared || {};
          draft.jobs.push({ id: crypto.randomUUID(), order_id: order.id, item_id: item.id, item_name: item.name,
            customer_name: (order.customers && order.customers.name) || "Customer", order_title: orderLabel(order),
            description: shared.description || "", quantity: item.qty, max_quantity: item.qty,
            unit_price: shared.unit_price || "", assigned_date: U.todayISO(), due_date: shared.due_date || "", notes: "", custom: false });
        }
        renderProductionSources();
        syncProductionBar();
        setDirty(draft.jobs.length > 0);
        return;
      }
      draft.jobs = draft.jobs.filter((job) => job.id !== remove.dataset.removeJob);
      renderProductionDraft();
      setDirty(draft.jobs.length > 0);
    });
    elements.viewProductionEdit.addEventListener("click", (event) => {
      if (event.target.closest('a[href*="from=production"]')) { snapshotProductionDraft(); setDirty(false); }
    });
    $("#productionAddOrder").addEventListener("click", () => {
      snapshotProductionDraft();
      if (state.production.createdCustomerId) {
        const customerId = state.production.createdCustomerId;
        state.production.createdCustomerId = null;
        setDirty(false);
        go("#/customer/" + customerId + "/order/new/edit?from=production");
      } else { state.production.creatingOrder = true; openDocumentPicker("neworder"); }
    });
    elements.productionPaymentForm.addEventListener("submit", saveProductionPayment);
    elements.productionPaymentForm.addEventListener("input", () => setDirty(true));
    $("#ppKind").addEventListener("change", syncProductionPaymentKind);
    $("#productionPaymentNew").addEventListener("click", () => openProductionPayment(null));
    $("#productionPaymentHistory").addEventListener("click", (event) => {
      const button = event.target.closest("[data-correct-payment]");
      if (button && !state.production.paymentRequest) openProductionPayment(button.dataset.correctPayment);
    });
    $("#productionPaymentCancel").addEventListener("click", () => {
      if ((state.dirty || state.production.paymentRequest) && !confirmLeave()) return;
      const form = elements.productionPaymentForm;
      state.production.paymentRequest = null;
      setProductionBusy(form, false);
      showFormError("", form);
      $("#productionPaymentSave").textContent = "Record entry";
      form.hidden = true;
      $("#productionPaymentNew").hidden = false;
      setDirty(false);
      $("#productionPaymentNew").focus({ preventScroll: true });
    });
    $("#orderProductionJobs").addEventListener("click", (event) => {
      if (event.target.closest("#retryOrderProduction")) renderOrderProduction(state.order.id);
    });
  }

  /* ---------------- Customer Detail & Edit Controller --------------- */

  async function showCustomerDetail(customerId) {
    if ("new" === customerId) {
      const hashVal = String(location.hash || "");
      const qIdx = hashVal.indexOf("?");
      return go("#/customer/new/edit" + (-1 === qIdx ? "" : hashVal.slice(qIdx)));
    }
    setChrome({ title: "Customer", up: { label: "Customers", hash: "#/customers" }, save: false, destroy: "customer", custpage: true });
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
    const backHash = queryParams && queryParams.get("from") === "production" ? "#/production/new?resume=1" : isNew ? "#/customers" : "#/customer/" + encodeURIComponent(customerId);

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

      // focus-scroll-ok: first field of a form the user just navigated to, page is at the top
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
    const bannerSeed = "?q=" + encodeURIComponent(fittingName) +
      "&from=customer&customerId=" + encodeURIComponent(customerRecord.id || "");
    elements.custFittingBanner.href = "#/fittings" + bannerSeed;
    elements.custFittingBanner.setAttribute("aria-label", "Fitting logs for " + (fittingName || "this customer"));

    // The document feeds honour the identical seed contract, so all three
    // banners scope the same way and drop the scope the same way when edited.
    elements.custQuotationBanner.href = "#/quotations" + bannerSeed;
    elements.custQuotationBanner.setAttribute("aria-label", "Quotations for " + (fittingName || "this customer"));
    elements.custInvoiceBanner.href = "#/invoices" + bannerSeed;
    elements.custInvoiceBanner.setAttribute("aria-label", "Invoices for " + (fittingName || "this customer"));

    elements.custWeddingText.textContent = customerRecord.wedding_date
      ? (isApproximateWedding(customerRecord) ? weddingText(customerRecord) : U.formatShortDate(customerRecord.wedding_date)) + " (" + relativeToToday(customerRecord.wedding_date) + ")"
      : "Not set";

    const nextEvt = custNextEvent(customerRecord, orders);
    elements.custNextLabel.textContent = nextEvt ? "Next: " + nextEvt.what : "Next event";
    elements.custNextDate.textContent = nextEvt ? U.formatShortDate(nextEvt.date) + " (" + relativeToToday(nextEvt.date) + ")" : "Nothing scheduled";
    /* The label repeats what the two lines say, because a screen reader meets
       the title and the value as separate strings and the sentence only exists
       when they are read together. */
    elements.custNextBanner.setAttribute("aria-label", nextEvt
      ? "Next event: " + nextEvt.what + " on " + U.formatShortDate(nextEvt.date) + ", " + relativeToToday(nextEvt.date)
      : "Next event: nothing scheduled");
    elements.custOrdersCount.textContent = orders.length + " order" + (1 === orders.length ? "" : "s");
    elements.custOrdersSum.textContent = U.formatRupiah(orders.reduce((sum, o) => sum + docs.computeTotal(o.items), 0));

    /* The order list always ends with the way to add one, exactly as
       renderCustomerList ends the ledger. It never had one: a customer with no
       orders read "No orders for this customer yet." and offered nothing, and
       the only route to the order editor was the homepage Add order tile. */
    const addOrderRow = '<a class="btn btn--outline btn--new btn--block btn--empty" href="' +
      U.escapeHtml("#/customer/" + encodeURIComponent(customerRecord.id) + "/order/new/edit") +
      '">+ Add an order</a>';

    elements.custOrderList.innerHTML = orders.length
      ? orders.map((o) => {
          const st = custOrderStatus(o);
          const itemLen = (o.items || []).length;
          const cardHtml = '<a class="cust-order-card cust-order-card--' + st.tone + '" href="#/order/' + encodeURIComponent(o.id) + '" aria-label="' + U.escapeHtml(orderLabel(o) + ", " + st.label) + '"><span class="cust-order-card__face"><span class="cust-order-card__top"><span class="cust-order-card__name">' + U.escapeHtml(orderLabel(o)) + '</span><span class="cust-order-card__badge">' + U.escapeHtml(st.label) + '</span></span><span class="cust-order-card__meta"><span>' + itemLen + " item" + (1 === itemLen ? "" : "s") + '</span><span>' + U.formatRupiah(docs.computeTotal(o.items)) + '</span></span></span><span class="cust-order-card__rail" aria-hidden="true"></span></a>';

          return '<div class="cust-grid-spacer" aria-hidden="true"></div><div class="cust-grid-rule"></div><div class="cust-order-record__inset">' +
            swipeRowHtml(cardHtml, ' data-delete-order="' + U.escapeHtml(o.id) + '"', orderLabel(o)) +
            '</div><div class="cust-grid-rule"></div>';
        }).join('') + '<div class="cust-grid-spacer" aria-hidden="true"></div>' + addOrderRow
      : '<div class="cust-grid-spacer" aria-hidden="true"></div><p class="empty">No orders for this customer yet.</p>' + addOrderRow;
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

    if (!validateFields(elements.viewCustomerEdit)) return false;

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
      if (state.route.query.get("from") === "production" && state.production.draft) {
        state.production.createdCustomerId = state.customer.id;
        go("#/production/new?resume=1");
      } else leaveFormFor("#/customer/" + state.customer.id);
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

  /* One rule, two surfaces: the order page's download keys and the document
     picker's order rows must never disagree about whether an order can produce
     a PDF, so both read this rather than restating the condition. */
  function documentReadiness(orderRecord, customerRecord) {
    const items = orderRecord.items || [];
    const validItems = items.filter(isNamed);
    const totalAmount = docs.computeTotal(items);
    const docName = String(orderRecord.doc_name || (customerRecord && customerRecord.name) || "").trim();
    const priced = validItems.length > 0 && totalAmount > 0;

    return {
      canDownload: priced && "" !== docName,
      disabledReason: priced
        ? ("" !== docName ? "" : "Add the name for documents to enable downloads.")
        : "Add a priced item to enable downloads."
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
      documents: documentReadiness(ord, cust),
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
    renderOrderProduction(vm.order.id);

    elements.orderReady.hidden = false;
    elements.orderReady.classList.add("is-measuring");
  }

  async function revealOrder(token) {
    await nextPaint();
    if (!isCurrentOrderLoad(token, state.orderDetail.orderId)) return;

    elements.orderStage.style.height = Math.ceil(elements.orderReady.getBoundingClientRect().height || elements.orderReady.scrollHeight) + "px";
    elements.orderReady.classList.remove("is-measuring");
    elements.orderReady.classList.add("is-transitioning");
    elements.orderLoading.classList.add("is-transitioning");

    nextPaint().then(() => {
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

    /* Two rounds, not four. The order arrives with its customer embedded, and
       everything that hangs off the order id goes out together instead of
       history waiting behind the customer for no reason. Each landing part
       advances the global progress bar, so this page reports real progress
       rather than an indefinite shimmer. */
    const ORDER_LOAD_PARTS = 5;
    let ordRec, custRec;
    try {
      const rec = splitOrder(await db.getOrder(orderId));
      if (!isCurrentOrderLoad(token, orderId)) return;
      KK.progress.step(1, ORDER_LOAD_PARTS);
      ordRec = rec.order;
      custRec = rec.customer || await db.getCustomer(ordRec.customer_id);
    } catch (err) {
      if (db.isStaleToken(err)) throw err;
      return renderOrderError(err, token, orderId, ordRec && ordRec.customer_id);
    }

    if (!isCurrentOrderLoad(token, orderId)) return;
    KK.progress.step(2, ORDER_LOAD_PARTS);
    state.order = ordRec;
    state.customer = custRec;

    let historyList = null;
    let historyErr = false;

    let eventsList = [];
    let sessionsList = [];
    let photosList = [];
    let landed = 2;
    const countPart = (promise) => promise.then(
      (value) => { KK.progress.step(++landed, ORDER_LOAD_PARTS); return value; },
      (err) => { KK.progress.step(++landed, ORDER_LOAD_PARTS); throw err; }
    );

    const [historyPart, ...fittingParts] = await Promise.allSettled([
      countPart(db.listOrderHistory(orderId)),
      countPart(db.listOrderEvents(orderId)),
      countPart(db.listFittingSessions(orderId)),
      countPart(db.listFittingPhotos(orderId))
    ]);

    if ("fulfilled" === historyPart.status) {
      historyList = historyPart.value;
    } else {
      if (db.isStaleToken(historyPart.reason)) throw historyPart.reason;
      console.error(historyPart.reason);
      historyErr = true;
    }
    if (!isCurrentOrderLoad(token, orderId)) return;

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
    if (!validateOrderItems() || !validateFields(elements.viewOrderEdit)) return false;
    if (!validateTerms()) return false;

    const itemsPayload = readItems().filter(isNamed).map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      price: it.price,
      cost: it.cost
    }));

    const schemeVal = "other" === elements.oScheme.value ? "other" : "standard";

    const payload = {
      title: orNull(elements.oTitle.value),
      doc_name: orNull(elements.oDocName.value),
      items: itemsPayload,
      includes: checkedIncludes(),
      payment_scheme: schemeVal,
      payment_terms: "other" === schemeVal ? readTerms() : [],
      first_payment_date: orNull(elements.oFirstPayment.value),
      second_payment_date: orNull(elements.oSecondPayment.value),
      final_payment_date: orNull(elements.oFinalPayment.value)
    };

    /* Only the write differs. Everything after this point — the history entry,
       the schedule rebuild that syncs Google Calendar — has to run for a new
       order exactly as it does for an edited one, which is why creating one
       goes through here rather than calling db.createOrder from the picker. */
    const isNew = !state.order.id;

    state.order = isNew
      ? await db.createOrder(Object.assign({ customer_id: state.customer.id }, payload))
      : await db.updateOrder(state.order.id, payload);

    setDirty(false);

    try {
      await db.logOrderHistory(state.order.id, isNew ? "created" : "updated", {});
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
    termRowElements().forEach((row) => {
      const label = $(".js-tlabel", row);
      const share = $(".js-tpct", row);
      const number = Number(share.value.replace(",", "."));
      setFieldError(label, !label.value.trim() ? "Name this payment term." : "");
      setFieldError(share, !/^\d+([.,]\d{1,2})?$/.test(share.value) || number <= 0 || number > 100 ? "Enter a share above 0%, up to 100%." : "");
    });
    if (!focusInvalid(elements.termsCard)) return false;
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
      el.dataset.itemId = it.id || crypto.randomUUID();
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
    if (focusNew) $(".js-name", rowEl).focus({ preventScroll: true });
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
      id: r.dataset.itemId,
      name: $(".js-name", r).value.trim(),
      qtyRaw: U.digitsOnly($(".js-qty", r).value),
      priceRaw: U.digitsOnly($(".js-price", r).value),
      costRaw: U.digitsOnly($(".js-cost", r).value),
      get qty() { return "" === this.qtyRaw ? 0 : Number(this.qtyRaw); },
      get price() { return "" === this.priceRaw ? 0 : Number(this.priceRaw); },
      get cost() { return "" === this.costRaw ? 0 : Number(this.costRaw); }
    }));
  }

  function validateOrderItems(focus) {
    rowElements().forEach((row) => {
      const name = $(".js-name", row);
      const qty = $(".js-qty", row);
      const price = $(".js-price", row);
      const cost = $(".js-cost", row);
      const started = !!(name.value.trim() || price.value.trim() || cost.value.trim() || !["", "1"].includes(qty.value));
      setFieldError(name, started && !name.value.trim() ? "Describe this item, or remove the unfinished row." : "");
      setFieldError(qty, started && (!/^\d+$/.test(qty.value) || Number(qty.value) < 1 || !Number.isSafeInteger(Number(qty.value))) ? "Enter a whole quantity of at least 1." : "");
      [price, cost].forEach((field) => {
        const value = U.parseRupiahInput(field.value);
        setFieldError(field, value === null ? "Enter a whole rupiah amount, digits only." : "");
      });
    });
    return false === focus ? !elements.itemList.querySelector('[aria-invalid="true"]') : focusInvalid(elements.itemList);
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
    elements.customInclude.focus({ preventScroll: true });
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
    if (focusNew) $(".js-tlabel", termEl).focus({ preventScroll: true });
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
    elements.errTerms.setAttribute("role", "alert");
    setFieldError($(".js-tpct", elements.termList), msg);
    focusInvalid(elements.termsCard);
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
    if (focusNew) $(".js-clabel", calcEl).focus({ preventScroll: true });
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
      activeCalcFocusTarget.focus({ preventScroll: true });
    }
    activeCalcFocusTarget = null;
  }

  function applyCostCalc() {
    let valid = true;
    calcRowElements().forEach((row) => {
      const label = $(".js-clabel", row);
      const amount = $(".js-camount", row);
      const parsed = U.parseRupiahInput(amount.value);
      if (!setFieldError(label, parsed > 0 && !label.value.trim() ? "Name this cost category." : "")) valid = false;
      if (!setFieldError(amount, parsed === null ? "Enter a valid whole rupiah amount." : "")) valid = false;
    });
    if (!valid) return focusInvalid(elements.calcSheet);
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
      showFormError("Could not prepare those photos — " + (err.message || "please try again"), elements.viewMoodboard);
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
      elements.mbOverlayClose.focus({ preventScroll: true });
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
      activeMoodboardFocusTarget.focus({ preventScroll: true });
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
      showFormError(err.message || "Could not log payment", elements.viewOrder);
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
    bindProductionEvents();
    if (window.ResizeObserver) {
      const barObserver = new ResizeObserver(syncBottomBar);
      [elements.savebar, elements.productionBar, elements.fitdetBar, elements.fitaddBar, elements.schedcalMonthbar].forEach((bar) => barObserver.observe(bar));
    }
    /* Only the skeleton and the closed menu can see this: every real entry
       point lives inside #homeReady, which stays hidden until the probe has
       answered. So the guess buys the skeleton the right shape and never shows
       a tile it has to take back. */
    applyProductionEntries(productionReadyGuess());

    /* A field that is already showing an error revalidates as it is corrected,
       so the message clears on the keystroke that fixes it rather than on the
       next save. Revalidating never moves focus — the reader is mid-word in the
       field being corrected, and only a submit may take them elsewhere. */
    document.addEventListener("input", (event) => {
      const field = event.target;
      if (!field.matches("input,textarea,select") || field.getAttribute("aria-invalid") !== "true") return;
      if (field.closest("#itemList")) validateOrderItems(false);
      else setFieldError(field, fieldValidityMessage(field));
    });
    window.addEventListener("hashchange", handleRoute);
    bindPrefetch();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.route && "customers" === state.route.view) {
        syncHomepageAtmosphere({ instant: false });
      }
    });

    /* ------------------------ Schedules calendar ------------------------- */

    elements.schedcalPrev.addEventListener("click", () => shiftScheduleMonth(-1));
    elements.schedcalNext.addEventListener("click", () => shiftScheduleMonth(1));
    elements.schedcalTodayBtn.addEventListener("click", () => {
      const today = U.todayISO();
      goToMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, today);
    });

    elements.schedcalGrid.addEventListener("click", (e) => {
      const cell = e.target.closest(".schedcal-day");
      if (!cell || cell.classList.contains("schedcal-day--skel")) return;
      const iso = cell.dataset.date;
      const targetYear = Number(iso.slice(0, 4));
      const targetMonth = Number(iso.slice(5, 7)) - 1;
      if (targetYear !== sched().cursor.year || targetMonth !== sched().cursor.month) {
        goToMonth(targetYear, targetMonth, iso);
      }
      focusScheduleCell(iso);
      openScheduleDay(iso, scheduleCellFor(iso) || cell);
    });
    elements.schedcalGrid.addEventListener("keydown", handleSchedulesGridKey);
    /* Arrow keys step from state.focusedDate, so anything that moves focus
       without going through focusScheduleCell would step from the wrong day.
       Syncing here means the state cannot disagree with what is actually
       focused, however focus got there. */
    elements.schedcalGrid.addEventListener("focusin", (e) => {
      const cell = e.target.closest(".schedcal-day");
      if (cell && cell.dataset.date) focusScheduleCell(cell.dataset.date);
    });

    elements.schedcalState.addEventListener("click", (e) => {
      if (e.target.closest(".js-schedcal-retry")) showSchedules(state.route && state.route.query);
    });

    elements.schedcalSheetClose.addEventListener("click", closeScheduleDay);
    elements.schedcalSheetBackdrop.addEventListener("click", closeScheduleDay);
    // Following a row is a real navigation, so the sheet must not be left open
    // behind the page it opened.
    elements.schedcalSheetList.addEventListener("click", (e) => {
      if (e.target.closest(".schedcal-sheet__link")) closeScheduleDay();
    });
    elements.schedcalSheet.addEventListener("keydown", (e) => {
      if ("Escape" === e.key) {
        e.preventDefault();
        closeScheduleDay();
        return;
      }
      trapModalFocus(e, elements.schedcalSheet);
    });

    elements.pageAction.addEventListener("click", () => {
      if (pageActionHandler) pageActionHandler();
    });

    elements.saveBtn.addEventListener("click", async () => {
      if (state.saving) return;
      state.saving = true;
      setDirty(state.dirty);
      try {
        showFormError("");
        if ("penjahitEdit" === state.route.view) {
          await savePenjahitForm();
        } else if ("customerEdit" === state.route.view) {
          await saveCustomer();
        } else if ("orderEdit" === state.route.view) {
          const wasNew = !state.order.id;
          if (!await saveOrder()) return;
          // Read after the save, never before: a new order has no id until the
          // insert comes back, and saveOrder replaces state.order with the row.
          showToast(wasNew ? "Order created" : "Order saved");
          if (state.route.query.get("from") === "production" && state.production.draft) {
            go("#/production/new?resume=1&order=" + state.order.id);
          } else leaveFormFor("#/order/" + state.order.id);
        }
      } catch (err) {
        console.error(err);
        showFormError(err.message || "Could not save. Your changes are still here; try again.");
        showToast(err.message || "Could not save");
      } finally {
        state.saving = false;
        setDirty(state.dirty);
      }
    });

    /* One flag, applied once. The class is what the stylesheet reads to decide
       whether the second row holds one tile or two, so both have to move
       together — hence here rather than in the markup. */
    elements.homeFittingBtn.hidden = !SHOW_FITTING_SHORTCUT;
    document.body.classList.toggle("has-fitting-shortcut", SHOW_FITTING_SHORTCUT);

    // The two shortcuts with no page behind them: a moodboard is only ever made
    // for an order, and an order is only ever made for a customer, so in both
    // cases the picker is the whole entry point.
    elements.homeMoodboardBtn.addEventListener("click", () => openDocumentPicker("moodboard"));
    elements.homeAddOrderBtn.addEventListener("click", () => openDocumentPicker("neworder"));
    elements.homeFittingBtn.addEventListener("click", (event) => {
      event.preventDefault();
      openDocumentPicker("fitting");
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
      elements.menuBtn.focus({ preventScroll: true });
    });

    elements.menuSignOut.addEventListener("click", signOutFromMenu);
    elements.menuDelete.addEventListener("click", () => {
      closeMenu();
      if ("order" === elements.menuDelete.dataset.kind) deleteOrderRecord();
      else deleteCustomerRecord();
    });

    elements.deleteCustomer.addEventListener("click", deleteCustomerRecord);
    elements.custDeleteBtn.addEventListener("click", deleteCustomerRecord);
    elements.orderDeleteBtn.addEventListener("click", deleteOrderRecord);

    /* The revealed buttons, wherever the row is. Delegated on document for the
       same reason the gesture is: these lists re-render on every keystroke. */
    bindSwipeRows();
    document.addEventListener("click", (e) => {
      const done = e.target.closest && e.target.closest(".swipe__done");
      if (done && done.dataset.doneCustomer) { toggleCustomerDone(done.dataset.doneCustomer); return; }
      const btn = e.target.closest && e.target.closest(".swipe__delete");
      if (!btn) return;
      if (btn.dataset.deleteCustomer) deleteCustomerFromLedger(btn.dataset.deleteCustomer);
      else if (btn.dataset.deleteOrder) deleteOrderFromCustomer(btn.dataset.deleteOrder);
      else if (btn.dataset.deletePenjahit) deletePenjahitById(btn.dataset.deletePenjahit, false);
    });
    elements.customerSearch.addEventListener("input", () => {
      if ("penjahit" === state.production.ledgerTab) renderPenjahitLedger();
      else renderCustomerList();
    });

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
    elements.downloadInvoice.addEventListener("click", openInvoiceTerminPicker);

    elements.createMoodboardBtn.addEventListener("click", () => {
      if (state.order) go("#/order/" + state.order.id + "/moodboard");
    });
    elements.logNewFittingBtn.addEventListener("click", () => {
      if (state.order) go("#/order/" + state.order.id + "/fitting/new");
    });

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
          requestAnimationFrame(() => $(".js-clabel", elements.calcRowList)?.focus({ preventScroll: true }));
        })(calcBtn.closest(".item"));
      }
    });

    elements.itemList.addEventListener("input", (e) => {
      const target = e.target;
      /* Grouping as the digits land is what makes a seven-figure price legible
         while it is being typed. reformatPriceField leaves anything it cannot
         read alone, so a pasted "Rp 300" survives to be reported as an error
         rather than being silently rewritten into a different number. */
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
      if (e.target.classList.contains("js-camount")) U.reformatPriceField(e.target);
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
        // Turning the phone is the one thing that genuinely changes a bar's
        // height, so this is where the bars get re-measured now that the
        // keyboard's own updates no longer do it.
        syncBottomBar();
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

    /* Keeps a focused text field clear of the software keyboard, and nothing
       else. It used to match `button` too, which meant every tap anywhere in
       the app scrolled the page under the user's thumb — tapping a control
       focuses it, and this then pulled it to the middle of the screen a frame
       later. It also silently undid every focus({ preventScroll: true }) in the
       codebase, which is why two pages had to grow their own corrections.

       `nearest`, not `center`: a field already comfortably in view needs no
       scroll at all, and re-centring one that is fine is the same jitter in a
       smaller form. */
    document.addEventListener("focusin", (e) => {
      const target = e.target;
      // The fitting-log search aligns itself to the fixed nav; scrolling it here
      // would fight that and leave the field under the software keyboard.
      if (target === elements.fitlogSearch) return;
      if (!target.matches("textarea, input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio])")) return;

      requestAnimationFrame(() =>
        setTimeout(() => {
          if (document.activeElement !== target) return;
          target.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
          });
        }, 80)
      );
    });

    document.addEventListener("keydown", (e) => {
      trapModalFocus(e, elements.calcSheet);
      trapModalFocus(e, elements.mbOverlay);
      trapModalFocus(e, $("#fittingPicker"));
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
      elements.gateSubmit.focus(); // focus-scroll-ok: the gate is one screen with nothing to scroll
    } else {
      elements.gatePassword.focus(); // focus-scroll-ok: as above
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
        // An empty password is a question this page can answer itself, and does
        // not need a round trip to be told no.
        if (!validateFields(elements.gateForm)) return;
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
      // Straight away, not after the session check: the session check is most
      // of the wait, and an empty curtain during it is the whole complaint.
      startBootQuotes();
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
      stopBootQuotes();
      elements.boot.innerHTML =
        '<div class="boot__msg"><strong>Not connected.</strong><span>Fill in <code>config.js</code> with your Supabase URL and anon key — see “Setting up the database” in the README.</span></div>';
    }

    return { state };
  })();
})();
