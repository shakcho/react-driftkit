import type { ComponentMeta } from './types';

const splitterBasic = `import { ResizableSplitPane } from 'react-driftkit';

function App() {
  return (
    <ResizableSplitPane style={{ height: 400 }}>
      <div>Left pane</div>
      <div>Right pane</div>
    </ResizableSplitPane>
  );
}`;

const splitterMultiPane = `import { ResizableSplitPane } from 'react-driftkit';

// Any number of panes — handles are inserted automatically.
function App() {
  return (
    <ResizableSplitPane
      defaultSizes={[0.2, 0.5, 0.3]}
      style={{ height: 400 }}
    >
      <Sidebar />
      <Editor />
      <Preview />
    </ResizableSplitPane>
  );
}`;

const splitterCustomHandle = `import { ResizableSplitPane, type HandleInfo } from 'react-driftkit';

// One render prop, called for each boundary.
function App() {
  return (
    <ResizableSplitPane
      defaultSizes={[0.25, 0.5, 0.25]}
      handle={({ index, isDragging, orientation }) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          background: isDragging ? '#6366f1' : '#e5e7eb',
        }}>
          <span style={{ fontSize: 10 }}>{index}</span>
        </div>
      )}
      style={{ height: 400 }}
    >
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </ResizableSplitPane>
  );
}`;

const splitterPersisted = `import { ResizableSplitPane } from 'react-driftkit';

// Sizes are saved to localStorage under the given key
// and restored automatically on next mount.
function App() {
  return (
    <ResizableSplitPane persistKey="editor-split" style={{ height: '100vh' }}>
      <FileTree />
      <Editor />
    </ResizableSplitPane>
  );
}`;

const splitterControlled = `import { useState } from 'react';
import { ResizableSplitPane } from 'react-driftkit';

function App() {
  const [sizes, setSizes] = useState([0.3, 0.7]);

  return (
    <>
      <button onClick={() => setSizes([0.5, 0.5])}>Reset</button>
      <ResizableSplitPane
        sizes={sizes}
        onSizesChange={setSizes}
        style={{ height: 400 }}
      >
        <Sidebar />
        <MainContent />
      </ResizableSplitPane>
    </>
  );
}`;

const splitterTypes = `type SplitOrientation = 'horizontal' | 'vertical';

interface HandleInfo {
  index: number;
  isDragging: boolean;
  orientation: SplitOrientation;
}

interface ResizableSplitPaneProps {
  children: ReactNode[];
  orientation?: SplitOrientation;
  defaultSizes?: number[];
  sizes?: number[];
  onSizesChange?: (sizes: number[]) => void;
  onDrag?: (sizes: number[]) => void;
  minSize?: number;
  maxSize?: number;
  handleSize?: number;
  handle?: (info: HandleInfo) => ReactNode;
  persistKey?: string;
  draggable?: boolean;
  doubleClickReset?: boolean;
  style?: CSSProperties;
  className?: string;
}`;

export const splitterMeta: ComponentMeta = {
  key: 'splitter',
  slug: 'resizable-split-pane',
  title: 'ResizableSplitPane',
  tagline:
    'An N-pane split view with draggable handles and a single render prop for custom handle UI. Supports min/max constraints, persisted sizes, and both horizontal and vertical layouts.',
  metaDescription:
    'ResizableSplitPane — an N-pane resizable split layout for React with draggable handles, min/max constraints, localStorage persistence, and controlled/uncontrolled modes.',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode[]</code>', defaultHtml: '—', descriptionHtml: 'Two or more child elements to render in the split panes.' },
    { prop: 'orientation', typeHtml: "<code>'horizontal' | 'vertical'</code>", defaultHtml: "<code>'horizontal'</code>", descriptionHtml: "Split direction. 'horizontal' puts panes side-by-side; 'vertical' stacks them." },
    { prop: 'defaultSizes', typeHtml: '<code>number[]</code>', defaultHtml: 'equal split', descriptionHtml: 'Uncontrolled initial sizes as ratios summing to 1 (e.g. <code>[0.25, 0.5, 0.25]</code>).' },
    { prop: 'sizes', typeHtml: '<code>number[]</code>', defaultHtml: '—', descriptionHtml: 'Controlled sizes. When set, parent drives all pane sizes.' },
    { prop: 'onSizesChange', typeHtml: '<code>(sizes: number[]) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires after a drag release with the committed sizes array.' },
    { prop: 'onDrag', typeHtml: '<code>(sizes: number[]) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires continuously while dragging with the live sizes array.' },
    { prop: 'minSize', typeHtml: '<code>number</code>', defaultHtml: '<code>50</code>', descriptionHtml: 'Minimum size in pixels for any pane.' },
    { prop: 'maxSize', typeHtml: '<code>number</code>', defaultHtml: '—', descriptionHtml: 'Maximum size in pixels for any pane. No limit when omitted.' },
    { prop: 'handleSize', typeHtml: '<code>number</code>', defaultHtml: '<code>8</code>', descriptionHtml: 'Thickness of each drag handle in pixels.' },
    {
      prop: 'handle',
      typeHtml: '<code>(info: HandleInfo) =&gt; ReactNode</code>',
      defaultHtml: '—',
      descriptionHtml: 'Render prop called once per boundary. Receives <code>{ index, isDragging, orientation }</code>. Default empty div when omitted.',
    },
    { prop: 'persistKey', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'localStorage key to persist sizes across sessions. Omit to disable.' },
    { prop: 'draggable', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Whether the user can drag the handles.' },
    { prop: 'doubleClickReset', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Double-click a handle to reset to <code>defaultSizes</code> (or equal split).' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Additional inline styles for the container.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'Additional CSS class for the container.' },
  ],
  apiFootnoteHtml:
    'The container exposes <code>data-orientation</code> and <code>data-dragging</code> attributes. Panes expose <code>data-pane={index}</code>. Handles expose <code>data-handle={index}</code> and <code>data-dragging</code> when active.',
  codeExamples: [
    { label: 'Basic Usage', code: splitterBasic },
    { label: 'Multi-Pane', code: splitterMultiPane },
    { label: 'Custom Handle', code: splitterCustomHandle },
    { label: 'Persisted', code: splitterPersisted },
    { label: 'Controlled', code: splitterControlled },
  ],
  typesCode: splitterTypes,
};
