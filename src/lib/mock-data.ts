// Mock data used while the database/auth wiring is still placeholder.
// All UI pages render against these objects until Supabase env vars are configured
// and Drizzle migrations are applied.

export type MockGame = {
  slug: string;
  nameKa: string;
  nameEn: string;
  description: string;
  accent: string;
  emoji: string;
  players: number;
  liveLfg: number;
};

export const mockGames: MockGame[] = [
  {
    slug: "efootball-mobile",
    nameKa: "eFootball Mobile",
    nameEn: "eFootball Mobile",
    description: "Konami-ის მობილური ფეხბურთის სიმულატორი — 1v1 და გუნდური მატჩები.",
    accent: "from-emerald-500/30 to-emerald-500/5",
    emoji: "⚽",
    players: 1284,
    liveLfg: 23,
  },
  {
    slug: "fifa-mobile",
    nameKa: "FIFA Mobile",
    nameEn: "FIFA Mobile",
    description: "EA Sports — VS Attack, H2H რეჟიმები და სეზონური ღონისძიებები.",
    accent: "from-blue-500/30 to-blue-500/5",
    emoji: "🥅",
    players: 942,
    liveLfg: 17,
  },
  {
    slug: "pubg-mobile",
    nameKa: "PUBG Mobile",
    nameEn: "PUBG: Battlegrounds Mobile",
    description: "Squad, Duo, TDM — ბრძოლა გადარჩენისთვის 100 მოთამაშეში.",
    accent: "from-amber-500/30 to-amber-500/5",
    emoji: "🎯",
    players: 2156,
    liveLfg: 48,
  },
  {
    slug: "warzone",
    nameKa: "Call of Duty: Warzone",
    nameEn: "Call of Duty: Warzone",
    description: "BR + Resurgence — სქვადი 4 კაცამდე, ცოცხალი ლობები.",
    accent: "from-red-500/30 to-red-500/5",
    emoji: "🪖",
    players: 1573,
    liveLfg: 31,
  },
  {
    slug: "valorant",
    nameKa: "Valorant",
    nameEn: "Valorant",
    description: "ტაქტიკური 5v5 შუტერი — Competitive, Premier, Unrated.",
    accent: "from-fuchsia-500/30 to-fuchsia-500/5",
    emoji: "🎮",
    players: 1812,
    liveLfg: 39,
  },
];

export type MockLfgPost = {
  id: string;
  gameSlug: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description: string;
  rank: string;
  region: string;
  slots: { filled: number; total: number };
  voiceRequired: boolean;
  createdAgo: string;
  responseCount: number;
};

export const mockLfgPosts: MockLfgPost[] = [
  {
    id: "1",
    gameSlug: "pubg-mobile",
    authorName: "GeoSniper",
    title: "Squad 3+1 → Erangel ranked",
    description: "Crown II+ მოთამაშე ვეძებ. Voice-ით, აქტიური 4 საათი.",
    rank: "Crown II – Ace",
    region: "GE / EU",
    slots: { filled: 3, total: 4 },
    voiceRequired: true,
    createdAgo: "12 წთ წინ",
    responseCount: 4,
  },
  {
    id: "2",
    gameSlug: "efootball-mobile",
    authorName: "Lasha10",
    title: "Co-op events — ვინ მოვა?",
    description: "Co-op event-ისთვის გავაკეთოთ ლობი, ნებისმიერი დონის მოთამაშე.",
    rank: "ნებისმიერი",
    region: "GE",
    slots: { filled: 1, total: 3 },
    voiceRequired: false,
    createdAgo: "37 წთ წინ",
    responseCount: 7,
  },
  {
    id: "3",
    gameSlug: "valorant",
    authorName: "Sage_Tbilisi",
    title: "Premier team — IGL ვეძებ",
    description: "Diamond+ მოთამაშე, თუ გყავს voice და დრო, მოიდი.",
    rank: "Diamond II+",
    region: "EU",
    slots: { filled: 4, total: 5 },
    voiceRequired: true,
    createdAgo: "1 სთ წინ",
    responseCount: 11,
  },
  {
    id: "4",
    gameSlug: "warzone",
    authorName: "ZeroKD",
    title: "Resurgence trio — chill მატჩები",
    description: "Resurgence-ზე ვთამაშობთ, K/D არ მაინტერესებს, fun-ისთვის.",
    rank: "ნებისმიერი",
    region: "GE / RU",
    slots: { filled: 2, total: 3 },
    voiceRequired: false,
    createdAgo: "2 სთ წინ",
    responseCount: 3,
  },
  {
    id: "5",
    gameSlug: "fifa-mobile",
    authorName: "El_Pippo",
    title: "VS Attack კოოპერატივი",
    description: "Top 100-ში გასვლისთვის — VS Attack კოოპერატივი, 4 საათი დღეში.",
    rank: "Div 1",
    region: "GE",
    slots: { filled: 2, total: 4 },
    voiceRequired: true,
    createdAgo: "3 სთ წინ",
    responseCount: 5,
  },
];

export type MockNews = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  gameSlug?: string;
  publishedAt: string;
  author: string;
  readMinutes: number;
};

export const mockNews: MockNews[] = [
  {
    slug: "efootball-mobile-v4-update",
    title: "eFootball Mobile v4.0 — რა შეიცვალა და რა გვერდს გვაძლევს",
    excerpt: "ახალი menu, შემცირებული input lag და სრულიად ხელახლა აწყობილი matchmaking.",
    cover: "from-emerald-500/40 to-emerald-500/0",
    gameSlug: "efootball-mobile",
    publishedAt: "2026-05-14",
    author: "Gameroom Team",
    readMinutes: 4,
  },
  {
    slug: "pubg-erangel-rework",
    title: "PUBG Mobile — Erangel-ის სრული რემეიქი ანონსირდა",
    excerpt: "Krafton-მა გამოაცხადა Erangel 3.0 — ახალი ლოკაციები და დინამიური ამინდი.",
    cover: "from-amber-500/40 to-amber-500/0",
    gameSlug: "pubg-mobile",
    publishedAt: "2026-05-11",
    author: "Beka",
    readMinutes: 6,
  },
  {
    slug: "ge-cup-2026-registration",
    title: "Georgia Mobile Cup 2026 — რეგისტრაცია გახსნილია",
    excerpt: "5,000 GEL პრიზის ფონდი 3 თამაშზე — eFootball, PUBG და Warzone.",
    cover: "from-fuchsia-500/40 to-primary/0",
    publishedAt: "2026-05-08",
    author: "Admin",
    readMinutes: 3,
  },
];

export type MockTournament = {
  slug: string;
  name: string;
  gameSlug: string;
  format: "Single Elimination" | "Double Elimination" | "Round Robin";
  status: "open" | "checkin" | "live" | "completed";
  prizePool: string;
  participants: { current: number; max: number };
  startsAt: string;
  banner: string;
};

export const mockTournaments: MockTournament[] = [
  {
    slug: "ge-cup-efootball-2026",
    name: "Georgia Cup 2026 — eFootball Mobile",
    gameSlug: "efootball-mobile",
    format: "Single Elimination",
    status: "open",
    prizePool: "2,000 GEL",
    participants: { current: 23, max: 32 },
    startsAt: "2026-05-25 19:00",
    banner: "from-emerald-500/40 via-primary/20 to-transparent",
  },
  {
    slug: "tbilisi-pubg-night",
    name: "Tbilisi PUBG Night #4",
    gameSlug: "pubg-mobile",
    format: "Round Robin",
    status: "checkin",
    prizePool: "1,500 GEL",
    participants: { current: 16, max: 16 },
    startsAt: "2026-05-18 21:00",
    banner: "from-amber-500/40 via-primary/20 to-transparent",
  },
  {
    slug: "valorant-spring-clash",
    name: "Valorant Spring Clash",
    gameSlug: "valorant",
    format: "Double Elimination",
    status: "live",
    prizePool: "3,500 GEL",
    participants: { current: 8, max: 8 },
    startsAt: "2026-05-17 20:00",
    banner: "from-fuchsia-500/40 via-primary/20 to-transparent",
  },
  {
    slug: "warzone-resurgence-may",
    name: "Warzone Resurgence Open",
    gameSlug: "warzone",
    format: "Single Elimination",
    status: "completed",
    prizePool: "800 GEL",
    participants: { current: 8, max: 8 },
    startsAt: "2026-05-04 20:00",
    banner: "from-red-500/40 via-primary/20 to-transparent",
  },
];

export type MockForumCategory = {
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  postCount: number;
  lastThread: { title: string; author: string; ago: string };
};

export const mockForumCategories: MockForumCategory[] = [
  {
    slug: "general",
    name: "ზოგადი დისკუსია",
    description: "ყველაფერი გეიმინგზე, რაც სხვაგან არ ჯდება.",
    threadCount: 48,
    postCount: 412,
    lastThread: { title: "რომელია 2026-ის საუკეთესო GPU მობილური ემულატორისთვის?", author: "Saba", ago: "14 წთ წინ" },
  },
  {
    slug: "tournaments",
    name: "ჩემპიონატები",
    description: "Tournament-ების ცხადებები, ანგარიშები და დისკუსიები.",
    threadCount: 19,
    postCount: 156,
    lastThread: { title: "Georgia Cup ფინალის სტრიმის ლინკი?", author: "Nika", ago: "1 სთ წინ" },
  },
  {
    slug: "hardware",
    name: "ტექნიკა და სეტაპები",
    description: "PC, ტელეფონები, კონტროლერები, აქსესუარები.",
    threadCount: 31,
    postCount: 287,
    lastThread: { title: "iPhone 15-ზე PUBG 90fps ჩართვა", author: "Lika", ago: "3 სთ წინ" },
  },
  {
    slug: "feedback",
    name: "ფიდბექი პლატფორმაზე",
    description: "თქვენი იდეები და ბაგების რეპორტი ჩვენთვის.",
    threadCount: 7,
    postCount: 43,
    lastThread: { title: "მინდა PWA ვერსია მობილურისთვის", author: "Tamo", ago: "გუშინ" },
  },
];

export type MockForumThread = {
  slug: string;
  title: string;
  author: string;
  replies: number;
  views: number;
  lastReplyAgo: string;
  pinned?: boolean;
};

export const mockForumThreads: Record<string, MockForumThread[]> = {
  general: [
    { slug: "welcome", title: "კეთილი იყოს თქვენი მობრძანება Gameroom-ზე", author: "Admin", replies: 28, views: 542, lastReplyAgo: "2 სთ წინ", pinned: true },
    { slug: "best-gpu-2026", title: "რომელია 2026-ის საუკეთესო GPU მობილური ემულატორისთვის?", author: "Saba", replies: 14, views: 213, lastReplyAgo: "14 წთ წინ" },
    { slug: "discord-server", title: "ვის აქვს კარგი ქართული Discord სერვერი გეიმინგზე?", author: "Nodo", replies: 9, views: 178, lastReplyAgo: "5 სთ წინ" },
    { slug: "f2p-vs-p2w", title: "Free-to-play vs Pay-to-win — დებატი", author: "Vakho", replies: 22, views: 391, lastReplyAgo: "გუშინ" },
  ],
  tournaments: [
    { slug: "ge-cup-finals-stream", title: "Georgia Cup ფინალის სტრიმის ლინკი?", author: "Nika", replies: 6, views: 84, lastReplyAgo: "1 სთ წინ" },
    { slug: "open-cup-rules", title: "Open Cup-ის რეგლამენტი დახვეწა", author: "Mod", replies: 12, views: 197, lastReplyAgo: "გუშინ", pinned: true },
  ],
  hardware: [
    { slug: "iphone-90fps", title: "iPhone 15-ზე PUBG 90fps ჩართვა", author: "Lika", replies: 8, views: 145, lastReplyAgo: "3 სთ წინ" },
    { slug: "controller-recs", title: "ბიუჯეტური კონტროლერი მობილურისთვის", author: "Giorgi", replies: 5, views: 67, lastReplyAgo: "2 დღის წინ" },
  ],
  feedback: [
    { slug: "pwa-mobile", title: "მინდა PWA ვერსია მობილურისთვის", author: "Tamo", replies: 3, views: 41, lastReplyAgo: "გუშინ" },
  ],
};

export type MockChatChannel = { id: string; name: string; type: "global" | "game" | "lfg"; unread?: number };

export const mockChatChannels: MockChatChannel[] = [
  { id: "global", name: "# global", type: "global", unread: 3 },
  { id: "efootball", name: "# eFootball", type: "game" },
  { id: "fifa", name: "# FIFA Mobile", type: "game", unread: 1 },
  { id: "pubg", name: "# PUBG", type: "game", unread: 12 },
  { id: "warzone", name: "# Warzone", type: "game" },
  { id: "valorant", name: "# Valorant", type: "game" },
  { id: "lfg-pubg-1", name: "LFG: Squad Erangel", type: "lfg" },
];

export type MockChatMessage = { id: string; author: string; body: string; ago: string; isMe?: boolean };

export const mockChatMessages: Record<string, MockChatMessage[]> = {
  global: [
    { id: "g1", author: "Admin", body: "კეთილი იყოს თქვენი მობრძანება Gameroom ჩათში 👋", ago: "10:12" },
    { id: "g2", author: "GeoSniper", body: "Hi all — Erangel ranked-ზე ვინ მოვა?", ago: "10:15" },
    { id: "g3", author: "Lasha10", body: "@GeoSniper გავიდე FIFA-ში, მერე მოვალ", ago: "10:18" },
    { id: "g4", author: "Sage_Tbilisi", body: "Valorant Premier-ის რეგისტრაცია ხვალ იხსნება — @Lika @Giorgi თქვენც?", ago: "10:23" },
    { id: "g5", author: "ZeroKD", body: "კარგი თუ ცუდია ახალი Warzone-ის სეზონი? 🤔", ago: "10:25" },
  ],
  efootball: [
    { id: "e1", author: "Lasha10", body: "Co-op event-ისთვის ვინ მოვა?", ago: "11:02" },
    { id: "e2", author: "El_Pippo", body: "@Lasha10 მე! Top 100-ში გასვლა მინდა", ago: "11:04" },
    { id: "e3", author: "Beka", body: "v4.0 უკეთესია matchmaking-ით 🔥", ago: "11:10" },
  ],
  fifa: [
    { id: "f1", author: "El_Pippo", body: "VS Attack კოოპერატივი ვინს უნდა?", ago: "12:30" },
    { id: "f2", author: "Nika", body: "Div 1-ში ვარ, +1", ago: "12:33" },
  ],
  pubg: [
    { id: "p1", author: "GeoSniper", body: "Squad Erangel — Crown+ მოთამაშეები ვეძებ", ago: "09:45" },
    { id: "p2", author: "ZeroKD", body: "Resurgence უფრო მიყვარს, ვინმე მოდის?", ago: "09:51" },
    { id: "p3", author: "Saba", body: "@GeoSniper 90fps მუშაობს iPhone 15 Pro-ზე ულტრაზე 🎯", ago: "10:02" },
    { id: "p4", author: "Vakho", body: "@Saba ვიდეო ჩაიდე? Discord-ში გადავიდეთ?", ago: "10:05" },
  ],
  warzone: [
    { id: "w1", author: "ZeroKD", body: "Resurgence trio — chill მატჩები ღამე 22:00-დან", ago: "20:12" },
    { id: "w2", author: "Tamo", body: "მე და მეგობარი მოვალთ", ago: "20:18" },
  ],
  valorant: [
    { id: "v1", author: "Sage_Tbilisi", body: "Premier team — IGL ვეძებ Diamond+", ago: "18:00" },
    { id: "v2", author: "Lika", body: "Sage one-trick ვარ, თუ მოგწონს მოვალ", ago: "18:07" },
    { id: "v3", author: "Giorgi", body: "ხვალ რეგისტრაცია იხსნება", ago: "18:21" },
  ],
  "lfg-pubg-1": [
    { id: "l1", author: "GeoSniper", body: "Squad Erangel — voice ON. დანარჩენ 1 ადგილზე ვინ?", ago: "12:00" },
    { id: "l2", author: "Nika", body: "მე მოვალ — Crown II", ago: "12:02" },
  ],
};

export const channelDescriptions: Record<string, string> = {
  global: "ერთიანი ქართული გეიმერების ჩათი",
  efootball: "eFootball Mobile — team-up, ფასიდბექი, ცვლილებები",
  fifa: "FIFA Mobile — VS Attack, H2H, ივენთები",
  pubg: "PUBG Mobile — squad, duo, TDM",
  warzone: "Call of Duty Warzone — BR + Resurgence",
  valorant: "Valorant — Premier, Competitive, Unrated",
  "lfg-pubg-1": "LFG: Squad Erangel ranked — Crown II+ მოთამაშეებისთვის",
};
