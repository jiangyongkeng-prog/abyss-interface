import { memo, useEffect, useMemo, useRef, useState } from "react";
import { sendChat } from "../lib/chatApi.js";

const DEFAULT_TITLE = "New chat";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const VIDEO_ASPECT_RATIO = 16 / 9;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENT_ACCEPT = [
  "image/*",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
  ".json"
].join(",");
const starterMessages = [
  {
    role: "assistant",
    content: "控制台已连接。聊天记录和生成任务会自动保存。"
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

function cleanUrl(value) {
  return String(value || "").trim().replace(/[)\].,;:!?'"，。；：！？、】》）]+$/g, "");
}

function getMediaUrls(content) {
  const matches = String(content || "").match(/(?:https?:\/\/[^\s<>"']+|\/generated\/[^\s<>"']+)/g) || [];
  return [...new Set(matches.map(cleanUrl))];
}

function isVideoUrl(url) {
  return /\.(mp4|webm|mov)(?:$|\?)/i.test(url);
}

function isImageUrl(url) {
  return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(url);
}

function splitCodeBlocks(content) {
  const parts = [];
  const pattern = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(content || ""))) {
    if (match.index > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    parts.push({ type: "code", lang: match[1] || "text", value: match[2].trim() });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < String(content || "").length) parts.push({ type: "text", value: String(content || "").slice(lastIndex) });
  return parts.length ? parts : [{ type: "text", value: content || "" }];
}

function splitTechnicalDetails(content) {
  const match = String(content || "").match(/\n?\[TECHNICAL_DETAILS\]([\s\S]*?)\[\/TECHNICAL_DETAILS\]\s*$/);
  if (!match) return { content: content || "", details: "" };
  return {
    content: String(content || "").slice(0, match.index).trim(),
    details: match[1].trim()
  };
}

function CopyCard({ lang, value }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > 1100 || value.split("\n").length > 18;
  const preview = isLong && !expanded ? `${value.slice(0, 520).trimEnd()}\n…` : value;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(value || "");
    } catch {
      // The message-level copy action remains available as a fallback.
    }
  };

  return (
    <div className="relay-copy-card">
      <div className="relay-copy-card__head">
        <span>{lang === "text" ? "提示词" : lang}</span>
        <div>
          {isLong ? (
            <button type="button" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "收起" : "展开"}
            </button>
          ) : null}
          <button type="button" onClick={copyText}>复制</button>
        </div>
      </div>
      <pre>{preview}</pre>
    </div>
  );
}

const MessageContent = memo(function MessageContent({ content, loading }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const safeContent = content || (loading ? "Receiving signal..." : "");
  const parsedContent = splitTechnicalDetails(safeContent);
  const urls = getMediaUrls(parsedContent.content);
  const textOnly = urls.reduce((text, url) => text.replace(url, "").trim(), parsedContent.content);
  const markFailed = (url) => setFailedUrls((current) => (current.includes(url) ? current : [...current, url]));

  return (
    <div className="relay-message__body">
      {textOnly
        ? splitCodeBlocks(textOnly).map((part, index) =>
            part.type === "code" ? (
              <CopyCard key={`code-${index}`} lang={part.lang} value={part.value} />
            ) : part.value.trim() ? (
              <p key={`text-${index}`}>{part.value.trim()}</p>
            ) : null
          )
        : null}
      {urls.map((url) => {
        if (failedUrls.includes(url)) {
          return (
            <a className="relay-media-link relay-media-link--missing" key={url} href={url} target="_blank" rel="noreferrer">
              Generated file is no longer available. Open saved link
            </a>
          );
        }
        if (isVideoUrl(url)) {
          return (
            <video
              className="relay-media relay-media--video"
              key={url}
              controls
              playsInline
              preload="auto"
              src={url}
              onError={() => markFailed(url)}
            />
          );
        }
        if (isImageUrl(url)) {
          return (
            <img
              className="relay-media relay-media--image"
              key={url}
              src={url}
              alt="Generated result"
              onError={() => markFailed(url)}
            />
          );
        }
        return (
          <a className="relay-media-link" key={url} href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        );
      })}
      {parsedContent.details ? (
        <details className="relay-error-details">
          <summary>查看技术详情</summary>
          <pre>{parsedContent.details}</pre>
        </details>
      ) : null}
    </div>
  );
});

export default function ChatPanel({ config }) {
  const [conversations, setConversations] = useState([createLocalConversation()]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [referenceMode, setReferenceMode] = useState("auto");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const firstFrameInputRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || conversations[0],
    [activeId, conversations]
  );

  const messages = activeConversation?.messages || starterMessages;
  const decoratedMessages = useMemo(() => {
    let assistantIndex = 0;
    return messages.map((message) => ({
      ...message,
      replySkin: message.role === "assistant" ? assistantIndex++ % 5 : null
    }));
  }, [messages]);

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [input]);

  function updateConversation(id, updater) {
    setConversations((current) =>
      current
        .map((conversation) => (conversation.id === id ? updater(conversation) : conversation))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  async function handleNewConversation() {
    setInput("");
    setAttachments([]);
    setUploadedImage(null);
    setHistoryOpen(false);
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

  async function handleCopyMessage(content) {
    try {
      await navigator.clipboard.writeText(content || "");
    } catch {
      setHistoryError("Copy failed. Your browser blocked clipboard access.");
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  function readImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("无法读取图片尺寸"));
      image.src = dataUrl;
    });
  }

  async function uploadFile(file) {
    return await fetchJson("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name || "attachment")
      },
      body: file
    });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setHistoryError("首帧仅支持 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setHistoryError("首帧图片不能超过 10 MB。");
      return;
    }

    setUploadingImage(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await readImageDimensions(dataUrl);
      const data = await uploadFile(file);
      const aspectRatio = dimensions.width / dimensions.height;
      setUploadedImage({
        url: data.url,
        name: data.name || file.name,
        ...dimensions,
        aspectWarning: Math.abs(aspectRatio - VIDEO_ASPECT_RATIO) > 0.08
      });
      setReferenceMode("manual");
      setHistoryError("");
    } catch (error) {
      setHistoryError(`Image upload failed: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAttachmentFiles(files) {
    const selected = [...files].slice(0, Math.max(0, 8 - attachments.length));
    if (!selected.length) return;
    setUploadingImage(true);
    try {
      const uploaded = [];
      for (const file of selected) {
        const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
        const isDocument = /\.(pdf|docx|txt|md|csv|json)$/i.test(file.name);
        const maxBytes = isVideo ? 100 * 1024 * 1024 : isDocument ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error(`${file.name} 文件过大`);
        }
        uploaded.push(await uploadFile(file));
      }
      setAttachments((current) => [...current, ...uploaded].slice(0, 8));
      setHistoryError("");
    } catch (error) {
      setHistoryError(`附件上传失败：${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleAttachmentInput(event) {
    const files = event.target.files || [];
    event.target.value = "";
    handleAttachmentFiles(files);
  }

  function handlePaste(event) {
    const directFiles = [...(event.clipboardData?.files || [])];
    const itemFiles = [...(event.clipboardData?.items || [])]
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const files = directFiles.length ? directFiles : itemFiles;
    if (!files.length) return;
    event.preventDefault();
    handleAttachmentFiles(files);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDraggingFiles(false);
    handleAttachmentFiles(event.dataTransfer?.files || []);
  }

  async function handleDeleteMessage(message, index) {
    const conversationId = activeConversation?.id;
    if (!conversationId) return;

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      updatedAt: Date.now(),
      messages: conversation.messages.filter((_, messageIndex) => messageIndex !== index)
    }));

    if (message?.id) {
      try {
        await fetchJson(`/api/messages/${message.id}`, { method: "DELETE" });
        setHistoryError("");
      } catch (error) {
        setHistoryError(`Delete message failed: ${error.message}`);
      }
    }
  }

  async function resetActiveChat() {
    if (!activeConversation) return;
    setAttachments([]);
    setUploadedImage(null);
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
    const typedContent = input.trim();
    const attachmentLines = attachments.map((attachment) =>
      `[附件:${attachment.kind}] ${attachment.name}\n${attachment.url}`
    );
    const content = [
      typedContent || (attachments.length ? "请分析这些附件。" : ""),
      referenceMode === "manual" && uploadedImage
        ? `Use this uploaded image as the first-frame/reference image for the next video:\n${uploadedImage.url}`
        : "",
      ...attachmentLines
    ].filter(Boolean).join("\n\n");
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
    setUploadedImage(null);
    const submittedAttachments = attachments;
    setAttachments([]);
    setReferenceMode("auto");
    setLoading(true);

    let text = "";
    let streamFrame = 0;
    const renderStream = () => {
      streamFrame = 0;
      const renderedText = text;
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...nextMessages, { role: "assistant", content: renderedText }]
      }));
    };

    try {
      const savedConversationId = await sendChat({
        conversationId,
        model: config.model,
        messages: nextMessages,
        attachments: submittedAttachments,
        referenceMode,
        onToken(token) {
          text += token;
          if (!streamFrame) streamFrame = requestAnimationFrame(renderStream);
        }
      });

      if (streamFrame) cancelAnimationFrame(streamFrame);
      renderStream();
      if (savedConversationId && savedConversationId !== conversationId) {
        setActiveId(savedConversationId);
      }
      setHistoryError("");
    } catch (error) {
      if (streamFrame) cancelAnimationFrame(streamFrame);
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...nextMessages, { role: "assistant", content: `Request failed: ${error.message}` }]
      }));
    } finally {
      if (streamFrame) cancelAnimationFrame(streamFrame);
      setLoading(false);
    }
  }

  return (
    <article className={`relay-console ${historyCollapsed ? "is-history-collapsed" : ""}`}>
      {historyOpen ? (
        <button
          className="relay-history-scrim"
          type="button"
          aria-label="Close chat history"
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}
      <aside className={`relay-history ${historyOpen ? "is-open" : ""}`} aria-label="Chat history">
        <div className="relay-history__head">
          <div>
            <span>历史</span>
            <strong>{conversations.length}</strong>
          </div>
          <div className="relay-history__head-actions">
            <button type="button" onClick={handleNewConversation} aria-label="New chat">+</button>
            <button
              className="relay-history-collapse"
              type="button"
              onClick={() => setHistoryCollapsed((current) => !current)}
              aria-label={historyCollapsed ? "Expand chat history" : "Collapse chat history"}
              title={historyCollapsed ? "展开侧栏" : "折叠侧栏"}
            >
              {historyCollapsed ? "›" : "‹"}
            </button>
            <button
              className="relay-history__close"
              type="button"
              onClick={() => setHistoryOpen(false)}
              aria-label="Close chat history"
            >
              ×
            </button>
          </div>
        </div>

        <div className="relay-history__list">
          {historyLoading ? (
            <div className="relay-history__item">
              <span>Loading history...</span>
              <small>Supabase</small>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                className={`relay-history__item ${
                  conversation.id === activeConversation?.id ? "active" : ""
                }`}
                key={conversation.id}
              >
                <button
                  className="relay-history__select"
                  type="button"
                  onClick={() => {
                    setActiveId(conversation.id);
                    setAttachments([]);
                    setUploadedImage(null);
                    setHistoryOpen(false);
                  }}
                >
                  <span>{conversation.title || DEFAULT_TITLE}</span>
                  <small>{formatTime(conversation.updatedAt)}</small>
                </button>
                <button
                  className="relay-history__delete"
                  type="button"
                  aria-label="Delete chat"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="relay-main">
        <header className="relay-console__head">
          <div>
            <button
              className="relay-history-toggle"
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Open chat history"
            >
              ☰
            </button>
            <span>AI 工作区</span>
            <h3>创作控制台</h3>
          </div>
          <div className="relay-console__actions">
            <button type="button" onClick={handleNewConversation}>
              新建对话
            </button>
            <button type="button" onClick={resetActiveChat}>
              清空
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
          {decoratedMessages.map((message, index) => (
            <article
              className={`relay-message ${message.role}${
                message.replySkin === null ? "" : ` reply-skin-${message.replySkin}`
              }`}
              key={message.id || `${message.role}-${index}`}
            >
              <div className="relay-message__meta">
                <span>{message.role === "user" ? "你" : "AI"}</span>
                <div className="relay-message__actions">
                  <button type="button" onClick={() => handleCopyMessage(message.content)} aria-label="Copy message">
                    复制
                  </button>
                  <button type="button" onClick={() => handleDeleteMessage(message, index)} aria-label="Delete message">
                    删除
                  </button>
                </div>
              </div>
              <MessageContent
                content={message.content}
                loading={loading && index === decoratedMessages.length - 1 && message.role === "assistant"}
              />
            </article>
          ))}
        </section>

        <form
          className={`relay-console__composer ${draggingFiles ? "is-dragging" : ""}`}
          onSubmit={handleSubmit}
          onDragEnter={(event) => {
            event.preventDefault();
            setDraggingFiles(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFiles(false);
          }}
          onDrop={handleDrop}
        >
          <div className="relay-reference-mode" role="group" aria-label="Video first frame mode">
            <button
              className={referenceMode === "auto" ? "active" : ""}
              type="button"
              onClick={() => setReferenceMode("auto")}
            >
              自动尾帧
            </button>
            <button
              className={referenceMode === "manual" ? "active" : ""}
              type="button"
              onClick={() => firstFrameInputRef.current?.click()}
              disabled={loading || uploadingImage}
            >
              上传首帧
            </button>
            <button
              className={referenceMode === "none" ? "active" : ""}
              type="button"
              onClick={() => setReferenceMode("none")}
            >
              不使用
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="relay-upload-input"
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            onChange={handleAttachmentInput}
          />
          <input
            ref={firstFrameInputRef}
            className="relay-upload-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
          />
          {attachments.length ? (
            <div className="relay-attachment-list">
              {attachments.map((attachment, index) => (
                <div className="relay-attachment-chip" key={`${attachment.url}-${index}`}>
                  {attachment.kind === "image" ? (
                    <img src={attachment.url} alt="" />
                  ) : (
                    <span className={`relay-attachment-chip__kind ${attachment.kind}`}>
                      {attachment.kind === "video" ? "VID" : "DOC"}
                    </span>
                  )}
                  <span>
                    <strong>{attachment.name}</strong>
                    <small>
                      {attachment.kind === "video"
                        ? `已提取 ${attachment.analysisImages?.length || 0} 帧`
                        : attachment.kind === "document"
                          ? `已读取 ${attachment.extractedText?.length || 0} 字`
                          : "图片附件"}
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {uploadedImage ? (
            <div className="relay-upload-chip">
              <img src={uploadedImage.url} alt="" />
              <span>
                <strong>{uploadedImage.name || "Reference image"}</strong>
                <small>
                  {uploadedImage.width} × {uploadedImage.height}
                  {uploadedImage.aspectWarning ? " · 与 16:9 视频比例不一致，画面可能裁切" : " · 比例适合 16:9 视频"}
                </small>
              </span>
              <button type="button" onClick={() => handleCopyMessage(uploadedImage.url)}>
                复制链接
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadedImage(null);
                  setReferenceMode("auto");
                }}
                aria-label="Remove uploaded image"
              >
                ×
              </button>
            </div>
          ) : null}
          <button
            className="relay-upload-button"
            type="button"
            disabled={loading || uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload attachments"
            title="上传图片、视频或文档"
          >
            {uploadingImage ? "..." : "+"}
          </button>
          <textarea
            ref={textareaRef}
            rows="1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPaste={handlePaste}
            placeholder="输入消息…"
          />
          <button
            type="submit"
            disabled={
              loading
              || (!input.trim() && !attachments.length && !(referenceMode === "manual" && uploadedImage))
            }
            aria-label="Send"
          >
            →
          </button>
        </form>
      </div>
    </article>
  );
}
