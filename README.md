# react-driftkit

A lightweight, draggable floating widget wrapper for React — snap to corners or drag anywhere.

[![npm version](https://img.shields.io/npm/v/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![license](https://img.shields.io/npm/l/react-driftkit)](./LICENSE)

## Features

- **Drag anywhere** — smooth pointer-based dragging (mouse, touch, pen)
- **Snap to corners** — optional snapping to the nearest viewport corner on release
- **Flexible positioning** — named corners or custom `{ x, y }` coordinates
- **Viewport-aware** — auto-repositions on window resize, stays within bounds
- **Zero styling opinions** — fully customizable via `className` and `style` props
- **Tiny footprint** — under 3KB gzipped, zero dependencies beyond React

## Installation

```bash
npm install react-driftkit
```

```bash
yarn add react-driftkit
```

```bash
pnpm add react-driftkit
```

## Quick Start

```tsx
import { MovableLauncher } from 'react-driftkit';

function App() {
  return (
    <MovableLauncher defaultPosition="bottom-right">
      <button>💬 Chat</button>
    </MovableLauncher>
  );
}
```

### Snap to Corners

```tsx
<MovableLauncher defaultPosition="bottom-right" snapToCorners>
  <div className="my-widget">Drag me!</div>
</MovableLauncher>
```

### Custom Position

```tsx
<MovableLauncher defaultPosition={{ x: 100, y: 200 }}>
  <div className="toolbar">Toolbar</div>
</MovableLauncher>
```

## API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Content to render inside the draggable wrapper |
| `defaultPosition` | `Corner \| { x: number, y: number }` | `'bottom-right'` | Initial position of the widget |
| `snapToCorners` | `boolean` | `false` | Snap to the nearest corner when released |
| `style` | `CSSProperties` | `{}` | Inline styles for the wrapper |
| `className` | `string` | `''` | CSS class for the wrapper |

### Types

```typescript
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}
```

## Requirements

- React 18+ or 19+

## License

MIT © Sakti Kumar Chourasia
