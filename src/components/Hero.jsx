import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/gsap.js';
import { hasWebGL, prefersReducedMotion } from '../lib/env.js';
import { startHeroParallax } from '../lib/heroParallax.js';
import { scrollToSection } from '../lib/scroll.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { ArrowIcon } from './Icons.jsx';

export default function Hero() {
  const { t } = useI18n();
  const root = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // Entrance choreography: plate curtain, headline line-masks, then the supporting copy.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const nav = document.querySelector('.nav');
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.set(nav, { autoAlpha: 0, yPercent: -30 })
        .fromTo('.hero__plate', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power3.inOut' }, 0.05)
        .fromTo('.hero__media', { scale: 1.16 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0.05)
        .fromTo('[data-hero="line"]', { yPercent: 112 }, { yPercent: 0, duration: 1.25, stagger: 0.14, ease: 'power4.out' }, 0.5)
        .fromTo('[data-hero="fade"]', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 1.0)
        .to(nav, { autoAlpha: 1, yPercent: 0, duration: 1.1 }, 0.9)
        .set(nav, { clearProps: 'transform,opacity,visibility' });
    }, root);
    return () => ctx.revert();
  }, []);

  // WebGL depth parallax on the plate (skipped for reduced motion / no WebGL: the <img> simply stays).
  useEffect(() => {
    if (prefersReducedMotion() || !hasWebGL()) return undefined;
    const stop = startHeroParallax({
      canvas: canvasRef.current,
      img: imgRef.current,
      hero: root.current,
      depthUrl: '/images/hero-depth.webp',
    });
    return () => stop && stop();
  }, []);

  const title = t('hero.title');
  const go = (id) => (e) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <section id="home" ref={root} className="hero" data-nav-theme="light" data-nav-surface="clear" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow" data-hero="fade">
            <span className="hero__eyebrow-rule" aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>
          <h1 id="hero-title" className="hero__title">
            {title.map((line, i) => (
              <span className="hero__line" key={i}>
                <span className="hero__line-in" data-hero="line">
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p className="hero__sub" data-hero="fade">
            {t('hero.sub')}
          </p>
          <div className="hero__cta" data-hero="fade">
            <a className="btn btn--primary" href="#collections" onClick={go('collections')}>
              <span>{t('hero.ctaPrimary')}</span>
              <ArrowIcon />
            </a>
            <a className="textlink" href="#about" onClick={go('about')}>
              <span>{t('hero.ctaSecondary')}</span>
            </a>
          </div>
        </div>

        <figure className="hero__plate">
          <div className="hero__media">
            <img
              ref={imgRef}
              className="hero__img"
              src="/images/hero-960.webp"
              srcSet="/images/hero-640.webp 640w, /images/hero-960.webp 960w, /images/hero-1280.webp 1280w"
              sizes="(min-width: 900px) 48vw, 100vw"
              width="1280"
              height="1600"
              alt={t('hero.imageAlt')}
              fetchPriority="high"
              decoding="async"
            />
            <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
          </div>
          <figcaption className="hero__caption" data-hero="fade">
            {t('hero.caption')}
          </figcaption>
        </figure>
      </div>

      <a className="hero__scroll" href="#scroll-space" data-hero="fade" onClick={go('scroll-space')} aria-label={t('hero.scroll')}>
        <span className="hero__scroll-line" aria-hidden="true" />
        <span>{t('hero.scroll')}</span>
      </a>
    </section>
  );
}
