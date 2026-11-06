/*!
 * BrandBackground 1.0 — animated WebGL background ("tufted silk lattice")
 *
 *  • One file, zero dependencies, WebGL 1 (runs wherever WebGL runs).
 *  • Colour-locked: the renderer can only ever output blends of the four brand colours below.
 *  • Transparent canvas by default, so it sits on top of whatever background your page already has.
 *  • Pauses when off-screen / tab hidden, adapts resolution to the device, frees every GPU resource on destroy().
 *
 * QUICK START
 *   <script src="brand-background.js"></script>
 *   <script>
 *     var bg = new BrandBackground();                  // fixed, full-viewport, behind your page
 *     // …or inside any element (it is filled edge-to-edge, content stays above it):
 *     // var bg = new BrandBackground('#hero', { speed: 0.8 });
 *   </script>
 *
 * API
 *   bg.setOptions({ … })   change any option live            bg.pause() / bg.play()
 *   bg.render(seconds)     draw one frame at a given time    bg.destroy()   release everything
 *   bg.canvas              the <canvas> element           bg.supported   true once mounted with WebGL
 *   BrandBackground.isSupported()   BrandBackground.PALETTE   BrandBackground.DEFAULTS
 *   Options also accept onUnsupported(err), called if WebGL is unavailable (nothing is rendered or left behind).
 *
 * NOTES
 *   • Fixed mode uses z-index:-1. If BOTH <html> and <body> paint an opaque background, the body would
 *     cover it — mount into a container instead, or set { zIndex: 0 } and keep your content positioned above.
 *   • The script may be placed in <head>: mounting waits for the DOM when needed.
 *   • Container mode sets position:relative (only if it was static) and isolation:isolate on the container,
 *     and restores both on destroy().
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) { define([], factory); }
  else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.BrandBackground = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════
   * 1. BRAND PALETTE — the ONLY colours the renderer can produce.
   *    Shading, lines, glows and gradients are all blends between these four.
   * ═══════════════════════════════════════════════════════════════════════ */
  var PALETTE = Object.freeze({
    taupe:     '#9B8873',   // Warm Taupe
    brownGrey: '#766B60',   // Muted Brown-Grey
    ivory:     '#EAE4D9',   // Warm Ivory
    beige:     '#C9BBA7'    // Stone Beige
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * 2. OPTIONS — every visual parameter lives here.
   * ═══════════════════════════════════════════════════════════════════════ */
  var DEFAULTS = {
    /* canvas */
    background: null,        // null = transparent. Or a palette key: 'ivory' | 'beige' | 'taupe' | 'brownGrey'
    zIndex: -1,              // stacking order of the canvas

    /* structure */
    layers: 3,               // 1–3 silk sheets, back to front
    cell: 54,                // diamond width in CSS px on the middle sheet (smaller = finer lattice)
    cellRatio: 1.32,         // diamond height ÷ width
    latticeAngle: 0,         // radians, extra lean applied to every sheet's lattice
    relief: 1,               // depth of the folds (the 3D amount)
    warp: 1,                 // how far the lattice bends in-plane
    clearing: 0.5,           // 0–1: how much the structure recedes from the centre (breathing room)

    /* line, surface, vertex */
    lineWidth: 1,            // CSS px
    lineOpacity: 0.88,
    lineAccent: 0.55,        // extra weight of the larger diamonds that frame the lattice (0 = uniform)
    surfaceOpacity: 0.78,    // translucent fabric
    quilting: 0.09,          // soft pillowing inside each diamond (0 = smooth cloth); swells further near the pointer
    nodeSize: 1,             // vertex button size multiplier
    nodeGlow: 1,             // vertex light intensity
    opacity: 1,              // master opacity

    /* motion */
    speed: 1,                // 1 = slow & calm; 0.5 = half speed
    fadeIn: 2.2,             // seconds (0 = none) — read at load
    startTime: 9,            // seconds into the animation at load (also the still frame for reduced motion) — read at load
    seed: 3,                 // changes the shapes

    /* interaction */
    pointer: true,           // soft light + parallax follow the cursor / touch
    pointerStrength: 1,
    scrollParallax: 0.35,    // 0 disables

    /* performance */
    maxPixelRatio: 2,
    maxPixels: 4e6,          // drawing-buffer pixel budget (≈ 2560×1560)
    maxFps: 60,
    detail: 1,               // mesh density multiplier (0.5 – 1.5)
    adaptiveQuality: true,   // lowers resolution automatically if the device cannot keep up
    respectReducedMotion: true,   // renders a single still frame when the OS asks for reduced motion
    powerPreference: 'low-power'
  };

  /* Sheets, back → front — the composition lives here.
   *   z        depth            rot   tilt in radians (x, y, z)        lat   lean of this sheet's lattice
   *   tone     tonal shift (+ lighter, − deeper)                       alpha sheet opacity
   *   lobeA/B  organic windows [x, y, radius, softness] in screen-normalised space (the viewport is -1…1);
   *            this is what keeps the structure in the corners and the centre open at any aspect ratio
   *   cellMul / lineMul / nodeMul   scale hierarchy: far sheets finer and lighter, near sheets coarser */
  var SHEETS = [
    { z: -1.05, rot: [-0.28,  0.18,  0.08], lat:  0.34, seed: 0.0, cellMul: 0.74, alpha: 0.80, tone:  0.10, relief: 0.95, lineMul: 0.85, nodeMul: 0.75,
      lobeA: [-1.00,  1.00, 1.45, 0.65], lobeB: [ 1.00, -1.00, 1.38, 0.65] },
    { z: -0.28, rot: [ 0.20, -0.24, -0.06], lat: -0.16, seed: 1.0, cellMul: 1.00, alpha: 0.92, tone:  0.00, relief: 1.00, lineMul: 1.00, nodeMul: 1.00,
      lobeA: [-0.80, -1.35, 0.92, 0.60], lobeB: [-0.30,  1.45, 0.95, 0.60] },
    { z:  0.48, rot: [-0.16,  0.26,  0.10], lat:  0.06, seed: 2.0, cellMul: 1.46, alpha: 1.00, tone: -0.09, relief: 1.10, lineMul: 1.10, nodeMul: 1.20,
      lobeA: [-1.15,  1.15, 0.95, 0.60], lobeB: [ 1.15, -1.15, 0.90, 0.60] }
  ];
  var SHEET_SETS = { 1: [1], 2: [0, 1], 3: [0, 1, 2] };

  var FOV = 0.6;                       // vertical field of view (rad)
  var CAM_D = 1 / Math.tan(FOV / 2);   // camera distance: the z = 0 plane is exactly 2 units tall
  var OVERSCAN = 1.62;                 // sheets are larger than the screen so tilt & parallax never reveal an edge
  var CLAMP = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ═══════════════════════════════════════════════════════════════════════
   * 3. SHADERS
   * ═══════════════════════════════════════════════════════════════════════ */
  var VERT = `
attribute vec2 aUv;
uniform mat4 uViewProj;
uniform mat3 uRot;
uniform vec3 uOrigin;
uniform vec2 uPlane;
uniform float uT;
uniform float uSeed;
uniform float uRelief;
uniform float uWarp;
uniform vec4 uLobeA;
uniform vec4 uLobeB;
varying vec2 vPlane;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vMask;

// Silk: a handful of incommensurate travelling swells, domain-warped so nothing ever repeats.
vec3 surf(vec2 p) {
  float t = uT;
  vec2 w = vec2(
    sin(p.y * 1.55 + t * 0.131 + uSeed) + 0.55 * sin(p.x * 2.35 - t * 0.093 + uSeed * 2.1),
    sin(p.x * 1.35 - t * 0.117 + uSeed * 1.3) + 0.55 * sin(p.y * 2.15 + t * 0.081 + uSeed * 3.7));
  vec2 q = p + uWarp * 0.15 * w;
  float h = 0.0;
  h += 0.55 * sin(dot(q, vec2( 0.80,  0.60)) * 1.85 + 0.9 * sin(q.y * 1.1 + t * 0.07) + t * 0.19 + uSeed);
  h += 0.34 * sin(dot(q, vec2(-0.45,  0.89)) * 2.70 - t * 0.14 + uSeed * 1.7);
  h += 0.20 * sin(dot(q, vec2( 0.95, -0.31)) * 3.60 + 0.6 * sin(q.x * 1.5 - t * 0.09) + t * 0.11 + uSeed * 2.9);
  h += 0.10 * sin(dot(q, vec2(-0.12, -0.99)) * 5.20 - t * 0.09 + uSeed * 4.3);
  return vec3(q, h * uRelief * 0.30);
}

vec3 place(vec2 uv) {
  return uRot * surf((uv - 0.5) * uPlane) + uOrigin;
}

// Soft organic window, in screen space, that lets a sheet enter from a corner and fade towards the middle.
float lobe(vec2 q, vec4 L) {
  vec2 d = q - L.xy;
  float wob = 0.16 * sin(d.x * 2.3 + d.y * 1.7 + uT * 0.11 + uSeed)
            + 0.10 * sin(d.y * 3.1 - d.x * 2.2 - uT * 0.083 + uSeed * 2.0);
  float r = length(d) + wob * L.z;
  return 1.0 - smoothstep(L.z * (1.0 - L.w), L.z, r);
}

void main() {
  vec2 e = vec2(0.012) / uPlane;
  vec3 P  = place(aUv);
  vec3 Pu = place(aUv + vec2(e.x, 0.0));
  vec3 Pv = place(aUv + vec2(0.0, e.y));
  vNormal = normalize(cross(Pu - P, Pv - P));
  vWorld  = P;
  vPlane  = (aUv - 0.5) * uPlane;
  vec4 clip = uViewProj * vec4(P, 1.0);
  vec2 q  = clip.xy / clip.w;                       // screen-normalised: the whole viewport is -1…1
  float m = 1.0 - (1.0 - lobe(q, uLobeA)) * (1.0 - lobe(q, uLobeB));
  vMask   = m * m * (3.0 - 2.0 * m);
  gl_Position = clip;
}`;

  var FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vPlane;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vMask;

uniform vec3 uC0;       // Muted Brown-Grey  (deepest)
uniform vec3 uC1;       // Warm Taupe
uniform vec3 uC2;       // Stone Beige
uniform vec3 uC3;       // Warm Ivory        (lightest)
uniform vec3 uEye;
uniform vec2 uRes;
uniform float uPx;      // device px per CSS px
uniform float uTime;
uniform float uSeedF;
uniform vec2 uCell;     // diamond width / height in world units
uniform vec2 uCS;       // cos / sin of the lattice lean
uniform float uCellPx;  // approx. device px per lattice unit (only used without derivatives)
uniform float uLineW;
uniform float uLineA;
uniform float uAccent;
uniform float uFillA;
uniform float uQuilt;
uniform float uNodeR;
uniform float uNodeGlow;
uniform float uClear;
uniform float uAlpha;
uniform float uTone;    // per-sheet tonal shift: back sheets lighter, front sheets deeper
uniform vec3 uLamp;     // screen-space position (-1…1) and strength of the roaming light

// Every shade in the scene comes from this 4-stop ramp: nothing outside the brand palette is reachable.
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c = mix(uC0, uC1, clamp(t, 0.0, 1.0));
  c = mix(c, uC2, clamp(t - 1.0, 0.0, 1.0));
  return mix(c, uC3, clamp(t - 2.0, 0.0, 1.0));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec4 over(vec4 dst, vec3 col, float a) {
  return vec4(col * a + dst.rgb * (1.0 - a), a + dst.a * (1.0 - a));
}

// Anti-aliased distance (in px) to the nearest lattice line, for lines every k lattice units.
float seam(vec2 c, vec2 g, float k, float hw) {
  vec2 d = abs(fract(c / k - 0.5) - 0.5) * k / g;
  vec2 a = 1.0 - smoothstep(hw - 0.5, hw + 0.5, d);
  return max(a.x, a.y);
}

void main() {
  // Rhombic (diamond) lattice, attached to the cloth itself so it bends with it.
  vec2 p = vec2(uCS.x * vPlane.x - uCS.y * vPlane.y, uCS.y * vPlane.x + uCS.x * vPlane.y);
  vec2 c = vec2(p.x / uCell.x + p.y / uCell.y, p.x / uCell.x - p.y / uCell.y);

#ifdef HAS_DERIV
  vec2 dcx = dFdx(c);
  vec2 dcy = dFdy(c);
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 g = vec2(length(vec2(dcx.x, dcy.x)), length(vec2(dcx.y, dcy.y)));
#else
  vec2 g = vec2(1.0 / max(uCellPx, 1.0));
#endif

  float mask = vMask * uAlpha;
  if (mask < 0.012) discard;

  // Roaming light, in screen space so it sits exactly under the pointer at any depth
  vec2 sc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec2 dl = (sc - uLamp.xy) * vec2(uRes.x / uRes.y, 1.0);
  float lamp = uLamp.z * exp(-dot(dl, dl) * 7.0);

  g = max(g, vec2(1e-5));
  float cellPx = 1.0 / max(g.x, g.y);
  float lod = smoothstep(2.5, 7.0, cellPx);          // fade detail out before it can moiré

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uEye - vWorld);
  if (dot(N, V) < 0.0) N = -N;

  // Quilting: each diamond is a soft pillow; the normal is bent with a cotangent frame.
  vec2 f = fract(c) - 0.5;
  vec3 Nq = N;
#ifdef HAS_DERIV
  vec3 dp2perp = cross(dpy, N);
  vec3 dp1perp = cross(N, dpx);
  vec3 T = dp2perp * dcx.x + dp1perp * dcy.x;
  vec3 B = dp2perp * dcx.y + dp1perp * dcy.y;
  float inv = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-20));
  vec2 sn = 4.0 * f * (1.0 - abs(f));                // ≈ sin(πf)
  vec2 cs = 1.0 - 4.0 * f * f;                       // ≈ cos(πf)
  vec2 slope = -3.14159265 * vec2(sn.x * cs.y, cs.x * sn.y);
  Nq = normalize(N - uQuilt * (1.0 + 1.7 * lamp) * lod * (slope.x * T + slope.y * B) * inv);   // pillows plump toward the light
#endif

  // Light: soft key from the upper left, silk sheen, rim, and the roaming lamp.
  vec3 Ld = normalize(vec3(-0.5, 0.62, 0.6));
  vec3 H = normalize(Ld + V);
  float wrap = dot(Nq, Ld) * 0.5 + 0.5;
  float nh = clamp(dot(Nq, H), 0.0, 1.0);
  float n2 = nh * nh, n4 = n2 * n2, n8 = n4 * n4;
  float spec = n8 * n8 * n4 * n2;                    // nh^22: soft silk sheen
  float rv = 1.0 - clamp(dot(Nq, V), 0.0, 1.0);
  float rim = rv * rv * sqrt(rv);                    // rv^2.5
  float shade = clamp(wrap * 0.9 + spec * 0.13 + rim * 0.12 + lamp * 0.16, 0.0, 1.0);

  // Surface: widen the tonal range inside the palette (brown-grey shadows → ivory highlights)
  float tone = clamp(pow(shade, 1.65) + uTone, 0.0, 1.0);
  float fillA = uFillA * mix(0.55, 1.0, 1.0 - shade);
  vec4 acc = over(vec4(0.0), ramp(tone), fillA);

  // Seams: delicate lines, with larger framing diamonds slightly stronger
  float hw = max(0.5 * uLineW * uPx, 0.3);
  float thin = clamp(uLineW * uPx, 0.0, 1.0);
  float fine = seam(c, g, 1.0, hw);
  float major = seam(c, g, 3.0, hw * 1.45);
  vec3 lineCol = mix(uC1, uC0, 0.45 + 0.55 * (1.0 - tone));
  float lineA = uLineA * thin * lod * (0.7 + 0.3 * (1.0 - shade)) * (1.0 + 0.55 * lamp);
  acc = over(acc, lineCol, lineA * fine * (1.0 - 0.4 * uAccent));
  acc = over(acc, mix(uC0, uC1, 0.25), lineA * major * uAccent);

  // Vertices: small lit buttons with a contact shadow; a few pulse softly.
  vec2 dn = fract(c + 0.5) - 0.5;
  vec2 nid = floor(c + 0.5);
#ifdef HAS_DERIV
  float det = dcx.x * dcy.y - dcy.x * dcx.y;
  det = det >= 0.0 ? max(det, 1e-12) : min(det, -1e-12);
  vec2 ds = vec2(dcy.y * dn.x - dcy.x * dn.y, -dcx.y * dn.x + dcx.x * dn.y) / det;
#else
  vec2 ds = dn / g;
#endif
  vec2 dsp = ds / uPx;                                     // CSS px from the node centre
  float R = uNodeR;
  float aa = 0.75 / uPx;
  float h1 = hash(nid + uSeedF);
  float h2 = fract(h1 * 37.17 + 0.31);
  float accent = step(0.8, h1);
  float pulse = 0.5 + 0.5 * sin(uTime * (0.3 + 0.5 * h2) + h1 * 6.2831853);
  float nodeLod = smoothstep(8.0, 16.0, cellPx);
  R *= (1.0 + 0.25 * accent) * (1.0 + 0.35 * lamp);
  float rr = length(dsp);
  float core = 1.0 - smoothstep(R - aa, R + aa, rr);
  float halo = exp(-rr * rr / (16.0 * R * R));
  float shadow = 1.0 - smoothstep(R, R * 2.1, length(dsp - vec2(0.45, -0.55) * R));
  float glow = (0.28 + 0.72 * accent * (0.35 + 0.65 * pulse) + lamp * 0.9) * uNodeGlow;
  acc = over(acc, uC0, shadow * 0.4 * nodeLod);
  acc = over(acc, uC3, clamp(halo * glow * 0.55, 0.0, 1.0) * nodeLod);
  acc = over(acc, mix(uC3, uC2, 0.2 * (1.0 - glow)), core * 0.97 * nodeLod);

  // Breathing room: recede from the centre of the screen
  float clearF = mix(1.0, smoothstep(0.2, 1.05, length(sc)), uClear);
  acc *= mask * clearF;

  // Tiny dither keeps the soft gradients free of banding
  acc.rgb += (hash(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0) * acc.a;
  gl_FragColor = acc;
}`;

  /* ═══════════════════════════════════════════════════════════════════════
   * 4. SMALL MATH HELPERS (column-major, like WebGL)
   * ═══════════════════════════════════════════════════════════════════════ */
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }
  function lookAt(out, eye, ctr, up) {
    var zx = eye[0] - ctr[0], zy = eye[1] - ctr[1], zz = eye[2] - ctr[2];
    var l = 1 / Math.hypot(zx, zy, zz); zx *= l; zy *= l; zz *= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = 1 / (Math.hypot(xx, xy, xz) || 1); xx *= l; xy *= l; xz *= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  }
  function mul4(out, a, b) {
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  }
  function mul3(out, a, b) {
    for (var c = 0; c < 3; c++) for (var r = 0; r < 3; r++) {
      out[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
    }
    return out;
  }
  var _rx = new Float32Array(9), _ry = new Float32Array(9), _rz = new Float32Array(9), _rt = new Float32Array(9);
  function rotation(out, ax, ay, az) {                         // out = Ry · Rx · Rz
    var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    _rx.set([1, 0, 0, 0, cx, sx, 0, -sx, cx]);
    _ry.set([cy, 0, -sy, 0, 1, 0, sy, 0, cy]);
    _rz.set([cz, sz, 0, -sz, cz, 0, 0, 0, 1]);
    return mul3(out, _ry, mul3(_rt, _rx, _rz));
  }
  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('BrandBackground shader error: ' + log);
    }
    return s;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 5. COMPONENT
   * ═══════════════════════════════════════════════════════════════════════ */
  var GLOBAL_UNIFORMS = ['uViewProj', 'uEye', 'uRes', 'uPx', 'uTime', 'uT', 'uC0', 'uC1', 'uC2', 'uC3',
    'uLineW', 'uLineA', 'uAccent', 'uFillA', 'uQuilt', 'uNodeR', 'uNodeGlow', 'uClear'];
  var SHEET_UNIFORMS = ['uRot', 'uOrigin', 'uPlane', 'uSeed', 'uSeedF', 'uRelief', 'uWarp', 'uLobeA', 'uLobeB',
    'uCell', 'uCS', 'uCellPx', 'uAlpha', 'uTone', 'uLamp'];

  function BrandBackground(target, options) {
    if (!(this instanceof BrandBackground)) { return new BrandBackground(target, options); }
    if (target && target.nodeType !== 1 && typeof target === 'object') { options = target; target = null; }

    this.o = Object.assign({}, DEFAULTS, options || {});
    this.supported = false;
    this._destroyed = false;
    this._paused = false;
    this._inView = true;
    this._lost = false;
    this._raf = 0;
    this._t = this.o.startTime;
    this._age = 0;
    this._prev = 0;
    this._lastDraw = 0;
    this._q = 1;                         // adaptive resolution scale
    this._gov = { n: 0, sum: 0, hold: 0, base: 0, locked: false, last: 1 };
    this._pt = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 };
    this._sy = 0;
    this._rect = null;
    this._restore = [];
    this._viewProj = new Float32Array(16);
    this._proj = new Float32Array(16);
    this._view = new Float32Array(16);
    this._rot = new Float32Array(9);
    this._u = {};
    this._sheets = [];
    this._boundLoop = this._loop.bind(this);

    // Mount immediately when the DOM is ready (or the target is an element); otherwise wait for it, so the
    // script can live in <head> and a selector string can point at an element that is not parsed yet.
    var self = this, sel = typeof target === 'string' ? target : null;
    var boot = function () {
      if (self._destroyed) { return; }
      var el = sel ? document.querySelector(sel) : target;
      if (sel && !el) { console.warn('[BrandBackground] no element matches "' + sel + '"'); return; }
      self._mount(el);
      try { self._initGL(); } catch (err) { self._fail(err); return; }
      self._observe();
      self.supported = true;
      self._resize();
      self._updateRunState();
    };
    if (document.readyState === 'loading' && (sel || !target)) {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else { boot(); }
  }

  var P = BrandBackground.prototype;

  /* ── mounting ─────────────────────────────────────────────────────── */
  P._mount = function (target) {
    var cs, canvas, st;
    if (target && target.tagName === 'CANVAS') {
      canvas = target; this._mode = 'canvas';
    } else {
      canvas = document.createElement('canvas');
      st = canvas.style;
      st.display = 'block'; st.pointerEvents = 'none'; st.userSelect = 'none';
      st.zIndex = String(this.o.zIndex);
      if (target) {
        this._mode = 'container';
        cs = getComputedStyle(target);
        if (cs.position === 'static') { this._remember(target, 'position', 'relative'); }
        this._remember(target, 'isolation', 'isolate');
        st.position = 'absolute'; st.left = '0'; st.top = '0'; st.width = '100%'; st.height = '100%';
        target.appendChild(canvas);
      } else {
        this._mode = 'fixed';
        st.position = 'fixed'; st.left = '0'; st.top = '0'; st.width = '100%';
        st.height = '100vh'; st.height = '100lvh';          // lvh: no resize jitter when mobile toolbars collapse
        document.body.insertBefore(canvas, document.body.firstChild);
      }
    }
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    this.canvas = canvas;
    this._host = target || null;
  };
  P._remember = function (el, prop, value) {
    this._restore.push([el, prop, el.style[prop]]);
    el.style[prop] = value;
  };

  /* ── WebGL setup ──────────────────────────────────────────────────── */
  P._initGL = function () {
    var canvas = this.canvas, o = this.o;
    var attrs = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true,
                  preserveDrawingBuffer: false, powerPreference: o.powerPreference };
    var gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) { throw new Error('WebGL is not available'); }
    this.gl = gl;
    this._deriv = !!gl.getExtension('OES_standard_derivatives');

    var fragSrc = (this._deriv ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV\n' : '') + FRAG;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aUv');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('BrandBackground link error: ' + gl.getProgramInfoLog(prog));
    }
    this._vs = vs; this._fs = fs; this._prog = prog;
    var self = this;
    GLOBAL_UNIFORMS.concat(SHEET_UNIFORMS).forEach(function (n) { self._u[n] = gl.getUniformLocation(prog, n); });

    this._vbo = gl.createBuffer();
    this._ibo = gl.createBuffer();
    this._meshKey = '';

    gl.useProgram(prog);
    var c = ['taupe', 'brownGrey', 'ivory', 'beige'].map(function (k) { return hexToRgb(PALETTE[k]); });
    // ramp order, darkest → lightest: brown-grey, taupe, beige, ivory
    gl.uniform3fv(this._u.uC0, c[1]); gl.uniform3fv(this._u.uC1, c[0]);
    gl.uniform3fv(this._u.uC2, c[3]); gl.uniform3fv(this._u.uC3, c[2]);

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied "over"
    this._applyBackground();

    if (!this._ctxBound) {
      this._ctxBound = true;
      this._onLost = function (e) { e.preventDefault(); self._lost = true; self._updateRunState(); };
      this._onRestored = function () {
        if (self._destroyed) { return; }
        try { self._initGL(); self._lost = false; self._resize(); self._updateRunState(); } catch (err) { self._fail(err); }
      };
      canvas.addEventListener('webglcontextlost', this._onLost);
      canvas.addEventListener('webglcontextrestored', this._onRestored);
    }
  };

  P._fail = function (err) {
    if (typeof console !== 'undefined') { console.warn('[BrandBackground]', err && err.message ? err.message : err); }
    this.destroy();
    if (typeof this.o.onUnsupported === 'function') { this.o.onUnsupported(err); }
  };

  P._applyBackground = function () {
    var gl = this.gl, bg = this.o.background;
    if (bg && PALETTE[bg]) { var c = hexToRgb(PALETTE[bg]); gl.clearColor(c[0], c[1], c[2], 1); }
    else { gl.clearColor(0, 0, 0, 0); }
  };

  /* Grid mesh shared by every sheet. Only (u,v) is stored — all shape and motion are computed on the GPU. */
  P._buildMesh = function (cols, rows) {
    var key = cols + 'x' + rows;
    if (key === this._meshKey) { return; }
    this._meshKey = key;
    var gl = this.gl, nv = (cols + 1) * (rows + 1);
    var uv = new Float32Array(nv * 2), idx = new Uint16Array(cols * rows * 6), k = 0, n = 0, i, j;
    for (j = 0; j <= rows; j++) for (i = 0; i <= cols; i++) { uv[k++] = i / cols; uv[k++] = j / rows; }
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this._indexCount = idx.length;
  };

  /* ── observers & input ────────────────────────────────────────────── */
  P._observe = function () {
    var self = this, o = this.o, w = window, d = document;

    this._onResize = function () { self._rect = null; self._resize(); };
    this._onScroll = function () { self._sy = w.pageYOffset || 0; self._rect = null; };
    this._sy = w.pageYOffset || 0;
    w.addEventListener('scroll', this._onScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize); this._ro.observe(this.canvas);
    }
    w.addEventListener('resize', this._onResize);

    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(function (e) {
        self._inView = e[e.length - 1].isIntersecting; self._updateRunState();
      });
      this._io.observe(this.canvas);
    }
    this._onVis = function () { self._updateRunState(); };
    d.addEventListener('visibilitychange', this._onVis);

    this._mq = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this._onMq = function () { self._updateRunState(); };
    if (this._mq) { (this._mq.addEventListener ? this._mq.addEventListener('change', this._onMq) : this._mq.addListener(this._onMq)); }

    {
      this._onMove = function (e) {
        if (!self.o.pointer) { return; }
        var r = self._rect || (self._rect = self.canvas.getBoundingClientRect());
        if (!r.width || !r.height) { return; }
        self._pt.tx = CLAMP((e.clientX - r.left) / r.width * 2 - 1, -1.2, 1.2);
        self._pt.ty = CLAMP(-((e.clientY - r.top) / r.height * 2 - 1), -1.2, 1.2);
        self._pt.ta = 1;
      };
      this._onLeave = function () { self._pt.ta = 0; };
      w.addEventListener('pointermove', this._onMove, { passive: true });
      w.addEventListener('pointerdown', this._onMove, { passive: true });
      w.addEventListener('pointerup', this._onLeave, { passive: true });
      w.addEventListener('pointercancel', this._onLeave, { passive: true });
      d.addEventListener('mouseleave', this._onLeave);
      w.addEventListener('blur', this._onLeave);
    }
  };

  P._reduced = function () {
    return !!(this.o.respectReducedMotion && this._mq && this._mq.matches);
  };

  /* ── sizing & layout ──────────────────────────────────────────────── */
  P._resize = function () {
    if (this._destroyed || !this.gl || this._lost) { return; }
    var c = this.canvas, o = this.o, gl = this.gl;
    var cw = Math.max(1, c.clientWidth), ch = Math.max(1, c.clientHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, o.maxPixelRatio) * this._q;
    var px = cw * ch * dpr * dpr;
    if (px > o.maxPixels) { dpr *= Math.sqrt(o.maxPixels / px); }
    dpr = Math.max(0.5, dpr);
    var w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    gl.viewport(0, 0, w, h);

    this._cssW = cw; this._cssH = ch; this._px = w / cw; this._aspect = w / h;
    this._buildSheets();
    this._dirty = true;
    if (!this._raf) { this._frame(this._t, 0); }          // paused / reduced-motion: keep the still frame correct
  };

  P._buildSheets = function () {
    var o = this.o, aspect = this._aspect, ids = SHEET_SETS[CLAMP(Math.round(o.layers), 1, 3)];
    var dens = 19 * CLAMP(o.detail, 0.4, 1.6) * (this._q < 1 ? 0.8 : 1);
    var cellScale = CLAMP(Math.sqrt(this._cssW * this._cssH) / 1050, 0.78, 1.15);
    this._cellScale = cellScale;
    this._sheets = ids.map(function (id, i) {
      var S = SHEETS[id], visH = 2 * (CAM_D - S.z) / CAM_D, planeH = visH * OVERSCAN;
      return { cfg: S, index: i, visH: visH, plane: [planeH * aspect, planeH],
               cellW: o.cell * cellScale * S.cellMul * visH / this._cssH };
    }, this);
    var big = this._sheets[0];
    var cols = CLAMP(Math.ceil(big.plane[0] * dens / 8) * 8, 32, 240);   // multiples of 8: rebuilt only on real changes
    var rows = CLAMP(Math.ceil(big.plane[1] * dens / 8) * 8, 24, 160);
    this._buildMesh(cols, rows);
  };

  /* ── run-state ────────────────────────────────────────────────────── */
  P._updateRunState = function () {
    var run = !this._destroyed && !this._paused && !this._lost && this._inView && !document.hidden && !this._reduced();
    if (run && !this._raf) {
      this._prev = 0;
      this._raf = requestAnimationFrame(this._boundLoop);
    } else if (!run && this._raf) {
      cancelAnimationFrame(this._raf); this._raf = 0;
    }
    if (!run && !this._destroyed && this.gl && !this._lost && !document.hidden) {
      if (this._reduced()) { this._t = this.o.startTime; this._age = 1e3; }
      this._frame(this._t, 0);
    }
  };

  P._loop = function (now) {
    if (this._destroyed) { return; }
    this._raf = requestAnimationFrame(this._boundLoop);
    var raw = this._prev ? now - this._prev : 16.7;
    if (this._prev && raw < 1000 / this.o.maxFps - 1.5) { return; }   // frame-rate cap
    this._prev = now;
    var dt = Math.min(raw, 100) / 1000;
    this._t += dt * this.o.speed;
    this._age += dt;
    if (this.o.adaptiveQuality) { this._govern(raw); }
    this._frame(this._t, dt);
  };

  /* Quality governor: if frames are consistently slow, step the resolution down (and keep it only if it helped). */
  P._govern = function (ms) {
    var g = this._gov;
    if (g.locked || ms > 250) { return; }
    if (g.hold > 0) { g.hold--; return; }
    g.n++; g.sum += ms;
    if (g.n < 60) { return; }
    var avg = g.sum / g.n; g.n = 0; g.sum = 0;
    if (g.base) {                                        // judging the previous step
      if (avg > g.base * 0.9) { this._q = g.last; g.locked = true; this._resize(); return; }
      g.base = 0;
    }
    if (avg > 26 && this._q > 0.55) {
      g.last = this._q; g.base = avg; g.hold = 90;
      this._q = Math.max(0.55, this._q * 0.8);
      this._resize();
    }
  };

  /* ── drawing ──────────────────────────────────────────────────────── */
  P._frame = function (t, dt) {
    if (this._destroyed || !this.gl || this._lost || !this._aspect) { return; }
    var gl = this.gl, o = this.o, u = this._u, pt = this._pt, aspect = this._aspect;

    // smooth pointer / lamp
    var k = 1 - Math.exp(-dt * 2.6), ka = 1 - Math.exp(-dt * 1.4);
    if (!o.pointer) { pt.ta = 0; }
    pt.x += (pt.tx - pt.x) * k; pt.y += (pt.ty - pt.y) * k; pt.a += (pt.ta - pt.a) * ka;
    if (!dt) { pt.x = pt.tx; pt.y = pt.ty; }

    // camera: slow sway + pointer & scroll parallax
    var par = o.pointer ? o.pointerStrength : 0;
    var vh = Math.max(window.innerHeight || 1, 1);
    var sp = o.scrollParallax ? Math.tanh((this._sy / vh) * 0.6) * o.scrollParallax : 0;
    var ex = Math.sin(t * 0.071) * 0.05 + pt.x * 0.17 * par;
    var ey = Math.cos(t * 0.053) * 0.035 + pt.y * 0.11 * par - sp * 0.5;
    var eye = [ex, ey, CAM_D];
    lookAt(this._view, eye, [ex * 0.3, ey * 0.3, -0.2], [0, 1, 0]);
    perspective(this._proj, FOV, aspect, 0.1, 40);
    mul4(this._viewProj, this._proj, this._view);

    // fade-in
    var fade = o.fadeIn > 0 ? Math.min(1, this._age / o.fadeIn) : 1;
    fade = 1 - Math.pow(1 - fade, 3);

    this._applyBackground();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this._prog);
    gl.uniformMatrix4fv(u.uViewProj, false, this._viewProj);
    gl.uniform3f(u.uEye, eye[0], eye[1], eye[2]);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uPx, this._px);
    gl.uniform1f(u.uTime, t); gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uLineW, o.lineWidth);
    gl.uniform1f(u.uLineA, o.lineOpacity);
    gl.uniform1f(u.uAccent, CLAMP(o.lineAccent, 0, 1));
    gl.uniform1f(u.uFillA, o.surfaceOpacity);
    gl.uniform1f(u.uQuilt, o.quilting);
    gl.uniform1f(u.uClear, CLAMP(o.clearing, 0, 1));

    // roaming lamp: drifts on its own, hands over to the pointer while it is active
    var ax = Math.sin(t * 0.11) * 0.75, ay = Math.cos(t * 0.083 + 1.0) * 0.55;
    var lx = ax + (pt.x - ax) * pt.a, ly = ay + (pt.y - ay) * pt.a;
    var lamp = (0.3 + 0.7 * pt.a) * (par ? par : 0.6) * o.nodeGlow;
    gl.uniform3f(u.uLamp, lx, ly, lamp);

    var rot = this._rot, sheets = this._sheets;
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i], S = s.cfg;
      rotation(rot,
        S.rot[0] + Math.sin(t * 0.043 + i * 1.9) * 0.035,
        S.rot[1] + Math.cos(t * 0.037 + i * 2.7) * 0.035,
        S.rot[2] + Math.sin(t * 0.031 + i * 1.1) * 0.040);
      gl.uniformMatrix3fv(u.uRot, false, rot);
      gl.uniform3f(u.uOrigin, Math.sin(t * 0.037 + i * 2.1) * 0.05, Math.cos(t * 0.029 + i * 1.3) * 0.04, S.z);
      gl.uniform2f(u.uPlane, s.plane[0], s.plane[1]);
      var seed = o.seed * 1.37 + S.seed * 3.11;
      gl.uniform1f(u.uSeed, seed); gl.uniform1f(u.uSeedF, seed);
      gl.uniform1f(u.uRelief, o.relief * S.relief);
      gl.uniform1f(u.uWarp, o.warp);
      gl.uniform4fv(u.uLobeA, S.lobeA); gl.uniform4fv(u.uLobeB, S.lobeB);
      var cw = s.cellW;
      gl.uniform2f(u.uCell, cw, cw * o.cellRatio);
      var la = o.latticeAngle + S.lat;
      gl.uniform2f(u.uCS, Math.cos(la), Math.sin(la));
      gl.uniform1f(u.uCellPx, o.cell * this._cellScale * S.cellMul * this._px * 0.6);
      gl.uniform1f(u.uAlpha, S.alpha * o.opacity * fade);
      gl.uniform1f(u.uTone, S.tone);
      gl.uniform1f(u.uLineW, o.lineWidth * S.lineMul);
      gl.uniform1f(u.uNodeR, 1.9 * o.nodeSize * S.nodeMul * this._cellScale);
      gl.uniform1f(u.uNodeGlow, o.nodeGlow);
      gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_SHORT, 0);
    }
  };

  /* ── public API ───────────────────────────────────────────────────── */
  P.setOptions = function (opts) {
    Object.assign(this.o, opts || {});
    if (this.canvas && this._mode !== 'canvas' && opts && 'zIndex' in opts) { this.canvas.style.zIndex = String(this.o.zIndex); }
    if (this.gl && !this._destroyed) { this._resize(); }
    return this;
  };
  P.pause = function () { this._paused = true; this._updateRunState(); return this; };
  P.play = function () { this._paused = false; this._updateRunState(); return this; };
  P.render = function (seconds) {                      // draw one still frame at an explicit time
    if (typeof seconds === 'number') { this._t = seconds; }
    this._age = 1e3;
    if (this.gl && !this._lost) { this._frame(this._t, 0); }
    return this;
  };
  P.resize = function () { this._resize(); return this; };

  P.destroy = function () {
    if (this._destroyed) { return; }
    this._destroyed = true;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    var w = window, d = document;
    if (this._ro) { this._ro.disconnect(); }
    if (this._io) { this._io.disconnect(); }
    if (this._onResize) { w.removeEventListener('resize', this._onResize); }
    if (this._onScroll) { w.removeEventListener('scroll', this._onScroll); }
    if (this._onVis) { d.removeEventListener('visibilitychange', this._onVis); }
    if (this._mq && this._onMq) { (this._mq.removeEventListener ? this._mq.removeEventListener('change', this._onMq) : this._mq.removeListener(this._onMq)); }
    if (this._onMove) {
      w.removeEventListener('pointermove', this._onMove); w.removeEventListener('pointerdown', this._onMove);
      w.removeEventListener('pointerup', this._onLeave); w.removeEventListener('pointercancel', this._onLeave);
      d.removeEventListener('mouseleave', this._onLeave); w.removeEventListener('blur', this._onLeave);
    }
    var gl = this.gl, canvas = this.canvas;
    if (canvas && this._ctxBound) {
      canvas.removeEventListener('webglcontextlost', this._onLost);
      canvas.removeEventListener('webglcontextrestored', this._onRestored);
    }
    if (gl && !gl.isContextLost()) {                    // release every GPU resource
      gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      if (this._vbo) { gl.deleteBuffer(this._vbo); }
      if (this._ibo) { gl.deleteBuffer(this._ibo); }
      if (this._prog) { gl.deleteProgram(this._prog); }
      if (this._vs) { gl.deleteShader(this._vs); }
      if (this._fs) { gl.deleteShader(this._fs); }
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) { lose.loseContext(); }
    }
    this.gl = null;
    if (canvas) {
      canvas.width = canvas.height = 1;
      if (this._mode !== 'canvas' && canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
    }
    this._restore.forEach(function (r) { r[0].style[r[1]] = r[2]; });
    this._restore = [];
  };

  BrandBackground.isSupported = function () {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  };
  BrandBackground.version = '1.0.0';
  BrandBackground.PALETTE = PALETTE;
  BrandBackground.DEFAULTS = DEFAULTS;

  return BrandBackground;
}));