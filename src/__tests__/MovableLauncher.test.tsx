import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MovableLauncher } from '../MovableLauncher';

beforeEach(() => {
  // Set viewport size
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
});

describe('MovableLauncher', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <MovableLauncher>
          <button>Click me</button>
        </MovableLauncher>
      );
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies the base CSS class', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('movable-launcher');
    });

    it('applies custom className', () => {
      const { container } = render(
        <MovableLauncher className="my-widget">Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('movable-launcher');
      expect(wrapper).toHaveClass('my-widget');
    });

    it('applies custom style', () => {
      const { container } = render(
        <MovableLauncher style={{ backgroundColor: 'red' }}>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.backgroundColor).toBe('red');
    });

    it('renders with fixed positioning', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
    });

    it('sets maximum z-index', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.zIndex).toBe('2147483647');
    });

    it('sets touch-action to none', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.touchAction).toBe('none');
    });

    it('sets user-select to none', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.userSelect).toBe('none');
    });

    it('sets grab cursor when not dragging', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.cursor).toBe('grab');
    });
  });

  describe('default position', () => {
    it('defaults to bottom-right corner', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      // After mount, position should be set via useEffect
      // The element dimensions are 0x0 in jsdom, so bottom-right = (1024-0-16, 768-0-16)
      expect(wrapper.style.left).toBe('1008px');
      expect(wrapper.style.top).toBe('752px');
    });

    it('positions at top-left corner', () => {
      const { container } = render(
        <MovableLauncher defaultPosition="top-left">Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('16px');
      expect(wrapper.style.top).toBe('16px');
    });

    it('positions at top-right corner', () => {
      const { container } = render(
        <MovableLauncher defaultPosition="top-right">Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('1008px');
      expect(wrapper.style.top).toBe('16px');
    });

    it('positions at bottom-left corner', () => {
      const { container } = render(
        <MovableLauncher defaultPosition="bottom-left">Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('16px');
      expect(wrapper.style.top).toBe('752px');
    });

    it('positions at custom x/y coordinates', () => {
      const { container } = render(
        <MovableLauncher defaultPosition={{ x: 100, y: 200 }}>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;
      expect(wrapper.style.left).toBe('100px');
      expect(wrapper.style.top).toBe('200px');
    });
  });

  describe('dragging', () => {
    it('does not start dragging on pointer down alone', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      expect(wrapper).not.toHaveClass('movable-launcher--dragging');
    });

    it('does not start dragging for small movements within threshold', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 52, clientY: 52 });
      expect(wrapper).not.toHaveClass('movable-launcher--dragging');
    });

    it('starts dragging after moving past the 5px threshold', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 60, clientY: 60 });
      expect(wrapper).toHaveClass('movable-launcher--dragging');
    });

    it('sets grabbing cursor while dragging', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 60, clientY: 60 });
      expect(wrapper.style.cursor).toBe('grabbing');
    });

    it('updates position while dragging', () => {
      const { container } = render(
        <MovableLauncher defaultPosition={{ x: 0, y: 0 }}>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 110, clientY: 210 });

      expect(wrapper.style.left).toBe('100px');
      expect(wrapper.style.top).toBe('200px');
    });

    it('stops dragging on pointer up', () => {
      const { container } = render(
        <MovableLauncher>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 60, clientY: 60 });
      expect(wrapper).toHaveClass('movable-launcher--dragging');

      fireEvent.pointerUp(wrapper);
      expect(wrapper).not.toHaveClass('movable-launcher--dragging');
      expect(wrapper.style.cursor).toBe('grab');
    });

    it('ignores pointer move without prior pointer down', () => {
      const { container } = render(
        <MovableLauncher defaultPosition={{ x: 100, y: 100 }}>Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerMove(wrapper, { clientX: 200, clientY: 200 });
      expect(wrapper).not.toHaveClass('movable-launcher--dragging');
      expect(wrapper.style.left).toBe('100px');
      expect(wrapper.style.top).toBe('100px');
    });
  });

  describe('snap to corners', () => {
    it('snaps to nearest corner on pointer up when enabled', () => {
      const { container } = render(
        <MovableLauncher snapToCorners defaultPosition="top-left">
          Content
        </MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // Drag to near top-left area
      fireEvent.pointerDown(wrapper, { clientX: 20, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 30, clientY: 30 });
      fireEvent.pointerUp(wrapper);

      // Should snap to top-left (element is at ~10,10 which is in top-left quadrant)
      expect(wrapper.style.left).toBe('16px');
      expect(wrapper.style.top).toBe('16px');
    });

    it('does not snap when snapToCorners is false', () => {
      const { container } = render(
        <MovableLauncher snapToCorners={false} defaultPosition={{ x: 0, y: 0 }}>
          Content
        </MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      fireEvent.pointerDown(wrapper, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 110, clientY: 210 });
      fireEvent.pointerUp(wrapper);

      // Should stay at drag position
      expect(wrapper.style.left).toBe('100px');
      expect(wrapper.style.top).toBe('200px');
    });
  });

  describe('window resize', () => {
    it('repositions on window resize', () => {
      const { container } = render(
        <MovableLauncher defaultPosition="bottom-right">Content</MovableLauncher>
      );
      const wrapper = container.firstElementChild! as HTMLElement;

      // Simulate viewport shrink
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'innerHeight', { value: 600 });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Position should have been recalculated
      // Exact values depend on element size (0 in jsdom), so just check it changed
      const left = parseInt(wrapper.style.left);
      const top = parseInt(wrapper.style.top);
      expect(left).toBeLessThanOrEqual(800);
      expect(top).toBeLessThanOrEqual(600);
    });
  });

  describe('cleanup', () => {
    it('removes resize listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(
        <MovableLauncher>Content</MovableLauncher>
      );

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
