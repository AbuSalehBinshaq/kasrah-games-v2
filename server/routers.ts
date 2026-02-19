import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ SDK ROUTES ============

  sdk: router({
    /**
     * Initialize SDK for a game
     */
    init: publicProcedure
      .input(z.object({
        gameId: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const game = await db.getGameById(input.gameId);
          if (!game) {
            return { success: false, error: "Game not found" };
          }

          // Get or create SDK config
          let config = await db.getSdkConfig(input.gameId);
          if (!config) {
            const apiKey = `key_${nanoid(32)}`;
            config = await db.createSdkConfig({
              id: `config_${nanoid()}`,
              gameId: input.gameId,
              apiKey: apiKey,
              allowedDomains: [],
            });
          }

          return {
            success: true,
            game: {
              id: game.id,
              title: game.title,
              slug: game.slug,
            },
            config: {
              adFrequency: config.adFrequency,
              enableBanners: config.enableBanners,
              enableInterstitial: config.enableInterstitial,
              enableRewarded: config.enableRewarded,
              enableCloudSave: config.enableCloudSave,
            }
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Get game info
     */
    getGame: publicProcedure
      .input(z.object({
        gameId: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const game = await db.getGameById(input.gameId);
          if (!game) {
            return { success: false, error: "Game not found" };
          }
          return { success: true, game };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Request an ad
     */
    requestAd: publicProcedure
      .input(z.object({
        gameId: z.string(),
        type: z.enum(["interstitial", "rewarded", "banner"]),
        size: z.string().optional(),
        playerId: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const ads = await db.getActiveAds(input.type as any);
          
          if (ads.length === 0) {
            // Return fallback ad
            return {
              success: true,
              ad: {
                id: `fallback_${nanoid()}`,
                title: "Kasrah Games",
                description: "Play amazing games on Kasrah Games!",
                type: input.type,
                imageUrl: "https://kasrah-games.onrender.com/images/logo.png",
                clickUrl: "https://kasrah-games.com",
              }
            };
          }

          // Select random ad
          const ad = ads[Math.floor(Math.random() * ads.length)];

          return {
            success: true,
            ad: {
              id: ad.id,
              title: ad.title,
              description: ad.code || "Advertisement",
              type: ad.type,
              size: ad.size,
              imageUrl: ad.imageUrl,
              clickUrl: ad.clickUrl,
            }
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Track ad event
     */
    trackAdEvent: publicProcedure
      .input(z.object({
        gameId: z.string(),
        adId: z.string(),
        eventType: z.enum(["impression", "click", "start", "complete", "error", "close"]),
        playerId: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.trackAdEvent({
            id: `event_${nanoid()}`,
            gameId: input.gameId,
            adId: input.adId,
            eventType: input.eventType,
            playerId: input.playerId,
            userAgent: "SDK",
          });

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Track game event
     */
    trackGameEvent: publicProcedure
      .input(z.object({
        gameId: z.string(),
        playerId: z.string(),
        eventType: z.string(),
        duration: z.number().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.trackGameEvent({
            id: `event_${nanoid()}`,
            gameId: input.gameId,
            playerId: input.playerId,
            eventType: input.eventType as any,
            duration: input.duration,
            metadata: input.metadata,
          });

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Save player data
     */
    savePlayerData: publicProcedure
      .input(z.object({
        gameId: z.string(),
        playerId: z.string(),
        data: z.record(z.string(), z.any()),
        isEncrypted: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const save = await db.savePlayerData({
            id: `save_${nanoid()}`,
            gameId: input.gameId,
            playerId: input.playerId,
            data: input.data,
            isEncrypted: input.isEncrypted || false,
          });

          return { success: true, save };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Load player data
     */
    loadPlayerData: publicProcedure
      .input(z.object({
        gameId: z.string(),
        playerId: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const save = await db.getPlayerData(input.gameId, input.playerId);
          
          if (!save) {
            return { success: true, data: null };
          }

          return { success: true, data: save.data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Get analytics
     */
    getAnalytics: publicProcedure
      .input(z.object({
        gameId: z.string(),
        days: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const analytics = await db.getGameAnalytics(input.gameId, input.days || 30);
          
          return {
            success: true,
            analytics,
            summary: {
              totalImpressions: analytics.reduce((sum, a) => sum + a.totalImpressions, 0),
              totalClicks: analytics.reduce((sum, a) => sum + a.totalClicks, 0),
              totalRevenue: analytics.reduce((sum, a) => sum + parseFloat(a.totalRevenue.toString()), 0),
              uniquePlayers: analytics.reduce((sum, a) => sum + a.uniquePlayers, 0),
            }
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),
  }),

  // ============ ADMIN ROUTES ============

  admin: router({
    /**
     * Create game
     */
    createGame: protectedProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        developer: z.string().optional(),
        gameUrl: z.string(),
        thumbnail: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          return { success: false, error: "Unauthorized" };
        }

        try {
          const game = await db.createGame({
            id: `game_${nanoid()}`,
            ...input,
          });

          return { success: true, game };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Create ad
     */
    createAd: protectedProcedure
      .input(z.object({
        title: z.string(),
        type: z.enum(["interstitial", "rewarded", "banner"]),
        size: z.string().optional(),
        imageUrl: z.string().optional(),
        clickUrl: z.string().optional(),
        code: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          return { success: false, error: "Unauthorized" };
        }

        try {
          const ad = await db.createAd({
            id: `ad_${nanoid()}`,
            ...input,
            size: input.size as any || "300x250",
          });

          return { success: true, ad };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Update ad
     */
    updateAd: protectedProcedure
      .input(z.object({
        adId: z.string(),
        title: z.string().optional(),
        isActive: z.boolean().optional(),
        imageUrl: z.string().optional(),
        clickUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          return { success: false, error: "Unauthorized" };
        }

        try {
          const ad = await db.updateAd(input.adId, {
            title: input.title,
            isActive: input.isActive,
            imageUrl: input.imageUrl,
            clickUrl: input.clickUrl,
          });

          return { success: true, ad };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Delete ad
     */
    deleteAd: protectedProcedure
      .input(z.object({
        adId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          return { success: false, error: "Unauthorized" };
        }

        try {
          await db.deleteAd(input.adId);
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    /**
     * Get all ads
     */
    getAds: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user?.role !== 'admin') {
          return { success: false, error: "Unauthorized", ads: [] };
        }

        try {
          const allAds = await db.getActiveAds(undefined);
          return { success: true, ads: allAds };
        } catch (error: any) {
          return { success: false, error: error.message, ads: [] };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
