import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks `prefers-reduced-motion`, so a component can drop its transition
 * rather than animate at a user who asked it not to. Extracted from
 * `PullToRefresh`, which already respects the preference.
 *
 * Returns `false` on the server and on the first client render, then updates
 * after mount — the pattern that keeps hydration stable. Every component in
 * the kit animates with CSS transitions, so the usual consumer is a
 * `transition: reduced ? 'none' : '…'` expression.
 *
 * ```tsx
 * const reduced = useReducedMotion();
 * <div style={{ transition: reduced ? 'none' : 'transform 0.3s ease' }} />
 * ```
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const apply = () => setReduced(mq.matches);
    apply();
    // `addListener` is the deprecated fallback for Safari < 14.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    mq.addListener?.(apply);
    return () => mq.removeListener?.(apply);
  }, []);

  return reduced;
}

export default useReducedMotion;
