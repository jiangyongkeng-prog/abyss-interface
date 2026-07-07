import { useEffect, useMemo, useState } from "react";
import { sendChat } from "../lib/chatApi.js";

const DEFAULT_TITLE = "New chat";
const starterMessages = [
  {
    role: "assistant",
    content: "Relay online. Messages and generation tasks are saved to Supabase."
  }
];

function createLocalConversation(title = DEFAULT_TITLE) {
  const now = Date.now();
  return {
    id: `local-${now}-${Math.random().toString(16).slice(2)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: starterMessages
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function formatTime(time) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(Number(time || Date.now()));
}

export default function ChatPanel({ config }) {
  const [conversations, setConversations] = useState([createLocalConversation()]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || conversations[0],
    [activeId, conversations]
  );

  const messages = activeConversation?.messages || starterMessages;

  useEffect(() => {
    let alive = true;

    async function loadHistory() {
      try {
        const data = await fetchJson("/api/conversations");
        if (!alive) return;
        const next = data.conversations?.length ? data.conversations : [createLocalConversation()];
        setConversations(next);
        setActiveId(next[0]?.id || "");
        setHistoryError("");
      } catch (error) {
        if (!alive) return;
        setHistoryError(`History failed to load: ${error.message}`);
      } finally {
        if (alive) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      alive = false;
    };
  }, []);

  function updateConversation(id, updater) {
    setConversations((current) =>
      current
        .map((conversation) => (conversation.id === id ? updater(conversation) : conversation))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  async function handleNewConversation() {
    setInput("");
    try {
      const data = await fetchJson("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: DEFAULT_TITLE })
      });
      setConversations((current) => [data.conversation, ...current]);
      setActiveId(data.conversation.id);
      setHistoryError("");
    } catch (error) {
      const conversation = createLocalConversation();
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversation.id);
      setHistoryError(`New chat was not saved to the database: ${error.message}`);
    }
  }

  async function handleDeleteConversation(id) {
    const currentConversation = activeConversation;
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);
      const safeNext = next.length ? next : [createLocalConversation()];
      if (id === currentConversation?.id) setActiveId(safeNext[0].id);
      return safeNext;
    });

    if (!id.startsWith("local-")) {
      try {
        await fetchJson(`/api/conversations/${id}`, { method: "DELETE" });
        setHistoryError("");
      } catch (error) {
        setHistoryError(`Delete failed: ${error.message}`);
      }
    }
  }

  async function resetActiveChat() {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: DEFAULT_TITLE,
      updatedAt: Date.now(),
      messages: starterMessages
    }));

    if (!activeConversation.id.startsWith("local-")) {
      try {
        const data = await fetchJson(`/api/conversations/${activeConversation.id}/reset`, {
          method: "POST"
        });
        updateConversation(activeConversation.id, () => data.conversation);
        setHistoryError("");
      } catch (error) {
        setHistoryError(`Reset failed: ${error.message}`);
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading || !activeConversation) return;

    const conversationId = activeConversation.id;
    const nextMessages = [...messages, { role: "user", content }];
    const nextTitle = activeConversation.title === DEFAULT_TITLE ? content.slice(0, 18) : activeConversation.title;

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: nextTitle,
      updatedAt: Date.now(),
      messages: [...nextMessages, { role: "assistant", content: "" }]
    }));

    setInput("");
    setLoading(true);

    try {
      let text = "";
      const savedConversationId = await sendChat({
        conversationId,
        model: config.model,
        messages: nextMessages,
        onToken(token) {
          text += token;
          updateConversation(conversationId, (conversation) => ({
            ...conversation,
            updatedAt: Date.now(),
            messages: [...nextMessages, { role: "assistant", content: text }]
          }));
        }
      });

      if (savedConversationId && savedConversationId !== conversationId) {
        setActiveId(savedConversationId);
      }
      setHistoryError("");
    } catch (error) {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...nextMessages, { role: "assistant", content: `Request failed: ${error.message}` }]
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="relay-console">
      <aside className="relay-history" aria-label="Chat history">
        <div className="relay-history__head">
          <div>
            <span>HISTORY</span>
            <strong>{conversations.length}</strong>
          </div>
          <button type="button" onClick={handleNewConversation} aria-label="New chat">
            +
          </button>
        </div>

        <div className="relay-history__list">
          {historyLoading ? (
            <div className="relay-history__item">
              <span>Loading history...</span>
              <small>Supabase</small>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                className={`relay-history__item ${
                  conversation.id === activeConversation?.id ? "active" : ""
                }`}
                type="button"
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
              >
                <span>{conversation.title || DEFAULT_TITLE}</span>
                <small>{formatTime(conversation.updatedAt)}</small>
                <i
                  role="button"
                  tabIndex="0"
                  aria-label="Delete chat"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                >
                  x
                </i>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="relay-main">
        <header className="relay-console__head">
          <div>
            <span>AI RELAY</span>
            <h3>Orbital Console</h3>
          </div>
          <div className="relay-console__actions">
            <button type="button" onClick={handleNewConversation}>
              New chat
            </button>
            <button type="button" onClick={resetActiveChat}>
              Clear
            </button>
          </div>
        </header>

        <section className="relay-console__settings">
          <label>
            Chat API
            <input value={config.apiBase || "Not configured"} readOnly />
          </label>
          <label>
            Chat Model
            <input value={config.model || "Not configured"} readOnly />
          </label>
          <label>
            Supabase
            <input value={config.databaseConfigured ? "Connected" : "Not configured"} readOnly />
          </label>
          <label>
            Image API
            <input value={config.imageConfigured ? "Ready" : "Not configured"} readOnly />
          </label>
          <label>
            Video API
            <input value={config.videoConfigured ? "Ready" : "Not configured"} readOnly />
          </label>
        </section>

        {historyError ? <p className="relay-status">{historyError}</p> : null}

        <section className="relay-console__messages">
          {messages.map((message, index) => (
            <article className={`relay-message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === "user" ? "YOU" : "AI"}</span>
              <p>{message.content || (loading ? "Receiving signal..." : "")}</p>
            </article>
          ))}
        </section>

        <form className="relay-console__composer" onSubmit={handleSubmit}>
          <textarea
            rows="1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Chat, generate an image, or create a video..."
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send">
            →
          </button>
        </form>
      </div>
    </article>
  );
}
