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
          Relay console
          <br />
          below the fold.
        </h2>
        <p className="terminal-lede">
          API 功能保留在最后一屏，视觉体验先完成，再进入可用的聊天控制台。
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
          <span className="api-dock-tag">BACKEND PROXY READY</span>
          <p>
            密钥放在 Node 后端，浏览器只连接自己的中转接口。这样页面上线后更安全，
            也方便以后切换模型。
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
