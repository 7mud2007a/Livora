import { createRoot } from 'react-dom/client';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './styles/index.css';
import { gsap, ScrollTrigger } from './lib/gsap.js';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import App from './App.jsx';

// Keep Lenis and ScrollTrigger on one animation clock so the GLB story follows
// the smoothed native scroll without a second, competing requestAnimationFrame loop.
const lenis = new Lenis({
  autoRaf: false,
  lerp: 0.09,
  smoothWheel: true,
  syncTouch: true,
  syncTouchLerp: 0.075,
  touchInertiaExponent: 1.7,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  anchors: true,
  respectReducedMotion: true,
});

lenis.on('scroll', ScrollTrigger.update);
const updateLenis = (time) => lenis.raf(time * 1000);
gsap.ticker.add(updateLenis);
gsap.ticker.lagSmoothing(0);

createRoot(document.getElementById('root')).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
