import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { usePersistedState } from '../hooks/usePersistedState';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('usePersistedState', () => {
  describe('reading', () => {
    it('uses the default when nothing is stored', () => {
      const { result } = renderHook(() => usePersistedState('k', 42));
      expect(result.current[0]).toBe(42);
    });

    it('accepts a lazy default', () => {
      const factory = vi.fn(() => ({ a: 1 }));
      const { result } = renderHook(() => usePersistedState('k', factory));
      expect(result.current[0]).toEqual({ a: 1 });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('hydrates from storage on the first render', () => {
      localStorage.setItem('k', JSON.stringify([0.25, 0.75]));
      const { result } = renderHook(() => usePersistedState<number[]>('k', []));
      expect(result.current[0]).toEqual([0.25, 0.75]);
    });

    it('ignores corrupt JSON', () => {
      localStorage.setItem('k', '{not json');
      const { result } = renderHook(() => usePersistedState('k', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });

    it('rejects values the validator refuses', () => {
      localStorage.setItem('k', JSON.stringify('a string where a number belongs'));
      const { result } = renderHook(() =>
        usePersistedState('k', 7, {
          validate: (v) => (typeof v === 'number' ? v : undefined),
        }),
      );
      expect(result.current[0]).toBe(7);
    });

    it('passes validated values through', () => {
      localStorage.setItem('k', JSON.stringify(3));
      const { result } = renderHook(() =>
        usePersistedState('k', 7, {
          validate: (v) => (typeof v === 'number' ? v * 2 : undefined),
        }),
      );
      expect(result.current[0]).toBe(6);
    });
  });

  describe('writing', () => {
    it('persists on set', () => {
      const { result } = renderHook(() => usePersistedState('k', 1));
      act(() => result.current[1](5));

      expect(result.current[0]).toBe(5);
      expect(localStorage.getItem('k')).toBe('5');
    });

    it('supports functional updates', () => {
      const { result } = renderHook(() => usePersistedState('k', 1));
      act(() => result.current[1]((n) => n + 1));
      act(() => result.current[1]((n) => n + 1));

      expect(result.current[0]).toBe(3);
      expect(localStorage.getItem('k')).toBe('3');
    });

    it('survives a storage write that throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      const { result } = renderHook(() => usePersistedState('k', 1));

      expect(() => act(() => result.current[1](9))).not.toThrow();
      expect(result.current[0]).toBe(9);
    });
  });

  describe('no key', () => {
    it('behaves as plain state and writes nothing', () => {
      const { result } = renderHook(() => usePersistedState(undefined, 1));
      act(() => result.current[1](4));

      expect(result.current[0]).toBe(4);
      expect(localStorage.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes the entry and restores the default', () => {
      localStorage.setItem('k', JSON.stringify(99));
      const { result } = renderHook(() => usePersistedState('k', 1));
      expect(result.current[0]).toBe(99);

      act(() => result.current[2]());

      expect(result.current[0]).toBe(1);
      expect(localStorage.getItem('k')).toBeNull();
    });
  });

  describe('key changes', () => {
    it('adopts the value stored under the new key', () => {
      localStorage.setItem('a', JSON.stringify(1));
      localStorage.setItem('b', JSON.stringify(2));

      const { result, rerender } = renderHook(({ k }) => usePersistedState(k, 0), {
        initialProps: { k: 'a' },
      });
      expect(result.current[0]).toBe(1);

      rerender({ k: 'b' });
      expect(result.current[0]).toBe(2);
    });

    it('falls back to the default when the new key is unset', () => {
      localStorage.setItem('a', JSON.stringify(1));
      const { result, rerender } = renderHook(({ k }) => usePersistedState(k, 0), {
        initialProps: { k: 'a' },
      });

      rerender({ k: 'fresh' });
      expect(result.current[0]).toBe(0);
    });

    it('writes to the new key after it changes', () => {
      const { result, rerender } = renderHook(({ k }) => usePersistedState(k, 0), {
        initialProps: { k: 'a' },
      });
      rerender({ k: 'b' });
      act(() => result.current[1](8));

      expect(localStorage.getItem('b')).toBe('8');
      expect(localStorage.getItem('a')).toBeNull();
    });
  });

  describe('storage area', () => {
    it('can use sessionStorage', () => {
      const { result } = renderHook(() => usePersistedState('k', 1, { storage: 'session' }));
      act(() => result.current[1](3));

      expect(sessionStorage.getItem('k')).toBe('3');
      expect(localStorage.getItem('k')).toBeNull();
    });
  });

  describe('custom serialization', () => {
    it('uses the supplied serializer and deserializer', () => {
      localStorage.setItem('k', 'a,b,c');
      const { result } = renderHook(() =>
        usePersistedState<string[]>('k', [], {
          serialize: (v) => v.join(','),
          deserialize: (raw) => raw.split(','),
        }),
      );
      expect(result.current[0]).toEqual(['a', 'b', 'c']);

      act(() => result.current[1](['x', 'y']));
      expect(localStorage.getItem('k')).toBe('x,y');
    });
  });

  describe('storage failures', () => {
    it('falls back to the default when reads throw', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError');
      });
      const { result } = renderHook(() => usePersistedState('k', 'safe'));
      expect(result.current[0]).toBe('safe');
    });
  });
});
