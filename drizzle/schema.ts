import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  json,
  index
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Games table - Stores game information
 */
export const games = mysqlTable("games", {
  id: varchar("id", { length: 64 }).primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  developer: varchar("developer", { length: 255 }),
  gameUrl: varchar("gameUrl", { length: 512 }).notNull(),
  thumbnail: varchar("thumbnail", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugIdx: index("games_slug_idx").on(table.slug),
  activeIdx: index("games_active_idx").on(table.isActive),
}));

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Ads table - Stores advertisement configurations
 */
export const ads = mysqlTable("ads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["interstitial", "rewarded", "banner"]).notNull(),
  size: mysqlEnum("size", ["300x250", "728x90", "320x50", "custom"]).default("300x250").notNull(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  clickUrl: varchar("clickUrl", { length: 512 }),
  code: text("code"),
  isActive: boolean("isActive").default(true).notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: index("ads_type_idx").on(table.type),
  activeIdx: index("ads_active_idx").on(table.isActive),
}));

export type Ad = typeof ads.$inferSelect;
export type InsertAd = typeof ads.$inferInsert;

/**
 * Ad Events table - Tracks ad impressions, clicks, and interactions
 */
export const adEvents = mysqlTable("ad_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  adId: varchar("adId", { length: 64 }).notNull(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  eventType: mysqlEnum("eventType", ["impression", "click", "start", "complete", "error", "close"]).notNull(),
  playerId: varchar("playerId", { length: 255 }),
  playerIp: varchar("playerIp", { length: 45 }),
  userAgent: text("userAgent"),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  adIdIdx: index("ad_events_ad_id_idx").on(table.adId),
  gameIdIdx: index("ad_events_game_id_idx").on(table.gameId),
  eventTypeIdx: index("ad_events_event_type_idx").on(table.eventType),
  createdAtIdx: index("ad_events_created_at_idx").on(table.createdAt),
}));

export type AdEvent = typeof adEvents.$inferSelect;
export type InsertAdEvent = typeof adEvents.$inferInsert;

/**
 * Game Events table - Tracks gameplay events
 */
export const gameEvents = mysqlTable("game_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  playerId: varchar("playerId", { length: 255 }).notNull(),
  eventType: mysqlEnum("eventType", ["gameplayStart", "gameplayStop", "gameLoadingFinished", "happyTime", "levelComplete", "gameOver"]).notNull(),
  duration: int("duration"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("game_events_game_id_idx").on(table.gameId),
  playerIdIdx: index("game_events_player_id_idx").on(table.playerId),
  eventTypeIdx: index("game_events_event_type_idx").on(table.eventType),
  createdAtIdx: index("game_events_created_at_idx").on(table.createdAt),
}));

export type GameEvent = typeof gameEvents.$inferSelect;
export type InsertGameEvent = typeof gameEvents.$inferInsert;

/**
 * Cloud Save table - Stores player data
 */
export const cloudSaves = mysqlTable("cloud_saves", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  playerId: varchar("playerId", { length: 255 }).notNull(),
  data: json("data").notNull(),
  version: int("version").default(1).notNull(),
  isEncrypted: boolean("isEncrypted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  gameIdPlayerIdIdx: index("cloud_saves_game_id_player_id_idx").on(table.gameId, table.playerId),
  gameIdIdx: index("cloud_saves_game_id_idx").on(table.gameId),
  updatedAtIdx: index("cloud_saves_updated_at_idx").on(table.updatedAt),
}));

export type CloudSave = typeof cloudSaves.$inferSelect;
export type InsertCloudSave = typeof cloudSaves.$inferInsert;

/**
 * Analytics Summary table - Pre-aggregated stats for dashboard
 */
export const analyticsSummary = mysqlTable("analytics_summary", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalImpressions: int("totalImpressions").default(0).notNull(),
  totalClicks: int("totalClicks").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  uniquePlayers: int("uniquePlayers").default(0).notNull(),
  avgPlayDuration: int("avgPlayDuration").default(0).notNull(),
  totalPlayTime: int("totalPlayTime").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  gameIdDateIdx: index("analytics_summary_game_id_date_idx").on(table.gameId, table.date),
  gameIdIdx: index("analytics_summary_game_id_idx").on(table.gameId),
}));

export type AnalyticsSummary = typeof analyticsSummary.$inferSelect;
export type InsertAnalyticsSummary = typeof analyticsSummary.$inferInsert;

/**
 * SDK Configuration table - Stores SDK settings per game
 */
export const sdkConfigs = mysqlTable("sdk_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  allowedDomains: json("allowedDomains").notNull(), // Array of allowed domains
  adFrequency: int("adFrequency").default(30).notNull(), // Seconds between ads
  enableBanners: boolean("enableBanners").default(true).notNull(),
  enableInterstitial: boolean("enableInterstitial").default(true).notNull(),
  enableRewarded: boolean("enableRewarded").default(true).notNull(),
  enableCloudSave: boolean("enableCloudSave").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  gameIdIdx: index("sdk_configs_game_id_idx").on(table.gameId),
  apiKeyIdx: index("sdk_configs_api_key_idx").on(table.apiKey),
}));

export type SdkConfig = typeof sdkConfigs.$inferSelect;
export type InsertSdkConfig = typeof sdkConfigs.$inferInsert;
