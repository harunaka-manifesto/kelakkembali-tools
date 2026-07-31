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
