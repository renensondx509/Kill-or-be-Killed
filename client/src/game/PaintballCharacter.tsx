import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type CharacterState = "idle" | "run" | "strafe" | "shoot" | "hit" | "death" | "win";

interface PaintballCharacterProps {
  position: [number, number, number];
  rotation?: number;
  state?: CharacterState;
  teamColor?: string;        // jersey / paint color
  isPlayer?: boolean;        // true = local player (cyan), false = opponent (red)
  onAnimationComplete?: () => void;
}

// Semi-realistic paintball player built from Three.js primitives
export default function PaintballCharacter({
  position,
  rotation = 0,
  state = "idle",
  teamColor = "#00e5ff",
  isPlayer = true,
  onAnimationComplete,
}: PaintballCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const gunRef = useRef<THREE.Group>(null);
  const stateRef = useRef(state);
  const timeRef = useRef(0);
  const deathProgressRef = useRef(0);
  const hitProgressRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    if (state === "hit") hitProgressRef.current = 0;
    if (state === "death") deathProgressRef.current = 0;
  }, [state]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const s = stateRef.current;

    if (!groupRef.current) return;

    // Base position
    groupRef.current.position.set(...position);
    groupRef.current.rotation.y = rotation;

    // ── IDLE: subtle breathing + weapon sway ──
    if (s === "idle") {
      const breathe = Math.sin(t * 1.2) * 0.015;
      if (torsoRef.current) torsoRef.current.position.y = 0.85 + breathe;
      if (headRef.current) headRef.current.position.y = 1.62 + breathe * 0.5;
      if (gunRef.current) {
        gunRef.current.rotation.x = Math.sin(t * 0.8) * 0.02;
        gunRef.current.rotation.z = Math.sin(t * 1.1) * 0.01;
      }
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.3 + Math.sin(t * 1.2) * 0.02;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.5 + Math.sin(t * 1.2) * 0.02;
    }

    // ── RUN: full body run cycle ──
    if (s === "run" || s === "strafe") {
      const speed = 8;
      const legSwing = Math.sin(t * speed) * 0.5;
      const armSwing = Math.sin(t * speed) * 0.35;
      const bodyBob = Math.abs(Math.sin(t * speed)) * 0.04;
      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -armSwing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = armSwing - 0.3;
      if (torsoRef.current) torsoRef.current.position.y = 0.85 + bodyBob;
      if (headRef.current) headRef.current.position.y = 1.62 + bodyBob;
      if (s === "strafe") {
        if (torsoRef.current) torsoRef.current.rotation.y = Math.sin(t * speed * 0.5) * 0.1;
      }
    }

    // ── SHOOT: recoil kick ──
    if (s === "shoot") {
      const recoilT = (t % 0.4) / 0.4;
      const recoil = recoilT < 0.15 ? recoilT / 0.15 : 1 - (recoilT - 0.15) / 0.85;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.5 - recoil * 0.4;
      if (gunRef.current) gunRef.current.position.z = recoil * 0.08;
      if (torsoRef.current) torsoRef.current.rotation.x = recoil * 0.05;
    }

    // ── HIT: quick body jerk ──
    if (s === "hit") {
      hitProgressRef.current = Math.min(hitProgressRef.current + delta * 5, 1);
      const p = hitProgressRef.current;
      const jerk = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = jerk * 0.25;
        torsoRef.current.position.x = Math.sin(p * Math.PI * 3) * 0.08;
      }
      if (p >= 1 && onAnimationComplete) onAnimationComplete();
    }

    // ── DEATH: stagger back + fall ──
    if (s === "death") {
      deathProgressRef.current = Math.min(deathProgressRef.current + delta * 1.2, 1);
      const p = deathProgressRef.current;
      if (groupRef.current) {
        groupRef.current.rotation.x = p * (Math.PI / 2.2);
        groupRef.current.position.y = -p * 0.6;
      }
      if (p >= 0.95 && onAnimationComplete) onAnimationComplete();
    }

    // ── WIN: arms raised ──
    if (s === "win") {
      const wave = Math.sin(t * 3) * 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -1.8 + wave;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.8 - wave;
      if (torsoRef.current) torsoRef.current.rotation.y = Math.sin(t * 1.5) * 0.1;
    }
  });

  const jerseyColor = teamColor;
  const pantsColor = isPlayer ? "#1a3a5c" : "#3a1a1a";
  const vestColor = isPlayer ? "#0a2a4a" : "#2a0a0a";
  const maskColor = isPlayer ? "#00b4cc" : "#cc2200";
  const gloveColor = "#222";
  const shoeColor = "#111";
  const skinColor = "#c8a882";

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* ── LEGS ── */}
      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.13, 0.5, 0]}>
        {/* Upper leg */}
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        {/* Lower leg */}
        <mesh castShadow position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.085, 0.35, 4, 8]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        {/* Shoe */}
        <mesh castShadow position={[0, -0.6, 0.04]}>
          <boxGeometry args={[0.16, 0.1, 0.28]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>

      {/* Right leg */}
      <group ref={rightLegRef} position={[0.13, 0.5, 0]}>
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        <mesh castShadow position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.085, 0.35, 4, 8]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        <mesh castShadow position={[0, -0.6, 0.04]}>
          <boxGeometry args={[0.16, 0.1, 0.28]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>

      {/* ── TORSO ── */}
      <mesh ref={torsoRef} castShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[0.42, 0.55, 0.22]} />
        <meshLambertMaterial color={jerseyColor} />
      </mesh>

      {/* Tactical vest */}
      <mesh castShadow position={[0, 0.88, 0.02]}>
        <boxGeometry args={[0.38, 0.45, 0.14]} />
        <meshLambertMaterial color={vestColor} />
      </mesh>
      {/* Vest pockets */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.82, 0.1]}>
          <boxGeometry args={[0.1, 0.1, 0.05]} />
          <meshLambertMaterial color={vestColor} />
        </mesh>
      ))}

      {/* ── NECK ── */}
      <mesh castShadow position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 0.12, 8]} />
        <meshLambertMaterial color={skinColor} />
      </mesh>

      {/* ── HEAD + MASK ── */}
      <group ref={headRef} position={[0, 1.62, 0]}>
        {/* Head */}
        <mesh castShadow>
          <sphereGeometry args={[0.175, 12, 12]} />
          <meshLambertMaterial color={skinColor} />
        </mesh>
        {/* Mask (full face) */}
        <mesh castShadow position={[0, 0, 0.1]}>
          <boxGeometry args={[0.34, 0.3, 0.14]} />
          <meshLambertMaterial color={maskColor} />
        </mesh>
        {/* Mask visor */}
        <mesh castShadow position={[0, 0.04, 0.17]}>
          <boxGeometry args={[0.28, 0.12, 0.04]} />
          <meshLambertMaterial color="#111" transparent opacity={0.85} />
        </mesh>
        {/* Mask vents */}
        {[-0.08, 0, 0.08].map((x, i) => (
          <mesh key={i} position={[x, -0.06, 0.175]}>
            <boxGeometry args={[0.04, 0.06, 0.02]} />
            <meshLambertMaterial color="#222" />
          </mesh>
        ))}
        {/* Helmet */}
        <mesh castShadow position={[0, 0.1, -0.02]}>
          <sphereGeometry args={[0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color={maskColor} />
        </mesh>
      </group>

      {/* ── LEFT ARM ── */}
      <group ref={leftArmRef} position={[-0.26, 0.95, 0]}>
        {/* Upper arm */}
        <mesh castShadow position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
          <meshLambertMaterial color={jerseyColor} />
        </mesh>
        {/* Elbow pad */}
        <mesh castShadow position={[0, -0.28, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshLambertMaterial color={vestColor} />
        </mesh>
        {/* Forearm */}
        <mesh castShadow position={[0, -0.44, 0]}>
          <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
          <meshLambertMaterial color={jerseyColor} />
        </mesh>
        {/* Glove */}
        <mesh castShadow position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshLambertMaterial color={gloveColor} />
        </mesh>
      </group>

      {/* ── RIGHT ARM (gun arm) ── */}
      <group ref={rightArmRef} position={[0.26, 0.95, 0]} rotation={[-0.5, 0, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
          <meshLambertMaterial color={jerseyColor} />
        </mesh>
        <mesh castShadow position={[0, -0.28, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshLambertMaterial color={vestColor} />
        </mesh>
        <mesh castShadow position={[0, -0.44, 0]}>
          <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
          <meshLambertMaterial color={jerseyColor} />
        </mesh>
        <mesh castShadow position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshLambertMaterial color={gloveColor} />
        </mesh>

        {/* ── PAINTBALL GUN ── */}
        <group ref={gunRef} position={[0.06, -0.55, 0.15]} rotation={[0.5, 0, 0]}>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[0.07, 0.12, 0.45]} />
            <meshLambertMaterial color="#222" />
          </mesh>
          {/* Barrel */}
          <mesh castShadow position={[0, 0.02, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.35, 8]} />
            <meshLambertMaterial color="#333" />
          </mesh>
          {/* Hopper (paint ball loader) */}
          <mesh castShadow position={[0, 0.1, 0.05]}>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshLambertMaterial color={jerseyColor} />
          </mesh>
          {/* Trigger guard */}
          <mesh castShadow position={[0, -0.05, -0.05]}>
            <torusGeometry args={[0.04, 0.012, 4, 8, Math.PI]} />
            <meshLambertMaterial color="#333" />
          </mesh>
          {/* Grip */}
          <mesh castShadow position={[0, -0.1, -0.08]}>
            <boxGeometry args={[0.06, 0.14, 0.08]} />
            <meshLambertMaterial color="#1a1a1a" />
          </mesh>
          {/* Muzzle flash point (invisible, used for projectile spawn) */}
          <mesh name="muzzle" position={[0, 0.02, 0.46]}>
            <sphereGeometry args={[0.01]} />
            <meshBasicMaterial color="yellow" visible={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
