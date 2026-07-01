import { useEffect, useState } from "react";
import ExperienceCanvas from "./components/ExperienceCanvas.jsx";
import GlassInterface from "./components/GlassInterface.jsx";
import ChatPanel from "./components/ChatPanel.jsx";

export default function App() {
  const [mode, setMode] = useState("dive");
  const [config, setConfig] = useState({
    apiBase: "",
    model: "gpt-4-all",
    backendKeyConfigured: false
  });

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  return (
    <main className="app-shell">
      <ExperienceCanvas mode={mode} />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-orb">A</span>
          <span>Abyss Interface</span>
        </div>
        <nav className="nav-pills" aria-label="视图模式">
          <button className={mode === "dive" ? "active" : ""} onClick={() => setMode("dive")}>
            Dive
          </button>
          <button className={mode === "orbit" ? "active" : ""} onClick={() => setMode("orbit")}>
            Orbit
          </button>
          <button className={mode === "api" ? "active" : ""} onClick={() => setMode("api")}>
            API
          </button>
        </nav>
      </header>

      <section className="hero-copy" aria-label="视觉介绍">
        <p className="eyebrow">DEEP SPACE / ABYSS UI</p>
        <h1>Silent depth, luminous control.</h1>
        <p>
          一个带有 Z 轴纵深、星尘漂移、深海生物游动和玻璃拟态控制台的
          React Three Fiber 交互界面。
        </p>
      </section>

      <GlassInterface config={config} />
      <ChatPanel config={config} />
    </main>
  );
}
