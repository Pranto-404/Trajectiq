import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,normalize,newRun,advance,resolve,runToEnd,linkEnvironment,clone,seededRandom} from '../dist/engine/model.js';
import {PRESETS,CATALOG,MISSION} from '../dist/data/catalog.js';
import {NASA_DATA,nasaValue} from '../dist/data/nasa.js';
import {answerQuestion,HELP_TOPICS} from '../dist/engine/assistant.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const operations=d=>advance(advance(advance(newRun(d))));
test('V3: malformed numeric designs normalize to finite physical ranges',()=>{
 for(const raw of [null,[],5,{fuel:Infinity,altitude:NaN,inclination:'bad',arrayScale:Infinity,batteryScale:-99,duty:0,distance:'constructor',bus:'unknown'}]){
  const a=calculate(raw);for(const x of [a.wet,a.period,a.deltaV,a.cost,...Object.values(a.margins)])assert.ok(Number.isFinite(x));
  assert.ok(a.d.duty>=.25&&a.d.duty<=1);assert.ok(a.d.arrayScale>=.75&&a.d.arrayScale<=1.5);assert.equal(a.d.distance,'mean');
 }
});
test('V3: NASA snapshot values actually drive orbital, solar and distance calculations',()=>{
 assert.equal(NASA_DATA.rows.length,8);assert.equal(MISSION.mu,nasaValue('mu'));assert.equal(MISSION.radius,nasaValue('radius'));
 const a=calculate(PRESETS.balanced);near(a.period,2*Math.PI*Math.sqrt((1737.4+100)**3/4902.8)/60);
 near(a.c.power.solar,1361*a.c.power.arrayArea*.28);
 const nearD=linkEnvironment({distance:'near'}),farD=linkEnvironment({distance:'far'});assert.equal(nearD.distance,363300);assert.equal(farD.distance,405500);assert.ok(nearD.factor>farD.factor);near(farD.delay,405500/299792.458);
});
test('V3: customization changes resources consistently without mutating the shared catalog',()=>{
 const before=clone(CATALOG),a=calculate(PRESETS.balanced),big=calculate({...PRESETS.balanced,arrayScale:1.5,batteryScale:1.5});
 near(big.c.power.solar,a.c.power.solar*1.5);near(big.c.power.battery,a.c.power.battery*1.5);assert.ok(big.wet>a.wet);assert.ok(big.cost>a.cost);assert.ok(big.deltaV<a.deltaV);assert.deepEqual(CATALOG,before);
 const half=calculate({...PRESETS.balanced,duty:.5});assert.ok(half.scienceLoad<a.scienceLoad);near(half.dataGenerated,a.dataGenerated*.5);near(half.potential,a.potential*.5);
});
test('V3: exhausted energy ends the mission and cannot resurrect in later sunlight',()=>{
 const r=runToEnd(PRESETS.fragile,{mode:'aggressive',factors:{solar:0}});assert.equal(r.done,true);assert.equal(r.outcome.status,'Power exhausted');assert.equal(r.battery,0);assert.equal(r.outcome.achieved,false);assert.deepEqual(advance(r),r);
});
test('V3: integration splits a step exactly across the shadow boundary',()=>{
 const a=calculate(PRESETS.balanced);let s=operations(PRESETS.balanced);s.mode='coast';s.battery=120;s.minute=a.period-MISSION.eclipseMinutes-.5;s.seen=['storage','eclipse','link'];const start=s.minute;
 const next=advance(s);near(next.minute-start,5);near(next.battery,120+((a.c.power.solar*.85-a.base)*.5-a.base*4.5)/60);near(next.history.reduce((sum,h)=>sum+h.dt,0),5);assert.ok(next.history.every(h=>h.dt<=1));assert.equal(s.battery,120);
});
test('V3: empty recorder does not consume transmitter power',()=>{
 const a=calculate(PRESETS.balanced);let s=operations(PRESETS.balanced);s.minute=a.period-MISSION.eclipseMinutes-MISSION.contactMinutes+1;s.battery=100;s.mode='downlink';s.seen=['link','storage','eclipse'];const r=advance(s);near(r.battery,100+(a.c.power.solar*.85-a.base)*5/60);assert.equal(r.returned,0);
});
test('V3: recovery halves current duty and does not raise a low-duty instrument load',()=>{
 let s=operations({...PRESETS.fragile,duty:.25});s.crisis={id:'storage',title:'test',chain:[],actions:[{id:'compress',name:'Halve duty',effect:'Reduce',disabled:false}]};s.throttle=.25;const r=resolve(s,'compress');near(r.throttle,.125);near(s.throttle,.25);
});
test('V3: energy recovery conserves and automatically resumes after adequate sunlight',()=>{
 let s=operations(PRESETS.balanced);s.crisis={id:'eclipse',title:'test',chain:[],actions:[{id:'conserve',name:'Conserve',effect:'Recover',disabled:false}]};s.battery=100;s=resolve(s,'conserve');assert.equal(s.mode,'coast');assert.equal(s.autoResume,true);
 for(let i=0;i<10&&s.autoResume;i++)s=advance(s);assert.equal(s.autoResume,false);assert.equal(s.mode,'science');
});
test('V3: distance scenario changes actual returned data for a constrained link',()=>{
 const d={...PRESETS.resilient,comms:'compact'};const close=runToEnd({...d,distance:'near'}),far=runToEnd({...d,distance:'far'});assert.ok(close.returned>far.returned);assert.ok(close.science>far.science);
});
test('V3: seeded cross-design cases preserve bytes and science without NaN or capacity overflow',()=>{
 const rng=seededRandom(4385);let launched=0;
 for(let i=0;i<100;i++){
  const d={...PRESETS.balanced,fuel:20+rng()*60,altitude:50+rng()*150,inclination:rng()*90,arrayScale:.75+rng()*.75,batteryScale:.75+rng()*.75,duty:.25+rng()*.75,distance:['near','mean','far'][i%3]};
  for(const [k,list]of Object.entries(CATALOG))d[k]=list[Math.floor(rng()*list.length)].id;
  if(!calculate(d).launchable)continue;launched++;const r=runToEnd(d,{mode:i%2?'science':'aggressive'});assert.equal(r.done,true);const a=calculate(r.design);
  near(r.generated,r.returned+r.backlog+r.lostMB);near(r.generatedScience,r.science+r.qualityBacklog+r.lostScience);
  for(const h of r.history){assert.ok(Number.isFinite(h.science));assert.ok(h.battery>=0&&h.battery<=100);assert.ok(h.backlog>=-1e-8&&h.backlog<=a.c.storage.capacity+1e-8);}
 }
 assert.ok(launched>=25);
});
test('V3: every help-library button retrieves a supported answer',()=>{
 for(const t of HELP_TOPICS){const a=answerQuestion(t[1]);assert.equal(a.known,true,t[1]);assert.ok(a.text.length>50,t[1]);}
});
test('V3: assistant answers actual selected parts and live mission values',()=>{
 const s=operations({...PRESETS.balanced,batteryScale:1.5});s.science=125;s.battery=100;
 assert.match(answerQuestion('What does the precision bus do?').text,/15/);
 assert.match(answerQuestion('Explain all the components').text,/seven/);
 assert.match(answerQuestion('Why is my battery dropping?',{run:s}).text,/360 Wh/);
 assert.match(answerQuestion('What is my science score?',{run:s}).text,/125/);
 assert.match(answerQuestion('What is the specific impulse of my thruster?',{run:s}).text,/225/);
});
test('V3: assistant has Bangla support and honest unsupported-question fallback',()=>{
 assert.match(answerQuestion('ব্যাটারি কমছে কেন',{language:'bn'}).text,/ব্যাটারি|battery/);
 for(const q of ['What is 2+2?','Who is the president?','What is the exact battery chemistry?','What is the Moon distance today?','Please guarantee a competition win'])assert.equal(answerQuestion(q).known,false,q);
 assert.equal(answerQuestion('Moon weather tomorrow?').known,false);
});
