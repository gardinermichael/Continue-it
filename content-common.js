(() => {
  if (window.__continueItSharedLoaded) {
    return;
  }
  window.__continueItSharedLoaded = true;

  const STORAGE_KEY = "continueIt.lastHandoff";
  const SUMMARY_MODE_KEY = "continueIt.summaryMode";
  const DEFAULT_SUMMARY_MODE = "medium";
  const SUMMARY_MODES = {
    short: {
      requirements: 2,
      progress: 2,
      blockers: 1,
      decisions: 2,
      files: 4,
      sentenceLength: 120
    },
    medium: {
      requirements: 4,
      progress: 3,
      blockers: 2,
      decisions: 3,
      files: 6,
      sentenceLength: 170
    },
    detailed: {
      requirements: 6,
      progress: 4,
      blockers: 3,
      decisions: 4,
      files: 10,
      sentenceLength: 220
    }
  };

  function normalizeText(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncateText(text, maxLength = 220) {
    const normalized = normalizeText(text);
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trim()}…`;
  }

  function splitSentences(text) {
    return normalizeText(text)
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => normalizeText(sentence))
      .filter((sentence) => sentence.length >= 24);
  }

  function uniqueItems(items) {
    const seen = new Set();
    const result = [];

    items.forEach((item) => {
      const key = normalizeText(item).toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      result.push(item);
    });

    return result;
  }

  function extractBacktickTokens(messages) {
    const tokens = [];
    const pattern = /`([^`]+)`/g;

    messages.forEach((message) => {
      let match;
      while ((match = pattern.exec(message.text)) !== null) {
        const token = normalizeText(match[1]);
        if (token && token.length <= 80) {
          tokens.push(token);
        }
      }
    });

    return tokens;
  }

  function extractFileMentions(messages, limit = 6) {
    const filePattern = /\b(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+\b/g;
    const filenamePattern = /\b[A-Za-z0-9_.-]+\.(?:js|ts|tsx|jsx|json|html|css|md|py|java|cs|go|rb|php|yml|yaml)\b/g;
    const selectorPattern = /(?:#[A-Za-z0-9_-]+|\[[^\]]+\])/g;
    const found = [];

    messages.forEach((message) => {
      const text = message.text || "";
      const matches = [
        ...(text.match(filePattern) || []),
        ...(text.match(filenamePattern) || []),
        ...(text.match(selectorPattern) || [])
      ];
      found.push(...matches);
    });

    found.push(...extractBacktickTokens(messages));

    return uniqueItems(found)
      .filter((item) => item.length <= 120)
      .slice(0, limit);
  }

  function pickKeySentences(messages, role, limit, keywords = [], maxLength = 170) {
    const candidates = [];
    const filteredMessages = messages.filter((message) => !role || message.role === role);

    filteredMessages.forEach((message, messageIndex) => {
      splitSentences(message.text).forEach((sentence, sentenceIndex) => {
        const lower = sentence.toLowerCase();
        let score = 0;

        if (sentence.length >= 40 && sentence.length <= 240) {
          score += 3;
        }
        if (sentence.length > 240) {
          score += 1;
        }
        if (messageIndex === 0) {
          score += 2;
        }
        if (messageIndex >= filteredMessages.length - 2) {
          score += 3;
        }
        if (sentenceIndex === 0) {
          score += 1;
        }

        keywords.forEach((keyword) => {
          if (lower.includes(keyword)) {
            score += 3;
          }
        });

        candidates.push({ sentence, score, order: messageIndex * 10 + sentenceIndex });
      });
    });

    return uniqueItems(
      candidates
        .sort((a, b) => (b.score - a.score) || (b.order - a.order))
        .map((candidate) => truncateText(candidate.sentence, maxLength))
    ).slice(0, limit);
  }

  function toBulletList(items, fallback) {
    const unique = uniqueItems(items).filter(Boolean);
    if (!unique.length) {
      return `- ${fallback}`;
    }
    return unique.map((item) => `- ${item}`).join("\n");
  }

  function buildSummary(messages, mode = DEFAULT_SUMMARY_MODE) {
    const config = SUMMARY_MODES[mode] || SUMMARY_MODES[DEFAULT_SUMMARY_MODE];
    const userMessages = messages.filter((message) => message.role === "user");
    const assistantMessages = messages.filter((message) => message.role === "assistant");

    const primaryTask = truncateText(userMessages[0]?.text || userMessages[userMessages.length - 1]?.text || "Unknown task.", config.sentenceLength);
    const currentRequest = truncateText(userMessages[userMessages.length - 1]?.text || "No current user request captured.", config.sentenceLength);
    const latestAssistantState = truncateText(assistantMessages[assistantMessages.length - 1]?.text || "No assistant response captured.", config.sentenceLength);

    const requirementKeywords = ["want", "need", "must", "should", "build", "create", "summary", "context", "continue", "button", "extension", "import", "export", "chrome", "chatgpt", "claude"];
    const progressKeywords = ["built", "fixed", "updated", "added", "created", "implemented", "working", "reload", "tested", "patched", "switched"];
    const blockerKeywords = ["error", "failed", "fails", "limit", "stopped", "issue", "problem", "bug", "empty", "ignored", "no idea"];
    const decisionKeywords = ["use", "will", "switched", "summary-first", "local", "mode", "preview", "manifest", "save", "copy", "insert"];
    const assistantKeywords = ["found", "implemented", "updated", "fixed", "changed", "recommend", "suggest", "issue", "selector", "prompt", "summary", "context", "captured", "import", "export"];

    const requirements = pickKeySentences(messages, "user", config.requirements, requirementKeywords, config.sentenceLength);
    const progress = pickKeySentences(messages, "assistant", config.progress, progressKeywords, config.sentenceLength);
    const blockers = pickKeySentences(messages, null, config.blockers, blockerKeywords, config.sentenceLength);
    const decisions = pickKeySentences(messages, null, config.decisions, decisionKeywords, config.sentenceLength);
    const assistantFindings = pickKeySentences(messages, "assistant", Math.max(2, config.progress), assistantKeywords, config.sentenceLength);
    const files = extractFileMentions(messages, config.files);

    return [
      "Task:",
      `- ${primaryTask}`,
      "",
      "Current request:",
      `- ${currentRequest}`,
      "",
      "Key requirements from the user:",
      toBulletList(requirements, "No clear requirements captured."),
      "",
      "Claude's latest response/state:",
      `- ${latestAssistantState}`,
      "",
      "Claude findings, fixes, or suggestions:",
      toBulletList(assistantFindings, "No assistant-side findings captured."),
      "",
      "Files or code discussed:",
      toBulletList(files, "No specific files or code references detected."),
      "",
      "Bugs or errors noted:",
      toBulletList(blockers, "No major blocker captured."),
      "",
      "Decisions made in the conversation:",
      toBulletList(decisions, "No explicit decision captured."),
      "",
      "Progress so far:",
      toBulletList(progress, "No implementation progress captured."),
      "",
      "Next exact action:",
      `- Continue from the latest user request using both the user's requirements and Claude's latest findings. Ask one short clarifying question only if a critical detail is missing.`
    ].join("\n");
  }

  function buildPrompt(handoff) {
    return [
      "Use this condensed handoff summary from another LLM conversation.",
      "",
      `Source: ${handoff.source}`,
      `Captured at: ${handoff.createdAt}`,
      handoff.summaryMode ? `Summary mode: ${handoff.summaryMode}` : null,
      handoff.pageTitle ? `Page title: ${handoff.pageTitle}` : null,
      handoff.pageUrl ? `Page URL: ${handoff.pageUrl}` : null,
      "",
      "Conversation summary:",
      handoff.summary,
      "",
      "Instructions:",
      "- Treat the summary as the current working context.",
      "- Identify the unfinished task and continue from the user's latest intent.",
      "- Use any detected files, code references, bugs, and decisions in the summary.",
      "- If something critical is missing, ask one short clarifying question before proceeding."
    ].filter(Boolean).join("\n");
  }

  function saveHandoff(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SAVE_HANDOFF", payload }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "Unknown save error" });
      });
    });
  }

  function getHandoff() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_HANDOFF" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response?.payload || null);
      });
    });
  }

  function getSummaryMode() {
    return new Promise((resolve) => {
      chrome.storage.local.get([SUMMARY_MODE_KEY], (result) => {
        resolve(result[SUMMARY_MODE_KEY] || DEFAULT_SUMMARY_MODE);
      });
    });
  }

  function setSummaryMode(mode) {
    const nextMode = SUMMARY_MODES[mode] ? mode : DEFAULT_SUMMARY_MODE;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [SUMMARY_MODE_KEY]: nextMode }, () => {
        resolve(nextMode);
      });
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function toast(message, tone = "default") {
    const el = document.createElement("div");
    el.textContent = message;
    el.style.position = "fixed";
    el.style.right = "20px";
    el.style.bottom = "20px";
    el.style.zIndex = "2147483647";
    el.style.padding = "12px 14px";
    el.style.borderRadius = "8px";
    el.style.fontSize = "13px";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.maxWidth = "320px";
    el.style.color = "#fff";
    el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
    el.style.background = tone === "error" ? "#b42318" : tone === "success" ? "#067647" : "#344054";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function makeFloatingButton(label, onClick, side = "right") {
    const existing = document.getElementById(`continue-it-${label.toLowerCase().replace(/\s+/g, "-")}`);
    if (existing) {
      return existing;
    }

    const button = document.createElement("button");
    button.id = `continue-it-${label.toLowerCase().replace(/\s+/g, "-")}`;
    button.type = "button";
    button.textContent = label;
    button.style.position = "fixed";
    button.style.top = "20px";
    button.style[side] = "20px";
    button.style.zIndex = "2147483647";
    button.style.border = "0";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 14px";
    button.style.background = "#111827";
    button.style.color = "#ffffff";
    button.style.cursor = "pointer";
    button.style.fontSize = "13px";
    button.style.fontWeight = "600";
    button.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
    return button;
  }

  window.ContinueItShared = {
    STORAGE_KEY,
    SUMMARY_MODE_KEY,
    DEFAULT_SUMMARY_MODE,
    SUMMARY_MODES,
    normalizeText,
    truncateText,
    buildSummary,
    buildPrompt,
    saveHandoff,
    getHandoff,
    getSummaryMode,
    setSummaryMode,
    copyText,
    toast,
    makeFloatingButton,
    extractFileMentions
  };
})();