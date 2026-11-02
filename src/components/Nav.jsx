import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { scrollToSection } from '../lib/scroll.js';
import Wordmark from './Wordmark.jsx';
import LangSwitch from './LangSwitch.jsx';
import { CloseIcon } from './Icons.jsx';

const LINKS = [
  { id: 'home', key: 'nav.home' },
  { id: 'about', key: 'nav.about' },
  { id: 'collections', key: 'nav.collections' },
  { id: 'contact', key: 'nav.contact' },
];

/** Which section is under a probe line 38% down the viewport. The hero + reserved scroll area both count as "home". */
function useActiveSection() {
  const [active, setActive] = useState('home');
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const probe = window.innerHeight * 0.38;
      let current = 'home';
      for (const id of ['about', 'collections', 'contact']) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= probe) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'contact';
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return active;
}

export default function Nav() {
  const { t } = useI18n();
  const active = useActiveSection();
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const holdUntil = useRef(0);

  // Hide on scroll down, reveal on scroll up; pick the colour theme + surface of whatever is under the bar.
  useEffect(() => {
    const header = headerRef.current;
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      const held = performance.now() < holdUntil.current;
      if (y < 80 || held) header.classList.remove('is-hidden');
      else if (dy > 6) header.classList.add('is-hidden');
      else if (dy < -6) header.classList.remove('is-hidden');
      if (Math.abs(dy) > 2) lastY = y;

      let theme = 'light';
      let surface = 'clear';
      const stack = document.elementsFromPoint(Math.round(window.innerWidth / 2), 6);
      for (const el of stack) {
        if (header.contains(el)) continue;
        const host = el.closest('[data-nav-theme]');
        if (host) {
          theme = host.getAttribute('data-nav-theme') || 'light';
          surface = host.getAttribute('data-nav-surface') || 'clear';
          break;
        }
      }
      if (header.dataset.theme !== theme) header.dataset.theme = theme;
      if (header.dataset.surface !== surface) header.dataset.surface = surface;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // A language switch re-anchors the scroll position programmatically: keep the bar on screen meanwhile, so the
  // visitor can still reach the switcher (and the scroll correction is never mistaken for scrolling down).
  useEffect(() => {
    const hold = () => {
      holdUntil.current = performance.now() + 2600;
      headerRef.current?.classList.remove('is-hidden');
    };
    window.addEventListener('livora:hold-nav', hold);
    return () => window.removeEventListener('livora:hold-nav', hold);
  }, []);

  const go = useCallback((e, id) => {
    e.preventDefault();
    holdUntil.current = performance.now() + 3200;
    headerRef.current?.classList.remove('is-hidden');
    setOpen(false);
    // Let the menu close (and its scroll lock lift) before scrolling.
    requestAnimationFrame(() => scrollToSection(id));
  }, []);

  // Mobile menu: scroll lock, Escape to close, focus trap, focus return.
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const menu = menuRef.current;
    const focusables = () => [...menu.querySelectorAll('a[href], button:not([disabled])')];
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const toggle = toggleRef.current;
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      toggle?.focus({ preventScroll: true });
    };
  }, [open]);

  // Close the menu if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <header className={`nav${open ? ' is-menu-open' : ''}`} ref={headerRef} data-theme="light" data-surface="clear">
      <div className="nav__bar">
        <Wordmark className="nav__brand" />

        <nav className="nav__links" aria-label={t('nav.primary')}>
          <ul>
            {LINKS.map(({ id, key }) => (
              <li key={id}>
                <a
                  className="nav__link"
                  href={`#${id}`}
                  aria-current={active === id ? 'page' : undefined}
                  onClick={(e) => go(e, id)}
                >
                  <span>{t(key)}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__tools">
          <LangSwitch />
          <button
            type="button"
            className="nav__toggle"
            ref={toggleRef}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="nav__toggle-label">{open ? t('nav.close') : t('nav.menu')}</span>
            <span className="nav__toggle-icon" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="menu" ref={menuRef} hidden={!open} data-open={open}>
        <nav className="menu__nav" aria-label={t('nav.primary')}>
          <ul>
            {LINKS.map(({ id, key }, i) => (
              <li key={id} style={{ '--i': i }}>
                <a href={`#${id}`} aria-current={active === id ? 'page' : undefined} onClick={(e) => go(e, id)}>
                  <span className="menu__num" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="menu__text">{t(key)}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="menu__foot">
          <LangSwitch />
          <button type="button" className="menu__close" onClick={() => setOpen(false)}>
            <CloseIcon />
            <span>{t('nav.close')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
