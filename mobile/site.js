/* VELLARIO cinematic UI v5 · static HTML first; media progressive only. */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const save=!!navigator.connection?.saveData;
const frames=[...document.querySelectorAll('[data-media-frame]')];
const menu=document.querySelector('.site-menu');
if(menu){
 const summary=menu.querySelector('summary');
 menu.querySelectorAll('.menu-link').forEach(a=>a.addEventListener('click',()=>menu.removeAttribute('open')));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;summary?.focus();}});
 menu.addEventListener('toggle',()=>document.body.classList.toggle('menu-open',menu.open));
}
let active=null;
const states=new WeakMap();
for(const frame of frames){
 const video=frame.querySelector('video[data-film]');if(!video)continue;
 // V40: use a verified portrait nautical master on narrow devices without touching model-specific identities.
 if(window.matchMedia('(max-width:750px)').matches && video.dataset.srcMobile){
   video.dataset.src=video.dataset.srcMobile;
   if(video.dataset.posterMobile){
     video.poster=video.dataset.posterMobile;
     const poster=frame.querySelector('img.media-poster');
     if(poster)poster.src=video.dataset.posterMobile;
     const portraitStill=frame.querySelector('img.portrait-still');
     if(portraitStill)portraitStill.src=video.dataset.posterMobile;
     if(video.dataset.mobileName){
       const label=frame.querySelector('figcaption span:last-child');
       if(label)label.textContent=video.dataset.mobileName+' · Portrait design study';
     }
   }
   if(video.hasAttribute('data-opening'))video.dataset.segments=video.dataset.srcMobile;
 }
 const button=frame.querySelector('.play-film');
 const parts=(video.dataset.segments||'').split('|').filter(Boolean);
 const state={pausedByUser:false,chapter:0,parts};states.set(frame,state);
 const buttonText=frame.querySelector('.play-label');
 function update(isPlaying){video.classList.toggle('is-playing',isPlaying);if(buttonText)buttonText.textContent=isPlaying?'PAUSE FILM':'PLAY FILM';if(button){button.setAttribute('aria-pressed',String(isPlaying));}}
 video.muted=true;video.playsInline=true;
 video.addEventListener('playing',()=>update(true));
 video.addEventListener('pause',()=>update(false));
 video.addEventListener('error',()=>{video.classList.remove('is-playing');video.hidden=true;if(button)button.hidden=true;});
 video.addEventListener('ended',()=>{if(!parts.length)return;state.chapter=(state.chapter+1)%parts.length;video.src=parts[state.chapter];video.load();if(active===frame&&!document.hidden&&!state.pausedByUser)attempt(frame);});
 if(button)button.addEventListener('click',()=>{if(video.paused){state.pausedByUser=false;attempt(frame,true)}else{state.pausedByUser=true;video.pause();}});
}
function attempt(frame,user=false){
 const video=frame.querySelector('video[data-film]');if(!video||video.hidden)return;
 const state=states.get(frame);if(!user&&(reduce||save||document.hidden||state?.pausedByUser||menu?.open))return;
 if(!video.src){video.src=video.dataset.src||'';video.load();}
 const play=video.play();if(play?.catch)play.catch(()=>{if(user){const text=frame.querySelector('.play-label');if(text)text.textContent='PLAY FILM';}});
}
function pause(frame){const video=frame?.querySelector('video[data-film]');if(video&&!video.paused)video.pause();}
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{
  for(const e of entries){if(e.intersectionRatio>.33){if(active&&active!==e.target)pause(active);active=e.target;attempt(active);}
   else if(e.intersectionRatio<.09){pause(e.target);if(active===e.target)active=null;}}
 },{threshold:[0,.09,.33,.6]});frames.forEach(f=>observer.observe(f));
}else{const first=frames[0];if(first)attempt(first);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)frames.forEach(pause);else if(active)attempt(active);});
window.addEventListener('pagehide',()=>frames.forEach(pause));
if(menu)menu.addEventListener('toggle',()=>{if(menu.open)frames.forEach(pause);else if(active)attempt(active);});
})();

/* VELLARIO V6 · Same 13 routes, one motion layer, no new dependencies. */
(()=>{'use strict';
const w=window,d=document,b=d.body;
if(!b)return;
const reduced=!!w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=d.querySelector('.cinema-hero');
const header=d.querySelector('.site-header');
const meter=d.createElement('div');
meter.className='vellario-scroll-meter';
meter.setAttribute('aria-hidden','true');
meter.innerHTML='<i></i>';
b.appendChild(meter);
const fill=meter.firstElementChild;
let scheduled=false;
function syncScroll(){
 scheduled=false;
 const y=Math.max(0,w.scrollY||0);
 if(header)header.classList.toggle('is-scrolled',y>48);
 const range=Math.max(1,d.documentElement.scrollHeight-w.innerHeight);
 fill.style.transform='scaleX('+Math.min(1,y/range)+')';
 if(hero&&!reduced&&hero.getBoundingClientRect().bottom>0){
  hero.style.setProperty('--v-hero-y',Math.min(115,Math.round(y*.13))+'px');
  hero.style.setProperty('--v-copy-y',Math.min(82,Math.round(y*.07))+'px');
 }
}
function onScroll(){if(!scheduled){scheduled=true;w.requestAnimationFrame(syncScroll)}}
w.addEventListener('scroll',onScroll,{passive:true});
w.addEventListener('resize',onScroll,{passive:true});
syncScroll();
if(!reduced&&'IntersectionObserver' in w){
 const elements=Array.from(d.querySelectorAll('.chapter-shell,.model-card,.gallery-image,.next-chapter'));
 const reveal=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-in-view');reveal.unobserve(entry.target)}
 },{rootMargin:'0px 0px -24px 0px',threshold:.08});
 for(const el of elements){el.classList.add('vellario-reveal');reveal.observe(el)}
}
if(!reduced&&w.matchMedia&&w.matchMedia('(hover:hover) and (pointer:fine)').matches){
 d.querySelectorAll('.model-card').forEach(card=>{
  card.addEventListener('pointermove',e=>{
   const r=card.getBoundingClientRect();
   card.style.setProperty('--v-hover-x',((e.clientX-r.left-r.width/2)/r.width*8).toFixed(2)+'px');
   card.style.setProperty('--v-hover-y',((e.clientY-r.top-r.height/2)/r.height*8).toFixed(2)+'px');
  },{passive:true});
  card.addEventListener('pointerleave',()=>{card.style.removeProperty('--v-hover-x');card.style.removeProperty('--v-hover-y')});
 });
}
if(b.dataset.page!=='home'||reduced)return;
/* VELLARIO V21 — elegant loading-first Como ouverture.
   Original film poster immediately visible, tiny animated wordmark and real media-ready state.
   Progress is intentionally indeterminate (never an invented byte percentage). */
function introLetters(value, kind, start, stagger){
 const glyphs=[...value].map((ch,i)=>'<span class="vellario-v25-glyph" style="animation-delay:'+(start+i*stagger).toFixed(3)+'s">'+(ch===' '?'&nbsp;':ch)+'</span>').join('');
 return '<span class="vellario-v25-'+kind+'" aria-hidden="true">'+glyphs+'</span>';
}
// Asset URL relative to the shared script, not the current HTML route.
const sourceScript=d.querySelector('script[src*="site.js"]');
const emblemUrl=new URL('../assets/brand/approved-20261115/VELLARIO_V_cutout_TRANSPARENT.svg',sourceScript?.src||w.location.href).href;
const curtain=d.createElement('div');
curtain.className='vellario-intro vellario-intro--cinematic vellario-intro--loading';
curtain.setAttribute('role','region');
curtain.setAttribute('aria-label','Apertura VELLARIO — caricamento del film');
curtain.innerHTML=
 '<div class="vellario-intro-scene" aria-hidden="true"></div>'+
 '<div class="vellario-intro-wash" aria-hidden="true"></div>'+
 '<div class="vellario-intro-grain" aria-hidden="true"></div>'+
 '<div class="vellario-intro-top" aria-hidden="true"><span>COMO · ITALIA</span><span>DESIGN ITALIANO</span></div>'+
 '<div class="vellario-intro-center">'+
 '<div class="vellario-intro-mark"><div class="vellario-v25-lockup" role="img" aria-label="VELLARIO — THE ART OF DOLCEVITA — COMO">'+
 '<span class="vellario-v25-v" aria-hidden="true"><img src="'+emblemUrl+'" alt="" decoding="async"></span>'+
 introLetters('VELLARIO','name',.72,.088)+
 '<span class="vellario-v25-tagline" aria-hidden="true">THE ART OF DOLCEVITA</span>'+
 introLetters('COMO','como',1.94,.085)+
 '</div></div>'+
 '<span class="vellario-intro-accent" aria-hidden="true"></span></div>'+
 '<div class="vellario-intro-bottom">'+
 '<div class="vellario-intro-loading-status" role="status" aria-live="polite" aria-atomic="true">'+
 '<div class="vellario-intro-loading-labels"><span class="vellario-intro-loading-copy">CARICAMENTO DEL FILM</span>'+
 '<span class="vellario-intro-loading-state">IN PREPARAZIONE</span></div>'+
 '<span class="vellario-intro-loading-track" aria-hidden="true"><i></i></span></div>'+
 '<button class="vellario-intro-skip" type="button" aria-label="Salta introduzione e mostra VELLARIO">SALTA INTRO <b aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></b></button>'+
 '</div>';
const homePoster=hero?.querySelector('.cinema-backdrop .media-poster');
if(homePoster){
 const src=homePoster.currentSrc||homePoster.src;
 if(src)curtain.querySelector('.vellario-intro-scene').style.backgroundImage='url('+JSON.stringify(src)+')';
}
b.insertBefore(curtain,b.firstChild);
const replay=d.createElement('button');
replay.className='vellario-replay';
replay.type='button';
replay.setAttribute('aria-label','Rivedi introduzione VELLARIO');
replay.textContent='↺ RIVEDI INTRO';
b.appendChild(replay);
const skip=curtain.querySelector('.vellario-intro-skip');
const label=curtain.querySelector('.vellario-intro-loading-copy');
const state=curtain.querySelector('.vellario-intro-loading-state');
const openingVideo=hero?.querySelector('video[data-opening]');
let revealTimer=0,exitTimer=0,maxTimer=0,readyTimer=0,minimumElapsed=false,mediaReady=false,exiting=false;
function cancelIntroTimers(){
 for(const t of [revealTimer,exitTimer,maxTimer,readyTimer])if(t)w.clearTimeout(t);
 revealTimer=exitTimer=maxTimer=readyTimer=0;
}
function endIntro(immediate=false){
 if(exiting||curtain.classList.contains('is-complete'))return;
 exiting=true;cancelIntroTimers();
 curtain.classList.add('is-revealing');
 exitTimer=w.setTimeout(()=>{
  curtain.classList.add('is-complete');
  curtain.classList.remove('is-active','is-revealing');
  exiting=false;
 },immediate?650:940);
}
function readyToEnter(){
 if(!minimumElapsed||!mediaReady||exiting)return;
 if(readyTimer)return;
 readyTimer=w.setTimeout(()=>endIntro(),570);
}
function filmReady(){
 if(!curtain.classList.contains('is-active')||mediaReady||exiting)return;
 mediaReady=true;
 curtain.classList.remove('is-fallback');
 curtain.classList.add('is-ready');
 label.textContent='CARICAMENTO COMPLETATO';
 state.textContent='PRONTO';
 readyToEnter();
}
function fallback(){
 if(!curtain.classList.contains('is-active')||exiting||mediaReady)return;
 curtain.classList.remove('is-ready');
 curtain.classList.add('is-fallback');
 label.textContent='ENTRA NEL MONDO VELLARIO';
 state.textContent='CONTINUA';
 readyTimer=w.setTimeout(()=>endIntro(),450);
}
function checkFilmReady(){
 if(!openingVideo||openingVideo.error){fallback();return}
 if(openingVideo.readyState>=3||(!openingVideo.paused&&openingVideo.readyState>=2))filmReady();
}
function playIntro(){
 cancelIntroTimers();exiting=false;mediaReady=false;minimumElapsed=false;
 curtain.classList.remove('is-active','is-revealing','is-complete','is-ready','is-fallback');
 label.textContent='CARICAMENTO DEL FILM';state.textContent='IN PREPARAZIONE';
 void curtain.offsetWidth;
 curtain.classList.add('is-active');
 // The existing hero playback controller owns play(). Only prime src when it has not loaded yet.
 if(openingVideo&&!openingVideo.getAttribute('src')&&openingVideo.dataset.src){
  openingVideo.src=openingVideo.dataset.src;openingVideo.load();
 }
 checkFilmReady();
 revealTimer=w.setTimeout(()=>{minimumElapsed=true;readyToEnter()},2150);
 // Hard fail-open: a slow, blocked or offline film cannot trap navigation.
 maxTimer=w.setTimeout(()=>{if(!mediaReady)fallback();else endIntro()},5300);
}
skip.addEventListener('click',()=>endIntro(true));
replay.addEventListener('click',()=>{w.scrollTo({top:0,behavior:'instant'});playIntro()});
if(openingVideo){
 for(const event of ['canplay','playing','loadeddata'])openingVideo.addEventListener(event,checkFilmReady);
 openingVideo.addEventListener('error',fallback);
}
w.addEventListener('pageshow',e=>{if(e.persisted)playIntro()});
w.addEventListener('pagehide',()=>{cancelIntroTimers();curtain.classList.add('is-complete')});
w.addEventListener('scroll',()=>{if(w.scrollY>35&&curtain.classList.contains('is-active'))endIntro(true)},{passive:true});
w.addEventListener('wheel',()=>{if(curtain.classList.contains('is-active'))endIntro(true)},{passive:true});
w.addEventListener('touchstart',e=>{
 if(curtain.classList.contains('is-active')&&!e.target.closest('.vellario-intro-skip'))endIntro(true);
},{passive:true});
d.addEventListener('keydown',e=>{
 if(['Escape','ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key)&&curtain.classList.contains('is-active'))endIntro(true);
});
playIntro();
})();


/* VELLARIO V22 — home collection: eagerly prepare and autoplay all five films before scroll.
   Other routes keep visibility-based playback. Safari may suspend offscreen video;
   loading is still primed and visibility re-attempts play. */
(()=>{'use strict';
const w=window,d=document;
const videos=[...d.querySelectorAll('video[data-model-film]')];
if(!videos.length)return;
const eagerHome=d.body?.dataset.page==='home';
const reduced=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
const save=!!navigator.connection?.saveData;
const menu=d.querySelector('.site-menu');
function blocked(){return !!(reduced||save||d.hidden||menu?.open)}
function stop(v){if(!v.paused)v.pause();v.classList.remove('is-playing')}
function start(v){
 if(blocked()||v.hidden)return;
 if(!v.getAttribute('src')){
  const source=v.dataset.src;
  if(!source)return;
  if(eagerHome)v.preload='auto';
  v.src=source;v.load();
 }
 if(!v.paused)return;
 const p=v.play();if(p?.catch)p.catch(()=>v.classList.remove('is-playing'));
}
function refresh(){
 if(blocked()){videos.forEach(stop);return}
 // Keep only visually present yacht films active, including the horizontal collection rail.
 for(const v of videos){
  const r=v.getBoundingClientRect();
  if(r.bottom>50&&r.top<w.innerHeight-50&&r.right>10&&r.left<w.innerWidth-10)start(v);else stop(v);
 }
}
for(const v of videos){
 v.muted=true;v.playsInline=true;
 v.addEventListener('playing',()=>v.classList.add('is-playing'));
 v.addEventListener('pause',()=>v.classList.remove('is-playing'));
 v.addEventListener('error',()=>{stop(v);v.hidden=true});
}
if('IntersectionObserver' in w){
 const io=new IntersectionObserver(entries=>{
  for(const e of entries){
   if(e.isIntersecting&&e.intersectionRatio>.12)start(e.target);
   else stop(e.target);
  }
 },{threshold:[0,.12,.32,.65]});
 videos.forEach(v=>io.observe(v));
}else{w.addEventListener('scroll',refresh,{passive:true})}
d.addEventListener('visibilitychange',refresh);
w.addEventListener('pageshow',refresh);
w.addEventListener('pagehide',()=>videos.forEach(stop));
menu?.addEventListener('toggle',refresh);
refresh();
})();


/* VELLARIO V8 — horizontal yacht journey: touch swipe, desktop arrows/wheel, snap, no page traps. */
(()=>{'use strict';
const w=window,d=document;
const reduce=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rails=[...d.querySelectorAll('[data-yacht-rail]')];
for(const rail of rails){
 const track=rail.querySelector('[data-yacht-track]');
 const cards=[...track.querySelectorAll('.model-card')];
 const prev=rail.querySelector('[data-yacht-prev]');
 const next=rail.querySelector('[data-yacht-next]');
 const current=rail.querySelector('[data-yacht-current]');
 const progress=rail.querySelector('[data-yacht-progress]');
 if(cards.length<2||!prev||!next)return;
 let active=0,frame=0;
 const coordinate=i=>cards[i].offsetLeft-cards[0].offsetLeft;
 const nearest=()=>{
  let best=0,dist=Infinity;
  for(let i=0;i<cards.length;i++){
   const delta=Math.abs(track.scrollLeft-coordinate(i));
   if(delta<dist){dist=delta;best=i}
  }
  return best;
 };
 function update(){
  frame=0;
  active=nearest();
  current.textContent=String(active+1).padStart(2,'0');
  progress.style.transform='scaleX('+((active+1)/cards.length)+')';
  prev.disabled=active===0;
  next.disabled=active===cards.length-1;
 }
 function move(index){
  active=Math.max(0,Math.min(cards.length-1,index));
  track.scrollTo({left:coordinate(active),behavior:reduce?'instant':'smooth'});
  current.textContent=String(active+1).padStart(2,'0');
  progress.style.transform='scaleX('+((active+1)/cards.length)+')';
  prev.disabled=active===0;next.disabled=active===cards.length-1;
 }
 prev.addEventListener('click',()=>move(nearest()-1));
 next.addEventListener('click',()=>move(nearest()+1));
 track.addEventListener('scroll',()=>{if(!frame)frame=w.requestAnimationFrame(update)},{passive:true});
 track.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
   e.preventDefault();
   move(nearest()+(e.key==='ArrowRight'?1:-1));
  }
 });
 w.addEventListener('resize',()=>{if(!frame)frame=w.requestAnimationFrame(update)},{passive:true});
 update();
}
})();


/* VELLARIO V41 — Vertical page scroll is always native (wheel, touch, keyboard). */

/* VELLARIO V19 — contextual first-frame film loading; never fake percentages or stall navigation. */
(()=>{'use strict';
const d=document,w=window;
if(w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(navigator.connection&&navigator.connection.saveData)return;
const videos=[...d.querySelectorAll('.model-card > video[data-model-film],.film-frame--yacht > video[data-film]')];
for(const video of videos){
 const host=video.closest('.model-card,.film-frame--yacht');
 if(!host)continue;
 const loader=d.createElement('span');
 loader.className='vellario-film-loader';
 loader.setAttribute('aria-hidden','true');
 loader.innerHTML='<span class="vellario-film-loader-glyph"></span><span class="vellario-film-loader-label">PREPARAZIONE DEL FILM</span><span class="vellario-film-loader-track"><i></i></span>';
 host.appendChild(loader);
 let delayed=0,failSafe=0,timedOut=false;
 function clear(){
  if(delayed)w.clearTimeout(delayed);
  if(failSafe)w.clearTimeout(failSafe);
  delayed=0;failSafe=0;host.classList.remove('is-buffering');
 }
 function begin(){
  if(video.hidden||d.hidden||timedOut||!video.getAttribute('src'))return;
  if(video.readyState>=3||video.classList.contains('is-playing')){clear();return}
  if(delayed||host.classList.contains('is-buffering'))return;
  delayed=w.setTimeout(()=>{
   delayed=0;
   if(video.hidden||d.hidden||timedOut||video.readyState>=3||video.classList.contains('is-playing'))return;
   host.classList.add('is-buffering');
   failSafe=w.setTimeout(()=>{timedOut=true;clear()},9000);
  },220);
 }
 video.addEventListener('loadstart',()=>{timedOut=false;begin()});
 video.addEventListener('waiting',begin);
 video.addEventListener('stalled',begin);
 video.addEventListener('playing',()=>{timedOut=false;clear()});
 video.addEventListener('canplay',clear);
 video.addEventListener('pause',clear);
 video.addEventListener('error',clear);
 video.addEventListener('abort',clear);
 video.addEventListener('emptied',clear);
 if(video.networkState===2&&video.readyState<3)begin();
 d.addEventListener('visibilitychange',()=>{if(d.hidden)clear()});
}
})();


/* VELLARIO V29 · Start preparing every film at page entry, before scroll.
   Browser scheduling and Save-Data are respected; playback remains visibility-scoped.
   A free small static manifest supplies a conservative zoom for real baked-in black bars. */
(()=>{'use strict';
const d=document,w=window;
const clips=[...d.querySelectorAll('video[data-film],video[data-model-film]')];
if(!clips.length)return;
const reduced=!!w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
const save=!!navigator.connection?.saveData;
const script=d.querySelector('script[src*="site.js"]');
const manifestUrl=new URL('video-framing.json',script?.src||w.location.href);
const filename=url=>{
 try{return decodeURIComponent(new URL(url,w.location.href).pathname.split('/').pop()||'')}
 catch{return String(url||'').split('/').pop().split('?')[0]}
};
function applyNativeZoom(video,record){
 // Preserve the previously approved opening composition on desktop and mobile.
 if(video.hasAttribute('data-opening'))return;
 const zoom=Number(record?.zoom)||1;
 const frame=video.closest('.film-frame,.model-card,.vellario-atlas-tile');
 if(!frame||zoom<1.035||zoom>1.53)return;
 frame.style.setProperty('--v-native-zoom',String(zoom));
 frame.classList.add('has-native-letterbox');
 frame.dataset.nativeZoom=String(zoom);
}
fetch(manifestUrl,{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(index=>{
 if(!index?.videos)return;
 for(const video of clips){
   const source=video.dataset.src||video.getAttribute('src');
   if(source)applyNativeZoom(video,index.videos[filename(source)]);
 }
}).catch(()=>{ /* Poster and ordinary cover framing remain functional offline. */ });
// Prepare matching zero-time stills up front. The still stays visible until
// video 'playing', including while the browser downloads or buffers its bytes.
for(const img of d.querySelectorAll('.film-frame img.media-poster,.film-frame img.portrait-still,.model-card > img,.vellario-atlas-tile--film > img')){
 img.loading='eager';
 img.decoding='async';
}
const ordered=clips.slice().sort((a,b)=>{
 const rank=v=>v.hasAttribute('data-opening')?0:
   v.closest('.cinema-hero')?1:v.closest('.yacht-rail')?2:3;
 return rank(a)-rank(b);
});
function prepare(video){
 if(!video||video.hidden)return;
 if(video.getAttribute('src'))return; // Intro or another controller already primed it.
 if(!video.dataset.src)return;
 video.preload=save?'metadata':'auto';
 video.src=video.dataset.src;
 video.load();
}
let cursor=0;
function startEarlyQueue(){
 const amount=cursor===0?5:4;
 for(let i=0;i<amount && cursor<ordered.length;i++,cursor++){
   prepare(ordered[cursor]);
 }
 if(cursor<ordered.length){
   // Start all remaining downloads without waiting for the page to scroll.
   // Small spacing prevents a low-priority gallery clip starving the hero.
   w.setTimeout(startEarlyQueue,save?260:90);
 }
}
startEarlyQueue();
})();
