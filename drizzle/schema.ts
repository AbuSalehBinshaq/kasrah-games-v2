import {
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  json,
  index,
  pgTable,
  pgEnum,
  decimal,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Games table - Stores game information
 */
export const games = pgTable("games", {
  id: varchar("id", { length: 64 }).primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  developer: varchar("developer", { length: 255 }),
  gameUrl: varchar("gameUrl", { length: 512 }).notNull(),
  thumbnail: varchar("thumbnail", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("games_slug_idx").on(table.slug),
  activeIdx: index("games_active_idx").on(table.isActive),
}));

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Ads table - Stores advertisement information
 */
export const ads = pgTable("ads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // interstitial, rewarded, banner
  size: varchar("size", { length: 50 }), // 300x250, 728x90, 320x50
  imageUrl: varchar("imageUrl", { length: 512 }),
  clickUrl: varchar("clickUrl", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("ads_type_idx").on(table.type),
  activeIdx: index("ads_active_idx").on(table.isActive),
}));

export type Ad = typeof ads.$inferSelect;
export type InsertAd = typeof ads.$inferInsert;

/**
 * Ad Events table - Tracks ad interactions
 */
export const adEvents = pgTable("ad_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  adId: varchar("adId", { length: 64 }).notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(), // impression, click, close
  playerId: varchar("playerId", { length: 255 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("ad_events_gameId_idx").on(table.gameId),
  adIdIdx: index("ad_events_adId_idx").on(table.adId),
  typeIdx: index("ad_events_type_idx").on(table.eventType),
}));

export type AdEvent = typeof adEvents.$inferSelect;
export type InsertAdEvent = typeof adEvents.$inferInsert;

/**
 * Game Events table - Tracks game events
 */
export const gameEvents = pgTable("game_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  playerId: varchar("playerId", { length: 255 }).notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(), // gameplayStart, gameplayStop, levelComplete
  duration: integer("duration").default(0), // in seconds
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("game_events_gameId_idx").on(table.gameId),
  playerIdIdx: index("game_events_playerId_idx").on(table.playerId),
  typeIdx: index("game_events_type_idx").on(table.eventType),
}));

export type GameEvent = typeof gameEvents.$inferSelect;
export type InsertGameEvent = typeof gameEvents.$inferInsert;

/**
 * Cloud Saves table - Stores player game data
 */
export const cloudSaves = pgTable("cloud_saves", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  playerId: varchar("playerId", { length: 255 }).notNull(),
  data: json("data").notNull(),
  version: integer("version").default(1),
  isEncrypted: boolean("isEncrypted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  gameIdPlayerIdIdx: index("cloud_saves_gameId_playerId_idx").on(table.gameId, table.playerId),
  gameIdIdx: index("cloud_saves_gameId_idx").on(table.gameId),
}));

export type CloudSave = typeof cloudSaves.$inferSelect;
export type InsertCloudSave = typeof cloudSaves.$inferInsert;

/**
 * Analytics Summary table - Daily analytics
 */
export const analyticsSummary = pgTable("analytics_summary", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalImpressions: integer("totalImpressions").default(0),
  totalClicks: integer("totalClicks").default(0),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
  uniquePlayers: integer("uniquePlayers").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  gameIdDateIdx: index("analytics_gameId_date_idx").on(table.gameId, table.date),
  gameIdIdx: index("analytics_gameId_idx").on(table.gameId),
}));

export type AnalyticsSummary = typeof analyticsSummary.$inferSelect;
export type InsertAnalyticsSummary = typeof analyticsSummary.$inferInsert;

/**
 * SDK Configs table - SDK configuration per game
 */
export const sdkConfigs = pgTable("sdk_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  allowedDomains: json("allowedDomains").default([]),
  enableBanners: boolean("enableBanners").default(true),
  enableInterstitial: boolean("enableInterstitial").default(true),
  enableRewarded: boolean("enableRewarded").default(true),
  enableCloudSave: boolean("enableCloudSave").default(true),
  adFrequency: integer("adFrequency").default(30), // seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  gameIdIdx: index("sdk_configs_gameId_idx").on(table.gameId),
  apiKeyIdx: index("sdk_configs_apiKey_idx").on(table.apiKey),
}));

export type SdkConfig = typeof sdkConfigs.$inferSelect;
export type InsertSdkConfig = typeof sdkConfigs.$inferInsert;
