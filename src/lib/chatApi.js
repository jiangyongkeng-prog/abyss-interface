function extractTokenFromLine(line) {
  if (!line.startsWith("data:")) return "";
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return "";

  try {
    const json = JSON.parse(data);
    return json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

export async function sendChat({ conversationId, model, messages, attachments, referenceMode, signal, onToken }) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, model, messages, attachments, referenceMode, temperature: 0.7 }),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const token = extractTokenFromLine(line.trim());
      if (token) onToken(token);
    }
  }

  return response.headers.get("X-Conversation-Id");
}
