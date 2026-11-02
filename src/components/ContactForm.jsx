import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { SITE } from '../config/site.js';
import { ArrowIcon } from './Icons.jsx';

const EMPTY = { name: '', email: '', subject: '', message: '', trap: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns error CODES (not text), so the messages follow the language when it is switched. */
function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'name';
  if (!v.email.trim()) e.email = 'emailRequired';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'emailInvalid';
  if (!v.subject.trim()) e.subject = 'subject';
  if (!v.message.trim()) e.message = 'messageRequired';
  else if (v.message.trim().length < 10) e.message = 'messageShort';
  return e;
}

const FIELDS = ['name', 'email', 'subject', 'message'];

export default function ContactForm() {
  const { t, lang } = useI18n();
  const [values, setValues] = useState(EMPTY);
  // Errors only appear once a send was attempted, then follow the typing live. Showing them on blur would push the
  // Send button down at the very moment it is pressed, and the tap would miss it.
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | invalid | sending | success | error | notConfigured
  const refs = useRef({});
  const errors = validate(values);

  // "Enquire about this piece" in the product dialog pre-fills the subject.
  useEffect(() => {
    const onEnquire = (e) => {
      setValues((v) => ({ ...v, subject: e.detail?.subject || v.subject }));
      setStatus('idle');
      // On phones a programmatic focus would raise the keyboard over the section we just scrolled to.
      if (window.matchMedia('(pointer: fine)').matches) setTimeout(() => refs.current.message?.focus({ preventScroll: true }), 1000);
    };
    window.addEventListener('livora:enquire', onEnquire);
    return () => window.removeEventListener('livora:enquire', onEnquire);
  }, []);

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (status !== 'idle' && status !== 'sending') setStatus('idle');
  };
  const showError = (k) => submitted && errors[k];

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setSubmitted(true);
    const firstInvalid = FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      setStatus('invalid');
      refs.current[firstInvalid]?.focus();
      return;
    }
    // Honeypot: people never see or fill this field, so a value means an automated submission. It is dropped
    // quietly: no request is made and, since nothing is sent, no "sent" message is shown either.
    if (values.trap) {
      setStatus('idle');
      return;
    }
    const endpoint = SITE.contact.endpoint;
    if (!endpoint) {
      // No backend is configured: say so honestly instead of pretending the message was delivered.
      setStatus('notConfigured');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          language: lang,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('success');
      setValues(EMPTY);
      setSubmitted(false);
    } catch {
      setStatus('error');
    }
  };

  const field = (k, label, props = {}) => {
    const err = showError(k);
    const Tag = k === 'message' ? 'textarea' : 'input';
    return (
      <div className="field" data-invalid={err ? 'true' : undefined}>
        <label htmlFor={`cf-${k}`}>
          {label}
          <span className="field__req" aria-hidden="true">
            *
          </span>
          <span className="visually-hidden"> ({t('contact.form.required')})</span>
        </label>
        <Tag
          id={`cf-${k}`}
          name={k}
          ref={(el) => (refs.current[k] = el)}
          value={values[k]}
          onChange={set(k)}
          required
          aria-required="true"
          aria-invalid={err ? 'true' : 'false'}
          aria-describedby={err ? `cf-${k}-err` : undefined}
          {...props}
        />
        {err && (
          <p className="field__error" id={`cf-${k}-err`}>
            {t(`contact.form.errors.${errors[k]}`)}
          </p>
        )}
      </div>
    );
  };

  const statusText =
    status === 'invalid'
      ? t('contact.form.errors.fix')
      : status === 'sending'
        ? t('contact.form.sending')
        : status === 'success'
          ? t('contact.form.status.success')
          : status === 'error'
            ? t('contact.form.status.error')
            : status === 'notConfigured'
              ? t('contact.form.status.notConfigured')
              : '';

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-labelledby="form-title">
      <h3 id="form-title" className="form__title">
        {t('contact.form.title')}
      </h3>

      {field('name', t('contact.form.name'), { type: 'text', autoComplete: 'name' })}
      {field('email', t('contact.form.email'), { type: 'email', autoComplete: 'email', inputMode: 'email', dir: 'ltr' })}
      {field('subject', t('contact.form.subject'), { type: 'text', autoComplete: 'off' })}
      {field('message', t('contact.form.message'), { rows: 6 })}

      {/* Honeypot (hidden from people and assistive tech; deliberately not named like a real field, so browser
          autofill and password managers leave it alone). */}
      <div className="form__trap" aria-hidden="true">
        <label htmlFor="cf-hp">Leave this field empty</label>
        <input id="cf-hp" name="hp_ref" type="text" tabIndex={-1} autoComplete="off" value={values.trap} onChange={set('trap')} />
      </div>

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
          <span>{status === 'sending' ? t('contact.form.sending') : t('contact.form.submit')}</span>
          <ArrowIcon />
        </button>
      </div>

      <div className="form__status" role="status" aria-live="polite" data-state={status}>
        {statusText && <p>{statusText}</p>}
      </div>
    </form>
  );
}
