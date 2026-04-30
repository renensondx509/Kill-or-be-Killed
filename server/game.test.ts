import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  }),
  ensureWallet: vi.fn().mockResolvedValue(undefined),
  getWallet: vi.fn().mockResolvedValue({ balance: "10.00" }),
  getTransactionHistory: vi.fn().mockResolvedValue([]),
  creditWallet: vi.fn().mockResolvedValue(10.5),
  getAllWeapons: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Void Cannon",
      slug: "void-cannon",
      description: "A heavy plasma cannon",
      damage: 90,
      recoilStrength: 85,
      soundKey: "heavy_boom",
      effectColor: "oklch(0.72 0.28 195)",
      unlockCost: "0.00",
      isDefault: true,
    },
  ]),
  getPlayerLoadout: vi.fn().mockResolvedValue({
    loadout: { weaponId: 1, skinKey: "default" },
    weapon: {
      id: 1,
      name: "Void Cannon",
      slug: "void-cannon",
      effectColor: "oklch(0.72 0.28 195)",
    },
  }),
  upsertLoadout: vi.fn().mockResolvedValue(undefined),
  getMatchHistory: vi.fn().mockResolvedValue([]),
  getPlayerStats: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    elo: 1200,
    tier: "silver",
    wins: 10,
    losses: 5,
    totalMatches: 15,
    currentWinStreak: 2,
    bestWinStreak: 5,
    totalEarnings: "12.50",
    totalStaked: "15.00",
    updatedAt: new Date(),
  }),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  getMatchById: vi.fn().mockResolvedValue(null),
  getRoundsByMatch: vi.fn().mockResolvedValue([]),
  getChatMessages: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  ensurePlayerStats: vi.fn().mockResolvedValue(undefined),
  equipWeapon: vi.fn().mockResolvedValue(undefined),
  getMatch: vi.fn().mockResolvedValue(null),
}));

// ─── Context Helpers ──────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test Fighter",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("returns current user from auth.me", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test Fighter");
  });

  it("clears session cookie on logout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Wallet Tests ─────────────────────────────────────────────────────────────
describe("wallet", () => {
  it("returns wallet balance", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wallet.getBalance();
    expect(result.balance).toBe(10.0);
  });

  it("returns transaction history", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wallet.getTransactions({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("demo top-up credits wallet", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wallet.demoTopUp({ amount: 0.50 });
    expect(result.success).toBe(true);
    expect(typeof result.newBalance).toBe("number");
  });

  it("rejects demo top-up below minimum", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wallet.demoTopUp({ amount: 0.01 })).rejects.toThrow();
  });
});

// ─── Weapons Tests ────────────────────────────────────────────────────────────
describe("weapons", () => {
  it("returns all weapons", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.weapons.getAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].slug).toBe("void-cannon");
  });

  it("returns player loadout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.weapons.getLoadout();
    expect(result).toBeDefined();
    expect(result.weapon.name).toBe("Void Cannon");
  });

  it("equips a weapon", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.weapons.equip({ weaponId: 1, skinKey: "default" });
    expect(result.success).toBe(true);
  });
});

// ─── Stats Tests ──────────────────────────────────────────────────────────────
describe("stats", () => {
  it("returns player stats", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.getMyStats();
    expect(result).toBeDefined();
    expect(result.elo).toBe(1200);
    expect(result.tier).toBe("silver");
    expect(result.wins).toBe(10);
  });

  it("returns leaderboard", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.getLeaderboard({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("returns notifications list", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("marks all notifications as read", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result.success).toBe(true);
  });
});

// ─── Match History Tests ──────────────────────────────────────────────────────
describe("matches", () => {
  it("returns match history", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.matches.getHistory({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});
