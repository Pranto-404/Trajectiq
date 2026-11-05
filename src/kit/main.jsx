import {createRoot} from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/base.css';
import {KitApp} from './KitApp.jsx';

// Development-only gallery: `npm run dev`, then open /kit.html. It is not part of the production build.
createRoot(document.getElementById('root')).render(<KitApp />);
