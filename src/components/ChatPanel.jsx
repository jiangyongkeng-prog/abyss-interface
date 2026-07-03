import { useEffect, useMemo, useRef, useState } from "react";
import { sendChat } from "../lib/chatApi.js";

const STORAGE_KEY = "cosmos-relay-conversations-v1";

const starterMessages = [
  {
    role: "assistant",
    content: "Relay online. 复制中转站 API 地址和令牌后，可以在这里测试模型。"
  }
];

function createConversation(title = "新对话") {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(16).slice(2)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: starterMessages
  };
}

function loadConversations() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // Ignore broken local data and create a fresh chat.
  }

  return [createConversation()];
}

function formatTime(time) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(time);
}

export default function ChatPanel({ config }) {
  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = loadConversations();

  const [conversations, setConversations] = useState(initialRef.current);
  const [activeId, setActiveId] = useState(initialRef.current[0]?.id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || conversations[0],
    [activeId, conversations]
  );

  const messages = activeConversation?.messages || starterMessages;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  function updateActiveConversation(updater) {
    setConversations((current) =>
      current
        .map((conversation) =>
          conversation.id === activeConversation.id ? updater(conversation) : conversation
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  function handleNewConversation() {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
  }

  function handleDeleteConversation(id) {
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);
      const safeNext = next.length ? next : [createConversation()];
      if (id === activeId) setActiveId(safeNext[0].id);
      return safeNext;
    });
  }

  function resetActiveChat() {
    updateActiveConversation((conversation) => ({
      ...conversation,
      title: "新对话",
      updatedAt: Date.now(),
      messages: starterMessages
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading || !activeConversation) return;

    const nextMessages = [...messages, { role: "user", content }];
    const nextTitle =
      activeConversation.title === "新对话" ? content.slice(0, 18) : activeConversation.title;

    updateActiveConversation((conversation) => ({
      ...conversation,
      title: nextTitle,
      updatedAt: Date.now(),
      messages: [...nextMessages, { role: "assistant", content: "" }]
    }));

    setInput("");
    setLoading(true);

    try {
      let text = "";
      await sendChat({
        model: config.model,
        messages: nextMessages,
        onToken(token) {
          text += token;
          updateActiveConversation((conversation) => ({
            ...conversation,
            updatedAt: Date.now(),
            messages: [...nextMessages, { role: "assistant", content: text }]
          }));
        }
      });
    } catch (error) {
      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...nextMessages, { role: "assistant", content: `调用失败：${error.message}` }]
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="relay-console">
      <aside className="relay-history" aria-label="历史对话">
        <div className="relay-history__head">
          <div>
            <span>HISTORY</span>
            <strong>{conversations.length}</strong>
          </div>
          <button type="button" onClick={handleNewConversation} aria-label="新建对话">
            +
          </button>
        </div>

        <div className="relay-history__list">
          {conversations.map((conversation) => (
            <button
              className={`relay-history__item ${
                conversation.id === activeConversation?.id ? "active" : ""
              }`}
              type="button"
              key={conversation.id}
              onClick={() => setActiveId(conversation.id)}
            >
              <span>{conversation.title || "新对话"}</span>
              <small>{formatTime(conversation.updatedAt)}</small>
              <i
                role="button"
                tabIndex="0"
                aria-label="删除对话"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteConversation(conversation.id);
                }}
              >
                x
              </i>
            </button>
          ))}
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
              新对话
            </button>
            <button type="button" onClick={resetActiveChat}>
              清空
            </button>
          </div>
        </header>

        <section className="relay-console__settings">
          <label>
            API Base
            <input value={config.apiBase || "https://ai.lalakunaozi.fun"} readOnly />
          </label>
          <label>
            Model
            <input value={config.model || "gpt-4-all"} readOnly />
          </label>
        </section>

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
            placeholder="向你的中转站模型发送消息"
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="发送">
            ↑
          </button>
        </form>
      </div>
    </article>
  );
}
