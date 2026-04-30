import { useAuth } from "@/_core/hooks/useAuth";
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

function getTier(elo: number): string {
  if (elo >= 1800) return "apex";
  if (elo >= 1600) return "diamond";
  if (elo >= 1400) return "platinum";
  if (elo >= 1250) return "gold";
  if (elo >= 1100) return "silver";
  return "bronze";
}

export default function Leaderboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: leaders } = trpc.stats.getLeaderboard.useQuery({ limit: 50 });

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">GLOBAL_LEADERBOARD</span>
          <div />
        </div>
      </nav>

      <div className="container py-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="error-code mb-2">COMBAT_RANKINGS_v2.4</div>
          <h1 className="text-3xl font-black neon-cyan">TOP FIGHTERS</h1>
        </div>

        <div className="game-panel">
          <div className="p-4 border-b border-border grid grid-cols-4 gap-2">
            <div className="error-code">RANK</div>
            <div className="error-code col-span-2">FIGHTER</div>
            <div className="error-code text-right">ELO</div>
          </div>

          <div className="divide-y divide-border">
            {!leaders || leaders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                NO FIGHTERS RANKED YET
              </div>
            ) : (
              leaders.map((entry, index) => {
                const player = entry.stats;
                const playerUser = entry.user;
                const tier = getTier(player.elo);
                const isMe = player.userId === user?.id;
                const rank = index + 1;
                return (
                  <div
                    key={player.id}
                    className={`p-4 grid grid-cols-4 gap-2 items-center transition-colors ${isMe ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {rank <= 3 ? (
                        <div
                          className="w-6 h-6 flex items-center justify-center text-xs font-black"
                          style={{
                            background: rank === 1 ? "oklch(0.80 0.20 80)" : rank === 2 ? "oklch(0.75 0.05 240)" : "oklch(0.65 0.15 55)",
                            color: "oklch(0.06 0.01 240)",
                          }}
                        >
                          {rank}
                        </div>
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center error-code">{rank}</div>
                      )}
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <div
                        className="w-7 h-7 border flex items-center justify-center text-xs font-black"
                        style={{ borderColor: TIER_COLORS[tier], color: TIER_COLORS[tier] }}
                      >
                        {playerUser.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isMe ? "text-primary" : "text-foreground"}`}>
                          {playerUser.name || "UNKNOWN"}
                          {isMe && <span className="text-xs text-muted-foreground ml-2">(YOU)</span>}
                        </div>
                        <div className="error-code" style={{ color: TIER_COLORS[tier] }}>
                          {tier.toUpperCase()} · {player.wins}W/{player.losses}L
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm" style={{ color: TIER_COLORS[tier] }}>
                        {player.elo}
                      </div>
                      {player.currentWinStreak > 0 && (
                        <div className="error-code neon-magenta">{player.currentWinStreak}🔥</div>
                      )}
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
