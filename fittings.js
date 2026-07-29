/* Kelak Kembali — camera-first fitting journal. */
window.KK = window.KK || {};

KK.fittings = (function () {
  'use strict';
  const U = KK.util;
  const localURLs = new Map();
  let root = null, data = null, pending = null, stream = null, facingMode = 'environment', editPhoto = null, retakeTarget = null;
  let pickerCancelHandler = null, focusBeforeOverlay = null;

  const overlayIds = ['fittingCamera', 'fittingConfirm', 'fittingCaptionStep', 'fittingPicker', 'fittingEditSheet'];
  function syncOverlayState() {
    const open = overlayIds.some((id) => !document.querySelector('#' + id).hidden);
    document.body.classList.toggle('has-modal', open);
    if (!open && focusBeforeOverlay && document.contains(focusBeforeOverlay)) focusBeforeOverlay.focus();
    if (!open) focusBeforeOverlay = null;
  }
  function showOverlay(id, focusSelector) {
    if (!focusBeforeOverlay) focusBeforeOverlay = document.activeElement;
    document.querySelector('#' + id).hidden = false;
    syncOverlayState();
    if (focusSelector) requestAnimationFrame(() => document.querySelector(focusSelector).focus());
  }
  function hideOverlay(id) { document.querySelector('#' + id).hidden = true; syncOverlayState(); }

  const thumbURL = (id, size) => id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (size || 200) : '';
  const imageURL = (photo, size) => localURLs.get(photo.id) || thumbURL(photo.drive_file_id, size);
  const notify = (message) => data && data.onToast && data.onToast(message);

  function isHeic(file) { return /(?:heic|heif)$/i.test(file.type || '') || /\.(?:heic|heif)$/i.test(file.name || ''); }
  async function usableBlob(file) {
    if (!isHeic(file)) return file;
    if (typeof window.heic2any !== 'function') throw new Error('This HEIC photo cannot be read on this browser.');
    let converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    if (Array.isArray(converted)) converted = converted[0];
    if (!converted) throw new Error('Could not convert that HEIC photo.');
    return converted;
  }
  function compressImage(blob, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth), width = Math.max(1, Math.round(img.naturalWidth * scale)), height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height); URL.revokeObjectURL(url);
        canvas.toBlob((out) => out ? resolve(out) : reject(new Error('Could not prepare that photo.')), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo.')); };
      img.src = url;
    });
  }
  function base64(blob) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(new Error('Could not prepare photo upload.')); r.readAsDataURL(blob); }); }

  function detectStage(events) {
    const stages = (events || []).filter((e) => KK.calendar.isProductionStage(e.stage) && e.event_date);
    if (!stages.length) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dated = stages.map((e) => ({ event: e, distance: Math.abs(new Date(e.event_date + 'T00:00:00').getTime() - today.getTime()) })).sort((a, b) => a.distance - b.distance);
    return dated.length > 1 && dated[0].distance === dated[1].distance ? null : dated[0].event.stage;
  }

  function showStagePicker(events, onPick, onCancel) {
    const picker = document.querySelector('#fittingPicker'), options = document.querySelector('#fittingPickerOptions');
    pickerCancelHandler = onCancel || null;
    options.innerHTML = (events || []).filter((e) => KK.calendar.isProductionStage(e.stage)).map((e) => '<button type="button" class="fitting-picker__option" data-stage="' + U.escapeHtml(e.stage) + '">' + U.escapeHtml(e.stage) + (e.event_date ? ' · ' + U.escapeHtml(U.formatShortDate(e.event_date)) : '') + '</button>').join('');
    showOverlay('fittingPicker', '.fitting-picker__option');
    options.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { hideOverlay('fittingPicker'); pickerCancelHandler = null; onPick(button.dataset.stage); }));
  }

  function cancelStagePicker() {
    hideOverlay('fittingPicker');
    const callback = pickerCancelHandler; pickerCancelHandler = null;
    if (callback) callback();
  }

  function stopStream() { if (stream) stream.getTracks().forEach((track) => track.stop()); stream = null; }
  async function openCamera() {
    const video = document.querySelector('#fittingCameraVideo');
    const status = document.querySelector('#fittingCameraStatus'), shutter = document.querySelector('#fittingShutter');
    status.hidden = false; shutter.disabled = true; stopStream();
    showOverlay('fittingCamera', '#fittingCameraClose');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false });
      video.srcObject = stream;
      video.onloadedmetadata = () => { status.hidden = true; shutter.disabled = false; video.play().catch(() => {}); };
      const devices = await navigator.mediaDevices.enumerateDevices();
      document.querySelector('#fittingFlip').hidden = devices.filter((d) => d.kind === 'videoinput').length < 2;
    } catch (err) { hideOverlay('fittingCamera'); notify('Camera unavailable — choose a photo instead'); chooseFromGallery(); }
  }
  function closeCamera() { const video = document.querySelector('#fittingCameraVideo'); stopStream(); video.srcObject = null; video.onloadedmetadata = null; hideOverlay('fittingCamera'); }
  function captureFromVideo() {
    const video = document.querySelector('#fittingCameraVideo');
    if (!video.videoWidth) return;
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0); canvas.toBlob((blob) => { if (blob) openConfirmation(blob); }, 'image/jpeg', .9);
  }
  async function flipCamera() { facingMode = facingMode === 'environment' ? 'user' : 'environment'; await openCamera(); }
  function chooseFromGallery() { document.querySelector('#fittingFileInput').click(); }
  async function galleryChanged(event) {
    const file = event.target.files && event.target.files[0]; event.target.value = '';
    if (!file) return;
    try { openConfirmation(await compressImage(await usableBlob(file), 1600, .85)); }
    catch (err) { notify(err.message || 'Could not prepare that photo.'); }
  }

  function clearPending(revoke) { if (revoke && pending) URL.revokeObjectURL(pending.url); pending = null; }
  function openConfirmation(blob) { closeCamera(); clearPending(true); pending = { blob: blob, url: URL.createObjectURL(blob), replacePhoto: retakeTarget }; retakeTarget = null; document.querySelector('#fittingConfirmPreview').src = pending.url; showOverlay('fittingConfirm', '#fittingUsePhoto'); }
  function retake() { hideOverlay('fittingConfirm'); clearPending(true); openCamera(); }
  function usePhoto() { hideOverlay('fittingConfirm'); openCaptionStep(pending && pending.replacePhoto && pending.replacePhoto.caption); }
  function resizeCaption() { const box = document.querySelector('#fittingCaption'); box.style.height = 'auto'; box.style.height = Math.min(box.scrollHeight, 120) + 'px'; }
  function openCaptionStep(caption) { if (!pending) return; const box = document.querySelector('#fittingCaption'); document.querySelector('#fittingCaptionPreview').src = pending.url; box.value = caption || ''; showOverlay('fittingCaptionStep', '#fittingCaption'); resizeCaption(); }
  function closeCaptionStep(discard) { hideOverlay('fittingCaptionStep'); if (discard) clearPending(true); }

  function photosForSession() { return (data.photos || []).slice().sort((a, b) => Number(a.position) - Number(b.position) || String(a.created_at).localeCompare(String(b.created_at))); }
  function findPhoto(id) { return (data.photos || []).find((p) => p.id === id); }
  async function saveCaptionAndPhoto() {
    if (!pending || !data || !data.session) return;
    const save = document.querySelector('#fittingCaptionSave'), caption = document.querySelector('#fittingCaption').value.trim(); save.disabled = true;
    try {
      if (pending.replacePhoto) {
        const old = pending.replacePhoto, captured = pending;
        const updated = await KK.db.updateFittingPhoto(old.id, { caption: caption || null, drive_file_id: null, drive_link: null });
        const oldURL = localURLs.get(old.id); if (oldURL) URL.revokeObjectURL(oldURL);
        localURLs.set(old.id, captured.url); data.photos[data.photos.findIndex((p) => p.id === old.id)] = updated;
        clearPending(false); editPhoto = null; closeCaptionStep(false); renderJournal(root, data); notify('Photo replaced');
        archivePhoto(updated, captured, data).catch((err) => { console.error(err); notify('Photo saved locally; Drive backup failed'); }); return;
      }
      if (editPhoto) {
        const updated = await KK.db.updateFittingPhoto(editPhoto.id, { caption: caption || null });
        data.photos[data.photos.findIndex((p) => p.id === updated.id)] = updated; editPhoto = null; closeCaptionStep(true); renderJournal(root, data); notify('Caption updated'); return;
      }
      const row = await KK.db.createFittingPhoto({ order_id: data.order.id, session_id: data.session.id, stage: data.session.stage, caption: caption || null, position: photosForSession().length });
      const captured = pending; localURLs.set(row.id, captured.url); data.photos.push(row); clearPending(false); closeCaptionStep(false); renderJournal(root, data); notify('Photo saved');
      archivePhoto(row, captured, data).catch((err) => { console.error(err); notify('Photo saved locally; Drive backup failed'); });
    } catch (err) { notify(err.message || 'Could not save photo.'); } finally { save.disabled = false; }
  }
  async function archivePhoto(row, captured, logData) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-'), orderTitle = logData.order.title || logData.order.doc_name || 'Untitled order';
    const response = await KK.db.driveSaveFittingPhoto(await base64(captured.blob), 'image/jpeg', 'Fitting-' + row.stage + '-' + stamp + '.jpg', logData.customer.name, orderTitle, row.stage);
    const updated = await KK.db.updateFittingPhoto(row.id, { drive_file_id: response.file_id, drive_link: response.drive_link });
    if (data === logData) { const i = data.photos.findIndex((p) => p.id === row.id); if (i !== -1) data.photos[i] = updated; }
  }

  function renderJournal(container, nextData) {
    root = container; data = nextData;
    const photos = photosForSession();
    root.innerHTML = photos.length ? photos.map((photo) => {
      const src = imageURL(photo, 800);
      return '<article class="fitting-card"><button type="button" class="fitting-card__image js-fitting-open" data-id="' + U.escapeHtml(photo.id) + '">' + (src ? '<img src="' + U.escapeHtml(src) + '" alt="' + U.escapeHtml(photo.caption || 'Fitting photo') + '">' : '') + '</button><div class="fitting-card__body"><p class="fitting-card__caption' + (!photo.caption ? ' fitting-card__caption--empty' : '') + '">' + U.escapeHtml(photo.caption || 'No revision note') + '</p><div class="fitting-card__actions">' + (data.session.status === 'active' ? '<button type="button" class="fitting-card__icon js-fitting-edit" data-id="' + U.escapeHtml(photo.id) + '" aria-label="Edit photo">⋯</button>' : '') + '<button type="button" class="fitting-card__icon js-fitting-share" data-id="' + U.escapeHtml(photo.id) + '" aria-label="Share photo">↗</button></div></div></article>';
    }).join('') : '<p class="fitting-empty">No photos in this fitting yet.</p>';
    root.querySelectorAll('.js-fitting-open').forEach((b) => b.addEventListener('click', () => { const p = findPhoto(b.dataset.id), src = p && imageURL(p, 1600); if (src) window.open(src, '_blank', 'noopener'); else notify('This photo is still awaiting a Drive backup.'); }));
    root.querySelectorAll('.js-fitting-edit').forEach((b) => b.addEventListener('click', () => openEditSheet(findPhoto(b.dataset.id))));
    root.querySelectorAll('.js-fitting-share').forEach((b) => b.addEventListener('click', () => sharePhoto(findPhoto(b.dataset.id))));
  }
  function renderHistoryList(container, sessions, photos, orderId) {
    const legacy = {};
    (photos || []).filter((p) => !p.session_id).forEach((p) => { (legacy[p.stage] = legacy[p.stage] || []).push(p); });
    const rows = (sessions || []).map((s) => ({ session: s, photos: (photos || []).filter((p) => p.session_id === s.id) })).concat(Object.keys(legacy).map((stage) => ({ session: null, stage, photos: legacy[stage] })));
    container.innerHTML = rows.map((row) => { const stage = row.session ? row.session.stage : row.stage, date = row.session ? row.session.created_at : row.photos[0].created_at; const thumbs = row.photos.slice(0, 3).map((p) => { const src = imageURL(p, 100); return '<span class="fitting-history-row__thumb">' + (src ? '<img src="' + U.escapeHtml(src) + '" alt="">' : '') + '</span>'; }).join(''); return '<button type="button" class="fitting-history-row"' + (row.session ? ' data-session-id="' + U.escapeHtml(row.session.id) + '"' : '') + '><span class="fitting-history-row__thumbs">' + thumbs + '</span><span class="fitting-history-row__text"><span class="fitting-history-row__stage">' + U.escapeHtml(stage) + '</span><span class="fitting-history-row__date">' + U.escapeHtml(U.formatShortDate(date)) + (row.session ? '' : ' · Earlier photos') + '</span></span></button>'; }).join('');
    container.querySelectorAll('[data-session-id]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/order/' + orderId + '/fitting/' + b.dataset.sessionId; }));
  }
  async function sharePhoto(photo) { if (!photo) return; const text = (photo.caption || '') + (photo.caption && photo.drive_link ? '\n' : '') + (photo.drive_link || ''); if (!text) return notify('This photo is still being backed up to Drive.'); if (navigator.share) { try { await navigator.share({ text }); return; } catch (err) { if (err && err.name === 'AbortError') return; } } window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); }
  function openEditSheet(photo) { editPhoto = photo; showOverlay('fittingEditSheet', '#fittingEditCaption'); }
  function closeEditSheet() { hideOverlay('fittingEditSheet'); }
  function editCaption() { if (!editPhoto) return; closeEditSheet(); pending = { url: imageURL(editPhoto, 1600), blob: null }; openCaptionStep(editPhoto.caption); }
  function retakePhoto() { if (!editPhoto) return; retakeTarget = editPhoto; closeEditSheet(); openCamera(); }
  async function deletePhoto() { if (!editPhoto || !confirm('Delete this fitting photo from the journal? The Drive copy will remain available.')) return; try { await KK.db.deleteFittingPhoto(editPhoto.id); const url = localURLs.get(editPhoto.id); if (url) URL.revokeObjectURL(url); localURLs.delete(editPhoto.id); data.photos = data.photos.filter((p) => p.id !== editPhoto.id); closeEditSheet(); editPhoto = null; renderJournal(root, data); notify('Photo deleted'); } catch (err) { notify(err.message || 'Could not delete photo.'); } }
  function startSession(session, state, onToast) { data = Object.assign({}, state, { session, onToast }); openCamera(); }
  async function endSession(session, callback) { const count = (data && data.photos || []).length; if (!confirm('End fitting session? ' + count + ' photo' + (count === 1 ? '' : 's') + ' will be saved.')) return; try { await KK.db.updateFittingSession(session.id, { status: 'completed', completed_at: new Date().toISOString() }); callback(); } catch (err) { notify(err.message || 'Could not end fitting session.'); } }
  function closeAll() {
    stopStream();
    document.querySelector('#fittingCameraVideo').srcObject = null;
    overlayIds.forEach((id) => { document.querySelector('#' + id).hidden = true; });
    pickerCancelHandler = null; editPhoto = null; retakeTarget = null; clearPending(true); syncOverlayState();
  }
  function bindOverlays() {
    document.querySelector('#fittingCameraClose').addEventListener('click', closeCamera); document.querySelector('#fittingGallery').addEventListener('click', chooseFromGallery); document.querySelector('#fittingShutter').addEventListener('click', captureFromVideo); document.querySelector('#fittingFlip').addEventListener('click', flipCamera); document.querySelector('#fittingFileInput').addEventListener('change', galleryChanged);
    document.querySelector('#fittingRetake').addEventListener('click', retake); document.querySelector('#fittingUsePhoto').addEventListener('click', usePhoto); document.querySelector('#fittingCaptionCancel').addEventListener('click', () => { editPhoto = null; closeCaptionStep(true); }); document.querySelector('#fittingCaptionSave').addEventListener('click', saveCaptionAndPhoto); document.querySelector('#fittingCaption').addEventListener('input', resizeCaption);
    document.querySelector('#fittingPickerCancel').addEventListener('click', cancelStagePicker); document.querySelector('#fittingPicker .fitting-picker__backdrop').addEventListener('click', cancelStagePicker); document.querySelector('#fittingEditCancel').addEventListener('click', closeEditSheet); document.querySelector('#fittingEditSheet .fitting-edit-sheet__backdrop').addEventListener('click', closeEditSheet); document.querySelector('#fittingEditCaption').addEventListener('click', editCaption); document.querySelector('#fittingRetakePhoto').addEventListener('click', retakePhoto); document.querySelector('#fittingDeletePhoto').addEventListener('click', deletePhoto);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !document.body.classList.contains('has-modal')) return;
      if (!document.querySelector('#fittingEditSheet').hidden) closeEditSheet();
      else if (!document.querySelector('#fittingPicker').hidden) cancelStagePicker();
      else if (!document.querySelector('#fittingCaptionStep').hidden) { editPhoto = null; closeCaptionStep(true); }
      else if (!document.querySelector('#fittingConfirm').hidden) { hideOverlay('fittingConfirm'); clearPending(true); }
      else closeCamera();
    });
  }
  return { isHeic, usableBlob, compressImage, base64, thumbURL, imageURL, localURLs, archivePhoto, detectStage, showStagePicker, startSession, endSession, renderJournal, renderHistoryList, bindOverlays, openCamera, closeCamera, closeAll };
})();
