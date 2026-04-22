import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoveIcon, DockGlyphIcon, SheetIcon, SplitterIcon, InspectorIcon, ZoomLensIcon, FlickDeckIcon, ChevronDownIcon } from './Icons';

export type ComponentKey = 'launcher' | 'dock' | 'sheet' | 'splitter' | 'inspector' | 'zoomlens' | 'flickdeck';

const items: { key: ComponentKey; label: string; href: string; icon: ReactNode }[] = [
  { key: 'inspector', label: 'InspectorBubble',     href: '/inspector-bubble',     icon: <InspectorIcon size={16} /> },
  { key: 'zoomlens',  label: 'ZoomLens',            href: '/zoom-lens',            icon: <ZoomLensIcon size={16} /> },
  { key: 'flickdeck', label: 'FlickDeck',           href: '/flick-deck',           icon: <FlickDeckIcon size={16} /> },
  { key: 'launcher',  label: 'MovableLauncher',     href: '/movable-launcher',     icon: <MoveIcon size={16} strokeWidth={2.2} /> },
  { key: 'dock',      label: 'SnapDock',            href: '/snap-dock',            icon: <DockGlyphIcon size={16} /> },
  { key: 'sheet',     label: 'DraggableSheet',      href: '/draggable-sheet',      icon: <SheetIcon size={16} /> },
  { key: 'splitter',  label: 'ResizableSplitPane',  href: '/resizable-split-pane', icon: <SplitterIcon size={16} /> },
];

export default function ComponentDropdown({ active }: { active: ComponentKey | null }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    if (!open) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 120);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = items.find((c) => c.key === active);
  const label = current?.label ?? 'Components';
  const icon = current?.icon ?? <ChevronDownIcon size={14} />;

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        className="nav-dropdown-trigger"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
      >
        {icon}
        <span>{label}</span>
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <div className={`nav-dropdown-menu ${closing ? 'nav-dropdown-menu--closing' : ''}`}>
          {items.map(({ key, label, href, icon }) => (
            <a
              key={key}
              href={href}
              className={`nav-dropdown-item ${active === key ? 'nav-dropdown-item--active' : ''}`}
            >
              {icon}
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
