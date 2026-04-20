import { launcherMeta } from './launcher';
import { dockMeta } from './dock';
import { sheetMeta } from './sheet';
import { splitterMeta } from './splitter';
import { inspectorMeta } from './inspector';
import { zoomLensMeta } from './zoomlens';

export const allComponents = [launcherMeta, dockMeta, sheetMeta, splitterMeta, inspectorMeta, zoomLensMeta] as const;

export { launcherMeta, dockMeta, sheetMeta, splitterMeta, inspectorMeta, zoomLensMeta };
