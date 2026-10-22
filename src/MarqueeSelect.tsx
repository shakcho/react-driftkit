import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** How the marquee decides an item is caught. */
export type MarqueeHitTest = 'intersect' | 'contain';

/**
 * What the drag does to the selection that existed when it began.
 * `replace` is the plain drag; the others are the modifier-key variants.
 */
export type MarqueeMode = 'replace' | 'add' | 'subtract' | 'toggle';

/** A box in container content coordinates — origin is the root's padding box, scroll included. */
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarqueeSelectState {
  /** True from the moment the drag crosses `threshold` until release. */
  active: boolean;
  /** The marquee box, or `null` at rest. */
  rect: MarqueeRect | null;
  /** The effective selection right now — live during the drag. */
  ids: string[];
  /** Ids currently caught by the box, before the mode is applied. */
  hit: string[];
  /** The mode resolved from the modifier keys at pointer-down. */
  mode: MarqueeMode;
}

/** Context handed to every event callback. */
export interface MarqueeSelectInfo {
  rect: MarqueeRect | null;
  mode: MarqueeMode;
  /** Ids caught by the box, before the mode is applied. */
  hit: string[];
  /** The selection as it was when the drag began. */
  base: string[];
  /** Elements backing the ids passed alongside this info, in DOM order. */
  elements: HTMLElement[];
}

export interface MarqueeSelectBehavior {
  /**
   * `intersect` catches any item the box touches; `contain` only catches items
   * fully inside it. Default `'intersect'`.
   */
  hitTest?: MarqueeHitTest;
  /** Pointer travel in px before a press is treated as a marquee. Default `4`. */
  threshold?: number;
  /**
   * Allow a marquee to start on top of an item. Off by default, so pressing an
   * item leaves the gesture to whatever drag logic that item owns.
   */
  startOnItem?: boolean;
  /**
   * Elements that swallow the gesture entirely. Defaults to form controls,
   * links, editable content, and anything marked `data-marquee-ignore`.
   */
  ignoreSelector?: string;
  /** Clear the selection when empty space is clicked without dragging. Default `true`. */
  clearOnEmptyClick?: boolean;
  /**
   * Mirror the selection onto the items themselves as `data-marquee-selected`,
   * and the live box contents as `data-marquee-hit`, so CSS alone can style
   * them. Default `true`.
   */
  markItems?: boolean;
  /** Scroll the root when the pointer nears its edge during a drag. Default `true`. */
  autoScroll?: boolean;
  /** Distance in px from the edge where auto-scroll kicks in. Default `48`. */
  autoScrollMargin?: number;
  /** Peak auto-scroll speed in px per frame, reached at the very edge. Default `14`. */
  autoScrollSpeed?: number;
  /** Let touch pointers start a marquee. Off by default so touch panning still works. */
  touch?: boolean;
  /** Mouse button that starts a marquee. Default `0` (primary). */
  mouseButton?: number;
  /**
   * Identity for an item element. Defaults to `data-marquee-id`, then the
   * element's `id`, then its index among the matched items.
   */
  getItemId?: (element: HTMLElement, index: number) => string;
  /**
   * Decide the mode from the pointer-down event. Defaults to shift or
   * ctrl/meta → `add`, alt → `subtract`, otherwise `replace` (or `add` when
   * the `additive` prop is set).
   */
  resolveMode?: (event: ReactPointerEvent<HTMLDivElement>) => MarqueeMode;
}

export interface MarqueeSelectEvents {
  /** Fires whenever the effective selection changes, live during the drag. */
  select?: (ids: string[], info: MarqueeSelectInfo) => void;
  /** Fires once the press has crossed `threshold` and the box has appeared. */
  start?: (info: MarqueeSelectInfo) => void;
  /** Fires on release with the committed selection. */
  end?: (ids: string[], info: MarqueeSelectInfo) => void;
  /** Fires when Escape or a pointer cancel aborts the drag; selection is rolled back. */
  cancel?: (info: MarqueeSelectInfo) => void;
}

export interface MarqueeSelectProps {
  /** The selectable surface — a canvas, a board, a file grid. */
  children?: ReactNode;

  /** CSS selector matching the selectable items. Default `'[data-marquee-item]'`. */
  itemSelector?: string;

  /** Controlled selection. Omit for uncontrolled. */
  selection?: string[];
  /** Starting selection in uncontrolled mode. Default `[]`. */
  defaultSelection?: string[];

  /** Treat an unmodified drag as `add` rather than `replace`. Default `false`. */
  additive?: boolean;

  /** Turns the gesture off without unmounting. Default `false`. */
  disabled?: boolean;

  behavior?: MarqueeSelectBehavior;
  on?: MarqueeSelectEvents;

  /** Replaces the default box with your own. Rendered only while active. */
  marquee?: (state: MarqueeSelectState) => ReactNode;

  /** CSS class on the root container. */
  className?: string;
  /** Inline styles merged onto the root container. */
  style?: CSSProperties;
  /** CSS class on the marquee box. */
  marqueeClassName?: string;
  /** Inline styles merged onto the marquee box. */
  marqueeStyle?: CSSProperties;
}

const DEFAULT_IGNORE =
  'input, textarea, select, option, button, a[href], [contenteditable=""], [contenteditable="true"], [data-marquee-ignore]';

interface ItemSnapshot {
  id: string;
  el: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(box: MarqueeRect, item: MarqueeRect): boolean {
  return (
    box.x < item.x + item.width &&
    box.x + box.width > item.x &&
    box.y < item.y + item.height &&
    box.y + box.height > item.y
  );
}

function encloses(box: MarqueeRect, item: MarqueeRect): boolean {
  return (
    item.x >= box.x &&
    item.y >= box.y &&
    item.x + item.width <= box.x + box.width &&
    item.y + item.height <= box.y + box.height
  );
}

/**
 * Fold the caught ids into the pre-drag selection. Order is preserved — the
 * base keeps its order and newly caught ids arrive in DOM order — so consumers
 * can rely on the array for things like "first selected".
 */
function applyMode(base: string[], hit: string[], mode: MarqueeMode): string[] {
  if (mode === 'replace') return hit;

  const hitSet = new Set(hit);
  if (mode === 'subtract') return base.filter((id) => !hitSet.has(id));

  const baseSet = new Set(base);
  const fresh = hit.filter((id) => !baseSet.has(id));
  if (mode === 'toggle') return [...base.filter((id) => !hitSet.has(id)), ...fresh];
  return [...base, ...fresh];
}

function sameIds(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function MarqueeSelect({
  children,
  itemSelector = '[data-marquee-item]',
  selection: selectionProp,
  defaultSelection,
  additive = false,
  disabled = false,
  behavior,
  on,
  marquee,
  className = '',
  style,
  marqueeClassName = '',
  marqueeStyle,
}: MarqueeSelectProps) {
  const hitTest = behavior?.hitTest ?? 'intersect';
  const threshold = behavior?.threshold ?? 4;
  const startOnItem = behavior?.startOnItem ?? false;
  const ignoreSelector = behavior?.ignoreSelector ?? DEFAULT_IGNORE;
  const clearOnEmptyClick = behavior?.clearOnEmptyClick ?? true;
  const markItems = behavior?.markItems ?? true;
  const autoScroll = behavior?.autoScroll ?? true;
  const autoScrollMargin = behavior?.autoScrollMargin ?? 48;
  const autoScrollSpeed = behavior?.autoScrollSpeed ?? 14;
  const touch = behavior?.touch ?? false;
  const mouseButton = behavior?.mouseButton ?? 0;

  const isControlled = selectionProp !== undefined;

  const rootRef = useRef<HTMLDivElement>(null);
  const [internalSelection, setInternalSelection] = useState<string[]>(
    () => defaultSelection ?? []
  );
  const selection = isControlled ? selectionProp : internalSelection;

  const [rect, setRect] = useState<MarqueeRect | null>(null);
  const [hit, setHit] = useState<string[]>([]);
  const [mode, setMode] = useState<MarqueeMode>('replace');
  const active = rect !== null;

  // Latest props, so the window listeners registered for one drag keep seeing
  // current config instead of the values captured when the drag began.
  const cfg = useRef({
    itemSelector,
    hitTest,
    threshold,
    startOnItem,
    ignoreSelector,
    clearOnEmptyClick,
    autoScroll,
    autoScrollMargin,
    autoScrollSpeed,
    touch,
    mouseButton,
    additive,
    disabled,
    getItemId: behavior?.getItemId,
    resolveMode: behavior?.resolveMode,
    on,
  });
  cfg.current = {
    itemSelector,
    hitTest,
    threshold,
    startOnItem,
    ignoreSelector,
    clearOnEmptyClick,
    autoScroll,
    autoScrollMargin,
    autoScrollSpeed,
    touch,
    mouseButton,
    additive,
    disabled,
    getItemId: behavior?.getItemId,
    resolveMode: behavior?.resolveMode,
    on,
  };

  // Geometry for the drag in flight. Item boxes are measured once at
  // pointer-down and stored in content coordinates, which stay valid while the
  // container scrolls — so a move is pure arithmetic no matter how many items
  // are on the board.
  const dragRef = useRef({
    active: false,
    anchorX: 0,
    anchorY: 0,
    startClientX: 0,
    startClientY: 0,
    pointerX: 0,
    pointerY: 0,
    pointerId: -1,
    items: [] as ItemSnapshot[],
    base: [] as string[],
    mode: 'replace' as MarqueeMode,
    ids: [] as string[],
    hit: [] as string[],
    rect: null as MarqueeRect | null,
  });

  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const resolveId = useCallback((el: HTMLElement, index: number): string => {
    const custom = cfg.current.getItemId;
    if (custom) return custom(el, index);
    return el.dataset.marqueeId ?? (el.id || String(index));
  }, []);

  const infoFor = useCallback((ids: string[]): MarqueeSelectInfo => {
    const d = dragRef.current;
    const byId = new Map(d.items.map((it) => [it.id, it.el]));
    return {
      rect: d.rect,
      mode: d.mode,
      hit: d.hit,
      base: d.base,
      elements: ids.map((id) => byId.get(id)).filter((el): el is HTMLElement => !!el),
    };
  }, []);

  /** Push a selection out: internal state in uncontrolled mode, `on.select` always. */
  const commitSelection = useCallback(
    (ids: string[]) => {
      const d = dragRef.current;
      // `d.ids` is the source of truth mid-drag: React state lags behind the
      // raw pointer events that produced it.
      if (sameIds(d.ids, ids)) return;
      d.ids = ids;
      if (!isControlled) setInternalSelection(ids);
      cfg.current.on?.select?.(ids, infoFor(ids));
    },
    [infoFor, isControlled]
  );

  /** Origin of the root's padding box in client space, plus its scroll offset. */
  const frameOf = useCallback((root: HTMLElement) => {
    const b = root.getBoundingClientRect();
    return {
      left: b.left + root.clientLeft,
      top: b.top + root.clientTop,
      scrollX: root.scrollLeft,
      scrollY: root.scrollTop,
    };
  }, []);

  /** Recompute the box from the last pointer position, then re-run the hit test. */
  const update = useCallback(() => {
    const root = rootRef.current;
    const d = dragRef.current;
    if (!root || !d.active) return;

    const f = frameOf(root);
    const cx = d.pointerX - f.left + f.scrollX;
    const cy = d.pointerY - f.top + f.scrollY;
    const box: MarqueeRect = {
      x: Math.min(d.anchorX, cx),
      y: Math.min(d.anchorY, cy),
      width: Math.abs(cx - d.anchorX),
      height: Math.abs(cy - d.anchorY),
    };
    d.rect = box;
    setRect(box);

    const test = cfg.current.hitTest === 'contain' ? encloses : overlaps;
    const caught: string[] = [];
    for (const item of d.items) if (test(box, item)) caught.push(item.id);

    if (!sameIds(d.hit, caught)) {
      d.hit = caught;
      setHit(caught);
    }
    commitSelection(applyMode(d.base, caught, d.mode));
  }, [commitSelection, frameOf]);

  /** Scroll the root while the pointer sits near an edge, then re-run `update`. */
  const tickAutoScroll = useCallback(() => {
    rafRef.current = null;
    const root = rootRef.current;
    const d = dragRef.current;
    const c = cfg.current;
    if (!root || !d.active || !c.autoScroll) return;

    const b = root.getBoundingClientRect();
    const margin = c.autoScrollMargin;
    const max = c.autoScrollSpeed;

    // Ramps from 0 at `margin` away from the edge to `max` at the edge itself.
    const ramp = (distance: number) =>
      distance >= margin ? 0 : Math.ceil(((margin - distance) / margin) * max);

    const dx = ramp(b.right - d.pointerX) - ramp(d.pointerX - b.left);
    const dy = ramp(b.bottom - d.pointerY) - ramp(d.pointerY - b.top);

    if (dx || dy) {
      const beforeX = root.scrollLeft;
      const beforeY = root.scrollTop;
      root.scrollLeft = beforeX + dx;
      root.scrollTop = beforeY + dy;
      if (root.scrollLeft !== beforeX || root.scrollTop !== beforeY) update();
    }

    rafRef.current = requestAnimationFrame(tickAutoScroll);
  }, [update]);

  /** Tear down the drag without touching the selection. */
  const clearDrag = useCallback(() => {
    const d = dragRef.current;
    d.active = false;
    d.pointerId = -1;
    d.items = [];
    d.rect = null;
    d.hit = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRect(null);
    setHit([]);
  }, []);

  /** Abort: roll the selection back to what it was before the drag. */
  const cancelDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) {
      clearDrag();
      return;
    }
    const base = d.base;
    // Build the info while the item snapshot is still around — `clearDrag`
    // drops it.
    const info = infoFor(base);
    const changed = !sameIds(d.ids, base);
    clearDrag();
    d.ids = base;
    if (changed) {
      if (!isControlled) setInternalSelection(base);
      cfg.current.on?.select?.(base, info);
    }
    cfg.current.on?.cancel?.(info);
  }, [clearDrag, infoFor, isControlled]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const c = cfg.current;
      const root = rootRef.current;
      if (!root || c.disabled || dragRef.current.pointerId !== -1) return;
      if (e.pointerType === 'mouse' && e.button !== c.mouseButton) return;
      if (e.pointerType === 'touch' && !c.touch) return;

      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (c.ignoreSelector && target.closest(c.ignoreSelector)) return;
      if (!c.startOnItem && target.closest(c.itemSelector)) return;

      const resolved =
        c.resolveMode?.(e) ??
        (e.altKey
          ? 'subtract'
          : e.shiftKey || e.metaKey || e.ctrlKey
            ? 'add'
            : c.additive
              ? 'add'
              : 'replace');

      const f = frameOf(root);
      const d = dragRef.current;
      d.pointerId = e.pointerId;
      d.startClientX = e.clientX;
      d.startClientY = e.clientY;
      d.pointerX = e.clientX;
      d.pointerY = e.clientY;
      d.anchorX = e.clientX - f.left + f.scrollX;
      d.anchorY = e.clientY - f.top + f.scrollY;
      d.base = selectionRef.current;
      d.ids = selectionRef.current;
      d.mode = resolved;
      d.hit = [];
      d.rect = null;
      d.active = false;
      setMode(resolved);

      const begin = () => {
        // Measure every item once, in content coordinates. Scrolling during the
        // drag moves the viewport, not the content, so these stay correct.
        const frame = frameOf(root);
        const els = Array.from(root.querySelectorAll<HTMLElement>(c.itemSelector));
        d.items = els.map((el, i) => {
          const b = el.getBoundingClientRect();
          return {
            id: resolveId(el, i),
            el,
            x: b.left - frame.left + frame.scrollX,
            y: b.top - frame.top + frame.scrollY,
            width: b.width,
            height: b.height,
          };
        });
        d.active = true;

        // A marquee is not a text selection; drop whatever the press started.
        window.getSelection?.()?.removeAllRanges();

        update();
        c.on?.start?.(infoFor(d.ids));
        if (cfg.current.autoScroll && rafRef.current === null) {
          rafRef.current = requestAnimationFrame(tickAutoScroll);
        }
      };

      const onMove = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== d.pointerId) return;
        d.pointerX = pe.clientX;
        d.pointerY = pe.clientY;

        if (!d.active) {
          const moved = Math.max(
            Math.abs(pe.clientX - d.startClientX),
            Math.abs(pe.clientY - d.startClientY)
          );
          if (moved < cfg.current.threshold) return;
          begin();
          return;
        }
        update();
      };

      const onUp = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== d.pointerId) return;
        cleanup();

        if (!d.active) {
          // A press that never became a drag: treat it as clicking empty space.
          d.pointerId = -1;
          if (cfg.current.clearOnEmptyClick && d.mode === 'replace') {
            commitSelection([]);
          }
          return;
        }

        const ids = d.ids;
        const info = infoFor(ids);
        clearDrag();
        d.pointerId = -1;
        cfg.current.on?.end?.(ids, info);
      };

      const onCancel = (ev: Event) => {
        const pe = ev as globalThis.PointerEvent;
        if (pe.pointerId !== d.pointerId) return;
        cleanup();
        cancelDrag();
        d.pointerId = -1;
      };

      const onKeyDown = (ev: Event) => {
        if ((ev as KeyboardEvent).key !== 'Escape') return;
        cleanup();
        cancelDrag();
        d.pointerId = -1;
      };

      // The browser's own text selection would otherwise fight the drag.
      const onSelectStart = (ev: Event) => {
        if (d.active) ev.preventDefault();
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('selectstart', onSelectStart);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKeyDown);
      document.addEventListener('selectstart', onSelectStart);
    },
    [
      cancelDrag,
      clearDrag,
      commitSelection,
      frameOf,
      infoFor,
      resolveId,
      tickAutoScroll,
      update,
    ]
  );

  // Abandon an in-flight drag if the component is disabled mid-gesture.
  useEffect(() => {
    if (!disabled) return;
    if (dragRef.current.active) cancelDrag();
  }, [cancelDrag, disabled]);

  // Mirror state onto the items themselves. No dependency array on purpose:
  // items mount and unmount as the consumer renders, and every such render
  // passes through here, so the marks never go stale.
  useEffect(() => {
    if (!markItems) return;
    const root = rootRef.current;
    if (!root) return;
    const selected = new Set(selection);
    const caught = new Set(hit);
    root.querySelectorAll<HTMLElement>(itemSelector).forEach((el, i) => {
      const id = resolveId(el, i);
      el.toggleAttribute('data-marquee-selected', selected.has(id));
      el.toggleAttribute('data-marquee-hit', caught.has(id));
    });
  });

  // Leave the consumer's DOM as we found it.
  useEffect(() => {
    const root = rootRef.current;
    return () => {
      root?.querySelectorAll<HTMLElement>(itemSelector).forEach((el) => {
        el.removeAttribute('data-marquee-selected');
        el.removeAttribute('data-marquee-hit');
      });
    };
  }, [itemSelector]);

  const state: MarqueeSelectState = { active, rect, ids: selection, hit, mode };

  return (
    <div
      ref={rootRef}
      data-marquee-root=""
      data-marquee-active={active ? '' : undefined}
      data-marquee-mode={active ? mode : undefined}
      className={`marquee-select ${className}`.trim()}
      style={{
        position: 'relative',
        touchAction: touch && !disabled ? 'none' : undefined,
        userSelect: active ? 'none' : undefined,
        WebkitUserSelect: active ? 'none' : undefined,
        ...style,
      }}
      onPointerDown={handlePointerDown}
    >
      {children}

      {rect &&
        (marquee ? (
          marquee(state)
        ) : (
          <div
            data-marquee-rect=""
            aria-hidden="true"
            className={`marquee-select__rect ${marqueeClassName}`.trim()}
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              pointerEvents: 'none',
              border: '1px solid currentColor',
              background: 'currentColor',
              opacity: 0.18,
              ...marqueeStyle,
            }}
          />
        ))}
    </div>
  );
}

export default MarqueeSelect;
