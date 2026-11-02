import { useI18n } from '../i18n/I18nProvider.jsx';
import { loc, productImage } from '../data/products.js';
import { formatPrice } from '../lib/format.js';
import { ArrowIcon } from './Icons.jsx';

/** One catalogue entry. Reusable: it only depends on the product data shape (see data/products.js). */
export default function ProductCard({ product, index, onOpen }) {
  const { t, lang, num } = useI18n();
  const img = productImage(product);
  const name = loc(product.name, lang);
  const variant = loc(product.variant, lang);
  return (
    <article className="card" style={{ '--i': index }} data-category={product.category}>
      <button
        type="button"
        className="card__media"
        onClick={() => onOpen(product.id)}
        aria-label={`${name}, ${variant} — ${t('collections.viewDetails')}`}
      >
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes="(min-width: 1100px) 30vw, (min-width: 700px) 44vw, 92vw"
          width={img.width}
          height={img.height}
          alt={loc(product.image.alt, lang)}
          loading="lazy"
          decoding="async"
        />
        <span className="card__index" aria-hidden="true">
          {num(String(index + 1).padStart(2, '0'))}
        </span>
        {product.placeholder && <span className="card__tag">{t('collections.placeholderTag')}</span>}
        <span className="card__peek" aria-hidden="true">
          <span>{t('collections.viewDetails')}</span>
          <ArrowIcon />
        </span>
      </button>
      <div className="card__body">
        <p className="card__cat">{t(`collections.categories.${product.category}`)}</p>
        <h3 className="card__name">
          {name}
          <span className="card__variant">{variant}</span>
        </h3>
        <p className="card__desc">{loc(product.description, lang)}</p>
        <div className="card__foot">
          <span className="card__price" dir="ltr">
            {formatPrice(product.price, lang)}
          </span>
          <button type="button" className="textlink" onClick={() => onOpen(product.id)} aria-label={`${name}, ${variant} — ${t('collections.viewDetails')}`}>
            <span>{t('collections.viewDetails')}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
