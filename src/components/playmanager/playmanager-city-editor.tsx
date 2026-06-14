'use client';

import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Coins,
  Dumbbell,
  Landmark,
  LockKeyhole,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trophy,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startTransition, useState, type ReactNode } from 'react';
import {
  buyPlayManagerMarketPlayer,
  negotiatePlayManagerSponsor,
  runPlayManagerCityAction,
  savePlayManagerMatchSettings,
  savePlayManagerTicketPrice,
  savePlayManagerLineup,
  sellPlayManagerPlayer,
  signPlayManagerAcademyProspect,
  togglePlayManagerMarketShortlist,
  trainPlayManagerPlayer,
  type PlayManagerPlayerActionResult,
  type RunCityActionResult,
} from '@/app/playmanager/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFacilityUpgradeCostGel, isFacilityKey, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { formatGel, getProjectedAttendance, getProjectedMatchdayIncome } from '@/lib/playmanager/economy';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import { PlayManagerCityCanvas, type PlayManagerCityBuilding } from './playmanager-city-canvas';

type EditableCityBuilding = PlayManagerCityBuilding & {
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
    divisionLabel: string;
    formPercent: number;
  };
  clubEffects: ClubEffectsSummary;
};

type RunCityActionError = Extract<RunCityActionResult, { success: false }>['error'];
type PlayerActionError = Extract<PlayManagerPlayerActionResult, { success: false }>['error'];

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

const STATUS_LABELS: Record<FacilityStatus, string> = {
  active: 'აქტიური',
  attention: 'ყურადღება',
  upgradeable: 'Upgrade',
  locked: 'Locked',
  completed: 'Ready',
};

const DEFAULT_FACILITY_STATE: Record<string, FacilityState> = {
  arena: { status: 'active', level: 2, progress: 68, upgradeCost: '₾620K', nextUnlock: 'VIP ლოჟები' },
  market: { status: 'attention', level: 1, progress: 34, upgradeCost: '₾420K', nextUnlock: 'სკაუტის ქსელი' },
  academy: { status: 'upgradeable', level: 1, progress: 72, upgradeCost: '₾380K', nextUnlock: 'U19 ტურნირი' },
  training: { status: 'active', level: 2, progress: 58, upgradeCost: '₾510K', nextUnlock: 'OVR boost slot' },
  finance: { status: 'attention', level: 1, progress: 46, upgradeCost: '₾300K', nextUnlock: 'სპონსორის ოფისი' },
  league: { status: 'active', level: 1, progress: 80, upgradeCost: '₾260K', nextUnlock: 'მეტოქის სკაუტი' },
  media: { status: 'locked', level: 1, progress: 18, upgradeCost: '₾220K', nextUnlock: 'ფანების კამპანია' },
};

const PRIMARY_ACTION_BY_FACILITY: Record<string, CityActionKey> = {
  arena: 'arena_matchday',
  market: 'market_scout',
  academy: 'academy_sign',
  training: 'training_session',
  finance: 'finance_sponsor',
  league: 'league_sim',
  media: 'media_campaign',
};

const BUILDING_PAGES: Record<string, BuildingPage> = {
  arena: {
    eyebrow: 'Matchday Hub',
    title: 'მთავარი არენა',
    summary: 'აქ იმართება მატჩები, ბილეთების შემოსავალი, ფანების განწყობა და საშინაო უპირატესობა.',
    icon: Trophy,
    metrics: [['ტევადობა', '45K'], ['ფანების ენერგია', '82%'], ['შემოსავალი', '+₾240K']],
    actions: ['მატჩის მომზადება', 'ბილეთის ფასი', 'სტადიონის upgrade'],
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
    actions: ['ბიუჯეტის განაწილება', 'სპონსორი', 'ხელფასები'],
  },
  league: {
    eyebrow: 'Competition Center',
    title: 'ლიგის ცენტრი',
    summary: 'ცხრილი, კალენდარი, მეტოქეების ანალიზი და სეზონის პროგრესის კონტროლი.',
    icon: Landmark,
    metrics: [['დივიზიონი', 'D1'], ['ადგილი', '4'], ['ფორმა', 'Ready']],
    actions: ['კალენდარი', 'ცხრილი', 'მეტოქე'],
  },
  media: {
    eyebrow: 'Media Room',
    title: 'მედია თაუერი',
    summary: 'სიახლეები, პრესა, ფანების რეაქცია და კლუბის საჯარო იმიჯი.',
    icon: RadioTower,
    metrics: [['რეპუტაცია', 'New'], ['ფანები', '+2.4K'], ['სიახლე', 'Draft']],
    actions: ['პრესკონფერენცია', 'სიახლე', 'ფანები'],
  },
};

const TRAINING_SLOTS = [
  { name: 'ლიდერი ფორვარდი', pos: 'ST', ovr: '74 -> 75', gain: '+₾2M' },
  { name: 'კრეატიული ნახევარმცველი', pos: 'CM', ovr: '69 -> 70', gain: '+₾2M' },
  { name: 'ახალგაზრდა მცველი', pos: 'CB', ovr: '63 -> 64', gain: '+₾2M' },
];

const MEDIA_ITEMS = [
  'ფანები ახალ სტადიონზე პირველ მატჩს ელოდებიან',
  'ტრანსფერების ჰაბში მოთხოვნა შეტევით პოზიციებზე იზრდება',
  'აკადემიის ორი მოთამაშე მთავარ გუნდთან ვარჯიშობს',
];

function mergeFacilityState(
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
        upgradeCost: `${getFacilityUpgradeCostGel(facility.spriteKey, facility.level).toLocaleString('ka-GE')} ₾`,
      };
      return state;
    },
    { ...DEFAULT_FACILITY_STATE },
  );
}

export function PlayManagerCityEditor({
  initialBuildings,
  initialFacilities = [],
  citySnapshot,
  backgroundUrl,
  manager,
  team,
  clubEffects,
}: PlayManagerCityEditorProps) {
  const router = useRouter();
  const [facilities, setFacilities] = useState(() => mergeFacilityState(initialFacilities));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const selectedBuilding = initialBuildings.find((building) => building.spriteKey === selectedKey);

  async function runCityAction(spriteKey: string, action: CityActionKey) {
    const actionId = `${spriteKey}:${action}`;
    setPendingAction(actionId);
    setActionMessage(null);
    const result = await runPlayManagerCityAction({ spriteKey, action });
    setPendingAction(null);
    applyCityActionResult(result);
    if (result.success) {
      router.refresh();
    }
  }

  async function runPlayerAction(actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) {
    setPendingAction(actionId);
    setActionMessage(null);
    const result = await action();
    setPendingAction(null);
    applyPlayerActionResult(result);
    if (result.success) {
      router.refresh();
    }
  }

  function applyCityActionResult(result: RunCityActionResult) {
    if (!result.success) {
      const labels: Record<RunCityActionError, string> = {
        unauthenticated: 'სესიას ავტორიზაცია სჭირდება',
        team_missing: 'გუნდი ვერ მოიძებნა',
        invalid_facility: 'შენობა არასწორია',
        insufficient_funds: 'ბალანსი არ არის საკმარისი',
        facility_locked: 'ეს შენობა ჯერ ჩაკეტილია',
        unavailable: 'მოქმედება ჯერ მიუწვდომელია',
      };
      setActionMessage(labels[result.error]);
      return;
    }

    startTransition(() => {
      setFacilities((current) => ({
        ...current,
        [result.facility.spriteKey]: {
          ...(current[result.facility.spriteKey] ?? DEFAULT_FACILITY_STATE[result.facility.spriteKey]),
          level: result.facility.level,
          progress: result.facility.progress,
          status: result.facility.status,
          upgradeCost: isFacilityKey(result.facility.spriteKey)
            ? `${getFacilityUpgradeCostGel(result.facility.spriteKey, result.facility.level).toLocaleString('ka-GE')} ₾`
            : current[result.facility.spriteKey]?.upgradeCost ?? '₾0',
        },
      }));
    });

    const parts = [];
    if (result.detail) parts.push(result.detail);
    if (result.reward > 0) parts.push(`+${result.reward.toLocaleString('ka-GE')} ₾`);
    if (result.cost > 0) parts.push(`-${result.cost.toLocaleString('ka-GE')} ₾`);
    setActionMessage(parts.length > 0 ? parts.join(' · ') : 'პროგრესი განახლდა');
  }

  function applyPlayerActionResult(result: PlayManagerPlayerActionResult) {
    if (!result.success) {
      const labels: Record<PlayerActionError, string> = {
        unauthenticated: 'სესიას ავტორიზაცია სჭირდება',
        team_missing: 'გუნდი ვერ მოიძებნა',
        invalid_player: 'ფეხბურთელი არასწორია',
        insufficient_funds: 'ბალანსი არ არის საკმარისი',
        player_unavailable: 'ფეხბურთელი მიუწვდომელია',
        player_owned: 'ფეხბურთელი უკვე გუნდშია',
        unavailable: 'მოქმედება ჯერ მიუწვდომელია',
      };
      setActionMessage(labels[result.error]);
      return;
    }
    setActionMessage(result.amount ? `${result.message} · ${result.amount.toLocaleString('ka-GE')} ₾` : result.message);
  }

  return (
    <div className="space-y-4">
      {selectedBuilding ? (
        <BuildingWorkspace
          building={selectedBuilding}
          manager={manager}
          team={team}
          snapshot={citySnapshot}
          clubEffects={clubEffects}
          facility={facilities[selectedBuilding.spriteKey] ?? DEFAULT_FACILITY_STATE[selectedBuilding.spriteKey]}
          pendingAction={pendingAction}
          actionMessage={actionMessage}
          onRunAction={runCityAction}
          onRunPlayerAction={runPlayerAction}
          onBack={() => setSelectedKey(null)}
        />
      ) : (
        <PlayManagerCityCanvas
          buildings={initialBuildings}
          backgroundUrl={backgroundUrl}
          hud={<CityCommandHud manager={manager} team={team} buildings={initialBuildings} facilities={facilities} snapshot={citySnapshot} clubEffects={clubEffects} />}
          onBuildingSelect={setSelectedKey}
        />
      )}
    </div>
  );
}

function CityCommandHud({
  manager,
  team,
  buildings,
  facilities,
  snapshot,
  clubEffects,
}: {
  manager: PlayManagerCityEditorProps['manager'];
  team: PlayManagerCityEditorProps['team'];
  buildings: EditableCityBuilding[];
  facilities: Record<string, FacilityState>;
  snapshot: PlayManagerCitySnapshot;
  clubEffects: PlayManagerCityEditorProps['clubEffects'];
}) {
  const safeForm = Math.max(0, Math.min(100, Math.round(team.formPercent)));
  const formLabel = safeForm >= 100 ? 'Ready' : `${safeForm}%`;
  const initials = getInitials(team.name);
  const facilityAlerts = buildings
    .map((building) => ({ ...building, facility: facilities[building.spriteKey] }))
    .filter((building) => building.facility?.status === 'attention' || building.facility?.status === 'upgradeable')
    .slice(0, 2);
  const eventAlerts = snapshot.eventFeed
    .filter((event) => event.accent === 'red' || event.category === 'medical' || event.category === 'finance')
    .slice(0, 2);

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
          <p className="truncate text-sm font-black text-white">{manager.name}</p>
          <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
            @{manager.username}
          </p>
          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/62">
            Lvl {manager.level} · {manager.title}
          </p>
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
            <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[9px] font-black text-white/56">
              {manager.xpToNextLevel} XP next
            </span>
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
        <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/38">Club clock</p>
          <strong className="mt-1 block text-xs font-black text-white">{snapshot.clock.label}</strong>
          <p className="mt-1 text-[10px] font-bold text-emerald-100/60">{snapshot.eventFeed.length} live events</p>
        </div>
        <div className="pm-city-alerts">
          {facilityAlerts.map((building) => (
            <button key={building.spriteKey} type="button" className="pm-city-alert-chip">
              <StatusIcon status={building.facility.status} />
              <span>{building.label}</span>
            </button>
          ))}
          {eventAlerts.map((event) => (
            <button
              key={event.id}
              type="button"
              className={`pm-city-alert-chip ${
                event.accent === 'red'
                  ? 'border-red-900/30 bg-red-950/22 text-red-50'
                  : event.accent === 'gold'
                    ? 'border-yellow-300/18 bg-yellow-300/10 text-yellow-50'
                    : ''
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{event.title}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
          {clubEffects.spotlight.slice(1).map((effect) => (
            <span key={effect.key} className="rounded-full border border-white/10 bg-black/34 px-2 py-1 text-[9px] font-black text-white/72">
              {effect.label} {effect.value}
            </span>
          ))}
        </div>
      </div>
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

function BuildingWorkspace({
  building,
  manager,
  team,
  snapshot,
  clubEffects,
  facility,
  pendingAction,
  actionMessage,
  onRunAction,
  onRunPlayerAction,
  onBack,
}: {
  building: EditableCityBuilding;
  manager: PlayManagerCityEditorProps['manager'];
  team: PlayManagerCityEditorProps['team'];
  snapshot: PlayManagerCitySnapshot;
  clubEffects: PlayManagerCityEditorProps['clubEffects'];
  facility: FacilityState;
  pendingAction: string | null;
  actionMessage: string | null;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
  onBack: () => void;
}) {
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

  return (
    <div className="pm-three-host pm-building-workspace">
      <div className="pm-building-workspace-environment" aria-hidden="true" />
      <div className="pm-building-workspace-pitch" aria-hidden="true" />
      {building.spriteUrl ? (
        <div className="pm-building-workspace-sprite" aria-hidden="true">
          <Image
            src={building.spriteUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 72vw, 46vw"
            className="object-contain"
            priority
          />
        </div>
      ) : null}
      <div className="relative z-10 flex h-full flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
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

        <div className="mt-auto grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="pm-facility-icon">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-emerald-100/60">
              {page.eyebrow}
            </p>
            <h3 className="mt-3 max-w-3xl text-4xl font-black leading-none text-white sm:text-5xl">
              {page.title}
            </h3>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/62">
              {page.summary}
            </p>
            <div className="mt-4 inline-flex flex-col rounded-2xl border border-white/10 bg-black/34 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Live Effect</p>
              <p className="mt-2 text-lg font-black text-white">{facilityEffect.value}</p>
              <p className="mt-1 text-xs font-bold text-emerald-100/60">{facilityEffect.description}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/36">
                Lvl {facility.level} · {manager.title}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {page.metrics.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-emerald-300/12 bg-black/38 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

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
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/50 p-4 shadow-[inset_0_0_34px_rgba(34,197,94,0.06)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Activity className="h-4 w-4 text-emerald-200" />
              მოქმედებები
            </div>
            <div className="space-y-2">
              {page.actions.map((action, index) => {
                const cityAction = index === 0 ? primaryAction : index === 2 ? 'facility_upgrade' : null;
                const isPending =
                  cityAction !== null && pendingAction === `${building.spriteKey}:${cityAction}`;
                return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    if (cityAction) onRunAction(building.spriteKey, cityAction);
                  }}
                  disabled={!cityAction || isPending}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-sm font-black text-white transition hover:border-emerald-300/30 hover:bg-emerald-300/10"
                >
                  {isPending ? 'მუშავდება...' : action}
                </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => primaryAction && onRunAction(building.spriteKey, primaryAction)}
                disabled={!primaryAction || primaryPending}
                className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {primaryPending ? 'მუშავდება...' : 'Run'}
              </button>
              <button
                type="button"
                onClick={() => onRunAction(building.spriteKey, 'facility_upgrade')}
                disabled={upgradePending}
                className="rounded-2xl border border-yellow-300/18 bg-yellow-300/10 px-3 py-3 text-xs font-black text-white transition hover:bg-yellow-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {upgradePending ? 'მუშავდება...' : `Upgrade ${facility.upgradeCost}`}
              </button>
            </div>
            {actionMessage ? (
              <p className="mt-3 rounded-2xl border border-emerald-300/16 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-50">
                {actionMessage}
              </p>
            ) : null}
          </div>
        </div>

        <FacilityModule
          spriteKey={building.spriteKey}
          team={team}
          snapshot={snapshot}
          pendingAction={pendingAction}
          onRunPlayerAction={onRunPlayerAction}
        />
      </div>
    </div>
  );
}

function FacilityModule({
  spriteKey,
  team,
  snapshot,
  pendingAction,
  onRunPlayerAction,
}: {
  spriteKey: string;
  team: PlayManagerCityEditorProps['team'];
  snapshot: PlayManagerCitySnapshot;
  pendingAction: string | null;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
}) {
  const [lineupDraft, setLineupDraft] = useState(() => ({
    starters: snapshot.starters,
    bench: snapshot.bench,
    reserves: snapshot.reserves,
  }));
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT' | 'SHORTLIST'>('ALL');
  const [matchSettingsDraft, setMatchSettingsDraft] = useState(snapshot.matchSettings);
  const [ticketPriceDraft, setTicketPriceDraft] = useState(snapshot.finance.ticketPrice);

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

      return { starters, bench, reserves };
    });
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
      </GamePanel>
    );
  }

  if (spriteKey === 'training') {
    const lineupIds = [...lineupDraft.starters, ...lineupDraft.bench, ...lineupDraft.reserves].map((player) => player.id);
    return (
      <GamePanel title="სასტარტო 11 და სავარჯიშო ბირთვი" icon={<Dumbbell className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="pm-game-row">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Formation</p>
              <p className="mt-2 text-3xl font-black text-white">{snapshot.formationLabel}</p>
              <p className="mt-2 text-sm font-bold text-emerald-100/70">
                {lineupDraft.starters.length} Starter · {lineupDraft.bench.length} Bench · {lineupDraft.reserves.length} Reserve
              </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat
                label="AVG OVR"
                  value={String(
                    lineupDraft.starters.length > 0
                      ? Math.round(
                          lineupDraft.starters.reduce((sum, player) => sum + player.ovrCurrent, 0) /
                            lineupDraft.starters.length,
                        )
                      : 0,
                  )}
              />
              <MiniStat
                label="FITNESS"
                value={`${Math.max(
                  0,
                  100 -
                      Math.round(
                        lineupDraft.starters.reduce((sum, player) => sum + player.fatigue, 0) /
                          Math.max(1, lineupDraft.starters.length),
                      ),
                  )}%`}
                />
                <MiniStat label="FOCUS" value="433" />
              </div>
              <button
                type="button"
                disabled={pendingAction === 'lineup:save'}
                onClick={() => onRunPlayerAction('lineup:save', () => savePlayManagerLineup(lineupIds))}
                className="mt-4 w-full rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === 'lineup:save' ? 'ინახება...' : 'Save lineup'}
              </button>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              <SquadColumn title="Starter XI" accent="green" players={lineupDraft.starters} onMove={movePlayer} />
              <SquadColumn title="Bench" accent="gold" players={lineupDraft.bench} onMove={movePlayer} />
              <SquadColumn title="Reserve" accent="red" players={lineupDraft.reserves} onMove={movePlayer} />
            </div>
          </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {(snapshot.squad.length > 0 ? snapshot.squad.slice(0, 3) : TRAINING_SLOTS).map((slot) => (
            <div key={slot.name} className="pm-game-row">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{slot.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                    {'position' in slot ? slot.position : slot.pos}
                  </p>
                </div>
                <Zap className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <strong className="text-lg font-black text-white">
                  {'ovrCurrent' in slot ? `${slot.ovrCurrent} -> ${slot.ovrCurrent + 1}` : slot.ovr}
                </strong>
                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-black text-emerald-100">
                  {'valueLabel' in slot ? '+2,000,000 ₾' : slot.gain}
                </span>
              </div>
              {'id' in slot ? (
                <button
                  type="button"
                  disabled={pendingAction === `train:${slot.id}`}
                  onClick={() => onRunPlayerAction(`train:${slot.id}`, () => trainPlayManagerPlayer(slot.id))}
                  className="mt-3 w-full rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingAction === `train:${slot.id}` ? 'მუშავდება...' : 'ვარჯიში'}
                </button>
              ) : null}
            </div>
          ))}
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
    const seasonOutcomeLabel =
      snapshot.season.lastOutcome === 'promoted'
        ? 'Promotion'
        : snapshot.season.lastOutcome === 'relegated'
          ? 'Relegation'
          : snapshot.season.lastOutcome === 'stayed'
            ? 'Stayed'
            : 'Active';
    return (
      <GamePanel title="ლიგის ცხრილი" icon={<Landmark className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            {snapshot.standings.map((row, index) => (
              <div key={row.team} className="pm-table-row">
                <span className="text-white/42">#{index + 1}</span>
                <strong>{row.team}</strong>
                <span>{row.pts} ქულა</span>
                <span>{row.formPercent}%</span>
              </div>
            ))}
          </div>
          <div className="pm-game-row">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Season {snapshot.season.seasonNo}</p>
            <p className="mt-2 text-xl font-black text-white">
              {snapshot.season.isCompleted ? 'სეზონი დასრულდა' : snapshot.nextMatchLabel}
            </p>
            <p className="mt-2 text-sm font-bold text-emerald-100/70">
              ფორმა {snapshot.formPercent}% · {snapshot.season.isCompleted ? seasonOutcomeLabel : 'საშინაო მატჩი'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-4">
          <FinanceCard label="სეზონი" value={`S${snapshot.season.seasonNo}`} tone="green" />
          <FinanceCard label="სტატუსი" value={snapshot.season.isCompleted ? 'Finished' : 'Active'} tone="gold" />
          <FinanceCard label="ბოლო ფინიში" value={snapshot.season.lastFinish ? `#${snapshot.season.lastFinish}` : '-'} tone="green" />
          <FinanceCard label="ჯილდო" value={snapshot.season.lastReward > 0 ? snapshot.season.lastRewardLabel : '₾0'} tone="gold" />
        </div>
        {snapshot.season.isCompleted ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/16 bg-emerald-300/8 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/62">Season Summary</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <MiniStat label="FINISH" value={snapshot.season.lastFinish ? `#${snapshot.season.lastFinish}` : '-'} />
              <MiniStat label="OUTCOME" value={seasonOutcomeLabel} />
              <MiniStat label="REWARD" value={snapshot.season.lastReward > 0 ? snapshot.season.lastRewardLabel : '₾0'} />
            </div>
            <p className="mt-3 text-xs font-bold text-white/56">
              შემდეგი სიმულაცია ავტომატურად დაიწყებს ახალ სეზონს განახლებული დივიზიონით.
            </p>
          </div>
        ) : null}
      </GamePanel>
    );
  }

  if (spriteKey === 'finance') {
    return (
      <GamePanel title="ეკონომიკის კონტროლი" icon={<Coins className="h-4 w-4" />}>
        <div className="grid gap-2 lg:grid-cols-4">
          <FinanceCard label="ბალანსი" value={team.balanceLabel} tone="green" />
          <FinanceCard label="სპონსორი" value={snapshot.finance.sponsorWeeklyAmountLabel} tone="green" />
          <FinanceCard label="ხელფასები" value={snapshot.finance.weeklyWagesLabel} tone="red" />
          <FinanceCard label="კვირა" value={`W${snapshot.clock.weekNo} / D${snapshot.clock.dayNo}`} tone="gold" />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-white/10 bg-black/28 p-4">
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
          <div className="rounded-2xl border border-white/10 bg-black/28 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Ticket desk</p>
            <p className="mt-2 text-xl font-black text-white">{ticketPriceDraft.toLocaleString('ka-GE')} ₾</p>
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
              <span>{new Date(transaction.createdAt).toLocaleDateString('ka-GE')}</span>
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
    const projectedAttendance = getProjectedAttendance({
      formPercent: snapshot.formPercent,
      readiness: matchSettingsDraft.readiness,
      ticketPrice: ticketPriceDraft,
    });
    const projectedIncome = getProjectedMatchdayIncome({
      attendance: projectedAttendance,
      ticketPrice: ticketPriceDraft,
    });
    return (
      <GamePanel title="მატჩის დღე და ტაქტიკა" icon={<Trophy className="h-4 w-4" />}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceCard label="შემდეგი მატჩი" value={snapshot.nextMatchLabel} tone="green" />
              <FinanceCard label="Readiness" value={`${matchSettingsDraft.readiness}%`} tone="green" />
              <FinanceCard label="Attendance" value={projectedAttendance.toLocaleString('ka-GE')} tone="gold" />
              <FinanceCard label="Revenue" value={formatGel(projectedIncome)} tone="green" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MatchdaySelect
                label="Style"
                value={matchSettingsDraft.tacticalStyle}
                options={[
                  ['balanced', 'Balanced'],
                  ['pressing', 'Pressing'],
                  ['possession', 'Possession'],
                  ['counter', 'Counter'],
                ]}
                onChange={(value) => updateMatchSetting('tacticalStyle', value)}
              />
              <MatchdaySelect
                label="Line"
                value={matchSettingsDraft.defensiveLine}
                options={[
                  ['low', 'Low'],
                  ['mid', 'Mid'],
                  ['high', 'High'],
                ]}
                onChange={(value) => updateMatchSetting('defensiveLine', value)}
              />
              <MatchdaySelect
                label="Tempo"
                value={matchSettingsDraft.tempo}
                options={[
                  ['controlled', 'Controlled'],
                  ['balanced', 'Balanced'],
                  ['direct', 'Direct'],
                ]}
                onChange={(value) => updateMatchSetting('tempo', value)}
              />
              <MatchdaySelect
                label="Focus"
                value={matchSettingsDraft.focusSide}
                options={[
                  ['left', 'Left'],
                  ['center', 'Center'],
                  ['right', 'Right'],
                ]}
                onChange={(value) => updateMatchSetting('focusSide', value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
                className="rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === 'match-settings:save' ? 'ინახება...' : 'ტაქტიკის შენახვა'}
              </button>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-bold text-white/58">
                Available squad {matchSettingsDraft.availableCount} · ticket {ticketPriceDraft} ₾
              </div>
            </div>
          </div>
          <div className="pm-game-row">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Matchday feed</p>
            <p className="mt-2 text-xl font-black text-white">{snapshot.matchHistory[0]?.opponent ?? 'Season Kickoff'}</p>
            <p className="mt-2 text-sm font-bold text-emerald-100/70">
              {matchSettingsDraft.tacticalStyle} · {matchSettingsDraft.tempo} · {matchSettingsDraft.defensiveLine} line
            </p>
            <div className="mt-4 space-y-2">
              {snapshot.matchHistory.length > 0 ? (
                snapshot.matchHistory.slice(0, 3).map((match) => (
                  <div key={`${match.round}-${match.opponent}`} className="pm-table-row">
                    <span className="text-white/42">R{match.round}</span>
                    <strong>{match.opponent}</strong>
                    <span>{match.result} {match.score}</span>
                    <span>{match.incomeLabel}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs font-bold text-white/42">
                  ჯერ მატჩის ისტორია არ არსებობს
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {snapshot.squad.slice(0, 6).map((player) => (
            <div key={player.id} className="pm-game-row">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{player.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                    {player.position} · OVR {player.ovrCurrent}
                  </p>
                </div>
                <span className={`pm-rating-pill ${player.availability === 'injured' ? 'border-red-400/30 text-red-100' : ''}`}>
                  {player.availability === 'injured' ? 'OUT' : player.ovrCurrent}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="FIT" value={`${Math.max(0, 100 - player.fatigue)}%`} />
                <MiniStat label="MOR" value={`${player.morale}%`} />
                <MiniStat label="AVL" value={player.availability === 'injured' ? `${player.injuryMatches}G` : 'Ready'} />
              </div>
            </div>
          ))}
        </div>
      </GamePanel>
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
    <label className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
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

function SquadColumn({
  title,
  accent,
  players,
  onMove,
}: {
  title: string;
  accent: 'green' | 'gold' | 'red';
  players: PlayManagerCitySnapshot['squad'];
  onMove: (targetRole: 'starter' | 'bench' | 'reserve', playerId: string) => void;
}) {
  const accentClass =
    accent === 'green'
      ? 'border-emerald-300/18 bg-emerald-300/8'
      : accent === 'gold'
        ? 'border-yellow-300/18 bg-yellow-300/8'
        : 'border-red-900/24 bg-red-950/18';

  return (
    <div className={`rounded-2xl border p-3 ${accentClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/58">{title}</p>
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-black text-white/62">
          {players.length}
        </span>
      </div>
      <div className="space-y-2">
        {players.length > 0 ? (
          players.map((player) => (
            <div key={player.id} className="rounded-xl border border-white/8 bg-black/26 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{player.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                    {player.position} · Fatigue {player.fatigue}% · Morale {player.morale}%
                  </p>
                </div>
                <span className={`pm-rating-pill ${player.availability === 'injured' ? 'border-red-400/30 text-red-100' : ''}`}>
                  {player.availability === 'injured' ? 'OUT' : player.ovrCurrent}
                </span>
              </div>
              {player.availability === 'injured' ? (
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-100/80">
                  ტრავმა · {player.injuryMatches} მატჩი
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {player.role !== 'starter' ? (
                  <button
                    type="button"
                    onClick={() => onMove('starter', player.id)}
                    className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2 py-1 text-[10px] font-black text-white transition hover:bg-emerald-300/16"
                  >
                    Starter
                  </button>
                ) : null}
                {player.role !== 'bench' ? (
                  <button
                    type="button"
                    onClick={() => onMove('bench', player.id)}
                    className="rounded-full border border-yellow-300/18 bg-yellow-300/10 px-2 py-1 text-[10px] font-black text-white transition hover:bg-yellow-300/16"
                  >
                    Bench
                  </button>
                ) : null}
                {player.role !== 'reserve' ? (
                  <button
                    type="button"
                    onClick={() => onMove('reserve', player.id)}
                    className="rounded-full border border-red-900/24 bg-red-950/22 px-2 py-1 text-[10px] font-black text-white transition hover:bg-red-950/34"
                  >
                    Reserve
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs font-bold text-white/42">
            ადგილი თავისუფალია
          </div>
        )}
      </div>
    </div>
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
