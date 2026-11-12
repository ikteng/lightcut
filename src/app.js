import {properties,sample,setKey,validateProject,initialProject} from './engine.js';
const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
let project=initialProject(), selected='title', time=2.5, playing=false, recording=false, previous=0, undo=[], redo=[], images=new Map(), toastTimer;
try { const saved=localStorage.getItem('lightcut-project'); if(saved) project=validateProject(JSON.parse(saved)); } catch { /* Recover with the demo when storage is unavailable or corrupt. */ }
selected=project.layers[0]?.id;
const current=()=>project.layers.find(l=>l.id===selected);
const clone=p=>JSON.parse(JSON.stringify(p));
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function checkpoint(){undo.push(JSON.stringify(project));if(undo.length>60)undo.shift();redo=[];}
function persist(){try{localStorage.setItem('lightcut-project',JSON.stringify(project));$('save-status').textContent='Saved on this device';}catch{$('save-status').textContent='Download project to save';}}
function changed(){persist();renderUI();}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function imageFor(l){if(!images.has(l.src)){const img=new Image();img.src=l.src;images.set(l.src,img);}return images.get(l.src);}
function dimensions(l){if(l.type==='text'){ctx.font=`600 ${l.fontSize}px Arial, sans-serif`;return [Math.max(...l.text.split('\n').map(t=>ctx.measureText(t).width)),l.fontSize*1.2*l.text.split('\n').length];}return [l.width,l.height];}
function draw(selection=true){
  if(canvas.width!==project.width||canvas.height!==project.height){canvas.width=project.width;canvas.height=project.height;canvas.style.aspectRatio=`${project.width}/${project.height}`;}
  ctx.fillStyle=project.background;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const l of [...project.layers].reverse()){
    if(!l.visible)continue;
    const x=sample(l,'x',time),y=sample(l,'y',time),s=sample(l,'scale',time)/100;
    ctx.save();ctx.translate(x,y);ctx.rotate(sample(l,'rotation',time)*Math.PI/180);ctx.scale(s,s);ctx.globalAlpha=Math.max(0,Math.min(1,sample(l,'opacity',time)/100));ctx.fillStyle=l.color;
    if(l.type==='text'){ctx.font=`600 ${l.fontSize}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const lines=l.text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*l.fontSize*1.2));}
    if(l.type==='rect')ctx.fillRect(-l.width/2,-l.height/2,l.width,l.height);
    if(l.type==='circle'){ctx.beginPath();ctx.ellipse(0,0,Math.max(.1,l.width/2),Math.max(.1,l.height/2),0,0,Math.PI*2);ctx.fill();}
    if(l.type==='image'){const img=imageFor(l);if(img.complete&&img.naturalWidth)ctx.drawImage(img,-l.width/2,-l.height/2,l.width,l.height);}
    if(selection && !playing && !recording && l.id===selected && s>0.01){const [w,h]=dimensions(l);ctx.globalAlpha=.75;ctx.strokeStyle='#b5f56a';ctx.lineWidth=1.5/Math.max(s,.01);ctx.setLineDash([5/s,4/s]);ctx.strokeRect(-w/2-8,-h/2-8,w+16,h+16);}
    ctx.restore();
  }
}
function renderRuler(){let html='';for(let i=0;i<=project.duration;i+=project.duration>15?5:1)html+=`<span class="tick" style="left:${i/project.duration*100}%">${i}s</span>`;$('ruler').innerHTML=html+'<div class="playhead"></div>';}
function renderTracks(){
  $('tracks').innerHTML=project.layers.map(l=>{const keys=new Map();properties.forEach(p=>(l.keys[p]||[]).forEach(k=>keys.set(k.time,true)));return `<div class="track-row ${l.id===selected?'selected':''}" data-id="${escape(l.id)}"><div class="layer-name"><span class="icon">${{text:'T',rect:'▭',circle:'◯',image:'▧'}[l.type]}</span><span class="name">${escape(l.name)}</span><button class="eye" aria-label="${l.visible?'Hide':'Show'} ${escape(l.name)}">${l.visible?'●':'○'}</button></div><div class="track-lane">${[...keys.keys()].map(t=>`<span class="key" role="button" tabindex="0" aria-label="Keyframe at ${t.toFixed(2)} seconds" data-time="${t}" style="left:${t/project.duration*100}%">◆</span>`).join('')}<div class="playhead"></div></div></div>`;}).join('');
  $('layer-count').textContent=`${project.layers.length} layer${project.layers.length===1?'':'s'}`;
}
const propNames={x:'Position X',y:'Position Y',scale:'Scale %',rotation:'Rotation °',opacity:'Opacity %'};
function renderInspector(){const l=current();if(!l){$('inspector').innerHTML='<p class="empty">Select a layer in the canvas or timeline to start creating.</p>';return;}
  $('inspector').innerHTML=`<div class="inspector-title"><span class="key-diamond">${{text:'T',rect:'▭',circle:'◯',image:'▧'}[l.type]}</span><input id="layer-title" aria-label="Layer name" value="${escape(l.name)}"></div><div class="inspector-section"><h3>TRANSFORM</h3>${properties.map(p=>`<label class="property"><span>${propNames[p]}</span><input type="number" data-prop="${p}" step="${p==='rotation'?1:0.1}" ${['scale','opacity'].includes(p)?'min="0"':''} ${p==='opacity'?'max="100"':''} value="${+sample(l,p,time).toFixed(1)}"><button class="key-button ${(l.keys[p]||[]).some(k=>Math.abs(k.time-time)<.001)?'active':''}" data-key="${p}" title="Add or remove ${propNames[p]} keyframe" type="button">◇</button></label>`).join('')}</div><div class="inspector-section"><h3>APPEARANCE</h3>${l.type==='text'?`<label class="wide-label">Text<textarea id="text-content">${escape(l.text)}</textarea></label><label class="field">Font size<input id="font-size" type="number" min="1" max="1000" value="${l.fontSize}"></label>`:`<label class="field">Width<input id="layer-width" type="number" min="1" max="8000" value="${l.width}"></label><label class="field">Height<input id="layer-height" type="number" min="1" max="8000" value="${l.height}"></label>`}${l.type!=='image'?`<label class="field">Fill<input id="fill" type="color" value="${escape(l.color)}"></label>`:''}</div><div class="inspector-section"><h3>ANIMATION</h3><label class="wide-label">Interpolation<select id="easing"><option value="ease">Smooth ease</option><option value="linear">Linear</option><option value="hold">Hold</option></select></label><p class="inspector-note">◇ adds a keyframe at the playhead. Editing an animated property sets a keyframe here. Interpolation applies to the selected layer’s keyframes.</p></div><div class="layer-actions"><button id="move-up">↑ Forward</button><button id="move-down">↓ Backward</button></div>`;
  const firstKey=properties.flatMap(p=>l.keys[p]||[])[0];$('easing').value=firstKey?.easing||'ease';
  $('layer-title').onchange=e=>{checkpoint();l.name=e.target.value||'Untitled';changed();};
  document.querySelectorAll('[data-prop]').forEach(input=>input.onchange=()=>{const p=input.dataset.prop;let v=Number(input.value);if(!Number.isFinite(v))return; if(p==='scale')v=Math.max(0,v);if(p==='opacity')v=Math.max(0,Math.min(100,v));checkpoint();if(l.keys[p]?.length)setKey(l,p,time,v,$('easing').value);else l[p]=v;changed();});
  document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{const p=b.dataset.key;checkpoint();const found=(l.keys[p]||[]).find(k=>Math.abs(k.time-time)<.001);if(found){const value=sample(l,p,time);l.keys[p]=l.keys[p].filter(k=>k!==found);if(!l.keys[p].length)l[p]=value;}else setKey(l,p,time,sample(l,p,time),$('easing').value);changed();});
  for(const [id,p] of [['text-content','text'],['font-size','fontSize'],['layer-width','width'],['layer-height','height'],['fill','color']])if($(id))$(id).onchange=e=>{const v=e.target.value;if(['fontSize','width','height'].includes(p)&&(!Number.isFinite(+v)||+v<1))return;checkpoint();l[p]=['fontSize','width','height'].includes(p)?Math.min(8000,+v):v;changed();};
  $('easing').onchange=e=>{checkpoint();properties.forEach(p=>(l.keys[p]||[]).forEach(k=>k.easing=e.target.value));persist();};
  $('move-up').onclick=()=>reorder(-1);$('move-down').onclick=()=>reorder(1);
}
function renderUI(){
  $('project-name').value=project.name;$('comp-label').textContent=project.name;$('viewer-title').textContent=project.name;$('comp-meta').textContent=`${project.width} × ${project.height} · 30 fps`;$('resolution').textContent=`${project.width} × ${project.height}`;$('background').value=project.background;$('duration').value=project.duration;$('size').value=`${project.width},${project.height}`;$('duration-label').textContent=`${project.duration.toFixed(2)}s`;
  $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('delete').disabled=$('duplicate').disabled=!current();
  renderRuler();renderTracks();renderInspector();updateTime();
}
function updateTime(){const frames=Math.round(time*30);$('timecode').textContent=[Math.floor(frames/1800),Math.floor(frames/30)%60,frames%30].map(v=>String(v).padStart(2,'0')).join(':');document.querySelectorAll('.playhead').forEach(el=>el.style.left=`${time/project.duration*100}%`);$('selection-hint').textContent=current()?.name||'Select a layer to edit';}
function seek(t){time=Math.max(0,Math.min(project.duration,Math.round(t*30)/30));updateTime();renderInspector();}
function togglePlay(){if(recording)return;playing=!playing;if(playing&&time>=project.duration)time=0;previous=performance.now();$('play').textContent=playing?'Ⅱ':'▶';}
function animate(now){if(playing){time+=Math.min((now-previous)/1000,.1);if(time>=project.duration){if(recording){time=project.duration;playing=false;}else time=0;}updateTime();}previous=now;draw();requestAnimationFrame(animate);}
function addLayer(type,extra={}){if(recording)return;checkpoint();const l={id:crypto.randomUUID(),name:{text:'New text',rect:'Rectangle',circle:'Ellipse',image:'Image'}[type],type,x:project.width/2,y:project.height/2,scale:100,rotation:0,opacity:100,width:300,height:200,fontSize:80,text:'Your next idea',color:'#b5f56a',visible:true,keys:{},...extra};project.layers.unshift(l);selected=l.id;changed();}
function removeLayer(){if(!current()||recording)return;checkpoint();project.layers=project.layers.filter(l=>l.id!==selected);selected=project.layers[0]?.id;changed();}
function duplicate(){if(!current()||recording)return;checkpoint();const l=clone(current());l.id=crypto.randomUUID();l.name+=' copy';l.x+=25;l.y+=25;for(const p of ['x','y'])for(const k of l.keys[p]||[])k.value+=25;project.layers.splice(project.layers.indexOf(current()),0,l);selected=l.id;changed();}
function reorder(delta){const i=project.layers.indexOf(current()),j=i+delta;if(i<0||j<0||j>=project.layers.length)return;checkpoint();[project.layers[i],project.layers[j]]=[project.layers[j],project.layers[i]];changed();}
function history(from,to){if(!from.length||recording)return;to.push(JSON.stringify(project));project=JSON.parse(from.pop());selected=project.layers.some(l=>l.id===selected)?selected:project.layers[0]?.id;time=Math.min(time,project.duration);changed();}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
const filename=()=>project.name.replace(/[^a-z0-9_-]+/gi,'-')||'lightcut';
$('add-text').onclick=()=>addLayer('text');$('add-rect').onclick=()=>addLayer('rect');$('add-circle').onclick=()=>addLayer('circle',{width:200,height:200});
$('play').onclick=togglePlay;$('go-start').onclick=()=>seek(0);$('go-end').onclick=()=>seek(project.duration);$('prev-frame').onclick=()=>seek(time-1/30);$('next-frame').onclick=()=>seek(time+1/30);$('delete').onclick=removeLayer;$('duplicate').onclick=duplicate;$('undo').onclick=()=>history(undo,redo);$('redo').onclick=()=>history(redo,undo);
$('project-name').onchange=e=>{checkpoint();project.name=e.target.value.trim()||'Untitled';changed();};$('background').onchange=e=>{checkpoint();project.background=e.target.value;changed();};$('duration').onchange=e=>{const n=+e.target.value;if(!Number.isFinite(n)||n<1||n>60){renderUI();return;}checkpoint();project.duration=n;time=Math.min(time,n);for(const l of project.layers)for(const p of properties)if(l.keys[p])l.keys[p]=l.keys[p].filter(k=>k.time<=n);changed();};$('size').onchange=e=>{checkpoint();[project.width,project.height]=e.target.value.split(',').map(Number);changed();};
$('ruler').onpointerdown=e=>{if(recording)return;const el=e.currentTarget;el.setPointerCapture(e.pointerId);const move=ev=>{const r=el.getBoundingClientRect();seek((ev.clientX-r.left)/r.width*project.duration);};move(e);el.onpointermove=move;el.onpointerup=()=>el.onpointermove=null;};
$('tracks').onpointerdown=e=>{
  if(recording)return;const row=e.target.closest('.track-row');if(!row)return;selected=row.dataset.id;const l=current();
  if(e.target.closest('.eye')){checkpoint();l.visible=!l.visible;changed();return;}
  const key=e.target.closest('.key'),lane=e.target.closest('.track-lane');
  if(key){e.preventDefault();const old=+key.dataset.time;seek(old);checkpoint();const group=properties.flatMap(p=>(l.keys[p]||[]).filter(k=>Math.abs(k.time-old)<.001).map(k=>({p,k})));const rect=lane.getBoundingClientRect();key.setPointerCapture(e.pointerId);key.onpointermove=ev=>{const t=Math.max(0,Math.min(project.duration,Math.round((ev.clientX-rect.left)/rect.width*project.duration*30)/30));group.forEach(({k})=>k.time=t);key.style.left=`${t/project.duration*100}%`;time=t;updateTime();};key.onpointerup=()=>{for(const p of properties){const keys=l.keys[p];if(!keys)continue;const moved=group.find(g=>g.p===p)?.k;l.keys[p]=keys.filter(k=>k===moved||!moved||Math.abs(k.time-moved.time)>.001).sort((a,b)=>a.time-b.time);}changed();};key.onpointercancel=()=>changed();return;}
  if(lane){const r=lane.getBoundingClientRect();seek((e.clientX-r.left)/r.width*project.duration);}renderTracks();renderInspector();
};
$('tracks').onkeydown=e=>{const key=e.target.closest('.key');if(key&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selected=key.closest('.track-row').dataset.id;seek(+key.dataset.time);renderTracks();}};
canvas.onpointerdown=e=>{
  if(playing||recording)return;const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*canvas.width,py=(e.clientY-r.top)/r.height*canvas.height;
  const hit=project.layers.find(l=>{if(!l.visible||sample(l,'opacity',time)<=0)return false;const a=-sample(l,'rotation',time)*Math.PI/180,s=sample(l,'scale',time)/100;if(s<=.001)return false;const dx=px-sample(l,'x',time),dy=py-sample(l,'y',time),x=(dx*Math.cos(a)-dy*Math.sin(a))/s,y=(dx*Math.sin(a)+dy*Math.cos(a))/s,[w,h]=dimensions(l);return Math.abs(x)<=w/2+10&&Math.abs(y)<=h/2+10;});
  selected=hit?.id;renderTracks();renderInspector();if(!hit)return;checkpoint();const ox=sample(hit,'x',time),oy=sample(hit,'y',time);canvas.setPointerCapture(e.pointerId);
  canvas.onpointermove=ev=>{for(const [p,v] of [['x',ox+(ev.clientX-e.clientX)/r.width*canvas.width],['y',oy+(ev.clientY-e.clientY)/r.height*canvas.height]]){if(hit.keys[p]?.length)setKey(hit,p,time,v);else hit[p]=v;}renderInspector();};canvas.onpointerup=canvas.onpointercancel=()=>{canvas.onpointermove=null;changed();};
};
$('import-image').onclick=()=>$('image-file').click();$('image-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>15*1024*1024){toast('Choose an image smaller than 15 MB.');return;}try{const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const img=new Image();img.src=src;await img.decode();const s=Math.min(1,project.width*.7/img.width,project.height*.7/img.height);images.set(src,img);addLayer('image',{name:file.name,src,width:Math.round(img.width*s),height:Math.round(img.height*s)});}catch{toast('This image could not be opened.');}e.target.value='';};
$('save-project').onclick=()=>{download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),filename()+'.lightcut');toast('Project downloaded.');};$('open-project').onclick=()=>$('project-file').click();$('project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50*1024*1024)throw new Error('File too large');const p=validateProject(JSON.parse(await file.text()));checkpoint();project=p;selected=p.layers[0]?.id;playing=false;$('play').textContent='▶';time=0;images.clear();changed();toast('Project opened.');}catch{toast('Could not open this Lightcut project.');}e.target.value='';};
$('snapshot').onclick=()=>{draw(false);canvas.toBlob(blob=>{if(blob)download(blob,filename()+'.png');},'image/png');};
$('export').onclick=async()=>{
  if(recording)return;if(!window.MediaRecorder||!canvas.captureStream){toast('WebM export is unavailable in this browser. Try a recent Chrome or Firefox.');return;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){toast('This browser does not support WebM recording.');return;}
  const oldTime=time;let stream,recorder;try{
    await Promise.all(project.layers.filter(l=>l.type==='image').map(l=>imageFor(l).decode().catch(()=>{})));
    recording=true;playing=false;time=0;draw(false);stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Recording failed'));});
    document.querySelector('main').inert=true;document.querySelectorAll('header button,header input').forEach(el=>el.disabled=true);$('export').textContent='Recording…';toast(`Recording ${project.duration}s of animation. Keep this tab visible.`);
    recorder.start();previous=performance.now();playing=true;
    await new Promise(resolve=>{const tick=()=>{if(!playing)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    draw(false);await new Promise(resolve=>setTimeout(resolve,80));recorder.stop();await finished;download(new Blob(chunks,{type:mime}),filename()+'.webm');toast('Video exported.');
  }catch(error){console.error(error);toast('Export failed. You can still save your project or a PNG frame.');if(recorder?.state==='recording')recorder.stop();}
  finally{stream?.getTracks().forEach(t=>t.stop());recording=false;playing=false;time=oldTime;document.querySelector('main').inert=false;document.querySelectorAll('header button,header input').forEach(el=>el.disabled=false);$('export').textContent='↗ Export video';$('play').textContent='▶';renderUI();}
};
$('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();
document.addEventListener('keydown',e=>{if(recording||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||$('help-dialog').open)return;const mod=e.ctrlKey||e.metaKey;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key==='ArrowLeft'){e.preventDefault();seek(time-1/30);}if(e.key==='ArrowRight'){e.preventDefault();seek(time+1/30);}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeLayer();}if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?history(redo,undo):history(undo,redo);}if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();$('save-project').click();}});
renderUI();requestAnimationFrame(animate);
