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
    const day = Number(match[3]);
    const month = MONTHS[Number(match[2]) - 1];
    const year = match[1];
    return month && day ? day + ' ' + month + ' ' + year : '';
  }

  function formatShortDate(dateStr) {
    const longFormatted = formatLongDate(dateStr);
    if (!longFormatted) return '';
    const parts = longFormatted.split(' ');
    return parts[0] + ' ' + parts[1].slice(0, 3) + ' ' + parts[2];
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
    mulberry32
  };
})();
