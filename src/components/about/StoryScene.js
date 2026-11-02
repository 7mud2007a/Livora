// Three.js engine for the About story. Loaded lazily (dynamic import) so it never delays the hero.
//
// It renders the exact supplied GLB (Draco geometry + WebP textures) onto a transparent canvas laid over the
// story's CSS backgrounds. The scroll timeline writes into the plain `state` object; this loop reads it
// every frame — no React, no re-renders. On top of the scroll-driven pose the chair is never static:
// it floats, swings like a pendulum, sways slowly about its vertical axis and leans into its own motion.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const CAM_FOV = 24;
const CAM_DIST = 6.2;
const CAM_ELEV = 11 * DEG;
const PIVOT = 2.1; // pendulum length (world units above the chair's centre)
// Bounding extents used to fit the chair into its region (measured from the GLB: ~1.0 wide, ~0.81 tall, ~0.9 deep).
const FIT_W = 1.34; // widest projected extent over any yaw (diagonal of the footprint)
const FIT_H = 1.0;

export async function createStoryScene({ canvas, state, modelUrl, dracoPath, onProgress, onContextLost }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const maxDpr = coarse ? 1.5 : 2;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.5, 30);
  camera.position.set(0, Math.sin(CAM_ELEV) * CAM_DIST, Math.cos(CAM_ELEV) * CAM_DIST);
  camera.lookAt(0, 0, 0);

  // ---- lighting: soft studio environment + one warm key (the same sun direction as the hero photograph) -------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.85;
  const key = new THREE.DirectionalLight(0xffe6cc, 1.9);
  key.position.set(-3.4, 4.4, 3.8);
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xf4eadc, 0xb7a48c, 0.35);
  scene.add(fill);

  // ---- rig: root(scale) > pivot(pendulum) > rig(float, pitch) > yaw > facing > model --------------------------
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.position.y = PIVOT;
  const rig = new THREE.Group();
  rig.position.y = -PIVOT;
  const yawGroup = new THREE.Group();
  const facing = new THREE.Group();
  facing.rotation.y = 270 * DEG; // the GLB's front is local +X; this turns it to face the camera (6 o'clock)
  scene.add(root);
  root.add(pivot);
  pivot.add(rig);
  rig.add(yawGroup);
  yawGroup.add(facing);

  // ---- load the exact supplied GLB -----------------------------------------------------------------------------
  const draco = new DRACOLoader();
  draco.setDecoderPath(dracoPath);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      resolve,
      (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      },
      reject
    );
  });
  draco.dispose();

  const model = gltf.scene;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
        if (m[k]) m[k].anisotropy = aniso;
      }
    });
  });
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(center); // centred on the origin
  facing.add(model);
  const halfH = size.y / 2;

  // ---- soft contact shadow (cheap, and it follows the float) ---------------------------------------------------
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(37,34,31,0.62)');
    grad.addColorStop(0.35, 'rgba(37,34,31,0.34)');
    grad.addColorStop(0.7, 'rgba(37,34,31,0.1)');
    grad.addColorStop(1, 'rgba(37,34,31,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -halfH - 0.02;
  shadow.renderOrder = -1;
  root.add(shadow);

  // ---- sizing ---------------------------------------------------------------------------------------------------
  let W = 1;
  let H = 1;
  let fit = 1;
  let lastFitKey = '';
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(2, Math.round(r.width));
    H = Math.max(2, Math.round(r.height));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    lastFitKey = '';
  }
  function updateFit() {
    const key = `${W}x${H}:${state.fitW}x${state.fitH}`;
    if (key === lastFitKey) return;
    lastFitKey = key;
    // World size of the viewport at the chair's distance.
    const visH = 2 * CAM_DIST * Math.tan((CAM_FOV * DEG) / 2);
    const visW = visH * camera.aspect;
    const regionW = (visW * (state.fitW || W / 2)) / W;
    const regionH = (visH * (state.fitH || H * 0.8)) / H;
    fit = Math.min((0.88 * regionW) / FIT_W, (0.84 * regionH) / FIT_H);
  }
  resize();

  // ---- pointer micro-interaction: the chair tilts a few degrees toward the cursor (fine pointers only) -------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!coarse) window.addEventListener('pointermove', onPointer, { passive: true });

  // ---- render loop ----------------------------------------------------------------------------------------------
  let running = false;
  let raf = 0;
  let last = 0;
  let prevAx = state.ax;
  let prevAy = state.ay;
  let swing = 0;
  let swingV = 0;
  let slowFrames = 0;
  let frames = 0;
  const clock = { t: 0 };
  const screen = new THREE.Vector3();

  function frame(nowMs) {
    raf = 0;
    if (!running) return;
    const now = nowMs / 1000;
    const dt = Math.min(0.05, last ? now - last : 1 / 60);
    last = now;
    clock.t += dt;
    const t = clock.t;

    // Adaptive quality: if the device cannot hold ~30fps, drop the pixel ratio once.
    frames++;
    if (dt > 0.034) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45 && pixelRatio > 1) {
        pixelRatio = 1;
        resize();
      }
      frames = 0;
      slowFrames = 0;
    }

    updateFit();

    // Pointer smoothing.
    const pk = 1 - Math.pow(0.0015, dt);
    pointer.sx += (pointer.x - pointer.sx) * pk;
    pointer.sy += (pointer.y - pointer.sy) * pk;

    // Lean into the direction of travel: a damped spring driven by the anchor's velocity.
    const vx = (state.ax - prevAx) / dt;
    const vy = (state.ay - prevAy) / dt;
    prevAx = state.ax;
    prevAy = state.ay;
    const drive = state.layout === 'y' ? vy : vx;
    const target = THREE.MathUtils.clamp(-drive * 2.6, -9, 9);
    swingV += (target - swing) * 38 * dt;
    swingV *= Math.pow(0.02, dt);
    swing += swingV * dt;

    // Idle motion: float, pendulum, slow sway (never static).
    const floatY = Math.sin(t * 0.9) * 0.028 + Math.sin(t * 0.37 + 1.1) * 0.014;
    const pend = Math.sin(t * 0.62) * 2.3 + Math.sin(t * 0.23 + 1.3) * 0.9; // degrees
    const sway = Math.sin(t * 0.34) * 5.2 + Math.sin(t * 0.13 + 0.7) * 2.8; // degrees of yaw

    // Anchor → lens shift so the chair appears at (ax, ay) in NDC without changing perspective.
    const bump = state.bump || 0;
    let ax = state.ax;
    let ay = state.ay;
    if (state.layout === 'y') ax += bump * 0.045;
    else ay += bump * 0.08;
    camera.setViewOffset(W, H, (-ax * W) / 2, (ay * H) / 2, W, H);

    const s = fit * (state.scale || 1) * (1 + (state.layout === 'y' ? 0.025 : 0.06) * bump);
    root.scale.setScalar(s);
    // Horizontal travel (desktop): the chair trails behind its own motion like a pendulum, a sideways swing.
    // Vertical travel (phone): a sideways swing would push the chair out of the narrow screen, so it rocks
    // toward / away from the camera instead, which barely changes where it sits horizontally.
    const vertical = state.layout === 'y';
    pivot.rotation.z = (pend + (state.roll || 0) + (vertical ? 0 : swing)) * DEG;
    pivot.rotation.x = vertical ? swing * 0.8 * DEG : 0;
    rig.position.y = -PIVOT + floatY;
    rig.rotation.x = ((state.pitch || 0) + pointer.sy * 2.2) * DEG;
    yawGroup.rotation.y = ((state.yaw || 0) + sway + pointer.sx * 4) * DEG;

    // Shadow: widest when the chair is lowest.
    const lift = floatY + 0.05;
    shadow.scale.set(1.62 - lift * 1.2, 1.2 - lift * 0.9, 1);
    shadow.position.x = Math.sin(pend * DEG) * PIVOT * 0.55;
    shadow.material.opacity = (state.shadow ?? 1) * (0.9 - lift * 1.2) * Math.min(1, Math.max(0, (1.5 - Math.abs(state.ax)) / 0.9 + 0.35));

    renderer.toneMappingExposure = state.exposure || 1;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const lost = (e) => {
    e.preventDefault();
    stop();
    onContextLost && onContextLost();
  };
  canvas.addEventListener('webglcontextlost', lost);

  /**
   * Projected bounds of the chair in CSS pixels, relative to the canvas (used by tests and the debug hook).
   * `precise` projects the real vertices (every 6th) instead of the 3D bounding box corners.
   */
  function getScreenRect(precise = false) {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (v) => {
      screen.copy(v).project(camera);
      const x = ((screen.x + 1) / 2) * W;
      const y = ((1 - screen.y) / 2) * H;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    if (precise) {
      const v = new THREE.Vector3();
      model.traverse((o) => {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 6) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          add(v);
        }
      });
    } else {
      const b = new THREE.Box3().setFromObject(facing);
      const v = new THREE.Vector3();
      for (let i = 0; i < 8; i++) add(v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    }
    return { left: minX, right: maxX, top: minY, bottom: maxY, width: maxX - minX, height: maxY - minY };
  }

  function dispose() {
    stop();
    window.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('webglcontextlost', lost);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose();
        m.dispose();
      });
    });
    shadow.geometry.dispose();
    shadow.material.dispose();
    shadowTex.dispose();
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
    // Release the GPU context right away, unless it is already gone (then there is nothing to release).
    try {
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    } catch {
      /* ignore */
    }
  }

  return {
    start,
    stop,
    resize,
    dispose,
    getScreenRect,
    get running() {
      return running;
    },
  };
}
