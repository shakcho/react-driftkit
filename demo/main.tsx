import { useState, useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';
import {
  MovableLauncher,
  SnapDock,
  PinnableTooltip,
  type Edge,
  type TooltipPlacement,
  type TooltipTrigger,
} from '../src/index';
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

function TooltipIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
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
      <rect x="6" y="10" width="22" height="14" rx="3" />
      <path d="M14 24l3 4 3-4" />
      <circle cx="31" cy="9" r="3" fill="currentColor" stroke="none" />
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

const tooltipBasic = `import { PinnableTooltip } from 'react-driftkit';

function App() {
  return (
    <PinnableTooltip content="Drag me to tear off">
      <button>Hover me</button>
    </PinnableTooltip>
  );
}`;

const tooltipDebug = `import { PinnableTooltip } from 'react-driftkit';

// A hover-revealed debug panel that tears off into a movable card.
<PinnableTooltip
  placement="right"
  trigger="hover"
  content={
    <pre style={{ margin: 0, padding: 12, background: '#111', color: '#0f0' }}>
      {JSON.stringify(state, null, 2)}
    </pre>
  }
>
  <button>state</button>
</PinnableTooltip>`;

const tooltipControlled = `import { useState } from 'react';
import { PinnableTooltip, type TooltipPosition } from 'react-driftkit';

function App() {
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  return (
    <PinnableTooltip
      pinned={pinned}
      pinPosition={position ?? undefined}
      onPinnedChange={(next, pos) => {
        setPinned(next);
        if (pos) setPosition(pos);
      }}
      onPinPositionChange={setPosition}
      content={({ pinned: isPinned, unpin }) => (
        <div>
          {isPinned && <button onClick={unpin}>×</button>}
          <p>Persistent note</p>
        </div>
      )}
    >
      <button>Target</button>
    </PinnableTooltip>
  );
}`;

const tooltipRenderProp = `// Use a render-prop to expose an unpin control inside content.
<PinnableTooltip
  content={({ pinned, unpin }) => (
    <div className="debug-card">
      <header>
        <span>debug</span>
        {pinned && <button onClick={unpin}>close</button>}
      </header>
      <DebugInfo />
    </div>
  )}
>
  <DebugBadge />
</PinnableTooltip>`;

const tooltipTriggers = `// Hover (default)
<PinnableTooltip trigger="hover" content="..."><button /></PinnableTooltip>

// Keyboard focus
<PinnableTooltip trigger="focus" content="..."><button /></PinnableTooltip>

// Click to toggle
<PinnableTooltip trigger="click" content="..."><button /></PinnableTooltip>

// Manual — pair with the \`open\` prop
<PinnableTooltip trigger="manual" open={isOpen} content="...">
  <button />
</PinnableTooltip>`;

const tooltipTypes = `type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual';

interface TooltipPosition { x: number; y: number; }

interface PinnableTooltipContentApi {
  pinned: boolean;
  unpin: () => void;
  position: TooltipPosition | null;
}

interface PinnableTooltipProps {
  children: ReactElement;
  content: ReactNode | ((api: PinnableTooltipContentApi) => ReactNode);
  placement?: TooltipPlacement;     // default 'top'
  trigger?: TooltipTrigger;         // default 'hover'
  offset?: number;                  // default 8
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  pinned?: boolean;
  defaultPinned?: boolean;
  onPinnedChange?: (pinned: boolean, position: TooltipPosition | null) => void;
  pinPosition?: TooltipPosition;
  defaultPinPosition?: TooltipPosition;
  onPinPositionChange?: (position: TooltipPosition) => void;
  tooltipStyle?: CSSProperties;
  tooltipClassName?: string;
}`;

const tooltipApiRows: ApiRow[] = [
  { prop: 'children', type: 'ReactElement', default: <>&mdash;</>, description: 'Single element to anchor the tooltip to. Cloned with a merged ref.' },
  { prop: 'content', type: <code>ReactNode | ((api) =&gt; ReactNode)</code>, default: <>&mdash;</>, description: <>Tooltip body. Pass a function to receive <code>{'{ pinned, unpin, position }'}</code>.</> },
  { prop: 'placement', type: "'top' | 'bottom' | 'left' | 'right'", default: "'top'", description: 'Which side of the anchor the tooltip sits on. Clamped to the viewport.' },
  { prop: 'trigger', type: "'hover' | 'focus' | 'click' | 'manual'", default: "'hover'", description: <>Open trigger while unpinned. <code>'manual'</code> requires the <code>open</code> prop.</> },
  { prop: 'offset', type: 'number', default: '8', description: 'Gap in pixels between anchor and tooltip.' },
  { prop: 'open', type: 'boolean', default: <>&mdash;</>, description: 'Controlled open state for the unpinned tooltip.' },
  { prop: 'defaultOpen', type: 'boolean', default: 'false', description: 'Uncontrolled initial open state.' },
  { prop: 'onOpenChange', type: <code>(open: boolean) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires when the unpinned open state changes.' },
  { prop: 'pinned', type: 'boolean', default: <>&mdash;</>, description: 'Controlled pin state. Overrides internal state if provided.' },
  { prop: 'defaultPinned', type: 'boolean', default: 'false', description: 'Uncontrolled initial pin state.' },
  { prop: 'onPinnedChange', type: <code>(pinned, position) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires when the tooltip is torn off or unpinned.' },
  { prop: 'pinPosition', type: <code>{'{ x, y }'}</code>, default: <>&mdash;</>, description: 'Controlled free position while pinned.' },
  { prop: 'defaultPinPosition', type: <code>{'{ x, y }'}</code>, default: <>&mdash;</>, description: 'Uncontrolled initial pinned position.' },
  { prop: 'onPinPositionChange', type: <code>(position) =&gt; void</code>, default: <>&mdash;</>, description: 'Fires while the pinned tooltip is dragged.' },
  { prop: 'tooltipStyle', type: 'CSSProperties', default: '{}', description: 'Additional inline styles for the tooltip wrapper.' },
  { prop: 'tooltipClassName', type: 'string', default: "''", description: 'Additional CSS class for the tooltip wrapper.' },
];

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

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type ActiveComponent = 'launcher' | 'dock' | 'tooltip';
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

function App() {
  const [activeComponent, setActiveComponent] = useState<ActiveComponent>('launcher');

  // Launcher state
  const [launcherExample, setLauncherExample] = useState(0);
  const [snap, setSnap] = useState(true);
  const [position, setPosition] = useState<Corner>('bottom-right');

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

  // Tooltip state
  const [tooltipExample, setTooltipExample] = useState(0);
  const [tooltipPlacement, setTooltipPlacement] = useState<TooltipPlacement>('top');
  const [tooltipTrigger, setTooltipTrigger] = useState<TooltipTrigger>('hover');
  const [tooltipRemountKey, setTooltipRemountKey] = useState(0);

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

  const tooltipExamples = [
    { label: 'Basic Usage', code: tooltipBasic },
    { label: 'Debug Overlay', code: tooltipDebug },
    { label: 'Triggers', code: tooltipTriggers },
    { label: 'Controlled', code: tooltipControlled },
    { label: 'Render Prop', code: tooltipRenderProp },
  ];
  const tooltipPlacementOptions: TooltipPlacement[] = ['top', 'bottom', 'left', 'right'];
  const tooltipTriggerOptions: TooltipTrigger[] = ['hover', 'focus', 'click', 'manual'];

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
          <div className="nav-links">
            <button
              className={`nav-component-btn ${activeComponent === 'launcher' ? 'nav-component-btn--active' : ''}`}
              onClick={() => setActiveComponent('launcher')}
              aria-pressed={activeComponent === 'launcher'}
            >
              <MoveIcon size={16} strokeWidth={2.2} />
              MovableLauncher
            </button>
            <button
              className={`nav-component-btn ${activeComponent === 'dock' ? 'nav-component-btn--active' : ''}`}
              onClick={() => setActiveComponent('dock')}
              aria-pressed={activeComponent === 'dock'}
            >
              <DockGlyphIcon size={16} />
              SnapDock
            </button>
            <button
              className={`nav-component-btn ${activeComponent === 'tooltip' ? 'nav-component-btn--active' : ''}`}
              onClick={() => setActiveComponent('tooltip')}
              aria-pressed={activeComponent === 'tooltip'}
            >
              <TooltipIcon size={16} strokeWidth={2.2} />
              PinnableTooltip
            </button>
          </div>
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

        {activeComponent === 'tooltip' && (
          <>
            <WidgetHeader
              prefix="tooltip"
              icon={<TooltipIcon size={28} />}
              title="PinnableTooltip"
              description={
                <>
                  A tooltip anchored to any element — hover, focus, or click to reveal, then drag
                  the tooltip itself to tear it off into a persistent draggable card. Great for
                  debug overlays and inspector panels.
                </>
              }
            />

            <InstallSection id="tooltip-install" />

            <section id="tooltip-demo" className="section" style={{ paddingTop: 16 }}>
              <div className="section-label">Interactive Demo</div>

              <div className="demo-row">
                <span className="demo-row-label">Placement</span>
                <div className="demo-row-controls">
                  {tooltipPlacementOptions.map((p) => (
                    <button
                      key={p}
                      className={`pill-btn ${tooltipPlacement === p ? 'pill-btn--active' : ''}`}
                      onClick={() => {
                        setTooltipPlacement(p);
                        setTooltipRemountKey((k) => k + 1);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-row" style={{ borderBottom: 'none' }}>
                <span className="demo-row-label">Trigger</span>
                <div className="demo-row-controls">
                  {tooltipTriggerOptions.map((t) => (
                    <button
                      key={t}
                      className={`pill-btn ${tooltipTrigger === t ? 'pill-btn--active' : ''}`}
                      onClick={() => {
                        setTooltipTrigger(t);
                        setTooltipRemountKey((k) => k + 1);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: 32,
                  padding: '48px 24px',
                  border: '1px dashed #d1d5db',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 160,
                  background: '#fafafa',
                }}
              >
                <PinnableTooltip
                  key={`tooltip-${tooltipRemountKey}`}
                  placement={tooltipPlacement}
                  trigger={tooltipTrigger}
                  open={tooltipTrigger === 'manual' ? true : undefined}
                  content={({ pinned, unpin }) => (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        background: 'rgba(17, 24, 39, 0.96)',
                        color: 'white',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                        maxWidth: 260,
                      }}
                    >
                      <span>
                        {pinned ? 'Pinned — drag me around' : 'Drag me to tear off'}
                      </span>
                      {pinned && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={unpin}
                          style={{
                            background: 'transparent',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                >
                  <button
                    style={{
                      padding: '10px 18px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    {tooltipTrigger === 'click' ? 'Click me' : tooltipTrigger === 'focus' ? 'Tab to me' : 'Hover me'}
                  </button>
                </PinnableTooltip>
              </div>
            </section>

            <section id="tooltip-api" className="section" style={{ paddingTop: 0 }}>
              <div className="section-label">API Reference</div>
              <ApiTable
                rows={tooltipApiRows}
                footnote={
                  <>
                    The tooltip exposes <code>data-placement</code>, <code>data-pinned</code>, and
                    <code> data-dragging</code> attributes so you can drive CSS from state without
                    re-rendering.
                  </>
                }
              />
            </section>

            <CodeExamplesSection
              id="tooltip-examples"
              examples={tooltipExamples}
              activeIndex={tooltipExample}
              onSelect={setTooltipExample}
              typesCode={tooltipTypes}
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
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
