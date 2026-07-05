// Pure data, types and helpers for the PlayManager city editor — extracted from
// playmanager-city-editor.tsx so the (large, stateful) workspace component isn't
// interleaved with static building/module tables and formatters. No JSX, no
// component state: every export here is a constant, a type, or a pure function.
import {
  Activity,
  CalendarDays,
  Coins,
  Dumbbell,
  GraduationCap,
  Home,
  Landmark,
  MessageCircle,
  RadioTower,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  TrendingUp,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { getFacilityUpgradeCostGel, isFacilityKey, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import type { RunCityActionResult } from '@/app/playmanager/actions/city-action';
import type { PlayManagerPlayerActionResult } from '@/app/playmanager/actions/action-helpers';

// Deterministic number formatter — avoids ka-GE locale mismatch between Node.js and browser ICU
export function fmtInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(160));
}

export type EditableCityBuilding = {
  label: string;
  spriteKey: string;
  spriteUrl?: string;
  anchorX: number;
  anchorY: number;
  scale: number;
  tone: 'green' | 'red' | 'gold';
  description: string;
  status: string;
};

export type PlayManagerCityEditorProps = {
  initialFacilities?: Array<{
    spriteKey: string;
    level: number;
    progress: number;
    status: FacilityStatus;
  }>;
  manager: {
    name: string;
    username: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    title: string;
    progressPercent: number;
    xpToNextLevel: number;
    perks: ManagerPerk[];
  };
  team: {
    name: string;
    balanceLabel: string;
    divisionId: number;
    divisionLabel: string;
    formPercent: number;
  };
  clubEffects: ClubEffectsSummary;
};

export type RunCityActionError = Extract<RunCityActionResult, { success: false }>['error'];
export type PlayerActionError = Extract<PlayManagerPlayerActionResult, { success: false }>['error'];

export type FacilityStatus = 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed';

export type FacilityState = {
  status: FacilityStatus;
  level: number;
  progress: number;
  upgradeCost: string;
  nextUnlock: string;
};

export type BuildingPage = {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof Trophy;
  metrics: [string, string][];
  actions: string[];
};

export type BuildingModule = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Trophy;
  status: 'ready' | 'planned';
  // When set, the card navigates to this route instead of opening an in-workspace
  // module — used to surface other buildings' experiences from the office hub.
  href?: string;
};

export type MarketFilterKey = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT' | 'SHORTLIST';

export const BUILDING_MODULES: Record<string, BuildingModule[]> = {
  arena: [
    { key: 'matchday', title: 'მატჩის ცენტრი', eyebrow: 'Next match', description: 'შემდეგი თამაში, მზადყოფნა, home pressure და მატჩის გაშვება.', icon: Trophy, status: 'ready' },
    { key: 'lineup', title: 'შემადგენლობა და ტაქტიკა', eyebrow: 'Squad builder', description: 'მოედანზე ფუტქარდებით XI, სათადარიგოები, ფორმაცია და ტაქტიკის კონტროლი.', icon: UsersRound, status: 'ready' },
    { key: 'calendar', title: 'კალენდარი და ისტორია', eyebrow: 'Schedule', description: 'მომავალი ტურები, ბოლო შედეგები და head-to-head ანალიზი.', icon: CalendarDays, status: 'ready' },
    { key: 'daily_cups', title: 'ყოველდღიური თასები', eyebrow: 'Cups', description: 'უფასო/ფასიანი თასები, მონაწილეები, prize pool და რეგისტრაცია.', icon: Trophy, status: 'ready' },
  ],
  market: [
    { key: 'transfer_market', title: 'სატრანსფერო ბაზარი', eyebrow: 'Market', description: 'ფილტრები, ფასები, OVR, ასაკი, მოთხოვნა და სწრაფი ყიდვა.', icon: Store, status: 'ready' },
    { key: 'free_agents', title: 'თავისუფალი აგენტები', eyebrow: 'Agents', description: 'ყოველდღიურად განახლებადი ფეხბურთელები, დაბალი ფასი და სწრაფი კონტრაქტი.', icon: UsersRound, status: 'ready' },
    { key: 'scouting', title: 'სკაუტინგის ანგარიში', eyebrow: 'Reports', description: 'პოზიციური დეფიციტი, ფასის რისკი და რეკომენდებული პროფილები.', icon: Search, status: 'ready' },
    { key: 'outgoing', title: 'გაყიდვები', eyebrow: 'Outgoing', description: 'საკუთარი მოთამაშეების შეფასება, ხელფასის შემცირება და გაყიდვის გადაწყვეტილება.', icon: TrendingUp, status: 'ready' },
  ],
  training: [
    { key: 'sessions', title: 'სავარჯიშო სესიები', eyebrow: 'Growth', description: 'მოთამაშეების attribute/OVR ზრდა და ვარჯიშის ღირებულება.', icon: Dumbbell, status: 'ready' },
    { key: 'tactics_lab', title: 'ტაქტიკის ლაბი', eyebrow: 'Coverage', description: 'ფორმაციები, პოზიციების დაფარვა, pressing და ინტენსივობის სკალა.', icon: Activity, status: 'ready' },
  ],
  league: [
    { key: 'calendar', title: 'კალენდარი', eyebrow: 'Fixtures', description: 'მომავალი მატჩები, ტურის დრო და countdown-ის ლოგიკა.', icon: CalendarDays, status: 'ready' },
    { key: 'history', title: 'მატჩების ისტორია', eyebrow: 'Results', description: 'ბოლო შედეგები, შემოსავალი, დასწრება და form trend.', icon: Landmark, status: 'ready' },
  ],
  finance: [
    { key: 'transfer_market', title: 'სატრანსფერო ბაზარი', eyebrow: 'Transfers', description: 'ფილტრები, ფასები, OVR, ასაკი, მოთხოვნა და სწრაფი ყიდვა.', icon: Store, status: 'ready', href: '/playmanager/market?module=transfer_market' },
    { key: 'free_agents', title: 'თავისუფალი აგენტები', eyebrow: 'Agents', description: 'ყოველდღიურად განახლებადი ფეხბურთელები, დაბალი ფასი და სწრაფი კონტრაქტი.', icon: UsersRound, status: 'ready', href: '/playmanager/market?module=free_agents' },
    { key: 'academy_intake', title: 'აკადემიის გაფორმება', eyebrow: 'Academy', description: 'ახალგაზრდა ტალანტების ხელმოწერა და მთავარ გუნდში აყვანა.', icon: GraduationCap, status: 'ready', href: '/playmanager/academy' },
    { key: 'budget', title: 'ბიუჯეტი', eyebrow: 'Cashflow', description: 'ბალანსი, შემოსავალი, ხარჯი და მიმდინარე ტრანზაქციები.', icon: Coins, status: 'ready' },
    { key: 'sponsors', title: 'სპონსორები', eyebrow: 'Partners', description: 'სპონსორის დონე, weekly payout და მოლაპარაკება.', icon: Landmark, status: 'ready' },
    { key: 'wages', title: 'ხელფასები', eyebrow: 'Payroll', description: 'კვირეული ხელფასები, net cashflow და squad cost.', icon: UsersRound, status: 'ready' },
    { key: 'tickets', title: 'სტადიონის მენეჯმენტი', eyebrow: 'Arena revenue', description: 'ტევადობა, ბილეთის ფასი, დასწრება, საშინაო შემოსავალი და სტადიონის upgrade.', icon: Trophy, status: 'ready' },
  ],
  medical: [
    { key: 'risk', title: 'რისკის ანალიზი', eyebrow: 'Risk', description: 'რომელი ფეხბურთელი არ უნდა ათამაშო ზედიზედ მძიმე მატჩებში.', icon: Activity, status: 'ready' },
    { key: 'staff', title: 'სამედიცინო შტაბი', eyebrow: 'Medical staff', description: 'ექიმი, ფიზიოთერაპევტი და ფსიქოლოგი — დაქირავება და აფგრეიდი.', icon: Stethoscope, status: 'ready' },
  ],
  academy: [
    { key: 'prospects', title: 'ტალანტები', eyebrow: 'Prospects', description: 'ახალგაზრდები, potential, განვითარება და ხელმოწერა — ერთ ადგილას.', icon: UsersRound, status: 'ready' },
  ],
  media: [
    { key: 'direct_messages', title: 'მესენჯერი', eyebrow: 'Direct messages', description: 'პირადი მესიჯები, პასუხები და მიმდინარე დიალოგები.', icon: Send, status: 'ready' },
    { key: 'global_chat', title: 'გლობალური ჩატი', eyebrow: 'Global chat', description: 'საერთო საკომუნიკაციო არხი, სწრაფი საუბარი და აქტივობა.', icon: MessageCircle, status: 'ready' },
    { key: 'daily_reward', title: 'დღიური ჯილდო', eyebrow: 'Streak', description: 'day streak, cash reward და დაბრუნების მოტივაცია.', icon: Sparkles, status: 'ready' },
    { key: 'news', title: 'კლუბის სიახლეები', eyebrow: 'Feed', description: 'event feed, მატჩის შედეგები, ტრავმები და ფანების რეაქცია.', icon: RadioTower, status: 'ready' },
    { key: 'reputation', title: 'რეპუტაცია', eyebrow: 'Fans', description: 'ფანები, მედია კამპანია და public image.', icon: Star, status: 'ready' },
  ],
  residence: [
    { key: 'squad', title: 'მთავარი გუნდი', eyebrow: 'First team', description: 'სრული შემადგენლობა — საბაზო XI, სათადარიგოები და რეზერვი, OVR-ით და ასაკით.', icon: UsersRound, status: 'ready' },
    { key: 'academy', title: 'აკადემია', eyebrow: 'Academy', description: 'ახალგაზრდები, ტალანტები და მომავალი ხელმოწერები გუნდის შიგნით.', icon: GraduationCap, status: 'ready' },
    { key: 'staff', title: 'პერსონალი', eyebrow: 'Staff', description: 'მწვრთნელები, ექიმი, სკაუტი და მათი monthly cost.', icon: ShieldCheck, status: 'ready' },
  ],
};

export const DEFAULT_FACILITY_STATE: Record<string, FacilityState> = {
  arena: { status: 'active', level: 2, progress: 68, upgradeCost: '₾620K', nextUnlock: 'VIP ლოჟები' },
  market: { status: 'attention', level: 1, progress: 34, upgradeCost: '₾420K', nextUnlock: 'სკაუტის ქსელი' },
  academy: { status: 'upgradeable', level: 1, progress: 72, upgradeCost: '₾380K', nextUnlock: 'U19 ტურნირი' },
  training: { status: 'active', level: 2, progress: 58, upgradeCost: '₾510K', nextUnlock: 'OVR boost slot' },
  finance: { status: 'attention', level: 1, progress: 46, upgradeCost: '₾300K', nextUnlock: 'სპონსორის ოფისი' },
  league: { status: 'active', level: 1, progress: 80, upgradeCost: '₾260K', nextUnlock: 'მეტოქის სკაუტი' },
  media: { status: 'locked', level: 1, progress: 18, upgradeCost: '₾220K', nextUnlock: 'ფანების კამპანია' },
  medical: { status: 'active', level: 1, progress: 0, upgradeCost: '₾350K', nextUnlock: 'სწრაფი გამოჯანმრთელება' },
  residence: { status: 'active', level: 1, progress: 0, upgradeCost: '₾400K', nextUnlock: 'გუნდის გაფართოება' },
};

export const PRIMARY_ACTION_BY_FACILITY: Record<string, CityActionKey> = {
  market: 'market_scout',
  academy: 'academy_sign',
  training: 'training_session',
  finance: 'finance_sponsor',
  league: 'league_sim',
  media: 'media_campaign',
};

export const ACTION_PREVIEW: Record<string, { what: string; gets: string }> = {
  market_scout:   { what: 'Market progress +14%', gets: 'XP +16 · +1 დღე' },
  academy_sign:   { what: 'Academy progress +16%', gets: 'XP +18 · +1 დღე' },
  training_session: { what: 'Training progress +12%', gets: 'XP +22 (+ ვარჯიშის ბონუსი) · +1 დღე' },
  finance_sponsor: { what: '+120K–200K ₾ სპონსორი · progress +20%', gets: 'XP +18 · +1 დღე' },
  league_sim:     { what: 'ლიგის მატჩი · matchday შემოსავალი · progress +15%', gets: 'XP +30 · +2 დღე' },
  media_campaign: { what: '+35K–65K ₾ · fan mood · progress +22%', gets: 'XP +14 · +1 დღე' },
  facility_upgrade: { what: 'Level +1 · progress reset → 0%', gets: 'XP +12 · ახსნის ახალ ბონუსს' },
};

export const BUILDING_PAGES: Record<string, BuildingPage> = {
  arena: {
    eyebrow: 'Matchday Hub',
    title: 'მთავარი არენა',
    summary: '',
    icon: Trophy,
    metrics: [['ტევადობა', '45K'], ['ფანების ენერგია', '82%'], ['შემოსავალი', '+₾240K']],
    actions: ['სტადიონის განვითარება', 'ბილეთის ფასი', 'სტადიონის upgrade'],
  },
  market: {
    eyebrow: 'Transfer Desk',
    title: 'სატრანსფერო ჰაბი',
    summary: 'ტრანსფერების, სკაუტინგის და კონტრაქტების სამუშაო სივრცე. აქედან იმართება ფეხბურთელების ყიდვა-გაყიდვა.',
    icon: Store,
    metrics: [['აქტიური ბაზარი', '128'], ['სკაუტები', '4'], ['ბიუჯეტი', '₾1.0M']],
    actions: ['მოთამაშეების ძებნა', 'შორტლისტი', 'კონტრაქტი'],
  },
  academy: {
    eyebrow: 'Youth Pipeline',
    title: 'აკადემია',
    summary: 'ახალგაზრდა ფეხბურთელების განვითარება, OVR პროგრესი და მომავალი გუნდის ბირთვი.',
    icon: UsersRound,
    metrics: [['U21 მოთამაშე', '18'], ['პროგრესი', '+6%'], ['ტალანტი', 'B+']],
    actions: ['სკაუტინგი', 'გეგმა', 'აკადემიის upgrade'],
  },
  training: {
    eyebrow: 'Training Ground',
    title: 'საწვრთნელი ბაზა',
    summary: 'ფორმა, ფიტნესი, ტაქტიკური მომზადება და მოთამაშეების ყოველდღიური განვითარება.',
    icon: Dumbbell,
    metrics: [['ფიტნესი', '91%'], ['მორალი', '76%'], ['ტაქტიკა', 'Balanced']],
    actions: ['სავარჯიშო სესია', 'ტაქტიკა', 'ფიზმომზადება'],
  },
  finance: {
    eyebrow: 'Club Office',
    title: 'მენეჯერის ოფისი',
    summary: 'ტრანსფერები, თავისუფალი აგენტები, აკადემია, ბალანსი, ხელფასები და სპონსორები — კლუბის სამართავი ცენტრი.',
    icon: Coins,
    metrics: [['ბალანსი', '₾1.0M'], ['ხელფასები', '₾0'], ['სპონსორი', 'Open']],
    actions: ['ტრანსფერები', 'თავისუფალი აგენტები', 'სპონსორთან შეხვედრა'],
  },
  league: {
    eyebrow: 'Competition Center',
    title: 'ლიგის ცენტრი',
    summary: 'ყოველდღიური თასების მართვა და მონაწილეობა.',
    icon: Landmark,
    metrics: [['სტატუსი', 'აქტიური']],
    actions: [],
  },
  media: {
    eyebrow: 'Media Room',
    title: 'მედია თაუერი',
    summary: 'სიახლეები, პრესა, ფანების რეაქცია და კლუბის საჯარო იმიჯი.',
    icon: RadioTower,
    metrics: [['რეპუტაცია', 'New'], ['ფანები', '+2.4K'], ['სიახლე', 'Draft']],
    actions: ['პრესკონფერენცია', 'სიახლე', 'ფანები'],
  },
  medical: {
    eyebrow: 'Medical Center',
    title: 'სამედიცინო ცენტრი',
    summary: 'მოთამაშეების გამოჯანმრთელება, ტრავმების შემცირება და ფიზიკური მდგომარეობის მონიტორინგი.',
    icon: Stethoscope,
    metrics: [['ტრავმები', '0'], ['გამოჯანმრთელება', '100%'], ['სტატუსი', 'მზად']],
    actions: [],
  },
  residence: {
    eyebrow: 'Player Residence',
    title: 'საცხოვრებელი ბაზა',
    summary: 'გუნდის ზომის ლიმიტი დამოკიდებულია საცხოვრებელი ბაზის ლეველზე. upgrade-ით შეგიძლია უფრო მეტი მოთამაშის ყოლა.',
    icon: Home,
    metrics: [['გუნდის ლიმიტი', '16'], ['დაკავებული', '0'], ['სტატუსი', 'მზად']],
    actions: [],
  },
};

export const TRAINING_SLOTS = [
  { name: 'ლიდერი ფორვარდი', pos: 'ST', ovr: '74 -> 75', gain: '+₾2M' },
  { name: 'კრეატიული ნახევარმცველი', pos: 'CM', ovr: '69 -> 70', gain: '+₾2M' },
  { name: 'ახალგაზრდა მცველი', pos: 'CB', ovr: '63 -> 64', gain: '+₾2M' },
];

export function getTrainingGrowthCap(talent: number) {
  if (talent >= 11) return 30;
  if (talent === 10) return 25;
  if (talent === 9) return 20;
  if (talent === 8) return 15;
  return talent * 2 + 1;
}

export function getPlayerPotentialForTraining(player: PlayManagerCitySnapshot['squad'][number]) {
  return player.ovrBase + getTrainingGrowthCap(player.talent);
}

export function getDevelopmentXpCost(player: PlayManagerCitySnapshot['squad'][number]) {
  const growth = Math.max(0, player.ovrCurrent - player.ovrBase);
  return Math.round((120 + player.ovrCurrent * 4 + growth * 35) / 10) * 10;
}

export const MEDIA_ITEMS = [
  'ფანები ახალ სტადიონზე პირველ მატჩს ელოდებიან',
  'ტრანსფერების ჰაბში მოთხოვნა შეტევით პოზიციებზე იზრდება',
  'აკადემიის ორი მოთამაშე მთავარ გუნდთან ვარჯიშობს',
];

export function mergeFacilityState(
  initialFacilities: NonNullable<PlayManagerCityEditorProps['initialFacilities']>,
): Record<string, FacilityState> {
  return initialFacilities.reduce<Record<string, FacilityState>>(
    (state, facility) => {
      if (!isFacilityKey(facility.spriteKey)) return state;
      state[facility.spriteKey] = {
        ...(state[facility.spriteKey] ?? DEFAULT_FACILITY_STATE[facility.spriteKey]),
        level: facility.level,
        progress: facility.progress,
        status: facility.status,
        upgradeCost: `${fmtInt(getFacilityUpgradeCostGel(facility.spriteKey, facility.level))} ₾`,
      };
      return state;
    },
    { ...DEFAULT_FACILITY_STATE },
  );
}

export function getFacilityEffectText(
  spriteKey: string,
  clubEffects: ClubEffectsSummary,
): { value: string; description: string } {
  switch (spriteKey) {
    case 'arena':
      return { value: `+${clubEffects.bonuses.matchdayIncomePct}%`, description: 'matchday income and home pressure' };
    case 'market':
      return { value: `-${clubEffects.bonuses.transferDiscountPct}%`, description: 'transfer and contract discount' };
    case 'academy':
      return { value: `+${clubEffects.bonuses.academyQualityPct}%`, description: 'prospect quality and intake ceiling' };
    case 'training':
      return { value: `+${clubEffects.bonuses.trainingXpPct}%`, description: 'training growth and manager XP' };
    case 'finance':
      return { value: `+${clubEffects.bonuses.sponsorBonusPct}%`, description: 'sponsor payout multiplier' };
    case 'league':
      return { value: `+${clubEffects.bonuses.seasonRewardPct}%`, description: 'season reward multiplier' };
    case 'media':
      return { value: `+${clubEffects.bonuses.fanMoodPct}%`, description: 'fan mood and reputation tempo' };
    default:
      return { value: 'Live', description: 'facility effect online' };
  }
}
