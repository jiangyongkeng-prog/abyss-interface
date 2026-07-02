import { motion } from 'motion/react'

function LoadingScreen({ isLeaving }) {
    return (
        <motion.div
            className="loading-screen"
            initial={{ opacity: 1 }}
            animate={{
                opacity: isLeaving ? 0 : 1,
                pointerEvents: isLeaving ? 'none' : 'auto',
            }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
        >
            <div className="loading-orb"></div>

            <motion.div
                className="loading-content"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            >
                <p>COSMOS</p>
                <h1>System Initializing</h1>

                <div className="loading-line">
                    <span></span>
                </div>

                <strong>PREPARING DEEP SPACE INTERFACE</strong>
            </motion.div>
        </motion.div>
    )
}

export default LoadingScreen