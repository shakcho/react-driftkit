import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { InspectorBubble } from '../InspectorBubble';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
});


const hosts: HTMLElement[] = [];
function mountTargets() {
  const host = document.createElement('div');
  const button = document.createElement('button');
  button.className = 'btn primary';
  button.setAttribute('data-testid', 'target');
  button.textContent = 'Click';
  const other = document.createElement('div');
  other.className = 'other';
  other.textContent = 'Other';
  host.append(button, other);
  document.body.appendChild(host);
  hosts.push(host);
  return { host, target: button, other };
}

afterEach(() => {
  cleanup();
  while (hosts.length) hosts.pop()?.remove();
});

describe('InspectorBubble', () => {
  describe('activation', () => {
    it('renders nothing when inactive', () => {
      const { container } = render(<InspectorBubble defaultActive={false} />);
      expect(container.firstChild).toBeNull();
      expect(document.querySelector('[data-inspector-bubble-ignore]')).toBeNull();
    });

    it('renders portal overlay when active', () => {
      render(<InspectorBubble defaultActive />);
      expect(document.querySelector('[data-inspector-bubble-ignore]')).not.toBeNull();
    });

    it('fires on.activeChange when Escape is pressed', () => {
      const activeChange = vi.fn();
      render(<InspectorBubble defaultActive on={{ activeChange }} />);
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(activeChange).toHaveBeenCalledWith(false);
    });

    it('respects behavior.exitOnEscape=false', () => {
      const activeChange = vi.fn();
      render(
        <InspectorBubble
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
      render(
        <InspectorBubble behavior={{ hotkey: 'cmd+shift+c' }} on={{ activeChange }} />
      );
      act(() => {
        fireEvent.keyDown(window, { key: 'c', metaKey: true, shiftKey: true });
      });
      expect(activeChange).toHaveBeenCalledWith(true);
    });
  });

  describe('hover tracking', () => {
    it('calls on.hover with the element under the pointer', () => {
      const { target } = mountTargets();
      (document as any).elementFromPoint = () => target;

      const hover = vi.fn();
      render(<InspectorBubble defaultActive on={{ hover }} />);
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      expect(hover).toHaveBeenCalled();
      const lastCall = hover.mock.calls[hover.mock.calls.length - 1];
      const [el, info] = lastCall;
      expect(el).toBe(target);
      expect(info.tag).toBe('button');
      expect(info.selector).toContain('data-testid="target"');
    });

    it('skips elements matching behavior.ignoreSelector', () => {
      const { other } = mountTargets();
      (document as any).elementFromPoint = () => other;

      const hover = vi.fn();
      render(
        <InspectorBubble
          defaultActive
          behavior={{ ignoreSelector: '.other' }}
          on={{ hover }}
        />
      );
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      const calls = hover.mock.calls;
      expect(calls.every((c) => c[0] === null)).toBe(true);
    });

    it('reports a11y info: role, accessible name, tabindex, focusable', () => {
      const host = document.createElement('div');
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Submit form');
      button.setAttribute('aria-pressed', 'true');
      button.tabIndex = 0;
      host.appendChild(button);
      document.body.appendChild(host);
      hosts.push(host);

      (document as any).elementFromPoint = () => button;
      const hover = vi.fn();
      render(<InspectorBubble defaultActive on={{ hover }} />);
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      const info = hover.mock.calls[hover.mock.calls.length - 1][1];
      expect(info.a11y.role).toBe('button');
      expect(info.a11y.explicitRole).toBe(false);
      expect(info.a11y.accessibleName).toBe('Submit form');
      expect(info.a11y.ariaLabel).toBe('Submit form');
      expect(info.a11y.pressed).toBe(true);
      expect(info.a11y.tabIndex).toBe(0);
      expect(info.a11y.focusable).toBe(true);
    });

    it('prefers explicit role over implicit and flags it', () => {
      const host = document.createElement('div');
      const div = document.createElement('div');
      div.setAttribute('role', 'switch');
      div.setAttribute('aria-checked', 'mixed');
      host.appendChild(div);
      document.body.appendChild(host);
      hosts.push(host);

      (document as any).elementFromPoint = () => div;
      const hover = vi.fn();
      render(<InspectorBubble defaultActive on={{ hover }} />);
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      const info = hover.mock.calls[hover.mock.calls.length - 1][1];
      expect(info.a11y.role).toBe('switch');
      expect(info.a11y.explicitRole).toBe(true);
      expect(info.a11y.checked).toBe('mixed');
    });

    it('skips the picker overlay itself', () => {
      const host = document.createElement('div');
      host.setAttribute('data-inspector-bubble-ignore', '');
      host.innerHTML = '<span>inside-overlay</span>';
      document.body.appendChild(host);
      const inner = host.querySelector('span') as HTMLElement;
      (document as any).elementFromPoint = () => inner;

      const hover = vi.fn();
      render(<InspectorBubble defaultActive on={{ hover }} />);
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      expect(hover.mock.calls.every((c) => c[0] === null)).toBe(true);
    });
  });

  describe('click selection', () => {
    it('fires on.select with the clicked element and deactivates', () => {
      const { target } = mountTargets();
      (document as any).elementFromPoint = () => target;

      const select = vi.fn();
      const activeChange = vi.fn();
      render(
        <InspectorBubble defaultActive on={{ select, activeChange }} />
      );
      act(() => {
        fireEvent.click(target, { clientX: 10, clientY: 10 });
      });
      expect(select).toHaveBeenCalledTimes(1);
      expect(select.mock.calls[0][0]).toBe(target);
      expect(activeChange).toHaveBeenCalledWith(false);
    });

    it('does not deactivate when behavior.exitOnSelect=false', () => {
      const { target } = mountTargets();
      (document as any).elementFromPoint = () => target;

      const select = vi.fn();
      const activeChange = vi.fn();
      render(
        <InspectorBubble
          defaultActive
          behavior={{ exitOnSelect: false }}
          on={{ select, activeChange }}
        />
      );
      act(() => {
        fireEvent.click(target, { clientX: 10, clientY: 10 });
      });
      expect(select).toHaveBeenCalledTimes(1);
      expect(activeChange).not.toHaveBeenCalled();
    });
  });

  describe('custom render', () => {
    it('uses bubble.render when provided', () => {
      const { target } = mountTargets();
      (document as any).elementFromPoint = () => target;

      render(
        <InspectorBubble
          defaultActive
          bubble={{ render: (info) => <div>custom:{info.tag}</div> }}
        />
      );
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      expect(screen.getByText('custom:button')).toBeInTheDocument();
    });

    it('hides the bubble when bubble.enabled=false', () => {
      const { target } = mountTargets();
      (document as any).elementFromPoint = () => target;

      render(<InspectorBubble defaultActive bubble={{ enabled: false }} />);
      act(() => {
        fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
      });
      expect(document.querySelector('.inspector-bubble__info')).toBeNull();
    });
  });
});
