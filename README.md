<div align="center">

# react-driftkit

**A lightweight, draggable floating widget wrapper for React.**
Snap to corners, drag anywhere, stay in bounds — all under 3KB.

[![npm version](https://img.shields.io/npm/v/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![npm downloads](https://img.shields.io/npm/dm/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-driftkit)](https://bundlephobia.com/package/react-driftkit)
[![license](https://img.shields.io/npm/l/react-driftkit)](./LICENSE)

[Live Demo](https://react-driftkit.saktichourasia.dev/) · [NPM](https://www.npmjs.com/package/react-driftkit) · [GitHub](https://github.com/shakcho/react-drift)

</div>

---

## Why react-driftkit?

Building a chat widget, floating toolbar, or debug panel? You need it to be draggable, stay on screen, and not fight your existing styles. Most draggable libraries are either too heavy, too opinionated, or don't handle edge cases like viewport resizing and touch input.

**react-driftkit** solves exactly this — one component, zero config, works everywhere.

## Features

- **Drag anywhere** — smooth pointer-based dragging with mouse, touch, and pen support
- **Snap to corners** — optional bounce-animated snapping to the nearest viewport corner
- **Smart positioning** — named corners (`top-left`, `bottom-right`, ...) or custom `{ x, y }` coordinates
- **Viewport-aware** — auto-repositions on window resize and content size changes
- **5px drag threshold** — distinguishes clicks from drags, so child buttons still work
- **Zero dependencies** — only React as a peer dependency
- **Tiny bundle** — under 3KB gzipped
- **TypeScript-first** — fully typed props and exports
- **Works with React 18 and 19**

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
import { MovableLauncher } from 'react-driftkit';

function App() {
  return (
    <MovableLauncher defaultPosition="bottom-right">
      <button>Chat with us</button>
    </MovableLauncher>
  );
}
```

That's it. Your button is now a draggable floating widget pinned to the bottom-right corner.

## Examples

### Snap to Corners

Release the widget and it bounces to the nearest corner:

```tsx
<MovableLauncher defaultPosition="bottom-right" snapToCorners>
  <div className="my-widget">Drag me!</div>
</MovableLauncher>
```

### Free Positioning

Place the widget at exact coordinates:

```tsx
<MovableLauncher defaultPosition={{ x: 100, y: 200 }}>
  <div className="toolbar">Toolbar</div>
</MovableLauncher>
```

### Styled Widget

Combine with your own styles and classes:

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

## API Reference

### `<MovableLauncher>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | *required* | Content to render inside the draggable wrapper |
| `defaultPosition` | `Corner \| { x, y }` | `'bottom-right'` | Initial position — a named corner or pixel coordinates |
| `snapToCorners` | `boolean` | `false` | Snap to the nearest viewport corner on release |
| `style` | `CSSProperties` | `{}` | Inline styles merged with the wrapper |
| `className` | `string` | `''` | CSS class added to the wrapper |

### Types

```typescript
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}
```

### CSS Classes

The wrapper element exposes these classes for styling:

| Class | When |
|-------|------|
| `movable-launcher` | Always present |
| `movable-launcher--dragging` | While the user is actively dragging |

## Use Cases

- **Chat widgets** — floating support/chat buttons that stay accessible
- **Floating toolbars** — draggable formatting bars or quick-action panels
- **Debug panels** — dev tools overlays that can be moved out of the way
- **Media controls** — picture-in-picture style video or audio controls
- **Notification centers** — persistent notification panels users can reposition
- **Accessibility helpers** — movable assistive overlays

## How It Works

Under the hood, react-driftkit uses the [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) for universal input handling and a `ResizeObserver` to keep the widget positioned correctly when its content changes size. The widget renders as a `position: fixed` div at the highest possible z-index (`2147483647`), so it floats above everything without interfering with your layout.

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

```bash
git clone https://github.com/shakcho/react-drift.git
cd react-drift
npm install
npm run dev      # Start the demo app
npm test         # Run the test suite
```

## License

MIT © [Sakti Kumar Chourasia](https://github.com/shakcho)
