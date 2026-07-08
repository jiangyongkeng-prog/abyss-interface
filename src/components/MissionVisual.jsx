import { motion, useInView } from "motion/react";
import { useRef } from "react";
import DeepSeaAstronaut3D from "./DeepSeaAstronaut3D";
import DeepSeaMotion from "./DeepSeaMotion";

const markers = ["DEPTH 04", "CURRENT 128", "ABYSS LIVE"];

export default function MissionVisual() {
  const visualRef = useRef(null);
  const shouldLoadAstronaut = useInView(visualRef, { once: true, margin: "260px" });

  return (
    <motion.div
      ref={visualRef}
      className="mission-visual"
      initial={{ opacity: 0, y: 70, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <div className="mission-visual__image" />
      <DeepSeaMotion />
      {shouldLoadAstronaut && <DeepSeaAstronaut3D />}
      <div className="mission-visual__scan" />
      <div className="mission-visual__hud">
        {markers.map((item) => (
          <strong key={item}>{item}</strong>
        ))}
      </div>
    </motion.div>
  );
}
