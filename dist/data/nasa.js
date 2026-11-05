// Curated numeric snapshot, verified against NASA and JPL on 2026-10-06.
// Values are not live telemetry. Keep provenance beside each datum.
export const NASA_DATA = {
  verified:'2026-10-06', factSheetUpdated:'2024-01-11',
  factURL:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
  jplURL:'https://ssd.jpl.nasa.gov/sats/phys_par/sep.html',
  rows:[
    {id:'radius',label:'Moon mean radius',value:1737.4,unit:'km',source:'jpl',use:'Circular orbit radius and period'},
    {id:'mu',label:'Lunar gravitational parameter (GM)',value:4902.800,unit:'km³/s²',source:'jpl',use:'Orbital period and speed'},
    {id:'solar',label:'Solar irradiance at the Moon',value:1361,unit:'W/m²',source:'fact',use:'Solar array output = irradiance × area × efficiency'},
    {id:'perigee',label:'Mean perigee distance',value:363300,unit:'km',source:'fact',use:'Near-Earth communication scenario'},
    {id:'mean',label:'Earth–Moon semimajor axis',value:384400,unit:'km',source:'fact',use:'Reference communication distance'},
    {id:'apogee',label:'Mean apogee distance',value:405500,unit:'km',source:'fact',use:'Far-Earth communication scenario'},
    {id:'gravity',label:'Lunar surface gravity',value:1.62,unit:'m/s²',source:'fact',use:'Learning reference; not a constant orbital acceleration'},
    {id:'escape',label:'Surface escape speed',value:2.38,unit:'km/s',source:'fact',use:'Learning reference; not the spacecraft capture requirement'}
  ]
};
export const nasaValue=id=>NASA_DATA.rows.find(r=>r.id===id).value;
export const DISTANCES={near:{name:'Near Earth · mean perigee',km:nasaValue('perigee')},mean:{name:'Reference · semimajor axis',km:nasaValue('mean')},far:{name:'Far Earth · mean apogee',km:nasaValue('apogee')}};

// Planet-specific values remain traceable. The middle range is an explicit game
// reference, not a measured average, current ephemeris or NASA telemetry.
export const MARS_DATA={
 verified:'2026-10-10',factSheetUpdated:'Snapshot verified 2026-10-10',
 factURL:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
 jplURL:'https://ssd.jpl.nasa.gov/sats/phys_par/',
 relayURL:'https://science.nasa.gov/mars/mars-relay-network/',
 rows:[
  {id:'radius',label:'Mars volumetric mean radius',value:3389.5,unit:'km',source:'fact',use:'Spherical two-body orbit radius'},
  {id:'mu',label:'Mars GM · MAR097',value:42828.37362,unit:'km³/s²',source:'jpl',use:'Circular orbit period and speed'},
  {id:'solar',label:'Mars reference solar irradiance',value:586.2,unit:'W/m²',source:'fact',use:'Array output; fixed reference, not seasonal weather'},
  {id:'perigee',label:'Near Earth–Mars range scenario',value:54600000,unit:'km',source:'relay',use:'Reference near separation and light-time'},
  {id:'mean',label:'Teaching reference range · GAME ASSUMPTION',value:225000000,unit:'km',source:'assumption',use:'Chosen normalization distance; not an observed average'},
  {id:'apogee',label:'Far Earth–Mars range scenario',value:400200000,unit:'km',source:'relay',use:'Reference far separation and light-time'}
 ]
};
import {BODIES,getBody,bodyRows,isBodyId} from './bodies.js';
// Dataset for the data panel of any body. Moon and Mars keep their original snapshot objects (rows, URLs, dates);
// every other body is built from the registry in bodies.js with a per-row source URL, verified date and unverified flag.
const GENERIC_DATASETS={};
function bodyDataset(id){
 if(GENERIC_DATASETS[id])return GENERIC_DATASETS[id];
 const b=BODIES[id],rows=bodyRows(id),dates=rows.map(r=>r.verifiedOn).sort();
 return GENERIC_DATASETS[id]={body:id,verified:dates.at(-1),factSheetUpdated:'Snapshot verified '+dates.at(-1),
  factURL:rows.find(r=>r.id==='radius').url,jplURL:rows.find(r=>r.id==='mu').url,rows,
  note:'Values marked unverified are game assumptions; they have no NASA source. Earth ranges are 2026-2056 Horizons minimum and maximum.'};
}
export const nasaDataset=d=>{const id=isBodyId(d?.destination)?d.destination:'moon';return id==='mars'?MARS_DATA:id==='moon'?NASA_DATA:bodyDataset(id);};
const named=(id,kind)=>({near:'Near · Horizons minimum',mean:'Reference · derived midpoint, game assumption',far:'Far · Horizons maximum'}[kind]);
export const distanceOptions=d=>{
 const id=isBodyId(d?.destination)?d.destination:'moon';
 if(id==='mars')return {near:{name:'Near · NASA reference',km:54600000},mean:{name:'Teaching reference · assumed',km:225000000},far:{name:'Far · NASA reference',km:400200000}};
 if(id==='moon')return DISTANCES;
 const r=BODIES[id].earthRange,earth=id==='earth';
 return {near:{name:earth?'Overhead pass · geometry':named(id,'near'),km:r.near},mean:{name:earth?'30° elevation · geometry, game choice':named(id,'mean'),km:r.mean},far:{name:earth?'10° elevation mask · geometry, game choice':named(id,'far'),km:r.far}};
};
