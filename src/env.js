/* eslint-disable no-undef */
/** True only inside the single-file offline build (vite.standalone.config.js defines __STANDALONE__). */
export const STANDALONE = typeof __STANDALONE__ !== 'undefined' && __STANDALONE__ === true;
