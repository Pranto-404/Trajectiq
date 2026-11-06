import {useT} from '@/i18n/index.js';
import {nextOrbitEvent} from './flightModel.js';

/**
 * SVG stand-in for the stage: the body, the orbit, the spacecraft at its orbit position, the shadow wedge during eclipse,
 * a beam to Earth during contact and a Sun marker. Fully derived from the run (position = campaign minute mod period).
 * The body name comes from the mission (never hard-coded).
 */
export function FlightSchematic({run, analysis: a}) {
  const t = useT();
  const body = a.m.bodyName || 'Body';
  const position = nextOrbitEvent(a, run.minute).position / a.period;
  const ang = -Math.PI + position * Math.PI * 2;
  const r = 92, cx = 200, cy = 130, rx = cx + r * Math.cos(ang), ry = cy + r * Math.sin(ang) * 0.55;
  const eclipsePct = Math.round(a.m.eclipseMinutes / a.period * 100);
  const label = run.safe ? t('Safe mode') : run.eclipse ? t('In eclipse') : run.contact ? t('Ground contact') : t('Sunlight');
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${body}: ${label}, ${a.d.altitude} km, ${a.d.inclination}°`} style={{width: '100%', height: '100%', display: 'block'}}>
      <defs>
        <radialGradient id="fl-body" cx="35%" cy="35%"><stop offset="0%" stopColor="#1a2636" /><stop offset="100%" stopColor="#0e1620" /></radialGradient>
      </defs>
      <g stroke="#ffbc6e" strokeWidth="1.5" opacity=".6">{[-40, -20, 0, 20, 40].map(d => <line key={d} x1="14" y1={130 + d} x2="58" y2={130 + d * 0.8} />)}</g>
      <text x="14" y="76" fill="#8d9bab" fontSize="12">{t('Sun')}</text>
      {run.eclipse ? <path d={`M${cx} ${cy - 40} L${cx + 190} ${cy - 62} L${cx + 190} ${cy + 62} L${cx} ${cy + 40} Z`} fill="rgb(6 10 17 / .7)" /> : null}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.55} fill="none" stroke="#2f4258" strokeWidth="1.5" strokeDasharray="3 5" />
      <circle cx={cx} cy={cy} r="42" fill="url(#fl-body)" stroke="#2f4258" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#b6c1ce" fontSize="12">{body}</text>
      {run.contact && !run.safe ? <line x1={rx} y1={ry} x2="388" y2="40" stroke="#7cdbf3" strokeWidth="1.5" strokeDasharray="5 6" /> : null}
      <text x="388" y="30" textAnchor="end" fill="#8d9bab" fontSize="12">{t('Earth')}</text>
      <circle cx={rx} cy={ry} r="6" fill={run.safe ? '#ffbc6e' : '#ccff6b'} stroke="#060a11" strokeWidth="2" />
      <text x="200" y="250" textAnchor="middle" fill="#8d9bab" fontSize="12">{`${a.d.altitude} km · ${a.d.inclination}° · ${eclipsePct}% ${t('shadow')}`}</text>
    </svg>
  );
}
