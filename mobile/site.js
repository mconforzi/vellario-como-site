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
curtain.innerHTML='<div class="vellario-intro-mark">VELLARIO<small>COMO</small></div><i class="vellario-intro-rule"></i><p class="vellario-intro-caption">THE ITALIAN ART OF LIVING</p>';
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
