import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,HELP_TOPICS} from '../dist/engine/assistant.js';
import {presetFor,PRESETS} from '../dist/data/catalog.js';
import {normalize,newRun,advance,runToEnd,calculate} from '../dist/engine/model.js';

// Adversarial questions deliberately contain valid topic words: an unrelated noun
// must not select a familiar answer merely because Moon, NASA or battery appears.
const outside=[
 'night temperature','surface radiation','battery chemistry','spacecraft manufacturer',
 'weather forecast','astronaut salary','engineering career','dust storm forecast',
 'landing trajectory','radiation shielding','thermal analysis','real launch window',
 'atmospheric pressure','latest news','president','football score',
 'stock price','water recipe','life support requirements','ephemeris today'
];
for(const subject of ['Moon','Mars','NASA','TRAJECTIQ'])for(const topic of outside)test(`Assistant rejects unrelated ${subject}: ${topic}`,()=>{
 const a=answerQuestion(`Tell me about ${subject} ${topic}`);
 assert.equal(a.known,false);assert.equal(a.proposal,undefined);assert.deepEqual(a.sources,[]);
});
const routes=[
 ['Is this NASA certified?','assumptions'],['Is this NASA certification?','assumptions'],
 ['Which NASA data is actually used?','nasa'],['Explain NASA sources','nasa'],
 ['How does distance affect the link?','distance'],['What is signal delay?','distance'],
 ['How do I share my saved mission?','save'],['Can I save an unfinished mission?','save'],
 ['How does autosave work?','save'],['Can I restore an exported report?','save'],
 ['Can my friends play together?','team'],['Is online multiplayer supported?','team'],
 ['Can I replace my battery during flight?','repair'],['Can I repair after launch?','repair'],
 ['How do I rotate the spacecraft?','camera'],['How do I zoom the 3D view?','camera'],
 ['How do I restart?','restart'],['How do I discard the mission?','restart'],
 ['How do I play?','start'],['kibhabe khelbo','start'],
 ['battery komche keno','battery'],['Why is my batery dropping?','battery'],
 ['ব্যাটারি কমছে কেন','battery'],['ডেটা ভরে গেছে','data'],
 ['What is instrument duty?','custom'],['What is orbital inclination?','orbit'],
 ['What is altitude?','orbit'],['How much fuel do I need?','fuel'],
 ['What is delta v?','fuel'],['Explain the bus','category-bus'],
 ['What is the payload?','category-payload'],['What is the antenna?','category-comms'],
 ['Explain the launcher','category-launch'],['Why is launch blocked?','mass'],
 ['What counts as success?','goal'],['Why did my mission fail?','report'],
 ['How does time work?','time'],['What is the robustness index?','robust'],
 ['Can I change planet?','destination'],['Can I switch to Mars?','destination'],
 ['How do I play on Android?','screens'],['Why is the screen blank?','screens'],
 ['What can the assistant answer?','help'],['Explain all the components','parts']
];
for(const [q,topic]of routes)test(`Assistant route: ${q}`,()=>{
 const a=answerQuestion(q);assert.equal(a.known,true,JSON.stringify(a));assert.equal(a.topic,topic);
});
const experiments=[
 ['What if fuel = 45 kg','fuel',45],['What if fuel = +45','fuel',45],['What if fuel = 0','fuel',0],
 ['What if altitude = 75 km','altitude',75],['What if inclination = 85 degrees','inclination',85],
 ['What if battery size = 125%','batteryScale',1.25],['What if battery size = 125 percent','batteryScale',1.25],
 ['What if battery size = ১২৫ শতাংশ','batteryScale',1.25],['What if battery size = .75','batteryScale',.75],
 ['What if batteryScale = 1.25','batteryScale',1.25],['What if solar array size = 1.25×','arrayScale',1.25],
 ['What if array size = 125%','arrayScale',1.25],['What if arrayScale = 1.5','arrayScale',1.5],
 ['What if duty = 75%','duty',.75],['যদি জ্বালানি ৪৫','fuel',45],
 ['What if duty = .5','duty',.5],['What if distance far','distance','far'],
 ['What if I select a high-gain antenna?','comms','highgain']
];
for(const [q,key,value]of experiments)test(`Assistant simulates parsed input: ${q}`,()=>{
 const d=normalize(PRESETS.fragile),before=JSON.stringify(d),a=answerQuestion(q,{design:d});
 assert.equal(a.known,true,JSON.stringify(a));assert.equal(a.comparisons[1].design[key],value);assert.equal(JSON.stringify(d),before);
 const expected=runToEnd({...d,[key]:value},{mode:'science',policy:'conservative'});
 assert.equal(a.comparisons[1].science,expected.science);assert.match(a.text,/Original → proposed/);
});
for(const q of [
 'What if fuel = -1','What if fuel = 71','What if fuel = 45%','What if fuel = 45 km',
 'What if fuel = 45 dollars','What if fuel = 0x20','What if fuel = 1e2','What if fuel = NaN',
 'What if battery size = Infinity','What if battery size = 0','What if battery size = 151%',
 'What if battery size = 1.25 kg','What if battery size = 125','What if array size = 200%',
 'What if altitude = 0','What if altitude = 500','What if altitude = 75 kg','What if inclination = 91',
 'What if duty = 101%','What if duty = 0','What if duty = -25%',
 'What if fuel = 45 and duty = 75%','What if fuel = 45 or 55','What happens if I reduce instrument duty?',
 'What if NASA guarantees this mission','What if warp drive','What if fuel = 45 banana',
 'What if Compact bus and Precision bus','What if fuel = 4.5.0'
])test(`Assistant rejects ambiguous/invalid input: ${q}`,()=>{
 const a=answerQuestion(q);assert.equal(a.known,false,JSON.stringify(a));assert.equal(a.proposal,undefined);
});
for(const q of ['How much does a real spacecraft cost?','What is the real NASA mission budget?','How much is the antenna in dollars?','What is the actual cost?','How much does real fuel cost?'])test(`Assistant distinguishes game credits: ${q}`,()=>{
 const a=answerQuestion(q);assert.equal(a.known,false);assert.equal(a.topic,undefined);
});
test('Assistant all FAQ buttons work in English and Bangla',()=>{
 for(const language of ['en','bn'])for(const topic of HELP_TOPICS)assert.equal(answerQuestion(topic[1],{language}).known,true,topic[1]);
});
test('Assistant Mars context uses destination constants and same engine forecasts',()=>{
 const design=presetFor('mars');
 for(const q of ['What is altitude?','Which NASA data is actually used?','How does distance affect the link?','How do I play?']){
  const a=answerQuestion(q,{design});assert.equal(a.known,true);assert.match(a.text,/Mars/);assert.doesNotMatch(a.text,/1,737|4,902|384,400/);
 }
 const a=answerQuestion('What if altitude = 500 km',{design});assert.equal(a.comparisons[1].design.altitude,500);
 assert.equal(a.comparisons[1].science,runToEnd({...design,altitude:500},{mode:'science',policy:'conservative'}).science);
 assert.equal(answerQuestion('What if altitude = 100 km',{design}).known,false);
});
test('Assistant explanations remain honest for saves, certification, multiplayer and unknown followups',()=>{
 assert.match(answerQuestion('Is this NASA certified?').text,/NASA has not certified/);
 assert.match(answerQuestion('How do I share my saved mission?').text,/not a playable restore file/);
 assert.match(answerQuestion('Can I save an unfinished mission?').text,/active-flight checkpoint/);
 assert.match(answerQuestion('Is online multiplayer supported?').text,/not network multiplayer/);
 assert.equal(answerQuestion('why?').known,false);
 const first=answerQuestion('What if battery size = 125%');
 assert.equal(answerQuestion('why?',{history:[{answer:first}]}).comparisons,first.comparisons);
});
test('Assistant state snapshots and crisis previews are side-effect free',()=>{
 let run=newRun(PRESETS.fragile);run.mode='aggressive';while(!run.crisis&&!run.done)run=advance(run);
 const before=JSON.stringify(run),a=answerQuestion('Compare crisis choices',{run});
 assert.ok(a.comparisons.length);assert.equal(JSON.stringify(run),before);assert.equal(a.proposal,undefined);
 const complete=runToEnd(PRESETS.balanced);assert.ok(answerQuestion('Why did my mission fail?',{run:complete}).text.includes(complete.science.toLocaleString('en-US',{maximumFractionDigits:1})));
 const live=answerQuestion('Why is my battery dropping?',{run});assert.ok(live.text.includes(Number(run.battery).toLocaleString('en-US',{maximumFractionDigits:1})));
});

test('Assistant numeric follow-up preserves only the prior supported single field',()=>{
 const first=answerQuestion('What if battery size = 125%');
 for(const q of ['and 150%?','what about 150 percent?','আর ১৫০ শতাংশ?']){
  const a=answerQuestion(q,{history:[{answer:first}]});
  assert.equal(a.known,true);assert.equal(a.proposal.patch.batteryScale,1.5);
 }
 assert.equal(answerQuestion('and 150%?').known,false);
 assert.equal(answerQuestion('and 150%?',{history:[{answer:answerQuestion('Which NASA data is actually used?')}]}).known,false);
 assert.equal(answerQuestion('and 999%?',{history:[{answer:first}]}).known,false);
});
test('Assistant reports the actual throttled instrument data rate during flight',()=>{
 const run=newRun(PRESETS.balanced);run.throttle=.25;
 const a=answerQuestion('Why is my recorder full?',{run});
 const expected=(calculate(run.design).c.payload.dataMbps*.25).toLocaleString('en-US',{maximumFractionDigits:2});
 assert.ok(a.text.includes(`${expected} Mb/s.`));
});
