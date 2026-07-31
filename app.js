window.KK=window.KK||{},KK.app=function(){"use strict"
;const e=KK.util,t=KK.db,o=KK.docs,n=KK.calendar,a=e.$,s=e.$$,r=["Custom design & consultation","Production","Standard fabric","Plain veil","Fitting","Laundry"],i=["Quoted","Confirmed","In production","Delivered"],d=["Instagram","TikTok","Referral","Walk-in","Other"],c={
label:"Check in",days:3},l={label:"Follow up moodboard",days:3
},u='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',m='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',h='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',p={
boot:a("#boot"),gate:a("#gate"),gateForm:a("#gateForm"),gatePassword:a("#gatePassword"),gateRemember:a("#gateRemember"),gateErr:a("#gateErr"),
gateSubmit:a("#gateSubmit"),app:a("#app"),upLink:a("#upLink"),upLabel:a("#upLabel"),appbarBrand:a("#appbarBrand"),homeLink:a("#homeLink"),
viewTitle:a("#viewTitle"),viewSub:a("#viewSub"),pageAction:a("#pageAction"),savebar:a("#savebar"),saveBtn:a("#saveBtn"),menu:a("#menu"),
menuBtn:a("#menuBtn"),menuList:a("#menuList"),menuDelete:a("#menuDelete"),menuCalendar:a("#menuCalendar"),menuSignOut:a("#menuSignOut"),
viewCustomers:a("#viewCustomers"),homeStage:a("#homeStage"),homeLoading:a("#homeLoading"),homeError:a("#homeError"),homeReady:a("#homeReady"),homeHero:a("#homeHero"),homeActions:a("#homeActions"),
homeCustomers:a("#homeCustomers"),homeFooter:a("#homeFooter"),homeSummary:a("#homeSummary"),heroGreeting:a("#heroGreeting"),heroDeadline:a("#heroDeadline"),customerSearch:a("#customerSearch"),customerList:a("#customerList"),viewCustomer:a("#viewCustomer"),
customerViewCard:a("#customerViewCard"),dPhone:a("#dPhone"),dInstagram:a("#dInstagram"),dSource:a("#dSource"),dWedding:a("#dWedding"),
dNotes:a("#dNotes"),dCreated:a("#dCreated"),dMoodboard:a("#dMoodboard"),dMoodboardRow:a("#dMoodboardRow"),dCancelled:a("#dCancelled"),
dCancelledRow:a("#dCancelledRow"),followUpLine:a("#followUpLine"),cancelCustomer:a("#cancelCustomer"),reopenCustomer:a("#reopenCustomer"),
customerEditCard:a("#customerEditCard"),cName:a("#cName"),errCName:a("#errCName"),cPhone:a("#cPhone"),cInstagram:a("#cInstagram"),
cSource:a("#cSource"),cWedding:a("#cWedding"),cWeddingMonth:a("#cWeddingMonth"),cWeddingPrecision:a("#cWeddingPrecision"),
cMoodboardDate:a("#cMoodboardDate"),cFollowUpDate:a("#cFollowUpDate"),cFollowUpLabel:a("#cFollowUpLabel"),cCancelledReason:a("#cCancelledReason"),
cCancelledField:a("#cCancelledField"),cNotes:a("#cNotes"),customerOrdersCard:a("#customerOrdersCard"),ordersTotal:a("#ordersTotal"),
orderList:a("#orderList"),newOrder:a("#newOrder"),viewOrder:a("#viewOrder"),oDocNameDisplay:a("#oDocNameDisplay"),
oFirstPaymentDisplay:a("#oFirstPaymentDisplay"),oSecondPaymentDisplay:a("#oSecondPaymentDisplay"),oFinalPaymentDisplay:a("#oFinalPaymentDisplay"),
oWeddingDisplay:a("#oWeddingDisplay"),oItemsDisplay:a("#oItemsDisplay"),oIncludesDisplay:a("#oIncludesDisplay"),historyLog:a("#historyLog"),
paymentSummary:a("#paymentSummary"),logPaymentBtn:a("#logPaymentBtn"),paymentChooserOptions:a("#paymentChooserOptions"),
scheduleCard:a("#scheduleCard"),scheduleCount:a("#scheduleCount"),scheduleList:a("#scheduleList"),syncCalendarBtn:a("#syncCalendarBtn"),
scheduleSyncNote:a("#scheduleSyncNote"),fittingHistoryCard:a("#fittingHistoryCard"),fittingHistoryList:a("#fittingHistoryList"),
logNewFittingBtn:a("#logNewFittingBtn"),viewCalendar:a("#viewCalendar"),gcalState:a("#gcalState"),gcalConnect:a("#gcalConnect"),
gcalDisconnect:a("#gcalDisconnect"),gcalErr:a("#gcalErr"),enquiriesCard:a("#enquiriesCard"),enquiriesCount:a("#enquiriesCount"),
viewEnquiry:a("#viewEnquiry"),enquiryWhen:a("#enquiryWhen"),enquiryAnswers:a("#enquiryAnswers"),enquiryNote:a("#enquiryNote"),
enquiryAccept:a("#enquiryAccept"),enquiryDismiss:a("#enquiryDismiss"),viewMoodboard:a("#viewMoodboard"),viewFittingJournal:a("#viewFittingJournal"),
fittingJournal:a("#fittingJournal"),fittingJournalBar:a("#fittingJournalBar"),fittingJournalAdd:a("#fittingJournalAdd"),
viewOrderEdit:a("#viewOrderEdit"),oTitle:a("#oTitle"),oDocName:a("#oDocName"),oFirstPayment:a("#oFirstPayment"),oSecondPayment:a("#oSecondPayment"),
oFinalPayment:a("#oFinalPayment"),oScheduleHint:a("#oScheduleHint"),oScheme:a("#oScheme"),termsCard:a("#termsCard"),termList:a("#termList"),
addTerm:a("#addTerm"),termsSum:a("#termsSum"),errTerms:a("#errTerms"),itemList:a("#itemList"),itemsTotal:a("#itemsTotal"),addItem:a("#addItem"),
includesList:a("#includesList"),customInclude:a("#customInclude"),addInclude:a("#addInclude"),actionbar:a("#actionbar"),
totalDisplay:a("#totalDisplay"),downloadNote:a("#downloadNote"),downloadQuote:a("#downloadQuote"),downloadInvoice:a("#downloadInvoice"),
toast:a("#toast"),calcSheet:a("#calcSheet"),calcItemLabel:a("#calcItemLabel"),calcRowList:a("#calcRowList"),calcAddRow:a("#calcAddRow"),
calcTotal:a("#calcTotal"),calcApply:a("#calcApply"),calcBack:a("#calcBack"),mbPresentation:a("#mbPresentation"),
mbPresentationClose:a("#mbPresentationClose")},g={quotation:p.downloadQuote,invoice:p.downloadInvoice},w={route:null,// { view, id }
customers:[],// the whole list, filtered client-side
customer:null,// record backing the customer view
order:null,// record backing the order views
overview:null,// { ordersByCustomer } — every order, for the homepage
loggedDeposits:{},// { depositIndex: loggedAt } for the open order
schedule:null,// computed programme + stored rows for the open order
customerOrders:[],// the open customer's orders — what their status is read from
enquiry:null,// the intake submission being reviewed
googleConnected:null,// null until asked; cached for the session
dirty:!1,saving:!1,homepage:{phase:"idle",visit:0,loadToken:0,popPlayedForVisit:0}};let f;function showToast(e){
p.toast.textContent=e,p.toast.classList.add("is-visible"),clearTimeout(f),f=setTimeout(()=>p.toast.classList.remove("is-visible"),2600)}
function setDirty(e){w.dirty=e,p.saveBtn.disabled=!e||w.saving,a(".btn__label",p.saveBtn).textContent=w.saving?"Saving…":e?"Save changes":"Saved"}
function syncBottomBar(){const e=p.actionbar.hidden?p.savebar.hidden?p.fittingJournalBar.hidden?null:p.fittingJournalBar:p.savebar:p.actionbar
;document.documentElement.style.setProperty("--bottombar-h",e?Math.round(e.getBoundingClientRect().height)+"px":"0px")}function syncVisualViewport(){
const e=window.visualViewport,t=e?Math.max(0,window.innerHeight-e.height-e.offsetTop):0
;document.documentElement.style.setProperty("--keyboard-offset",Math.round(t)+"px"),syncBottomBar()}function trapModalFocus(e,t){if("Tab"!==e.key||!t||t.hidden)return
;const o=Array.from(t.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(e=>!e.hidden&&e.getClientRects().length)
;if(!o.length)return;const n=o[0],a=o[o.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),
a.focus()):e.shiftKey||document.activeElement!==a||(e.preventDefault(),n.focus())}function setSaveBar(e){p.savebar.hidden=!e,
document.body.classList.toggle("has-savebar",!!e),syncBottomBar()}let D=null;function setPageAction(e){D=e?e.onClick:null,p.pageAction.hidden=!e,
e&&(p.pageAction.textContent=e.label)}function setChrome(e){p.viewTitle.textContent=e.title,
document.body.classList.toggle("is-homepage",!!e.homepage),p.viewSub.innerHTML=e.sub||"",p.viewSub.hidden=!e.sub
;const t=e.up||null;p.upLink.hidden=!t,p.appbarBrand.hidden=!!t,t&&(p.upLink.href=t.hash,p.upLabel.textContent=t.label),
p.homeLink.hidden=!t||"#/customers"===t.hash,setPageAction(e.action||null),p.actionbar.hidden=!e.actions,
document.body.classList.toggle("has-actionbar",!!e.actions),setSaveBar(!!e.save),closeMenu(),
// Delete belongs to a record, so the menu only offers it on a record page.
p.menuDelete.hidden=!e.destroy,p.menuDelete.className="menu__item menu__item--danger",
e.destroy&&(p.menuDelete.textContent="order"===e.destroy?"Delete order":"Delete customer",p.menuDelete.dataset.kind=e.destroy),syncBottomBar()}
function closeMenu(){p.menuList.hidden=!0,p.menuBtn.setAttribute("aria-expanded","false")}const badgeClass=e=>"badge badge--"+(e=>String(e).toLowerCase().replace(/\s+/g,"-"))(e)
;function effectiveStatus(e){const t=i.includes(e.status)?e.status:i[0];return e.final_payment_date?"Delivered":t}async function bumpStatus(e){
const o=function(e,t){const o=i.indexOf(e);return i.indexOf(t)>o?t:-1===o?i[0]:e}(w.order.status,e);if(o!==w.order.status)try{
w.order=await t.updateOrder(w.order.id,{status:o}),renderOrderStatus()}catch(e){console.error(e)}}function renderOrderStatus(){
const t=effectiveStatus(w.order);p.viewSub.innerHTML='<span class="'+badgeClass(t)+'">'+e.escapeHtml(t)+"</span>",p.viewSub.hidden=!1}
function customerStatus(e,t){if(!e)return"In consultation";if(e.cancelled_at)return"Cancelled";const o=t||[]
;return o.length&&o.every(e=>e.final_payment_date)?"Completed":o.some(orderIsPaid)?"Active":o.length?"Ordering":"In consultation"}
const orderIsPaid=e=>!!e.first_payment_date||i.indexOf(e.status)>=i.indexOf("In production"),designAnchor=e=>e&&e.first_payment_date||null,productionAnchor=e=>(e?"other"===e.payment_scheme?e.first_payment_date:e.second_payment_date:null)||null,openCustomerOrders=()=>w.customerOrders||[],dateOnly=e=>String(e||"").slice(0,10)
;function followUpPatch(e,t){return e&&t?{follow_up_date:(o=t,a=e.days,n.fromDay(n.toDay(o)+a)),follow_up_label:e.label,follow_up_synced_at:null}:{
follow_up_date:null,follow_up_label:null,follow_up_synced_at:null};var o,a}function consultNudgeFor(e,t,o){
if(!e||e.cancelled_at||(t||[]).length)return followUpPatch(null,null);const n=void 0===o?e.moodboard_date:o
;return n?followUpPatch(l,dateOnly(n)):followUpPatch(c,dateOnly(e.created_at))}async function setFollowUp(e){const o=w.customer
;o&&o.id&&(e.follow_up_date===o.follow_up_date&&e.follow_up_label===o.follow_up_label||(w.customer=await t.updateCustomer(o.id,e),
await pushFollowUp()))}async function pushFollowUp(){const e=w.customer;if(e&&e.id&&(e.follow_up_date||e.follow_up_google_event_id))try{
await t.syncFollowUp(e.id),
// Re-read for the event id and synced_at the function just wrote.
w.customer=await t.getCustomer(e.id)}catch(e){console.error("Follow-up not synced to Google Calendar:",e)}}
const canCancel=(e,t)=>!(!e||!e.id||e.cancelled_at||(t||[]).some(e=>e.first_payment_date));async function cancelCustomer(){const e=w.customer
;if(canCancel(e,openCustomerOrders())&&window.confirm("Mark "+e.name+" as not proceeding?\n\nEverything is kept — they just stop appearing as live work."))try{
w.customer=await t.updateCustomer(e.id,{cancelled_at:(new Date).toISOString(),follow_up_date:null,follow_up_label:null,follow_up_synced_at:null}),
await pushFollowUp(),renderCustomerReadOnly(w.customer),showToast("Marked as not proceeding")}catch(e){console.error(e),
showToast(e.message||"Could not update the customer")}}async function reopenCustomer(){const e=w.customer;if(e&&e.id&&e.cancelled_at)try{
w.customer=await t.updateCustomer(e.id,Object.assign({cancelled_at:null,cancelled_reason:null},consultNudgeFor(Object.assign({},e,{cancelled_at:null
}),openCustomerOrders()))),await pushFollowUp(),renderCustomerReadOnly(w.customer),showToast("Reopened")}catch(e){console.error(e),
showToast(e.message||"Could not reopen the customer")}}function go(e){location.hash===e?handleRoute():location.hash=e}function leaveFormFor(e){
k!==e?location.hash!==e?(history.replaceState(null,"",location.pathname+location.search+e),E=e,handleRoute()):handleRoute():history.back()}
function confirmLeave(){return!w.dirty||window.confirm("You have unsaved changes. Leave without saving?")}let E="",k="";async function handleRoute(){
const s=function(){
const e=String(location.hash||"").replace(/^#\/?/,""),t=e.indexOf("?"),o=(-1===t?e:e.slice(0,t)).split("/").filter(Boolean),n=new URLSearchParams(-1===t?"":e.slice(t+1))
;return"customer"===o[0]&&o[1]?{view:"customer",id:o[1],query:n}:"order"===o[0]&&o[1]&&"edit"===o[2]?{view:"orderEdit",id:o[1],query:n
}:"order"===o[0]&&o[1]&&"moodboard"===o[2]&&"preview"===o[3]?{view:"moodboardPreview",id:o[1],query:n}:"order"===o[0]&&o[1]&&"moodboard"===o[2]?{
view:"moodboard",id:o[1],query:n}:"order"===o[0]&&o[1]&&"fitting"===o[2]&&"new"===o[3]?{view:"fittingNew",id:o[1],query:n
}:"order"===o[0]&&o[1]&&"fitting"===o[2]&&o[3]?{view:"fittingJournal",id:o[1],sessionId:o[3],query:n
}:"order"===o[0]&&o[1]&&"fittings"===o[2]||"order"===o[0]&&o[1]?{view:"order",id:o[1],query:n}:"calendar"===o[0]?{view:"calendar",query:n
}:"enquiry"===o[0]&&o[1]?{view:"enquiry",id:o[1],query:n}:{view:"customers",query:n}}(),i=w.route;
// Guard the transition, and put the URL back if it is refused.
if(w.dirty&&E!==location.hash){
if(!confirmLeave())return void(location.hash=E);setDirty(!1)}location.hash!==E&&(k=E),E=location.hash
;const d=i&&("moodboard"===i.view||"moodboardPreview"===i.view),c="moodboard"===s.view||"moodboardPreview"===s.view
;d&&!c&&(closeMoodboardPresentation(),R.cleanup(),j=null),w.route=s,p.viewCustomers.hidden="customers"!==s.view,
p.viewCustomer.hidden="customer"!==s.view,p.viewOrder.hidden="order"!==s.view,p.viewOrderEdit.hidden="orderEdit"!==s.view,p.viewMoodboard.hidden=!c,
p.viewFittingJournal.hidden="fittingNew"!==s.view&&"fittingJournal"!==s.view,
p.fittingJournalBar.hidden="fittingJournal"!==s.view&&"fittingNew"!==s.view,
document.body.classList.toggle("has-fitting-journal-bar",!p.fittingJournalBar.hidden),p.viewCalendar.hidden="calendar"!==s.view,
p.viewEnquiry.hidden="enquiry"!==s.view,
!i||"fittingNew"!==i.view&&"fittingJournal"!==i.view||s.view===i.view&&s.id===i.id&&s.sessionId===i.sessionId||KK.fittings.closeAll(),syncBottomBar(),
window.scrollTo(0,0);const render=async()=>{"customers"===s.view?await showCustomers():"customer"===s.view?await async function(a,s){const r="new"===a
;setChrome({title:r?"New customer":"Customer",up:{label:"Customers",hash:"#/customers"},save:!1,actions:!1,destroy:r?null:"customer"}),
w.customerOrders=[];
// Arrived from a search that found nothing: the name is already known.
const i=r?String(s&&s.get("name")||"").trim():"";if(r)return w.customer=Object.assign({},M),i&&(w.customer.name=i),fillCustomerForm(w.customer),
// A new customer has nothing to read, so it opens straight into the form.
setCustomerMode(!0),setDirty(!0),p.viewSub.hidden=!0,void(i?p.cPhone:p.cName).focus();p.orderList.innerHTML='<p class="empty">Loading…</p>'
;const[d,c]=await Promise.all([t.getCustomer(a),t.listOrders(a)]);w.customer=d,w.customerOrders=c,fillCustomerForm(d),setCustomerMode(!1),
setDirty(!1),renderCustomerReadOnly(d),function(t){
if(p.ordersTotal.textContent=t.length?e.formatRupiah(t.reduce((e,t)=>e+o.computeTotal(t.items),0)):"",
!t.length)return void(p.orderList.innerHTML='<p class="empty">No orders yet.</p>');const a=w.customer&&w.customer.wedding_date
;p.orderList.innerHTML=t.map(t=>{
const s=n.computeProduction(productionAnchor(t),a).events.map(e=>e.event_date).filter(t=>t>=e.todayISO())[0],r=effectiveStatus(t)
;return'<a class="row row--kanban" href="#/order/'+t.id+'"><span class="row__main"><span class="row__title">'+e.escapeHtml(orderLabel(t))+'</span><span class="row__meta">'+e.escapeHtml(function(e){
const t=(e||[]).filter(e=>""!==String(e.name||"").trim()).map(e=>e.name);return t.length?t.join(", "):"No items yet"
}(t.items))+'</span><span class="row__tags"><span class="'+badgeClass(r)+'">'+e.escapeHtml(r)+"</span>"+(s?'<span class="row__meta">Fitting '+e.escapeHtml(e.formatShortDate(s))+"</span>":"")+'</span></span><span class="row__amount">'+e.formatRupiah(o.computeTotal(t.items))+"</span></a>"
}).join("")}(c)}(s.id,s.query):"orderEdit"===s.view?await async function(o){w.order=await t.getOrder(o),
w.customer=await t.getCustomer(w.order.customer_id),setChrome({title:"Edit order",up:{label:orderLabel(w.order),hash:"#/order/"+o},save:!0,actions:!1,
destroy:"order"}),p.oTitle.value=w.order.title||"",p.oDocName.value=w.order.doc_name||"",p.oFirstPayment.value=w.order.first_payment_date||"",
p.oSecondPayment.value=w.order.second_payment_date||"",p.oFinalPayment.value=w.order.final_payment_date||"",
p.oScheme.value="other"===w.order.payment_scheme?"other":"standard",buildTerms(w.order),syncSchemeCard(),renderScheduleHint(),p.itemList.innerHTML=""
;((w.order.items||[]).length?w.order.items:[{name:"",qty:1,price:"",cost:""}]).forEach(e=>addItemRow(e,!1)),function(t){
const o=t||[],isTicked=e=>o.some(t=>t.toLowerCase()===e.toLowerCase()),n=o.filter(e=>!r.some(t=>t.toLowerCase()===e.toLowerCase()))
;p.includesList.innerHTML=r.map(t=>function(t,o){
return'<label class="chip'+(o?" is-checked":"")+'" data-label="'+e.escapeHtml(t)+'"><input type="checkbox"'+(o?" checked":"")+'><span class="chip__box">'+h+"</span><span>"+e.escapeHtml(t)+"</span></label>"
}(t,isTicked(t))).join("")+n.map(e=>customChip(e,!0)).join("")}(w.order.includes||[]),p.customInclude.value="",refreshItemTotals(),setDirty(!1)
}(s.id):"moodboard"===s.view?await async function(e){w.order=await t.getOrder(e),
[w.customer,w.customerOrders]=await Promise.all([t.getCustomer(w.order.customer_id),t.listOrders(w.order.customer_id)]),setChrome({title:"Moodboard",
up:{label:orderLabel(w.order),hash:"#/order/"+e},save:!1,actions:!1}),p.actionbar.hidden=!0,setSaveBar(!1),closeMoodboardPresentation(),
j===e&&R.images.length||(R.init({orderId:w.order.id,customerId:w.customer.id,customerName:w.customer.name,docName:w.order.doc_name||w.customer.name,
orderRef:w.order.title||""}),j=e);a("#mbEditor").hidden=!1,a("#mbGenerate").hidden=!1}(s.id):"moodboardPreview"===s.view?await async function(e){
if(!R.images.length||j!==e)return void go("#/order/"+e+"/moodboard");setChrome({title:"Moodboard preview",up:{label:"Images",
hash:"#/order/"+e+"/moodboard"},save:!1,actions:!1}),p.actionbar.hidden=!0,setSaveBar(!1),a("#mbEditor").hidden=!0,a("#mbGenerate").hidden=!0,
q=document.activeElement,p.mbPresentation.hidden=!1,document.body.classList.add("moodboard-presenting"),document.body.classList.add("has-app-modal"),
resetMoodboardView(),requestAnimationFrame(()=>{renderMoodboardPresentation(!0),p.mbPresentationClose.focus()})
}(s.id):"fittingNew"===s.view?await async function(e){w.order=await t.getOrder(e),w.customer=await t.getCustomer(w.order.customer_id),setChrome({
title:"New fitting",up:{label:orderLabel(w.order),hash:"#/order/"+e},save:!1,actions:!1}),p.fittingJournalBar.hidden=!0,
document.body.classList.remove("has-fitting-journal-bar"),syncBottomBar()
;const o=await Promise.all([t.listOrderEvents(e),t.listFittingSessions(e)]),a=o[1].find(e=>"active"===e.status)
;if(a)return void go("#/order/"+e+"/fitting/"+a.id);const s=o[0].filter(e=>n.isProductionStage(e.stage)),r=s.length?s:n.PRODUCTION_STAGES.map(e=>({
stage:e})),begin=async o=>{try{const n=await t.createFittingSession({order_id:e,stage:o,status:"active"});setChrome({title:o,up:{
label:orderLabel(w.order),hash:"#/order/"+e},action:{label:"Done",onClick:()=>KK.fittings.endSession(n,()=>go("#/order/"+e))},save:!1,actions:!1}),
p.fittingJournalBar.hidden=!1,document.body.classList.add("has-fitting-journal-bar"),syncBottomBar(),KK.fittings.renderJournal(p.fittingJournal,{
order:w.order,customer:w.customer,session:n,photos:[],onToast:showToast}),KK.fittings.startSession(n,{order:w.order,customer:w.customer,photos:[]
},showToast)}catch(e){showToast(e.message||"Could not start fitting session")}},i=KK.fittings.detectStage(s)
;i?await begin(i):KK.fittings.showStagePicker(r,begin,()=>go("#/order/"+e))}(s.id):"fittingJournal"===s.view?await async function(e,o){
w.order=await t.getOrder(e),w.customer=await t.getCustomer(w.order.customer_id)
;const n=await Promise.all([t.getFittingSession(o),t.listFittingPhotos(e)]),a=n[0],s=n[1].filter(e=>e.session_id===a.id);setChrome({title:a.stage,up:{
label:orderLabel(w.order),hash:"#/order/"+e},action:"active"===a.status?{label:"Done",onClick:()=>KK.fittings.endSession(a,()=>go("#/order/"+e))
}:null,save:!1,actions:!1
}),p.fittingJournalBar.hidden="active"!==a.status,document.body.classList.toggle("has-fitting-journal-bar",!p.fittingJournalBar.hidden),
syncBottomBar(),KK.fittings.renderJournal(p.fittingJournal,{order:w.order,customer:w.customer,session:a,photos:s,onToast:showToast})
}(s.id,s.sessionId):"calendar"===s.view?await showCalendarSettings():"enquiry"===s.view?await async function(o){setChrome({title:"Enquiry",up:{
label:"Customers",hash:"#/customers"},save:!1,actions:!1}),w.enquiry=await t.getIntake(o);const n=w.enquiry
;p.enquiryWhen.textContent=e.formatShortDate(n.created_at),p.enquiryAnswers.innerHTML=function(e){
const t=e.payload&&e.payload.data&&e.payload.data.fields||[],o=t.map(e=>({label:String(e.label||"Answer"),value:readableAnswer(e)
})).filter(e=>e.value);return o.length?o:[{label:"Name",value:e.name||""},{label:"Phone",value:e.phone||""},{label:"Instagram",value:e.instagram||""
},{label:"Source",value:e.source||""},{label:"Notes",value:e.notes||""}].filter(e=>e.value)
}(n).map(t=>'<div class="infolist__stack"><dt>'+e.escapeHtml(t.label)+"</dt><dd>"+e.escapeHtml(t.value)+"</dd></div>").join("")||'<div class="infolist__stack"><dt>Answers</dt><dd>Nothing readable in this submission.</dd></div>'
;const a="new"!==n.status
;p.enquiryNote.textContent=a?"accepted"===n.status?"Already accepted.":"Dismissed.":"Creating the customer files them at Enquiry, with a reminder to book the consultation in two days. Dismissing keeps the submission but creates nothing.",
p.enquiryAccept.hidden=a,p.enquiryDismiss.hidden=a}(s.id):await async function(n){w.order=await t.getOrder(n),
w.customer=await t.getCustomer(w.order.customer_id),setChrome({title:orderLabel(w.order),up:{label:w.customer.name,hash:"#/customer/"+w.customer.id},
save:!1,actions:!0,destroy:"order",action:{label:"Edit",onClick:()=>go("#/order/"+w.order.id+"/edit")}}),renderOrderStatus(),
p.oDocNameDisplay.textContent=w.order.doc_name||"Not set",p.oFirstPaymentDisplay.textContent=showDate(w.order.first_payment_date),
p.oSecondPaymentDisplay.textContent=showDate(w.order.second_payment_date),p.oFinalPaymentDisplay.textContent=showDate(w.order.final_payment_date),
p.oWeddingDisplay.textContent=weddingText(w.customer);const a=w.order.items||[],s=o.computeTotal(a),r=a.filter(isNamed);!function(t){
const n=t.filter(isNamed),a=o.computeTotal(t)
;if(!n.length)return void(p.oItemsDisplay.innerHTML='<p class="empty">No items yet. Tap Edit to add one.</p>')
;const s=n.filter(e=>!isCosted(e)).length,r=s?s===n.length?"No production costs filled in yet.":"Excludes "+s+" of "+n.length+" items with no production cost.":""
;p.oItemsDisplay.innerHTML='<div class="table__row table__row--head"><span class="table__item">Item</span><span class="table__qty">Qty</span><span class="table__price">Price</span></div>'+n.map(t=>'<div class="table__row"><span class="table__item">'+e.escapeHtml(t.name)+'</span><span class="table__qty">'+(Number(t.qty)||0)+'</span><span class="table__price">'+e.formatRupiah(t.price)+"</span></div>").join("")+'<div class="table__row table__row--total"><span class="table__item">Total</span><span class="table__price">'+e.formatRupiah(a)+'</span></div><div class="table__row table__row--profit"><span class="table__item">Nett profit <span class="tag">Internal</span></span><span class="table__price">'+(s===n.length?"—":e.formatRupiah(function(e){
return(e||[]).filter(isCosted).reduce((e,t)=>e+((Number(t.price)||0)-(Number(t.cost)||0))*(Number(t.qty)||0),0)
}(t)))+"</span></div>"+(r?'<p class="table__note">'+e.escapeHtml(r)+"</p>":"")}(a);const i=w.order.includes||[]
;p.oIncludesDisplay.textContent=i.length?"Includes: "+i.join(" · "):"",p.totalDisplay.textContent=e.formatRupiah(s),p.paymentChooserOptions.hidden=!0
;const d=r.length>0&&s>0,c=""!==String(w.order.doc_name||w.customer.name||"").trim(),l=d&&c;p.downloadQuote.disabled=!l,p.downloadInvoice.disabled=!l,
p.downloadNote.hidden=l,p.downloadNote.textContent=d?"Add the name for documents to enable downloads.":"Add an item to enable downloads.",
setDirty(!1),await refreshSchedule(),await refreshHistory(),await async function(){
const e=await Promise.all([t.listFittingSessions(w.order.id),t.listFittingPhotos(w.order.id)]),o=e[0].length||e[1].length
;p.fittingHistoryCard.hidden=!o,o&&KK.fittings.renderHistoryList(p.fittingHistoryList,e[0],e[1],w.order.id)}(),syncBottomBar()}(s.id)};try{
await render()}catch(e){if(!t.isStaleToken(e))return console.error(e),void showToast(e.message||"Could not load that")
;console.warn("Stale token, refreshing and retrying:",e.message);try{await t.refreshSession(),await render()}catch(e){console.error(e),
showToast(t.isStaleToken(e)?"Your session expired — please unlock again":e.message||"Could not load that")}}}
const orNull=e=>""===String(e||"").trim()?null:String(e).trim();function orderLabel(e){if(e.title)return e.title;const t=e.items||[]
;return t.length&&t[0].name?t[0].name+(t.length>1?" + "+(t.length-1)+" more":""):"Empty order"}
const isCosted=e=>(Number(e.cost)||0)>0,isNamed=e=>""!==String(e.name||"").trim();function greetingForClock(e){
return("dawn"===e.period||"morning"===e.period?"Good morning":"noon"===e.period||"afternoon"===e.period?"Good afternoon":"Good evening")+", Ichaku"}
function homepageOverview(e,t){const o={},n={},a={};e.forEach(e=>{(o[e.customer_id]=o[e.customer_id]||[]).push(e),n[e.id]=e.customer_id}),t.forEach(e=>{const t=n[e.order_id];t&&(a[t]=a[t]||[]).push(e)});return{ordersByCustomer:o,eventsByCustomer:a}}

// The homepage swaps between three fixed-geometry layers. Everything below is
// written so the only thing that ever moves is opacity: the ready layer is
// built and measured while it is still covered by the skeleton.
const reducedMotion=()=>!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let homePopTimers=[];
function clearHomepagePops(){homePopTimers.forEach(clearTimeout),homePopTimers=[]}
function clearHomepagePresses(){p.homeReady.querySelectorAll(".is-pressed").forEach(e=>e.classList.remove("is-pressed"))}
function isCurrentHomepageLoad(e){return e===w.homepage.loadToken&&"customers"===w.route.view}

function beginHomepageLoad(){const e=++w.homepage.loadToken;return w.homepage.phase="loading",
clearHomepagePops(),clearHomepagePresses(),p.homeStage.setAttribute("aria-busy","true"),p.homeStage.style.height="",
p.homeLoading.hidden=!1,p.homeLoading.classList.remove("is-transitioning","is-hidden"),
p.homeError.hidden=!0,
p.homeReady.hidden=!0,p.homeReady.classList.remove("is-transitioning","is-visible"),p.homeReady.style.visibility="",e}

function renderHomepageError(t,o){if(!isCurrentHomepageLoad(o))return;w.homepage.phase="error",
p.homeLoading.hidden=!0,p.homeLoading.classList.remove("is-transitioning","is-hidden"),p.homeError.hidden=!1,
p.homeStage.setAttribute("aria-busy","false"),
p.homeError.innerHTML='<div class="home-error-panel"><p class="home-error-panel__title">Could not load the homepage.</p><p class="home-error-panel__hint">'+e.escapeHtml(t instanceof TypeError?"Check your connection and try again.":t&&t.message||"Try again in a moment.")+'</p><button type="button" class="home-error__retry">Try again</button></div>';
const n=p.homeError.querySelector(".home-error__retry");n.addEventListener("click",()=>{showCustomers(!0)}),
requestAnimationFrame(()=>n.focus({preventScroll:!0}))}

function renderHomepageHero(){const t=(new Date).getHours(),o=w.customers.filter(isActive).map(e=>({customer:e,deadline:nextDeadline(e)})).filter(e=>e.deadline).sort((e,t)=>e.deadline.date.localeCompare(t.deadline.date))[0]
;if(p.heroGreeting.textContent=greetingForClock({period:t<12?"morning":t<18?"afternoon":"evening"}),!o)return void(p.heroDeadline.textContent="No upcoming deadline. All clear!")
;const n=Math.ceil((new Date(o.deadline.date)-new Date(e.todayISO()))/864e5),a=n<=0?"today":1===n?"tomorrow":"in "+n+" days"
;p.heroDeadline.innerHTML="Nearest deadline is <strong>"+e.escapeHtml(firstName(o.customer.name)+" - "+o.deadline.what)+"</strong> "+a+". Prep up!"}

// The bar only exists when the query came back with rows, so an empty result
// removes its 63px from the layout entirely rather than reserving a gap.
function renderHomepageAlert(e){p.enquiriesCard.hidden=!e.length,e.length&&(p.enquiriesCount.textContent=e.length+" new order submission"+(1===e.length?"":"s"))}

function renderHomepageSummary(){const e=w.customers.length,t=w.customers.filter(e=>"In production"===homepageStatus(e,w.overview.ordersByCustomer[e.id]||[]).label).length
;p.homeSummary.innerHTML='<span>'+e+" total customer"+(1===e?"":"s")+'</span><i></i><span>'+t+" in production</span>"}

function renderHomepageReady(e){renderHomepageHero(),renderHomepageAlert(e.submissions),renderHomepageSummary(),renderCustomerList(),
p.homeReady.hidden=!1,p.homeReady.classList.add("is-measuring")}

// Pressed-to-normal, left to right, once per navigation into the homepage.
function prepareShortcutAppearState(){if(w.homepage.popPlayedForVisit>=w.homepage.visit||reducedMotion())return;
p.homeActions.querySelectorAll(".home-action").forEach(e=>e.classList.add("is-appear-pressed"))}
function playShortcutAppear(){if(w.homepage.popPlayedForVisit>=w.homepage.visit)return;w.homepage.popPlayedForVisit=w.homepage.visit;
p.homeActions.querySelectorAll(".home-action").forEach((e,t)=>{homePopTimers.push(setTimeout(()=>e.classList.remove("is-appear-pressed"),80*t))})}

async function revealHomepage(e){await(document.fonts&&document.fonts.ready||Promise.resolve()),
await new Promise(e=>requestAnimationFrame(e));if(!isCurrentHomepageLoad(e))return
// Pin the stage to the measured ready height first, so the crossfade happens
// inside a box that already matches what is about to be shown.
;p.homeStage.style.height=Math.ceil(p.homeReady.getBoundingClientRect().height||p.homeReady.scrollHeight)+"px",
p.homeReady.classList.remove("is-measuring"),p.homeReady.classList.add("is-transitioning"),p.homeLoading.classList.add("is-transitioning"),
requestAnimationFrame(()=>{isCurrentHomepageLoad(e)&&(p.homeReady.classList.add("is-visible"),p.homeLoading.classList.add("is-hidden"),playShortcutAppear())}),
setTimeout(()=>{isCurrentHomepageLoad(e)&&(p.homeLoading.hidden=!0,p.homeLoading.classList.remove("is-transitioning","is-hidden"),
p.homeReady.classList.remove("is-transitioning","is-visible"),p.homeStage.style.height="",
p.homeStage.setAttribute("aria-busy","false"),w.homepage.phase="ready")},reducedMotion()?0:180)}

// All four reads are one required batch: a missing events or intake result
// would silently change the deadline, the ordering, or whether the
// submissions bar belongs on the page, so a partial result is not shown.
async function showCustomers(o){setChrome({title:"Customers",up:null,save:!1,actions:!1,homepage:!0}),w.customer=null,w.order=null,
o||w.homepage.visit++;const n=beginHomepageLoad();try{const[o,a,s,r]=await Promise.all([t.listCustomers(),t.listAllOrders(),t.listAllOrderEvents(),t.listIntake("new")])
;if(!isCurrentHomepageLoad(n))return;w.customers=o,w.overview=homepageOverview(a,s),
renderHomepageReady({customers:o,submissions:r}),prepareShortcutAppearState(),await revealHomepage(n)}catch(e){
if(t.isStaleToken(e))throw e;console.error(e),renderHomepageError(e,n)}}

// Pointer and keyboard press feedback. The shortcuts and the alert are
// deliberately inert, so they get the visual state and nothing else.
p.homeReady.addEventListener("pointerdown",e=>{const t=e.target.closest(".home-action,.home-alert,.home-customer-card");t&&t.classList.add("is-pressed")}),
["pointerup","pointercancel","pointerleave","blur"].forEach(e=>p.homeReady.addEventListener(e,clearHomepagePresses,!0)),
// Touch scrolling must not leave a card stuck in its pressed state.
window.addEventListener("scroll",()=>{"ready"===w.homepage.phase&&clearHomepagePresses()},{passive:!0}),
p.homeReady.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return;const t=e.target.closest(".home-action,.home-alert,.home-customer-card")
;t&&(t.classList.add("is-pressed"),t.matches(".home-action,.home-alert")&&e.preventDefault())}),
p.homeReady.addEventListener("keyup",clearHomepagePresses),
p.homeReady.addEventListener("click",e=>{e.target.closest(".home-action,.home-alert")&&e.preventDefault()});function readableAnswer(e){const t=e&&e.value
;if(null==t||""===t)return"";if(!Array.isArray(t))return"object"==typeof t?JSON.stringify(t):String(t);const o=e.options||[];return t.map(e=>{
const t=o.filter(t=>t.id===e)[0];return t?t.text:String(e)}).filter(Boolean).join(", ")}async function acceptEnquiry(){const o=w.enquiry
;if(o&&"new"===o.status)try{const n=await t.createCustomer(Object.assign({name:o.name||"Unnamed enquiry",phone:o.phone,instagram:o.instagram,
source:d.includes(o.source)?o.source:"Other",wedding_date:o.wedding_date,wedding_date_precision:"month"===o.wedding_date_precision?"month":"day",
notes:o.notes},followUpPatch(c,e.todayISO())));await t.resolveIntake(o.id,"accepted",n.id),w.customer=n,w.customerOrders=[],await pushFollowUp(),
showToast("Customer created"),leaveFormFor("#/customer/"+n.id)}catch(e){console.error(e),showToast(e.message||"Could not create the customer")}}
async function dismissEnquiry(){const e=w.enquiry
;if(e&&"new"===e.status&&window.confirm("Dismiss this enquiry? It stays on record but creates nothing."))try{
await t.resolveIntake(e.id,"dismissed",null),showToast("Enquiry dismissed"),leaveFormFor("#/customers")}catch(e){console.error(e),
showToast(e.message||"Could not dismiss the enquiry")}}function renderCustomerList(){
const t=p.customerSearch.value.trim().toLowerCase(),n=w.customers.filter(e=>!t||[e.name,e.phone,e.instagram].some(e=>String(e||"").toLowerCase().includes(t))).sort(compareHomepageCustomers)
;if(!n.length){const t=p.customerSearch.value.trim()
;return void(p.customerList.innerHTML=w.customers.length?'<p class="empty">No match for “'+e.escapeHtml(t)+'”.</p><a class="btn btn--outline btn--new btn--block btn--empty" href="#/customer/new?name='+encodeURIComponent(t)+'">+ Add “'+e.escapeHtml(t)+"” as a new customer</a>":'<p class="empty">No customers yet.</p>')
}p.customerList.innerHTML=n.map((t,n)=>{
const a=w.overview.ordersByCustomer[t.id]||[],s=a.reduce((e,t)=>e+o.computeTotal(t.items),0),r=homepageStatus(t,a),i=a.length+" order"+(1===a.length?"":"s")
;return'<div class="home-customer-record"><div class="home-grid-rule"></div><div class="home-customer-record__inset"><a class="home-customer-card home-customer-card--'+r.tone+'" href="#/customer/'+encodeURIComponent(t.id)+'" aria-label="'+e.escapeHtml((t.name||"Unnamed customer")+", "+r.label)+'"><span class="home-customer-card__face"><span class="home-customer-card__top"><span class="home-customer-card__name">'+e.escapeHtml(t.name||"Unnamed customer")+'</span><span class="home-customer-card__badge">'+e.escapeHtml(r.label)+'</span></span>'+("Cancelled"===r.label?"":'<span class="home-customer-card__meta"><span>'+e.escapeHtml(i)+"</span><span>"+e.formatRupiah(s)+"</span></span>")+'</span><span class="home-customer-card__rail"></span></a></div><div class="home-grid-rule"></div><div class="home-grid-spacer" aria-hidden="true"></div></div>'
}).join("")}function homepageStatus(e,t){const o=t||[];return e.cancelled_at?{label:"Cancelled",tone:"quiet",rank:5
}:o.some(e=>"In production"===e.status)?{label:"In production",tone:"production",rank:0}:o.some(e=>"Confirmed"===e.status)?{label:"Invoice sent",
tone:"invoice",rank:1}:o.some(e=>"Quoted"===e.status)?{label:"Quote sent",tone:"invoice",rank:2}:o.length?(o.some(e=>"Delivered"===e.status),{
label:"Finished",tone:"quiet",rank:4}):{label:"In consultation",tone:"consultation",rank:3}}function compareHomepageCustomers(e,t){
const o=homepageStatus(e,w.overview.ordersByCustomer[e.id]||[]),n=homepageStatus(t,w.overview.ordersByCustomer[t.id]||[])
;if(o.rank!==n.rank)return o.rank-n.rank;const a=nextDeadline(e),s=nextDeadline(t),r=a?a.date:"9999-12-31",i=s?s.date:"9999-12-31"
;if(r!==i)return r.localeCompare(i);const d=e.wedding_date||"9999-12-31",c=t.wedding_date||"9999-12-31"
;return d!==c?d.localeCompare(c):String(e.name||"").localeCompare(String(t.name||""),void 0,{sensitivity:"base"})}
const isActive=e=>!["Cancelled","Completed"].includes(customerStatus(e,w.overview.ordersByCustomer[e.id]));function nextDeadline(t){
const o=e.todayISO(),n=[];return t.wedding_date&&n.push({date:t.wedding_date,what:"Wedding"}),t.follow_up_date&&n.push({date:t.follow_up_date,
what:t.follow_up_label||"Follow up"}),(w.overview.eventsByCustomer[t.id]||[]).filter(e=>!e.end_date).forEach(e=>n.push({date:e.event_date,what:e.stage
})),n.filter(e=>e.date>=o).sort((e,t)=>e.date<t.date?-1:1)[0]||null}
const relativeDays=e=>0===e?"today":1===e?"tomorrow":"in "+e+" days",firstName=e=>(e||"").trim().split(/\s+/)[0]||"";const M={id:null,name:"",
phone:"",instagram:"",source:"",wedding_date:"",notes:""};function setCustomerMode(e){const t=!w.customer||!w.customer.id;p.customerViewCard.hidden=e,
p.customerEditCard.hidden=!e,p.customerOrdersCard.hidden=e||t,(e||t)&&(p.cancelCustomer.hidden=!0,p.reopenCustomer.hidden=!0,p.viewSub.hidden=!0),
setSaveBar(e),p.viewTitle.textContent=t?"New customer":e?"Edit customer":w.customer.name,setPageAction(t?null:e?{label:"Cancel",
onClick:cancelCustomerEdit}:{label:"Edit",onClick:()=>setCustomerMode(!0)})}function cancelCustomerEdit(){
confirmLeave()&&(fillCustomerForm(w.customer),setDirty(!1),setCustomerMode(!1))}
const daysUntil=t=>Math.round((new Date(t)-new Date(e.todayISO()))/864e5),isApproximateWedding=e=>!(!e||!e.wedding_date||"month"!==e.wedding_date_precision)
;function weddingText(t){
return t&&t.wedding_date?isApproximateWedding(t)?e.formatLongDate(t.wedding_date).replace(/^\d+\s/,"")+" (approximate)":e.formatShortDate(t.wedding_date):"Not set"
}function renderCustomerReadOnly(t){const o=String(t.phone||"").replace(/\D/g,"").replace(/^0/,"62")
;p.dPhone.innerHTML=t.phone&&o.length>=8?'<a class="contact-link" href="https://wa.me/'+encodeURIComponent(o)+'" target="_blank" rel="noopener" aria-label="Message on WhatsApp">'+e.escapeHtml(t.phone)+"</a>":e.escapeHtml(t.phone||"—")
;const n=String(t.instagram||"").trim().replace(/^@/,"")
;p.dInstagram.innerHTML=n?'<a class="contact-link" href="https://www.instagram.com/'+encodeURIComponent(n)+'/" target="_blank" rel="noopener">@'+e.escapeHtml(n)+"</a>":"—",
p.dSource.textContent=t.source||"—",p.dNotes.textContent=t.notes||"—",p.dCreated.textContent=t.created_at?e.formatShortDate(t.created_at):"—",
p.dWedding.textContent=t.wedding_date?weddingText(t)+" · "+relativeToToday(t.wedding_date):"Not set",
p.dMoodboard.textContent=showDate(t.moodboard_date),p.dMoodboardRow.hidden=!t.moodboard_date,
p.dCancelled.textContent=t.cancelled_reason||(t.cancelled_at?"No reason recorded":""),p.dCancelledRow.hidden=!t.cancelled_at,function(t){
const o=openCustomerOrders(),n=customerStatus(t,o);p.viewSub.innerHTML='<span class="'+badgeClass(n)+'">'+e.escapeHtml(n)+"</span>",
p.viewSub.hidden=!1,p.cancelCustomer.hidden=!canCancel(t,o),p.reopenCustomer.hidden=!t.cancelled_at,p.followUpLine.hidden=!!t.cancelled_at,
p.followUpLine.textContent=t.follow_up_date?(t.follow_up_label||"Follow up")+" · "+e.formatShortDate(t.follow_up_date)+" · "+relativeToToday(t.follow_up_date)+(t.follow_up_synced_at?"":" · not in Google Calendar"):o.length?"":"Nothing to follow up."
}(t)}function relativeToToday(e){const t=daysUntil(e);if(t>=0)return relativeDays(t);const o=Math.abs(t);return o+(1===o?" day":" days")+" ago"}
function fillCustomerForm(e){p.cName.value=e.name||"",p.cPhone.value=e.phone||"",p.cInstagram.value=e.instagram||"",p.cSource.value=e.source||"",
p.cNotes.value=e.notes||"",p.cWedding.value=e.wedding_date||"",p.cWeddingMonth.value=(e.wedding_date||"").slice(0,7),
setWeddingPrecision("month"===e.wedding_date_precision?"month":"day"),p.cMoodboardDate.value=e.moodboard_date||"",
p.cFollowUpDate.value=e.follow_up_date||"",p.cFollowUpLabel.value=e.follow_up_label||"",p.cCancelledReason.value=e.cancelled_reason||"",
p.cCancelledField.hidden=!e.cancelled_at,p.cName.classList.remove("is-invalid"),p.errCName.hidden=!0}function setWeddingPrecision(e){
const t="month"===e;p.cWedding.hidden=t,p.cWeddingMonth.hidden=!t,s(".segmented__btn",p.cWeddingPrecision).forEach(e=>{
const o="month"===e.dataset.precision===t;e.classList.toggle("is-on",o),e.setAttribute("aria-pressed",String(o))})}
const weddingPrecision=()=>p.cWeddingMonth.hidden?"day":"month";function lastDayOfMonth(e){const t=/^(\d{4})-(\d{2})$/.exec(String(e||""))
;if(!t)return null;const o=new Date(Date.UTC(Number(t[1]),Number(t[2]),0));return n.fromDay(Math.round(o.getTime()/864e5))}
async function saveCustomer(){if(""===p.cName.value.trim())return p.cName.classList.add("is-invalid"),p.errCName.hidden=!1,p.cName.focus(),!1
;const o=function(){const e="month"===weddingPrecision();return{name:p.cName.value.trim(),phone:orNull(p.cPhone.value),
instagram:orNull(p.cInstagram.value),source:orNull(p.cSource.value),wedding_date:e?lastDayOfMonth(p.cWeddingMonth.value):orNull(p.cWedding.value),
wedding_date_precision:e?"month":"day",moodboard_date:orNull(p.cMoodboardDate.value),follow_up_date:orNull(p.cFollowUpDate.value),
follow_up_label:orNull(p.cFollowUpLabel.value),cancelled_reason:orNull(p.cCancelledReason.value),notes:orNull(p.cNotes.value)}}();if(w.customer.id){
const e=w.customer;w.customer=await t.updateCustomer(w.customer.id,o),setDirty(!1),e.wedding_date!==w.customer.wedding_date&&await async function(){
try{const e=await t.listOrders(w.customer.id);for(const o of e){if(!productionAnchor(o))continue;const e=await rescheduleOrder(o,w.customer)
;e.changed&&await t.logOrderHistory(o.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped})}}catch(e){console.error(e),
showToast("Saved, but the fitting schedules could not be rebuilt")}
}(),e.moodboard_date!==w.customer.moodboard_date?await setFollowUp(consultNudgeFor(w.customer,openCustomerOrders())):e.follow_up_date===w.customer.follow_up_date&&e.follow_up_label===w.customer.follow_up_label||await pushFollowUp(),
renderCustomerReadOnly(w.customer),setCustomerMode(!1),showToast("Customer saved")
}else w.customer=await t.createCustomer(Object.assign(o,o.follow_up_date?{}:followUpPatch(c,e.todayISO()))),setDirty(!1),
showToast("Customer created"),leaveFormFor("#/customer/"+w.customer.id);return!0}function historyLabel(e){
if("created"===e.action)return"Order created";if("updated"===e.action)return"Order updated";if("payment_logged"===e.action){
return(e.detail&&e.detail.deposit_label||"Payment").split(" - ")[0]+" logged"}if("scheduled"===e.action){
const t=e.detail&&e.detail.count||0,o=e.detail&&e.detail.dropped||[]
;return"Schedule set — "+t+(1===t?" date":" dates")+(o.length?", "+o.length+" left out":"")}if("calendar_synced"===e.action){
const t=e.detail&&e.detail.count||0,o=e.detail&&e.detail.pinned||0
;return"Synced "+t+(1===t?" date":" dates")+" to Google Calendar"+(o?", "+o+" kept as moved":"")}
return"moodboard_generated"===e.action?"Moodboard generated":e.action}async function refreshHistory(){
const[n,a]=await Promise.all([t.listOrderHistory(w.order.id),t.listDocumentLog(w.order.id)]);!function(t){
const n=o.computeTotal(w.order.items),a=o.termsFor(w.order),s=o.termAmounts(n,a),r={};if(t.forEach(e=>{if("payment_logged"!==e.action)return
;const t=e.detail&&e.detail.deposit_index;null!=t&&(r[t]=e.created_at)}),w.loggedDeposits=r,
n<=0)return p.paymentSummary.innerHTML='<p class="empty">Price the items to work out the payment terms.</p>',p.logPaymentBtn.hidden=!0,
void(p.paymentChooserOptions.hidden=!0)
;p.paymentSummary.innerHTML=a.map((t,o)=>'<div class="logrow"><span class="logrow__kind">'+e.escapeHtml(t.label)+'</span><span class="logrow__when">'+(r[o]?"Paid "+e.escapeHtml(e.formatShortDate(r[o])):"Outstanding")+'</span><span class="logrow__total">'+e.formatRupiah(s[o])+"</span></div>").join("")
;const i=a.some((e,t)=>!r[t]);p.logPaymentBtn.hidden=!i,i||(p.paymentChooserOptions.hidden=!0)}(n);const s=n.map(e=>({when:e.created_at,
label:historyLabel(e),amount:"payment_logged"===e.action?e.detail&&e.detail.amount:null})).concat(a.map(e=>({when:e.created_at,
label:"moodboard"===e.kind?"Moodboard saved":("invoice"===e.kind?"Invoice":"Quotation")+" downloaded",amount:e.total,link:e.drive_link||null
}))).sort((e,t)=>new Date(t.when)-new Date(e.when))
;p.historyLog.innerHTML=s.length?s.map(t=>'<div class="logrow logrow--stacked"><span class="logrow__what">'+(t.link?'<a class="logrow__kind logrow__link" href="'+e.escapeHtml(t.link)+'" target="_blank" rel="noopener">'+e.escapeHtml(t.label)+"</a>":'<span class="logrow__kind">'+e.escapeHtml(t.label)+"</span>")+(null!=t.amount?'<span class="logrow__total">'+e.formatRupiah(t.amount)+"</span>":"")+'</span><span class="logrow__when">'+e.escapeHtml(e.formatShortDate(t.when))+"</span></div>").join(""):'<p class="empty">No history yet.</p>'
}const showDate=t=>t?e.formatShortDate(t):"—"
;const scheduleFor=(e,t,o)=>n.computeSchedule(designAnchor(e),productionAnchor(e),t&&t.wedding_date,n.pinsFrom(o));async function refreshSchedule(){
const e=w.order;let o=[];try{o=await t.listOrderEvents(e.id)}catch(e){
// A schedule that will not load is not a reason to lose the whole page.
console.error(e)}const a=scheduleFor(e,w.customer,o);w.schedule={computed:a,rows:o};const s=o.filter(e=>e.google_event_id),r=o.filter(e=>!e.synced_at)
;n.renderSchedule(p.scheduleList,{events:o,warning:a.warning,reason:a.reason||"No schedule yet — save the order to build one."},{
note:o.length&&!o.some(e=>n.isProductionStage(e.stage))?a.production.reason:""}),p.scheduleCount.textContent=o.length?o.length+" dates":""
;const i=isApproximateWedding(w.customer),d=i&&o.some(e=>n.isProductionStage(e.stage)),c=i?o.filter(e=>n.isDesignStage(e.stage)):o
;p.syncCalendarBtn.hidden=!c.length,
p.syncCalendarBtn.disabled=!1,p.syncCalendarBtn.textContent=s.length&&!r.length?"Re-sync to Google Calendar":"Sync to Google Calendar"
;const l=o.filter(e=>e.pinned).length,u=l?" "+l+(1===l?" date was":" dates were")+" moved in Google and will be kept as is.":""
;p.scheduleSyncNote.textContent=o.length?(d?"The fittings are estimates until the exact wedding date is confirmed — only the design block will sync.":s.length?r.length?r.length+" of "+o.length+" dates changed since the last sync.":"All "+o.length+" dates are in Google Calendar.":"Not in Google Calendar yet.")+u:""
}function renderScheduleHint(){const t={payment_scheme:p.oScheme.value,first_payment_date:p.oFirstPayment.value,
second_payment_date:p.oSecondPayment.value
},o=n.computeSchedule(designAnchor(t),productionAnchor(t),w.customer&&w.customer.wedding_date,n.pinsFrom(w.schedule&&w.schedule.rows)),a=[]
;a.push(o.design.events.length?"Design phase "+e.formatShortDate(o.design.events[0].event_date)+" – "+e.formatShortDate(o.design.events[0].end_date):o.design.reason),
a.push(o.production.events.length?o.production.events.length+" appointments from "+e.formatShortDate(o.production.events[0].event_date)+" to the wedding":o.production.reason)
;const s=(o.production.events.length&&o.production.warnings||[]).map(e=>e.replace(/\.$/,""))
;p.oScheduleHint.innerHTML='<ul class="hintbox__list">'+a.map(t=>"<li>"+e.escapeHtml(t.replace(/\.$/,""))+"</li>").join("")+s.map(t=>'<li class="hintbox__warn">'+e.escapeHtml(t)+"</li>").join("")+"</ul>"
}async function rescheduleOrder(e,o){const a=await t.listOrderEvents(e.id),s=scheduleFor(e,o,a),r=[{stages:n.DESIGN_STAGES,result:s.design},{
stages:n.PRODUCTION_STAGES,result:s.production}];let i=a;const d=[];for(const o of r){const n=a.filter(e=>-1!==o.stages.indexOf(e.stage))
;if(o.result.missingAnchor&&n.length)continue;const s=await t.replaceOrderEvents(e.id,o.result.events,o.stages);d.push.apply(d,s.removed),i=s.events}
const c=d.map(e=>e.google_event_id).filter(Boolean);if(c.length)try{await t.googleForget(c)}catch(e){
console.error("Dropped events left in Google Calendar:",e)}const key=e=>e.stage+"@"+e.event_date+(e.end_date?"→"+e.end_date:"");return{computed:s,
changed:a.map(key).sort().join("|")!==i.map(key).sort().join("|"),rows:i}}async function syncCalendar(){const e=p.syncCalendarBtn;e.disabled=!0
;const o=e.textContent;e.textContent="Syncing…";try{const e=await t.syncOrderCalendar(w.order.id),o=e&&e.count||0,n=e&&e.pinned||0
;showToast(n?n+(1===n?" date had":" dates had")+" been moved in Google — kept":o+(1===o?" date":" dates")+" in Google Calendar");try{
await t.logOrderHistory(w.order.id,"calendar_synced",{count:o,pinned:n})}catch(e){console.error(e)}if(n)try{await rescheduleOrder(w.order,w.customer)
}catch(e){console.error("Could not reflow around the moved date:",e)}await refreshSchedule(),await refreshHistory()}catch(t){console.error(t),
showToast(t.message||"Could not sync to Google Calendar"),e.textContent=o,e.disabled=!1}syncBottomBar()}
const x=["https://www.googleapis.com/auth/calendar.events","https://www.googleapis.com/auth/drive.file"].join(" "),googleRedirectUri=()=>location.origin+location.pathname
;function connectGoogle(){const e=(window.KK_CONFIG||{}).GOOGLE_CLIENT_ID||"";if(!e)return p.gcalErr.hidden=!1,
void(p.gcalErr.textContent="No GOOGLE_CLIENT_ID in config.js — see “Google Calendar” in the README.");const t=new URLSearchParams({client_id:e,
redirect_uri:googleRedirectUri(),response_type:"code",scope:x,access_type:"offline",prompt:"consent",include_granted_scopes:"true"})
;location.href="https://accounts.google.com/o/oauth2/v2/auth?"+t.toString()}async function showCalendarSettings(){let o;setChrome({
title:"Google Calendar",up:{label:"Customers",hash:"#/customers"},save:!1,actions:!1}),p.gcalErr.hidden=!0,p.gcalConnect.hidden=!0,
p.gcalDisconnect.hidden=!0,p.gcalState.textContent="Checking…";try{o=await t.googleStatus()}catch(e){return console.error(e),
p.gcalState.textContent="Could not reach the calendar service.",p.gcalErr.hidden=!1,p.gcalErr.textContent=e.message||"",void(p.gcalConnect.hidden=!1)}
w.googleConnected=!(!o||!o.connected),
p.gcalState.textContent=w.googleConnected?"Connected"+(o.connected_at?" since "+e.formatShortDate(String(o.connected_at).slice(0,10)):"")+".":"Not connected. Fitting dates stay in this app until you connect.",
p.gcalConnect.hidden=w.googleConnected,p.gcalDisconnect.hidden=!w.googleConnected}async function disconnectGoogle(){
if(window.confirm("Disconnect Google Calendar? Events already created stay where they are."))try{await t.googleDisconnect(),w.googleConnected=!1,
showToast("Disconnected"),await showCalendarSettings()}catch(e){console.error(e),showToast(e.message||"Could not disconnect")}}
async function saveOrder(){if(!function(){if(p.errTerms.hidden=!0,"other"!==p.oScheme.value)return!0;const e=readTerms()
;if(!e.length)return showTermsError("Add at least one payment term.");if(e.some(e=>!e.label))return showTermsError("Every term needs a label.")
;if(e.some(e=>null==e.percent||e.percent<=0))return showTermsError("Every term needs a share above 0%.");const t=roundPct(termsTotal(e))
;if(100!==t)return showTermsError("The shares add up to "+t+"%. They have to add up to 100%.");return!0}())return!1;const e=readItems().map(e=>({
name:e.name,qty:e.qty,price:e.price,cost:e.cost})),o="other"===p.oScheme.value?"other":"standard";w.order=await t.updateOrder(w.order.id,{
title:orNull(p.oTitle.value),doc_name:orNull(p.oDocName.value),items:e,includes:checkedIncludes(),payment_scheme:o,
payment_terms:"other"===o?readTerms():[],first_payment_date:orNull(p.oFirstPayment.value),second_payment_date:orNull(p.oSecondPayment.value),
final_payment_date:orNull(p.oFinalPayment.value)}),setDirty(!1);try{await t.logOrderHistory(w.order.id,"updated",{})}catch(e){console.error(e)}try{
const e=await rescheduleOrder(w.order,w.customer);e.changed&&await t.logOrderHistory(w.order.id,"scheduled",{count:e.rows.length,
dropped:e.computed.dropped})}catch(e){console.error(e),showToast("Saved, but the schedule could not be rebuilt")}return!0}function addItemRow(t,o){
const n=function(t){const o=t||{name:"",qty:1,price:"",cost:""},n=document.createElement("div");return n.className="item",
n.innerHTML='<div class="item__head"><span class="item__idx"></span><button type="button" class="item__remove js-remove" aria-label="Remove item">'+u+'</button></div><label class="field"><span class="field__label">Description</span><input class="input js-name" type="text" placeholder="e.g. Bridal skirt"></label><div class="item__row2"><label class="field field--qty"><span class="field__label">Qty</span><input class="input js-qty" type="text" inputmode="numeric" value="1"></label><label class="field field--price"><span class="field__label">Price</span><span class="prefixed"><span class="prefix">Rp</span><input class="input js-price" type="text" inputmode="numeric" placeholder="0"></span></label></div><span class="item__sum js-sum"></span><label class="field"><span class="field__label">Est. production cost <span class="tag">Internal</span></span><div class="costfield-row"><span class="prefixed"><span class="prefix">Rp</span><input class="input js-cost" type="text" inputmode="numeric" placeholder="0"></span><button type="button" class="js-cost-calc calc-trigger" aria-label="Break down cost"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/></svg></button></div><span class="field__hint js-costhint"></span></label><span class="err js-err" hidden></span>',
a(".js-name",n).value=o.name||"",
a(".js-qty",n).value=null==o.qty?1:o.qty,a(".js-price",n).value=""===o.price||null==o.price?"":e.groupDigits(o.price),
a(".js-cost",n).value=""===o.cost||null==o.cost?"":e.groupDigits(o.cost),n}(t);return p.itemList.appendChild(n),refreshRemoveButtons(),
refreshItemTotals(),o&&a(".js-name",n).focus(),n}const O=.35;function refreshItemTotals(){let t=0;readItems().forEach(o=>{const n=o.qty*o.price;t+=n
;const s=a(".js-sum",o.row);s&&(s.textContent=o.qty>1&&o.price>0?e.formatRupiah(n):"");const r=a(".js-costhint",o.row);if(r){const t=function(t,o){
if(!t)return{text:"",over:!1};const n=Math.round(t*O);return o>n?{text:e.formatRupiah(o-n)+" over the 35% target",over:!0}:{
text:"Keep under "+e.formatRupiah(n)+" (35% of price)",over:!1}}(o.price,o.cost);r.textContent=t.text,r.classList.toggle("field__hint--over",t.over)}
}),p.itemsTotal.textContent=t>0?e.formatRupiah(t):""}const rowElements=()=>s(".item",p.itemList);function refreshRemoveButtons(){const e=rowElements()
;e.forEach(t=>{a(".js-remove",t).disabled=e.length<=1})}function readItems(){return rowElements().map(t=>({row:t,name:a(".js-name",t).value.trim(),
qtyRaw:e.digitsOnly(a(".js-qty",t).value),priceRaw:e.digitsOnly(a(".js-price",t).value),costRaw:e.digitsOnly(a(".js-cost",t).value),get qty(){
return""===this.qtyRaw?0:Number(this.qtyRaw)},get price(){return""===this.priceRaw?0:Number(this.priceRaw)},get cost(){
return""===this.costRaw?0:Number(this.costRaw)}}))}function customChip(t,o){
return'<span class="chip chip--custom'+(o?" is-checked":"")+'" data-label="'+e.escapeHtml(t)+'"><label class="chip__main"><input type="checkbox"'+(o?" checked":"")+'><span class="chip__box">'+h+"</span><span>"+e.escapeHtml(t)+'</span></label><button type="button" class="chip__remove js-remove-include" aria-label="Remove '+e.escapeHtml(t)+'">'+m+"</button></span>"
}const checkedIncludes=()=>s(".chip",p.includesList).filter(e=>a("input",e).checked).map(e=>e.dataset.label);function addCustomInclude(){
const e=p.customInclude.value.trim().replace(/\s+/g," ");if(!e)return
;const t=s("[data-label]",p.includesList).map(e=>e.dataset.label).findIndex(t=>t.toLowerCase()===e.toLowerCase());if(-1!==t){
// Already on the list — just make sure it is ticked, and say so.
const o=s(".chip",p.includesList)[t];return a("input",o).checked=!0,o.classList.add("is-checked"),p.customInclude.value="",setDirty(!0),
void showToast('"'+e+'" is already on the list')}p.includesList.insertAdjacentHTML("beforeend",customChip(e,!0)),p.customInclude.value="",
p.customInclude.focus(),setDirty(!0)}function addTermRow(e,t){const o=function(e){const t=e||{label:"",percent:"",desc:""
},o=document.createElement("div")
;return o.className="term",o.innerHTML='<div class="item__head"><span class="term__idx"></span><button type="button" class="item__remove js-remove-term" aria-label="Remove term">'+u+'</button></div><div class="term__row"><label class="field term__namefield"><span class="field__label">Label</span><input class="input js-tlabel" type="text" maxlength="40" placeholder="e.g. Down payment"></label><label class="field term__pctfield"><span class="field__label">Share</span><span class="prefixed prefixed--suffix"><input class="input js-tpct" type="text" inputmode="decimal" placeholder="0"><span class="suffix">%</span></span></label></div><label class="field"><span class="field__label">Description (optional)</span><input class="input js-tdesc" type="text" maxlength="120" placeholder="Printed under the share on the quotation"></label>',
a(".js-tlabel",o).value=t.label||"",a(".js-tpct",o).value=""===t.percent||null==t.percent?"":String(t.percent),a(".js-tdesc",o).value=t.desc||"",o}(e)
;return p.termList.appendChild(o),refreshTermRemoveButtons(),refreshTermsSum(),t&&a(".js-tlabel",o).focus(),o}
const termRowElements=()=>s(".term",p.termList);function refreshTermRemoveButtons(){const e=termRowElements();e.forEach(t=>{
a(".js-remove-term",t).disabled=e.length<=1})}const parsePercent=e=>{const t=String(e||"").replace(/[^\d.]/g,"").replace(/(\..*)\./g,"$1")
;return""===t||"."===t?null:Number(t)};function readTerms(){return termRowElements().map(e=>({label:a(".js-tlabel",e).value.trim(),
percent:parsePercent(a(".js-tpct",e).value),desc:a(".js-tdesc",e).value.trim()}))}
const termsTotal=e=>e.reduce((e,t)=>e+(t.percent||0),0),roundPct=e=>Math.round(100*e)/100;function refreshTermsSum(){
const e=roundPct(termsTotal(readTerms())),t=roundPct(100-e)
;p.termsSum.textContent="Shares total "+e+"%"+(0===t?"":t>0?" — "+t+"% short":" — "+-t+"% over"),p.termsSum.classList.toggle("termsum--off",0!==t)}
function showTermsError(e){return p.errTerms.textContent=e,p.errTerms.hidden=!1,p.termsCard.scrollIntoView({block:"center",behavior:"smooth"}),!1}
function buildTerms(e){p.termList.innerHTML="";const t=e&&e.payment_terms||[];(t.length?t:[{label:"Down payment",percent:50,desc:""},{
label:"Final payment",percent:50,desc:""}]).forEach(e=>addTermRow(e,!1))}function syncSchemeCard(){p.termsCard.hidden="other"!==p.oScheme.value,
p.termsCard.hidden||termRowElements().length||buildTerms(null),p.errTerms.hidden=!0,refreshTermsSum()}
const P=["Fabric","Tailor","Transport","Dry Cleaning"];function addCalcRow(t,o){const n=function(t){const o=document.createElement("div")
;return o.className="calcrow",
o.innerHTML='<button type="button" class="calcrow__remove js-remove-calcrow" aria-label="Remove category">'+m+'</button><label class="field calcrow__label"><span class="field__label">Category</span><input class="input js-clabel" type="text" maxlength="40" placeholder="e.g. Fabric"></label><label class="field calcrow__amount"><span class="field__label">Amount</span><span class="prefixed"><span class="prefix">Rp</span><input class="input js-camount" type="text" inputmode="numeric" placeholder="0"></span></label>',
a(".js-clabel",o).value=t&&t.label||"",a(".js-camount",o).value=t&&t.amount?e.groupDigits(t.amount):"",o}(t);return p.calcRowList.appendChild(n),
refreshCalcRemoveButtons(),refreshCalcTotal(),o&&a(".js-clabel",n).focus(),n}const calcRowElements=()=>s(".calcrow",p.calcRowList)
;function refreshCalcRemoveButtons(){const e=calcRowElements();e.forEach(t=>{a(".js-remove-calcrow",t).disabled=e.length<=1})}function readCalcRows(){
return calcRowElements().map(t=>({label:a(".js-clabel",t).value.trim(),amountRaw:e.digitsOnly(a(".js-camount",t).value),get amount(){
return""===this.amountRaw?0:Number(this.amountRaw)}}))}function refreshCalcTotal(){const t=readCalcRows().reduce((e,t)=>e+t.amount,0)
;return p.calcTotal.textContent=e.formatRupiah(t),t}const H=new WeakMap;let I=null,F=null;function closeCostCalc(){I&&H.set(I,readCalcRows().map(e=>({
label:e.label,amount:e.amount}))),p.calcSheet.hidden=!0,document.body.classList.remove("has-app-modal"),I=null,F&&document.contains(F)&&F.focus(),
F=null}function applyCostCalc(){const t=refreshCalcTotal();a(".js-cost",I).value=e.groupDigits(t),refreshItemTotals(),setDirty(!0),
showToast("Cost updated"),closeCostCalc()}const R=KK.moodboard;let j=null,N=null,B=!1,q=null;function setupMoodboardListeners(){
const e=a("#mbDropzone"),t=a("#mbFileInput"),o=a("#mbAddMore"),n=a("#mbRandomize"),s=a("#mbGenerate"),r=a("#mbDownload"),i=a("#mbThumbs")
;e.addEventListener("click",function(o){
B||o.target.closest(".mb-thumb__remove")||o.target.closest(".mb-thumb")||e.classList.contains("has-images")||t.click()}),
o.addEventListener("click",function(){t.click()}),t.addEventListener("change",async function(){t.files.length&&await addMoodboardFiles(t.files),
t.value=""}),e.addEventListener("dragover",function(t){t.preventDefault(),e.classList.add("is-over")}),e.addEventListener("dragleave",function(){
e.classList.remove("is-over")}),e.addEventListener("drop",async function(t){t.preventDefault(),e.classList.remove("is-over"),
B||t.dataTransfer.files.length&&await addMoodboardFiles(t.dataTransfer.files)}),i.addEventListener("click",function(e){
const t=e.target.closest(".mb-thumb__remove");t&&R.removeImage(Number(t.dataset.i))}),n.addEventListener("click",function(){R.randomize(),
renderMoodboardPresentation()}),s.addEventListener("click",openMoodboardPresentation),r.addEventListener("click",downloadMoodboard),function(e){
if(!e)return;const clampZoom=e=>Math.max(1,Math.min(5,e)),point=e=>({x:e.clientX,y:e.clientY});e.addEventListener("pointerdown",function(t){
N&&(e.setPointerCapture(t.pointerId),N.pointers.set(t.pointerId,point(t)),N.lastDistance=null)}),e.addEventListener("pointermove",function(e){
if(!N||!N.pointers.has(e.pointerId))return;const t=N.pointers.get(e.pointerId);N.pointers.set(e.pointerId,point(e))
;const o=Array.from(N.pointers.values());if(o.length>=2){const e=o[0].x-o[1].x,t=o[0].y-o[1].y,n=Math.hypot(e,t)
;N.lastDistance&&(N.zoom=clampZoom(N.zoom*n/N.lastDistance)),N.lastDistance=n}else N.zoom>1&&(N.x+=e.clientX-t.x,N.y+=e.clientY-t.y)
;applyMoodboardTransform()});const endPointer=function(e){N&&(N.pointers.delete(e.pointerId),N.lastDistance=null)}
;e.addEventListener("pointerup",endPointer),e.addEventListener("pointercancel",endPointer),e.addEventListener("wheel",function(e){
N&&(e.preventDefault(),N.zoom=clampZoom(N.zoom*(e.deltaY<0?1.12:.89)),1===N.zoom&&(N.x=N.y=0),applyMoodboardTransform())},{passive:!1}),
e.addEventListener("dblclick",function(){N&&(N.zoom=N.zoom>1?1:2,1===N.zoom&&(N.x=N.y=0),applyMoodboardTransform())})}(a("#mbPresentationCanvas"))}
async function addMoodboardFiles(e){if(B)return
;const t=a("#mbLoading"),o=a("#mbLoadingText"),n=a("#mbAddMore"),s=a("#mbGenerate"),r=Math.min(Array.from(e).length,R.MAX_IMAGES-R.images.length)
;B=!0,t.hidden=!1,a("#mbDropzone").classList.add("is-loading"),a("#mbDropzone").setAttribute("aria-busy","true"),
o.textContent=r>1?"Preparing 1 of "+r+" photos…":"Preparing photo…",n.disabled=!0,s.disabled=!0,await new Promise(e=>{
requestAnimationFrame(()=>setTimeout(e,0))});try{const t=await R.addFiles(e,function(e,t){
o.textContent=t>1?"Preparing "+e+" of "+t+" photos…":"Preparing photo…"})
;t.rejected&&showToast(1===t.rejected?"One image could not be opened and was skipped":t.rejected+" images could not be opened and were skipped")
}catch(e){console.error(e),showToast("Could not prepare those photos — "+(e.message||"please try again"))}finally{B=!1,t.hidden=!0,
a("#mbDropzone").classList.remove("is-loading"),a("#mbDropzone").removeAttribute("aria-busy"),n.disabled=!1,s.disabled=0===R.images.length}}
function openMoodboardPresentation(){R.images.length&&go("#/order/"+w.order.id+"/moodboard/preview")}function resetMoodboardView(){N={zoom:1,x:0,y:0,
baseScale:1,clone:null,pointers:new Map}}function applyMoodboardTransform(){if(!N||!N.clone)return;const e=N.baseScale*N.zoom
;N.clone.style.transform="translate(calc(-50% + "+N.x+"px),calc(-50% + "+N.y+"px)) scale("+e+")"}function renderMoodboardPresentation(e){
const t=a("#mbPresentation"),o=a("#mbPresentationCanvas"),n=R.stage;if(!t||t.hidden||!o||!n)return;const s=o.getBoundingClientRect()
;N&&!e||resetMoodboardView(),N.baseScale=Math.min(s.width/1920,s.height/1080);const r=n.cloneNode(!0)
;r.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id")),r.removeAttribute("id"),
r.style.cssText="position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:50% 50%;pointer-events:none;",o.replaceChildren(r),
N.clone=r,applyMoodboardTransform()}function closeMoodboardPresentation(){const e=p.mbPresentation,t=e&&!e.hidden;e&&(e.hidden=!0)
;const o=a("#mbPresentationCanvas");o&&o.replaceChildren(),document.body.classList.remove("moodboard-presenting"),
document.body.classList.remove("has-app-modal"),N=null,t&&q&&document.contains(q)&&q.focus(),q=null}async function downloadMoodboard(){
const o=a("#mbDownload");let n=!1,s=!1;o.disabled=!0,o.classList.add("is-busy"),a(".btn__label",o).textContent="Preparing PDF…";try{
const r=await R.generatePDF(),i=R.buildFilename(new Date);r.save(i),n=!0,a(".btn__label",o).textContent="Saving copy…"
;const d=R.pdfToBase64(r),c=await t.driveSaveMoodboardPdf(i,d);s=!0,await t.logMoodboard(w.order.id,c.drive_link),
await t.logOrderHistory(w.order.id,"moodboard_generated",{drive_link:c.drive_link,file_name:c.file_name}),
w.customer=await t.updateCustomer(w.customer.id,{moodboard_date:e.todayISO()});const l=consultNudgeFor(w.customer,w.customerOrders,e.todayISO())
;if(l){await t.updateCustomer(w.customer.id,l);try{await t.syncFollowUp(w.customer.id)}catch(e){}}R.cleanup(),closeMoodboardPresentation(),
showToast("Moodboard downloaded and copied to Google Drive"),go("#/order/"+w.order.id)}catch(e){console.error(e),
showToast(n?s?"PDF downloaded and copied, but its record could not be finished — "+(e.message||"please try again"):"PDF downloaded, but the Drive copy failed — "+(e.message||"please try again"):"Could not generate the moodboard — "+(e.message||"please try again"))
}finally{o.disabled=!1,o.classList.remove("is-busy"),a(".btn__label",o).textContent="Download"}}function setBusy(e,t){Object.keys(g).forEach(e=>{
g[e].disabled=t});const n=g[e];n.classList.toggle("is-busy",t),a(".btn__label",n).textContent=t?"Generating…":o.DOCS[e].name+" PDF"}
async function download(n){let a;setBusy(n,!0);try{a=await o.download(n,{docName:w.order.doc_name||w.customer.name||"",date:e.todayISO(),
items:w.order.items||[],includes:w.order.includes||[],terms:o.termsFor(w.order)})}catch(e){return console.error(e),
showToast("Could not generate the PDF — please try again"),void setBusy(n,!1)}setBusy(n,!1),showToast(o.DOCS[n].name+" downloaded"),
// Sending a quotation means it has been quoted; sending an invoice means
// the order is confirmed. Only ever forward.
await bumpStatus("invoice"===n?"Confirmed":"Quoted");
// The file is already on disk by now. A log failure is worth reporting but
// must not read as a failed download.
try{await t.logDocument(w.order.id,n,a),await refreshHistory()}catch(e){console.error(e),showToast("Downloaded, but could not record it")}}
async function logDeposit(a){const s=o.computeTotal(w.order.items),r=o.termsFor(w.order),i=o.termAmounts(s,r)[a],d=function(t,o,n){const a={}
;return 0!==o||t.first_payment_date||(a.first_payment_date=e.todayISO()),
o!==(e=>e&&"other"===e.payment_scheme?0:1)(t)||t.second_payment_date||(a.second_payment_date=e.todayISO()),
o!==n.length-1||t.final_payment_date||(a.final_payment_date=e.todayISO()),a}(w.order,a,r);if(d.first_payment_date&&d.final_payment_date){
if(!window.confirm("This is the only payment term, so logging it starts the schedule and marks the order finished at the same time. Log it?"))return}
try{await t.logOrderHistory(w.order.id,"payment_logged",{deposit_index:a,deposit_label:o.termLabel(r[a]),amount:i}),p.paymentChooserOptions.hidden=!0,
showToast(r[a].label+" logged"),Object.keys(d).length&&(w.order=await t.updateOrder(w.order.id,d)),
(d.first_payment_date||d.second_payment_date)&&await async function(){try{
const e=await rescheduleOrder(w.order,w.customer),o=e.rows.filter(e=>n.isProductionStage(e.stage)).length
;o?(await t.logOrderHistory(w.order.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped}),
showToast(o+" fittings scheduled")):e.rows.length?(await t.logOrderHistory(w.order.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped}),
showToast("Design phase scheduled")):e.computed.reason&&showToast(e.computed.reason),await refreshSchedule()}catch(e){console.error(e),
showToast("Payment logged, but the schedule could not be built")}
}(),d.final_payment_date?await bumpStatus("Delivered"):d.second_payment_date?await bumpStatus("In production"):d.first_payment_date&&await bumpStatus("Confirmed"),
await refreshHistory(),renderOrderStatus()}catch(e){console.error(e),showToast(e.message||"Could not log payment")}}async function signOutFromMenu(){
closeMenu(),confirmLeave()&&(await t.signOut(),location.hash="",showGate())}function bindEvents(){window.addEventListener("hashchange",handleRoute),
p.pageAction.addEventListener("click",()=>{D&&D()}),p.saveBtn.addEventListener("click",async()=>{if(!w.saving){w.saving=!0,setDirty(w.dirty);try{
if("customer"===w.route.view)await saveCustomer();else if("orderEdit"===w.route.view){const e=w.order.id;
// Refused by validation: stay on the form, where the error is.
if(!await saveOrder())return;showToast("Order saved"),leaveFormFor("#/order/"+e)}}catch(e){console.error(e),showToast(e.message||"Could not save")
}finally{w.saving=!1,setDirty(w.dirty)}}}),p.menuBtn.addEventListener("click",e=>{e.stopPropagation(),function(){const e=p.menuList.hidden
;p.menuList.hidden=!e,p.menuBtn.setAttribute("aria-expanded",String(e))}()}),document.addEventListener("click",e=>{
p.menuList.hidden||p.menu.contains(e.target)||closeMenu()}),document.addEventListener("keydown",e=>{if("Escape"!==e.key||p.menuList.hidden)return
;closeMenu(),p.menuBtn.focus()}),p.menuSignOut.addEventListener("click",signOutFromMenu),p.menuDelete.addEventListener("click",()=>{closeMenu(),
"order"===p.menuDelete.dataset.kind?async function(){
if(window.confirm("Delete this order and its payment and download record? This cannot be undone."))try{const e=w.order.customer_id
;await t.deleteOrder(w.order.id),setDirty(!1),showToast("Order deleted"),go("#/customer/"+e)}catch(e){console.error(e),
showToast(e.message||"Could not delete")}}():async function(){const e=w.customer.name||"this customer"
;if(window.confirm("Delete "+e+", along with every order and download record? This cannot be undone."))try{await t.deleteCustomer(w.customer.id),
setDirty(!1),showToast("Customer deleted"),go("#/customers")}catch(e){console.error(e),showToast(e.message||"Could not delete")}}()}),
p.customerSearch.addEventListener("input",renderCustomerList),s(".js-cfield").forEach(e=>{e.addEventListener("input",()=>{
e===p.cName&&e.value.trim()&&(e.classList.remove("is-invalid"),p.errCName.hidden=!0),setDirty(!0)}),e.addEventListener("change",()=>setDirty(!0))}),
p.cWeddingPrecision.addEventListener("click",e=>{const t=e.target.closest(".segmented__btn")
;t&&t.dataset.precision!==weddingPrecision()&&(setWeddingPrecision(t.dataset.precision),setDirty(!0))}),
p.cancelCustomer.addEventListener("click",cancelCustomer),p.reopenCustomer.addEventListener("click",reopenCustomer),
p.newOrder.addEventListener("click",async()=>{if(confirmLeave()){setDirty(!1);try{const o=await t.createOrder({customer_id:w.customer.id,
document_date:e.todayISO(),status:"Quoted",items:[],includes:r.slice()});await t.logOrderHistory(o.id,"created",{}),
w.customerOrders=(w.customerOrders||[]).concat(o);try{await setFollowUp(consultNudgeFor(w.customer,w.customerOrders))}catch(e){console.error(e)}
go("#/order/"+o.id+"/edit")}catch(e){console.error(e),showToast(e.message||"Could not create the order")}}}),
p.logPaymentBtn.addEventListener("click",()=>{p.paymentChooserOptions.hidden?function(){
const t=o.computeTotal(w.order.items),n=o.termsFor(w.order),a=o.termAmounts(t,n),s=w.loggedDeposits||{}
;p.paymentChooserOptions.innerHTML=n.map((t,o)=>s[o]?"":'<button type="button" class="btn btn--outline btn--block js-log-deposit" data-i="'+o+'">'+e.escapeHtml(t.label)+" — "+e.formatRupiah(a[o])+"</button>").join(""),
p.paymentChooserOptions.hidden=!1}():p.paymentChooserOptions.hidden=!0}),p.paymentChooserOptions.addEventListener("click",e=>{
const t=e.target.closest(".js-log-deposit");t&&logDeposit(Number(t.dataset.i))}),p.downloadQuote.addEventListener("click",()=>download("quotation")),
p.downloadInvoice.addEventListener("click",()=>download("invoice")),a("#createMoodboardBtn").addEventListener("click",function(){
w.order&&go("#/order/"+w.order.id+"/moodboard")}),p.mbPresentationClose.addEventListener("click",function(){
w.order&&go("#/order/"+w.order.id+"/moodboard")}),p.logNewFittingBtn.addEventListener("click",function(){
w.order&&go("#/order/"+w.order.id+"/fitting/new")}),p.fittingJournalAdd.addEventListener("click",()=>KK.fittings.openCamera()),
KK.fittings.bindOverlays(),setupMoodboardListeners(),p.syncCalendarBtn.addEventListener("click",syncCalendar),
p.gcalConnect.addEventListener("click",connectGoogle),p.gcalDisconnect.addEventListener("click",disconnectGoogle),
p.enquiryAccept.addEventListener("click",acceptEnquiry),p.enquiryDismiss.addEventListener("click",dismissEnquiry),
p.menuCalendar.addEventListener("click",closeMenu),s(".js-ofield").forEach(e=>{
e.addEventListener("input",()=>setDirty(!0)),e.addEventListener("change",()=>setDirty(!0))}),[p.oFirstPayment,p.oSecondPayment,p.oScheme].forEach(e=>{
e.addEventListener("input",renderScheduleHint),e.addEventListener("change",renderScheduleHint)}),p.addItem.addEventListener("click",()=>{addItemRow({
name:"",qty:1,price:"",cost:""},!0),setDirty(!0)}),p.itemList.addEventListener("click",e=>{const t=e.target.closest(".js-remove")
;if(t&&!t.disabled)return t.closest(".item").remove(),refreshRemoveButtons(),refreshItemTotals(),void setDirty(!0)
;const o=e.target.closest(".js-cost-calc");o&&function(e){F=document.activeElement,I=e;const t=a(".js-name",e).value.trim()
;p.calcItemLabel.textContent=t?'For "'+t+'"':"For this item";const o=H.get(e)||P.map(e=>({label:e,amount:0}));p.calcRowList.innerHTML="",
o.forEach(e=>addCalcRow(e,!1)),p.calcSheet.hidden=!1,document.body.classList.add("has-app-modal"),
requestAnimationFrame(()=>a(".js-clabel",p.calcRowList)?.focus())}(o.closest(".item"))}),p.itemList.addEventListener("input",t=>{const o=t.target
;o.classList.contains("js-qty")?o.value=e.digitsOnly(o.value).replace(/^0+(?=\d)/,""):(o.classList.contains("js-price")||o.classList.contains("js-cost"))&&e.reformatPriceField(o),
o.classList.remove("is-invalid");const n=a(".js-err",o.closest(".item"));n&&(n.hidden=!0),refreshItemTotals(),setDirty(!0)}),
p.itemList.addEventListener("focusout",t=>{t.target.classList.contains("js-qty")&&""===e.digitsOnly(t.target.value)&&(t.target.value="1",
refreshItemTotals())}),p.includesList.addEventListener("change",e=>{const t=e.target
;"checkbox"===t.type&&(t.closest(".chip").classList.toggle("is-checked",t.checked),setDirty(!0))}),p.includesList.addEventListener("click",e=>{
const t=e.target.closest(".js-remove-include");t&&(e.preventDefault(),t.closest(".chip").remove(),setDirty(!0))}),
p.addInclude.addEventListener("click",addCustomInclude),p.oScheme.addEventListener("change",()=>{syncSchemeCard(),setDirty(!0)}),
p.addTerm.addEventListener("click",()=>{addTermRow(null,!0),setDirty(!0)}),p.termList.addEventListener("click",e=>{
const t=e.target.closest(".js-remove-term");t&&!t.disabled&&(t.closest(".term").remove(),refreshTermRemoveButtons(),refreshTermsSum(),setDirty(!0))}),
p.termList.addEventListener("input",e=>{const t=e.target;
// One dot, digits either side of it, nothing else.
t.classList.contains("js-tpct")&&(t.value=t.value.replace(/[^\d.]/g,"").replace(/(\..*)\./g,"$1")),p.errTerms.hidden=!0,refreshTermsSum(),setDirty(!0)
}),p.calcAddRow.addEventListener("click",()=>addCalcRow(null,!0)),p.calcRowList.addEventListener("click",e=>{
const t=e.target.closest(".js-remove-calcrow");t&&!t.disabled&&(t.closest(".calcrow").remove(),refreshCalcRemoveButtons(),refreshCalcTotal())}),
p.calcRowList.addEventListener("input",t=>{t.target.classList.contains("js-camount")&&e.reformatPriceField(t.target),refreshCalcTotal()}),
p.calcApply.addEventListener("click",applyCostCalc),p.calcBack.addEventListener("click",closeCostCalc),p.customInclude.addEventListener("keydown",e=>{
"Enter"===e.key&&(e.preventDefault(),addCustomInclude())}),window.addEventListener("resize",function(){syncVisualViewport(),
renderMoodboardPresentation()}),window.visualViewport&&(window.visualViewport.addEventListener("resize",syncVisualViewport),
window.visualViewport.addEventListener("scroll",syncVisualViewport)),
window.addEventListener("offline",()=>showToast("You're offline — changes won't save until you're back online")),
window.addEventListener("online",()=>showToast("Back online")),document.addEventListener("focusin",e=>{var t
;(t=e.target).matches("input, select, textarea, button")&&requestAnimationFrame(()=>setTimeout(()=>{document.activeElement===t&&t.scrollIntoView({
block:"center",inline:"nearest",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})},80))}),
document.addEventListener("keydown",e=>{trapModalFocus(e,p.calcSheet),trapModalFocus(e,p.mbPresentation),
"Escape"===e.key&&(p.calcSheet.hidden?!p.mbPresentation.hidden&&w.order&&(e.preventDefault(),
go("#/order/"+w.order.id+"/moodboard")):(e.preventDefault(),closeCostCalc()))}),window.addEventListener("beforeunload",e=>{
w.dirty&&(e.preventDefault(),e.returnValue="")})}function showGate(){p.boot.hidden=!0,p.app.hidden=!0,p.gate.hidden=!1,
p.gateRemember.checked=t.rememberPreference(),p.gatePassword.value=p.gateRemember.checked?t.savedPassword():"",p.gateErr.hidden=!0,
p.gatePassword.value?p.gateSubmit.focus():p.gatePassword.focus()}function showApp(){p.boot.hidden=!0,p.gate.hidden=!0,p.app.hidden=!1,handleRoute(),
async function(){const e=new URLSearchParams(location.search),o=e.get("code"),n=e.get("error");if(!o&&!n)return
;const clean=()=>history.replaceState(null,"",location.pathname+location.hash);if(n)return clean(),
void showToast("access_denied"===n?"Google Calendar was not connected":"Google sign-in failed");clean();try{
await t.googleExchange(o,googleRedirectUri()),w.googleConnected=!0,showToast("Google Calendar connected")}catch(e){console.error(e),
showToast(e.message||"Could not connect Google Calendar")}}()}return async function(){if(p.gateForm.addEventListener("submit",async e=>{
if(e.preventDefault(),!p.gateSubmit.disabled){p.gateErr.hidden=!0,p.gateSubmit.disabled=!0,p.gateSubmit.classList.add("is-busy"),
a(".btn__label",p.gateSubmit).textContent="Unlocking…";try{await t.signIn(p.gatePassword.value,p.gateRemember.checked),showApp()}catch(e){
p.gateErr.textContent=e.message||"Could not sign in",p.gateErr.hidden=!1,p.gatePassword.select()}finally{p.gateSubmit.disabled=!1,
p.gateSubmit.classList.remove("is-busy"),a(".btn__label",p.gateSubmit).textContent="Unlock"}}}),bindEvents(),t.isConfigured())try{
await t.currentSession()?showApp():showGate()}catch(e){console.error(e),showGate()
}else p.boot.innerHTML='<div class="boot__msg"><strong>Not connected.</strong><span>Fill in <code>config.js</code> with your Supabase URL and anon key — see “Setting up the database” in the README.</span></div>'
}(),{state:w}}();
