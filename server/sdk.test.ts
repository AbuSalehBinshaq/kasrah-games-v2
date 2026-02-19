import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";
import { nanoid } from "nanoid";

describe("SDK Database Functions", () => {
  describe("Game Operations", () => {
    it("should create a game", async () => {
      const gameId = `game_${nanoid()}`;
      const game = await db.createGame({
        id: gameId,
        slug: "test-game",
        title: "Test Game",
        developer: "Test Dev",
        gameUrl: "https://example.com/game",
      });

      expect(game).toBeDefined();
      expect(game.id).toBe(gameId);
      expect(game.title).toBe("Test Game");
    });

    it("should retrieve a game by ID", async () => {
      const gameId = `game_${nanoid()}`;
      await db.createGame({
        id: gameId,
        slug: "test-game-2",
        title: "Test Game 2",
        gameUrl: "https://example.com/game2",
      });

      const game = await db.getGameById(gameId);
      expect(game).toBeDefined();
      expect(game?.id).toBe(gameId);
    });

    it("should retrieve a game by slug", async () => {
      const slug = `test-slug-${nanoid()}`;
      await db.createGame({
        id: `game_${nanoid()}`,
        slug: slug,
        title: "Test Game by Slug",
        gameUrl: "https://example.com/game3",
      });

      const game = await db.getGameBySlug(slug);
      expect(game).toBeDefined();
      expect(game?.slug).toBe(slug);
    });
  });

  describe("Ad Operations", () => {
    it("should create an ad", async () => {
      const adId = `ad_${nanoid()}`;
      const ad = await db.createAd({
        id: adId,
        title: "Test Ad",
        type: "interstitial",
        size: "300x250",
        imageUrl: "https://example.com/ad.jpg",
        clickUrl: "https://example.com",
        isActive: true,
      });

      expect(ad).toBeDefined();
      expect(ad.id).toBe(adId);
      expect(ad.type).toBe("interstitial");
    });

    it("should retrieve an ad by ID", async () => {
      const adId = `ad_${nanoid()}`;
      await db.createAd({
        id: adId,
        title: "Test Ad 2",
        type: "rewarded",
        size: "300x250",
        imageUrl: "https://example.com/ad2.jpg",
        clickUrl: "https://example.com",
        isActive: true,
      });

      const ad = await db.getAdById(adId);
      expect(ad).toBeDefined();
      expect(ad?.id).toBe(adId);
      expect(ad?.type).toBe("rewarded");
    });

    it("should update an ad", async () => {
      const adId = `ad_${nanoid()}`;
      await db.createAd({
        id: adId,
        title: "Original Title",
        type: "banner",
        size: "728x90",
        isActive: true,
      });

      const updated = await db.updateAd(adId, {
        title: "Updated Title",
        isActive: false,
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.isActive).toBe(false);
    });

    it("should delete an ad", async () => {
      const adId = `ad_${nanoid()}`;
      await db.createAd({
        id: adId,
        title: "Ad to Delete",
        type: "interstitial",
        isActive: true,
      });

      const result = await db.deleteAd(adId);
      expect(result).toBe(true);

      const deleted = await db.getAdById(adId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("Ad Event Tracking", () => {
    it("should track an ad event", async () => {
      const eventId = `event_${nanoid()}`;
      const adId = `ad_${nanoid()}`;
      const gameId = `game_${nanoid()}`;

      await db.trackAdEvent({
        id: eventId,
        gameId: gameId,
        adId: adId,
        eventType: "impression",
        playerId: "player_123",
      });

      // Verify event was recorded
      const events = await db.getAdEventsByAdId(adId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe("impression");
    });

    it("should retrieve ad events by game ID", async () => {
      const gameId = `game_${nanoid()}`;
      const adId = `ad_${nanoid()}`;

      await db.trackAdEvent({
        id: `event_${nanoid()}`,
        gameId: gameId,
        adId: adId,
        eventType: "click",
        playerId: "player_456",
      });

      const events = await db.getAdEventsByGameId(gameId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].gameId).toBe(gameId);
    });
  });

  describe("Cloud Save Operations", () => {
    it("should save player data", async () => {
      const saveId = `save_${nanoid()}`;
      const gameId = `game_${nanoid()}`;
      const playerId = "player_789";

      const saved = await db.savePlayerData({
        id: saveId,
        gameId: gameId,
        playerId: playerId,
        data: {
          level: 5,
          score: 1000,
          inventory: ["sword", "shield"],
        },
      });

      expect(saved).toBeDefined();
      expect(saved.version).toBe(1);
    });

    it("should retrieve player data", async () => {
      const gameId = `game_${nanoid()}`;
      const playerId = "player_999";

      const testData = {
        level: 10,
        score: 5000,
        coins: 250,
      };

      await db.savePlayerData({
        id: `save_${nanoid()}`,
        gameId: gameId,
        playerId: playerId,
        data: testData,
      });

      const loaded = await db.getPlayerData(gameId, playerId);
      expect(loaded).toBeDefined();
      expect(loaded?.data).toEqual(testData);
    });

    it("should update player data and increment version", async () => {
      const gameId = `game_${nanoid()}`;
      const playerId = "player_update";

      const save1 = await db.savePlayerData({
        id: `save_${nanoid()}`,
        gameId: gameId,
        playerId: playerId,
        data: { level: 1 },
      });

      const save2 = await db.savePlayerData({
        id: `save_${nanoid()}`,
        gameId: gameId,
        playerId: playerId,
        data: { level: 2 },
      });

      expect(save2.version).toBe(2);
    });
  });

  describe("Game Event Tracking", () => {
    it("should track a game event", async () => {
      const eventId = `event_${nanoid()}`;
      const gameId = `game_${nanoid()}`;
      const playerId = "player_event";

      await db.trackGameEvent({
        id: eventId,
        gameId: gameId,
        playerId: playerId,
        eventType: "gameplayStart",
        duration: 0,
        metadata: { difficulty: "hard" },
      });

      const events = await db.getGameEventsByGameId(gameId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe("gameplayStart");
    });

    it("should retrieve game events by game ID", async () => {
      const gameId = `game_${nanoid()}`;
      const playerId = "player_events";

      await db.trackGameEvent({
        id: `event_${nanoid()}`,
        gameId: gameId,
        playerId: playerId,
        eventType: "gameplayStop",
        duration: 600,
      });

      const events = await db.getGameEventsByGameId(gameId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].gameId).toBe(gameId);
    });
  });

  describe("SDK Config Operations", () => {
    it("should create SDK config", async () => {
      const gameId = `game_${nanoid()}`;
      const config = await db.createSdkConfig({
        id: `config_${nanoid()}`,
        gameId: gameId,
        apiKey: `key_${nanoid()}`,
        allowedDomains: ["example.com", "test.com"],
      });

      expect(config).toBeDefined();
      expect(config.gameId).toBe(gameId);
    });

    it("should retrieve SDK config by game ID", async () => {
      const gameId = `game_${nanoid()}`;
      const apiKey = `key_${nanoid()}`;

      await db.createSdkConfig({
        id: `config_${nanoid()}`,
        gameId: gameId,
        apiKey: apiKey,
        allowedDomains: ["example.com"],
      });

      const config = await db.getSdkConfig(gameId);
      expect(config).toBeDefined();
      expect(config?.gameId).toBe(gameId);
      expect(config?.apiKey).toBe(apiKey);
    });

    it("should update SDK config", async () => {
      const gameId = `game_${nanoid()}`;
      await db.createSdkConfig({
        id: `config_${nanoid()}`,
        gameId: gameId,
        apiKey: `key_${nanoid()}`,
        allowedDomains: [],
      });

      const updated = await db.updateSdkConfig(gameId, {
        enableBanners: false,
        enableInterstitial: false,
      });

      expect(updated.enableBanners).toBe(false);
      expect(updated.enableInterstitial).toBe(false);
    });
  });

  describe("Analytics Operations", () => {
    it("should retrieve analytics summary", async () => {
      const gameId = `game_${nanoid()}`;
      const date = new Date().toISOString().split("T")[0];

      await db.updateAnalyticsSummary({
        id: `summary_${nanoid()}`,
        gameId: gameId,
        date: date,
        totalImpressions: 1000,
        totalClicks: 100,
        totalRevenue: 50.0,
        uniquePlayers: 500,
      });

      const summary = await db.getAnalyticsSummary(gameId, date);
      expect(summary).toBeDefined();
      expect(summary?.totalImpressions).toBe(1000);
      expect(summary?.totalClicks).toBe(100);
    });

    it("should retrieve game analytics for date range", async () => {
      const gameId = `game_${nanoid()}`;
      const today = new Date().toISOString().split("T")[0];

      await db.updateAnalyticsSummary({
        id: `summary_${nanoid()}`,
        gameId: gameId,
        date: today,
        totalImpressions: 500,
        totalClicks: 50,
        totalRevenue: 25.0,
        uniquePlayers: 250,
      });

      const analytics = await db.getGameAnalytics(gameId, 7);
      expect(analytics.length).toBeGreaterThan(0);
      expect(analytics[0].gameId).toBe(gameId);
    });
  });
});
