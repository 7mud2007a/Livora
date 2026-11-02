// Hero micro-interaction: a raw-WebGL layer that gives the hero photograph real depth.
// It renders the plate with a depth map and shifts pixels by their depth as the pointer moves
// (and with a slow idle drift, so it is never fully static). One fullscreen quad, two textures, no dependencies.
// Returns a stop() function, or null when WebGL is not available (the plain <img> stays visible).

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uVisible;   // fraction of the image visible on each axis (object-fit: cover)
uniform vec2 uOffset;    // where that window starts (object-position)
uniform vec2 uMove;      // -1..1 pointer / idle motion
uniform float uStrength;
void main() {
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  vec2 uv = uOffset + st * uVisible;
  float d = texture2D(uDepth, uv).r;
  vec2 shift = uMove * (d - 0.58) * uStrength;
  gl_FragColor = vec4(texture2D(uImage, uv + shift).rgb, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(log || 'shader compile failed');
  }
  return sh;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLImageElement} o.img      the visible <img>; its currentSrc is reused as the colour texture
 * @param {string} o.depthUrl
 * @param {HTMLElement} o.hero          element whose pointer position drives the effect
 * @param {number[]} [o.position]       object-position as fractions, default [0.5, 0.62]
 */
export function startHeroParallax({ canvas, img, depthUrl, hero, position = [0.5, 0.62] }) {
  let gl;
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  let stopped = false;
  let raf = 0;
  let visible = true;
  let inView = true;
  const state = { mx: 0, my: 0, tx: 0, ty: 0, last: 0 };
  const cleanups = [];

  let prog;
  let buf;
  const textures = [];
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  } catch {
    return null;
  }
  gl.useProgram(prog);
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uVisible = U('uVisible');
  const uOffset = U('uOffset');
  const uMove = U('uMove');
  gl.uniform1f(U('uStrength'), 0.02);
  gl.uniform1i(U('uImage'), 0);
  gl.uniform1i(U('uDepth'), 1);

  let imgAspect = 0.8;

  function makeTexture(unit, source) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    textures.push(tex);
    return tex;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
    const w = Math.max(2, Math.round(r.width * dpr));
    const h = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    const ca = w / h;
    // object-fit: cover, with a 4% safety margin so the parallax never samples outside the picture.
    let vx = 1;
    let vy = 1;
    if (ca > imgAspect) vy = imgAspect / ca;
    else vx = ca / imgAspect;
    vx *= 0.96;
    vy *= 0.96;
    gl.uniform2f(uVisible, vx, vy);
    gl.uniform2f(uOffset, (1 - vx) * position[0], (1 - vy) * position[1]);
  }

  function frame(now) {
    raf = 0;
    if (stopped) return;
    const t = now / 1000;
    const dt = Math.min(0.05, state.last ? t - state.last : 0.016);
    state.last = t;
    const k = 1 - Math.pow(0.0008, dt); // frame-rate independent smoothing
    state.mx += (state.tx - state.mx) * k;
    state.my += (state.ty - state.my) * k;
    const idleX = Math.sin(t * 0.33) * 0.32;
    const idleY = Math.cos(t * 0.27) * 0.18;
    gl.uniform2f(uMove, state.mx + idleX, state.my + idleY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!ready) {
      ready = true;
      canvas.classList.add('is-live');
    }
    schedule();
  }
  let ready = false;

  function schedule() {
    if (!raf && !stopped && visible && inView) raf = requestAnimationFrame(frame);
  }

  const onPointer = (e) => {
    const r = hero.getBoundingClientRect();
    state.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    state.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onLeave = () => {
    state.tx = 0;
    state.ty = 0;
  };
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) {
      state.last = 0;
      schedule();
    }
  };
  const onLost = (e) => {
    e.preventDefault();
    stop();
  };

  (async () => {
    try {
      const [color, depth] = await Promise.all([loadImage(img.currentSrc || img.src), loadImage(depthUrl)]);
      if (stopped) return;
      imgAspect = color.naturalWidth / color.naturalHeight;
      makeTexture(0, color);
      makeTexture(1, depth);
      resize();
      schedule();
    } catch {
      stop();
    }
  })();

  const ro = new ResizeObserver(() => {
    if (!stopped) {
      resize();
      schedule();
    }
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) {
      state.last = 0;
      schedule();
    }
  });
  io.observe(canvas);
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
  }
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  cleanups.push(() => {
    window.removeEventListener('pointermove', onPointer);
    hero.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    ro.disconnect();
    io.disconnect();
  });

  function stop() {
    if (stopped) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    cleanups.forEach((fn) => fn());
    canvas.classList.remove('is-live');
    try {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch {
      /* context already gone */
    }
  }
  return stop;
}
