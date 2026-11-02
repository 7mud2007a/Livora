import { scrollToSection } from '../lib/scroll.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/** The LIVORA wordmark. Set as live text so it stays crisp, selectable and translatable by label. */
export default function Wordmark({ className = '', as: Tag = 'a', ...rest }) {
  const { t } = useI18n();
  if (Tag !== 'a') return <span className={`wordmark ${className}`} aria-hidden="true" {...rest}>LIVORA</span>;
  return (
    <a
      className={`wordmark ${className}`}
      href="#home"
      lang="en"
      dir="ltr"
      aria-label={t('nav.homeLabel')}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection('home');
      }}
      {...rest}
    >
      LIVORA
    </a>
  );
}
