import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DraggableSheet } from '../DraggableSheet';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
});

function getWrapper(container: HTMLElement): HTMLElement {
  return container.firstElementChild! as HTMLElement;
}

describe('DraggableSheet', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <DraggableSheet>
          <div>Sheet body</div>
        </DraggableSheet>,
      );
      expect(screen.getByText('Sheet body')).toBeInTheDocument();
    });

    it('applies base and custom className', () => {
      const { container } = render(
        <DraggableSheet className="my-sheet">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper).toHaveClass('draggable-sheet');
      expect(wrapper).toHaveClass('my-sheet');
    });

    it('applies custom style over defaults', () => {
      const { container } = render(
        <DraggableSheet style={{ backgroundColor: 'red' }}>x</DraggableSheet>,
      );
      expect(getWrapper(container).style.backgroundColor).toBe('red');
    });

    it('renders with fixed positioning and max z-index', () => {
      const { container } = render(<DraggableSheet>x</DraggableSheet>);
      const wrapper = getWrapper(container);
      expect(wrapper.style.position).toBe('fixed');
      expect(wrapper.style.zIndex).toBe('2147483647');
    });

    it('sets touch-action and user-select to none', () => {
      const { container } = render(<DraggableSheet>x</DraggableSheet>);
      const wrapper = getWrapper(container);
      expect(wrapper.style.touchAction).toBe('none');
      expect(wrapper.style.userSelect).toBe('none');
    });
  });

  describe('data attributes', () => {
    it('exposes data-edge, data-snap, and omits data-dragging at rest', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.getAttribute('data-edge')).toBe('bottom');
      expect(wrapper.getAttribute('data-snap')).toBe('half');
      expect(wrapper.hasAttribute('data-dragging')).toBe(false);
    });

    it('reflects numeric snap as a stringified data attribute', () => {
      const { container } = render(
        <DraggableSheet snapPoints={[120, 400]} defaultSnap={120}>x</DraggableSheet>,
      );
      expect(getWrapper(container).getAttribute('data-snap')).toBe('120');
    });

    it('reflects percentage snap as its literal string', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['closed', '40%']} defaultSnap="40%">x</DraggableSheet>,
      );
      expect(getWrapper(container).getAttribute('data-snap')).toBe('40%');
    });
  });

  describe('default placement', () => {
    it('pins bottom edge and resolves half to 50% of viewport height', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.bottom).toBe('0px');
      expect(wrapper.style.left).toBe('0px');
      expect(wrapper.style.right).toBe('0px');
      expect(wrapper.style.height).toBe('400px');
    });

    it('resolves peek to 96px', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="peek">x</DraggableSheet>,
      );
      expect(getWrapper(container).style.height).toBe('96px');
    });

    it('resolves full to 92% of viewport height', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="full">x</DraggableSheet>,
      );
      expect(getWrapper(container).style.height).toBe('736px');
    });

    it('resolves numeric snap as raw pixels', () => {
      const { container } = render(
        <DraggableSheet snapPoints={[200, 600]} defaultSnap={200}>x</DraggableSheet>,
      );
      expect(getWrapper(container).style.height).toBe('200px');
    });

    it('resolves percentage snap against viewport height on bottom edge', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['25%', '75%']} defaultSnap="25%">x</DraggableSheet>,
      );
      expect(getWrapper(container).style.height).toBe('200px');
    });

    it('defaults to the middle of snapPoints when defaultSnap is omitted', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half', 'full']}>x</DraggableSheet>,
      );
      expect(getWrapper(container).getAttribute('data-snap')).toBe('half');
    });
  });

  describe('edge variants', () => {
    it('pins top edge with height', () => {
      const { container } = render(
        <DraggableSheet edge="top" defaultSnap="peek">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.top).toBe('0px');
      expect(wrapper.style.height).toBe('96px');
    });

    it('pins left edge with width using viewport width axis', () => {
      const { container } = render(
        <DraggableSheet edge="left" defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.left).toBe('0px');
      expect(wrapper.style.width).toBe('512px');
    });

    it('pins right edge with width', () => {
      const { container } = render(
        <DraggableSheet edge="right" defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.right).toBe('0px');
      expect(wrapper.style.width).toBe('512px');
    });
  });

  describe('dragging', () => {
    it('sets data-dragging when the drag threshold is crossed', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 390, pointerId: 1 });
      expect(wrapper.hasAttribute('data-dragging')).toBe(true);
    });

    it('does not cross drag threshold for tiny movements', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 502, clientY: 402, pointerId: 1 });
      expect(wrapper.hasAttribute('data-dragging')).toBe(false);
    });

    it('grows height when dragged up on bottom edge', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 300, pointerId: 1 });
      expect(wrapper.style.height).toBe('500px');
    });

    it('shrinks height when dragged down on bottom edge', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 500, pointerId: 1 });
      expect(wrapper.style.height).toBe('300px');
    });

    it('clamps size to zero when dragged past the opposite edge', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half']} defaultSnap="peek">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 700, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 5000, pointerId: 1 });
      expect(wrapper.style.height).toBe('0px');
    });

    it('clamps size to viewport when dragged far past full', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'full']} defaultSnap="full">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: -5000, pointerId: 1 });
      expect(wrapper.style.height).toBe('800px');
    });

    it('ignores drag when draggable is false', () => {
      const { container } = render(
        <DraggableSheet draggable={false} defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 200, pointerId: 1 });
      expect(wrapper.hasAttribute('data-dragging')).toBe(false);
      expect(wrapper.style.height).toBe('400px');
    });
  });

  describe('snap on release', () => {
    it('snaps to nearest point on release', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snapPoints={['peek', 'half', 'full']}
          defaultSnap="half"
          onSnapChange={onSnapChange}
        >x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      // Drag upward to ~650px then release — nearest to 'full' (736)
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 150, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 150, pointerId: 1 });
      expect(wrapper.style.height).toBe('736px');
      expect(wrapper.getAttribute('data-snap')).toBe('full');
      expect(onSnapChange).toHaveBeenCalledWith('full', 736);
    });

    it('snaps to nearest smaller stop when dragged down slightly', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snapPoints={['peek', 'half', 'full']}
          defaultSnap="half"
          onSnapChange={onSnapChange}
        >x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      // height 400 → move down by 300 → 100 → nearest to peek(96)
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 700, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 700, pointerId: 1 });
      expect(wrapper.getAttribute('data-snap')).toBe('peek');
      expect(onSnapChange).toHaveBeenLastCalledWith('peek', 96);
    });

    it('returns the original SnapPoint value for numeric stops', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet snapPoints={[120, 400, 700]} defaultSnap={400} onSnapChange={onSnapChange}>x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 100, pointerId: 1 });
      expect(onSnapChange).toHaveBeenLastCalledWith(700, 700);
    });

    it('sorts snapPoints internally so out-of-order input still snaps correctly', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snapPoints={['full', 'peek', 'half']}
          defaultSnap="half"
          onSnapChange={onSnapChange}
        >x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 700, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 700, pointerId: 1 });
      expect(onSnapChange).toHaveBeenLastCalledWith('peek', 96);
    });
  });

  describe('controlled mode', () => {
    it('reflects controlled snap prop changes into size', () => {
      const { container, rerender } = render(
        <DraggableSheet snap="peek" snapPoints={['peek', 'half', 'full']}>x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.height).toBe('96px');
      rerender(
        <DraggableSheet snap="full" snapPoints={['peek', 'half', 'full']}>x</DraggableSheet>,
      );
      expect(wrapper.style.height).toBe('736px');
      expect(wrapper.getAttribute('data-snap')).toBe('full');
    });

    it('does not mutate controlled state on release — parent drives updates', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snap="half"
          snapPoints={['peek', 'half', 'full']}
          onSnapChange={onSnapChange}
        >x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 100, pointerId: 1 });
      expect(onSnapChange).toHaveBeenCalledWith('full', 736);
      // Parent hasn't updated `snap` — local data-snap remains the prop value.
      expect(wrapper.getAttribute('data-snap')).toBe('half');
    });
  });

  describe('drag handle selector', () => {
    it('only begins a drag when pointerdown originates in the handle', () => {
      const { container } = render(
        <DraggableSheet dragHandleSelector="[data-handle]" defaultSnap="half">
          <div data-handle>handle</div>
          <div data-testid="body">body</div>
        </DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      const body = screen.getByTestId('body');
      fireEvent.pointerDown(body, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 200, pointerId: 1 });
      expect(wrapper.hasAttribute('data-dragging')).toBe(false);
    });

    it('begins a drag when pointerdown originates in the handle', () => {
      const { container } = render(
        <DraggableSheet dragHandleSelector="[data-handle]" defaultSnap="half">
          <div data-handle>handle</div>
        </DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      const handle = container.querySelector('[data-handle]') as HTMLElement;
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 300, pointerId: 1 });
      expect(wrapper.hasAttribute('data-dragging')).toBe(true);
    });
  });

  describe('pointer lifecycle', () => {
    it('ignores pointerMove with a non-matching pointerId', () => {
      const { container } = render(
        <DraggableSheet defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 100, pointerId: 2 });
      expect(wrapper.style.height).toBe('400px');
      expect(wrapper.hasAttribute('data-dragging')).toBe(false);
    });

    it('restores size to last committed snap on pointercancel mid-drag', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snapPoints={['peek', 'half', 'full']}
          defaultSnap="half"
          onSnapChange={onSnapChange}
        >x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(wrapper, { clientX: 500, clientY: 150, pointerId: 1 });
      fireEvent.pointerCancel(wrapper, { clientX: 500, clientY: 150, pointerId: 1 });
      expect(wrapper.style.height).toBe('400px');
      expect(wrapper.getAttribute('data-snap')).toBe('half');
      expect(onSnapChange).not.toHaveBeenCalled();
    });
  });

  describe('closeOnOutsideClick', () => {
    it('closes the sheet when a pointerdown fires outside it', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <div>
          <div data-testid="outside" style={{ width: 100, height: 100 }}>outside</div>
          <DraggableSheet
            snapPoints={['closed', 'peek', 'half', 'full']}
            defaultSnap="half"
            closeOnOutsideClick
            onSnapChange={onSnapChange}
          >
            inside
          </DraggableSheet>
        </div>,
      );
      const wrapper = container.querySelector('.draggable-sheet') as HTMLElement;
      expect(wrapper.style.height).toBe('400px');
      const outside = container.querySelector('[data-testid="outside"]') as HTMLElement;
      fireEvent.pointerDown(outside, { clientX: 10, clientY: 10, pointerId: 1 });
      expect(wrapper.style.height).toBe('0px');
      expect(wrapper.getAttribute('data-snap')).toBe('closed');
      expect(onSnapChange).toHaveBeenCalledWith('closed', 0);
    });

    it('does not close when pointerdown is inside the sheet', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <DraggableSheet
          snapPoints={['closed', 'peek', 'half', 'full']}
          defaultSnap="half"
          closeOnOutsideClick
          onSnapChange={onSnapChange}
        >
          <div data-testid="inner">inside</div>
        </DraggableSheet>,
      );
      const wrapper = container.querySelector('.draggable-sheet') as HTMLElement;
      const inner = screen.getByTestId('inner');
      fireEvent.pointerDown(inner, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerUp(inner, { clientX: 500, clientY: 400, pointerId: 1 });
      expect(wrapper.style.height).toBe('400px');
      expect(onSnapChange).not.toHaveBeenCalled();
    });

    it('does nothing when the sheet is already closed', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <div>
          <div data-testid="outside">outside</div>
          <DraggableSheet
            snapPoints={['closed', 'half']}
            defaultSnap="closed"
            closeOnOutsideClick
            onSnapChange={onSnapChange}
          >
            inside
          </DraggableSheet>
        </div>,
      );
      fireEvent.pointerDown(container.querySelector('[data-testid="outside"]') as HTMLElement, { clientX: 10, clientY: 10, pointerId: 1 });
      expect(onSnapChange).not.toHaveBeenCalled();
    });

    it('fires onSnapChange without mutating local state in controlled mode', () => {
      const onSnapChange = vi.fn();
      const { container } = render(
        <div>
          <div data-testid="outside">outside</div>
          <DraggableSheet
            snap="half"
            snapPoints={['closed', 'half', 'full']}
            closeOnOutsideClick
            onSnapChange={onSnapChange}
          >
            inside
          </DraggableSheet>
        </div>,
      );
      const wrapper = container.querySelector('.draggable-sheet') as HTMLElement;
      fireEvent.pointerDown(container.querySelector('[data-testid="outside"]') as HTMLElement, { clientX: 10, clientY: 10, pointerId: 1 });
      expect(onSnapChange).toHaveBeenCalledWith('closed', 0);
      expect(wrapper.getAttribute('data-snap')).toBe('half');
    });
  });

  describe('resize', () => {
    it('re-resolves percentage snap against new viewport on resize', () => {
      const { container } = render(
        <DraggableSheet snapPoints={['peek', 'half', 'full']} defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.height).toBe('400px');
      act(() => {
        Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
        window.dispatchEvent(new Event('resize'));
      });
      expect(wrapper.style.height).toBe('500px');
    });

    it('re-resolves on edge change', () => {
      const { container, rerender } = render(
        <DraggableSheet edge="bottom" defaultSnap="half">x</DraggableSheet>,
      );
      const wrapper = getWrapper(container);
      expect(wrapper.style.height).toBe('400px');
      rerender(<DraggableSheet edge="left" defaultSnap="half">x</DraggableSheet>);
      expect(wrapper.style.width).toBe('512px');
    });
  });

  describe('cleanup', () => {
    it('removes window pointer listeners after release', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { container } = render(<DraggableSheet defaultSnap="half">x</DraggableSheet>);
      const wrapper = getWrapper(container);
      fireEvent.pointerDown(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      fireEvent.pointerUp(wrapper, { clientX: 500, clientY: 400, pointerId: 1 });
      const added = addSpy.mock.calls.filter(([type]) => type === 'pointermove' || type === 'pointerup' || type === 'pointercancel').length;
      const removed = removeSpy.mock.calls.filter(([type]) => type === 'pointermove' || type === 'pointerup' || type === 'pointercancel').length;
      expect(removed).toBeGreaterThanOrEqual(added);
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
