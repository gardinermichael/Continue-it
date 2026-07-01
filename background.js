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

function buildSummarizeMessages({ source, mode, heuristicSummary, compactConversation }) {
  return [
    {
      role: "system",
      content:
        "You are a precise conversation-handoff summarizer. Your output will be pasted into a different AI so it can seamlessly continue the conversation. Write plain text only (no markdown headers, no code fences). Be concrete, preserve concrete requirements, decisions, file names and open questions, and remove repetition."
    },
    {
      role: "user",
      content: [
        `Source AI: ${source}`,
        `Summary detail: ${mode}`,
        "",
        "Produce these plain-text sections, each on its own line label:",
        "Task:",
        "Current request:",
        "Key requirements:",
        "Assistant findings:",
        "Files or code discussed:",
        "Open issues:",
        "Next action:",
        "",
        "Keep it concise and directly useful for continuing the work.",
        "",
        "Existing heuristic summary (improve on this, do not just copy it):",
        heuristicSummary,
        "",
        "Conversation excerpt (most recent turns):",
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
        heuristicSummary: payload.heuristicSummary,
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
