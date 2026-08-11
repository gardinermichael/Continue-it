const shared = window.ContinueItShared;
const ai = window.ContinueItAI;

const sourceEl = document.getElementById("source");
const capturedAtEl = document.getElementById("capturedAt");
const lastModeEl = document.getElementById("lastMode");
const summarySourceEl = document.getElementById("summarySource");
const messageCountEl = document.getElementById("messageCount");
const assistantCountEl = document.getElementById("assistantCount");
const chunkProgressEl = document.getElementById("chunkProgress");
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
const byokBaseUrlEl = document.getElementById("byokBaseUrl");
const byokModelEl = document.getElementById("byokModel");
const byokApiKeyEl = document.getElementById("byokApiKey");
const testStatusEl = document.getElementById("testStatus");
const testBuiltInButton = document.getElementById("testBuiltIn");
const testAiButton = document.getElementById("testAi");
const saveAiButton = document.getElementById("saveAi");

const summaryPreviewEl = document.getElementById("summaryPreview");
const promptPreviewEl = document.getElementById("promptPreview");
const copyRecommendedButton = document.getElementById("copyRecommended");
const copyNextChunkButton = document.getElementById("copyNextChunk");
const resetChunksButton = document.getElementById("resetChunks");
const downloadJsonButton = document.getElementById("downloadJson");
const clearSavedButton = document.getElementById("clearSaved");
const statusEl = document.getElementById("status");
const saveAiFeedbackEl = document.getElementById("saveAiFeedback");

let saveFeedbackTimer = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function showSaveFeedback(message, type = "success") {
  if (saveFeedbackTimer) clearTimeout(saveFeedbackTimer);
  saveAiFeedbackEl.textContent = message;
  saveAiFeedbackEl.className = `save-feedback visible ${type}`;
  saveFeedbackTimer = setTimeout(() => {
    saveAiFeedbackEl.classList.remove("visible");
  }, 4000);
}

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
  if (overwriteFields && preset.id !== "custom") {
    byokBaseUrlEl.value = preset.baseUrl;
    byokModelEl.value = preset.model;
  }
}

async function loadAiSettings() {
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
  // If the user has never configured BYO, seed sensible defaults from the preset.
  if (!byokBaseUrlEl.value && !byokModelEl.value) {
    applyProviderPreset(settings.byok.provider, { overwriteFields: true });
  }
  updateModeVisibility();
  renderQuota(settings.mode === ai.AI_MODES.server ? settings.lastQuota : null);
}

async function renderPopup() {
  summaryModeEl.value = await shared.getSummaryMode();
  await loadAiSettings();
  const handoff = await shared.getHandoff();
  if (!handoff) {
    sourceEl.textContent = "None";
    capturedAtEl.textContent = "Nothing saved";
    lastModeEl.textContent = "-";
    summarySourceEl.textContent = "-";
    messageCountEl.textContent = "0";
    assistantCountEl.textContent = "0";
    chunkProgressEl.textContent = "0/0";
    summaryPreviewEl.value = "";
    promptPreviewEl.value = "";
    copyRecommendedButton.disabled = true;
    copyNextChunkButton.disabled = true;
    resetChunksButton.disabled = true;
    downloadJsonButton.disabled = true;
    clearSavedButton.disabled = true;
    return;
  }

  const packageInfo = shared.buildPromptPackage(handoff);
  const chunkCursor = await shared.getChunkCursor(handoff.id);

  sourceEl.textContent = handoff.source || "Unknown";
  capturedAtEl.textContent = new Date(handoff.createdAt).toLocaleString();
  lastModeEl.textContent = handoff.summaryMode || shared.DEFAULT_SUMMARY_MODE;
  summarySourceEl.textContent = handoff.summarySource || "Local (no AI)";
  messageCountEl.textContent = String(handoff.stats.totalMessages || 0);
  assistantCountEl.textContent = String(handoff.stats.assistantMessages || 0);
  chunkProgressEl.textContent = packageInfo.chunkCount ? `${Math.min(chunkCursor, packageInfo.chunkCount)}/${packageInfo.chunkCount}` : "0/0";
  summaryPreviewEl.value = handoff.summary || "";
  promptPreviewEl.value = packageInfo.recommendedInsertPrompt || "";

  const hasSummaryText = summaryPreviewEl.value.trim().length > 0;
  const hasPromptText = promptPreviewEl.value.trim().length > 0;
  const hasPreviewText = hasSummaryText || hasPromptText;

  copyRecommendedButton.disabled = !hasPromptText;
  copyNextChunkButton.disabled = packageInfo.chunkCount === 0 || !hasPreviewText;
  resetChunksButton.disabled = packageInfo.chunkCount === 0 || !hasPreviewText;
  downloadJsonButton.disabled = !hasPreviewText;
  clearSavedButton.disabled = !hasPreviewText;
}

summaryModeEl.addEventListener("change", async () => {
  await shared.setSummaryMode(summaryModeEl.value);
  setStatus("Default export mode saved.");
});

// --- AI settings interactions ----------------------------------------------

aiModeRadios.forEach((radio) => {
  radio.addEventListener("change", async () => {
    updateModeVisibility();
    // Persist the mode immediately so "No AI" applies with a single click.
    await ai.saveSettings({ mode: selectedAiMode() });
    if (selectedAiMode() === ai.AI_MODES.none) {
      setStatus("Using local summaries (no AI).");
    } else if (selectedAiMode() === ai.AI_MODES.builtin) {
      setStatus("Using Chrome built-in AI when available on this device.");
    } else {
      setStatus('Fill in the details below, then click "Save AI settings".');
    }
  });
});

providerSelectEl.addEventListener("change", () => {
  applyProviderPreset(providerSelectEl.value, { overwriteFields: true });
});

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

saveAiButton.addEventListener("click", async () => {
  const mode = selectedAiMode();

  if (mode === ai.AI_MODES.none) {
    await ai.saveSettings({ mode });
    showSaveFeedback("✓ Saved — using local summaries (no AI).");
    return;
  }

  if (mode === ai.AI_MODES.builtin) {
    await ai.saveSettings({ mode });
    showSaveFeedback("✓ Saved — Chrome built-in AI enabled when available.");
    return;
  }

  if (mode === ai.AI_MODES.server) {
    const serverUrl = serverUrlEl.value.trim() || ai.DEFAULT_SERVER_URL;
    await ai.saveSettings({ mode, serverUrl });
    const granted = await ai.requestOriginPermission(serverUrl);
    showSaveFeedback(
      granted
        ? "✓ Saved — Server AI enabled for the configured backend."
        : "⚠ Saved, but server permission not granted — allow it to use AI summaries.",
      granted ? "success" : "warning"
    );
    return;
  }

  // byok
  const baseUrl = byokBaseUrlEl.value.trim();
  const model = byokModelEl.value.trim();
  const apiKey = byokApiKeyEl.value.trim();
  if (!baseUrl || !model || !apiKey) {
    showSaveFeedback("⚠ Enter a base URL, model, and API key first.", "warning");
    return;
  }
  await persistByok();
  const granted = await ai.requestOriginPermission(baseUrl);
  showSaveFeedback(
    granted
      ? "✓ Saved — API key active. Unlimited AI summaries enabled."
      : `⚠ Saved, but access to ${baseUrl} was not granted — click Save again and allow it.`,
    granted ? "success" : "warning"
  );
});

function setTestStatus(message, state) {
  testStatusEl.textContent = message;
  testStatusEl.className = "test-status" + (state ? ` ${state}` : "");
  testStatusEl.hidden = !message;
}

testBuiltInButton.addEventListener("click", async () => {
  await ai.saveSettings({ mode: ai.AI_MODES.builtin });
  setTestStatus("Testing Chrome built-in AI…", "");
  const result = await ai.testConnection();
  if (result && result.ok) {
    setTestStatus("Chrome built-in AI is ready.", "ok");
  } else {
    setTestStatus(`Test failed: ${result ? result.error : "no response"}`, "error");
  }
});

testAiButton.addEventListener("click", async () => {
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
  setTestStatus("Testing connection…", "");
  const result = await ai.testConnection();
  if (result && result.ok) {
    setTestStatus("Connection works. AI summaries are ready.", "ok");
  } else {
    setTestStatus(`Test failed: ${result ? result.error : "no response"}`, "error");
  }
});

// --- Handoff actions --------------------------------------------------------

copyRecommendedButton.addEventListener("click", async () => {
  const handoff = await shared.getHandoff();
  if (!handoff) {
    setStatus("No saved handoff available.");
    return;
  }
  const copied = await shared.copyText(shared.buildPromptPackage(handoff).recommendedInsertPrompt);
  setStatus(copied ? "Recommended prompt copied." : "Failed to copy recommended prompt.");
});

copyNextChunkButton.addEventListener("click", async () => {
  const handoff = await shared.getHandoff();
  if (!handoff) {
    setStatus("No saved handoff available.");
    return;
  }
  const result = await shared.copyNextChunk(handoff);
  setStatus(result.ok ? `Copied chunk ${result.index + 1}/${result.total}.` : result.error);
  await renderPopup();
});

resetChunksButton.addEventListener("click", async () => {
  const handoff = await shared.getHandoff();
  if (!handoff) {
    setStatus("No saved handoff available.");
    return;
  }
  await shared.resetChunkCursor(handoff.id);
  setStatus("Chunk queue reset.");
  await renderPopup();
});

downloadJsonButton.addEventListener("click", async () => {
  const handoff = await shared.getHandoff();
  if (!handoff) {
    setStatus("No saved handoff available.");
    return;
  }
  const packageInfo = shared.buildPromptPackage(handoff);
  shared.downloadTextFile(`${handoff.id}.json`, packageInfo.rawJson);
  setStatus("Raw JSON downloaded.");
});

clearSavedButton.addEventListener("click", async () => {
  await shared.clearHandoff();
  setStatus("Saved handoff cleared.");
  await renderPopup();
});

renderPopup();
