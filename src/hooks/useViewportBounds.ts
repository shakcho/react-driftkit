import { useCallback, useEffect, useRef, type RefObject } from 'react';

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

/** What triggered a bounds recalculation. */
export type BoundsReason = 'viewport' | 'orientation' | 'element' | 'manual';

export interface BoundsChange {
  reason: BoundsReason;
  /** Current size of the observed element. */
  size: Size;
  /** Its size at the previous notification — the delta is what most callers want. */
  prevSize: Size;
  /** Current viewport size. */
  viewport: Size;
}

export interface UseViewportBoundsOptions<T extends Element = HTMLElement> {
  /** Element to observe. Omit to use the ref this hook returns. */
  ref?: RefObject<T | null>;
  /**
   * Skip notifications while true. Pass a function for live state — components
   * typically suppress reflow mid-drag, and a function avoids re-subscribing
   * the observers on every drag.
   */
  disabled?: boolean | (() => boolean);
  /** Inset used by `clamp`, in px. Defaults to `0`. */
  padding?: number;
  /** Fires on viewport resize, orientation change, and element resize. */
  onChange?: (change: BoundsChange) => void;
}

export interface UseViewportBoundsResult<T extends Element = HTMLElement> {
  ref: RefObject<T | null>;
  /** Current viewport size. `{ width: 0, height: 0 }` during SSR. */
  viewport: () => Size;
  /** Measured size of the observed element, or `null` before it mounts. */
  measure: () => Size | null;
  /**
   * Clamp a top-left position so the element stays fully on screen, honouring
   * `padding`. Defaults to the observed element's measured size.
   */
  clamp: (pos: Position, size?: Size) => Position;
  /** Fire `onChange` with `reason: 'manual'`. */
  refresh: () => void;
}

const EMPTY: Size = { width: 0, height: 0 };

function viewportSize(): Size {
  if (typeof window === 'undefined') return EMPTY;
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Keeps an element aware of the space it has to live in: viewport resize,
 * orientation change, and its own content resizing. Extracted from
 * `MovableLauncher` and `SnapDock`, which both re-pin on all three.
 *
 * SSR-safe — every measurement happens in an effect or a callback, never
 * during render.
 *
 * ```tsx
 * const { ref, clamp } = useViewportBounds<HTMLDivElement>({
 *   disabled: () => draggingRef.current,
 *   padding: 16,
 *   onChange: () => setPos((p) => clamp(p)),
 * });
 * ```
 */
export function useViewportBounds<T extends Element = HTMLElement>(
  options: UseViewportBoundsOptions<T> = {},
): UseViewportBoundsResult<T> {
  const internalRef = useRef<T | null>(null);
  const ref = options.ref ?? internalRef;

  const optsRef = useRef(options);
  optsRef.current = options;

  const getEl = useCallback((): T | null => (optsRef.current.ref ?? internalRef).current, []);

  const prevSizeRef = useRef<Size>(EMPTY);

  const measure = useCallback((): Size | null => {
    const el = getEl();
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, [getEl]);

  const emit = useCallback(
    (reason: BoundsReason) => {
      const o = optsRef.current;
      const off = typeof o.disabled === 'function' ? o.disabled() : o.disabled;
      if (off) return;
      const size = measure() ?? EMPTY;
      const prevSize = prevSizeRef.current;
      prevSizeRef.current = size;
      o.onChange?.({ reason, size, prevSize, viewport: viewportSize() });
    },
    [measure],
  );

  const emitRef = useRef(emit);
  emitRef.current = emit;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed the previous size so the first notification carries a real delta.
    const el = getEl();
    if (el) {
      const rect = el.getBoundingClientRect();
      prevSizeRef.current = { width: rect.width, height: rect.height };
    }

    const onResize = () => emitRef.current('viewport');
    const onOrientation = () => emitRef.current('orientation');
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);

    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      // ResizeObserver fires once immediately on observe(); that initial
      // callback is the element's current size, not a change, so skip it.
      let first = true;
      observer = new ResizeObserver(() => {
        if (first) {
          first = false;
          return;
        }
        const next = measure();
        const prev = prevSizeRef.current;
        if (next && next.width === prev.width && next.height === prev.height) return;
        emitRef.current('element');
      });
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      observer?.disconnect();
    };
  }, [getEl, measure]);

  const clamp = useCallback(
    (pos: Position, size?: Size): Position => {
      const vp = viewportSize();
      const s = size ?? measure() ?? EMPTY;
      const pad = optsRef.current.padding ?? 0;
      const maxX = vp.width - s.width - pad;
      const maxY = vp.height - s.height - pad;
      return {
        // Math.max last so the element stays visible when it is larger than
        // the viewport rather than being pushed off the top/left.
        x: Math.max(pad, Math.min(pos.x, Math.max(pad, maxX))),
        y: Math.max(pad, Math.min(pos.y, Math.max(pad, maxY))),
      };
    },
    [measure],
  );

  const refresh = useCallback(() => emitRef.current('manual'), []);

  return { ref, viewport: viewportSize, measure, clamp, refresh };
}

export default useViewportBounds;
