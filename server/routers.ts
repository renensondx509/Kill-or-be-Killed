import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getWallet,
  getTransactionHistory,
  getAllWeapons,
  getPlayerLoadout,
  equipWeapon,
  getMatchHistory,
  getMatch,
  getRoundsByMatch,
  getChatMessages,
  getPlayerStats,
  getLeaderboard,
  getNotifications,
  markNotificationRead,
  ensureWallet,
  ensurePlayerStats,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Wallet ─────────────────────────────────────────────────────────────────
  wallet: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      await ensureWallet(ctx.user.id);
      const wallet = await getWallet(ctx.user.id);
      return { balance: wallet ? parseFloat(wallet.balance as string) : 0 };
    }),

    getTransactions: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return getTransactionHistory(ctx.user.id, input.limit);
      }),

    // Stripe top-up via Stripe Checkout
    createTopUpSession: protectedProcedure
      .input(z.object({ amount: z.number().min(0.05).max(500), origin: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripeWebhook");
        const origin = input.origin || "http://localhost:3000";
        const sessionUrl = await createCheckoutSession(
          ctx.user.id,
          ctx.user.email || null,
          ctx.user.name || null,
          input.amount,
          origin
        );
        return { sessionUrl, amount: input.amount };
      }),

    // Demo top-up (for testing without Stripe)
    demoTopUp: protectedProcedure
      .input(z.object({ amount: z.number().min(0.05).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { creditWallet } = await import("./db");
        const newBalance = await creditWallet(
          ctx.user.id,
          input.amount,
          "topup",
          `Demo top-up of $${input.amount.toFixed(2)}`,
          undefined,
          "demo"
        );
        return { success: true, newBalance };
      }),
  }),

  // ─── Weapons ────────────────────────────────────────────────────────────────
  weapons: router({
    getAll: publicProcedure.query(async () => {
      return getAllWeapons();
    }),

    getLoadout: protectedProcedure.query(async ({ ctx }) => {
      return getPlayerLoadout(ctx.user.id);
    }),

    equip: protectedProcedure
      .input(z.object({ weaponId: z.number(), skinKey: z.string().default("default") }))
      .mutation(async ({ ctx, input }) => {
        await equipWeapon(ctx.user.id, input.weaponId, input.skinKey);
        return { success: true };
      }),
  }),

  // ─── Matches ─────────────────────────────────────────────────────────────────
  matches: router({
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const history = await getMatchHistory(ctx.user.id, input.limit);
        return history;
      }),

    getMatch: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const match = await getMatch(input.matchId);
        if (!match) throw new Error("Match not found");
        if (match.player1Id !== ctx.user.id && match.player2Id !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return match;
      }),

    getRounds: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const match = await getMatch(input.matchId);
        if (!match) throw new Error("Match not found");
        if (match.player1Id !== ctx.user.id && match.player2Id !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return getRoundsByMatch(input.matchId);
      }),

    getChat: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const match = await getMatch(input.matchId);
        if (!match) throw new Error("Match not found");
        if (match.player1Id !== ctx.user.id && match.player2Id !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return getChatMessages(input.matchId);
      }),
  }),

  // ─── Stats ───────────────────────────────────────────────────────────────────
  stats: router({
    getMyStats: protectedProcedure.query(async ({ ctx }) => {
      await ensurePlayerStats(ctx.user.id);
      return getPlayerStats(ctx.user.id);
    }),

    getLeaderboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        return getLeaderboard(input.limit);
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────────────────────
  notifications: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return getNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.notificationId, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { notifications } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
