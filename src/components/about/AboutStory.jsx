import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap.js';
import { hasWebGL, store } from '../../lib/env.js';
import { scrollToY, scrollToSection } from '../../lib/scroll.js';
import { useMedia } from '../../hooks/useMedia.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ASSETS } from '../../config/site.js';
import en from '../../content/en.js';
import { STORY, planStory, makeState, sidesFor, navThemeFor } from './storyConfig.js';
import { buildStoryTimeline, computeRegion } from './storyTimeline.js';
import StaticStory from './StaticStory.jsx';
import Words from './Words.jsx';
import { ArrowIcon } from '../Icons.jsx';

// The English dictionary defines the story's shape; ar.js is verified to have identical line counts.
const LINE_COUNTS = en.about.sequences.map((s) => s.lines.length);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** "01 — The room" → number, a drawn hairline (not a font dash), and the title. */
function StoryLabel({ label }) {
  const [num, ...rest] = label.split('—').map((s) => s.trim());
  return (
    <h3 className="story__label">
      <span>{num}</span>
      <span className="story__label-rule" aria-hidden="true" />
      <span>{rest.join(' — ')}</span>
    </h3>
  );
}

/** Decides between the scroll-driven WebGL story and the simple static page. */
export default function AboutStory() {
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const [optIn, setOptIn] = useState(() => store.sessionGet('livora:motion') === 'on');
  const [failed, setFailed] = useState(false);
  const webgl = useMemo(() => hasWebGL(), []);

  const animated = webgl && !failed && (!reduced || optIn);
  if (!animated) {
    const canPlay = webgl && !failed && reduced;
    return (
      <StaticStory
        onPlay={
          canPlay
            ? () => {
                store.sessionSet('livora:motion', 'on');
                setOptIn(true);
              }
            : null
        }
      />
    );
  }
  return <ScrollStory onFail={() => setFailed(true)} />;
}

function ScrollStory({ onFail }) {
  const { t, dict, rtl, lang } = useI18n();
  // Stacked layout (chair above or below the text) for portrait screens and narrow, tall windows. A phone held sideways
  // is narrow but also short (under 560 px): stacking two halves there leaves each ~100 px, so it keeps the
  // side-by-side layout and shows one sentence at a time (`short` below).
  const portrait = useMedia('(max-aspect-ratio: 21/20), (max-width: 759px) and (min-height: 560px)');
  const short = useMedia('(max-height: 559px)');
  const layout = portrait ? 'y' : 'x';
  const mode = portrait || short ? 'single' : 'block';
  const plan = useMemo(() => planStory(LINE_COUNTS, mode), [mode]);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hudRef = useRef(null);
  const stRef = useRef(null);
  const engineRef = useRef(null);
  const state = useRef(null);
  if (!state.current) state.current = makeState();
  const [ready, setReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [timelineReady, setTimelineReady] = useState(false);

  // The story measures Arabic line heights/positions when its GSAP timeline is built.
  // On a first visit the custom font may still be downloading; measuring the fallback font
  // causes the words to overlap until the next ScrollTrigger refresh. Wait for the actual
  // document fonts before creating that timeline.
  useEffect(() => {
    let cancelled = false;
    const fontSet = document.fonts;
    const waitForFonts = fontSet?.ready ? fontSet.ready : Promise.resolve();
    Promise.resolve(waitForFonts).then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sequences = dict.about.sequences;
  const unitVh = STORY.unitVh[layout];

  // ---- timeline + ScrollTrigger (rebuilt when language, layout or mode changes) ----------------------------------
  useLayoutEffect(() => {
    if (!fontsReady) return undefined;
    setTimelineReady(false);
    const section = sectionRef.current;
    const stage = stageRef.current;
    const hud = hudRef.current;
    const chapterBtns = [...hud.querySelectorAll('.story__chapter')];
    const last = plan.seqs.length - 1;
    let activeChapter = -1;

    const applyProgress = (progress) => {
      const time = progress * plan.total;
      let c = 0;
      for (let i = 0; i < plan.seqs.length; i++) if (time >= plan.seqs[i].activeFrom) c = i;
      if (c !== activeChapter) {
        activeChapter = c;
        const theme = STORY.themes[c];
        stage.dataset.chapter = String(c);
        stage.dataset.theme = theme;
        stage.setAttribute('data-nav-theme', navThemeFor(theme));
        chapterBtns.forEach((b, i) => {
          if (i === c) b.setAttribute('aria-current', 'step');
          else b.removeAttribute('aria-current');
        });
      }
      const from = plan.seqs[c].activeFrom;
      const to = c < last ? plan.seqs[c + 1].activeFrom : plan.total;
      const p = clamp01((time - from) / Math.max(0.001, to - from));
      chapterBtns.forEach((b, i) => b.style.setProperty('--fill', i < c ? '1' : i === c ? p.toFixed(3) : '0'));
    };

    const ctx = gsap.context(() => {
      const { tl } = buildStoryTimeline({ stage, state: state.current, plan, layout, mode, rtl });
      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
        onRefresh: (self) => applyProgress(self.progress),
      });
      stRef.current = st;
      // Start exactly at the current scroll position (no visible catch-up after a rebuild).
      tl.progress(st.progress);
      applyProgress(st.progress);
      // Mobile browsers can settle their visual/layout viewport one or two frames after
      // the first paint. Refresh once after that settlement so the first scrub uses
      // correct section boundaries without requiring the visitor to touch the page.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (stRef.current !== st) return;
          ScrollTrigger.refresh();
          st.update();
          tl.progress(st.progress);
          applyProgress(st.progress);
          setTimelineReady(true);
        });
      });
      setTimelineReady(true);
    }, section);

    return () => {
      cancelAnimationFrame(frame);
      ctx.revert();
      stRef.current = null;
    };
    // `dict` changes the text (and therefore line heights) → rebuild.
  }, [plan, layout, mode, rtl, dict, fontsReady]);

  // ---- keep the chair region in sync with the stage size ----------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    const ro = new ResizeObserver(() => {
      computeRegion(stage, state.current, layout);
      engineRef.current && engineRef.current.resize();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [layout]);

  // ---- lazy-load the Three.js chunk + the GLB when the story is within ~2.5 screens ------------------------------
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    let cancelled = false;
    let started = false;
    let engine = null;
    let inView = false;

    const sync = () => {
      if (!engine) return;
      if (inView && !document.hidden) engine.start();
      else engine.stop();
    };

    const boot = async () => {
      if (started) return;
      started = true;
      try {
        const { createStoryScene } = await import('./StoryScene.js');
        if (cancelled) return;
        engine = await createStoryScene({
          canvas: canvasRef.current,
          state: state.current,
          modelUrl: ASSETS.model,
          dracoPath: ASSETS.draco,
          onProgress: (p) => stage.style.setProperty('--load', p.toFixed(3)),
          onContextLost: onFail,
        });
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
        computeRegion(stage, state.current, layout);
        engine.resize();
        setReady(true);
        sync();
      } catch (err) {
        console.error('[livora] 3D story could not start, showing the simple version.', err);
        if (!cancelled) onFail();
      }
    };

    const loadIO = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadIO.disconnect();
          boot();
        }
      },
      { rootMargin: '250% 0px 250% 0px' }
    );
    loadIO.observe(section);

    const viewIO = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: '10% 0px 10% 0px' }
    );
    viewIO.observe(section);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);

    if (new URLSearchParams(location.search).has('debug')) {
      window.__livora = {
        state: state.current,
        plan,
        get engine() {
          return engineRef.current;
        },
        get st() {
          return stRef.current;
        },
        boot,
      };
    }

    return () => {
      cancelled = true;
      loadIO.disconnect();
      viewIO.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (engine) engine.dispose();
      engineRef.current = null;
    };
    // The engine is created once per mount; layout changes are handled by the ResizeObserver + rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- chapter navigation -------------------------------------------------------------------------------------------
  const goChapter = useCallback(
    (i) => {
      const st = stRef.current;
      if (!st) return;
      const time = Math.max(0, plan.seqs[i].start - 0.45);
      scrollToY(st.start + (time / plan.total) * (st.end - st.start));
    },
    [plan]
  );

  const skip = (e) => {
    e.preventDefault();
    scrollToSection('collections');
  };

  const initialTheme = STORY.themes[0];
  return (
    <section
      id="about"
      ref={sectionRef}
      className="story"
      data-layout={layout}
      data-mode={mode}
      style={{ '--story-units': plan.total.toFixed(3), '--story-unit': unitVh }}
      aria-labelledby="about-title"
    >
      <h2 id="about-title" className="visually-hidden">
        {t('about.title')}
      </h2>
      <div
        className="story__stage"
        ref={stageRef}
        data-theme={initialTheme}
        data-chapter="0"
        data-ready={ready}
        data-timeline-ready={timelineReady}
        data-nav-theme={navThemeFor(initialTheme)}
        data-nav-surface="clear"
        aria-busy={!ready}
      >
        <a className="story__skip" href="#collections" onClick={skip}>
          {t('a11y.skipStory')}
        </a>

        <div className="story__bg" aria-hidden="true">
          {STORY.themes.map((theme, i) => (
            <div className="story__bgl" data-theme={theme} key={i} style={i === 0 ? { opacity: 1 } : { opacity: 0 }} />
          ))}
        </div>

        <canvas className="story__canvas" ref={canvasRef} aria-hidden="true" />
        <p className="visually-hidden">{t('about.chairAlt')}</p>

        <div className="story__loader" aria-live="polite" hidden={ready}>
          <span className="story__loader-bar" aria-hidden="true" />
          <span>{t('about.loading')}</span>
        </div>

        {sequences.map((seq, i) => {
          const { text } = sidesFor(i, layout, rtl);
          const isLast = i === sequences.length - 1;
          return (
            <div className="story__seq" key={`${lang}-${i}`} data-seq={i} data-pos={text} data-theme={STORY.themes[i]}>
              <div className="story__panel">
                <div className="story__block">
                  <StoryLabel label={seq.label} />
                  <div className="story__lines">
                    <div className="story__lines-in">
                      {seq.lines.map((line, j) => (
                        <p className="story__line" key={j}>
                          <Words text={line} />
                        </p>
                      ))}
                    </div>
                  </div>
                  {isLast && (
                    <a className="btn btn--primary story__cta" href="#collections" onClick={skip}>
                      <span>{t('about.ctaCollections')}</span>
                      <ArrowIcon />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <nav className="story__hud" ref={hudRef} aria-label={t('about.chapters')}>
          <ol>
            {sequences.map((seq, i) => {
              const title = seq.label.split('—').pop().trim();
              return (
                <li key={i}>
                  <button
                    type="button"
                    className="story__chapter"
                    aria-label={t('about.chapterLabel', { n: i + 1, title })}
                    onClick={() => goChapter(i)}
                  >
                    <span className="story__chapter-bar" aria-hidden="true">
                      <i />
                    </span>
                    <span className="story__chapter-title" aria-hidden="true">
                      {title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </section>
  );
}
