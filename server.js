import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, "public");

loadDotEnv(join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 5181);
const DEFAULT_API_BASE = normalizeApiBase(process.env.RELAY_API_BASE || "https://ai.lalakunaozi.fun");
const DEFAULT_MODEL = process.env.RELAY_MODEL || "gpt-4-all";

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

function buildEndpoint(value) {
  const raw = normalizeApiBase(value || DEFAULT_API_BASE).replace(/\/+$/, "");
  if (raw.endsWith("/chat/completions")) return raw;
  if (raw.endsWith("/v1")) return raw + "/chat/completions";
  return raw + "/v1/chat/completions";
}

async function proxyChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "请求内容不是有效 JSON。" });
    return;
  }

  const apiKey = process.env.RELAY_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "后端没有配置 RELAY_API_KEY。请在 .env 里填写中转站令牌后重启服务。" });
    return;
  }

  const body = {
    model: payload.model || DEFAULT_MODEL,
    messages: payload.messages || [],
    temperature: Number(payload.temperature ?? 0.7),
    stream: true
  };

  try {
    const upstream = await fetch(buildEndpoint(payload.apiBase), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (error) {
    sendJson(res, 502, { error: `连接中转站失败：${error.message}` });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const fullPath = normalize(join(PUBLIC, requested));

  if (!fullPath.startsWith(PUBLIC)) {
    sendJson(res, 403, { error: "禁止访问。" });
    return;
  }

  try {
    const data = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "页面资源不存在。" });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/config") {
    sendJson(res, 200, {
      apiBase: DEFAULT_API_BASE,
      model: DEFAULT_MODEL,
      backendKeyConfigured: Boolean(process.env.RELAY_API_KEY || process.env.DEEPSEEK_API_KEY)
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    await proxyChat(req, res);
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Abyss Interface is running at http://localhost:${PORT}`);
  console.log(`Backend API base: ${DEFAULT_API_BASE}`);
  console.log(`Backend key configured: ${Boolean(process.env.RELAY_API_KEY || process.env.DEEPSEEK_API_KEY)}`);
});
