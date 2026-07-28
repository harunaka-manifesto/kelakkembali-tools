/* Kelak Kembali — the schedule.

   The work happens in two phases, and they are anchored by two different
   payments. That is the whole shape of this file.

   The first payment commissions the design: a fortnight of drawing, revising
   and sending things back and forth over WhatsApp. It needs no wedding date,
   because nothing about it is measured from the wedding.

   The second payment commissions the garment. From there the programme runs on
   two fixed points — it cannot start before the money that pays for the cloth,
   and it cannot end after the wedding — and everything in between is
   arithmetic on those two dates.

   The two are computed separately and persisted separately, so a customer who
   has paid a deposit but not yet settled on a wedding date still gets a design
   block in the calendar, and a missing wedding date can never take one away.

   computeDesign and computeProduction are pure — dates in, dates out, no DOM
   and no network. That is deliberate: they are the one piece of this feature
   with real logic in them, and keeping them callable from the console is how
   they stay checkable. The rendering below is the thin part. */

window.KK = window.KK || {};

KK.calendar = (function () {
  'use strict';

  const U = KK.util;

  /* ------------------------------- The rules ------------------------------ */

  /* In order, and in display order. Must match the check constraint on
     order_events.stage in schema.sql. */
  const STAGES = [
    'Design phase',
    'Design deadline',
    'Body measurements',
    'Fitting 1',
    'Fitting 2',
    'Fitting 3',
    'Final fitting'
  ];

  /* The two groups, each with its own anchor. Nothing in one is computed from
     anything in the other — that independence is the point. */
  const DESIGN_STAGES = STAGES.slice(0, 2);
  const PRODUCTION_STAGES = STAGES.slice(2);

  const ANCHOR_FIRST = PRODUCTION_STAGES[0];
  const ANCHOR_LAST = PRODUCTION_STAGES[PRODUCTION_STAGES.length - 1];

  /* Design takes about a fortnight from the moment the first payment lands.
     At the end of it there is something to show the client and a second
     payment to ask for, which is why the block has a deadline on its far end
     as well as a span. */
  const DESIGN_PHASE_DAYS = 14;

  /* Once production is paid for, the body has to be measured before anything
     can be cut. A week is the outside limit, not a target — this is a ceiling
     the schedule is pushed back from, never past. */
  const MEASURE_DEADLINE_DAYS = 7;

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
     cutting-and-sewing time, not calendar time. Three weeks is the working
     minimum; two is what we will accept to keep an appointment that would
     otherwise be dropped, because a cramped fitting still puts eyes on the
     garment and a missing one does not. */
  const MIN_GAP_WEEKS = 3;
  const SQUEEZE_GAP_WEEKS = 2;

  /* Which appointments give way when even the squeezed gap will not fit, in the
     order they give way. Middle-out: measurements and the final fitting are the
     two you cannot make a garment without, and of the three in between the
     latest is the most redundant with the final fitting. Dropping from the end
     instead would leave a long silent stretch before the wedding, which is
     exactly when you want eyes on the garment. */
  const DROP_ORDER = ['Fitting 3', 'Fitting 2', 'Fitting 1'];

  /** Days needed to fit n appointments at a given weekly gap. */
  const spanNeededFor = (n, gapWeeks) => (gapWeeks || MIN_GAP_WEEKS) * 7 * (n - 1);

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

  /* Day 0 is 1 January 1970, a Thursday, so Monday sits three days behind the
     start of the modulo cycle. Appointments are placed on Mondays and never
     later than the day computed for them: a week always has a Monday on or
     before any date in it, so snapping backwards can move an appointment by at
     most six days and can never push it past the measurement deadline or the
     final-fitting floor. Snapping forward could do both. */
  const mondayOnOrBefore = (day) => day - (((day % 7) + 7 + 3) % 7);

  const isMonday = (day) => mondayOnOrBefore(day) === day;

  /* --------------------------- The design phase --------------------------- */

  /**
   * Place the design block from the first payment. Needs nothing else.
   *
   * Returns { events, reason, missingAnchor } — the same vocabulary the
   * production group uses, so callers can treat the two alike.
   */
  function computeDesign(paymentISO) {
    const paid = toDay(paymentISO);
    if (paid === null) {
      return {
        events: [],
        reason: 'The design phase starts when the first payment is logged.',
        missingAnchor: true
      };
    }

    /* The block starts the day after the money lands and runs a fortnight; the
       deadline sits on its last day rather than after it, because the thing
       due that day is the conversation the block was for. */
    return {
      events: [
        {
          stage: 'Design phase',
          event_date: fromDay(paid + 1),
          end_date: fromDay(paid + DESIGN_PHASE_DAYS)
        },
        {
          stage: 'Design deadline',
          event_date: fromDay(paid + DESIGN_PHASE_DAYS)
        }
      ],
      reason: '',
      missingAnchor: false
    };
  }

  /* ----------------------------- The programme ---------------------------- */

  /**
   * Place the fitting programme between the production payment and the wedding.
   *
   * pins is { stage: "YYYY-MM-DD" } for appointments that have been moved by
   * hand in Google Calendar. A pinned stage is a fixed point: it keeps its date
   * whatever else changes, and the appointments around it are redistributed to
   * fit. The app is authoritative about the programme; the person who moved the
   * appointment is authoritative about the appointment.
   *
   * Returns { events, dropped, warnings, warning, reason, missingAnchor,
   * finalBufferDays, gapWeeks }:
   *   events           [{ stage, event_date }] in date order — empty when unschedulable
   *   dropped          stage names left out because the window was too tight
   *   warnings         one point per compromise, for a list
   *   warning          the same points run together, for a sentence
   *   reason           why there is no schedule at all, when there isn't one
   *   missingAnchor    true when a date is absent rather than unworkable
   *   finalBufferDays  days between the final fitting and the wedding, or null
   *   gapWeeks         the spacing the programme was placed at
   *
   * missingAnchor is the difference between "these two dates cannot produce a
   * schedule" and "I was not given two dates". Callers that persist the result
   * need to tell those apart: the first is an answer, the second is a question,
   * and overwriting a stored schedule with the second throws away real data
   * because of an empty field.
   */
  function computeProduction(paymentISO, weddingISO, pins) {
    const paid = toDay(paymentISO);
    const wedding = toDay(weddingISO);
    const pinned = pins || {};

    const nothing = (reason, missingAnchor) => ({
      events: [], dropped: [], warnings: [], warning: '', reason: reason,
      missingAnchor: !!missingAnchor, finalBufferDays: null, gapWeeks: MIN_GAP_WEEKS
    });

    /* Order matters. The payment is the one the user can do something about
       right now, so it is named first when both are missing. */
    if (paid === null) {
      return nothing('Fittings are scheduled when the production payment is logged.', true);
    }
    if (wedding === null) return nothing('Add the wedding date to build a schedule.', true);

    /* The two ends. A pin on either replaces the computed date outright —
       including the room the programme has to work in, which is why this is
       decided before anything is placed rather than patched afterwards. */
    const startPin = toDay(pinned[ANCHOR_FIRST]);
    const endPin = toDay(pinned[ANCHOR_LAST]);

    const start = startPin === null
      ? mondayOnOrBefore(paid + MEASURE_DEADLINE_DAYS)
      : startPin;
    const ideal = endPin === null ? mondayOnOrBefore(wedding - FINAL_BUFFER_IDEAL) : endPin;
    const latest = endPin === null ? mondayOnOrBefore(wedding - FINAL_BUFFER_MIN) : endPin;

    if (latest <= start) {
      return nothing('The production payment is too close to the wedding to schedule ' +
        'fittings — body measurements alone run past ' + FINAL_BUFFER_MIN +
        ' days before the day.');
    }

    /* Three questions in order of preference, asked of the full programme
       before any of them is asked of a shorter one: can it be placed at the
       full three-week gap, and failing that at two? Only when neither fits does
       an appointment give way. Squeezing costs comfort; dropping costs a
       fitting, and a cramped fitting is worth more than no fitting. Each pass
       asks the same questions of one fewer appointment, so this terminates. */
    let stages = PRODUCTION_STAGES.slice();
    const dropped = [];
    let end = null;
    let gapWeeks = MIN_GAP_WEEKS;

    for (let i = 0; ; i++) {
      for (const g of [MIN_GAP_WEEKS, SQUEEZE_GAP_WEEKS]) {
        const need = spanNeededFor(stages.length, g);
        if (ideal - start >= need) { end = ideal; gapWeeks = g; break; }
        if (latest - start >= need) { end = start + need; gapWeeks = g; break; }
      }
      if (end !== null) break;
      if (i >= DROP_ORDER.length) break;
      dropped.push(DROP_ORDER[i]);
      stages = stages.filter((s) => s !== DROP_ORDER[i]);
    }

    /* Not even measurements and a final fitting a fortnight apart. Still worth
       booking both — they just land closer together than anyone would like. */
    const squeezed = end === null;
    if (squeezed) end = latest;

    const placed = place(stages, start, end, pinned);

    /* Measured off the placed dates rather than off gapWeeks. The two are not
       always the same: a programme that will not fit at three weeks but has
       room to spare at two is placed across the room it has, so its gaps land
       somewhere in between. Reporting the intent instead of the result would
       tell the user two weeks when it is really nineteen days. */
    const tightest = placed.reduce(
      (min, d, i) => (i === 0 ? min : Math.min(min, d - placed[i - 1])), Infinity);

    const finalBufferDays = wedding - placed[placed.length - 1];
    const order = dropped.slice().sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b));
    const warnings = scheduleWarnings(
      wedding - paid, order, finalBufferDays, tightest, squeezed);

    return {
      events: stages.map((stage, i) => ({ stage: stage, event_date: fromDay(placed[i]) })),
      dropped: order,
      warnings: warnings,
      warning: warnings.join(' '),
      reason: '',
      missingAnchor: false,
      finalBufferDays: finalBufferDays,
      gapWeeks: gapWeeks
    };
  }

  /**
   * Spread stages between two ends, honouring any pinned dates in between.
   *
   * The ends and the pins are fixed points; each run of unpinned stages between
   * two of them is split evenly across that segment. Splitting is computed from
   * the segment's own ends each time rather than by accumulating a step, so
   * rounding cannot creep and the last stage lands exactly on the final fitting
   * date the rest of the app reports.
   */
  function place(stages, start, end, pinned) {
    const last = stages.length - 1;
    const days = new Array(stages.length);
    days[0] = start;
    days[last] = end;

    const fixed = [0];
    for (let i = 1; i < last; i++) {
      const p = toDay(pinned[stages[i]]);
      if (p !== null) { days[i] = p; fixed.push(i); }
    }
    fixed.push(last);

    for (let k = 0; k < fixed.length - 1; k++) {
      const a = fixed[k];
      const b = fixed[k + 1];
      if (b - a < 2) continue;

      /* Whole weeks when both ends of the segment are Mondays, which is the
         ordinary case and what makes a three-week gap exactly three weeks
         rather than something that rounds to twenty days. A hand-moved date is
         allowed to be a Tuesday, and its neighbours follow it rather than the
         other way round — the tidiness rule loses to the real appointment. */
      const span = days[b] - days[a];
      const whole = isMonday(days[a]) && isMonday(days[b]);
      for (let i = a + 1; i < b; i++) {
        const exact = ((i - a) * span) / (b - a);
        days[i] = days[a] + (whole ? 7 * Math.round(exact / 7) : Math.round(exact));
      }
    }

    return days;
  }

  const days = (n) => n + (n === 1 ? ' day' : ' days');

  const weeks = (n) => n + (n === 1 ? ' week' : ' weeks');

  const listOf = (names) => names.length === 1
    ? names[0]
    : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

  /* Silent when nothing was compromised. Otherwise it says what the window was,
     what that cost, and what the uncompromised version would have looked like —
     which together are enough to decide whether to go back to the client.

     One point per compromise rather than one paragraph: the caller decides
     whether to set them as bullets or run them together into a sentence, and a
     reader scanning for what went wrong can stop at the line that matters. */
  function scheduleWarnings(window, dropped, finalBufferDays, tightestGap, squeezed) {
    const parts = [];

    if (dropped.length) {
      parts.push(listOf(dropped) + (dropped.length === 1 ? ' was' : ' were') +
        ' left out — the full programme needs ' +
        weeks(MIN_GAP_WEEKS * (PRODUCTION_STAGES.length - 1)) + '.');
    }
    if (finalBufferDays < FINAL_BUFFER_QUIET) {
      parts.push('Final fitting ' + days(finalBufferDays) +
        ' before the wedding, not the usual ' + FINAL_BUFFER_IDEAL + '.');
    }
    if (squeezed) {
      parts.push('The two appointments are ' + days(tightestGap) +
        ' apart, not the usual ' + weeks(MIN_GAP_WEEKS) + '.');
    } else if (tightestGap < MIN_GAP_WEEKS * 7) {
      parts.push('Appointments as little as ' + days(tightestGap) +
        ' apart, not the usual ' + weeks(MIN_GAP_WEEKS) + '.');
    }
    if (!parts.length) return [];

    return ['Only ' + days(window) + ' from the production payment to the wedding.']
      .concat(parts);
  }

  /* ------------------------------ Both groups ----------------------------- */

  /**
   * The whole schedule: design block from the first payment, fittings from the
   * production payment and the wedding.
   *
   * The groups are returned separately as well as merged, because they are
   * persisted separately — see rescheduleOrder in app.js. Replacing one must
   * never be able to delete the other, and the only way to guarantee that is
   * for the caller to be able to see which is which.
   */
  function computeSchedule(firstPaymentISO, productionPaymentISO, weddingISO, pins) {
    const pinned = pins || {};
    const design = computeDesign(firstPaymentISO);
    const production = computeProduction(productionPaymentISO, weddingISO, pinned);

    /* A pinned design date wins the same way a pinned fitting does. Nothing
       downstream depends on these two, so there is no reflow to do. */
    const events = design.events.map((e) => {
      const p = toDay(pinned[e.stage]);
      if (p === null) return e;
      const moved = { stage: e.stage, event_date: fromDay(p) };
      if (e.end_date) moved.end_date = fromDay(p + daysBetween(e.event_date, e.end_date));
      return moved;
    }).concat(production.events);

    return {
      design: design,
      production: production,
      events: events,
      dropped: production.dropped,
      warnings: production.warnings,
      warning: production.warning,
      reason: events.length ? '' : (design.reason || production.reason),
      missingAnchor: !events.length && (design.missingAnchor || production.missingAnchor),
      finalBufferDays: production.finalBufferDays
    };
  }

  /**
   * Gaps between consecutive events, for display.
   *
   * Only within the fitting programme. The gap is there to show the cadence —
   * how long the garment has between one pair of eyes and the next — and that
   * is a question about fittings. A number spanning the design deadline and the
   * first measurement would be measuring between two different payments, and a
   * number inside the design block would just be restating its own length.
   */
  function gapsFor(events) {
    return events.map((e, i) => {
      if (i === 0) return null;
      const prev = events[i - 1];
      if (!isProductionStage(e.stage) || !isProductionStage(prev.stage)) return null;
      return daysBetween(prev.event_date, e.event_date);
    });
  }

  /** Sort key for a row, so stored rows display in programme order. */
  const stageOrder = (stage) => {
    const i = STAGES.indexOf(stage);
    return i === -1 ? STAGES.length : i;
  };

  const isDesignStage = (stage) => DESIGN_STAGES.indexOf(stage) !== -1;
  const isProductionStage = (stage) => PRODUCTION_STAGES.indexOf(stage) !== -1;

  /** { stage: date } for every row the user has moved by hand. */
  function pinsFrom(rows) {
    const out = {};
    (rows || []).forEach((r) => { if (r.pinned) out[r.stage] = r.event_date; });
    return out;
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
     payments and the wedding, and the way to change them is to change those —
     or to move the appointment in Google Calendar, which pins it. */
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
        const past = (e.end_date || e.event_date) < today;
        const gap = gaps[i];
        /* A block says when it runs, not when it starts: a fortnight of design
           work reads as a fortnight or it reads as a day that nothing happens
           on. */
        const when = e.end_date
          ? U.formatShortDate(e.event_date) + ' – ' + U.formatShortDate(e.end_date)
          : U.formatShortDate(e.event_date);
        return '<li class="sched__row' + (past ? ' sched__row--past' : '') + '">' +
          '<span class="sched__stage">' + U.escapeHtml(e.stage) + '</span>' +
          '<span class="sched__date">' + U.escapeHtml(when) + '</span>' +
          '<span class="sched__gap">' + (gap === null ? '' : '+' + gap + 'd') + '</span>' +
          /* Both always emitted, filled only when they apply. Rendering them
             conditionally collapsed the columns on unsynced rows and knocked
             every gap out of alignment with the ones above it. */
          '<span class="sched__pinned' + (e.pinned ? ' is-pinned' : '') + '"' +
            (e.pinned ? ' title="Moved by hand in Google Calendar — kept as is"' : '') + '></span>' +
          '<span class="sched__synced' + (e.google_event_id ? ' is-synced' : '') + '"' +
            (e.google_event_id ? ' title="In Google Calendar"' : '') + '></span>' +
        '</li>';
      }).join('') +
      (o.note ? '<p class="sched__note">' + U.escapeHtml(o.note) + '</p>' : '');
  }

  return {
    STAGES, DESIGN_STAGES, PRODUCTION_STAGES, ANCHOR_FIRST, ANCHOR_LAST,
    MIN_GAP_WEEKS, SQUEEZE_GAP_WEEKS, DROP_ORDER,
    DESIGN_PHASE_DAYS, MEASURE_DEADLINE_DAYS,
    FINAL_BUFFER_IDEAL, FINAL_BUFFER_MIN, FINAL_BUFFER_QUIET,
    computeDesign, computeProduction, computeSchedule,
    spanNeededFor, gapsFor, pinsFrom, stageOrder, isDesignStage, isProductionStage,
    eventTitle, renderSchedule,
    toDay, fromDay, daysBetween, mondayOnOrBefore
  };
})();
