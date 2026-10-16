import test from 'node:test';
import assert from 'node:assert/strict';
test('Interactive game path: accept mission, install modules, launch, command, recover and redesign',async()=>{
  const handlers={},elements=Object.fromEntries(['#app','#modal-root','#toast'].map(k=>[k,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},focus(){}}]));
  globalThis.document={body:{classList:{toggle(){}}},activeElement:{focus(){}},querySelector:s=>elements[s]||null,addEventListener:(type,fn)=>handlers[type]=fn};
  globalThis.window={scrollTo(){}};const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};
  await import('../dist/ui/app.js');const click=dataset=>handlers.click({target:{closest:()=>({dataset})},preventDefault(){}}),html=()=>elements['#app'].innerHTML;
  click({action:'start'});assert.match(html(),/MISSION OFFER/);assert.match(html(),/game-canvas/);
  click({action:'game-accept'});assert.match(html(),/ASSEMBLY BAY/);assert.doesNotMatch(html(),/MISSION OFFER/);
  click({category:'power'});click({component:'compact',kind:'power'});assert.match(html(),/Compact solar kit/);
  const data=JSON.stringify({kind:'payload',id:'hires'});handlers.drop({target:{closest:()=>true},dataTransfer:{getData:()=>data},preventDefault(){}});assert.match(html(),/Polar imager/);
  click({action:'preset-fragile'});click({action:'game-review'});assert.match(elements['#modal-root'].innerHTML,/Commit your design/);
  click({action:'game-launch'});assert.match(html(),/You have the controls/);assert.match(html(),/FLIGHT ARCHITECTURE/);assert.match(html(),/data-command="coast"/);
  click({action:'step'});click({action:'step'});click({action:'step'});click({command:'aggressive'});assert.match(html(),/Operations: aggressive/);
  for(let i=0;i<12&&!html().includes('MISSION COMPLETE');i++){click({action:'fast'});if(html().includes('DECISION REQUIRED'))click({recovery:html().includes('data-recovery="continue"')?'continue':html().includes('data-recovery="wait"')?'wait':'nominal'});}
  assert.match(html(),/OBJECTIVE INCOMPLETE/);assert.match(html(),/Here is why it happened/);
  click({action:'game-fix'});assert.match(elements['#modal-root'].innerHTML,/Only Power system/);click({action:'confirm-power-fix'});assert.match(html(),/SPACECRAFT HANGAR/);click({category:'power'});assert.match(html(),/Endurance solar kit/);
  click({action:'game-review'});click({action:'game-launch'});click({action:'step'});click({action:'step'});click({action:'step'});click({command:'aggressive'});
  for(let i=0;i<12&&!html().includes('MISSION COMPLETE');i++){click({action:'fast'});if(html().includes('DECISION REQUIRED'))click({recovery:html().includes('data-recovery="continue"')?'continue':html().includes('data-recovery="wait"')?'wait':'nominal'});}
  assert.match(html(),/OBJECTIVE ACHIEVED/);assert.match(html(),/Changed: Power system, Communications/);assert.equal(JSON.parse(storage.get('trajectiq-v1')).runs.length,2);
});
