import { launcherMeta } from './launcher';
import { dockMeta } from './dock';
import { sheetMeta } from './sheet';
import { splitterMeta } from './splitter';
import { inspectorMeta } from './inspector';
import { zoomLensMeta } from './zoomlens';
import { flickDeckMeta } from './flickdeck';

export const allComponents = [inspectorMeta, zoomLensMeta, flickDeckMeta, launcherMeta, dockMeta, sheetMeta, splitterMeta] as const;

export { launcherMeta, dockMeta, sheetMeta, splitterMeta, inspectorMeta, zoomLensMeta, flickDeckMeta };
