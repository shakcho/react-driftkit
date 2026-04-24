import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

interface BoxEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementInfo {
  /** The element currently under the cursor. */
  element: Element;
  /** Lowercase tag name, e.g. `div`. */
  tag: string;
  /** Short CSS selector — `#id`, `[data-testid="x"]`, or `tag.class1.class2`. */
  selector: string;
  /** Bounding client rect at measurement time. */
  rect: DOMRect;
  /** Computed typography. `family` is the full declared list; `rendered` is the first
   *  family from that list the browser actually has loaded (best-guess via
   *  `document.fonts.check`). */
  font: {
    family: string;
    rendered: string;
    size: string;
    weight: string;
    lineHeight: string;
  };
  /** Computed foreground color (`color`). */
  color: string;
  /** Effective background — walks up ancestors until a non-transparent bg is found. */
  backgroundColor: string;
  /** WCAG contrast ratio between `color` and `backgroundColor`; null if indeterminate. */
  contrastRatio: number | null;
  padding: BoxEdges;
  margin: BoxEdges;
  border: BoxEdges;
  /** Accessibility snapshot. */
  a11y: A11yInfo;
}

export interface A11yInfo {
  /** ARIA role — explicit `role` attribute, or an implicit role inferred from the tag. */
  role: string | null;
  /** Whether `role` came from the `role` attribute (vs. inferred from the tag). */
  explicitRole: boolean;
  /** Computed accessible name, following a simplified ARIA-naming order
   *  (aria-labelledby → aria-label → alt → associated <label> → text content for
   *  buttons/links/headings). `null` if the element has no derivable name. */
  accessibleName: string | null;
  /** Raw `aria-label`, if any. */
  ariaLabel: string | null;
  /** Raw `aria-labelledby` ID list, if any. */
  ariaLabelledBy: string | null;
  /** Raw `aria-describedby` ID list, if any. */
  ariaDescribedBy: string | null;
  /** Numeric `tabindex`, or `null` if the attribute is absent. */
  tabIndex: number | null;
  /** Whether the element can receive keyboard focus. */
  focusable: boolean;
  /** `disabled` attribute or `aria-disabled="true"`. */
  disabled: boolean;
  /** `hidden` attribute or `aria-hidden="true"`. */
  hidden: boolean;
  /** Value of `aria-expanded` if present. */
  expanded: boolean | null;
  /** Value of `aria-pressed` if present. */
  pressed: boolean | 'mixed' | null;
  /** Value of `aria-checked` (or `checked` for native inputs) if applicable. */
  checked: boolean | 'mixed' | null;
  /** Value of `aria-selected` if present. */
  selected: boolean | null;
}

export interface InspectorBubbleColors {
  margin?: string;
  border?: string;
  padding?: string;
  content?: string;
  outline?: string;
}

export interface InspectorBubbleEvents {
  /** Fires whenever active toggles (click-select, Escape, or hotkey). */
  activeChange?: (active: boolean) => void;
  /** Fires on click with the selected element and its info snapshot. */
  select?: (element: Element, info: ElementInfo) => void;
  /** Fires whenever the hovered element changes while active. */
  hover?: (element: Element | null, info: ElementInfo | null) => void;
}

export interface InspectorBubbleBehavior {
  /** Keyboard shortcut to toggle active, e.g. `"cmd+shift+c"`. */
  hotkey?: string;
  /** CSS selector for elements the picker should skip (never highlight). */
  ignoreSelector?: string;
  /** Deactivate after a successful click-select. Default `true`. */
  exitOnSelect?: boolean;
  /** Deactivate when Escape is pressed. Default `true`. */
  exitOnEscape?: boolean;
}

export interface InspectorBubbleHighlight {
  /** Render the 4-layer DevTools box model (margin/border/padding/content). Default `true`. */
  boxModel?: boolean;
  /** Render a single outline around the element. Defaults to `!boxModel`. */
  outline?: boolean;
  /** Overlay colors, DevTools-like by default. */
  colors?: InspectorBubbleColors;
}

export interface InspectorBubbleFields {
  tag?: boolean;
  selector?: boolean;
  dimensions?: boolean;
  font?: boolean;
  colors?: boolean;
  spacing?: boolean;
  /** Show ARIA role (explicit or implicit). */
  role?: boolean;
  /** Show computed accessible name. */
  accessibleName?: boolean;
  /** Show a11y state flags — tabIndex, focusable, disabled, hidden,
   *  expanded/pressed/checked/selected when set. */
  a11yState?: boolean;
}

export interface InspectorBubbleBubble {
  /** Render the info bubble. Default `true`. */
  enabled?: boolean;
  /** Per-field toggles. Omit to use defaults (all true). */
  fields?: InspectorBubbleFields;
  /** Full escape hatch — replaces the default bubble content. */
  render?: (info: ElementInfo) => ReactNode;
}

export interface InspectorBubbleProps {
  /** Controlled active state. Omit for uncontrolled. */
  active?: boolean;
  /** Uncontrolled initial active state. */
  defaultActive?: boolean;

  /** Event handlers. */
  on?: InspectorBubbleEvents;
  /** Behavior — hotkey, exit rules, ignored elements. */
  behavior?: InspectorBubbleBehavior;
  /** Highlight layer — box model vs. outline, and overlay colors. */
  highlight?: InspectorBubbleHighlight;
  /** Info bubble — enabled, per-field toggles, and optional custom render. */
  bubble?: InspectorBubbleBubble;

  /** z-index for overlays. Default `2147483647`. */
  zIndex?: number;
  /** CSS class on the default bubble wrapper. */
  className?: string;
  /** Inline styles merged with the default bubble wrapper. */
  style?: CSSProperties;
}

const DEFAULT_COLORS: Required<InspectorBubbleColors> = {
  margin: 'rgba(246, 178, 107, 0.55)',
  border: 'rgba(255, 229, 153, 0.55)',
  padding: 'rgba(147, 196, 125, 0.55)',
  content: 'rgba(111, 168, 220, 0.55)',
  outline: 'rgba(75, 145, 230, 0.95)',
};

const IGNORE_ATTR = 'data-inspector-bubble-ignore';

function parseColor(c: string): [number, number, number, number] | null {
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b || b[3] === 0) return null;
  const L1 = relativeLuminance(f[0], f[1], f[2]);
  const L2 = relativeLuminance(b[0], b[1], b[2]);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

function buildSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${CSS.escape(el.id)}`;
  const testid = el.getAttribute('data-testid');
  if (testid) return `${tag}[data-testid="${testid}"]`;
  const classes = Array.from(el.classList).slice(0, 3);
  if (classes.length) return `${tag}.${classes.map((c) => CSS.escape(c)).join('.')}`;
  return tag;
}

function edgesOf(style: CSSStyleDeclaration, prop: 'padding' | 'margin'): BoxEdges {
  return {
    top: parseFloat(style.getPropertyValue(`${prop}-top`)) || 0,
    right: parseFloat(style.getPropertyValue(`${prop}-right`)) || 0,
    bottom: parseFloat(style.getPropertyValue(`${prop}-bottom`)) || 0,
    left: parseFloat(style.getPropertyValue(`${prop}-left`)) || 0,
  };
}

function borderEdges(style: CSSStyleDeclaration): BoxEdges {
  return {
    top: parseFloat(style.borderTopWidth) || 0,
    right: parseFloat(style.borderRightWidth) || 0,
    bottom: parseFloat(style.borderBottomWidth) || 0,
    left: parseFloat(style.borderLeftWidth) || 0,
  };
}

function getEffectiveBackground(el: Element): string {
  let cur: Element | null = el;
  while (cur) {
    const bg = getComputedStyle(cur).backgroundColor;
    const parsed = parseColor(bg);
    if (parsed && parsed[3] > 0) return bg;
    cur = cur.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

function splitFontFamily(family: string): string[] {
  // Split on commas not inside quotes, then strip surrounding quotes/whitespace.
  return family
    .split(/,(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/)
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function getRenderedFont(fontFamily: string, fontSize: string, fontWeight: string): string {
  const families = splitFontFamily(fontFamily);
  if (families.length === 0) return '';
  if (typeof document === 'undefined' || !('fonts' in document)) return families[0];
  const size = fontSize || '16px';
  const weight = fontWeight || '400';
  for (const family of families) {
    try {
      const spec = `${weight} ${size} "${family.replace(/"/g, '\\"')}"`;
      if (document.fonts.check(spec)) return family;
    } catch {
      // invalid spec — try next
    }
  }
  return families[0];
}

const IMPLICIT_ROLES: Record<string, string> = {
  A: 'link', // only when href is present — handled below
  AREA: 'link',
  ARTICLE: 'article',
  ASIDE: 'complementary',
  BUTTON: 'button',
  DATALIST: 'listbox',
  DIALOG: 'dialog',
  FIGURE: 'figure',
  FOOTER: 'contentinfo',
  FORM: 'form',
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  HEADER: 'banner',
  HR: 'separator',
  IMG: 'img',
  LI: 'listitem',
  MAIN: 'main',
  NAV: 'navigation',
  OL: 'list',
  OPTION: 'option',
  OUTPUT: 'status',
  PROGRESS: 'progressbar',
  SECTION: 'region',
  SELECT: 'combobox',
  SUMMARY: 'button',
  TABLE: 'table',
  TBODY: 'rowgroup',
  TD: 'cell',
  TEXTAREA: 'textbox',
  TFOOT: 'rowgroup',
  TH: 'columnheader',
  THEAD: 'rowgroup',
  TR: 'row',
  UL: 'list',
};

function getImplicitRole(el: Element): string | null {
  const tag = el.tagName;
  if (tag === 'A') return el.hasAttribute('href') ? 'link' : null;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'range') return 'slider';
    if (type === 'search') return 'searchbox';
    if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return 'button';
    if (type === 'hidden') return null;
    return 'textbox';
  }
  if (tag === 'IMG' && el.getAttribute('alt') === '') return 'presentation';
  return IMPLICIT_ROLES[tag] ?? null;
}

function resolveIdRefs(root: Document | Element, idref: string | null): string | null {
  if (!idref) return null;
  const names = idref
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => (root as Document).getElementById?.(id)?.textContent?.trim())
    .filter((t): t is string => Boolean(t));
  return names.length ? names.join(' ') : null;
}

function getAccessibleName(el: Element): string | null {
  const labelledBy = resolveIdRefs(el.ownerDocument || document, el.getAttribute('aria-labelledby'));
  if (labelledBy) return labelledBy;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  const tag = el.tagName;
  if (tag === 'IMG') {
    const alt = el.getAttribute('alt');
    if (alt !== null) return alt;
  }
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    const input = el as HTMLInputElement;
    if (input.id && el.ownerDocument) {
      const label = el.ownerDocument.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (label?.textContent) return label.textContent.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel?.textContent) return parentLabel.textContent.trim();
    const placeholder = input.getAttribute('placeholder');
    if (placeholder) return placeholder;
  }
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || /^H[1-6]$/.test(tag)) {
    const text = el.textContent?.trim();
    if (text) return text.length > 80 ? text.slice(0, 77) + '…' : text;
  }
  return null;
}

function isFocusable(el: Element): boolean {
  const tabIndexAttr = el.getAttribute('tabindex');
  if (tabIndexAttr !== null) return parseInt(tabIndexAttr, 10) >= 0;
  const tag = el.tagName;
  const disabled = (el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true';
  if (disabled) return false;
  if (tag === 'A' || tag === 'AREA') return el.hasAttribute('href');
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

function parseTristate(value: string | null): boolean | 'mixed' | null {
  if (value == null) return null;
  if (value === 'mixed') return 'mixed';
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseBoolAttr(value: string | null): boolean | null {
  if (value == null) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function buildA11y(el: Element): A11yInfo {
  const explicit = el.getAttribute('role');
  const role = explicit?.trim() || getImplicitRole(el);
  const ariaLabel = el.getAttribute('aria-label');
  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  const ariaDescribedBy = el.getAttribute('aria-describedby');
  const tabIndexAttr = el.getAttribute('tabindex');
  const tabIndex = tabIndexAttr === null ? null : parseInt(tabIndexAttr, 10);
  const disabled =
    (el as HTMLInputElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
  const hidden = (el as HTMLElement).hidden === true || el.getAttribute('aria-hidden') === 'true';

  // native checkbox/radio → checked; otherwise aria-checked
  let checked: boolean | 'mixed' | null = parseTristate(el.getAttribute('aria-checked'));
  if (checked === null && el.tagName === 'INPUT') {
    const type = ((el as HTMLInputElement).type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      checked = (el as HTMLInputElement).checked;
    }
  }

  return {
    role: role ?? null,
    explicitRole: !!explicit,
    accessibleName: getAccessibleName(el),
    ariaLabel: ariaLabel?.trim() || null,
    ariaLabelledBy,
    ariaDescribedBy,
    tabIndex,
    focusable: isFocusable(el),
    disabled,
    hidden,
    expanded: parseBoolAttr(el.getAttribute('aria-expanded')),
    pressed: parseTristate(el.getAttribute('aria-pressed')),
    checked,
    selected: parseBoolAttr(el.getAttribute('aria-selected')),
  };
}

function buildInfo(el: Element): ElementInfo {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const color = style.color;
  const backgroundColor = getEffectiveBackground(el);
  return {
    element: el,
    tag: el.tagName.toLowerCase(),
    selector: buildSelector(el),
    rect,
    font: {
      family: style.fontFamily,
      rendered: getRenderedFont(style.fontFamily, style.fontSize, style.fontWeight),
      size: style.fontSize,
      weight: style.fontWeight,
      lineHeight: style.lineHeight,
    },
    color,
    backgroundColor,
    contrastRatio: contrastRatio(color, backgroundColor),
    padding: edgesOf(style, 'padding'),
    margin: edgesOf(style, 'margin'),
    border: borderEdges(style),
    a11y: buildA11y(el),
  };
}

type HotkeyMatcher = (e: KeyboardEvent) => boolean;

function parseHotkey(spec: string): HotkeyMatcher {
  const parts = spec.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
  const needMeta = parts.includes('cmd') || parts.includes('meta');
  const needCtrl = parts.includes('ctrl');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt') || parts.includes('option');
  const keyPart =
    parts.find((p) => !['cmd', 'meta', 'ctrl', 'shift', 'alt', 'option'].includes(p)) ?? '';
  return (e) =>
    e.key.toLowerCase() === keyPart &&
    e.metaKey === needMeta &&
    e.ctrlKey === needCtrl &&
    e.shiftKey === needShift &&
    e.altKey === needAlt;
}

interface ShowFlags {
  tag: boolean;
  selector: boolean;
  dimensions: boolean;
  font: boolean;
  colors: boolean;
  spacing: boolean;
  role: boolean;
  accessibleName: boolean;
  a11yState: boolean;
}

function contrastLabel(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

function DefaultBubble({
  info,
  show,
  className,
  style,
}: {
  info: ElementInfo;
  show: ShowFlags;
  className: string;
  style: CSSProperties;
}) {
  const { tag, selector, rect, font, color, backgroundColor, contrastRatio: cr, padding, margin, a11y } = info;
  const selectorSuffix = selector.startsWith(tag) ? selector.slice(tag.length) : selector;
  const hasSpacing =
    padding.top || padding.right || padding.bottom || padding.left ||
    margin.top || margin.right || margin.bottom || margin.left;
  return (
    <div
      className={`inspector-bubble__info ${className}`}
      style={{
        background: 'rgba(20, 20, 20, 0.96)',
        color: '#fff',
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: 1.5,
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
        maxWidth: 320,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {(show.tag || show.selector) && (
        <div>
          {show.tag && <span style={{ color: '#ff79c6' }}>{tag}</span>}
          {show.selector && selectorSuffix && (
            <span style={{ color: '#8be9fd' }}>{selectorSuffix}</span>
          )}
        </div>
      )}
      {show.dimensions && (
        <div style={{ color: '#bbb' }}>
          {Math.round(rect.width)} × {Math.round(rect.height)}
        </div>
      )}
      {show.font && (
        <div>
          <span style={{ color: '#f1fa8c' }}>{font.size}</span>
          <span style={{ color: '#999' }}> · </span>
          <span style={{ fontFamily: `"${font.rendered}", ${font.family}` }}>{font.rendered}</span>
          <span style={{ color: '#999' }}> · </span>
          <span>{font.weight}</span>
        </div>
      )}
      {show.colors && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: color,
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
              }}
            />
            <span>{color}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: backgroundColor,
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
              }}
            />
            <span>{backgroundColor}</span>
          </span>
          {cr !== null && (
            <span
              style={{
                color: cr >= 4.5 ? '#50fa7b' : cr >= 3 ? '#f1fa8c' : '#ff5555',
              }}
            >
              {cr.toFixed(2)}:1 {contrastLabel(cr)}
            </span>
          )}
        </div>
      )}
      {show.spacing && hasSpacing ? (
        <div style={{ color: '#999', fontSize: 10 }}>
          pad {padding.top} {padding.right} {padding.bottom} {padding.left} · mar {margin.top}{' '}
          {margin.right} {margin.bottom} {margin.left}
        </div>
      ) : null}
      {show.role && a11y.role && (
        <div>
          <span style={{ color: '#bd93f9' }}>role</span>
          <span style={{ color: '#999' }}> </span>
          <span>{a11y.role}</span>
          {!a11y.explicitRole && <span style={{ color: '#666' }}> (implicit)</span>}
        </div>
      )}
      {show.accessibleName && a11y.accessibleName && (
        <div style={{ color: '#50fa7b' }}>
          <span style={{ color: '#bd93f9' }}>name</span>
          <span style={{ color: '#999' }}> </span>
          <span>&ldquo;{a11y.accessibleName}&rdquo;</span>
        </div>
      )}
      {show.a11yState && (() => {
        const parts: ReactNode[] = [];
        if (a11y.tabIndex !== null) parts.push(`tabindex=${a11y.tabIndex}`);
        if (a11y.focusable) parts.push('focusable');
        if (a11y.disabled) parts.push('disabled');
        if (a11y.hidden) parts.push('hidden');
        if (a11y.expanded !== null) parts.push(`expanded=${a11y.expanded}`);
        if (a11y.pressed !== null) parts.push(`pressed=${a11y.pressed}`);
        if (a11y.checked !== null) parts.push(`checked=${a11y.checked}`);
        if (a11y.selected !== null) parts.push(`selected=${a11y.selected}`);
        if (!parts.length) return null;
        return (
          <div style={{ color: '#8be9fd', fontSize: 10 }}>
            {parts.map((p, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: '#666' }}> · </span>}
                {p}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export function InspectorBubble({
  active: activeProp,
  defaultActive = false,
  on,
  behavior,
  highlight,
  bubble,
  zIndex = 2147483647,
  className = '',
  style = {},
}: InspectorBubbleProps) {
  const {
    activeChange: onActiveChange,
    select: onSelect,
    hover: onHover,
  } = on ?? {};
  const {
    hotkey,
    ignoreSelector,
    exitOnSelect = true,
    exitOnEscape = true,
  } = behavior ?? {};
  const {
    boxModel: showBoxModel = true,
    outline: showOutlineProp,
    colors,
  } = highlight ?? {};
  const {
    enabled: showBubble = true,
    fields,
    render: renderBubble,
  } = bubble ?? {};

  const isControlled = activeProp !== undefined;
  const [uncontrolledActive, setUncontrolledActive] = useState(defaultActive);
  const active = isControlled ? activeProp : uncontrolledActive;

  const setActive = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledActive(next);
      onActiveChange?.(next);
    },
    [isControlled, onActiveChange]
  );

  const [info, setInfo] = useState<ElementInfo | null>(null);
  const currentElRef = useRef<Element | null>(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  const mergedColors = useMemo(() => ({ ...DEFAULT_COLORS, ...colors }), [colors]);
  const showOutlineResolved = showOutlineProp ?? !showBoxModel;

  const show: ShowFlags = {
    tag: fields?.tag ?? true,
    selector: fields?.selector ?? true,
    dimensions: fields?.dimensions ?? true,
    font: fields?.font ?? true,
    colors: fields?.colors ?? true,
    spacing: fields?.spacing ?? true,
    role: fields?.role ?? true,
    accessibleName: fields?.accessibleName ?? true,
    a11yState: fields?.a11yState ?? true,
  };

  const isIgnored = useCallback(
    (el: Element | null): boolean => {
      if (!el) return true;
      if (el.closest(`[${IGNORE_ATTR}]`)) return true;
      if (ignoreSelector) {
        try {
          if (el.closest(ignoreSelector)) return true;
        } catch {
          // invalid selector — ignore silently
        }
      }
      return false;
    },
    [ignoreSelector]
  );

  const updateFromElement = useCallback(
    (el: Element | null) => {
      if (!el || isIgnored(el)) {
        if (currentElRef.current !== null) {
          currentElRef.current = null;
          setInfo(null);
          onHoverRef.current?.(null, null);
        }
        return;
      }
      const next = buildInfo(el);
      currentElRef.current = el;
      setInfo(next);
      onHoverRef.current?.(el, next);
    },
    [isIgnored]
  );

  // Pointer + scroll + resize tracking while active
  useEffect(() => {
    if (!active) {
      currentElRef.current = null;
      setInfo(null);
      return;
    }
    const onPointerMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      updateFromElement(el);
    };
    const remeasure = () => {
      const el = currentElRef.current;
      if (!el || !el.isConnected) return;
      setInfo(buildInfo(el));
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', remeasure, { passive: true, capture: true });
    window.addEventListener('resize', remeasure);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', remeasure, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', remeasure);
    };
  }, [active, updateFromElement]);

  // Click to select
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || isIgnored(target)) return;
      e.preventDefault();
      e.stopPropagation();
      const snapshot = buildInfo(target);
      onSelect?.(target, snapshot);
      if (exitOnSelect) setActive(false);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true } as EventListenerOptions);
  }, [active, exitOnSelect, isIgnored, onSelect, setActive]);

  // Escape to exit
  useEffect(() => {
    if (!active || !exitOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exitOnEscape, setActive]);

  // Hotkey toggle
  useEffect(() => {
    if (!hotkey) return;
    const match = parseHotkey(hotkey);
    const onKey = (e: KeyboardEvent) => {
      if (match(e)) {
        e.preventDefault();
        setActive(!active);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey, active, setActive]);

  if (!active || typeof document === 'undefined') return null;

  const overlay = (
    <div
      data-inspector-bubble-ignore=""
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
        cursor: 'crosshair',
      }}
    >
      {info && showBoxModel && (
        <BoxModelLayers info={info} colors={mergedColors} />
      )}
      {info && showOutlineResolved && !showBoxModel && (
        <div
          style={{
            position: 'fixed',
            left: info.rect.left,
            top: info.rect.top,
            width: info.rect.width,
            height: info.rect.height,
            outline: `2px solid ${mergedColors.outline}`,
            outlineOffset: -1,
            pointerEvents: 'none',
          }}
        />
      )}
      {info && showBubble && (
        <BubbleAnchor rect={info.rect} zIndex={zIndex}>
          {renderBubble ? (
            renderBubble(info)
          ) : (
            <DefaultBubble info={info} show={show} className={className} style={style} />
          )}
        </BubbleAnchor>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

function BoxModelLayers({
  info,
  colors,
}: {
  info: ElementInfo;
  colors: Required<InspectorBubbleColors>;
}) {
  const { rect, padding, margin, border } = info;
  const marginRect = {
    left: rect.left - margin.left,
    top: rect.top - margin.top,
    width: rect.width + margin.left + margin.right,
    height: rect.height + margin.top + margin.bottom,
  };
  const contentRect = {
    left: rect.left + border.left + padding.left,
    top: rect.top + border.top + padding.top,
    width: Math.max(0, rect.width - border.left - border.right - padding.left - padding.right),
    height: Math.max(0, rect.height - border.top - border.bottom - padding.top - padding.bottom),
  };
  const paddingRect = {
    left: rect.left + border.left,
    top: rect.top + border.top,
    width: Math.max(0, rect.width - border.left - border.right),
    height: Math.max(0, rect.height - border.top - border.bottom),
  };
  const borderRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  const base: CSSProperties = { position: 'fixed', pointerEvents: 'none' };
  return (
    <>
      <div style={{ ...base, ...marginRect, background: colors.margin }} />
      <div style={{ ...base, ...borderRect, background: colors.border }} />
      <div style={{ ...base, ...paddingRect, background: colors.padding }} />
      <div style={{ ...base, ...contentRect, background: colors.content }} />
    </>
  );
}

function BubbleAnchor({
  rect,
  zIndex,
  children,
}: {
  rect: DOMRect;
  zIndex: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bubble = ref.current.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer below, else above, else overlap-bottom clamped to viewport.
    let top = rect.bottom + gap;
    if (top + bubble.height > vh) {
      top = rect.top - bubble.height - gap;
    }
    if (top < 0) {
      top = Math.min(vh - bubble.height - gap, Math.max(gap, rect.bottom + gap));
    }
    let left = rect.left;
    left = Math.min(left, vw - bubble.width - gap);
    left = Math.max(gap, left);
    setPos({ left, top });
  }, [rect.left, rect.top, rect.width, rect.height]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: pos?.left ?? rect.left,
        top: pos?.top ?? rect.bottom + 8,
        visibility: pos ? 'visible' : 'hidden',
        pointerEvents: 'none',
        zIndex: zIndex + 1,
      }}
    >
      {children}
    </div>
  );
}

export default InspectorBubble;
