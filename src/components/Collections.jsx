import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { CATEGORIES, PRODUCTS, loc } from '../data/products.js';
import { prefersReducedMotion } from '../lib/env.js';
import { scrollToSection } from '../lib/scroll.js';
import Reveal from './Reveal.jsx';
import ProductCard from './ProductCard.jsx';
import ProductDialog from './ProductDialog.jsx';

export default function Collections() {
  const { t, lang, num } = useI18n();
  const [filter, setFilter] = useState('all');
  const [phase, setPhase] = useState('in');
  const [openId, setOpenId] = useState(null);
  const timer = useRef(0);

  const items = useMemo(() => (filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)), [filter]);
  const open = useMemo(() => PRODUCTS.find((p) => p.id === openId) || null, [openId]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const changeFilter = (next) => {
    if (next === filter) return;
    clearTimeout(timer.current);
    if (prefersReducedMotion()) {
      setFilter(next);
      return;
    }
    setPhase('out');
    timer.current = setTimeout(() => {
      setFilter(next);
      setPhase('in');
    }, 200);
  };

  const step = useCallback(
    (dir) => {
      const i = items.findIndex((p) => p.id === openId);
      if (i < 0) return;
      setOpenId(items[(i + dir + items.length) % items.length].id);
    },
    [items, openId]
  );

  const enquire = (product) => {
    const subject = `${loc(product.name, lang)} — ${loc(product.variant, lang)}`;
    setOpenId(null);
    window.dispatchEvent(new CustomEvent('livora:enquire', { detail: { subject } }));
    requestAnimationFrame(() => scrollToSection('contact'));
  };

  const countLabel = items.length === 1 ? t('collections.countOne') : t('collections.count', { n: num(items.length) });

  return (
    <section id="collections" className="collections" data-nav-theme="light" data-nav-surface="solid" aria-labelledby="collections-title">
      <div className="collections__inner">
        <header className="collections__head">
          <Reveal as="p" className="eyebrow">
            <span className="eyebrow__idx">{t('collections.index')}</span>
            <span>{t('collections.eyebrow')}</span>
          </Reveal>
          <Reveal as="h2" id="collections-title" className="collections__title" delay={0.05}>
            {t('collections.title')}
          </Reveal>
          <Reveal as="p" className="collections__intro" delay={0.1}>
            {t('collections.intro')}
          </Reveal>
        </header>

        <Reveal className="collections__bar" delay={0.12}>
          <div className="chips" role="group" aria-label={t('collections.filterLabel')}>
            {['all', ...CATEGORIES].map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={filter === c} onClick={() => changeFilter(c)}>
                {c === 'all' ? t('collections.all') : t(`collections.categories.${c}`)}
              </button>
            ))}
          </div>
          <p className="collections__count" aria-live="polite">
            {countLabel}
          </p>
        </Reveal>

        {items.length ? (
          <ul className="grid" data-phase={phase} key={filter}>
            {items.map((p, i) => (
              <li key={p.id} className="grid__item" style={{ '--i': i }}>
                <ProductCard product={p} index={PRODUCTS.indexOf(p)} onOpen={setOpenId} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="collections__empty">{t('collections.empty')}</p>
        )}

        <p className="collections__notice">
          <span className="collections__notice-dot" aria-hidden="true" />
          {t('collections.notice')}
        </p>
      </div>

      <ProductDialog product={open} list={items} onClose={() => setOpenId(null)} onStep={step} onEnquire={enquire} />
    </section>
  );
}
