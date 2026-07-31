window.KK=window.KK||{},KK.docs=function(){"use strict";const t=KK.util,e=t.$,n=[{label:"1st deposit",percent:35,
desc:"To confirm order and start the design phase."},{label:"2nd deposit",percent:35,desc:"Upon design approval to start production phase."},{
label:"3rd deposit",percent:30,desc:"After final fitting, 7 days before delivery."}]
;const termLabel=t=>t.label+" - "+t.percent+"%",a=['300 13px "Aileron"','400 13px "Aileron"','400 44px "Aileron"'],o=595.28,r=[[255,253,250],// white
[251,247,240],// ivory
[245,239,228],// cream
[236,228,213],// light sand
[219,206,184],// sand
[199,183,156]],i={quotation:{node:"quotation",name:"Quotation"},invoice:{node:"invoice",name:"Invoice"}},s={quotation:e("#quotation"),qFor:e("#qFor"),
qDate:e("#qDate"),qDear:e("#qDear"),qItems:e("#qItems"),qIncludes:e("#qIncludes"),qPaymentRow:e("#qPaymentRow"),invoice:e("#invoice"),iFor:e("#iFor"),
iDate:e("#iDate"),iItems:e("#iItems"),iTerms:e("#iTerms")};const computeTotal=t=>(t||[]).reduce((t,e)=>t+(Number(e.qty)||0)*(Number(e.price)||0),0)
;function termAmounts(t,e){const a=e||n;let o=0;return a.map((e,n)=>{if(n===a.length-1)return t-o;const r=Math.round(t*(Number(e.percent)||0)/100)
;return o+=r,r})}function itemRowsHtml(e,n,a){
const o=(e||[]).filter(t=>""!==String(t.name||"").trim()).map(e=>'<div class="q-row"><p class="q-c-item">'+t.escapeHtml(e.name)+"</p>"+(a?'<p class="q-c-qty">'+(Number(e.qty)||0)+"</p>":"")+'<p class="q-c-price">'+t.formatRupiah(e.price)+"</p></div>")
;return o.push('<div class="q-row q-row--total"><p class="q-c-item">Total</p><p class="q-c-price">'+t.formatRupiah(n)+"</p></div>"),o.join("")}
function render(e){
const a=String(e.docName||"").trim(),o=e.items||[],r=e.includes||[],i=e.terms&&e.terms.length?e.terms:n,c=computeTotal(o),l=t.formatLongDate(e.date)
;return s.qFor.textContent=a,s.qDate.textContent=l,s.qDear.textContent="Dear "+a+",",s.qItems.innerHTML=itemRowsHtml(o,c,!0),
s.qIncludes.innerHTML='<p class="q-b">Includes:</p>'+r.map((e,n)=>'<span class="q-inc"><span>'+t.escapeHtml(e)+"</span>"+(n<r.length-1?'<span class="q-dot"></span>':"")+"</span>").join(""),
s.qPaymentRow.innerHTML=i.map(e=>'<div class="q-deposit"><p class="q-b">'+t.escapeHtml(e.label)+": "+(Number(e.percent)||0)+"%</p>"+(e.desc?'<p class="q-depdesc">'+t.escapeHtml(e.desc)+"</p>":"")+"</div>").join(""),
s.iFor.textContent=a,s.iDate.textContent=l,s.iItems.innerHTML=itemRowsHtml(o,c,!1),
s.iTerms.innerHTML=termAmounts(c,i).map((e,n)=>'<div class="q-row--pair"><p class="q-c-item">'+t.escapeHtml(termLabel(i[n]))+'</p><span class="q-dot"></span><p class="q-c-price">'+t.formatRupiah(e)+"</p></div>").join(""),
c}async function cloneReady(t){const e=t.documentElement;if(e&&(e.style.setProperty("-webkit-text-size-adjust","none"),
e.style.setProperty("text-size-adjust","none")),t.fonts)try{await Promise.all(a.map(e=>t.fonts.load(e))),await t.fonts.ready}catch(t){}}return{DOCS:i,
STANDARD_TERMS:n,termsFor:function(t){const e=t&&t.payment_terms||[];return t&&"other"===t.payment_scheme&&e.length?e.map(t=>({
label:String(t.label||"").trim()||"Payment",percent:Number(t.percent)||0,desc:String(t.desc||"")})):n.slice()},termLabel:termLabel,
termAmounts:termAmounts,computeTotal:computeTotal,render:render,download:async function(e,n){const c=s[i[e].node],l=render(n);await async function(){
if(document.fonts)try{await Promise.all(a.map(t=>document.fonts.load(t))),await document.fonts.ready}catch(t){}}(),await function(e){
const n=t.$$("img",e);return Promise.all(n.map(t=>t.complete&&t.naturalWidth?Promise.resolve():new Promise(e=>{t.onload=t.onerror=e})))}(c)
;const m=c.offsetWidth,d=c.offsetHeight;let p;
// Snapshot the page over nothing, so the seeded field shows through.
c.style.backgroundColor="transparent";try{p=await html2canvas(c,{scale:3,backgroundColor:null,useCORS:!0,logging:!1,width:m,
// Capture with slack below the measured height. html2canvas lays the
// clone out itself, so its text can land a line or two lower than the
// live DOM did; without slack that overflow is simply clipped off the
// bottom of the page. The extra band is transparent and trimmed below.
height:d+240,onclone:cloneReady})}finally{c.style.backgroundColor=""}const u=function(t,e,n){
const a=t.getContext("2d"),o=t.width,r=Math.max(0,Math.min(n,t.height)),i=t.height-r;if(i<=0)return t;const s=a.getImageData(0,r,o,i).data;let c=-1
;for(let t=i-1;t>=0&&c<0;t--){const e=t*o*4;for(let n=e+3;n<e+4*o;n+=4)if(s[n]>0){c=r+t;break}}
// Nothing spilled past the measured height: drop the whole spare band.
// Otherwise keep down to the last ink and give back the bottom padding, but
// never crop above the measured height — the trailing transparent pixels
// inside the signature mark are part of the design, not overflow.
const l=c<0?r:Math.min(t.height,Math.max(r,Math.round(c+1+e)));if(l===t.height)return t;const m=document.createElement("canvas");return m.width=o,
m.height=l,m.getContext("2d").drawImage(t,0,0),m}(p,192,3*d),h=u.height/3,g=function(e,n,a,o){
const i=t.mulberry32(t.hashString(e)),s=Math.round(n*o),c=Math.round(a*o),l=48,m=Math.max(16,Math.round(l*a/n)),d=document.createElement("canvas")
;d.width=l,d.height=m;const p=d.getContext("2d");p.fillStyle="#EBE9E4",p.fillRect(0,0,l,m);const u=5+Math.floor(4*i());for(let t=0;t<u;t++){
const t=r[Math.floor(i()*r.length)],e=i()*l,n=i()*m,a=(.45+.55*i())*l,o=.45+.9*i(),s=i()*Math.PI,c=(.12+.26*i())*(t[0]<225?.45:1);p.save(),
p.translate(e,n),p.rotate(s),p.scale(1,o);const d=p.createRadialGradient(0,0,0,0,0,a);d.addColorStop(0,"rgba("+t+","+c.toFixed(3)+")"),
d.addColorStop(.55,"rgba("+t+","+(.45*c).toFixed(3)+")"),d.addColorStop(1,"rgba("+t+",0)"),p.fillStyle=d,p.fillRect(-96,2*-m,192,4*m),p.restore()}
const h=document.createElement("canvas");h.width=s,h.height=c;const g=h.getContext("2d");g.imageSmoothingEnabled=!0,g.imageSmoothingQuality="high",
g.drawImage(d,0,0,s,c);
// Grain is generated at CSS resolution and blown up with smoothing OFF, so
// each particle is a crisp scale x scale block. Generating it per device
// pixel instead makes it far too fine — it averages away to flat mush.
const f=Math.round(n),q=Math.round(a),w=document.createElement("canvas");w.width=f,w.height=q
;const y=w.getContext("2d"),b=y.createImageData(f,q),v=b.data;for(let t=0;t<v.length;t+=4){
// Mid-grey is a no-op under "overlay"; the spread around it is the grain.
const e=128+21*(i()-.5)*2;v[t]=v[t+1]=v[t+2]=e,v[t+3]=255}return y.putImageData(b,0,0),g.globalCompositeOperation="overlay",
g.imageSmoothingEnabled=!1,g.drawImage(w,0,0,s,c),g.globalCompositeOperation="source-over",h}(function(t,e){
return[t,String(e.docName||"").trim(),e.date||"",(e.items||[]).map(t=>t.name+"×"+t.qty+"@"+t.price).join("|")].join("::")
}(e,n),m,h,3),f=document.createElement("canvas");f.width=u.width,f.height=u.height;const q=f.getContext("2d");q.drawImage(g,0,0,f.width,f.height),
q.drawImage(u,0,0);const w=o*(f.height/f.width),{jsPDF:y}=window.jspdf,b=new y({orientation:"portrait",unit:"pt",format:[o,w],compress:!0});
// JPEG, not PNG: the grain is un-compressible noise that would push a
// lossless page well past 10 MB. At 3x, 0.95 leaves no visible artefacts.
return b.addImage(f.toDataURL("image/jpeg",.95),"JPEG",0,0,o,w,void 0,"FAST"),b.save(function(e,n){
const a=i[e].name+"-KelakKembali-",o=n.date||t.todayISO(),r=t.sanitizeForFilename(n.docName);return r?a+r+"-"+o+".pdf":a+o+".pdf"}(e,n)),l}}}();