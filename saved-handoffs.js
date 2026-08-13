const shared = window.ContinueItShared;
const emptyStateEl = document.getElementById("emptyState");
const handoffListEl = document.getElementById("handoffList");

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function titleFor(entry) {
  return entry.pageTitle || `${entry.source || "Unknown source"} handoff`;
}

function summaryFor(entry) {
  if (entry.handoff?.summary) {
    return shared.truncateText(entry.handoff.summary, 520);
  }
  return "Full handoff content is not available for this older history entry.";
}

function setStatus(card, message) {
  const status = card.querySelector(".status");
  status.textContent = message;
}

function addButton(actions, label, className, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className || "";
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  actions.appendChild(button);
}

function renderHandoff(entry) {
  const card = document.createElement("article");
  const header = document.createElement("div");
  const titleBlock = document.createElement("div");
  const title = document.createElement("h2");
  const meta = document.createElement("p");
  const badge = document.createElement("span");
  const summary = document.createElement("p");
  const actions = document.createElement("div");
  const status = document.createElement("p");

  card.className = "handoff-card";
  header.className = "handoff-header";
  title.className = "handoff-title";
  meta.className = "handoff-meta";
  badge.className = `badge ${entry.hasFullHandoff ? "full" : "limited"}`;
  summary.className = "summary";
  actions.className = "actions";
  status.className = "status";

  title.textContent = titleFor(entry);
  meta.textContent = [
    entry.source || "Unknown source",
    formatDate(entry.createdAt),
    `${entry.totalMessages || 0} messages`,
    `${entry.assistantMessages || 0} assistant replies`,
    `${entry.summaryMode || "medium"} summary`
  ].join(" | ");
  badge.textContent = entry.hasFullHandoff ? "Full handoff" : "Metadata only";
  summary.textContent = summaryFor(entry);

  titleBlock.appendChild(title);
  titleBlock.appendChild(meta);
  header.appendChild(titleBlock);
  header.appendChild(badge);

  addButton(actions, "Copy prompt", "", async () => {
    if (!entry.handoff) {
      setStatus(card, "Full handoff content is not available for this entry.");
      return;
    }
    const copied = await shared.copyText(shared.buildPromptPackage(entry.handoff).recommendedInsertPrompt);
    setStatus(card, copied ? "Recommended prompt copied." : "Failed to copy prompt.");
  }, !entry.handoff);

  addButton(actions, "Download JSON", "secondary", () => {
    if (!entry.handoff) {
      setStatus(card, "Full handoff content is not available for this entry.");
      return;
    }
    shared.downloadTextFile(`${entry.handoff.id}.json`, shared.buildPromptPackage(entry.handoff).rawJson);
    setStatus(card, "Raw JSON downloaded.");
  }, !entry.handoff);

  addButton(actions, "Copy next chunk", "secondary", async () => {
    if (!entry.handoff) {
      setStatus(card, "Full handoff content is not available for this entry.");
      return;
    }
    const result = await shared.copyNextChunk(entry.handoff);
    setStatus(card, result.ok ? `Copied chunk ${result.index + 1}/${result.total}.` : result.error);
  }, !entry.handoff);

  card.appendChild(header);
  card.appendChild(summary);
  card.appendChild(actions);
  card.appendChild(status);
  handoffListEl.appendChild(card);
}

async function renderSavedHandoffs() {
  const entries = await shared.getSavedHandoffs();
  emptyStateEl.hidden = entries.length > 0;
  handoffListEl.textContent = "";
  entries.forEach(renderHandoff);
}

void renderSavedHandoffs();
