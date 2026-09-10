/* Quotation and invoice PDF render engine.
   
   - Owns: Payment terms normalization, document template rendering, paper textures, and PDF export via html2canvas & jsPDF.
   - Does NOT own: App state, persistence, route handling, or download logging.
   - Used by: app.js, tests/pure-modules.test.cjs
*/
window.KK = window.KK || {};

KK.docs = (function () {
  'use strict';

  const U = KK.util;
  const $ = U.$;

  /* ------------------------------- Constants ------------------------------ */

  const STANDARD_TERMS = [
    { label: '1st deposit', percent: 35, desc: 'To confirm order and start the design phase.' },
    { label: '2nd deposit', percent: 35, desc: 'Upon design approval to start production phase.' },
    { label: '3rd deposit', percent: 30, desc: 'After final fitting, 7 days before delivery.' }
  ];

  const termLabel = (term) => term.label + ' - ' + term.percent + '%';

  const CAPTURE_FONTS = [
    '300 13px "Aileron"',
    '400 13px "Aileron"',
    '400 44px "Aileron"'
  ];

  const PDF_WIDTH_PT = 595.28; // Standard A4 width in points

  const WATERMARK_TONES = [
    [255, 253, 250], // white
    [251, 247, 240], // ivory
    [245, 239, 228], // cream
    [236, 228, 213], // light sand
    [219, 206, 184], // sand
    [199, 183, 156]  // tan
  ];

  const DOCS = {
    quotation: { node: 'quotation', name: 'Quotation' },
    invoice: { node: 'invoice', name: 'Invoice' }
  };

  const elements = {
    quotation: $('#quotation'),
    qFor: $('#qFor'),
    qDate: $('#qDate'),
    qDear: $('#qDear'),
    qItems: $('#qItems'),
    qIncludes: $('#qIncludes'),
    qPaymentRow: $('#qPaymentRow'),
    invoice: $('#invoice'),
    iFor: $('#iFor'),
    iDate: $('#iDate'),
    iItems: $('#iItems'),
    iTerms: $('#iTerms')
  };

  /* -------------------------- Pure Document Calculations ------------------ */

  function computeTotal(items) {
    return (items || []).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }

  function termAmounts(total, termsList) {
    const terms = termsList || STANDARD_TERMS;
    let accumulated = 0;
    return terms.map((item, index) => {
      if (index === terms.length - 1) return total - accumulated;
      const amount = Math.round(total * (Number(item.percent) || 0) / 100);
      accumulated += amount;
      return amount;
    });
  }

  function itemRowsHtml(items, total, includeQty) {
    const validItems = (items || []).filter((item) => String(item.name || '').trim() !== '');
    const rows = validItems.map((item) =>
      '<div class="q-row"><p class="q-c-item">' + U.escapeHtml(item.name) + '</p>' +
      (includeQty ? '<p class="q-c-qty">' + (Number(item.qty) || 0) + '</p>' : '') +
      '<p class="q-c-price">' + U.formatRupiah(item.price) + '</p></div>'
    );
    rows.push('<div class="q-row q-row--total"><p class="q-c-item">Total</p><p class="q-c-price">' + U.formatRupiah(total) + '</p></div>');
    return rows.join('');
  }

  function termsFor(orderRecord) {
    const customTerms = orderRecord && orderRecord.payment_terms || [];
    if (orderRecord && orderRecord.payment_scheme === 'other' && customTerms.length) {
      return customTerms.map((t) => ({
        label: String(t.label || '').trim() || 'Payment',
        percent: Number(t.percent) || 0,
        desc: String(t.desc || '')
      }));
    }
    return STANDARD_TERMS.slice();
  }

  /* --------------------------- DOM Template Rendering --------------------- */

  function invoiceTermFor(orderData, totalAmount, terms) {
    const index = Number(orderData.invoiceTermIndex);
    if (!Number.isInteger(index) || index < 0 || index >= terms.length) {
      throw new Error('Choose a valid invoice termin');
    }
    return {
      index,
      number: index + 1,
      count: terms.length,
      term: terms[index],
      amount: termAmounts(totalAmount, terms)[index]
    };
  }

  function render(docType, orderData) {
    const clientName = String(orderData.docName || '').trim();
    const items = orderData.items || [];
    const includesList = orderData.includes || [];
    const terms = orderData.terms && orderData.terms.length ? orderData.terms : STANDARD_TERMS;
    const totalAmount = computeTotal(items);
    const dateFormatted = U.formatLongDate(orderData.date);
    const invoiceTerm = 'invoice' === docType ? invoiceTermFor(orderData, totalAmount, terms) : null;

    elements.qFor.textContent = clientName;
    elements.qDate.textContent = dateFormatted;
    elements.qDear.textContent = 'Dear ' + clientName + ',';
    elements.qItems.innerHTML = itemRowsHtml(items, totalAmount, true);
    elements.qIncludes.innerHTML = '<p class="q-b">Includes:</p>' +
      includesList.map((inc, i) =>
        '<span class="q-inc"><span>' + U.escapeHtml(inc) + '</span>' +
        (i < includesList.length - 1 ? '<span class="q-dot"></span>' : '') +
        '</span>'
      ).join('');

    elements.qPaymentRow.innerHTML = terms.map((t) =>
      '<div class="q-deposit"><p class="q-b">' + U.escapeHtml(t.label) + ': ' + (Number(t.percent) || 0) + '%</p>' +
      (t.desc ? '<p class="q-depdesc">' + U.escapeHtml(t.desc) + '</p>' : '') +
      '</div>'
    ).join('');

    elements.iFor.textContent = clientName;
    elements.iDate.textContent = dateFormatted;
    elements.iItems.innerHTML = itemRowsHtml(items, totalAmount, false);
    if (invoiceTerm) {
      elements.iTerms.innerHTML =
        '<p class="inv-due__termin">Termin ' + invoiceTerm.number + ' of ' + invoiceTerm.count + '</p>' +
        '<p class="inv-due__label">' + U.escapeHtml(termLabel(invoiceTerm.term)) + '</p>' +
        '<div class="inv-due__amount"><span>Amount due</span><strong>' + U.formatRupiah(invoiceTerm.amount) + '</strong></div>';
    }

    return invoiceTerm ? invoiceTerm.amount : totalAmount;
  }

  /* -------------------------- Offscreen Capture Pipeline ------------------- */

  async function cloneReady(docClone) {
    const rootEl = docClone.documentElement;
    if (rootEl) {
      rootEl.style.setProperty('-webkit-text-size-adjust', 'none');
      rootEl.style.setProperty('text-size-adjust', 'none');
    }
    if (docClone.fonts) {
      try {
        await Promise.all(CAPTURE_FONTS.map((font) => docClone.fonts.load(font)));
        await docClone.fonts.ready;
      } catch (_) {}
    }
  }

  async function ensureFontsLoaded() {
    if (document.fonts) {
      try {
        await Promise.all(CAPTURE_FONTS.map((font) => document.fonts.load(font)));
        await document.fonts.ready;
      } catch (_) {}
    }
  }

  function ensureImagesLoaded(containerEl) {
    const imgs = U.$$('img', containerEl);
    return Promise.all(imgs.map((img) => img.complete && img.naturalWidth ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; })));
  }

  function trimOverflow(canvas, padPx, measuredHeight) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const searchStart = Math.max(0, Math.min(measuredHeight, canvas.height));
    const searchHeight = canvas.height - searchStart;
    if (searchHeight <= 0) return canvas;

    const imgData = ctx.getImageData(0, searchStart, width, searchHeight).data;
    let lastInkY = -1;
    for (let y = searchHeight - 1; y >= 0 && lastInkY < 0; y--) {
      const rowOffset = y * width * 4;
      for (let x = rowOffset + 3; x < rowOffset + 4 * width; x += 4) {
        if (imgData[x] > 0) {
          lastInkY = searchStart + y;
          break;
        }
      }
    }

    const finalHeight = lastInkY < 0
      ? searchStart
      : Math.min(canvas.height, Math.max(searchStart, Math.round(lastInkY + 1 + padPx)));

    if (finalHeight === canvas.height) return canvas;
    const trimmed = document.createElement('canvas');
    trimmed.width = width;
    trimmed.height = finalHeight;
    trimmed.getContext('2d').drawImage(canvas, 0, 0);
    return trimmed;
  }

  function seedString(type, orderData) {
    return [
      type,
      String(orderData.docName || '').trim(),
      orderData.date || '',
      (orderData.items || []).map((i) => i.name + '×' + i.qty + '@' + i.price).join('|')
    ].join('::');
  }

  function createWatermarkPattern(seedText, widthCss, heightCss, scale) {
    const rng = U.mulberry32(U.hashString(seedText));
    const canvasWidth = Math.round(widthCss * scale);
    const canvasHeight = Math.round(heightCss * scale);
    const fieldW = 48;
    const fieldH = Math.max(16, Math.round(fieldW * heightCss / widthCss));

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = fieldW;
    patternCanvas.height = fieldH;
    const pCtx = patternCanvas.getContext('2d');
    pCtx.fillStyle = '#EBE9E4';
    pCtx.fillRect(0, 0, fieldW, fieldH);

    const blotCount = 5 + Math.floor(4 * rng());
    for (let i = 0; i < blotCount; i++) {
      const tone = WATERMARK_TONES[Math.floor(rng() * WATERMARK_TONES.length)];
      const cx = rng() * fieldW;
      const cy = rng() * fieldH;
      const rx = (0.45 + 0.55 * rng()) * fieldW;
      const ry = 0.45 + 0.9 * rng();
      const angle = rng() * Math.PI;
      const alpha = (0.12 + 0.26 * rng()) * (tone[0] < 225 ? 0.45 : 1);

      pCtx.save();
      pCtx.translate(cx, cy);
      pCtx.rotate(angle);
      pCtx.scale(1, ry);

      const grad = pCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, 'rgba(' + tone + ',' + alpha.toFixed(3) + ')');
      grad.addColorStop(0.55, 'rgba(' + tone + ',' + (0.45 * alpha).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + tone + ',0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(-96, 2 * -fieldH, 192, 4 * fieldH);
      pCtx.restore();
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvasWidth;
    outputCanvas.height = canvasHeight;
    const oCtx = outputCanvas.getContext('2d');
    oCtx.imageSmoothingEnabled = true;
    oCtx.imageSmoothingQuality = 'high';
    oCtx.drawImage(patternCanvas, 0, 0, canvasWidth, canvasHeight);

    const cssW = Math.round(widthCss);
    const cssH = Math.round(heightCss);
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = cssW;
    grainCanvas.height = cssH;
    const gCtx = grainCanvas.getContext('2d');
    const imgData = gCtx.createImageData(cssW, cssH);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = 128 + 21 * (rng() - 0.5) * 2;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = noise;
      pixels[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);

    oCtx.globalCompositeOperation = 'overlay';
    oCtx.imageSmoothingEnabled = false;
    oCtx.drawImage(grainCanvas, 0, 0, canvasWidth, canvasHeight);
    oCtx.globalCompositeOperation = 'source-over';

    return outputCanvas;
  }

  function pdfFilename(docType, orderData) {
    const prefix = DOCS[docType].name + '-KelakKembali-';
    const dateStr = orderData.date || U.todayISO();
    const sanitizedName = U.sanitizeForFilename(orderData.docName);
    const namePart = sanitizedName ? sanitizedName + '-' : '';
    const terminPart = 'invoice' === docType ? 'Termin-' + (Number(orderData.invoiceTermIndex) + 1) + '-' : '';
    return prefix + namePart + terminPart + dateStr + '.pdf';
  }

  /* --------------------------- PDF Download Method ------------------------- */

  async function download(docType, orderData) {
    const targetNode = elements[DOCS[docType].node];
    const totalAmount = render(docType, orderData);

    await ensureFontsLoaded();
    await ensureImagesLoaded(targetNode);

    const cssWidth = targetNode.offsetWidth;
    const cssHeight = targetNode.offsetHeight;
    let canvasSnapshot;

    targetNode.style.backgroundColor = 'transparent';
    try {
      canvasSnapshot = await window.html2canvas(targetNode, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: cssWidth,
        height: cssHeight + 240,
        onclone: cloneReady
      });
    } finally {
      targetNode.style.backgroundColor = '';
    }

    const trimmedCanvas = trimOverflow(canvasSnapshot, 192, 3 * cssHeight);
    const scaledHeight = trimmedCanvas.height / 3;

    const watermarkCanvas = createWatermarkPattern(seedString(docType, orderData), cssWidth, scaledHeight, 3);
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = trimmedCanvas.width;
    compositeCanvas.height = trimmedCanvas.height;

    const compCtx = compositeCanvas.getContext('2d');
    compCtx.drawImage(watermarkCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
    compCtx.drawImage(trimmedCanvas, 0, 0);

    const pdfHeightPt = PDF_WIDTH_PT * (compositeCanvas.height / compositeCanvas.width);
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [PDF_WIDTH_PT, pdfHeightPt],
      compress: true
    });

    pdfDoc.addImage(compositeCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PDF_WIDTH_PT, pdfHeightPt, undefined, 'FAST');
    pdfDoc.save(pdfFilename(docType, orderData));

    return totalAmount;
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    DOCS,
    STANDARD_TERMS,
    termsFor,
    termLabel,
    termAmounts,
    computeTotal,
    render,
    download
  };
})();
