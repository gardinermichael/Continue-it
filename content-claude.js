(() => {
  const shared = window.ContinueItShared;
  const ui = window.ContinueItUI;
  if (!shared || !ui || window.__continueItClaudeLoaded) {
    return;
  }
  window.__continueItClaudeLoaded = true;

  function getNodeText(node) {
    return shared.cleanMessageText(node?.innerText || node?.textContent || "");
  }

  function isVisible(node) {
    if (!node) {
      return false;
    }
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function detectRole(node) {
    const hints = [];
    let current = node;
    let depth = 0;

    while (current && depth < 7) {
      const className = typeof current.className === "string" ? current.className : "";
      hints.push(
        shared.normalizeText(current.getAttribute?.("data-testid") || ""),
        shared.normalizeText(current.getAttribute?.("aria-label") || ""),
        shared.normalizeText(current.getAttribute?.("data-message-author") || ""),
        shared.normalizeText(current.getAttribute?.("data-author") || ""),
        shared.normalizeText(current.getAttribute?.("title") || ""),
        shared.normalizeText(className)
      );
      current = current.parentElement;
      depth += 1;
    }

    const joined = hints.join(" ").toLowerCase();
    if (/(^|\s)(user|human|you|prompt)(\s|$)/.test(joined)) {
      return "user";
    }
    if (/(^|\s)(assistant|claude|model|ai)(\s|$)/.test(joined)) {
      return "assistant";
    }

    const nearbyText = shared.normalizeText([
      node.querySelector?.("h1, h2, h3, h4, strong, [role='heading'], [aria-label]")?.textContent || "",
      node.previousElementSibling?.textContent || "",
      node.parentElement?.previousElementSibling?.textContent || ""
    ].join(" ")).toLowerCase();

    if (nearbyText.includes("you")) {
      return "user";
    }
    if (nearbyText.includes("claude")) {
      return "assistant";
    }

    return null;
  }

  function isMeaningfulMessageNode(node) {
    if (!node || !document.body.contains(node) || !isVisible(node)) {
      return false;
    }

    const text = getNodeText(node);
    if (!text || text.length < 8) {
      return false;
    }

    const tagName = (node.tagName || "").toLowerCase();
    if (["button", "nav", "header", "footer", "aside", "form", "input", "textarea"].includes(tagName)) {
      return false;
    }

    if (node.closest("#continue-it-export-overlay") || node.closest("button")) {
      return false;
    }

    const lower = text.toLowerCase();
    const noisePhrases = [
      "new chat",
      "upgrade plan",
      "share chat",
      "artifacts",
      "copy",
      "edit",
      "retry",
      "regenerate"
    ];
    if (noisePhrases.includes(lower)) {
      return false;
    }

    return true;
  }

  function getConversationRoot() {
    const selectors = [
      "main",
      '[data-testid*="conversation"]',
      '[data-testid*="chat"]',
      '[class*="conversation"]',
      '[class*="chat"]'
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node && isVisible(node)) {
        return node;
      }
    }

    return document.body;
  }

  function findScrollableContainer() {
    const root = getConversationRoot();
    const candidates = [];
    let current = root;
    let depth = 0;

    while (current && depth < 6) {
      candidates.push(current);
      current = current.parentElement;
      depth += 1;
    }

    candidates.push(document.scrollingElement, document.documentElement, document.body);

    for (const node of candidates.filter(Boolean)) {
      const style = window.getComputedStyle(node);
      const scrollable = ["auto", "scroll", "overlay"].includes(style.overflowY) || node.scrollHeight > node.clientHeight + 200;
      if (scrollable) {
        return node;
      }
    }
    return document.scrollingElement || document.documentElement;
  }

  function collectFallbackNodes(root) {
    const fallbackSelectors = ["article", "section", "div", "li"];
    const fallbackNodes = [];

    fallbackSelectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => {
        const text = getNodeText(node);
        if (!isMeaningfulMessageNode(node) || text.length < 20) {
          return;
        }

        const meaningfulChildren = Array.from(node.children || []).filter((child) => {
          return isMeaningfulMessageNode(child) && getNodeText(child).length >= 20;
        });

        if (meaningfulChildren.length >= 2) {
          return;
        }

        fallbackNodes.push(node);
      });
    });

    return fallbackNodes;
  }

  function collectCandidateNodes() {
    const root = getConversationRoot();
    const selectors = [
      '[data-testid*="message"]',
      '[class*="message"]',
      '[role="article"]',
      'article',
      '[class*="prose"]',
      '[class*="markdown"]'
    ];

    const nodes = [];
    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => {
        if (isMeaningfulMessageNode(node)) {
          nodes.push(node);
        }
      });
    });

    const selectedNodes = nodes.length ? nodes : collectFallbackNodes(root);

    return Array.from(new Set(selectedNodes)).sort((a, b) => {
      if (a === b) {
        return 0;
      }
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
  }

  function mergeCandidates(nodes, step) {
    const filtered = [];
    nodes.forEach((node) => {
      const text = getNodeText(node);
      if (!text) {
        return;
      }

      const nestedDuplicate = filtered.some((existing) => existing.node.contains(node) && existing.text.includes(text));
      if (nestedDuplicate) {
        return;
      }

      for (let index = filtered.length - 1; index >= 0; index -= 1) {
        const existing = filtered[index];
        if (node.contains(existing.node) && text.includes(existing.text)) {
          filtered.splice(index, 1);
        }
      }

      const rect = node.getBoundingClientRect();
      filtered.push({
        key: shared.hashString(text),
        node,
        text,
        role: detectRole(node) || "unknown",
        top: rect.top,
        left: rect.left,
        step
      });
    });
    return filtered;
  }

  function finalizeMessages(candidates) {
    const sorted = [...candidates].sort((a, b) => {
      if (a.step !== b.step) {
        return b.step - a.step;
      }
      if (a.top !== b.top) {
        return a.top - b.top;
      }
      return a.left - b.left;
    });

    const messages = sorted.map((candidate, index) => ({
      id: `c_${index + 1}`,
      role: candidate.role,
      text: candidate.text
    }));

    for (let index = 0; index < messages.length; index += 1) {
      if (messages[index].role !== "unknown") {
        continue;
      }
      const previous = messages[index - 1]?.role;
      const next = messages[index + 1]?.role;
      if (previous && previous !== "unknown") {
        messages[index].role = previous === "user" ? "assistant" : "user";
      } else if (next && next !== "unknown") {
        messages[index].role = next === "user" ? "assistant" : "user";
      } else {
        messages[index].role = index % 2 === 0 ? "user" : "assistant";
      }
    }

    return messages;
  }

  async function captureConversation() {
    const scrollRoot = findScrollableContainer();
    const originalScrollTop = scrollRoot.scrollTop;
    const cache = new Map();
    let stableSteps = 0;
    let previousCount = 0;
    let hitStepLimit = true;
    let scanSteps = 0;

    ui.toast("Scanning Claude conversation for full context...", "default", 2000);

    for (let step = 0; step < 80; step += 1) {
      scanSteps = step + 1;
      const candidates = mergeCandidates(collectCandidateNodes(), step);
      candidates.forEach((candidate) => {
        if (!cache.has(candidate.key)) {
          cache.set(candidate.key, candidate);
        }
      });

      const currentCount = cache.size;
      const reachedTop = scrollRoot.scrollTop <= 0;
      if (currentCount === previousCount) {
        stableSteps += 1;
      } else {
        stableSteps = 0;
      }
      previousCount = currentCount;

      if (reachedTop && stableSteps >= 2) {
        hitStepLimit = false;
        break;
      }

      const before = scrollRoot.scrollTop;
      scrollRoot.scrollTop = Math.max(0, before - Math.max(700, scrollRoot.clientHeight || 900));
      await shared.wait(450);

      if (scrollRoot.scrollTop === before && stableSteps >= 2) {
        hitStepLimit = false;
        break;
      }
    }

    await shared.wait(120);
    scrollRoot.scrollTop = originalScrollTop;

    const messages = finalizeMessages([...cache.values()]);
    const stats = {
      totalCandidates: cache.size,
      userMessages: messages.filter((message) => message.role === "user").length,
      assistantMessages: messages.filter((message) => message.role === "assistant").length,
      unknownMessages: messages.filter((message) => message.role === "unknown").length,
      scanSteps,
      hitStepLimit
    };

    return { messages, diagnostics: stats };
  }

  async function openExportModal(handoff) {
    const modal = ui.createModal(
      "continue-it-export-overlay",
      "Review exported handoff",
      "This export keeps both the summary and the full conversation transcript. Large chats are packaged into staged transcript chunks when needed."
    );

    const packageInfo = shared.buildPromptPackage(handoff);
    const content = modal.content;
    const warningsHtml = handoff.warnings.length
      ? `<ul class="continue-it-warning-list">${handoff.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>`
      : "";

    content.innerHTML = `
      <div class="continue-it-row" id="continue-it-mode-row">
        <button type="button" class="continue-it-pill" data-mode="short">Short</button>
        <button type="button" class="continue-it-pill" data-mode="medium">Medium</button>
        <button type="button" class="continue-it-pill" data-mode="detailed">Detailed</button>
      </div>
      <div class="continue-it-meta-grid">
        <div class="continue-it-meta-card"><strong>Total messages</strong><span id="ci-total-messages">${handoff.stats.totalMessages}</span></div>
        <div class="continue-it-meta-card"><strong>User / Claude</strong><span id="ci-role-stats">${handoff.stats.userMessages} / ${handoff.stats.assistantMessages}</span></div>
        <div class="continue-it-meta-card"><strong>Transcript tokens</strong><span id="ci-transcript-tokens">~${handoff.stats.estimatedTranscriptTokens}</span></div>
        <div class="continue-it-meta-card"><strong>Chunk count</strong><span id="ci-chunk-count">${packageInfo.chunkCount || 1}</span></div>
        <div class="continue-it-meta-card"><strong>Import mode</strong><span id="ci-import-mode">${packageInfo.recommendedMode}</span></div>
        <div class="continue-it-meta-card"><strong>Scan steps</strong><span id="ci-scan-steps">${handoff.diagnostics.scanSteps || 0}</span></div>
      </div>
      ${warningsHtml}
      <label class="continue-it-muted" for="continue-it-summary-text">Editable summary</label>
      <textarea class="continue-it-textarea" id="continue-it-summary-text"></textarea>
      <label class="continue-it-muted" for="continue-it-preview-text">Recommended import prompt preview</label>
      <pre class="continue-it-pre" id="continue-it-preview-text"></pre>
      <div class="continue-it-row">
        <button type="button" class="continue-it-secondary" id="continue-it-copy-recommended">Copy recommended prompt</button>
        <button type="button" class="continue-it-secondary" id="continue-it-download-json">Download JSON</button>
        <button type="button" class="continue-it-secondary" id="continue-it-copy-next">Copy next transcript chunk</button>
      </div>
      <div class="continue-it-row">
        <button type="button" class="continue-it-secondary" id="continue-it-cancel">Cancel</button>
        <button type="button" class="continue-it-primary" id="continue-it-save">Save handoff</button>
        <button type="button" class="continue-it-primary" id="continue-it-save-copy">Save and copy recommended prompt</button>
      </div>
    `;

    const summaryTextarea = content.querySelector("#continue-it-summary-text");
    const previewText = content.querySelector("#continue-it-preview-text");
    const modeButtons = Array.from(content.querySelectorAll("[data-mode]"));
    summaryTextarea.value = handoff.summary;

    function updatePreview() {
      handoff.summary = summaryTextarea.value.trim() || handoff.summary;
      const nextPackage = shared.buildPromptPackage(handoff);
      previewText.textContent = nextPackage.recommendedInsertPrompt;
      content.querySelector("#ci-chunk-count").textContent = nextPackage.chunkCount || 1;
      content.querySelector("#ci-import-mode").textContent = nextPackage.recommendedMode;
      modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === handoff.summaryMode));
      return nextPackage;
    }

    let currentPackage = updatePreview();

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        handoff.summaryMode = button.dataset.mode;
        handoff.summary = shared.buildSummary(handoff.messages, handoff.summaryMode);
        summaryTextarea.value = handoff.summary;
        currentPackage = updatePreview();
      });
    });

    summaryTextarea.addEventListener("input", () => {
      currentPackage = updatePreview();
    });

    content.querySelector("#continue-it-copy-recommended").addEventListener("click", async () => {
      currentPackage = updatePreview();
      const copied = await shared.copyText(currentPackage.recommendedInsertPrompt);
      ui.toast(copied ? "Recommended prompt copied." : "Failed to copy recommended prompt.", copied ? "success" : "error");
    });

    content.querySelector("#continue-it-download-json").addEventListener("click", () => {
      handoff.summary = summaryTextarea.value.trim() || handoff.summary;
      const packageData = shared.buildPromptPackage(handoff);
      shared.downloadTextFile(`${handoff.id}.json`, packageData.rawJson);
      ui.toast("Raw JSON handoff downloaded.", "success");
    });

    content.querySelector("#continue-it-copy-next").addEventListener("click", async () => {
      handoff.summary = summaryTextarea.value.trim() || handoff.summary;
      const result = await shared.copyNextChunk(handoff);
      ui.toast(result.ok ? `Copied transcript chunk ${result.index + 1}/${result.total}.` : result.error, result.ok ? "success" : "error");
    });

    content.querySelector("#continue-it-cancel").addEventListener("click", () => {
      modal.close();
    });

    content.querySelector("#continue-it-save").addEventListener("click", async () => {
      handoff.summary = summaryTextarea.value.trim() || handoff.summary;
      const saveResult = await shared.saveHandoff(handoff);
      ui.toast(saveResult.ok ? "Handoff saved." : saveResult.error, saveResult.ok ? "success" : "error");
      if (saveResult.ok) {
        modal.close();
      }
    });

    content.querySelector("#continue-it-save-copy").addEventListener("click", async () => {
      handoff.summary = summaryTextarea.value.trim() || handoff.summary;
      const saveResult = await shared.saveHandoff(handoff);
      if (!saveResult.ok) {
        ui.toast(saveResult.error, "error");
        return;
      }
      currentPackage = updatePreview();
      const copied = await shared.copyText(currentPackage.recommendedInsertPrompt);
      ui.toast(copied ? "Handoff saved and recommended prompt copied." : "Handoff saved but prompt copy failed.", copied ? "success" : "warning");
      modal.close();
    });
  }

  async function exportConversation() {
    const { messages, diagnostics } = await captureConversation();
    if (!messages.length) {
      ui.toast("No Claude messages found on this page.", "error");
      return;
    }

    const summaryMode = await shared.getSummaryMode();
    const handoff = shared.buildHandoff({
      source: "Claude",
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      pageUrl: location.href,
      summaryMode,
      messages,
      diagnostics
    });

    await shared.resetChunkCursor(handoff.id);
    await openExportModal(handoff);
  }

  function boot() {
    ui.makeFloatingButton("Export Context", exportConversation, "right");
  }

  boot();
})();