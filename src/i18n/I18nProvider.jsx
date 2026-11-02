import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import en from '../content/en.js';
import ar from '../content/ar.js';
import { captureScrollAnchor, restoreScrollAnchor } from '../lib/scroll.js';
import { prefersReducedMotion, store } from '../lib/env.js';
import { ScrollTrigger } from '../lib/gsap.js';

const DICTS = { en, ar };
const STORAGE_KEY = 'livora:lang';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const I18nContext = createContext(null);

export const toArabicDigits = (value) => String(value).replace(/\d/g, (d) => AR_DIGITS[d]);

const resolve = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function readInitialLang() {
  // index.html already set <html lang dir> before first paint; mirror it.
  return document.documentElement.lang === 'ar' ? 'ar' : 'en';
}

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** Keep <title>, description and Open Graph tags in the active language. */
function applyDocumentMeta(dict) {
  document.title = dict.meta.title;
  setMeta('meta[name="description"]', 'content', dict.meta.description);
  setMeta('meta[property="og:title"]', 'content', dict.meta.title);
  setMeta('meta[property="og:description"]', 'content', dict.meta.description);
  setMeta('meta[property="og:locale"]', 'content', dict.meta.ogLocale);
  setMeta('meta[property="og:locale:alternate"]', 'content', dict === ar ? 'en_US' : 'ar_AR');
  setMeta('meta[name="twitter:title"]', 'content', dict.meta.title);
}

function ensureVeil() {
  let veil = document.getElementById('lang-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.id = 'lang-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
  }
  return veil;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Resolves on the next frame, or after a short timeout: rAF never fires in a hidden tab, and on a very slow
// device a frame can take long enough that the page would stay veiled for no reason.
const nextFrame = () =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 180);
  });

const holdNav = () => window.dispatchEvent(new Event('livora:hold-nav'));

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang);
  const dict = DICTS[lang];
  const pendingAnchor = useRef(null);
  const busy = useRef(false);

  const t = useCallback(
    (path, vars) => {
      let value = resolve(dict, path);
      if (value == null) {
        if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key "${path}" (${lang})`);
        return path;
      }
      if (typeof value === 'string' && vars) {
        value = value.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
      }
      return value;
    },
    [dict, lang]
  );

  /** Format a number with the digits of the active language. */
  const num = useCallback((n) => (lang === 'ar' ? toArabicDigits(n) : String(n)), [lang]);

  const setLang = useCallback(
    async (next) => {
      if (next === lang || busy.current || !DICTS[next]) return;
      busy.current = true;
      const reduced = prefersReducedMotion();
      const veil = ensureVeil();
      pendingAnchor.current = captureScrollAnchor();

      // 1. Fade the page out briefly so the direction flip is never seen as a jump.
      if (!reduced) {
        veil.classList.add('is-on');
        await wait(220);
      }
      // 2. Make sure the face for the next language is ready before it is painted.
      try {
        if (document.fonts && document.fonts.load) {
          const probe = next === 'ar' ? '1em "Livora Arabic"' : '1em "Livora Display"';
          await Promise.race([document.fonts.load(probe, next === 'ar' ? 'ليفورا' : 'LIVORA'), wait(900)]);
        }
      } catch {
        /* fall through: the font will swap in when ready */
      }

      // 3. Flip language + direction synchronously with the React update.
      const root = document.documentElement;
      root.lang = next;
      root.dir = DICTS[next].dir;
      store.set(STORAGE_KEY, next);
      try {
        const url = new URL(location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', next);
          history.replaceState(null, '', url.toString());
        }
      } catch {
        /* ignore */
      }
      setLangState(next);
    },
    [lang]
  );

  // After React committed the new language: restore scroll, refresh triggers, lift the veil.
  useLayoutEffect(() => {
    applyDocumentMeta(dict);
    const anchor = pendingAnchor.current;
    if (!anchor) return undefined;
    pendingAnchor.current = null;
    let cancelled = false;
    let moved = false;
    // If the visitor starts scrolling while the switch is settling, stop correcting their position.
    const stop = () => {
      moved = true;
    };
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    (async () => {
      try {
        holdNav();
        restoreScrollAnchor(anchor);
        await nextFrame();
        if (cancelled) return;
        ScrollTrigger.refresh();
        if (!moved) restoreScrollAnchor(anchor);
        holdNav();
        await nextFrame();
      } finally {
        events.forEach((e) => window.removeEventListener(e, stop));
        const veil = document.getElementById('lang-veil');
        if (veil) veil.classList.remove('is-on');
        busy.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, dict]);

  // Keep the language in sync if another tab changes it.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'ar' || e.newValue === 'en') && e.newValue !== lang) setLang(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lang, setLang]);

  const value = useMemo(
    () => ({ lang, dir: dict.dir, rtl: dict.dir === 'rtl', dict, t, num, setLang }),
    [lang, dict, t, num, setLang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
