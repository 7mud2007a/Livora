import { useEffect, useRef } from 'react';
import { ScrollTrigger } from '../lib/gsap.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * RESERVED SCROLL AREA — a deliberately independent section between the hero and the About story.
 *
 *   • Height:   set --reserved-height in styles/reserved.css (default 300vh). Nothing else depends on it.
 *   • Stage:    .reserved__stage is sticky and exactly one viewport tall, so a custom scroll experience can
 *               pin its own content inside it without touching the hero or the story.
 *   • Progress: while the area is scrolled, `--reserved-progress` (0..1) is set on this <section>, and a
 *               `livora:reserved-progress` event is dispatched on window with { progress, element }.
 *
 * To add your own experience: render it inside .reserved__stage and delete the placeholder label.
 * The stage is aria-hidden only because it holds nothing but a placeholder; remove that when you add content.
 */
export default function ReservedScroll() {
  const { t } = useI18n();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate(self) {
        const p = self.progress;
        el.style.setProperty('--reserved-progress', p.toFixed(4));
        window.dispatchEvent(new CustomEvent('livora:reserved-progress', { detail: { progress: p, element: el } }));
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section id="scroll-space" ref={ref} className="reserved" data-nav-theme="light" data-nav-surface="clear">
      <div className="reserved__stage" data-reserved-stage aria-hidden="true">
        <div className="reserved__rules">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        {/* Placeholder label: remove when the custom scroll experience is added. */}
        <p className="reserved__label">
          <span className="reserved__label-line" />
          <span>{t('reserved.label')}</span>
        </p>
      </div>
    </section>
  );
}
