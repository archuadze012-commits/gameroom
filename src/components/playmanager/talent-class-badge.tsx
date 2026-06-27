import { getTalentClass } from '@/lib/playmanager/talent';

// Named talent-class chip. Replaces raw "talent N/11" numbers across the UI with
// the player's class identity (label + class colour). Pass `showValue` to append
// the raw talent number for power users (e.g. the player detail page).
export function TalentClassBadge({
  talent,
  size = 'md',
  showValue = false,
  className = '',
}: {
  talent: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const cls = getTalentClass(talent);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-black tracking-[0.04em] ${pad} ${className}`}
      style={{ color: cls.color, borderColor: cls.border, backgroundColor: cls.bg }}
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: cls.color }} />
      {cls.label}
      {showValue && <span className="opacity-55 tabular-nums">{talent}</span>}
    </span>
  );
}
