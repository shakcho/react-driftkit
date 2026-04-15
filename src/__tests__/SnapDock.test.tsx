import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SnapDock } from '../SnapDock';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
});

describe('SnapDock', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <SnapDock>
          <button>Dock item</button>
        </SnapDock>
      );
      expect(screen.getByText('Dock item')).toBeInTheDocument();
    });

    it('applies the base CSS class', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      expect(container.firstElementChild!).toHaveClass('snap-dock');
    });

    it('applies custom className', () => {
      const { container } = render(<SnapDock className="my-dock">Content</SnapDock>);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('snap-dock');
      expect(wrapper).toHaveClass('my-dock');
    });

    it('applies custom style', () => {
      const { container } = render(
        <SnapDock style={{ backgroundColor: 'red' }}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.backgroundColor).toBe('red');
    });

    it('renders with fixed positioning and max z-index', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
      expect(wrapper.style.zIndex).toBe('2147483647');
    });

    it('sets touch-action and user-select to none', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.touchAction).toBe('none');
      expect(wrapper.style.userSelect).toBe('none');
    });

    it('shows grab cursor when draggable', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.cursor).toBe('grab');
    });

    it('omits cursor when not draggable', () => {
      const { container } = render(<SnapDock draggable={false}>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.cursor).toBe('');
    });
  });

  describe('data attributes', () => {
    it('exposes data-edge and data-orientation for left edge', () => {
      const { container } = render(<SnapDock defaultEdge="left">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.getAttribute('data-edge')).toBe('left');
      expect(wrapper.getAttribute('data-orientation')).toBe('vertical');
    });

    it('exposes horizontal orientation for top edge', () => {
      const { container } = render(<SnapDock defaultEdge="top">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.getAttribute('data-edge')).toBe('top');
      expect(wrapper.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('exposes horizontal orientation for bottom edge', () => {
      const { container } = render(<SnapDock defaultEdge="bottom">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('exposes vertical orientation for right edge', () => {
      const { container } = render(<SnapDock defaultEdge="right">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.getAttribute('data-orientation')).toBe('vertical');
    });
  });

  describe('layout orientation', () => {
    it('lays out children in a column on left edge', () => {
      const { container } = render(<SnapDock defaultEdge="left">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.display).toBe('flex');
      expect(wrapper.style.flexDirection).toBe('column');
    });

    it('lays out children in a column on right edge', () => {
      const { container } = render(<SnapDock defaultEdge="right">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.flexDirection).toBe('column');
    });

    it('lays out children in a row on top edge', () => {
      const { container } = render(<SnapDock defaultEdge="top">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.flexDirection).toBe('row');
    });

    it('lays out children in a row on bottom edge', () => {
      const { container } = render(<SnapDock defaultEdge="bottom">Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.flexDirection).toBe('row');
    });

    it('flips orientation after a cross-edge snap drag', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0.5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.flexDirection).toBe('column');

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 384, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 5, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { pointerId: 1 });

      expect(wrapper.getAttribute('data-orientation')).toBe('horizontal');
      expect(wrapper.style.flexDirection).toBe('row');
    });
  });

  describe('orientation flip animation', () => {
    it('applies a transform-origin matching the current edge', () => {
      const { container, rerender } = render(
        <SnapDock defaultEdge="left">Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.transformOrigin).toBe('left center');

      rerender(<SnapDock defaultEdge="right">Content</SnapDock>);
      // defaultEdge only affects initial render — verify by mounting fresh
      const { container: c2 } = render(<SnapDock defaultEdge="bottom">Content</SnapDock>);
      const w2 = c2.firstElementChild! as HTMLElement;
      expect(w2.style.transformOrigin).toBe('center bottom');
    });

    it('sets a FLIP transform after a cross-orientation drag', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0.5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // Patch getBoundingClientRect to report a vertical footprint up to and
      // including the emitEdge "old size" capture, then a horizontal footprint
      // for the layout-effect "new size" read.
      const proto = Object.getPrototypeOf(wrapper) as { getBoundingClientRect: () => DOMRect };
      const original = proto.getBoundingClientRect;
      let calls = 0;
      proto.getBoundingClientRect = function (): DOMRect {
        calls++;
        // Calls 1 (handlePointerDown), 2 (handlePointerUp top), 3 (emitEdge capture) → OLD vertical.
        // Call 4+ (useLayoutEffect FLIP read, etc.) → NEW horizontal.
        if (calls <= 3) {
          return { width: 40, height: 200, left: 0, top: 384, right: 40, bottom: 584, x: 0, y: 384, toJSON: () => ({}) } as DOMRect;
        }
        return { width: 200, height: 40, left: 0, top: 16, right: 200, bottom: 56, x: 0, y: 16, toJSON: () => ({}) } as DOMRect;
      };

      try {
        fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 384, pointerId: 1 });
        fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 5, pointerId: 1 });
        fireEvent.pointerUp(wrapper, { pointerId: 1 });

        expect(wrapper.getAttribute('data-orientation')).toBe('horizontal');
        expect(wrapper.style.transformOrigin).toBe('center top');
        // FLIP set a non-identity scale transform on the wrapper.
        expect(wrapper.style.transform).toMatch(/^scale\(/);
      } finally {
        proto.getBoundingClientRect = original;
      }
    });
  });

  describe('shadow', () => {
    it('does not apply a shadow by default', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.boxShadow).toBe('');
    });

    it('applies a default shadow when shadow is true', () => {
      const { container } = render(<SnapDock shadow>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.boxShadow).not.toBe('');
    });

    it('lets style.boxShadow override the default shadow', () => {
      const { container } = render(
        <SnapDock shadow style={{ boxShadow: '0 0 0 2px red' }}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.boxShadow).toBe('0 0 0 2px red');
    });
  });

  describe('default placement', () => {
    it('places on the left edge at the centered offset', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0.5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      // jsdom width/height are 0, so y = 0.5 * (768 - 0) = 384
      expect(wrapper.style.left).toBe('16px');
      expect(wrapper.style.top).toBe('384px');
    });

    it('places on the right edge', () => {
      const { container } = render(
        <SnapDock defaultEdge="right" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('1008px');
      expect(wrapper.style.top).toBe('0px');
    });

    it('places on the top edge', () => {
      const { container } = render(
        <SnapDock defaultEdge="top" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('0px');
      expect(wrapper.style.top).toBe('16px');
    });

    it('places on the bottom edge', () => {
      const { container } = render(
        <SnapDock defaultEdge="bottom" defaultOffset={1}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('1024px');
      expect(wrapper.style.top).toBe('752px');
    });

    it('clamps offset to [0, 1]', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.top).toBe('768px');
    });

    it('respects custom edgePadding', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0} edgePadding={40}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('40px');
    });

    it('repositions when edgePadding changes live', () => {
      const { container, rerender } = render(
        <SnapDock defaultEdge="left" defaultOffset={0} edgePadding={16}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('16px');

      rerender(
        <SnapDock defaultEdge="left" defaultOffset={0} edgePadding={48}>
          Content
        </SnapDock>
      );
      expect(wrapper.style.left).toBe('48px');
    });
  });

  describe('dragging', () => {
    it('does not start dragging until past 5px threshold', () => {
      const { container } = render(<SnapDock>Content</SnapDock>);
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 52, clientY: 52, pointerId: 1 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');

      fireEvent.pointerMove(wrapper, { clientX: 60, clientY: 60, pointerId: 1 });
      expect(wrapper).toHaveClass('snap-dock--dragging');
      expect(wrapper.style.cursor).toBe('grabbing');
    });

    it('updates position while dragging', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 200, clientY: 300, pointerId: 1 });

      expect(wrapper.style.left).toBe('184px');
      expect(wrapper.style.top).toBe('300px');
    });

    it('does not drag when draggable is false', () => {
      const { container } = render(
        <SnapDock draggable={false} defaultEdge="left" defaultOffset={0}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 200, clientY: 300, pointerId: 1 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
    });

    it('clears drag state when the gesture is cancelled mid-drag', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 200, clientY: 100, pointerId: 1 });
      expect(wrapper).toHaveClass('snap-dock--dragging');

      fireEvent.pointerCancel(wrapper, { pointerId: 1 });

      expect(wrapper).not.toHaveClass('snap-dock--dragging');
      expect(wrapper.style.cursor).toBe('grab');

      fireEvent.pointerMove(wrapper, { clientX: 800, clientY: 400, pointerId: 1 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
    });

    it('does not emit edge/offset changes or snap when the gesture is cancelled', () => {
      const onEdge = vi.fn();
      const onOffset = vi.fn();
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0.5} onEdgeChange={onEdge} onOffsetChange={onOffset}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 384, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 800, clientY: 100, pointerId: 1 });
      fireEvent.pointerCancel(wrapper, { pointerId: 1 });

      // Cancel must not commit the drop: no edge/offset callbacks fire,
      // no snap happens, and data-edge stays at the original.
      expect(onEdge).not.toHaveBeenCalled();
      expect(onOffset).not.toHaveBeenCalled();
      expect(wrapper.getAttribute('data-edge')).toBe('left');
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
    });

    it('picks up fast drags whose first move happens outside the element', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // Press inside the dock, then the first move lands outside — so the
      // element-level onPointerMove never runs. The window listener must
      // pick it up and still cross the drag threshold.
      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });

      const winMove = new Event('pointermove') as Event & {
        pointerId: number;
        clientX: number;
        clientY: number;
      };
      Object.assign(winMove, { pointerId: 1, clientX: 400, clientY: 300 });
      act(() => {
        window.dispatchEvent(winMove);
      });

      expect(wrapper).toHaveClass('snap-dock--dragging');
      // Position should track the drag (drag offset captured at pointerdown
      // was { x: 16, y: 0 } because the wrapper rect is 0x0 in jsdom).
      expect(wrapper.style.left).toBe('384px');
      expect(wrapper.style.top).toBe('300px');
    });

    it('ignores pointer events from a different pointer id', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // First pointer starts the gesture.
      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });

      // A second pointer (e.g. second touch) moves — must be ignored.
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 500, pointerId: 2 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
      expect(wrapper.style.left).toBe('16px');

      // A second pointer up — must not commit anything for pointer 1.
      fireEvent.pointerUp(wrapper, { pointerId: 2 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');

      // The original pointer can still drive the gesture after the intruder.
      fireEvent.pointerMove(wrapper, { clientX: 60, clientY: 60, pointerId: 1 });
      expect(wrapper).toHaveClass('snap-dock--dragging');
    });

    it('clears stale pointer state when the pointer is released outside before drag starts', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // Press, don't move past threshold, then release on the window (outside the element).
      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });

      const winUp = new Event('pointerup') as Event & { pointerId: number };
      (winUp as unknown as { pointerId: number }).pointerId = 1;
      act(() => {
        window.dispatchEvent(winUp);
      });

      // A later move over the wrapper must not start a phantom drag.
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 500, pointerId: 1 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
      expect(wrapper.style.left).toBe('16px');
    });

    it('ignores pointer move without prior pointer down', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 500, pointerId: 1 });
      expect(wrapper).not.toHaveClass('snap-dock--dragging');
      expect(wrapper.style.left).toBe('16px');
    });
  });

  describe('snap behavior', () => {
    it('snaps to the right edge when released near right', () => {
      const onEdge = vi.fn();
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0} onEdgeChange={onEdge}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 1000, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { pointerId: 1 });

      expect(wrapper.style.left).toBe('1008px');
      expect(wrapper.getAttribute('data-edge')).toBe('right');
      expect(onEdge).toHaveBeenCalledWith('right');
    });

    it('snaps to top edge when released near top', () => {
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0.5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 384, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 5, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { pointerId: 1 });

      expect(wrapper.getAttribute('data-edge')).toBe('top');
      expect(wrapper.style.top).toBe('16px');
    });

    it('does not snap when snap is false', () => {
      const { container } = render(
        <SnapDock snap={false} defaultEdge="left" defaultOffset={0}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 300, clientY: 400, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { pointerId: 1 });

      expect(wrapper.style.left).toBe('284px');
      expect(wrapper.style.top).toBe('400px');
    });

    it('fires onOffsetChange after a drag', () => {
      const onOffset = vi.fn();
      const { container } = render(
        <SnapDock defaultEdge="left" defaultOffset={0} onOffsetChange={onOffset}>
          Content
        </SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 16, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 16, clientY: 600, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { pointerId: 1 });

      expect(onOffset).toHaveBeenCalled();
      const last = onOffset.mock.calls[onOffset.mock.calls.length - 1][0];
      expect(last).toBeGreaterThan(0);
      expect(last).toBeLessThanOrEqual(1);
    });
  });

  describe('window resize', () => {
    it('repositions on window resize', () => {
      const { container } = render(
        <SnapDock defaultEdge="right" defaultOffset={0.5}>Content</SnapDock>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'innerHeight', { value: 600 });
      act(() => { window.dispatchEvent(new Event('resize')); });

      expect(wrapper.style.left).toBe('784px');
    });
  });

  describe('cleanup', () => {
    it('removes resize listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<SnapDock>Content</SnapDock>);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
