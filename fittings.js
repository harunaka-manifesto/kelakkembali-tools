/* Shared fitting image preparation and Google Drive archival, plus the stage
   picker that opens a fitting log.

   - Owns: HEIC conversion, the one JPEG preparation contract every fitting
     photo passes through, local object-URL ownership, Drive archival, and the
     pending-backup registry the detail page and the PDF both read.
   - Does NOT own: a route, a page's markup, Supabase access (uses KK.db), or
     what an annotation is — marks are metadata on a row; this module moves
     bytes.
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

  let pickerCancelCallback = null;

  /* ------------------------------ Overlay Helpers -------------------------- */

  /* The stage picker is the only overlay left here. The camera, its
     confirmation step and its caption step were the journal's, and the journal
     is retired: photos come from the device gallery and are captioned and
     marked in the fitting workspace. */
  const PICKER_ID = 'fittingPicker';

  let pickerReturnTarget = null;

  function syncOverlayState() {
    const visible = !document.querySelector('#' + PICKER_ID).hidden;
    document.body.classList.toggle('has-modal', visible);
    if (!visible && pickerReturnTarget && document.contains(pickerReturnTarget)) {
      pickerReturnTarget.focus({ preventScroll: true });
    }
    if (!visible) pickerReturnTarget = null;
  }

  function showOverlay(id, focusTargetSelector) {
    if (!pickerReturnTarget) pickerReturnTarget = document.activeElement;
    document.querySelector('#' + id).hidden = false;
    syncOverlayState();
    if (focusTargetSelector) {
      requestAnimationFrame(() => document.querySelector(focusTargetSelector).focus({ preventScroll: true }));
    }
  }

  function hideOverlay(id) {
    document.querySelector('#' + id).hidden = true;
    syncOverlayState();
  }

  const thumbURL = (driveFileId, size) => driveFileId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveFileId) + '&sz=w' + (size || 200) : '';
  const imageURL = (photo, size) => localURLs.get(photo.id) || thumbURL(photo.drive_file_id, size);

  /* --------------------------- Image Compression --------------------------- */

  /* One preparation contract for every fitting path — the gallery selection on
     the workspace page is now the only door, but the contract stays a contract
     so a photo's quality can never depend on which one is added later. */
  const FITTING_IMAGE_MAX_DIMENSION = 2560;
  const FITTING_IMAGE_QUALITY = 0.90;

  async function usableBlob(file) {
    return U.isHeic(file) ? U.convertHeicToJpeg(file) : file;
  }

  function compressImage(file, maxDimension, quality) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // The longest edge is what the ceiling describes: scaling by width
        // alone left a tall portrait photo far above the intended size.
        const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
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

  /* HEIC in, standard-sized JPEG out. Throws the user-safe messages
     compressImage already raises; the only URL it revokes is the decoder's
     own. */
  async function prepareImage(fileOrBlob) {
    return compressImage(await usableBlob(fileOrBlob), FITTING_IMAGE_MAX_DIMENSION, FITTING_IMAGE_QUALITY);
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
    hideOverlay(PICKER_ID);
    const callback = pickerCancelCallback;
    pickerCancelCallback = null;
    if (callback) callback();
  }

  /* ------------------------ Pending backup registry ------------------------ */

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

  /* ------------------------------- Archival -------------------------------- */

  /* The archive holds the original photo and only the original photo. A red
     mark is vector data on the row, so nothing about it is uploaded and no
     derivative image is ever created — the clean original stays the truth, and
     the PDF is the shareable annotated artifact.

     Runs after the metadata commit, never before: uploading first would strand
     archive files whenever the transaction failed. */
  async function archivePhoto(photoRecord, pendingRecord, context) {
    const ctx = context || {};
    const order = ctx.order || {};
    const customer = ctx.customer || {};
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const base64Data = await base64(pendingRecord.blob);

    const driveResult = await KK.db.driveSaveFittingPhoto(
      base64Data,
      'image/jpeg',
      'Fitting-' + photoRecord.stage + '-' + timestampStr + '.jpg',
      customer.name || 'Unnamed customer',
      order.title || order.doc_name || 'Untitled order',
      photoRecord.stage
    );

    return KK.db.updateFittingPhoto(photoRecord.id, {
      drive_file_id: driveResult.file_id,
      drive_link: driveResult.drive_link
    });
  }

  /* ------------------------------- Public API ------------------------------ */

  return {
    isHeic: U.isHeic,
    usableBlob,
    compressImage,
    prepareImage,
    FITTING_IMAGE_MAX_DIMENSION,
    FITTING_IMAGE_QUALITY,
    base64,
    thumbURL,
    imageURL,
    localURLs,
    archivePhoto,
    waitForSessionBackups,

    /* The archival half of the save path, for a page that already owns the
       record: registers the upload with the pending set so
       isBackingUp/hasPendingBackups/consumeBackupFailures keep telling the
       truth, and hands the tracked promise back so the caller can patch its
       own copy of the row when it settles. */
    backupPhoto: function (photoRecord, pendingRecord, context) {
      return trackBackup(
        photoRecord.session_id,
        photoRecord.id,
        archivePhoto(photoRecord, pendingRecord, context)
      );
    },

    isBackingUp: (photoId) => pendingPhotoIds.has(photoId),
    hasPendingBackups: (sessionId) => {
      const set = pendingBySession.get(sessionId);
      return !!(set && set.size);
    },
    consumeBackupFailures,

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

    /* Which fitting is this? The one question the order page has to answer
       before a log can exist, asked with the five canonical production stages
       and nothing else. */
    showStagePicker: function (_events, onSelectStage, onCancel) {
      const pickerEl = document.querySelector('#fittingPickerOptions');
      pickerCancelCallback = onCancel || null;

      pickerEl.innerHTML = KK.calendar.PRODUCTION_STAGES
        .map((stage) =>
          '<button type="button" class="fitting-picker__option" data-stage="' + U.escapeHtml(stage) + '">' +
          U.escapeHtml(KK.util.fittingStage(stage).label) +
          '</button>'
        ).join('');

      showOverlay(PICKER_ID, '.fitting-picker__option');
      pickerEl.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
        hideOverlay(PICKER_ID);
        pickerCancelCallback = null;
        onSelectStage(btn.dataset.stage);
      }));
    },

    bindOverlays: function () {
      document.querySelector('#fittingPickerCancel').addEventListener('click', cancelStagePicker);
      document.querySelector('#fittingPicker .fitting-picker__backdrop').addEventListener('click', cancelStagePicker);

      document.addEventListener('keydown', (e) => {
        if ('Escape' === e.key && !document.querySelector('#' + PICKER_ID).hidden) cancelStagePicker();
      });
    },

    closeAll: function () {
      document.querySelector('#' + PICKER_ID).hidden = true;
      pickerCancelCallback = null;
      syncOverlayState();
    }
  };
})();
