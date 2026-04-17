import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';
import { MovableLauncher, SnapDock, DraggableSheet, ResizableSplitPane, type Edge, type SheetEdge, type SnapPoint, type SplitOrientation } from '../src/index';
import './styles.css';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, language = 'tsx' }: { code: string; language?: string }) {
  const grammar = Prism.languages[language] || Prism.languages.javascript;
  const html = useMemo(() => Prism.highlight(code, grammar, language), [code, language]);

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className={`language-${language}`}><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
}

const installCommands = [
  { pm: 'npm', cmd: 'npm install react-driftkit' },
  { pm: 'yarn', cmd: 'yarn add react-driftkit' },
  { pm: 'pnpm', cmd: 'pnpm add react-driftkit' },
];

function InstallTabs() {
  const [activePm, setActivePm] = useState('npm');
  const active = installCommands.find((c) => c.pm === activePm) ?? installCommands[0];
  return (
    <div className="install-tabs">
      <div className="install-tabs-header">
        {installCommands.map(({ pm }) => (
          <button
            key={pm}
            className={`install-tab ${activePm === pm ? 'install-tab--active' : ''}`}
            onClick={() => setActivePm(pm)}
          >
            {pm}
          </button>
        ))}
      </div>
      <div className="install-tabs-body">
        <code>{active.cmd}</code>
        <CopyButton text={active.cmd} />
      </div>
    </div>
  );
}

function DockIconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 36,
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

/* ── Shared icons ─────────────────────────────── */
function MoveIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <circle cx="28" cy="28" r="6" />
      <path d="M28 24.5v7" />
      <path d="M24.5 28h7" />
      <path d="M28 24.5l-1.4 1.4M28 24.5l1.4 1.4" />
      <path d="M28 31.5l-1.4-1.4M28 31.5l1.4-1.4" />
      <path d="M24.5 28l1.4-1.4M24.5 28l1.4 1.4" />
      <path d="M31.5 28l-1.4-1.4M31.5 28l-1.4 1.4" />
    </svg>
  );
}

function DockGlyphIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <rect x="12" y="30" width="16" height="5" rx="1.2" />
      <circle cx="16" cy="32.5" r="0.9" fill="currentColor" />
      <circle cx="20" cy="32.5" r="0.9" fill="currentColor" />
      <circle cx="24" cy="32.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

/**
 * Edge-aware drag handle strip for the live DraggableSheet demo. For
 * top/bottom sheets the pill is horizontal; for left/right sheets it
 * rotates 90° so the grab surface always hugs the side of the sheet that
 * faces the viewport interior.
 */
function SheetHandleStrip({ edge }: { edge: SheetEdge }) {
  const isHorizontal = edge === 'bottom' || edge === 'top';
  return (
    <div
      data-sheet-handle
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isHorizontal ? '10px 16px' : '16px 10px',
        // The sheet resizes along its pinned-edge axis, so the cursor should
        // advertise resize, not drag. ns-resize for bottom/top (vertical
        // axis), ew-resize for left/right (horizontal axis).
        cursor: isHorizontal ? 'ns-resize' : 'ew-resize',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: isHorizontal ? 44 : 5,
          height: isHorizontal ? 5 : 44,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.45)',
        }}
      />
    </div>
  );
}

/**
 * Absolutely-positioned corner close button for the live DraggableSheet
 * demo. Always sits in the sheet's top-right corner regardless of the
 * pinned edge, so users have a consistent affordance for dismissing the
 * sheet. Stops pointerdown propagation so taps on the × don't start a drag.
 */
function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close sheet"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        border: 'none',
        borderRadius: 999,
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.15s ease',
        zIndex: 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}

function SheetIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <rect x="8" y="22" width="24" height="12" rx="2" />
      <path d="M16 26h8" strokeWidth={strokeWidth + 0.4} />
    </svg>
  );
}

function SplitterIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <line x1="20" y1="8" x2="20" y2="32" strokeWidth={strokeWidth + 0.5} />
      <path d="M16 17l-3 3 3 3" />
      <path d="M24 17l3 3-3 3" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.67 5.58.67 11.86c0 5.02 3.24 9.28 7.74 10.79.57.1.78-.25.78-.55 0-.27-.01-.99-.02-1.95-3.15.69-3.81-1.52-3.81-1.52-.51-1.31-1.26-1.66-1.26-1.66-1.03-.71.08-.69.08-.69 1.14.08 1.74 1.18 1.74 1.18 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.51-.29-5.16-1.27-5.16-5.64 0-1.25.44-2.27 1.17-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.26 1.89-.39 2.86-.39.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.63 1.58.23 2.75.12 3.04.73.8 1.17 1.82 1.17 3.07 0 4.38-2.66 5.35-5.19 5.63.41.36.77 1.06.77 2.14 0 1.54-.01 2.78-.01 3.16 0 .3.2.66.79.55 4.5-1.51 7.73-5.77 7.73-10.79C23.33 5.58 18.27.5 12 .5z" />
    </svg>
  );
}

/* ── Shared widget building blocks ────────────── */
type ApiRow = {
  prop: string;
  type: ReactNode;
  default: ReactNode;
  description: ReactNode;
};

function ApiTable({ rows, footnote }: { rows: ApiRow[]; footnote?: ReactNode }) {
  return (
    <>
      <div className="table-wrap">
        <table className="api-table">
          <thead>
            <tr>
              <th>Prop</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prop}>
                <td><code>{r.prop}</code></td>
                <td>{typeof r.type === 'string' ? <code>{r.type}</code> : r.type}</td>
                <td>{typeof r.default === 'string' ? <code>{r.default}</code> : r.default}</td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnote && (
        <p style={{ marginTop: 16, fontSize: '0.9rem', color: '#6b7280' }}>{footnote}</p>
      )}
    </>
  );
}

function InstallSection({ id }: { id: string }) {
  return (
    <section id={id} className="section section--subtle" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-label">Installation</div>
      <InstallTabs />
    </section>
  );
}

type CodeExample = { label: string; code: string };

function CodeExamplesSection({
  id,
  examples,
  activeIndex,
  onSelect,
  typesCode,
}: {
  id: string;
  examples: CodeExample[];
  activeIndex: number;
  onSelect: (i: number) => void;
  typesCode: string;
}) {
  return (
    <section id={id} className="section" style={{ paddingTop: 0 }}>
      <div className="section-label">Code Examples</div>
      <div className="tabs">
        {examples.map((tab, i) => (
          <button
            key={tab.label}
            className={`tab ${activeIndex === i ? 'tab--active' : ''}`}
            onClick={() => onSelect(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <CodeBlock code={examples[activeIndex].code} />

      <div style={{ marginTop: 32 }}>
        <div className="section-label">Types</div>
        <CodeBlock language="typescript" code={typesCode} />
      </div>
    </section>
  );
}

function WidgetHeader({
  prefix,
  icon,
  title,
  description,
}: {
  prefix: string;
  icon: ReactNode;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="sub-nav-wrap">
      <div className="widget-header">
        <div className="widget-title-row">
          <span className="widget-icon" aria-hidden="true">{icon}</span>
          <h2 className="widget-title">{title}</h2>
        </div>
        <p className="widget-description">{description}</p>
      </div>
      <SubNav prefix={prefix} />
    </div>
  );
}

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

const launcherApiRows: ApiRow[] = [
  { prop: 'children', type: 'ReactNode', default: <>&mdash;</>, description: 'Content rendered inside the draggable container.' },
  {
    prop: 'defaultPosition',
    type: <code>Corner | {'{ x, y }'}</code>,
    default: "'bottom-right'",
    description: (
      <>
        Initial position. Corner string (<code>'top-left'</code>, <code>'top-right'</code>,{' '}
        <code>'bottom-left'</code>, <code>'bottom-right'</code>) or coordinates.
      </>
    ),
  },
  { prop: 'snapToCorners', type: 'boolean', default: 'false', description: 'When true, animates to the nearest corner on release.' },
  { prop: 'style', type: 'CSSProperties', default: '{}', description: 'Additional inline styles for the wrapper.' },
  { prop: 'className', type: 'string', default: "''", description: 'Additional CSS class for the wrapper.' },
];

const sheetApiRows: ApiRow[] = [
  { prop: 'children', type: 'ReactNode', default: <>&mdash;</>, description: 'Content rendered inside the sheet.' },
  { prop: 'edge', type: "'bottom' | 'top' | 'left' | 'right'", default: "'bottom'", description: 'Edge the sheet is pinned to.' },
  {
    prop: 'snapPoints',
    type: 'SnapPoint[]',
    default: "['peek', 'half', 'full']",
    description: (
      <>
        Ordered list of stops. Mix presets (<code>'peek'</code>, <code>'half'</code>, <code>'full'</code>, <code>'closed'</code>),
        raw pixel <code>number</code>s, and percentage strings like <code>'40%'</code>.
      </>
    ),
  },
  { prop: 'defaultSnap', type: 'SnapPoint', default: 'middle of snapPoints', description: 'Uncontrolled initial stop.' },
  { prop: 'snap', type: 'SnapPoint', default: <>&mdash;</>, description: 'Controlled current stop. When set, parent drives transitions.' },
  {
    prop: 'onSnapChange',
    type: <code>(snap: SnapPoint, sizePx: number) =&gt; void</code>,
    default: <>&mdash;</>,
    description: 'Fires on drag release with the resolved stop and its pixel size.',
  },
  { prop: 'draggable', type: 'boolean', default: 'true', description: 'Whether the user can drag the sheet.' },
  {
    prop: 'dragHandleSelector',
    type: 'string',
    default: <>&mdash;</>,
    description: 'CSS selector for a nested handle. When set, drag only begins inside matching elements.',
  },
  { prop: 'velocityThreshold', type: 'number', default: '0.5', description: 'Flick velocity (px/ms) above which a release advances one stop in the flick direction.' },
  {
    prop: 'closeOnOutsideClick',
    type: 'boolean',
    default: 'false',
    description: (
      <>
        When true, a pointerdown outside the sheet collapses it to <code>0</code> and fires{' '}
        <code>onSnapChange('closed', 0)</code>. Ignored while already closed or mid-drag.
      </>
    ),
  },
  { prop: 'style', type: 'CSSProperties', default: '{}', description: 'Additional inline styles for the wrapper.' },
  { prop: 'className', type: 'string', default: "''", description: 'Additional CSS class for the wrapper.' },
];

const dockApiRows: ApiRow[] = [
  { prop: 'children', type: 'ReactNode', default: <>&mdash;</>, description: 'Content rendered inside the dock.' },
  { prop: 'defaultEdge', type: "'left' | 'right' | 'top' | 'bottom'", default: "'left'", description: 'Which edge the dock pins to initially.' },
  { prop: 'defaultOffset', type: 'number', default: '0.5', description: 'Position along the edge, from 0 (top/left) to 1 (bottom/right).' },
  { prop: 'snap', type: 'boolean', default: 'true', description: 'When true, the dock snaps to the nearest edge on release.' },
  { prop: 'draggable', type: 'boolean', default: 'true', description: 'Whether the user can drag the dock.' },
  { prop: 'edgePadding', type: 'number', default: '16', description: 'Distance in pixels from the viewport edge.' },
  {
    prop: 'shadow',
    type: 'boolean',
    default: 'false',
    description: (
      <>Adds a default drop shadow. Override via <code>style.boxShadow</code>.</>
    ),
  },
  { prop: 'onEdgeChange', type: <code>(edge: Edge) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires when the dock moves to a new edge.' },
  { prop: 'onOffsetChange', type: <code>(offset: number) =&gt; void</code>, default: <>&mdash;</>, description: "Fires when the dock's offset along the edge changes." },
  { prop: 'style', type: 'CSSProperties', default: '{}', description: 'Additional inline styles for the wrapper.' },
  { prop: 'className', type: 'string', default: "''", description: 'Additional CSS class for the wrapper.' },
];

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

const splitterApiRows: ApiRow[] = [
  { prop: 'children', type: 'ReactNode[]', default: <>&mdash;</>, description: 'Two or more child elements to render in the split panes.' },
  { prop: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: "Split direction. 'horizontal' puts panes side-by-side; 'vertical' stacks them." },
  { prop: 'defaultSizes', type: 'number[]', default: 'equal split', description: 'Uncontrolled initial sizes as ratios summing to 1 (e.g. [0.25, 0.5, 0.25]).' },
  { prop: 'sizes', type: 'number[]', default: <>&mdash;</>, description: 'Controlled sizes. When set, parent drives all pane sizes.' },
  { prop: 'onSizesChange', type: <code>(sizes: number[]) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires after a drag release with the committed sizes array.' },
  { prop: 'onDrag', type: <code>(sizes: number[]) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires continuously while dragging with the live sizes array.' },
  { prop: 'minSize', type: 'number', default: '50', description: 'Minimum size in pixels for any pane.' },
  { prop: 'maxSize', type: 'number', default: <>&mdash;</>, description: 'Maximum size in pixels for any pane. No limit when omitted.' },
  { prop: 'handleSize', type: 'number', default: '8', description: 'Thickness of each drag handle in pixels.' },
  {
    prop: 'handle',
    type: <code>(info: HandleInfo) =&gt; ReactNode</code>,
    default: <>&mdash;</>,
    description: 'Render prop called once per boundary. Receives { index, isDragging, orientation }. Default empty div when omitted.',
  },
  { prop: 'persistKey', type: 'string', default: <>&mdash;</>, description: 'localStorage key to persist sizes across sessions. Omit to disable.' },
  { prop: 'draggable', type: 'boolean', default: 'true', description: 'Whether the user can drag the handles.' },
  { prop: 'doubleClickReset', type: 'boolean', default: 'true', description: 'Double-click a handle to reset to defaultSizes (or equal split).' },
  { prop: 'style', type: 'CSSProperties', default: '{}', description: 'Additional inline styles for the container.' },
  { prop: 'className', type: 'string', default: "''", description: 'Additional CSS class for the container.' },
];

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type ActiveComponent = 'launcher' | 'dock' | 'sheet' | 'splitter';
type SubView = 'install' | 'demo' | 'api' | 'examples';

function SubNav({ prefix }: { prefix: string }) {
  const items: { key: SubView; label: string }[] = [
    { key: 'install', label: 'Install' },
    { key: 'demo', label: 'Demo' },
    { key: 'api', label: 'API' },
    { key: 'examples', label: 'Examples' },
  ];
  const scrollTo = (key: SubView) => {
    const el = document.getElementById(`${prefix}-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="sub-nav">
      {items.map(({ key, label }) => (
        <button key={key} className="sub-nav-item" onClick={() => scrollTo(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const componentItems: { key: ActiveComponent; label: string; icon: ReactNode }[] = [
  { key: 'launcher', label: 'MovableLauncher', icon: <MoveIcon size={16} strokeWidth={2.2} /> },
  { key: 'dock', label: 'SnapDock', icon: <DockGlyphIcon size={16} /> },
  { key: 'sheet', label: 'DraggableSheet', icon: <SheetIcon size={16} /> },
  { key: 'splitter', label: 'ResizableSplitPane', icon: <SplitterIcon size={16} /> },
];

function ComponentDropdown({ active, onChange }: { active: ActiveComponent; onChange: (c: ActiveComponent) => void }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    if (!open) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setVisible(false);
      setClosing(false);
    }, 120);
  };

  const openMenu = () => {
    setOpen(true);
    setVisible(true);
    setClosing(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = componentItems.find((c) => c.key === active)!;

  return (
    <div className="nav-dropdown" ref={ref}>
      <button className="nav-dropdown-trigger" onClick={() => visible ? closeMenu() : openMenu()} aria-expanded={visible}>
        {current.icon}
        <span>{current.label}</span>
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <div className={`nav-dropdown-menu ${closing ? 'nav-dropdown-menu--closing' : ''}`}>
          {componentItems.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`nav-dropdown-item ${active === key ? 'nav-dropdown-item--active' : ''}`}
              onClick={() => { onChange(key); closeMenu(); }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeComponent, setActiveComponent] = useState<ActiveComponent>('launcher');

  // Launcher state
  const [launcherExample, setLauncherExample] = useState(0);
  const [snap, setSnap] = useState(true);
  const [position, setPosition] = useState<Corner>('bottom-right');

  // Sheet state
  const [sheetExample, setSheetExample] = useState(0);
  const [sheetEdge, setSheetEdge] = useState<SheetEdge>('bottom');
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>('half');
  const [sheetCloseOnOutside, setSheetCloseOnOutside] = useState(true);
  const sheetSnapPoints: SnapPoint[] = ['closed', 'peek', 'half', 'full'];

  // Splitter state
  const [splitterExample, setSplitterExample] = useState(0);
  const [splitterOrientation, setSplitterOrientation] = useState<SplitOrientation>('horizontal');
  const [splitterSizes, setSplitterSizes] = useState([0.25, 0.5, 0.25]);
  const [splitterDraggable, setSplitterDraggable] = useState(true);
  const [splitterPaneCount, setSplitterPaneCount] = useState(3);

  // Dock state
  const [dockExample, setDockExample] = useState(0);
  const [dockEdge, setDockEdge] = useState<Edge>('bottom');
  const [dockOffset, setDockOffset] = useState(0.5);
  const [dockSnap, setDockSnap] = useState(true);
  const [dockDraggable, setDockDraggable] = useState(true);
  const [dockShadow, setDockShadow] = useState(true);
  /** Increments only when the user clicks an edge button, forcing a remount
   *  with the new defaults. Drag-reported edge/offset changes must not
   *  bump this, otherwise the dock remounts mid-drop and loses its offset. */
  const [dockRemountKey, setDockRemountKey] = useState(0);

  const launcherExamples = [
    { label: 'Basic Usage', code: launcherBasic },
    { label: 'Snap to Corners', code: launcherSnap },
    { label: 'Free Positioning', code: launcherFree },
    { label: 'All Positions', code: launcherPositions },
    { label: 'Full Example', code: launcherFull },
  ];

  const dockExamples = [
    { label: 'Basic Usage', code: dockBasic },
    { label: 'All Edges', code: dockEdges },
    { label: 'Styling', code: dockStyled },
    { label: 'Events', code: dockEvents },
  ];

  const sheetExamples = [
    { label: 'Basic Usage', code: sheetBasic },
    { label: 'Preset Stops', code: sheetPresets },
    { label: 'Custom Stops', code: sheetCustom },
    { label: 'Drag Handle', code: sheetHandle },
    { label: 'Controlled', code: sheetControlled },
    { label: 'All Edges', code: sheetEdges },
  ];

  const splitterExamples = [
    { label: 'Basic Usage', code: splitterBasic },
    { label: 'Multi-Pane', code: splitterMultiPane },
    { label: 'Custom Handle', code: splitterCustomHandle },
    { label: 'Persisted', code: splitterPersisted },
    { label: 'Controlled', code: splitterControlled },
  ];

  const sheetEdgeOptions: SheetEdge[] = ['bottom', 'top', 'left', 'right'];

  const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const edges: Edge[] = ['left', 'right', 'top', 'bottom'];

  return (
    <div className="page">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            react-<span className="accent">driftkit</span>
          </a>
          <ComponentDropdown active={activeComponent} onChange={setActiveComponent} />
        </div>
      </nav>

      {/* Diagonal GitHub ribbon — top-right of viewport */}
      <a
        href="https://github.com/shakcho/react-driftkit"
        target="_blank"
        rel="noopener noreferrer"
        className="gh-ribbon"
        aria-label="Star react-driftkit on GitHub"
      >
        <GitHubIcon size={14} />
        Star on GitHub
      </a>

      <div className="content">
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">React + TypeScript &middot; Draggable widgets</div>
          <h1 className="hero-title">react-driftkit</h1>
          <p className="hero-tagline">
            Small, focused building blocks for floating UI in React. Tree-shakable, unstyled, one component per job.
          </p>
        </section>

        {activeComponent === 'launcher' && (
          <>
            <WidgetHeader
              prefix="launcher"
              icon={<MoveIcon size={28} />}
              title="MovableLauncher"
              description={
                <>
                  A draggable floating wrapper that lets users pick up any widget and drop it
                  anywhere on the viewport — or snap it to the nearest corner on release.
                </>
              }
            />

            <InstallSection id="launcher-install" />

            <section id="launcher-demo" className="section" style={{ paddingTop: 16 }}>
              <div className="section-label">Interactive Demo</div>

                  <div className="demo-row">
                    <span className="demo-row-label">Position</span>
                    <div className="demo-row-controls">
                      {corners.map((c) => (
                        <button
                          key={c}
                          className={`pill-btn ${position === c ? 'pill-btn--active' : ''}`}
                          onClick={() => setPosition(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="demo-row">
                    <span className="demo-row-label">Snap to Corners</span>
                    <div className="demo-row-controls">
                      <button
                        className={`toggle ${snap ? 'toggle--on' : ''}`}
                        onClick={() => setSnap((s) => !s)}
                      />
                      <span className="toggle-label">{snap ? 'on' : 'off'}</span>
                    </div>
                  </div>

                  <div className="demo-row" style={{ borderBottom: 'none' }}>
                    <span className="demo-row-label">Behaviour</span>
                    <div className="demo-row-controls">
                      <span style={{ fontSize: '0.85rem', color: snap ? '#6366f1' : '#6b7280' }}>
                        {snap
                          ? 'Widget will snap to the nearest corner on release'
                          : 'Widget stays wherever you drop it'}
                      </span>
                    </div>
                  </div>
            </section>

            <section id="launcher-api" className="section" style={{ paddingTop: 0 }}>
              <div className="section-label">API Reference</div>
              <ApiTable rows={launcherApiRows} />
            </section>

            <CodeExamplesSection
              id="launcher-examples"
              examples={launcherExamples}
              activeIndex={launcherExample}
              onSelect={setLauncherExample}
              typesCode={launcherTypes}
            />
          </>
        )}

        {activeComponent === 'dock' && (
          <>
            <WidgetHeader
              prefix="dock"
              icon={<DockGlyphIcon size={28} />}
              title="SnapDock"
              description={
                <>
                  An edge-pinned dock that slides along any side of the viewport and flips
                  orientation automatically between horizontal and vertical layouts.
                </>
              }
            />

            <InstallSection id="dock-install" />

            <section id="dock-demo" className="section" style={{ paddingTop: 16 }}>
              <div className="section-label">Interactive Demo</div>

                <div className="demo-row">
                  <span className="demo-row-label">Edge</span>
                  <div className="demo-row-controls">
                    {edges.map((e) => (
                      <button
                        key={e}
                        className={`pill-btn ${dockEdge === e ? 'pill-btn--active' : ''}`}
                        onClick={() => {
                          setDockEdge(e);
                          setDockOffset(0.5);
                          setDockRemountKey((k) => k + 1);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="demo-row">
                  <span className="demo-row-label">Snap on Release</span>
                  <div className="demo-row-controls">
                    <button
                      className={`toggle ${dockSnap ? 'toggle--on' : ''}`}
                      onClick={() => setDockSnap((s) => !s)}
                    />
                    <span className="toggle-label">{dockSnap ? 'on' : 'off'}</span>
                  </div>
                </div>

                <div className="demo-row">
                  <span className="demo-row-label">Draggable</span>
                  <div className="demo-row-controls">
                    <button
                      className={`toggle ${dockDraggable ? 'toggle--on' : ''}`}
                      onClick={() => setDockDraggable((d) => !d)}
                    />
                    <span className="toggle-label">{dockDraggable ? 'on' : 'off'}</span>
                  </div>
                </div>

                <div className="demo-row" style={{ borderBottom: 'none' }}>
                  <span className="demo-row-label">Shadow</span>
                  <div className="demo-row-controls">
                    <button
                      className={`toggle ${dockShadow ? 'toggle--on' : ''}`}
                      onClick={() => setDockShadow((s) => !s)}
                    />
                    <span className="toggle-label">{dockShadow ? 'on' : 'off'}</span>
                  </div>
                </div>
            </section>

            <section id="dock-api" className="section" style={{ paddingTop: 0 }}>
              <div className="section-label">API Reference</div>
              <ApiTable
                rows={dockApiRows}
                footnote={
                  <>
                    The container exposes <code>data-edge</code> and <code>data-orientation</code> attributes
                    so you can flip your layout from CSS without re-rendering.
                  </>
                }
              />
            </section>

            <CodeExamplesSection
              id="dock-examples"
              examples={dockExamples}
              activeIndex={dockExample}
              onSelect={setDockExample}
              typesCode={dockTypes}
            />
          </>
        )}

        {activeComponent === 'sheet' && (
          <>
            <WidgetHeader
              prefix="sheet"
              icon={<SheetIcon size={28} />}
              title="DraggableSheet"
              description={
                <>
                  A pull-up / pull-down sheet pinned to an edge with snap points like peek, half, and full.
                  Great for mobile-style details, filters, or cart drawers.
                </>
              }
            />

            <InstallSection id="sheet-install" />

            <section id="sheet-demo" className="section" style={{ paddingTop: 16 }}>
              <div className="section-label">Interactive Demo</div>

              <div className="demo-row">
                <span className="demo-row-label">Edge</span>
                <div className="demo-row-controls">
                  {sheetEdgeOptions.map((e) => (
                    <button
                      key={e}
                      className={`pill-btn ${sheetEdge === e ? 'pill-btn--active' : ''}`}
                      onClick={() => setSheetEdge(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-row">
                <span className="demo-row-label">Snap Point</span>
                <div className="demo-row-controls">
                  {sheetSnapPoints.map((p) => (
                    <button
                      key={String(p)}
                      className={`pill-btn ${sheetSnap === p ? 'pill-btn--active' : ''}`}
                      onClick={() => setSheetSnap(p)}
                    >
                      {String(p)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-row" style={{ borderBottom: 'none' }}>
                <span className="demo-row-label">Close on Outside Click</span>
                <div className="demo-row-controls">
                  <button
                    className={`toggle ${sheetCloseOnOutside ? 'toggle--on' : ''}`}
                    onClick={() => setSheetCloseOnOutside((v) => !v)}
                  />
                  <span className="toggle-label">{sheetCloseOnOutside ? 'on' : 'off'}</span>
                </div>
              </div>
            </section>

            <section id="sheet-api" className="section" style={{ paddingTop: 0 }}>
              <div className="section-label">API Reference</div>
              <ApiTable
                rows={sheetApiRows}
                footnote={
                  <>
                    The wrapper exposes <code>data-edge</code>, <code>data-snap</code>, and{' '}
                    <code>data-dragging</code> so you can drive styles from CSS without re-rendering.
                  </>
                }
              />
            </section>

            <CodeExamplesSection
              id="sheet-examples"
              examples={sheetExamples}
              activeIndex={sheetExample}
              onSelect={setSheetExample}
              typesCode={sheetTypes}
            />
          </>
        )}

        {activeComponent === 'splitter' && (
          <>
            <WidgetHeader
              prefix="splitter"
              icon={<SplitterIcon size={28} />}
              title="ResizableSplitPane"
              description={
                <>
                  An N-pane split view with draggable handles and a single render prop for
                  custom handle UI. Supports min/max constraints, persisted sizes, and both
                  horizontal and vertical layouts.
                </>
              }
            />

            <InstallSection id="splitter-install" />

            <section id="splitter-demo" className="section" style={{ paddingTop: 16 }}>
              <div className="section-label">Interactive Demo</div>

              <div className="demo-row">
                <span className="demo-row-label">Panes</span>
                <div className="demo-row-controls">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className={`pill-btn ${splitterPaneCount === n ? 'pill-btn--active' : ''}`}
                      onClick={() => {
                        setSplitterPaneCount(n);
                        setSplitterSizes(Array.from({ length: n }, () => 1 / n));
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-row">
                <span className="demo-row-label">Orientation</span>
                <div className="demo-row-controls">
                  {(['horizontal', 'vertical'] as SplitOrientation[]).map((o) => (
                    <button
                      key={o}
                      className={`pill-btn ${splitterOrientation === o ? 'pill-btn--active' : ''}`}
                      onClick={() => setSplitterOrientation(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-row">
                <span className="demo-row-label">Draggable</span>
                <div className="demo-row-controls">
                  <button
                    className={`toggle ${splitterDraggable ? 'toggle--on' : ''}`}
                    onClick={() => setSplitterDraggable((d) => !d)}
                  />
                  <span className="toggle-label">{splitterDraggable ? 'on' : 'off'}</span>
                </div>
              </div>

              <div className="demo-row" style={{ borderBottom: 'none' }}>
                <span className="demo-row-label">Sizes</span>
                <div className="demo-row-controls">
                  <span style={{ fontSize: '0.85rem', color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
                    {splitterSizes.map((s) => `${(s * 100).toFixed(0)}%`).join(' / ')}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <ResizableSplitPane
                  key={`${splitterOrientation}-${splitterPaneCount}`}
                  orientation={splitterOrientation}
                  defaultSizes={splitterSizes}
                  onSizesChange={setSplitterSizes}
                  onDrag={setSplitterSizes}
                  draggable={splitterDraggable}
                  minSize={60}
                  handle={({ index, isDragging }) => (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: isDragging ? 'white' : 'var(--text-muted)',
                      transition: 'color 0.15s',
                    }}>
                      {index}
                    </div>
                  )}
                  style={{
                    height: 320,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  {Array.from({ length: splitterPaneCount }, (_, i) => {
                    const colors = [
                      { bg: 'var(--accent-light)', fg: 'var(--accent)' },
                      { bg: 'var(--bg-section)', fg: 'var(--text)' },
                      { bg: '#fef3c7', fg: '#92400e' },
                      { bg: '#ecfdf5', fg: '#065f46' },
                    ];
                    const { bg, fg } = colors[i % colors.length];
                    return (
                      <div
                        key={i}
                        style={{
                          padding: 16,
                          background: bg,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        <strong style={{ color: fg }}>Pane {i}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {i === 0 ? 'Drag handles to resize. Double-click to reset.' : `Pane ${i} content`}
                        </span>
                      </div>
                    );
                  })}
                </ResizableSplitPane>
              </div>
            </section>

            <section id="splitter-api" className="section" style={{ paddingTop: 0 }}>
              <div className="section-label">API Reference</div>
              <ApiTable
                rows={splitterApiRows}
                footnote={
                  <>
                    The container exposes <code>data-orientation</code> and <code>data-dragging</code> attributes.
                    Panes expose <code>data-pane=&#123;index&#125;</code>. Handles expose{' '}
                    <code>data-handle=&#123;index&#125;</code> and <code>data-dragging</code> when active.
                  </>
                }
              />
            </section>

            <CodeExamplesSection
              id="splitter-examples"
              examples={splitterExamples}
              activeIndex={splitterExample}
              onSelect={setSplitterExample}
              typesCode={splitterTypes}
            />
          </>
        )}

        {/* GitHub star CTA */}
        <section className="section github-cta-section">
          <div className="github-cta">
            <div className="github-cta-text">
              <h3>Enjoying react-driftkit?</h3>
              <p>Star the repo on GitHub to help more devs discover it.</p>
            </div>
            <a
              href="https://github.com/shakcho/react-driftkit"
              target="_blank"
              rel="noopener noreferrer"
              className="github-cta-btn"
            >
              <GitHubIcon size={18} />
              Star on GitHub
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <p>
            Created by{' '}
            <a href="https://saktichourasia.dev" target="_blank" rel="noopener noreferrer">
              Sakti Kumar Chourasia
            </a>
          </p>
          <span className="footer-license">MIT License</span>
        </div>
      </footer>

      {/* Live MovableLauncher */}
      {activeComponent === 'launcher' && (
        <MovableLauncher key={position} defaultPosition={position} snapToCorners={snap}>
          <div className="demo-widget">
            <span>{snap ? 'Snap Mode' : 'Free Mode'}</span>
          </div>
        </MovableLauncher>
      )}

      {/* Live SnapDock */}
      {activeComponent === 'dock' && (
        <SnapDock
          key={`dock-${dockRemountKey}-${dockDraggable}`}
          defaultEdge={dockEdge}
          defaultOffset={dockOffset}
          snap={dockSnap}
          draggable={dockDraggable}
          shadow={dockShadow}
          onEdgeChange={setDockEdge}
          onOffsetChange={setDockOffset}
          style={{
            background: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            padding: 6,
            borderRadius: 12,
            gap: 4,
          }}
        >
          <DockIconButton label="Home">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
          </DockIconButton>
          <DockIconButton label="Search">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </DockIconButton>
          <DockIconButton label="Edit">
            <path d="M4 20h4l10-10-4-4L4 16v4z" />
          </DockIconButton>
          <DockIconButton label="Settings">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c0-.4.1-.8.1-1.2z" />
          </DockIconButton>
        </SnapDock>
      )}

      {/* Live DraggableSheet */}
      {activeComponent === 'sheet' && (
        <DraggableSheet
          edge={sheetEdge}
          snap={sheetSnap}
          snapPoints={sheetSnapPoints}
          onSnapChange={(next) => setSheetSnap(next)}
          dragHandleSelector="[data-sheet-handle]"
          closeOnOutsideClick={sheetCloseOnOutside}
          style={{
            background: 'rgba(17, 24, 39, 0.96)',
            color: 'white',
            // Round the two "inner" corners for each edge.
            borderTopLeftRadius: sheetEdge === 'bottom' || sheetEdge === 'right' ? 16 : 0,
            borderTopRightRadius: sheetEdge === 'bottom' || sheetEdge === 'left' ? 16 : 0,
            borderBottomLeftRadius: sheetEdge === 'top' || sheetEdge === 'right' ? 16 : 0,
            borderBottomRightRadius: sheetEdge === 'top' || sheetEdge === 'left' ? 16 : 0,
            boxShadow: '0 0 40px rgba(0,0,0,0.35)',
            display: 'flex',
            // For top/bottom edges the handle sits perpendicular to the drag
            // axis (a column of: handle, body). For left/right edges it
            // rotates 90° so the grab pill always hugs the viewport-interior
            // side of the sheet.
            flexDirection:
              sheetEdge === 'bottom' ? 'column'
              : sheetEdge === 'top' ? 'column-reverse'
              : sheetEdge === 'left' ? 'row-reverse'
              : 'row',
          }}
        >
          <SheetHandleStrip edge={sheetEdge} />
          <SheetCloseButton onClose={() => setSheetSnap('closed')} />
          <div
            style={{
              padding: sheetEdge === 'bottom' || sheetEdge === 'top' ? '8px 20px 20px' : '20px',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              opacity: 0.9,
              overflow: 'auto',
              flex: 1,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 8 }}>DraggableSheet</strong>
            Drag the handle to resize between snap points. Flick fast to skip stops. Tap the × to close.
          </div>
        </DraggableSheet>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
