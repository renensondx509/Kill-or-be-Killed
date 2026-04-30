import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Paint splat decal on ground/surface ──
interface PaintSplat {
  id: number;
  position: [number, number, number];
  color: string;
  scale: number;
  rotation: number;
  opacity: number;
}

// ── Flying paintball projectile ──
interface Projectile {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  age: number;
  alive: boolean;
}

// ── Paint burst particle ──
interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  age: number;
  maxAge: number;
  size: number;
}

let nextId = 0;

export function usePaintEffects() {
  const [splats, setSplats] = useState<PaintSplat[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnProjectile = useCallback((
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: string
  ) => {
    const dir = to.clone().sub(from).normalize();
    const proj: Projectile = {
      id: nextId++,
      position: from.clone(),
      velocity: dir.multiplyScalar(18),
      color,
      age: 0,
      alive: true,
    };
    setProjectiles(prev => [...prev.slice(-10), proj]);
  }, []);

  const spawnHitEffect = useCallback((
    position: [number, number, number],
    color: string
  ) => {
    // Ground splat
    const splat: PaintSplat = {
      id: nextId++,
      position: [position[0], 0.01, position[2]],
      color,
      scale: 0.4 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI * 2,
      opacity: 1,
    };
    setSplats(prev => [...prev.slice(-20), splat]);

    // Burst particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const upward = 1 + Math.random() * 3;
      newParticles.push({
        id: nextId++,
        position: new THREE.Vector3(...position),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upward,
          Math.sin(angle) * speed
        ),
        color,
        age: 0,
        maxAge: 0.5 + Math.random() * 0.4,
        size: 0.04 + Math.random() * 0.08,
      });
    }
    setParticles(prev => [...prev.slice(-80), ...newParticles]);
  }, []);

  return { splats, projectiles, particles, spawnProjectile, spawnHitEffect, setSplats, setProjectiles, setParticles };
}

// ── Animated paint splat on ground ──
function PaintSplatDecal({ splat }: { splat: PaintSplat }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 0.05);
    }
  });
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, splat.rotation]}
      position={splat.position}
    >
      <circleGeometry args={[splat.scale, 12]} />
      <meshBasicMaterial color={splat.color} transparent opacity={splat.opacity} depthWrite={false} />
    </mesh>
  );
}

// ── Flying paintball ──
function PaintballProjectile({
  projectile,
  onHit,
}: {
  projectile: Projectile;
  onHit: (id: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(projectile.position.clone());
  const velRef = useRef(projectile.velocity.clone());
  const ageRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    ageRef.current += delta;
    // Gravity
    velRef.current.y -= 9.8 * delta * 0.3;
    posRef.current.addScaledVector(velRef.current, delta);
    meshRef.current.position.copy(posRef.current);

    // Hit ground or max range
    if (posRef.current.y <= 0 || ageRef.current > 1.5) {
      onHit(projectile.id);
    }
  });

  return (
    <mesh ref={meshRef} position={projectile.position.toArray() as [number, number, number]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={projectile.color} />
    </mesh>
  );
}

// ── Paint burst particle ──
function PaintParticle({ particle, onDead }: { particle: Particle; onDead: (id: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(particle.position.clone());
  const velRef = useRef(particle.velocity.clone());
  const ageRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    ageRef.current += delta;
    velRef.current.y -= 12 * delta;
    velRef.current.multiplyScalar(0.96);
    posRef.current.addScaledVector(velRef.current, delta);
    meshRef.current.position.copy(posRef.current);

    const progress = ageRef.current / particle.maxAge;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - progress);
    meshRef.current.scale.setScalar(1 - progress * 0.5);

    if (ageRef.current >= particle.maxAge) {
      onDead(particle.id);
    }
  });

  return (
    <mesh ref={meshRef} position={particle.position.toArray() as [number, number, number]}>
      <sphereGeometry args={[particle.size, 6, 6]} />
      <meshBasicMaterial color={particle.color} transparent opacity={1} />
    </mesh>
  );
}

// ── Main effects renderer ──
interface PaintEffectsProps {
  splats: PaintSplat[];
  projectiles: Projectile[];
  particles: Particle[];
  onProjectileHit: (id: number) => void;
  onParticleDead: (id: number) => void;
}

export default function PaintEffectsRenderer({
  splats,
  projectiles,
  particles,
  onProjectileHit,
  onParticleDead,
}: PaintEffectsProps) {
  return (
    <group>
      {splats.map(s => <PaintSplatDecal key={s.id} splat={s} />)}
      {projectiles.filter(p => p.alive).map(p => (
        <PaintballProjectile key={p.id} projectile={p} onHit={onProjectileHit} />
      ))}
      {particles.map(p => (
        <PaintParticle key={p.id} particle={p} onDead={onParticleDead} />
      ))}
    </group>
  );
}
