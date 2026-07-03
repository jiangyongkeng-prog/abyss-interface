import { Center, Float, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_PATH = "/models/premium-spaceship.glb";

export default function PortalModel({ mousePosition }) {
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
        const fitScale = 3.8 / maxSize;
        return { scene: cloned, scale: fitScale };
    }, [scene]);

    useEffect(() => {
        model.scene.traverse((child) => {
            if (!child.isMesh || !child.material) return;

            const material = child.material.clone();
            material.side = THREE.DoubleSide;
            material.color = material.color?.clone?.() || new THREE.Color("#bffcff");
            material.color.lerp(new THREE.Color("#dffeff"), 0.04);
            material.emissive = new THREE.Color("#227bff");
            material.emissiveIntensity = 0.16;
            material.roughness = 0.34;
            material.metalness = 0.52;
            material.needsUpdate = true;
            child.material = material;
        });
    }, [model.scene]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, mousePosition.x * 0.28, 4, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, mousePosition.y * 0.1, 4, delta);
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06 - 0.15;
    });

    return (
        <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.2}>
            <group ref={groupRef}>
                <Center>
                    <primitive object={model.scene} scale={model.scale} rotation={[0.04, Math.PI * -0.15, 0]} />
                </Center>
            </group>
        </Float>
    );
}

