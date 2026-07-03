import { useEffect, useMemo, useRef } from 'react'
import { Bounds, Center, Clone, Float, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flowerModelConfig } from '../config/modelConfig'

function RealFlower3D({ mousePosition, scrollYProgress }) {
    const groupRef = useRef(null)
    const { scene } = useGLTF(flowerModelConfig.modelPath)

    const clonedScene = useMemo(() => scene.clone(true), [scene])

    useEffect(() => {
        clonedScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false
                child.receiveShadow = false

                if (child.material) {
                    child.material.side = THREE.DoubleSide
                    child.material.needsUpdate = true
                }
            }
        })
    }, [clonedScene])

    useFrame((state, delta) => {
        if (!groupRef.current) return

        const progress = scrollYProgress?.get ? scrollYProgress.get() : 0

        const targetRotationX =
            flowerModelConfig.modelRotation[0] +
            mousePosition.y * flowerModelConfig.mouseRotateX +
            progress * flowerModelConfig.scrollRotateX

        const targetRotationY =
            flowerModelConfig.modelRotation[1] +
            mousePosition.x * flowerModelConfig.mouseRotateY +
            progress * flowerModelConfig.scrollRotateY

        const targetRotationZ =
            flowerModelConfig.modelRotation[2] +
            Math.sin(state.clock.elapsedTime * 0.32) * 0.025

        groupRef.current.rotation.x = THREE.MathUtils.damp(
            groupRef.current.rotation.x,
            targetRotationX,
            5,
            delta,
        )

        groupRef.current.rotation.y = THREE.MathUtils.damp(
            groupRef.current.rotation.y,
            targetRotationY,
            5,
            delta,
        )

        groupRef.current.rotation.z = THREE.MathUtils.damp(
            groupRef.current.rotation.z,
            targetRotationZ,
            5,
            delta,
        )

        const scrollScale = THREE.MathUtils.lerp(
            flowerModelConfig.scrollScaleStart,
            flowerModelConfig.scrollScaleEnd,
            progress,
        )

        const finalScale = flowerModelConfig.modelScale * scrollScale

        groupRef.current.scale.x = THREE.MathUtils.damp(
            groupRef.current.scale.x,
            finalScale,
            5,
            delta,
        )

        groupRef.current.scale.y = THREE.MathUtils.damp(
            groupRef.current.scale.y,
            finalScale,
            5,
            delta,
        )

        groupRef.current.scale.z = THREE.MathUtils.damp(
            groupRef.current.scale.z,
            finalScale,
            5,
            delta,
        )
    })

    return (
        <Bounds fit clip observe margin={1.15}>
            <Float speed={1.35} rotationIntensity={0.12} floatIntensity={0.26}>
                <group ref={groupRef} position={flowerModelConfig.modelPosition}>
                    <Center>
                        <Clone object={clonedScene} />
                    </Center>
                </group>
            </Float>
        </Bounds>
    )
}

useGLTF.preload(flowerModelConfig.modelPath)

export default RealFlower3D