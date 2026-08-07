import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

/** Pointer kinds reported by the Pointer Events API. */
export type PointerType = 'mouse' | 'pen' | 'touch';

/** Axis the click-vs-drag threshold is measured on. `'both'` is free 2D movement. */
export type DragAxis = 'x' | 'y' | 'both';

/** Snapshot of a gesture, handed to every `useDrag` callback. */
export interface DragState {
  /** Client coords where the gesture started. */
  startX: number;
  startY: number;
  /** Current client coords. */
  x: number;
  y: number;
  /** Signed delta from the gesture start, in px. */
  dx: number;
  dy: number;
  /** Signed velocity in px/ms, averaged over the last ~100 ms of movement. */
  vx: number;
  vy: number;
  /** Pointer that owns the gesture. */
  pointerId: number;
  pointerType: string;
  /** Element the original `pointerdown` landed on. */
  target: EventTarget | null;
  /** Native event that produced this snapshot. `null` for imperative cancels. */
  event: globalThis.PointerEvent | null;
}

export interface UseDragOptions<T extends HTMLElement = HTMLElement> {
  /**
   * Element that takes pointer capture and scopes the `handle` lookup. Omit to
   * use the ref this hook returns.
   */
  ref?: RefObject<T | null>;
  /** Movement in px before a press is treated as a drag. Defaults to `5`. */
  threshold?: number;
  /** Axis the threshold is measured on. Defaults to `'both'`. */
  axis?: DragAxis;
  /**
   * CSS selector for a nested drag handle. When set, gestures only begin
   * inside a matching element, leaving the rest of the surface free for
   * scrolling and clicks.
   */
  handle?: string;
  /** Ignore all pointer input while true. */
  disabled?: boolean;
  /** Restrict which pointer types can start a gesture. Defaults to all. */
  pointerTypes?: PointerType[];
  /** Mouse button that starts a gesture. Defaults to `0` (primary). */
  button?: number;
  /** Fires once, the moment movement first crosses `threshold`. */
  onStart?: (state: DragState) => void;
  /** Fires on every move after the threshold has been crossed. */
  onMove?: (state: DragState) => void;
  /** Fires on a normal release. Not called if the press never became a drag. */
  onEnd?: (state: DragState) => void;
  /** Fires on `pointercancel`, lost capture, or an imperative `cancel()`. */
  onCancel?: (state: DragState) => void;
}

export interface DragHandlers<T extends HTMLElement = HTMLElement> {
  onPointerDown: (e: ReactPointerEvent<T>) => void;
  onPointerMove: (e: ReactPointerEvent<T>) => void;
  onPointerUp: (e: ReactPointerEvent<T>) => void;
  onPointerCancel: (e: ReactPointerEvent<T>) => void;
  onLostPointerCapture: (e: ReactPointerEvent<T>) => void;
}

export interface UseDragResult<T extends HTMLElement = HTMLElement> {
  /** Attach to the drag surface, unless you passed your own `ref`. */
  ref: RefObject<T | null>;
  /** True between threshold-crossing and release. */
  dragging: boolean;
  /** Spread onto the drag surface. */
  handlers: DragHandlers<T>;
  /** Abort the active gesture, firing `onCancel`. */
  cancel: () => void;
}

const DEFAULT_THRESHOLD = 5;
/** Velocity is averaged over this trailing window so one jittery frame can't dominate. */
const VELOCITY_WINDOW_MS = 100;

interface Sample {
  t: number;
  x: number;
  y: number;
}

interface Gesture {
  id: number;
  pointerType: string;
  startX: number;
  startY: number;
  target: EventTarget | null;
  samples: Sample[];
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * A gesture begins inside a handle when the pressed element — or one of its
 * ancestors up to the drag surface — matches the selector. `closest` rather
 * than `querySelector` so a surface may contain several handles.
 */
function inHandle(target: EventTarget | null, selector: string | undefined, root: Element | null): boolean {
  if (!selector) return true;
  if (!(target instanceof Element) || !root) return false;
  const match = target.closest(selector);
  return !!match && root.contains(match);
}

function velocityOf(samples: Sample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/**
 * The pointer-gesture primitive every component in the kit is built on:
 * pointer capture, a click-vs-drag threshold, delta and velocity tracking, and
 * an optional nested drag handle.
 *
 * Window-level listeners run alongside the element handlers because a gesture
 * can move or end where the element never sees it — a fast drag that leaves
 * the surface before crossing the threshold (pre-capture moves are dispatched
 * elsewhere), a release outside the element, an OS-level cancel, or stolen
 * capture. Duplicate delivery is de-duplicated by native event identity.
 *
 * SSR-safe: nothing is read or registered until a pointer actually goes down.
 *
 * ```tsx
 * const { ref, dragging, handlers } = useDrag<HTMLDivElement>({
 *   handle: '[data-handle]',
 *   onMove: ({ dx, dy }) => setPos({ x: origin.x + dx, y: origin.y + dy }),
 *   onEnd: ({ vx }) => (Math.abs(vx) > 0.5 ? fling(vx) : settle()),
 * });
 *
 * <div ref={ref} {...handlers} style={{ touchAction: 'none' }} />
 * ```
 */
export function useDrag<T extends HTMLElement = HTMLElement>(
  options: UseDragOptions<T> = {},
): UseDragResult<T> {
  const internalRef = useRef<T | null>(null);
  const ref = options.ref ?? internalRef;

  // Latest options, so the window listeners registered on pointerdown always
  // call through to the current closures.
  const optsRef = useRef(options);
  optsRef.current = options;

  /**
   * Resolved at event time, not render time: the ref is only populated during
   * commit, so a render-time mirror would still be null on the first gesture.
   */
  const getEl = useCallback((): T | null => (optsRef.current.ref ?? internalRef).current, []);

  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const gestureRef = useRef<Gesture | null>(null);
  /** Last native event processed, so element + window delivery isn't counted twice. */
  const lastEventRef = useRef<globalThis.PointerEvent | null>(null);
  const detachRef = useRef<() => void>(() => {});

  const buildState = useCallback(
    (g: Gesture, event: globalThis.PointerEvent | null): DragState => {
      const last = g.samples[g.samples.length - 1] ?? { t: 0, x: g.startX, y: g.startY };
      const { vx, vy } = velocityOf(g.samples);
      return {
        startX: g.startX,
        startY: g.startY,
        x: last.x,
        y: last.y,
        dx: last.x - g.startX,
        dy: last.y - g.startY,
        vx,
        vy,
        pointerId: g.id,
        pointerType: g.pointerType,
        target: g.target,
        event,
      };
    },
    [],
  );

  const processMove = useCallback(
    (ev: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || ev.pointerId !== g.id) return;
      if (lastEventRef.current === ev) return;
      lastEventRef.current = ev;

      const o = optsRef.current;
      const t = now();
      g.samples.push({ t, x: ev.clientX, y: ev.clientY });
      while (g.samples.length > 2 && t - g.samples[0].t > VELOCITY_WINDOW_MS) {
        g.samples.shift();
      }

      if (!draggingRef.current) {
        const threshold = o.threshold ?? DEFAULT_THRESHOLD;
        const dx = Math.abs(ev.clientX - g.startX);
        const dy = Math.abs(ev.clientY - g.startY);
        const axis = o.axis ?? 'both';
        const travelled = axis === 'x' ? dx : axis === 'y' ? dy : Math.max(dx, dy);
        if (travelled < threshold) return;

        // Capture so subsequent moves route through the element handler even
        // if the pointer leaves it. Synthetic pointers in tests and some older
        // browsers reject capture, which is not fatal — the window listeners
        // still deliver the rest of the gesture.
        try {
          getEl()?.setPointerCapture(g.id);
        } catch {
          /* ignore */
        }
        draggingRef.current = true;
        setDragging(true);
        o.onStart?.(buildState(g, ev));
      }

      o.onMove?.(buildState(g, ev));
    },
    [buildState, getEl],
  );

  const endGesture = useCallback(
    (commit: boolean, ev: globalThis.PointerEvent | null) => {
      const g = gestureRef.current;
      if (!g) return;

      detachRef.current();
      detachRef.current = () => {};
      gestureRef.current = null;
      lastEventRef.current = null;

      try {
        getEl()?.releasePointerCapture(g.id);
      } catch {
        /* pointer already released — ignore */
      }

      // A press that never crossed the threshold is a click, not a drag: leave
      // it to propagate and fire nothing.
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);

      const state = buildState(g, ev);
      const o = optsRef.current;
      if (commit) o.onEnd?.(state);
      else o.onCancel?.(state);
    },
    [buildState, getEl],
  );

  // Window listeners read through refs so they always see the latest closures.
  const processMoveRef = useRef(processMove);
  processMoveRef.current = processMove;
  const endGestureRef = useRef(endGesture);
  endGestureRef.current = endGesture;

  const onPointerDown = useCallback((e: ReactPointerEvent<T>) => {
    const o = optsRef.current;
    if (o.disabled) return;
    if (e.pointerType === 'mouse' && e.button !== (o.button ?? 0)) return;
    if (o.pointerTypes && !o.pointerTypes.includes(e.pointerType as PointerType)) return;
    if (!inHandle(e.target, o.handle, getEl())) return;

    // A second pointer landing mid-gesture aborts the first rather than
    // interleaving with it.
    if (gestureRef.current) endGestureRef.current(false, null);

    gestureRef.current = {
      id: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      target: e.target,
      samples: [{ t: now(), x: e.clientX, y: e.clientY }],
    };

    if (typeof window === 'undefined') return;

    const onWindowMove = (ev: Event) => processMoveRef.current(ev as globalThis.PointerEvent);
    const onWindowUp = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (gestureRef.current && pe.pointerId !== gestureRef.current.id) return;
      processMoveRef.current(pe);
      endGestureRef.current(true, pe);
    };
    const onWindowCancel = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (gestureRef.current && pe.pointerId !== gestureRef.current.id) return;
      endGestureRef.current(false, pe);
    };
    const detach = () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowCancel);
    };
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowCancel);
    detachRef.current = detach;
  }, [getEl]);

  const onPointerMove = useCallback((e: ReactPointerEvent<T>) => {
    processMoveRef.current(e.nativeEvent);
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<T>) => {
    const g = gestureRef.current;
    if (g && e.pointerId !== g.id) return;
    processMoveRef.current(e.nativeEvent);
    endGestureRef.current(true, e.nativeEvent);
  }, []);

  const onPointerCancel = useCallback((e: ReactPointerEvent<T>) => {
    const g = gestureRef.current;
    if (g && e.pointerId !== g.id) return;
    endGestureRef.current(false, e.nativeEvent);
  }, []);

  const cancel = useCallback(() => {
    endGestureRef.current(false, null);
  }, []);

  useEffect(() => () => detachRef.current(), []);

  const handlers = useMemo<DragHandlers<T>>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  );

  return { ref, dragging, handlers, cancel };
}

export default useDrag;
