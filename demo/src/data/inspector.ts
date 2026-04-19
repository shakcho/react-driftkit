import type { ComponentMeta } from './types';

const inspectorBasic = `import { useState } from 'react';
import { InspectorBubble } from 'react-driftkit';

function App() {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        data-inspector-bubble-ignore
        onClick={() => setActive(a => !a)}
      >
        {active ? 'Stop inspecting' : 'Inspect element'}
      </button>

      <InspectorBubble
        active={active}
        behavior={{ hotkey: 'cmd+shift+c' }}
        on={{
          activeChange: setActive,
          select: (el, info) => console.log('selected', el, info),
        }}
      />
    </>
  );
}`;

const inspectorConfigurable = `// Minimal — just a single outline, no info bubble:
<InspectorBubble
  highlight={{ boxModel: false }}
  bubble={{ enabled: false }}
/>

// Rich default (everything on):
<InspectorBubble />

// Granular — pick the fields you want in the bubble:
<InspectorBubble
  bubble={{
    fields: {
      tag: true,
      selector: true,
      dimensions: true,
      font: true,
      colors: true,
      spacing: false,      // hide padding/margin row
      role: true,
      accessibleName: true,
      a11yState: false,    // hide tabindex / expanded / pressed …
    },
  }}
/>

// Take over the bubble entirely:
<InspectorBubble
  bubble={{
    render: (info) => (
      <MyDesignTokenCard
        color={info.color}
        bg={info.backgroundColor}
        contrast={info.contrastRatio}
      />
    ),
  }}
/>`;

const inspectorTypes = `interface ElementInfo {
  element: Element;
  tag: string;
  selector: string;
  rect: DOMRect;
  font: {
    family: string;    // declared font-family list
    rendered: string;  // first family the browser actually has loaded
    size: string;
    weight: string;
    lineHeight: string;
  };
  color: string;
  backgroundColor: string;
  contrastRatio: number | null;
  padding: { top: number; right: number; bottom: number; left: number };
  margin:  { top: number; right: number; bottom: number; left: number };
  border:  { top: number; right: number; bottom: number; left: number };
  a11y: {
    role: string | null;
    explicitRole: boolean;
    accessibleName: string | null;
    ariaLabel: string | null;
    ariaLabelledBy: string | null;
    ariaDescribedBy: string | null;
    tabIndex: number | null;
    focusable: boolean;
    disabled: boolean;
    hidden: boolean;
    expanded: boolean | null;
    pressed: boolean | 'mixed' | null;
    checked: boolean | 'mixed' | null;
    selected: boolean | null;
  };
}

interface InspectorBubbleProps {
  active?: boolean;
  defaultActive?: boolean;

  on?: {
    activeChange?: (active: boolean) => void;
    select?: (element: Element, info: ElementInfo) => void;
    hover?: (element: Element | null, info: ElementInfo | null) => void;
  };

  behavior?: {
    hotkey?: string;
    ignoreSelector?: string;
    exitOnSelect?: boolean;   // default true
    exitOnEscape?: boolean;   // default true
  };

  highlight?: {
    boxModel?: boolean;       // default true — 4-layer DevTools model
    outline?: boolean;        // defaults to !boxModel
    colors?: {
      margin?: string;
      border?: string;
      padding?: string;
      content?: string;
      outline?: string;
    };
  };

  bubble?: {
    enabled?: boolean;
    fields?: {
      tag?: boolean;
      selector?: boolean;
      dimensions?: boolean;
      font?: boolean;
      colors?: boolean;
      spacing?: boolean;
      role?: boolean;
      accessibleName?: boolean;
      a11yState?: boolean;
    };
    render?: (info: ElementInfo) => ReactNode;
  };

  zIndex?: number;
  className?: string;
  style?: CSSProperties;
}`;

export const inspectorMeta: ComponentMeta = {
  key: 'inspector',
  slug: 'inspector-bubble',
  title: 'InspectorBubble',
  tagline:
    'A Chrome-DevTools-style element picker overlay for design QA. Hover any element to see its tag, selector, dimensions, typography, effective colors with WCAG contrast, and box model. Click to select, Escape or a hotkey to exit.',
  metaDescription:
    'InspectorBubble — a Chrome-DevTools-style element picker for React. Hover to see tag, selector, font, WCAG contrast, ARIA role, accessible name, and a11y state. Click to select.',
  apiRows: [
    { prop: 'active', typeHtml: '<code>boolean</code>', defaultHtml: '—', descriptionHtml: 'Controlled active state. Omit for uncontrolled.' },
    { prop: 'defaultActive', typeHtml: '<code>boolean</code>', defaultHtml: '<code>false</code>', descriptionHtml: 'Uncontrolled initial active state.' },
    { prop: 'on', typeHtml: '<code>InspectorBubbleEvents</code>', defaultHtml: '—', descriptionHtml: 'Event handlers: <code>activeChange</code>, <code>select</code>, <code>hover</code>. All optional.' },
    { prop: 'on.activeChange', typeHtml: '<code>(active: boolean) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires whenever active toggles — click-select, Escape, or the hotkey.' },
    { prop: 'on.select', typeHtml: '<code>(el: Element, info: ElementInfo) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires on click with the selected element and its info snapshot.' },
    { prop: 'on.hover', typeHtml: '<code>(el: Element | null, info: ElementInfo | null) =&gt; void</code>', defaultHtml: '—', descriptionHtml: 'Fires whenever the hovered element changes while active.' },
    { prop: 'behavior', typeHtml: '<code>InspectorBubbleBehavior</code>', defaultHtml: '—', descriptionHtml: 'Behavior knobs: <code>hotkey</code>, <code>ignoreSelector</code>, <code>exitOnSelect</code>, <code>exitOnEscape</code>.' },
    { prop: 'behavior.hotkey', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'Keyboard shortcut to toggle active, e.g. <code>"cmd+shift+c"</code>. Supports cmd/meta, ctrl, shift, alt/option + key.' },
    { prop: 'behavior.ignoreSelector', typeHtml: '<code>string</code>', defaultHtml: '—', descriptionHtml: 'CSS selector for elements the picker skips. Elements with <code>[data-inspector-bubble-ignore]</code> are always skipped.' },
    { prop: 'behavior.exitOnSelect', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Deactivate after a successful click-select.' },
    { prop: 'behavior.exitOnEscape', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Deactivate when Escape is pressed.' },
    { prop: 'highlight', typeHtml: '<code>InspectorBubbleHighlight</code>', defaultHtml: '—', descriptionHtml: 'Highlight layer: <code>boxModel</code>, <code>outline</code>, <code>colors</code>.' },
    { prop: 'highlight.boxModel', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Render the 4-layer DevTools box model (margin / border / padding / content).' },
    { prop: 'highlight.outline', typeHtml: '<code>boolean</code>', defaultHtml: '<code>!boxModel</code>', descriptionHtml: 'Render a single outline around the element instead of the box model.' },
    { prop: 'highlight.colors', typeHtml: '<code>InspectorBubbleColors</code>', defaultHtml: 'DevTools-like defaults', descriptionHtml: 'Override overlay colors: margin, border, padding, content, outline.' },
    { prop: 'bubble', typeHtml: '<code>InspectorBubbleBubble</code>', defaultHtml: '—', descriptionHtml: 'Info bubble: <code>enabled</code>, <code>fields</code>, <code>render</code>.' },
    { prop: 'bubble.enabled', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Render the info bubble. Set false to show only the highlight.' },
    { prop: 'bubble.render', typeHtml: '<code>(info: ElementInfo) =&gt; ReactNode</code>', defaultHtml: '—', descriptionHtml: 'Full escape hatch — replaces the default bubble content.' },
    { prop: 'bubble.fields', typeHtml: '<code>InspectorBubbleFields</code>', defaultHtml: 'all true', descriptionHtml: 'Per-field toggles for the default bubble.' },
    { prop: 'bubble.fields.tag', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Lowercase tag name.' },
    { prop: 'bubble.fields.selector', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Short CSS selector (<code>#id</code>, <code>[data-testid]</code>, or <code>tag.class1.class2</code>).' },
    { prop: 'bubble.fields.dimensions', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Rendered width × height.' },
    { prop: 'bubble.fields.font', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Font size, rendered family (first loaded font from the declared list), and weight.' },
    { prop: 'bubble.fields.colors', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Foreground + effective background swatches and WCAG contrast ratio.' },
    { prop: 'bubble.fields.spacing', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Padding and margin values (T R B L).' },
    { prop: 'bubble.fields.role', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'ARIA role (explicit or implicit from the tag).' },
    { prop: 'bubble.fields.accessibleName', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'Computed accessible name (aria-labelledby → aria-label → alt → &lt;label&gt; → text content).' },
    { prop: 'bubble.fields.a11yState', typeHtml: '<code>boolean</code>', defaultHtml: '<code>true</code>', descriptionHtml: 'tabindex, focusable, disabled, hidden, expanded/pressed/checked/selected when set.' },
    { prop: 'zIndex', typeHtml: '<code>number</code>', defaultHtml: '<code>2147483647</code>', descriptionHtml: 'z-index for the overlay and bubble.' },
    { prop: 'style', typeHtml: '<code>CSSProperties</code>', defaultHtml: '<code>{}</code>', descriptionHtml: 'Inline styles merged with the default bubble wrapper.' },
    { prop: 'className', typeHtml: '<code>string</code>', defaultHtml: "<code>''</code>", descriptionHtml: 'CSS class added to the default bubble wrapper.' },
  ],
  apiFootnoteHtml:
    'Overlay elements carry <code>data-inspector-bubble-ignore</code>, so the picker never highlights itself. Add this attribute to your own UI (toolbar buttons, the toggle that controls the picker, etc.) to exempt it from selection.',
  codeExamples: [
    { label: 'Basic Usage', code: inspectorBasic },
    { label: 'Configurable', code: inspectorConfigurable },
  ],
  typesCode: inspectorTypes,
};
