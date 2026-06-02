import {
  pgTable,
  pgSchema,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Reference to Supabase auth schema commented out for standalone Postgres
// const authSchema = pgSchema("auth");
// export const authUsers = authSchema.table("users", {
//   id: uuid("id").primaryKey(),
// });

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "organizer",
  "streamer",
  "esports",
  "admin",
]);
export const lfgStatusEnum = pgEnum("lfg_status", ["open", "filled", "closed"]);
export const lfgResponseStatusEnum = pgEnum("lfg_response_status", [
  "pending",
  "accepted",
  "rejected",
]);
export const tournamentFormatEnum = pgEnum("tournament_format", [
  "single_elim",
  "double_elim",
  "round_robin",
]);
export const tournamentStatusEnum = pgEnum("tournament_status", [
  "draft",
  "open",
  "checkin",
  "live",
  "completed",
  "cancelled",
]);
export const matchStatusEnum = pgEnum("match_status", [
  "pending",
  "ready",
  "live",
  "reported",
  "confirmed",
  "disputed",
]);
export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "published",
  "archived",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "lfg_response",
  "lfg_accepted",
  "forum_reply",
  "news_comment",
  "tournament_checkin",
  "tournament_match",
  "system",
]);
export const walletTxTypeEnum = pgEnum("wallet_tx_type", [
  "daily_bonus",
  "admin_grant",
  "event_reward",
  "spend",
  "refund",
]);
export const clanRoleEnum = pgEnum("clan_role", ["leader", "officer", "member"]);
export const clanStatusEnum = pgEnum("clan_status", ["open", "invite_only", "closed"]);
export const clanRequestStatusEnum = pgEnum("clan_request_status", ["pending", "accepted", "rejected"]);

// ---------- Profiles ----------

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 64 }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    region: varchar("region", { length: 32 }),
    voiceChat: boolean("voice_chat").default(false).notNull(),
    availableHours: jsonb("available_hours"),
    role: userRoleEnum("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    // --- Extended profile fields (used via PostgREST / settings form) ---
    bannerUrl: text("banner_url"),
    favoriteGameSlugs: text("favorite_game_slugs").array().default(sql`'{}'`),
    mainGameSlug: varchar("main_game_slug", { length: 64 }),
    youtubeHandle: varchar("youtube_handle", { length: 64 }),
    tiktokHandle: varchar("tiktok_handle", { length: 64 }),
    tiktokFollowers: varchar("tiktok_followers", { length: 32 }),
    inGameName: varchar("in_game_name", { length: 64 }),
    isVerified: boolean("is_verified").default(false).notNull(),
    emoji: varchar("emoji", { length: 8 }),
    // --- Gamification ---
    xp: integer("xp").default(0).notNull(),
    level: integer("level").default(1).notNull(),
    lastXpAt: timestamp("last_xp_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastLoginAwardAt: text("last_login_award_at"), // date stored as text (yyyy-mm-dd)
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("profiles_username_unique").on(sql`lower(${t.username})`) ]
);

// ---------- Social & Feed ----------

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    mediaUrls: text("media_urls").array().default(sql`'{}'`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("posts_author_id_idx").on(t.authorId),
    index("posts_created_at_idx").on(t.createdAt),
  ]
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })]
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("post_comments_post_id_idx").on(t.postId)]
);

export const postReactions = pgTable(
  "post_reactions",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId, t.emoji] })]
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_follower_idx").on(t.followerId),
    index("follows_following_idx").on(t.followingId),
  ]
);

// ---------- Messaging ----------

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userA: uuid("user_a")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    userB: uuid("user_b")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("conversations_user_a_user_b_key").on(t.userA, t.userB),
    index("conversations_user_a_idx").on(t.userA, t.lastMessageAt),
    index("conversations_user_b_idx").on(t.userB, t.lastMessageAt),
  ]
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("conversation_messages_conv_idx").on(t.conversationId, t.createdAt),
  ]
);

// ---------- Economy & Shop ----------

export const wallets = pgTable("wallets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  ncBalance: integer("nc_balance").default(0).notNull(),
  proBalance: integer("pro_balance").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  currency: text("currency").notNull(), // 'nc' or 'pro'
  amount: integer("amount").notNull(),
  type: walletTxTypeEnum("type").notNull(),
  note: text("note"),
  grantedBy: uuid("granted_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shopItems = pgTable(
  "shop_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    imageUrl: text("image_url"),
    costCurrency: text("cost_currency").notNull(),
    costAmount: integer("cost_amount").notNull(),
    tier: text("tier").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    gameSlug: text("game_slug"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("shop_items_category_idx").on(t.category, t.sortOrder),
    index("shop_items_game_idx").on(t.gameSlug),
  ]
);

export const shopProducts = pgTable(
  "shop_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 140 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
    category: varchar("category", { length: 80 }).default("general").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    status: varchar("status", { length: 24 }).default("in_stock").notNull(),
    stock: integer("stock"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("shop_products_active_idx").on(t.createdAt).where(sql`${t.isActive} = true`),
    index("shop_products_category_idx").on(t.category, t.isActive),
  ]
);

export const eventBoxes = pgTable("event_boxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  costCurrency: text("cost_currency").notNull(),
  costAmount: integer("cost_amount").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const boxItems = pgTable(
  "box_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => eventBoxes.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    itemType: text("item_type").notNull(),
    imageUrl: text("image_url"),
    tier: text("tier").notNull(),
    weight: integer("weight").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("box_items_box_idx").on(t.boxId)]
);

export const userInventory = pgTable(
  "user_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => boxItems.id),
    boxId: uuid("box_id").references(() => eventBoxes.id),
    obtainedAt: timestamp("obtained_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("user_inventory_user_idx").on(t.userId, t.obtainedAt)]
);

export const userPurchases = pgTable(
  "user_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => shopItems.id),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("user_purchases_user_id_item_id_key").on(t.userId, t.itemId),
    index("user_purchases_user_idx").on(t.userId),
  ]
);

export const userEquipped = pgTable(
  "user_equipped",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => shopItems.id),
    equippedAt: timestamp("equipped_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })]
);

export const userLobbyLoadouts = pgTable(
  "user_lobby_loadouts",
  {
    userId: uuid("user_id").notNull(),
    gameSlug: text("game_slug").notNull(),
    loadout: jsonb("loadout").default({}).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameSlug] })]
);

// ---------- Games ----------

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    nameKa: varchar("name_ka", { length: 128 }).notNull(),
    nameEn: varchar("name_en", { length: 128 }).notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    accentColor: varchar("accent_color", { length: 16 }),
    emoji: varchar("emoji", { length: 8 }),
    active: boolean("active").default(true).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("games_active_idx").on(t.active)]
);

export const userGameProfiles = pgTable(
  "user_game_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    inGameId: varchar("in_game_id", { length: 64 }),
    rank: varchar("rank", { length: 32 }),
    position: varchar("position", { length: 32 }),
    playstyle: varchar("playstyle", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("user_game_unique").on(t.userId, t.gameId),
    index("user_game_user_idx").on(t.userId),
  ]
);

// ---------- LFG ----------

export const lfgPosts = pgTable(
  "lfg_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 140 }).notNull(),
    description: text("description"),
    rankMin: varchar("rank_min", { length: 32 }),
    rankMax: varchar("rank_max", { length: 32 }),
    region: varchar("region", { length: 32 }),
    slotsTotal: integer("slots_total").default(1).notNull(),
    slotsFilled: integer("slots_filled").default(0).notNull(),
    voiceRequired: boolean("voice_required").default(false).notNull(),
    status: lfgStatusEnum("status").default("open").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // --- PostgREST-used columns (not in original schema but exist in DB) ---
    gameSlug: varchar("game_slug", { length: 64 }),
    mode: varchar("mode", { length: 64 }),
    rank: varchar("rank", { length: 64 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lfg_status_idx").on(t.status, t.createdAt),
    index("lfg_game_idx").on(t.gameId),
  ]
);

export const lfgResponses = pgTable(
  "lfg_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => lfgPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    message: text("message"),
    status: lfgResponseStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("lfg_response_unique").on(t.postId, t.userId),
    index("lfg_response_post_idx").on(t.postId),
  ]
);

export const lfgComments = pgTable(
  "lfg_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => lfgPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("lfg_comments_post_idx").on(t.postId, t.createdAt)]
);

// ---------- Forum ----------

export const forumCategories = pgTable("forum_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => forumCategories.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    locked: boolean("locked").default(false).notNull(),
    views: integer("views").default(0).notNull(),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("forum_thread_slug_unique").on(t.categoryId, t.slug),
    index("forum_thread_category_idx").on(t.categoryId, t.lastReplyAt),
  ]
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    parentPostId: uuid("parent_post_id"),
    body: text("body").notNull(),
    edited: boolean("edited").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("forum_post_thread_idx").on(t.threadId, t.createdAt)]
);

export const forumLikes = pgTable(
  "forum_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })]
);

// ---------- News ----------

export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    coverUrl: text("cover_url"),
    excerpt: text("excerpt"),
    body: text("body").notNull(),
    status: articleStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("news_published_idx").on(t.status, t.publishedAt)]
);

export const newsComments = pgTable("news_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => newsArticles.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- Tournaments ----------

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    description: text("description"),
    bannerUrl: text("banner_url"),
    format: tournamentFormatEnum("format").default("single_elim").notNull(),
    maxParticipants: integer("max_participants").default(8).notNull(),
    prizePool: text("prize_pool"),
    rules: text("rules"),
    registrationOpensAt: timestamp("registration_opens_at", {
      withTimezone: true,
    }),
    registrationClosesAt: timestamp("registration_closes_at", {
      withTimezone: true,
    }),
    checkinOpensAt: timestamp("checkin_opens_at", { withTimezone: true }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    status: tournamentStatusEnum("status").default("draft").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    winnerId: uuid("winner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("tournament_game_status_idx").on(t.gameId, t.status)]
);

export const tournamentParticipants = pgTable(
  "tournament_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    teamName: varchar("team_name", { length: 64 }),
    seed: integer("seed"),
    checkedIn: boolean("checked_in").default(false).notNull(),
    eliminatedAt: timestamp("eliminated_at", { withTimezone: true }),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("tournament_participant_unique").on(t.tournamentId, t.userId),
    index("tournament_participant_idx").on(t.tournamentId),
  ]
);

export const tournamentMatches = pgTable(
  "tournament_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    position: integer("position").notNull(),
    player1Id: uuid("player1_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    player2Id: uuid("player2_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    score1: integer("score1"),
    score2: integer("score2"),
    winnerId: uuid("winner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    nextMatchId: uuid("next_match_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: matchStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("tournament_match_unique").on(
      t.tournamentId,
      t.round,
      t.position
    ),
  ]
);

// ---------- Notifications ----------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)]
);

// ---------- Admin & Moderation ----------

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // 'message', 'post', 'profile'
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").default("open").notNull(), // 'open', 'dismissed', 'actioned'
    resolvedBy: uuid("resolved_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt)]
);

export const blockedWords = pgTable("blocked_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  word: text("word").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userMutes = pgTable(
  "user_mutes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    channelId: text("channel_id"),
    reason: text("reason"),
    mutedBy: uuid("muted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("user_mutes_user_idx").on(t.userId)]
);

export const adminActions = pgTable(
  "admin_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("admin_actions_created_idx").on(t.createdAt),
    index("admin_actions_actor_idx").on(t.actorId),
  ]
);

export const featuredContent = pgTable("featured_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureType: text("feature_type").notNull(), // 'tournament', 'profile', 'game'
  targetId: text("target_id").notNull(),
  position: integer("position").default(0),
  active: boolean("active").default(true),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pinnedContent = pgTable(
  "pinned_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentType: text("content_type").notNull(), // 'post', 'news'
    contentId: text("content_id").notNull(),
    pinnedBy: uuid("pinned_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("pinned_content_unique").on(t.contentType, t.contentId),
  ]
);

export const moderationQueue = pgTable(
  "moderation_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentType: text("content_type").notNull(), // 'post', 'message', 'lfg'
    contentId: text("content_id").notNull(),
    contentSnapshot: text("content_snapshot").notNull(),
    authorId: uuid("author_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    aiScore: numeric("ai_score"),
    aiReason: text("ai_reason"),
    status: text("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
    resolvedBy: uuid("resolved_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("moderation_queue_status_idx").on(t.status, t.createdAt)]
);

// ---------- Other Features ----------

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: text("channel_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("chat_messages_channel_idx").on(t.channelId, t.createdAt)]
);

export const gameRooms = pgTable(
  "game_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomCode: varchar("room_code", { length: 255 }).notNull().unique(),
    gameSlug: text("game_slug").notNull(),
    mode: text("mode").default("classic").notNull(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    map: text("map"),
    perspective: text("perspective").default("TPP").notNull(),
    maxPlayers: integer("max_players").default(100).notNull(),
    currentPlayers: integer("current_players").default(1).notNull(),
    isPrivate: boolean("is_private").default(false).notNull(),
    password: text("password"),
    notes: text("notes"),
    status: text("status").default("open").notNull(), // 'open', 'full', 'closed'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("idx_game_rooms_game_status_created").on(
      t.gameSlug,
      t.status,
      t.createdAt
    ),
  ]
);

export const roomChatMessages = pgTable(
  "room_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_room_chat_messages_room_created").on(t.roomId, t.createdAt)]
);

export const badgeUnlocks = pgTable(
  "badge_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeCode: text("badge_code").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("badge_unlocks_user_badge_unique").on(t.userId, t.badgeCode),
    index("badge_unlocks_user_idx").on(t.userId),
  ]
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("push_subs_user_endpoint_unique").on(t.userId, t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ]
);

// ---------- Daily Challenges ----------

export const dailyChallenges = pgTable(
  "daily_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    challengeType: text("challenge_type").notNull().default("manual"),
    xpReward: integer("xp_reward").notNull().default(50),
    targetCount: integer("target_count").notNull().default(1),
    activeDate: text("active_date").notNull(), // YYYY-MM-DD
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("daily_challenges_date_idx").on(t.activeDate, t.isActive)]
);

export const userChallengeProgress = pgTable(
  "user_challenge_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => dailyChallenges.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    claimed: boolean("claimed").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("user_challenge_uniq").on(t.userId, t.challengeId),
    index("user_challenge_user_idx").on(t.userId),
  ]
);

export const lfgQueue = pgTable(
  "lfg_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameSlug: text("game_slug").notNull(),
    region: text("region"),
    rankFilter: text("rank_filter"),
    status: text("status").default("searching").notNull(), // 'searching', 'matched', 'expired', 'cancelled'
    matchedWith: uuid("matched_with").references(() => profiles.id, {
      onDelete: "set null",
    }),
    matchedConversationId: uuid("matched_conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" }
    ),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("lfg_queue_searching_idx").on(t.gameSlug, t.status, t.createdAt),
    index("lfg_queue_user_idx").on(t.userId, t.createdAt),
  ]
);

export const linkedAccounts = pgTable(
  "linked_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'steam', 'riot'
    externalId: text("external_id").notNull(),
    externalName: text("external_name"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("linked_accounts_user_provider_unique").on(t.userId, t.provider),
    uniqueIndex("linked_accounts_provider_external_unique").on(
      t.provider,
      t.externalId
    ),
    index("linked_accounts_user_idx").on(t.userId),
  ]
);

// ---------- Clans & Teams ----------

export const clans = pgTable("clans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  tag: varchar("tag", { length: 10 }).notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  status: clanStatusEnum("status").default("open").notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  createdBy: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clanMembers = pgTable(
  "clan_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clanId: uuid("clan_id").notNull().references(() => clans.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    role: clanRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("clan_members_clan_user_unique").on(t.clanId, t.userId),
  ]
);

export const clanRequests = pgTable(
  "clan_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clanId: uuid("clan_id").notNull().references(() => clans.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    message: text("message"),
    status: clanRequestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("clan_requests_clan_user_unique").on(t.clanId, t.userId),
  ]
);

export const crackedGames = pgTable("cracked_games", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  emoji: text("emoji").default("🎮").notNull(),
  coverUrl: text("cover_url"),
  releaseYear: integer("release_year")
    .default(sql`EXTRACT(year FROM now())`)
    .notNull(),
  rating: numeric("rating").default("0").notNull(),
  description: text("description").notNull(),
  downloadUrl: text("download_url").default("#").notNull(),
  accent: text("accent").default("from-amber-500/30 to-amber-500/5").notNull(),
  genres: text("genres").array().default(sql`'{}'`).notNull(),
  platforms: text("platforms").array().default(sql`'{}'`).notNull(),
  trending: boolean("trending").default(false).notNull(),
  systemReqs: jsonb("system_reqs").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  gameplayUrl: text("gameplay_url"),
  metacriticScore: numeric("metacritic_score"),
});

export const hiddenCrackedGames = pgTable("hidden_cracked_games", {
  id: text("id")
    .primaryKey()
    .references(() => crackedGames.id, { onDelete: "cascade" }),
  hiddenAt: timestamp("hidden_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- Relations ----------

export const profilesRelations = relations(profiles, ({ many }) => ({
  gameProfiles: many(userGameProfiles),
  lfgPosts: many(lfgPosts),
  notifications: many(notifications),
  posts: many(posts),
  followsAsFollower: many(follows, { relationName: "follower" }),
  followsAsFollowing: many(follows, { relationName: "following" }),
  wallet: many(wallets),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  userProfiles: many(userGameProfiles),
  lfgPosts: many(lfgPosts),
  tournaments: many(tournaments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(profiles, { fields: [posts.authorId], references: [profiles.id] }),
  likes: many(postLikes),
  comments: many(postComments),
  reactions: many(postReactions),
}));

export const lfgPostsRelations = relations(lfgPosts, ({ one, many }) => ({
  author: one(profiles, {
    fields: [lfgPosts.authorId],
    references: [profiles.id],
  }),
  game: one(games, { fields: [lfgPosts.gameId], references: [games.id] }),
  responses: many(lfgResponses),
  comments: many(lfgComments),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  game: one(games, { fields: [tournaments.gameId], references: [games.id] }),
  participants: many(tournamentParticipants),
  matches: many(tournamentMatches),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(conversationMessages),
}));

export const shopItemsRelations = relations(shopItems, ({ many }) => ({
  purchases: many(userPurchases),
  equippedBy: many(userEquipped),
}));

// ---------- Type exports ----------

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Game = typeof games.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type LfgPost = typeof lfgPosts.$inferSelect;
export type ForumThread = typeof forumThreads.$inferSelect;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type ShopProduct = typeof shopProducts.$inferSelect;
