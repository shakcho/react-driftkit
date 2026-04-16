import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface PinnableTooltipContentApi {
  pinned: boolean;
  unpin: () => void;
  position: TooltipPosition | null;
}

export interface PinnableTooltipProps {
  /** The anchor element. Must be a single React element that forwards refs and accepts pointer/mouse/focus handlers. */
  children: ReactElement;
  /** Tooltip content. Pass a render function to receive `{ pinned, unpin, position }`. */
  content: ReactNode | ((api: PinnableTooltipContentApi) => ReactNode);
  /** Anchor side relative to the target. Defaults to `'top'`. */
  placement?: TooltipPlacement;
  /** What opens the (unpinned) tooltip. Defaults to `'hover'`. `'manual'` requires the `open` prop. */
  trigger?: TooltipTrigger;
  /** Pixel gap between the tooltip and its anchor. Defaults to `8`. */
  offset?: number;
  /** Controlled open state for the unpinned tooltip. */
  open?: boolean;
  /** Uncontrolled initial open state. Defaults to `false`. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled pin state. */
  pinned?: boolean;
  /** Uncontrolled initial pin state. Defaults to `false`. */
  defaultPinned?: boolean;
  onPinnedChange?: (pinned: boolean, position: TooltipPosition | null) => void;
  /** Controlled free position while pinned. */
  pinPosition?: TooltipPosition;
  /** Uncontrolled initial free position. Defaults to the current anchor-resolved position. */
  defaultPinPosition?: TooltipPosition;
  onPinPositionChange?: (position: TooltipPosition) => void;
  /** Extra inline styles for the tooltip wrapper. */
  tooltipStyle?: CSSProperties;
  /** Extra className for the tooltip wrapper. */
  tooltipClassName?: string;
}

const DRAG_THRESHOLD = 5;
const VIEWPORT_PADDING = 4;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function anchoredPosition(
  anchor: DOMRect,
  tooltipW: number,
  tooltipH: number,
  placement: TooltipPlacement,
  offset: number,
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = 0;
  let y = 0;
  switch (placement) {
    case 'top':
      x = anchor.left + anchor.width / 2 - tooltipW / 2;
      y = anchor.top - tooltipH - offset;
      break;
    case 'bottom':
      x = anchor.left + anchor.width / 2 - tooltipW / 2;
      y = anchor.bottom + offset;
      break;
    case 'left':
      x = anchor.left - tooltipW - offset;
      y = anchor.top + anchor.height / 2 - tooltipH / 2;
      break;
    case 'right':
      x = anchor.right + offset;
      y = anchor.top + anchor.height / 2 - tooltipH / 2;
      break;
  }
  x = clamp(x, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, vw - tooltipW - VIEWPORT_PADDING));
  y = clamp(y, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, vh - tooltipH - VIEWPORT_PADDING));
  return { x, y };
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as { current: T | null }).current = value;
    }
  };
}

export function PinnableTooltip({
  children,
  content,
  placement = 'top',
  trigger = 'hover',
  offset = 8,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  pinned: pinnedProp,
  defaultPinned = false,
  onPinnedChange,
  pinPosition: pinPositionProp,
  defaultPinPosition,
  onPinPositionChange,
  tooltipStyle,
  tooltipClassName = '',
}: PinnableTooltipProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isOpenControlled = openProp !== undefined;
  const isPinnedControlled = pinnedProp !== undefined;
  const isPositionControlled = pinPositionProp !== undefined;

  const [openState, setOpenState] = useState<boolean>(defaultOpen);
  const [pinnedState, setPinnedState] = useState<boolean>(defaultPinned);
  const [positionState, setPositionState] = useState<TooltipPosition | null>(defaultPinPosition ?? null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);

  const openResolved = isOpenControlled ? !!openProp : openState;
  const pinnedResolved = isPinnedControlled ? !!pinnedProp : pinnedState;
  const positionResolved = isPositionControlled
    ? pinPositionProp ?? null
    : positionState;

  const visible = pinnedResolved || openResolved;

  const pinnedRef = useRef(pinnedResolved);
  pinnedRef.current = pinnedResolved;
  const positionRef = useRef<TooltipPosition | null>(positionResolved);
  positionRef.current = positionResolved;
  const draggingRef = useRef(false);
  const pointerStart = useRef<{ x: number; y: number; id: number; offsetX: number; offsetY: number } | null>(null);

  const setOpenBoth = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) setOpenState(next);
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange],
  );

  const setPinnedBoth = useCallback(
    (next: boolean, pos: TooltipPosition | null) => {
      if (!isPinnedControlled) setPinnedState(next);
      onPinnedChange?.(next, pos);
    },
    [isPinnedControlled, onPinnedChange],
  );

  const setPositionBoth = useCallback(
    (next: TooltipPosition) => {
      positionRef.current = next;
      if (!isPositionControlled) setPositionState(next);
      onPinPositionChange?.(next);
    },
    [isPositionControlled, onPinPositionChange],
  );

  // Compute anchored position whenever visible + not pinned + tooltip size known.
  useLayoutEffect(() => {
    if (!visible || pinnedResolved) return;
    if (!anchorRef.current || !tooltipRef.current) return;
    const size = tooltipSize ?? {
      width: tooltipRef.current.offsetWidth,
      height: tooltipRef.current.offsetHeight,
    };
    if (size.width === 0 || size.height === 0) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const next = anchoredPosition(anchorRect, size.width, size.height, placement, offset);
    positionRef.current = next;
    setPositionState(next);
  }, [visible, pinnedResolved, placement, offset, tooltipSize]);

  // Track tooltip size so the position effect above can re-run once measured.
  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const measure = () => {
      setTooltipSize((prev) => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (prev && prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // Reposition the anchored tooltip on viewport resize/scroll.
  useEffect(() => {
    if (!visible || pinnedResolved) return;
    const reposition = () => {
      if (!anchorRef.current || !tooltipRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const w = tooltipRef.current.offsetWidth;
      const h = tooltipRef.current.offsetHeight;
      if (w === 0 || h === 0) return;
      const next = anchoredPosition(anchorRect, w, h, placement, offset);
      positionRef.current = next;
      setPositionState(next);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [visible, pinnedResolved, placement, offset]);

  // Trigger listeners on the anchor.
  useEffect(() => {
    if (trigger === 'manual') return;
    const el = anchorRef.current;
    if (!el) return;

    if (trigger === 'hover') {
      const onEnter = () => setOpenBoth(true);
      const onLeave = () => {
        if (!pinnedRef.current) setOpenBoth(false);
      };
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointerleave', onLeave);
      return () => {
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointerleave', onLeave);
      };
    }
    if (trigger === 'focus') {
      const onFocus = () => setOpenBoth(true);
      const onBlur = () => {
        if (!pinnedRef.current) setOpenBoth(false);
      };
      el.addEventListener('focusin', onFocus);
      el.addEventListener('focusout', onBlur);
      return () => {
        el.removeEventListener('focusin', onFocus);
        el.removeEventListener('focusout', onBlur);
      };
    }
    if (trigger === 'click') {
      const onClick = () => setOpenBoth(!openResolved && !pinnedRef.current);
      el.addEventListener('click', onClick);
      return () => el.removeEventListener('click', onClick);
    }
  }, [trigger, openResolved, setOpenBoth]);

  // Tear-off / drag gesture on the tooltip itself.
  const handleTooltipPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!tooltipRef.current) return;
      const rect = tooltipRef.current.getBoundingClientRect();
      pointerStart.current = {
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
    },
    [],
  );

  const processMove = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (!pointerStart.current || !tooltipRef.current) return;
      if (pointerId !== pointerStart.current.id) return;

      if (!draggingRef.current) {
        const dx = Math.abs(clientX - pointerStart.current.x);
        const dy = Math.abs(clientY - pointerStart.current.y);
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
        try {
          tooltipRef.current.setPointerCapture(pointerStart.current.id);
        } catch {
          /* synthetic / unsupported */
        }
        draggingRef.current = true;
        setDragging(true);
        // Crossing the threshold tears the tooltip off its anchor.
        if (!pinnedRef.current) {
          const initial: TooltipPosition = {
            x: clientX - pointerStart.current.offsetX,
            y: clientY - pointerStart.current.offsetY,
          };
          pinnedRef.current = true;
          setPinnedBoth(true, initial);
          setPositionBoth(initial);
          return;
        }
      }

      const next: TooltipPosition = {
        x: clientX - pointerStart.current.offsetX,
        y: clientY - pointerStart.current.offsetY,
      };
      setPositionBoth(next);
    },
    [setPinnedBoth, setPositionBoth],
  );

  const handleTooltipPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      processMove(e.clientX, e.clientY, e.pointerId);
    },
    [processMove],
  );

  const endGesture = useCallback(() => {
    pointerStart.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const handleTooltipPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
      endGesture();
    },
    [endGesture],
  );

  const handleTooltipPointerCancel = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (pointerStart.current && e.pointerId !== pointerStart.current.id) return;
      endGesture();
    },
    [endGesture],
  );

  // Window-level pointer listeners while a gesture is pending, mirroring SnapDock —
  // handles fast drags that leave the tooltip before the element handlers see them.
  useEffect(() => {
    if (!visible) return;
    const onMove = (ev: globalThis.PointerEvent) => {
      if (!pointerStart.current || ev.pointerId !== pointerStart.current.id) return;
      processMove(ev.clientX, ev.clientY, ev.pointerId);
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      if (!pointerStart.current || ev.pointerId !== pointerStart.current.id) return;
      endGesture();
    };
    const onCancel = (ev: globalThis.PointerEvent) => {
      if (!pointerStart.current || ev.pointerId !== pointerStart.current.id) return;
      endGesture();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [visible, processMove, endGesture]);

  const unpin = useCallback(() => {
    pinnedRef.current = false;
    setPinnedBoth(false, positionRef.current);
    if (trigger !== 'manual') setOpenBoth(false);
  }, [setPinnedBoth, setOpenBoth, trigger]);

  if (!isValidElement(children)) {
    throw new Error('PinnableTooltip requires a single React element as its child.');
  }

  const childProps = (children.props ?? {}) as { ref?: Ref<HTMLElement> };
  const mergedRef = mergeRefs<HTMLElement>(childProps.ref, anchorRef);
  const clonedChild = cloneElement(children, { ref: mergedRef } as Record<string, unknown>);

  const renderedContent =
    typeof content === 'function'
      ? content({ pinned: pinnedResolved, unpin, position: positionResolved })
      : content;

  const hasPosition = positionResolved !== null;
  const tooltipVisualStyle: CSSProperties = hasPosition
    ? { left: positionResolved!.x, top: positionResolved!.y, opacity: 1 }
    : { left: 0, top: 0, opacity: 0, visibility: 'hidden' };

  return (
    <>
      {clonedChild}
      {visible ? (
        <div
          ref={tooltipRef}
          data-placement={placement}
          data-pinned={pinnedResolved ? '' : undefined}
          data-dragging={dragging ? '' : undefined}
          className={`pinnable-tooltip ${pinnedResolved ? 'pinnable-tooltip--pinned' : ''} ${
            dragging ? 'pinnable-tooltip--dragging' : ''
          } ${tooltipClassName}`}
          style={{
            position: 'fixed',
            zIndex: 2147483647,
            touchAction: 'none',
            userSelect: 'none',
            cursor: dragging ? 'grabbing' : 'grab',
            ...tooltipVisualStyle,
            ...tooltipStyle,
          }}
          onPointerDown={handleTooltipPointerDown}
          onPointerMove={handleTooltipPointerMove}
          onPointerUp={handleTooltipPointerUp}
          onPointerCancel={handleTooltipPointerCancel}
          onLostPointerCapture={handleTooltipPointerCancel}
        >
          {renderedContent}
        </div>
      ) : null}
    </>
  );
}
