import { useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import FallbackCore3D from './FallbackCore3D'
import * as THREE from 'three'
import { flowerModelConfig } from '../config/modelConfig'

function CameraRig({ scrollYProgress }) {
    const { camera } = useThree()
    const lookAtTarget = useMemo(() => new THREE.Vector3(0, 0, 0), [])

    useFrame((state, delta) => {
        const progress = scrollYProgress?.get ? scrollYProgress.get() : 0

        const centerProgress = THREE.MathUtils.clamp(progress / 0.28, 0, 1)
        const flyProgress = THREE.MathUtils.clamp((progress - 0.28) / 0.6, 0, 1)

        const targetX = THREE.MathUtils.lerp(-0.55, 0, centerProgress)
        const targetY = THREE.MathUtils.lerp(0.18, -0.06, flyProgress)
        const targetZ = THREE.MathUtils.lerp(
            flowerModelConfig.cameraStartZ,
            flowerModelConfig.cameraEndZ,
            flyProgress,
        )

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 5, delta)
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 5, delta)
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 5, delta)

        camera.rotation.z = THREE.MathUtils.damp(
            camera.rotation.z,
            Math.sin(state.clock.elapsedTime * 0.35) * 0.015,
            4,
            delta,
        )

        camera.lookAt(lookAtTarget)
    })

    return null
}

function CosmicFlower3D({ mousePosition, scrollYProgress }) {
    return (
        <div
            className="cosmic-flower-3d drone-flower-holder"
            style={{
                transform: `translate(${mousePosition.x * 8}px, ${mousePosition.y * 6}px)`,
            }}
        >
            <Canvas
                className="cosmic-flower-3d__canvas"
                camera={{ position: [-0.55, 0.18, flowerModelConfig.cameraStartZ], fov: 36 }}
                dpr={[1, 2]}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance',
                }}
                onCreated={({ gl }) => {
                    gl.setClearColor(0x000000, 0)
                }}
            >
                <ambientLight intensity={1.15} />
                <directionalLight position={[3, 4, 5]} intensity={2.15} color="#b7f7ff" />
                <pointLight position={[-3, -1.8, 3]} intensity={1.35} color="#8f6bff" />
                <pointLight position={[0, 0, 3]} intensity={1.25} color="#7de2ff" />

                <CameraRig scrollYProgress={scrollYProgress} />

                <FallbackCore3D />
            </Canvas>
        </div>
    )
}

export default CosmicFlower3D
