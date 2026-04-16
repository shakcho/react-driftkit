import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { PinnableTooltip } from '../PinnableTooltip';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
});

function mockAnchorRect(el: Element, rect: Partial<DOMRect>) {
  const full: DOMRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect;
  (el as HTMLElement).getBoundingClientRect = () => full;
}

function mockTooltipSize(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height });
}

function getTip(container: HTMLElement) {
  return container.querySelector('.pinnable-tooltip') as HTMLElement | null;
}

describe('PinnableTooltip', () => {
  describe('rendering', () => {
    it('always renders the anchor child', () => {
      render(
        <PinnableTooltip content="Hi">
          <button>Target</button>
        </PinnableTooltip>,
      );
      expect(screen.getByText('Target')).toBeInTheDocument();
    });

    it('does not render tooltip when closed', () => {
      const { container } = render(
        <PinnableTooltip content="Hi">
          <button>Target</button>
        </PinnableTooltip>,
      );
      expect(getTip(container)).toBeNull();
    });

    it('renders tooltip when open (controlled)', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open>
          <button>Target</button>
        </PinnableTooltip>,
      );
      expect(getTip(container)).not.toBeNull();
      expect(getTip(container)!.textContent).toBe('Hi');
    });

    it('applies the base CSS class and tooltipClassName', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open tooltipClassName="extra">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      expect(tip).toHaveClass('pinnable-tooltip');
      expect(tip).toHaveClass('extra');
    });

    it('renders with fixed positioning and max z-index', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open>
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      expect(tip.style.position).toBe('fixed');
      expect(tip.style.zIndex).toBe('2147483647');
    });

    it('exposes data-placement attribute', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open placement="bottom">
          <button>Target</button>
        </PinnableTooltip>,
      );
      expect(getTip(container)!.getAttribute('data-placement')).toBe('bottom');
    });
  });

  describe('triggers', () => {
    it('opens on hover and closes on leave', () => {
      const { container } = render(
        <PinnableTooltip content="Hi">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const target = container.querySelector('button')!;
      fireEvent.pointerEnter(target);
      expect(getTip(container)).not.toBeNull();
      fireEvent.pointerLeave(target);
      expect(getTip(container)).toBeNull();
    });

    it('opens on focus and closes on blur', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="focus">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const target = container.querySelector('button')!;
      fireEvent.focusIn(target);
      expect(getTip(container)).not.toBeNull();
      fireEvent.focusOut(target);
      expect(getTip(container)).toBeNull();
    });

    it('toggles on click', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="click">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const target = container.querySelector('button')!;
      fireEvent.click(target);
      expect(getTip(container)).not.toBeNull();
      fireEvent.click(target);
      expect(getTip(container)).toBeNull();
    });

    it('manual trigger ignores hover', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual">
          <button>Target</button>
        </PinnableTooltip>,
      );
      fireEvent.pointerEnter(container.querySelector('button')!);
      expect(getTip(container)).toBeNull();
    });

    it('leaving the anchor does not close when pinned', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" defaultPinned defaultPinPosition={{ x: 100, y: 100 }}>
          <button>Target</button>
        </PinnableTooltip>,
      );
      fireEvent.pointerLeave(container.querySelector('button')!);
      expect(getTip(container)).not.toBeNull();
    });
  });

  describe('placement', () => {
    it('places tooltip above anchor for top placement', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open placement="top" offset={8}>
          <button>Target</button>
        </PinnableTooltip>,
      );
      const anchor = container.querySelector('button')!;
      mockAnchorRect(anchor, { left: 500, top: 400, width: 100, height: 40, right: 600, bottom: 440 });
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      act(() => {
        fireEvent(window, new Event('resize'));
      });
      expect(tip.style.left).toBe('510px');
      expect(tip.style.top).toBe('362px');
    });

    it('clamps to viewport when anchor is near an edge', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open placement="top">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const anchor = container.querySelector('button')!;
      mockAnchorRect(anchor, { left: -50, top: 2, width: 40, height: 20, right: -10, bottom: 22 });
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      act(() => {
        fireEvent(window, new Event('resize'));
      });
      expect(parseInt(tip.style.left)).toBeGreaterThanOrEqual(4);
      expect(parseInt(tip.style.top)).toBeGreaterThanOrEqual(4);
    });
  });

  describe('tear-off', () => {
    it('pins on drag past threshold', () => {
      const onPinned = vi.fn();
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open onPinnedChange={onPinned}>
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      fireEvent.pointerDown(tip, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 12, clientY: 12 });
      expect(onPinned).not.toHaveBeenCalled();
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 50, clientY: 50 });
      expect(onPinned).toHaveBeenCalledWith(
        true,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      );
      fireEvent.pointerUp(tip, { pointerId: 1, clientX: 50, clientY: 50 });
    });

    it('updates position while dragging after pin', () => {
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open>
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      fireEvent.pointerDown(tip, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 200, clientY: 150 });
      fireEvent.pointerUp(tip, { pointerId: 1, clientX: 200, clientY: 150 });
      // drag started at (10,10) inside a 0-origin rect, so pointer offset is (10,10).
      // Final pointer at (200,150) → position (190, 140).
      expect(tip.style.left).toBe('190px');
      expect(tip.style.top).toBe('140px');
    });

    it('remains open after tear-off even when anchor leave fires', () => {
      const { container } = render(
        <PinnableTooltip content="Hi">
          <button>Target</button>
        </PinnableTooltip>,
      );
      const target = container.querySelector('button')!;
      fireEvent.pointerEnter(target);
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      fireEvent.pointerDown(tip, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(tip, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerLeave(target);
      expect(getTip(container)).not.toBeNull();
    });

    it('ignores pointerId mismatch', () => {
      const onPinned = vi.fn();
      const { container } = render(
        <PinnableTooltip content="Hi" trigger="manual" open onPinnedChange={onPinned}>
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      fireEvent.pointerDown(tip, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(tip, { pointerId: 2, clientX: 100, clientY: 100 });
      expect(onPinned).not.toHaveBeenCalled();
    });
  });

  describe('controlled mode', () => {
    it('does not mutate pinned state when controlled', () => {
      const onPinned = vi.fn();
      const { container } = render(
        <PinnableTooltip
          content="Hi"
          trigger="manual"
          open
          pinned={false}
          onPinnedChange={onPinned}
        >
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      mockTooltipSize(tip, 80, 30);
      fireEvent.pointerDown(tip, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(tip, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(tip, { pointerId: 1, clientX: 100, clientY: 100 });
      expect(onPinned).toHaveBeenCalled();
      expect(tip.getAttribute('data-pinned')).toBeNull();
    });

    it('reflects controlled pinPosition', () => {
      const { container } = render(
        <PinnableTooltip
          content="Hi"
          trigger="manual"
          open
          pinned
          pinPosition={{ x: 321, y: 123 }}
        >
          <button>Target</button>
        </PinnableTooltip>,
      );
      const tip = getTip(container)!;
      expect(tip.style.left).toBe('321px');
      expect(tip.style.top).toBe('123px');
    });
  });

  describe('content render prop', () => {
    it('passes pin state and unpin callback', () => {
      function Harness() {
        const [pinned, setPinned] = useState(true);
        return (
          <PinnableTooltip
            trigger="manual"
            open
            pinned={pinned}
            defaultPinPosition={{ x: 10, y: 10 }}
            onPinnedChange={(next) => setPinned(next)}
            content={({ pinned: isPinned, unpin }) => (
              <div>
                <span>{isPinned ? 'pinned' : 'floating'}</span>
                <button onClick={unpin}>unpin</button>
              </div>
            )}
          >
            <button>Target</button>
          </PinnableTooltip>
        );
      }
      render(<Harness />);
      expect(screen.getByText('pinned')).toBeInTheDocument();
      fireEvent.click(screen.getByText('unpin'));
      expect(screen.getByText('floating')).toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    it('removes window listeners on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(
        <PinnableTooltip content="Hi" trigger="manual" open>
          <button>Target</button>
        </PinnableTooltip>,
      );
      unmount();
      const removed = removeSpy.mock.calls.map((c) => c[0]);
      expect(removed).toContain('pointermove');
      expect(removed).toContain('pointerup');
      expect(removed).toContain('pointercancel');
      removeSpy.mockRestore();
    });
  });
});
