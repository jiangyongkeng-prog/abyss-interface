import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_PATH = "/models/stylized-astronaut.glb";

function AstronautModel() {
  const groupRef = useRef(null);
  const { scene } = useGLTF(MODEL_PATH);

  const scale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);
    scene.position.sub(center);
    return 0.92 / (Math.max(size.x, size.y, size.z) || 1);
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const material = child.material.clone();
      material.side = THREE.DoubleSide;
      material.roughness = Math.min(material.roughness ?? 0.5, 0.54);
      material.metalness = Math.max(material.metalness ?? 0.12, 0.22);
      material.emissive = new THREE.Color("#063d4b");
      material.emissiveIntensity = 0.06;
      material.needsUpdate = true;
      child.material = material;
    });
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.rotation.y += 0.0018;
    groupRef.current.rotation.x = -0.06 + Math.sin(time * 0.28) * 0.025;
    groupRef.current.position.y = -0.34 + Math.sin(time * 0.72) * 0.045;
  });

  return (
    <Float speed={0.9} rotationIntensity={0.05} floatIntensity={0.26}>
      <group ref={groupRef} rotation={[0, Math.PI * 0.2, 0]} scale={scale}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

export default function DeepSeaAstronaut3D() {
  return (
    <div className="deep-sea-astronaut-3d" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.16, 5.4], fov: 34 }}
        dpr={[1, 1.35]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.25} />
        <hemisphereLight intensity={1.35} color="#d7fff9" groundColor="#001018" />
        <directionalLight position={[1.8, 3.2, 3.8]} intensity={2.7} color="#d7fff9" />
        <pointLight position={[-2.4, 0.4, 2.2]} intensity={1.8} color="#42e5ff" />
        <pointLight position={[2.5, -1.6, 1.8]} intensity={0.9} color="#4b7cff" />
        <AstronautModel />
        <Sparkles count={28} scale={[3.2, 2.25, 1.3]} size={1.15} speed={0.12} color="#bdfcff" />
        <Environment preset="night" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.72}
          dampingFactor={0.08}
          enableDamping
          minPolarAngle={Math.PI * 0.04}
          maxPolarAngle={Math.PI * 0.96}
        />
      </Canvas>
    </div>
  );
}
