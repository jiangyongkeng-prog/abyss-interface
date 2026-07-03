import { useRef, useState } from "react";
import { motion, useMotionValue } from "motion/react";
import SpaceScene from "./SpaceScene";
import SpaceGateway3D from "./SpaceGateway3D";
import SoftwareVortex from "./SoftwareVortex";

function Hero() {
    const heroRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const gatewayProgress = useMotionValue(0.42);

    function handleMouseMove(event) {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        setMousePosition({ x, y });
    }

    function handleMouseLeave() {
        setMousePosition({ x: 0, y: 0 });
    }

    return (
        <main
            ref={heroRef}
            className="hero drone-hero"
            id="home"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <section className="home-station-section">
                <SpaceScene
                    mousePosition={mousePosition}
                    sceneX="0vw"
                    sceneY="2vh"
                    sceneScale={1}
                    sceneOpacity={1}
                    speedOpacity={0}
                    speedScale={1}
                />

                <SpaceGateway3D
                    mousePosition={mousePosition}
                    scrollYProgress={gatewayProgress}
                />

                <div className="home-depth-field" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => (
                        <span key={index} style={{ "--i": index }} />
                    ))}
                </div>

                <motion.div
                    className="drone-intro-label"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.35 }}
                >
                    <span>SPATIAL INTERFACE</span>
                    <strong>SCROLL TO ENTER ORBIT</strong>
                </motion.div>
            </section>

            <section className="home-vortex-section">
                <div className="home-vortex-bg" />
                <SoftwareVortex />
                <motion.div
                    className="home-vortex-copy"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.75 }}
                >
                    <p className="eyebrow">SOFTWARE GRAVITY</p>
                    <h1>ICON STORM<br />IN ORBIT</h1>
                    <p>
                        第二段 Home 不再出现空间基站，而是让软件图标像玻璃碎片一样围成 3D 龙卷风。
                        它会持续转动，作为进入 Mission 前的视觉过渡。
                    </p>
                </motion.div>
            </section>
        </main>
    );
}

export default Hero;
