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
import { MovableLauncher, SnapDock } from 'react-driftkit';

function App() {
  return (
    <>
      <MovableLauncher defaultPosition="bottom-right">
        <button>Chat with us</button>
      </MovableLauncher>

      <SnapDock defaultEdge="bottom" shadow>
        <button>Home</button>
        <button>Search</button>
        <button>Settings</button>
      </SnapDock>
    </>
  );
}
```

Both components are tree-shakable — import only what you use.

---

## MovableLauncher

A draggable floating wrapper that lets users pick up any widget and drop it anywhere on the viewport — or snap it to the nearest corner on release.

### Features

- **Drag anywhere** — pointer-based, works with mouse, touch, and pen
- **Snap to corners** — optional bounce-animated snap to the nearest viewport corner
- **Named or custom positioning** — `'top-left'`, `'bottom-right'`, or `{ x, y }`
- **Viewport-aware** — auto-repositions on window resize and child size changes
- **5 px drag threshold** — distinguishes clicks from drags so nested buttons still work

### Examples

#### Snap to corners

```tsx
<MovableLauncher defaultPosition="bottom-right" snapToCorners>
  <div className="my-widget">Drag me!</div>
</MovableLauncher>
```

#### Free positioning

```tsx
<MovableLauncher defaultPosition={{ x: 100, y: 200 }}>
  <div className="toolbar">Toolbar</div>
</MovableLauncher>
```

#### Styled widget

```tsx
<MovableLauncher
  defaultPosition="top-right"
  snapToCorners
  className="my-launcher"
  style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
>
  <div className="floating-panel">
    <h3>Quick Actions</h3>
    <button>New Task</button>
    <button>Settings</button>
  </div>
</MovableLauncher>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | *required* | Content rendered inside the draggable container. |
| `defaultPosition` | `Corner \| { x, y }` | `'bottom-right'` | Initial position — a named corner or pixel coordinates. |
| `snapToCorners` | `boolean` | `false` | Snap to the nearest viewport corner on release. |
| `style` | `CSSProperties` | `{}` | Inline styles merged with the wrapper. |
| `className` | `string` | `''` | CSS class added to the wrapper. |

### Types

```typescript
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}
```

### CSS classes

| Class | When |
|-------|------|
| `movable-launcher` | Always present |
| `movable-launcher--dragging` | While the user is actively dragging |

---

## SnapDock

An edge-pinned dock that slides along any side of the viewport. Drag it anywhere — on release it snaps to the nearest edge and automatically flips between horizontal (top/bottom) and vertical (left/right) layouts. The layout change animates via a FLIP-style transition anchored to the active edge.

### Features

- **Edge pinning** — `left`, `right`, `top`, `bottom`, with a `0..1` offset along the edge
- **Automatic orientation** — children lay out in a row or column based on the current edge
- **Animated flip** — cross-edge drops animate smoothly from the old footprint to the new one
- **Drag anywhere** — same 5 px pointer threshold as MovableLauncher
- **`shadow` prop** — adds a sensible default drop shadow, overridable via `style.boxShadow`
- **Zero built-in visuals** — you supply the background, padding, gap, etc. via `style` or `className`
- **`data-edge` / `data-orientation` attributes** — flip your CSS layout without re-rendering

### Examples

#### Basic dock

```tsx
<SnapDock defaultEdge="left">
  <MyToolbar />
</SnapDock>
```

#### Styled dock with shadow

```tsx
<SnapDock defaultEdge="bottom" shadow className="my-dock">
  <button>Home</button>
  <button>Search</button>
  <button>Settings</button>
</SnapDock>
```

```css
.my-dock {
  background: #111;
  color: #fff;
  padding: 8px;
  border-radius: 12px;
  gap: 6px;
}
```

`SnapDock` already sets `display: flex` and `flex-direction` based on the active edge, so you don't need to write orientation CSS yourself — but if you want to, the wrapper exposes `data-orientation="vertical" | "horizontal"`.

#### Tracking edge and offset changes

```tsx
import { useState } from 'react';
import { SnapDock, type Edge } from 'react-driftkit';

function App() {
  const [edge, setEdge] = useState<Edge>('left');

  return (
    <SnapDock
      defaultEdge={edge}
      onEdgeChange={setEdge}
      onOffsetChange={(offset) => console.log('offset', offset)}
    >
      <Toolbar />
    </SnapDock>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | *required* | Content rendered inside the dock. |
| `defaultEdge` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Which edge the dock pins to initially. |
| `defaultOffset` | `number` | `0.5` | Position along the edge, from `0` (top/left) to `1` (bottom/right). |
| `snap` | `boolean` | `true` | Snap to the nearest edge on release. |
| `draggable` | `boolean` | `true` | Whether the user can drag the dock. |
| `edgePadding` | `number` | `16` | Distance in pixels from the viewport edge. |
| `shadow` | `boolean` | `false` | Adds a default drop shadow. Override via `style.boxShadow`. |
| `onEdgeChange` | `(edge: Edge) => void` | — | Fires when the dock moves to a new edge. |
| `onOffsetChange` | `(offset: number) => void` | — | Fires when the dock's offset along the edge changes. |
| `style` | `CSSProperties` | `{}` | Inline styles merged with the wrapper. |
| `className` | `string` | `''` | CSS class added to the wrapper. |

### Types

```typescript
type Edge = 'left' | 'right' | 'top' | 'bottom';
type Orientation = 'vertical' | 'horizontal';

interface SnapDockProps {
  children: ReactNode;
  defaultEdge?: Edge;
  defaultOffset?: number;
  draggable?: boolean;
  snap?: boolean;
  edgePadding?: number;
  shadow?: boolean;
  onEdgeChange?: (edge: Edge) => void;
  onOffsetChange?: (offset: number) => void;
  style?: CSSProperties;
  className?: string;
}
```

### Data attributes

The wrapper element exposes these attributes so you can drive CSS without re-rendering:

| Attribute | Values |
|-----------|--------|
| `data-edge` | `left`, `right`, `top`, `bottom` |
| `data-orientation` | `vertical`, `horizontal` |
| `data-dragging` | present while the user is actively dragging |

### CSS classes

| Class | When |
|-------|------|
| `snap-dock` | Always present |
| `snap-dock--dragging` | While the user is actively dragging |

---

## Use Cases

- **Chat widgets** — floating support buttons that stay accessible
- **Floating toolbars** — draggable formatting bars or quick-action panels
- **Side docks** — VS Code / Figma-style side rails that snap to any edge
- **Debug panels** — dev tool overlays that can be moved out of the way
- **Media controls** — picture-in-picture style video or audio controls
- **Notification centers** — persistent notification panels users can reposition
- **Accessibility helpers** — movable assistive overlays

## How it works

Under the hood both components use the [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) for universal input handling and a `ResizeObserver` to stay pinned when their content changes size. They render as `position: fixed` elements at the top of the z-index stack (`2147483647`), so they float above everything without interfering with your layout.

`SnapDock`'s orientation flip uses a FLIP-style animation: it captures the old wrapper rect before the orientation changes, applies an inverse `scale()` anchored to the active edge, and animates back to identity in the next frame — so the dock glides between horizontal and vertical layouts instead of snapping.

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
