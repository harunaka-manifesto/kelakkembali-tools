/* Kelak Kembali — Quotation Generator
   Client-side only. Fills the locked quotation template and exports it as a
   single-page PDF via html2canvas + jsPDF. */

(function () {
  'use strict';

  /* ------------------------------- Constants ----------------------------- */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const INCLUDES = [
    'Custom design & consultation',
    'Production',
    'Standard fabric',
    'Plain veil',
    'Fitting',
    'Laundry'
  ];

  const SAMPLE_ITEMS = [
    { name: 'Contemporary bridal suit with one detachable element', qty: 1, price: 7225000 },
    { name: 'Bridal skirt', qty: 1, price: 1250000 }
  ];

  const DEPOSITS = [0.35, 0.35, 0.30];

  const PDF_PAGE_WIDTH_PT = 595.28;  // A4 width, so the file still prints sensibly
  const SNAPSHOT_SCALE = 3;

  /* -------------------------------- Helpers ------------------------------ */

  const $ = (sel, root) => (root || document).querySelector(sel);

  const digitsOnly = (str) => String(str == null ? '' : str).replace(/[^\d]/g, '');

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => (
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

  /** "2026-03-21" -> "21 March 2026" (no leading zero, full month name). */
  function formatLongDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    const day = Number(m[3]);
    const month = MONTHS[Number(m[2]) - 1];
    if (!month || !day) return '';
    return day + ' ' + month + ' ' + m[1];
  }

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** 35/35/30 of total, rounded, with the remainder absorbed by the 3rd. */
  function splitDeposits(total) {
    const a = Math.round(total * DEPOSITS[0]);
    const b = Math.round(total * DEPOSITS[1]);
    return [a, b, total - a - b];
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

  /* -------------------------------- Elements ----------------------------- */

  const el = {
    customerName: $('#customerName'),
    errCustomerName: $('#errCustomerName'),
    quoteDate: $('#quoteDate'),
    itemList: $('#itemList'),
    addItem: $('#addItem'),
    includesList: $('#includesList'),
    sampleNotice: $('#sampleNotice'),
    clearSample: $('#clearSample'),
    totalDisplay: $('#totalDisplay'),
    downloadBtn: $('#downloadBtn'),
    toast: $('#toast'),
    quotation: $('#quotation'),
    qFor: $('#qFor'),
    qDate: $('#qDate'),
    qDear: $('#qDear'),
    qItems: $('#qItems'),
    qIncludes: $('#qIncludes'),
    qDep: [$('#qDep1'), $('#qDep2'), $('#qDep3')]
  };

  const REMOVE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  /* ------------------------------- Item rows ----------------------------- */

  function createItemRow(data) {
    const item = data || { name: '', qty: 1, price: '' };
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
      '<span class="err js-err" hidden></span>';

    $('.js-name', row).value = item.name;
    $('.js-qty', row).value = item.qty;
    $('.js-price', row).value = item.price === '' ? '' : groupDigits(item.price);
    return row;
  }

  function addItemRow(data, focus) {
    const row = createItemRow(data);
    el.itemList.appendChild(row);
    refreshRemoveButtons();
    if (focus) $('.js-name', row).focus();
    return row;
  }

  function rowElements() {
    return Array.prototype.slice.call(el.itemList.querySelectorAll('.item'));
  }

  function refreshRemoveButtons() {
    const rows = rowElements();
    rows.forEach((row) => { $('.js-remove', row).disabled = rows.length <= 1; });
  }

  /** Reads the current item state straight from the DOM inputs. */
  function readItems() {
    return rowElements().map((row) => ({
      row: row,
      name: $('.js-name', row).value.trim(),
      qtyRaw: digitsOnly($('.js-qty', row).value),
      priceRaw: digitsOnly($('.js-price', row).value),
      get qty() { return this.qtyRaw === '' ? 0 : Number(this.qtyRaw); },
      get price() { return this.priceRaw === '' ? 0 : Number(this.priceRaw); }
    }));
  }

  const computeTotal = (items) =>
    items.reduce((sum, it) => sum + it.qty * it.price, 0);

  /* ------------------------------ Sample state --------------------------- */

  /** The notice stays up for as long as the untouched sample rows are present. */
  function sampleStillPresent() {
    const items = readItems();
    return SAMPLE_ITEMS.every((sample) => items.some((it) =>
      it.name === sample.name &&
      it.qty === sample.qty &&
      it.price === sample.price
    ));
  }

  function refreshSampleNotice() {
    el.sampleNotice.hidden = !sampleStillPresent();
  }

  function clearSampleData() {
    el.itemList.innerHTML = '';
    addItemRow({ name: '', qty: 1, price: '' }, false);
    el.includesList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
      cb.closest('.chip').classList.remove('is-checked');
    });
    el.sampleNotice.hidden = true;
    update();
    showToast('Sample data cleared');
  }

  /* -------------------------------- Includes ----------------------------- */

  function buildIncludes() {
    el.includesList.innerHTML = INCLUDES.map((label, i) =>
      '<label class="chip is-checked">' +
        '<input type="checkbox" value="' + i + '" checked>' +
        '<span class="chip__box">' + CHECK_ICON + '</span>' +
        '<span>' + escapeHtml(label) + '</span>' +
      '</label>'
    ).join('');
  }

  const checkedIncludes = () =>
    Array.prototype.slice.call(el.includesList.querySelectorAll('input:checked'))
      .map((cb) => INCLUDES[Number(cb.value)]);

  /* --------------------------- Quotation rendering ----------------------- */

  function renderQuotation() {
    const name = el.customerName.value.trim();
    const items = readItems();
    const total = computeTotal(items);

    el.qFor.textContent = name;
    el.qDate.textContent = formatLongDate(el.quoteDate.value);
    el.qDear.textContent = 'Dear ' + name + ',';

    const rows = items
      .filter((it) => it.name !== '')
      .map((it) =>
        '<div class="q-row">' +
          '<p class="q-c-item">' + escapeHtml(it.name) + '</p>' +
          '<p class="q-c-qty">' + it.qty + '</p>' +
          '<p class="q-c-price">' + formatRupiah(it.price) + '</p>' +
        '</div>'
      );

    rows.push(
      '<div class="q-row q-row--total">' +
        '<p class="q-c-item">Total</p>' +
        '<p class="q-c-qty"></p>' +
        '<p class="q-c-price">' + formatRupiah(total) + '</p>' +
      '</div>'
    );
    el.qItems.innerHTML = rows.join('');

    const included = checkedIncludes();
    el.qIncludes.innerHTML = '<p class="q-b">Includes:</p>' + included.map((label, i) =>
      '<span class="q-inc">' +
        '<span>' + escapeHtml(label) + '</span>' +
        (i < included.length - 1 ? '<span class="q-dot"></span>' : '') +
      '</span>'
    ).join('');

    const parts = splitDeposits(total);
    const ordinals = ['1st', '2nd', '3rd'];
    el.qDep.forEach((node, i) => {
      // Regular space before the dash, non-breaking space after it: a narrow
      // column wraps to "— Rp…" instead of stranding the dash at a line end.
      node.textContent = ordinals[i] + ' deposit: ' + Math.round(DEPOSITS[i] * 100) + '%' +
        ' \u2014\u00A0' + formatRupiah(parts[i]);
    });

    el.totalDisplay.textContent = formatRupiah(total);
  }

  function update() {
    renderQuotation();
    refreshSampleNotice();
  }

  /* ------------------------------- Validation ---------------------------- */

  function validate() {
    let firstBad = null;

    const nameOk = el.customerName.value.trim() !== '';
    el.errCustomerName.hidden = nameOk;
    el.customerName.classList.toggle('is-invalid', !nameOk);
    if (!nameOk) firstBad = el.customerName;

    readItems().forEach((it) => {
      const errNode = $('.js-err', it.row);
      const nameInput = $('.js-name', it.row);
      const qtyInput = $('.js-qty', it.row);
      const priceInput = $('.js-price', it.row);
      const problems = [];

      const hasName = it.name !== '';
      const hasQty = it.qtyRaw !== '' && it.qty >= 1;
      const hasPrice = it.priceRaw !== '';

      if (!hasName) problems.push('a description');
      if (!hasQty) problems.push('a quantity of at least 1');
      if (!hasPrice) problems.push('a price');

      nameInput.classList.toggle('is-invalid', !hasName);
      qtyInput.classList.toggle('is-invalid', !hasQty);
      priceInput.classList.toggle('is-invalid', !hasPrice);

      if (problems.length) {
        errNode.textContent = 'This item needs ' + problems.join(', ') + '.';
        errNode.hidden = false;
        if (!firstBad) firstBad = !hasName ? nameInput : (!hasQty ? qtyInput : priceInput);
      } else {
        errNode.hidden = true;
      }
    });

    if (firstBad) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBad.focus({ preventScroll: true });
    }
    return !firstBad;
  }

  /* ----------------------------- PDF generation -------------------------- */

  function imagesReady(root) {
    const imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
    return Promise.all(imgs.map((img) => (
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => { img.onload = img.onerror = res; })
    )));
  }

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.all([
        document.fonts.load('400 13px "Plus Jakarta Sans"'),
        document.fonts.load('600 13px "Plus Jakarta Sans"'),
        document.fonts.load('600 44px "Plus Jakarta Sans"')
      ]);
      await document.fonts.ready;
    } catch (e) { /* fall through to the system fallback */ }
  }

  function buildFilename() {
    const iso = el.quoteDate.value || todayISO();
    const safe = sanitizeForFilename(el.customerName.value);
    return safe
      ? 'Quotation-KelakKembali-' + safe + '-' + iso + '.pdf'
      : 'Quotation-KelakKembali-' + iso + '.pdf';
  }

  async function downloadPdf() {
    if (!validate()) {
      showToast('Please complete the highlighted fields');
      return;
    }

    setBusy(true);
    try {
      renderQuotation();
      await fontsReady();
      await imagesReady(el.quotation);

      const canvas = await html2canvas(el.quotation, {
        scale: SNAPSHOT_SCALE,
        backgroundColor: '#E4E2DD',
        useCORS: true,
        logging: false,
        width: el.quotation.offsetWidth,
        height: el.quotation.offsetHeight
      });

      const pageHeight = PDF_PAGE_WIDTH_PT * (canvas.height / canvas.width);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [PDF_PAGE_WIDTH_PT, pageHeight],
        compress: true
      });

      pdf.addImage(
        canvas.toDataURL('image/png'), 'PNG',
        0, 0, PDF_PAGE_WIDTH_PT, pageHeight, undefined, 'FAST'
      );
      pdf.save(buildFilename());
      showToast('Quotation downloaded');
    } catch (err) {
      console.error(err);
      showToast('Could not generate the PDF — please try again');
    } finally {
      setBusy(false);
    }
  }

  function setBusy(busy) {
    el.downloadBtn.disabled = busy;
    el.downloadBtn.classList.toggle('is-busy', busy);
    $('.btn__label', el.downloadBtn).textContent =
      busy ? 'Generating…' : 'Download Quotation PDF';
  }

  let toastTimer;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2600);
  }

  /* --------------------------------- Events ------------------------------ */

  function bindEvents() {
    el.customerName.addEventListener('input', () => {
      if (el.customerName.value.trim()) {
        el.customerName.classList.remove('is-invalid');
        el.errCustomerName.hidden = true;
      }
      renderQuotation();
    });

    el.quoteDate.addEventListener('change', renderQuotation);
    el.quoteDate.addEventListener('input', renderQuotation);

    el.addItem.addEventListener('click', () => {
      addItemRow({ name: '', qty: 1, price: '' }, true);
      update();
    });

    el.clearSample.addEventListener('click', clearSampleData);

    el.itemList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove');
      if (!btn || btn.disabled) return;
      btn.closest('.item').remove();
      refreshRemoveButtons();
      update();
    });

    el.itemList.addEventListener('input', (e) => {
      const input = e.target;
      if (input.classList.contains('js-qty')) {
        input.value = digitsOnly(input.value).replace(/^0+(?=\d)/, '');
      }
      input.classList.remove('is-invalid');
      const errNode = $('.js-err', input.closest('.item'));
      if (errNode) errNode.hidden = true;
      update();
    });

    // Raw digits while editing a price, grouped display once focus leaves.
    el.itemList.addEventListener('focusin', (e) => {
      if (e.target.classList.contains('js-price')) {
        e.target.value = digitsOnly(e.target.value);
      }
    });

    el.itemList.addEventListener('focusout', (e) => {
      if (e.target.classList.contains('js-price')) {
        e.target.value = groupDigits(e.target.value);
      }
      if (e.target.classList.contains('js-qty') && digitsOnly(e.target.value) === '') {
        e.target.value = '1';
        update();
      }
    });

    el.includesList.addEventListener('change', (e) => {
      const cb = e.target;
      if (cb.type !== 'checkbox') return;
      cb.closest('.chip').classList.toggle('is-checked', cb.checked);
      renderQuotation();
    });

    el.downloadBtn.addEventListener('click', downloadPdf);
  }

  /* ---------------------------------- Init -------------------------------- */

  function init() {
    el.quoteDate.value = todayISO();
    buildIncludes();
    SAMPLE_ITEMS.forEach((item) => addItemRow(item, false));
    bindEvents();
    update();
  }

  init();
})();
