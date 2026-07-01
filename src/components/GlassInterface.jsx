export default function GlassInterface({ config }) {
  return (
    <aside className="system-card">
      <div className="card-header">
        <span>Relay Console</span>
        <span className={config.backendKeyConfigured ? "status ready" : "status"} />
      </div>
      <div className="metric-grid">
        <div>
          <small>MODEL</small>
          <strong>{config.model || "gpt-4-all"}</strong>
        </div>
        <div>
          <small>API</small>
          <strong>{config.backendKeyConfigured ? "READY" : "NO KEY"}</strong>
        </div>
        <div>
          <small>DEPTH</small>
          <strong>34 Z</strong>
        </div>
        <div>
          <small>BLOOM</small>
          <strong>ON</strong>
        </div>
      </div>
      <p>
        Key 保存在后端环境变量里，前端只发送消息。视觉层由 R3F 渲染，UI 层保持轻量玻璃拟态。
      </p>
    </aside>
  );
}
