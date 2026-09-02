/* Helpers shared by window.KK browser modules: DOM lookup, escaping,
   date/currency/input formatting, filenames, HEIC conversion, and randomness.
   
   - Owns: Pure utility functions, string escaping, formatting, and shared SVG icons.
   - Does NOT own: Page state, database persistence, schedule rules, or feature workflows.
   - Used by: app.js, docs.js, fittings.js, moodboard.js, calendar.js, tests/pure-modules.test.cjs
*/
window.KK = window.KK || {};

KK.util = (function () {
  'use strict';

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /* ------------------------------- SVG Icons ------------------------------ */

  const ICONS = {
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
  };

  /* --------------------------- Fitting stages ----------------------------- */

  /* The five stored fitting stages map one-to-one to the vocabulary the feed,
     detail page, schedule rows, and PDF all speak. Kept here so the
     label a card shows and the label a client-facing PDF prints can never
     drift apart. Mirrors public.fitting_log_feed in schema.sql. */
  const FITTING_STAGES = [
    { stage: 'Sizing', key: 'sizing', label: 'Sizing', color: '#1866da' },
    { stage: 'Fitting 1', key: 'fitting-1', label: 'Fitting 1', color: '#19aa16' },
    { stage: 'Fitting 2', key: 'fitting-2', label: 'Fitting 2', color: '#e72a90' },
    { stage: 'Fitting 3', key: 'fitting-3', label: 'Fitting 3', color: '#ff6a00' },
    { stage: 'Final fitting', key: 'final-fitting', label: 'Final fitting', color: '#17150f' }
  ];

  /* An unrecognised stored stage keeps its own text rather than inventing a
     fifth vocabulary word, and takes the neutral rule colour. */
  function fittingStage(stage) {
    const name = String(stage == null ? '' : stage);
    const match = FITTING_STAGES.filter((s) => s.stage === name)[0];
    return match || { stage: name, key: '', label: name, color: '#4c4c4c' };
  }

  /* --------------------------- Jakarta calendar --------------------------- */

  /* The workshop's day, not UTC's. Asia/Jakarta is a fixed +07:00 with no DST,
     so the shift is arithmetic and needs no Intl table. */
  const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

  function jakartaDateISO(value) {
    const ms = Date.parse(String(value == null ? '' : value));
    if (!isFinite(ms)) return '';
    return new Date(ms + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
  }

  const formatJakartaLongDate = (value) => formatLongDate(jakartaDateISO(value));

  /* ----------------------------- DOM Helpers ----------------------------- */

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  /* -------------------------- Formatting Helpers -------------------------- */

  function digitsOnly(val) {
    return String(val == null ? '' : val).replace(/[^\d]/g, '');
  }

  function groupDigits(val) {
    const raw = digitsOnly(val).replace(/^0+(?=\d)/, '');
    return raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  }

  function escapeHtml(val) {
    return String(val == null ? '' : val).replace(/[&<>"']/g, function (match) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[match];
    });
  }

  function formatRupiah(val) {
    const num = Math.round(Number(val) || 0);
    return 'Rp' + (num < 0 ? '-' : '') + String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function reformatPriceField(field) {
    const originalVal = field.value;
    const formatted = groupDigits(originalVal);
    if (formatted === originalVal) return;

    const caretPos = field.selectionStart;
    const digitsBeforeCaret = digitsOnly(originalVal.slice(0, caretPos)).length;
    field.value = formatted;

    let index = 0;
    let digitCount = 0;
    while (index < formatted.length && digitCount < digitsBeforeCaret) {
      const code = formatted.charCodeAt(index);
      if (code >= 48 && code <= 57) digitCount++;
      index++;
    }
    try {
      field.setSelectionRange(index, index);
    } catch (_) {}
  }

  function formatLongDate(dateStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
    if (!match) return '';
    const dayNum = Number(match[3]);
    const monthName = MONTHS[Number(match[2]) - 1];
    const yearStr = match[1];
    if (!monthName || !dayNum) return '';
    const day = String(dayNum).padStart(2, '0');
    const mon = monthName.slice(0, 3);
    const yy = yearStr.slice(2);
    return day + ' ' + mon + " '" + yy;
  }

  function formatShortDate(dateStr) {
    return formatLongDate(dateStr);
  }

  function todayISO() {
    const date = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function sanitizeForFilename(val) {
    return String(val || '')
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /* --------------------------- Image & File Helpers ----------------------- */

  function isHeic(file) {
    return /(?:heic|heif)$/i.test((file && file.type) || '') || /\.(?:heic|heif)$/i.test((file && file.name) || '');
  }

  async function convertHeicToJpeg(file) {
    if (typeof window.heic2any !== 'function') {
      throw new Error('This HEIC photo cannot be read on this browser.');
    }
    let converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    if (Array.isArray(converted)) converted = converted[0];
    if (!converted) throw new Error('Could not convert that HEIC photo.');
    return converted;
  }

  /* --------------------------- PRNG & Hashing ----------------------------- */

  /* -------------------------- Photo annotations --------------------------- */

  /* A fitting photo's red markup is vector data, never baked pixels: the Drive
     archive keeps holding the clean original, the marks stay editable, and the
     browser and the PDF redraw from one array.

     Points are normalized to the natural image (0..1 on each axis) so a stroke
     survives every resolution, screen width, orientation and page size it is
     drawn at. Stroke width is a fraction of the longest edge for the same
     reason. `w`/`h` are the natural pixels the marks were made over, carried so
     a later render can rebuild the space without loading the image.

       { v: 1, w: 2560, h: 1706,
         strokes: [ { width: 0.006, points: [[0.12, 0.33], [0.13, 0.34]] } ] }

     null is the whole absence case — no marks, cleared marks, and every row
     that predates the feature all read the same. */
  const ANNOTATION_VERSION = 1;
  const ANNOTATION_MAX_STROKES = 120;
  const ANNOTATION_MAX_POINTS = 4000;
  const ANNOTATION_COLOR = '#ff2a2a';
  const ANNOTATION_DEFAULT_WIDTH = 0.006;

  const annotationRound = (n) => Math.round(n * 10000) / 10000;
  const annotationClamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

  /* The one gate every annotation passes through, on the way in from the canvas
     and on the way out of the database alike. A row edited by hand cannot inject
     anything, because what leaves here is only ever numbers. */
  function normalizeAnnotation(value) {
    if (!value || 'object' !== typeof value || Array.isArray(value)) return null;

    const w = Math.round(Number(value.w));
    const h = Math.round(Number(value.h));
    if (!(w > 0) || !(h > 0)) return null;

    const source = Array.isArray(value.strokes) ? value.strokes : [];
    const strokes = [];
    let points = 0;

    for (let i = 0; i < source.length && strokes.length < ANNOTATION_MAX_STROKES; i++) {
      const stroke = source[i];
      if (!stroke || 'object' !== typeof stroke || !Array.isArray(stroke.points)) continue;

      const kept = [];
      for (let j = 0; j < stroke.points.length && points < ANNOTATION_MAX_POINTS; j++) {
        const point = stroke.points[j];
        if (!Array.isArray(point) || point.length < 2) continue;
        const x = Number(point[0]);
        const y = Number(point[1]);
        if (!isFinite(x) || !isFinite(y)) continue;
        kept.push([annotationRound(annotationClamp(x)), annotationRound(annotationClamp(y))]);
        points++;
      }
      if (!kept.length) continue;

      const width = Number(stroke.width);
      strokes.push({
        width: isFinite(width) && width > 0 ? annotationRound(width) : ANNOTATION_DEFAULT_WIDTH,
        points: kept
      });
    }

    if (!strokes.length) return null;
    return { v: ANNOTATION_VERSION, w, h, strokes };
  }

  const annotationStrokeCount = (value) => {
    const a = normalizeAnnotation(value);
    return a ? a.strokes.length : 0;
  };

  /* The read-only overlay, for every surface that shows a marked photo without
     letting it be edited.

     The viewBox is the natural image size and preserveAspectRatio is left at
     its default, so this <svg> and an object-fit:contain <img> given the same
     box letterbox identically. That is what makes the marks land without a
     single measurement in JavaScript, at any width and in any orientation.

     Every number here is generated, so nothing needs escaping — but nothing
     interpolated from a record reaches the output either. */
  function annotationSvg(value, className) {
    const a = normalizeAnnotation(value);
    if (!a) return '';

    const body = a.strokes.map((stroke) => {
      const width = annotationRound(stroke.width * Math.max(a.w, a.h));
      const pts = stroke.points.map((p) => [annotationRound(p[0] * a.w), annotationRound(p[1] * a.h)]);
      // A tap is a legitimate mark; a zero-length path would draw nothing.
      if (1 === pts.length) {
        return '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="' + (width / 2) +
          '" fill="' + ANNOTATION_COLOR + '"/>';
      }
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
      return '<path d="' + d + '" fill="none" stroke="' + ANNOTATION_COLOR + '" stroke-width="' + width +
        '" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');

    return '<svg class="' + escapeHtml(className || 'fitmark-layer') + '" viewBox="0 0 ' + a.w + ' ' + a.h +
      '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 1831565813) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    MONTHS,
    ICONS,
    FITTING_STAGES,
    fittingStage,
    jakartaDateISO,
    formatJakartaLongDate,
    $,
    $$,
    digitsOnly,
    escapeHtml,
    formatRupiah,
    groupDigits,
    reformatPriceField,
    formatLongDate,
    formatShortDate,
    todayISO,
    sanitizeForFilename,
    isHeic,
    convertHeicToJpeg,
    hashString,
    mulberry32,
    ANNOTATION_VERSION,
    ANNOTATION_MAX_STROKES,
    ANNOTATION_MAX_POINTS,
    ANNOTATION_COLOR,
    ANNOTATION_DEFAULT_WIDTH,
    normalizeAnnotation,
    annotationStrokeCount,
    annotationSvg
  };
})();
