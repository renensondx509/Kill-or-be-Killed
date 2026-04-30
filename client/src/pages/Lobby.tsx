import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

const STAKE_OPTIONS = [0.05, 0.10, 0.25, 0.50, 1.00];

export default function Lobby() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { connected, authenticated, joinQueue, joinBotMatch, forceMatch, leaveQueue, onMatchFound, onMatchmakingError, queueSize } = useSocket();

  const [selectedStake, setSelectedStake] = useState(0.10);
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: walletData } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const { data: statsData } = trpc.stats.getMyStats.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) return;

    const offMatchFound = onMatchFound((data) => {
      setInQueue(false);
      if (timerRef.current) clearInterval(timerRef.current);
      sessionStorage.setItem(`match_${data.matchId}`, JSON.stringify({
        playerNumber: data.playerNumber,
        opponentName: data.opponent.name,
        stakeAmount: data.stakeAmount,
      }));
      const label = data.opponent.name.includes("B0T") ? "BOT" : data.opponent.name;
      toast.success(`Match found! vs ${label}`, { duration: 2000 });
      setTimeout(() => navigate(`/game/${data.matchId}`), 500);
    });

    const offError = onMatchmakingError((data) => {
      setInQueue(false);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.error(data.message);
    });

    return () => { offMatchFound(); offError(); };
  }, [isAuthenticated, onMatchFound, onMatchmakingError, navigate]);

  useEffect(() => {
    if (inQueue) {
      timerRef.current = setInterval(() => setQueueTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setQueueTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [inQueue]);

  const handleJoinQueue = () => {
    if (!connected) { toast.error("Not connected to server. Please refresh."); return; }
    if (!authenticated) { toast.error("Not authenticated yet. Please wait a moment."); return; }
    const balance = walletData?.balance ?? 0;
    if (balance < selectedStake) { toast.error(`Insufficient balance. Need $${selectedStake.toFixed(2)}`); return; }
    setInQueue(true);
    joinQueue(selectedStake, statsData?.elo ?? 1000);
  };

  const handleBotMatch = () => {
    if (!connected) { toast.error("Not connected to server. Please refresh."); return; }
    if (!authenticated) { toast.error("Not authenticated yet. Please wait a moment."); return; }
    joinBotMatch();
    toast.info("Starting match vs BOT...");
  };

  const handleForceMatch = () => {
    if (!connected) { toast.error("Not connected to server."); return; }
    if (!authenticated) { toast.error("Not authenticated."); return; }
    forceMatch();
    toast.info("Force match starting...");
  };

  const handleLeaveQueue = () => {
    leaveQueue();
    setInQueue(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono mb-4">AUTHENTICATION REQUIRED</p>
          <a href={getLoginUrl()} className="border border-primary text-primary px-6 py-2 font-mono text-sm hover:bg-primary hover:text-primary-foreground transition-all">
            CONNECT
          </a>
        </div>
      </div>
    );
  }

  const balance = walletData?.balance ?? 0;
  const canPlay = connected && authenticated;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">MATCHMAKING TERMINAL</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? (authenticated ? "bg-green-400" : "bg-yellow-400") : "bg-destructive"} animate-pulse`} />
            <span className={`font-mono text-xs ${connected ? (authenticated ? "text-green-400" : "text-yellow-400") : "text-destructive"}`}>
              {connected ? (authenticated ? "ONLINE" : "AUTHING...") : "OFFLINE"}
            </span>
          </div>
        </div>
      </nav>

      <div className="container py-12 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="error-code mb-3">QUEUE_MODULE::ACTIVE | PLAYERS_ONLINE: {queueSize}</div>
          <h1 className="text-4xl font-black neon-cyan mb-2">FIND YOUR TARGET</h1>
          <p className="text-muted-foreground font-mono text-sm">Select stake amount and enter the arena</p>
          {/* Tips strip */}
          <div style={{
            marginTop: "16px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            {["Aim for center — highest hit chance", "Dodge opposite to opponent's aim", "First to 3 hits wins the match"].map(tip => (
              <div key={tip} style={{
                background: "rgba(0,229,255,0.05)",
                border: "1px solid #00e5ff22",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#00e5ff88",
                letterSpacing: "1px",
              }}>
                💡 {tip}
              </div>
            ))}
          </div>
        </div>

        {/* Wallet */}
        <div className="game-panel p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="error-code mb-1">WALLET_BALANCE</div>
            <div className="text-2xl font-black text-primary">${balance.toFixed(2)}</div>
          </div>
          <button onClick={() => navigate("/wallet")} className="border border-border text-muted-foreground px-4 py-2 font-mono text-xs hover:border-primary hover:text-primary transition-all">
            TOP UP
          </button>
        </div>

        {/* Stake selector */}
        <div className="game-panel p-6 mb-6">
          <div className="error-code mb-4">SELECT_STAKE_AMOUNT</div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {STAKE_OPTIONS.map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                disabled={inQueue}
                className={`zone-btn py-3 text-sm font-bold ${selectedStake === stake ? "selected" : ""} ${balance < stake ? "opacity-40" : ""}`}
              >
                ${stake.toFixed(2)}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>POT: ${(selectedStake * 2).toFixed(2)}</span>
            <span>YOUR PAYOUT: ~${(selectedStake * 2 * 0.9).toFixed(2)}</span>
            <span>COMMISSION: 10%</span>
          </div>
        </div>

        {/* Action buttons */}
        {!inQueue ? (
          <div className="space-y-3">
            {/* PvP queue */}
            <button
              onClick={handleJoinQueue}
              disabled={!canPlay || balance < selectedStake}
              className="w-full py-5 text-xl font-black tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed border-glow-pulse"
            >
              ENTER QUEUE — ${selectedStake.toFixed(2)}
            </button>

            {/* Bot match */}
            <button
              onClick={handleBotMatch}
              disabled={!canPlay}
              className="w-full py-4 text-base font-black tracking-widest border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⚡ PLAY VS BOT — FREE PRACTICE
            </button>

            {/* Force match debug */}
            <button
              onClick={handleForceMatch}
              disabled={!canPlay}
              className="w-full py-2 text-xs font-mono border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-40"
            >
              [DEBUG] FORCE INSTANT MATCH
            </button>

            {/* Status hints */}
            {connected && !authenticated && (
              <p className="text-center text-yellow-400 font-mono text-xs animate-pulse">
                ⚠ AUTHENTICATING... Please wait or refresh the page.
              </p>
            )}
            {!connected && (
              <p className="text-center text-red-400 font-mono text-xs">
                ✗ DISCONNECTED — Refresh the page to reconnect.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="game-panel p-8 text-center">
              {/* Animated radar */}
              <div style={{
                position: "relative",
                width: "80px",
                height: "80px",
                margin: "0 auto 20px",
              }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid #00e5ff44",
                }} />
                <div style={{
                  position: "absolute",
                  inset: "12px",
                  borderRadius: "50%",
                  border: "1px solid #00e5ff33",
                }} />
                <div style={{
                  position: "absolute",
                  inset: "24px",
                  borderRadius: "50%",
                  border: "1px solid #00e5ff22",
                }} />
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "40px",
                  height: "2px",
                  background: "linear-gradient(to right, #00e5ff, transparent)",
                  transformOrigin: "left center",
                  transform: "translate(0, -50%)",
                  animation: "spin 1.5s linear infinite",
                }} />
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#00e5ff",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 8px #00e5ff",
                }} />
              </div>
              <div className="text-lg font-black neon-cyan mb-2">SCANNING FOR TARGETS</div>
              <div className="font-mono text-sm text-muted-foreground mb-4">
                {String(Math.floor(queueTime / 60)).padStart(2, "0")}:{String(queueTime % 60).padStart(2, "0")}
              </div>
              <div className="error-code">STAKE: ${selectedStake.toFixed(2)} | QUEUE_POSITION: ACTIVE</div>
              {queueTime > 15 && (
                <div className="mt-3 text-yellow-400 font-mono text-xs">
                  No opponents found. Try the BOT match below!
                </div>
              )}
            </div>
            <button onClick={handleLeaveQueue} className="w-full py-3 font-mono text-sm border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
              ABORT SEARCH
            </button>
            {queueTime > 15 && (
              <button onClick={() => { handleLeaveQueue(); setTimeout(handleBotMatch, 100); }} className="w-full py-3 font-mono text-sm border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all">
                ⚡ PLAY VS BOT INSTEAD
              </button>
            )}
          </div>
        )}

        {/* Player stats */}
        {statsData && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">ELO</div>
              <div className="text-2xl font-black text-primary">{statsData.elo}</div>
              <div className={`text-xs font-mono tier-${statsData.tier}`}>{statsData.tier.toUpperCase()}</div>
            </div>
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">WIN RATE</div>
              <div className="text-2xl font-black text-green-400">
                {statsData.totalMatches > 0 ? Math.round((statsData.wins / statsData.totalMatches) * 100) : 0}%
              </div>
              <div className="text-xs font-mono text-muted-foreground">{statsData.wins}W / {statsData.losses}L</div>
            </div>
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">STREAK</div>
              <div className="text-2xl font-black neon-magenta">{statsData.currentWinStreak}</div>
              <div className="text-xs font-mono text-muted-foreground">BEST: {statsData.bestWinStreak}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
