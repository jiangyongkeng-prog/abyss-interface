import { motion } from 'motion/react'
import MissionVisual from './MissionVisual'

const stats = [
    { value: '3D', label: 'Spatial Interface' },
    { value: '60FPS', label: 'Motion Target' },
    { value: 'React', label: 'Frontend System' },
]

function Mission() {
    return (
        <section className="studio-manifesto" id="mission">
            <div className="mission-shell">
                <div>
                    <motion.div
                        className="studio-kicker"
                        initial={{ opacity: 0, y: 34 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.75, ease: 'easeOut' }}
                    >
                        <span>MISSION CONTROL</span>
                        <p>01 / SYSTEM PHILOSOPHY</p>
                    </motion.div>

                    <motion.div
                        className="manifesto-copy"
                        initial={{ opacity: 0, y: 70 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.28 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                    >
                        <h2>
                            Spatial websites that feel less like pages,
                            <br />
                            and more like cinematic systems.
                        </h2>
                    </motion.div>

                    <div className="manifesto-bottom">
                        <motion.p
                            initial={{ opacity: 0, y: 36 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.35 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        >
                            A high-end interface direction combining 3D models, scroll transitions,
                            glass surfaces, soft space lighting, and editorial typography.
                        </motion.p>

                        <div className="manifesto-stats">
                            {stats.map((item, index) => (
                                <motion.div
                                    className="manifesto-stat"
                                    key={item.label}
                                    initial={{ opacity: 0, y: 42 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.35 }}
                                    transition={{ duration: 0.75, delay: index * 0.08, ease: 'easeOut' }}
                                >
                                    <strong>{item.value}</strong>
                                    <span>{item.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                <MissionVisual />
            </div>
        </section>
    )
}

export default Mission
