import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSnapPoints, resolveSnapPoint, type SnapPointValue } from '../hooks/useSnapPoints';

afterEach(cleanup);

function setup(points: SnapPointValue[], size = 1000, velocityThreshold?: number) {
  return renderHook(() => useSnapPoints({ points, size, velocityThreshold })).result;
}

describe('resolveSnapPoint', () => {
  it('resolves the named presets', () => {
    expect(resolveSnapPoint('closed', 1000)).toBe(0);
    expect(resolveSnapPoint('peek', 1000)).toBe(96);
    expect(resolveSnapPoint('half', 1000)).toBe(500);
    expect(resolveSnapPoint('full', 1000)).toBe(920);
  });

  it('caps peek at the axis size', () => {
    expect(resolveSnapPoint('peek', 40)).toBe(40);
  });

  it('resolves pixels and percentages', () => {
    expect(resolveSnapPoint(240, 1000)).toBe(240);
    expect(resolveSnapPoint('40%', 1000)).toBe(400);
    expect(resolveSnapPoint('12.5%', 800)).toBe(100);
  });

  it('floors negative values at zero', () => {
    expect(resolveSnapPoint(-50, 1000)).toBe(0);
    expect(resolveSnapPoint('-20%', 1000)).toBe(0);
  });

  it('falls back to zero for malformed input', () => {
    expect(resolveSnapPoint('nonsense' as SnapPointValue, 1000)).toBe(0);
  });

  it('honours scale overrides', () => {
    expect(resolveSnapPoint('peek', 1000, { peek: 40 })).toBe(40);
    expect(resolveSnapPoint('half', 1000, { half: 0.6 })).toBe(600);
    expect(resolveSnapPoint('full', 1000, { full: 1 })).toBe(1000);
  });
});

describe('useSnapPoints', () => {
  it('resolves and sorts stops ascending', () => {
    const result = setup(['full', 'closed', 'half']);
    expect(result.current.resolved.map((r) => r.px)).toEqual([0, 500, 920]);
    expect(result.current.resolved.map((r) => r.point)).toEqual(['closed', 'half', 'full']);
  });

  it('re-resolves when the axis size changes', () => {
    const { result, rerender } = renderHook(
      ({ size }) => useSnapPoints({ points: ['half'], size }),
      { initialProps: { size: 1000 } },
    );
    expect(result.current.resolved[0].px).toBe(500);

    rerender({ size: 600 });
    expect(result.current.resolved[0].px).toBe(300);
  });

  it('keeps a stable identity for an inline points array', () => {
    const { result, rerender } = renderHook(() =>
      useSnapPoints({ points: ['peek', 'half'], size: 1000 }),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  describe('nearest', () => {
    it('picks the closest stop', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.nearest(100)!.point).toBe('closed');
      expect(result.current.nearest(400)!.point).toBe('half');
      expect(result.current.nearest(900)!.point).toBe('full');
    });

    it('returns null with no stops', () => {
      const result = setup([]);
      expect(result.current.nearest(100)).toBeNull();
    });
  });

  describe('select', () => {
    it('falls back to nearest below the velocity threshold', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.select(480, 0.1, 'closed')!.point).toBe('half');
    });

    it('advances one stop on a fast flick towards growth', () => {
      const result = setup(['closed', 'half', 'full']);
      // Barely moved from `closed`, but flicked hard — go one stop up.
      expect(result.current.select(30, 1.2, 'closed')!.point).toBe('half');
    });

    it('retreats one stop on a fast flick towards shrink', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.select(900, -1.2, 'full')!.point).toBe('half');
    });

    it('does not advance past the last stop', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.select(900, 2, 'full')!.point).toBe('full');
    });

    it('does not retreat past the first stop', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.select(10, -2, 'closed')!.point).toBe('closed');
    });

    it('honours a custom velocity threshold', () => {
      const result = setup(['closed', 'half', 'full'], 1000, 2);
      // 1.2 px/ms is now below threshold, so nearest wins.
      expect(result.current.select(30, 1.2, 'closed')!.point).toBe('closed');
    });

    it('uses nearest when the previous stop is unknown', () => {
      const result = setup(['closed', 'half', 'full']);
      expect(result.current.select(480, 5)!.point).toBe('half');
    });
  });

  describe('clamp', () => {
    it('clamps to the span of the stops', () => {
      const result = setup(['peek', 'full']);
      expect(result.current.clamp(10)).toBe(96);
      expect(result.current.clamp(5000)).toBe(920);
      expect(result.current.clamp(400)).toBe(400);
    });
  });

  it('does not touch the DOM', () => {
    // Nothing here reads window — the axis size is supplied by the caller,
    // which is what makes the hook safe to run during SSR.
    const result = setup(['half'], 0);
    expect(result.current.resolved[0].px).toBe(0);
  });
});
