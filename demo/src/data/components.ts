import { launcherMeta } from './launcher';
import { dockMeta } from './dock';
import { sheetMeta } from './sheet';
import { splitterMeta } from './splitter';
import { inspectorMeta } from './inspector';

export const allComponents = [launcherMeta, dockMeta, sheetMeta, splitterMeta, inspectorMeta] as const;

export { launcherMeta, dockMeta, sheetMeta, splitterMeta, inspectorMeta };
