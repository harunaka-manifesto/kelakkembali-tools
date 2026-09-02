/* The fitting handoff sheet: one A4 page per fitting photo, for the tailor.

   - Owns: A4 page geometry, natural-ratio image fitting, red markup rendering,
     caption flow and overflow decisions, and the generated jsPDF document.
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

  /* Reserved strips at the head and foot of every page: who this is for at the
     top, the page number at the bottom, and neither can ever collide with a
     tall image. There is no cover page — this is a working instruction sheet,
     not a presentation, so page 1 is the first fitting photo. */
  const HEADER_H = 34;
  const FOOTER_H = 40;
  const BODY_TOP = MARGIN + HEADER_H;
  const BODY_H = PAGE_H - MARGIN - FOOTER_H - MARGIN - HEADER_H;

  const CAPTION_GAP = 16;
  /* The tailor reads this on paper or on a phone and acts on it. Readable beats
     compact, so the note is set at body size rather than at footnote size. */
  const CAPTION_SIZE = 12;
  const CAPTION_LINE_H = 16;

  /* Below this the photo stops being the point of the page, so the caption
     yields instead and its tail continues on a plain caption page. */
  const MIN_IMAGE_H = 300;

  const CREAM = [254, 250, 241];
  const INK_SOFT = [41, 41, 41];
  const RULE = [76, 76, 76];
  const ORANGE = [255, 106, 0];
  /* The one red pen, matching --fit-mark in styles/pages.css exactly. A mark
     that changed colour between the screen and the page would be a different
     mark. */
  const MARK = [255, 42, 42];

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

  /* Marks are drawn from the same normalized points the browser drew, mapped
     onto the box the image actually occupies on this page. Nothing is baked
     into the photo, so the archived original stays clean and a stroke stays
     sharp however large the page prints it. */
  function annotationSegments(annotation, box) {
    const a = U.normalizeAnnotation(annotation);
    if (!a || !box) return [];
    const longest = Math.max(box.w, box.h);
    return a.strokes.map((stroke) => {
      const pts = stroke.points.map((p) => [box.x + p[0] * box.w, box.y + p[1] * box.h]);
      const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
      return { start: pts[0], deltas, width: stroke.width * longest };
    });
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

  /* Who, which fitting, and when — on every page, because a tailor works from
     one sheet at a time and a cover page they never printed cannot tell them. */
  function paintHeader(doc, session, customer) {
    const baseline = MARGIN + 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setText(doc, INK_SOFT);
    doc.text(String(customer.name || 'Unnamed customer'), MARGIN, baseline, { maxWidth: CONTENT_W * 0.6 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText(doc, RULE);
    doc.text(
      U.fittingStage(session.stage).label + '  ·  ' + U.formatJakartaLongDate(session.created_at),
      PAGE_W - MARGIN,
      baseline,
      { align: 'right' }
    );

    setFill(doc, ORANGE);
    doc.rect(MARGIN, MARGIN + 20, CONTENT_W, 3, 'F');
  }

  /* The same strokes the fitter drew, at the same place on the photo. A
     document that quietly printed the clean original would be describing a
     revision nobody can see. */
  function paintAnnotation(doc, annotation, box) {
    const segments = annotationSegments(annotation, box);
    if (!segments.length) return;

    doc.setDrawColor(MARK[0], MARK[1], MARK[2]);
    setFill(doc, MARK);
    doc.setLineCap('round');
    doc.setLineJoin('round');

    segments.forEach((seg) => {
      doc.setLineWidth(seg.width);
      if (seg.deltas.length) doc.lines(seg.deltas, seg.start[0], seg.start[1]);
      // A tap is a mark too, and a zero-length path draws nothing.
      else doc.circle(seg.start[0], seg.start[1], seg.width / 2, 'F');
    });

    // The footer rule is drawn after this and must not inherit a round cap.
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
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

  /* One fitting photo, one page — six photos make six pages, and there is no
     seventh. The tailor should never have to zoom, so the photo takes the whole
     page it can and the note keeps its body size underneath it.

     Every photo must already be resolvable; a missing one is the caller's to
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

    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });

    let pageNumber = 0;
    const capacity = captionPageCapacity();

    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      const resolved = await resolveImage(photo);
      if (!resolved || !resolved.dataUrl) throw new Error('An image could not be prepared.');

      // The first photo is page one; jsPDF opens with a blank page already.
      if (pageNumber) doc.addPage();
      pageNumber++;
      paintPage(doc);
      paintHeader(doc, session, customer);

      const lines = photo.caption ? captionLinesFor(doc, photo.caption) : [];
      const plan = planPhotoPage({
        naturalWidth: resolved.width,
        naturalHeight: resolved.height,
        lineCount: lines.length
      });

      const box = {
        x: MARGIN + (CONTENT_W - plan.image.w) / 2,
        y: BODY_TOP,
        w: plan.image.w,
        h: plan.image.h
      };

      doc.addImage(resolved.dataUrl, resolved.format || 'JPEG', box.x, box.y, box.w, box.h, undefined, 'FAST');
      paintAnnotation(doc, photo.annotation, box);

      if (plan.linesOnPage) {
        paintCaptionBlock(doc, lines.slice(0, plan.linesOnPage), BODY_TOP + plan.image.h + CAPTION_GAP);
      }
      paintFooter(doc, pageNumber);

      /* Only an extreme note gets here: the image gives way first, and only
         once it is down to MIN_IMAGE_H does the caption continue overleaf. It
         is never truncated and never set smaller — a fitting instruction the
         tailor cannot read is worse than one that takes a second page. */
      let remaining = lines.slice(plan.linesOnPage);
      while (remaining.length) {
        doc.addPage();
        pageNumber++;
        paintPage(doc);
        paintHeader(doc, session, customer);
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
    HEADER_H,
    BODY_TOP,
    BODY_H,
    CAPTION_LINE_H,
    CAPTION_GAP,
    MIN_IMAGE_H,
    MARK,
    fitContain,
    captionPageCapacity,
    planPhotoPage,
    annotationSegments,
    buildFilename,
    generate
  };
})();
