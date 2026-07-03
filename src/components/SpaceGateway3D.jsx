import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { motion, useTransform } from "motion/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import PortalModel from "./PortalModel";

function EnergyGate({ mousePosition }) {
    const gateRef = useRef();
    const dustRef = useRef();

    const dust = useMemo(() => {
        const count = 900;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.2 + Math.random() * 3.8;
            const depth = (Math.random() - 0.5) * 1.8;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.sin(angle) * radius * 0.55;
            positions[i * 3 + 2] = depth;
        }

        return positions;
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        if (gateRef.current) {
            gateRef.current.rotation.z = time * 0.08;
            gateRef.current.rotation.x = 0.92 + Math.sin(time * 0.35) * 0.08;
            gateRef.current.rotation.y = mousePosition.x * 0.16;
        }

        if (dustRef.current) {
            dustRef.current.rotation.z = -time * 0.025;
            dustRef.current.rotation.y = time * 0.018;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            <points ref={dustRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={dust.length / 3}
                        array={dust}
                        itemSize={3}
                    />
                </bufferGeometry>

                <pointsMaterial
                    size={0.018}
                    color="#8df7ff"
                    transparent
                    opacity={0.62}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            <group ref={gateRef}>
                <mesh rotation={[0, 0, 0]}>
                    <torusGeometry args={[2.2, 0.018, 32, 220]} />
                    <meshBasicMaterial
                        color="#82f7ff"
                        transparent
                        opacity={0.48}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                <mesh rotation={[0.35, 0.4, 0]}>
                    <torusGeometry args={[2.75, 0.012, 28, 220]} />
                    <meshBasicMaterial
                        color="#4d8dff"
                        transparent
                        opacity={0.3}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                <mesh rotation={[-0.42, -0.32, 0]}>
                    <torusGeometry args={[3.25, 0.008, 24, 220]} />
                    <meshBasicMaterial
                        color="#b5fff5"
                        transparent
                        opacity={0.16}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            </group>

            <Sparkles
                count={120}
                scale={[6, 3.5, 2]}
                size={2.2}
                speed={0.32}
                color="#bffcff"
                opacity={0.45}
            />
        </group>
    );
}

export default function SpaceGateway3D({ scrollYProgress, mousePosition }) {
    const opacity = useTransform(scrollYProgress, [0, 0.18, 0.42, 0.86, 1], [0.34, 0.34, 0.92, 1, 0.72]);
    const scale = useTransform(scrollYProgress, [0, 0.18, 0.42, 0.72, 1], [0.48, 0.48, 0.9, 1.32, 1.72]);
    const y = useTransform(scrollYProgress, [0, 0.18, 0.42, 0.72, 1], [92, 92, 10, -18, -8]);

    return (
        <motion.div
            className="space-gateway-3d"
            style={{
                opacity,
                scale,
                y,
            }}
        >
            <Canvas
                camera={{ position: [0, 0.18, 6.4], fov: 36 }}
                dpr={[1, 1.8]}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance",
                }}
            >
                <ambientLight intensity={2.2} />
                <hemisphereLight intensity={1.45} color="#dffeff" groundColor="#101326" />
                <directionalLight position={[0, 2.5, 4]} intensity={3.2} color="#dffeff" />
                <pointLight position={[0, 0, 3]} intensity={4.2} color="#7df9ff" />
                <pointLight position={[-3, 2, 2]} intensity={2.2} color="#6d6bff" />
                <pointLight position={[3, -2, 2]} intensity={1.6} color="#9ffff2" />

                <PortalModel mousePosition={mousePosition} />
                <EnergyGate mousePosition={mousePosition} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    rotateSpeed={0.72}
                    dampingFactor={0.08}
                    enableDamping
                    minPolarAngle={Math.PI * 0.28}
                    maxPolarAngle={Math.PI * 0.72}
                />
            </Canvas>
        </motion.div>
    );
}
