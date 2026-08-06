import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PullToRefresh, type PullToRefreshState } from '../PullToRefresh';

/** Root element the component renders. */
function getRoot(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function getContent(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-ptr-content]') as HTMLElement;
}

function getIndicator(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-ptr-indicator]') as HTMLElement;
}

function phaseOf(container: HTMLElement): string | null {
  return getRoot(container).getAttribute('data-ptr-phase');
}

/** Pixels of translateY currently applied to the content wrapper. */
function contentOffset(container: HTMLElement): number {
  const match = /translate3d\([^,]+,\s*(-?[\d.]+)px/.exec(
    getContent(container).style.transform
  );
  return match ? parseFloat(match[1]) : 0;
}

/**
 * jsdom ignores writes to `documentElement.scrollTop`, so shadow it with an
 * own property to simulate a page that has been scrolled down.
 */
function setPageScroll(top: number) {
  Object.defineProperty(document.documentElement, 'scrollTop', {
    value: top,
    configurable: true,
    writable: true,
  });
}

/** A full press → drag → release, in one gesture. */
function pull(el: HTMLElement, dy: number, { release = true } = {}) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: 100, clientY: 100 + dy, pointerId: 1 });
  if (release) {
    fireEvent.pointerUp(el, { clientX: 100, clientY: 100 + dy, pointerId: 1 });
  }
}

beforeEach(() => {
  setPageScroll(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PullToRefresh', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <PullToRefresh>
          <div>List body</div>
        </PullToRefresh>
      );
      expect(screen.getByText('List body')).toBeInTheDocument();
    });

    it('applies base and custom className', () => {
      const { container } = render(
        <PullToRefresh className="my-list">x</PullToRefresh>
      );
      const root = getRoot(container);
      expect(root).toHaveClass('pull-to-refresh');
      expect(root).toHaveClass('my-list');
    });

    it('merges custom style over defaults', () => {
      const { container } = render(
        <PullToRefresh style={{ backgroundColor: 'red' }}>x</PullToRefresh>
      );
      expect(getRoot(container).style.backgroundColor).toBe('red');
    });

    it('starts idle, at rest, and not busy', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      expect(phaseOf(container)).toBe('idle');
      expect(contentOffset(container)).toBe(0);
      expect(getRoot(container).hasAttribute('data-ptr-armed')).toBe(false);
      expect(getRoot(container).hasAttribute('aria-busy')).toBe(false);
    });

    it('parks the indicator above the fold by its own height', () => {
      const { container } = render(
        <PullToRefresh indicatorHeight={40}>x</PullToRefresh>
      );
      expect(getIndicator(container).style.transform).toContain('-40px');
    });

    it('exposes the indicator as a polite live region', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      const indicator = getIndicator(container);
      expect(indicator.getAttribute('role')).toBe('status');
      expect(indicator.getAttribute('aria-live')).toBe('polite');
    });

    it('calls the indicator render prop with live state', () => {
      const seen: PullToRefreshState[] = [];
      const { container } = render(
        <PullToRefresh
          indicator={(s) => {
            seen.push(s);
            return <span>{s.phase}</span>;
          }}
        >
          x
        </PullToRefresh>
      );
      expect(seen[0]).toMatchObject({ phase: 'idle', distance: 0, progress: 0, armed: false });

      pull(getRoot(container), 200, { release: false });
      const last = seen[seen.length - 1];
      expect(last.phase).toBe('armed');
      expect(last.progress).toBe(1);
      expect(last.source).toBe('pointer');
    });
  });

  describe('pointer pull', () => {
    it('tracks a short drag as pulling without arming', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 30, { release: false });

      expect(phaseOf(container)).toBe('pulling');
      expect(contentOffset(container)).toBeGreaterThan(0);
      expect(getRoot(container).hasAttribute('data-ptr-armed')).toBe(false);
    });

    it('arms once the damped distance crosses the threshold', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 200, { release: false });

      expect(phaseOf(container)).toBe('armed');
      expect(getRoot(container).hasAttribute('data-ptr-armed')).toBe(true);
      expect(getRoot(container).getAttribute('data-ptr-source')).toBe('pointer');
    });

    it('damps the pull so it never exceeds maxPull', () => {
      const { container } = render(
        <PullToRefresh behavior={{ maxPull: 100 }}>x</PullToRefresh>
      );
      pull(getRoot(container), 5000, { release: false });
      expect(contentOffset(container)).toBeLessThanOrEqual(100);
      expect(contentOffset(container)).toBeGreaterThan(50);
    });

    it('moves the content less than the finger (resistance)', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 100, { release: false });
      expect(contentOffset(container)).toBeLessThan(100);
    });

    it('ignores movement below the activation threshold', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 3, { release: false });
      expect(phaseOf(container)).toBe('idle');
      expect(contentOffset(container)).toBe(0);
    });

    it('ignores an upward drag', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), -80, { release: false });
      expect(phaseOf(container)).toBe('idle');
    });

    it('ignores a mostly-horizontal drag', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      fireEvent.pointerDown(getRoot(container), { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(getRoot(container), { clientX: 300, clientY: 120, pointerId: 1 });
      expect(phaseOf(container)).toBe('idle');
    });

    it('ignores secondary mouse buttons', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      fireEvent.pointerDown(getRoot(container), {
        clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse', button: 2,
      });
      fireEvent.pointerMove(getRoot(container), { clientX: 100, clientY: 300, pointerId: 1 });
      expect(phaseOf(container)).toBe('idle');
    });

    it('does not start when the scroller is away from the top', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      setPageScroll(120);
      pull(getRoot(container), 200, { release: false });
      expect(phaseOf(container)).toBe('idle');
    });

    it('only reacts to the pointer that started the gesture', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      fireEvent.pointerDown(getRoot(container), { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(getRoot(container), { clientX: 100, clientY: 300, pointerId: 2 });
      expect(phaseOf(container)).toBe('idle');
    });

    it('settles back without refreshing when released below the threshold', () => {
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh on={{ refresh }}>x</PullToRefresh>
      );
      pull(getRoot(container), 30);

      expect(refresh).not.toHaveBeenCalled();
      expect(phaseOf(container)).toBe('settling');
      expect(contentOffset(container)).toBe(0);
    });

    it('aborts without refreshing on pointercancel', () => {
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh on={{ refresh }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200, { release: false });
      fireEvent.pointerCancel(getRoot(container), { clientX: 100, clientY: 300, pointerId: 1 });

      expect(refresh).not.toHaveBeenCalled();
      expect(phaseOf(container)).toBe('settling');
      expect(contentOffset(container)).toBe(0);
    });

    it('swallows the click that follows a pull', () => {
      const click = vi.fn();
      const { container } = render(
        <PullToRefresh>
          <button onClick={click}>Row</button>
        </PullToRefresh>
      );
      pull(getRoot(container), 200);
      fireEvent.click(screen.getByText('Row'));
      expect(click).not.toHaveBeenCalled();
    });

    it('leaves an ordinary click alone', () => {
      const click = vi.fn();
      render(
        <PullToRefresh>
          <button onClick={click}>Row</button>
        </PullToRefresh>
      );
      fireEvent.click(screen.getByText('Row'));
      expect(click).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshing (uncontrolled)', () => {
    it('fires on.refresh and holds the content at refreshOffset', () => {
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh behavior={{ refreshOffset: 50 }} on={{ refresh }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(phaseOf(container)).toBe('refreshing');
      expect(contentOffset(container)).toBe(50);
      expect(getRoot(container).getAttribute('aria-busy')).toBe('true');
    });

    it('stays refreshing until the returned promise resolves', async () => {
      vi.useFakeTimers();
      let resolve!: () => void;
      const refresh = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
      const { container } = render(
        <PullToRefresh behavior={{ minRefreshMs: 0 }} on={{ refresh }}>x</PullToRefresh>
      );

      pull(getRoot(container), 200);
      expect(phaseOf(container)).toBe('refreshing');

      await act(async () => { await Promise.resolve(); });
      expect(phaseOf(container)).toBe('refreshing');

      await act(async () => { resolve(); });
      act(() => { vi.advanceTimersByTime(1); });
      expect(phaseOf(container)).toBe('settling');
      expect(contentOffset(container)).toBe(0);
    });

    it('honours minRefreshMs before settling', async () => {
      vi.useFakeTimers();
      const refresh = vi.fn(() => Promise.resolve());
      const { container } = render(
        <PullToRefresh behavior={{ minRefreshMs: 500 }} on={{ refresh }}>x</PullToRefresh>
      );

      pull(getRoot(container), 200);
      await act(async () => { await Promise.resolve(); });
      expect(phaseOf(container)).toBe('refreshing');

      act(() => { vi.advanceTimersByTime(499); });
      expect(phaseOf(container)).toBe('refreshing');

      act(() => { vi.advanceTimersByTime(2); });
      expect(phaseOf(container)).toBe('settling');
    });

    it('returns to idle after the settle transition', async () => {
      vi.useFakeTimers();
      const { container } = render(
        <PullToRefresh
          behavior={{ minRefreshMs: 0 }}
          animation={{ duration: 200 }}
          on={{ refresh: () => Promise.resolve() }}
        >
          x
        </PullToRefresh>
      );

      pull(getRoot(container), 200);
      await act(async () => { await Promise.resolve(); });
      act(() => { vi.advanceTimersByTime(1); });
      expect(phaseOf(container)).toBe('settling');

      act(() => { vi.advanceTimersByTime(200); });
      expect(phaseOf(container)).toBe('idle');
    });

    it('recovers when on.refresh throws', () => {
      const refresh = vi.fn(() => { throw new Error('network down'); });
      const { container } = render(
        <PullToRefresh on={{ refresh }}>x</PullToRefresh>
      );
      expect(() => pull(getRoot(container), 200)).not.toThrow();
      expect(phaseOf(container)).toBe('refreshing');
    });

    it('ignores a new pull while already refreshing', () => {
      const refresh = vi.fn(() => new Promise<void>(() => {}));
      const { container } = render(
        <PullToRefresh on={{ refresh }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200);
      pull(getRoot(container), 200);
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshing (controlled)', () => {
    it('enters the refreshing state when the prop flips true', () => {
      const { container, rerender } = render(
        <PullToRefresh refreshing={false} behavior={{ refreshOffset: 60 }}>x</PullToRefresh>
      );
      expect(phaseOf(container)).toBe('idle');

      rerender(
        <PullToRefresh refreshing behavior={{ refreshOffset: 60 }}>x</PullToRefresh>
      );
      expect(phaseOf(container)).toBe('refreshing');
      expect(contentOffset(container)).toBe(60);
    });

    it('settles when the prop flips back to false', () => {
      const { container, rerender } = render(
        <PullToRefresh refreshing>x</PullToRefresh>
      );
      expect(phaseOf(container)).toBe('refreshing');

      rerender(<PullToRefresh refreshing={false}>x</PullToRefresh>);
      expect(phaseOf(container)).toBe('settling');
      expect(contentOffset(container)).toBe(0);
    });

    it('ignores the promise returned by on.refresh', async () => {
      const refresh = vi.fn(() => Promise.resolve());
      const { container } = render(
        <PullToRefresh refreshing={false} on={{ refresh }}>x</PullToRefresh>
      );

      pull(getRoot(container), 200);
      expect(refresh).toHaveBeenCalledTimes(1);

      // Parent never set refreshing=true, so the component waits rather than
      // settling itself off the resolved promise.
      await act(async () => { await Promise.resolve(); });
      expect(phaseOf(container)).toBe('refreshing');
    });
  });

  describe('wheel pull (desktop)', () => {
    it('pulls on upward wheel at the top of the scroller', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      fireEvent.wheel(getRoot(container), { deltaY: -40 });

      expect(phaseOf(container)).toBe('pulling');
      expect(getRoot(container).getAttribute('data-ptr-source')).toBe('wheel');
      expect(contentOffset(container)).toBeGreaterThan(0);
    });

    it('accumulates successive wheel events until armed', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      const root = getRoot(container);
      for (let i = 0; i < 6; i++) fireEvent.wheel(root, { deltaY: -40 });
      expect(phaseOf(container)).toBe('armed');
    });

    it('refreshes once the wheel goes quiet past wheelReleaseMs', () => {
      vi.useFakeTimers();
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh behavior={{ wheelReleaseMs: 120 }} on={{ refresh }}>x</PullToRefresh>
      );
      const root = getRoot(container);
      for (let i = 0; i < 6; i++) fireEvent.wheel(root, { deltaY: -40 });

      act(() => { vi.advanceTimersByTime(119); });
      expect(refresh).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(2); });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(phaseOf(container)).toBe('refreshing');
    });

    it('settles instead of refreshing when the wheel stops short', () => {
      vi.useFakeTimers();
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh behavior={{ wheelReleaseMs: 120 }} on={{ refresh }}>x</PullToRefresh>
      );
      fireEvent.wheel(getRoot(container), { deltaY: -20 });

      act(() => { vi.advanceTimersByTime(200); });
      expect(refresh).not.toHaveBeenCalled();
      expect(contentOffset(container)).toBe(0);
    });

    it('unwinds an open pull when the wheel reverses', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      const root = getRoot(container);
      fireEvent.wheel(root, { deltaY: -80 });
      const opened = contentOffset(container);
      expect(opened).toBeGreaterThan(0);

      fireEvent.wheel(root, { deltaY: 60 });
      expect(contentOffset(container)).toBeLessThan(opened);
    });

    it('ignores a downward wheel at rest', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      fireEvent.wheel(getRoot(container), { deltaY: 120 });
      expect(phaseOf(container)).toBe('idle');
      expect(contentOffset(container)).toBe(0);
    });

    it('ignores the wheel when the scroller is away from the top', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      setPageScroll(200);
      fireEvent.wheel(getRoot(container), { deltaY: -80 });
      expect(phaseOf(container)).toBe('idle');
    });

    it('respects behavior.wheel=false', () => {
      const { container } = render(
        <PullToRefresh behavior={{ wheel: false }}>x</PullToRefresh>
      );
      fireEvent.wheel(getRoot(container), { deltaY: -120 });
      expect(phaseOf(container)).toBe('idle');
    });
  });

  describe('disabling', () => {
    it('blocks the pointer path when disabled', () => {
      const refresh = vi.fn();
      const { container } = render(
        <PullToRefresh disabled on={{ refresh }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200);
      expect(phaseOf(container)).toBe('idle');
      expect(refresh).not.toHaveBeenCalled();
    });

    it('blocks the wheel path when disabled', () => {
      const { container } = render(
        <PullToRefresh disabled>x</PullToRefresh>
      );
      fireEvent.wheel(getRoot(container), { deltaY: -200 });
      expect(phaseOf(container)).toBe('idle');
    });

    it('respects behavior.pointer=false', () => {
      const { container } = render(
        <PullToRefresh behavior={{ pointer: false }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200, { release: false });
      expect(phaseOf(container)).toBe('idle');
    });

    it('abandons an in-flight pull when disabled mid-gesture', () => {
      const { container, rerender } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 200, { release: false });
      expect(phaseOf(container)).toBe('armed');

      rerender(<PullToRefresh disabled>x</PullToRefresh>);
      expect(phaseOf(container)).toBe('settling');
      expect(contentOffset(container)).toBe(0);
    });
  });

  describe('events', () => {
    it('fires on.stateChange for each phase transition', () => {
      const stateChange = vi.fn();
      const { container } = render(
        <PullToRefresh on={{ stateChange, refresh: () => {} }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200);

      const phases = stateChange.mock.calls.map((c) => c[0].phase);
      expect(phases).toContain('armed');
      expect(phases).toContain('refreshing');
      expect(phases).not.toContain('idle');
    });

    it('reports progress relative to the threshold', () => {
      const stateChange = vi.fn();
      const { container } = render(
        <PullToRefresh behavior={{ threshold: 40 }} on={{ stateChange }}>x</PullToRefresh>
      );
      pull(getRoot(container), 200, { release: false });

      const armedCall = stateChange.mock.calls.find((c) => c[0].phase === 'armed');
      expect(armedCall?.[0].progress).toBe(1);
      expect(armedCall?.[0].distance).toBeGreaterThanOrEqual(40);
    });
  });

  describe('configuration', () => {
    it('honours a custom threshold', () => {
      const { container } = render(
        <PullToRefresh behavior={{ threshold: 200, maxPull: 400 }}>x</PullToRefresh>
      );
      pull(getRoot(container), 100, { release: false });
      expect(phaseOf(container)).toBe('pulling');
    });

    it('honours a custom resistance', () => {
      const { container: heavy } = render(
        <PullToRefresh behavior={{ resistance: 0.2 }}>x</PullToRefresh>
      );
      pull(getRoot(heavy), 100, { release: false });
      const heavyOffset = contentOffset(heavy);

      const { container: light } = render(
        <PullToRefresh behavior={{ resistance: 1 }}>x</PullToRefresh>
      );
      pull(getRoot(light), 100, { release: false });
      expect(contentOffset(light)).toBeGreaterThan(heavyOffset);
    });

    it('gates on a scroller matched by behavior.scrollSelector', () => {
      const { container } = render(
        <PullToRefresh behavior={{ scrollSelector: '[data-list]' }}>
          <div data-list>rows</div>
        </PullToRefresh>
      );
      const list = container.querySelector('[data-list]') as HTMLElement;
      Object.defineProperty(list, 'scrollTop', { value: 90, writable: true });

      pull(getRoot(container), 200, { release: false });
      expect(phaseOf(container)).toBe('idle');
    });

    it('drops the transition while tracking the pull', () => {
      const { container } = render(<PullToRefresh>x</PullToRefresh>);
      pull(getRoot(container), 200, { release: false });
      expect(getContent(container).style.transition).toBe('none');
    });

    it('animates with the configured duration and easing when settling', () => {
      const { container } = render(
        <PullToRefresh animation={{ duration: 999, easing: 'linear' }}>x</PullToRefresh>
      );
      pull(getRoot(container), 30);
      expect(getContent(container).style.transition).toBe('transform 999ms linear');
    });
  });

  describe('SSR safety', () => {
    it('renders to a string without touching the DOM', () => {
      expect(() =>
        renderToString(
          <PullToRefresh indicator={(s) => <span>{s.phase}</span>}>
            <div>Server content</div>
          </PullToRefresh>
        )
      ).not.toThrow();
    });

    it('produces markup at rest on the server', () => {
      const html = renderToString(
        <PullToRefresh>
          <div>Server content</div>
        </PullToRefresh>
      );
      expect(html).toContain('Server content');
      expect(html).toContain('data-ptr-phase="idle"');
    });
  });
});
