import { toArabicDigits } from '../i18n/I18nProvider.jsx';

/** Placeholder-aware price label. A null amount renders the obvious template "0,000 USD". */
export function formatPrice(price, lang) {
  const currency = price.currency || 'USD';
  const body = price.amount == null ? '0,000' : new Intl.NumberFormat('en-US').format(price.amount);
  if (lang === 'ar') return `${toArabicDigits(body).replace(/,/g, '٬')} ${currency}`;
  return `${body} ${currency}`;
}
