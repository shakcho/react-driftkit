<div align="center">

# react-driftkit

**Small, focused building blocks for floating UI in React.**
Tree-shakable, unstyled, one component per job.

[![npm version](https://img.shields.io/npm/v/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![npm downloads](https://img.shields.io/npm/dm/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-driftkit)](https://bundlephobia.com/package/react-driftkit)
[![license](https://img.shields.io/npm/l/react-driftkit)](./LICENSE)

[Live Demo](https://react-driftkit.saktichourasia.dev/) · [NPM](https://www.npmjs.com/package/react-driftkit) · [GitHub](https://github.com/shakcho/react-drift)

</div>

---

## Why react-driftkit?

Building a chat widget, floating toolbar, debug panel, or side dock? You want these things to be draggable, stay on screen, and stay out of your way stylistically. Most draggable libraries are either too heavy, too opinionated, or don't handle edge cases like viewport resizing, touch input, and orientation changes.

**react-driftkit** ships each pattern as its own tiny component. Import only what you use — every component is tree-shakable and under a few KB gzipped. All visuals are yours; the kit owns positioning and interaction.

## Components

| Component | What it does |
|-----------|--------------|
| [`<MovableLauncher>`](#movablelauncher) | A draggable floating wrapper that pins to any viewport corner or lives at custom `{x, y}` — drop-anywhere with optional snap-on-release. |
| [`<SnapDock>`](#snapdock) | An edge-pinned dock that slides along any side of the viewport and flips orientation automatically between horizontal and vertical. |
| [`<DraggableSheet>`](#draggablesheet) | A pull-up / pull-down sheet pinned to an edge with named snap points (`peek`, `half`, `full`) or arbitrary pixel / percentage stops. |
| [`<ResizableSplitPane>`](#resizablesplitter) | An N-pane resizable split layout with draggable handles, min/max constraints, and localStorage-persisted ratios. |
| [`<InspectorBubble>`](#inspectorbubble) | A Chrome-DevTools-style element picker overlay for design QA — hover to see tag, selector, dimensions, font, colors + WCAG contrast, box model, ARIA role, and accessible name. |
| [`<ZoomLens>`](#zoomlens) | A draggable magnifier circle that zooms into whatever it hovers — free-drag over the whole page or scope it to one element (product-image-zoom style). Wheel to zoom, hotkey or Escape to dismiss. |

## Installation

```bash
npm install react-driftkit
```

<details>
<summary>yarn / pnpm / bun</summary>

```bash
yarn add react-driftkit
```

```bash
pnpm add react-driftkit
```

```bash
bun add react-driftkit
```

</details>

## Quick Start

```tsx
import { useRef } from 'react';
import {
  MovableLauncher,
  SnapDock,
  DraggableSheet,
  ResizableSplitPane,
  InspectorBubble,
  ZoomLens,
} from 'react-driftkit';

function App() {
  const productRef = useRef<HTMLImageElement>(null);

  return (
    <>
      {/* Draggable corner widget that snaps to the nearest viewport corner. */}
      <MovableLauncher defaultPosition="bottom-right" snapToCorners>
        <button>Chat with us</button>
      </MovableLauncher>

      {/* Edge-pinned dock that flips between horizontal and vertical on drop. */}
      <SnapDock defaultEdge="bottom" shadow>
        <button>Home</button>
        <button>Search</button>
        <button>Settings</button>
      </SnapDock>

      {/* Pull-up sheet with peek / half / full snap points and flick gestures. */}
      <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">
        <div data-handle className="sheet-handle" />
        <div className="sheet-body">Details, filters, cart…</div>
      </DraggableSheet>

      {/* N-pane resizable split layout with persisted ratios. */}
      <ResizableSplitPane defaultSizes={[0.3, 0.7]} persistKey="app-split">
        <Sidebar />
        <MainContent />
      </ResizableSplitPane>

      {/* Chrome-DevTools-style element picker — press ⌘⇧C to inspect. */}
      <InspectorBubble behavior={{ hotkey: 'cmd+shift+c' }} />

      {/* Magnifier scoped to one element — hover to zoom. */}
      <img ref={productRef} src="/product.jpg" alt="Product" />
      <ZoomLens defaultActive target={productRef} defaultZoom={3} />
    </>
  );
}
```

All components are tree-shakable — import only what you use.

---

> **Full API, examples, and live demos are on the website.** Each section below is a short pitch — click through for the detailed docs.

## MovableLauncher

A draggable floating wrapper that lets users pick up any widget and drop it anywhere on the viewport — or snap it to the nearest corner on release.

- **Drag anywhere** with pointer events (mouse, touch, pen)
- **Named or custom positioning** — `'top-left'`, `'bottom-right'`, or `{ x, y }`
- **Optional snap-to-corners** with a bounce-animated release
- **Click vs. drag threshold** (5 px) so nested buttons still fire

```tsx
<MovableLauncher defaultPosition="bottom-right" snapToCorners>
  <button>Chat with us</button>
</MovableLauncher>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/movable-launcher>

---

## SnapDock

An edge-pinned dock that slides along any side of the viewport. Drop it anywhere — on release it snaps to the nearest edge and flips between horizontal (top/bottom) and vertical (left/right) layouts via a FLIP-style animation anchored to the active edge.

- **Edge pinning** — `left`, `right`, `top`, `bottom`, with a `0..1` offset along the edge
- **Automatic orientation** — `flex-direction` follows the active edge
- **Unstyled** — `data-edge` and `data-orientation` attributes let you drive CSS without re-rendering

```tsx
<SnapDock defaultEdge="bottom" shadow>
  <button>Home</button>
  <button>Search</button>
  <button>Settings</button>
</SnapDock>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/snap-dock>

---

## DraggableSheet

A pull-up / pull-down sheet pinned to an edge, with snap points like `peek`, `half`, and `full`. Built for mobile detail drawers, filter panels, and inspector flyouts — but works at any edge on any screen size.

- **Named presets + raw values** — mix `'peek'`, `'half'`, `'full'`, pixel numbers, and `'40%'` strings in one `snapPoints` list
- **Any edge** — `bottom` (default), `top`, `left`, or `right`; percentages resolve against the drag axis
- **Velocity-aware release** — a fast flick advances one stop; slow drags snap to the nearest
- **Drag handle selector** — confine drag to a nested handle so inner content stays scrollable

```tsx
<DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">
  <div data-handle className="sheet-handle" />
  <div className="sheet-body">Details, filters, cart...</div>
</DraggableSheet>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/draggable-sheet>

---

## ResizableSplitPane

An N-pane resizable split layout. Drag the handles between panes to redistribute space. Supports horizontal and vertical orientations, min/max constraints, localStorage persistence, and a render prop for fully custom handles.

- **N panes** — pass 2 or more children; each adjacent pair gets a handle
- **Single handle render prop** — called per boundary with `{ index, isDragging, orientation }`
- **Persisted layout** — `persistKey` saves split ratios to localStorage across sessions
- **Double-click reset** to `defaultSizes`

```tsx
<ResizableSplitPane defaultSizes={[0.3, 0.7]} persistKey="app-split">
  <Sidebar />
  <MainContent />
</ResizableSplitPane>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/resizable-split-pane>

---

## InspectorBubble

A Chrome-DevTools-style element picker overlay for design QA. Turn it on, hover any DOM element, and the picker draws a highlight plus an info bubble showing tag, short CSS selector, dimensions, typography, effective colors with WCAG contrast, padding/margin, ARIA role, accessible name, and a11y state flags. Click to select; Escape or a hotkey to exit.

- **DevTools-style box model** — 4-layer margin / border / padding / content overlay, or a single outline
- **Rich info bubble** with tag, selector, dimensions, font + rendered family, WCAG contrast, spacing, ARIA role, accessible name, and a11y state
- **Custom render** — take over the bubble with `bubble.render` and use the full `ElementInfo`
- **Hotkey toggle**, ignore rules, and self-skipping overlay chrome

```tsx
<InspectorBubble
  defaultActive
  behavior={{ hotkey: 'cmd+shift+c' }}
  on={{ select: (el, info) => console.log(info) }}
/>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/inspector-bubble>

---

## ZoomLens

A draggable magnifier circle that zooms into whatever it hovers. Great for design review, image inspection, or dense data tables. Drag it anywhere on the page, scroll to change zoom, or pass a `target` to scope it to a single element (product-image-zoom style — hover the element to magnify, leave to hide).

- **Two modes** — free-drag over the whole page, or `target`-scoped (lens follows cursor inside one element, hides on leave)
- **Live DOM clone** — mirrors the real page in real time; no snapshot staleness, no external deps
- **Wheel to zoom**, hotkey + Escape, and controlled/uncontrolled `active` + `zoom`
- **Ignore rules** — strip elements from the clone via `behavior.ignoreSelector` or `[data-zoom-lens-ignore]`

```tsx
<ZoomLens
  defaultActive
  target={imageRef}   // omit for a free-drag whole-page lens
  defaultZoom={3}
  size={200}
/>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/zoom-lens>

---

## Use Cases

- **Chat widgets** — floating support buttons that stay accessible
- **Floating toolbars** — draggable formatting bars or quick-action panels
- **Side docks** — VS Code / Figma-style side rails that snap to any edge
- **Mobile detail sheets** — pull-up drawers for details, filters, or carts
- **Inspector panels** — developer tool drawers that expand between peek and full
- **Code editors** — resizable file tree + editor + preview split layouts
- **Admin dashboards** — adjustable sidebar and content regions
- **Debug panels** — dev tool overlays that can be moved out of the way
- **Media controls** — picture-in-picture style video or audio controls
- **Notification centers** — persistent notification panels users can reposition
- **Accessibility helpers** — movable assistive overlays
- **Design QA tooling** — hover-inspect contrast, typography, spacing, ARIA role, and accessible name on any element
- **In-house devtools** — a built-in element picker for style audits, a11y audits, or click-to-log workflows
- **Product image zoom** — magnifier scoped to a single image, follows the cursor, hides on leave
- **Data table inspection** — drag a magnifier over dense tables, charts, or heatmaps to read small values without re-flowing the page

## How it works

Under the hood all components use the [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) for universal input handling. `MovableLauncher`, `SnapDock`, and `DraggableSheet` render as `position: fixed` elements at the top of the z-index stack (`2147483647`) and use a `ResizeObserver` to stay pinned when their content changes size.

`SnapDock`'s orientation flip uses a FLIP-style animation: it captures the old wrapper rect before the orientation changes, applies an inverse `scale()` anchored to the active edge, and animates back to identity in the next frame — so the dock glides between horizontal and vertical layouts instead of snapping.

`ResizableSplitPane` uses a flexbox layout with `calc()` sizing. Dragging a handle only redistributes space between the two adjacent panes, leaving all others unchanged. Window resize events trigger re-clamping against min/max constraints.

`InspectorBubble` renders its overlay into `document.body` via a React portal. Pointer tracking uses `document.elementFromPoint` and skips anything with `pointer-events: none` — so the box-model layers, outline, and bubble never block hit-testing. Computed values come from `getComputedStyle`; WCAG contrast is computed from the element's own `color` and the first non-transparent `background-color` walking up its ancestors. The "rendered font" is the first entry from the declared `font-family` list that `document.fonts.check()` reports as loaded — the same heuristic tools like WhatFont use.

`ZoomLens` live-clones either `document.body` (free mode) or a target element (target mode) into a portalled host, then applies a `translate()` + `scale()` transform so the point under the lens center maps to target-local — or document — coords. A `MutationObserver` rebuilds the clone when the real DOM changes, debounced to 150 ms and skipped during drag. In target mode, pointer tracking attaches directly to the target, and the lens overlay is `pointer-events: none` so hover state keeps passing through to the real element underneath.

## Contributing

Contributions are welcome. Open an issue or send a pull request.

```bash
git clone https://github.com/shakcho/react-drift.git
cd react-drift
npm install
npm run dev      # Start the demo app
npm test         # Run the test suite
```

## License

MIT © [Sakti Kumar Chourasia](https://github.com/shakcho)
