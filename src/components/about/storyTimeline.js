// Builds the About story's GSAP timeline. It never touches React state: it animates DOM elements and the plain
// `state` object that the Three.js render loop reads every frame.
import { gsap } from '../../lib/gsap.js';
import { STORY, clockToYaw, sidesFor } from './storyConfig.js';

const seg = (target, from, to, at, duration, ease = 'none', extra = {}) => ({ target, from, to, at, duration, ease, extra });

/**
 * @returns {{ tl: gsap.core.Timeline, plan, chairSides: string[], maxShifts: number[] }}
 */
/** Chair region sizes (px) the render loop fits the model into. Cheap; also called on resize. */
export function computeRegion(stage, state, layout) {
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  state.layout = layout;
  state.fitW = layout === 'x' ? W / 2 : W;
  state.fitH = layout === 'x' ? H * 0.8 : H * 0.5 - navH;
  state.stageW = W;
  state.stageH = H;
}

export function buildStoryTimeline({ stage, state, plan, layout, mode, rtl }) {
  const S = STORY;
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const rootStyle = getComputedStyle(document.documentElement);
  const navH = parseFloat(rootStyle.getPropertyValue('--nav-h')) || 72;
  const hudH = 64;
  const mirror = rtl && S.mirrorInRtl;

  const seqEls = [...stage.querySelectorAll('.story__seq')];
  const bgLayers = [...stage.querySelectorAll('.story__bgl')];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

  // ---- where the chair sits for each chapter (NDC anchors) ----------------------------------------------------
  const chairPos = (i) => {
    const { chair: side } = sidesFor(i, layout, rtl);
    if (layout === 'x') return { ax: side === 'left' ? -0.5 : 0.5, ay: -0.02, side };
    const topC = navH + (H * 0.5 - navH) / 2;
    const botC = H * 0.5 + (H * 0.5 - hudH) / 2;
    const cy = side === 'top' ? topC : botC;
    return { ax: 0, ay: 1 - (2 * cy) / H, side };
  };
  const yawFor = (i) => {
    const y = clockToYaw(S.clock[i]);
    return layout === 'x' && mirror ? -y : y;
  };
  const anchors = plan.seqs.map((s) => chairPos(s.index));
  const chairSides = anchors.map((a) => a.side);

  // Region the chair is fitted into (px), read by the render loop.
  computeRegion(stage, state, layout);

  const segs = [];
  const set = (target, vars) => tl.set(target, vars, 0);

  // ---- chair --------------------------------------------------------------------------------------------------
  const first = anchors[0];
  // The chair slides in from the left edge (from the right edge in RTL), whichever layout is in use.
  const startAx = mirror ? 1.7 : -1.7;
  set(state, {
    ax: startAx,
    ay: first.ay,
    yaw: yawFor(0) - (mirror ? -22 : 22),
    pitch: 0,
    roll: mirror ? -5 : 5,
    scale: 1,
    bump: 0,
    shadow: S.shadow[0],
    exposure: 1,
  });
  segs.push(seg(state, { ax: startAx, yaw: yawFor(0) - (mirror ? -22 : 22), roll: mirror ? -5 : 5 }, { ax: first.ax, yaw: yawFor(0), roll: 0 }, 0, S.enter, 'power2.out'));

  plan.seqs.forEach((s, i) => {
    if (i >= plan.seqs.length - 1) return;
    const a = anchors[i];
    const b = anchors[i + 1];
    const dur = S.cross;
    segs.push(
      seg(state, { ax: a.ax, ay: a.ay, yaw: yawFor(i) }, { ax: b.ax, ay: b.ay, yaw: yawFor(i + 1) }, s.crossStart, dur, 'power2.inOut'),
      seg(state, { bump: 0 }, { bump: 1 }, s.crossStart, dur / 2, 'sine.out'),
      seg(state, { bump: 1 }, { bump: 0 }, s.crossStart + dur / 2, dur / 2, 'sine.in'),
      seg(state, { shadow: S.shadow[i] }, { shadow: S.shadow[i + 1] }, s.crossStart, dur, 'sine.inOut'),
      // Chapter background cross-fade, finished before the text arrives.
      seg(bgLayers[i + 1], { opacity: 0 }, { opacity: 1 }, s.crossStart + dur * 0.12, dur * 0.62, 'sine.inOut')
    );
  });

  // ---- text ---------------------------------------------------------------------------------------------------
  const maxShifts = [];
  seqEls.forEach((el, i) => {
    const s = plan.seqs[i];
    const last = i === plan.seqs.length - 1;
    const label = el.querySelector('.story__label');
    const linesBox = el.querySelector('.story__lines');
    const linesIn = el.querySelector('.story__lines-in');
    const lines = [...el.querySelectorAll('.story__line')];
    const cta = el.querySelector('.story__cta');
    const n = lines.length;

    // Label
    set(label, { opacity: 0, y: 14 });
    segs.push(seg(label, { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, s.start - 0.05, 0.5, 'power2.out'));
    if (!last) segs.push(seg(label, { opacity: 1 }, { opacity: 0 }, s.end - 0.5, 0.45, 'power1.in'));

    // Lines
    set(lines, { opacity: 1, y: 0 });
    lines.forEach((line, j) => {
      const words = line.querySelectorAll('.w');
      const t0 = s.lineStarts[j];
      const stagger = words.length > 1 ? Math.min(0.28, (mode === 'block' ? S.reveal : 0.34) * 0.5) / (words.length - 1) : 0;
      // Words start hidden; the reveal is a staggered tween. (A stagger only applies the "from" state to its first
      // element when rendering immediately, so the hidden start is set explicitly for every word.)
      tl.set(words, { opacity: 0, yPercent: 45 }, 0);
      tl.fromTo(
        words,
        { opacity: 0, yPercent: 45 },
        { opacity: 1, yPercent: 0, duration: mode === 'block' ? S.reveal * 0.7 : 0.26, stagger, ease: 'power2.out', immediateRender: false },
        t0
      );

      if (mode === 'block') {
        if (j < n - 1) segs.push(seg(line, { opacity: 1 }, { opacity: 0.66 }, s.lineStarts[j + 1], 0.5, 'sine.out'));
        if (j < n - 1) segs.push(seg(line, { opacity: 0.66 }, { opacity: 1 }, s.revealEnd, 0.45, 'sine.inOut'));
        if (!last) segs.push(seg(line, { opacity: 1, y: 0 }, { opacity: 0, y: -18 }, s.holdEnd + j * 0.045, 0.5, 'power1.in'));
      } else if (!last || j < n - 1) {
        segs.push(seg(line, { opacity: 1, y: 0 }, { opacity: 0, y: -14 }, t0 + 0.46, 0.26, 'power1.in'));
      }
    });

    // Vertical placement ('block' mode only).
    //  • Paragraph fits: it stays centred as it grows — the block starts offset so the first line sits at the centre,
    //    and drifts up as lines arrive, ending exactly in its natural centred position.
    //  • Paragraph taller than its box (small windows, long Arabic lines): it becomes a rolling window instead.
    let maxShift = 0;
    if (mode === 'block') {
      const block = el.querySelector('.story__block');
      const avail = linesBox.clientHeight;
      maxShift = Math.max(0, linesIn.scrollHeight - avail);
      if (maxShift > 1) {
        let prev = 0;
        lines.forEach((line, j) => {
          const bottom = line.offsetTop + line.offsetHeight;
          const target = Math.min(maxShift, Math.max(0, bottom - avail + 16));
          if (target > prev) segs.push(seg(linesIn, { y: -prev }, { y: -target }, s.lineStarts[j], S.reveal, 'power2.out'));
          prev = Math.max(prev, target);
        });
      } else {
        const blockH = block.offsetHeight;
        const top = linesBox.offsetTop;
        const shifts = lines.map((line) => Math.round((blockH - (top + line.offsetTop + line.offsetHeight)) / 2));
        set(block, { y: shifts[0] });
        lines.forEach((line, j) => {
          if (j === 0) return;
          if (shifts[j] !== shifts[j - 1]) segs.push(seg(block, { y: shifts[j - 1] }, { y: shifts[j] }, s.lineStarts[j], S.reveal, 'power2.out'));
        });
        // Last step settles at the natural position.
        segs.push(seg(block, { y: shifts[n - 1] }, { y: 0 }, s.lineStarts[n - 1] + S.reveal, 0.3, 'sine.out'));
      }
    }
    maxShifts.push(maxShift);
    linesBox.dataset.rolling = maxShift > 1 ? 'true' : 'false';
    set(linesIn, { y: 0 });

    // Call to action (final chapter only)
    if (cta) {
      set(cta, { autoAlpha: 0, y: 16 });
      segs.push(seg(cta, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }, s.holdEnd, 0.55, 'power2.out'));
    }
  });

  // Commit the segments. `fromTo` with explicit `from` values keeps every tween independent of the order in which
  // the timeline is scrubbed (the playhead can jump anywhere).
  segs.forEach(({ target, from, to, at, duration, ease, extra }) => {
    tl.fromTo(target, from, { ...to, duration, ease, immediateRender: false, ...extra }, at);
  });

  // Make sure the timeline is exactly `plan.total` long even if the last tween ends earlier.
  tl.set({}, {}, plan.total);

  return { tl, chairSides, maxShifts };
}
