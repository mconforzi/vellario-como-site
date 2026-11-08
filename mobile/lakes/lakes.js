/* VELLARIO · COMO: isolated editorial footage only; model player and source catalogue untouched. */
(()=>{
'use strict';
const chapters=[...document.querySelectorAll('[data-chapter]')];
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const view=new Map();
let active=null;
for(const s of chapters){
 const v=s.querySelector('video'),play=s.querySelector('.play'),quality=s.querySelector('.quality'),status=s.querySelector('.state');
 const state={video:v,play,quality,status,scene:s,pausedByUser:false,mode:'mobile',loading:false};
 view.set(s,state);
 v.muted=true;v.playsInline=true;v.loop=true;
 function updatePlaying(){v.classList.toggle('playing',!v.paused&&v.readyState>1);play.textContent=v.paused?'Riproduci':'Pausa'}
 v.addEventListener('playing',updatePlaying);
 v.addEventListener('pause',updatePlaying);
 v.addEventListener('loadedmetadata',()=>{
  state.loading=false;
  const width=v.videoWidth,height=v.videoHeight;
  status.textContent=(state.mode==='4k'?'Originale 4K':'Anteprima mobile')+' · '+width+'×'+height;
 });
 v.addEventListener('error',()=>{
  state.loading=false;
  v.classList.remove('playing');
  if(state.mode==='4k'){
   status.textContent='Originale non compatibile, ripristino l’anteprima MP4';
   state.mode='mobile';quality.textContent='Originale 4K';
   v.src=v.dataset.mobile;v.load();
   if(active===s&&!state.pausedByUser&&!document.hidden&&!reduced)start(state);
  }else{
   status.textContent='Video non disponibile · Fotografia visibile';
   v.classList.remove('playing');v.hidden=true;
  }
 });
 play.addEventListener('click',()=>{
  if(v.paused){state.pausedByUser=false;start(state);}
  else{state.pausedByUser=true;v.pause();updatePlaying();}
 });
 quality.addEventListener('click',()=>{
  if(state.mode==='mobile'){
   const estimate=s.id==='como'?'circa 596 MB':s.id==='dolce-vita'?'circa 157 MB':s.id==='history'?'circa 9 MB':'circa 8 MB';
   if(!confirm('Aprire il filmato originale in 4K? Il file Wikimedia può richiedere '+estimate+' di traffico.'))return;
   state.mode='4k';quality.textContent='1080p mobile';state.loading=true;
   status.textContent='Caricamento originale 4K…';
   v.hidden=false;v.src=v.dataset['4k'];v.load();
   state.pausedByUser=false;start(state);
  }else{
   state.mode='mobile';quality.textContent='Originale 4K';state.loading=true;
   v.hidden=false;v.src=v.dataset.mobile;v.load();
   state.pausedByUser=false;start(state);
  }
 });
}
function start(s){
 if(document.hidden||!s||s.pausedByUser)return;
 const v=s.video;
 if(v.hidden)return;
 const promise=v.play();
 if(promise&&promise.catch)promise.catch(()=>{
  if(s.mode==='4k'&&v.error)return;
  if(s.mode==='mobile'&&!v.error)s.status.textContent='Tocca Riproduci per avviare il video';
 });
}
const observer=new IntersectionObserver(entries=>{
 for(const e of entries){
  const s=view.get(e.target);if(!s)continue;
  if(e.intersectionRatio>=.36){
   if(active&&active!==e.target)view.get(active)?.video.pause();
   active=e.target;
   if(!reduced)start(s);
  }else if(e.intersectionRatio<.18){
   s.video.pause();
   if(active===e.target)active=null;
  }
 }
},{threshold:[0,.18,.36,.7]});
chapters.forEach(s=>observer.observe(s));
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)for(const s of view.values())s.video.pause();
 else if(active&&!reduced)start(view.get(active));
});
window.addEventListener('pagehide',()=>{for(const s of view.values())s.video.pause()});
})();
