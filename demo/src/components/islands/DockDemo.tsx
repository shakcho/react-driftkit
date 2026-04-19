import { useState, type ReactNode } from 'react';
import { SnapDock, type Edge } from 'react-driftkit';

const edges: Edge[] = ['left', 'right', 'top', 'bottom'];

function DockIconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

export default function DockDemo() {
  const [edge, setEdge] = useState<Edge>('bottom');
  const [offset, setOffset] = useState(0.5);
  const [snap, setSnap] = useState(true);
  const [draggable, setDraggable] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [remountKey, setRemountKey] = useState(0);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Edge</span>
        <div className="demo-row-controls">
          {edges.map((e) => (
            <button
              key={e}
              type="button"
              className={`pill-btn ${edge === e ? 'pill-btn--active' : ''}`}
              onClick={() => {
                setEdge(e);
                setOffset(0.5);
                setRemountKey((k) => k + 1);
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
            type="button"
            className={`toggle ${snap ? 'toggle--on' : ''}`}
            onClick={() => setSnap((s) => !s)}
          />
          <span className="toggle-label">{snap ? 'on' : 'off'}</span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Draggable</span>
        <div className="demo-row-controls">
          <button
            type="button"
            className={`toggle ${draggable ? 'toggle--on' : ''}`}
            onClick={() => setDraggable((d) => !d)}
          />
          <span className="toggle-label">{draggable ? 'on' : 'off'}</span>
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">Shadow</span>
        <div className="demo-row-controls">
          <button
            type="button"
            className={`toggle ${shadow ? 'toggle--on' : ''}`}
            onClick={() => setShadow((s) => !s)}
          />
          <span className="toggle-label">{shadow ? 'on' : 'off'}</span>
        </div>
      </div>

      <SnapDock
        key={`dock-${remountKey}-${draggable}`}
        defaultEdge={edge}
        defaultOffset={offset}
        snap={snap}
        draggable={draggable}
        shadow={shadow}
        onEdgeChange={setEdge}
        onOffsetChange={setOffset}
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
    </>
  );
}
