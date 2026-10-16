import {NASA_DATA,nasaValue,DISTANCES,distanceOptions} from '../data/nasa.js';
import {CATALOG,MISSION as M,PRESETS,UNCERTAINTY,missionFor,presetFor} from '../data/catalog.js';
export const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
export const clone = v => JSON.parse(JSON.stringify(v));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function components(d) {
  const c=Object.fromEntries(Object.keys(CATALOG).map(k=>[k,{...(CATALOG[k].find(c=>c.id===d[k])||CATALOG[k].find(c=>c.id===PRESETS.balanced[k])||CATALOG[k][0])}]));
  const arrayScale=clamp(finite(d.arrayScale,1),0.75,1.5),batteryScale=clamp(finite(d.batteryScale,1),0.75,1.5);
  c.power.arrayArea=c.power.solar/(nasaValue('solar')*0.28)*arrayScale;
  c.power.solar=missionFor(d).solarIrradiance*c.power.arrayArea*0.28;
  c.power.battery*=batteryScale;
  c.power.mass*=0.55*arrayScale+0.45*batteryScale;
  c.power.cost=Math.round(c.power.cost*(0.55*arrayScale+0.45*batteryScale)*10)/10;
  return c;
}
export function normalize(raw) {
  const d=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},n=presetFor(d.destination==='mars'?'mars':'moon'),m=missionFor(n);
  for(const k of Object.keys(CATALOG))n[k]=CATALOG[k].some(c=>c.id===d[k])?d[k]:n[k];
  n.fuel=clamp(finite(d.fuel,n.fuel),0,CATALOG.propulsion.find(c=>c.id===n.propulsion).maxFuel);
  n.altitude=clamp(finite(d.altitude,n.altitude),m.altitudeMin,m.altitudeMax);n.inclination=clamp(finite(d.inclination,n.inclination),0,90);
  n.arrayScale=clamp(finite(d.arrayScale,n.arrayScale||1),0.75,1.5);n.batteryScale=clamp(finite(d.batteryScale,n.batteryScale||1),0.75,1.5);
  n.duty=clamp(finite(d.duty,1),0.25,1);n.distance=Object.hasOwn(DISTANCES,d.distance)?d.distance:'mean';
  n.name=String(d.name||m.title).replace(/[<>]/g,'').slice(0,40);
  n.livery=['gold','cyan','coral'].includes(d.livery)?d.livery:'gold';return n;
}
export function linkEnvironment(d){const options=distanceOptions(d),distance=options[d.distance]||options.mean,m=missionFor(d);return {distance:distance.km,factor:(m.referenceDistance/distance.km)**2,delay:distance.km/299792.458,referenceDistance:m.referenceDistance};}
export function rocketDeltaV(wet,dry,isp) {return [wet,dry,isp].every(Number.isFinite)&&wet>dry&&dry>0&&isp>0 ? isp*9.80665*Math.log(wet/dry) : 0;}
export function calculate(raw) {
  const d=normalize(raw),M=missionFor(d),c=components(d),dry=Object.entries(c).filter(([k])=>k!=='launch').reduce((s,[,x])=>s+x.mass,M.thermalMass),wet=dry+d.fuel;
  const period=2*Math.PI*Math.sqrt((M.radius+d.altitude)**3/M.mu)/60;
  const base=c.bus.power+c.storage.power+12,scienceLoad=base+c.payload.power*d.duty,peak=scienceLoad+c.comms.power;
  const eclipseEnergy=scienceLoad*M.eclipseMinutes/60,usableBattery=c.power.battery*0.85;
  const deltaV=rocketDeltaV(wet,dry,c.propulsion.isp),cost=Object.values(c).reduce((s,x)=>s+x.cost,M.operationsCost);
  const scienceDuty=(period-M.eclipseMinutes-M.contactMinutes)/period;
  const dataGenerated=c.payload.dataMbps*d.duty*60/8*(period-M.eclipseMinutes-M.contactMinutes),dataDownlink=c.comms.downlinkMbps*linkEnvironment(d).factor*60/8*M.contactMinutes;
  const pointingFactor=clamp(c.payload.pointingMax/c.bus.pointing,0.15,1),polarFactor=clamp(d.inclination/85,0,1),altitudeFactor=M.referenceAltitude/d.altitude;
  const potential=c.payload.value*pointingFactor*polarFactor*Math.min(1,altitudeFactor)*M.duration*scienceDuty*10*d.duty;
  const margins={mass:c.launch.capacity-wet,power:c.power.solar*0.85-peak,deltaV:deltaV-M.maneuver-M.reserve,budget:M.budget-cost,data:dataDownlink-dataGenerated,eclipse:usableBattery-eclipseEnergy};
  const checks=[
    {id:'mass',name:'Injected mass',status:margins.mass<0?'fail':margins.mass<22?'warn':'pass',value:`${wet.toFixed(1)} / ${c.launch.capacity} kg`,why:'Wet mass includes dry hardware, structure allowance and propellant. Negative margin blocks launch.'},
    {id:'budget',name:'Mission budget',status:margins.budget<0?'fail':margins.budget<10?'warn':'pass',value:`${cost} / ${M.budget} cr`,why:'Credits include all selected hardware, the launch class and 8 operations credits.'},
    {id:'compatibility',name:'Recorder interface',status:c.storage.capacity>c.bus.storageMax?'fail':'pass',value:c.storage.capacity>c.bus.storageMax?'Unsupported recorder':'Compatible',why:`${c.bus.name} supports up to ${c.bus.storageMax} MB. Unsupported memory hardware blocks launch.`},
    {id:'deltaV',name:'Maneuver reserve',status:margins.deltaV<0?'warn':'pass',value:`${deltaV.toFixed(0)} m/s available`,why:`${M.maneuver} m/s maneuver + ${M.reserve} m/s reserve are teaching assumptions, not a transfer solution. A shortfall causes an operational crisis.`},
    {id:'power',name:'Peak solar margin',status:margins.power<0?'warn':'pass',value:`${margins.power.toFixed(0)} W`,why:'85% solar output minus simultaneous platform, science and transmitter load. Operations normally schedule science and downlink separately.'},
    {id:'eclipse',name:'Eclipse endurance',status:margins.eclipse<0?'warn':'pass',value:`${margins.eclipse.toFixed(1)} Wh reserve`,why:`85% usable battery minus ${M.eclipseMinutes.toFixed(1)} minutes of uninterrupted science load. ${M.eclipseModel}. Normal operations pause science in shadow.`},
    {id:'data',name:'Contact capacity',status:margins.data<0?'warn':'pass',value:`${margins.data.toFixed(0)} MB / orbit margin`,why:'25 minutes of contact downlink minus planned sunlit science generation. Contact duration is an assumption.'},
    {id:'pointing',name:'Pointing precision',status:pointingFactor<1?'warn':'pass',value:`${c.bus.pointing}″ / ${c.payload.pointingMax}″ allowed`,why:'Poor pointing reduces useful science quality; it does not change raw generated bytes.'},
    {id:'orbit',name:'Polar coverage',status:d.inclination<85?'warn':'pass',value:`${d.inclination}° · ${period.toFixed(1)} min orbit`,why:'Polar coverage is modeled as min(inclination / 85°, 1). Period is derived from NASA/JPL body constants; illumination/contact geometry is simplified.'}
  ];
  const risk=checks.filter(x=>x.status==='warn').length;
  return {d,c,m:M,dry,wet,period,base,scienceLoad,peak,eclipseEnergy,usableBattery,deltaV,cost,scienceDuty,dataGenerated,dataDownlink,pointingFactor,polarFactor,potential,margins,checks,risk,launchable:!checks.some(x=>x.status==='fail')};
}
function log(s,type,title,detail){s.logs.push({minute:s.minute,type,title,detail});}
function crisis(s,id,title,body,chain,actions){s.crisis={id,title,body,chain,actions};s.seen.push(id);log(s,'warning',title,body);}
export function newRun(raw,seed=4385,factors={}) {
  const d=normalize(raw),a=calculate(d);
  if(!a.launchable)throw new Error('Launch blocked: mass, budget or compatibility check failed.');
  const f=Object.fromEntries(['solar','link','isp','pointing'].map(k=>[k,clamp(finite(factors?.[k],1),k==='pointing'?0.1:0,k==='pointing'?10:2)]));f.isp=Math.max(0.1,f.isp);
  const s={design:clone(d),phase:'launch',minute:0,seed,factors:f,battery:a.c.power.battery,backlog:0,qualityBacklog:0,generated:0,returned:0,science:0,lostMB:0,lostScience:0,fuel:d.fuel,mode:'science',eclipse:false,contact:false,safe:false,safeSteps:0,throttle:d.duty,autoResume:false,generatedScience:0,orbitPenalty:1,linkBoost:1,seen:[],events:[],logs:[],history:[],crisis:null,done:false,outcome:null};
  log(s,'info','Launch authorized',`Wet mass ${a.wet.toFixed(1)} kg. ${a.checks.filter(x=>x.status==='warn').length} advisory warnings accepted.`);
  return s;
}
export function advance(input) {
  if(input.done||input.crisis)return clone(input);
  if(!['launch','transfer','capture','operations'].includes(input.phase))throw new Error('Invalid mission phase.');
  if(input.phase!=='operations')return advanceSlice(input,1);
  let s=clone(input);const calculation=calculate(s.design),M=calculation.m;const end=Math.min(M.duration,s.minute+M.step);
  while(s.minute<end&&!s.done&&!s.crisis){
    const a=calculation,rawPosition=s.minute%a.period,p=a.period-rawPosition<1e-7?0:rawPosition;
    const boundaries=[a.period-M.eclipseMinutes-M.contactMinutes,a.period-M.eclipseMinutes,a.period];
    const next=boundaries.find(b=>b>p+1e-7)??a.period;
    s=advanceSlice(s,Math.min(1,end-s.minute,next-p),false,calculation);
  }
  return s;
}
function advanceSlice(input,dt,copy=true,calculation=null) {
  const s=copy?clone(input):input;if(s.done||s.crisis)return s;const a=calculation||calculate(s.design),c=a.c,M=a.m;
  if(s.phase==='launch'){s.phase='transfer';log(s,'info','Trajectory injection complete',`Transport to ${M.bodyName} is compressed and pre-arranged. Arrival maneuvers are a teaching budget, not a computed interplanetary trajectory.`);return s;}
  if(s.phase==='transfer'){
    s.phase='capture';const avail=rocketDeltaV(a.dry+s.fuel,a.dry,c.propulsion.isp*s.factors.isp);
    if(avail<M.maneuver+M.reserve&&!s.seen.includes('propulsion'))crisis(s,'propulsion',`${M.bodyName} capture reserve is thin`,`Available Δv is ${avail.toFixed(0)} m/s. Nominal capture and reserve require ${M.maneuver+M.reserve} m/s.`,[`${s.fuel} kg fuel on ${a.dry.toFixed(0)} kg dry mass`,`Δv ${avail.toFixed(0)} m/s < ${M.maneuver+M.reserve} m/s requirement`,'Capture objective or reserve must be sacrificed'],[
      {id:'nominal',name:'Spend reserve · nominal capture',effect:'Preserve mapping orbit, accept a thinner maneuver reserve.',disabled:avail<M.maneuver},
      {id:'wide',name:'Accept reduced-return capture',effect:'Teaching approximation: spend 450 m/s and reduce useful science 35%. The reference orbit and period stay unchanged; no alternate trajectory is solved.',disabled:avail<450},
      {id:'abort',name:'End capture attempt',effect:'Flyby only. Science objective is not achieved.',disabled:false}
    ]);
    return s;
  }
  if(s.phase==='capture') {burn(s,a,M.maneuver);s.phase='operations';log(s,'info',`${M.bodyName} polar orbit acquired`,`${s.design.altitude} km nominal orbit. Mapping campaign is beginning.`);return s;}
  if(s.battery<=0){finish(s,a,true,'Power exhausted');return s;}
  if(!['science','aggressive','downlink','coast'].includes(s.mode))s.mode='science';
  const position=(s.minute+dt/2)%a.period;
  s.eclipse=position>=a.period-M.eclipseMinutes;
  s.contact=!s.eclipse&&position>=a.period-M.eclipseMinutes-M.contactMinutes;
  const degraded=s.minute+dt>=a.period&&s.contact;const link=c.comms.downlinkMbps*linkEnvironment(s.design).factor*s.factors.link*s.linkBoost*(degraded?0.45:1);
  const generatedPower=s.eclipse?0:c.power.solar*0.85*s.factors.solar;
  if(s.safe&&s.battery>c.power.battery*0.4){s.safe=false;log(s,'info','Platform recovered','Battery exceeds 40%. Mission activities may resume.');}
  if(s.autoResume&&!s.eclipse&&s.battery>=c.power.battery*0.6){s.mode='science';s.autoResume=false;log(s,'info','Collection resumed','Sunlight restored the battery above 60%.');}
  const safetyThreshold=c.power.battery*0.15;
  if(s.battery<=safetyThreshold+1e-9)s.safe=true;
  let activeScience=!s.safe&&!s.contact&&(!s.eclipse||s.mode==='aggressive')&&s.mode!=='downlink'&&s.mode!=='coast';
  const effectiveRate=c.payload.dataMbps*s.throttle;
  const txActive=s.backlog>0&&s.contact&&!s.safe&&s.mode!=='coast';
  const load=s.safe?a.base*0.65:a.base+(activeScience?c.payload.power*s.throttle:0)+(txActive?c.comms.power*(s.linkBoost>1?1.5:1):0);
  // Split at physical events, so a partly empty recorder draws transmitter power
  // only while sending, and science collected before safe mode is not discarded.
  if(txActive&&link>0)dt=Math.min(dt,Math.max(1e-7,s.backlog/(link*60/8)));
  if(!s.safe&&load>generatedPower&&s.battery>safetyThreshold+1e-9){
    dt=Math.min(dt,(s.battery-safetyThreshold)*60/(load-generatedPower));
  }
  s.minute=Math.min(M.duration,s.minute+dt);
  const wasSafe=s.safe,net=(generatedPower-load)*dt/60;s.battery=clamp(s.battery+net,0,c.power.battery);
  if(wasSafe)s.safeSteps+=dt/M.step;
  if(activeScience){
    const bytes=effectiveRate*dt*60/8;const value=c.payload.value*clamp(c.payload.pointingMax/(c.bus.pointing*s.factors.pointing),0.15,1)*a.polarFactor*Math.min(1,M.referenceAltitude/s.design.altitude)*s.orbitPenalty;
    const science=dt*10*value*s.throttle;const room=Math.max(0,c.storage.capacity-s.backlog),kept=Math.min(room,bytes),ratio=bytes?kept/bytes:0;
    s.generatedScience+=science;s.generated+=bytes;s.backlog+=kept;s.qualityBacklog+=science*ratio;s.lostMB+=bytes-kept;s.lostScience+=science*(1-ratio);
  }
  if(txActive&&!wasSafe){const bytes=Math.min(s.backlog,link*dt*60/8),q=s.backlog>0?s.qualityBacklog*bytes/s.backlog:0;s.backlog-=bytes;s.qualityBacklog-=q;s.returned+=bytes;s.science+=q;}
  if(!wasSafe&&s.battery<=safetyThreshold+1e-9){s.safe=true;log(s,'warning','Safe mode entered','Battery reached its 15% safety threshold. Science and transmitter suspended.');}
  s.history.push({minute:s.minute,dt,battery:s.battery/c.power.battery*100,backlog:s.backlog,science:s.science,fuel:s.fuel,eclipse:s.eclipse,contact:s.contact,command:s.mode,mode:wasSafe?'safe':txActive?'downlink':activeScience?'science':'coast'});
  if(s.battery<=0){log(s,'warning','Spacecraft power exhausted','No stored energy remains. The mission ends; later sunlight cannot restart this game run.');finish(s,a,true,'Power exhausted');return s;}
  if(s.minute>=M.duration){finish(s,a);return s;}
  if(s.battery<c.power.battery*0.3&&!s.seen.includes('eclipse'))crisis(s,'eclipse',s.eclipse?'The shadow is spending your battery':'Your operating load is draining the battery',`Battery is ${Math.round(s.battery/c.power.battery*100)}%. Current load is ${load.toFixed(1)} W; generation is ${generatedPower.toFixed(1)} W. Battery capacity is ${c.power.battery} Wh.`,[c.power.name,`${s.eclipse?'Eclipse removes solar generation':'Solar output cannot replenish the operating load'}`,'Battery approaches safe-mode threshold','Science time is at risk'],[
    {id:'conserve',name:'Coast through shadow',effect:'Pause collection and transmission until sunlight and 60% battery. Then resume mapping.',disabled:false},
    {id:'throttle',name:'Reduce instrument duty',effect:'Half science/data output for the rest of the mission.',disabled:false},
    {id:'continue',name:'Keep collecting',effect:'Preserve scheduled science; risk safe mode and lost time.',disabled:false}
  ]);
  else if(s.backlog>c.storage.capacity*0.75&&!s.seen.includes('storage'))crisis(s,'storage','Science is stranded onboard',`Recorder is ${Math.round(s.backlog/c.storage.capacity*100)}% full. ${c.payload.dataMbps} Mb/s payload data must fit a ${c.comms.downlinkMbps} Mb/s contact link.`,[c.payload.name,`${c.storage.capacity} MB recorder fills before a sufficient ground contact`,'Recorder backlog crosses 75%','New observations may be discarded'],[
    {id:'downlink',name:'Prioritize return of data',effect:'Pause new science until recorder falls below 25%.',disabled:false},
    {id:'compress',name:'Reduce collection duty',effect:'Halve new data and science for the remaining campaign.',disabled:false},
    {id:'continue',name:'Keep mapping',effect:'Maintain collection; discard new data if buffer fills.',disabled:false}
  ]);
  else if(degraded&&s.contact&&!s.seen.includes('link'))crisis(s,'link','Ground contact is degraded',`This contact has 45% nominal throughput. Your effective link is ${link.toFixed(2)} Mb/s before any recovery action.`,[c.comms.name,'Reduced contact throughput','Data returns more slowly','Less science reaches Earth before campaign ends'],[
    {id:'boost',name:'Reallocate link resources',effect:'Double link throughput for this campaign; transmitter power rises 50%.',disabled:c.power.solar*0.85*s.factors.solar<a.base+c.comms.power*1.5},
    {id:'wait',name:'Wait for next contact',effect:'Keep the current schedule and accept reduced throughput.',disabled:false},
    {id:'pause',name:'Pause collection',effect:'Drain the recorder before collecting new observations.',disabled:false}
  ]);
  if(s.mode==='downlink'&&s.backlog<c.storage.capacity*0.25)s.mode='science';
  return s;
}
function burn(s,a,dv){const isp=a.c.propulsion.isp*s.factors.isp;const wet=a.dry+s.fuel;const needed=wet*(1-Math.exp(-dv/(isp*9.80665)));s.fuel=Math.max(0,s.fuel-needed);}
export function resolve(input,actionId){const s=clone(input);if(s.done||!s.crisis)return s;const e=s.crisis,action=e.actions.find(x=>x.id===actionId),a=calculate(s.design),M=a.m;
  const allowed={propulsion:['nominal','wide','abort'],eclipse:['conserve','throttle','continue'],storage:['downlink','compress','continue'],link:['boost','wait','pause']};
  if(!action||action.disabled||!allowed[e.id]?.includes(actionId)||(e.id==='propulsion'?s.phase!=='capture':s.phase!=='operations'))throw new Error('Recovery action unavailable.');
  // Recheck resources from state, not a persisted button's disabled flag.
  if(e.id==='propulsion'&&actionId!=='abort'&&rocketDeltaV(a.dry+s.fuel,a.dry,a.c.propulsion.isp*s.factors.isp)<(actionId==='wide'?450:M.maneuver))throw new Error('Recovery action unavailable: insufficient propellant.');
  if(e.id==='link'&&actionId==='boost'&&a.c.power.solar*.85*s.factors.solar<a.base+a.c.comms.power*1.5)throw new Error('Recovery action unavailable: insufficient transmitter power.');
  s.events.push({id:e.id,minute:s.minute,title:e.title,chain:e.chain,action:action.name,effect:action.effect});log(s,'decision',action.name,action.effect);
  if(e.id==='propulsion') {if(actionId==='abort'){s.phase='debrief';finish(s,a,true);}else{const use=actionId==='wide'?450:M.maneuver;burn(s,a,use);if(actionId==='wide')s.orbitPenalty=0.65;s.phase='operations';log(s,'info','Alternate capture decision executed',`Used ${use} m/s. Remaining fuel ${s.fuel.toFixed(1)} kg.`);}}
  if(e.id==='eclipse'){if(actionId==='conserve'){s.mode='coast';s.autoResume=true;}if(actionId==='throttle')s.throttle*=0.5;}
  if(e.id==='storage'){if(actionId==='downlink')s.mode='downlink';if(actionId==='compress')s.throttle*=0.5;}
  if(e.id==='link'){if(actionId==='boost')s.linkBoost=2;if(actionId==='pause')s.mode='downlink';}
  s.crisis=null;return s;
}
function finish(s,a,abort=false,reason='Capture aborted'){const M=a.m;s.done=true;s.phase='debrief';const completion=clamp(s.science/M.scienceTarget*100,0,100);const achieved=!abort&&completion>=M.scienceSuccess&&s.battery>0;
  s.outcome={completion,rawCompletion:s.science/M.scienceTarget*100,achieved,status:abort?reason:achieved?'Objective achieved':'Objective incomplete',science:s.science,returned:s.returned,lostMB:s.lostMB,retainedMB:s.backlog,finalBattery:s.battery/a.c.power.battery*100,cost:a.cost,mass:a.wet,efficiency:s.science/Math.max(1,a.cost),safeMinutes:s.safeSteps*M.step,deltaVRemaining:rocketDeltaV(a.dry+s.fuel,a.dry,a.c.propulsion.isp*s.factors.isp)};
  log(s,achieved?'success':'warning',s.outcome.status,`${s.outcome.rawCompletion.toFixed(1)}% target attainment. ${s.science.toFixed(0)} science units downlinked.`);
}
export function runToEnd(d,options={}) {let s=newRun(d,options.seed??4385,options.factors);s.mode=options.mode??'science';for(let i=0;i<150&&!s.done;i++){if(s.crisis){const preferred=options.policy==='conservative'?({propulsion:'nominal',eclipse:'conserve',storage:'downlink',link:'wait'}[s.crisis.id]):({propulsion:'nominal',eclipse:'continue',storage:'continue',link:'wait'}[s.crisis.id]);const available=s.crisis.actions.find(x=>x.id===preferred&&!x.disabled)||s.crisis.actions.find(x=>!x.disabled);s=resolve(s,available.id);}else s=advance(s);}return s;}
export function seededRandom(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
export function robustness(d,seed=UNCERTAINTY.seed,samples=UNCERTAINTY.samples){samples=Math.floor(clamp(finite(samples,UNCERTAINTY.samples),1,1000));const a=calculate(d);if(!a.launchable)return {index:0,passed:0,samples,seed,meanCompletion:0,blocked:true};const rng=seededRandom(seed);let passed=0,total=0;const results=[];for(let i=0;i<samples;i++){const f=Object.fromEntries(['solar','link','isp','pointing'].map(k=>[k,UNCERTAINTY[k][0]+rng()*(UNCERTAINTY[k][1]-UNCERTAINTY[k][0])]));const r=runToEnd(d,{factors:f,policy:'conservative'});passed+=Number(r.outcome.achieved);total+=r.outcome.completion;results.push(r.outcome.completion);}return {index:passed/samples*100,passed,samples,seed,meanCompletion:total/samples,results,blocked:false};}
export function debrief(s){const a=calculate(s.design),M=a.m,items=s.events.map(e=>({...e,impact:e.id==='storage'?`${s.lostMB.toFixed(1)} MB discarded; ${s.backlog.toFixed(1)} MB still onboard at campaign end.`:e.id==='eclipse'?`${s.safeSteps*M.step} minutes in safe mode; final battery ${s.outcome.finalBattery.toFixed(0)}%.`:e.id==='propulsion'?`Remaining maneuver capacity ${s.outcome.deltaVRemaining.toFixed(0)} m/s.`:`${s.returned.toFixed(1)} MB returned to Earth.`}));
  if(a.pointingFactor<1)items.push({id:'pointing',title:'Pointing limited useful observations',chain:[a.c.bus.name,`${a.c.bus.pointing}″ error exceeds ${a.c.payload.pointingMax}″ requirement`,'Useful science quality reduced'],action:'Improve bus or use a forgiving payload',impact:`Quality factor ${(a.pointingFactor*100).toFixed(0)}%.`});
  if(a.polarFactor<1)items.push({id:'orbit',title:'Orbit missed part of the polar target',chain:[`${s.design.inclination}° inclination`,'Reduced polar coverage','Lower useful science per observation'],action:'Increase inclination toward a polar orbit',impact:`Polar factor ${(a.polarFactor*100).toFixed(0)}%.`});
  const held=s.history.filter(h=>h.command==='coast'||h.command==='downlink').reduce((sum,h)=>sum+(h.dt??M.step),0);
  if(held>=60&&s.outcome.completion<80)items.push({id:'schedule',title:'The schedule traded science for reserve',chain:['Player prioritized energy or data return',`${held} minutes with new collection paused`,'Too few useful observations reached the objective'],action:'Balance sunlit collection with energy and contact windows',impact:`${s.science.toFixed(0)} / ${M.scienceTarget} target science units returned.`});
  const tips=[];if(a.margins.eclipse<0)tips.push('Increase usable battery energy, or schedule science only in sunlight.');if(a.margins.data<0||s.backlog>100)tips.push('Improve contact downlink before buying more storage: only returned science earns the objective.');if(a.margins.deltaV<0)tips.push('Add propellant, increase specific impulse, or reduce dry mass. Recheck launch capacity.');if(a.pointingFactor<1)tips.push('Match spacecraft pointing precision to the instrument requirement.');if(a.polarFactor<1)tips.push('A polar mapping objective needs a near-polar orbit.');if(!tips.length)tips.push(s.outcome.achieved?'Your reserves supported the campaign. Compare a lower-cost design to explore the trade-space.':'Resume sunlit mapping after conserving energy, and leave enough time to transmit observations before the campaign ends.');return {items,tips};}
export function pareto(runs){return runs.map((r,i)=>!runs.some((q,j)=>j!==i&&(q.design?.destination||'moon')===(r.design?.destination||'moon')&&(q.modelVersion||'legacy')===(r.modelVersion||'legacy')&&q.outcome.cost<=r.outcome.cost&&(q.outcome.science??q.outcome.completion)>=(r.outcome.science??r.outcome.completion)&&(q.outcome.cost<r.outcome.cost||(q.outcome.science??q.outcome.completion)>(r.outcome.science??r.outcome.completion))));}
