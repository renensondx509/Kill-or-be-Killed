/**
 * ============================================================
 *  PaintEffects.tsx  —  Kill or Be Killed  ·  Luxury
 * ============================================================
 *  Aesthetic: iPhone Pro White — pearl-tinted projectiles,
 *  champagne-gold shockwave rings, soft particle clouds,
 *  delicate paint-drip splats on all surfaces.
 *
 *  Systems:
 *   1. Ground / wall paint splats  (circle + drip trails)
 *   2. Paintball projectiles       (parabolic arc, soft glow)
 *   3. Hit particles               (burst + drift)
 *   4. Shockwave rings             (expanding gold disc)
 *   5. Smoke puffs                 (pearl volumetric orbs)
 *   6. Muzzle flashes              (bright point + rays)
 *   7. Drip columns                (vertical paint-fall)
 * ============================================================
 */

import {
  useRef,
  useState,
  useCallback,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
//  Luxury palette
// ─────────────────────────────────────────────────────────────

const P = {
  pearl:      "#F5F5F7",
  white:      "#FFFFFF",
  warmWhite:  "#FAFAF8",
  platinum:   "#E8E8ED",
  steel:      "#C8C8CE",
  gold:       "#C9A84C",
  lightGold:  "#E8C96A",
  charcoal:   "#1D1D1F",
  playerBlue: "#007AFF",
  oppRed:     "#FF3B30",
} as const;

// ─────────────────────────────────────────────────────────────
//  Data types
// ─────────────────────────────────────────────────────────────

export interface PaintSplat {
  id:       number;
  position: [number, number, number];
  color:    string;
  scale:    number;
  rotation: number;
  opacity:  number;
  dripCount: number;
}

export interface Projectile {
  id:       number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color:    string;
  speed:    number;
  age:      number;
  alive:    boolean;
}

export interface Particle {
  id:       number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color:    string;
  age:      number;
  maxAge:   number;
  size:     number;
  type:     "blob" | "mist" | "droplet";
}

export interface Shockwave {
  id:       number;
  position: [number, number, number];
  color:    string;
  radius:   number;
  maxRadius:number;
  age:      number;
  maxAge:   number;
}

export interface MuzzleFlash {
  id:       number;
  position: [number, number, number];
  rotation: number;
  color:    string;
  age:      number;
  maxAge:   number;
}

// ─────────────────────────────────────────────────────────────
//  ID generator
// ─────────────────────────────────────────────────────────────

let _nextId = 1;
const nextId = () => _nextId++;

// ─────────────────────────────────────────────────────────────
//  Hook: usePaintEffects  (central state manager)
// ─────────────────────────────────────────────────────────────

export function usePaintEffects() {
  const [splats,      setSplats]      = useState<PaintSplat[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [particles,   setParticles]   = useState<Particle[]>([]);
  const [shockwaves,  setShockwaves]  = useState<Shockwave[]>([]);
  const [flashes,     setFlashes]     = useState<MuzzleFlash[]>([]);

  // ── Spawn projectile ──────────────────────────────────────
  const spawnProjectile = useCallback((
    from:  THREE.Vector3,
    to:    THREE.Vector3,
    color: string,
    speed = 16,
  ) => {
    const dir  = to.clone().sub(from).normalize();
    const proj: Projectile = {
      id:       nextId(),
      position: from.clone(),
      velocity: dir.multiplyScalar(speed),
      color,
      speed,
      age:      0,
      alive:    true,
    };
    setProjectiles(prev => [...prev.slice(-14), proj]);
  }, []);

  // ── Spawn hit burst ───────────────────────────────────────
  const spawnHitEffect = useCallback((
    position: [number, number, number],
    color:    string,
    radius    = 1.0,
  ) => {
    // Ground splat
    const splat: PaintSplat = {
      id:       nextId(),
      position: [position[0], 0.012, position[2]],
      color,
      scale:    0.35 + Math.random() * 0.55 * radius,
      rotation: Math.random() * Math.PI * 2,
      opacity:  0.88,
      dripCount: 3 + Math.floor(Math.random() * 4),
    };
    setSplats(prev => [...prev.slice(-24), splat]);

    // Paint blob particles (6 large, slow-drifting)
    const blobs: Particle[] = Array.from({ length: 6 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 1.8 + Math.random() * 3.2;
      return {
        id:       nextId(),
        position: new THREE.Vector3(...position),
        velocity: new THREE.Vector3(
          Math.cos(angle) * spd,
          2.0 + Math.random() * 3.0,
          Math.sin(angle) * spd,
        ),
        color,
        age:      0,
        maxAge:   0.55 + Math.random() * 0.45,
        size:     0.048 + Math.random() * 0.075,
        type:     "blob",
      };
    });

    // Mist particles (many, small, float upward)
    const mists: Particle[] = Array.from({ length: 12 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 0.6 + Math.random() * 1.4;
      return {
        id:       nextId(),
        position: new THREE.Vector3(
          position[0] + (Math.random() - 0.5) * 0.2,
          position[1] + 0.1,
          position[2] + (Math.random() - 0.5) * 0.2,
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * spd,
          0.5 + Math.random() * 1.0,
          Math.sin(angle) * spd,
        ),
        color: P.pearl,
        age:      0,
        maxAge:   0.8 + Math.random() * 0.6,
        size:     0.06 + Math.random() * 0.09,
        type:     "mist",
      };
    });

    // Droplets (tiny, fast, arc)
    const drops: Particle[] = Array.from({ length: 10 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 4 + Math.random() * 6;
      return {
        id:       nextId(),
        position: new THREE.Vector3(...position),
        velocity: new THREE.Vector3(
          Math.cos(angle) * spd,
          1.5 + Math.random() * 4,
          Math.sin(angle) * spd,
        ),
        color,
        age:      0,
        maxAge:   0.3 + Math.random() * 0.25,
        size:     0.022 + Math.random() * 0.032,
        type:     "droplet",
      };
    });

    setParticles(prev => [...prev.slice(-96), ...blobs, ...mists, ...drops]);
  }, []);

  // ── Spawn shockwave ───────────────────────────────────────
  const spawnShockwave = useCallback((
    position:  [number, number, number],
    color:     string,
    maxRadius  = 2.0,
  ) => {
    const sw: Shockwave = {
      id:        nextId(),
      position,
      color,
      radius:    0.05,
      maxRadius,
      age:       0,
      maxAge:    0.55,
    };
    setShockwaves(prev => [...prev.slice(-8), sw]);
  }, []);

  // ── Spawn muzzle flash ────────────────────────────────────
  const spawnMuzzleFlash = useCallback((
    position: [number, number, number],
    color:    string,
    rotation  = 0,
  ) => {
    const fl: MuzzleFlash = {
      id:       nextId(),
      position,
      rotation,
      color,
      age:      0,
      maxAge:   0.11,
    };
    setFlashes(prev => [...prev.slice(-4), fl]);
  }, []);

  return {
    splats,     setSplats,
    projectiles,setProjectiles,
    particles,  setParticles,
    shockwaves, setShockwaves,
    flashes,    setFlashes,
    spawnProjectile,
    spawnHitEffect,
    spawnShockwave,
    spawnMuzzleFlash,
  };
}

// ─────────────────────────────────────────────────────────────
//  Ground paint splat decal (circle + drip trails)
// ─────────────────────────────────────────────────────────────

function PaintSplatDecal({ splat }: { splat: PaintSplat }) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const opRef    = useRef(splat.opacity);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    opRef.current = Math.max(0, opRef.current - dt * 0.028);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opRef.current;
  });

  return (
    <group>
      {/* Main splat circle */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, splat.rotation]}
        position={splat.position}
      >
        <circleGeometry args={[splat.scale, 14]} />
        <meshStandardMaterial color={splat.color} roughness={0.92}
          transparent opacity={splat.opacity} depthWrite={false} />
      </mesh>

      {/* Irregular edge blobs */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + splat.rotation;
        const r     = splat.scale * (0.68 + Math.random() * 0.38);
        const bx    = splat.position[0] + Math.cos(angle) * r;
        const bz    = splat.position[2] + Math.sin(angle) * r;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, angle * 1.4 + i]} position={[bx, 0.013, bz]}>
            <circleGeometry args={[splat.scale * (0.18 + (i % 3) * 0.09), 8]} />
            <meshStandardMaterial color={splat.color} roughness={0.95}
              transparent opacity={splat.opacity * 0.62} depthWrite={false} />
          </mesh>
        );
      })}

      {/* Drip trails */}
      {Array.from({ length: splat.dripCount }).map((_, i) => {
        const dAngle = splat.rotation + (i / splat.dripCount) * Math.PI * 2 + 0.3;
        const dLen   = splat.scale * (0.45 + (i % 3) * 0.35);
        const dX     = splat.position[0] + Math.cos(dAngle) * (splat.scale + dLen * 0.5);
        const dZ     = splat.position[2] + Math.sin(dAngle) * (splat.scale + dLen * 0.5);
        return (
          <mesh key={`d${i}`}
            rotation={[-Math.PI / 2, 0, dAngle + Math.PI / 2]}
            position={[dX, 0.013, dZ]}>
            <capsuleGeometry args={[splat.scale * 0.055, dLen, 3, 6]} />
            <meshStandardMaterial color={splat.color} roughness={0.95}
              transparent opacity={splat.opacity * 0.50} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Paintball projectile  (glowing pearl sphere on arc)
// ─────────────────────────────────────────────────────────────

interface ProjectileProps {
  projectile: Projectile;
  onHit:      (id: number, pos: [number, number, number]) => void;
  timeScale?: number;
}

function PaintballProjectile({ projectile, onHit, timeScale = 1 }: ProjectileProps) {
  const meshRef   = useRef<THREE.Mesh>(null);
  const trailRef  = useRef<THREE.Mesh[]>([]);
  const posRef    = useRef(projectile.position.clone());
  const velRef    = useRef(projectile.velocity.clone());
  const ageRef    = useRef(0);
  const hitRef    = useRef(false);

  // Trail positions ring buffer
  const trailPos  = useRef<THREE.Vector3[]>(Array.from({ length: 6 }, () => posRef.current.clone()));
  const trailHead = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current || hitRef.current) return;
    const scaledDt = dt * timeScale;
    ageRef.current += scaledDt;

    // Gravity + velocity
    velRef.current.y -= 7.2 * scaledDt;
    posRef.current.addScaledVector(velRef.current, scaledDt);
    meshRef.current.position.copy(posRef.current);

    // Rotate for visual interest
    meshRef.current.rotation.x += scaledDt * 4;
    meshRef.current.rotation.z += scaledDt * 3;

    // Trail update
    trailHead.current = (trailHead.current + 1) % 6;
    trailPos.current[trailHead.current].copy(posRef.current);

    // Update trail meshes
    trailRef.current.forEach((tm, i) => {
      if (!tm) return;
      const idx = ((trailHead.current - i - 1) + 6) % 6;
      tm.position.copy(trailPos.current[idx]);
      const age_factor = 1 - i / 6;
      (tm.material as THREE.MeshBasicMaterial).opacity = age_factor * 0.38;
      tm.scale.setScalar(age_factor * 0.72);
    });

    // Hit detection
    const hitGround   = posRef.current.y <= 0.05;
    const hitTimeout  = ageRef.current > 2.5;
    const hitDistance = posRef.current.length() > 22;

    if ((hitGround || hitTimeout || hitDistance) && !hitRef.current) {
      hitRef.current = true;
      onHit(projectile.id, posRef.current.toArray() as [number,number,number]);
    }
  });

  const startPos = projectile.position.toArray() as [number, number, number];

  return (
    <group>
      {/* Main ball */}
      <mesh ref={meshRef} position={startPos} castShadow>
        <sphereGeometry args={[0.068, 9, 9]} />
        <meshStandardMaterial
          color={projectile.color}
          roughness={0.28}
          metalness={0.18}
          emissive={projectile.color}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Pearl outer glow layer */}
      <mesh position={startPos} ref={m => { if (m) trailRef.current[5] = m; }}>
        <sphereGeometry args={[0.096, 7, 7]} />
        <meshBasicMaterial color={P.white} transparent opacity={0.18} />
      </mesh>

      {/* Trail ghosts */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={startPos} ref={m => { if (m) trailRef.current[i] = m; }}>
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshBasicMaterial color={projectile.color} transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Point light that travels with ball */}
      <pointLight
        position={startPos}
        color={projectile.color}
        intensity={0.85}
        distance={2.2}
        decay={2}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Paint particle  (blob / mist / droplet)
// ─────────────────────────────────────────────────────────────

interface ParticleProps {
  particle:  Particle;
  onDead:    (id: number) => void;
  timeScale?: number;
}

function PaintParticle({ particle, onDead, timeScale = 1 }: ParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posRef  = useRef(particle.position.clone());
  const velRef  = useRef(particle.velocity.clone());
  const ageRef  = useRef(0);
  const deadRef = useRef(false);

  useFrame((_, dt) => {
    if (!meshRef.current || deadRef.current) return;
    const scaledDt = dt * timeScale;
    ageRef.current += scaledDt;

    // Physics by type
    if (particle.type === "droplet") {
      velRef.current.y -= 14 * scaledDt;
      velRef.current.multiplyScalar(0.94);
    } else if (particle.type === "mist") {
      velRef.current.y -= 0.8 * scaledDt;
      velRef.current.multiplyScalar(0.97);
    } else {
      velRef.current.y -= 9.2 * scaledDt;
      velRef.current.multiplyScalar(0.96);
    }

    posRef.current.addScaledVector(velRef.current, scaledDt);
    meshRef.current.position.copy(posRef.current);

    // Fade
    const prog = ageRef.current / particle.maxAge;
    const mat  = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity  = Math.max(0, 1 - prog * (particle.type === "mist" ? 1.2 : 1));
    const scale  = particle.type === "mist"
      ? 1 + prog * 1.4
      : 1 - prog * 0.4;
    meshRef.current.scale.setScalar(scale);

    if (ageRef.current >= particle.maxAge) {
      deadRef.current = true;
      onDead(particle.id);
    }
  });

  const roughness  = particle.type === "mist"   ? 0.95 : 0.25;
  const metalness  = particle.type === "droplet" ? 0.1  : 0.0;
  const emissiveI  = particle.type === "blob"    ? 0.08 : 0.0;

  return (
    <mesh
      ref={meshRef}
      position={particle.position.toArray() as [number, number, number]}
    >
      <sphereGeometry args={[particle.size, particle.type === "mist" ? 6 : 8, 6]} />
      <meshStandardMaterial
        color={particle.color}
        roughness={roughness}
        metalness={metalness}
        emissive={particle.type === "blob" ? particle.color : undefined}
        emissiveIntensity={emissiveI}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shockwave ring  (gold expanding disc)
// ─────────────────────────────────────────────────────────────

interface ShockwaveProps {
  sw:      Shockwave;
  onDone:  (id: number) => void;
  timeScale?: number;
}

function ShockwaveRing({ sw: wave, onDone, timeScale = 1 }: ShockwaveProps) {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ageRef   = useRef(0);
  const doneRef  = useRef(false);

  useFrame((_, dt) => {
    if (doneRef.current) return;
    ageRef.current += dt * timeScale;
    const prog = ageRef.current / wave.maxAge;
    const r    = wave.maxRadius * Math.pow(prog, 0.72);

    if (innerRef.current) {
      innerRef.current.scale.set(r, 1, r);
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, (1 - prog) * 0.55);
    }
    if (outerRef.current) {
      outerRef.current.scale.set(r * 1.18, 1, r * 1.18);
      const mat = outerRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, (1 - prog) * 0.28);
    }

    if (prog >= 1) {
      doneRef.current = true;
      onDone(wave.id);
    }
  });

  return (
    <group position={wave.position}>
      {/* Gold fill ring */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[0.92, 1.0, 28]} />
        <meshStandardMaterial
          color={P.gold}
          roughness={0.22} metalness={0.75}
          emissive={P.gold} emissiveIntensity={0.35}
          transparent opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wider translucent outer ring */}
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <ringGeometry args={[0.88, 1.08, 24]} />
        <meshStandardMaterial
          color={wave.color}
          roughness={0.45} metalness={0.20}
          transparent opacity={0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Center splash disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[0.35, 1, 0.35]}>
        <circleGeometry args={[1.0, 14]} />
        <meshStandardMaterial
          color={wave.color}
          roughness={0.88}
          transparent opacity={0.32}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Muzzle flash  (bright burst + gold rays)
// ─────────────────────────────────────────────────────────────

interface FlashProps {
  flash:   MuzzleFlash;
  onDone:  (id: number) => void;
  timeScale?: number;
}

function MuzzleFlashEffect({ flash, onDone, timeScale = 1 }: FlashProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ageRef   = useRef(0);
  const doneRef  = useRef(false);

  useFrame((_, dt) => {
    if (!groupRef.current || doneRef.current) return;
    ageRef.current += dt * timeScale;
    const prog = ageRef.current / flash.maxAge;
    const fade = 1 - prog;

    groupRef.current.children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        const mat = c.material as THREE.MeshBasicMaterial;
        if (mat.transparent) mat.opacity = fade * (c.userData.baseOpacity ?? 1);
      }
    });
    groupRef.current.scale.setScalar(1 + prog * 0.65);

    if (prog >= 1) {
      doneRef.current = true;
      onDone(flash.id);
    }
  });

  return (
    <group ref={groupRef} position={flash.position} rotation={[0, flash.rotation, 0]}>
      {/* Core white disc */}
      <mesh userData={{ baseOpacity: 0.95 }}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} />
      </mesh>
      {/* Team-color mid glow */}
      <mesh userData={{ baseOpacity: 0.72 }}>
        <sphereGeometry args={[0.090, 8, 8]} />
        <meshBasicMaterial color={flash.color} transparent opacity={0.72} />
      </mesh>
      {/* Gold outer halo */}
      <mesh userData={{ baseOpacity: 0.32 }}>
        <sphereGeometry args={[0.145, 8, 8]} />
        <meshBasicMaterial color={P.gold} transparent opacity={0.32} />
      </mesh>
      {/* Pearl outer puff */}
      <mesh userData={{ baseOpacity: 0.14 }}>
        <sphereGeometry args={[0.225, 6, 6]} />
        <meshBasicMaterial color={P.pearl} transparent opacity={0.14} />
      </mesh>
      {/* Gold rays (8 directions) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const r = (deg * Math.PI) / 180;
        return (
          <mesh key={deg}
            position={[Math.cos(r) * 0.10, Math.sin(r) * 0.10, 0]}
            rotation={[0, 0, r]}
            userData={{ baseOpacity: 0.60 }}>
            <boxGeometry args={[0.12, 0.010, 0.006]} />
            <meshBasicMaterial color={P.gold} transparent opacity={0.60} />
          </mesh>
        );
      })}
      {/* Point light */}
      <pointLight color={flash.color} intensity={3.2} distance={3.2} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Wall paint splat  (vertical surface decal)
// ─────────────────────────────────────────────────────────────

interface WallSplatProps {
  position: [number, number, number];
  color:    string;
  scale:    number;
  rotation: number;
  normal:   [number, number, number]; // wall normal direction
}

function WallSplat({ position, color, scale, rotation, normal }: WallSplatProps) {
  const rotQuat = useMemo_vec3(normal);

  return (
    <group position={position} quaternion={rotQuat}>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[scale, 12]} />
        <meshStandardMaterial color={color} roughness={0.92}
          transparent opacity={0.78} depthWrite={false} />
      </mesh>
      {/* Vertical drip from wall splat */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[(i - 1) * scale * 0.3, -scale * (0.6 + i * 0.4), 0.007]}>
          <capsuleGeometry args={[scale * 0.06, scale * (0.35 + Math.random() * 0.5), 3, 5]} />
          <meshStandardMaterial color={color} roughness={0.95}
            transparent opacity={0.52} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Utility: compute quaternion to align a mesh's +Z with a normal vector
function useMemo_vec3(normal: [number, number, number]): THREE.Quaternion {
  const n = new THREE.Vector3(...normal).normalize();
  const z = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(z, n);
  return q;
}

// ─────────────────────────────────────────────────────────────
//  Animated paint drip column  (vertical surface paint-fall)
//  Drip appears at a given world position and slowly falls
//  before fading out.  Used when a player is hit on a wall.
// ─────────────────────────────────────────────────────────────

export interface PaintDrip {
  id:       number;
  position: [number, number, number];
  color:    string;
  length:   number;
  width:    number;
  age:      number;
  maxAge:   number;
  speed:    number;  // world units / second
}

interface DripProps {
  drip:    PaintDrip;
  onDead:  (id: number) => void;
  timeScale?: number;
}

function PaintDripColumn({ drip, onDead, timeScale = 1 }: DripProps) {
  const groupRef  = useRef<THREE.Group>(null);
  const meshRef   = useRef<THREE.Mesh>(null);
  const ageRef    = useRef(0);
  const dropY     = useRef(0);
  const deadRef   = useRef(false);

  useFrame((_, dt) => {
    if (!groupRef.current || !meshRef.current || deadRef.current) return;
    const scaledDt = dt * timeScale;
    ageRef.current += scaledDt;
    dropY.current  -= drip.speed * scaledDt;

    // Move group downward
    groupRef.current.position.y = drip.position[1] + dropY.current;

    // Stretch mesh to simulate filling
    const growProg  = Math.min(ageRef.current / (drip.maxAge * 0.45), 1);
    const fadeOut   = ageRef.current > drip.maxAge * 0.6
      ? 1 - (ageRef.current - drip.maxAge * 0.6) / (drip.maxAge * 0.4)
      : 1;

    meshRef.current.scale.y = growProg;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0, fadeOut * 0.72);

    if (ageRef.current >= drip.maxAge) {
      deadRef.current = true;
      onDead(drip.id);
    }
  });

  return (
    <group ref={groupRef} position={drip.position}>
      {/* Main drip column */}
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[drip.width, drip.length, 4, 8]} />
        <meshStandardMaterial
          color={drip.color} roughness={0.88}
          transparent opacity={0.72} depthWrite={false}
        />
      </mesh>
      {/* Round tip at bottom */}
      <mesh position={[0, -drip.length / 2, 0]}>
        <sphereGeometry args={[drip.width * 1.4, 7, 7]} />
        <meshStandardMaterial
          color={drip.color} roughness={0.88}
          transparent opacity={0.62} depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Volumetric smoke cloud  — several overlapping puffs
// ─────────────────────────────────────────────────────────────

export interface SmokeCloud {
  id:        number;
  position:  [number, number, number];
  color:     string;
  puffCount: number;
  spread:    number;
  age:       number;
  maxAge:    number;
}

interface SmokeCloudProps {
  cloud:   SmokeCloud;
  onDead:  (id: number) => void;
  timeScale?: number;
}

function SmokeCloudEffect({ cloud, onDead, timeScale = 1 }: SmokeCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ageRef   = useRef(0);
  const deadRef  = useRef(false);

  // Pre-compute random puff offsets (stable between renders)
  const puffData = useMemo(() => {
    return Array.from({ length: cloud.puffCount }).map((_, i) => ({
      ox:   (Math.random() - 0.5) * cloud.spread,
      oy:   Math.random() * cloud.spread * 0.6,
      oz:   (Math.random() - 0.5) * cloud.spread,
      r:    0.12 + Math.random() * 0.22,
      seed: i * 1.618,
    }));
  }, [cloud.puffCount, cloud.spread]);

  useFrame((state, dt) => {
    if (!groupRef.current || deadRef.current) return;
    const scaledDt = dt * timeScale;
    ageRef.current += scaledDt;
    const t    = state.clock.elapsedTime;
    const prog = ageRef.current / cloud.maxAge;

    groupRef.current.children.forEach((child, i) => {
      if (!(child instanceof THREE.Mesh)) return;
      const pd  = puffData[i];
      if (!pd) return;

      // Slow drift upward
      child.position.y = pd.oy + prog * 0.55 + Math.sin(t * 0.8 + pd.seed) * 0.04;

      // Expand + fade
      const scale = pd.r * (1 + prog * 1.6);
      child.scale.setScalar(scale);
      const mat   = child.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, (1 - prog) * 0.22);
    });

    if (prog >= 1) {
      deadRef.current = true;
      onDead(cloud.id);
    }
  });

  return (
    <group ref={groupRef} position={cloud.position}>
      {puffData.map((pd, i) => (
        <mesh key={i} position={[pd.ox, pd.oy, pd.oz]}>
          <sphereGeometry args={[pd.r, 7, 7]} />
          <meshStandardMaterial
            color={P.pearl} roughness={0.98}
            transparent opacity={0.22} depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Spark emitter — tiny gold sparks on impact
//  Differentiates from paint particles by being metallic
//  and shorter-lived.
// ─────────────────────────────────────────────────────────────

export interface Spark {
  id:       number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age:      number;
  maxAge:   number;
  size:     number;
}

interface SparkProps {
  spark:   Spark;
  onDead:  (id: number) => void;
  timeScale?: number;
}

function SparkParticle({ spark, onDead, timeScale = 1 }: SparkProps) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const posRef   = useRef(spark.position.clone());
  const velRef   = useRef(spark.velocity.clone());
  const ageRef   = useRef(0);
  const deadRef  = useRef(false);

  useFrame((_, dt) => {
    if (!meshRef.current || deadRef.current) return;
    const scaledDt = dt * timeScale;
    ageRef.current += scaledDt;

    velRef.current.y -= 18 * scaledDt;
    velRef.current.multiplyScalar(0.92);
    posRef.current.addScaledVector(velRef.current, scaledDt);
    meshRef.current.position.copy(posRef.current);

    // Bounce off ground
    if (posRef.current.y < 0.04) {
      posRef.current.y = 0.04;
      velRef.current.y = Math.abs(velRef.current.y) * 0.35;
    }

    // Streak trail mesh
    if (trailRef.current) {
      const trailLen = velRef.current.length() * 0.06;
      trailRef.current.scale.set(1, trailLen, 1);
      const dir = velRef.current.clone().normalize();
      trailRef.current.position.copy(posRef.current)
        .addScaledVector(dir, -trailLen * 0.5);
      const mat = trailRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - ageRef.current / spark.maxAge) * 0.65;
    }

    const prog = ageRef.current / spark.maxAge;
    const mat  = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - prog * 1.4);

    if (ageRef.current >= spark.maxAge) {
      deadRef.current = true;
      onDead(spark.id);
    }
  });

  const startArr = spark.position.toArray() as [number, number, number];

  return (
    <group>
      <mesh ref={meshRef} position={startArr}>
        <sphereGeometry args={[spark.size, 4, 4]} />
        <meshBasicMaterial color={P.lightGold} transparent opacity={1} />
      </mesh>
      <mesh ref={trailRef} position={startArr}>
        <boxGeometry args={[spark.size * 0.4, 1, spark.size * 0.4]} />
        <meshBasicMaterial color={P.gold} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Impact stamp  — pearl paint impression on a flat surface
//  Shaped like a star/splat instead of a simple circle.
// ─────────────────────────────────────────────────────────────

export interface ImpactStamp {
  id:       number;
  position: [number, number, number];
  color:    string;
  scale:    number;
  angle:    number;
  opacity:  number;
  rays:     number;
}

function ImpactStampDecal({ stamp }: { stamp: ImpactStamp }) {
  const groupRef = useRef<THREE.Group>(null);
  const opRef    = useRef(stamp.opacity);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    opRef.current = Math.max(0, opRef.current - dt * 0.015);
    groupRef.current.children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        (c.material as THREE.MeshStandardMaterial).opacity = opRef.current;
      }
    });
  });

  const points = Array.from({ length: stamp.rays }).map((_, i) => {
    const a1 = (i / stamp.rays) * Math.PI * 2 + stamp.angle;
    const a2 = a1 + Math.PI / stamp.rays;
    return { a1, a2 };
  });

  return (
    <group
      ref={groupRef}
      rotation={[-Math.PI / 2, 0, stamp.angle]}
      position={stamp.position}
    >
      {/* Center disc */}
      <mesh>
        <circleGeometry args={[stamp.scale * 0.38, 12]} />
        <meshStandardMaterial
          color={stamp.color} roughness={0.95}
          transparent opacity={stamp.opacity} depthWrite={false}
        />
      </mesh>
      {/* Star rays */}
      {points.map(({ a1, a2 }, i) => {
        const midA = (a1 + a2) / 2;
        const len  = stamp.scale * (0.55 + (i % 3) * 0.25);
        return (
          <mesh key={i}
            position={[
              Math.cos(midA) * len * 0.45,
              Math.sin(midA) * len * 0.45,
              0.001,
            ]}
            rotation={[0, 0, midA + Math.PI / 2]}
          >
            <capsuleGeometry args={[stamp.scale * 0.07, len * 0.72, 3, 5]} />
            <meshStandardMaterial
              color={stamp.color} roughness={0.95}
              transparent opacity={stamp.opacity * 0.68} depthWrite={false}
            />
          </mesh>
        );
      })}
      {/* Small satellite dots */}
      {points.map(({ a1 }, i) => {
        const r = stamp.scale * (0.72 + (i % 4) * 0.18);
        return (
          <mesh key={`d${i}`} position={[Math.cos(a1) * r, Math.sin(a1) * r, 0.002]}>
            <circleGeometry args={[stamp.scale * 0.065, 6]} />
            <meshStandardMaterial
              color={stamp.color} roughness={0.95}
              transparent opacity={stamp.opacity * 0.52} depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Projectile trail ribbon  — a smooth glowing ribbon behind
//  fast projectiles (used for slow-motion shots).
// ─────────────────────────────────────────────────────────────

export interface TrailPoint {
  position: THREE.Vector3;
  age:      number;
}

export interface ProjectileTrail {
  id:     number;
  points: TrailPoint[];
  color:  string;
  width:  number;
}

function TrailRibbon({ trail }: { trail: ProjectileTrail }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Build a simple tube from the last N positions
  const geometry = useMemo(() => {
    if (trail.points.length < 2) return new THREE.BufferGeometry();
    const pts   = trail.points.map(p => p.position);
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, Math.max(2, pts.length * 2), trail.width * 0.5, 5, false);
  }, [trail.points, trail.width]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color={trail.color}
        transparent opacity={0.42}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  Object-pool helpers  (prevent GC spikes in high-fire-rate)
// ─────────────────────────────────────────────────────────────

/**
 * A minimal typed object pool.
 * In a production game this would pre-allocate a fixed count
 * of THREE.Mesh instances and re-use them.  Here we implement
 * the pool contract so the hook returns typed acquire/release.
 */
export class EffectPool<T extends { id: number; alive?: boolean }> {
  private pool:    T[]   = [];
  private active:  T[]   = [];
  private maxSize: number;
  private factory: () => T;

  constructor(factory: () => T, maxSize = 32) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  acquire(overrides: Partial<T>): T | null {
    let item = this.pool.pop();
    if (!item) {
      if (this.active.length >= this.maxSize) return null;
      item = this.factory();
    }
    Object.assign(item, overrides);
    this.active.push(item);
    return item;
  }

  release(id: number): void {
    const idx = this.active.findIndex(i => i.id === id);
    if (idx === -1) return;
    const [item] = this.active.splice(idx, 1);
    this.pool.push(item);
  }

  getActive(): T[] { return this.active; }
  clear():     void { this.pool = []; this.active = []; }
}

// ─────────────────────────────────────────────────────────────
//  Extended usePaintEffects hook  (adds drips, clouds, sparks)
// ─────────────────────────────────────────────────────────────

export function usePaintEffectsExtended() {
  const base       = usePaintEffects();
  const [drips,    setDrips]    = useState<PaintDrip[]>([]);
  const [clouds,   setClouds]   = useState<SmokeCloud[]>([]);
  const [sparks,   setSparks]   = useState<Spark[]>([]);
  const [stamps,   setStamps]   = useState<ImpactStamp[]>([]);
  const [trails,   setTrails]   = useState<ProjectileTrail[]>([]);

  const spawnDrip = useCallback((
    position: [number, number, number],
    color:    string,
    length    = 0.35,
    speed     = 0.55,
  ) => {
    const d: PaintDrip = {
      id:       nextId(),
      position: [position[0], position[1], position[2]],
      color,
      length,
      width:    0.028 + Math.random() * 0.022,
      age:      0,
      maxAge:   2.2 + Math.random() * 1.0,
      speed,
    };
    setDrips(prev => [...prev.slice(-18), d]);
  }, []);

  const spawnSmokeCloud = useCallback((
    position:  [number, number, number],
    puffCount  = 6,
    spread     = 0.45,
  ) => {
    const c: SmokeCloud = {
      id:        nextId(),
      position,
      color:     P.pearl,
      puffCount,
      spread,
      age:       0,
      maxAge:    1.8 + Math.random() * 0.8,
    };
    setClouds(prev => [...prev.slice(-8), c]);
  }, []);

  const spawnSparks = useCallback((
    position: [number, number, number],
    count     = 8,
  ) => {
    const newSparks: Spark[] = Array.from({ length: count }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const elev  = Math.PI * 0.1 + Math.random() * Math.PI * 0.35;
      const spd   = 5 + Math.random() * 9;
      return {
        id:       nextId(),
        position: new THREE.Vector3(...position),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elev) * spd,
          Math.sin(elev) * spd,
          Math.sin(angle) * Math.cos(elev) * spd,
        ),
        age:      0,
        maxAge:   0.28 + Math.random() * 0.22,
        size:     0.012 + Math.random() * 0.018,
      };
    });
    setSparks(prev => [...prev.slice(-48), ...newSparks]);
  }, []);

  const spawnStamp = useCallback((
    position: [number, number, number],
    color:    string,
    scale     = 0.45,
    rays      = 7,
  ) => {
    const st: ImpactStamp = {
      id:      nextId(),
      position:[position[0], 0.008, position[2]],
      color,
      scale,
      angle:   Math.random() * Math.PI * 2,
      opacity: 0.82,
      rays,
    };
    setStamps(prev => [...prev.slice(-20), st]);
  }, []);

  // Full hit effect (combines base + extended)
  const spawnFullHit = useCallback((
    position: [number, number, number],
    color:    string,
    radius    = 1.0,
  ) => {
    base.spawnHitEffect(position, color, radius);
    base.spawnShockwave(position, color, radius * 2.2);
    spawnSmokeCloud(position, 5, 0.38 * radius);
    spawnSparks(position, 10);
    spawnStamp(position, color, 0.42 * radius);
    // Add vertical drips around hit point
    for (let i = 0; i < 3; i++) {
      const offset: [number, number, number] = [
        position[0] + (Math.random() - 0.5) * 0.3,
        position[1] + 1.4 + Math.random() * 0.4,
        position[2] + (Math.random() - 0.5) * 0.3,
      ];
      spawnDrip(offset, color, 0.25 + Math.random() * 0.25, 0.4 + Math.random() * 0.3);
    }
  }, [base, spawnSmokeCloud, spawnSparks, spawnStamp, spawnDrip]);

  return {
    ...base,
    drips,   setDrips,
    clouds,  setClouds,
    sparks,  setSparks,
    stamps,  setStamps,
    trails,  setTrails,
    spawnDrip,
    spawnSmokeCloud,
    spawnSparks,
    spawnStamp,
    spawnFullHit,
  };
}

// ─────────────────────────────────────────────────────────────
//  Extended renderer (includes all effect types)
// ─────────────────────────────────────────────────────────────

export interface PaintEffectsExtendedProps extends PaintEffectsRendererProps {
  drips?:         PaintDrip[];
  clouds?:        SmokeCloud[];
  sparks?:        Spark[];
  stamps?:        ImpactStamp[];
  trails?:        ProjectileTrail[];
  onDripDead?:    (id: number) => void;
  onCloudDead?:   (id: number) => void;
  onSparkDead?:   (id: number) => void;
}

export function PaintEffectsExtendedRenderer({
  drips          = [],
  clouds         = [],
  sparks         = [],
  stamps         = [],
  trails         = [],
  onDripDead,
  onCloudDead,
  onSparkDead,
  timeScale      = 1,
  ...baseProps
}: PaintEffectsExtendedProps) {
  const noop = useCallback((_id: number) => {}, []);

  return (
    <group name="paint-effects-extended">
      {/* Base effects */}
      <PaintEffectsRenderer {...baseProps} timeScale={timeScale} />

      {/* Impact stamps (star splats) */}
      {stamps.map(st => (
        <ImpactStampDecal key={st.id} stamp={st} />
      ))}

      {/* Paint drip columns */}
      {drips.map(d => (
        <PaintDripColumn key={d.id} drip={d} onDead={onDripDead ?? noop} timeScale={timeScale} />
      ))}

      {/* Smoke clouds */}
      {clouds.map(c => (
        <SmokeCloudEffect key={c.id} cloud={c} onDead={onCloudDead ?? noop} timeScale={timeScale} />
      ))}

      {/* Gold sparks */}
      {sparks.map(s => (
        <SparkParticle key={s.id} spark={s} onDead={onSparkDead ?? noop} timeScale={timeScale} />
      ))}

      {/* Projectile trail ribbons */}
      {trails.map(t => (
        <TrailRibbon key={t.id} trail={t} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Laser sight beam  — rendered as a thin cylinder from
//  muzzle toward aim point, used in aiming-mode VFX
// ─────────────────────────────────────────────────────────────

interface LaserSightProps {
  from:    THREE.Vector3;
  to:      THREE.Vector3;
  color:   string;
  visible: boolean;
}

export function LaserSight({ from, to, color, visible }: LaserSightProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const direction = to.clone().sub(from);
  const length    = direction.length();
  const midPoint  = from.clone().add(direction.clone().multiplyScalar(0.5));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return;
    const pulse = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 18);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = visible ? pulse * 0.65 : 0;
    (glowRef.current.material as THREE.MeshBasicMaterial).opacity = visible ? pulse * 0.22 : 0;
  });

  return (
    <group position={midPoint} quaternion={quaternion}>
      {/* Core beam */}
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.007, 0.007, length, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      {/* Wide soft glow */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.038, 0.038, length, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <pointLight color={color} intensity={0.35} distance={3.5} decay={2.5} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Scorch mark  — dark oval burned onto the ground after
//  a grenade-style explosion (luxury edition uses gold ring)
// ─────────────────────────────────────────────────────────────

export interface ScorchMark {
  id:       number;
  position: [number, number, number];
  radius:   number;
  opacity:  number;
}

function ScorchMarkDecal({ mark }: { mark: ScorchMark }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const opRef   = useRef(mark.opacity);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    opRef.current = Math.max(0, opRef.current - dt * 0.008);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opRef.current;
  });

  return (
    <group>
      {/* Dark center */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={mark.position}>
        <circleGeometry args={[mark.radius, 18]} />
        <meshStandardMaterial color={P.charcoal} roughness={0.98}
          transparent opacity={mark.opacity} depthWrite={false} />
      </mesh>
      {/* Gold ring accent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mark.position[0], mark.position[1] + 0.005, mark.position[2]]}>
        <ringGeometry args={[mark.radius * 0.82, mark.radius * 1.02, 18]} />
        <meshStandardMaterial color={P.gold} roughness={0.72}
          transparent opacity={mark.opacity * 0.38} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Export ScorchMark renderer helper so GameScene3D can use it
export function ScorchMarksRenderer({ marks }: { marks: ScorchMark[] }) {
  return (
    <group>
      {marks.map(m => <ScorchMarkDecal key={m.id} mark={m} />)}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
//  Network-layer stubs for backend integration
//  (matches Manus platform contract)
// ─────────────────────────────────────────────────────────────

export interface BackendMovePayload {
  playerId:  string;
  position:  [number, number, number];
  rotation:  number;
  timestamp: number;
}

export interface BackendHitPayload {
  shooterId: string;
  targetId:  string;
  position:  [number, number, number];
  damage:    number;
  timestamp: number;
}

/**
 * submitMove  — send player position/rotation to backend.
 * Replace the stub body with your actual fetch/socket call.
 */
export async function submitMove(payload: BackendMovePayload): Promise<void> {
  // TODO: replace with real backend call
  // await fetch('/api/game/move', { method:'POST', body:JSON.stringify(payload) });
  console.debug("[KOBK] submitMove", payload);
}

/**
 * submitHit  — report a confirmed hit to backend.
 */
export async function submitHit(payload: BackendHitPayload): Promise<void> {
  // TODO: replace with real backend call
  // await fetch('/api/game/hit', { method:'POST', body:JSON.stringify(payload) });
  console.debug("[KOBK] submitHit", payload);
}

/**
 * getEffectConfig  — fetch server-side VFX config
 * (e.g. paint colors, effect intensities).
 */
export async function getEffectConfig(): Promise<Record<string, unknown>> {
  // TODO: replace with real backend call
  return {
    particleScale:   1.0,
    splatPersist:    true,
    shockwaveEnable: true,
    maxSplats:       24,
    luxMode:         true,
  };
}

// ─────────────────────────────────────────────────────────────
//  Type re-exports (convenience)
// ─────────────────────────────────────────────────────────────

export type { PaintSplat, Projectile, Particle, Shockwave, MuzzleFlash };

// ─────────────────────────────────────────────────────────────
//  Smoke puff  (pearl volumetric orb, rises and fades)
// ─────────────────────────────────────────────────────────────

interface SmokePuffProps {
  position: [number, number, number];
  color:    string;
  radius:   number;
  age:      number;
  maxAge:   number;
  onDead:   () => void;
}

function SmokePuff({ position, color, radius, age, maxAge, onDead }: SmokePuffProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ageRef  = useRef(age);
  const deadRef = useRef(false);

  useFrame((_, dt) => {
    if (!meshRef.current || deadRef.current) return;
    ageRef.current += dt;
    const p = ageRef.current / maxAge;
    meshRef.current.position.y = position[1] + p * 0.45;
    const s = 1 + p * 1.8;
    meshRef.current.scale.setScalar(s);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, (1 - p) * 0.28);
    if (ageRef.current >= maxAge) { deadRef.current = true; onDead(); }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshStandardMaterial color={color} roughness={0.98}
        transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
//  Props for the main renderer
// ─────────────────────────────────────────────────────────────

export interface PaintEffectsRendererProps {
  splats:          PaintSplat[];
  projectiles:     Projectile[];
  particles:       Particle[];
  shockwaves:      Shockwave[];
  flashes:         MuzzleFlash[];
  timeScale?:      number;
  onProjectileHit: (id: number, pos: [number, number, number]) => void;
  onParticleDead:  (id: number) => void;
  onShockwaveDone: (id: number) => void;
  onFlashDone:     (id: number) => void;
}

// ─────────────────────────────────────────────────────────────
//  Main renderer
// ─────────────────────────────────────────────────────────────

export default function PaintEffectsRenderer({
  splats,
  projectiles,
  particles,
  shockwaves,
  flashes,
  timeScale     = 1,
  onProjectileHit,
  onParticleDead,
  onShockwaveDone,
  onFlashDone,
}: PaintEffectsRendererProps) {
  return (
    <group name="paint-effects">

      {/* ── Ground splats ───────────────────────────────── */}
      {splats.map(s => (
        <PaintSplatDecal key={s.id} splat={s} />
      ))}

      {/* ── Projectiles ─────────────────────────────────── */}
      {projectiles.filter(p => p.alive).map(p => (
        <PaintballProjectile
          key={p.id}
          projectile={p}
          onHit={onProjectileHit}
          timeScale={timeScale}
        />
      ))}

      {/* ── Burst particles ─────────────────────────────── */}
      {particles.map(p => (
        <PaintParticle
          key={p.id}
          particle={p}
          onDead={onParticleDead}
          timeScale={timeScale}
        />
      ))}

      {/* ── Shockwave rings ─────────────────────────────── */}
      {shockwaves.map(sw => (
        <ShockwaveRing
          key={sw.id}
          sw={sw}
          onDone={onShockwaveDone}
          timeScale={timeScale}
        />
      ))}

      {/* ── Muzzle flashes ──────────────────────────────── */}
      {flashes.map(fl => (
        <MuzzleFlashEffect
          key={fl.id}
          flash={fl}
          onDone={onFlashDone}
          timeScale={timeScale}
        />
      ))}

    </group>
  );
}
