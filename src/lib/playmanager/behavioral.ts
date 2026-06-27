// PlayManager behavioural attributes — the "how a player behaves" layer, distinct
// from the rating layer (card stats + TAC). Mirrors the backfill in
// supabase/migrations/20260704... (behavioral jsonb on pm_players).

export type BehavioralKey =
  | 'composure'
  | 'vision'
  | 'stamina'
  | 'positioning'
  | 'aggression'
  | 'consistency';

export type BehavioralAttrs = Record<BehavioralKey, number>;

export const BEHAVIORAL_META: { key: BehavioralKey; label: string; blurb: string }[] = [
  { key: 'composure', label: 'სიმშვიდე', blurb: 'გადაწყვეტილება წნეხის ქვეშ' },
  { key: 'vision', label: 'ხედვა', blurb: 'შემოქმედება და გადაწყვეტი პასი' },
  { key: 'stamina', label: 'გამძლეობა', blurb: 'ენერგია 90 წუთის მანძილზე' },
  { key: 'positioning', label: 'პოზიციონირება', blurb: 'თამაშის წაკითხვა ბურთის გარეშე' },
  { key: 'aggression', label: 'აგრესია', blurb: 'ბრძოლა და პრესინგის ინტენსივობა' },
  { key: 'consistency', label: 'სტაბილურობა', blurb: 'ყოველ მატჩში დონეზე თამაში' },
];

export function getBehavioral(value: unknown): BehavioralAttrs | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const keys: BehavioralKey[] = ['composure', 'vision', 'stamina', 'positioning', 'aggression', 'consistency'];
  if (!keys.some((k) => typeof v[k] === 'number')) return null;
  return {
    composure: Number(v.composure ?? 0),
    vision: Number(v.vision ?? 0),
    stamina: Number(v.stamina ?? 0),
    positioning: Number(v.positioning ?? 0),
    aggression: Number(v.aggression ?? 0),
    consistency: Number(v.consistency ?? 0),
  };
}

export function behavioralTone(value: number): string {
  if (value >= 85) return 'text-emerald-300';
  if (value >= 70) return 'text-white';
  if (value >= 55) return 'text-amber-200';
  return 'text-white/45';
}
