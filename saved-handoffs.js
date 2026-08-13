const shared = window.ContinueItShared;
const ai = window.ContinueItAI;
const emptyStateEl = document.getElementById("emptyState");
const handoffListEl = document.getElementById("handoffList");
const summaryModeEl = document.getElementById("summaryMode");
const aiModeRadios = Array.from(document.querySelectorAll('input[name="aiMode"]'));
const builtinSettingsEl = document.getElementById("builtinSettings");
const serverSettingsEl = document.getElementById("serverSettings");
const serverUrlEl = document.getElementById("serverUrl");
const quotaInfoEl = document.getElementById("quotaInfo");
const byokSettingsEl = document.getElementById("byokSettings");
const providerSelectEl = document.getElementById("providerSelect");
const providerNoteEl = document.getElementById("providerNote");
const providerKeyLinkEl = document.getElementById("providerKeyLink");
const providerModelsLinkEl = document.getElementById("providerModelsLink");
const byokBaseUrlEl = document.getElementById("byokBaseUrl");
const byokModelEl = document.getElementById("byokModel");
const byokApiKeyEl = document.getElementById("byokApiKey");
const testStatusEl = document.getElementById("testStatus");
const testBuiltInButton = document.getElementById("testBuiltIn");
const testAiButton = document.getElementById("testAi");
const saveAiButton = document.getElementById("saveAi");
const saveAiFeedbackEl = document.getElementById("saveAiFeedback");
let artifactsBySessionId = new Map();

const REGENERATE_MODES = [
  { value: "none", label: "No AI (local)" },
  { value: "builtin", label: "Chrome built-in AI" },
  { value: "server", label: "Server AI" },
  { value: "byok", label: "Custom API key" }
];
const BUILTIN_HELP_PAGE = "builtin-ai-help.html";
let saveFeedbackTimer = null;
let testTicker = null;

function selectedAiMode() {
  const checked = aiModeRadios.find((radio) => radio.checked);
  return checked ? checked.value : ai.DEFAULT_MODE;
}

function updateModeVisibility() {
  const mode = selectedAiMode();
  builtinSettingsEl.hidden = mode !== ai.AI_MODES.builtin;
  serverSettingsEl.hidden = mode !== ai.AI_MODES.server;
  byokSettingsEl.hidden = mode !== ai.AI_MODES.byok;
}

function showSaveFeedback(message, type = "success") {
  if (saveFeedbackTimer) clearTimeout(saveFeedbackTimer);
  saveAiFeedbackEl.textContent = message;
  saveAiFeedbackEl.className = `save-feedback visible ${type}`;
  saveFeedbackTimer = setTimeout(() => {
    saveAiFeedbackEl.classList.remove("visible");
  }, 4000);
}

function renderQuota(quota) {
  if (!quota) {
    quotaInfoEl.textContent = "Use a hosted backend or run your own local backend with a provider key in .env.";
    quotaInfoEl.className = "hint";
    return;
  }
  const resetText = quota.resetAt ? ` Resets ${new Date(quota.resetAt).toLocaleString()}.` : "";
  quotaInfoEl.textContent = `${quota.remaining} of ${quota.limit} free server exports left.${resetText}`;
  quotaInfoEl.className = quota.remaining <= 0 ? "hint quota-empty" : quota.remaining <= 1 ? "hint quota-low" : "hint";
}

function populateProviders(selectedId) {
  providerSelectEl.innerHTML = "";
  ai.PROVIDER_PRESETS.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    providerSelectEl.appendChild(option);
  });
  providerSelectEl.value = selectedId || ai.PROVIDER_PRESETS[0].id;
}

function applyProviderPreset(presetId, { overwriteFields }) {
  const preset = ai.findPreset(presetId);
  if (!preset) {
    return;
  }
  providerNoteEl.textContent = preset.note || "";
  if (preset.keyUrl) {
    providerKeyLinkEl.href = preset.keyUrl;
    providerKeyLinkEl.hidden = false;
  } else {
    providerKeyLinkEl.hidden = true;
  }
  if (preset.modelUrl) {
    providerModelsLinkEl.href = preset.modelUrl;
    providerModelsLinkEl.hidden = false;
  } else {
    providerModelsLinkEl.hidden = true;
  }
  if (overwriteFields && preset.id !== "custom") {
    byokBaseUrlEl.value = preset.baseUrl;
    byokModelEl.value = preset.model;
  }
}

function stopTestTicker() {
  if (testTicker) {
    clearInterval(testTicker);
    testTicker = null;
  }
  testBuiltInButton.disabled = false;
  testAiButton.disabled = false;
}

function shouldLinkBuiltInHelp(message) {
  return /Chrome built-in AI|LanguageModel|Gemini Nano|Prompt API/i.test(message || "");
}

function appendBuiltInHelpLink(container) {
  const link = document.createElement("a");
  link.className = "link";
  link.href = chrome.runtime.getURL(BUILTIN_HELP_PAGE);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open setup checks";
  container.appendChild(document.createTextNode(" "));
  container.appendChild(link);
}

function setTestStatus(message, state, options = {}) {
  stopTestTicker();
  testStatusEl.textContent = "";
  testStatusEl.className = "test-status" + (state ? ` ${state}` : "");
  testStatusEl.hidden = !message;
  if (!message) {
    return;
  }
  testStatusEl.appendChild(document.createTextNode(message));
  if (options.builtInHelp || (state === "error" && shouldLinkBuiltInHelp(message))) {
    appendBuiltInHelpLink(testStatusEl);
  }
}

function startTestStatus(message) {
  stopTestTicker();
  const startedAt = Date.now();
  testBuiltInButton.disabled = true;
  testAiButton.disabled = true;
  testStatusEl.className = "test-status pending";
  testStatusEl.hidden = false;

  function paint() {
    const elapsedMs = Date.now() - startedAt;
    const dots = ".".repeat(1 + (Math.floor(elapsedMs / 400) % 3));
    const seconds = Math.round(elapsedMs / 1000);
    testStatusEl.textContent = `${message}${dots}${seconds >= 2 ? ` (${seconds}s)` : ""}`;
  }

  paint();
  testTicker = setInterval(paint, 400);
}

function statusClassForBuiltInStatus(status) {
  if (!status) {
    return "";
  }
  if (status.state === "ready") {
    return "ok";
  }
  if (status.state === "error" || status.state === "expired") {
    return "error";
  }
  return "pending";
}

function describeBuiltInStatus(status) {
  if (!status || status.provider !== ai.AI_MODES.builtin) {
    return null;
  }
  if (status.state === "downloading") {
    return status.percent === null || status.percent === undefined
      ? "Downloading Chrome built-in AI model..."
      : `Downloading Chrome built-in AI model: ${status.percent}%.`;
  }
  if (status.state === "checking") {
    return "Checking Chrome built-in AI availability...";
  }
  if (status.state === "preparing") {
    return "Preparing Chrome built-in AI model...";
  }
  if (status.state === "ready") {
    return "Chrome built-in AI is ready.";
  }
  if (status.state === "expired") {
    return status.error || "Chrome built-in AI prewarm expired before it was used.";
  }
  if (status.state === "error") {
    return `Chrome built-in AI is not ready: ${status.error || "unknown error"}`;
  }
  return null;
}

function renderBuiltInStatus(status) {
  if (selectedAiMode() !== ai.AI_MODES.builtin) {
    return;
  }
  const message = describeBuiltInStatus(status);
  if (!message) {
    return;
  }
  setTestStatus(message, statusClassForBuiltInStatus(status));
}

async function persistByok() {
  await ai.saveSettings({
    mode: ai.AI_MODES.byok,
    byok: {
      provider: providerSelectEl.value,
      baseUrl: byokBaseUrlEl.value.trim(),
      model: byokModelEl.value.trim(),
      apiKey: byokApiKeyEl.value.trim()
    }
  });
}

async function loadArchiveSettings() {
  summaryModeEl.value = await shared.getSummaryMode();
  const settings = await ai.getSettings();
  aiModeRadios.forEach((radio) => {
    radio.checked = radio.value === settings.mode;
  });
  serverUrlEl.value = settings.serverUrl || ai.DEFAULT_SERVER_URL;
  populateProviders(settings.byok.provider);
  byokBaseUrlEl.value = settings.byok.baseUrl || "";
  byokModelEl.value = settings.byok.model || "";
  byokApiKeyEl.value = settings.byok.apiKey || "";
  applyProviderPreset(settings.byok.provider, { overwriteFields: false });
  if (!byokBaseUrlEl.value && !byokModelEl.value) {
    applyProviderPreset(settings.byok.provider, { overwriteFields: true });
  }
  updateModeVisibility();
  renderQuota(settings.mode === ai.AI_MODES.server ? settings.lastQuota : null);
  if (settings.mode === ai.AI_MODES.builtin) {
    renderBuiltInStatus(await ai.getBuiltInStatus());
  }
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function titleFor(session) {
  return session.pageTitle || `${session.source || "Unknown source"} session`;
}

function summaryFor(handoff) {
  if (handoff?.summary) {
    return shared.truncateText(handoff.summary, 800);
  }
  return "Summary content is not available for this history entry.";
}

function summarySourceForMode(mode) {
  if (mode === "builtin") return "Chrome built-in AI";
  if (mode === "server") return "Server AI (backend API)";
  if (mode === "byok") return "Your own API key";
  return "Local (no AI)";
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function createRegeneratedHandoffId(sessionId, mode) {
  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${sessionId}_${mode}_${suffix}`;
}

function setStatus(root, message, state = "") {
  const status = root.querySelector(".status");
  status.textContent = message;
  status.className = `status ${state}`;
}

function addMetaItem(meta, text) {
  const item = document.createElement("span");
  item.textContent = text;
  meta.appendChild(item);
  return item;
}

function addButton(actions, label, className, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className || "";
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  actions.appendChild(button);
  return button;
}

function setRegenerationProgress(root, percent, label, { hidden = false } = {}) {
  const progress = root.querySelector(".regeneration-progress");
  if (!progress) {
    return;
  }
  const bar = progress.querySelector(".progress-bar");
  const text = progress.querySelector(".progress-label");
  progress.hidden = hidden;
  bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  text.textContent = label || "";
}

function downloadSessionJson(session, root) {
  const handoffs = fullHandoffsFor(session);
  if (!handoffs.length) {
    setStatus(root, "No full handoff content is available for this session.", "error");
    return;
  }
  const payload = {
    session: {
      id: session.id,
      source: session.source,
      pageTitle: session.pageTitle,
      pageUrl: session.pageUrl,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totalMessages: session.totalMessages,
      assistantMessages: session.assistantMessages
    },
    handoffs: handoffs.map((handoff) => JSON.parse(shared.buildPromptPackage(handoff).rawJson))
  };
  shared.downloadTextFile(`${session.id}.json`, JSON.stringify(payload, null, 2));
  setStatus(root, "Session JSON downloaded.", "ok");
}

function downloadArtifact(artifact, root) {
  if (!artifact?.content) {
    setStatus(root, "Stored file content is not available.", "error");
    return;
  }
  shared.downloadTextFile(artifact.fileName || `${artifact.id}.txt`, artifact.content, artifact.mimeType || "text/plain;charset=utf-8");
  setStatus(root, `Downloaded ${artifact.title || artifact.fileName || "stored file"}.`, "ok");
}

function fullHandoffsFor(session) {
  return session.variants.map((variant) => variant.handoff).filter(Boolean);
}

function baseHandoffFor(session) {
  const full = fullHandoffsFor(session);
  return full[full.length - 1] || null;
}

async function ensurePermissionForMode(mode) {
  const settings = await ai.getSettings();
  if (mode === ai.AI_MODES.server) {
    return ai.requestOriginPermission(settings.serverUrl || ai.DEFAULT_SERVER_URL);
  }
  if (mode === ai.AI_MODES.byok) {
    if (!settings.byok.baseUrl || !settings.byok.model || !settings.byok.apiKey) {
      return false;
    }
    return ai.requestOriginPermission(settings.byok.baseUrl);
  }
  return true;
}

async function regenerateSession(session, mode, statusRoot, triggerButton) {
  const base = baseHandoffFor(session);
  if (!base) {
    setStatus(statusRoot, "This session has no full transcript to regenerate from.", "error");
    return;
  }

  triggerButton.disabled = true;
  setRegenerationProgress(statusRoot, 8, "Starting regeneration...");
  setStatus(statusRoot, `Regenerating with ${REGENERATE_MODES.find((item) => item.value === mode)?.label || mode}...`, "pending");

  try {
    setRegenerationProgress(statusRoot, 18, "Checking endpoint permissions...");
    const hasPermission = await ensurePermissionForMode(mode);
    if (!hasPermission) {
      setRegenerationProgress(statusRoot, 100, "Permission or settings check failed.");
      setStatus(statusRoot, "Required AI endpoint permission or API settings are missing.", "error");
      return;
    }

    const summaryMode = summaryModeEl.value || base.summaryMode || shared.DEFAULT_SUMMARY_MODE;
    setRegenerationProgress(statusRoot, 32, "Preparing transcript summary...");
    let summary = shared.buildSummary(base.messages || [], summaryMode);
    const warnings = [...(base.warnings || [])];
    if (mode !== ai.AI_MODES.none) {
      setRegenerationProgress(statusRoot, 48, "Waiting for AI summary response...");
      const result = await ai.summarizeConversationWithMode({
        aiMode: mode,
        source: base.source,
        messages: base.messages,
        mode: summaryMode,
        shared
      });
      if (!result.summary) {
        setRegenerationProgress(statusRoot, 100, "AI summary failed.");
        setStatus(statusRoot, result.error || "The selected AI setting did not return a summary.", "error");
        return;
      }
      summary = result.summary;
      (result.warnings || []).forEach((warning) => warnings.push(warning));
      if (result.quota) {
        await ai.saveLastQuota(result.quota);
      }
    }

    setRegenerationProgress(statusRoot, 72, "Building regenerated handoff...");
    const generatedAt = new Date().toISOString();
    const nextHandoff = {
      ...base,
      id: createRegeneratedHandoffId(session.id, mode),
      sessionId: session.id,
      regeneratedFromId: base.id || null,
      createdAt: generatedAt,
      summary,
      summarySource: summarySourceForMode(mode),
      summaryMode,
      aiMode: mode,
      warnings,
      customPrompt: null
    };

    setRegenerationProgress(statusRoot, 86, "Saving regenerated handoff...");
    const saveResult = await shared.saveHandoff(nextHandoff);
    if (!saveResult.ok) {
      setRegenerationProgress(statusRoot, 100, "Save failed.");
      setStatus(statusRoot, saveResult.error || "Failed to save regenerated handoff.", "error");
      return;
    }

    setRegenerationProgress(statusRoot, 100, "Regenerated handoff saved.");
    setStatus(statusRoot, "Regenerated handoff saved.", "ok");
    await renderSavedHandoffs();
  } finally {
    triggerButton.disabled = false;
  }
}

function renderSessionLink(session, meta) {
  if (!session.pageUrl) {
    addMetaItem(meta, "No session URL");
    return;
  }

  const link = document.createElement("a");
  link.href = session.pageUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open session URL";
  meta.appendChild(link);
}

function renderVariant(variant, index = 0) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const body = document.createElement("div");
  const meta = document.createElement("p");
  const actions = document.createElement("div");
  const status = document.createElement("p");
  const handoff = variant.handoff;
  const packageInfo = handoff ? shared.buildPromptPackage(handoff) : null;
  const usesStagedChunks = Boolean(packageInfo && packageInfo.recommendedMode === "staged" && packageInfo.chunkCount > 1);

  details.className = "variant-card";
  details.open = index === 0;
  body.className = "variant-body";
  meta.className = "handoff-meta";
  actions.className = "actions";
  status.className = "status";

  summary.textContent = `${variant.aiLabel || variant.summarySource} - ${formatDate(variant.createdAt)}`;
  addMetaItem(meta, variant.summaryMode || shared.DEFAULT_SUMMARY_MODE);
  addMetaItem(meta, variant.summarySource || "Unknown summary source");
  addMetaItem(meta, handoff ? `${handoff.stats?.totalMessages || 0} messages` : "metadata only");

  addButton(actions, "Copy prompt", "", async () => {
    if (!handoff) {
      setStatus(details, "Full handoff content is not available for this entry.", "error");
      return;
    }
    const copied = await shared.copyText(packageInfo.recommendedInsertPrompt);
    setStatus(details, copied ? "Recommended prompt copied." : "Failed to copy prompt.", copied ? "ok" : "error");
  }, !handoff);

  body.appendChild(meta);
  if (handoff) {
    const promptDetails = document.createElement("details");
    const promptSummary = document.createElement("summary");
    const promptTextarea = document.createElement("textarea");

    promptDetails.className = "prompt-details";
    promptDetails.open = true;
    promptSummary.textContent = "View full handoff prompt";
    promptTextarea.className = "prompt-preview";
    promptTextarea.readOnly = true;
    promptTextarea.value = packageInfo.recommendedInsertPrompt;

    promptDetails.appendChild(promptSummary);
    promptDetails.appendChild(promptTextarea);
    body.appendChild(promptDetails);

    if (usesStagedChunks) {
      const chunkSection = document.createElement("section");
      const chunkNote = document.createElement("p");
      const chunkHeading = document.createElement("h3");
      const firstPromptDetails = document.createElement("details");
      const firstPromptSummary = document.createElement("summary");
      const firstPromptTextarea = document.createElement("textarea");
      const firstPromptActions = document.createElement("div");

      chunkSection.className = "chunk-section";
      chunkNote.className = "chunk-note";
      chunkNote.textContent = `Chunks are only needed when the full transcript is too large for one target chat. The first prompt gives the receiving AI the summary and starts the transfer; then send ${packageInfo.chunkCount} transcript chunks in order if you need the complete raw transcript too.`;
      chunkHeading.textContent = "Transcript chunk prompts";
      firstPromptDetails.className = "chunk-details first-prompt-details";
      firstPromptSummary.textContent = "First prompt: summary and transfer setup";
      firstPromptTextarea.className = "prompt-preview chunk-preview";
      firstPromptTextarea.readOnly = true;
      firstPromptTextarea.value = packageInfo.starterPrompt;
      firstPromptActions.className = "actions";

      addButton(firstPromptActions, "Copy prompt", "secondary", async () => {
        const copied = await shared.copyText(packageInfo.starterPrompt);
        setStatus(details, copied ? "First prompt copied." : "Failed to copy first prompt.", copied ? "ok" : "error");
      });

      firstPromptDetails.appendChild(firstPromptSummary);
      firstPromptDetails.appendChild(firstPromptTextarea);
      firstPromptDetails.appendChild(firstPromptActions);
      chunkSection.appendChild(chunkNote);
      chunkSection.appendChild(chunkHeading);
      chunkSection.appendChild(firstPromptDetails);

      packageInfo.chunkPrompts.forEach((chunkPrompt, index) => {
        const chunkDetails = document.createElement("details");
        const chunkSummary = document.createElement("summary");
        const chunkTextarea = document.createElement("textarea");
        const chunkActions = document.createElement("div");

        chunkDetails.className = "chunk-details";
        chunkSummary.textContent = `Transcript chunk ${index + 1}/${packageInfo.chunkCount}`;
        chunkTextarea.className = "prompt-preview chunk-preview";
        chunkTextarea.readOnly = true;
        chunkTextarea.value = chunkPrompt;
        chunkActions.className = "actions";

        addButton(chunkActions, "Copy prompt", "secondary", async () => {
          const copied = await shared.copyText(chunkPrompt);
          setStatus(details, copied ? `Transcript chunk ${index + 1}/${packageInfo.chunkCount} copied.` : "Failed to copy transcript chunk.", copied ? "ok" : "error");
        });

        chunkDetails.appendChild(chunkSummary);
        chunkDetails.appendChild(chunkTextarea);
        chunkDetails.appendChild(chunkActions);
        chunkSection.appendChild(chunkDetails);
      });

      body.appendChild(chunkSection);
    }
  } else {
    const summaryText = document.createElement("p");
    summaryText.className = "summary-text";
    summaryText.textContent = summaryFor(handoff);
    body.appendChild(summaryText);
  }
  body.appendChild(actions);
  body.appendChild(status);
  details.appendChild(summary);
  details.appendChild(body);
  return details;
}

function renderRegenerateControls(session, details) {
  const panel = document.createElement("section");
  const textGroup = document.createElement("div");
  const controls = document.createElement("div");
  const label = document.createElement("label");
  const note = document.createElement("p");
  const select = document.createElement("select");
  const progress = document.createElement("div");
  const progressTrack = document.createElement("div");
  const progressBar = document.createElement("span");
  const progressLabel = document.createElement("span");
  const status = document.createElement("p");
  const actions = document.createElement("div");

  panel.className = "regenerate-panel";
  textGroup.className = "regenerate-copy";
  controls.className = "regenerate-controls";
  label.className = "field-label";
  label.textContent = "Regenerate this session with";
  note.className = "regenerate-note";
  note.textContent = "Regenerate a new handoff variant from the same captured transcript using another AI setting.";
  progress.className = "regeneration-progress";
  progress.hidden = true;
  progressTrack.className = "progress-track";
  progressBar.className = "progress-bar";
  progressLabel.className = "progress-label";
  status.className = "status";
  actions.className = "actions";
  select.className = "regenerate-mode-select";

  REGENERATE_MODES.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode.value;
    option.textContent = mode.label;
    select.appendChild(option);
  });
  select.value = selectedAiMode();

  const button = addButton(actions, "Regenerate handoff", "", () => {
    regenerateSession(session, select.value, panel, button);
  }, !baseHandoffFor(session));

  textGroup.appendChild(label);
  textGroup.appendChild(note);
  controls.appendChild(select);
  controls.appendChild(actions);
  progressTrack.appendChild(progressBar);
  progress.appendChild(progressTrack);
  progress.appendChild(progressLabel);
  panel.appendChild(textGroup);
  panel.appendChild(controls);
  panel.appendChild(progress);
  panel.appendChild(status);
  details.appendChild(panel);
}

function renderSessionArtifacts(session, root) {
  const artifacts = artifactsBySessionId.get(session.id) || [];
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const list = document.createElement("div");

  details.className = "artifact-section";
  summary.textContent = `Stored files (${artifacts.length})`;
  list.className = "artifact-list";
  details.appendChild(summary);
  details.appendChild(list);

  if (!artifacts.length) {
    const empty = document.createElement("p");
    empty.className = "artifact-empty";
    empty.textContent = "No generated files are stored for this session yet. Regenerate or save a new handoff to populate this section.";
    list.appendChild(empty);
    return details;
  }

  artifacts.forEach((artifact) => {
    const row = document.createElement("div");
    const info = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const actions = document.createElement("div");

    row.className = "artifact-row";
    info.className = "artifact-info";
    actions.className = "artifact-actions";
    title.textContent = artifact.title || artifact.fileName || artifact.kind || "Stored file";
    meta.textContent = `${artifact.fileName || artifact.id} | ${artifact.kind || "file"} | ${formatBytes(artifact.sizeBytes)}`;

    addButton(actions, "Download", "secondary", () => downloadArtifact(artifact, root));

    info.appendChild(title);
    info.appendChild(meta);
    row.appendChild(info);
    row.appendChild(actions);
    list.appendChild(row);
  });

  return details;
}

function renderSession(session, index) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const summaryBody = document.createElement("div");
  const title = document.createElement("span");
  const badge = document.createElement("span");
  const body = document.createElement("div");
  const sessionMetaRow = document.createElement("div");
  const meta = document.createElement("p");
  const sessionActions = document.createElement("div");
  const sessionStatus = document.createElement("p");
  const variants = document.createElement("div");

  details.className = "session-card";
  details.open = index === 0;
  body.className = "session-body";
  summaryBody.className = "session-summary";
  title.className = "session-title";
  badge.className = "badge full";
  sessionMetaRow.className = "session-meta-row";
  meta.className = "handoff-meta";
  sessionActions.className = "session-actions";
  sessionStatus.className = "status";
  variants.className = "variant-list";

  title.textContent = titleFor(session);
  badge.textContent = `${session.variants.length} handoff${session.variants.length === 1 ? "" : "s"}`;

  summaryBody.appendChild(title);
  summaryBody.appendChild(badge);
  summary.appendChild(summaryBody);

  addMetaItem(meta, session.source || "Unknown source");
  addMetaItem(meta, `Updated ${formatDate(session.updatedAt)}`);
  addMetaItem(meta, `${session.totalMessages || 0} messages`);
  addMetaItem(meta, `${session.assistantMessages || 0} assistant replies`);
  renderSessionLink(session, meta);

  addButton(sessionActions, "Download JSON", "secondary", () => downloadSessionJson(session, details), !fullHandoffsFor(session).length);
  sessionMetaRow.appendChild(meta);
  sessionMetaRow.appendChild(sessionActions);

  session.variants.forEach((variant, variantIndex) => variants.appendChild(renderVariant(variant, variantIndex)));

  body.appendChild(sessionMetaRow);
  body.appendChild(sessionStatus);
  renderRegenerateControls(session, body);
  body.appendChild(renderSessionArtifacts(session, details));
  body.appendChild(variants);
  details.appendChild(summary);
  details.appendChild(body);
  handoffListEl.appendChild(details);
}

async function renderSavedHandoffs() {
  const [sessions, artifacts] = await Promise.all([
    shared.getSavedHandoffSessions(),
    shared.getSavedArtifacts()
  ]);
  artifactsBySessionId = artifacts.reduce((map, artifact) => {
    const items = map.get(artifact.sessionId) || [];
    items.push(artifact);
    map.set(artifact.sessionId, items);
    return map;
  }, new Map());
  emptyStateEl.hidden = sessions.length > 0;
  handoffListEl.textContent = "";
  sessions.forEach(renderSession);
}

summaryModeEl.addEventListener("change", async () => {
  await shared.setSummaryMode(summaryModeEl.value);
  showSaveFeedback("Default export mode saved.");
});

aiModeRadios.forEach((radio) => {
  radio.addEventListener("change", async () => {
    updateModeVisibility();
    await ai.saveSettings({ mode: selectedAiMode() });
    document.querySelectorAll(".regenerate-mode-select").forEach((select) => {
      select.value = selectedAiMode();
    });
    if (selectedAiMode() === ai.AI_MODES.none) {
      showSaveFeedback("Using local summaries.");
    } else if (selectedAiMode() === ai.AI_MODES.builtin) {
      showSaveFeedback("Using Chrome built-in AI when available.");
      renderBuiltInStatus(await ai.getBuiltInStatus());
    } else {
      showSaveFeedback("Fill in the settings, then save AI settings.", "warning");
    }
  });
});

providerSelectEl.addEventListener("change", () => {
  applyProviderPreset(providerSelectEl.value, { overwriteFields: true });
});

saveAiButton.addEventListener("click", async () => {
  const mode = selectedAiMode();

  if (mode === ai.AI_MODES.none) {
    await ai.saveSettings({ mode });
    showSaveFeedback("Saved. Using local summaries.");
    return;
  }

  if (mode === ai.AI_MODES.builtin) {
    await ai.saveSettings({ mode });
    showSaveFeedback("Saved. Preparing Chrome built-in AI.");
    startTestStatus("Preparing Chrome built-in AI");
    const result = await ai.prewarmBuiltInModel();
    setTestStatus(
      result && result.ok
        ? "Chrome built-in AI is ready."
        : `Chrome built-in AI is not ready: ${result ? result.error : "no response"}`,
      result && result.ok ? "ok" : "error",
      { builtInHelp: !(result && result.ok) }
    );
    showSaveFeedback(
      result && result.ok
        ? "Saved. Chrome built-in AI is ready."
        : `Saved, but Chrome built-in AI is not ready: ${result ? result.error : "no response"}`,
      result && result.ok ? "success" : "warning"
    );
    return;
  }

  if (mode === ai.AI_MODES.server) {
    const serverUrl = serverUrlEl.value.trim() || ai.DEFAULT_SERVER_URL;
    await ai.saveSettings({ mode, serverUrl });
    const granted = await ai.requestOriginPermission(serverUrl);
    showSaveFeedback(
      granted
        ? "Saved. Server AI enabled for the configured backend."
        : "Saved, but server permission was not granted.",
      granted ? "success" : "warning"
    );
    await loadArchiveSettings();
    return;
  }

  const baseUrl = byokBaseUrlEl.value.trim();
  const model = byokModelEl.value.trim();
  const apiKey = byokApiKeyEl.value.trim();
  if (!baseUrl || !model || !apiKey) {
    showSaveFeedback("Enter a base URL, model, and API key first.", "warning");
    return;
  }
  await persistByok();
  const granted = await ai.requestOriginPermission(baseUrl);
  showSaveFeedback(
    granted
      ? "Saved. API key summaries are enabled."
      : `Saved, but access to ${baseUrl} was not granted.`,
    granted ? "success" : "warning"
  );
});

testBuiltInButton.addEventListener("click", async () => {
  try {
    await ai.saveSettings({ mode: ai.AI_MODES.builtin });
    aiModeRadios.forEach((radio) => {
      radio.checked = radio.value === ai.AI_MODES.builtin;
    });
    updateModeVisibility();
    startTestStatus("Testing Chrome built-in AI");
    const result = await ai.testConnection();
    setTestStatus(
      result && result.ok
        ? "Chrome built-in AI is ready."
        : `Test failed: ${result ? result.error : "no response"}`,
      result && result.ok ? "ok" : "error",
      { builtInHelp: !(result && result.ok) }
    );
  } catch (error) {
    setTestStatus(`Test failed: ${error?.message || String(error)}`, "error", { builtInHelp: true });
  }
});

testAiButton.addEventListener("click", async () => {
  try {
    const mode = selectedAiMode();
    if (mode === ai.AI_MODES.byok) {
      const baseUrl = byokBaseUrlEl.value.trim();
      if (!baseUrl || !byokModelEl.value.trim() || !byokApiKeyEl.value.trim()) {
        setTestStatus("Enter a base URL, model, and API key first.", "error");
        return;
      }
      await persistByok();
      const granted = await ai.requestOriginPermission(baseUrl);
      if (!granted) {
        setTestStatus(`Access to ${baseUrl} was not granted. Allow it to test.`, "error");
        return;
      }
    }
    startTestStatus("Testing connection");
    const result = await ai.testConnection();
    setTestStatus(
      result && result.ok ? "Connection works. AI summaries are ready." : `Test failed: ${result ? result.error : "no response"}`,
      result && result.ok ? "ok" : "error"
    );
  } catch (error) {
    setTestStatus(`Test failed: ${error?.message || String(error)}`, "error");
  }
});

window.addEventListener("continueIt:builtinStatus", (event) => {
  renderBuiltInStatus(event.detail || null);
});

void (async () => {
  await loadArchiveSettings();
  await renderSavedHandoffs();
})();
