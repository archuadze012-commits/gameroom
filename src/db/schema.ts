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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Reference to Supabase auth schema (read-only from app perspective)
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "organizer", "streamer", "esports", "admin"]);
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
export const articleStatusEnum = pgEnum("article_status", ["draft", "published", "archived"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "lfg_response",
  "lfg_accepted",
  "forum_reply",
  "news_comment",
  "tournament_checkin",
  "tournament_match",
  "system",
]);

// ---------- Profiles ----------

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("profiles_username_unique").on(sql`lower(${t.username})`),
  ],
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
    active: boolean("active").default(true).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("games_active_idx").on(t.active)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_game_unique").on(t.userId, t.gameId),
    index("user_game_user_idx").on(t.userId),
  ],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("lfg_status_idx").on(t.status, t.createdAt),
    index("lfg_game_idx").on(t.gameId),
  ],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("lfg_response_unique").on(t.postId, t.userId),
    index("lfg_response_post_idx").on(t.postId),
  ],
);

// ---------- Forum ----------

export const forumCategories = pgTable(
  "forum_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

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
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("forum_thread_slug_unique").on(t.categoryId, t.slug),
    index("forum_thread_category_idx").on(t.categoryId, t.lastReplyAt),
  ],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("forum_post_thread_idx").on(t.threadId, t.createdAt)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("news_published_idx").on(t.status, t.publishedAt)],
);

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
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    checkinOpensAt: timestamp("checkin_opens_at", { withTimezone: true }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    status: tournamentStatusEnum("status").default("draft").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    winnerId: uuid("winner_id").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tournament_game_status_idx").on(t.gameId, t.status)],
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
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tournament_participant_unique").on(t.tournamentId, t.userId),
    index("tournament_participant_idx").on(t.tournamentId),
  ],
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
    player1Id: uuid("player1_id").references(() => profiles.id, { onDelete: "set null" }),
    player2Id: uuid("player2_id").references(() => profiles.id, { onDelete: "set null" }),
    score1: integer("score1"),
    score2: integer("score2"),
    winnerId: uuid("winner_id").references(() => profiles.id, { onDelete: "set null" }),
    nextMatchId: uuid("next_match_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: matchStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tournament_match_unique").on(t.tournamentId, t.round, t.position),
  ],
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)],
);

// ---------- Relations ----------

export const profilesRelations = relations(profiles, ({ many }) => ({
  gameProfiles: many(userGameProfiles),
  lfgPosts: many(lfgPosts),
  notifications: many(notifications),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  userProfiles: many(userGameProfiles),
  lfgPosts: many(lfgPosts),
  tournaments: many(tournaments),
}));

export const lfgPostsRelations = relations(lfgPosts, ({ one, many }) => ({
  author: one(profiles, { fields: [lfgPosts.authorId], references: [profiles.id] }),
  game: one(games, { fields: [lfgPosts.gameId], references: [games.id] }),
  responses: many(lfgResponses),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  game: one(games, { fields: [tournaments.gameId], references: [games.id] }),
  participants: many(tournamentParticipants),
  matches: many(tournamentMatches),
}));

// ---------- Type exports ----------

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Game = typeof games.$inferSelect;
export type LfgPost = typeof lfgPosts.$inferSelect;
export type ForumThread = typeof forumThreads.$inferSelect;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
