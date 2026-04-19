import { useState } from 'react';
import { ResizableSplitPane, type SplitOrientation } from 'react-driftkit';

export default function SplitterDemo() {
  const [orientation, setOrientation] = useState<SplitOrientation>('horizontal');
  const [sizes, setSizes] = useState([0.25, 0.5, 0.25]);
  const [draggable, setDraggable] = useState(true);
  const [paneCount, setPaneCount] = useState(3);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Panes</span>
        <div className="demo-row-controls">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={`pill-btn ${paneCount === n ? 'pill-btn--active' : ''}`}
              onClick={() => {
                setPaneCount(n);
                setSizes(Array.from({ length: n }, () => 1 / n));
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
              type="button"
              className={`pill-btn ${orientation === o ? 'pill-btn--active' : ''}`}
              onClick={() => setOrientation(o)}
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
            type="button"
            className={`toggle ${draggable ? 'toggle--on' : ''}`}
            onClick={() => setDraggable((d) => !d)}
          />
          <span className="toggle-label">{draggable ? 'on' : 'off'}</span>
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">Sizes</span>
        <div className="demo-row-controls">
          <span style={{ fontSize: '0.85rem', color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
            {sizes.map((s) => `${(s * 100).toFixed(0)}%`).join(' / ')}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <ResizableSplitPane
          key={`${orientation}-${paneCount}`}
          orientation={orientation}
          defaultSizes={sizes}
          onSizesChange={setSizes}
          onDrag={setSizes}
          draggable={draggable}
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
          {Array.from({ length: paneCount }, (_, i) => {
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
    </>
  );
}
