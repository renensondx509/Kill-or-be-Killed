import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Ground plane with grass texture
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshLambertMaterial color="#3a7d44" />
    </mesh>
  );
}

// Dirt patches on ground
function DirtPatch({ position }: { position: [number, number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={position}>
      <circleGeometry args={[1.5, 8]} />
      <meshLambertMaterial color="#8B6914" />
    </mesh>
  );
}

// Inflatable bunker (rounded box shape)
function InflatableBunker({
  position,
  rotation = 0,
  color = "#e8e0d0",
  scale = [1, 1, 1],
}: {
  position: [number, number, number];
  rotation?: number;
  color?: string;
  scale?: [number, number, number];
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow scale={scale}>
        <capsuleGeometry args={[0.5, 1.2, 8, 16]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Seam lines */}
      <mesh position={[0, 0, 0.51]} scale={scale}>
        <torusGeometry args={[0.5, 0.04, 6, 20]} />
        <meshLambertMaterial color="#c0b8a8" />
      </mesh>
    </group>
  );
}

// Tire stack bunker
function TireStack({ position }: { position: [number, number, number] }) {
  const tireColor = "#1a1a1a";
  const tireInner = "#333";
  return (
    <group position={position}>
      {/* 3 tires stacked */}
      {[0, 0.55, 1.1].map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh castShadow receiveShadow>
            <torusGeometry args={[0.45, 0.22, 8, 20]} />
            <meshLambertMaterial color={tireColor} />
          </mesh>
          {/* Tire inner rim */}
          <mesh>
            <torusGeometry args={[0.25, 0.06, 6, 16]} />
            <meshLambertMaterial color={tireInner} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Wooden barrier
function WoodenBarrier({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main plank */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.5, 1.0, 0.15]} />
        <meshLambertMaterial color="#8B6914" />
      </mesh>
      {/* Support posts */}
      {[-1.0, 1.0].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.5, -0.1]}>
          <boxGeometry args={[0.12, 1.2, 0.12]} />
          <meshLambertMaterial color="#6B4F10" />
        </mesh>
      ))}
      {/* Plank lines */}
      {[-0.3, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y + 0.5, 0.08]}>
          <boxGeometry args={[2.5, 0.04, 0.01]} />
          <meshLambertMaterial color="#6B4F10" />
        </mesh>
      ))}
    </group>
  );
}

// Sandbag wall
function SandbagWall({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Bottom row */}
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={`b${i}`} castShadow receiveShadow position={[x, 0.2, 0]}>
          <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
          <meshLambertMaterial color="#c8b87a" />
        </mesh>
      ))}
      {/* Top row */}
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={`t${i}`} castShadow receiveShadow position={[x, 0.58, 0]}>
          <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
          <meshLambertMaterial color="#b8a86a" />
        </mesh>
      ))}
    </group>
  );
}

// Tree
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 2.0, 8]} />
        <meshLambertMaterial color="#5C4033" />
      </mesh>
      {/* Foliage layers */}
      <mesh castShadow position={[0, 2.8, 0]}>
        <coneGeometry args={[1.2, 1.8, 8]} />
        <meshLambertMaterial color="#2d6a2d" />
      </mesh>
      <mesh castShadow position={[0, 3.8, 0]}>
        <coneGeometry args={[0.9, 1.5, 8]} />
        <meshLambertMaterial color="#3a7a3a" />
      </mesh>
      <mesh castShadow position={[0, 4.6, 0]}>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshLambertMaterial color="#4a8a4a" />
      </mesh>
    </group>
  );
}

// Boundary fence
function Fence() {
  const posts = [];
  const spacing = 2.5;
  const count = 8;
  const half = (count * spacing) / 2;
  for (let i = 0; i <= count; i++) {
    const x = -half + i * spacing;
    posts.push(
      <mesh key={`fn${i}`} castShadow position={[x, 0.75, -half]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`fs${i}`} castShadow position={[x, 0.75, half]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`fw${i}`} castShadow position={[-half, 0.75, x]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`fe${i}`} castShadow position={[half, 0.75, x]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
    );
  }
  // Rails
  const rails = [];
  for (let h = 0.4; h <= 1.2; h += 0.4) {
    rails.push(
      <mesh key={`rn${h}`} position={[0, h, -half]}>
        <boxGeometry args={[count * spacing, 0.05, 0.05]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`rs${h}`} position={[0, h, half]}>
        <boxGeometry args={[count * spacing, 0.05, 0.05]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`rw${h}`} position={[-half, h, 0]}>
        <boxGeometry args={[0.05, 0.05, count * spacing]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>,
      <mesh key={`re${h}`} position={[half, h, 0]}>
        <boxGeometry args={[0.05, 0.05, count * spacing]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
    );
  }
  return <group>{posts}{rails}</group>;
}

// Animated flag
function Flag({ position }: { position: [number, number, number] }) {
  const flagRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.03, 3.5, 6]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      <mesh ref={flagRef} position={[0.3, 1.5, 0]}>
        <planeGeometry args={[0.6, 0.35]} />
        <meshLambertMaterial color="#e63946" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function PaintballArena() {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#fff8e7" />
      <directionalLight
        castShadow
        position={[8, 15, 8]}
        intensity={1.4}
        color="#fff5e0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#a0c8ff" />
      <hemisphereLight args={["#87CEEB", "#3a7d44", 0.4]} />

      {/* Ground */}
      <Ground />

      {/* Dirt patches */}
      <DirtPatch position={[0, 0.01, 0]} />
      <DirtPatch position={[3, 0.01, 2]} />
      <DirtPatch position={[-3, 0.01, -2]} />

      {/* ── MIRROR ARENA LAYOUT ── */}
      {/* Center bunkers */}
      <InflatableBunker position={[0, 0.8, 0]} color="#e8e0d0" scale={[1.2, 1.5, 1.2]} />
      <InflatableBunker position={[-1.5, 0.8, 0.5]} color="#d4c8b0" rotation={0.4} />
      <InflatableBunker position={[1.5, 0.8, -0.5]} color="#d4c8b0" rotation={-0.4} />

      {/* Player 1 side (negative Z) */}
      <TireStack position={[-3, 0, -4]} />
      <TireStack position={[3, 0, -4]} />
      <WoodenBarrier position={[0, 0, -5.5]} />
      <SandbagWall position={[-2, 0, -3]} rotation={0.3} />
      <InflatableBunker position={[4, 0.8, -3]} color="#c8d4e8" rotation={0.8} />

      {/* Player 2 side (positive Z) */}
      <TireStack position={[-3, 0, 4]} />
      <TireStack position={[3, 0, 4]} />
      <WoodenBarrier position={[0, 0, 5.5]} rotation={Math.PI} />
      <SandbagWall position={[2, 0, 3]} rotation={-0.3} />
      <InflatableBunker position={[-4, 0.8, 3]} color="#c8d4e8" rotation={-0.8} />

      {/* Side flanking covers */}
      <WoodenBarrier position={[-6, 0, 0]} rotation={Math.PI / 2} />
      <WoodenBarrier position={[6, 0, 0]} rotation={Math.PI / 2} />

      {/* Trees (corners) */}
      <Tree position={[-9, 0, -9]} />
      <Tree position={[9, 0, -9]} />
      <Tree position={[-9, 0, 9]} />
      <Tree position={[9, 0, 9]} />
      <Tree position={[-9, 0, 0]} />
      <Tree position={[9, 0, 0]} />

      {/* Flags */}
      <Flag position={[-8, 0, -8]} />
      <Flag position={[8, 0, 8]} />

      {/* Boundary fence */}
      <Fence />
    </group>
  );
}
