/**
 * ============================================================
 *  Joystick.tsx  —  Kill or Be Killed  ·  Luxury Edition
 * ============================================================
 *  Aesthetic: iPhone Pro White — frosted glass disc,
 *  platinum ring, champagne-gold direction indicators,
 *  crystalline knob with soft inner glow.
 *
 *  Features:
 *   • Multi-touch with per-identifier tracking
 *   • Configurable deadzone (default 0.12)
 *   • Optional haptic feedback (Vibration API)
 *   • Direction indicator ring (8 segments, gold active)
 *   • Keyboard WASD / Arrow fallback (desktop)
 *   • Floating mode: base drifts to first-touch point
 *   • Idle "breathe" pulse animation
 *   • Active glow ring on team color
 *   • Directional label (N/NE/E…) readout
 *   • Force magnitude readout (0–100%)
 *   • Configurable radius, knob size, side placement
 *   • Smooth return to center (CSS spring transition)
 *   • Full TypeScript props interface
 * ============================================================
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────
//  Luxury palette (matches game-wide theme)
// ─────────────────────────────────────────────────────────────

const C = {
  pearl:        "#F5F5F7",
  white:        "#FFFFFF",
  warmWhite:    "#FAFAF8",
  platinum:     "#E8E8ED",
  steel:        "#C8C8CE",
  chrome:       "#D4D4D8",
  darkSteel:    "#8E8E93",
  gold:         "#C9A84C",
  lightGold:    "#E8C96A",
  darkGold:     "#8B6914",
  charcoal:     "#1D1D1F",
  midGray:      "#6E6E73",
  lightGray:    "#AEAEB2",
  // Apple accent
  playerBlue:   "#007AFF",
  oppRed:       "#FF3B30",
  // Glass tints
  frostWhite:   "rgba(250,250,248,0.72)",
  frostDark:    "rgba(29,29,31,0.55)",
  platinumGlass:"rgba(232,232,237,0.45)",
} as const;

// ─────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────

export interface JoystickProps {
  onMove:        (dx: number, dy: number) => void;
  side:          "left" | "right";
  label?:        string;
  color?:        string;
  radius?:       number;
  knobSize?:     number;
  deadzone?:     number;
  floating?:     boolean;
  haptics?:      boolean;
  showRing?:     boolean;
  showLabel?:    boolean;
  showForce?:    boolean;
  showDirection?: boolean;
  enableKeyboard?: boolean;
  disabled?:     boolean;
}

// ─────────────────────────────────────────────────────────────
//  Direction labels (8-way)
// ─────────────────────────────────────────────────────────────

const DIR_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function getDirectionLabel(dx: number, dy: number): string {
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag < 0.15) return "";
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 180; // 0-360
  const sector = Math.round(angle / 45) % 8;
  // Map to compass: atan2(dy,dx) = 0 is East; we want 0 to be North
  const compassMap = [3, 4, 5, 6, 7, 0, 1, 2]; // remap East→S, adjust
  return DIR_LABELS[compassMap[sector]] ?? "";
}

// ─────────────────────────────────────────────────────────────
//  Direction ring segment
// ─────────────────────────────────────────────────────────────

interface RingSegmentProps {
  index:     number;   // 0-7 (N=0 clockwise)
  active:    boolean;
  color:     string;
  ringSize:  number;
}

function RingSegment({ index, active, color, ringSize }: RingSegmentProps) {
  const angle = index * 45;           // degrees
  const rad   = ((angle - 90) * Math.PI) / 180;
  const r     = ringSize / 2 - 10;   // px from center
  const cx    = r * Math.cos(rad);
  const cy    = r * Math.sin(rad);
  const size  = 7;

  const style: CSSProperties = {
    position:         "absolute",
    top:              "50%",
    left:             "50%",
    width:            size,
    height:           size,
    transform:        `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`,
    borderRadius:     "50%",
    background:       active ? color : C.platinumGlass,
    boxShadow:        active ? `0 0 8px ${color}, 0 0 14px ${color}66` : "none",
    transition:       "background 0.1s ease, box-shadow 0.1s ease",
    border:           `1px solid ${active ? color : C.steel}`,
    pointerEvents:    "none",
  };

  return <div style={style} />;
}

// ─────────────────────────────────────────────────────────────
//  Frosted-glass base disc
// ─────────────────────────────────────────────────────────────

function JoystickBase({
  size, color, active, breathe, children,
}: {
  size:     number;
  color:    string;
  active:   boolean;
  breathe:  number;   // 0-1 idle pulse
  children: ReactNode;
}) {
  const pulse = breathe * 0.06;

  const style: CSSProperties = {
    position:        "relative",
    width:           size,
    height:          size,
    borderRadius:    "50%",
    // Frosted glass layering
    background:      active
      ? `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.88), rgba(240,240,244,0.65))`
      : `radial-gradient(circle at 38% 35%, rgba(255,255,255,${0.72 + pulse}), rgba(240,240,244,${0.52 + pulse}))`,
    backdropFilter:  "blur(18px) saturate(1.4)",
    WebkitBackdropFilter: "blur(18px) saturate(1.4)",
    border:          `1.5px solid ${active ? color + "88" : "rgba(232,232,237,0.75)"}`,
    boxShadow: active
      ? [
          `0 0 0 1px ${color}44`,
          `0 0 28px ${color}28`,
          `inset 0 1px 0 rgba(255,255,255,0.85)`,
          `0 8px 24px rgba(0,0,0,0.12)`,
        ].join(", ")
      : [
          `inset 0 1px 0 rgba(255,255,255,0.90)`,
          `0 6px 20px rgba(0,0,0,0.08)`,
          `0 1px 3px rgba(0,0,0,0.06)`,
        ].join(", "),
    transition:     "border 0.15s ease, box-shadow 0.15s ease, background 0.12s ease",
    overflow:       "hidden",
    cursor:         "grab",
    userSelect:     "none",
    touchAction:    "none",
  };

  // Platinum specular highlight arc (top-left)
  const highlightStyle: CSSProperties = {
    position:      "absolute",
    top:           "8%",
    left:          "12%",
    width:         "42%",
    height:        "28%",
    borderRadius:  "50%",
    background:    "radial-gradient(ellipse, rgba(255,255,255,0.70), transparent)",
    pointerEvents: "none",
  };

  return (
    <div style={style}>
      <div style={highlightStyle} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Frosted-glass knob
// ─────────────────────────────────────────────────────────────

function JoystickKnob({
  size, color, active, offsetX, offsetY,
}: {
  size:     number;
  color:    string;
  active:   boolean;
  offsetX:  number;
  offsetY:  number;
}) {
  const style: CSSProperties = {
    position:        "absolute",
    top:             "50%",
    left:            "50%",
    width:           size,
    height:          size,
    borderRadius:    "50%",
    transform:       `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
    background:      active
      ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), ${color}55 60%, ${color}99)`
      : `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(200,200,210,0.72) 60%, rgba(180,180,195,0.88))`,
    border:          `1.5px solid ${active ? color : "rgba(200,200,210,0.80)"}`,
    boxShadow: active
      ? [
          `0 0 0 2px ${color}55`,
          `0 0 18px ${color}44`,
          `inset 0 1px 0 rgba(255,255,255,0.9)`,
          `0 4px 12px rgba(0,0,0,0.18)`,
        ].join(", ")
      : [
          `inset 0 1px 0 rgba(255,255,255,0.9)`,
          `0 3px 10px rgba(0,0,0,0.14)`,
          `0 1px 3px rgba(0,0,0,0.10)`,
        ].join(", "),
    transition:      active ? "transform 0.04s, border 0.12s, box-shadow 0.12s" : "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), border 0.12s, box-shadow 0.12s",
    pointerEvents:   "none",
    zIndex:          2,
  };

  // Inner gold centre dot
  const dotStyle: CSSProperties = {
    position:     "absolute",
    top:          "50%",
    left:         "50%",
    transform:    "translate(-50%, -50%)",
    width:        active ? 8 : 6,
    height:       active ? 8 : 6,
    borderRadius: "50%",
    background:   active
      ? `radial-gradient(circle, ${C.lightGold}, ${C.darkGold})`
      : `radial-gradient(circle, ${C.chrome}, ${C.darkSteel})`,
    boxShadow:    active ? `0 0 8px ${C.gold}88` : "none",
    transition:   "all 0.12s ease",
  };

  // Specular glint
  const glintStyle: CSSProperties = {
    position:      "absolute",
    top:           "15%",
    left:          "18%",
    width:         "32%",
    height:        "22%",
    borderRadius:  "50%",
    background:    "radial-gradient(ellipse, rgba(255,255,255,0.85), transparent)",
    pointerEvents: "none",
  };

  return (
    <div style={style}>
      <div style={glintStyle} />
      <div style={dotStyle} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Platinum outer ring
// ─────────────────────────────────────────────────────────────

function PlatinumRing({ size, color, active }: { size: number; color: string; active: boolean }) {
  const style: CSSProperties = {
    position:      "absolute",
    top:           "50%",
    left:          "50%",
    transform:     "translate(-50%, -50%)",
    width:         size + 14,
    height:        size + 14,
    borderRadius:  "50%",
    border:        `1.5px solid ${active ? color + "66" : "rgba(200,200,210,0.55)"}`,
    boxShadow:     active
      ? `0 0 16px ${color}22, inset 0 0 6px ${color}11`
      : `0 0 8px rgba(0,0,0,0.06)`,
    pointerEvents: "none",
    transition:    "border 0.18s, box-shadow 0.18s",
    background:    "transparent",
  };

  // Gold tick marks at cardinal points
  const ticks = [0, 90, 180, 270].map(deg => {
    const r = (deg * Math.PI) / 180;
    const offset = (size + 14) / 2 + 2;
    const tx = Math.sin(r) * offset;
    const ty = -Math.cos(r) * offset;
    return (
      <div key={deg} style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        width:        3,
        height:       6,
        background:   active ? C.gold : C.steel,
        borderRadius: 1,
        transform:    `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${deg}deg)`,
        transition:   "background 0.18s",
      }} />
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={style}>{ticks}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Force magnitude bar
// ─────────────────────────────────────────────────────────────

function ForceBar({ force, color }: { force: number; color: string }) {
  const pct = Math.round(force * 100);
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           "5px",
      pointerEvents: "none",
    }}>
      <div style={{
        width:        60,
        height:       4,
        background:   "rgba(200,200,210,0.35)",
        borderRadius: 2,
        overflow:     "hidden",
        border:       "1px solid rgba(200,200,210,0.45)",
      }}>
        <div style={{
          width:        `${pct}%`,
          height:       "100%",
          background:   pct > 75
            ? `linear-gradient(90deg, ${color}, ${C.lightGold})`
            : `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2,
          transition:   "width 0.05s",
          boxShadow:    pct > 20 ? `0 0 6px ${color}66` : "none",
        }} />
      </div>
      <span style={{
        fontFamily:    "-apple-system, 'SF Pro Display', sans-serif",
        fontSize:      "9px",
        color:         pct > 10 ? color : C.lightGray,
        fontWeight:    600,
        letterSpacing: "0.5px",
        width:         "24px",
        textAlign:     "right",
        transition:    "color 0.12s",
      }}>
        {pct}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Direction readout badge
// ─────────────────────────────────────────────────────────────

function DirectionBadge({ label, color }: { label: string; color: string }) {
  if (!label) {
    return (
      <div style={{
        height:        "18px",
        width:         "36px",
        opacity:       0,
        pointerEvents: "none",
      }} />
    );
  }

  return (
    <div style={{
      background:    `${color}18`,
      border:        `1px solid ${color}55`,
      borderRadius:  "5px",
      padding:       "2px 7px",
      fontFamily:    "-apple-system, 'SF Pro Display', sans-serif",
      fontSize:      "9px",
      fontWeight:    700,
      color,
      letterSpacing: "1.5px",
      textAlign:     "center",
      boxShadow:     `0 0 8px ${color}22`,
      animation:     "luxJoystickFadeIn 0.12s ease",
      pointerEvents: "none",
    }}>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CSS injection (once)
// ─────────────────────────────────────────────────────────────

let cssInjected = false;
function injectStyles() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes luxJoystickFadeIn {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes luxJoystickBreathe {
      0%, 100% { opacity: 0.78; }
      50%       { opacity: 1.00; }
    }
    @keyframes luxJoystickPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1);   }
      50%       { transform: translate(-50%, -50%) scale(1.04); }
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
//  Keyboard → virtual joystick mapper
// ─────────────────────────────────────────────────────────────

function useKeyboardJoystick(
  onMove:  (dx: number, dy: number) => void,
  enabled: boolean,
  side:    "left" | "right"
) {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!enabled) return;

    const onDown = (e: KeyboardEvent) => {
      // Only left joystick uses keyboard (WASD/Arrows)
      if (side !== "left") return;
      keys.current[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (side !== "left") return;
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);

    // Tick at 60fps
    let rafId: number;
    const tick = () => {
      const k = keys.current;
      let dx = 0;
      let dy = 0;
      if (k["KeyA"] || k["ArrowLeft"])  dx -= 1;
      if (k["KeyD"] || k["ArrowRight"]) dx += 1;
      if (k["KeyW"] || k["ArrowUp"])    dy -= 1;
      if (k["KeyS"] || k["ArrowDown"])  dy += 1;

      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
      }

      onMove(dx, dy);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
      cancelAnimationFrame(rafId);
    };
  }, [onMove, enabled, side]);
}

// ─────────────────────────────────────────────────────────────
//  Haptic feedback
// ─────────────────────────────────────────────────────────────

function triggerHaptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch (_) { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────
//  Main Joystick component
// ─────────────────────────────────────────────────────────────

export default function Joystick({
  onMove,
  side,
  label,
  color          = C.playerBlue,
  radius         = 52,
  knobSize       = 46,
  deadzone       = 0.12,
  floating       = false,
  haptics        = true,
  showRing       = true,
  showLabel      = true,
  showForce      = true,
  showDirection  = true,
  enableKeyboard = true,
  disabled       = false,
}: JoystickProps) {

  // ── CSS injection ──────────────────────────────────────────
  useEffect(injectStyles, []);

  // ── State ──────────────────────────────────────────────────
  const [offsetX,   setOffsetX]   = useState(0);
  const [offsetY,   setOffsetY]   = useState(0);
  const [isActive,  setIsActive]  = useState(false);
  const [force,     setForce]     = useState(0);
  const [dirLabel,  setDirLabel]  = useState("");
  const [breathe,   setBreathe]   = useState(0);
  // Floating mode: base position in viewport
  const [baseLeft,  setBaseLeft]  = useState<number | undefined>(undefined);
  const [baseBottom,setBaseBottom]= useState<number | undefined>(undefined);

  // ── Refs ───────────────────────────────────────────────────
  const containerRef    = useRef<HTMLDivElement>(null);
  const activeTouch     = useRef<number | null>(null);
  const baseCenterRef   = useRef({ x: 0, y: 0 });
  const isDragging      = useRef(false);
  const breatheRef      = useRef(0);
  const breatheRafRef   = useRef<number>(0);
  const outputRef       = useRef({ dx: 0, dy: 0 });
  const initialTouchPosRef = useRef({ x: 0, y: 0 });

  // ── Breathe animation (idle) ──────────────────────────────
  useEffect(() => {
    let t = 0;
    const tick = () => {
      t += 0.016;
      const val = (1 + Math.sin(t * 1.6)) / 2;
      if (!isActive) {
        breatheRef.current = val;
        setBreathe(val);
      }
      breatheRafRef.current = requestAnimationFrame(tick);
    };
    breatheRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(breatheRafRef.current);
  }, [isActive]);

  // ── Core move logic ────────────────────────────────────────
  const processMove = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    const { x: cx, y: cy } = baseCenterRef.current;
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist  = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const clamp = Math.min(dist, radius);
    const angle = Math.atan2(rawDy, rawDx);
    const kx    = Math.cos(angle) * clamp;
    const ky    = Math.sin(angle) * clamp;

    setOffsetX(kx);
    setOffsetY(ky);

    const ndx = kx / radius;
    const ndy = ky / radius;
    const mag = Math.sqrt(ndx * ndx + ndy * ndy);

    // Apply deadzone
    const effectiveMag = mag < deadzone ? 0 : (mag - deadzone) / (1 - deadzone);
    const edx = effectiveMag > 0 ? (ndx / mag) * effectiveMag : 0;
    const edy = effectiveMag > 0 ? (ndy / mag) * effectiveMag : 0;

    outputRef.current = { dx: edx, dy: edy };
    onMove(edx, edy);
    setForce(effectiveMag);
    setDirLabel(getDirectionLabel(ndx, ndy));
  }, [disabled, radius, deadzone, onMove]);

  const resetKnob = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
    setForce(0);
    setDirLabel("");
    setIsActive(false);
    outputRef.current = { dx: 0, dy: 0 };
    onMove(0, 0);
    if (haptics) triggerHaptic(8);
  }, [onMove, haptics]);

  const captureCenter = useCallback((el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    baseCenterRef.current = {
      x: rect.left + rect.width  / 2,
      y: rect.top  + rect.height / 2,
    };
  }, []);

  // ── Touch events ──────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (activeTouch.current !== null || disabled) return;
      const touch = e.changedTouches[0];
      activeTouch.current = touch.identifier;

      if (floating) {
        // Drift base to touch point
        const viewportH  = window.innerHeight;
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect) {
          const newLeft   = touch.clientX - parentRect.left - radius;
          const newBottom = parentRect.bottom - touch.clientY - radius;
          setBaseLeft(newLeft);
          setBaseBottom(newBottom);
        }
        baseCenterRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        captureCenter(el);
      }

      setIsActive(true);
      if (haptics) triggerHaptic(12);
      processMove(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === activeTouch.current) {
          processMove(t.clientX, t.clientY);
          e.preventDefault();
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          activeTouch.current = null;
          resetKnob();
          if (floating) {
            setBaseLeft(undefined);
            setBaseBottom(undefined);
          }
          break;
        }
      }
    };

    el.addEventListener("touchstart",  onTouchStart, { passive: false });
    window.addEventListener("touchmove",   onTouchMove, { passive: false });
    window.addEventListener("touchend",    onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      window.removeEventListener("touchmove",   onTouchMove);
      window.removeEventListener("touchend",    onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, floating, haptics, processMove, resetKnob, captureCenter, radius]);

  // ── Mouse events (desktop) ─────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    isDragging.current = true;
    captureCenter(containerRef.current!);
    setIsActive(true);
    if (haptics) triggerHaptic(10);
    processMove(e.clientX, e.clientY);
  }, [disabled, haptics, processMove, captureCenter]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) processMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (isDragging.current) { isDragging.current = false; resetKnob(); }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [processMove, resetKnob]);

  // ── Keyboard ──────────────────────────────────────────────
  useKeyboardJoystick(onMove, enableKeyboard, side);

  // ── Compute active direction segment ─────────────────────
  const activeSegment = (() => {
    if (!isActive || force < 0.18) return -1;
    const angle = (Math.atan2(offsetY, offsetX) * 180) / Math.PI + 180;
    return Math.round(angle / 45) % 8;
  })();

  // ── Layout ────────────────────────────────────────────────
  const totalSize = radius * 2;
  const pos: CSSProperties = side === "left"
    ? { left:  baseLeft  !== undefined ? baseLeft  : 24 }
    : { right: baseLeft  !== undefined ? baseLeft  : 24 };
  const bot: CSSProperties = { bottom: baseBottom !== undefined ? baseBottom : 24 };

  const containerStyle: CSSProperties = {
    position:   "absolute",
    ...pos,
    ...bot,
    zIndex:     30,
    display:    "flex",
    flexDirection: "column",
    alignItems: "center",
    gap:        "7px",
    pointerEvents: disabled ? "none" : "auto",
    opacity:    disabled ? 0.45 : 1,
    transition: "opacity 0.22s, bottom 0.18s, left 0.08s, right 0.08s",
  };

  const labelStyle: CSSProperties = {
    fontFamily:    "-apple-system, 'SF Pro Display', sans-serif",
    fontSize:      "9px",
    fontWeight:    600,
    color:         isActive ? color : C.midGray,
    letterSpacing: "2px",
    textTransform: "uppercase",
    transition:    "color 0.18s",
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>

      {/* Direction + force readouts (above joystick) */}
      {(showDirection || showForce) && (
        <div style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "4px",
          minHeight:     "36px",
          justifyContent:"flex-end",
        }}>
          {showDirection && <DirectionBadge label={dirLabel} color={color} />}
          {showForce     && <ForceBar force={force} color={color} />}
        </div>
      )}

      {/* The joystick itself */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{ position: "relative", width: totalSize, height: totalSize }}
      >
        {/* Outer platinum ring */}
        {showRing && <PlatinumRing size={totalSize} color={color} active={isActive} />}

        {/* Direction ring dots (8-way) */}
        {showRing && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <RingSegment key={i} index={i} active={activeSegment === i}
                color={color} ringSize={totalSize} />
            ))}
          </div>
        )}

        {/* Frosted glass base */}
        <JoystickBase size={totalSize} color={color} active={isActive} breathe={breathe}>
          {/* Knob */}
          <JoystickKnob
            size={knobSize} color={color} active={isActive}
            offsetX={offsetX} offsetY={offsetY}
          />

          {/* Inner concentric arc decorations */}
          <div style={{
            position:      "absolute",
            top:           "50%",
            left:          "50%",
            transform:     "translate(-50%, -50%)",
            width:         totalSize * 0.65,
            height:        totalSize * 0.65,
            borderRadius:  "50%",
            border:        `1px solid ${isActive ? color + "22" : "rgba(200,200,210,0.30)"}`,
            pointerEvents: "none",
            transition:    "border 0.15s",
          }} />
          <div style={{
            position:      "absolute",
            top:           "50%",
            left:          "50%",
            transform:     "translate(-50%, -50%)",
            width:         totalSize * 0.88,
            height:        totalSize * 0.88,
            borderRadius:  "50%",
            border:        `1px solid ${isActive ? color + "14" : "rgba(200,200,210,0.18)"}`,
            pointerEvents: "none",
            transition:    "border 0.15s",
          }} />
        </JoystickBase>
      </div>

      {/* Label below */}
      {showLabel && label && (
        <div style={labelStyle}>{label}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Dual-joystick layout helper
// ─────────────────────────────────────────────────────────────

export interface DualJoystickProps {
  onMoveLeft:  (dx: number, dy: number) => void;
  onMoveRight: (dx: number, dy: number) => void;
  leftColor?:  string;
  rightColor?: string;
  leftLabel?:  string;
  rightLabel?: string;
  disabled?:   boolean;
}

export function DualJoystick({
  onMoveLeft, onMoveRight,
  leftColor  = C.playerBlue,
  rightColor = C.gold,
  leftLabel  = "MOVE",
  rightLabel = "AIM",
  disabled   = false,
}: DualJoystickProps) {
  return (
    <>
      <Joystick
        onMove={onMoveLeft}
        side="left"
        label={leftLabel}
        color={leftColor}
        radius={52}
        knobSize={46}
        deadzone={0.12}
        haptics
        showRing
        showLabel
        showForce={false}
        showDirection
        enableKeyboard
        disabled={disabled}
      />
      <Joystick
        onMove={onMoveRight}
        side="right"
        label={rightLabel}
        color={rightColor}
        radius={52}
        knobSize={46}
        deadzone={0.12}
        haptics
        showRing
        showLabel
        showForce={false}
        showDirection
        enableKeyboard={false}
        disabled={disabled}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shoot button  (luxury gold/pearl)
// ─────────────────────────────────────────────────────────────

export interface ShootButtonProps {
  onShoot:    () => void;
  disabled?:  boolean;
  color?:     string;
  size?:      number;
  label?:     string;
}

export function ShootButton({
  onShoot,
  disabled = false,
  color    = C.playerBlue,
  size     = 76,
  label    = "🔥",
}: ShootButtonProps) {
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    onShoot();
    triggerHaptic(14);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPressed(false), 140);
  }, [disabled, onShoot]);

  const containerStyle: CSSProperties = {
    position:        "absolute",
    bottom:          24,
    right:           154,
    width:           size,
    height:          size,
    borderRadius:    "50%",
    background:      disabled
      ? "rgba(240,238,232,0.55)"
      : pressed
        ? `radial-gradient(circle at 40% 38%, rgba(255,255,255,0.9), ${color}88 55%, ${color}cc)`
        : `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.95), ${color}55 55%, ${color}99)`,
    border:          disabled
      ? "1.5px solid rgba(200,200,210,0.45)"
      : `1.5px solid ${pressed ? color : color + "88"}`,
    boxShadow: disabled
      ? "none"
      : pressed
        ? `0 0 32px ${color}55, 0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)`
        : `0 0 22px ${color}33, 0 5px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 3px ${color}18`,
    backdropFilter:  "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    cursor:          disabled ? "not-allowed" : "pointer",
    userSelect:      "none",
    touchAction:     "none",
    zIndex:          30,
    transform:       pressed ? "scale(0.93)" : "scale(1)",
    transition:      "transform 0.08s, box-shadow 0.1s, background 0.08s",
    opacity:         disabled ? 0.45 : 1,
  };

  const glintStyle: CSSProperties = {
    position:      "absolute",
    top:           "12%",
    left:          "16%",
    width:         "38%",
    height:        "26%",
    borderRadius:  "50%",
    background:    "radial-gradient(ellipse, rgba(255,255,255,0.80), transparent)",
    pointerEvents: "none",
  };

  const labelStyle: CSSProperties = {
    fontSize:      pressed ? "22px" : "24px",
    filter:        disabled ? "grayscale(1)" : "none",
    transition:    "font-size 0.08s",
    zIndex:        1,
  };

  return (
    <div
      style={containerStyle}
      onPointerDown={e => { e.preventDefault(); handlePress(); }}
    >
      <div style={glintStyle} />
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Crouch button  (pearl, smaller)
// ─────────────────────────────────────────────────────────────

export interface CrouchButtonProps {
  onToggle:   (active: boolean) => void;
  disabled?:  boolean;
  color?:     string;
}

export function CrouchButton({
  onToggle,
  disabled = false,
  color    = C.playerBlue,
}: CrouchButtonProps) {
  const [active, setActive] = useState(false);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !active;
    setActive(next);
    onToggle(next);
    triggerHaptic(10);
  }, [active, disabled, onToggle]);

  const style: CSSProperties = {
    position:        "absolute",
    bottom:          108,
    right:           162,
    width:           48,
    height:          48,
    borderRadius:    "50%",
    background:      active
      ? `radial-gradient(circle, ${color}88, ${color}44)`
      : "rgba(245,245,247,0.72)",
    border:          `1.5px solid ${active ? color : "rgba(200,200,210,0.65)"}`,
    boxShadow:       active
      ? `0 0 18px ${color}44, inset 0 1px 0 rgba(255,255,255,0.8)`
      : `0 3px 10px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)`,
    backdropFilter:  "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    cursor:          disabled ? "not-allowed" : "pointer",
    userSelect:      "none",
    touchAction:     "none",
    zIndex:          30,
    transition:      "all 0.14s ease",
    opacity:         disabled ? 0.45 : 1,
    fontSize:        "18px",
  };

  return (
    <div style={style} onPointerDown={e => { e.preventDefault(); handleToggle(); }}>
      {active ? "🦆" : "🧎"}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Reload button
// ─────────────────────────────────────────────────────────────

export interface ReloadButtonProps {
  onReload:    () => void;
  disabled?:   boolean;
  reloading?:  boolean;
  color?:      string;
}

export function ReloadButton({
  onReload,
  disabled  = false,
  reloading = false,
  color     = C.gold,
}: ReloadButtonProps) {
  const [pressed, setPressed] = useState(false);

  const style: CSSProperties = {
    position:        "absolute",
    bottom:          112,
    left:            156,
    width:           48,
    height:          48,
    borderRadius:    "50%",
    background:      reloading
      ? `linear-gradient(135deg, ${color}44, ${color}22)`
      : pressed
        ? `radial-gradient(circle, ${color}66, ${color}22)`
        : "rgba(245,245,247,0.72)",
    border:          `1.5px solid ${reloading || pressed ? color : "rgba(200,200,210,0.65)"}`,
    boxShadow:       `0 3px 10px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.85)`,
    backdropFilter:  "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    cursor:          disabled || reloading ? "not-allowed" : "pointer",
    userSelect:      "none",
    touchAction:     "none",
    zIndex:          30,
    opacity:         disabled ? 0.45 : 1,
    fontSize:        "18px",
    animation:       reloading ? "luxJoystickPulse 0.7s ease-in-out infinite" : "none",
    transition:      "all 0.12s",
  };

  return (
    <div style={style} onPointerDown={e => {
      e.preventDefault();
      if (!disabled && !reloading) {
        setPressed(true);
        onReload();
        triggerHaptic(16);
        setTimeout(() => setPressed(false), 150);
      }
    }}>
      {reloading ? "⏳" : "🔄"}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  EXTENDED JOYSTICK COMPONENTS
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  AnalogTrigger  — vertical slider for zoom / power charge.
//  Renders as a frosted glass pill with gold fill.
// ─────────────────────────────────────────────────────────────

export interface AnalogTriggerProps {
  value:       number;   // 0–1
  onChange:    (v: number) => void;
  side?:       "left" | "right";
  label?:      string;
  color?:      string;
  height?:     number;
  disabled?:   boolean;
}

export function AnalogTrigger({
  value, onChange, side = "right", label = "ZOOM",
  color = C.gold, height = 110, disabled = false,
}: AnalogTriggerProps) {
  const trackRef    = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const [active, setActive] = useState(false);

  const computeValue = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel  = (rect.bottom - clientY) / rect.height;
    onChange(Math.max(0, Math.min(1, rel)));
  }, [onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const y = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      computeValue(y);
    };
    const onUp = () => { isDragging.current = false; setActive(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove as EventListener, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove as EventListener);
      window.removeEventListener("touchend", onUp);
    };
  }, [computeValue]);

  const triggerStyle: CSSProperties = {
    position:         "absolute",
    bottom:           28,
    [side === "left" ? "left" : "right"]: 148,
    width:            14,
    height:           height,
    borderRadius:     7,
    background:       "rgba(245,245,247,0.72)",
    backdropFilter:   "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border:           `1.5px solid ${active ? color + "88" : "rgba(200,200,210,0.65)"}`,
    boxShadow:        `inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.08)`,
    cursor:           disabled ? "not-allowed" : "pointer",
    touchAction:      "none",
    userSelect:       "none",
    overflow:         "hidden",
    zIndex:           29,
    opacity:          disabled ? 0.45 : 1,
    transition:       "border 0.15s, box-shadow 0.15s",
  };

  const fillStyle: CSSProperties = {
    position:     "absolute",
    bottom:       0,
    left:         0,
    right:        0,
    height:       `${value * 100}%`,
    background:   `linear-gradient(0deg, ${color}, ${color}88)`,
    borderRadius: "0 0 6px 6px",
    boxShadow:    `0 0 10px ${color}55`,
    transition:   "height 0.04s",
  };

  const notchStyle: CSSProperties = {
    position:     "absolute",
    left:         "18%",
    right:        "18%",
    bottom:       `${value * 100}%`,
    height:       3,
    background:   active ? C.white : C.chrome,
    borderRadius: 1.5,
    boxShadow:    active ? `0 0 6px ${color}` : "none",
    transition:   "bottom 0.04s, background 0.12s",
  };

  const labelBadge: CSSProperties = {
    position:       "absolute",
    bottom:         height + 8,
    [side]:         148,
    fontFamily:     "-apple-system,'SF Pro Display',sans-serif",
    fontSize:       "7px",
    fontWeight:     700,
    color:          active ? color : C.midGray,
    letterSpacing:  "1.5px",
    textAlign:      "center",
    width:          14,
    pointerEvents:  "none",
    transition:     "color 0.15s",
  };

  return (
    <>
      <div style={labelBadge}>{label}</div>
      <div
        ref={trackRef}
        style={triggerStyle}
        onMouseDown={e => {
          if (disabled) return;
          isDragging.current = true;
          setActive(true);
          computeValue(e.clientY);
        }}
        onTouchStart={e => {
          if (disabled) return;
          isDragging.current = true;
          setActive(true);
          computeValue(e.touches[0].clientY);
        }}
      >
        <div style={fillStyle} />
        <div style={notchStyle} />
        {/* Tick marks */}
        {[0.25, 0.5, 0.75].map(t => (
          <div key={t} style={{
            position:     "absolute",
            left:         "28%",
            right:        "28%",
            bottom:       `${t * 100}%`,
            height:       1,
            background:   "rgba(200,200,210,0.45)",
            borderRadius: 0.5,
          }} />
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  D-Pad  — 4-way button grid for menu navigation
// ─────────────────────────────────────────────────────────────

export interface DPadProps {
  onDirection: (dir: "up" | "down" | "left" | "right" | null) => void;
  color?:      string;
  disabled?:   boolean;
}

export function DPad({ onDirection, color = C.playerBlue, disabled = false }: DPadProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  const handlePress = (dir: "up" | "down" | "left" | "right") => {
    if (disabled) return;
    setPressed(dir);
    onDirection(dir);
    triggerHaptic(10);
  };

  const handleRelease = () => {
    setPressed(null);
    onDirection(null);
  };

  const baseBtn: CSSProperties = {
    width:           38,
    height:          38,
    borderRadius:    "6px",
    background:      "rgba(245,245,247,0.78)",
    backdropFilter:  "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border:          `1.5px solid rgba(200,200,210,0.65)`,
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    cursor:          disabled ? "not-allowed" : "pointer",
    userSelect:      "none",
    touchAction:     "none",
    transition:      "all 0.08s",
    fontSize:        "14px",
    opacity:         disabled ? 0.45 : 1,
  };

  const activeBtn = (dir: string): CSSProperties => ({
    ...baseBtn,
    background: pressed === dir ? `${color}22` : baseBtn.background as string,
    border:     pressed === dir ? `1.5px solid ${color}88` : baseBtn.border as string,
    transform:  pressed === dir ? "scale(0.91)" : "none",
    boxShadow:  pressed === dir ? `0 0 12px ${color}33` : "none",
  });

  const container: CSSProperties = {
    position:       "absolute",
    bottom:         32,
    left:           134,
    display:        "grid",
    gridTemplateRows:    "38px 38px 38px",
    gridTemplateColumns: "38px 38px 38px",
    gap:            "2px",
    zIndex:         28,
    pointerEvents:  disabled ? "none" : "auto",
  };

  return (
    <div style={container}>
      {/* Row 1: up */}
      <div />
      <div style={activeBtn("up")}
        onPointerDown={() => handlePress("up")} onPointerUp={handleRelease} onPointerLeave={handleRelease}>
        ▲
      </div>
      <div />
      {/* Row 2: left, center, right */}
      <div style={activeBtn("left")}
        onPointerDown={() => handlePress("left")} onPointerUp={handleRelease} onPointerLeave={handleRelease}>
        ◀
      </div>
      <div style={{
        ...baseBtn,
        borderRadius: "50%",
        background:   "rgba(201,168,76,0.18)",
        border:       `1px solid ${C.gold}55`,
      }}>
        <div style={{ width:5, height:5, borderRadius:"50%", background:C.gold, opacity:0.65 }}/>
      </div>
      <div style={activeBtn("right")}
        onPointerDown={() => handlePress("right")} onPointerUp={handleRelease} onPointerLeave={handleRelease}>
        ▶
      </div>
      {/* Row 3: down */}
      <div />
      <div style={activeBtn("down")}
        onPointerDown={() => handlePress("down")} onPointerUp={handleRelease} onPointerLeave={handleRelease}>
        ▼
      </div>
      <div />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  GamepadMap  — detects Gamepad API inputs and maps to
//  onMove / onShoot callbacks (desktop controller support)
// ─────────────────────────────────────────────────────────────

export interface GamepadMapProps {
  onMove:    (dx: number, dy: number) => void;
  onAim?:    (dx: number, dy: number) => void;
  onShoot?:  () => void;
  onCrouch?: (active: boolean) => void;
  onReload?: () => void;
  deadzone?: number;
}

export function useGamepadMap({
  onMove, onAim, onShoot, onCrouch, onReload, deadzone = 0.12,
}: GamepadMapProps) {
  const rafRef       = useRef<number>(0);
  const shootHeld    = useRef(false);
  const crouchActive = useRef(false);

  const applyDead = (v: number) =>
    Math.abs(v) < deadzone ? 0 : (v - Math.sign(v) * deadzone) / (1 - deadzone);

  useEffect(() => {
    const tick = () => {
      const gamepads = navigator.getGamepads?.() ?? [];
      const gp = Array.from(gamepads).find(Boolean);

      if (gp) {
        // Left stick → move
        const lx = applyDead(gp.axes[0] ?? 0);
        const ly = applyDead(gp.axes[1] ?? 0);
        onMove(lx, ly);

        // Right stick → aim
        const rx = applyDead(gp.axes[2] ?? 0);
        const ry = applyDead(gp.axes[3] ?? 0);
        onAim?.(rx, ry);

        // Right trigger (button 7) → shoot
        const rtVal = gp.buttons[7]?.value ?? 0;
        if (rtVal > 0.5 && !shootHeld.current) {
          shootHeld.current = true;
          onShoot?.();
          triggerHaptic(12);
        } else if (rtVal <= 0.5) {
          shootHeld.current = false;
        }

        // B button (button 1) → crouch toggle
        const bBtn = gp.buttons[1]?.pressed ?? false;
        if (bBtn && !crouchActive.current) {
          crouchActive.current = true;
          onCrouch?.(true);
        } else if (!bBtn && crouchActive.current) {
          crouchActive.current = false;
          onCrouch?.(false);
        }

        // X button (button 2) → reload
        if (gp.buttons[2]?.pressed) {
          onReload?.();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onMove, onAim, onShoot, onCrouch, onReload, deadzone]);
}

// ─────────────────────────────────────────────────────────────
//  MobileInputBar  — bottom control bar (HUD meta-buttons:
//  pause, settings, scoreboard toggle)
// ─────────────────────────────────────────────────────────────

export interface MobileInputBarProps {
  onPause?:   () => void;
  onSettings?:() => void;
  onScore?:   () => void;
  isDemo?:    boolean;
  demoLabel?: string;
}

export function MobileInputBar({
  onPause, onSettings, onScore, isDemo = false, demoLabel = "DEMO",
}: MobileInputBarProps) {
  const barStyle: CSSProperties = {
    position:        "absolute",
    bottom:          0,
    left:            "50%",
    transform:       "translateX(-50%)",
    display:         "flex",
    alignItems:      "center",
    gap:             "8px",
    padding:         "8px 16px",
    background:      "rgba(250,250,248,0.72)",
    backdropFilter:  "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border:          "1px solid rgba(200,200,210,0.55)",
    borderRadius:    "14px 14px 0 0",
    zIndex:          22,
    pointerEvents:   "auto",
  };

  const btnStyle = (active = false): CSSProperties => ({
    width:           38,
    height:          28,
    borderRadius:    "8px",
    background:      active ? `${C.gold}22` : "rgba(255,255,255,0.65)",
    border:          `1px solid ${active ? C.gold + "55" : "rgba(200,200,210,0.55)"}`,
    fontFamily:      "-apple-system,'SF Pro Display',sans-serif",
    fontSize:        "8px",
    fontWeight:      700,
    color:           active ? C.gold : C.midGray,
    letterSpacing:   "1px",
    cursor:          "pointer",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    transition:      "all 0.12s",
  });

  return (
    <div style={barStyle}>
      {isDemo && (
        <div style={{
          padding:    "2px 8px",
          background: `${C.gold}18`,
          border:     `1px solid ${C.gold}44`,
          borderRadius:6,
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize:   "7px", fontWeight:700,
          color:      C.gold, letterSpacing:"1.5px",
        }}>{demoLabel}</div>
      )}
      <div style={btnStyle()} onClick={onScore}>📊</div>
      <div style={btnStyle()} onClick={onPause}>⏸</div>
      <div style={btnStyle()} onClick={onSettings}>⚙️</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  JoystickConfig  — serializable config object
// ─────────────────────────────────────────────────────────────

export interface JoystickConfig {
  leftRadius:       number;
  rightRadius:      number;
  leftDeadzone:     number;
  rightDeadzone:    number;
  haptics:          boolean;
  floating:         boolean;
  leftColor:        string;
  rightColor:       string;
}

export const DEFAULT_JOYSTICK_CONFIG: JoystickConfig = {
  leftRadius:    52,
  rightRadius:   52,
  leftDeadzone:  0.12,
  rightDeadzone: 0.12,
  haptics:       true,
  floating:      false,
  leftColor:     C.playerBlue,
  rightColor:    C.gold,
};

export function saveJoystickConfig(config: JoystickConfig): void {
  // In production: persist to AsyncStorage / localStorage / server prefs
  console.debug("[KOBK] saveJoystickConfig", config);
}

export function loadJoystickConfig(): JoystickConfig {
  // In production: load from stored prefs
  return DEFAULT_JOYSTICK_CONFIG;
}

// ─────────────────────────────────────────────────────────────
//  TouchZone  — invisible full-screen touch handler that
//  maps taps to shooting and swipes to camera rotation
// ─────────────────────────────────────────────────────────────

export interface TouchZoneProps {
  onTap?:     (x: number, y: number) => void;
  onSwipe?:   (dx: number, dy: number) => void;
  disabled?:  boolean;
  excludeLeft?:  number;   // px — don't capture within N px of left edge
  excludeRight?: number;
  excludeBottom?: number;
}

export function TouchZone({
  onTap, onSwipe, disabled = false,
  excludeLeft = 160, excludeRight = 160, excludeBottom = 150,
}: TouchZoneProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const idRef    = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.changedTouches[0];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Exclude corners where joysticks live
    if (t.clientX < excludeLeft || t.clientX > vw - excludeRight) return;
    if (t.clientY > vh - excludeBottom) return;
    startRef.current = { x: t.clientX, y: t.clientY };
    idRef.current = t.identifier;
  }, [disabled, excludeLeft, excludeRight, excludeBottom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!startRef.current || idRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== idRef.current) continue;
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) {
        onTap?.(t.clientX, t.clientY);
      } else {
        onSwipe?.(dx / 100, dy / 100);
      }
      startRef.current = null;
      idRef.current    = null;
      break;
    }
  }, [onTap, onSwipe]);

  const style: CSSProperties = {
    position:      "absolute",
    inset:         0,
    zIndex:        8,
    touchAction:   "none",
    pointerEvents: disabled ? "none" : "auto",
  };

  return (
    <div
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  );
}

// ─────────────────────────────────────────────────────────────
//  JoystickDebugOverlay  — dev-mode visualization of
//  joystick values and deadzone in corner
// ─────────────────────────────────────────────────────────────

export function JoystickDebugOverlay({
  leftDx, leftDy, rightDx, rightDy, show = false,
}: {
  leftDx: number; leftDy: number;
  rightDx: number; rightDy: number;
  show?: boolean;
}) {
  if (!show) return null;

  const pad = (n: number) => n.toFixed(2).padStart(6);

  const panelStyle: CSSProperties = {
    position:      "absolute",
    top:           100,
    left:          "50%",
    transform:     "translateX(-50%)",
    background:    "rgba(29,29,31,0.82)",
    border:        "1px solid rgba(201,168,76,0.38)",
    borderRadius:  "10px",
    padding:       "8px 14px",
    fontFamily:    "monospace",
    fontSize:      "10px",
    color:         C.lightGold,
    letterSpacing: "0.8px",
    pointerEvents: "none",
    zIndex:        90,
    lineHeight:    1.7,
  };

  return (
    <div style={panelStyle}>
      <div>L  {pad(leftDx)} , {pad(leftDy)}</div>
      <div>R  {pad(rightDx)} , {pad(rightDy)}</div>
      <div style={{ color: C.chrome, fontSize:"8px", marginTop:"3px" }}>
        KOBK INPUT DEBUG
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Exported CSSProperties type (convenience re-export)
// ─────────────────────────────────────────────────────────────

export type { CSSProperties };
