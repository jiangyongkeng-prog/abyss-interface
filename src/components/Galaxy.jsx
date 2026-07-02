import { motion } from 'motion/react'

const features = [
    {
        number: '01',
        title: 'Immersive Scroll',
        text: 'Hero scenes, pinned sections, blackout transitions, and cinematic reveal timing.',
    },
    {
        number: '02',
        title: '3D Visual Core',
        text: 'GLB model loading, camera movement, floating objects, and interactive rotation.',
    },
    {
        number: '03',
        title: 'Glass Interface',
        text: 'Layered cards, soft borders, blurred panels, and futuristic control surfaces.',
    },
    {
        number: '04',
        title: 'Motion System',
        text: 'Scroll-triggered animation, staggered content, hover response, and visual rhythm.',
    },
]

function Galaxy() {
    return (
        <section className="studio-bento" id="galaxy">
            <div className="bento-heading">
                <motion.p
                    className="eyebrow"
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                >
                    GALAXY MAP
                </motion.p>

                <motion.h2
                    initial={{ opacity: 0, y: 54 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                >
                    A modular system for premium web experiences.
                </motion.h2>
            </div>

            <div className="bento-grid">
                <motion.article
                    className="bento-card bento-card-large"
                    initial={{ opacity: 0, y: 60, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                >
                    <div className="bento-orbit">
                        <div className="bento-core"></div>
                    </div>

                    <div>
                        <span>LIVE INTERFACE</span>
                        <h3>Deep Space Control</h3>
                        <p>
                            A futuristic dashboard layer for signal tracking, navigation,
                            scroll response, and cinematic interface storytelling.
                        </p>
                    </div>
                </motion.article>

                {features.map((item, index) => (
                    <motion.article
                        className="bento-card"
                        key={item.title}
                        initial={{ opacity: 0, y: 56 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.75, delay: index * 0.07, ease: 'easeOut' }}
                    >
                        <span>{item.number}</span>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                    </motion.article>
                ))}
            </div>
        </section>
    )
}

export default Galaxy