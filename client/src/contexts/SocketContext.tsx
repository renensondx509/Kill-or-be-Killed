import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface PlayerAction {
  targetZone: number;
  moveZone: number;
  timestamp: number;
  weaponSlug: string;
}

interface MatchFoundPayload {
  matchId: number;
  stakeAmount: number;
  playerNumber: 1 | 2;
  opponent: { id: number; name: string };
}

interface RoundStartPayload {
  roundNumber: number;
  durationMs: number;
  player1Rounds: number;
  player2Rounds: number;
}

interface RoundResultPayload {
  roundWinnerId: number | null;
  p1Hit: boolean;
  p2Hit: boolean;
  p1Action: PlayerAction | null;
  p2Action: PlayerAction | null;
  player1Rounds: number;
  player2Rounds: number;
  isFinalRound: boolean;
}

interface MatchResultPayload {
  winnerId: number;
  loserId: number;
  payoutAmount: number;
  player1Rounds: number;
  player2Rounds: number;
  matchId: number;
  isWinner: boolean;
  isBotMatch?: boolean;
}

interface ChatMessagePayload {
  id: number;
  senderId: number;
  message: string;
  filtered: boolean;
  messageType: "text" | "quick";
  timestamp: number;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  authenticated: boolean;
  queueSize: number;
  joinQueue: (stakeAmount: number, eloRating?: number) => void;
  joinBotMatch: () => void;
  forceMatch: () => void;
  leaveQueue: () => void;
  submitAction: (action: Omit<PlayerAction, "timestamp">) => void;
  sendChatMessage: (message: string, messageType?: "text" | "quick") => void;
  requestRematch: (matchId: number) => void;
  onMatchFound: (cb: (data: MatchFoundPayload) => void) => () => void;
  onRoundStart: (cb: (data: RoundStartPayload) => void) => () => void;
  onRoundResult: (cb: (data: RoundResultPayload) => void) => () => void;
  onMatchResult: (cb: (data: MatchResultPayload) => void) => () => void;
  onChatMessage: (cb: (data: ChatMessagePayload) => void) => () => void;
  onRematchChallenge: (cb: (data: { fromUserId: number; matchId: number }) => void) => () => void;
  onOpponentDisconnected: (cb: () => void) => () => void;
  onMatchmakingError: (cb: (data: { message: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Connect with credentials so the session cookie is sent
    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setConnected(true);
      // Also send legacy authenticate in case cookie auth fails
      if (user?.id) {
        socket.emit("authenticate", { userId: user.id });
      }
    });

    socket.on("authenticated", (data: { userId: number }) => {
      console.log("[Socket] Authenticated as user:", data.userId);
      setAuthenticated(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setConnected(false);
      setAuthenticated(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("queue_size", (data: { size: number }) => {
      setQueueSize(data.size);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Only create socket once

  // Re-authenticate when user loads (handles delayed auth)
  useEffect(() => {
    if (user?.id && socketRef.current?.connected) {
      console.log("[Socket] Re-authenticating for user:", user.id);
      socketRef.current.emit("authenticate", { userId: user.id });
    }
  }, [user?.id]);

  const joinQueue = useCallback((stakeAmount: number, eloRating = 1000) => {
    console.log("[Socket] Joining queue:", { stakeAmount, eloRating });
    socketRef.current?.emit("join_queue", { stakeAmount, eloRating });
  }, []);

  const joinBotMatch = useCallback(() => {
    console.log("[Socket] Joining bot match");
    socketRef.current?.emit("join_bot_match");
  }, []);

  const forceMatch = useCallback(() => {
    console.log("[Socket] Force match");
    socketRef.current?.emit("force_match");
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("leave_queue");
  }, []);

  const submitAction = useCallback((action: Omit<PlayerAction, "timestamp">) => {
    socketRef.current?.emit("player_action", { ...action, timestamp: Date.now() });
  }, []);

  const sendChatMessage = useCallback((message: string, messageType: "text" | "quick" = "text") => {
    socketRef.current?.emit("chat_message", { message, messageType });
  }, []);

  const requestRematch = useCallback((matchId: number) => {
    socketRef.current?.emit("rematch_request", { matchId });
  }, []);

  const onMatchFound = useCallback((cb: (data: MatchFoundPayload) => void) => {
    socketRef.current?.on("match_found", cb);
    return () => { socketRef.current?.off("match_found", cb); };
  }, []);

  const onRoundStart = useCallback((cb: (data: RoundStartPayload) => void) => {
    socketRef.current?.on("round_start", cb);
    return () => { socketRef.current?.off("round_start", cb); };
  }, []);

  const onRoundResult = useCallback((cb: (data: RoundResultPayload) => void) => {
    socketRef.current?.on("round_result", cb);
    return () => { socketRef.current?.off("round_result", cb); };
  }, []);

  const onMatchResult = useCallback((cb: (data: MatchResultPayload) => void) => {
    socketRef.current?.on("match_result", cb);
    return () => { socketRef.current?.off("match_result", cb); };
  }, []);

  const onChatMessage = useCallback((cb: (data: ChatMessagePayload) => void) => {
    socketRef.current?.on("chat_message", cb);
    return () => { socketRef.current?.off("chat_message", cb); };
  }, []);

  const onRematchChallenge = useCallback((cb: (data: { fromUserId: number; matchId: number }) => void) => {
    socketRef.current?.on("rematch_challenge", cb);
    return () => { socketRef.current?.off("rematch_challenge", cb); };
  }, []);

  const onOpponentDisconnected = useCallback((cb: () => void) => {
    socketRef.current?.on("opponent_disconnected", cb);
    return () => { socketRef.current?.off("opponent_disconnected", cb); };
  }, []);

  const onMatchmakingError = useCallback((cb: (data: { message: string }) => void) => {
    socketRef.current?.on("matchmaking_error", cb);
    return () => { socketRef.current?.off("matchmaking_error", cb); };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      authenticated,
      queueSize,
      joinQueue,
      joinBotMatch,
      forceMatch,
      leaveQueue,
      submitAction,
      sendChatMessage,
      requestRematch,
      onMatchFound,
      onRoundStart,
      onRoundResult,
      onMatchResult,
      onChatMessage,
      onRematchChallenge,
      onOpponentDisconnected,
      onMatchmakingError,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
