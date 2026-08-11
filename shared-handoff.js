(() => {
  if (window.ContinueItShared && window.ContinueItShared.schemaVersion === 2) {
    return;
  }

  const HANDOFF_SCHEMA_VERSION = 2;
  const STORAGE_KEYS = {
    latest: "continueIt.latestHandoff",
    summaryMode: "continueIt.summaryMode",
    chunkCursor: "continueIt.chunkCursor",
    history: "continueIt.handoffHistory"
  };
  const DEFAULT_SUMMARY_MODE = "medium";
  const SUMMARY_MODES = {
    short: {
      sentenceLength: 120,
      requirements: 3,
      findings: 3,
      blockers: 2,
      decisions: 2,
      recentMessages: 10,
      timelinePoints: 6
    },
    medium: {
      sentenceLength: 180,
      requirements: 5,
      findings: 5,
      blockers: 3,
      decisions: 4,
      recentMessages: 16,
      timelinePoints: 10
    },
    detailed: {
      sentenceLength: 260,
      requirements: 7,
      findings: 7,
      blockers: 4,
      decisions: 6,
      recentMessages: 24,
      timelinePoints: 14
    }
  };
  const LIMITS = {
    maxDirectImportTokens: 6500,
    transcriptChunkChars: 12000,
    recommendedStorageWarningBytes: 4000000,
    maxHistoryEntries: 10,
    maxSummaryPreviewChars: 2000
  };

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeText(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanMessageText(text) {
    const cleaned = (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const scriptNoisePatterns = [
      /window\.__oai_/i,
      /requestAnimationFrame\(/i,
      /window\.__NEXT_DATA__/i,
      /webpack/i
    ];

    if (scriptNoisePatterns.some((pattern) => pattern.test(cleaned))) {
      return "";
    }

    return cleaned;
  }

  function truncateText(text, maxLength = 220) {
    const cleaned = cleanMessageText(text);
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength - 1).trim()}…`;
  }

  function splitSentences(text) {
    return cleanMessageText(text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => normalizeText(sentence))
      .filter((sentence) => sentence.length >= 16);
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

  function estimateTokens(text) {
    return Math.ceil((text || "").length / 4);
  }

  function hashString(input) {
    const text = String(input || "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function estimateSizeBytes(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch (error) {
      return JSON.stringify(value || "").length;
    }
  }

  function formatMessage(message, index) {
    const label = message.role === "assistant" ? "Assistant" : message.role === "user" ? "User" : "Unknown";
    return `${index + 1}. [${label}] ${cleanMessageText(message.text)}`;
  }

  function toBulletList(items, fallback) {
    const unique = uniqueItems(items).filter(Boolean);
    if (!unique.length) {
      return `- ${fallback}`;
    }
    return unique.map((item) => `- ${item}`).join("\n");
  }

  function pickKeySentences(messages, role, limit, keywords = [], maxLength = 180) {
    const filtered = messages.filter((message) => !role || message.role === role);
    const candidates = [];

    filtered.forEach((message, messageIndex) => {
      splitSentences(message.text).forEach((sentence, sentenceIndex) => {
        const lower = sentence.toLowerCase();
        let score = 0;

        if (sentence.length >= 24 && sentence.length <= 280) {
          score += 3;
        }
        if (sentenceIndex === 0) {
          score += 1;
        }
        if (messageIndex === 0 || messageIndex >= filtered.length - 2) {
          score += 2;
        }
        keywords.forEach((keyword) => {
          if (lower.includes(keyword)) {
            score += 3;
          }
        });

        candidates.push({ sentence, score, order: messageIndex * 100 + sentenceIndex });
      });
    });

    return uniqueItems(
      candidates
        .sort((a, b) => (b.score - a.score) || (b.order - a.order))
        .map((candidate) => truncateText(candidate.sentence, maxLength))
    ).slice(0, limit);
  }

  function buildTimeline(messages, mode) {
    const config = SUMMARY_MODES[mode] || SUMMARY_MODES[DEFAULT_SUMMARY_MODE];
    if (!messages.length) {
      return [];
    }

    const points = [];
    const step = Math.max(1, Math.floor(messages.length / config.timelinePoints));
    for (let index = 0; index < messages.length; index += step) {
      const message = messages[index];
      points.push(`${message.role === "assistant" ? "Assistant" : "User"}: ${truncateText(message.text, config.sentenceLength)}`);
    }

    const lastMessage = messages[messages.length - 1];
    if (points.length === 0 || !points[points.length - 1].includes(truncateText(lastMessage.text, 40))) {
      points.push(`${lastMessage.role === "assistant" ? "Claude" : "User"}: ${truncateText(lastMessage.text, config.sentenceLength)}`);
    }

    return uniqueItems(points).slice(0, config.timelinePoints + 1);
  }

  function extractBacktickTokens(messages) {
    const tokens = [];
    const pattern = /`([^`]+)`/g;

    messages.forEach((message) => {
      const text = message.text || "";
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const token = normalizeText(match[1]);
        if (token && token.length <= 120) {
          tokens.push(token);
        }
      }
    });

    return tokens;
  }

  function extractFileMentions(messages, limit = 10) {
    const filePattern = /\b(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_. -]+\.[A-Za-z0-9]+\b/g;
    const filenamePattern = /\b[A-Za-z0-9_.-]+\.(?:js|ts|tsx|jsx|json|html|css|md|py|java|cs|go|rb|php|yml|yaml|txt)\b/g;
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
    return uniqueItems(found).filter((item) => item.length <= 140).slice(0, limit);
  }

  function buildRecentTranscript(messages, count) {
    return messages
      .slice(-count)
      .map((message, index, recent) => formatMessage(message, messages.length - recent.length + index))
      .join("\n");
  }

  function buildTranscriptChunks(messages, chunkChars = LIMITS.transcriptChunkChars) {
    const chunks = [];
    let current = [];
    let currentLength = 0;

    messages.forEach((message, index) => {
      const line = formatMessage(message, index);
      const nextLength = currentLength + line.length + 1;
      if (current.length && nextLength > chunkChars) {
        chunks.push(current.join("\n"));
        current = [];
        currentLength = 0;
      }
      current.push(line);
      currentLength += line.length + 1;
    });

    if (current.length) {
      chunks.push(current.join("\n"));
    }

    return chunks;
  }

  function buildTranscriptChunkObjects(messages, chunkChars = LIMITS.transcriptChunkChars, sentenceLength = 140) {
    const chunks = [];
    let currentMessages = [];
    let currentLines = [];
    let currentLength = 0;
    let startIndex = 0;

    function flushChunk() {
      if (!currentMessages.length) {
        return;
      }

      const chunkMessages = currentMessages.slice();
      const userIntent = pickKeySentences(chunkMessages, "user", 1, ["want", "need", "must", "build", "fix", "continue", "create"], sentenceLength)[0] || "";
      const assistantFinding = pickKeySentences(chunkMessages, "assistant", 1, ["found", "fixed", "implemented", "suggest", "updated", "recommend"], sentenceLength)[0] || "";
      const blocker = pickKeySentences(chunkMessages, null, 1, ["error", "failed", "issue", "problem", "bug", "limit"], sentenceLength)[0] || "";
      const digestParts = [
        userIntent ? `user: ${userIntent}` : "",
        assistantFinding ? `assistant: ${assistantFinding}` : "",
        blocker ? `blocker: ${blocker}` : ""
      ].filter(Boolean);

      chunks.push({
        startIndex,
        endIndex: startIndex + chunkMessages.length - 1,
        text: currentLines.join("\n"),
        messages: chunkMessages,
        digest: digestParts.length ? digestParts.join(" | ") : truncateText(chunkMessages[0].text, sentenceLength),
        userCount: chunkMessages.filter((message) => message.role === "user").length,
        assistantCount: chunkMessages.filter((message) => message.role === "assistant").length
      });
    }

    messages.forEach((message, index) => {
      const line = formatMessage(message, index);
      const nextLength = currentLength + line.length + 1;
      if (currentMessages.length && nextLength > chunkChars) {
        flushChunk();
        currentMessages = [];
        currentLines = [];
        currentLength = 0;
        startIndex = index;
      }
      if (!currentMessages.length) {
        startIndex = index;
      }
      currentMessages.push(message);
      currentLines.push(line);
      currentLength += line.length + 1;
    });

    flushChunk();
    return chunks;
  }

  function buildChunkDigestBlock(chunkObjects) {
    if (!chunkObjects.length) {
      return "";
    }

    return [
      "Whole-conversation chunk map:",
      ...chunkObjects.map((chunk, index) => {
        return `- Part ${index + 1}/${chunkObjects.length} (messages ${chunk.startIndex + 1}-${chunk.endIndex + 1}, U:${chunk.userCount}, A:${chunk.assistantCount}): ${chunk.digest}`;
      })
    ].join("\n");
  }

  function buildComprehensiveDigestBlock(chunkObjects) {
    if (!chunkObjects.length) {
      return "";
    }

    const first = chunkObjects[0]?.digest || "";
    const last = chunkObjects[chunkObjects.length - 1]?.digest || "";
    const middle = uniqueItems(
      chunkObjects
        .slice(1, -1)
        .map((chunk) => chunk.digest)
        .filter(Boolean)
    ).slice(0, 4);

    return [
      "Comprehensive whole-chat synthesis:",
      first ? `- Opening context: ${first}` : null,
      ...middle.map((digest, index) => `- Mid-stage context ${index + 1}: ${digest}`),
      last ? `- Latest context: ${last}` : null,
      chunkObjects.length > 1 ? `- Coverage note: This synthesis was built from ${chunkObjects.length} transcript chunks spanning the full conversation, not only the latest messages.` : null
    ].filter(Boolean).join("\n");
  }

  function buildSummary(messages, mode = DEFAULT_SUMMARY_MODE) {
    const config = SUMMARY_MODES[mode] || SUMMARY_MODES[DEFAULT_SUMMARY_MODE];
    const userMessages = messages.filter((message) => message.role === "user");
    const assistantMessages = messages.filter((message) => message.role === "assistant");

    const primaryTask = truncateText(userMessages[0]?.text || userMessages[userMessages.length - 1]?.text || "Unknown task.", config.sentenceLength);
    const currentRequest = truncateText(userMessages[userMessages.length - 1]?.text || "No current user request captured.", config.sentenceLength);
    const latestAssistantState = truncateText(assistantMessages[assistantMessages.length - 1]?.text || "No assistant response captured.", config.sentenceLength);

    const requirementKeywords = ["want", "need", "must", "should", "build", "create", "summary", "context", "continue", "extension", "import", "export", "chrome", "chatgpt", "claude", "fix"];
    const assistantKeywords = ["found", "implemented", "updated", "fixed", "changed", "recommend", "suggest", "issue", "prompt", "summary", "context", "captured", "import", "export", "response"];
    const blockerKeywords = ["error", "failed", "fails", "limit", "stopped", "issue", "problem", "bug", "empty", "ignored", "warning"];
    const decisionKeywords = ["use", "will", "switched", "local", "mode", "preview", "save", "copy", "insert", "download", "chunk"];

    const requirements = pickKeySentences(messages, "user", config.requirements, requirementKeywords, config.sentenceLength);
    const assistantFindings = pickKeySentences(messages, "assistant", config.findings, assistantKeywords, config.sentenceLength);
    const blockers = pickKeySentences(messages, null, config.blockers, blockerKeywords, config.sentenceLength);
    const decisions = pickKeySentences(messages, null, config.decisions, decisionKeywords, config.sentenceLength);
    const timeline = buildTimeline(messages, mode);
    const files = extractFileMentions(messages, Math.max(6, config.decisions));

    return [
      "Task:",
      `- ${primaryTask}`,
      "",
      "Current request:",
      `- ${currentRequest}`,
      "",
      "Conversation arc:",
      toBulletList(timeline, "No timeline captured."),
      "",
      "Key requirements from the user:",
      toBulletList(requirements, "No clear requirements captured."),
      "",
      "Latest assistant response/state:",
      `- ${latestAssistantState}`,
      "",
      "Assistant findings, fixes, or suggestions:",
      toBulletList(assistantFindings, "No assistant-side findings captured."),
      "",
      "Files or code discussed:",
      toBulletList(files, "No specific files or code references detected."),
      "",
      "Errors, blockers, or limits mentioned:",
      toBulletList(blockers, "No major blocker captured."),
      "",
      "Decisions made in the conversation:",
      toBulletList(decisions, "No explicit decision captured."),
      "",
      "Next exact action:",
      "- Continue from the latest user request using both the user's requirements and the previous assistant's latest findings. Ask one short clarifying question only if a critical detail is missing."
    ].join("\n");
  }

  function buildStats(messages) {
    const userMessages = messages.filter((message) => message.role === "user").length;
    const assistantMessages = messages.filter((message) => message.role === "assistant").length;
    const unknownMessages = messages.filter((message) => message.role !== "user" && message.role !== "assistant").length;
    const totalCharacters = messages.reduce((sum, message) => sum + (message.text || "").length, 0);

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      unknownMessages,
      totalCharacters,
      estimatedTranscriptTokens: estimateTokens(messages.map((message) => message.text).join("\n"))
    };
  }

  function buildHandoff(input) {
    const summaryMode = SUMMARY_MODES[input.summaryMode] ? input.summaryMode : DEFAULT_SUMMARY_MODE;
    const seenMessages = new Set();
    const recentKeys = [];
    const messages = (input.messages || []).map((message, index) => ({
      id: message.id || `m_${index + 1}`,
      role: message.role === "assistant" || message.role === "user" ? message.role : "unknown",
      text: cleanMessageText(message.text || "")
    })).filter((message) => {
      if (!message.text) {
        return false;
      }
      const normalized = normalizeText(message.text).toLowerCase();
      const key = `${message.role}:${normalized}`;
      const repeatedRecently = message.text.length > 30 && recentKeys.includes(key);
      if ((message.text.length > 80 && seenMessages.has(key)) || repeatedRecently) {
        return false;
      }
      seenMessages.add(key);
      recentKeys.push(key);
      if (recentKeys.length > 6) {
        recentKeys.shift();
      }
      return true;
    });

    const stats = buildStats(messages);
    const transcriptChunks = buildTranscriptChunks(messages);
    const summary = buildSummary(messages, summaryMode);
    const warnings = [];

    if (!stats.assistantMessages) {
      warnings.push("No assistant messages were detected. Role detection may still be incomplete for this chat.");
    }
    if (transcriptChunks.length > 1) {
      warnings.push(`This conversation is large and will require ${transcriptChunks.length} transcript chunks for full transfer.`);
    }
    if (estimateSizeBytes(messages) > LIMITS.recommendedStorageWarningBytes) {
      warnings.push("The captured conversation is very large. Storage and prompt transfer may be slower than normal.");
    }
    if (input.diagnostics && input.diagnostics.hitStepLimit) {
      warnings.push("The extractor reached its scan limit before it was fully confident the entire chat was loaded.");
    }

    const handoff = {
      schemaVersion: HANDOFF_SCHEMA_VERSION,
      id: input.id || `handoff_${Date.now()}_${hashString(`${input.source || "Claude"}_${stats.totalMessages}_${stats.totalCharacters}`)}`,
      source: input.source || "Claude",
      createdAt: input.createdAt || new Date().toISOString(),
      pageTitle: input.pageTitle || "",
      pageUrl: input.pageUrl || "",
      summaryMode,
      summary,
      messages,
      stats,
      diagnostics: input.diagnostics || {},
      warnings,
      detectedFiles: extractFileMentions(messages, 12)
    };

    return handoff;
  }

  function buildCompactTranscript(messages, maxMessages = 8, maxCharsPerMessage = 180) {
    if (!messages.length) {
      return "";
    }

    const formatLine = (message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${truncateText(message.text, maxCharsPerMessage)}`;
    if (messages.length <= maxMessages) {
      return messages.map(formatLine).join("\n\n");
    }

    const head = messages.slice(0, 2).map(formatLine);
    const tail = messages.slice(-4).map(formatLine);
    const omitted = messages.length - head.length - tail.length;

    return [
      ...head,
      `... ${omitted} earlier messages omitted here but covered in the summary below ...`,
      ...tail
    ].join("\n\n");
  }

  function buildPromptPackage(handoff, options = {}) {
    const summaryMode = SUMMARY_MODES[handoff.summaryMode] ? handoff.summaryMode : DEFAULT_SUMMARY_MODE;
    const config = SUMMARY_MODES[summaryMode];
    const targetProvider = options.targetProvider || null;
    const isClaudeTarget = targetProvider === "claude";
    const transcriptChunkObjects = buildTranscriptChunkObjects(handoff.messages || [], LIMITS.transcriptChunkChars, Math.min(config.sentenceLength, isClaudeTarget ? 110 : 150));
    const transcriptChunks = transcriptChunkObjects.map((chunk) => chunk.text);
    const chunkDigestBlock = buildChunkDigestBlock(transcriptChunkObjects);
    const comprehensiveDigestBlock = buildComprehensiveDigestBlock(transcriptChunkObjects);
    const compactTranscript = buildCompactTranscript(handoff.messages || [], isClaudeTarget ? 6 : 8, isClaudeTarget ? 140 : 180);

    const ackPrefix = [
      "You are receiving a transferred conversation from another model.",
      "Do NOT answer or continue the conversation now.",
      "Reply only with a short acknowledgement that you received the conversation and are ready to proceed.",
      "Example: \"I understand and I'm ready to proceed.\""
    ].join("\n");

    const isAISummary = handoff.summarySource === "Server AI (backend API)" ||
      handoff.summarySource === "Chrome built-in AI" ||
      handoff.summarySource === "Your own API key";

    const conciseSummary = isAISummary
      ? [
          `Source AI: ${handoff.source || "Unknown"}`,
          "",
          "Conversation summary:",
          handoff.summary,
          "",
          "Recent conversation excerpt:",
          compactTranscript,
          "",
          "When you acknowledge, wait for the user's next instruction."
        ].filter(Boolean).join("\n")
      : [
          `Source AI: ${handoff.source || "Unknown"}`,
          "",
          "Conversation summary (automatically extracted):",
          handoff.summary,
          "",
          isClaudeTarget
            ? `Whole-chat synthesis:\n${truncateText(comprehensiveDigestBlock.replace(/^Comprehensive whole-chat synthesis:\n?/, ""), 750)}`
            : comprehensiveDigestBlock,
          !isClaudeTarget && chunkDigestBlock ? `\n${truncateText(chunkDigestBlock, 1600)}` : "",
          "",
          "Recent conversation excerpt:",
          compactTranscript,
          "",
          "When you acknowledge, wait for the user's next instruction."
        ].filter(Boolean).join("\n");

    const singlePrompt = [
      ackPrefix,
      "",
      "Transferred conversation:",
      "",
      conciseSummary
    ].join("\n");

    const starterPrompt = [
      ackPrefix,
      "",
      "Transferred conversation:",
      "",
      conciseSummary,
      "",
      `This conversation is too large for one prompt. I will send ${transcriptChunks.length} transcript chunk(s).`,
      "Reply to each chunk only with: ACK part X/Y.",
      "After the final chunk, acknowledge that you understood the full context and wait for the user's next instruction."
    ].join("\n");

    const chunkPrompts = transcriptChunks.map((chunk, index) => {
      return [
        `Context part ${index + 1}/${transcriptChunks.length}`,
        `Chunk digest: ${transcriptChunkObjects[index]?.digest || "No digest available."}`,
        `Reply only with: ACK part ${index + 1}/${transcriptChunks.length}`,
        "",
        chunk
      ].join("\n");
    });

    const rawJson = JSON.stringify({
      schemaVersion: handoff.schemaVersion,
      id: handoff.id,
      source: handoff.source,
      createdAt: handoff.createdAt,
      pageTitle: handoff.pageTitle,
      pageUrl: handoff.pageUrl,
      summaryMode: handoff.summaryMode,
      summarySource: handoff.summarySource || null,
      summary: handoff.summary,
      warnings: handoff.warnings,
      stats: handoff.stats,
      diagnostics: handoff.diagnostics,
      detectedFiles: handoff.detectedFiles,
      customPrompt: handoff.customPrompt || null,
      messages: handoff.messages
    }, null, 2);

    const singlePromptTokens = estimateTokens(singlePrompt);
    const starterPromptTokens = estimateTokens(starterPrompt);
    const directFits = transcriptChunks.length <= 1 && singlePromptTokens <= LIMITS.maxDirectImportTokens;
    const starterWithFirstChunk = chunkPrompts.length
      ? `${starterPrompt}\n\n${chunkPrompts[0]}`
      : starterPrompt;
    const starterWithFirstChunkFits = estimateTokens(starterWithFirstChunk) <= LIMITS.maxDirectImportTokens;

    const recommendedInsertPrompt = handoff.customPrompt || (directFits
      ? singlePrompt
      : (starterWithFirstChunkFits && !isClaudeTarget ? starterWithFirstChunk : starterPrompt));
    const recommendedAdvance = directFits ? 0 : (starterWithFirstChunkFits && !isClaudeTarget && chunkPrompts.length ? 1 : 0);

    return {
      directFits,
      singlePrompt,
      singlePromptTokens,
      starterPrompt,
      starterPromptTokens,
      starterWithFirstChunk,
      starterWithFirstChunkFits,
      chunkPrompts,
      chunkCount: chunkPrompts.length,
      chunkDigestBlock,
      rawJson,
      recommendedInsertPrompt,
      recommendedAdvance,
      recommendedMode: directFits ? "single" : "staged",
      summaryPreview: truncateText(handoff.summary, LIMITS.maxSummaryPreviewChars)
    };
  }

  function validateHandoff(handoff) {
    if (!handoff || typeof handoff !== "object") {
      return { ok: false, error: "Saved handoff is missing or invalid." };
    }
    if (handoff.schemaVersion !== HANDOFF_SCHEMA_VERSION) {
      return { ok: false, error: `Unsupported handoff schema version: ${handoff.schemaVersion}` };
    }
    if (!Array.isArray(handoff.messages) || !handoff.messages.length) {
      return { ok: false, error: "Saved handoff does not contain any messages." };
    }
    return { ok: true };
  }

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

  function removeStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  async function saveHandoff(handoff) {
    const validation = validateHandoff(handoff);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const { [STORAGE_KEYS.history]: existingHistory = [] } = await getStorage([STORAGE_KEYS.history]);
    const historyEntry = {
      id: handoff.id,
      createdAt: handoff.createdAt,
      source: handoff.source,
      pageTitle: handoff.pageTitle,
      totalMessages: handoff.stats.totalMessages,
      assistantMessages: handoff.stats.assistantMessages,
      summaryMode: handoff.summaryMode
    };
    const nextHistory = [historyEntry, ...existingHistory.filter((item) => item.id !== handoff.id)].slice(0, LIMITS.maxHistoryEntries);

    try {
      await setStorage({
        [STORAGE_KEYS.latest]: handoff,
        [STORAGE_KEYS.history]: nextHistory,
        [STORAGE_KEYS.chunkCursor]: { [handoff.id]: 0 }
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || "Failed to save handoff." };
    }
  }

  async function getHandoff() {
    const result = await getStorage([STORAGE_KEYS.latest]);
    return result[STORAGE_KEYS.latest] || null;
  }

  async function clearHandoff() {
    const current = await getHandoff();
    if (current) {
      const cursors = await getStorage([STORAGE_KEYS.chunkCursor]);
      const nextCursors = { ...(cursors[STORAGE_KEYS.chunkCursor] || {}) };
      delete nextCursors[current.id];
      await setStorage({ [STORAGE_KEYS.chunkCursor]: nextCursors });
    }
    await removeStorage([STORAGE_KEYS.latest]);
  }

  async function getSummaryMode() {
    const result = await getStorage([STORAGE_KEYS.summaryMode]);
    return result[STORAGE_KEYS.summaryMode] || DEFAULT_SUMMARY_MODE;
  }

  async function setSummaryMode(mode) {
    const nextMode = SUMMARY_MODES[mode] ? mode : DEFAULT_SUMMARY_MODE;
    await setStorage({ [STORAGE_KEYS.summaryMode]: nextMode });
    return nextMode;
  }

  async function getChunkCursor(handoffId) {
    const result = await getStorage([STORAGE_KEYS.chunkCursor]);
    const cursors = result[STORAGE_KEYS.chunkCursor] || {};
    return cursors[handoffId] || 0;
  }

  async function setChunkCursor(handoffId, index) {
    const result = await getStorage([STORAGE_KEYS.chunkCursor]);
    const cursors = { ...(result[STORAGE_KEYS.chunkCursor] || {}) };
    cursors[handoffId] = index;
    await setStorage({ [STORAGE_KEYS.chunkCursor]: cursors });
    return index;
  }

  async function resetChunkCursor(handoffId) {
    return setChunkCursor(handoffId, 0);
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
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyNextChunk(handoff) {
    const packageInfo = buildPromptPackage(handoff);
    if (!packageInfo.chunkCount) {
      return { ok: false, error: "This handoff does not require transcript chunks." };
    }

    const currentIndex = await getChunkCursor(handoff.id);
    if (currentIndex >= packageInfo.chunkCount) {
      return { ok: false, error: "All transcript chunks have already been copied." };
    }

    const copied = await copyText(packageInfo.chunkPrompts[currentIndex]);
    if (!copied) {
      return { ok: false, error: "Failed to copy the next transcript chunk." };
    }

    await setChunkCursor(handoff.id, currentIndex + 1);
    return {
      ok: true,
      index: currentIndex,
      nextIndex: currentIndex + 1,
      total: packageInfo.chunkCount,
      text: packageInfo.chunkPrompts[currentIndex]
    };
  }

  window.ContinueItShared = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    STORAGE_KEYS,
    DEFAULT_SUMMARY_MODE,
    SUMMARY_MODES,
    LIMITS,
    wait,
    normalizeText,
    cleanMessageText,
    truncateText,
    estimateTokens,
    estimateSizeBytes,
    hashString,
    formatMessage,
    extractFileMentions,
    buildSummary,
    buildHandoff,
    buildPromptPackage,
    validateHandoff,
    saveHandoff,
    getHandoff,
    clearHandoff,
    getSummaryMode,
    setSummaryMode,
    getChunkCursor,
    setChunkCursor,
    resetChunkCursor,
    copyNextChunk,
    copyText,
    downloadTextFile
  };
})();
