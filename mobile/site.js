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