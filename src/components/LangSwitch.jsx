import { useI18n } from '../i18n/I18nProvider.jsx';

/** EN / AR switcher. Switching never reloads the page (see I18nProvider). */
export default function LangSwitch({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang ${className}`} role="group" aria-label={t('a11y.language')}>
      <button
        type="button"
        className="lang__btn"
        lang="en"
        dir="ltr"
        aria-pressed={lang === 'en'}
        aria-label="English"
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <span className="lang__sep" aria-hidden="true" />
      <button
        type="button"
        className="lang__btn"
        lang="ar"
        dir="ltr"
        aria-pressed={lang === 'ar'}
        aria-label="العربية"
        onClick={() => setLang('ar')}
      >
        AR
      </button>
    </div>
  );
}
