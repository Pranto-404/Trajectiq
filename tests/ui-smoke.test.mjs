import test from 'node:test';
import assert from 'node:assert/strict';
test('Application DOM adapter: navigate every screen, launch, recover, debrief, redesign and compare',async()=>{
  const handlers={},elements=Object.fromEntries(['#app','#modal-root','#toast'].map(k=>[k,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},focus(){}}]));
  const intervals=new Map();let i=0;
  globalThis.document={activeElement:{focus(){}},querySelector:s=>elements[s]||null,addEventListener:(type,fn)=>handlers[type]=fn};
  globalThis.window={scrollTo(){}};
  const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  const nativeTimeout=globalThis.setTimeout,nativeClear=globalThis.clearTimeout;
  globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};globalThis.setInterval=fn=>{intervals.set(++i,fn);return i;};globalThis.clearInterval=id=>intervals.delete(id);
  await import('../dist/ui/app.js');
  const click=dataset=>handlers.click({target:{closest:()=>({dataset})},preventDefault(){}}),html=()=>elements['#app'].innerHTML;
  assert.match(html(),/Your first mission/);
  for(const [page,needle] of [['brief','The Moon is waiting'],['architect','Build with intention'],['readiness','Know what you are accepting'],['control','No mission in flight'],['debrief','Every outcome has a reason'],['trade','There is no perfect spacecraft'],['sources','Show your working']]){click({page});assert.ok(html().includes(needle),page);}
  click({action:'pitch'});assert.match(html(),/90-SECOND PITCH PATH/);assert.match(html(),/Polar imager/);
  click({action:'readiness'});click({action:'launch'});assert.match(html(),/Your design is now in flight/);
  let decisions=0;
  for(let j=0;j<10&&!html().includes('Understand. Then improve.');j++){
    click({action:'fast'});
    if(html().includes('DECISION REQUIRED')){
      const action=html().includes('data-recovery="continue"')?'continue':html().includes('data-recovery="wait"')?'wait':'nominal';
      click({recovery:action});decisions++;
    }
  }
  assert.match(html(),/MISSION OBJECTIVE INCOMPLETE/);assert.ok(decisions>=2);assert.match(html(),/CAUSAL TRACES/);
  click({action:'preset-resilient'});click({action:'readiness'});click({action:'launch'});
  for(let j=0;j<10&&!html().includes('Understand. Then improve.');j++){
    click({action:'fast'});
    if(html().includes('DECISION REQUIRED'))click({recovery:html().includes('data-recovery="continue"')?'continue':html().includes('data-recovery="wait"')?'wait':'nominal'});
  }
  assert.match(html(),/MISSION OBJECTIVE ACHIEVED/);assert.match(html(),/Changed: Power system, Communications/);
  click({page:'trade'});assert.match(html(),/2 SAVED RUNS/);assert.match(html(),/R01/);assert.match(html(),/R02/);
  click({action:'mentor'});assert.match(elements['#modal-root'].innerHTML,/MISSION COPILOT/);click({action:'close'});
  click({action:'quiz'});assert.match(elements['#modal-root'].innerHTML,/LEARNING CHECK/);click({answer:'1'});assert.match(elements['#modal-root'].innerHTML,/Next question/);
  assert.equal(JSON.parse(storage.get('trajectiq-v1')).runs.length,2);
  globalThis.setTimeout=nativeTimeout;globalThis.clearTimeout=nativeClear;
});
