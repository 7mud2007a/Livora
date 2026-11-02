import { useI18n } from '../i18n/I18nProvider.jsx';
import { SITE } from '../config/site.js';
import { scrollToSection } from '../lib/scroll.js';
import Wordmark from './Wordmark.jsx';

const LINKS = [
  { id: 'home', key: 'nav.home' },
  { id: 'about', key: 'nav.about' },
  { id: 'collections', key: 'nav.collections' },
  { id: 'contact', key: 'nav.contact' },
];

export default function Footer() {
  const { t, num } = useI18n();
  const year = num(new Date().getFullYear());
  const go = (id) => (e) => {
    e.preventDefault();
    scrollToSection(id);
  };
  return (
    <footer id="footer" className="footer" data-nav-theme="dark" data-nav-surface="clear">
      <div className="footer__inner">
        <div className="footer__top">
          <Wordmark className="footer__brand" />
          <p className="footer__tagline">{t('footer.tagline')}</p>
        </div>

        <div className="footer__cols">
          <nav aria-labelledby="footer-nav-title">
            <h2 id="footer-nav-title" className="footer__h">
              {t('footer.navigate')}
            </h2>
            <ul>
              {LINKS.map(({ id, key }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={go(id)}>
                    {t(key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="footer__h">{t('footer.follow')}</h2>
            <ul>
              {SITE.social.map((s) => (
                <li key={s.id}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__rights">{t('footer.rights', { year })}</p>
          <button type="button" className="footer__top-btn" onClick={() => scrollToSection('home')}>
            {t('footer.backToTop')}
          </button>
        </div>

        <p className="footer__credit" lang="en" dir="ltr">
          {t('footer.credit')}{' '}
          <a href={SITE.credit.href} target="_blank" rel="noopener noreferrer">
            {SITE.credit.text}
          </a>
        </p>
      </div>
    </footer>
  );
}
