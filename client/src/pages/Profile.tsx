import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const TIER_COLORS: Record<string, string> = {
  bronze: "oklch(0.65 0.15 55)",
  silver: "oklch(0.75 0.05 240)",
  gold: "oklch(0.80 0.20 80)",
  platinum: "oklch(0.85 0.10 195)",
  diamond: "oklch(0.75 0.25 230)",
  apex: "oklch(0.65 0.30 320)",
};

const TIER_THRESHOLDS = [
  { tier: "BRONZE", min: 0, max: 1099 },
  { tier: "SILVER", min: 1100, max: 1249 },
  { tier: "GOLD", min: 1250, max: 1399 },
  { tier: "PLATINUM", min: 1400, max: 1599 },
  { tier: "DIAMOND", min: 1600, max: 1799 },
  { tier: "APEX", min: 1800, max: 9999 },
];

const PAINT_PALETTE = ["#00e5ff","#ff3333","#ff6600","#cc00ff","#00ff88","#ffcc00","#ff0088","#0088ff"];
function getPaintColor(name: string): string {
  if (!name) return "#00e5ff";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PAINT_PALETTE[Math.abs(hash) % PAINT_PALETTE.length];
}

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats } = trpc.stats.getMyStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: history } = trpc.matches.getHistory.useQuery({ limit: 20 }, { enabled: isAuthenticated });
  const { data: wallet } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });

  const paintColor = getPaintColor(user?.name ?? "");

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

  const winRate = stats && stats.totalMatches > 0
    ? Math.round((stats.wins / stats.totalMatches) * 100)
    : 0;

  const currentTierInfo = TIER_THRESHOLDS.find(t => stats && stats.elo >= t.min && stats.elo <= t.max);
  const nextTierInfo = currentTierInfo ? TIER_THRESHOLDS[TIER_THRESHOLDS.indexOf(currentTierInfo) + 1] : null;
  const tierProgress = currentTierInfo && nextTierInfo && stats
    ? ((stats.elo - currentTierInfo.min) / (nextTierInfo.min - currentTierInfo.min)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">PLAYER_PROFILE</span>
          <button
            onClick={() => logout()}
            className="font-mono text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            DISCONNECT
          </button>
        </div>
      </nav>

      <div className="container py-8 max-w-3xl mx-auto">
        {/* Player header */}
        <div className="game-panel p-6 mb-6" style={{ borderLeft: `4px solid ${paintColor}`, boxShadow: `0 0 24px ${paintColor}22` }}>
          <div className="flex items-center gap-6">
            {/* Paint identity avatar */}
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${paintColor}cc, ${paintColor}44)`,
              border: `3px solid ${paintColor}`,
              boxShadow: `0 0 20px ${paintColor}66`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "900",
              color: "#fff",
              fontFamily: "Rajdhani, sans-serif",
              flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="text-xl font-black text-foreground" style={{ fontFamily: "Rajdhani, sans-serif" }}>{user?.name || "UNKNOWN"}</div>
              <div className="error-code" style={{ color: paintColor + "99" }}>{user?.email || ""}</div>
              {stats && (
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-sm font-bold tier-${stats.tier}`}>{stats.tier.toUpperCase()}</span>
                  <span className="text-xs font-mono text-muted-foreground">ELO {stats.elo}</span>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: paintColor, boxShadow: `0 0 6px ${paintColor}` }} />
                  <span className="text-xs font-mono" style={{ color: paintColor }}>PAINT ID: {paintColor.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="error-code mb-1">WALLET</div>
              <div className="text-2xl font-black" style={{ color: paintColor }}>${wallet?.balance.toFixed(2) ?? "0.00"}</div>
              <button onClick={() => navigate("/wallet")} className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors mt-1">
                TOP UP →
              </button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">WINS</div>
              <div className="text-3xl font-black text-green-400">{stats.wins}</div>
            </div>
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">LOSSES</div>
              <div className="text-3xl font-black text-destructive">{stats.losses}</div>
            </div>
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">WIN RATE</div>
              <div className="text-3xl font-black text-primary">{winRate}%</div>
            </div>
            <div className="game-panel p-4 text-center">
              <div className="error-code mb-1">STREAK</div>
              <div className="text-3xl font-black neon-magenta">{stats.currentWinStreak}</div>
              <div className="text-xs font-mono text-muted-foreground">BEST: {stats.bestWinStreak}</div>
            </div>
          </div>
        )}

        {/* ELO Progress */}
        {stats && (
          <div className="game-panel p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="error-code">ELO_PROGRESSION</div>
              <div className="font-mono text-sm text-primary">{stats.elo} ELO</div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-mono tier-${stats.tier}`}>{stats.tier.toUpperCase()}</span>
              <div className="flex-1 h-2 bg-muted overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, tierProgress)}%`,
                    background: TIER_COLORS[stats.tier],
                    boxShadow: `0 0 8px ${TIER_COLORS[stats.tier]}`,
                  }}
                />
              </div>
              {nextTierInfo && (
                <span className="text-xs font-mono text-muted-foreground">{nextTierInfo.tier}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-muted-foreground">
                TOTAL EARNED: <span className="text-primary">${parseFloat(stats.totalEarnings as string).toFixed(2)}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                TOTAL MATCHES: <span className="text-foreground">{stats.totalMatches}</span>
              </div>
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="game-panel">
          <div className="p-4 border-b border-border">
            <div className="error-code">MATCH_HISTORY</div>
          </div>
          <div className="divide-y divide-border">
            {!history || history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                NO MATCHES RECORDED
              </div>
            ) : (
              history.map((match) => {
                const isWinner = match.winnerId === user?.id;
                const isPlayer1 = match.player1Id === user?.id;
                const myRounds = isPlayer1 ? match.player1Rounds : match.player2Rounds;
                const oppRounds = isPlayer1 ? match.player2Rounds : match.player1Rounds;
                return (
                  <div key={match.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-8 ${isWinner ? "bg-green-400" : "bg-destructive"}`}
                      />
                      <div>
                        <div className={`text-sm font-bold ${isWinner ? "text-green-400" : "text-destructive"}`}>
                          {isWinner ? "VICTORY" : "DEFEAT"}
                        </div>
                        <div className="error-code">MATCH #{match.id}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-sm">
                        <span className="text-primary">{myRounds}</span>
                        <span className="text-muted-foreground"> — </span>
                        <span className="text-destructive">{oppRounds}</span>
                      </div>
                      <div className="error-code">ROUNDS</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
                        {isWinner ? `+$${parseFloat(match.payoutAmount as string || "0").toFixed(2)}` : `-$${parseFloat(match.stakeAmount as string).toFixed(2)}`}
                      </div>
                      <div className="error-code">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
