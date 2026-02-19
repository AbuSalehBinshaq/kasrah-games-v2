import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  games,
  ads,
  adEvents,
  gameEvents,
  cloudSaves,
  analyticsSummary,
  sdkConfigs,
  Game,
  Ad,
  AdEvent,
  GameEvent,
  CloudSave,
  AnalyticsSummary,
  SdkConfig
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ GAME QUERIES ============

export async function getGameById(gameId: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGameBySlug(slug: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGame(game: typeof games.$inferInsert): Promise<Game> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(games).values(game);
  const result = await db.select().from(games).where(eq(games.id, game.id)).limit(1);
  if (!result.length) throw new Error("Failed to create game");
  return result[0];
}

// ============ AD QUERIES ============

export async function getActiveAds(type?: string): Promise<Ad[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const conditions: any[] = [
    eq(ads.isActive, true),
  ];

  if (type) {
    conditions.push(eq(ads.type, type as any));
  }

  if (conditions.length === 1) {
    return await db.select().from(ads).where(conditions[0]);
  }
  
  return await db.select().from(ads).where(and(...conditions));
}

export async function getAdById(adId: string): Promise<Ad | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAd(ad: typeof ads.$inferInsert): Promise<Ad> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(ads).values(ad);
  const result = await db.select().from(ads).where(eq(ads.id, ad.id)).limit(1);
  if (!result.length) throw new Error("Failed to create ad");
  return result[0];
}

export async function updateAd(adId: string, updates: Partial<typeof ads.$inferInsert>): Promise<Ad> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(ads).set(updates).where(eq(ads.id, adId));
  const result = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  if (!result.length) throw new Error("Failed to update ad");
  return result[0];
}

export async function deleteAd(adId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(ads).where(eq(ads.id, adId));
  return true;
}

// ============ AD EVENT QUERIES ============

export async function trackAdEvent(event: typeof adEvents.$inferInsert): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(adEvents).values(event);
}

export async function getAdEventsByAdId(adId: string, days: number = 7): Promise<AdEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db.select()
    .from(adEvents)
    .where(and(
      eq(adEvents.adId, adId),
      gte(adEvents.createdAt, startDate)
    ))
    .orderBy(desc(adEvents.createdAt));
}

export async function getAdEventsByGameId(gameId: string, days: number = 7): Promise<AdEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db.select()
    .from(adEvents)
    .where(and(
      eq(adEvents.gameId, gameId),
      gte(adEvents.createdAt, startDate)
    ))
    .orderBy(desc(adEvents.createdAt));
}

// ============ GAME EVENT QUERIES ============

export async function trackGameEvent(event: typeof gameEvents.$inferInsert): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(gameEvents).values(event);
}

export async function getGameEventsByGameId(gameId: string, days: number = 7): Promise<GameEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db.select()
    .from(gameEvents)
    .where(and(
      eq(gameEvents.gameId, gameId),
      gte(gameEvents.createdAt, startDate)
    ))
    .orderBy(desc(gameEvents.createdAt));
}

// ============ CLOUD SAVE QUERIES ============

export async function savePlayerData(save: typeof cloudSaves.$inferInsert): Promise<CloudSave> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if save exists
  const existing = await db.select()
    .from(cloudSaves)
    .where(and(
      eq(cloudSaves.gameId, save.gameId),
      eq(cloudSaves.playerId, save.playerId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(cloudSaves)
      .set({
        data: save.data,
        version: (existing[0].version || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(cloudSaves.id, existing[0].id));

    const result = await db.select()
      .from(cloudSaves)
      .where(eq(cloudSaves.id, existing[0].id))
      .limit(1);
    return result[0];
  } else {
    // Create new
    await db.insert(cloudSaves).values(save);
    const result = await db.select()
      .from(cloudSaves)
      .where(eq(cloudSaves.id, save.id))
      .limit(1);
    if (!result.length) throw new Error("Failed to save player data");
    return result[0];
  }
}

export async function getPlayerData(gameId: string, playerId: string): Promise<CloudSave | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(cloudSaves)
    .where(and(
      eq(cloudSaves.gameId, gameId),
      eq(cloudSaves.playerId, playerId)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ ANALYTICS QUERIES ============

export async function getAnalyticsSummary(gameId: string, date: string): Promise<AnalyticsSummary | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(analyticsSummary)
    .where(and(
      eq(analyticsSummary.gameId, gameId),
      eq(analyticsSummary.date, date)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateAnalyticsSummary(summary: typeof analyticsSummary.$inferInsert): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getAnalyticsSummary(summary.gameId, summary.date);

  if (existing) {
    await db.update(analyticsSummary)
      .set(summary)
      .where(eq(analyticsSummary.id, existing.id));
  } else {
    await db.insert(analyticsSummary).values(summary);
  }
}

export async function getGameAnalytics(gameId: string, days: number = 30): Promise<AnalyticsSummary[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  return await db.select()
    .from(analyticsSummary)
    .where(and(
      eq(analyticsSummary.gameId, gameId),
      gte(analyticsSummary.date, dateStr)
    ))
    .orderBy(desc(analyticsSummary.date));
}

// ============ SDK CONFIG QUERIES ============

export async function getSdkConfig(gameId: string): Promise<SdkConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(sdkConfigs)
    .where(eq(sdkConfigs.gameId, gameId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSdkConfig(config: typeof sdkConfigs.$inferInsert): Promise<SdkConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(sdkConfigs).values(config);
  const result = await db.select()
    .from(sdkConfigs)
    .where(eq(sdkConfigs.gameId, config.gameId))
    .limit(1);

  if (!result.length) throw new Error("Failed to create SDK config");
  return result[0];
}

export async function updateSdkConfig(gameId: string, updates: Partial<typeof sdkConfigs.$inferInsert>): Promise<SdkConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sdkConfigs).set(updates).where(eq(sdkConfigs.gameId, gameId));
  const result = await db.select()
    .from(sdkConfigs)
    .where(eq(sdkConfigs.gameId, gameId))
    .limit(1);

  if (!result.length) throw new Error("Failed to update SDK config");
  return result[0];
}
