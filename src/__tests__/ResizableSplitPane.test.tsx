import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizableSplitPane } from '../ResizableSplitPane';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
  localStorage.clear();
});

function getContainer(el: HTMLElement): HTMLElement {
  return el.firstElementChild! as HTMLElement;
}

function getHandles(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.resizable-split-pane__handle'));
}

function getPanes(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.resizable-split-pane__pane'));
}

function mockContainerRect(el: HTMLElement, rect: Partial<DOMRect>) {
  const container = getContainer(el);
  container.getBoundingClientRect = () => ({
    x: 0, y: 0, width: 0, height: 0,
    top: 0, left: 0, bottom: 0, right: 0,
    toJSON: () => {},
    ...rect,
  } as DOMRect);
}

describe('ResizableSplitPane', () => {
  describe('rendering', () => {
    it('renders all children as panes', () => {
      render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('renders N-1 handles for N panes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))).toHaveLength(2);
    });

    it('renders 1 handle for 2 panes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))).toHaveLength(1);
    });

    it('applies base and custom className', () => {
      const { container } = render(
        <ResizableSplitPane className="my-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const wrapper = getContainer(container);
      expect(wrapper).toHaveClass('resizable-split-pane');
      expect(wrapper).toHaveClass('my-split');
    });

    it('applies custom style', () => {
      const { container } = render(
        <ResizableSplitPane style={{ backgroundColor: 'blue' }}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getContainer(container).style.backgroundColor).toBe('blue');
    });

    it('renders as a flex row for horizontal', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getContainer(container).style.flexDirection).toBe('row');
    });

    it('renders as a flex column for vertical', () => {
      const { container } = render(
        <ResizableSplitPane orientation="vertical">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getContainer(container).style.flexDirection).toBe('column');
    });
  });

  describe('data attributes', () => {
    it('exposes data-orientation and omits data-dragging at rest', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const wrapper = getContainer(container);
      expect(wrapper).toHaveAttribute('data-orientation', 'horizontal');
      expect(wrapper).not.toHaveAttribute('data-dragging');
    });

    it('panes have data-pane index attributes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0]).toHaveAttribute('data-pane', '0');
      expect(panes[1]).toHaveAttribute('data-pane', '1');
      expect(panes[2]).toHaveAttribute('data-pane', '2');
    });

    it('handles have data-handle index attributes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      const handles = getHandles(getContainer(container));
      expect(handles[0]).toHaveAttribute('data-handle', '0');
      expect(handles[1]).toHaveAttribute('data-handle', '1');
    });
  });

  describe('handle', () => {
    it('has correct default size', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const handles = getHandles(getContainer(container));
      expect(handles[0].style.width).toBe('8px');
    });

    it('uses custom handleSize', () => {
      const { container } = render(
        <ResizableSplitPane handleSize={12}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))[0].style.width).toBe('12px');
    });

    it('has col-resize cursor for horizontal', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))[0].style.cursor).toBe('col-resize');
    });

    it('has row-resize cursor for vertical', () => {
      const { container } = render(
        <ResizableSplitPane orientation="vertical">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))[0].style.cursor).toBe('row-resize');
    });

    it('has default cursor when draggable=false', () => {
      const { container } = render(
        <ResizableSplitPane draggable={false}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      expect(getHandles(getContainer(container))[0].style.cursor).toBe('default');
    });
  });

  describe('handle render prop', () => {
    it('calls handle render prop for each boundary', () => {
      const handleFn = vi.fn(() => <span>grip</span>);
      const { container } = render(
        <ResizableSplitPane handle={handleFn}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      expect(handleFn).toHaveBeenCalledTimes(2);
      expect(handleFn).toHaveBeenCalledWith({ index: 0, isDragging: false, orientation: 'horizontal' });
      expect(handleFn).toHaveBeenCalledWith({ index: 1, isDragging: false, orientation: 'horizontal' });
      // Rendered content appears in the DOM.
      const grips = container.querySelectorAll('span');
      expect(grips).toHaveLength(2);
    });

    it('passes isDragging=true to the active handle during drag', () => {
      const handleFn = vi.fn(({ isDragging }: { isDragging: boolean }) => (
        <span>{isDragging ? 'dragging' : 'idle'}</span>
      ));
      const { container } = render(
        <ResizableSplitPane handle={handleFn}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handles = getHandles(getContainer(container));
      fireEvent.pointerDown(handles[0], { clientX: 333, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handles[0], { clientX: 350, clientY: 300, pointerId: 1 });

      // After re-render, handle 0 should have isDragging=true.
      const lastCalls = handleFn.mock.calls.slice(-2) as Array<[{ index: number; isDragging: boolean }]>;
      const handle0Call = lastCalls.find((c) => c[0].index === 0);
      expect(handle0Call?.[0].isDragging).toBe(true);

      fireEvent.pointerUp(handles[0], { clientX: 350, clientY: 300, pointerId: 1 });
    });
  });

  describe('pane sizing', () => {
    it('defaults to equal split for 2 panes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      // 2 panes, 1 handle of 8px. handleSpacePerPane = 8/2 = 4px.
      expect(panes[0].style.width).toBe('calc(50% - 4px)');
      expect(panes[1].style.width).toBe('calc(50% - 4px)');
    });

    it('defaults to equal split for 3 panes', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      // All 3 panes should have the same width
      expect(panes[0].style.width).toBe(panes[1].style.width);
      expect(panes[1].style.width).toBe(panes[2].style.width);
      // Should contain ~33.33%
      expect(panes[0].style.width).toMatch(/^calc\(33\.333/);
    });

    it('respects defaultSizes', () => {
      const { container } = render(
        <ResizableSplitPane defaultSizes={[0.3, 0.7]}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(30% - 4px)');
      expect(panes[1].style.width).toBe('calc(70% - 4px)');
    });

    it('respects defaultSizes for 3 panes', () => {
      const { container } = render(
        <ResizableSplitPane defaultSizes={[0.25, 0.5, 0.25]}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toMatch(/^calc\(25%/);
      expect(panes[1].style.width).toMatch(/^calc\(50%/);
      expect(panes[2].style.width).toMatch(/^calc\(25%/);
      // Pane 0 and 2 should be same size
      expect(panes[0].style.width).toBe(panes[2].style.width);
    });

    it('uses height for vertical orientation', () => {
      const { container } = render(
        <ResizableSplitPane orientation="vertical" defaultSizes={[0.4, 0.6]}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.height).toBe('calc(40% - 4px)');
      expect(panes[1].style.height).toBe('calc(60% - 4px)');
    });
  });

  describe('dragging', () => {
    it('updates sizes on drag of first handle', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 510, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 600, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 600, clientY: 300, pointerId: 1 });

      expect(onSizesChange).toHaveBeenCalledTimes(1);
      const sizes = onSizesChange.mock.calls[0][0];
      expect(sizes).toHaveLength(2);
      // Moved 100px right on 992px available (1000 - 8 handle)
      expect(sizes[0]).toBeCloseTo(0.5 + 100 / 992, 2);
      expect(sizes[1]).toBeCloseTo(0.5 - 100 / 992, 2);
    });

    it('dragging middle handle in 3-pane only affects adjacent panes', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane defaultSizes={[0.25, 0.5, 0.25]} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      // Handle index 1 = between pane 1 and pane 2
      const handles = getHandles(getContainer(container));
      fireEvent.pointerDown(handles[1], { clientX: 700, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handles[1], { clientX: 710, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handles[1], { clientX: 800, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handles[1], { clientX: 800, clientY: 300, pointerId: 1 });

      expect(onSizesChange).toHaveBeenCalledTimes(1);
      const sizes = onSizesChange.mock.calls[0][0];
      // Pane 0 should be unchanged
      expect(sizes[0]).toBeCloseTo(0.25, 4);
      // Pane 1 grew, pane 2 shrank
      expect(sizes[1]).toBeGreaterThan(0.5);
      expect(sizes[2]).toBeLessThan(0.25);
      // Sum should still be 1
      expect(sizes[0] + sizes[1] + sizes[2]).toBeCloseTo(1, 4);
    });

    it('sets data-dragging during drag', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const wrapper = getContainer(container);
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(wrapper)[0];
      expect(wrapper).not.toHaveAttribute('data-dragging');

      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 520, clientY: 300, pointerId: 1 });
      expect(wrapper).toHaveAttribute('data-dragging');

      fireEvent.pointerUp(handle, { clientX: 520, clientY: 300, pointerId: 1 });
      expect(wrapper).not.toHaveAttribute('data-dragging');
    });

    it('sets data-dragging on the specific handle being dragged', () => {
      const { container } = render(
        <ResizableSplitPane>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handles = getHandles(getContainer(container));
      fireEvent.pointerDown(handles[0], { clientX: 333, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handles[0], { clientX: 350, clientY: 300, pointerId: 1 });

      // Re-query after re-render
      const updatedHandles = getHandles(getContainer(container));
      expect(updatedHandles[0]).toHaveAttribute('data-dragging');
      expect(updatedHandles[1]).not.toHaveAttribute('data-dragging');

      fireEvent.pointerUp(handles[0], { clientX: 350, clientY: 300, pointerId: 1 });
    });

    it('fires onDrag continuously during drag', () => {
      const onDrag = vi.fn();
      const { container } = render(
        <ResizableSplitPane onDrag={onDrag}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 510, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 520, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 530, clientY: 300, pointerId: 1 });

      expect(onDrag.mock.calls.length).toBeGreaterThanOrEqual(2);
      // Each call should return an array
      expect(onDrag.mock.calls[0][0]).toHaveLength(2);
    });

    it('does not drag when draggable=false', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane draggable={false} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 600, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 600, clientY: 300, pointerId: 1 });

      expect(onSizesChange).not.toHaveBeenCalled();
    });

    it('respects drag threshold', () => {
      const onDrag = vi.fn();
      const { container } = render(
        <ResizableSplitPane onDrag={onDrag}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 502, clientY: 300, pointerId: 1 });

      expect(onDrag).not.toHaveBeenCalled();
    });

    it('drags vertically for vertical orientation', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane orientation="vertical" onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 600, height: 1000 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 300, clientY: 500, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 300, clientY: 510, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 300, clientY: 600, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 300, clientY: 600, pointerId: 1 });

      expect(onSizesChange).toHaveBeenCalledTimes(1);
      const sizes = onSizesChange.mock.calls[0][0];
      expect(sizes[0]).toBeCloseTo(0.5 + 100 / 992, 2);
    });
  });

  describe('min/max constraints', () => {
    it('clamps sizes to respect minSize', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane minSize={200} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 10, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 10, clientY: 300, pointerId: 1 });

      const sizes = onSizesChange.mock.calls[0][0];
      // minSize 200 on 992 available
      expect(sizes[0]).toBeGreaterThanOrEqual(200 / 992 - 0.01);
    });

    it('clamps sizes to respect maxSize', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane maxSize={600} defaultSizes={[0.5, 0.5]} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      // Try to drag all the way right — pane A should cap at 600px
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 990, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 990, clientY: 300, pointerId: 1 });

      const sizes = onSizesChange.mock.calls[0][0];
      // maxSize 600 on 992 available means max ratio ≈ 0.6048
      expect(sizes[0]).toBeLessThanOrEqual(600 / 992 + 0.01);
      expect(sizes[0]).toBeGreaterThan(0.5);
    });
  });

  describe('controlled mode', () => {
    it('respects controlled sizes prop', () => {
      const { container } = render(
        <ResizableSplitPane sizes={[0.7, 0.3]}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(70% - 4px)');
    });

    it('updates when controlled sizes change', () => {
      const { container, rerender } = render(
        <ResizableSplitPane sizes={[0.3, 0.7]}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      rerender(
        <ResizableSplitPane sizes={[0.6, 0.4]}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(60% - 4px)');
    });

    it('works controlled with 3 panes', () => {
      const { container } = render(
        <ResizableSplitPane sizes={[0.2, 0.5, 0.3]}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toMatch(/^calc\(20%/);
      expect(panes[1].style.width).toMatch(/^calc\(50%/);
      expect(panes[2].style.width).toMatch(/^calc\(30%/);
    });
  });

  describe('persistence', () => {
    it('persists sizes to localStorage on drag release', () => {
      const { container } = render(
        <ResizableSplitPane persistKey="test-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 510, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 600, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 600, clientY: 300, pointerId: 1 });

      const stored = localStorage.getItem('test-split');
      expect(stored).not.toBeNull();
      const arr = JSON.parse(stored!);
      expect(arr).toHaveLength(2);
      expect(arr[0]).toBeGreaterThan(0.5);
    });

    it('restores sizes from localStorage on mount', () => {
      localStorage.setItem('test-split', JSON.stringify([0.7, 0.3]));
      const { container } = render(
        <ResizableSplitPane persistKey="test-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(70% - 4px)');
    });

    it('ignores invalid localStorage values', () => {
      localStorage.setItem('test-split', 'garbage');
      const { container } = render(
        <ResizableSplitPane persistKey="test-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(50% - 4px)');
    });

    it('ignores localStorage with wrong pane count', () => {
      localStorage.setItem('test-split', JSON.stringify([0.33, 0.33, 0.34]));
      const { container } = render(
        <ResizableSplitPane persistKey="test-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      const panes = getPanes(getContainer(container));
      expect(panes[0].style.width).toBe('calc(50% - 4px)');
    });

    it('does not persist in controlled mode', () => {
      const { container } = render(
        <ResizableSplitPane sizes={[0.5, 0.5]} persistKey="test-split">
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );
      mockContainerRect(container, { left: 0, top: 0, width: 1000, height: 600 });

      const handle = getHandles(getContainer(container))[0];
      fireEvent.pointerDown(handle, { clientX: 500, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 510, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 600, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 600, clientY: 300, pointerId: 1 });

      expect(localStorage.getItem('test-split')).toBeNull();
    });
  });

  describe('double-click reset', () => {
    it('resets to defaultSizes on double-click', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane defaultSizes={[0.5, 0.5]} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );

      const handle = getHandles(getContainer(container))[0];
      fireEvent.doubleClick(handle);

      expect(onSizesChange).toHaveBeenCalledWith([0.5, 0.5]);
    });

    it('resets to equal split when no defaultSizes', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
        </ResizableSplitPane>,
      );

      const handle = getHandles(getContainer(container))[0];
      fireEvent.doubleClick(handle);

      const sizes = onSizesChange.mock.calls[0][0];
      expect(sizes).toHaveLength(3);
      expect(sizes[0]).toBeCloseTo(1 / 3, 4);
      expect(sizes[1]).toBeCloseTo(1 / 3, 4);
      expect(sizes[2]).toBeCloseTo(1 / 3, 4);
    });

    it('does not reset when doubleClickReset=false', () => {
      const onSizesChange = vi.fn();
      const { container } = render(
        <ResizableSplitPane doubleClickReset={false} onSizesChange={onSizesChange}>
          {[<div key="a">A</div>, <div key="b">B</div>]}
        </ResizableSplitPane>,
      );

      const handle = getHandles(getContainer(container))[0];
      fireEvent.doubleClick(handle);

      expect(onSizesChange).not.toHaveBeenCalled();
    });
  });
});
