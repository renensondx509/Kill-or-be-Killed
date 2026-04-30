import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getPaintColor } from "@/lib/gameUtils";

export interface MatchStatus {
  playerHearts: number;
  opponentHearts: number;
  isMyTurn: boolean;
  matchOver: boolean;
  playerWon: boolean | null;
  roundStarting: boolean;
  playerHit: boolean;
  opponentHit: boolean;
  opponentShot: { nx: number; ny: number } | null;
  statusMsg: string;
}

export function useMatchViewModel(matchId: string | undefined) {
  const [, navigate] = useLocation();
  const { socket, connected } = useSocket();
  const { user } = useAuth();

  const [status, setStatus] = useState<MatchStatus>({
    playerHearts: 3,
    opponentHearts: 3,
    isMyTurn: true,
    matchOver: false,
    playerWon: null,
    roundStarting: false,
    playerHit: false,
    opponentHit: false,
    opponentShot: null,
    statusMsg: "CONNECTING...",
  });
  const [showActions, setShowActions] = useState(false);
  const [opponentName, setOpponentName] = useState("OPPONENT");
  const [opponentColor, setOpponentColor] = useState(getPaintColor("OPPONENT"));
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket || !matchId) return;

    const updateState = (partial: Partial<MatchStatus>) => {
      setStatus((prev) => ({ ...prev, ...partial }));
    };

    const onMatchState = (data: {
      playerHearts?: number;
      opponentHearts?: number;
      isMyTurn?: boolean;
      matchOver?: boolean;
      playerWon?: boolean;
      roundStarting?: boolean;
      opponentName?: string;
      statusMsg?: string;
    }) => {
      if (data.opponentName) {
        setOpponentName(data.opponentName);
        setOpponentColor(getPaintColor(data.opponentName));
      }
      setStatus((prev) => ({
        ...prev,
        playerHearts: data.playerHearts ?? prev.playerHearts,
        opponentHearts: data.opponentHearts ?? prev.opponentHearts,
        isMyTurn: data.isMyTurn ?? prev.isMyTurn,
        matchOver: data.matchOver ?? prev.matchOver,
        playerWon: data.playerWon ?? prev.playerWon,
        roundStarting: data.roundStarting ?? false,
        playerHit: false,
        opponentHit: false,
        opponentShot: null,
        statusMsg: data.statusMsg ?? prev.statusMsg,
      }));
    };

    const onRoundResult = (data: {
      shooterWon: boolean;
      isMe: boolean;
      nx?: number;
      ny?: number;
      playerHearts: number;
      opponentHearts: number;
    }) => {
      const opponentFired = !data.isMe;
      const iGotHit = opponentFired && data.shooterWon;
      const iHitThem = !opponentFired && data.shooterWon;
      setStatus((prev) => ({
        ...prev,
        playerHearts: data.playerHearts,
        opponentHearts: data.opponentHearts,
        playerHit: iGotHit,
        opponentHit: iHitThem,
        opponentShot: opponentFired && data.nx !== undefined && data.ny !== undefined ? { nx: data.nx!, ny: data.ny! } : null,
        isMyTurn: true,
        statusMsg: iGotHit ? "YOU WERE HIT!" : iHitThem ? "HIT!" : "MISS",
      }));
    };

    const onMatchOver = (data: { playerWon: boolean; playerHearts: number; opponentHearts: number }) => {
      setStatus((prev) => ({
        ...prev,
        matchOver: true,
        playerWon: data.playerWon,
        playerHearts: data.playerHearts,
        opponentHearts: data.opponentHearts,
        statusMsg: data.playerWon ? "YOU WIN!" : "YOU LOSE",
      }));
      setShowActions(false);
      setTimeout(() => setShowActions(true), 1200);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => navigate("/lobby"), 8000);
    };

    const onOpponentShot = (data: { nx: number; ny: number }) => {
      updateState({ opponentShot: data });
    };

    const onRoundStart = (data: { isMyTurn: boolean; statusMsg?: string }) => {
      setStatus((prev) => ({
        ...prev,
        isMyTurn: data.isMyTurn,
        roundStarting: true,
        playerHit: false,
        opponentHit: false,
        opponentShot: null,
        statusMsg: data.statusMsg ?? (data.isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"),
      }));
      setTimeout(() => setStatus((prev) => ({ ...prev, roundStarting: false })), 300);
    };

    socket.on("match_state", onMatchState);
    socket.on("round_result", onRoundResult);
    socket.on("match_over", onMatchOver);
    socket.on("opponent_shot", onOpponentShot);
    socket.on("round_start", onRoundStart);
    socket.emit("join_match", { matchId });

    return () => {
      socket.off("match_state", onMatchState);
      socket.off("round_result", onRoundResult);
      socket.off("match_over", onMatchOver);
      socket.off("opponent_shot", onOpponentShot);
      socket.off("round_start", onRoundStart);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [socket, matchId, navigate]);

  const playerName = useMemo(() => user?.name ?? "YOU", [user?.name]);
  const playerColor = useMemo(() => getPaintColor(playerName), [playerName]);

  const handleTap = useCallback(
    (nx: number, ny: number) => {
      if (!socket || !status.isMyTurn || status.matchOver || !matchId) return;
      socket.emit("player_shot", { matchId, nx, ny });
      setStatus((prev) => ({ ...prev, isMyTurn: false, statusMsg: "SHOT FIRED..." }));
    },
    [socket, status.isMyTurn, status.matchOver, matchId]
  );

  const handleRematch = useCallback(() => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setShowActions(false);
    navigate("/lobby");
  }, [navigate]);

  return {
    playerName,
    opponentName,
    playerColor,
    opponentColor,
    connected,
    showActions,
    status,
    handleTap,
    handleRematch,
  };
}
