import { useState, useRef, useCallback, useEffect, type ReactNode, type CSSProperties, type PointerEvent } from 'react';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}

export interface MovableLauncherProps {
  children: ReactNode;
  defaultPosition?: Corner | Position;
  snapToCorners?: boolean;
  style?: CSSProperties;
  className?: string;
}

const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

function isCorner(value: unknown): value is Corner {
  return typeof value === 'string' && CORNERS.includes(value as Corner);
}

function getCornerPosition(corner: Corner, elWidth: number, elHeight: number): Position {
  const padding = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (corner) {
    case 'top-left':
      return { x: padding, y: padding };
    case 'top-right':
      return { x: vw - elWidth - padding, y: padding };
    case 'bottom-left':
      return { x: padding, y: vh - elHeight - padding };
    case 'bottom-right':
    default:
      return { x: vw - elWidth - padding, y: vh - elHeight - padding };
  }
}

function getNearestCorner(x: number, y: number, elWidth: number, elHeight: number): Corner {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = x + elWidth / 2;
  const centerY = y + elHeight / 2;

  const isLeft = centerX < vw / 2;
  const isTop = centerY < vh / 2;

  if (isTop && isLeft) return 'top-left';
  if (isTop && !isLeft) return 'top-right';
  if (!isTop && isLeft) return 'bottom-left';
  return 'bottom-right';
}

export function MovableLauncher({
  children,
  defaultPosition = 'bottom-right',
  snapToCorners = false,
  style = {},
  className = '',
}: MovableLauncherProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const snapRef = useRef(snapToCorners);
  snapRef.current = snapToCorners;
  const hasDragged = useRef(false);
  /** Tracks which corner the widget is currently anchored to. */
  const anchorCornerRef = useRef<Corner>(isCorner(defaultPosition) ? defaultPosition : 'bottom-right');
  /** Tracks last known size for computing resize deltas. */
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Initialize position after mount — no animation
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    lastSizeRef.current = { width: rect.width, height: rect.height };

    if (isCorner(defaultPosition)) {
      anchorCornerRef.current = defaultPosition;
      const { x, y } = getCornerPosition(defaultPosition, rect.width, rect.height);
      setPos({ x, y });
    } else if (typeof defaultPosition === 'object') {
      setPos({ x: defaultPosition.x ?? 0, y: defaultPosition.y ?? 0 });
    }
    // Mark as initialized after a frame so the first render has no transition
    requestAnimationFrame(() => { initializedRef.current = true; });
  }, []);

  const DRAG_THRESHOLD = 5;
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    // Don't capture or preventDefault — wait for movement past threshold
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;

    // If not yet dragging, check if we've moved past the threshold
    if (!draggingRef.current) {
      const dx = Math.abs(e.clientX - pointerStart.current.x);
      const dy = Math.abs(e.clientY - pointerStart.current.y);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      // Start dragging — now capture the pointer
      if (ref.current) {
        ref.current.setPointerCapture(pointerStart.current.id);
      }
      draggingRef.current = true;
      hasDragged.current = true;
      setDragging(true);
    }

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setPos({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    const wasDragging = draggingRef.current;
    pointerStart.current = null;

    if (!wasDragging) return; // Was a click/tap — let it propagate normally

    draggingRef.current = false;
    setDragging(false);

    if (snapRef.current && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
      anchorCornerRef.current = corner;
      lastSizeRef.current = { width: rect.width, height: rect.height };
      const snapped = getCornerPosition(corner, rect.width, rect.height);
      setPos(snapped);
    } else if (ref.current) {
      // Free-form drag — determine anchor from position
      const rect = ref.current.getBoundingClientRect();
      anchorCornerRef.current = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
      lastSizeRef.current = { width: rect.width, height: rect.height };
    }
  }, []);

  // Snap to nearest corner when snapToCorners is enabled
  useEffect(() => {
    if (!snapToCorners || !ref.current || !pos) return;
    hasDragged.current = true;
    const rect = ref.current.getBoundingClientRect();
    const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
    anchorCornerRef.current = corner;
    lastSizeRef.current = { width: rect.width, height: rect.height };
    setPos(getCornerPosition(corner, rect.width, rect.height));
  }, [snapToCorners]);

  // Reposition on window resize (full snap recalculation)
  useEffect(() => {
    const onResize = () => {
      if (!ref.current || draggingRef.current) return;
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (snapRef.current) {
        const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
        anchorCornerRef.current = corner;
        lastSizeRef.current = { width: rect.width, height: rect.height };
        setPos(getCornerPosition(corner, rect.width, rect.height));
      } else {
        setPos((prev) => {
          if (!prev) return prev;
          return {
            x: Math.min(Math.max(0, prev.x), vw - rect.width),
            y: Math.min(Math.max(0, prev.y), vh - rect.height),
          };
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Adjust position when children resize — pin to the anchor corner's edges
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      // Skip the initial observation that fires immediately on observe()
      if (first) { first = false; return; }
      if (!ref.current || draggingRef.current || !initializedRef.current) return;
      hasDragged.current = true;

      const rect = ref.current.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;
      const oldSize = lastSizeRef.current;
      lastSizeRef.current = { width: newWidth, height: newHeight };

      if (!oldSize) return;
      const dw = newWidth - oldSize.width;
      const dh = newHeight - oldSize.height;
      if (dw === 0 && dh === 0) return;

      const corner = anchorCornerRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      setPos((prev) => {
        if (!prev) return prev;
        let { x, y } = prev;

        // If anchored to a right edge, shift left when width grows
        if (corner === 'top-right' || corner === 'bottom-right') {
          x -= dw;
        }
        // If anchored to a bottom edge, shift up when height grows
        if (corner === 'bottom-left' || corner === 'bottom-right') {
          y -= dh;
        }

        // Clamp to viewport
        x = Math.min(Math.max(0, x), vw - newWidth);
        y = Math.min(Math.max(0, y), vh - newHeight);

        return { x, y };
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const posStyle: CSSProperties = pos
    ? { left: pos.x, top: pos.y, opacity: 1 }
    : { visibility: 'hidden' as const, left: 0, top: 0, opacity: 0 };

  return (
    <div
      ref={ref}
      className={`movable-launcher ${dragging ? 'movable-launcher--dragging' : ''} ${className}`}
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: dragging || !initializedRef.current
          ? 'none'
          : hasDragged.current
            ? 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'opacity 0.3s ease',
        ...posStyle,
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </div>
  );
}

export default MovableLauncher;
