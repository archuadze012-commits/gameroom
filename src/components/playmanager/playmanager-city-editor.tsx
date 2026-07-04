'use client';

import {
  Activity,
  CalendarDays,
  CircleQuestionMark,
  Coins,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Home,
  Landmark,
  MessageCircle,
  Play,
  RadioTower,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Trophy,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { StaffContextGrid } from '@/components/playmanager/staff-context-grid';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  buyPlayManagerMarketPlayer,
  buyPlayManagerListedPlayer,
  listPlayManagerPlayer,
  unlistPlayManagerPlayer,
  hirePlayManagerStaff,
  joinCupAction,
  negotiatePlayManagerSponsor,
  savePlayManagerTicketPrice,
  sellPlayManagerPlayer,
  signPlayManagerAcademyProspect,
  claimPlayManagerDailyReward,
  trainPlayManagerPlayer,
  upgradePlayManagerStaff,
  type MatchResult,
  type PlayManagerPlayerActionResult,
  type RunCityActionResult,
} from '@/app/playmanager/actions';
import SpotlightCard from '@/components/SpotlightCard';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';
import { SpotlightCard as ReactBitsSpotlightCard } from '@/components/react-bits/spotlight-card';
import { PlayManagerDirectMessages, PlayManagerGlobalChat } from '@/components/playmanager/playmanager-media-modules';
import { ScoutingReport } from '@/components/playmanager/scouting-report';
import { FitnessReport } from '@/components/playmanager/fitness-report';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { getFacilityUpgradeCostGel, isFacilityKey, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { formatGel, getPlayerWeeklyWageGel, getProjectedAttendance, getProjectedMatchdayIncome, getStadiumCapacity } from '@/lib/playmanager/economy';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import { getMaxStaffLevelForDivision, type StaffCategory } from '@/lib/playmanager/staff';
import { DEFAULT_FUT_CARD_EDITOR_CONFIG, PlayerFutCard } from './player-fut-card';
import { PLAYMANAGER_AI_CLUBS, PLAYMANAGER_FIXTURE_ROW_ORDER } from '@/lib/playmanager/league';

// Deterministic number formatter — avoids ka-GE locale mismatch between Node.js and browser ICU
function fmtInt(n: number): string {
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

type PlayManagerCityEditorProps = {
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

type FacilityStatus = 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed';

type FacilityState = {
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
  // When set, the card navigates to this route instead of opening an in-workspace
  // module — used to surface other buildings' experiences from the office hub.
  href?: string;
};

type MarketFilterKey = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT' | 'SHORTLIST';

const BUILDING_MODULES: Record<string, BuildingModule[]> = {
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

const PRIMARY_ACTION_BY_FACILITY: Record<string, CityActionKey> = {
  market: 'market_scout',
  academy: 'academy_sign',
  training: 'training_session',
  finance: 'finance_sponsor',
  league: 'league_sim',
  media: 'media_campaign',
};

const ACTION_PREVIEW: Record<string, { what: string; gets: string }> = {
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

const TRAINING_SLOTS = [
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
      className={`pm-facility-action-card w-full border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${border} ${bg}`}
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
  const gridClass =
    buildingKey === 'arena'
      ? 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'
      : modules.length <= 2
        ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
        : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="pm-module-grid-shell">
      <div className={gridClass}>
        {modules.map((module) => (
          <ModuleCard
            key={module.key}
            module={module}
            buildingKey={buildingKey}
            eagerPhoto={buildingKey === 'residence' && module.key === 'academy'}
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
  eagerPhoto,
  onOpen,
}: {
  module: BuildingModule;
  buildingKey: string;
  eagerPhoto: boolean;
  onOpen: (key: string) => void;
}) {
  const signal = getModuleSignal(module.key);
  const ModuleIcon = module.icon;

  return (
    <ReactBitsSpotlightCard
      spotlightColor={signal.spotlight}
      className={`pm-module-card group/module relative aspect-[4/3] cursor-pointer overflow-hidden border p-0 transition duration-300 hover:-translate-y-1 hover:z-10 ${signal.frame}`}
    >
      <div className="absolute inset-0">
        <button
          type="button"
          onClick={() => onOpen(module.key)}
          className="absolute inset-0 z-20 cursor-pointer focus:outline-none"
          aria-label={`${module.title} გახსნა`}
          title={`/playmanager/${buildingKey}?module=${module.key}`}
        />

        <ModulePhoto moduleKey={module.key} eager={eagerPhoto} />

        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(1,7,5,0.2),rgba(1,7,5,0.42)_45%,rgba(1,7,5,0.88))]" />

        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-4 text-center">
          <div className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/14 bg-black/36 shadow-[0_12px_40px_rgba(0,0,0,0.32)] ${signal.accent}`}>
            <ModuleIcon className="h-7 w-7" />
          </div>
          <h5 className="max-w-[18ch] text-[22px] font-black leading-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]">
            {module.title}
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
            {module.eyebrow}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className={`mx-auto h-px w-10 border-t ${signal.line}`} />
        </div>
      </div>

    </ReactBitsSpotlightCard>
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

function ModulePhoto({
  moduleKey,
  photoKey,
  eager = false,
}: {
  moduleKey: string;
  photoKey?: string;
  eager?: boolean;
}) {
  const resolvedPhotoKey = photoKey ?? moduleKey;
  const photo = getModulePhoto(resolvedPhotoKey);
  const zoomClass = resolvedPhotoKey === 'matchday' ? 'scale-[1.12] group-hover/module:scale-[1.16]' : 'scale-[1.02] group-hover/module:scale-[1.08]';

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <Image
        src={photo.src}
        alt=""
        fill
        sizes="(max-width: 768px) 92vw, (max-width: 1280px) 44vw, 30vw"
        loading={eager ? 'eager' : undefined}
        fetchPriority={eager ? 'high' : undefined}
        className={`object-cover opacity-100 saturate-100 transition-all duration-700 ease-out ${zoomClass}`}
        style={{ objectPosition: photo.position }}
      />
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
    museum: { src: '/playmanager/module-cards/arena/championships.webp', position: '50% 50%' },
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
    academy: { src: '/playmanager/city/buildings/academy.webp', position: '50% 52%' },
    academy_intake: { src: '/playmanager/city/buildings/academy.webp', position: '50% 52%' },
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
    'staff:set_piece_coach': { src: '/playmanager/module-cards/staff/attack-coach.webp', position: '50% 42%' },
  };

  return map[moduleKey] ?? { src: '/playmanager/city/environment/football-city-background.webp', position: '50% 50%' };
}

function getVisibleMarketPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let offset = -2; offset <= 2; offset += 1) {
    const page = currentPage + offset;
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  return Array.from(pages).sort((left, right) => left - right);
}

function getMarketScoutingNote(player: {
  ovr: number;
  age: number;
  talent: number;
  shortlisted: boolean;
}) {
  if (player.shortlisted) return 'უკვე შენახულ სიაშია და სწრაფად შეგიძლია დაბრუნდე';
  if (player.ovr >= 88) return '';
  if (player.age <= 22 && player.talent >= 8) return 'მაღალი ceiling-ის განვითარებადი პროექტი';
  if (player.age <= 25 && player.talent >= 7) return 'ახლავე გამოსადეგი და მომავალშიც მზარდი';
  if (player.talent >= 8) return 'ნედლი რესურსი მაღალი პოტენციალით';
  return 'როტაციისა და სიღრმისთვის გამოსადეგი ვარიანტი';
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
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-3">
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
    const target = modules.find((module) => module.key === moduleKey);
    if (target?.href) {
      router.push(target.href, { scroll: false });
      return;
    }
    router.push(`${buildingHref}?module=${moduleKey}`, { scroll: false });
  }

  return (
    <main className="pm-hq-home pm-feedskin pm-hq-shell pm-facility-command-page min-h-screen overflow-x-hidden pb-24 text-white xl:pb-0 xl:pl-[116px]">
      <LightweightSideNav />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div>
        {activeModule ? (
        <div className="mx-auto w-full max-w-[1320px]">
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
        <div className="mx-auto w-full max-w-[1360px]">
          {building.spriteKey === 'arena' ? (
            <div className="pm-arena-overview-stack lg:col-span-2">
              <div className="pm-arena-overview-sprite" aria-hidden="true">
                <Image
                  src="/playmanager/city/buildings/arena.webp"
                  alt=""
                  width={760}
                  height={608}
                  className="h-auto w-full object-contain"
                />
              </div>
              <BuildingModuleGrid modules={modules} buildingKey={building.spriteKey} onOpen={openModule} />
            </div>
          ) : null}

          <section className="pm-facility-command-hero">
            <div className="pm-facility-command-copy">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pm-facility-status pm-facility-status-${facility.status}`}>
                  {building.status}
                </span>
                <span className="pm-facility-kicker">{page.eyebrow}</span>
              </div>
              <h1>{page.title}</h1>
              <p>{page.summary || building.description}</p>

              <div className="pm-facility-live-card">
                <span className="pm-facility-live-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <b>{facilityEffect.value}</b>
                  <small>{facilityEffect.description}</small>
                </span>
              </div>
            </div>

            <div className="pm-facility-command-visual" aria-hidden="true">
              {building.spriteUrl ? (
                <Image
                  src={building.spriteUrl}
                  alt=""
                  width={760}
                  height={608}
                  priority={building.spriteKey === 'training'}
                  className="pm-facility-command-sprite"
                />
              ) : null}
              <div className="pm-facility-level-plate">
                <span>LEVEL</span>
                <b>{facility.level}</b>
              </div>
            </div>
          </section>

          <div className="pm-facility-command-body">
            <div>
              <div className="pm-section-label">
                <span>Modules</span>
                <b>{modules.length}</b>
              </div>

              {building.spriteKey !== 'arena' ? (
                <BuildingModuleGrid modules={modules} buildingKey={building.spriteKey} onOpen={openModule} />
              ) : null}

              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-3">
                {overviewMetrics.map(([label, value]) => (
                  <MiniStat key={label} label={label} value={value} />
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
                  <div className="mt-2 h-2 overflow-hidden bg-white/10">
                    <span style={{ width: `${Math.min(100, (manager.level / (facility.level + 1)) * 100)}%` }} className="block h-full bg-emerald-400/60" />
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
                  <div className="mt-2 h-2 overflow-hidden bg-white/10">
                    <span style={{ width: `${facility.progress}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                    შემდეგი: {facility.nextUnlock} · upgrade {facility.upgradeCost}
                  </p>
                </div>
              )}
            </div>

            <GamePanel title="ოპერაციები" icon={<Activity className="h-4 w-4" />}>
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
                  <div className="pm-facility-empty-card border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-black text-white/55">
                      {manager.level >= facility.level + 1
                        ? 'Upgrade მზადაა — გამოიყენე ქვემოთ'
                        : `Upgrade-ისთვის საჭიროა კიდევ ${facility.level + 1 - manager.level} Manager Level`}
                    </p>
                  </div>
                )}
                {building.spriteKey === 'arena' && manager.level < facility.level + 1 ? (
                  <div className="pm-facility-empty-card border border-white/8 bg-white/[0.03] px-4 py-3">
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
                <div className="pm-facility-result-card mt-3 border border-emerald-300/22 bg-emerald-950/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400/70">შედეგი</p>
                  <p className="mt-1 text-xs font-black text-emerald-50">{actionMessage}</p>
                </div>
              ) : null}
            </GamePanel>
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

            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-3">
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
      </div>

      <PlayManagerBottomNav />

      {matchResult ? (
        <MatchResultModal result={matchResult} onClose={onDismissMatchResult ?? (() => {})} />
      ) : null}
    </main>
  );
}

function LightweightSideNav() {
  return <PlayManagerSidebar />;
}

function opponentShort(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 14 ? `${trimmed.slice(0, 13)}…` : trimmed;
}

function MatchResultModal({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const isWin  = result.result === 'W';
  const isDraw = result.result === 'D';
  const resultColor = isWin ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
  const resultBorder = isWin ? 'border-emerald-500/30' : isDraw ? 'border-yellow-500/30' : 'border-red-500/30';
  const resultGlow  = isWin ? 'rgba(16,185,129,0.18)' : isDraw ? 'rgba(234,179,8,0.18)' : 'rgba(239,68,68,0.18)';
  const resultLabel = isWin ? 'გამარჯვება' : isDraw ? 'ფრე' : 'დამარცხება';
  const outcomeLabels: Record<string, string> = { promoted: '⬆️ გადასვლა', relegated: '⬇️ ჩამოსვლა', stayed: '✅ დარჩენა' };

  const engine = result.matchEngine;
  const homeXg = engine?.homeXg ?? 0;
  const awayXg = engine?.awayXg ?? 0;
  const xgTotal = homeXg + awayXg;
  const momentumPct = xgTotal > 0 ? Math.round((homeXg / xgTotal) * 100) : 50;
  const goalscorers = engine?.playerEvents?.goalscorers ?? [];
  const ratings = engine?.playerEvents?.ratings ?? [];
  const potm = ratings.length ? [...ratings].sort((a, b) => b.rating - a.rating)[0] : null;

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

        {/* Momentum (xG) + Player of the Match + goals */}
        {engine ? (
          <div className="border-b border-white/8 px-6 py-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                <span>მომენტუმი (xG {homeXg.toFixed(1)})</span>
                <span>{opponentShort(result.opponent)} (xG {awayXg.toFixed(1)})</span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-red-500/25">
                <span className="block h-full bg-emerald-400/80" style={{ width: `${momentumPct}%` }} />
              </div>
            </div>

            {potm ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300/22 bg-amber-300/[0.07] px-3 py-2">
                <span className="text-base">⭐</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/70">მატჩის საუკეთესო</p>
                  <p className="truncate text-xs font-black text-white">{potm.name} · {potm.position}</p>
                </div>
                <span className="rounded-lg border border-amber-300/26 bg-amber-300/12 px-2 py-1 text-sm font-black text-amber-100 tabular-nums">
                  {potm.rating.toFixed(1)}
                </span>
              </div>
            ) : null}

            {goalscorers.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm">⚽</span>
                {goalscorers.map((g) => (
                  <span key={g.playerId} className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-black text-emerald-100">
                    {g.name}{g.goals > 1 ? ` ×${g.goals}` : ''}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

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






function FacilityModule({
  spriteKey,
  moduleKey,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lineupDraft] = useState(() => ({
    starters: snapshot.starters,
    bench: snapshot.bench,
    reserves: snapshot.reserves,
  }));
  const marketFilterOptions: MarketFilterKey[] = ['ALL', 'GK', 'DEF', 'MID', 'ATT', 'SHORTLIST'];
  const marketFilterFromUrlRaw = searchParams.get('filter')?.trim().toUpperCase();
  const marketFilterFromUrl = marketFilterOptions.includes((marketFilterFromUrlRaw ?? 'ALL') as MarketFilterKey)
    ? (marketFilterFromUrlRaw as MarketFilterKey)
    : 'ALL';
  const marketSearchFromUrl = searchParams.get('q')?.trim() ?? '';
  const marketFilter = marketFilterFromUrl;
  const marketSearch = marketSearchFromUrl;
  const bootsMarketFromLiveFetch = spriteKey === 'market';
  const [marketItems, setMarketItems] = useState(() => (bootsMarketFromLiveFetch ? [] : snapshot.market));
  const [marketTotalPages, setMarketTotalPages] = useState(1);
  const [marketTotal, setMarketTotal] = useState(() => (bootsMarketFromLiveFetch ? 0 : snapshot.market.length));
  const [marketMeta, setMarketMeta] = useState<{
    freeAgents?: {
      scoutHired: boolean;
      scoutLevel: number;
      maxScoutLevel: number;
      tier: string;
      refreshesEveryHours: number;
      nextRefreshAt: string | null;
      refreshLabel: string;
    };
  }>({});
  const [marketLoading, setMarketLoading] = useState(bootsMarketFromLiveFetch);
  const [matchSettingsDraft] = useState(snapshot.matchSettings);
  const [ticketPriceDraft, setTicketPriceDraft] = useState(snapshot.finance.ticketPrice);
  const [listPriceDraft, setListPriceDraft] = useState<Record<string, string>>({});
  const marketPageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const marketPage = Number.isFinite(marketPageRaw) && marketPageRaw > 0 ? marketPageRaw : 1;
  const marketFilterLabels: Record<MarketFilterKey, string> = {
    ALL: 'ყველა',
    GK: 'მეკარე',
    DEF: 'დაცვა',
    MID: 'ნახევარდაცვა',
    ATT: 'შეტევა',
    SHORTLIST: 'შენახული',
  };
  const isFreeAgentsModule = moduleKey === 'free_agents';
  const freeAgentsMeta = marketMeta.freeAgents;
  const freeAgentsRefreshLabel = freeAgentsMeta?.refreshLabel ?? 'განახლდება სკაუტის დაქირავების შემდეგ';






  const syncMarketQueryInUrl = useCallback((updates: {
    page?: number;
    filter?: MarketFilterKey;
    q?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = updates.filter ?? marketFilter;
    const nextQuery = (updates.q ?? marketSearch).trim();
    const nextPage = updates.page ?? marketPage;

    if (nextFilter === 'ALL') {
      params.delete('filter');
    } else {
      params.set('filter', nextFilter);
    }

    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }

    if (nextPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, marketFilter, marketSearch, marketPage]);

  useEffect(() => {
    if (spriteKey !== 'market') return;
    let cancelled = false;

    async function loadMarket() {
      setMarketLoading(true);
      try {
        const params = new URLSearchParams({
          module: moduleKey ?? 'transfer_market',
          filter: marketFilter,
          page: String(marketPage),
          pageSize: isFreeAgentsModule ? '5' : '10',
        });
        if (!isFreeAgentsModule && marketSearch.trim()) params.set('q', marketSearch.trim());

        const response = await fetch(`/api/playmanager/market?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        if (!isFreeAgentsModule && typeof data.pagination?.page === 'number' && data.pagination.page !== marketPage) {
          syncMarketQueryInUrl({ page: data.pagination.page });
          return;
        }
        setMarketItems(data.items ?? []);
        setMarketTotalPages(data.pagination?.totalPages ?? 1);
        setMarketTotal(data.pagination?.total ?? 0);
        setMarketMeta({
          freeAgents: data.meta?.freeAgents,
        });
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    }

    loadMarket();
    return () => {
      cancelled = true;
    };
  }, [spriteKey, marketFilter, marketPage, marketSearch, syncMarketQueryInUrl, moduleKey, isFreeAgentsModule]);

  if (spriteKey === 'market' && moduleKey === 'scouting') {
    return (
      <GamePanel title="სკაუტინგის ანგარიში" icon={<Search className="h-4 w-4" />}>
        <ScoutingReport squad={snapshot.squad} />
      </GamePanel>
    );
  }

  if (spriteKey === 'medical' && moduleKey === 'risk') {
    return (
      <GamePanel title="რისკის ანალიზი" icon={<Stethoscope className="h-4 w-4" />}>
        <FitnessReport players={snapshot.squad} />
      </GamePanel>
    );
  }

  if (spriteKey === 'medical' && moduleKey === 'staff') {
    const medicalStaff = snapshot.staff.members.filter((member) => member.category === 'medical');
    return (
      <GamePanel title="სამედიცინო შტაბი" icon={<Stethoscope className="h-4 w-4" />}>
        <p className="mb-3 text-[11px] font-bold leading-5 text-white/48">
          ექიმი, ფიზიოთერაპევტი და ფსიქოლოგი — ბარათზე დაჭერით გახსნი დაქირავება/აფგრეიდის გვერდს.
        </p>
        <StaffContextGrid members={medicalStaff} />
      </GamePanel>
    );
  }

  if (spriteKey === 'market') {
    return (
      <GamePanel title={isFreeAgentsModule ? 'თავისუფალი აგენტები' : 'სატრანსფერო ბაზარი'} icon={<Search className="h-4 w-4" />}>
        {moduleKey === 'transfer_market' || !moduleKey ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap gap-2">
            {marketFilterOptions.map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => {
                  syncMarketQueryInUrl({ filter: filterKey, page: 1 });
                }}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.14em] transition ${
                  marketFilter === filterKey
                    ? 'border-emerald-300/30 bg-emerald-300/12 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-emerald-300/20 hover:text-white'
                }`}
              >
                {marketFilterLabels[filterKey]}
              </button>
            ))}
          </div>
          <div className="min-w-[220px] flex-1 md:max-w-[320px]">
            <input
              value={marketSearch}
              onChange={(event) => {
                syncMarketQueryInUrl({ q: event.target.value, page: 1 });
              }}
              placeholder="მოთამაშე"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-emerald-300/30"
            />
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-white/48 [backface-visibility:hidden] [transform:translateZ(0)] [will-change:opacity]">
          <span className="min-w-[112px] [font-variant-numeric:tabular-nums]">{marketLoading ? 'იტვირთება...' : `${marketTotal.toLocaleString('en-US')} შედეგი`}</span>
          <span className="min-w-[88px] text-right [font-variant-numeric:tabular-nums]">გვერდი {marketPage}/{marketTotalPages}</span>
        </div>
        <p className="mb-3 text-[11px] font-bold leading-5 text-white/48">
          {marketFilter === 'SHORTLIST'
            ? 'აქ ჩანს მხოლოდ შენახული ფეხბურთელები.'
            : 'ფეხბურთელები შეგიძლია იყიდო ან შენახულ სიაში დაამატო.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {marketItems.map((player) => (
            <div
              key={player.key}
              className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,17,0.96),rgba(5,11,10,0.98))] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.32)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start justify-between gap-3">
                  <div>
                    <p className="mt-1 text-base font-black text-white">{player.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                      {player.position} · {player.age} წლის
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                <div className="h-[224px] w-[162px] overflow-hidden">
                  <div style={{ transform: 'scale(0.64)', transformOrigin: 'top left' }} className="h-[347px] w-[251px]">
                    <PlayerFutCard
                      name={player.name}
                      labelOverride={player.cardDisplayName}
                      imageUrl={player.cardImageUrl}
                      nationalityCode={player.nationalityCode}
                      stats={player.stats}
                      position={player.position}
                      ovr={player.ovr}
                      availability="ready"
                      talent={player.talent}
                      editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-emerald-100">{player.valueLabel}</p>
                  <p className="mt-1 max-w-[220px] text-[11px] font-bold leading-5 text-white/46">
                    {getMarketScoutingNote(player)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {(() => {
                  const buyKey = `buy:${player.listingId ?? player.key}`;
                  return (
                    <button
                      type="button"
                      disabled={pendingAction === buyKey}
                      onClick={() => onRunPlayerAction(
                        buyKey,
                        () => (player.listingId
                          ? buyPlayManagerListedPlayer(player.listingId)
                          : buyPlayManagerMarketPlayer(player.key)),
                      )}
                      className="flex-1 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {pendingAction === buyKey ? 'მუშავდება...' : 'ყიდვა'}
                    </button>
                  );
                })()}
                {player.id ? (
                  <Link
                    href={`/playmanager/players/${player.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    ნახვა
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {!marketLoading && marketItems.length === 0 ? (
          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
            <p className="text-sm font-black text-white">
              {marketFilter === 'SHORTLIST'
                ? 'შენახული სია ჯერ ცარიელია'
                : 'ამ ფილტრზე შედეგი ვერ მოიძებნა'}
            </p>
            <p className="mt-2 text-sm font-bold text-white/52">
              {marketFilter === 'SHORTLIST'
                ? 'მოთამაშეებზე "სიაში დამატება" გამოიყენე და აქ დაგხვდება.'
                : marketSearch.trim()
                  ? 'სხვა საკვანძო სიტყვა ან სხვა filter სცადე.'
                  : 'filter შეცვალე ან ძებნა გამოიყენე.'}
            </p>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 [backface-visibility:hidden] [transform:translateZ(0)] [will-change:opacity]">
          <button
            type="button"
            disabled={marketPage <= 1 || marketLoading}
            onClick={() => {
              const nextPage = Math.max(1, marketPage - 1);
              syncMarketQueryInUrl({ page: nextPage });
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:border-emerald-300/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
          >
            წინა
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {getVisibleMarketPages(marketPage, marketTotalPages).map((pageNumber, index, pages) => {
              const previousPage = pages[index - 1];
              const needsGap = previousPage !== undefined && pageNumber - previousPage > 1;

              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {needsGap ? <span className="text-xs font-black text-white/30">...</span> : null}
                  <button
                    type="button"
                    onClick={() => {
                      syncMarketQueryInUrl({ page: pageNumber });
                    }}
                    disabled={marketLoading}
                    className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      marketPage === pageNumber
                        ? 'border-emerald-300/32 bg-emerald-300/14 text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/62 hover:border-emerald-300/20 hover:text-white'
                    }`}
                  >
                    {pageNumber}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={marketPage >= marketTotalPages || marketLoading}
            onClick={() => {
              const nextPage = Math.min(marketTotalPages, marketPage + 1);
              syncMarketQueryInUrl({ page: nextPage });
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:border-emerald-300/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
          >
            შემდეგი
          </button>
        </div>
          </>
        ) : null}
        {moduleKey === 'free_agents' ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
              <div>
                <p className="text-sm font-black text-white">
                  {freeAgentsMeta?.scoutHired
                    ? `სკაუტი LVL ${freeAgentsMeta.scoutLevel}/${freeAgentsMeta.maxScoutLevel}`
                    : 'სკაუტი არ არის დაქირავებული'}
                </p>
                <p className="mt-2 text-[11px] font-bold leading-5 text-white/52">
                  {freeAgentsMeta?.scoutHired
                    ? `ყოველ 24 საათში ჩნდება 5 ახალი ფეხბურთელი · დივიზიონის tier ${freeAgentsMeta.tier} · შემდეგი განახლება ${freeAgentsRefreshLabel}`
                    : `თავისუფალი აგენტების ახალი სია მხოლოდ დაქირავებულ სკაუტს მოაქვს. შენი დივიზიონი გაძლევს მაქსიმუმ LVL ${freeAgentsMeta?.maxScoutLevel ?? 1} სკაუტს.`}
                </p>
              </div>
              {freeAgentsMeta?.scoutHired ? (
                <div className="flex flex-wrap gap-2 [backface-visibility:hidden] [transform:translateZ(0)] [will-change:opacity]">
                  <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                    5 შეთავაზება
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
                    refresh {freeAgentsRefreshLabel}
                  </span>
                </div>
              ) : null}
            </div>

            {freeAgentsMeta?.scoutHired ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {marketItems.map((player) => (
                  <div
                    key={player.key}
                    className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,17,0.96),rgba(5,11,10,0.98))] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.32)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mt-1 text-base font-black text-white">{player.name}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          {player.position} · {player.age} წლის
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center">
                      <div className="h-[260px] w-[188px] overflow-hidden">
                        <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left' }} className="h-[347px] w-[251px]">
                          <PlayerFutCard
                            name={player.name}
                            labelOverride={player.cardDisplayName}
                            imageUrl={player.cardImageUrl}
                            nationalityCode={player.nationalityCode}
                            stats={player.stats}
                            position={player.position}
                            ovr={player.ovr}
                            availability="ready"
                            talent={player.talent}
                            editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-emerald-100">{player.valueLabel}</p>
                        <p className="mt-1 max-w-[220px] text-[11px] font-bold leading-5 text-white/46">
                          სკაუტის რეკომენდაცია · Talent {player.talent}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={pendingAction === `buy:${player.key}`}
                        onClick={() => onRunPlayerAction(`buy:${player.key}`, () => buyPlayManagerMarketPlayer(player.key))}
                        className="flex-1 rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {pendingAction === `buy:${player.key}` ? 'მუშავდება...' : 'გაფორმება'}
                      </button>
                      {player.id ? (
                        <Link
                          href={`/playmanager/players/${player.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                          ნახვა
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
                <p className="text-sm font-black text-white">ჯერ სკაუტი დაიქირავე</p>
                <p className="mt-2 text-sm font-bold text-white/52">
                  დაქირავებული სკაუტი ყოველ 24 საათში ერთხელ 5 ახალ თავისუფალ აგენტს შემოგთავაზებს.
                </p>
              </div>
            )}
          </>
        ) : null}
        {moduleKey === 'outgoing' ? (
          <>
            {snapshot.outgoingListings.length > 0 ? (
              <div className="mb-4 rounded-[22px] border border-amber-300/20 bg-amber-300/[0.05] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/72">on the market</p>
                <p className="mt-1 text-sm font-black text-white">ბაზარზე გამოტანილი</p>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-2">
                  {snapshot.outgoingListings.map((listing) => (
                    <div key={listing.listingId} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/24 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{listing.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          {listing.position} · OVR {listing.ovr} · {listing.askingPriceLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={pendingAction === `unlist:${listing.listingId}`}
                        onClick={() => onRunPlayerAction(`unlist:${listing.listingId}`, () => unlistPlayManagerPlayer(listing.listingId))}
                        className="shrink-0 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black text-white/75 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {pendingAction === `unlist:${listing.listingId}` ? '...' : 'მოხსნა'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-3">
            {snapshot.squad.map((player) => {
              const isListed = snapshot.outgoingListings.some((listing) => listing.playerId === player.id);
              return (
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
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder={String(player.value)}
                    value={listPriceDraft[player.id] ?? ''}
                    onChange={(event) => setListPriceDraft((prev) => ({ ...prev, [player.id]: event.target.value }))}
                    className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-white outline-none focus:border-amber-300/30"
                  />
                  <button
                    type="button"
                    disabled={isListed || pendingAction === `list:${player.id}`}
                    onClick={() => {
                      const price = Math.floor(Number(listPriceDraft[player.id] ?? player.value));
                      if (!Number.isFinite(price) || price <= 0) return;
                      onRunPlayerAction(`list:${player.id}`, () => listPlayManagerPlayer(player.id, price));
                    }}
                    className="flex-1 rounded-xl border border-amber-300/24 bg-amber-300/12 px-3 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isListed ? 'ბაზარზეა' : pendingAction === `list:${player.id}` ? 'მუშავდება...' : 'ბაზარზე გამოტანა'}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={pendingAction === `sell:${player.id}`}
                  onClick={() => onRunPlayerAction(`sell:${player.id}`, () => sellPlayManagerPlayer(player.id))}
                  className="mt-2 w-full rounded-xl border border-red-900/30 bg-red-950/30 px-3 py-2 text-xs font-black text-white transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingAction === `sell:${player.id}` ? 'მუშავდება...' : 'სწრაფი გაყიდვა'}
                </button>
              </div>
              );
            })}
            </div>
          </>
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
          <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/58">Development Lab</p>
              <h3 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">
                XP-ით მოთამაშეების ზრდა
              </h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/58">
                მატჩები აგროვებს XP-ს, სავარჯიშო ბაზა ზრდის XP-ის ეფექტს, ხოლო ინდივიდუალური განვითარება
                ფოკუსდება იმ ფეხბურთელებზე, ვისაც ყველაზე მეტი პოტენციალი დარჩა.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-2">
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

  if (spriteKey === 'academy' || (spriteKey === 'residence' && moduleKey === 'academy')) {
    const academyLevel = facilities.academy?.level ?? 1;
    const youthScoutLevel = snapshot.staff.members.find((member) => member.roleKey === 'youth_scout')?.level ?? 0;
    const prospectTarget = 2 + academyLevel;
    const talentCap = Math.min(8, 4 + youthScoutLevel);
    return (
      <GamePanel title="აკადემიის ტალანტები" icon={<UsersRound className="h-4 w-4" />}>
        <div className="mb-4 rounded-[18px] border border-emerald-300/16 bg-emerald-300/[0.05] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-white">აკადემია · დონე {academyLevel}</p>
            <span className="rounded-full border border-emerald-300/24 bg-black/24 px-3 py-1 text-[11px] font-black text-emerald-100">
              {snapshot.academy.length}/{prospectTarget} ტალანტი · მაქს. კლასი {talentCap}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-bold leading-5 text-white/52">
            <b className="text-white/75">აკადემიის დონე</b> ზრდის ტალანტების <b className="text-white/75">რაოდენობას</b> (2+დონე) და <b className="text-white/75">განვითარების სიჩქარეს</b>.
            <b className="text-white/75"> აკადემიის სკაუტი</b> (პერსონალი, ახლა დონე {youthScoutLevel}) განსაზღვრავს <b className="text-white/75">ხარისხს</b> — ტალანტის ჭერს (4–{talentCap}). Pro-კლასი (≤3) გამორიცხულია — მხოლოდ fodder.
            ხელმოწერა მოთამაშეს პირდაპირ გუნდში 15 წლის ასაკით გადაიყვანს.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-3">
          {snapshot.academy.map((prospect) => {
            const matured = prospect.ovr >= prospect.potential;
            const devPct = prospect.potential > prospect.ovr
              ? Math.round(((prospect.ovr - 40) / Math.max(1, prospect.potential - 40)) * 100)
              : 100;
            return (
            <div key={prospect.id} className="pm-game-row">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-white">{prospect.name}</p>
                {matured ? (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">მზად</span>
                ) : null}
              </div>
              <div className="mt-2">
                <TalentClassBadge talent={prospect.talent} showValue />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="POS" value={prospect.position} />
                <MiniStat label="OVR" value={String(prospect.ovr)} />
                <MiniStat label="POT" value={String(prospect.potential)} />
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
                  <span>განვითარება</span>
                  <span>{prospect.ovr} → {prospect.potential}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${matured ? 'bg-emerald-400' : 'bg-[linear-gradient(90deg,#22c55e,#f59e0b)]'}`}
                    style={{ width: `${Math.max(0, Math.min(100, devPct))}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold text-white/48">{prospect.age} წლის · {matured ? 'მზადაა მთავარ გუნდში' : 'ვითარდება აკადემიაში'}</p>
              <button
                type="button"
                disabled={pendingAction === `academy:${prospect.id}`}
                onClick={() => onRunPlayerAction(`academy:${prospect.id}`, () => signPlayManagerAcademyProspect(prospect.id))}
                className="mt-3 w-full rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === `academy:${prospect.id}` ? 'მუშავდება...' : `ხელმოწერა ${prospect.signingCostLabel}`}
              </button>
              {prospect.playerId ? (
                <Link
                  href={`/playmanager/players/${prospect.playerId}`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  პროფილი
                </Link>
              ) : null}
            </div>
          );
          })}
        </div>
      </GamePanel>
    );
  }

  if (spriteKey === 'league') {
    return (
      <GamePanel title="ლიგის ცენტრი" icon={<Landmark className="h-4 w-4" />}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42 mb-3">ყოველდღიური თასები</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-2">
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

  if (spriteKey === 'residence' && moduleKey === 'squad') {
    const squad = snapshot.squad;
    const avgOvr = squad.length ? Math.round(squad.reduce((s, p) => s + p.ovrCurrent, 0) / squad.length) : 0;
    const groups: { key: 'starter' | 'bench' | 'reserve'; label: string; tone: string }[] = [
      { key: 'starter', label: 'საბაზო XI', tone: 'text-emerald-300' },
      { key: 'bench', label: 'სათადარიგო', tone: 'text-yellow-300' },
      { key: 'reserve', label: 'რეზერვი', tone: 'text-white/55' },
    ];
    const talentTone = (t: number) =>
      t >= 10 ? 'border-amber-300/30 bg-amber-300/12 text-amber-100'
        : t >= 7 ? 'border-violet-300/30 bg-violet-300/12 text-violet-100'
          : t >= 4 ? 'border-emerald-300/26 bg-emerald-300/10 text-emerald-100'
            : 'border-white/14 bg-white/[0.05] text-white/60';
    return (
      <GamePanel title="მთავარი გუნდი" icon={<UsersRound className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <MiniStat label="მოთამაშეები" value={String(squad.length)} />
          <MiniStat label="საშ. OVR" value={String(avgOvr)} />
          <MiniStat label="საბაზო XI" value={String(squad.filter((p) => p.role === 'starter').length)} />
        </div>
        {squad.length === 0 ? (
          <p className="mt-4 rounded-none border border-white/10 bg-black/30 px-4 py-6 text-center text-sm font-bold text-white/40">
            გუნდში მოთამაშეები არ არის.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {groups.map((g) => {
              const rows = squad.filter((p) => p.role === g.key);
              if (rows.length === 0) return null;
              return (
                <div key={g.key}>
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${g.tone}`}>{g.label}</span>
                    <span className="text-[10px] font-black text-white/30">{rows.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-emerald-300/14 bg-black/40">
                    {rows.map((p) => (
                      <Link
                        key={p.id}
                        href={`/playmanager/players/${p.id}`}
                        className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition last:border-b-0 hover:bg-white/[0.05]"
                      >
                        <PlayerFace url={p.cardImageUrl} fallback={(p.cardDisplayName?.trim() || p.name).charAt(0).toUpperCase()} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-black text-white">
                            <span className="text-emerald-300/70 tabular-nums">#{p.squadNumber ?? '–'}</span>
                            <span className="truncate">{p.cardDisplayName?.trim() || p.name}</span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-white/42">
                            <span className="rounded border border-white/12 bg-white/[0.05] px-1.5 py-px text-[10px] font-black tracking-wide text-white/65">
                              {p.position}
                            </span>
                            <span className={`rounded border px-1.5 py-px text-[10px] font-black tabular-nums ${talentTone(p.talent)}`}>
                              T{p.talent}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                          <div className="text-right leading-tight">
                            <p className="text-sm font-black text-white tabular-nums">{p.ovrCurrent}</p>
                            <p className="text-[10px] font-bold text-white/35">OVR</p>
                          </div>
                          <div className="text-right leading-tight">
                            <p className="text-sm font-black text-white/70 tabular-nums">{p.age}</p>
                            <p className="text-[10px] font-bold text-white/35">ასაკი</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/58">Residence Staff</p>
              <h3 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">შტაბი, რომელიც გუნდს მუშაობინებს</h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/58">
                Residence-ში უკვე შეგიძლია პერსონალის დაქირავება და მათი ლეველების გაზრდა. Upgrade cap დამოკიდებულია დივიზიონზე,
                ასე რომ უფრო მაღალ ლიგაში უკეთესი შტაბის აშენება გახდება შესაძლებელი.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
    const baseMatchdayIncome = getProjectedMatchdayIncome({
      attendance: projectedAttendance,
      ticketPrice: ticketPriceDraft,
    });
    // finance_manager boost is now a real DB effect (pm_simulate_league_round),
    // so the displayed total income reflects it. Per-seat stays on gate receipts.
    const financeIncomePct = snapshot.staff.bonuses.projectedIncomePct ?? 0;
    const projectedIncome = Math.round(baseMatchdayIncome * (1 + financeIncomePct / 100));
    const stadiumUpgradeCost = `${fmtInt(getFacilityUpgradeCostGel('arena', stadiumLevel))} ₾`;
    const stadiumCanUpgrade = manager.level >= stadiumLevel + 1;
    const stadiumUpgradePending = pendingAction === 'arena:facility_upgrade';
    const occupancyPct = Math.min(100, Math.round((projectedAttendance / stadiumCapacity) * 100));
    const incomePerSeat = projectedAttendance > 0 ? Math.round(baseMatchdayIncome / projectedAttendance) : 0;
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="ბილეთის ფასი" value={`${fmtInt(ticketPriceDraft)} ₾`} />
                <MiniStat label="დასწრება" value={fmtInt(projectedAttendance)} />
                <MiniStat label="შევსება" value={`${occupancyPct}%`} />
                <MiniStat label="მატჩის შემოსავალი" value={formatGel(projectedIncome)} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3">
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
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-3">
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

    if (moduleKey === 'wages') {
      const payroll = [...snapshot.squad]
        .map((p) => ({
          p,
          wage: getPlayerWeeklyWageGel({ ovrCurrent: p.ovrCurrent, age: p.age, lineupSlot: p.lineupSlot }),
        }))
        .sort((a, b) => b.wage - a.wage);
      const playersSubtotal = payroll.reduce((sum, x) => sum + x.wage, 0);
      const weeklyOut = snapshot.finance.weeklyWages; // players + staff
      const weeklyIn = snapshot.finance.sponsorWeeklyAmount;
      const net = weeklyIn - weeklyOut;
      const roleLabel: Record<'starter' | 'bench' | 'reserve', string> = {
        starter: 'საბაზო XI',
        bench: 'სათადარიგო',
        reserve: 'რეზერვი',
      };
      return (
        <GamePanel title="ხელფასების უწყისი" icon={<UsersRound className="h-4 w-4" />}>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-3">
            <FinanceCard label="მოთამაშეთა ხელფასი" value={formatGel(playersSubtotal)} tone="red" />
            <FinanceCard label="სრული ხელფასი (+ პერსონალი)" value={formatGel(weeklyOut)} tone="red" />
            <FinanceCard label="NET / კვირა" value={formatGel(net)} tone={net >= 0 ? 'green' : 'red'} />
          </div>
          <div className="mt-4 overflow-hidden rounded-none border border-emerald-300/14 bg-black/40">
            <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-white/8 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
              <span>#</span>
              <span>მოთამაშე</span>
              <span className="text-right">OVR · ასაკი</span>
              <span className="text-right">კვირეული</span>
            </div>
            <div className="max-h-[440px] overflow-y-auto">
              {payroll.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm font-bold text-white/40">გუნდში მოთამაშეები არ არის.</p>
              ) : (
                payroll.map(({ p, wage }) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-2.5 last:border-b-0"
                  >
                    <span className="text-center text-xs font-black text-white/45 tabular-nums">{p.squadNumber ?? '–'}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{p.cardDisplayName?.trim() || p.name}</p>
                      <p className="text-[11px] font-bold text-white/40">
                        {p.position} ·{' '}
                        <span className={p.role === 'starter' ? 'text-emerald-300' : p.role === 'bench' ? 'text-yellow-300' : 'text-white/45'}>
                          {roleLabel[p.role]}
                        </span>
                      </p>
                    </div>
                    <span className="text-right text-xs font-bold text-white/60 tabular-nums">{p.ovrCurrent} · {p.age}</span>
                    <span className="text-right text-sm font-black text-white tabular-nums">{formatGel(wage)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </GamePanel>
      );
    }

    return (
      <GamePanel title="ეკონომიკის კონტროლი" icon={<Coins className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
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
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3">
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
    if (moduleKey === 'direct_messages') {
      return (
        <GamePanel title="მესენჯერი" icon={<Send className="h-4 w-4" />}>
          <PlayManagerDirectMessages />
        </GamePanel>
      );
    }

    if (moduleKey === 'global_chat') {
      return (
        <div className="pm-facility-module">
          <PlayManagerGlobalChat />
        </div>
      );
    }

    if (moduleKey === 'daily_reward') {
      const dr = snapshot.dailyReward;
      return (
        <GamePanel title="დღიური ჯილდო" icon={<Sparkles className="h-4 w-4" />}>
          <div className="rounded-[22px] border border-amber-300/16 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.02))] p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">streak</p>
            <p className="mt-2 text-5xl font-black text-white">{dr.streak}<span className="text-lg text-white/40"> დღე</span></p>
            <div className="mt-4 flex justify-center gap-1.5">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < dr.streak ? 'bg-amber-400' : 'bg-white/12'}`} />
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-white/55">
              {dr.canClaim
                ? `დღევანდელი ჯილდო: ${dr.nextRewardLabel} (სერია ${dr.nextStreak})`
                : 'დღეს უკვე აიღე — დაუბრუნდი მომავალ დღეს.'}
            </p>
            <button
              type="button"
              disabled={!dr.canClaim || pendingAction === 'daily_reward'}
              onClick={() => onRunPlayerAction('daily_reward', () => claimPlayManagerDailyReward())}
              className="mt-4 w-full rounded-xl border border-amber-300/24 bg-amber-300/14 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === 'daily_reward' ? 'მუშავდება...' : dr.canClaim ? 'ჯილდოს აღება' : 'აღებულია'}
            </button>
          </div>
        </GamePanel>
      );
    }

    return (
      <GamePanel title="მედია და ფანები" icon={<RadioTower className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[280px_1fr]">
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

    function getUpcomingMatch(played: number, offset: number) {
      const round = played + 1 + offset;
      const nextRowOrder = PLAYMANAGER_FIXTURE_ROW_ORDER[(played + offset) % PLAYMANAGER_FIXTURE_ROW_ORDER.length];
      const name = PLAYMANAGER_AI_CLUBS.find((c) => c.rowOrder === nextRowOrder)?.name ?? 'Liverpool AIFC';
      return { round, opponent: name };
    }




    return (
      <>
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(6,18,13,0.96),rgba(3,9,7,0.98))] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/55">მატჩის დღე</p>
              <h2 className="mt-1 text-2xl font-black text-white">შემდეგი მატჩი</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
                {activeTournamentCup ? activeTournamentCup.name : `ლიგა · ${nextMatch.round} ტური`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/78">
                საშინაო
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div className="rounded-[24px] border border-white/8 bg-black/28 p-4 shadow-[inset_0_0_24px_rgba(16,185,129,0.05)]">
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                <div className="min-w-0 text-center md:text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/38">მასპინძელი</p>
                  <p className="mt-1 truncate text-[22px] font-black text-white">{team.name}</p>
                  <p className="mt-2 text-sm font-black text-emerald-200">{matchSettingsDraft.readiness}% მზადყოფნა</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#d9f56a)]" style={{ width: `${matchSettingsDraft.readiness}%` }} />
                  </div>
                </div>

                <div className="px-2 text-center">
                  <p className="text-[44px] font-black leading-none text-white">VS</p>
                  <p className="mt-2 text-xs font-black text-white/44">{snapshot.nextMatchLabel}</p>
                </div>

                <div className="min-w-0 text-center md:text-left">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/38">მოწინააღმდეგე</p>
                  <p className="mt-1 truncate text-[22px] font-black text-white">{nextMatch.opponent}</p>
                  <p className="mt-2 text-sm font-black text-emerald-200">87% შეფასება</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#d9f56a)]" style={{ width: '87%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
                <Link
                  href="/playmanager/arena/lineup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400/18 px-4 text-sm font-black text-emerald-50 transition hover:bg-emerald-400/26"
                >
                  <UsersRound className="h-4 w-4" />
                  შემადგენლობა და ტაქტიკა
                </Link>
                <button
                  type="button"
                  disabled={pendingAction === 'league:league_sim' || lineupDraft.starters.length !== 11}
                  onClick={() => onRunAction('league', 'league_sim')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-300/22 px-4 text-sm font-black text-amber-50 transition hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4" />
                  {pendingAction === 'league:league_sim'
                    ? 'მიმდინარეობს...'
                    : lineupDraft.starters.length !== 11
                      ? `XI ${lineupDraft.starters.length}/11`
                      : 'შესვლა'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">შემადგენლობა</p>
                <p className="mt-2 text-3xl font-black text-white">{lineupDraft.starters.length}/11</p>
                <p className="mt-2 text-xs font-bold text-white/52">სათადარიგო {lineupDraft.bench.length}/4</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">სახლის ეფექტი</p>
                <p className="mt-2 text-3xl font-black text-white">+{clubEffects.bonuses.matchdayIncomePct}%</p>
                <p className="mt-2 text-xs font-bold text-white/52">სტადიონი LVL {facilities.arena?.level ?? 1}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">ბოლო შედეგი</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {snapshot.matchHistory[0] ? `${snapshot.matchHistory[0].result}` : '—'}
                </p>
                <p className="mt-2 text-xs font-bold text-white/52">
                  {snapshot.matchHistory[0] ? snapshot.matchHistory[0].score : 'ისტორია ჯერ არ არის'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ArenaTournaments cups={snapshot.cups} />
          <div className="space-y-4">
            <ArenaLineupCard
              startersCount={lineupDraft.starters.length}
              benchCount={lineupDraft.bench.length}
              formPercent={snapshot.formPercent}
            />
            <ArenaQuickLinks recentForm={snapshot.matchHistory.slice(0, 5).map((match) => match.result)} />
          </div>
        </div>
      </>
    );
  }

  return (
    <GamePanel title="Matchday ოპერაციები" icon={<Trophy className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <FinanceCard label="შემდეგი მატჩი" value={snapshot.nextMatchLabel} tone="green" />
        <FinanceCard label="ფორმა" value={`${snapshot.formPercent}%`} tone="green" />
        <FinanceCard label="ბოლო შემოსავალი" value={snapshot.matchHistory[0]?.incomeLabel ?? '₾0'} tone="gold" />
        <FinanceCard label="ბოლო შედეგი" value={snapshot.matchHistory[0] ? `${snapshot.matchHistory[0].result} ${snapshot.matchHistory[0].score}` : 'Pending'} tone="green" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
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
      className="group/module relative block overflow-hidden rounded-[24px] border border-emerald-300/16 bg-black/36 p-5 transition hover:border-emerald-300/32"
    >
      <ModulePhoto moduleKey="lineup" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/70 to-black/18" />
      <div className="relative flex min-h-[220px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/22 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
            Squad
          </span>
          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
              complete
                ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100'
                : 'border-yellow-300/26 bg-yellow-300/10 text-yellow-100'
            }`}
          >
            {complete ? 'მზადაა' : `${startersCount}/11`}
          </span>
        </div>

        <div className="mt-auto">
          <h3 className="text-xl font-black text-white">შემადგენლობა და ტაქტიკა</h3>
          <p className="mt-2 text-sm font-bold text-emerald-100/70">
            სასტარტო {startersCount}/11 · სათადარიგო {benchCount}/4 · ფორმა {formPercent}%
          </p>
        </div>
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
          <div className="flex items-start justify-end">
            <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white/55 backdrop-blur">
              ცარიელი
            </span>
          </div>

          <div className="mt-auto">
            <h4 className="line-clamp-2 text-[15px] font-black uppercase tracking-[0.04em] text-white">{slot.title}</h4>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = {
    registration: { label: 'ღია', cls: 'border-emerald-300/26 bg-emerald-300/10 text-emerald-100' },
    in_progress: { label: 'დაწყებული', cls: 'border-red-300/26 bg-red-400/10 text-red-100' },
    completed: { label: 'დასრულდა', cls: 'border-white/12 bg-white/[0.05] text-white/55' },
  }[cup.status];
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
        <div className="flex items-start justify-end">
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] backdrop-blur ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-auto">
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-[15px] font-black uppercase tracking-[0.04em] text-white">{cup.name}</h4>
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
    <div className="overflow-hidden rounded-2xl border border-yellow-300/16 bg-black/30 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-yellow-300/24 bg-yellow-300/10 text-yellow-100">
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Link
        href="/playmanager/history"
        className="group/module relative overflow-hidden rounded-[24px] border border-white/10 bg-black/32 p-5 transition hover:border-emerald-300/28"
      >
        <ModulePhoto moduleKey="history" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/72 to-black/18" />
        <div className="relative flex min-h-[210px] flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
            History
          </div>

          <div className="mt-auto">
            <h3 className="text-lg font-black text-white">მატჩების ისტორია</h3>
            {recentForm.length > 0 ? (
              <div className="mt-3 flex gap-1">
                {recentForm.map((r, i) => (
                  <span
                    key={i}
                    className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-black ${
                      r === 'W' ? 'bg-emerald-400/20 text-emerald-300' : r === 'L' ? 'bg-red-400/20 text-red-300' : 'bg-yellow-400/20 text-yellow-300'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-bold text-white/56">ბოლო შედეგები აქ გამოჩნდება</p>
            )}
          </div>
        </div>
      </Link>
      <Link
        href="/playmanager/museum"
        className="group/module relative overflow-hidden rounded-[24px] border border-white/10 bg-black/32 p-5 transition hover:border-yellow-300/28"
      >
        <ModulePhoto moduleKey="museum" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/72 to-black/18" />
        <div className="relative flex min-h-[210px] flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300/22 bg-yellow-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-yellow-100">
            Museum
          </div>
          <div className="mt-auto">
            <h3 className="text-lg font-black text-white">ტროფეების მუზეუმი</h3>
            <p className="mt-2 text-sm font-bold text-white/60">ყველა მოგებული ტიტული და კლუბის ისტორია</p>
          </div>
        </div>
      </Link>
      <Link
        href="/playmanager/championships"
        className="group/module relative overflow-hidden rounded-[24px] border border-white/10 bg-black/32 p-5 transition hover:border-amber-300/28 sm:col-span-2"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(0,0,0,0.4))]" />
        <div className="relative flex min-h-[120px] flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/22 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
            Championships
          </div>
          <div className="mt-auto">
            <h3 className="text-lg font-black text-white">ჩემპიონატები</h3>
            <p className="mt-2 text-sm font-bold text-white/60">ნამდვილ მენეჯერებთან ლიგები — დარეგისტრირდი და ითამაშე</p>
          </div>
        </div>
      </Link>
      <Link
        href="/playmanager/shop"
        className="group/module relative overflow-hidden rounded-[24px] border border-white/10 bg-black/32 p-5 transition hover:border-amber-300/28 sm:col-span-2"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(0,0,0,0.4))]" />
        <div className="relative flex min-h-[150px] flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/22 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
            Shop
          </div>
          <div className="mt-auto">
            <h3 className="text-lg font-black text-white">ბარათების მაღაზია</h3>
            <p className="mt-2 text-sm font-bold text-white/60">გახსენი პაკები, მოიპოვე Pro ბარათები OVR აფგრეიდისთვის</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function GamePanel({
  title,
  icon,
  children,
  tone = 'green',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: 'green' | 'red' | 'gold';
}) {
  return (
    <div className={`pm-facility-module pm-facility-module-tone-${tone}`}>
      <div className="mb-3 flex items-center gap-2.5 text-sm font-black text-white">
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border text-base ${
            tone === 'green'
              ? 'border-emerald-300/22 bg-[linear-gradient(145deg,rgba(52,211,153,0.22),rgba(16,84,60,0.1))] text-emerald-100'
              : tone === 'red'
                ? 'border-red-300/22 bg-[linear-gradient(145deg,rgba(248,113,113,0.22),rgba(84,16,16,0.1))] text-red-100'
                : 'border-amber-300/22 bg-[linear-gradient(145deg,rgba(253,224,71,0.22),rgba(84,68,16,0.1))] text-amber-100'
          }`}
        >
          {icon}
        </span>
        <span className="tracking-[0.01em]">{title}</span>
      </div>
      {children}
    </div>
  );
}


function PlayerFace({ url, fallback, size = 40 }: { url?: string | null; fallback: string; size?: number }) {
  const real = url?.trim();
  // Generic full-body silhouettes (players without a real face) read as broken
  // green/white shapes when cropped to a circle — show the initial instead.
  const isPhoto = real && !/silhouette/i.test(real);
  if (isPhoto) {
    return (
      <span
        className="block shrink-0 overflow-hidden rounded-full bg-[#0c1a13] ring-1 ring-white/14"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={real}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: '50% 16%' }}
        />
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(52,211,153,0.3),rgba(16,84,60,0.24))] text-xs font-black text-emerald-100 ring-1 ring-emerald-300/22"
      style={{ width: size, height: size }}
    >
      {fallback}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-dashboard-stat">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
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

