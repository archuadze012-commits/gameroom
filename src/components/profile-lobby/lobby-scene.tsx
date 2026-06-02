"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import {
  MeshReflectorMaterial,
  Text,
  Sparkles,
  Float,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";

// rectAreaLight needs RectAreaLightUniformsLib to be initialized once
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

extend({ RectAreaLight: THREE.RectAreaLight });

function PulsingRectLight({
  color,
  position,
  intensity = 6,
  phase = 0,
  size = [6, 0.5] as [number, number],
}: {
  color: string;
  position: [number, number, number];
  intensity?: number;
  phase?: number;
  size?: [number, number];
}) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.intensity = intensity + Math.sin(t * 1.2 + phase) * intensity * 0.35;
  });
  return (
    <rectAreaLight
      ref={ref}
      color={color}
      position={position}
      width={size[0]}
      height={size[1]}
      intensity={intensity}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

/**
 * Visible emissive LED bar — the colored fixture you actually see hanging
 * from the ceiling. Pulses in sync with its paired rectAreaLight.
 */
function NeonBar({
  color,
  position,
  size = [8, 0.18, 0.35] as [number, number, number],
  phase = 0,
  intensity = 6,
}: {
  color: string;
  position: [number, number, number];
  size?: [number, number, number];
  phase?: number;
  intensity?: number;
}) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const i = intensity + Math.sin(t * 1.2 + phase) * intensity * 0.35;
    // toneMapped:false MeshBasicMaterial — fake HDR via raw color brightness
    ref.current.color.set(color);
    ref.current.color.multiplyScalar(i * 0.18);
  });
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial ref={ref} color={color} toneMapped={false} />
    </mesh>
  );
}

/** Back-wall accent strip — a horizontal band glowing one of the RGB colors. */
function WallStrip({
  color,
  y,
  z = -9.85,
  phase = 0,
}: {
  color: string;
  y: number;
  z?: number;
  phase?: number;
}) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.color.set(color);
    ref.current.color.multiplyScalar(0.7 + Math.sin(t * 0.8 + phase) * 0.25);
  });
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[28, 0.18]} />
      <meshBasicMaterial ref={ref} color={color} toneMapped={false} />
    </mesh>
  );
}

function GeorgianEmblem({ position = [0, 0.02, 0] as [number, number, number] }) {
  // Borjghali — 7-pointed sun cross. Glowing red ring + 7 spokes on the floor.
  const spokes = useMemo(() => Array.from({ length: 7 }, (_, i) => (i * Math.PI * 2) / 7), []);
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {/* outer ring */}
      <mesh>
        <ringGeometry args={[2.2, 2.35, 64]} />
        <meshBasicMaterial
          color="#FF2D55"
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* inner ring */}
      <mesh>
        <ringGeometry args={[0.55, 0.62, 32]} />
        <meshBasicMaterial
          color="#FFD9A3"
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>
      {/* 7 spokes */}
      {spokes.map((a, i) => (
        <mesh key={i} rotation={[0, 0, a]} position={[Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0]}>
          <planeGeometry args={[1.4, 0.14]} />
          <meshBasicMaterial
            color="#C026D3"
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function NeonSign({
  text,
  position,
  color = "#FF4D6D",
  size = 1.3,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  size?: number;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.05} floatIntensity={0.15}>
      <Text
        position={position}
        fontSize={size}
        letterSpacing={-0.02}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor={color}
        outlineOpacity={0.6}
      >
        {text}
        <meshBasicMaterial color={color} toneMapped={false} />
      </Text>
    </Float>
  );
}

function Room() {
  return (
    <group>
      {/* floor with subtle reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={30}
          mirror={0.55}
          mixContrast={1.2}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0612"
          metalness={0.4}
        />
      </mesh>

      {/* back wall */}
      <mesh position={[0, 4.5, -10]} receiveShadow>
        <planeGeometry args={[30, 11]} />
        <meshStandardMaterial color="#0e0b1a" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* side walls — angled toward camera */}
      <mesh position={[-10, 4.5, -5]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[14, 11]} />
        <meshStandardMaterial color="#08060f" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[10, 4.5, -5]} rotation={[0, -Math.PI / 4, 0]}>
        <planeGeometry args={[14, 11]} />
        <meshStandardMaterial color="#08060f" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* ceiling (just enough to catch shadows / hide infinity) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10, -3]}>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#050308" roughness={1} />
      </mesh>
    </group>
  );
}

function CameraBob() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const baseY = useRef(2.2);
  useFrame((state) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const t = state.clock.elapsedTime;
    camera.position.y = baseY.current + Math.sin(t * 0.5) * 0.08;
    camera.position.x = Math.sin(t * 0.25) * 0.15;
    camera.lookAt(0, 1.6, -8);
  });
  return <PerspectiveCamera ref={cameraRef} makeDefault fov={45} position={[0, 2.2, 8]} />;
}

function SceneContents() {
  useEffect(() => {
    RectAreaLightUniformsLib.init();
  }, []);

  return (
    <>
      <CameraBob />

      {/* ambient + hemisphere — very low, dark canvas */}
      <ambientLight intensity={0.06} color="#3a2557" />
      <hemisphereLight args={["#2a1056", "#0a0612", 0.18]} />

      {/* the three signature lights — invisible illumination */}
      <PulsingRectLight color="#FF2D55" position={[-7, 8.8, -5]} intensity={14} phase={0} size={[10, 0.6]} />
      <PulsingRectLight color="#3A6BFF" position={[7, 8.8, -5]} intensity={14} phase={2.1} size={[10, 0.6]} />
      <PulsingRectLight color="#C026D3" position={[0, 9.3, -3]} intensity={16} phase={1.1} size={[14, 0.7]} />

      {/* visible LED bar fixtures the player actually sees */}
      <NeonBar color="#FF2D55" position={[-7, 8.6, -5]} size={[10, 0.18, 0.35]} phase={0} intensity={6} />
      <NeonBar color="#3A6BFF" position={[7, 8.6, -5]} size={[10, 0.18, 0.35]} phase={2.1} intensity={6} />
      <NeonBar color="#C026D3" position={[0, 9.1, -3]} size={[14, 0.18, 0.45]} phase={1.1} intensity={7} />

      {/* back-wall accent strips — sweeping RGB lines */}
      <WallStrip color="#FF2D55" y={7.6} phase={0} />
      <WallStrip color="#C026D3" y={3.5} phase={1.2} />
      <WallStrip color="#3A6BFF" y={1.2} phase={2.4} />

      {/* center magenta spotlight pooled on floor */}
      <spotLight
        position={[0, 8, 4]}
        target-position={[0, 0, 0]}
        intensity={45}
        distance={20}
        angle={0.5}
        penumbra={0.7}
        color="#C026D3"
      />

      {/* fill: warm subtle from front */}
      <pointLight position={[0, 3, 6]} intensity={6} color="#8B5CF6" distance={15} decay={2} />

      <Room />
      <GeorgianEmblem position={[0, 0.015, 0]} />
      <NeonSign text="GAMEROOM" position={[0, 6.5, -9.6]} color="#FF4D6D" size={1.4} />
      <NeonSign text="LOBBY" position={[0, 4.8, -9.55]} color="#C026D3" size={0.6} />

      {/* floating sparkles for atmosphere */}
      <Sparkles count={80} scale={[20, 8, 12]} size={2.5} speed={0.25} opacity={0.6} color="#A78BFA" position={[0, 4, -3]} />
      <Sparkles count={30} scale={[18, 4, 6]} size={3.5} speed={0.15} opacity={0.5} color="#FF4D6D" position={[0, 2, -1]} />

      {/* tiny env for material reflections (mostly dark) */}
      <Environment preset="night" environmentIntensity={0.15} />

      {/* fog for depth */}
      <fog attach="fog" args={["#08060F", 7, 22]} />
    </>
  );
}

export default function LobbyScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#08060F" }}
      shadows={false}
    >
      <SceneContents />
    </Canvas>
  );
}
