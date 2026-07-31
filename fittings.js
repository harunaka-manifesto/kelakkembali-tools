window.KK=window.KK||{},KK.fittings=function(){"use strict";const e=KK.util,t=new Map
;let i=null,n=null,o=null,a=null,r="environment",c=null,s=null,l=null,d=null
;const u=["fittingCamera","fittingConfirm","fittingCaptionStep","fittingPicker","fittingEditSheet"];function syncOverlayState(){
const e=u.some(e=>!document.querySelector("#"+e).hidden);document.body.classList.toggle("has-modal",e),!e&&d&&document.contains(d)&&d.focus(),
e||(d=null)}function showOverlay(e,t){d||(d=document.activeElement),document.querySelector("#"+e).hidden=!1,syncOverlayState(),
t&&requestAnimationFrame(()=>document.querySelector(t).focus())}function hideOverlay(e){document.querySelector("#"+e).hidden=!0,syncOverlayState()}
const thumbURL=(e,t)=>e?"https://drive.google.com/thumbnail?id="+encodeURIComponent(e)+"&sz=w"+(t||200):"",imageURL=(e,i)=>t.get(e.id)||thumbURL(e.drive_file_id,i),notify=e=>n&&n.onToast&&n.onToast(e)
;function isHeic(e){return/(?:heic|heif)$/i.test(e.type||"")||/\.(?:heic|heif)$/i.test(e.name||"")}async function usableBlob(e){if(!isHeic(e))return e
;if("function"!=typeof window.heic2any)throw new Error("This HEIC photo cannot be read on this browser.");let t=await window.heic2any({blob:e,
toType:"image/jpeg",quality:.92});if(Array.isArray(t)&&(t=t[0]),!t)throw new Error("Could not convert that HEIC photo.");return t}
function compressImage(e,t,i){return new Promise((n,o)=>{const a=URL.createObjectURL(e),r=new Image;r.onload=()=>{
const e=Math.min(1,t/r.naturalWidth),c=Math.max(1,Math.round(r.naturalWidth*e)),s=Math.max(1,Math.round(r.naturalHeight*e)),l=document.createElement("canvas")
;l.width=c,l.height=s,l.getContext("2d").drawImage(r,0,0,c,s),URL.revokeObjectURL(a),
l.toBlob(e=>e?n(e):o(new Error("Could not prepare that photo.")),"image/jpeg",i)},r.onerror=()=>{URL.revokeObjectURL(a),
o(new Error("Could not read that photo."))},r.src=a})}function base64(e){return new Promise((t,i)=>{const n=new FileReader
;n.onload=()=>t(String(n.result).split(",")[1]||""),n.onerror=()=>i(new Error("Could not prepare photo upload.")),n.readAsDataURL(e)})}
function cancelStagePicker(){hideOverlay("fittingPicker");const e=l;l=null,e&&e()}function stopStream(){a&&a.getTracks().forEach(e=>e.stop()),a=null}
async function openCamera(){
const e=document.querySelector("#fittingCameraVideo"),t=document.querySelector("#fittingCameraStatus"),i=document.querySelector("#fittingShutter")
;t.hidden=!1,i.disabled=!0,stopStream(),showOverlay("fittingCamera","#fittingCameraClose");try{a=await navigator.mediaDevices.getUserMedia({video:{
facingMode:{ideal:r}},audio:!1}),e.srcObject=a,e.onloadedmetadata=()=>{t.hidden=!0,i.disabled=!1,e.play().catch(()=>{})}
;const n=await navigator.mediaDevices.enumerateDevices();document.querySelector("#fittingFlip").hidden=n.filter(e=>"videoinput"===e.kind).length<2
}catch(e){hideOverlay("fittingCamera"),notify("Camera unavailable — choose a photo instead"),chooseFromGallery()}}function closeCamera(){
const e=document.querySelector("#fittingCameraVideo");stopStream(),e.srcObject=null,e.onloadedmetadata=null,hideOverlay("fittingCamera")}
function captureFromVideo(){const e=document.querySelector("#fittingCameraVideo");if(!e.videoWidth)return;const t=document.createElement("canvas")
;t.width=e.videoWidth,t.height=e.videoHeight,t.getContext("2d").drawImage(e,0,0),t.toBlob(e=>{e&&openConfirmation(e)},"image/jpeg",.9)}
async function flipCamera(){r="environment"===r?"user":"environment",await openCamera()}function chooseFromGallery(){
document.querySelector("#fittingFileInput").click()}async function galleryChanged(e){const t=e.target.files&&e.target.files[0];if(e.target.value="",
t)try{openConfirmation(await compressImage(await usableBlob(t),1600,.85))}catch(e){notify(e.message||"Could not prepare that photo.")}}
function clearPending(e){e&&o&&URL.revokeObjectURL(o.url),o=null}function openConfirmation(e){closeCamera(),clearPending(!0),o={blob:e,
url:URL.createObjectURL(e),replacePhoto:s},s=null,document.querySelector("#fittingConfirmPreview").src=o.url,
showOverlay("fittingConfirm","#fittingUsePhoto")}function retake(){hideOverlay("fittingConfirm"),clearPending(!0),openCamera()}function usePhoto(){
hideOverlay("fittingConfirm"),openCaptionStep(o&&o.replacePhoto&&o.replacePhoto.caption)}function resizeCaption(){
const e=document.querySelector("#fittingCaption");e.style.height="auto",e.style.height=Math.min(e.scrollHeight,120)+"px"}function openCaptionStep(e){
if(!o)return;const t=document.querySelector("#fittingCaption");document.querySelector("#fittingCaptionPreview").src=o.url,t.value=e||"",
showOverlay("fittingCaptionStep","#fittingCaption"),resizeCaption()}function closeCaptionStep(e){hideOverlay("fittingCaptionStep"),e&&clearPending(!0)
}function photosForSession(){
return(n.photos||[]).slice().sort((e,t)=>Number(e.position)-Number(t.position)||String(e.created_at).localeCompare(String(t.created_at)))}
function findPhoto(e){return(n.photos||[]).find(t=>t.id===e)}async function saveCaptionAndPhoto(){if(!o||!n||!n.session)return
;const e=document.querySelector("#fittingCaptionSave"),a=document.querySelector("#fittingCaption").value.trim();e.disabled=!0;try{if(o.replacePhoto){
const e=o.replacePhoto,r=o,s=await KK.db.updateFittingPhoto(e.id,{caption:a||null,drive_file_id:null,drive_link:null}),l=t.get(e.id)
;return l&&URL.revokeObjectURL(l),t.set(e.id,r.url),n.photos[n.photos.findIndex(t=>t.id===e.id)]=s,clearPending(!1),c=null,closeCaptionStep(!1),
renderJournal(i,n),notify("Photo replaced"),void archivePhoto(s,r,n).catch(e=>{console.error(e),notify("Photo saved locally; Drive backup failed")})}
if(c){const e=await KK.db.updateFittingPhoto(c.id,{caption:a||null});return n.photos[n.photos.findIndex(t=>t.id===e.id)]=e,c=null,
closeCaptionStep(!0),renderJournal(i,n),void notify("Caption updated")}const e=await KK.db.createFittingPhoto({order_id:n.order.id,
session_id:n.session.id,stage:n.session.stage,caption:a||null,position:photosForSession().length}),r=o;t.set(e.id,r.url),n.photos.push(e),
clearPending(!1),closeCaptionStep(!1),renderJournal(i,n),notify("Photo saved"),archivePhoto(e,r,n).catch(e=>{console.error(e),
notify("Photo saved locally; Drive backup failed")})}catch(e){notify(e.message||"Could not save photo.")}finally{e.disabled=!1}}
async function archivePhoto(e,t,i){
const o=(new Date).toISOString().replace(/[:.]/g,"-"),a=i.order.title||i.order.doc_name||"Untitled order",r=await KK.db.driveSaveFittingPhoto(await base64(t.blob),"image/jpeg","Fitting-"+e.stage+"-"+o+".jpg",i.customer.name,a,e.stage),c=await KK.db.updateFittingPhoto(e.id,{
drive_file_id:r.file_id,drive_link:r.drive_link});if(n===i){const t=n.photos.findIndex(t=>t.id===e.id);-1!==t&&(n.photos[t]=c)}}
function renderJournal(t,o){i=t,n=o;const a=photosForSession();i.innerHTML=a.length?a.map(t=>{const i=imageURL(t,800)
;return'<article class="fitting-card"><button type="button" class="fitting-card__image js-fitting-open" data-id="'+e.escapeHtml(t.id)+'">'+(i?'<img src="'+e.escapeHtml(i)+'" alt="'+e.escapeHtml(t.caption||"Fitting photo")+'">':"")+'</button><div class="fitting-card__body"><p class="fitting-card__caption'+(t.caption?"":" fitting-card__caption--empty")+'">'+e.escapeHtml(t.caption||"No revision note")+'</p><div class="fitting-card__actions">'+("active"===n.session.status?'<button type="button" class="fitting-card__icon js-fitting-edit" data-id="'+e.escapeHtml(t.id)+'" aria-label="Edit photo">⋯</button>':"")+'<button type="button" class="fitting-card__icon js-fitting-share" data-id="'+e.escapeHtml(t.id)+'" aria-label="Share photo">↗</button></div></div></article>'
}).join(""):'<p class="fitting-empty">No photos in this fitting yet.</p>',
i.querySelectorAll(".js-fitting-open").forEach(e=>e.addEventListener("click",()=>{const t=findPhoto(e.dataset.id),i=t&&imageURL(t,1600)
;i?window.open(i,"_blank","noopener"):notify("This photo is still awaiting a Drive backup.")})),
i.querySelectorAll(".js-fitting-edit").forEach(e=>e.addEventListener("click",()=>{return t=findPhoto(e.dataset.id),c=t,
void showOverlay("fittingEditSheet","#fittingEditCaption");var t
})),i.querySelectorAll(".js-fitting-share").forEach(e=>e.addEventListener("click",()=>async function(e){if(!e)return
;const t=(e.caption||"")+(e.caption&&e.drive_link?"\n":"")+(e.drive_link||"");if(!t)return notify("This photo is still being backed up to Drive.")
;if(navigator.share)try{return void await navigator.share({text:t})}catch(e){if(e&&"AbortError"===e.name)return}
window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank","noopener")}(findPhoto(e.dataset.id))))}function closeEditSheet(){
hideOverlay("fittingEditSheet")}function editCaption(){c&&(closeEditSheet(),o={url:imageURL(c,1600),blob:null},openCaptionStep(c.caption))}
function retakePhoto(){c&&(s=c,closeEditSheet(),openCamera())}async function deletePhoto(){
if(c&&confirm("Delete this fitting photo from the journal? The Drive copy will remain available."))try{await KK.db.deleteFittingPhoto(c.id)
;const e=t.get(c.id);e&&URL.revokeObjectURL(e),t.delete(c.id),n.photos=n.photos.filter(e=>e.id!==c.id),closeEditSheet(),c=null,renderJournal(i,n),
notify("Photo deleted")}catch(e){notify(e.message||"Could not delete photo.")}}return{isHeic:isHeic,usableBlob:usableBlob,compressImage:compressImage,
base64:base64,thumbURL:thumbURL,imageURL:imageURL,localURLs:t,archivePhoto:archivePhoto,detectStage:function(e){
const t=(e||[]).filter(e=>KK.calendar.isProductionStage(e.stage)&&e.event_date);if(!t.length)return null;const i=new Date;i.setHours(0,0,0,0)
;const n=t.map(e=>({event:e,distance:Math.abs(new Date(e.event_date+"T00:00:00").getTime()-i.getTime())})).sort((e,t)=>e.distance-t.distance)
;return n.length>1&&n[0].distance===n[1].distance?null:n[0].event.stage},showStagePicker:function(t,i,n){document.querySelector("#fittingPicker")
;const o=document.querySelector("#fittingPickerOptions")
;l=n||null,o.innerHTML=(t||[]).filter(e=>KK.calendar.isProductionStage(e.stage)).map(t=>'<button type="button" class="fitting-picker__option" data-stage="'+e.escapeHtml(t.stage)+'">'+e.escapeHtml(t.stage)+(t.event_date?" · "+e.escapeHtml(e.formatShortDate(t.event_date)):"")+"</button>").join(""),
showOverlay("fittingPicker",".fitting-picker__option"),o.querySelectorAll("button").forEach(e=>e.addEventListener("click",()=>{
hideOverlay("fittingPicker"),l=null,i(e.dataset.stage)}))},startSession:function(e,t,i){n=Object.assign({},t,{session:e,onToast:i}),openCamera()},
endSession:async function(e,t){const i=(n&&n.photos||[]).length;if(confirm("End fitting session? "+i+" photo"+(1===i?"":"s")+" will be saved."))try{
await KK.db.updateFittingSession(e.id,{status:"completed",completed_at:(new Date).toISOString()}),t()}catch(e){
notify(e.message||"Could not end fitting session.")}},renderJournal:renderJournal,renderHistoryList:function(t,i,n,o){const a={}
;(n||[]).filter(e=>!e.session_id).forEach(e=>{(a[e.stage]=a[e.stage]||[]).push(e)});const r=(i||[]).map(e=>({session:e,
photos:(n||[]).filter(t=>t.session_id===e.id)})).concat(Object.keys(a).map(e=>({session:null,stage:e,photos:a[e]})));t.innerHTML=r.map(t=>{
const i=t.session?t.session.stage:t.stage,n=t.session?t.session.created_at:t.photos[0].created_at,o=t.photos.slice(0,3).map(t=>{
const i=imageURL(t,100);return'<span class="fitting-history-row__thumb">'+(i?'<img src="'+e.escapeHtml(i)+'" alt="">':"")+"</span>"}).join("")
;return'<button type="button" class="fitting-history-row"'+(t.session?' data-session-id="'+e.escapeHtml(t.session.id)+'"':"")+'><span class="fitting-history-row__thumbs">'+o+'</span><span class="fitting-history-row__text"><span class="fitting-history-row__stage">'+e.escapeHtml(i)+'</span><span class="fitting-history-row__date">'+e.escapeHtml(e.formatShortDate(n))+(t.session?"":" · Earlier photos")+"</span></span></button>"
}).join(""),t.querySelectorAll("[data-session-id]").forEach(e=>e.addEventListener("click",()=>{
location.hash="#/order/"+o+"/fitting/"+e.dataset.sessionId}))},bindOverlays:function(){
document.querySelector("#fittingCameraClose").addEventListener("click",closeCamera),
document.querySelector("#fittingGallery").addEventListener("click",chooseFromGallery),
document.querySelector("#fittingShutter").addEventListener("click",captureFromVideo),
document.querySelector("#fittingFlip").addEventListener("click",flipCamera),
document.querySelector("#fittingFileInput").addEventListener("change",galleryChanged),
document.querySelector("#fittingRetake").addEventListener("click",retake),
document.querySelector("#fittingUsePhoto").addEventListener("click",usePhoto),
document.querySelector("#fittingCaptionCancel").addEventListener("click",()=>{c=null,closeCaptionStep(!0)}),
document.querySelector("#fittingCaptionSave").addEventListener("click",saveCaptionAndPhoto),
document.querySelector("#fittingCaption").addEventListener("input",resizeCaption),
document.querySelector("#fittingPickerCancel").addEventListener("click",cancelStagePicker),
document.querySelector("#fittingPicker .fitting-picker__backdrop").addEventListener("click",cancelStagePicker),
document.querySelector("#fittingEditCancel").addEventListener("click",closeEditSheet),
document.querySelector("#fittingEditSheet .fitting-edit-sheet__backdrop").addEventListener("click",closeEditSheet),
document.querySelector("#fittingEditCaption").addEventListener("click",editCaption),
document.querySelector("#fittingRetakePhoto").addEventListener("click",retakePhoto),
document.querySelector("#fittingDeletePhoto").addEventListener("click",deletePhoto),document.addEventListener("keydown",e=>{
"Escape"===e.key&&document.body.classList.contains("has-modal")&&(document.querySelector("#fittingEditSheet").hidden?document.querySelector("#fittingPicker").hidden?document.querySelector("#fittingCaptionStep").hidden?document.querySelector("#fittingConfirm").hidden?closeCamera():(hideOverlay("fittingConfirm"),
clearPending(!0)):(c=null,closeCaptionStep(!0)):cancelStagePicker():closeEditSheet())})},openCamera:openCamera,closeCamera:closeCamera,
closeAll:function(){stopStream(),document.querySelector("#fittingCameraVideo").srcObject=null,u.forEach(e=>{document.querySelector("#"+e).hidden=!0}),
l=null,c=null,s=null,clearPending(!0),syncOverlayState()}}}();