type IconProps = { size?: number; strokeWidth?: number };

export function MoveIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <circle cx="28" cy="28" r="6" />
      <path d="M28 24.5v7" />
      <path d="M24.5 28h7" />
      <path d="M28 24.5l-1.4 1.4M28 24.5l1.4 1.4" />
      <path d="M28 31.5l-1.4-1.4M28 31.5l1.4-1.4" />
      <path d="M24.5 28l1.4-1.4M24.5 28l1.4 1.4" />
      <path d="M31.5 28l-1.4-1.4M31.5 28l-1.4 1.4" />
    </svg>
  );
}

export function DockGlyphIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <rect x="12" y="30" width="16" height="5" rx="1.2" />
      <circle cx="16" cy="32.5" r="0.9" fill="currentColor" />
      <circle cx="20" cy="32.5" r="0.9" fill="currentColor" />
      <circle cx="24" cy="32.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function SheetIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <rect x="8" y="22" width="24" height="12" rx="2" />
      <path d="M16 26h8" strokeWidth={strokeWidth + 0.4} />
    </svg>
  );
}

export function SplitterIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="28" height="28" rx="3" opacity="0.35" />
      <line x1="20" y1="8" x2="20" y2="32" strokeWidth={strokeWidth + 0.5} />
      <path d="M16 17l-3 3 3 3" />
      <path d="M24 17l3 3-3 3" />
    </svg>
  );
}

export function InspectorIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="20" height="20" rx="2" opacity="0.35" />
      <path d="M22 22l5 5 3-2-5-5z" />
      <path d="M16 10v2M10 16h2" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.67 5.58.67 11.86c0 5.02 3.24 9.28 7.74 10.79.57.1.78-.25.78-.55 0-.27-.01-.99-.02-1.95-3.15.69-3.81-1.52-3.81-1.52-.51-1.31-1.26-1.66-1.26-1.66-1.03-.71.08-.69.08-.69 1.14.08 1.74 1.18 1.74 1.18 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.51-.29-5.16-1.27-5.16-5.64 0-1.25.44-2.27 1.17-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.26 1.89-.39 2.86-.39.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.63 1.58.23 2.75.12 3.04.73.8 1.17 1.82 1.17 3.07 0 4.38-2.66 5.35-5.19 5.63.41.36.77 1.06.77 2.14 0 1.54-.01 2.78-.01 3.16 0 .3.2.66.79.55 4.5-1.51 7.73-5.77 7.73-10.79C23.33 5.58 18.27.5 12 .5z" />
    </svg>
  );
}
