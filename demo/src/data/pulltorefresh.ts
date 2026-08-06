import type { ComponentMeta } from './types';

const pullToRefreshBasic = `import { useState } from 'react';
import { PullToRefresh } from 'react-driftkit';

function Feed() {
  const [items, setItems] = useState(initialItems);

  return (
    <PullToRefresh
      on={{ refresh: async () => setItems(await fetchItems()) }}
      indicator={({ progress, armed, refreshing }) => (
        <span>
          {refreshing ? 'Refreshing…' : armed ? 'Release to refresh' : 'Pull to refresh'}
          {' '}({Math.round(progress * 100)}%)
        </span>
      )}
    >
      {items.map((item) => <Row key={item.id} {...item} />)}
    </PullToRefresh>
  );
}`;

const pullToRefreshConfigurable = `// Controlled — drive the refreshing state yourself, so a toolbar button and
// the gesture share one code path. Required if you also want a keyboard or
// screen-reader affordance, which the gesture alone cannot provide.
const [refreshing, setRefreshing] = useState(false);

const reload = async () => {
  setRefreshing(true);
  await fetchItems();
  setRefreshing(false);
};

<>
  <button onClick={reload}>Refresh</button>
  <PullToRefresh refreshing={refreshing} on={{ refresh: reload }}>
    {rows}
  </PullToRefresh>
</>

// Heavier pull with more travel before it arms:
<PullToRefresh behavior={{ threshold: 96, maxPull: 220, resistance: 0.5 }}>
  {rows}
</PullToRefresh>

// Touch only — drop the desktop wheel path:
<PullToRefresh behavior={{ wheel: false }}>{rows}</PullToRefresh>

// Point at a specific inner scroller instead of auto-detecting it:
<PullToRefresh behavior={{ scrollSelector: '[data-feed]' }}>
  <div data-feed style={{ overflowY: 'auto', height: 400 }}>{rows}</div>
</PullToRefresh>

// Turn the gesture off while a page is in an error or empty state:
<PullToRefresh disabled={offline}>{rows}</PullToRefresh>

// Snappier settle:
<PullToRefresh animation={{ duration: 180, easing: 'ease-out' }}>
  {rows}
</PullToRefresh>`;

const pullToRefreshTypes = `type PullToRefreshPhase =
  | 'idle' | 'pulling' | 'armed' | 'refreshing' | 'settling';

type PullSource = 'pointer' | 'wheel';

interface PullToRefreshState {
  phase: PullToRefreshPhase;
  distance: number;      // px, after resistance damping
  progress: number;      // distance / threshold, clamped to [0, 1]
  armed: boolean;        // release now and it refreshes
  refreshing: boolean;
  source: PullSource | null;
}

interface PullToRefreshProps {
  children?: ReactNode;

  // Renders the reveal area above the content, on every pull frame.
  indicator?: (state: PullToRefreshState) => ReactNode;
  indicatorHeight?: number;    // default 56 (px)

  // Controlled refreshing flag. Omit and the promise returned by
  // \`on.refresh\` decides when the refresh is over.
  refreshing?: boolean;

  disabled?: boolean;          // default false

  behavior?: {
    threshold?: number;        // default 64 — distance that arms a refresh
    maxPull?: number;          // default 160 — damping ceiling
    resistance?: number;       // default 0.7 — lower feels heavier
    refreshOffset?: number;    // defaults to threshold
    pointer?: boolean;         // default true — mouse / touch / pen
    wheel?: boolean;           // default true — wheel & trackpad
    wheelReleaseMs?: number;   // default 140 — quiet period that ends a wheel pull
    minRefreshMs?: number;     // default 400 — anti-flicker floor
    scrollSelector?: string;   // override scroller auto-detection
  };

  animation?: {
    duration?: number;         // default 280 (ms)
    easing?: string;           // default 'cubic-bezier(0.22, 1, 0.36, 1)'
  };

  on?: {
    refresh?: () => void | Promise<unknown>;
    stateChange?: (state: PullToRefreshState) => void;
  };

  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  indicatorClassName?: string;
  indicatorStyle?: CSSProperties;
}`;

export const pullToRefreshMeta: ComponentMeta = {
  key: 'pulltorefresh',
  slug: 'pull-to-refresh',
  title: 'PullToRefresh',
  tagline:
    'Pull down at the top of a list to reload it — with a desktop path that most pull-to-refresh libraries skip. Touch and mouse drags run through Pointer Events; wheel and trackpad overscroll drives the same gesture, releasing when the wheel goes quiet. Rubber-band damping, an arm threshold, and a render-prop indicator you style yourself.',
  metaDescription:
    'PullToRefresh is a React pull-to-refresh component that works on mobile and desktop — touch drag, mouse drag, and trackpad/wheel overscroll all drive the same gesture. Rubber-band resistance, arm threshold, promise-aware or controlled refreshing state, unstyled render-prop indicator. React 18 & React 19.',
  seoDescriptor: 'React Pull to Refresh Component (Mobile & Desktop)',
  seoKeywords:
    'react pull to refresh, react pull down to refresh, react swipe to refresh, react pull to refresh desktop, react-simple-pull-to-refresh alternative, react overscroll refresh, react feed refresh, react-driftkit PullToRefresh',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: 'The scrollable content. It is translated down as the pull opens.' },
    { prop: 'indicator', typeHtml: '<code>(state: PullToRefreshState) =&gt; ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Renders the reveal area above the content, called on every pull frame with the live state. Omit it and the pull still works — there is just nothing to see.' },
    { prop: 'indicatorHeight', typeHtml: '<code>number</code>', defaultHtml: '<code>56</code>', descriptionHtml: 'Height in px of the indicator strip. The strip is parked exactly this far above the fold at rest.' },
    { prop: 'refreshing', typeHtml: '<code>boolean</code>', defaultHtml: '—', descriptionHtml: 'Controlled refreshing flag. When provided, the component holds the refreshing state until this flips back to <code>false</code> — use it to drive a refresh from a button or any other non-gesture affordance. Omit for uncontrolled.' },
    { prop: 'disabled', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Turns the gesture off without unmounting. An in-flight pull settles back immediately.' },
    { prop: 'behavior', typeHtml: '<code>PullToRefreshBehavior</code>', defaultHtml: '—', descriptionHtml: 'Gesture tuning — thresholds, damping, and which input paths are live.' },
    { prop: 'behavior.threshold', typeHtml: '<code>number</code>', defaultHtml: '<code>64</code>', descriptionHtml: 'Pull distance in px that arms a refresh. Releasing at or past it fires <code>on.refresh</code>.' },
    { prop: 'behavior.maxPull', typeHtml: '<code>number</code>', defaultHtml: '<code>160</code>', descriptionHtml: 'Ceiling the damped pull asymptotically approaches. The content never travels further than this no matter how hard the user pulls.' },
    { prop: 'behavior.resistance', typeHtml: '<code>number</code>', defaultHtml: '<code>0.7</code>', descriptionHtml: 'How much of the raw input travel becomes pull distance before damping. Lower values feel heavier.' },
    { prop: 'behavior.refreshOffset', typeHtml: '<code>number</code>', defaultHtml: '<code>threshold</code>', descriptionHtml: 'Distance the content holds at while refreshing, so the indicator stays visible.' },
    { prop: 'behavior.pointer', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Enables the pointer-drag path — one code path for mouse, touch, and pen.' },
    { prop: 'behavior.wheel', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Enables the wheel &amp; trackpad overscroll path. This is what makes the gesture usable on desktop, where nobody drags a list with the mouse.' },
    { prop: 'behavior.wheelReleaseMs', typeHtml: '<code>number</code>', defaultHtml: '<code>140</code>', descriptionHtml: 'Quiet period in ms after the last wheel event that counts as a release. A wheel has no <code>pointerup</code>, so the gesture ends when the input stops.' },
    { prop: 'behavior.minRefreshMs', typeHtml: '<code>number</code>', defaultHtml: '<code>400</code>', descriptionHtml: 'Minimum time the refreshing state is held, so a fast response does not flash the indicator. Uncontrolled mode only.' },
    { prop: 'behavior.scrollSelector', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'CSS selector for the scroll container to gate the gesture on. By default the nearest scrollable ancestor of the touched element is used, falling back to the page scroller.' },
    { prop: 'animation', typeHtml: '<code>PullToRefreshAnimation</code>', defaultHtml: '—', descriptionHtml: 'Transition used for the refresh hold and the settle animation — <code>duration</code> (ms) and <code>easing</code> (CSS easing). Skipped entirely under <code>prefers-reduced-motion</code>.' },
    { prop: 'animation.duration', typeHtml: '<code>number</code>', defaultHtml: '<code>280</code>', descriptionHtml: 'Transition duration in milliseconds.' },
    { prop: 'animation.easing', typeHtml: '<code>string</code>', defaultHtml: "<code>'cubic-bezier(0.22, 1, 0.36, 1)'</code>", descriptionHtml: 'CSS easing function applied to the transform transitions.' },
    { prop: 'on', typeHtml: '<code>PullToRefreshEvents</code>', defaultHtml: '—', descriptionHtml: 'Event handlers: <code>refresh</code>, <code>stateChange</code>. Both optional.' },
    { prop: 'on.refresh', typeHtml: '<code>() =&gt; void | Promise&lt;unknown&gt;</code>', defaultHtml: '—', descriptionHtml: 'Fires when a pull is released past the threshold. Return a promise and the component holds the refreshing state until it settles. Ignored in controlled mode, where the <code>refreshing</code> prop decides.' },
    { prop: 'on.stateChange', typeHtml: '<code>(state: PullToRefreshState) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires on every phase transition — <code>idle</code>, <code>pulling</code>, <code>armed</code>, <code>refreshing</code>, <code>settling</code>. Useful for haptics on arm.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the outer container.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the outer container.' },
    { prop: 'contentClassName', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the translated content wrapper — use it when the wrapper needs a height for a nested scroller.' },
    { prop: 'contentStyle', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the translated content wrapper.' },
    { prop: 'indicatorClassName', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the indicator strip.' },
    { prop: 'indicatorStyle', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the indicator strip.' },
  ],
  apiFootnoteHtml:
    'The container exposes <code>data-ptr-phase</code>, <code>data-ptr-armed</code>, and <code>data-ptr-source</code> (<code>pointer</code> or <code>wheel</code>) so you can drive styles from CSS without a re-render, plus <code>aria-busy</code> while refreshing. The indicator strip is a polite live region, so whatever you render there is announced. The gesture only starts when the nearest scrollable ancestor is already at the top, so inner scrolling is never hijacked. Note that the container sets <code>overflow: clip</code> to hide the parked indicator — unlike <code>overflow: hidden</code> this does not create a scroll container, so <code>position: sticky</code> children keep working.',
  codeExamples: [
    { label: 'Basic Usage', code: pullToRefreshBasic },
    { label: 'Configurable', code: pullToRefreshConfigurable },
  ],
  typesCode: pullToRefreshTypes,
};
