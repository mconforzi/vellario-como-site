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
/* Fail open: intro exists only after JS boots; CSS dismisses it even if timers are suspended. */
const curtain=d.createElement('div');
curtain.className='vellario-intro';
curtain.setAttribute('aria-hidden','true');
curtain.innerHTML='<div class="vellario-intro-mark"><span class="brand-lockup brand-lockup--intro" role="img" aria-label="VELLARIO COMO — THE ART OF DOLCE VITA"><span class="brand-lockup-name" aria-hidden="true">VELLARIO</span><svg class="brand-lockup-tagline" viewBox="0 0 1000 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><text x="0" y="43" textLength="1000" lengthAdjust="spacing">THE ART OF DOLCE VITA</text></svg><span class="brand-lockup-como" aria-hidden="true">COMO</span></span></div>';
b.insertBefore(curtain,b.firstChild);
const replay=d.createElement('button');
replay.className='vellario-replay';
replay.type='button';
replay.setAttribute('aria-label','Rivedi introduzione VELLARIO');
replay.textContent='↺ RIVEDI INTRO';
b.appendChild(replay);
let finishTimer=0;
function playIntro(){
 w.clearTimeout(finishTimer);
 curtain.classList.remove('is-active','is-complete');
 void curtain.offsetHeight;
 curtain.classList.add('is-active');
 finishTimer=w.setTimeout(()=>{curtain.classList.add('is-complete');curtain.classList.remove('is-active')},2850);
}
replay.addEventListener('click',()=>{w.scrollTo(0,0);playIntro()});
w.addEventListener('pageshow',e=>{if(e.persisted)playIntro()});
w.addEventListener('pagehide',()=>w.clearTimeout(finishTimer));
playIntro();
})();


/* VELLARIO V7 — lazy playback for video-first collection cards, five matched original yacht films. */
(()=>{'use strict';
const w=window,d=document;
const videos=[...d.querySelectorAll('video[data-model-film]')];
if(!videos.length)return;
const reduced=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
const save=!!navigator.connection?.saveData;
const menu=d.querySelector('.site-menu');
function blocked(){return !!(reduced||save||d.hidden||menu?.open)}
function stop(v){if(!v.paused)v.pause();v.classList.remove('is-playing')}
function start(v){
 if(blocked()||v.hidden)return;
 if(!v.getAttribute('src')){v.src=v.dataset.src||'';if(!v.src)return;v.load()}
 const p=v.play();if(p?.catch)p.catch(()=>v.classList.remove('is-playing'));
}
function refresh(){
 if(blocked()){videos.forEach(stop);return}
 for(const v of videos){
  const r=v.getBoundingClientRect();
  if(r.bottom>50&&r.top<w.innerHeight-50)start(v);else stop(v);
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
  for(const e of entries){if(e.isIntersecting&&e.intersectionRatio>.12)start(e.target);else stop(e.target)}
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
 let active=0,frame=0,wheelAt=0;
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
 track.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  const direction=e.deltaY>0?1:-1;
  const edge=direction>0?track.scrollLeft>=track.scrollWidth-track.clientWidth-3:track.scrollLeft<=3;
  if(edge)return; /* normal page scrolling resumes at the first and last yacht */
  e.preventDefault();
  const now=Date.now();
  if(now-wheelAt<520)return;
  wheelAt=now;
  move(nearest()+direction);
 },{passive:false});
 w.addEventListener('resize',()=>{if(!frame)frame=w.requestAnimationFrame(update)},{passive:true});
 update();
}
})();


/* VELLARIO V13 — hard chapter navigation: each deliberate vertical gesture advances exactly one section.
   Native horizontal yacht swipes/wheel remain independent and unchanged. */
(()=>{'use strict';
const w=window,d=document;
const main=d.querySelector('main');
if(!main)return;
const points=[...d.querySelectorAll('main > .cinema-hero,main > .editorial-section,main > .gallery-chapter,main > .collection-after,main > .next-chapter,body > .site-footer')];
if(points.length<2)return;
const reduced=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
let wheelLast=0,touch=null;
const menu=()=>!!(d.body.classList.contains('menu-open')||d.querySelector('.site-menu[open]'));
const isControl=node=>!!(node instanceof Element && node.closest('button,input,select,textarea,summary,[contenteditable="true"],.site-menu,.menu-panel,[role="dialog"],.chapter-depth[open]'));
const pageTop=node=>node.getBoundingClientRect().top+w.scrollY;
function current(){
 const y=w.scrollY+Math.min(130,w.innerHeight*.18);
 let idx=0;
 for(let i=0;i<points.length;i++)if(pageTop(points[i])<=y)idx=i;
 return idx;
}
function step(dir){
 if(!dir||menu())return;
 const idx=current();
 const next=Math.max(0,Math.min(points.length-1,idx+dir));
 const goal=pageTop(points[next]);
 if(Math.abs(w.scrollY-goal)<2)return;
 w.scrollTo({top:goal,behavior:reduced?'instant':'smooth'});
}
/* Preserve the original horizontal wheel journey until the first/last yacht. */
d.addEventListener('wheel',e=>{
 if(menu()||e.ctrlKey||isControl(e.target)||!e.cancelable)return;
 if(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.15)return;
 const dir=Math.sign(e.deltaY);
 if(!dir)return;
 const rail=e.target instanceof Element?e.target.closest('[data-yacht-track]'):null;
 if(rail){
   const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
   const available=dir>0?rail.scrollLeft<max-3:rail.scrollLeft>3;
   if(available)return;
 }
 e.preventDefault();
 const now=Date.now();
 if(now-wheelLast<480){wheelLast=now;return}
 wheelLast=now;
 step(dir);
},{capture:true,passive:false});
/* iOS Safari: cancel free vertical pan once the gesture direction is clear.
   Do not cancel horizontal gestures, including yacht-card swipes. */
d.addEventListener('touchstart',e=>{
 touch=null;
 if(menu()||e.touches.length!==1||isControl(e.target))return;
 const f=e.touches[0];
 touch={x:f.clientX,y:f.clientY,axis:'',endX:f.clientX,endY:f.clientY};
},{capture:true,passive:true});
d.addEventListener('touchmove',e=>{
 if(!touch||e.touches.length!==1)return;
 const f=e.touches[0];touch.endX=f.clientX;touch.endY=f.clientY;
 const dx=f.clientX-touch.x,dy=f.clientY-touch.y;
 if(!touch.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9)
   touch.axis=Math.abs(dy)>Math.abs(dx)*1.12?'vertical':'horizontal';
 if(touch.axis==='vertical'&&e.cancelable)e.preventDefault();
},{capture:true,passive:false});
d.addEventListener('touchend',e=>{
 if(!touch)return;
 const g=touch;touch=null;
 if(g.axis!=='vertical'||menu())return;
 const dx=g.endX-g.x,dy=g.endY-g.y;
 if(Math.abs(dy)>38&&Math.abs(dy)>Math.abs(dx)*1.1)step(dy<0?1:-1);
},{capture:true,passive:true});
d.addEventListener('touchcancel',()=>{touch=null},{capture:true,passive:true});
d.addEventListener('keydown',e=>{
 if(menu()||e.altKey||e.ctrlKey||e.metaKey||isControl(e.target))return;
 let dir=0;
 if(e.key==='ArrowDown'||e.key==='PageDown')dir=1;
 if(e.key==='ArrowUp'||e.key==='PageUp')dir=-1;
 if(!dir)return;
 e.preventDefault();step(dir);
},{capture:true});
})();

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
