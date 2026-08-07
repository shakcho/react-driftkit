import { useCallback, useEffect, useRef, useState } from 'react';

/** Release velocity in px/ms, per axis. Omitted axes are treated as `0`. */
export interface InertiaVelocity {
  x?: number;
  y?: number;
}

export interface InertiaFrame {
  /** Velocity at this frame, px/ms. */
  vx: number;
  vy: number;
  /** Movement to apply since the previous frame, in px. */
  dx: number;
  dy: number;
  /** Cumulative movement since the release, in px. */
  x: number;
  y: number;
}

export interface UseInertiaOptions {
  /**
   * Velocity retained per 60 fps frame. `0.95` glides, `0.8` stops quickly.
   * Normalised by real frame time, so the motion is identical at 120 Hz.
   * Defaults to `0.95`.
   */
  decay?: number;
  /** Speed in px/ms at which the glide ends. Defaults to `0.02`. */
  minVelocity?: number;
  /** Hard stop in ms, so a pathological velocity can't spin forever. Defaults to `2000`. */
  maxDuration?: number;
  /** Applies each frame's movement. Required. */
  onFrame: (frame: InertiaFrame) => void;
  /** Fires once when the glide stops, naturally or via `stop()`. Not called on unmount. */
  onEnd?: (frame: InertiaFrame) => void;
}

export interface UseInertiaResult {
  /** True while a glide is running. */
  active: boolean;
  /** Begin a glide from a release velocity. Replaces any glide in flight. */
  start: (velocity: InertiaVelocity) => void;
  /** Stop immediately. Fires `onEnd` if a glide was running. */
  stop: () => void;
}

const FRAME_MS = 1000 / 60;
/** Frames longer than this (a backgrounded tab) are clamped so nothing jumps. */
const MAX_FRAME_MS = 64;

/**
 * Momentum decay after a drag release. Feed it the velocity `useDrag` reports
 * on `onEnd` and it drives an exponential glide until the motion falls below
 * `minVelocity`.
 *
 * SSR-safe: the animation frame loop only starts from `start()`, and is
 * skipped entirely where `requestAnimationFrame` does not exist.
 *
 * ```tsx
 * const inertia = useInertia({
 *   onFrame: ({ dx }) => (el.current.scrollLeft -= dx),
 * });
 * useDrag({ onEnd: ({ vx }) => inertia.start({ x: vx }) });
 * ```
 */
export function useInertia(options: UseInertiaOptions): UseInertiaResult {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [active, setActive] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<InertiaFrame>({ vx: 0, vy: 0, dx: 0, dy: 0, x: 0, y: 0 });

  const finish = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setActive(false);
    const frame = stateRef.current;
    stateRef.current = { ...frame, vx: 0, vy: 0, dx: 0, dy: 0 };
    optsRef.current.onEnd?.({ ...frame, vx: 0, vy: 0, dx: 0, dy: 0 });
  }, []);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  const stop = useCallback(() => {
    if (rafRef.current === null) return;
    finishRef.current();
  }, []);

  const start = useCallback((velocity: InertiaVelocity) => {
    const o = optsRef.current;
    const decay = o.decay ?? 0.95;
    const minVelocity = o.minVelocity ?? 0.02;
    const maxDuration = o.maxDuration ?? 2000;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    let vx = velocity.x ?? 0;
    let vy = velocity.y ?? 0;
    stateRef.current = { vx, vy, dx: 0, dy: 0, x: 0, y: 0 };

    // Nothing worth animating, and nowhere to animate on the server.
    if (typeof requestAnimationFrame === 'undefined') return;
    if (Math.hypot(vx, vy) < minVelocity) return;

    setActive(true);
    let last: number | null = null;
    let elapsed = 0;

    const step = (t: number) => {
      const dt = last === null ? FRAME_MS : Math.min(t - last, MAX_FRAME_MS);
      last = t;
      elapsed += dt;

      const dx = vx * dt;
      const dy = vy * dt;
      const damping = Math.pow(decay, dt / FRAME_MS);
      vx *= damping;
      vy *= damping;

      const next: InertiaFrame = {
        vx,
        vy,
        dx,
        dy,
        x: stateRef.current.x + dx,
        y: stateRef.current.y + dy,
      };
      stateRef.current = next;
      optsRef.current.onFrame(next);

      if (Math.hypot(vx, vy) < minVelocity || elapsed >= maxDuration) {
        finishRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [],
  );

  return { active, start, stop };
}

export default useInertia;
