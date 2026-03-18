import { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';
import { MovableLauncher } from '../src/index';
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

const basicExample = `import { Drift } from 'react-driftkit';

function App() {
  return (
    <Drift>
      <div className="my-widget">
        Hello World
      </div>
    </Drift>
  );
}`;

const snapExample = `import { Drift } from 'react-driftkit';

function App() {
  return (
    <Drift
      defaultPosition="bottom-right"
      snapToCorners
    >
      <MyToolbar />
    </Drift>
  );
}`;

const freeExample = `import { Drift } from 'react-driftkit';

function App() {
  return (
    <Drift defaultPosition={{ x: 100, y: 200 }}>
      <FloatingPanel />
    </Drift>
  );
}`;

const positionExample = `// Snap to a corner
<Drift defaultPosition="top-left" />
<Drift defaultPosition="top-right" />
<Drift defaultPosition="bottom-left" />
<Drift defaultPosition="bottom-right" />

// Or use exact coordinates
<Drift defaultPosition={{ x: 300, y: 150 }} />`;

const fullExample = `import { useState } from 'react';
import { Drift } from 'react-driftkit';

function DevTools() {
  const [snap, setSnap] = useState(true);

  return (
    <Drift
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
    </Drift>
  );
}`;

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [snap, setSnap] = useState(true);
  const [position, setPosition] = useState<Corner>('bottom-right');

  const tabs = [
    { label: 'Basic Usage', code: basicExample },
    { label: 'Snap to Corners', code: snapExample },
    { label: 'Free Positioning', code: freeExample },
    { label: 'All Positions', code: positionExample },
    { label: 'Full Example', code: fullExample },
  ];

  const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <div className="page">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            react-<span className="accent">driftkit</span>
          </a>
          <div className="nav-links">
            <a href="#demo">Demo</a>
            <a href="#api">API</a>
            <a href="#examples">Examples</a>
            <a href="https://github.com/shakcho/react-driftkit" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </nav>

      <div className="content">
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">React + TypeScript &middot; Draggable widgets</div>
          <h1 className="hero-title">react-driftkit</h1>
          <p className="hero-tagline">
            A draggable, floating widget wrapper for React. Snap to corners or drop anywhere on the viewport.
          </p>
        </section>

        {/* Installation */}
        <section className="section">
          <div className="section-label">Installation</div>
          <div className="install-bars">
            {installCommands.map(({ pm, cmd }) => (
              <div className="install-bar" key={pm} onClick={() => navigator.clipboard.writeText(cmd)}>
                <span className="install-bar-badge">{pm}</span>
                <span className="install-bar-cmd">{cmd}</span>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Demo */}
        <section id="demo" className="section">
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

        {/* Output */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-label">Output</div>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="terminal-title">Live Preview</span>
              <span className="terminal-meta">
                {snap ? 'snap mode' : 'free mode'} &middot; {position}
              </span>
            </div>
            <div className="terminal-body">
              <div className="terminal-widget-preview">
                <div className="preview-widget">
                  <span>&#x1f30a;</span>
                  <span>{snap ? 'Snap Mode' : 'Free Mode'}</span>
                </div>
                <p className="preview-hint">
                  Drag the floating widget in the corner of this page
                </p>
                <div className="preview-controls">
                  <button
                    className={`pill-btn ${snap ? 'pill-btn--active' : ''}`}
                    onClick={() => setSnap(true)}
                  >
                    Snap
                  </button>
                  <button
                    className={`pill-btn ${!snap ? 'pill-btn--active' : ''}`}
                    onClick={() => setSnap(false)}
                  >
                    Free
                  </button>
                  {corners.map((c) => (
                    <button
                      key={c}
                      className={`pill-btn pill-btn-dark ${position === c ? 'pill-btn-dark--active' : ''}`}
                      onClick={() => setPosition(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="section">
          <div className="section-label">Features</div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#x1f3af;</div>
              <h3>Snap to Corners</h3>
              <p>Snaps to the nearest viewport corner on release with smooth animation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x270b;</div>
              <h3>Free Drag</h3>
              <p>Drop anywhere on the viewport. No constraints, full freedom.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1f4f1;</div>
              <h3>Touch & Pointer</h3>
              <p>Built on Pointer Events for mouse, touch, and pen.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1f4d0;</div>
              <h3>Viewport Aware</h3>
              <p>Repositions automatically on window resize.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x1f3a8;</div>
              <h3>Fully Styleable</h3>
              <p>Custom className and style props. Zero opinionated styles.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#x26a1;</div>
              <h3>Lightweight</h3>
              <p>Under 3KB gzipped. Zero dependencies beyond React.</p>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id="api" className="section">
          <div className="section-label">API Reference</div>
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
                <tr>
                  <td><code>children</code></td>
                  <td><code>ReactNode</code></td>
                  <td>&mdash;</td>
                  <td>Content rendered inside the draggable container.</td>
                </tr>
                <tr>
                  <td><code>defaultPosition</code></td>
                  <td><code>Corner | {'{ x, y }'}</code></td>
                  <td><code>'bottom-right'</code></td>
                  <td>
                    Initial position. Corner string (<code>'top-left'</code>, <code>'top-right'</code>,{' '}
                    <code>'bottom-left'</code>, <code>'bottom-right'</code>) or coordinates.
                  </td>
                </tr>
                <tr>
                  <td><code>snapToCorners</code></td>
                  <td><code>boolean</code></td>
                  <td><code>false</code></td>
                  <td>When true, animates to the nearest corner on release.</td>
                </tr>
                <tr>
                  <td><code>style</code></td>
                  <td><code>CSSProperties</code></td>
                  <td><code>{'{}'}</code></td>
                  <td>Additional inline styles for the wrapper.</td>
                </tr>
                <tr>
                  <td><code>className</code></td>
                  <td><code>string</code></td>
                  <td><code>''</code></td>
                  <td>Additional CSS class for the wrapper.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="section-label">Types</div>
            <CodeBlock
              language="typescript"
              code={`type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}

interface DriftProps {
  children: ReactNode;
  defaultPosition?: Corner | Position;
  snapToCorners?: boolean;
  style?: CSSProperties;
  className?: string;
}`}
            />
          </div>
        </section>

        {/* Code Examples */}
        <section id="examples" className="section">
          <div className="section-label">Code Examples</div>
          <div className="tabs">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                className={`tab ${activeTab === i ? 'tab--active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CodeBlock code={tabs[activeTab].code} />
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

      {/* Live Drift Widget */}
      <MovableLauncher key={position} defaultPosition={position} snapToCorners={snap}>
        <div className="demo-widget">
          <span className="demo-widget-icon">&#x1f30a;</span>
          <span>{snap ? 'Snap Mode' : 'Free Mode'}</span>
        </div>
      </MovableLauncher>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
