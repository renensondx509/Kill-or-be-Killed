/**
 * ============================================================
 *  PaintballGame2D.tsx  —  Kill or Be Killed  ·  Luxury
 * ============================================================
 *  Aesthetic: iPhone Pro White 2D dueling arena.
 *  Ivory marble canvas, pearl characters, gold VFX.
 *
 *  7-Phase cinematic round flow:
 *   1. PICK     — weapon/difficulty select (frosted cards)
 *   2. COUNTDOWN— 3…2…1…GO with bounce animation
 *   3. EMERGE   — characters slide onto ivory stage
 *   4. AIM      — animated targeting reticle, time-dilate
 *   5. FIRE     — projectile arc, gold trail
 *   6. IMPACT   — pearl burst + gold shockwave
 *   7. RESULT   — win/lose scroll + ELO + demo payout
 *
 *  Features:
 *   • Demo mode wallet (bet chips, live balance, delta anim)
 *   • Bot AI with three difficulty tiers
 *   • 5-heart HP bar with gold frame
 *   • Pearl paint-drip animation on hit
 *   • Confetti burst (gold flakes on victory)
 *   • Round progress bar (gold fill)
 *   • Screen-edge vignette on low HP
 *   • Animated background (marble veins shift slowly)
 *   • Full TypeScript props interface
 * ============================================================
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useReducer,
  type CSSProperties,
} from "react";

// ─────────────────────────────────────────────────────────────
//  Luxury palette
// ─────────────────────────────────────────────────────────────

const C = {
  // Background
  marble:      "#F0EDE6",
  marbleLight: "#F5F2EC",
  marbleDark:  "#E0DAD0",
  vein:        "#D8D2C8",
  // Whites
  pearl:       "#F5F5F7",
  white:       "#FFFFFF",
  warmWhite:   "#FAFAF8",
  ivory:       "#F0EEE8",
  // Metals
  platinum:    "#E8E8ED",
  steel:       "#C8C8CE",
  chrome:      "#D4D4D8",
  darkSteel:   "#8E8E93",
  gold:        "#C9A84C",
  lightGold:   "#E8C96A",
  darkGold:    "#8B6914",
  // Text
  charcoal:    "#1D1D1F",
  midGray:     "#6E6E73",
  lightGray:   "#AEAEB2",
  // Accents
  playerBlue:  "#007AFF",
  oppRed:      "#FF3B30",
  successGreen:"#34C759",
  warningAmber:"#FF9500",
} as const;

// ─────────────────────────────────────────────────────────────
//  CSS injection
// ─────────────────────────────────────────────────────────────

let cssInj = false;
function injectCSS() {
  if (cssInj || typeof document === "undefined") return;
  cssInj = true;
  const s = document.createElement("style");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');

    @keyframes g2dFadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes g2dFadeOut   { from{opacity:1} to{opacity:0} }
    @keyframes g2dBounce    { 0%{transform:translate(-50%,-50%)scale(0.3);opacity:0}
                              60%{transform:translate(-50%,-50%)scale(1.18);opacity:1}
                              80%{transform:translate(-50%,-50%)scale(0.95)}
                              100%{transform:translate(-50%,-50%)scale(1)} }
    @keyframes g2dSlideL    { from{transform:translateX(-120%)} to{transform:translateX(0)} }
    @keyframes g2dSlideR    { from{transform:translateX(120%)} to{transform:translateX(0)} }
    @keyframes g2dShake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)}
                              40%{transform:translateX(7px)} 60%{transform:translateX(-5px)}
                              80%{transform:translateX(5px)} }
    @keyframes g2dPulse     { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes g2dGoldGlow  { 0%,100%{text-shadow:0 0 18px rgba(201,168,76,0.4)}
                              50%{text-shadow:0 0 32px rgba(201,168,76,0.8)} }
    @keyframes g2dHeartBeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.22)}
                              28%{transform:scale(1)} 42%{transform:scale(1.12)} 70%{transform:scale(1)} }
    @keyframes g2dConfetti  { to{transform:translateY(110vh) rotate(720deg);opacity:0} }
    @keyframes g2dDrip      { from{height:0;opacity:0.7} to{height:var(--drip-h);opacity:0.3} }
    @keyframes g2dSway      { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
    @keyframes g2dAimSpin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes g2dTrailFade { from{opacity:0.8} to{opacity:0} }
    @keyframes g2dProjectile{ from{opacity:1} to{opacity:0} }
    @keyframes g2dBurstPop  { from{transform:scale(0.2);opacity:1} to{transform:scale(3.5);opacity:0} }
    @keyframes g2dFlipIn    { from{transform:rotateY(-90deg);opacity:0} to{transform:rotateY(0);opacity:1} }
    @keyframes g2dSlideUp   { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes g2dCoinCount { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes g2dMarbleShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes g2dAimWobble { 0%,100%{transform:translate(-50%,-50%)scale(1)} 50%{transform:translate(-50%,-50%)scale(1.05)} }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

type Phase =
  | "pick"
  | "countdown"
  | "emerge"
  | "aim"
  | "fire"
  | "impact"
  | "result"
  | "matchover";

type Difficulty = "easy" | "normal" | "hard";

export interface PaintballGame2DProps {
  playerName?:    string;
  opponentName?:  string;
  maxRounds?:     number;
  isBot?:         boolean;
  botDifficulty?: Difficulty;
  gameMode?:      "demo" | "real";
  demoBalance?:   number;
  betAmount?:     number;
  playerColor?:   string;
  opponentColor?: string;
  maxHp?:         number;
  onMatchEnd?:    (result: { playerWon: boolean; finalBalance: number }) => void;
  onHome?:        () => void;
}

interface GameState {
  phase:          Phase;
  round:          number;
  playerScore:    number;
  oppScore:       number;
  playerHp:       number;
  oppHp:          number;
  countdown:      number;
  playerWon:      boolean;
  matchOver:      boolean;
  demoBalance:    number;
  lastDelta:      number | null;
  difficulty:     Difficulty;
  roundResultMsg: string;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd  = (min: number, max: number) => min + Math.random() * (max - min);
const fmt  = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAYOUT_MULT: Record<Difficulty, number> = {
  easy:   1.62,
  normal: 1.85,
  hard:   2.25,
};

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

// Marble background canvas
function MarbleBackground() {
  return (
    <div style={{
      position:         "absolute",
      inset:            0,
      background:       `
        radial-gradient(ellipse at 20% 30%, rgba(255,255,252,0.65) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 70%, rgba(240,234,224,0.50) 0%, transparent 50%),
        linear-gradient(135deg, ${C.marbleLight} 0%, ${C.marble} 40%, ${C.marbleDark} 100%)
      `,
      backgroundSize:   "300% 300%",
      animation:        "g2dMarbleShift 18s ease-in-out infinite",
    }}>
      {/* Vein lines */}
      {[
        { top:"18%", left:"0%", width:"45%", rot:"-4deg" },
        { top:"55%", left:"25%", width:"65%", rot:"6deg" },
        { top:"82%", left:"5%",  width:"38%", rot:"-8deg" },
      ].map((v,i)=>(
        <div key={i} style={{
          position:  "absolute",
          top:       v.top,
          left:      v.left,
          width:     v.width,
          height:    "1px",
          background:`linear-gradient(90deg, transparent, ${C.vein}55, ${C.vein}88, ${C.vein}44, transparent)`,
          transform: `rotate(${v.rot})`,
          opacity:   0.6,
        }}/>
      ))}
    </div>
  );
}

// Gold-framed HP heart bar
function HpBar({
  hp, maxHp, color, label, flip = false,
}: {
  hp: number; maxHp: number; color: string; label: string; flip?: boolean;
}) {
  return (
    <div style={{
      display:       "flex",
      flexDirection: flip ? "row-reverse" : "row",
      alignItems:    "center",
      gap:           "6px",
    }}>
      {/* Name badge */}
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "9px",
        fontWeight:    700,
        color:         C.midGray,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        minWidth:      "60px",
        textAlign:     flip ? "right" : "left",
      }}>{label}</div>
      {/* Gold-framed heart row */}
      <div style={{
        display:         "flex",
        flexDirection:   flip ? "row-reverse" : "row",
        gap:             "3px",
        background:      "rgba(255,255,255,0.65)",
        border:          `1px solid ${C.gold}44`,
        borderRadius:    "10px",
        padding:         "4px 8px",
        backdropFilter:  "blur(8px)",
        boxShadow:       `0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
      }}>
        {Array.from({ length: maxHp }).map((_, i) => {
          const filled = i < hp;
          return (
            <div key={i} style={{
              fontSize:  "13px",
              filter:    filled ? "none" : "grayscale(1) opacity(0.3)",
              transition:"filter 0.22s ease",
              animation: filled && hp === 1 ? "g2dHeartBeat 1.2s ease-in-out infinite" : "none",
            }}>❤️</div>
          );
        })}
      </div>
    </div>
  );
}

// Round progress dots
function RoundDots({
  total, playerScore, oppScore,
}: {
  total: number; playerScore: number; oppScore: number;
}) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "6px",
    }}>
      {Array.from({ length: total }).map((_, i) => {
        const pWin = i < playerScore;
        const oWin = i < oppScore;
        const col  = pWin ? C.playerBlue : oWin ? C.oppRed : C.steel;
        return (
          <div key={i} style={{
            width:        10,
            height:       10,
            borderRadius: "50%",
            background:   col,
            border:       `1.5px solid ${pWin || oWin ? col : C.platinum}`,
            boxShadow:    pWin || oWin ? `0 0 8px ${col}66` : "none",
            transition:   "all 0.28s",
          }}/>
        );
      })}
    </div>
  );
}

// Demo wallet HUD
function DemoWalletBadge({
  balance, betAmount, lastDelta,
}: {
  balance: number; betAmount: number; lastDelta: number | null;
}) {
  return (
    <div style={{
      position:        "absolute",
      top:             "50%",
      left:            "50%",
      transform:       "translate(-50%,-50%) translateY(-12px)",
      textAlign:       "center",
      pointerEvents:   "none",
    }}>
      <div style={{
        background:      "rgba(255,255,255,0.82)",
        border:          `1px solid ${C.gold}55`,
        borderRadius:    "12px",
        padding:         "8px 18px",
        backdropFilter:  "blur(12px)",
        boxShadow:       `0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)`,
      }}>
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "8px",
          fontWeight:    600,
          color:         C.midGray,
          letterSpacing: "2px",
          marginBottom:  "2px",
        }}>DEMO WALLET</div>
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "22px",
          fontWeight:    700,
          color:         C.charcoal,
          letterSpacing: "-0.5px",
        }}>${fmt(balance)}</div>
        {lastDelta !== null && (
          <div style={{
            fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
            fontSize:      "13px",
            fontWeight:    700,
            color:         lastDelta > 0 ? C.successGreen : lastDelta < 0 ? C.oppRed : C.gold,
            animation:     "g2dCoinCount 0.3s ease",
            marginTop:     "2px",
          }}>
            {lastDelta > 0 ? `+$${fmt(lastDelta)}` : lastDelta < 0 ? `-$${fmt(Math.abs(lastDelta))}` : "PUSH"}
          </div>
        )}
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "8px",
          color:         C.lightGray,
          letterSpacing: "1.5px",
          marginTop:     "3px",
        }}>BET ${fmt(betAmount)}</div>
      </div>
    </div>
  );
}

// 2D Character silhouette (SVG-like drawn with divs)
function Character2D({
  isPlayer, color, side, action, hp, maxHp,
}: {
  isPlayer: boolean; color: string; side: "left" | "right";
  action: "idle" | "shoot" | "hit" | "win" | "dead"; hp: number; maxHp: number;
}) {
  const flip = side === "right";
  const anim: CSSProperties["animation"] =
    action === "idle"  ? "g2dSway 2.2s ease-in-out infinite" :
    action === "hit"   ? "g2dShake 0.4s ease" :
    action === "win"   ? "g2dHeartBeat 0.7s ease-in-out 3" :
    action === "dead"  ? "none" :
    "none";

  const lowHp  = hp <= 1;
  const transform = [
    flip ? "scaleX(-1)" : "",
    action === "dead" ? "rotate(90deg) translateY(25%)" : "",
  ].join(" ");

  return (
    <div style={{
      width:        "clamp(60px, 14vw, 100px)",
      height:       "clamp(110px, 26vw, 185px)",
      position:     "relative",
      animation:    anim,
      transform,
      transition:   "transform 0.5s ease",
      filter:       lowHp
        ? "drop-shadow(0 0 12px rgba(255,59,48,0.42))"
        : action === "shoot"
          ? `drop-shadow(0 0 10px ${color}88)`
          : "drop-shadow(0 0 6px rgba(0,0,0,0.10))",
    }}>
      <svg viewBox="0 0 60 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        {/* ── HELMET ── */}
        <ellipse cx="30" cy="12" rx="13" ry="11" fill={C.pearl} stroke={C.steel} strokeWidth="0.8"/>
        {/* Visor */}
        <rect x="18" y="13" width="24" height="8" rx="2" fill={color} opacity="0.85"/>
        {/* Gold visor trim */}
        <rect x="18" y="12" width="24" height="1.5" rx="0.5" fill={C.gold}/>
        {/* Gold helmet ridge */}
        <rect x="24" y="6" width="12" height="2" rx="1" fill={C.lightGold}/>

        {/* ── HEAD / NECK ── */}
        <ellipse cx="30" cy="22" rx="9.5" ry="9" fill="#C8A882"/>
        <rect x="27" y="29" width="6" height="5" rx="1.5" fill="#C8A882"/>

        {/* ── TORSO (vest) ── */}
        <rect x="18" y="33" width="24" height="26" rx="4" fill={C.warmWhite} stroke={C.steel} strokeWidth="0.5"/>
        {/* Chest plate */}
        <rect x="20" y="35" width="20" height="16" rx="2.5" fill={C.white} stroke={C.platinum} strokeWidth="0.4"/>
        {/* Gold center strip */}
        <rect x="28.5" y="35" width="3" height="16" fill={C.gold} opacity="0.45"/>
        {/* Team accent patch */}
        <rect x="21" y="37" width="8" height="3" rx="1" fill={color} opacity="0.85"/>
        {/* Belt */}
        <rect x="18" y="56" width="24" height="4" rx="1.5" fill={C.steel}/>
        <rect x="28" y="56.5" width="4" height="3" rx="0.8" fill={C.gold}/>

        {/* ── PANTS ── */}
        <rect x="19" y="59" width="9" height="26" rx="3" fill={isPlayer ? "#1A3A5C" : "#3A1A1A"}/>
        <rect x="32" y="59" width="9" height="26" rx="3" fill={isPlayer ? "#1A3A5C" : "#3A1A1A"}/>

        {/* Knee pads */}
        <ellipse cx="23.5" cy="74" rx="5.5" ry="4.5" fill={C.pearl} stroke={C.steel} strokeWidth="0.5"/>
        <ellipse cx="36.5" cy="74" rx="5.5" ry="4.5" fill={C.pearl} stroke={C.steel} strokeWidth="0.5"/>
        <line x1="21" y1="74" x2="26" y2="74" stroke={C.gold} strokeWidth="0.8"/>
        <line x1="34" y1="74" x2="39" y2="74" stroke={C.gold} strokeWidth="0.8"/>

        {/* Boots */}
        <rect x="17" y="83" width="12" height="8" rx="2" fill={C.pearl} stroke={C.darkSteel} strokeWidth="0.5"/>
        <rect x="31" y="83" width="12" height="8" rx="2" fill={C.pearl} stroke={C.darkSteel} strokeWidth="0.5"/>
        {/* Gold boot lace bar */}
        <line x1="19" y1="85" x2="27" y2="85" stroke={C.gold} strokeWidth="0.8"/>
        <line x1="33" y1="85" x2="41" y2="85" stroke={C.gold} strokeWidth="0.8"/>

        {/* ── LEFT ARM ── */}
        <rect x="9" y="34" width="8" height="18" rx="3.5" fill={C.pearl} stroke={C.platinum} strokeWidth="0.4"/>
        {/* Elbow pad */}
        <ellipse cx="13" cy="48" rx="4.5" ry="3.5" fill={C.pearl} stroke={C.steel} strokeWidth="0.5"/>
        {/* Glove */}
        <ellipse cx="13" cy="55" rx="4" ry="3.5" fill={C.warmWhite} stroke={C.gold} strokeWidth="0.6"/>

        {/* ── RIGHT ARM + GUN ── */}
        <rect x="43" y="34" width="8" height="18" rx="3.5"
          fill={C.pearl} stroke={C.platinum} strokeWidth="0.4"
          transform={action === "shoot" ? "rotate(-15,47,43)" : ""}/>
        <ellipse cx="47" cy="48" rx="4.5" ry="3.5" fill={C.pearl} stroke={C.steel} strokeWidth="0.5"/>
        <ellipse cx="47" cy="55" rx="4" ry="3.5" fill={C.warmWhite} stroke={C.gold} strokeWidth="0.6"/>

        {/* Gun body */}
        <rect x="44" y="42" width="13" height="7" rx="2"
          fill={C.pearl} stroke={C.steel} strokeWidth="0.5"
          transform={action === "shoot" ? "rotate(-8,50,45)" : ""}/>
        {/* Barrel */}
        <rect x="54" y="43" width="10" height="3" rx="1.2" fill={C.steel}
          transform={action === "shoot" ? "rotate(-8,50,45)" : ""}/>
        {/* Gold barrel tip */}
        <rect x="63" y="43.3" width="2.5" height="2.4" rx="0.8" fill={C.gold}
          transform={action === "shoot" ? "rotate(-8,50,45)" : ""}/>
        {/* Hopper */}
        <ellipse cx="48" cy="40" rx="4.5" ry="4" fill={C.lightGold} opacity="0.85"
          transform={action === "shoot" ? "rotate(-8,50,45)" : ""}/>

        {/* Muzzle flash when shooting */}
        {action === "shoot" && (
          <>
            <ellipse cx="67" cy="44" rx="5" ry="3.5" fill="#FFF" opacity="0.9" transform="rotate(-8,50,44)"/>
            <ellipse cx="67" cy="44" rx="7" ry="5" fill={color} opacity="0.55" transform="rotate(-8,50,44)"/>
            <ellipse cx="67" cy="44" rx="9" ry="7" fill={C.gold} opacity="0.22" transform="rotate(-8,50,44)"/>
          </>
        )}

        {/* Shoulder pads */}
        <ellipse cx="16" cy="37" rx="5.5" ry="4.5" fill={C.pearl} stroke={C.gold} strokeWidth="0.6"/>
        <ellipse cx="44" cy="37" rx="5.5" ry="4.5" fill={C.pearl} stroke={C.gold} strokeWidth="0.6"/>

        {/* Low HP red X overlay */}
        {hp === 0 && (
          <>
            <line x1="12" y1="12" x2="48" y2="80" stroke={C.oppRed} strokeWidth="2.5" opacity="0.6" strokeLinecap="round"/>
            <line x1="48" y1="12" x2="12" y2="80" stroke={C.oppRed} strokeWidth="2.5" opacity="0.6" strokeLinecap="round"/>
          </>
        )}
      </svg>

      {/* Pearl paint-drip effect on hit */}
      {action === "hit" && (
        <div style={{
          position:   "absolute",
          top:        0,
          left:       "50%",
          transform:  "translateX(-50%)",
          width:      "80%",
          height:     "100%",
          overflow:   "hidden",
          pointerEvents: "none",
          zIndex:     2,
        }}>
          {[12, 30, 50, 70, 88].map((left, i) => (
            <div key={i} style={{
              position:     "absolute",
              top:          0,
              left:         `${left}%`,
              width:        `${3 + (i % 3) * 2}px`,
              background:   `linear-gradient(${color}, ${color}00)`,
              borderRadius: "0 0 4px 4px",
              opacity:      0.65 - i * 0.08,
              ["--drip-h" as string]: `${35 + i * 12}%`,
              animation:    `g2dDrip ${0.22 + i * 0.04}s ${i * 0.06}s ease-out forwards`,
              height:        0,
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// Targeting reticle
function Reticle({
  x, y, active, color, spinning,
}: {
  x: number; y: number; active: boolean; color: string; spinning: boolean;
}) {
  const size = 44;
  return (
    <div style={{
      position:      "absolute",
      left:          x,
      top:           y,
      width:         size,
      height:        size,
      transform:     "translate(-50%, -50%)",
      pointerEvents: "none",
      opacity:       active ? 1 : 0,
      transition:    "opacity 0.2s, left 0.22s cubic-bezier(0.34,1.56,0.64,1), top 0.22s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {/* Outer ring */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ animation: spinning ? "g2dAimSpin 2.5s linear infinite" : "none" }}>
        <circle cx={size/2} cy={size/2} r={size/2-2} fill="none" stroke={color} strokeWidth="1.5"
          strokeDasharray="10 6" opacity="0.85"/>
      </svg>
      {/* Center cross */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <line x1={size/2} y1={size/2-8} x2={size/2} y2={size/2-3} stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1={size/2} y1={size/2+3} x2={size/2} y2={size/2+8} stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1={size/2-8} y1={size/2} x2={size/2-3} y2={size/2} stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1={size/2+3} y1={size/2} x2={size/2+8} y2={size/2} stroke={color} strokeWidth="2" strokeLinecap="round"/>
        {/* Gold center dot */}
        <circle cx={size/2} cy={size/2} r="2.5" fill={C.gold}/>
      </svg>
      {/* Glow behind */}
      <div style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%,-50%)",
        width:        size * 1.8,
        height:       size * 1.8,
        borderRadius: "50%",
        background:   `radial-gradient(circle, ${color}22, transparent 65%)`,
        pointerEvents:"none",
      }}/>
    </div>
  );
}

// Projectile arc animation
function ProjectileArc({
  fromX, fromY, toX, toY, color, progress,
}: {
  fromX: number; fromY: number; toX: number; toY: number; color: string; progress: number;
}) {
  // Lerp current position
  const cx  = lerp(fromX, toX, progress);
  const cy  = lerp(fromY, toY, progress) - Math.sin(progress * Math.PI) * 28;
  const visible = progress > 0 && progress < 1;

  return (
    <div style={{
      position:      "absolute",
      left:          cx,
      top:           cy,
      transform:     "translate(-50%,-50%)",
      pointerEvents: "none",
      opacity:       visible ? 1 : 0,
      transition:    "opacity 0.08s",
    }}>
      {/* Pearl ball */}
      <div style={{
        width:        12,
        height:       12,
        borderRadius: "50%",
        background:   `radial-gradient(circle at 35% 30%, ${C.white}, ${color})`,
        border:       `1.5px solid ${color}`,
        boxShadow:    `0 0 10px ${color}88, 0 0 20px ${color}44`,
      }}/>
      {/* Gold trail */}
      {[1,2,3].map(i=>(
        <div key={i} style={{
          position:     "absolute",
          top:          "50%",
          left:         `${-(i*7)-8}px`,
          transform:    "translateY(-50%)",
          width:        `${8-i*2}px`,
          height:       `${6-i*1.5}px`,
          borderRadius: "50%",
          background:   i===1 ? color : C.lightGold,
          opacity:      0.55-i*0.12,
        }}/>
      ))}
    </div>
  );
}

// Impact burst
function ImpactBurst({
  x, y, color, visible,
}: {
  x: number; y: number; color: string; visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div style={{
      position:      "absolute",
      left:          x,
      top:           y,
      transform:     "translate(-50%,-50%)",
      pointerEvents: "none",
    }}>
      {/* Shockwave ring */}
      <div style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%,-50%)",
        width:        "80px",
        height:       "80px",
        borderRadius: "50%",
        border:       `3px solid ${C.gold}`,
        animation:    "g2dBurstPop 0.45s ease-out forwards",
      }}/>
      {/* Color burst */}
      <div style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%,-50%)",
        width:        "55px",
        height:       "55px",
        borderRadius: "50%",
        background:   `radial-gradient(circle, ${color}cc, ${color}44, transparent)`,
        animation:    "g2dBurstPop 0.38s ease-out forwards",
      }}/>
      {/* Pearl inner flash */}
      <div style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%,-50%)",
        width:        "30px",
        height:       "30px",
        borderRadius: "50%",
        background:   "radial-gradient(circle, white, transparent)",
        animation:    "g2dBurstPop 0.25s ease-out forwards",
      }}/>
      {/* Paint drips radiating out */}
      {[0,45,90,135,180,225,270,315].map(deg=>{
        const r = (deg*Math.PI)/180;
        const tx = Math.cos(r)*32;
        const ty = Math.sin(r)*32;
        return(
          <div key={deg} style={{
            position:     "absolute",
            top:          "50%",
            left:         "50%",
            width:        "6px",
            height:       "6px",
            borderRadius: "50%",
            background:   color,
            transform:    `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
            animation:    `g2dTrailFade 0.55s ease-out forwards`,
            opacity:       0.85,
          }}/>
        );
      })}
    </div>
  );
}

// Confetti burst
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 28 }).map((_, i) => ({
    color: [C.gold, C.lightGold, C.playerBlue, C.pearl, C.chrome][i % 5],
    left:  rnd(5, 95),
    delay: rnd(0, 0.6),
    dur:   rnd(1.2, 2.2),
    size:  rnd(6, 12),
    rot:   rnd(-180, 180),
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 50 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position:    "absolute",
          top:         "-20px",
          left:        `${p.left}%`,
          width:       p.size,
          height:      p.size,
          borderRadius: i % 2 === 0 ? "50%" : "2px",
          background:  p.color,
          boxShadow:   `0 0 6px ${p.color}66`,
          animation:   `g2dConfetti ${p.dur}s ${p.delay}s ease-in forwards`,
          transform:   `rotate(${p.rot}deg)`,
          opacity:     0.88,
        }}/>
      ))}
    </div>
  );
}

// Countdown overlay
function CountdownOverlay({ value, show }: { value: number | string; show: boolean }) {
  if (!show) return null;
  const isGo    = value === "GO!";
  const color   = isGo ? C.playerBlue : C.gold;
  return (
    <div style={{
      position:        "absolute",
      inset:           0,
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      background:      "rgba(250,250,248,0.55)",
      backdropFilter:  "blur(4px)",
      zIndex:          40,
    }}>
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display','Cormorant Garamond',serif",
        fontSize:      "clamp(72px,22vw,130px)",
        fontWeight:    700,
        color,
        textShadow:    `0 0 40px ${color}55, 0 2px 4px rgba(0,0,0,0.08)`,
        animation:     "g2dBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        letterSpacing: "-2px",
      }}>
        {value}
      </div>
    </div>
  );
}

// Weapon pick card
function WeaponCard({
  label, subtitle, icon, selected, onClick, color,
}: {
  label: string; subtitle: string; icon: string;
  selected: boolean; onClick: () => void; color: string;
}) {
  return (
    <div onClick={onClick} style={{
      width:           "clamp(75px, 20vw, 110px)",
      padding:         "12px 8px",
      borderRadius:    "14px",
      background:      selected
        ? `linear-gradient(145deg, rgba(255,255,255,0.95), rgba(245,245,247,0.88))`
        : "rgba(255,255,255,0.65)",
      border:          `1.5px solid ${selected ? color : C.platinum}`,
      boxShadow:       selected
        ? `0 0 0 2px ${color}33, 0 8px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95)`
        : `0 3px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
      cursor:          "pointer",
      textAlign:       "center",
      transition:      "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
      transform:       selected ? "translateY(-3px) scale(1.04)" : "none",
      backdropFilter:  "blur(10px)",
    }}>
      <div style={{ fontSize: "clamp(22px,6vw,32px)", marginBottom: "6px" }}>{icon}</div>
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "10px",
        fontWeight:    700,
        color:         selected ? color : C.charcoal,
        letterSpacing: "1px",
        textTransform: "uppercase",
        transition:    "color 0.15s",
      }}>{label}</div>
      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "8px",
        color:         C.midGray,
        marginTop:     "3px",
        letterSpacing: "0.5px",
      }}>{subtitle}</div>
    </div>
  );
}

// Bet chip
function BetChip({
  amount, selected, onClick, color,
}: {
  amount: number; selected: boolean; onClick: () => void; color: string;
}) {
  return (
    <div onClick={onClick} style={{
      padding:       "6px 14px",
      borderRadius:  "20px",
      background:    selected
        ? `linear-gradient(135deg, ${color}22, ${color}11)`
        : "rgba(255,255,255,0.70)",
      border:        `1.5px solid ${selected ? color : C.platinum}`,
      boxShadow:     selected
        ? `0 0 12px ${color}33, inset 0 1px 0 rgba(255,255,255,0.9)`
        : `0 2px 6px rgba(0,0,0,0.06)`,
      fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
      fontSize:      "11px",
      fontWeight:    700,
      color:         selected ? color : C.charcoal,
      cursor:        "pointer",
      transition:    "all 0.15s",
      transform:     selected ? "scale(1.08)" : "none",
    }}>
      ${amount}
    </div>
  );
}

// Match result overlay
function MatchResultPanel({
  playerWon, playerScore, oppScore, stakeAmount, eloDelta,
  gameMode, demoBalance, onRematch, onHome,
}: {
  playerWon: boolean; playerScore: number; oppScore: number;
  stakeAmount: number; eloDelta: number; gameMode: "demo"|"real";
  demoBalance: number; onRematch: ()=>void; onHome: ()=>void;
}) {
  const [coinAnim, setCoinAnim] = useState(0);
  const payout = playerWon ? stakeAmount * PAYOUT_MULT.normal : 0;

  useEffect(() => {
    if (!playerWon || stakeAmount <= 0) return;
    let n = 0;
    const step = payout / 26;
    const id = setInterval(() => {
      n = Math.min(n + step, payout);
      setCoinAnim(n);
      if (n >= payout) clearInterval(id);
    }, 48);
    return () => clearInterval(id);
  }, [playerWon, payout, stakeAmount]);

  const titleColor = playerWon ? C.playerBlue : C.oppRed;
  const title      = playerWon ? "VICTORY" : "DEFEAT";

  return (
    <div style={{
      position:        "absolute",
      inset:           0,
      background:      "rgba(245,242,236,0.92)",
      backdropFilter:  "blur(18px)",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      zIndex:          60,
      gap:             "14px",
      animation:       "g2dFadeIn 0.4s ease",
    }}>
      {/* Gold separator top */}
      <div style={{ width:"120px", height:"1px", background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }}/>

      <div style={{
        fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
        fontSize:      "clamp(38px,12vw,72px)",
        fontWeight:    700,
        color:         titleColor,
        letterSpacing: "-1px",
        textShadow:    `0 2px 8px ${titleColor}33`,
        animation:     "g2dBounce 0.55s cubic-bezier(0.34,1.56,0.64,1)",
      }}>{title}</div>

      {/* Score */}
      <div style={{ display:"flex", alignItems:"center", gap:"18px" }}>
        <div style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "clamp(34px,10vw,56px)", fontWeight:700,
          color:      C.playerBlue,
        }}>{playerScore}</div>
        <div style={{ color: C.lightGray, fontSize:"20px" }}>—</div>
        <div style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "clamp(34px,10vw,56px)", fontWeight:700,
          color:      C.oppRed,
        }}>{oppScore}</div>
      </div>

      {/* ELO */}
      {eloDelta !== 0 && (
        <div style={{
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          fontSize:      "13px",
          fontWeight:    700,
          color:         eloDelta > 0 ? C.successGreen : C.oppRed,
          letterSpacing: "1.5px",
          animation:     "g2dSlideUp 0.4s 0.2s ease both",
        }}>ELO {eloDelta > 0 ? `+${eloDelta}` : eloDelta}</div>
      )}

      {/* Payout */}
      {stakeAmount > 0 && (
        <div style={{
          background:      "rgba(255,255,255,0.82)",
          border:          `1px solid ${titleColor}33`,
          borderRadius:    "14px",
          padding:         "12px 28px",
          textAlign:       "center",
          backdropFilter:  "blur(8px)",
          boxShadow:       `0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)`,
          animation:       "g2dSlideUp 0.4s 0.35s ease both",
        }}>
          <div style={{
            fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
            fontSize:      "8px", color:C.midGray, letterSpacing:"2px", marginBottom:"4px",
          }}>{playerWon ? "EARNED" : "LOST"}</div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Display',sans-serif",
            fontSize:   "clamp(22px,7vw,34px)", fontWeight:700,
            color:      playerWon ? C.successGreen : C.oppRed,
          }}>
            {playerWon ? `+$${fmt(coinAnim)}` : `-$${fmt(stakeAmount)}`}
          </div>
          {gameMode === "demo" && (
            <div style={{
              fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
              fontSize:      "8px", color:C.warningAmber, letterSpacing:"1.5px", marginTop:"3px",
            }}>DEMO CURRENCY</div>
          )}
        </div>
      )}

      {/* Gold separator */}
      <div style={{ width:"120px", height:"1px", background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }}/>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"10px" }}>
        <button onClick={onRematch} style={{
          padding:       "13px 32px",
          background:    `linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,245,247,0.90))`,
          border:        `1.5px solid ${titleColor}`,
          color:         titleColor,
          fontSize:      "13px", fontWeight:700,
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          letterSpacing: "1.5px",
          cursor:        "pointer",
          borderRadius:  "10px",
          boxShadow:     `0 0 18px ${titleColor}22, 0 4px 12px rgba(0,0,0,0.08)`,
          transition:    "all 0.15s",
        }}>REMATCH</button>
        <button onClick={onHome} style={{
          padding:       "13px 22px",
          background:    "rgba(255,255,255,0.65)",
          border:        `1.5px solid ${C.platinum}`,
          color:         C.midGray, fontSize:"12px",
          fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
          letterSpacing: "1px",
          cursor:        "pointer",
          borderRadius:  "10px",
          transition:    "all 0.15s",
        }}>EXIT</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main game component
// ─────────────────────────────────────────────────────────────

export default function PaintballGame2D({
  playerName    = "YOU",
  opponentName  = "OPPONENT",
  maxRounds     = 3,
  isBot         = true,
  botDifficulty = "normal",
  gameMode      = "demo",
  demoBalance:  initBalance = 1000,
  betAmount:    initBet    = 25,
  playerColor   = C.playerBlue,
  opponentColor = C.oppRed,
  maxHp         = 3,
  onMatchEnd,
  onHome,
}: PaintballGame2DProps) {

  useEffect(injectCSS, []);

  // ── Game state ─────────────────────────────────────────────
  const [phase,          setPhase]          = useState<Phase>("pick");
  const [round,          setRound]          = useState(1);
  const [playerScore,    setPlayerScore]    = useState(0);
  const [oppScore,       setOppScore]       = useState(0);
  const [playerHp,       setPlayerHp]       = useState(maxHp);
  const [oppHp,          setOppHp]          = useState(maxHp);
  const [countdown,      setCountdown]      = useState(3);
  const [playerAction,   setPlayerAction]   = useState<"idle"|"shoot"|"hit"|"win"|"dead">("idle");
  const [oppAction,      setOppAction]      = useState<"idle"|"shoot"|"hit"|"win"|"dead">("idle");
  const [reticlePos,     setReticlePos]     = useState({ x: 240, y: 180 });
  const [reticleActive,  setReticleActive]  = useState(false);
  const [projProgress,   setProjProgress]   = useState(-1);
  const [projFromPlayer, setProjFromPlayer] = useState(true);
  const [impactX,        setImpactX]        = useState(0);
  const [impactY,        setImpactY]        = useState(0);
  const [showImpact,     setShowImpact]     = useState(false);
  const [roundMsg,       setRoundMsg]       = useState("");
  const [demoBalance,    setDemoBalance]    = useState(initBalance);
  const [lastDelta,      setLastDelta]      = useState<number | null>(null);
  const [difficulty,     setDifficulty]     = useState<Difficulty>(botDifficulty);
  const [betAmount,      setBetAmount]      = useState(initBet);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [matchOver,      setMatchOver]      = useState(false);
  const [playerWonMatch, setPlayerWonMatch] = useState(false);
  const [eloDelta,       setEloDelta]       = useState(0);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [lowHpVignette,  setLowHpVignette]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pushTimer = (id: ReturnType<typeof setTimeout>) => { timerRef.current.push(id); };

  // ── Cleanup ────────────────────────────────────────────────
  useEffect(() => {
    return () => { timerRef.current.forEach(clearTimeout); };
  }, []);

  // ── Low HP vignette ────────────────────────────────────────
  useEffect(() => {
    setLowHpVignette(playerHp <= 1 && playerHp > 0);
  }, [playerHp]);

  // ── Phase machine ──────────────────────────────────────────

  const startRound = useCallback(() => {
    setPhase("countdown");
    setPlayerAction("idle");
    setOppAction("idle");
    setPlayerHp(maxHp);
    setOppHp(maxHp);
    setReticleActive(false);
    setProjProgress(-1);
    setShowImpact(false);
    setCountdown(3);

    // 3… 2… 1… GO!
    pushTimer(setTimeout(() => setCountdown(2), 1000));
    pushTimer(setTimeout(() => setCountdown(1), 2000));
    pushTimer(setTimeout(() => setCountdown(0), 3000));
    pushTimer(setTimeout(() => {
      setPhase("emerge");
      setCountdown(-1);
    }, 3400));
    pushTimer(setTimeout(() => {
      setPhase("aim");
      setReticleActive(true);
    }, 4200));
  }, [maxHp]);

  // Auto-advance aim → fire (bot shoots after delay)
  useEffect(() => {
    if (phase !== "aim") return;
    const botReact = difficulty === "easy"   ? 2800
                   : difficulty === "normal" ? 1900
                   : 1200;

    // Animate reticle toward opponent
    const animateReticle = setInterval(() => {
      setReticlePos(prev => ({
        x: lerp(prev.x, 230, 0.08),
        y: lerp(prev.y, 155, 0.08),
      }));
    }, 16);

    const fireId = setTimeout(() => {
      clearInterval(animateReticle);
      fireRound();
    }, botReact);

    timerRef.current.push(fireId);

    return () => {
      clearInterval(animateReticle);
      clearTimeout(fireId);
    };
  }, [phase, difficulty]);

  const fireRound = useCallback(() => {
    setPhase("fire");
    setReticleActive(false);

    // Determine who fires and who gets hit
    const playerAcc = difficulty === "easy"   ? 0.55
                    : difficulty === "normal" ? 0.72
                    : 0.85;
    const botFires     = Math.random() < (1 - playerAcc);
    const playerHitOpp = !botFires;

    setProjFromPlayer(!botFires); // true = player fires
    setPlayerAction(botFires ? "idle" : "shoot");
    setOppAction(botFires ? "shoot" : "idle");

    // Animate projectile 0 → 1
    let prog = 0;
    const fps = 60;
    const dur  = 0.55; // seconds
    const step = 1 / (fps * dur);
    const projInterval = setInterval(() => {
      prog = Math.min(prog + step, 1);
      setProjProgress(prog);
      if (prog >= 1) {
        clearInterval(projInterval);
        // Impact
        setPhase("impact");
        setShowImpact(true);
        setImpactX(playerHitOpp ? 300 : 85);
        setImpactY(145);
        if (playerHitOpp) {
          setOppAction("hit");
          pushTimer(setTimeout(() => { setOppAction("idle"); setOppHp(h => Math.max(0, h - 1)); }, 400));
        } else {
          setPlayerAction("hit");
          pushTimer(setTimeout(() => { setPlayerAction("idle"); setPlayerHp(h => Math.max(0, h - 1)); }, 400));
        }
        // Result
        pushTimer(setTimeout(() => {
          setShowImpact(false);
          advanceRound(playerHitOpp);
        }, 900));
      }
    }, 1000 / fps);
    timerRef.current.push(setInterval(() => {}, 0)); // just push something
  }, [difficulty]);

  const advanceRound = useCallback((playerHitOpp: boolean) => {
    setPhase("result");

    const pWins = playerHitOpp;
    const newMsg = pWins ? "HIT! YOU WIN THE ROUND" : "DODGED! OPPONENT WINS";
    setRoundMsg(newMsg);

    // Update scores
    const newPS = playerScore + (pWins ? 1 : 0);
    const newOS = oppScore    + (pWins ? 0 : 1);
    setPlayerScore(newPS);
    setOppScore(newOS);

    // Demo balance delta
    if (gameMode === "demo") {
      const delta = pWins ? betAmount : -betAmount;
      setDemoBalance(b => b + delta);
      setLastDelta(delta);
      pushTimer(setTimeout(() => setLastDelta(null), 2800));
    }

    // Win animations
    if (pWins) {
      setPlayerAction("win");
      pushTimer(setTimeout(() => setPlayerAction("idle"), 1500));
    } else {
      setOppAction("win");
      pushTimer(setTimeout(() => setOppAction("idle"), 1500));
    }

    // Check match end
    const winsNeeded = Math.ceil(maxRounds / 2);
    if (newPS >= winsNeeded || newOS >= winsNeeded || round >= maxRounds) {
      const matchPlayerWon = newPS > newOS;
      pushTimer(setTimeout(() => {
        setMatchOver(true);
        setPlayerWonMatch(matchPlayerWon);
        if (matchPlayerWon) setShowConfetti(true);
        const elo = matchPlayerWon ? 18 : -14;
        setEloDelta(elo);
        onMatchEnd?.({ playerWon: matchPlayerWon, finalBalance: demoBalance + (matchPlayerWon ? betAmount : -betAmount) });
      }, 2200));
    } else {
      // Next round
      pushTimer(setTimeout(() => {
        setRound(r => r + 1);
        startRound();
      }, 2400));
    }
  }, [playerScore, oppScore, round, maxRounds, betAmount, gameMode, demoBalance, startRound, onMatchEnd]);

  // ── PICK PHASE ────────────────────────────────────────────
  const handleStartGame = useCallback(() => {
    startRound();
  }, [startRound]);

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────

  const canvasH = "min(520px, 92vw)";
  const canvasW = "min(520px, 92vw)";

  // Projectile endpoints
  const projFromX = projFromPlayer ? 260 : 90;
  const projFromY = 145;
  const projToX   = projFromPlayer ? 90  : 260;
  const projToY   = 145;

  return (
    <div style={{
      position:        "relative",
      width:           canvasW,
      height:          canvasH,
      margin:          "0 auto",
      borderRadius:    "20px",
      overflow:        "hidden",
      boxShadow:       "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
      border:          `1px solid ${C.platinum}`,
      userSelect:      "none",
      fontFamily:      "-apple-system,'SF Pro Display',sans-serif",
    }}>
      {/* Marble background */}
      <MarbleBackground/>

      {/* Low HP vignette */}
      {lowHpVignette && (
        <div style={{
          position:      "absolute",
          inset:         0,
          background:    `radial-gradient(ellipse at center, transparent 45%, ${C.oppRed}28 100%)`,
          boxShadow:     `inset 0 0 60px ${C.oppRed}28`,
          pointerEvents: "none",
          zIndex:        5,
          animation:     "g2dPulse 1.2s ease-in-out infinite",
        }}/>
      )}

      {/* ── PICK PHASE ─────────────────────────────────── */}
      {phase === "pick" && (
        <div style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "16px",
          padding:        "24px",
          animation:      "g2dFadeIn 0.35s ease",
          zIndex:         10,
        }}>
          {/* Logo */}
          <div style={{
            fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
            fontSize:      "clamp(22px,6vw,32px)",
            fontWeight:    700,
            color:         C.charcoal,
            letterSpacing: "-0.5px",
            animation:     "g2dGoldGlow 2.5s ease-in-out infinite",
          }}>KILL OR BE KILLED</div>
          <div style={{
            width:      "80px",
            height:     "1.5px",
            background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
          }}/>

          {/* Weapon selection */}
          <div style={{
            fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
            fontSize:      "9px",
            fontWeight:    600,
            color:         C.midGray,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
          }}>SELECT LOADOUT</div>
          <div style={{ display:"flex", gap:"10px" }}>
            {[
              { label:"PRECISION", subtitle:"Long range",  icon:"🎯", color:C.playerBlue },
              { label:"ASSAULT",   subtitle:"Rapid fire",  icon:"🔫", color:C.oppRed },
              { label:"TACTICAL",  subtitle:"Balanced",    icon:"⚡", color:C.gold },
            ].map((w, i) => (
              <WeaponCard key={i} {...w} selected={selectedWeapon===i} onClick={()=>setSelectedWeapon(i)}/>
            ))}
          </div>

          {/* Difficulty */}
          {isBot && (
            <>
              <div style={{
                fontFamily: "-apple-system,'SF Pro Display',sans-serif",
                fontSize:"9px", fontWeight:600, color:C.midGray, letterSpacing:"2.5px",
              }}>DIFFICULTY</div>
              <div style={{ display:"flex", gap:"8px" }}>
                {(["easy","normal","hard"] as Difficulty[]).map(d=>(
                  <div key={d} onClick={()=>setDifficulty(d)} style={{
                    padding:       "7px 16px",
                    borderRadius:  "20px",
                    background:    difficulty===d ? `${playerColor}18` : "rgba(255,255,255,0.65)",
                    border:        `1.5px solid ${difficulty===d ? playerColor : C.platinum}`,
                    fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
                    fontSize:      "10px", fontWeight:700,
                    color:         difficulty===d ? playerColor : C.midGray,
                    cursor:        "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    transition:    "all 0.15s",
                    transform:     difficulty===d ? "scale(1.06)" : "none",
                  }}>{d}</div>
                ))}
              </div>
            </>
          )}

          {/* Demo bet chips */}
          {gameMode === "demo" && (
            <>
              <div style={{
                fontFamily: "-apple-system,'SF Pro Display',sans-serif",
                fontSize:"9px", fontWeight:600, color:C.midGray, letterSpacing:"2.5px",
              }}>BET PER ROUND</div>
              <div style={{ display:"flex", gap:"8px" }}>
                {[10,25,50,100].map(amt=>(
                  <BetChip key={amt} amount={amt} selected={betAmount===amt}
                    onClick={()=>setBetAmount(amt)} color={C.gold}/>
                ))}
              </div>
              <div style={{
                fontFamily: "-apple-system,'SF Pro Display',sans-serif",
                fontSize:"10px", color:C.midGray,
              }}>Balance: <strong style={{ color:C.charcoal }}>${fmt(demoBalance)}</strong></div>
            </>
          )}

          {/* Start button */}
          <button onClick={handleStartGame} style={{
            marginTop:     "8px",
            padding:       "14px 44px",
            borderRadius:  "14px",
            background:    `linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,245,247,0.90))`,
            border:        `1.5px solid ${playerColor}`,
            color:         playerColor,
            fontSize:      "14px", fontWeight:700,
            fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
            letterSpacing: "2px",
            cursor:        "pointer",
            boxShadow:     `0 0 22px ${playerColor}28, 0 5px 16px rgba(0,0,0,0.08)`,
            transition:    "all 0.18s",
            textTransform: "uppercase",
          }}>FIGHT</button>
        </div>
      )}

      {/* ── GAME FIELD ─────────────────────────────────── */}
      {phase !== "pick" && (
        <div style={{
          position:   "absolute",
          inset:      0,
          display:    "flex",
          flexDirection: "column",
        }}>
          {/* Score header */}
          <div style={{
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "center",
            padding:         "12px 16px 8px",
            background:      "rgba(255,255,255,0.72)",
            backdropFilter:  "blur(12px)",
            borderBottom:    `1px solid ${C.platinum}66`,
          }}>
            <HpBar hp={playerHp} maxHp={maxHp} color={playerColor} label={playerName}/>
            <div style={{ textAlign:"center" }}>
              <div style={{
                fontFamily: "-apple-system,'SF Pro Display',sans-serif",
                fontSize: "9px", color:C.midGray, letterSpacing:"2px", marginBottom:"4px",
              }}>RND {round}/{maxRounds}</div>
              <RoundDots total={maxRounds} playerScore={playerScore} oppScore={oppScore}/>
            </div>
            <HpBar hp={oppHp} maxHp={maxHp} color={opponentColor} label={opponentName} flip/>
          </div>

          {/* Arena canvas */}
          <div style={{
            flex:     1,
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Ground marble strip */}
            <div style={{
              position:   "absolute",
              bottom:     0,
              left:       0,
              right:      0,
              height:     "30%",
              background: `linear-gradient(${C.marble}, ${C.marbleDark})`,
              borderTop:  `2px solid ${C.gold}44`,
            }}/>

            {/* Player character */}
            <div style={{
              position:  "absolute",
              bottom:    "26%",
              left:      "10%",
              animation: phase === "emerge" ? "g2dSlideL 0.45s cubic-bezier(0.34,1.56,0.64,1)" : "none",
            }}>
              <Character2D
                isPlayer color={playerColor} side="left"
                action={playerAction} hp={playerHp} maxHp={maxHp}
              />
            </div>

            {/* Opponent character */}
            <div style={{
              position:  "absolute",
              bottom:    "26%",
              right:     "10%",
              animation: phase === "emerge" ? "g2dSlideR 0.45s cubic-bezier(0.34,1.56,0.64,1)" : "none",
            }}>
              <Character2D
                isPlayer={false} color={opponentColor} side="right"
                action={oppAction} hp={oppHp} maxHp={maxHp}
              />
            </div>

            {/* Targeting reticle */}
            <Reticle
              x={reticlePos.x} y={reticlePos.y}
              active={reticleActive} color={playerColor}
              spinning={phase === "aim"}
            />

            {/* Projectile */}
            {phase === "fire" && projProgress >= 0 && projProgress <= 1 && (
              <ProjectileArc
                fromX={projFromX} fromY={projFromY}
                toX={projToX}    toY={projToY}
                color={projFromPlayer ? playerColor : opponentColor}
                progress={projProgress}
              />
            )}

            {/* Impact burst */}
            <ImpactBurst
              x={impactX} y={impactY}
              color={projFromPlayer ? opponentColor : playerColor}
              visible={showImpact}
            />

            {/* Demo wallet */}
            {gameMode === "demo" && phase !== "countdown" && (
              <DemoWalletBadge balance={demoBalance} betAmount={betAmount} lastDelta={lastDelta}/>
            )}

            {/* Round result message */}
            {phase === "result" && roundMsg && (
              <div style={{
                position:        "absolute",
                top:             "38%",
                left:            "50%",
                transform:       "translate(-50%,-50%)",
                background:      "rgba(255,255,255,0.90)",
                border:          `1px solid ${C.gold}55`,
                borderRadius:    "12px",
                padding:         "10px 22px",
                backdropFilter:  "blur(12px)",
                fontFamily:      "-apple-system,'SF Pro Display',sans-serif",
                fontSize:        "clamp(11px,3vw,14px)",
                fontWeight:      700,
                color:           C.charcoal,
                letterSpacing:   "1.5px",
                textAlign:       "center",
                whiteSpace:      "nowrap",
                boxShadow:       `0 4px 16px rgba(0,0,0,0.08)`,
                animation:       "g2dBounce 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                zIndex:          20,
              }}>{roundMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      <CountdownOverlay
        value={countdown === 0 ? "GO!" : countdown}
        show={phase === "countdown" && countdown >= 0}
      />

      {/* Confetti */}
      <ConfettiBurst active={showConfetti}/>

      {/* Match result */}
      {matchOver && (
        <MatchResultPanel
          playerWon={playerWonMatch}
          playerScore={playerScore}
          oppScore={oppScore}
          stakeAmount={betAmount}
          eloDelta={eloDelta}
          gameMode={gameMode}
          demoBalance={demoBalance}
          onRematch={() => {
            setMatchOver(false);
            setShowConfetti(false);
            setPlayerScore(0);
            setOppScore(0);
            setRound(1);
            setDemoBalance(initBalance);
            setPhase("pick");
          }}
          onHome={() => onHome?.()}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  EXTENDED 2D GAME UTILITIES
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  Match history tracker
// ─────────────────────────────────────────────────────────────

export interface MatchRecord {
  id:           string;
  date:         number;
  playerWon:    boolean;
  playerScore:  number;
  opponentScore:number;
  difficulty:   Difficulty;
  stakeAmount:  number;
  eloDelta:     number;
  demoMode:     boolean;
}

export class MatchHistory {
  private records: MatchRecord[] = [];

  add(record: MatchRecord): void {
    this.records.unshift(record);
    if (this.records.length > 50) this.records.pop(); // keep last 50
  }

  getAll():    MatchRecord[] { return this.records; }
  getLast():   MatchRecord | undefined { return this.records[0]; }
  winRate():   number {
    if (!this.records.length) return 0;
    return Math.round(100 * this.records.filter(r => r.playerWon).length / this.records.length);
  }
  totalElo():  number { return this.records.reduce((s, r) => s + r.eloDelta, 0); }
  totalProfit():number {
    return this.records
      .filter(r => r.demoMode)
      .reduce((s, r) => s + (r.playerWon ? r.stakeAmount * PAYOUT_MULT[r.difficulty] : -r.stakeAmount), 0);
  }
  export(): string { return JSON.stringify(this.records); }
}

// ─────────────────────────────────────────────────────────────
//  TileBackground  — animated marble tile grid
//  (canvas-based, used in menu screens)
// ─────────────────────────────────────────────────────────────

export function TileBackground({ animate = true }: { animate?: boolean }) {
  const canRef   = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number>(0);
  const offsetRef= useRef(0);

  useEffect(() => {
    const canvas = canRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const TILE = 48;

    const draw = (time: number) => {
      if (animate) offsetRef.current = (time / 12000) * TILE;
      ctx.clearRect(0, 0, W, H);

      for (let row = -1; row < Math.ceil(H / TILE) + 1; row++) {
        for (let col = -1; col < Math.ceil(W / TILE) + 1; col++) {
          const x = col * TILE + (offsetRef.current % TILE);
          const y = row * TILE;
          const light = (row + col) % 2 === 0;

          ctx.fillStyle = light ? "rgba(245,242,238,0.55)" : "rgba(235,230,225,0.45)";
          ctx.fillRect(x, y, TILE - 1, TILE - 1);

          // Gold corner dot
          ctx.fillStyle = "rgba(201,168,76,0.18)";
          ctx.beginPath();
          ctx.arc(x + TILE - 1, y + TILE - 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Center circle
      const cx = W / 2, cy = H / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      grad.addColorStop(0,   "rgba(201,168,76,0.08)");
      grad.addColorStop(0.5, "rgba(201,168,76,0.04)");
      grad.addColorStop(1,   "rgba(201,168,76,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (animate) rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  return (
    <canvas
      ref={canRef}
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
//  2D Bot helpers  — provides bot move/target selection
// ─────────────────────────────────────────────────────────────

export function getBotPosition(difficulty: Difficulty, round: number): number {
  // Returns 0,1,2 (position index)
  if (difficulty === "easy") return Math.floor(Math.random() * 3);
  if (difficulty === "hard") {
    // Hard bot learns from round number
    return (round % 3 + Math.floor(Math.random() * 2)) % 3;
  }
  // Normal: slight bias toward center
  return Math.random() < 0.45 ? 1 : Math.floor(Math.random() * 3);
}

export function getBotTarget(difficulty: Difficulty, playerLastPos: number): number {
  if (difficulty === "hard") {
    // Hard bot tries to predict player
    return playerLastPos;
  }
  if (difficulty === "easy") return Math.floor(Math.random() * 3);
  // Normal: 40% guess player, 60% random
  return Math.random() < 0.4 ? playerLastPos : Math.floor(Math.random() * 3);
}

// ─────────────────────────────────────────────────────────────
//  Network stubs  (2D game - Manus platform integration)
// ─────────────────────────────────────────────────────────────

export interface Move2D {
  position: number;  // 0,1,2 — which tire stack to hide behind
  target:   number;  // 0,1,2 — which position to shoot at
  playerId: string;
  roundId:  string;
  timestamp: number;
}

export interface RoundResult2D {
  winner:      "player" | "opponent" | "draw";
  playerPos:   number;
  playerTarget:number;
  opponentPos: number;
  opponentTarget:number;
  message:     string;
}

/**
 * submitMove2D  — send 2D duel move to backend.
 * Backend holds both moves, resolves, and returns result.
 */
export async function submitMove2D(move: Move2D): Promise<void> {
  // await fetch('/api/game/2d/move', { method:'POST', body:JSON.stringify(move) });
  console.debug("[KOBK 2D] submitMove", move.position, move.target);
}

/**
 * getGameResult2D  — poll backend for round resolution.
 * Returns when both players have submitted.
 */
export async function getGameResult2D(roundId: string): Promise<RoundResult2D> {
  // const res = await fetch(`/api/game/2d/result/${roundId}`);
  // return res.json();
  console.debug("[KOBK 2D] getGameResult", roundId);
  // Stub: simulate result locally
  const positions = [0, 1, 2];
  const pPos      = positions[Math.floor(Math.random() * 3)];
  const pTgt      = positions[Math.floor(Math.random() * 3)];
  const oPos      = positions[Math.floor(Math.random() * 3)];
  const oTgt      = positions[Math.floor(Math.random() * 3)];
  const pHit      = pTgt === oPos;
  const oHit      = oTgt === pPos;
  const winner: RoundResult2D["winner"] =
    pHit && !oHit ? "player" : !pHit && oHit ? "opponent" : "draw";
  return {
    winner,
    playerPos: pPos, playerTarget: pTgt,
    opponentPos: oPos, opponentTarget: oTgt,
    message: winner === "player" ? "Direct hit!" : winner === "opponent" ? "You were hit!" : "Both miss!",
  };
}

// ─────────────────────────────────────────────────────────────
//  Sound effect stubs for 2D game
// ─────────────────────────────────────────────────────────────

export const Game2DSounds = {
  playShoot:    () => console.debug("[KOBK SFX 2D] shoot"),
  playHit:      () => console.debug("[KOBK SFX 2D] hit"),
  playMiss:     () => console.debug("[KOBK SFX 2D] miss"),
  playCountdown:(n: number) => console.debug("[KOBK SFX 2D] countdown", n),
  playWin:      () => console.debug("[KOBK SFX 2D] win"),
  playLose:     () => console.debug("[KOBK SFX 2D] lose"),
  playDraw:     () => console.debug("[KOBK SFX 2D] draw"),
  playCoinIn:   () => console.debug("[KOBK SFX 2D] coinIn"),
  playCoinOut:  () => console.debug("[KOBK SFX 2D] coinOut"),
};
