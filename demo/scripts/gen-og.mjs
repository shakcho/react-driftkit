/**
 * Generate 1200×630 OG cards for every page under demo/public/og/.
 *
 * Renders React-element trees through Satori (→ SVG) and rasterises via
 * @resvg/resvg-js (→ PNG). Runs offline — Inter fonts come from the bundled
 * @fontsource/inter package. Safe to re-run; overwrites existing PNGs.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT_DIR = resolve(ROOT, 'demo/public/og');
mkdirSync(OUT_DIR, { recursive: true });

const FONTS_DIR = resolve(ROOT, 'node_modules/@fontsource/inter/files');
const fonts = [
  { name: 'Inter', data: readFileSync(`${FONTS_DIR}/inter-latin-400-normal.woff`), weight: 400, style: 'normal' },
  { name: 'Inter', data: readFileSync(`${FONTS_DIR}/inter-latin-700-normal.woff`), weight: 700, style: 'normal' },
  { name: 'Inter', data: readFileSync(`${FONTS_DIR}/inter-latin-800-normal.woff`), weight: 800, style: 'normal' },
];

const WIDTH = 1200;
const HEIGHT = 630;

/* ── minimal element-tree helpers (no React runtime needed) ──────────── */
const h = (type, props = {}, ...children) => ({
  type,
  props: { ...props, children: children.flat().filter((c) => c !== false && c != null) },
});

// Satori throws unless every multi-child <div> has explicit display. Default
// `display: flex` on `box`; callers can override (including to "none").
const box = (style, ...children) =>
  h('div', { style: { display: 'flex', ...style } }, ...children);
const text = (style, value) =>
  h('div', { style: { display: 'flex', ...style } }, value);

/* ── design tokens ───────────────────────────────────────────────────── */
const COLORS = {
  bgStart: '#0b1020',
  bgEnd: '#1e1b4b',
  panel: 'rgba(255,255,255,0.04)',
  panelBorder: 'rgba(255,255,255,0.10)',
  fg: '#f8fafc',
  muted: '#94a3b8',
  accent: '#818cf8',
  accentMuted: 'rgba(129,140,248,0.25)',
  layerMargin: 'rgba(249,168,37,0.45)',
  layerBorder: 'rgba(252,211,77,0.55)',
  layerPadding: 'rgba(134,239,172,0.55)',
  layerContent: 'rgba(147,197,253,0.60)',
};

/* ── illustrations ───────────────────────────────────────────────────── */

// A framed "viewport" that all component illustrations render inside.
const viewport = (inner, extraStyle = {}) =>
  box(
    {
      width: 440,
      height: 300,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 16,
      background: COLORS.panel,
      position: 'relative',
      display: 'flex',
      overflow: 'hidden',
      ...extraStyle,
    },
    inner,
  );

// Tiny dots that represent icons inside illustrated widgets.
const iconDots = (count, color = '#cbd5f5') =>
  h(
    'div',
    { style: { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' } },
    ...Array.from({ length: count }, () =>
      box({ width: 16, height: 16, borderRadius: 999, background: color }),
    ),
  );

const illustrations = {
  launcher: () =>
    viewport(
      box(
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          width: '100%',
          height: '100%',
          padding: 24,
        },
        box(
          {
            width: 140,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 12px 30px rgba(99,102,241,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
          },
          '✦ widget',
        ),
      ),
    ),

  dock: () =>
    viewport(
      box(
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          paddingBottom: 24,
        },
        box(
          {
            display: 'flex',
            gap: 10,
            padding: '10px 16px',
            background: 'rgba(15,23,42,0.85)',
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          },
          ...Array.from({ length: 5 }, (_, i) =>
            box({
              width: 34,
              height: 34,
              borderRadius: 8,
              background: i === 2 ? COLORS.accent : 'rgba(255,255,255,0.08)',
            }),
          ),
        ),
      ),
    ),

  sheet: () =>
    viewport(
      box(
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
        },
        box(
          {
            height: 170,
            background: 'rgba(30,41,59,0.95)',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: `1px solid ${COLORS.panelBorder}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 10,
            gap: 12,
          },
          box({ width: 48, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.5)' }),
          box(
            { display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 24px', width: '100%' },
            box({ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', width: '85%' }),
            box({ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.10)', width: '70%' }),
            box({ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.10)', width: '78%' }),
          ),
        ),
      ),
    ),

  splitter: () =>
    viewport(
      box(
        { display: 'flex', width: '100%', height: '100%' },
        box({ width: '22%', background: 'rgba(99,102,241,0.22)', borderRight: `2px solid ${COLORS.accent}` }),
        box({ width: '50%', background: 'rgba(148,163,184,0.10)', borderRight: `2px solid ${COLORS.accent}` }),
        box({ width: '28%', background: 'rgba(34,197,94,0.18)' }),
      ),
    ),

  inspector: () => {
    const layer = (color, label, inset) =>
      box(
        {
          position: 'absolute',
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          border: `2px dashed ${color}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: 6,
          color,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
        label,
      );
    return viewport(
      box(
        { width: '100%', height: '100%', position: 'relative', display: 'flex' },
        layer(COLORS.layerMargin, 'margin', 20),
        layer(COLORS.layerBorder, 'border', 50),
        layer(COLORS.layerPadding, 'padding', 80),
        box(
          {
            position: 'absolute',
            top: 110,
            left: 110,
            right: 110,
            bottom: 110,
            background: COLORS.layerContent,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0b1020',
            fontSize: 14,
            fontWeight: 700,
          },
          'content',
        ),
      ),
    );
  },

  // Home: a 3x2 grid of mini-widget previews. Each tile contains a small
  // illustration of the component it represents, plus a short label.
  home: () =>
    box(
      {
        flexDirection: 'column',
        gap: 14,
        width: 440,
        height: 300,
      },
      box(
        { gap: 14, flex: 1 },
        miniTile('Launcher', '#a5b4fc', miniLauncher()),
        miniTile('Dock', '#86efac', miniDock()),
        miniTile('Sheet', '#fcd34d', miniSheet()),
      ),
      box(
        { gap: 14, flex: 1 },
        miniTile('Splitter', '#f9a8d4', miniSplitter()),
        miniTile('Inspector', '#7dd3fc', miniInspector()),
        miniTile('+ more', COLORS.muted, miniWordmark(), true),
      ),
    ),
};

function miniTile(label, color, preview, dimmed = false) {
  return box(
    {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRadius: 14,
      border: `1px solid ${COLORS.panelBorder}`,
      background: dimmed ? 'rgba(255,255,255,0.02)' : COLORS.panel,
      padding: 10,
      overflow: 'hidden',
    },
    box({ flex: 1, position: 'relative' }, preview),
    text(
      { color, fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' },
      label,
    ),
  );
}

/* ── home mini-illustrations ─────────────────────────────────────────── */
function miniLauncher() {
  return box(
    { width: '100%', height: '100%', alignItems: 'flex-end', justifyContent: 'flex-end' },
    box({
      width: 28,
      height: 18,
      borderRadius: 6,
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    }),
  );
}
function miniDock() {
  return box(
    { width: '100%', height: '100%', alignItems: 'flex-end', justifyContent: 'center' },
    box(
      {
        gap: 3,
        padding: '3px 5px',
        borderRadius: 6,
        background: 'rgba(15,23,42,0.7)',
        border: `1px solid ${COLORS.panelBorder}`,
      },
      ...Array.from({ length: 4 }, (_, i) =>
        box({
          width: 8,
          height: 8,
          borderRadius: 2,
          background: i === 1 ? COLORS.accent : 'rgba(255,255,255,0.15)',
        }),
      ),
    ),
  );
}
function miniSheet() {
  return box(
    { width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'flex-end' },
    box(
      {
        height: 32,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 3,
        gap: 4,
        background: 'rgba(30,41,59,0.9)',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderTop: `1px solid ${COLORS.panelBorder}`,
      },
      box({ width: 16, height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.5)' }),
      box(
        { flexDirection: 'column', gap: 2, width: '80%', marginTop: 2 },
        box({ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.15)', width: '100%' }),
        box({ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.12)', width: '70%' }),
      ),
    ),
  );
}
function miniSplitter() {
  return box(
    { width: '100%', height: '100%' },
    box({ width: '25%', background: 'rgba(99,102,241,0.35)', borderRight: `1px solid ${COLORS.accent}` }),
    box({ width: '50%', background: 'rgba(148,163,184,0.15)', borderRight: `1px solid ${COLORS.accent}` }),
    box({ width: '25%', background: 'rgba(34,197,94,0.25)' }),
  );
}
function miniInspector() {
  const layer = (color, inset) =>
    box({
      position: 'absolute',
      top: inset,
      left: inset,
      right: inset,
      bottom: inset,
      border: `1px dashed ${color}`,
      borderRadius: 3,
    });
  return box(
    { width: '100%', height: '100%', position: 'relative' },
    layer(COLORS.layerMargin, 2),
    layer(COLORS.layerBorder, 8),
    layer(COLORS.layerPadding, 14),
    box({
      position: 'absolute',
      top: 20,
      left: 20,
      right: 20,
      bottom: 20,
      background: COLORS.layerContent,
      borderRadius: 2,
    }),
  );
}
function miniWordmark() {
  return box(
    { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    box(
      { gap: 4, alignItems: 'center' },
      box({
        width: 10,
        height: 10,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${COLORS.accent}, #c084fc)`,
      }),
      text({ color: COLORS.fg, fontSize: 11, fontWeight: 700 }, 'driftkit'),
    ),
  );
}

/* ── card composition ────────────────────────────────────────────────── */

function card({ kind, title, tagline }) {
  const illustration = illustrations[kind]();
  // Scale down long titles so they fit the left column at one line.
  const titleSize = kind === 'home' ? 84 : title.length > 16 ? 58 : 72;

  return box(
    {
      width: WIDTH,
      height: HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      padding: 56,
      background: `linear-gradient(135deg, ${COLORS.bgStart} 0%, ${COLORS.bgEnd} 100%)`,
      color: COLORS.fg,
      fontFamily: 'Inter',
      position: 'relative',
    },
    // Header: wordmark
    box(
      {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: COLORS.muted,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      box({
        width: 14,
        height: 14,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${COLORS.accent}, #c084fc)`,
      }),
      text({ color: COLORS.fg }, 'react-'),
      text({ color: COLORS.accent }, 'driftkit'),
    ),

    // Body: 2 columns
    box(
      {
        display: 'flex',
        flex: 1,
        marginTop: 44,
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      // Left: title + tagline
      box(
        {
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 580,
          gap: 20,
        },
        text(
          {
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: COLORS.fg,
          },
          title,
        ),
        text(
          {
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.4,
            color: COLORS.muted,
          },
          tagline,
        ),
      ),
      // Right: illustration
      illustration,
    ),

    // Footer: url tag
    box(
      {
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: COLORS.muted,
        fontSize: 20,
        fontWeight: 400,
      },
      text({ color: COLORS.accent, fontWeight: 700 }, 'react-driftkit.saktichourasia.dev'),
    ),
  );
}

/* ── per-page content ────────────────────────────────────────────────── */
const pages = [
  {
    slug: 'home',
    kind: 'home',
    title: 'Floating UI primitives for React',
    tagline: 'Draggable launchers, docks, sheets, split panes, and a DevTools-style inspector. Tree-shakable and unstyled.',
  },
  {
    slug: 'movable-launcher',
    kind: 'launcher',
    title: 'MovableLauncher',
    tagline: 'A draggable floating wrapper that snaps to the nearest corner — or lands wherever the user drops it.',
  },
  {
    slug: 'snap-dock',
    kind: 'dock',
    title: 'SnapDock',
    tagline: 'An edge-pinned dock that slides along any side of the viewport and flips between horizontal and vertical.',
  },
  {
    slug: 'draggable-sheet',
    kind: 'sheet',
    title: 'DraggableSheet',
    tagline: 'A pull-up sheet with peek, half, and full snap points. Velocity-aware flicks and a drag-handle selector.',
  },
  {
    slug: 'resizable-split-pane',
    kind: 'splitter',
    title: 'ResizableSplitPane',
    tagline: 'An N-pane resizable layout with draggable handles, min/max constraints, and localStorage persistence.',
  },
  {
    slug: 'inspector-bubble',
    kind: 'inspector',
    title: 'InspectorBubble',
    tagline: 'A Chrome-DevTools-style element picker. Tag, selector, font, WCAG contrast, ARIA role and accessible name.',
  },
];

/* ── render pipeline ─────────────────────────────────────────────────── */
async function renderPage(page) {
  const tree = card(page);
  const svg = await satori(tree, { width: WIDTH, height: HEIGHT, fonts });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  }).render().asPng();
  const outPath = resolve(OUT_DIR, `${page.slug}.png`);
  writeFileSync(outPath, png);
  return outPath;
}

console.log(`[og] generating ${pages.length} cards → ${OUT_DIR}`);
for (const page of pages) {
  const out = await renderPage(page);
  const bytes = (readFileSync(out).byteLength / 1024).toFixed(1);
  console.log(`[og]   ${page.slug}.png (${bytes} KB)`);
}
console.log('[og] done.');
