// All the tunable numbers of the About story live here.
// Time is measured in "units". One unit of the timeline = `unitVh` percent of the viewport height of scrolling.

export const STORY = {
  /** Scroll length of one unit, in vh. Raise it for a slower, longer story. */
  unitVh: { x: 34, y: 30 },

  /** Chair slides in from the edge before the first text. */
  enter: 1.3,
  /** Units between successive line reveals ('block' = whole paragraph builds up, 'single' = one line at a time). */
  lineStep: { block: 0.62, single: 0.72 },
  /** Duration of one line reveal in 'block' mode. */
  reveal: 0.55,
  /** The finished paragraph rests fully visible for this long before it leaves ('block' mode). */
  hold: 0.9,
  /** Duration of the paragraph leaving ('block' mode). */
  leave: 0.7,
  /** The chair's trip from one side to the other. */
  cross: 2.0,
  /** The next text starts when the chair is this far (0..1) through the trip — it has already left the text's half. */
  textLead: 0.8,
  /** The chair starts moving this long before the previous text has fully gone. */
  crossOverlap: 0.12,
  /** The final call to action rests this long before the story releases the page. */
  tail: 1.3,

  /** Which half the text sits in for each chapter (left-to-right layout). The chair takes the other half. */
  textSide: ['right', 'left', 'right', 'left', 'right'],
  /**
   * Chair orientation per chapter as a position on a clock face seen from above, the viewer being at 6 o'clock.
   * 6 = facing the viewer; 5 = turned toward screen-right; 7 = toward screen-left.
   */
  clock: [5, 7, 4.5, 7.5, 5],
  /** Mirror sides (and chair turns) when the page is right-to-left. */
  mirrorInRtl: true,

  /** Chapter backgrounds, in order. These are the official palette colours (see styles/tokens.css). */
  themes: ['cream', 'ivory', 'stone', 'walnut', 'ivory'],
  /** Soft contact-shadow strength per chapter (it reads weakly on the dark walnut chapter). */
  shadow: [1, 1, 1, 0.7, 1],
};

export const clockToYaw = (clock) => (6 - clock) * 30;

/**
 * Pure timeline plan: where every beat starts and ends, in units. Used both for the section's scroll length
 * (before the DOM exists) and for building the GSAP timeline, so they can never disagree.
 */
export function planStory(lineCounts, mode) {
  const S = STORY;
  const step = S.lineStep[mode];
  const seqs = [];
  let start = S.enter * 0.72;
  let total = 0;
  lineCounts.forEach((n, i) => {
    const last = i === lineCounts.length - 1;
    const lineStarts = Array.from({ length: n }, (_, j) => start + j * step);
    let revealEnd;
    let holdEnd;
    let end;
    if (mode === 'block') {
      revealEnd = start + (n - 1) * step + S.reveal;
      holdEnd = revealEnd + S.hold;
      end = last ? holdEnd : holdEnd + S.leave;
    } else {
      revealEnd = start + (n - 1) * step + 0.34;
      holdEnd = revealEnd + 0.38;
      end = last ? holdEnd : start + n * step;
    }
    const crossStart = last ? null : end - S.crossOverlap;
    const crossEnd = last ? null : crossStart + S.cross;
    seqs.push({ index: i, start, lineStarts, revealEnd, holdEnd, end, crossStart, crossEnd, lines: n });
    if (!last) start = crossStart + S.cross * S.textLead;
    else total = holdEnd + 0.55 + S.tail; // CTA reveal + rest
  });
  // A chapter becomes "active" (HUD + nav theme) when the previous trip is about half way.
  seqs.forEach((s, i) => {
    s.activeFrom = i === 0 ? 0 : seqs[i - 1].crossStart + S.cross * 0.45;
  });
  return { seqs, total, step, mode };
}

/** Fresh render-loop state. The timeline writes it, the Three.js loop reads it. */
export const makeState = () => ({
  ax: -1.7, // chair anchor in NDC (-1 = left edge, 1 = right edge)
  ay: 0, // chair anchor in NDC (-1 = bottom, 1 = top)
  yaw: 30, // degrees
  pitch: 0,
  roll: 0,
  scale: 1,
  bump: 0, // 0..1 arc/scale swell while crossing
  shadow: 1,
  exposure: 1,
  layout: 'x',
  fitW: 0, // chair region in px
  fitH: 0,
  stageW: 0,
  stageH: 0,
});

/** Where the text and the chair sit for chapter `i`. 'x' = side by side, 'y' = stacked (portrait). */
export function sidesFor(i, layout, rtl) {
  const mirror = rtl && STORY.mirrorInRtl;
  const textRight = STORY.textSide[i] === 'right';
  if (layout === 'x') {
    const text = textRight !== mirror ? 'right' : 'left';
    return { text, chair: text === 'right' ? 'left' : 'right' };
  }
  const text = textRight ? 'bottom' : 'top';
  return { text, chair: text === 'bottom' ? 'top' : 'bottom' };
}

/** Palette theme -> nav colour mode. */
export const navThemeFor = (theme) => (theme === 'walnut' ? 'dark' : 'light');
