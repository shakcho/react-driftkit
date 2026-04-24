import { useState, useRef, useCallback, useEffect, Children, type ReactNode, type CSSProperties, type PointerEvent } from 'react';

export type SplitOrientation = 'horizontal' | 'vertical';

export interface HandleInfo {
  /** Boundary index (0 = between pane 0 and pane 1). */
  index: number;
  /** Whether this specific handle is being dragged. */
  isDragging: boolean;
  /** Current orientation of the splitter. */
  orientation: SplitOrientation;
}

export interface ResizableSplitPaneProps {
  /** Two or more child elements to render in the split panes. */
  children: ReactNode[];
  /** Split direction. `'horizontal'` puts panes side-by-side; `'vertical'` stacks them. Defaults to `'horizontal'`. */
  orientation?: SplitOrientation;
  /** Uncontrolled initial sizes as ratios summing to 1 (e.g. `[0.25, 0.5, 0.25]`). Defaults to equal split. */
  defaultSizes?: number[];
  /** Controlled sizes. When provided, the splitter is fully controlled by the parent. */
  sizes?: number[];
  /** Fires after a drag release with the committed sizes array. */
  onSizesChange?: (sizes: number[]) => void;
  /** Fires continuously while dragging with the live sizes array. */
  onDrag?: (sizes: number[]) => void;
  /** Minimum size in pixels for any pane. Defaults to `50`. */
  minSize?: number;
  /** Maximum size in pixels for any pane. No limit when omitted. */
  maxSize?: number;
  /** Thickness of each drag handle in pixels. Defaults to `8`. */
  handleSize?: number;
  /**
   * Render prop for each drag handle. Called once per boundary with info
   * about that handle. When omitted, a default empty div is rendered.
   */
  handle?: (info: HandleInfo) => ReactNode;
  /** localStorage key to persist the sizes across sessions. Omit to disable persistence. */
  persistKey?: string;
  /** Whether the user can drag the handles. Defaults to `true`. */
  draggable?: boolean;
  /** Double-click a handle to reset to `defaultSizes` (or equal split). Defaults to `true`. */
  doubleClickReset?: boolean;
  style?: CSSProperties;
  className?: string;
}

const DRAG_THRESHOLD = 3;

function equalSizes(n: number): number[] {
  return Array.from({ length: n }, () => 1 / n);
}

function normalizeSizes(sizes: number[], count: number): number[] {
  if (sizes.length !== count) return equalSizes(count);
  const sum = sizes.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalSizes(count);
  return sizes.map((s) => s / sum);
}

/**
 * Clamp sizes[i] and sizes[i+1] so both respect minSize/maxSize,
 * redistributing only between those two panes.
 */
function clampPair(
  sizes: number[],
  i: number,
  minSize: number,
  maxSize: number | undefined,
  available: number,
): number[] {
  const next = [...sizes];
  const pair = next[i] + next[i + 1];

  const minRatio = available > 0 ? minSize / available : 0;
  const maxRatio = maxSize !== undefined && available > 0 ? maxSize / available : pair;

  // If constraints conflict, split the pair evenly.
  if (minRatio > maxRatio || 2 * minRatio > pair) {
    next[i] = pair / 2;
    next[i + 1] = pair / 2;
    return next;
  }

  // Clamp pane i, then clamp pane i+1, then re-check pane i.
  let a = Math.max(minRatio, Math.min(maxRatio, next[i]));
  let b = pair - a;
  b = Math.max(minRatio, Math.min(maxRatio, b));
  a = pair - b;
  a = Math.max(minRatio, Math.min(maxRatio, a));

  next[i] = a;
  next[i + 1] = pair - a;
  return next;
}

function readPersistedSizes(key: string | undefined, count: number): number[] | null {
  if (!key) return null;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    const arr = JSON.parse(stored);
    if (!Array.isArray(arr) || arr.length !== count) return null;
    if (!arr.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) return null;
    const sum = arr.reduce((a: number, b: number) => a + b, 0);
    if (sum <= 0) return null;
    return arr.map((v: number) => v / sum);
  } catch {
    return null;
  }
}

function persistSizes(key: string | undefined, sizes: number[]): void {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(sizes));
  } catch {
    /* quota or security — silently ignore */
  }
}

export function ResizableSplitPane({
  children,
  orientation = 'horizontal',
  defaultSizes,
  sizes: controlledSizes,
  onSizesChange,
  onDrag,
  minSize = 50,
  maxSize,
  handleSize = 8,
  handle,
  persistKey,
  draggable = true,
  doubleClickReset = true,
  style = {},
  className = '',
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const childArray = Children.toArray(children);
  const count = childArray.length;
  const isControlled = controlledSizes !== undefined;

  const defaults = defaultSizes ? normalizeSizes(defaultSizes, count) : equalSizes(count);
  const initial = controlledSizes
    ? normalizeSizes(controlledSizes, count)
    : readPersistedSizes(persistKey, count) ?? defaults;

  const [internalSizes, setInternalSizes] = useState(initial);
  const sizesRef = useRef(initial);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);

  const setSizesBoth = useCallback((next: number[]) => {
    sizesRef.current = next;
    setInternalSizes(next);
  }, []);

  // Controlled sync.
  useEffect(() => {
    if (!isControlled || controlledSizes === undefined) return;
    if (draggingRef.current !== null) return;
    const normalized = normalizeSizes(controlledSizes, count);
    sizesRef.current = normalized;
    setInternalSizes(normalized);
  }, [controlledSizes, isControlled, count]);

  // Pointer gesture state.
  const pointerState = useRef<{
    id: number;
    startPos: number;
    startSizes: number[];
    handleIndex: number;
    containerSize: number;
  } | null>(null);
  const commitRef = useRef<() => void>(() => {});
  const abortRef = useRef<() => void>(() => {});
  const processMoveRef = useRef<(pos: number, id: number) => void>(() => {});

  const getContainerSize = useCallback((): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return orientation === 'horizontal' ? rect.width : rect.height;
  }, [orientation]);

  const processMove = useCallback((clientPos: number, pointerId: number) => {
    const ps = pointerState.current;
    if (!ps || pointerId !== ps.id) return;

    const delta = clientPos - ps.startPos;

    if (draggingRef.current === null) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      draggingRef.current = ps.handleIndex;
      setDraggingIndex(ps.handleIndex);
    }

    const numHandles = ps.startSizes.length - 1;
    const available = ps.containerSize - handleSize * numHandles;
    if (available <= 0) return;

    const ratioDelta = delta / available;
    const i = ps.handleIndex;

    // Start from snapshot and redistribute between pane i and i+1.
    const next = [...ps.startSizes];
    next[i] = ps.startSizes[i] + ratioDelta;
    next[i + 1] = ps.startSizes[i + 1] - ratioDelta;

    const clamped = clampPair(next, i, minSize, maxSize, available);
    setSizesBoth(clamped);
    onDrag?.(clamped);
  }, [handleSize, minSize, maxSize, setSizesBoth, onDrag]);

  const clearGesture = useCallback(() => {
    pointerState.current = null;
    if (draggingRef.current === null) return false;
    draggingRef.current = null;
    setDraggingIndex(null);
    return true;
  }, []);

  const commitGesture = useCallback(() => {
    const wasDragging = clearGesture();
    if (!wasDragging) return;

    const committed = sizesRef.current;
    if (!isControlled) {
      persistSizes(persistKey, committed);
    }
    onSizesChange?.(committed);
  }, [clearGesture, isControlled, onSizesChange, persistKey]);

  const abortGesture = useCallback(() => {
    const startSizes = pointerState.current?.startSizes;
    const wasDragging = clearGesture();
    if (!wasDragging) return;
    if (startSizes) {
      setSizesBoth(startSizes);
    }
  }, [clearGesture, setSizesBoth]);

  const handlePointerDown = useCallback((handleIndex: number, e: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    if (pointerState.current) abortRef.current();

    const containerSize = getContainerSize();
    if (containerSize === null) return;

    const clientPos = orientation === 'horizontal' ? e.clientX : e.clientY;

    pointerState.current = {
      id: e.pointerId,
      startPos: clientPos,
      startSizes: [...sizesRef.current],
      handleIndex,
      containerSize,
    };

    const onGlobalMove = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (!pointerState.current || pe.pointerId !== pointerState.current.id) return;
      const pos = orientation === 'horizontal' ? pe.clientX : pe.clientY;
      processMoveRef.current(pos, pe.pointerId);
    };
    const onGlobalUp = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (pointerState.current && pe.pointerId !== pointerState.current.id) return;
      commitRef.current();
      cleanup();
    };
    const onGlobalCancel = (ev: Event) => {
      const pe = ev as globalThis.PointerEvent;
      if (pointerState.current && pe.pointerId !== pointerState.current.id) return;
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
  }, [draggable, getContainerSize, orientation]);

  const handleDoubleClick = useCallback(() => {
    if (!doubleClickReset || !draggable) return;
    const resetTo = defaultSizes ? normalizeSizes(defaultSizes, count) : equalSizes(count);
    if (!isControlled) {
      setSizesBoth(resetTo);
      persistSizes(persistKey, resetTo);
    }
    onSizesChange?.(resetTo);
  }, [doubleClickReset, draggable, defaultSizes, count, isControlled, setSizesBoth, persistKey, onSizesChange]);

  // Keep refs current for window-level listeners.
  commitRef.current = commitGesture;
  abortRef.current = abortGesture;
  processMoveRef.current = processMove;

  // Re-clamp on resize.
  useEffect(() => {
    const reflow = () => {
      if (draggingRef.current !== null) return;
      const containerSize = getContainerSize();
      if (containerSize === null) return;
      const numHandles = sizesRef.current.length - 1;
      const available = containerSize - handleSize * numHandles;
      let current = [...sizesRef.current];
      // Clamp each adjacent pair.
      for (let i = 0; i < numHandles; i++) {
        current = clampPair(current, i, minSize, maxSize, available);
      }
      setSizesBoth(current);
    };
    window.addEventListener('resize', reflow);
    return () => window.removeEventListener('resize', reflow);
  }, [getContainerSize, handleSize, maxSize, minSize, setSizesBoth]);

  const activeSizes = isControlled ? normalizeSizes(controlledSizes, count) : internalSizes;
  const isHorizontal = orientation === 'horizontal';
  const numHandles = count - 1;
  const isDragging = draggingIndex !== null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    overflow: 'hidden',
    ...style,
  };

  const handleWrapperStyle: CSSProperties = {
    flex: 'none',
    [isHorizontal ? 'width' : 'height']: handleSize,
    cursor: draggable ? (isHorizontal ? 'col-resize' : 'row-resize') : 'default',
    touchAction: 'none',
    userSelect: 'none',
  };

  // Each pane accounts for its share of total handle space.
  const totalHandleSpace = handleSize * numHandles;
  const handleSpacePerPane = count > 0 ? totalHandleSpace / count : 0;

  const elements: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const paneStyle: CSSProperties = {
      flex: 'none',
      overflow: 'auto',
      [isHorizontal ? 'width' : 'height']: `calc(${activeSizes[i] * 100}% - ${handleSpacePerPane}px)`,
    };

    elements.push(
      <div
        key={`pane-${i}`}
        className="resizable-split-pane__pane"
        data-pane={i}
        style={paneStyle}
      >
        {childArray[i]}
      </div>,
    );

    if (i < numHandles) {
      const handleIsDragging = draggingIndex === i;
      elements.push(
        <div
          key={`handle-${i}`}
          className={`resizable-split-pane__handle ${handleIsDragging ? 'resizable-split-pane__handle--dragging' : ''}`}
          data-handle={i}
          data-dragging={handleIsDragging ? '' : undefined}
          style={handleWrapperStyle}
          onPointerDown={(e) => handlePointerDown(i, e)}
          onDoubleClick={handleDoubleClick}
        >
          {handle?.({ index: i, isDragging: handleIsDragging, orientation })}
        </div>,
      );
    }
  }

  return (
    <div
      ref={containerRef}
      data-orientation={orientation}
      data-dragging={isDragging ? '' : undefined}
      className={`resizable-split-pane ${isDragging ? 'resizable-split-pane--dragging' : ''} ${className}`}
      style={containerStyle}
    >
      {elements}
    </div>
  );
}

export default ResizableSplitPane;
