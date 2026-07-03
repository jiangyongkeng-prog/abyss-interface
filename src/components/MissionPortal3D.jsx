import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Float, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_PATH = "/models/premium-spaceship.glb";

function PortalAsset() {
  const groupRef = useRef(null);
  const { scene } = useGLTF(MODEL_PATH);

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    cloned.position.sub(center);
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    return { scene: cloned, scale: 3.25 / maxSize };
  }, [scene]);

  useEffect(() => {
    model.scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const material = child.material.clone();
      material.side = THREE.DoubleSide;
      material.roughness = 0.28;
      material.metalness = 0.58;
      material.emissive = new THREE.Color("#1b6cff");
      material.emissiveIntensity = 0.2;
      material.needsUpdate = true;
      child.material = material;
    });
  }, [model.scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
  });

  return (
    <Float speed={1.05} rotationIntensity={0.08} floatIntensity={0.18}>
      <group ref={groupRef} rotation={[0.02, Math.PI * 0.08, 0]}>
        <Center>
          <primitive object={model.scene} scale={model.scale} rotation={[0, Math.PI * -0.16, 0]} />
        </Center>
      </group>
    </Float>
  );
}

export default function MissionPortal3D() {
  return (
    <div className="mission-visual__model">
      <Canvas
        camera={{ position: [0, 0.08, 5.6], fov: 34 }}
        dpr={[1, 1.45]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.5} />
        <hemisphereLight intensity={1.5} color="#e8ffff" groundColor="#0a1020" />
        <directionalLight position={[2.5, 3, 4]} intensity={3.6} color="#e8ffff" />
        <pointLight position={[0, 0, 2.4]} intensity={2.8} color="#89f7ff" />
        <pointLight position={[-3, 1.2, 1]} intensity={1.8} color="#6f7cff" />
        <PortalAsset />
        <Sparkles count={54} scale={[4.2, 2.6, 1.8]} size={1.8} speed={0.2} color="#bdfcff" />
        <Environment preset="night" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.65}
          dampingFactor={0.08}
          enableDamping
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.78}
        />
      </Canvas>
    </div>
  );
}
