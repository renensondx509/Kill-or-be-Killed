import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  wallets,
  transactions,
  weapons,
  playerLoadouts,
  matches,
  rounds,
  chatMessages,
  playerStats,
  notifications,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
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
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });

  // Ensure wallet and stats exist for new user
  const dbUser = await getUserByOpenId(user.openId);
  if (dbUser) {
    await ensureWallet(dbUser.id);
    await ensurePlayerStats(dbUser.id);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function ensureWallet(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(wallets).values({ userId, balance: "0.00" });
  }
}

export async function getWallet(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function creditWallet(
  userId: number,
  amount: number,
  type: "topup" | "payout" | "refund",
  description: string,
  matchId?: number,
  stripePaymentIntentId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await ensureWallet(userId);
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");
  const before = parseFloat(wallet.balance as string);
  const after = before + amount;
  await db.update(wallets).set({ balance: after.toFixed(2) }).where(eq(wallets.userId, userId));
  await db.insert(transactions).values({
    userId,
    type,
    amount: amount.toFixed(2),
    balanceBefore: before.toFixed(2),
    balanceAfter: after.toFixed(2),
    matchId,
    stripePaymentIntentId,
    description,
  });
  return after;
}

export async function debitWallet(
  userId: number,
  amount: number,
  type: "stake" | "commission",
  description: string,
  matchId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await ensureWallet(userId);
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");
  const before = parseFloat(wallet.balance as string);
  if (before < amount) throw new Error("Insufficient balance");
  const after = before - amount;
  await db.update(wallets).set({ balance: after.toFixed(2) }).where(eq(wallets.userId, userId));
  await db.insert(transactions).values({
    userId,
    type,
    amount: (-amount).toFixed(2),
    balanceBefore: before.toFixed(2),
    balanceAfter: after.toFixed(2),
    matchId,
    description,
  });
  return after;
}

export async function getTransactionHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

// ─── Weapons ──────────────────────────────────────────────────────────────────

export async function getAllWeapons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weapons).orderBy(weapons.id);
}

export async function seedWeapons() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(weapons).limit(1);
  if (existing.length > 0) return;
  await db.insert(weapons).values([
    {
      name: "VOID CANNON",
      slug: "void-cannon",
      description: "Annihilates targets with a singularity burst. Extreme recoil.",
      damage: 100,
      recoilStrength: 90,
      effectColor: "#ff0040",
      soundKey: "void_cannon",
      isDefault: true,
    },
    {
      name: "PLASMA RIFLE",
      slug: "plasma-rifle",
      description: "Rapid-fire plasma bolts. Medium recoil, high precision.",
      damage: 80,
      recoilStrength: 60,
      effectColor: "#00ffff",
      soundKey: "plasma_rifle",
      isDefault: false,
    },
    {
      name: "NOVA SHOTGUN",
      slug: "nova-shotgun",
      description: "Wide-spread energy burst. Devastating at close range.",
      damage: 95,
      recoilStrength: 100,
      effectColor: "#ff6600",
      soundKey: "nova_shotgun",
      isDefault: false,
    },
    {
      name: "PHANTOM SNIPER",
      slug: "phantom-sniper",
      description: "Single precision shot. Minimal recoil, maximum damage.",
      damage: 100,
      recoilStrength: 40,
      effectColor: "#cc00ff",
      soundKey: "phantom_sniper",
      isDefault: false,
    },
  ]);
}

export async function getPlayerLoadout(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ loadout: playerLoadouts, weapon: weapons })
    .from(playerLoadouts)
    .innerJoin(weapons, eq(playerLoadouts.weaponId, weapons.id))
    .where(eq(playerLoadouts.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function equipWeapon(userId: number, weaponId: number, skinKey = "default") {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(playerLoadouts).where(eq(playerLoadouts.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(playerLoadouts).set({ weaponId, skinKey }).where(eq(playerLoadouts.userId, userId));
  } else {
    await db.insert(playerLoadouts).values({ userId, weaponId, skinKey });
  }
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function createMatch(player1Id: number, player2Id: number, stakeAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const pot = (stakeAmount * 2).toFixed(2);
  const [result] = await db.insert(matches).values({
    player1Id,
    player2Id,
    stakeAmount: stakeAmount.toFixed(2),
    potAmount: pot,
    status: "active",
    startedAt: new Date(),
  }).$returningId();
  return result.id;
}

export async function getMatch(matchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateMatchScore(
  matchId: number,
  player1Rounds: number,
  player2Rounds: number,
  totalRounds: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(matches)
    .set({ player1Rounds, player2Rounds, totalRounds })
    .where(eq(matches.id, matchId));
}

export async function completeMatch(matchId: number, winnerId: number, payoutAmount: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(matches)
    .set({
      winnerId,
      status: "completed",
      payoutAmount: payoutAmount.toFixed(2),
      completedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function getMatchHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(
      sql`(${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId}) AND ${matches.status} = 'completed'`
    )
    .orderBy(desc(matches.createdAt))
    .limit(limit);
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export async function createRound(matchId: number, roundNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(rounds).values({ matchId, roundNumber }).$returningId();
  return result.id;
}

export async function completeRound(
  roundId: number,
  winnerId: number | null,
  player1Hit: boolean,
  player2Hit: boolean,
  durationMs: number,
  isFinalRound: boolean,
  p1Action: unknown,
  p2Action: unknown
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(rounds)
    .set({
      winnerId,
      player1Hit,
      player2Hit,
      durationMs,
      isFinalRound,
      player1Action: p1Action as Record<string, unknown>,
      player2Action: p2Action as Record<string, unknown>,
      completedAt: new Date(),
    })
    .where(eq(rounds.id, roundId));
}

export async function getRoundsByMatch(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rounds).where(eq(rounds.matchId, matchId)).orderBy(rounds.roundNumber);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

const PROFANITY_LIST = ["fuck", "shit", "ass", "bitch", "cunt", "dick", "pussy", "nigger", "faggot"];

export function filterProfanity(text: string): { filtered: string; wasFiltered: boolean } {
  let filtered = text;
  let wasFiltered = false;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(word, "gi");
    if (regex.test(filtered)) {
      wasFiltered = true;
      filtered = filtered.replace(regex, "*".repeat(word.length));
    }
  }
  return { filtered, wasFiltered };
}

export async function saveChatMessage(
  matchId: number,
  senderId: number,
  message: string,
  messageType: "text" | "quick" = "text"
) {
  const db = await getDb();
  if (!db) return null;
  const { filtered, wasFiltered } = filterProfanity(message);
  const [result] = await db
    .insert(chatMessages)
    .values({ matchId, senderId, message: filtered, messageType, filtered: wasFiltered })
    .$returningId();
  return { id: result.id, message: filtered, filtered: wasFiltered };
}

export async function getChatMessages(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.matchId, matchId))
    .orderBy(chatMessages.createdAt)
    .limit(100);
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export async function ensurePlayerStats(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(playerStats).where(eq(playerStats.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(playerStats).values({ userId });
  }
}

export async function getPlayerStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(playerStats).where(eq(playerStats.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

function eloTier(elo: number): "bronze" | "silver" | "gold" | "platinum" | "diamond" | "apex" {
  if (elo < 1100) return "bronze";
  if (elo < 1250) return "silver";
  if (elo < 1400) return "gold";
  if (elo < 1600) return "platinum";
  if (elo < 1800) return "diamond";
  return "apex";
}

export async function updatePlayerStatsAfterMatch(
  winnerId: number,
  loserId: number,
  earnings: number
) {
  const db = await getDb();
  if (!db) return;

  const winnerStats = await getPlayerStats(winnerId);
  const loserStats = await getPlayerStats(loserId);
  if (!winnerStats || !loserStats) return;

  // ELO calculation
  const K = 32;
  const expectedWin = 1 / (1 + Math.pow(10, (loserStats.elo - winnerStats.elo) / 400));
  const expectedLoss = 1 - expectedWin;
  const newWinnerElo = Math.round(winnerStats.elo + K * (1 - expectedWin));
  const newLoserElo = Math.max(800, Math.round(loserStats.elo + K * (0 - expectedLoss)));

  const newStreak = winnerStats.currentWinStreak + 1;
  const bestStreak = Math.max(winnerStats.bestWinStreak, newStreak);

  await db
    .update(playerStats)
    .set({
      wins: winnerStats.wins + 1,
      totalMatches: winnerStats.totalMatches + 1,
      currentWinStreak: newStreak,
      bestWinStreak: bestStreak,
      totalEarnings: (parseFloat(winnerStats.totalEarnings as string) + earnings).toFixed(2),
      elo: newWinnerElo,
      tier: eloTier(newWinnerElo),
    })
    .where(eq(playerStats.userId, winnerId));

  await db
    .update(playerStats)
    .set({
      losses: loserStats.losses + 1,
      totalMatches: loserStats.totalMatches + 1,
      currentWinStreak: 0,
      elo: newLoserElo,
      tier: eloTier(newLoserElo),
    })
    .where(eq(playerStats.userId, loserId));
}

export async function getLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ stats: playerStats, user: users })
    .from(playerStats)
    .innerJoin(users, eq(playerStats.userId, users.id))
    .orderBy(desc(playerStats.elo))
    .limit(limit);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  userId: number,
  type: "match_found" | "rematch_challenge" | "low_balance" | "payout_received" | "system",
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, type, title, body, metadata });
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
