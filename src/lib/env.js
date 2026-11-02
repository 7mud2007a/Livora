// Small environment helpers (all safe to call during the first client render).

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  try {
    return window.matchMedia(reducedMotionQuery).matches;
  } catch {
    return false;
  }
}

let webglCache;
/** True when a WebGL context can actually be created. */
export function hasWebGL() {
  if (webglCache !== undefined) return webglCache;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    webglCache = !!gl;
    // Release the probe context right away.
    const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export const isCoarsePointer = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

export function safeStorage() {
  return {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage unavailable (private mode, blocked): ignore */
      }
    },
    sessionGet(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    sessionSet(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
  };
}

export const store = safeStorage();
