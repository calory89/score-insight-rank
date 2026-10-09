// ── home v3: magazine hero, near you, quick dates, language hint, "best for" ──
(function(){
  // Rotating full-bleed hero (city photos served first-party)
  const bg=document.getElementById('v3-bg');
  if(bg){const ids=['london','paris','amsterdam-netherlands','barcelona','copenhagen-denmark','rome'];const names=['London','Paris','Amsterdam','Barcelona','Copenhagen','Rome'];const size=innerWidth<700?'small':'mid';let k=0;const credit=document.getElementById('v3-credit');
    const show=i=>{let im=bg.querySelector(`img[data-i="${i}"]`);if(!im){im=new Image();im.alt='';im.decoding='async';im.dataset.i=i;im.src=`/api/img/${ids[i]}/${size}`;bg.appendChild(im);}
      const go=()=>{bg.querySelectorAll('img.on').forEach(x=>x.classList.remove('on'));im.classList.add('on');if(credit)credit.textContent=names[i]+' · Wikimedia Commons';};if(im.complete&&im.naturalWidth)go();else im.onload=go;};
    show(0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(()=>{if(document.hidden)return;k=(k+1)%ids.length;show(k);},7000);}
  // Quick dates
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v3q]');if(!b)return;e.preventDefault();const n=+b.dataset.v3q,d0=new Date();let a;if(n<0){a=new Date(d0.getTime()+((5-d0.getDay()+7)%7+(n===-2?7:0))*864e5);}else a=new Date(d0.getTime()+n*864e5);const c=new Date(a.getTime()+2*864e5),iso=x=>x.toISOString().slice(0,10);
    const ci=$('checkin'),co=$('checkout');ci.value=iso(a);co.value=iso(c);[ci,co].forEach(x=>{x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));});
    try{validateDates();updateSearchLinks();document.querySelectorAll('.quote-change').forEach(n=>n.hidden=false);}catch(_){}t3track('quick_dates',{when:n});});
  // Near you (Cloudflare geo)
  fetch('/api/geo').then(r=>r.ok?r.json():null).then(j=>{if(!j||!j.near||!j.near.length)return;const box=document.querySelector('.hero .popular');if(!box)return;const s=document.createElement('span');s.className='v3-near';
    s.innerHTML='<span>Near you:</span>'+j.near.slice(0,4).map(c=>`<button class="city-chip" type="button" data-v3city="${escapeHTML(c.id)}">${escapeHTML(c.city)}</button>`).join('');box.appendChild(s);}).catch(()=>{});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v3city]');if(!b)return;renderCity(b.dataset.v3city);const r=$('results');if(r)r.scrollIntoView({behavior:'smooth'});t3track('near_you',{city:b.dataset.v3city});});
  // Language hint (no automatic redirect)
  const LBL={es:['Ver Top3Hotels en español','/es'],de:['Top3Hotels auf Deutsch','/de'],fr:['Top3Hotels en français','/fr'],it:['Top3Hotels in italiano','/it'],pt:['Top3Hotels em português','/pt'],da:['Se Top3Hotels på dansk','/da']};
  let dismissed=false;try{dismissed=localStorage.getItem('t3-lang')==='1';}catch(_){}
  const want=(navigator.languages||[navigator.language||'']).map(x=>String(x).slice(0,2).toLowerCase()).find(x=>LBL[x]);
  if(want&&!dismissed&&!/[?&]lang=/.test(location.search)){const d=document.createElement('div');d.className='v3-lang';d.setAttribute('role','note');d.innerHTML=`<span aria-hidden="true">🌐</span><a href="${LBL[want][1]}">${LBL[want][0]} →</a><button type="button" aria-label="Dismiss">×</button>`;d.querySelector('button').onclick=()=>{d.remove();try{localStorage.setItem('t3-lang','1');}catch(_){}};const showL=()=>{if(document.querySelector('.cbar'))return setTimeout(showL,1500);document.body.appendChild(d)};setTimeout(showL,1800);}
})();
// "Best for" line on each card
function v3BestFor(h,i,data){const ex=h.extras||{};const tags=typeof tagsOf==='function'?tagsOf(h):(ex.tags||[]);const out=[['Smart-budget trips','Most travellers','Special occasions'][i]];const M={family:'Families',spa:'Wellness breaks',beach:'Beach holidays',pool:'Pool days',pets:'Travelling with a dog'};
  for(const k in M)if(tags.includes(k))out.push(M[k]);const w=typeof walkText==='function'?walkText(h,data):'';const m=/≈ (\d+) min/.exec(w);if(m&&+m[1]<=15)out.push('Sightseeing on foot');return [...new Set(out)].slice(0,3).join(' · ');}
// "/" focuses the search; surprise chip; recently viewed cities (shared with the city pages)
(function(){
  document.addEventListener('keydown',function(e){var t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'))return;if(e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){var i=document.getElementById('destination');if(i){e.preventDefault();i.focus();i.select&&i.select()}}});
  var box=document.querySelector('.hero .popular');if(!box)return;
  var a=document.createElement('a');a.className='city-chip';a.href='/random';a.textContent='🎲 Surprise me';a.style.textDecoration='none';box.appendChild(a);
  var r=[];try{r=JSON.parse(localStorage.getItem('t3-recent')||'[]')}catch(_){}
  if(r.length){var s=document.createElement('span');s.className='v3-near';s.innerHTML='<span>Recently viewed:</span>'+r.slice(0,4).map(function(x){return '<a class="city-chip" style="text-decoration:none" href="/'+encodeURIComponent(x.s)+'">'+escapeHTML(x.c)+'</a>'}).join('');box.appendChild(s)}
})();
