// PlayManager player traits — behavioural specialisms that nudge the match engine.
// MUST stay in sync with the DB backfill + bonuses in
// supabase/migrations/20260702_playmanager_traits.sql (pm_team_match_profile).

export type TraitKey =
  | 'poacher'
  | 'magician'
  | 'playmaker'
  | 'speedster'
  | 'wall'
  | 'rock'
  | 'engine'
  | 'leader';

export type Trait = {
  key: TraitKey;
  label: string;       // Georgian display name
  icon: string;        // emoji glyph
  blurb: string;       // one-line effect summary (ka)
  color: string;       // text color
  bg: string;          // chip background
  border: string;      // chip border
};

export const TRAITS: Record<TraitKey, Trait> = {
  poacher: {
    key: 'poacher',
    label: 'მონადირე',
    icon: '🎯',
    blurb: 'ჯარიმის ფართობში მკვლელი — ზრდის შეტევას',
    color: 'text-rose-200',
    bg: 'bg-rose-500/12',
    border: 'border-rose-300/25',
  },
  magician: {
    key: 'magician',
    label: 'ჯადოქარი',
    icon: '✨',
    blurb: 'ტექნიკა და დრიბლინგი — ცენტრი, ფრთა, შეტევა',
    color: 'text-fuchsia-200',
    bg: 'bg-fuchsia-500/12',
    border: 'border-fuchsia-300/25',
  },
  playmaker: {
    key: 'playmaker',
    label: 'დირიჟორი',
    icon: '🎼',
    blurb: 'თამაშის ამშენებელი — ცენტრი და ნახევარმცველი',
    color: 'text-sky-200',
    bg: 'bg-sky-500/12',
    border: 'border-sky-300/25',
  },
  speedster: {
    key: 'speedster',
    label: 'ელვა',
    icon: '⚡',
    blurb: 'წმინდა სისწრაფე — აძლიერებს ფრთებს',
    color: 'text-amber-200',
    bg: 'bg-amber-500/12',
    border: 'border-amber-300/25',
  },
  wall: {
    key: 'wall',
    label: 'კედელი',
    icon: '🛡️',
    blurb: 'მტკიცე დაცვა — ზრდის თავდაცვას',
    color: 'text-emerald-200',
    bg: 'bg-emerald-500/12',
    border: 'border-emerald-300/25',
  },
  rock: {
    key: 'rock',
    label: 'გრანიტი',
    icon: '🪨',
    blurb: 'ფიზიკური დომინაცია — დაცვა და ნახევარმცველი',
    color: 'text-stone-200',
    bg: 'bg-stone-500/15',
    border: 'border-stone-300/25',
  },
  engine: {
    key: 'engine',
    label: 'ძრავა',
    icon: '🔋',
    blurb: 'დაუღალავი მუშაობა — ნახევარმცველი და მზადყოფნა',
    color: 'text-lime-200',
    bg: 'bg-lime-500/12',
    border: 'border-lime-300/25',
  },
  leader: {
    key: 'leader',
    label: 'ლიდერი',
    icon: '👑',
    blurb: 'გუნდის ბელადი — ზრდის მთელი გუნდის მზადყოფნას',
    color: 'text-yellow-200',
    bg: 'bg-yellow-500/12',
    border: 'border-yellow-300/25',
  },
};

export const TRAIT_KEYS = Object.keys(TRAITS) as TraitKey[];

export function getTrait(key: string): Trait | null {
  return (TRAITS as Record<string, Trait>)[key] ?? null;
}
