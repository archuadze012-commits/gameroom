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
  iconUrl?: string;
  invertIcon?: boolean;
  coverUrl?: string;
  players: number;
  online: number;
  liveLfg: number;
  favoritedBy: number;
};

export const mockGames: MockGame[] = [
  {
    slug: "efootball",
    nameKa: "eFootball",
    nameEn: "eFootball",
    description: "Konami-ის უფასო ფეხბურთის სიმულატორი — Online Match, Dream Team და კოოპერატიული რეჟიმები.",
    accent: "from-green-500/30 to-green-500/5",
    emoji: "⚽",
    iconUrl: "/games/efootball.png",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1665460/header.jpg",
    players: 1920,
    online: 310,
    liveLfg: 28,
    favoritedBy: 94,
  },
  {
    slug: "pubg-mobile",
    nameKa: "PUBG Mobile",
    nameEn: "PUBG: Battlegrounds Mobile",
    description: "Squad, Duo, TDM — ბრძოლა გადარჩენისთვის 100 მოთამაშეში.",
    accent: "from-amber-500/30 to-amber-500/5",
    emoji: "🎯",
    iconUrl: "/games/pubg-mobile.png",
    coverUrl: "/games/covers/pubg-mobile.png",
    players: 2156,
    online: 348,
    liveLfg: 48,
    favoritedBy: 143,
  },
  {
    slug: "pubg-battlegrounds",
    nameKa: "PUBG: Battlegrounds",
    nameEn: "PUBG: Battlegrounds",
    description: "PC ვერსია — Ranked, Casual და Custom მატჩები Erangel-ზე და სხვა რუკებზე.",
    accent: "from-yellow-500/30 to-yellow-500/5",
    emoji: "🪖",
    iconUrl: "/games/pubg-battlegrounds.png",
    invertIcon: true,
    coverUrl: "/games/covers/pubg-battlegrounds.png",
    players: 1843,
    online: 271,
    liveLfg: 35,
    favoritedBy: 108,
  },
  {
    slug: "cs2",
    nameKa: "CS2",
    nameEn: "CS2",
    description: "Valve-ის ტაქტიკური შუტერი — Competitive, Premier და Wingman რეჟიმები.",
    accent: "from-orange-500/30 to-orange-500/5",
    emoji: "💣",
    iconUrl: "/games/cs2.png",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
    players: 3241,
    online: 512,
    liveLfg: 62,
    favoritedBy: 187,
  },
  {
    slug: "eafc26",
    nameKa: "EA FC 26",
    nameEn: "EA Sports FC 26",
    description: "EA Sports-ის ფეხბურთის სიმულატორი — Ultimate Team, Career და Pro Clubs.",
    accent: "from-blue-500/30 to-blue-500/5",
    emoji: "⚽",
    iconUrl: "/games/eafc26.png",
    coverUrl: "/games/covers/eafc26.png",
    players: 1105,
    online: 143,
    liveLfg: 21,
    favoritedBy: 52,
  },
  {
    slug: "efootball-mobile",
    nameKa: "eFootball Mobile",
    nameEn: "eFootball Mobile",
    description: "Konami-ის მობილური ფეხბურთის სიმულატორი — 1v1 და გუნდური მატჩები.",
    accent: "from-emerald-500/30 to-emerald-500/5",
    emoji: "🏟️",
    iconUrl: "/games/efootball-mobile.png",
    coverUrl: "/games/covers/efootball-mobile.png",
    players: 1284,
    online: 187,
    liveLfg: 23,
    favoritedBy: 67,
  },
  {
    slug: "warzone",
    nameKa: "COD: Warzone",
    nameEn: "Call of Duty: Warzone",
    description: "BR + Resurgence — სქვადი 4 კაცამდე, LIVE ლობები.",
    accent: "from-red-500/30 to-red-500/5",
    emoji: "🔫",
    iconUrl: "/games/warzone.png",
    coverUrl: "/games/covers/warzone.png",
    players: 1573,
    online: 224,
    liveLfg: 31,
    favoritedBy: 81,
  },
  {
    slug: "gta-v",
    nameKa: "GTA V",
    nameEn: "Grand Theft Auto V",
    description: "GTA Online — Heists, Races, Freemode და Role-play სერვერები.",
    accent: "from-green-500/30 to-green-500/5",
    emoji: "🚗",
    iconUrl: "/games/gta-v.webp",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg",
    players: 2890,
    online: 431,
    liveLfg: 44,
    favoritedBy: 156,
  },
  {
    slug: "rdr2",
    nameKa: "Red Dead Redemption 2",
    nameEn: "Red Dead Redemption 2",
    description: "RDO — Posses, Bounty Hunting და Free Roam ივენთები.",
    accent: "from-rose-800/30 to-rose-800/5",
    emoji: "🤠",
    iconUrl: "/games/rdr2.png",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
    players: 642,
    online: 74,
    liveLfg: 9,
    favoritedBy: 23,
  },
  {
    slug: "valorant",
    nameKa: "Valorant",
    nameEn: "Valorant",
    description: "ტაქტიკური 5v5 შუტერი — Competitive, Premier, Unrated.",
    accent: "from-fuchsia-500/30 to-fuchsia-500/5",
    emoji: "🎮",
    iconUrl: "/games/valorant.png",
    coverUrl: "/games/covers/valorant.png",
    players: 1812,
    online: 263,
    liveLfg: 39,
    favoritedBy: 119,
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

export type MockUser = {
  username: string;
  displayName: string;
  region: string;
  games: { slug: string; rank: string }[];
  mainGameSlug?: string;
  voiceChat: boolean;
  bio?: string;
  role?: "admin" | "moderator" | "organizer" | "streamer" | "esports";
};

export const mockUsers: MockUser[] = [
  {
    username: "leonsio12",
    displayName: "LEO",
    region: "GE",
    games: [
      { slug: "pubg-mobile", rank: "Conqueror" },
      { slug: "cs2", rank: "Global Elite" },
      { slug: "valorant", rank: "Radiant" },
    ],
    mainGameSlug: "pubg-mobile",
    voiceChat: true,
    bio: "Gameroom-ის დამაარსებელი და მთავარი ადმინი.",
    role: "admin",
  },
];

export type MockChatChannel = { id: string; name: string; type: "global" | "game" | "lfg" | "market" | "tech"; unread?: number; gameSlug?: string };

export const mockChatChannels: MockChatChannel[] = [
  { id: "global", name: "საერთო", type: "global", unread: 3 },
  { id: "acc-market", name: "ACC ყიდვა-გაყიდვა", type: "market" },
  { id: "tech-market", name: "TECH ყიდვა-გაყიდვა", type: "tech" },
  { id: "efootball", name: "eFootball", type: "game", gameSlug: "efootball" },
  { id: "efootball-mobile", name: "eFootball Mobile", type: "game", gameSlug: "efootball-mobile" },
  { id: "fifa", name: "FIFA Mobile", type: "game", unread: 1, gameSlug: "eafc26" },
  { id: "eafc26", name: "EA FC 26", type: "game", gameSlug: "eafc26" },
  { id: "pubg", name: "PUBG Mobile", type: "game", unread: 12, gameSlug: "pubg-mobile" },
  { id: "pubg-battlegrounds", name: "PUBG Battlegrounds", type: "game", gameSlug: "pubg-battlegrounds" },
  { id: "cs2", name: "CS2", type: "game", gameSlug: "cs2" },
  { id: "gta-v", name: "GTA V", type: "game", gameSlug: "gta-v" },
  { id: "warzone", name: "Warzone", type: "game", gameSlug: "warzone" },
  { id: "valorant", name: "Valorant", type: "game", gameSlug: "valorant" },
  { id: "lfg-pubg-1", name: "ლოკალი: Squad Erangel", type: "lfg", gameSlug: "pubg-battlegrounds" },
];

export type MockChatMessage = { id: string; author: string; body: string; ago: string; isMe?: boolean };

type SysReqRow = { os: string; cpu: string; ram: string; gpu: string; storage: string };

export type CrackedGame = {
  id: string;
  title: string;
  genre: string[];
  platform: string[];
  rating: number;
  accent: string;
  emoji: string;
  coverUrl?: string;
  releaseYear: number;
  description: string;
  downloadUrl: string;
  gameplayUrl?: string;
  systemReqs: { min: SysReqRow; rec: SysReqRow };
  trending?: boolean;
  metacriticScore?: number;
};

export const crackedGames: CrackedGame[] = [];



export type MockFeedPost = {
  id: string;
  authorName: string;
  authorDisplay: string;
  content: string;
  createdAgo: string;
  likes: number;
  comments: number;
};

export const mockFeedPosts: MockFeedPost[] = [
  {
    id: "fp1",
    authorName: "leonsio12",
    authorDisplay: "LEO",
    content: "PUBG Mobile-ში დღეს ყველაზე კარგი სეზონი მქონდა — Conqueror-ი მივაღწიე! 🏆 ეს მომენტი ვერ ივიწყება.",
    createdAgo: "1 სთ წინ",
    likes: 47,
    comments: 12,
  },
  {
    id: "fp2",
    authorName: "leonsio12",
    authorDisplay: "LEO",
    content: "ახალი სტრიმი დღეს 21:00-ზე — CS2 ranked. ვინც მოვა, ვთამაშობთ squad-ებში. 🎮",
    createdAgo: "5 სთ წინ",
    likes: 83,
    comments: 31,
  },
  {
    id: "fp3",
    authorName: "leonsio12",
    authorDisplay: "LEO",
    content: "Valorant-ის ახალი მეტა სრულიად შეიცვალა პატჩის შემდეგ. Gekko ბევრად უფრო ძლიერია ახლა — იცდი?",
    createdAgo: "2 დღის წინ",
    likes: 29,
    comments: 8,
  },
];

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
  "lfg-pubg-1": "ლოკალი: Squad Erangel ranked — Crown II+ მოთამაშეებისთვის",
};
