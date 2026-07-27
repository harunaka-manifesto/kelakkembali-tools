/* Kelak Kembali — fitting schedule.

   The programme has exactly two fixed points, and neither of them is a fitting.
   It cannot start before the first payment — that is when the work is actually
   commissioned — and it cannot end after the wedding. Everything in between is
   arithmetic on those two dates, so it is computed rather than remembered.

   computeSchedule is pure — dates in, dates out, no DOM and no network. That is
   deliberate: it is the one piece of this feature with real logic in it, and
   keeping it callable from the console is how it stays checkable. The rendering
   and the Google calls below it are the thin part. */

window.KK = window.KK || {};

KK.calendar = (function () {
  'use strict';

  const U = KK.util;

  /* ------------------------------- The rules ------------------------------ */

  /* In order. Must match the check constraint on order_events.stage in
     schema.sql. None of these is a fixed point any more — the payment and the
     wedding are, and all five of these are placed between them. */
  const STAGES = [
    'Body measurements',
    'Fitting 1',
    'Fitting 2',
    'Fitting 3',
    'Final fitting'
  ];

  const ANCHOR_FIRST = STAGES[0];
  const ANCHOR_LAST = STAGES[STAGES.length - 1];

  /* Nothing is measured until there is a design to measure against, and the
     design takes about a fortnight from the moment the first payment lands. */
  const DESIGN_PHASE_DAYS = 14;

  /* How long before the wedding the final fitting should sit. The garment still
     has to be altered, pressed and delivered after it, so three weeks is what
     we aim for — but a week is survivable, and a fitting that happens is worth
     more than a buffer that is only comfortable. */
  const FINAL_BUFFER_IDEAL = 21;
  const FINAL_BUFFER_MIN = 7;

  /* Below this the buffer is worth mentioning; above it, losing a day or two of
     slack is not news and saying so every time trains you to ignore the line
     that matters. A fortnight is still enough to alter and deliver in. */
  const FINAL_BUFFER_QUIET = 14;

  /* A fitting is only useful once the last one has been acted on, and that is
     cutting-and-sewing time, not calendar time. Below this the appointments
     stop being a programme and start being a queue. */
  const MIN_GAP_DAYS = 14;

  /* Which appointments give way when the window is too short, in the order they
     give way. Middle-out: measurements and the final fitting are the two you
     cannot make a garment without, and of the three in between the latest is
     the most redundant with the final fitting. Dropping from the end instead
     would leave a long silent stretch before the wedding, which is exactly when
     you want eyes on the garment. */
  const DROP_ORDER = ['Fitting 3', 'Fitting 2', 'Fitting 1'];

  /** Days needed to fit n appointments at the minimum gap. */
  const spanNeededFor = (n) => MIN_GAP_DAYS * (n - 1);

  /* ---------------------------- Date arithmetic --------------------------- */

  /* Dates are "YYYY-MM-DD" strings everywhere in this app, and stay strings at
     the edges of this module. In between they are whole day counts, which is
     the only representation that cannot drift: a local-time Date does the wrong
     thing across a DST boundary, and "add 30 days" then lands an hour early and
     rounds down to the day before. */

  const DAY_MS = 86400000;

  /** "2026-03-21" -> day number, or null if it is not a date. */
  function toDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(t);
    // Rejects 2026-02-31 and friends, which Date.UTC would happily roll over.
    if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
    return Math.round(t / DAY_MS);
  }

  /** Day number -> "2026-03-21". */
  function fromDay(day) {
    const d = new Date(day * DAY_MS);
    const p = (n) => String(n).padStart(2, '0');
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
  }

  /** Whole days from one ISO date to another. Negative if b is earlier. */
  function daysBetween(a, b) {
    const from = toDay(a);
    const to = toDay(b);
    return from === null || to === null ? null : to - from;
  }

  /* ------------------------------ The schedule ---------------------------- */

  /**
   * Place the fitting programme between the first payment and the wedding.
   *
   * Returns { events, dropped, warning, reason, finalBufferDays }:
   *   events           [{ stage, event_date }] in date order — empty when unschedulable
   *   dropped          stage names left out because the window was too tight
   *   warning          what to tell the user about a schedule that was cut down
   *   reason           why there is no schedule at all, when there isn't one
   *   finalBufferDays  days between the final fitting and the wedding, or null
   */
  function computeSchedule(paymentISO, weddingISO) {
    const paid = toDay(paymentISO);
    const wedding = toDay(weddingISO);

    const nothing = (reason) => ({
      events: [], dropped: [], warning: '', reason: reason, finalBufferDays: null
    });

    /* Order matters. The payment is the one the user can do something about
       right now, so it is named first when both are missing. */
    if (paid === null) return nothing('The schedule starts when the first payment is logged.');
    if (wedding === null) return nothing('Add the wedding date to build a schedule.');

    const start = paid + DESIGN_PHASE_DAYS;   // body measurements, never moves
    const ideal = wedding - FINAL_BUFFER_IDEAL;
    const latest = wedding - FINAL_BUFFER_MIN;

    if (latest <= start) {
      return nothing('The first payment is too close to the wedding to schedule fittings — ' +
        'the ' + DESIGN_PHASE_DAYS + '-day design phase alone runs past ' +
        FINAL_BUFFER_MIN + ' days before the day.');
    }

    /* Give up the finishing buffer before giving up an appointment: slide the
       final fitting later, and only when even the latest acceptable date leaves
       too little room, drop from the middle. Each pass asks the same question of
       one fewer appointment, so this always terminates. */
    let stages = STAGES.slice();
    const dropped = [];
    let end = null;

    for (let i = 0; ; i++) {
      const need = spanNeededFor(stages.length);
      if (ideal - start >= need) { end = ideal; break; }
      if (latest - start >= need) { end = start + need; break; }
      if (i >= DROP_ORDER.length) break;
      dropped.push(DROP_ORDER[i]);
      stages = stages.filter((s) => s !== DROP_ORDER[i]);
    }

    /* Not even measurements and a final fitting a fortnight apart. Still worth
       booking both — they just land closer together than anyone would like. */
    const squeezed = end === null;
    if (squeezed) end = latest;

    /* Even split. Computed from the ends each time rather than by accumulating
       a step, so rounding cannot creep and the last event lands exactly on the
       final fitting date the rest of the app reports. */
    const span = end - start;
    const last = stages.length - 1;
    const events = stages.map((stage, i) => ({
      stage: stage,
      event_date: fromDay(start + Math.round((i * span) / last))
    }));

    const finalBufferDays = wedding - end;
    const order = dropped.slice().sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b));

    return {
      events: events,
      dropped: order,
      warning: scheduleWarning(wedding - paid, order, finalBufferDays, squeezed),
      reason: '',
      finalBufferDays: finalBufferDays
    };
  }

  const days = (n) => n + (n === 1 ? ' day' : ' days');

  const listOf = (names) => names.length === 1
    ? names[0]
    : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

  /* Silent when nothing was compromised. Otherwise it says what the window was,
     what that cost, and what the uncompromised version would have looked like —
     which together are enough to decide whether to go back to the client. */
  function scheduleWarning(window, dropped, finalBufferDays, squeezed) {
    const parts = [];

    if (dropped.length) {
      parts.push(listOf(dropped) + (dropped.length === 1 ? ' was' : ' were') +
        ' left out — the full programme needs ' + days(spanNeededFor(STAGES.length)) +
        ' from body measurements to the final fitting.');
    }
    if (finalBufferDays < FINAL_BUFFER_QUIET) {
      parts.push('The final fitting is ' + days(finalBufferDays) +
        ' before the wedding rather than the usual ' + FINAL_BUFFER_IDEAL + '.');
    }
    if (squeezed) {
      parts.push('The two appointments are closer together than the usual ' +
        MIN_GAP_DAYS + ' days.');
    }
    if (!parts.length) return '';

    return 'Only ' + days(window) + ' between the first payment and the wedding. ' +
      parts.join(' ');
  }

  /** Gaps between consecutive events, for display. */
  function gapsFor(events) {
    return events.map((e, i) => (i === 0 ? null : daysBetween(events[i - 1].event_date, e.event_date)));
  }

  /* -------------------------------- Titles -------------------------------- */

  /* What the event is called in Google Calendar. The stage leads because that
     is what a month view has room for and what tells you what to prepare; the
     name is there to say whose. */
  function eventTitle(stage, customerName, orderTitle) {
    const first = String(customerName || '').trim().split(/\s+/)[0] || 'Client';
    const label = String(orderTitle || '').trim();
    return stage + ' — ' + first + (label ? ' (' + label + ')' : '');
  }

  /* ------------------------------- Rendering ------------------------------ */

  /* The card is a read-out, not a form: the dates are consequences of the first
     payment and the wedding, and the way to change them is to change those. */
  function renderSchedule(root, result, opts) {
    const o = opts || {};

    if (!result.events.length) {
      root.innerHTML = '<p class="sched__empty">' + U.escapeHtml(result.reason) + '</p>';
      return;
    }

    const today = U.todayISO();
    const gaps = gapsFor(result.events);

    root.innerHTML =
      (result.warning
        ? '<p class="sched__warn">' + U.escapeHtml(result.warning) + '</p>'
        : '') +
      '<ol class="sched">' +
      result.events.map((e, i) => {
        const past = e.event_date < today;
        const gap = gaps[i];
        return '<li class="sched__row' + (past ? ' sched__row--past' : '') + '">' +
          '<span class="sched__stage">' + U.escapeHtml(e.stage) + '</span>' +
          '<span class="sched__date">' + U.escapeHtml(U.formatShortDate(e.event_date)) + '</span>' +
          '<span class="sched__gap">' + (gap === null ? '' : '+' + gap + 'd') + '</span>' +
          /* Always emitted, filled only when synced. Rendering it conditionally
             collapsed the column on unsynced rows and knocked every gap out of
             alignment with the ones above it. */
          '<span class="sched__synced' + (e.google_event_id ? ' is-synced' : '') + '"' +
            (e.google_event_id ? ' title="In Google Calendar"' : '') + '></span>' +
        '</li>';
      }).join('') +
      '</ol>' +
      (o.note ? '<p class="sched__note">' + U.escapeHtml(o.note) + '</p>' : '');
  }

  return {
    STAGES, ANCHOR_FIRST, ANCHOR_LAST, MIN_GAP_DAYS, DROP_ORDER,
    DESIGN_PHASE_DAYS, FINAL_BUFFER_IDEAL, FINAL_BUFFER_MIN, FINAL_BUFFER_QUIET,
    computeSchedule, spanNeededFor, gapsFor, eventTitle, renderSchedule,
    toDay, fromDay, daysBetween
  };
})();
