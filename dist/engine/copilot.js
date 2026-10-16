import {CATALOG,PRESETS,MISSION as M,presetFor} from '../data/catalog.js';
import {NASA_DATA,nasaDataset} from '../data/nasa.js';
import {calculate,normalize,clone,advance,resolve,runToEnd,linkEnvironment} from './model.js';

// Deterministic reasoning tools. Predictions always execute the same game engine.
const cpNum=(v,p=1)=>Number(v).toLocaleString('en-US',{maximumFractionDigits:p});
const cpPolicy={propulsion:'nominal',eclipse:'conserve',storage:'downlink',link:'wait'};
export const EXPERIMENT_FIELDS=[
 ['fuel','Fuel (kg)',0,90],['altitude','Altitude (km)',50,200],['inclination','Inclination (degrees)',0,90],
 ['arrayScale','Solar array size (×)',.75,1.5],['batteryScale','Battery size (×)',.75,1.5],['duty','Instrument duty (fraction)',.25,1]
];
export function continuePreview(input,firstAction=null){
 let r=clone(input);
 if(firstAction)r=resolve(r,firstAction);
 for(let i=0;i<180&&!r.done;i++){
  if(r.crisis){const options=r.crisis.actions.filter(x=>!x.disabled);const chosen=options.find(x=>x.id===cpPolicy[r.crisis.id])||options[0];if(!chosen)throw new Error('No valid recovery option');r=resolve(r,chosen.id);}
  else r=advance(r);
 }
 if(!r.done)throw new Error('Preview did not finish');
 return r;
}
export function designPreview(raw,label='Design'){
 const a=calculate(raw),r=a.launchable?runToEnd(a.d,{mode:'science',policy:'conservative'}):null;
 return {label,design:a.d,launchable:a.launchable,cost:a.cost,mass:a.wet,deltaV:a.deltaV,
  solarWatts:a.c.power.solar,scienceLoadWatts:a.base+a.c.payload.power*a.d.duty,returnedMB:r?.returned??null,science:r?.science??null,battery:r?.outcome.finalBattery??null,lostMB:r?.lostMB??null,
  achieved:r?.outcome.achieved??false,status:r?.outcome.status||'Launch blocked',
  warnings:a.checks.filter(x=>x.status!=='pass').map(x=>({name:x.name,status:x.status,value:x.value})),
  failures:a.checks.filter(x=>x.status==='fail').length};
}
const cpRank=(a,b)=>a.failures-b.failures||Number(b.achieved)-Number(a.achieved)||
 (a.achieved&&b.achieved?a.cost-b.cost:0)||(b.science??-1)-(a.science??-1)||a.cost-b.cost;
export function reviewDesign(raw){
 const d=normalize(raw),m=calculate(d).m,base=designPreview(d,'Current design'),candidates=[];
 for(const [key,parts] of Object.entries(CATALOG))for(const part of parts)if(part.id!==d[key])candidates.push({patch:{[key]:part.id},label:part.name});
 for(const [key,values]of Object.entries({fuel:[35,45,55,65],altitude:[m.altitudeMin,m.referenceAltitude,(m.altitudeMin+m.altitudeMax)/2],inclination:[85,90],arrayScale:[1,1.25,1.5],batteryScale:[1,1.25,1.5],duty:[.5,.75,1]}))
  for(const value of values)if(value!==d[key])candidates.push({patch:{[key]:value},label:`${key} = ${value}`});
 const trials=candidates.map(c=>({...designPreview({...d,...c.patch},c.label),patch:c.patch}));
 const better=trials.filter(c=>cpRank(c,base)<0).sort(cpRank);
 return {base,tested:trials.length,best:better[0]||null};
}
const cpAnswer=(title,text,extra={})=>({known:true,title,text,sources:[],suggestions:['Review my design','Compare presets','Explain NASA data'],evidence:'GAME MODEL · SIMULATION',...extra});
const cpScope=bn=>bn?'একই নিয়মে launch থেকে নতুন simulation: Map in sunlight; battery কমলে conserve; recorder ভরলে downlink; link খারাপ হলে wait। এটি game forecast, বাস্তব সাফল্যের সম্ভাবনা নয়।':'Fresh simulations from launch: Map in sunlight; conserve at an energy crisis; prioritize downlink at a recorder crisis; wait at degraded contact. This is a game forecast, not real-world success probability.';
function cpComparison(d,patch,label,bn){
 const base=designPreview(d,bn?'বর্তমান design':'Current design'),next=designPreview({...d,...patch},label);
 const changed=Object.keys(patch).filter(k=>base.design[k]!==next.design[k]);
 // Normalization can alter fuel when switching to a smaller propellant tank. Reveal it.
 const metrics=`\nOriginal → proposed: mass ${cpNum(base.mass)} → ${cpNum(next.mass)} kg; cost ${cpNum(base.cost)} → ${cpNum(next.cost)} credits; solar output ${cpNum(base.solarWatts)} → ${cpNum(next.solarWatts)} W; science load ${cpNum(base.scienceLoadWatts)} → ${cpNum(next.scienceLoadWatts)} W; returned science ${base.science===null?'not simulated':cpNum(base.science)} → ${next.science===null?'not simulated':cpNum(next.science)} units. Outcome: ${base.status} → ${next.status}.`;
 const secondary=base.design.fuel!==next.design.fuel&&!Object.hasOwn(patch,'fuel')?`\nFuel also changes to ${next.design.fuel} kg to fit the selected tank.`:'';
 return cpAnswer(bn?'বদলানোর আগে ফল দেখুন':'Preview before changing',
  `${cpScope(bn)}\n${changed.length?(bn?'নিচে একই নিয়মে দুই design-এর ফল। Apply চাপলেই শুধু draft বদলাবে।':'The table compares both designs under the same policy. Apply changes only your draft. Hardware is locked during an active flight.'):(bn?'এই মান ইতিমধ্যে নির্বাচিত।':'This value is already selected.')}${secondary}${metrics}`,
  {comparisons:[base,next],proposal:changed.length?{base:normalize(d),patch,label}:null,topic:'experiment',sources:[{title:'NASA/JPL destination constants used by the engine',url:nasaDataset(d).jplURL}]});
}
function cpPatch(q,d){
 const clean=q.toLowerCase().normalize('NFKC').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/[–−]/g,'-');
 const spec=[['fuel',/fuel|propellant|জ্বালানি|ফুয়েল/],['altitude',/altitude|height|উচ্চতা/],['inclination',/inclination|ঢাল/],['arrayScale',/arrayscale|(?:solar )?array size|solar size|panel size|সোলার সাইজ|প্যানেল সাইজ/],['batteryScale',/batteryscale|battery size|ব্যাটারি সাইজ/],['duty',/duty|ডিউটি/]];
 const fields=spec.filter(([,rx])=>rx.test(clean)),numbers=clean.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)||[];
 if(fields.length>1||numbers.length>1)return {error:'Change one variable at a time. Example: What if fuel = 45'};
 if(fields.length&&numbers.length){
  const rest=clean.replace(fields[0][1],' ').replace(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g,' ').replace(/\b(?:what|happens|happen|if|i|we|change|set|make|use|increase|decrease|to|is|the|my|size|simulate|a|an|at|equal|equals|percent|kg|km|degrees|degree|instrument)\b/g,' ').replace(/যদি|জ্বালানি|করি|হয়|হবে|সাইজ|শতাংশ|কেজি|কিমি/g,' ').replace(/[\s=×x%?!.,:]/g,'');
  if(rest)return {error:'I could not verify that input. Use one supported field and its unit, for example battery size = 125% or altitude = 100 km.'};
  const key=fields[0][0],f=EXPERIMENT_FIELDS.find(x=>x[0]===key);let value=Number(numbers[0]);if(['duty','arrayScale','batteryScale'].includes(key)&&/%|percent|শতাংশ/.test(clean))value/=100;
  if(/%|percent|শতাংশ/.test(clean)&&!['duty','arrayScale','batteryScale'].includes(key))return {error:'Percent units are supported only for battery size, array size and instrument duty.'};
  if(/\bkm\b/.test(clean)&&key!=='altitude'||/\bkg\b/.test(clean)&&key!=='fuel'||/\bdegrees?\b/.test(clean)&&key!=='inclination')return {error:'That unit does not match the selected field.'};
  const assessment=calculate(d),min=key==='altitude'?assessment.m.altitudeMin:f[2],max=key==='fuel'?assessment.c.propulsion.maxFuel:key==='altitude'?assessment.m.altitudeMax:f[3];
  if(!Number.isFinite(value)||value<min||value>max)return {error:`${f[1]} must be between ${min} and ${max}. No value was changed.`};
  return {patch:{[key]:value},label:`${f[1]} = ${value}${['arrayScale','batteryScale'].includes(key)?` (${cpNum(value*100)}%)`:''}`};
 }
 if(fields.length&&!numbers.length)return {error:'Choose an explicit value so I do not guess the amount. Example: What if duty = 75%.'};
 const partAlias=clean.match(/^(?:what if|what happens if) (?:i (?:select|use) (?:a |the )?)?(high|medium)[ -]gain antenna[?.!]*$/);
 if(partAlias)return {patch:{comms:partAlias[1]==='high'?'highgain':'medium'},label:partAlias[1]==='high'?'High-gain X-band':'Medium-gain X-band'};
 const matches=[];
 for(const [key,parts]of Object.entries(CATALOG))for(const p of parts)if(clean.includes(p.name.toLowerCase())||clean.includes(`${key} = ${p.id}`))matches.push({patch:{[key]:p.id},label:p.name});
 if(matches.length>1)return {error:'Choose one component per experiment so its effect is clear.'};
 if(matches.length===1)return matches[0];
 const distance=clean.match(/\b(near|mean|far)\b/);if(distance)return {patch:{distance:distance[1]},label:`Distance: ${distance[1]}`};
 return {error:'I could not identify a supported change. Use the experiment picker, a full component name, or “What if fuel = 45”.'};
}
export function advancedAnswer(question,{design=PRESETS.balanced,run=null,language='en',history=[]}={}){
 const q=String(question||'').slice(0,500).trim(),bn=language==='bn',d=normalize(run?.design||design),a=calculate(d),m=a.m,last=history.at(-1)?.answer;
 if(/^(why|why\?|explain|explain more|আরও বুঝাও|কেন\??)$/i.test(q)&&last?.topic){
  if(last.topic==='experiment')return cpAnswer(bn?'তুলনার হিসাব':'How this comparison works',cpScope(bn)+'\nEach row uses the actual rocket equation, orbit period, battery integration, finite recorder and downlink engine. More battery adds mass and cost; a larger recorder cannot improve antenna speed. Both runs start with full batteries and nominal environmental multipliers. Your active mission is untouched.',{topic:'experiment',comparisons:last.comparisons});
  if(last.topic==='review')return advancedAnswer('Review my design',{design:d,run,language});
 }
 if(/what if|what happens if|simulate change|বদলালে|যদি|korle ki|barale|komale/i.test(q)){
  const result=cpPatch(q,d);if(result.error)return cpAnswer(bn?'পরিবর্তনটি পরিষ্কার করুন':'Clarify the experiment',result.error,{known:false,evidence:'INPUT CHECK',suggestions:['What if fuel = 45','What if battery size = 1.5','What if duty = 75%']});
  return cpComparison(d,result.patch,result.label,bn);
 }
 if(/compare.*preset|preset.*compare|balanced.*(?:versus|vs).*|fragile.*(?:versus|vs).*|তিন.*design|তুলনা.*preset/i.test(q))return cpAnswer(bn?'একই নিয়মে তিনটি design':'Three designs, one operating policy',cpScope(bn),{comparisons:Object.keys(PRESETS).map(k=>designPreview(presetFor(d.destination,k),k)),topic:'experiment'});
 if(/review.*design|improve.*design|fix.*design|best.*(?:design|upgrade)|recommend.*(?:part|design|upgrade)|design.*(?:better|review|improve)|design thik|valo kor|ডিজাইন.*(?:ঠিক|ভালো|পরীক্ষা)/i.test(q)){
  const review=reviewDesign(d),best=review.best;
  return cpAnswer(bn?'আপনার design-এর engineering review':'Your design review',
   `${cpScope(bn)}\n${bn?`${review.tested}টি একক পরিবর্তন পরীক্ষা করেছি।`:`Tested ${review.tested} single-variable changes.`} ${bn?'আগে launch বাধা কমানো, তারপর লক্ষ্য পূরণ; সফল হলে কম খরচ, না হলে বেশি science—এই ক্রমে বেছে নিই।':'Ranking: fewer launch blockers, then meeting the objective; among successful designs prefer lower cost, otherwise more returned science.'}\n${best?(bn?`সেরা পরীক্ষিত পরিবর্তন: ${best.label}।`:`Best tested change: ${best.label}.`):(bn?'পরীক্ষিত একক পরিবর্তনে ভালো ফল পাইনি।':'No tested single change ranked above your current design.')} ${bn?'সব combination পরীক্ষা করা হয়নি।':'This is a bounded search, not a global optimum.'}${run&&!run.done?'\nHardware is locked in flight; this is a redesign study for your next launch.':''}`,
   {comparisons:[review.base,...best?[best]:[]],proposal:best?{base:d,patch:best.patch,label:best.label}:null,topic:'review'});
 }
 if(/compare.*(?:crisis|choices|decision|responses)|preview.*(?:crisis|choices|decision)|which.*(?:choice|response)|কোন.*সিদ্ধান্ত|kont[a]? option/i.test(q)){
  if(!run?.crisis)return cpAnswer(bn?'এখন কোনো crisis নেই':'No active crisis',bn?'বিপদ এলে Compare crisis choices চাপুন। প্রতিটি চালু option-এর ফল একই বর্তমান অবস্থা থেকে পরীক্ষা করব।':'When a crisis appears, choose Compare crisis choices. I will simulate each available response from that exact mission state.',{evidence:'CURRENT MISSION',suggestions:['Mission status','Review my design']});
  const rows=run.crisis.actions.filter(x=>!x.disabled).map(x=>{const r=continuePreview(run,x.id);return {...designPreview(run.design,x.name),science:r.science,battery:r.outcome.finalBattery,lostMB:r.lostMB,achieved:r.outcome.achieved,status:r.outcome.status};});
  return cpAnswer(bn?'সিদ্ধান্তের ফল পরীক্ষা':'Rehearse this decision',`${run.crisis.title}\n${bn?'প্রতিটি option একই বর্তমান অবস্থা থেকে শেষ পর্যন্ত চালানো হয়েছে। পরের crisis-এ conserve/downlink/wait এবং সম্ভব হলে nominal capture নেওয়া হয়। আপনার বর্তমান command বহাল থাকে, recovery rule বদলালে ছাড়া।':'Each available response is simulated from this exact paused state to campaign end. Later crises use conserve/downlink/wait and nominal capture when available. Your current command persists unless a recovery rule changes it.'}\n${bn?'এখনো কোনো সিদ্ধান্ত প্রয়োগ হয়নি। Game-এ ফিরে নিজে বেছে নিন।':'No decision has been applied. Return to the game and choose your response.'}`,{comparisons:rows,topic:'crisis',evidence:'CURRENT STATE → GAME FORECAST',suggestions:['Mission status','Which command should I use?']});
 }
 if(/mission status|diagnos|what.*next|next step|current state|am i.*(?:track|doing)|ekhon ki|এখন কী|এখন কি|অবস্থা/i.test(q)){
  if(!run)return cpAnswer(bn?'পরের ধাপ':'Your next step',`${bn?'আপনি এখন design করছেন।':'You are designing your spacecraft.'} ${a.launchable?(bn?'Launch readiness খুলুন; warning বুঝে Authorize launch চাপুন।':'Open Launch readiness, read the advisory warnings, then authorize launch.'):(bn?'আগে এই বাধাগুলো ঠিক করুন: ':'Fix these blockers first: ')+a.checks.filter(x=>x.status==='fail').map(x=>`${x.name}: ${x.value}`).join('; ')}\n${cpNum(a.cost)} / ${m.budget} credits · ${cpNum(a.wet)} / ${a.c.launch.capacity} kg`,{evidence:'CURRENT DRAFT',suggestions:['Review my design','How do I play?'],topic:'status'});
  const battery=run.battery/a.c.power.battery*100,fill=run.backlog/a.c.storage.capacity*100;
  const next=run.done?(bn?'Result দেখুন, তারপর redesign করে আবার চেষ্টা করুন।':'Read the causal debrief, then redesign and replay.'):run.crisis?(bn?'Compare crisis choices চাপুন; game-এ ফিরে একটি সিদ্ধান্ত নিন, তারপর Resume।':'Compare crisis choices, return to the game, choose a response, then Resume.'):run.phase!=='operations'?(bn?'Close দিয়ে ফিরে Resume বা Next event চাপুন।':'Close this panel, then Resume or Next event.'):battery<30?(bn?'Battery কম। Conserve energy চাপলে collection ও transmission থামবে; পরে রোদে command বদলাতে হবে।':'Battery is low. Conserve energy pauses collection and transmission; manually resume mapping after sunlight recharges it.'):fill>75?(bn?'Recorder প্রায় পূর্ণ। Return priority দিন; contact window-তে ডেটা যাবে।':'Recorder is nearly full. Use Return priority; transmission happens during contact windows.'):run.mode==='coast'?(bn?'Conserve চলছে। যথেষ্ট charge হলে Map in sunlight দিয়ে সংগ্রহ চালু করুন।':'Conserve is active. Once sufficiently charged, select Map in sunlight to resume collection.'):(bn?'Map in sunlight রাখুন; contact-এ data যাবে। Resume বা +5 min চাপুন।':'Continue Map in sunlight; observations return during contact. Resume or step +5 min.');
  return cpAnswer(bn?'আপনার মিশনের বর্তমান অবস্থা':'Your mission right now',`${run.phase} · T+${cpNum(run.minute)} min\nBattery ${cpNum(battery)}% · recorder ${cpNum(fill)}%\nReturned science ${cpNum(run.science)} / ${cpNum(m.scienceTarget*.8,0)} needed to meet the objective.\n${next}`,{evidence:'CURRENT MISSION · MEASURED GAME STATE',topic:'status',suggestions:run.crisis?['Compare crisis choices','What should I do in a crisis?']:['Why is my battery dropping?','Why is my recorder full?']});
 }
 if(/(?:calculate|how long|কতক্ষণ).*(?:fill|recorder|storage)|(?:recorder|storage).*(?:fill time|কতক্ষণ)/i.test(q)){
  const rate=a.c.payload.dataMbps*(run?.throttle??d.duty)*60/8,room=a.c.storage.capacity-(run?.backlog||0);
  return cpAnswer(bn?'Recorder পূর্ণ হতে কতক্ষণ':'Recorder fill-time estimate',`${cpNum(Math.max(0,room)/rate)} minutes of uninterrupted collection: ${cpNum(room)} MB free ÷ ${cpNum(rate)} MB/min.\nThis assumes no transmission, no pause and no safe mode. Actual elapsed time depends on your schedule and contacts. Mb/s ÷ 8 × 60 = MB/min.`,{evidence:'DERIVED · CURRENT DESIGN',topic:'data'});
 }
 if(/(?:calculate|how long|কতক্ষণ).*(?:battery|ব্যাটারি)|battery.*(?:last|endurance)/i.test(q)){const load=a.base+a.c.payload.power*(run?.throttle??d.duty);return cpAnswer(bn?'ছায়ায় battery-এর হিসাব':'Battery endurance in shadow',`${cpNum((run?.battery??a.c.power.battery)/load*60)} minutes to zero at a constant ${cpNum(load)} W science load; ${cpNum((run?.battery??a.c.power.battery)/a.base*60)} minutes at ${cpNum(a.base)} W platform load.\nEstimate only: no solar input or transmission. The engine enters safe mode at 15%, changes load, and may pause for crises. Wh ÷ W × 60 = minutes.`,{evidence:'DERIVED · CONSTANT-LOAD ESTIMATE',topic:'battery'});}
 return null;
}
