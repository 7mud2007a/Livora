import { useEffect, useRef } from 'react';

// One shared IntersectionObserver reveals elements as they enter the viewport (CSS does the animating).
let io;
function observer() {
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
  }
  return io;
}

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const o = observer();
    o.observe(el);
    return () => o.unobserve(el);
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--d': `${delay}s` }} {...rest}>
      {children}
    </Tag>
  );
}
