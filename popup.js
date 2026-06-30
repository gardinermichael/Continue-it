const shared = window.ContinueItShared;

const sourceEl = document.getElementById("source");
const capturedAtEl = document.getElementById("capturedAt");
const lastModeEl = document.getElementById("lastMode");
const messageCountEl = document.getElementById("messageCount");
const assistantCountEl = document.getElementById("assistantCount");
const chunkProgressEl = document.getElementById("chunkProgress");
const summaryModeEl = document.getElementById("summaryMode");
const warningsEl = document.getElementById("warnings");
const summaryPreviewEl = document.getElementById("summaryPreview");
const promptPreviewEl = document.getElementById("promptPreview");
const copyRecommendedButton = document.getElementById("copyRecommended");
const copyNextChunkButton = document.getElementById("copyNextChunk");
const resetChunksButton = document.getElementById("resetChunks");
const downloadJsonButton = document.getElementById("downloadJson");
const clearSavedButton = document.getElementById("clearSaved");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
}

function setWarnings(warnings) {
  warningsEl.innerHTML = "";
  (warnings || []).forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    warningsEl.appendChild(item);
  });
}

async function renderPopup() {
  summaryModeEl.value = await shared.getSummaryMode();
  const handoff = await shared.getHandoff();
  if (!handoff) {
    sourceEl.textContent = "None";
    capturedAtEl.textContent = "Nothing saved";
    lastModeEl.textContent = "-";
    messageCountEl.textContent = "0";
    assistantCountEl.textContent = "0";
    chunkProgressEl.textContent = "0/0";
    summaryPreviewEl.value = "";
    promptPreviewEl.value = "";
    setWarnings([]);
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
  messageCountEl.textContent = String(handoff.stats.totalMessages || 0);
  assistantCountEl.textContent = String(handoff.stats.assistantMessages || 0);
  chunkProgressEl.textContent = packageInfo.chunkCount ? `${Math.min(chunkCursor, packageInfo.chunkCount)}/${packageInfo.chunkCount}` : "0/0";
  summaryPreviewEl.value = handoff.summary || "";
  promptPreviewEl.value = packageInfo.recommendedInsertPrompt || "";
  setWarnings(handoff.warnings || []);

  copyRecommendedButton.disabled = false;
  copyNextChunkButton.disabled = packageInfo.chunkCount === 0;
  resetChunksButton.disabled = packageInfo.chunkCount === 0;
  downloadJsonButton.disabled = false;
  clearSavedButton.disabled = false;
}

summaryModeEl.addEventListener("change", async () => {
  await shared.setSummaryMode(summaryModeEl.value);
  setStatus("Default export mode saved.");
});

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