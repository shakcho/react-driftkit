import {
  Children,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export type FlickDeckPeek = 'top' | 'bottom' | 'left' | 'right';

export interface FlickDeckEvents {
  /** Fires when the front card changes (click, keyboard, or setter). */
  frontChange?: (id: string) => void;
  /** Fires when the front card is swiped past the dismiss threshold.
   *  Consumer is expected to remove the matching child in response. */
  dismiss?: (id: string) => void;
}

export interface FlickDeckAnimation {
  /** Transition duration in ms. Default `320`. */
  duration?: number;
  /** CSS easing function. Default `cubic-bezier(0.22, 1, 0.36, 1)`. */
  easing?: string;
}

export interface FlickDeckProps {
  /** Controlled id of the front card. Omit for uncontrolled. */
  frontId?: string;
  /** Uncontrolled initial front card id. Defaults to the first child's key. */
  defaultFrontId?: string;

  /** Which edge the back cards peek from. Default `'bottom'`. */
  peek?: FlickDeckPeek;
  /** Pixels of each back card visible behind the one in front of it. Default `24`. */
  peekSize?: number;

  /**
   * How much each back card shrinks per depth level, for top/bottom peek.
   * Makes the stack feel recessed. `0` disables (flat stack). Default `0.05`.
   */
  depthScale?: number;
  /**
   * Degrees each back card rotates per depth level, for left/right peek.
   * Makes the stack fan out at an angle. `0` disables (flat stack). Default `4`.
   */
  fanAngle?: number;
  /**
   * Opacity to subtract per depth level. The front card is always fully
   * opaque. Clamped so cards never fall below `0.25` opacity. `0` disables.
   * Default `0.08`.
   */
  depthFade?: number;
  /**
   * Extra pixels a back card translates out along the peek axis when it is
   * hovered or keyboard-focused — a visual hint that it's clickable. Opacity
   * snaps back to `1` during the hover. `0` disables. Default `8`.
   */
  hoverPeek?: number;

  /** Enable pointer-drag on the front card to fire `on.dismiss`. Default `false`. */
  swipeToDismiss?: boolean;
  /** Fraction of the card's axis size the drag must cross to count as a dismiss. Default `0.3`. */
  dismissThreshold?: number;

  /** Override the transition used for the flick and swipe animations. */
  animation?: FlickDeckAnimation;

  on?: FlickDeckEvents;

  /** CSS class on the deck container. */
  className?: string;
  /** Inline styles merged onto the deck container. */
  style?: CSSProperties;
  /** CSS class on every card wrapper. */
  cardClassName?: string;
  /** Inline styles merged onto every card wrapper. */
  cardStyle?: CSSProperties;

  /** Each child must have a unique `key` — that key is the card's id. */
  children?: ReactNode;
}

const DISMISS_DIR: Record<FlickDeckPeek, { x: number; y: number }> = {
  bottom: { x: 0, y: -1 },
  top: { x: 0, y: 1 },
  right: { x: -1, y: 0 },
  left: { x: 1, y: 0 },
};

const PEEK_PADDING_KEY: Record<
  FlickDeckPeek,
  'paddingBottom' | 'paddingTop' | 'paddingLeft' | 'paddingRight'
> = {
  bottom: 'paddingBottom',
  top: 'paddingTop',
  left: 'paddingLeft',
  right: 'paddingRight',
};

// Anchor each card's transform to the edge opposite the peek. For top/bottom
// this makes `scale` shrink *away from* the peek edge so the peek strip still
// equals `peekSize * depth`. For left/right it pins the rotation pivot to the
// attached side so cards fan outward.
const TRANSFORM_ORIGIN: Record<FlickDeckPeek, string> = {
  bottom: '50% 100%',
  top: '50% 0%',
  left: '100% 50%',
  right: '0% 50%',
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function FlickDeck({
  frontId: frontIdProp,
  defaultFrontId,
  peek = 'bottom',
  peekSize = 24,
  depthScale = 0.05,
  fanAngle = 4,
  depthFade = 0.08,
  hoverPeek = 8,
  swipeToDismiss = false,
  dismissThreshold = 0.3,
  animation,
  on,
  className = '',
  style,
  cardClassName = '',
  cardStyle,
  children,
}: FlickDeckProps) {
  const duration = animation?.duration ?? 320;
  const easing = animation?.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)';
  const { frontChange: onFrontChange, dismiss: onDismiss } = on ?? {};

  // Collect children that carry a stable key — the key is the card id.
  const cards = useMemo(() => {
    const out: { id: string; node: ReactNode }[] = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      if (child.key == null) return;
      out.push({ id: String(child.key), node: child });
    });
    return out;
  }, [children]);

  const isControlled = frontIdProp !== undefined;
  const [uncontrolledFrontId, setUncontrolledFrontId] = useState<string | undefined>(
    defaultFrontId
  );

  const effectiveFrontId = useMemo<string | undefined>(() => {
    const candidate = isControlled ? frontIdProp : uncontrolledFrontId;
    if (candidate && cards.some((c) => c.id === candidate)) return candidate;
    return cards[0]?.id;
  }, [isControlled, frontIdProp, uncontrolledFrontId, cards]);

  const setFront = useCallback(
    (id: string) => {
      if (!isControlled) setUncontrolledFrontId(id);
      onFrontChange?.(id);
    },
    [isControlled, onFrontChange]
  );

  // Depths: front → 0, others numbered 1..N-1 in source order.
  const depthById = useMemo(() => {
    const map = new Map<string, number>();
    let next = 1;
    for (const c of cards) {
      if (c.id === effectiveFrontId) map.set(c.id, 0);
      else map.set(c.id, next++);
    }
    return map;
  }, [cards, effectiveFrontId]);

  // Swipe-to-dismiss state.
  const [dragProgress, setDragProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // Which back card is currently hovered/focused — used to drive the
  // hover-peek affordance. Only non-front cards ever get set here.
  const [activeId, setActiveId] = useState<string | null>(null);
  const activateBack = (id: string) => setActiveId(id);
  const deactivateBack = (id: string) =>
    setActiveId((curr) => (curr === id ? null : curr));

  const dismissDir = DISMISS_DIR[peek];

  const handleBackCardActivate = (id: string) => {
    if (id !== effectiveFrontId) setFront(id);
  };

  const handleBackKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFront(id);
    }
  };

  const handleFrontPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipeToDismiss) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  };

  const handleFrontPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const projected = dx * dismissDir.x + dy * dismissDir.y;
    setDragProgress(Math.max(0, projected));
  };

  const handleFrontPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer already released — ignore
    }

    const el = e.currentTarget;
    const axisSize = dismissDir.x !== 0 ? el.offsetWidth : el.offsetHeight;
    const thresholdPx = axisSize * clamp(dismissThreshold, 0, 1);

    setDragging(false);

    if (dragProgress > thresholdPx && effectiveFrontId != null) {
      const id = effectiveFrontId;
      setDismissingId(id);
      window.setTimeout(() => {
        onDismiss?.(id);
        setDismissingId(null);
        setDragProgress(0);
      }, duration);
    } else {
      setDragProgress(0);
    }
  };

  const peekPad = Math.max(0, (cards.length - 1) * peekSize);
  const paddingStyle: CSSProperties = {};
  paddingStyle[PEEK_PADDING_KEY[peek]] = peekPad;

  return (
    <div
      className={`flick-deck ${className}`.trim()}
      data-peek={peek}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateAreas: '"stack"',
        ...paddingStyle,
        ...style,
      }}
    >
      {cards.map((card) => {
        const depth = depthById.get(card.id) ?? 0;
        const isFront = depth === 0;
        const isDismissing = dismissingId === card.id;
        const isActive = !isFront && !isDismissing && activeId === card.id;

        let tx = 0;
        let ty = 0;
        const baseOffset = depth * peekSize;
        if (peek === 'bottom') ty = baseOffset;
        else if (peek === 'top') ty = -baseOffset;
        else if (peek === 'right') tx = baseOffset;
        else if (peek === 'left') tx = -baseOffset;

        // Hover/focus "peek-a-little-more" nudge along the peek axis.
        if (isActive && hoverPeek > 0) {
          if (peek === 'bottom') ty += hoverPeek;
          else if (peek === 'top') ty -= hoverPeek;
          else if (peek === 'right') tx += hoverPeek;
          else if (peek === 'left') tx -= hoverPeek;
        }

        // Depth treatment: top/bottom peek shrinks back cards (receding), while
        // left/right peek rotates them (fanning). Only applied to non-front,
        // non-dismissing cards.
        const onVerticalAxis = peek === 'top' || peek === 'bottom';
        const scale = onVerticalAxis ? Math.max(0.3, 1 - depth * depthScale) : 1;
        const rotateSign = peek === 'right' ? 1 : peek === 'left' ? -1 : 0;
        const rotate = rotateSign * depth * fanAngle;

        if (isFront && swipeToDismiss) {
          if (isDismissing) {
            const offScreen = 720;
            tx += dismissDir.x * offScreen;
            ty += dismissDir.y * offScreen;
          } else if (dragProgress > 0) {
            tx += dismissDir.x * dragProgress;
            ty += dismissDir.y * dragProgress;
          }
        }

        const transformParts = [`translate3d(${tx}px, ${ty}px, 0)`];
        if (scale !== 1) transformParts.push(`scale(${scale})`);
        if (rotate !== 0) transformParts.push(`rotate(${rotate}deg)`);
        const transform = transformParts.join(' ');

        // While the front card is actively being dragged, remove transition so
        // it tracks the pointer 1:1. Everything else (flick to front, release,
        // dismiss animation) keeps the transition on.
        const tracking = isFront && dragging && !isDismissing;
        const transition = tracking
          ? 'none'
          : `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;

        const zIndex = cards.length - depth;
        const depthOpacity = isFront ? 1 : Math.max(0.25, 1 - depth * depthFade);
        const opacity = isDismissing ? 0 : isActive ? 1 : depthOpacity;

        const interactive = !isFront;
        const swipeable = isFront && swipeToDismiss;

        return (
          <div
            key={card.id}
            data-flick-deck-card=""
            data-flick-deck-front={isFront ? '' : undefined}
            data-flick-deck-active={isActive ? '' : undefined}
            data-flick-deck-depth={depth}
            className={`flick-deck__card ${cardClassName}`.trim()}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `Bring card ${card.id} to front` : undefined}
            onClick={interactive ? () => handleBackCardActivate(card.id) : undefined}
            onKeyDown={interactive ? (e) => handleBackKeyDown(e, card.id) : undefined}
            onMouseEnter={interactive ? () => activateBack(card.id) : undefined}
            onMouseLeave={interactive ? () => deactivateBack(card.id) : undefined}
            onFocus={interactive ? () => activateBack(card.id) : undefined}
            onBlur={interactive ? () => deactivateBack(card.id) : undefined}
            onPointerDown={swipeable ? handleFrontPointerDown : undefined}
            onPointerMove={swipeable ? handleFrontPointerMove : undefined}
            onPointerUp={swipeable ? handleFrontPointerUp : undefined}
            onPointerCancel={swipeable ? handleFrontPointerUp : undefined}
            style={{
              gridArea: 'stack',
              transform,
              transformOrigin: TRANSFORM_ORIGIN[peek],
              transition,
              zIndex,
              opacity,
              willChange: 'transform',
              cursor: interactive
                ? 'pointer'
                : swipeable
                  ? dragging
                    ? 'grabbing'
                    : 'grab'
                  : undefined,
              touchAction: swipeable ? 'none' : undefined,
              userSelect: swipeable ? 'none' : undefined,
              ...cardStyle,
            }}
          >
            {card.node}
          </div>
        );
      })}
    </div>
  );
}
