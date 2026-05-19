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
    description: "BR + Resurgence — სქვადი 4 კაცამდე, ცოცხალი ლობები.",
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
  { id: "lfg-pubg-1", name: "LFG: Squad Erangel", type: "lfg", gameSlug: "pubg-battlegrounds" },
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
  systemReqs: { min: SysReqRow; rec: SysReqRow };
  trending?: boolean;
};

export const crackedGames: CrackedGame[] = [
  {
    id: "elden-ring",
    title: "Elden Ring",
    genre: ["RPG", "Action"],
    platform: ["PC", "PS5", "Xbox"],
    rating: 9.6,
    accent: "from-amber-500/30 to-amber-500/5",
    emoji: "⚔️",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
    releaseYear: 2022,
    description: "FromSoftware-ის შედევრი — ღია სამყარო, brutal boss ბრძოლები, George R.R. Martin-ის ნარატივი. Limgrave-ის ველებიდან Leyndell-ის სიმაღლეებამდე, ყოველი ბრძოლა გამოცდილებაა.",
    downloadUrl: "#",
    trending: true,
    systemReqs: {
      min: { os: "Windows 10/11 64-bit", cpu: "Intel i5-8400 / AMD Ryzen 3 3300X", ram: "12 GB", gpu: "NVIDIA GTX 1060 3GB / AMD RX 580 4GB", storage: "60 GB SSD" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i7-8700K / AMD Ryzen 5 3600X", ram: "16 GB", gpu: "NVIDIA GTX 1070 8GB / AMD RX Vega 56 8GB", storage: "60 GB SSD" },
    },
  },
  {
    id: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    genre: ["RPG", "Open World"],
    platform: ["PC", "PS5", "Xbox"],
    rating: 9.1,
    accent: "from-yellow-400/30 to-cyan-500/10",
    emoji: "🤖",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
    releaseYear: 2020,
    description: "Night City — კიბერნეტიკული მომავლის ქალაქი სავსე ქვემდინარეობებით, სიყვარულითა და ღალატით. V-ს ამბავი, სადაც ყოველი არჩევანი შედეგს ბადებს.",
    downloadUrl: "#",
    trending: true,
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i7-6700K / AMD Ryzen 5 1600", ram: "12 GB", gpu: "NVIDIA GTX 1060 6GB / AMD RX 580 8GB", storage: "70 GB SSD" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i7-8700K / AMD Ryzen 5 3600", ram: "16 GB", gpu: "NVIDIA RTX 2060 / AMD RX 5700 XT", storage: "70 GB SSD" },
    },
  },
  {
    id: "the-witcher-3",
    title: "The Witcher 3",
    genre: ["RPG", "Open World"],
    platform: ["PC", "PS5", "Xbox", "Switch"],
    rating: 9.7,
    accent: "from-emerald-500/25 to-emerald-500/5",
    emoji: "🧙",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
    releaseYear: 2015,
    description: "გერალტის ბოლო ეპოსი — ყველა დროის საუკეთესო RPG-ებიდან ერთ-ერთი. Ciri-ს ძიება, ორი სრული DLC და 100+ საათი კონტენტი.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i5-2500K / AMD FX-8350", ram: "8 GB", gpu: "NVIDIA GTX 770 / AMD R9 290", storage: "50 GB SSD" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i7-8700K / AMD Ryzen 5 3600X", ram: "16 GB", gpu: "NVIDIA RTX 2080S / AMD RX 6800 XT", storage: "50 GB SSD" },
    },
  },
  {
    id: "red-dead-2",
    title: "Red Dead Redemption 2",
    genre: ["Open World", "Action"],
    platform: ["PC", "PS4", "Xbox"],
    rating: 9.8,
    accent: "from-red-700/25 to-orange-500/5",
    emoji: "🤠",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
    releaseYear: 2018,
    description: "ართურ მორგანის ამბავი — Rockstar-ის ვიზუალური და ნარატიული მაგიოვრება. Dutch van der Linde-ის ბანდა, ამერიკის ველური დასავლეთი და სინდისის ფასი.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i5-2500K / AMD FX-6300", ram: "8 GB", gpu: "NVIDIA GTX 770 2GB / AMD R9 280", storage: "150 GB SSD" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel i7-4770K / AMD Ryzen 5 1500X", ram: "12 GB", gpu: "NVIDIA GTX 1060 6GB / AMD RX 480 4GB", storage: "150 GB SSD" },
    },
  },
  {
    id: "god-of-war",
    title: "God of War: Ragnarök",
    genre: ["Action", "Adventure"],
    platform: ["PS5", "PS4", "PC"],
    rating: 9.5,
    accent: "from-blue-600/25 to-blue-600/5",
    emoji: "🪓",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/header.jpg",
    releaseYear: 2022,
    description: "კრატოსი და ატრეუსი Norse სამყაროს ბედს გადაწყვეტენ — ემოციური masterpiece. Fimbulwinter, ცხრა სამეფო და მამა-შვილის ურთიერთობის კულმინაცია.",
    downloadUrl: "#",
    trending: true,
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i5-6600K / AMD Ryzen 5 2600X", ram: "8 GB", gpu: "NVIDIA GTX 1060 6GB / AMD RX 5500 XT 8GB", storage: "70 GB SSD" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i9-9900K / AMD Ryzen 9 3900X", ram: "16 GB", gpu: "NVIDIA RTX 3080 / AMD RX 6800 XT", storage: "70 GB SSD" },
    },
  },
  {
    id: "minecraft",
    title: "Minecraft",
    genre: ["Sandbox", "Survival"],
    platform: ["PC", "Mobile", "PS4", "Xbox", "Switch"],
    rating: 9.4,
    accent: "from-green-500/25 to-green-500/5",
    emoji: "⛏️",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1672970/header.jpg",
    releaseYear: 2011,
    description: "შენება, გადარჩენა, გამოკვლევა — ყველა ასაკისთვის შეუზღუდავი სამყარო. Overworld-იდან Nether-მდე, creeper-ებისგან Dragon-მდე.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel Core i3", ram: "4 GB", gpu: "Intel HD Graphics 4000 / AMD Radeon R5", storage: "1 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel Core i5", ram: "8 GB", gpu: "NVIDIA GTX 1070 / AMD RX 5700", storage: "4 GB" },
    },
  },
  {
    id: "dark-souls-3",
    title: "Dark Souls III",
    genre: ["RPG", "Action"],
    platform: ["PC", "PS4", "Xbox"],
    rating: 9.0,
    accent: "from-slate-500/25 to-slate-500/5",
    emoji: "💀",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/374320/header.jpg",
    releaseYear: 2016,
    description: "სიკვდილი — სწავლა — გამარჯვება. Soulslike ჟანრის ეტალონი. Lothric-ის სამეფო, Iudex Gundyr-იდან Soul of Cinder-მდე.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7/8/10 64-bit", cpu: "Intel i5-2300 / AMD A8-3870", ram: "8 GB", gpu: "NVIDIA GTX 750 Ti / AMD R9 270", storage: "25 GB" },
      rec: { os: "Windows 7/8/10 64-bit", cpu: "Intel i7-3770 / AMD FX-8350", ram: "8 GB", gpu: "NVIDIA GTX 970 / AMD R9 390X", storage: "25 GB" },
    },
  },
  {
    id: "rocket-league",
    title: "Rocket League",
    genre: ["Sports", "Racing"],
    platform: ["PC", "PS4", "Xbox", "Switch"],
    rating: 8.9,
    accent: "from-orange-500/25 to-pink-500/10",
    emoji: "🚗",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
    releaseYear: 2015,
    description: "ფეხბურთი მანქანებით — ადვილი სასწავლი, ძნელი დასაუფლებელი. Bronze-იდან SSL-მდე მიგზავნია უსასრულო სწავლება.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7+ 64-bit", cpu: "Intel i5-2300", ram: "4 GB", gpu: "NVIDIA GTX 760 / AMD R9 270X", storage: "20 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel i7-4770K", ram: "16 GB", gpu: "NVIDIA GTX 1070 / AMD RX 480", storage: "20 GB" },
    },
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    genre: ["Metroidvania", "Action"],
    platform: ["PC", "PS4", "Xbox", "Switch"],
    rating: 9.3,
    accent: "from-indigo-600/25 to-indigo-600/5",
    emoji: "🦋",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg",
    releaseYear: 2017,
    description: "მიწისქვეშა სამეფო, ღრმა ლორი და პერფექტული კონტროლი — indie-ს გვირგვინი. Hallownest-ის სიღრმეებში 40+ საათი შესაძლებელი სამოგზაუროდ.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7 64-bit", cpu: "Intel Core i5", ram: "4 GB", gpu: "NVIDIA GTX 960 / AMD RX 470", storage: "9 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel Core i7", ram: "8 GB", gpu: "NVIDIA GTX 1060 / AMD RX 580", storage: "9 GB" },
    },
  },
  {
    id: "stardew-valley",
    title: "Stardew Valley",
    genre: ["Simulation", "RPG"],
    platform: ["PC", "Mobile", "PS4", "Xbox", "Switch"],
    rating: 9.2,
    accent: "from-lime-500/25 to-lime-500/5",
    emoji: "🌾",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg",
    releaseYear: 2016,
    description: "ფერმა, სოფელი, სიყვარული — ერთი ადამიანის მიერ შექმნილი სრულყოფილი სამყარო. Pelican Town-ის მაცხოვრებლები, ოთხი სეზონი და endless replayability.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows Vista 64-bit", cpu: "2.0 GHz", ram: "2 GB", gpu: "256 MB Video RAM", storage: "500 MB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel i5-2500K", ram: "4 GB", gpu: "NVIDIA GTX 750 Ti", storage: "500 MB" },
    },
  },
  {
    id: "apex-legends",
    title: "Apex Legends",
    genre: ["Battle Royale", "FPS"],
    platform: ["PC", "PS4", "Xbox", "Mobile"],
    rating: 8.7,
    accent: "from-red-500/25 to-red-500/5",
    emoji: "🎯",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg",
    releaseYear: 2019,
    description: "Legend abilities + fast movement + team synergy — battle royale-ის evolution. 25+ legend, Kings Canyon-იდან Broken Moon-მდე.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i3-6300 / AMD FX-4350", ram: "6 GB", gpu: "AMD R9 290 / NVIDIA GTX 970", storage: "56 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel i5-8600K / AMD Ryzen 5 5600X", ram: "8 GB", gpu: "NVIDIA RTX 2070 / AMD RX 5700", storage: "56 GB SSD" },
    },
  },
  {
    id: "hades",
    title: "Hades",
    genre: ["Roguelike", "Action"],
    platform: ["PC", "PS4", "Xbox", "Switch", "Mobile"],
    rating: 9.5,
    accent: "from-fuchsia-600/25 to-fuchsia-600/5",
    emoji: "🔱",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
    releaseYear: 2020,
    description: "ქვესკნელიდან გაქცევა — ყოველი სიკვდილი ახალ სიუჟეტს ხსნის. Zagreus-ის მამისგან გაქცევის მცდელობები, ოლიმპოს ღმერთებთან ურთიერთობა.",
    downloadUrl: "#",
    trending: true,
    systemReqs: {
      min: { os: "Windows 7+ 64-bit", cpu: "Dual Core 2.4 GHz", ram: "8 GB", gpu: "NVIDIA GTX 480 / AMD HD 7950", storage: "15 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Quad Core 3.0 GHz", ram: "16 GB", gpu: "NVIDIA GTX 780 / AMD R9 290X", storage: "15 GB" },
    },
  },
  {
    id: "league-of-legends",
    title: "League of Legends",
    genre: ["MOBA", "Strategy"],
    platform: ["PC"],
    rating: 8.5,
    accent: "from-blue-500/25 to-blue-500/5",
    emoji: "🏆",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/900/header.jpg",
    releaseYear: 2009,
    description: "დუნიის ყველაზე პოპულარული MOBA — 165+ champion, endless meta. 5v5 Summoner's Rift-ზე ნებისმიერი ranked სეზონი.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7+ 64-bit", cpu: "Intel i5-3300", ram: "4 GB", gpu: "NVIDIA GeForce 560 / AMD Radeon HD 6950", storage: "16 GB" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i5-3300 / AMD Ryzen 5", ram: "8 GB", gpu: "NVIDIA GeForce 560 / AMD Radeon HD 6950", storage: "16 GB" },
    },
  },
  {
    id: "disco-elysium",
    title: "Disco Elysium",
    genre: ["RPG", "Adventure"],
    platform: ["PC", "PS4", "Xbox"],
    rating: 9.6,
    accent: "from-violet-600/25 to-violet-600/5",
    emoji: "🕵️",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/632470/header.jpg",
    releaseYear: 2019,
    description: "ამნეზიაში ჩავარდნილი დეტექტივი — ყველა დროის ყველაზე literary RPG. Revachol-ის ქუჩები, პოლიტიკა, სიყვარული და ალკოჰოლი.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7 64-bit", cpu: "Intel i5-2500K", ram: "8 GB", gpu: "NVIDIA GTX 1050 / AMD RX 460", storage: "20 GB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel i5-7600K", ram: "16 GB", gpu: "NVIDIA GTX 1060 / AMD RX 580", storage: "20 GB" },
    },
  },
  {
    id: "among-us",
    title: "Among Us",
    genre: ["Social Deduction", "Party"],
    platform: ["PC", "Mobile", "Switch"],
    rating: 7.8,
    accent: "from-cyan-500/25 to-cyan-500/5",
    emoji: "🔴",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/header.jpg",
    releaseYear: 2018,
    description: "ნდობა, ეჭვი, ღალატი — სოციალური ფსიქოლოგიის სათამაშო ვერსია. Crewmate vs Impostor, 4-15 მოთამაშე.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 7 SP1+", cpu: "Intel 2.0 GHz", ram: "1 GB", gpu: "Intel HD Graphics 3000", storage: "250 MB" },
      rec: { os: "Windows 10 64-bit", cpu: "Intel 2.0 GHz", ram: "2 GB", gpu: "Intel HD Graphics 4000", storage: "250 MB" },
    },
  },
  {
    id: "overwatch-2",
    title: "Overwatch 2",
    genre: ["FPS", "Hero Shooter"],
    platform: ["PC", "PS4", "Xbox", "Switch"],
    rating: 7.5,
    accent: "from-orange-400/25 to-orange-400/5",
    emoji: "🦸",
    coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg",
    releaseYear: 2022,
    description: "40+ hero, dynamic team compositions — competitive hero shooter. 5v5 formati, Push, Flashpoint და კლასიკური Payload რეჟიმები.",
    downloadUrl: "#",
    systemReqs: {
      min: { os: "Windows 10 64-bit", cpu: "Intel i5-6600K / AMD Ryzen 5 1600", ram: "8 GB", gpu: "NVIDIA GTX 1060 6GB / AMD RX 6400", storage: "50 GB SSD" },
      rec: { os: "Windows 10/11 64-bit", cpu: "Intel i7-8700K / AMD Ryzen 5 5600X", ram: "16 GB", gpu: "NVIDIA RTX 3080 / AMD RX 6600 XT", storage: "50 GB SSD" },
    },
  },
];

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
  "lfg-pubg-1": "LFG: Squad Erangel ranked — Crown II+ მოთამაშეებისთვის",
};
