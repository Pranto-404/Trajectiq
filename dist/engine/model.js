import {NASA_DATA,nasaValue,DISTANCES,distanceOptions} from '../data/nasa.js';
import {CATALOG,MISSION as M,PRESETS,UNCERTAINTY,missionFor,presetFor,neededScience,developmentMonths} from '../data/catalog.js';
import {SCENARIOS,DEFAULT_SCENARIO,DIFFICULTY} from '../data/scenarios.js';
import {isBodyId} from '../data/bodies.js';
import {REAL_MISSIONS_CALIBRATION} from '../data/real-missions.js';
export const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
export const clone = v => JSON.parse(JSON.stringify(v));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function components(d) {
  const c=Object.fromEntries(Object.keys(CATALOG).map(k=>[k,{...(CATALOG[k].find(c=>c.id===d[k])||CATALOG[k].find(c=>c.id===PRESETS.balanced[k])||CATALOG[k][0])}]));
  const M=missionFor(d),arrayScale=clamp(finite(d.arrayScale,1),0.75,M.arrayScaleMax),batteryScale=clamp(finite(d.batteryScale,1),0.75,1.5);
  c.power.arrayArea=c.power.solar/(nasaValue('solar')*0.28)*arrayScale;
  c.power.solar=M.solarIrradiance*c.power.arrayArea*M.arrayEfficiency;
  c.power.battery*=batteryScale;
  c.power.mass*=0.55*arrayScale+0.45*batteryScale;
  c.power.cost=Math.round(c.power.cost*(0.55*arrayScale+0.45*batteryScale)*10)/10;
  return c;
}
export function normalize(raw) {
  const d=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},dest=isBodyId(d.destination)?d.destination:'moon',scenarioId=SCENARIOS[d.scenario]?.destination===dest?d.scenario:DEFAULT_SCENARIO[dest],n=presetFor(dest,'balanced',scenarioId),m=missionFor({...n,scenario:scenarioId});
  for(const k of Object.keys(CATALOG))n[k]=CATALOG[k].some(c=>c.id===d[k])?d[k]:n[k];
  n.fuel=clamp(finite(d.fuel,n.fuel),0,CATALOG.propulsion.find(c=>c.id===n.propulsion).maxFuel);
  n.altitude=clamp(finite(d.altitude,n.altitude),m.altitudeMin,m.altitudeMax);n.inclination=clamp(finite(d.inclination,n.inclination),0,90);
  n.arrayScale=clamp(finite(d.arrayScale,n.arrayScale||1),0.75,m.arrayScaleMax);n.batteryScale=clamp(finite(d.batteryScale,n.batteryScale||1),0.75,1.5);
  n.duty=clamp(finite(d.duty,1),0.25,1);n.distance=Object.hasOwn(DISTANCES,d.distance)?d.distance:'mean';
  n.name=String(d.name||m.title).replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,40);
  n.livery=['gold','cyan','coral'].includes(d.livery)?d.livery:'gold';
  n.scenario=scenarioId;n.difficulty=Object.hasOwn(DIFFICULTY,d.difficulty)?d.difficulty:'engineer';n.sandbox=d.sandbox===true;return n;
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
  const pointingFactor=clamp(c.payload.pointingMax/c.bus.pointing,0.15,1),polarFactor=clamp(d.inclination/85,0,1)**M.polarExp,altitudeFactor=Math.min(1,(M.referenceAltitude/d.altitude)**M.altitudeExp);
  const potential=c.payload.value*pointingFactor*polarFactor*altitudeFactor*M.duration*scienceDuty*10*d.duty;
  const months=developmentMonths(Object.values(c).map(x=>x.lead||0)),launchEnv=c.launch.envelope||{altMax:{moon:200,mars:1000},incMin:0},altCeiling=launchEnv.altMax[M.destination],orbitOk=d.altitude<=altCeiling&&d.inclination>=launchEnv.incMin;
  const rateMBmin=c.payload.dataMbps*d.duty*60/8,contactStart=period-M.eclipseMinutes-M.contactMinutes,fillMinutes=rateMBmin>0?c.storage.capacity/rateMBmin:Infinity;
  const margins={mass:c.launch.capacity-wet,power:c.power.solar*0.85-peak,deltaV:deltaV-M.maneuver-M.reserve,budget:M.budget-cost,data:dataDownlink-dataGenerated,eclipse:usableBattery-eclipseEnergy,schedule:M.deadline-months,recorder:contactStart-fillMinutes};
  const checks=[
    {id:'mass',name:'Injected mass',status:margins.mass<0?'fail':margins.mass<22?'warn':'pass',value:`${wet.toFixed(1)} / ${c.launch.capacity} kg`,why:'Wet mass includes dry hardware, structure allowance and propellant. Negative margin blocks launch.'},
    {id:'budget',name:'Mission budget',status:margins.budget<0?'fail':margins.budget<10?'warn':'pass',value:`${cost} / ${M.budget} cr`,why:'Credits include all selected hardware, the launch class and 8 operations credits.'},
    {id:'compatibility',name:'Recorder interface',status:c.storage.capacity>c.bus.storageMax?'fail':'pass',value:c.storage.capacity>c.bus.storageMax?'Unsupported recorder':'Compatible',why:`${c.bus.name} supports up to ${c.bus.storageMax} MB. Unsupported memory hardware blocks launch.`},
    {id:'launchOrbit',name:'Launch–orbit compatibility',status:orbitOk?'pass':'fail',value:`${d.altitude} km · ${d.inclination}° vs ${c.launch.name}`,why:`${c.launch.name} reaches up to ${altCeiling} km and inclinations of ${launchEnv.incMin}° or more at this destination. Choose a different orbit or a launcher with a wider envelope; an unreachable orbit blocks launch.`},
    {id:'schedule',name:'Development schedule',status:months>M.deadline?'fail':M.deadline-months<2?'warn':'pass',value:`${months.toFixed(1)} / ${M.deadline} months`,why:'Components are built in parallel, so the longest lead item sets the pace; every extra part adds integration and test time (6 months of integration plus 25% of the remaining lead times). Missing the launch window blocks launch.'},
    {id:'deltaV',name:'Maneuver reserve',status:margins.deltaV<0?'warn':'pass',value:`${deltaV.toFixed(0)} m/s available`,why:`${M.maneuver} m/s maneuver + ${M.reserve} m/s reserve are teaching assumptions, not a transfer solution. A shortfall causes an operational crisis.`},
    {id:'power',name:'Peak solar margin',status:margins.power<0?'warn':'pass',value:`${margins.power.toFixed(0)} W`,why:'85% solar output minus simultaneous platform, science and transmitter load. Operations normally schedule science and downlink separately.'},
    {id:'eclipse',name:'Eclipse endurance',status:margins.eclipse<0?'warn':'pass',value:`${margins.eclipse.toFixed(1)} Wh reserve`,why:`85% usable battery minus ${M.eclipseMinutes.toFixed(1)} minutes of uninterrupted science load. ${M.eclipseModel}. Normal operations pause science in shadow.`},
    {id:'data',name:'Contact capacity',status:margins.data<0?'warn':'pass',value:`${margins.data.toFixed(0)} MB / orbit margin`,why:`The link only works during a ${M.contactMinutes}-minute ground contact once per ${period.toFixed(0)}-minute orbit (${(M.contactMinutes/period*100).toFixed(0)}% of the time). Downlink during that window, minus the data generated in sunlight, is your margin. Contact duration is an assumption.`},
    {id:'recorder',name:'Recorder before first contact',status:fillMinutes<contactStart?'warn':'pass',value:fillMinutes===Infinity?'never fills':`fills in ${fillMinutes.toFixed(0)} min · contact at ${contactStart.toFixed(0)} min`,why:`The ${c.storage.name.toLowerCase()} holds ${c.storage.capacity} MB. At ${rateMBmin.toFixed(1)} MB/min it fills ${fillMinutes===Infinity?'never':fillMinutes.toFixed(0)+' minutes'} after collection starts, but the first ground contact opens ${contactStart.toFixed(0)} minutes into the orbit. If it fills first, the recorder may fill before the first contact and new observations are discarded.`},
    {id:'pointing',name:'Pointing precision',status:pointingFactor<1?'warn':'pass',value:`${c.bus.pointing}″ / ${c.payload.pointingMax}″ allowed`,why:'Poor pointing reduces useful science quality; it does not change raw generated bytes.'},
    {id:'orbit',name:'Polar coverage',status:d.inclination<85?'warn':'pass',value:`${d.inclination}° · ${period.toFixed(1)} min orbit`,why:'Polar coverage is modeled as min(inclination / 85°, 1). Period is derived from NASA/JPL body constants; illumination/contact geometry is simplified.'}
  ];
  // Educational hints from real mission design rules. They never block launch and never count as warnings.
  const cal=REAL_MISSIONS_CALIBRATION,propFraction=d.fuel/wet,massMarginFrac=margins.mass/c.launch.capacity,powerMarginFrac=(c.power.solar*0.85-peak)/Math.max(1e-9,c.power.solar*0.85);
  const hints=[
   {id:'propellant',title:'Propellant fraction',value:`${(propFraction*100).toFixed(0)}% of injected mass`,status:propFraction<0.3||propFraction>0.7?'note':'ok',text:cal.propellantHint+` Yours is ${(propFraction*100).toFixed(0)}%.`,source:cal.propellantSource,basis:'Real missions: derived arithmetic on NASA masses. The game band is an educational comparison.'},
   {id:'massMargin',title:'Mass margin',value:`${(massMarginFrac*100).toFixed(0)}% of launcher capacity`,status:massMarginFrac<0.1?'note':'ok',text:cal.massMarginHint,source:cal.marginSource,basis:'GSFC-STD-1000 Rev I applies margin to dry mass by design phase; the game applies it to injected mass as an analogy.'},
   {id:'powerMargin',title:'Power margin',value:`${(powerMarginFrac*100).toFixed(0)}% of usable array output`,status:powerMarginFrac<0.1?'note':'ok',text:cal.powerMarginHint,source:cal.marginSource,basis:'GSFC-STD-1000 Rev I power margin = (available - estimated) / available. The game compares peak load with 85% of array output.'}
  ];
  const risk=checks.filter(x=>x.status==='warn').length;
  return {d,c,m:M,dry,wet,period,base,scienceLoad,peak,eclipseEnergy,usableBattery,deltaV,cost,scienceDuty,dataGenerated,dataDownlink,pointingFactor,polarFactor,altitudeFactor,potential,months,contactStart,fillMinutes,margins,checks,hints,risk,launchable:!checks.some(x=>x.status==='fail')};
}
function log(s,type,title,detail){s.logs.push({minute:s.minute,type,title,detail});}
let probing=false;
const particleKind=k=>k==='particle'||k==='radiation';
// Replay a paused state under every available response with the default policy: used only to judge whether a decision matters.
function quickFinish(state){let r=state;for(let i=0;i<600&&!r.done;i++){if(r.crisis){const open=r.crisis.actions.filter(x=>!x.disabled),pick=open.find(x=>x.id==='ride')||open.find(x=>x.id==='continue')||open.find(x=>x.id==='wait')||open[0];r=resolve(r,pick.id);}else r=advance(r);}return r;}
function decisionMatters(s){
  if(probing||!s.crisis)return true;probing=true;
  try{const open=s.crisis.actions.filter(x=>!x.disabled);if(open.length<2)return false;
   const ends=open.map(x=>quickFinish(resolve(s,x.id))),sp=k=>Math.max(...ends.map(k))-Math.min(...ends.map(k)),target=calculate(s.design).m.scienceTarget;
   return sp(e=>e.science)>=target*0.015||sp(e=>e.outcome.finalBattery)>=8||sp(e=>e.lostMB)>=calculate(s.design).c.storage.capacity*0.25;
  }finally{probing=false;}
}
function crisis(s,id,title,body,chain,actions){s.crisis={id,title,body,chain,actions};s.seen.push(id);log(s,'warning',title,body);}
function storageBody(s,a,link){const c=a.c,M=a.m,nominal=c.comms.downlinkMbps*linkEnvironment(s.design).factor*s.factors.link*s.linkBoost,duty=M.contactMinutes/a.period,avgReturn=nominal*duty,sunMin=a.period-M.eclipseMinutes-M.contactMinutes,avgGenerate=c.payload.dataMbps*s.throttle*sunMin/a.period;
  return `Recorder is ${Math.round(s.backlog/c.storage.capacity*100)}% full (${Math.round(s.backlog)} of ${c.storage.capacity} MB). The ${c.payload.name.toLowerCase()} produces ${(c.payload.dataMbps*s.throttle).toFixed(2)} Mb/s in sunlight. The ${c.comms.name.toLowerCase()} sends at ${nominal.toFixed(2)} Mb/s, but only during a ${M.contactMinutes}-minute ground contact once per ${a.period.toFixed(0)}-minute orbit, about ${Math.round(duty*100)}% of the time. Averaged over an orbit it returns ${avgReturn.toFixed(2)} Mb/s${avgGenerate>avgReturn?` while the instrument generates ${avgGenerate.toFixed(2)} Mb/s on average, so data piles up between contacts`:`, so a recorder that is small for the data collected between contacts overflows`}.`;}
export function newRun(raw,seed=4385,factors={}) {
  const d=normalize(raw),a=calculate(d);
  if(!a.launchable)throw new Error('Launch blocked: mass, budget or compatibility check failed.');
  const f=Object.fromEntries(['solar','link','isp','pointing'].map(k=>[k,clamp(finite(factors?.[k],1),k==='pointing'?0.1:0,k==='pointing'?10:2)]));f.isp=Math.max(0.1,f.isp);const dm=missionFor(d);f.solar*=dm.factorScale.solar;f.link*=dm.factorScale.link;
  const s={design:clone(d),phase:'launch',minute:0,seed,factors:f,battery:a.c.power.battery,backlog:0,qualityBacklog:0,generated:0,returned:0,science:0,lostMB:0,lostScience:0,fuel:d.fuel,mode:'science',eclipse:false,contact:false,safe:false,safeSteps:0,throttle:d.duty,autoResume:false,generatedScience:0,orbitPenalty:1,linkBoost:1,qualityHit:1,contactCapacityMB:0,contactIdleMin:0,pausedMin:0,weather:null,weatherAt:dm.weather?Math.round(dm.weather.from+seededRandom(seed)()*dm.weather.span):null,forecasts:0,crew:null,seen:[],events:[],logs:[],history:[],crisis:null,done:false,outcome:null};
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
    const edge=s.weather?[s.weather.start,s.weather.end].filter(e=>e>s.minute+1e-7).reduce((m,e)=>Math.min(m,e-s.minute),Infinity):Infinity;
    s=advanceSlice(s,Math.min(1,end-s.minute,next-p,edge),false,calculation);
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
  const wx=s.weather&&s.minute>=s.weather.start-1e-9&&s.minute<s.weather.end-1e-9?s.weather:null,shielded=wx?.choice==='shield',thr=s.throttle*(wx?.choice==='reduce'?0.5:1);
  const generatedPower=s.eclipse?0:c.power.solar*0.85*s.factors.solar*(wx?wx.solar:1);
  if(s.safe&&s.battery>c.power.battery*0.4){s.safe=false;log(s,'info','Platform recovered','Battery exceeds 40%. Mission activities may resume.');}
  if(s.autoResume&&!s.eclipse&&s.battery>=c.power.battery*0.6){s.mode='science';s.autoResume=false;log(s,'info','Collection resumed','Sunlight restored the battery above 60%.');}
  const safetyThreshold=c.power.battery*0.15;
  if(s.battery<=safetyThreshold+1e-9)s.safe=true;
  let activeScience=!s.safe&&!s.contact&&!shielded&&(!s.eclipse||s.mode==='aggressive')&&s.mode!=='downlink'&&s.mode!=='coast';
  const effectiveRate=c.payload.dataMbps*thr;
  const txActive=s.backlog>0&&s.contact&&!s.safe&&!shielded&&s.mode!=='coast';
  const load=s.safe?a.base*0.65:a.base+(activeScience?c.payload.power*thr:0)+(txActive?c.comms.power*(s.linkBoost>1?2:1):0);
  // Split at physical events, so a partly empty recorder draws transmitter power
  // only while sending, and science collected before safe mode is not discarded.
  if(txActive&&link>0)dt=Math.min(dt,Math.max(1e-7,s.backlog/(link*60/8)));
  if(!s.safe&&load>generatedPower&&s.battery>safetyThreshold+1e-9){
    dt=Math.min(dt,(s.battery-safetyThreshold)*60/(load-generatedPower));
  }
  if(s.contact&&!s.safe&&!shielded&&s.mode!=='coast'){s.contactCapacityMB+=link*dt*60/8;if(s.backlog<=1e-9)s.contactIdleMin+=dt;}
  if(!s.eclipse&&!s.contact&&!s.safe&&(s.mode==='coast'||s.mode==='downlink'||shielded))s.pausedMin+=dt;
  s.minute=Math.min(M.duration,s.minute+dt);
  const wasSafe=s.safe,net=(generatedPower-load)*dt/60;s.battery=clamp(s.battery+net,0,c.power.battery);
  if(wasSafe)s.safeSteps+=dt/M.step;
  if(activeScience){
    const bytes=effectiveRate*dt*60/8;const value=c.payload.value*clamp(c.payload.pointingMax/(c.bus.pointing*s.factors.pointing),0.15,1)*a.polarFactor*a.altitudeFactor*s.orbitPenalty*s.qualityHit*(wx?.choice==='ride'?wx.quality:wx?.choice==='reduce'&&particleKind(wx.kind)?0.8:1);
    const science=dt*10*value*thr;const room=Math.max(0,c.storage.capacity-s.backlog),kept=Math.min(room,bytes),ratio=bytes?kept/bytes:0;
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
  else if(s.backlog>c.storage.capacity*0.75&&!s.seen.includes('storage'))crisis(s,'storage','Science is stranded onboard',storageBody(s,a,link),[c.payload.name,`${c.storage.capacity} MB recorder fills before a sufficient ground contact`,'Recorder backlog crosses 75%','New observations may be discarded'],[
    {id:'downlink',name:'Prioritize return of data',effect:'Pause new science until the recorder falls below 25%. Storage frees up, but the antenna can sit idle if the recorder empties before the next contact.',disabled:false},
    {id:'compress',name:'Reduce collection duty',effect:'Halve new data and science for the remaining campaign. Matches data volume to the recorder and saves power.',disabled:false},
    {id:'continue',name:'Keep mapping',effect:'Maintain collection; discard new data if buffer fills.',disabled:false}
  ]);
  else if(degraded&&s.contact&&!s.seen.includes('link')){
    // A recovery decision is only offered when it can change the outcome: the recorder must hold more than this window can return.
    const windowMB=link*M.contactMinutes*60/8;
    if(s.backlog<=windowMB*0.98){s.seen.push('link');log(s,'info','Ground contact is degraded',`Throughput fell to 45% (${link.toFixed(2)} Mb/s), but the ${Math.round(s.backlog)} MB onboard still fits this ${M.contactMinutes}-minute window (about ${Math.round(windowMB)} MB). No decision is needed.`);}
    else crisis(s,'link','Ground contact is degraded',`This ${M.contactMinutes}-minute contact delivers only 45% of nominal throughput (${link.toFixed(2)} Mb/s), so it can return about ${Math.round(windowMB)} MB. ${Math.round(s.backlog)} MB is onboard: ${Math.round(s.backlog-windowMB)} MB must wait for a later contact.`,[c.comms.name,'Reduced contact throughput','Data returns more slowly','Less science reaches Earth before campaign ends'],[
    {id:'boost',name:'Reallocate link resources',effect:'Double link throughput for this campaign. Transmitter power doubles and antenna slewing cuts instrument quality by 10%.',disabled:c.power.solar*0.85*s.factors.solar<a.base+c.comms.power*2},
    {id:'wait',name:'Wait for next contact',effect:'Keep the current schedule and accept reduced throughput.',disabled:false},
    {id:'pause',name:'Pause collection',effect:'Drain the recorder before collecting new observations. Saves battery; science only grows if the recorder was the limit.',disabled:false}
  ]);}
  else if(M.weather&&s.weatherAt!==null&&s.minute>=s.weatherAt&&!s.seen.includes('weather')){
    const W=M.weather,dust=!particleKind(W.kind),heat=W.kind==='thermal',pct=v=>Math.round(v*100);
    crisis(s,'weather',W.title,heat?`A sunward heat load will cut solar output to ${pct(W.solar)}% and make observations ${pct(W.quality)}% as useful for ${W.duration} minutes (a game assumption: arrays are turned away from the Sun and instruments run hot). Battery is ${Math.round(s.battery/c.power.battery*100)}%.`:dust?`A regional dust storm will cut solar output to ${Math.round(W.solar*100)}% for ${W.duration} minutes. Battery is ${Math.round(s.battery/c.power.battery*100)}%. Sunlight alone may not cover the operating load.`:W.kind==='radiation'?`Radiation trapped in the planet’s magnetic field will corrupt measurements and stored data for ${W.duration} minutes. Observations collected during the event are only ${Math.round(W.quality*100)}% as useful (a relative game assumption, not a dose in rads).`:`Energetic particles will corrupt measurements for ${W.duration} minutes. Observations collected during the event are only ${Math.round(W.quality*100)}% as useful.`,heat?['Heat load rises','Arrays are turned off the Sun and power falls',`${c.power.name}: ${Math.round(c.power.solar*0.85*s.factors.solar*W.solar)} W available`,'Instruments run hot and observations lose quality']:dust?['Dust in the atmosphere','Solar generation falls',`${c.power.name}: ${Math.round(c.power.solar*0.85*s.factors.solar*W.solar)} W available`,'Battery drains faster than it charges']:[W.kind==='radiation'?'Trapped radiation belt':'Solar particle event','Detector noise rises','Observations lose quality','Science per minute drops'],[
    {id:'shield',name:'Safe the instruments',effect:`Pause science and transmission for ${W.duration} minutes. Nothing is lost to the event, but the collection time is.`,disabled:false},
    {id:'reduce',name:'Reduce instrument duty',effect:dust?(heat?'Halve instrument duty during the heat load. Cuts load and heat, keeps part of the science.':'Halve instrument duty during the event. Cuts load, keeps part of the science.'):'Halve duty and use a low-gain mode: half the observations, 80% as useful.',disabled:false},
    {id:'ride',name:'Keep observing',effect:dust?(heat?`Full science through the heat load. The battery may drain and observations count at ${pct(W.quality)}%.`:'Full science through the storm. The battery may drain.'):`Keep collecting. Observations during the event count only ${Math.round(W.quality*100)}%. Data already on the recorder can be corrupted.`,disabled:false}
  ]);
    if(!decisionMatters(s)){s.crisis=null;s.weather={kind:W.kind,solar:W.solar,quality:W.quality,start:s.minute,end:s.minute+W.duration,choice:'ride'};log(s,'info',`${W.title} passed`,`The ${c.power.name.toLowerCase()} and your margins absorbed it: every response would have ended about the same, so no decision was needed.`);}}
  if(s.mode==='downlink'&&s.backlog<c.storage.capacity*0.25)s.mode='science';
  return s;
}
// Compact copy of the paused state, kept so a debrief can replay a decision with another response.
function snapshot(s){const {history,logs,events,...rest}=s;return clone({...rest,history:[],logs:[],events:[]});}
function burn(s,a,dv){const isp=a.c.propulsion.isp*s.factors.isp;const wet=a.dry+s.fuel;const needed=wet*(1-Math.exp(-dv/(isp*9.80665)));s.fuel=Math.max(0,s.fuel-needed);}
export function resolve(input,actionId){const s=clone(input);if(s.done||!s.crisis)return s;const e=s.crisis,action=e.actions.find(x=>x.id===actionId),a=calculate(s.design),M=a.m;
  const allowed={propulsion:['nominal','wide','abort'],eclipse:['conserve','throttle','continue'],storage:['downlink','compress','continue'],link:['boost','wait','pause'],weather:['shield','reduce','ride']};
  if(!action||action.disabled||!allowed[e.id]?.includes(actionId)||(e.id==='propulsion'?s.phase!=='capture':s.phase!=='operations'))throw new Error('Recovery action unavailable.');
  // Recheck resources from state, not a persisted button's disabled flag.
  if(e.id==='propulsion'&&actionId!=='abort'&&rocketDeltaV(a.dry+s.fuel,a.dry,a.c.propulsion.isp*s.factors.isp)<(actionId==='wide'?450:M.maneuver))throw new Error('Recovery action unavailable: insufficient propellant.');
  if(e.id==='link'&&actionId==='boost'&&a.c.power.solar*.85*s.factors.solar<a.base+a.c.comms.power*2)throw new Error('Recovery action unavailable: insufficient transmitter power.');
  s.events.push({id:e.id,minute:s.minute,title:e.title,chain:e.chain,action:action.name,actionId,effect:action.effect,options:e.actions.map(x=>({id:x.id,name:x.name,disabled:!!x.disabled})),snapshot:snapshot(s)});log(s,'decision',action.name,action.effect);
  if(e.id==='propulsion') {if(actionId==='abort'){s.phase='debrief';finish(s,a,true);}else{const use=actionId==='wide'?450:M.maneuver;burn(s,a,use);if(actionId==='wide')s.orbitPenalty=0.65;s.phase='operations';log(s,'info','Alternate capture decision executed',`Used ${use} m/s. Remaining fuel ${s.fuel.toFixed(1)} kg.`);}}
  if(e.id==='eclipse'){if(actionId==='conserve'){s.mode='coast';s.autoResume=true;}if(actionId==='throttle')s.throttle*=0.5;}
  if(e.id==='storage'){if(actionId==='downlink')s.mode='downlink';if(actionId==='compress')s.throttle*=0.5;}
  if(e.id==='link'){if(actionId==='boost'){s.linkBoost=2;s.qualityHit=0.9;}if(actionId==='pause')s.mode='downlink';}
  if(e.id==='weather'){const W=M.weather;s.weather={kind:W.kind,solar:W.solar,quality:W.quality,start:s.minute,end:s.minute+W.duration,choice:actionId};
    const hit=particleKind(W.kind)?({ride:0.35,reduce:0.15,shield:0}[actionId]||0):0;
    if(hit>0&&s.backlog>0){const mb=s.backlog*hit,q=s.qualityBacklog*hit;s.backlog-=mb;s.qualityBacklog-=q;s.lostMB+=mb;s.lostScience+=q;log(s,'warning','Recorder data corrupted',`${Math.round(mb)} MB of stored observations were corrupted by energetic particles.`);}}
  s.crisis=null;return s;
}
function finish(s,a,abort=false,reason='Capture aborted'){const M=a.m;s.done=true;s.phase='debrief';const completion=clamp(s.science/M.scienceTarget*100,0,100);const achieved=!abort&&completion>=M.scienceSuccess&&s.battery>0;
  s.outcome={completion,rawCompletion:s.science/M.scienceTarget*100,achieved,status:abort?reason:achieved?'Objective achieved':'Objective incomplete',science:s.science,returned:s.returned,lostMB:s.lostMB,retainedMB:s.backlog,finalBattery:s.battery/a.c.power.battery*100,cost:a.cost,mass:a.wet,efficiency:s.science/Math.max(1,a.cost),safeMinutes:s.safeSteps*M.step,deltaVRemaining:rocketDeltaV(a.dry+s.fuel,a.dry,a.c.propulsion.isp*s.factors.isp),contactCapacityMB:s.contactCapacityMB,contactIdleMin:s.contactIdleMin,pausedMin:s.pausedMin,linkUtilization:s.contactCapacityMB>0?s.returned/s.contactCapacityMB*100:0};
  log(s,achieved?'success':'warning',s.outcome.status,`${s.outcome.rawCompletion.toFixed(1)}% target attainment. ${s.science.toFixed(0)} science units downlinked.`);
}
export function runToEnd(d,options={}) {let s=newRun(d,options.seed??4385,options.factors);s.mode=options.mode??'science';for(let i=0;i<(options.maxSteps??400)&&!s.done;i++){if(s.crisis){const preferred=options.policy==='conservative'?({propulsion:'nominal',eclipse:'conserve',storage:'downlink',link:'wait',weather:'shield'}[s.crisis.id]):({propulsion:'nominal',eclipse:'continue',storage:'continue',link:'wait',weather:'ride'}[s.crisis.id]);const available=s.crisis.actions.find(x=>x.id===preferred&&!x.disabled)||s.crisis.actions.find(x=>!x.disabled);s=resolve(s,available.id);}else s=advance(s);}return s;}
export function seededRandom(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
export function robustness(d,seed=UNCERTAINTY.seed,samples=UNCERTAINTY.samples){samples=Math.floor(clamp(finite(samples,UNCERTAINTY.samples),1,1000));const a=calculate(d);if(!a.launchable)return {index:0,passed:0,samples,seed,meanCompletion:0,blocked:true};const rng=seededRandom(seed);let passed=0,total=0;const results=[];for(let i=0;i<samples;i++){const f=Object.fromEntries(['solar','link','isp','pointing'].map(k=>[k,UNCERTAINTY[k][0]+rng()*(UNCERTAINTY[k][1]-UNCERTAINTY[k][0])]));const r=runToEnd(d,{factors:f,policy:'conservative'});passed+=Number(r.outcome.achieved);total+=r.outcome.completion;results.push(r.outcome.completion);}return {index:passed/samples*100,passed,samples,seed,meanCompletion:total/samples,results,blocked:false};}
// Root-cause analysis. Every candidate cause is expressed in the same unit (science units lost), so the
// largest one is genuinely the primary reason, not a generic hint.
export function diagnose(s){
  const a=calculate(s.design),M=a.m,o=s.outcome||{},need=neededScience(M),short=Math.max(0,need-s.science);
  const rate=a.c.payload.value*a.pointingFactor*a.polarFactor*a.altitudeFactor*10*s.design.duty;
  const n0=v=>Math.round(v),causes=[];
  const util=s.contactCapacityMB>0?s.returned/s.contactCapacityMB*100:0;
  const add=(id,units,what,fix,metric)=>{if(units>=Math.max(3,M.scienceTarget*0.01))causes.push({id,units,what,fix,metric});};
  if(s.lostScience>0){
    if(util>=75)add('link',s.lostScience,`The downlink was the bottleneck: it ran at ${n0(util)}% of its contact capacity and ${n0(s.lostMB)} MB of new observations were discarded because the recorder was already full of data waiting to be sent.`,`Improve the downlink (the ${a.c.comms.name} moves ${a.c.comms.downlinkMbps} Mb/s, and the link is only open ${M.contactMinutes} of every ${n0(a.period)} minutes) or lower the instrument data rate. A bigger recorder only delays the overflow.`,'link');
    else add('storage',s.lostScience,`${n0(s.lostMB)} MB of observations were discarded because the ${a.c.storage.capacity} MB recorder filled between contacts, while the link used only ${n0(util)}% of its capacity.`,`Match collection to storage: reduce instrument duty, choose a larger recorder (check the bus supports it) or collect only when the next contact is near.`,'storage');
  }
  if(s.qualityBacklog>0)add('stranded',s.qualityBacklog,`${n0(s.outcome?.retainedMB??s.backlog)} MB of science was still onboard when the campaign ended, so it did not count.`,'Leave time for a final contact and avoid pausing transmission late in the campaign. Only returned science counts.','stranded');
  const voluntary=Math.max(0,s.pausedMin);
  if(voluntary>0)add('paused',voluntary*rate,`Collection was paused for ${n0(voluntary)} minutes of sunlight (conserve, return priority or an instrument safing). At roughly ${rate.toFixed(1)} science units per minute that is up to ${n0(voluntary*rate)} units forgone.${s.contactIdleMin>1?` The antenna also sat idle for ${n0(s.contactIdleMin)} minutes of contact with nothing left to send.`:''}`,'Pause only when the numbers demand it. If the recorder is the problem, reduce duty instead; if the battery is fine, keep mapping.','paused');
  const safeMin=s.safeSteps*M.step;
  if(safeMin>0)add('energy',safeMin*rate,`The spacecraft spent ${n0(safeMin)} minutes in safe mode after the battery reached its 15% threshold. Final battery was ${n0(o.finalBattery??0)}%.`,`Add battery capacity or array area, lower instrument duty, or avoid collecting through eclipse. Eclipse here lasts ${a.m.eclipseMinutes.toFixed(1)} minutes.`,'energy');
  if(a.pointingFactor<1)add('pointing',s.generatedScience*(1/a.pointingFactor-1),`The ${a.c.bus.name.toLowerCase()} points to ${a.c.bus.pointing}″ but the ${a.c.payload.name.toLowerCase()} needs ${a.c.payload.pointingMax}″, so useful quality was cut to ${n0(a.pointingFactor*100)}%.`,'Match pointing precision to the instrument requirement.','pointing');
  if(a.polarFactor<1)add('orbit',s.generatedScience*(1/a.polarFactor-1),`The ${s.design.inclination}° orbit covers only ${n0(a.polarFactor*100)}% of the polar target.`,'Raise the inclination toward 90° for polar mapping.','orbit');
  if(a.altitudeFactor<1)add('altitude',s.generatedScience*(1/a.altitudeFactor-1),`At ${s.design.altitude} km the imager resolves only ${n0(a.altitudeFactor*100)}% of the detail available from ${M.referenceAltitude} km.`,`Fly lower, toward ${M.referenceAltitude} km.`,'altitude');
  if(s.weather&&s.weather.choice==='ride'&&s.weather.quality<1)add('weather',(s.weather.end-s.weather.start)*rate*(1-s.weather.quality)*0.5,`Observations during the ${M.weather.title.toLowerCase()} were only ${n0(s.weather.quality*100)}% useful.`,'Safe the instruments or reduce duty during space-weather events.','weather');
  if(o.status==='Capture aborted'||o.status==='Flyby only')causes.unshift({id:'capture',units:short,what:'The capture attempt was ended, so the spacecraft never reached its mapping orbit.',fix:'Carry more propellant or a higher-impulse thruster so the capture burn and reserve are available.',metric:'capture'});
  causes.sort((x,y)=>y.units-x.units);
  return {causes,primary:causes[0]||null,short,need,rate,util};
}
export function debrief(s){const a=calculate(s.design),M=a.m,items=s.events.map(e=>({...e,impact:e.id==='storage'?`${s.lostMB.toFixed(1)} MB discarded; ${s.backlog.toFixed(1)} MB still onboard at campaign end.`:e.id==='eclipse'?`${s.safeSteps*M.step} minutes in safe mode; final battery ${s.outcome.finalBattery.toFixed(0)}%.`:e.id==='propulsion'?`Remaining maneuver capacity ${s.outcome.deltaVRemaining.toFixed(0)} m/s.`:e.id==='weather'?`${M.weather?.title||'Space weather'}: your response was “${e.action}”.`:`${s.returned.toFixed(1)} MB returned to Earth.`}));
  if(a.pointingFactor<1)items.push({id:'pointing',title:'Pointing limited useful observations',chain:[a.c.bus.name,`${a.c.bus.pointing}″ error exceeds ${a.c.payload.pointingMax}″ requirement`,'Useful science quality reduced'],action:'Improve bus or use a forgiving payload',impact:`Quality factor ${(a.pointingFactor*100).toFixed(0)}%.`});
  if(a.polarFactor<1)items.push({id:'orbit',title:'Orbit missed part of the polar target',chain:[`${s.design.inclination}° inclination`,'Reduced polar coverage','Lower useful science per observation'],action:'Increase inclination toward a polar orbit',impact:`Polar factor ${(a.polarFactor*100).toFixed(0)}%.`});
  const held=s.pausedMin;
  if(held>=60&&s.outcome.completion<80)items.push({id:'schedule',title:'The schedule traded science for reserve',chain:['Player prioritized energy or data return',`${Math.round(held)} minutes with new collection paused`,'Too few useful observations reached the objective'],action:'Balance sunlit collection with energy and contact windows',impact:`${s.science.toFixed(0)} / ${M.scienceTarget} target science units returned.`});
  const d=diagnose(s),tips=[];
  for(const c of d.causes.slice(0,3))tips.push(`${c.fix} (${Math.round(c.units)} science units at stake.)`);
  if(!tips.length)tips.push(s.outcome.achieved?`Your reserves supported the campaign. You used ${s.outcome.cost.toFixed(0)} of ${M.budget} credits; try a lower-cost design to explore the trade-space.`:`Returned science reached ${s.outcome.rawCompletion.toFixed(0)}% of the target. Raise collection (instrument duty, a higher-value payload) and check the contact link can carry the data.`);
  return {items,tips,primary:d.primary,causes:d.causes};}
export function pareto(runs){return runs.map((r,i)=>!runs.some((q,j)=>j!==i&&(q.design?.destination||'moon')===(r.design?.destination||'moon')&&(q.modelVersion||'legacy')===(r.modelVersion||'legacy')&&q.outcome.cost<=r.outcome.cost&&(q.outcome.science??q.outcome.completion)>=(r.outcome.science??r.outcome.completion)&&(q.outcome.cost<r.outcome.cost||(q.outcome.science??q.outcome.completion)>(r.outcome.science??r.outcome.completion))));}
