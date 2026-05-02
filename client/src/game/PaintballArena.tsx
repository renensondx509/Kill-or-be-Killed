/**
 * ============================================================
 *  PaintballArena.tsx  —  Kill or Be Killed  ·  Luxury
 * ============================================================
 *  Aesthetic: iPhone Pro White Arena
 *   • Ivory-marble ground with subtle veining
 *   • Matte pearl-ceramic tire stacks with gold hubs
 *   • Brushed-titanium barriers with champagne-gold rivets
 *   • White inflatable bunkers with gold seam rings
 *   • Frosted-glass observation towers
 *   • Soft studio lighting (no harsh shadows)
 *   • White birch trees (clean minimal)
 *   • Pearl fence with brushed-steel rails
 *   • Gold-numbered position signage
 *   • Subtle warm arena glow (point lights)
 *   • Ground paint splats in soft tones (not neon)
 * ============================================================
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
//  Luxury palette
// ─────────────────────────────────────────────────────────────

const A = {
  // Ground
  marble:      "#F0EDE6",
  marbleVein:  "#DDD8CE",
  marbleDark:  "#C8C2B8",
  groundDirt:  "#D4CABC",
  // White structures
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
  // Darks (minimal)
  charcoal:    "#1D1D1F",
  midGray:     "#6E6E73",
  // Team accents
  playerBlue:  "#007AFF",
  oppRed:      "#FF3B30",
  // Foliage — desaturated
  birchBark:   "#F5F0E8",
  birchDark:   "#DDD5C5",
  leaf:        "#C8D5A8",
  leafDark:    "#B8C898",
  leafLight:   "#D8E5B8",
} as const;

// ─────────────────────────────────────────────────────────────
//  Marble ground
// ─────────────────────────────────────────────────────────────

function MarbleGround() {
  return (
    <group>
      {/* Base plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[42, 42, 14, 14]} />
        <meshStandardMaterial color={A.marble} roughness={0.58} metalness={0.04} />
      </mesh>
      {/* Marble vein overlay panels (2×2 tile pattern) */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => {
          const x = -10 + col * 4;
          const z = -10 + row * 4;
          return (
            <mesh key={`${row}-${col}`} rotation={[-Math.PI / 2, 0, (row + col) * 0.38]}
              receiveShadow position={[x, 0.002, z]}>
              <planeGeometry args={[3.8, 3.8]} />
              <meshStandardMaterial color={A.marbleVein} roughness={0.65} metalness={0.03}
                transparent opacity={0.18} depthWrite={false} />
            </mesh>
          );
        })
      )}
      {/* Center field dark-vein accent cross */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[42, 0.08]} />
        <meshStandardMaterial color={A.marbleDark} roughness={0.7} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.003, 0]}>
        <planeGeometry args={[42, 0.08]} />
        <meshStandardMaterial color={A.marbleDark} roughness={0.7} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Subtle grid squares */}
      {[-14, -7, 0, 7, 14].map(x => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, 0]}>
          <planeGeometry args={[0.04, 42]} />
          <meshStandardMaterial color={A.marbleDark} roughness={0.8} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
      {[-14, -7, 0, 7, 14].map(z => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.002, z]}>
          <planeGeometry args={[0.04, 42]} />
          <meshStandardMaterial color={A.marbleDark} roughness={0.8} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Paint splat ground decal (soft pastels, not neon)
// ─────────────────────────────────────────────────────────────

function LuxGroundSplat({
  position, color, size = 0.7, rotation = 0,
}: {
  position: [number, number, number];
  color:    string;
  size:     number;
  rotation?: number;
}) {
  return (
    <group position={[position[0], 0.005, position[2]]} rotation={[-Math.PI / 2, rotation, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[size, 12]} />
        <meshStandardMaterial color={color} roughness={0.95} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {[0, 55, 110, 165, 220, 275, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const len = size * (0.38 + (i % 3) * 0.18);
        return (
          <mesh key={i}
            position={[Math.cos(rad) * size * 0.65, Math.sin(rad) * size * 0.65, 0]}
            rotation={[0, 0, rad + Math.PI / 2]}>
            <capsuleGeometry args={[size * 0.055, len, 3, 5]} />
            <meshStandardMaterial color={color} roughness={0.95} transparent opacity={0.38} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Luxury Tire Stack  — pearl ceramic + gold hardware
// ─────────────────────────────────────────────────────────────

function LuxTireStack({
  position, number, accentColor = A.playerBlue,
}: {
  position:     [number, number, number];
  number:       number;
  accentColor?: string;
}) {
  const heights = [0, 0.52, 1.04];
  return (
    <group position={position}>
      {heights.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          {/* Main tyre ring — pearl ceramic */}
          <mesh castShadow receiveShadow>
            <torusGeometry args={[0.42, 0.215, 10, 22]} />
            <meshStandardMaterial color={A.pearl} roughness={0.62} metalness={0.08} />
          </mesh>
          {/* Tread pattern — platinum strips */}
          {Array.from({ length: 14 }).map((_, t) => {
            const angle = (t / 14) * Math.PI * 2;
            return (
              <mesh key={t} castShadow
                position={[Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.62]}
                rotation={[0, angle, 0]}>
                <boxGeometry args={[0.055, 0.218, 0.055]} />
                <meshStandardMaterial color={A.platinum} roughness={0.72} metalness={0.08} />
              </mesh>
            );
          })}
          {/* Brushed-steel inner rim */}
          <mesh castShadow>
            <torusGeometry args={[0.225, 0.052, 6, 18]} />
            <meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.62} />
          </mesh>
          {/* Gold hub center */}
          <mesh castShadow>
            <cylinderGeometry args={[0.088, 0.088, 0.225, 8]} />
            <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.88} />
          </mesh>
          {/* Chrome lug bolt holes */}
          {[0, 72, 144, 216, 288].map(deg => {
            const r = (deg * Math.PI) / 180;
            return (
              <mesh key={deg} position={[Math.cos(r) * 0.14, 0, Math.sin(r) * 0.14]}>
                <cylinderGeometry args={[0.017, 0.017, 0.23, 6]} />
                <meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72} />
              </mesh>
            );
          })}
          {/* Side-wall pearl disc */}
          {[-1, 1].map(s => (
            <mesh key={s} position={[0, s * 0.112, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.225, 0.62, 22]} />
              <meshStandardMaterial color={A.warmWhite} roughness={0.75} metalness={0.06}
                side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Position number sign — gold on charcoal */}
      <group position={[0, 1.72, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.285, 0.265, 0.038]} />
          <meshStandardMaterial color={A.charcoal} roughness={0.55} metalness={0.12} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.02]}>
          <boxGeometry args={[0.265, 0.245, 0.004]} />
          <meshStandardMaterial color={accentColor} roughness={0.28} metalness={0.25}
            emissive={accentColor} emissiveIntensity={0.10} />
        </mesh>
        {/* Post */}
        <mesh castShadow position={[0, -0.205, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.24, 6]} />
          <meshStandardMaterial color={A.steel} roughness={0.40} metalness={0.55} />
        </mesh>
        <pointLight color={accentColor} intensity={0.35} distance={1.4} decay={2} />
      </group>

      {/* Ground shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.58, 12]} />
        <meshStandardMaterial color={A.marbleDark} roughness={1} transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Inflatable bunker — pearl white with gold seams
// ─────────────────────────────────────────────────────────────

function LuxInflatable({
  position, rotation = 0, scale = [1, 1, 1] as [number, number, number], variant = "pod",
}: {
  position:  [number, number, number];
  rotation?: number;
  scale?:    [number, number, number];
  variant?:  "pod" | "can" | "snake";
}) {
  if (variant === "can") {
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        <mesh castShadow receiveShadow scale={scale}>
          <cylinderGeometry args={[0.6, 0.6, 1.8, 14]} />
          <meshStandardMaterial color={A.white} roughness={0.58} metalness={0.08} />
        </mesh>
        {[0.5, 0, -0.5].map((y, i) => (
          <mesh key={i} castShadow position={[0, y, 0]}>
            <torusGeometry args={[0.62, 0.022, 6, 18]} />
            <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 0.912, 0]}>
          <sphereGeometry args={[0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color={A.white} roughness={0.55} metalness={0.06} />
        </mesh>
        <mesh castShadow position={[0.62, 0.2, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.095, 8]} />
          <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
        </mesh>
      </group>
    );
  }

  if (variant === "snake") {
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        <mesh castShadow receiveShadow scale={[scale[0] * 2.5, scale[1] * 0.8, scale[2]]}>
          <capsuleGeometry args={[0.4, 1.8, 8, 16]} />
          <meshStandardMaterial color={A.white} roughness={0.60} metalness={0.06} />
        </mesh>
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <mesh key={i} castShadow position={[x * scale[0], 0, 0]}>
            <torusGeometry args={[0.33, 0.016, 6, 12]} />
            <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }

  // pod (default)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow scale={scale}>
        <capsuleGeometry args={[0.5, 1.2, 10, 18]} />
        <meshStandardMaterial color={A.white} roughness={0.58} metalness={0.06} />
      </mesh>
      {/* Gold seam ring */}
      <mesh castShadow position={[0, 0, 0.52]} scale={scale}>
        <torusGeometry args={[0.5, 0.030, 6, 20]} />
        <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
      </mesh>
      {/* Vertical top seam */}
      <mesh castShadow position={[0, 0.62 * scale[1], 0]} scale={scale}>
        <torusGeometry args={[0.5, 0.022, 5, 16, Math.PI]} />
        <meshStandardMaterial color={A.lightGold} roughness={0.25} metalness={0.82} />
      </mesh>
      {/* Chrome air valve */}
      <mesh castShadow position={[0, 0.58 * scale[1], 0.53 * scale[2]]}>
        <cylinderGeometry args={[0.026, 0.026, 0.058, 6]} />
        <meshStandardMaterial color={A.chrome} roughness={0.22} metalness={0.72} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Wooden barrier  →  Luxury titanium barrier
// ─────────────────────────────────────────────────────────────

function LuxBarrier({
  position, rotation = 0, width = 2.5,
}: {
  position:  [number, number, number];
  rotation?: number;
  width?:    number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Lower panel — brushed titanium */}
      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[width, 0.175, 0.138]} />
        <meshStandardMaterial color={A.platinum} roughness={0.45} metalness={0.42} />
      </mesh>
      {/* Upper panel */}
      <mesh castShadow receiveShadow position={[0, 0.62, 0]}>
        <boxGeometry args={[width, 0.175, 0.138]} />
        <meshStandardMaterial color={A.platinum} roughness={0.42} metalness={0.44} />
      </mesh>
      {/* Pearl top rail */}
      <mesh castShadow receiveShadow position={[0, 0.88, 0]}>
        <boxGeometry args={[width, 0.135, 0.155]} />
        <meshStandardMaterial color={A.pearl} roughness={0.55} metalness={0.12} />
      </mesh>
      {/* Gold top-rail edge */}
      <mesh castShadow position={[0, 0.955, 0]}>
        <boxGeometry args={[width + 0.01, 0.012, 0.158]} />
        <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
      </mesh>
      {/* Support posts — chrome */}
      {Array.from({ length: Math.ceil(width / 0.85) + 1 }).map((_, i) => {
        const px = -width / 2 + i * (width / Math.ceil(width / 0.85));
        return (
          <group key={i} position={[px, 0, 0]}>
            <mesh castShadow position={[0, 0.5, -0.075]}>
              <boxGeometry args={[0.095, 1.02, 0.095]} />
              <meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.68} />
            </mesh>
            {/* Gold bolt heads */}
            {[0.32, 0.62].map(ny => (
              <mesh key={ny} castShadow position={[0, ny, 0.075]}>
                <cylinderGeometry args={[0.011, 0.011, 0.018, 6]} />
                <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Panel groove lines */}
      {[-0.28, 0.28].map((y, i) => (
        <mesh key={i} position={[0, 0.62 + y * 0.2, 0.072]}>
          <boxGeometry args={[width - 0.04, 0.007, 0.001]} />
          <meshStandardMaterial color={A.steel} roughness={0.55} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sandbag wall  →  Luxury pearl-linen sandbags
// ─────────────────────────────────────────────────────────────

function LuxSandbags({
  position, rotation = 0, rows = 2, cols = 3,
}: {
  position:  [number, number, number];
  rotation?: number;
  rows?:     number;
  cols?:     number;
}) {
  const bagColors = [A.ivory, A.warmWhite, A.pearl];
  const bagW = 0.52;
  const bagH = 0.28;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols - (row % 2 === 1 ? 1 : 0) }).map((_, col) => {
          const offsetX =
            row % 2 === 1
              ? -((cols - 1) * bagW) / 2 + bagW / 2 + col * bagW
              : -((cols - 1) * bagW) / 2 + col * bagW;
          const cIdx = (row * cols + col) % 3;
          return (
            <group key={`${row}-${col}`}
              position={[offsetX, row * (bagH - 0.01) + bagH / 2, 0]}
              rotation={[0, (row * 0.08 + col * 0.05) * (col % 2 === 0 ? 1 : -1), 0]}>
              <mesh castShadow receiveShadow>
                <capsuleGeometry args={[0.115, 0.28, 5, 10]} />
                <meshStandardMaterial color={bagColors[cIdx]} roughness={0.88} />
              </mesh>
              {/* Gold tie knot */}
              <mesh castShadow position={[0, 0.22, 0]}>
                <sphereGeometry args={[0.032, 6, 6]} />
                <meshStandardMaterial color={A.gold} roughness={0.30} metalness={0.72} />
              </mesh>
              {/* Linen weave lines */}
              {[-0.10, -0.04, 0.02, 0.08].map((y, i) => (
                <mesh key={i} position={[0, y, 0.116]}>
                  <boxGeometry args={[0.21, 0.010, 0.003]} />
                  <meshStandardMaterial color={A.platinum} roughness={0.95}
                    transparent opacity={0.42} depthWrite={false} />
                </mesh>
              ))}
            </group>
          );
        })
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  White Birch Tree  (minimal, luxe)
// ─────────────────────────────────────────────────────────────

function BirchTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* White bark trunk */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 2.1, 8]} />
        <meshStandardMaterial color={A.birchBark} roughness={0.82} metalness={0.0} />
      </mesh>
      {/* Bark detail rings */}
      {[0.4, 0.9, 1.4, 1.9].map((y, i) => (
        <mesh key={i} castShadow position={[0, y, 0]}>
          <torusGeometry args={[0.155, 0.01, 4, 12]} />
          <meshStandardMaterial color={A.birchDark} roughness={0.88} />
        </mesh>
      ))}
      {/* Foliage tiers — desaturated sage */}
      {[
        { y: 2.4, r: 1.1, h: 1.7, c: A.leaf },
        { y: 3.4, r: 0.88, h: 1.45, c: A.leafLight },
        { y: 4.2, r: 0.65, h: 1.15, c: A.leaf },
        { y: 4.9, r: 0.42, h: 0.9,  c: A.leafDark },
      ].map((tier, i) => (
        <mesh key={i} castShadow position={[0, tier.y, 0]}>
          <coneGeometry args={[tier.r, tier.h, 9]} />
          <meshStandardMaterial color={tier.c} roughness={0.85} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Animated flag  (white silk with gold finial)
// ─────────────────────────────────────────────────────────────

function LuxFlag({
  position, flagColor = A.playerBlue, poleColor = A.chrome,
}: {
  position:   [number, number, number];
  flagColor?: string;
  poleColor?: string;
}) {
  const flagRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(0.7, 0.38, 12, 6), []);

  useFrame(state => {
    if (!flagRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = flagRef.current.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const wave =
        Math.sin(x * 3.5 + t * 4.2) * (x + 0.35) * 0.042 +
        Math.sin(x * 2.0 + t * 2.8 + 1.2) * (x + 0.35) * 0.018;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    flagRef.current.geometry.computeVertexNormals();
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh castShadow>
        <cylinderGeometry args={[0.026, 0.030, 4.0, 8]} />
        <meshStandardMaterial color={poleColor} roughness={0.32} metalness={0.68} />
      </mesh>
      {/* Gold finial */}
      <mesh castShadow position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.052, 8, 8]} />
        <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90} />
      </mesh>
      {/* Flag silk */}
      <mesh ref={flagRef} position={[0.36, 1.7, 0]} geometry={geometry}>
        <meshStandardMaterial color={flagColor} roughness={0.68} side={THREE.DoubleSide} />
      </mesh>
      {/* Halyard */}
      <mesh castShadow position={[0.01, 0.8, 0]} rotation={[0.08, 0, 0.04]}>
        <cylinderGeometry args={[0.004, 0.004, 3.2, 4]} />
        <meshStandardMaterial color={A.platinum} roughness={0.55} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Luxury perimeter fence — pearl posts, chrome rails
// ─────────────────────────────────────────────────────────────

function LuxFence() {
  const spacing = 2.8;
  const count   = 7;
  const half    = (count * spacing) / 2;

  const sides: Array<{ axis: "z" | "x"; val: number; crossAxis: "x" | "z" }> = [
    { axis: "z", val: -half, crossAxis: "x" },
    { axis: "z", val:  half, crossAxis: "x" },
    { axis: "x", val: -half, crossAxis: "z" },
    { axis: "x", val:  half, crossAxis: "z" },
  ];

  return (
    <group>
      {sides.map(({ axis, val, crossAxis }) => (
        <group key={`${axis}${val}`}>
          {/* Posts */}
          {Array.from({ length: count + 1 }).map((_, i) => {
            const p = -half + i * spacing;
            const pos: [number, number, number] =
              axis === "z" ? [p, 0, val] : [val, 0, p];
            return (
              <group key={i} position={pos}>
                <mesh castShadow>
                  <boxGeometry args={[0.095, 1.68, 0.095]} />
                  <meshStandardMaterial color={A.pearl} roughness={0.60} metalness={0.10} />
                </mesh>
                {/* Gold post cap */}
                <mesh castShadow position={[0, 0.88, 0]}>
                  <sphereGeometry args={[0.062, 6, 6]} />
                  <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90} />
                </mesh>
              </group>
            );
          })}
          {/* Horizontal rails — chrome */}
          {[0.45, 0.90, 1.35].map(y => {
            const railPos: [number, number, number] =
              axis === "z" ? [0, y, val] : [val, y, 0];
            const railArgs: [number, number, number] =
              axis === "z" ? [count * spacing, 0.048, 0.048] : [0.048, 0.048, count * spacing];
            return (
              <mesh key={y} castShadow position={railPos}>
                <boxGeometry args={railArgs} />
                <meshStandardMaterial color={A.chrome} roughness={0.32} metalness={0.68} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Frosted-glass observation tower
// ─────────────────────────────────────────────────────────────

function LuxTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pearl legs */}
      {[[-0.4,-0.4],[0.4,-0.4],[-0.4,0.4],[0.4,0.4]].map(([x,z],i)=>(
        <mesh key={i} castShadow position={[x,1.2,z]}>
          <boxGeometry args={[0.092,2.5,0.092]}/>
          <meshStandardMaterial color={A.pearl} roughness={0.58} metalness={0.10}/>
        </mesh>
      ))}
      {/* Titanium cross braces */}
      {[0.5,1.5].map((y,i)=>(
        <mesh key={i} castShadow position={[0,y,0]} rotation={[0,0.785,0]}>
          <boxGeometry args={[1.08,0.055,0.055]}/>
          <meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.60}/>
        </mesh>
      ))}
      {/* Platform — marble */}
      <mesh castShadow position={[0,2.5,0]}>
        <boxGeometry args={[1.08,0.095,1.08]}/>
        <meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04}/>
      </mesh>
      {/* Frosted glass railing panels */}
      {[[0,0,0.52],[0,0,-0.52],[0.52,0,0],[-0.52,0,0]].map(([rx,ry,rz],i)=>(
        <mesh key={i} castShadow position={[rx,2.88,rz]}>
          <boxGeometry args={[rz===0?0.042:1.06, 0.72, rx===0?1.06:0.042]}/>
          <meshStandardMaterial color="#E8F4FF" roughness={0.06} metalness={0.18}
            transparent opacity={0.55}/>
        </mesh>
      ))}
      {/* Gold railing top cap */}
      <mesh castShadow position={[0,3.26,0]}>
        <boxGeometry args={[1.12,0.016,1.12]}/>
        <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85}/>
      </mesh>
      {/* Chrome ladder rungs */}
      {Array.from({length:5}).map((_,i)=>(
        <mesh key={i} castShadow position={[0.52,0.35+i*0.42,-0.44]}>
          <boxGeometry args={[0.28,0.038,0.038]}/>
          <meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.68}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Luxury spectator stand
// ─────────────────────────────────────────────────────────────

function LuxStand({
  position, rotation = 0, rows = 3,
}: {
  position:  [number, number, number];
  rotation?: number;
  rows?:     number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: rows }).map((_, row) => (
        <group key={row} position={[0, row * 0.55, -row * 0.45]}>
          {/* Marble tier */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6, 0.13, 0.82]} />
            <meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04} />
          </mesh>
          {/* Gold tier edge */}
          <mesh castShadow position={[0, 0.075, 0.41]}>
            <boxGeometry args={[6.02, 0.015, 0.015]} />
            <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
          </mesh>
          {/* Pearl seats */}
          {Array.from({ length: 8 }).map((_, seat) => (
            <group key={seat} position={[-2.6 + seat * 0.75, 0.16, 0.1]}>
              <mesh castShadow>
                <boxGeometry args={[0.54, 0.095, 0.46]} />
                <meshStandardMaterial color={A.warmWhite} roughness={0.72} metalness={0.04} />
              </mesh>
              <mesh castShadow position={[0, 0.25, -0.18]}>
                <boxGeometry args={[0.54, 0.40, 0.076]} />
                <meshStandardMaterial color={A.pearl} roughness={0.68} metalness={0.04} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Support pillars — pearl marble */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.78, -0.48]}>
          <boxGeometry args={[0.195, 1.6, 0.195]} />
          <meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Studio flood-light rig (soft, warm-white)
// ─────────────────────────────────────────────────────────────

function StudioLight({
  position, targetX = 0, targetZ = 0,
}: {
  position:  [number, number, number];
  targetX?:  number;
  targetZ?:  number;
}) {
  const dx  = targetX - position[0];
  const dz  = targetZ - position[2];
  const rotY = Math.atan2(dx, dz);
  const dist = Math.sqrt(dx * dx + dz * dz);
  const rotX = -Math.atan2(position[1], dist);

  return (
    <group position={position}>
      {/* Pole */}
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.075, position[1], 6]} />
        <meshStandardMaterial color={A.steel} roughness={0.40} metalness={0.60} />
      </mesh>
      <group rotation={[rotX, rotY, 0]}>
        {/* Housing */}
        <mesh castShadow position={[0, 0, 0.16]}>
          <boxGeometry args={[0.38, 0.16, 0.34]} />
          <meshStandardMaterial color={A.darkSteel} roughness={0.38} metalness={0.52} />
        </mesh>
        {/* Lens */}
        <mesh castShadow position={[0, 0, 0.35]}>
          <boxGeometry args={[0.32, 0.13, 0.038]} />
          <meshStandardMaterial color="#FFF8E8" emissive="#FFF8E8" emissiveIntensity={0.65}
            roughness={0.05} metalness={0.08} />
        </mesh>
        <pointLight color="#FFF5E0" intensity={1.4} distance={30} decay={1.8} castShadow />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Arena banner
// ─────────────────────────────────────────────────────────────

function LuxBanner({
  position, rotation = 0, accentColor = A.gold,
}: {
  position:    [number, number, number];
  rotation?:   number;
  accentColor?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* White backing */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[2.0, 0.62, 0.038]} />
        <meshStandardMaterial color={A.white} roughness={0.65} metalness={0.04} />
      </mesh>
      {/* Gold border */}
      <mesh castShadow position={[0, 1.2, 0.02]}>
        <boxGeometry args={[1.96, 0.58, 0.005]} />
        <meshStandardMaterial color={accentColor} roughness={0.22} metalness={0.82}
          emissive={accentColor} emissiveIntensity={0.08} />
      </mesh>
      {/* Pearl content strip */}
      <mesh castShadow position={[0, 1.2, 0.026]}>
        <boxGeometry args={[1.82, 0.38, 0.004]} />
        <meshStandardMaterial color={A.pearl} roughness={0.68} />
      </mesh>
      {/* Gold grommet mounts */}
      {[-0.84, 0, 0.84].map((x, i) => (
        <mesh key={i} castShadow position={[x, 1.52, 0.022]}>
          <cylinderGeometry args={[0.024, 0.024, 0.038, 6]} />
          <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────

export default function PaintballArena() {
  return (
    <group>
      {/* ══ STUDIO LIGHTING — warm, soft, diffuse ═══════ */}

      {/* Ambient sky light */}
      <ambientLight intensity={0.55} color="#FFF8F0" />

      {/* Key light (soft directional, minimal shadow harshness) */}
      <directionalLight castShadow position={[10, 18, 8]} intensity={1.2} color="#FFF5E8"
        shadow-mapSize={[2048, 2048]} shadow-camera-far={70}
        shadow-camera-left={-22} shadow-camera-right={22}
        shadow-camera-top={22} shadow-camera-bottom={-22}
        shadow-bias={-0.0008} />

      {/* Fill light (cool-white bounce) */}
      <directionalLight position={[-8, 10, -6]} intensity={0.38} color="#E8F0FF" />

      {/* Ground bounce (warm) */}
      <hemisphereLight args={["#FFF0E0", "#F0EDE6", 0.38]} />

      {/* Studio flood rigs at four corners */}
      <StudioLight position={[-9, 8, -9]} targetX={0} targetZ={0} />
      <StudioLight position={[ 9, 8, -9]} targetX={0} targetZ={0} />
      <StudioLight position={[-9, 8,  9]} targetX={0} targetZ={0} />
      <StudioLight position={[ 9, 8,  9]} targetX={0} targetZ={0} />

      {/* Warm center accent */}
      <pointLight position={[0, 4, 0]} color="#FFD070" intensity={0.28} distance={14} decay={2} />

      {/* ══ GROUND ══════════════════════════════════════ */}
      <MarbleGround />

      {/* Ground paint splats — soft pastel tones */}
      <LuxGroundSplat position={[1.5,0,-4.5]}  color="#A8D4F0" size={0.52} rotation={0.3} />
      <LuxGroundSplat position={[-2.2,0,3.8]}  color="#F0A8A8" size={0.68} rotation={1.1} />
      <LuxGroundSplat position={[0.5,0,0.8]}   color="#A8D4F0" size={0.42} rotation={2.4} />
      <LuxGroundSplat position={[-1.0,0,-1.5]} color="#F0A8A8" size={0.35} rotation={0.8} />
      <LuxGroundSplat position={[3.2,0,1.2]}   color="#A8D4F0" size={0.58} rotation={-0.5} />
      <LuxGroundSplat position={[-3.5,0,-2.0]} color="#F0D8A8" size={0.48} rotation={1.8} />
      <LuxGroundSplat position={[2.0,0,5.5]}   color="#A8D4F0" size={0.40} rotation={-1.2} />
      <LuxGroundSplat position={[-1.8,0,-6.0]} color="#F0A8A8" size={0.55} rotation={0.6} />
      <LuxGroundSplat position={[0,0,2.5]}     color="#D4F0A8" size={0.32} rotation={1.6} />

      {/* ══ PLAYER-1 SIDE (neg Z) — blue accent ════════ */}

      <LuxTireStack position={[-4.2, 0, -5.8]} number={1} accentColor={A.playerBlue} />
      <LuxTireStack position={[ 0.0, 0, -6.2]} number={2} accentColor={A.playerBlue} />
      <LuxTireStack position={[ 4.2, 0, -5.8]} number={3} accentColor={A.playerBlue} />

      <LuxBarrier position={[-2.2, 0, -4.8]} rotation={0.2}        width={2.2} />
      <LuxBarrier position={[ 2.2, 0, -4.8]} rotation={-0.2}       width={2.2} />
      <LuxSandbags position={[-5.5, 0, -3.5]} rotation={0.4}  rows={2} cols={4} />
      <LuxSandbags position={[ 5.5, 0, -3.5]} rotation={-0.4} rows={2} cols={4} />
      <LuxInflatable position={[-1.6, 0.72, -3.2]} rotation={0.5}  variant="pod" />
      <LuxInflatable position={[ 1.6, 0.72, -3.2]} rotation={-0.5} variant="pod" />

      {/* ══ PLAYER-2 SIDE (pos Z) — red accent ═════════ */}

      <LuxTireStack position={[-4.2, 0, 5.8]} number={1} accentColor={A.oppRed} />
      <LuxTireStack position={[ 0.0, 0, 6.2]} number={2} accentColor={A.oppRed} />
      <LuxTireStack position={[ 4.2, 0, 5.8]} number={3} accentColor={A.oppRed} />

      <LuxBarrier position={[-2.2, 0, 4.8]} rotation={Math.PI - 0.2} width={2.2} />
      <LuxBarrier position={[ 2.2, 0, 4.8]} rotation={Math.PI + 0.2} width={2.2} />
      <LuxSandbags position={[-5.5, 0, 3.5]} rotation={-0.4} rows={2} cols={4} />
      <LuxSandbags position={[ 5.5, 0, 3.5]} rotation={0.4}  rows={2} cols={4} />
      <LuxInflatable position={[-1.6, 0.72, 3.2]} rotation={-0.5} variant="pod" />
      <LuxInflatable position={[ 1.6, 0.72, 3.2]} rotation={0.5}  variant="pod" />

      {/* ══ CENTER FIELD ════════════════════════════════ */}

      <LuxInflatable position={[0, 0.85, 0]} scale={[1.3, 1.6, 1.3]} variant="can" />
      <LuxInflatable position={[-2.5, 0.72,  0.8]} rotation={0.4}  variant="pod" />
      <LuxInflatable position={[ 2.5, 0.72, -0.8]} rotation={-0.4} variant="pod" />
      <LuxInflatable position={[-1.5, 0.65, -0.5]} rotation={1.2}
        scale={[0.85, 0.85, 0.85]} variant="pod" />
      <LuxInflatable position={[ 1.5, 0.65,  0.5]} rotation={-1.2}
        scale={[0.85, 0.85, 0.85]} variant="pod" />
      <LuxInflatable position={[0, 0.4, -1.8]} rotation={0.1}
        variant="snake" scale={[1.4, 1.0, 1.0]} />
      <LuxInflatable position={[0, 0.4,  1.8]} rotation={-0.1}
        variant="snake" scale={[1.4, 1.0, 1.0]} />

      {/* Flank covers */}
      <LuxBarrier position={[-7.5, 0, 0]} rotation={Math.PI / 2} width={3.0} />
      <LuxBarrier position={[ 7.5, 0, 0]} rotation={Math.PI / 2} width={3.0} />

      {/* ══ TREES (white birch corners) ═════════════════ */}

      <BirchTree position={[-10, 0, -10]} scale={1.1} />
      <BirchTree position={[ 10, 0, -10]} scale={0.95} />
      <BirchTree position={[-10, 0,  10]} scale={1.05} />
      <BirchTree position={[ 10, 0,  10]} scale={1.0} />
      <BirchTree position={[-10, 0,   0]} scale={0.9} />
      <BirchTree position={[ 10, 0,   0]} scale={1.0} />
      <BirchTree position={[  0, 0, -10.5]} scale={1.2} />
      <BirchTree position={[  0, 0,  10.5]} scale={1.15} />

      {/* ══ FLAGS ════════════════════════════════════════ */}

      <LuxFlag position={[-8.5, 0, -8.5]} flagColor={A.playerBlue} />
      <LuxFlag position={[ 8.5, 0, -8.5]} flagColor={A.oppRed} />
      <LuxFlag position={[-8.5, 0,  8.5]} flagColor={A.playerBlue} />
      <LuxFlag position={[ 8.5, 0,  8.5]} flagColor={A.oppRed} />
      {/* Center KOBK gold flag */}
      <LuxFlag position={[0, 0, 0]} flagColor={A.gold} poleColor={A.lightGold} />

      {/* ══ OBSERVATION TOWERS ══════════════════════════ */}

      <LuxTower position={[-9.5, 0, -9.5]} />
      <LuxTower position={[ 9.5, 0, -9.5]} />
      <LuxTower position={[-9.5, 0,  9.5]} />
      <LuxTower position={[ 9.5, 0,  9.5]} />

      {/* ══ SPECTATOR STANDS ════════════════════════════ */}

      <LuxStand position={[0, 0, -11.5]} rotation={0}        rows={4} />
      <LuxStand position={[0, 0,  11.5]} rotation={Math.PI}  rows={4} />

      {/* ══ ADVERTISING BANNERS ═════════════════════════ */}

      <LuxBanner position={[-6, 0, -10]} rotation={0}       accentColor={A.playerBlue} />
      <LuxBanner position={[ 0, 0, -10]} rotation={0}       accentColor={A.gold} />
      <LuxBanner position={[ 6, 0, -10]} rotation={0}       accentColor={A.oppRed} />
      <LuxBanner position={[-6, 0,  10]} rotation={Math.PI} accentColor={A.gold} />
      <LuxBanner position={[ 0, 0,  10]} rotation={Math.PI} accentColor={A.playerBlue} />
      <LuxBanner position={[ 6, 0,  10]} rotation={Math.PI} accentColor={A.oppRed} />

      {/* ══ PERIMETER FENCE ═════════════════════════════ */}
      <LuxFence />

      {/* ══ TARGET BOARDS ═══════════════════════════════ */}
      {/* Player 1 side scoring targets */}
      <LuxTargetBoard position={[-7.5, 0, -7]} rotation={-0.6} side={1} />
      <LuxTargetBoard position={[ 7.5, 0, -7]} rotation={ 0.6} side={1} />
      {/* Player 2 side scoring targets */}
      <LuxTargetBoard position={[-7.5, 0,  7]} rotation={ 2.5} side={2} />
      <LuxTargetBoard position={[ 7.5, 0,  7]} rotation={-2.5} side={2} />

      {/* ══ VIP PLATFORM (center back) ══════════════════ */}
      <LuxVipPlatform position={[0, 0, -10.5]} />

      {/* ══ ANIMATED SCOREBOARD ═════════════════════════ */}
      <LuxScoreboard position={[0, 4.8, -10.8]} />

      {/* ══ FLOOR LANE MARKERS ══════════════════════════ */}
      <LuxLaneMarkers />

      {/* ══ CORNER SPONSOR PILLARS ══════════════════════ */}
      <LuxSponsorPillar position={[-10.8, 0, -10.8]} />
      <LuxSponsorPillar position={[ 10.8, 0, -10.8]} />
      <LuxSponsorPillar position={[-10.8, 0,  10.8]} />
      <LuxSponsorPillar position={[ 10.8, 0,  10.8]} />

      {/* ══ GROUND HAZARD ZONES ═════════════════════════ */}
      <LuxHazardZones />

    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxTargetBoard  — circular shoot-through scoring targets
//  with concentric rings (pearl → steel → gold bull's-eye)
// ─────────────────────────────────────────────────────────────

function LuxTargetBoard({
  position, rotation = 0, side,
}: {
  position: [number, number, number];
  rotation?: number;
  side:     1 | 2;
}) {
  const boardRef  = useRef<THREE.Group>(null);
  const accentCol = side === 1 ? A.playerBlue : A.oppRed;

  useFrame(state => {
    if (!boardRef.current) return;
    // Gentle float
    boardRef.current.position.y =
      position[1] + 0.5 + Math.sin(state.clock.elapsedTime * 1.2 + rotation) * 0.04;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Mounting arm */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.028, 0.032, 1.2, 6]} />
        <meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.65} />
      </mesh>
      {/* Ground anchor */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.085, 0.095, 0.12, 8]} />
        <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85} />
      </mesh>

      <group ref={boardRef} position={[0, 1.18, 0]}>
        {/* Board backing (matte charcoal) */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.038, 18]} />
          <meshStandardMaterial color={A.charcoal} roughness={0.72} metalness={0.12} />
        </mesh>
        {/* Outer pearl ring */}
        <mesh castShadow position={[0, 0.022, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.014, 18]} />
          <meshStandardMaterial color={A.pearl} roughness={0.52} metalness={0.10} />
        </mesh>
        {/* Middle steel ring */}
        <mesh position={[0, 0.027, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.012, 16]} />
          <meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.55} />
        </mesh>
        {/* Inner accent ring */}
        <mesh position={[0, 0.032, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.010, 14]} />
          <meshStandardMaterial color={accentCol} roughness={0.25} metalness={0.28}
            emissive={accentCol} emissiveIntensity={0.12} />
        </mesh>
        {/* Bull's-eye gold */}
        <mesh position={[0, 0.036, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.010, 10]} />
          <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88}
            emissive={A.gold} emissiveIntensity={0.20} />
        </mesh>
        {/* Axis cross lines */}
        {[0, Math.PI / 2].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2, r, 0]} position={[0, 0.035, 0]}>
            <boxGeometry args={[0.76, 0.002, 0.005]} />
            <meshStandardMaterial color={A.darkSteel} roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
        {/* Score ring glow */}
        <pointLight color={accentCol} intensity={0.28} distance={1.8} decay={2} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxVipPlatform  — raised marble dais with gold railing
//  for the referee / camera crew, behind the arena
// ─────────────────────────────────────────────────────────────

function LuxVipPlatform({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base plinth */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.22, 1.8]} />
        <meshStandardMaterial color={A.marble} roughness={0.52} metalness={0.04} />
      </mesh>
      {/* Marble surface */}
      <mesh receiveShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[5.4, 0.025, 1.78]} />
        <meshStandardMaterial color={A.white} roughness={0.38} metalness={0.08} />
      </mesh>
      {/* Gold inlay border */}
      <mesh position={[0, 0.136, 0]}>
        <boxGeometry args={[5.38, 0.004, 1.76]} />
        <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.85}
          emissive={A.gold} emissiveIntensity={0.06} />
      </mesh>
      {/* Pearl front fascia */}
      <mesh castShadow position={[0, -0.005, 0.92]}>
        <boxGeometry args={[5.5, 0.22, 0.025]} />
        <meshStandardMaterial color={A.pearl} roughness={0.55} metalness={0.10} />
      </mesh>
      {/* Gold relief panel on fascia */}
      <mesh position={[0, -0.005, 0.934]}>
        <boxGeometry args={[4.2, 0.14, 0.004]} />
        <meshStandardMaterial color={A.lightGold} roughness={0.22} metalness={0.82}
          emissive={A.gold} emissiveIntensity={0.06} />
      </mesh>
      {/* Railing posts */}
      {Array.from({ length: 7 }).map((_, i) => {
        const px = -2.5 + i * (5 / 6);
        return (
          <group key={i} position={[px, 0.12, 0.88]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.78, 7]} />
              <meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72} />
            </mesh>
            <mesh castShadow position={[0, 0.41, 0]}>
              <sphereGeometry args={[0.032, 7, 7]} />
              <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90} />
            </mesh>
          </group>
        );
      })}
      {/* Gold handrail */}
      <mesh castShadow position={[0, 0.90, 0.88]}>
        <boxGeometry args={[5.45, 0.022, 0.022]} />
        <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.88} />
      </mesh>
      {/* VIP chairs (pearl + gold) */}
      {[-1.6, 0, 1.6].map((x, i) => (
        <group key={i} position={[x, 0.14, 0.35]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.07, 0.42]} />
            <meshStandardMaterial color={A.pearl} roughness={0.62} metalness={0.08} />
          </mesh>
          <mesh castShadow position={[0, 0.30, -0.16]}>
            <boxGeometry args={[0.42, 0.50, 0.072]} />
            <meshStandardMaterial color={A.warmWhite} roughness={0.68} metalness={0.04} />
          </mesh>
          <mesh castShadow position={[0, 0.57, -0.16]}>
            <boxGeometry args={[0.38, 0.14, 0.065]} />
            <meshStandardMaterial color={A.pearl} roughness={0.60} metalness={0.10} />
          </mesh>
          {/* Gold armrests */}
          {[-1, 1].map(s => (
            <mesh key={s} castShadow position={[s * 0.215, 0.18, 0]}>
              <boxGeometry args={[0.028, 0.026, 0.42]} />
              <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxScoreboard  — animated pearl board with gold frame
//  Shows "KOBK" branding, glows when a hit is registered
// ─────────────────────────────────────────────────────────────

function LuxScoreboard({ position }: { position: [number, number, number] }) {
  const glowRef  = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.PointLight>(null);

  useFrame(state => {
    const t = state.clock.elapsedTime;
    const p = 0.5 + 0.5 * Math.sin(t * 0.6);
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p * 0.09;
    }
    if (pulseRef.current) {
      pulseRef.current.intensity = 0.22 + p * 0.14;
    }
  });

  return (
    <group position={position}>
      {/* Support arms */}
      {[-1.45, 1.45].map((x, i) => (
        <mesh key={i} castShadow position={[x, -1.85, 0]}>
          <boxGeometry args={[0.095, 3.8, 0.095]} />
          <meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72} />
        </mesh>
      ))}

      {/* Main board backing */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.35, 0.88, 0.12]} />
        <meshStandardMaterial color={A.charcoal} roughness={0.62} metalness={0.18} />
      </mesh>

      {/* Glowing pearl display panel */}
      <mesh ref={glowRef} castShadow position={[0, 0, 0.065]}>
        <boxGeometry args={[3.18, 0.72, 0.015]} />
        <meshStandardMaterial
          color={A.pearl} roughness={0.35} metalness={0.08}
          emissive={A.gold} emissiveIntensity={0.06}
        />
      </mesh>

      {/* Gold outer frame */}
      {[
        { x:0, y: 0.456, w:3.35, h:0.018 },
        { x:0, y:-0.456, w:3.35, h:0.018 },
        { x: 1.675, y:0, w:0.018, h:0.88 },
        { x:-1.675, y:0, w:0.018, h:0.88 },
      ].map((f, i) => (
        <mesh key={i} castShadow position={[f.x, f.y, 0.068]}>
          <boxGeometry args={[f.w, f.h, 0.012]} />
          <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}

      {/* Score separator */}
      <mesh castShadow position={[0, 0, 0.073]}>
        <boxGeometry args={[0.014, 0.68, 0.010]} />
        <meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.60} />
      </mesh>

      {/* Pixel-score blocks (P1 side) */}
      {[[-0.78, 0.12], [-0.58, 0.12], [-0.68, -0.08]].map(([bx, by], i) => (
        <mesh key={i} position={[bx, by, 0.078]}>
          <boxGeometry args={[0.085, 0.085, 0.009]} />
          <meshStandardMaterial color={A.playerBlue} roughness={0.28} metalness={0.18}
            emissive={A.playerBlue} emissiveIntensity={0.32} />
        </mesh>
      ))}
      {/* Pixel-score blocks (P2 side) */}
      {[[0.78, 0.12], [0.58, 0.12], [0.58, -0.08], [0.78, -0.08]].map(([bx, by], i) => (
        <mesh key={i} position={[bx, by, 0.078]}>
          <boxGeometry args={[0.085, 0.085, 0.009]} />
          <meshStandardMaterial color={A.oppRed} roughness={0.28} metalness={0.18}
            emissive={A.oppRed} emissiveIntensity={0.32} />
        </mesh>
      ))}

      {/* KOBK logo text blocks */}
      {[-0.22, -0.08, 0.06, 0.20].map((bx, i) => (
        <mesh key={i} position={[bx, 0.0, 0.078]}>
          <boxGeometry args={[0.052, 0.22, 0.007]} />
          <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.82}
            emissive={A.gold} emissiveIntensity={0.18} />
        </mesh>
      ))}

      {/* Glow light */}
      <pointLight ref={pulseRef} color={A.gold} intensity={0.28} distance={5} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxLaneMarkers  — center-line + side-lane dividers
//  painted directly onto the marble ground
// ─────────────────────────────────────────────────────────────

function LuxLaneMarkers() {
  return (
    <group>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[0.055, 21]} />
        <meshStandardMaterial color={A.gold} roughness={0.60} metalness={0.15}
          transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {/* Dash pattern over center line */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -9 + i * 1.4]}>
          <planeGeometry args={[0.062, 0.42]} />
          <meshStandardMaterial color={A.lightGold} roughness={0.55} metalness={0.18}
            transparent opacity={0.72} depthWrite={false} />
        </mesh>
      ))}
      {/* Side lanes */}
      {[-3.5, 3.5].map((x, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, 0]}>
            <planeGeometry args={[0.035, 21]} />
            <meshStandardMaterial color={A.platinum} roughness={0.65}
              transparent opacity={0.25} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {/* Half-line circles (center field) */}
      {[-1, 1].map(s => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, s * 0]}>
          <ringGeometry args={[1.85, 2.0, 22]} />
          <meshStandardMaterial color={A.gold} roughness={0.55} metalness={0.15}
            transparent opacity={0.25} depthWrite={false} />
        </mesh>
      ))}
      {/* Spawn-zone rectangles */}
      {[-6.5, 6.5].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[9, 2.8]} />
          <meshStandardMaterial
            color={i === 0 ? A.playerBlue : A.oppRed}
            roughness={0.88}
            transparent opacity={0.06}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Corner numbers */}
      {[[-3.5,0,-6],[-3.5,0,6],[3.5,0,-6],[3.5,0,6]].map(([x,y,z],i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,y+0.008,z]}>
          <circleGeometry args={[0.22,10]}/>
          <meshStandardMaterial color={A.gold} roughness={0.55}
            transparent opacity={0.42} depthWrite={false}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxSponsorPillar  — tall branded column at each corner
//  Pearl cylinder, gold banding, team-color top capsule
// ─────────────────────────────────────────────────────────────

function LuxSponsorPillar({ position }: { position: [number, number, number] }) {
  const topRef = useRef<THREE.Mesh>(null);
  useFrame(s => {
    if (!topRef.current) return;
    (topRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.18 + 0.12 * Math.sin(s.clock.elapsedTime * 1.8 + position[0]);
  });

  return (
    <group position={position}>
      {/* Pearl marble base block */}
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.62, 0.45, 0.62]} />
        <meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04} />
      </mesh>
      {/* Gold base trim */}
      <mesh castShadow position={[0, 0.456, 0]}>
        <boxGeometry args={[0.64, 0.024, 0.64]} />
        <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88} />
      </mesh>

      {/* Main pearl column shaft */}
      <mesh castShadow position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.175, 0.192, 3.22, 12]} />
        <meshStandardMaterial color={A.pearl} roughness={0.52} metalness={0.10} />
      </mesh>

      {/* Gold band rings every meter */}
      {[1.0, 2.0, 3.0].map((y, i) => (
        <mesh key={i} castShadow position={[0, y + 0.48, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.048, 12]} />
          <meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88} />
        </mesh>
      ))}

      {/* Sponsor panel (pearl plate with gold frame) */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rot, i) => {
        const px = Math.sin(rot) * 0.196;
        const pz = Math.cos(rot) * 0.196;
        return (
          <mesh key={i} castShadow position={[px, 2.0, pz]} rotation={[0, rot, 0]}>
            <boxGeometry args={[0.28, 0.82, 0.008]} />
            <meshStandardMaterial color={A.warmWhite} roughness={0.68} metalness={0.04} />
          </mesh>
        );
      })}

      {/* Glowing top capsule (team-color alternates) */}
      <mesh ref={topRef} castShadow position={[0, 3.88, 0]}>
        <capsuleGeometry args={[0.195, 0.38, 7, 14]} />
        <meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.68}
          emissive={A.gold} emissiveIntensity={0.20} />
      </mesh>

      {/* Top light */}
      <pointLight position={[0, 4.3, 0]} color={A.lightGold} intensity={0.55} distance={6} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxHazardZones  — gold-outlined "danger strips" painted
//  on the ground near the center bunker cluster
// ─────────────────────────────────────────────────────────────

function LuxHazardZones() {
  return (
    <group>
      {/* Diagonal chevron strips — classic danger look */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = -3.5 + i * 1.0;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0.785]} position={[x, 0.007, 0]}>
            <planeGeometry args={[0.045, 1.6]} />
            <meshStandardMaterial color={A.gold} roughness={0.65}
              transparent opacity={0.18} depthWrite={false} />
          </mesh>
        );
      })}
      {/* Boundary ring around center bunker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <ringGeometry args={[2.4, 2.55, 22]} />
        <meshStandardMaterial color={A.gold} roughness={0.62}
          transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* Warning dot pattern */}
      {[[2.2,0,0],[-2.2,0,0],[0,0,2.2],[0,0,-2.2]].map(([x,y,z], i) => (
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,y+0.007,z]}>
          <circleGeometry args={[0.12,8]}/>
          <meshStandardMaterial color={A.gold} roughness={0.65}
            transparent opacity={0.35} depthWrite={false}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxCoverAwning  — fabric awning above stands
// ─────────────────────────────────────────────────────────────

function LuxCoverAwning({ position, rotation = 0 }: { position:[number,number,number]; rotation?:number }) {
  const sailRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(6.5, 1.6, 16, 6), []);
  useFrame(s => {
    if (!sailRef.current) return;
    const t = s.clock.elapsedTime;
    const pos = sailRef.current.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      pos.setY(i, Math.sin(x*2.2+t*1.6)*0.045+Math.sin(z*1.8+t*1.2)*0.025);
    }
    pos.needsUpdate = true;
    sailRef.current.geometry.computeVertexNormals();
  });
  return (
    <group position={position} rotation={[0,rotation,0]}>
      {[-3.0,3.0].map((x,i)=>(
        <mesh key={i} castShadow position={[x,-0.85,0]}>
          <cylinderGeometry args={[0.042,0.048,1.8,7]}/><meshStandardMaterial color={A.chrome} roughness={0.30} metalness={0.72}/>
        </mesh>
      ))}
      {[-3.0,3.0].map((x,i)=>(
        <mesh key={i} castShadow position={[x,0.05,0]}>
          <sphereGeometry args={[0.058,8,8]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90}/>
        </mesh>
      ))}
      <mesh ref={sailRef} geometry={geometry} castShadow>
        <meshStandardMaterial color={A.warmWhite} roughness={0.88} side={THREE.DoubleSide}/>
      </mesh>
      {[0.82,-0.82].map((z,i)=>(
        <mesh key={i} castShadow position={[0,0,z]}>
          <boxGeometry args={[6.55,0.012,0.012]}/><meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxPitCrew area  — crates, tool board, ammo rack
// ─────────────────────────────────────────────────────────────

function LuxPitCrew({ position, rotation=0 }: { position:[number,number,number]; rotation?:number }) {
  return (
    <group position={position} rotation={[0,rotation,0]}>
      <mesh castShadow receiveShadow position={[0,0.55,0]}>
        <boxGeometry args={[1.6,0.085,0.68]}/><meshStandardMaterial color={A.marble} roughness={0.52} metalness={0.04}/>
      </mesh>
      {[[-0.72,-0.66],[0.72,-0.66],[-0.72,0.66],[0.72,0.66]].map(([lx,lz],i)=>(
        <mesh key={i} castShadow position={[lx,0.27,lz]}>
          <boxGeometry args={[0.055,0.55,0.055]}/><meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72}/>
        </mesh>
      ))}
      {[-0.45,0,0.45].map((x,i)=>(
        <mesh key={i} castShadow position={[x,0.65,0]}>
          <sphereGeometry args={[0.085,9,9]}/>
          <meshStandardMaterial color={[A.lightGold,A.playerBlue,A.oppRed][i]} roughness={0.38} metalness={0.38} transparent opacity={0.88}/>
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0.95,0.28,0]}>
        <boxGeometry args={[0.52,0.55,0.48]}/><meshStandardMaterial color={A.ivory} roughness={0.82}/>
      </mesh>
      <mesh castShadow position={[0.95,0.48,0.245]}>
        <boxGeometry args={[0.085,0.028,0.014]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88}/>
      </mesh>
      <mesh castShadow position={[0,0.85,-0.38]}>
        <boxGeometry args={[1.55,0.52,0.025]}/><meshStandardMaterial color={A.warmWhite} roughness={0.72}/>
      </mesh>
      {[-0.52,-0.2,0.14,0.5].map((tx,i)=>(
        <mesh key={i} castShadow position={[tx,0.88,-0.37]}>
          <cylinderGeometry args={[0.010,0.010,0.048,5]}/><meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.82}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Ambient floating gold orbs
// ─────────────────────────────────────────────────────────────

function AmbientOrbs() {
  const orbsData = useMemo(() => [
    {pos:[-6,3.2,-6] as [number,number,number],col:A.lightGold,spd:0.7,amp:0.18,ph:0},
    {pos:[ 6,3.0,-6] as [number,number,number],col:A.playerBlue,spd:0.6,amp:0.22,ph:1.4},
    {pos:[-6,3.4, 6] as [number,number,number],col:A.oppRed,spd:0.8,amp:0.16,ph:2.8},
    {pos:[ 6,3.1, 6] as [number,number,number],col:A.lightGold,spd:0.65,amp:0.20,ph:0.9},
    {pos:[ 0,4.0, 0] as [number,number,number],col:A.gold,spd:0.45,amp:0.28,ph:1.9},
  ],[]);
  const refs = useRef<(THREE.Group|null)[]>([]);
  useFrame(s=>{
    const t=s.clock.elapsedTime;
    refs.current.forEach((g,i)=>{
      if(!g)return;const d=orbsData[i];
      g.position.y=d.pos[1]+Math.sin(t*d.spd+d.ph)*d.amp;
      g.rotation.y=t*0.35+d.ph;
    });
  });
  return(
    <group name="ambient-orbs">
      {orbsData.map((d,i)=>(
        <group key={i} ref={el=>{refs.current[i]=el;}} position={d.pos}>
          <mesh><sphereGeometry args={[0.125,8,8]}/><meshBasicMaterial color={d.col} transparent opacity={0.12}/></mesh>
          <mesh><sphereGeometry args={[0.055,7,7]}/><meshBasicMaterial color={d.col} transparent opacity={0.55}/></mesh>
          <pointLight color={d.col} intensity={0.22} distance={5} decay={2}/>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Arena floor logo decal  — concentric gold rings + spokes
// ─────────────────────────────────────────────────────────────

function ArenaLogoDecal() {
  return (
    <group rotation={[-Math.PI/2,0,0]} position={[0,0.009,0]}>
      <mesh><ringGeometry args={[2.55,2.75,26]}/><meshStandardMaterial color={A.gold} roughness={0.58} transparent opacity={0.28} depthWrite={false}/></mesh>
      <mesh><ringGeometry args={[1.35,1.48,24]}/><meshStandardMaterial color={A.lightGold} roughness={0.62} transparent opacity={0.22} depthWrite={false}/></mesh>
      <mesh><circleGeometry args={[0.55,18]}/><meshStandardMaterial color={A.gold} roughness={0.48} transparent opacity={0.18} depthWrite={false}/></mesh>
      {Array.from({length:8}).map((_,i)=>{
        const angle=(i/8)*Math.PI*2;
        return(
          <mesh key={i} position={[Math.cos(angle)*1.95,Math.sin(angle)*1.95,0]} rotation={[0,0,angle+Math.PI/2]}>
            <boxGeometry args={[0.022,1.18,0.002]}/><meshStandardMaterial color={A.gold} roughness={0.65} transparent opacity={0.22} depthWrite={false}/>
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxSponsorPillar  — tall branded column at each corner
// ─────────────────────────────────────────────────────────────

function LuxSponsorPillar({ position }: { position:[number,number,number] }) {
  const topRef = useRef<THREE.Mesh>(null);
  useFrame(s=>{
    if(!topRef.current)return;
    (topRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity=0.18+0.12*Math.sin(s.clock.elapsedTime*1.8+position[0]);
  });
  return(
    <group position={position}>
      <mesh castShadow receiveShadow position={[0,0.22,0]}>
        <boxGeometry args={[0.62,0.45,0.62]}/><meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04}/>
      </mesh>
      <mesh castShadow position={[0,0.456,0]}>
        <boxGeometry args={[0.64,0.024,0.64]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88}/>
      </mesh>
      <mesh castShadow position={[0,2.0,0]}>
        <cylinderGeometry args={[0.175,0.192,3.22,12]}/><meshStandardMaterial color={A.pearl} roughness={0.52} metalness={0.10}/>
      </mesh>
      {[1.0,2.0,3.0].map((y,i)=>(
        <mesh key={i} castShadow position={[0,y+0.48,0]}>
          <cylinderGeometry args={[0.185,0.185,0.048,12]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88}/>
        </mesh>
      ))}
      <mesh ref={topRef} castShadow position={[0,3.88,0]}>
        <capsuleGeometry args={[0.195,0.38,7,14]}/><meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.68} emissive={A.gold} emissiveIntensity={0.20}/>
      </mesh>
      <pointLight position={[0,4.3,0]} color={A.lightGold} intensity={0.55} distance={6} decay={2}/>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxTargetBoard  — circular scoring target
// ─────────────────────────────────────────────────────────────

function LuxTargetBoard({ position, rotation=0, side }: { position:[number,number,number]; rotation?:number; side:1|2 }) {
  const boardRef = useRef<THREE.Group>(null);
  const accentCol = side===1 ? A.playerBlue : A.oppRed;
  useFrame(s=>{
    if(!boardRef.current)return;
    boardRef.current.position.y=position[1]+0.5+Math.sin(s.clock.elapsedTime*1.2+rotation)*0.04;
  });
  return(
    <group position={position} rotation={[0,rotation,0]}>
      <mesh castShadow position={[0,0.55,0]}>
        <cylinderGeometry args={[0.028,0.032,1.2,6]}/><meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.65}/>
      </mesh>
      <mesh receiveShadow position={[0,0.06,0]}>
        <cylinderGeometry args={[0.085,0.095,0.12,8]}/><meshStandardMaterial color={A.gold} roughness={0.22} metalness={0.85}/>
      </mesh>
      <group ref={boardRef} position={[0,1.18,0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42,0.42,0.038,18]}/><meshStandardMaterial color={A.charcoal} roughness={0.72} metalness={0.12}/>
        </mesh>
        <mesh castShadow position={[0,0.022,0]}>
          <cylinderGeometry args={[0.38,0.38,0.014,18]}/><meshStandardMaterial color={A.pearl} roughness={0.52} metalness={0.10}/>
        </mesh>
        <mesh position={[0,0.027,0]}>
          <cylinderGeometry args={[0.26,0.26,0.012,16]}/><meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.55}/>
        </mesh>
        <mesh position={[0,0.032,0]}>
          <cylinderGeometry args={[0.14,0.14,0.010,14]}/><meshStandardMaterial color={accentCol} roughness={0.25} metalness={0.28} emissive={accentCol} emissiveIntensity={0.12}/>
        </mesh>
        <mesh position={[0,0.036,0]}>
          <cylinderGeometry args={[0.052,0.052,0.010,10]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88} emissive={A.gold} emissiveIntensity={0.20}/>
        </mesh>
        {[0,Math.PI/2].map((r,i)=>(
          <mesh key={i} rotation={[Math.PI/2,r,0]} position={[0,0.035,0]}>
            <boxGeometry args={[0.76,0.002,0.005]}/><meshStandardMaterial color={A.darkSteel} roughness={0.6} metalness={0.4}/>
          </mesh>
        ))}
        <pointLight color={accentCol} intensity={0.28} distance={1.8} decay={2}/>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxVipPlatform  — raised marble dais with gold railing
// ─────────────────────────────────────────────────────────────

function LuxVipPlatform({ position }: { position:[number,number,number] }) {
  return(
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[5.5,0.22,1.8]}/><meshStandardMaterial color={A.marble} roughness={0.52} metalness={0.04}/>
      </mesh>
      <mesh receiveShadow position={[0,0.12,0]}>
        <boxGeometry args={[5.4,0.025,1.78]}/><meshStandardMaterial color={A.white} roughness={0.38} metalness={0.08}/>
      </mesh>
      <mesh position={[0,0.136,0]}>
        <boxGeometry args={[5.38,0.004,1.76]}/><meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.85} emissive={A.gold} emissiveIntensity={0.06}/>
      </mesh>
      <mesh castShadow position={[0,-0.005,0.92]}>
        <boxGeometry args={[5.5,0.22,0.025]}/><meshStandardMaterial color={A.pearl} roughness={0.55} metalness={0.10}/>
      </mesh>
      {Array.from({length:7}).map((_,i)=>{
        const px=-2.5+i*(5/6);
        return(
          <group key={i} position={[px,0.12,0.88]}>
            <mesh castShadow><cylinderGeometry args={[0.022,0.022,0.78,7]}/><meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72}/></mesh>
            <mesh castShadow position={[0,0.41,0]}><sphereGeometry args={[0.032,7,7]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.90}/></mesh>
          </group>
        );
      })}
      <mesh castShadow position={[0,0.90,0.88]}>
        <boxGeometry args={[5.45,0.022,0.022]}/><meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.88}/>
      </mesh>
      {[-1.6,0,1.6].map((x,i)=>(
        <group key={i} position={[x,0.14,0.35]}>
          <mesh castShadow><boxGeometry args={[0.42,0.07,0.42]}/><meshStandardMaterial color={A.pearl} roughness={0.62} metalness={0.08}/></mesh>
          <mesh castShadow position={[0,0.30,-0.16]}><boxGeometry args={[0.42,0.50,0.072]}/><meshStandardMaterial color={A.warmWhite} roughness={0.68} metalness={0.04}/></mesh>
          <mesh castShadow position={[0,0.57,-0.16]}><boxGeometry args={[0.38,0.14,0.065]}/><meshStandardMaterial color={A.pearl} roughness={0.60} metalness={0.10}/></mesh>
          {[-1,1].map(s=>(
            <mesh key={s} castShadow position={[s*0.215,0.18,0]}><boxGeometry args={[0.028,0.026,0.42]}/><meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.85}/></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxScoreboard  — animated pearl display with gold frame
// ─────────────────────────────────────────────────────────────

function LuxScoreboard({ position }: { position:[number,number,number] }) {
  const glowRef=useRef<THREE.Mesh>(null);
  const pulseRef=useRef<THREE.PointLight>(null);
  useFrame(s=>{
    const t=s.clock.elapsedTime; const p=0.5+0.5*Math.sin(t*0.6);
    if(glowRef.current)(glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity=p*0.09;
    if(pulseRef.current)pulseRef.current.intensity=0.22+p*0.14;
  });
  return(
    <group position={position}>
      {[-1.45,1.45].map((x,i)=>(
        <mesh key={i} castShadow position={[x,-1.85,0]}>
          <boxGeometry args={[0.095,3.8,0.095]}/><meshStandardMaterial color={A.chrome} roughness={0.28} metalness={0.72}/>
        </mesh>
      ))}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.35,0.88,0.12]}/><meshStandardMaterial color={A.charcoal} roughness={0.62} metalness={0.18}/>
      </mesh>
      <mesh ref={glowRef} castShadow position={[0,0,0.065]}>
        <boxGeometry args={[3.18,0.72,0.015]}/><meshStandardMaterial color={A.pearl} roughness={0.35} metalness={0.08} emissive={A.gold} emissiveIntensity={0.06}/>
      </mesh>
      {[[0,0.456,3.35,0.018],[0,-0.456,3.35,0.018],[1.675,0,0.018,0.88],[-1.675,0,0.018,0.88]].map(([x,y,w,h],i)=>(
        <mesh key={i} castShadow position={[x,y,0.068]}>
          <boxGeometry args={[w,h,0.012]}/><meshStandardMaterial color={A.gold} roughness={0.18} metalness={0.88}/>
        </mesh>
      ))}
      <mesh castShadow position={[0,0,0.073]}>
        <boxGeometry args={[0.014,0.68,0.010]}/><meshStandardMaterial color={A.steel} roughness={0.38} metalness={0.60}/>
      </mesh>
      {[[-0.78,0.12],[-0.58,0.12],[-0.68,-0.08]].map(([bx,by],i)=>(
        <mesh key={i} position={[bx,by,0.078]}>
          <boxGeometry args={[0.085,0.085,0.009]}/><meshStandardMaterial color={A.playerBlue} roughness={0.28} metalness={0.18} emissive={A.playerBlue} emissiveIntensity={0.32}/>
        </mesh>
      ))}
      {[[0.78,0.12],[0.58,0.12],[0.58,-0.08],[0.78,-0.08]].map(([bx,by],i)=>(
        <mesh key={i} position={[bx,by,0.078]}>
          <boxGeometry args={[0.085,0.085,0.009]}/><meshStandardMaterial color={A.oppRed} roughness={0.28} metalness={0.18} emissive={A.oppRed} emissiveIntensity={0.32}/>
        </mesh>
      ))}
      {[-0.22,-0.08,0.06,0.20].map((bx,i)=>(
        <mesh key={i} position={[bx,0.0,0.078]}>
          <boxGeometry args={[0.052,0.22,0.007]}/><meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.82} emissive={A.gold} emissiveIntensity={0.18}/>
        </mesh>
      ))}
      <pointLight ref={pulseRef} color={A.gold} intensity={0.28} distance={5} decay={2}/>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxLaneMarkers  — floor lane dividers + spawn zones
// ─────────────────────────────────────────────────────────────

function LuxLaneMarkers() {
  return(
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.004,0]}>
        <planeGeometry args={[0.055,21]}/><meshStandardMaterial color={A.gold} roughness={0.60} metalness={0.15} transparent opacity={0.38} depthWrite={false}/>
      </mesh>
      {Array.from({length:14}).map((_,i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,0.005,-9+i*1.4]}>
          <planeGeometry args={[0.062,0.42]}/><meshStandardMaterial color={A.lightGold} roughness={0.55} metalness={0.18} transparent opacity={0.72} depthWrite={false}/>
        </mesh>
      ))}
      {[-3.5,3.5].map((x,i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,0.004,0]}>
          <planeGeometry args={[0.035,21]}/><meshStandardMaterial color={A.platinum} roughness={0.65} transparent opacity={0.25} depthWrite={false}/>
        </mesh>
      ))}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.006,0]}>
        <ringGeometry args={[1.85,2.0,22]}/><meshStandardMaterial color={A.gold} roughness={0.55} metalness={0.15} transparent opacity={0.25} depthWrite={false}/>
      </mesh>
      {[-6.5,6.5].map((z,i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,0.005,z]}>
          <planeGeometry args={[9,2.8]}/><meshStandardMaterial color={i===0?A.playerBlue:A.oppRed} roughness={0.88} transparent opacity={0.06} depthWrite={false}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  LuxHazardZones  — gold-outlined danger strips
// ─────────────────────────────────────────────────────────────

function LuxHazardZones() {
  return(
    <group>
      {Array.from({length:8}).map((_,i)=>{
        const x=-3.5+i*1.0;
        return(
          <mesh key={i} rotation={[-Math.PI/2,0,0.785]} position={[x,0.007,0]}>
            <planeGeometry args={[0.045,1.6]}/><meshStandardMaterial color={A.gold} roughness={0.65} transparent opacity={0.18} depthWrite={false}/>
          </mesh>
        );
      })}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.007,0]}>
        <ringGeometry args={[2.4,2.55,22]}/><meshStandardMaterial color={A.gold} roughness={0.62} transparent opacity={0.22} depthWrite={false}/>
      </mesh>
      {[[2.2,0,0],[-2.2,0,0],[0,0,2.2],[0,0,-2.2]].map(([x,y,z],i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,y+0.007,z]}>
          <circleGeometry args={[0.12,8]}/><meshStandardMaterial color={A.gold} roughness={0.65} transparent opacity={0.35} depthWrite={false}/>
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Arena initialisation helper  — one call sets up the full
//  scene graph configuration for server-authoritative rooms
// ─────────────────────────────────────────────────────────────

export interface ArenaConfig {
  groundTexture:  "marble" | "dirt" | "concrete";
  wallColor:      string;
  bunkerCount:    number;
  tireRows:       number;
  lightIntensity: number;
  hasSpectators:  boolean;
  hasAwnings:     boolean;
}

export const LUXURY_ARENA_CONFIG: ArenaConfig = {
  groundTexture:  "marble",
  wallColor:      "#F5F5F7",
  bunkerCount:    7,
  tireRows:       3,
  lightIntensity: 1.2,
  hasSpectators:  true,
  hasAwnings:     true,
};

export const STANDARD_ARENA_CONFIG: ArenaConfig = {
  groundTexture:  "dirt",
  wallColor:      "#C8C2B8",
  bunkerCount:    5,
  tireRows:       3,
  lightIntensity: 1.0,
  hasSpectators:  false,
  hasAwnings:     false,
};

/**
 * getArenaConfig  — fetch arena layout from backend
 * In production, replace with real API call.
 */
export async function getArenaConfig(roomId: string): Promise<ArenaConfig> {
  console.debug("[KOBK Arena] getArenaConfig", roomId);
  return LUXURY_ARENA_CONFIG;
}

// ─────────────────────────────────────────────────────────────
//  Wall panel component  — reusable clean white wall section
//  for building enclosed arena variants
// ─────────────────────────────────────────────────────────────

export function ArenaWallPanel({
  position, rotation = 0, width = 4, height = 2.8, withWindow = false,
}: {
  position:    [number, number, number];
  rotation?:   number;
  width?:      number;
  height?:     number;
  withWindow?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.145]} />
        <meshStandardMaterial color={A.pearl} roughness={0.60} metalness={0.08} />
      </mesh>
      {/* Gold top trim */}
      <mesh castShadow position={[0, height + 0.01, 0]}>
        <boxGeometry args={[width, 0.022, 0.155]} />
        <meshStandardMaterial color={A.gold} roughness={0.20} metalness={0.85} />
      </mesh>
      {/* Base trim */}
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[width, 0.12, 0.155]} />
        <meshStandardMaterial color={A.marble} roughness={0.55} metalness={0.04} />
      </mesh>
      {withWindow && (
        <mesh position={[0, height * 0.62, 0.075]}>
          <boxGeometry args={[width * 0.38, height * 0.28, 0.008]} />
          <meshStandardMaterial color="#E8F4FF" roughness={0.04} metalness={0.18}
            transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  );
}
