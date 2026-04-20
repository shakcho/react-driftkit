import { useRef, useState } from 'react';
import { ZoomLens } from 'react-driftkit';

export default function ZoomLensDemo() {
  const [zoom, setZoom] = useState(3);
  const [size, setSize] = useState(200);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const imageRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Zoom</span>
        <div className="demo-row-controls">
          <input
            data-zoom-lens-ignore
            type="range"
            min={1.25}
            max={8}
            step={0.25}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {zoom.toFixed(2)}×
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Lens size</span>
        <div className="demo-row-controls">
          <input
            data-zoom-lens-ignore
            type="range"
            min={120}
            max={320}
            step={10}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {size}px
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Crosshair</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-zoom-lens-ignore
            className={`toggle ${showCrosshair ? 'toggle--on' : ''}`}
            onClick={() => setShowCrosshair((v) => !v)}
          />
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">Zoom badge</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-zoom-lens-ignore
            className={`toggle ${showBadge ? 'toggle--on' : ''}`}
            onClick={() => setShowBadge((v) => !v)}
          />
        </div>
      </div>

      <div
        ref={imageRef}
        style={{
          marginTop: 16,
          aspectRatio: '3001 / 1762',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          backgroundImage: 'url(/zoom-lens-demo.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: 'none',
        }}
        aria-label="Hover to inspect the sailboats and water taxi"
      />

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        Hover anywhere on the photo — the lens snaps to your cursor, stays
        inside the image, and hides when you leave. No activation, no drag;
        the <code>target</code> ref wires it to this one element. Zoom into the
        sails, the hulls, the water taxi wake, or the ripple texture.
      </div>

      <ZoomLens
        defaultActive
        target={imageRef}
        zoom={zoom}
        size={size}
        showCrosshair={showCrosshair}
        showZoomBadge={showBadge}
      />
    </>
  );
}
