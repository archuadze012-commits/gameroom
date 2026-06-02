"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Loader2, LogIn, Send, Trash2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = {
  id: string;
  author: string;
  body: string;
  ago: string;
  isMine?: boolean;
  expiresAtMs?: number;
};

type CurrentUser = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null;

type Props = {
  initialMessages: Message[];
  currentUser: CurrentUser;
  title: string;
  channelId: string;
  canManageChat: boolean;
  activeMuteUntil: string | null;
  avatarUrl?: string | null;
};

const CHAT_STORAGE_KEY = "gameroom_pubg_mobile_chat_messages_v1";
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MUTE_OPTIONS = [
  { key: "15m", label: "15 წთ" },
  { key: "1h", label: "1 საათი" },
  { key: "1d", label: "1 დღე" },
  { key: "1w", label: "1 კვირა" },
  { key: "permanent", label: "სამუდამო" },
] as const;

type MuteDurationKey = (typeof MUTE_OPTIONS)[number]["key"];

function removeExpiredMessages(messages: Message[]) {
  const now = Date.now();
  return messages.filter((message) => !message.expiresAtMs || message.expiresAtMs > now);
}

function getInitialMessages(initialMessages: Message[]) {
  if (typeof window === "undefined") return initialMessages;

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return initialMessages;

    const stored = removeExpiredMessages(JSON.parse(raw) as Message[]);
    if (!Array.isArray(stored)) return initialMessages;

    const merged = [...initialMessages];
    for (const storedMessage of stored) {
      const existingIndex = merged.findIndex((message) => message.id === storedMessage.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = storedMessage;
      } else {
        merged.push(storedMessage);
      }
    }
    return removeExpiredMessages(merged);
  } catch {
    return initialMessages;
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMuteUntil(value: string) {
  if (value === "permanent") return "განუსაზღვრელი ვადით";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "უცნობ ვადამდე";
  return new Intl.DateTimeFormat("ka-GE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function PubgMobileChatClient({
  initialMessages,
  currentUser,
  title,
  channelId,
  canManageChat,
  activeMuteUntil,
  avatarUrl,
}: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => getInitialMessages(initialMessages));
  const [mutingAuthors, setMutingAuthors] = useState<Record<string, boolean>>({});
  const [mutedAuthors, setMutedAuthors] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);
  const isMuted = !!activeMuteUntil;

  useEffect(() => {
    const node = scrollAreaRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessages((prev) => {
        const next = removeExpiredMessages(prev);
        return next.length === prev.length ? prev : next;
      });
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(removeExpiredMessages(messages)));
    } catch {}
  }, [messages]);

  const onSend = () => {
    const body = draft.trim();
    if (!body || isMuted) return;

    const author = currentUser?.displayName ?? currentUser?.username ?? "სტუმარი";
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        author,
        body,
        ago: nowLabel(),
        isMine: true,
        expiresAtMs: Date.now() + MESSAGE_TTL_MS,
      },
    ]);
    setDraft("");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (canSend) onSend();
  };

  const onMute = async (author: string, profileSlug: string, durationKey: MuteDurationKey) => {
    if (!canManageChat || mutingAuthors[author]) return;

    setMutingAuthors((prev) => ({ ...prev, [author]: true }));
    try {
      const response = await fetch("/api/chat/mutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          username: profileSlug,
          displayName: author,
          durationKey,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; alreadyMuted?: boolean } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "mute_failed");
      }

      setMutedAuthors((prev) => ({ ...prev, [author]: true }));
      const selectedDuration = MUTE_OPTIONS.find((option) => option.key === durationKey)?.label ?? "არჩეული ვადით";
      toast.success(
        payload?.alreadyMuted
          ? `${author}-ის mute განახლდა: ${selectedDuration}`
          : `${author} დაიმიუთა: ${selectedDuration}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "mute_failed";
      toast.error(message === "profile_not_found" ? "ამ იუზერის პროფილი ვერ მოიძებნა" : "Mute ვერ შესრულდა");
    } finally {
      setMutingAuthors((prev) => {
        const next = { ...prev };
        delete next[author];
        return next;
      });
    }
  };

  return (
    <section className="group relative mx-auto flex h-full w-full max-w-4xl flex-col rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.3)]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22.5px] bg-[#0a0714] backdrop-blur-md">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

        <header className="relative z-[1] flex items-center gap-4 border-b border-white/5 bg-black/40 px-5 py-5 sm:px-7 backdrop-blur-md">
          <Link
            href="/games/pubg-mobile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/70 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400"
            aria-label="უკან"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="rounded-full ring-2 ring-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] p-[2px] bg-black/40">
            <UserAvatar
              username="pubg-mobile"
              displayName={title}
              avatarUrl={avatarUrl ?? null}
              size="sm"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[20px] font-extrabold uppercase leading-none text-white drop-shadow-md sm:text-[24px]">
              {title}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/50 transition-all hover:border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-400"
            aria-label="ჩატის გასუფთავება"
            title="ჩატის გასუფთავება"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </header>

        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="space-y-5">
              {messages.map((message) => {
                const isMine = !!message.isMine;
                const authorUsername = message.author.toLowerCase().replace(/\s+/g, "-");
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%]">
                      {!isMine && (
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={`/profile/${authorUsername}`}
                            className="flex min-w-0 items-center gap-2.5 rounded-full transition hover:opacity-80"
                          >
                            <UserAvatar
                              username={authorUsername}
                              displayName={message.author}
                              avatarUrl={null}
                              size="sm"
                            />
                            <p className="truncate text-[13px] font-bold leading-none text-white drop-shadow-sm">
                              {message.author}
                            </p>
                          </Link>

                          {canManageChat && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={!!mutingAuthors[message.author]}
                                render={
                                  <button
                                    type="button"
                                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)] transition hover:border-violet-500/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={mutedAuthors[message.author] ? "Mute-ის ვადა შეცვალე" : "Mute"}
                                  >
                                    {mutingAuthors[message.author] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <VolumeX className="h-3.5 w-3.5" />
                                    )}
                                    {mutedAuthors[message.author] ? "Muted" : "Mute"}
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                }
                              />
                              <DropdownMenuContent
                                align="end"
                                className="w-40 border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl"
                              >
                                <DropdownMenuLabel className="text-white/50 text-[10px] font-black uppercase tracking-wider">Mute ხანგრძლივობა</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                {MUTE_OPTIONS.map((option) => (
                                  <DropdownMenuItem
                                    key={option.key}
                                    onClick={() => onMute(message.author, authorUsername, option.key)}
                                    className="text-[13px] font-medium text-white/80 focus:bg-white/10 focus:text-white"
                                  >
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )}
                      
                      <div
                        className={`group/msg relative rounded-[20px] px-5 py-3.5 ${
                          isMine 
                            ? "rounded-br-[8px] border border-cyan-500/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(99,102,241,0.1))] shadow-[0_0_20px_rgba(34,211,238,0.1)]" 
                            : "rounded-bl-[8px] border border-white/10 bg-white/5"
                        }`}
                      >
                        {isMine && <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_50%)] pointer-events-none" />}
                        <p
                          className="relative z-10 whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-white sm:text-[15px]"
                        >
                          {message.body}
                        </p>
                        <p className="relative z-10 mt-2 text-right text-[11px] font-bold text-white/40">
                          {message.ago}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5 bg-black/40 px-4 py-5 sm:px-6 backdrop-blur-md">
            {currentUser ? (
              isMuted ? (
                <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-[13px] text-white shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                  <p className="font-bold text-red-400">ჩატში წერა დროებით შეზღუდულია</p>
                  <p className="mt-1 font-medium text-white/60">
                    {activeMuteUntil === "permanent"
                      ? `Mute აქტიურია ${formatMuteUntil(activeMuteUntil)}.`
                      : `Mute აქტიურია ${formatMuteUntil(activeMuteUntil!)}-მდე.`}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="დაწერე მესიჯი..."
                    className="h-12 rounded-full border-white/10 bg-white/5 px-6 text-[15px] font-medium text-white placeholder:text-white/30 focus-visible:border-cyan-500/50 focus-visible:bg-cyan-500/5 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all"
                    maxLength={500}
                  />
                  <Button
                    type="button"
                    onClick={onSend}
                    disabled={!canSend}
                    className="h-12 w-12 shrink-0 rounded-full border border-cyan-500/50 bg-[linear-gradient(135deg,#06b6d4,#3b82f6)] p-0 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[16px] border border-white/5 bg-white/5 p-4">
                <p className="text-[14px] font-medium text-white/60">
                  ჩატში წერისთვის ავტორიზაციაა საჭირო.
                </p>
                <Link href="/auth/login">
                  <Button className="h-10 rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-105 transition-all">
                    <LogIn className="mr-2 h-4 w-4" />
                    შესვლა
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
