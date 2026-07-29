/* Kelak Kembali — fitting revisions log.
   Photos are written to Supabase first, then archived in Drive without making
   the fitting session wait. */

window.KK = window.KK || {};

KK.fittings = (function () {
  'use strict';

  const U = KK.util;
  const localURLs = new Map();
  let root = null;
  let data = null;
  let pending = null;

  const thumbURL = (id, size) =>
    id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (size || 200) : '';
  const imageURL = (photo, size) => localURLs.get(photo.id) || thumbURL(photo.drive_file_id, size);
  const notify = (message) => data && data.onToast && data.onToast(message);

  function isHeic(file) {
    return /(?:heic|heif)$/i.test(file.type || '') || /\.(?:heic|heif)$/i.test(file.name || '');
  }

  async function usableBlob(file) {
    if (!isHeic(file)) return file;
    if (typeof window.heic2any !== 'function') {
      throw new Error('This HEIC photo cannot be read on this browser.');
    }
    let converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    if (Array.isArray(converted)) converted = converted[0];
    if (!converted) throw new Error('Could not convert that HEIC photo.');
    return converted;
  }

  function compressImage(blob, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((out) => out ? resolve(out) : reject(new Error('Could not prepare that photo.')),
          'image/jpeg', quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that photo.'));
      };
      img.src = url;
    });
  }

  function base64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Could not prepare photo upload.'));
      reader.readAsDataURL(blob);
    });
  }

  function stageDate(stage) {
    const event = (data.events || []).find((row) => row.stage === stage);
    return event && event.event_date ? U.formatShortDate(event.event_date) : '';
  }

  function photosFor(stage) {
    return (data.photos || []).filter((photo) => photo.stage === stage)
      .sort((a, b) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)));
  }

  function render(container, nextData) {
    root = container;
    data = nextData;
    const stages = (data.events || []).slice()
      .filter((event) => KK.calendar.isProductionStage(event.stage))
      .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)));

    if (!stages.length) {
      root.innerHTML = '<section class="card"><h2 class="card__title">No fittings scheduled</h2>' +
        '<p class="card__hint">Save the order with production dates to begin its fitting log.</p></section>';
      return;
    }

    root.innerHTML = stages.map((event) => {
      const photos = photosFor(event.stage);
      const thumbs = photos.map((photo) => {
        const src = imageURL(photo, 200);
        return '<button type="button" class="fitting-thumb" data-photo-id="' + U.escapeHtml(photo.id) + '"' +
          ' aria-label="Open fitting photo">' +
          (src ? '<img src="' + U.escapeHtml(src) + '" alt="">' : '<span class="fitting-thumb__missing">Photo pending</span>') +
          (photo.caption ? '<span class="fitting-thumb__caption">' + U.escapeHtml(photo.caption) + '</span>' : '') +
          '</button>';
      }).join('');
      return '<section class="fitting-stage"><div class="fitting-stage__head"><h2 class="fitting-stage__title">' +
        U.escapeHtml(event.stage) + '</h2><span class="fitting-stage__date">' + U.escapeHtml(stageDate(event.stage)) +
        '</span></div><div class="fitting-thumbs">' + thumbs +
        '<button type="button" class="fitting-add" data-stage="' + U.escapeHtml(event.stage) + '" aria-label="Add photo to ' +
        U.escapeHtml(event.stage) + '">+</button></div>' +
        (!photos.length ? '<p class="fitting-stage__empty">No photos yet</p>' : '') + '</section>';
    }).join('');

    root.querySelectorAll('.fitting-add').forEach((button) => {
      button.addEventListener('click', () => choosePhoto(button.dataset.stage));
    });
    root.querySelectorAll('.fitting-thumb').forEach((button) => {
      button.addEventListener('click', () => showPhotoDetail(findPhoto(button.dataset.photoId)));
    });
  }

  function findPhoto(id) {
    return (data.photos || []).find((photo) => photo.id === id) || null;
  }

  function choosePhoto(stage) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', async () => {
      input.remove();
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const compressed = await compressImage(await usableBlob(file), 1600, 0.85);
        openCaptionSheet(stage, compressed, file.name);
      } catch (err) {
        notify(err.message || 'Could not prepare that photo.');
      }
    });
    document.body.appendChild(input);
    input.click();
  }

  function openCaptionSheet(stage, blob, originalName) {
    const sheet = document.querySelector('#fittingCaptionSheet');
    const preview = document.querySelector('#fittingCaptionPreview');
    const caption = document.querySelector('#fittingCaption');
    pending = { stage, blob, originalName, url: URL.createObjectURL(blob) };
    preview.src = pending.url;
    caption.value = '';
    sheet.hidden = false;
    setTimeout(() => caption.focus(), 0);
  }

  function closeCaptionSheet(discard) {
    const sheet = document.querySelector('#fittingCaptionSheet');
    sheet.hidden = true;
    if (discard && pending) URL.revokeObjectURL(pending.url);
    pending = null;
  }

  async function savePendingPhoto() {
    if (!pending || !data) return;
    const save = document.querySelector('#fittingCaptionSave');
    const caption = document.querySelector('#fittingCaption').value.trim();
    save.disabled = true;
    try {
      const position = photosFor(pending.stage).reduce((max, photo) => Math.max(max, Number(photo.position) || 0), -1) + 1;
      const row = await KK.db.createFittingPhoto({
        order_id: data.order.id, stage: pending.stage, caption: caption || null, position: position
      });
      const captured = pending;
      localURLs.set(row.id, captured.url);
      data.photos.push(row);
      closeCaptionSheet(false);
      render(root, data);
      notify('Photo saved');
      archivePhoto(row, captured, data).catch((err) => {
        console.error(err);
        notify('Photo saved locally; Drive backup failed');
      });
    } catch (err) {
      notify(err.message || 'Could not save photo.');
    } finally {
      save.disabled = false;
    }
  }

  async function archivePhoto(row, captured, logData) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const customerName = logData.customer.name;
    const orderTitle = logData.order.title || logData.order.doc_name || 'Untitled order';
    const response = await KK.db.driveSaveFittingPhoto(
      await base64(captured.blob), 'image/jpeg', 'Fitting-' + row.stage + '-' + stamp + '.jpg',
      customerName, orderTitle, row.stage
    );
    const updated = await KK.db.updateFittingPhoto(row.id, {
      drive_file_id: response.file_id, drive_link: response.drive_link
    });
    if (data === logData) {
      const index = data.photos.findIndex((photo) => photo.id === row.id);
      if (index !== -1) data.photos[index] = updated;
      notify('Photo backed up to Drive');
    }
  }

  function showPhotoDetail(photo) {
    if (!photo) return;
    const src = imageURL(photo, 1600);
    if (!src) return notify('This photo is still awaiting a Drive backup.');
    const detail = document.querySelector('#fittingDetail');
    const image = document.querySelector('#fittingDetailImage');
    const caption = document.querySelector('#fittingDetailCaption');
    image.src = src;
    image.alt = photo.caption || 'Fitting photo';
    caption.textContent = photo.caption || 'No caption';
    detail.dataset.photoId = photo.id;
    detail.hidden = false;
  }

  function closePhotoDetail() {
    document.querySelector('#fittingDetail').hidden = true;
  }

  async function sharePhoto() {
    const photo = findPhoto(document.querySelector('#fittingDetail').dataset.photoId);
    if (!photo) return;
    const text = (photo.caption || '') + (photo.caption && photo.drive_link ? '\n' : '') + (photo.drive_link || '');
    if (!text) return notify('This photo is still being backed up to Drive.');
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  async function deletePhoto() {
    const detail = document.querySelector('#fittingDetail');
    const photo = findPhoto(detail.dataset.photoId);
    if (!photo || !confirm('Delete this fitting photo from the log? The Drive copy will remain available.')) return;
    try {
      await KK.db.deleteFittingPhoto(photo.id);
      const url = localURLs.get(photo.id);
      if (url) URL.revokeObjectURL(url);
      localURLs.delete(photo.id);
      data.photos = data.photos.filter((row) => row.id !== photo.id);
      closePhotoDetail();
      render(root, data);
      notify('Photo deleted');
    } catch (err) {
      notify(err.message || 'Could not delete photo.');
    }
  }

  function bindOverlays() {
    document.querySelector('#fittingCaptionCancel').addEventListener('click', () => closeCaptionSheet(true));
    document.querySelector('#fittingCaptionSave').addEventListener('click', savePendingPhoto);
    document.querySelector('#fittingDetailClose').addEventListener('click', closePhotoDetail);
    document.querySelector('#fittingDetailShare').addEventListener('click', sharePhoto);
    document.querySelector('#fittingDetailDelete').addEventListener('click', deletePhoto);
  }

  return { render, bindOverlays, compressImage };
})();
