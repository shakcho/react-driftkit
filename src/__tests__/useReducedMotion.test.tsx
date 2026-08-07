import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Listener = () => void;

/** Minimal MediaQueryList stand-in — jsdom does not implement matchMedia. */
function mockMatchMedia(matches: boolean, { legacy = false } = {}) {
  const listeners = new Set<Listener>();
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: legacy ? undefined : (_: string, l: Listener) => listeners.add(l),
    removeEventListener: legacy ? undefined : (_: string, l: Listener) => listeners.delete(l),
    addListener: legacy ? (l: Listener) => listeners.add(l) : undefined,
    removeListener: legacy ? (l: Listener) => listeners.delete(l) : undefined,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return {
    mql,
    set(next: boolean) {
      mql.matches = next;
      act(() => listeners.forEach((l) => l()));
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('reports false when the preference is not set', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reports true when the preference is set', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the preference changes', () => {
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    mq.set(true);
    expect(result.current).toBe(true);

    mq.set(false);
    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const mq = mockMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(mq.listenerCount()).toBe(1);

    unmount();
    expect(mq.listenerCount()).toBe(0);
  });

  it('falls back to the legacy listener API', () => {
    const mq = mockMatchMedia(false, { legacy: true });
    const { result, unmount } = renderHook(() => useReducedMotion());

    mq.set(true);
    expect(result.current).toBe(true);

    unmount();
    expect(mq.listenerCount()).toBe(0);
  });

  it('reports false where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
