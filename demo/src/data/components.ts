import { launcherMeta } from './launcher';
import { dockMeta } from './dock';
import { sheetMeta } from './sheet';
import { splitterMeta } from './splitter';
import { zoomLensMeta } from './zoomlens';
import { flickDeckMeta } from './flickdeck';
import { pullToRefreshMeta } from './pulltorefresh';
import { marqueeSelectMeta } from './marqueeselect';

// Alphabetical by title — drives the "What's inside" grid on the home page.
// Keep it that way when adding a component.
export const allComponents = [
  sheetMeta,          // DraggableSheet
  flickDeckMeta,      // FlickDeck
  marqueeSelectMeta,  // MarqueeSelect
  launcherMeta,       // MovableLauncher
  pullToRefreshMeta,  // PullToRefresh
  splitterMeta,       // ResizableSplitPane
  dockMeta,           // SnapDock
  zoomLensMeta,       // ZoomLens
] as const;

export { launcherMeta, dockMeta, sheetMeta, splitterMeta, zoomLensMeta, flickDeckMeta, pullToRefreshMeta, marqueeSelectMeta };
