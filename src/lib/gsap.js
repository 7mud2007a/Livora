// Single place where GSAP and its (free) plugin are registered.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Mobile browsers resize the viewport while the address bar collapses; that must not refresh the story.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
