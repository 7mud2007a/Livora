import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { loc, productImage } from '../data/products.js';
import { formatPrice } from '../lib/format.js';
import { ArrowIcon, ChevronIcon, CloseIcon } from './Icons.jsx';

/** Details view built on the native <dialog>: focus trap, Esc, inert background and focus return come for free. */
export default function ProductDialog({ product, list, onClose, onStep, onEnquire }) {
  const { t, lang } = useI18n();
  const ref = useRef(null);
  const previousOverflow = useRef(null);
  const previousScrollY = useRef(0);
  const skipRestoreOnClose = useRef(false);

  const unlockPageScroll = () => {
    if (!previousOverflow.current) return;
    document.documentElement.style.overflow = previousOverflow.current.html;
    document.body.style.overflow = previousOverflow.current.body;
    previousOverflow.current = null;
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (product && !d.open) {
      previousScrollY.current = window.scrollY;
      previousOverflow.current = {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow,
      };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      d.showModal();
      document.dispatchEvent(new Event('livora:dialog-open'));
    }
    if (!product && d.open) d.close();
    return () => {
      if (!product) unlockPageScroll();
    };
  }, [product]);

  useEffect(
    () => () => {
      unlockPageScroll();
    },
    []
  );

  const img = product ? productImage(product) : null;
  const idx = product ? list.findIndex((p) => p.id === product.id) : -1;
  const multiple = list.length > 1;

  return (
    <dialog
      ref={ref}
      className="pdialog"
      aria-labelledby="pdialog-title"
      onClose={() => {
        unlockPageScroll();
        document.dispatchEvent(new CustomEvent('livora:dialog-close', {
          detail: {
            scrollY: previousScrollY.current,
            skipRestore: skipRestoreOnClose.current,
          },
        }));
        skipRestoreOnClose.current = false;
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close();
      }}
    >
      {product && (
        <>
          <button type="button" className="pdialog__close" onClick={() => ref.current.close()} aria-label={t('collections.dialog.close')}>
            <CloseIcon />
          </button>
          <div className="pdialog__scroll" data-lenis-prevent>
        <div className="pdialog__inner">
          <div className="pdialog__media">
            <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 900px) 46vw, 92vw" width={img.width} height={img.height} alt={loc(product.image.alt, lang)} />
            {product.placeholder && <span className="card__tag">{t('collections.placeholderTag')}</span>}
          </div>

          <div className="pdialog__body">
            <p className="card__cat">{t(`collections.categories.${product.category}`)}</p>
            <h3 id="pdialog-title" className="pdialog__title">
              {loc(product.name, lang)}
              <span className="card__variant">{loc(product.variant, lang)}</span>
            </h3>
            <p className="pdialog__desc">{loc(product.description, lang)}</p>

            <h4 className="pdialog__h">{t('collections.dialog.specs')}</h4>
            <dl className="pdialog__specs">
              {product.specs.map((s, i) => (
                <div key={i}>
                  <dt>{loc(s.label, lang)}</dt>
                  <dd>{loc(s.value, lang)}</dd>
                </div>
              ))}
              <div>
                <dt>{t('collections.dialog.price')}</dt>
                <dd>
                  <span dir="ltr">{formatPrice(product.price, lang)}</span>{product.price.amount == null && <span className="pdialog__tbc"> · {t('collections.priceTbc')}</span>}
                </dd>
              </div>
            </dl>

            {product.placeholder && <p className="pdialog__note">{t('collections.dialog.placeholderNote')}</p>}

            <div className="pdialog__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  skipRestoreOnClose.current = true;
                  onEnquire(product);
                }}
              >
                <span>{t('collections.dialog.enquire')}</span>
                <ArrowIcon />
              </button>
              {multiple && (
                <div className="pdialog__step">
                  <button type="button" onClick={() => onStep(-1)} aria-label={t('collections.dialog.prev')}>
                    <ChevronIcon dir="left" className="flip-rtl" />
                  </button>
                  <span aria-hidden="true">
                    {idx + 1} / {list.length}
                  </span>
                  <button type="button" onClick={() => onStep(1)} aria-label={t('collections.dialog.next')}>
                    <ChevronIcon dir="right" className="flip-rtl" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
          </div>
        </>
      )}
    </dialog>
  );
}
