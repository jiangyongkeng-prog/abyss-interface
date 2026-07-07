import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const PUBLIC = existsSync(DIST) ? DIST : join(ROOT, "public");

loadDotEnv(join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 5181);
const CHAT_API_BASE = normalizeApiBase(process.env.CHAT_API_BASE || process.env.RELAY_API_BASE || "https://ai.lalakunaozi.fun");
const CHAT_API_KEY = process.env.CHAT_API_KEY || process.env.RELAY_API_KEY || process.env.DEEPSEEK_API_KEY || "";
const CHAT_MODEL = process.env.CHAT_MODEL || process.env.RELAY_MODEL || "gpt-5.5";
const IMAGE_API_BASE = normalizeApiBase(process.env.IMAGE_API_BASE || "");
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || "";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-2";
const VIDEO_API_BASE = normalizeApiBase(process.env.VIDEO_API_BASE || "");
const VIDEO_API_KEY = process.env.VIDEO_API_KEY || "";
const VIDEO_MODEL = process.env.VIDEO_MODEL || "grok-imagine-video";
const DATABASE_URL = process.env.DATABASE_URL || "";
const DEFAULT_TITLE = "New chat";

const { Pool } = pg;
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
let dbReadyPromise = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ico": "image/x-icon"
};

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function writeSse(res, content) {
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
}

function endSse(res) {
  res.write("data: [DONE]\n\n");
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function normalizeApiBase(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, "");
    if (!path || path === "/" || path.includes("/console") || path.includes("/token")) return url.origin;
    if (path.endsWith("/v1/chat/completions")) return url.origin + path.replace(/\/chat\/completions$/, "");
    if (path.endsWith("/chat/completions")) return url.origin + path.replace(/\/chat\/completions$/, "");
    return url.origin + path;
  } catch {
    return trimmed;
  }
}

function buildChatEndpoint(value = CHAT_API_BASE) {
  const raw = normalizeApiBase(value).replace(/\/+$/, "");
  if (raw.endsWith("/chat/completions")) return raw;
  if (raw.endsWith("/v1")) return raw + "/chat/completions";
  return raw + "/v1/chat/completions";
}

function buildApiEndpoint(base, path) {
  const raw = normalizeApiBase(base).replace(/\/+$/, "");
  if (!raw) return "";
  if (raw.endsWith("/v1")) return raw + path;
  return raw + "/v1" + path;
}

function getStarterMessage() {
  return { role: "assistant", content: "Relay online. Messages and generation tasks are saved to Supabase." };
}

function extractTokensFromSse(text, state) {
  state.buffer += text;
  const lines = state.buffer.split("\n");
  state.buffer = lines.pop() || "";
  let tokens = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      tokens += json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || "";
    } catch {
      // Ignore partial or non-OpenAI-style stream lines.
    }
  }
  return tokens;
}

function normalizeConversation(row) {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: row.messages?.length ? row.messages : [getStarterMessage()]
  };
}

function getLatestUserContent(messages) {
  return messages.filter((message) => message.role === "user").at(-1)?.content || "";
}

function detectGenerationIntent(content) {
  const text = String(content || "").toLowerCase();
  if (/\u751f\u6210\u89c6\u9891|\u751f\u89c6\u9891|\u505a\u89c6\u9891|\u89c6\u9891|video|animate|animation/.test(text)) return "video";
  if (/\u751f\u6210\u56fe\u7247|\u751f\u56fe|\u753b\u56fe|\u753b\u4e00\u5f20|\u56fe\u7247|\u56fe\u50cf|\u6d77\u62a5|image|picture|draw|poster/.test(text)) return "image";
  return "chat";
}

function cleanGeneratedUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^[<(["']+/, "").replace(/[)\].,;:!?'"，。；：！？、】》）]+$/g, "");
}

function findUrlInText(value) {
  const match = String(value || "").match(/https?:\/\/[^\s<>"']+/i);
  return match ? cleanGeneratedUrl(match[0]) : "";
}

function extractResultUrl(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.url === "string") return cleanGeneratedUrl(data.url);
  if (typeof data.result_url === "string") return cleanGeneratedUrl(data.result_url);
  if (typeof data.video_url === "string") return cleanGeneratedUrl(data.video_url);
  const contentUrl = findUrlInText(data.choices?.[0]?.message?.content);
  if (contentUrl) return contentUrl;
  if (typeof data.output === "string") return findUrlInText(data.output) || cleanGeneratedUrl(data.output);
  if (Array.isArray(data.output)) {
    const url = data.output.find((item) => typeof item === "string" && /^https?:\/\//.test(item));
    if (url) return cleanGeneratedUrl(url);
  }
  const first = Array.isArray(data.data) ? data.data[0] : null;
  if (first?.url) return cleanGeneratedUrl(first.url);
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return "";
}

function extensionFromContentType(contentType, type) {
  if (contentType.includes("video/mp4")) return ".mp4";
  if (contentType.includes("video/webm")) return ".webm";
  if (contentType.includes("video/quicktime")) return ".mov";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) return ".jpg";
  return type === "video" ? ".mp4" : ".png";
}

function extensionFromUrl(url, type) {
  try {
    const suffix = extname(new URL(url).pathname).toLowerCase();
    if ([".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".webp"].includes(suffix)) return suffix;
  } catch {
    // Fall back to media type.
  }
  return type === "video" ? ".mp4" : ".png";
}

async function downloadGeneratedAsset(url, type) {
  if (!url || url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Generated asset download failed: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const ext = contentType ? extensionFromContentType(contentType, type) : extensionFromUrl(url, type);
  const directory = join(PUBLIC, "generated");
  await mkdir(directory, { recursive: true });
  const filename = `${type}-${Date.now()}-${randomUUID()}${ext}`;
  await writeFile(join(directory, filename), Buffer.from(await response.arrayBuffer()));
  return `/generated/${filename}`;
}

async function ensureDb() {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      await pool.query("create extension if not exists pgcrypto");
      await pool.query(`
        create table if not exists conversations (
          id uuid primary key default gen_random_uuid(),
          title text not null default 'New chat',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists messages (
          id uuid primary key default gen_random_uuid(),
          conversation_id uuid not null references conversations(id) on delete cascade,
          role text not null check (role in ('user', 'assistant', 'system')),
          content text not null default '',
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists generation_tasks (
          id uuid primary key default gen_random_uuid(),
          conversation_id uuid references conversations(id) on delete set null,
          message_id uuid references messages(id) on delete set null,
          type text not null check (type in ('image', 'video')),
          status text not null default 'pending',
          prompt text not null default '',
          result_url text,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
    })();
  }
  await dbReadyPromise;
}

async function getConversation(id) {
  await ensureDb();
  const result = await pool.query(
    `
      select c.id, c.title, c.created_at, c.updated_at,
        coalesce(
          json_agg(
            json_build_object('id', m.id, 'role', m.role, 'content', m.content, 'createdAt', extract(epoch from m.created_at) * 1000)
            order by m.created_at asc
          ) filter (where m.id is not null),
          '[]'::json
        ) as messages
      from conversations c
      left join messages m on m.conversation_id = c.id
      where c.id = $1
      group by c.id
    `,
    [id]
  );
  return result.rows[0] ? normalizeConversation(result.rows[0]) : null;
}

async function listConversations() {
  await ensureDb();
  const result = await pool.query(`
    select c.id, c.title, c.created_at, c.updated_at,
      coalesce(
        json_agg(
          json_build_object('id', m.id, 'role', m.role, 'content', m.content, 'createdAt', extract(epoch from m.created_at) * 1000)
          order by m.created_at asc
        ) filter (where m.id is not null),
        '[]'::json
      ) as messages
    from conversations c
    left join messages m on m.conversation_id = c.id
    group by c.id
    order by c.updated_at desc
    limit 50
  `);
  return result.rows.map(normalizeConversation);
}

async function createConversation(title = DEFAULT_TITLE) {
  await ensureDb();
  const result = await pool.query(
    "insert into conversations (title) values ($1) returning id, title, created_at, updated_at",
    [title]
  );
  return normalizeConversation({ ...result.rows[0], messages: [] });
}

async function addMessage(conversationId, role, content) {
  await ensureDb();
  const result = await pool.query(
    "insert into messages (conversation_id, role, content) values ($1, $2, $3) returning id",
    [conversationId, role, content]
  );
  return result.rows[0]?.id || null;
}

async function touchConversation(conversationId, title) {
  await ensureDb();
  await pool.query(
    "update conversations set title = coalesce($2, title), updated_at = now() where id = $1",
    [conversationId, title || null]
  );
}

async function createGenerationTask({ conversationId, messageId, type, prompt }) {
  await ensureDb();
  const result = await pool.query(
    `
      insert into generation_tasks (conversation_id, message_id, type, prompt)
      values ($1, $2, $3, $4)
      returning id
    `,
    [conversationId, messageId, type, prompt]
  );
  return result.rows[0]?.id || null;
}

async function updateGenerationTask(id, { status, resultUrl, metadata }) {
  if (!id) return;
  await ensureDb();
  await pool.query(
    `
      update generation_tasks
      set status = $2, result_url = $3, metadata = $4, updated_at = now()
      where id = $1
    `,
    [id, status, resultUrl || null, metadata || {}]
  );
}

async function handleConversations(req, res) {
  try {
    if (req.method === "GET") {
      const conversations = await listConversations();
      sendJson(res, 200, { conversations: conversations.length ? conversations : [await createConversation()] });
      return;
    }
    if (req.method === "POST") {
      const payload = JSON.parse((await readBody(req)) || "{}");
      sendJson(res, 201, { conversation: await createConversation(payload.title || DEFAULT_TITLE) });
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: `Database operation failed: ${error.message}` });
  }
}

async function handleConversationById(req, res, id, action) {
  try {
    await ensureDb();
    if (req.method === "DELETE" && !action) {
      await pool.query("delete from conversations where id = $1", [id]);
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "POST" && action === "reset") {
      await pool.query("delete from messages where conversation_id = $1", [id]);
      await touchConversation(id, DEFAULT_TITLE);
      sendJson(res, 200, { conversation: await getConversation(id) });
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: `Database operation failed: ${error.message}` });
  }
}

async function callGenerationApi(type, prompt) {
  const isImage = type === "image";
  const base = isImage ? IMAGE_API_BASE : VIDEO_API_BASE;
  const apiKey = isImage ? IMAGE_API_KEY : VIDEO_API_KEY;
  const model = isImage ? IMAGE_MODEL : VIDEO_MODEL;
  if (!base || !apiKey) throw new Error(`${type.toUpperCase()} API is not configured`);

  const videoBody = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
    seconds: 5,
    size: "1280x720"
  };

  const attempts = isImage
    ? [{ label: "images", endpoint: buildApiEndpoint(base, "/images/generations"), body: { model, prompt, n: 1, size: "1024x1024" } }]
    : [
        { label: "chat-video", endpoint: buildChatEndpoint(base), body: videoBody },
        { label: "v2-video", endpoint: normalizeApiBase(base).replace(/\/+$/, "") + "/v2/video/generations", body: { ...videoBody, prompt } },
        { label: "v1-video", endpoint: buildApiEndpoint(base, "/video/generations"), body: { ...videoBody, prompt } },
        { label: "v1-videos", endpoint: buildApiEndpoint(base, "/videos/generations"), body: { ...videoBody, prompt } }
      ];

  const errors = [];
  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(attempt.body)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (response.ok) {
      const sourceUrl = extractResultUrl(data);
      let resultUrl = sourceUrl;
      if (sourceUrl) {
        try {
          resultUrl = await downloadGeneratedAsset(sourceUrl, type);
        } catch (error) {
          data.downloadError = error.message;
        }
      }
      return { data: { ...data, endpoint: attempt.label, sourceUrl }, resultUrl };
    }

    errors.push(`${attempt.label}: ${data.error?.message || data.message || text || `HTTP ${response.status}`}`);
  }
  throw new Error(errors.join(" | "));
}

async function proxyChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "Request body is not valid JSON" });
    return;
  }
  if (!CHAT_API_KEY) {
    sendJson(res, 500, { error: "CHAT_API_KEY is not configured" });
    return;
  }

  const messages = payload.messages || [];
  const userContent = getLatestUserContent(messages);
  const intent = detectGenerationIntent(userContent);
  let conversationId = payload.conversationId || "";

  try {
    let userMessageId = null;
    if (pool) {
      if (!conversationId || conversationId.startsWith("local-")) conversationId = (await createConversation()).id;
      const currentConversation = await getConversation(conversationId);
      const nextTitle = currentConversation?.title === DEFAULT_TITLE && userContent ? userContent.slice(0, 18) : null;
      if (userContent) userMessageId = await addMessage(conversationId, "user", userContent);
      await touchConversation(conversationId, nextTitle);
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Conversation-Id": conversationId
    });

    if (intent === "image" || intent === "video") {
      let assistantText = "";
      let taskId = null;
      if (pool) taskId = await createGenerationTask({ conversationId, messageId: userMessageId, type: intent, prompt: userContent });

      try {
        writeSse(res, `Starting ${intent} generation...\n`);
        const result = await callGenerationApi(intent, userContent);
        const label = intent === "image" ? "Image" : "Video";
        const resultLine = result.resultUrl ? `${label} generated:\n${result.resultUrl}` : `${label} task submitted. No URL was returned yet.`;
        assistantText = resultLine;
        if (pool) await updateGenerationTask(taskId, { status: "completed", resultUrl: result.resultUrl, metadata: result.data });
        writeSse(res, resultLine);
      } catch (error) {
        assistantText = `${intent} generation failed: ${error.message}`;
        if (pool) await updateGenerationTask(taskId, { status: "failed", metadata: { error: error.message } });
        writeSse(res, assistantText);
      }

      if (pool && assistantText) {
        await addMessage(conversationId, "assistant", assistantText);
        await touchConversation(conversationId);
      }
      endSse(res);
      return;
    }

    const upstream = await fetch(buildChatEndpoint(payload.apiBase || CHAT_API_BASE), {
      method: "POST",
      headers: { "Authorization": `Bearer ${CHAT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: payload.model || CHAT_MODEL, messages, temperature: Number(payload.temperature ?? 0.7), stream: true })
    });

    if (!upstream.body) {
      endSse(res);
      return;
    }

    let assistantText = "";
    const decoder = new TextDecoder();
    const sseState = { buffer: "" };
    for await (const chunk of upstream.body) {
      assistantText += extractTokensFromSse(decoder.decode(chunk, { stream: true }), sseState);
      res.write(chunk);
    }
    if (pool && upstream.ok && assistantText) {
      await addMessage(conversationId, "assistant", assistantText);
      await touchConversation(conversationId);
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 502, { error: `Upstream request failed: ${error.message}` });
      return;
    }
    writeSse(res, `Request failed: ${error.message}`);
    endSse(res);
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const fullPath = normalize(join(PUBLIC, requested));
  if (!fullPath.startsWith(PUBLIC)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  try {
    const data = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    if (PUBLIC === DIST) {
      const fallback = await readFile(join(PUBLIC, "index.html"));
      res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
      res.end(fallback);
      return;
    }
    sendJson(res, 404, { error: "Resource not found" });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/config") {
    sendJson(res, 200, {
      apiBase: CHAT_API_BASE,
      model: CHAT_MODEL,
      backendKeyConfigured: Boolean(CHAT_API_KEY),
      databaseConfigured: Boolean(pool),
      imageConfigured: Boolean(IMAGE_API_BASE && IMAGE_API_KEY),
      videoConfigured: Boolean(VIDEO_API_BASE && VIDEO_API_KEY)
    });
    return;
  }
  if (req.url === "/api/conversations") {
    await handleConversations(req, res);
    return;
  }
  const conversationMatch = req.url.match(/^\/api\/conversations\/([^/]+)(?:\/(reset))?$/);
  if (conversationMatch) {
    await handleConversationById(req, res, conversationMatch[1], conversationMatch[2]);
    return;
  }
  if (req.method === "POST" && req.url === "/api/chat") {
    await proxyChat(req, res);
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Abyss Interface is running at http://localhost:${PORT}`);
  console.log(`Static directory: ${PUBLIC}`);
  console.log(`Chat API base: ${CHAT_API_BASE}`);
  console.log(`Chat key configured: ${Boolean(CHAT_API_KEY)}`);
  console.log(`Image API configured: ${Boolean(IMAGE_API_BASE && IMAGE_API_KEY)}`);
  console.log(`Video API configured: ${Boolean(VIDEO_API_BASE && VIDEO_API_KEY)}`);
  console.log(`Database configured: ${Boolean(pool)}`);
});
