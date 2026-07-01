import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DepthOfField, EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Float, MeshTransmissionMaterial, PerspectiveCamera, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function CameraRig({ mode }) {
  const { camera, pointer } = useThree();

  useFrame((state) => {
    const targetZ = mode === "orbit" ? 8.5 : mode === "api" ? 10.5 : 9.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 1.2, 0.045);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.3 + pointer.y * 0.55, 0.045);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.035);
    camera.lookAt(0, 0, -2.5 + Math.sin(state.clock.elapsedTime * 0.18) * 0.35);
  });

  return null;
}

function ParticleTunnel() {
  const points = useRef();
  const particles = useMemo(() => {
    const count = 2600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorA = new THREE.Color("#5ffcff");
    const colorB = new THREE.Color("#7b61ff");
    const colorC = new THREE.Color("#e8fbff");

    for (let i = 0; i < count; i += 1) {
      const radius = 1.2 + Math.random() * 8.8;
      const angle = Math.random() * Math.PI * 2;
      const depth = -Math.random() * 34;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.58 + (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 2] = depth;

      const mixed = colorA.clone().lerp(Math.random() > 0.55 ? colorB : colorC, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state) => {
    points.current.rotation.z = state.clock.elapsedTime * 0.012;
    points.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.09;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.035} transparent opacity={0.78} depthWrite={false} />
    </points>
  );
}

function OrbitLines() {
  const group = useRef();
  const rings = useMemo(
    () =>
      [2.8, 3.6, 4.5, 5.5].map((radius, index) => {
        const curve = new THREE.EllipseCurve(0, 0, radius, radius * (0.35 + index * 0.08), 0, Math.PI * 2);
        return curve.getPoints(180).map((p) => new THREE.Vector3(p.x, p.y, -1.8 - index * 0.25));
      }),
    []
  );

  useFrame((state) => {
    group.current.rotation.x = 0.95 + Math.sin(state.clock.elapsedTime * 0.2) * 0.09;
    group.current.rotation.y = state.clock.elapsedTime * 0.12;
  });

  return (
    <group ref={group}>
      {rings.map((points, index) => (
        <line key={index}>
          <bufferGeometry setFromPoints={points} />
          <lineBasicMaterial
            color={index % 2 ? "#7b61ff" : "#5ffcff"}
            transparent
            opacity={0.26 - index * 0.035}
          />
        </line>
      ))}
    </group>
  );
}

function GlassMonolith({ mode }) {
  const group = useRef();
  const texture = useMemo(() => new THREE.TextureLoader().load("/assets/hero-monolith-bg.png"), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.28) * 0.22;
    group.current.rotation.x = -0.08 + Math.sin(t * 0.18) * 0.05;
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, mode === "orbit" ? -3.3 : -2, 0.035);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.35}>
      <group ref={group} position={[0, 0.35, -2]} scale={mode === "api" ? 0.92 : 1}>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[4.6, 2.55, 0.18, 6, 6, 1]} />
          <MeshTransmissionMaterial
            color="#7df9ff"
            transmission={0.45}
            thickness={0.32}
            roughness={0.18}
            chromaticAberration={0.08}
            anisotropy={0.25}
            distortion={0.18}
            temporalDistortion={0.12}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[4.18, 2.18, 32, 16]} />
          <meshBasicMaterial map={texture} transparent opacity={0.92} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.19]}>
          <sphereGeometry args={[0.48, 48, 48]} />
          <meshStandardMaterial color="#6ff7ff" emissive="#1dd9ff" emissiveIntensity={1.7} roughness={0.18} metalness={0.15} />
        </mesh>
        <OrbitLines />
      </group>
    </Float>
  );
}

function FishSchool() {
  const group = useRef();
  const fish = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        offset: Math.random() * 100,
        y: -2.8 + Math.random() * 5.2,
        z: -6 - Math.random() * 20,
        scale: 0.08 + Math.random() * 0.16,
        speed: 0.2 + Math.random() * 0.35,
        lane: i % 2 ? -1 : 1
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, index) => {
      const f = fish[index];
      child.position.x = f.lane * (((t * f.speed + f.offset) % 12) - 6);
      child.position.y = f.y + Math.sin(t * 1.2 + f.offset) * 0.18;
      child.position.z = f.z;
      child.rotation.y = f.lane > 0 ? Math.PI / 2 : -Math.PI / 2;
      child.rotation.z = Math.sin(t * 1.8 + f.offset) * 0.08;
    });
  });

  return (
    <group ref={group}>
      {fish.map((f, index) => (
        <group key={index} scale={f.scale}>
          <mesh>
            <coneGeometry args={[0.45, 1.25, 5]} />
            <meshStandardMaterial color="#6ff7ff" emissive="#126f8a" emissiveIntensity={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[-0.62, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.28, 0.45, 3]} />
            <meshStandardMaterial color="#a4fff6" emissive="#5ffcff" emissiveIntensity={0.45} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NebulaPlanes() {
  const texture = useMemo(() => new THREE.TextureLoader().load("/assets/cosmic-abyss-bg.png"), []);

  return (
    <group position={[0, 0, -18]}>
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[28, 14]} />
        <meshBasicMaterial map={texture} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[-7, 2.6, 1]} rotation={[0, 0, -0.24]}>
        <planeGeometry args={[10, 2.2]} />
        <meshBasicMaterial color="#5ffcff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh position={[7, -2.2, 0]} rotation={[0, 0, 0.18]}>
        <planeGeometry args={[9, 2.6]} />
        <meshBasicMaterial color="#8a6cff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function ExperienceCanvas({ mode }) {
  return (
    <div className="experience-canvas">
      <Canvas dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.3, 9.4], fov: 42 }}>
        <color attach="background" args={["#02090c"]} />
        <fog attach="fog" args={["#02090c", 8, 34]} />
        <PerspectiveCamera makeDefault position={[0, 0.3, 9.4]} fov={42} />
        <CameraRig mode={mode} />

        <ambientLight intensity={0.42} />
        <pointLight position={[0, 1.8, 2.5]} intensity={4.5} color="#6ff7ff" />
        <pointLight position={[-4, -2, -5]} intensity={2.1} color="#7357ff" />
        <spotLight position={[2.8, 4.4, 1]} angle={0.38} penumbra={0.8} intensity={5.2} color="#d9ffff" />

        <NebulaPlanes />
        <Stars radius={55} depth={38} count={2300} factor={4} saturation={0.25} fade speed={0.5} />
        <ParticleTunnel />
        <Sparkles count={90} speed={0.24} size={2.6} scale={[12, 6, 20]} color="#7df9ff" opacity={0.32} />
        <FishSchool />
        <GlassMonolith mode={mode} />

        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.08} luminanceSmoothing={0.32} intensity={1.25} mipmapBlur />
          <DepthOfField focusDistance={0.17} focalLength={0.045} bokehScale={3.0} height={620} />
          <Vignette eskil={false} offset={0.25} darkness={0.72} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
