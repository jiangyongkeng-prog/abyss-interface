import http from "node:http";
import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { basename, dirname, extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
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
const IMAGE_SIZE_DEFAULT = process.env.IMAGE_SIZE_DEFAULT || "1024x1024";
const IMAGE_SIZE_SQUARE = process.env.IMAGE_SIZE_SQUARE || "1024x1024";
const IMAGE_SIZE_LANDSCAPE = process.env.IMAGE_SIZE_LANDSCAPE || "1792x1024";
const IMAGE_SIZE_PORTRAIT = process.env.IMAGE_SIZE_PORTRAIT || "1024x1792";
const VIDEO_API_BASE = normalizeApiBase(process.env.VIDEO_API_BASE || "");
const VIDEO_API_KEY = process.env.VIDEO_API_KEY || "";
const VIDEO_MODEL = process.env.VIDEO_MODEL || "grok-imagine-video";
const VIDEO_DURATION_OPTIONS = parseVideoDurationOptions(process.env.VIDEO_DURATION_OPTIONS || "6,10,12,16,20");
const VIDEO_SECONDS = normalizeVideoSeconds(process.env.VIDEO_SECONDS, VIDEO_DURATION_OPTIONS.includes(10) ? 10 : VIDEO_DURATION_OPTIONS[0]);
const VIDEO_SIZE = process.env.VIDEO_SIZE || "1280x720";
const VIDEO_RESOLUTION_NAME = process.env.VIDEO_RESOLUTION_NAME || "720p";
const VIDEO_PRESET = process.env.VIDEO_PRESET || "custom";
const VIDEO_ASPECT_RATIO_OPTIONS = parseVideoOptionList(process.env.VIDEO_ASPECT_RATIO_OPTIONS || "16:9,9:16,1:1", ["16:9", "9:16", "1:1"]);
const VIDEO_RESOLUTION_OPTIONS = parseVideoOptionList(process.env.VIDEO_RESOLUTION_OPTIONS || "480p,720p", ["480p", "720p"]);
const VIDEO_PRESET_OPTIONS = parseVideoOptionList(process.env.VIDEO_PRESET_OPTIONS || "custom,normal,fun,spicy", ["custom", "normal", "fun", "spicy"]);
const VIDEO_DEFAULT_ASPECT_RATIO = normalizeVideoAspectRatio(process.env.VIDEO_ASPECT_RATIO, inferVideoAspectRatio(VIDEO_SIZE));
const VIDEO_DEFAULT_RESOLUTION = normalizeVideoResolution(VIDEO_RESOLUTION_NAME, VIDEO_RESOLUTION_OPTIONS.includes("720p") ? "720p" : VIDEO_RESOLUTION_OPTIONS[0]);
const VIDEO_DEFAULT_PRESET = normalizeVideoPreset(VIDEO_PRESET, VIDEO_PRESET_OPTIONS.includes("custom") ? "custom" : VIDEO_PRESET_OPTIONS[0]);
const VIDEO_CONTINUITY_RETRIES = Math.max(0, Number(process.env.VIDEO_CONTINUITY_RETRIES || 0));
const VIDEO_CONTINUITY_MIN_SSIM = Math.max(0, Math.min(1, Number(process.env.VIDEO_CONTINUITY_MIN_SSIM || 0.74)));
const DATABASE_URL = process.env.DATABASE_URL || "";
const SUPABASE_URL = normalizeApiBase(process.env.SUPABASE_URL || "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "generated";
const CONSOLE_PASSWORD = process.env.CONSOLE_PASSWORD || "abyss";
const CONSOLE_SESSION_SECRET = process.env.CONSOLE_SESSION_SECRET || DATABASE_URL || CONSOLE_PASSWORD;
const CONSOLE_COOKIE_NAME = "console_session_v2";
const DEFAULT_TITLE = "New chat";
const execFileAsync = promisify(execFile);

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

function createConsoleToken() {
  return createHash("sha256").update(`${CONSOLE_PASSWORD}:${CONSOLE_SESSION_SECRET}`).digest("hex");
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function isConsoleAuthed(req) {
  return parseCookies(req)[CONSOLE_COOKIE_NAME] === createConsoleToken();
}

function requireConsoleAuth(req, res) {
  if (isConsoleAuthed(req)) return true;
  sendJson(res, 401, { error: "Console access required" });
  return false;
}

async function handleConsoleLogin(req, res) {
  try {
    const payload = JSON.parse((await readBody(req)) || "{}");
    if (payload.password !== CONSOLE_PASSWORD) {
      sendJson(res, 401, { error: "Invalid access code" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `${CONSOLE_COOKIE_NAME}=${createConsoleToken()}; Path=/; HttpOnly; SameSite=Lax`
    });
    res.end(JSON.stringify({ ok: true }));
  } catch {
    sendJson(res, 400, { error: "Request body is not valid JSON" });
  }
}

function handleConsoleLogout(res) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Set-Cookie": [
      `${CONSOLE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      "console_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    ]
  });
  res.end(JSON.stringify({ ok: true }));
}

function writeSse(res, content) {
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
}

function endSse(res) {
  res.write("data: [DONE]\n\n");
  res.end();
}

async function readBuffer(req, maxBytes = Infinity) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error(`Request body exceeds ${Math.round(maxBytes / 1024 / 1024)} MB`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readBody(req, maxBytes = Infinity) {
  return (await readBuffer(req, maxBytes)).toString("utf8");
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

function resolveImageSize(prompt, preferredSize = IMAGE_SIZE_DEFAULT) {
  const text = String(prompt || "")
    .toLowerCase()
    .replace(/[：]/g, ":")
    .replace(/\s+/g, " ");

  if (/(16\s*:\s*9|横屏|横版|宽屏|横向|landscape|wide|widescreen|youtube)/i.test(text)) {
    return IMAGE_SIZE_LANDSCAPE;
  }
  if (/(9\s*:\s*16|竖屏|竖版|竖向|手机壁纸|手机屏幕|portrait|vertical|shorts|reels|tiktok)/i.test(text)) {
    return IMAGE_SIZE_PORTRAIT;
  }
  if (/(1\s*:\s*1|方图|方形|正方形|square)/i.test(text)) {
    return IMAGE_SIZE_SQUARE;
  }
  return preferredSize;
}

function extractJsonObject(value) {
  const text = String(value || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseVideoDurationOptions(value) {
  const durations = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((seconds) => Number.isInteger(seconds) && seconds >= 1 && seconds <= 60);
  const unique = [...new Set(durations)];
  return unique.length ? unique : [10, 12];
}

function parseVideoOptionList(value, fallback) {
  const options = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(options)];
  return unique.length ? unique : fallback;
}

function inferVideoAspectRatio(size) {
  const [width, height] = String(size || "").toLowerCase().split("x").map(Number);
  if (!width || !height) return "16:9";
  if (height > width) return "9:16";
  if (width === height) return "1:1";
  return "16:9";
}

function normalizeVideoAspectRatio(value, fallback = VIDEO_ASPECT_RATIO_OPTIONS[0]) {
  const ratio = String(value || "").trim();
  return VIDEO_ASPECT_RATIO_OPTIONS.includes(ratio) ? ratio : fallback;
}

function normalizeVideoResolution(value, fallback = VIDEO_RESOLUTION_OPTIONS[0]) {
  const resolution = String(value || "").trim().toLowerCase();
  return VIDEO_RESOLUTION_OPTIONS.includes(resolution) ? resolution : fallback;
}

function normalizeVideoPreset(value, fallback = VIDEO_PRESET_OPTIONS[0]) {
  const preset = String(value || "").trim().toLowerCase();
  return VIDEO_PRESET_OPTIONS.includes(preset) ? preset : fallback;
}

function videoSizeForAspectRatio(aspectRatio) {
  if (aspectRatio === "9:16") return "720x1280";
  if (aspectRatio === "1:1") return "1024x1024";
  return VIDEO_SIZE;
}

function normalizeVideoSeconds(value, fallback = VIDEO_DURATION_OPTIONS[0]) {
  const seconds = Number(value);
  return VIDEO_DURATION_OPTIONS.includes(seconds) ? seconds : fallback;
}

function requestedVideoSeconds(content) {
  const match = String(content || "").match(/(?:^|[^\d])(\d{1,2})\s*(?:秒|s(?:ec(?:onds?)?)?)/i);
  return match ? normalizeVideoSeconds(match[1], null) : null;
}

function normalizeVideoPlan(value, requestedSeconds = null) {
  const plan = value && typeof value === "object" ? value : {};
  const segmentSeconds = normalizeVideoSeconds(
    requestedSeconds || plan.segmentSeconds || plan.segment_seconds || VIDEO_SECONDS,
    VIDEO_SECONDS
  );
  const totalSeconds = Math.max(segmentSeconds, Number(plan.totalSeconds || plan.total_seconds || segmentSeconds) || segmentSeconds);
  const totalSegments = Math.max(1, Math.ceil(totalSeconds / segmentSeconds));
  const segmentIndex = Math.max(1, Math.min(totalSegments, Number(plan.segmentIndex || plan.segment_index || 1) || 1));
  return {
    totalSeconds,
    segmentSeconds,
    totalSegments,
    segmentIndex,
    basePrompt: String(plan.basePrompt || plan.base_prompt || "").trim(),
    continuity: String(plan.continuity || plan.continuitySummary || plan.continuity_summary || "").trim()
  };
}

function isContinuationRequest(content) {
  return /^(继续|接着|下一段|下一集|继续生成|继续做|continue|next|go on)\s*[。.!！?？]*$/i.test(String(content || "").trim());
}

function buildContinuationPrompt(project) {
  return [
    project.basePrompt,
    `Continue the same short film as segment ${project.nextSegment}/${project.totalSegments}.`,
    "The attached reference image is the exact final frame of the previous segment.",
    "Start the new segment from the same composition, subject position, camera angle, lens, lighting, colors, and background as the reference image.",
    "During the first second, preserve the reference frame as closely as possible and only introduce very slow natural motion.",
    "Keep the same subject, visual style, mood, camera language, and scene continuity.",
    "No jump cut, no scene reset, no new camera angle, no sudden zoom, no redesign of the object.",
    project.continuity ? `Continuity from previous segment: ${project.continuity}` : "",
    "Do not restart the story with a different subject. Do not add logos or watermarks."
  ].filter(Boolean).join("\n");
}

function buildReferenceLockedPrompt(prompt) {
  return [
    "Use the attached image as the exact visual starting point for the video.",
    "The first frame should match the attached image as closely as the model allows: same composition, subject scale, subject position, camera angle, lighting, colors, and background.",
    "Do not begin from a different framing. Do not redesign the subject. Do not cut to a new scene.",
    "Begin with nearly still continuity for the first moment, then continue the motion naturally.",
    "",
    prompt
  ].join("\n");
}

async function decideChatToolAction(messages, userContent, context = {}, signal) {
  const forceVideo = context.forceVideo === true;
  const recentMessages = messages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .slice(-10)
    .map((message) => ({ role: message.role, content: String(message.content || "").slice(0, 2000) }));

  const activeVideoProject = context.activeVideoProject
    ? {
        type: "active_video_project",
        totalSeconds: context.activeVideoProject.totalSeconds,
        segmentSeconds: context.activeVideoProject.segmentSeconds,
        totalSegments: context.activeVideoProject.totalSegments,
        completedSegments: context.activeVideoProject.completedSegments,
        nextSegment: context.activeVideoProject.nextSegment,
        basePrompt: context.activeVideoProject.basePrompt,
        continuity: context.activeVideoProject.continuity
      }
    : null;

  const plannerMessages = [
    {
      role: "system",
      content: [
        "You are the tool router for an AI chat app.",
        "The chat model is the main agent. Image and video APIs are tools that you may call only when useful.",
        "Decide whether the assistant should answer normally, generate an image, or generate a video.",
        `Return JSON only with this shape: {"action":"chat|image|video","prompt":"","reason":"","videoPlan":{"totalSeconds":${VIDEO_SECONDS},"segmentSeconds":${VIDEO_SECONDS},"segmentIndex":1,"basePrompt":"","continuity":""}}.`,
        "Choose chat when the user is brainstorming, asking for advice, planning a project, asking what to do, or has not clearly asked to generate now.",
        "Choose image only when the user clearly asks to create/generate/draw an image now.",
        "Choose video only when the user clearly asks to create/generate/animate a video now.",
        forceVideo ? "The user explicitly pressed the separate Generate Video button. You must choose video and rewrite their text as a concise generation prompt." : "",
        "If the user asks for ideas before making a YouTube/TikTok/short video, choose chat.",
        "If the user asks for a video longer than one segment, generate only the next segment now and preserve a reusable basePrompt.",
        `Native video durations supported by this tool are ${VIDEO_DURATION_OPTIONS.join(" or ")} seconds. If the user explicitly requests one of those durations, set both totalSeconds and segmentSeconds to that exact value. For longer videos, split them into ${VIDEO_DURATION_OPTIONS.join("/")}-second segments.`,
        "If the latest user says continue/继续 and active_video_project exists with unfinished segments, choose video for the next segment.",
        "For continued segments, prompt must explicitly continue the same subject, style, camera language, scene continuity, and avoid restarting with a different idea.",
        "If choosing image or video, rewrite prompt as a concise generation prompt in the user's language.",
        "Do not choose a tool just because the words image, video, YouTube, short, picture, or generate appear."
      ].join("\n")
    },
    ...(activeVideoProject ? [{ role: "system", content: `Active project context:\n${JSON.stringify(activeVideoProject)}` }] : []),
    ...recentMessages,
    {
      role: "user",
      content: `Latest user request:\n${userContent}\n\nReturn JSON only.`
    }
  ];

  try {
    if (activeVideoProject && isContinuationRequest(userContent)) {
      return {
        action: "video",
        prompt: buildContinuationPrompt(activeVideoProject),
        reason: "continue_active_video_project",
        videoPlan: normalizeVideoPlan({
          totalSeconds: activeVideoProject.totalSeconds,
          segmentSeconds: activeVideoProject.segmentSeconds,
          segmentIndex: activeVideoProject.nextSegment,
          basePrompt: activeVideoProject.basePrompt,
          continuity: activeVideoProject.continuity
        })
      };
    }

    const response = await fetch(buildChatEndpoint(CHAT_API_BASE), {
      method: "POST",
      headers: { "Authorization": `Bearer ${CHAT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: plannerMessages,
        temperature: 0,
        stream: false
      }),
      signal
    });

    const data = await response.json().catch(() => ({}));
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(content);
    const action = forceVideo ? "video" : ["image", "video", "chat"].includes(parsed?.action) ? parsed.action : "chat";
    return {
      action,
      prompt: String(parsed?.prompt || userContent || "").trim(),
      reason: String(parsed?.reason || "").trim(),
      videoPlan: normalizeVideoPlan(parsed?.videoPlan, requestedVideoSeconds(userContent))
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { action: forceVideo ? "video" : "chat", prompt: userContent, reason: "router_failed", videoPlan: normalizeVideoPlan({}, requestedVideoSeconds(userContent)) };
  }
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

function findUrlsInText(value) {
  const matches = String(value || "").match(/(?:https?:\/\/[^\s<>"']+|\/generated\/[^\s<>"']+)/gi) || [];
  return matches.map(cleanGeneratedUrl);
}

function isImageAssetUrl(url) {
  return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(url);
}

function getLatestImageUrl(messages) {
  for (const message of [...messages].reverse()) {
    const urls = findUrlsInText(message.content);
    const imageUrl = [...urls].reverse().find(isImageAssetUrl);
    if (imageUrl) return imageUrl;
  }
  return "";
}

function getLatestUserImageUrl(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return "";
  return [...findUrlsInText(latestUserMessage.content)].reverse().find(isImageAssetUrl) || "";
}

function buildAttachmentAwareMessages(messages, attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return messages;
  const nextMessages = messages.map((message) => ({ ...message }));
  let latestUserIndex = -1;
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index].role === "user") {
      latestUserIndex = index;
      break;
    }
  }
  if (latestUserIndex === -1) return messages;

  const textParts = [String(nextMessages[latestUserIndex].content || "")];
  const imageParts = [];
  let extractedCharacters = 0;

  for (const attachment of attachments.slice(0, 8)) {
    const kind = String(attachment?.kind || "");
    const name = String(attachment?.name || "attachment");
    if (kind === "document" && attachment.extractedText) {
      const remaining = Math.max(0, 80000 - extractedCharacters);
      const excerpt = String(attachment.extractedText).slice(0, remaining);
      extractedCharacters += excerpt.length;
      textParts.push(`Document "${name}" content:\n${excerpt}`);
    } else if (kind === "video") {
      textParts.push(`Video "${name}" is represented by ${attachment.analysisImages?.length || 0} sampled frames in chronological order.`);
      for (const url of (attachment.analysisImages || []).slice(0, 8)) {
        imageParts.push({ type: "image_url", image_url: { url } });
      }
    } else if (kind === "image" && attachment.url) {
      imageParts.push({ type: "image_url", image_url: { url: attachment.url } });
    }
  }

  nextMessages[latestUserIndex] = {
    ...nextMessages[latestUserIndex],
    content: [
      { type: "text", text: textParts.filter(Boolean).join("\n\n") },
      ...imageParts
    ]
  };
  return nextMessages;
}

function getPublicOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function toPublicAssetUrl(url, req) {
  if (!url || !url.startsWith("/")) return url;
  return new URL(url, getPublicOrigin(req)).toString();
}

function findGeneratedResultUrl(value, depth = 0) {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string") return findUrlInText(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findGeneratedResultUrl(item, depth + 1);
      if (url) return url;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const key of ["url", "result_url", "resultUrl", "video_url", "videoUrl", "content", "message", "output", "data", "choices", "video"]) {
      if (!(key in value)) continue;
      const url = findGeneratedResultUrl(value[key], depth + 1);
      if (url) return url;
    }
  }
  return "";
}

function extractResultUrl(data) {
  if (!data || typeof data !== "object") return "";
  const first = Array.isArray(data.data) ? data.data[0] : null;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return findGeneratedResultUrl(data);
}

function extractGenerationTask(data) {
  if (!data || typeof data !== "object") return null;
  const taskId = data.task_id || data.taskId || data.id || data.data?.task_id || data.data?.taskId || data.data?.id;
  const status = data.status || data.data?.status || "";
  if (!taskId) return null;
  return { taskId: String(taskId), status: String(status || "queued") };
}

function videoApiHeaders(apiKey) {
  return {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "authorization": `Bearer ${apiKey}`,
    "origin": "https://video.yunshuaiapi.com",
    "referer": "https://video.yunshuaiapi.com/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
  };
}

function waitFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function pollVideoGenerationTask(base, apiKey, taskId, signal, onProgress = () => {}) {
  let lastProgress = "";
  for (let attempt = 0; attempt < 72; attempt += 1) {
    await waitFor(attempt === 0 ? 2000 : 5000);
    const response = await fetch(buildApiEndpoint(base, `/video/generations/${encodeURIComponent(taskId)}`), {
      headers: videoApiHeaders(apiKey),
      signal
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
    if (!response.ok) {
      throw new Error(`Video status request failed: HTTP ${response.status} ${payload?.error?.message || payload?.message || text}`);
    }

    const task = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    const status = String(task?.status || task?.state || payload?.status || payload?.state || "").toLowerCase();
    const progress = String(task?.progress ?? task?.data?.progress ?? "");
    const failureReason = task?.fail_reason || task?.failReason || task?.error?.message || payload?.error?.message || payload?.message;
    const resultUrl = extractResultUrl(task) || extractResultUrl(payload);

    if (resultUrl && ["done", "completed", "succeeded", "success", ""].includes(status)) {
      return { data: payload, task: extractGenerationTask(payload), resultUrl };
    }
    if (["failure", "failed", "error", "expired", "cancelled", "canceled"].includes(status)) {
      throw new Error(`Video generation ${status}${failureReason ? `: ${failureReason}` : ""}`);
    }
    if (["done", "completed", "succeeded", "success"].includes(status)) {
      throw new Error("Video generation completed but the upstream did not return a playable result_url");
    }
    if (progress && progress !== lastProgress) {
      onProgress(`视频生成中：${progress}\n`);
      lastProgress = progress;
    }
  }
  throw new Error(`Video generation timed out while waiting for task ${taskId}`);
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

function storageContentType(ext, fallback = "application/octet-stream") {
  const normalized = String(ext || "").toLowerCase();
  if (normalized === ".mp4") return "video/mp4";
  if (normalized === ".webm") return "video/webm";
  if (normalized === ".mov") return "video/quicktime";
  if (normalized === ".png") return "image/png";
  if (normalized === ".webp") return "image/webp";
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  return fallback;
}

function canUseSupabaseStorage() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_STORAGE_BUCKET);
}

async function uploadGeneratedAssetToStorage(bytes, filename, contentType) {
  if (!canUseSupabaseStorage()) return "";
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${filename}`;
  const uploadUrl = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": contentType,
      "Cache-Control": "3600",
      "x-upsert": "true"
    },
    body: bytes
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed: HTTP ${response.status}${text ? ` ${text}` : ""}`);
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/${objectPath}`;
}

async function saveGeneratedAssetBytes(bytes, filename, contentType) {
  if (canUseSupabaseStorage()) {
    return await uploadGeneratedAssetToStorage(bytes, filename, contentType);
  }

  const directory = join(PUBLIC, "generated");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), bytes);
  return `/generated/${filename}`;
}

function localGeneratedAssetPath(url) {
  const pathname = String(url || "").split("?")[0];
  if (!pathname.startsWith("/generated/")) return "";
  const filename = basename(pathname);
  if (pathname !== `/generated/${filename}`) return "";
  return join(PUBLIC, "generated", filename);
}

function isManagedReferenceImageUrl(url) {
  if (localGeneratedAssetPath(url)) return true;
  if (!canUseSupabaseStorage()) return false;
  const prefix = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/`;
  return String(url || "").startsWith(prefix);
}

async function readAssetBytes(url, signal) {
  const localPath = localGeneratedAssetPath(url);
  if (localPath) {
    return {
      bytes: await readFile(localPath),
      contentType: storageContentType(extname(localPath))
    };
  }
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Asset download failed: HTTP ${response.status}`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || ""
  };
}

async function loadVideoReferenceImage(url, signal) {
  const asset = await readAssetBytes(url, signal);
  if (!asset.contentType.toLowerCase().startsWith("image/")) {
    throw new Error("The uploaded first frame is not a supported image file");
  }
  const ext = extensionFromContentType(asset.contentType, "image");
  return {
    ...asset,
    filename: `first-frame${ext}`,
    source: url
  };
}

function isSameApiOrigin(url, apiBase) {
  try {
    return new URL(url).origin === new URL(apiBase).origin;
  } catch {
    return false;
  }
}

async function downloadGeneratedAsset(url, type, signal, authorization = "") {
  if (!url || url.startsWith("data:")) return url;
  let response = await fetch(url, { signal });
  if (!response.ok && authorization && [401, 403].includes(response.status)) {
    response = await fetch(url, { signal, headers: { "Authorization": `Bearer ${authorization}` } });
  }
  if (!response.ok) throw new Error(`Generated asset download failed: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const ext = contentType ? extensionFromContentType(contentType, type) : extensionFromUrl(url, type);
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `${type}-${Date.now()}-${randomUUID()}${ext}`;
  const uploadContentType = contentType || storageContentType(ext);

  return await saveGeneratedAssetBytes(bytes, filename, uploadContentType);
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64")
  };
}

const DOCUMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json"
]);

function getAttachmentKind(contentType, name) {
  const normalizedType = String(contentType || "").toLowerCase();
  const extension = extname(String(name || "")).toLowerCase();
  if (normalizedType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) return "image";
  if (normalizedType.startsWith("video/") || [".mp4", ".webm", ".mov", ".mkv"].includes(extension)) return "video";
  if (DOCUMENT_CONTENT_TYPES.has(normalizedType) || [".pdf", ".docx", ".txt", ".md", ".csv", ".json"].includes(extension)) return "document";
  return "";
}

function getAttachmentExtension(contentType, name, kind) {
  const supplied = extname(String(name || "")).toLowerCase();
  const allowed = {
    image: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    video: [".mp4", ".webm", ".mov", ".mkv"],
    document: [".pdf", ".docx", ".txt", ".md", ".csv", ".json"]
  };
  if (allowed[kind]?.includes(supplied)) return supplied;
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (kind === "video") return extensionFromContentType(contentType, "video");
  if (kind === "image") return extensionFromContentType(contentType, "image");
  return ".txt";
}

async function extractDocumentText(bytes, contentType, name) {
  const extension = extname(String(name || "")).toLowerCase();
  let text = "";
  if (contentType === "application/pdf" || extension === ".pdf") {
    text = (await pdfParse(bytes)).text || "";
  } else if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || extension === ".docx"
  ) {
    text = (await mammoth.extractRawText({ buffer: bytes })).value || "";
  } else {
    text = bytes.toString("utf8");
  }
  return text.replace(/\u0000/g, "").trim().slice(0, 60000);
}

async function extractVideoAnalysisFrames(bytes, extension) {
  const tempDirectory = await mkdtemp(join(tmpdir(), "abyss-analysis-"));
  const inputPath = join(tempDirectory, `input${extension || ".mp4"}`);
  const outputPattern = join(tempDirectory, "frame-%02d.jpg");

  try {
    await writeFile(inputPath, bytes);
    let duration = 8;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        inputPath
      ]);
      duration = Math.max(1, Number.parseFloat(stdout) || 8);
    } catch {
      // Fall back to one frame per second when duration probing is unavailable.
    }

    const frameRate = Math.min(2, Math.max(0.08, 8 / duration));
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-vf", `fps=${frameRate},scale=960:-2:force_original_aspect_ratio=decrease`,
      "-frames:v", "8",
      "-q:v", "3",
      outputPattern
    ]);

    const frameFiles = (await readdir(tempDirectory))
      .filter((file) => /^frame-\d+\.jpg$/i.test(file))
      .sort()
      .slice(0, 8);
    const urls = [];
    for (const frameFile of frameFiles) {
      const frameBytes = await readFile(join(tempDirectory, frameFile));
      urls.push(await saveGeneratedAssetBytes(
        frameBytes,
        `video-frame-${Date.now()}-${randomUUID()}.jpg`,
        "image/jpeg"
      ));
    }
    return urls;
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function handleUploadAsset(req, res) {
  try {
    const requestContentType = String(req.headers["content-type"] || "application/octet-stream").split(";")[0].toLowerCase();
    let bytes;
    let contentType = requestContentType;
    let originalName = "";

    if (requestContentType === "application/json") {
      const payload = JSON.parse((await readBody(req, 16 * 1024 * 1024)) || "{}");
      const parsed = parseDataUrl(payload.dataUrl);
      if (!parsed) {
        sendJson(res, 400, { error: "Upload must include a file" });
        return;
      }
      bytes = parsed.bytes;
      contentType = parsed.contentType.toLowerCase();
      originalName = payload.name || "";
    } else {
      originalName = decodeURIComponent(String(req.headers["x-file-name"] || "attachment"));
      const kind = getAttachmentKind(contentType, originalName);
      const maxBytes = kind === "video" ? 100 * 1024 * 1024 : kind === "document" ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
      bytes = await readBuffer(req, maxBytes);
    }

    const kind = getAttachmentKind(contentType, originalName);
    if (!kind) {
      sendJson(res, 400, { error: "Supported files: images, MP4/WebM/MOV videos, PDF, DOCX, TXT, Markdown, CSV, and JSON" });
      return;
    }

    const maxBytes = kind === "video" ? 100 * 1024 * 1024 : kind === "document" ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
    if (bytes.length > maxBytes) {
      sendJson(res, 413, { error: `${kind} upload is too large` });
      return;
    }

    const extension = getAttachmentExtension(contentType, originalName, kind);
    const filename = `attachment-${Date.now()}-${randomUUID()}${extension}`;
    const url = await saveGeneratedAssetBytes(bytes, filename, contentType);
    const extractedText = kind === "document" ? await extractDocumentText(bytes, contentType, originalName) : "";
    const analysisImages = kind === "video" ? await extractVideoAnalysisFrames(bytes, extension) : [];

    sendJson(res, 201, {
      url,
      kind,
      contentType,
      name: originalName || filename,
      extractedText,
      analysisImages
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: `Upload failed: ${error.message}` });
  }
}

async function extractVideoTailFrame(videoUrl) {
  if (!videoUrl) return "";
  const asset = await readAssetBytes(videoUrl);

  const tempDirectory = await mkdtemp(join(tmpdir(), "abyss-tail-"));
  const inputPath = join(tempDirectory, `input-${randomUUID()}${extensionFromContentType(asset.contentType, "video")}`);
  const outputPath = join(tempDirectory, `tail-${randomUUID()}.png`);

  try {
    await writeFile(inputPath, asset.bytes);
    await execFileAsync("ffmpeg", [
      "-y",
      "-sseof",
      "-0.1",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-update",
      "1",
      outputPath
    ], { windowsHide: true });

    const frameBytes = await readFile(outputPath);
    const filename = `tail-frame-${Date.now()}-${randomUUID()}.png`;
    return await saveGeneratedAssetBytes(frameBytes, filename, "image/png");
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

async function downloadAssetToFile(url, filePath) {
  const asset = await readAssetBytes(url);
  await writeFile(filePath, asset.bytes);
}

async function compareVideoFirstFrameToImage(videoUrl, frameUrl) {
  if (!videoUrl || !frameUrl) return null;
  const tempDirectory = await mkdtemp(join(tmpdir(), "abyss-compare-"));
  const videoPath = join(tempDirectory, `video-${randomUUID()}.mp4`);
  const framePath = join(tempDirectory, `frame-${randomUUID()}.png`);

  try {
    await downloadAssetToFile(videoUrl, videoPath);
    await downloadAssetToFile(frameUrl, framePath);
    const normalizeVideo = "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,crop=160:120:80:30,setsar=1";
    const { stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-i",
      videoPath,
      "-loop",
      "1",
      "-t",
      "0.04",
      "-i",
      framePath,
      "-filter_complex",
      `[0:v]select=eq(n\\,0),${normalizeVideo}[first];[1:v]${normalizeVideo}[ref];[first][ref]ssim`,
      "-frames:v",
      "1",
      "-f",
      "null",
      "-"
    ], { windowsHide: true, maxBuffer: 1024 * 1024 * 8 });
    const match = String(stderr || "").match(/All:([0-9.]+)/);
    return match ? Number(match[1]) : null;
  } finally {
    await unlink(videoPath).catch(() => {});
    await unlink(framePath).catch(() => {});
  }
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
      values ($1, null, $2, $3)
      returning id
    `,
    [conversationId, type, prompt]
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

async function getActiveVideoProject(conversationId) {
  if (!pool || !conversationId || conversationId.startsWith("local-")) return null;
  await ensureDb();
  const result = await pool.query(
    `
      select prompt, result_url, metadata, created_at
      from generation_tasks
      where conversation_id = $1
        and type = 'video'
        and status = 'completed'
        and result_url is not null
      order by created_at desc
      limit 20
    `,
    [conversationId]
  );

  const task = result.rows.find((row) => {
    const plan = normalizeVideoPlan(row?.metadata?.videoPlan);
    return plan.segmentIndex < plan.totalSegments;
  });
  if (!task) return null;
  const plan = normalizeVideoPlan(task.metadata?.videoPlan);

  return {
    totalSeconds: plan.totalSeconds,
    segmentSeconds: plan.segmentSeconds,
    totalSegments: plan.totalSegments,
    completedSegments: plan.segmentIndex,
    nextSegment: plan.segmentIndex + 1,
    basePrompt: plan.basePrompt || task.prompt,
    continuity: plan.continuity || `Previous segment result: ${task.result_url || ""}`.trim(),
    tailFrameUrl: task.metadata?.tailFrameUrl || ""
  };
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
    if (req.method === "GET" && !action) {
      const conversation = await getConversation(id);
      if (!conversation) {
        sendJson(res, 404, { error: "Conversation not found" });
        return;
      }
      sendJson(res, 200, { conversation });
      return;
    }
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

async function handleMessageById(req, res, id) {
  try {
    await ensureDb();
    if (req.method === "DELETE") {
      await pool.query("delete from messages where id = $1", [id]);
      sendJson(res, 200, { ok: true });
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: `Database operation failed: ${error.message}` });
  }
}

async function callGenerationApi(type, prompt, options = {}) {
  const isImage = type === "image";
  const base = isImage ? IMAGE_API_BASE : VIDEO_API_BASE;
  const apiKey = isImage ? IMAGE_API_KEY : VIDEO_API_KEY;
  const model = isImage ? IMAGE_MODEL : VIDEO_MODEL;
  if (!base || !apiKey) throw new Error(`${type.toUpperCase()} API is not configured`);
  const imageUrl = options.imageUrl || "";
  const referenceImage = imageUrl && !isImage ? await loadVideoReferenceImage(imageUrl, options.signal) : null;
  const seconds = normalizeVideoSeconds(options.seconds, VIDEO_SECONDS);
  const videoAspectRatio = normalizeVideoAspectRatio(options.aspectRatio, VIDEO_DEFAULT_ASPECT_RATIO);
  const videoResolution = normalizeVideoResolution(options.resolution, VIDEO_DEFAULT_RESOLUTION);
  const videoPreset = normalizeVideoPreset(options.preset, VIDEO_DEFAULT_PRESET);
  const videoSize = videoSizeForAspectRatio(videoAspectRatio);
  const imageSize = resolveImageSize(`${prompt}\n${options.userPrompt || ""}`);
  const imageSizeAttempts = [imageSize, "1024x1024"].filter((size, index, list) => size && list.indexOf(size) === index);
  const generationText = referenceImage ? buildReferenceLockedPrompt(prompt) : prompt;

  const attempts = isImage
    ? imageSizeAttempts.map((size) => ({
        label: size === imageSize ? `images-${size}` : `images-fallback-${size}`,
        endpoint: buildApiEndpoint(base, "/images/generations"),
        body: { model, prompt, n: 1, size }
      }))
    : [{
        label: "video-generations",
        endpoint: buildApiEndpoint(base, "/video/generations"),
        form: (() => {
          const form = new FormData();
          form.append("model", model);
          form.append("prompt", generationText);
          form.append("seconds", String(seconds));
          form.append("size", videoSize);
          form.append("resolution_name", videoResolution);
          form.append("preset", videoPreset);
          if (referenceImage) {
            // Keep this aligned with the provider's own video console:
            // image_intent=first declares the purpose and input_reference[] carries the file.
            form.append("image_intent", "first");
            form.append(
              "input_reference[]",
              new Blob([referenceImage.bytes], { type: referenceImage.contentType }),
              referenceImage.filename
            );
          }
          return form;
        })()
      }];

  const errors = [];
  for (const attempt of attempts) {
    const isMultipartVideo = Boolean(attempt.form);
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: isMultipartVideo
        ? videoApiHeaders(apiKey)
        : { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: isMultipartVideo ? attempt.form : JSON.stringify(attempt.body),
      signal: options.signal
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (response.ok) {
      let sourceUrl = extractResultUrl(data);
      let task = null;
      if (!isImage && !sourceUrl) {
        task = extractGenerationTask(data);
        if (task) {
          const completed = await pollVideoGenerationTask(base, apiKey, task.taskId, options.signal, options.onProgress);
          sourceUrl = completed.resultUrl;
          task = completed.task || task;
          data = { ...data, poll: completed.data };
        }
      }
      if (!sourceUrl) {
        const preview = typeof data.raw === "string"
          ? data.raw.slice(0, 300).replace(/\s+/g, " ").trim()
          : JSON.stringify(data).slice(0, 300);
        errors.push(`${attempt.label}: HTTP ${response.status} but no playable video URL was returned${preview ? ` (${preview})` : ""}`);
        continue;
      }
      let resultUrl = sourceUrl;
      if (sourceUrl) {
        try {
          const videoAuthorization = !isImage && isSameApiOrigin(sourceUrl, base) ? apiKey : "";
          resultUrl = await downloadGeneratedAsset(sourceUrl, type, options.signal, videoAuthorization);
        } catch (error) {
          if (options.signal?.aborted) throw error;
          data.downloadError = error.message;
        }
      }
      return {
        data: {
          ...data,
          endpoint: attempt.label,
          sourceUrl,
          referenceImageAttached: Boolean(referenceImage),
          referenceImageSource: referenceImage?.source || "",
          referenceImageIntent: referenceImage ? "first" : "",
          referenceImageField: referenceImage ? "input_reference[]" : "",
          videoSettings: isImage ? undefined : {
            seconds,
            aspectRatio: videoAspectRatio,
            size: videoSize,
            resolution: videoResolution,
            preset: videoPreset
          }
        },
        resultUrl,
        task
      };
    }

    errors.push(`${attempt.label}: ${data.error?.message || data.message || text || `HTTP ${response.status}`}`);
  }
  throw new Error(errors.join(" | "));
}

async function callVideoWithContinuityCheck(prompt, options = {}, onProgress = () => {}) {
  const referenceImageUrl = options.imageUrl || "";
  const maxAttempts = referenceImageUrl ? Math.max(1, VIDEO_CONTINUITY_RETRIES + 1) : 1;
  const checks = [];
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) onProgress(`Continuity check failed. Retrying segment ${attempt}/${maxAttempts}...\n`);
    const attemptPrompt = attempt === 1
      ? prompt
      : [
          "IMPORTANT RETRY: The previous attempt changed the opening frame too much.",
          "The attached reference image must be treated as the first frame target.",
          "Keep the cube/subject position, size, orientation, camera angle, background ring, lighting, and colors aligned with the reference at the start.",
          "Begin almost still, then continue the motion.",
          "",
          prompt
        ].join("\n");
    const result = await callGenerationApi("video", attemptPrompt, { ...options, onProgress });
    lastResult = result;
    if (!referenceImageUrl || !result.resultUrl) return { ...result, continuityChecks: checks };

    let firstFrameSsim = null;
    let passed = false;
    let error = "";
    try {
      firstFrameSsim = await compareVideoFirstFrameToImage(result.resultUrl, referenceImageUrl);
      passed = firstFrameSsim === null || firstFrameSsim >= VIDEO_CONTINUITY_MIN_SSIM;
    } catch (compareError) {
      error = compareError.message;
      passed = true;
    }

    checks.push({ attempt, firstFrameSsim, minSsim: VIDEO_CONTINUITY_MIN_SSIM, passed, error });
    if (passed || attempt === maxAttempts) return { ...result, continuityChecks: checks };
  }

  return { ...lastResult, continuityChecks: checks };
}

async function proxyChat(req, res) {
  const requestController = new AbortController();
  const requestSignal = requestController.signal;
  res.on("close", () => {
    if (!res.writableEnded) requestController.abort();
  });

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
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const userContent = getLatestUserContent(messages);
  const referenceMode = ["auto", "manual", "none"].includes(payload.referenceMode) ? payload.referenceMode : "auto";
  const requestedFirstFrameUrl = String(payload.firstFrameUrl || "").trim();
  const selectedVideoSeconds = normalizeVideoSeconds(payload.videoSeconds, null);
  const selectedVideoAspectRatio = normalizeVideoAspectRatio(payload.videoAspectRatio, VIDEO_DEFAULT_ASPECT_RATIO);
  const selectedVideoResolution = normalizeVideoResolution(payload.videoResolution, VIDEO_DEFAULT_RESOLUTION);
  const selectedVideoPreset = normalizeVideoPreset(payload.videoPreset, VIDEO_DEFAULT_PRESET);
  const forceVideo = payload.forceVideo === true;
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

    const activeVideoProject = await getActiveVideoProject(conversationId);
    const wantsContinuation = isContinuationRequest(userContent);
    if (wantsContinuation && !activeVideoProject) {
      const assistantText = "No unfinished video segment was found. Start a new multi-segment video request first.";
      writeSse(res, assistantText);
      if (pool) {
        await addMessage(conversationId, "assistant", assistantText);
        await touchConversation(conversationId);
      }
      endSse(res);
      return;
    }
    const continuationProject = wantsContinuation ? activeVideoProject : null;
    const toolAction = await decideChatToolAction(
      messages,
      userContent,
      { activeVideoProject: continuationProject, forceVideo },
      requestSignal
    );
    const intent = toolAction.action;

    if (intent === "image" || intent === "video") {
      let assistantText = "";
      let taskId = null;
      const generationPrompt = toolAction.prompt || userContent;
      const videoPlan = intent === "video" ? normalizeVideoPlan({
        ...toolAction.videoPlan,
        ...(continuationProject && toolAction.videoPlan?.segmentIndex <= continuationProject.completedSegments
          ? { segmentIndex: continuationProject.nextSegment }
          : {}),
        basePrompt: toolAction.videoPlan?.basePrompt || continuationProject?.basePrompt || generationPrompt,
        continuity: toolAction.videoPlan?.continuity || continuationProject?.continuity || ""
      }, continuationProject ? null : (selectedVideoSeconds || requestedVideoSeconds(userContent))) : null;
      if (pool) taskId = await createGenerationTask({ conversationId, messageId: userMessageId, type: intent, prompt: generationPrompt });

      try {
        const progressLabel = videoPlan && videoPlan.totalSegments > 1
          ? ` segment ${videoPlan.segmentIndex}/${videoPlan.totalSegments}`
          : "";
        const progressText = videoPlan && videoPlan.totalSegments > 1
          ? `（第 ${videoPlan.segmentIndex}/${videoPlan.totalSegments} 段）`
          : "";
        writeSse(res, `正在生成${intent === "video" ? "视频" : "图片"}${progressText}…\n`);
        const fallbackFirstFrameUrl = getLatestUserImageUrl(messages);
        const manualImageUrl = isManagedReferenceImageUrl(requestedFirstFrameUrl)
          ? requestedFirstFrameUrl
          : isManagedReferenceImageUrl(fallbackFirstFrameUrl)
            ? fallbackFirstFrameUrl
            : "";
        const imageUrl = intent === "video"
          ? referenceMode === "manual"
            ? manualImageUrl
            : referenceMode === "auto"
              ? continuationProject?.tailFrameUrl || ""
              : ""
          : "";
        const result = intent === "video"
          ? await callVideoWithContinuityCheck(
              generationPrompt,
              {
                imageUrl,
                seconds: videoPlan?.segmentSeconds,
                aspectRatio: selectedVideoAspectRatio,
                resolution: selectedVideoResolution,
                preset: selectedVideoPreset,
                signal: requestSignal
              },
              (message) => writeSse(res, message)
            )
          : await callGenerationApi(intent, generationPrompt, {
              imageUrl,
              seconds: videoPlan?.segmentSeconds,
              userPrompt: userContent,
              signal: requestSignal
            });
        if (intent === "video" && result.task && !result.resultUrl) {
          const resultLine = `视频任务已提交，正在等待上游生成。\n任务 ID：${result.task.taskId}\n状态：${result.task.status || "queued"}\n上游暂未返回可播放地址，取得视频后才能继续提取尾帧。`;
          assistantText = resultLine;
          if (pool) await updateGenerationTask(taskId, {
            status: "pending",
            resultUrl: "",
            metadata: { ...result.data, router: toolAction, videoPlan, inputImageUrl: imageUrl }
          });
          writeSse(res, resultLine);
          if (pool && assistantText) {
            await addMessage(conversationId, "assistant", assistantText);
            await touchConversation(conversationId);
          }
          endSse(res);
          return;
        }
        const originalResultUrl = result.resultUrl || "";
        let tailFrameUrl = "";
        let tailFrameError = "";
        if (intent === "video" && result.resultUrl && videoPlan?.segmentIndex < videoPlan?.totalSegments) {
          try {
            writeSse(res, "\n正在提取尾帧，供下一段使用…\n");
            tailFrameUrl = await extractVideoTailFrame(result.resultUrl);
          } catch (error) {
            tailFrameError = error.message;
          }
        }
        const label = intent === "image" ? "图片" : "视频";
        const nextHint = videoPlan && videoPlan.segmentIndex < videoPlan.totalSegments
          ? `\n第 ${videoPlan.segmentIndex}/${videoPlan.totalSegments} 段已完成。下一段可选择“自动尾帧”，然后发送“继续”；也可以上传自己的首帧后再发送。`
          : "";
        const tailFrameHint = tailFrameUrl && videoPlan?.segmentIndex < videoPlan?.totalSegments
          ? "\n尾帧已保存。"
          : "";
        const referenceAttached = Boolean(result.data?.referenceImageAttached);
        const referenceHint = intent === "video" && referenceAttached
          ? referenceMode === "manual"
            ? "\n本段已按中转站网页同款格式提交首帧（input_reference[] + image_intent=first）。"
            : "\n本段已按中转站网页同款格式提交上一段尾帧（input_reference[] + image_intent=first）。"
          : intent === "video" && referenceMode === "manual"
            ? "\n首帧文件未能附带到视频请求，本段没有生成。"
            : "";
        const latestContinuityCheck = result.continuityChecks?.at?.(-1);
        const continuityCheckHint = latestContinuityCheck
          ? `\n首帧相似度：${latestContinuityCheck.firstFrameSsim?.toFixed?.(3) || "未知"}${result.continuityChecks.length > 1 ? `（共尝试 ${result.continuityChecks.length} 次）` : ""}。`
          : "";
        const resultLine = result.resultUrl ? `${label}生成完成：\n${result.resultUrl}${referenceHint}${continuityCheckHint}${tailFrameHint}${nextHint}` : `${label}任务已提交，但暂未返回文件地址。${nextHint}`;
        assistantText = resultLine;
        if (pool) await updateGenerationTask(taskId, {
          status: "completed",
          resultUrl: result.resultUrl,
          metadata: {
            ...result.data,
            router: toolAction,
            videoPlan,
            referenceMode,
            inputImageUrl: imageUrl,
            originalResultUrl,
            continuityChecks: result.continuityChecks || [],
            tailFrameUrl,
            tailFrameError
          }
        });
        writeSse(res, resultLine);
      } catch (error) {
        if (requestSignal.aborted) throw error;
        assistantText = `${intent === "video" ? "视频" : "图片"}生成失败，请稍后重试。\n[TECHNICAL_DETAILS]${error.message}[/TECHNICAL_DETAILS]`;
        if (pool) await updateGenerationTask(taskId, { status: "failed", metadata: { error: error.message, router: toolAction, videoPlan } });
        writeSse(res, assistantText);
      }

      if (pool && assistantText) {
        await addMessage(conversationId, "assistant", assistantText);
        await touchConversation(conversationId);
      }
      endSse(res);
      return;
    }

    const upstreamMessages = buildAttachmentAwareMessages(messages, attachments);
    const upstream = await fetch(buildChatEndpoint(payload.apiBase || CHAT_API_BASE), {
      method: "POST",
      headers: { "Authorization": `Bearer ${CHAT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: payload.model || CHAT_MODEL,
        messages: upstreamMessages,
        temperature: Number(payload.temperature ?? 0.7),
        stream: true
      }),
      signal: requestSignal
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
    if (requestSignal.aborted || res.destroyed) return;
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
  if (req.method === "GET" && req.url === "/api/console/session") {
    sendJson(res, 200, { authenticated: isConsoleAuthed(req) });
    return;
  }

  if (req.method === "POST" && req.url === "/api/console/login") {
    await handleConsoleLogin(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/console/logout") {
    handleConsoleLogout(res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/config") {
    sendJson(res, 200, {
      apiBase: CHAT_API_BASE,
      model: CHAT_MODEL,
      backendKeyConfigured: Boolean(CHAT_API_KEY),
      databaseConfigured: Boolean(pool),
      imageConfigured: Boolean(IMAGE_API_BASE && IMAGE_API_KEY),
      videoConfigured: Boolean(VIDEO_API_BASE && VIDEO_API_KEY),
      videoModel: VIDEO_MODEL,
      videoDurations: VIDEO_DURATION_OPTIONS,
      videoDefaultSeconds: VIDEO_SECONDS,
      videoAspectRatios: VIDEO_ASPECT_RATIO_OPTIONS,
      videoDefaultAspectRatio: VIDEO_DEFAULT_ASPECT_RATIO,
      videoResolutions: VIDEO_RESOLUTION_OPTIONS,
      videoDefaultResolution: VIDEO_DEFAULT_RESOLUTION,
      videoPresets: VIDEO_PRESET_OPTIONS,
      videoDefaultPreset: VIDEO_DEFAULT_PRESET
    });
    return;
  }
  if (req.url === "/api/conversations") {
    if (!requireConsoleAuth(req, res)) return;
    await handleConversations(req, res);
    return;
  }
  const conversationMatch = req.url.match(/^\/api\/conversations\/([^/]+)(?:\/(reset))?$/);
  if (conversationMatch) {
    if (!requireConsoleAuth(req, res)) return;
    await handleConversationById(req, res, conversationMatch[1], conversationMatch[2]);
    return;
  }
  const messageMatch = req.url.match(/^\/api\/messages\/([^/]+)$/);
  if (messageMatch) {
    if (!requireConsoleAuth(req, res)) return;
    await handleMessageById(req, res, messageMatch[1]);
    return;
  }
  if (req.method === "POST" && req.url === "/api/uploads") {
    if (!requireConsoleAuth(req, res)) return;
    await handleUploadAsset(req, res);
    return;
  }
  if (req.method === "POST" && req.url === "/api/chat") {
    if (!requireConsoleAuth(req, res)) return;
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
