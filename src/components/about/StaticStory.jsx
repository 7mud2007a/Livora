import { useI18n } from '../../i18n/I18nProvider.jsx';
import { STORY, navThemeFor } from './storyConfig.js';
import { ArrowIcon } from '../Icons.jsx';
import { scrollToSection } from '../../lib/scroll.js';

// Pre-rendered cut-outs of the supplied chair model (see public/images/story). One per chapter.
const POSES = ['pose-a', 'pose-b', 'pose-c', 'pose-d', 'pose-a'];

/**
 * The About story as a plain, fully readable page. Used when the visitor prefers reduced motion, when WebGL is
 * unavailable, or when the 3D scene fails to start. Same words, same order, no scroll choreography.
 */
export default function StaticStory({ onPlay }) {
  const { t, dict } = useI18n();
  const sequences = dict.about.sequences;
  return (
    <section id="about" className="story story--static" aria-labelledby="about-title">
      <h2 id="about-title" className="visually-hidden">
        {t('about.title')}
      </h2>
      {onPlay && (
        <div className="sstory-note" data-nav-theme="light" data-nav-surface="clear">
          <p>{t('about.motion.note')}</p>
          <button type="button" className="btn" onClick={onPlay}>
            <span>{t('about.motion.play')}</span>
          </button>
        </div>
      )}
      {sequences.map((seq, i) => {
        const theme = STORY.themes[i];
        const isLast = i === sequences.length - 1;
        return (
          <article className="sstory" key={i} data-theme={theme} data-flip={i % 2 === 1} data-nav-theme={navThemeFor(theme)} data-nav-surface="solid">
            <div className="sstory__media">
              <img
                src={`/images/story/${POSES[i]}.webp`}
                alt={i === 0 ? t('about.chairAlt') : ''}
                width="635"
                height="603"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
            <div className="sstory__text">
              <h3 className="sstory__label">{seq.label}</h3>
              <div className="sstory__lines">
                {seq.lines.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
              {isLast && (
                <a
                  className="btn btn--primary"
                  href="#collections"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('collections');
                  }}
                >
                  <span>{t('about.ctaCollections')}</span>
                  <ArrowIcon />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
