import { useState, useRef, useCallback, useEffect, useLayoutEffect, type ReactNode, type CSSProperties, type PointerEvent } from 'react';

export type Edge = 'left' | 'right' | 'top' | 'bottom';
export type Orientation = 'vertical' | 'horizontal';

export interface SnapDockProps {
  children: ReactNode;
  defaultEdge?: Edge;
  /** Position along the edge, 0..1. 0 = top/left, 1 = bottom/right. */
  defaultOffset?: number;
  /** Whether the user can drag the dock. Defaults to true. */
  draggable?: boolean;
  /** Snap to the nearest edge when released. Defaults to true. */
  snap?: boolean;
  /** Distance in px from the edge. Defaults to 16. */
  edgePadding?: number;
  /** When true, applies a default drop shadow. Override via `style.boxShadow`. Defaults to false. */
  shadow?: boolean;
  onEdgeChange?: (edge: Edge) => void;
  onOffsetChange?: (offset: number) => void;
  style?: CSSProperties;
  className?: string;
}

const EDGES: Edge[] = ['left', 'right', 'top', 'bottom'];

function isEdge(value: unknown): value is Edge {
  return typeof value === 'string' && EDGES.includes(value as Edge);
}

function orientationFor(edge: Edge): Orientation {
  return edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal';
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

interface Position {
  x: number;
  y: number;
}

function positionFor(
  edge: Edge,
  offset: number,
  width: number,
  height: number,
  edgePadding: number,
): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const o = clamp(offset, 0, 1);

  switch (edge) {
    case 'left':
      return { x: edgePadding, y: clamp(o * (vh - height), 0, vh - height) };
    case 'right':
      return { x: vw - width - edgePadding, y: clamp(o * (vh - height), 0, vh - height) };
    case 'top':
      return { x: clamp(o * (vw - width), 0, vw - width), y: edgePadding };
    case 'bottom':
    default:
      return { x: clamp(o * (vw - width), 0, vw - width), y: vh - height - edgePadding };
  }
}

function nearestEdge(x: number, y: number, width: number, height: number): Edge {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const distLeft = x;
  const distRight = vw - (x + width);
  const distTop = y;
  const distBottom = vh - (y + height);
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) return 'left';
  if (min === distRight) return 'right';
  if (min === distTop) return 'top';
  return 'bottom';
}

function offsetFor(edge: Edge, x: number, y: number, width: number, height: number): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (edge === 'left' || edge === 'right') {
    const range = vh - height;
    return range <= 0 ? 0 : clamp(y / range, 0, 1);
  }
  const range = vw - width;
  return range <= 0 ? 0 : clamp(x / range, 0, 1);
}

export function SnapDock({
  children,
  defaultEdge = 'left',
  defaultOffset = 0.5,
  draggable = true,
  snap = true,
  edgePadding = 16,
  shadow = false,
  onEdgeChange,
  onOffsetChange,
  style = {},
  className = '',
}: SnapDockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const posRef = useRef<Position | null>(null);
  const setPosBoth = useCallback((next: Position) => {
    posRef.current = next;
    setPos(next);
  }, []);
  const [dragging, setDragging] = useState(false);

  const initialEdge: Edge = isEdge(defaultEdge) ? defaultEdge : 'left';
  const [edge, setEdge] = useState<Edge>(initialEdge);
  const edgeRef = useRef<Edge>(initialEdge);
  const offsetRef = useRef<number>(clamp(defaultOffset, 0, 1));
  const orientation = orientationFor(edge);
  const prevOrientationRef = useRef<Orientation>(orientation);
  const flipFromRef = useRef<{ width: number; height: number } | null>(null);
  const [flipTransform, setFlipTransform] = useState<string | null>(null);
  const sizeRef = useRef<{ width: number; height: number } | null>(null);
  const draggingRef = useRef(false);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const initializedRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const commitRef = useRef<() => void>(() => {});
  const abortRef = useRef<() => void>(() => {});
  const processMoveRef = useRef<(clientX: number, clientY: number, pointerId: number) => void>(() => {});
  const DRAG_THRESHOLD = 5;

  const emitEdge = useCallback((next: Edge) => {
    if (edgeRef.current !== next) {
      const prevOrientation = orientationFor(edgeRef.current);
      const nextOrientation = orientationFor(next);
      if (prevOrientation !== nextOrientation && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        flipFromRef.current = { width: rect.width, height: rect.height };
      }
      edgeRef.current = next;
      setEdge(next);
      onEdgeChange?.(next);
    }
  }, [onEdgeChange]);

  const emitOffset = useCallback((next: number) => {
    if (offsetRef.current !== next) {
      offsetRef.current = next;
      onOffsetChange?.(next);
    }
  }, [onOffsetChange]);

  // Initial placement + re-pin when edgePadding changes live.
  // This effect doubles as the mount placement and as a responder to
  // edgePadding updates, so a dock rendered with edgePadding={16} and
  // later rerendered with edgePadding={40} slides to the new inset
  // without waiting for a resize or content-size change.
  useEffect(() => {
    if (!ref.current) return;
    if (draggingRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    sizeRef.current = { width: rect.width, height: rect.height };
    setPosBoth(positionFor(edgeRef.current, offsetRef.current, rect.width, rect.height, edgePadding));
    if (!initializedRef.current) {
      requestAnimationFrame(() => { initializedRef.current = true; });
    }
  }, [edgePadding, setPosBoth]);

  /**
   * Shared gesture-move logic used by both the element-level React handler
   * and the window pointermove listener installed during a pending gesture.
   * The window listener matters for fast drags that leave the dock before
   * any element-level move fires — without it the gesture never crosses
   * the threshold and the click vs. drag heuristic never triggers capture.
   */
  const processMove = useCallback((clientX: number, clientY: number, pointerId: number) => {
    if (!pointerStart.current || !ref.current) return;
    if (pointerId !== pointerStart.current.id) return;

    if (!draggingRef.current) {
      const dx = Math.abs(clientX - pointerStart.current.x);
      const dy = Math.abs(clientY - pointerStart.current.y);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      // Try to take pointer capture so subsequent moves route through the
      // element handler. Wrapped in try/catch because tests and some older
      // browsers may reject capture for synthetic pointers.
      try {
        ref.current.setPointerCapture(pointerStart.current.id);
      } catch {
        /* ignore */
      }
      draggingRef.current = true;
      hasDraggedRef.current = true;
      setDragging(true);
    }

    const newX = clientX - dragOffset.current.x;
    const newY = clientY - dragOffset.current.y;
    setPosBoth({ x: newX, y: newY });
  }, [setPosBoth]);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !ref.current) return;
    if (pointerStart.current) abortRef.current();

    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };

    // Gesture can end / move in several ways the element handlers may not see:
    //   - Fast drag whose movement first lands outside the dock before
    //     crossing the 5 px threshold (pre-capture pointermove goes to
    //     another element, so our element onPointerMove never fires).
    //   - Press released outside the dock before capture (no onPointerUp).
    //   - Active drag cancelled by the OS / browser gesture (pointercancel).
    //   - Pointer capture stolen (lostpointercapture).
    // Window listeners cover those. pointerup → commit, pointercancel → abort,
    // pointermove → shared processMove via ref.
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
  }, [draggable]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    processMove(e.clientX, e.clientY, e.pointerId);
  }, [processMove]);

  /** Shared state-clearing path used by both commit and abort. */
  const clearGestureState = useCallback(() => {
    pointerStart.current = null;
    if (!draggingRef.current) return false;
    draggingRef.current = false;
    setDragging(false);
    return true;
  }, []);

  /** Normal drop — clear state and fire edge/offset callbacks, optionally snap. */
  const commitGesture = useCallback(() => {
    const wasDragging = clearGestureState();
    if (!wasDragging) return;
    if (!ref.current || !posRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width || sizeRef.current?.width || 0;
    const height = rect.height || sizeRef.current?.height || 0;
    sizeRef.current = { width, height };

    const { x, y } = posRef.current;
    const edge = nearestEdge(x, y, width, height);
    const offset = offsetFor(edge, x, y, width, height);
    emitEdge(edge);
    emitOffset(offset);

    if (snapRef.current) {
      setPosBoth(positionFor(edge, offset, width, height, edgePadding));
    }
  }, [clearGestureState, edgePadding, emitEdge, emitOffset, setPosBoth]);

  /** Aborted gesture (pointercancel / lost capture) — clear state only. */
  const abortGesture = useCallback(() => {
    clearGestureState();
  }, [clearGestureState]);

  // Element-level handlers filter on the active pointer id so a secondary
  // pointer can't commit or abort someone else's drag.
  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
    commitGesture();
  }, [commitGesture]);

  const handlePointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
    abortGesture();
  }, [abortGesture]);

  // Keep refs pointing at the latest closures so window-level listeners
  // installed in handlePointerDown always call the up-to-date version.
  commitRef.current = commitGesture;
  abortRef.current = abortGesture;
  processMoveRef.current = processMove;

  // FLIP-style animation when orientation flips (left/right ↔ top/bottom).
  // Captures the wrapper's old size, applies an inverse scale, then transitions to identity.
  useLayoutEffect(() => {
    if (prevOrientationRef.current === orientation) return;
    prevOrientationRef.current = orientation;
    if (!ref.current || !flipFromRef.current) return;

    const from = flipFromRef.current;
    flipFromRef.current = null;
    const newRect = ref.current.getBoundingClientRect();
    if (newRect.width === 0 || newRect.height === 0) return;

    const sx = from.width / newRect.width;
    const sy = from.height / newRect.height;
    if (sx === 1 && sy === 1) return;

    setFlipTransform(`scale(${sx}, ${sy})`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipTransform(null));
    });
  }, [orientation]);

  // Reposition on viewport resize
  useEffect(() => {
    const onResize = () => {
      if (!ref.current || draggingRef.current) return;
      const rect = ref.current.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      setPosBoth(positionFor(edgeRef.current, offsetRef.current, rect.width, rect.height, edgePadding));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [edgePadding]);

  // Reposition when child size changes — keep pinned to current edge/offset
  useEffect(() => {
    if (!ref.current) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) { first = false; return; }
      if (!ref.current || draggingRef.current || !initializedRef.current) return;
      const rect = ref.current.getBoundingClientRect();
      const oldSize = sizeRef.current;
      sizeRef.current = { width: rect.width, height: rect.height };
      if (!oldSize) return;
      if (oldSize.width === rect.width && oldSize.height === rect.height) return;
      setPosBoth(positionFor(edgeRef.current, offsetRef.current, rect.width, rect.height, edgePadding));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [edgePadding]);

  const posStyle: CSSProperties = pos
    ? { left: pos.x, top: pos.y, opacity: 1 }
    : { visibility: 'hidden' as const, left: 0, top: 0, opacity: 0 };

  const transformOrigin: Record<Edge, string> = {
    left: 'left center',
    right: 'right center',
    top: 'center top',
    bottom: 'center bottom',
  };

  const positionTransition = hasDraggedRef.current
    ? 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
    : 'opacity 0.3s ease';
  const flipTransition = 'transform 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)';
  const transition = dragging || !initializedRef.current
    ? (flipTransform === null ? 'none' : flipTransition)
    : `${positionTransition}, ${flipTransition}`;

  return (
    <div
      ref={ref}
      data-edge={edge}
      data-orientation={orientation}
      data-dragging={dragging ? '' : undefined}
      className={`snap-dock ${dragging ? 'snap-dock--dragging' : ''} ${className}`}
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        cursor: draggable ? (dragging ? 'grabbing' : 'grab') : undefined,
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        boxShadow: shadow ? '0 10px 30px rgba(0, 0, 0, 0.18)' : undefined,
        transformOrigin: transformOrigin[edge],
        transform: flipTransform ?? undefined,
        transition,
        ...posStyle,
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

export default SnapDock;
