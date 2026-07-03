import { motion } from "motion/react";
import MissionPortal3D from "./MissionPortal3D";

const markers = ["ORBIT 04", "SIGNAL 128", "GATEWAY LIVE"];

export default function MissionVisual() {
  return (
    <motion.div
      className="mission-visual"
      initial={{ opacity: 0, y: 70, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <div className="mission-visual__image" />
      <MissionPortal3D />
      <div className="mission-visual__scan" />
      <div className="mission-visual__hud">
        {markers.map((item) => (
          <strong key={item}>{item}</strong>
        ))}
      </div>
    </motion.div>
  );
}
