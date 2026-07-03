import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function CurrentLines({ progress = 0, mx = 0, my = 0 }) {
  const group = useRef();
  const curves = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const points = [];
      const radius = 1.4 + index * 0.55;
      for (let i = 0; i < 160; i += 1) {
        const t = (i / 159) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(t) * radius * (1.15 + index * 0.035),
            Math.sin(t) * radius * 0.28,
            -2.5 - index * 1.7 + Math.sin(t * 2.0) * 0.22
          )
        );
      }
      return points;
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.rotation.z = t * 0.018;
    group.current.rotation.y = -0.16 + progress * 0.42 + mx * 0.16;
    group.current.rotation.x = 0.08 + my * 0.08;
    group.current.scale.setScalar(0.82 + progress * 0.82);
  });

  return (
    <group ref={group}>
      {curves.map((points, index) => (
        <line key={index}>
          <bufferGeometry setFromPoints={points} />
          <lineBasicMaterial
            color={index % 3 === 0 ? "#78fff1" : index % 3 === 1 ? "#3f8fff" : "#93ffd0"}
            transparent
            opacity={0.08 + progress * 0.12}
          />
        </line>
      ))}
    </group>
  );
}

function SoftParticles({ progress = 0, mx = 0, my = 0 }) {
  const points = useRef();
  const particles = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color("#78fff1"), new THREE.Color("#3f8fff"), new THREE.Color("#eef8f6")];

    for (let i = 0; i < count; i += 1) {
      const z = -Math.random() * 28;
      const spread = 4 + Math.abs(z) * 0.22;
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.62;
      positions[i * 3 + 2] = z;

      const color = palette[i % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    points.current.rotation.z = t * 0.008;
    points.current.position.x = mx * 0.22;
    points.current.position.y = my * 0.14 + progress * 0.18;
    points.current.material.opacity = 0.24 + progress * 0.32;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.025} transparent opacity={0.35} depthWrite={false} />
    </points>
  );
}

function LightBeams({ progress = 0 }) {
  const group = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, index) => {
      child.material.opacity = 0.025 + Math.sin(t * 0.35 + index) * 0.012 + progress * 0.02;
      child.rotation.z = -0.12 + Math.sin(t * 0.12 + index) * 0.04;
    });
  });

  return (
    <group ref={group} position={[0, 0, -9]}>
      {[-4, -1.6, 1.8, 4.2].map((x, index) => (
        <mesh key={x} position={[x, 1.5 - index * 0.18, index * -1.2]}>
          <planeGeometry args={[0.42, 14]} />
          <meshBasicMaterial color={index % 2 ? "#3f8fff" : "#78fff1"} transparent opacity={0.04} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function ExperienceCanvas({ progress, mx, my }) {
  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.2, 7.5], fov: 44 }} gl={{ antialias: true, alpha: true }}>
        <fog attach="fog" args={["#01070b", 7, 32]} />
        <ambientLight intensity={0.22} />
        <pointLight position={[0, 1.6, 2]} intensity={1.4} color="#78fff1" />
        <pointLight position={[-3, -1.5, -4]} intensity={0.9} color="#3f8fff" />
        <Stars radius={44} depth={28} count={850} factor={2.3} saturation={0.2} fade speed={0.25} />
        <LightBeams progress={progress} />
        <CurrentLines progress={progress} mx={mx} my={my} />
        <SoftParticles progress={progress} mx={mx} my={my} />
        <Sparkles count={28} speed={0.18} size={1.8} scale={[9, 4, 16]} color="#78fff1" opacity={0.18} />
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.16} luminanceSmoothing={0.48} intensity={0.42} mipmapBlur />
          <DepthOfField focusDistance={0.22} focalLength={0.025} bokehScale={1.2} height={520} />
          <Vignette offset={0.2} darkness={0.62} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
