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
} from "drizzle-orm/mysql-core";

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

// Wallet — one per user
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;

// Transactions — wallet ledger
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["topup", "stake", "payout", "commission", "refund"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }).notNull(),
  matchId: int("matchId"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;

// Weapons catalog
export const weapons = mysqlTable("weapons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  damage: int("damage").notNull().default(100),
  recoilStrength: int("recoilStrength").notNull().default(50),
  effectColor: varchar("effectColor", { length: 16 }).notNull().default("#ff0000"),
  soundKey: varchar("soundKey", { length: 64 }),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Weapon = typeof weapons.$inferSelect;

// Player weapon loadout
export const playerLoadouts = mysqlTable("playerLoadouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weaponId: int("weaponId").notNull(),
  skinKey: varchar("skinKey", { length: 64 }).default("default"),
  equippedAt: timestamp("equippedAt").defaultNow().notNull(),
});

export type PlayerLoadout = typeof playerLoadouts.$inferSelect;

// Matches
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  player1Id: int("player1Id").notNull(),
  player2Id: int("player2Id").notNull(),
  stakeAmount: decimal("stakeAmount", { precision: 10, scale: 2 }).notNull().default("0.10"),
  potAmount: decimal("potAmount", { precision: 10, scale: 2 }).notNull().default("0.10"),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).notNull().default("0.1000"),
  winnerId: int("winnerId"),
  status: mysqlEnum("status", ["waiting", "active", "completed", "cancelled"]).notNull().default("waiting"),
  player1Rounds: int("player1Rounds").notNull().default(0),
  player2Rounds: int("player2Rounds").notNull().default(0),
  totalRounds: int("totalRounds").notNull().default(0),
  payoutAmount: decimal("payoutAmount", { precision: 10, scale: 2 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;

// Rounds within a match
export const rounds = mysqlTable("rounds", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  roundNumber: int("roundNumber").notNull(),
  winnerId: int("winnerId"),
  player1Action: json("player1Action"),
  player2Action: json("player2Action"),
  player1Hit: boolean("player1Hit").notNull().default(false),
  player2Hit: boolean("player2Hit").notNull().default(false),
  durationMs: int("durationMs"),
  isFinalRound: boolean("isFinalRound").notNull().default(false),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Round = typeof rounds.$inferSelect;

// Chat messages in a match
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  senderId: int("senderId").notNull(),
  message: text("message").notNull(),
  messageType: mysqlEnum("messageType", ["text", "quick"]).notNull().default("text"),
  filtered: boolean("filtered").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

// Player stats
export const playerStats = mysqlTable("playerStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  elo: int("elo").notNull().default(1000),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum", "diamond", "apex"]).notNull().default("bronze"),
  wins: int("wins").notNull().default(0),
  losses: int("losses").notNull().default(0),
  totalMatches: int("totalMatches").notNull().default(0),
  currentWinStreak: int("currentWinStreak").notNull().default(0),
  bestWinStreak: int("bestWinStreak").notNull().default(0),
  totalEarnings: decimal("totalEarnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalStaked: decimal("totalStaked", { precision: 10, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerStats = typeof playerStats.$inferSelect;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["match_found", "rematch_challenge", "low_balance", "payout_received", "system"]).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
