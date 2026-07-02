import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function FallbackCore3D() {
    const coreRef = useRef(null)
    const ringOneRef = useRef(null)
    const ringTwoRef = useRef(null)
    const ringThreeRef = useRef(null)
    const dustRef = useRef(null)

    const dustPositions = useMemo(() => {
        const positions = new Float32Array(360 * 3)
        for (let index = 0; index < 360; index += 1) {
            const radius = 1.1 + Math.random() * 2.8
            const angle = Math.random() * Math.PI * 2
            const height = (Math.random() - 0.5) * 1.8
            positions[index * 3] = Math.cos(angle) * radius
            positions[index * 3 + 1] = height
            positions[index * 3 + 2] = Math.sin(angle) * radius
        }
        return positions
    }, [])

    useFrame((state) => {
        if (coreRef.current) {
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.45) * 0.06
            coreRef.current.scale.setScalar(pulse)
            coreRef.current.rotation.y += 0.006
        }

        if (ringOneRef.current) {
            ringOneRef.current.rotation.z += 0.006
        }

        if (ringTwoRef.current) {
            ringTwoRef.current.rotation.z -= 0.005
            ringTwoRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.55) * 0.22
        }

        if (ringThreeRef.current) {
            ringThreeRef.current.rotation.y += 0.004
            ringThreeRef.current.rotation.x = 1.15 + Math.sin(state.clock.elapsedTime * 0.4) * 0.08
        }

        if (dustRef.current) {
            dustRef.current.rotation.y += 0.0018
            dustRef.current.rotation.z -= 0.0009
        }
    })

    return (
        <group rotation={[0.06, -0.18, 0.02]}>
            <points ref={dustRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={dustPositions.length / 3}
                        array={dustPositions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color="#9cf7ff"
                    size={0.018}
                    transparent
                    opacity={0.68}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            <mesh ref={ringOneRef}>
                <torusGeometry args={[1.4, 0.02, 24, 160]} />
                <meshBasicMaterial
                    color="#7de2ff"
                    transparent
                    opacity={0.45}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <mesh ref={ringTwoRef} rotation={[0.9, 0.2, 0]}>
                <torusGeometry args={[1.9, 0.012, 24, 160]} />
                <meshBasicMaterial
                    color="#8f6bff"
                    transparent
                    opacity={0.28}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <mesh ref={ringThreeRef} rotation={[1.2, -0.55, 0.35]}>
                <torusGeometry args={[2.38, 0.008, 18, 180]} />
                <meshBasicMaterial
                    color="#c7f8ff"
                    transparent
                    opacity={0.18}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <mesh ref={coreRef}>
                <icosahedronGeometry args={[0.62, 5]} />
                <meshPhysicalMaterial
                    color="#a5fbff"
                    emissive="#326dff"
                    emissiveIntensity={1.8}
                    roughness={0.08}
                    metalness={0.18}
                    transmission={0.35}
                    thickness={0.8}
                    transparent
                    opacity={0.82}
                />
            </mesh>

            <mesh position={[-0.2, 0.16, 0.48]}>
                <sphereGeometry args={[0.08, 24, 24]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.82}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    )
}

export default FallbackCore3D
