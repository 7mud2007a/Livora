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
