import {NASA_DATA,MARS_DATA,nasaValue} from './nasa.js';
export const VERSION = '5.0.0';
export const SOURCES = [
  {id:'nasa-data',title:'NASA NSSDCA · Moon Fact Sheet numeric dataset',url:NASA_DATA.factURL,use:'Curated snapshot: solar irradiance 1361 W/m², mean perigee 363300 km, reference distance 384400 km and mean apogee 405500 km. Drives array sizing, educational distance-based link scaling and signal-delay readout. Last source update: 2024-01-11; verified 2026-10-06.',type:'NASA numeric dataset'},
  { id:'jpl', title:'JPL · Planetary satellite physical parameters', url:'https://ssd.jpl.nasa.gov/sats/phys_par/sep.html', use:'Moon mean radius 1,737.4 km and gravitational parameter 4,902.800 km³/s², used to calculate circular orbital period.', type:'Sourced physical constants' },
  { id:'rocket', title:'NASA Glenn · Ideal rocket equation', url:'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/', use:'Δv = Isp × g₀ × ln(wet mass / dry mass). Used for maneuver capability and propellant consumption.', type:'Sourced equation' },
  { id:'power', title:'NASA SmallSat · Power', url:'https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/', use:'Concept reference for solar generation, energy storage and eclipse budgeting. All game hardware values are educational assumptions, not copied product specifications.', type:'Design reference' },
  { id:'propulsion', title:'NASA SmallSat · In-space propulsion', url:'https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/', use:'Concept reference for propulsion trade-offs. Game specific impulse, tank capacity and maneuver requirements are simplified educational assumptions.', type:'Design reference' },
  { id:'small', title:'NASA · State-of-the-Art of Small Spacecraft Technology', url:'https://www.nasa.gov/smallsat-institute/sst-soa/', use:'Subsystem framing: avionics, communications, pointing and launch. Fictional component classes and cost credits support learning; they are not flight hardware or market prices.', type:'Design reference' },
  { id:'se', title:'NASA · Systems Engineering Handbook appendix', url:'https://www.nasa.gov/reference/system-engineering-handbook-appendix/', use:'Trade studies, margins and technical performance measures inform readiness checks and comparison of alternative designs.', type:'Design reference' }
];
const a = { source_type:'Educational assumption', source_note:'Fictional teaching component. Numerical values tuned for transparent trade-offs; NASA references inform the subsystem concepts, not these exact specifications.' };
export const CATALOG = {
  bus: [
    {...a, id:'compact', name:'Compact bus', label:'LIGHT & ECONOMICAL', mass:35, power:30, cost:18, pointing:60, storageMax:1024, note:'Low mass. Its 60″ pointing error limits precision imaging.'},
    {...a, id:'precision', name:'Precision bus', label:'STABLE PLATFORM', mass:45, power:40, cost:24, pointing:15, storageMax:4096, note:'Fine attitude control supports high-resolution observations.'}
  ],
  payload: [
    {...a, id:'survey', name:'Survey camera', label:'LOW DEMAND', mass:8, power:25, cost:14, dataMbps:0.4, value:0.65, pointingMax:120, note:'Broad mapping at lower detail. A forgiving first mission.'},
    {...a, id:'hires', name:'Polar imager', label:'HIGH SCIENCE', mass:18, power:90, cost:28, dataMbps:1.2, value:1, pointingMax:30, note:'Higher-detail mapping demands more energy, data and stability.'}
  ],
  power: [
    {...a,id:'balanced',name:'Balanced solar kit',label:'MIDDLE GROUND',mass:15,power:0,cost:13,solar:230,battery:140,note:'230 W + 140 Wh. Between lightweight and endurance kits.'},
    {...a, id:'compact', name:'Compact solar kit', label:'SAVE MASS', mass:10, power:0, cost:8, solar:150, battery:65, note:'150 W array + 65 Wh battery. Strong sunlight can hide weak eclipse reserves.'},
    {...a, id:'endurance', name:'Endurance solar kit', label:'ECLIPSE READY', mass:20, power:0, cost:18, solar:320, battery:240, note:'320 W array + 240 Wh battery. Extra endurance costs mass and credits.'}
  ],
  propulsion: [
    {...a, id:'standard', name:'Standard thruster', label:'COMPACT TANK', mass:12, power:0, cost:16, isp:225, maxFuel:70, note:'225 s specific impulse. Carries up to 70 kg of propellant.'},
    {...a, id:'efficient', name:'Efficient thruster', label:'HIGH IMPULSE', mass:22, power:0, cost:24, isp:310, maxFuel:90, note:'310 s specific impulse. Higher mass and cost, more maneuver capability.'}
  ],
  comms: [
    {...a,id:'medium',name:'Medium-gain X-band',label:'BALANCED RETURN',mass:6,power:28,cost:9,downlinkMbps:1.2,note:'1.2 Mb/s at the reference distance. Uses less power than high-gain.'},
    {...a, id:'compact', name:'Compact X-band', label:'LOW POWER', mass:6, power:18, cost:5, downlinkMbps:0.2, note:'0.2 Mb/s in contact. Saves power but can leave science stranded onboard.'},
    {...a, id:'highgain', name:'High-gain X-band', label:'FAST DOWNLINK', mass:6, power:42, cost:14, downlinkMbps:4, note:'4 Mb/s in contact. Equal mass assumed for an isolated communications trade study.'}
  ],
  storage: [
    {...a,id:'medium',name:'Flexible recorder',label:'BUS FRIENDLY',mass:4,power:10,cost:5,capacity:768,note:'768 MB. Compatible with both spacecraft buses.'},
    {...a, id:'standard', name:'Standard recorder', label:'LEAN AVIONICS', mass:3, power:8, cost:3, capacity:256, note:'256 MB science buffer. A recorder stores data; it does not return it.'},
    {...a, id:'expanded', name:'Expanded recorder', label:'MORE HEADROOM', mass:6, power:12, cost:8, capacity:2048, note:'2,048 MB buffer. Incompatible with the Compact bus memory interface.'}
  ],
  launch: [
    {...a, id:'rideshare', name:'Mission rideshare', label:'SHARED INJECTION', mass:0, power:0, cost:18, capacity:220, note:'220 kg injected-mass allowance. Pre-arranged destination transport is assumed; this is not a computed transfer.'},
    {...a, id:'dedicated', name:'Dedicated injection', label:'MORE CAPACITY', mass:0, power:0, cost:32, capacity:300, note:'300 kg injected-mass allowance. More flexibility, fewer credits for instruments.'}
  ]
};
export const CATEGORIES = [
  ['bus','Spacecraft bus','Platform & pointing'],['payload','Science payload','Observation & data'],['power','Power system','Generation & battery'],['propulsion','Propulsion','Fuel & maneuver reserve'],['comms','Communications','Return your discoveries'],['storage','Avionics & storage','Protect the science'],['launch','Launch provider','Capacity & injection']
];
export const MISSION = {
  id:'lunar-polar-mapper', title:'Lunar Polar Mapper', subtitle:'Map the shadows. Bring the science home.',
  budget:150, duration:240, step:5, scienceTarget:650, scienceSuccess:80, mu:nasaValue('mu'), radius:nasaValue('radius'),
  maneuver:650, reserve:100, thermalMass:15, operationsCost:8, eclipseMinutes:35, contactMinutes:25,
  note:'Educational mission: 4 hours of lunar mapping after a compressed launch and capture phase. Earn 650 science units from downlinked observations, and return ≥80% of the target.',
  assumption:'Duration, 650 science-unit target, 650 m/s capture/correction, 100 m/s reserve, 35-minute eclipse, 25-minute contact, costs and component values are educational assumptions.'
};
export const PRESETS = {
  balanced: {bus:'precision',payload:'survey',power:'endurance',propulsion:'standard',comms:'highgain',storage:'standard',launch:'rideshare',fuel:55,altitude:100,inclination:90},
  fragile: {bus:'precision',payload:'hires',power:'compact',propulsion:'standard',comms:'compact',storage:'standard',launch:'rideshare',fuel:55,altitude:100,inclination:90},
  resilient: {bus:'precision',payload:'hires',power:'endurance',propulsion:'standard',comms:'highgain',storage:'standard',launch:'rideshare',fuel:55,altitude:100,inclination:90}
};
export const UNCERTAINTY = {seed:4385,samples:200,solar:[0.8,1],link:[0.65,1],isp:[0.95,1],pointing:[1,1.25]};

export function missionFor(d={}){
 const mars=d.destination==='mars';
 if(!mars)return {...MISSION,destination:'moon',bodyName:'Moon',solarIrradiance:nasaValue('solar'),referenceDistance:nasaValue('mean'),altitudeMin:50,altitudeMax:200,referenceAltitude:100,eclipseModel:'Fixed teaching window',source:NASA_DATA};
 const radius=MARS_DATA.rows.find(r=>r.id==='radius').value,mu=MARS_DATA.rows.find(r=>r.id==='mu').value;
 const altitude=Math.min(1000,Math.max(200,Number.isFinite(Number(d.altitude))?Number(d.altitude):400));
 const period=2*Math.PI*Math.sqrt((radius+altitude)**3/mu)/60;
 const eclipseMinutes=period/Math.PI*Math.asin(radius/(radius+altitude));
 return {...MISSION,id:'mars-polar-mapper',destination:'mars',bodyName:'Mars',title:'Mars Polar Mapper',subtitle:'Budget sunlight. Plan the return link.',radius,mu,solarIrradiance:MARS_DATA.rows.find(r=>r.id==='solar').value,referenceDistance:225000000,altitudeMin:200,altitudeMax:1000,referenceAltitude:400,eclipseMinutes,eclipseModel:'Central cylindrical-shadow bound; zero solar beta angle',source:MARS_DATA,
 note:'Mars orbital-operations teaching scenario. Circular orbit uses NASA/JPL values; pre-arranged interplanetary transport and deep-space network support are assumed. No cruise, landing, launch window or n-body solution is calculated.',
 assumption:MISSION.assumption.replace('35-minute eclipse, ','')+' Mars uses a central cylindrical-shadow bound for shadow duration. Contact remains an assumed 25-minute teaching window. A separately engineered fictional link is normalized at 225 million km; this is not the same Moon antenna maintaining its rate at Mars. Displayed light-time does not delay player controls.'};
}
export function presetFor(destination='moon',key='balanced'){
 const base={...(PRESETS[key]||PRESETS.balanced)};
 return destination==='mars'?{...base,destination:'mars',altitude:400,arrayScale:1.5,batteryScale:1.5,duty:1,name:'Mars Polar Mapper'}:{...base,destination:'moon'};
}
