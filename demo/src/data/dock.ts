import type { ComponentMeta } from './types';

const dockBasic = `import { SnapDock } from 'react-driftkit';

function App() {
  return (
    <SnapDock defaultEdge="left">
      <MyToolbar />
    </SnapDock>
  );
}`;

const dockEdges = `// Pin to any of the four edges
<SnapDock defaultEdge="left" />
<SnapDock defaultEdge="right" />
<SnapDock defaultEdge="top" />
<SnapDock defaultEdge="bottom" />

// Place at a specific point along the edge (0..1)
<SnapDock defaultEdge="left" defaultOffset={0.25} />`;

const dockStyled = `// SnapDock ships zero visuals — you style the container.
// Orientation flips automatically between left/right and top/bottom.
<SnapDock defaultEdge="left" shadow className="my-dock">
  <button>Home</button>
  <button>Search</button>
  <button>Settings</button>
</SnapDock>

/* CSS */
.my-dock {
  background: #111;
  color: #fff;
  padding: 8px;
  border-radius: 12px;
  gap: 6px;
}`;

const dockEvents = `import { useState } from 'react';
import { SnapDock, type Edge } from 'react-driftkit';

function App() {
  const [edge, setEdge] = useState<Edge>('left');

  return (
    <SnapDock
      defaultEdge={edge}
      onEdgeChange={setEdge}
      onOffsetChange={(o) => console.log('offset', o)}
    >
      <Toolbar />
    </SnapDock>
  );
}`;

const dockTypes = `type Edge = 'left' | 'right' | 'top' | 'bottom';
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
}`;

export const dockMeta: ComponentMeta = {
  key: 'dock',
  slug: 'snap-dock',
  title: 'SnapDock',
  tagline:
    'An edge-pinned dock that slides along any side of the viewport and flips orientation automatically between horizontal and vertical layouts.',
  metaDescription:
    'SnapDock — an edge-pinned React dock that snaps to left, right, top, or bottom. Horizontal/vertical layout flip, drag offset, unstyled primitive for React 18 and 19.',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Content rendered inside the dock.' },
    { prop: 'defaultEdge', typeHtml: "<code>'left' | 'right' | 'top' | 'bottom'</code>", defaultHtml: "<code>'left'</code>", descriptionHtml: 'Which edge the dock pins to initially.' },
    { prop: 'defaultOffset', typeHtml: '<code>number</code>', defaultHtml: '<code>0.5</code>', descriptionHtml: 'Position along the edge, from 0 (top/left) to 1 (bottom/right).' },
    { prop: 'snap', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'When true, the dock snaps to the nearest edge on release.' },
    { prop: 'draggable', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Whether the user can drag the dock.' },
    { prop: 'edgePadding', typeHtml: '<code>number</code>', defaultHtml: '<code>16</code>', descriptionHtml: 'Distance in pixels from the viewport edge.' },
    { prop: 'shadow', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Adds a default drop shadow. Override via <code>style.boxShadow</code>.' },
    { prop: 'onEdgeChange', typeHtml: '<code>(edge: Edge) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires when the dock moves to a new edge.' },
    { prop: 'onOffsetChange', typeHtml: '<code>(offset: number) =&gt; void</code>', defaultHtml: '—', descriptionHtml: "Fires when the dock's offset along the edge changes." },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Additional inline styles for the wrapper.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'Additional CSS class for the wrapper.' },
  ],
  apiFootnoteHtml: 'The container exposes <code>data-edge</code> and <code>data-orientation</code> attributes so you can flip your layout from CSS without re-rendering.',
  codeExamples: [
    { label: 'Basic Usage', code: dockBasic },
    { label: 'All Edges', code: dockEdges },
    { label: 'Styling', code: dockStyled },
    { label: 'Events', code: dockEvents },
  ],
  typesCode: dockTypes,
};
