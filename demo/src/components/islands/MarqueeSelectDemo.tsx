import { useCallback, useMemo, useState } from 'react';
import { MarqueeSelect } from 'react-driftkit';

type Node = {
  id: string;
  label: string;
  kind: 'source' | 'transform' | 'sink';
  x: number;
  y: number;
  w: number;
  h: number;
};

const KIND_COLOR: Record<Node['kind'], string> = {
  source: '#6366f1',
  transform: '#0ea5e9',
  sink: '#22c55e',
};

/**
 * A flow-builder board, laid out on a canvas wider and taller than the
 * viewport so dragging into an edge has somewhere to auto-scroll to.
 */
const NODES: Node[] = [
  { id: 'ingest', label: 'Ingest', kind: 'source', x: 40, y: 40, w: 150, h: 64 },
  { id: 'webhook', label: 'Webhook', kind: 'source', x: 40, y: 140, w: 150, h: 64 },
  { id: 'cron', label: 'Schedule', kind: 'source', x: 40, y: 240, w: 150, h: 64 },
  { id: 'parse', label: 'Parse', kind: 'transform', x: 250, y: 60, w: 150, h: 64 },
  { id: 'validate', label: 'Validate', kind: 'transform', x: 250, y: 160, w: 150, h: 64 },
  { id: 'enrich', label: 'Enrich', kind: 'transform', x: 250, y: 260, w: 150, h: 64 },
  { id: 'dedupe', label: 'Dedupe', kind: 'transform', x: 460, y: 40, w: 150, h: 64 },
  { id: 'score', label: 'Score', kind: 'transform', x: 460, y: 140, w: 150, h: 64 },
  { id: 'route', label: 'Route', kind: 'transform', x: 460, y: 240, w: 150, h: 64 },
  { id: 'warehouse', label: 'Warehouse', kind: 'sink', x: 670, y: 60, w: 150, h: 64 },
  { id: 'alerts', label: 'Alerts', kind: 'sink', x: 670, y: 160, w: 150, h: 64 },
  { id: 'archive', label: 'Archive', kind: 'sink', x: 670, y: 260, w: 150, h: 64 },
  { id: 'replay', label: 'Replay', kind: 'source', x: 40, y: 360, w: 150, h: 64 },
  { id: 'backfill', label: 'Backfill', kind: 'transform', x: 250, y: 360, w: 150, h: 64 },
  { id: 'audit', label: 'Audit log', kind: 'sink', x: 460, y: 360, w: 150, h: 64 },
  { id: 'export', label: 'Export', kind: 'sink', x: 670, y: 360, w: 150, h: 64 },
];

const CANVAS_W = 880;
const CANVAS_H = 470;

export default function MarqueeSelectDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [hitTest, setHitTest] = useState<'intersect' | 'contain'>('intersect');
  const [additive, setAdditive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastMode, setLastMode] = useState('—');

  const handleSelect = useCallback((ids: string[]) => setSelected(ids), []);

  const byKind = useMemo(() => {
    const set = new Set(selected);
    return NODES.reduce<Record<string, number>>((acc, n) => {
      if (set.has(n.id)) acc[n.kind] = (acc[n.kind] ?? 0) + 1;
      return acc;
    }, {});
  }, [selected]);

  return (
    <>
      {/* The whole point of `markItems`: hover feedback with no React work. */}
      <style>
        {'.ms-node[data-marquee-hit]{outline:1.5px dashed #6366f1;outline-offset:2px}'}
      </style>

      <div className="demo-row">
        <span className="demo-row-label">Hit test</span>
        <div className="demo-row-controls" style={{ gap: 10 }}>
          <button
            type="button"
            className={`toggle ${hitTest === 'contain' ? 'toggle--on' : ''}`}
            onClick={() => setHitTest((v) => (v === 'contain' ? 'intersect' : 'contain'))}
            aria-label="Toggle between intersect and contain hit testing"
          />
          <span className="toggle-label">
            {hitTest === 'contain'
              ? 'contain — only nodes the box fully encloses'
              : 'intersect — any node the box touches'}
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Additive</span>
        <div className="demo-row-controls" style={{ gap: 10 }}>
          <button
            type="button"
            className={`toggle ${additive ? 'toggle--on' : ''}`}
            onClick={() => setAdditive((v) => !v)}
            aria-label="Toggle additive selection"
          />
          <span className="toggle-label">
            {additive
              ? 'on — every drag extends the selection'
              : 'off — a plain drag replaces it (hold shift to add)'}
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Edge auto-scroll</span>
        <div className="demo-row-controls" style={{ gap: 10 }}>
          <button
            type="button"
            className={`toggle ${autoScroll ? 'toggle--on' : ''}`}
            onClick={() => setAutoScroll((v) => !v)}
            aria-label="Toggle edge auto-scroll"
          />
          <span className="toggle-label">
            {autoScroll
              ? 'on — drag past the right edge and the board follows'
              : 'off — the board stays put'}
          </span>
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">Selection</span>
        <div className="demo-row-controls" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span
            className="toggle-label"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            {selected.length} node{selected.length === 1 ? '' : 's'}
            {selected.length > 0 &&
              ` · ${(['source', 'transform', 'sink'] as const)
                .filter((k) => byKind[k])
                .map((k) => `${byKind[k]} ${k}`)
                .join(', ')}`}
            {' · last mode '}
            {lastMode}
          </span>
          <button
            type="button"
            className="pill-btn"
            onClick={() => setSelected(NODES.map((n) => n.id))}
            style={{ padding: '5px 14px', fontSize: 12 }}
          >
            Select all
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            style={{
              padding: '5px 14px',
              fontSize: 12,
              opacity: selected.length === 0 ? 0.5 : 1,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <MarqueeSelect
          selection={selected}
          additive={additive}
          behavior={{ hitTest, autoScroll, autoScrollMargin: 56, autoScrollSpeed: 16 }}
          on={{
            select: handleSelect,
            start: (info) => setLastMode(info.mode),
            end: (_ids, info) => setLastMode(info.mode),
          }}
          marquee={({ rect, hit, mode }) => (
            <div
              style={{
                position: 'absolute',
                left: rect!.x,
                top: rect!.y,
                width: rect!.width,
                height: rect!.height,
                pointerEvents: 'none',
                zIndex: 2,
                borderRadius: 4,
                border: `1.5px ${mode === 'subtract' ? 'dashed' : 'solid'} #6366f1`,
                background: 'rgba(99, 102, 241, 0.12)',
              }}
            >
              {hit.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: -1,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: '#6366f1',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    lineHeight: '18px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mode === 'subtract' ? '−' : mode === 'add' ? '+' : ''}
                  {hit.length}
                </span>
              )}
            </div>
          )}
          style={{
            position: 'relative',
            height: 380,
            overflow: 'auto',
            background:
              'radial-gradient(circle, var(--border) 1px, transparent 1px) 0 0 / 22px 22px',
            cursor: 'crosshair',
          }}
        >
          {/* Sized to the canvas so the container has somewhere to scroll. */}
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            {NODES.map((node) => (
              <NodeCard key={node.id} node={node} selected={selected.includes(node.id)} />
            ))}
          </div>
        </MarqueeSelect>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        Drag anywhere on the empty canvas to lasso nodes. Hold{' '}
        <strong>shift</strong> (or ⌘/ctrl) to add to the selection,{' '}
        <strong>alt</strong> to subtract from it, and press{' '}
        <strong>Escape</strong> mid-drag to roll the whole thing back. Click
        empty space to clear. Drag past the right or bottom edge and the board
        scrolls under you while the box stays pinned to the point you pressed —
        it works in content coordinates, not screen ones. Pressing a node does{' '}
        <em>not</em> start a marquee, which is what leaves room for per-node drag
        behaviour in a real editor; <code>behavior.startOnItem</code> opts back
        in. Nothing here re-renders on hover: the dashed outline is pure CSS off
        the <code>data-marquee-hit</code> attribute the component writes onto
        each node.
      </div>
    </>
  );
}

function NodeCard({ node, selected }: { node: Node; selected: boolean }) {
  const color = KIND_COLOR[node.kind];
  return (
    <div
      data-marquee-item
      data-marquee-id={node.id}
      className="ms-node"
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${selected ? color : 'var(--border)'}`,
        background: 'var(--bg, #fff)',
        boxShadow: selected ? `0 0 0 2px ${color}33` : 'none',
        fontSize: 13,
        userSelect: 'none',
        transition: 'border-color 120ms, box-shadow 120ms',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 500 }}>{node.label}</span>
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        {node.kind}
      </span>
    </div>
  );
}
