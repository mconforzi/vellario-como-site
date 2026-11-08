/* VELLARIO static first. This JS is optional enhancement for cinema only. */
(()=>{
'use strict';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData=navigator.connection?.saveData||false;
const frames=[...document.querySelectorAll('[data-media-frame]')];
let focused=null;
function load(v){if(!v.src){v.src=v.dataset.src||'';v.load()}}
function play(frame,byUser=false){
 const v=frame.querySelector('video[data-film]');if(!v)return;
 if(reduced&&!byUser||saveData&&!byUser||document.hidden)return;
 load(v);v.muted=true;v.playsInline=true;
 const promise=v.play();if(promise&&promise.catch)promise.catch(()=>{v.classList.remove('is-playing');update(frame,false)});
}
function update(frame,playing){
 const b=frame.querySelector('.play-film');
 if(b)b.textContent=playing?'Pause film':'Play film';
}
function pause(frame){const v=frame.querySelector('video[data-film]');if(!v)return;v.pause();v.classList.remove('is-playing');update(frame,false)}
for(const frame of frames){
 const v=frame.querySelector('video[data-film]');
 if(!v)continue;
 v.addEventListener('playing',()=>{v.classList.add('is-playing');update(frame,true)});
 v.addEventListener('pause',()=>{v.classList.remove('is-playing');update(frame,false)});
 v.addEventListener('error',()=>{v.classList.remove('is-playing');v.hidden=true;update(frame,false)});
 const button=frame.querySelector('.play-film');
 if(button)button.addEventListener('click',()=>{
  if(v.hidden)return;
  if(v.paused)play(frame,true);else pause(frame);
 });
 if(v.hasAttribute('data-opening')){
  const parts=(v.dataset.segments||'').split('|').filter(Boolean);
  let index=0;
  v.addEventListener('ended',()=>{
   if(!parts.length)return;
   index=(index+1)%parts.length;
   v.src=parts[index];v.load();
   if(focused===frame&&!document.hidden&&!reduced)play(frame,false);
  });
 }
}
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
     const frame=entry.target;
     if(entry.intersectionRatio>.36){
       if(focused&&focused!==frame)pause(focused);
       focused=frame;play(frame,false);
     }else if(entry.intersectionRatio<.12){
       pause(frame);if(focused===frame)focused=null;
     }
   }
 },{threshold:[0,.12,.36,.7]});
 frames.forEach(f=>observer.observe(f));
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)frames.forEach(pause);
 else if(focused)play(focused,false);
});
window.addEventListener('pagehide',()=>frames.forEach(pause));
})();
