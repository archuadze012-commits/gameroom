import { getTrait } from '@/lib/playmanager/traits';
import { PmChip } from '@/components/playmanager/pm-chip';

export function TraitBadge({
  traitKey,
  size = 'md',
  showBlurb = false,
}: {
  traitKey: string;
  size?: 'sm' | 'md';
  showBlurb?: boolean;
}) {
  const trait = getTrait(traitKey);
  if (!trait) return null;

  return (
    <PmChip size={size} title={trait.blurb} className={`gap-1 ${trait.bg} ${trait.border} ${trait.color}`}>
      <span aria-hidden>{trait.icon}</span>
      <span>{trait.label}</span>
      {showBlurb && <span className="font-bold text-white/45">· {trait.blurb}</span>}
    </PmChip>
  );
}

export function TraitList({
  traits,
  size = 'md',
  className = '',
}: {
  traits: string[] | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (!traits || traits.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {traits.map((t) => (
        <TraitBadge key={t} traitKey={t} size={size} />
      ))}
    </div>
  );
}
