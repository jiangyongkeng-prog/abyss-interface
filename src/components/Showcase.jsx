import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

const showcaseItems = [
    {
        number: '01',
        title: 'Orbital Landing',
        type: 'Hero / 3D / Motion',
        text: 'A cinematic landing experience with a central 3D object, scroll-driven camera motion, and space atmosphere.',
    },
    {
        number: '02',
        title: 'Signal Dashboard',
        type: 'Interface / Data / Glass',
        text: 'A futuristic control panel using glass cards, animated rings, signal status, and layered UI rhythm.',
    },
    {
        number: '03',
        title: 'Spatial Narrative',
        type: 'Scroll / Story / Layout',
        text: 'A page structure designed around motion timing, section transitions, and immersive storytelling.',
    },
    {
        number: '04',
        title: 'Launch System',
        type: 'CTA / Product / Flow',
        text: 'A final conversion section that feels like a launch terminal instead of a normal contact form.',
    },
]

function Showcase() {
    const sectionRef = useRef(null)

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end end'],
    })

    const trackX = useTransform(
        scrollYProgress,
        [0, 0.18, 0.72, 1],
        ['0px', '0px', '-620px', '-620px'],
    )

    const sideOpacity = useTransform(
        scrollYProgress,
        [0, 0.12, 0.82, 1],
        [1, 1, 0.82, 0.38],
    )

    const progressWidth = useTransform(
        scrollYProgress,
        [0.18, 0.72],
        ['0%', '100%'],
    )

    return (
        <section className="showcase-section showcase-final" id="showcase" ref={sectionRef}>
            <div className="showcase-final-sticky">
                <motion.div className="showcase-final-copy" style={{ opacity: sideOpacity }}>
                    <p className="eyebrow">SELECTED SYSTEMS</p>

                    <h2>
                        Selected
                        <br />
                        Interface
                        <br />
                        Systems
                    </h2>

                    <p>
                        A collection of cinematic interface modules built around 3D motion,
                        glass surfaces, and scroll-driven storytelling.
                    </p>

                    <div className="showcase-progress">
                        <motion.span style={{ width: progressWidth }}></motion.span>
                    </div>
                </motion.div>

                <div className="showcase-final-viewport">
                    <motion.div className="showcase-final-track" style={{ x: trackX }}>
                        {showcaseItems.map((item) => (
                            <article className="showcase-final-card" key={item.title}>
                                <div className="showcase-card-top">
                                    <span>{item.number}</span>
                                    <p>{item.type}</p>
                                </div>

                                <div className="showcase-visual">
                                    <div className="showcase-orb"></div>
                                </div>

                                <div className="showcase-card-bottom">
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </div>
                            </article>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default Showcase