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
  assert.equal(util.formatLongDate('2026-08-24'), '24 August 2026');
  assert.equal(util.formatShortDate('2026-08-24'), '24 Aug 2026');
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

const GAP = 12;
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
    /* One photo is deliberately full-bleed; every mosaic cell stays portrait. */
    if (count > 1) assert.ok(cell.w < cell.h, `portrait frame for ${where}`);
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
