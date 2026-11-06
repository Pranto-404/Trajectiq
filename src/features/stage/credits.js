// Credits for every NASA asset shipped with the stage. Shown by the UI (credits / sources sheet).
// Full licence notes and fetch details: src/assets/ATTRIBUTION.md. Sizes are the bundled files, in bytes.
export const ASSET_CREDITS = Object.freeze([
  Object.freeze({id: 'earth', file: 'earth.jpg', bytes: 288946, title: 'Earth map (2048x1024)',
    credit: 'NASA Earth Observatory, Blue Marble Next Generation with topography and bathymetry (December).',
    source: 'https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation-w-topography-and-bathymetry'}),
  Object.freeze({id: 'moon', file: 'moon.jpg', bytes: 113080, title: 'Moon map (1024x512)',
    credit: 'NASA Scientific Visualization Studio, CGI Moon Kit (Ernie Wright); LRO/LROC colour map.',
    source: 'https://svs.gsfc.nasa.gov/4720/'}),
  Object.freeze({id: 'mars', file: 'mars.jpg', bytes: 84810, title: 'Mars map (1024x512)',
    credit: 'NASA 3D Resources, Mars texture map (exact mission product not stated by the repository).',
    source: 'https://github.com/nasa/NASA-3D-Resources'}),
  Object.freeze({id: 'venus', file: 'venus.jpg', bytes: 102285, title: 'Venus radar map (1024x512)',
    credit: 'NASA 3D Resources, Venus map: false-colour Magellan radar mosaic. The visible cloud deck is drawn procedurally.',
    source: 'https://github.com/nasa/NASA-3D-Resources'})
]);

export const ASSET_NOTICE = 'Planetary maps: NASA, NASA/JPL-Caltech, NASA Goddard SVS, NASA Earth Observatory and the NASA 3D Resources collection. TRAJECTIQ is an independent educational game and is not endorsed by NASA. Spacecraft shapes are procedural and fictional. Mercury, Ceres, Vesta and Europa are procedural surfaces, not NASA imagery.';

export const ASSET_BYTES = ASSET_CREDITS.reduce((n, c) => n + c.bytes, 0);
