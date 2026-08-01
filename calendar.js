/* Pure fitting-schedule policy and ISO-date arithmetic.
   
   - Owns: Computation of design and production events from payment/wedding anchors and pinned dates.
   - Does NOT own: DOM rendering, persistence, Google Calendar API calls, or SPA route state.
   - Used by: app.js, tests/pure-modules.test.cjs
*/
window.KK = window.KK || {};

KK.calendar = (function () {
  'use strict';

  const U = KK.util;

  /* ------------------------------- Constants ------------------------------ */

  const STAGES = [
    'Design phase',
    'Design deadline',
    'Body measurements',
    'Fitting 1',
    'Fitting 2',
    'Fitting 3',
    'Final fitting'
  ];

  const DESIGN_STAGES = STAGES.slice(0, 2);
  const PRODUCTION_STAGES = STAGES.slice(2);

  const ANCHOR_FIRST = PRODUCTION_STAGES[0]; // "Body measurements"
  const ANCHOR_LAST = PRODUCTION_STAGES[PRODUCTION_STAGES.length - 1]; // "Final fitting"

  const DROP_ORDER = ['Fitting 3', 'Fitting 2', 'Fitting 1'];
  const DAY_MS = 86400000;

  const spanNeededFor = (stageCount, gapWeeks) => 7 * (gapWeeks || 3) * (stageCount - 1);

  /* ---------------------------- Date Calculations -------------------------- */

  function toDay(isoDateStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDateStr || ''));
    if (!match) return null;
    const timeUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const checkDate = new Date(timeUtc);
    // Rejects invalid dates like 2026-02-31 which Date.UTC rolls over
    if (checkDate.getUTCMonth() !== Number(match[2]) - 1 || checkDate.getUTCDate() !== Number(match[3])) {
      return null;
    }
    return Math.round(timeUtc / DAY_MS);
  }

  function fromDay(dayNumber) {
    const date = new Date(dayNumber * DAY_MS);
    const pad = (val) => String(val).padStart(2, '0');
    return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
  }

  function daysBetween(startIso, endIso) {
    const startDay = toDay(startIso);
    const endDay = toDay(endIso);
    if (startDay === null || endDay === null) return null;
    return endDay - startDay;
  }

  const mondayOnOrBefore = (dayNumber) => dayNumber - ((dayNumber % 7 + 7 + 3) % 7);
  const isMonday = (dayNumber) => mondayOnOrBefore(dayNumber) === dayNumber;

  /* --------------------------- Schedule Computations ----------------------- */

  function computeDesign(firstPaymentDate) {
    const startDay = toDay(firstPaymentDate);
    if (startDay === null) {
      return {
        events: [],
        reason: 'The design phase starts when the first payment is logged.',
        missingAnchor: true
      };
    }
    return {
      events: [
        { stage: 'Design phase', event_date: fromDay(startDay + 1), end_date: fromDay(startDay + 14) },
        { stage: 'Design deadline', event_date: fromDay(startDay + 14) }
      ],
      reason: '',
      missingAnchor: false
    };
  }

  function computeProduction(secondPaymentDate, weddingDate, pinnedOverrides) {
    const prodDay = toDay(secondPaymentDate);
    const weddingDay = toDay(weddingDate);
    const pins = pinnedOverrides || {};

    const emptyResult = (reasonMsg, isMissing) => ({
      events: [],
      dropped: [],
      warnings: [],
      warning: '',
      reason: reasonMsg,
      missingAnchor: !!isMissing,
      finalBufferDays: null,
      gapWeeks: 3
    });

    if (prodDay === null) {
      return emptyResult('Fittings are scheduled when the production payment is logged.', true);
    }
    if (weddingDay === null) {
      return emptyResult('Add the wedding date to build a schedule.', true);
    }

    const pinnedFirst = toDay(pins[ANCHOR_FIRST]);
    const pinnedLast = toDay(pins[ANCHOR_LAST]);

    const firstBound = pinnedFirst === null ? mondayOnOrBefore(prodDay + 7) : pinnedFirst;
    const lastBound = pinnedLast === null ? mondayOnOrBefore(weddingDay - 21) : pinnedLast;
    const absoluteDeadline = pinnedLast === null ? mondayOnOrBefore(weddingDay - 7) : pinnedLast;

    if (absoluteDeadline <= firstBound) {
      return emptyResult('The production payment is too close to the wedding to schedule fittings — body measurements alone run past 7 days before the day.');
    }

    let activeStages = PRODUCTION_STAGES.slice();
    const droppedStages = [];
    let chosenLastDay = null;
    let chosenGapWeeks = 3;

    for (let tryCount = 0; ; tryCount++) {
      for (const gapWeeks of [3, 2]) {
        const requiredSpan = spanNeededFor(activeStages.length, gapWeeks);
        if (lastBound - firstBound >= requiredSpan) {
          chosenLastDay = lastBound;
          chosenGapWeeks = gapWeeks;
          break;
        }
        if (absoluteDeadline - firstBound >= requiredSpan) {
          chosenLastDay = firstBound + requiredSpan;
          chosenGapWeeks = gapWeeks;
          break;
        }
      }
      if (chosenLastDay !== null) break;
      if (tryCount >= DROP_ORDER.length) break;
      droppedStages.push(DROP_ORDER[tryCount]);
      activeStages = activeStages.filter((s) => s !== DROP_ORDER[tryCount]);
    }

    const isSqueezed = chosenLastDay === null;
    if (isSqueezed) chosenLastDay = absoluteDeadline;

    const interpolateDays = (stages, startDay, endDay, pinMap) => {
      const lastIndex = stages.length - 1;
      const days = new Array(stages.length);
      days[0] = startDay;
      days[lastIndex] = endDay;
      const pinnedIndices = [0];

      for (let i = 1; i < lastIndex; i++) {
        const pinDay = toDay(pinMap[stages[i]]);
        if (pinDay !== null) {
          days[i] = pinDay;
          pinnedIndices.push(i);
        }
      }
      pinnedIndices.push(lastIndex);

      for (let k = 0; k < pinnedIndices.length - 1; k++) {
        const idxA = pinnedIndices[k];
        const idxB = pinnedIndices[k + 1];
        if (idxB - idxA < 2) continue;

        const totalDiff = days[idxB] - days[idxA];
        const alignMondays = isMonday(days[idxA]) && isMonday(days[idxB]);
        for (let m = idxA + 1; m < idxB; m++) {
          const ratio = (m - idxA) * totalDiff / (idxB - idxA);
          days[m] = days[idxA] + (alignMondays ? 7 * Math.round(ratio / 7) : Math.round(ratio));
        }
      }
      return days;
    };

    const scheduledDays = interpolateDays(activeStages, firstBound, chosenLastDay, pins);
    const minGap = scheduledDays.reduce((min, curr, idx) => (idx === 0 ? min : Math.min(min, curr - scheduledDays[idx - 1])), Infinity);
    const finalBuffer = weddingDay - scheduledDays[scheduledDays.length - 1];
    const sortedDropped = droppedStages.slice().sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b));

    const buildWarnings = (totalDays, dropped, bufferDays, gapDays, squeezed) => {
      const warnings = [];
      if (dropped.length) {
        warnings.push(listOf(dropped) + (dropped.length === 1 ? ' was' : ' were') + ' left out — the full programme needs ' + weeks(3 * (PRODUCTION_STAGES.length - 1)) + '.');
      }
      if (bufferDays < 14) {
        warnings.push('Final fitting ' + days(bufferDays) + ' before the wedding, not the usual 21.');
      }
      if (squeezed) {
        warnings.push('The two appointments are ' + days(gapDays) + ' apart, not the usual ' + weeks(3) + '.');
      } else if (gapDays < 21) {
        warnings.push('Appointments as little as ' + days(gapDays) + ' apart, not the usual ' + weeks(3) + '.');
      }
      return warnings.length ? ['Only ' + days(totalDays) + ' from the production payment to the wedding.'].concat(warnings) : [];
    };

    const warnings = buildWarnings(weddingDay - prodDay, sortedDropped, finalBuffer, minGap, isSqueezed);

    return {
      events: activeStages.map((stageName, i) => ({
        stage: stageName,
        event_date: fromDay(scheduledDays[i])
      })),
      dropped: sortedDropped,
      warnings,
      warning: warnings.join(' '),
      reason: '',
      missingAnchor: false,
      finalBufferDays: finalBuffer,
      gapWeeks: chosenGapWeeks
    };
  }

  const days = (n) => n + (n === 1 ? ' day' : ' days');
  const weeks = (n) => n + (n === 1 ? ' week' : ' weeks');
  const listOf = (arr) => arr.length === 1 ? arr[0] : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

  function gapsFor(events) {
    return events.map((item, index) => {
      if (index === 0) return null;
      const prev = events[index - 1];
      return isProductionStage(item.stage) && isProductionStage(prev.stage)
        ? daysBetween(prev.event_date, item.event_date)
        : null;
    });
  }

  const isProductionStage = (stageName) => PRODUCTION_STAGES.indexOf(stageName) !== -1;
  const isDesignStage = (stageName) => DESIGN_STAGES.indexOf(stageName) !== -1;

  function computeSchedule(firstPaymentDate, secondPaymentDate, weddingDate, pinnedOverrides) {
    const pins = pinnedOverrides || {};
    const designResult = computeDesign(firstPaymentDate);
    const prodResult = computeProduction(secondPaymentDate, weddingDate, pins);

    const mergedEvents = designResult.events.map((e) => {
      const pinDay = toDay(pins[e.stage]);
      if (pinDay === null) return e;
      const updated = { stage: e.stage, event_date: fromDay(pinDay) };
      if (e.end_date) {
        updated.end_date = fromDay(pinDay + daysBetween(e.event_date, e.end_date));
      }
      return updated;
    }).concat(prodResult.events);

    return {
      design: designResult,
      production: prodResult,
      events: mergedEvents,
      dropped: prodResult.dropped,
      warnings: prodResult.warnings,
      warning: prodResult.warning,
      reason: mergedEvents.length ? '' : (designResult.reason || prodResult.reason),
      missingAnchor: !mergedEvents.length && (designResult.missingAnchor || prodResult.missingAnchor),
      finalBufferDays: prodResult.finalBufferDays
    };
  }

  function pinsFrom(eventsList) {
    const pins = {};
    (eventsList || []).forEach((e) => {
      if (e.pinned) pins[e.stage] = e.event_date;
    });
    return pins;
  }

  function stageOrder(stageName) {
    const idx = STAGES.indexOf(stageName);
    return idx === -1 ? STAGES.length : idx;
  }

  function eventTitle(stageName, customerName, docName) {
    const namePart = String(customerName || '').trim().split(/\s+/)[0] || 'Client';
    const docPart = String(docName || '').trim();
    return stageName + ' — ' + namePart + (docPart ? ' (' + docPart + ')' : '');
  }

  function renderSchedule(containerEl, scheduleData, options) {
    const opts = options || {};
    if (!scheduleData.events.length) {
      containerEl.innerHTML = '<p class="sched__empty">' + U.escapeHtml(scheduleData.reason) + '</p>';
      return;
    }

    const todayStr = U.todayISO();
    const gaps = gapsFor(scheduleData.events);

    const warningHtml = scheduleData.warning ? '<p class="sched__warn">' + U.escapeHtml(scheduleData.warning) + '</p>' : '';
    const rowsHtml = scheduleData.events.map((eventItem, index) => {
      const isPast = (eventItem.end_date || eventItem.event_date) < todayStr;
      const gapVal = gaps[index];
      const dateDisplay = eventItem.end_date
        ? U.formatShortDate(eventItem.event_date) + ' – ' + U.formatShortDate(eventItem.end_date)
        : U.formatShortDate(eventItem.event_date);

      return '<li class="sched__row' + (isPast ? ' sched__row--past' : '') + '">' +
        '<span class="sched__stage">' + U.escapeHtml(eventItem.stage) + '</span>' +
        '<span class="sched__date">' + U.escapeHtml(dateDisplay) + '</span>' +
        '<span class="sched__gap">' + (gapVal === null ? '' : '+' + gapVal + 'd') + '</span>' +
        '<span class="sched__pinned' + (eventItem.pinned ? ' is-pinned' : '') + '"' + (eventItem.pinned ? ' title="Moved by hand in Google Calendar — kept as is"' : '') + '></span>' +
        '<span class="sched__synced' + (eventItem.google_event_id ? ' is-synced' : '') + '"' + (eventItem.google_event_id ? ' title="In Google Calendar"' : '') + '></span>' +
        '</li>';
    }).join('');

    const noteHtml = opts.note ? '<p class="sched__note">' + U.escapeHtml(opts.note) + '</p>' : '';
    containerEl.innerHTML = warningHtml + '<ol class="sched">' + rowsHtml + '</ol>' + noteHtml;
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    STAGES,
    DESIGN_STAGES,
    PRODUCTION_STAGES,
    ANCHOR_FIRST,
    ANCHOR_LAST,
    MIN_GAP_WEEKS: 3,
    SQUEEZE_GAP_WEEKS: 2,
    DROP_ORDER,
    DESIGN_PHASE_DAYS: 14,
    MEASURE_DEADLINE_DAYS: 7,
    FINAL_BUFFER_IDEAL: 21,
    FINAL_BUFFER_MIN: 7,
    FINAL_BUFFER_QUIET: 14,
    computeDesign,
    computeProduction,
    computeSchedule,
    spanNeededFor,
    gapsFor,
    pinsFrom,
    stageOrder,
    isDesignStage,
    isProductionStage,
    eventTitle,
    renderSchedule,
    toDay,
    fromDay,
    daysBetween,
    mondayOnOrBefore
  };
})();
