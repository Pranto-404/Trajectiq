import {AppShell} from './shell/AppShell.jsx';

// Screen routing lives in the store (state.screen: board -> hangar -> flight -> report); see src/shell/AppShell.jsx.
// Feature packages plug in through src/features/<name>/index.js (screens, sheets, strings): see src/shell/features.js.
export default function App() {
  return <AppShell />;
}
