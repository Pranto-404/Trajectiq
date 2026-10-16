import {missionFor} from '../data/catalog.js';
export function scene({running=false,eclipse=false,contact=false,phase='orbit',large=false,design={},reducedMotion=false}={}) {
  const mission=missionFor(design),mars=design.destination==='mars',planetName=mission.bodyName||(mars?'Mars':'Moon');
  const orbitLabel=mars?'MARS MAPPING ORBIT':'LUNAR MAPPING ORBIT';
  const planetColors=mars?['#d19268','#ae6048','#572e2d']:['#b1b4b5','#838b90','#333d49'];
  const stars=Array.from({length:90},(_,i)=>{const x=(i*127+17)%840,y=(i*i*37+11)%490,r=i%9===0?1.3:0.65;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#bbd4ed" opacity="${.2+(i%5)*.12}"/>`;}).join('');
  const craters=Array.from({length:30},(_,i)=>{const x=420+Math.cos(i*2.399)*Math.sqrt(i/30)*108,y=250+Math.sin(i*2.399)*Math.sqrt(i/30)*108,r=4+(i*13)%17;return `<g opacity=".22"><circle cx="${x}" cy="${y}" r="${r}" fill="#424b53"/><ellipse cx="${x-1}" cy="${y-2}" rx="${r-1}" ry="${r*.65}" fill="none" stroke="#c3c7c8" stroke-width="2"/></g>`;}).join('');
  return `<svg class="space-scene" viewBox="0 0 840 500" role="img" aria-label="Illustrated spacecraft orbiting ${planetName}${eclipse?' in eclipse':''}. Schematic, not a flight trajectory.">
    <defs><radialGradient id="moon"><stop offset="0" stop-color="${planetColors[0]}"/><stop offset=".55" stop-color="${planetColors[1]}"/><stop offset="1" stop-color="${planetColors[2]}"/></radialGradient><linearGradient id="shadow"><stop stop-color="#05101b" stop-opacity="0"/><stop offset=".45" stop-color="#05101b" stop-opacity=".06"/><stop offset=".64" stop-color="#05101b" stop-opacity=".6"/><stop offset="1" stop-color="#05101b" stop-opacity=".97"/></linearGradient><radialGradient id="halo"><stop stop-color="#769bb9" stop-opacity=".18"/><stop offset="1" stop-color="#769bb9" stop-opacity="0"/></radialGradient><clipPath id="moonclip"><circle cx="420" cy="250" r="115"/></clipPath></defs>
    <g class="stars">${stars}</g><circle cx="420" cy="250" r="215" fill="url(#halo)"/>
    <ellipse cx="420" cy="250" rx="246" ry="118" transform="rotate(-27 420 250)" fill="none" stroke="#3c5266" stroke-width="1"/>
    <ellipse class="orbit-dash" cx="420" cy="250" rx="280" ry="153" transform="rotate(-27 420 250)" fill="none" stroke="#334352" stroke-width="1"/>
    <path d="M160 245H690M420 90V415" stroke="#304355" stroke-dasharray="2 12" stroke-width=".7" opacity=".5"/>
    <circle cx="420" cy="250" r="115" fill="url(#moon)"/><g clip-path="url(#moonclip)">${craters}<circle cx="420" cy="250" r="115" fill="url(#shadow)"/></g>
    <ellipse cx="420" cy="250" rx="11" ry="115" fill="none" stroke="#ccff6b" stroke-opacity=".14" stroke-width="1"/>
    <text x="420" y="407" text-anchor="middle" fill="#7590a5" font-family="monospace" font-size="8" letter-spacing="3">${orbitLabel}</text>
    <g class="spacecraft-orbit ${running&&!reducedMotion?'fast':'paused'}"><g transform="translate(605 118) rotate(-24)">
      ${contact?'<path d="M0 0L160 100" stroke="#7cdbf3" stroke-width="1.2" stroke-dasharray="5 5"/>':'<path class="scan-ray" d="M0 0L-70 114L-105 72Z" fill="#ccff6b" opacity=".09"/>'}
      <rect x="-49" y="-10" width="35" height="20" rx="1" fill="#193c68" stroke="#6387a9"/><rect x="14" y="-10" width="35" height="20" rx="1" fill="#193c68" stroke="#6387a9"/>
      <path d="M-42-10V10M-35-10V10M-28-10V10M-21-10V10M21-10V10M28-10V10M35-10V10M42-10V10M-49 0H-14M14 0H49" stroke="#83b5d9" stroke-width=".6" opacity=".6"/>
      <rect x="-9" y="-15" width="18" height="30" rx="2" fill="#d4c49e" stroke="#faf2d1"/><path d="M-8-10H8M-8 8H8" stroke="#8d7958"/><circle cx="0" cy="-20" r="7" fill="#d2d9dd" stroke="#8e9fad"/><path d="M0-27V-33" stroke="#cbd5de"/><circle cx="0" cy="14" r="4" fill="#4c6a7d"/>
      ${phase==='launch'?'<path d="M-4 20L0 43L4 20" fill="#ccff6b" opacity=".8"/>':''}
      <circle r="61" fill="none" stroke="#ccff6b" stroke-opacity=".22" stroke-dasharray="3 5"/>
    </g></g>
    ${eclipse?'<rect width="840" height="500" fill="#060b14" opacity=".2"/><text x="640" y="370" fill="#ffbc6e" font-family="monospace" font-size="10" letter-spacing="2">IN SHADOW</text>':''}
    <g stroke="#567086" fill="none" opacity=".6"><path d="M90 105V90H105M735 90H750V105M750 395V410H735M105 410H90V395"/></g>
  </svg>`;
}
