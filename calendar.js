/* Pure fitting-schedule policy and ISO-date arithmetic. Computes design and
   production events from payment/wedding anchors and pinned dates; owns no DOM,
   persistence, Google API calls, or route state. */
window.KK=window.KK||{},KK.calendar=function(){"use strict"
;const e=KK.util,n=["Design phase","Design deadline","Body measurements","Fitting 1","Fitting 2","Fitting 3","Final fitting"],t=n.slice(0,2),s=n.slice(2),a=s[0],o=s[s.length-1],r=["Fitting 3","Fitting 2","Fitting 1"],spanNeededFor=(e,n)=>7*(n||3)*(e-1),i=864e5
;function toDay(e){const n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e||""));if(!n)return null
;const t=Date.UTC(Number(n[1]),Number(n[2])-1,Number(n[3])),s=new Date(t);
// Rejects 2026-02-31 and friends, which Date.UTC would happily roll over.
return s.getUTCMonth()!==Number(n[2])-1||s.getUTCDate()!==Number(n[3])?null:Math.round(t/i)}function fromDay(e){
const n=new Date(e*i),p=e=>String(e).padStart(2,"0");return n.getUTCFullYear()+"-"+p(n.getUTCMonth()+1)+"-"+p(n.getUTCDate())}
function daysBetween(e,n){const t=toDay(e),s=toDay(n);return null===t||null===s?null:s-t}
const mondayOnOrBefore=e=>e-(e%7+7+3)%7,isMonday=e=>mondayOnOrBefore(e)===e;function computeDesign(e){const n=toDay(e);return null===n?{events:[],
reason:"The design phase starts when the first payment is logged.",missingAnchor:!0}:{events:[{stage:"Design phase",event_date:fromDay(n+1),
end_date:fromDay(n+14)},{stage:"Design deadline",event_date:fromDay(n+14)}],reason:"",missingAnchor:!1}}function computeProduction(e,t,i){
const d=toDay(e),l=toDay(t),c=i||{},nothing=(e,n)=>({events:[],dropped:[],warnings:[],warning:"",reason:e,missingAnchor:!!n,finalBufferDays:null,
gapWeeks:3});if(null===d)return nothing("Fittings are scheduled when the production payment is logged.",!0)
;if(null===l)return nothing("Add the wedding date to build a schedule.",!0)
;const u=toDay(c[a]),g=toDay(c[o]),h=null===u?mondayOnOrBefore(d+7):u,f=null===g?mondayOnOrBefore(l-21):g,m=null===g?mondayOnOrBefore(l-7):g
;if(m<=h)return nothing("The production payment is too close to the wedding to schedule fittings — body measurements alone run past 7 days before the day.")
;let _=s.slice();const D=[];let y=null,w=3;for(let e=0;;e++){for(const e of[3,2]){const n=spanNeededFor(_.length,e);if(f-h>=n){y=f,w=e;break}
if(m-h>=n){y=h+n,w=e;break}}if(null!==y)break;if(e>=r.length)break;D.push(r[e]),_=_.filter(n=>n!==r[e])}const S=null===y;S&&(y=m)
;const A=function(e,n,t,s){const a=e.length-1,o=new Array(e.length);o[0]=n,o[a]=t;const r=[0];for(let n=1;n<a;n++){const t=toDay(s[e[n]])
;null!==t&&(o[n]=t,r.push(n))}r.push(a);for(let e=0;e<r.length-1;e++){const n=r[e],t=r[e+1];if(t-n<2)continue
;const s=o[t]-o[n],a=isMonday(o[n])&&isMonday(o[t]);for(let e=n+1;e<t;e++){const r=(e-n)*s/(t-n);o[e]=o[n]+(a?7*Math.round(r/7):Math.round(r))}}
return o
}(_,h,y,c),v=A.reduce((e,n,t)=>0===t?e:Math.min(e,n-A[t-1]),1/0),F=l-A[A.length-1],E=D.slice().sort((e,t)=>n.indexOf(e)-n.indexOf(t)),T=function(e,n,t,a,o){
const r=[];n.length&&r.push(listOf(n)+(1===n.length?" was":" were")+" left out — the full programme needs "+weeks(3*(s.length-1))+".")
;t<14&&r.push("Final fitting "+days(t)+" before the wedding, not the usual 21.")
;o?r.push("The two appointments are "+days(a)+" apart, not the usual "+weeks(3)+"."):a<21&&r.push("Appointments as little as "+days(a)+" apart, not the usual "+weeks(3)+".")
;return r.length?["Only "+days(e)+" from the production payment to the wedding."].concat(r):[]}(l-d,E,F,v,S);return{events:_.map((e,n)=>({stage:e,
event_date:fromDay(A[n])})),dropped:E,warnings:T,warning:T.join(" "),reason:"",missingAnchor:!1,finalBufferDays:F,gapWeeks:w}}
const days=e=>e+(1===e?" day":" days"),weeks=e=>e+(1===e?" week":" weeks"),listOf=e=>1===e.length?e[0]:e.slice(0,-1).join(", ")+" and "+e[e.length-1]
;function gapsFor(e){return e.map((n,t)=>{if(0===t)return null;const s=e[t-1]
;return isProductionStage(n.stage)&&isProductionStage(s.stage)?daysBetween(s.event_date,n.event_date):null})}
const isProductionStage=e=>-1!==s.indexOf(e);return{STAGES:n,DESIGN_STAGES:t,PRODUCTION_STAGES:s,ANCHOR_FIRST:a,ANCHOR_LAST:o,MIN_GAP_WEEKS:3,
SQUEEZE_GAP_WEEKS:2,DROP_ORDER:r,DESIGN_PHASE_DAYS:14,MEASURE_DEADLINE_DAYS:7,FINAL_BUFFER_IDEAL:21,FINAL_BUFFER_MIN:7,FINAL_BUFFER_QUIET:14,
computeDesign:computeDesign,computeProduction:computeProduction,computeSchedule:function(e,n,t,s){
const a=s||{},o=computeDesign(e),r=computeProduction(n,t,a),i=o.events.map(e=>{const n=toDay(a[e.stage]);if(null===n)return e;const t={stage:e.stage,
event_date:fromDay(n)};return e.end_date&&(t.end_date=fromDay(n+daysBetween(e.event_date,e.end_date))),t}).concat(r.events);return{design:o,
production:r,events:i,dropped:r.dropped,warnings:r.warnings,warning:r.warning,reason:i.length?"":o.reason||r.reason,
missingAnchor:!i.length&&(o.missingAnchor||r.missingAnchor),finalBufferDays:r.finalBufferDays}},spanNeededFor:spanNeededFor,gapsFor:gapsFor,
pinsFrom:function(e){const n={};return(e||[]).forEach(e=>{e.pinned&&(n[e.stage]=e.event_date)}),n},stageOrder:e=>{const t=n.indexOf(e)
;return-1===t?n.length:t},isDesignStage:e=>-1!==t.indexOf(e),isProductionStage:isProductionStage,eventTitle:function(e,n,t){
const s=String(n||"").trim().split(/\s+/)[0]||"Client",a=String(t||"").trim();return e+" — "+s+(a?" ("+a+")":"")},renderSchedule:function(n,t,s){
const a=s||{};if(!t.events.length)return void(n.innerHTML='<p class="sched__empty">'+e.escapeHtml(t.reason)+"</p>")
;const o=e.todayISO(),r=gapsFor(t.events)
;n.innerHTML=(t.warning?'<p class="sched__warn">'+e.escapeHtml(t.warning)+"</p>":"")+'<ol class="sched">'+t.events.map((n,t)=>{
const s=(n.end_date||n.event_date)<o,a=r[t],i=n.end_date?e.formatShortDate(n.event_date)+" – "+e.formatShortDate(n.end_date):e.formatShortDate(n.event_date)
;return'<li class="sched__row'+(s?" sched__row--past":"")+'"><span class="sched__stage">'+e.escapeHtml(n.stage)+'</span><span class="sched__date">'+e.escapeHtml(i)+'</span><span class="sched__gap">'+(null===a?"":"+"+a+"d")+'</span><span class="sched__pinned'+(n.pinned?" is-pinned":"")+'"'+(n.pinned?' title="Moved by hand in Google Calendar — kept as is"':"")+'></span><span class="sched__synced'+(n.google_event_id?" is-synced":"")+'"'+(n.google_event_id?' title="In Google Calendar"':"")+"></span></li>"
}).join("")+(a.note?'<p class="sched__note">'+e.escapeHtml(a.note)+"</p>":"")},toDay:toDay,fromDay:fromDay,daysBetween:daysBetween,
mondayOnOrBefore:mondayOnOrBefore}}();
