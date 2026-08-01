/* Kelak Kembali — moodboard generator.

   Owns the 16:9 moodboard canvas: image management, the algorithmic grid
   layout engine (three variations per image count), and the off-screen render
   pipeline (reusing docs.js's watermark/capture approach). Selected images
   stay in the browser as object URLs; only the completed PDF leaves the device.

   The view itself (dropzone and full-screen presentation) lives in index.html under
   #viewMoodboard; this module fills and drives it. */

window.KK = window.KK || {};

KK.moodboard = (function () {
  'use strict';

  const U = KK.util;
  const $ = U.$;
  const $$ = U.$$;

  /* ------------------------------- Constants ------------------------------ */

  const MAX_IMAGES = 16;
  const GAP = 12;
  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const SNAPSHOT_SCALE = 3;

  const HEADER_PAD_TOP = 24;
  const HEADER_PAD_SIDE = 32;
  const HEADER_PAD_BOTTOM = 32;
  const HEADER_GAP = 16;
  const HEADER_HEIGHT = 48;
  const CONTENT_TOP = HEADER_PAD_TOP + HEADER_HEIGHT + HEADER_GAP;
  const CONTENT_PAD = 32;
  const GRID_TOP = CONTENT_TOP;
  const GRID_LEFT = CONTENT_PAD;
  const GRID_W = STAGE_W - CONTENT_PAD * 2;
  const GRID_H = STAGE_H - GRID_TOP - CONTENT_PAD;

  const WM_BASE = '#EBE9E4';
  const WM_TONES = [
    [255, 253, 250], [251, 247, 240], [245, 239, 228],
    [236, 228, 213], [219, 206, 184], [199, 183, 156]
  ];
  const WM_FIELD_W = 48;
  const WM_GRAIN = 21;

  const VARIATIONS = ['A', 'B', 'C'];

  /* -------------------------------- State --------------------------------- */

  let images = [];          // { file, objectURL, id }
  let pending = [];         // { file, id } while a selection is decoded
  let uploadGeneration = 0; // invalidates an in-flight batch when the view closes
  let variation = 'A';
  let shuffleOrder = null;  // null = natural order, array = shuffled indices
  let stageEl = null;
  let gridEl = null;
  let headerNameEl = null;
  let orderData = null;     // { orderId, customerId, customerName, docName, orderRef }

  /* ----------------------------- Layout engine ---------------------------- */

  function computeGrid(count, v) {
    if (count === 0) return [];
    if (count === 1) return [{ x: 0, y: 0, w: GRID_W, h: GRID_H }];
    return portraitGrid(count, v);
  }

  /* A column is split into one to four stacked images. Its width is derived
     from that stack's tile height so every cell in a candidate shares one
     portrait aspect ratio. Because the widths are solved together, the mosaic
     still touches all four edges of the photo region with no blank remainder. */
  function portraitPartitions(total, min, current, output) {
    if (total === 0) {
      output.push(current.slice());
      return;
    }
    for (let size = min; size <= Math.min(4, total); size++) {
      current.push(size);
      portraitPartitions(total - size, size, current, output);
      current.pop();
    }
  }

  function portraitCandidate(parts) {
    const columnHeights = parts.map((rows) =>
      (GRID_H - (rows - 1) * GAP) / rows
    );
    const usableW = GRID_W - (parts.length - 1) * GAP;
    const aspect = usableW / columnHeights.reduce((sum, height) => sum + height, 0);
    return { parts, columnHeights, aspect };
  }

  function portraitGrid(count, variationName) {
    const partitions = [];
    portraitPartitions(count, 1, [], partitions);

    let candidates = partitions
      .map(portraitCandidate)
      .filter((candidate) => candidate.aspect < 1)
      .sort((a, b) => {
        const aSpread = Math.max(...a.parts) - Math.min(...a.parts);
        const bSpread = Math.max(...b.parts) - Math.min(...b.parts);
        const aScore = Math.abs(a.aspect - 0.72) + aSpread * 0.012;
        const bScore = Math.abs(b.aspect - 0.72) + bSpread * 0.012;
        return aScore - bScore;
      });

    /* Two images are the tightest possible portrait fit. Keep a defensive
       fallback in case the stage dimensions or gap are changed later. */
    if (!candidates.length) candidates = [portraitCandidate(Array(count).fill(1))];

    const variationIndex = VARIATIONS.indexOf(variationName);
    const chosen = candidates[Math.max(0, variationIndex) % Math.min(3, candidates.length)];
    let parts = chosen.parts.slice();
    if (variationName === 'B') parts.reverse();
    if (variationName === 'C' && parts.length > 1) parts.push(parts.shift());

    const geometry = portraitCandidate(parts);
    const cells = [];
    let x = 0;

    parts.forEach((rows, columnIndex) => {
      const cellH = geometry.columnHeights[columnIndex];
      const width = columnIndex === parts.length - 1
        ? GRID_W - x
        : geometry.aspect * cellH;

      for (let row = 0; row < rows; row++) {
        cells.push({ x, y: row * (cellH + GAP), w: width, h: cellH });
      }
      x += width + GAP;
    });

    return cells;
  }

  /* ------------------------------ Rendering ------------------------------- */

  function getOrderedImages() {
    if (!shuffleOrder) return images.slice();
    return shuffleOrder.map((i) => images[i]).filter(Boolean);
  }

  function renderPreview() {
    if (!gridEl) return;

    const ordered = getOrderedImages();
    const cells = computeGrid(ordered.length, variation);

    gridEl.innerHTML = '';
    cells.forEach((cell, i) => {
      if (!ordered[i]) return;
      const div = document.createElement('div');
      div.className = 'mb-cell';
      div.style.cssText =
        'position:absolute;' +
        'left:' + cell.x + 'px;top:' + cell.y + 'px;' +
        'width:' + cell.w + 'px;height:' + cell.h + 'px;overflow:hidden;';

      const img = document.createElement('img');
      img.src = ordered[i].objectURL;
      img.style.cssText =
        'width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block;';
      div.appendChild(img);
      gridEl.appendChild(div);
    });

    if (headerNameEl && orderData) {
      const name = orderData.docName || orderData.customerName || 'Customer';
      headerNameEl.innerHTML =
        '<span class="mb-header-light">Moodboard for </span>' +
        '<span class="mb-header-bold">' + U.escapeHtml(name) + '</span>';
    }
  }

  function uploadCellMarkup(item, index) {
    if (!item) {
      return '<button type="button" class="mb-upload-cell mb-upload-cell--empty" data-empty-slot="' + index +
        '" aria-label="Add image in slot ' + (index + 1) + '"></button>';
    }
    if (item.pending) {
      return '<div class="mb-upload-cell mb-upload-cell--uploading" data-upload-id="' + U.escapeHtml(item.id) + '" aria-label="Preparing image">' +
        '<button type="button" class="mb-upload-cell__control" disabled tabindex="-1" aria-label="Preparing image">' +
          '<span class="mb-upload-cell__spinner" aria-hidden="true"></span>' +
        '</button>' +
      '</div>';
    }
    return '<div class="mb-upload-cell is-loaded" data-upload-id="' + U.escapeHtml(item.id) + '">' +
      '<img src="' + item.objectURL + '" alt="">' +
      '<button type="button" class="mb-upload-cell__control mb-thumb__remove" data-i="' + index + '" aria-label="Remove image ' + (index + 1) + '"></button>' +
    '</div>';
  }

  function renderDropzone() {
    const dropzone = $('#mbDropzone');
    const thumbs = $('#mbThumbs');
    if (!dropzone || !thumbs) return;

    const cells = images.concat(pending.map((item) => Object.assign({ pending: true }, item)));
    while (cells.length < MAX_IMAGES) cells.push(null);
    dropzone.classList.toggle('has-images', images.length > 0 || pending.length > 0);
    dropzone.classList.toggle('is-loading', pending.length > 0);
    dropzone.setAttribute('aria-busy', String(pending.length > 0));
    thumbs.innerHTML = cells.slice(0, MAX_IMAGES).map(uploadCellMarkup).join('');
  }

  function resolvePendingTile(id, image) {
    const tile = document.querySelector('[data-upload-id="' + id + '"]');
    if (!tile) return renderDropzone();
    const dropzone = $('#mbDropzone');
    if (dropzone) {
      dropzone.classList.toggle('is-loading', pending.length > 0);
      dropzone.setAttribute('aria-busy', String(pending.length > 0));
    }

    const imageIndex = images.indexOf(image);
    const img = document.createElement('img');
    img.src = image.objectURL;
    img.alt = '';
    tile.insertBefore(img, tile.firstChild);
    tile.classList.remove('mb-upload-cell--uploading');
    tile.classList.add('is-resolving');
    tile.removeAttribute('aria-label');

    const control = tile.querySelector('.mb-upload-cell__control');
    control.disabled = false;
    control.removeAttribute('tabindex');
    control.classList.add('mb-thumb__remove');
    control.dataset.i = String(imageIndex);
    control.setAttribute('aria-label', 'Remove image ' + (imageIndex + 1));

    requestAnimationFrame(() => requestAnimationFrame(() => {
      tile.classList.add('is-loaded');
      tile.classList.remove('is-resolving');
    }));
  }

  function updateControls() {
    const countEl = $('#mbCount');
    const genBtn = $('#mbGenerate');
    const addBtn = $('#mbAddMore');
    const isPreparing = pending.length > 0;

    if (countEl) countEl.textContent = images.length + '/' + MAX_IMAGES;
    if (genBtn) genBtn.disabled = images.length === 0 || isPreparing;
    if (addBtn) addBtn.disabled = images.length >= MAX_IMAGES || isPreparing;
  }

  /* ----------------------------- Image handling --------------------------- */

  function probeImage(file) {
    const objectURL = URL.createObjectURL(file);
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve({
        file,
        objectURL,
        id: Math.random().toString(36).slice(2)
      });
      probe.onerror = () => {
        URL.revokeObjectURL(objectURL);
        resolve(null);
      };
      probe.src = objectURL;
    });
  }

  /* Google Photos and iCloud sometimes hand a browser a valid photo with an
     empty MIME type. Try every selected blob instead of rejecting it by its
     metadata. HEIC/HEIF is converted locally only when the browser cannot
     decode the original itself. */
  async function cacheImage(file) {
    const native = await probeImage(file);
    if (native || !U.isHeic(file) || typeof window.heic2any !== 'function') return native;

    try {
      const converted = await U.convertHeicToJpeg(file);
      const jpeg = new File(
        [converted],
        (file.name || 'photo').replace(/\.(?:heic|heif)$/i, '') + '.jpg',
        { type: 'image/jpeg', lastModified: file.lastModified }
      );
      return probeImage(jpeg);
    } catch (_) {
      return null;
    }
  }

  async function addFiles(fileList, onProgress) {
    const remaining = MAX_IMAGES - images.length - pending.length;
    if (remaining <= 0) return { added: 0, rejected: 0 };

    const files = Array.from(fileList).slice(0, remaining);
    const batch = files.map((file) => ({
      file,
      id: 'pending-' + Math.random().toString(36).slice(2)
    }));
    const generation = uploadGeneration;
    let added = 0;
    let rejected = 0;

    pending.push(...batch);
    renderDropzone();
    updateControls();

    /* Phone photos can be large, and HEIC conversion is expensive. Processing
       sequentially avoids a burst of simultaneous decodes while the progress
       callback gives the browser a chance to paint between files. */
    for (let index = 0; index < batch.length; index++) {
      const item = batch[index];
      let cached = null;
      try {
        cached = await cacheImage(item.file);
      } catch (_) {
        cached = null;
      } finally {
        pending = pending.filter((entry) => entry.id !== item.id);
      }

      if (generation !== uploadGeneration) {
        if (cached) URL.revokeObjectURL(cached.objectURL);
        break;
      }

      if (cached) {
        cached.id = item.id;
        images.push(cached);
        added++;
        resolvePendingTile(item.id, cached);
        renderPreview();
      } else {
        rejected++;
        renderDropzone();
      }
      updateControls();
      if (onProgress) onProgress(index + 1, files.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    shuffleOrder = null;
    renderPreview();
    updateControls();
    return { added, rejected };
  }

  function removeImage(index) {
    const idx = Number(index);
    if (isNaN(idx) || idx < 0 || idx >= images.length) return;
    const removed = images.splice(idx, 1);
    if (removed[0]) URL.revokeObjectURL(removed[0].objectURL);
    shuffleOrder = null;
    renderDropzone();
    renderPreview();
    updateControls();
  }

  function shuffledIndices() {
    const indices = images.map((_, i) => i);
    const previous = shuffleOrder ? shuffleOrder.slice() : indices.slice();
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (indices.length > 1 && indices.every((value, i) => value === previous[i])) {
      indices.push(indices.shift());
    }
    return indices;
  }

  function randomize() {
    if (!images.length) return;
    shuffleOrder = shuffledIndices();
    const choices = VARIATIONS.filter((v) => v !== variation);
    variation = choices[Math.floor(Math.random() * choices.length)];
    renderPreview();
  }

  /* ----------------------------- Watermark -------------------------------- */

  function moodboardSeed() {
    if (!orderData) return 'moodboard';
    return ['moodboard', orderData.customerName || '', orderData.orderId || '',
      U.todayISO()].join('::');
  }

  function buildWatermark(seed, cssW, cssH, scale) {
    const rand = U.mulberry32(U.hashString(seed));
    const W = Math.round(cssW * scale);
    const H = Math.round(cssH * scale);

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
      const squash = 0.45 + rand() * 0.9;
      const angle = rand() * Math.PI;
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

    const gw = Math.round(cssW);
    const gh = Math.round(cssH);
    const grain = document.createElement('canvas');
    grain.width = gw;
    grain.height = gh;
    const gc = grain.getContext('2d');
    const gimg = gc.createImageData(gw, gh);
    const gd = gimg.data;
    for (let j = 0; j < gd.length; j += 4) {
      const v = 128 + (rand() - 0.5) * WM_GRAIN * 2;
      gd[j] = gd[j + 1] = gd[j + 2] = v;
      gd[j + 3] = 255;
    }
    gc.putImageData(gimg, 0, 0);

    oc.globalCompositeOperation = 'overlay';
    oc.imageSmoothingEnabled = false;
    oc.drawImage(grain, 0, 0, W, H);
    oc.globalCompositeOperation = 'source-over';

    return out;
  }

  /* ----------------------------- PDF generation --------------------------- */

  const MB_FACES = [
    '300 20px "Plus Jakarta Sans"',
    '600 20px "Plus Jakarta Sans"'
  ];

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.all(MB_FACES.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
    } catch (_) { /* fall through */ }
  }

  function imagesReady(root) {
    const imgs = $$('img', root);
    return Promise.all(imgs.map((img) => (
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => { img.onload = img.onerror = res; })
    )));
  }

  async function cloneReady(doc) {
    const root = doc.documentElement;
    if (root) {
      root.style.setProperty('-webkit-text-size-adjust', 'none');
      root.style.setProperty('text-size-adjust', 'none');
    }
    if (!doc.fonts) return;
    try {
      await Promise.all(MB_FACES.map((f) => doc.fonts.load(f)));
      await doc.fonts.ready;
    } catch (_) { /* fall through */ }
  }

  async function generatePDF() {
    if (!stageEl || images.length === 0) throw new Error('Nothing to generate.');

    renderPreview();
    await fontsReady();
    await imagesReady(stageEl);

    stageEl.style.backgroundColor = 'transparent';
    let raw;
    try {
      raw = await html2canvas(stageEl, {
        scale: SNAPSHOT_SCALE,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: STAGE_W,
        height: STAGE_H,
        onclone: cloneReady
      });
    } finally {
      stageEl.style.backgroundColor = '';
    }

    const watermark = buildWatermark(moodboardSeed(), STAGE_W, STAGE_H, SNAPSHOT_SCALE);

    const canvas = document.createElement('canvas');
    canvas.width = raw.width;
    canvas.height = raw.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(watermark, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(raw, 0, 0);

    const pageW = 841.89;  // A4 landscape width in pt
    const pageH = pageW * (STAGE_H / STAGE_W);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [pageW, pageH],
      compress: true
    });

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95), 'JPEG',
      0, 0, pageW, pageH, undefined, 'FAST'
    );

    return pdf;
  }

  function pdfToBase64(pdf) {
    const arrayBuffer = pdf.output('arraybuffer');
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function buildFilename(now) {
    const date = now || new Date();
    const pad = (value, width) => String(value).padStart(width || 2, '0');
    const timestamp = [
      date.getFullYear(), '-', pad(date.getMonth() + 1), '-', pad(date.getDate()), '-',
      pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds()), '-',
      pad(date.getMilliseconds(), 3)
    ].join('');
    const safe = U.sanitizeForFilename(
      orderData ? (orderData.docName || orderData.customerName) : ''
    );
    return safe
      ? 'Moodboard-KelakKembali-' + safe + '-' + timestamp + '.pdf'
      : 'Moodboard-KelakKembali-' + timestamp + '.pdf';
  }

  /* ------------------------------ Public API ------------------------------ */

  function init(opts) {
    cleanup();
    orderData = opts;
    variation = 'A';

    stageEl = document.querySelector('.stage #moodboardStage');
    gridEl = stageEl ? stageEl.querySelector('#mbGrid') : null;
    headerNameEl = stageEl ? stageEl.querySelector('#mbHeaderName') : null;

    renderPreview();
    renderDropzone();
    updateControls();
  }

  function setVariation(v) {
    if (VARIATIONS.indexOf(v) === -1) return;
    variation = v;
    renderPreview();
    updateControls();
  }

  function cleanup() {
    uploadGeneration++;
    images.forEach((img) => URL.revokeObjectURL(img.objectURL));
    images = [];
    pending = [];
    shuffleOrder = null;
    if (gridEl) gridEl.innerHTML = '';
  }

  return {
    MAX_IMAGES,
    init, cleanup,
    addFiles, removeImage, randomize,
    setVariation,
    generatePDF, pdfToBase64, buildFilename,
    get stage() { return stageEl; },
    get images() { return images; },
    get variation() { return variation; }
  };
})();
