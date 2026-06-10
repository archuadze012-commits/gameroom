"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GameHUD } from "./game-hud";

// Types
type MafiaPlot = {
  id: string;
  district_id: string;
  tile_col: number;
  tile_row: number;
  building_type: "kiosk" | "garage" | "casino" | "hq" | "wash" | "coop" | null;
  level: number;
  owner_clan_id: string | null;
  clans?: { name: string; tag: string } | null;
};

type Clan = {
  id: string;
  name: string;
  tag: string;
};

interface DistrictMapProps {
  districtId: string;
}

type BuildingType = NonNullable<MafiaPlot["building_type"]>;
type OperationId = "collect" | "raid" | "bribe" | "recruit";

type Operation = {
  id: OperationId;
  title: string;
  label: string;
  description: string;
};

type TileType = "road" | "river" | "bridge" | "plot" | "grass";
type AmbientKind = "panel_block" | "courtyard" | "market" | "bus_stop" | "lada" | "streetlight" | "checkpoint";

type AmbientProp = {
  id: string;
  c: number;
  r: number;
  kind: AmbientKind;
  variant?: number;
};

type MafiaPlotRow = Omit<MafiaPlot, "clans"> & {
  clans?: { name: string; tag: string } | { name: string; tag: string }[] | null;
};

type PlotChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Partial<MafiaPlot>;
  old: Partial<MafiaPlot>;
};

type SupabaseQueryResult<T> = { data: T | null; error?: unknown };

type MafiaQuery<T = unknown> = PromiseLike<SupabaseQueryResult<T>> & {
  select: (columns: string) => MafiaQuery<T>;
  order: (column: string) => MafiaQuery<T>;
  eq: (column: string, value: string | number | null) => MafiaQuery<T>;
  single: () => MafiaQuery<T>;
  update: (values: Record<string, unknown>) => MafiaQuery<T>;
  insert: (values: Record<string, unknown>) => MafiaQuery<T>;
  delete: () => MafiaQuery<T>;
};

type MafiaChannel = {
  on: (
    event: "postgres_changes",
    config: Record<string, unknown>,
    callback: (payload: PlotChangePayload) => void | Promise<void>
  ) => MafiaChannel;
  subscribe: () => MafiaChannel;
};

type MafiaSupabaseClient = {
  from: <T = unknown>(table: string) => MafiaQuery<T>;
  channel: (name: string) => MafiaChannel;
  removeChannel: (channel: MafiaChannel) => void;
};

// Grid dimensions
const COLS = 12;
const ROWS = 12;
const TW = 64; // Tile width
const TH = 32; // Tile height
const OFFX = ROWS * (TW / 2) + TW; // Horizontal offset
const OFFY = TH * 2;
const WORLD_W = (COLS + ROWS) * (TW / 2) + TW * 2;
const WORLD_H = (COLS + ROWS) * (TH / 2) + TH * 6;

type Pt = { x: number; y: number };

function tileCenter(c: number, r: number): Pt {
  return {
    x: (c - r) * (TW / 2) + OFFX,
    y: (c + r) * (TH / 2) + OFFY,
  };
}

function diamond(c: number, r: number, lift = 0): string {
  const { x, y } = tileCenter(c, r);
  const yy = y - lift;
  return `${x},${yy - TH / 2} ${x + TW / 2},${yy} ${x},${yy + TH / 2} ${x - TW / 2},${yy}`;
}

const DISTRICT_NAMES: Record<string, string> = {
  gldani: "გლდანი",
  saburtalo: "საბურთალო",
  chughureti_real: "ჩუღურეთი",
  nadzaladevi_big: "ნაძალადევი",
  vake: "ვაკე",
  mtatsminda: "მთაწმინდა",
  isani: "ისანი",
  krtsanisi: "კრწანისი",
  samgori: "სამგორი",
  didube_real: "დიდუბე",
};

const BUILDING_RULES: Record<BuildingType, { label: string; income: number; influence: number; heat: number; muscle: number }> = {
  garage: { label: "ჟესტის გარაჟი", income: 9, influence: 2, heat: 1, muscle: 8 },
  kiosk: { label: "სავაჭრო ჯიხური", income: 14, influence: 3, heat: 2, muscle: 1 },
  casino: { label: "კაზინო", income: 30, influence: 9, heat: 8, muscle: 2 },
  hq: { label: "შტაბი", income: 5, influence: 16, heat: 3, muscle: 10 },
  wash: { label: "სარეცხი", income: 18, influence: 5, heat: 5, muscle: 2 },
  coop: { label: "კოოპერატივი", income: 12, influence: 7, heat: 2, muscle: 4 },
};

const OPERATIONS: Operation[] = [
  {
    id: "collect",
    title: "ხარკის აკრეფა",
    label: "Collect",
    description: "იღებ სწრაფ cash-ს, მაგრამ პოლიციის heat ნელა იზრდება.",
  },
  {
    id: "raid",
    title: "სწრაფი რეიდი",
    label: "Raid",
    description: "muscle-ს იყენებ გავლენის ასაწევად. მაღალ heat-ზე რისკიანია.",
  },
  {
    id: "bribe",
    title: "ქრთამი",
    label: "Bribe",
    description: "ფულით ამცირებ heat-ს და იცავ უბნის ოპერაციებს.",
  },
  {
    id: "recruit",
    title: "ახალი ბიჭები",
    label: "Recruit",
    description: "ზრდი muscle-ს, მაგრამ მეტი ხალხი მეტ ყურადღებას იწვევს.",
  },
];

const AMBIENT_PROPS: AmbientProp[] = [
  { id: "vake-block-1", c: 1, r: 1, kind: "panel_block", variant: 1 },
  { id: "vake-block-2", c: 9, r: 1, kind: "panel_block", variant: 2 },
  { id: "vake-block-3", c: 9, r: 8, kind: "panel_block", variant: 3 },
  { id: "vake-yard-1", c: 1, r: 4, kind: "courtyard", variant: 1 },
  { id: "vake-yard-2", c: 4, r: 10, kind: "courtyard", variant: 2 },
  { id: "vake-market", c: 7, r: 4, kind: "market", variant: 1 },
  { id: "vake-stop", c: 5, r: 4, kind: "bus_stop", variant: 1 },
  { id: "vake-lada-1", c: 5, r: 7, kind: "lada", variant: 1 },
  { id: "vake-lada-2", c: 4, r: 6, kind: "lada", variant: 2 },
  { id: "vake-light-1", c: 6, r: 1, kind: "streetlight" },
  { id: "vake-light-2", c: 5, r: 8, kind: "streetlight" },
  { id: "vake-checkpoint", c: 6, r: 6, kind: "checkpoint" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function renderTileSurfaceDetails(type: TileType, c: number, r: number) {
  const { x, y } = tileCenter(c, r);
  const crackSeed = (c * 11 + r * 7) % 5;

  if (type === "road") {
    return (
      <g opacity="0.92">
        <path
          d={`M${x - 30},${y - 9} L${x - 8},${y + 1} L${x + 27},${y + 10}`}
          fill="none"
          stroke="#090909"
          strokeWidth="1.1"
          opacity="0.75"
        />
        <path
          d={`M${x - 24},${y + 8} L${x - 8},${y + 1} L${x + 8},${y + 5}`}
          fill="none"
          stroke="#3a332a"
          strokeWidth="0.9"
          opacity="0.7"
        />
        {(c + r) % 2 === 0 && (
          <path
            d={`M${x - 18},${y} L${x - 4},${y + 7} M${x + 7},${y - 8} L${x + 20},${y - 2}`}
            stroke="#b4944b"
            strokeDasharray="6 5"
            strokeWidth="1"
            opacity="0.55"
          />
        )}
        {crackSeed <= 2 && (
          <circle cx={x + 12 - crackSeed * 7} cy={y + 4 - crackSeed} r="2.2" fill="#080808" stroke="#4a3a2b" strokeWidth="0.5" opacity="0.85" />
        )}
        {crackSeed === 4 && (
          <g opacity="0.85">
            <circle cx={x - 2} cy={y + 1} r="4.2" fill="#181818" stroke="#545454" strokeWidth="0.7" />
            <path d={`M${x - 5},${y + 1} H${x + 1} M${x - 2},${y - 2} V${y + 4}`} stroke="#3a3a3a" strokeWidth="0.6" />
          </g>
        )}
      </g>
    );
  }

  if (type === "river") {
    return (
      <g opacity="0.9">
        <path d={`M${x - 18},${y - 2} Q${x - 4},${y + 4} ${x + 13},${y - 1}`} fill="none" stroke="#2a5a67" strokeWidth="0.8" opacity="0.8" />
        <path d={`M${x - 10},${y + 7} Q${x + 5},${y + 11} ${x + 23},${y + 5}`} fill="none" stroke="#102d3a" strokeWidth="1.1" opacity="0.9" />
        {(c + r) % 3 === 0 && <ellipse cx={x + 4} cy={y + 2} rx="8" ry="2.3" fill="#5a4b31" opacity="0.18" />}
      </g>
    );
  }

  if (type === "bridge") {
    return (
      <g opacity="0.95">
        <line x1={x - TW / 2} y1={y - TH / 4} x2={x + TW / 2} y2={y + TH / 4} stroke="#1b1b1b" strokeWidth="2" />
        <line x1={x - TW / 2} y1={y + TH / 4} x2={x + TW / 2} y2={y - TH / 4} stroke="#1b1b1b" strokeWidth="2" />
        <path d={`M${x - 22},${y - 8} L${x + 20},${y + 12}`} stroke="#6a6258" strokeDasharray="4 4" strokeWidth="0.8" />
      </g>
    );
  }

  if (type === "grass") {
    return (
      <g opacity="0.55">
        <ellipse cx={x - 11} cy={y + 2} rx="8" ry="3" fill="#2e2617" />
        <path d={`M${x + 10},${y - 4} l3,4 l-4,3 M${x + 17},${y + 1} l4,3 l-3,4`} stroke="#29351f" strokeWidth="1" />
        {(c * r) % 7 === 0 && <circle cx={x + 3} cy={y + 5} r="1.5" fill="#5f4a30" />}
      </g>
    );
  }

  return (
    <g opacity="0.65">
      <path d={`M${x - 20},${y - 2} L${x - 4},${y + 6} L${x + 17},${y + 1}`} fill="none" stroke="#6d5135" strokeWidth="0.8" />
      <circle cx={x + 13} cy={y + 4} r="1.6" fill="#4a3322" />
    </g>
  );
}

function renderAmbientProp(prop: AmbientProp) {
  const { x, y } = tileCenter(prop.c, prop.r);

  if (prop.kind === "panel_block") {
    const h = prop.variant === 3 ? 78 : 66;
    const left = `${x - 34},${y + 3} ${x - 1},${y + 18} ${x - 1},${y + 18 - h} ${x - 34},${y + 3 - h}`;
    const right = `${x - 1},${y + 18} ${x + 32},${y + 3} ${x + 32},${y + 3 - h} ${x - 1},${y + 18 - h}`;
    const top = `${x - 34},${y + 3 - h} ${x - 1},${y + 18 - h} ${x + 32},${y + 3 - h} ${x},${y - 12 - h}`;
    const lit = prop.variant === 2 ? "#e7b45a" : "#f4d27a";

    return (
      <g opacity="0.96" pointerEvents="none">
        <ellipse cx={x} cy={y + 15} rx="42" ry="14" fill="#020202" opacity="0.42" />
        <polygon points={left} fill="#333537" stroke="#171717" strokeWidth="0.7" />
        <polygon points={right} fill="#494c4e" stroke="#171717" strokeWidth="0.7" />
        <polygon points={top} fill="#626568" stroke="#252525" strokeWidth="0.7" />
        {[0, 1, 2, 3].map((row) => (
          <g key={`panel-row-${prop.id}-${row}`}>
            <rect x={x - 25} y={y - h + 11 + row * 13} width="5" height="6" fill={row % 2 === 0 ? lit : "#111"} stroke="#070707" strokeWidth="0.4" />
            <rect x={x - 15} y={y - h + 16 + row * 13} width="5" height="6" fill={row === 1 ? lit : "#151515"} stroke="#070707" strokeWidth="0.4" />
            <rect x={x + 8} y={y - h + 16 + row * 13} width="5" height="6" fill={row === 2 ? lit : "#111"} stroke="#070707" strokeWidth="0.4" />
            <rect x={x + 18} y={y - h + 11 + row * 13} width="5" height="6" fill={row === 0 ? lit : "#151515"} stroke="#070707" strokeWidth="0.4" />
          </g>
        ))}
        <path d={`M${x - 27},${y - 18} Q${x - 14},${y - 13} ${x - 2},${y - 16}`} fill="none" stroke="#c9c2b5" strokeWidth="0.6" />
        <rect x={x - 22} y={y - 15} width="5" height="4" fill="#b64b45" />
        <rect x={x - 15} y={y - 13} width="5" height="3" fill="#44649a" />
        <path d={`M${x + 16},${y - h - 1} q9,-8 16,1`} fill="none" stroke="#9b9b8f" strokeWidth="0.8" />
        <text x={x - 1} y={y - 4} fill="#151515" fontSize="5" fontWeight="900" textAnchor="middle" transform={`rotate(-13 ${x - 1} ${y - 4})`}>
          Vake 91
        </text>
      </g>
    );
  }

  if (prop.kind === "market") {
    return (
      <g pointerEvents="none">
        <ellipse cx={x} cy={y + 8} rx="35" ry="10" fill="#050505" opacity="0.35" />
        <polygon points={`${x - 28},${y} ${x - 2},${y + 12} ${x + 28},${y} ${x + 1},${y - 12}`} fill="#21160e" stroke="#5b3821" strokeWidth="0.8" />
        <path d={`M${x - 26},${y - 2} L${x + 1},${y - 14} L${x + 28},${y - 2}`} fill="#862b25" stroke="#31100d" strokeWidth="0.8" />
        <path d={`M${x - 20},${y + 1} L${x + 20},${y + 1}`} stroke="#d7b36a" strokeDasharray="5 4" strokeWidth="1.2" />
        <rect x={x - 17} y={y - 4} width="9" height="6" fill="#c8983d" stroke="#1b1209" strokeWidth="0.5" />
        <rect x={x + 7} y={y - 6} width="10" height="7" fill="#477243" stroke="#1b1209" strokeWidth="0.5" />
        <text x={x + 1} y={y - 5} fill="#f4d27a" fontSize="6" fontWeight="900" textAnchor="middle">
          ჯიხური
        </text>
      </g>
    );
  }

  if (prop.kind === "bus_stop") {
    return (
      <g pointerEvents="none">
        <ellipse cx={x + 5} cy={y + 8} rx="28" ry="8" fill="#030303" opacity="0.35" />
        <line x1={x - 19} y1={y - 3} x2={x - 19} y2={y + 10} stroke="#5d5f62" strokeWidth="2" />
        <line x1={x + 21} y1={y - 4} x2={x + 21} y2={y + 10} stroke="#5d5f62" strokeWidth="2" />
        <path d={`M${x - 25},${y - 6} L${x - 3},${y - 16} L${x + 27},${y - 6}`} fill="#37434a" stroke="#141a1d" strokeWidth="0.8" />
        <rect x={x - 13} y={y - 2} width="28" height="11" fill="#15232a" stroke="#080b0d" strokeWidth="0.6" opacity="0.85" />
        <text x={x + 2} y={y + 6} fill="#98bfd0" fontSize="5" fontWeight="900" textAnchor="middle">
          37
        </text>
      </g>
    );
  }

  if (prop.kind === "lada") {
    const body = prop.variant === 2 ? "#6f7e58" : "#b9aa74";
    return (
      <g pointerEvents="none">
        <ellipse cx={x} cy={y + 7} rx="22" ry="6" fill="#020202" opacity="0.38" />
        <path d={`M${x - 22},${y + 2} L${x - 7},${y - 5} L${x + 15},${y - 2} L${x + 23},${y + 5} L${x + 5},${y + 12} L${x - 18},${y + 8} Z`} fill={body} stroke="#18150e" strokeWidth="0.8" />
        <path d={`M${x - 7},${y - 5} L${x + 4},${y - 1} L${x + 13},${y - 2} L${x + 4},${y - 9} Z`} fill="#1e2c32" stroke="#0d1113" strokeWidth="0.5" />
        <circle cx={x - 12} cy={y + 8} r="3" fill="#111" stroke="#5d5d5d" strokeWidth="0.6" />
        <circle cx={x + 11} cy={y + 9} r="3" fill="#111" stroke="#5d5d5d" strokeWidth="0.6" />
        <circle cx={x + 21} cy={y + 4} r="1.3" fill="#f5d66c" opacity="0.8" />
      </g>
    );
  }

  if (prop.kind === "streetlight") {
    return (
      <g pointerEvents="none">
        <ellipse cx={x + 9} cy={y + 6} rx="24" ry="8" fill="#e59c2e" opacity="0.12" />
        <line x1={x - 4} y1={y + 10} x2={x - 4} y2={y - 31} stroke="#4e4e4e" strokeWidth="1.7" />
        <path d={`M${x - 4},${y - 30} Q${x + 10},${y - 39} ${x + 20},${y - 29}`} fill="none" stroke="#5b5b5b" strokeWidth="1.2" />
        <circle cx={x + 21} cy={y - 27} r="3" fill="#e9b34a" opacity="0.9" filter="url(#neon-glow)" />
      </g>
    );
  }

  if (prop.kind === "checkpoint") {
    return (
      <g pointerEvents="none">
        <ellipse cx={x} cy={y + 8} rx="35" ry="9" fill="#020202" opacity="0.4" />
        <rect x={x - 23} y={y - 2} width="18" height="7" fill="#7b2e24" stroke="#1d0d09" strokeWidth="0.6" transform={`rotate(20 ${x - 14} ${y + 1})`} />
        <rect x={x - 2} y={y - 1} width="22" height="7" fill="#d1b35d" stroke="#20170c" strokeWidth="0.6" transform={`rotate(-20 ${x + 9} ${y + 2})`} />
        <line x1={x - 18} y1={y + 5} x2={x + 26} y2={y - 9} stroke="#1b1b1b" strokeWidth="2" />
        <text x={x + 4} y={y - 10} fill="#b13a2e" fontSize="5" fontWeight="900" textAnchor="middle">
          POST
        </text>
      </g>
    );
  }

  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={y + 7} rx="22" ry="7" fill="#020202" opacity="0.3" />
      <path d={`M${x - 18},${y} L${x - 2},${y + 9} L${x + 17},${y} L${x},${y - 8} Z`} fill="#29251d" stroke="#0d0b08" strokeWidth="0.6" />
      <circle cx={x - 9} cy={y + 2} r="2" fill="#6a5b31" />
      <circle cx={x + 8} cy={y + 1} r="2" fill="#394f2a" />
    </g>
  );
}

export function DistrictMap({ districtId }: DistrictMapProps) {
  const supabase = createSupabaseBrowserClient() as unknown as MafiaSupabaseClient;

  // Component States
  const [dbPlots, setDbPlots] = useState<MafiaPlot[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cash, setCash] = useState(420);
  const [respect, setRespect] = useState(18);
  const [muscle, setMuscle] = useState(12);
  const [heat, setHeat] = useState(24);
  const [turn, setTurn] = useState(1);
  const [selectedOperation, setSelectedOperation] = useState<OperationId>("collect");
  const [operationLog, setOperationLog] = useState("აირჩიე tile ან გაუშვი უბნის ოპერაცია. მიზანი: 75% კონტროლი.");

  // Pan / Zoom Camera States
  const [scale, setScale] = useState(1.1);
  const [tx, setTx] = useState(100);
  const [ty, setTy] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTile, setSelectedTile] = useState<{ c: number; r: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ c: number; r: number } | null>(null);

  // HUD and Layers UI
  const [showGrid, setShowGrid] = useState(true);

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load Clans
        const { data: clansData } = await supabase
          .from<Clan[]>("clans")
          .select("id, name, tag")
          .order("name");
        
        if (clansData) {
          setClans(clansData);
          if (clansData.length > 0) setSelectedClanId(clansData[0].id);
        }

        // Load existing Mafia Plots
        const { data: plotsData } = await supabase
          .from<MafiaPlotRow[]>("mafia_plots")
          .select("id, district_id, tile_col, tile_row, building_type, level, owner_clan_id, clans(name, tag)")
          .eq("district_id", districtId);

        if (plotsData) {
          // Normalize clans relational mapping
          const normalized = (plotsData as MafiaPlotRow[]).map((p) => ({
            id: p.id,
            district_id: p.district_id,
            tile_col: p.tile_col,
            tile_row: p.tile_row,
            building_type: p.building_type,
            level: p.level,
            owner_clan_id: p.owner_clan_id,
            clans: Array.isArray(p.clans) ? p.clans[0] ?? null : p.clans
          }));
          setDbPlots(normalized);
        }
      } catch (err) {
        console.error("Failed to load district map data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [districtId, supabase]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`mafia_plots_${districtId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mafia_plots",
          filter: `district_id=eq.${districtId}`,
        },
        async (payload: PlotChangePayload) => {
          // Fetch updated clans relational data
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newPlot = payload.new;
            let clanRelation = null;
            if (newPlot.owner_clan_id) {
              const { data: c } = await supabase
                .from<{ name: string; tag: string }>("clans")
                .select("name, tag")
                .eq("id", newPlot.owner_clan_id)
                .single();
              clanRelation = c;
            }

            const updated: MafiaPlot = {
              id: newPlot.id ?? crypto.randomUUID(),
              district_id: newPlot.district_id ?? districtId,
              tile_col: newPlot.tile_col ?? 0,
              tile_row: newPlot.tile_row ?? 0,
              building_type: newPlot.building_type ?? null,
              level: newPlot.level ?? 1,
              owner_clan_id: newPlot.owner_clan_id ?? null,
              clans: clanRelation
            };

            setDbPlots((prev) => {
              const idx = prev.findIndex((p) => p.tile_col === updated.tile_col && p.tile_row === updated.tile_row);
              if (idx > -1) {
                const copy = [...prev];
                copy[idx] = updated;
                return copy;
              }
              return [...prev, updated];
            });
          } else if (payload.eventType === "DELETE") {
            const oldPlot = payload.old;
            setDbPlots((prev) => prev.filter((p) => p.id !== oldPlot.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [districtId, supabase]);

  // Map Tile Generation Layout logic (Mtkvari River, Roads, Bridges, Plots)
  const tiles = useMemo(() => {
    const out: { id: number; c: number; r: number; type: "road" | "river" | "bridge" | "plot" | "grass" }[] = [];
    let id = 0;

    // Fixed predefined plots coords so they stand out
    const plotCoords = [
      { c: 3, r: 2 },
      { c: 6, r: 5 },
      { c: 8, r: 3 },
      { c: 2, r: 7 },
      { c: 5, r: 9 },
      { c: 2, r: 2 },
      { c: 3, r: 3 },
      { c: 4, r: 4 },
      { c: 6, r: 2 },
      { c: 7, r: 7 },
      { c: 10, r: 5 }
    ];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let type: "road" | "river" | "bridge" | "plot" | "grass" = "grass";

        // 1. Mtkvari River (diagonal)
        const isRiver = (c + r) === 11;
        // 2. Roads
        const isRoad = c === 5 || r === 6;

        if (isRiver && isRoad) {
          type = "bridge";
        } else if (isRiver) {
          type = "river";
        } else if (isRoad) {
          type = "road";
        } else if (plotCoords.some((p) => p.c === c && p.r === r)) {
          type = "plot";
        }

        out.push({ id: id++, c, r, type });
      }
    }
    return out;
  }, []);

  // Helpers for canvas interactions
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
  }, [tx, ty]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setTx(d.tx + dx);
    setTy(d.ty + dy);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    setTimeout(() => { dragRef.current = null; }, 0);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setScale((s) => Math.min(3, Math.max(0.4, s * factor)));
  }, []);

  // Pick Plot logic
  const handleTileClick = (c: number, r: number) => {
    if (dragRef.current?.moved) return;
    setSelectedTile((cur) => (cur?.c === c && cur?.r === r ? null : { c, r }));
  };

  // Inspect selection
  const selectedPlotData = useMemo(() => {
    if (!selectedTile) return null;
    const tile = tiles.find((t) => t.c === selectedTile.c && t.r === selectedTile.r);
    const dbPlot = dbPlots.find((p) => p.tile_col === selectedTile.c && p.tile_row === selectedTile.r);
    return {
      c: selectedTile.c,
      r: selectedTile.r,
      type: tile?.type ?? "grass",
      db: dbPlot ?? null,
    };
  }, [selectedTile, tiles, dbPlots]);

  const districtStats = useMemo(() => {
    return dbPlots.reduce(
      (acc, plot) => {
        if (!plot.building_type) return acc;
        const rule = BUILDING_RULES[plot.building_type];
        const level = Math.max(1, plot.level);
        acc.income += rule.income * level;
        acc.influence += rule.influence * level;
        acc.heat += rule.heat * level;
        acc.muscle += rule.muscle * level;
        acc.assets += 1;
        return acc;
      },
      { income: 18, influence: 8, heat: 4, muscle: 0, assets: 0 }
    );
  }, [dbPlots]);

  const control = clamp(Math.round(respect + districtStats.influence - heat * 0.45), 0, 100);
  const wantedLevel = clamp(Math.ceil(heat / 20), 1, 5);
  const selectedOperationConfig = OPERATIONS.find((op) => op.id === selectedOperation)!;

  const runOperation = () => {
    const income = districtStats.income;
    const influence = districtStats.influence;
    const assetMuscle = districtStats.muscle;
    const heatPressure = districtStats.heat;

    if (selectedOperation === "collect") {
      const gain = Math.round(income * (1 + control / 180));
      setCash((value) => value + gain);
      setRespect((value) => clamp(value + Math.ceil(influence / 18), 0, 100));
      setHeat((value) => clamp(value + 5 + Math.ceil(heatPressure / 12), 0, 100));
      setOperationLog(`ხარკი აკრეფილია: +${gain}₾. ქუჩა გრძნობს, რომ კონტროლი მყარდება.`);
    }

    if (selectedOperation === "raid") {
      const power = muscle + assetMuscle;
      const success = power > heat + 12;
      setCash((value) => value + (success ? 90 : 24));
      setRespect((value) => clamp(value + (success ? 11 : 3), 0, 100));
      setMuscle((value) => clamp(value - (success ? 2 : 5), 0, 100));
      setHeat((value) => clamp(value + (success ? 14 : 22), 0, 100));
      setOperationLog(success ? "რეიდი გავიდა სუფთად: cash და respect გაიზარდა." : "რეიდი ჩაიშალა ნაწილობრივ: პოლიცია ახლოსაა, heat მკვეთრად გაიზარდა.");
    }

    if (selectedOperation === "bribe") {
      if (cash < 120) {
        setOperationLog("ქრთამს მინიმუმ 120₾ სჭირდება. ჯერ შემოსავალი ააგროვე.");
        return;
      }
      setCash((value) => value - 120);
      setHeat((value) => clamp(value - 22, 0, 100));
      setRespect((value) => clamp(value + 2, 0, 100));
      setOperationLog("ქრთამმა იმუშავა: patrol pressure დაეცა და უბანი დროებით მშვიდია.");
    }

    if (selectedOperation === "recruit") {
      const cost = 80 + Math.ceil(muscle * 1.5);
      if (cash < cost) {
        setOperationLog(`ახალი ბიჭებისთვის ${cost}₾ გჭირდება. cash ჯერ არ ჰყოფნის.`);
        return;
      }
      setCash((value) => value - cost);
      setMuscle((value) => clamp(value + 9, 0, 100));
      setHeat((value) => clamp(value + 6, 0, 100));
      setOperationLog(`რეკრუტი შესრულდა: muscle +9, ხარჯი ${cost}₾.`);
    }

    setTurn((value) => value + 1);
  };

  const resetRun = () => {
    setCash(420);
    setRespect(18);
    setMuscle(12);
    setHeat(24);
    setTurn(1);
    setOperationLog("run reset: ვაკე ისევ ნეიტრალური ოპერაციის წინ არის.");
  };

  // DB Mutators (Build / Upgrade / Demolish)
  const handleBuild = async (type: string) => {
    if (!selectedTile) return;
    try {
      const existing = dbPlots.find((p) => p.tile_col === selectedTile.c && p.tile_row === selectedTile.r);
      if (existing) {
        await supabase
          .from("mafia_plots")
          .update({
            building_type: type as BuildingType,
            level: 1,
            owner_clan_id: selectedClanId || null
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("mafia_plots")
          .insert({
            district_id: districtId,
            tile_col: selectedTile.c,
            tile_row: selectedTile.r,
            building_type: type as BuildingType,
            level: 1,
            owner_clan_id: selectedClanId || null
          });
      }
    } catch (err) {
      console.error("Build failed:", err);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlotData?.db) return;
    try {
      await supabase
        .from("mafia_plots")
        .update({ level: selectedPlotData.db.level + 1 })
        .eq("id", selectedPlotData.db.id);
    } catch (err) {
      console.error("Upgrade failed:", err);
    }
  };

  const handleDemolish = async () => {
    if (!selectedPlotData?.db) return;
    try {
      await supabase
        .from("mafia_plots")
        .delete()
        .eq("id", selectedPlotData.db.id);
      
      setSelectedTile(null);
    } catch (err) {
      console.error("Demolish failed:", err);
    }
  };

  // Render Building SVG Graphics
  const renderBuilding = (buildingType: string, c: number, r: number, lvl: number, ownerClanTag?: string) => {
    const { x, y } = tileCenter(c, r);
    // Color theme per building
    if (buildingType === "garage") {
      // 90s Tbilisi Metal Garage (ჟესტის გარაჟი) - rusty/metallic
      const h = 20;
      const left = `${x - TW / 2},${y} ${x},${y + TH / 2} ${x},${y + TH / 2 - h} ${x - TW / 2},${y - h}`;
      const right = `${x},${y + TH / 2} ${x + TW / 2},${y} ${x + TW / 2},${y - h} ${x},${y + TH / 2 - h}`;
      const top = diamond(c, r, h);

      return (
        <g className="building-garage" filter="url(#building-shadow)">
          <ellipse cx={x} cy={y + 14} rx="35" ry="10" fill="#020202" opacity="0.32" />
          {/* Base */}
          <polygon points={left} fill="#8c5835" stroke="#5c381c" strokeWidth="0.5" />
          <polygon points={right} fill="#a86e49" stroke="#5c381c" strokeWidth="0.5" />
          <polygon points={top} fill="#be805b" stroke="#7d4a27" strokeWidth="0.5" />
          <path d={`M${x - 28},${y - h + 4} L${x - 8},${y - h + 13} L${x - 10},${y - h + 18} L${x - 30},${y - h + 9} Z`} fill="#5f2d1f" opacity="0.55" />
          <path d={`M${x + 6},${y - h + 15} L${x + 29},${y - h + 4}`} stroke="#d59655" strokeDasharray="3 3" strokeWidth="0.9" opacity="0.6" />
          {/* Corrugated stripes */}
          <line x1={x - TW/3} y1={y - h + TH/6} x2={x - TW/3} y2={y + TH/6} stroke="#5c381c" strokeWidth="0.7" />
          <line x1={x - TW/6} y1={y - h + TH/3} x2={x - TW/6} y2={y + TH/3} stroke="#5c381c" strokeWidth="0.7" />
          <line x1={x + TW/6} y1={y - h + TH/3} x2={x + TW/6} y2={y + TH/3} stroke="#5c381c" strokeWidth="0.7" />
          <line x1={x + TW/3} y1={y - h + TH/6} x2={x + TW/3} y2={y + TH/6} stroke="#5c381c" strokeWidth="0.7" />
          {/* Garage Door lines on left face */}
          <path d={`M${x - TW/2.5},${y + TH/8} L${x - TW/8},${y + TH/2.3}`} stroke="#111" strokeWidth="1" />
          <text x={x - 12} y={y - 4} fill="#1b0f09" fontSize="6" fontWeight="900" textAnchor="middle" transform={`rotate(22 ${x - 12} ${y - 4})`}>
            AUTO
          </text>
          <circle cx={x + 24} cy={y + 8} r="3" fill="#111" stroke="#5c4a34" strokeWidth="0.7" />
          <circle cx={x + 29} cy={y + 6} r="3" fill="#111" stroke="#5c4a34" strokeWidth="0.7" />
          {/* Level badge */}
          <text x={x} y={y - h - 3} fill="#ffb84d" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" filter="drop-shadow(0px 1px 1px #000)">
            L{lvl} {ownerClanTag && `[${ownerClanTag}]`}
          </text>
        </g>
      );
    }

    if (buildingType === "kiosk") {
      // 90s Commercial Kiosk (ფანერის / რკინის ჯიხური) - faded blue
      const h = 26;
      const left = `${x - TW / 2},${y} ${x},${y + TH / 2} ${x},${y + TH / 2 - h} ${x - TW / 2},${y - h}`;
      const right = `${x},${y + TH / 2} ${x + TW / 2},${y} ${x + TW / 2},${y - h} ${x},${y + TH / 2 - h}`;
      const top = diamond(c, r, h);

      return (
        <g className="building-kiosk" filter="url(#building-shadow)">
          <ellipse cx={x} cy={y + 14} rx="34" ry="10" fill="#020202" opacity="0.3" />
          <polygon points={left} fill="#1e3a5f" stroke="#10223b" strokeWidth="0.5" />
          <polygon points={right} fill="#2e5588" stroke="#10223b" strokeWidth="0.5" />
          {/* Roof (red paint) */}
          <polygon points={top} fill="#cc4433" stroke="#882211" strokeWidth="0.5" />
          <path d={`M${x - 29},${y - h + 7} L${x},${y - h + 18} L${x + 28},${y - h + 6}`} stroke="#f0d57a" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.75" />
          {/* Showcase window on right face */}
          <polygon points={`${x + TW/6},${y - h/2} ${x + TW/3},${y - h/2 - TH/6} ${x + TW/3},${y - TH/6} ${x + TW/6},${y}`} fill="#d0f0ff" stroke="#111" strokeWidth="0.8" />
          {/* Window glare */}
          <line x1={x + TW/4} y1={y - h/2} x2={x + TW/4 + 5} y2={y - TH/8} stroke="#fff" strokeWidth="0.5" opacity="0.6" />
          <rect x={x - 25} y={y - 7} width="9" height="7" fill="#d8c08a" stroke="#111" strokeWidth="0.5" />
          <rect x={x - 15} y={y - 4} width="8" height="5" fill="#8b2d24" stroke="#111" strokeWidth="0.5" />
          <text x={x + 2} y={y - h + 9} fill="#fff1b8" fontSize="5.5" fontWeight="900" textAnchor="middle">
            წყალი • სიგარეტი
          </text>
          <text x={x} y={y - h - 3} fill="#ffb84d" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" filter="drop-shadow(0px 1px 1px #000)">
            L{lvl} {ownerClanTag && `[${ownerClanTag}]`}
          </text>
        </g>
      );
    }

    if (buildingType === "casino") {
      // Casino (კაზინო) - luxury dark concrete, flashy blood-red/neon glowing sign
      const h = 42;
      const left = `${x - TW / 2},${y} ${x},${y + TH / 2} ${x},${y + TH / 2 - h} ${x - TW / 2},${y - h}`;
      const right = `${x},${y + TH / 2} ${x + TW / 2},${y} ${x + TW / 2},${y - h} ${x},${y + TH / 2 - h}`;
      const top = diamond(c, r, h);

      return (
        <g className="building-casino" filter="url(#building-shadow)">
          <ellipse cx={x} cy={y + 17} rx="40" ry="13" fill="#020202" opacity="0.38" />
          <polygon points={left} fill="#141416" stroke="#000" strokeWidth="0.5" />
          <polygon points={right} fill="#222225" stroke="#000" strokeWidth="0.5" />
          <polygon points={top} fill="#303035" stroke="#111" strokeWidth="0.5" />
          
          {/* Neon lights */}
          <polyline points={`${x - TW/3},${y - h + 10} ${x},${y - h + 18} ${x + TW/3},${y - h + 10}`} fill="none" stroke="#ff0055" strokeWidth="1.5" filter="url(#neon-glow)" />
          <circle cx={x} cy={y - h/2} r="3" fill="#ffea00" filter="url(#neon-glow)" />
          <path d={`M${x - 25},${y - h + 22} H${x + 25}`} stroke="#18f5d4" strokeDasharray="2 5" strokeWidth="1" filter="url(#neon-glow)" opacity="0.9" />
          
          {/* Casino text */}
          <text x={x} y={y - h + 12} fill="#ff0055" fontSize="8" fontWeight="black" fontFamily="monospace" textAnchor="middle" filter="url(#neon-glow)">
            CASINO
          </text>
          <text x={x} y={y - h + 31} fill="#ffdf9f" fontSize="5" fontWeight="900" textAnchor="middle">
            ღიაა 02:00-მდე
          </text>
          <text x={x} y={y - h - 3} fill="#ffb84d" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" filter="drop-shadow(0px 1px 1px #000)">
            L{lvl} {ownerClanTag && `[${ownerClanTag}]`}
          </text>
        </g>
      );
    }

    if (buildingType === "wash") {
      const h = 32;
      const left = `${x - TW / 2},${y} ${x},${y + TH / 2} ${x},${y + TH / 2 - h} ${x - TW / 2},${y - h}`;
      const right = `${x},${y + TH / 2} ${x + TW / 2},${y} ${x + TW / 2},${y - h} ${x},${y + TH / 2 - h}`;
      const top = diamond(c, r, h);

      return (
        <g className="building-wash" filter="url(#building-shadow)">
          <ellipse cx={x} cy={y + 13} rx="36" ry="10" fill="#020202" opacity="0.34" />
          <polygon points={left} fill="#244548" stroke="#0d1a1c" strokeWidth="0.6" />
          <polygon points={right} fill="#315d61" stroke="#0d1a1c" strokeWidth="0.6" />
          <polygon points={top} fill="#5d7774" stroke="#233332" strokeWidth="0.6" />
          <path d={`M${x - 22},${y - h + 16} Q${x - 7},${y - h + 9} ${x + 8},${y - h + 15} T${x + 27},${y - h + 12}`} fill="none" stroke="#94e4de" strokeWidth="1.4" opacity="0.8" />
          <rect x={x - 18} y={y - 8} width="11" height="7" fill="#141d1f" stroke="#0a0d0f" strokeWidth="0.5" />
          <rect x={x + 8} y={y - 9} width="12" height="8" fill="#15292d" stroke="#0a0d0f" strokeWidth="0.5" />
          <text x={x} y={y - h + 9} fill="#d6fffa" fontSize="6" fontWeight="900" textAnchor="middle" filter="url(#neon-glow)">
            WASH
          </text>
          <text x={x} y={y - h - 3} fill="#ffb84d" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" filter="drop-shadow(0px 1px 1px #000)">
            L{lvl} {ownerClanTag && `[${ownerClanTag}]`}
          </text>
        </g>
      );
    }

    if (buildingType === "hq" || buildingType === "coop") {
      // Soviet Khrushchyovka / Panel block (ხრუშჩოვკა / კორპუსი)
      const h = 55;
      const left = `${x - TW / 2},${y} ${x},${y + TH / 2} ${x},${y + TH / 2 - h} ${x - TW / 2},${y - h}`;
      const right = `${x},${y + TH / 2} ${x + TW / 2},${y} ${x + TW / 2},${y - h} ${x},${y + TH / 2 - h}`;
      const top = diamond(c, r, h);

      return (
        <g className="building-soviet-block" filter="url(#building-shadow)">
          <ellipse cx={x} cy={y + 18} rx="43" ry="14" fill="#020202" opacity="0.42" />
          {/* Concrete panels */}
          <polygon points={left} fill="#3d4043" stroke="#2b2d2f" strokeWidth="0.5" />
          <polygon points={right} fill="#56595d" stroke="#2b2d2f" strokeWidth="0.5" />
          <polygon points={top} fill="#6e7277" stroke="#444" strokeWidth="0.5" />
          <path d={`M${x - 31},${y - h + 8} L${x - 2},${y - h + 22} M${x + 2},${y - h + 22} L${x + 29},${y - h + 9}`} stroke="#777" strokeDasharray="7 6" strokeWidth="0.8" opacity="0.45" />

          {/* Windows Left Face (3 rows, 2 columns) */}
          <rect x={x - 22} y={y - h + 12} width="5" height="6" fill="#f1c40f" opacity="0.8" stroke="#000" strokeWidth="0.5" />
          <rect x={x - 12} y={y - h + 17} width="5" height="6" fill="#111" stroke="#000" strokeWidth="0.5" />
          <rect x={x - 22} y={y - h + 26} width="5" height="6" fill="#111" stroke="#000" strokeWidth="0.5" />
          <rect x={x - 12} y={y - h + 31} width="5" height="6" fill="#f1c40f" opacity="0.9" stroke="#000" strokeWidth="0.5" />
          <rect x={x - 22} y={y - h + 40} width="5" height="6" fill="#f1c40f" opacity="0.7" stroke="#000" strokeWidth="0.5" />
          <rect x={x - 12} y={y - h + 45} width="5" height="6" fill="#111" stroke="#000" strokeWidth="0.5" />

          {/* Windows Right Face */}
          <rect x={x + 6} y={y - h + 17} width="5" height="6" fill="#111" stroke="#000" strokeWidth="0.5" />
          <rect x={x + 16} y={y - h + 12} width="5" height="6" fill="#f1c40f" opacity="0.85" stroke="#000" strokeWidth="0.5" />
          <rect x={x + 6} y={y - h + 31} width="5" height="6" fill="#f1c40f" opacity="0.75" stroke="#000" strokeWidth="0.5" />
          <rect x={x + 16} y={y - h + 26} width="5" height="6" fill="#111" stroke="#000" strokeWidth="0.5" />
          <rect x={x + 4} y={y - h + 43} width="7" height="3" fill="#1f1f1f" stroke="#000" strokeWidth="0.4" />
          <rect x={x + 14} y={y - h + 39} width="7" height="3" fill="#1f1f1f" stroke="#000" strokeWidth="0.4" />

          {/* Clothesline (სარეცხის თოკი) hanging on the side */}
          <path d={`M${x - 20},${y - 8} Q${x - 10},${y - 4} ${x},${y - 6}`} fill="none" stroke="#ccc" strokeWidth="0.5" />
          <line x1={x - 15} y1={y - 6} x2={x - 15} y2={y - 3} stroke="#ff5555" strokeWidth="0.8" />
          <line x1={x - 10} y1={y - 5} x2={x - 10} y2={y - 2} stroke="#5555ff" strokeWidth="0.8" />
          <rect x={x - 5} y={y + 2} width="8" height="10" fill="#171717" stroke="#0a0a0a" strokeWidth="0.5" />
          <text x={x - 16} y={y - 2} fill="#141414" fontSize="5" fontWeight="900" transform={`rotate(18 ${x - 16} ${y - 2})`}>
            1991
          </text>

          <text x={x} y={y - h - 3} fill="#ffb84d" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" filter="drop-shadow(0px 1px 1px #000)">
            {buildingType.toUpperCase()} L{lvl} {ownerClanTag && `[${ownerClanTag}]`}
          </text>
        </g>
      );
    }

    return null;
  };

  return (
    <div className="relative w-full overflow-hidden bg-[#030303]" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* ── TOP BANNER HUD ───────────────────────────── */}
      <div className="absolute left-4 top-4 z-30 pointer-events-none sm:left-8 sm:top-8">
        <div className="flex items-center gap-3">
          <Link href="/mafia" className="pointer-events-auto bg-[#c0392b] hover:bg-[#a93226] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1.5 transition shadow-[2px_2px_0_#000]">
            ← ქალაქი
          </Link>
          <span className="font-mono text-xs text-[#888] tracking-widest">SUB-SECTOR OVERVIEW // 1.9.9.1</span>
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-wider text-[#e0e0e0] mt-2 drop-shadow-[2px_2px_0_#000]">
          უბანი // {DISTRICT_NAMES[districtId] || districtId.toUpperCase()}
        </h1>
        <div className="font-mono text-[10px] text-[#555] tracking-widest mt-1">GRID COORDINATES: 12x12 TACTICAL OVERLAY</div>
      </div>

      {/* ── GAME STATUS STRIP ─────────────────────────── */}
      <div className="absolute left-4 right-4 top-28 z-30 grid gap-2 pointer-events-none sm:left-8 sm:right-auto sm:top-36 sm:w-[420px]">
        <div className="border border-[#442016] bg-[#080706]/95 p-3 shadow-[4px_4px_0_#000]">
          <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="text-[#ffb84d]">Objective: control Vake</span>
            <span className="text-[#777]">Turn {turn}</span>
          </div>
          <div className="h-2 overflow-hidden border border-[#33231a] bg-[#130d0b]">
            <div
              className="h-full bg-gradient-to-r from-[#c0392b] via-[#ffb84d] to-[#f7f1c5] transition-all duration-300"
              style={{ width: `${control}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 font-mono text-[10px] uppercase tracking-wider text-[#aaa]">
            <span>Ctrl {control}%</span>
            <span>{cash}₾</span>
            <span>Muscle {muscle + districtStats.muscle}</span>
            <span>Heat {heat}</span>
          </div>
        </div>
      </div>

      {/* ── CAMB-BOX WORKSPACE ───────────────────────── */}
      <div
        className="relative h-full w-full select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        {/* Subtle grid backdrop */}
        <div className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(rgba(192,57,43,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* #world (transform Matrix) */}
        <div
          className="absolute left-0 top-0 origin-top-left transition-transform duration-75"
          style={{ transform: `matrix(${scale}, 0, 0, ${scale}, ${tx}, ${ty})` }}
        >
          <svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} style={{ overflow: "visible" }}>
            <defs>
              {/* Tile Textures */}
              <linearGradient id="grass-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e231b" />
                <stop offset="100%" stopColor="#131611" />
              </linearGradient>
              <linearGradient id="road-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2b2b2b" />
                <stop offset="100%" stopColor="#1c1c1c" />
              </linearGradient>
              <linearGradient id="river-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f2a3a" />
                <stop offset="100%" stopColor="#071822" />
              </linearGradient>
              <linearGradient id="plot-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d2c20" />
                <stop offset="100%" stopColor="#291d15" />
              </linearGradient>
              <linearGradient id="plot-active" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8c251b" />
                <stop offset="100%" stopColor="#4f110c" />
              </linearGradient>
              <radialGradient id="street-oil" cx="50%" cy="55%" r="70%">
                <stop offset="0%" stopColor="#4a3220" stopOpacity="0.38" />
                <stop offset="65%" stopColor="#0e0e0e" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
              <filter id="neon-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="building-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="5" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.55" />
              </filter>
            </defs>

            {/* ── 1. ART TILE LAYER ────────────────────── */}
            <g className="tiles">
              {tiles.map(({ id, c, r, type }) => {
                const dbPlot = dbPlots.find((p) => p.tile_col === c && p.tile_row === r);
                const isSelected = selectedTile?.c === c && selectedTile?.r === r;
                const isHovered = hoveredTile?.c === c && hoveredTile?.r === r;

                let tileFill = "url(#grass-grad)";
                let tileStroke = "rgba(255,255,255,0.02)";

                if (type === "road") {
                  tileFill = "url(#road-grad)";
                  tileStroke = "rgba(255,255,255,0.06)";
                } else if (type === "river") {
                  tileFill = "url(#river-grad)";
                } else if (type === "bridge") {
                  tileFill = "#3a3a3d";
                  tileStroke = "#555";
                } else if (type === "plot") {
                  tileFill = isSelected ? "url(#plot-active)" : "url(#plot-grad)";
                  tileStroke = isSelected ? "#c0392b" : "#b0663450";
                }

                return (
                  <g key={`tile-${id}`}>
                    {/* Diamond shape */}
                    <polygon
                      points={diamond(c, r)}
                      fill={tileFill}
                      stroke={showGrid ? tileStroke : "transparent"}
                      strokeWidth="1"
                    />
                    <polygon points={diamond(c, r)} fill="url(#street-oil)" opacity={type === "road" ? 0.55 : 0.14} />
                    {renderTileSurfaceDetails(type, c, r)}

                    {type === "plot" && !dbPlot && (
                      // Fenced Empty Plot (ჟესტის ღობე / მშენებლობა)
                      <g>
                        {/* Fence borders */}
                        <polygon points={diamond(c, r)} fill="none" stroke="#f39c12" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                        {/* Construction caution triangle */}
                        <polygon points={`${tileCenter(c, r).x},${tileCenter(c, r).y - 5} ${tileCenter(c, r).x + 5},${tileCenter(c, r).y + 4} ${tileCenter(c, r).x - 5},${tileCenter(c, r).y + 4}`} fill="none" stroke="#f39c12" strokeWidth="1" />
                        <circle cx={tileCenter(c, r).x} cy={tileCenter(c, r).y + 2} r="0.7" fill="#f39c12" />
                      </g>
                    )}

                    {/* Render active buildings on plots */}
                    {dbPlot && dbPlot.building_type && (
                      renderBuilding(dbPlot.building_type, c, r, dbPlot.level, dbPlot.clans?.tag)
                    )}

                    {/* Selection Highlighting */}
                    {isSelected && (
                      <polygon
                        points={diamond(c, r)}
                        fill="rgba(192,57,43,0.15)"
                        stroke="#c0392b"
                        strokeWidth="2"
                        style={{ filter: "drop-shadow(0 0 6px #c0392b)" }}
                        pointerEvents="none"
                      />
                    )}

                    {isHovered && !isSelected && (
                      <polygon
                        points={diamond(c, r)}
                        fill="rgba(255,255,255,0.06)"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1.5"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* ── 2. NON-INTERACTIVE TBILISI SET DRESSING ── */}
            <g className="ambient-city-props">
              {AMBIENT_PROPS.map((prop) => (
                <g key={prop.id} filter={prop.kind === "panel_block" ? "url(#building-shadow)" : undefined}>
                  {renderAmbientProp(prop)}
                </g>
              ))}
            </g>

            {/* ── 3. SEPARATE HIT-TEST LAYER ──────────────── */}
            <g className="hit-layer">
              {tiles.map(({ id, c, r }) => (
                <polygon
                  key={`hit-${id}`}
                  points={diamond(c, r)}
                  fill="transparent"
                  stroke="none"
                  style={{ cursor: "pointer" }}
                  onPointerEnter={() => setHoveredTile({ c, r })}
                  onPointerLeave={() => setHoveredTile(null)}
                  onClick={() => handleTileClick(c, r)}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* ── HUD: CONTROLS (ZOOM/PAN) ───────────────────── */}
      <div className="absolute bottom-8 left-8 z-30 flex flex-col gap-2 pointer-events-auto">
        <button onClick={() => setScale((s) => Math.min(3, s * 1.2))} className="grid h-10 w-10 place-items-center rounded border border-[#333] bg-[#0a0a0a]/90 text-lg font-bold text-[#e0e0e0] hover:bg-[#1a1a1a] shadow-[2px_2px_0_#000]">+</button>
        <button onClick={() => setScale((s) => Math.max(0.4, s / 1.2))} className="grid h-10 w-10 place-items-center rounded border border-[#333] bg-[#0a0a0a]/90 text-lg font-bold text-[#e0e0e0] hover:bg-[#1a1a1a] shadow-[2px_2px_0_#000]">−</button>
        <button onClick={() => { setScale(1.1); setTx(100); setTy(80); setSelectedTile(null); }} className="grid h-10 w-10 place-items-center rounded border border-[#333] bg-[#0a0a0a]/90 text-xs text-[#888] hover:bg-[#1a1a1a] shadow-[2px_2px_0_#000]">⟲</button>
        <button onClick={() => setShowGrid((value) => !value)} className="grid h-10 w-10 place-items-center rounded border border-[#333] bg-[#0a0a0a]/90 text-[10px] font-bold uppercase text-[#888] hover:bg-[#1a1a1a] shadow-[2px_2px_0_#000]">
          {showGrid ? "Grid" : "Clean"}
        </button>
      </div>

      {/* ── HUD: OPERATIONS DECK ─────────────────────── */}
      <div className="absolute bottom-4 left-20 right-4 z-30 border-2 border-[#2f241a] bg-[#090807]/95 p-3 shadow-[6px_6px_0_#000] sm:bottom-8 sm:left-24 sm:right-auto sm:w-[560px]">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#777]">Operation deck</div>
            <div className="font-display text-lg font-black uppercase tracking-wider text-[#e7dfcf]">{selectedOperationConfig.title}</div>
            <p className="mt-1 max-w-md text-xs text-[#8f887d]">{selectedOperationConfig.description}</p>
          </div>
          <button
            onClick={runOperation}
            className="shrink-0 border border-[#ffb84d] bg-[#ffb84d] px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-[#120b05] transition hover:bg-[#f7f1c5]"
          >
            Execute
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OPERATIONS.map((operation) => (
            <button
              key={operation.id}
              onClick={() => setSelectedOperation(operation.id)}
              className={`border px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                selectedOperation === operation.id
                  ? "border-[#c0392b] bg-[#c0392b]/20 text-[#ffdf9f]"
                  : "border-[#302820] bg-[#11100f] text-[#777] hover:border-[#77513c] hover:text-[#ddd]"
              }`}
            >
              {operation.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#231b15] pt-2 font-mono text-[10px] text-[#777]">
          <span>{operationLog}</span>
          <button onClick={resetRun} className="shrink-0 uppercase tracking-widest text-[#c0392b] hover:text-[#ffb84d]">Reset run</button>
        </div>
      </div>

      {/* ── CRT OVERLAY SCANLINES ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] opacity-40 z-10"></div>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.95)] z-10"></div>

      <GameHUD />

      {/* ── HUD: SIDE CONTROL PANEL (INSPECTOR) ───────── */}
      <div
        className="absolute right-4 top-4 z-30 hidden w-72 flex-col border-2 p-5 shadow-[6px_6px_0px_#000] transition-all duration-200 xl:flex"
        style={{
          borderColor: selectedPlotData?.db?.owner_clan_id ? "#c0392b" : "#444",
          background: "rgba(10, 10, 10, 0.95)",
        }}
      >
        {loading && (
          <div className="mb-3 border border-[#333] bg-[#111] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#777]">
            Loading live plots...
          </div>
        )}
        <div className="mb-4 grid grid-cols-2 gap-2 border-b border-[#222] pb-3 font-mono text-[10px] uppercase tracking-wider text-[#777]">
          <div>
            <div className="text-[#444]">Assets</div>
            <div className="text-[#e0e0e0]">{districtStats.assets}</div>
          </div>
          <div>
            <div className="text-[#444]">Income</div>
            <div className="text-[#ffb84d]">+{districtStats.income}₾</div>
          </div>
          <div>
            <div className="text-[#444]">Respect</div>
            <div className="text-[#e0e0e0]">{respect}</div>
          </div>
          <div>
            <div className="text-[#444]">Wanted</div>
            <div className="text-[#c0392b]">{wantedLevel}/5</div>
          </div>
        </div>
        {selectedPlotData ? (
          <>
            <div className="mb-4 border-b-2 pb-2" style={{ borderColor: selectedPlotData.db?.owner_clan_id ? "#c0392b" : "#333" }}>
              <div className="font-mono text-[10px] text-[#666] tracking-widest mb-1">SELECTED TILE // [{selectedPlotData.c}, {selectedPlotData.r}]</div>
              <div className="font-display text-lg font-black uppercase tracking-wider text-[#e0e0e0]">
                {selectedPlotData.type === "road" && "ასფალტის ქუჩა"}
                {selectedPlotData.type === "river" && "მდ. მტკვარი"}
                {selectedPlotData.type === "bridge" && "ბეტონის ხიდი"}
                {selectedPlotData.type === "grass" && "მიტოვებული ეზო"}
                {selectedPlotData.type === "plot" && (selectedPlotData.db?.building_type ? selectedPlotData.db.building_type.toUpperCase() : "თავისუფალი ნაკვეთი")}
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs uppercase tracking-wider flex-grow">
              {selectedPlotData.type === "plot" ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#222] pb-2">
                    <span className="text-[#666]">სტატუსი</span>
                    {selectedPlotData.db?.building_type ? (
                      <span className="px-2 py-0.5 font-bold bg-[#c0392b] text-[#000]">დაკავებული</span>
                    ) : (
                      <span className="px-2 py-0.5 font-bold text-[#aaaaaa] border border-[#555] bg-[#222]">თავისუფალი</span>
                    )}
                  </div>

                  {selectedPlotData.db ? (
                    <>
                      <div className="flex items-center justify-between border-b border-[#222] pb-2">
                        <span className="text-[#666]">დონე</span>
                        <span className="text-[#e0e0e0] font-bold">LVL {selectedPlotData.db.level}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#222] pb-2">
                        <span className="text-[#666]">დაჯგუფება</span>
                        <span className="text-[#e0e0e0] font-bold">{selectedPlotData.db.clans?.name || "უცნობი"}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#222] pb-2">
                        <span className="text-[#666]">ბონუსი</span>
                        <span className="text-[#ffb84d] font-bold">
                          {selectedPlotData.db.building_type === "garage" && `დაცვა +${selectedPlotData.db.level * 2}%`}
                          {selectedPlotData.db.building_type === "kiosk" && `შემოსავალი +${selectedPlotData.db.level * 3}%`}
                          {selectedPlotData.db.building_type === "casino" && `კონტრაბანდა +${selectedPlotData.db.level * 5}%`}
                          {selectedPlotData.db.building_type === "hq" && `გავლენა +${selectedPlotData.db.level * 4}%`}
                          {selectedPlotData.db.building_type === "coop" && `XP Boost +${selectedPlotData.db.level * 2}%`}
                        </span>
                      </div>

                      {/* Upgrade/Demolish Actions */}
                      <div className="pt-2 space-y-2">
                        <button onClick={handleUpgrade} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider border border-[#ffb84d] text-[#ffb84d] hover:bg-[#ffb84d]/10 transition">
                          გაძლიერება (UPGRADE)
                        </button>
                        <button onClick={handleDemolish} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider border border-[#c0392b] text-[#c0392b] hover:bg-[#c0392b]/10 transition">
                          დანგრევა (DEMOLISH)
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Representation Gang selector */}
                      <div className="flex flex-col gap-1.5 border-b border-[#222] pb-3">
                        <span className="text-[#666]">დაჯგუფება (BUILD FOR):</span>
                        <select
                          className="bg-[#111] text-[#fff] border border-[#333] px-2 py-1.5 focus:outline-none w-full"
                          value={selectedClanId}
                          onChange={(e) => setSelectedClanId(e.target.value)}
                        >
                          {clans.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} [{c.tag}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Build Options */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[#666] text-[10px] block mb-1">აშენება (BUILD OPTIONS):</span>
                        <button onClick={() => handleBuild("garage")} className="w-full text-left py-2 px-3 border border-[#444] hover:border-[#aaa] transition flex items-center justify-between">
                          <span>ჟესტის გარაჟი</span>
                          <span className="text-[#666] text-[10px]">GARAGE</span>
                        </button>
                        <button onClick={() => handleBuild("kiosk")} className="w-full text-left py-2 px-3 border border-[#444] hover:border-[#aaa] transition flex items-center justify-between">
                          <span>სავაჭრო ჯიხური</span>
                          <span className="text-[#666] text-[10px]">KIOSK</span>
                        </button>
                        <button onClick={() => handleBuild("casino")} className="w-full text-left py-2 px-3 border border-[#444] hover:border-[#aaa] transition flex items-center justify-between">
                          <span>კაზინო</span>
                          <span className="text-[#666] text-[10px]">CASINO</span>
                        </button>
                        <button onClick={() => handleBuild("coop")} className="w-full text-left py-2 px-3 border border-[#444] hover:border-[#aaa] transition flex items-center justify-between">
                          <span>კოოპერატივი</span>
                          <span className="text-[#666] text-[10px]">COOP</span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="py-6 text-center text-[#555] normal-case text-xs">
                  ეს ტერიტორია არ არის განკუთვნილი მშენებლობისთვის. აირჩიე თავისუფალი ნაკვეთი (მიწის ნაკვეთები).
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-12 text-center flex flex-col items-center opacity-40">
            <div className="w-7 h-7 border-2 border-dashed border-[#555] rounded-full animate-[spin_12s_linear_infinite] mb-4"></div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">Awaiting Tactical Selection...</div>
          </div>
        )}
      </div>
    </div>
  );
}
