// Background service worker.
//
// All outbound AI summarization requests are performed here rather than from the
// content script. A service worker with host permissions can make cross-origin
// requests without being blocked by the page's Content-Security-Policy or CORS,
// which is what makes "bring your own key" work reliably on strict sites like
// ChatGPT and Claude.

const AI_STORAGE_KEYS = {
  serverUrl: "continueIt.ai.serverUrl",
  byokBaseUrl: "continueIt.ai.byokBaseUrl",
  byokModel: "continueIt.ai.byokModel",
  byokApiKey: "continueIt.ai.byokApiKey"
};
const DEFAULT_SERVER_URL = "http://localhost:8787";

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function originPatternFor(url) {
  try {
    return `${new URL(url).origin}/*`;
  } catch (error) {
    return null;
  }
}

function hasOriginPermission(url) {
  const pattern = originPatternFor(url);
  if (!pattern) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    chrome.permissions.contains({ origins: [pattern] }, (granted) => resolve(Boolean(granted)));
  });
}

function buildSummarizeMessages({ source, mode, compactConversation }) {
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

// --- Shared backend (sarvam AI) 
async function summarizeViaServer(payload) {
  const serverUrl = DEFAULT_SERVER_URL.replace(/\/$/, "");
  const url = `${serverUrl}/api/summarize`;

  if (!(await hasOriginPermission(serverUrl))) {
    return {
      ok: false,
      used: true,
      summary: null,
      error: `Access to ${serverUrl} is not granted. Open the extension popup and click "Save AI settings" to grant it.`
    };
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-continue-it-client": payload.clientId || ""
      },
      body: JSON.stringify({
        source: payload.source,
        mode: payload.mode,
        compactConversation: payload.compactConversation
      })
    });
  } catch (error) {
    return { ok: false, used: true, summary: null, error: `Could not reach the summary server at ${serverUrl}. Is it running? (${error?.message || "network error"})` };
  }

  let json = null;
  try {
    json = await response.json();
  } catch (error) {
    json = null;
  }

  if (response.status === 429) {
    return {
      ok: false,
      used: true,
      summary: null,
      quota: json?.quota || null,
      error: json?.error || "Daily free server limit reached. Try again later or add your own API key."
    };
  }

  if (!response.ok) {
    return { ok: false, used: true, summary: null, quota: json?.quota || null, error: json?.error || `Server summarize failed (${response.status}).` };
  }

  const summary = (json?.summary || "").trim();
  if (!summary) {
    return { ok: false, used: true, summary: null, quota: json?.quota || null, error: "Server returned an empty summary." };
  }

  return { ok: true, used: true, summary, quota: json?.quota || null, error: null };
}

// --- Bring your own key (OpenAI-compatible) 

async function summarizeViaByok(payload) {
  const stored = await getStorage([AI_STORAGE_KEYS.byokBaseUrl, AI_STORAGE_KEYS.byokModel, AI_STORAGE_KEYS.byokApiKey]);
  const baseUrl = (stored[AI_STORAGE_KEYS.byokBaseUrl] || "").replace(/\/$/, "");
  const model = stored[AI_STORAGE_KEYS.byokModel] || "";
  const apiKey = stored[AI_STORAGE_KEYS.byokApiKey] || "";

  if (!baseUrl || !model || !apiKey) {
    return { ok: false, used: true, summary: null, error: "Your API key settings are incomplete. Add a base URL, model, and API key in the popup." };
  }
  if (!(await hasOriginPermission(baseUrl))) {
    return { ok: false, used: true, summary: null, error: `Access to ${baseUrl} is not granted. Open the popup and click "Save AI settings" to grant it.` };
  }

  const url = `${baseUrl}/chat/completions`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional attribution headers used by some providers (e.g. OpenRouter).
        "HTTP-Referer": "https://github.com/continue-it-extension",
        "X-Title": "Continue it"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: payload.maxTokens || 600,
        messages: buildSummarizeMessages(payload)
      })
    });
  } catch (error) {
    return { ok: false, used: true, summary: null, error: `Could not reach ${baseUrl}. (${error?.message || "network error"})` };
  }

  let json = null;
  const rawText = await response.text();
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    json = null;
  }

  if (!response.ok) {
    const providerError = json?.error?.message || json?.error || rawText || `Request failed (${response.status}).`;
    return { ok: false, used: true, summary: null, error: `Provider error: ${typeof providerError === "string" ? providerError.slice(0, 400) : response.status}` };
  }

  const summary = (json?.choices?.[0]?.message?.content || "").trim();
  if (!summary) {
    return { ok: false, used: true, summary: null, error: "The provider returned an empty summary. Try a different model." };
  }

  return { ok: true, used: true, summary, quota: null, error: null };
}

async function handleSummarize(payload) {
  if (payload.aiMode === "server") {
    return summarizeViaServer(payload);
  }
  if (payload.aiMode === "byok") {
    return summarizeViaByok(payload);
  }
  return { ok: false, used: false, summary: null, error: "AI is disabled." };
}

// Minimal request used to validate that a provider/key/server actually works.
async function handleTest(payload) {
  const testPayload = {
    ...payload,
    source: "Connection test",
    mode: "short",
    maxTokens: 8,
    heuristicSummary: "Connection test.",
    compactConversation: "User: Reply with the single word OK."
  };
  const result = await handleSummarize(testPayload);
  if (result.ok) {
    return { ok: true, error: null, quota: result.quota || null };
  }
  return { ok: false, error: result.error || "Test failed.", quota: result.quota || null };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "continueIt.summarize") {
    handleSummarize(message.payload || {})
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, used: true, summary: null, error: error?.message || "AI request failed." }));
    return true;
  }

  if (message.type === "continueIt.test") {
    handleTest(message.payload || {})
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Test failed." }));
    return true;
  }

  return false;
});
