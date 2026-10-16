import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion} from '../dist/engine/assistant.js';
import {designPreview,reviewDesign,continuePreview} from '../dist/engine/copilot.js';
import {PRESETS,CATALOG} from '../dist/data/catalog.js';
import {normalize,newRun,advance,resolve,runToEnd,calculate} from '../dist/engine/model.js';
const approx=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);

test('Copilot: what-if results match independent complete engine runs and never mutate inputs',()=>{
 const d=normalize(PRESETS.fragile),before=JSON.stringify(d),r=answerQuestion('What if Endurance solar kit',{design:d});
 assert.equal(r.known,true);assert.equal(r.comparisons.length,2);assert.deepEqual(r.proposal.patch,{power:'endurance'});
 for(const [i,design]of [d,{...d,power:'endurance'}].entries()){
  const expected=runToEnd(design,{mode:'science',policy:'conservative'});
  approx(r.comparisons[i].science,expected.science);approx(r.comparisons[i].lostMB,expected.lostMB);approx(r.comparisons[i].battery,expected.outcome.finalBattery);
 }
 assert.equal(JSON.stringify(d),before);
});
test('Copilot: every catalog option can be previewed without ambiguous part matching',()=>{
 for(const [key,list]of Object.entries(CATALOG))for(const p of list){
  const r=answerQuestion('What if '+p.name,{design:PRESETS.balanced});assert.equal(r.known,true,p.name);assert.equal(r.comparisons[1].design[key],p.id,p.name);
 }
});
test('Copilot: unsupported numbers are rejected; Bangla digits, fractions and percentages work',()=>{
 for(const q of ['What if fuel = -1','What if fuel = 99','What if duty = 0','What if altitude = 999','What if fuel = 45 and altitude = 75','What if battery size = Infinity','What if warp drive']){
  const r=answerQuestion(q);assert.equal(r.known,false,q);assert.equal(r.proposal,undefined,q);
 }
 assert.equal(answerQuestion('যদি জ্বালানি ৪৫',{language:'bn'}).proposal.patch.fuel,45);
 assert.equal(answerQuestion('What if duty = 75%').proposal.patch.duty,.75);
 assert.equal(answerQuestion('What if battery size = 1.5').proposal.patch.batteryScale,1.5);
 assert.equal(answerQuestion('What if arrayScale = 1.25').proposal.patch.arrayScale,1.25);
 assert.equal(answerQuestion('What if distance far').proposal.patch.distance,'far');
});
test('Copilot: blocked designs show no invented science forecast',()=>{
 const r=answerQuestion('What if Expanded recorder',{design:{...PRESETS.balanced,bus:'compact'}});
 assert.equal(r.comparisons[1].launchable,false);assert.equal(r.comparisons[1].science,null);assert.match(r.comparisons[1].status,/blocked/);
 assert.ok(r.comparisons[1].warnings.some(w=>w.status==='fail'&&w.name==='Recorder interface'));
});
test('Copilot: a smaller thruster tank discloses the automatically reduced fuel',()=>{
 const r=answerQuestion('What if Standard thruster',{design:{...PRESETS.balanced,propulsion:'efficient',fuel:85}});
 assert.equal(r.comparisons[1].design.fuel,70);assert.match(r.text,/Fuel also changes to 70/);
});
test('Copilot: reviewer gives an actual tested candidate under an explicit bounded ranking',()=>{
 const d=normalize(PRESETS.fragile),r=reviewDesign(d);assert.ok(r.tested>20);assert.ok(r.best);assert.ok(r.best.science>r.base.science||r.best.achieved);
 const expected=designPreview({...d,...r.best.patch});approx(r.best.science,expected.science);
 const blocked=reviewDesign({...d,bus:'compact',storage:'expanded'});assert.ok(blocked.best.failures<blocked.base.failures);
 assert.match(answerQuestion('Review my design').text,/not a global optimum/);
});
test('Copilot: crisis forecasts continue from the exact current state and leave it intact',()=>{
 let r=newRun(PRESETS.fragile);r.mode='aggressive';for(let i=0;i<100&&!r.crisis;i++)r=advance(r);
 assert.ok(r.crisis);const original=JSON.stringify(r),answer=answerQuestion('Compare crisis choices',{run:r});
 const options=r.crisis.actions.filter(x=>!x.disabled);assert.equal(answer.comparisons.length,options.length);
 for(const [i,option]of options.entries()){
  const expected=continuePreview(resolve(r,option.id));approx(answer.comparisons[i].science,expected.science);approx(answer.comparisons[i].battery,expected.outcome.finalBattery);
 }
 assert.equal(JSON.stringify(r),original);assert.equal(answer.proposal,undefined);
});
test('Copilot: previews respect disabled capture decisions and handle an ended mission',()=>{
 let r=newRun({...PRESETS.balanced,fuel:1});r=advance(advance(r));assert.ok(r.crisis);
 const answer=answerQuestion('Compare crisis choices',{run:r});assert.equal(answer.comparisons.length,1);assert.equal(answer.comparisons[0].status,'Capture aborted');
 const ended=continuePreview(r);assert.deepEqual(continuePreview(ended),ended);assert.match(answerQuestion('Mission status',{run:ended}).text,/debrief/);
});
test('Copilot: conversational follow-up retains the last supported topic',()=>{
 const first=answerQuestion('What if fuel = 45');const follow=answerQuestion('why?',{history:[{q:'What if fuel = 45',answer:first}]});
 assert.equal(follow.known,true);assert.equal(follow.comparisons,first.comparisons);assert.match(follow.text,/rocket equation/);
 const battery=answerQuestion('Why is my battery dropping?');assert.match(answerQuestion('explain more',{history:[{answer:battery}]}).text,/Safe mode/);
});
test('Copilot: common spelling mistakes, Banglish and unknown questions route honestly',()=>{
 assert.match(answerQuestion('Why is my batery dropping?').text,/Wh/);
 assert.match(answerQuestion('battery komche keno').text,/Wh/);
 assert.match(answerQuestion('ekhon ki korbo',{language:'bn'}).text,/Launch readiness/);
 for(const q of ['What is the battery chemistry?','Predict Moon weather today','What if NASA guarantees this mission'])assert.equal(answerQuestion(q).known,false);
});
test('Copilot: current-state advice and fill-time calculations use actual mission values',()=>{
 const r=newRun({...PRESETS.balanced,duty:.5});r.phase='operations';r.minute=70;r.science=200;r.backlog=200;r.battery=20;
 const status=answerQuestion('Mission status',{run:r});assert.match(status.text,/200 \/ 520/);assert.match(status.text,/Conserve energy/);
 r.throttle=.25;const estimate=answerQuestion('How long to fill the recorder?',{run:r});
 const rate=calculate(r.design).c.payload.dataMbps*.25*60/8;assert.match(estimate.text,new RegExp(((256-200)/rate).toLocaleString('en-US',{maximumFractionDigits:1})));
});
