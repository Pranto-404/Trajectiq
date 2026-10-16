import test from 'node:test';
import assert from 'node:assert/strict';
function adapter(saved='null'){
 const handlers={},storage=new Map([['trajectiq-v1',saved]]),intervals=new Map();let timer=0;
 const elements=Object.fromEntries(['#app','#modal-root','#toast','#assistant-question','#custom-summary','#assistant-thread'].map(k=>[k,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){}},focus(){},get firstChild(){return this.innerHTML?{}:null;}}]));
 globalThis.document={body:{classList:{toggle(){}}},activeElement:{focus(){}},querySelector:s=>elements[s]||null,addEventListener:(k,fn)=>handlers[k]=fn};globalThis.window={scrollTo(){}};globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};globalThis.setInterval=fn=>{intervals.set(++timer,fn);return timer;};globalThis.clearInterval=id=>intervals.delete(id);
 return {handlers,elements,storage,intervals,click:dataset=>handlers.click({target:{closest:()=>({dataset})},preventDefault(){}}),change:(dataset,value,checked)=>handlers.change({target:{dataset,value,checked}}),html:()=>elements['#app'].innerHTML};
}
test('V3 UI: corrupted saved state opens safely instead of a blank game',async()=>{
 for(const [i,saved]of ['null','[]','{"runs":{}}','{broken','{"design":{"fuel":"bad"},"runs":[null,{}]}'].entries()){
  const ui=adapter(saved);await import('../dist/ui/app.js?corrupt='+i);assert.match(ui.html(),/Your first mission/);ui.click({action:'game-accept'});ui.click({page:'trade'});assert.match(ui.html(),/There is no perfect spacecraft/);
 }
});
test('V3 UI: customization persists engineering choices and renders mission names safely',async()=>{
 const ui=adapter('{}');await import('../dist/ui/app.js?custom');ui.click({action:'game-accept'});ui.click({action:'preset-balanced'});ui.click({action:'customize'});
 assert.match(ui.elements['#modal-root'].innerHTML,/value="1" selected/);ui.change({custom:'batteryScale'},'1.5');ui.change({custom:'distance'},'far');ui.change({custom:'duty'},'.5');ui.change({custom:'name'},'Nafi & "Moon"');ui.click({action:'apply-custom'});
 const data=JSON.parse(ui.storage.get('trajectiq-v1'));assert.equal(data.design.batteryScale,1.5);assert.equal(data.design.duty,.5);assert.equal(data.design.distance,'far');assert.match(ui.html(),/Nafi &amp; &quot;Moon&quot;/);assert.match(ui.elements['#custom-summary'].innerHTML,/360 Wh/);
});
test('V3 UI: assistant pauses flight, supports submitted questions and retains the locked flight on design screens',async()=>{
 const ui=adapter('{}');await import('../dist/ui/app.js?assistant');ui.click({action:'game-accept'});ui.click({action:'game-launch'});assert.ok(ui.intervals.size>0);
 ui.click({action:'mentor'});assert.equal(ui.intervals.size,0);ui.click({action:'play'});assert.equal(ui.intervals.size,0,'reading modal must not restart the clock');
 ui.elements['#assistant-question'].value='What is the exact battery chemistry?';ui.handlers.submit({target:{id:'assistant-form'},preventDefault(){}});assert.match(ui.elements['#modal-root'].innerHTML,/can’t answer/);
 ui.change({pref:'language'},'bn');ui.click({ask:'How do I play?'});assert.match(ui.elements['#modal-root'].innerHTML,/Balanced build নিন/);ui.click({action:'close'});
 ui.click({page:'architect'});ui.click({component:'compact',kind:'power'});ui.click({action:'mentor'});ui.click({ask:'Why is my battery dropping?'});assert.match(ui.elements['#modal-root'].innerHTML,/240 Wh battery/);assert.equal(ui.intervals.size,0);
});
