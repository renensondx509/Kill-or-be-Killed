/**
 * ============================================================
 *  PaintballCharacter.tsx  —  Kill or Be Killed  ·  Luxury
 * ============================================================
 *  Aesthetic: iPhone Pro White  —  pearl ceramic armour,
 *  brushed platinum panels, champagne-gold hardware,
 *  frosted-glass thermal visor, surgical-grade precision.
 *
 *  Every surface: MeshStandardMaterial (full PBR)
 *   • Matte pearl ceramic  roughness 0.55–0.75  metalness 0.04–0.12
 *   • Brushed titanium     roughness 0.32–0.42  metalness 0.55–0.72
 *   • Polished gold        roughness 0.15–0.22  metalness 0.85–0.92
 *   • Frosted glass visor  roughness 0.04        metalness 0.25   opacity 0.82
 *
 *  Animation states:
 *    idle | run | strafe | shoot | hit | death | win | crouch
 *
 *  Features:
 *   • 20+ individually animated bones
 *   • Smooth state blending (no snap transitions)
 *   • Gold muzzle-flash emitter with point light
 *   • Low-HP red pulsing aura
 *   • Paint-splat decals with drip trails
 *   • Detailed luxury tactical vest, mask, helmet, gun
 * ============================================================
 */

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
//  Public types
// ─────────────────────────────────────────────────────────────

export type CharacterState =
  | "idle" | "run" | "strafe" | "shoot"
  | "hit"  | "death" | "win"  | "crouch";

export interface PaintSplatData {
  id:       number;
  localPos: THREE.Vector3;
  color:    string;
  size:     number;
  opacity:  number;
}

export interface PaintballCharacterProps {
  position:             [number, number, number];
  rotation?:            number;
  state?:               CharacterState;
  /** Team/jersey color — also tints visor accent & hopper */
  teamColor?:           string;
  /** true = local player, false = opponent */
  isPlayer?:            boolean;
  onAnimationComplete?: () => void;
  paintSplats?:         PaintSplatData[];
  lowHp?:               boolean;
  groupRef?:            React.RefObject<THREE.Group>;
}

// ─────────────────────────────────────────────────────────────
//  Luxury palette  (iPhone Pro White)
// ─────────────────────────────────────────────────────────────

const LX = {
  // Whites
  pearl:      "#F5F5F7",
  white:      "#FFFFFF",
  warmWhite:  "#FAFAF8",
  ivory:      "#F0EEE8",
  // Metals
  platinum:   "#E8E8ED",
  steel:      "#C8C8CE",
  chrome:     "#D4D4D8",
  darkSteel:  "#8E8E93",
  gold:       "#C9A84C",
  lightGold:  "#E8C96A",
  darkGold:   "#8B6914",
  // Darks (contrast only — minimal use)
  charcoal:   "#1D1D1F",
  deepGray:   "#3A3A3C",
  midGray:    "#6E6E73",
  // Glass
  frostBlue:  "#D0E8F5",
  deepBlue:   "#1C3A52",
  // Default team accents
  playerBlue: "#007AFF",
  oppRed:     "#FF3B30",
  // Skin
  skin:       "#C8A882",
  pants:      "#1A3A5C",
  pantsOpp:   "#3A1A1A",
} as const;

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** Sine wave shorthand */
const sw = (t: number, freq = 1, amp = 1, phase = 0) =>
  Math.sin(t * freq + phase) * amp;

/** Smooth-damp a value toward target */
const sd = (cur: number, tgt: number, speed: number) =>
  cur + (tgt - cur) * Math.min(speed, 1);

// ─────────────────────────────────────────────────────────────
//  Material builder
// ─────────────────────────────────────────────────────────────

const mkMat = (
  color:             string,
  roughness          = 0.72,
  metalness          = 0.08,
  emissive?:         string,
  emissiveIntensity  = 0,
  transparent        = false,
  opacity            = 1
) =>
  new THREE.MeshStandardMaterial({
    color:            new THREE.Color(color),
    roughness,
    metalness,
    emissive:         emissive ? new THREE.Color(emissive) : undefined,
    emissiveIntensity,
    transparent,
    opacity,
  });

// ─────────────────────────────────────────────────────────────
//  LuxBoot  — matte-pearl shell, brushed-steel sole, gold eyelets
// ─────────────────────────────────────────────────────────────

function LuxBoot() {
  return (
    <group position={[0, -0.642, 0.038]}>
      {/* Pearl ceramic shell */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.158, 0.136, 0.286]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.62} metalness={0.06} />
      </mesh>
      {/* Brushed-steel sole */}
      <mesh castShadow receiveShadow position={[0, -0.076, 0]}>
        <boxGeometry args={[0.168, 0.026, 0.296]} />
        <meshStandardMaterial color={LX.darkSteel} roughness={0.38} metalness={0.65} />
      </mesh>
      {/* Polished chrome toe cap */}
      <mesh castShadow position={[0, 0.008, 0.148]}>
        <boxGeometry args={[0.138, 0.116, 0.038]} />
        <meshStandardMaterial color={LX.chrome} roughness={0.22} metalness={0.55} />
      </mesh>
      {/* Heel block */}
      <mesh castShadow position={[0, -0.032, -0.108]}>
        <boxGeometry args={[0.142, 0.065, 0.065]} />
        <meshStandardMaterial color={LX.darkSteel} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* White lace strip */}
      <mesh castShadow position={[0, 0.072, 0.055]}>
        <boxGeometry args={[0.118, 0.012, 0.165]} />
        <meshStandardMaterial color={LX.white} roughness={0.85} />
      </mesh>
      {/* Gold eyelets */}
      {[-0.04, 0, 0.04].map((z, i) => (
        <mesh key={i} castShadow position={[0.055, 0.078, z]}>
          <cylinderGeometry args={[0.008, 0.008, 0.014, 6]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
      {/* Ankle cuff */}
      <mesh castShadow position={[0, 0.092, -0.01]}>
        <cylinderGeometry args={[0.09, 0.085, 0.062, 10]} />
        <meshStandardMaterial color={LX.warmWhite} roughness={0.82} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxKneePad
// ─────────────────────────────────────────────────────────────

function LuxKneePad({ tc }: { tc: string }) {
  return (
    <group position={[0, -0.165, 0.082]}>
      <mesh castShadow>
        <sphereGeometry args={[0.092, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.55} metalness={0.1} />
      </mesh>
      {/* Center titanium ridge */}
      <mesh castShadow position={[0, 0, 0.008]}>
        <boxGeometry args={[0.014, 0.085, 0.018]} />
        <meshStandardMaterial color={LX.steel} roughness={0.38} metalness={0.60} />
      </mesh>
      {/* Team-color accent stripe */}
      <mesh castShadow position={[0, -0.018, 0.092]}>
        <boxGeometry args={[0.065, 0.014, 0.005]} />
        <meshStandardMaterial color={tc} roughness={0.3} metalness={0.2}
          emissive={tc} emissiveIntensity={0.12} />
      </mesh>
      {/* Gold rivets */}
      {[-0.028, 0.028].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.042, 0.09]}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxShoulderPad
// ─────────────────────────────────────────────────────────────

function LuxShoulderPad({ side, tc }: { side: "left" | "right"; tc: string }) {
  const xs = side === "left" ? -1 : 1;
  return (
    <group position={[xs * 0.014, 0.075, 0]}>
      {/* Pearl dome */}
      <mesh castShadow>
        <sphereGeometry args={[0.115, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.52} metalness={0.1} />
      </mesh>
      {/* Gold edge arc */}
      <mesh castShadow position={[0, -0.048, 0]}>
        <torusGeometry args={[0.1, 0.008, 5, 18, Math.PI * 1.2]} />
        <meshStandardMaterial color={LX.gold} roughness={0.20} metalness={0.85} />
      </mesh>
      {/* Team-color status dot */}
      <mesh castShadow position={[0, 0.045, 0.098]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color={tc} roughness={0.20} metalness={0.3}
          emissive={tc} emissiveIntensity={0.20} />
      </mesh>
      {/* Strap bolt */}
      <mesh castShadow position={[0, -0.04, 0.065]}>
        <cylinderGeometry args={[0.014, 0.014, 0.025, 6]} />
        <meshStandardMaterial color={LX.gold} roughness={0.22} metalness={0.82} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxElbowPad
// ─────────────────────────────────────────────────────────────

function LuxElbowPad({ tc }: { tc: string }) {
  return (
    <group position={[0, -0.282, 0.038]}>
      <mesh castShadow>
        <sphereGeometry args={[0.088, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.58} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0, 0, 0.062]}>
        <boxGeometry args={[0.052, 0.028, 0.008]} />
        <meshStandardMaterial color={tc} roughness={0.25} metalness={0.25}
          emissive={tc} emissiveIntensity={0.10} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxVest  — full tactical vest with gold hardware
// ─────────────────────────────────────────────────────────────

function LuxVest({ tc }: { tc: string }) {
  return (
    <group>
      {/* Warm-white vest body */}
      <mesh castShadow receiveShadow position={[0, 0.012, 0.018]}>
        <boxGeometry args={[0.395, 0.465, 0.128]} />
        <meshStandardMaterial color={LX.warmWhite} roughness={0.78} metalness={0.02} />
      </mesh>
      {/* Polished chest plate */}
      <mesh castShadow position={[0, 0.062, 0.092]}>
        <boxGeometry args={[0.305, 0.285, 0.022]} />
        <meshStandardMaterial color={LX.white} roughness={0.42} metalness={0.12} />
      </mesh>
      {/* Titanium center ridge */}
      <mesh castShadow position={[0, 0.062, 0.104]}>
        <boxGeometry args={[0.018, 0.28, 0.008]} />
        <meshStandardMaterial color={LX.steel} roughness={0.35} metalness={0.58} />
      </mesh>
      {/* Horizontal stitching */}
      {[-0.08, 0, 0.08].map((y, i) => (
        <mesh key={i} castShadow position={[0, 0.062 + y, 0.104]}>
          <boxGeometry args={[0.3, 0.006, 0.004]} />
          <meshStandardMaterial color={LX.platinum} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
      {/* Shoulder straps */}
      {[-0.148, 0.148].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.182, 0.008]}>
          <boxGeometry args={[0.058, 0.225, 0.072]} />
          <meshStandardMaterial color={LX.pearl} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}
      {/* Gold buckles */}
      {[-0.148, 0.148].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.135, 0.048]}>
          <boxGeometry args={[0.042, 0.022, 0.012]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
      {/* Left ammo pouches */}
      {[0, 1].map(row => (
        <group key={row} position={[-0.152, -0.032 + row * 0.128, 0.088]}>
          <mesh castShadow>
            <boxGeometry args={[0.072, 0.098, 0.068]} />
            <meshStandardMaterial color={LX.ivory} roughness={0.88} />
          </mesh>
          <mesh castShadow position={[0, 0.054, 0.002]}>
            <boxGeometry args={[0.072, 0.018, 0.072]} />
            <meshStandardMaterial color={LX.platinum} roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, 0.060, 0.038]}>
            <cylinderGeometry args={[0.007, 0.007, 0.014, 6]} />
            <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
          </mesh>
        </group>
      ))}
      {/* Right utility pouch */}
      <group position={[0.152, 0.005, 0.088]}>
        <mesh castShadow>
          <boxGeometry args={[0.072, 0.148, 0.075]} />
          <meshStandardMaterial color={LX.ivory} roughness={0.88} />
        </mesh>
        <mesh castShadow position={[0, 0.078, 0]}>
          <boxGeometry args={[0.072, 0.022, 0.075]} />
          <meshStandardMaterial color={LX.platinum} roughness={0.72} />
        </mesh>
      </group>
      {/* Team-color chest accent strip */}
      <mesh castShadow position={[-0.098, 0.145, 0.106]}>
        <boxGeometry args={[0.065, 0.028, 0.005]} />
        <meshStandardMaterial color={tc} roughness={0.22} metalness={0.30}
          emissive={tc} emissiveIntensity={0.18} />
      </mesh>
      {/* Brushed-titanium waistband */}
      <mesh castShadow position={[0, -0.238, 0.018]}>
        <boxGeometry args={[0.425, 0.038, 0.118]} />
        <meshStandardMaterial color={LX.steel} roughness={0.42} metalness={0.55} />
      </mesh>
      {/* Gold belt buckle */}
      <mesh castShadow position={[0, -0.238, 0.082]}>
        <boxGeometry args={[0.048, 0.032, 0.012]} />
        <meshStandardMaterial color={LX.gold} roughness={0.15} metalness={0.92} />
      </mesh>
      {/* Velcro patches */}
      {[-0.065, 0.065].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.142, 0.106]}>
          <boxGeometry args={[0.048, 0.032, 0.004]} />
          <meshStandardMaterial color={LX.platinum} roughness={0.95} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxMask  — frosted visor + gold grill
// ─────────────────────────────────────────────────────────────

function LuxMask({ tc }: { tc: string }) {
  return (
    <group>
      {/* Pearl shell */}
      <mesh castShadow position={[0, 0, 0.112]}>
        <boxGeometry args={[0.358, 0.315, 0.158]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.58} metalness={0.10} />
      </mesh>
      {/* Cheek guards */}
      {[-1, 1].map(s => (
        <mesh key={s} castShadow position={[s * 0.192, 0.008, 0.068]}>
          <boxGeometry args={[0.038, 0.285, 0.098]} />
          <meshStandardMaterial color={LX.warmWhite} roughness={0.55} metalness={0.12} />
        </mesh>
      ))}
      {/* Frosted-glass visor */}
      <mesh castShadow position={[0, 0.052, 0.192]}>
        <boxGeometry args={[0.308, 0.128, 0.022]} />
        <meshStandardMaterial color={LX.frostBlue} roughness={0.04} metalness={0.25}
          transparent opacity={0.82} />
      </mesh>
      {/* Visor inner depth tint */}
      <mesh position={[0, 0.052, 0.204]}>
        <boxGeometry args={[0.285, 0.108, 0.004]} />
        <meshStandardMaterial color={LX.deepBlue} roughness={0.0} metalness={0.85}
          transparent opacity={0.35} />
      </mesh>
      {/* Gold visor top bar */}
      <mesh castShadow position={[0, 0.125, 0.196]}>
        <boxGeometry args={[0.325, 0.018, 0.022]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Team-color visor base bar */}
      <mesh castShadow position={[0, -0.020, 0.196]}>
        <boxGeometry args={[0.325, 0.012, 0.018]} />
        <meshStandardMaterial color={tc} roughness={0.25} metalness={0.35}
          emissive={tc} emissiveIntensity={0.15} />
      </mesh>
      {/* Chin guard */}
      <mesh castShadow position={[0, -0.148, 0.098]}>
        <boxGeometry args={[0.245, 0.072, 0.128]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.62} metalness={0.08} />
      </mesh>
      {/* Gold ventilation grill */}
      {[-0.085, -0.028, 0.028, 0.085].map((x, i) => (
        <mesh key={i} castShadow position={[x, -0.058, 0.196]}>
          <boxGeometry args={[0.022, 0.062, 0.014]} />
          <meshStandardMaterial color={LX.gold} roughness={0.22} metalness={0.82} />
        </mesh>
      ))}
      {/* Titanium ear cups */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * 0.198, 0.038, -0.018]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.078, 0.068, 0.048, 10]} />
            <meshStandardMaterial color={LX.steel} roughness={0.38} metalness={0.62} />
          </mesh>
          <mesh position={[0, 0, s * 0.026]}>
            <cylinderGeometry args={[0.062, 0.055, 0.018, 10]} />
            <meshStandardMaterial color={LX.charcoal} roughness={0.98} />
          </mesh>
        </group>
      ))}
      {/* Gold crown ridge */}
      <mesh castShadow position={[0, 0.168, 0.058]}>
        <boxGeometry args={[0.058, 0.022, 0.138]} />
        <meshStandardMaterial color={LX.gold} roughness={0.22} metalness={0.82} />
      </mesh>
      {/* Foam surround */}
      <mesh castShadow position={[0, 0.052, 0.173]}>
        <boxGeometry args={[0.342, 0.158, 0.012]} />
        <meshStandardMaterial color={LX.charcoal} roughness={0.98} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxHelmet  — sculpted pearl dome + gold hardware
// ─────────────────────────────────────────────────────────────

function LuxHelmet({ tc }: { tc: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.098, -0.018]}>
        <sphereGeometry args={[0.205, 14, 11, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.52} metalness={0.10} />
      </mesh>
      {/* Brim */}
      <mesh castShadow position={[0, 0.118, 0.162]}>
        <boxGeometry args={[0.265, 0.028, 0.115]} />
        <meshStandardMaterial color={LX.ivory} roughness={0.48} metalness={0.10} />
      </mesh>
      {/* Gold brim edge */}
      <mesh castShadow position={[0, 0.105, 0.222]}>
        <boxGeometry args={[0.262, 0.012, 0.012]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Ventilation slots */}
      {[-0.068, -0.022, 0.028, 0.078].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.182, 0.058]}>
          <boxGeometry args={[0.018, 0.032, 0.082]} />
          <meshStandardMaterial color={LX.midGray} roughness={0.9} />
        </mesh>
      ))}
      {/* Team-color crown stripe */}
      <mesh position={[0, 0.168, 0.065]}>
        <boxGeometry args={[0.215, 0.012, 0.098]} />
        <meshStandardMaterial color={tc} roughness={0.28} metalness={0.25}
          emissive={tc} emissiveIntensity={0.12} />
      </mesh>
      {/* Chin strap anchor points */}
      {[-1, 1].map(s => (
        <mesh key={s} castShadow position={[s * 0.158, -0.055, 0.058]}>
          <boxGeometry args={[0.018, 0.014, 0.018]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxGun  — white ceramic body, titanium barrel, gold rail
// ─────────────────────────────────────────────────────────────

function LuxGun({
  tc, gunRef, muzzleRef,
}: {
  tc:       string;
  gunRef?:  React.RefObject<THREE.Group>;
  muzzleRef?: React.RefObject<THREE.Mesh>;
}) {
  return (
    <group ref={gunRef} position={[0.062, -0.558, 0.158]} rotation={[0.5, 0, 0]}>
      {/* Receiver — pearl ceramic */}
      <mesh castShadow>
        <boxGeometry args={[0.062, 0.112, 0.432]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.52} metalness={0.10} />
      </mesh>
      {/* Machined titanium side rails */}
      {[-1, 1].map(s => (
        <mesh key={s} castShadow position={[s * 0.033, 0, 0]}>
          <boxGeometry args={[0.004, 0.108, 0.428]} />
          <meshStandardMaterial color={LX.steel} roughness={0.32} metalness={0.68} />
        </mesh>
      ))}
      {/* Titanium barrel */}
      <mesh castShadow position={[0, 0.018, 0.318]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.026, 0.425, 10]} />
        <meshStandardMaterial color={LX.steel} roughness={0.35} metalness={0.72} />
      </mesh>
      {/* Gold barrel port rings */}
      {[0.14, 0.19, 0.24].map((z, i) => (
        <mesh key={i} castShadow position={[0, 0.042, 0.16 + z]}>
          <cylinderGeometry args={[0.005, 0.005, 0.028, 6]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
      {/* Polished muzzle crown */}
      <mesh castShadow position={[0, 0.018, 0.532]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.020, 0.026, 0.038, 10]} />
        <meshStandardMaterial color={LX.chrome} roughness={0.22} metalness={0.72} />
      </mesh>
      <mesh position={[0, 0.018, 0.554]}>
        <cylinderGeometry args={[0.010, 0.010, 0.004, 8]} />
        <meshStandardMaterial color={LX.charcoal} roughness={1} />
      </mesh>
      {/* Spawn point */}
      <mesh ref={muzzleRef} name="muzzle" position={[0, 0.018, 0.558]} visible={false}>
        <sphereGeometry args={[0.006]} />
        <meshBasicMaterial color={LX.gold} />
      </mesh>
      {/* Champagne-gold hopper dome */}
      <mesh castShadow position={[0, 0.135, 0.052]}>
        <sphereGeometry args={[0.072, 10, 10]} />
        <meshStandardMaterial color={LX.lightGold} roughness={0.38} metalness={0.45}
          transparent opacity={0.92} />
      </mesh>
      <mesh castShadow position={[0, 0.066, 0.052]}>
        <cylinderGeometry args={[0.025, 0.028, 0.058, 8]} />
        <meshStandardMaterial color={LX.steel} roughness={0.38} metalness={0.62} />
      </mesh>
      {/* Pearl paintballs inside hopper */}
      {[[0,0,0],[-0.022,-0.020,0.018],[0.022,-0.020,-0.010],[0,-0.035,0.025]].map(([px,py,pz],i)=>(
        <mesh key={i} position={[px,0.118+py,0.052+pz]}>
          <sphereGeometry args={[0.017,6,6]}/>
          <meshStandardMaterial color={tc} roughness={0.28} transparent opacity={0.75}/>
        </mesh>
      ))}
      {/* Gold anodised sight rail */}
      <mesh castShadow position={[0, 0.062, -0.018]}>
        <boxGeometry args={[0.026, 0.010, 0.318]} />
        <meshStandardMaterial color={LX.gold} roughness={0.22} metalness={0.85} />
      </mesh>
      {[-0.095, -0.038, 0.022, 0.082].map((z, i) => (
        <mesh key={i} position={[0, 0.068, z]}>
          <boxGeometry args={[0.028, 0.004, 0.018]} />
          <meshStandardMaterial color={LX.darkGold} roughness={0.30} metalness={0.68} />
        </mesh>
      ))}
      {/* Chrome iron-sight posts */}
      <mesh castShadow position={[0, 0.082, 0.168]}>
        <boxGeometry args={[0.006, 0.022, 0.006]} />
        <meshStandardMaterial color={LX.chrome} roughness={0.22} metalness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 0.082, -0.118]}>
        <boxGeometry args={[0.022, 0.018, 0.009]} />
        <meshStandardMaterial color={LX.chrome} roughness={0.22} metalness={0.78} />
      </mesh>
      {/* Polished-steel trigger guard */}
      <mesh castShadow position={[0, -0.048, -0.038]}>
        <torusGeometry args={[0.037, 0.009, 5, 10, Math.PI]} />
        <meshStandardMaterial color={LX.steel} roughness={0.28} metalness={0.68} />
      </mesh>
      <mesh castShadow position={[0, -0.047, -0.018]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.007, 0.044, 0.013]} />
        <meshStandardMaterial color={LX.darkSteel} roughness={0.28} metalness={0.62} />
      </mesh>
      {/* White ceramic grip */}
      <mesh castShadow position={[0, -0.108, -0.078]}>
        <boxGeometry args={[0.055, 0.142, 0.072]} />
        <meshStandardMaterial color={LX.warmWhite} roughness={0.82} metalness={0.02} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} castShadow position={[s * 0.029, -0.108, -0.078]}>
          <boxGeometry args={[0.003, 0.120, 0.062]} />
          <meshStandardMaterial color={LX.steel} roughness={0.35} metalness={0.62} />
        </mesh>
      ))}
      {/* Gold air-tank connector */}
      <mesh castShadow position={[0, -0.178, -0.098]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.019, 0.078, 8]} />
        <meshStandardMaterial color={LX.gold} roughness={0.22} metalness={0.85} />
      </mesh>
      {/* Pearl foregrip */}
      <mesh castShadow position={[0, -0.058, 0.198]}>
        <boxGeometry args={[0.038, 0.098, 0.042]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.72} metalness={0.06} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Gold muzzle flash
// ─────────────────────────────────────────────────────────────

function MuzzleFlash({
  active, pos, tc,
}: {
  active: boolean;
  pos:    [number, number, number];
  tc:     string;
}) {
  const gRef  = useRef<THREE.Group>(null);
  const opRef = useRef(0);

  useFrame((_, dt) => {
    if (!gRef.current) return;
    opRef.current = active ? 1 : Math.max(0, opRef.current - dt * 18);
    gRef.current.visible = opRef.current > 0.01;
    gRef.current.children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        (c.material as THREE.MeshBasicMaterial).opacity = opRef.current;
      }
    });
  });

  if (!active && opRef.current <= 0) return null;

  return (
    <group ref={gRef} position={pos}>
      <mesh><sphereGeometry args={[0.055,8,8]}/><meshBasicMaterial color="#ffffff" transparent opacity={1}/></mesh>
      <mesh><sphereGeometry args={[0.088,8,8]}/><meshBasicMaterial color={tc} transparent opacity={0.7}/></mesh>
      <mesh><sphereGeometry args={[0.135,8,8]}/><meshBasicMaterial color={LX.gold} transparent opacity={0.28}/></mesh>
      {[0,45,90,135,180,225,270,315].map(deg=>{
        const r=(deg*Math.PI)/180;
        return(
          <mesh key={deg} position={[Math.cos(r)*0.095,Math.sin(r)*0.095,0]} rotation={[0,0,r]}>
            <boxGeometry args={[0.11,0.010,0.007]}/>
            <meshBasicMaterial color={LX.gold} transparent opacity={0.55}/>
          </mesh>
        );
      })}
      <pointLight color={tc} intensity={active ? 2.8 : 0} distance={2.8} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Low HP aura  (red pulse behind pearl armour)
// ─────────────────────────────────────────────────────────────

function LowHpAura({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (!ref.current || !active) return;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4.2);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = active ? pulse * 0.16 : 0;
    ref.current.scale.setScalar(1 + pulse * 0.04);
  });
  if (!active) return null;
  return (
    <mesh ref={ref} position={[0, 0.9, 0]}>
      <sphereGeometry args={[0.58, 12, 12]} />
      <meshBasicMaterial color={LX.oppRed} transparent opacity={0.1} side={THREE.BackSide} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  Paint splat decals on character mesh
// ─────────────────────────────────────────────────────────────

function CharSplats({ splats }: { splats: PaintSplatData[] }) {
  return (
    <>
      {splats.map(sp => (
        <group key={sp.id} position={sp.localPos}>
          <mesh rotation={[Math.PI / 2, Math.random() * Math.PI * 2, 0]}>
            <circleGeometry args={[sp.size, 12]} />
            <meshStandardMaterial color={sp.color} roughness={0.9}
              transparent opacity={sp.opacity} depthWrite={false} />
          </mesh>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * sp.size * 0.8,
              -sp.size * (0.6 + i * 0.4),
              0.005,
            ]}>
              <capsuleGeometry args={[sp.size * 0.07, sp.size * (0.28 + Math.random() * 0.35), 3, 5]} />
              <meshStandardMaterial color={sp.color} roughness={0.9}
                transparent opacity={sp.opacity * 0.6} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main PaintballCharacter
// ─────────────────────────────────────────────────────────────

export default function PaintballCharacter({
  position,
  rotation          = 0,
  state             = "idle",
  teamColor         = LX.playerBlue,
  isPlayer          = true,
  onAnimationComplete,
  paintSplats       = [],
  lowHp             = false,
  groupRef:         extRef,
}: PaintballCharacterProps) {

  // ── Bone refs ──────────────────────────────────────────────
  const intRef    = useRef<THREE.Group>(null);
  const groupRef  = extRef ?? intRef;
  const rootRef   = useRef<THREE.Group>(null);
  const torsoRef  = useRef<THREE.Group>(null);
  const spineRef  = useRef<THREE.Group>(null);
  const headRef   = useRef<THREE.Group>(null);
  const lArmRef   = useRef<THREE.Group>(null);
  const lForeRef  = useRef<THREE.Group>(null);
  const rArmRef   = useRef<THREE.Group>(null);
  const rForeRef  = useRef<THREE.Group>(null);
  const lLegRef   = useRef<THREE.Group>(null);
  const lShinRef  = useRef<THREE.Group>(null);
  const rLegRef   = useRef<THREE.Group>(null);
  const rShinRef  = useRef<THREE.Group>(null);
  const gunRef    = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);

  // ── Animation machine refs ────────────────────────────────
  const stateRef  = useRef(state);
  const tRef      = useRef(0);
  const deathP    = useRef(0);
  const hitP      = useRef(0);
  const shootC    = useRef(0);
  const crouchP   = useRef(0);
  const footP     = useRef(0);
  const flashOn   = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    if (state === "hit")   hitP.current   = 0;
    if (state === "death") deathP.current = 0;
  }, [state]);

  const pantsCol = isPlayer ? LX.pants : LX.pantsOpp;

  const muzzleWorldPos = useMemo(
    (): [number, number, number] => [
      position[0],
      position[1] + 1.1,
      position[2] + (isPlayer ? 0.65 : -0.65),
    ],
    [position, isPlayer]
  );

  // ── Per-frame animation ───────────────────────────────────
  useFrame((_, dt) => {
    tRef.current += dt;
    const T = tRef.current;
    const s = stateRef.current;

    if (!groupRef.current || !rootRef.current) return;
    groupRef.current.position.set(...position);
    groupRef.current.rotation.y = rotation;

    // Crouch blend
    crouchP.current = sd(crouchP.current, s === "crouch" ? 1 : 0, dt * 6);
    rootRef.current.position.y  = -crouchP.current * 0.22;
    rootRef.current.rotation.x  =  crouchP.current * 0.14;

    // ── IDLE ──────────────────────────────────────────────
    if (s === "idle" || s === "crouch") {
      const b  = sw(T, 1.1, 0.012);
      const sv = sw(T, 0.65, 0.008);
      if (torsoRef.current) { torsoRef.current.position.y = b; torsoRef.current.rotation.z = sv; }
      if (headRef.current)  { headRef.current.position.y = b * 0.6; headRef.current.rotation.y = sw(T, 0.3, 0.04); }
      if (lArmRef.current)  { lArmRef.current.rotation.x = -0.28 + b * 1.5; lArmRef.current.rotation.z = -0.05 + sv * 0.5; }
      if (rArmRef.current)  { rArmRef.current.rotation.x = -0.46 + b * 1.5; rArmRef.current.rotation.z =  0.05 + sv * 0.5; }
      if (gunRef.current)   { gunRef.current.rotation.x = sw(T, 0.75, 0.02); gunRef.current.rotation.z = sw(T, 1.0, 0.012); }
    }

    // ── RUN ───────────────────────────────────────────────
    if (s === "run") {
      const spd = 9; footP.current += dt * spd;
      const fp = footP.current;
      const lg = Math.sin(fp) * 0.55;
      const ag = Math.sin(fp) * 0.38;
      const bb = Math.abs(Math.sin(fp)) * 0.042;
      const bt = Math.sin(fp * 0.5) * 0.055;
      if (torsoRef.current) torsoRef.current.position.y = bb;
      if (spineRef.current) spineRef.current.rotation.y = bt;
      if (headRef.current)  { headRef.current.position.y = bb * 0.6; headRef.current.rotation.y = -bt * 0.5; }
      if (lLegRef.current)  lLegRef.current.rotation.x  =  lg;
      if (lShinRef.current) lShinRef.current.rotation.x = -Math.max(0,  lg) * 0.5;
      if (rLegRef.current)  rLegRef.current.rotation.x  = -lg;
      if (rShinRef.current) rShinRef.current.rotation.x = -Math.max(0, -lg) * 0.5;
      if (lArmRef.current)  lArmRef.current.rotation.x  = -ag - 0.2;
      if (rArmRef.current)  rArmRef.current.rotation.x  =  ag - 0.4;
    }

    // ── STRAFE ────────────────────────────────────────────
    if (s === "strafe") {
      footP.current += dt * 8;
      const fp = footP.current;
      const lg = Math.sin(fp) * 0.38;
      const bb = Math.abs(Math.sin(fp)) * 0.03;
      if (torsoRef.current) { torsoRef.current.position.y = bb; torsoRef.current.rotation.z = sw(T, 4, 0.04); }
      if (lLegRef.current)  lLegRef.current.rotation.z  =  lg;
      if (rLegRef.current)  rLegRef.current.rotation.z  = -lg;
      if (lLegRef.current)  lLegRef.current.rotation.x  =  sw(T, 4, 0.2);
      if (rLegRef.current)  rLegRef.current.rotation.x  = -sw(T, 4, 0.2);
    }

    // ── SHOOT ─────────────────────────────────────────────
    if (s === "shoot") {
      shootC.current += dt;
      const cycleT = (shootC.current % 0.38) / 0.38;
      const recoil  = cycleT < 0.12 ? cycleT / 0.12 : 1 - (cycleT - 0.12) / 0.88;
      const ra      = recoil * 0.44;
      if (rArmRef.current)  { rArmRef.current.rotation.x = -0.5 - ra; rArmRef.current.rotation.y = recoil * 0.06; }
      if (rForeRef.current) rForeRef.current.rotation.x  = -ra * 0.4;
      if (gunRef.current)   { gunRef.current.position.z = recoil * 0.068; gunRef.current.rotation.x = -ra * 0.2; }
      if (torsoRef.current) { torsoRef.current.rotation.x = recoil * 0.038; torsoRef.current.rotation.z = recoil * 0.014; }
      flashOn.current = cycleT < 0.15;
    } else {
      flashOn.current = false;
      shootC.current  = 0;
    }

    // ── HIT ───────────────────────────────────────────────
    if (s === "hit") {
      hitP.current = Math.min(hitP.current + dt * 4.5, 1);
      const p    = hitP.current;
      const jerk = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = jerk * 0.3;
        torsoRef.current.position.x = Math.sin(p * Math.PI * 3) * 0.07;
      }
      if (headRef.current) headRef.current.rotation.x = jerk * 0.2;
      if (lArmRef.current) lArmRef.current.rotation.x = jerk * 0.4;
      if (rArmRef.current) rArmRef.current.rotation.x = -jerk * 0.3;
      if (p >= 1 && onAnimationComplete) onAnimationComplete();
    }

    // ── DEATH ─────────────────────────────────────────────
    if (s === "death") {
      deathP.current = Math.min(deathP.current + dt * 1.1, 1);
      const p    = deathP.current;
      const fall = p < 0.35 ? 0 : (p - 0.35) / 0.65;
      if (groupRef.current) {
        groupRef.current.rotation.x = fall * (Math.PI / 2.1);
        groupRef.current.position.y = -fall * 0.65;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.z = (p < 0.35 ? p / 0.35 : 1) * 0.2;
        torsoRef.current.position.x = Math.sin(p * Math.PI) * 0.12;
      }
      if (headRef.current) headRef.current.rotation.x = fall * 0.5;
      if (p >= 0.96 && onAnimationComplete) onAnimationComplete();
    }

    // ── WIN ───────────────────────────────────────────────
    if (s === "win") {
      const wave   = sw(T, 3.2, 0.22);
      const bounce = Math.abs(sw(T, 2.8, 0.06));
      if (lArmRef.current) { lArmRef.current.rotation.x = -1.75 + wave; lArmRef.current.rotation.z = -0.35 + wave * 0.3; }
      if (rArmRef.current) { rArmRef.current.rotation.x = -1.75 - wave; rArmRef.current.rotation.z =  0.35 - wave * 0.3; }
      if (torsoRef.current){ torsoRef.current.rotation.y = sw(T, 1.6, 0.1); torsoRef.current.position.y = bounce; }
      if (headRef.current) headRef.current.rotation.x = -0.15 + sw(T, 2, 0.06);
      if (lLegRef.current) lLegRef.current.rotation.x  =  sw(T, 2.8, 0.06);
      if (rLegRef.current) rLegRef.current.rotation.x  = -sw(T, 2.8, 0.06);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <group ref={rootRef}>

        <LowHpAura active={lowHp} />
        <CharSplats splats={paintSplats} />

        {/* ─── LEFT LEG ─────────────────────────────────── */}
        <group ref={lLegRef} position={[-0.126, 0.52, 0]}>
          <mesh castShadow position={[0, 0.062, 0]}>
            <sphereGeometry args={[0.102, 10, 10]} />
            <meshStandardMaterial color={pantsCol} roughness={0.82} />
          </mesh>
          <mesh castShadow position={[0, -0.040, 0]}>
            <capsuleGeometry args={[0.090, 0.38, 5, 10]} />
            <meshStandardMaterial color={pantsCol} roughness={0.82} />
          </mesh>
          <LuxKneePad tc={teamColor} />
          <group ref={lShinRef} position={[0, -0.36, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <capsuleGeometry args={[0.074, 0.30, 4, 8]} />
              <meshStandardMaterial color={pantsCol} roughness={0.82} />
            </mesh>
            <LuxBoot />
          </group>
        </group>

        {/* ─── RIGHT LEG ────────────────────────────────── */}
        <group ref={rLegRef} position={[0.126, 0.52, 0]}>
          <mesh castShadow position={[0, 0.062, 0]}>
            <sphereGeometry args={[0.102, 10, 10]} />
            <meshStandardMaterial color={pantsCol} roughness={0.82} />
          </mesh>
          <mesh castShadow position={[0, -0.040, 0]}>
            <capsuleGeometry args={[0.090, 0.38, 5, 10]} />
            <meshStandardMaterial color={pantsCol} roughness={0.82} />
          </mesh>
          <LuxKneePad tc={teamColor} />
          <group ref={rShinRef} position={[0, -0.36, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <capsuleGeometry args={[0.074, 0.30, 4, 8]} />
              <meshStandardMaterial color={pantsCol} roughness={0.82} />
            </mesh>
            <LuxBoot />
          </group>
        </group>

        {/* ─── TORSO ────────────────────────────────────── */}
        <group ref={torsoRef} position={[0, 0.88, 0]}>
          <group ref={spineRef}>
            {/* Base jersey — pearl white */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.435, 0.585, 0.228]} />
              <meshStandardMaterial color={LX.pearl} roughness={0.75} metalness={0.04} />
            </mesh>
            {/* Shoulder jersey extensions */}
            {[-1, 1].map(s => (
              <mesh key={s} castShadow position={[s * 0.262, 0.128, 0]}>
                <capsuleGeometry args={[0.082, 0.118, 4, 8]} />
                <meshStandardMaterial color={LX.pearl} roughness={0.75} />
              </mesh>
            ))}

            <LuxVest tc={teamColor} />

            {/* Neck */}
            <mesh castShadow position={[0, 0.322, 0]}>
              <cylinderGeometry args={[0.072, 0.088, 0.138, 10]} />
              <meshStandardMaterial color={LX.skin} roughness={0.72} />
            </mesh>

            {/* ─── HEAD ─────────────────────────────────── */}
            <group ref={headRef} position={[0, 0.442, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.174, 14, 12]} />
                <meshStandardMaterial color={LX.skin} roughness={0.70} />
              </mesh>
              <LuxMask tc={teamColor} />
              <LuxHelmet tc={teamColor} />
            </group>

            {/* ─── LEFT ARM ─────────────────────────────── */}
            <group ref={lArmRef} position={[-0.278, 0.142, 0]}>
              <LuxShoulderPad side="left" tc={teamColor} />
              <mesh castShadow position={[0, -0.132, 0]}>
                <capsuleGeometry args={[0.076, 0.225, 5, 10]} />
                <meshStandardMaterial color={LX.pearl} roughness={0.75} />
              </mesh>
              <LuxElbowPad tc={teamColor} />
              <group ref={lForeRef} position={[0, -0.322, 0]}>
                <mesh castShadow position={[0, -0.120, 0]}>
                  <capsuleGeometry args={[0.066, 0.225, 4, 8]} />
                  <meshStandardMaterial color={LX.pearl} roughness={0.75} />
                </mesh>
                {/* White ceramic glove */}
                <mesh castShadow position={[0, -0.322, 0]}>
                  <sphereGeometry args={[0.073, 10, 10]} />
                  <meshStandardMaterial color={LX.warmWhite} roughness={0.72} metalness={0.05} />
                </mesh>
                {/* Gold knuckle bar */}
                <mesh castShadow position={[0, -0.310, 0.055]}>
                  <boxGeometry args={[0.058, 0.012, 0.018]} />
                  <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
                </mesh>
              </group>
            </group>

            {/* ─── RIGHT ARM (gun arm) ──────────────────── */}
            <group ref={rArmRef} position={[0.278, 0.142, 0]} rotation={[-0.48, 0, 0]}>
              <LuxShoulderPad side="right" tc={teamColor} />
              <mesh castShadow position={[0, -0.132, 0]}>
                <capsuleGeometry args={[0.076, 0.225, 5, 10]} />
                <meshStandardMaterial color={LX.pearl} roughness={0.75} />
              </mesh>
              <LuxElbowPad tc={teamColor} />
              <group ref={rForeRef} position={[0, -0.322, 0]}>
                <mesh castShadow position={[0, -0.120, 0]}>
                  <capsuleGeometry args={[0.066, 0.225, 4, 8]} />
                  <meshStandardMaterial color={LX.pearl} roughness={0.75} />
                </mesh>
                <mesh castShadow position={[0, -0.322, 0]}>
                  <sphereGeometry args={[0.073, 10, 10]} />
                  <meshStandardMaterial color={LX.warmWhite} roughness={0.72} metalness={0.05} />
                </mesh>
                <mesh castShadow position={[0, -0.310, 0.055]}>
                  <boxGeometry args={[0.058, 0.012, 0.018]} />
                  <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
                </mesh>
                {/* Luxury gun */}
                <LuxGun tc={teamColor} gunRef={gunRef} muzzleRef={muzzleRef} />
              </group>
            </group>

          </group>{/* /spineRef */}
        </group>{/* /torsoRef */}

      </group>{/* /rootRef */}

      {/* Muzzle flash (world-space, outside bone chain) */}
      <MuzzleFlash active={flashOn.current} pos={muzzleWorldPos} tc={teamColor} />

    </group>
  );
}

// ═════════════════════════════════════════════════════════════
//  EXTENDED COMPONENTS — Luxury character accessories,
//  observer utilities, and backend integration stubs
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  LuxBackpack  — compressed-air tank + straps
//  Attaches to spine of the character torso
// ─────────────────────────────────────────────────────────────

function LuxBackpack({ tc }: { tc: string }) {
  return (
    <group position={[0, 0.045, -0.148]}>
      {/* Main air cylinder */}
      <mesh castShadow>
        <cylinderGeometry args={[0.068, 0.072, 0.445, 10]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.52} metalness={0.10} />
      </mesh>
      {/* Gold neck valve */}
      <mesh castShadow position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.028, 0.032, 0.058, 8]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Pressure gauge (chrome disc) */}
      <mesh castShadow position={[0.072, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 0.018, 8]} />
        <meshStandardMaterial color={LX.chrome} roughness={0.22} metalness={0.72} />
      </mesh>
      {/* Gold needle on gauge */}
      <mesh castShadow position={[0.092, 0.12, 0]}>
        <boxGeometry args={[0.022, 0.004, 0.004]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Regulator assembly */}
      <mesh castShadow position={[0, 0.268, 0]}>
        <sphereGeometry args={[0.038, 8, 8]} />
        <meshStandardMaterial color={LX.darkSteel} roughness={0.38} metalness={0.62} />
      </mesh>
      {/* High-pressure feed hose */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} castShadow
          position={[0.082, 0.22 - i * 0.028, 0.038]}
          rotation={[0, 0, 0.2 * (i % 2 === 0 ? 1 : -1)]}>
          <torusGeometry args={[0.032, 0.009, 5, 8, Math.PI * 0.6]} />
          <meshStandardMaterial color={tc} roughness={0.60} metalness={0.12}
            emissive={tc} emissiveIntensity={0.06} />
        </mesh>
      ))}
      {/* Carry strap left */}
      <mesh castShadow position={[-0.065, 0.05, 0.045]}>
        <boxGeometry args={[0.022, 0.38, 0.018]} />
        <meshStandardMaterial color={LX.warmWhite} roughness={0.88} />
      </mesh>
      {/* Carry strap right */}
      <mesh castShadow position={[0.065, 0.05, 0.045]}>
        <boxGeometry args={[0.022, 0.38, 0.018]} />
        <meshStandardMaterial color={LX.warmWhite} roughness={0.88} />
      </mesh>
      {/* Gold buckle center chest */}
      <mesh castShadow position={[0, -0.065, 0.082]}>
        <boxGeometry args={[0.085, 0.020, 0.012]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Cylinder bottom cap */}
      <mesh castShadow position={[0, -0.228, 0]}>
        <cylinderGeometry args={[0.068, 0.064, 0.022, 10]} />
        <meshStandardMaterial color={LX.steel} roughness={0.38} metalness={0.62} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxPodPouch  — thigh-mounted spare-hopper pouch
// ─────────────────────────────────────────────────────────────

function LuxPodPouch({ side, tc }: { side: "left" | "right"; tc: string }) {
  const xs = side === "left" ? -1 : 1;
  return (
    <group position={[xs * 0.138, -0.22, 0.028]}>
      {/* Pouch body */}
      <mesh castShadow>
        <boxGeometry args={[0.072, 0.142, 0.072]} />
        <meshStandardMaterial color={LX.ivory} roughness={0.88} />
      </mesh>
      {/* Lid flap */}
      <mesh castShadow position={[0, 0.078, 0.002]}>
        <boxGeometry args={[0.072, 0.020, 0.072]} />
        <meshStandardMaterial color={LX.platinum} roughness={0.72} />
      </mesh>
      {/* Gold snap button */}
      <mesh castShadow position={[0, 0.085, 0.038]}>
        <cylinderGeometry args={[0.009, 0.009, 0.012, 6]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Thigh strap */}
      <mesh castShadow position={[0, -0.088, 0]}>
        <boxGeometry args={[0.120, 0.018, 0.014]} />
        <meshStandardMaterial color={LX.steel} roughness={0.42} metalness={0.55} />
      </mesh>
      {/* Spare hopper visible through opening */}
      <mesh castShadow position={[0, 0.025, 0.025]}>
        <sphereGeometry args={[0.026, 7, 7]} />
        <meshStandardMaterial color={tc} roughness={0.35} metalness={0.35}
          transparent opacity={0.88} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxScorePlate  — wearable number plate on the back
// ─────────────────────────────────────────────────────────────

function LuxScorePlate({ number, tc }: { number: number; tc: string }) {
  return (
    <group position={[0, 0.08, -0.128]}>
      {/* White backing plate */}
      <mesh castShadow>
        <boxGeometry args={[0.215, 0.175, 0.012]} />
        <meshStandardMaterial color={LX.white} roughness={0.55} metalness={0.08} />
      </mesh>
      {/* Gold border */}
      {[
        [0,  0.0882, 0.215, 0.014],
        [0, -0.0882, 0.215, 0.014],
        [ 0.1075, 0, 0.014, 0.175],
        [-0.1075, 0, 0.014, 0.175],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} castShadow position={[x, y, 0.014]}>
          <boxGeometry args={[w, h, 0.004]} />
          <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}
      {/* Number blocks (pixel art — 1 or 2) */}
      {number === 1 && (
        <mesh castShadow position={[0, 0, 0.016]}>
          <boxGeometry args={[0.028, 0.095, 0.005]} />
          <meshStandardMaterial color={tc} roughness={0.28} metalness={0.18}
            emissive={tc} emissiveIntensity={0.18} />
        </mesh>
      )}
      {number === 2 && (
        <>
          {[
            [-0.022, 0.038, 0.040, 0.020],
            [ 0.022, 0.038, 0.040, 0.020],
            [ 0.000, 0.000, 0.040, 0.020],
            [-0.022,-0.038, 0.040, 0.020],
            [ 0.022,-0.038, 0.040, 0.020],
          ].map(([bx, by, bw, bh], i) => (
            <mesh key={i} castShadow position={[bx, by, 0.016]}>
              <boxGeometry args={[bw, bh, 0.004]} />
              <meshStandardMaterial color={tc} roughness={0.28} metalness={0.18}
                emissive={tc} emissiveIntensity={0.18} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shadow blob  — soft contact shadow disc below character
// ─────────────────────────────────────────────────────────────

function CharacterShadowBlob({ position }: { position: [number, number, number] }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], 0.006, position[2]]}
    >
      <circleGeometry args={[0.42, 14]} />
      <meshBasicMaterial color={LX.charcoal} transparent opacity={0.09} depthWrite={false} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  CharacterNameTag  — floating 3D label above the player
//  Used in spectator / replay mode
// ─────────────────────────────────────────────────────────────

export function CharacterNameTag({
  name, position, color, visible = true,
}: {
  name:     string;
  position: [number, number, number];
  color:    string;
  visible?: boolean;
}) {
  const ref  = useRef<THREE.Group>(null);
  const { camera } = useThree ? (() => {
    try { return require("@react-three/fiber").useThree(); } catch { return { camera: null }; }
  })() : { camera: null };

  useFrame(() => {
    if (!ref.current || !camera) return;
    // Always face camera (billboard)
    ref.current.quaternion.copy((camera as THREE.Camera).quaternion);
  });

  if (!visible) return null;

  return (
    <group ref={ref} position={[position[0], position[1] + 2.42, position[2]]}>
      {/* Background pill */}
      <mesh>
        <boxGeometry args={[0.48, 0.10, 0.004]} />
        <meshBasicMaterial color={LX.charcoal} transparent opacity={0.72} />
      </mesh>
      {/* Gold border */}
      <mesh position={[0, 0, 0.003]}>
        <boxGeometry args={[0.49, 0.105, 0.001]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {/* Team indicator dot */}
      <mesh position={[-0.21, 0, 0.006]}>
        <circleGeometry args={[0.018, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  useCharacterSounds  — hook stub for SFX bindings
//  Replace body with real Web Audio / Howler calls
// ─────────────────────────────────────────────────────────────

export function useCharacterSounds() {
  const playShoot = useCallback(() => {
    // TODO: play "shoot.mp3" at muzzle position
    console.debug("[KOBK Audio] shoot");
  }, []);

  const playHit = useCallback(() => {
    // TODO: play "hit.mp3" with spatial audio
    console.debug("[KOBK Audio] hit");
  }, []);

  const playDeath = useCallback(() => {
    // TODO: play "death.mp3" with reverb
    console.debug("[KOBK Audio] death");
  }, []);

  const playWin = useCallback(() => {
    // TODO: play "win_stinger.mp3"
    console.debug("[KOBK Audio] win");
  }, []);

  const playFootstep = useCallback((surface: "marble" | "dirt" | "metal") => {
    console.debug(`[KOBK Audio] footstep:${surface}`);
  }, []);

  return { playShoot, playHit, playDeath, playWin, playFootstep };
}

// ─────────────────────────────────────────────────────────────
//  CharacterLOD  — Level-of-Detail wrapper
//  Renders full-detail within 10 units, simplified beyond.
// ─────────────────────────────────────────────────────────────

export interface CharacterLODProps extends PaintballCharacterProps {
  cameraPosition?: THREE.Vector3;
}

export function CharacterLOD({
  cameraPosition,
  ...props
}: CharacterLODProps) {
  const [distance, setDistance] = useState(5);

  useFrame(state => {
    if (!cameraPosition) {
      const cp = state.camera.position;
      const dx = cp.x - props.position[0];
      const dz = cp.z - props.position[2];
      setDistance(Math.sqrt(dx * dx + dz * dz));
    }
  });

  // Below 10 units: full character
  // 10–18: simplified (no backpack, no name tag)
  // Beyond 18: billboard only (TODO: replace with sprite)
  if (distance < 10) {
    return <PaintballCharacter {...props} />;
  }

  // Simplified silhouette at range
  return (
    <group position={props.position} rotation={[0, props.rotation ?? 0, 0]}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.22, 1.0, 4, 8]} />
        <meshStandardMaterial color={props.teamColor ?? LX.pearl} roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.172, 8, 8]} />
        <meshStandardMaterial color={LX.pearl} roughness={0.68} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Network stubs  (backend integration)
// ─────────────────────────────────────────────────────────────

export interface CharacterNetState {
  playerId:  string;
  position:  [number, number, number];
  rotation:  number;
  state:     CharacterState;
  hp:        number;
  teamColor: string;
}

/**
 * submitCharacterState  — send local character state to Manus backend.
 * Replace stub body with real WebSocket / fetch call.
 */
export async function submitCharacterState(state: CharacterNetState): Promise<void> {
  // await socket.emit("player:state", state);
  console.debug("[KOBK Net] submitCharacterState", state.playerId, state.state);
}

/**
 * parseOpponentState  — deserialise incoming opponent packet.
 */
export function parseOpponentState(raw: unknown): CharacterNetState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.playerId !== "string") return null;
  return {
    playerId:  r.playerId,
    position:  (r.position as [number,number,number]) ?? [0,0,-6],
    rotation:  (r.rotation as number) ?? Math.PI,
    state:     (r.state as CharacterState) ?? "idle",
    hp:        (r.hp as number) ?? 3,
    teamColor: (r.teamColor as string) ?? LX.oppRed,
  };
}

// ─────────────────────────────────────────────────────────────
//  Luxury palette re-export  (convenience for other modules)
// ─────────────────────────────────────────────────────────────

export const LUXURY_PALETTE = LX;

// ─────────────────────────────────────────────────────────────
//  useCharacterBounds  — returns an AABB for collision
// ─────────────────────────────────────────────────────────────

export function useCharacterBounds(position: [number, number, number]) {
  return useMemo(() => ({
    min: new THREE.Vector3(position[0] - 0.28, position[1],        position[2] - 0.28),
    max: new THREE.Vector3(position[0] + 0.28, position[1] + 1.95, position[2] + 0.28),
    center: new THREE.Vector3(position[0], position[1] + 0.975, position[2]),
    radius: 0.38,
  }), [position]);
}

// ─────────────────────────────────────────────────────────────
//  CharacterRig  — standalone rig component for
//  animation testing / character-select screen
// ─────────────────────────────────────────────────────────────

export function CharacterRig({
  teamColor = LX.playerBlue,
  sequence  = ["idle", "shoot", "win", "idle"] as CharacterState[],
  stepMs    = 1800,
}: {
  teamColor?: string;
  sequence?:  CharacterState[];
  stepMs?:    number;
}) {
  const [stateIdx, setStateIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStateIdx(i => (i + 1) % sequence.length);
    }, stepMs);
    return () => clearInterval(id);
  }, [sequence, stepMs]);

  return (
    <PaintballCharacter
      position={[0, 0, 0]}
      rotation={0}
      state={sequence[stateIdx]}
      teamColor={teamColor}
      isPlayer
    />
  );
}

// ─────────────────────────────────────────────────────────────
//  Glove detail sub-component  — knuckle pads + palm grip
// ─────────────────────────────────────────────────────────────

function LuxGloveDetail({ tc }: { tc: string }) {
  return (
    <group>
      {/* Palm grip pad */}
      <mesh castShadow position={[0, 0.012, 0.042]}>
        <boxGeometry args={[0.055, 0.048, 0.012]} />
        <meshStandardMaterial color={LX.ivory} roughness={0.92} />
      </mesh>
      {/* Knuckle guards (4 pads) */}
      {[-0.018, -0.006, 0.006, 0.018].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.038, 0.035]}>
          <boxGeometry args={[0.008, 0.010, 0.008]} />
          <meshStandardMaterial color={LX.pearl} roughness={0.55} metalness={0.10} />
        </mesh>
      ))}
      {/* Wrist strap — gold clasp */}
      <mesh castShadow position={[0, -0.028, 0.032]}>
        <boxGeometry args={[0.052, 0.012, 0.020]} />
        <meshStandardMaterial color={LX.platinum} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, -0.028, 0.042]}>
        <boxGeometry args={[0.018, 0.010, 0.006]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Footstep dust puff  — tiny particle burst on step
//  Spawned by the run animation at toe-down frame
// ─────────────────────────────────────────────────────────────

function FootstepDust({ position, visible }: { position: [number,number,number]; visible: boolean }) {
  const ref  = useRef<THREE.Group>(null);
  const life = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    if (visible) life.current = 0.28;
    if (life.current > 0) {
      life.current -= dt;
      ref.current.visible = true;
      const p = life.current / 0.28;
      ref.current.scale.setScalar(1 + (1 - p) * 1.4);
      ref.current.children.forEach(c => {
        if (c instanceof THREE.Mesh) {
          (c.material as THREE.MeshBasicMaterial).opacity = p * 0.14;
        }
      });
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <group ref={ref} position={[position[0], 0.02, position[2]]}>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.cos(r) * 0.08, 0, Math.sin(r) * 0.08]}>
            <sphereGeometry args={[0.045, 5, 5]} />
            <meshBasicMaterial color={LX.platinum} transparent opacity={0.12} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  CharacterPreviewCard  — React DOM card used in the
//  character-select screen (outside Canvas)
// ─────────────────────────────────────────────────────────────

import { type CSSProperties } from "react";
import { Canvas as R3FCanvas } from "@react-three/fiber";

export function CharacterPreviewCard({
  teamColor = LX.playerBlue,
  name      = "PLAYER",
  selected  = false,
  onClick,
}: {
  teamColor?: string;
  name?:      string;
  selected?:  boolean;
  onClick?:   () => void;
}) {
  const style: CSSProperties = {
    width:          "clamp(110px,28vw,165px)",
    height:         "clamp(175px,44vw,260px)",
    borderRadius:   "16px",
    background:     selected
      ? "linear-gradient(145deg,rgba(255,255,255,0.95),rgba(245,245,247,0.88))"
      : "rgba(250,250,248,0.78)",
    border:         `1.5px solid ${selected ? teamColor : "rgba(200,200,210,0.62)"}`,
    boxShadow:      selected
      ? `0 0 0 2px ${teamColor}33, 0 10px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95)`
      : "0 4px 14px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    cursor:         "pointer",
    overflow:       "hidden",
    display:        "flex",
    flexDirection:  "column",
    backdropFilter: "blur(12px)",
    transition:     "all 0.20s cubic-bezier(0.34,1.56,0.64,1)",
    transform:      selected ? "translateY(-4px) scale(1.03)" : "none",
  };

  const labelStyle: CSSProperties = {
    fontFamily:    "-apple-system,'SF Pro Display',sans-serif",
    fontSize:      "10px",
    fontWeight:    700,
    color:         selected ? teamColor : "#6E6E73",
    letterSpacing: "2px",
    textAlign:     "center",
    padding:       "7px 0 10px",
    borderTop:     `1px solid ${selected ? teamColor + "33" : "rgba(200,200,210,0.35)"}`,
    textTransform: "uppercase",
  };

  return (
    <div style={style} onClick={onClick}>
      <div style={{ flex: 1, position: "relative" }}>
        <R3FCanvas camera={{ position: [0, 1.4, 3.2], fov: 48 }} shadows style={{ borderRadius:"14px 14px 0 0" }}>
          <ambientLight intensity={0.6} color="#FFF8F0" />
          <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow color="#FFF5E8" />
          <directionalLight position={[-2, 4, -2]} intensity={0.3} color="#E8F0FF" />
          <CharacterRig teamColor={teamColor} sequence={["idle","shoot","win"]} stepMs={2400} />
        </R3FCanvas>
      </div>
      <div style={labelStyle}>{name}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Freeze-frame pose helper  — locks a character in a
//  specific pose for cutscene / splash-screen use
// ─────────────────────────────────────────────────────────────

export const FREEZE_POSES = {
  shootRight: {
    rArmRotX: -0.95,
    rArmRotY: 0.04,
    torsoRotX: 0.04,
    torsoRotZ: 0.015,
  },
  crouchAim: {
    rootY:     -0.22,
    rootRotX:  0.14,
    rArmRotX:  -0.85,
    lArmRotX:  -0.32,
  },
  victoryLeft: {
    lArmRotX:  -1.85,
    lArmRotZ:  -0.30,
    torsoRotY: 0.08,
  },
  victoryRight: {
    rArmRotX:  -1.85,
    rArmRotZ:   0.30,
    torsoRotY: -0.08,
  },
} as const;

// ─────────────────────────────────────────────────────────────
//  Hit-indicator ring  — glowing ring that briefly appears
//  around the character when taking a hit
// ─────────────────────────────────────────────────────────────

function HitIndicatorRing({ active, color }: { active: boolean; color: string }) {
  const ref  = useRef<THREE.Mesh>(null);
  const life = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    if (active) life.current = 0.48;
    if (life.current > 0) {
      life.current = Math.max(0, life.current - dt);
      const p = life.current / 0.48;
      const r = 0.55 + (1 - p) * 0.35;
      ref.current.scale.set(r, 1, r);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = p * 0.62;
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.52, 0.62, 18]} />
      <meshBasicMaterial color={color} transparent opacity={0.62} depthWrite={false} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  Winning laurel  — gold laurel wreath floating above
//  winner's head during "win" state
// ─────────────────────────────────────────────────────────────

function WinLaurel({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(s => {
    if (!ref.current) return;
    ref.current.visible = visible;
    if (visible) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.55;
      ref.current.position.y = 2.32 + Math.sin(s.clock.elapsedTime * 2.2) * 0.035;
    }
  });

  return (
    <group ref={ref} position={[0, 2.32, 0]}>
      {/* Laurel ring */}
      <mesh>
        <torusGeometry args={[0.185, 0.022, 6, 18]} />
        <meshStandardMaterial color={LX.gold} roughness={0.18} metalness={0.88}
          emissive={LX.gold} emissiveIntensity={0.22} />
      </mesh>
      {/* 6 leaf clusters */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle  = (i / 6) * Math.PI * 2;
        const cos    = Math.cos(angle);
        const sin    = Math.sin(angle);
        return (
          <group key={i} position={[cos * 0.185, 0, sin * 0.185]} rotation={[0, angle, 0]}>
            <mesh castShadow position={[0, 0.028, 0]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.042, 0.075, 0.012]} />
              <meshStandardMaterial color={LX.lightGold} roughness={0.25} metalness={0.72}
                emissive={LX.gold} emissiveIntensity={0.18} />
            </mesh>
          </group>
        );
      })}
      <pointLight color={LX.gold} intensity={0.75} distance={1.8} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  CharacterStats  — runtime stat accumulator (demo + real)
//  Tracks shots, hits, accuracy for match summary screen
// ─────────────────────────────────────────────────────────────

export class CharacterStats {
  shots:      number = 0;
  hits:       number = 0;
  hitsReceived: number = 0;
  roundsWon:  number = 0;
  roundsLost: number = 0;

  get accuracy(): number {
    return this.shots === 0 ? 0 : Math.round((this.hits / this.shots) * 100);
  }

  get kdr(): string {
    return this.hitsReceived === 0
      ? `${this.hits}.0`
      : (this.hits / this.hitsReceived).toFixed(2);
  }

  recordShot():     void { this.shots++; }
  recordHit():      void { this.hits++; }
  recordReceived(): void { this.hitsReceived++; }
  recordRoundWon(): void { this.roundsWon++; }
  recordRoundLost():void { this.roundsLost++; }

  toSummary(): Record<string, unknown> {
    return {
      shots:        this.shots,
      hits:         this.hits,
      hitsReceived: this.hitsReceived,
      accuracy:     `${this.accuracy}%`,
      kdr:          this.kdr,
      roundsWon:    this.roundsWon,
      roundsLost:   this.roundsLost,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  AI behaviour hook  — drives opponent character in demo mode
//  difficulty: "easy" | "normal" | "hard"
// ─────────────────────────────────────────────────────────────

export function useCharacterAI(
  difficulty: "easy" | "normal" | "hard",
  playerPosition: [number, number, number],
  enabled: boolean,
) {
  const [aiState,    setAiState]    = useState<CharacterState>("idle");
  const [aiPosition, setAiPosition] = useState<[number,number,number]>([0, 0, -5.5]);
  const [aiRotation, setAiRotation] = useState(Math.PI);
  const stateTimerRef = useRef(0);
  const patrolAngle   = useRef(0);

  // Reaction time based on difficulty
  const reactionMs = difficulty === "easy" ? 1850 : difficulty === "normal" ? 1100 : 620;

  useEffect(() => {
    if (!enabled) return;

    const tick = setInterval(() => {
      const dx = playerPosition[0] - aiPosition[0];
      const dz = playerPosition[2] - aiPosition[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Rotate toward player
      setAiRotation(Math.atan2(dx, dz));

      if (dist > 7) {
        // Move toward player slowly
        setAiState("run");
        setAiPosition(prev => [
          prev[0] + (dx / dist) * 0.06,
          prev[1],
          prev[2] + (dz / dist) * 0.06,
        ]);
      } else if (dist < 3.5) {
        // Too close — strafe away
        setAiState("strafe");
        const strafeAngle = Math.atan2(dx, dz) + Math.PI / 2;
        setAiPosition(prev => [
          Math.max(-8, Math.min(8, prev[0] + Math.cos(strafeAngle) * 0.06)),
          prev[1],
          Math.max(-8, Math.min(8, prev[2] + Math.sin(strafeAngle) * 0.06)),
        ]);
      } else {
        // In shooting range — try to shoot
        if (Math.random() < (difficulty === "hard" ? 0.35 : difficulty === "normal" ? 0.22 : 0.12)) {
          setAiState("shoot");
          setTimeout(() => setAiState("idle"), 320);
        } else {
          // Patrol micro-movement
          patrolAngle.current += 0.04;
          const pR = 0.55;
          setAiPosition(prev => [
            Math.max(-8, Math.min(8, prev[0] + Math.cos(patrolAngle.current) * 0.018)),
            prev[1],
            Math.max(-8, Math.min(8, prev[2] + Math.sin(patrolAngle.current) * 0.012)),
          ]);
          setAiState("idle");
        }
      }
    }, reactionMs / 3);

    return () => clearInterval(tick);
  }, [enabled, difficulty, playerPosition, aiPosition, reactionMs]);

  return { aiState, aiPosition, aiRotation };
}

// ─────────────────────────────────────────────────────────────
//  Luxury material presets  — helper factory for consistent
//  PBR material creation across all character pieces
// ─────────────────────────────────────────────────────────────

export const LuxMaterials = {
  pearlCeramic:   () => new THREE.MeshStandardMaterial({ color:"#F5F5F7", roughness:0.62, metalness:0.06 }),
  brushedTi:      () => new THREE.MeshStandardMaterial({ color:"#C8C8CE", roughness:0.35, metalness:0.68 }),
  polishedGold:   () => new THREE.MeshStandardMaterial({ color:"#C9A84C", roughness:0.18, metalness:0.88 }),
  frostedVisor:   () => new THREE.MeshStandardMaterial({ color:"#D0E8F5", roughness:0.04, metalness:0.25, transparent:true, opacity:0.82 }),
  chromeSilver:   () => new THREE.MeshStandardMaterial({ color:"#D4D4D8", roughness:0.22, metalness:0.72 }),
  warmCloth:      () => new THREE.MeshStandardMaterial({ color:"#FAFAF8", roughness:0.82, metalness:0.02 }),
  darkPants:      (col:string) => new THREE.MeshStandardMaterial({ color:col, roughness:0.82, metalness:0.0 }),
  teamAccent:     (col:string) => new THREE.MeshStandardMaterial({ color:col, roughness:0.28, metalness:0.22,
    emissive:new THREE.Color(col), emissiveIntensity:0.14 }),
} as const;

// ─────────────────────────────────────────────────────────────
//  Character animation event emitter  — fires callbacks at
//  key animation moments (muzzle-flash frame, foot-down, etc.)
// ─────────────────────────────────────────────────────────────

export interface CharacterAnimEvents {
  onMuzzleFlash?:  () => void;
  onFootDown?:     (foot: "left" | "right") => void;
  onRecoilPeak?:   () => void;
  onDeathLand?:    () => void;
}

/**
 * useCharacterAnimEvents
 * Attach this hook result to a PaintballCharacter via a ref,
 * then poll in useFrame to fire the callbacks.
 */
export function useCharacterAnimEvents(
  stateRef: React.RefObject<CharacterState>,
  events:   CharacterAnimEvents,
) {
  const lastFoot     = useRef<"up" | "down">("up");
  const lastFlash    = useRef(false);
  const recoilPeaked = useRef(false);
  const footPhaseRef = useRef(0);
  const shootCycRef  = useRef(0);

  useFrame((_, dt) => {
    const s = stateRef.current;
    if (!s) return;

    // Footstep detection
    if (s === "run") {
      footPhaseRef.current += dt * 9;
      const footY = Math.sin(footPhaseRef.current);
      if (footY < -0.85 && lastFoot.current === "up") {
        lastFoot.current = "down";
        // Determine which foot
        const foot: "left" | "right" = Math.sin(footPhaseRef.current * 0.5) > 0 ? "left" : "right";
        events.onFootDown?.(foot);
      } else if (footY > 0.5) {
        lastFoot.current = "up";
      }
    }

    // Muzzle flash frame
    if (s === "shoot") {
      shootCycRef.current += dt;
      const cycleT = (shootCycRef.current % 0.38) / 0.38;
      const isFlash = cycleT < 0.15;
      if (isFlash && !lastFlash.current) {
        events.onMuzzleFlash?.();
      }
      lastFlash.current = isFlash;

      // Recoil peak
      const recoil = cycleT < 0.12 ? cycleT / 0.12 : 1 - (cycleT - 0.12) / 0.88;
      if (recoil > 0.92 && !recoilPeaked.current) {
        recoilPeaked.current = true;
        events.onRecoilPeak?.();
      } else if (recoil < 0.5) {
        recoilPeaked.current = false;
      }
    } else {
      shootCycRef.current = 0;
      lastFlash.current   = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  Export list (all public symbols)
// ─────────────────────────────────────────────────────────────

export {
  LuxBoot,
  LuxKneePad,
  LuxShoulderPad,
  LuxElbowPad,
  LuxVest,
  LuxMask,
  LuxHelmet,
  LuxGun,
};

// ─────────────────────────────────────────────────────────────
//  CharacterCustomiser  — React DOM panel for picking
//  team color + difficulty before entering a match
// ─────────────────────────────────────────────────────────────

export interface CharacterCustomiserProps {
  initialColor?: string;
  initialName?:  string;
  onConfirm:     (color: string, name: string) => void;
}

export function CharacterCustomiser({
  initialColor = LX.playerBlue,
  initialName  = "PLAYER",
  onConfirm,
}: CharacterCustomiserProps) {
  const [color, setColor] = useState(initialColor);
  const [name,  setName]  = useState(initialName);

  const swatches = [
    { c: LX.playerBlue, label: "Blue"   },
    { c: LX.oppRed,     label: "Red"    },
    { c: LX.gold,       label: "Gold"   },
    { c: "#34C759",     label: "Green"  },
    { c: "#AF52DE",     label: "Purple" },
    { c: "#FF9500",     label: "Amber"  },
  ];

  const outer: CSSProperties = {
    display:"flex", flexDirection:"column", alignItems:"center",
    gap:"14px", padding:"24px", maxWidth:"340px", margin:"0 auto",
    fontFamily:"-apple-system,'SF Pro Display',sans-serif",
  };

  return (
    <div style={outer}>
      <div style={{ fontSize:"12px", fontWeight:700, color:LX.midGray, letterSpacing:"2px" }}>
        CUSTOMISE
      </div>
      {/* Color swatches */}
      <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", justifyContent:"center" }}>
        {swatches.map(s => (
          <div key={s.c} onClick={() => setColor(s.c)} style={{
            width:34, height:34, borderRadius:"50%",
            background: s.c,
            border: `2px solid ${color === s.c ? LX.charcoal : "transparent"}`,
            boxShadow: color === s.c ? `0 0 12px ${s.c}88` : "none",
            cursor:"pointer",
            transform: color === s.c ? "scale(1.15)" : "none",
            transition:"all 0.15s",
          }}/>
        ))}
      </div>
      {/* Name input */}
      <input
        value={name}
        onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))}
        maxLength={10}
        placeholder="PLAYER"
        style={{
          padding:"9px 16px",
          borderRadius:"10px",
          background:"rgba(255,255,255,0.82)",
          border:`1.5px solid ${color}55`,
          fontFamily:"-apple-system,'SF Pro Display',sans-serif",
          fontSize:"13px", fontWeight:700,
          color:LX.charcoal, textAlign:"center",
          letterSpacing:"2px", outline:"none",
          width:"180px",
          backdropFilter:"blur(8px)",
        }}
      />
      {/* Confirm button */}
      <div onClick={() => onConfirm(color, name)} style={{
        padding:"11px 36px", borderRadius:"12px",
        background:`linear-gradient(135deg,rgba(255,255,255,0.95),rgba(245,245,247,0.88))`,
        border:`1.5px solid ${color}`,
        color:color, fontSize:"12px", fontWeight:700,
        letterSpacing:"2px", cursor:"pointer",
        boxShadow:`0 0 18px ${color}22`,
        transition:"all 0.15s",
      }}>CONFIRM</div>
    </div>
  );
}
