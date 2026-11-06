import {Component, useEffect, useState} from 'react';
import {FlightSchematic} from './FlightSchematic.jsx';

// The 3D stage package (WP6) exports `Stage3D` from src/features/stage/index.js. Flight reaches it through the glob below, so
// nothing here imports a file that may not exist yet. Until the stage is merged (or if it fails to mount) the SVG schematic
// shows the same engine-linked state (orbit position, shadow, contact beam, safe mode).
const stageModules = import.meta.glob('../stage/index.js', {eager: true});
const Stage3D = Object.values(stageModules).map(m => m?.Stage3D).find(Boolean) || null;

class StageBoundary extends Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { /* fall back to the schematic */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Stage contract: <Stage3D design selected hoverPart run phase quality reduced onPick onSocketHover />. */
export function StageSlot(props) {
  if (!Stage3D) return <FlightSchematic run={props.run} analysis={props.analysis} />;
  return <StageWithGl {...props} />;
}

function StageWithGl({run, design, analysis, reduced}) {
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    try { const c = document.createElement('canvas'); setWebgl(!!(c.getContext?.('webgl2'))); } catch { setWebgl(false); }
  }, []);
  const fallback = <FlightSchematic run={run} analysis={analysis} />;
  if (!webgl) return fallback;
  return (
    <StageBoundary fallback={fallback}>
      <Stage3D design={design} selected={null} hoverPart={null} run={run} phase={run.phase} quality="auto" reduced={reduced} onPick={() => {}} onSocketHover={() => {}} />
    </StageBoundary>
  );
}
