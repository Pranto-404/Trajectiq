import test from 'node:test';
import assert from 'node:assert/strict';
import {identity4,multiply4,transformPoint,perspective4,lookAt4,orbitPosition,mountSpace3D} from '../dist/ui/space3d.js';
import {PRESETS} from '../dist/data/catalog.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Camera matrices project world origin into the visible center',()=>{const vp=multiply4(perspective4(Math.PI/4,16/9,.1,100),lookAt4([0,0,7]));const p=transformPoint(vp,[0,0,0]);near(p[0],0);near(p[1],0);assert.ok(p[3]>0);assert.ok(p[2]/p[3]>-1&&p[2]/p[3]<1);assert.deepEqual(multiply4(identity4(),vp),vp);});
test('Schematic orbit reacts to altitude, inclination and mission phase',()=>{const eq=orbitPosition(30,120,100,0),polar=orbitPosition(30,120,100,90),high=orbitPosition(30,120,200,90);near(eq[1],0);assert.ok(eq[2]>0);near(polar[2],0);assert.ok(polar[1]>0);assert.ok(Math.hypot(...high)>Math.hypot(...polar));near(orbitPosition(120,120,100,90)[0],orbitPosition(0,120,100,90)[0]);});
test('Renderer offers an explicit no-WebGL fallback',()=>{const r=mountSpace3D({getContext:()=>null},()=>({}),()=>{});assert.equal(r.supported,false);assert.doesNotThrow(()=>r.dispose());});
test('WebGL adapter issues geometry for hangar, launch, transfer and orbital gameplay',()=>{
  const constants=['ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','TRIANGLES','POINTS','LINE_STRIP','LINES','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT','DEPTH_TEST'];
  const gl=Object.fromEntries(constants.map((k,i)=>[k,i+1]));const draws=[];
  for(const name of ['createShader','createProgram','createBuffer'])gl[name]=()=>({});
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','useProgram','bindBuffer','bufferData','vertexAttribPointer','enableVertexAttribArray','uniformMatrix4fv','uniform3fv','uniform1f','deleteBuffer','deleteProgram','viewport','clearColor','clear','enable'])gl[name]=()=>{};
  gl.getShaderParameter=gl.getProgramParameter=()=>true;gl.getUniformLocation=(_,s)=>s;gl.getAttribLocation=(_,s)=>s==='aPosition'?0:1;gl.drawArrays=(type,first,count)=>draws.push({type,count});
  const nativeRAF=globalThis.requestAnimationFrame,nativeCancel=globalThis.cancelAnimationFrame,nativeWindow=globalThis.window;let next;
  globalThis.requestAnimationFrame=fn=>{next=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};globalThis.window={devicePixelRatio:1};
  const canvas={width:0,height:0,clientWidth:800,clientHeight:550,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
  const data={stage:'hangar',design:PRESETS.resilient,period:118,selected:'power',run:null};const r=mountSpace3D(canvas,()=>data,()=>{});
  assert.equal(r.supported,true);assert.doesNotThrow(()=>next(0));assert.ok(draws.some(d=>d.type===gl.TRIANGLES&&d.count>0));assert.ok(draws.some(d=>d.type===gl.POINTS&&d.count>0));
  for(const phase of ['launch','transfer','capture','operations']){data.stage='flight';data.run={phase,minute:30,contact:phase==='operations',eclipse:false};assert.doesNotThrow(()=>next(2000));}
  assert.ok(draws.some(d=>d.type===gl.LINE_STRIP));assert.ok(draws.some(d=>d.type===gl.LINES));assert.doesNotThrow(()=>r.dispose());
  globalThis.requestAnimationFrame=nativeRAF;globalThis.cancelAnimationFrame=nativeCancel;globalThis.window=nativeWindow;
});
