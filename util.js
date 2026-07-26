/* Kelak Kembali — shared helpers.
   Formatting, escaping and the seeded-PRNG primitives, used by both the
   document engine and the app UI. No DOM state of its own. */

window.KK = window.KK || {};

KK.util = (function () {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const digitsOnly = (str) => String(str == null ? '' : str).replace(/[^\d]/g, '');

  const escapeHtml = (str) => String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** Rupiah: dot thousands separator, no decimals, no space after "Rp". */
  function formatRupiah(value) {
    const n = Math.round(Number(value) || 0);
    const sign = n < 0 ? '-' : '';
    return 'Rp' + sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /** Group digits with dots, for the price input display. */
  const groupDigits = (str) => {
    const d = digitsOnly(str).replace(/^0+(?=\d)/, '');
    return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  };

  /**
   * Re-group a price field as it is typed. Separators shift as digits are
   * added, so the caret is restored by digit count rather than by offset —
   * otherwise it jumps a place every time a dot appears.
   */
  function reformatPriceField(input) {
    const before = input.value;
    const formatted = groupDigits(before);
    if (formatted === before) return;

    const caret = input.selectionStart;
    const digitsBefore = digitsOnly(before.slice(0, caret)).length;
    input.value = formatted;

    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBefore) {
      if (formatted.charCodeAt(pos) >= 48 && formatted.charCodeAt(pos) <= 57) seen++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
  }

  /** "2026-03-21" -> "21 March 2026" (no leading zero, full month name). */
  function formatLongDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    const day = Number(m[3]);
    const month = MONTHS[Number(m[2]) - 1];
    if (!month || !day) return '';
    return day + ' ' + month + ' ' + m[1];
  }

  /** "2026-03-21" -> "21 Mar 2026", for the dense list views. */
  function formatShortDate(iso) {
    const long = formatLongDate(iso);
    if (!long) return '';
    const parts = long.split(' ');
    return parts[0] + ' ' + parts[1].slice(0, 3) + ' ' + parts[2];
  }

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** Filesystem-safe: drop combining marks, keep letters/digits, spaces -> "-". */
  function sanitizeForFilename(name) {
    return String(name || '')
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /** FNV-1a, so the same document always yields the same watermark field. */
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** mulberry32 — small, fast, well-distributed seeded PRNG. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    MONTHS, $, $$, digitsOnly, escapeHtml, formatRupiah, groupDigits,
    reformatPriceField, formatLongDate, formatShortDate, todayISO,
    sanitizeForFilename, hashString, mulberry32
  };
})();
