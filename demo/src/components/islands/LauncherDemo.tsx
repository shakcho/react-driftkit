import { useState } from 'react';
import { MovableLauncher } from 'react-driftkit';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export default function LauncherDemo() {
  const [snap, setSnap] = useState(true);
  const [position, setPosition] = useState<Corner>('bottom-right');

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Position</span>
        <div className="demo-row-controls">
          {corners.map((c) => (
            <button
              key={c}
              type="button"
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
            type="button"
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

      <MovableLauncher key={position} defaultPosition={position} snapToCorners={snap}>
        <div className="demo-widget">
          <span>{snap ? 'Snap Mode' : 'Free Mode'}</span>
        </div>
      </MovableLauncher>
    </>
  );
}
