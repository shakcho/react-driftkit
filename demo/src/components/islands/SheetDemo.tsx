import { useState } from 'react';
import { DraggableSheet, type SheetEdge, type SnapPoint } from 'react-driftkit';

const sheetEdgeOptions: SheetEdge[] = ['bottom', 'top', 'left', 'right'];
const sheetSnapPoints: SnapPoint[] = ['closed', 'peek', 'half', 'full'];

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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}

export default function SheetDemo() {
  const [edge, setEdge] = useState<SheetEdge>('bottom');
  const [snap, setSnap] = useState<SnapPoint>('half');
  const [closeOnOutside, setCloseOnOutside] = useState(true);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Edge</span>
        <div className="demo-row-controls">
          {sheetEdgeOptions.map((e) => (
            <button
              key={e}
              type="button"
              className={`pill-btn ${edge === e ? 'pill-btn--active' : ''}`}
              onClick={() => setEdge(e)}
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
              type="button"
              className={`pill-btn ${snap === p ? 'pill-btn--active' : ''}`}
              onClick={() => setSnap(p)}
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
            type="button"
            className={`toggle ${closeOnOutside ? 'toggle--on' : ''}`}
            onClick={() => setCloseOnOutside((v) => !v)}
          />
          <span className="toggle-label">{closeOnOutside ? 'on' : 'off'}</span>
        </div>
      </div>

      <DraggableSheet
        edge={edge}
        snap={snap}
        snapPoints={sheetSnapPoints}
        onSnapChange={(next) => setSnap(next)}
        dragHandleSelector="[data-sheet-handle]"
        closeOnOutsideClick={closeOnOutside}
        style={{
          background: 'rgba(17, 24, 39, 0.96)',
          color: 'white',
          borderTopLeftRadius: edge === 'bottom' || edge === 'right' ? 16 : 0,
          borderTopRightRadius: edge === 'bottom' || edge === 'left' ? 16 : 0,
          borderBottomLeftRadius: edge === 'top' || edge === 'right' ? 16 : 0,
          borderBottomRightRadius: edge === 'top' || edge === 'left' ? 16 : 0,
          boxShadow: '0 0 40px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection:
            edge === 'bottom' ? 'column'
            : edge === 'top' ? 'column-reverse'
            : edge === 'left' ? 'row-reverse'
            : 'row',
        }}
      >
        <SheetHandleStrip edge={edge} />
        <SheetCloseButton onClose={() => setSnap('closed')} />
        <div
          style={{
            padding: edge === 'bottom' || edge === 'top' ? '8px 20px 20px' : '20px',
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
    </>
  );
}
