import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface ZoomLensEvents {
  /** Fires whenever active toggles (drag-close, Escape, or hotkey). */
  activeChange?: (active: boolean) => void;
  /** Fires when the zoom level changes (wheel, setZoom, clamp). */
  zoomChange?: (zoom: number) => void;
  /** Fires while the lens moves — dragging in free mode, pointer tracking in target mode. */
  positionChange?: (pos: { x: number; y: number }) => void;
}

export interface ZoomLensBehavior {
  /** Keyboard shortcut to toggle active, e.g. `"cmd+shift+z"`. */
  hotkey?: string;
  /** Deactivate when Escape is pressed. Default `true`. */
  exitOnEscape?: boolean;
  /** Allow mouse-wheel over the lens to adjust zoom. Default `true`. */
  wheelToZoom?: boolean;
  /** CSS selector for elements to strip from the magnified clone. */
  ignoreSelector?: string;
}

export type ZoomLensTarget =
  | string
  | Element
  | RefObject<Element | null>
  | null;

export interface ZoomLensProps {
  /** Controlled active state. Omit for uncontrolled. */
  active?: boolean;
  /** Uncontrolled initial active state. */
  defaultActive?: boolean;

  /**
   * Scope the lens to a single element (product-image-zoom style). When set,
   * the lens only appears while the cursor is over the target, follows the
   * cursor inside it, and hides on leave. Dragging is disabled in target
   * mode — the lens is cursor-driven. Accepts a CSS selector, an Element,
   * or a React ref. When omitted, the lens magnifies the whole page and is
   * free-draggable.
   */
  target?: ZoomLensTarget;

  /** Starting position — a corner, `"center"`, or `{x, y}` in viewport px. Ignored in target mode. */
  defaultPosition?: Corner | { x: number; y: number };

  /** Controlled zoom factor. Omit for uncontrolled. */
  zoom?: number;
  /** Uncontrolled initial zoom factor. Default `2`. */
  defaultZoom?: number;
  /** Minimum zoom factor. Default `1.25`. */
  minZoom?: number;
  /** Maximum zoom factor. Default `10`. */
  maxZoom?: number;
  /** Zoom increment per wheel notch. Default `0.25`. */
  zoomStep?: number;

  /** Lens diameter in px. Default `180`. */
  size?: number;

  behavior?: ZoomLensBehavior;
  on?: ZoomLensEvents;

  /** Rim color. */
  borderColor?: string;
  /** Rim thickness in px. Default `2`. */
  borderWidth?: number;
  /** Show a 1px crosshair through the lens center. Default `true`. */
  showCrosshair?: boolean;
  /** Show the current zoom level in the corner of the lens. Default `true`. */
  showZoomBadge?: boolean;

  /** z-index for the overlay. Default `2147483647`. */
  zIndex?: number;
  /** CSS class on the lens circle. */
  className?: string;
  /** Inline styles merged into the lens circle. */
  style?: CSSProperties;
}

const IGNORE_ATTR = 'data-zoom-lens-ignore';
const REBUILD_DEBOUNCE_MS = 150;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

type HotkeyMatcher = (e: KeyboardEvent) => boolean;

function parseHotkey(spec: string): HotkeyMatcher {
  const parts = spec.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
  const needMeta = parts.includes('cmd') || parts.includes('meta');
  const needCtrl = parts.includes('ctrl');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt') || parts.includes('option');
  const keyPart =
    parts.find((p) => !['cmd', 'meta', 'ctrl', 'shift', 'alt', 'option'].includes(p)) ?? '';
  return (e) =>
    e.key.toLowerCase() === keyPart &&
    e.metaKey === needMeta &&
    e.ctrlKey === needCtrl &&
    e.shiftKey === needShift &&
    e.altKey === needAlt;
}

function cornerToPos(corner: Corner, size: number): { x: number; y: number } {
  const pad = 24;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  switch (corner) {
    case 'top-left':
      return { x: pad, y: pad };
    case 'top-right':
      return { x: vw - size - pad, y: pad };
    case 'bottom-left':
      return { x: pad, y: vh - size - pad };
    case 'bottom-right':
      return { x: vw - size - pad, y: vh - size - pad };
    case 'center':
    default:
      return { x: (vw - size) / 2, y: (vh - size) / 2 };
  }
}

function buildClone(source: Element, ignoreSelector: string | undefined): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('script, noscript').forEach((el) => el.remove());
  clone.querySelectorAll(`[${IGNORE_ATTR}]`).forEach((el) => el.remove());
  if (ignoreSelector) {
    try {
      clone.querySelectorAll(ignoreSelector).forEach((el) => el.remove());
    } catch {
      // invalid selector — ignore silently
    }
  }
  // Strip IDs to avoid collisions with the live DOM (duplicate IDs break
  // label-for, aria-labelledby, and devtools node pickers).
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  // Inputs in the clone should not capture focus or accept typing.
  clone.querySelectorAll('input, textarea, select, button').forEach((el) => {
    el.setAttribute('tabindex', '-1');
    (el as HTMLElement).setAttribute('aria-hidden', 'true');
  });
  clone.style.margin = '0';
  return clone;
}

function resolveTarget(target: ZoomLensTarget | undefined): Element | null {
  if (!target) return null;
  if (typeof document === 'undefined') return null;
  if (typeof target === 'string') {
    try {
      return document.querySelector(target);
    } catch {
      return null;
    }
  }
  if (typeof Element !== 'undefined' && target instanceof Element) return target;
  if (typeof target === 'object' && 'current' in target) return target.current ?? null;
  return null;
}

function isWithinIgnored(node: Node | null): boolean {
  if (!node) return false;
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !!el?.closest(`[${IGNORE_ATTR}]`);
}

export function ZoomLens({
  active: activeProp,
  defaultActive = false,
  target,
  defaultPosition = 'center',
  zoom: zoomProp,
  defaultZoom = 2,
  minZoom = 1.25,
  maxZoom = 10,
  zoomStep = 0.25,
  size = 180,
  behavior,
  on,
  borderColor = 'rgba(255, 255, 255, 0.9)',
  borderWidth = 2,
  showCrosshair = true,
  showZoomBadge = true,
  zIndex = 2147483647,
  className = '',
  style = {},
}: ZoomLensProps) {
  const { hotkey, exitOnEscape = true, wheelToZoom = true, ignoreSelector } = behavior ?? {};
  const {
    activeChange: onActiveChange,
    zoomChange: onZoomChange,
    positionChange: onPositionChange,
  } = on ?? {};

  // Active state — controlled / uncontrolled
  const isActiveControlled = activeProp !== undefined;
  const [uncontrolledActive, setUncontrolledActive] = useState(defaultActive);
  const active = isActiveControlled ? !!activeProp : uncontrolledActive;
  const setActive = useCallback(
    (next: boolean) => {
      if (!isActiveControlled) setUncontrolledActive(next);
      onActiveChange?.(next);
    },
    [isActiveControlled, onActiveChange]
  );

  // Zoom — controlled / uncontrolled
  const isZoomControlled = zoomProp !== undefined;
  const [uncontrolledZoom, setUncontrolledZoom] = useState(() =>
    clamp(defaultZoom, minZoom, maxZoom)
  );
  const zoom = isZoomControlled
    ? clamp(zoomProp as number, minZoom, maxZoom)
    : uncontrolledZoom;
  const setZoom = useCallback(
    (next: number) => {
      const clamped = clamp(next, minZoom, maxZoom);
      if (!isZoomControlled) setUncontrolledZoom(clamped);
      onZoomChange?.(clamped);
    },
    [isZoomControlled, minZoom, maxZoom, onZoomChange]
  );

  // Target mode — lens follows cursor inside a bound element and hides outside.
  const [targetEl, setTargetEl] = useState<Element | null>(() => resolveTarget(target));
  useEffect(() => {
    setTargetEl(resolveTarget(target));
  }, [target]);
  const targetElRef = useRef(targetEl);
  targetElRef.current = targetEl;
  const isTargetMode = targetEl !== null;

  // Position — in target mode the lens is cursor-driven, so we start hidden
  // (pos=null) and wait for the first pointermove over the target.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    if (resolveTarget(target)) return null;
    return typeof defaultPosition === 'object'
      ? { x: defaultPosition.x, y: defaultPosition.y }
      : cornerToPos(defaultPosition, size);
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  // Clear pos when switching into target mode, restore default when leaving.
  useEffect(() => {
    if (isTargetMode) {
      setPos(null);
    } else {
      setPos((prev) =>
        prev ??
        (typeof defaultPosition === 'object'
          ? { x: defaultPosition.x, y: defaultPosition.y }
          : cornerToPos(defaultPosition, size))
      );
    }
    // We intentionally exclude defaultPosition/size: this effect only fires
    // when the mode itself flips, not on every prop tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTargetMode]);

  // Dragging (free mode only)
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // DOM refs
  const lensRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pendingRebuildRef = useRef(false);

  // Apply the zoom transform to the cloned wrapper.
  // In target mode the clone is rooted at the target's viewport rect, so
  // we compute coords relative to that rect. In free mode the clone is
  // rooted at document (0,0), so we compute coords in document space.
  const applyTransform = useCallback(() => {
    const wrapper = wrapperRef.current;
    const p = posRef.current;
    if (!wrapper || !p) return;
    const centerX = p.x + size / 2;
    const centerY = p.y + size / 2;
    const t = targetElRef.current;
    let localX: number;
    let localY: number;
    if (t) {
      const r = t.getBoundingClientRect();
      localX = centerX - r.left;
      localY = centerY - r.top;
    } else {
      localX = centerX + window.scrollX;
      localY = centerY + window.scrollY;
    }
    const tx = size / 2 - localX * zoom;
    const ty = size / 2 - localY * zoom;
    wrapper.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`;
  }, [size, zoom]);

  // Reapply transform whenever position or zoom changes.
  useEffect(() => {
    applyTransform();
  }, [pos, zoom, applyTransform]);

  // Build / rebuild the cloned body inside hostRef.
  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    if (!host) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const rebuild = () => {
      if (!host.isConnected) return;
      const source = targetElRef.current ?? document.body;
      if (!source.isConnected) return;
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-zoom-lens-wrapper', '');
      // Lock wrapper to the real source dimensions so the clone lays out
      // exactly as it does live. Without this, an absolute wrapper shrinks
      // to its containing block (the lens itself, ~size px) and the clone
      // reflows — breaking the coord mapping the transform relies on.
      let w: number;
      let h: number;
      if (targetElRef.current) {
        const r = source.getBoundingClientRect();
        w = r.width;
        h = r.height;
      } else {
        const docEl = document.documentElement;
        w = Math.max(docEl.clientWidth, docEl.scrollWidth, document.body.scrollWidth);
        h = Math.max(docEl.clientHeight, docEl.scrollHeight, document.body.scrollHeight);
      }
      wrapper.style.cssText =
        `position:absolute;top:0;left:0;width:${w}px;height:${h}px;` +
        'transform-origin:0 0;pointer-events:none;will-change:transform;';
      wrapper.appendChild(buildClone(source, ignoreSelector));
      host.textContent = '';
      host.appendChild(wrapper);
      wrapperRef.current = wrapper;
      applyTransform();
    };

    const scheduleRebuild = () => {
      if (draggingRef.current) {
        pendingRebuildRef.current = true;
        return;
      }
      if (debounceId !== null) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        rebuild();
      }, REBUILD_DEBOUNCE_MS);
    };

    rebuild();

    const onResize = () => scheduleRebuild();
    window.addEventListener('resize', onResize);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (isWithinIgnored(m.target)) continue;
        if (m.type === 'childList') {
          const nodes = [...m.addedNodes, ...m.removedNodes];
          const allOurs =
            nodes.length > 0 &&
            nodes.every((n) => {
              if (n.nodeType !== 1) return false;
              const el = n as Element;
              return el.hasAttribute?.(IGNORE_ATTR) || !!el.querySelector?.(`[${IGNORE_ATTR}]`);
            });
          if (allOurs) continue;
        }
        scheduleRebuild();
        return;
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      if (debounceId !== null) clearTimeout(debounceId);
      host.textContent = '';
      wrapperRef.current = null;
    };
  }, [active, ignoreSelector, applyTransform, targetEl]);

  // Scroll / resize — no rebuild, just re-apply transform.
  useEffect(() => {
    if (!active) return;
    const onScrollOrResize = () => applyTransform();
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [active, applyTransform]);

  // Wheel to zoom — native listener so we can preventDefault.
  useEffect(() => {
    if (!active || !wheelToZoom) return;
    const lens = lensRef.current;
    if (!lens) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
      setZoom(zoom + delta);
    };
    lens.addEventListener('wheel', onWheel, { passive: false });
    return () => lens.removeEventListener('wheel', onWheel);
  }, [active, wheelToZoom, zoom, zoomStep, setZoom]);

  // Escape to exit
  useEffect(() => {
    if (!active || !exitOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exitOnEscape, setActive]);

  // Hotkey toggle
  useEffect(() => {
    if (!hotkey) return;
    const match = parseHotkey(hotkey);
    const onKey = (e: KeyboardEvent) => {
      if (match(e)) {
        e.preventDefault();
        setActive(!active);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey, active, setActive]);

  // Target mode — follow the cursor inside the target, hide on leave.
  useEffect(() => {
    if (!active || !targetEl) return;
    const el = targetEl;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) {
        if (posRef.current !== null) setPos(null);
        return;
      }
      const next = {
        x: e.clientX - size / 2,
        y: e.clientY - size / 2,
      };
      setPos(next);
      onPositionChange?.(next);
    };
    const onLeave = () => {
      if (posRef.current !== null) setPos(null);
    };
    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerleave', onLeave as EventListener);
    el.addEventListener('pointercancel', onLeave as EventListener);
    return () => {
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerleave', onLeave as EventListener);
      el.removeEventListener('pointercancel', onLeave as EventListener);
    };
  }, [active, targetEl, size, onPositionChange]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!lensRef.current || !posRef.current) return;
      lensRef.current.setPointerCapture(e.pointerId);
      dragOffset.current = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      };
      draggingRef.current = true;
      setDragging(true);
      e.preventDefault();
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next = {
        x: clamp(e.clientX - dragOffset.current.x, 0, vw - size),
        y: clamp(e.clientY - dragOffset.current.y, 0, vh - size),
      };
      setPos(next);
      onPositionChange?.(next);
    },
    [size, onPositionChange]
  );

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      lensRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released (e.g. cancel during drag)
    }
    if (pendingRebuildRef.current) {
      pendingRebuildRef.current = false;
      // trigger a rebuild on the next frame so transform settles first
      requestAnimationFrame(() => {
        const host = hostRef.current;
        if (!host) return;
        const source = targetElRef.current ?? document.body;
        if (!source.isConnected) return;
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-zoom-lens-wrapper', '');
        let w: number;
        let h: number;
        if (targetElRef.current) {
          const r = source.getBoundingClientRect();
          w = r.width;
          h = r.height;
        } else {
          const docEl = document.documentElement;
          w = Math.max(docEl.clientWidth, docEl.scrollWidth, document.body.scrollWidth);
          h = Math.max(docEl.clientHeight, docEl.scrollHeight, document.body.scrollHeight);
        }
        wrapper.style.cssText =
          `position:absolute;top:0;left:0;width:${w}px;height:${h}px;` +
          'transform-origin:0 0;pointer-events:none;will-change:transform;';
        wrapper.appendChild(buildClone(source, ignoreSelector));
        host.textContent = '';
        host.appendChild(wrapper);
        wrapperRef.current = wrapper;
        applyTransform();
      });
    }
  }, [ignoreSelector, applyTransform]);

  if (!active || typeof document === 'undefined') return null;

  const overlay = (
    <div
      data-zoom-lens-ignore=""
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
      }}
    >
      <div
        ref={lensRef}
        className={`zoom-lens ${dragging ? 'zoom-lens--dragging' : ''} ${isTargetMode ? 'zoom-lens--targeted' : ''} ${className}`
          .replace(/\s+/g, ' ')
          .trim()}
        style={{
          position: 'fixed',
          left: pos?.x ?? 0,
          top: pos?.y ?? 0,
          // Keep the lens mounted in target mode even before the first hover
          // — the host inside needs to exist so the clone can be built.
          visibility: pos ? 'visible' : 'hidden',
          width: size,
          height: size,
          boxSizing: 'border-box',
          borderRadius: '50%',
          overflow: 'hidden',
          // Render the rim via box-shadow so it doesn't affect the lens's
          // content box — this keeps host-local coords == viewport coords
          // inside the lens, which the zoom transform depends on.
          boxShadow:
            `inset 0 0 0 ${borderWidth}px ${borderColor}, 0 10px 40px rgba(0, 0, 0, 0.28)`,
          // In target mode the lens is cursor-driven — it must not capture
          // pointer events, or the pointer would keep entering/leaving the
          // lens itself instead of the target underneath.
          cursor: isTargetMode ? 'none' : dragging ? 'grabbing' : 'grab',
          pointerEvents: isTargetMode ? 'none' : 'auto',
          touchAction: 'none',
          userSelect: 'none',
          background: '#fff',
          ...style,
        }}
        onPointerDown={isTargetMode ? undefined : handlePointerDown}
        onPointerMove={isTargetMode ? undefined : handlePointerMove}
        onPointerUp={isTargetMode ? undefined : handlePointerUp}
        onPointerCancel={isTargetMode ? undefined : handlePointerUp}
      >
        <div
          ref={hostRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        />
        {showCrosshair && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: 1,
                height: '100%',
                background: 'rgba(0, 0, 0, 0.25)',
                transform: 'translateX(-0.5px)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                height: 1,
                width: '100%',
                background: 'rgba(0, 0, 0, 0.25)',
                transform: 'translateY(-0.5px)',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
        {showZoomBadge && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              right: 8,
              background: 'rgba(20, 20, 20, 0.78)',
              color: '#fff',
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              pointerEvents: 'none',
              letterSpacing: 0.2,
            }}
          >
            {zoom.toFixed(2)}×
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
