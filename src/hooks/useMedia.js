import { useSyncExternalStore } from 'react';

/** Subscribe to a CSS media query without effects or state churn. */
export function useMedia(query, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
