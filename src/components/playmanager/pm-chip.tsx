import type { CSSProperties, ReactNode } from 'react';

// ── Shared pill/chip primitive ────────────────────────────────────────────────
// TalentClassBadge and TraitBadge were the same rounded-full bordered pill with an
// identical size→padding rule; only their colour source differed (inline style vs
// Tailwind classes). Both now build on this base. Gap is left to the caller so
// each badge keeps its own icon spacing.

export type ChipSize = 'sm' | 'md';

export function chipPad(size: ChipSize): string {
  return size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
}

export function PmChip({
  size = 'md',
  className = '',
  style,
  title,
  children,
}: {
  size?: ChipSize;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      style={style}
      className={`inline-flex items-center rounded-full border font-black ${chipPad(size)} ${className}`}
    >
      {children}
    </span>
  );
}
