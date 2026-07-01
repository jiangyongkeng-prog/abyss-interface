import { useMemo, useState } from "react";
import { sendChat } from "../lib/chatApi.js";

const starterMessages = [
  {
    role: "assistant",
    content: "我已经连接到后端中转。你可以直接问问题，也可以让我生成创意方案。"
  }
];

export default function ChatPanel({ config }) {
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleMessages = useMemo(() => messages.slice(-5), [messages]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      let assistantText = "";
      await sendChat({
        model: config.model,
        messages: nextMessages,
        onToken(token) {
          assistantText += token;
          setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
        }
      });
    } catch (error) {
      setMessages([...nextMessages, { role: "assistant", content: `连接失败：${error.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages(starterMessages);
  }

  return (
    <section className="chat-dock" aria-label="AI 聊天窗口">
      <div className="chat-topline">
        <span>Signal Chat</span>
        <button onClick={clearChat}>清空</button>
      </div>
      <div className="message-list">
        {visibleMessages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            <span>{message.role === "user" ? "你" : "AI"}</span>
            <p>{message.content || (loading ? "正在深空中解析信号..." : "")}</p>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="向你的深空模型发送消息"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          ↑
        </button>
      </form>
    </section>
  );
}
