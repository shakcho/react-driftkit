/**
 * The gesture layer the components are built on, published as its own entry
 * point: `react-driftkit/hooks`.
 */
export { useDrag } from './hooks/useDrag';
export type {
  UseDragOptions,
  UseDragResult,
  DragHandlers,
  DragState,
  DragAxis,
  PointerType,
} from './hooks/useDrag';

export { useSnapPoints, resolveSnapPoint } from './hooks/useSnapPoints';
export type {
  UseSnapPointsOptions,
  UseSnapPointsResult,
  SnapPointValue,
  SnapPointScale,
  ResolvedSnapPoint,
} from './hooks/useSnapPoints';

export { useViewportBounds } from './hooks/useViewportBounds';
export type {
  UseViewportBoundsOptions,
  UseViewportBoundsResult,
  BoundsChange,
  BoundsReason,
  Size,
  Position,
} from './hooks/useViewportBounds';

export { useInertia } from './hooks/useInertia';
export type { UseInertiaOptions, UseInertiaResult, InertiaFrame, InertiaVelocity } from './hooks/useInertia';

export { usePersistedState } from './hooks/usePersistedState';
export type {
  UsePersistedStateOptions,
  UsePersistedStateResult,
  PersistStorage,
} from './hooks/usePersistedState';

export { useLongPress } from './hooks/useLongPress';
export type {
  UseLongPressOptions,
  UseLongPressResult,
  LongPressHandlers,
  LongPressState,
  LongPressCancelReason,
} from './hooks/useLongPress';

export { useReducedMotion } from './hooks/useReducedMotion';
