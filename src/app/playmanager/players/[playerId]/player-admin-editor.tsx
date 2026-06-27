'use client';

import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayerFutCard } from '@/components/playmanager/player-fut-card';
import {
  formatGel,
  getCurrentTransferValueGel,
  getTalentClassAdjustedTransferValueGel,
} from '@/lib/playmanager/economy';
import { GK_LABELS, normalizePlayerStats, OUT_LABELS, type PlayerStatKey } from '@/lib/playmanager/player-card-stats';
import { TRAITS, TRAIT_KEYS } from '@/lib/playmanager/traits';
import type { PlayManagerPlayerAdminDraft } from './actions';
import { updatePlayManagerPlayerAdmin } from './actions';

const POSITION_OPTIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'LM', 'RM', 'AM'];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'injured', label: 'Injured' },
  { value: 'retired', label: 'Retired' },
];
const STAT_LABELS: Record<PlayerStatKey, string> = {
  PAC: 'სისწრაფე',
  SHO: 'დარტყმა',
  PAS: 'პასი',
  DRI: 'დრიბლინგი',
  DEF: 'დაცვა',
  PHY: 'ფიზიკა',
  DIV: 'ნახტომი',
  HAN: 'ხელები',
  KIC: 'გადაცემა',
  REF: 'რეაქცია',
  SPD: 'სისწრაფე',
  POS: 'პოზიცია',
};

type Props = {
  playerId: string;
  draft: PlayManagerPlayerAdminDraft;
};

function sanitizeDraft(draft: PlayManagerPlayerAdminDraft): PlayManagerPlayerAdminDraft {
  const primaryPosition = draft.primaryPosition.trim().toUpperCase();
  return {
    ...draft,
    primaryPosition,
    cardStats: normalizePlayerStats(primaryPosition, draft.cardStats, draft.ovrBase),
  };
}

export function PlayManagerPlayerAdminEditor({ playerId, draft: initialDraft }: Props) {
  const [draft, setDraft] = useState(() => sanitizeDraft(initialDraft));
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const previewName = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim() || 'Player';

  // Mirror the save-time + market formula: OVR-derived value, talent premium on top.
  const derivedMarketValue = getTalentClassAdjustedTransferValueGel(
    getCurrentTransferValueGel(draft.ovrBase, draft.ovrCurrent),
    draft.talent,
  );

  function patch<K extends keyof PlayManagerPlayerAdminDraft>(key: K, value: PlayManagerPlayerAdminDraft[K]) {
    setDraft((current) => sanitizeDraft({ ...current, [key]: value }));
  }

  function patchStat(key: PlayerStatKey, value: number) {
    setDraft((current) => ({
      ...sanitizeDraft(current),
      cardStats: {
        ...normalizePlayerStats(current.primaryPosition, current.cardStats, current.ovrBase),
        [key]: Math.max(35, Math.min(99, Math.round(value))),
      },
    }));
  }

  const statKeys = draft.primaryPosition === 'GK' ? GK_LABELS : OUT_LABELS;

  function toggleTrait(key: string) {
    setDraft((current) => {
      const has = current.traits.includes(key);
      if (has) return { ...current, traits: current.traits.filter((t) => t !== key) };
      if (current.traits.length >= 3) return current; // max 3
      return { ...current, traits: [...current.traits, key] };
    });
  }

  async function handleUpload(file: File) {
    if (file.type !== 'image/png' && file.type !== 'image/webp') {
      toast.error('მხოლოდ PNG ან WEBP გამოიყენე');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'playmanager-players');

    setUploading(true);
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    setUploading(false);

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.url) {
      toast.error('ფოტოს ატვირთვა ვერ მოხერხდა');
      return;
    }

    patch('cardImageUrl', data.url);
    toast.success('ფოტო ატვირთულია');
  }

  function save() {
    startTransition(() => {
      void (async () => {
        const result = await updatePlayManagerPlayerAdmin(playerId, draft);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message);
        router.refresh();
      })();
    });
  }

  return (
    <section className="rounded-[28px] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(29,17,3,0.88),rgba(5,5,5,0.94))] p-4 shadow-[inset_0_0_50px_rgba(245,158,11,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200/70">Admin editor</p>
          <h2 className="mt-1 text-xl font-black text-white">მოთამაშის რედაქტირება</h2>
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={pending || uploading}
          className="rounded-2xl bg-amber-300 px-4 text-xs font-black text-black hover:bg-amber-200"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          შენახვა
        </Button>
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="სახელი" value={draft.firstName} onChange={(value) => patch('firstName', value)} />
            <TextField label="გვარი" value={draft.lastName} onChange={(value) => patch('lastName', value)} />
            <TextField label="FUTCARD გვარი" value={draft.cardDisplayName} onChange={(value) => patch('cardDisplayName', value)} />
            <TextField label="დროშის კოდი" value={draft.nationalityCode} onChange={(value) => patch('nationalityCode', value.toLowerCase())} />
            <SelectField label="პოზიცია" value={draft.primaryPosition} options={POSITION_OPTIONS} onChange={(value) => patch('primaryPosition', value)} />
            <NumberField label="Base OVR" value={draft.ovrBase} min={40} max={99} onChange={(value) => patch('ovrBase', value)} />
            <NumberField label="Current OVR" value={draft.ovrCurrent} min={40} max={99} onChange={(value) => patch('ovrCurrent', value)} />
            <NumberField label="Talent" value={draft.talent} min={1} max={12} onChange={(value) => patch('talent', value)} />
            <NumberField label="ასაკი" value={draft.age} min={18} max={40} onChange={(value) => patch('age', value)} />
            <NumberField label="მორალი" value={draft.morale} min={0} max={100} onChange={(value) => patch('morale', value)} />
            <NumberField label="დაღლა" value={draft.fatigue} min={0} max={100} onChange={(value) => patch('fatigue', value)} />
            <NumberField label="ტრავმის მატჩები" value={draft.injuryMatches} min={0} max={99} onChange={(value) => patch('injuryMatches', value)} />
            <SelectField label="სტატუსი" value={draft.status} options={STATUS_OPTIONS.map((option) => option.value)} labels={Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label]))} onChange={(value) => patch('status', value)} />
            <ReadOnlyField label="საბაზრო ფასი (OVR × talent)" value={formatGel(derivedMarketValue)} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">თვისებები (max 3)</p>
              <span className="text-[10px] font-bold text-white/40">{draft.traits.length}/3</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRAIT_KEYS.map((key) => {
                const trait = TRAITS[key];
                const active = draft.traits.includes(key);
                const disabled = !active && draft.traits.length >= 3;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleTrait(key)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                      active
                        ? `${trait.bg} ${trait.border} ${trait.color}`
                        : disabled
                          ? 'cursor-not-allowed border-white/8 bg-white/[0.02] text-white/25'
                          : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span aria-hidden>{trait.icon}</span>
                    {trait.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">PNG / WEBP portrait</p>
                <p className="mt-1 text-sm font-bold text-white/70">ფოტოს ატვირთვა და გასწორება</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  ფოტოს ატვირთვა
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patch('cardImageUrl', '')}
                  className="rounded-2xl border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/16"
                >
                  <Trash2 className="h-4 w-4" />
                  წაშლა
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <TextField label="Image URL" value={draft.cardImageUrl} onChange={(value) => patch('cardImageUrl', value)} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Playing profile</p>
              <p className="mt-1 text-sm font-bold text-white/70">სათამაშო პროფილის რედაქტირება</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {statKeys.map((statKey) => (
                <RangeField
                  key={statKey}
                  label={`${statKey} · ${STAT_LABELS[statKey]}`}
                  min={35}
                  max={99}
                  step={1}
                  value={Number(draft.cardStats?.[statKey] ?? 35)}
                  onChange={(value) => patchStat(statKey, value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/36 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Live preview</p>
          <div className="mt-4 flex justify-center">
            <PlayerFutCard
              name={previewName}
              labelOverride={draft.cardDisplayName}
              imageUrl={draft.cardImageUrl}
              nationalityCode={draft.nationalityCode}
              position={draft.primaryPosition}
              ovr={draft.ovrBase}
              stats={draft.cardStats}
              availability={draft.status === 'injured' || draft.injuryMatches > 0 ? 'injured' : 'ready'}
              talent={draft.talent}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border-white/10 bg-black/40 text-white"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</span>
      <div className="flex h-11 items-center rounded-2xl border border-emerald-300/20 bg-emerald-500/[0.06] px-3 text-sm font-black text-emerald-100">
        {value}
      </div>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</span>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-2xl border-white/10 bg-black/40 text-white"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-3 text-sm font-bold text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#050505]">
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  // Guard against undefined/NaN so the input stays controlled for its whole
  // lifetime (DB-derived stats can be null before normalization).
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : min;
  return (
    <label className="block space-y-2 rounded-2xl border border-white/10 bg-black/28 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</span>
        <span className="text-xs font-black text-white">{safeValue.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-300"
      />
    </label>
  );
}
