import { useMemo } from 'react';

/**
 * A snap point is either a named preset, a pixel number, or a percentage
 * string. Presets resolve against the axis size passed to the hook:
 *   - `closed` → 0
 *   - `peek`   → 96 px (capped at the axis size)
 *   - `half`   → 50% of the axis
 *   - `full`   → 92% of the axis
 * Numbers are pixels. Percentage strings like `'40%'` are relative to the axis.
 */
export type SnapPointValue = 'closed' | 'peek' | 'half' | 'full' | number | `${number}%`;

/** Overrides for what the named presets resolve to. */
export interface SnapPointScale {
  /** Pixel size of `'peek'`. Defaults to `96`. */
  peek?: number;
  /** Fraction of the axis for `'half'`. Defaults to `0.5`. */
  half?: number;
  /** Fraction of the axis for `'full'`. Defaults to `0.92`. */
  full?: number;
}

export interface ResolvedSnapPoint {
  /** The original value, so it can be handed back to a controlled parent. */
  point: SnapPointValue;
  /** Its resolved size along the axis, in px. */
  px: number;
}

export interface UseSnapPointsOptions {
  /** Ordered list of stops. Order is irrelevant — they are sorted by size. */
  points: SnapPointValue[];
  /**
   * Size the presets and percentages resolve against — typically the viewport
   * axis or a container size. Pass `0` during SSR; nothing here touches the DOM.
   */
  size: number;
  /** Override the named presets. */
  scale?: SnapPointScale;
  /** Release velocity in px/ms above which a flick advances one stop. Defaults to `0.5`. */
  velocityThreshold?: number;
}

export interface UseSnapPointsResult {
  /** Every stop resolved to px, sorted ascending. */
  resolved: ResolvedSnapPoint[];
  /** Resolve any snap point against the current size. */
  resolve: (point: SnapPointValue) => number;
  /** The stop closest to `px`. `null` when there are no stops. */
  nearest: (px: number) => ResolvedSnapPoint | null;
  /**
   * Velocity-aware stop selection for a drag release. Below the velocity
   * threshold this is just `nearest`. Above it, a flick advances exactly one
   * stop from `from` in the flick's direction, so a quick swipe feels decisive
   * even when the finger barely moved. Positive velocity means growing.
   */
  select: (px: number, velocity?: number, from?: SnapPointValue) => ResolvedSnapPoint | null;
  /** Clamp a size to the range spanned by the stops. */
  clamp: (px: number) => number;
}

const PEEK_DEFAULT_PX = 96;
const HALF_RATIO = 0.5;
const FULL_RATIO = 0.92;

/**
 * Standalone resolver — the same logic `useSnapPoints` uses, exported for
 * one-off conversions outside a render.
 */
export function resolveSnapPoint(
  point: SnapPointValue,
  size: number,
  scale?: SnapPointScale,
): number {
  if (point === 'closed') return 0;
  if (point === 'peek') return Math.min(scale?.peek ?? PEEK_DEFAULT_PX, size);
  if (point === 'half') return size * (scale?.half ?? HALF_RATIO);
  if (point === 'full') return size * (scale?.full ?? FULL_RATIO);
  if (typeof point === 'number') return Math.max(0, point);
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(point);
  if (match) return Math.max(0, (parseFloat(match[1]) / 100) * size);
  return 0;
}

/**
 * Resolves a mixed list of snap points to pixels and picks the stop a release
 * should settle on. Extracted from `DraggableSheet`, which owns the same
 * behaviour for a single axis.
 *
 * ```tsx
 * const snaps = useSnapPoints({ points: ['peek', 'half', 'full'], size: window.innerHeight });
 * const target = snaps.select(draggedPx, releaseVelocity, currentSnap);
 * ```
 */
export function useSnapPoints({
  points,
  size,
  scale,
  velocityThreshold = 0.5,
}: UseSnapPointsOptions): UseSnapPointsResult {
  // Inline `points` arrays get a new identity every render, so memoize on the
  // values rather than the array.
  const key = points.join('|');
  const peek = scale?.peek;
  const half = scale?.half;
  const full = scale?.full;

  return useMemo(() => {
    const stableScale: SnapPointScale | undefined =
      peek === undefined && half === undefined && full === undefined
        ? undefined
        : { peek, half, full };

    const resolve = (point: SnapPointValue) => resolveSnapPoint(point, size, stableScale);

    const resolved = points
      .map((point) => ({ point, px: resolve(point) }))
      .sort((a, b) => a.px - b.px);

    const nearest = (px: number): ResolvedSnapPoint | null => {
      if (resolved.length === 0) return null;
      let best = resolved[0];
      let bestDist = Infinity;
      for (const stop of resolved) {
        const d = Math.abs(stop.px - px);
        if (d < bestDist) {
          bestDist = d;
          best = stop;
        }
      }
      return best;
    };

    const select = (
      px: number,
      velocity = 0,
      from?: SnapPointValue,
    ): ResolvedSnapPoint | null => {
      if (resolved.length === 0) return null;
      const closest = nearest(px)!;
      if (Math.abs(velocity) < velocityThreshold || from === undefined) return closest;

      const prevIdx = resolved.findIndex((r) => r.point === from);
      if (prevIdx < 0) return closest;
      if (velocity > 0 && prevIdx < resolved.length - 1) return resolved[prevIdx + 1];
      if (velocity < 0 && prevIdx > 0) return resolved[prevIdx - 1];
      return closest;
    };

    const clamp = (px: number) => {
      if (resolved.length === 0) return px;
      const min = resolved[0].px;
      const max = resolved[resolved.length - 1].px;
      return Math.min(Math.max(px, min), max);
    };

    return { resolved, resolve, nearest, select, clamp };
    // `key` stands in for the contents of `points`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size, peek, half, full, velocityThreshold]);
}

export default useSnapPoints;
