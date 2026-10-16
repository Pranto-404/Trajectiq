import test from 'node:test';
import assert from 'node:assert/strict';
import {presetFor,missionFor,PRESETS,CATALOG} from '../dist/data/catalog.js';
import {calculate,newRun,advance,resolve,runToEnd,rocketDeltaV,linkEnvironment,seededRandom} from '../dist/engine/model.js';
const near=(actual,expected,t=1e-7)=>assert.ok(Math.abs(actual-expected)<=t,`${actual} versus ${expected}`);
const operations=d=>advance(advance(advance(newRun(d))));
const continueRun=input=>{let s=input;for(let i=0;i<160&&!s.done;i++){if(s.crisis){const preferred={propulsion:'nominal',eclipse:'continue',storage:'continue',link:'wait'}[s.crisis.id];s=resolve(s,(s.crisis.actions.find(x=>x.id===preferred&&!x.disabled)||s.crisis.actions.find(x=>!x.disabled)).id);}else s=advance(s);}assert.ok(s.done);return s;};
test('V5 physics: Mars period and central shadow derive from independent NASA/JPL constants',()=>{
 for(const altitude of [200,400,1000]){const a=calculate({...presetFor('mars'),altitude});const expected=2*Math.PI*Math.sqrt((3389.5+altitude)**3/42828.37362)/60;near(a.period,expected);near(a.m.eclipseMinutes,expected/Math.PI*Math.asin(3389.5/(3389.5+altitude)));assert.ok(a.m.eclipseMinutes+a.m.contactMinutes<a.period);}
 const low=calculate({...presetFor('mars'),altitude:200}),high=calculate({...presetFor('mars'),altitude:1000});assert.ok(high.period>low.period);assert.ok(high.potential<low.potential);
});
test('V5 physics: equal array area receives lower solar flux at Mars; 225M km is a teaching normalization',()=>{
 const moon=calculate({...PRESETS.balanced,arrayScale:1}),mars=calculate({...presetFor('mars'),arrayScale:1});near(moon.c.power.arrayArea,mars.c.power.arrayArea);near(mars.c.power.solar/moon.c.power.solar,586.2/1361);assert.match(mars.m.assumption,/fictional link.*225 million/);
 const close=linkEnvironment({destination:'mars',distance:'near'}),far=linkEnvironment({destination:'mars',distance:'far'});near(close.delay,54600000/299792.458);near(far.delay,400200000/299792.458);assert.ok(close.factor>far.factor);
});
test('V5 physics: normalization rejects invalid numeric fields and enforces planet altitude and tank limits',()=>{
 const a=calculate({...presetFor('mars'),altitude:20,fuel:10000,arrayScale:Infinity});assert.equal(a.d.altitude,200);assert.equal(a.d.fuel,70);assert.equal(a.d.arrayScale,1.5);assert.equal(calculate({...presetFor('mars'),altitude:99999}).d.altitude,1000);
 for(const args of [[Infinity,1,200],[20,10,-1],[20,0,200],[NaN,1,200]])assert.equal(rocketDeltaV(...args),0);
});
test('V5 physics: reduced-return capture does not falsely claim a newly computed wider orbit',()=>{
 let s=newRun({...PRESETS.balanced,fuel:30});s=advance(advance(s));const a=calculate(s.design),action=s.crisis.actions.find(x=>x.id==='wide');assert.equal(action.disabled,false);assert.doesNotMatch(action.name,/wider orbit/i);assert.match(action.effect,/reference orbit and period stay unchanged/);const next=resolve(s,'wide');assert.equal(next.design.altitude,s.design.altitude);near(calculate(next.design).period,a.period);near(a.deltaV-rocketDeltaV(a.dry+next.fuel,a.dry,a.c.propulsion.isp),450);near(next.orbitPenalty,.65);assert.deepEqual(resolve(next,'wide'),next);
});
test('V5 physics: transmitter energy stops when a partial-minute recorder empties',()=>{
 const a=calculate(PRESETS.balanced);let s=operations(PRESETS.balanced);s.minute=a.period-a.m.eclipseMinutes-a.m.contactMinutes+1;s.mode='downlink';s.battery=100;s.backlog=3;s.qualityBacklog=6;s.generated=3;s.generatedScience=6;s.seen=['storage','eclipse','link'];const next=advance(s);const transmitMinutes=3/(4*60/8);near(next.battery,100+(a.c.power.solar*.85-a.base)*5/60-a.c.comms.power*transmitMinutes/60);near(next.returned,3);near(next.science,6);near(next.backlog,0);near(next.history.reduce((sum,h)=>sum+h.dt,0),5);
});
test('V5 physics: observations before 15% crossing are retained and safe mode applies only afterwards',()=>{
 const a=calculate(PRESETS.balanced);let s=operations(PRESETS.balanced);s.mode='aggressive';s.minute=a.period-a.m.eclipseMinutes+1;s.battery=a.c.power.battery*.15+.5;s.seen=['storage','eclipse','link'];const activeMinutes=.5*60/a.scienceLoad;const next=advance(s);near(next.generated,a.c.payload.dataMbps*activeMinutes*60/8);near(next.battery,a.c.power.battery*.15-a.base*.65*(5-activeMinutes)/60);near(next.safeSteps*a.m.step,5-activeMinutes);assert.ok(next.safe);assert.ok(next.history.length<20);
});
test('V5 physics: exact battery thresholds and zero-energy finality are handled consistently',()=>{
 for(const percent of [0,15,40,60,100]){let s=operations(PRESETS.balanced);const a=calculate(s.design);s.battery=a.c.power.battery*percent/100;s.seen=['storage','eclipse','link'];s.safe=percent===40;s.mode='coast';s.autoResume=true;const next=advance(s);assert.ok(next.battery>=0&&next.battery<=a.c.power.battery);if(percent===0){assert.ok(next.done);assert.equal(next.battery,0);assert.equal(next.outcome.status,'Power exhausted');assert.deepEqual(advance(next),next);}if(percent===60)assert.equal(next.autoResume,false);}
});
test('V5 physics: checkpoint round trips at every transition and crisis preserve exact final outcome',()=>{
 for(const destination of ['moon','mars']){const d=presetFor(destination,'fragile');let state=newRun(d);state.mode='aggressive';const expected=continueRun(state);for(let i=0;i<80&&!state.done;i++){assert.deepEqual(continueRun(JSON.parse(JSON.stringify(state))),expected);const before=JSON.stringify(state);if(state.crisis){assert.deepEqual(advance(state),state);const preferred={propulsion:'nominal',eclipse:'continue',storage:'continue',link:'wait'}[state.crisis.id];const action=state.crisis.actions.find(x=>x.id===preferred&&!x.disabled)||state.crisis.actions.find(x=>!x.disabled);state=resolve(state,action.id);}else{const next=advance(state);assert.equal(JSON.stringify(state),before);state=next;}}assert.ok(state.done);}
});
test('V5 physics: seeded Mars designs conserve bytes/science at every step and bounded resources',()=>{
 const rng=seededRandom(271828);let count=0;
 for(let i=0;i<30;i++){const d={...presetFor('mars'),altitude:200+800*rng(),fuel:20+50*rng(),duty:.25+.75*rng(),arrayScale:.75+.75*rng(),batteryScale:.75+.75*rng()};for(const [k,parts]of Object.entries(CATALOG))d[k]=parts[Math.floor(rng()*parts.length)].id;if(!calculate(d).launchable)continue;count++;let s=newRun(d);s.mode=i%2?'science':'aggressive';for(let j=0;j<160&&!s.done;j++){if(s.crisis)s=resolve(s,(s.crisis.actions.find(x=>x.id==='continue'&&!x.disabled)||s.crisis.actions.find(x=>!x.disabled)).id);else s=advance(s);near(s.generated,s.returned+s.backlog+s.lostMB);near(s.generatedScience,s.science+s.qualityBacklog+s.lostScience);const a=calculate(d);assert.ok(s.battery>=0&&s.battery<=a.c.power.battery);assert.ok(s.fuel>=0&&s.fuel<=d.fuel);assert.ok(s.backlog>=-1e-8&&s.backlog<=a.c.storage.capacity+1e-8);}assert.ok(s.done);assert.equal(new Set(s.events.map(x=>x.id)).size,s.events.length);assert.deepEqual(resolve(s,'boost'),s);}
 assert.ok(count>=10);
});
test('V5 physics: completed state, design snapshots and over-target scoring remain immutable',()=>{
 const design=presetFor('moon');const r=runToEnd(design);design.fuel=0;assert.notEqual(r.design.fuel,design.fuel);assert.ok(r.outcome.rawCompletion>100);assert.equal(r.outcome.completion,100);assert.deepEqual(advance(r),r);assert.deepEqual(resolve(r,'abort'),r);assert.throws(()=>advance({...newRun(PRESETS.balanced),phase:'invalid'}),/Invalid mission phase/);
});
test('V5 physics: checkpoint button flags cannot authorize physically unavailable burns',()=>{
 let s=advance(advance(newRun({...PRESETS.balanced,fuel:5})));for(const action of s.crisis.actions)action.disabled=false;assert.throws(()=>resolve(s,'nominal'),/insufficient propellant/);assert.throws(()=>resolve(s,'wide'),/insufficient propellant/);assert.ok(resolve(s,'abort').done);
});
