/* Kelak Kembali — moodboard generator.

   Owns the 16:9 moodboard canvas: image management, the portrait-aware
   algorithmic grid layout engine (dynamic variations per image count),
   the off-screen render pipeline, and PDF generation.

   Images stay in browser memory as object URLs until the final PDF is
   generated. No draft uploads — Drive only receives the finished PDF. */

window.KK = window.KK || {};

KK.moodboard = (function () {
  'use strict';

  var U = KK.util;
  var $ = U.$;
  var $$ = U.$$;

  /* ------------------------------- Constants ------------------------------ */

  var MAX_IMAGES = 16;
  var GAP = 12;
  var STAGE_W = 1920;
  var STAGE_H = 1080;
  var SNAPSHOT_SCALE = 3;

  var HEADER_PAD_TOP = 24;
  var HEADER_HEIGHT = 48;
  var HEADER_GAP = 16;
  var CONTENT_TOP = HEADER_PAD_TOP + HEADER_HEIGHT + HEADER_GAP;
  var CONTENT_PAD = 32;
  var GRID_W = STAGE_W - CONTENT_PAD * 2;
  var GRID_H = STAGE_H - CONTENT_TOP - CONTENT_PAD;

  var WM_BASE = '#EBE9E4';
  var WM_TONES = [
    [255, 253, 250], [251, 247, 240], [245, 239, 228],
    [236, 228, 213], [219, 206, 184], [199, 183, 156]
  ];
  var WM_FIELD_W = 48;
  var WM_GRAIN = 21;

  var MIN_RATIO = 0.30;
  var MAX_RATIO = 1.05;
  var HERO_FRACS = [0.35, 0.50];
  var HERO_MAX_COUNT = 8;
  var IDEAL_RATIO = 0.65;

  /* -------------------------------- State --------------------------------- */

  var images = [];
  var layoutIndex = 0;
  var shuffleOrder = null;
  var stageEl = null;
  var gridEl = null;
  var headerNameEl = null;
  var orderData = null;

  /* ----------------------------- Layout engine ---------------------------- */

  var layoutCache = {};

  function layoutCells(count, cols, rows, ox, oy, totalW, totalH) {
    var cellW = (totalW - (cols - 1) * GAP) / cols;
    var cellH = (totalH - (rows - 1) * GAP) / rows;
    var cells = [];
    for (var i = 0; i < count; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var lastRow = row === rows - 1;
      var itemsInLastRow = count - cols * (rows - 1);
      var x, w;
      if (lastRow && itemsInLastRow < cols) {
        var lw = (totalW - (itemsInLastRow - 1) * GAP) / itemsInLastRow;
        x = ox + (i - cols * (rows - 1)) * (lw + GAP);
        w = lw;
      } else {
        x = ox + col * (cellW + GAP);
        w = cellW;
      }
      cells.push({ x: x, y: oy + row * (cellH + GAP), w: w, h: cellH });
    }
    return cells;
  }

  function isAcceptable(cells) {
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].w / cells[i].h;
      if (r < MIN_RATIO || r > MAX_RATIO) return false;
    }
    return true;
  }

  function cellsKey(cells) {
    var parts = [];
    for (var i = 0; i < cells.length; i++) {
      parts.push(
        Math.round(cells[i].x) + ',' + Math.round(cells[i].y) + ',' +
        Math.round(cells[i].w) + ',' + Math.round(cells[i].h)
      );
    }
    return parts.join('|');
  }

  function generateLayouts(count) {
    if (layoutCache[count]) return layoutCache[count];
    if (count === 0) { layoutCache[0] = []; return []; }
    if (count === 1) {
      var full = [{ cells: [{ x: 0, y: 0, w: GRID_W, h: GRID_H }] }];
      layoutCache[1] = full;
      return full;
    }

    var layouts = [];
    var seen = {};

    function add(cells) {
      var key = cellsKey(cells);
      if (seen[key]) return;
      seen[key] = true;
      layouts.push({ cells: cells });
    }

    for (var cols = 2; cols <= Math.min(count, 8); cols++) {
      var rows = Math.ceil(count / cols);
      var cells = layoutCells(count, cols, rows, 0, 0, GRID_W, GRID_H);
      if (isAcceptable(cells)) add(cells);
    }

    if (count >= 3 && count <= HERO_MAX_COUNT) {
      for (var fi = 0; fi < HERO_FRACS.length; fi++) {
        var frac = HERO_FRACS[fi];
        var heroW = Math.round(GRID_W * frac);
        if (heroW / GRID_H < MIN_RATIO || heroW / GRID_H > MAX_RATIO) continue;
        var sideW = GRID_W - heroW - GAP;
        var rest = count - 1;

        var bestSc = -1, bestScore = Infinity;
        for (var sc = 1; sc <= Math.min(rest, 6); sc++) {
          var sr = Math.ceil(rest / sc);
          var sw = (sideW - (sc - 1) * GAP) / sc;
          var sh = (GRID_H - (sr - 1) * GAP) / sr;
          var ratio = sw / sh;
          if (ratio < MIN_RATIO || ratio > MAX_RATIO) continue;
          var score = Math.abs(ratio - IDEAL_RATIO);
          if (score < bestScore) { bestScore = score; bestSc = sc; }
        }

        if (bestSc > 0) {
          for (var ai = 0; ai < 2; ai++) {
            var anchor = ai === 0 ? 'left' : 'right';
            var heroCell = anchor === 'left'
              ? { x: 0, y: 0, w: heroW, h: GRID_H }
              : { x: GRID_W - heroW, y: 0, w: heroW, h: GRID_H };
            var sideX = anchor === 'left' ? heroW + GAP : 0;
            var bestSr = Math.ceil(rest / bestSc);
            var sideCells = layoutCells(rest, bestSc, bestSr, sideX, 0, sideW, GRID_H);
            add([heroCell].concat(sideCells));
          }
        }
      }
    }

    if (layouts.length === 0) {
      var bestCols = 2, bestScore = Infinity;
      for (var c = 2; c <= Math.min(count, 8); c++) {
        var r = Math.ceil(count / c);
        var cw = (GRID_W - (c - 1) * GAP) / c;
        var ch = (GRID_H - (r - 1) * GAP) / r;
        var score = Math.abs(cw / ch - 1);
        if (score < bestScore) { bestScore = score; bestCols = c; }
      }
      layouts.push({
        cells: layoutCells(count, bestCols, Math.ceil(count / bestCols), 0, 0, GRID_W, GRID_H)
      });
    }

    layoutCache[count] = layouts;
    return layouts;
  }

  /* ------------------------------ Rendering ------------------------------- */

  function getOrderedImages() {
    if (!shuffleOrder) return images.slice();
    return shuffleOrder.map(function (i) { return images[i]; }).filter(Boolean);
  }

  function renderPreview() {
    if (!gridEl) return;

    var ordered = getOrderedImages();
    var layouts = generateLayouts(ordered.length);

    if (layouts.length === 0) { gridEl.innerHTML = ''; return; }
    if (layoutIndex >= layouts.length) layoutIndex = 0;
    var layout = layouts[layoutIndex];
    var cells = layout.cells;

    gridEl.innerHTML = '';
    for (var i = 0; i < cells.length; i++) {
      if (!ordered[i]) continue;
      var div = document.createElement('div');
      div.className = 'mb-cell';
      div.style.cssText =
        'position:absolute;' +
        'left:' + cells[i].x + 'px;top:' + cells[i].y + 'px;' +
        'width:' + cells[i].w + 'px;height:' + cells[i].h + 'px;overflow:hidden;';
      var img = document.createElement('img');
      img.src = ordered[i].objectURL;
      img.style.cssText =
        'width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block;';
      div.appendChild(img);
      gridEl.appendChild(div);
    }

    if (headerNameEl && orderData) {
      headerNameEl.innerHTML =
        '<span class="mb-header-light">Moodboard for </span>' +
        '<span class="mb-header-bold">' + U.escapeHtml(orderData.docName || orderData.customerName) + '</span>';
    }
  }

  function renderDropzone() {
    var dropzone = $('#mbDropzone');
    var thumbs = $('#mbThumbs');
    if (!dropzone || !thumbs) return;

    if (images.length === 0) {
      dropzone.classList.remove('has-images');
      thumbs.innerHTML = '';
      return;
    }

    dropzone.classList.add('has-images');
    thumbs.innerHTML = images.map(function (img, i) {
      return '<div class="mb-thumb">' +
        '<img src="' + img.objectURL + '" alt="">' +
        '<button type="button" class="mb-thumb__remove" data-i="' + i + '" aria-label="Remove">&times;</button>' +
      '</div>';
    }).join('');
  }

  function updateControls() {
    var countEl = $('#mbCount');
    var createBtn = $('#mbCreate');
    if (countEl) countEl.textContent = images.length + '/' + MAX_IMAGES;
    if (createBtn) createBtn.disabled = images.length === 0;
  }

  /* ----------------------------- Image handling --------------------------- */

  function addFiles(fileList) {
    var remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;

    var files = Array.from(fileList)
      .filter(function (f) { return f.type.startsWith('image/'); })
      .slice(0, remaining);

    files.forEach(function (file) {
      images.push({
        file: file,
        objectURL: URL.createObjectURL(file),
        id: Math.random().toString(36).slice(2)
      });
    });

    shuffleOrder = null;
    layoutIndex = 0;
    renderDropzone();
    renderPreview();
    updateControls();
  }

  function removeImage(index) {
    var removed = images.splice(index, 1);
    if (removed[0]) URL.revokeObjectURL(removed[0].objectURL);
    shuffleOrder = null;
    layoutIndex = 0;
    renderDropzone();
    renderPreview();
    updateControls();
  }

  function randomize() {
    if (images.length < 1) return;

    if (images.length >= 2) {
      var indices = images.map(function (_, i) { return i; });
      for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
      }
      shuffleOrder = indices;
    }

    var layouts = generateLayouts(images.length);
    if (layouts.length > 1) {
      var next;
      do {
        next = Math.floor(Math.random() * layouts.length);
      } while (next === layoutIndex);
      layoutIndex = next;
    }

    renderPreview();
  }

  /* ----------------------------- Watermark -------------------------------- */

  function moodboardSeed() {
    if (!orderData) return 'moodboard';
    return ['moodboard', orderData.customerName || '', orderData.orderId || '',
      U.todayISO()].join('::');
  }

  function buildWatermark(seed, cssW, cssH, scale) {
    var rand = U.mulberry32(U.hashString(seed));
    var W = Math.round(cssW * scale);
    var H = Math.round(cssH * scale);

    var fw = WM_FIELD_W;
    var fh = Math.max(16, Math.round(fw * cssH / cssW));
    var field = document.createElement('canvas');
    field.width = fw;
    field.height = fh;
    var fc = field.getContext('2d');
    fc.fillStyle = WM_BASE;
    fc.fillRect(0, 0, fw, fh);

    var blobs = 5 + Math.floor(rand() * 4);
    for (var i = 0; i < blobs; i++) {
      var tone = WM_TONES[Math.floor(rand() * WM_TONES.length)];
      var cx = rand() * fw;
      var cy = rand() * fh;
      var r = (0.45 + rand() * 0.55) * fw;
      var squash = 0.45 + rand() * 0.9;
      var angle = rand() * Math.PI;
      var alpha = (0.12 + rand() * 0.26) * (tone[0] < 225 ? 0.45 : 1);

      fc.save();
      fc.translate(cx, cy);
      fc.rotate(angle);
      fc.scale(1, squash);
      var g = fc.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(' + tone + ',' + alpha.toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(' + tone + ',' + (alpha * 0.45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + tone + ',0)');
      fc.fillStyle = g;
      fc.fillRect(-fw * 2, -fh * 2, fw * 4, fh * 4);
      fc.restore();
    }

    var out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    var oc = out.getContext('2d');
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(field, 0, 0, W, H);

    var gw = Math.round(cssW);
    var gh = Math.round(cssH);
    var grain = document.createElement('canvas');
    grain.width = gw;
    grain.height = gh;
    var gc = grain.getContext('2d');
    var gimg = gc.createImageData(gw, gh);
    var gd = gimg.data;
    for (var j = 0; j < gd.length; j += 4) {
      var v = 128 + (rand() - 0.5) * WM_GRAIN * 2;
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

  var MB_FACES = [
    '300 20px "Plus Jakarta Sans"',
    '600 20px "Plus Jakarta Sans"'
  ];

  function fontsReady() {
    if (!document.fonts) return Promise.resolve();
    return Promise.all(MB_FACES.map(function (f) { return document.fonts.load(f); }))
      .then(function () { return document.fonts.ready; })
      .catch(function () {});
  }

  function imagesReady(root) {
    var imgs = $$('img', root);
    return Promise.all(imgs.map(function (img) {
      return img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise(function (res) { img.onload = img.onerror = res; });
    }));
  }

  function cloneReady(doc) {
    var root = doc.documentElement;
    if (root) {
      root.style.setProperty('-webkit-text-size-adjust', 'none');
      root.style.setProperty('text-size-adjust', 'none');
    }
    if (!doc.fonts) return Promise.resolve();
    return Promise.all(MB_FACES.map(function (f) { return doc.fonts.load(f); }))
      .then(function () { return doc.fonts.ready; })
      .catch(function () {});
  }

  function generatePDF() {
    if (!stageEl || images.length === 0) return Promise.reject(new Error('Nothing to generate.'));

    renderPreview();

    return fontsReady()
      .then(function () { return imagesReady(stageEl); })
      .then(function () {
        stageEl.style.backgroundColor = 'transparent';
        return html2canvas(stageEl, {
          scale: SNAPSHOT_SCALE,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          width: STAGE_W,
          height: STAGE_H,
          onclone: cloneReady
        });
      })
      .then(function (raw) {
        stageEl.style.backgroundColor = '';

        var watermark = buildWatermark(moodboardSeed(), STAGE_W, STAGE_H, SNAPSHOT_SCALE);
        var canvas = document.createElement('canvas');
        canvas.width = raw.width;
        canvas.height = raw.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(watermark, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(raw, 0, 0);

        var pageW = 841.89;
        var pageH = pageW * (STAGE_H / STAGE_W);
        var jsPDF = window.jspdf.jsPDF;
        var pdf = new jsPDF({
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
      })
      .catch(function (err) {
        stageEl.style.backgroundColor = '';
        throw err;
      });
  }

  function pdfToBase64(pdf) {
    var arrayBuffer = pdf.output('arraybuffer');
    var bytes = new Uint8Array(arrayBuffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function buildFilename() {
    var now = new Date();
    var ts = now.getFullYear() +
      '-' + String(now.getMonth() + 1).padStart(2, '0') +
      '-' + String(now.getDate()).padStart(2, '0') +
      '-' + String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    var safe = U.sanitizeForFilename(
      orderData ? (orderData.docName || orderData.customerName) : ''
    );
    return safe
      ? 'Moodboard-KelakKembali-' + safe + '-' + ts + '.pdf'
      : 'Moodboard-KelakKembali-' + ts + '.pdf';
  }

  /* ------------------------------ Public API ------------------------------ */

  function init(opts) {
    orderData = opts;
    images = [];
    shuffleOrder = null;
    layoutIndex = 0;

    stageEl = document.querySelector('.stage #moodboardStage');
    gridEl = stageEl ? stageEl.querySelector('#mbGrid') : null;
    headerNameEl = stageEl ? stageEl.querySelector('#mbHeaderName') : null;

    renderPreview();
    renderDropzone();
    updateControls();
  }

  function cleanup() {
    images.forEach(function (img) { URL.revokeObjectURL(img.objectURL); });
    images = [];
    shuffleOrder = null;
    layoutIndex = 0;
  }

  return {
    MAX_IMAGES: MAX_IMAGES,
    init: init,
    cleanup: cleanup,
    addFiles: addFiles,
    removeImage: removeImage,
    randomize: randomize,
    renderPreview: renderPreview,
    generatePDF: generatePDF,
    pdfToBase64: pdfToBase64,
    buildFilename: buildFilename,
    generateLayouts: generateLayouts,
    get images() { return images; },
    get layoutCount() {
      return generateLayouts(images.length).length;
    }
  };
})();
