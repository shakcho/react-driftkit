import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useInertia, type InertiaFrame, type UseInertiaOptions } from '../hooks/useInertia';

const FRAME_MS = 1000 / 60;

let frames: Array<{ id: number; cb: FrameRequestCallback }> = [];
let nextId = 1;

/** Advance the mocked animation loop by one frame. */
function tick(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = frames.shift();
    if (!pending) return;
    act(() => pending.cb(nextId * FRAME_MS));
    nextId++;
  }
}

/** Run to completion, with a cap so a bug can't hang the suite. */
function drain(limit = 500) {
  let n = 0;
  while (frames.length > 0 && n < limit) {
    tick();
    n++;
  }
  return n;
}

beforeEach(() => {
  frames = [];
  nextId = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId;
    frames.push({ id, cb });
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames = frames.filter((f) => f.id !== id);
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(options: Partial<UseInertiaOptions> = {}) {
  const onFrame = vi.fn<(f: InertiaFrame) => void>();
  const onEnd = vi.fn<(f: InertiaFrame) => void>();
  const hook = renderHook(() => useInertia({ onFrame, onEnd, ...options }));
  return { ...hook, onFrame, onEnd };
}

describe('useInertia', () => {
  it('is idle until started', () => {
    const { result, onFrame } = setup();
    expect(result.current.active).toBe(false);
    expect(onFrame).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });

  it('emits movement in the direction of the release velocity', () => {
    const { result, onFrame } = setup({ decay: 0.9 });

    act(() => result.current.start({ x: 1, y: -0.5 }));
    tick();

    const frame = onFrame.mock.calls[0][0];
    expect(frame.dx).toBeCloseTo(FRAME_MS, 5);
    expect(frame.dy).toBeCloseTo(-FRAME_MS / 2, 5);
    expect(frame.x).toBeCloseTo(FRAME_MS, 5);
  });

  it('decays velocity every frame', () => {
    const { result, onFrame } = setup({ decay: 0.5, minVelocity: 0.001 });

    act(() => result.current.start({ x: 1 }));
    tick(3);

    const [f1, f2, f3] = onFrame.mock.calls.map((c) => c[0]);
    expect(f2.dx).toBeLessThan(f1.dx);
    expect(f3.dx).toBeLessThan(f2.dx);
    expect(f2.vx).toBeCloseTo(f1.vx * 0.5, 4);
  });

  it('accumulates total movement across frames', () => {
    const { result, onFrame } = setup({ decay: 0.5, minVelocity: 0.001 });

    act(() => result.current.start({ x: 1 }));
    tick(3);

    const calls = onFrame.mock.calls.map((c) => c[0]);
    const summed = calls.reduce((acc, f) => acc + f.dx, 0);
    expect(calls[calls.length - 1].x).toBeCloseTo(summed, 5);
  });

  it('stops once velocity falls below minVelocity', () => {
    const { result, onEnd } = setup({ decay: 0.5, minVelocity: 0.1 });

    act(() => result.current.start({ x: 1 }));
    drain();

    expect(result.current.active).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  });

  it('marks itself active for the duration of the glide', () => {
    const { result } = setup({ decay: 0.5, minVelocity: 0.1 });

    act(() => result.current.start({ x: 1 }));
    expect(result.current.active).toBe(true);

    drain();
    expect(result.current.active).toBe(false);
  });

  it('ignores a release too slow to be a flick', () => {
    const { result, onFrame, onEnd } = setup({ minVelocity: 0.5 });

    act(() => result.current.start({ x: 0.1 }));

    expect(result.current.active).toBe(false);
    expect(onFrame).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('stops on demand', () => {
    const { result, onFrame, onEnd } = setup({ decay: 0.99, minVelocity: 0.001 });

    act(() => result.current.start({ x: 2 }));
    tick(2);
    const framesSoFar = onFrame.mock.calls.length;

    act(() => result.current.stop());

    expect(result.current.active).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
    tick(3);
    expect(onFrame.mock.calls.length).toBe(framesSoFar);
  });

  it('does nothing when stopped while idle', () => {
    const { result, onEnd } = setup();
    act(() => result.current.stop());
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('replaces a glide already in flight', () => {
    const { result, onFrame } = setup({ decay: 0.99, minVelocity: 0.001 });

    act(() => result.current.start({ x: 1 }));
    tick(2);
    act(() => result.current.start({ x: -1 }));
    onFrame.mockClear();
    tick();

    // Cumulative movement restarts from zero on the new release.
    const frame = onFrame.mock.calls[0][0];
    expect(frame.dx).toBeLessThan(0);
    expect(frame.x).toBeCloseTo(frame.dx, 5);
  });

  it('respects maxDuration for a velocity that would otherwise glide forever', () => {
    const { result, onEnd } = setup({ decay: 1, minVelocity: 0.001, maxDuration: 100 });

    act(() => result.current.start({ x: 1 }));
    const ticked = drain();

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(ticked).toBeLessThanOrEqual(Math.ceil(100 / FRAME_MS) + 1);
  });

  it('cancels the loop on unmount', () => {
    const { result, unmount, onFrame } = setup({ decay: 0.99, minVelocity: 0.001 });

    act(() => result.current.start({ x: 1 }));
    tick();
    unmount();
    const before = onFrame.mock.calls.length;
    tick(3);

    expect(onFrame.mock.calls.length).toBe(before);
  });

  it('degrades gracefully where requestAnimationFrame does not exist', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const { result, onFrame } = setup();

    act(() => result.current.start({ x: 5 }));

    expect(result.current.active).toBe(false);
    expect(onFrame).not.toHaveBeenCalled();
  });
});
