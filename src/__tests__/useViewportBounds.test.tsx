import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useViewportBounds, type UseViewportBoundsOptions } from '../hooks/useViewportBounds';

/** ResizeObserver mock that lets a test fire the callback on demand. */
let observerCallbacks: ResizeObserverCallback[] = [];
const OriginalResizeObserver = globalThis.ResizeObserver;

class ControllableResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observerCallbacks.push(callback);
  }
  observe() {
    // Mirror the real thing: observe() schedules an immediate first callback.
    this.callback([], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

function Box({ options = {} }: { options?: UseViewportBoundsOptions<HTMLDivElement> }) {
  const { ref } = useViewportBounds<HTMLDivElement>(options);
  return <div ref={ref} data-testid="box" />;
}

/** jsdom has no layout, so element size is whatever a test stubs. */
function stubRect(el: Element, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
}

beforeEach(() => {
  observerCallbacks = [];
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver;
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
});

afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = OriginalResizeObserver;
  vi.restoreAllMocks();
});

describe('useViewportBounds', () => {
  describe('viewport changes', () => {
    it('notifies on window resize', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange }} />);

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
        fireEvent(window, new Event('resize'));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toMatchObject({
        reason: 'viewport',
        viewport: { width: 500, height: 768 },
      });
    });

    it('notifies on orientation change', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange }} />);

      act(() => {
        fireEvent(window, new Event('orientationchange'));
      });

      expect(onChange.mock.calls[0][0].reason).toBe('orientation');
    });

    it('stops listening after unmount', () => {
      const onChange = vi.fn();
      const { unmount } = render(<Box options={{ onChange }} />);
      unmount();

      act(() => {
        fireEvent(window, new Event('resize'));
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('element resize', () => {
    it('skips the callback ResizeObserver fires on observe()', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange }} />);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('notifies when the element actually changes size', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange }} />);
      const el = screen.getByTestId('box');
      stubRect(el, 200, 100);

      act(() => {
        observerCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toMatchObject({
        reason: 'element',
        size: { width: 200, height: 100 },
        prevSize: { width: 0, height: 0 },
      });
    });

    it('ignores an observation that reports the same size', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange }} />);

      act(() => {
        observerCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
      });

      // jsdom reports 0x0 both times — no delta, no notification.
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled', () => {
    it('suppresses notifications while true', () => {
      const onChange = vi.fn();
      render(<Box options={{ onChange, disabled: true }} />);

      act(() => {
        fireEvent(window, new Event('resize'));
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts a function so live state does not re-subscribe', () => {
      const onChange = vi.fn();
      let dragging = true;
      render(<Box options={{ onChange, disabled: () => dragging }} />);

      act(() => {
        fireEvent(window, new Event('resize'));
      });
      expect(onChange).not.toHaveBeenCalled();

      dragging = false;
      act(() => {
        fireEvent(window, new Event('resize'));
      });
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('clamp', () => {
    it('keeps a position inside the viewport', () => {
      let api: ReturnType<typeof useViewportBounds<HTMLDivElement>> | null = null;
      function Probe() {
        api = useViewportBounds<HTMLDivElement>();
        return <div ref={api.ref} data-testid="box" />;
      }
      render(<Probe />);
      stubRect(screen.getByTestId('box'), 100, 50);

      expect(api!.clamp({ x: 5000, y: 5000 })).toEqual({ x: 924, y: 718 });
      expect(api!.clamp({ x: -50, y: -50 })).toEqual({ x: 0, y: 0 });
      expect(api!.clamp({ x: 200, y: 200 })).toEqual({ x: 200, y: 200 });
    });

    it('honours padding', () => {
      let api: ReturnType<typeof useViewportBounds<HTMLDivElement>> | null = null;
      function Probe() {
        api = useViewportBounds<HTMLDivElement>({ padding: 16 });
        return <div ref={api.ref} data-testid="box" />;
      }
      render(<Probe />);

      expect(api!.clamp({ x: 5000, y: 5000 }, { width: 100, height: 50 })).toEqual({
        x: 908,
        y: 702,
      });
      expect(api!.clamp({ x: 0, y: 0 }, { width: 100, height: 50 })).toEqual({ x: 16, y: 16 });
    });

    it('keeps an oversized element pinned to the top-left rather than off screen', () => {
      let api: ReturnType<typeof useViewportBounds<HTMLDivElement>> | null = null;
      function Probe() {
        api = useViewportBounds<HTMLDivElement>();
        return <div ref={api.ref} data-testid="box" />;
      }
      render(<Probe />);

      expect(api!.clamp({ x: 40, y: 40 }, { width: 4000, height: 4000 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('refresh', () => {
    it('emits a manual change', () => {
      const onChange = vi.fn();
      let api: ReturnType<typeof useViewportBounds<HTMLDivElement>> | null = null;
      function Probe() {
        api = useViewportBounds<HTMLDivElement>({ onChange });
        return <div ref={api.ref} />;
      }
      render(<Probe />);

      act(() => api!.refresh());
      expect(onChange.mock.calls[0][0].reason).toBe('manual');
    });
  });
});
