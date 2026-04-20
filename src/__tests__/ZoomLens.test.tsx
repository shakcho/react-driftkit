import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent, cleanup } from '@testing-library/react';
import { ZoomLens } from '../ZoomLens';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
});

const hosts: HTMLElement[] = [];
function mountPage() {
  const host = document.createElement('div');
  host.innerHTML = `
    <h1 id="heading">Hello</h1>
    <p class="body-copy">Some copy for magnification.</p>
    <button data-testid="btn">Click</button>
  `;
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

afterEach(() => {
  cleanup();
  while (hosts.length) hosts.pop()?.remove();
});

describe('ZoomLens', () => {
  describe('activation', () => {
    it('renders nothing when inactive', () => {
      const { container } = render(<ZoomLens defaultActive={false} />);
      expect(container.firstChild).toBeNull();
      expect(document.querySelector('[data-zoom-lens-ignore]')).toBeNull();
    });

    it('renders a portalled overlay when active', () => {
      mountPage();
      render(<ZoomLens defaultActive />);
      expect(document.querySelector('[data-zoom-lens-ignore]')).not.toBeNull();
    });

    it('fires on.activeChange when Escape is pressed', () => {
      mountPage();
      const activeChange = vi.fn();
      render(<ZoomLens defaultActive on={{ activeChange }} />);
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(activeChange).toHaveBeenCalledWith(false);
    });

    it('respects behavior.exitOnEscape=false', () => {
      mountPage();
      const activeChange = vi.fn();
      render(
        <ZoomLens
          defaultActive
          behavior={{ exitOnEscape: false }}
          on={{ activeChange }}
        />
      );
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(activeChange).not.toHaveBeenCalled();
    });

    it('toggles via behavior.hotkey', () => {
      const activeChange = vi.fn();
      render(<ZoomLens behavior={{ hotkey: 'cmd+shift+z' }} on={{ activeChange }} />);
      act(() => {
        fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
      });
      expect(activeChange).toHaveBeenCalledWith(true);
    });
  });

  describe('clone', () => {
    it('clones the live body into the lens host', () => {
      mountPage();
      render(<ZoomLens defaultActive />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]');
      expect(wrapper).not.toBeNull();
      const clonedBody = wrapper?.querySelector('body');
      expect(clonedBody).not.toBeNull();
      expect(clonedBody?.textContent).toContain('Hello');
      expect(clonedBody?.textContent).toContain('Some copy for magnification.');
    });

    it('strips elements marked with data-zoom-lens-ignore from the clone', () => {
      const host = mountPage();
      const secret = document.createElement('div');
      secret.setAttribute('data-zoom-lens-ignore', '');
      secret.textContent = 'do not clone me';
      host.appendChild(secret);

      render(<ZoomLens defaultActive />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]');
      expect(wrapper?.textContent ?? '').not.toContain('do not clone me');
    });

    it('strips elements matched by behavior.ignoreSelector', () => {
      const host = mountPage();
      const secret = document.createElement('div');
      secret.className = 'skip-this';
      secret.textContent = 'hidden from lens';
      host.appendChild(secret);

      render(<ZoomLens defaultActive behavior={{ ignoreSelector: '.skip-this' }} />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]');
      expect(wrapper?.textContent ?? '').not.toContain('hidden from lens');
    });

    it('strips duplicate ids from the cloned tree', () => {
      mountPage();
      render(<ZoomLens defaultActive />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]');
      expect(wrapper?.querySelector('#heading')).toBeNull();
    });

    it('applies a scaled transform to the wrapper', () => {
      mountPage();
      render(<ZoomLens defaultActive defaultZoom={3} size={200} defaultPosition={{ x: 0, y: 0 }} />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      expect(wrapper.style.transform).toContain('scale(3)');
    });
  });

  describe('zoom', () => {
    it('fires on.zoomChange on wheel events', () => {
      mountPage();
      const zoomChange = vi.fn();
      render(<ZoomLens defaultActive defaultZoom={2} on={{ zoomChange }} />);
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        lens.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
      });
      expect(zoomChange).toHaveBeenCalled();
      const lastCall = zoomChange.mock.calls[zoomChange.mock.calls.length - 1][0];
      expect(lastCall).toBeGreaterThan(2);
    });

    it('clamps zoom to [minZoom, maxZoom]', () => {
      mountPage();
      const zoomChange = vi.fn();
      render(
        <ZoomLens
          defaultActive
          defaultZoom={1.5}
          minZoom={1.5}
          maxZoom={4}
          zoomStep={10}
          on={{ zoomChange }}
        />
      );
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        lens.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
      });
      expect(zoomChange).toHaveBeenLastCalledWith(4);
      act(() => {
        lens.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
      });
      expect(zoomChange).toHaveBeenLastCalledWith(1.5);
    });

    it('does not react to wheel when behavior.wheelToZoom=false', () => {
      mountPage();
      const zoomChange = vi.fn();
      render(
        <ZoomLens defaultActive behavior={{ wheelToZoom: false }} on={{ zoomChange }} />
      );
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        lens.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
      });
      expect(zoomChange).not.toHaveBeenCalled();
    });
  });

  describe('dragging', () => {
    it('fires on.positionChange and moves the lens on pointer drag', () => {
      mountPage();
      const positionChange = vi.fn();
      render(
        <ZoomLens
          defaultActive
          size={100}
          defaultPosition={{ x: 100, y: 100 }}
          on={{ positionChange }}
        />
      );
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        fireEvent.pointerDown(lens, { clientX: 150, clientY: 150, pointerId: 1 });
        fireEvent.pointerMove(lens, { clientX: 300, clientY: 260, pointerId: 1 });
        fireEvent.pointerUp(lens, { clientX: 300, clientY: 260, pointerId: 1 });
      });
      expect(positionChange).toHaveBeenCalled();
      const last = positionChange.mock.calls[positionChange.mock.calls.length - 1][0];
      expect(last.x).toBeCloseTo(250);
      expect(last.y).toBeCloseTo(210);
    });

    it('clamps the dragged position inside the viewport', () => {
      mountPage();
      const positionChange = vi.fn();
      render(
        <ZoomLens
          defaultActive
          size={200}
          defaultPosition={{ x: 100, y: 100 }}
          on={{ positionChange }}
        />
      );
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        fireEvent.pointerDown(lens, { clientX: 150, clientY: 150, pointerId: 1 });
        // Drag far off-screen
        fireEvent.pointerMove(lens, { clientX: 5000, clientY: 5000, pointerId: 1 });
        fireEvent.pointerUp(lens, { clientX: 5000, clientY: 5000, pointerId: 1 });
      });
      const last = positionChange.mock.calls[positionChange.mock.calls.length - 1][0];
      // viewport 1024x768, size 200 → max 824, max 568
      expect(last.x).toBe(824);
      expect(last.y).toBe(568);
    });
  });

  describe('target mode', () => {
    function mountTarget() {
      const target = document.createElement('div');
      target.id = 'product';
      target.style.position = 'absolute';
      target.style.left = '100px';
      target.style.top = '100px';
      target.style.width = '400px';
      target.style.height = '300px';
      target.innerHTML = '<h2>Inside target</h2><p class="detail">target-only copy</p>';
      Object.defineProperty(target, 'getBoundingClientRect', {
        value: () => ({
          left: 100, top: 100, right: 500, bottom: 400,
          width: 400, height: 300, x: 100, y: 100, toJSON: () => ({}),
        }),
      });
      document.body.appendChild(target);
      hosts.push(target);

      const outside = document.createElement('p');
      outside.textContent = 'outside the target';
      document.body.appendChild(outside);
      hosts.push(outside);

      return target;
    }

    it('starts hidden in target mode until the cursor enters the target', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} />);
      // Overlay is mounted so the clone can build, but the lens itself is
      // visibility: hidden until the first pointermove inside the target.
      expect(document.querySelector('[data-zoom-lens-ignore]')).not.toBeNull();
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      expect(lens).not.toBeNull();
      expect(lens.style.visibility).toBe('hidden');
    });

    it('clones only the target, not the rest of the page', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.textContent ?? '').toContain('target-only copy');
      expect(wrapper.textContent ?? '').not.toContain('outside the target');
    });

    it('sizes the wrapper to the target rect', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      expect(wrapper.style.width).toBe('400px');
      expect(wrapper.style.height).toBe('300px');
    });

    it('shows the lens centered on the cursor while inside the target', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} size={100} />);
      act(() => {
        target.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 200, clientY: 200, bubbles: true,
        }));
      });
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      expect(lens.style.visibility).toBe('visible');
      // size=100, so lens left/top = cursor - 50.
      expect(lens.style.left).toBe('150px');
      expect(lens.style.top).toBe('150px');
    });

    it('hides the lens on pointerleave', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} size={100} />);
      act(() => {
        target.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 200, clientY: 200, bubbles: true,
        }));
      });
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      expect(lens.style.visibility).toBe('visible');
      act(() => {
        target.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      });
      expect(lens.style.visibility).toBe('hidden');
    });

    it('disables pointer events on the lens in target mode so the target keeps receiving them', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} size={100} />);
      act(() => {
        target.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 200, clientY: 200, bubbles: true,
        }));
      });
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      expect(lens.style.pointerEvents).toBe('none');
    });

    it('accepts a CSS selector as target', () => {
      mountTarget();
      render(<ZoomLens defaultActive target="#product" />);
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      expect(wrapper.textContent ?? '').toContain('target-only copy');
      expect(wrapper.style.width).toBe('400px');
    });

    it('applies target-relative transform so the cursor point lands at the lens center', () => {
      const target = mountTarget();
      render(<ZoomLens defaultActive target={target} size={100} defaultZoom={3} />);
      act(() => {
        target.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 200, clientY: 220, bubbles: true,
        }));
      });
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      // target at (100,100); cursor at (200,220) → target-local (100,120)
      // tx = size/2 - localX*zoom = 50 - 100*3 = -250
      // ty = size/2 - localY*zoom = 50 - 120*3 = -310
      expect(wrapper.style.transform).toContain('translate3d(-250px, -310px');
      expect(wrapper.style.transform).toContain('scale(3)');
    });
  });

  describe('controlled props', () => {
    it('respects controlled active prop', () => {
      mountPage();
      const { rerender } = render(<ZoomLens active={false} />);
      expect(document.querySelector('[data-zoom-lens-ignore]')).toBeNull();
      rerender(<ZoomLens active />);
      expect(document.querySelector('[data-zoom-lens-ignore]')).not.toBeNull();
    });

    it('respects controlled zoom prop and ignores internal changes', () => {
      mountPage();
      const zoomChange = vi.fn();
      render(<ZoomLens defaultActive zoom={2} on={{ zoomChange }} />);
      const lens = document.querySelector('.zoom-lens') as HTMLElement;
      act(() => {
        lens.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
      });
      // Fired — but the zoom displayed is still 2 since we're controlled.
      expect(zoomChange).toHaveBeenCalled();
      const wrapper = document.querySelector('[data-zoom-lens-wrapper]') as HTMLElement;
      expect(wrapper.style.transform).toContain('scale(2)');
    });
  });
});
