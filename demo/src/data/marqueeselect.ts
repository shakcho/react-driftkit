import type { ComponentMeta } from './types';

const marqueeSelectBasic = `import { useState } from 'react';
import { MarqueeSelect } from 'react-driftkit';

function Board({ nodes }) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <MarqueeSelect
      selection={selected}
      on={{ select: setSelected }}
      style={{ height: 600, overflow: 'auto' }}
    >
      {nodes.map((node) => (
        <div
          key={node.id}
          data-marquee-item
          data-marquee-id={node.id}
          className="node"
          style={{ position: 'absolute', left: node.x, top: node.y }}
        >
          {node.label}
        </div>
      ))}
    </MarqueeSelect>
  );
}`;

const marqueeSelectStyling = `/* Items carry their own state, so CSS styles them with no re-render.
   \`data-marquee-selected\` is the committed selection; \`data-marquee-hit\`
   is what the box is touching right now, mid-drag. */

.node[data-marquee-selected] {
  outline: 2px solid var(--accent);
  background: var(--accent-soft);
}

.node[data-marquee-hit] {
  outline: 2px dashed var(--accent);
}

/* The root and the box expose state too. */
[data-marquee-root][data-marquee-active] { cursor: crosshair; }
[data-marquee-root][data-marquee-mode="subtract"] [data-marquee-rect] {
  border-style: dashed;
}`;

const marqueeSelectConfigurable = `// Only catch items the box fully encloses, the way some file managers do:
<MarqueeSelect behavior={{ hitTest: 'contain' }}>{items}</MarqueeSelect>

// Every drag adds to the selection, no modifier needed:
<MarqueeSelect additive>{items}</MarqueeSelect>

// Your own selector and identity scheme:
<MarqueeSelect
  itemSelector=".cell"
  behavior={{ getItemId: (el) => el.dataset.rowId! }}
>
  {cells}
</MarqueeSelect>

// Replace the whole modifier mapping — here, shift toggles instead of adding:
<MarqueeSelect
  behavior={{
    resolveMode: (e) => (e.shiftKey ? 'toggle' : e.altKey ? 'subtract' : 'replace'),
  }}
>
  {items}
</MarqueeSelect>

// Items have no drag behaviour of their own, so start anywhere:
<MarqueeSelect behavior={{ startOnItem: true }}>{items}</MarqueeSelect>

// Opt touch in. Off by default so a touch drag still pans the board:
<MarqueeSelect behavior={{ touch: true }}>{items}</MarqueeSelect>

// Faster edge auto-scroll on a large canvas:
<MarqueeSelect behavior={{ autoScrollMargin: 80, autoScrollSpeed: 28 }}>
  {items}
</MarqueeSelect>

// Render the box yourself — it is only mounted while a drag is live:
<MarqueeSelect
  marquee={({ rect, hit, mode }) => (
    <div className={\`lasso lasso--\${mode}\`} style={{ ...rect, position: 'absolute' }}>
      <span className="lasso-count">{hit.length}</span>
    </div>
  )}
>
  {items}
</MarqueeSelect>

// Uncontrolled, with a commit handler instead of live state:
<MarqueeSelect
  defaultSelection={['node-1']}
  on={{ end: (ids) => applyToSelection(ids) }}
>
  {items}
</MarqueeSelect>`;

const marqueeSelectTypes = `type MarqueeHitTest = 'intersect' | 'contain';

type MarqueeMode = 'replace' | 'add' | 'subtract' | 'toggle';

// A box in container content coordinates — the root's padding-box
// origin, with its scroll offset already folded in.
interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MarqueeSelectState {
  active: boolean;         // true from threshold crossing until release
  rect: MarqueeRect | null;
  ids: string[];           // the effective selection, live
  hit: string[];           // caught by the box, before the mode applies
  mode: MarqueeMode;
}

interface MarqueeSelectInfo {
  rect: MarqueeRect | null;
  mode: MarqueeMode;
  hit: string[];
  base: string[];          // the selection as it was when the drag began
  elements: HTMLElement[];
}

interface MarqueeSelectProps {
  children?: ReactNode;

  itemSelector?: string;       // default '[data-marquee-item]'

  selection?: string[];        // controlled
  defaultSelection?: string[]; // uncontrolled, default []

  additive?: boolean;          // default false
  disabled?: boolean;          // default false

  behavior?: {
    hitTest?: MarqueeHitTest;    // default 'intersect'
    threshold?: number;          // default 4 — px before it is a drag
    startOnItem?: boolean;       // default false
    ignoreSelector?: string;     // form controls, links, editable content
    clearOnEmptyClick?: boolean; // default true
    markItems?: boolean;         // default true — data-attrs on the items
    autoScroll?: boolean;        // default true
    autoScrollMargin?: number;   // default 48 (px from the edge)
    autoScrollSpeed?: number;    // default 14 (px per frame at the edge)
    touch?: boolean;             // default false — touch pans instead
    mouseButton?: number;        // default 0
    getItemId?: (element: HTMLElement, index: number) => string;
    resolveMode?: (event: PointerEvent) => MarqueeMode;
  };

  on?: {
    select?: (ids: string[], info: MarqueeSelectInfo) => void;
    start?: (info: MarqueeSelectInfo) => void;
    end?: (ids: string[], info: MarqueeSelectInfo) => void;
    cancel?: (info: MarqueeSelectInfo) => void;
  };

  // Replaces the default box. Rendered only while active.
  marquee?: (state: MarqueeSelectState) => ReactNode;

  className?: string;
  style?: CSSProperties;
  marqueeClassName?: string;
  marqueeStyle?: CSSProperties;
}`;

export const marqueeSelectMeta: ComponentMeta = {
  key: 'marqueeselect',
  slug: 'marquee-select',
  title: 'MarqueeSelect',
  tagline:
    'Drag a rectangle across a canvas, board, or file grid and everything it touches gets selected — the selection gesture every editor-style UI needs. Items opt in with a CSS selector rather than a context or a wrapper, modifier keys give you add / subtract / toggle for free, the edges auto-scroll as you drag into them, and Escape rolls the whole drag back.',
  metaDescription:
    'MarqueeSelect is a React marquee / lasso multi-select component — drag a rectangle to select items on a canvas, whiteboard, node graph, dashboard grid, or file grid. Intersect or contain hit testing, shift/alt modifier modes, edge auto-scroll, controlled or uncontrolled selection, unstyled. React 18 & React 19.',
  seoDescriptor: 'React Marquee / Lasso Drag-Select Component',
  seoKeywords:
    'react marquee select, react drag select, react lasso select, react rubber band selection, react box select, react multi select canvas, react selectable, dragselect react alternative, react-selectable-fast alternative, react-driftkit MarqueeSelect',
  apiRows: [
    { prop: 'children', typeHtml: '<code>ReactNode</code>', defaultHtml: '—', descriptionHtml: 'The selectable surface — a canvas, board, or grid. Rendered inside a <code>position: relative</code> root.' },
    { prop: 'itemSelector', typeHtml: '<code>string</code>', defaultHtml: "<code>'[data-marquee-item]'</code>", descriptionHtml: 'CSS selector matching the selectable items, queried inside the root. Selector-based rather than registration-based, so virtualised lists and third-party children work unchanged.' },
    { prop: 'selection', typeHtml: '<code>string[]</code>', defaultHtml: '—', descriptionHtml: 'Controlled selection. When provided, the component renders exactly what you pass and nothing moves until you apply <code>on.select</code>.' },
    { prop: 'defaultSelection', typeHtml: '<code>string[]</code>', defaultHtml: '<code>[]</code>', descriptionHtml: 'Starting selection in uncontrolled mode.' },
    { prop: 'additive', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Treat an unmodified drag as <code>add</code> instead of <code>replace</code>, so every drag extends the selection.' },
    { prop: 'disabled', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Turns the gesture off without unmounting. An in-flight drag is rolled back immediately.' },
    { prop: 'behavior', typeHtml: '<code>MarqueeSelectBehavior</code>', defaultHtml: '—', descriptionHtml: 'Gesture tuning — hit testing, what starts a drag, identity, and auto-scroll.' },
    { prop: 'behavior.hitTest', typeHtml: "<code>'intersect' | 'contain'</code>", defaultHtml: "<code>'intersect'</code>", descriptionHtml: '<code>intersect</code> catches anything the box touches; <code>contain</code> only catches items the box fully encloses.' },
    { prop: 'behavior.threshold', typeHtml: '<code>number</code>', defaultHtml: '<code>4</code>', descriptionHtml: 'Pointer travel in px before a press counts as a marquee. Below it, the press is an empty-space click instead.' },
    { prop: 'behavior.startOnItem', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Allow a marquee to start on top of an item. Off by default so pressing an item leaves the gesture to whatever drag logic that item owns.' },
    { prop: 'behavior.ignoreSelector', typeHtml: '<code>string</code>', defaultHtml: 'form controls, <code>a[href]</code>, editable content, <code>[data-marquee-ignore]</code>', descriptionHtml: 'Elements whose press is left entirely alone, so buttons, links, and text fields inside the surface keep working.' },
    { prop: 'behavior.clearOnEmptyClick', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'A press that never crosses <code>threshold</code> clears the selection. Skipped when a modifier is held, so shift-clicking empty space does not wipe your work.' },
    { prop: 'behavior.markItems', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Mirror state onto the item elements as <code>data-marquee-selected</code> and <code>data-marquee-hit</code>, so CSS can style them without a re-render. Marks are removed on unmount.' },
    { prop: 'behavior.autoScroll', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Scroll the root when the pointer nears its edge during a drag. Requires the root to actually scroll — put <code>overflow: auto</code> and a height on it via <code>style</code>.' },
    { prop: 'behavior.autoScrollMargin', typeHtml: '<code>number</code>', defaultHtml: '<code>48</code>', descriptionHtml: 'Distance in px from the edge where auto-scroll begins.' },
    { prop: 'behavior.autoScrollSpeed', typeHtml: '<code>number</code>', defaultHtml: '<code>14</code>', descriptionHtml: 'Peak auto-scroll speed in px per frame, reached at the very edge. It ramps up as the pointer gets closer.' },
    { prop: 'behavior.touch', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Let touch pointers start a marquee. Off by default so a touch drag still pans the board; turning it on sets <code>touch-action: none</code> on the root.' },
    { prop: 'behavior.mouseButton', typeHtml: '<code>number</code>', defaultHtml: '<code>0</code>', descriptionHtml: 'Mouse button that starts a marquee. Set it to <code>1</code> or <code>2</code> to reserve the primary button for something else.' },
    { prop: 'behavior.getItemId', typeHtml: '<code>(element: HTMLElement, index: number) =&gt; string</code>', defaultHtml: '<code>data-marquee-id</code> → <code>id</code> → index', descriptionHtml: 'Identity for an item element. Use it when ids already live somewhere else in your markup.' },
    { prop: 'behavior.resolveMode', typeHtml: '<code>(event: PointerEvent) =&gt; MarqueeMode</code>', defaultHtml: 'shift/ctrl/meta → <code>add</code>, alt → <code>subtract</code>', descriptionHtml: 'Replaces the whole modifier-key mapping. This is the only route to <code>toggle</code> mode, which flips each caught item in and out of the selection.' },
    { prop: 'on', typeHtml: '<code>MarqueeSelectEvents</code>', defaultHtml: '—', descriptionHtml: 'Event handlers: <code>select</code>, <code>start</code>, <code>end</code>, <code>cancel</code>. All optional.' },
    { prop: 'on.select', typeHtml: '<code>(ids: string[], info: MarqueeSelectInfo) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires whenever the effective selection changes, live during the drag. Skipped when a move leaves the result unchanged, so it is safe to wire straight to a state setter.' },
    { prop: 'on.start', typeHtml: '<code>(info: MarqueeSelectInfo) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires once the press has crossed <code>threshold</code> and the box has appeared — not on every press.' },
    { prop: 'on.end', typeHtml: '<code>(ids: string[], info: MarqueeSelectInfo) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires on release with the committed selection. Use it when the expensive work should only run once, not on every frame.' },
    { prop: 'on.cancel', typeHtml: '<code>(info: MarqueeSelectInfo) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires when Escape or a pointer cancel aborts the drag. The selection is rolled back to its pre-drag value first, and <code>on.end</code> does not fire.' },
    { prop: 'marquee', typeHtml: '<code>(state: MarqueeSelectState) =&gt; ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Replaces the default box entirely — render a count badge, a snapped grid outline, whatever you like. Only mounted while a drag is live.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the root container.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the root container. Put <code>overflow: auto</code> and a height here for a scrolling board with edge auto-scroll.' },
    { prop: 'marqueeClassName', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the default marquee box.' },
    { prop: 'marqueeStyle', typeHtml: '<code>CSSProperties</code>', defaultHtml: '—', descriptionHtml: 'Inline styles merged onto the default marquee box. Set a <code>zIndex</code> here if your items create stacking contexts of their own.' },
  ],
  apiFootnoteHtml:
    'Item boxes are measured <strong>once per drag</strong>, at pointer-down, and stored in container content coordinates — client pixels minus the root\'s padding-box origin, plus its scroll offset. That makes every subsequent move a plain rectangle overlap test with no DOM reads at all, and it is what keeps the box glued to the point you pressed while the edges auto-scroll under it. The trade-off is that items which move <em>during</em> a drag are hit-tested against where they were when it started. The pre-drag selection is kept separately from the live hit set and the mode is re-applied from scratch on every frame, which is why dragging back out of an area cleanly undoes itself and why Escape can roll the whole drag back in one step. The root exposes <code>data-marquee-root</code>, <code>data-marquee-active</code>, and <code>data-marquee-mode</code>; the items get <code>data-marquee-selected</code> and <code>data-marquee-hit</code>. Like the other drag primitives here, the gesture is not keyboard-reachable — pair it with checkboxes or a Select all control when selection is the only route to an action.',
  codeExamples: [
    { label: 'Basic Usage', code: marqueeSelectBasic },
    { label: 'Styling', code: marqueeSelectStyling, lang: 'javascript' },
    { label: 'Configurable', code: marqueeSelectConfigurable },
  ],
  typesCode: marqueeSelectTypes,
};
