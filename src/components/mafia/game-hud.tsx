"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────
type PlayerStats = {
  username: string;
  level: number;
  expPercent: number;
  money: number;
  dirtyMoney: number;
  crystals: number;
  hp: number; hpMax: number;
  energy: number; energyMax: number;
  nerve: number; nerveMax: number;
  awake: number; awakeMax: number;
  strength: number;
  defense: number;
  speed: number;
  isVip: boolean;
  gangName: string | null;
};

type ChatMessage = {
  id: number;
  username: string;
  text: string;
  timeAgo: string;
  isVip?: boolean;
  replyTo?: string;
  isSystem?: boolean;
};

// ── Demo data ────────────────────────────────────────────
const DEMO_PLAYER: PlayerStats = {
  username: "LEONSIO12",
  level: 12,
  expPercent: 0.32,
  money: 24500,
  dirtyMoney: 8200,
  crystals: 31,
  hp: 18, hpMax: 25,
  energy: 17, energyMax: 20,
  nerve: 3, nerveMax: 7,
  awake: 200, awakeMax: 200,
  strength: 24,
  defense: 18,
  speed: 15,
  isVip: true,
  gangName: "CosaNostra",
};

const DEMO_CHAT: ChatMessage[] = [
  { id: 1, username: "სისტემა", text: "⚠️ მოთამაშე Sharvala გაჩუმდა 30წთ-ით", timeAgo: "5წ", isSystem: true },
  { id: 2, username: "Vitovor", text: "Salami kargebs 👋", timeAgo: "1წ", isVip: true },
  { id: 3, username: "Asmodeus", text: "ვიტო ქურდი როდის იყო? 🤣", timeAgo: "54წ", replyTo: "@Vitovor" },
  { id: 4, username: "maria23", text: "კიი 😀", timeAgo: "38წ", isVip: true },
  { id: 5, username: "Bonanno", text: "ფუ ჩემი ბედის :დ", timeAgo: "1წ", isVip: true },
];

// ── Helpers ──────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function BarFill({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-[6px] flex-1 rounded-full overflow-hidden bg-white/5 border border-white/5">
      <div
        className="h-full rounded-full relative"
        style={{ width: `${Math.min(100, pct * 100)}%`, background: color }}
      >
        <div className="absolute inset-x-0 top-0 h-[40%] rounded-t-full bg-white/20" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN HUD
// ══════════════════════════════════════════════════════════
export function GameHUD({ player = DEMO_PLAYER }: { player?: PlayerStats }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_CHAT);
  const [inputText, setInputText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [timer, setTimer] = useState(272);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimer(t => t <= 0 ? 900 : t - 1), 1000);
    return () => clearInterval(id);
  }, []);

  const timerStr = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;

  function sendMsg() {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(), username: player.username,
      text: inputText.trim(), timeAgo: "ახლა",
    }]);
    setInputText("");
  }

  return (
    <>
      {/* ── TOP BAR ── */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center gap-2 px-2 py-1.5 pb-5
                      bg-gradient-to-b from-[#080400fa] to-transparent pointer-events-none">
        {/* Resources */}
        <div className="flex gap-1.5 pointer-events-auto">
          <ResourceChip icon="💰" value={fmt(player.money)}    color="#f0c040" plus />
          <ResourceChip icon="💀" value={fmt(player.dirtyMoney)} color="#7a5c2e" />
          <ResourceChip icon="💎" value={String(player.crystals)} color="#4a9aba" plus />
        </div>

        {/* Stat bars */}
        <div className="flex items-center gap-2 flex-1 pointer-events-auto">
          <StatBar icon="❤️" color="#c0392b" val={player.hp}    max={player.hpMax}   onPlus={() => showToast("HP შეივსო!")} />
          <StatBar icon="⚡" color="#d4a017" val={player.energy} max={player.energyMax} onPlus={() => showToast("Energy შეივსო!")} />
          <StatBar icon="🔥" color="#8b3dc0" val={player.nerve}  max={player.nerveMax}  onPlus={() => showToast("Nerve შეივსო!")} />
          <StatBar icon="😴" color="#3d8b37" val={player.awake}  max={player.awakeMax} />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded
                          border border-[#3a1a00] bg-[#0a0500b0]
                          text-[#c8a98a] text-[11px] font-semibold tabular-nums">
            🕐 {timerStr}
          </div>
        </div>
      </div>

      {/* ── PLAYER CARD (left) ── */}
      <div className="fixed top-[44px] left-2 z-50 w-[172px]">
        <PlayerCard player={player} />
      </div>

      {/* ── ZOOM (left center) ── */}
      <div className="fixed left-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
        <IconBtn onClick={() => showToast("Zoom in")}>＋</IconBtn>
        <IconBtn onClick={() => showToast("Zoom out")}>－</IconBtn>
        <IconBtn onClick={() => showToast("Wiki")}>❓</IconBtn>
      </div>

      {/* ── CHAT TOGGLE (right center) ── */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50">
        <IconBtn onClick={() => setChatOpen(v => !v)} badge={3}>💬</IconBtn>
      </div>

      {/* ── CHAT PANEL ── */}
      <ChatPanel
        open={chatOpen}
        messages={messages}
        input={inputText}
        onInput={setInputText}
        onSend={sendMsg}
        onClose={() => setChatOpen(false)}
      />

      {/* ── BOTTOM NAV ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-around items-center
                      pt-5 pb-safe px-1
                      bg-gradient-to-t from-[#080400fa] to-transparent">
        {[
          { icon: "✉️", label: "ჩატი",  badge: 2 },
          { icon: "🔔", label: "ნოტიფ.", badge: 5 },
          { icon: "📰", label: "გაზეთი" },
          { icon: "🗺️", label: "რუკა",  active: true },
          { icon: "🎒", label: "ინვ." },
          { icon: "👥", label: "ბანდა", badge: "!" },
          { icon: "🏆", label: "ტოპი" },
        ].map(item => (
          <NavItem key={item.label} {...item} onClick={() => showToast(item.label)} />
        ))}
      </div>

      {/* ── TOAST ── */}
      {toast && <Toast message={toast} />}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────

function ResourceChip({ icon, value, color, plus }: {
  icon: string; value: string; color: string; plus?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded
                    border border-[#5c2d00] bg-[#130a02ee]
                    text-[#ffe1cb] text-[13px] font-semibold
                    relative overflow-hidden min-w-[68px]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b8860b40] to-transparent" />
      <span style={{ color }}>{icon}</span>
      <span>{value}</span>
      {plus && (
        <div className="ml-auto w-3.5 h-3.5 rounded-full bg-[#8b3a00] flex items-center justify-center
                        text-[9px] font-black text-[#ffe1cb] cursor-pointer">+</div>
      )}
    </div>
  );
}

function StatBar({ icon, color, val, max, onPlus }: {
  icon: string; color: string; val: number; max: number; onPlus?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 cursor-pointer" onClick={onPlus}>
      <span className="text-[13px]" style={{ color }}>{icon}</span>
      <span className="text-[11px] font-bold text-[#c8a98a] w-5 text-right">{val}</span>
      <BarFill pct={val / max} color={color} />
      {onPlus && (
        <div className="w-3.5 h-3.5 rounded-full bg-[#8b3a00] flex items-center justify-center
                        text-[9px] font-black text-[#ffe1cb] flex-shrink-0">+</div>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerStats }) {
  const circ = 2 * Math.PI * 28;
  return (
    <div className="rounded-lg border border-[#5c2d00] bg-gradient-to-br from-[#130a02f7] to-[#0a0500f7]
                    shadow-[0_0_0_1px_rgba(184,134,11,0.1)] p-2.5 flex flex-col gap-2">
      {/* Avatar + Info */}
      <div className="flex gap-2 items-start">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-[52px] h-[52px] rounded-full border-2 border-[#8b3a00]
                          bg-gradient-to-br from-[#3a1a00] to-[#1a0800]
                          flex items-center justify-center text-2xl">
            🧔
          </div>
          {/* XP ring */}
          <svg className="absolute inset-[-4px] w-[60px] h-[60px] -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
            <circle cx="30" cy="30" r="28" fill="none"
              stroke="url(#xpg)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - player.expPercent)}
            />
            <defs>
              <linearGradient id="xpg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#beff4d" />
                <stop offset="100%" stopColor="#17c028" />
              </linearGradient>
            </defs>
          </svg>
          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 bg-[#c0392b] text-white text-[10px] font-black
                          px-1.5 py-px rounded border-2 border-[#0a0500]">
            {player.level}
          </div>
        </div>

        {/* Name + vip + stats */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#ffe1cb] truncate cursor-pointer hover:text-[#d4a017]">
            {player.username}
          </div>
          {player.isVip && (
            <div className="inline-flex items-center gap-0.5 mt-0.5
                            bg-gradient-to-r from-[#8b3a00] to-[#c0600b]
                            text-[#ffd080] text-[9px] font-bold px-1.5 py-px rounded tracking-wide">
              ⭐ VIP I
            </div>
          )}
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            {[
              { ico: "⚔️", lbl: "ძალა", val: player.strength },
              { ico: "🛡️", lbl: "დაცვა", val: player.defense },
              { ico: "💨", lbl: "სიჩ.", val: player.speed },
            ].map(s => (
              <div key={s.lbl} className="flex flex-col items-center bg-white/[0.03]
                                         border border-[#3a1a00] rounded py-0.5">
                <span className="text-[9px]">{s.ico}</span>
                <span className="text-[7px] text-[#c8a98a]">{s.lbl}</span>
                <span className="text-[11px] font-bold">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#5c2d00] to-transparent" />

      {/* Stat bars */}
      <div className="flex flex-col gap-1.5">
        {[
          { ico: "❤️", color: "#c0392b", val: player.hp,     max: player.hpMax },
          { ico: "⚡", color: "#d4a017", val: player.energy,  max: player.energyMax },
          { ico: "🔥", color: "#8b3dc0", val: player.nerve,   max: player.nerveMax },
          { ico: "😴", color: "#3d8b37", val: player.awake,   max: player.awakeMax },
        ].map(s => (
          <div key={s.ico} className="flex items-center gap-1.5 cursor-pointer
                                      hover:bg-white/[0.02] rounded px-0.5">
            <span className="text-[12px] w-4 text-center" style={{ color: s.color }}>{s.ico}</span>
            <BarFill pct={s.val / s.max} color={s.color} />
            <span className="text-[10px] font-semibold text-[#c8a98a] w-10 text-right">
              {s.val}/{s.max}
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#8b3a00] flex items-center justify-center
                            text-[9px] font-black text-[#ffe1cb]">+</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ open, messages, input, onInput, onSend, onClose }: {
  open: boolean;
  messages: ChatMessage[];
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const EMOJIS = ["😀","😂","🔥","💀","👊","😈","🤣","❤️","💰","🎯"];

  return (
    <div className={`fixed bottom-[60px] right-0 z-50 w-[280px] max-h-[420px]
                     flex flex-col overflow-hidden
                     bg-[#0a0500f8] border border-[#5c2d00] border-r-0
                     rounded-l-xl shadow-[-4px_0_24px_rgba(0,0,0,0.6)]
                     transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                     ${open ? "translate-x-0" : "translate-x-full"}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3a1a00]
                      bg-gradient-to-r from-[#1e0e02cc] to-[#140800cc]">
        <h3 className="text-[12px] font-bold text-[#d4a017] uppercase tracking-widest">💬 ჩატი</h3>
        <button onClick={onClose} className="text-[#c8a98a] hover:text-[#ffe1cb] text-sm w-5 h-5
                                              flex items-center justify-center rounded hover:bg-white/5">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5
                      [scrollbar-width:thin] [scrollbar-color:#8b3a00_transparent]">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-1.5 ${msg.isSystem ? "items-center" : "items-start"}`}>
            {!msg.isSystem && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b3a00] to-[#3a1a00]
                              flex items-center justify-center text-xs flex-shrink-0
                              border border-[#5c2d00]">
                🧔
              </div>
            )}
            <div className="flex-1 min-w-0">
              {msg.isSystem ? (
                <div className="text-[11px] text-[#d4a017] italic border-l-2 border-[#d4a017]
                                pl-2 bg-[#b8860b0d] rounded-r py-0.5 opacity-80">
                  {msg.text}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[11px] font-bold text-[#d4a017] cursor-pointer hover:text-[#ffe1cb]">
                      {msg.username}
                    </span>
                    {msg.isVip && (
                      <span className="text-[7px] bg-gradient-to-r from-[#8b3a00] to-[#c0600b]
                                       text-[#ffd080] px-1 py-px rounded font-bold">VIP</span>
                    )}
                    <span className="text-[9px] text-[#c8a98a60] ml-auto">{msg.timeAgo}</span>
                  </div>
                  {msg.replyTo && (
                    <div className="text-[10px] text-[#c8a98a] border-l-2 border-[#8b3a00]
                                    pl-1 mb-0.5 opacity-70">{msg.replyTo}</div>
                  )}
                  <div className="text-[12px] text-[#ffe1cb] leading-snug break-words">{msg.text}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Emoji row */}
      <div className="flex gap-1 px-2 pb-1 overflow-x-auto [scrollbar-width:none]">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onInput(input + e)}
                  className="text-base flex-shrink-0 opacity-70 hover:opacity-100
                             hover:scale-125 transition-transform px-0.5">
            {e}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1.5 p-2 border-t border-[#3a1a00] bg-[#08040099]">
        <textarea
          value={input}
          onChange={e => onInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="დაწერე..."
          rows={1}
          className="flex-1 bg-[#1e0e02cc] border border-[#5c2d00] rounded-md
                     px-2 py-1.5 text-[12px] text-[#ffe1cb] font-[Rubik,sans-serif]
                     resize-none outline-none min-h-[32px] max-h-[80px] leading-snug
                     placeholder:text-[#c8a98a60] focus:border-[#8b3a00]"
        />
        <button onClick={onSend}
                className="w-8 h-8 rounded-md bg-gradient-to-br from-[#8b3a00] to-[#5a2200]
                           flex items-center justify-center text-sm flex-shrink-0
                           border border-[#5c2d00] hover:from-[#c05010] hover:to-[#7a3000]
                           active:scale-90 transition-all">
          ➤
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, badge }: {
  children: React.ReactNode; onClick?: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
            className="w-9 h-9 rounded-md flex items-center justify-center relative
                       border border-[#5c2d00] bg-gradient-to-br from-[#1e0e02f2] to-[#0a0500f2]
                       shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-[16px]
                       hover:border-[#b8860b] hover:shadow-[0_0_12px_rgba(184,134,11,0.2)]
                       active:scale-95 transition-all">
      {children}
      {badge != null && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#c0392b]
                        border border-[#0a0500] text-[8px] font-bold text-white
                        flex items-center justify-center animate-pulse">
          {badge}
        </div>
      )}
    </button>
  );
}

function NavItem({ icon, label, badge, active, onClick }: {
  icon: string; label: string; badge?: number | string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md relative
                        min-w-[40px] transition-all active:scale-90
                        ${active ? "bg-[#b8860b14]" : "hover:bg-[#b8860b0a]"}`}>
      <span className={`text-xl leading-none ${active ? "drop-shadow-[0_0_4px_#d4a017]" : ""}`}>{icon}</span>
      <span className={`text-[8px] font-semibold tracking-wide ${active ? "text-[#d4a017]" : "text-[#c8a98a]"}`}>
        {label}
      </span>
      {badge != null && (
        <div className="absolute top-0 right-0.5 min-w-[14px] h-[14px] rounded-md bg-[#c0392b]
                        text-[8px] font-bold text-white flex items-center justify-center
                        px-1 border border-[#0a0500]">
          {badge}
        </div>
      )}
    </button>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-[52px] left-1/2 -translate-x-1/2 z-[999] pointer-events-none
                    bg-[#0a0500f7] border border-[#d4a017] rounded-lg
                    px-4 py-2 text-[13px] font-semibold text-[#ffe1cb] whitespace-nowrap
                    shadow-[0_0_20px_rgba(184,134,11,0.3)]
                    animate-[fadeSlideIn_0.3s_ease-out]">
      {message}
    </div>
  );
}
