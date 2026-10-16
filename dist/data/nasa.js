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
export const nasaDataset=d=>d?.destination==='mars'?MARS_DATA:NASA_DATA;
export const distanceOptions=d=>d?.destination==='mars'?{
 near:{name:'Near · NASA reference',km:54600000},mean:{name:'Teaching reference · assumed',km:225000000},far:{name:'Far · NASA reference',km:400200000}
}:DISTANCES;
