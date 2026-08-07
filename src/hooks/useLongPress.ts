import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { PointerType } from './useDrag';

/** Why an armed press ended without firing. */
export type LongPressCancelReason = 'moved' | 'released' | 'cancelled' | 'manual';

export interface LongPressState {
  pointerId: number;
  pointerType: string;
  /** Client coords of the press. */
  x: number;
  y: number;
  /** Native event that armed the press. */
  event: globalThis.PointerEvent | null;
}

export interface UseLongPressOptions {
  /** Hold time in ms before the press fires. Defaults to `400`. */
  delay?: number;
  /**
   * Movement in px that cancels an armed press. Keep this below the drag
   * threshold of whatever the long press hands off to. Defaults to `8`.
   */
  moveTolerance?: number;
  /** Restrict which pointer types can arm a press. Defaults to all. */
  pointerTypes?: PointerType[];
  /** Mouse button that arms a press. Defaults to `0` (primary). */
  button?: number;
  /** Ignore all pointer input while true. */
  disabled?: boolean;
  /**
   * Suppress the context menu while a press is armed, so a touch-and-hold
   * reaches this hook instead of the browser's own menu. Defaults to `true`.
   */
  preventContextMenu?: boolean;
  /** Fires when the hold time elapses without the press being cancelled. */
  onLongPress?: (state: LongPressState) => void;
  /** Fires on `pointerdown`, when the timer is armed. */
  onPressStart?: (state: LongPressState) => void;
  /** Fires when an armed press ends before `delay`. */
  onCancel?: (state: LongPressState, reason: LongPressCancelReason) => void;
}

export interface LongPressHandlers<T extends HTMLElement = HTMLElement> {
  onPointerDown: (e: ReactPointerEvent<T>) => void;
  onPointerMove: (e: ReactPointerEvent<T>) => void;
  onPointerUp: (e: ReactPointerEvent<T>) => void;
  onPointerCancel: (e: ReactPointerEvent<T>) => void;
  onContextMenu: (e: ReactMouseEvent<T>) => void;
}

export interface UseLongPressResult<T extends HTMLElement = HTMLElement> {
  /** True between `pointerdown` and either firing or cancelling. */
  pressing: boolean;
  /** True once the hold time has elapsed, until the pointer is released. */
  fired: boolean;
  /** Spread onto the press target. */
  handlers: LongPressHandlers<T>;
  /** Disarm an armed press without firing. */
  cancel: () => void;
}

const DEFAULT_DELAY = 400;
const DEFAULT_MOVE_TOLERANCE = 8;

/**
 * Press-and-hold, the touch-friendly way to arm a drag on a surface that also
 * scrolls — a sortable row inside a scrolling list being the case this exists
 * for. Movement beyond `moveTolerance` before the hold elapses cancels the
 * press and leaves the scroll gesture alone.
 *
 * Set `touchAction: 'none'` on the target only *after* the press fires;
 * setting it upfront makes the surface unscrollable.
 *
 * SSR-safe: the timer is only armed by a real pointer event.
 *
 * ```tsx
 * const { pressing, fired, handlers } = useLongPress({
 *   pointerTypes: ['touch', 'pen'],
 *   onLongPress: () => setDragArmed(true),
 * });
 *
 * <li {...handlers} data-armed={fired ? '' : undefined} />
 * ```
 */
export function useLongPress<T extends HTMLElement = HTMLElement>(
  options: UseLongPressOptions = {},
): UseLongPressResult<T> {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [pressing, setPressing] = useState(false);
  const [fired, setFired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<LongPressState | null>(null);
  const firedRef = useRef(false);

  const disarm = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stateRef.current = null;
    firedRef.current = false;
    setPressing(false);
    setFired(false);
  }, []);

  const cancelWith = useCallback(
    (reason: LongPressCancelReason) => {
      const state = stateRef.current;
      const wasArmed = timerRef.current !== null;
      const hadFired = firedRef.current;
      disarm();
      // Only an armed-but-not-yet-fired press is a cancellation; once it has
      // fired, the release is a normal end of gesture.
      if (state && wasArmed && !hadFired) optsRef.current.onCancel?.(state, reason);
    },
    [disarm],
  );

  const cancelRef = useRef(cancelWith);
  cancelRef.current = cancelWith;

  const onPointerDown = useCallback((e: ReactPointerEvent<T>) => {
    const o = optsRef.current;
    if (o.disabled) return;
    if (e.pointerType === 'mouse' && e.button !== (o.button ?? 0)) return;
    if (o.pointerTypes && !o.pointerTypes.includes(e.pointerType as PointerType)) return;

    // A new press supersedes any pending one.
    if (stateRef.current) cancelRef.current('cancelled');

    const state: LongPressState = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      x: e.clientX,
      y: e.clientY,
      event: e.nativeEvent,
    };
    stateRef.current = state;
    firedRef.current = false;
    setPressing(true);
    setFired(false);
    o.onPressStart?.(state);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const current = stateRef.current;
      if (!current) return;
      firedRef.current = true;
      setFired(true);
      optsRef.current.onLongPress?.(current);
    }, o.delay ?? DEFAULT_DELAY);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<T>) => {
    const state = stateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
    if (firedRef.current) return;
    const tolerance = optsRef.current.moveTolerance ?? DEFAULT_MOVE_TOLERANCE;
    if (Math.hypot(e.clientX - state.x, e.clientY - state.y) < tolerance) return;
    cancelRef.current('moved');
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<T>) => {
    const state = stateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
    cancelRef.current('released');
  }, []);

  const onPointerCancel = useCallback((e: ReactPointerEvent<T>) => {
    const state = stateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
    cancelRef.current('cancelled');
  }, []);

  const onContextMenu = useCallback((e: ReactMouseEvent<T>) => {
    if (!stateRef.current) return;
    if (optsRef.current.preventContextMenu ?? true) e.preventDefault();
  }, []);

  const cancel = useCallback(() => cancelRef.current('manual'), []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handlers = useMemo<LongPressHandlers<T>>(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu],
  );

  return { pressing, fired, handlers, cancel };
}

export default useLongPress;
