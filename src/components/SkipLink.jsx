import { useI18n } from '../i18n/I18nProvider.jsx';

export default function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#main">
      {t('a11y.skipToContent')}
    </a>
  );
}
