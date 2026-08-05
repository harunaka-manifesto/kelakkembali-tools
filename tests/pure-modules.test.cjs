/* Regression coverage for browser modules that are pure apart from their
   window.KK namespace. DOM/network workflows still require browser checks. */

const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
global.KK = {};
require('../util.js');
require('../calendar.js');

const { util, calendar } = global.KK;

test('shared formatters preserve document-facing output', () => {
  assert.equal(util.escapeHtml('<p title="x">A&B</p>'), '&lt;p title=&quot;x&quot;&gt;A&amp;B&lt;/p&gt;');
  assert.equal(util.formatRupiah(1250000), 'Rp1.250.000');
  assert.equal(util.groupDigits('001250000'), '1.250.000');
  assert.equal(util.formatLongDate('2026-08-24'), "24 Aug '26");
  assert.equal(util.formatShortDate('2026-08-24'), "24 Aug '26");
  assert.equal(util.sanitizeForFilename('  Nadia & Rizky!  '), 'Nadia-Rizky');
});

test('HEIC detection accepts MIME types and filename fallbacks', () => {
  assert.equal(util.isHeic({ type: 'image/heic' }), true);
  assert.equal(util.isHeic({ name: 'camera.HEIF' }), true);
  assert.equal(util.isHeic({ type: 'image/jpeg', name: 'camera.jpg' }), false);
});

test('HEIC conversion normalizes converter array output', async () => {
  const source = { name: 'camera.heic' };
  window.heic2any = async options => {
    assert.deepEqual(options, { blob: source, toType: 'image/jpeg', quality: 0.92 });
    return ['converted-jpeg'];
  };

  assert.equal(await util.convertHeicToJpeg(source), 'converted-jpeg');
  delete window.heic2any;
  await assert.rejects(
    util.convertHeicToJpeg(source),
    /This HEIC photo cannot be read on this browser/,
  );
});

test('ISO day arithmetic rejects rolled dates and round-trips valid ones', () => {
  assert.equal(calendar.toDay('2026-02-31'), null);
  assert.equal(calendar.fromDay(calendar.toDay('2028-02-29')), '2028-02-29');
  assert.equal(calendar.daysBetween('2026-12-31', '2027-01-02'), 2);
});

test('planned fitting weeks are timezone-safe Monday-Sunday ranges', () => {
  assert.deepEqual(calendar.plannedWeek('2026-08-27'), { start: '2026-08-24', end: '2026-08-30' });
  assert.equal(calendar.plannedWeek('not-a-date'), null);
});

test('weekdays are Monday-indexed from the ISO day epoch', () => {
  // 1970-01-01 is a Thursday, and every other index hangs off that anchor.
  assert.equal(calendar.weekdayIndex('1970-01-01'), 3);
  assert.equal(calendar.weekdayIndex('2026-06-01'), 0);
  assert.equal(calendar.weekdayIndex('2026-11-01'), 6);
  assert.equal(calendar.weekdayIndex('2026-02-31'), null);
});

test('months roll in both directions across the year boundary', () => {
  assert.deepEqual(calendar.addMonths(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(calendar.addMonths(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(calendar.addMonths(2026, 7, 0), { year: 2026, month: 7 });
  assert.deepEqual(calendar.monthRange(2026, 1), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(calendar.monthRange(2028, 1), { start: '2028-02-01', end: '2028-02-29' });
});

test('the month grid is always six rows so paging cannot move the footer', () => {
  // November 2026 opens on a Sunday: six leading days are back-filled.
  const sundayStart = calendar.monthGrid(2026, 10);
  assert.equal(sundayStart.days.length, 42);
  assert.deepEqual(sundayStart.days[0], { iso: '2026-10-26', day: 26, inMonth: false });
  assert.equal(sundayStart.days[6].iso, '2026-11-01');
  assert.equal(sundayStart.days[6].inMonth, true);

  // June 2026 opens on a Monday: the 1st is the very first cell, and the month
  // only needs five rows -- it still gets six.
  const mondayStart = calendar.monthGrid(2026, 5);
  assert.equal(mondayStart.days.length, 42);
  assert.deepEqual(mondayStart.days[0], { iso: '2026-06-01', day: 1, inMonth: true });
  assert.equal(mondayStart.days[41].inMonth, false);
});

test('production stages span their planned week, everything else a single day', () => {
  assert.deepEqual(calendar.eventSpan('Fitting 2', '2026-08-27'), calendar.plannedWeek('2026-08-27'));
  assert.deepEqual(calendar.eventSpan('Sizing', '2026-08-27'), { start: '2026-08-24', end: '2026-08-30' });
  // Design phase is the one stored row carrying a real end_date.
  assert.deepEqual(
    calendar.eventSpan('Design phase', '2026-03-02', '2026-03-16'),
    { start: '2026-03-02', end: '2026-03-16' },
  );
  assert.deepEqual(calendar.eventSpan('Design deadline', '2026-03-16'), { start: '2026-03-16', end: '2026-03-16' });
  // Weddings, follow-ups and payments are not stages at all, and fall through
  // to the single-day branch rather than needing their own function.
  assert.deepEqual(calendar.eventSpan('Wedding', '2026-06-30'), { start: '2026-06-30', end: '2026-06-30' });
  assert.equal(calendar.eventSpan('Wedding', 'not-a-date'), null);
});

test('overlapping calendar bands take stable, distinct lanes', () => {
  const spans = [
    { start: '2026-08-24', end: '2026-08-30', stage: 'Fitting 1', key: 'a' },
    { start: '2026-08-26', end: '2026-09-01', stage: 'Fitting 2', key: 'b' },
    { start: '2026-09-10', end: '2026-09-10', stage: 'Sizing', key: 'c' }
  ];
  // Two overlaps separate; a disjoint span reuses lane 0.
  assert.deepEqual(calendar.assignLanes(spans), [0, 1, 0]);
  // Deterministic, and the input is never mutated.
  assert.deepEqual(calendar.assignLanes(spans), [0, 1, 0]);
  assert.deepEqual(spans[0], { start: '2026-08-24', end: '2026-08-30', stage: 'Fitting 1', key: 'a' });
  assert.deepEqual(calendar.assignLanes([]), []);
});

test('Sizing anchors the five canonical production stages', () => {
  assert.deepEqual(
    calendar.PRODUCTION_STAGES,
    ['Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'],
  );
  // Every stored production stage has its own feed key and its own label.
  const keys = calendar.PRODUCTION_STAGES.map(stage => util.fittingStage(stage).key);
  assert.equal(new Set(keys).size, 5);
  assert.equal(new Set(calendar.PRODUCTION_STAGES.map(s => util.fittingStage(s).label)).size, 5);
});

test('no shipped source still speaks the retired Body measurements stage', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const shipped = [
    'app.js', 'db.js', 'util.js', 'calendar.js', 'config.js', 'docs.js',
    'fittings.js', 'fitting-pdf.js', 'moodboard.js', 'index.html', 'styles/pages.css',
  ];
  shipped.forEach((file) => {
    assert.equal(
      fs.readFileSync(path.join(root, file), 'utf8').includes('Body measurements'),
      false,
      file + ' still mentions the retired stage name',
    );
  });
});

test('design schedule keeps the established payment offsets', () => {
  assert.deepEqual(calendar.computeDesign('2026-08-03'), {
    events: [
      { stage: 'Design phase', event_date: '2026-08-04', end_date: '2026-08-17' },
      { stage: 'Design deadline', event_date: '2026-08-17' },
    ],
    reason: '',
    missingAnchor: false,
  });
});

test('production schedule emits ordered Monday appointments', () => {
  const result = calendar.computeProduction('2026-03-02', '2026-08-24');

  assert.equal(result.reason, '');
  assert.deepEqual(result.dropped, []);
  assert.deepEqual(result.events.map(event => event.stage), calendar.PRODUCTION_STAGES);
  assert.equal(result.events.every(event => calendar.mondayOnOrBefore(calendar.toDay(event.event_date)) === calendar.toDay(event.event_date)), true);
  assert.equal(result.events.every((event, index, events) => index === 0 || event.event_date > events[index - 1].event_date), true);
});

/* The moodboard layout engine is pure geometry once its stage is chosen, so it
   is exercised here rather than only in the browser. */
require('../moodboard.js');
const { moodboard } = global.KK;

const GAP = 0;
const VARIATIONS = ['A', 'B', 'C'];
const near = (a, b) => Math.abs(a - b) < 0.5;

function assertMosaic(count, orientation, variation) {
  moodboard.setOrientation(orientation);
  const region = moodboard.photoRegion();
  const cells = moodboard.computeGrid(count, variation);
  const where = `${count} images, ${orientation}, variation ${variation}`;

  assert.equal(cells.length, count, `cell count for ${where}`);

  cells.forEach(cell => {
    assert.ok(cell.w > 0 && cell.h > 0, `positive size for ${where}`);
    assert.ok(cell.x >= -0.5 && cell.y >= -0.5, `origin inside region for ${where}`);
    assert.ok(cell.x + cell.w <= region.w + 0.5, `right edge inside region for ${where}`);
    assert.ok(cell.y + cell.h <= region.h + 0.5, `bottom edge inside region for ${where}`);
    /* One photo is full-bleed; multi-image cells maintain valid framing (portrait for count >= 3). */
    if (count > 2) assert.ok(cell.w < cell.h, `portrait frame for ${where}`);
  });

  /* The mosaic touches all four edges of the photo region. */
  assert.ok(cells.some(cell => near(cell.x, 0)), `left edge reached for ${where}`);
  assert.ok(cells.some(cell => near(cell.y, 0)), `top edge reached for ${where}`);
  assert.ok(cells.some(cell => near(cell.x + cell.w, region.w)), `right edge reached for ${where}`);
  assert.ok(cells.some(cell => near(cell.y + cell.h, region.h)), `bottom edge reached for ${where}`);

  /* No pair overlaps, and neighbours are never closer than the gutter. */
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];
      const gapX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
      const gapY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
      assert.ok(
        Math.max(gapX, gapY) >= GAP - 0.5,
        `cells ${i} and ${j} keep the gutter for ${where}`,
      );
    }
  }
}

test('moodboard mosaics fill both stages for every supported image count', () => {
  ['landscape', 'portrait'].forEach(orientation => {
    for (let count = 1; count <= moodboard.MAX_IMAGES; count++) {
      VARIATIONS.forEach(variation => assertMosaic(count, orientation, variation));
    }
  });
  moodboard.setOrientation('landscape');
});

test('moodboard stages are exact 16:9 counterparts', () => {
  moodboard.setOrientation('landscape');
  assert.deepEqual([moodboard.stageWidth, moodboard.stageHeight], [1920, 1080]);
  assert.equal(moodboard.toggleOrientation(), 'portrait');
  assert.deepEqual([moodboard.stageWidth, moodboard.stageHeight], [1080, 1920]);
  assert.equal(moodboard.toggleOrientation(), 'landscape');
});

/* The fitting-log feed's request shaping is pure, and it is the layer that
   keeps user-typed wildcards and PostgREST filter syntax apart. */
require('../db.js');
const { db } = global.KK;

test('fitting feed queries are trimmed, collapsed, lowercased, and capped', () => {
  assert.equal(db.normalizeFeedQuery('  Selena   Gomez  '), 'selena gomez');
  assert.equal(db.normalizeFeedQuery('\tANYA\nGeraldine '), 'anya geraldine');
  assert.equal(db.normalizeFeedQuery('   '), '');
  assert.equal(db.normalizeFeedQuery(null), '');
  assert.equal(db.normalizeFeedQuery('x'.repeat(500)).length, 200);
});

test('fitting feed search patterns neutralise every wildcard a user can type', () => {
  assert.equal(db.likeLiteral('100% cotton'), '100\\% cotton');
  assert.equal(db.likeLiteral('a_b'), 'a\\_b');
  assert.equal(db.likeLiteral('back\\slash'), 'back\\\\slash');
  // PostgREST rewrites * into %, so it degrades to the single-character
  // wildcard rather than becoming a match-everything pattern.
  assert.equal(db.likeLiteral('a*b'), 'a_b');
  // PostgREST filter syntax characters are literal inside a single filter.
  assert.equal(db.likeLiteral('Family (sisters, moms)'), 'Family (sisters, moms)');
});

test('fitting feed stages are restricted to the five canonical keys', () => {
  assert.deepEqual(db.normalizeFeedStages(['fitting-2', 'sizing']), ['sizing', 'fitting-2']);
  assert.deepEqual(db.normalizeFeedStages(['Final fitting', 'nope']), []);
  assert.deepEqual(db.normalizeFeedStages(undefined), []);
  assert.deepEqual(db.normalizeFeedStages(db.FITTING_STAGE_KEYS), db.FITTING_STAGE_KEYS);
});

test('a document feed serves one kind, and moodboards are not one of them', () => {
  assert.equal(db.normalizeDocumentKind('quotation'), 'quotation');
  assert.equal(db.normalizeDocumentKind('invoice'), 'invoice');
  // document_log holds these too, but neither list route can render one.
  assert.equal(db.normalizeDocumentKind('moodboard'), '');
  // An unusable kind fails loudly rather than defaulting to showing both.
  assert.equal(db.normalizeDocumentKind('QUOTATION'), '');
  assert.equal(db.normalizeDocumentKind(''), '');
  assert.equal(db.normalizeDocumentKind(null), '');
  assert.equal(db.normalizeDocumentKind(undefined), '');
  assert.deepEqual(db.DOCUMENT_KINDS, ['quotation', 'invoice']);
});

/* ------------------- Fitting log detail, sharing, and PDF ----------------- */

test('the five stored stages map one-to-one across the feed and PDF', () => {
  assert.deepEqual(
    ['Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting']
      .map(stage => util.fittingStage(stage).label),
    ['Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'],
  );
  assert.deepEqual(
    ['Sizing', 'Final fitting'].map(stage => util.fittingStage(stage).key),
    ['sizing', 'final-fitting'],
  );
  assert.notEqual(util.fittingStage('Final fitting').color, util.fittingStage('Fitting 3').color);
  // An unrecognised stage keeps its own text rather than inventing a fifth word.
  assert.deepEqual(util.fittingStage('Toile check'), {
    stage: 'Toile check', key: '', label: 'Toile check', color: '#4c4c4c',
  });
  assert.equal(util.fittingStage(null).label, '');
});

test('session dates are read in the workshop day, not UTC', () => {
  // 23:30 UTC is already the next morning in Jakarta (+07:00, no DST).
  assert.equal(util.jakartaDateISO('2026-08-24T23:30:00Z'), '2026-08-25');
  assert.equal(util.jakartaDateISO('2026-08-25T00:30:00Z'), '2026-08-25');
  assert.equal(util.formatJakartaLongDate('2026-08-24T23:30:00Z'), "25 Aug '26");
  assert.equal(util.jakartaDateISO('not a date'), '');
  assert.equal(util.formatJakartaLongDate(null), '');
});

/* The PDF module owns page geometry and nothing else, so all of it is pure. */
global.window.jspdf = undefined;
require('../fitting-pdf.js');
const { fittingPdf } = global.KK;

test('PDF filenames survive Unicode, punctuation, and reserved characters', () => {
  assert.equal(
    fittingPdf.buildFilename({
      session: { stage: 'Final fitting', created_at: '2026-08-24T23:30:00Z' },
      customer: { name: 'Nadia & Rizky' },
    }),
    'Nadia-Rizky-Final-fitting-2026-08-25.pdf',
  );
  // Path separators and Windows-reserved characters never reach the filename.
  assert.equal(
    fittingPdf.buildFilename({
      session: { stage: 'Fitting 1', created_at: '2026-01-02T03:00:00Z' },
      customer: { name: 'A/B:C*D?E"F<G>H|I' },
    }),
    'ABCDEFGHI-Fitting-1-2026-01-02.pdf',
  );
  assert.equal(
    fittingPdf.buildFilename({
      session: { stage: 'Fitting 2', created_at: '2026-03-04T05:00:00Z' },
      customer: { name: '晴子 さん' },
    }),
    '晴子-さん-Fitting-2-2026-03-04.pdf',
  );
  // A nameless customer and an unknown stage still produce a usable filename.
  const fallback = fittingPdf.buildFilename({ session: {}, customer: {} });
  assert.match(fallback, /^Customer-Fitting-\d{4}-\d{2}-\d{2}\.pdf$/);

  const emptyFallback = fittingPdf.buildFilename(null);
  assert.match(emptyFallback, /^Customer-Fitting-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('images are contained at their natural ratio, never cropped or stretched', () => {
  const box = { w: 400, h: 300 };
  const landscape = fittingPdf.fitContain(4000, 2000, box.w, box.h);
  const portrait = fittingPdf.fitContain(2000, 4000, box.w, box.h);
  const square = fittingPdf.fitContain(1000, 1000, box.w, box.h);

  [[landscape, 4000 / 2000], [portrait, 2000 / 4000], [square, 1]].forEach(([fit, ratio]) => {
    assert.ok(Math.abs(fit.w / fit.h - ratio) < 1e-9, 'natural ratio preserved');
    assert.ok(fit.w <= box.w + 1e-9 && fit.h <= box.h + 1e-9, 'inside the box');
  });
  // Contain, not cover: at least one axis touches the box exactly.
  assert.equal(landscape.w, 400);
  assert.equal(portrait.h, 300);
  // Unknown natural dimensions fall back to the whole box rather than 0 area.
  assert.deepEqual(fittingPdf.fitContain(0, 0, box.w, box.h), box);
});

test('captions shrink the photo only down to a readable minimum image area', () => {
  // Tall enough to be height-constrained, so the caption's claim on the page
  // is visible in the result rather than absorbed by spare vertical room.
  const tall = { naturalWidth: 1000, naturalHeight: 3000 };

  const bare = fittingPdf.planPhotoPage(Object.assign({ lineCount: 0 }, tall));
  assert.equal(bare.linesOnPage, 0);
  assert.equal(bare.overflowLines, 0);
  assert.ok(Math.abs(bare.image.h - fittingPdf.BODY_H) < 1e-9);

  // A short caption is carried in full, and the image gives up the room.
  const short = fittingPdf.planPhotoPage(Object.assign({ lineCount: 3 }, tall));
  assert.equal(short.linesOnPage, 3);
  assert.equal(short.overflowLines, 0);
  assert.ok(short.image.h < bare.image.h, 'caption shrinks the image');
  assert.ok(short.image.h >= fittingPdf.MIN_IMAGE_H, 'stays above the minimum');

  // A wide photo that already fits inside the caption's budget is not shrunk
  // any further than its own natural ratio requires.
  const wide = fittingPdf.planPhotoPage({ naturalWidth: 1000, naturalHeight: 1000, lineCount: 3 });
  assert.ok(Math.abs(wide.image.w - fittingPdf.CONTENT_W) < 1e-9);
  assert.equal(wide.overflowLines, 0);

  // Past the minimum the caption is the thing that yields — and the remainder
  // is carried over, never truncated.
  const huge = fittingPdf.planPhotoPage(Object.assign({ lineCount: 400 }, tall));
  assert.ok(huge.image.h >= fittingPdf.MIN_IMAGE_H - 1e-9, 'image never goes below the minimum');
  assert.ok(huge.overflowLines > 0, 'the tail continues on another page');
  assert.equal(huge.linesOnPage + huge.overflowLines, 400, 'no stored line is dropped');

  assert.ok(fittingPdf.captionPageCapacity() > 0);
});

test('the PDF refuses a zero-photo session and a missing image source', async () => {
  await assert.rejects(
    fittingPdf.generate({ session: {}, customer: {}, photos: [], resolveImage: () => ({}) }),
    /no photos to print/,
  );
  await assert.rejects(
    fittingPdf.generate({ session: {}, customer: {}, photos: [{ id: 'a' }] }),
    /No image source/,
  );
});

/* ------------------------ Fitting feed state retention -------------------- */

/* app.js is a DOM composition root, so the decision itself is restated here as
   the predicate it implements: only movement inside the fitting-log route
   family keeps the feed's loaded pages and offset alive. */
const FITTING_ROUTE_FAMILY = ['fittingLogs', 'fittingLogDetail', 'fittingPhotoEdit', 'fittingPhotoAdd'];
const inFittingFamily = route => !!route && FITTING_ROUTE_FAMILY.includes(route.view);

test('only the fitting-log route family retains the feed', () => {
  assert.equal(inFittingFamily({ view: 'fittingLogDetail' }), true);
  assert.equal(inFittingFamily({ view: 'fittingPhotoEdit' }), true);
  assert.equal(inFittingFamily({ view: 'fittingPhotoAdd' }), true);
  assert.equal(inFittingFamily({ view: 'fittingLogs' }), true);
  assert.equal(inFittingFamily({ view: 'customer' }), false);
  assert.equal(inFittingFamily({ view: 'order' }), false);
  assert.equal(inFittingFamily(null), false);
});

test('session photos order by position, then created_at, then id', () => {
  const sortFittingPhotos = photos => photos.slice().sort((a, b) =>
    (Number(a.position) || 0) - (Number(b.position) || 0) ||
    String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
    String(a.id).localeCompare(String(b.id)));

  const rows = [
    { id: 'd', position: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 'b', position: 0, created_at: '2026-01-01T00:00:02Z' },
    { id: 'c', position: 0, created_at: '2026-01-01T00:00:01Z' },
    { id: 'a', position: 0, created_at: '2026-01-01T00:00:02Z' },
  ];
  assert.deepEqual(sortFittingPhotos(rows).map(row => row.id), ['c', 'a', 'b', 'd']);
});
