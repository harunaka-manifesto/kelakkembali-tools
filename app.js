/* SPA composition root. Owns hash routing, page state, DOM rendering/events,
   validation, and workflow orchestration across customers, orders, documents,
   schedules, moodboards, fittings, and intake. Persistent access belongs in
   db.js; pure document and schedule rules belong in their feature modules. */
/* Feature anchors (search these names instead of reading the whole closure):
   handleRoute                         routing and route-to-view dispatch
   showCustomers / renderCustomerList homepage loading and customer ledger
   acceptEnquiry / dismissEnquiry     Tally intake review
   showCustomerDetail / saveCustomer customer read/edit flows
   showOrderDetail / buildOrderDetailViewModel  order read flow
   saveOrder / addItemRow / addTermRow          order editor
   rescheduleOrder / logDeposit       payments and calendar scheduling
   setupMoodboardListeners            moodboard interaction
   syncMoodboardCanvas / openMoodboardOverlay  generated moodboard canvas
   download / exportMoodboard         document generation and logging
   bindEvents / showGate / showApp    application boot and global events */
window.KK=window.KK||{},KK.app=function(){"use strict"
;const e=KK.util,t=KK.db,o=KK.docs,n=KK.calendar,a=e.$,s=e.$$,r=["Custom design & consultation","Production","Standard fabric","Plain veil","Fitting","Laundry"],i=["Quoted","Confirmed","In production","Delivered"],d=["Instagram","TikTok","Referral","Walk-in","Other"],c={
label:"Check in",days:3},l={label:"Follow up moodboard",days:3
},u='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',m='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',h='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',p={
boot:a("#boot"),gate:a("#gate"),gateForm:a("#gateForm"),gatePassword:a("#gatePassword"),gateRemember:a("#gateRemember"),gateErr:a("#gateErr"),
gateSubmit:a("#gateSubmit"),app:a("#app"),upLink:a("#upLink"),upLabel:a("#upLabel"),appbarBrand:a("#appbarBrand"),homeLink:a("#homeLink"),
routeLoader:a("#routeLoader"),routeLoaderError:a("#routeLoaderError"),routeLoaderStatus:a("#routeLoaderStatus"),
viewTitle:a("#viewTitle"),viewSub:a("#viewSub"),pageAction:a("#pageAction"),savebar:a("#savebar"),saveBtn:a("#saveBtn"),menu:a("#menu"),
menuBtn:a("#menuBtn"),menuList:a("#menuList"),menuDelete:a("#menuDelete"),menuCalendar:a("#menuCalendar"),menuSignOut:a("#menuSignOut"),
viewCustomers:a("#viewCustomers"),homeStage:a("#homeStage"),homeLoading:a("#homeLoading"),homeError:a("#homeError"),homeReady:a("#homeReady"),homeHero:a("#homeHero"),homeActions:a("#homeActions"),
homeNav:a("#homeNav"),homeNavHome:a("#homeNavHome"),homeNavMenu:a("#homeNavMenu"),homeNavMenuWrapper:a("#homeNavMenuWrapper"),
homeCustomers:a("#homeCustomers"),homeFooter:a("#homeFooter"),homeSummary:a("#homeSummary"),heroGreeting:a("#heroGreeting"),heroDeadline:a("#heroDeadline"),customerSearch:a("#customerSearch"),customerList:a("#customerList"),viewCustomer:a("#viewCustomer"),
custBackBtn:a("#custBackBtn"),custEditBtn:a("#custEditBtn"),custHeroName:a("#custHeroName"),custWeddingText:a("#custWeddingText"),
custNextLabel:a("#custNextLabel"),custNextDate:a("#custNextDate"),custOrdersCount:a("#custOrdersCount"),custOrdersSum:a("#custOrdersSum"),
custOrderList:a("#custOrderList"),viewCustomerEdit:a("#viewCustomerEdit"),custEditCancel:a("#custEditCancel"),custEditTitle:a("#custEditTitle"),
cancelCustomer:a("#cancelCustomer"),reopenCustomer:a("#reopenCustomer"),deleteCustomer:a("#deleteCustomer"),deleteCustomerRow:a("#deleteCustomerRow"),
cName:a("#cName"),errCName:a("#errCName"),cPhone:a("#cPhone"),cInstagram:a("#cInstagram"),
cSource:a("#cSource"),cWedding:a("#cWedding"),cWeddingMonth:a("#cWeddingMonth"),cWeddingPrecision:a("#cWeddingPrecision"),
cMoodboardDate:a("#cMoodboardDate"),cFollowUpDate:a("#cFollowUpDate"),cFollowUpLabel:a("#cFollowUpLabel"),cCancelledReason:a("#cCancelledReason"),
cCancelledField:a("#cCancelledField"),cNotes:a("#cNotes"),
viewOrder:a("#viewOrder"),orderStage:a("#orderStage"),orderLoading:a("#orderLoading"),orderLoadingStatus:a("#orderLoadingStatus"),
orderError:a("#orderError"),orderReady:a("#orderReady"),orderBackBtn:a("#orderBackBtn"),orderBackLabel:a("#orderBackLabel"),
orderHistoryBtn:a("#orderHistoryBtn"),orderEditBtn:a("#orderEditBtn"),orderTitle:a("#orderTitle"),oItemsDisplay:a("#oItemsDisplay"),
paymentSummary:a("#paymentSummary"),paymentError:a("#paymentError"),logPaymentBtn:a("#logPaymentBtn"),
paymentChooser:a("#paymentChooser"),paymentChooserOptions:a("#paymentChooserOptions"),scheduleList:a("#scheduleList"),
createMoodboardBtn:a("#createMoodboardBtn"),logNewFittingBtn:a("#logNewFittingBtn"),viewCalendar:a("#viewCalendar"),gcalState:a("#gcalState"),gcalConnect:a("#gcalConnect"),
gcalDisconnect:a("#gcalDisconnect"),gcalErr:a("#gcalErr"),enquiriesCard:a("#enquiriesCard"),enquiriesCount:a("#enquiriesCount"),
viewEnquiry:a("#viewEnquiry"),enquiryWhen:a("#enquiryWhen"),enquiryAnswers:a("#enquiryAnswers"),enquiryNote:a("#enquiryNote"),
enquiryAccept:a("#enquiryAccept"),enquiryDismiss:a("#enquiryDismiss"),viewMoodboard:a("#viewMoodboard"),viewFittingJournal:a("#viewFittingJournal"),
mbBackBtn:a("#mbBackBtn"),mbBackLabel:a("#mbBackLabel"),mbTitle:a("#mbTitle"),
fittingJournal:a("#fittingJournal"),fittingJournalBar:a("#fittingJournalBar"),fittingJournalAdd:a("#fittingJournalAdd"),
viewOrderEdit:a("#viewOrderEdit"),oTitle:a("#oTitle"),oDocName:a("#oDocName"),oFirstPayment:a("#oFirstPayment"),oSecondPayment:a("#oSecondPayment"),
oFinalPayment:a("#oFinalPayment"),oScheduleHint:a("#oScheduleHint"),oScheme:a("#oScheme"),termsCard:a("#termsCard"),termList:a("#termList"),
addTerm:a("#addTerm"),termsSum:a("#termsSum"),errTerms:a("#errTerms"),itemList:a("#itemList"),itemsTotal:a("#itemsTotal"),addItem:a("#addItem"),
includesList:a("#includesList"),customInclude:a("#customInclude"),addInclude:a("#addInclude"),
downloadNote:a("#downloadNote"),downloadQuote:a("#downloadQuote"),downloadInvoice:a("#downloadInvoice"),
toast:a("#toast"),calcSheet:a("#calcSheet"),calcItemLabel:a("#calcItemLabel"),calcRowList:a("#calcRowList"),calcAddRow:a("#calcAddRow"),
calcTotal:a("#calcTotal"),calcApply:a("#calcApply"),calcBack:a("#calcBack"),
mbEditor:a("#mbEditor"),mbCanvas:a("#mbCanvas"),mbCanvasBack:a("#mbCanvasBack"),mbRotate:a("#mbRotate"),
mbBoard:a("#mbBoard"),mbBoardScaler:a("#mbBoardScaler"),mbRandomize:a("#mbRandomize"),mbUpload:a("#mbUpload"),
mbDownload:a("#mbDownload"),mbExportStatus:a("#mbExportStatus"),mbOverlay:a("#mbOverlay"),
mbOverlayCanvas:a("#mbOverlayCanvas"),mbOverlayClose:a("#mbOverlayClose")},g={quotation:p.downloadQuote,invoice:p.downloadInvoice},w={route:null,// { view, id }
customers:[],// the whole list, filtered client-side
customer:null,// record backing the customer view
order:null,// record backing the order views
overview:null,// { ordersByCustomer } — every order, for the homepage
loggedDeposits:{},// { depositIndex: loggedAt } for the open order
schedule:null,// computed programme + stored rows for the open order
customerOrders:[],// the open customer's orders — what their status is read from
enquiry:null,// the intake submission being reviewed
googleConnected:null,// null until asked; cached for the session
dirty:!1,saving:!1,navigation:{token:0},homepage:{phase:"idle",visit:0,loadToken:0,popPlayedForVisit:0},orderDetail:{phase:"idle",// idle | loading | ready | error
loadToken:0,orderId:null,vm:null,sectionErrors:{},paymentBusy:!1,documentBusy:null}};let f;function showToast(e){
p.toast.textContent=e,p.toast.classList.add("is-visible"),clearTimeout(f),f=setTimeout(()=>p.toast.classList.remove("is-visible"),2600)}
function setDirty(e){w.dirty=e,p.saveBtn.disabled=!e||w.saving,a(".btn__label",p.saveBtn).textContent=w.saving?"Saving…":e?"Save changes":"Saved"}
function syncBottomBar(){const e=p.savebar.hidden?p.fittingJournalBar.hidden?null:p.fittingJournalBar:p.savebar
;document.documentElement.style.setProperty("--bottombar-h",e?Math.round(e.getBoundingClientRect().height)+"px":"0px")}function syncVisualViewport(){
const e=window.visualViewport,t=e?Math.max(0,window.innerHeight-e.height-e.offsetTop):0
;document.documentElement.style.setProperty("--keyboard-offset",Math.round(t)+"px"),syncBottomBar()}function trapModalFocus(e,t){if("Tab"!==e.key||!t||t.hidden)return
;const o=Array.from(t.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(e=>!e.hidden&&e.getClientRects().length)
;if(!o.length)return;const n=o[0],a=o[o.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),
a.focus()):e.shiftKey||document.activeElement!==a||(e.preventDefault(),n.focus())}function setSaveBar(e){p.savebar.hidden=!e,
document.body.classList.toggle("has-savebar",!!e),syncBottomBar()}let D=null;function setPageAction(e){D=e?e.onClick:null,p.pageAction.hidden=!e,
e&&(p.pageAction.textContent=e.label)}function setChrome(e){p.viewTitle.textContent=e.title,
document.body.classList.toggle("is-homepage",!!e.homepage),
// The customer pages own their whole canvas the way the homepage does, so the
// app bar and page header step aside for them too.
document.body.classList.toggle("is-custpage",!!e.custpage),
document.body.classList.toggle("is-custeditpage",!!e.custedit),
// The order page owns its whole canvas too, and has no fixed document bar
// left to make room for.
document.body.classList.toggle("is-orderpage",!!e.orderpage),document.body.classList.toggle("is-moodboardpage",!!e.moodboardpage),
p.viewSub.innerHTML=e.sub||"",p.viewSub.hidden=!e.sub
;const t=e.up||null;p.upLink.hidden=!t,p.appbarBrand.hidden=!!t,t&&(p.upLink.href=t.hash,p.upLabel.textContent=t.label),
p.homeLink.hidden=!t||"#/customers"===t.hash,setPageAction(e.action||null),setSaveBar(!!e.save),closeMenu(),
// Delete belongs to a record, so the menu only offers it on a record page.
p.menuDelete.hidden=!e.destroy,p.menuDelete.className="menu__item menu__item--danger",
e.destroy&&(p.menuDelete.textContent="order"===e.destroy?"Delete order":"Delete customer",p.menuDelete.dataset.kind=e.destroy),syncBottomBar()}
function closeMenu(){p.menuList.hidden=!0,p.menuBtn.setAttribute("aria-expanded","false"),p.homeNavMenu&&p.homeNavMenu.setAttribute("aria-expanded","false")}

// One ink surface owns both the very first paint and every route handoff. It
// rises from below, the destination is committed while covered, then it drops
// away. Keeping this controller here means feature renderers never coordinate
// motion or know whether their data won the short covered loading budget.
const CURTAIN_TRANSITION_MS=520;let curtainCovered=!p.boot.hidden,curtainCoverPromise=null,routeLoaderShownAt=0;const wait=e=>new Promise(t=>setTimeout(t,e));
async function coverCurtain(){if(curtainCovered)return;if(curtainCoverPromise)return curtainCoverPromise;curtainCoverPromise=(async()=>{
document.body.classList.add("is-page-transitioning"),p.boot.hidden=!1,p.boot.classList.remove("is-animating"),p.boot.classList.add("is-below"),p.boot.offsetHeight;
if(!reducedMotion()){p.boot.classList.add("is-animating"),p.boot.classList.remove("is-below"),await wait(CURTAIN_TRANSITION_MS)}
else p.boot.classList.remove("is-below");curtainCovered=!0})(),await curtainCoverPromise,curtainCoverPromise=null}
async function revealCurtain(){if(!curtainCovered)return;if(!reducedMotion()){p.boot.classList.add("is-animating","is-below"),await wait(CURTAIN_TRANSITION_MS)}
p.boot.hidden=!0,p.boot.classList.remove("is-animating","is-below"),curtainCovered=!1,document.body.classList.remove("is-page-transitioning")}
const routeHasOwnLoader=e=>"customers"===e.view||"order"===e.view;
const routeLoaderKind=e=>"customer"===e.view||"customerEdit"===e.view?"ledger":"moodboard"===e.view||"moodboardPreview"===e.view?"moodboard":"form";
function beginRouteLoader(e){if(routeHasOwnLoader(e))return hideRouteLoader(!0);routeLoaderShownAt=Date.now(),p.routeLoader.dataset.kind=routeLoaderKind(e),
p.routeLoader.setAttribute("aria-busy","true"),p.routeLoader.classList.remove("is-leaving"),a(".route-loader__canvas",p.routeLoader).hidden=!1,p.routeLoaderError.hidden=!0,
p.routeLoaderStatus.textContent="Loading "+({customer:"customer",customerEdit:"customer editor",orderEdit:"order editor",moodboard:"moodboard",fittingNew:"fitting journal",fittingJournal:"fitting journal",calendar:"calendar settings",enquiry:"enquiry"}[e.view]||"page")+".",p.routeLoader.hidden=!1}
async function hideRouteLoader(e){if(p.routeLoader.hidden)return;if(e||curtainCovered)return p.routeLoader.hidden=!0,p.routeLoader.setAttribute("aria-busy","false"),p.routeLoader.classList.remove("is-leaving"),void(p.routeLoaderStatus.textContent="")
;await wait(Math.max(0,180-(Date.now()-routeLoaderShownAt))),p.routeLoader.classList.add("is-leaving"),await wait(reducedMotion()?0:180),
p.routeLoader.hidden=!0,p.routeLoader.setAttribute("aria-busy","false"),p.routeLoader.classList.remove("is-leaving"),p.routeLoaderStatus.textContent=""}
function showRouteError(t,e){console.error(t),p.routeLoader.dataset.kind=routeLoaderKind(e),p.routeLoader.hidden=!1,p.routeLoader.classList.remove("is-leaving"),
a(".route-loader__canvas",p.routeLoader).hidden=!0,p.routeLoaderError.hidden=!1,p.routeLoader.setAttribute("aria-busy","false"),p.routeLoaderStatus.textContent="",
p.routeLoaderError.innerHTML='<h2 class="route-loader__error-title">Could not open this page.</h2><p class="route-loader__error-copy">'+
KK.util.escapeHtml(t&&t.message||"Check your connection and try again.")+'</p><div class="route-loader__error-actions"><button type="button" class="btn btn--primary js-route-retry">Try again</button><a class="btn btn--outline" href="#/customers">Customers</a></div>'
;const o=a(".js-route-retry",p.routeLoaderError);o.addEventListener("click",()=>handleRoute(!0),{once:!0}),requestAnimationFrame(()=>o.focus({preventScroll:!0}))}
function focusRoute(e){const t="customers"===e.view?p.heroGreeting:"customer"===e.view?p.custHeroName:"customerEdit"===e.view?p.custEditTitle:"order"===e.view?p.orderTitle:"moodboard"===e.view?p.mbTitle:"moodboardPreview"===e.view?p.mbCanvasBack:p.viewTitle;t&&(t.setAttribute("tabindex","-1"),
t.focus({preventScroll:!0}),t.addEventListener("blur",()=>t.removeAttribute("tabindex"),{once:!0}))}

const badgeClass=e=>"badge badge--"+(e=>String(e).toLowerCase().replace(/\s+/g,"-"))(e)
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
showToast(e.message||"Could not update the customer")}}// Reachable from the editor's foot and, on the pages that still have an app
// bar, from the overflow menu. Both land here.
async function deleteCustomerRecord(){const o=w.customer;if(!o||!o.id)return;const n=o.name||"this customer"
;if(window.confirm("Delete "+n+", along with every order and download record? This cannot be undone."))try{await t.deleteCustomer(o.id),
setDirty(!1),showToast("Customer deleted"),go("#/customers")}catch(e){console.error(e),showToast(e.message||"Could not delete")}}
async function reopenCustomer(){const e=w.customer;if(e&&e.id&&e.cancelled_at)try{
w.customer=await t.updateCustomer(e.id,Object.assign({cancelled_at:null,cancelled_reason:null},consultNudgeFor(Object.assign({},e,{cancelled_at:null
}),openCustomerOrders()))),await pushFollowUp(),renderCustomerReadOnly(w.customer),showToast("Reopened")}catch(e){console.error(e),
showToast(e.message||"Could not reopen the customer")}}function go(e){location.hash===e?handleRoute():location.hash=e}function leaveFormFor(e){
k!==e?location.hash!==e?(history.replaceState(null,"",location.pathname+location.search+e),E=e,handleRoute()):handleRoute():history.back()}
function confirmLeave(){return!w.dirty||window.confirm("You have unsaved changes. Leave without saving?")}let E="",k="";async function handleRoute(x){const skipMotion=!0===x;
const s=function(){
const e=String(location.hash||"").replace(/^#\/?/,""),t=e.indexOf("?"),o=(-1===t?e:e.slice(0,t)).split("/").filter(Boolean),n=new URLSearchParams(-1===t?"":e.slice(t+1))
;return"customer"===o[0]&&o[1]&&"edit"===o[2]?{view:"customerEdit",id:o[1],query:n
}:"customer"===o[0]&&o[1]?{view:"customer",id:o[1],query:n}:"order"===o[0]&&o[1]&&"edit"===o[2]?{view:"orderEdit",id:o[1],query:n
}:"order"===o[0]&&o[1]&&"moodboard"===o[2]&&"preview"===o[3]?{view:"moodboardPreview",id:o[1],query:n}:"order"===o[0]&&o[1]&&"moodboard"===o[2]?{
view:"moodboard",id:o[1],query:n}:"order"===o[0]&&o[1]&&"fitting"===o[2]&&"new"===o[3]?{view:"fittingNew",id:o[1],query:n
}:"order"===o[0]&&o[1]&&"fitting"===o[2]&&o[3]?{view:"fittingJournal",id:o[1],sessionId:o[3],query:n
}:"order"===o[0]&&o[1]&&"fittings"===o[2]||"order"===o[0]&&o[1]?{view:"order",id:o[1],query:n}:"calendar"===o[0]?{view:"calendar",query:n
}:"enquiry"===o[0]&&o[1]?{view:"enquiry",id:o[1],query:n}:{view:"customers",query:n}}(),i=w.route;
// Guard the transition, and put the URL back if it is refused.
if(w.dirty&&E!==location.hash){
if(!confirmLeave())return void(location.hash=E);setDirty(!1)}location.hash!==E&&(k=E),E=location.hash
;const routeToken=++w.navigation.token;skipMotion||await coverCurtain();if(routeToken!==w.navigation.token)return
;const d=i&&("moodboard"===i.view||"moodboardPreview"===i.view),c="moodboard"===s.view||"moodboardPreview"===s.view
;i&&"moodboardPreview"===i.view&&"moodboardPreview"!==s.view&&closeMoodboardOverlay(),d&&!c&&(R.cleanup(),j=null),w.route=s,p.viewCustomers.hidden="customers"!==s.view,
p.viewCustomer.hidden="customer"!==s.view,p.viewCustomerEdit.hidden="customerEdit"!==s.view,p.viewOrder.hidden="order"!==s.view,p.viewOrderEdit.hidden="orderEdit"!==s.view,p.viewMoodboard.hidden=!c,
p.viewFittingJournal.hidden="fittingNew"!==s.view&&"fittingJournal"!==s.view,
p.fittingJournalBar.hidden="fittingJournal"!==s.view&&"fittingNew"!==s.view,
document.body.classList.toggle("has-fitting-journal-bar",!p.fittingJournalBar.hidden),p.viewCalendar.hidden="calendar"!==s.view,
p.viewEnquiry.hidden="enquiry"!==s.view,
!i||"fittingNew"!==i.view&&"fittingJournal"!==i.view||s.view===i.view&&s.id===i.id&&s.sessionId===i.sessionId||KK.fittings.closeAll(),syncBottomBar(),
window.scrollTo(0,0),beginRouteLoader(s);const render=async()=>{"customers"===s.view?await showCustomers():"customer"===s.view?await showCustomerDetail(s.id):"customerEdit"===s.view?await showCustomerEdit(s.id,s.query):"orderEdit"===s.view?await async function(o){w.order=await t.getOrder(o),
w.customer=await t.getCustomer(w.order.customer_id),setChrome({title:"Edit order",up:{label:orderLabel(w.order),hash:"#/order/"+o},save:!0,
destroy:"order"}),p.oTitle.value=w.order.title||"",p.oDocName.value=w.order.doc_name||"",p.oFirstPayment.value=w.order.first_payment_date||"",
p.oSecondPayment.value=w.order.second_payment_date||"",p.oFinalPayment.value=w.order.final_payment_date||"",
p.oScheme.value="other"===w.order.payment_scheme?"other":"standard",buildTerms(w.order),syncSchemeCard(),renderScheduleHint(),p.itemList.innerHTML=""
;((w.order.items||[]).length?w.order.items:[{name:"",qty:1,price:"",cost:""}]).forEach(e=>addItemRow(e,!1)),function(t){
const o=t||[],isTicked=e=>o.some(t=>t.toLowerCase()===e.toLowerCase()),n=o.filter(e=>!r.some(t=>t.toLowerCase()===e.toLowerCase()))
;p.includesList.innerHTML=r.map(t=>function(t,o){
return'<label class="chip'+(o?" is-checked":"")+'" data-label="'+e.escapeHtml(t)+'"><input type="checkbox"'+(o?" checked":"")+'><span class="chip__box">'+h+"</span><span>"+e.escapeHtml(t)+"</span></label>"
}(t,isTicked(t))).join("")+n.map(e=>customChip(e,!0)).join("")}(w.order.includes||[]),p.customInclude.value="",refreshItemTotals(),setDirty(!1)
}(s.id):"moodboard"===s.view?await async function(e){w.order=await t.getOrder(e),
[w.customer,w.customerOrders]=await Promise.all([t.getCustomer(w.order.customer_id),t.listOrders(w.order.customer_id)]),setChrome({title:"Create moodboard",
save:!1,moodboardpage:!0}),setSaveBar(!1),closeMoodboardOverlay(),p.mbBackBtn.href="#/order/"+e,
p.mbBackLabel.textContent=orderLabel(w.order),p.mbBackBtn.setAttribute("aria-label","Back to "+orderLabel(w.order)),
j===e&&R.images.length||(R.init({orderId:w.order.id,customerId:w.customer.id,customerName:w.customer.name,docName:w.order.doc_name||w.customer.name,
orderRef:w.order.title||""}),j=e);p.mbCanvas.hidden=!0,p.mbEditor.hidden=!1}(s.id):"moodboardPreview"===s.view?await async function(e){
// The generated canvas is only reachable with a live browser-local session;
// a reload lands back on image selection rather than on an empty board.
if(!R.images.length||j!==e)return void go("#/order/"+e+"/moodboard");setChrome({title:"Moodboard",
save:!1,moodboardpage:!0}),setSaveBar(!1),closeMoodboardOverlay(),p.mbEditor.hidden=!0,p.mbCanvas.hidden=!1,
p.mbCanvasBack.href="#/order/"+e+"/moodboard",resetMoodboardExports(),
requestAnimationFrame(()=>syncMoodboardCanvas())}(s.id):"fittingNew"===s.view?await async function(e){w.order=await t.getOrder(e),w.customer=await t.getCustomer(w.order.customer_id),setChrome({
title:"New fitting",up:{label:orderLabel(w.order),hash:"#/order/"+e},save:!1}),p.fittingJournalBar.hidden=!0,
document.body.classList.remove("has-fitting-journal-bar"),syncBottomBar()
;const o=await Promise.all([t.listOrderEvents(e),t.listFittingSessions(e)]),a=o[1].find(e=>"active"===e.status)
;if(a)return void go("#/order/"+e+"/fitting/"+a.id);const s=o[0].filter(e=>n.isProductionStage(e.stage)),r=s.length?s:n.PRODUCTION_STAGES.map(e=>({
stage:e})),begin=async o=>{try{const n=await t.createFittingSession({order_id:e,stage:o,status:"active"});setChrome({title:o,up:{
label:orderLabel(w.order),hash:"#/order/"+e},action:{label:"Done",onClick:()=>KK.fittings.endSession(n,()=>go("#/order/"+e))},save:!1}),
p.fittingJournalBar.hidden=!1,document.body.classList.add("has-fitting-journal-bar"),syncBottomBar(),KK.fittings.renderJournal(p.fittingJournal,{
order:w.order,customer:w.customer,session:n,photos:[],onToast:showToast}),KK.fittings.startSession(n,{order:w.order,customer:w.customer,photos:[]
},showToast)}catch(e){showToast(e.message||"Could not start fitting session")}},i=KK.fittings.detectStage(s)
;i?await begin(i):KK.fittings.showStagePicker(r,begin,()=>go("#/order/"+e))}(s.id):"fittingJournal"===s.view?await async function(e,o){
w.order=await t.getOrder(e),w.customer=await t.getCustomer(w.order.customer_id)
;const n=await Promise.all([t.getFittingSession(o),t.listFittingPhotos(e)]),a=n[0],s=n[1].filter(e=>e.session_id===a.id);setChrome({title:a.stage,up:{
label:orderLabel(w.order),hash:"#/order/"+e},action:"active"===a.status?{label:"Done",onClick:()=>KK.fittings.endSession(a,()=>go("#/order/"+e))
}:null,save:!1
}),p.fittingJournalBar.hidden="active"!==a.status,document.body.classList.toggle("has-fitting-journal-bar",!p.fittingJournalBar.hidden),
syncBottomBar(),KK.fittings.renderJournal(p.fittingJournal,{order:w.order,customer:w.customer,session:a,photos:s,onToast:showToast})
}(s.id,s.sessionId):"calendar"===s.view?await showCalendarSettings():"enquiry"===s.view?await async function(o){setChrome({title:"Enquiry",up:{
label:"Customers",hash:"#/customers"},save:!1}),w.enquiry=await t.getIntake(o);const n=w.enquiry
;p.enquiryWhen.textContent=e.formatShortDate(n.created_at),p.enquiryAnswers.innerHTML=function(e){
const t=e.payload&&e.payload.data&&e.payload.data.fields||[],o=t.map(e=>({label:String(e.label||"Answer"),value:readableAnswer(e)
})).filter(e=>e.value);return o.length?o:[{label:"Name",value:e.name||""},{label:"Phone",value:e.phone||""},{label:"Instagram",value:e.instagram||""
},{label:"Source",value:e.source||""},{label:"Notes",value:e.notes||""}].filter(e=>e.value)
}(n).map(t=>'<div class="infolist__stack"><dt>'+e.escapeHtml(t.label)+"</dt><dd>"+e.escapeHtml(t.value)+"</dd></div>").join("")||'<div class="infolist__stack"><dt>Answers</dt><dd>Nothing readable in this submission.</dd></div>'
;const a="new"!==n.status
;p.enquiryNote.textContent=a?"accepted"===n.status?"Already accepted.":"Dismissed.":"Creating the customer files them at Enquiry, with a reminder to book the consultation in two days. Dismissing keeps the submission but creates nothing.",
p.enquiryAccept.hidden=a,p.enquiryDismiss.hidden=a}(s.id):await showOrderDetail(s.id)};const load=(async()=>{try{
await render()}catch(e){if(!t.isStaleToken(e))throw e;console.warn("Stale token, refreshing and retrying:",e.message),await t.refreshSession(),await render()}})(),
settled=load.then(()=>({ok:!0}),e=>({ok:!1,error:e}));let early=null;if(!skipMotion){early=await Promise.race([settled,wait(400).then(()=>null)])
;if(routeToken!==w.navigation.token)return;if(early&&early.ok)await hideRouteLoader(!0);else early&&!early.ok&&!routeHasOwnLoader(s)&&showRouteError(early.error,s)
;await revealCurtain()}const result=early||await settled;if(routeToken!==w.navigation.token)return;if(result.ok)await hideRouteLoader(!1),focusRoute(s)
;else routeHasOwnLoader(s)?showToast(result.error&&result.error.message||"Could not load that"):showRouteError(result.error,s)}
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
function clearHomepagePresses(){document.querySelectorAll(".is-pressed").forEach(e=>e.classList.remove("is-pressed"))}
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
async function showCustomers(o){setChrome({title:"Customers",up:null,save:!1,homepage:!0}),w.customer=null,w.order=null,
o||w.homepage.visit++;const n=beginHomepageLoad();try{const[o,a,s,r]=await Promise.all([t.listCustomers(),t.listAllOrders(),t.listAllOrderEvents(),t.listIntake("new")])
;if(!isCurrentHomepageLoad(n))return;w.customers=o,w.overview=homepageOverview(a,s),
renderHomepageReady({customers:o,submissions:r}),prepareShortcutAppearState(),await revealHomepage(n)}catch(e){
if(t.isStaleToken(e))throw e;console.error(e),renderHomepageError(e,n)}}

// A short vibration on shortcut press, best-effort since most desktop
// browsers and iOS Safari have no navigator.vibrate.
function hapticTap(){try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}}
// Pointer and keyboard press feedback. The shortcuts and the alert are
// deliberately inert, so they get the visual state and nothing else.
p.viewCustomers.addEventListener("pointerdown",e=>{const t=e.target.closest(".home-action,.home-alert,.home-customer-card,.home-nav-btn");t&&(t.classList.add("is-pressed"),t.matches(".home-action")&&hapticTap())}),
["pointerup","pointercancel","pointerleave","blur"].forEach(e=>window.addEventListener(e,clearHomepagePresses,!0)),
// Touch scrolling must not leave a card stuck in its pressed state.
window.addEventListener("scroll",()=>{"ready"===w.homepage.phase&&clearHomepagePresses()},{passive:!0}),
p.viewCustomers.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return;const t=e.target.closest(".home-action,.home-alert,.home-customer-card,.home-nav-btn")
;t&&(t.classList.add("is-pressed"),t.matches(".home-action")&&hapticTap(),t.matches(".home-action,.home-alert,.home-nav-btn")&&e.preventDefault())}),
window.addEventListener("keyup",clearHomepagePresses),
p.homeReady.addEventListener("click",e=>{e.target.closest(".home-action,.home-alert")&&e.preventDefault()}),
// The customer detail page presses like the homepage — the same window-level
// listeners above release it, so only the press itself is registered here.
p.viewCustomer.addEventListener("pointerdown",e=>{const t=e.target.closest(".cust-banner,.cust-nav-btn,.cust-order-card")
;t&&t.classList.add("is-pressed")}),
p.viewCustomer.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return
;const t=e.target.closest(".cust-banner,.cust-nav-btn,.cust-order-card");t&&(t.classList.add("is-pressed"),t.matches(".cust-banner")&&e.preventDefault())}),
window.addEventListener("scroll",()=>{(document.body.classList.contains("is-custpage")||document.body.classList.contains("is-custeditpage")||document.body.classList.contains("is-orderpage")||document.body.classList.contains("is-moodboardpage"))&&clearHomepagePresses()},{passive:!0}),
// The banners are tactile but do not lead anywhere yet.
p.viewCustomer.addEventListener("click",e=>{e.target.closest(".cust-banner")&&e.preventDefault()}),
// The order page presses like the rest of the app: pointer and keyboard add
// the state, the window listeners above take it away. History and the schedule
// records are tactile but inert, so Space must not scroll the page under them.
p.viewOrder.addEventListener("pointerdown",e=>{const t=e.target.closest(".order-nav-btn,.order-action,.order-schedule-record,.order-choice")
;t&&!t.disabled&&t.classList.add("is-pressed")}),
p.viewOrder.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return
;const t=e.target.closest(".order-nav-btn,.order-action,.order-schedule-record,.order-choice")
;t&&!t.disabled&&(t.classList.add("is-pressed")," "===e.key&&t.matches("#orderHistoryBtn,.order-schedule-record")&&e.preventDefault())}),
p.viewOrder.addEventListener("click",e=>{e.target.closest("#orderHistoryBtn,#uploadDesignBtn,.order-schedule-record")&&e.preventDefault(),
e.target.closest(".js-order-schedule-retry")&&retryOrderSchedule()}),
// The editor presses the same way. Fields press on focus rather than on touch,
// so only the nav, the status rows and the segmented cells are wired here.
p.viewCustomerEdit.addEventListener("pointerdown",e=>{
const t=e.target.closest(".cust-banner,.cust-nav-btn,.custedit-segmented__btn,.custedit-danger__btn");t&&t.classList.add("is-pressed")}),
p.viewCustomerEdit.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return
;const t=e.target.closest(".cust-banner,.cust-nav-btn,.custedit-segmented__btn,.custedit-danger__btn");t&&t.classList.add("is-pressed")}),
p.saveBtn.addEventListener("pointerdown",()=>{document.body.classList.contains("is-custeditpage")&&p.saveBtn.classList.add("is-pressed")});function readableAnswer(e){const t=e&&e.value
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
;return void(p.customerList.innerHTML=w.customers.length?'<p class="empty">No match for “'+e.escapeHtml(t)+'”.</p><a class="btn btn--outline btn--new btn--block btn--empty" href="#/customer/new/edit?name='+encodeURIComponent(t)+'">+ Add “'+e.escapeHtml(t)+"” as a new customer</a>":'<p class="empty">No customers yet.</p>')
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
phone:"",instagram:"",source:"",wedding_date:"",notes:""}
const daysUntil=t=>Math.round((new Date(t)-new Date(e.todayISO()))/864e5),isApproximateWedding=e=>!(!e||!e.wedding_date||"month"!==e.wedding_date_precision)
;function weddingText(t){
return t&&t.wedding_date?isApproximateWedding(t)?e.formatLongDate(t.wedding_date).replace(/^\d+\s/,"")+" (approximate)":e.formatShortDate(t.wedding_date):"Not set"
}
// Read-only customer page (#/customer/:id) — Figma 65:399.
async function showCustomerDetail(o){
// Nothing to read about a customer who does not exist yet, so creating one
// goes straight to the form, keeping any name the search already found.
if("new"===o){const e=String(location.hash||""),t=e.indexOf("?");return void go("#/customer/new/edit"+(-1===t?"":e.slice(t)))}
setChrome({title:"Customer",up:{label:"Customers",hash:"#/customers"},save:!1,custpage:!0}),w.order=null,w.schedule=null,w.loggedDeposits={},w.customerOrders=[],
p.custEditBtn.href="#/customer/"+encodeURIComponent(o)+"/edit",p.custOrderList.innerHTML=""
;const[n,a]=await Promise.all([t.getCustomer(o),t.listOrders(o)]);w.customer=n,w.customerOrders=a,fillCustomerForm(n),setDirty(!1),
renderCustomerDetail(n,a),renderCustomerReadOnly(n)}
// Editor (#/customer/:id/edit, and #/customer/new/edit for a new record).
// Cancel lives in the nav row and delete at the foot of the page, so neither
// needs the app bar the retro canvas hides.
async function showCustomerEdit(o,n){const a="new"===o,s=a?"#/customers":"#/customer/"+encodeURIComponent(o)
;setChrome({title:a?"New customer":"Edit customer",up:{label:a?"Customers":"Customer",hash:s},save:!0,custedit:!0}),
w.order=null,w.schedule=null,w.loggedDeposits={},w.customerOrders=[],p.custEditCancel.href=s,p.custEditTitle.textContent=a?"New customer":"Edit customer"
;
// Arrived from a search that found nothing: the name is already known.
if(a){const e=String(n&&n.get("name")||"").trim();return w.customer=Object.assign({},M),e&&(w.customer.name=e),fillCustomerForm(w.customer),
setDirty(!!e),p.viewSub.hidden=!0,p.cancelCustomer.hidden=!0,p.reopenCustomer.hidden=!0,p.deleteCustomerRow.hidden=!0,
void(e?p.cPhone:p.cName).focus()}
const[r,i]=await Promise.all([t.getCustomer(o),t.listOrders(o)]);w.customer=r,w.customerOrders=i,fillCustomerForm(r),setDirty(!1),
renderCustomerReadOnly(r)}
// The three things about a customer that are decided rather than typed. They
// are read off what already exists, so they can only ever be shown or hidden.
function renderCustomerReadOnly(t){const o=openCustomerOrders(),n=customerStatus(t,o)
;p.viewSub.innerHTML='<span class="'+badgeClass(n)+'">'+e.escapeHtml(n)+"</span>",p.viewSub.hidden=!1,
p.cancelCustomer.hidden=!canCancel(t,o),p.reopenCustomer.hidden=!t.cancelled_at,p.deleteCustomerRow.hidden=!t.id}
// The next thing in the diary: a booked appointment, the follow-up, or, when
// nothing else is left, the wedding. Computed from the orders on the page, so
// it is right whether you arrived from the homepage or from a bookmark.
function custNextEvent(t,o){const a=e.todayISO(),s=[]
;return t.follow_up_date&&s.push({date:t.follow_up_date,what:t.follow_up_label||"Follow up"}),(o||[]).forEach(e=>{const o=productionAnchor(e)
;o&&n.computeProduction(o,t.wedding_date).events.forEach(e=>s.push({date:e.event_date,what:e.stage}))}),
t.wedding_date&&s.push({date:t.wedding_date,what:"Wedding"}),s.filter(e=>e.date>=a).sort((e,t)=>e.date<t.date?-1:1)[0]||null}
// Order statuses share the homepage's vocabulary and colours, so the same order
// never has two names depending on which page you opened it from.
function custOrderStatus(e){const t=effectiveStatus(e);return"In production"===t?{label:"In production",tone:"production"
}:"Confirmed"===t?{label:"Invoice sent",tone:"invoice"}:"Quoted"===t?{label:"Quote sent",tone:"invoice"}:{label:"Finished",tone:"quiet"}}
function renderCustomerDetail(t,n){const a=n||[]
;p.custHeroName.textContent=t.name||"Unnamed customer",
p.custWeddingText.textContent=t.wedding_date?(isApproximateWedding(t)?weddingText(t):e.formatShortDate(t.wedding_date))+" ("+relativeToToday(t.wedding_date)+")":"Not set"
;const s=custNextEvent(t,a);p.custNextLabel.textContent=s?"Next: "+s.what:"Next event",
p.custNextDate.textContent=s?e.formatShortDate(s.date)+" ("+relativeToToday(s.date)+")":"Nothing scheduled",
p.custOrdersCount.textContent=a.length+" order"+(1===a.length?"":"s"),
p.custOrdersSum.textContent=e.formatRupiah(a.reduce((e,t)=>e+o.computeTotal(t.items),0)),
p.custOrderList.innerHTML=a.length?a.map(t=>{const n=custOrderStatus(t),a=(t.items||[]).length
;return'<div class="cust-grid-spacer" aria-hidden="true"></div><div class="cust-grid-rule"></div><div class="cust-order-record__inset"><a class="cust-order-card cust-order-card--'+n.tone+'" href="#/order/'+encodeURIComponent(t.id)+'" aria-label="'+e.escapeHtml(orderLabel(t)+", "+n.label)+'"><span class="cust-order-card__face"><span class="cust-order-card__top"><span class="cust-order-card__name">'+e.escapeHtml(orderLabel(t))+'</span><span class="cust-order-card__badge">'+e.escapeHtml(n.label)+'</span></span><span class="cust-order-card__meta"><span>'+a+" item"+(1===a?"":"s")+"</span><span>"+e.formatRupiah(o.computeTotal(t.items))+'</span></span></span><span class="cust-order-card__rail" aria-hidden="true"></span></a></div><div class="cust-grid-rule"></div>'
}).join("")+'<div class="cust-grid-spacer" aria-hidden="true"></div>':'<div class="cust-grid-spacer" aria-hidden="true"></div><p class="empty">No orders for this customer yet.</p><div class="cust-grid-spacer" aria-hidden="true"></div>'}
function relativeToToday(e){const t=daysUntil(e);if(t>=0)return relativeDays(t);const o=Math.abs(t);return o+(1===o?" day":" days")+" ago"}
function fillCustomerForm(e){p.cName.value=e.name||"",p.cPhone.value=e.phone||"",p.cInstagram.value=e.instagram||"",p.cSource.value=e.source||"",
p.cNotes.value=e.notes||"",p.cWedding.value=e.wedding_date||"",p.cWeddingMonth.value=(e.wedding_date||"").slice(0,7),
setWeddingPrecision("month"===e.wedding_date_precision?"month":"day"),p.cMoodboardDate.value=e.moodboard_date||"",
p.cFollowUpDate.value=e.follow_up_date||"",p.cFollowUpLabel.value=e.follow_up_label||"",p.cCancelledReason.value=e.cancelled_reason||"",
p.cCancelledField.hidden=!e.cancelled_at,setNameError(!1)}
// The label, the value and the rail under the field all carry the error, so
// it is legible both in the field and from a scroll past it.
function setNameError(e){const t=p.cName.closest(".custedit-card")
;p.cName.classList.toggle("is-invalid",e),t&&t.classList.toggle("is-invalid",e),p.cName.setAttribute("aria-invalid",String(!!e)),
p.errCName.hidden=!e}function setWeddingPrecision(e){
const t="month"===e;p.cWedding.hidden=t,p.cWeddingMonth.hidden=!t,s(".custedit-segmented__btn",p.cWeddingPrecision).forEach(e=>{
const o="month"===e.dataset.precision===t;e.classList.toggle("is-on",o),e.setAttribute("aria-pressed",String(o))})}
const weddingPrecision=()=>p.cWeddingMonth.hidden?"day":"month";function lastDayOfMonth(e){const t=/^(\d{4})-(\d{2})$/.exec(String(e||""))
;if(!t)return null;const o=new Date(Date.UTC(Number(t[1]),Number(t[2]),0));return n.fromDay(Math.round(o.getTime()/864e5))}
async function saveCustomer(){if(""===p.cName.value.trim())return setNameError(!0),
// Scrolled past it on a long form, the field has to come back into view.
p.cName.scrollIntoView({block:"center",behavior:"smooth"}),p.cName.focus({preventScroll:!0}),showToast("Add the customer name to save"),!1
;const o=function(){const e="month"===weddingPrecision();return{name:p.cName.value.trim(),phone:orNull(p.cPhone.value),
instagram:orNull(p.cInstagram.value),source:orNull(p.cSource.value),wedding_date:e?lastDayOfMonth(p.cWeddingMonth.value):orNull(p.cWedding.value),
wedding_date_precision:e?"month":"day",moodboard_date:orNull(p.cMoodboardDate.value),follow_up_date:orNull(p.cFollowUpDate.value),
follow_up_label:orNull(p.cFollowUpLabel.value),cancelled_reason:orNull(p.cCancelledReason.value),notes:orNull(p.cNotes.value)}}();if(w.customer.id){
const e=w.customer;w.customer=await t.updateCustomer(w.customer.id,o),setDirty(!1),e.wedding_date!==w.customer.wedding_date&&await async function(){
try{const e=await t.listOrders(w.customer.id);for(const o of e){if(!productionAnchor(o))continue;const e=await rescheduleOrder(o,w.customer)
;e.changed&&await t.logOrderHistory(o.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped})}}catch(e){console.error(e),
showToast("Saved, but the fitting schedules could not be rebuilt")}
}(),e.moodboard_date!==w.customer.moodboard_date?await setFollowUp(consultNudgeFor(w.customer,openCustomerOrders())):e.follow_up_date===w.customer.follow_up_date&&e.follow_up_label===w.customer.follow_up_label||await pushFollowUp(),
renderCustomerReadOnly(w.customer),showToast("Customer saved"),leaveFormFor("#/customer/"+w.customer.id)
}else w.customer=await t.createCustomer(Object.assign(o,o.follow_up_date?{}:followUpPatch(c,e.todayISO()))),setDirty(!1),
showToast("Customer created"),leaveFormFor("#/customer/"+w.customer.id);return!0}const scheduleFor=(e,t,o)=>n.computeSchedule(designAnchor(e),productionAnchor(e),t&&t.wedding_date,n.pinsFrom(o));// --------------------------- Order detail -------------------------------
// Figma 81:726. The page is three fixed-geometry layers — skeleton, error,
// ready — that only ever swap opacity, one normalised view model built before
// anything is written to the DOM, and a load token so a slow response for one
// order can never paint over another.
function isCurrentOrderLoad(t,o){return t===w.orderDetail.loadToken&&!!w.route&&"order"===w.route.view&&w.route.id===o}
function clearOrderPresses(){p.viewOrder.querySelectorAll(".is-pressed").forEach(e=>e.classList.remove("is-pressed"))}
function closeOrderPaymentChooser(){p.paymentChooser.classList.remove("is-open"),p.paymentChooser.hidden=!0,
p.logPaymentBtn.setAttribute("aria-expanded","false")}
function beginOrderLoad(e){const t=++w.orderDetail.loadToken;return w.orderDetail.phase="loading",w.orderDetail.orderId=e,w.orderDetail.vm=null,
w.orderDetail.sectionErrors={},w.orderDetail.paymentBusy=!1,w.orderDetail.documentBusy=null,clearOrderPresses(),closeOrderPaymentChooser(),
p.paymentError.hidden=!0,p.orderStage.setAttribute("aria-busy","true"),p.orderStage.style.height="",
p.orderLoadingStatus.textContent="Loading order details.",p.orderLoading.hidden=!1,
p.orderLoading.classList.remove("is-transitioning","is-hidden"),p.orderError.hidden=!0,p.orderError.innerHTML="",p.orderReady.hidden=!0,
p.orderReady.classList.remove("is-transitioning","is-visible","is-measuring"),t}

// The four failures worth their own sentence. Anything else keeps the server's
// message behind a generic lead rather than inventing a cause.
function orderErrorCopy(e){return e&&("PGRST116"===e.code||/0 rows/i.test(e.message||""))?"This order no longer exists.":e instanceof TypeError?"Could not load this order. Check your connection and try again.":t.isStaleToken(e)?"Your session expired. Unlock the app and try again.":e&&e.message?"Could not load this order. "+e.message:"Could not load this order. Try again in a moment."}
function renderOrderError(t,o,n,a){if(!isCurrentOrderLoad(o,n))return;console.error(t),w.orderDetail.phase="error",p.orderLoading.hidden=!0,
p.orderLoading.classList.remove("is-transitioning","is-hidden"),p.orderReady.hidden=!0,p.orderStage.style.height="",
p.orderStage.setAttribute("aria-busy","false"),p.orderLoadingStatus.textContent="",p.orderError.hidden=!1,
p.orderError.innerHTML='<div class="order-error-panel"><p class="order-error-panel__title">Could not open this order.</p><p class="order-error-panel__hint">'+e.escapeHtml(orderErrorCopy(t))+'</p><div class="order-error-panel__actions"><button type="button" class="order-error__btn js-order-retry">Try again</button><a class="order-error__btn order-error__btn--quiet" href="'+(a?"#/customer/"+encodeURIComponent(a):"#/customers")+'">'+(a?"Back to customer":"Back to customers")+"</a></div></div>"
;const s=p.orderError.querySelector(".js-order-retry");s.addEventListener("click",()=>{showOrderDetail(n)}),
requestAnimationFrame(()=>s.focus({preventScroll:!0}))}

const orderFirstName=e=>{const t=String(e||"").trim().split(/\s+/)[0]||"";return t?"("+t+")":"Back"}
// Date-only arithmetic, so a clock at either end of the day cannot move a
// fitting a day either way.
;function relativeDateLabel(e,t){const o=n.daysBetween(t,e)
;return null===o?"":0===o?"today":1===o?"tomorrow":-1===o?"yesterday":o>0?"in "+o+" days":-o+" days ago"}
// The year is noise on a date this year and information on any other.
function orderDateLabel(t){const o=e.formatShortDate(t);return o?String(t).slice(0,4)===e.todayISO().slice(0,4)?o.replace(/\s\d{4}$/,""):o:""}
function pushInto(e,t,o){const n=e.get(t)||[];n.push(o),e.set(t,n)}
function deriveLoggedDeposits(e){const t={};return(e||[]).forEach(e=>{if("payment_logged"!==e.action)return
;const o=e.detail&&e.detail.deposit_index;null!=o&&(t[o]=e.created_at)}),t}

// Only the production stages are drawn here: they are the ones this card is
// about. The design block still exists in the schedule underneath.
function orderScheduleModel(t){const o=(t.events||[]).filter(e=>n.isProductionStage(e.stage)).slice().sort((e,t)=>n.stageOrder(e.stage)-n.stageOrder(t.stage)),a=new Map,s=new Map,r=new Map,i=e.todayISO()
;(t.sessions||[]).forEach(e=>{a.set(e.id,e.stage),pushInto(s,e.stage,e)}),(t.photos||[]).forEach(e=>{
const t=e.session_id&&a.get(e.session_id)||e.stage;t&&pushInto(r,t,e)});const d=o.map(e=>{const t=s.get(e.stage)||[],o=r.get(e.stage)||[]
;return{stage:e.stage,dateLabel:orderDateLabel(e.event_date),relativeLabel:relativeDateLabel(e.event_date,i),
completed:t.some(e=>"completed"===e.status),photoCount:o.length,
thumbnails:o.slice(0,3).map(e=>KK.fittings.imageURL(e,100)).filter(Boolean)}}),c=scheduleFor(t.order,t.customer,t.events||[])
;return{records:d,message:d.length?"":c.production.reason||c.reason||"No fittings scheduled yet.",
warning:d.length&&isApproximateWedding(t.customer)?"These dates are estimates until the exact wedding date is confirmed.":""}}

// Every calculation, every format and every escape decision happens here, so
// the render below is a synchronous write of already-final strings.
function buildOrderDetailViewModel(t){const n=t.order,a=t.customer,s=n.items||[],r=s.filter(isNamed),i=o.computeTotal(s),d=r.filter(isCosted),c=d.reduce((e,t)=>e+((Number(t.price)||0)-(Number(t.cost)||0))*(Number(t.qty)||0),0),l=String(n.doc_name||a&&a.name||"").trim(),u=r.length>0&&i>0,m=o.termsFor(n),h=o.termAmounts(i,m),g=t.loggedDeposits||{}
;return{order:n,customer:a,title:orderLabel(n),backHref:"#/customer/"+encodeURIComponent(n.customer_id),backLabel:orderFirstName(a&&a.name),
editHref:"#/order/"+encodeURIComponent(n.id)+"/edit",items:r.map(t=>({name:String(t.name),qtyLabel:String(Number(t.qty)||0),
priceLabel:e.formatRupiah(t.price)})),total:i,totalLabel:e.formatRupiah(i),profit:{value:c,
label:d.length?e.formatRupiah(c):"—",
caveat:d.length?d.length<r.length?"Based on "+d.length+" of "+r.length+" costed items.":"":r.length?"No production costs filled in yet.":""},
documents:{canDownload:u&&""!==l,
disabledReason:u?""!==l?"":"Add the name for documents to enable downloads.":"Add a priced item to enable downloads."},
paymentsPriced:i>0,paymentsUnknown:!!t.paymentsUnknown,payments:m.map((t,o)=>({index:o,label:t.label,amount:h[o],
amountLabel:e.formatRupiah(h[o]),paidAt:g[o]||null,paidDateLabel:g[o]?"Paid "+orderDateLabel(g[o]):""})),schedule:orderScheduleModel(t)}}

function renderOrderItems(t){
const o=t.items.map(t=>'<div class="order-items__row"><span class="order-items__name" title="'+e.escapeHtml(t.name)+'">'+e.escapeHtml(t.name)+'</span><span class="order-items__qty">'+e.escapeHtml(t.qtyLabel)+'</span><span class="order-items__price">'+e.escapeHtml(t.priceLabel)+"</span></div>").join(""),n=t.profit.caveat
;p.oItemsDisplay.innerHTML='<div class="order-items__row order-items__row--head"><span class="order-items__name">Name</span><span class="order-items__qty">Qty</span><span class="order-items__price">Price</span></div>'+(o||'<p class="order-items__empty">No items yet. Tap edit to add one.</p>')+'<div class="order-items__rule" aria-hidden="true"></div><div class="order-items__totals"><div class="order-items__row order-items__row--total"><span class="order-items__name">Total</span><span class="order-items__price">'+e.escapeHtml(t.totalLabel)+'</span></div><div class="order-items__row order-items__row--profit"><span class="order-items__name">Est. profit</span><span class="order-items__price"'+(n?' title="'+e.escapeHtml(n)+'"':"")+">"+e.escapeHtml(t.profit.label)+"</span></div>"+(n?'<p class="sr-only">'+e.escapeHtml(n)+"</p>":"")+"</div>"}

// Downloads need a priced item and a name to address the document to. The
// buttons stay where they are and say why instead of disappearing.
function renderOrderDocumentState(e){const t=e.documents.canDownload&&!w.orderDetail.documentBusy
;p.downloadQuote.disabled=!t,p.downloadInvoice.disabled=!t,p.downloadNote.textContent=e.documents.disabledReason,
p.createMoodboardBtn.disabled=!w.order}

function renderOrderPayments(t){if(p.paymentError.hidden=!p.paymentError.textContent,!t.paymentsPriced)return p.paymentSummary.innerHTML='<p class="order-items__empty">Price the items to work out the payment terms.</p>',
p.logPaymentBtn.disabled=!0,a(".order-action__label",p.logPaymentBtn).textContent="Log a payment",void closeOrderPaymentChooser()
;p.paymentSummary.innerHTML=t.payments.map((o,n)=>(n?'<div class="order-payments__rule" aria-hidden="true"></div>':"")+'<div class="order-payment"><span class="order-payment__main"><span class="order-payment__head"><span class="order-payment__label">'+e.escapeHtml(o.label)+"</span>"+(o.paidAt?'<img class="order-payment__tick" src="assets/order-tick-icon.svg" alt="" width="16" height="16">':"")+"</span>"+(o.paidAt?'<span class="order-payment__when">'+e.escapeHtml(o.paidDateLabel)+"</span>":'<span class="sr-only">'+(t.paymentsUnknown?"Payment status unavailable":"Outstanding")+"</span>")+'</span><span class="order-payment__amount">'+e.escapeHtml(o.amountLabel)+"</span></div>").join("")
;const o=t.payments.filter(e=>!e.paidAt).length
// A finished order keeps the button rather than losing a row's height when
// the last payment lands.
;p.logPaymentBtn.disabled=w.orderDetail.paymentBusy||!o||t.paymentsUnknown,
a(".order-action__label",p.logPaymentBtn).textContent=w.orderDetail.paymentBusy?"Logging…":o?"Log a payment":"All payments logged",
o&&!t.paymentsUnknown||closeOrderPaymentChooser(),p.paymentChooser.hidden||renderOrderPaymentChoices(t)}

function renderOrderPaymentChoices(t){
p.paymentChooserOptions.innerHTML=t.payments.filter(e=>!e.paidAt).map(t=>'<button type="button" class="order-choice js-log-deposit" data-i="'+t.index+'"'+(w.orderDetail.paymentBusy?" disabled":"")+'><span class="order-choice__face"><span>'+e.escapeHtml(t.label)+"</span><span>"+e.escapeHtml(t.amountLabel)+'</span></span><span class="order-choice__rail" aria-hidden="true"></span></button>').join("")}

function renderOrderSchedule(t){if(w.orderDetail.sectionErrors.schedule)return void(p.scheduleList.innerHTML='<div class="order-schedule__record"><div class="order-schedule__message">Could not load the schedule.<br><button type="button" class="order-schedule__retry js-order-schedule-retry">Retry</button></div></div>')
;const o=t.schedule||{records:[],message:"",warning:""}
;if(!o.records.length)return void(p.scheduleList.innerHTML='<div class="order-schedule__record"><div class="order-schedule__message">'+e.escapeHtml(o.message||"No fittings scheduled yet.")+'</div></div><div class="order-schedule__spacer" aria-hidden="true"></div>')
;p.scheduleList.innerHTML=(o.warning?'<p class="order-schedule__warning">'+e.escapeHtml(o.warning)+"</p>":"")+o.records.map(t=>{
const o=t.dateLabel?t.dateLabel+(t.relativeLabel?" ("+t.relativeLabel+")":""):"",n=t.photoCount?t.photoCount+" photo"+(1===t.photoCount?"":"s")+" & notes logged":"",a=[t.stage,o,t.completed?"completed":"",n,"coming soon"].filter(Boolean).join(", ")
;return'<div class="order-schedule__record"><button type="button" class="order-schedule-record'+(t.photoCount?" order-schedule-record--photos":"")+'" aria-disabled="true" aria-label="'+e.escapeHtml(a)+'"><span class="order-schedule-record__face"><span class="order-schedule-record__head"><span class="order-schedule-record__stage">'+e.escapeHtml(t.stage)+(t.completed?'<img class="order-schedule-record__tick" src="assets/order-tick-icon.svg" alt="" width="16" height="16">':"")+"</span>"+(o?'<span class="order-schedule-record__date">'+e.escapeHtml(o)+"</span>":"")+"</span>"+(t.photoCount?'<span class="order-schedule-record__rule" aria-hidden="true"></span><span class="order-schedule-record__photos"><span class="order-schedule-record__thumbs">'+t.thumbnails.map(t=>'<img class="order-schedule-record__thumb" src="'+e.escapeHtml(t)+'" alt="" width="32" height="32" loading="lazy" onerror="this.style.visibility=\'hidden\'">').join("")+'</span><span class="order-schedule-record__count">'+e.escapeHtml(n)+"</span></span>":"")+'</span><span class="order-schedule-record__rail" aria-hidden="true"></span></button></div>'
}).join('<div class="order-schedule__spacer" aria-hidden="true"></div>')+'<div class="order-schedule__spacer" aria-hidden="true"></div>'}

function renderOrderReady(e){w.orderDetail.vm=e,p.orderBackBtn.href=e.backHref,p.orderBackLabel.textContent=e.backLabel,
p.orderBackBtn.setAttribute("aria-label","Back to "+(e.customer&&e.customer.name||"customer")),p.orderEditBtn.href=e.editHref,
p.orderTitle.textContent=e.title,renderOrderItems(e),renderOrderDocumentState(e),renderOrderPayments(e),renderOrderSchedule(e),
p.orderReady.hidden=!1,p.orderReady.classList.add("is-measuring")}

// The ready layer is measured under the skeleton, the stage is pinned to that
// height, and only then does the crossfade run — so nothing moves but opacity.
async function revealOrder(e){if(await(document.fonts&&document.fonts.ready||Promise.resolve()),await new Promise(e=>requestAnimationFrame(e)),
!isCurrentOrderLoad(e,w.orderDetail.orderId))return
;p.orderStage.style.height=Math.ceil(p.orderReady.getBoundingClientRect().height||p.orderReady.scrollHeight)+"px",
p.orderReady.classList.remove("is-measuring"),p.orderReady.classList.add("is-transitioning"),p.orderLoading.classList.add("is-transitioning"),
requestAnimationFrame(()=>{isCurrentOrderLoad(e,w.orderDetail.orderId)&&(p.orderReady.classList.add("is-visible"),
p.orderLoading.classList.add("is-hidden"))}),setTimeout(()=>{isCurrentOrderLoad(e,w.orderDetail.orderId)&&(p.orderLoading.hidden=!0,
p.orderLoading.classList.remove("is-transitioning","is-hidden"),p.orderReady.classList.remove("is-transitioning","is-visible"),
p.orderStage.style.height="",p.orderStage.setAttribute("aria-busy","false"),p.orderLoadingStatus.textContent="",w.orderDetail.phase="ready")
},reducedMotion()?0:180)}

// Order and customer are required — the title, both navigation targets and
// every business action are wrong without them. The schedule reads are not:
// losing them costs the Schedules card and nothing else.
async function showOrderDetail(o){setChrome({title:"Order",up:{label:"Customers",hash:"#/customers"},save:!1,destroy:"order",orderpage:!0}),
setDirty(!1);const n=beginOrderLoad(o);let a,s;try{if(a=await t.getOrder(o),!isCurrentOrderLoad(n,o))return
;s=await t.getCustomer(a.customer_id)}catch(e){if(t.isStaleToken(e))throw e;return void renderOrderError(e,n,o,a&&a.customer_id)}
if(!isCurrentOrderLoad(n,o))return;w.order=a,w.customer=s;let r=null,i=!1;try{r=await t.listOrderHistory(o)}catch(e){if(t.isStaleToken(e))throw e
;console.error(e),i=!0}if(!isCurrentOrderLoad(n,o))return;let d=[],c=[],l=[],u=!1
;try{const e=await Promise.all([t.listOrderEvents(o),t.listFittingSessions(o),t.listFittingPhotos(o)]);d=e[0],c=e[1],l=e[2]}catch(e){
if(t.isStaleToken(e))throw e;console.error(e),u=!0}if(!isCurrentOrderLoad(n,o))return
;w.loggedDeposits=deriveLoggedDeposits(r),w.schedule={computed:scheduleFor(a,s,d),rows:d},w.orderDetail.sectionErrors={schedule:u},
p.paymentError.textContent="",renderOrderReady(buildOrderDetailViewModel({order:a,customer:s,loggedDeposits:w.loggedDeposits,paymentsUnknown:i,
events:d,sessions:c,photos:l})),await revealOrder(n)}

// Local refreshes after a mutation. Neither one re-runs the skeleton: the page
// is already on screen and only one card's data has moved.
async function refreshOrderPayments(){const e=w.orderDetail.orderId;if(!e||!w.order||w.order.id!==e)return;let o=null,n=!1
;try{o=await t.listOrderHistory(e)}catch(e){console.error(e),n=!0}if(w.orderDetail.orderId!==e)return;w.loggedDeposits=deriveLoggedDeposits(o)
;const a=w.orderDetail.vm,s=buildOrderDetailViewModel({order:w.order,customer:w.customer,loggedDeposits:w.loggedDeposits,paymentsUnknown:n,
events:(w.schedule&&w.schedule.rows)||[],sessions:[],photos:[]});a&&(s.schedule=a.schedule),w.orderDetail.vm=s,renderOrderItems(s),
renderOrderDocumentState(s),renderOrderPayments(s)}
async function refreshOrderSchedule(){const e=w.orderDetail.orderId;if(!e||!w.order||w.order.id!==e)return
;try{const o=await Promise.all([t.listOrderEvents(e),t.listFittingSessions(e),t.listFittingPhotos(e)]);if(w.orderDetail.orderId!==e)return
;w.orderDetail.sectionErrors.schedule=!1,w.schedule={computed:scheduleFor(w.order,w.customer,o[0]),rows:o[0]}
;const n=orderScheduleModel({order:w.order,customer:w.customer,events:o[0],sessions:o[1],photos:o[2]})
;w.orderDetail.vm?(w.orderDetail.vm.schedule=n,renderOrderSchedule(w.orderDetail.vm)):renderOrderSchedule({schedule:n})}catch(e){console.error(e),
w.orderDetail.sectionErrors.schedule=!0,renderOrderSchedule(w.orderDetail.vm||{})}}
function retryOrderSchedule(){p.scheduleList.innerHTML='<div class="order-schedule__record"><div class="order-schedule__message">Loading the schedule…</div></div>',
w.orderDetail.sectionErrors.schedule=!1,refreshOrderSchedule()}

function toggleOrderPaymentChooser(){const e=w.orderDetail.vm;if(!e||p.logPaymentBtn.disabled)return
;if(!p.paymentChooser.hidden)return void closeOrderPaymentChooser();renderOrderPaymentChoices(e),p.paymentChooser.hidden=!1,
p.logPaymentBtn.setAttribute("aria-expanded","true"),requestAnimationFrame(()=>p.paymentChooser.classList.add("is-open"))}
function setOrderPaymentBusy(e){w.orderDetail.paymentBusy=e,p.logPaymentBtn.setAttribute("aria-busy",e?"true":"false")
;const t=w.orderDetail.vm;t&&(p.paymentChooser.hidden||renderOrderPaymentChoices(t),renderOrderPayments(t))}
function renderScheduleHint(){const t={payment_scheme:p.oScheme.value,first_payment_date:p.oFirstPayment.value,
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
changed:a.map(key).sort().join("|")!==i.map(key).sort().join("|"),rows:i}}const x=["https://www.googleapis.com/auth/calendar.events","https://www.googleapis.com/auth/drive.file"].join(" "),googleRedirectUri=()=>location.origin+location.pathname
;function connectGoogle(){const e=(window.KK_CONFIG||{}).GOOGLE_CLIENT_ID||"";if(!e)return p.gcalErr.hidden=!1,
void(p.gcalErr.textContent="No GOOGLE_CLIENT_ID in config.js — see “Google Calendar” in the README.");const t=new URLSearchParams({client_id:e,
redirect_uri:googleRedirectUri(),response_type:"code",scope:x,access_type:"offline",prompt:"consent",include_granted_scopes:"true"})
;location.href="https://accounts.google.com/o/oauth2/v2/auth?"+t.toString()}async function showCalendarSettings(){let o;setChrome({
title:"Google Calendar",up:{label:"Customers",hash:"#/customers"},save:!1}),p.gcalErr.hidden=!0,p.gcalConnect.hidden=!0,
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
;if(100!==t)return showTermsError("The shares add up to "+t+"%. They have to add up to 100%.");return!0}())return!1;const e=readItems().filter(isNamed).map(e=>({
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
showToast("Cost updated"),closeCostCalc()}const R=KK.moodboard;let j=null,N=null,B=!1,q=null,Y=!1,G=null;
// Each export owns its label and its state, so a Drive failure never rewrites
// the download button and neither one steals the other's success message.
const MB_EXPORTS={drive:{el:"mbUpload",idle:"Upload to Drive",busy:"Uploading…",done:"Uploaded"},
download:{el:"mbDownload",idle:"Download PDF",busy:"Preparing PDF…",done:"Downloaded"}},MB_EXPORT_TIMERS={},
MB_RECONNECT=/not connected|revoked|reconnect|stored credential|not configured on the server/i,MB_MAX_ZOOM=5;
function setupMoodboardListeners(){
const e=a("#mbDropzone"),t=a("#mbFileInput"),o=a("#mbAddMore"),s=a("#mbGenerate"),i=a("#mbThumbs")
;let dragCounter=0;p.viewMoodboard.addEventListener("pointerdown",e=>{const t=e.target.closest(".order-nav-btn,.moodboard-action,.moodboard-strip")
;t&&!t.disabled&&t.classList.add("is-pressed")}),p.viewMoodboard.addEventListener("keydown",e=>{if(" "!==e.key&&"Enter"!==e.key)return
;const t=e.target.closest(".order-nav-btn,.moodboard-action,.moodboard-strip");t&&!t.disabled&&(t.classList.add("is-pressed"),t.matches("#mbFileBtn")&&e.preventDefault())}),
p.viewMoodboard.addEventListener("click",e=>{e.target.closest("#mbFileBtn")&&e.preventDefault()}),e.addEventListener("click",function(o){
B||o.target.closest(".mb-thumb__remove")||!o.target.closest(".mb-upload-cell--empty")||t.click()}),
o.addEventListener("click",function(){t.click()}),t.addEventListener("change",async function(){t.files.length&&await addMoodboardFiles(t.files),
t.value=""}),e.addEventListener("dragenter",function(t){t.preventDefault(),dragCounter++,e.classList.add("is-over")}),
e.addEventListener("dragover",function(t){t.preventDefault(),e.classList.add("is-over")}),
e.addEventListener("dragleave",function(){dragCounter--,dragCounter<=0&&(dragCounter=0,e.classList.remove("is-over"))}),
e.addEventListener("drop",async function(t){t.preventDefault(),dragCounter=0,e.classList.remove("is-over"),
B||t.dataTransfer.files.length&&await addMoodboardFiles(t.dataTransfer.files)}),i.addEventListener("click",function(e){
const t=e.target.closest(".mb-thumb__remove");t&&R.removeImage(Number(t.dataset.i))}),s.addEventListener("click",openMoodboardCanvas),
p.mbRandomize.addEventListener("click",function(){Y||(R.randomize(),syncMoodboardCanvas())}),
p.mbRotate.addEventListener("click",function(){Y||(R.toggleOrientation(),syncMoodboardCanvas())}),
p.mbBoard.addEventListener("click",openMoodboardOverlay),p.mbOverlayClose.addEventListener("click",closeMoodboardOverlay),
p.mbUpload.addEventListener("click",()=>exportMoodboard("drive")),p.mbDownload.addEventListener("click",()=>exportMoodboard("download")),
bindMoodboardOverlayGestures(p.mbOverlayCanvas)}
async function addMoodboardFiles(e){if(B)return
;const t=a("#mbLoadingText"),o=a("#mbAddMore"),n=a("#mbGenerate"),s=Math.min(Array.from(e).length,R.MAX_IMAGES-R.images.length)
;B=!0,t.textContent=s>1?"Preparing 1 of "+s+" photos…":"Preparing photo…",o.disabled=!0,n.disabled=!0,await new Promise(e=>{
requestAnimationFrame(()=>setTimeout(e,0))});try{const o=await R.addFiles(e,function(e,o){
t.textContent=o>1?"Preparing "+e+" of "+o+" photos…":"Preparing photo…"})
;o.rejected&&showToast(1===o.rejected?"One image could not be opened and was skipped":o.rejected+" images could not be opened and were skipped")
}catch(e){console.error(e),showToast("Could not prepare those photos — "+(e.message||"please try again"))}finally{B=!1,t.textContent="",
o.disabled=R.images.length>=R.MAX_IMAGES,n.disabled=0===R.images.length}}
function openMoodboardCanvas(){R.images.length&&go("#/order/"+w.order.id+"/moodboard/preview")}
// Both the framed board and the overlay show the real document, cloned from
// the off-screen stage, so there is only ever one composition to keep correct.
function moodboardStageClone(){const e=R.stage;if(!e)return null;const t=e.cloneNode(!0)
;return t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id")),t.removeAttribute("id"),t.setAttribute("aria-hidden","true"),t}
function syncMoodboardCanvas(){if(p.mbCanvas.hidden)return;const e=moodboardStageClone();if(!e)return
;const t="portrait"===R.orientation
;p.mbBoardScaler.style.width=R.stageWidth+"px",p.mbBoardScaler.style.height=R.stageHeight+"px",
p.mbBoardScaler.replaceChildren(e),fitMoodboardBoard(),
p.mbRotate.setAttribute("aria-label",t?"Rotate to landscape":"Rotate to portrait"),
p.mbBoard.setAttribute("aria-label",t?"Open the portrait moodboard full screen":"Open the landscape moodboard full screen. It is shown sideways here — turn your device to read it upright."),
G||"function"!=typeof ResizeObserver||(G=new ResizeObserver(fitMoodboardBoard),G.observe(p.mbBoard)),renderMoodboardOverlay(!0)}
// The frame is always 9:16. A portrait board fills it directly; a landscape
// one is turned a quarter-turn so it still fills the frame edge to edge rather
// than letterboxing — the stylist turns the phone to read it upright.
function fitMoodboardBoard(){const e=p.mbBoard.clientWidth,t=p.mbBoard.clientHeight;if(!e||!t)return
;const o="portrait"===R.orientation,n=o?Math.min(e/R.stageWidth,t/R.stageHeight):Math.min(t/R.stageWidth,e/R.stageHeight)
;p.mbBoardScaler.style.transform="translate(-50%, -50%) "+(o?"":"rotate(90deg) ")+"scale("+n+")"}
/* ------------------------- Full-screen overlay --------------------------- */
function openMoodboardOverlay(){if(Y||!R.images.length||!p.mbOverlay.hidden)return
;q=document.activeElement,p.mbOverlay.hidden=!1,document.body.classList.add("moodboard-presenting"),
document.body.classList.add("has-app-modal"),N={zoom:1,x:0,y:0,fit:1,clone:null,pointers:new Map,lastDistance:null,lastTap:0},
requestAnimationFrame(()=>{renderMoodboardOverlay(!0),p.mbOverlayClose.focus()})}
function closeMoodboardOverlay(){const e=p.mbOverlay,t=e&&!e.hidden;e&&(e.hidden=!0),p.mbOverlayCanvas.replaceChildren(),
document.body.classList.remove("moodboard-presenting"),document.body.classList.remove("has-app-modal"),N=null,
t&&q&&document.contains(q)&&q.focus(),q=null}
// `rebuild` replaces the clone; without it the overlay only refits, which is
// what a viewport resize or rotation needs.
function renderMoodboardOverlay(e){if(!N||p.mbOverlay.hidden)return;const t=p.mbOverlayCanvas.getBoundingClientRect()
;if(!t.width||!t.height)return;if(N.fit=Math.min(t.width/R.stageWidth,t.height/R.stageHeight)*.94,e){
const t=moodboardStageClone();if(!t)return
;t.style.cssText="position:absolute;left:50%;top:50%;width:"+R.stageWidth+"px;height:"+R.stageHeight+"px;transform-origin:50% 50%;pointer-events:none;",
p.mbOverlayCanvas.replaceChildren(t),N.clone=t}clampMoodboardPan(),applyMoodboardTransform()}
// Zooming about a screen point keeps whatever is under the fingers or cursor
// where it is. Without a point the view zooms about its own centre.
function moodboardZoomAt(e,t,o){if(!N)return;const n=Math.max(1,Math.min(MB_MAX_ZOOM,e));if(n===N.zoom)return
;const s=n/N.zoom;if(void 0===t)N.x*=s,N.y*=s;else{const e=p.mbOverlayCanvas.getBoundingClientRect(),
n=t-(e.left+e.width/2),r=o-(e.top+e.height/2);N.x=n-(n-N.x)*s,N.y=r-(r-N.y)*s}
N.zoom=n,1===N.zoom&&(N.x=N.y=0),clampMoodboardPan(),applyMoodboardTransform()}
function clampMoodboardPan(){if(!N)return;const e=p.mbOverlayCanvas.getBoundingClientRect(),t=N.fit*N.zoom,
o=Math.max(0,(R.stageWidth*t-e.width)/2),n=Math.max(0,(R.stageHeight*t-e.height)/2)
;N.x=Math.max(-o,Math.min(o,N.x)),N.y=Math.max(-n,Math.min(n,N.y))}
function applyMoodboardTransform(){if(!N||!N.clone)return;const e=N.fit*N.zoom
;N.clone.style.transform="translate(calc(-50% + "+N.x+"px),calc(-50% + "+N.y+"px)) scale("+e+")"}
function bindMoodboardOverlayGestures(e){if(!e)return;const point=e=>({x:e.clientX,y:e.clientY})
;e.addEventListener("pointerdown",function(t){N&&(e.setPointerCapture(t.pointerId),N.pointers.set(t.pointerId,point(t)),N.lastDistance=null)}),
e.addEventListener("pointermove",function(e){if(!N||!N.pointers.has(e.pointerId))return
;const t=N.pointers.get(e.pointerId);N.pointers.set(e.pointerId,point(e));const o=Array.from(N.pointers.values())
;if(o.length>=2){const e=Math.hypot(o[0].x-o[1].x,o[0].y-o[1].y)
;N.lastDistance&&moodboardZoomAt(N.zoom*e/N.lastDistance,(o[0].x+o[1].x)/2,(o[0].y+o[1].y)/2),N.lastDistance=e
}else N.zoom>1&&(N.x+=e.clientX-t.x,N.y+=e.clientY-t.y,clampMoodboardPan(),applyMoodboardTransform())})
;const endPointer=function(e){N&&(N.pointers.delete(e.pointerId),N.lastDistance=null)}
// A mouse gets its double-click from `dblclick`; touch and pen are timed here
// so the two never fire for the same gesture.
;e.addEventListener("pointerup",function(e){if(N&&"mouse"!==e.pointerType&&1===N.pointers.size){const t=Date.now()
;t-N.lastTap<300?(moodboardZoomAt(N.zoom>1?1:2.5,e.clientX,e.clientY),N.lastTap=0):N.lastTap=t}endPointer(e)}),
e.addEventListener("pointercancel",endPointer),e.addEventListener("wheel",function(e){
N&&(e.preventDefault(),moodboardZoomAt(N.zoom*(e.deltaY<0?1.12:.89),e.clientX,e.clientY))},{passive:!1}),
e.addEventListener("dblclick",function(e){N&&moodboardZoomAt(N.zoom>1?1:2.5,e.clientX,e.clientY)})}
function handleMoodboardOverlayKey(e){if(!N||p.mbOverlay.hidden)return!1
;if("Escape"===e.key)return e.preventDefault(),closeMoodboardOverlay(),!0
;if("+"===e.key||"="===e.key)return e.preventDefault(),moodboardZoomAt(N.zoom*1.25),!0
;if("-"===e.key||"_"===e.key)return e.preventDefault(),moodboardZoomAt(N.zoom/1.25),!0
;return"0"===e.key&&(e.preventDefault(),moodboardZoomAt(1)),!1}
/* ------------------------------- Exports --------------------------------- */
function setMoodboardExportBusy(e){Y=e,[p.mbRotate,p.mbRandomize,p.mbUpload,p.mbDownload,p.mbBoard].forEach(t=>{t.disabled=e})}
function setMoodboardExportState(e,t,o){const n=p[MB_EXPORTS[e].el]
;n.classList.toggle("is-busy","busy"===t),n.classList.toggle("is-done","done"===t),n.classList.toggle("is-error","error"===t),
"busy"===t?n.setAttribute("aria-busy","true"):n.removeAttribute("aria-busy"),
a(".moodboard-action__label",n).textContent=o||MB_EXPORTS[e].idle}
function flashMoodboardExportState(e,t,o){clearTimeout(MB_EXPORT_TIMERS[e]),setMoodboardExportState(e,t,o),
MB_EXPORT_TIMERS[e]=setTimeout(()=>setMoodboardExportState(e,"idle"),2600)}
function resetMoodboardExports(){Object.keys(MB_EXPORTS).forEach(e=>{clearTimeout(MB_EXPORT_TIMERS[e]),
setMoodboardExportState(e,"idle")}),setMoodboardExportBusy(!1)}
// The first successful export is what "the moodboard went out" means for the
// consultation follow-up. Later exports only add history.
async function recordMoodboardExport(o,n,s,r){const i=!await t.countMoodboards(o)
;await t.logMoodboard(o,r),await t.logOrderHistory(o,"moodboard_generated",{file_name:n,orientation:R.orientation,
destination:"drive"===s?"drive":"download",drive_link:r||null});if(!i)return
;w.customer=await t.updateCustomer(w.customer.id,{moodboard_date:e.todayISO()})
;const d=consultNudgeFor(w.customer,w.customerOrders,e.todayISO());if(d){await t.updateCustomer(w.customer.id,d);try{
await t.syncFollowUp(w.customer.id)}catch(e){console.error(e)}}}
// A missing or revoked credential must never cost the stylist their selection,
// so the session is left exactly as it is and the fix opens in its own tab.
function offerGoogleReconnect(e){showToast(e),
window.confirm(e+"\n\nOpen Google settings to reconnect?")&&window.open(location.pathname+location.search+"#/calendar","_blank","noopener")}
async function exportMoodboard(o){if(Y||!R.images.length||!w.order)return;const n=MB_EXPORTS[o],s=w.order.id
;let r=!1;clearTimeout(MB_EXPORT_TIMERS[o]),setMoodboardExportBusy(!0),setMoodboardExportState(o,"busy",n.busy),
p.mbExportStatus.textContent=n.busy;try{const e=await R.generatePDF(),i=R.buildFilename(new Date);let d=null
;if("drive"===o){const t=await KK.db.driveSaveMoodboardPdf(i,R.pdfToBase64(e),w.customer&&w.customer.name||"",
w.order.title||w.order.doc_name||"Untitled order");d=t&&t.drive_link||null}else e.save(i)
;r=!0,await recordMoodboardExport(s,i,o,d),flashMoodboardExportState(o,"done",n.done),p.mbExportStatus.textContent=n.done,
showToast("drive"===o?"Moodboard saved to Google Drive":"Moodboard PDF downloaded")}catch(e){console.error(e)
;const t=e&&e.message||"please try again";flashMoodboardExportState(o,"error",r?"Not recorded":"Failed"),
p.mbExportStatus.textContent=t,
!r&&"drive"===o&&MB_RECONNECT.test(t)?offerGoogleReconnect(t):showToast(r?"The moodboard was exported, but its record could not be finished — "+t:("drive"===o?"Could not upload to Drive — ":"Could not download the PDF — ")+t)
}finally{setMoodboardExportBusy(!1)}}// Both document buttons are disabled while either one is generating, and the
// label region is the only thing that changes — the split keeps its geometry.
function setBusy(e,t){w.orderDetail.documentBusy=t?e:null;const o=w.orderDetail.vm,n=!o||o.documents.canDownload
;Object.keys(g).forEach(e=>{g[e].disabled=t||!n});const s=g[e];s.classList.toggle("is-busy",t),
t?s.setAttribute("aria-busy","true"):s.removeAttribute("aria-busy"),
a(".order-action__label",s).textContent=t?"Generating…":"quotation"===e?"Get quotation":"Get invoice"}
async function download(n){let a;setBusy(n,!0);try{a=await o.download(n,{docName:w.order.doc_name||w.customer.name||"",date:e.todayISO(),
items:w.order.items||[],includes:w.order.includes||[],terms:o.termsFor(w.order)})}catch(e){return console.error(e),
showToast("Could not generate the PDF — please try again"),void setBusy(n,!1)}setBusy(n,!1),showToast(o.DOCS[n].name+" downloaded"),
// Sending a quotation means it has been quoted; sending an invoice means
// the order is confirmed. Only ever forward.
await bumpStatus("invoice"===n?"Confirmed":"Quoted");
// The file is already on disk by now. A log failure is worth reporting but
// must not read as a failed download.
try{await t.logDocument(w.order.id,n,a),await refreshOrderPayments()}catch(e){console.error(e),showToast("Downloaded, but could not record it")}}
// One payment at a time, and never marked paid before the write succeeds.
async function logDeposit(e){if(!w.orderDetail.paymentBusy){p.paymentError.textContent="",p.paymentError.hidden=!0,setOrderPaymentBusy(!0)
;try{await logDepositRequest(e)}finally{setOrderPaymentBusy(!1)}}}
async function logDepositRequest(a){const s=o.computeTotal(w.order.items),r=o.termsFor(w.order),i=o.termAmounts(s,r)[a],d=function(t,o,n){const a={}
;return 0!==o||t.first_payment_date||(a.first_payment_date=e.todayISO()),
o!==(e=>e&&"other"===e.payment_scheme?0:1)(t)||t.second_payment_date||(a.second_payment_date=e.todayISO()),
o!==n.length-1||t.final_payment_date||(a.final_payment_date=e.todayISO()),a}(w.order,a,r);if(d.first_payment_date&&d.final_payment_date){
if(!window.confirm("This is the only payment term, so logging it starts the schedule and marks the order finished at the same time. Log it?"))return}
try{await t.logOrderHistory(w.order.id,"payment_logged",{deposit_index:a,deposit_label:o.termLabel(r[a]),amount:i}),closeOrderPaymentChooser(),
showToast(r[a].label+" logged"),Object.keys(d).length&&(w.order=await t.updateOrder(w.order.id,d)),
(d.first_payment_date||d.second_payment_date)&&await async function(){try{
const e=await rescheduleOrder(w.order,w.customer),o=e.rows.filter(e=>n.isProductionStage(e.stage)).length
;o?(await t.logOrderHistory(w.order.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped}),
showToast(o+" fittings scheduled")):e.rows.length?(await t.logOrderHistory(w.order.id,"scheduled",{count:e.rows.length,dropped:e.computed.dropped}),
showToast("Design phase scheduled")):e.computed.reason&&showToast(e.computed.reason),await refreshOrderSchedule()}catch(e){console.error(e),
showToast("Payment logged, but the schedule could not be built")}
}(),d.final_payment_date?await bumpStatus("Delivered"):d.second_payment_date?await bumpStatus("In production"):d.first_payment_date&&await bumpStatus("Confirmed"),
await refreshOrderPayments(),renderOrderStatus()}catch(e){console.error(e),showToast(e.message||"Could not log payment"),
p.paymentError.textContent=e.message||"Could not log that payment. Try again.",p.paymentError.hidden=!1}}async function signOutFromMenu(){
if(closeMenu(),confirmLeave()){await coverCurtain();try{await t.signOut(),location.hash="",await showGate()}catch(e){await revealCurtain(),showToast(e.message||"Could not sign out")}}}function bindEvents(){window.addEventListener("hashchange",handleRoute),
p.pageAction.addEventListener("click",()=>{D&&D()}),p.saveBtn.addEventListener("click",async()=>{if(!w.saving){w.saving=!0,setDirty(w.dirty);try{
if("customer"===w.route.view)await saveCustomer();else if("orderEdit"===w.route.view){const e=w.order.id;
// Refused by validation: stay on the form, where the error is.
if(!await saveOrder())return;showToast("Order saved"),leaveFormFor("#/order/"+e)}}catch(e){console.error(e),showToast(e.message||"Could not save")
}finally{w.saving=!1,setDirty(w.dirty)}}}),p.homeNavHome&&p.homeNavHome.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})}),
p.homeNavMenu&&p.homeNavMenu.addEventListener("click",e=>{e.stopPropagation();const t=p.menuList.hidden;t?(p.menuList.parentNode!==p.homeNavMenuWrapper&&p.homeNavMenuWrapper.appendChild(p.menuList),p.menuList.hidden=!1,p.homeNavMenu.setAttribute("aria-expanded","true")):closeMenu()}),
p.menuBtn.addEventListener("click",e=>{e.stopPropagation();const t=p.menuList.hidden;p.menuList.parentNode!==p.menu&&p.menu.appendChild(p.menuList),p.menuList.hidden=!t,p.menuBtn.setAttribute("aria-expanded",String(t))}),document.addEventListener("click",e=>{
p.menuList.hidden||p.menu.contains(e.target)||(p.homeNavMenuWrapper&&p.homeNavMenuWrapper.contains(e.target))||closeMenu()}),document.addEventListener("keydown",e=>{if("Escape"!==e.key||p.menuList.hidden)return
;closeMenu(),p.menuBtn.focus()}),p.menuSignOut.addEventListener("click",signOutFromMenu),p.menuDelete.addEventListener("click",()=>{closeMenu(),
"order"===p.menuDelete.dataset.kind?async function(){
if(window.confirm("Delete this order and its payment and download record? This cannot be undone."))try{const e=w.order.customer_id
;await t.deleteOrder(w.order.id),setDirty(!1),showToast("Order deleted"),go("#/customer/"+e)}catch(e){console.error(e),
showToast(e.message||"Could not delete")}}():deleteCustomerRecord()}),p.deleteCustomer.addEventListener("click",deleteCustomerRecord),
p.customerSearch.addEventListener("input",renderCustomerList),s(".js-cfield").forEach(e=>{e.addEventListener("input",()=>{
e===p.cName&&e.value.trim()&&setNameError(!1),setDirty(!0)}),e.addEventListener("change",()=>setDirty(!0))}),
p.cWeddingPrecision.addEventListener("click",e=>{const t=e.target.closest(".custedit-segmented__btn")
;t&&t.dataset.precision!==weddingPrecision()&&(setWeddingPrecision(t.dataset.precision),setDirty(!0))}),
p.cancelCustomer.addEventListener("click",cancelCustomer),p.reopenCustomer.addEventListener("click",reopenCustomer),
p.logPaymentBtn.addEventListener("click",toggleOrderPaymentChooser),
p.paymentChooserOptions.addEventListener("click",e=>{
const t=e.target.closest(".js-log-deposit");t&&logDeposit(Number(t.dataset.i))}),p.downloadQuote.addEventListener("click",()=>download("quotation")),
p.downloadInvoice.addEventListener("click",()=>download("invoice")),p.createMoodboardBtn.addEventListener("click",function(){
w.order&&go("#/order/"+w.order.id+"/moodboard")}),p.logNewFittingBtn.addEventListener("click",function(){
w.order&&go("#/order/"+w.order.id+"/fitting/new")}),p.fittingJournalAdd.addEventListener("click",()=>KK.fittings.openCamera()),
KK.fittings.bindOverlays(),setupMoodboardListeners(),
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
"Enter"===e.key&&(e.preventDefault(),addCustomInclude())}),
// A resize or a device rotation refits both the framed board and the overlay
// without disturbing the composition either one is showing.
["resize","orientationchange"].forEach(e=>window.addEventListener(e,function(){syncVisualViewport(),
fitMoodboardBoard(),renderMoodboardOverlay(!1)})),window.visualViewport&&(window.visualViewport.addEventListener("resize",syncVisualViewport),
window.visualViewport.addEventListener("scroll",syncVisualViewport)),
window.addEventListener("offline",()=>showToast("You're offline — changes won't save until you're back online")),
window.addEventListener("online",()=>showToast("Back online")),document.addEventListener("focusin",e=>{var t
;(t=e.target).matches("input, select, textarea, button")&&requestAnimationFrame(()=>setTimeout(()=>{document.activeElement===t&&t.scrollIntoView({
block:"center",inline:"nearest",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})},80))}),
document.addEventListener("keydown",e=>{trapModalFocus(e,p.calcSheet),trapModalFocus(e,p.mbOverlay),
["fittingCamera","fittingConfirm","fittingCaptionStep","fittingPicker","fittingEditSheet"].forEach(e=>trapModalFocus(e,a("#"+e))),
p.calcSheet.hidden?handleMoodboardOverlayKey(e):"Escape"===e.key&&(e.preventDefault(),closeCostCalc())}),window.addEventListener("beforeunload",e=>{
w.dirty&&(e.preventDefault(),e.returnValue="")})}async function showGate(){await coverCurtain(),p.app.hidden=!0,p.gate.hidden=!1,
p.gateRemember.checked=t.rememberPreference(),p.gatePassword.value=p.gateRemember.checked?t.savedPassword():"",p.gateErr.hidden=!0,p.gatePassword.removeAttribute("aria-invalid"),
await revealCurtain(),p.gatePassword.value?p.gateSubmit.focus():p.gatePassword.focus()}async function showApp(){await coverCurtain(),p.gate.hidden=!0,p.app.hidden=!1,await handleRoute(),
async function(){const e=new URLSearchParams(location.search),o=e.get("code"),n=e.get("error");if(!o&&!n)return
;const clean=()=>history.replaceState(null,"",location.pathname+location.hash);if(n)return clean(),
void showToast("access_denied"===n?"Google Calendar was not connected":"Google sign-in failed");clean();try{
await t.googleExchange(o,googleRedirectUri()),w.googleConnected=!0,showToast("Google Calendar connected")}catch(e){console.error(e),
showToast(e.message||"Could not connect Google Calendar")}}()}return async function(){if(p.gateForm.addEventListener("submit",async e=>{
if(e.preventDefault(),!p.gateSubmit.disabled){p.gateErr.hidden=!0,p.gatePassword.removeAttribute("aria-invalid"),p.gateSubmit.disabled=!0,p.gateSubmit.classList.add("is-busy"),
a(".btn__label",p.gateSubmit).textContent="Unlocking…";try{await t.signIn(p.gatePassword.value,p.gateRemember.checked),await showApp()}catch(e){
p.gateErr.textContent=e.message||"Could not sign in",p.gateErr.hidden=!1,p.gatePassword.setAttribute("aria-invalid","true"),p.gatePassword.select()}finally{p.gateSubmit.disabled=!1,
p.gateSubmit.classList.remove("is-busy"),a(".btn__label",p.gateSubmit).textContent="Unlock"}}}),bindEvents(),t.isConfigured())try{
await t.currentSession()?await showApp():await showGate()}catch(e){console.error(e),await showGate()
}else p.boot.innerHTML='<div class="boot__msg"><strong>Not connected.</strong><span>Fill in <code>config.js</code> with your Supabase URL and anon key — see “Setting up the database” in the README.</span></div>'
}(),{state:w}}();
