import { useI18n } from '../i18n/I18nProvider.jsx';
import { SITE } from '../config/site.js';
import Reveal from './Reveal.jsx';
import ContactForm from './ContactForm.jsx';

export default function Contact() {
  const { t, lang } = useI18n();
  const { email, phone, address } = SITE.contact;
  return (
    <section id="contact" className="contact" data-nav-theme="light" data-nav-surface="solid" aria-labelledby="contact-title">
      <div className="contact__inner">
        <div className="contact__info">
          <Reveal as="p" className="eyebrow">
            <span className="eyebrow__idx">{t('contact.index')}</span>
            <span>{t('contact.eyebrow')}</span>
          </Reveal>
          <Reveal as="h2" id="contact-title" className="contact__title" delay={0.05}>
            {t('contact.title')}
          </Reveal>
          <Reveal as="p" className="contact__intro" delay={0.1}>
            {t('contact.intro')}
          </Reveal>

          <Reveal as="dl" className="contact__list" delay={0.15}>
            <div>
              <dt>{t('contact.phone')}</dt>
              <dd>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                  {phone}
                </a>
              </dd>
            </div>
            <div>
              <dt>{t('contact.email')}</dt>
              <dd>
                <a href={`mailto:${email}`} dir="ltr">
                  {email}
                </a>
              </dd>
            </div>
            <div>
              <dt>{t('contact.address')}</dt>
              <dd>
                <address>
                  {(address[lang] || address.en).map((line, i) => (
                    <span key={i}>{line}</span>
                  ))}
                </address>
              </dd>
            </div>
            <div>
              <dt>{t('contact.follow')}</dt>
              <dd>
                <ul className="contact__social">
                  {SITE.social.map((s) => (
                    <li key={s.id}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </Reveal>

        </div>

        <Reveal className="contact__formwrap" delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
