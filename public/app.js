const apiKeyInput = document.querySelector("#apiKey");
const modelInput = document.querySelector("#model");
const temperatureInput = document.querySelector("#temperature");
const temperatureValue = document.querySelector("#temperatureValue");
const systemPromptInput = document.querySelector("#systemPrompt");
const promptInput = document.querySelector("#prompt");
const composer = document.querySelector("#composer");
const sendButton = document.querySelector("#sendButton");
const messagesEl = document.querySelector("#messages");
const template = document.querySelector("#messageTemplate");
const clearChatButton = document.querySelector("#clearChat");
const statusLight = document.querySelector("#statusLight");

const savedKey = sessionStorage.getItem("deepseek_api_key");
if (savedKey) apiKeyInput.value = savedKey;

let history = [];

temperatureInput.addEventListener("input", () => {
  temperatureValue.textContent = Number(temperatureInput.value).toFixed(1);
});

apiKeyInput.addEventListener("input", () => {
  sessionStorage.setItem("deepseek_api_key", apiKeyInput.value.trim());
  statusLight.classList.toggle("live", Boolean(apiKeyInput.value.trim()));
});

statusLight.classList.toggle("live", Boolean(apiKeyInput.value.trim()));

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    promptInput.focus();
  });
});

clearChatButton.addEventListener("click", () => {
  history = [];
  messagesEl.innerHTML = "";
  addMessage("assistant", "DeepSeek", "片场已重置。下一镜，直接开拍。");
});

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  promptInput.value = "";
  addMessage("user", "You", prompt);
  history.push({ role: "user", content: prompt });

  const assistantMessage = addMessage("assistant", "DeepSeek", "正在升起主光...");
  const output = assistantMessage.querySelector("p");
  output.textContent = "";

  setBusy(true);
  try {
    const answer = await streamChat(output);
    history.push({ role: "assistant", content: answer });
  } catch (error) {
    output.textContent = error.message || "调用失败，请检查 API Key 和网络。";
  } finally {
    setBusy(false);
  }
});

function addMessage(type, role, text) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add(type);
  node.querySelector(".avatar").textContent = type === "user" ? "YOU" : "AI";
  node.querySelector(".role").textContent = role;
  node.querySelector("p").textContent = text;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

function setBusy(isBusy) {
  sendButton.disabled = isBusy;
  promptInput.disabled = isBusy;
  sendButton.querySelector("span").textContent = isBusy ? "拍摄中" : "发送";
}

async function streamChat(output) {
  const messages = [
    { role: "system", content: systemPromptInput.value.trim() || "你是一个有帮助的中文助手。" },
    ...history
  ];

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value,
      temperature: Number(temperatureInput.value),
      messages
    })
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(readError(text) || `请求失败：HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;

      try {
        const chunk = JSON.parse(data);
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          answer += token;
          output.textContent = answer;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      } catch {
        // Some providers can emit keep-alive lines; ignore malformed stream fragments.
      }
    }
  }

  return answer || "没有收到内容。";
}

function readError(text) {
  try {
    const data = JSON.parse(text);
    return data.error?.message || data.error;
  } catch {
    return text;
  }
}
