// Assistant v2 layer: conversation, live-mission facts, orbit and rocket calculators, NASA body facts and fuzzy topic matching.
// Pure and deterministic. No network, no generative model: every number comes from the game's own data files or from a formula
// shown in the answer. It never imports assistant.js (assistant.js imports this file), so topics are passed in.
import {BODIES,bodyRows,listBodies} from '../data/bodies.js';
import {rocketDeltaV} from './model.js';
import {neededScience} from '../data/catalog.js';

const n=(v,p=0)=>Number(v).toLocaleString('en-US',{maximumFractionDigits:p,minimumFractionDigits:0});
const G0=9.80665,C_KM_S=299792.458;
const ans=(title,text,extra={})=>({known:true,title,text,sources:[],topic:'smart',evidence:'PROJECT KNOWLEDGE · CURRENT CONTEXT',suggestions:[],...extra});

/** Lower-case, fold repeated letters ("heyyy" → "heyy") and strip punctuation except what numbers need. */
export const fold=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/(.)\1{2,}/gu,'$1$1').replace(/\s+/g,' ').trim();
const words=s=>fold(s).replace(/[^\p{L}\p{M}\p{N}.%/ ]+/gu,' ').split(/\s+/).filter(Boolean);

/* ---------- bounded edit distance ---------- */
export function lev(a,b,max=2){
 if(Math.abs(a.length-b.length)>max)return max+1;
 // optimal string alignment: insert, delete, substitute and swap two neighbours each cost 1
 let pp=null,prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const cur=[i];let best=i;
  for(let j=1;j<=b.length;j++){
   let v=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
   if(pp&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,pp[j-2]+1);
   cur[j]=v;if(v<best)best=v;
  }
  if(best>max)return max+1;pp=prev;prev=cur;
 }
 return prev[b.length];
}

/* ---------- body helpers ---------- */
const ALIAS={moon:/\b(moon|lunar|luna|chaand|chand|চাঁদ|চাদ)\b/,mars:/\b(mars|martian|mongol|মঙ্গল)\b/,earth:/\b(earth|leo|low earth orbit|পৃথিবী)\b/,mercury:/\b(mercury|বুধ)\b/,venus:/\b(venus|shukro|শুক্র)\b/,ceres:/\bceres\b/,vesta:/\bvesta\b/,europa:/\beuropa\b/};
export function bodiesIn(q){const t=fold(q);return Object.keys(BODIES).filter(id=>ALIAS[id]?.test(t));}
const orbit=(b,h)=>{const r=b.radius+h,T=2*Math.PI*Math.sqrt(r**3/b.mu)/60,v=Math.sqrt(b.mu/r),eclipse=T*Math.asin(b.radius/r)/Math.PI;return {period:T,speed:v,eclipse};};
const gravity=b=>b.mu/b.radius**2*1000; // m/s², derived from GM and radius
const srcFor=(id)=>bodyRows(id).filter(r=>['radius','mu','solarIrradiance'].includes(r.id)&&r.url).map(r=>({title:`${BODIES[id].name} · ${r.label}`,url:r.url}));
const flagged=id=>bodyRows(id).filter(r=>r.unverified).map(r=>r.label.replace(' · GAME ASSUMPTION',''));

const CORE_TOPIC=new Set(['deltav','isp','altitude','inclination','period','downlink','safemode','rideshare','latency']); // answered (with live values) by the original topic engine first
/* ---------- glossary (textbook definitions; the game's own use is stated where it differs) ---------- */
const GLOSSARY=[
 ['deltav',/\b(delta ?-?v|Δv|dv|delta velocity)\b/,'Δv (delta-v)',()=>'Δv is the total change in velocity a spacecraft can make with its propellant. It is a budget, not your current speed. In this game it comes from the rocket equation Δv = Isp × g₀ × ln(wet mass ÷ dry mass), with g₀ = 9.80665 m/s².'],
 ['isp',/\b(isp|specific impulse)\b/,'Specific impulse (Isp)',()=>'Specific impulse, in seconds, measures how efficiently an engine turns propellant into velocity change. Higher Isp gives more Δv from the same propellant mass. It is the engine term in the rocket equation.'],
 ['rocket',/\b(rocket equation|tsiolkovsky)\b/,'The rocket equation',(c)=>{const p=c?.a;return `Δv = Isp × g₀ × ln(m_wet ÷ m_dry). Propellant is the difference between wet and dry mass, so each extra m/s costs exponentially more fuel.${p?` Your design: wet ${n(p.wet,1)} kg, dry ${n(p.dry,1)} kg, Isp ${p.c.propulsion.isp} s → Δv ${n(rocketDeltaV(p.wet,p.dry,p.c.propulsion.isp))} m/s.`:''}`;}],
 ['eclipse',/\b(eclipse|umbra|shadow time)\b/,'Eclipse',(c)=>{const a=c?.a;const b=c?.body;let extra='';if(a&&b){const o=orbit(b,a.d.altitude);extra=` For ${b.name} at ${n(a.d.altitude)} km this gives about ${n(o.eclipse,1)} of a ${n(o.period,1)}-minute orbit in shadow.`;}return `Eclipse is when the Sun is hidden behind the body: solar arrays make nothing and the battery carries the load. The game uses a cylindrical-shadow circular-orbit model: shadow fraction = asin(R ÷ (R + h)) ÷ π, the same formula for every body.${extra}`;}],
 ['inclination',/\b(inclination)\b/,'Inclination',()=>'Inclination is the tilt of the orbital plane relative to the body\'s equator. 0° is equatorial, 90° passes over the poles. A polar orbit lets the planet rotate beneath the spacecraft so the whole surface is eventually seen.'],
 ['altitude',/\b(altitude)\b/,'Altitude',()=>'Altitude is the height above the surface. Lower orbits are faster and see finer detail; higher orbits are slower with a longer period. Orbital speed v = √(GM ÷ (R + h)) and period T = 2π√((R + h)³ ÷ GM).'],
 ['period',/\b(orbital period|orbit period|period of (?:the |an )?orbit)\b/,'Orbital period',(c)=>{const a=c?.a,b=c?.body;return `Orbital period T = 2π√((R + h)³ ÷ GM). Ask me "orbit period at 150 km" to calculate one for any altitude.${a&&b?` Your orbit: ${n(a.period,1)} minutes at ${n(a.d.altitude)} km around ${b.name}.`:''}`;}],
 ['contact',/\b(contact window|ground contact|line of sight|visibility window)\b/,'Contact window',(c)=>{const a=c?.a;return `A contact window is the part of each orbit when the spacecraft can see the ground station and send data. The link is only available for part of an orbit, which is why a fast link can still lose data.${a?` In your scenario contact opens about ${n(a.contactStart)} min into each orbit and lasts ${a.m.contactMinutes} min.`:''}`;}],
 ['downlink',/\b(downlink|uplink|telemetry|bandwidth|data rate|bitrate)\b/,'Downlink',()=>'Downlink is data sent from the spacecraft to Earth. Capacity per orbit = link rate × contact time, so a bigger recorder stores more but does not make the link faster.'],
 ['safemode',/\b(safe ?-?mode)\b/,'Safe mode',()=>'Safe mode is a protective state a spacecraft enters when something goes wrong, such as low energy: it stops science and transmission to save power. In this game it begins at 15% battery and recovers above 40%.'],
 ['rideshare',/\b(rideshare|ride share|dedicated launch|injected mass)\b/,'Rideshare launch',()=>'A rideshare shares a rocket with other payloads: cheaper, but with a lower mass and altitude limit than a dedicated launch. Injected mass is the mass the rocket can deliver toward the destination.'],
 ['margin',/\b(margins?|design margin)\b/,'Margin',()=>'A margin is the spare capacity between what a design needs and what it has (mass, power, Δv, budget). Engineers keep margin because estimates are uncertain; the Margins panel shows each one.'],
 ['mass',/\b(wet mass|dry mass)\b/,'Wet and dry mass',()=>'Dry mass is the spacecraft without propellant; wet mass is dry mass plus propellant. Launch limits apply to wet mass; the rocket equation uses the ratio of the two.'],
 ['gm',/\b(gm|mu|gravitational parameter|standard gravitational)\b/,'Gravitational parameter (GM)',()=>'GM (μ) is the gravitational constant times the body\'s mass, in km³/s². Orbit speed and period depend on GM directly, which is why NASA/JPL publishes it per body. Surface gravity ≈ GM ÷ R².'],
 ['irradiance',/\b(irradiance|solar constant|solar flux)\b/,'Solar irradiance',()=>'Irradiance is the solar power per square metre at a body, in W/m². It falls with the square of distance from the Sun (Earth ≈ 1361 W/m², Mars ≈ 586 W/m²), so the same array makes much less power farther out.'],
 ['latency',/\b(latency|light ?-?time|signal delay|one way delay)\b/,'Signal delay',()=>'Radio travels at the speed of light, 299,792.458 km/s, so one-way delay = distance ÷ c. Earth–Moon is about 1.3 s; Earth–Mars ranges from minutes to over twenty minutes.'],
 ['polar',/\b(sun ?-?synchronous|dawn ?-?dusk)\b/,'Sun-synchronous orbit',()=>'A sun-synchronous orbit is a near-polar orbit whose plane keeps a constant angle to the Sun, so the surface is lit at the same local time each pass. It is a general concept; the game does not model orbital precession.']
];

/* ---------- conversation ---------- */
const GREET=/^(?:hi+|hel+o+|he+y+|hey+a|hey there|yo+|sup|hola|howdy|hiya|salam|assalamu ?(?:a)?laikum|assalamualaikum|namaste|good (?:morning|afternoon|evening)|হ্যালো|হাই|সালাম|আসসালামু আলাইকুম|কেমন আছ(?:ো|েন)?)(?:\s+(?:there|commander|mentor|assistant|bro|buddy|everyone|guys|bot))?\s*[!.?]*$/iu;
const THANKS=/^(?:thanks?|thank you|thx|ty|tysm|cheers|great thanks|ok thanks|thanks a lot|ধন্যবাদ|থ্যাঙ্কস)(?:\s+(?:a lot|so much|mate|bro))?\s*[!.]*$/iu;
const BYE=/^(?:bye|goodbye|good night|see you|see ya|cya|later|বিদায়|টাটা)\s*[!.]*$/iu;
const HOW=/^(?:how are you|how are u|how r u|how'?s it going|what'?s up|wassup|you ok|কেমন আছো)\s*[?!.]*$/iu;
const WHO=/^(?:who are you|what are you|what'?s your name|your name|are you (?:an? )?(?:ai|bot|robot|human|chatgpt|gpt)|who made you|who built you|are you real)\s*[?!.]*$/iu;
const CAN=/^(?:what can you do|what do you do|help|help me|what can i ask(?: you)?|what should i ask|commands|menu|options|how do you work|how can you help(?: me)?|what are your (?:features|skills)|tips|any tips)\s*[?!.]*$/iu;
const OK=/^(?:ok+(?:ay)?|okey|k|cool|nice|great|good|awesome|wow|amazing|perfect|got it|i see|alright|fine|sure|yes|yeah|yep|no|nope|nah|hmm+|lol|haha|ঠিক আছে|আচ্ছা|ভালো)\s*[!.?]*$/iu;
const PRAISE=/^(?:you(?:'re| are) (?:great|good|smart|awesome|amazing|helpful|the best)|good bot|well done|nice (?:job|work)|love (?:it|this)|this is (?:great|cool|awesome|amazing))\s*[!.]*$/iu;
const STUCK=/\b(?:i(?:'m| am) (?:stuck|lost|confused)|i (?:don'?t|do not) (?:understand|get it|know what to do)|no idea|too (?:hard|difficult|confusing)|(?:this|it) is (?:hard|difficult|confusing)|what (?:do i do|now|to do)|i give up|help me out)\b/i;

function brief(c){
 const {a,run,design,bn}=c;
 if(!a)return '';
 if(run?.done)return bn?`আপনার মিশন শেষ: ${run.outcome.status}।`:`Your last mission finished: ${run.outcome.status}, ${n(run.science)} science units.`;
 if(run?.crisis)return bn?`একটি crisis অপেক্ষা করছে: ${run.crisis.title}।`:`A crisis is waiting for your decision: ${run.crisis.title}.`;
 if(run)return bn?`মিশন চলছে (T+${n(run.minute)} মিন), battery ${n(run.battery/a.c.power.battery*100)}%।`:`Your mission is at T+${n(run.minute)} min with battery ${n(run.battery/a.c.power.battery*100)}% and ${n(run.science)} science units returned.`;
 const blockers=a.checks.filter(x=>x.status==='fail').length;
 return bn?`${design.name||'আপনার design'}: ${n(a.cost,1)}/${a.m.budget} credits।${blockers?` ${blockers}টি launch বাধা আছে।`:' Launch বাধা নেই।'}`:`You are designing ${a.d.name||'a spacecraft'} for ${a.m.bodyName}: ${n(a.cost,1)} / ${a.m.budget} credits, ${n(a.wet,1)} kg, ${blockers?`${blockers} launch blocker${blockers>1?'s':''} to fix.`:'launch checks are clear.'}`;
}
/** Context-aware starter questions, most useful first. */
export function contextSuggestions(c){
 const {run,a}=c;
 if(run?.done)return ['Explain my result','Why did my mission fail?','Review my design'];
 if(run?.crisis)return ['Compare crisis choices','What should I do in a crisis?','Mission status'];
 if(run)return ['Mission status','When is the next contact?','How much battery do I have?'];
 if(a&&!a.launchable)return ['Why is launch blocked?','Review my design','Am I ready to launch?'];
 return ['Review my design','Am I ready to launch?','Compare presets'];
}
function chat(q,c){
 const bn=c.bn,t=fold(q).replace(/[?!.]+$/,'');
 const sug=contextSuggestions(c);
 if(GREET.test(t)||GREET.test(fold(q)))return ans(bn?'স্বাগতম, Commander!':'Welcome, Commander!',(bn?'আমি TRAJECTIQ মিশন সহকারী। ':'I am the TRAJECTIQ mission assistant. ')+brief(c)+(bn?'\nকী জানতে চান?':'\nWhat would you like to know?'),{topic:'greeting',evidence:'LIVE MISSION CONTEXT',suggestions:sug});
 if(THANKS.test(t))return ans(bn?'স্বাগতম':'Any time, Commander',bn?'আরও কিছু জানতে চাইলে জিজ্ঞেস করুন।':'Glad to help. When you want another check, ask me to review the design, read the crisis, or calculate an orbit.',{topic:'chat',evidence:'CONVERSATION',suggestions:sug});
 if(BYE.test(t))return ans(bn?'শুভ কামনা':'Good luck out there',bn?'আবার দেখা হবে।':'Fly safe. Your design and finished missions stay in this browser.',{topic:'chat',evidence:'CONVERSATION',suggestions:sug});
 if(HOW.test(t))return ans(bn?'সব ঠিক আছে':'All systems nominal',(bn?'আমি ঠিক আছি। ':'Running nominally, thanks. ')+brief(c),{topic:'chat',evidence:'LIVE MISSION CONTEXT',suggestions:sug});
 if(PRAISE.test(t))return ans(bn?'ধন্যবাদ':'Thank you',bn?'আপনার মিশন সফল হোক।':'Happy to help. A good mission still depends on your decisions, so keep testing one change at a time.',{topic:'chat',evidence:'CONVERSATION',suggestions:sug});
 if(WHO.test(t))return ans(bn?'আমি কে':'Who I am',bn?'আমি TRAJECTIQ-এর mission সহকারী। আমি generative AI নই; local নিয়ম ও simulation engine ব্যবহার করি, তাই বানিয়ে কিছু বলি না।':'I am the TRAJECTIQ mission assistant. I am not a generative AI and I do not use the internet: I run on this game\'s rules, its simulation engine and NASA/JPL reference data, so I do not invent facts. I tell you when I cannot answer.',{topic:'chat',evidence:'PROJECT KNOWLEDGE',suggestions:['What can you do?',...sug.slice(0,2)]});
 if(CAN.test(t))return ans(bn?'আমি যা পারি':'What I can do',bn?'নকশা review, "what if" পরীক্ষা, crisis-এর দিক, orbit হিসাব, NASA গ্রহ-উপগ্রহ তথ্য, শব্দের ব্যাখ্যা ও মিশনের বর্তমান অবস্থা।':'• Check your situation: "Am I ready to launch?", "How much battery do I have?", "When is the next contact?"\n• Test ideas: "What if fuel = 45", "Compare presets", "Review my design"\n• Read a crisis: "Compare crisis choices"\n• Calculate: "Orbit period at 150 km", "How much fuel for 700 m/s?", "Delta v with isp 300 wet 500 dry 400"\n• NASA data: "Tell me about Europa", "Compare Mars and Venus", "Which body has the most sunlight?"\n• Explain: "What is delta-v?", "What is an eclipse?", "Why is my recorder full?"',{topic:'help',evidence:'PROJECT KNOWLEDGE',suggestions:sug});
 if(STUCK.test(t))return {rewrite:'Mission status',lead:bn?'ঠিক আছে, এখন যা করণীয়:':'No problem. Here is where you stand and the next step:'};
 if(OK.test(t))return ans(bn?'ঠিক আছে':'Ready when you are',brief(c)||'Ask me anything about your mission.',{topic:'chat',evidence:'CONVERSATION',suggestions:sug});
 return null;
}

/* ---------- live-mission facts ---------- */
function facts(q,c){
 const {a,run,bn}=c,t=fold(q);
 if(!a)return null;
 const ask=/\b(how much|how many|how full|when is|when does|when will|next|what(?:'s| is| are)|show|tell me|check|current|currently|now|left|remaining|level|status of|percentage|percent|do i have|have i got)\b/.test(t)&&!/\bwhy\b/.test(t);
 // readiness
 if((/\b(?:am i|are we|is (?:it|my design|my spacecraft|everything))\b.*\b(?:ready|good to go|safe|ok to launch|launch ready)\b/.test(t)||/\b(?:can|may|should) i (?:launch|fly|lift ?off)\b(?!.*\b(?:after|during|again|more|twice|repair|fix|change)\b)/.test(t)||/\blaunch (?:ready|readiness|status|check)\b/.test(t)||/\bgo ?\/? ?no ?-?go\b/.test(t))){
  if(run)return {rewrite:'Mission status',lead:bn?'মহাকাশযান আগেই launch হয়েছে। মিশনের অবস্থা:':'The spacecraft has already launched. Here is where the mission stands:'};
  const fails=a.checks.filter(x=>x.status==='fail'),warns=a.checks.filter(x=>x.status==='warn');
  const text=fails.length?`Not yet. ${fails.length} blocker${fails.length>1?'s':''} stop launch:\n${fails.map(x=>`• ${x.name}: ${x.value}`).join('\n')}\nFix these, then open Launch readiness.`:`Yes, no check blocks launch. ${warns.length?`${warns.length} advisory warning${warns.length>1?'s':''} to read first:\n${warns.slice(0,4).map(x=>`• ${x.name}: ${x.value}`).join('\n')}`:'No warnings either.'}\nA clear readiness check is not a promise of success: the flight still has crises to handle.`;
  return ans(bn?'Launch readiness':'Launch readiness',text,{evidence:'DERIVED · CURRENT DESIGN',topic:'status',suggestions:fails.length?['Why is launch blocked?','Review my design']:['Review my design','Compare presets']});
 }
 if(!ask)return null;
 const bat=run?run.battery:a.c.power.battery,pct=bat/a.c.power.battery*100;
 if(/\b(battery|charge|energy|power level)\b/.test(t)&&!/\b(size|capacity|chemistry|type)\b/.test(t)){
  const st=run?(run.safe?'The spacecraft is in safe mode (science and transmission stopped).':pct<30?'That is low: Conserve energy pauses collection and transmission until sunlight recharges it.':pct<60?'That is workable; watch the next eclipse.':'That is healthy.'):'The battery starts full at launch.';
  return ans('Battery',`${run?'Battery now':'Battery capacity'}: ${n(bat,1)} Wh${run?` (${n(pct)}% of ${n(a.c.power.battery)} Wh)`:''}. Safe mode starts at 15% and recovers above 40%. ${st}`,{evidence:run?'CURRENT MISSION · MEASURED GAME STATE':'DERIVED · CURRENT DESIGN',topic:'battery',suggestions:['Why is my battery dropping?','Battery endurance']});
 }
 if(/\b(fuel|propellant|delta ?-?v|dv|maneuver)\b/.test(t)&&!/\b(need|require|for)\b.*\d+\s*m\/s/.test(t)){
  const fuel=run?run.fuel:a.d.fuel,max=a.c.propulsion.maxFuel;
  return ans('Propellant',`${n(fuel,1)} kg of ${n(max)} kg tank limit${run?' left':' loaded'}. Initial Δv ${n(a.deltaV)} m/s; the scenario needs ${a.m.maneuver} m/s plus ${a.m.reserve} m/s reserve, leaving ${n(a.margins.deltaV)} m/s of margin.`,{evidence:'DERIVED · CURRENT DESIGN',topic:'fuel',suggestions:['How much fuel do I need?','What if fuel = 45']});
 }
 if(/\b(recorder|storage|memory|backlog|data)\b/.test(t)&&!/\b(rate|link|why|how long)\b/.test(t)){
  const cap=a.c.storage.capacity;
  return ans('Recorder',run?`${n(run.backlog,1)} MB stored of ${n(cap)} MB (${n(run.backlog/cap*100)}% full). Returned ${n(run.returned,1)} MB, discarded ${n(run.lostMB,1)} MB.${run.backlog/cap>.75?' Nearly full: Return priority sends data during contact.':''}`:`Recorder capacity ${n(cap)} MB. Collection per orbit ${n(a.dataGenerated)} MB, downlink capacity per orbit ${n(a.dataDownlink)} MB${a.dataGenerated>a.dataDownlink?' — collection exceeds the link, so the recorder will fill.':'.'}`,{evidence:run?'CURRENT MISSION · MEASURED GAME STATE':'DERIVED · CURRENT DESIGN',topic:'data',suggestions:['Why is my recorder full?','Recorder fill time']});
 }
 if(/\b(science|score|units|returned|progress|objective)\b/.test(t)){
  const need=neededScience(a.m);
  return ans('Science progress',run?`${n(run.science,1)} science units returned. Success needs ${n(need)} of the ${n(a.m.scienceTarget)} target units with battery above zero${run.done?'':`; ${n(Math.max(0,need-run.science),1)} to go`}.`:`Success needs ${n(need)} of the ${n(a.m.scienceTarget)} target units within ${a.m.duration} campaign minutes. Science in the recorder does not count until it is returned to Earth.`,{evidence:run?'CURRENT MISSION · MEASURED GAME STATE':'MISSION OBJECTIVE',topic:'goal',suggestions:['What counts as success?','Mission status']});
 }
 if(/\b(time|minutes?|clock|remaining|campaign)\b/.test(t)&&run){
  return ans('Mission clock',`T+${n(run.minute,1)} min of ${a.m.duration}; ${n(Math.max(0,a.m.duration-run.minute),1)} minutes left in the campaign.`,{evidence:'CURRENT MISSION · MEASURED GAME STATE',topic:'time',suggestions:['Mission status']});
 }
 if(/\b(contact|window|transmit|downlink|send data|next pass)\b/.test(t)){
  const now=run?(run.contact?' Right now the spacecraft is in contact.':' Right now there is no contact.'):'';
  return ans('Contact windows',`Contact opens about ${n(a.contactStart)} min into each ${n(a.period,1)}-minute orbit and lasts ${a.m.contactMinutes} min. The link carries about ${n(a.dataDownlink)} MB per orbit while your instrument collects ${n(a.dataGenerated)} MB.${now}`,{evidence:run?'CURRENT MISSION':'DERIVED · CURRENT DESIGN',topic:'data',suggestions:['Why is my recorder full?','Mission status']});
 }
 if(/\b(eclipse|shadow)\b/.test(t)){
  const b=BODIES[a.d.destination]||BODIES.moon,o=orbit(b,a.d.altitude);
  return ans('Eclipse',`At ${n(a.d.altitude)} km around ${b.name} the shadow lasts about ${n(o.eclipse,1)} minutes of each ${n(o.period,1)}-minute orbit${run?(run.eclipse?'. You are in shadow now.':'. You are in sunlight now.'):''}. Formula: orbit period × asin(R ÷ (R + h)) ÷ π.`,{evidence:'DERIVED · CURRENT DESIGN',topic:'battery',suggestions:['Why is my battery dropping?','Orbit period at 150 km']});
 }
 return null;
}

/* ---------- calculators ---------- */
const num='(\\d+(?:\\.\\d+)?)';
function calc(q,c){
 const {a,bn}=c,t=fold(q);
 const b=(bodiesIn(t)[0]&&BODIES[bodiesIn(t)[0]])||(a&&BODIES[a.d.destination])||BODIES.moon;
 // orbit at an altitude
 const alt=t.match(new RegExp(`(?:at|of|from|in|for|above)?\\s*${num}\\s*(?:km|kilomet(?:er|re)s?)`));
 if(alt&&/\b(period|orbital speed|orbit speed|speed|velocity|eclipse|shadow|how long|how fast|one orbit|each orbit|orbit time|orbit)\b/.test(t)&&!/\bm\/s\b/.test(t)&&!/\bwhat if\b/.test(t)){
  const h=Number(alt[1]);
  if(h<=0||h>1e6)return ans('Check the altitude','Give an altitude above the surface between 1 and 1,000,000 km.',{known:false,evidence:'INPUT CHECK',suggestions:['Orbit period at 150 km']});
  const o=orbit(b,h);
  const inRange=h>=b.altitudeMin&&h<=b.altitudeMax;
  return ans(bn?'কক্ষপথের হিসাব':`Orbit at ${n(h)} km around ${b.name}`,`Circular orbit, radius ${n(b.radius,1)} + ${n(h)} km, GM ${n(b.mu,3)} km³/s²:\n• Period T = 2π√((R+h)³ ÷ GM) = ${n(o.period,2)} min\n• Speed v = √(GM ÷ (R+h)) = ${n(o.speed,3)} km/s\n• Eclipse (cylindrical shadow) = T × asin(R ÷ (R+h)) ÷ π = ${n(o.eclipse,1)} min\n${inRange?`This altitude is inside the game's ${n(b.altitudeMin)}–${n(b.altitudeMax)} km range for ${b.name}.`:`The game allows ${n(b.altitudeMin)}–${n(b.altitudeMax)} km around ${b.name}; this is a calculation only. Real low orbits also face drag, mascons and perturbations the game ignores.`}`,{evidence:'DERIVED · NASA/JPL RADIUS AND GM',topic:'calc',sources:srcFor(b.id).slice(0,2),suggestions:['What if altitude = '+Math.round(Math.min(b.altitudeMax,Math.max(b.altitudeMin,h))),'Tell me about '+b.name]});
 }
 // propellant needed for a delta-v
 const need=t.match(new RegExp(`${num}\\s*m\\/s`));
 if(need&&a&&/\b(fuel|propellant)\b/.test(t)&&/\b(how much|need|require|for|to get|to reach|enough)\b/.test(t)){
  const dv=Number(need[1]),isp=a.c.propulsion.isp,dry=a.dry,fuel=dry*(Math.exp(dv/(isp*G0))-1),max=a.c.propulsion.maxFuel;
  return ans(bn?'প্রয়োজনীয় fuel':'Propellant for a Δv',`To get ${n(dv)} m/s with your ${a.c.propulsion.name} (Isp ${isp} s) and ${n(dry,1)} kg dry mass you need about ${n(fuel,1)} kg of propellant (m_prop = m_dry × (e^(Δv ÷ (Isp × g₀)) − 1)).\nYour tank limit is ${n(max)} kg and you carry ${n(a.d.fuel,1)} kg now. ${fuel>max?'That is more than the tank holds: pick a higher-Isp engine or cut dry mass.':fuel>a.d.fuel?`You need ${n(fuel-a.d.fuel,1)} kg more than you load, and extra fuel adds launch mass.`:'You already carry enough.'}\nThe game wants ${a.m.maneuver} m/s plus ${a.m.reserve} m/s reserve. Ignores tank mass, like the game's equation.`,{evidence:'DERIVED · ROCKET EQUATION',topic:'calc',suggestions:['What if fuel = '+Math.min(Math.round(fuel),max),'Rocket equation']});
 }
 // free rocket equation
 const isp=t.match(new RegExp(`isp\\s*(?:=|of|:)?\\s*${num}`)),wet=t.match(new RegExp(`(?:wet|initial|launch|start(?:ing)?|full)(?: mass)?\\s*(?:=|of|:)?\\s*${num}`)),dry=t.match(new RegExp(`(?:dry|final|empty|end(?:ing)?)(?: mass)?\\s*(?:=|of|:)?\\s*${num}`));
 if(isp&&wet&&dry&&/\b(delta ?-?v|dv|rocket|velocity)\b/.test(t)){
  const w=Number(wet[1]),d=Number(dry[1]),s=Number(isp[1]);
  if(!(w>d&&d>0&&s>0))return ans('Check the masses','The wet mass must be larger than the dry mass, and both must be positive.',{known:false,evidence:'INPUT CHECK',suggestions:['Delta v with isp 300 wet 500 dry 400']});
  return ans('Rocket equation',`Δv = Isp × g₀ × ln(m_wet ÷ m_dry) = ${n(s)} × 9.80665 × ln(${n(w,1)} ÷ ${n(d,1)}) = ${n(rocketDeltaV(w,d,s))} m/s.`,{evidence:'DERIVED · ROCKET EQUATION',topic:'calc',suggestions:['What is delta-v?','Review my design']});
 }
 return null;
}

/* ---------- NASA bodies ---------- */
const BODY_WORDS=new Set('tell about info facts fact describe overview summary like special big far bright strong gravity radius distance sunlight hazards hazard compare versus vs difference different between which body bodies planet planets world worlds destination destinations place target orbit orbits altitude size sun light solar earth moons moon low'.split(' '));
/** True when every content word of the question is a body name, a cue word or filler: unknown extra words (news, price...) mean the question is not about the data. */
const onlyBodyTalk=q=>words(q).every(w=>STOP.has(w)||BODY_WORDS.has(w)||/^\d/.test(w)||Object.values(ALIAS).some(rx=>rx.test(w)));
function bodyFacts(q,c){
 const {bn}=c,t=fold(q),ids=bodiesIn(t);
 const list=listBodies();
 // superlatives across all bodies
 const sup=t.match(/\b(most|least|highest|lowest|strongest|weakest|biggest|largest|smallest|farthest|furthest|closest|nearest|brightest|dimmest|shortest|longest|fastest|slowest)\b/);
 if(sup&&/\b(which|what)\b/.test(t)&&/\b(body|bodies|planet|planets|world|worlds|destination|destinations|moon|place|target)\b/.test(t)){
  const hi=/most|highest|strongest|biggest|largest|farthest|furthest|longest|brightest|slowest/.test(sup[1]);
  const metrics=[[/sun(?:light|shine)|irradiance|bright|dim|solar|power/,'solar irradiance','W/m²',b=>b.solarIrradiance,v=>n(v,1)],[/gravity|gravit/,'surface gravity (derived, GM ÷ R²)','m/s²',b=>gravity(b),v=>n(v,2)],[/radius|size|big|small|large/,'mean radius','km',b=>b.radius,v=>n(v,1)],[/far|furthest|farthest|close|closest|near|distance/,'mean distance from Earth','km',b=>b.earthRange.mean,v=>n(v)],[/period|long|short|fast|slow|orbit/,'orbit period at its default altitude','min',b=>orbit(b,b.defaultAltitude).period,v=>n(v,1)]];
  const m=metrics.find(([rx])=>rx.test(t));
  if(m){
   const ranked=[...list].filter(b=>Number.isFinite(m[3](b))).sort((x,y)=>hi?m[3](y)-m[3](x):m[3](x)-m[3](y));
   const top=ranked[0];
   return ans(bn?'NASA তথ্য':`${hi?'Highest':'Lowest'} ${m[1]}`,`${top.name}: ${m[4](m[3](top))} ${m[2]}.\nRanking in the game's data: ${ranked.map(b=>`${b.name} ${m[4](m[3](b))}`).join(' · ')}.\nValues are the game's NASA/JPL snapshot (not live); derived and game-assumption fields are labelled in the NASA data screen.`,{evidence:'NASA/JPL SNAPSHOT · DERIVED',topic:'bodies',sources:srcFor(top.id).slice(0,2),suggestions:['Tell me about '+top.name,'Compare '+top.name+' and '+(ranked[1]?.name||'Moon')]});
  }
 }
 if(ids.length>=2&&onlyBodyTalk(t)&&/\b(compare|vs|versus|difference|different|or|and|between)\b/.test(t)){
  const [x,y]=ids.map(id=>BODIES[id]),ox=orbit(x,x.defaultAltitude),oy=orbit(y,y.defaultAltitude);
  const row=(label,f,u)=>`• ${label}: ${x.name} ${f(x)} ${u} · ${y.name} ${f(y)} ${u}`;
  return ans(`${x.name} vs ${y.name}`,[row('Mean radius',b=>n(b.radius,1),'km'),row('GM',b=>n(b.mu,3),'km³/s²'),row('Surface gravity (GM ÷ R²)',b=>n(gravity(b),2),'m/s²'),row('Sunlight',b=>n(b.solarIrradiance,1),'W/m²'),row('Mean Earth distance',b=>n(b.earthRange.mean),'km'),`• Orbit at the default altitude (${x.name} ${n(x.defaultAltitude)} km, ${y.name} ${n(y.defaultAltitude)} km): ${n(ox.period,1)} min vs ${n(oy.period,1)} min`,`• Allowed altitudes: ${x.name} ${n(x.altitudeMin)}–${n(x.altitudeMax)} km · ${y.name} ${n(y.altitudeMin)}–${n(y.altitudeMax)} km`].join('\n')+`\nSource: NASA/JPL values in the game snapshot.`,{evidence:'NASA/JPL SNAPSHOT · DERIVED',topic:'bodies',sources:[...srcFor(x.id).slice(0,1),...srcFor(y.id).slice(0,1)],suggestions:['Tell me about '+x.name,'Tell me about '+y.name]});
 }
 if(ids.length===1&&onlyBodyTalk(t)&&/\b(tell me about|about|info|facts?|describe|overview|summary|what(?:'s| is)(?: it like| special)?|how (?:big|far|bright|strong)|gravity|radius|distance|sunlight|hazards?|weather|temperature|atmosphere)\b/.test(t)&&!/\b(what if|if i|my (?:design|mission)|launch|fuel|battery)\b/.test(t)){
  const b=BODIES[ids[0]],o=orbit(b,b.defaultAltitude),rr=b.earthRange,delay=r=>r/C_KM_S,dl=s=>s<120?`${n(s,1)} s`:`${n(s/60,1)} min`;
  const un=flagged(b.id);
  const text=[`${b.name} (${b.kind}${b.host!=='sun'?` of ${BODIES[b.host]?.name||b.host.charAt(0).toUpperCase()+b.host.slice(1)}`:''}) in the game:`,`• Mean radius ${n(b.radius,1)} km · GM ${n(b.mu,3)} km³/s² · surface gravity ≈ ${n(gravity(b),2)} m/s² (derived)`,`• Sunlight ${n(b.solarIrradiance,1)} W/m² (${n(b.solarIrradiance/1361*100)}% of Earth's)`,`• Earth distance ${n(rr.near)} / ${n(rr.mean)} / ${n(rr.far)} km (near / mean / far) → one-way signal delay ${dl(delay(rr.near))} to ${dl(delay(rr.far))}`,`• Game orbits ${n(b.altitudeMin)}–${n(b.altitudeMax)} km; at ${n(b.defaultAltitude)} km: period ${n(o.period,1)} min, speed ${n(o.speed,2)} km/s, shadow ${n(o.eclipse,1)} min`,b.hazards?.thermal?`• Thermal: ${b.hazards.thermal}`:'',b.hazards?.atmosphere?`• Atmosphere: ${b.hazards.atmosphere}`:'',b.realReference?.note?`• Real missions: ${b.realReference.note}`:'',un.length?`Game assumptions (no NASA source read): ${un.join('; ')}.`:'Source dates and links are in the NASA data screen.'].filter(Boolean).join('\n');
  return ans(bn?`${b.name} · NASA তথ্য`:`${b.name} · NASA data`,text,{evidence:'NASA/JPL SNAPSHOT · SOURCE LINKED',topic:'bodies',sources:srcFor(b.id),suggestions:['Orbit period at '+n(b.defaultAltitude)+' km around '+b.name,'Compare '+b.name+' and '+(b.id==='moon'?'Mars':'Moon')]});
 }
 return null;
}

/* ---------- glossary ---------- */
export function glossary(q,c,{late=false}={}){
 const t=fold(q);
 if(!/\b(what(?:'s| is| are| does)|explain|define|meaning|mean|tell me about|how does|describe|ki|কী|কি)\b/.test(t)&&t.split(' ').length>3)return null;
 for(const [id,rx,title,fn] of GLOSSARY){
  if(!late&&CORE_TOPIC.has(id))continue;
  if(rx.test(t)){
   // personal "why is my X" questions belong to the mission topics, not the dictionary
   if(/\bwhy\b/.test(t)&&/\b(my|dropping|full|blocked)\b/.test(t))return null;
   const body=c.a?BODIES[c.a.d.destination]:null;
   return ans(title,fn({a:c.a,body}),{evidence:'GENERAL CONCEPT · GAME USE STATED',topic:'glossary',suggestions:['Review my design','What can you do?']});
  }
 }
 return null;
}

/** Rewrites that route natural phrasing to an existing deep answer, or answers outright. Returns an answer, {rewrite,lead} or null. */
export function smartAnswer(q,c){
 const t=fold(q);
 if(!t)return null;
 const talk=chat(q,c);if(talk)return talk;
 if(/\b(?:how (?:can|do|should) i (?:improve|get better|do better|win|score higher|increase my score)|best (?:strategy|design|build|tips?)|any (?:advice|tips?|suggestions?)|what should i (?:change|improve|upgrade)|how (?:do|can) i get (?:a )?(?:better|higher) (?:score|grade))\b/.test(t)&&!/\b(battery|fuel|data|recorder|power)\b/.test(t))return {rewrite:'Review my design',lead:c.bn?'সবচেয়ে ভালো পরীক্ষিত পরিবর্তন:':'Here is what I tested for you:'};
 if(/\b(?:which|what) (?:preset|build|design) (?:is|should)|\b(?:best|better) preset\b|\bpresets?\b.*\b(?:best|better|compare|difference)\b/.test(t))return {rewrite:'Compare presets'};
 if(/^(?:what(?:'s| is| are| does)|define|explain|meaning of|what do you mean by)\b/.test(t)&&!/\b(my|now|currently|have|left|remaining|current)\b/.test(t)){const g=glossary(q,c);if(g)return g;}
 const f=facts(q,c);if(f)return f;
 const k=calc(q,c);if(k)return k;
 const b=bodyFacts(q,c);if(b)return b;
 return glossary(q,c);
}

/* ---------- fuzzy topic retrieval ---------- */
const STOP=new Set('a an the is are was be to of in on at for from with and or my me i you your it its this that do does did can could should would will how what why when where which please tell about much many want need get have has make game mission trajectiq any some there here just also very really then than so if not no yes'.split(' '));
function topicWords(topic){return [...new Set(words(`${topic[1]} ${topic[4]||''}`).filter(w=>w.length>2&&!STOP.has(w)))];}
/** Scores every help topic against a free-form question with typo tolerance. Returns [{topic,score}] best first. */
export function rankTopics(q,topics){
 const qs=words(q).filter(w=>w.length>2&&!STOP.has(w));
 if(!qs.length)return [];
 const df=new Map();const bag=topics.map(tp=>{const ws=topicWords(tp);ws.forEach(w=>df.set(w,(df.get(w)||0)+1));return ws;});
 const N=topics.length;
 return topics.map((topic,i)=>{
  let score=0,hit=0;
  for(const w of qs){
   let best=0;
   for(const k of bag[i]){
    let m=0;
    if(k===w)m=1;
    else if(w.length>=5&&k.length>=5&&(k.startsWith(w.slice(0,5))||w.startsWith(k.slice(0,5)))&&Math.abs(k.length-w.length)<=3)m=.8;
    else if(w.length>=5&&lev(w,k,w.length>=9?2:1)<=(w.length>=9?2:1))m=.85;
    if(m){const idf=Math.log(1+N/(df.get(k)||1));m*=idf;}
    if(m>best)best=m;
   }
   score+=best;if(best>0)hit++;
  }
  return {topic,score:score/Math.sqrt(qs.length),coverage:hit/qs.length};
 }).filter(x=>x.score>0).sort((x,y)=>y.score-x.score);
}
