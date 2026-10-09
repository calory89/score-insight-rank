// ── Top3Hotels home v2: photo-first cards, trust layer, real map, filters, compare, alerts, analytics ──
const T3_GA4='';// paste a GA4 measurement ID (G-XXXX) to enable Google Analytics
const CC=__CC__;// country name → ISO code
const CATS=[{k:'budget',c:'#1f7a5a'},{k:'value',c:'#d83b51'},{k:'lux',c:'#9a6b00'}];
const TAGL={pool:'Pool',beach:'Beachfront',pets:'Pets allowed',family:'Family rooms',spa:'Spa',parking:'Free parking',breakfast:'Great breakfast'};
window.t3track=function(e,p){try{(window.dataLayer=window.dataLayer||[]).push(Object.assign({event:e},p||{}));if(window.gtag)gtag('event',e,p||{});if(window.plausible)plausible(e,{props:p||{}});}catch(_){}};
if(T3_GA4){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+T3_GA4;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag('js',new Date());gtag('config',T3_GA4);}
const flag=cc=>cc&&cc.length===2?String.fromCodePoint(...[...cc.toUpperCase()].map(ch=>127397+ch.charCodeAt(0))):'';
const kmBetween=(a,b)=>{const r=x=>x*Math.PI/180,x=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 6371*2*Math.asin(Math.sqrt(x));};
function walkText(h,data){const s=(data.extras&&data.extras.sights)||[];if(!s.length||!h.coordinates)return '';const p={lat:h.coordinates.latitude,lng:h.coordinates.longitude};const best=s.map(x=>({x,d:kmBetween(p,x)})).sort((a,b)=>a.d-b.d)[0];const w=best.d*1.25;return w<=3?`≈ ${Math.max(1,Math.round(w/4.8*60))} min walk to ${best.x.name}`:`${best.d.toFixed(1)} km to ${best.x.name}`;}
function fresh(h){const t=Date.parse((h.booking&&h.booking.checked)||h.checked||'');if(!isFinite(t))return '';const d=Math.max(0,Math.floor((Date.now()-t)/864e5));return d===0?'Price checked today':d===1?'Price checked yesterday':`Price checked ${d} days ago`;}
const TAGRX={pool:/pool/i,beach:/beach/i,pets:/pets? (allowed|friendly)/i,family:/family room/i,spa:/\bspa\b|wellness|sauna/i,parking:/free parking|free private parking/i,breakfast:/breakfast/i};
function tagsOf(h){const ex=h.extras||{};const t=new Set(ex.tags||[]);const txt=[...(h.attributes||[]),...((h.evidence&&h.evidence.highlights)||[]),(h.evidence&&h.evidence.shortReason)||''].join(' | ');for(const k in TAGRX)if(TAGRX[k].test(txt))t.add(k);return [...t];}
function tagsHTML(tags){tags=(tags||[]).filter(t=>TAGL[t]).slice(0,5);return tags.length?`<ul class="v2-chips">${tags.map(t=>`<li data-tag="${t}">${TAGL[t]}</li>`).join('')}</ul>`:'';}
function cardHTML(h,i,data){const c=CATS[i],ex=h.extras||{},lux=i===2&&h.booking.stars<5;const walk=walkText(h,data);
return `<article class="card v2 cat-${c.k} ${i===1?'featured':''} enter" data-tags="${tagsOf(h).join(' ')}" aria-labelledby="hotel-${i}" style="--c:${c.c};animation-delay:${i*70}ms">
<div class="v2-media">${galleryHTML(h,i)}<div class="v2-badges"><span class="v2-cat">${lux?'Upscale alternative':escapeHTML(h.category)}</span>${i===1?'<span class="v2-pick">★ Our pick</span>':''}</div>
<div class="v2-over"><span class="v2-score" title="Booking.com guest score">${h.booking.score.toFixed(1)}</span><span class="v2-price">€${Math.round(h.offer.nightly).toLocaleString('en-US')}<small> /night</small></span></div>${saveButton(h)}</div>
<div class="content"><h3 class="hotel-title" id="hotel-${i}">${escapeHTML(h.name)}</h3>
<div class="v2-meta"><span class="v2-stars" aria-label="${h.booking.stars} stars">${'★'.repeat(h.booking.stars)}</span><span>${escapeHTML(h.area)}</span>${walk?`<span>${escapeHTML(walk)}</span>`:''}</div>
<p class="v2-bestfor"><b>Best for</b>${escapeHTML(v3BestFor(h,i,data))}</p>
<div class="v2-trust"><span><b>${h.booking.count.toLocaleString('en-US')}</b> Booking.com reviews</span>${ex.loc?`<span>Location <b>${ex.loc}</b></span>`:''}<span>${fresh(h)}</span></div>
${ex.pros&&ex.pros.length?`<ul class="v2-pc"><li class="pro"><small>Guests say</small>${escapeHTML(ex.pros[0])}</li>${ex.cons&&ex.cons[0]?`<li class="con">${escapeHTML(ex.cons[0])}</li>`:''}</ul>`:`<p class="reason">${escapeHTML(h.evidence.shortReason)}</p>`}
${tagsHTML(tagsOf(h))}${evidenceHTML(h)}${priceHTML(h)}
<button class="availability" data-hotel="${i}" aria-label="Check availability for ${escapeHTML(h.name)}">Check availability <span aria-hidden="true">↗</span></button></div></article>`;}
// Trip filters: highlight which of the three fit, never more than three.
const FILTERS=[['','Any trip'],['family','Family'],['pool','Pool'],['beach','Beach'],['pets','Pets'],['spa','Spa'],['breakfast','Breakfast'],['parking','Free parking']];
let activeFilter='';
function renderFilters(){const el=$('v2-filters');if(!el)return;const have=new Set([...document.querySelectorAll('#cards .card.v2')].flatMap(c=>(c.dataset.tags||'').split(' ')).filter(Boolean));if(activeFilter&&!have.has(activeFilter))activeFilter='';const fs=FILTERS.filter(([k])=>!k||have.has(k));el.hidden=fs.length<2;el.innerHTML=`<span>Fits my trip:</span>`+fs.map(([k,l])=>`<button type="button" data-filter="${k}" aria-pressed="${activeFilter===k}">${l}</button>`).join('');applyFilter();}
function applyFilter(){const cards=[...document.querySelectorAll('#cards .card.v2')];let n=0;cards.forEach(c=>{const ok=!activeFilter||(c.dataset.tags||'').split(' ').includes(activeFilter);c.classList.toggle('v2-dim',!ok);c.classList.toggle('v2-fit',Boolean(activeFilter)&&ok);if(ok)n++;});const m=$('v2-filter-note');if(m)m.textContent=activeFilter?(n?`${n} of the 3 list this.`:'None of the 3 list this. Check the hotel pages to confirm.'):'';}
document.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){activeFilter=b.dataset.filter;renderFilters();t3track('trip_filter',{filter:activeFilter,city:currentCity});}});
// Real map (MapLibre + OpenFreeMap), lazy-loaded
let v2MapLib=null,v2Map=null,v2Markers=[];
function loadMapLib(){if(v2MapLib)return v2MapLib;v2MapLib=new Promise((ok,no)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';document.head.appendChild(l);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';s.onload=()=>ok(window.maplibregl);s.onerror=no;document.head.appendChild(s);});return v2MapLib;}
const legacyPositionMap=renderPositionMap;
renderPositionMap=function(data){let box=$('v2-map');if(!box){box=document.createElement('div');box.id='v2-map';box.setAttribute('role','img');box.setAttribute('aria-label','Map of the three hotels and the city’s best-known sights');$('location-links').prepend(box);}
const old=$('position-map');if(old)old.remove();
const draw=()=>loadMapLib().then(ml=>{const dark=matchMedia('(prefers-color-scheme: dark)').matches;const pts=data.hotels.map((h,i)=>({n:i+1,name:h.name,lat:h.coordinates.latitude,lng:h.coordinates.longitude,c:CATS[i].c}));const km=(a,b)=>{const r=x=>x*Math.PI/180,x=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 12742*Math.asin(Math.sqrt(x))};const cen={lat:pts.reduce((t,p)=>t+p.lat,0)/pts.length,lng:pts.reduce((t,p)=>t+p.lng,0)/pts.length};const ss=((data.extras&&data.extras.sights)||[]).filter(p=>km(cen,p)<=3);try{const mc=document.querySelector('#map .map-copy');if(mc){let ul=mc.querySelector('.v3-sights');if(!ul){ul=document.createElement('ul');ul.className='v3-sights';mc.appendChild(ul);}const v=pts[1]||pts[0];ul.innerHTML=ss.length?'<li class="h">Walking from the Best Value pick</li>'+ss.map(p=>{const m=Math.max(1,Math.round(km(v,p)*1.25/4.8*60));return '<li><span>'+escapeHTML(p.name)+'</span><b>'+(m<=45?m+' min walk':(km(v,p)).toFixed(1)+' km')+'</b></li>'}).join(''):'';}}catch(_){}
if(v2Map&&v2Map.getContainer()!==box){try{v2Map.remove()}catch(_){}v2Map=null;}if(!v2Map){v2Map=new ml.Map({container:box,style:'https://tiles.openfreemap.org/styles/'+(dark?'dark':'positron'),center:[pts[0].lng,pts[0].lat],zoom:12,attributionControl:{compact:true},cooperativeGestures:true});v2Map.addControl(new ml.NavigationControl({showCompass:false}));}
v2Markers.forEach(m=>m.remove());v2Markers=[];const b=new ml.LngLatBounds();
pts.forEach(p=>{const d=document.createElement('div');d.className='v2-pin';d.style.background=p.c;d.textContent=p.n;v2Markers.push(new ml.Marker({element:d}).setLngLat([p.lng,p.lat]).setPopup(new ml.Popup({offset:18}).setText(p.name)).addTo(v2Map));b.extend([p.lng,p.lat]);});
ss.forEach(p=>{const d=document.createElement('div');d.className='v2-sight';v2Markers.push(new ml.Marker({element:d}).setLngLat([p.lng,p.lat]).setPopup(new ml.Popup({offset:10}).setText(p.name)).addTo(v2Map));b.extend([p.lng,p.lat]);});
v2Map.fitBounds(b,{padding:48,maxZoom:15,duration:v2Markers.length?600:0});}).catch(()=>{box.remove();legacyPositionMap(data);});
if('IntersectionObserver' in window&&(!v2Map||v2Map.getContainer()!==box)){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();draw();}},{rootMargin:'400px'});io.observe(box);}else draw();};
// City hero photo (Wikimedia Commons) via /api/thumb
function renderHero(id){const box=$('v2-hero');if(!box)return;const d=HOTELS[id];const h=d&&d.extras&&d.extras.hero;if(!h||!h.img){box.hidden=true;return;}const img=box.querySelector('img');const base='/api/img/'+encodeURIComponent(id);const big=base+(innerWidth<960?'/mid':'/big');if(img.dataset.hero!==id){img.dataset.hero=id;img.onerror=()=>{img.onerror=null;img.removeAttribute('srcset');img.src=base+'/orig';};img.classList.remove('loaded');img.srcset=base+'/small 500w, '+base+'/mid 960w, '+base+'/big 1280w';img.sizes='(max-width: 900px) 100vw, 1180px';img.src=big;img.alt=d.city;}box.querySelector('small').innerHTML=h.page?`Photo: <a href="${escapeHTML(h.page)}" target="_blank" rel="noopener nofollow">Wikimedia Commons</a>`:'';box.hidden=false;}
// Mobile sticky CTA follows the card in view
function stickyInit(){let bar=$('v2-sticky');if(!bar){bar=document.createElement('div');bar.id='v2-sticky';bar.innerHTML='<button type="button"></button>';document.body.appendChild(bar);bar.firstChild.addEventListener('click',()=>{const i=Number(bar.dataset.i||1);const b=document.querySelector(`#cards .availability[data-hotel="${i}"]`);if(b)b.click();});}
const set=i=>{const d=HOTELS[currentCity];if(!d)return;const h=d.hotels[i];bar.dataset.i=i;bar.style.setProperty('--c',CATS[i].c);bar.firstChild.innerHTML=`<span>${escapeHTML(h.category)} · €${Math.round(h.offer.nightly)}</span><b>Check availability ↗</b>`;};
set(1);const cards=[...document.querySelectorAll('#cards .card.v2')];if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.6)set(cards.indexOf(e.target));});},{root:$('cards'),threshold:[.6]});cards.forEach(c=>io.observe(c));}
const sec=$('results');if('IntersectionObserver' in window&&sec){new IntersectionObserver(es=>bar.classList.toggle('show',es[0].isIntersecting),{threshold:.05}).observe(sec);}}
// Skeleton while a city loads + fade-in photos
function skeleton(){$('cards').innerHTML=[0,1,2].map(i=>`<article class="card v2 v2-skel" style="--c:${CATS[i].c}" aria-hidden="true"><div class="v2-media"></div><div class="content"><i></i><i></i><i></i><i></i></div></article>`).join('');}
document.addEventListener('load',e=>{if(e.target.tagName==='IMG')e.target.classList.add('loaded');},true);
function markLoaded(){document.querySelectorAll('#cards img, #v2-hero img').forEach(i=>{if(i.complete)i.classList.add('loaded');});setTimeout(()=>document.querySelectorAll('#cards img').forEach(i=>i.classList.add('loaded')),2500);}
// Hook into city rendering
const v2Render=renderCity;
renderCity=function(id,announce=true){if(!HOTELS[id]&&destinationById(id))skeleton();v2Render(id,announce);};
function v2After(id){renderHero(id);renderFilters();stickyInit();markLoaded();const d=HOTELS[id];if(d)t3track('city_view',{city:id});}
const v2AfterCity=afterCity;
afterCity=function(id,announce){v2AfterCity(id,announce);v2After(id);};
// Compare prices across sites + price alert in the availability dialog
const v2Open=openHotel;
openHotel=function(i){v2Open(i);const d=HOTELS[currentCity];if(!d)return;const h=d.hotels[i];const a=$('checkin').value,b=$('checkout').value;const q=h.name+', '+d.city;
const ex=new URL('https://www.expedia.com/Hotel-Search');ex.searchParams.set('destination',q);ex.searchParams.set('adults','2');if(a&&b){ex.searchParams.set('startDate',a);ex.searchParams.set('endDate',b);}
const ag=new URL('https://www.agoda.com/search');ag.searchParams.set('textToSearch',q);ag.searchParams.set('adults','2');ag.searchParams.set('rooms','1');if(a&&b){ag.searchParams.set('checkIn',a);ag.searchParams.set('los',String(Math.max(1,Math.round((Date.parse(b)-Date.parse(a))/864e5))));}
const links=[['Expedia',ex.toString()],['Agoda',ag.toString()],['Google Hotels','https://www.google.com/travel/search?q='+encodeURIComponent(q)]];
let box=$('v2-compare');if(!box){box=document.createElement('div');box.id='v2-compare';$('official-link').after(box);}
box.innerHTML=`<p>Compare live prices for your dates</p><div>${links.map(([n,u])=>`<a href="${escapeHTML(u)}" target="_blank" rel="noopener nofollow" data-compare="${n}">${n} ↗</a>`).join('')}</div>`;
alertForm(h,d);t3track('open_hotel',{city:currentCity,category:h.category});};
document.addEventListener('click',e=>{const a=e.target.closest('#booking-link');if(a)t3track('check_availability',{city:currentCity,provider:'booking'});const c=e.target.closest('[data-compare]');if(c)t3track('compare_click',{city:currentCity,provider:c.dataset.compare});});
let alertsEnabled=null;
fetch('/api/alerts').then(r=>r.json()).then(j=>{alertsEnabled=Boolean(j.enabled);}).catch(()=>{alertsEnabled=false;});
function alertForm(h,d){let f=$('v2-alert');if(!alertsEnabled){if(f)f.hidden=true;return;}if(!f){f=document.createElement('form');f.id='v2-alert';$('source-note').before(f);}
const target=Math.round(h.offer.nightly*0.85);f.hidden=false;f.innerHTML=`<p><b>Price alert</b> · Email me if ${escapeHTML(h.name)} drops below</p><div><label class="sr-only" for="v2-max">Maximum price per night</label><input id="v2-max" type="number" min="1" value="${target}" required> €/night <label class="sr-only" for="v2-email">Email</label><input id="v2-email" type="email" placeholder="you@email.com" required autocomplete="email"><button type="submit">Alert me</button></div><small id="v2-alert-status" role="status"></small>`;
f.onsubmit=ev=>{ev.preventDefault();const st=$('v2-alert-status');st.textContent='Saving…';fetch('/api/alerts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('v2-email').value,city:d.city,category:h.category,max:Number($('v2-max').value)})}).then(r=>{st.textContent=r.ok?'Done. We will email you when it drops.':'Could not save the alert. Please try again.';if(r.ok)t3track('price_alert',{city:currentCity,category:h.category});}).catch(()=>{st.textContent='Could not save the alert. Please try again.';});};}
