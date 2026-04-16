import { useState, useRef, useCallback, useEffect, type ReactNode, type CSSProperties, type PointerEvent } from 'react';

export type SheetEdge = 'bottom' | 'top' | 'left' | 'right';

/**
 * A snap point is either a named preset, a pixel number, or a percentage
 * string. Presets resolve to:
 *   - `closed` → 0
 *   - `peek`   → 96 px (capped at viewport axis)
 *   - `half`   → 50% of the viewport axis
 *   - `full`   → 92% of the viewport axis
 * Numbers are interpreted as pixels along the drag axis. Percentage strings
 * like `'40%'` are relative to the viewport axis (height for top/bottom,
 * width for left/right).
 */
export type SnapPoint = 'closed' | 'peek' | 'half' | 'full' | number | `${number}%`;

export interface DraggableSheetProps {
  children: ReactNode;
  /** Edge the sheet is pinned to. Defaults to `'bottom'`. */
  edge?: SheetEdge;
  /** Ordered list of snap stops. Mix presets, px numbers, and `'n%'` strings. */
  snapPoints?: SnapPoint[];
  /** Uncontrolled initial stop. Defaults to the middle of `snapPoints`. */
  defaultSnap?: SnapPoint;
  /** Controlled current stop. When provided, the sheet animates to this value on change. */
  snap?: SnapPoint;
  /** Fires after a drag release or a controlled change, with both the original SnapPoint and its resolved pixel size. */
  onSnapChange?: (snap: SnapPoint, sizePx: number) => void;
  /** Whether the user can drag the sheet. Defaults to true. */
  draggable?: boolean;
  /**
   * Optional CSS selector for a nested drag handle. When set, drags only
   * begin inside matching elements, leaving the rest of the sheet free for
   * inner scroll or clicks.
   */
  dragHandleSelector?: string;
  /** Flick velocity in px/ms above which a release advances one stop in the flick direction. Defaults to 0.5. */
  velocityThreshold?: number;
  /**
   * When true, a pointerdown outside the sheet closes it. "Close" means
   * collapsing to 0 px and emitting `onSnapChange('closed', 0)`. In
   * controlled mode the parent is responsible for applying the new stop; in
   * uncontrolled mode the sheet handles the transition itself. Ignored while
   * the sheet is already closed to avoid loops.
   */
  closeOnOutsideClick?: boolean;
  style?: CSSProperties;
  className?: string;
}

const PEEK_DEFAULT_PX = 96;
const HALF_RATIO = 0.5;
const FULL_RATIO = 0.92;
const DRAG_THRESHOLD = 5;

function viewportAxis(edge: SheetEdge): number {
  return edge === 'left' || edge === 'right' ? window.innerWidth : window.innerHeight;
}

function resolveSnap(point: SnapPoint, viewportSize: number): number {
  if (point === 'closed') return 0;
  if (point === 'peek') return Math.min(PEEK_DEFAULT_PX, viewportSize);
  if (point === 'half') return viewportSize * HALF_RATIO;
  if (point === 'full') return viewportSize * FULL_RATIO;
  if (typeof point === 'number') return Math.max(0, point);
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(point);
  if (match) return Math.max(0, (parseFloat(match[1]) / 100) * viewportSize);
  return 0;
}

function snapDataValue(point: SnapPoint): string {
  return typeof point === 'number' ? String(point) : point;
}

export function DraggableSheet({
  children,
  edge = 'bottom',
  snapPoints = ['peek', 'half', 'full'],
  defaultSnap,
  snap: controlledSnap,
  onSnapChange,
  draggable = true,
  dragHandleSelector,
  velocityThreshold = 0.5,
  closeOnOutsideClick = false,
  style = {},
  className = '',
}: DraggableSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isControlled = controlledSnap !== undefined;

  const initialSnap: SnapPoint =
    controlledSnap ??
    defaultSnap ??
    snapPoints[Math.floor(snapPoints.length / 2)] ??
    'half';

  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnap);
  const currentSnapRef = useRef<SnapPoint>(initialSnap);
  const [sizePx, setSizePx] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : resolveSnap(initialSnap, viewportAxis(edge)),
  );
  const sizePxRef = useRef<number>(sizePx);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const setSizeBoth = useCallback((next: number) => {
    sizePxRef.current = next;
    setSizePx(next);
  }, []);

  const setSnapBoth = useCallback((next: SnapPoint) => {
    currentSnapRef.current = next;
    setCurrentSnap(next);
  }, []);

  // Pointer gesture state. `lastMove` tracks a single-frame signed velocity
  // in px/ms where positive means the sheet is growing — used only at
  // release time to bias the stop selection on flicks.
  const pointerStart = useRef<{ x: number; y: number; id: number; startSize: number } | null>(null);
  const lastMove = useRef<{ t: number; v: number } | null>(null);
  const commitRef = useRef<() => void>(() => {});
  const abortRef = useRef<() => void>(() => {});
  const processMoveRef = useRef<(x: number, y: number, id: number) => void>(() => {});

  // Controlled sync: when the parent drives `snap`, animate to the new stop.
  // Ignored mid-gesture so the user's drag isn't yanked back by a stale prop.
  useEffect(() => {
    if (!isControlled || controlledSnap === undefined) return;
    if (draggingRef.current) return;
    setSnapBoth(controlledSnap);
    setSizeBoth(resolveSnap(controlledSnap, viewportAxis(edge)));
  }, [controlledSnap, edge, isControlled, setSizeBoth, setSnapBoth]);

  // Reposition on viewport resize and on edge change — resolve the current
  // snap against the (possibly new) axis so `'half'` stays 50% of the
  // viewport after a rotate or resize.
  useEffect(() => {
    const reflow = () => {
      if (draggingRef.current) return;
      setSizeBoth(resolveSnap(currentSnapRef.current, viewportAxis(edge)));
    };
    reflow();
    window.addEventListener('resize', reflow);
    return () => window.removeEventListener('resize', reflow);
  }, [edge, setSizeBoth]);

  // Outside-click to close. Attaches a capture-phase window listener so it
  // fires before the sheet's own pointerdown handler could start a gesture
  // on the sheet element itself. Skipped when the sheet is already at size
  // 0 to avoid loops, and skipped mid-drag so release commits still work.
  useEffect(() => {
    if (!closeOnOutsideClick) return;
    const onWindowPointerDown = (ev: globalThis.PointerEvent) => {
      if (draggingRef.current) return;
      if (sizePxRef.current === 0) return;
      if (!ref.current) return;
      if (ev.target instanceof Node && ref.current.contains(ev.target)) return;
      if (!isControlled) {
        setSnapBoth('closed');
        setSizeBoth(0);
      }
      onSnapChange?.('closed', 0);
    };
    window.addEventListener('pointerdown', onWindowPointerDown, true);
    return () => window.removeEventListener('pointerdown', onWindowPointerDown, true);
  }, [closeOnOutsideClick, isControlled, onSnapChange, setSizeBoth, setSnapBoth]);

  const isInDragRegion = useCallback((target: EventTarget | null): boolean => {
    if (!dragHandleSelector) return true;
    if (!(target instanceof Element) || !ref.current) return false;
    const handle = ref.current.querySelector(dragHandleSelector);
    return !!handle && handle.contains(target);
  }, [dragHandleSelector]);

  const processMove = useCallback((clientX: number, clientY: number, pointerId: number) => {
    if (!pointerStart.current || !ref.current) return;
    if (pointerId !== pointerStart.current.id) return;

    const dx = clientX - pointerStart.current.x;
    const dy = clientY - pointerStart.current.y;

    if (!draggingRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      try {
        ref.current.setPointerCapture(pointerStart.current.id);
      } catch {
        /* ignore — synthetic pointers in tests may reject capture */
      }
      draggingRef.current = true;
      setDragging(true);
    }

    // Pointer-axis delta → signed size delta, where positive grows the sheet.
    let delta: number;
    switch (edge) {
      case 'bottom': delta = -dy; break;
      case 'top': delta = dy; break;
      case 'left': delta = dx; break;
      case 'right': delta = -dx; break;
    }

    const vpSize = viewportAxis(edge);
    const nextSize = Math.max(0, Math.min(vpSize, pointerStart.current.startSize + delta));

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (lastMove.current) {
      const dt = now - lastMove.current.t;
      if (dt > 0) lastMove.current = { t: now, v: (nextSize - sizePxRef.current) / dt };
      else lastMove.current.t = now;
    } else {
      lastMove.current = { t: now, v: 0 };
    }

    setSizeBoth(nextSize);
  }, [edge, setSizeBoth]);

  const clearGesture = useCallback(() => {
    pointerStart.current = null;
    lastMove.current = null;
    if (!draggingRef.current) return false;
    draggingRef.current = false;
    setDragging(false);
    return true;
  }, []);

  const commitGesture = useCallback(() => {
    // Capture velocity before clearGesture resets lastMove.
    const velocity = lastMove.current?.v ?? 0;
    const wasDragging = clearGesture();
    if (!wasDragging) return;
    if (snapPoints.length === 0) return;

    const vpSize = viewportAxis(edge);
    const resolved = snapPoints
      .map((p) => ({ point: p, px: resolveSnap(p, vpSize) }))
      .sort((a, b) => a.px - b.px);

    const current = sizePxRef.current;

    let targetIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < resolved.length; i++) {
      const d = Math.abs(resolved[i].px - current);
      if (d < nearestDist) { nearestDist = d; targetIdx = i; }
    }

    // Velocity bias: a fast flick advances one stop from the previous
    // committed snap in the flick direction, skipping the "closest" rule so
    // quick swipes feel decisive even if the finger only moved a little.
    if (Math.abs(velocity) >= velocityThreshold) {
      const prevIdx = resolved.findIndex((r) => r.point === currentSnapRef.current);
      if (prevIdx >= 0) {
        if (velocity > 0 && prevIdx < resolved.length - 1) targetIdx = prevIdx + 1;
        else if (velocity < 0 && prevIdx > 0) targetIdx = prevIdx - 1;
      }
    }

    const target = resolved[targetIdx];
    if (!isControlled) {
      setSizeBoth(target.px);
      setSnapBoth(target.point);
    } else {
      // In controlled mode, snap back to the controlled prop value so the
      // sheet doesn't stay at the transient dragged size when the parent
      // doesn't change the snap prop.
      setSizeBoth(resolveSnap(controlledSnap!, vpSize));
    }
    onSnapChange?.(target.point, target.px);
  }, [clearGesture, controlledSnap, edge, isControlled, onSnapChange, setSizeBoth, setSnapBoth, snapPoints, velocityThreshold]);

  // Aborted gesture (pointercancel / lost capture): restore the last
  // committed stop instead of leaving the sheet at whatever intermediate
  // size the drag happened to reach.
  const abortGesture = useCallback(() => {
    const wasDragging = clearGesture();
    if (!wasDragging) return;
    setSizeBoth(resolveSnap(currentSnapRef.current, viewportAxis(edge)));
  }, [clearGesture, edge, setSizeBoth]);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !ref.current) return;
    if (!isInDragRegion(e.target)) return;
    if (pointerStart.current) abortRef.current();

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      startSize: sizePxRef.current,
    };
    lastMove.current = { t: typeof performance !== 'undefined' ? performance.now() : Date.now(), v: 0 };

    // Window listeners mirror SnapDock: handle fast drags that leave the
    // sheet pre-capture, releases outside the element, and cancellations.
    const onGlobalMove = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (!pointerStart.current || pe.pointerId !== pointerStart.current.id) return;
      processMoveRef.current(pe.clientX, pe.clientY, pe.pointerId);
    };
    const onGlobalUp = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (pointerStart.current && pe.pointerId !== pointerStart.current.id) return;
      commitRef.current();
      cleanup();
    };
    const onGlobalCancel = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (pointerStart.current && pe.pointerId !== pointerStart.current.id) return;
      abortRef.current();
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalCancel);
    };
    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalCancel);
  }, [draggable, isInDragRegion]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    processMove(e.clientX, e.clientY, e.pointerId);
  }, [processMove]);

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
    commitGesture();
  }, [commitGesture]);

  const handlePointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
    abortGesture();
  }, [abortGesture]);

  commitRef.current = commitGesture;
  abortRef.current = abortGesture;
  processMoveRef.current = processMove;

  const axisIsVertical = edge === 'bottom' || edge === 'top';
  const positionStyle: CSSProperties = (() => {
    switch (edge) {
      case 'bottom': return { left: 0, right: 0, bottom: 0, height: sizePx };
      case 'top': return { left: 0, right: 0, top: 0, height: sizePx };
      case 'left': return { left: 0, top: 0, bottom: 0, width: sizePx };
      case 'right': return { right: 0, top: 0, bottom: 0, width: sizePx };
    }
  })();

  const transition = dragging
    ? 'none'
    : `${axisIsVertical ? 'height' : 'width'} 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)`;

  return (
    <div
      ref={ref}
      data-edge={edge}
      data-snap={snapDataValue(currentSnap)}
      data-dragging={dragging ? '' : undefined}
      className={`draggable-sheet ${dragging ? 'draggable-sheet--dragging' : ''} ${className}`}
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        touchAction: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        transition,
        ...positionStyle,
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {children}
    </div>
  );
}
