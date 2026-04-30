import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingBall({ color, pos, spd }: { color: string; pos: [number,number,number]; spd: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = pos[1] + Math.sin(s.clock.elapsedTime * spd) * 0.25;
    ref.current.rotation.x += 0.012;
    ref.current.rotation.y += 0.018;
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.15} metalness={0.2} />
    </mesh>
  );
}
function HeroBalls() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[2,3,2]} intensity={2.5} color="#00e5ff" />
      <pointLight position={[-2,2,-2]} intensity={2} color="#ff3333" />
      <FloatingBall color="#00e5ff" pos={[-1.1,0.1,0]} spd={1.2} />
      <FloatingBall color="#ff3333" pos={[1.1,0.3,0]} spd={0.9} />
      <FloatingBall color="#ff6600" pos={[0,-0.4,0.4]} spd={1.5} />
      <FloatingBall color="#cc00ff" pos={[-0.4,0.7,-0.2]} spd={1.1} />
    </>
  );
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [glitchActive, setGlitchActive] = useState(false);
  const [mode, setMode] = useState<"casual" | "competitive">("casual");

  const { data: walletData } = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: statsData } = trpc.stats.getMyStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary flex items-center justify-center">
              <div className="w-3 h-3 bg-primary" />
            </div>
            <span className="font-mono text-sm text-muted-foreground tracking-widest">KOBK://v2.4.1</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/leaderboard")}
                  className="text-muted-foreground hover:text-primary transition-colors font-mono text-xs tracking-wider"
                >
                  LEADERBOARD
                </button>
                <button
                  onClick={() => navigate("/weapons")}
                  className="text-muted-foreground hover:text-primary transition-colors font-mono text-xs tracking-wider"
                >
                  ARSENAL
                </button>
                <button
                  onClick={() => navigate("/wallet")}
                  className="text-muted-foreground hover:text-primary transition-colors font-mono text-xs tracking-wider"
                >
                  WALLET
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="text-muted-foreground hover:text-primary transition-colors font-mono text-xs tracking-wider"
                >
                  PROFILE
                </button>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary pulse-neon" />
                  <span className="text-xs font-mono text-primary">
                    ${walletData?.balance.toFixed(2) ?? "0.00"}
                  </span>
                </div>
              </>
            ) : (
              <a
                href={getLoginUrl()}
                className="font-mono text-xs tracking-wider text-primary border border-primary px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                CONNECT
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.72 0.28 195) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.72 0.28 195) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* 3D paintballs */}
        <div className="absolute top-8 right-8 opacity-70" style={{ width: "180px", height: "180px", pointerEvents: "none" }}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <Suspense fallback={null}><HeroBalls /></Suspense>
          </Canvas>
        </div>

        {/* Corner brackets */}
        <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-primary opacity-40" />
        <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-primary opacity-40" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-primary opacity-40" />
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-primary opacity-40" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Error code */}
          <div className="error-code mb-6 opacity-60">
            SYS::COMBAT_MODULE_ACTIVE | ERR_0x4B4F424B | THREAT_LEVEL: EXTREME
          </div>

          {/* Main title */}
          <div className="mb-2">
            <h1
              className={`text-7xl md:text-9xl font-black tracking-tighter leading-none ${glitchActive ? "glitch-text" : ""}`}
              style={{
                color: "oklch(0.93 0.01 240)",
                textShadow: "2px 0 oklch(0.72 0.28 195 / 0.5), -2px 0 oklch(0.65 0.30 320 / 0.5)",
              }}
            >
              KILL
            </h1>
          </div>
          <div className="mb-2">
            <span
              className="text-4xl md:text-5xl font-mono tracking-[0.5em] text-muted-foreground"
            >
              OR BE
            </span>
          </div>
          <div className="mb-8">
            <h1
              className="text-7xl md:text-9xl font-black tracking-tighter leading-none neon-magenta"
            >
              KILLED
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-muted-foreground font-mono text-sm tracking-widest mb-12 max-w-lg mx-auto">
            1V1 REAL-MONEY DUELS · PREDICT · SHOOT · DOMINATE
            <br />
            <span className="text-xs opacity-60">MINIMUM STAKE: $0.05 · WINNER TAKES ALL</span>
          </p>

          {/* CTA */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              INITIALIZING...
            </div>
          ) : isAuthenticated ? (
            <div className="flex flex-col items-center gap-4">
              {/* Mode toggle */}
              <div style={{
                display: "flex",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid #222",
                borderRadius: "6px",
                padding: "3px",
                gap: "2px",
                marginBottom: "4px",
              }}>
                {(["casual", "competitive"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: "6px 20px",
                      borderRadius: "4px",
                      border: "none",
                      background: mode === m ? (m === "competitive" ? "rgba(255,51,51,0.25)" : "rgba(0,229,255,0.15)") : "transparent",
                      color: mode === m ? (m === "competitive" ? "#ff3333" : "#00e5ff") : "#555",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      letterSpacing: "2px",
                      cursor: "pointer",
                      fontWeight: mode === m ? "700" : "400",
                      transition: "all 0.15s",
                    }}
                  >
                    {m === "casual" ? "⚡ CASUAL" : "🏆 COMPETITIVE"}
                  </button>
                ))}
              </div>
              {mode === "competitive" && (
                <div style={{ color: "#ff3333", fontSize: "10px", fontFamily: "monospace", letterSpacing: "2px", opacity: 0.8 }}>
                  ELO RANKED · REAL STAKES · NO MERCY
                </div>
              )}
              {mode === "casual" && (
                <div style={{ color: "#00e5ff", fontSize: "10px", fontFamily: "monospace", letterSpacing: "2px", opacity: 0.8 }}>
                  FREE PRACTICE · BOT AVAILABLE · NO STAKES
                </div>
              )}
              <button
                onClick={() => navigate("/lobby")}
                className="relative group px-12 py-4 text-xl font-black tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-glow-pulse"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                <span className="relative z-10">ENTER THE ARENA</span>
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
              </button>

              {/* Stats strip */}
              {statsData && (
                <div className="flex items-center gap-6 mt-4 text-xs font-mono">
                  <div className="text-center">
                    <div className="text-muted-foreground">ELO</div>
                    <div className="text-primary font-bold">{statsData.elo}</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="text-muted-foreground">WINS</div>
                    <div className="text-green-400 font-bold">{statsData.wins}</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="text-muted-foreground">LOSSES</div>
                    <div className="text-destructive font-bold">{statsData.losses}</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="text-muted-foreground">STREAK</div>
                    <div className="neon-magenta font-bold">{statsData.currentWinStreak}🔥</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="text-muted-foreground">TIER</div>
                    <div className={`font-bold tier-${statsData.tier}`}>{statsData.tier.toUpperCase()}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <a
                href={getLoginUrl()}
                className="relative group px-12 py-4 text-xl font-black tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-glow-pulse"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                CONNECT TO FIGHT
              </a>
              <p className="text-muted-foreground font-mono text-xs">
                Sign in with Manus to enter the arena
              </p>
            </div>
          )}
        </div>

        {/* Feature grid */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto w-full">
          {[
            { code: "MOD_01", title: "REAL STAKES", desc: "Wager from $0.05. Winner takes the pot." },
            { code: "MOD_02", title: "PREDICT & SHOOT", desc: "Outsmart your opponent. Hit detection is server-side." },
            { code: "MOD_03", title: "INSTANT MATCH", desc: "Paired in under 5 seconds. No waiting." },
            { code: "MOD_04", title: "ELO RANKING", desc: "Climb from Bronze to Apex. Prove dominance." },
          ].map((f) => (
            <div key={f.code} className="game-panel p-4">
              <div className="error-code mb-2">{f.code}</div>
              <div className="text-sm font-bold text-primary mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container flex items-center justify-between">
          <span className="error-code">KOBK_SYS v2.4.1 · ALL RIGHTS RESERVED</span>
          <span className="error-code">18+ · GAMBLE RESPONSIBLY</span>
        </div>
      </footer>
    </div>
  );
}
