/* VELLARIO COMO — original cinematic interaction engine
   Scroll-orchestrated films + model dial. Zero external JS dependencies. */
(()=>{
'use strict';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const clamp=(a,b,c)=>Math.max(a,Math.min(b,c));
const ease=x=>1-Math.pow(1-x,3);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modelData=[
 {key:'quantum',name:'Quantum 999',num:'01',intro:'The unexpected.',copy:'A distinctive exercise in Italian nautical form. Original design studies from the private archive.',still:'assets/vario/quantum.webp',film:'assets/vario/quantum-hd.mp4',portrait:true,detail:'assets/vario/quantum-detail.webp'},
 {key:'mas36',name:'MAS 36',num:'02',intro:'Proportions before everything.',copy:'A study of Italian maritime elegance, with precise lines and a confident sporting identity.',still:'assets/vario/mas36.webp',film:'',portrait:false,detail:'assets/vario/mas36.webp'},
 {key:'mas52',name:'MAS 52',num:'03',intro:'An evolving design study.',copy:'The original MAS 52 media are being identified. Other designs are not presented as this model.',still:'',film:'',portrait:false,detail:''},
 {key:'grantender',name:'GranTender 72',num:'04',intro:'A different way to live on water.',copy:'An open-deck vision of generous proportions and Italian lifestyle. Previously archived as MaxiTender.',still:'assets/vario/grantender.webp',film:'assets/vario/grantender-hd.mp4',portrait:true,detail:'assets/vario/grantender-2.webp'},
 {key:'granmarlin',name:'Gran Marlin',num:'05',intro:'The timeless gesture.',copy:'Elegant volume and recognisable character, explored through the original design archive.',still:'assets/vario/gran-marlin.webp',film:'assets/vario/gran-marlin.mp4',portrait:false,detail:'assets/vario/gran-marlin-2.webp'}
];
const motionData=[
 {name:'The profile',kicker:'01 / DESIGN STUDY',line:'Form becomes a feeling.',file:'MAS 46 · MOTION STUDY',still:'assets/vario/mas46-poster.webp',film:'assets/vario/mas46-detail.mp4',portrait:false},
 {name:'Open horizons',kicker:'02 / THE ART OF OPEN AIR',line:'The world, without a frame.',file:'GRANTENDER · ORIGINAL STUDY',still:'assets/vario/grantender-2.webp',film:'assets/vario/grantender-hd.mp4',portrait:true},
 {name:'A signature',kicker:'03 / A DISTINCTIVE LINE',line:'Every proportion has a purpose.',file:'GRAN MARLIN · ORIGINAL STUDY',still:'assets/vario/gran-marlin-2.webp',film:'assets/vario/gran-marlin.mp4',portrait:false},
 {name:'New perspectives',kicker:'04 / ON THE WATER',line:'The unexpected, in motion.',file:'QUANTUM · ORIGINAL STUDY',still:'assets/vario/quantum-detail.webp',film:'assets/vario/quantum-hd.mp4',portrait:true}
];
const menuBtn=$('#menuButton'),menu=$('#menuPanel'),dialog=$('#privateDialog');
let menuOpen=false;
function lock(){document.body.classList.toggle('is-locked',menuOpen || (dialog&&dialog.classList.contains('is-open')))}
function toggleMenu(open){
 menuOpen=!!open;menu.classList.toggle('is-open',menuOpen);
 menu.setAttribute('aria-hidden',String(!menuOpen));
 menuBtn.setAttribute('aria-expanded',String(menuOpen));
 lock();
}
menuBtn&&menuBtn.addEventListener('click',()=>toggleMenu(!menuOpen));
$$('#menuPanel a').forEach(a=>a.addEventListener('click',()=>toggleMenu(false)));
$('#openPrivate')&&$('#openPrivate').addEventListener('click',()=>{dialog.classList.add('is-open');dialog.setAttribute('aria-hidden','false');lock();$('.modal-close',dialog).focus()});
$$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>{dialog.classList.remove('is-open');dialog.setAttribute('aria-hidden','true');lock()}));
$('#copyEnquiry')&&$('#copyEnquiry').addEventListener('click',async e=>{
 try{await navigator.clipboard.writeText('VELLARIO · COMO — Private introduction request\nI would like to receive further information about the new nautical maison.');e.currentTarget.textContent='REQUEST TEXT COPIED ✓'}catch{e.currentTarget.textContent='COPY UNAVAILABLE — USE YOUR EMAIL APPLICATION'}
});
addEventListener('keydown',e=>{
 if(e.key==='Escape'){toggleMenu(false);if(dialog&&dialog.classList.contains('is-open')){dialog.classList.remove('is-open');dialog.setAttribute('aria-hidden','true');lock()}}
});
const siteHeader=$('#header'),progressFill=$('#progressFill'),railNumber=$('#railNumber'),railLabel=$('#railLabel'),railMark=$('#railMark');
const hero=$('#opening'),heroVideo=$('#heroVideo'),filmFrame=$('#heroFilm');
const heroSources=['assets/vario/mas46-full.mp4','assets/vario/mas46-part-02.mp4','assets/vario/mas46-part-03.mp4','assets/vario/mas46-part-04.mp4','assets/vario/mas46-part-05.mp4','assets/vario/mas46-part-06.mp4'];
let heroPart=0,heroWasVisible=false;
heroVideo.muted=true;heroVideo.loop=false;heroVideo.playsInline=true;
function nextHeroPart(){
 heroPart=(heroPart+1)%heroSources.length;
 heroVideo.src=heroSources[heroPart];heroVideo.load();
 if(heroWasVisible&&!menuOpen)heroVideo.play().catch(()=>{});
}
heroVideo.addEventListener('ended',nextHeroPart);
heroVideo.addEventListener('playing',()=>filmFrame.classList.add('is-playing'));
heroVideo.addEventListener('error',()=>{filmFrame.classList.remove('is-playing')});
function runHero(inView){
 if(heroWasVisible===inView)return;
 heroWasVisible=inView;
 if(inView&&!menuOpen){heroVideo.play().catch(()=>filmFrame.classList.remove('is-playing'))}
 else heroVideo.pause();
}
const manifesto=$('#manifest'),gallery=$('#editorial');
const collection=$('#collection'),collectionMedia=$('#selectorMedia'),modelStill=$('#selectorStill'),modelFilm=$('#selectorMotion'),motionWindow=$('#selectorMotionWindow'),missingVisual=$('#selectorPlaceholder');
const modelName=$('#selectorTitle'),modelIntro=$('#selectorIntro'),modelCopy=$('#selectorDescription'),modelCount=$('#selectorCounter'),modelProgress=$('#selectorProgress'),modelLink=$('#selectorLink');
const modelButtons=$$('[data-select-model]');
let activeModel=-1,selectorVisible=false,modelToken=0,modelTimer=0;
const routeToModel=i=>{
 const travel=Math.max(1,collection.offsetHeight-innerHeight);
 const target=collection.getBoundingClientRect().top+scrollY+travel*((i+.45)/5);
 scrollTo({top:target,behavior:reduce?'instant':'smooth'});
};
modelButtons.forEach((b,i)=>b.addEventListener('click',()=>routeToModel(i)));
let dragStart=null;
const selectorStage=$('#selectorStage');
selectorStage.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY}});
selectorStage.addEventListener('pointerup',e=>{
 if(!dragStart)return;let dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;dragStart=null;
 if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.25)routeToModel(clamp(0,4,activeModel+(dx<0?1:-1)));
});
document.addEventListener('keydown',e=>{
 if(menuOpen||dialog?.classList.contains('is-open'))return;
 const box=collection.getBoundingClientRect();
 if(box.top<innerHeight*.3&&box.bottom>innerHeight*.7&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
   e.preventDefault();routeToModel(clamp(0,4,activeModel+(e.key==='ArrowRight'?1:-1)));
 }
});
const updateSelectorUI=(m,i)=>{
 modelCount.textContent=m.num+' / 05';$('#selectorWheelNumber').textContent=m.num;modelName.textContent=m.name;modelIntro.textContent=m.intro;modelCopy.textContent=m.copy;
 modelProgress.style.setProperty('--wheel-progress',String((i+1)/5));
 modelLink.href=m.detail||'#editorial';modelLink.target=m.detail?'_blank':'_self';modelLink.rel=m.detail?'noopener':'';modelLink.textContent=m.detail?'VIEW THE DESIGN IMAGE ↗':'DESIGN PHILOSOPHY ↗';
 const legacy=$('#modelArchive');
 legacy.href=m.detail||'#collection';legacy.textContent=m.detail?'DISCOVER THE ORIGINAL IMAGE ↗':'MEDIA IN CURATION';
 legacy.hidden=!m.detail;
 modelButtons.forEach((b,j)=>{b.classList.toggle('is-active',j===i);b.setAttribute('aria-selected',String(j===i))});
};
const setModel=(i,immediate=false)=>{
 i=clamp(0,4,i);if(i===activeModel)return;
 activeModel=i;const m=modelData[i],token=++modelToken;
 collectionMedia.classList.add('is-switching');
 clearTimeout(modelTimer);
 const swap=()=>{
  if(token!==modelToken)return;
  modelFilm.pause();modelFilm.removeAttribute('src');modelFilm.load();motionWindow.classList.remove('is-ready');
  modelStill.style.opacity=m.still?'1':'0';
  collectionMedia.classList.toggle('is-unverified',!m.still);
  missingVisual.hidden=!!m.still;
  if(m.still)modelStill.src=m.still;
  updateSelectorUI(m,i);
  collection.style.setProperty('--orbit-angle',String((i-2)*2.2));
  collection.style.setProperty('--text-y',String((i%2===0?1:-1)*4)+'px');
  if(m.film && selectorVisible && !reduce){
    modelFilm.src=m.film;modelFilm.loop=true;modelFilm.muted=true;modelFilm.playsInline=true;
    modelFilm.style.objectFit=m.portrait&&innerWidth>760?'cover':'contain';
    modelFilm.play().then(()=>{if(token===modelToken)motionWindow.classList.add('is-ready')}).catch(()=>{});
  }
  requestAnimationFrame(()=>{if(token===modelToken)collectionMedia.classList.remove('is-switching')});
 };
 if(immediate||reduce)swap();else modelTimer=setTimeout(swap,130);
};
const filmScroll=$('#filmJourney'),filmPoster=$('#filmPoster'),filmTitle=$('#filmTitle'),filmSubtitle=$('#filmSubtitle'),filmKicker=$('#filmKicker'),filmFile=$('#filmFile'),filmNumber=$('#filmNumber');
const filmButtons=$$('[data-film-select]'),layerA=$('#filmLayerA'),layerB=$('#filmLayerB');
let activeFilm=-1,showA=false,filmVisible=false,filmToken=0;
function filmRoute(i){
 const travel=Math.max(1,filmScroll.offsetHeight-innerHeight);
 const y=filmScroll.getBoundingClientRect().top+scrollY+travel*((i+.42)/4);
 scrollTo({top:y,behavior:reduce?'instant':'smooth'});
}
filmButtons.forEach((b,i)=>b.addEventListener('click',()=>filmRoute(i)));
function setFilm(i,force=false){
 if(i===activeFilm&&!force)return;activeFilm=i;i=clamp(0,3,i);
 const m=motionData[i],token=++filmToken;
 filmPoster.src=m.still;filmTitle.textContent=m.name;filmSubtitle.textContent=m.line;filmKicker.textContent=m.kicker;filmFile.textContent=m.file;filmNumber.textContent='0'+(i+1)+' / 04';
 filmButtons.forEach((b,j)=>{b.classList.toggle('is-active',j===i);b.setAttribute('aria-current',j===i?'step':'false')});
 const next=showA?layerB:layerA,previous=showA?layerA:layerB;showA=!showA;
 previous.pause();next.pause();next.classList.remove('is-active');
 if(reduce||!filmVisible){previous.classList.remove('is-active');return}
 next.src=m.film;next.muted=true;next.playsInline=true;next.loop=true;
 next.style.objectFit=m.portrait&&innerWidth>760?'contain':'cover';
 next.load();
 next.play().then(()=>{if(token!==filmToken)return;next.classList.add('is-active');previous.classList.remove('is-active')}).catch(()=>{next.classList.remove('is-active');previous.classList.remove('is-active')});
}
const revealObserver=new IntersectionObserver(items=>{
 for(const it of items)if(it.isIntersecting)it.target.classList.add('is-shown');
},{threshold:.16});
$$('.reveal').forEach(x=>revealObserver.observe(x));
document.documentElement.classList.add('motion-ready');
const stageSections=[
 {el:hero,name:'THE OPENING',num:'01'},
 {el:manifesto,name:'THE MAISON',num:'02'},
 {el:collection,name:'THE COLLECTION',num:'03'},
 {el:filmScroll,name:'THE MOTION',num:'04'},
 {el:gallery,name:'DESIGN & CRAFT',num:'05'},
 {el:$('#heritage'),name:'HERITAGE',num:'06'},
 {el:$('#private'),name:'PRIVATE ENQUIRY',num:'07'}
];
let ticking=false;
function update(){
 ticking=false;
 const vh=innerHeight||1,y=scrollY,range=Math.max(1,document.documentElement.scrollHeight-vh);
 progressFill.style.transform='scaleX('+clamp(0,1,y/range)+')';
 siteHeader.classList.toggle('is-solid',y>80);
 let current=stageSections[0];
 for(const s of stageSections)if(s.el&&s.el.getBoundingClientRect().top<vh*.55)current=s;
 railNumber.textContent=current.num+' / 07';railLabel.textContent=current.name;
 railMark.style.transform='scaleY('+Math.max(.1,parseInt(current.num,10)/7)+')';
 const h=hero.getBoundingClientRect(),hp=clamp(0,1,-h.top/Math.max(1,hero.offsetHeight-vh));
 hero.style.setProperty('--hero-progress',String(ease(hp)));
 runHero(h.bottom>vh*.34&&h.top<vh*.4);
 const m=manifesto.getBoundingClientRect(),mp=clamp(0,1,-m.top/Math.max(1,manifesto.offsetHeight-vh));
 manifesto.style.setProperty('--manifest-progress',String(ease(mp)));
 const c=collection.getBoundingClientRect(),cp=clamp(0,1,-c.top/Math.max(1,collection.offsetHeight-vh));
 collection.style.setProperty('--stage-progress',String(cp));
 selectorVisible=c.bottom>vh*.15&&c.top<vh*.8;
 setModel(Math.min(4,Math.floor(cp*5)),activeModel<0);
 if(!selectorVisible||reduce){modelFilm.pause();motionWindow.classList.remove('is-ready')}
 else if(activeModel>=0&&modelData[activeModel].film){
   const desired=modelData[activeModel].film;
   if(modelFilm.getAttribute('src')!==desired){modelFilm.src=desired;modelFilm.load();}
   if(modelFilm.paused)modelFilm.play().then(()=>motionWindow.classList.add('is-ready')).catch(()=>{});
 }
 const f=filmScroll.getBoundingClientRect(),fp=clamp(0,1,-f.top/Math.max(1,filmScroll.offsetHeight-vh));
 filmScroll.style.setProperty('--film-progress',String(fp));
 filmVisible=f.bottom>vh*.2&&f.top<vh*.8;
 const filmDesired=Math.min(3,Math.floor(fp*4));
 setFilm(filmDesired,filmVisible&&!layerA.getAttribute('src')&&!layerB.getAttribute('src'));
 if(!filmVisible||reduce){layerA.pause();layerB.pause()}
 else {const active=showA?layerA:layerB;if(active.src&&active.paused)active.play().catch(()=>{})}
 if(gallery){const g=gallery.getBoundingClientRect();gallery.style.setProperty('--revealProgress',String(clamp(0,1,1-g.top/vh)))}
}
function tick(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick,{passive:true});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){heroVideo.pause();modelFilm.pause();layerA.pause();layerB.pause()}
 else tick();
});
window.addEventListener('pagehide',()=>{heroVideo.pause();modelFilm.pause();layerA.pause();layerB.pause()});
update();
})();