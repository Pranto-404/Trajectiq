import {missionFor} from '../data/catalog.js';
// Native WebGL renderer. Geometry is schematic; the engine owns all engineering state.
export const cameraState={yaw:0.65,pitch:0.28,distance:7};
export const identity4=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiply4(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
const normalize3=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot3=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function perspective4(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
export function lookAt4(eye,target=[0,0,0]){const z=normalize3(eye.map((v,i)=>v-target[i])),x=normalize3(cross3([0,1,0],z)),y=cross3(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot3(x,eye),-dot3(y,eye),-dot3(z,eye),1];}
export function transformPoint(m,p){const q=[...p,1];return [0,1,2,3].map(r=>q.reduce((s,v,c)=>s+m[c*4+r]*v,0));}
// Camera-space spacing is deliberately exaggerated; period and altitude/radius ratio come from the model.
export function orbitPosition(minute,period,altitude,inclination,radius=1737.4){const t=minute/period*Math.PI*2,r=2.6+12*altitude/radius,i=inclination*Math.PI/180;return [r*Math.cos(t),r*Math.sin(t)*Math.sin(i),r*Math.sin(t)*Math.cos(i)];}
function modelMatrix(pos,scale=[1,1,1],angle=0){const c=Math.cos(angle),s=Math.sin(angle);return [c*scale[0],0,-s*scale[0],0,0,scale[1],0,0,s*scale[2],0,c*scale[2],0,...pos,1];}
function cubeGeometry(){const p=[],n=[];const faces=[[[1,0,0],[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]],[[-1,0,0],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]],[[0,1,0],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]],[[0,-1,0],[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]],[[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]];for(const [normal,...v] of faces)for(const idx of [0,1,2,0,2,3]){p.push(...v[idx]);n.push(...normal);}return {p,n};}
function sphereGeometry(){const p=[],n=[];const point=(lat,lon)=>[Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon)];for(let i=0;i<22;i++)for(let j=0;j<36;j++){const v=[point(i/22*Math.PI,j/36*Math.PI*2),point((i+1)/22*Math.PI,j/36*Math.PI*2),point((i+1)/22*Math.PI,(j+1)/36*Math.PI*2),point(i/22*Math.PI,(j+1)/36*Math.PI*2)];for(const k of [0,1,2,0,2,3]){p.push(...v[k]);n.push(...v[k]);}}return {p,n};}
function cylinderGeometry(){const p=[],n=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2,b=(i+1)/32*Math.PI*2,v=[[Math.cos(a),-1,Math.sin(a)],[Math.cos(b),-1,Math.sin(b)],[Math.cos(b),1,Math.sin(b)],[Math.cos(a),1,Math.sin(a)]];for(const k of [0,1,2,0,2,3]){p.push(...v[k]);n.push(v[k][0],0,v[k][2]);}for(const y of [-1,1])for(const pt of [[0,y,0],[Math.cos(a),y,Math.sin(a)],[Math.cos(b),y,Math.sin(b)]]){p.push(...pt);n.push(0,y,0);}}return {p,n};}
const VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uViewProjection;uniform mat4 uModel;uniform float uTime;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vWorld;void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uViewProjection*world;vNormal=mat3(uModel)*aNormal;vPosition=aPosition;vWorld=world.xyz;gl_PointSize=1.4+1.5*(0.5+0.5*sin(uTime*1.6+aPosition.x*13.0+aPosition.y*7.0+aPosition.z*5.0));}`;
// One lit program: lambert + blinn-phong highlight + fresnel rim. Texture modes: 0 plain, 1 rocky planet (spins), 2 atmosphere shell (alpha from fresnel).
const FRAGMENT=`precision mediump float;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vWorld;uniform vec3 uColor;uniform vec3 uEye;uniform float uEmissive;uniform float uTexture;uniform float uRim;uniform float uAlpha;uniform float uSpin;void main(){vec3 n=normalize(vNormal+vec3(0.00001));vec3 L=normalize(vec3(-0.7,0.8,1.0));vec3 V=normalize(uEye-vWorld);float diff=max(dot(n,L),0.0);float fres=pow(1.0-max(dot(n,V),0.0),3.0);
if(uTexture>1.5){gl_FragColor=vec4(uColor*(0.55+0.7*diff)+uColor*uEmissive,clamp(fres*1.7,0.0,1.0)*uAlpha);return;}
float tex=1.0;if(uTexture>0.5){float c=cos(uSpin),s=sin(uSpin);vec3 p=vec3(c*vPosition.x+s*vPosition.z,vPosition.y,-s*vPosition.x+c*vPosition.z);tex=0.76+0.2*(0.5+0.5*sin(p.x*36.0+sin(p.y*24.0))*sin(p.z*29.0+p.x*12.0))+0.07*sin(p.x*71.0)*sin(p.y*63.0)*sin(p.z*57.0);}
vec3 H=normalize(L+V);float spec=pow(max(dot(n,H),0.0),36.0)*(uTexture>0.5?0.06:0.34);
vec3 col=uColor*tex*(0.2+0.8*diff)+vec3(spec)+uColor*uEmissive+vec3(0.36,0.58,0.85)*fres*uRim;gl_FragColor=vec4(col,uAlpha);}`;
export function mountSpace3D(canvas,getData,onPick,onUnavailable=()=>{}){
  try{return createSpace3D(canvas,getData,onPick,onUnavailable);}
  catch{return {supported:false,dispose(){}};}
}
function createSpace3D(canvas,getData,onPick,onUnavailable){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false});
  if(!gl)return {supported:false,dispose(){}};
  const buffers=[],shaders=[];let program=null,listeners=[];
  function releaseResources(){for(const buffer of buffers.splice(0))gl.deleteBuffer(buffer);for(const shader of shaders.splice(0))gl.deleteShader?.(shader);if(program){gl.deleteProgram(program);program=null;}}
  function buffer(){const value=gl.createBuffer();if(!value)throw new Error('WebGL buffer allocation failed');buffers.push(value);return value;}
  try {
  let disposed=false,frame=0,down=null,moved=false,lastPhase='',picks=[],phaseElapsed=0,lastFrame=0,shownMinute=null,orbitKey='',orbitMesh=null,lastStaticFrame='',lastDraw=-Infinity,clock=0,introElapsed=0,idleYaw=0,lastInteract=-1e9;
  const linkBuffer=buffer(),linkNormals=buffer(),trailBuffer=buffer(),trailNormals2=buffer();
  function shader(type,source){const s=gl.createShader(type);if(!s)throw new Error('WebGL shader allocation failed');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  program=gl.createProgram();if(!program)throw new Error('WebGL program allocation failed');gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  // Linked programs retain their compiled code; shader objects can be released now.
  for(const s of shaders.splice(0))gl.deleteShader?.(s);
  const uniforms=Object.fromEntries(['uModel','uViewProjection','uColor','uEmissive','uTexture','uTime','uEye','uRim','uAlpha','uSpin'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const attrP=gl.getAttribLocation(program,'aPosition'),attrN=gl.getAttribLocation(program,'aNormal');
  function mesh(g){const p=buffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.p),gl.STATIC_DRAW);const n=buffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.n),gl.STATIC_DRAW);return {p,n,count:g.p.length/3};}
  const cube=mesh(cubeGeometry()),sphere=mesh(sphereGeometry()),cylinder=mesh(cylinderGeometry());
  const stars={p:[],n:[]};for(let i=0;i<420;i++){const t=i*2.399963,phi=Math.acos(1-2*(i+.5)/420);stars.p.push(40*Math.sin(phi)*Math.cos(t),40*Math.cos(phi),40*Math.sin(phi)*Math.sin(t));stars.n.push(0,0,1);}const starMesh=mesh(stars);
  const ringBuffer=buffer(),ringNormals=buffer();let vp=identity4();
  function draw(m,pos,scale,color,angle=0,emissive=0,texture=0,type=gl.TRIANGLES,o={}){gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.vertexAttribPointer(attrP,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrP);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(attrN,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrN);gl.uniformMatrix4fv(uniforms.uModel,false,new Float32Array(modelMatrix(pos,scale,angle)));gl.uniform3fv(uniforms.uColor,color);gl.uniform1f(uniforms.uEmissive,emissive);gl.uniform1f(uniforms.uTexture,texture);gl.uniform1f(uniforms.uRim,o.rim??(type===gl.TRIANGLES&&texture<2?.35:0));gl.uniform1f(uniforms.uAlpha,o.alpha??1);gl.uniform1f(uniforms.uSpin,o.spin??0);
    if(o.blend){gl.enable(gl.BLEND);gl.blendFunc?.(gl.SRC_ALPHA,gl.ONE);gl.depthMask?.(false);}
    gl.drawArrays(type,0,m.count);
    if(o.blend){gl.disable?.(gl.BLEND);gl.depthMask?.(true);}}
  function project(p){const v=transformPoint(vp,p);return {x:(v[0]/v[3]*.5+.5)*canvas.clientWidth,y:(.5-v[1]/v[3]*.5)*canvas.clientHeight,z:v[3]};}
  function ship(pos,scale,d,selected,hangar,t=0){const bodyColor=d.livery==='cyan'?[.24,.78,.86]:d.livery==='coral'?[.90,.42,.32]:d.bus==='precision'?[.85,.71,.40]:[.63,.72,.78];const at=(p)=>pos.map((v,i)=>v+p[i]*scale);const box=(p,s,col,k,angle=0)=>{draw(cube,at(p),s.map(v=>v*scale),col,angle,k===selected?.3+.15*Math.sin(t*4):0);if(k&&hangar)picks.push({key:k,...project(at(p))});};
    box([0,0,0],[.46,.64,.45],bodyColor,'bus');
    box([0,-.38,.49],[.23,.17,.1],[.08,.11,.17],'storage');
    const span=(d.power==='endurance'?2.05:d.power==='balanced'?1.8:1.5)*Math.sqrt(d.arrayScale||1);for(const sign of [-1,1]){box([sign*(span*.66),0,0],[span*.35,.035,.48],[.08,.22,.38],'power');box([sign*(span*.34),0,0],[.35,.04,.025],[.68,.73,.77],null);for(let j=-3;j<=3;j++)box([sign*(span*.66)+j*.14,0,.008],[.007,.044,.47],[.35,.56,.75],null);}
    const nozzle=d.propulsion==='efficient'?.24:.19;
    draw(cylinder,at([0,-.96,0]),[nozzle*scale,.26*scale,nozzle*scale],[.18,.21,.25]);box([0,-.65,0],[.18,.11,.18],[.52,.59,.64],'propulsion');
    box([.33,-.12,.57],[.19,.25,.21],[.50,.59,.69],'payload');draw(sphere,at([.33,-.12,.8]),[.12*scale,.12*scale,.04*scale],[.04,.09,.14],0,.1);
    const dish=d.comms==='highgain'?.6:.4;
    draw(sphere,at([0,.94,0]),[dish*scale,.08*scale,dish*scale],[.76,.82,.86]);box([0,.71,0],[.025,.23,.025],[.63,.70,.76],'comms');draw(cylinder,at([0,1.1,0]),[.02*scale,.16*scale,.02*scale],[.88,.92,.93]);
    if(d.payload==='hires')box([.33,.23,.54],[.19,.06,.16],[.41,.52,.65],null);
    if(d.storage==='expanded')box([-.35,-.3,.49],[.12,.2,.12],[.21,.31,.37],'storage');
    draw(sphere,at([0,1.32,0]),[.05*scale,.05*scale,.05*scale],[1,.3,.3],0,Math.sin(t*3)>.5?1.2:.15,0);
  }
  function rocket(time,d){const lift=Math.min(1,time/2200),y=-.6+lift*2,radius=d.launch==='dedicated'?.48:.35;draw(cylinder,[0,y,0],[radius,1.55,radius],[.84,.88,.91]);draw(sphere,[0,y+1.55,0],[radius,.55,radius],[.88,.92,.95]);draw(cube,[0,y-.8,0],[radius+.02,.18,radius+.02],[.23,.34,.45]);draw(cube,[0,y-1.55,0],[.6,.08,.6],[.45,.5,.52]);for(const s of [-1,1])draw(cube,[s*(radius+.01),y-1.3,0],[.13,.35,.14],[.53,.61,.65]);
    if(lift>.12){const flick=.7+Math.sin(time*.015)*.15;draw(sphere,[0,y-2.05,0],[.23,.65*flick,.23],[.85,.61,.2],0,1);
      for(let i=1;i<6;i++)orb([Math.sin(time*.01+i)*.07*i,y-2.1-i*.5,0],.2+.05*i,[1,.62-.08*i,.22],.5-.07*i);
      for(let i=0;i<5;i++){const spread=.5+lift*2.2+i*.35;orb([(i%2?1:-1)*spread,-.55+Math.sin(i*1.7)*.2,Math.cos(i*2.1)*.4],.35+lift*.9,[.75,.75,.78],Math.max(0,.4-lift*.3));}}
    draw(sphere,[0,-6,0],[3.3,3.3,3.3],[.12,.31,.52],0,0,1);}
  const ease=k=>1-Math.pow(1-Math.min(1,Math.max(0,k)),3);
  function glow(pos,radius,color,alpha,rimBoost=0){draw(sphere,pos,[radius,radius,radius],color,0,0.5+rimBoost,2,gl.TRIANGLES,{alpha,blend:true});}
  function orb(pos,radius,color,alpha){draw(sphere,pos,[radius,radius,radius],color,0,1,0,gl.TRIANGLES,{alpha,blend:true});}
  function render3D(now){if(disposed)return;if(globalThis.document?.hidden){lastFrame=now;frame=requestAnimationFrame(renderFrame);return;}const data=getData(),d=data.design,run=data.run,m=missionFor(d),mars=d.destination==='mars',planetColor=mars?[.80,.36,.22]:[.65,.68,.71],phase=data.stage==='hangar'?'hangar':run?.phase||'launch';
    const animated=!data.reducedMotion;
    // Ambient motion is capped near 30 fps so phones stay cool; reduced motion draws only when something changes.
    if(animated&&now-lastDraw<30){frame=requestAnimationFrame(renderFrame);return;}
    if(phase!==lastPhase){phaseElapsed=0;lastPhase=phase;shownMinute=run?.minute||0;introElapsed=0;}
    const elapsed=Math.max(0,Math.min(100,now-lastFrame));lastFrame=now;lastDraw=now;
    if(animated){clock+=elapsed;introElapsed+=elapsed;}
    if(data.playing!==false&&animated)phaseElapsed+=elapsed;
    if(shownMinute===null||!data.playing||!animated)shownMinute=run?.minute||0;else shownMinute+=( (run?.minute||0)-shownMinute)*Math.min(1,elapsed/180);
    if(gl.isContextLost?.()){unavailable();return;}
    const idle=animated&&!down&&clock-lastInteract>3500&&(phase==='hangar'||phase==='capture'||phase==='operations');if(idle)idleYaw+=elapsed*0.00012;
    const staticFrame=JSON.stringify([d,run?.phase,run?.minute,run?.contact,run?.eclipse,data.selected,canvas.clientWidth,canvas.clientHeight,window.devicePixelRatio,cameraState]);
    if(!animated&&staticFrame===lastStaticFrame){frame=requestAnimationFrame(renderFrame);return;}lastStaticFrame=staticFrame;
    const t=clock*0.001,w=Math.min(4096,Math.max(1,canvas.clientWidth)),h=Math.min(4096,Math.max(1,canvas.clientHeight)),pixel=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.floor(w*pixel)||canvas.height!==Math.floor(h*pixel)){canvas.width=Math.floor(w*pixel);canvas.height=Math.floor(h*pixel);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.026,.045,.074,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
    const dolly=animated?(1-ease(introElapsed/1200))*3.2:0,distance=(phase==='hangar'?cameraState.distance:cameraState.distance+2)+dolly,yaw=cameraState.yaw+idleYaw;
    const lift=phase==='launch'?Math.min(1,(animated?phaseElapsed:1200)/2200):0,shake=animated&&phase==='launch'&&lift>.1&&lift<.9?Math.sin(clock*.09)*.035:0;
    const eye=[Math.sin(yaw)*Math.cos(cameraState.pitch)*distance+shake,Math.sin(cameraState.pitch)*distance+shake*.6,Math.cos(yaw)*Math.cos(cameraState.pitch)*distance];
    vp=multiply4(perspective4(Math.PI/4,w/h,.1,100),lookAt4(eye));gl.uniformMatrix4fv(uniforms.uViewProjection,false,new Float32Array(vp));gl.uniform1f(uniforms.uTime,t);gl.uniform3fv(uniforms.uEye,new Float32Array(eye));
    draw(starMesh,[0,0,0],[1,1,1],[.55,.67,.8],clock*0.000012,.75,0,gl.POINTS);picks=[];
    if(phase==='hangar'){
      if(data.selected==='launch')rocket(0,d);else{ship([0,0,0],1,d,data.selected,true,t);draw(cylinder,[0,-1.6,0],[2.7,.055,2.7],[.06,.12,.17]);}
      draw(sphere,[-11,5,-18],[3.4,3.4,3.4],planetColor,0,0,1,gl.TRIANGLES,{spin:t*.06});if(mars)glow([-11,5,-18],3.6,[.95,.55,.38],.6);
      draw(sphere,[12,-3,-22],[1.7,1.7,1.7],[.13,.36,.57],0,0,1,gl.TRIANGLES,{spin:t*.09});glow([12,-3,-22],1.85,[.35,.6,1],.7);
    }
    else if(phase==='launch'){rocket(animated?phaseElapsed:1200,d);}
    else if(phase==='transfer'){draw(sphere,[-2.65,-.75,-1],[1.1,1.1,1.1],[.13,.36,.57],0,0,1,gl.TRIANGLES,{spin:t*.12});glow([-2.65,-.75,-1],1.2,[.35,.6,1],.8);draw(sphere,[2.7,.8,0],[.68,.68,.68],planetColor,0,0,1,gl.TRIANGLES,{spin:t*.1});if(mars)glow([2.7,.8,0],.74,[.95,.55,.38],.7);const k=Math.min(1,(animated?phaseElapsed:1800)/1800),pos=[-1.7+3.2*k,-.4+.9*k,0];ship(pos,.3,d,'',false,t);if(animated&&k<1)for(let i=1;i<5;i++)orb([pos[0]-i*.16,pos[1]-i*.05,0],.07-i*.012,[1,.7-i*.1,.3],.5-i*.09);}
    else {draw(sphere,[0,0,0],[1.7,1.7,1.7],planetColor,0,0,1,gl.TRIANGLES,{spin:t*.05});if(mars)glow([0,0,0],1.82,[.95,.55,.38],.55);
      draw(sphere,[8.5,-1.5,-7],[1.05,1.05,1.05],[.13,.36,.57],0,0,1,gl.TRIANGLES,{spin:t*.1});glow([8.5,-1.5,-7],1.18,[.35,.6,1],.75);
      const key=`${d.destination}/${data.period}/${d.altitude}/${d.inclination}/${m.radius}`;if(key!==orbitKey){orbitKey=key;const pts=[];for(let i=0;i<=120;i++)pts.push(...orbitPosition(i/120*data.period,data.period,d.altitude,d.inclination,m.radius));const normals=pts.map((_,i)=>i%3===2?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,ringBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pts),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,ringNormals);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.DYNAMIC_DRAW);orbitMesh={p:ringBuffer,n:ringNormals,count:121};}
      draw(orbitMesh,[0,0,0],[1,1,1],[.24,.5,.61],0,.6,0,gl.LINE_STRIP);
      const pos=orbitPosition(shownMinute||0,data.period,d.altitude,d.inclination,m.radius);
      // Bright trail behind the spacecraft along its orbit.
      const trail=[],trailNormals=[];for(let i=18;i>=0;i--){const p=orbitPosition(Math.max(0,(shownMinute||0)-i*data.period/90),data.period,d.altitude,d.inclination,m.radius);trail.push(...p);trailNormals.push(0,0,1);}
      gl.bindBuffer(gl.ARRAY_BUFFER,trailBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(trail),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,trailNormals2);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(trailNormals),gl.DYNAMIC_DRAW);draw({p:trailBuffer,n:trailNormals2,count:19},[0,0,0],[1,1,1],[.8,1,.42],0,1,0,gl.LINE_STRIP);
      ship(pos,.24,d,'',false,t);
      if(phase==='capture'&&animated)for(let i=1;i<6;i++)orb([pos[0]-i*.09,pos[1]-i*.03,pos[2]],.06-i*.008,[1,.65-i*.08,.25],.55-i*.08);
      if(run?.contact){const station=[6,-1,-2],line=[...pos,...station];gl.bindBuffer(gl.ARRAY_BUFFER,linkBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(line),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,linkNormals);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1]),gl.DYNAMIC_DRAW);const lm={p:linkBuffer,n:linkNormals,count:2};draw(lm,[0,0,0],[1,1,1],[.45,.84,.96],0,1,0,gl.LINES);
        const pulse=.5+.5*Math.sin(t*5);orb(station,.1+.05*pulse,[.5,.9,1],.35+.4*pulse);
        if(animated&&data.playing&&run?.history?.at(-1)?.mode==='downlink')for(let i=0;i<3;i++){const u=((phaseElapsed+i*370)%1100)/1100;orb(pos.map((v,k)=>v+(station[k]-v)*u),.05,[.5,.9,1],.9);}}
      if(run?.eclipse)draw(sphere,[.45,0,0],[1.71,1.71,1.71],[.02,.025,.04],0,0,0);}
    frame=requestAnimationFrame(renderFrame);
  }
  function renderFrame(now){try{render3D(now);}catch{unavailable();}}
  function pointerDown(e){
    if(e.isPrimary===false||e.button>0)return;
    lastInteract=clock;down={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,id:e.pointerId,touch:e.pointerType==='touch'};
    moved=false;
    // Touch retains browser pan-y/pinch handling. Mouse drag can safely capture outside the canvas.
    if(!down.touch)canvas.setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e){
    if(!down||e.pointerId!==down.id)return;
    const dx=e.clientX-down.x,dy=e.clientY-down.y,totalX=e.clientX-down.startX,totalY=e.clientY-down.startY;
    if(Math.abs(totalX)+Math.abs(totalY)>5)moved=true;
    // A vertical finger gesture belongs to page scrolling, not the orbit camera.
    if(down.touch&&Math.abs(totalY)>Math.abs(totalX)){down.x=e.clientX;down.y=e.clientY;return;}
    cameraState.yaw+=dx*.006;
    if(!down.touch)cameraState.pitch=Math.max(-1.15,Math.min(1.15,cameraState.pitch+dy*.004));
    down.x=e.clientX;down.y=e.clientY;
  }
  function pointerUp(e){
    if(!down||e.pointerId!==down.id)return;
    if(!moved&&getData().stage==='hangar'){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      const hits=picks.filter(p=>p.z>0&&Math.hypot(p.x-x,p.y-y)<60).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
      if(hits[0])onPick(hits[0].key);
    }
    if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture?.(e.pointerId);
    down=null;
  }
  function wheel(e){
    // Unfocused scene scrolling and OS/browser pinch zoom must remain available.
    if(e.ctrlKey||e.metaKey||globalThis.document?.activeElement!==canvas)return;
    e.preventDefault();cameraState.distance=Math.max(4,Math.min(13,cameraState.distance+e.deltaY*.005));
  }
  function key(e){if(e.ctrlKey||e.metaKey||e.altKey)return;lastInteract=clock;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','r','R'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')cameraState.yaw-=.1;if(e.key==='ArrowRight')cameraState.yaw+=.1;if(e.key==='ArrowUp')cameraState.pitch=Math.min(1.15,cameraState.pitch+.1);if(e.key==='ArrowDown')cameraState.pitch=Math.max(-1.15,cameraState.pitch-.1);if(e.key==='+')cameraState.distance=Math.max(4,cameraState.distance-.4);if(e.key==='-')cameraState.distance=Math.min(13,cameraState.distance+.4);if(e.key.toLowerCase()==='r'){cameraState.yaw=.65;cameraState.pitch=.28;cameraState.distance=7;}}
  function unavailable(e){if(disposed)return;e?.preventDefault?.();dispose();onUnavailable();}
  listeners=[['webglcontextlost',unavailable],['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',()=>{down=null;moved=true;}],['lostpointercapture',()=>{down=null;}],['wheel',wheel,{passive:false}],['keydown',key]];listeners.forEach(args=>canvas.addEventListener(...args));frame=requestAnimationFrame(renderFrame);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);listeners.forEach(([t,fn])=>canvas.removeEventListener(t,fn));releaseResources();}
  return {supported:true,dispose};
  }catch(error){listeners.forEach(([type,fn])=>canvas.removeEventListener(type,fn));releaseResources();throw error;}
}
