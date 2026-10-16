import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountSpace3D,orbitPosition,cameraState} from '../dist/ui/space3d.js';
import {scene} from '../dist/ui/scene.js';
import {PRESETS,missionFor} from '../dist/data/catalog.js';

function mockRenderer(t,{compile=true,link=true,getContextThrows=false,allocationLimit=Infinity}={}){
 const names=['window','document','requestAnimationFrame','cancelAnimationFrame'];
 const originals=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
 t.after(()=>{for(const n of names){if(originals[n]===undefined)delete globalThis[n];else globalThis[n]=originals[n];}});
 const handlers={},draws=[],colors=[],created={buffer:[],shader:[],program:[]},deleted={buffer:[],shader:[],program:[]};let frame,cancelled=0,unavailable=0;
 const gl=Object.fromEntries(['ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','TRIANGLES','POINTS','LINE_STRIP','LINES','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT','DEPTH_TEST'].map((n,i)=>[n,i+1]));
 for(const kind of ['Shader','Program','Buffer']){const key=kind.toLowerCase();gl['create'+kind]=()=>{if(key==='buffer'&&created.buffer.length>=allocationLimit)return null;const object={key,id:created[key].length};created[key].push(object);return object;};}
 for(const n of ['shaderSource','compileShader','attachShader','linkProgram','useProgram','bindBuffer','bufferData','vertexAttribPointer','enableVertexAttribArray','uniformMatrix4fv','uniform1f','deleteBuffer','deleteProgram','viewport','clearColor','clear','enable'])gl[n]=()=>{};
 for(const kind of ['Shader','Program','Buffer'])gl['delete'+kind]=object=>deleted[kind.toLowerCase()].push(object);
 gl.getShaderParameter=()=>compile;gl.getProgramParameter=()=>link;gl.getProgramInfoLog=()=> 'GPU link failed';gl.getShaderInfoLog=()=> 'GPU compile failed';gl.getUniformLocation=(_,n)=>n;gl.getAttribLocation=()=>0;
 gl.uniform3fv=(_,v)=>colors.push(v);gl.drawArrays=(...args)=>draws.push(args);
 const canvas={width:0,height:0,clientWidth:390,clientHeight:360,getContext(){if(getContextThrows)throw Error('disabled');return gl;},addEventListener(n,fn){handlers[n]=fn;},removeEventListener(n){delete handlers[n];},getBoundingClientRect:()=>({left:0,top:0})};
 globalThis.window={devicePixelRatio:2};globalThis.document={activeElement:null,hidden:false};
 globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>cancelled++;
 const data={stage:'hangar',design:{...PRESETS.balanced,destination:'moon'},period:118,playing:false,reducedMotion:false};
 const renderer=mountSpace3D(canvas,()=>data,()=>{},()=>unavailable++);
 return {gl,created,deleted,canvas,handlers,renderer,data,draws,colors,step:n=>frame(n),get unavailable(){return unavailable;},get cancelled(){return cancelled;}};
}

test('Rendering failure returns the supported=false fallback contract without throwing',t=>{
 const r=mockRenderer(t,{getContextThrows:true});assert.equal(r.renderer.supported,false);assert.doesNotThrow(()=>r.renderer.dispose());
});
test('Shader compile failure returns fallback instead of crashing the game',t=>{
 const r=mockRenderer(t,{compile:false});assert.equal(r.renderer.supported,false);
});
test('Context loss stops WebGL and requests a 2D fallback exactly once',t=>{
 const r=mockRenderer(t);r.step(0);const lose=r.handlers.webglcontextlost;let prevented=false;
 lose({preventDefault(){prevented=true;}});lose({preventDefault(){}});
 assert.equal(prevented,true);assert.equal(r.unavailable,1);assert.equal(r.cancelled,1);assert.equal(r.handlers.pointerdown,undefined);assert.doesNotThrow(()=>r.renderer.dispose());
});
test('Wheel keeps page scrolling and browser pinch zoom; focused canvas can zoom',t=>{
 const r=mockRenderer(t);let blocked=0;const wheel={deltaY:100,preventDefault(){blocked++;}};
 const old=cameraState.distance;r.handlers.wheel(wheel);assert.equal(blocked,0);assert.equal(cameraState.distance,old);
 document.activeElement=r.canvas;r.handlers.wheel({...wheel,ctrlKey:true});assert.equal(blocked,0);assert.equal(cameraState.distance,old);
 r.handlers.wheel(wheel);assert.equal(blocked,1);assert.ok(cameraState.distance>old);cameraState.distance=old;r.renderer.dispose();
});
test('Vertical touch drags do not move the camera; horizontal drags and cancellation are supported',t=>{
 const r=mockRenderer(t);const original={...cameraState};
 r.handlers.pointerdown({pointerId:1,pointerType:'touch',clientX:100,clientY:100});
 r.handlers.pointermove({pointerId:1,clientX:102,clientY:150});assert.equal(cameraState.yaw,original.yaw);assert.equal(cameraState.pitch,original.pitch);
 r.handlers.pointercancel();r.handlers.pointermove({pointerId:1,clientX:300,clientY:150});assert.equal(cameraState.yaw,original.yaw);
 r.handlers.pointerdown({pointerId:2,pointerType:'touch',clientX:100,clientY:100});r.handlers.pointermove({pointerId:2,clientX:140,clientY:102});assert.ok(cameraState.yaw>original.yaw);assert.equal(cameraState.pitch,original.pitch);
 Object.assign(cameraState,original);r.renderer.dispose();
});
test('Paused and reduced-motion scenes avoid redundant GPU drawing; camera changes redraw',t=>{
 const r=mockRenderer(t);r.step(0);const count=r.draws.length;r.step(17);assert.equal(r.draws.length,count);
 r.handlers.keydown({key:'ArrowRight',preventDefault(){}});r.step(34);assert.ok(r.draws.length>count);
 r.data.stage='flight';r.data.playing=true;r.data.reducedMotion=true;r.data.run={phase:'operations',minute:50};r.step(51);const paused=r.draws.length;r.step(68);assert.equal(r.draws.length,paused);r.renderer.dispose();
});
test('Moon/Mars WebGL body colors and fallback labels follow the selected design',t=>{
 const r=mockRenderer(t);r.data.stage='flight';r.data.run={phase:'operations',minute:0};r.step(0);
 assert.ok(r.colors.some(v=>JSON.stringify(v)==='[0.65,0.68,0.71]'));
 r.data.design.destination='mars';r.step(17);assert.ok(r.colors.some(v=>JSON.stringify(v)==='[0.8,0.36,0.22]'));
 assert.match(scene({design:{destination:'mars'}}),/orbiting Mars/);assert.match(scene({design:{destination:'mars'}}),/MARS MAPPING ORBIT/);assert.match(scene({design:{destination:'moon'}}),/orbiting Moon/);
 assert.match(scene({running:true,reducedMotion:true}),/spacecraft-orbit paused/);r.renderer.dispose();
});
test('Schematic orbital phase uses mission period and spacing responds to altitude/body radius',()=>{
 const mars=missionFor({destination:'mars',altitude:400});const period=2*Math.PI*Math.sqrt((mars.radius+400)**3/mars.mu)/60;
 const start=orbitPosition(0,period,400,90,mars.radius),quarter=orbitPosition(period/4,period,400,90,mars.radius),full=orbitPosition(period,period,400,90,mars.radius);
 assert.ok(Math.abs(quarter[0])<1e-8);assert.ok(quarter[1]>0);assert.ok(Math.abs(start[0]-full[0])<1e-8);
 assert.ok(orbitPosition(0,period,1000,90,mars.radius)[0]>start[0]);
 assert.ok(orbitPosition(0,period,400,90,1737.4)[0]>start[0]);
});

// Lightweight cascade inspection is intentionally not a browser layout test.
// It guards the exact min-content root cause identified by the independent audit.
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
function rules(text,conditions=[]){const out=[];let pos=0;while(pos<text.length){const open=text.indexOf('{',pos);if(open<0)break;const selector=text.slice(pos,open).trim();let depth=1,end=open+1;for(;end<text.length&&depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}assert.equal(depth,0,'balanced stylesheet blocks');const body=text.slice(open+1,end-1);if(selector.startsWith('@media'))out.push(...rules(body,[...conditions,selector]));else if(!selector.startsWith('@'))out.push({selectors:selector.split(',').map(s=>s.trim()),body,conditions});pos=end;}return out;}
const sheet=rules(css);
function property(selectors,name,width){let result,rank=-1;for(const r of sheet){if(!r.conditions.every(c=>{const max=/max-width:\s*(\d+)px/.exec(c),min=/min-width:\s*(\d+)px/.exec(c);return (!max||width<=+max[1])&&(!min||width>=+min[1]);}))continue;for(const s of r.selectors){if(!selectors.includes(s))continue;const specificity=(s.match(/\./g)||[]).length;for(const declaration of r.body.split(';')){const idx=declaration.indexOf(':');if(declaration.slice(0,idx).trim()===name&&specificity>=rank){result=declaration.slice(idx+1).trim();rank=specificity;}}}}return result;}
test('Responsive root track cascade removes automatic minimums at audited widths (static CSS test)',()=>{
 for(const width of [320,360,375,390,414,430,640,768,820,1024,1280,1440,1920]){
  assert.equal(property(['.shell','.game-page .shell'],'grid-template-columns',width),'minmax(0,1fr)',`game shell at ${width}`);
  const game=property(['.game-layout'],'grid-template-columns',width);assert.equal(game,width<=1100?'minmax(0,1fr)':'minmax(0,1fr) minmax(0,2.25fr) minmax(0,1fr)');
  if(width<=850)assert.equal(property(['.shell'],'grid-template-columns',width),'minmax(0,1fr)');
  for(const selector of ['.sidebar','.nav-list','.game-world','.game-inventory','.game-resources'])assert.equal(property([selector],'min-width',width),'0');
 }
});
test('Touch, modal and table CSS explicitly preserve native scrolling and accessible target size',()=>{
 assert.equal(property(['#game-canvas'],'touch-action',390),'pan-y pinch-zoom');
 for(const cls of ['.btn','.btn.small','.nav-btn','.game-category','.spacecraft-slots button','.assistant-quick .btn'])assert.equal(property([cls],'min-height',390),'44px',cls);
 assert.equal(property(['.modal'],'max-height',390),'calc(100dvh - 24px)');
 for(const cls of ['.table-scroll','.copilot-comparison'])assert.equal(property([cls],'overflow-x',390),'auto');
 assert.match(css,/world-brief \.game-brief-overlay\{[^}]*position:relative/);
});


test('Every allocated GPU resource is released once after normal disposal',t=>{
 const r=mockRenderer(t);r.step(0);r.renderer.dispose();r.renderer.dispose();
 for(const kind of ['buffer','shader','program']){
  assert.ok(r.created[kind].length>0,kind);
  assert.deepEqual(r.deleted[kind],r.created[kind],`${kind} lifecycle`);
 }
 assert.equal(Object.keys(r.handlers).length,0);
});
for(const [label,options] of [['compile',{compile:false}],['link',{link:false}],['allocation',{allocationLimit:5}]]){
 test(`GPU ${label} failure releases partial resources before fallback`,t=>{
  const r=mockRenderer(t,options);assert.equal(r.renderer.supported,false);
  for(const kind of ['buffer','shader','program'])assert.deepEqual(r.deleted[kind],r.created[kind],kind);
  assert.equal(Object.keys(r.handlers).length,0);
 });
}
test('Asynchronous GPU rendering errors request fallback and clean up',t=>{
 const r=mockRenderer(t);r.gl.drawArrays=()=>{throw Error('GPU failure');};
 assert.doesNotThrow(()=>r.step(0));assert.equal(r.unavailable,1);assert.equal(r.cancelled,1);
 for(const kind of ['buffer','shader','program'])assert.deepEqual(r.deleted[kind],r.created[kind],kind);
 assert.doesNotThrow(()=>r.step(1));assert.equal(r.unavailable,1);
});
test('Canvas resize follows CSS dimensions and caps high-DPI backing buffers',t=>{
 const r=mockRenderer(t);window.devicePixelRatio=4;r.step(0);
 assert.equal(r.canvas.width,780);assert.equal(r.canvas.height,720);
 r.canvas.clientWidth=320;r.canvas.clientHeight=200;r.step(1);
 assert.equal(r.canvas.width,640);assert.equal(r.canvas.height,400);r.renderer.dispose();
});

test('Mission-control timeline and event log can shrink without clipping long content (static CSS)',()=>{
 for(const width of [320,360,375,390,414,430,640,768,820,1024,1280,1440,1920]){
  assert.equal(property(['.phase-strip'],'flex-wrap',width),'wrap');
  assert.equal(property(['.phase-chip'],'min-width',width),'0');
  assert.equal(property(['.log-row'],'grid-template-columns',width),'55px minmax(0,1fr)');
 }
});
