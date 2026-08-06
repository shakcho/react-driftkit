import { useCallback, useRef, useState } from 'react';
import { PullToRefresh, type PullToRefreshState } from 'react-driftkit';

type Row = { id: number; title: string; meta: string };

const SUBJECTS = [
  'Deploy finished',
  'New follower',
  'Build passed',
  'Comment on #412',
  'Weekly digest',
  'Invoice paid',
  'Sync completed',
  'Backup archived',
  'Review requested',
  'Alert resolved',
];

let nextId = 1;

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const id = nextId++;
    return {
      id,
      title: SUBJECTS[(id + i) % SUBJECTS.length],
      meta: `#${String(id).padStart(4, '0')} · just now`,
    };
  });
}

/** Arrow that rotates with the pull and spins while refreshing. */
function Indicator({ progress, armed, refreshing }: PullToRefreshState) {
  const label = refreshing
    ? 'Refreshing…'
    : armed
      ? 'Release to refresh'
      : 'Pull to refresh';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: 'var(--text-muted)',
        opacity: refreshing ? 1 : 0.4 + progress * 0.6,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transform: refreshing
            ? undefined
            : `rotate(${armed ? 180 : progress * 180}deg)`,
          transition: 'transform 120ms linear',
          animation: refreshing ? 'ptr-spin 700ms linear infinite' : undefined,
        }}
      >
        {refreshing ? (
          <>
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="M6 13l6 6 6-6" />
          </>
        )}
      </svg>
      <span>{label}</span>
      <style>{'@keyframes ptr-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  );
}

export default function PullToRefreshDemo() {
  const [rows, setRows] = useState<Row[]>(() => makeRows(12));
  const [refreshing, setRefreshing] = useState(false);
  const [threshold, setThreshold] = useState(64);
  const [resistance, setResistance] = useState(0.7);
  const [wheel, setWheel] = useState(true);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<PullToRefreshState['phase']>('idle');
  const [source, setSource] = useState<string>('—');
  const inFlight = useRef(false);

  // Controlled mode: the gesture and the toolbar button share one code path,
  // which is also how you give the feature a keyboard-reachable affordance.
  const reload = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 900));
    setRows((prev) => [...makeRows(3), ...prev].slice(0, 24));
    setCount((c) => c + 1);
    setRefreshing(false);
    inFlight.current = false;
  }, []);

  const handleState = useCallback((s: PullToRefreshState) => {
    setPhase(s.phase);
    if (s.source) setSource(s.source);
  }, []);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Threshold</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={32}
            max={140}
            step={4}
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {threshold}px
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Resistance</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={resistance}
            onChange={(e) => setResistance(parseFloat(e.target.value))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {resistance.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Wheel / trackpad</span>
        <div className="demo-row-controls" style={{ gap: 10 }}>
          <button
            type="button"
            className={`toggle ${wheel ? 'toggle--on' : ''}`}
            onClick={() => setWheel((v) => !v)}
            aria-label="Toggle the wheel and trackpad path"
          />
          <span className="toggle-label">
            {wheel ? 'on — scroll up at the top of the list' : 'off — pointer drag only'}
          </span>
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">State</span>
        <div className="demo-row-controls" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span
            className="toggle-label"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            {phase} · via {source} · {count} refresh{count === 1 ? '' : 'es'}
          </span>
          <button
            type="button"
            className="pill-btn"
            onClick={reload}
            disabled={refreshing}
            style={{ padding: '5px 14px', fontSize: 12, opacity: refreshing ? 0.5 : 1 }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          background: 'var(--bg-subtle, #fafaf9)',
        }}
      >
        <PullToRefresh
          refreshing={refreshing}
          behavior={{ threshold, resistance, wheel, maxPull: 180 }}
          indicator={(s) => <Indicator {...s} />}
          on={{ refresh: reload, stateChange: handleState }}
        >
          <div
            style={{
              height: 320,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                  background: 'var(--bg, #fff)',
                }}
              >
                <span>{row.title}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  {row.meta}
                </span>
              </div>
            ))}
          </div>
        </PullToRefresh>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        On a phone, drag the list down. On a desktop, either drag with the mouse
        or just scroll up with a wheel or trackpad while the list is at the top —
        the overscroll drives the same gesture and releases when the input goes
        quiet. Scroll down first and the gesture stays out of the way, because it
        only arms when the inner scroller is already at its top. The button runs
        the identical code path: this demo is in controlled mode, where the
        <code> refreshing</code> prop owns the state and the gesture is just one
        way to set it.
      </div>
    </>
  );
}
