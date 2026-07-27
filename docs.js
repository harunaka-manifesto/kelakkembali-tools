/* Kelak Kembali — the document engine.

   Owns the two locked templates: fills them from a plain data object and
   exports either as a single-page PDF via html2canvas + jsPDF. Knows nothing
   about the form, the database or the views — hand it
   { docName, date, items, includes, terms } and it renders. docName is the
   order's own document name, not the customer's; terms is its payment split,
   which falls back to the standing package's when empty.

   The templates themselves live in index.html under .stage, and their CSS is
   Parts 2 and 3 of styles.css. Neither is to be restyled: only the data
   inside them changes. */

window.KK = window.KK || {};

KK.docs = (function () {
  'use strict';

  const U = KK.util;
  const $ = U.$;

  /* ------------------------------- Constants ----------------------------- */

  /* The wedding-attire package's terms. The quotation prints the percentage and
     the description, the invoice prints the rupiah amount — same three rows,
     read two ways.

     An order can carry its own list instead (payment_scheme 'other'), for work
     that is not quoted on the standing split. Standard orders store nothing and
     read these, so the package's terms stay in one place. */
  const STANDARD_TERMS = [
    { label: '1st deposit', percent: 35, desc: 'To confirm order and start the design phase.' },
    { label: '2nd deposit', percent: 35, desc: 'Upon design approval to start production phase.' },
    { label: '3rd deposit', percent: 30, desc: 'After final fitting, 7 days before delivery.' }
  ];

  /** The terms an order is actually on — its own if it has any, else the package's. */
  function termsFor(order) {
    const own = (order && order.payment_terms) || [];
    return (order && order.payment_scheme === 'other' && own.length)
      ? own.map((t) => ({
          label: String(t.label || '').trim() || 'Payment',
          percent: Number(t.percent) || 0,
          desc: String(t.desc || '')
        }))
      : STANDARD_TERMS.slice();
  }

  /** "1st deposit - 35%" — the form both documents print it in. */
  const termLabel = (t) => t.label + ' - ' + t.percent + '%';

  /* Every face the two documents can paint with: .q-r is 300, .q-b is 400, and
     the 44px title is the only size that differs enough to be worth loading in
     its own right. Both the live document and html2canvas's clone wait on
     these, so neither can be snapshotted mid-swap. */
  const DOC_FACES = ['300 13px "Aileron"', '400 13px "Aileron"', '400 44px "Aileron"'];

  const PDF_PAGE_WIDTH_PT = 595.28;  // A4 width, so the file still prints sensibly
  const SNAPSHOT_SCALE = 3;
  const Q_PAD = 32;                  // the document's own padding, in CSS px
  const CAPTURE_SLACK = 240;         // spare CSS px below the page, trimmed after

  /* Watermark: the document background is a soft, grainy field generated from a
     seed made of the document's own contents. Any edit to the name, items,
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

  /* The two documents differ only in which node is snapshotted and how the
     file and messages are named — the capture path below is shared. */
  const DOCS = {
    quotation: { node: 'quotation', name: 'Quotation' },
    invoice:   { node: 'invoice',   name: 'Invoice' }
  };

  /* -------------------------------- Elements ----------------------------- */

  const el = {
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

  /* ------------------------------- Watermark ----------------------------- */

  /** Everything that identifies this document, in a stable order. The kind is
      part of it, so a quotation and the invoice drawn from the same figures
      still get fields of their own. */
  function watermarkSeed(kind, data) {
    return [
      kind,
      String(data.docName || '').trim(),
      data.date || '',
      (data.items || []).map((it) => it.name + '×' + it.qty + '@' + it.price).join('|')
    ].join('::');
  }

  /**
   * Big, soft tonal washes + film grain, sized to the document at snapshot
   * scale. Returns a canvas to composite under the page — never a data URL,
   * which at this resolution would be tens of megabytes of un-compressible
   * noise.
   */
  function buildWatermark(seed, cssW, cssH, scale) {
    const rand = U.mulberry32(U.hashString(seed));
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

  /* ---------------------------- Document rendering ------------------------ */

  const computeTotal = (items) =>
    (items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  /**
   * The terms split into rupiah. Every share but the last is rounded to the
   * nearest rupiah and the last takes whatever is left, so they always add up
   * to the Total exactly rather than drifting a rupiah off it.
   */
  function termAmounts(total, terms) {
    const list = terms || STANDARD_TERMS;
    let taken = 0;
    return list.map((t, i) => {
      if (i === list.length - 1) return total - taken;
      const amount = Math.round(total * (Number(t.percent) || 0) / 100);
      taken += amount;
      return amount;
    });
  }

  /** The items table, identical on both documents: named rows then the Total. */
  function itemRowsHtml(items, total) {
    const rows = (items || [])
      .filter((it) => String(it.name || '').trim() !== '')
      .map((it) =>
        '<div class="q-row">' +
          '<p class="q-c-item">' + U.escapeHtml(it.name) + '</p>' +
          '<p class="q-c-qty">' + (Number(it.qty) || 0) + '</p>' +
          '<p class="q-c-price">' + U.formatRupiah(it.price) + '</p>' +
        '</div>'
      );

    rows.push(
      '<div class="q-row q-row--total">' +
        '<p class="q-c-item">Total</p>' +
        '<p class="q-c-price">' + U.formatRupiah(total) + '</p>' +
      '</div>'
    );
    return rows.join('');
  }

  /** Fill both templates from one record. Cheap enough to call on every edit. */
  function render(data) {
    const name = String(data.docName || '').trim();
    const items = data.items || [];
    const includes = data.includes || [];
    const terms = data.terms && data.terms.length ? data.terms : STANDARD_TERMS;
    const total = computeTotal(items);
    const longDate = U.formatLongDate(data.date);
    const rows = itemRowsHtml(items, total);

    el.qFor.textContent = name;
    el.qDate.textContent = longDate;
    el.qDear.textContent = 'Dear ' + name + ',';
    el.qItems.innerHTML = rows;
    el.qIncludes.innerHTML = '<p class="q-b">Includes:</p>' + includes.map((label, i) =>
      '<span class="q-inc">' +
        '<span>' + U.escapeHtml(label) + '</span>' +
        (i < includes.length - 1 ? '<span class="q-dot"></span>' : '') +
      '</span>'
    ).join('');

    /* The quotation's terms block is filled from the order rather than sitting
       in the template, so an order on its own terms prints its own rows. */
    el.qPaymentRow.innerHTML = terms.map((t) =>
      '<div class="q-deposit">' +
        '<p class="q-b">' + U.escapeHtml(t.label) + ': ' + (Number(t.percent) || 0) + '%</p>' +
        (t.desc ? '<p class="q-depdesc">' + U.escapeHtml(t.desc) + '</p>' : '') +
      '</div>'
    ).join('');

    el.iFor.textContent = name;
    el.iDate.textContent = longDate;
    el.iItems.innerHTML = rows;
    el.iTerms.innerHTML = termAmounts(total, terms).map((amount, i) =>
      '<div class="q-row q-row--pair">' +
        '<p class="q-c-item">' + U.escapeHtml(termLabel(terms[i])) + '</p>' +
        '<p class="q-c-price">' + U.formatRupiah(amount) + '</p>' +
      '</div>'
    ).join('');

    return total;
  }

  /* ----------------------------- PDF generation -------------------------- */

  function imagesReady(root) {
    const imgs = U.$$('img', root);
    return Promise.all(imgs.map((img) => (
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => { img.onload = img.onerror = res; })
    )));
  }

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.all(DOC_FACES.map((face) => document.fonts.load(face)));
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
      await Promise.all(DOC_FACES.map((face) => doc.fonts.load(face)));
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

  function buildFilename(kind, data) {
    const prefix = DOCS[kind].name + '-KelakKembali-';
    const iso = data.date || U.todayISO();
    const safe = U.sanitizeForFilename(data.docName);
    return safe
      ? prefix + safe + '-' + iso + '.pdf'
      : prefix + iso + '.pdf';
  }

  /**
   * Render, snapshot and save. Resolves with the document's total so the
   * caller can log what was actually sent; throws on failure, so a download
   * that never happened is never logged as one.
   */
  async function download(kind, data) {
    const doc = el[DOCS[kind].node];
    const total = render(data);

    await fontsReady();
    await imagesReady(doc);

    const docW = doc.offsetWidth;
    const measuredH = doc.offsetHeight;

    // Snapshot the page over nothing, so the seeded field shows through.
    doc.style.backgroundColor = 'transparent';
    let raw;
    try {
      raw = await html2canvas(doc, {
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
      doc.style.backgroundColor = '';
    }

    const page = trimToContent(raw, Q_PAD * SNAPSHOT_SCALE, measuredH * SNAPSHOT_SCALE);
    const docH = page.height / SNAPSHOT_SCALE;

    const watermark = buildWatermark(watermarkSeed(kind, data), docW, docH, SNAPSHOT_SCALE);

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
    pdf.save(buildFilename(kind, data));

    return total;
  }

  return {
    DOCS, STANDARD_TERMS, termsFor, termLabel, termAmounts,
    computeTotal, render, download
  };
})();
