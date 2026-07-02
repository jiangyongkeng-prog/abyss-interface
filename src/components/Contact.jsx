import { motion } from "motion/react";
import ChatPanel from "./ChatPanel";

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
          API stays quiet
          <br />
          until the world is built.
        </h2>
      </motion.div>

      <motion.div
        className="terminal-layout api-dock-layout"
        initial={{ opacity: 0, y: 80, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <div className="terminal-cta api-dock-copy">
          <span className="api-dock-tag">BACKEND PROXY READY</span>
          <p>
            The key is kept on the Node backend. The browser only talks to a local relay endpoint,
            so the cinematic front-end can stay clean while the chat model remains usable.
          </p>

          <div className="api-dock-metrics">
            <div><strong>{config.model || "gpt-4-all"}</strong><span>Model</span></div>
            <div><strong>{config.backendKeyConfigured ? "READY" : "NO KEY"}</strong><span>Status</span></div>
          </div>
        </div>

        <ChatPanel config={config} />
      </motion.div>
    </section>
  );
}
