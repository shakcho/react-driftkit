import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useLongPress, type UseLongPressOptions } from '../hooks/useLongPress';

function PressTarget({ options = {} }: { options?: UseLongPressOptions }) {
  const { pressing, fired, handlers } = useLongPress<HTMLDivElement>(options);
  return (
    <div
      data-testid="target"
      data-pressing={pressing ? '' : undefined}
      data-fired={fired ? '' : undefined}
      {...handlers}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Advance fake timers inside act so state updates flush. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useLongPress', () => {
  it('fires after the hold time', () => {
    const onLongPress = vi.fn();
    render(<PressTarget options={{ onLongPress }} />);
    const target = screen.getByTestId('target');

    fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(target).toHaveAttribute('data-pressing');
    expect(onLongPress).not.toHaveBeenCalled();

    advance(400);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress.mock.calls[0][0]).toMatchObject({ pointerId: 1, x: 0, y: 0 });
    expect(target).toHaveAttribute('data-fired');
  });

  it('does not fire before the hold time', () => {
    const onLongPress = vi.fn();
    render(<PressTarget options={{ onLongPress }} />);

    fireEvent.pointerDown(screen.getByTestId('target'), { clientX: 0, clientY: 0, pointerId: 1 });
    advance(399);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('honours a custom delay', () => {
    const onLongPress = vi.fn();
    render(<PressTarget options={{ delay: 1000, onLongPress }} />);

    fireEvent.pointerDown(screen.getByTestId('target'), { clientX: 0, clientY: 0, pointerId: 1 });
    advance(500);
    expect(onLongPress).not.toHaveBeenCalled();

    advance(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('fires onPressStart immediately', () => {
    const onPressStart = vi.fn();
    render(<PressTarget options={{ onPressStart }} />);

    fireEvent.pointerDown(screen.getByTestId('target'), { clientX: 5, clientY: 6, pointerId: 1 });

    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressStart.mock.calls[0][0]).toMatchObject({ x: 5, y: 6 });
  });

  describe('cancellation', () => {
    it('cancels when the pointer moves past the tolerance', () => {
      const onLongPress = vi.fn();
      const onCancel = vi.fn();
      render(<PressTarget options={{ onLongPress, onCancel }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(target, { clientX: 20, clientY: 0, pointerId: 1 });
      advance(400);

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledWith(expect.anything(), 'moved');
      expect(target).not.toHaveAttribute('data-pressing');
    });

    it('tolerates small movement', () => {
      const onLongPress = vi.fn();
      render(<PressTarget options={{ onLongPress }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(target, { clientX: 4, clientY: 4, pointerId: 1 });
      advance(400);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('honours a custom move tolerance', () => {
      const onLongPress = vi.fn();
      render(<PressTarget options={{ moveTolerance: 40, onLongPress }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(target, { clientX: 30, clientY: 0, pointerId: 1 });
      advance(400);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('stops tracking movement once it has fired', () => {
      const onLongPress = vi.fn();
      const onCancel = vi.fn();
      render(<PressTarget options={{ onLongPress, onCancel }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      advance(400);
      fireEvent.pointerMove(target, { clientX: 500, clientY: 0, pointerId: 1 });

      expect(onCancel).not.toHaveBeenCalled();
      expect(target).toHaveAttribute('data-fired');
    });

    it('cancels on early release', () => {
      const onLongPress = vi.fn();
      const onCancel = vi.fn();
      render(<PressTarget options={{ onLongPress, onCancel }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(target, { clientX: 0, clientY: 0, pointerId: 1 });
      advance(400);

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledWith(expect.anything(), 'released');
    });

    it('does not report a cancel for a release after it fired', () => {
      const onCancel = vi.fn();
      render(<PressTarget options={{ onCancel }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      advance(400);
      fireEvent.pointerUp(target, { clientX: 0, clientY: 0, pointerId: 1 });

      expect(onCancel).not.toHaveBeenCalled();
      expect(target).not.toHaveAttribute('data-fired');
    });

    it('cancels on pointercancel', () => {
      const onCancel = vi.fn();
      render(<PressTarget options={{ onCancel }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerCancel(target, { pointerId: 1 });
      advance(400);

      expect(onCancel).toHaveBeenCalledWith(expect.anything(), 'cancelled');
    });

    it('ignores events from a different pointer', () => {
      const onLongPress = vi.fn();
      render(<PressTarget options={{ onLongPress }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(target, { clientX: 0, clientY: 0, pointerId: 2 });
      advance(400);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('gating', () => {
    it('ignores input while disabled', () => {
      const onLongPress = vi.fn();
      render(<PressTarget options={{ disabled: true, onLongPress }} />);

      fireEvent.pointerDown(screen.getByTestId('target'), { clientX: 0, clientY: 0, pointerId: 1 });
      advance(400);

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('restricts pointer types', () => {
      const onLongPress = vi.fn();
      render(<PressTarget options={{ pointerTypes: ['touch'], onLongPress }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'mouse' });
      advance(400);
      expect(onLongPress).not.toHaveBeenCalled();

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 2, pointerType: 'touch' });
      advance(400);
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('context menu', () => {
    it('suppresses the context menu while pressed', () => {
      render(<PressTarget />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      const prevented = !fireEvent.contextMenu(target);

      expect(prevented).toBe(true);
    });

    it('leaves the context menu alone when not pressed', () => {
      render(<PressTarget />);
      const prevented = !fireEvent.contextMenu(screen.getByTestId('target'));
      expect(prevented).toBe(false);
    });

    it('can be opted out of', () => {
      render(<PressTarget options={{ preventContextMenu: false }} />);
      const target = screen.getByTestId('target');

      fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
      const prevented = !fireEvent.contextMenu(target);

      expect(prevented).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('clears a pending timer on unmount', () => {
      const onLongPress = vi.fn();
      const { unmount } = render(<PressTarget options={{ onLongPress }} />);

      fireEvent.pointerDown(screen.getByTestId('target'), { clientX: 0, clientY: 0, pointerId: 1 });
      unmount();
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });
});
