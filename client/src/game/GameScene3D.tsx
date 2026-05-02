/**
 * ============================================================
 *  GameScene3D.tsx  —  Kill or Be Killed  ·  Luxury
 * ============================================================
 *  Aesthetic: iPhone Pro White HUD — frosted glass panels,
 *  platinum bezels, champagne-gold accents, SF Pro typography.
 *
 *  HUD elements:
 *   • Score + round timer bar (top, pearl glass)
 *   • Dual HP bars (platinum frame, team-color fill)
 *   • Dynamic crosshair (tightens when aiming)
 *   • Hit marker (gold X, fades)
 *   • Damage vignette (red pulse)
 *   • Paint-drip overlay on hit
 *   • Demo wallet badge (bottom center)
 *   • Ammo hopper gauge (vertical, bottom right)
 *   • Circular minimap (bottom left)
 *   • Kill-feed log (top right, frosted)
 *   • Countdown overlay (3…2…1…FIGHT!)
 *   • Slow-motion indicator
 *   • Kill-cam orbit mode (cinematic)
 *   • Match result (pearl overlay, coin anim)
 *   • Disconnected banner
 *   • Bot difficulty badge
 *   • ELO delta
 *   • Dual Joystick controls
 *   • Luxury shoot button
 * ============================================================
 */

import {
  useRef, useState, useCallback, useEffect, useMemo,
  type CSSProperties,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import PaintballArena                         from "./PaintballArena";
import PaintballCharacter, { CharacterState } from "./PaintballCharacter";
import PaintEffectsRenderer, { usePaintEffects } from "./PaintEffects";
import Joystick, { ShootButton }              from "./Joystick";

// ─────────────────────────────────────────────────────────────
//  Luxury palette
// ─────────────────────────────────────────────────────────────

const L = {
  pearl:       "#F5F5F7",
  white:       "#FFFFFF",
  warmWhite:   "#FAFAF8",
  ivory:       "#F0EEE8",
  platinum:    "#E8E8ED",
  steel:       "#C8C8CE",
  chrome:      "#D4D4D8",
  darkSteel:   "#8E8E93",
  gold:        "#C9A84C",
  lightGold:   "#E8C96A",
  charcoal:    "#1D1D1F",
  midGray:     "#6E6E73",
  lightGray:   "#AEAEB2",
  playerBlue:  "#007AFF",
  oppRed:      "#FF3B30",
  successGreen:"#34C759",
  frost:       "rgba(250,250,248,0.76)",
  frostBorder: "rgba(232,232,237,0.72)",
} as const;

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const ARENA_LIMIT  = 9.2;
const PLAYER_SPEED = 3.8;
const AIM_SPEED    = 2.2;
const SLOW_MO_SCL  = 0.28;
const KILL_CAM_MS  = 2200;

// ─────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────

export interface GameScene3DProps {
  playerName?:         string;
  opponentName?:       string;
  playerScore?:        number;
  opponentScore?:      number;
  round?:              number;
  maxRounds?:          number;
  timeLeft?:           number;
  isBot?:              boolean;
  botDifficulty?:      "easy" | "normal" | "hard";
  playerColor?:        string;
  opponentColor?:      string;
  onShoot?:            (targetPos: [number, number, number]) => void;
  onMove?:             (dx: number, dy: number) => void;
  playerState?:        CharacterState;
  opponentState?:      CharacterState;
  opponentPosition?:   [number, number, number];
  opponentRotation?:   number;
  showHitMarker?:      boolean;
  showDamageVignette?: boolean;
  slowMo?:             boolean;
  matchOver?:          boolean;
  playerWon?:          boolean;
  stakeAmount?:        number;
  gameMode?:           "demo" | "real";
  demoBalance?:        number;
  betAmount?:          number;
  playerHp?:           number;
  opponentHp?:         number;
  maxHp?:              number;
  eloDelta?:           number;
  countdownValue?:     number | null;
  disconnected?:       boolean;
  ammo?:               number;
  maxAmmo?:            number;
  onRematch?:          () => void;
  onHome?:             () => void;
}

// ─────────────────────────────────────────────────────────────
//  CSS injection
// ─────────────────────────────────────────────────────────────

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes lux3dFadeIn    { from{opacity:0} to{opacity:1} }
    @keyframes lux3dFadeOut   { from{opacity:1} to{opacity:0} }
    @keyframes lux3dScaleIn   { from{transform:scale(0.55);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes lux3dSlideIn   { from{transform:translateX(32px);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes lux3dPulse     { 0%,100%{opacity:1} 50%{opacity:0.42} }
    @keyframes lux3dCountBnce { from{transform:translate(-50%,-50%)scale(0.3);opacity:0}
                                to{transform:translate(-50%,-50%)scale(1);opacity:1} }
    @keyframes lux3dHitFlash  { 0%{opacity:0.85} 100%{opacity:0} }
    @keyframes lux3dCoinAnim  { from{transform:scale(0.55);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes lux3dWin       { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes lux3dDrip      { from{height:0;opacity:0.72} to{opacity:0.25} }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
//  Third-person camera (inside Canvas)
// ─────────────────────────────────────────────────────────────

function LuxCamera({
  playerPos, playerRot, isAiming, slowMo, killCam, killCamTarget,
}: {
  playerPos:     React.MutableRefObject<THREE.Vector3>;
  playerRot:     React.MutableRefObject<number>;
  isAiming:      boolean;
  slowMo:        boolean;
  killCam:       boolean;
  killCamTarget: THREE.Vector3 | null;
}) {
  const { camera } = useThree();
  const smoothPos  = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3());
  const killAngle  = useRef(0);

  useFrame((_, delta) => {
    const spd = slowMo ? 0.04 : 0.14;

    if (killCam && killCamTarget) {
      killAngle.current += delta * 1.5;
      const r  = 3.6;
      const kx = killCamTarget.x + Math.cos(killAngle.current) * r;
      const kz = killCamTarget.z + Math.sin(killAngle.current) * r;
      smoothPos.current.lerp(new THREE.Vector3(kx, killCamTarget.y + 1.9, kz), 0.11);
      camera.position.copy(smoothPos.current);
      camera.lookAt(killCamTarget);
      return;
    }

    // Normal follow camera
    const aimZ = isAiming ? 1.9 : 3.9;
    const aimY = isAiming ? 1.7 : 2.5;
    const aimX = isAiming ? 0.5 : 0;
    const rot  = playerRot.current;
    const { x: px, y: py, z: pz } = playerPos.current;
    const ox = Math.sin(rot) * aimZ + Math.cos(rot) * aimX;
    const oz = Math.cos(rot) * aimZ - Math.sin(rot) * aimX;

    smoothPos.current.lerp(new THREE.Vector3(px - ox, py + aimY, pz - oz), spd);
    camera.position.copy(smoothPos.current);

    smoothLook.current.lerp(new THREE.Vector3(px, py + 1.1, pz), spd * 1.6);
    camera.lookAt(smoothLook.current);
  });

  return null;
}

// ─────────────────────────────────────────────────────────────
//  Game world (Canvas children)
// ─────────────────────────────────────────────────────────────

function LuxGameWorld({
  playerColor, opponentColor,
  playerState, opponentState,
  opponentPosition, opponentRotation,
  playerPosRef, playerRotRef,
  isAiming, slowMo, killCam, killCamTarget,
  playerHp, maxHp, effects, timeScale,
  onProjectileHit, onParticleDead, onShockwaveDone, onFlashDone,
}: {
  playerColor:     string;
  opponentColor:   string;
  playerState:     CharacterState;
  opponentState:   CharacterState;
  opponentPosition:[number,number,number];
  opponentRotation:number;
  playerPosRef:    React.MutableRefObject<THREE.Vector3>;
  playerRotRef:    React.MutableRefObject<number>;
  isAiming:        boolean;
  slowMo:          boolean;
  killCam:         boolean;
  killCamTarget:   THREE.Vector3 | null;
  playerHp:        number;
  maxHp:           number;
  effects:         ReturnType<typeof usePaintEffects>;
  timeScale:       number;
  onProjectileHit: (id: number, pos: [number,number,number]) => void;
  onParticleDead:  (id: number) => void;
  onShockwaveDone: (id: number) => void;
  onFlashDone:     (id: number) => void;
}) {
  const playerPos = playerPosRef.current.toArray() as [number,number,number];

  return (
    <>
      <LuxCamera
        playerPos={playerPosRef} playerRot={playerRotRef}
        isAiming={isAiming} slowMo={slowMo}
        killCam={killCam} killCamTarget={killCamTarget}
      />
      <PaintballArena />
      <PaintballCharacter
        position={playerPos}
        rotation={playerRotRef.current}
        state={playerState}
        teamColor={playerColor}
        isPlayer
        lowHp={playerHp <= 1 && maxHp > 1}
      />
      <PaintballCharacter
        position={opponentPosition}
        rotation={opponentRotation}
        state={opponentState}
        teamColor={opponentColor}
        isPlayer={false}
      />
      <PaintEffectsRenderer
        splats={effects.splats}
        projectiles={effects.projectiles}
        particles={effects.particles}
        shockwaves={effects.shockwaves}
        flashes={effects.flashes}
        timeScale={timeScale}
        onProjectileHit={onProjectileHit}
        onParticleDead={onParticleDead}
        onShockwaveDone={onShockwaveDone}
        onFlashDone={onFlashDone}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  HUD helpers (CSS-only, no Three.js)
// ─────────────────────────────────────────────────────────────

// Frosted glass panel base style
const glassPanel = (extra: CSSProperties = {}): CSSProperties => ({
  background:      L.frost,
  backdropFilter:  "blur(16px) saturate(1.4)",
  WebkitBackdropFilter: "blur(16px) saturate(1.4)",
  border:          `1px solid ${L.frostBorder}`,
  borderRadius:    "12px",
  boxShadow:       "inset 0 1px 0 rgba(255,255,255,0.95), 0 6px 20px rgba(0,0,0,0.07)",
  ...extra,
});

// Score/timer bar
function LuxScoreBar({
  playerName, opponentName,
  playerScore, opponentScore,
  playerColor, opponentColor,
  round, maxRounds, timeLeft,
  gameMode, isBot, botDifficulty,
}: {
  playerName:    string; opponentName:  string;
  playerScore:   number; opponentScore: number;
  playerColor:   string; opponentColor: string;
  round:         number; maxRounds:     number;
  timeLeft:      number; gameMode:      "demo"|"real";
  isBot:         boolean; botDifficulty: string;
}) {
  const urgent = timeLeft <= 5;
  return (
    <div style={{
      position:       "absolute",
      top:            0,
      left:           0,
      right:          0,
      display:        "flex",
      justifyContent: "center",
      alignItems:     "flex-start",
      padding:        "10px 12px 0",
      zIndex:         30,
      gap:            0,
      pointerEvents:  "none",
    }}>
      {/* Player side */}
      <div style={{
        ...glassPanel({ borderRadius:"10px 0 0 10px", borderRight:"none" }),
        padding:    "7px 18px 7px 12px",
        minWidth:   "110px",
      }}>
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "5px",
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "9px",
          fontWeight:    600,
          color:         playerColor,
          letterSpacing: "1.5px",
          marginBottom:  "2px",
        }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", background:playerColor,
            boxShadow:`0 0 6px ${playerColor}`,
          }}/>
          {playerName.toUpperCase().slice(0,10)}
        </div>
        <div style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "30px", fontWeight:700, lineHeight:1, color:L.charcoal,
        }}>{playerScore}</div>
      </div>

      {/* Center */}
      <div style={{
        ...glassPanel({ borderRadius:0 }),
        padding:   "6px 14px",
        textAlign: "center",
        minWidth:  "82px",
      }}>
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "8px", fontWeight:600, color:L.lightGray,
          letterSpacing: "2px", marginBottom:"2px",
        }}>RND {round}/{maxRounds}</div>
        <div style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "24px", fontWeight:700, lineHeight:1,
          color:      urgent ? L.oppRed : L.charcoal,
          transition: "color 0.2s",
          animation:  urgent ? "lux3dPulse 0.65s ease-in-out infinite" : "none",
        }}>{timeLeft}s</div>
        {gameMode === "demo" && (
          <div style={{
            marginTop:    "3px",
            padding:      "1px 6px",
            background:   `${L.gold}22`,
            border:       `1px solid ${L.gold}44`,
            borderRadius: 4,
            color:        L.gold,
            fontSize:     "7px",
            fontFamily:   "-apple-system,'SF Pro Display',sans-serif",
            fontWeight:   700,
            letterSpacing:"1.5px",
          }}>DEMO</div>
        )}
      </div>

      {/* Opponent side */}
      <div style={{
        ...glassPanel({ borderRadius:"0 10px 10px 0", borderLeft:"none" }),
        padding:  "7px 12px 7px 18px",
        minWidth: "110px",
        textAlign:"right",
      }}>
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "flex-end",
          gap:            "5px",
          fontFamily:     "-apple-system,'SF Pro Display',sans-serif",
          fontSize:       "9px", fontWeight:600,
          color:          opponentColor, letterSpacing:"1.5px",
          marginBottom:   "2px",
        }}>
          {isBot && (
            <span style={{
              fontSize:   "7px",
              background: `${L.gold}22`,
              border:     `1px solid ${L.gold}44`,
              borderRadius:3,
              padding:    "1px 4px",
              color:      L.gold,
              letterSpacing:"0.5px",
            }}>{botDifficulty.toUpperCase()}</span>
          )}
          {opponentName.toUpperCase().slice(0,10)}
          <div style={{
            width:8, height:8, borderRadius:"50%", background:opponentColor,
            boxShadow:`0 0 6px ${opponentColor}`,
          }}/>
        </div>
        <div style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "30px", fontWeight:700, lineHeight:1, color:L.charcoal,
        }}>{opponentScore}</div>
      </div>
    </div>
  );
}

// HP bar pair
function LuxHpBars({
  playerHp, opponentHp, maxHp, playerColor, opponentColor,
}: {
  playerHp:number; opponentHp:number; maxHp:number;
  playerColor:string; opponentColor:string;
}) {
  const Bar = ({ hp, max, color, flip=false }:{hp:number;max:number;color:string;flip?:boolean}) => {
    const pct  = Math.max(0, hp/max);
    const warn = pct <= 0.35;
    return (
      <div style={{
        width:120, height:7,
        background:"rgba(200,200,210,0.28)",
        borderRadius:4, overflow:"hidden",
        border:`1px solid ${warn ? L.oppRed+"44" : color+"33"}`,
        direction: flip ? "rtl" : "ltr",
      }}>
        <div style={{
          width:    `${pct*100}%`,
          height:   "100%",
          background: warn
            ? `linear-gradient(90deg, #ff3300, #ff7700)`
            : `linear-gradient(90deg, ${color}aa, ${color})`,
          borderRadius:3,
          transition:"width 0.28s ease",
          boxShadow: `0 0 7px ${warn ? "#ff4400" : color}55`,
          animation: warn ? "lux3dPulse 0.9s ease-in-out infinite" : "none",
        }}/>
      </div>
    );
  };

  return (
    <div style={{
      position:       "absolute",
      top:            84,
      left:           0,
      right:          0,
      display:        "flex",
      justifyContent: "center",
      alignItems:     "center",
      gap:            "8px",
      zIndex:         29,
      pointerEvents:  "none",
    }}>
      <Bar hp={playerHp}   max={maxHp} color={playerColor}/>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"7px", fontWeight:600, color:L.lightGray, letterSpacing:"1px",
      }}>HP</div>
      <Bar hp={opponentHp} max={maxHp} color={opponentColor} flip/>
    </div>
  );
}

// Luxury crosshair
function LuxCrosshair({ hit, isAiming, color }:{hit:boolean;isAiming:boolean;color:string}) {
  const gap = isAiming ? 4 : 10;
  const len = isAiming ? 12 : 8;
  const col = hit ? L.gold : L.charcoal;
  const sz  = 42;

  return (
    <div style={{
      position:      "absolute",
      top:           "50%",
      left:          "50%",
      transform:     "translate(-50%,-50%)",
      pointerEvents: "none",
      zIndex:        10,
      filter:        hit ? `drop-shadow(0 0 5px ${L.gold})` : undefined,
      transition:    "all 0.12s",
    }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        <line x1={sz/2} y1={sz/2-gap-len} x2={sz/2} y2={sz/2-gap}
          stroke={col} strokeWidth={isAiming?2.2:1.6} strokeLinecap="round" opacity="0.88"/>
        <line x1={sz/2} y1={sz/2+gap}     x2={sz/2} y2={sz/2+gap+len}
          stroke={col} strokeWidth={isAiming?2.2:1.6} strokeLinecap="round" opacity="0.88"/>
        <line x1={sz/2-gap-len} y1={sz/2} x2={sz/2-gap} y2={sz/2}
          stroke={col} strokeWidth={isAiming?2.2:1.6} strokeLinecap="round" opacity="0.88"/>
        <line x1={sz/2+gap}     y1={sz/2} x2={sz/2+gap+len} y2={sz/2}
          stroke={col} strokeWidth={isAiming?2.2:1.6} strokeLinecap="round" opacity="0.88"/>
        <circle cx={sz/2} cy={sz/2} r={isAiming?1.5:2} fill={col} opacity="0.92"/>
        {isAiming && (
          <circle cx={sz/2} cy={sz/2} r="16" fill="none"
            stroke={col} strokeWidth="1" opacity="0.22" strokeDasharray="4 4"/>
        )}
      </svg>
    </div>
  );
}

// Hit marker
function LuxHitMarker({visible}:{visible:boolean}){
  if(!visible)return null;
  return(
    <div style={{
      position:      "absolute",
      top:           "50%",
      left:          "50%",
      transform:     "translate(-50%,-50%)",
      pointerEvents: "none",
      zIndex:        11,
      animation:     "lux3dHitFlash 0.42s ease-out forwards",
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <line x1="11" y1="11" x2="37" y2="37" stroke={L.gold} strokeWidth="3" strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 5px ${L.gold})`}}/>
        <line x1="37" y1="11" x2="11" y2="37" stroke={L.gold} strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// Damage vignette
function LuxDamageVignette({active, intensity=1}:{active:boolean;intensity?:number}){
  return(
    <div style={{
      position:      "absolute",
      inset:         0,
      pointerEvents: "none",
      zIndex:        20,
      background:    active
        ? `radial-gradient(ellipse at center, transparent 28%, ${L.oppRed}${Math.round(intensity*0x88).toString(16).padStart(2,"0")} 100%)`
        : "transparent",
      boxShadow:     active
        ? `inset 0 0 90px ${L.oppRed}${Math.round(intensity*0x66).toString(16)}`
        : "none",
      transition:    "background 0.08s, box-shadow 0.08s",
    }}/>
  );
}

// Paint drip hit overlay
function LuxPaintDrip({visible,color}:{visible:boolean;color:string}){
  if(!visible)return null;
  return(
    <div style={{
      position:"absolute", top:0, left:0, right:0, height:"38%",
      overflow:"hidden", pointerEvents:"none", zIndex:18,
    }}>
      {[10,22,36,52,66,80,92].map((pct,i)=>(
        <div key={i} style={{
          position:     "absolute",
          top:          0,
          left:         `${pct}%`,
          width:        `${3+(i%3)*2}px`,
          background:   `linear-gradient(${color}, ${color}00)`,
          borderRadius: "0 0 4px 4px",
          opacity:      0.65-i*0.06,
          ["--drip-h" as string]: `${45+i*14}%`,
          animation:    `lux3dDrip ${0.28+i*0.05}s ${i*0.04}s ease-in forwards`,
          height:       0,
        }}/>
      ))}
    </div>
  );
}

// Slow motion overlay
function LuxSlowMo({active}:{active:boolean}){
  if(!active)return null;
  return(
    <div style={{
      position:      "absolute",
      inset:         0,
      background:    "rgba(245,242,236,0.12)",
      pointerEvents: "none",
      zIndex:        15,
    }}>
      <div style={{
        position:      "absolute",
        top:           "36%",
        left:          "50%",
        transform:     "translate(-50%,-50%)",
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "9px",
        fontWeight:    700,
        color:         L.gold,
        letterSpacing: "5px",
        opacity:       0.72,
        textShadow:    `0 0 10px ${L.gold}`,
        animation:     "lux3dPulse 1s ease-in-out infinite",
      }}>SLOW · MOTION</div>
    </div>
  );
}

// Demo wallet HUD
function LuxDemoWallet({balance,betAmount,lastDelta}:{balance:number;betAmount:number;lastDelta:number|null}){
  const fmt = (n:number)=>n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  return(
    <div style={{
      position:       "absolute",
      bottom:         132,
      left:           "50%",
      transform:      "translateX(-50%)",
      ...glassPanel({ padding:"7px 18px", textAlign:"center" }),
      zIndex:         28,
      pointerEvents:  "none",
    }}>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"7px", fontWeight:700, color:L.midGray, letterSpacing:"2px", marginBottom:"2px",
      }}>DEMO WALLET</div>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"20px", fontWeight:700, color:L.charcoal,
      }}>${fmt(balance)}</div>
      {lastDelta!==null && (
        <div style={{
          fontFamily:"-apple-system,'SF Pro Display',sans-serif",
          fontSize:"12px", fontWeight:700,
          color:   lastDelta>0 ? L.successGreen : lastDelta<0 ? L.oppRed : L.gold,
          animation:"lux3dCoinAnim 0.3s ease",
        }}>
          {lastDelta>0 ? `+$${fmt(lastDelta)}` : lastDelta<0 ? `-$${fmt(Math.abs(lastDelta))}` : "PUSH"}
        </div>
      )}
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"7px", color:L.lightGray, letterSpacing:"1px", marginTop:"2px",
      }}>BET ${fmt(betAmount)}</div>
    </div>
  );
}

// Ammo gauge
function LuxAmmoGauge({ammo,maxAmmo,color}:{ammo:number;maxAmmo:number;color:string}){
  const pct = ammo/maxAmmo;
  const low = pct<=0.25;
  const col = low ? L.oppRed : color;
  return(
    <div style={{
      position:"absolute", bottom:120, right:148,
      display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
      pointerEvents:"none", zIndex:27,
    }}>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"7px", fontWeight:700, color:low?L.oppRed:L.midGray,
        letterSpacing:"1.5px", animation:low?"lux3dPulse 0.7s ease-in-out infinite":"none",
      }}>{low?"LOW":"AMMO"}</div>
      <div style={{
        width:10, height:48,
        background:"rgba(200,200,210,0.28)", borderRadius:5,
        border:`1px solid ${col}44`, overflow:"hidden",
        display:"flex", alignItems:"flex-end",
      }}>
        <div style={{
          width:"100%",
          height:`${pct*100}%`,
          background:`linear-gradient(0deg, ${col}, ${col}88)`,
          borderRadius:4,
          transition:"height 0.22s ease",
          boxShadow:`0 0 7px ${col}55`,
        }}/>
      </div>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"9px", fontWeight:700, color:col,
      }}>{ammo}</div>
    </div>
  );
}

// Minimap
function LuxMinimap({pX,pZ,oX,oZ,pColor,oColor}:{
  pX:number;pZ:number;oX:number;oZ:number;pColor:string;oColor:string;
}){
  const sz    = 66;
  const half  = sz/2;
  const scale = sz/18.4;
  const px    = half+pX*scale;
  const pz    = half+pZ*scale;
  const ox    = half+oX*scale;
  const oz    = half+oZ*scale;

  return(
    <div style={{
      position:       "absolute",
      bottom:         128,
      left:           12,
      width:          sz,
      height:         sz,
      borderRadius:   "50%",
      ...glassPanel({ padding:0, borderRadius:"50%" }),
      overflow:       "hidden",
      pointerEvents:  "none",
      zIndex:         26,
    }}>
      <svg width={sz} height={sz}>
        <line x1={half} y1={0}    x2={half} y2={sz} stroke="rgba(200,200,210,0.25)" strokeWidth="0.8"/>
        <line x1={0}    y1={half} x2={sz}   y2={half} stroke="rgba(200,200,210,0.25)" strokeWidth="0.8"/>
        <circle cx={ox} cy={oz} r="4" fill={oColor} opacity="0.9"
          style={{filter:`drop-shadow(0 0 3px ${oColor})`}}/>
        <circle cx={px} cy={pz} r="4.5" fill={pColor} opacity="0.95"
          style={{filter:`drop-shadow(0 0 4px ${pColor})`}}/>
        <circle cx={px} cy={pz} r="2" fill="white" opacity="0.55"/>
      </svg>
    </div>
  );
}

// Kill feed
function LuxKillFeed({entries}:{entries:Array<{text:string;color:string;ts:number}>}){
  return(
    <div style={{
      position:      "absolute",
      top:           98,
      right:         10,
      display:       "flex",
      flexDirection: "column",
      gap:           "3px",
      zIndex:        25,
      pointerEvents: "none",
    }}>
      {entries.slice(-4).map((e,i)=>(
        <div key={e.ts} style={{
          ...glassPanel({ padding:"3px 8px", borderRadius:"7px" }),
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "9px", fontWeight:600,
          color:         e.color, letterSpacing:"0.8px",
          opacity:       0.48+i*0.14,
          animation:     i===entries.length-1 ? "lux3dSlideIn 0.25s ease" : "none",
        }}>{e.text}</div>
      ))}
    </div>
  );
}

// Countdown overlay
function LuxCountdown({value}:{value:number|null}){
  if(value===null)return null;
  const isFight = value===0;
  const label   = isFight ? "FIGHT!" : String(value);
  const color   = isFight ? L.playerBlue : L.gold;
  return(
    <div style={{
      position:       "absolute",
      inset:          0,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      zIndex:         60,
      pointerEvents:  "none",
    }}>
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "clamp(80px,22vw,140px)",
        fontWeight:    700,
        color,
        textShadow:    `0 2px 8px ${color}33`,
        animation:     "lux3dCountBnce 0.42s cubic-bezier(0.34,1.56,0.64,1)",
      }}>{label}</div>
    </div>
  );
}

// Disconnected overlay
function LuxDisconnected({visible}:{visible:boolean}){
  if(!visible)return null;
  return(
    <div style={{
      position:       "absolute",
      inset:          0,
      background:     "rgba(245,242,236,0.92)",
      backdropFilter: "blur(16px)",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      zIndex:         80,
      gap:            "12px",
    }}>
      <div style={{fontSize:"42px"}}>🔌</div>
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "22px", fontWeight:700,
        color:         L.oppRed, letterSpacing:"3px",
        animation:     "lux3dPulse 1s ease-in-out infinite",
      }}>DISCONNECTED</div>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"11px", color:L.midGray, letterSpacing:"2px",
      }}>ATTEMPTING RECONNECT…</div>
    </div>
  );
}

// Match result overlay
function LuxMatchResult({
  playerWon, playerScore, opponentScore, stakeAmount,
  gameMode, eloDelta, onRematch, onHome,
}:{
  playerWon:boolean; playerScore:number; opponentScore:number; stakeAmount:number;
  gameMode:"demo"|"real"; eloDelta:number; onRematch:()=>void; onHome:()=>void;
}){
  const [coinCount,setCoinCount]=useState(0);
  const payout=playerWon?stakeAmount*1.85:0;
  const fmt=(n:number)=>n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

  useEffect(()=>{
    if(!playerWon||stakeAmount<=0)return;
    let n=0; const step=payout/26;
    const id=setInterval(()=>{n=Math.min(n+step,payout);setCoinCount(n);if(n>=payout)clearInterval(id);},48);
    return()=>clearInterval(id);
  },[playerWon,payout,stakeAmount]);

  const col   = playerWon ? L.playerBlue : L.oppRed;
  const title = playerWon ? "VICTORY"    : "DEFEAT";

  return(
    <div style={{
      position:        "absolute",
      inset:           0,
      background:      "rgba(245,242,236,0.92)",
      backdropFilter:  "blur(18px)",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      zIndex:          50,
      gap:             "13px",
      animation:       "lux3dFadeIn 0.35s ease",
    }}>
      <div style={{ width:"90px", height:"1px", background:`linear-gradient(90deg,transparent,${L.gold},transparent)` }}/>

      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "clamp(50px,14vw,88px)",
        fontWeight:    700, color:col, letterSpacing:"-1px",
        animation:     "lux3dScaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>{title}</div>

      <div style={{display:"flex",alignItems:"center",gap:"18px"}}>
        <div style={{fontFamily:"-apple-system",fontSize:"clamp(34px,10vw,56px)",fontWeight:700,color:L.playerBlue}}>{playerScore}</div>
        <div style={{color:L.lightGray,fontSize:"18px"}}>—</div>
        <div style={{fontFamily:"-apple-system",fontSize:"clamp(34px,10vw,56px)",fontWeight:700,color:L.oppRed}}>{opponentScore}</div>
      </div>

      {eloDelta!==0 && (
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "12px", fontWeight:700,
          color:         eloDelta>0?L.successGreen:L.oppRed, letterSpacing:"1.5px",
        }}>ELO {eloDelta>0?`+${eloDelta}`:eloDelta}</div>
      )}

      {stakeAmount>0 && (
        <div style={{
          ...glassPanel({ padding:"12px 28px", textAlign:"center" }),
          animation:"lux3dScaleIn 0.4s 0.2s ease both",
        }}>
          <div style={{fontFamily:"-apple-system",fontSize:"8px",color:L.midGray,letterSpacing:"2px",marginBottom:"4px"}}>
            {playerWon?"EARNED":"LOST"}
          </div>
          <div style={{
            fontFamily:"-apple-system",fontSize:"clamp(22px,7vw,34px)",fontWeight:700,
            color:     playerWon?L.successGreen:L.oppRed,
          }}>
            {playerWon?`+$${fmt(coinCount)}`:`-$${fmt(stakeAmount)}`}
          </div>
          {gameMode==="demo"&&(
            <div style={{fontFamily:"-apple-system",fontSize:"7px",color:L.gold,letterSpacing:"1.5px",marginTop:"3px"}}>DEMO CURRENCY</div>
          )}
        </div>
      )}

      <div style={{ width:"90px", height:"1px", background:`linear-gradient(90deg,transparent,${L.gold},transparent)` }}/>

      <div style={{display:"flex",gap:"10px"}}>
        <button onClick={onRematch} style={{
          padding:    "13px 32px",
          ...glassPanel(),
          border:     `1.5px solid ${col}`,
          color:      col,
          fontSize:   "13px", fontWeight:700,
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          letterSpacing:"1.5px", cursor:"pointer", borderRadius:"10px",
          boxShadow:  `0 0 18px ${col}22, 0 4px 12px rgba(0,0,0,0.08)`,
          transition: "all 0.15s",
        }}>REMATCH</button>
        <button onClick={onHome} style={{
          padding:    "13px 22px",
          ...glassPanel(),
          color:      L.midGray, fontSize:"12px",
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          letterSpacing:"1px", cursor:"pointer", borderRadius:"10px",
          transition: "all 0.15s",
        }}>EXIT</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Root component
// ─────────────────────────────────────────────────────────────

export default function GameScene3D({
  playerName      = "YOU",
  opponentName    = "OPPONENT",
  playerScore     = 0,
  opponentScore   = 0,
  round           = 1,
  maxRounds       = 3,
  timeLeft        = 30,
  isBot           = true,
  botDifficulty   = "normal",
  playerColor     = L.playerBlue,
  opponentColor   = L.oppRed,
  onShoot,
  onMove,
  playerState     = "idle",
  opponentState   = "idle",
  opponentPosition= [0,0,-6] as [number,number,number],
  opponentRotation= Math.PI,
  showHitMarker   = false,
  showDamageVignette = false,
  slowMo          = false,
  matchOver       = false,
  playerWon       = false,
  stakeAmount     = 0,
  gameMode        = "demo",
  demoBalance     = 1000,
  betAmount       = 25,
  playerHp        = 3,
  opponentHp      = 3,
  maxHp           = 3,
  eloDelta        = 0,
  countdownValue  = null,
  disconnected    = false,
  ammo            = 20,
  maxAmmo         = 20,
  onRematch,
  onHome,
}: GameScene3DProps) {

  useEffect(injectCSS, []);

  // ── Motion refs ────────────────────────────────────────────
  const playerPosRef  = useRef(new THREE.Vector3(0, 0, 6));
  const playerRotRef  = useRef(Math.PI);
  const moveRef       = useRef({ dx: 0, dy: 0 });
  const isDragging    = useRef(false);

  // ── State ──────────────────────────────────────────────────
  const [isAiming,    setIsAiming]    = useState(false);
  const [killCam,     setKillCam]     = useState(false);
  const [killCamPos,  setKillCamPos]  = useState<THREE.Vector3 | null>(null);
  const [damageCount, setDamageCount] = useState(0);
  const [showDrip,    setShowDrip]    = useState(false);
  const [lastDelta,   setLastDelta]   = useState<number | null>(null);
  const [killFeed,    setKillFeed]    = useState<Array<{text:string;color:string;ts:number}>>([]);

  // ── Effects ────────────────────────────────────────────────
  const effects = usePaintEffects();
  const { spawnProjectile, spawnHitEffect, spawnMuzzleFlash, spawnShockwave,
          setProjectiles, setParticles, setShockwaves, setFlashes } = effects;

  const timeScale = slowMo ? SLOW_MO_SCL : 1.0;

  // Canvas filter (subtle desaturation in slow-mo, aiming)
  const canvasFilter = useMemo(() => {
    if (slowMo)    return "saturate(0.65) contrast(1.12) brightness(0.92)";
    if (isAiming)  return "contrast(1.05)";
    return "none";
  }, [slowMo, isAiming]);

  // ── Player movement loop ───────────────────────────────────
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const { dx, dy } = moveRef.current;
      const mag = Math.sqrt(dx*dx + dy*dy);
      if (mag > 0.05) {
        const spd = isAiming ? AIM_SPEED : PLAYER_SPEED;
        playerRotRef.current = Math.atan2(dx, -dy);
        const dt = 1/60;
        playerPosRef.current.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT,
          playerPosRef.current.x + dx * spd * dt));
        playerPosRef.current.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT,
          playerPosRef.current.z + dy * spd * dt));
        onMove?.(dx, dy);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onMove, isAiming]);

  // ── Damage effects ─────────────────────────────────────────
  useEffect(() => {
    if (!showDamageVignette) return;
    setDamageCount(c => c+1);
    setShowDrip(true);
    const id = setTimeout(() => setShowDrip(false), 600);
    return () => clearTimeout(id);
  }, [showDamageVignette]);

  // ── Demo balance delta ─────────────────────────────────────
  useEffect(() => {
    if (!matchOver) return;
    const delta = playerWon ? betAmount : -betAmount;
    setLastDelta(delta);
    setKillFeed(prev => [...prev.slice(-3), {
      text:  playerWon ? "YOU WIN THE ROUND" : "OPPONENT WINS",
      color: playerWon ? L.successGreen : L.oppRed,
      ts:    Date.now(),
    }]);
    const id = setTimeout(() => setLastDelta(null), 3200);
    return () => clearTimeout(id);
  }, [matchOver, playerWon, betAmount]);

  // ── Callbacks ─────────────────────────────────────────────
  const handleMove = useCallback((dx: number, dy: number) => {
    moveRef.current = { dx, dy };
  }, []);

  const handleAim = useCallback((dx: number, dy: number) => {
    const active = Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08;
    setIsAiming(active);
    if (active) playerRotRef.current = Math.atan2(dx, -dy);
  }, []);

  const handleShoot = useCallback(() => {
    if (matchOver) return;
    const from = playerPosRef.current.clone().add(new THREE.Vector3(0, 1.2, 0));
    const to   = new THREE.Vector3(...opponentPosition).add(new THREE.Vector3(0, 1.0, 0));
    spawnProjectile(from, to, playerColor, 16);
    const muzzlePos: [number,number,number] = [
      from.x + Math.sin(playerRotRef.current)*0.5,
      from.y,
      from.z + Math.cos(playerRotRef.current)*0.5,
    ];
    spawnMuzzleFlash(muzzlePos, playerColor);
    onShoot?.(opponentPosition);
  }, [matchOver, opponentPosition, playerColor, spawnProjectile, spawnMuzzleFlash, onShoot]);

  const handleProjectileHit = useCallback((id: number, pos: [number,number,number]) => {
    setProjectiles(prev => prev.filter(p => p.id !== id));
    spawnHitEffect(pos, playerColor, 1.2);
    spawnShockwave(pos, playerColor, 1.8);
    setKillCamPos(new THREE.Vector3(...pos));
    setKillCam(true);
    setTimeout(() => setKillCam(false), KILL_CAM_MS);
    setKillFeed(prev => [...prev.slice(-3), {
      text:  "DIRECT HIT!",
      color: playerColor,
      ts:    Date.now(),
    }]);
  }, [playerColor, spawnHitEffect, spawnShockwave, setProjectiles]);

  const handleParticleDead  = useCallback((id:number) => setParticles(p=>p.filter(x=>x.id!==id)),  [setParticles]);
  const handleShockwaveDone = useCallback((id:number) => setShockwaves(p=>p.filter(x=>x.id!==id)), [setShockwaves]);
  const handleFlashDone     = useCallback((id:number) => setFlashes(p=>p.filter(x=>x.id!==id)),    [setFlashes]);

  const vignetteIntensity = Math.min(1, damageCount * 0.30);

  return(
    <div style={{
      position: "relative",
      width:    "100%",
      height:   "100%",
      background: L.marble,
      overflow: "hidden",
    }}>
      {/* ── 3D Canvas ─────────────────────────────────── */}
      <Canvas
        shadows
        camera={{ position:[0,3.5,10], fov:isAiming?52:68, near:0.1, far:220 }}
        gl={{ antialias:true, alpha:false, powerPreference:"high-performance" }}
        style={{
          width:"100%", height:"100%",
          filter:   canvasFilter,
          transition:"filter 0.2s ease",
        }}
      >
        <fog attach="fog" args={[L.ivory, 28, 68]} />
        <LuxGameWorld
          playerColor={playerColor}     opponentColor={opponentColor}
          playerState={playerState}     opponentState={opponentState}
          opponentPosition={opponentPosition} opponentRotation={opponentRotation}
          playerPosRef={playerPosRef}   playerRotRef={playerRotRef}
          isAiming={isAiming}           slowMo={slowMo}
          killCam={killCam}             killCamTarget={killCamPos}
          playerHp={playerHp}           maxHp={maxHp}
          effects={effects}             timeScale={timeScale}
          onProjectileHit={handleProjectileHit}
          onParticleDead={handleParticleDead}
          onShockwaveDone={handleShockwaveDone}
          onFlashDone={handleFlashDone}
        />
      </Canvas>

      {/* ── HUD ──────────────────────────────────────── */}

      <LuxScoreBar
        playerName={playerName}   opponentName={opponentName}
        playerScore={playerScore} opponentScore={opponentScore}
        playerColor={playerColor} opponentColor={opponentColor}
        round={round}             maxRounds={maxRounds}
        timeLeft={timeLeft}       gameMode={gameMode}
        isBot={isBot}             botDifficulty={botDifficulty}
      />

      <LuxHpBars
        playerHp={playerHp}   opponentHp={opponentHp}
        maxHp={maxHp}
        playerColor={playerColor} opponentColor={opponentColor}
      />

      <LuxKillFeed entries={killFeed}/>

      <LuxCrosshair hit={showHitMarker} isAiming={isAiming} color={playerColor}/>
      <LuxHitMarker visible={showHitMarker}/>

      <LuxDamageVignette active={showDamageVignette} intensity={vignetteIntensity}/>
      <LuxPaintDrip visible={showDrip} color={opponentColor}/>
      <LuxSlowMo active={slowMo}/>

      {/* Demo wallet */}
      {gameMode==="demo" && !matchOver && (
        <LuxDemoWallet balance={demoBalance} betAmount={betAmount} lastDelta={lastDelta}/>
      )}

      {/* Ammo gauge */}
      {!matchOver && <LuxAmmoGauge ammo={ammo} maxAmmo={maxAmmo} color={playerColor}/>}

      {/* Minimap */}
      {!matchOver && (
        <LuxMinimap
          pX={playerPosRef.current.x} pZ={playerPosRef.current.z}
          oX={opponentPosition[0]}    oZ={opponentPosition[2]}
          pColor={playerColor}        oColor={opponentColor}
        />
      )}

      {/* Controls */}
      {!matchOver && !disconnected && (
        <>
          <Joystick onMove={handleMove} side="left" label="MOVE"
            color={playerColor} radius={52} knobSize={46} deadzone={0.12}
            haptics showRing showLabel showDirection enableKeyboard/>
          <Joystick onMove={handleAim} side="right" label="AIM"
            color={L.gold} radius={52} knobSize={46} deadzone={0.12}
            haptics showRing showLabel showDirection enableKeyboard={false}/>
          <ShootButton onShoot={handleShoot} disabled={matchOver} color={playerColor}/>
        </>
      )}

      <LuxCountdown value={countdownValue}/>
      <LuxDisconnected visible={disconnected??false}/>

      {matchOver && (
        <LuxMatchResult
          playerWon={playerWon}
          playerScore={playerScore} opponentScore={opponentScore}
          stakeAmount={stakeAmount} gameMode={gameMode} eloDelta={eloDelta}
          onRematch={onRematch??(() => {})}
          onHome={onHome??(() => {})}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  EXTENDED 3D SCENE UTILITIES
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  LuxRoundTimer  — full round countdown with circle wipe
// ─────────────────────────────────────────────────────────────

function LuxRoundTimer({ timeLeft, maxTime, color }: { timeLeft:number; maxTime:number; color:string }) {
  const pct   = Math.max(0, timeLeft / maxTime);
  const warn  = pct < 0.3;
  const r     = 16;
  const circ  = 2 * Math.PI * r;
  const dash  = pct * circ;

  return (
    <div style={{
      position:      "absolute",
      top:           10,
      left:          "50%",
      transform:     "translateX(-50%)",
      zIndex:        31,
      pointerEvents: "none",
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="rgba(245,245,247,0.72)"
          stroke="rgba(200,200,210,0.48)" strokeWidth="2"/>
        <circle cx="20" cy="20" r={r} fill="none"
          stroke={warn ? L.oppRed : color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          style={{ transition:"stroke-dasharray 0.5s linear, stroke 0.2s" }}/>
        <text x="20" y="24" textAnchor="middle"
          fontSize="11" fontWeight="700" fill={warn ? L.oppRed : L.charcoal}
          fontFamily="-apple-system,'SF Pro Display',sans-serif"
          style={{ animation: warn ? "lux3dPulse 0.65s ease-in-out infinite" : "none" }}>
          {Math.ceil(timeLeft)}
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxGameModeBadge  — prominent mode indicator
// ─────────────────────────────────────────────────────────────

function LuxGameModeBadge({ mode, difficulty }: { mode:"demo"|"real"; difficulty:string }) {
  if (mode !== "demo") return null;
  return (
    <div style={{
      position:      "absolute",
      top:           12,
      left:          12,
      background:    `${L.gold}22`,
      border:        `1px solid ${L.gold}55`,
      borderRadius:  "8px",
      padding:       "4px 10px",
      fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
      fontSize:      "7px", fontWeight:800,
      color:         L.gold, letterSpacing:"2px",
      zIndex:        30, pointerEvents:"none",
      boxShadow:     `0 0 10px ${L.gold}22`,
    }}>
      ◆ DEMO  ·  {difficulty.toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxAimDot  — screen-space aim indicator (dot on enemy)
// ─────────────────────────────────────────────────────────────

function LuxAimDot({ visible, x, y, color }: { visible:boolean; x:number; y:number; color:string }) {
  if (!visible) return null;
  return (
    <div style={{
      position:       "absolute",
      left:           x,
      top:            y,
      transform:      "translate(-50%,-50%)",
      pointerEvents:  "none",
      zIndex:         12,
    }}>
      <div style={{
        width:        10, height:10, borderRadius:"50%",
        background:   `radial-gradient(circle, white, ${color})`,
        boxShadow:    `0 0 8px ${color}, 0 0 16px ${color}55`,
        animation:    "lux3dPulse 0.6s ease-in-out infinite",
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxPingIndicator  — network latency badge
// ─────────────────────────────────────────────────────────────

function LuxPingIndicator({ pingMs }: { pingMs: number }) {
  const good = pingMs < 80;
  const ok   = pingMs < 150;
  const col  = good ? L.successGreen : ok ? L.gold : L.oppRed;
  const bars = good ? 3 : ok ? 2 : 1;

  return (
    <div style={{
      position:      "absolute",
      top:           12, right:12,
      display:       "flex",
      alignItems:    "flex-end",
      gap:           "2px",
      zIndex:        30, pointerEvents:"none",
    }}>
      {[1,2,3].map(b=>(
        <div key={b} style={{
          width:        4,
          height:       4+b*3,
          borderRadius: "1px",
          background:   b<=bars ? col : "rgba(200,200,210,0.35)",
          transition:   "background 0.2s",
        }}/>
      ))}
      <div style={{
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:"7px", color:col, marginLeft:"3px",
        fontWeight:700, letterSpacing:"0.5px",
      }}>{pingMs}ms</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxMatchTimeBar  — thin progress bar at top of screen
//  showing match duration progress
// ─────────────────────────────────────────────────────────────

function LuxMatchTimeBar({
  timeLeft, maxTime, playerScore, opponentScore, maxRounds,
}: {
  timeLeft:number; maxTime:number; playerScore:number; opponentScore:number; maxRounds:number;
}) {
  const pct  = Math.max(0, timeLeft / maxTime);
  const warn = pct < 0.2;

  return (
    <div style={{
      position:  "absolute",
      top:       0, left:0, right:0,
      height:    3,
      zIndex:    35,
      pointerEvents:"none",
    }}>
      {/* Background */}
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(200,200,210,0.28)",
      }}/>
      {/* Player fill (from left) */}
      <div style={{
        position:     "absolute",
        top:0, left:0, bottom:0,
        width:        `${(playerScore / maxRounds) * 50}%`,
        background:   L.playerBlue,
        transition:   "width 0.4s ease",
      }}/>
      {/* Opponent fill (from right) */}
      <div style={{
        position:     "absolute",
        top:0, right:0, bottom:0,
        width:        `${(opponentScore / maxRounds) * 50}%`,
        background:   L.oppRed,
        transition:   "width 0.4s ease",
      }}/>
      {/* Time overlay */}
      <div style={{
        position:  "absolute",
        top:0, left:0, bottom:0,
        width:     `${pct * 100}%`,
        background:`linear-gradient(90deg, transparent, ${warn ? L.oppRed : L.gold}44)`,
        transition:"width 0.5s linear",
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxRoundFlash  — full-screen flash on round start/end
// ─────────────────────────────────────────────────────────────

function LuxRoundFlash({ trigger, color }: { trigger: number; color: string }) {
  const [opacity, setOpacity] = useState(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== prevTrigger.current) {
      prevTrigger.current = trigger;
      setOpacity(0.55);
      const id = setTimeout(() => setOpacity(0), 350);
      return () => clearTimeout(id);
    }
  }, [trigger]);

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      background:    color,
      opacity,
      pointerEvents: "none",
      zIndex:        45,
      transition:    "opacity 0.35s ease",
    }}/>
  );
}

// ─────────────────────────────────────────────────────────────
//  Network stubs for GameScene3D (Manus platform)
// ─────────────────────────────────────────────────────────────

export interface GameMovePayload {
  position:  [number, number, number];
  rotation:  number;
  state:     string;
  timestamp: number;
}

export interface GameResultPayload {
  winner:       "player" | "opponent" | "draw";
  playerScore:  number;
  opponentScore:number;
  roundDuration:number;
}

/**
 * submitMove  — send player state to Manus backend
 * Replace stub with actual WebSocket / REST call
 */
export async function submitMove(payload: GameMovePayload): Promise<void> {
  console.debug("[KOBK Net 3D] submitMove", payload);
}

/**
 * getGameResult  — request final round result from backend
 */
export async function getGameResult(): Promise<GameResultPayload> {
  console.debug("[KOBK Net 3D] getGameResult");
  return { winner:"draw", playerScore:0, opponentScore:0, roundDuration:30 };
}

// ─────────────────────────────────────────────────────────────
//  Replay system stub  — record + playback game events
// ─────────────────────────────────────────────────────────────

export interface ReplayEvent {
  type:      "move" | "shoot" | "hit" | "roundEnd";
  timestamp: number;
  data:      Record<string, unknown>;
}

export class ReplayRecorder {
  private events: ReplayEvent[] = [];
  private startTime = Date.now();

  record(type: ReplayEvent["type"], data: Record<string, unknown>): void {
    this.events.push({ type, timestamp: Date.now() - this.startTime, data });
  }

  getEvents(): ReplayEvent[]   { return [...this.events]; }
  clear():     void             { this.events = []; this.startTime = Date.now(); }
  duration():  number           { return Date.now() - this.startTime; }

  export(): string {
    return JSON.stringify({ version:"1.0", events: this.events });
  }

  static fromJSON(json: string): ReplayRecorder {
    const r = new ReplayRecorder();
    const parsed = JSON.parse(json);
    r.events = parsed.events ?? [];
    return r;
  }
}

// ─────────────────────────────────────────────────────────────
//  Luxury canvas fog helper  — exports the fog configuration
//  used inside the Canvas for consistent scene atmosphere
// ─────────────────────────────────────────────────────────────

export const LUXURY_FOG = {
  color: "#F0EDE6",
  near:  28,
  far:   68,
} as const;

// ─────────────────────────────────────────────────────────────
//  Performance monitor (dev only)
// ─────────────────────────────────────────────────────────────

function LuxPerfMonitor({ show = false }: { show?: boolean }) {
  const [fps, setFps]  = useState(60);
  const fpsRef = useRef(0);
  const frames = useRef(0);
  const last   = useRef(performance.now());

  useEffect(() => {
    if (!show) return;
    let id: number;
    const tick = () => {
      frames.current++;
      const now = performance.now();
      if (now - last.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        last.current   = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [show]);

  if (!show) return null;

  const col = fps >= 55 ? L.successGreen : fps >= 30 ? L.gold : L.oppRed;

  return (
    <div style={{
      position:  "absolute",
      top:       44, right:12,
      fontFamily:"-apple-system,monospace",
      fontSize:  "8px", fontWeight:700,
      color:     col, zIndex:90,
      letterSpacing:"1px", pointerEvents:"none",
    }}>{fps} FPS</div>
  );
}
