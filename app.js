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

  const PDF_PAGE_WIDTH_PT = 595.28;  // A4 width, so the file still prints sensibly
  const SNAPSHOT_SCALE = 3;
  const Q_PAD = 32;                  // the document's own padding, in CSS px
  const CAPTURE_SLACK = 240;         // spare CSS px below the page, trimmed after

  /* Watermark: the document background is a soft, grainy field generated from a
     seed made of the quotation's own contents. Any edit to the name, items,
     prices or date yields a completely different field, so a tampered copy no
     longer matches the one that was sent. */
  const WM_BASE = '#EBE9E4';
  const WM_TONES = [
    [255, 253, 250],   // white
    [251, 247, 240],   // ivory
    [245, 239, 228],   // cream
    [236, 228, 213],   // light sand
    [219, 206, 184],   // sand
    [199, 183, 156]    // warm brown, used sparingly
  ];
  const WM_FIELD_W = 48;   // gradients are painted small and upscaled -> soft blur
  const WM_GRAIN = 21;     // overlay noise spread around mid-grey

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

  /* ------------------------------- Watermark ----------------------------- */

  /** FNV-1a, so the same quotation always yields the same field. */
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

  /** Everything that identifies this quotation, in a stable order. */
  function watermarkSeed(items) {
    return [
      el.customerName.value.trim(),
      el.quoteDate.value,
      items.map((it) => it.name + '×' + it.qty + '@' + it.price).join('|')
    ].join('::');
  }

  /**
   * Big, soft tonal washes + film grain, sized to the document at snapshot
   * scale. Returns a canvas to composite under the page — never a data URL,
   * which at this resolution would be tens of megabytes of un-compressible
   * noise.
   */
  function buildWatermark(seed, cssW, cssH, scale) {
    const rand = mulberry32(hashString(seed));
    const W = Math.round(cssW * scale);
    const H = Math.round(cssH * scale);

    // The washes are painted into a tiny canvas and blown up ~12x, which is
    // what gives them their softness for free. Few and large, so they read as
    // one flowing field rather than a cluster of spots.
    const fw = WM_FIELD_W;
    const fh = Math.max(16, Math.round(fw * cssH / cssW));
    const field = document.createElement('canvas');
    field.width = fw;
    field.height = fh;
    const fc = field.getContext('2d');
    fc.fillStyle = WM_BASE;
    fc.fillRect(0, 0, fw, fh);

    const blobs = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < blobs; i++) {
      const tone = WM_TONES[Math.floor(rand() * WM_TONES.length)];
      const cx = rand() * fw;
      const cy = rand() * fh;
      const r = (0.45 + rand() * 0.55) * fw;
      const squash = 0.45 + rand() * 0.9;     // ellipses, not circles
      const angle = rand() * Math.PI;
      // Darker tones are held back further so the field stays a whisper.
      const alpha = (0.12 + rand() * 0.26) * (tone[0] < 225 ? 0.45 : 1);

      fc.save();
      fc.translate(cx, cy);
      fc.rotate(angle);
      fc.scale(1, squash);
      const g = fc.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(' + tone + ',' + alpha.toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(' + tone + ',' + (alpha * 0.45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + tone + ',0)');
      fc.fillStyle = g;
      fc.fillRect(-fw * 2, -fh * 2, fw * 4, fh * 4);
      fc.restore();
    }

    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const oc = out.getContext('2d');
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(field, 0, 0, W, H);

    // Grain is generated at CSS resolution and blown up with smoothing OFF, so
    // each particle is a crisp scale x scale block. Generating it per device
    // pixel instead makes it far too fine — it averages away to flat mush.
    const gw = Math.round(cssW);
    const gh = Math.round(cssH);
    const grain = document.createElement('canvas');
    grain.width = gw;
    grain.height = gh;
    const gc = grain.getContext('2d');
    const gimg = gc.createImageData(gw, gh);
    const gd = gimg.data;
    for (let i = 0; i < gd.length; i += 4) {
      // Mid-grey is a no-op under "overlay"; the spread around it is the grain.
      const v = 128 + (rand() - 0.5) * WM_GRAIN * 2;
      gd[i] = gd[i + 1] = gd[i + 2] = v;
      gd[i + 3] = 255;
    }
    gc.putImageData(gimg, 0, 0);

    oc.globalCompositeOperation = 'overlay';
    oc.imageSmoothingEnabled = false;
    oc.drawImage(grain, 0, 0, W, H);
    oc.globalCompositeOperation = 'source-over';

    return out;
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
    customInclude: $('#customInclude'),
    addInclude: $('#addInclude'),
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
    qIncludes: $('#qIncludes')
  };

  const REMOVE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

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
    el.customInclude.value = '';
    el.sampleNotice.hidden = true;
    update();
    showToast('Sample data cleared');
  }

  /* -------------------------------- Includes ----------------------------- */

  /** A standing chip: label only, toggled on and off. */
  function fixedChip(label) {
    return '<label class="chip is-checked" data-label="' + escapeHtml(label) + '">' +
      '<input type="checkbox" checked>' +
      '<span class="chip__box">' + CHECK_ICON + '</span>' +
      '<span>' + escapeHtml(label) + '</span>' +
    '</label>';
  }

  /**
   * A user-added chip. The remove button sits beside the label rather than
   * inside it — nesting a button in a <label> makes every click on it toggle
   * the checkbox too.
   */
  function customChip(label) {
    return '<span class="chip chip--custom is-checked" data-label="' + escapeHtml(label) + '">' +
      '<label class="chip__main">' +
        '<input type="checkbox" checked>' +
        '<span class="chip__box">' + CHECK_ICON + '</span>' +
        '<span>' + escapeHtml(label) + '</span>' +
      '</label>' +
      '<button type="button" class="chip__remove js-remove-include" ' +
        'aria-label="Remove ' + escapeHtml(label) + '">' + CLOSE_ICON + '</button>' +
    '</span>';
  }

  function buildIncludes() {
    el.includesList.innerHTML = INCLUDES.map(fixedChip).join('');
  }

  const includeLabels = () =>
    Array.prototype.slice.call(el.includesList.querySelectorAll('[data-label]'))
      .map((chip) => chip.dataset.label);

  const checkedIncludes = () =>
    Array.prototype.slice.call(el.includesList.querySelectorAll('.chip'))
      .filter((chip) => $('input', chip).checked)
      .map((chip) => chip.dataset.label);

  function addCustomInclude() {
    const label = el.customInclude.value.trim().replace(/\s+/g, ' ');
    if (!label) return;

    const existing = includeLabels();
    const match = existing.findIndex((l) => l.toLowerCase() === label.toLowerCase());
    if (match !== -1) {
      // Already on the list — just make sure it is ticked, and say so.
      const chip = el.includesList.querySelectorAll('.chip')[match];
      $('input', chip).checked = true;
      chip.classList.add('is-checked');
      el.customInclude.value = '';
      renderQuotation();
      showToast('"' + label + '" is already on the list');
      return;
    }

    el.includesList.insertAdjacentHTML('beforeend', customChip(label));
    el.customInclude.value = '';
    el.customInclude.focus();
    renderQuotation();
  }

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

  /* html2canvas renders from a clone of the document inside its own iframe. That
     iframe is a fresh layout environment: it resolves fonts independently of
     this document, and the page's viewport meta does not apply inside it. Both
     have to be pinned down here or the clone lays text out differently from what
     was measured. The autosize lock is belt and braces — styles.css sets it on
     .q too, this only covers the clone being styled late. */
  async function cloneReady(doc) {
    const root = doc.documentElement;
    if (root) {
      root.style.setProperty('-webkit-text-size-adjust', 'none');
      root.style.setProperty('text-size-adjust', 'none');
    }
    if (!doc.fonts) return;
    try {
      await Promise.all([
        doc.fonts.load('400 13px "Plus Jakarta Sans"'),
        doc.fonts.load('600 13px "Plus Jakarta Sans"'),
        doc.fonts.load('600 44px "Plus Jakarta Sans"')
      ]);
      await doc.fonts.ready;
    } catch (e) { /* fall through to the system fallback */ }
  }

  /* Crop the transparent band off the bottom of a capture, then give back the
     document's own bottom padding. The page is snapshotted taller than it
     measured, so whatever the clone actually laid out is inside the canvas;
     this finds where the ink really ends rather than trusting the measurement. */
  function trimToContent(src, padPx, minHeight) {
    const ctx = src.getContext('2d');
    const w = src.width;

    // Only the band below minHeight can be spare — read it in one go and walk
    // up it, rather than paying for a getImageData call per row of the page.
    const top = Math.max(0, Math.min(minHeight, src.height));
    const band = src.height - top;
    if (band <= 0) return src;

    const data = ctx.getImageData(0, top, w, band).data;
    let last = -1;
    for (let y = band - 1; y >= 0 && last < 0; y--) {
      const start = y * w * 4;
      for (let i = start + 3; i < start + w * 4; i += 4) {
        if (data[i] > 0) { last = top + y; break; }
      }
    }
    // Nothing spilled past the measured height: drop the whole spare band.
    // Otherwise keep down to the last ink and give back the bottom padding, but
    // never crop above the measured height — the trailing transparent pixels
    // inside the signature mark are part of the design, not overflow.
    const height = last < 0
      ? top
      : Math.min(src.height, Math.max(top, Math.round(last + 1 + padPx)));
    if (height === src.height) return src;

    const out = document.createElement('canvas');
    out.width = w;
    out.height = height;
    out.getContext('2d').drawImage(src, 0, 0);
    return out;
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

      const docW = el.quotation.offsetWidth;
      const measuredH = el.quotation.offsetHeight;

      // Snapshot the page over nothing, so the seeded field shows through.
      el.quotation.style.backgroundColor = 'transparent';
      let raw;
      try {
        raw = await html2canvas(el.quotation, {
          scale: SNAPSHOT_SCALE,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          width: docW,
          // Capture with slack below the measured height. html2canvas lays the
          // clone out itself, so its text can land a line or two lower than the
          // live DOM did; without slack that overflow is simply clipped off the
          // bottom of the page. The extra band is transparent and trimmed below.
          height: measuredH + CAPTURE_SLACK,
          onclone: cloneReady
        });
      } finally {
        el.quotation.style.backgroundColor = '';
      }

      const page = trimToContent(
        raw, Q_PAD * SNAPSHOT_SCALE, measuredH * SNAPSHOT_SCALE
      );
      const docH = page.height / SNAPSHOT_SCALE;

      const watermark = buildWatermark(
        watermarkSeed(readItems()), docW, docH, SNAPSHOT_SCALE
      );

      const canvas = document.createElement('canvas');
      canvas.width = page.width;
      canvas.height = page.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(watermark, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(page, 0, 0);

      const pageHeight = PDF_PAGE_WIDTH_PT * (canvas.height / canvas.width);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [PDF_PAGE_WIDTH_PT, pageHeight],
        compress: true
      });

      // JPEG, not PNG: the grain is un-compressible noise that would push a
      // lossless page well past 10 MB. At 3x, 0.95 leaves no visible artefacts.
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95), 'JPEG',
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
      } else if (input.classList.contains('js-price')) {
        reformatPriceField(input);
      }
      input.classList.remove('is-invalid');
      const errNode = $('.js-err', input.closest('.item'));
      if (errNode) errNode.hidden = true;
      update();
    });

    el.itemList.addEventListener('focusout', (e) => {
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

    el.includesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-remove-include');
      if (!btn) return;
      e.preventDefault();
      btn.closest('.chip').remove();
      renderQuotation();
    });

    el.addInclude.addEventListener('click', addCustomInclude);

    el.customInclude.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomInclude();
      }
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
