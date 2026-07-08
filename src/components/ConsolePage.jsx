import { useEffect, useState } from "react";
import ChatPanel from "./ChatPanel";

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export default function ConsolePage({ config }) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    fetchJson("/api/console/session")
      .then((data) => {
        if (alive) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    if (!password.trim()) return;

    setError("");
    try {
      await fetchJson("/api/console/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      setAuthenticated(true);
      setPassword("");
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  async function handleLogout() {
    await fetchJson("/api/console/logout", { method: "POST" }).catch(() => {});
    setAuthenticated(false);
    setPassword("");
  }

  if (checking) {
    return (
      <main className="console-page console-page--loading">
        <div className="console-depth-field" aria-hidden="true" />
        <p className="console-loader">Checking access channel...</p>
      </main>
    );
  }

  return (
    <main className="console-page">
      <div className="console-depth-field" aria-hidden="true" />
      <div className="console-current" aria-hidden="true" />

      <header className="console-topbar">
        <a className="console-brand" href="/">
          COSMOS Chat
        </a>
        <div className="console-status">
          <span>{config.databaseConfigured ? "SUPABASE LINKED" : "DATABASE OFFLINE"}</span>
          <span>{config.videoConfigured ? "VIDEO READY" : "VIDEO OFFLINE"}</span>
          {authenticated ? (
            <button className="console-lock" type="button" onClick={handleLogout}>
              Lock console
            </button>
          ) : null}
        </div>
      </header>

      {!authenticated ? (
        <section className="access-gate" aria-label="Console access gate">
          <div className="access-gate__seal" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="access-panel">
            <p className="eyebrow">FOREST ACCESS</p>
            <h1>Private chat garden.</h1>
            <p>
              Enter the access code to open the private AI chat workspace.
            </p>

            <form className="access-form" onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Access code"
                autoComplete="current-password"
              />
              <button type="submit">Unlock</button>
            </form>
            {error ? <p className="access-error">{error}</p> : null}
          </div>
        </section>
      ) : (
        <section className="command-deck" aria-label="Private AI chat console">
          <ChatPanel config={config} />
        </section>
      )}
    </main>
  );
}
