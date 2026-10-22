import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useState } from 'react';
import { MarqueeSelect, type MarqueeSelectState } from '../MarqueeSelect';

/**
 * jsdom gives every element a zero-sized rect, so the whole hit test would be
 * degenerate. Lay the board out by hand instead: the root sits at the viewport
 * origin and each item declares its own box through `data-box="x,y,w,h"`.
 */
function layout(container: HTMLElement) {
  const root = getRoot(container);
  root.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400, x: 0, y: 0 }) as DOMRect;

  container.querySelectorAll<HTMLElement>('[data-box]').forEach((el) => {
    const [x, y, w, h] = el.dataset.box!.split(',').map(Number);
    el.getBoundingClientRect = () =>
      ({
        left: x, top: y, right: x + w, bottom: y + h,
        width: w, height: h, x, y,
      }) as DOMRect;
  });
}

function getRoot(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function getRect(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-marquee-rect]');
}

function selectedIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-marquee-selected]')).map(
    (el) => (el as HTMLElement).dataset.marqueeId!
  );
}

/** A board of four 40×40 tiles at the corners of a 200×200 area. */
function Board({ ids = ['a', 'b', 'c', 'd'] }: { ids?: string[] }) {
  const boxes: Record<string, string> = {
    a: '0,0,40,40',
    b: '160,0,40,40',
    c: '0,160,40,40',
    d: '160,160,40,40',
  };
  return (
    <>
      {ids.map((id) => (
        <div key={id} data-marquee-item data-marquee-id={id} data-box={boxes[id]}>
          {id}
        </div>
      ))}
    </>
  );
}

interface DragOptions {
  from?: [number, number];
  to?: [number, number];
  release?: boolean;
  modifiers?: { shiftKey?: boolean; altKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };
  target?: HTMLElement;
}

/** press → move → (release), with the intermediate move that crosses the threshold. */
function drag(container: HTMLElement, opts: DragOptions = {}) {
  const { from = [0, 0], to = [200, 200], release = true, modifiers = {}, target } = opts;
  const root = getRoot(container);
  const el = target ?? root;

  fireEvent.pointerDown(el, {
    clientX: from[0], clientY: from[1], pointerId: 1, pointerType: 'mouse', button: 0,
    ...modifiers,
  });
  fireEvent.pointerMove(root, { clientX: to[0], clientY: to[1], pointerId: 1 });
  if (release) fireEvent.pointerUp(root, { clientX: to[0], clientY: to[1], pointerId: 1 });
}

beforeEach(() => {
  // The component drives auto-scroll from rAF; keep it deterministic.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 16) as unknown as number
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('MarqueeSelect', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <MarqueeSelect>
          <div>Canvas</div>
        </MarqueeSelect>
      );
      expect(screen.getByText('Canvas')).toBeInTheDocument();
    });

    it('applies base and custom className', () => {
      const { container } = render(<MarqueeSelect className="board">x</MarqueeSelect>);
      const root = getRoot(container);
      expect(root).toHaveClass('marquee-select');
      expect(root).toHaveClass('board');
    });

    it('merges custom style over defaults', () => {
      const { container } = render(
        <MarqueeSelect style={{ backgroundColor: 'red' }}>x</MarqueeSelect>
      );
      expect(getRoot(container).style.backgroundColor).toBe('red');
    });

    it('starts with no box and no active marker', () => {
      const { container } = render(<MarqueeSelect>x</MarqueeSelect>);
      expect(getRect(container)).toBeNull();
      expect(getRoot(container).hasAttribute('data-marquee-active')).toBe(false);
    });

    it('shows the box only while dragging', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { release: false });
      expect(getRect(container)).not.toBeNull();
      expect(getRoot(container).hasAttribute('data-marquee-active')).toBe(true);

      fireEvent.pointerUp(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });
      expect(getRect(container)).toBeNull();
      expect(getRoot(container).hasAttribute('data-marquee-active')).toBe(false);
    });

    it('positions the box between the anchor and the pointer', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [50, 60], to: [200, 100], release: false });
      const box = getRect(container)!;
      expect(box.style.left).toBe('50px');
      expect(box.style.top).toBe('60px');
      expect(box.style.width).toBe('150px');
      expect(box.style.height).toBe('40px');
    });

    it('normalises a box dragged up and to the left', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [200, 200], to: [50, 60], release: false });
      const box = getRect(container)!;
      expect(box.style.left).toBe('50px');
      expect(box.style.top).toBe('60px');
      expect(box.style.width).toBe('150px');
      expect(box.style.height).toBe('140px');
    });

    it('replaces the box with the marquee render prop', () => {
      const seen: MarqueeSelectState[] = [];
      const { container } = render(
        <MarqueeSelect
          marquee={(s) => {
            seen.push(s);
            return <div data-testid="custom">{s.hit.join(',')}</div>;
          }}
        >
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { release: false });
      expect(getRect(container)).toBeNull();
      expect(screen.getByTestId('custom')).toHaveTextContent('a,b,c,d');
      expect(seen[seen.length - 1].mode).toBe('replace');
      expect(seen[seen.length - 1].active).toBe(true);
    });
  });

  describe('hit testing', () => {
    it('catches every item the box touches', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).toHaveBeenLastCalledWith(['a', 'b', 'c', 'd'], expect.anything());
    });

    it('catches only the items under a partial box', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 200] });
      expect(select).toHaveBeenLastCalledWith(['a', 'c'], expect.anything());
    });

    it('catches nothing when the box misses everything', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['a']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      // The gap between the four corner tiles.
      drag(container, { from: [60, 60], to: [140, 140] });
      expect(select).toHaveBeenLastCalledWith([], expect.anything());
      expect(selectedIds(container)).toEqual([]);
    });

    it('stays quiet when a drag leaves the selection unchanged', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [60, 60], to: [140, 140] });
      expect(select).not.toHaveBeenCalled();
    });

    it('requires full enclosure under hitTest="contain"', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect behavior={{ hitTest: 'contain' }} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      // Clips the right-hand column at x=180, so only 'a' and 'c' are whole.
      drag(container, { from: [0, 0], to: [180, 200] });
      expect(select).toHaveBeenLastCalledWith(['a', 'c'], expect.anything());
    });

    it('returns ids in DOM order regardless of drag direction', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [200, 200], to: [0, 0] });
      expect(select).toHaveBeenLastCalledWith(['a', 'b', 'c', 'd'], expect.anything());
    });

    it('reports the live selection on every move', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = getRoot(container);

      fireEvent.pointerDown(root, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 30, clientY: 30, pointerId: 1 });
      expect(select).toHaveBeenLastCalledWith(['a'], expect.anything());

      fireEvent.pointerMove(root, { clientX: 30, clientY: 200, pointerId: 1 });
      expect(select).toHaveBeenLastCalledWith(['a', 'c'], expect.anything());
    });
  });

  describe('identity', () => {
    it('falls back to the element id when data-marquee-id is absent', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <div data-marquee-item id="node-1" data-box="0,0,40,40" />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).toHaveBeenLastCalledWith(['node-1'], expect.anything());
    });

    it('falls back to the index when there is no id at all', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <div data-marquee-item data-box="0,0,40,40" />
          <div data-marquee-item data-box="60,0,40,40" />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).toHaveBeenLastCalledWith(['0', '1'], expect.anything());
    });

    it('honours a custom getItemId', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect behavior={{ getItemId: (_el, i) => `item-${i}` }} on={{ select }}>
          <Board ids={['a', 'b']} />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).toHaveBeenLastCalledWith(['item-0', 'item-1'], expect.anything());
    });

    it('honours a custom itemSelector', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect itemSelector=".tile" on={{ select }}>
          <div className="tile" data-marquee-id="x" data-box="0,0,40,40" />
          <div data-marquee-item data-marquee-id="ignored" data-box="0,0,40,40" />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).toHaveBeenLastCalledWith(['x'], expect.anything());
    });

    it('hands the matched elements to the event info', () => {
      const end = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ end }}>
          <Board ids={['a', 'b']} />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      const info = end.mock.calls[0][1];
      expect(info.elements).toHaveLength(2);
      expect(info.elements[0].dataset.marqueeId).toBe('a');
    });
  });

  describe('modes', () => {
    it('replaces the selection on a plain drag', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 30] });
      expect(select).toHaveBeenLastCalledWith(['a'], expect.anything());
    });

    it('unions with the existing selection when shift is held', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 30], modifiers: { shiftKey: true } });
      expect(select).toHaveBeenLastCalledWith(['d', 'a'], expect.anything());
    });

    it('unions when meta is held', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 30], modifiers: { metaKey: true } });
      expect(select).toHaveBeenLastCalledWith(['d', 'a'], expect.anything());
    });

    it('subtracts when alt is held', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['a', 'b', 'c']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 200], modifiers: { altKey: true } });
      expect(select).toHaveBeenLastCalledWith(['b'], expect.anything());
    });

    it('unions without a modifier when additive is set', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect additive defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 30] });
      expect(select).toHaveBeenLastCalledWith(['d', 'a'], expect.anything());
    });

    it('honours a custom resolveMode', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect
          defaultSelection={['a', 'd']}
          behavior={{ resolveMode: () => 'toggle' }}
          on={{ select }}
        >
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      // 'a' is already selected so it drops out; 'c' is new so it joins.
      drag(container, { from: [0, 0], to: [30, 200] });
      expect(select).toHaveBeenLastCalledWith(['d', 'c'], expect.anything());
    });

    it('exposes the resolved mode on the root', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { release: false, modifiers: { altKey: true } });
      expect(getRoot(container).getAttribute('data-marquee-mode')).toBe('subtract');
    });
  });

  describe('gesture gating', () => {
    it('ignores movement below the threshold', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect behavior={{ clearOnEmptyClick: false }} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [2, 2] });
      expect(select).not.toHaveBeenCalled();
      expect(getRect(container)).toBeNull();
    });

    it('honours a custom threshold', () => {
      const { container } = render(
        <MarqueeSelect behavior={{ threshold: 40 }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [20, 20], release: false });
      expect(getRect(container)).toBeNull();

      fireEvent.pointerMove(getRoot(container), { clientX: 60, clientY: 60, pointerId: 1 });
      expect(getRect(container)).not.toBeNull();
    });

    it('does not start on an item by default', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const tile = screen.getByText('a');

      drag(container, { target: tile, release: false });
      expect(getRect(container)).toBeNull();
    });

    it('starts on an item when startOnItem is set', () => {
      const { container } = render(
        <MarqueeSelect behavior={{ startOnItem: true }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { target: screen.getByText('a'), release: false });
      expect(getRect(container)).not.toBeNull();
    });

    it('ignores presses on interactive elements', () => {
      const { container } = render(
        <MarqueeSelect>
          <button>Zoom</button>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { target: screen.getByText('Zoom'), release: false });
      expect(getRect(container)).toBeNull();
    });

    it('honours a custom ignoreSelector', () => {
      const { container } = render(
        <MarqueeSelect behavior={{ ignoreSelector: '.toolbar' }}>
          <div className="toolbar">Tools</div>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { target: screen.getByText('Tools'), release: false });
      expect(getRect(container)).toBeNull();
    });

    it('ignores secondary mouse buttons', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      fireEvent.pointerDown(getRoot(container), {
        clientX: 0, clientY: 0, pointerId: 1, pointerType: 'mouse', button: 2,
      });
      fireEvent.pointerMove(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });
      expect(getRect(container)).toBeNull();
    });

    it('ignores touch pointers by default', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      fireEvent.pointerDown(getRoot(container), {
        clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch',
      });
      fireEvent.pointerMove(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });
      expect(getRect(container)).toBeNull();
      expect(getRoot(container).style.touchAction).toBe('');
    });

    it('accepts touch pointers and locks panning when behavior.touch is set', () => {
      const { container } = render(
        <MarqueeSelect behavior={{ touch: true }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      expect(getRoot(container).style.touchAction).toBe('none');

      fireEvent.pointerDown(getRoot(container), {
        clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch',
      });
      fireEvent.pointerMove(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });
      expect(getRect(container)).not.toBeNull();
    });

    it('only reacts to the pointer that started the gesture', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      fireEvent.pointerDown(getRoot(container), { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(getRoot(container), { clientX: 200, clientY: 200, pointerId: 2 });
      expect(getRect(container)).toBeNull();
    });
  });

  describe('clicking empty space', () => {
    it('clears the selection', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['a', 'b']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [80, 80], to: [80, 80] });
      expect(select).toHaveBeenCalledWith([], expect.anything());
    });

    it('leaves the selection alone when clearOnEmptyClick is off', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect
          defaultSelection={['a']}
          behavior={{ clearOnEmptyClick: false }}
          on={{ select }}
        >
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [80, 80], to: [80, 80] });
      expect(select).not.toHaveBeenCalled();
    });

    it('leaves the selection alone when a modifier is held', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['a']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [80, 80], to: [80, 80], modifiers: { shiftKey: true } });
      expect(select).not.toHaveBeenCalled();
    });
  });

  describe('cancelling', () => {
    it('rolls the selection back on Escape', () => {
      const select = vi.fn();
      const cancel = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select, cancel }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200], release: false });
      expect(select).toHaveBeenLastCalledWith(['a', 'b', 'c', 'd'], expect.anything());

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(select).toHaveBeenLastCalledWith(['d'], expect.anything());
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(getRect(container)).toBeNull();
    });

    it('rolls back on pointercancel', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200], release: false });
      fireEvent.pointerCancel(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });

      expect(select).toHaveBeenLastCalledWith(['d'], expect.anything());
      expect(getRect(container)).toBeNull();
    });

    it('does not fire end after a cancel', () => {
      const end = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ end }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200], release: false });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.pointerUp(getRoot(container), { clientX: 200, clientY: 200, pointerId: 1 });

      expect(end).not.toHaveBeenCalled();
    });

    it('lets a new drag begin after a cancel', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200], release: false });
      fireEvent.keyDown(window, { key: 'Escape' });

      drag(container, { to: [200, 200], release: false });
      expect(getRect(container)).not.toBeNull();
    });
  });

  describe('controlled selection', () => {
    it('renders marks from the selection prop without any drag', () => {
      const { container } = render(
        <MarqueeSelect selection={['b']}>
          <Board />
        </MarqueeSelect>
      );
      expect(selectedIds(container)).toEqual(['b']);
    });

    it('does not move on its own when the parent ignores on.select', () => {
      const { container } = render(
        <MarqueeSelect selection={['b']}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 30] });
      expect(selectedIds(container)).toEqual(['b']);
    });

    it('follows the parent when on.select is wired up', () => {
      function Host() {
        const [ids, setIds] = useState<string[]>([]);
        return (
          <MarqueeSelect selection={ids} on={{ select: setIds }}>
            <Board />
          </MarqueeSelect>
        );
      }
      const { container } = render(<Host />);
      layout(container);

      drag(container, { from: [0, 0], to: [30, 200] });
      expect(selectedIds(container)).toEqual(['a', 'c']);
    });

    it('takes the current prop value as the base for the next drag', () => {
      const select = vi.fn();
      const { container, rerender } = render(
        <MarqueeSelect selection={['a']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      rerender(
        <MarqueeSelect selection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      drag(container, { from: [0, 0], to: [30, 30], modifiers: { shiftKey: true } });
      expect(select).toHaveBeenLastCalledWith(['d', 'a'], expect.anything());
    });
  });

  describe('item marking', () => {
    it('marks selected items', () => {
      const { container } = render(
        <MarqueeSelect defaultSelection={['a', 'c']}>
          <Board />
        </MarqueeSelect>
      );
      expect(selectedIds(container)).toEqual(['a', 'c']);
    });

    it('marks items inside the live box as hit, then clears on release', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 200], release: false });
      expect(container.querySelectorAll('[data-marquee-hit]')).toHaveLength(2);

      fireEvent.pointerUp(getRoot(container), { clientX: 30, clientY: 200, pointerId: 1 });
      expect(container.querySelectorAll('[data-marquee-hit]')).toHaveLength(0);
      expect(selectedIds(container)).toEqual(['a', 'c']);
    });

    it('marks items that mount after the selection was made', () => {
      const { container, rerender } = render(
        <MarqueeSelect selection={['a', 'b']}>
          <Board ids={['a']} />
        </MarqueeSelect>
      );
      expect(selectedIds(container)).toEqual(['a']);

      rerender(
        <MarqueeSelect selection={['a', 'b']}>
          <Board ids={['a', 'b']} />
        </MarqueeSelect>
      );
      expect(selectedIds(container)).toEqual(['a', 'b']);
    });

    it('leaves the DOM untouched when markItems is off', () => {
      const { container } = render(
        <MarqueeSelect defaultSelection={['a']} behavior={{ markItems: false }}>
          <Board />
        </MarqueeSelect>
      );
      expect(selectedIds(container)).toEqual([]);
    });
  });

  describe('auto-scroll', () => {
    /** A root that scrolls, with the pointer parked past its right edge. */
    function scrollable(container: HTMLElement) {
      const root = getRoot(container);
      root.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0 }) as DOMRect;
      Object.defineProperty(root, 'scrollLeft', { value: 0, writable: true, configurable: true });
      Object.defineProperty(root, 'scrollTop', { value: 0, writable: true, configurable: true });
      return root;
    }

    it('scrolls the root when the pointer nears an edge', () => {
      vi.useFakeTimers();
      const { container } = render(
        <MarqueeSelect behavior={{ autoScrollMargin: 40, autoScrollSpeed: 10 }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = scrollable(container);

      fireEvent.pointerDown(root, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 198, clientY: 100, pointerId: 1 });

      act(() => { vi.advanceTimersByTime(64); });
      expect(root.scrollLeft).toBeGreaterThan(0);
      expect(root.scrollTop).toBe(0);
    });

    it('stops scrolling once the drag ends', () => {
      vi.useFakeTimers();
      const { container } = render(
        <MarqueeSelect behavior={{ autoScrollMargin: 40, autoScrollSpeed: 10 }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = scrollable(container);

      fireEvent.pointerDown(root, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 198, clientY: 100, pointerId: 1 });
      act(() => { vi.advanceTimersByTime(64); });
      fireEvent.pointerUp(root, { clientX: 198, clientY: 100, pointerId: 1 });

      const settled = root.scrollLeft;
      act(() => { vi.advanceTimersByTime(200); });
      expect(root.scrollLeft).toBe(settled);
    });

    it('does not scroll when autoScroll is off', () => {
      vi.useFakeTimers();
      const { container } = render(
        <MarqueeSelect behavior={{ autoScroll: false }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = scrollable(container);

      fireEvent.pointerDown(root, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 198, clientY: 198, pointerId: 1 });
      act(() => { vi.advanceTimersByTime(200); });
      expect(root.scrollLeft).toBe(0);
    });

    it('keeps the anchor pinned to the content while the root scrolls', () => {
      const { container } = render(
        <MarqueeSelect>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = scrollable(container);

      fireEvent.pointerDown(root, { clientX: 20, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 100, clientY: 100, pointerId: 1 });
      expect(getRect(container)!.style.width).toBe('80px');

      // Scrolling right by 50px moves the content under a stationary pointer,
      // so the box has to grow by the same 50px.
      (root as unknown as { scrollLeft: number }).scrollLeft = 50;
      fireEvent.pointerMove(root, { clientX: 100, clientY: 100, pointerId: 1 });
      expect(getRect(container)!.style.width).toBe('130px');
      expect(getRect(container)!.style.left).toBe('20px');
    });
  });

  describe('events', () => {
    it('fires start once the box appears', () => {
      const start = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ start }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      fireEvent.pointerDown(getRoot(container), { clientX: 0, clientY: 0, pointerId: 1 });
      expect(start).not.toHaveBeenCalled();

      fireEvent.pointerMove(getRoot(container), { clientX: 100, clientY: 100, pointerId: 1 });
      expect(start).toHaveBeenCalledTimes(1);
      fireEvent.pointerMove(getRoot(container), { clientX: 150, clientY: 150, pointerId: 1 });
      expect(start).toHaveBeenCalledTimes(1);
    });

    it('fires end once with the committed selection', () => {
      const end = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ end }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [0, 0], to: [30, 200] });
      expect(end).toHaveBeenCalledTimes(1);
      expect(end).toHaveBeenCalledWith(['a', 'c'], expect.anything());
    });

    it('reports the box and the pre-drag selection in the info', () => {
      const end = vi.fn();
      const { container } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ end }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { from: [10, 20], to: [110, 120], modifiers: { shiftKey: true } });
      const info = end.mock.calls[0][1];
      expect(info.base).toEqual(['d']);
      expect(info.mode).toBe('add');
      expect(info.rect).toEqual({ x: 10, y: 20, width: 100, height: 100 });
    });

    it('does not fire select when the caught set is unchanged', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);
      const root = getRoot(container);

      fireEvent.pointerDown(root, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 200, clientY: 200, pointerId: 1 });
      expect(select).toHaveBeenCalledTimes(1);

      fireEvent.pointerMove(root, { clientX: 210, clientY: 210, pointerId: 1 });
      fireEvent.pointerMove(root, { clientX: 220, clientY: 220, pointerId: 1 });
      expect(select).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabling', () => {
    it('blocks the gesture entirely', () => {
      const select = vi.fn();
      const { container } = render(
        <MarqueeSelect disabled on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200] });
      expect(select).not.toHaveBeenCalled();
      expect(getRect(container)).toBeNull();
    });

    it('abandons an in-flight drag when disabled mid-gesture', () => {
      const select = vi.fn();
      const { container, rerender } = render(
        <MarqueeSelect defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      layout(container);

      drag(container, { to: [200, 200], release: false });
      expect(getRect(container)).not.toBeNull();

      rerender(
        <MarqueeSelect disabled defaultSelection={['d']} on={{ select }}>
          <Board />
        </MarqueeSelect>
      );
      expect(getRect(container)).toBeNull();
      expect(select).toHaveBeenLastCalledWith(['d'], expect.anything());
    });
  });

  describe('cleanup', () => {
    it('strips its marks from the items on unmount', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const { unmount, container } = render(
        <MarqueeSelect defaultSelection={['a']}>
          <Board />
        </MarqueeSelect>,
        { container: host }
      );
      const tile = container.querySelector('[data-marquee-id="a"]') as HTMLElement;
      expect(tile.hasAttribute('data-marquee-selected')).toBe(true);

      unmount();
      expect(tile.hasAttribute('data-marquee-selected')).toBe(false);
      host.remove();
    });
  });

  describe('SSR safety', () => {
    it('renders to a string without touching the DOM', () => {
      expect(() =>
        renderToString(
          <MarqueeSelect defaultSelection={['a']} marquee={(s) => <i>{s.mode}</i>}>
            <div>Server board</div>
          </MarqueeSelect>
        )
      ).not.toThrow();
    });

    it('produces markup at rest on the server', () => {
      const html = renderToString(
        <MarqueeSelect>
          <div>Server board</div>
        </MarqueeSelect>
      );
      expect(html).toContain('Server board');
      expect(html).toContain('data-marquee-root');
      expect(html).not.toContain('data-marquee-rect');
    });
  });
});
