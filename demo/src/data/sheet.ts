import type { ComponentMeta } from './types';

const sheetBasic = `import { DraggableSheet } from 'react-driftkit';

function App() {
  return (
    <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">
      <div className="my-sheet">
        <div data-handle className="sheet-handle" />
        <div className="sheet-body">Details, filters, cart...</div>
      </div>
    </DraggableSheet>
  );
}`;

const sheetPresets = `// Preset snap points resolve against the viewport axis.
// 'peek' = 96px, 'half' = 50%, 'full' = 92%, 'closed' = 0.
<DraggableSheet snapPoints={['closed', 'peek', 'half', 'full']} defaultSnap="peek" />`;

const sheetCustom = `// Mix presets with raw pixels and percentage strings.
// All values are resolved and sorted internally at gesture time,
// so order doesn't matter.
<DraggableSheet
  snapPoints={['peek', 200, '40%', 'full']}
  defaultSnap="40%"
/>`;

const sheetHandle = `// Restrict dragging to a handle strip so inner content
// stays scrollable / clickable.
<DraggableSheet
  snapPoints={['peek', 'half', 'full']}
  dragHandleSelector="[data-handle]"
>
  <div data-handle className="handle-strip" />
  <div className="scroll-area">
    {/* long content here, scrolls normally */}
  </div>
</DraggableSheet>`;

const sheetControlled = `import { useState } from 'react';
import { DraggableSheet, type SnapPoint } from 'react-driftkit';

function App() {
  const [snap, setSnap] = useState<SnapPoint>('half');

  return (
    <>
      <button onClick={() => setSnap('full')}>Expand</button>
      <DraggableSheet
        snap={snap}
        snapPoints={['peek', 'half', 'full']}
        onSnapChange={(next) => setSnap(next)}
      >
        <Sheet />
      </DraggableSheet>
    </>
  );
}`;

const sheetEdges = `// Pin the sheet to any edge. Percentage snap points
// resolve against the drag axis (height for top/bottom,
// width for left/right).
<DraggableSheet edge="bottom" snapPoints={['peek', 'half', 'full']} />
<DraggableSheet edge="top" snapPoints={['peek', 'half']} />
<DraggableSheet edge="left" snapPoints={['peek', '40%', '80%']} />
<DraggableSheet edge="right" snapPoints={['peek', '40%', '80%']} />`;

const sheetTypes = `type SheetEdge = 'bottom' | 'top' | 'left' | 'right';
type SnapPoint =
  | 'closed'
  | 'peek'
  | 'half'
  | 'full'
  | number
  | \`\${number}%\`;

interface DraggableSheetProps {
  children: ReactNode;
  edge?: SheetEdge;
  snapPoints?: SnapPoint[];
  defaultSnap?: SnapPoint;
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint, sizePx: number) => void;
  draggable?: boolean;
  dragHandleSelector?: string;
  velocityThreshold?: number;
  closeOnOutsideClick?: boolean;
  style?: CSSProperties;
  className?: string;
}`;

export const sheetMeta: ComponentMeta = {
  key: 'sheet',
  slug: 'draggable-sheet',
  title: 'DraggableSheet',
  tagline:
    'A pull-up / pull-down sheet pinned to an edge with snap points like peek, half, and full. Great for mobile-style details, filters, or cart drawers.',
  metaDescription:
    'DraggableSheet — an edge-pinned React sheet with named and custom snap points, velocity-aware release, and a drag-handle selector. Unstyled, TypeScript-first, React 18 and 19.',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Content rendered inside the sheet.' },
    { prop: 'edge', typeHtml: "<code>'bottom' | 'top' | 'left' | 'right'</code>", defaultHtml: "<code>'bottom'</code>", descriptionHtml: 'Edge the sheet is pinned to.' },
    {
      prop: 'snapPoints',
      typeHtml: '<code>SnapPoint[]</code>',
      defaultHtml: "<code>['peek', 'half', 'full']</code>",
      descriptionHtml: "Ordered list of stops. Mix presets (<code>'peek'</code>, <code>'half'</code>, <code>'full'</code>, <code>'closed'</code>), raw pixel <code>number</code>s, and percentage strings like <code>'40%'</code>.",
    },
    { prop: 'defaultSnap', typeHtml: '<code>SnapPoint</code>', defaultHtml: 'middle of snapPoints', descriptionHtml: 'Uncontrolled initial stop.' },
    { prop: 'snap', typeHtml: '<code>SnapPoint</code>', defaultHtml: '—', descriptionHtml: 'Controlled current stop. When set, parent drives transitions.' },
    {
      prop: 'onSnapChange',
      typeHtml: '<code>(snap: SnapPoint, sizePx: number) =&gt; void</code>',
      defaultHtml: '—',
      descriptionHtml: 'Fires on drag release with the resolved stop and its pixel size.',
    },
    { prop: 'draggable', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Whether the user can drag the sheet.' },
    {
      prop: 'dragHandleSelector',
      typeHtml: '<code>string</code>',
      defaultHtml: '—',
      descriptionHtml: 'CSS selector for a nested handle. When set, drag only begins inside matching elements.',
    },
    { prop: 'velocityThreshold', typeHtml: '<code>number</code>', defaultHtml: '<code>0.5</code>', descriptionHtml: 'Flick velocity (px/ms) above which a release advances one stop in the flick direction.' },
    {
      prop: 'closeOnOutsideClick',
      typeHtml: '<code>boolean</code>',
      defaultHtml: '<code>false</code>',
      descriptionHtml: 'When true, a pointerdown outside the sheet collapses it to <code>0</code> and fires <code>onSnapChange(\'closed\', 0)</code>. Ignored while already closed or mid-drag.',
    },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Additional inline styles for the wrapper.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'Additional CSS class for the wrapper.' },
  ],
  apiFootnoteHtml: 'The wrapper exposes <code>data-edge</code>, <code>data-snap</code>, and <code>data-dragging</code> so you can drive styles from CSS without re-rendering.',
  codeExamples: [
    { label: 'Basic Usage', code: sheetBasic },
    { label: 'Preset Stops', code: sheetPresets },
    { label: 'Custom Stops', code: sheetCustom },
    { label: 'Drag Handle', code: sheetHandle },
    { label: 'Controlled', code: sheetControlled },
    { label: 'All Edges', code: sheetEdges },
  ],
  typesCode: sheetTypes,
};
