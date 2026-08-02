/* Fitting journal UI controller: camera/gallery photo capture, overlays, captions, and fitting records.
   
   - Owns: Fitting photo capture, preview overlays, image compression, thumbnail generation, and journal UI rendering.
   - Does NOT own: Direct Supabase database client (uses KK.db), routing, or order state management.
   - Used by: app.js
*/
window.KK = window.KK || {};

KK.fittings = (function () {
  'use strict';

  const U = KK.util;
  const localURLs = new Map();

  /* Drive backups run after the record already exists, so the pages that need
     to know whether a session is fully archived — the detail card states and
     PDF generation — track them here by session id rather than guessing from
     drive_file_id alone. */
  const pendingBySession = new Map();
  const pendingPhotoIds = new Set();
  const failedBackupsBySession = new Map();

  let journalContainer = null;
  let activeSessionState = null;
  let pendingPhoto = null;
  let editingPhoto = null;
  let activeCameraFacing = 'environment';
  let activeVideoStream = null;

  let editingPhotoTarget = null;
  let replaceTargetPhoto = null;
  let pickerCancelCallback = null;

  const OVERLAY_IDS = [
    'fittingCamera',
    'fittingConfirm',
    'fittingCaptionStep',
    'fittingPicker',
    'fittingEditSheet'
  ];

  /* ------------------------------ Overlay Helpers -------------------------- */

  function syncOverlayState() {
    const isAnyVisible = OVERLAY_IDS.some((id) => !document.querySelector('#' + id).hidden);
    document.body.classList.toggle('has-modal', isAnyVisible);
    if (!isAnyVisible && editingPhotoTarget && document.contains(editingPhotoTarget)) {
      editingPhotoTarget.focus();
    }
    if (!isAnyVisible) editingPhotoTarget = null;
  }

  function showOverlay(id, focusTargetSelector) {
    if (!editingPhotoTarget) editingPhotoTarget = document.activeElement;
    document.querySelector('#' + id).hidden = false;
    syncOverlayState();
    if (focusTargetSelector) {
      requestAnimationFrame(() => document.querySelector(focusTargetSelector).focus());
    }
  }

  function hideOverlay(id) {
    document.querySelector('#' + id).hidden = true;
    syncOverlayState();
  }

  const thumbURL = (driveFileId, size) => driveFileId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveFileId) + '&sz=w' + (size || 200) : '';
  const imageURL = (photo, size) => localURLs.get(photo.id) || thumbURL(photo.drive_file_id, size);
  const notify = (msg) => activeSessionState && activeSessionState.onToast && activeSessionState.onToast(msg);

  /* --------------------------- Image Compression --------------------------- */

  async function usableBlob(file) {
    return U.isHeic(file) ? U.convertHeicToJpeg(file) : file;
  }

  function compressImage(file, maxDimension, quality) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / img.naturalWidth);
        const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetH = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.getContext('2d').drawImage(img, 0, 0, targetW, targetH);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not prepare that photo.')), 'image/jpeg', quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read that photo.'));
      };
      img.src = objectUrl;
    });
  }

  function base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Could not prepare photo upload.'));
      reader.readAsDataURL(file);
    });
  }

  function cancelStagePicker() {
    hideOverlay('fittingPicker');
    const callback = pickerCancelCallback;
    pickerCancelCallback = null;
    if (callback) callback();
  }

  function stopStream() {
    if (activeVideoStream) {
      activeVideoStream.getTracks().forEach((track) => track.stop());
      activeVideoStream = null;
    }
  }

  /* ---------------------------- Camera & Gallery --------------------------- */

  async function openCamera() {
    const videoEl = document.querySelector('#fittingCameraVideo');
    const statusEl = document.querySelector('#fittingCameraStatus');
    const shutterBtn = document.querySelector('#fittingShutter');

    statusEl.hidden = false;
    shutterBtn.disabled = true;
    stopStream();
    showOverlay('fittingCamera', '#fittingCameraClose');

    try {
      activeVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: activeCameraFacing } },
        audio: false
      });
      videoEl.srcObject = activeVideoStream;
      videoEl.onloadedmetadata = () => {
        statusEl.hidden = true;
        shutterBtn.disabled = false;
        videoEl.play().catch(() => {});
      };
      const devices = await navigator.mediaDevices.enumerateDevices();
      document.querySelector('#fittingFlip').hidden = devices.filter((d) => d.kind === 'videoinput').length < 2;
    } catch (_) {
      hideOverlay('fittingCamera');
      notify('Camera unavailable — choose a photo instead');
      chooseFromGallery();
    }
  }

  function closeCamera() {
    const videoEl = document.querySelector('#fittingCameraVideo');
    stopStream();
    videoEl.srcObject = null;
    videoEl.onloadedmetadata = null;
    hideOverlay('fittingCamera');
  }

  function captureFromVideo() {
    const videoEl = document.querySelector('#fittingCameraVideo');
    if (!videoEl.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext('2d').drawImage(videoEl, 0, 0);
    canvas.toBlob((blob) => { if (blob) openConfirmation(blob); }, 'image/jpeg', 0.9);
  }

  async function flipCamera() {
    activeCameraFacing = activeCameraFacing === 'environment' ? 'user' : 'environment';
    await openCamera();
  }

  function chooseFromGallery() {
    document.querySelector('#fittingFileInput').click();
  }

  async function galleryChanged(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (file) {
      try {
        const prepared = await compressImage(await usableBlob(file), 1600, 0.85);
        openConfirmation(prepared);
      } catch (err) {
        notify(err.message || 'Could not prepare that photo.');
      }
    }
  }

  function clearPending(revokeObjectUrl) {
    if (revokeObjectUrl && pendingPhoto && pendingPhoto.blob) {
      URL.revokeObjectURL(pendingPhoto.url);
    }
    pendingPhoto = null;
  }

  function openConfirmation(blob) {
    closeCamera();
    clearPending(true);
    pendingPhoto = {
      blob,
      url: URL.createObjectURL(blob),
      replacePhoto: replaceTargetPhoto
    };
    replaceTargetPhoto = null;
    document.querySelector('#fittingConfirmPreview').src = pendingPhoto.url;
    showOverlay('fittingConfirm', '#fittingUsePhoto');
  }

  function retake() {
    hideOverlay('fittingConfirm');
    clearPending(true);
    openCamera();
  }

  function usePhoto() {
    hideOverlay('fittingConfirm');
    openCaptionStep(pendingPhoto && pendingPhoto.replacePhoto && pendingPhoto.replacePhoto.caption);
  }

  function resizeCaption() {
    const textarea = document.querySelector('#fittingCaption');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function openCaptionStep(initialCaption) {
    if (!pendingPhoto) return;
    const textarea = document.querySelector('#fittingCaption');
    document.querySelector('#fittingCaptionPreview').src = pendingPhoto.url;
    textarea.value = initialCaption || '';
    showOverlay('fittingCaptionStep', '#fittingCaption');
    resizeCaption();
  }

  function closeCaptionStep(clearPendingBlob) {
    hideOverlay('fittingCaptionStep');
    if (clearPendingBlob) clearPending(true);
  }

  function photosForSession() {
    return (activeSessionState.photos || []).slice().sort((a, b) => Number(a.position) - Number(b.position) || String(a.created_at).localeCompare(String(b.created_at)));
  }

  function findPhoto(id) {
    return (activeSessionState.photos || []).find((p) => p.id === id);
  }

  /* The journal renders itself; a host page that owns its own markup — the
     fitting-log detail page — supplies onChange instead and is told to
     re-render its own cards. */
  function refreshUI() {
    if (!activeSessionState) return;
    if ('function' === typeof activeSessionState.onChange) {
      activeSessionState.onChange(activeSessionState);
      return;
    }
    if (journalContainer) renderJournal(journalContainer, activeSessionState);
  }

  function trackBackup(sessionId, photoId, promise) {
    if (!sessionId) return promise;
    const set = pendingBySession.get(sessionId) || new Set();
    pendingBySession.set(sessionId, set);
    pendingPhotoIds.add(photoId);

    const tracked = promise.catch((err) => {
      failedBackupsBySession.set(sessionId, (failedBackupsBySession.get(sessionId) || 0) + 1);
      throw err;
    }).finally(() => {
      set.delete(tracked);
      pendingPhotoIds.delete(photoId);
      if (!set.size) pendingBySession.delete(sessionId);
    });
    set.add(tracked);
    return tracked;
  }

  /* Settles when every in-flight backup for this session has either finished
     or failed — never rejects, because the caller decides what a failed
     backup means for it. */
  function waitForSessionBackups(sessionId) {
    const set = pendingBySession.get(sessionId);
    if (!set || !set.size) return Promise.resolve();
    return Promise.all(Array.from(set).map((p) => p.catch(() => null))).then(() => {
      // A backup started while we waited still counts as pending.
      const still = pendingBySession.get(sessionId);
      return still && still.size ? waitForSessionBackups(sessionId) : undefined;
    });
  }

  /* Reads and clears the failed-backup tally for a session, so a single save
     reports its Drive failures once rather than on every later save. */
  function consumeBackupFailures(sessionId) {
    const count = failedBackupsBySession.get(sessionId) || 0;
    failedBackupsBySession.delete(sessionId);
    return count;
  }

  /* ----------------------------- Save & Archival --------------------------- */

  async function saveCaptionAndPhoto() {
    if (!pendingPhoto || !activeSessionState) return;
    const saveBtn = document.querySelector('#fittingCaptionSave');
    const captionVal = document.querySelector('#fittingCaption').value.trim();
    saveBtn.disabled = true;

    try {
      /* A new stage is only a browser-side draft until its first confirmed
         entry. The host resolves (or creates) the durable session here, so
         cancelling capture never leaves an empty log behind. */
      if (!activeSessionState.session && 'function' === typeof activeSessionState.ensureSession) {
        activeSessionState.session = await activeSessionState.ensureSession();
        if ('function' === typeof activeSessionState.onSession) {
          activeSessionState.onSession(activeSessionState.session);
        }
      }
      if (!activeSessionState.session) throw new Error('Could not start this fitting log.');

      if (pendingPhoto.replacePhoto) {
        const replacePhoto = pendingPhoto.replacePhoto;
        const currentPending = pendingPhoto;
        const updated = await KK.db.updateFittingPhoto(replacePhoto.id, {
          caption: captionVal || null,
          drive_file_id: null,
          drive_link: null
        });

        const oldLocalUrl = localURLs.get(replacePhoto.id);
        if (oldLocalUrl) URL.revokeObjectURL(oldLocalUrl);
        localURLs.set(replacePhoto.id, currentPending.url);

        const photoIdx = activeSessionState.photos.findIndex((p) => p.id === replacePhoto.id);
        if (photoIdx !== -1) activeSessionState.photos[photoIdx] = updated;

        clearPending(false);
        editingPhoto = null;
        closeCaptionStep(false);
        refreshUI();
        notify('Photo replaced');

        trackBackup(updated.session_id, updated.id, archivePhoto(updated, currentPending, activeSessionState)).catch((err) => {
          console.error(err);
          notify('Photo saved locally; Drive backup failed');
        });
        return;
      }

      if (editingPhoto) {
        const updated = await KK.db.updateFittingPhoto(editingPhoto.id, { caption: captionVal || null });
        const photoIdx = activeSessionState.photos.findIndex((p) => p.id === editingPhoto.id);
        if (photoIdx !== -1) activeSessionState.photos[photoIdx] = updated;

        editingPhoto = null;
        closeCaptionStep(true);
        refreshUI();
        notify('Caption updated');
        return;
      }

      const created = await KK.db.createFittingPhoto({
        order_id: activeSessionState.order.id,
        session_id: activeSessionState.session.id,
        stage: activeSessionState.session.stage,
        caption: captionVal || null,
        position: photosForSession().length
      });

      const currentPending = pendingPhoto;
      localURLs.set(created.id, currentPending.url);
      activeSessionState.photos.push(created);

      clearPending(false);
      closeCaptionStep(false);
      refreshUI();
      notify('Photo saved');

      trackBackup(created.session_id, created.id, archivePhoto(created, currentPending, activeSessionState)).catch((err) => {
        console.error(err);
        notify('Photo saved locally; Drive backup failed');
      });
    } catch (err) {
      notify(err.message || 'Could not save photo.');
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function archivePhoto(photoRecord, pendingRecord, sessionState) {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const orderTitle = sessionState.order.title || sessionState.order.doc_name || 'Untitled order';
    const base64Data = await base64(pendingRecord.blob);

    const driveResult = await KK.db.driveSaveFittingPhoto(
      base64Data,
      'image/jpeg',
      'Fitting-' + photoRecord.stage + '-' + timestampStr + '.jpg',
      sessionState.customer.name,
      orderTitle,
      photoRecord.stage
    );

    const updated = await KK.db.updateFittingPhoto(photoRecord.id, {
      drive_file_id: driveResult.file_id,
      drive_link: driveResult.drive_link
    });

    if (activeSessionState === sessionState) {
      const idx = activeSessionState.photos.findIndex((p) => p.id === photoRecord.id);
      if (idx !== -1) activeSessionState.photos[idx] = updated;
      // Backing-up becomes ready-drive without the page being reloaded.
      refreshUI();
    }
    return updated;
  }

  /* ------------------------------ UI Rendering ----------------------------- */

  function renderJournal(container, sessionState) {
    journalContainer = container;
    activeSessionState = sessionState;
    const sortedPhotos = photosForSession();

    container.innerHTML = sortedPhotos.length ? sortedPhotos.map((photo) => {
      const srcUrl = imageURL(photo, 800);
      return '<article class="fitting-card">' +
        '<button type="button" class="fitting-card__image js-fitting-open" data-id="' + U.escapeHtml(photo.id) + '">' +
        (srcUrl ? '<img src="' + U.escapeHtml(srcUrl) + '" alt="' + U.escapeHtml(photo.caption || 'Fitting photo') + '">' : '') +
        '</button>' +
        '<div class="fitting-card__body">' +
        '<p class="fitting-card__caption' + (photo.caption ? '' : ' fitting-card__caption--empty') + '">' + U.escapeHtml(photo.caption || 'No revision note') + '</p>' +
        '<div class="fitting-card__actions">' +
        '<button type="button" class="fitting-card__icon js-fitting-edit" data-id="' + U.escapeHtml(photo.id) + '" aria-label="Edit photo">⋯</button>' +
        '<button type="button" class="fitting-card__icon js-fitting-share" data-id="' + U.escapeHtml(photo.id) + '" aria-label="Share photo">↗</button>' +
        '</div>' +
        '</div>' +
        '</article>';
    }).join('') : '<p class="fitting-empty">No photos in this fitting yet.</p>';

    container.querySelectorAll('.js-fitting-open').forEach((btn) => btn.addEventListener('click', () => {
      const photo = findPhoto(btn.dataset.id);
      const url = photo && imageURL(photo, 1600);
      if (url) window.open(url, '_blank', 'noopener');
      else notify('This photo is still awaiting a Drive backup.');
    }));

    container.querySelectorAll('.js-fitting-edit').forEach((btn) => btn.addEventListener('click', () => {
      editingPhoto = findPhoto(btn.dataset.id);
      showOverlay('fittingEditSheet', '#fittingEditCaption');
    }));

    container.querySelectorAll('.js-fitting-share').forEach((btn) => btn.addEventListener('click', () => {
      const photo = findPhoto(btn.dataset.id);
      if (!photo) return;
      const shareText = (photo.caption || '') + (photo.caption && photo.drive_link ? '\n' : '') + (photo.drive_link || '');
      if (!shareText) return notify('This photo is still being backed up to Drive.');

      if (navigator.share) {
        navigator.share({ text: shareText }).catch((err) => {
          if (err && err.name === 'AbortError') return;
          window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank', 'noopener');
        });
        return;
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank', 'noopener');
    }));
  }

  function closeEditSheet() {
    hideOverlay('fittingEditSheet');
  }

  function editCaption() {
    if (!editingPhoto) return;
    closeEditSheet();
    pendingPhoto = { url: imageURL(editingPhoto, 1600), blob: null };
    openCaptionStep(editingPhoto.caption);
  }

  function retakePhoto() {
    if (!editingPhoto) return;
    replaceTargetPhoto = editingPhoto;
    closeEditSheet();
    openCamera();
  }

  async function deletePhoto() {
    if (!editingPhoto || !confirm('Delete this fitting photo from the journal? The Drive copy will remain available.')) return;
    try {
      await KK.db.deleteFittingPhoto(editingPhoto.id);
      const url = localURLs.get(editingPhoto.id);
      if (url) URL.revokeObjectURL(url);
      localURLs.delete(editingPhoto.id);

      activeSessionState.photos = activeSessionState.photos.filter((p) => p.id !== editingPhoto.id);
      closeEditSheet();
      editingPhoto = null;
      refreshUI();
      notify('Photo deleted');
    } catch (err) {
      notify(err.message || 'Could not delete photo.');
    }
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    isHeic: U.isHeic,
    usableBlob,
    compressImage,
    base64,
    thumbURL,
    imageURL,
    localURLs,
    archivePhoto,
    waitForSessionBackups,

    isBackingUp: (photoId) => pendingPhotoIds.has(photoId),
    hasPendingBackups: (sessionId) => {
      const set = pendingBySession.get(sessionId);
      return !!(set && set.size);
    },
    consumeBackupFailures,

    /* Lets a page that owns its own markup drive the shared capture flow: it
       supplies the session context plus an onChange callback and then calls
       addPhoto() to open the camera. */
    attachSession: function (sessionState) {
      activeSessionState = sessionState;
      journalContainer = null;
      return activeSessionState;
    },

    detachSession: function (sessionState) {
      if (!sessionState || activeSessionState === sessionState) activeSessionState = null;
    },

    addPhoto: function () {
      openCamera();
    },

    releaseLocalURL: function (photoId) {
      const url = localURLs.get(photoId);
      if (url) URL.revokeObjectURL(url);
      localURLs.delete(photoId);
    },

    adoptLocalURL: function (photoId, url) {
      const previous = localURLs.get(photoId);
      if (previous && previous !== url) URL.revokeObjectURL(previous);
      if (url) localURLs.set(photoId, url);
      else localURLs.delete(photoId);
    },

    showStagePicker: function (_events, onSelectStage, onCancel) {
      const pickerEl = document.querySelector('#fittingPickerOptions');
      pickerCancelCallback = onCancel || null;

      pickerEl.innerHTML = KK.calendar.PRODUCTION_STAGES
        .map((stage) =>
          '<button type="button" class="fitting-picker__option" data-stage="' + U.escapeHtml(stage) + '">' +
          U.escapeHtml(KK.util.fittingStage(stage).label) +
          '</button>'
        ).join('');

      showOverlay('fittingPicker', '.fitting-picker__option');
      pickerEl.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
        hideOverlay('fittingPicker');
        pickerCancelCallback = null;
        onSelectStage(btn.dataset.stage);
      }));
    },

    endSession: async function (sessionRecord, onSuccess) {
      const count = (activeSessionState && activeSessionState.photos || []).length;
      if (!sessionRecord || !count) {
        notify('Add at least one photo before saving the log.');
        return;
      }
      if (confirm('Save this fitting log? ' + count + ' photo' + (count === 1 ? '' : 's') + ' will be saved.')) {
        try {
          await waitForSessionBackups(sessionRecord.id);
          const backupFailures = consumeBackupFailures(sessionRecord.id);
          await KK.db.updateFittingSession(sessionRecord.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
          onSuccess();
          /* The database log is already durable: a failed Drive copy is
             reported, never a reason to roll the saved log back. */
          if (backupFailures) {
            notify('Log saved, but ' + backupFailures + ' Drive backup' + (backupFailures === 1 ? '' : 's') + ' failed.');
          }
        } catch (err) {
          notify(err.message || 'Could not save fitting log.');
        }
      }
    },

    renderJournal,

    renderHistoryList: function (container, sessionList, photoList, orderId) {
      const unassignedMap = {};
      (photoList || []).filter((p) => !p.session_id).forEach((p) => {
        (unassignedMap[p.stage] = unassignedMap[p.stage] || []).push(p);
      });

      const items = (sessionList || []).map((s) => ({
        session: s,
        photos: (photoList || []).filter((p) => p.session_id === s.id)
      })).concat(Object.keys(unassignedMap).map((stage) => ({
        session: null,
        stage,
        photos: unassignedMap[stage]
      })));

      container.innerHTML = items.map((item) => {
        const stageName = item.session ? item.session.stage : item.stage;
        const dateVal = item.session ? item.session.created_at : item.photos[0].created_at;
        const thumbsHtml = item.photos.slice(0, 3).map((p) => {
          const url = imageURL(p, 100);
          return '<span class="fitting-history-row__thumb">' + (url ? '<img src="' + U.escapeHtml(url) + '" alt="">' : '') + '</span>';
        }).join('');

        return '<button type="button" class="fitting-history-row"' + (item.session ? ' data-session-id="' + U.escapeHtml(item.session.id) + '"' : '') + '>' +
          '<span class="fitting-history-row__thumbs">' + thumbsHtml + '</span>' +
          '<span class="fitting-history-row__text">' +
          '<span class="fitting-history-row__stage">' + U.escapeHtml(stageName) + '</span>' +
          '<span class="fitting-history-row__date">' + U.escapeHtml(U.formatShortDate(dateVal)) + (item.session ? '' : ' · Earlier photos') + '</span>' +
          '</span>' +
          '</button>';
      }).join('');

      container.querySelectorAll('[data-session-id]').forEach((btn) => btn.addEventListener('click', () => {
        location.hash = '#/order/' + orderId + '/fitting/' + btn.dataset.sessionId;
      }));
    },

    bindOverlays: function () {
      document.querySelector('#fittingCameraClose').addEventListener('click', closeCamera);
      document.querySelector('#fittingGallery').addEventListener('click', chooseFromGallery);
      document.querySelector('#fittingShutter').addEventListener('click', captureFromVideo);
      document.querySelector('#fittingFlip').addEventListener('click', flipCamera);
      document.querySelector('#fittingFileInput').addEventListener('change', galleryChanged);
      document.querySelector('#fittingRetake').addEventListener('click', retake);
      document.querySelector('#fittingUsePhoto').addEventListener('click', usePhoto);
      document.querySelector('#fittingCaptionCancel').addEventListener('click', () => { editingPhoto = null; closeCaptionStep(true); });
      document.querySelector('#fittingCaptionSave').addEventListener('click', saveCaptionAndPhoto);
      document.querySelector('#fittingCaption').addEventListener('input', resizeCaption);
      document.querySelector('#fittingPickerCancel').addEventListener('click', cancelStagePicker);
      document.querySelector('#fittingPicker .fitting-picker__backdrop').addEventListener('click', cancelStagePicker);
      document.querySelector('#fittingEditCancel').addEventListener('click', closeEditSheet);
      document.querySelector('#fittingEditSheet .fitting-edit-sheet__backdrop').addEventListener('click', closeEditSheet);
      document.querySelector('#fittingEditCaption').addEventListener('click', editCaption);
      document.querySelector('#fittingRetakePhoto').addEventListener('click', retakePhoto);
      document.querySelector('#fittingDeletePhoto').addEventListener('click', deletePhoto);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('has-modal')) {
          if (!document.querySelector('#fittingEditSheet').hidden) {
            closeEditSheet();
          } else if (!document.querySelector('#fittingPicker').hidden) {
            cancelStagePicker();
          } else if (!document.querySelector('#fittingCaptionStep').hidden) {
            editingPhoto = null;
            closeCaptionStep(true);
          } else if (!document.querySelector('#fittingConfirm').hidden) {
            hideOverlay('fittingConfirm');
            clearPending(true);
          } else {
            closeCamera();
          }
        }
      });
    },

    openCamera,
    closeCamera,

    closeAll: function () {
      stopStream();
      document.querySelector('#fittingCameraVideo').srcObject = null;
      OVERLAY_IDS.forEach((id) => { document.querySelector('#' + id).hidden = true; });
      pickerCancelCallback = null;
      editingPhoto = null;
      replaceTargetPhoto = null;
      clearPending(true);
      syncOverlayState();
    }
  };
})();
