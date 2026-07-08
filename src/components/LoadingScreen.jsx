import { motion } from 'motion/react'
import LogoParticleIntro from './LogoParticleIntro'

function LoadingScreen({ isLeaving }) {
    return (
        <motion.div
            className={`loading-screen ${isLeaving ? 'is-leaving' : ''}`}
            initial={{ opacity: 1 }}
            animate={{
                opacity: isLeaving ? 0 : 1,
                pointerEvents: isLeaving ? 'none' : 'auto',
            }}
            transition={{ duration: 0.65, delay: isLeaving ? 0.58 : 0, ease: 'easeOut' }}
        >
            <LogoParticleIntro isLeaving={isLeaving} />
            <div className="loading-orb"></div>

            <motion.div
                className="loading-content"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: isLeaving ? 0 : 1, y: isLeaving ? -18 : 0 }}
                transition={{ duration: isLeaving ? 0.34 : 0.8, delay: isLeaving ? 0 : 0.9, ease: 'easeOut' }}
            >
                <p>SPATIAL SYSTEM</p>
                <h1>Interface Awakening</h1>

                <div className="loading-line">
                    <span></span>
                </div>

                <strong>PREPARING DEEP SPACE INTERFACE</strong>
            </motion.div>
        </motion.div>
    )
}

export default LoadingScreen
