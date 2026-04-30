import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import {
  createMatch,
  getMatch,
  updateMatchScore,
  completeMatch,
  createRound,
  completeRound,
  debitWallet,
  creditWallet,
  getWallet,
  saveChatMessage,
  updatePlayerStatsAfterMatch,
  createNotification,
  getUserById,
  getUserByOpenId,
} from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlayerAction {
  targetZone: number; // 0=left, 1=center, 2=right
  moveZone: number;   // where player moves to
  timestamp: number;
  weaponSlug: string;
}

interface QueueEntry {
  userId: number;
  socketId: string;
  stakeAmount: number;
  eloRating: number;
  joinedAt: number;
  isBot?: boolean;
}

interface ActiveMatch {
  matchId: number;
  player1: { userId: number; socketId: string; isBot?: boolean };
  player2: { userId: number; socketId: string; isBot?: boolean };
  stakeAmount: number;
  player1Rounds: number;
  player2Rounds: number;
  currentRoundId: number | null;
  roundStartTime: number | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
  botActionTimer: ReturnType<typeof setInterval> | null;
  player1Action: PlayerAction | null;
  player2Action: PlayerAction | null;
  status: "active" | "completed";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROUNDS_TO_WIN = 3;
const ROUND_DURATION_MS = 10000;
const COMMISSION_RATE = 0.10;
const MIN_STAKE = 0.05;
const BOT_USER_ID = -999;

// ─── State ────────────────────────────────────────────────────────────────────
const matchmakingQueue: QueueEntry[] = [];
const activeMatches = new Map<number, ActiveMatch>();
const socketToUser = new Map<string, number>();
const userToSocket = new Map<number, string>();
const userToMatch = new Map<number, number>();

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(event: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
  console.log(`[GameSocket][${ts}] ${event}${dataStr}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateHit(attacker: PlayerAction, defender: PlayerAction): boolean {
  return attacker.targetZone === defender.moveZone;
}

function calculatePayout(potAmount: number): number {
  return parseFloat((potAmount * (1 - COMMISSION_RATE)).toFixed(2));
}

function generateBotAction(): PlayerAction {
  const zones = [0, 1, 1, 2];
  return {
    targetZone: zones[Math.floor(Math.random() * zones.length)],
    moveZone: zones[Math.floor(Math.random() * zones.length)],
    timestamp: Date.now(),
    weaponSlug: "void-cannon",
  };
}

function parseCookieString(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  cookieHeader.split(";").forEach(part => {
    const [key, ...vals] = part.trim().split("=");
    if (key) map.set(key.trim(), decodeURIComponent(vals.join("=").trim()));
  });
  return map;
}

// ─── Round Logic ──────────────────────────────────────────────────────────────
async function processRound(io: SocketIOServer, matchId: number) {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== "active") return;

  if (match.roundTimer) { clearTimeout(match.roundTimer); match.roundTimer = null; }
  if (match.botActionTimer) { clearInterval(match.botActionTimer); match.botActionTimer = null; }

  const now = Date.now();
  const durationMs = match.roundStartTime ? now - match.roundStartTime : ROUND_DURATION_MS;

  const p1Action = match.player1Action;
  const p2Action = match.player2Action;

  let p1Hit = false;
  let p2Hit = false;

  if (p1Action && p2Action) {
    p1Hit = validateHit(p1Action, p2Action);
    p2Hit = validateHit(p2Action, p1Action);
  } else if (p1Action && !p2Action) {
    p1Hit = true;
  } else if (!p1Action && p2Action) {
    p2Hit = true;
  }

  let roundWinnerId: number | null = null;
  if (p1Hit && !p2Hit) {
    roundWinnerId = match.player1.userId;
    match.player1Rounds++;
  } else if (p2Hit && !p1Hit) {
    roundWinnerId = match.player2.userId;
    match.player2Rounds++;
  }

  const isFinalRound = match.player1Rounds >= ROUNDS_TO_WIN || match.player2Rounds >= ROUNDS_TO_WIN;

  // Save to DB (skip for bot matches to avoid errors)
  if (match.currentRoundId && !match.player1.isBot && !match.player2.isBot) {
    await completeRound(match.currentRoundId, roundWinnerId, p1Hit, p2Hit, durationMs, isFinalRound, p1Action, p2Action).catch(() => {});
    await updateMatchScore(matchId, match.player1Rounds, match.player2Rounds, match.player1Rounds + match.player2Rounds).catch(() => {});
  }

  const roundResult = {
    roundWinnerId,
    p1Hit,
    p2Hit,
    p1Action,
    p2Action,
    player1Rounds: match.player1Rounds,
    player2Rounds: match.player2Rounds,
    isFinalRound,
  };

  log("round_result", { matchId, roundWinnerId, p1Hit, p2Hit, p1Rounds: match.player1Rounds, p2Rounds: match.player2Rounds });

  const p1Sock = io.sockets.sockets.get(match.player1.socketId);
  const p2Sock = io.sockets.sockets.get(match.player2.socketId);
  if (p1Sock) p1Sock.emit("round_result", roundResult);
  if (p2Sock) p2Sock.emit("round_result", roundResult);

  // 2D-compatible events: emit round_result with heart counts
  // Hearts = 3 - rounds lost (opponent's rounds won)
  const p1Hearts = 3 - match.player2Rounds; // p1 loses hearts when p2 wins
  const p2Hearts = 3 - match.player1Rounds; // p2 loses hearts when p1 wins
  if (p1Sock) {
    p1Sock.emit("round_result", {
      ...roundResult,
      isMe: true,
      shooterWon: p1Hit,
      playerHearts: p1Hearts,
      opponentHearts: p2Hearts,
    });
    if (!isFinalRound) {
      setTimeout(() => p1Sock.emit("round_start", { isMyTurn: true, statusMsg: "TAP TO SHOOT" }), 2600);
    }
  }
  if (p2Sock && !match.player2.isBot) {
    p2Sock.emit("round_result", {
      ...roundResult,
      isMe: true,
      shooterWon: p2Hit,
      playerHearts: p2Hearts,
      opponentHearts: p1Hearts,
    });
    if (!isFinalRound) {
      setTimeout(() => p2Sock.emit("round_start", { isMyTurn: true, statusMsg: "TAP TO SHOOT" }), 2600);
    }
  }

  if (isFinalRound) {
    setTimeout(() => finalizeMatch(io, matchId), 2500);
  } else {
    match.player1Action = null;
    match.player2Action = null;
    match.roundStartTime = null;
    match.currentRoundId = null;
    setTimeout(() => startRound(io, matchId), 2500);
  }
}

async function startRound(io: SocketIOServer, matchId: number) {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== "active") return;

  const roundNumber = match.player1Rounds + match.player2Rounds + 1;
  match.player1Action = null;
  match.player2Action = null;
  match.roundStartTime = Date.now();

  // Create round in DB for real matches
  if (!match.player1.isBot && !match.player2.isBot) {
    try {
      match.currentRoundId = await createRound(matchId, roundNumber);
    } catch { match.currentRoundId = null; }
  } else {
    match.currentRoundId = null;
  }

  log("round_start", { matchId, roundNumber });

  const roundPayload = {
    roundNumber,
    durationMs: ROUND_DURATION_MS,
    player1Rounds: match.player1Rounds,
    player2Rounds: match.player2Rounds,
  };

  const p1Sock = io.sockets.sockets.get(match.player1.socketId);
  const p2Sock = io.sockets.sockets.get(match.player2.socketId);
  if (p1Sock) p1Sock.emit("round_start", roundPayload);
  if (p2Sock) p2Sock.emit("round_start", roundPayload);

  // Auto-process on timeout
  match.roundTimer = setTimeout(() => {
    log("round_timeout", { matchId, roundNumber });
    processRound(io, matchId);
  }, ROUND_DURATION_MS);

  // Schedule bot action if applicable
  if (match.player2.isBot) {
    const botDelay = 1500 + Math.random() * 4000;
    match.botActionTimer = setInterval(async () => {
      const m = activeMatches.get(matchId);
      if (!m || m.status !== "active") {
        if (m?.botActionTimer) { clearInterval(m.botActionTimer); m.botActionTimer = null; }
        return;
      }
      if (!m.player2Action) {
        m.player2Action = generateBotAction();
        log("bot_action", { matchId, action: m.player2Action });
        if (m.player1Action) {
          if (m.botActionTimer) { clearInterval(m.botActionTimer); m.botActionTimer = null; }
          await processRound(io, matchId);
        }
      }
    }, botDelay);
  }
}

async function finalizeMatch(io: SocketIOServer, matchId: number) {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== "active") return;

  match.status = "completed";
  if (match.roundTimer) { clearTimeout(match.roundTimer); match.roundTimer = null; }
  if (match.botActionTimer) { clearInterval(match.botActionTimer); match.botActionTimer = null; }

  const winnerId = match.player1Rounds >= ROUNDS_TO_WIN ? match.player1.userId : match.player2.userId;
  const loserId = winnerId === match.player1.userId ? match.player2.userId : match.player1.userId;

  const potAmount = match.stakeAmount * 2;
  const payoutAmount = calculatePayout(potAmount);

  log("match_finalized", { matchId, winnerId, loserId, payoutAmount, isBot: match.player1.isBot || match.player2.isBot });

  // Only do financial ops for real (non-bot) matches
  const isBotMatch = match.player1.isBot || match.player2.isBot;
  if (!isBotMatch) {
    await completeMatch(matchId, winnerId, payoutAmount).catch(() => {});
    await creditWallet(winnerId, payoutAmount, "payout", `Match #${matchId} winnings`, matchId).catch(() => {});
    await updatePlayerStatsAfterMatch(winnerId, loserId, payoutAmount).catch(() => {});
    await createNotification(winnerId, "payout_received", "You won!", `You earned $${payoutAmount.toFixed(2)} in match #${matchId}`, { matchId }).catch(() => {});
    await createNotification(loserId, "system", "Match over", `You lost match #${matchId}. Better luck next time!`, { matchId }).catch(() => {});
    const loserWallet = await getWallet(loserId).catch(() => null);
    if (loserWallet && parseFloat(String(loserWallet.balance)) < 0.10) {
      await createNotification(loserId, "low_balance", "Low Balance", "Your balance is below $0.10. Top up to keep playing!", {}).catch(() => {});
    }
  } else {
    // Bot match: update stats for real player only
    const realId = match.player1.isBot ? match.player2.userId : match.player1.userId;
    const fakeOpponentId = match.player1.isBot ? match.player1.userId : match.player2.userId;
    if (realId > 0) {
      const realWon = winnerId === realId;
      const wId = realWon ? realId : fakeOpponentId;
      const lId = realWon ? fakeOpponentId : realId;
      await updatePlayerStatsAfterMatch(wId, lId, 0).catch(() => {});
    }
  }

  const matchResult = {
    winnerId,
    loserId,
    payoutAmount: isBotMatch ? 0 : payoutAmount,
    player1Rounds: match.player1Rounds,
    player2Rounds: match.player2Rounds,
    matchId,
    isBotMatch,
  };

  const winnerSock = userToSocket.get(winnerId);
  const loserSock = userToSocket.get(loserId);
  if (winnerSock) io.to(winnerSock).emit("match_result", { ...matchResult, isWinner: true });
  if (loserSock) io.to(loserSock).emit("match_result", { ...matchResult, isWinner: false });

  // 2D-compatible match_over event
  if (winnerSock) {
    io.to(winnerSock).emit("match_over", {
      playerWon: true,
      playerHearts: match.player1.userId === winnerId ? 3 - match.player2Rounds : 3 - match.player1Rounds,
      opponentHearts: 0,
    });
  }
  if (loserSock) {
    io.to(loserSock).emit("match_over", {
      playerWon: false,
      playerHearts: 0,
      opponentHearts: match.player1.userId === winnerId ? 3 - match.player2Rounds : 3 - match.player1Rounds,
    });
  }

  // Cleanup
  userToMatch.delete(match.player1.userId);
  userToMatch.delete(match.player2.userId);
  activeMatches.delete(matchId);
}

// ─── Matchmaking ──────────────────────────────────────────────────────────────
async function tryMatchmaking(io: SocketIOServer) {
  if (matchmakingQueue.length < 2) return;

  const player1 = matchmakingQueue.shift()!;
  const player2 = matchmakingQueue.shift()!;

  log("matchmaking_pair", { p1: player1.userId, p2: player2.userId });

  const p1Socket = io.sockets.sockets.get(player1.socketId);
  const p2Socket = io.sockets.sockets.get(player2.socketId);

  if (!p1Socket) {
    log("matchmaking_p1_gone", { p1: player1.userId });
    if (p2Socket) matchmakingQueue.unshift(player2);
    return;
  }
  if (!p2Socket) {
    log("matchmaking_p2_gone", { p2: player2.userId });
    if (p1Socket) matchmakingQueue.unshift(player1);
    return;
  }

  const stakeAmount = Math.min(player1.stakeAmount, player2.stakeAmount);

  try {
    await debitWallet(player1.userId, stakeAmount, "stake", "Match stake", undefined);
    await debitWallet(player2.userId, stakeAmount, "stake", "Match stake", undefined);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Insufficient balance";
    log("matchmaking_debit_fail", { error: errMsg });
    p1Socket.emit("matchmaking_error", { message: errMsg });
    p2Socket.emit("matchmaking_error", { message: errMsg });
    return;
  }

  let matchId: number;
  try {
    matchId = await createMatch(player1.userId, player2.userId, stakeAmount);
  } catch (err) {
    log("matchmaking_create_fail", { error: String(err) });
    p1Socket.emit("matchmaking_error", { message: "Failed to create match" });
    p2Socket.emit("matchmaking_error", { message: "Failed to create match" });
    return;
  }

  const p1Info = await getUserById(player1.userId).catch(() => null);
  const p2Info = await getUserById(player2.userId).catch(() => null);

  const matchData: ActiveMatch = {
    matchId,
    player1: { userId: player1.userId, socketId: player1.socketId },
    player2: { userId: player2.userId, socketId: player2.socketId },
    stakeAmount,
    player1Rounds: 0,
    player2Rounds: 0,
    currentRoundId: null,
    roundStartTime: null,
    roundTimer: null,
    botActionTimer: null,
    player1Action: null,
    player2Action: null,
    status: "active",
  };

  activeMatches.set(matchId, matchData);
  userToMatch.set(player1.userId, matchId);
  userToMatch.set(player2.userId, matchId);

  log("match_created", { matchId, p1: player1.userId, p2: player2.userId, stakeAmount });

  p1Socket.emit("match_found", {
    matchId, stakeAmount, playerNumber: 1,
    opponent: { id: player2.userId, name: p2Info?.name || "Opponent" },
  });
  p2Socket.emit("match_found", {
    matchId, stakeAmount, playerNumber: 2,
    opponent: { id: player1.userId, name: p1Info?.name || "Opponent" },
  });

  await createNotification(player1.userId, "match_found", "Match Found!", `You are matched against ${p2Info?.name || "an opponent"}`, { matchId }).catch(() => {});
  await createNotification(player2.userId, "match_found", "Match Found!", `You are matched against ${p1Info?.name || "an opponent"}`, { matchId }).catch(() => {});

  setTimeout(() => startRound(io, matchId), 3000);
}

// ─── Bot Match ────────────────────────────────────────────────────────────────
async function startBotMatch(io: SocketIOServer, userId: number, socketId: string) {
  if (userToMatch.has(userId)) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) sock.emit("matchmaking_error", { message: "Already in a match" });
    return;
  }

  log("bot_match_start", { userId });

  // Create a dummy match in DB with userId vs userId (bot placeholder)
  let matchId: number;
  try {
    matchId = await createMatch(userId, userId, 0);
  } catch (err) {
    log("bot_match_create_fail", { error: String(err) });
    const sock = io.sockets.sockets.get(socketId);
    if (sock) sock.emit("matchmaking_error", { message: "Failed to create bot match" });
    return;
  }

  const matchData: ActiveMatch = {
    matchId,
    player1: { userId, socketId, isBot: false },
    player2: { userId: BOT_USER_ID, socketId: "bot-socket", isBot: true },
    stakeAmount: 0,
    player1Rounds: 0,
    player2Rounds: 0,
    currentRoundId: null,
    roundStartTime: null,
    roundTimer: null,
    botActionTimer: null,
    player1Action: null,
    player2Action: null,
    status: "active",
  };

  activeMatches.set(matchId, matchData);
  userToMatch.set(userId, matchId);

  log("bot_match_created", { matchId, userId });

  const sock = io.sockets.sockets.get(socketId);
  if (sock) {
    sock.emit("match_found", {
      matchId,
      stakeAmount: 0,
      playerNumber: 1,
      opponent: { id: BOT_USER_ID, name: "B0T-ALPHA [AI]" },
    });
  }

  setTimeout(() => startRound(io, matchId), 3000);
}

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
export function initGameSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });

  // ── Auth Middleware: validate session cookie on handshake ──────────────────
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookieString(cookieHeader);
      const sessionCookie = cookies.get(COOKIE_NAME);

      if (sessionCookie) {
        const session = await sdk.verifySession(sessionCookie).catch(() => null);
        if (session) {
          const user = await getUserByOpenId(session.openId).catch(() => null);
          if (user) {
            (socket as any).userId = user.id;
            log("auth_ok", { socketId: socket.id, userId: user.id, name: user.name });
          } else {
            log("auth_user_missing", { openId: session.openId });
            (socket as any).userId = null;
          }
        } else {
          log("auth_invalid_session", { socketId: socket.id });
          (socket as any).userId = null;
        }
      } else {
        log("auth_no_cookie", { socketId: socket.id });
        (socket as any).userId = null;
      }
    } catch (err) {
      log("auth_error", { error: String(err) });
      (socket as any).userId = null;
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    const cookieUserId: number | null = (socket as any).userId ?? null;
    log("connected", { socketId: socket.id, userId: cookieUserId });

    // Register immediately if authenticated via cookie
    if (cookieUserId) {
      const oldSocketId = userToSocket.get(cookieUserId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSock = io.sockets.sockets.get(oldSocketId);
        if (oldSock) {
          log("evict_old_socket", { userId: cookieUserId, old: oldSocketId });
          oldSock.disconnect();
        }
      }
      socketToUser.set(socket.id, cookieUserId);
      userToSocket.set(cookieUserId, socket.id);
      socket.emit("authenticated", { userId: cookieUserId });
    }

    // Fallback: client-sent authenticate (for dev/testing)
    socket.on("authenticate", async (data: { userId: number }) => {
      const { userId } = data;
      if (!userId || typeof userId !== "number") return;
      if (socketToUser.has(socket.id)) {
        socket.emit("authenticated", { userId: socketToUser.get(socket.id) });
        return;
      }
      log("legacy_auth", { socketId: socket.id, userId });
      const oldSocketId = userToSocket.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSock = io.sockets.sockets.get(oldSocketId);
        if (oldSock) oldSock.disconnect();
      }
      socketToUser.set(socket.id, userId);
      userToSocket.set(userId, socket.id);
      socket.emit("authenticated", { userId });
    });

    // ── Join matchmaking queue ─────────────────────────────────────────────
    socket.on("join_queue", async (data: { stakeAmount: number; eloRating?: number }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        log("join_queue_unauth", { socketId: socket.id });
        socket.emit("matchmaking_error", { message: "Not authenticated. Please log in." });
        return;
      }

      const stakeAmount = Math.max(MIN_STAKE, parseFloat(String(data.stakeAmount)) || 0.10);

      const wallet = await getWallet(userId).catch(() => null);
      if (!wallet || parseFloat(String(wallet.balance)) < stakeAmount) {
        socket.emit("matchmaking_error", { message: `Insufficient balance. Need $${stakeAmount.toFixed(2)}` });
        return;
      }

      if (userToMatch.has(userId)) {
        socket.emit("matchmaking_error", { message: "Already in a match" });
        return;
      }

      const existingIdx = matchmakingQueue.findIndex(q => q.userId === userId);
      if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);

      matchmakingQueue.push({
        userId,
        socketId: socket.id,
        stakeAmount,
        eloRating: data.eloRating || 1000,
        joinedAt: Date.now(),
      });

      log("queue_joined", { userId, stakeAmount, queueSize: matchmakingQueue.length });
      socket.emit("queue_joined", { position: matchmakingQueue.length, stakeAmount });
      io.emit("queue_size", { size: matchmakingQueue.length });

      await tryMatchmaking(io);
    });

    // ── Play vs Bot ────────────────────────────────────────────────────────
    socket.on("join_bot_match", async () => {
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit("matchmaking_error", { message: "Not authenticated. Please log in." });
        return;
      }
      await startBotMatch(io, userId, socket.id);
    });

    // ── Force Match (instant bot match for testing) ────────────────────────
    socket.on("force_match", async () => {
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit("matchmaking_error", { message: "Not authenticated" });
        return;
      }
      log("force_match", { userId });
      await startBotMatch(io, userId, socket.id);
    });

    // ── Leave queue ────────────────────────────────────────────────────────
    socket.on("leave_queue", () => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;
      const idx = matchmakingQueue.findIndex(q => q.userId === userId);
      if (idx !== -1) matchmakingQueue.splice(idx, 1);
      io.emit("queue_size", { size: matchmakingQueue.length });
      socket.emit("queue_left", {});
      log("queue_left", { userId });
    });

    // ── Player action ──────────────────────────────────────────────────────
    socket.on("player_action", async (data: PlayerAction) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      const matchId = userToMatch.get(userId);
      if (!matchId) return;

      const match = activeMatches.get(matchId);
      if (!match || match.status !== "active") return;

      if (
        typeof data.targetZone !== "number" || typeof data.moveZone !== "number" ||
        data.targetZone < 0 || data.targetZone > 2 ||
        data.moveZone < 0 || data.moveZone > 2
      ) {
        socket.emit("error", { message: "Invalid action" });
        return;
      }

      const action: PlayerAction = {
        targetZone: data.targetZone,
        moveZone: data.moveZone,
        timestamp: Date.now(),
        weaponSlug: data.weaponSlug || "void-cannon",
      };

      log("player_action", { userId, matchId, targetZone: action.targetZone, moveZone: action.moveZone });

      if (userId === match.player1.userId && !match.player1Action) {
        match.player1Action = action;
      } else if (userId === match.player2.userId && !match.player2Action) {
        match.player2Action = action;
      }

      if (match.player1Action && match.player2Action) {
        await processRound(io, matchId);
      }
    });

    // ── Chat ───────────────────────────────────────────────────────────────
    socket.on("chat_message", async (data: { message: string; messageType?: "text" | "quick" }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;
      const matchId = userToMatch.get(userId);
      if (!matchId) return;
      const match = activeMatches.get(matchId);
      if (!match) return;

      const rawMessage = (data.message || "").slice(0, 200).trim();
      if (!rawMessage) return;

      const saved = await saveChatMessage(matchId, userId, rawMessage, data.messageType || "text").catch(() => null);
      if (!saved) return;

      const chatPayload = {
        id: saved.id,
        senderId: userId,
        message: saved.message,
        filtered: saved.filtered,
        messageType: data.messageType || "text",
        timestamp: Date.now(),
      };

      const p1Sock = io.sockets.sockets.get(match.player1.socketId);
      const p2Sock = io.sockets.sockets.get(match.player2.socketId);
      if (p1Sock) p1Sock.emit("chat_message", chatPayload);
      if (p2Sock) p2Sock.emit("chat_message", chatPayload);
    });

    // ── 2D Bridge: player_shot (tap-to-shoot) ───────────────────────────────
    // Converts normalized tap (nx 0–1) to a zone and submits as player_action
    socket.on("player_shot", async (data: { matchId?: string | number; nx: number; ny: number }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;
      const mId = userToMatch.get(userId);
      if (!mId) return;
      const match = activeMatches.get(mId);
      if (!match || match.status !== "active") return;
      // Convert nx (0–1) to zone: left=0, center=1, right=2
      const targetZone = data.nx < 0.33 ? 0 : data.nx < 0.66 ? 1 : 2;
      const moveZone = Math.floor(Math.random() * 3);
      const action: PlayerAction = { targetZone, moveZone, timestamp: Date.now(), weaponSlug: "void-cannon" };
      log("player_shot_2d", { userId, mId, nx: data.nx, targetZone });
      // Broadcast shot to opponent for visual feedback
      const opponentId = match.player1.userId === userId ? match.player2.userId : match.player1.userId;
      const opponentSockId = userToSocket.get(opponentId);
      if (opponentSockId && !match.player2.isBot) {
        io.to(opponentSockId).emit("opponent_shot", { nx: data.nx, ny: data.ny });
      }
      if (userId === match.player1.userId && !match.player1Action) {
        match.player1Action = action;
      } else if (userId === match.player2.userId && !match.player2Action) {
        match.player2Action = action;
      }
      if (match.player1Action && match.player2Action) {
        await processRound(io, mId);
      }
    });

    // ── 2D Bridge: join_match (request current match state) ──────────────────
    socket.on("join_match", (data: { matchId?: string | number }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;
      const mId = userToMatch.get(userId);
      if (!mId) return;
      const match = activeMatches.get(mId);
      if (!match) return;
      const isP1 = match.player1.userId === userId;
      const myRoundsWon = isP1 ? match.player1Rounds : match.player2Rounds;
      const oppRoundsWon = isP1 ? match.player2Rounds : match.player1Rounds;
      const playerHearts = 3 - oppRoundsWon;
      const opponentHearts = 3 - myRoundsWon;
      const opponentName = match.player2.isBot ? "B0T-ALPHA" : "Opponent";
      socket.emit("match_state", {
        playerHearts, opponentHearts, isMyTurn: true, matchOver: false,
        opponentName, statusMsg: "TAP TO SHOOT",
      });
      log("join_match_2d", { userId, mId, playerHearts, opponentHearts });
    });

    // ── Rematch ────────────────────────────────────────────────────────────
    socket.on("rematch_request", async (data: { matchId: number }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;
      const dbMatch = await getMatch(data.matchId).catch(() => null);
      if (!dbMatch || dbMatch.status !== "completed") return;
      const opponentId = dbMatch.player1Id === userId ? dbMatch.player2Id : dbMatch.player1Id;
      const opponentSocket = userToSocket.get(opponentId);
      if (opponentSocket) {
        io.to(opponentSocket).emit("rematch_challenge", { fromUserId: userId, matchId: data.matchId });
        await createNotification(opponentId, "rematch_challenge", "Rematch Challenge!", "Your opponent wants a rematch!", { matchId: data.matchId }).catch(() => {});
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const userId = socketToUser.get(socket.id);
      log("disconnected", { socketId: socket.id, userId: userId ?? "unauthenticated" });

      if (userId) {
        socketToUser.delete(socket.id);
        userToSocket.delete(userId);

        const idx = matchmakingQueue.findIndex(q => q.userId === userId);
        if (idx !== -1) {
          matchmakingQueue.splice(idx, 1);
          io.emit("queue_size", { size: matchmakingQueue.length });
        }

        const matchId = userToMatch.get(userId);
        if (matchId) {
          const match = activeMatches.get(matchId);
          if (match && match.status === "active") {
            const opponentId = match.player1.userId === userId ? match.player2.userId : match.player1.userId;
            const opponentSocket = userToSocket.get(opponentId);
            if (opponentSocket) io.to(opponentSocket).emit("opponent_disconnected", {});

            setTimeout(async () => {
              if (!userToSocket.has(userId) && activeMatches.has(matchId)) {
                const m = activeMatches.get(matchId);
                if (m && m.status === "active") {
                  m.player1Rounds = m.player1.userId === opponentId ? ROUNDS_TO_WIN : 0;
                  m.player2Rounds = m.player2.userId === opponentId ? ROUNDS_TO_WIN : 0;
                  await finalizeMatch(io, matchId);
                }
              }
            }, 10000);
          }
        }
      }
    });
  });

  log("initialized", { path: "/api/socket.io" });
  return io;
}
