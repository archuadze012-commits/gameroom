'use client';

import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleQuestionMark,
  Coins,
  Dumbbell,
  ExternalLink,
  Globe,
  Home,
  Landmark,
  LockKeyhole,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Trophy,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  buyPlayManagerMarketPlayer,
  hirePlayManagerStaff,
  joinCupAction,
  negotiatePlayManagerSponsor,
  savePlayManagerMatchSettings,
  savePlayManagerTicketPrice,
  savePlayManagerLineup,
  sellPlayManagerPlayer,
  signPlayManagerAcademyProspect,
  togglePlayManagerMarketShortlist,
  trainPlayManagerPlayer,
  upgradePlayManagerStaff,
  type MatchResult,
  type PlayManagerPlayerActionResult,
  type RunCityActionResult,
} from '@/app/playmanager/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import SpotlightCard from '@/components/SpotlightCard';
import { getFacilityUpgradeCostGel, isFacilityKey, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { formatGel, getProjectedAttendance, getProjectedMatchdayIncome, getStadiumCapacity } from '@/lib/playmanager/economy';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import { getMaxStaffLevelForDivision, type StaffCategory } from '@/lib/playmanager/staff';
import { PlayManagerCityCanvas, type PlayManagerCityBuilding } from './playmanager-city-canvas';
import { DEFAULT_FUT_CARD_EDITOR_CONFIG, PlayerFutCard } from './player-fut-card';
import { PLAYMANAGER_AI_CLUBS, PLAYMANAGER_FIXTURE_ROW_ORDER } from '@/lib/playmanager/league';

// Deterministic number formatter — avoids ka-GE locale mismatch between Node.js and browser ICU
function fmtInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export type EditableCityBuilding = PlayManagerCityBuilding & {
  description: string;
  status: string;
};

type PlayManagerCityEditorProps = {
  initialBuildings: EditableCityBuilding[];
  initialFacilities?: Array<{
    spriteKey: string;
    level: number;
    progress: number;
    status: FacilityStatus;
  }>;
  citySnapshot: PlayManagerCitySnapshot;
  backgroundUrl: string;
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

type BuildingPage = {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof Trophy;
  metrics: [string, string][];
  actions: string[];
};

type BuildingModule = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Trophy;
  status: 'ready' | 'planned';
};

const BUILDING_MODULES: Record<string, BuildingModule[]> = {
  arena: [
    { key: 'matchday', title: 'მატჩის ცენტრი', eyebrow: 'Next match', description: 'შემდეგი თამაში, მზადყოფნა, home pressure და მატჩის გაშვება.', icon: Trophy, status: 'ready' },
    { key: 'euro_cups', title: 'ევროტურნირები', eyebrow: 'Europe', description: 'ევროპის ჩემპიონთა თასი, კონფერენციის თასი და ევროპული დიდება.', icon: Globe, status: 'planned' },
    { key: 'championships', title: 'ჩემპიონატები', eyebrow: 'League', description: 'რეგულარული ჩემპიონატები, დივიზიონები და სეზონური ცხრილი.', icon: Trophy, status: 'planned' },
    { key: 'daily_cups', title: 'ყოველდღიური თასები', eyebrow: 'Cups', description: 'უფასო/ფასიანი თასები, მონაწილეები, prize pool და რეგისტრაცია.', icon: Trophy, status: 'ready' },
    { key: 'lineup', title: 'შემადგენლობა და ტაქტიკა', eyebrow: 'Squad builder', description: 'მოედანზე ფუტქარდებით XI, სათადარიგოები, ფორმაცია და ტაქტიკის კონტროლი.', icon: UsersRound, status: 'ready' },
    { key: 'calendar', title: 'კალენდარი და ისტორია', eyebrow: 'Schedule', description: 'მომავალი ტურები, ბოლო შედეგები და head-to-head ანალიზი.', icon: CalendarDays, status: 'ready' },
  ],
  market: [
    { key: 'transfer_market', title: 'სატრანსფერო ბაზარი', eyebrow: 'Market', description: 'ფილტრები, ფასები, OVR, ასაკი, მოთხოვნა და სწრაფი ყიდვა.', icon: Store, status: 'ready' },
    { key: 'free_agents', title: 'თავისუფალი აგენტები', eyebrow: 'Agents', description: 'ყოველდღიურად განახლებადი ფეხბურთელები, დაბალი ფასი და სწრაფი კონტრაქტი.', icon: UsersRound, status: 'planned' },
    { key: 'shortlist', title: 'შორტლისტი', eyebrow: 'Saved targets', description: 'დაკვირვებაში დატოვებული მოთამაშეები და მომავალი სატრანსფერო მიზნები.', icon: Star, status: 'ready' },
    { key: 'scouting', title: 'სკაუტინგის ანგარიში', eyebrow: 'Reports', description: 'პოზიციური დეფიციტი, ფასის რისკი და რეკომენდებული პროფილები.', icon: Search, status: 'planned' },
    { key: 'outgoing', title: 'გაყიდვები', eyebrow: 'Outgoing', description: 'საკუთარი მოთამაშეების შეფასება, ხელფასის შემცირება და გაყიდვის გადაწყვეტილება.', icon: TrendingUp, status: 'ready' },
  ],
  training: [
    { key: 'sessions', title: 'სავარჯიშო სესიები', eyebrow: 'Growth', description: 'მოთამაშეების attribute/OVR ზრდა და ვარჯიშის ღირებულება.', icon: Dumbbell, status: 'ready' },
    { key: 'lineup_templates', title: 'შემადგენლობის template-ები', eyebrow: 'Presets', description: 'ლიგა, თასი, როტაცია და დაცვითი/შეტევითი სასტარტოები.', icon: ShieldCheck, status: 'planned' },
    { key: 'tactics_lab', title: 'ტაქტიკის ლაბი', eyebrow: 'Coverage', description: 'ფორმაციები, პოზიციების დაფარვა, pressing და ინტენსივობის სკალა.', icon: Activity, status: 'ready' },
    { key: 'fitness', title: 'ფიზმომზადება', eyebrow: 'Fitness', description: 'fatigue, readiness და ტრავმის რისკის კონტროლი.', icon: Zap, status: 'planned' },
  ],
  league: [
    { key: 'calendar', title: 'კალენდარი', eyebrow: 'Fixtures', description: 'მომავალი მატჩები, ტურის დრო და countdown-ის ლოგიკა.', icon: CalendarDays, status: 'ready' },
    { key: 'history', title: 'მატჩების ისტორია', eyebrow: 'Results', description: 'ბოლო შედეგები, შემოსავალი, დასწრება და form trend.', icon: Landmark, status: 'ready' },
    { key: 'head_to_head', title: 'პირისპირ სტატისტიკა', eyebrow: 'H2H', description: 'მეტოქესთან წინა შეხვედრები და ტაქტიკური მინიშნებები.', icon: Search, status: 'planned' },
  ],
  finance: [
    { key: 'budget', title: 'ბიუჯეტი', eyebrow: 'Cashflow', description: 'ბალანსი, შემოსავალი, ხარჯი და მიმდინარე ტრანზაქციები.', icon: Coins, status: 'ready' },
    { key: 'sponsors', title: 'სპონსორები', eyebrow: 'Partners', description: 'სპონსორის დონე, weekly payout და მოლაპარაკება.', icon: Landmark, status: 'ready' },
    { key: 'wages', title: 'ხელფასები', eyebrow: 'Payroll', description: 'კვირეული ხელფასები, net cashflow და squad cost.', icon: UsersRound, status: 'ready' },
    { key: 'tickets', title: 'სტადიონის მენეჯმენტი', eyebrow: 'Arena revenue', description: 'ტევადობა, ბილეთის ფასი, დასწრება, საშინაო შემოსავალი და სტადიონის upgrade.', icon: Trophy, status: 'ready' },
  ],
  medical: [
    { key: 'injuries', title: 'ტრავმები', eyebrow: 'Injuries', description: 'ტრავმირებული მოთამაშეები, დაბრუნების დრო და მატჩის რისკი.', icon: Stethoscope, status: 'planned' },
    { key: 'recovery', title: 'გამოჯანმრთელება', eyebrow: 'Recovery', description: 'დასვენება, ექიმის ეფექტი და fatigue-ის შემცირება.', icon: ShieldCheck, status: 'planned' },
    { key: 'risk', title: 'რისკის ანალიზი', eyebrow: 'Risk', description: 'რომელი ფეხბურთელი არ უნდა ათამაშო ზედიზედ მძიმე მატჩებში.', icon: Activity, status: 'planned' },
    { key: 'doctor', title: 'ექიმი და პერსონალი', eyebrow: 'Staff', description: 'ექიმის დაქირავება, ყოველდღიური მკურნალობა და upgrade benefit.', icon: UsersRound, status: 'planned' },
  ],
  academy: [
    { key: 'prospects', title: 'ტალანტები', eyebrow: 'Prospects', description: 'ახალგაზრდები, potential, ხელმოწერის ფასი და როლი.', icon: UsersRound, status: 'ready' },
    { key: 'youth_training', title: 'U19 განვითარება', eyebrow: 'Youth growth', description: 'ტალანტის ზრდის გეგმა და აკადემიის ხარისხის ეფექტი.', icon: Dumbbell, status: 'planned' },
    { key: 'contracts', title: 'ახალგაზრდული კონტრაქტები', eyebrow: 'Contracts', description: 'ვის მივცეთ კონტრაქტი და როდის გადავიყვანოთ მთავარ გუნდში.', icon: ShieldCheck, status: 'planned' },
  ],
  media: [
    { key: 'missions', title: 'ყოველდღიური მისიები', eyebrow: 'Missions', description: 'აქტივობის დავალებები, reward, progress და claim flow.', icon: CheckCircle2, status: 'planned' },
    { key: 'daily_reward', title: 'დღიური ჯილდო', eyebrow: 'Streak', description: 'day streak, cash reward და დაბრუნების მოტივაცია.', icon: Sparkles, status: 'planned' },
    { key: 'news', title: 'კლუბის სიახლეები', eyebrow: 'Feed', description: 'event feed, მატჩის შედეგები, ტრავმები და ფანების რეაქცია.', icon: RadioTower, status: 'ready' },
    { key: 'reputation', title: 'რეპუტაცია', eyebrow: 'Fans', description: 'ფანები, მედია კამპანია და public image.', icon: Star, status: 'ready' },
  ],
  residence: [
    { key: 'capacity', title: 'გუნდის ლიმიტი', eyebrow: 'Capacity', description: 'რამდენი ფეხბურთელის ყოლა შეუძლია კლუბს მიმდინარე დონეზე.', icon: Home, status: 'planned' },
    { key: 'hotel', title: 'დროებითი განთავსება', eyebrow: 'Hotel', description: 'ზედმეტი მოთამაშეების დროებითი ადგილი და ავტომატური რისკები.', icon: UsersRound, status: 'planned' },
    { key: 'staff', title: 'პერსონალი', eyebrow: 'Staff', description: 'მწვრთნელები, ექიმი, სკაუტი და მათი monthly cost.', icon: ShieldCheck, status: 'ready' },
  ],
};

export const STATUS_LABELS: Record<FacilityStatus, string> = {
  active: 'აქტიური',
  attention: 'ყურადღება',
  upgradeable: 'Upgrade',
  locked: 'Locked',
  completed: 'Ready',
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

const BUILDING_PAGES: Record<string, BuildingPage> = {
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
    eyebrow: 'Club Finance',
    title: 'ფინანსური ოფისი',
    summary: 'ბალანსი, ხელფასები, სპონსორები და კლუბის ფინანსური მდგრადობა.',
    icon: Coins,
    metrics: [['ბალანსი', '₾1.0M'], ['ხელფასები', '₾0'], ['სპონსორი', 'Open']],
    actions: ['სპონსორთან შეხვედრა', 'ბიუჯეტის განაწილება', 'ხელფასები'],
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

const TRAINING_SLOTS = [
  { name: 'ლიდერი ფორვარდი', pos: 'ST', ovr: '74 -> 75', gain: '+₾2M' },
  { name: 'კრეატიული ნახევარმცველი', pos: 'CM', ovr: '69 -> 70', gain: '+₾2M' },
  { name: 'ახალგაზრდა მცველი', pos: 'CB', ovr: '63 -> 64', gain: '+₾2M' },
];

function getTrainingGrowthCap(talent: number) {
  if (talent === 10) return 25;
  if (talent === 9) return 20;
  if (talent === 8) return 15;
  return talent * 2 + 1;
}

function getPlayerPotentialForTraining(player: PlayManagerCitySnapshot['squad'][number]) {
  return Math.min(99, player.ovrBase + getTrainingGrowthCap(player.talent));
}

function getDevelopmentXpCost(player: PlayManagerCitySnapshot['squad'][number]) {
  const growth = Math.max(0, player.ovrCurrent - player.ovrBase);
  return Math.round((120 + player.ovrCurrent * 4 + growth * 35) / 10) * 10;
}

const MEDIA_ITEMS = [
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

export function PlayManagerCityEditor({
  initialBuildings,
  citySnapshot,
  backgroundUrl,
  manager,
  team,
}: PlayManagerCityEditorProps) {

  const router = useRouter();

  return (
    <div className="h-full min-h-0 w-full">
      <PlayManagerCityCanvas
        className="pm-three-host-fill"
        buildings={initialBuildings}
        backgroundUrl={backgroundUrl}
        hud={<CityCommandHud manager={manager} team={team} snapshot={citySnapshot} />}
        onBuildingSelect={(key) => router.push(`/playmanager/${key}`)}
      />
    </div>
  );
}

function CityCommandHud({
  manager,
  team,
  snapshot,
}: {
  manager: PlayManagerCityEditorProps['manager'];
  team: PlayManagerCityEditorProps['team'];
  snapshot: PlayManagerCitySnapshot;
}) {
  const safeForm = Math.max(0, Math.min(100, Math.round(team.formPercent)));
  const formLabel = safeForm >= 100 ? 'Ready' : `${safeForm}%`;
  const initials = getInitials(team.name);
  const openDailyCup = snapshot.cups.find((cup) => cup.status === 'registration' && cup.templateId !== 'champions_cup');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const upcomingCupMatch = snapshot.upcomingCupMatch;
  const startsInMs = upcomingCupMatch ? new Date(upcomingCupMatch.startTime).getTime() - nowMs : null;
  const showCupCountdown = Boolean(upcomingCupMatch && startsInMs !== null && startsInMs > 0 && startsInMs <= 10 * 60 * 1000);
  const countdownLabel = startsInMs !== null ? formatCountdown(startsInMs) : '';

  useEffect(() => {
    fetch('/api/playmanager/ensure-session', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!upcomingCupMatch) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [upcomingCupMatch]);

  return (
    <div className="pm-city-command-hud">
      <div className="pm-city-manager-panel">
        <Avatar className="h-11 w-11 border border-emerald-200/25 bg-emerald-300/10 shadow-[0_0_22px_rgba(34,197,94,0.22)]">
          <AvatarImage src={manager.avatarUrl ?? undefined} alt={manager.name} />
          <AvatarFallback className="bg-emerald-300/12 text-sm font-black text-emerald-50">
            {manager.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{manager.name} · Lv {manager.level}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-red-900 shadow-[0_0_14px_rgba(52,211,153,0.45)]"
                style={{ width: `${Math.max(8, Math.min(100, manager.progressPercent))}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-black text-emerald-100">{manager.xp} XP</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {manager.perks.slice(0, 2).map((perk) => (
              <span key={perk.key} className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2 py-1 text-[9px] font-black text-emerald-50/92">
                {perk.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pm-city-team-panel">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <div className="min-w-0 text-right">
            <p className="truncate text-xs font-black text-white">{team.name}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/55">
              Football Club
            </p>
          </div>
          <div className="pm-city-team-crest" aria-label={`${team.name} logo`}>
            {initials}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <HudMetric label="ბალანსი" value={team.balanceLabel} />
          <HudMetric label="დივიზიონი" value={team.divisionLabel} />
          <HudMetric label="ფორმა" value={formLabel} />
        </div>
      </div>

      <div className="pm-city-status-dock">
        <div className="pm-city-next-match">
          <CalendarDays className="h-4 w-4 text-emerald-100" />
          <div>
            <p>შემდეგი მატჩი</p>
            <strong>{snapshot.nextMatchLabel}</strong>
          </div>
        </div>
      </div>

      {showCupCountdown && upcomingCupMatch ? (
        <div className="pm-city-cup-dock">
          <Link href={`/playmanager/cups/${upcomingCupMatch.templateId}/matches/${upcomingCupMatch.id}`} className="pm-city-cup-link pm-city-match-link">
            <div className="pm-city-cup-icon" aria-hidden="true">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p>მატჩი იწყება</p>
              <strong>{countdownLabel}</strong>
              <span>{upcomingCupMatch.opponentName}</span>
            </div>
          </Link>
        </div>
      ) : openDailyCup ? (
        <div className="pm-city-cup-dock">
          <Link href={`/playmanager/cups/${openDailyCup.templateId}`} className="pm-city-cup-link">
            <div className="pm-city-cup-icon" aria-hidden="true">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p>დღის თასი გახსნილია</p>
              <strong>{openDailyCup.name}</strong>
              <span>
                {openDailyCup.isRegistered
                  ? 'შენ უკვე დარეგისტრირებული ხარ'
                  : `შესვლა ${openDailyCup.entryFeeLabel}`}
              </span>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function HudMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/38 px-2 py-1.5">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-white/38">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-black text-white">{value}</p>
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatCountdown(ms: number) {
  const safeSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getFacilityEffectText(
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

function ActionCard({
  label,
  preview,
  pending,
  tone,
  onClick,
}: {
  label: string;
  preview?: { what: string; gets: string };
  pending: boolean;
  tone: 'green' | 'gold';
  onClick: () => void;
}) {
  const border = tone === 'green' ? 'border-emerald-300/22 hover:border-emerald-300/38' : 'border-yellow-300/18 hover:border-yellow-300/30';
  const bg    = tone === 'green' ? 'bg-emerald-300/10 hover:bg-emerald-300/16' : 'bg-yellow-300/10 hover:bg-yellow-300/16';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`w-full rounded-none border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${border} ${bg}`}
    >
      <p className="text-sm font-black text-white">
        {pending ? 'მუშავდება...' : label}
      </p>
      {preview && !pending ? (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[11px] font-bold text-white/62">{preview.what}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/36">{preview.gets}</p>
        </div>
      ) : null}
    </button>
  );
}

function BuildingModuleGrid({
  modules,
  buildingKey,
  onOpen,
}: {
  modules: BuildingModule[];
  buildingKey: string;
  onOpen: (key: string) => void;
}) {
  if (modules.length === 0) return null;

  return (
    <div className="mt-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => (
          <ModuleCard
            key={module.key}
            module={module}
            buildingKey={buildingKey}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  buildingKey,
  onOpen,
}: {
  module: BuildingModule;
  buildingKey: string;
  onOpen: (key: string) => void;
}) {
  const signal = getModuleSignal(module.key);
  const Icon = module.icon;
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 0, y: 0, visible: false });

  return (
    <Card
      ref={ref}
      className={`group/module relative aspect-[4/3] cursor-pointer overflow-visible border p-0 ring-0 transform-gpu transition-all duration-300 hover:-translate-y-1 hover:z-10 focus-within:ring-2 focus-within:ring-emerald-300/40 ${signal.frame}`}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, visible: true });
      }}
      onMouseLeave={() => setSpot((s) => ({ ...s, visible: false }))}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: spot.visible ? 1 : 0,
            background: `radial-gradient(380px circle at ${spot.x}px ${spot.y}px, ${signal.spotlight}, transparent 60%)`,
          }}
        />

        <button
          type="button"
          onClick={() => onOpen(module.key)}
          className="absolute inset-0 z-20 focus:outline-none"
          aria-label={`${module.title} გახსნა`}
          title={`/playmanager/${buildingKey}?module=${module.key}`}
        />

        <ModulePhoto moduleKey={module.key} />

        {/* icon chip */}
        <div className="pointer-events-none absolute left-3 top-3 z-30">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 backdrop-blur-sm ${signal.soft}`}>
            <Icon className={`h-3.5 w-3.5 ${signal.accent}`} />
          </div>
        </div>

        {/* bottom title */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-10">
          <div className={`mb-1.5 h-px w-6 border-t ${signal.line}`} />
          <h5 className="text-sm font-black leading-tight tracking-wide text-white">
            {module.title}
          </h5>
        </div>
      </div>

      <ModuleHelp module={module} />
    </Card>
  );
}

function getModuleSignal(key: string) {
  const signals: Record<string, { frame: string; glow: string; accent: string; soft: string; line: string; spotlight: string }> = {
    matchday: {
      frame: 'border-emerald-300/18 bg-[linear-gradient(135deg,rgba(6,95,70,0.28),rgba(0,0,0,0.62))] hover:border-emerald-300/40 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]',
      glow: 'bg-emerald-400/24',
      accent: 'text-emerald-100',
      soft: 'bg-emerald-300/12',
      line: 'border-emerald-200/24',
      spotlight: 'rgba(52,211,153,0.14)',
    },
    euro_cups: {
      frame: 'border-blue-400/20 bg-[linear-gradient(135deg,rgba(30,58,138,0.35),rgba(0,0,0,0.66))] hover:border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
      glow: 'bg-blue-400/24',
      accent: 'text-blue-100',
      soft: 'bg-blue-300/12',
      line: 'border-blue-200/24',
      spotlight: 'rgba(59,130,246,0.16)',
    },
    championships: {
      frame: 'border-amber-400/20 bg-[linear-gradient(135deg,rgba(146,64,14,0.35),rgba(0,0,0,0.66))] hover:border-amber-400/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      glow: 'bg-amber-400/24',
      accent: 'text-amber-100',
      soft: 'bg-amber-300/12',
      line: 'border-amber-200/24',
      spotlight: 'rgba(245,158,11,0.16)',
    },
    daily_cups: {
      frame: 'border-rose-400/20 bg-[linear-gradient(135deg,rgba(159,18,57,0.35),rgba(0,0,0,0.66))] hover:border-rose-400/50 hover:shadow-[0_0_30px_rgba(225,29,72,0.2)]',
      glow: 'bg-rose-400/24',
      accent: 'text-rose-100',
      soft: 'bg-rose-300/12',
      line: 'border-rose-200/24',
      spotlight: 'rgba(225,29,72,0.16)',
    },
    lineup: {
      frame: 'border-cyan-200/16 bg-[linear-gradient(135deg,rgba(8,47,73,0.34),rgba(0,0,0,0.66))] hover:border-cyan-200/34',
      glow: 'bg-cyan-300/20',
      accent: 'text-cyan-100',
      soft: 'bg-cyan-300/12',
      line: 'border-cyan-100/22',
      spotlight: 'rgba(34,211,238,0.14)',
    },
    calendar: {
      frame: 'border-white/12 bg-[linear-gradient(135deg,rgba(31,41,55,0.5),rgba(0,0,0,0.68))] hover:border-white/24',
      glow: 'bg-white/12',
      accent: 'text-white/82',
      soft: 'bg-white/[0.07]',
      line: 'border-white/14',
      spotlight: 'rgba(255,255,255,0.08)',
    },
    stadium: {
      frame: 'border-yellow-300/16 bg-[linear-gradient(135deg,rgba(113,63,18,0.3),rgba(0,0,0,0.68))] hover:border-yellow-300/34',
      glow: 'bg-yellow-300/20',
      accent: 'text-yellow-100',
      soft: 'bg-yellow-300/12',
      line: 'border-yellow-200/22',
      spotlight: 'rgba(253,224,71,0.14)',
    },
    transfer_market: {
      frame: 'border-emerald-300/16 bg-[linear-gradient(135deg,rgba(6,78,59,0.3),rgba(0,0,0,0.68))] hover:border-emerald-300/34',
      glow: 'bg-emerald-400/20',
      accent: 'text-emerald-100',
      soft: 'bg-emerald-300/12',
      line: 'border-emerald-200/22',
      spotlight: 'rgba(52,211,153,0.14)',
    },
    outgoing: {
      frame: 'border-red-300/16 bg-[linear-gradient(135deg,rgba(127,29,29,0.25),rgba(0,0,0,0.7))] hover:border-red-300/30',
      glow: 'bg-red-400/18',
      accent: 'text-red-100',
      soft: 'bg-red-400/12',
      line: 'border-red-200/22',
      spotlight: 'rgba(248,113,113,0.14)',
    },
    prospects: {
      frame: 'border-emerald-300/16 bg-[linear-gradient(135deg,rgba(20,83,45,0.28),rgba(0,0,0,0.68))] hover:border-emerald-300/34',
      glow: 'bg-emerald-400/18',
      accent: 'text-emerald-100',
      soft: 'bg-emerald-300/12',
      line: 'border-emerald-200/22',
      spotlight: 'rgba(52,211,153,0.14)',
    },
    injuries: {
      frame: 'border-cyan-200/14 bg-[linear-gradient(135deg,rgba(22,78,99,0.28),rgba(0,0,0,0.7))] hover:border-cyan-200/30',
      glow: 'bg-cyan-300/18',
      accent: 'text-cyan-100',
      soft: 'bg-cyan-300/12',
      line: 'border-cyan-100/22',
      spotlight: 'rgba(34,211,238,0.13)',
    },
    missions: {
      frame: 'border-violet-300/14 bg-[linear-gradient(135deg,rgba(76,29,149,0.24),rgba(0,0,0,0.7))] hover:border-violet-300/28',
      glow: 'bg-violet-300/16',
      accent: 'text-violet-100',
      soft: 'bg-violet-300/12',
      line: 'border-violet-200/20',
      spotlight: 'rgba(167,139,250,0.14)',
    },
    daily_reward: {
      frame: 'border-yellow-300/14 bg-[linear-gradient(135deg,rgba(133,77,14,0.24),rgba(0,0,0,0.7))] hover:border-yellow-300/30',
      glow: 'bg-yellow-300/18',
      accent: 'text-yellow-100',
      soft: 'bg-yellow-300/12',
      line: 'border-yellow-200/22',
      spotlight: 'rgba(253,224,71,0.13)',
    },
  };

  return signals[key] ?? {
    frame: 'border-emerald-300/14 bg-black/38 hover:border-emerald-300/30 hover:bg-emerald-300/[0.07]',
    glow: 'bg-emerald-400/14',
    accent: 'text-emerald-100',
    soft: 'bg-emerald-300/10',
    line: 'border-emerald-200/18',
    spotlight: 'rgba(52,211,153,0.12)',
  };
}

function ModuleHelp({ module }: { module: BuildingModule }) {
  return (
    <div className="absolute right-3 top-3 z-40">
      <button
        type="button"
        className="peer grid h-8 w-8 place-items-center rounded-full border border-white/14 bg-black/58 text-white/58 backdrop-blur transition hover:border-emerald-200/36 hover:text-white focus:border-emerald-200/36 focus:text-white focus:outline-none"
        aria-label={`${module.title} დახმარება`}
      >
        <CircleQuestionMark className="h-4 w-4" />
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-50 w-72 translate-y-1 rounded-none border border-emerald-300/18 bg-[#020806]/96 p-4 text-left opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur transition peer-hover:translate-y-0 peer-hover:opacity-100 peer-focus:translate-y-0 peer-focus:opacity-100">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/48">
          {module.eyebrow}
        </p>
        <p className="mt-1 text-sm font-black text-white">{module.title}</p>
        <p className="mt-2 text-xs font-bold leading-5 text-white/58">{module.description}</p>
      </div>
    </div>
  );
}

function ModulePhoto({ moduleKey, photoKey }: { moduleKey: string; photoKey?: string }) {
  const resolvedPhotoKey = photoKey ?? moduleKey;
  const photo = getModulePhoto(resolvedPhotoKey);
  const zoomClass = resolvedPhotoKey === 'matchday' ? 'scale-[1.12] group-hover/module:scale-[1.16]' : 'scale-[1.02] group-hover/module:scale-[1.08]';
  const darkOverlayClass =
    resolvedPhotoKey === 'matchday'
      ? 'from-black/58 via-black/10 to-black/12'
      : 'from-black/90 via-black/24 to-black/18';
  const vignetteOverlayClass =
    resolvedPhotoKey === 'matchday'
      ? 'bg-[radial-gradient(circle_at_50%_26%,transparent_8%,rgba(0,0,0,0.1)_62%,rgba(0,0,0,0.34)_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_20%,transparent_0%,rgba(0,0,0,0.18)_64%,rgba(0,0,0,0.6)_100%)]';

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <Image
        src={photo.src}
        alt=""
        fill
        sizes="(max-width: 768px) 92vw, (max-width: 1280px) 44vw, 30vw"
        className={`object-cover opacity-88 saturate-[0.92] transition-all duration-700 ease-out ${zoomClass} group-hover/module:opacity-100`}
        style={{ objectPosition: photo.position }}
      />
      <div className={`absolute inset-0 bg-gradient-to-t ${darkOverlayClass}`} />
      <div className={`absolute inset-0 ${vignetteOverlayClass}`} />
    </div>
  );
}

function getModulePhoto(moduleKey: string) {
  const map: Record<string, { src: string; position: string }> = {
    matchday: { src: '/playmanager/module-cards/arena/matchday-anfield.webp', position: '50% 100%' },
    euro_cups: { src: '/playmanager/module-cards/arena/euro-cups.webp', position: '50% 50%' },
    championships: { src: '/playmanager/module-cards/arena/championships.webp', position: '50% 50%' },
    daily_cups: { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '50% 50%' },
    lineup: { src: '/playmanager/module-cards/arena/lineup-tactics.webp', position: '50% 50%' },
    calendar: { src: '/playmanager/module-cards/arena/calendar-history.webp', position: '50% 50%' },
    stadium: { src: '/playmanager/module-cards/arena/stadium-economy.webp', position: '50% 50%' },
    transfer_market: { src: '/playmanager/module-cards/market/transfer-market.webp', position: '50% 50%' },
    free_agents: { src: '/playmanager/module-cards/market/free-agents.webp', position: '50% 50%' },
    shortlist: { src: '/playmanager/city/buildings/market.webp', position: '40% 58%' },
    scouting: { src: '/playmanager/city/buildings/market.webp', position: '56% 40%' },
    outgoing: { src: '/playmanager/city/buildings/market.webp', position: '72% 58%' },
    sessions: { src: '/playmanager/city/buildings/training.webp', position: '50% 50%' },
    lineup_templates: { src: '/playmanager/city/buildings/training.webp', position: '38% 58%' },
    tactics_lab: { src: '/playmanager/city/buildings/training.webp', position: '64% 42%' },
    fitness: { src: '/playmanager/city/buildings/training.webp', position: '54% 66%' },
    history: { src: '/playmanager/city/buildings/league.webp', position: '34% 58%' },
    head_to_head: { src: '/playmanager/city/buildings/league.webp', position: '70% 42%' },
    budget: { src: '/playmanager/city/buildings/finance.webp', position: '48% 50%' },
    sponsors: { src: '/playmanager/city/buildings/finance.webp', position: '60% 46%' },
    wages: { src: '/playmanager/city/buildings/finance.webp', position: '38% 58%' },
    tickets: { src: '/playmanager/module-cards/arena/stadium-economy.webp', position: '50% 50%' },
    injuries: { src: '/playmanager/city/buildings/medical.webp', position: '50% 50%' },
    recovery: { src: '/playmanager/city/buildings/medical.webp', position: '36% 58%' },
    risk: { src: '/playmanager/city/buildings/medical.webp', position: '66% 44%' },
    doctor: { src: '/playmanager/city/buildings/medical.webp', position: '58% 60%' },
    prospects: { src: '/playmanager/city/buildings/academy.webp', position: '50% 52%' },
    youth_training: { src: '/playmanager/city/buildings/academy.webp', position: '38% 58%' },
    contracts: { src: '/playmanager/city/buildings/academy.webp', position: '66% 46%' },
    missions: { src: '/playmanager/city/buildings/media.webp', position: '52% 52%' },
    daily_reward: { src: '/playmanager/city/buildings/media.webp', position: '38% 60%' },
    news: { src: '/playmanager/city/buildings/media.webp', position: '64% 42%' },
    reputation: { src: '/playmanager/city/buildings/media.webp', position: '50% 66%' },
    capacity: { src: '/playmanager/city/buildings/residence.webp', position: '50% 52%' },
    hotel: { src: '/playmanager/city/buildings/residence.webp', position: '38% 58%' },
    staff: { src: '/playmanager/city/buildings/residence.webp', position: '64% 46%' },
    'cup:champions': { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '16% 50%' },
    'cup:open': { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '42% 50%' },
    'cup:active': { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '66% 50%' },
    'cup:completed': { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '88% 50%' },
    'staff:head_coach': { src: '/playmanager/module-cards/staff/head-coach.webp', position: '50% 42%' },
    'staff:gk_coach': { src: '/playmanager/module-cards/staff/gk-coach.webp', position: '50% 42%' },
    'staff:defence_coach': { src: '/playmanager/module-cards/staff/defence-coach.webp', position: '50% 42%' },
    'staff:attack_coach': { src: '/playmanager/module-cards/staff/attack-coach.webp', position: '50% 42%' },
    'staff:scout': { src: '/playmanager/module-cards/staff/scout.webp', position: '50% 42%' },
    'staff:youth_scout': { src: '/playmanager/module-cards/staff/youth-scout.webp', position: '50% 42%' },
    'staff:doctor': { src: '/playmanager/module-cards/staff/doctor.webp', position: '50% 42%' },
    'staff:physiotherapist': { src: '/playmanager/module-cards/staff/physiotherapist.webp', position: '50% 42%' },
    'staff:psychologist': { src: '/playmanager/module-cards/staff/psychologist.webp', position: '50% 42%' },
    'staff:finance_manager': { src: '/playmanager/module-cards/staff/finance-manager.webp', position: '42% 42%' },
  };

  return map[moduleKey] ?? { src: '/playmanager/city/environment/football-city-background.webp', position: '50% 50%' };
}

function BuildingModulePlaceholder({ module }: { module: BuildingModule }) {
  const ModuleIcon = module.icon;
  return (
    <GamePanel title={module.title} icon={<ModuleIcon className="h-4 w-4" />}>
      <div className="rounded-none border border-dashed border-white/12 bg-black/30 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
              შემდეგი ეტაპი
            </p>
            <h4 className="mt-2 text-2xl font-black text-white">{module.title}</h4>
            <p className="mt-3 text-sm font-bold leading-6 text-white/56">{module.description}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/42">
            Soon
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {['მონაცემების მოდელი', 'ქმედებები', 'UI კონტროლები'].map((item) => (
            <div key={item} className="rounded-none border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{item}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                ამ ქვე-გვერდის ფუნქციონალი ცალკე ჩაიკერება, რომ შენობის მთავარი გვერდი არ გადაიტვირთოს.
              </p>
            </div>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}

export function BuildingWorkspace({
  building,
  initialArenaView,
  manager,
  team,
  snapshot,
  clubEffects,
  facility,
  facilities,
  pendingAction,
  actionMessage,
  matchResult,
  onDismissMatchResult,
  onRunAction,
  onRunPlayerAction,
  onBack,
}: {
  building: EditableCityBuilding;
  initialArenaView?: 'overview' | 'lineup';
  manager: PlayManagerCityEditorProps['manager'];
  team: PlayManagerCityEditorProps['team'];
  snapshot: PlayManagerCitySnapshot;
  clubEffects: PlayManagerCityEditorProps['clubEffects'];
  facility: FacilityState;
  facilities: Record<string, FacilityState>;
  pendingAction: string | null;
  actionMessage: string | null;
  matchResult?: MatchResult | null;
  onDismissMatchResult?: () => void;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modules = BUILDING_MODULES[building.spriteKey] ?? [];
  const moduleParam = searchParams.get('module');
  const urlModule = modules.some((module) => module.key === moduleParam) ? moduleParam : null;
  const activeModuleKey = initialArenaView === 'lineup' ? 'lineup' : urlModule;
  const activeModule = modules.find((module) => module.key === activeModuleKey) ?? null;
  const page = BUILDING_PAGES[building.spriteKey] ?? {
    eyebrow: 'Club Facility',
    title: building.label,
    summary: building.description,
    icon: ShieldCheck,
    metrics: [['სტატუსი', building.status], ['მოდული', building.spriteKey], ['მზადყოფნა', 'Soon']],
    actions: ['მოდულის გახსნა', 'განახლება', 'დეტალების ნახვა'],
  };
  const Icon = page.icon;
  const ActiveModuleIcon = activeModule?.icon ?? ShieldCheck;
  const primaryAction = PRIMARY_ACTION_BY_FACILITY[building.spriteKey];
  const primaryPending = pendingAction === `${building.spriteKey}:${primaryAction}`;
  const upgradePending = pendingAction === `${building.spriteKey}:facility_upgrade`;
  const facilityEffect = getFacilityEffectText(building.spriteKey, clubEffects);
  const buildingHref = `/playmanager/${building.spriteKey}`;
  const overviewMetrics =
    building.spriteKey === 'arena'
      ? [
          ['ტევადობა', fmtInt(getStadiumCapacity(facility.level))],
          ['ფანების ენერგია', `${snapshot.formPercent}%`],
          ['შემოსავალი', snapshot.finance.projectedMatchdayIncomeLabel],
        ]
      : page.metrics;

  function openModule(moduleKey: string) {
    router.push(`${buildingHref}?module=${moduleKey}`, { scroll: false });
  }

  function closeModule() {
    router.push(buildingHref, { scroll: false });
  }

  return (
    <div className="pm-three-host pm-three-host-fill pm-building-workspace">
      <div className="pm-building-workspace-environment" aria-hidden="true" />
      <div className="pm-building-workspace-pitch" aria-hidden="true" />
      <div className="pm-building-workspace-scroll">
        <div className="pm-building-workspace-toolbar">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-black/45 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-300/12"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-200" />
            ქალაქი
          </button>
          <span className={`pm-facility-status pm-facility-status-${facility.status}`}>
            <StatusIcon status={facility.status} />
            {STATUS_LABELS[facility.status]}
          </span>
        </div>

        {activeModule ? (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-none border border-emerald-300/14 bg-black/34 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-none border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                <ActiveModuleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">
                  {activeModule.eyebrow}
                </p>
                <h3 className="mt-0.5 truncate text-xl font-black text-white">{activeModule.title}</h3>
              </div>
            </div>
            {initialArenaView !== 'lineup' ? (
              <button
                type="button"
                onClick={closeModule}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black text-white/62 transition hover:border-emerald-300/24 hover:text-white"
              >
                ქვე-გვერდები
              </button>
            ) : null}
          </div>
          {activeModule.status === 'planned' ? (
            <BuildingModulePlaceholder module={activeModule} />
          ) : (
            <FacilityModule
              spriteKey={building.spriteKey}
              moduleKey={activeModule.key}
              initialArenaView={activeModule.key === 'lineup' ? 'lineup' : initialArenaView}
              team={team}
              snapshot={snapshot}
              facilities={facilities}
              clubEffects={clubEffects}
              manager={manager}
              pendingAction={pendingAction}
              onRunPlayerAction={onRunPlayerAction}
              onRunAction={onRunAction}
            />
          )}
        </div>
        ) : (
        <div className="pm-building-workspace-hero mt-8">
          <div>
            <div className="pm-facility-icon">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 max-w-3xl text-4xl font-black leading-none text-white sm:text-5xl">
              {page.title}
            </h3>
            {page.summary && (
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/62">
                {page.summary}
              </p>
            )}

            <BuildingModuleGrid modules={modules} buildingKey={building.spriteKey} onOpen={openModule} />

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {overviewMetrics.map(([label, value]) => (
                <div key={label} className="rounded-none border border-emerald-300/12 bg-black/38 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {building.spriteKey === 'arena' ? (
              <div className="pm-facility-progress">
                <div className="flex items-center justify-between gap-3">
                  <span>სტადიონი Level {facility.level}</span>
                  <strong className={manager.level >= facility.level + 1 ? 'text-emerald-400' : 'text-white/50'}>
                    {manager.level >= facility.level + 1 ? 'Upgrade მზადაა' : `Manager Lv ${facility.level + 1} საჭიროა`}
                  </strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span style={{ width: `${Math.min(100, (manager.level / (facility.level + 1)) * 100)}%` }} className="block h-full rounded-full bg-emerald-400/60" />
                </div>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                  შენი Level: {manager.level} · upgrade {facility.upgradeCost}
                </p>
              </div>
            ) : (
              <div className="pm-facility-progress">
                <div className="flex items-center justify-between gap-3">
                  <span>Level {facility.level}</span>
                  <strong>{facility.progress}%</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span style={{ width: `${facility.progress}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                  შემდეგი: {facility.nextUnlock} · upgrade {facility.upgradeCost}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-none border border-white/10 bg-black/50 p-4 shadow-[inset_0_0_34px_rgba(34,197,94,0.06)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Activity className="h-4 w-4 text-emerald-200" />
              შენობის ოპერაციები
            </div>
            <div className="space-y-2">
              {primaryAction ? (
                <ActionCard
                  label={page.actions[0] ?? 'Run'}
                  preview={ACTION_PREVIEW[primaryAction]}
                  pending={primaryPending}
                  tone="green"
                  onClick={() => onRunAction(building.spriteKey, primaryAction)}
                />
              ) : (
                <div className="rounded-none border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-black text-white/55">
                    {manager.level >= facility.level + 1
                      ? 'Upgrade მზადაა — გამოიყენე ქვემოთ'
                      : `Upgrade-ისთვის საჭიროა კიდევ ${facility.level + 1 - manager.level} Manager Level`}
                  </p>
                </div>
              )}
              {building.spriteKey === 'arena' && manager.level < facility.level + 1 ? (
                <div className="rounded-none border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-black text-white/38">{'Upgrade -> Level '}{facility.level + 1}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/28">
                    საჭიროა Manager Level {facility.level + 1} · შენი: {manager.level}
                  </p>
                </div>
              ) : (
                <ActionCard
                  label={`Upgrade -> Level ${facility.level + 1}`}
                  preview={ACTION_PREVIEW['facility_upgrade'] && {
                    what: `${facility.upgradeCost} · Level ${facility.level} -> ${facility.level + 1}`,
                    gets: ACTION_PREVIEW['facility_upgrade'].gets,
                  }}
                  pending={upgradePending}
                  tone="gold"
                  onClick={() => onRunAction(building.spriteKey, 'facility_upgrade')}
                />
              )}
            </div>
            {actionMessage ? (
              <div className="mt-3 rounded-none border border-emerald-300/22 bg-emerald-950/60 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400/70">შედეგი</p>
                <p className="mt-1 text-xs font-black text-emerald-50">{actionMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
        )}

        {false && building.spriteKey !== 'arena' && (
        <div className="pm-building-workspace-hero mt-8">
          <div>
            <div className="pm-facility-icon">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 max-w-3xl text-4xl font-black leading-none text-white sm:text-5xl">
              {page.title}
            </h3>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/62">
              {page.summary}
            </p>
            <div className="mt-4 inline-flex flex-col rounded-none border border-white/10 bg-black/34 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Live Effect</p>
              <p className="mt-2 text-lg font-black text-white">{facilityEffect.value}</p>
              <p className="mt-1 text-xs font-bold text-emerald-100/60">{facilityEffect.description}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/36">
                Lvl {facility.level} · {manager.title}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {page.metrics.map(([label, value]) => (
                <div key={label} className="rounded-none border border-emerald-300/12 bg-black/38 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {building.spriteKey === 'arena' ? (
              <div className="pm-facility-progress">
                <div className="flex items-center justify-between gap-3">
                  <span>სტადიონი Level {facility.level}</span>
                  <strong className={manager.level >= facility.level + 1 ? 'text-emerald-400' : 'text-white/50'}>
                    {manager.level >= facility.level + 1 ? 'Upgrade მზადაა' : `Manager Lv ${facility.level + 1} საჭიროა`}
                  </strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span style={{ width: `${Math.min(100, (manager.level / (facility.level + 1)) * 100)}%` }} className="block h-full rounded-full bg-emerald-400/60" />
                </div>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                  შენი Level: {manager.level} · upgrade {facility.upgradeCost}
                </p>
              </div>
            ) : (
              <div className="pm-facility-progress">
                <div className="flex items-center justify-between gap-3">
                  <span>Level {facility.level}</span>
                  <strong>{facility.progress}%</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span style={{ width: `${facility.progress}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                  შემდეგი: {facility.nextUnlock} · upgrade {facility.upgradeCost}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-none border border-white/10 bg-black/50 p-4 shadow-[inset_0_0_34px_rgba(34,197,94,0.06)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Activity className="h-4 w-4 text-emerald-200" />
              მოქმედებები
            </div>
            <div className="space-y-2">
              {primaryAction ? (
                <ActionCard
                  label={page.actions[0] ?? 'Run'}
                  preview={ACTION_PREVIEW[primaryAction]}
                  pending={primaryPending}
                  tone="green"
                  onClick={() => onRunAction(building.spriteKey, primaryAction)}
                />
              ) : (
                <div className="rounded-none border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-black text-white/55">
                    {manager.level >= facility.level + 1
                      ? 'Upgrade მზადაა — გამოიყენე ქვემოთ'
                      : `Upgrade-ისთვის საჭიროა კიდევ ${facility.level + 1 - manager.level} Manager Level`}
                  </p>
                </div>
              )}
              {building.spriteKey === 'arena' && manager.level < facility.level + 1 ? (
                <div className="rounded-none border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-black text-white/38">🔒 Upgrade → Level {facility.level + 1}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/28">
                    საჭიროა Manager Level {facility.level + 1} · შენი: {manager.level}
                  </p>
                </div>
              ) : (
                <ActionCard
                  label={`Upgrade → Level ${facility.level + 1}`}
                  preview={ACTION_PREVIEW['facility_upgrade'] && {
                    what: `${facility.upgradeCost} · Level ${facility.level} → ${facility.level + 1}`,
                    gets: ACTION_PREVIEW['facility_upgrade'].gets,
                  }}
                  pending={upgradePending}
                  tone="gold"
                  onClick={() => onRunAction(building.spriteKey, 'facility_upgrade')}
                />
              )}
            </div>
            {actionMessage ? (
              <div className="mt-3 rounded-none border border-emerald-300/22 bg-emerald-950/60 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400/70">შედეგი</p>
                <p className="mt-1 text-xs font-black text-emerald-50">{actionMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
        )}
      </div>

      {matchResult ? (
        <MatchResultModal result={matchResult} onClose={onDismissMatchResult ?? (() => {})} />
      ) : null}
    </div>
  );
}

function MatchResultModal({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const isWin  = result.result === 'W';
  const isDraw = result.result === 'D';
  const resultColor = isWin ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
  const resultBorder = isWin ? 'border-emerald-500/30' : isDraw ? 'border-yellow-500/30' : 'border-red-500/30';
  const resultGlow  = isWin ? 'rgba(16,185,129,0.18)' : isDraw ? 'rgba(234,179,8,0.18)' : 'rgba(239,68,68,0.18)';
  const resultLabel = isWin ? 'გამარჯვება' : isDraw ? 'ფრე' : 'დამარცხება';
  const outcomeLabels: Record<string, string> = { promoted: '⬆️ გადასვლა', relegated: '⬇️ ჩამოსვლა', stayed: '✅ დარჩენა' };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70">
      <div
        className={`w-full max-w-md overflow-hidden rounded-none border ${resultBorder} bg-[#030b07]`}
        style={{ boxShadow: `0 0 60px ${resultGlow}, inset 0 0 0 1px rgba(255,255,255,0.04)` }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
            ლიგა · {result.round} ტური{result.tacticalStyle ? ` · ${result.tacticalStyle}` : ''}
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className={`text-6xl font-black tracking-tight ${resultColor}`}>{result.score}</p>
            <div className="text-right">
              <span className={`inline-block rounded-none border ${resultBorder} px-4 py-1.5 text-lg font-black ${resultColor}`}>
                {resultLabel}
              </span>
              <p className="mt-1.5 text-sm font-bold text-white/60">vs {result.opponent}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-white/6 border-b border-white/8">
          {[
            ['დასწრება', fmtInt(result.attendance)],
            ['შემოსავალი', formatGel(result.income)],
            ['ფორმა', `${result.formPercent}%`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#030b07] px-4 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
              <p className="mt-1 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Events */}
        <div className="px-6 py-4 space-y-2">
          {result.injuryUpdate?.playerName ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/18 bg-red-950/30 px-3 py-2">
              <span className="text-base">🚑</span>
              <p className="text-xs font-bold text-red-200">
                ტრავმა — {result.injuryUpdate.playerName} · {result.injuryUpdate.matches} მატჩი
              </p>
            </div>
          ) : null}
          {result.recoveredCount && result.recoveredCount > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/18 bg-emerald-950/30 px-3 py-2">
              <span className="text-base">✅</span>
              <p className="text-xs font-bold text-emerald-200">
                {result.recoveredCount} მოთამაშე გამოჯანმრთელდა
              </p>
            </div>
          ) : null}
          {result.seasonSummary ? (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-500/22 bg-yellow-950/30 px-3 py-2">
              <span className="text-base">🏆</span>
              <p className="text-xs font-bold text-yellow-200">
                სეზონი დასრულდა · #{result.seasonSummary.rank} · {outcomeLabels[result.seasonSummary.outcome] ?? result.seasonSummary.outcome}
              </p>
            </div>
          ) : null}
        </div>

        {/* Close */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-none border border-white/12 bg-white/[0.05] py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
}

const PRESET_FORMATIONS: Record<string, { label: string; top: number; left: number; index: number }[]> = {
  '4-3-3': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'CM', top: 55, left: 33, index: 6 },
    { label: 'CM', top: 55, left: 66, index: 7 },
    { label: 'LW', top: 33, left: 14, index: 8 },
    { label: 'ST', top: 25, left: 50, index: 9 },
    { label: 'RW', top: 33, left: 86, index: 10 },
  ],
  '4-4-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 35, index: 6 },
    { label: 'CM', top: 55, left: 65, index: 7 },
    { label: 'RM', top: 55, left: 85, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '3-5-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LCB', top: 85, left: 25, index: 1 },
    { label: 'CB', top: 85, left: 50, index: 2 },
    { label: 'RCB', top: 85, left: 75, index: 3 },
    { label: 'LM', top: 55, left: 15, index: 4 },
    { label: 'CDM', top: 67, left: 35, index: 5 },
    { label: 'CDM', top: 67, left: 65, index: 6 },
    { label: 'RM', top: 55, left: 85, index: 7 },
    { label: 'CAM', top: 40, left: 50, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '4-2-3-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 35, index: 5 },
    { label: 'CDM', top: 67, left: 65, index: 6 },
    { label: 'CAM', top: 40, left: 25, index: 7 },
    { label: 'CAM', top: 40, left: 50, index: 8 },
    { label: 'CAM', top: 40, left: 75, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '3-4-3': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LCB', top: 85, left: 25, index: 1 },
    { label: 'CB', top: 85, left: 50, index: 2 },
    { label: 'RCB', top: 85, left: 75, index: 3 },
    { label: 'LM', top: 60, left: 15, index: 4 },
    { label: 'CM', top: 60, left: 35, index: 5 },
    { label: 'CM', top: 60, left: 65, index: 6 },
    { label: 'RM', top: 60, left: 85, index: 7 },
    { label: 'LW', top: 30, left: 20, index: 8 },
    { label: 'ST', top: 25, left: 50, index: 9 },
    { label: 'RW', top: 30, left: 80, index: 10 },
  ],
  '5-3-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LWB', top: 75, left: 10, index: 1 },
    { label: 'LCB', top: 85, left: 30, index: 2 },
    { label: 'CB', top: 85, left: 50, index: 3 },
    { label: 'RCB', top: 85, left: 70, index: 4 },
    { label: 'RWB', top: 75, left: 90, index: 5 },
    { label: 'CM', top: 55, left: 30, index: 6 },
    { label: 'CM', top: 55, left: 50, index: 7 },
    { label: 'CM', top: 55, left: 70, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '5-4-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LWB', top: 75, left: 10, index: 1 },
    { label: 'LCB', top: 85, left: 30, index: 2 },
    { label: 'CB', top: 85, left: 50, index: 3 },
    { label: 'RCB', top: 85, left: 70, index: 4 },
    { label: 'RWB', top: 75, left: 90, index: 5 },
    { label: 'LM', top: 55, left: 20, index: 6 },
    { label: 'CM', top: 55, left: 40, index: 7 },
    { label: 'CM', top: 55, left: 60, index: 8 },
    { label: 'RM', top: 55, left: 80, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-1-2-1-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'CM', top: 52, left: 25, index: 6 },
    { label: 'CM', top: 52, left: 75, index: 7 },
    { label: 'CAM', top: 38, left: 50, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '4-3-2-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CM', top: 55, left: 25, index: 5 },
    { label: 'CM', top: 55, left: 50, index: 6 },
    { label: 'CM', top: 55, left: 75, index: 7 },
    { label: 'CAM', top: 38, left: 35, index: 8 },
    { label: 'CAM', top: 38, left: 65, index: 9 },
    { label: 'ST', top: 20, left: 50, index: 10 },
  ],
  '4-5-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 33, index: 6 },
    { label: 'CM', top: 55, left: 50, index: 7 },
    { label: 'CM', top: 55, left: 67, index: 8 },
    { label: 'RM', top: 55, left: 85, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-1-4-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'LM', top: 45, left: 15, index: 6 },
    { label: 'CM', top: 45, left: 35, index: 7 },
    { label: 'CM', top: 45, left: 65, index: 8 },
    { label: 'RM', top: 45, left: 85, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-4-1-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 35, index: 6 },
    { label: 'CM', top: 55, left: 65, index: 7 },
    { label: 'RM', top: 55, left: 85, index: 8 },
    { label: 'CF', top: 38, left: 50, index: 9 },
    { label: 'ST', top: 20, left: 50, index: 10 },
  ]
};

function FacilityModule({
  spriteKey,
  moduleKey,
  initialArenaView = 'overview',
  team,
  snapshot,
  facilities,
  clubEffects,
  manager,
  pendingAction,
  onRunPlayerAction,
  onRunAction,
}: {
  spriteKey: string;
  moduleKey?: string;
  initialArenaView?: 'overview' | 'lineup';
  team: PlayManagerCityEditorProps['team'];
  snapshot: PlayManagerCitySnapshot;
  facilities: Record<string, FacilityState>;
  clubEffects: ClubEffectsSummary;
  manager: PlayManagerCityEditorProps['manager'];
  pendingAction: string | null;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
}) {
  const [lineupDraft, setLineupDraft] = useState(() => ({
    starters: snapshot.starters,
    bench: snapshot.bench,
    reserves: snapshot.reserves,
  }));
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT' | 'SHORTLIST'>('ALL');
  const [matchSettingsDraft, setMatchSettingsDraft] = useState(snapshot.matchSettings);
  const [ticketPriceDraft, setTicketPriceDraft] = useState(snapshot.finance.ticketPrice);
  const [activePitchSlot, setActivePitchSlot] = useState<string | null>(null);
  const [arenaView] = useState<'overview' | 'lineup'>(initialArenaView);
  const [selectedLineupPlayerId, setSelectedLineupPlayerId] = useState<string | null>(
    snapshot.starters[0]?.id ?? null,
  );
  const [activeFormation, setActiveFormation] = useState('4-3-3');
  const [pitchPositions, setPitchPositions] = useState(PRESET_FORMATIONS['4-3-3']);

  const pitchPositionsFormatted = useMemo(
    () => pitchPositions.map((pos) => ({ ...pos, top: `${pos.top}%`, left: `${pos.left}%` })),
    [pitchPositions],
  );

  function applyFormation(formation: string) {
    setActiveFormation(formation);
    setPitchPositions(PRESET_FORMATIONS[formation] ?? PRESET_FORMATIONS['4-3-3']);
  }

  function movePlayer(targetRole: 'starter' | 'bench' | 'reserve', playerId: string) {
    setLineupDraft((current) => {
      const allPlayers = [...current.starters, ...current.bench, ...current.reserves];
      const player = allPlayers.find((entry) => entry.id === playerId);
      if (!player) return current;

      let starters = current.starters.filter((entry) => entry.id !== playerId);
      let bench = current.bench.filter((entry) => entry.id !== playerId);
      let reserves = current.reserves.filter((entry) => entry.id !== playerId);

      if (targetRole === 'starter') starters = [...starters, { ...player, role: 'starter' }];
      if (targetRole === 'bench') bench = [...bench, { ...player, role: 'bench' }];
      if (targetRole === 'reserve') reserves = [...reserves, { ...player, role: 'reserve' }];

      while (starters.length > 11) {
        const overflow = starters.pop();
        if (overflow) bench = [overflow, ...bench];
      }
      while (bench.length > 4) {
        const overflow = bench.pop();
        if (overflow) reserves = [overflow, ...reserves];
      }

      return {
        starters: starters.map((entry) => ({ ...entry, role: 'starter' as const })),
        bench: bench.map((entry) => ({ ...entry, role: 'bench' as const })),
        reserves: reserves.map((entry) => ({ ...entry, role: 'reserve' as const })),
      };
    });
    setSelectedLineupPlayerId(playerId);
  }

  function updateMatchSetting<Key extends keyof typeof matchSettingsDraft>(
    key: Key,
    value: (typeof matchSettingsDraft)[Key],
  ) {
    setMatchSettingsDraft((current) => ({ ...current, [key]: value }));
  }

  if (spriteKey === 'market') {
    const filteredMarket = snapshot.market.filter((player) => {
      if (marketFilter === 'ALL') return true;
      if (marketFilter === 'SHORTLIST') return player.shortlisted;
      if (marketFilter === 'GK') return player.position === 'GK';
      if (marketFilter === 'DEF') return ['CB', 'LB', 'RB'].includes(player.position);
      if (marketFilter === 'MID') return ['CDM', 'CM', 'CAM'].includes(player.position);
      if (marketFilter === 'ATT') return ['LW', 'RW', 'ST'].includes(player.position);
      return true;
    });
    return (
      <GamePanel title="სატრანსფერო ბაზარი" icon={<Search className="h-4 w-4" />}>
        <div className="mb-3 flex flex-wrap gap-2">
          {(['ALL', 'GK', 'DEF', 'MID', 'ATT', 'SHORTLIST'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setMarketFilter(filterKey)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.14em] transition ${
                marketFilter === filterKey
                  ? 'border-emerald-300/30 bg-emerald-300/12 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-emerald-300/20 hover:text-white'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
        <div className="grid gap-2 lg:grid-cols-4">
          {filteredMarket.map((player) => (
            <div key={player.key} className="pm-game-row">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{player.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                    {player.position} · {player.age} წლის
                  </p>
                </div>
                <span className="pm-rating-pill">{player.ovr}</span>
              </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">ფასი</p>
                    <p className="text-sm font-black text-emerald-100">{player.valueLabel}</p>
                  </div>
                  <span className="text-[10px] font-black text-red-100/70">{player.demand}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pendingAction === `buy:${player.key}`}
                    onClick={() => onRunPlayerAction(`buy:${player.key}`, () => buyPlayManagerMarketPlayer(player.key))}
                    className="flex-1 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {pendingAction === `buy:${player.key}` ? 'მუშავდება...' : 'Buy now'}
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction === `shortlist:${player.key}`}
                    onClick={() => onRunPlayerAction(`shortlist:${player.key}`, () => togglePlayManagerMarketShortlist(player.key))}
                    className={`rounded-xl border px-3 py-2 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      player.shortlisted
                        ? 'border-yellow-300/25 bg-yellow-300/12 hover:bg-yellow-300/18'
                        : 'border-white/10 bg-white/[0.04] hover:border-emerald-300/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    {pendingAction === `shortlist:${player.key}` ? '...' : player.shortlisted ? 'Saved' : 'Shortlist'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        {moduleKey === 'outgoing' ? (
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {snapshot.squad.slice(0, 3).map((player) => (
              <div key={player.id} className="pm-game-row">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{player.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                      {player.position} · OVR {player.ovrCurrent}
                    </p>
                  </div>
                  <span className="pm-rating-pill">{player.ovrCurrent}</span>
                </div>
                <p className="mt-4 text-sm font-black text-emerald-100">{player.valueLabel}</p>
                <button
                  type="button"
                  disabled={pendingAction === `sell:${player.id}`}
                  onClick={() => onRunPlayerAction(`sell:${player.id}`, () => sellPlayManagerPlayer(player.id))}
                  className="mt-3 w-full rounded-xl border border-red-900/30 bg-red-950/30 px-3 py-2 text-xs font-black text-white transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingAction === `sell:${player.id}` ? 'მუშავდება...' : 'გაყიდვა'}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </GamePanel>
    );
  }

  if (spriteKey === 'training') {
    const trainingLevel = facilities.training?.level ?? 1;
    const trainingBonus = clubEffects.bonuses.trainingXpPct;
    const matchXpEarned = snapshot.matchHistory.length * 30;
    const teamSessionPending = pendingAction === 'training:training_session';
    const developmentPlayers = snapshot.squad
      .map((player) => {
        const potential = getPlayerPotentialForTraining(player);
        const remainingGrowth = Math.max(0, potential - player.ovrCurrent);
        const totalGrowth = Math.max(1, potential - player.ovrBase);
        const progressPct = Math.min(100, Math.round(((player.ovrCurrent - player.ovrBase) / totalGrowth) * 100));
        return {
          player,
          potential,
          remainingGrowth,
          progressPct,
          xpCost: getDevelopmentXpCost(player),
        };
      })
      .sort((left, right) => {
        if (right.remainingGrowth !== left.remainingGrowth) return right.remainingGrowth - left.remainingGrowth;
        return left.player.age - right.player.age || right.player.ovrCurrent - left.player.ovrCurrent;
      });
    const focusPlayers = developmentPlayers.slice(0, 8);
    const readyToGrowCount = developmentPlayers.filter((item) => item.remainingGrowth > 0 && item.player.availability !== 'injured').length;
    const bestProspect = developmentPlayers[0]?.player.name ?? 'სკაუტინგის შემდეგ გამოჩნდება';
    const xpPacks = [
      { label: 'Starter Pack', xp: 300, price: '35 000 ₾', tone: 'green' },
      { label: 'Match Prep', xp: 850, price: '90 000 ₾', tone: 'gold' },
      { label: 'Elite Camp', xp: 1800, price: '175 000 ₾', tone: 'red' },
    ] as const;

    return (
      <GamePanel title="მოთამაშეების განვითარება" icon={<Dumbbell className="h-4 w-4" />}>
        <div className="relative overflow-hidden rounded-none border border-emerald-300/16 bg-black/42 p-5">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(16,185,129,0.14),transparent_42%,rgba(234,179,8,0.08))]" />
          <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/58">Development Lab</p>
              <h3 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">
                XP-ით მოთამაშეების ზრდა
              </h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/58">
                მატჩები აგროვებს XP-ს, სავარჯიშო ბაზა ზრდის XP-ის ეფექტს, ხოლო ინდივიდუალური განვითარება
                ფოკუსდება იმ ფეხბურთელებზე, ვისაც ყველაზე მეტი პოტენციალი დარჩა.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat label="დაგროვებული XP" value={fmtInt(manager.xp)} />
                <MiniStat label="მატჩებიდან" value={`+${fmtInt(matchXpEarned)}`} />
                <MiniStat label="Training bonus" value={`+${trainingBonus}%`} />
                <MiniStat label="ზრდის კანდიდატი" value={String(readyToGrowCount)} />
              </div>
            </div>
            <div className="rounded-none border border-emerald-300/14 bg-black/36 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Focus player</p>
              <p className="mt-2 text-xl font-black text-white">{bestProspect}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                პირველ რიგში გააძლიერე მაღალი პოტენციალის მოთამაშეები და ისინი, ვინც ხშირად თამაშობენ.
              </p>
              <button
                type="button"
                disabled={teamSessionPending}
                onClick={() => onRunAction('training', 'training_session')}
                className="mt-4 w-full rounded-none border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {teamSessionPending ? 'სესია მიმდინარეობს...' : 'გუნდური სესია · XP +22'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-2 lg:grid-cols-2">
            {focusPlayers.length > 0 ? (
              focusPlayers.map(({ player, potential, remainingGrowth, progressPct, xpCost }) => {
                const trainPending = pendingAction === `train:${player.id}`;
                const blocked = player.availability === 'injured' || remainingGrowth <= 0;
                return (
                  <div key={player.id} className="rounded-none border border-white/10 bg-black/32 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-white">{player.name}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                          {player.position} · {player.age} წლის · Talent {player.talent}
                        </p>
                      </div>
                      <span className="pm-rating-pill">{player.ovrCurrent}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Potential" value={String(potential)} />
                      <MiniStat label="დარჩა" value={`+${remainingGrowth}`} />
                      <MiniStat label="XP cost" value={fmtInt(xpCost)} />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] font-black text-white/44">
                        <span>განვითარება</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={trainPending || blocked}
                      onClick={() => onRunPlayerAction(`train:${player.id}`, () => trainPlayManagerPlayer(player.id))}
                      className="mt-4 w-full rounded-none border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {trainPending
                        ? 'ვითარდება...'
                        : player.availability === 'injured'
                          ? 'ტრავმირებულია'
                          : remainingGrowth <= 0
                            ? 'პოტენციალი შევსებულია'
                            : 'XP-ის გამოყენება · OVR +1'}
                    </button>
                  </div>
                );
              })
            ) : (
              TRAINING_SLOTS.map((slot) => (
                <div key={slot.name} className="pm-game-row">
                  <p className="text-sm font-black text-white">{slot.name}</p>
                  <p className="mt-2 text-xs font-bold text-white/48">{slot.pos} · {slot.ovr} · {slot.gain}</p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-none border border-yellow-300/14 bg-yellow-300/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/56">XP Shop</p>
              <p className="mt-1 text-xl font-black text-white">დაჩქარებული განვითარება</p>
              <p className="mt-2 text-xs font-bold leading-5 text-white/52">
                პაკეტები მზადაა UI-ში. ყიდვის ღილაკს backend RPC სჭირდება, რომ თანხა და XP ერთ transaction-ში დამუშავდეს.
              </p>
              <div className="mt-4 space-y-2">
                {xpPacks.map((pack) => (
                  <div key={pack.label} className="rounded-none border border-white/10 bg-black/28 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{pack.label}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          +{fmtInt(pack.xp)} XP · {pack.price}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-white/38"
                      >
                        მალე
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-none border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Development rules</p>
              <div className="mt-3 space-y-2 text-xs font-bold leading-5 text-white/52">
                <p>მატჩი უნდა იყოს მთავარი XP წყარო, რადგან სათამაშო დრო განვითარებას ბუნებრივად აკავშირებს.</p>
                <p>Shop XP უნდა აჩქარებდეს პროცესს, მაგრამ პოტენციალს არ უნდა აჭარბებდეს.</p>
                <p>Training Level {trainingLevel} ზრდის XP-ის ეფექტს: ახლა +{trainingBonus}%.</p>
              </div>
            </div>
          </div>
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'academy') {
    return (
      <GamePanel title="აკადემიის ტალანტები" icon={<UsersRound className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-3">
          {snapshot.academy.map((prospect) => (
            <div key={prospect.id} className="pm-game-row">
              <p className="text-sm font-black text-white">{prospect.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="POS" value={prospect.position} />
                <MiniStat label="OVR" value={String(prospect.ovr)} />
                <MiniStat label="POT" value={String(prospect.potential)} />
              </div>
              <p className="mt-3 text-[11px] font-bold text-white/48">{prospect.age} წლის · ახალგაზრდული კონტრაქტი</p>
              <button
                type="button"
                disabled={pendingAction === `academy:${prospect.id}`}
                onClick={() => onRunPlayerAction(`academy:${prospect.id}`, () => signPlayManagerAcademyProspect(prospect.id))}
                className="mt-3 w-full rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === `academy:${prospect.id}` ? 'მუშავდება...' : `ხელმოწერა ${prospect.signingCostLabel}`}
              </button>
            </div>
          ))}
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'league') {
    return (
      <GamePanel title="ლიგის ცენტრი" icon={<Landmark className="h-4 w-4" />}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42 mb-3">ყოველდღიური თასები</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {snapshot.cups.map((cup) => (
              <div key={cup.id} className="pm-game-row">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{cup.name}</p>
                    <p className="mt-1 text-[10px] font-bold text-emerald-100/60">
                      საპრიზო ფონდი {cup.prizePoolLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-black text-emerald-100">
                    {cup.participantCount} / {cup.maxTeams}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={cup.isRegistered || cup.status !== 'registration' || pendingAction === `join_cup:${cup.id}`}
                    onClick={() =>
                      onRunPlayerAction(
                        `join_cup:${cup.id}`,
                        () => joinCupAction(cup.id) as Promise<PlayManagerPlayerActionResult>,
                      )
                    }
                    className="flex-1 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {pendingAction === `join_cup:${cup.id}` 
                      ? 'მუშავდება...' 
                      : cup.status === 'in_progress'
                        ? 'მიმდინარეობს'
                        : cup.isRegistered
                          ? 'დარეგისტრირებული'
                          : `მონაწილეობა · ${cup.entryFeeLabel}`}
                  </button>
                  <Link 
                    href={`/playmanager/cups/${cup.templateId}`} 
                    className="flex-1 text-center rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-white transition hover:bg-black/50"
                  >
                    ნახვა
                  </Link>
                </div>
              </div>
            ))}
            {snapshot.cups.length === 0 && (
              <p className="text-xs text-white/50">ამჟამად ხელმისაწვდომი თასები არ არის.</p>
            )}
          </div>
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'residence' && moduleKey === 'staff') {
    const categoryMeta: Record<
      StaffCategory,
      {
        label: string;
        icon: typeof ShieldCheck;
        accent: string;
        accentSoft: string;
        badge: string;
      }
    > = {
      coaching: {
        label: 'Coaching',
        icon: Dumbbell,
        accent: 'from-emerald-300/20 via-emerald-300/6 to-transparent',
        accentSoft: 'border-emerald-300/18 bg-emerald-300/10 text-emerald-100',
        badge: 'განვითარება',
      },
      scouting: {
        label: 'Scouting',
        icon: Search,
        accent: 'from-cyan-300/18 via-cyan-300/6 to-transparent',
        accentSoft: 'border-cyan-300/18 bg-cyan-300/10 text-cyan-100',
        badge: 'რეკრუტინგი',
      },
      medical: {
        label: 'Medical',
        icon: Stethoscope,
        accent: 'from-red-300/18 via-red-300/6 to-transparent',
        accentSoft: 'border-red-300/18 bg-red-300/10 text-red-100',
        badge: 'რეაბილიტაცია',
      },
      operations: {
        label: 'Operations',
        icon: Coins,
        accent: 'from-amber-300/18 via-amber-300/6 to-transparent',
        accentSoft: 'border-amber-300/18 bg-amber-300/10 text-amber-100',
        badge: 'ეკონომიკა',
      },
    };
    const categories: StaffCategory[] = ['coaching', 'scouting', 'medical', 'operations'];
    const maxStaffLevel = getMaxStaffLevelForDivision(team.divisionId);
    const activeStaffCount = snapshot.staff.members.filter((member) => member.isHired).length;

    return (
      <GamePanel title="კლუბის პერსონალი" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 p-5">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(34,197,94,0.12),transparent_40%,rgba(234,179,8,0.08))]" />
          <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/58">Residence Staff</p>
              <h3 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">შტაბი, რომელიც გუნდს მუშაობინებს</h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/58">
                Residence-ში უკვე შეგიძლია პერსონალის დაქირავება და მათი ლეველების გაზრდა. Upgrade cap დამოკიდებულია დივიზიონზე,
                ასე რომ უფრო მაღალ ლიგაში უკეთესი შტაბის აშენება გახდება შესაძლებელი.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat label="დაქირავებული" value={`${activeStaffCount}/${snapshot.staff.members.length}`} />
                <MiniStat label="დივიზიონი" value={team.divisionLabel} />
                <MiniStat label="Level cap" value={`LVL ${maxStaffLevel}`} />
                <MiniStat label="კვირეული staff cost" value={snapshot.staff.totalWeeklyWagesLabel} />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Live bonuses</p>
              <div className="mt-3 space-y-2 text-xs font-bold text-white/60">
                <p>Readiness: +{snapshot.staff.bonuses.readinessFlat}</p>
                <p>Market depth: +{snapshot.staff.bonuses.marketExtraPlayers} მოთამაშე</p>
                <p>Academy depth: +{snapshot.staff.bonuses.academyExtraProspects} ტალანტი</p>
                <p>Projected income: +{snapshot.staff.bonuses.projectedIncomePct}%</p>
                <p>Injury treatment: +{snapshot.staff.bonuses.doctorRecoveryPct}%</p>
                <p>Fatigue recovery: +{snapshot.staff.bonuses.physioRecoveryPct}%</p>
                <p>Morale support: +{snapshot.staff.bonuses.psychologistMoralePct}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {categories.map((category) => {
            const meta = categoryMeta[category];
            const Icon = meta.icon;
            const members = snapshot.staff.members.filter((member) => member.category === category);
            if (members.length === 0) return null;

            return (
              <section key={category} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl border ${meta.accentSoft}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{meta.label}</p>
                      <p className="text-base font-black text-white">{members.length} როლი</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${meta.accentSoft}`}>
                    {meta.badge}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {members.map((member) => {
                    const hirePending = pendingAction === `staff:hire:${member.roleKey}`;
                    const upgradePending = pendingAction === `staff:upgrade:${member.roleKey}`;
                    const canUpgrade = member.isHired && member.level > 0 && member.level < member.maxLevel && Boolean(member.upgradeCost);
                    const capReached = member.isHired && member.level >= member.maxLevel;

                    return (
                      <SpotlightCard
                        key={member.roleKey}
                        className={`group/module relative aspect-[4/3] rounded-xl border p-0 ${meta.accentSoft.split(' ').filter((token) => token.startsWith('border-')).join(' ')} bg-black/40`}
                        spotlightColor={
                          category === 'scouting'
                            ? 'rgba(34, 211, 238, 0.22)'
                            : category === 'medical'
                              ? 'rgba(252, 165, 165, 0.22)'
                              : category === 'operations'
                                ? 'rgba(252, 211, 77, 0.22)'
                                : 'rgba(110, 231, 183, 0.22)'
                        }
                      >
                        <ModulePhoto moduleKey="staff" photoKey={`staff:${member.roleKey}`} />
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/72 to-black/20`} />
                        <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${meta.accent}`} />

                        <div className="absolute right-3 top-3 z-20">
                          <button
                            type="button"
                            title={member.description}
                            aria-label={`${member.name} ინფორმაცია`}
                            className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-black/45 text-white/70 backdrop-blur-sm transition hover:border-emerald-300/24 hover:bg-emerald-300/10 hover:text-white"
                          >
                            <CircleQuestionMark className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-16">
                          <div className={`mb-1.5 h-px w-6 border-t ${meta.accentSoft.includes('cyan') ? 'border-cyan-200/24' : meta.accentSoft.includes('red') ? 'border-red-200/24' : meta.accentSoft.includes('amber') ? 'border-amber-200/24' : 'border-emerald-200/24'}`} />
                          <p className="truncate text-base font-black leading-tight text-white">{member.name}</p>

                          <div className="mt-3 flex gap-2">
                          {!member.isHired ? (
                            <button
                              type="button"
                              disabled={hirePending}
                              onClick={() => onRunPlayerAction(`staff:hire:${member.roleKey}`, () => hirePlayManagerStaff(member.roleKey))}
                              className="flex-1 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {hirePending ? 'მუშავდება...' : 'დაქირავება'}
                            </button>
                          ) : canUpgrade ? (
                            <button
                              type="button"
                              disabled={upgradePending}
                              onClick={() => onRunPlayerAction(`staff:upgrade:${member.roleKey}`, () => upgradePlayManagerStaff(member.roleKey))}
                              className="flex-1 rounded-xl border border-yellow-300/18 bg-yellow-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-yellow-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {upgradePending ? 'მუშავდება...' : 'აფგრეიდი'}
                            </button>
                          ) : (
                            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[11px] font-black text-white/42">
                              {capReached ? 'Division cap reached' : 'დაქირავებულია'}
                            </div>
                          )}
                          </div>
                        </div>
                      </SpotlightCard>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'finance') {
    const stadiumLevel = facilities.arena?.level ?? 1;
    const stadiumCapacity = getStadiumCapacity(stadiumLevel);
    const projectedAttendance = getProjectedAttendance({
      formPercent: snapshot.formPercent,
      readiness: matchSettingsDraft.readiness,
      ticketPrice: ticketPriceDraft,
      stadiumLevel,
    });
    const projectedIncome = getProjectedMatchdayIncome({
      attendance: projectedAttendance,
      ticketPrice: ticketPriceDraft,
    });
    const stadiumUpgradeCost = `${fmtInt(getFacilityUpgradeCostGel('arena', stadiumLevel))} ₾`;
    const stadiumCanUpgrade = manager.level >= stadiumLevel + 1;
    const stadiumUpgradePending = pendingAction === 'arena:facility_upgrade';
    const occupancyPct = Math.min(100, Math.round((projectedAttendance / stadiumCapacity) * 100));
    const incomePerSeat = projectedAttendance > 0 ? Math.round(projectedIncome / projectedAttendance) : 0;
    const priceMood =
      ticketPriceDraft <= 24
        ? 'დასწრება იზრდება, მაგრამ ერთ გულშემატკივარზე შემოსავალი დაბალია.'
        : ticketPriceDraft >= 56
          ? 'ფასი მაღალია: შემოსავალი დიდია, მაგრამ დასწრების ვარდნის რისკი მატულობს.'
          : 'ბალანსიანი ფასი: დასწრება და შემოსავალი სტაბილურ ზონაშია.';

    if (moduleKey === 'tickets') {
      return (
        <GamePanel title="სტადიონის მენეჯმენტი" icon={<Trophy className="h-4 w-4" />}>
          <div className="relative overflow-hidden rounded-none border border-emerald-300/16 bg-black/45 p-5 min-h-[260px]">
            <Image
              src="/playmanager/module-cards/arena/stadium-economy.webp"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover opacity-52 saturate-[0.95]"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/24" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/64">
                    Arena revenue
                  </p>
                  <h3 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">
                    სტადიონი Level {stadiumLevel}
                  </h3>
                </div>
                <span className="rounded-none relative z-20 border border-emerald-300/22 bg-emerald-300/10 px-4 py-3 text-right">
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55">
                    ტევადობა
                  </span>
                  <span className="mt-1 block text-xl font-black text-white">{fmtInt(stadiumCapacity)}</span>
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="ბილეთის ფასი" value={`${fmtInt(ticketPriceDraft)} ₾`} />
                <MiniStat label="დასწრება" value={fmtInt(projectedAttendance)} />
                <MiniStat label="შევსება" value={`${occupancyPct}%`} />
                <MiniStat label="მატჩის შემოსავალი" value={formatGel(projectedIncome)} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-none border border-white/10 bg-black/34 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Ticket desk</p>
                  <h4 className="mt-1 text-2xl font-black text-white">{fmtInt(ticketPriceDraft)} ₾</h4>
                  <p className="mt-2 max-w-xl text-xs font-bold leading-5 text-white/54">{priceMood}</p>
                </div>
                <button
                  type="button"
                  disabled={pendingAction === 'ticket:save'}
                  onClick={() => onRunPlayerAction('ticket:save', () => savePlayManagerTicketPrice(ticketPriceDraft))}
                  className="rounded-none border border-yellow-300/18 bg-yellow-300/10 px-5 py-3 text-xs font-black text-white transition hover:bg-yellow-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingAction === 'ticket:save' ? 'ინახება...' : 'ფასის შენახვა'}
                </button>
              </div>

              <input
                type="range"
                min={10}
                max={80}
                step={1}
                value={ticketPriceDraft}
                onChange={(event) => setTicketPriceDraft(Number(event.currentTarget.value))}
                className="mt-6 h-2 w-full cursor-pointer accent-emerald-300"
              />
              <div className="mt-2 flex justify-between text-[10px] font-black text-white/36">
                <span>10 ₾</span>
                <span>80 ₾</span>
              </div>

              <div className="mt-5 rounded-none border border-emerald-300/12 bg-emerald-300/[0.05] p-4">
                <div className="flex items-center justify-between gap-3 text-xs font-black text-white">
                  <span>სტადიონის შევსება</span>
                  <span>{occupancyPct}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-lime-300 to-emerald-300"
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <MiniStat label="ფასი × დასწრება" value={formatGel(projectedIncome)} />
                  <MiniStat label="ერთ გულშემატკივარზე" value={`${fmtInt(incomePerSeat)} ₾`} />
                  <MiniStat label="ფორმა" value={`${snapshot.formPercent}%`} />
                </div>
              </div>
            </div>

            <div className="rounded-none border border-yellow-300/14 bg-yellow-300/[0.045] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/56">
                Infrastructure
              </p>
              <h4 className="mt-1 text-xl font-black text-white">სტადიონის გაფართოება</h4>
              <p className="mt-2 text-xs font-bold leading-5 text-white/54">
                ეს ერთჯერადი ინფრასტრუქტურული upgrade-ია და არა მატჩის ხარჯი. მომავალში უნდა ზრდიდეს
                ტევადობას, საშინაო ზეწოლას და matchday შემოსავლის ჭერს.
              </p>
              <div className="mt-4 grid gap-2">
                <MiniStat label="შემდეგი დონე" value={`LVL ${stadiumLevel + 1}`} />
                <MiniStat label="ღირებულება" value={stadiumUpgradeCost} />
                <MiniStat label="მენეჯერის მოთხოვნა" value={`LVL ${stadiumLevel + 1}`} />
              </div>
              {stadiumCanUpgrade ? (
                <button
                  type="button"
                  disabled={stadiumUpgradePending}
                  onClick={() => onRunAction('arena', 'facility_upgrade')}
                  className="mt-4 w-full rounded-none border border-yellow-300/22 bg-yellow-300/12 px-5 py-3 text-xs font-black text-white transition hover:bg-yellow-300/18 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {stadiumUpgradePending ? 'მუშავდება...' : 'სტადიონის გაუმჯობესება'}
                </button>
              ) : (
                <div className="mt-4 rounded-none border border-white/8 bg-black/26 px-4 py-3 text-xs font-black text-white/44">
                  ჯერ საჭიროა Manager Level {stadiumLevel + 1}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-none border border-white/10 bg-black/30 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">როგორ ითვლება</p>
            <div className="mt-4 grid gap-2 lg:grid-cols-3">
              <div className="rounded-none border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm font-black text-white">დასწრება</p>
                <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                  ფორმა, მზადყოფნა და ბილეთის ფასი ერთად ქმნის პროგნოზს.
                </p>
              </div>
              <div className="rounded-none border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm font-black text-white">შემოსავალი</p>
                <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                  ბილეთის ფასი მრავლდება მოსალოდნელ დასწრებაზე და მრგვალდება 500₾-ზე.
                </p>
              </div>
              <div className="rounded-none border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm font-black text-white">upgrade</p>
                <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                  დიდი თანხაა, რადგან ინფრასტრუქტურაა. ეს არ უნდა ერეოდეს ყოველდღიურ ბილეთის კონტროლში.
                </p>
              </div>
            </div>
          </div>
        </GamePanel>
      );
    }

    return (
      <GamePanel title="ეკონომიკის კონტროლი" icon={<Coins className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-4">
          <FinanceCard label="ბალანსი" value={team.balanceLabel} tone="green" />
          <FinanceCard label="სპონსორი" value={snapshot.finance.sponsorWeeklyAmountLabel} tone="green" />
          <FinanceCard label="ხელფასები" value={snapshot.finance.weeklyWagesLabel} tone="red" />
          <FinanceCard label="კვირა" value={`W${snapshot.clock.weekNo} / D${snapshot.clock.dayNo}`} tone="gold" />
        </div>

        {/* STADIUM MANAGEMENT — moved from Arena */}
        <div className="mt-3 rounded-none border border-white/10 bg-black/28 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">სტადიონის მენეჯმენტი</p>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-black text-emerald-100">
              LVL {stadiumLevel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <MiniStat label="ტევადობა" value="45,000" />
            <MiniStat label="ფანების განწყობა" value={`${snapshot.formPercent}%`} />
            <MiniStat label="მოსალოდნელი დასწრება" value={fmtInt(projectedAttendance)} />
            <MiniStat label="სავარაუდო შემოსავალი" value={formatGel(projectedIncome)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-none border border-emerald-300/12 bg-black/35 p-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-white">სტადიონის გაფართოება → LVL {stadiumLevel + 1}</p>
              <p className="mt-0.5 text-[11px] font-bold text-emerald-100/60">
                +matchday income · სახლის უპირატესობა · {stadiumUpgradeCost}
              </p>
            </div>
            {stadiumCanUpgrade ? (
              <button
                type="button"
                disabled={stadiumUpgradePending}
                onClick={() => onRunAction('arena', 'facility_upgrade')}
                className="shrink-0 rounded-xl border border-yellow-300/22 bg-yellow-300/12 px-5 py-3 text-xs font-black text-white transition hover:bg-yellow-300/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {stadiumUpgradePending ? 'მუშავდება...' : 'გაუმჯობესება'}
              </button>
            ) : (
              <span className="shrink-0 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11px] font-black text-white/38">
                🔒 Manager Lv {stadiumLevel + 1}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-none border border-white/10 bg-black/28 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Sponsor desk</p>
                <p className="mt-2 text-xl font-black text-white">{snapshot.finance.sponsorTier}</p>
                <p className="mt-1 text-sm font-bold text-emerald-100/60">
                  {snapshot.finance.sponsorWeeklyAmountLabel} every week
                </p>
              </div>
              <button
                type="button"
                disabled={pendingAction === 'sponsor:negotiate'}
                onClick={() => onRunPlayerAction('sponsor:negotiate', () => negotiatePlayManagerSponsor())}
                className="rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === 'sponsor:negotiate' ? 'მუშავდება...' : 'სპონსორის მოლაპარაკება'}
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniStat label="WEEKLY IN" value={snapshot.finance.sponsorWeeklyAmountLabel} />
              <MiniStat label="WEEKLY OUT" value={snapshot.finance.weeklyWagesLabel} />
              <MiniStat
                label="NET"
                value={formatGel(snapshot.finance.sponsorWeeklyAmount - snapshot.finance.weeklyWages)}
              />
            </div>
          </div>
          <div className="rounded-none border border-white/10 bg-black/28 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Ticket desk</p>
            <p className="mt-2 text-xl font-black text-white">{fmtInt(ticketPriceDraft)} ₾</p>
            <input
              type="range"
              min={10}
              max={80}
              step={1}
              value={ticketPriceDraft}
              onChange={(event) => setTicketPriceDraft(Number(event.currentTarget.value))}
              className="mt-4 h-2 w-full cursor-pointer accent-emerald-300"
            />
            <button
              type="button"
              disabled={pendingAction === 'ticket:save'}
              onClick={() => onRunPlayerAction('ticket:save', () => savePlayManagerTicketPrice(ticketPriceDraft))}
              className="mt-4 w-full rounded-xl border border-yellow-300/18 bg-yellow-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-yellow-300/16 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingAction === 'ticket:save' ? 'ინახება...' : 'ბილეთის ფასის შენახვა'}
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {snapshot.transactions.slice(0, 4).map((transaction) => (
            <div key={`${transaction.reason}-${transaction.createdAt}`} className="pm-table-row">
              <Coins className="h-4 w-4 text-emerald-200" />
              <strong>{transaction.reason}</strong>
              <span>{transaction.amountLabel}</span>
              <span>{new Date(transaction.createdAt).toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'media') {
    return (
      <GamePanel title="მედია და ფანები" icon={<RadioTower className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-[280px_1fr]">
          <div className="pm-game-row">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">რეპუტაცია</p>
            <p className="mt-2 text-3xl font-black text-white">{snapshot.clock.label}</p>
            <p className="mt-2 text-sm font-bold text-emerald-100/60">
              {snapshot.eventFeed.length} active event · {snapshot.matchSettings.injuredCount} medical flags
            </p>
          </div>
          <div className="space-y-2">
            {snapshot.eventFeed.length > 0 ? (
              snapshot.eventFeed.map((event) => (
                <div key={event.id} className="pm-table-row">
                  <Sparkles className={`h-4 w-4 ${event.accent === 'red' ? 'text-red-200' : event.accent === 'gold' ? 'text-yellow-200' : 'text-emerald-200'}`} />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{event.title}</strong>
                    {event.detail ? (
                      <p className="mt-1 truncate text-[11px] font-bold text-white/48">{event.detail}</p>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-black text-white/38">W{event.weekNo} D{event.dayNo}</span>
                </div>
              ))
            ) : (
              MEDIA_ITEMS.map((item) => (
                <div key={item} className="pm-table-row">
                  <Sparkles className="h-4 w-4 text-emerald-200" />
                  <strong>{item}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'arena') {
    const playedCount = snapshot.matchHistory.length;
    const upcomingMatches = [
      getUpcomingMatch(playedCount, 0),
      getUpcomingMatch(playedCount, 1),
      getUpcomingMatch(playedCount, 2),
    ];
    const nextMatch = upcomingMatches[0];
    const activeTournamentCup = snapshot.cups.find(
      (cup) => cup.isRegistered && (cup.status === 'registration' || cup.status === 'in_progress'),
    );

    const lineupIds = [...lineupDraft.starters, ...lineupDraft.bench, ...lineupDraft.reserves].map((player) => player.id);

    function getUpcomingMatch(played: number, offset: number) {
      const round = played + 1 + offset;
      const nextRowOrder = PLAYMANAGER_FIXTURE_ROW_ORDER[(played + offset) % PLAYMANAGER_FIXTURE_ROW_ORDER.length];
      const name = PLAYMANAGER_AI_CLUBS.find((c) => c.rowOrder === nextRowOrder)?.name ?? 'Liverpool AIFC';
      return { round, opponent: name };
    }


    const selectedLineupPlayer =
      [...lineupDraft.starters, ...lineupDraft.bench, ...lineupDraft.reserves].find(
        (player) => player.id === selectedLineupPlayerId,
      ) ?? lineupDraft.starters[0] ?? lineupDraft.bench[0] ?? lineupDraft.reserves[0] ?? null;

    if (arenaView === 'lineup') {
      return (
          <div className="mx-auto w-full max-w-[1400px] rounded-none border border-emerald-300/16 bg-black/34 p-4 shadow-[inset_0_0_34px_rgba(16,185,129,0.08)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href="/playmanager/arena"
                  className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/16 bg-emerald-300/8 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-emerald-300/14"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  არენა
                </Link>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55">Squad Builder</p>
                <h3 className="mt-1 text-2xl font-black text-white">შემადგენლობა</h3>
                <p className="mt-1 text-xs font-bold text-white/48">
                  სასტარტო {lineupDraft.starters.length}/11 · სათადარიგო {lineupDraft.bench.length}/4 · რეზერვი {lineupDraft.reserves.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={activeFormation}
                  onChange={(e) => applyFormation(e.target.value)}
                  className="rounded-xl border border-emerald-300/20 bg-emerald-300/12 px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-300/40"
                >
                  {Object.keys(PRESET_FORMATIONS).map(f => (
                    <option key={f} value={f} className="bg-[#030b07] text-white font-bold">{f}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pendingAction === 'lineup:save'}
                  onClick={() => onRunPlayerAction('lineup:save', () => savePlayManagerLineup(lineupIds))}
                  className="rounded-xl border border-emerald-300/20 bg-emerald-300/12 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingAction === 'lineup:save' ? 'ინახება...' : 'შემადგენლობის შენახვა'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
              <div>
                <div className="relative mx-auto h-[min(84vh,1000px)] min-h-[780px] w-full overflow-hidden rounded-none border border-emerald-300/22 bg-[linear-gradient(180deg,#051e11,#0c351c_50%,#051e11)] shadow-[0_22px_60px_rgba(0,0,0,0.42)]">
                  {/* Pitch Lines (Vertical Half Pitch) */}
                  <div className="absolute inset-4 rounded-t-2xl border-t border-x border-white/10" />
                  <div className="absolute top-4 left-4 right-4 h-px bg-white/10" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full border border-white/10" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-36 w-72 border-t border-x border-white/10" />
                  <div className="absolute bottom-[148px] left-1/2 -translate-x-1/2 h-16 w-32 rounded-t-full border-t border-x border-white/10" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-12 w-28 border-t border-x border-white/10" />
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.015)_0,rgba(255,255,255,0.015)_1px,transparent_1px,transparent_40px)]" />

                  {pitchPositionsFormatted.map((pos) => {
                    const player = lineupDraft.starters[pos.index];
                    return (
                      <div
                        key={`${pos.label}-${pos.index}`}
                        style={{ top: pos.top, left: pos.left }}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                      >
                        {player ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLineupPlayerId(player.id)}
                            className={`group shrink-0 rounded-[1.6rem] transition-all duration-300 hover:-translate-y-1 focus:outline-none ${
                              selectedLineupPlayerId === player.id
                                ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-transparent shadow-[0_0_24px_rgba(52,211,153,0.35)]'
                                : ''
                            }`}
                          >
                            <div className="w-[95px] h-[131px] flex items-center justify-center overflow-visible">
                              <div style={{ transform: 'scale(0.38)', transformOrigin: 'center' }} className="shrink-0">
                                <PlayerFutCard
                                  name={player.name}
                                  position={player.position}
                                  ovr={player.ovrCurrent}
                                  role={player.role}
                                  availability={player.availability}
                                  talent={player.talent}
                                  editorConfig={DEFAULT_FUT_CARD_EDITOR_CONFIG}
                                />
                              </div>
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActivePitchSlot(pos.label)}
                            className="flex flex-col items-center justify-center h-[82px] w-[60px] rounded-xl border border-dashed border-white/18 bg-black/45 text-[9px] font-black text-white/34 hover:border-emerald-300/35 hover:text-emerald-100 transition-all"
                          >
                            <span className="text-[11px] opacity-60">➕</span>
                            <span className="mt-0.5">{pos.label}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {activePitchSlot ? (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md">
                      <div className="w-full max-w-md rounded-none border border-emerald-300/18 bg-[#030b07] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-black text-white">{activePitchSlot} პოზიცია</p>
                          <button
                            type="button"
                            onClick={() => setActivePitchSlot(null)}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-white/58 hover:text-white"
                          >
                            დახურვა
                          </button>
                        </div>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {[...lineupDraft.bench, ...lineupDraft.reserves].map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => {
                                movePlayer('starter', player.id);
                                setActivePitchSlot(null);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-left transition hover:border-emerald-300/24 hover:bg-emerald-300/8"
                            >
                              <span className="min-w-0">
                                <strong className="block truncate text-sm text-white">{player.name}</strong>
                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                                  {player.position} · {player.role === 'bench' ? 'სათადარიგო' : 'რეზერვი'}
                                </span>
                              </span>
                              <span className="pm-rating-pill">{player.ovrCurrent}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <PlayerStrip
                  title="სათადარიგო მოთამაშეები"
                  players={lineupDraft.bench}
                  selectedPlayerId={selectedLineupPlayerId}
                  onSelect={setSelectedLineupPlayerId}
                />
                <PlayerStrip
                  title="რეზერვისტები"
                  players={lineupDraft.reserves}
                  selectedPlayerId={selectedLineupPlayerId}
                  onSelect={setSelectedLineupPlayerId}
                />
              </div>

              <div className="space-y-4">
                <LineupPlayerCard
                  player={selectedLineupPlayer}
                  onMove={movePlayer}
                />
                <PitchPositionsEditor
                  positions={pitchPositions}
                  onChange={setPitchPositions}
                />
              </div>
            </div>

            {/* TACTICS SETTINGS */}
            <div className="mt-3 rounded-none border border-white/10 bg-black/28 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42 mb-3">ტაქტიკის დაყენება</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MatchdaySelect
                  label="სტილი (Style)"
                  value={matchSettingsDraft.tacticalStyle}
                  options={[
                    ['balanced', 'Balanced (ბალანსირებული)'],
                    ['pressing', 'Pressing (პრესინგი)'],
                    ['possession', 'Possession (ფლობა)'],
                    ['counter', 'Counter (კონტრშეტევა)'],
                  ]}
                  onChange={(value) => updateMatchSetting('tacticalStyle', value)}
                />
                <MatchdaySelect
                  label="დაცვის ხაზი (Line)"
                  value={matchSettingsDraft.defensiveLine}
                  options={[
                    ['low', 'Low (დაბალი)'],
                    ['mid', 'Mid (საშუალო)'],
                    ['high', 'High (მაღალი)'],
                  ]}
                  onChange={(value) => updateMatchSetting('defensiveLine', value)}
                />
                <MatchdaySelect
                  label="ტემპი (Tempo)"
                  value={matchSettingsDraft.tempo}
                  options={[
                    ['controlled', 'Controlled (კონტროლი)'],
                    ['balanced', 'Balanced (საშუალო)'],
                    ['direct', 'Direct (სწრაფი)'],
                  ]}
                  onChange={(value) => updateMatchSetting('tempo', value)}
                />
                <MatchdaySelect
                  label="ფოკუსი (Focus)"
                  value={matchSettingsDraft.focusSide}
                  options={[
                    ['left', 'Left (მარცხნიდან)'],
                    ['center', 'Center (ცენტრიდან)'],
                    ['right', 'Right (მარჯვნიდან)'],
                  ]}
                  onChange={(value) => updateMatchSetting('focusSide', value)}
                />
              </div>
              <button
                type="button"
                disabled={pendingAction === 'match-settings:save'}
                onClick={() =>
                  onRunPlayerAction('match-settings:save', () =>
                    savePlayManagerMatchSettings({
                      tacticalStyle: matchSettingsDraft.tacticalStyle,
                      defensiveLine: matchSettingsDraft.defensiveLine,
                      tempo: matchSettingsDraft.tempo,
                      focusSide: matchSettingsDraft.focusSide,
                    }),
                  )
                }
                className="mt-3 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-5 py-2.5 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === 'match-settings:save' ? 'ინახება...' : 'ტაქტიკის შენახვა'}
              </button>
            </div>
          </div>
      );
    }

    return (
      <>
        <div className="overflow-hidden rounded-none border border-emerald-500/24 bg-gradient-to-br from-emerald-950/70 via-black/85 to-black/90 p-5 shadow-[inset_0_0_30px_rgba(16,185,129,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
              შემდეგი მატჩი · {activeTournamentCup ? activeTournamentCup.name : `ლიგა · ${nextMatch.round} ტური`}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
              🏟️ საშინაო
            </span>
          </div>

          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">მასპინძელი</p>
              <p className="mt-1 truncate text-xl font-black text-white">{team.name}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center justify-self-center rounded-full border border-white/12 bg-black/50 text-xs font-black text-emerald-200">
              VS
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">მოწინააღმდეგე</p>
              <p className="mt-1 truncate text-xl font-black text-white">{nextMatch.opponent}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-black text-white/72">
              მზადყოფნა {matchSettingsDraft.readiness}% · XI {lineupDraft.starters.length}/11
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 text-[11px] font-black text-emerald-100/80">
              ⚡ სახლის უპირატესობა +{clubEffects.bonuses.matchdayIncomePct}% · სტადიონი LVL {facilities.arena?.level ?? 1}
            </span>
          </div>

          <button
            type="button"
            disabled={pendingAction === 'league:league_sim' || lineupDraft.starters.length !== 11}
            onClick={() => onRunAction('league', 'league_sim')}
            className="mt-4 w-full rounded-none bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-base font-black text-black shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none"
          >
            {pendingAction === 'league:league_sim'
              ? 'მატჩი მიმდინარეობს...'
              : lineupDraft.starters.length !== 11
                ? `შეავსე შემადგენლობა (${lineupDraft.starters.length}/11)`
                : 'მატჩის დაწყება ⚽'}
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <ArenaLineupCard
            startersCount={lineupDraft.starters.length}
            benchCount={lineupDraft.bench.length}
            formPercent={snapshot.formPercent}
          />
          <ArenaTournaments cups={snapshot.cups} />
          <ArenaQuickLinks recentForm={snapshot.matchHistory.slice(0, 5).map((match) => match.result)} />
        </div>

      </>
    );
  }

  return (
    <GamePanel title="Matchday ოპერაციები" icon={<Trophy className="h-4 w-4" />}>
      <div className="grid gap-2 lg:grid-cols-4">
        <FinanceCard label="შემდეგი მატჩი" value={snapshot.nextMatchLabel} tone="green" />
        <FinanceCard label="ფორმა" value={`${snapshot.formPercent}%`} tone="green" />
        <FinanceCard label="ბოლო შემოსავალი" value={snapshot.matchHistory[0]?.incomeLabel ?? '₾0'} tone="gold" />
        <FinanceCard label="ბოლო შედეგი" value={snapshot.matchHistory[0] ? `${snapshot.matchHistory[0].result} ${snapshot.matchHistory[0].score}` : 'Pending'} tone="green" />
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-2">
          {snapshot.matchHistory.length > 0 ? (
            snapshot.matchHistory.map((match) => (
              <div key={`${match.round}-${match.opponent}`} className="pm-table-row">
                <span className="text-white/42">R{match.round}</span>
                <strong>{match.opponent}</strong>
                <span>{match.result} {match.score}</span>
                <span>{match.incomeLabel}</span>
                <span>{match.attendanceLabel}</span>
              </div>
            ))
          ) : (
            <div className="pm-game-row">
              <p className="text-sm font-black text-white">ჯერ მატჩის ისტორია არ არსებობს</p>
              <p className="mt-2 text-xs font-bold text-white/48">League Center-იდან პირველი ტური გაუშვი და არენაზე შედეგი გამოჩნდება.</p>
            </div>
          )}
        </div>
        <div className="pm-game-row">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Matchday feed</p>
          <p className="mt-2 text-xl font-black text-white">{snapshot.matchHistory[0]?.opponent ?? 'Season Kickoff'}</p>
          <p className="mt-2 text-sm font-bold text-emerald-100/70">
            {snapshot.matchHistory[0]
              ? `${snapshot.matchHistory[0].venue} · Fan mood ${snapshot.matchHistory[0].fanMood}%`
              : 'საშინაო ატმოსფერო მზად არის პირველ ტურზე'}
          </p>
        </div>
      </div>
    </GamePanel>
  );
}

function ArenaLineupCard({
  startersCount,
  benchCount,
  formPercent,
}: {
  startersCount: number;
  benchCount: number;
  formPercent: number;
}) {
  const complete = startersCount === 11;
  return (
    <Link
      href="/playmanager/arena/lineup"
      className="group block overflow-hidden rounded-none border border-emerald-300/16 bg-black/30 p-5 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.06]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-none border border-emerald-300/22 bg-emerald-300/10 text-emerald-100">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Squad</p>
            <h3 className="mt-0.5 text-lg font-black text-white">შემადგენლობა და ტაქტიკა</h3>
            <p className="mt-1 text-xs font-bold text-emerald-100/56">
              სასტარტო {startersCount}/11 · სათადარიგო {benchCount}/4 · ფორმა {formPercent}%
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
            complete
              ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100'
              : 'border-yellow-300/26 bg-yellow-300/10 text-yellow-100'
          }`}
        >
          {complete ? 'მზადაა →' : `${startersCount}/11 →`}
        </span>
      </div>
    </Link>
  );
}

type ArenaTournamentSlot = {
  key: 'champions' | 'open' | 'active' | 'completed';
  title: string;
  eyebrow: string;
  emptyLabel: string;
  cup: PlayManagerCitySnapshot['cups'][number] | null;
};

function CupCard({
  slot,
}: {
  slot: ArenaTournamentSlot;
}) {
  const cup = slot.cup;
  const photoKey = `cup:${slot.key}`;

  if (!cup) {
    return (
      <div className="group/module relative block aspect-[4/3] min-w-[248px] basis-[248px] overflow-hidden rounded-xl border border-dashed border-white/12 bg-black/65 lg:min-w-0 lg:flex-1">
        <ModulePhoto moduleKey="daily_cups" photoKey={photoKey} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/56 to-black/20" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent" />

        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex rounded-full border border-white/16 bg-black/36 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur">
              {slot.eyebrow}
            </span>
            <span className="shrink-0 rounded-full border border-white/12 bg-black/42 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white/48 backdrop-blur">
              Empty
            </span>
          </div>

          <div className="mt-auto">
            <div className="mb-3 h-px w-16 border-t border-white/24" />
            <h4 className="line-clamp-2 text-lg font-black uppercase tracking-[0.04em] text-white">{slot.title}</h4>
            <p className="mt-1 text-[11px] font-bold text-white/52">{slot.emptyLabel}</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-1/4 rounded-full bg-gradient-to-r from-white/30 to-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = {
    registration: { label: 'რეგისტრაცია', cls: 'border-emerald-300/26 bg-emerald-300/10 text-emerald-100' },
    in_progress: { label: 'მიმდინარეობს', cls: 'border-red-300/26 bg-red-400/10 text-red-100' },
    completed: { label: 'დასრულდა', cls: 'border-white/12 bg-white/[0.05] text-white/55' },
  }[cup.status];
  const fillPct = Math.min(100, Math.round((cup.participantCount / Math.max(1, cup.maxTeams)) * 100));
  const cupTheme = getCupTheme(cup.templateId);
  return (
    <Link
      href={`/playmanager/cups/${cup.templateId}`}
      className={`group/module relative block aspect-[4/3] min-w-[248px] basis-[248px] overflow-hidden rounded-xl border bg-black/65 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(0,0,0,0.38)] lg:min-w-0 lg:flex-1 ${cupTheme.cardBorder}`}
    >
      <ModulePhoto moduleKey="daily_cups" photoKey={photoKey} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/54 to-black/16" />
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${cupTheme.accentGlow}`} />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/72 to-transparent" />

      <div className="relative flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur ${cupTheme.kicker}`}>
              {slot.eyebrow}
            </span>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/46">{slot.title}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] backdrop-blur ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          <div className={`relative grid h-20 w-20 place-items-center rounded-full border backdrop-blur-sm ${cupTheme.trophyRing}`}>
            <div className={`absolute inset-1 rounded-full ${cupTheme.trophyGlow}`} />
            <Trophy className={`relative h-9 w-9 ${cupTheme.trophyIcon}`} />
          </div>
        </div>

        <div className="mt-auto">
          <div className={`mb-3 h-px w-16 border-t ${cupTheme.rule}`} />
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-lg font-black uppercase tracking-[0.04em] text-white">{cup.name}</h4>
            <p className="mt-1 text-[11px] font-bold text-white/70">საპრიზო {cup.prizePoolLabel}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black text-white/58">
            <span>{cup.participantCount}/{cup.maxTeams} გუნდი</span>
            <span className={cup.isRegistered ? 'text-emerald-300' : 'text-white/56'}>
              {cup.isRegistered ? '✓ ჩართული' : `შესვლა ${cup.entryFeeLabel}`}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <span style={{ width: `${fillPct}%` }} className={`block h-full rounded-full bg-gradient-to-r ${cupTheme.progress}`} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArenaTournaments({ cups }: { cups: PlayManagerCitySnapshot['cups'] }) {
  const championsCup = cups.find((cup) => cup.templateId === 'champions_cup') ?? null;
  const openCup = cups.find((cup) => cup.status === 'registration' && cup.templateId !== 'champions_cup') ?? null;
  const activeCup = cups.find((cup) => cup.status === 'in_progress' && cup.templateId !== 'champions_cup') ?? null;
  const completedCup = cups.find((cup) => cup.status === 'completed' && cup.templateId !== 'champions_cup') ?? null;

  const slots: ArenaTournamentSlot[] = [
    {
      key: 'champions',
      title: 'დივიზიონის ჩემპიონთა თასი',
      eyebrow: 'Champions Cup',
      emptyLabel: 'ჯერ არ არის აქტიური ჩემპიონთა თასი',
      cup: championsCup,
    },
    {
      key: 'open',
      title: 'ღია თასი',
      eyebrow: 'Open Cup',
      emptyLabel: 'ჯოინისთვის ღია თასი ჯერ არ არის',
      cup: openCup,
    },
    {
      key: 'active',
      title: 'დაწყებული თასი',
      eyebrow: 'In Progress',
      emptyLabel: 'მიმდინარე თასი ჯერ არ არის',
      cup: activeCup,
    },
    {
      key: 'completed',
      title: 'დასრულებული თასი',
      eyebrow: 'Completed',
      emptyLabel: 'დასრულებული თასი ჯერ არ არის',
      cup: completedCup,
    },
  ];

  return (
    <div className="overflow-hidden rounded-none border border-yellow-300/16 bg-black/30 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-none border border-yellow-300/24 bg-yellow-300/10 text-yellow-100">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Tournaments</p>
            <h3 className="mt-0.5 text-lg font-black text-white">ტურნირები</h3>
          </div>
        </div>
        <Link
          href="/playmanager/league"
          className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:text-white"
        >
          ლიგის ცენტრი →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {slots.map((slot) => (
          <CupCard key={slot.key} slot={slot} />
        ))}
      </div>
    </div>
  );
}

function getCupTheme(templateId: string) {
  const themes: Record<string, {
    label: string;
    cardBorder: string;
    accentGlow: string;
    kicker: string;
    trophyRing: string;
    trophyGlow: string;
    trophyIcon: string;
    progress: string;
    rule: string;
  }> = {
    champions_cup: {
      label: 'Elite Cup',
      cardBorder: 'border-yellow-300/22 hover:border-yellow-300/42',
      accentGlow: 'from-yellow-300/24 via-yellow-300/8 to-transparent',
      kicker: 'border-yellow-300/28 bg-black/34 text-yellow-100',
      trophyRing: 'border-yellow-300/32 bg-yellow-300/12',
      trophyGlow: 'bg-[radial-gradient(circle,rgba(250,204,21,0.26),transparent_72%)]',
      trophyIcon: 'text-yellow-300',
      progress: 'from-yellow-300 via-amber-300 to-emerald-400',
      rule: 'border-yellow-200/34',
    },
    daily_cup: {
      label: 'Daily Cup',
      cardBorder: 'border-emerald-300/18 hover:border-emerald-300/38',
      accentGlow: 'from-emerald-300/20 via-emerald-300/7 to-transparent',
      kicker: 'border-emerald-300/28 bg-black/34 text-emerald-100',
      trophyRing: 'border-emerald-300/30 bg-emerald-300/10',
      trophyGlow: 'bg-[radial-gradient(circle,rgba(16,185,129,0.24),transparent_72%)]',
      trophyIcon: 'text-emerald-300',
      progress: 'from-emerald-300 via-teal-300 to-cyan-300',
      rule: 'border-emerald-200/28',
    },
    weekend_cup: {
      label: 'Weekend Cup',
      cardBorder: 'border-amber-300/18 hover:border-amber-300/38',
      accentGlow: 'from-amber-300/22 via-amber-300/7 to-transparent',
      kicker: 'border-amber-300/28 bg-black/34 text-amber-100',
      trophyRing: 'border-amber-300/30 bg-amber-300/10',
      trophyGlow: 'bg-[radial-gradient(circle,rgba(245,158,11,0.24),transparent_72%)]',
      trophyIcon: 'text-amber-300',
      progress: 'from-yellow-300 via-lime-300 to-emerald-400',
      rule: 'border-amber-200/30',
    },
  };

  return themes[templateId] ?? {
    label: 'Open Cup',
    cardBorder: 'border-white/12 hover:border-white/24',
    accentGlow: 'from-white/16 via-white/5 to-transparent',
    kicker: 'border-white/16 bg-black/34 text-white/72',
    trophyRing: 'border-white/16 bg-white/[0.05]',
    trophyGlow: 'bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)]',
    trophyIcon: 'text-white/82',
    progress: 'from-white/60 via-white/35 to-emerald-300',
    rule: 'border-white/20',
  };
}

function ArenaQuickLinks({ recentForm }: { recentForm: Array<'W' | 'D' | 'L'> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href="/playmanager/history"
        className="group flex items-center justify-between gap-3 overflow-hidden rounded-none border border-white/10 bg-black/30 p-5 transition hover:border-emerald-300/28 hover:bg-emerald-300/[0.05]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-none border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">History</p>
            <h3 className="mt-0.5 text-base font-black text-white">მატჩების ისტორია</h3>
          </div>
        </div>
        {recentForm.length > 0 ? (
          <div className="flex gap-1">
            {recentForm.map((r, i) => (
              <span
                key={i}
                className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-black ${
                  r === 'W' ? 'bg-emerald-400/20 text-emerald-300' : r === 'L' ? 'bg-red-400/20 text-red-300' : 'bg-yellow-400/20 text-yellow-300'
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
      <Link
        href="/playmanager/museum"
        className="group flex items-center justify-between gap-3 overflow-hidden rounded-none border border-white/10 bg-black/30 p-5 transition hover:border-yellow-300/28 hover:bg-yellow-300/[0.05]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-none border border-yellow-300/22 bg-yellow-300/10 text-yellow-100">
            <Star className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Museum</p>
            <h3 className="mt-0.5 text-base font-black text-white">ტროფეების მუზეუმი</h3>
          </div>
        </div>
        <span className="text-2xl">🏆</span>
      </Link>
    </div>
  );
}

function GamePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="pm-facility-module">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PlayerStrip({
  title,
  players,
  selectedPlayerId,
  onSelect,
}: {
  title: string;
  players: PlayManagerCitySnapshot['squad'];
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className="mt-3 rounded-none border border-white/10 bg-black/24 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{title}</p>
        <span className="rounded-full border border-white/10 bg-black/28 px-2 py-1 text-[10px] font-black text-white/55">
          {players.length}
        </span>
      </div>
      {players.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
          {players.map((player) => (
            <div key={player.id} className="relative shrink-0" style={{ zoom: 0.68 }}>
              <button
                type="button"
                onClick={() => onSelect(player.id)}
                className={`shrink-0 rounded-none transition-transform hover:-translate-y-1 focus:outline-none ${
                  selectedPlayerId === player.id ? 'ring-2 ring-emerald-300/60 ring-offset-2 ring-offset-transparent' : ''
                }`}
              >
                <PlayerFutCard
                  name={player.name}
                  position={player.position}
                  ovr={player.ovrCurrent}
                  role={player.role}
                  availability={player.availability}
                  talent={player.talent}
                  editorConfig={DEFAULT_FUT_CARD_EDITOR_CONFIG}
                />
              </button>
              <Link
                href={`/playmanager/players/${player.id}`}
                onClick={(event) => event.stopPropagation()}
                className="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full border border-emerald-200/36 bg-black/76 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition hover:border-emerald-100/70 hover:bg-emerald-300/18"
                aria-label={`${player.name} პროფილის გახსნა`}
                title="პროფილი"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs font-bold text-white/38">
          სია ცარიელია
        </div>
      )}
    </div>
  );
}

function LineupPlayerCard({
  player,
  onMove,
}: {
  player: PlayManagerCitySnapshot['squad'][number] | null;
  onMove: (targetRole: 'starter' | 'bench' | 'reserve', playerId: string) => void;
}) {
  const [silWidth, setSilWidth] = useState(254);
  const [silHeight, setSilHeight] = useState(179);
  const [silX, setSilX] = useState(1);
  const [silY, setSilY] = useState(9);
  const [silOpacity, setSilOpacity] = useState(1);
  const [contentY, setContentY] = useState(-91);
  const [nameSize, setNameSize] = useState(21);
  const [statsScale, setStatsScale] = useState(1);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!player) {
    return (
      <div className="rounded-none border border-dashed border-white/12 bg-black/24 p-5 text-sm font-bold text-white/42">
        მოთამაშე აირჩიე მოედანზე ან სიიდან.
      </div>
    );
  }

  const fitness = Math.max(0, 100 - player.fatigue);

  return (
    <aside className="rounded-none border border-emerald-300/16 bg-black/40 p-4 shadow-[inset_0_0_26px_rgba(16,185,129,0.08)]">
      {/* FUT card */}
      <div className="mb-4 flex justify-center">
        <PlayerFutCard
          name={player.name}
          position={player.position}
          ovr={player.ovrCurrent}
          role={player.role}
          availability={player.availability}
          talent={player.talent}
          editorConfig={{
            ...DEFAULT_FUT_CARD_EDITOR_CONFIG,
            silWidth,
            silHeight,
            silX,
            silY,
            silOpacity,
            contentY,
            nameSize,
            statsScale,
          }}
        />
      </div>
      <Link
        href={`/playmanager/players/${player.id}`}
        className="mb-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-none border border-emerald-300/18 bg-emerald-300/10 text-xs font-black text-emerald-100 transition hover:border-emerald-200/42 hover:bg-emerald-300/16"
      >
        <ExternalLink className="h-4 w-4" />
        პროფილის გვერდი
      </Link>

      {/* FUT Card Layout Editor */}
      <div className="mt-4 mb-4 rounded-none border border-white/10 bg-black/20 p-3">
        <button
          type="button"
          onClick={() => setIsEditorOpen(!isEditorOpen)}
          className="flex w-full items-center justify-between text-xs font-black uppercase tracking-[0.1em] text-emerald-400 focus:outline-none"
        >
          <span>🎨 FUT Card Layout Editor</span>
          <span>{isEditorOpen ? '▲ Close' : '▼ Open'}</span>
        </button>

        {isEditorOpen && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>WIDTH: {silWidth}px</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                value={silWidth}
                onChange={(e) => setSilWidth(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>HEIGHT: {silHeight}px</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                value={silHeight}
                onChange={(e) => setSilHeight(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>POSITION X: {silX}px</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={silX}
                onChange={(e) => setSilX(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>POSITION Y: {silY}px</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={silY}
                onChange={(e) => setSilY(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>OPACITY: {silOpacity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={silOpacity}
                onChange={(e) => setSilOpacity(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>CONTENT Y (Margin Top): {contentY}px</span>
              </div>
              <input
                type="range"
                min="-150"
                max="50"
                value={contentY}
                onChange={(e) => setContentY(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>NAME SIZE: {nameSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="36"
                value={nameSize}
                onChange={(e) => setNameSize(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>STATS SCALE: {statsScale}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={statsScale}
                onChange={(e) => setStatsScale(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="grid gap-2 rounded-xl border border-white/5 bg-black/40 p-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/56 sm:grid-cols-2">
              <span className="truncate">Silhouette {silWidth}x{silHeight}</span>
              <span className="truncate">Shift {silX}px / {silY}px</span>
              <span className="truncate">Opacity {silOpacity}</span>
              <span className="truncate">Content Y {contentY}px</span>
              <span className="truncate">Name {nameSize}px</span>
              <span className="truncate">Stats x{statsScale}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="BASE" value={String(player.ovrBase)} />
        <MiniStat label="FITNESS" value={`${fitness}%`} />
        <MiniStat label="MORALE" value={`${player.morale}%`} />
      </div>

      {player.availability === 'injured' ? (
        <p className="mt-1 mb-3 rounded-none border border-red-400/18 bg-red-950/28 px-3 py-2 text-xs font-black text-red-100">
          ტრავმა · გამოტოვებს {player.injuryMatches} მატჩს
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {player.role === 'starter' ? (
          <button
            type="button"
            onClick={() => onMove('bench', player.id)}
            className="w-full rounded-none border border-yellow-300/18 bg-yellow-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-yellow-300/16"
          >
            მოხსნა
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onMove('starter', player.id)}
            className="w-full rounded-none border border-emerald-300/20 bg-emerald-300/12 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-300/18"
          >
            სასტარტოში
          </button>
        )}

        {player.role !== 'bench' ? (
          <button
            type="button"
            onClick={() => onMove('bench', player.id)}
            className="w-full rounded-none border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.07]"
          >
            სათადარიგო
          </button>
        ) : null}

        {player.role !== 'reserve' ? (
          <button
            type="button"
            onClick={() => onMove('reserve', player.id)}
            className="w-full rounded-none border border-red-900/28 bg-red-950/24 px-4 py-3 text-xs font-black text-white transition hover:bg-red-950/34"
          >
            რეზერვი
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function MatchdaySelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="rounded-none border border-white/10 bg-black/30 px-3 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="mt-2 w-full rounded-xl border border-emerald-300/14 bg-emerald-300/8 px-3 py-2 text-sm font-black text-white outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#04110c] text-white">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/34 px-2 py-2">
      <p className="text-[9px] font-black text-white/35">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FinanceCard({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'gold' }) {
  return (
    <div className={`pm-game-row pm-finance-card-${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: FacilityStatus }) {
  if (status === 'locked') return <LockKeyhole className="h-3.5 w-3.5" />;
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'upgradeable') return <TrendingUp className="h-3.5 w-3.5" />;
  if (status === 'attention') return <Star className="h-3.5 w-3.5" />;
  return <ShieldCheck className="h-3.5 w-3.5" />;
}

interface PitchPositionsEditorProps {
  positions: Array<{ label: string; top: number; left: number; index: number }>;
  onChange: (positions: Array<{ label: string; top: number; left: number; index: number }>) => void;
}

function PitchPositionsEditor({ positions, onChange }: PitchPositionsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const current = positions[selectedIdx];

  const handleUpdate = (field: 'top' | 'left', val: number) => {
    const next = positions.map((p, idx) => {
      if (idx === selectedIdx) {
        return { ...p, [field]: val };
      }
      return p;
    });
    onChange(next);
  };

  if (!current) return null;

  return (
    <div className="rounded-none border border-emerald-300/16 bg-black/40 p-4 shadow-[inset_0_0_26px_rgba(16,185,129,0.08)]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-xs font-black uppercase tracking-[0.1em] text-emerald-400 focus:outline-none"
      >
        <span>📐 Pitch Positions Editor</span>
        <span>{isOpen ? '▲ Close' : '▼ Open'}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/38 mb-2">Select Slot</label>
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-emerald-300/14 bg-emerald-300/8 px-3 py-2 text-sm font-black text-white outline-none"
            >
              {positions.map((p, idx) => (
                <option key={`${p.label}-${idx}`} value={idx} className="bg-[#04110c] text-white">
                  {p.label} (Index {p.index})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-white/60 mb-1 font-bold">
              <span>TOP: {current.top}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={current.top}
              onChange={(e) => handleUpdate('top', Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-white/60 mb-1 font-bold">
              <span>LEFT: {current.left}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={current.left}
              onChange={(e) => handleUpdate('left', Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 mt-2">
            <span className="text-[10px] font-mono text-emerald-300 block select-all whitespace-pre max-h-40 overflow-y-auto">
              {`const PITCH_POSITIONS = [\n` +
                positions
                  .map(
                    (p) =>
                      `  { label: '${p.label}', top: '${p.top}%', left: '${p.left}%', index: ${p.index} },`
                  )
                  .join('\n') +
                `\n];`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
