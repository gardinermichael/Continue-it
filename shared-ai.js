(() => {
  const globalScope = typeof window !== "undefined" ? window : self;
  if (globalScope.ContinueItAI) {
    return;
  }

  const STORAGE_KEYS = {
    mode: "continueIt.ai.mode",
    serverUrl: "continueIt.ai.serverUrl",
    byokProvider: "continueIt.ai.byokProvider",
    byokBaseUrl: "continueIt.ai.byokBaseUrl",
    byokModel: "continueIt.ai.byokModel",
    byokApiKey: "continueIt.ai.byokApiKey",
    clientId: "continueIt.clientId",
    lastQuota: "continueIt.ai.lastQuota"
  };

  // Provider mode for the AI summary. Not to be confused with the "summary detail
  // mode" (short/medium/detailed) used elsewhere.
  const AI_MODES = {
    none: "none", // Local heuristic only. Free, private, offline.
    server: "server", // Shared backend. Rate limited to 5 exports / 24h.
    byok: "byok" // Bring your own OpenAI-compatible key. Unlimited.
  };
  const DEFAULT_MODE = AI_MODES.none;
  const DEFAULT_SERVER_URL = "http://localhost:8787";

  // Curated list of free / no-card OpenAI-compatible providers. Base URLs and
  // limits verified 2026-07. Always double-check current limits on each site.
  const PROVIDER_PRESETS = [
    {
      id: "openrouter",
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      keyUrl: "https://openrouter.ai/keys",
      note: "20+ free models (pick one ending in :free). ~50 requests/day free, no card."
    },
    {
      id: "google",
      name: "Google AI Studio (Gemini)",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.0-flash",
      keyUrl: "https://aistudio.google.com/apikey",
      note: "~1,500 requests/day free, no card. Not available in the EU/UK/Switzerland."
    },
    {
      id: "groq",
      name: "Groq (fastest)",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      keyUrl: "https://console.groq.com/keys",
      note: "Very fast. ~1,000 requests/day free, no card."
    },
    {
      id: "cerebras",
      name: "Cerebras (highest volume)",
      baseUrl: "https://api.cerebras.ai/v1",
      model: "llama-3.3-70b",
      keyUrl: "https://cloud.cerebras.ai/",
      note: "~1M tokens/day free, no card."
    },
    {
      id: "nvidia",
      name: "NVIDIA NIM",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "meta/llama-3.1-70b-instruct",
      keyUrl: "https://build.nvidia.com/",
      note: "Large models on NVIDIA GPUs. Free credits, no card to start."
    },
    {
      id: "mistral",
      name: "Mistral",
      baseUrl: "https://api.mistral.ai/v1",
      model: "mistral-small-latest",
      keyUrl: "https://console.mistral.ai/api-keys/",
      note: "Free 'Experiment' tier (requires opting into data training)."
    },
    {
      id: "custom",
      name: "Custom (any OpenAI-compatible endpoint)",
      baseUrl: "",
      model: "",
      keyUrl: "",
      note: "Enter any OpenAI-compatible base URL and model name."
    }
  ];

  function getStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function setStorage(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function generateId() {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
      return globalScope.crypto.randomUUID();
    }
    return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  // A stable anonymous id used by the shared backend to enforce its per-user
  // daily quota. Generated once and stored locally.
  async function getClientId() {
    const result = await getStorage([STORAGE_KEYS.clientId]);
    let clientId = result[STORAGE_KEYS.clientId];
    if (!clientId) {
      clientId = generateId();
      await setStorage({ [STORAGE_KEYS.clientId]: clientId });
    }
    return clientId;
  }

  function findPreset(id) {
    return PROVIDER_PRESETS.find((preset) => preset.id === id) || null;
  }

  async function getSettings() {
    const result = await getStorage(Object.values(STORAGE_KEYS));
    const mode = AI_MODES[result[STORAGE_KEYS.mode]] || DEFAULT_MODE;
    return {
      mode,
      serverUrl: DEFAULT_SERVER_URL,
      byok: {
        provider: result[STORAGE_KEYS.byokProvider] || "openrouter",
        baseUrl: result[STORAGE_KEYS.byokBaseUrl] || "",
        model: result[STORAGE_KEYS.byokModel] || "",
        apiKey: result[STORAGE_KEYS.byokApiKey] || ""
      },
      lastQuota: result[STORAGE_KEYS.lastQuota] || null
    };
  }

  async function saveSettings(settings) {
    const payload = {};
    if (settings.mode !== undefined) {
      payload[STORAGE_KEYS.mode] = AI_MODES[settings.mode] || DEFAULT_MODE;
    }
    if (settings.byok) {
      if (settings.byok.provider !== undefined) {
        payload[STORAGE_KEYS.byokProvider] = settings.byok.provider || "openrouter";
      }
      if (settings.byok.baseUrl !== undefined) {
        payload[STORAGE_KEYS.byokBaseUrl] = settings.byok.baseUrl || "";
      }
      if (settings.byok.model !== undefined) {
        payload[STORAGE_KEYS.byokModel] = settings.byok.model || "";
      }
      if (settings.byok.apiKey !== undefined) {
        payload[STORAGE_KEYS.byokApiKey] = settings.byok.apiKey || "";
      }
    }
    await setStorage(payload);
  }

  async function saveLastQuota(quota) {
    if (!quota) {
      return;
    }
    await setStorage({ [STORAGE_KEYS.lastQuota]: quota });
  }

  function maxTokensForMode(mode) {
    return mode === "short" ? 800 : mode === "detailed" ? 2500 : 1500;
  }

  // Patterns that indicate a message is handoff metadata, not real conversation content.
  const HANDOFF_MARKERS = [
    "You are receiving a transferred conversation from another model.",
    "Do NOT answer or continue the conversation now.",
    "When you acknowledge, wait for the user's next instruction.",
    "I understand and I'm ready to proceed.",
    "Reply only with a short acknowledgement that you received the conversation"
  ];

  function isHandoffArtifact(text) {
    if (!text || text.trim().length < 3) return true;
    const t = text.trim();
    return HANDOFF_MARKERS.some((marker) => t.includes(marker));
  }

  // Trim the raw transcript down to something a summarizer can chew on without
  // blowing past context limits. Strips handoff preamble and scraping artifacts.
  function buildCompactConversation(messages, mode, shared) {
    const limit = mode === "short" ? 16 : mode === "detailed" ? 36 : 24;
    const perMessage = mode === "short" ? 500 : mode === "detailed" ? 1000 : 700;
    return (messages || [])
      .filter((message) => !isHandoffArtifact(message.text))
      .slice(-limit)
      .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${shared.truncateText(message.text, perMessage)}`)
      .join("\n\n");
  }

  function originPatternFor(url) {
    try {
      return `${new URL(url).origin}/*`;
    } catch (error) {
      return null;
    }
  }

  // --- Permission helpers (used from the popup, which has a user gesture) ---

  function hasOriginPermission(url) {
    const pattern = originPatternFor(url);
    if (!pattern) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      chrome.permissions.contains({ origins: [pattern] }, (granted) => resolve(Boolean(granted)));
    });
  }

  function requestOriginPermission(url) {
    const pattern = originPatternFor(url);
    if (!pattern) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      chrome.permissions.request({ origins: [pattern] }, (granted) => resolve(Boolean(granted)));
    });
  }

  function sendToWorker(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, used: true, summary: null, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, used: true, summary: null, error: "No response from background worker." });
        });
      } catch (error) {
        resolve({ ok: false, used: true, summary: null, error: error?.message || "Failed to reach background worker." });
      }
    });
  }

  // Main entry point used during export. `mode` here is the summary detail level.
  async function summarizeConversation({ source, messages, mode, shared }) {
    const settings = await getSettings();
    if (settings.mode === AI_MODES.none) {
      return { used: false, summary: null, error: null, quota: null };
    }

    const clientId = await getClientId();
    const compactConversation = buildCompactConversation(messages, mode, shared);

    const response = await sendToWorker({
      type: "continueIt.summarize",
      payload: {
        aiMode: settings.mode,
        source,
        mode,
        clientId,
        compactConversation,
        maxTokens: maxTokensForMode(mode)
      }
    });

    if (response && response.quota) {
      await saveLastQuota(response.quota);
    }

    return {
      used: true,
      summary: response && response.summary ? response.summary : null,
      error: response && response.error ? response.error : null,
      quota: response ? response.quota || null : null
    };
  }

  // Lightweight round-trip used by the popup "Test connection" button.
  async function testConnection() {
    const settings = await getSettings();
    if (settings.mode === AI_MODES.none) {
      return { ok: false, error: "Select Server AI or your own API key first." };
    }
    const clientId = await getClientId();
    return sendToWorker({ type: "continueIt.test", payload: { aiMode: settings.mode, clientId } });
  }

  globalScope.ContinueItAI = {
    STORAGE_KEYS,
    AI_MODES,
    DEFAULT_MODE,
    DEFAULT_SERVER_URL,
    PROVIDER_PRESETS,
    findPreset,
    getClientId,
    getSettings,
    saveSettings,
    saveLastQuota,
    buildCompactConversation,
    maxTokensForMode,
    originPatternFor,
    hasOriginPermission,
    requestOriginPermission,
    summarizeConversation,
    testConnection
  };
})();
