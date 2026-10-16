import test from 'node:test';
import assert from 'node:assert/strict';
function copilotAdapter(){
 const handlers={},storage=new Map(),intervals=new Map();let timer=0;
 const elements=Object.fromEntries(['#app','#modal-root','#toast','#assistant-question','#assistant-thread','#experiment-field','#experiment-value','#experiment-range'].map(k=>[k,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){}},focus(){},get firstChild(){return this.innerHTML?{}:null;}}]));
 globalThis.document={body:{classList:{toggle(){}}},activeElement:{focus(){}},querySelector:s=>elements[s]||null,addEventListener:(k,fn)=>handlers[k]=fn};
 globalThis.window={scrollTo(){}};globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};globalThis.setInterval=fn=>{intervals.set(++timer,fn);return timer;};globalThis.clearInterval=id=>intervals.delete(id);
 return {handlers,elements,storage,intervals,click:dataset=>handlers.click({target:{closest:()=>({dataset})},preventDefault(){}}),submit:id=>handlers.submit({target:{id},preventDefault(){}}),draft:()=>JSON.parse(storage.get('trajectiq-v1')).design,modal:()=>elements['#modal-root'].innerHTML};
}
test('Copilot interface: preview is read-only, Apply updates draft, stale proposals cannot overwrite a newer design',async()=>{
 const ui=copilotAdapter();await import('../dist/ui/app.js?copilot-apply');ui.click({action:'game-accept'});ui.click({action:'preset-balanced'});const before=ui.draft();
 ui.click({ask:'What if fuel = 45'});assert.match(ui.modal(),/Game simulation results/);assert.match(ui.modal(),/data-assistant-apply="0"/);assert.deepEqual(ui.draft(),before);
 ui.click({assistantApply:'0'});assert.equal(ui.draft().fuel,45);assert.equal(ui.intervals.size,0);assert.equal(ui.modal(),'');
 ui.click({ask:'What if battery size = 1.5'});ui.click({action:'close'});ui.click({component:'compact',kind:'power'});
 ui.click({assistantApply:'1'});assert.equal(ui.draft().batteryScale,1);assert.match(ui.elements['#toast'].textContent,/design has changed/);
});
test('Copilot interface: experiment form and picker work; flight changes remain locked',async()=>{
 const ui=copilotAdapter();await import('../dist/ui/app.js?copilot-lock');ui.click({action:'game-accept'});ui.click({action:'preset-balanced'});ui.click({action:'mentor'});
 ui.elements['#experiment-field'].value='fuel';ui.elements['#experiment-value'].value='45';ui.submit('experiment-form');assert.match(ui.modal(),/Fuel \(kg\) = 45/);
 ui.handlers.change({target:{id:'experiment-field',value:'batteryScale',dataset:{}}});assert.equal(ui.elements['#experiment-value'].value,1);assert.equal(ui.elements['#experiment-value'].min,.75);
 ui.handlers.change({target:{id:'experiment-part',value:'What if Compact solar kit',dataset:{}}});assert.match(ui.modal(),/Compact solar kit/);
 ui.click({action:'close'});ui.click({action:'game-launch'});assert.ok(ui.intervals.size>0);const before=ui.draft();
 ui.click({ask:'What if fuel = 45'});assert.equal(ui.intervals.size,0);assert.match(ui.modal(),/data-assistant-apply="2" disabled/);
 ui.click({assistantApply:'2'});assert.deepEqual(ui.draft(),before);assert.match(ui.elements['#toast'].textContent,/Finish the current flight/);
 ui.click({action:'clear-chat'});assert.doesNotMatch(ui.modal(),/class="chat-question"/);
});
test('Copilot interface: questions render as text and forecast provenance stays visible',async()=>{
 const ui=copilotAdapter();await import('../dist/ui/app.js?copilot-escape');ui.click({action:'game-accept'});ui.click({action:'preset-balanced'});
 ui.click({ask:'<img src=x onerror=alert(1)> What if fuel = 45'});assert.doesNotMatch(ui.modal(),/<img src=x/);assert.match(ui.modal(),/&lt;img/);
 ui.click({ask:'What if fuel = 45'});assert.match(ui.modal(),/GAME MODEL · SIMULATION/);assert.match(ui.modal(),/CURRENT DRAFT/);
 ui.click({ask:'why?'});assert.match(ui.modal(),/rocket equation/);
});
