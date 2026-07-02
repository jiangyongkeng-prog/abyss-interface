import { useState } from "react";
import { sendChat } from "../lib/chatApi.js";

const starterMessages = [
  {
    role: "assistant",
    content: "Relay online. 你可以在这里测试中转站模型。"
  }
];

export default function ChatPanel({ config }) {
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      let text = "";
      await sendChat({
        model: config.model,
        messages: nextMessages,
        onToken(token) {
          text += token;
          setMessages([...nextMessages, { role: "assistant", content: text }]);
        }
      });
    } catch (error) {
      setMessages([...nextMessages, { role: "assistant", content: `调用失败：${error.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages(starterMessages);
  }

  return (
    <article className="relay-console">
      <header className="relay-console__head">
        <div>
          <span>AI RELAY</span>
          <h3>Orbital Console</h3>
        </div>
        <button type="button" onClick={resetChat}>New</button>
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
          placeholder="Send a message to the relay model"
        />
        <button type="submit" disabled={loading || !input.trim()}>↑</button>
      </form>
    </article>
  );
}
