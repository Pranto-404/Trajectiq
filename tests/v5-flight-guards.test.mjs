import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,advance,resolve,runToEnd,robustness} from '../dist/engine/model.js';
import {PRESETS,VERSION} from '../dist/data/catalog.js';
let serial=0;
async function uiAdapter(saved={}){
 const handlers={},storage=new Map([['trajectiq-v1',(typeof saved==='string'?saved:JSON.stringify(saved))]]),intervals=new Map(),timeouts=new Map();let timer=0,focusCount=0;
 const elements=Object.fromEntries(['#app','#modal-root','#toast','#custom-summary','#assistant-thread'].map(k=>[k,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},focus(){},get firstChild(){return this.innerHTML?{}:null;}}]));
 const focusTarget={dataset:{action:'mentor'},isConnected:false,focus(){throw new Error('stale element focus');}},replacement={focus(){focusCount++;}};
 globalThis.document={body:{classList:{toggle(){}}},activeElement:focusTarget,querySelector:s=>s==='[data-action="mentor"]'?replacement:elements[s]||null,addEventListener:(k,fn)=>handlers[k]=fn};globalThis.window={scrollTo(){}};globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.setTimeout=(fn,delay)=>{const id=++timer;if(delay===0)timeouts.set(id,fn);return id;};globalThis.clearTimeout=id=>timeouts.delete(id);globalThis.setInterval=fn=>{intervals.set(++timer,fn);return timer;};globalThis.clearInterval=id=>intervals.delete(id);
 await import('../dist/ui/app.js?guards='+serial++);
 return {elements,handlers,intervals,timeouts,nextBatch:()=>{const [id,fn]=timeouts.entries().next().value||[];if(fn){timeouts.delete(id);fn();}},click:dataset=>handlers.click({target:{closest:()=>({dataset})},preventDefault(){}}),change:(dataset,value)=>handlers.change({target:{dataset,value}}),input:(dataset,value)=>handlers.input({target:{dataset,value}}),rawStored:()=>storage.get('trajectiq-v1'),stored:()=>JSON.parse(storage.get('trajectiq-v1')),html:()=>elements['#app'].innerHTML,focusCount:()=>focusCount};
}
test('Active flight cannot mutate through lab, sliders, custom fields, destination, presets or relaunch',async()=>{
 const ui=await uiAdapter();ui.click({action:'game-accept'});ui.click({action:'game-launch'});ui.click({action:'step'});const baseline=ui.stored();
 ui.click({page:'architect'});ui.click({component:'compact',kind:'power'});ui.input({field:'fuel'},'1');ui.change({field:'inclination'},'30');ui.change({custom:'name'},'Changed');ui.change({gamefield:'destination'},'mars');ui.click({action:'launch'});
 assert.deepEqual(ui.stored().design,baseline.design);assert.deepEqual(ui.stored().checkpoint.run,baseline.checkpoint.run);
 ui.click({action:'preset-fragile'});assert.match(ui.elements['#modal-root'].innerHTML,/Discard the active flight/);ui.click({action:'close'});assert.deepEqual(ui.stored().checkpoint.run,baseline.checkpoint.run);
 ui.click({action:'pitch'});ui.click({action:'close'});assert.deepEqual(ui.stored().checkpoint.run,baseline.checkpoint.run);
 ui.click({action:'start'});ui.click({action:'confirm-discard'});assert.equal(ui.stored().checkpoint,null);assert.match(ui.html(),/Your first mission/);
});
test('Validated checkpoint returns paused on reload, including a pending decision',async()=>{
 let run=newRun(PRESETS.fragile);for(let i=0;i<100&&!run.crisis;i++)run=advance(run);
 assert.ok(run.crisis);let ui=await uiAdapter({checkpoint:{schema:1,version:VERSION,run}});assert.match(ui.elements['#modal-root'].innerHTML,/Resume your saved mission/);assert.equal(ui.intervals.size,0);assert.deepEqual(ui.stored().checkpoint.run,run);ui.click({action:'resume-checkpoint'});assert.match(ui.html(),/DECISION REQUIRED/);
 for(const patch of [{schema:999},{version:'old'},{run:{...run,battery:-4}},{run:{...run,logs:[{}]}},{run:{...run,phase:'invalid'}}]){ui=await uiAdapter({checkpoint:{schema:1,version:VERSION,run,...patch}});assert.match(ui.html(),/Your first mission/);assert.match(ui.elements['#modal-root'].innerHTML,/Saved flight needs attention/);ui.click({action:'launch'});assert.equal(ui.stored().checkpoint.version,patch.version||VERSION);ui.click({action:'discard-rejected-save'});assert.equal(ui.stored().checkpoint,null);}
});
test('Power/comms patch has a preview and retains custom spacecraft fields',async()=>{
 const design={...PRESETS.fragile,name:'Custom mission',fuel:48,altitude:130,inclination:60,livery:'coral',batteryScale:1.25,duty:.5};const ui=await uiAdapter({design});const before=ui.stored().design;
 ui.click({action:'game-fix'});assert.match(ui.elements['#modal-root'].innerHTML,/Wet mass/);assert.deepEqual(ui.stored().design,before);ui.click({action:'confirm-power-fix'});
 const after=ui.stored().design;for(const k of ['name','fuel','altitude','inclination','livery','batteryScale','duty','payload','bus','launch'])assert.equal(after[k],design[k]);assert.equal(after.power,'endurance');assert.equal(after.comms,'highgain');
});
test('Dialog makes background inert and restores replacement initiating control after render',async()=>{
 const ui=await uiAdapter();ui.click({action:'game-accept'});ui.click({action:'game-launch'});ui.click({action:'mentor'});assert.equal(ui.intervals.size,0);assert.equal(ui.elements['#app'].inert,true);ui.click({action:'close'});assert.equal(ui.elements['#app'].inert,false);assert.equal(ui.focusCount(),1);
});
test('Mars selector exposes destination-specific orbit range and guard; raw-science plot preserves above-target differences',async()=>{
 const ui=await uiAdapter();ui.click({action:'game-accept'});ui.change({gamefield:'destination'},'mars');assert.equal(ui.stored().design.destination,'mars');assert.equal(ui.stored().design.altitude,400);assert.match(ui.html(),/id="game-altitude" min="200" max="1000"/);assert.match(ui.html(),/Mars Polar Mapper/);
 const a=runToEnd(PRESETS.balanced,{policy:'conservative'});Object.assign(a,{id:'a',label:'R01',modelVersion:VERSION});const b=structuredClone(a);Object.assign(b,{id:'b',label:'R02'});b.outcome.science+=200;
 const chart=await uiAdapter({runs:[a,b]});chart.click({page:'trade'});assert.match(chart.html(),/actual returned science units/);const circles=[...chart.html().matchAll(/circle cx="[^"]+" cy="([^"]+)"/g)];assert.equal(circles.length,2);assert.notEqual(circles[0][1],circles[1][1]);assert.match(chart.html(),/observational comparison/);
});

test('Uncertainty batches yield, reject duplicates, cancel safely and match deterministic engine results',async()=>{
 const ui=await uiAdapter();ui.click({page:'readiness'});ui.click({action:'robust'});assert.equal(ui.timeouts.size,1);ui.click({action:'robust'});assert.equal(ui.timeouts.size,1);
 ui.nextBatch();assert.equal(ui.timeouts.size,1);ui.click({action:'cancel-robust'});assert.equal(ui.timeouts.size,0);assert.match(ui.elements['#toast'].textContent,/cancelled/);
 ui.click({action:'robust'});for(let i=0;i<200;i++)ui.nextBatch();assert.equal(ui.timeouts.size,0);const expected=robustness(PRESETS.balanced);assert.match(ui.html(),new RegExp(`${expected.passed} / 200 modeled variations`));
 ui.click({action:'robust'});ui.click({page:'game'});assert.equal(ui.timeouts.size,0);
});
test('Mars sources and customization use Mars range and explicit game assumptions',async()=>{
 const ui=await uiAdapter();ui.change({gamefield:'destination'},'mars');ui.click({action:'customize'});assert.match(ui.elements['#modal-root'].innerHTML,/225,000,000/);assert.match(ui.elements['#modal-root'].innerHTML,/586.2/);assert.doesNotMatch(ui.elements['#modal-root'].innerHTML,/384,400/);ui.click({action:'close'});ui.click({page:'sources'});assert.match(ui.html(),/NASA Mars Fact Sheet/);assert.match(ui.html(),/GAME ASSUMPTION/);assert.match(ui.html(),/not an observed average/);
});
test('Commands cannot modify a finished mission or run before orbital operations',async()=>{
 const ui=await uiAdapter();ui.click({action:'game-launch'});const before=ui.stored().checkpoint.run;ui.click({command:'aggressive'});assert.deepEqual(ui.stored().checkpoint.run,before);
 const run=runToEnd(PRESETS.balanced);Object.assign(run,{id:'saved',label:'R01',modelVersion:VERSION});const done=await uiAdapter({runs:[run]});done.click({loadrun:'saved'});const report=done.html();done.click({command:'coast'});assert.equal(done.html(),report);assert.ok(report.includes((run.outcome.science/650*100).toFixed(1)+'%'));
});

test('Untrusted persisted event labels render as text and malformed archives cannot crash debrief',async()=>{
 const run=runToEnd(PRESETS.fragile);Object.assign(run,{id:'<img src=x>',label:'<svg onload=alert(1)>',modelVersion:VERSION});run.events[0].title='<img src=x onerror=alert(1)>';run.events[0].chain=['<script>bad</script>'];
 const ui=await uiAdapter({runs:[run]});ui.click({page:'trade'});assert.doesNotMatch(ui.html(),/<svg onload/);ui.click({loadrun:run.id});assert.doesNotMatch(ui.html(),/<img src=x/);assert.match(ui.html(),/&lt;img/);assert.match(ui.html(),/&lt;script/);
 const broken=await uiAdapter({runs:[{...run,events:[null]}]});broken.click({page:'debrief'});assert.match(broken.html(),/Complete a mission/);
});


test('Malformed raw JSON is preserved until explicit discard instead of silently overwritten',async()=>{
 for(const raw of ['{broken', 'null', '[]']){const ui=await uiAdapter(raw);assert.match(ui.elements['#modal-root'].innerHTML,/original text is preserved/);ui.click({action:'game-launch'});ui.change({custom:'name'},'Replacement');assert.equal(ui.rawStored(),raw);ui.click({action:'discard-rejected-save'});assert.equal(ui.stored().checkpoint,null);ui.click({action:'game-launch'});assert.ok(ui.stored().checkpoint);}
});


test('Operations dropdown input does not trigger a hardware lock or replace the control before change',async()=>{
 let run=newRun(PRESETS.balanced);while(run.phase!=='operations'&&!run.done){if(run.crisis)run=resolve(run,run.crisis.actions[0].id);else run=advance(run);}
 const ui=await uiAdapter({checkpoint:{schema:1,version:VERSION,run}});ui.click({action:'resume-checkpoint'});ui.click({page:'control'});
 let renders=0;const app=ui.elements['#app'];let html=app.innerHTML;Object.defineProperty(app,'innerHTML',{get:()=>html,set:v=>{renders++;html=v;}});
 ui.input({field:'mode'},'downlink');assert.equal(renders,0,'input must not remove the select before its change event');assert.doesNotMatch(ui.elements['#toast'].textContent,/Hardware is locked/);
 ui.change({field:'mode'},'downlink');assert.equal(ui.stored().checkpoint.run.mode,'downlink');assert.equal(ui.stored().checkpoint.run.autoResume,false);
 const restored=await uiAdapter(ui.stored());assert.equal(restored.stored().checkpoint.run.mode,'downlink');assert.equal(restored.intervals.size,0);
});
test('Coast command is accurately represented in telemetry schedule selector',async()=>{
 let run=newRun(PRESETS.balanced);while(run.phase!=='operations'&&!run.done){if(run.crisis)run=resolve(run,run.crisis.actions[0].id);else run=advance(run);}
 const ui=await uiAdapter({checkpoint:{schema:1,version:VERSION,run}});ui.click({action:'resume-checkpoint'});ui.click({command:'coast'});ui.click({page:'control'});
 assert.match(ui.html(),/<option value="coast" selected>Coast · save energy<\/option>/);assert.equal(ui.stored().checkpoint.run.mode,'coast');
});
