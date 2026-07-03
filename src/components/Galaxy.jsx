import { motion } from 'motion/react'

const features = [
    {
        number: '01',
        title: 'Immersive Scroll',
        text: 'Pinned sections and cinematic reveal timing.',
    },
    {
        number: '02',
        title: '3D Visual Core',
        text: 'GLB loading, camera motion, and interactive rotation.',
    },
    {
        number: '03',
        title: 'Glass Interface',
        text: 'Soft borders, blurred panels, and control surfaces.',
    },
    {
        number: '04',
        title: 'Motion System',
        text: 'Staggered motion, hover response, and visual rhythm.',
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
                    Visual modules for a cinematic space interface.
                </motion.h2>
                <motion.p
                    className="bento-lede"
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.75, delay: 0.1, ease: 'easeOut' }}
                >
                    把模型、粒子、玻璃 UI 和滚动叙事拆成可复用模块，后面继续升级官网时不会乱。
                </motion.p>
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
                            A calm command layer for visual navigation, signal tracking,
                            and premium product storytelling.
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
