/* Dependency-free helpers shared by window.KK browser modules: DOM lookup,
   escaping, date/currency/input formatting, filenames, and seeded randomness.
   Owns no page state, persistence, or feature workflow. */
window.KK=window.KK||{},KK.util=function(){"use strict"
;const t=["January","February","March","April","May","June","July","August","September","October","November","December"],digitsOnly=t=>String(null==t?"":t).replace(/[^\d]/g,"")
;const groupDigits=t=>{const e=digitsOnly(t).replace(/^0+(?=\d)/,"");return e?e.replace(/\B(?=(\d{3})+(?!\d))/g,"."):""};function formatLongDate(e){
const r=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(e||""));if(!r)return"";const n=Number(r[3]),o=t[Number(r[2])-1];return o&&n?n+" "+o+" "+r[1]:""}return{
MONTHS:t,$:(t,e)=>(e||document).querySelector(t),$$:(t,e)=>Array.prototype.slice.call((e||document).querySelectorAll(t)),digitsOnly:digitsOnly,
escapeHtml:t=>String(null==t?"":t).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[t])),formatRupiah:function(t){
const e=Math.round(Number(t)||0);return"Rp"+(e<0?"-":"")+String(Math.abs(e)).replace(/\B(?=(\d{3})+(?!\d))/g,".")},groupDigits:groupDigits,
reformatPriceField:function(t){const e=t.value,r=groupDigits(e);if(r===e)return;const n=t.selectionStart,o=digitsOnly(e.slice(0,n)).length;t.value=r
;let a=0,u=0;for(;a<r.length&&u<o;)r.charCodeAt(a)>=48&&r.charCodeAt(a)<=57&&u++,a++;t.setSelectionRange(a,a)},formatLongDate:formatLongDate,
formatShortDate:function(t){const e=formatLongDate(t);if(!e)return"";const r=e.split(" ");return r[0]+" "+r[1].slice(0,3)+" "+r[2]},
todayISO:function(){const t=new Date,p=t=>String(t).padStart(2,"0");return t.getFullYear()+"-"+p(t.getMonth()+1)+"-"+p(t.getDate())},
sanitizeForFilename:function(t){return String(t||"").normalize("NFKD").replace(/[^\p{L}\p{N}\s_-]/gu,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-")
},hashString:function(t){let e=2166136261;for(let r=0;r<t.length;r++)e^=t.charCodeAt(r),e=Math.imul(e,16777619);return e>>>0},mulberry32:function(t){
let e=t>>>0;return function(){e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}}}();
