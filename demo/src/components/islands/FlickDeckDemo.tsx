import { useState } from 'react';
import { FlickDeck, type FlickDeckPeek } from 'react-driftkit';

type Tip = { id: string; title: string; body: string; color: string };

const INITIAL_TIPS: Tip[] = [
  {
    id: 'overview',
    title: 'Overview',
    body:
      'Stack 2–N cards where each back card peeks out by a configurable amount. Click the peek to flick that card to the front.',
    color: '#111827',
  },
  {
    id: 'details',
    title: 'Details',
    body:
      'Peek from any edge — top, bottom, left, or right. Peek size and animation duration/easing are all configurable.',
    color: '#1e3a8a',
  },
  {
    id: 'stats',
    title: 'Stats',
    body:
      'Cards are React children keyed by id. Controlled or uncontrolled front card, plus optional swipe-to-dismiss for tip-style flows.',
    color: '#065f46',
  },
  {
    id: 'credits',
    title: 'Credits',
    body:
      "Built on a single CSS grid cell with transforms — no runtime deps, no layout thrash. Style the cards however you'd like.",
    color: '#7c2d12',
  },
];

export default function FlickDeckDemo() {
  const [peek, setPeek] = useState<FlickDeckPeek>('bottom');
  const [peekSize, setPeekSize] = useState(28);
  const [depthFade, setDepthFade] = useState(0.1);
  const [hoverPeek, setHoverPeek] = useState(12);
  const [swipe, setSwipe] = useState(false);
  const [duration, setDuration] = useState(320);
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [frontId, setFrontId] = useState<string>('overview');

  const reset = () => {
    setTips(INITIAL_TIPS);
    setFrontId('overview');
  };

  return (
    <>
      <div className="demo-row">
        <span className="demo-row-label">Peek edge</span>
        <div className="demo-row-controls" style={{ gap: 6, flexWrap: 'wrap' }}>
          {(['top', 'bottom', 'left', 'right'] as FlickDeckPeek[]).map((edge) => (
            <button
              key={edge}
              type="button"
              className={`toggle ${peek === edge ? 'toggle--on' : ''}`}
              onClick={() => setPeek(edge)}
              style={{ width: 'auto', padding: '0 12px', fontSize: 12 }}
            >
              {edge}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Peek size</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={8}
            max={64}
            step={2}
            value={peekSize}
            onChange={(e) => setPeekSize(parseInt(e.target.value, 10))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {peekSize}px
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Depth fade</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={depthFade}
            onChange={(e) => setDepthFade(parseFloat(e.target.value))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {depthFade.toFixed(2)}/depth
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Hover peek</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={hoverPeek}
            onChange={(e) => setHoverPeek(parseInt(e.target.value, 10))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {hoverPeek}px
          </span>
        </div>
      </div>

      <div className="demo-row">
        <span className="demo-row-label">Animation</span>
        <div className="demo-row-controls">
          <input
            type="range"
            min={120}
            max={600}
            step={20}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
          />
          <span className="toggle-label" style={{ fontFamily: 'var(--font-mono)' }}>
            {duration}ms
          </span>
        </div>
      </div>

      <div className="demo-row" style={{ borderBottom: 'none' }}>
        <span className="demo-row-label">Swipe to dismiss</span>
        <div className="demo-row-controls" style={{ gap: 10 }}>
          <button
            type="button"
            className={`toggle ${swipe ? 'toggle--on' : ''}`}
            onClick={() => setSwipe((v) => !v)}
          />
          {tips.length < INITIAL_TIPS.length && (
            <button
              type="button"
              className="toggle"
              onClick={reset}
              style={{ width: 'auto', padding: '0 12px', fontSize: 12 }}
            >
              reset deck
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          minHeight: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background:
            'radial-gradient(1200px 400px at 50% -10%, rgba(120, 119, 198, 0.12), transparent 60%), var(--bg-subtle, #fafaf9)',
        }}
      >
        {tips.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Deck empty. <button
              type="button"
              onClick={reset}
              style={{
                background: 'transparent',
                border: 0,
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
                padding: 0,
              }}
            >Reset</button>.
          </div>
        ) : (
          <FlickDeck
            frontId={tips.some((t) => t.id === frontId) ? frontId : tips[0]?.id}
            peek={peek}
            peekSize={peekSize}
            depthFade={depthFade}
            hoverPeek={hoverPeek}
            swipeToDismiss={swipe}
            animation={{ duration }}
            style={{ width: 300 }}
            on={{
              frontChange: setFrontId,
              dismiss: (id) => setTips((cs) => cs.filter((c) => c.id !== id)),
            }}
          >
            {tips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  height: 220,
                  borderRadius: 16,
                  padding: 20,
                  background: tip.color,
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow:
                    '0 1px 2px rgba(0, 0, 0, 0.06), 0 12px 32px -8px rgba(0, 0, 0, 0.28)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                      opacity: 0.75,
                    }}
                  >
                    {tip.id}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
                    {tip.title}
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
                  {tip.body}
                </div>
              </div>
            ))}
          </FlickDeck>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        Hover a peeking card — it nudges out a little further and lifts to full
        opacity as a click affordance. Click it to flick it forward. Flip the
        peek edge and size above to reshape the deck: top/bottom cards recede
        into depth, left/right cards fan out at an angle, and further-back
        cards fade. Toggle swipe-to-dismiss and drag the front card in the
        direction opposite the peek to remove it past the threshold.
      </div>
    </>
  );
}
