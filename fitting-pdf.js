/* Client-ready A4 snapshot of one fitting session.

   - Owns: A4 page geometry, natural-ratio image fitting, caption flow and
     overflow decisions, brand cover layout, and the generated jsPDF document.
   - Does NOT own: database access, Drive retrieval, toasts, busy UI, or saving
     the file. app.js resolves every image and decides what to do with the doc.
   - Used by: app.js
*/
window.KK = window.KK || {};

KK.fittingPdf = (function () {
  'use strict';

  const U = KK.util;

  /* ------------------------------- Geometry -------------------------------- */

  /* A4 portrait in points, the unit jsPDF measures in here. */
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  /* Reserved strip at the foot of every photo page for the page number and the
     signature line, so neither can ever collide with a tall image. */
  const FOOTER_H = 40;
  const BODY_TOP = MARGIN;
  const BODY_H = PAGE_H - MARGIN - FOOTER_H - MARGIN;

  const CAPTION_GAP = 16;
  const CAPTION_SIZE = 10;
  const CAPTION_LINE_H = 14;

  /* Below this the photo stops being the point of the page, so the caption
     yields instead and its tail continues on a branded caption page. */
  const MIN_IMAGE_H = 260;

  const CREAM = [254, 250, 241];
  const BLACK = [13, 13, 13];
  const INK_SOFT = [41, 41, 41];
  const RULE = [76, 76, 76];
  const ORANGE = [255, 106, 0];

  const LOGO_SRC = 'assets/logo-signature.png';
  const FOOTER_TEXT = 'Made with love for Ichaku';

  /* --------------------------- Pure layout maths --------------------------- */

  /* Contain, never cover: the whole photo is always inside the box and its
     natural ratio is never altered. Unknown natural sizes fall back to the
     full box rather than producing a zero-area draw. */
  function fitContain(naturalW, naturalH, maxW, maxH) {
    const w = Number(naturalW) > 0 ? Number(naturalW) : 0;
    const h = Number(naturalH) > 0 ? Number(naturalH) : 0;
    if (!w || !h) return { w: maxW, h: maxH };
    const scale = Math.min(maxW / w, maxH / h);
    return { w: w * scale, h: h * scale };
  }

  /* How many caption lines a full branded continuation page can hold. */
  function captionPageCapacity() {
    return Math.max(1, Math.floor(BODY_H / CAPTION_LINE_H));
  }

  /* One photo page's budget. The caption first shrinks the image; once the
     image is down to its readable minimum the caption is the thing that gives,
     and the remainder becomes overflow rather than being truncated. */
  function planPhotoPage(spec) {
    const lineCount = Math.max(0, Number(spec && spec.lineCount) || 0);
    const natW = spec && spec.naturalWidth;
    const natH = spec && spec.naturalHeight;

    if (!lineCount) {
      return { image: fitContain(natW, natH, CONTENT_W, BODY_H), linesOnPage: 0, overflowLines: 0 };
    }

    const captionH = lineCount * CAPTION_LINE_H;
    const roomyImageH = BODY_H - CAPTION_GAP - captionH;

    if (roomyImageH >= MIN_IMAGE_H) {
      return {
        image: fitContain(natW, natH, CONTENT_W, roomyImageH),
        linesOnPage: lineCount,
        overflowLines: 0
      };
    }

    const image = fitContain(natW, natH, CONTENT_W, MIN_IMAGE_H);
    const capacity = Math.max(0, Math.floor((BODY_H - image.h - CAPTION_GAP) / CAPTION_LINE_H));
    const linesOnPage = Math.min(lineCount, capacity);
    return { image, linesOnPage, overflowLines: lineCount - linesOnPage };
  }

  /* Customer-Stage-YYYY-MM-DD.pdf, with every reserved filename character and
     separator already gone through sanitizeForFilename. */
  function buildFilename(context) {
    const ctx = context || {};
    const session = ctx.session || {};
    const customer = ctx.customer || {};
    const parts = [
      U.sanitizeForFilename(customer.name || '') || 'Customer',
      U.sanitizeForFilename(U.fittingStage(session.stage).label) || 'Fitting',
      U.jakartaDateISO(session.created_at) || U.todayISO()
    ];
    return parts.join('-') + '.pdf';
  }

  /* ------------------------------ Asset loading ---------------------------- */

  let logoPromise = null;

  function loadLogo() {
    if (logoPromise) return logoPromise;
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      // A missing brand asset must not cost the user their document.
      img.onerror = () => resolve(null);
      img.src = LOGO_SRC;
    });
    return logoPromise;
  }

  /* ------------------------------ Page painting ---------------------------- */

  const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setText = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  function paintPage(doc) {
    setFill(doc, CREAM);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }

  function paintFooter(doc, pageNumber) {
    const baseline = PAGE_H - MARGIN + 4;
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, baseline - 18, PAGE_W - MARGIN, baseline - 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, RULE);
    doc.text(FOOTER_TEXT, MARGIN, baseline);
    doc.text(String(pageNumber), PAGE_W - MARGIN, baseline, { align: 'right' });
  }

  function paintCover(doc, session, customer, logo) {
    paintPage(doc);

    setFill(doc, BLACK);
    doc.rect(0, 0, PAGE_W, 8, 'F');
    setFill(doc, ORANGE);
    doc.rect(0, 8, PAGE_W, 4, 'F');

    if (logo) {
      const box = fitContain(logo.naturalWidth, logo.naturalHeight, 200, 96);
      doc.addImage(logo, 'PNG', (PAGE_W - box.w) / 2, 150, box.w, box.h, undefined, 'FAST');
    }

    const stage = U.fittingStage(session.stage);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    setText(doc, BLACK);
    doc.text(String(customer.name || 'Unnamed customer'), PAGE_W / 2, 360, {
      align: 'center',
      maxWidth: CONTENT_W
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    setText(doc, INK_SOFT);
    doc.text(stage.label, PAGE_W / 2, 396, { align: 'center' });
    doc.text(U.formatJakartaLongDate(session.created_at), PAGE_W / 2, 418, { align: 'center' });

    setFill(doc, ORANGE);
    doc.rect(PAGE_W / 2 - 24, 444, 48, 3, 'F');

    doc.setFontSize(9);
    setText(doc, RULE);
    doc.text(FOOTER_TEXT, PAGE_W / 2, PAGE_H - MARGIN, { align: 'center' });
  }

  function captionLinesFor(doc, caption) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(CAPTION_SIZE);
    /* Stored line breaks survive: each authored line wraps on its own. */
    return String(caption || '').split(/\r?\n/).reduce((lines, paragraph) => {
      return lines.concat(paragraph ? doc.splitTextToSize(paragraph, CONTENT_W) : ['']);
    }, []);
  }

  function paintCaptionBlock(doc, lines, top) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(CAPTION_SIZE);
    setText(doc, INK_SOFT);
    lines.forEach((line, index) => {
      doc.text(line, MARGIN, top + CAPTION_LINE_H * (index + 1) - 4);
    });
  }

  /* -------------------------------- Document ------------------------------- */

  /* Every photo must already be resolvable; a missing one is the caller's to
     report before it ever gets here, because a half-complete client document
     is worse than none. */
  async function generate(context) {
    const ctx = context || {};
    const session = ctx.session || {};
    const customer = ctx.customer || {};
    const photos = ctx.photos || [];
    const resolveImage = ctx.resolveImage;

    if (!photos.length) throw new Error('This fitting log has no photos to print.');
    if ('function' !== typeof resolveImage) throw new Error('No image source was provided.');

    const jsPDFCtor = (window.jspdf || {}).jsPDF;
    if (!jsPDFCtor) throw new Error('The PDF library is not available.');

    const logo = await loadLogo();
    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });

    paintCover(doc, session, customer, logo);

    let pageNumber = 1;
    const capacity = captionPageCapacity();

    for (const photo of photos) {
      const resolved = await resolveImage(photo);
      if (!resolved || !resolved.dataUrl) throw new Error('An image could not be prepared.');

      doc.addPage();
      pageNumber++;
      paintPage(doc);

      const lines = photo.caption ? captionLinesFor(doc, photo.caption) : [];
      const plan = planPhotoPage({
        naturalWidth: resolved.width,
        naturalHeight: resolved.height,
        lineCount: lines.length
      });

      doc.addImage(
        resolved.dataUrl,
        resolved.format || 'JPEG',
        MARGIN + (CONTENT_W - plan.image.w) / 2,
        BODY_TOP,
        plan.image.w,
        plan.image.h,
        undefined,
        'FAST'
      );

      if (plan.linesOnPage) {
        paintCaptionBlock(doc, lines.slice(0, plan.linesOnPage), BODY_TOP + plan.image.h + CAPTION_GAP);
      }
      paintFooter(doc, pageNumber);

      let remaining = lines.slice(plan.linesOnPage);
      while (remaining.length) {
        doc.addPage();
        pageNumber++;
        paintPage(doc);
        paintCaptionBlock(doc, remaining.slice(0, capacity), BODY_TOP);
        paintFooter(doc, pageNumber);
        remaining = remaining.slice(capacity);
      }
    }

    return doc;
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    PAGE_W,
    PAGE_H,
    MARGIN,
    CONTENT_W,
    BODY_H,
    CAPTION_LINE_H,
    CAPTION_GAP,
    MIN_IMAGE_H,
    fitContain,
    captionPageCapacity,
    planPhotoPage,
    buildFilename,
    generate
  };
})();
