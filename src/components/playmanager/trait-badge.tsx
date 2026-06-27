import { getTrait } from '@/lib/playmanager/traits';

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

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      title={trait.blurb}
      className={`inline-flex items-center gap-1 rounded-full border font-black ${pad} ${trait.bg} ${trait.border} ${trait.color}`}
    >
      <span aria-hidden>{trait.icon}</span>
      <span>{trait.label}</span>
      {showBlurb && <span className="font-bold text-white/45">· {trait.blurb}</span>}
    </span>
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
