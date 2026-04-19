import type { ComponentMeta } from './types';

const launcherBasic = `import { MovableLauncher } from 'react-driftkit';

function App() {
  return (
    <MovableLauncher>
      <div className="my-widget">Hello World</div>
    </MovableLauncher>
  );
}`;

const launcherSnap = `import { MovableLauncher } from 'react-driftkit';

function App() {
  return (
    <MovableLauncher defaultPosition="bottom-right" snapToCorners>
      <MyToolbar />
    </MovableLauncher>
  );
}`;

const launcherFree = `import { MovableLauncher } from 'react-driftkit';

function App() {
  return (
    <MovableLauncher defaultPosition={{ x: 100, y: 200 }}>
      <FloatingPanel />
    </MovableLauncher>
  );
}`;

const launcherPositions = `// Snap to a corner
<MovableLauncher defaultPosition="top-left" />
<MovableLauncher defaultPosition="top-right" />
<MovableLauncher defaultPosition="bottom-left" />
<MovableLauncher defaultPosition="bottom-right" />

// Or use exact coordinates
<MovableLauncher defaultPosition={{ x: 300, y: 150 }} />`;

const launcherFull = `import { useState } from 'react';
import { MovableLauncher } from 'react-driftkit';

function DevTools() {
  const [snap, setSnap] = useState(true);

  return (
    <MovableLauncher
      defaultPosition="bottom-right"
      snapToCorners={snap}
      className="dev-tools"
      style={{ opacity: 0.95 }}
    >
      <div className="toolbar">
        <span>Dev Tools</span>
        <button onClick={(e) => {
          e.stopPropagation();
          setSnap(s => !s);
        }}>
          {snap ? 'Free' : 'Snap'}
        </button>
      </div>
    </MovableLauncher>
  );
}`;

const launcherTypes = `type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}

interface MovableLauncherProps {
  children: ReactNode;
  defaultPosition?: Corner | Position;
  snapToCorners?: boolean;
  style?: CSSProperties;
  className?: string;
}`;

export const launcherMeta: ComponentMeta = {
  key: 'launcher',
  slug: 'movable-launcher',
  title: 'MovableLauncher',
  tagline:
    'A draggable floating wrapper that lets users pick up any widget and drop it anywhere on the viewport — or snap it to the nearest corner on release.',
  metaDescription:
    'MovableLauncher — a tree-shakable draggable floating wrapper for React. Corner snapping, free positioning, pointer-event based, unstyled, TypeScript-first, React 18 and 19.',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Content rendered inside the draggable container.' },
    {
      prop: 'defaultPosition',
      typeHtml: '<code>Corner | { x, y }</code>',
      defaultHtml: "<code>'bottom-right'</code>",
      descriptionHtml: "Initial position. Corner string (<code>'top-left'</code>, <code>'top-right'</code>, <code>'bottom-left'</code>, <code>'bottom-right'</code>) or coordinates.",
    },
    { prop: 'snapToCorners', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'When true, animates to the nearest corner on release.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Additional inline styles for the wrapper.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'Additional CSS class for the wrapper.' },
  ],
  codeExamples: [
    { label: 'Basic Usage', code: launcherBasic },
    { label: 'Snap to Corners', code: launcherSnap },
    { label: 'Free Positioning', code: launcherFree },
    { label: 'All Positions', code: launcherPositions },
    { label: 'Full Example', code: launcherFull },
  ],
  typesCode: launcherTypes,
};
