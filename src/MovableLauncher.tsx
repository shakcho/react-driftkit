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

  // Initialize position after mount
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();

    if (isCorner(defaultPosition)) {
      const { x, y } = getCornerPosition(defaultPosition, rect.width, rect.height);
      setPos({ x, y });
    } else if (typeof defaultPosition === 'object') {
      setPos({ x: defaultPosition.x ?? 0, y: defaultPosition.y ?? 0 });
    }
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggingRef.current = true;
    hasDragged.current = true;
    setDragging(true);
    ref.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setPos({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    if (snapRef.current && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
      const snapped = getCornerPosition(corner, rect.width, rect.height);
      setPos(snapped);
    }
  }, []);

  // Snap to nearest corner when snapToCorners is enabled
  useEffect(() => {
    if (!snapToCorners || !ref.current || !pos) return;
    hasDragged.current = true;
    const rect = ref.current.getBoundingClientRect();
    const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
    setPos(getCornerPosition(corner, rect.width, rect.height));
  }, [snapToCorners]);

  // Reposition on window resize
  useEffect(() => {
    const onResize = () => {
      if (!ref.current || draggingRef.current) return;
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (snapRef.current) {
        const corner = getNearestCorner(rect.left, rect.top, rect.width, rect.height);
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
        transition: dragging
          ? 'none'
          : hasDragged.current
            ? 'left 0.25s ease, top 0.25s ease'
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
