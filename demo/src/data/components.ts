import { launcherMeta } from './launcher';
import { dockMeta } from './dock';
import { sheetMeta } from './sheet';
import { splitterMeta } from './splitter';
import { zoomLensMeta } from './zoomlens';
import { flickDeckMeta } from './flickdeck';

export const allComponents = [zoomLensMeta, flickDeckMeta, launcherMeta, dockMeta, sheetMeta, splitterMeta] as const;

export { launcherMeta, dockMeta, sheetMeta, splitterMeta, zoomLensMeta, flickDeckMeta };
