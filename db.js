window.KK=window.KK||{},KK.db=function(){"use strict";const e=window.KK_CONFIG||{};let t=null;function isConfigured(){
return/^https:\/\/.+\.supabase\.co\/?$/.test(String(e.SUPABASE_URL||""))&&String(e.SUPABASE_ANON_KEY||"").length>40}
const n="kk_remember_me",r="kk_saved_password";function rememberPreference(){const e=localStorage.getItem(n);return null===e||"1"===e}
function clearSavedPassword(){localStorage.removeItem(r)}function init(){
return t||(isConfigured()?(t=window.supabase.createClient(e.SUPABASE_URL,e.SUPABASE_ANON_KEY,{auth:{persistSession:!0,autoRefreshToken:!0,
storage:rememberPreference()?window.localStorage:window.sessionStorage}}),t):null)}function unwrap(e){if(e.error){
const t=new Error(e.error.message||"Request failed");throw t.code=e.error.code||"",t}return e.data}
const i="id,name,phone,instagram,source,wedding_date,wedding_date_precision,notes,moodboard_date,cancelled_at,cancelled_reason,follow_up_date,follow_up_label,follow_up_google_event_id,follow_up_synced_at,created_at"
;const a="id,customer_id,title,doc_name,document_date,status,items,includes,payment_scheme,payment_terms,first_payment_date,second_payment_date,final_payment_date,created_at"
;async function listOrderEvents(e){
return unwrap(await init().from("order_events").select("id,order_id,stage,event_date,end_date,pinned,google_event_id,synced_at").eq("order_id",e).order("event_date",{
ascending:!0}))}
const o="id,order_id,session_id,stage,caption,drive_file_id,drive_link,position,created_at",s="id,order_id,stage,status,created_at,completed_at"
;async function callGoogle(e,t){const n=init();if(!n)throw new Error("Supabase is not configured — see config.js")
;const{data:r,error:i}=await n.functions.invoke("google-calendar",{body:Object.assign({action:e},t||{})});if(i){let e="";try{
e=(await i.context.json()).error||""}catch(e){}throw new Error(e||i.message||"Google Calendar request failed")}if(r&&r.error)throw new Error(r.error)
;return r}async function callDrive(e,t){const n=init();if(!n)throw new Error("Supabase is not configured — see config.js")
;const{data:r,error:i}=await n.functions.invoke("google-drive",{body:Object.assign({action:e},t||{})});if(i){let e="";try{
e=(await i.context.json()).error||""}catch(e){}throw new Error(e||i.message||"Google Drive request failed")}if(r&&r.error)throw new Error(r.error)
;return r}const d="id,payload,name,phone,instagram,source,wedding_date,wedding_date_precision,notes,status,customer_id,created_at,reviewed_at";return{
isConfigured:isConfigured,init:init,currentSession:async function(){if(!init())return null;const{data:e}=await t.auth.getSession()
;return e.session||null},signIn:async function(i,a){if(
// The storage choice is baked into the client at construction, so a
// change of heart on "remember me" means throwing the boot-time client
// away and building a fresh one. Safe here: nothing has authenticated on
// it yet, the only prior use was a currentSession() check at boot.
function(e){localStorage.setItem(n,e?"1":"0")}(a),t=null,!init())throw new Error("Supabase is not configured — see config.js")
;const{error:o}=await t.auth.signInWithPassword({email:e.SHARED_EMAIL,password:i});
// Supabase says "Invalid login credentials" for a bad password, which reads
// oddly when the email is fixed and invisible to the user.
if(o)throw new Error(/credential/i.test(o.message)?"Wrong password":o.message);a?function(e){localStorage.setItem(r,e)}(i):clearSavedPassword()},
signOut:async function(){init()&&(await t.auth.signOut(),clearSavedPassword())},refreshSession:async function(){if(!init())return null
;const{data:e,error:n}=await t.auth.refreshSession();if(n)throw new Error(n.message||"Could not refresh the session");return e.session||null},
isStaleToken:function(e){return!!e&&("PGRST301"===e.code||/\bJWT\b/i.test(e.message||""))},rememberPreference:rememberPreference,
savedPassword:function(){return localStorage.getItem(r)||""},listCustomers:async function(){
return unwrap(await init().from("customers").select(i).order("wedding_date",{ascending:!0,nullsFirst:!1}).order("name",{ascending:!0}))},
getCustomer:async function(e){return unwrap(await init().from("customers").select(i).eq("id",e).single())},createCustomer:async function(e){
return unwrap(await init().from("customers").insert(e).select(i).single())},updateCustomer:async function(e,t){
return unwrap(await init().from("customers").update(t).eq("id",e).select(i).single())},deleteCustomer:async function(e){
unwrap(await init().from("customers").delete().eq("id",e))},listOrders:async function(e){
return unwrap(await init().from("orders").select(a).eq("customer_id",e).order("document_date",{ascending:!1}))},listAllOrders:async function(){
return unwrap(await init().from("orders").select("id,customer_id,status,items,first_payment_date,second_payment_date,final_payment_date"))},
getOrder:async function(e){return unwrap(await init().from("orders").select(a).eq("id",e).single())},createOrder:async function(e){
return unwrap(await init().from("orders").insert(e).select(a).single())},updateOrder:async function(e,t){
return unwrap(await init().from("orders").update(t).eq("id",e).select(a).single())},deleteOrder:async function(e){
unwrap(await init().from("orders").delete().eq("id",e))},logDocument:async function(e,t,n){unwrap(await init().from("document_log").insert({
order_id:e,kind:t,total:n}))},listDocumentLog:async function(e){
const t=await init().from("document_log").select("id,kind,total,drive_link,created_at").eq("order_id",e).order("created_at",{ascending:!1})
;return t.error&&/drive_link/.test(t.error.message)?unwrap(await init().from("document_log").select("id,kind,total,created_at").eq("order_id",e).order("created_at",{
ascending:!1})):unwrap(t)},logOrderHistory:async function(e,t,n){unwrap(await init().from("order_history").insert({order_id:e,action:t,detail:n||{}}))
},listOrderHistory:async function(e){
return unwrap(await init().from("order_history").select("id,action,detail,created_at").eq("order_id",e).order("created_at",{ascending:!1}))},
listOrderEvents:listOrderEvents,listAllOrderEvents:async function(){
return unwrap(await init().from("order_events").select("order_id,stage,event_date,end_date"))},replaceOrderEvents:async function(e,t,n){
const r=await listOrderEvents(e),i={};r.forEach(e=>{i[e.stage]=e});const a={};t.forEach(e=>{a[e.stage]=e});const o=r.filter(e=>{return!(t=e.stage,
n&&-1===n.indexOf(t)||a[e.stage]);var t});o.length&&unwrap(await init().from("order_events").delete().in("id",o.map(e=>e.id)));for(const n of t){
const t=i[n.stage],r=n.end_date||null;if(t){if(t.event_date!==n.event_date||(t.end_date||null)!==r){if(t.pinned)continue;
// synced_at is cleared, not the event id: the event still exists in
// Google, it is just no longer showing the right day.
unwrap(await init().from("order_events").update({event_date:n.event_date,end_date:r,synced_at:null}).eq("id",t.id))}
}else unwrap(await init().from("order_events").insert({order_id:e,stage:n.stage,event_date:n.event_date,end_date:r}))}return{removed:o,
events:await listOrderEvents(e)}},listFittingSessions:async function(e){
return unwrap(await init().from("fitting_sessions").select(s).eq("order_id",e).order("created_at",{ascending:!1}))},
getFittingSession:async function(e){return unwrap(await init().from("fitting_sessions").select(s).eq("id",e).single())},
createFittingSession:async function(e){return unwrap(await init().from("fitting_sessions").insert(e).select(s).single())},
updateFittingSession:async function(e,t){return unwrap(await init().from("fitting_sessions").update(t).eq("id",e).select(s).single())},
listFittingPhotos:async function(e){return unwrap(await init().from("fitting_photos").select(o).eq("order_id",e).order("position",{ascending:!0}))},
createFittingPhoto:async function(e){return unwrap(await init().from("fitting_photos").insert(e).select(o).single())},
updateFittingPhoto:async function(e,t){return unwrap(await init().from("fitting_photos").update(t).eq("id",e).select(o).single())},
deleteFittingPhoto:async function(e){unwrap(await init().from("fitting_photos").delete().eq("id",e))},listIntake:async function(e){
let t=init().from("intake_submissions").select(d);return e&&(t=t.eq("status",e)),unwrap(await t.order("created_at",{ascending:!1}))},
getIntake:async function(e){return unwrap(await init().from("intake_submissions").select(d).eq("id",e).single())},resolveIntake:async function(e,t,n){
return unwrap(await init().from("intake_submissions").update({status:t,customer_id:n||null,reviewed_at:(new Date).toISOString()
}).eq("id",e).select(d).single())},googleStatus:()=>callGoogle("status"),googleExchange:(e,t)=>callGoogle("exchange",{code:e,redirect_uri:t}),
googleDisconnect:()=>callGoogle("disconnect"),googleForget:e=>callGoogle("forget",{google_event_ids:e}),syncOrderCalendar:e=>callGoogle("sync",{
order_id:e}),syncFollowUp:e=>callGoogle("sync_follow_up",{customer_id:e}),driveSaveMoodboardPdf:(e,t)=>callDrive("save_moodboard_pdf",{file_name:e,
pdf_base64:t}),driveSaveFittingPhoto:(e,t,n,r,i,a)=>callDrive("save_fitting_photo",{image_base64:e,mime_type:t,file_name:n,customer_name:r,
order_title:i,stage:a}),logMoodboard:async function(e,t){unwrap(await init().from("document_log").insert({order_id:e,kind:"moodboard",total:null,
drive_link:t}))}}}();