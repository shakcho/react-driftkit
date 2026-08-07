import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useRef } from 'react';
import { useDrag, type UseDragOptions, type DragState } from '../hooks/useDrag';

function DragBox({ options = {} }: { options?: UseDragOptions<HTMLDivElement> }) {
  const { ref, dragging, handlers } = useDrag<HTMLDivElement>(options);
  return (
    <div
      ref={ref}
      data-testid="surface"
      data-dragging={dragging ? '' : undefined}
      {...handlers}
    >
      <span data-testid="handle" data-handle="">
        handle
      </span>
      <span data-testid="body">body</span>
    </div>
  );
}

/** Drives the hook through a ref the consumer owns, the way a component would. */
function ExternalRefBox({ options = {} }: { options?: UseDragOptions<HTMLDivElement> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { dragging, handlers } = useDrag<HTMLDivElement>({ ...options, ref });
  return <div ref={ref} data-testid="surface" data-dragging={dragging ? '' : undefined} {...handlers} />;
}

afterEach(() => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not wired up.
  cleanup();
  vi.restoreAllMocks();
});

describe('useDrag', () => {
  describe('click vs drag threshold', () => {
    it('does not start a drag below the threshold', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 103, clientY: 102, pointerId: 1 });

      expect(onStart).not.toHaveBeenCalled();
      expect(surface).not.toHaveAttribute('data-dragging');
    });

    it('starts a drag once movement crosses the threshold', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 110, clientY: 100, pointerId: 1 });

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0][0]).toMatchObject({ dx: 10, dy: 0, pointerId: 1 });
      expect(surface).toHaveAttribute('data-dragging');
    });

    it('honours a custom threshold', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ threshold: 20, onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 15, clientY: 0, pointerId: 1 });
      expect(onStart).not.toHaveBeenCalled();

      fireEvent.pointerMove(surface, { clientX: 25, clientY: 0, pointerId: 1 });
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('measures the threshold on a single axis when axis is set', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ axis: 'x', onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      // 40 px of vertical travel is not a horizontal drag.
      fireEvent.pointerMove(surface, { clientX: 2, clientY: 40, pointerId: 1 });
      expect(onStart).not.toHaveBeenCalled();

      fireEvent.pointerMove(surface, { clientX: 10, clientY: 40, pointerId: 1 });
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('fires onStart only once per gesture', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 20, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 60, clientY: 0, pointerId: 1 });

      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('deltas', () => {
    it('reports deltas relative to the gesture start', () => {
      const onMove = vi.fn();
      render(<DragBox options={{ onMove }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 90, clientY: 20, pointerId: 1 });

      const calls = onMove.mock.calls;
      const state = calls[calls.length - 1][0] as DragState;
      expect(state).toMatchObject({ startX: 50, startY: 50, x: 90, y: 20, dx: 40, dy: -30 });
    });

    it('processes each pointermove exactly once despite window + element delivery', () => {
      const onMove = vi.fn();
      render(<DragBox options={{ onMove }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 30, clientY: 0, pointerId: 1 });

      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('tracks moves that land outside the element before capture', () => {
      const onMove = vi.fn();
      render(<DragBox options={{ onMove }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(document.body, { clientX: 200, clientY: 0, pointerId: 1 });

      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onMove.mock.calls[0][0]).toMatchObject({ dx: 200 });
    });
  });

  describe('velocity', () => {
    it('averages velocity over the trailing window', () => {
      let t = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => t);

      const onEnd = vi.fn();
      render(<DragBox options={{ onEnd }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      t = 20;
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      t = 40;
      fireEvent.pointerUp(surface, { clientX: 80, clientY: 0, pointerId: 1 });

      expect(onEnd).toHaveBeenCalledTimes(1);
      // 80 px over 40 ms.
      expect((onEnd.mock.calls[0][0] as DragState).vx).toBeCloseTo(2, 5);
    });

    it('reports no velocity when the pointer rests before release', () => {
      let t = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => t);

      const onEnd = vi.fn();
      render(<DragBox options={{ onEnd }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      t = 20;
      fireEvent.pointerMove(surface, { clientX: 100, clientY: 0, pointerId: 1 });
      // Long pause with no movement — samples older than the window drop out.
      t = 500;
      fireEvent.pointerUp(surface, { clientX: 100, clientY: 0, pointerId: 1 });

      expect((onEnd.mock.calls[0][0] as DragState).vx).toBe(0);
    });
  });

  describe('release', () => {
    it('fires onEnd for a real drag', () => {
      const onEnd = vi.fn();
      render(<DragBox options={{ onEnd }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 });

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(surface).not.toHaveAttribute('data-dragging');
    });

    it('fires nothing when a press never became a drag', () => {
      const onEnd = vi.fn();
      const onCancel = vi.fn();
      render(<DragBox options={{ onEnd, onCancel }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(surface, { clientX: 1, clientY: 1, pointerId: 1 });

      expect(onEnd).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('commits a release that happens outside the element', () => {
      const onEnd = vi.fn();
      render(<DragBox options={{ onEnd }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(document.body, { clientX: 400, clientY: 400, pointerId: 1 });

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('fires onCancel on pointercancel', () => {
      const onEnd = vi.fn();
      const onCancel = vi.fn();
      render(<DragBox options={{ onEnd, onCancel }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.pointerCancel(surface, { pointerId: 1 });

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onEnd).not.toHaveBeenCalled();
      expect(surface).not.toHaveAttribute('data-dragging');
    });

    it('fires onCancel when pointer capture is lost', () => {
      const onCancel = vi.fn();
      render(<DragBox options={{ onCancel }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.lostPointerCapture(surface, { pointerId: 1 });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('ignores events from a different pointer', () => {
      const onEnd = vi.fn();
      const onMove = vi.fn();
      render(<DragBox options={{ onEnd, onMove }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 400, clientY: 0, pointerId: 2 });
      fireEvent.pointerUp(surface, { clientX: 400, clientY: 0, pointerId: 2 });

      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onEnd).not.toHaveBeenCalled();
    });
  });

  describe('handle selector', () => {
    it('starts a drag from inside the handle', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ handle: '[data-handle]', onStart }} />);

      fireEvent.pointerDown(screen.getByTestId('handle'), { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(screen.getByTestId('surface'), { clientX: 40, clientY: 0, pointerId: 1 });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('ignores presses outside the handle', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ handle: '[data-handle]', onStart }} />);

      fireEvent.pointerDown(screen.getByTestId('body'), { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(screen.getByTestId('surface'), { clientX: 40, clientY: 0, pointerId: 1 });

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe('gating', () => {
    it('ignores input while disabled', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ disabled: true, onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });

      expect(onStart).not.toHaveBeenCalled();
    });

    it('ignores pointer types that are not allowed', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ pointerTypes: ['touch'], onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'mouse' });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1, pointerType: 'mouse' });
      expect(onStart).not.toHaveBeenCalled();

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 2, pointerType: 'touch' });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 2, pointerType: 'touch' });
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('ignores non-primary mouse buttons', () => {
      const onStart = vi.fn();
      render(<DragBox options={{ onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, {
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        pointerType: 'mouse',
        button: 2,
      });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1, pointerType: 'mouse' });

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe('external ref', () => {
    it('drives a ref supplied by the consumer', () => {
      const onStart = vi.fn();
      render(<ExternalRefBox options={{ onStart }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 });

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(surface).toHaveAttribute('data-dragging');
    });
  });

  describe('lifecycle', () => {
    it('detaches window listeners on unmount', () => {
      const onMove = vi.fn();
      const { unmount } = render(<DragBox options={{ onMove }} />);
      const surface = screen.getByTestId('surface');

      fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
      unmount();
      fireEvent.pointerMove(document.body, { clientX: 200, clientY: 0, pointerId: 1 });

      expect(onMove).not.toHaveBeenCalled();
    });

    it('does not touch the DOM before a pointer goes down', () => {
      // The hook registers nothing on mount, so a render with no gesture is
      // side-effect free — the property SSR depends on.
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<DragBox />);
      expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.anything());
    });
  });
});
