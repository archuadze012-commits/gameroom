"use client";

import { useRef, useState } from "react";
import {
  Check,
  Crown,
  Plus,
  Radio,
  Save,
  Send,
  Shield,
  Swords,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ClanApplication,
  type ClanMember,
  type ClanMemberRole,
  type ClanInvite,
  type MyClanState,
  makeEmptyClan,
} from "@/components/clans/clan-store";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

type StatTileProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

type CreateClanDraft = {
  name: string;
  tag: string;
  game: string;
  server: string;
  motto: string;
};

type MyClanConsoleProps = {
  clan: MyClanState | null;
  setClan: React.Dispatch<React.SetStateAction<MyClanState | null>>;
};

const emptyDraft: CreateClanDraft = {
  name: "",
  tag: "",
  game: "PUBG Mobile",
  server: "Asia",
  motto: "",
};

function ClanBadge({ tag }: { tag: string }) {
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <div
        className="absolute inset-0 bg-gradient-to-br from-violet-500/45 to-cyan-500/20"
        style={{ clipPath: "polygon(50% 0, 92% 22%, 82% 84%, 50% 100%, 18% 84%, 8% 22%)" }}
      />
      <div
        className="relative grid h-[58px] w-[58px] place-items-center bg-[var(--gr-bg-0)] ring-1 ring-white/10"
        style={{ clipPath: "polygon(50% 0, 92% 22%, 82% 84%, 50% 100%, 18% 84%, 8% 22%)" }}
      >
        <span className="font-display text-[17px] font-black uppercase text-[var(--gr-text)]">{tag}</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon }: StatTileProps) {
  return (
    <div className="relative isolate bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)]" style={{ clipPath: cutSm }}>
      <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">{label}</p>
          <p className="mt-1 font-display text-[22px] font-extrabold uppercase text-[var(--gr-text)]">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[var(--gr-violet-hi)]" />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full bg-[var(--gr-bg-0)] px-3 text-[13px] font-semibold text-[var(--gr-text)] outline-none ring-1 ring-[var(--gr-border)] transition focus:ring-[var(--gr-violet-hi)]"
        style={{ clipPath: cutSm }}
      />
    </label>
  );
}

function CreateClanDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CreateClanDraft;
  onDraftChange: (draft: CreateClanDraft) => void;
  onCreate: () => void;
}) {
  const canCreate = draft.name.trim().length >= 3 && draft.tag.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-0 text-[var(--gr-text)]" showCloseButton>
        <div className="p-5">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-extrabold uppercase text-[var(--gr-text)]">
              კლანის შექმნა
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[var(--gr-text-mute)]">
              შექმენი რეალური კლანი, რომელსაც მერე `/clans` გვერდზეც და “ჩემი კლანი” პანელშიც ვნახავთ.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="კლანის სახელი" value={draft.name} onChange={(name) => onDraftChange({ ...draft, name })} />
            <Field label="TAG" value={draft.tag} maxLength={4} onChange={(tag) => onDraftChange({ ...draft, tag: tag.toUpperCase() })} />
            <Field label="თამაში" value={draft.game} onChange={(game) => onDraftChange({ ...draft, game })} />
            <Field label="სერვერი" value={draft.server} onChange={(server) => onDraftChange({ ...draft, server })} />
          </div>

          <label className="mt-4 block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">მოტო</span>
            <textarea
              value={draft.motto}
              onChange={(event) => onDraftChange({ ...draft, motto: event.target.value })}
              className="mt-2 min-h-24 w-full resize-none bg-[var(--gr-bg-0)] p-3 text-[13px] font-semibold text-[var(--gr-text)] outline-none ring-1 ring-[var(--gr-border)] transition focus:ring-[var(--gr-violet-hi)]"
              style={{ clipPath: cutSm }}
            />
          </label>
        </div>

        <DialogFooter className="border-[var(--gr-border)] bg-[var(--gr-bg-0)]/70">
          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate}
            className="inline-flex h-10 items-center gap-2 bg-[var(--gr-violet)]/20 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/45 transition hover:ring-[var(--gr-violet-hi)] disabled:opacity-40"
            style={{ clipPath: cutSm }}
          >
            <Plus className="h-4 w-4" /> შექმნა
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyClanConsole({ clan, setClan }: MyClanConsoleProps) {
  const [inviteName, setInviteName] = useState("");
  const [saved, setSaved] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<CreateClanDraft>(emptyDraft);
  const idCounter = useRef(10);

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  function updateClan(updater: (current: MyClanState) => MyClanState) {
    setClan((current) => (current ? updater(current) : current));
  }

  function pushActivity(message: string) {
    updateClan((current) => ({
      ...current,
      activity: [message, ...current.activity].slice(0, 6),
    }));
  }

  function createClan() {
    const nextClan = makeEmptyClan(draft.name.trim(), draft.tag.trim().toUpperCase());
    nextClan.game = draft.game.trim() || "PUBG Mobile";
    nextClan.server = draft.server.trim() || "Asia";
    nextClan.motto = draft.motto.trim() || "ახალი კლანი მზად არის პირველი მატჩისთვის.";
    nextClan.activity = [`${nextClan.name} შეიქმნა`, ...nextClan.activity].slice(0, 6);
    setClan(nextClan);
    setCreateOpen(false);
    setDraft(emptyDraft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function saveSettings() {
    if (!clan) return;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
    pushActivity("კლანის პარამეტრები შეინახა");
  }

  function deleteClan() {
    setClan(null);
    setSaved(false);
  }

  function sendInvite() {
    if (!clan) return;
    const username = inviteName.trim().replace(/^@/, "");
    if (!username) return;
    const invite: ClanInvite = { id: nextId("i"), username, status: "sent" };
    updateClan((current) => ({ ...current, invites: [invite, ...current.invites] }));
    setInviteName("");
    pushActivity(`@${username}-ს გაეგზავნა მოწვევა`);
  }

  function acceptApplication(application: ClanApplication) {
    const member: ClanMember = {
      id: nextId("m"),
      name: application.name,
      role: "Member",
      status: "online",
      contribution: 0,
    };
    updateClan((current) => ({
      ...current,
      members: [...current.members, member],
      applications: current.applications.filter((item) => item.id !== application.id),
      activity: [`${application.name} გახდა კლანის წევრი`, ...current.activity].slice(0, 6),
    }));
  }

  function declineApplication(application: ClanApplication) {
    updateClan((current) => ({
      ...current,
      applications: current.applications.filter((item) => item.id !== application.id),
      activity: [`${application.name}-ის განაცხადი უარყოფილია`, ...current.activity].slice(0, 6),
    }));
  }

  function updateRole(memberId: string, role: ClanMemberRole) {
    updateClan((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === memberId ? { ...member, role } : member)),
      activity: ["წევრის როლი განახლდა", ...current.activity].slice(0, 6),
    }));
  }

  function removeMember(member: ClanMember) {
    if (member.role === "Leader") return;
    updateClan((current) => ({
      ...current,
      members: current.members.filter((item) => item.id !== member.id),
      activity: [`${member.name} წაიშალა კლანიდან`, ...current.activity].slice(0, 6),
    }));
  }

  if (!clan) {
    return (
      <section id="my-clan" className="scroll-mt-24">
        <CreateClanDialog open={createOpen} onOpenChange={setCreateOpen} draft={draft} onDraftChange={setDraft} onCreate={createClan} />
        <EmptyState
          tone="violet"
          illustration={<Shield className="h-10 w-10 text-[var(--gr-violet-hi)]" />}
          title="ჯერ კლანი არ შეგიქმნია"
          description="შექმენი საკუთარი კლანი და აქ გამოჩნდება წევრების მართვა, მოწვევები, განაცხადები და სრული command center."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 bg-[var(--gr-violet)]/20 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/45 transition hover:ring-[var(--gr-violet-hi)]"
              style={{ clipPath: cutSm }}
            >
              <Plus className="h-4 w-4" /> კლანის შექმნა
            </button>
          }
        />
      </section>
    );
  }

  const onlineCount = clan.members.filter((member) => member.status === "online").length;
  const totalContribution = clan.members.reduce((sum, member) => sum + member.contribution, 0);
  const winRate = Math.min(92, 52 + Math.floor(totalContribution / 1000));
  const stats = [
    { label: "წევრი", value: `${clan.members.length}/30`, icon: Users },
    { label: "Win rate", value: `${winRate}%`, icon: Trophy },
    { label: "ონლაინ", value: `${onlineCount}`, icon: Radio },
    { label: "რანგი", value: "#12", icon: Crown },
  ];

  return (
    <section id="my-clan" className="space-y-6 scroll-mt-24">
      <CreateClanDialog open={createOpen} onOpenChange={setCreateOpen} draft={draft} onDraftChange={setDraft} onCreate={createClan} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
          <div className="relative overflow-hidden bg-[var(--gr-bg-1)] p-5 sm:p-6" style={{ clipPath: cutMd }}>
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/16 to-transparent" />
            <div className="relative z-[1] flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <ClanBadge tag={clan.tag || "CL"} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-amber)]">COMMAND CENTER</p>
                  <h2 className="mt-2 font-display text-[28px] font-extrabold uppercase leading-none text-[var(--gr-text)]">{clan.name}</h2>
                  <p className="mt-2 text-[13px] text-[var(--gr-text-mute)]">
                    {clan.game} · {clan.server} server · {clan.recruiting ? "რეკრუტინგი ღიაა" : "რეკრუტინგი დახურულია"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ChevronButton href="/lfg?mode=classic" variant="violet" size="sm">
                  <Swords className="h-3.5 w-3.5" /> მატჩი
                </ChevronButton>
                <button
                  type="button"
                  onClick={() => updateClan((current) => ({ ...current, recruiting: !current.recruiting }))}
                  className="inline-flex h-9 items-center gap-2 bg-[var(--gr-bg-0)] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-text)] ring-1 ring-[var(--gr-border)] transition hover:ring-[var(--gr-violet-hi)]"
                  style={{ clipPath: cutSm }}
                >
                  <Radio className="h-3.5 w-3.5" /> {clan.recruiting ? "დახურვა" : "გახსნა"}
                </button>
              </div>
            </div>

            <div className="relative z-[1] mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <StatTile key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </div>

        <aside className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
          <div className="h-full bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutMd }}>
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-cyan)]">აქტივობა</p>
            <div className="mt-4 space-y-3">
              {clan.activity.map((item) => (
                <div key={item} className="flex gap-3 border-b border-[var(--gr-border)] pb-3 last:border-b-0 last:pb-0">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gr-cyan)]" />
                  <p className="text-[13px] leading-relaxed text-[var(--gr-text-mute)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
            <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutMd }}>
              <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]">პარამეტრები</p>
              <div className="mt-4 space-y-4">
                <Field label="კლანის სახელი" value={clan.name} onChange={(name) => updateClan((current) => ({ ...current, name }))} />
                <Field label="TAG" value={clan.tag} maxLength={4} onChange={(tag) => updateClan((current) => ({ ...current, tag: tag.toUpperCase() }))} />
                <Field label="თამაში" value={clan.game} onChange={(game) => updateClan((current) => ({ ...current, game }))} />
                <Field label="სერვერი" value={clan.server} onChange={(server) => updateClan((current) => ({ ...current, server }))} />
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">მოტო</span>
                  <textarea
                    value={clan.motto}
                    onChange={(event) => updateClan((current) => ({ ...current, motto: event.target.value }))}
                    className="mt-2 min-h-24 w-full resize-none bg-[var(--gr-bg-0)] p-3 text-[13px] font-semibold text-[var(--gr-text)] outline-none ring-1 ring-[var(--gr-border)] transition focus:ring-[var(--gr-violet-hi)]"
                    style={{ clipPath: cutSm }}
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveSettings}
                  className="inline-flex h-10 items-center gap-2 bg-[var(--gr-violet)]/20 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/45 transition hover:ring-[var(--gr-violet-hi)]"
                  style={{ clipPath: cutSm }}
                >
                  <Save className="h-4 w-4" /> {saved ? "შენახულია" : "შენახვა"}
                </button>
                <button
                  type="button"
                  onClick={deleteClan}
                  className="inline-flex h-10 items-center gap-2 bg-[var(--gr-bg-0)] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)] transition hover:text-[var(--gr-text)] hover:ring-[var(--gr-magenta)]"
                  style={{ clipPath: cutSm }}
                >
                  <Trash2 className="h-4 w-4" /> კლანის წაშლა
                </button>
              </div>
            </div>
          </section>

          <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
            <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutMd }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-amber)]">მოწვევა</p>
              <div className="mt-4 flex gap-2">
                <input
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder="@username"
                  className="h-10 min-w-0 flex-1 bg-[var(--gr-bg-0)] px-3 text-[13px] font-semibold text-[var(--gr-text)] outline-none ring-1 ring-[var(--gr-border)] transition placeholder:text-[var(--gr-text-dim)] focus:ring-[var(--gr-violet-hi)]"
                  style={{ clipPath: cutSm }}
                />
                <button
                  type="button"
                  onClick={sendInvite}
                  className="grid h-10 w-11 place-items-center bg-[var(--gr-amber)]/18 text-[var(--gr-amber)] ring-1 ring-[var(--gr-amber)]/45 transition hover:ring-[var(--gr-amber)]"
                  style={{ clipPath: cutSm }}
                  aria-label="მოწვევის გაგზავნა"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {clan.invites.length === 0 ? (
                  <p className="text-[13px] text-[var(--gr-text-mute)]">აქტიური მოწვევები ჯერ არ არის.</p>
                ) : (
                  clan.invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 bg-[var(--gr-bg-0)] px-3 py-2 ring-1 ring-[var(--gr-border)]" style={{ clipPath: cutSm }}>
                      <span className="truncate text-[13px] font-semibold text-[var(--gr-text)]">@{invite.username}</span>
                      <Pill tone={invite.status === "joined" ? "online" : "amber"}>{invite.status}</Pill>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
            <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutMd }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-cyan)]">წევრები</p>
                <Pill tone="cyan">{clan.members.length}/30</Pill>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {clan.members.map((member) => (
                  <article key={member.id} className="bg-[var(--gr-bg-0)] p-3 ring-1 ring-[var(--gr-border)]" style={{ clipPath: cutSm }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-[16px] font-extrabold uppercase text-[var(--gr-text)]">{member.name}</span>
                          {member.role === "Leader" && <Crown className="h-4 w-4 text-[var(--gr-amber)]" />}
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--gr-text-dim)]">{member.contribution.toLocaleString("en-US")} contribution</p>
                      </div>
                      <Pill tone={member.status === "online" ? "online" : "neutral"} pulse={member.status === "online"}>
                        {member.status}
                      </Pill>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={member.role}
                        disabled={member.role === "Leader"}
                        onChange={(event) => updateRole(member.id, event.target.value as ClanMemberRole)}
                        className="h-8 flex-1 bg-[var(--gr-bg-1)] px-2 text-[11px] font-bold uppercase text-[var(--gr-text-mute)] outline-none ring-1 ring-[var(--gr-border)] disabled:opacity-60"
                        style={{ clipPath: cutSm }}
                      >
                        <option>Leader</option>
                        <option>Officer</option>
                        <option>Member</option>
                      </select>
                      <button
                        type="button"
                        disabled={member.role === "Leader"}
                        onClick={() => removeMember(member)}
                        className="grid h-8 w-9 place-items-center bg-[var(--gr-bg-1)] text-[var(--gr-text-dim)] ring-1 ring-[var(--gr-border)] transition hover:text-[var(--gr-magenta)] disabled:opacity-40"
                        style={{ clipPath: cutSm }}
                        aria-label="წევრის წაშლა"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
            <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutMd }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-amber)]">განაცხადები</p>
                <Pill tone="amber">{clan.applications.length}</Pill>
              </div>
              <div className="mt-4 space-y-3">
                {clan.applications.length === 0 ? (
                  <p className="text-[13px] text-[var(--gr-text-mute)]">ახალი განაცხადები ჯერ არ არის.</p>
                ) : (
                  clan.applications.map((application) => (
                    <article key={application.id} className="flex flex-col gap-3 bg-[var(--gr-bg-0)] p-3 ring-1 ring-[var(--gr-border)] sm:flex-row sm:items-center sm:justify-between" style={{ clipPath: cutSm }}>
                      <div>
                        <h3 className="font-display text-[16px] font-extrabold uppercase text-[var(--gr-text)]">{application.name}</h3>
                        <p className="mt-1 text-[12px] text-[var(--gr-text-dim)]">{application.game} · {application.rank}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => acceptApplication(application)}
                          className="grid h-9 w-10 place-items-center bg-[var(--gr-lime)]/14 text-[var(--gr-lime)] ring-1 ring-[var(--gr-lime)]/35 transition hover:ring-[var(--gr-lime)]"
                          style={{ clipPath: cutSm }}
                          aria-label="განაცხადის მიღება"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => declineApplication(application)}
                          className="grid h-9 w-10 place-items-center bg-[var(--gr-magenta)]/14 text-[var(--gr-magenta)] ring-1 ring-[var(--gr-magenta)]/35 transition hover:ring-[var(--gr-magenta)]"
                          style={{ clipPath: cutSm }}
                          aria-label="განაცხადის უარყოფა"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
        <div className="grid gap-4 bg-[var(--gr-bg-1)] p-5 md:grid-cols-3" style={{ clipPath: cutMd }}>
          <ChevronButton href="/leaderboard" variant="ghost" size="md">
            <Trophy className="h-4 w-4" /> რეიტინგი
          </ChevronButton>
          <ChevronButton href="/tournaments" variant="ghost" size="md">
            <UserCheck className="h-4 w-4" /> კლანური ტურნირები
          </ChevronButton>
          <ChevronButton href="/lfg?mode=practice" variant="violet" size="md">
            <UserPlus className="h-4 w-4" /> რეკრუტინგი
          </ChevronButton>
        </div>
      </section>
    </section>
  );
}
