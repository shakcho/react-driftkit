import type { ComponentMeta } from './types';

const flickDeckBasic = `import { useState } from 'react';
import { FlickDeck } from 'react-driftkit';

function App() {
  const [frontId, setFrontId] = useState('overview');

  return (
    <FlickDeck
      frontId={frontId}
      peek="bottom"
      peekSize={28}
      on={{ frontChange: setFrontId }}
    >
      <Card key="overview" title="Overview">...</Card>
      <Card key="details"  title="Details">...</Card>
      <Card key="stats"    title="Stats">...</Card>
    </FlickDeck>
  );
}`;

const flickDeckConfigurable = `// Peek from the side instead of the bottom:
<FlickDeck defaultFrontId="a" peek="right" peekSize={32}>
  <div key="a">...</div>
  <div key="b">...</div>
</FlickDeck>

// Swipe the front card off to dismiss it. The component fires
// on.dismiss(id) — the consumer removes that child from children.
const [cards, setCards] = useState([
  { id: 'a', body: 'Tip one' },
  { id: 'b', body: 'Tip two' },
  { id: 'c', body: 'Tip three' },
]);

<FlickDeck
  swipeToDismiss
  dismissThreshold={0.25}
  on={{ dismiss: (id) => setCards((cs) => cs.filter((c) => c.id !== id)) }}
>
  {cards.map((c) => (
    <TipCard key={c.id}>{c.body}</TipCard>
  ))}
</FlickDeck>

// Snappier motion:
<FlickDeck
  animation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)' }}
>
  ...
</FlickDeck>

// Kill the depth cues and get a flat stack (every card same size, no fade):
<FlickDeck depthScale={0} fanAngle={0} depthFade={0} hoverPeek={0}>
  ...
</FlickDeck>

// Dial the affordance up — deeper fade, bigger hover-peek:
<FlickDeck depthFade={0.15} hoverPeek={16}>
  ...
</FlickDeck>`;

const flickDeckTypes = `type FlickDeckPeek = 'top' | 'bottom' | 'left' | 'right';

interface FlickDeckProps {
  // Controlled / uncontrolled front card. The id is the child's React \`key\`.
  frontId?: string;
  defaultFrontId?: string;

  // Which edge the back cards peek from, and how much of each is visible.
  peek?: FlickDeckPeek;        // default 'bottom'
  peekSize?: number;           // default 24 (px)

  // Back cards shrink along the peek axis (top/bottom), fan out at an angle
  // on the peek axis (left/right). Set either to 0 for a flat stack.
  depthScale?: number;         // default 0.05 (5% smaller per depth level)
  fanAngle?: number;           // default 4 (degrees per depth level)

  // Further-back cards fade. Hovered/focused back card peeks out a little
  // more and snaps to full opacity as a click affordance. Set to 0 to disable.
  depthFade?: number;          // default 0.08 (opacity per depth level)
  hoverPeek?: number;          // default 8 (extra px on hover/focus)

  // When true, the front card can be dragged off in the direction opposite
  // of \`peek\` to fire \`on.dismiss\`. Off by default.
  swipeToDismiss?: boolean;
  dismissThreshold?: number;   // fraction of card axis — default 0.3

  animation?: {
    duration?: number;         // default 320 (ms)
    easing?: string;           // default 'cubic-bezier(0.22, 1, 0.36, 1)'
  };

  on?: {
    frontChange?: (id: string) => void;
    dismiss?: (id: string) => void;
  };

  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  cardStyle?: CSSProperties;

  // Each child must have a unique \`key\` — that key is the card's id.
  children?: ReactNode;
}`;

export const flickDeckMeta: ComponentMeta = {
  key: 'flickdeck',
  slug: 'flick-deck',
  title: 'FlickDeck',
  tagline:
    'A stack of cards where each back card peeks from one edge — receding into depth for top/bottom peek, fanning out at an angle for left/right. Click the peek to flick that card to the front, or optionally swipe the front card off to dismiss it. Useful for toggles between views, tip stacks, and side-by-side comparisons.',
  metaDescription:
    'FlickDeck — a stacked card component for React. Back cards peek from a configurable edge, click the peek to flick it forward with a smooth transition, optional swipe-to-dismiss. Controlled or uncontrolled, unstyled, zero runtime deps.',
  apiRows: [
    { prop: 'frontId', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: "Controlled id of the front card — matches a child's React <code>key</code>. Omit for uncontrolled." },
    { prop: 'defaultFrontId', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: "Uncontrolled initial front card id. Falls back to the first child's key if unset." },
    { prop: 'peek', typeHtml: "<code>'top' | 'bottom' | 'left' | 'right'</code>", defaultHtml: "<code>'bottom'</code>", descriptionHtml: 'Which edge the back cards peek from.' },
    { prop: 'peekSize', typeHtml: '<code>number</code>', defaultHtml: '<code>24</code>', descriptionHtml: 'Pixels of each back card that remain visible behind the card in front of it.' },
    { prop: 'depthScale', typeHtml: '<code>number</code>', defaultHtml: '<code>0.05</code>', descriptionHtml: 'How much each back card shrinks per depth level, for top/bottom peek — makes the stack feel recessed. Set to <code>0</code> for a flat stack.' },
    { prop: 'fanAngle', typeHtml: '<code>number</code>', defaultHtml: '<code>4</code>', descriptionHtml: 'Degrees each back card rotates per depth level, for left/right peek — makes the stack fan out at an angle. Set to <code>0</code> for a flat stack.' },
    { prop: 'depthFade', typeHtml: '<code>number</code>', defaultHtml: '<code>0.08</code>', descriptionHtml: 'Opacity subtracted per depth level — further-back cards look more distant. Clamped so no card drops below <code>0.25</code>. Set to <code>0</code> to disable.' },
    { prop: 'hoverPeek', typeHtml: '<code>number</code>', defaultHtml: '<code>8</code>', descriptionHtml: 'Extra pixels a back card translates out along the peek axis when it is hovered or keyboard-focused. Opacity also snaps back to <code>1</code> during the hover to signal clickability. Set to <code>0</code> to disable.' },
    { prop: 'swipeToDismiss', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'When true, the front card can be pointer-dragged off in the direction opposite the peek to fire <code>on.dismiss</code>.' },
    { prop: 'dismissThreshold', typeHtml: '<code>number</code>', defaultHtml: '<code>0.3</code>', descriptionHtml: "Fraction of the card's axis size the drag must cross to count as a dismiss. Values are clamped to <code>[0, 1]</code>." },
    { prop: 'animation', typeHtml: '<code>FlickDeckAnimation</code>', defaultHtml: '—', descriptionHtml: 'Override the transition used for the flick and swipe animations — <code>duration</code> (ms) and <code>easing</code> (CSS easing).' },
    { prop: 'animation.duration', typeHtml: '<code>number</code>', defaultHtml: '<code>320</code>', descriptionHtml: 'Transition duration in milliseconds.' },
    { prop: 'animation.easing', typeHtml: '<code>string</code>', defaultHtml: "<code>'cubic-bezier(0.22, 1, 0.36, 1)'</code>", descriptionHtml: 'CSS easing function applied to transform and opacity transitions.' },
    { prop: 'on', typeHtml: '<code>FlickDeckEvents</code>', defaultHtml: '—', descriptionHtml: 'Event handlers: <code>frontChange</code>, <code>dismiss</code>. Both optional.' },
    { prop: 'on.frontChange', typeHtml: '<code>(id: string) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires whenever the front card changes — click, keyboard activation, or setter.' },
    { prop: 'on.dismiss', typeHtml: '<code>(id: string) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires when the front card is swiped past <code>dismissThreshold</code>. Consumer is expected to remove that child from <code>children</code>.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the deck container.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the deck container.' },
    { prop: 'cardClassName', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to every card wrapper.' },
    { prop: 'cardStyle', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto every card wrapper.' },
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: "Each child must have a unique <code>key</code> — that key is the card's id." },
  ],
  apiFootnoteHtml:
    'The deck lays its cards out in a single CSS grid cell and offsets back cards via <code>transform</code>, so the container auto-sizes to the largest card plus padding for the peek. Each card wrapper exposes <code>data-flick-deck-card</code>, <code>data-flick-deck-front</code>, <code>data-flick-deck-active</code> (hovered/focused back card), and <code>data-flick-deck-depth</code> so you can drive styles from CSS without re-rendering.',
  codeExamples: [
    { label: 'Basic Usage', code: flickDeckBasic },
    { label: 'Configurable', code: flickDeckConfigurable },
  ],
  typesCode: flickDeckTypes,
};
