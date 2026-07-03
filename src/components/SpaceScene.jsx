import { motion } from 'motion/react'
import MeteorShower from './MeteorShower'

function SpaceScene({
                        mousePosition,
                        scrollYProgress,
                        sceneX,
                        sceneY,
                        sceneScale,
                        sceneOpacity,
                        speedOpacity,
                        speedScale,
                    }) {
    return (
        <motion.section className="drone-scene">
            <motion.div
                className="drone-speed-lines"
                style={{
                    opacity: speedOpacity,
                    scale: speedScale,
                }}
            >
                {Array.from({ length: 22 }).map((_, index) => (
                    <span
                        key={index}
                        style={{
                            '--i': index,
                            animationDelay: `${index * 0.035}s`,
                        }}
                    />
                ))}
            </motion.div>

            <motion.div
                className="drone-scene-camera"
                style={{
                    x: sceneX,
                    y: sceneY,
                    scale: sceneScale,
                    opacity: sceneOpacity,
                }}
            >
                <MeteorShower />

                <div className="orbit-wrap orbit-wrap-one">
                    <div className="orbit orbit-one"></div>
                </div>

                <div className="orbit-wrap orbit-wrap-two">
                    <div className="orbit orbit-two"></div>
                </div>
            </motion.div>
        </motion.section>
    )
}

export default SpaceScene
