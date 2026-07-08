import { motion } from "motion/react";

export default function Contact({ config }) {
  return (
    <section className="studio-terminal api-dock-section" id="contact">
      <div className="api-dock-bg" aria-hidden="true" />

      <motion.div
        className="terminal-heading"
        initial={{ opacity: 0, y: 58 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      >
        <p className="eyebrow">RELAY STATION</p>
        <h2>
          Abyss console
          <br />
          behind the gate.
        </h2>
        <p className="terminal-lede">
          The public site stays cinematic. The private console opens as a dedicated command deck.
        </p>
      </motion.div>

      <motion.div
        className="terminal-layout api-dock-layout"
        initial={{ opacity: 0, y: 80, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <div className="terminal-cta api-dock-copy">
          <span className="api-dock-tag">PRIVATE GENERATION DECK</span>
          <p>
            Chat, image generation, and image-to-video tasks now live behind a password-protected Abyss access gate.
          </p>

          <div className="api-dock-metrics">
            <div><strong>{config.model || "gpt-5.5"}</strong><span>Model</span></div>
            <div><strong>{config.backendKeyConfigured ? "READY" : "NO KEY"}</strong><span>Status</span></div>
          </div>
        </div>

        <a className="api-dock-launch" href="/console">
          <span>Open private console</span>
          <strong>ABYSS ACCESS</strong>
        </a>
      </motion.div>
    </section>
  );
}
