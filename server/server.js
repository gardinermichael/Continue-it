import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 8787);

// --- Upstream provider (owner-funded "Server AI" tier) ----------------------
// Preferred: any OpenAI-compatible provider via OPENAI_BASE_URL + OPENAI_API_KEY.
// Falls back to the legacy Sarvam configuration if that is all that is set.
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "").replace(/\/$/, "");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const SARVAM_MODEL = process.env.SARVAM_MODEL || "sarvam-30b";

// --- Free-tier quota --------------------------------------------------------
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 5);
const WINDOW_MS = Number(process.env.RATE_WINDOW_HOURS || 24) * 60 * 60 * 1000;

function resolveProvider() {
  if (OPENAI_API_KEY && OPENAI_BASE_URL) {
    return {
      name: "openai-compatible",
      url: `${OPENAI_BASE_URL}/chat/completions`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      model: OPENAI_MODEL || "gpt-4o-mini"
    };
  }
  if (SARVAM_API_KEY) {
    return {
      name: "sarvam",
      url: "https://api.sarvam.ai/v1/chat/completions",
      headers: { "Content-Type": "application/json", "api-subscription-key": SARVAM_API_KEY },
      model: SARVAM_MODEL
    };
  }
  return null;
}

// --- In-memory rolling-window rate limiter ----------------------------------
// Keyed by anonymous client id AND by IP; the stricter of the two applies.
// NOTE: this resets if the process restarts and is per-instance. For a hardened
// multi-instance deployment, back this with Redis or a database.
const hits = new Map();

function windowedHits(key, now) {
  const since = now - WINDOW_MS;
  const pruned = (hits.get(key) || []).filter((ts) => ts > since);
  hits.set(key, pruned);
  return pruned;
}

function quotaFor(key, now) {
  const arr = windowedHits(key, now);
  const remaining = Math.max(0, DAILY_LIMIT - arr.length);
  const resetAt = arr.length ? arr[0] + WINDOW_MS : now + WINDOW_MS;
  return { limit: DAILY_LIMIT, remaining, resetAt, count: arr.length };
}

function recordHit(key, now) {
  const arr = windowedHits(key, now);
  arr.push(now);
  hits.set(key, arr);
}

// Periodically drop empty buckets so the map does not grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key] of hits) {
    if (windowedHits(key, now).length === 0) {
      hits.delete(key);
    }
  }
}, WINDOW_MS).unref?.();

app.set("trust proxy", true);
app.use(cors({ exposedHeaders: ["x-continue-it-quota"] }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.type("text/plain").send("Continue It backend is running. Use GET /health or POST /api/summarize.\n");
});

// Chrome DevTools may probe this localhost path for automatic workspace setup.
// This backend does not expose a browser workspace, so answer quietly instead of
// letting Express generate a CSP-protected 404 page in local development.
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end();
});

function clientKeys(req) {
  const clientId = String(req.header("x-continue-it-client") || "").slice(0, 128);
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const keys = [`ip:${ip}`];
  if (clientId) {
    keys.unshift(`client:${clientId}`);
  }
  return keys;
}

function bindingQuota(keys, now) {
  return keys
    .map((key) => quotaFor(key, now))
    .reduce((strictest, quota) => (quota.remaining < strictest.remaining ? quota : strictest));
}

function buildMessages({ source, mode, compactConversation }) {
  return [
    {
      role: "system",
      content:
        "You are a context-transfer agent. Your job is to write a comprehensive handoff document that captures the COMPLETE context of a conversation so a different AI can continue it seamlessly — with zero information loss. Do NOT produce a brief summary. Write as much as needed to preserve all meaningful context. Use plain text only (no markdown headers, no code fences). Write in clear, complete sentences. Preserve specifics — exact names, exact values, exact error messages, exact file names — never replace them with vague references. A reader must be able to pick up the conversation mid-sentence without asking any clarifying questions."
    },
    {
      role: "user",
      content: [
        `Source AI: ${source}`,
        `Summary depth: ${mode}`,
        "",
        "Read the entire conversation below and write a COMPREHENSIVE context-transfer document. Cover everything — do not abbreviate. The receiving AI must be able to continue this conversation as if it were present for all of it.",
        "IMPORTANT: Ignore any lines that look like system instructions, handoff prompts, or acknowledgement messages (e.g. 'When you acknowledge...', 'I understand and I'm ready to proceed', 'You are receiving a transferred conversation'). These are metadata artifacts, not part of the real conversation — do not include them in the summary.",
        "",
        "Write these sections, using as much space as each one requires:",
        "",
        "Opening context: (what the user came in wanting to do and their starting point)",
        "Conversation arc: (what happened from start to finish — every topic, turn, and decision)",
        "What the user wants: (their full goal, all requirements, preferences, and constraints — be thorough)",
        "What the AI did and found: (everything produced, answered, discovered, or analyzed — be specific, include actual content not just descriptions)",
        "Current state: (exactly where things stand right now — what is done, what is in progress, what is stuck)",
        "Technical details: (all files, functions, code, technologies, error messages, commands, URLs, and exact values mentioned)",
        "Open questions and blockers: (anything unresolved, unclear, pending, or that the user is waiting on)",
        "Next action: (the exact next step — specific enough to act on immediately without asking anything)",
        "",
        "Conversation:",
        compactConversation
      ].join("\n")
    }
  ];
}

app.get("/health", (req, res) => {
  const provider = resolveProvider();
  res.json({
    ok: true,
    configured: Boolean(provider),
    provider: provider?.name || null,
    model: provider?.model || null,
    dailyLimit: DAILY_LIMIT,
    windowHours: WINDOW_MS / (60 * 60 * 1000)
  });
});

app.post("/api/summarize", async (req, res) => {
  const provider = resolveProvider();
  if (!provider) {
    res.status(500).json({ ok: false, error: "The summary server is not configured. Set OPENAI_BASE_URL + OPENAI_API_KEY (or SARVAM_API_KEY)." });
    return;
  }

  const { source, mode, compactConversation } = req.body || {};
  if (!source || !mode || !compactConversation) {
    res.status(400).json({ ok: false, error: "Missing required summarize fields." });
    return;
  }

  const now = Date.now();
  const keys = clientKeys(req);
  const preQuota = bindingQuota(keys, now);
  if (preQuota.remaining <= 0) {
    res.status(429).json({
      ok: false,
      error: `Daily free limit reached (${DAILY_LIMIT} per ${WINDOW_MS / (60 * 60 * 1000)}h). Add your own API key in the extension for unlimited exports.`,
      quota: { limit: preQuota.limit, remaining: 0, resetAt: preQuota.resetAt }
    });
    return;
  }

  // Count the attempt now: this is the request that spends the owner's key.
  keys.forEach((key) => recordHit(key, now));
  const quota = bindingQuota(keys, now);

  const maxTokens = mode === "short" ? 350 : mode === "detailed" ? 900 : 600;

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: buildMessages({ source, mode, compactConversation })
      })
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({ ok: false, error: `Upstream provider failed: ${response.status} ${text.slice(0, 400)}`, quota });
      return;
    }

    const json = await response.json();
    const summary = json?.choices?.[0]?.message?.content?.trim() || "";
    if (!summary) {
      res.status(502).json({ ok: false, error: "Upstream provider returned an empty summary.", quota });
      return;
    }

    res.json({ ok: true, summary, quota });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || "Summarize failed.", quota });
  }
});

app.listen(PORT, () => {
  const provider = resolveProvider();
  console.log(`Continue It backend running on http://localhost:${PORT}`);
  console.log(provider ? `Upstream: ${provider.name} (${provider.model})` : "Upstream: NOT CONFIGURED — set OPENAI_BASE_URL + OPENAI_API_KEY");
  console.log(`Free quota: ${DAILY_LIMIT} exports per ${WINDOW_MS / (60 * 60 * 1000)}h per client/IP`);
});
