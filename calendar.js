/* Kelak Kembali — fitting schedule.

   Two dates are asked of the client upfront: when they come in to be measured,
   and the last time they are seen before the wedding. Everything between those
   is a consequence of them, so it is computed rather than remembered.

   computeSchedule is pure — dates in, dates out, no DOM and no network. That is
   deliberate: it is the one piece of this feature with real logic in it, and
   keeping it callable from the console is how it stays checkable. The rendering
   and the Google calls below it are the thin part. */

window.KK = window.KK || {};

KK.calendar = (function () {
  'use strict';

  const U = KK.util;

  /* ------------------------------- The rules ------------------------------ */

  /* In order. The first and last are the anchors the client gave us; the three
     in the middle are ours to place. Must match the check constraint on
     order_events.stage in schema.sql. */
  const STAGES = [
    'Body measurements',
    'Fitting 1',
    'Fitting 2',
    'Fitting 3',
    'Final fitting'
  ];

  const ANCHOR_FIRST = STAGES[0];
  const ANCHOR_LAST = STAGES[STAGES.length - 1];

  /* A fitting is only useful once the last one has been acted on, and that is
     cutting-and-sewing time, not calendar time. Below this the appointments
     stop being a programme and start being a queue. */
  const MIN_GAP_DAYS = 14;

  /* Which fittings give way when the window is too short, in the order they
     give way. Middle-out: the anchors are promises already made, and of the
     three in between the latest is the most redundant with the final fitting.
     Dropping from the end instead would leave a long silent stretch before the
     wedding, which is exactly when you want eyes on the garment. */
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
   * Place the fitting programme between the two anchor dates.
   *
   * Returns { events, dropped, warning, reason }:
   *   events   [{ stage, event_date }] in date order — empty when unschedulable
   *   dropped  stage names left out because the window was too tight
   *   warning  what to tell the user about a schedule that was cut down
   *   reason   why there is no schedule at all, when there isn't one
   */
  function computeSchedule(measurementsISO, finalISO) {
    const start = toDay(measurementsISO);
    const end = toDay(finalISO);

    const nothing = (reason) => ({ events: [], dropped: [], warning: '', reason: reason });

    if (start === null && end === null) {
      return nothing('Add the body measurements and final fitting dates to build a schedule.');
    }
    if (start === null) return nothing('Add the body measurements date to build a schedule.');
    if (end === null) return nothing('Add the final fitting date to build a schedule.');
    if (end === start) {
      return nothing('Body measurements and the final fitting are on the same day — there is no window to schedule into.');
    }
    if (end < start) {
      return nothing('The final fitting is before the body measurements. Check the dates.');
    }

    const span = end - start;

    /* Drop from the middle until what is left can be spaced properly. The
       anchors alone need no gap at all, so this always terminates. */
    let stages = STAGES.slice();
    const dropped = [];
    for (let i = 0; i < DROP_ORDER.length && span < spanNeededFor(stages.length); i++) {
      dropped.push(DROP_ORDER[i]);
      stages = stages.filter((s) => s !== DROP_ORDER[i]);
    }

    /* Even split. Computed from the ends each time rather than by accumulating
       a step, so rounding cannot creep and the last event lands exactly on the
       final fitting date the client was given. */
    const last = stages.length - 1;
    const events = stages.map((stage, i) => ({
      stage: stage,
      event_date: fromDay(start + Math.round((i * span) / last))
    }));

    return {
      events: events,
      dropped: dropped.slice().sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b)),
      warning: dropped.length ? tightWindowWarning(span, dropped) : '',
      reason: ''
    };
  }

  /* Says the three things you need to decide what to do about it: how much room
     there is, what that cost you, and how much room the full programme wants. */
  function tightWindowWarning(span, dropped) {
    const names = dropped.slice().sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b));
    const list = names.length === 1
      ? names[0]
      : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    return 'Only ' + span + (span === 1 ? ' day' : ' days') +
      ' between body measurements and the final fitting, so ' +
      list + (names.length === 1 ? ' was' : ' were') + ' left out. ' +
      'The full programme needs ' + spanNeededFor(STAGES.length) + ' days at ' +
      MIN_GAP_DAYS + ' days apart.';
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

  /* The card is a read-out, not a form: the dates are consequences of the two
     anchors, and the way to change them is to change those. */
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
    computeSchedule, spanNeededFor, gapsFor, eventTitle, renderSchedule,
    toDay, fromDay, daysBetween
  };
})();
