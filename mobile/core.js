/* VELLARIO · COMO Mobile Foundation 0.1.0 — behavior only, no visual framework */
(() => {
"use strict";
const $ = (selector) => document.querySelector(selector);
const nodes = {
 opening:$("#opening"), openingVideo:$("#openingVideo"), openingPoster:$("#openingPoster"),
 openingToggle:$("#openingToggle"), openingStatus:$("#openingStatus"),
 openingSegment:$("#openingSegment"), tabs:$("#modelTabs"),
 title:$("#modelTitle"), counter:$("#modelCounter"), source:$("#modelSource"),
 poster:$("#modelPoster"), video:$("#modelVideo"), fallback:$("#mediaFallback"),
 toggle:$("#modelToggle"), status:$("#modelStatus"), step:$("#modelStep"),
 previous:$("#previousModel"), next:$("#nextModel"), gallery:$("#gallery"),
 diagnostics:$("#diagnosticResults"), bootError:$("#bootError")
};
const state={catalog:null,selected:0,openingPart:0,heroVisible:true,openingUserPaused:false,modelUserPaused:false,errors:[],booted:false,version:"0.1.0"};
function setStatus(el,s){el.textContent=s}
function fail(message){state.errors.push(message);setStatus(nodes.status,message)}
function asset(name){
 if(!state.catalog||!name||!(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).test(name))return "";
 return new URL(name,new URL(state.catalog.assetBase,document.baseURI)).href;
}
function make(tag,props={}){
 const element=document.createElement(tag);
 for(const [key,value] of Object.entries(props)){
  if(key==="text")element.textContent=value;
  else if(key==="className")element.className=value;
  else element.setAttribute(key,String(value));
 }
 return element;
}
function setPlaying(video,playing){video.classList.toggle("playing",playing)}
function start(video,successLabel,statusEl,userPaused){
 if(userPaused||!video.getAttribute("src"))return;
 const result=video.play();
 if(result&&typeof result.then==="function")result.then(()=>{
  setPlaying(video,true);setStatus(statusEl,successLabel);
 }).catch(()=>{
  setPlaying(video,false);
  // Genuine media failure takes precedence over autoplay-policy messaging.
  if(video===nodes.video&&!nodes.fallback.hidden)return;
  setStatus(statusEl,"Tap Play to start (browser policy)");
 });
}
function stop(video){video.pause();setPlaying(video,false)}
function startOpening(){
 if(!state.catalog)return;
 state.openingUserPaused=false;
 start(nodes.openingVideo,"Playing MAS 46 FULL",nodes.openingStatus,false);
 nodes.openingToggle.textContent="Pause film";
}
function pauseOpening(){
 state.openingUserPaused=true;stop(nodes.openingVideo);
 setStatus(nodes.openingStatus,"Paused");nodes.openingToggle.textContent="Play film";
}
function setOpeningPart(index){
 const parts=state.catalog.opening.segments;
 state.openingPart=(index+parts.length)%parts.length;
 nodes.openingSegment.textContent=String(state.openingPart+1).padStart(2,"0")+" / "+String(parts.length).padStart(2,"0");
 stop(nodes.openingVideo);
 nodes.openingVideo.setAttribute("src",asset(parts[state.openingPart]));
 nodes.openingVideo.load();
 if(state.heroVisible&&!state.openingUserPaused)startOpening();
}
function renderTabs(){
 nodes.tabs.replaceChildren();
 state.catalog.models.forEach((model,index)=>{
  const b=make("button",{type:"button",role:"tab","aria-selected":index===state.selected?"true":"false",text:model.name});
  b.addEventListener("click",()=>selectModel(index));
  nodes.tabs.append(b);
 });
}
function renderGallery(model){
 nodes.gallery.replaceChildren();
 (model.images||[]).forEach((name,index)=>{
  const figure=make("figure");
  const image=make("img",{src:asset(name),alt:model.name+" original rendering "+String(index+1),loading:"lazy"});
  image.addEventListener("error",()=>{figure.hidden=true;state.errors.push("image:"+name)});
  figure.append(image);
  nodes.gallery.append(figure);
 });
}
function showPosterOnly(message){
 nodes.video.removeAttribute("src");nodes.video.load();
 nodes.video.hidden=true;nodes.toggle.hidden=true;
 nodes.fallback.hidden=false;
 setStatus(nodes.status,message||"Original image only");
}
function selectModel(index){
 if(!state.catalog)return;
 state.selected=(index+state.catalog.models.length)%state.catalog.models.length;
 const model=state.catalog.models[state.selected];
 stop(nodes.video);nodes.video.removeAttribute("src");nodes.video.load();
 nodes.toggle.textContent="Pause model film";nodes.toggle.hidden=false;nodes.video.hidden=false;nodes.fallback.hidden=true;
 nodes.poster.src=asset(model.poster);
 nodes.poster.alt=model.name+" — original nautical design archive";
 nodes.title.textContent=model.name;
 nodes.counter.textContent=String(state.selected+1).padStart(2,"0")+" / "+String(state.catalog.models.length).padStart(2,"0");
 nodes.step.textContent=String(state.selected+1)+" of "+String(state.catalog.models.length);
 nodes.source.textContent=model.video?"Original film: "+model.videoResolution:"High-resolution original render (no suitable film)";
 nodes.tabs.querySelectorAll('button[role="tab"]').forEach((btn,j)=>btn.setAttribute("aria-selected",j===state.selected?"true":"false"));
 renderGallery(model);
 nodes.poster.onerror=()=>{state.errors.push("missing-poster:"+model.poster);setStatus(nodes.status,"Poster unavailable — check media source")};
 if(model.video){
  nodes.video.poster=asset(model.poster);
  nodes.video.src=asset(model.video);
  nodes.video.muted=true;nodes.video.playsInline=true;nodes.video.loop=true;
  state.modelUserPaused=false;
  setStatus(nodes.status,"Preparing verified footage…");
  // On mobile, selection is a direct user interaction; muted autoplay may be permitted.
  if(!document.hidden)start(nodes.video,"Playing "+model.name,nodes.status,false);
 }else showPosterOnly("Original photographic render — no video");
}
function toggleModel(){
 const model=state.catalog?.models[state.selected];
 if(!model?.video)return;
 if(nodes.video.paused){state.modelUserPaused=false;start(nodes.video,"Playing "+model.name,nodes.status,false);nodes.toggle.textContent="Pause model film";}
 else{state.modelUserPaused=true;stop(nodes.video);setStatus(nodes.status,"Paused");nodes.toggle.textContent="Play model film";}
}
function addMediaListeners(){
 nodes.openingVideo.addEventListener("ended",()=>{if(state.catalog)setOpeningPart(state.openingPart+1)});
 nodes.openingVideo.addEventListener("playing",()=>setPlaying(nodes.openingVideo,true));
 nodes.openingVideo.addEventListener("pause",()=>{if(nodes.openingVideo.paused)setPlaying(nodes.openingVideo,false)});
 nodes.openingVideo.addEventListener("error",()=>{state.errors.push("opening-segment-"+state.openingPart);setPlaying(nodes.openingVideo,false);setStatus(nodes.openingStatus,"Film segment unavailable; poster remains visible")});
 nodes.video.addEventListener("playing",()=>setPlaying(nodes.video,true));
 nodes.video.addEventListener("pause",()=>{if(nodes.video.paused)setPlaying(nodes.video,false)});
 nodes.video.addEventListener("error",()=>{
  const model=state.catalog?.models[state.selected];
  state.errors.push("model-video-"+(model?.id||"unknown"));stop(nodes.video);
  showPosterOnly("Video unavailable — original photograph shown");
 });
 nodes.openingToggle.addEventListener("click",()=>state.openingUserPaused||nodes.openingVideo.paused?startOpening():pauseOpening());
 nodes.toggle.addEventListener("click",toggleModel);
 nodes.previous.addEventListener("click",()=>selectModel(state.selected-1));
 nodes.next.addEventListener("click",()=>selectModel(state.selected+1));
 const io=new IntersectionObserver(entries=>{
  for(const e of entries){
   if(e.target!==nodes.opening)continue;
   state.heroVisible=e.intersectionRatio>.2;
   if(!state.heroVisible)stop(nodes.openingVideo);
   else if(!state.openingUserPaused&&!document.hidden)start(nodes.openingVideo,"Playing MAS 46 FULL",nodes.openingStatus,false);
  }
 },{threshold:[0,.2,.55]});
 io.observe(nodes.opening);
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden){stop(nodes.video);stop(nodes.openingVideo)}
  else{if(state.heroVisible&&!state.openingUserPaused)startOpening();if(state.catalog?.models[state.selected].video&&!state.modelUserPaused)start(nodes.video,"Playing model film",nodes.status,false)}
 });
}
async function head(url){
 try{
  const res=await fetch(url,{method:"HEAD",cache:"no-store"});
  return {pass:res.ok,status:res.status,type:res.headers.get("content-type")||""};
 }catch(error){return {pass:false,error:String(error)}}
}
async function runDiagnostics(){
 if(!state.catalog){nodes.diagnostics.textContent="FAIL: catalogue missing";return}
 const m=state.catalog.models[state.selected];
 const paths=[
  ["opening still",state.catalog.opening.poster],
  ["opening film",state.catalog.opening.segments[0]],
  ["selected still",m.poster],
  ...(m.video?[["selected film",m.video]]:[])
 ];
 setStatus(nodes.diagnostics,"Running real HTTP media checks…");
 const out=await Promise.all(paths.map(async([label,name])=>({label,name,...await head(asset(name))})));
 const checks=[
  {name:"catalogue parsed",pass:state.catalog.schemaVersion===1},
  {name:"five unique models",pass:state.catalog.models.length===5&&new Set(state.catalog.models.map(m=>m.id)).size===5},
  {name:"MAS 46 sequence",pass:state.catalog.opening.segments.length===6},
  {name:"current model",pass:!!m.poster},
  ...out.map(x=>({name:x.label+" ("+x.name+")",pass:x.pass,detail:x.status||x.error}))
 ];
 const lines=checks.map(c=>(c.pass?"PASS ":"FAIL ")+c.name+(c.detail?" · "+c.detail:""));
 lines.push("VIDEO STATUS: hero readyState="+nodes.openingVideo.readyState+"; model readyState="+nodes.video.readyState);
 lines.push("BROWSER ERRORS: "+state.errors.length+(state.errors.length?" → "+state.errors.join(", "):""));
 nodes.diagnostics.textContent=lines.join("\n");
}
async function boot(){
 nodes.bootError.hidden=true;setStatus(nodes.openingStatus,"Loading original film…");
 try{
  const response=await fetch("./catalog.json",{cache:"no-store"});
  if(!response.ok)throw Error("catalog HTTP "+response.status);
  const data=await response.json();
  if(data.schemaVersion!==1||data.models?.length!==5||data.opening?.segments?.length!==6)throw Error("media schema invalid");
  state.catalog=data;state.booted=true;
  nodes.openingPoster.src=asset(data.opening.poster);
  renderTabs();setOpeningPart(0);selectModel(0);
  if(state.heroVisible)startOpening();
  setStatus(nodes.diagnostics,"Catalogue loaded · "+data.models.length+" models · "+data.opening.segments.length+" opening film segments.\nSelect 'Check core media' for live HTTP checks.");
 }catch(e){
  fail("BOOT ERROR: "+String(e));
  nodes.bootError.hidden=false;
  setStatus(nodes.openingStatus,"Photo preview remains visible");
  nodes.tabs.replaceChildren(make("span",{className:"muted",text:"Catalogue unavailable — use Try again"}));
 }
}
window.__vellarioRoot={
 getState:()=>({version:state.version,booted:state.booted,selected:state.catalog?.models[state.selected]?.id,models:state.catalog?.models.map(m=>m.name),openingPart:state.openingPart,errors:[...state.errors]}),
 selectModel,runDiagnostics
};
addMediaListeners();
$("#runDiagnostics").addEventListener("click",runDiagnostics);
$("#retryLoad").addEventListener("click",boot);
boot();
})();
