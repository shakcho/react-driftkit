import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

/**
 * Lifecycle of a pull:
 *   idle → pulling → armed → refreshing → settling → idle
 * `armed` means the pull has crossed `threshold`, so releasing now refreshes.
 * `settling` is the animation back to rest after a refresh or a short pull.
 */
export type PullToRefreshPhase = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'settling';

/** What drove the current pull. Pointer covers mouse, touch, and pen. */
export type PullSource = 'pointer' | 'wheel';

export interface PullToRefreshState {
  phase: PullToRefreshPhase;
  /** Current pull distance in px, after resistance damping. */
  distance: number;
  /** `distance / threshold`, clamped to `[0, 1]`. Drives spinners and arrows. */
  progress: number;
  /** True once `distance >= threshold` — releasing now triggers a refresh. */
  armed: boolean;
  /** True while `on.refresh` is in flight. */
  refreshing: boolean;
  /** Which input is driving the pull, or `null` when at rest. */
  source: PullSource | null;
}

export interface PullToRefreshBehavior {
  /** Pull distance in px that arms a refresh. Default `64`. */
  threshold?: number;
  /** Hard ceiling the damped pull asymptotically approaches. Default `160`. */
  maxPull?: number;
  /**
   * How much of the raw input travel becomes pull distance before damping.
   * Lower feels heavier. Default `0.7`.
   */
  resistance?: number;
  /** Distance the content holds at while refreshing. Defaults to `threshold`. */
  refreshOffset?: number;
  /** Enable pointer drag (mouse / touch / pen). Default `true`. */
  pointer?: boolean;
  /** Enable wheel & trackpad overscroll — the desktop path. Default `true`. */
  wheel?: boolean;
  /**
   * Quiet period in ms after the last wheel event that counts as "release".
   * Wheels have no pointerup, so the gesture ends when the input stops.
   * Default `140`.
   */
  wheelReleaseMs?: number;
  /**
   * Minimum time in ms to stay in the refreshing state, so a fast response
   * doesn't flash the indicator. Uncontrolled mode only. Default `400`.
   */
  minRefreshMs?: number;
  /**
   * CSS selector for the scroll container to gate the gesture on. By default
   * the nearest scrollable ancestor of the touched element is used, falling
   * back to the document scroller.
   */
  scrollSelector?: string;
}

export interface PullToRefreshAnimation {
  /** Settle / refresh transition duration in ms. Default `280`. */
  duration?: number;
  /** CSS easing function. Default `cubic-bezier(0.22, 1, 0.36, 1)`. */
  easing?: string;
}

export interface PullToRefreshEvents {
  /**
   * Fires when a pull is released past the threshold. Return a promise and the
   * component holds the refreshing state until it settles. In controlled mode
   * (`refreshing` prop set) the return value is ignored.
   */
  refresh?: () => void | Promise<unknown>;
  /** Fires on every phase transition. */
  stateChange?: (state: PullToRefreshState) => void;
}

export interface PullToRefreshProps {
  /** The scrollable content. */
  children?: ReactNode;

  /**
   * Renders the reveal area above the content. Called on every pull frame with
   * the live state. Omit it and the pull still works, just with nothing to see.
   */
  indicator?: (state: PullToRefreshState) => ReactNode;
  /** Height in px of the indicator strip. Default `56`. */
  indicatorHeight?: number;

  /**
   * Controlled refreshing flag. When provided, the component stays in the
   * refreshing state until this flips back to `false` — use it to drive a
   * refresh from a button or any other non-gesture affordance. Omit for
   * uncontrolled, where the promise returned by `on.refresh` decides.
   */
  refreshing?: boolean;

  /** Turns the gesture off entirely without unmounting. Default `false`. */
  disabled?: boolean;

  behavior?: PullToRefreshBehavior;
  animation?: PullToRefreshAnimation;
  on?: PullToRefreshEvents;

  /** CSS class on the outer container. */
  className?: string;
  /** Inline styles merged onto the outer container. */
  style?: CSSProperties;
  /** CSS class on the translated content wrapper. */
  contentClassName?: string;
  /** Inline styles merged onto the translated content wrapper. */
  contentStyle?: CSSProperties;
  /** CSS class on the indicator strip. */
  indicatorClassName?: string;
  /** Inline styles merged onto the indicator strip. */
  indicatorStyle?: CSSProperties;
}

/** Pointer travel in px before a downward drag is claimed as a pull. */
const ACTIVATE_PX = 6;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Rubber-band curve. Near zero it is roughly linear, then it flattens out so
 * the pull asymptotically approaches `max` and never exceeds it.
 */
function damp(raw: number, max: number): number {
  if (max <= 0 || raw <= 0) return 0;
  return max * (1 - Math.exp(-raw / max));
}

/**
 * Scroll offset of whatever the gesture would actually scroll. Walks up from
 * the touched element to the first scrollable ancestor; if there is none, the
 * page itself is the scroller.
 */
function scrollTopAt(
  target: EventTarget | null,
  root: HTMLElement | null,
  selector?: string
): number {
  if (typeof document === 'undefined') return 0;

  if (selector) {
    const el = root?.querySelector(selector);
    return el ? el.scrollTop : 0;
  }

  let el: Element | null = target instanceof Element ? target : root;
  while (el && el !== document.body && el !== document.documentElement) {
    const overflowY = window.getComputedStyle(el).overflowY;
    const scrollable =
      overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (scrollable && el.scrollHeight > el.clientHeight + 1) return el.scrollTop;
    el = el.parentElement;
  }

  // `scrollingElement` is the spec-correct page scroller (body in quirks mode,
  // documentElement otherwise) but it can be null, so fall through.
  return (
    document.scrollingElement?.scrollTop ??
    document.documentElement?.scrollTop ??
    window.scrollY ??
    0
  );
}

export function PullToRefresh({
  children,
  indicator,
  indicatorHeight = 56,
  refreshing: refreshingProp,
  disabled = false,
  behavior,
  animation,
  on,
  className = '',
  style,
  contentClassName = '',
  contentStyle,
  indicatorClassName = '',
  indicatorStyle,
}: PullToRefreshProps) {
  const threshold = behavior?.threshold ?? 64;
  const maxPull = behavior?.maxPull ?? 160;
  const resistance = behavior?.resistance ?? 0.7;
  const refreshOffset = behavior?.refreshOffset ?? threshold;
  const pointerEnabled = behavior?.pointer ?? true;
  const wheelEnabled = behavior?.wheel ?? true;
  const wheelReleaseMs = behavior?.wheelReleaseMs ?? 140;
  const minRefreshMs = behavior?.minRefreshMs ?? 400;
  const scrollSelector = behavior?.scrollSelector;

  const duration = animation?.duration ?? 280;
  const easing = animation?.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';

  const isControlled = refreshingProp !== undefined;

  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<PullToRefreshPhase>('idle');
  const [distance, setDistance] = useState(0);
  const [source, setSource] = useState<PullSource | null>(null);

  // Mirrors of the reactive state that the raw DOM listeners read. Native
  // wheel/touch handlers run outside React's render cycle, so they cannot rely
  // on the state values captured in a closure.
  const phaseRef = useRef<PullToRefreshPhase>('idle');
  const rawRef = useRef(0);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  // Latest config, so listeners registered once still see current props.
  const cfg = useRef({
    threshold,
    maxPull,
    resistance,
    refreshOffset,
    pointerEnabled,
    wheelEnabled,
    wheelReleaseMs,
    minRefreshMs,
    scrollSelector,
    disabled,
    isControlled,
    onRefresh: on?.refresh,
  });
  cfg.current = {
    threshold,
    maxPull,
    resistance,
    refreshOffset,
    pointerEnabled,
    wheelEnabled,
    wheelReleaseMs,
    minRefreshMs,
    scrollSelector,
    disabled,
    isControlled,
    onRefresh: on?.refresh,
  };

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, []);

  const goPhase = useCallback((next: PullToRefreshPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /** Animate back to rest, then return to idle once the transition is done. */
  const settle = useCallback(() => {
    rawRef.current = 0;
    activeRef.current = false;
    setDistance(0);
    setSource(null);
    goPhase('settling');
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(
      () => {
        if (!mountedRef.current) return;
        goPhase('idle');
      },
      reducedMotion ? 0 : duration
    );
  }, [duration, goPhase, reducedMotion]);

  const startRefresh = useCallback(() => {
    const c = cfg.current;
    activeRef.current = false;
    rawRef.current = 0;
    setDistance(c.refreshOffset);
    goPhase('refreshing');

    const startedAt = now();
    let result: void | Promise<unknown>;
    try {
      result = c.onRefresh?.();
    } catch {
      // A throwing handler still ends the refresh — the consumer owns error UI.
      result = undefined;
    }

    // Controlled mode hands the exit condition to the parent: the effect below
    // settles when `refreshing` flips back to false.
    if (c.isControlled) return;

    const finish = () => {
      if (!mountedRef.current) return;
      const wait = Math.max(0, c.minRefreshMs - (now() - startedAt));
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        if (phaseRef.current === 'refreshing') settle();
      }, wait);
    };
    Promise.resolve(result).then(finish, finish);
  }, [goPhase, settle]);

  /** Feed raw input travel through damping and update the phase. */
  const applyRaw = useCallback(
    (raw: number, src: PullSource) => {
      const c = cfg.current;
      const clamped = Math.max(0, raw);
      rawRef.current = clamped;
      const next = damp(clamped * c.resistance, c.maxPull);
      setDistance(next);
      setSource(clamped > 0 ? src : null);
      goPhase(next >= c.threshold ? 'armed' : next > 0 ? 'pulling' : 'idle');
    },
    [goPhase]
  );

  /** End of gesture: refresh if armed, otherwise animate back. */
  const release = useCallback(() => {
    if (phaseRef.current === 'armed') startRefresh();
    else if (phaseRef.current === 'pulling' || rawRef.current > 0) settle();
    else {
      activeRef.current = false;
      rawRef.current = 0;
      setSource(null);
    }
  }, [settle, startRefresh]);

  /** True when a fresh gesture is allowed to begin. */
  const canStart = useCallback((): boolean => {
    const c = cfg.current;
    if (c.disabled) return false;
    return phaseRef.current === 'idle' || phaseRef.current === 'pulling' || phaseRef.current === 'armed';
  }, []);

  // --- Pointer path (mouse, touch, pen) ------------------------------------

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Clear any stale suppression so the flag can only ever swallow the one
      // click that belongs to the gesture starting now.
      suppressClickRef.current = false;
      if (!cfg.current.pointerEnabled || !canStart()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (scrollTopAt(e.target, rootRef.current, cfg.current.scrollSelector) > 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let claimed = false;

      const onMove = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== pointerId) return;
        const dy = pe.clientY - startY;
        const dx = pe.clientX - startX;

        if (!claimed) {
          // Only a mostly-vertical downward drag counts. Horizontal intent is
          // left to the page (carousels, swipe actions, text selection).
          if (dy < ACTIVATE_PX || Math.abs(dx) > Math.abs(dy)) {
            if (dy < -ACTIVATE_PX || Math.abs(dx) > ACTIVATE_PX) cleanup();
            return;
          }
          claimed = true;
          activeRef.current = true;
          suppressClickRef.current = true;
          try {
            rootRef.current?.setPointerCapture(pointerId);
          } catch {
            // Synthetic pointers in tests may reject capture — harmless.
          }
        }

        applyRaw(dy - ACTIVATE_PX, 'pointer');
      };

      const onUp = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== pointerId) return;
        if (claimed) release();
        cleanup();
      };

      const onCancel = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== pointerId) return;
        if (claimed) settle();
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    [applyRaw, canStart, release, settle]
  );

  // A pull that moved the content shouldn't also click whatever ends up under
  // the finger. Swallow exactly one click after an active pull.
  const handleClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Native touchmove is the only way to stop the browser's own overscroll
  // (iOS rubber-band, Android page pull) while we own the gesture. It has to
  // be non-passive, which React's synthetic handlers cannot express.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (activeRef.current && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  // --- Wheel path (desktop mouse wheel & trackpad) -------------------------

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const c = cfg.current;
      if (!c.wheelEnabled || !canStart()) return;

      const pulling = rawRef.current > 0;
      // Scrolling up at the top of the scroller starts (or continues) a pull.
      // Scrolling down unwinds one that is already open before the scroller
      // takes over again.
      if (!pulling) {
        if (e.deltaY >= 0) return;
        if (scrollTopAt(e.target, el, c.scrollSelector) > 0) return;
      }

      if (e.cancelable) e.preventDefault();
      activeRef.current = true;
      applyRaw(rawRef.current - e.deltaY, 'wheel');

      // No pointerup to wait for — the gesture ends when the wheel goes quiet.
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        release();
      }, c.wheelReleaseMs);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyRaw, canStart, release]);

  // --- Controlled refreshing ------------------------------------------------

  const prevRefreshingProp = useRef(refreshingProp);
  useEffect(() => {
    if (!isControlled) return;
    const prev = prevRefreshingProp.current;
    prevRefreshingProp.current = refreshingProp;

    if (refreshingProp && phaseRef.current !== 'refreshing') {
      // Parent drove the refresh (a button, a route change) — show it.
      activeRef.current = false;
      rawRef.current = 0;
      setDistance(refreshOffset);
      goPhase('refreshing');
    } else if (prev && !refreshingProp && phaseRef.current === 'refreshing') {
      settle();
    }
  }, [goPhase, isControlled, refreshOffset, refreshingProp, settle]);

  // Bail out of an in-flight gesture if the component is disabled mid-pull.
  useEffect(() => {
    if (!disabled) return;
    if (phaseRef.current === 'pulling' || phaseRef.current === 'armed') settle();
  }, [disabled, settle]);

  // --- Derived state --------------------------------------------------------

  const armed = phase === 'armed';
  const refreshing = phase === 'refreshing';
  const state: PullToRefreshState = {
    phase,
    distance,
    progress: threshold > 0 ? Math.min(1, distance / threshold) : 0,
    armed,
    refreshing,
    source,
  };

  const onStateChange = on?.stateChange;
  const lastPhase = useRef<PullToRefreshPhase>('idle');
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    onStateChange?.(stateRef.current);
  }, [onStateChange, phase]);

  // Transitions run for the refresh hold and the settle animation. While the
  // user is actively pulling, the content tracks the input 1:1 with no easing.
  const tracking = phase === 'pulling' || phase === 'armed';
  const transition =
    tracking || reducedMotion ? 'none' : `transform ${duration}ms ${easing}`;

  return (
    <div
      ref={rootRef}
      data-ptr-phase={phase}
      data-ptr-armed={armed ? '' : undefined}
      data-ptr-source={source ?? undefined}
      aria-busy={refreshing || undefined}
      className={`pull-to-refresh ${className}`.trim()}
      style={{
        position: 'relative',
        // `clip` hides the parked indicator without turning the container into
        // a scroll container, so `position: sticky` children keep working.
        overflow: 'clip',
        overscrollBehaviorY: 'contain',
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
    >
      <div
        data-ptr-indicator=""
        role="status"
        aria-live="polite"
        className={`pull-to-refresh__indicator ${indicatorClassName}`.trim()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: indicatorHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translate3d(0, ${distance - indicatorHeight}px, 0)`,
          transition,
          willChange: 'transform',
          ...indicatorStyle,
        }}
      >
        {indicator?.(state)}
      </div>

      <div
        data-ptr-content=""
        className={`pull-to-refresh__content ${contentClassName}`.trim()}
        style={{
          transform: `translate3d(0, ${distance}px, 0)`,
          transition,
          willChange: 'transform',
          userSelect: tracking ? 'none' : undefined,
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
