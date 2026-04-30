import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import PaintballArena from "./PaintballArena";
import PaintballCharacter, { CharacterState } from "./PaintballCharacter";
import PaintEffectsRenderer, { usePaintEffects } from "./PaintEffects";
import Joystick from "./Joystick";

// ── Player colors ──
const PLAYER_COLOR = "#00e5ff";
const OPPONENT_COLOR = "#ff3333";

// ── Third-person camera that follows the player ──
function ThirdPersonCamera({
  playerPos,
  playerRot,
  isAiming,
  slowMo,
}: {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  playerRot: React.MutableRefObject<number>;
  isAiming: boolean;
  slowMo: boolean;
}) {
  const { camera } = useThree();
  const camOffset = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    const aimZ = isAiming ? 1.5 : 3.5;
    const aimY = isAiming ? 1.4 : 2.2;
    const aimX = isAiming ? 0.4 : 0;

    const rot = playerRot.current;
    const px = playerPos.current.x;
    const py = playerPos.current.y;
    const pz = playerPos.current.z;

    // Camera offset behind and above player
    const offsetX = Math.sin(rot) * aimZ + Math.cos(rot) * aimX;
    const offsetZ = Math.cos(rot) * aimZ - Math.sin(rot) * aimX;

    camOffset.current.set(px - offsetX, py + aimY, pz - offsetZ);
    camera.position.lerp(camOffset.current, slowMo ? 0.05 : 0.12);

    // Look at player chest
    camTarget.current.set(px, py + 1.0, pz);
    camera.lookAt(camTarget.current);
  });

  return null;
}

// ── Crosshair ──
function Crosshair({ hit }: { hit: boolean }) {
  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 10,
    }}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        <line x1="16" y1="4" x2="16" y2="12" stroke={hit ? "#ff0" : "#fff"} strokeWidth="2" opacity="0.9" />
        <line x1="16" y1="20" x2="16" y2="28" stroke={hit ? "#ff0" : "#fff"} strokeWidth="2" opacity="0.9" />
        <line x1="4" y1="16" x2="12" y2="16" stroke={hit ? "#ff0" : "#fff"} strokeWidth="2" opacity="0.9" />
        <line x1="20" y1="16" x2="28" y2="16" stroke={hit ? "#ff0" : "#fff"} strokeWidth="2" opacity="0.9" />
        <circle cx="16" cy="16" r="2" fill={hit ? "#ff0" : "#fff"} opacity="0.9" />
      </svg>
    </div>
  );
}

// ── HIT marker ──
function HitMarker({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 11,
      color: "#ff4400",
      fontSize: "18px",
      fontFamily: "monospace",
      fontWeight: "bold",
      textShadow: "0 0 8px #ff4400",
      animation: "fadeOut 0.4s ease-out forwards",
    }}>
      ✕ HIT
    </div>
  );
}

// ── Screen edge glow on damage ──
function DamageVignette({ active, color }: { active: boolean; color: string }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 20,
      background: active
        ? `radial-gradient(ellipse at center, transparent 40%, ${color}88 100%)`
        : "transparent",
      transition: "background 0.1s",
      boxShadow: active ? `inset 0 0 80px ${color}` : "none",
    }} />
  );
}

// ── Slow motion overlay ──
function SlowMoOverlay({ active }: { active: boolean }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 15,
      background: active ? "rgba(0,0,0,0.25)" : "transparent",
      transition: "background 0.1s",
    }}>
      {active && (
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#ff6600",
          fontSize: "11px",
          fontFamily: "monospace",
          letterSpacing: "4px",
          opacity: 0.7,
        }}>
          SLOW MOTION
        </div>
      )}
    </div>
  );
}

// ── Score HUD ──
function ScoreHUD({
  playerScore,
  opponentScore,
  playerName,
  opponentName,
  round,
  timeLeft,
}: {
  playerScore: number;
  opponentScore: number;
  playerName: string;
  opponentName: string;
  round: number;
  timeLeft: number;
}) {
  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "12px 16px",
      zIndex: 30,
      gap: "0",
    }}>
      {/* Player score */}
      <div style={{
        background: "rgba(0,0,0,0.7)",
        border: "1px solid #00e5ff44",
        borderRadius: "8px 0 0 8px",
        padding: "6px 20px",
        minWidth: "110px",
        textAlign: "right",
      }}>
        <div style={{ color: "#00e5ff", fontSize: "11px", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "2px" }}>
          {playerName.toUpperCase()}
        </div>
        <div style={{ color: "#fff", fontSize: "28px", fontWeight: "900", lineHeight: 1 }}>
          {playerScore}
        </div>
      </div>

      {/* Center: round + timer */}
      <div style={{
        background: "rgba(0,0,0,0.85)",
        border: "1px solid #ffffff22",
        padding: "6px 16px",
        textAlign: "center",
        minWidth: "80px",
      }}>
        <div style={{ color: "#888", fontSize: "9px", fontFamily: "monospace", letterSpacing: "2px" }}>
          RND {round}
        </div>
        <div style={{
          color: timeLeft <= 3 ? "#ff4400" : "#fff",
          fontSize: "22px",
          fontWeight: "900",
          lineHeight: 1,
          transition: "color 0.2s",
        }}>
          {timeLeft}s
        </div>
      </div>

      {/* Opponent score */}
      <div style={{
        background: "rgba(0,0,0,0.7)",
        border: "1px solid #ff333344",
        borderRadius: "0 8px 8px 0",
        padding: "6px 20px",
        minWidth: "110px",
        textAlign: "left",
      }}>
        <div style={{ color: "#ff3333", fontSize: "11px", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "2px" }}>
          {opponentName.toUpperCase()}
        </div>
        <div style={{ color: "#fff", fontSize: "28px", fontWeight: "900", lineHeight: 1 }}>
          {opponentScore}
        </div>
      </div>
    </div>
  );
}

// ── Shoot button ──
function ShootButton({ onShoot, disabled }: { onShoot: () => void; disabled?: boolean }) {
  const pressRef = useRef(false);

  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled && !pressRef.current) {
          pressRef.current = true;
          onShoot();
        }
      }}
      onPointerUp={() => { pressRef.current = false; }}
      style={{
        position: "absolute",
        bottom: "24px",
        right: "140px",
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: disabled ? "rgba(80,0,0,0.4)" : "rgba(200,0,0,0.7)",
        border: `3px solid ${disabled ? "#ff000044" : "#ff4400"}`,
        boxShadow: disabled ? "none" : "0 0 20px #ff440088",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        touchAction: "none",
        zIndex: 30,
        transition: "all 0.1s",
      }}
    >
      <span style={{ fontSize: "28px" }}>🔥</span>
    </div>
  );
}

// ── Main 3D game scene ──
export interface GameScene3DProps {
  playerName: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  round: number;
  timeLeft: number;
  isBot: boolean;
  playerColor?: string;
  opponentColor?: string;
  onShoot: (targetPosition: [number, number, number]) => void;
  onMove: (dx: number, dy: number) => void;
  playerState?: CharacterState;
  opponentState?: CharacterState;
  opponentPosition?: [number, number, number];
  opponentRotation?: number;
  showHitMarker?: boolean;
  showDamageVignette?: boolean;
  slowMo?: boolean;
  matchOver?: boolean;
  playerWon?: boolean;
  stakeAmount?: number;
  onRematch?: () => void;
  onHome?: () => void;
}

function GameWorld({
  playerColor,
  opponentColor,
  playerState,
  opponentState,
  opponentPosition,
  opponentRotation,
  playerPosRef,
  playerRotRef,
  isAiming,
  slowMo,
  onShoot,
  onProjectileHit,
  onParticleDead,
  splats,
  projectiles,
  particles,
}: {
  playerColor: string;
  opponentColor: string;
  playerState: CharacterState;
  opponentState: CharacterState;
  opponentPosition: [number, number, number];
  opponentRotation: number;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  playerRotRef: React.MutableRefObject<number>;
  isAiming: boolean;
  slowMo: boolean;
  onShoot: () => void;
  onProjectileHit: (id: number) => void;
  onParticleDead: (id: number) => void;
  splats: ReturnType<typeof usePaintEffects>["splats"];
  projectiles: ReturnType<typeof usePaintEffects>["projectiles"];
  particles: ReturnType<typeof usePaintEffects>["particles"];
}) {
  const playerPos = playerPosRef.current.toArray() as [number, number, number];

  return (
    <>
      <ThirdPersonCamera
        playerPos={playerPosRef}
        playerRot={playerRotRef}
        isAiming={isAiming}
        slowMo={slowMo}
      />
      <PaintballArena />
      <PaintballCharacter
        position={playerPos}
        rotation={playerRotRef.current}
        state={playerState}
        teamColor={playerColor}
        isPlayer={true}
      />
      <PaintballCharacter
        position={opponentPosition}
        rotation={opponentRotation}
        state={opponentState}
        teamColor={opponentColor}
        isPlayer={false}
      />
      <PaintEffectsRenderer
        splats={splats}
        projectiles={projectiles}
        particles={particles}
        onProjectileHit={onProjectileHit}
        onParticleDead={onParticleDead}
      />
    </>
  );
}

// ── Match result overlay ──
function MatchResultOverlay({
  playerWon,
  playerScore,
  opponentScore,
  stakeAmount,
  onRematch,
  onHome,
}: {
  playerWon: boolean;
  playerScore: number;
  opponentScore: number;
  stakeAmount: number;
  onRematch: () => void;
  onHome: () => void;
}) {
  const [coinCount, setCoinCount] = useState(0);
  const payout = playerWon ? stakeAmount * 2 * 0.9 : 0;

  useEffect(() => {
    if (!playerWon) return;
    let count = 0;
    const interval = setInterval(() => {
      count += payout / 20;
      if (count >= payout) { count = payout; clearInterval(interval); }
      setCoinCount(count);
    }, 50);
    return () => clearInterval(interval);
  }, [playerWon, payout]);

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: playerWon ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.9)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      animation: "fadeIn 0.4s ease-out",
    }}>
      {/* Result title */}
      <div style={{
        fontSize: "clamp(48px, 12vw, 80px)",
        fontWeight: "900",
        color: playerWon ? "#00e5ff" : "#ff3333",
        letterSpacing: "4px",
        textShadow: playerWon ? "0 0 40px #00e5ff" : "0 0 40px #ff3333",
        marginBottom: "8px",
        animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        fontFamily: "'Rajdhani', sans-serif",
      }}>
        {playerWon ? "VICTORY" : "DEFEAT"}
      </div>

      {/* Subtitle */}
      <div style={{
        color: "#888",
        fontSize: "13px",
        fontFamily: "monospace",
        letterSpacing: "3px",
        marginBottom: "24px",
      }}>
        {playerWon ? "WELL PLAYED" : playerScore === 2 ? "SO CLOSE. TRY AGAIN." : "BETTER LUCK NEXT TIME"}
      </div>

      {/* Score */}
      <div style={{
        display: "flex",
        gap: "24px",
        alignItems: "center",
        marginBottom: "24px",
      }}>
        <div style={{ color: "#00e5ff", fontSize: "40px", fontWeight: "900" }}>{playerScore}</div>
        <div style={{ color: "#555", fontSize: "20px" }}>—</div>
        <div style={{ color: "#ff3333", fontSize: "40px", fontWeight: "900" }}>{opponentScore}</div>
      </div>

      {/* Payout */}
      {stakeAmount > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${playerWon ? "#00e5ff44" : "#ff333344"}`,
          borderRadius: "8px",
          padding: "12px 32px",
          marginBottom: "32px",
          textAlign: "center",
        }}>
          <div style={{ color: "#555", fontSize: "11px", fontFamily: "monospace", letterSpacing: "2px", marginBottom: "4px" }}>
            {playerWon ? "EARNED" : "LOST"}
          </div>
          <div style={{
            color: playerWon ? "#00ff88" : "#ff4444",
            fontSize: "28px",
            fontWeight: "900",
            fontFamily: "monospace",
          }}>
            {playerWon ? `+$${coinCount.toFixed(2)}` : `-$${stakeAmount.toFixed(2)}`}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onRematch}
          style={{
            padding: "14px 36px",
            background: playerWon ? "rgba(0,229,255,0.15)" : "rgba(255,51,51,0.15)",
            border: `2px solid ${playerWon ? "#00e5ff" : "#ff3333"}`,
            color: playerWon ? "#00e5ff" : "#ff3333",
            fontSize: "16px",
            fontWeight: "900",
            fontFamily: "monospace",
            letterSpacing: "2px",
            cursor: "pointer",
            borderRadius: "4px",
            boxShadow: playerWon ? "0 0 20px #00e5ff44" : "0 0 20px #ff333344",
          }}
        >
          REMATCH
        </button>
        <button
          onClick={onHome}
          style={{
            padding: "14px 24px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #333",
            color: "#666",
            fontSize: "14px",
            fontFamily: "monospace",
            letterSpacing: "2px",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          EXIT
        </button>
      </div>
    </div>
  );
}

// ── Root export ──
export default function GameScene3D({
  playerName,
  opponentName,
  playerScore,
  opponentScore,
  round,
  timeLeft,
  isBot,
  playerColor = PLAYER_COLOR,
  opponentColor = OPPONENT_COLOR,
  onShoot,
  onMove,
  playerState = "idle",
  opponentState = "idle",
  opponentPosition = [0, 0, -6],
  opponentRotation = Math.PI,
  showHitMarker = false,
  showDamageVignette = false,
  slowMo = false,
  matchOver = false,
  playerWon = false,
  stakeAmount = 0,
  onRematch,
  onHome,
}: GameScene3DProps) {
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 6));
  const playerRotRef = useRef(0);
  const moveRef = useRef({ dx: 0, dy: 0 });
  const aimRef = useRef({ dx: 0, dy: 0 });
  const [isAiming, setIsAiming] = useState(false);

  const { splats, projectiles, particles, spawnProjectile, spawnHitEffect, setProjectiles, setParticles } = usePaintEffects();

  // Movement update loop
  useEffect(() => {
    let animId: number;
    const speed = 3.5;
    const arenaLimit = 9;

    const tick = () => {
      const { dx, dy } = moveRef.current;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        // Rotate player to face movement direction
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          playerRotRef.current = Math.atan2(dx, -dy);
        }
        const dt = 1 / 60;
        playerPosRef.current.x = Math.max(-arenaLimit, Math.min(arenaLimit,
          playerPosRef.current.x + dx * speed * dt
        ));
        playerPosRef.current.z = Math.max(-arenaLimit, Math.min(arenaLimit,
          playerPosRef.current.z + dy * speed * dt
        ));
        onMove(dx, dy);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [onMove]);

  const handleMove = useCallback((dx: number, dy: number) => {
    moveRef.current = { dx, dy };
  }, []);

  const handleAim = useCallback((dx: number, dy: number) => {
    aimRef.current = { dx, dy };
    setIsAiming(Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1);
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      playerRotRef.current = Math.atan2(dx, -dy);
    }
  }, []);

  const handleShoot = useCallback(() => {
    if (matchOver) return;
    // Spawn projectile toward opponent
    const from = playerPosRef.current.clone().add(new THREE.Vector3(0, 1.2, 0));
    const to = new THREE.Vector3(...opponentPosition).add(new THREE.Vector3(0, 1.0, 0));
    spawnProjectile(from, to, playerColor);
    onShoot(opponentPosition);
  }, [matchOver, opponentPosition, playerColor, spawnProjectile, onShoot]);

  const handleProjectileHit = useCallback((id: number) => {
    setProjectiles(prev => prev.filter(p => p.id !== id));
    // Spawn hit effect at opponent position
    spawnHitEffect(opponentPosition, playerColor);
  }, [opponentPosition, playerColor, spawnHitEffect, setProjectiles]);

  const handleParticleDead = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, [setParticles]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#1a2a1a", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
      `}</style>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 4, 10], fov: 65, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <fog attach="fog" args={["#1a2a1a", 20, 50]} />
        <GameWorld
          playerColor={playerColor}
          opponentColor={opponentColor}
          playerState={playerState}
          opponentState={opponentState}
          opponentPosition={opponentPosition}
          opponentRotation={opponentRotation}
          playerPosRef={playerPosRef}
          playerRotRef={playerRotRef}
          isAiming={isAiming}
          slowMo={slowMo}
          onShoot={handleShoot}
          onProjectileHit={handleProjectileHit}
          onParticleDead={handleParticleDead}
          splats={splats}
          projectiles={projectiles}
          particles={particles}
        />
      </Canvas>

      {/* HUD overlays */}
      <ScoreHUD
        playerScore={playerScore}
        opponentScore={opponentScore}
        playerName={playerName}
        opponentName={opponentName}
        round={round}
        timeLeft={timeLeft}
      />

      <Crosshair hit={showHitMarker} />
      <HitMarker visible={showHitMarker} />
      <DamageVignette active={showDamageVignette} color={playerColor} />
      <SlowMoOverlay active={slowMo} />

      {/* Controls */}
      {!matchOver && (
        <>
          <Joystick onMove={handleMove} side="left" label="MOVE" color="#00e5ff" />
          <Joystick onMove={handleAim} side="right" label="AIM" color="#ff6600" />
          <ShootButton onShoot={handleShoot} disabled={matchOver} />
        </>
      )}

      {/* Match result */}
      {matchOver && (
        <MatchResultOverlay
          playerWon={playerWon}
          playerScore={playerScore}
          opponentScore={opponentScore}
          stakeAmount={stakeAmount}
          onRematch={onRematch ?? (() => {})}
          onHome={onHome ?? (() => {})}
        />
      )}
    </div>
  );
}
