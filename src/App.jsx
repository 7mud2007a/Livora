import { useEffect } from 'react';
import { ScrollTrigger } from './lib/gsap.js';
import { scrollToSection } from './lib/scroll.js';
import SkipLink from './components/SkipLink.jsx';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import AboutStory from './components/about/AboutStory.jsx';
import Collections from './components/Collections.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';

const ANCHORS = ['home', 'about', 'collections', 'contact'];

export default function App() {
  // Mount the shared decorative WebGL background once, behind the complete site.
  useEffect(() => {
    let instance;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !window.BrandBackground) return;
      instance = new window.BrandBackground({
        zIndex: 0,
        layers: 3,
        cell: 68,
        clearing: 0.38,
        surfaceOpacity: 0.34,
        opacity: 0.42,
        speed: 0.52,
        pointer: true,
        scrollParallax: 0.12,
        maxPixelRatio: 1.35,
        maxPixels: 1800000,
        maxFps: 30,
        detail: 0.78,
        adaptiveQuality: true,
        respectReducedMotion: true,
        powerPreference: 'low-power',
      });
      if (instance.canvas) {
        instance.canvas.setAttribute('aria-hidden', 'true');
        instance.canvas.style.pointerEvents = 'none';
      }
    };
    const existing = document.querySelector('script[data-livora-brand-background]');
    if (window.BrandBackground) mount();
    else if (existing) existing.addEventListener('load', mount, { once: true });
    else {
      const script = document.createElement('script');
      script.src = '/brand-background.js';
      script.async = true;
      script.dataset.livoraBrandBackground = 'true';
      script.addEventListener('load', mount, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (instance) instance.destroy();
    };
  }, []);
  // Deep links (/#collections): the page is built by script, so the browser cannot scroll there by itself.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!ANCHORS.includes(id) || id === 'home') return undefined;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        scrollToSection(id, { instant: true, updateHash: false });
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  return (
    <>
      <SkipLink />
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <AboutStory />
        <Collections />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
