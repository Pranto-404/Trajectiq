// WebGL2 detection. three 0.187 needs WebGL2. The probe canvas is released straight away.
/** Returns true when a WebGL2 context can be created. `doc` is injectable for tests. */
export function detectWebGL2(doc = globalThis.document) {
  try {
    if (!doc?.createElement) return false;
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext?.('webgl2');
    if (!gl) return false;
    gl.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    return true;
  } catch { return false; }
}
