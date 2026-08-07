<div align="center">

# react-driftkit

**A tree-shakable React component library for floating UI: draggable widgets, an edge-pinned dock, a draggable bottom sheet, an N-pane resizable split pane, an image magnifier (zoom lens), a peek-and-flick card stack, and a pull-to-refresh that works on mobile *and* desktop.**

Unstyled, TypeScript-first, zero dependencies, React 18 & React 19.

[![npm version](https://img.shields.io/npm/v/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![npm downloads](https://img.shields.io/npm/dm/react-driftkit)](https://www.npmjs.com/package/react-driftkit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-driftkit)](https://bundlephobia.com/package/react-driftkit)
[![license](https://img.shields.io/npm/l/react-driftkit)](./LICENSE)

[Live Demo](https://react-driftkit.saktichourasia.dev/) · [NPM](https://www.npmjs.com/package/react-driftkit) · [GitHub](https://github.com/shakcho/react-driftkit)

</div>

---

## Why react-driftkit?

Building a chat widget, floating toolbar, debug panel, or side dock? You want these things to be draggable, stay on screen, and stay out of your way stylistically. Most draggable libraries are either too heavy, too opinionated, or don't handle edge cases like viewport resizing, touch input, and orientation changes.

**react-driftkit** ships each pattern as its own tiny component. Import only what you use — every component is tree-shakable and under a few KB gzipped. All visuals are yours; the kit owns positioning and interaction.

## Components

| Component | What it does |
|-----------|--------------|
| [`<MovableLauncher>`](#movablelauncher) | **React draggable floating widget** — pin a chat bubble, AI assistant, debug panel, or toolbar to any viewport corner with snap-on-release. |
| [`<SnapDock>`](#snapdock) | **React floating dock / edge-pinned toolbar** — slides along any side of the viewport and flips orientation between horizontal and vertical. |
| [`<DraggableSheet>`](#draggablesheet) | **React bottom sheet & pull-up drawer** — `peek`, `half`, `full` snap points, velocity-aware release. Mobile-style filters, cart drawers, detail panels. |
| [`<ResizableSplitPane>`](#resizablesplitter) | **React resizable split pane** — N-pane IDE-style layout with draggable handles, min/max constraints, and localStorage-persisted ratios. |
| [`<ZoomLens>`](#zoomlens) | **React image magnifier / zoom lens** — free-drag over the whole page or scope to one element (product-image zoom). Wheel to zoom, Escape to dismiss. |
| [`<FlickDeck>`](#flickdeck) | **React card stack & swipeable cards** — back cards peek from one edge, click the peek to flick it forward; optional swipe-to-dismiss. |
| [`<PullToRefresh>`](#pulltorefresh) | **React pull to refresh** — pull down at the top of a list to reload it. Touch drag, mouse drag, *and* trackpad/wheel overscroll drive the same gesture. |

Plus the [hooks layer](#hooks) the components are built on, if you'd rather build your own primitive than use one of ours.

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

## Importing

Every component is available two ways — both tree-shake to the same code.

```tsx
// 1. Barrel import — grab multiple components at once
import { MovableLauncher, SnapDock, ZoomLens } from 'react-driftkit';

// 2. Per-component subpath — named or default, pick the style you prefer
import { SnapDock } from 'react-driftkit/SnapDock';
import SnapDock from 'react-driftkit/SnapDock';

// 3. The hooks layer, from the barrel or its own subpath
import { useDrag } from 'react-driftkit';
import { useDrag } from 'react-driftkit/hooks';
```

Subpath imports are handy when you only need one component and want the import line to be explicit about bundle cost (your bundler will tree-shake the barrel import down to the same output either way, as long as `sideEffects` is respected — which it is here).

## Quick Start

```tsx
import { useRef } from 'react';
import {
  MovableLauncher,
  SnapDock,
  DraggableSheet,
  ResizableSplitPane,
  ZoomLens,
  FlickDeck,
  PullToRefresh,
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

      {/* Magnifier scoped to one element — hover to zoom. */}
      <img ref={productRef} src="/product.jpg" alt="Product" />
      <ZoomLens defaultActive target={productRef} defaultZoom={3} />

      {/* Stack of cards — click a peeking card to flick it to the front. */}
      <FlickDeck defaultFrontId="overview" peek="bottom" peekSize={28}>
        <div key="overview">Overview</div>
        <div key="details">Details</div>
        <div key="stats">Stats</div>
      </FlickDeck>

      {/* Pull down (or trackpad-overscroll) at the top of a list to reload. */}
      <PullToRefresh
        on={{ refresh: () => fetchFeed() }}
        indicator={({ armed, refreshing }) => (
          <span>{refreshing ? 'Refreshing…' : armed ? 'Release' : 'Pull'}</span>
        )}
      >
        <Feed />
      </PullToRefresh>
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
import MovableLauncher from 'react-driftkit/MovableLauncher';

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
import SnapDock from 'react-driftkit/SnapDock';

<SnapDock defaultEdge="bottom" shadow>
  <button>Home</button>
  <button>Search</button>
  <button>Settings</button>
</SnapDock>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/snap-dock>

---

## DraggableSheet

A pull-up / pull-down sheet pinned to an edge, with snap points like `peek`, `half`, and `full`. Built for mobile detail drawers, filter panels, and dev-tool flyouts — but works at any edge on any screen size.

- **Named presets + raw values** — mix `'peek'`, `'half'`, `'full'`, pixel numbers, and `'40%'` strings in one `snapPoints` list
- **Any edge** — `bottom` (default), `top`, `left`, or `right`; percentages resolve against the drag axis
- **Velocity-aware release** — a fast flick advances one stop; slow drags snap to the nearest
- **Drag handle selector** — confine drag to a nested handle so inner content stays scrollable

```tsx
import DraggableSheet from 'react-driftkit/DraggableSheet';

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
import ResizableSplitPane from 'react-driftkit/ResizableSplitPane';

<ResizableSplitPane defaultSizes={[0.3, 0.7]} persistKey="app-split">
  <Sidebar />
  <MainContent />
</ResizableSplitPane>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/resizable-split-pane>

---

## ZoomLens

A draggable magnifier circle that zooms into whatever it hovers. Great for design review, image inspection, or dense data tables. Drag it anywhere on the page, scroll to change zoom, or pass a `target` to scope it to a single element (product-image-zoom style — hover the element to magnify, leave to hide).

- **Two modes** — free-drag over the whole page, or `target`-scoped (lens follows cursor inside one element, hides on leave)
- **Live DOM clone** — mirrors the real page in real time; no snapshot staleness, no external deps
- **Wheel to zoom**, hotkey + Escape, and controlled/uncontrolled `active` + `zoom`
- **Ignore rules** — strip elements from the clone via `behavior.ignoreSelector` or `[data-zoom-lens-ignore]`

```tsx
import ZoomLens from 'react-driftkit/ZoomLens';

<ZoomLens
  defaultActive
  target={imageRef}   // omit for a free-drag whole-page lens
  defaultZoom={3}
  size={200}
/>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/zoom-lens>

---

## FlickDeck

A stack of cards where each back card peeks from one edge — receding into depth for `top`/`bottom` peek, fanning out at an angle for `left`/`right`. Click the peek to flick that card to the front, or optionally swipe the front card off to dismiss it. Great for toggles between views, tip stacks, onboarding cards, and side-by-side comparisons.

- **Four peek edges** — `top`, `bottom`, `left`, `right`; each child's React `key` is its card id
- **Depth cues you can tune** — `depthScale` shrinks back cards, `fanAngle` rotates them, `depthFade` dims them, or set any to `0` for a flat stack
- **Controlled or uncontrolled** — drive the front card via `frontId` + `on.frontChange`, or just pass `defaultFrontId`
- **Optional swipe-to-dismiss** — drag the front card off in the opposite direction of the peek to fire `on.dismiss(id)`
- **Unstyled** — `data-flick-deck-front`, `data-flick-deck-depth`, and `data-flick-deck-active` attributes let you drive CSS without re-rendering

```tsx
import FlickDeck from 'react-driftkit/FlickDeck';

<FlickDeck defaultFrontId="overview" peek="bottom" peekSize={28}>
  <Card key="overview">Overview</Card>
  <Card key="details">Details</Card>
  <Card key="stats">Stats</Card>
</FlickDeck>
```

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/flick-deck>

---

## PullToRefresh

Pull down at the top of a list to reload it. Most pull-to-refresh libraries are touch-only, so the feature silently disappears on desktop — this one treats wheel and trackpad overscroll as the same gesture, so the same code works everywhere.

- **Two input paths, one gesture** — Pointer Events cover mouse, touch, and pen; a non-passive wheel listener covers trackpads and mouse wheels, releasing when the input goes quiet
- **Never hijacks scrolling** — the gesture only arms when the nearest scrollable ancestor is already at its top, detected per-gesture from the element you touched
- **Rubber-band damping** — `resistance` and `maxPull` shape an exponential curve, so the pull is linear at first and asymptotically firm at the end
- **Promise-aware or controlled** — return a promise from `on.refresh` and the indicator holds until it settles, or drive `refreshing` yourself so a toolbar button and the gesture share one path
- **Unstyled** — you render the indicator from a state render prop; `data-ptr-phase`, `data-ptr-armed`, and `data-ptr-source` drive CSS without re-rendering, and `aria-busy` plus a polite live region come for free

```tsx
import PullToRefresh from 'react-driftkit/PullToRefresh';

<PullToRefresh
  on={{ refresh: async () => setItems(await fetchItems()) }}
  indicator={({ progress, armed, refreshing }) => (
    <Spinner spinning={refreshing} rotate={progress * 180} armed={armed} />
  )}
>
  {items.map((item) => <Row key={item.id} {...item} />)}
</PullToRefresh>
```

Because a drag gesture is not reachable by keyboard, pair it with a plain Refresh button in controlled mode when the refresh is the only way to get fresh data.

**Full API, more examples, and live demo →** <https://react-driftkit.saktichourasia.dev/pull-to-refresh>

---

## Hooks

Every component here is a thin layer over the same handful of gesture problems: pointer capture, telling a click from a drag, tracking velocity, resolving snap points, staying inside the viewport, remembering a layout. Those are published as hooks, so you can build a primitive the kit doesn't ship without rewriting any of it.

```tsx
import { useDrag, useSnapPoints } from 'react-driftkit/hooks';
```

| Hook | What it owns |
|------|--------------|
| `useDrag` | Pointer capture, a click-vs-drag threshold, delta + velocity tracking, optional nested drag handle |
| `useSnapPoints` | Resolves `'peek' \| 'half' \| 'full' \| 240 \| '40%'` to pixels, and picks the stop a velocity-aware release should settle on |
| `useViewportBounds` | `ResizeObserver` + window resize + orientation change, plus a `clamp()` that keeps an element on screen |
| `useInertia` | Momentum decay after a release — feed it the velocity `useDrag` reports |
| `usePersistedState` | `persistKey` → `localStorage`, SSR-safe, validated, and tolerant of quota and privacy-mode failures |
| `useLongPress` | Press-and-hold to arm a drag on a surface that also scrolls |
| `useReducedMotion` | Tracks `prefers-reduced-motion` so you can drop a transition rather than fight it |

All seven together are about 4 KB gzipped, and they tree-shake individually. Nothing touches the DOM during render, so they are safe to run through SSR.

A minimal draggable box, which is most of what `MovableLauncher` does:

```tsx
import { useState } from 'react';
import { useDrag, useViewportBounds } from 'react-driftkit/hooks';

function Box() {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [origin, setOrigin] = useState(pos);
  const { clamp } = useViewportBounds({ padding: 16 });

  const { ref, dragging, handlers } = useDrag<HTMLDivElement>({
    onStart: () => setOrigin(pos),
    onMove: ({ dx, dy }) => setPos(clamp({ x: origin.x + dx, y: origin.y + dy })),
  });

  return (
    <div
      ref={ref}
      {...handlers}
      data-dragging={dragging ? '' : undefined}
      style={{ position: 'fixed', left: pos.x, top: pos.y, touchAction: 'none' }}
    >
      Drag me
    </div>
  );
}
```

`useDrag` reports velocity in px/ms, which is what makes a flick feel different from a slow drag — hand it to `useSnapPoints().select()` for a sheet, or to `useInertia().start()` for a scroller:

```tsx
const snaps = useSnapPoints({ points: ['peek', 'half', 'full'], size: window.innerHeight });

useDrag({
  axis: 'y',
  onEnd: ({ vy }) => {
    const target = snaps.select(sizePx, -vy, currentSnap);
    if (target) setSnap(target.point, target.px);
  },
});
```

## Use Cases

- **Chat widgets** — floating support buttons that stay accessible
- **Floating toolbars** — draggable formatting bars or quick-action panels
- **Side docks** — VS Code / Figma-style side rails that snap to any edge
- **Mobile detail sheets** — pull-up drawers for details, filters, or carts
- **Code editors** — resizable file tree + editor + preview split layouts
- **Admin dashboards** — adjustable sidebar and content regions
- **Debug panels** — dev tool overlays that can be moved out of the way
- **Media controls** — picture-in-picture style video or audio controls
- **Notification centers** — persistent notification panels users can reposition
- **Accessibility helpers** — movable assistive overlays
- **Product image zoom** — magnifier scoped to a single image, follows the cursor, hides on leave
- **Data table inspection** — drag a magnifier over dense tables, charts, or heatmaps to read small values without re-flowing the page
- **Tip / onboarding stacks** — a deck of coachmark cards the user can flick through and swipe off one by one
- **Comparison decks** — toggle between product plans, chart variants, or before/after states with a single click on the peek
- **Feeds and inboxes** — pull down to reload a timeline, notification list, or message thread, on phones and desktops alike
- **Dashboards** — refresh live metrics without hunting for a reload button, with the gesture and a toolbar button sharing one code path

## Looking for…

If you're searching for any of these, react-driftkit has a primitive for it:

- **React draggable component** / **react draggable widget** → [`MovableLauncher`](#movablelauncher)
- **React chat widget** / **floating support button** → [`MovableLauncher`](#movablelauncher) + your UI
- **React floating dock** / **react sidebar** / **react vertical toolbar** → [`SnapDock`](#snapdock)
- **React bottom sheet** / **react pull-up drawer** / **mobile sheet** → [`DraggableSheet`](#draggablesheet)
- **React resizable split pane** / **react split view** / **alternative to allotment, react-split-pane, react-resizable-panels** → [`ResizableSplitPane`](#resizablesplitter)
- **React image magnifier** / **react product zoom** / **ecommerce hover zoom** → [`ZoomLens`](#zoomlens)
- **React card stack** / **swipeable cards** / **alternative to react-tinder-card** → [`FlickDeck`](#flickdeck)
- **React pull to refresh** / **swipe to refresh** / **alternative to react-simple-pull-to-refresh, rmc-pull-to-refresh** → [`PullToRefresh`](#pulltorefresh)
- **React drag hook** / **use-drag** / **pointer gesture hook** / **lighter alternative to @use-gesture/react, react-draggable** → [the hooks layer](#hooks)

Each one is independently importable, ships unstyled, and works with React 18 and React 19.

## How it works

Under the hood all components use the [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) for universal input handling. `MovableLauncher`, `SnapDock`, and `DraggableSheet` render as `position: fixed` elements at the top of the z-index stack (`2147483647`) and use a `ResizeObserver` to stay pinned when their content changes size.

`SnapDock`'s orientation flip uses a FLIP-style animation: it captures the old wrapper rect before the orientation changes, applies an inverse `scale()` anchored to the active edge, and animates back to identity in the next frame — so the dock glides between horizontal and vertical layouts instead of snapping.

`ResizableSplitPane` uses a flexbox layout with `calc()` sizing. Dragging a handle only redistributes space between the two adjacent panes, leaving all others unchanged. Window resize events trigger re-clamping against min/max constraints.

`ZoomLens` live-clones either `document.body` (free mode) or a target element (target mode) into a portalled host, then applies a `translate()` + `scale()` transform so the point under the lens center maps to target-local — or document — coords. A `MutationObserver` rebuilds the clone when the real DOM changes, debounced to 150 ms and skipped during drag. In target mode, pointer tracking attaches directly to the target, and the lens overlay is `pointer-events: none` so hover state keeps passing through to the real element underneath.

`PullToRefresh` gates every gesture on the scroll offset of the nearest scrollable ancestor of the element you touched, so an inner list scrolls normally until it reaches its top. Raw input travel — pointer delta or accumulated `wheel` deltas — runs through `max * (1 - e^(-raw/max))`, which is near-linear at small pulls and asymptotically firm at `maxPull`. The wheel path is the desktop half of the story: wheels emit no `pointerup`, so a quiet period (`wheelReleaseMs`) stands in for release. Both paths converge on the same phase machine (`idle → pulling → armed → refreshing → settling`), and the content and indicator move by `transform` alone. The container uses `overflow: clip` rather than `hidden` so `position: sticky` children still work, and a non-passive `touchmove` handler suppresses the browser's own overscroll while a pull is live.

`FlickDeck` lays every card in a single CSS grid cell so the container auto-sizes to the largest card, then offsets back cards with pure `transform` — `translate` along the peek axis, plus `scale` (top/bottom peek) or `rotate` around the attached edge (left/right peek). Depth fade uses `opacity`. The front card's `key` is its id; a click or keyboard activation on a peek swaps ids with a CSS transition. Swipe-to-dismiss tracks pointer movement on the front card and fires `on.dismiss(id)` once the drag crosses `dismissThreshold` in the direction opposite the peek, leaving the consumer to remove that child.

The hooks layer holds the parts of that story that were written more than once. `useDrag` is the interesting one: it runs window-level `pointermove` / `pointerup` / `pointercancel` listeners *alongside* the element handlers, because a gesture can move or end somewhere the element never sees — a fast drag that leaves the surface before crossing the threshold (pre-capture moves dispatch elsewhere), a release outside the element, an OS-level cancel, or stolen capture. Both paths feed one handler, de-duplicated by native event identity, so a move is never counted twice. Velocity is averaged over a 100 ms trailing window rather than a single frame, which is why pausing before you let go cancels a flick instead of firing one.

## Contributing

Contributions are welcome. Open an issue or send a pull request.

```bash
git clone https://github.com/shakcho/react-driftkit.git
cd react-driftkit
npm install
npm run dev      # Start the demo app
npm test         # Run the test suite
```

## License

MIT © [Sakti Kumar Chourasia](https://github.com/shakcho)
