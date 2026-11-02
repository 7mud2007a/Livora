// Tiny inline icons. They inherit currentColor; the arrow flips automatically in RTL (see .icon-arrow in CSS).

export function ArrowIcon({ className = '', ...rest }) {
  return (
    <svg className={`icon-arrow ${className}`} width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true" focusable="false" {...rest}>
      <path d="M0 6h20.5M15.5 1l5 5-5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}

export function ChevronIcon({ dir = 'right', ...props }) {
  const d = dir === 'left' ? 'M9 1L3 7l6 6' : 'M5 1l6 6-6 6';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d={d} stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}
