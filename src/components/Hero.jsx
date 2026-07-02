import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import SpaceScene from './SpaceScene'

function Hero() {
    const heroRef = useRef(null)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end end'],
    })

    const sceneX = useTransform(
        scrollYProgress,
        [0, 0.28, 1],
        ['-12vw', '0vw', '0vw'],
    )

    const sceneY = useTransform(
        scrollYProgress,
        [0, 0.28, 0.74, 1],
        ['2vh', '0vh', '0vh', '5vh'],
    )

    const sceneScale = useTransform(
        scrollYProgress,
        [0, 0.28, 0.68, 1],
        [0.88, 1, 1.32, 1.62],
    )

    const sceneOpacity = useTransform(
        scrollYProgress,
        [0, 0.78, 0.94, 1],
        [1, 1, 0.55, 0],
    )

    const speedOpacity = useTransform(
        scrollYProgress,
        [0, 0.28, 0.52, 0.82],
        [0, 0, 0.75, 0],
    )

    const speedScale = useTransform(
        scrollYProgress,
        [0.28, 0.82],
        [0.7, 1.25],
    )

    const flashOpacity = useTransform(
        scrollYProgress,
        [0, 0.58, 0.76, 0.94],
        [0, 0, 0.88, 0],
    )

    const flashScale = useTransform(
        scrollYProgress,
        [0.58, 0.82],
        [0.35, 1.65],
    )

    const blackoutOpacity = useTransform(
        scrollYProgress,
        [0, 0.76, 1],
        [0, 0, 0.96],
    )

    const introOpacity = useTransform(
        scrollYProgress,
        [0, 0.18],
        [1, 0],
    )

    const centerLabelOpacity = useTransform(
        scrollYProgress,
        [0.22, 0.38, 0.58],
        [0, 1, 0],
    )

    const nextOpacity = useTransform(
        scrollYProgress,
        [0.68, 0.84],
        [0, 1],
    )

    const nextY = useTransform(
        scrollYProgress,
        [0.68, 0.84],
        [20, 0],
    )

    function handleMouseMove(event) {
        const { innerWidth, innerHeight } = window

        const x = (event.clientX / innerWidth - 0.5) * 2
        const y = (event.clientY / innerHeight - 0.5) * 2

        setMousePosition({ x, y })
    }

    function handleMouseLeave() {
        setMousePosition({ x: 0, y: 0 })
    }

    return (
        <main
            ref={heroRef}
            className="hero drone-hero"
            id="home"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="drone-hero-pin">
                <SpaceScene
                    mousePosition={mousePosition}
                    scrollYProgress={scrollYProgress}
                    sceneX={sceneX}
                    sceneY={sceneY}
                    sceneScale={sceneScale}
                    sceneOpacity={sceneOpacity}
                    speedOpacity={speedOpacity}
                    speedScale={speedScale}
                />

                <motion.div
                    className="drone-flash"
                    style={{
                        opacity: flashOpacity,
                        scale: flashScale,
                    }}
                />

                <motion.div
                    className="drone-blackout"
                    style={{
                        opacity: blackoutOpacity,
                    }}
                />

                <motion.div
                    className="drone-intro-label"
                    style={{
                        opacity: introOpacity,
                    }}
                >
                    <span>SPATIAL INTERFACE</span>
                    <strong>SCROLL TO BEGIN FLIGHT</strong>
                </motion.div>

                <motion.div
                    className="drone-center-label"
                    style={{
                        opacity: centerLabelOpacity,
                    }}
                >
                    <span>OBJECT LOCKED</span>
                    <strong>CAMERA MOVING TO CORE</strong>
                </motion.div>

                <motion.div
                    className="drone-next-label"
                    style={{
                        opacity: nextOpacity,
                        y: nextY,
                    }}
                >
                    <span>NEXT MODULE</span>
                    <strong>MISSION CONTROL</strong>
                </motion.div>
            </div>
        </main>
    )
}

export default Hero