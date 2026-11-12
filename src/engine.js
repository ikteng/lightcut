export const properties = ['x','y','scale','rotation','opacity'];
export function sample(layer, property, time) {
  const keys = [...(layer.keys[property] || [])].sort((a,b) => a.time-b.time);
  if (!keys.length) return layer[property];
  if (time <= keys[0].time) return keys[0].value;
  if (time >= keys.at(-1).time) return keys.at(-1).value;
  const right = keys.findIndex(k => k.time >= time), a = keys[right-1], b = keys[right];
  if (time === b.time) return b.value;
  let t = (time-a.time)/(b.time-a.time);
  if (b.easing === 'ease') t = t*t*(3-2*t);
  if (b.easing === 'hold') t = 0;
  return a.value+(b.value-a.value)*t;
}
export function setKey(layer, property, time, value, easing='ease') {
  const keys = layer.keys[property] ||= [];
  const key = keys.find(k => Math.abs(k.time-time)<0.001);
  if (key) Object.assign(key,{value,easing}); else keys.push({time,value,easing});
  keys.sort((a,b)=>a.time-b.time);
}
export function validateProject(p) {
  if (!p || p.version !== 1 || typeof p.name !== 'string' || !/^#[0-9a-f]{6}$/i.test(p.background) || !Number.isFinite(p.duration) || p.duration<1 || p.duration>60 || ![p.width,p.height].every(n=>Number.isInteger(n)&&n>=64&&n<=4096) || !Array.isArray(p.layers) || p.layers.length>200) throw new Error('Invalid Lightcut project');
  const ids=new Set();
  for (const l of p.layers) {
    if (!l || typeof l.id!=='string' || ids.has(l.id) || typeof l.name!=='string' || !['text','rect','circle','image'].includes(l.type) || !l.keys || typeof l.keys!=='object' || ![...properties,'width','height','fontSize'].every(k=>Number.isFinite(l[k])) || typeof l.color!=='string' || typeof l.text!=='string' || typeof l.visible!=='boolean') throw new Error('Invalid layer');
    ids.add(l.id);
    if (l.type==='image' && (typeof l.src!=='string' || !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(l.src))) throw new Error('Invalid image');
    for (const prop of properties) if (l.keys[prop] && (!Array.isArray(l.keys[prop]) || l.keys[prop].length>10000 || l.keys[prop].some(k=>!Number.isFinite(k.time)||k.time<0||k.time>p.duration||!Number.isFinite(k.value)||!['linear','ease','hold'].includes(k.easing)))) throw new Error('Invalid keyframe');
  }
  return p;
}
export function initialProject() {
  const layer = (id,name,type,extra)=>({id,name,type,x:640,y:360,scale:100,rotation:0,opacity:100,width:420,height:220,fontSize:96,color:'#ffffff',text:'',visible:true,keys:{},...extra});
  return {version:1,name:'First light',width:1280,height:720,duration:6,background:'#101827',layers:[
    layer('title','Make your move.','text',{text:'Make your move.',fontSize:96,y:328,keys:{y:[{time:0,value:380,easing:'ease'},{time:1.5,value:328,easing:'ease'}],opacity:[{time:0,value:0,easing:'ease'},{time:1.5,value:100,easing:'ease'}]}}),
    layer('subtitle','A little idea. A lot of possibility.','text',{text:'A little idea. A lot of possibility.',fontSize:27,y:414,color:'#aab6c8',keys:{opacity:[{time:0,value:0,easing:'ease'},{time:1,value:0,easing:'ease'},{time:2.2,value:100,easing:'ease'}]}}),
    layer('accent','The spark','circle',{x:1000,y:180,width:100,height:100,color:'#b5f56a',keys:{scale:[{time:0,value:0,easing:'ease'},{time:1.4,value:100,easing:'ease'},{time:4,value:115,easing:'ease'},{time:6,value:100,easing:'ease'}]}}),
    layer('line','A fresh perspective','rect',{x:640,y:516,width:120,height:5,color:'#b5f56a',keys:{scale:[{time:0,value:0,easing:'ease'},{time:2,value:100,easing:'ease'}]}})
  ]};
}
