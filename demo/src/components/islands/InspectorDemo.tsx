import { useState } from 'react';
import { InspectorBubble, type ElementInfo } from 'react-driftkit';

export default function InspectorDemo() {
  const [active, setActive] = useState(false);
  const [info, setInfo] = useState<ElementInfo | null>(null);
  const [boxModel, setBoxModel] = useState(true);
  const [showColors, setShowColors] = useState(true);
  const [showSpacing, setShowSpacing] = useState(true);
  const [showA11y, setShowA11y] = useState(true);

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Active</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-inspector-bubble-ignore
            className={`toggle ${active ? 'toggle--on' : ''}`}
            onClick={() => setActive((a) => !a)}
          />
          <span className="toggle-label">
            {active ? 'picking' : 'off'} · ⌘⇧C toggles
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Box model</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-inspector-bubble-ignore
            className={`toggle ${boxModel ? 'toggle--on' : ''}`}
            onClick={() => setBoxModel((b) => !b)}
          />
          <span className="toggle-label">{boxModel ? 'on' : 'outline only'}</span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Colors + contrast</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-inspector-bubble-ignore
            className={`toggle ${showColors ? 'toggle--on' : ''}`}
            onClick={() => setShowColors((c) => !c)}
          />
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Spacing</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-inspector-bubble-ignore
            className={`toggle ${showSpacing ? 'toggle--on' : ''}`}
            onClick={() => setShowSpacing((s) => !s)}
          />
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">A11y (role + name + state)</span>
        <div className="demo-row-controls">
          <button
            type="button"
            data-inspector-bubble-ignore
            className={`toggle ${showA11y ? 'toggle--on' : ''}`}
            onClick={() => setShowA11y((a) => !a)}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 24,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-section)',
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Primary button
          </button>
          <button style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', padding: '10px 18px', borderRadius: 8, fontSize: 14 }}>
            Warning chip
          </button>
          <button style={{ background: 'transparent', color: '#6366f1', border: '1px solid #c7d2fe', padding: '10px 18px', borderRadius: 8, fontSize: 14 }}>
            Ghost button
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Turn on the picker, then hover any of these elements — including this text.
          The overlay shows the box-model layers and the bubble reports the tag,
          selector, dimensions, font, color + background + WCAG contrast, and
          padding/margin.
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: 16, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            card.accent
          </div>
          <div style={{ flex: 1, padding: 16, background: '#1f2937', color: '#f9fafb', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            card.dark
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button aria-label="Toggle menu" aria-expanded="false" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}>
            ☰
          </button>
          <button role="switch" aria-checked="true" aria-label="Dark mode" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}>
            switch (checked)
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" defaultChecked /> Labeled checkbox
          </label>
          <label style={{ fontSize: 13 }}>
            Email
            <input type="email" placeholder="you@example.com" style={{ marginLeft: 6, padding: '4px 8px' }} />
          </label>
          <button disabled aria-label="Disabled action" style={{ padding: '8px 12px' }}>
            Disabled
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 'var(--radius)',
          border: '1px dashed var(--border)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          minHeight: 48,
        }}
      >
        {info ? (
          <>
            <span style={{ color: 'var(--accent)' }}>selected:</span>{' '}
            <span>{info.selector}</span>{' '}
            <span>
              · {Math.round(info.rect.width)}×{Math.round(info.rect.height)}
            </span>{' '}
            {info.contrastRatio !== null && (
              <span>· contrast {info.contrastRatio.toFixed(2)}:1</span>
            )}
          </>
        ) : (
          'Nothing selected yet. Click an element while the picker is on.'
        )}
      </div>

      <InspectorBubble
        active={active}
        behavior={{ hotkey: 'cmd+shift+c' }}
        highlight={{ boxModel }}
        bubble={{
          fields: {
            colors: showColors,
            spacing: showSpacing,
            role: showA11y,
            accessibleName: showA11y,
            a11yState: showA11y,
          },
        }}
        on={{
          activeChange: setActive,
          select: (_, picked) => setInfo(picked),
        }}
      />
    </>
  );
}
