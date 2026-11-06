import {useId, useMemo} from 'react';
import {Panel} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {computeFlows} from './flightModel.js';
import s from './flight.module.css';

const NW = 78, NH = 44, COLS = [0, 111, 222], ROW_A = 6, ROW_B = 104;
const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});

function Node({x, y, label, value, status = 'idle'}) {
  return (
    <g className={s.node} data-status={status} transform={`translate(${x} ${y})`}>
      <rect width={NW} height={NH} rx="8" />
      <text className="nodeLabel" x="8" y="18" style={{fill: 'var(--text-1)', fontWeight: 650}}>{label}</text>
      <text className="nodeValue" x="8" y="36" style={{fontFamily: 'var(--font-mono)'}}>{value}</text>
      {status === 'starved' ? <text x={NW - 8} y="18" textAnchor="end" style={{fill: 'var(--red-400)', fontWeight: 800}} aria-hidden="true">!</text> : null}
    </g>
  );
}

function Link({d, lane, status, width, speed}) {
  return <path className={s.link} d={d} data-lane={lane} data-status={status} strokeWidth={status === 'idle' ? 1.5 : width} style={{'--dur': `${Math.max(0.5, 2.4 - 1.9 * speed).toFixed(2)}s`}} />;
}

/**
 * Resource flow: Sun -> array -> battery -> loads -> recorder -> downlink. Line widths and dash speeds follow watts and MB/s
 * derived in UI code from calculate() values and the run mode (see flightModel.computeFlows); red (and a "!") where starved.
 * The SVG has a text description so the numbers are available without the picture.
 */
export function ResourceFlow({run, analysis: a}) {
  const t = useT();
  const id = useId();
  const f = useMemo(() => computeFlows(run, a), [run, a]);
  const maxW = Math.max(a.c.power.solar * 0.85 * (run.factors?.solar || 1), f.loadW, 1);
  const maxD = Math.max(a.c.payload.dataMbps / 8, a.c.comms.downlinkMbps / 8, 0.01);
  const wE = w => 1.5 + 6 * Math.min(1, w / maxW), sE = w => Math.min(1, w / maxW);
  const wD = v => 1.5 + 6 * Math.min(1, v / maxD), sD = v => Math.min(1, v / maxD);
  const mid = y => y + NH / 2;
  const row = (c0, c1, y) => `M${c0} ${mid(y)} L${c1} ${mid(y)}`;
  const net = `${f.netW >= 0 ? '+' : ''}${fmt(f.netW)} W`;
  const summary = t('Array {a} W, load {l} W, battery {b} percent ({n}), data in {i} MB/s, downlink {o} MB/s, recorder {r} percent full.', {a: fmt(f.solarW), l: fmt(f.loadW), b: fmt(f.batteryFraction * 100), n: net, i: fmt(f.dataInMBs, 2), o: fmt(f.downMBs, 2), r: fmt(f.fill * 100)});
  const starved = Object.entries(f.status).filter(([, v]) => v === 'starved').map(([k]) => k);
  return (
    <Panel kicker={t('Resource flow')} title={t('Power and data')} className={`${s.fill} ${s.tight}`}>
      <svg className={s.flowSvg} viewBox="0 0 300 152" role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>{t('Resource flow diagram')}</title>
        <desc id={`${id}-d`}>{summary}{starved.length ? ` ${t('Starved')}: ${starved.join(', ')}.` : ''}</desc>
        {/* energy lane, left to right */}
        <Link d={row(COLS[0] + NW, COLS[1], ROW_A)} lane="energy" status={f.status.array === 'starved' ? 'starved' : 'flow'} width={wE(f.solarW)} speed={sE(f.solarW)} />
        <Link d={row(COLS[1] + NW, COLS[2], ROW_A)} lane="energy" status={f.status.array === 'starved' ? 'starved' : f.solarW > 0 ? 'flow' : 'idle'} width={wE(f.solarW)} speed={sE(f.solarW)} />
        <Link d={`M${COLS[2] + NW / 2} ${ROW_A + NH} L${COLS[2] + NW / 2} ${ROW_B}`} lane="energy" status={f.status.loads} width={wE(f.loadW)} speed={sE(f.loadW)} />
        {/* data lane, right to left */}
        <Link d={row(COLS[2], COLS[1] + NW, ROW_B)} lane="data" status={f.status.recorder === 'starved' ? 'starved' : f.dataInMBs > 0 ? 'flow' : 'idle'} width={wD(f.dataInMBs)} speed={sD(f.dataInMBs)} />
        <Link d={row(COLS[1], COLS[0] + NW, ROW_B)} lane="data" status={f.status.downlink} width={wD(f.downMBs)} speed={sD(f.downMBs)} />
        <Node x={COLS[0]} y={ROW_A} label={t('Sun')} value={run.eclipse ? t('shadow') : t('lit')} status={run.eclipse ? 'starved' : 'flow'} />
        <Node x={COLS[1]} y={ROW_A} label={t('Array')} value={`${fmt(f.solarW)} W`} status={f.status.array} />
        <Node x={COLS[2]} y={ROW_A} label={t('Battery')} value={`${fmt(f.batteryFraction * 100)}%`} status={f.status.battery} />
        <Node x={COLS[2]} y={ROW_B} label={t('Loads')} value={`${fmt(f.loadW)} W`} status={f.status.loads} />
        <Node x={COLS[1]} y={ROW_B} label={t('Recorder')} value={`${fmt(f.fill * 100)}%`} status={f.status.recorder} />
        <Node x={COLS[0]} y={ROW_B} label={t('Downlink')} value={`${fmt(f.downMBs, 2)} MB/s`} status={f.status.downlink} />
      </svg>
      <p className={s.flowCaption}>
        {t('Net')} {net} · {t('bus')} {fmt(f.busW)} · {t('payload')} {fmt(f.payloadW)} · {t('radio')} {fmt(f.txW)} W · {t('data in')} {fmt(f.dataInMBs, 2)} MB/s
      </p>
    </Panel>
  );
}
