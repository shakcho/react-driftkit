import type { ComponentMeta } from './types';

const zoomLensBasic = `import { useState } from 'react';
import { ZoomLens } from 'react-driftkit';

function App() {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        data-zoom-lens-ignore
        onClick={() => setActive((a) => !a)}
      >
        {active ? 'Close lens' : 'Zoom in'}
      </button>

      <ZoomLens
        active={active}
        behavior={{ hotkey: 'cmd+shift+z' }}
        on={{ activeChange: setActive }}
      />
    </>
  );
}`;

const zoomLensConfigurable = `// Bigger lens, higher default zoom, no crosshair:
<ZoomLens
  defaultActive
  size={260}
  defaultZoom={4}
  showCrosshair={false}
/>

// Fully controlled zoom, driven by a slider:
const [zoom, setZoom] = useState(2);

<ZoomLens
  defaultActive
  zoom={zoom}
  minZoom={1.5}
  maxZoom={8}
  on={{ zoomChange: setZoom }}
/>

// Pin the lens to a corner on open, disable wheel-to-zoom:
<ZoomLens
  defaultActive
  defaultPosition="top-right"
  behavior={{ wheelToZoom: false }}
/>

// Exclude UI chrome from the magnified clone (the page's own nav,
// toolbars, or modals you don't want to appear inside the lens):
<ZoomLens
  defaultActive
  behavior={{ ignoreSelector: 'nav, [data-chrome]' }}
/>

// Target mode — product-image-zoom style. Lens scopes to one element,
// follows the cursor inside it, and hides on leave. Dragging is disabled.
const productRef = useRef<HTMLDivElement>(null);

<div ref={productRef}>...product image...</div>
<ZoomLens
  defaultActive
  target={productRef}        // or an Element, or a CSS selector like "#product"
  defaultZoom={3}
  size={160}
/>`;

const zoomLensTypes = `type ZoomLensTarget =
  | string                         // CSS selector, resolved via querySelector
  | Element                        // a live element
  | RefObject<Element | null>      // a React ref
  | null;

interface ZoomLensProps {
  active?: boolean;
  defaultActive?: boolean;

  // Scope the lens to a single element (product-image-zoom style). When
  // set, the lens only appears while the cursor is over the target, follows
  // the cursor inside it, and hides on leave. Dragging is disabled in target
  // mode. Omit to magnify the whole page and make the lens free-draggable.
  target?: ZoomLensTarget;

  // Starting position — a corner, "center", or viewport coords. Ignored
  // in target mode (lens position is cursor-driven).
  defaultPosition?:
    | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    | { x: number; y: number };

  // Zoom — controlled / uncontrolled, with clamping.
  zoom?: number;
  defaultZoom?: number;     // default 2
  minZoom?: number;         // default 1.25
  maxZoom?: number;         // default 10
  zoomStep?: number;        // default 0.25 per wheel notch

  // Lens diameter in px.
  size?: number;            // default 180

  behavior?: {
    hotkey?: string;                 // toggle, e.g. "cmd+shift+z"
    exitOnEscape?: boolean;          // default true
    wheelToZoom?: boolean;           // default true
    ignoreSelector?: string;         // strip from the magnified clone
  };

  on?: {
    activeChange?: (active: boolean) => void;
    zoomChange?: (zoom: number) => void;
    positionChange?: (pos: { x: number; y: number }) => void;
  };

  borderColor?: string;
  borderWidth?: number;
  showCrosshair?: boolean;  // default true
  showZoomBadge?: boolean;  // default true

  zIndex?: number;          // default 2147483647
  className?: string;
  style?: CSSProperties;
}`;

export const zoomLensMeta: ComponentMeta = {
  key: 'zoomlens',
  slug: 'zoom-lens',
  title: 'ZoomLens',
  tagline:
    'A draggable magnifier circle that zooms into whatever it hovers. Great for design review, image inspection, or dense data tables. Drag to move, scroll to zoom, Escape or a hotkey to exit.',
  metaDescription:
    'ZoomLens — a draggable magnifier circle for React. Live-clones the page into a circular lens, drag to reposition, scroll to change zoom, Escape or hotkey to dismiss. Tree-shakable, unstyled, zero runtime deps.',
  apiRows: [
    { prop: 'active', typeHtml: '<code>boolean</code>', defaultHtml: '—', descriptionHtml: 'Controlled active state. Omit for uncontrolled.' },
    { prop: 'defaultActive', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Uncontrolled initial active state.' },
    { prop: 'target', typeHtml: '<code>string | Element | RefObject&lt;Element&gt;</code>', defaultHtml: '—', descriptionHtml: 'Scope the lens to one element (product-image-zoom style). When set, the lens only appears over the target, follows the cursor inside it, and hides on leave. Dragging is disabled. Accepts a CSS selector, Element, or React ref.' },
    { prop: 'defaultPosition', typeHtml: '<code>Corner | { x; y }</code>', defaultHtml: "<code>'center'</code>", descriptionHtml: "Starting position — <code>'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'</code> or <code>{ x, y }</code> in viewport px. Ignored in target mode." },
    { prop: 'zoom', typeHtml: '<code>number</code>', defaultHtml: '—', descriptionHtml: 'Controlled zoom factor. Omit for uncontrolled.' },
    { prop: 'defaultZoom', typeHtml: '<code>number</code>', defaultHtml: '<code>2</code>', descriptionHtml: 'Uncontrolled initial zoom factor.' },
    { prop: 'minZoom', typeHtml: '<code>number</code>', defaultHtml: '<code>1.25</code>', descriptionHtml: 'Minimum zoom factor.' },
    { prop: 'maxZoom', typeHtml: '<code>number</code>', defaultHtml: '<code>10</code>', descriptionHtml: 'Maximum zoom factor.' },
    { prop: 'zoomStep', typeHtml: '<code>number</code>', defaultHtml: '<code>0.25</code>', descriptionHtml: 'Zoom increment applied per wheel notch.' },
    { prop: 'size', typeHtml: '<code>number</code>', defaultHtml: '<code>180</code>', descriptionHtml: 'Lens diameter in pixels.' },
    { prop: 'behavior', typeHtml: '<code>ZoomLensBehavior</code>', defaultHtml: '—', descriptionHtml: 'Behavior knobs: <code>hotkey</code>, <code>exitOnEscape</code>, <code>wheelToZoom</code>, <code>ignoreSelector</code>.' },
    { prop: 'behavior.hotkey', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'Keyboard shortcut to toggle active, e.g. <code>"cmd+shift+z"</code>. Supports cmd/meta, ctrl, shift, alt/option + key.' },
    { prop: 'behavior.exitOnEscape', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Deactivate when Escape is pressed.' },
    { prop: 'behavior.wheelToZoom', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Allow mouse-wheel over the lens to change zoom.' },
    { prop: 'behavior.ignoreSelector', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'CSS selector for elements to strip from the magnified clone. Elements with <code>[data-zoom-lens-ignore]</code> are always stripped.' },
    { prop: 'on', typeHtml: '<code>ZoomLensEvents</code>', defaultHtml: '—', descriptionHtml: 'Event handlers: <code>activeChange</code>, <code>zoomChange</code>, <code>positionChange</code>. All optional.' },
    { prop: 'on.activeChange', typeHtml: '<code>(active: boolean) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires whenever active toggles — Escape, hotkey, or a setter.' },
    { prop: 'on.zoomChange', typeHtml: '<code>(zoom: number) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires when the zoom level changes (wheel, clamp, setZoom).' },
    { prop: 'on.positionChange', typeHtml: '<code>(pos: { x: number; y: number }) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires while the lens is being dragged.' },
    { prop: 'borderColor', typeHtml: '<code>string</code>', defaultHtml: "<code>'rgba(255,255,255,0.9)'</code>", descriptionHtml: 'Rim color of the lens circle.' },
    { prop: 'borderWidth', typeHtml: '<code>number</code>', defaultHtml: '<code>2</code>', descriptionHtml: 'Rim thickness in px.' },
    { prop: 'showCrosshair', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Render a 1px crosshair through the lens center.' },
    { prop: 'showZoomBadge', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Show the current zoom level in the corner of the lens.' },
    { prop: 'zIndex', typeHtml: '<code>number</code>', defaultHtml: '<code>2147483647</code>', descriptionHtml: 'z-index for the overlay.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the lens circle.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Inline styles merged into the lens circle.' },
  ],
  apiFootnoteHtml:
    'The lens clones a live copy of <code>document.body</code>, debounced on mutations. Mark your own control UI with <code>data-zoom-lens-ignore</code> so it stays out of the magnified view. Known limits: <code>&lt;canvas&gt;</code>, <code>&lt;video&gt;</code>, and <code>&lt;iframe&gt;</code> elements appear blank inside the lens, and <code>position: fixed</code> elements re-anchor to the top-left of the clone.',
  codeExamples: [
    { label: 'Basic Usage', code: zoomLensBasic },
    { label: 'Configurable', code: zoomLensConfigurable },
  ],
  typesCode: zoomLensTypes,
};
