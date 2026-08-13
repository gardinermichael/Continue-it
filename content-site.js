(() => {
  const shared = window.ContinueItShared;
  const ui = window.ContinueItUI;
  const providers = window.ContinueItProviders;
  if (!shared || !ui || !providers || window.__continueItSiteLoaded) {
    return;
  }
  window.__continueItSiteLoaded = true;

  const provider = providers.matchProvider(window.location);
  if (!provider) {
    return;
  }

  const LAUNCHER_ID = `continue-it-launcher-${provider.id}`;

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
    if (provider.userHints.some((hint) => joined.includes(hint))) {
      return "user";
    }
    if (provider.assistantHints.some((hint) => joined.includes(hint))) {
      return "assistant";
    }

    const nearbyText = shared.normalizeText([
      node.querySelector?.("h1, h2, h3, h4, strong, [role='heading'], [aria-label]")?.textContent || "",
      node.previousElementSibling?.textContent || "",
      node.parentElement?.previousElementSibling?.textContent || ""
    ].join(" ")).toLowerCase();

    if (provider.userHints.some((hint) => nearbyText.includes(hint))) {
      return "user";
    }
    if (provider.assistantHints.some((hint) => nearbyText.includes(hint))) {
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

    if (node.closest(".continue-it-overlay") || node.closest("button")) {
      return false;
    }

    const lower = text.toLowerCase();
    const noisePhrases = ["new chat", "share", "copy", "edit", "retry", "regenerate", "upgrade", "artifacts"];
    if (noisePhrases.includes(lower)) {
      return false;
    }

    return true;
  }

  function getConversationRoot() {
    for (const selector of provider.rootSelectors) {
      const node = document.querySelector(selector);
      if (node && isVisible(node)) {
        return node;
      }
    }
    return document.body;
  }

  function findScrollableContainer() {
    const root = getConversationRoot();
    if (provider.scrollSelectors) {
      for (const selector of provider.scrollSelectors) {
        const node = document.querySelector(selector);
        if (!node) {
          continue;
        }
        const style = window.getComputedStyle(node);
        const scrollable = ["auto", "scroll", "overlay"].includes(style.overflowY) || node.scrollHeight > node.clientHeight + 200;
        if (scrollable) {
          return node;
        }
      }
    }

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
    const nodes = [];
    provider.messageSelectors.forEach((selector) => {
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

  function sourceArtifactTitle(text) {
    const lines = text
      .split(/\n+/)
      .map((line) => shared.normalizeText(line))
      .filter(Boolean)
      .filter((line) => !/^download(?: all)?$/i.test(line))
      .filter((line) => !/^(document|file|attachment)\b/i.test(line));
    return lines[0] || shared.truncateText(text, 80);
  }

  function sourceArtifactType(text, href) {
    const combined = `${text} ${href || ""}`.toLowerCase();
    const extension = combined.match(/\b(md|markdown|json|txt|csv|pdf|docx?|xlsx?|pptx?|html|zip)\b/i)?.[1];
    if (extension) {
      return extension.toUpperCase();
    }
    if (/document/i.test(text)) return "Document";
    if (/attachment/i.test(text)) return "Attachment";
    return "File";
  }

  function looksLikeSourceFileCard(node, text, href) {
    if (!text || text.length < 4 || text.length > 1200) {
      return false;
    }
    const lower = text.toLowerCase();
    const hasFileAction = /\b(download|open|document|attachment|file)\b/.test(lower);
    const hasKnownType = /\b(md|markdown|json|txt|csv|pdf|docx?|xlsx?|pptx?|html|zip)\b/i.test(text) || /\.(md|json|txt|csv|pdf|docx?|xlsx?|pptx?|html|zip)(\b|[?#])/i.test(href || "");
    const classHints = [
      node.getAttribute?.("data-testid") || "",
      node.getAttribute?.("aria-label") || "",
      typeof node.className === "string" ? node.className : ""
    ].join(" ").toLowerCase();
    return (hasFileAction && hasKnownType) || /\b(file|attachment|document|artifact)\b/.test(classHints);
  }

  function sourceArtifactCardFor(node) {
    let current = node;
    let best = node;
    for (let depth = 0; current && depth < 4; depth += 1) {
      const text = getNodeText(current);
      if (text && text.length <= 1200 && /download|document|attachment|file|\.md|\.pdf|\.json|\.txt/i.test(text)) {
        best = current;
      }
      current = current.parentElement;
    }
    return best;
  }

  function collectSourceArtifacts() {
    const root = getConversationRoot();
    const nodes = Array.from(root.querySelectorAll([
      "a[href]",
      "button",
      "[role='button']",
      "[data-testid*='file' i]",
      "[data-testid*='attachment' i]",
      "[data-testid*='document' i]",
      "[class*='file' i]",
      "[class*='attachment' i]",
      "[class*='document' i]",
      "[class*='artifact' i]"
    ].join(",")));
    const seen = new Set();
    const artifacts = [];

    nodes.forEach((node) => {
      if (!isVisible(node) || node.closest(".continue-it-overlay")) {
        return;
      }
      const card = sourceArtifactCardFor(node);
      if (!card || !isVisible(card)) {
        return;
      }
      const text = getNodeText(card);
      const link = card.matches?.("a[href]") ? card : card.querySelector?.("a[href]");
      const href = link?.href || "";
      const sanitizedHref = sanitizeSourceArtifactUrl(href);
      if (!looksLikeSourceFileCard(card, text, href)) {
        return;
      }
      const title = sourceArtifactTitle(text);
      const fileType = sourceArtifactType(text, href);
      const key = `${shared.normalizeText(title).toLowerCase()}|${sanitizedHref.url}|${fileType}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      artifacts.push({
        title,
        fileType,
        sourceUrl: window.location.href,
        downloadUrl: sanitizedHref.url,
        downloadUrlRedacted: sanitizedHref.redacted,
        visibleText: text,
        provider: provider.id,
        capturedAt: new Date().toISOString()
      });
    });

    return artifacts.slice(0, 50);
  }

  function sanitizeSourceArtifactUrl(href) {
    if (!href) {
      return { url: "", redacted: false };
    }

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (error) {
      return { url: "", redacted: true };
    }

    const sensitiveParamPattern = /(^|[-_])(access[_-]?token|auth|authorization|credential|expires?|jwt|key|policy|secret|session|signature|sig|token)([-_]|$)|^x-amz-|^x-goog-|^googleaccessid$|^awsaccesskeyid$|^key-pair-id$|^response-/i;
    let redacted = false;
    Array.from(url.searchParams.keys()).forEach((name) => {
      if (sensitiveParamPattern.test(name)) {
        url.searchParams.delete(name);
        redacted = true;
      }
    });
    if (redacted && !url.searchParams.toString()) {
      url.search = "";
    }
    url.hash = "";
    return { url: url.toString(), redacted };
  }

  function sourceArtifactKey(artifact) {
    return `${shared.normalizeText(artifact.title).toLowerCase()}|${artifact.downloadUrl || ""}|${artifact.fileType || ""}`;
  }

  function rawMessagesFromCandidates(candidates) {
    return (candidates || []).map((candidate, index) => ({
      id: candidate.key || `raw_${index + 1}`,
      role: candidate.role || "unknown",
      text: candidate.text || "",
      step: Number.isFinite(candidate.step) ? candidate.step : null,
      top: Number.isFinite(candidate.top) ? Math.round(candidate.top) : null,
      left: Number.isFinite(candidate.left) ? Math.round(candidate.left) : null
    }));
  }

  function mergeCandidates(nodes, step) {
    const filtered = [];
    nodes.forEach((node) => {
      const text = getNodeText(node);
      if (!text) {
        return;
      }

      for (let index = filtered.length - 1; index >= 0; index -= 1) {
        const existing = filtered[index];
        if (existing.node.contains(node) && existing.text.includes(text) && existing.text.length > text.length * 1.2) {
          filtered.splice(index, 1);
        }
      }

      const nestedDuplicate = filtered.some((existing) => existing.node.contains(node) && existing.text.includes(text));
      if (nestedDuplicate) {
        return;
      }

      for (let index = filtered.length - 1; index >= 0; index -= 1) {
        const existing = filtered[index];
        if (node.contains(existing.node) && text.includes(existing.text) && text.length <= existing.text.length * 1.2) {
          filtered.splice(index, 1);
        }
      }

      const rect = node.getBoundingClientRect();
      filtered.push({
        key: `${shared.hashString(text)}_${Math.round(rect.top)}_${Math.round(rect.left)}`,
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
      id: `${provider.id}_${index + 1}`,
      role: candidate.role,
      text: candidate.text,
      left: candidate.left,
      top: candidate.top
    }));

    const medianLeft = messages.length
      ? [...messages].map((message) => message.left).sort((a, b) => a - b)[Math.floor(messages.length / 2)]
      : 0;

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
        messages[index].role = messages[index].left > medianLeft ? "user" : "assistant";
      }
    }

    return messages.map(({ left, top, ...message }) => message);
  }

  function openDebugCaptureModal(debugData) {
    const modal = ui.createModal(
      "continue-it-debug-overlay",
      `Debug capture for ${provider.name}`,
      "This shows what the extractor currently thinks it found. Use it to diagnose undercounting, role assignment, and scroll progress."
    );

    const candidatePreview = (debugData.rawCandidates || [])
      .slice(0, 120)
      .map((candidate, index) => {
        return `${index + 1}. [${candidate.role}] step=${candidate.step} top=${Math.round(candidate.top)} left=${Math.round(candidate.left)}\n${candidate.text.slice(0, 280)}`;
      })
      .join("\n\n");

    modal.content.innerHTML = `
      <div class="continue-it-meta-grid">
        <div class="continue-it-meta-card"><strong>Detected messages</strong><span>${debugData.messageCount}</span></div>
        <div class="continue-it-meta-card"><strong>Raw candidates</strong><span>${debugData.rawCandidates.length}</span></div>
        <div class="continue-it-meta-card"><strong>Scan steps</strong><span>${debugData.diagnostics.scanSteps || 0}</span></div>
        <div class="continue-it-meta-card"><strong>Hit step limit</strong><span>${debugData.diagnostics.hitStepLimit ? "yes" : "no"}</span></div>
      </div>
      <label class="continue-it-muted" for="continue-it-debug-preview">Candidate preview</label>
      <pre class="continue-it-pre" id="continue-it-debug-preview"></pre>
      <div class="continue-it-row">
        <button type="button" class="continue-it-secondary" id="continue-it-copy-debug">Copy debug text</button>
        <button type="button" class="continue-it-secondary" id="continue-it-close-debug">Close</button>
      </div>
    `;

    const previewText = [
      `Provider: ${provider.name}`,
      `Detected messages: ${debugData.messageCount}`,
      `Raw candidates: ${debugData.rawCandidates.length}`,
      `Scan steps: ${debugData.diagnostics.scanSteps || 0}`,
      `Hit step limit: ${debugData.diagnostics.hitStepLimit ? "yes" : "no"}`,
      `Step counts: ${(debugData.diagnostics.stepCounts || []).join(", ")}`,
      "",
      candidatePreview || "No candidate preview available."
    ].join("\n");

    modal.content.querySelector("#continue-it-debug-preview").textContent = previewText;
    modal.content.querySelector("#continue-it-copy-debug").addEventListener("click", async () => {
      const copied = await shared.copyText(previewText);
      ui.toast(copied ? "Debug capture copied." : "Failed to copy debug capture.", copied ? "success" : "error");
    });
    modal.content.querySelector("#continue-it-close-debug").addEventListener("click", () => modal.close());
  }

  async function captureConversation({ onProgress } = {}) {
    const scrollRoot = findScrollableContainer();
    const originalScrollTop = scrollRoot.scrollTop;
    const cache = new Map();
    let stableSteps = 0;
    let previousCount = 0;
    let hitStepLimit = true;
    let scanSteps = 0;
    const stepCounts = [];
    const sourceArtifactCache = new Map();

    // How far we have to scroll back up is the only real measure of scan
    // progress. Virtualized transcripts can grow while we walk up, so the
    // fraction is a best effort — the progress UI clamps it monotonically.
    const scanDistance = originalScrollTop;

    function reportProgress(step) {
      if (!onProgress) {
        return;
      }
      const scrolled = scanDistance > 0
        ? 1 - Math.min(1, Math.max(0, scrollRoot.scrollTop / scanDistance))
        : Math.min(1, (step + 1) / 4);
      // The cache re-keys the same message at each scroll offset it was seen at,
      // so count distinct text instead — that is what survives deduplication and
      // what the review modal will report.
      const found = new Set([...cache.values()].map((candidate) => candidate.text)).size;
      onProgress({
        fraction: scrolled,
        detail: found === 1 ? "1 message found so far" : `${found} messages found so far`
      });
    }

    for (let step = 0; step < 80; step += 1) {
      scanSteps = step + 1;
      const candidateNodes = collectCandidateNodes();
      const candidates = mergeCandidates(candidateNodes, step);
      collectSourceArtifacts().forEach((artifact) => {
        sourceArtifactCache.set(sourceArtifactKey(artifact), artifact);
      });
      candidates.forEach((candidate) => {
        if (!cache.has(candidate.key)) {
          cache.set(candidate.key, candidate);
        }
      });

      const currentCount = cache.size;
      stepCounts.push(currentCount);
      reportProgress(step);
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
      if (provider.id === "chatgpt" && candidateNodes.length) {
        try {
          candidateNodes[0].scrollIntoView({ block: "start" });
        } catch (error) {
          // ignore
        }
      }
      scrollRoot.scrollTop = Math.max(0, before - Math.max(provider.id === "chatgpt" ? 1600 : 700, scrollRoot.clientHeight || 900));
      await shared.wait(provider.id === "chatgpt" ? 650 : 450);

      if (provider.id === "chatgpt" && scrollRoot.scrollTop === before) {
        try {
          scrollRoot.dispatchEvent(new WheelEvent("wheel", { deltaY: -1600, bubbles: true, cancelable: true }));
        } catch (error) {
          // ignore
        }
        await shared.wait(250);
      }

      if (scrollRoot.scrollTop === before && stableSteps >= 2) {
        hitStepLimit = false;
        break;
      }
    }

    await shared.wait(120);
    scrollRoot.scrollTop = originalScrollTop;
    collectSourceArtifacts().forEach((artifact) => {
      sourceArtifactCache.set(sourceArtifactKey(artifact), artifact);
    });

    const rawCandidates = [...cache.values()];
    const messages = finalizeMessages(rawCandidates);
    const diagnostics = {
      provider: provider.id,
      totalCandidates: cache.size,
      userMessages: messages.filter((message) => message.role === "user").length,
      assistantMessages: messages.filter((message) => message.role === "assistant").length,
      scanSteps,
      stepCounts,
      hitStepLimit
    };

    return { messages, diagnostics, rawCandidates, sourceArtifacts: Array.from(sourceArtifactCache.values()) };
  }

  function findComposer() {
    for (const selector of provider.composerSelectors) {
      const matches = Array.from(document.querySelectorAll(selector));
      const visible = matches.find((node) => isVisible(node));
      if (visible) {
        return visible;
      }
    }
    return null;
  }

  function getComposerText(target) {
    if (!target) {
      return "";
    }
    if (target instanceof HTMLTextAreaElement) {
      return target.value || "";
    }
    return target.innerText || target.textContent || "";
  }

  function setNativeValue(element, value) {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    const setter = descriptor && descriptor.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function insertViaExecCommand(target, text) {
    target.focus();
    try {
      document.execCommand("selectAll", false, null);
    } catch (error) {
      // ignore
    }
    try {
      return document.execCommand("insertText", false, text);
    } catch (error) {
      return false;
    }
  }

  function verifyInsertedText(target, text) {
    const current = shared.normalizeText(getComposerText(target));
    const expectedStart = shared.normalizeText(text.slice(0, 120));
    const expectedEnd = shared.normalizeText(text.slice(-120));
    return current.includes(expectedStart) && current.includes(expectedEnd.slice(0, 80));
  }

  function setComposerValue(target, text) {
    if (!target) {
      return false;
    }

    target.focus();
    if (target instanceof HTMLTextAreaElement) {
      setNativeValue(target, text);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return verifyInsertedText(target, text);
    }

    const inserted = insertViaExecCommand(target, text);
    if (!inserted) {
      target.textContent = text;
    }
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return verifyInsertedText(target, text);
  }

  async function openExportModal(handoff, debugData) {
    const modal = ui.createModal(
      "continue-it-export-overlay",
      `Review exported handoff from ${provider.name}`,
      "Edit the final recommended prompt if needed, then save it for import into another AI."
    );

    const packageInfo = shared.buildPromptPackage(handoff);
    const warningsHtml = handoff.warnings.length
      ? `<ul class="continue-it-warning-list">${handoff.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>`
      : "";
    const debugPreview = [
      `Detected messages: ${debugData.messageCount}`,
      `Raw candidates: ${debugData.rawCandidates.length}`,
      `Scan steps: ${debugData.diagnostics.scanSteps || 0}`,
      `Hit step limit: ${debugData.diagnostics.hitStepLimit ? "yes" : "no"}`,
      `Step counts: ${(debugData.diagnostics.stepCounts || []).join(", ")}`,
      "",
      ...(debugData.rawCandidates || []).slice(0, 25).map((candidate, index) => `${index + 1}. [${candidate.role}] ${candidate.text.slice(0, 180)}`)
    ].join("\n");

    modal.content.innerHTML = `
      <div class="continue-it-meta-grid">
        <div class="continue-it-meta-card"><strong>Summary source</strong><span>${handoff.summarySource || "Local (no AI)"}</span></div>
        <div class="continue-it-meta-card"><strong>Total messages</strong><span>${handoff.stats.totalMessages}</span></div>
        <div class="continue-it-meta-card"><strong>User / Assistant</strong><span>${handoff.stats.userMessages} / ${handoff.stats.assistantMessages}</span></div>
        <div class="continue-it-meta-card"><strong>Chunk count</strong><span id="ci-chunk-count">${packageInfo.chunkCount || 1}</span></div>
        <div class="continue-it-meta-card"><strong>Import mode</strong><span id="ci-import-mode">${packageInfo.recommendedMode}</span></div>
      </div>
      ${warningsHtml}
      <details>
        <summary class="continue-it-muted">Debug capture details</summary>
        <pre class="continue-it-pre" id="continue-it-debug-preview"></pre>
      </details>
      <label class="continue-it-muted" for="continue-it-prompt-text">Recommended prompt</label>
      <textarea class="continue-it-textarea" id="continue-it-prompt-text"></textarea>
      <div class="continue-it-row">
        <button type="button" class="continue-it-secondary" id="continue-it-cancel">Cancel</button>
        <button type="button" class="continue-it-secondary" id="continue-it-copy-json">Copy JSON</button>
        <button type="button" class="continue-it-primary" id="continue-it-save">Save recommended prompt</button>
        <button type="button" class="continue-it-primary" id="continue-it-save-copy">Save and copy recommended prompt</button>
      </div>
    `;

    const promptTextarea = modal.content.querySelector("#continue-it-prompt-text");
    modal.content.querySelector("#continue-it-debug-preview").textContent = debugPreview;
    promptTextarea.value = packageInfo.recommendedInsertPrompt;

    function updatePrompt() {
      handoff.customPrompt = promptTextarea.value.trim() || packageInfo.recommendedInsertPrompt;
      const nextPackage = shared.buildPromptPackage(handoff);
      modal.content.querySelector("#ci-chunk-count").textContent = nextPackage.chunkCount || 1;
      modal.content.querySelector("#ci-import-mode").textContent = nextPackage.recommendedMode;
      return nextPackage;
    }

    let currentPackage = updatePrompt();
    promptTextarea.addEventListener("input", () => {
      currentPackage = updatePrompt();
    });

    modal.content.querySelector("#continue-it-cancel").addEventListener("click", () => modal.close());
    modal.content.querySelector("#continue-it-copy-json").addEventListener("click", async () => {
      const copied = await shared.copyText(shared.buildPromptPackage(handoff).rawJson);
      ui.toast(copied ? "Raw JSON copied." : "Failed to copy raw JSON.", copied ? "success" : "error");
    });
    modal.content.querySelector("#continue-it-save").addEventListener("click", async () => {
      currentPackage = updatePrompt();
      const saveResult = await shared.saveHandoff(handoff);
      ui.toast(saveResult.ok ? "Recommended prompt saved." : saveResult.error, saveResult.ok ? "success" : "error");
      if (saveResult.ok) {
        modal.close();
      }
    });

    modal.content.querySelector("#continue-it-save-copy").addEventListener("click", async () => {
      currentPackage = updatePrompt();
      const saveResult = await shared.saveHandoff(handoff);
      if (!saveResult.ok) {
        ui.toast(saveResult.error, "error");
        return;
      }
      const copied = await shared.copyText(currentPackage.recommendedInsertPrompt);
      ui.toast(copied ? "Recommended prompt saved and copied." : "Recommended prompt saved but copy failed.", copied ? "success" : "warning");
      modal.close();
    });
  }

  async function openImportModal(handoff) {
    const validation = shared.validateHandoff(handoff);
    if (!validation.ok) {
      ui.toast(validation.error, "error", 5000);
      return;
    }

    const packageInfo = shared.buildPromptPackage(handoff, { targetProvider: provider.id });
    const targetPrompt = packageInfo.recommendedInsertPrompt;
    const targetAdvance = packageInfo.recommendedAdvance;
    const currentChunkIndex = await shared.getChunkCursor(handoff.id);
    const modal = ui.createModal(
      "continue-it-import-overlay",
      `Import handoff into ${provider.name}`,
      "Choose how to transfer the saved context. Large conversations are staged into transcript chunks."
    );

    modal.content.innerHTML = `
      <div class="continue-it-meta-grid">
        <div class="continue-it-meta-card"><strong>Total messages</strong><span>${handoff.stats.totalMessages}</span></div>
        <div class="continue-it-meta-card"><strong>User / Assistant</strong><span>${handoff.stats.userMessages} / ${handoff.stats.assistantMessages}</span></div>
        <div class="continue-it-meta-card"><strong>Transcript tokens</strong><span>~${handoff.stats.estimatedTranscriptTokens}</span></div>
        <div class="continue-it-meta-card"><strong>Recommended mode</strong><span>${packageInfo.recommendedMode}</span></div>
        <div class="continue-it-meta-card"><strong>Chunk count</strong><span>${packageInfo.chunkCount}</span></div>
        <div class="continue-it-meta-card"><strong>Next chunk index</strong><span id="continue-it-next-chunk">${currentChunkIndex + 1}</span></div>
      </div>
      ${handoff.warnings.length ? `<ul class="continue-it-warning-list">${handoff.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""}
      <label class="continue-it-muted" for="continue-it-import-preview">Recommended insert preview</label>
      <pre class="continue-it-pre" id="continue-it-import-preview"></pre>
      <div class="continue-it-row">
        <button type="button" class="continue-it-primary" id="continue-it-insert-recommended">Insert recommended prompt</button>
        <button type="button" class="continue-it-secondary" id="continue-it-copy-next">Copy next transcript chunk</button>
        <button type="button" class="continue-it-secondary" id="continue-it-reset-chunks">Reset chunk queue</button>
      </div>
      <div class="continue-it-row">
        <button type="button" class="continue-it-secondary" id="continue-it-copy-json">Copy raw JSON</button>
        <button type="button" class="continue-it-secondary" id="continue-it-close">Close</button>
      </div>
    `;

    modal.content.querySelector("#continue-it-import-preview").textContent = targetPrompt;
    modal.content.querySelector("#continue-it-insert-recommended").addEventListener("click", async () => {
      const composer = findComposer();
      if (!composer) {
        ui.toast(`Could not find the ${provider.name} prompt box.`, "error");
        return;
      }
      const inserted = setComposerValue(composer, targetPrompt);
      if (!inserted) {
        const copied = await shared.copyText(targetPrompt);
        ui.toast(copied ? "Direct insert failed. Prompt copied for manual paste with Ctrl+V." : "Failed to insert or copy the prompt.", copied ? "warning" : "error", 5000);
        return;
      }
      if (targetAdvance > 0) {
        await shared.setChunkCursor(handoff.id, targetAdvance);
      }
      ui.toast(packageInfo.recommendedMode === "single" ? `Full context inserted into ${provider.name}.` : `Starter context inserted into ${provider.name}. Send it first, then use Copy next chunk.`, "success", 5000);
      modal.close();
    });

    modal.content.querySelector("#continue-it-copy-next").addEventListener("click", async () => {
      const result = await shared.copyNextChunk(handoff);
      if (result.ok) {
        modal.content.querySelector("#continue-it-next-chunk").textContent = result.nextIndex + 1;
      }
      ui.toast(result.ok ? `Copied transcript chunk ${result.index + 1}/${result.total}.` : result.error, result.ok ? "success" : "error", 5000);
    });

    modal.content.querySelector("#continue-it-reset-chunks").addEventListener("click", async () => {
      await shared.resetChunkCursor(handoff.id);
      modal.content.querySelector("#continue-it-next-chunk").textContent = 1;
      ui.toast("Transcript chunk queue reset.", "success");
    });

    modal.content.querySelector("#continue-it-copy-json").addEventListener("click", async () => {
      const copied = await shared.copyText(packageInfo.rawJson);
      ui.toast(copied ? "Raw JSON handoff copied." : "Failed to copy raw JSON handoff.", copied ? "success" : "error");
    });

    modal.content.querySelector("#continue-it-close").addEventListener("click", () => modal.close());
  }

  function isContextInvalidated(error) {
    return error && typeof error.message === "string" && error.message.toLowerCase().includes("extension context invalidated");
  }

  let exportInFlight = false;

  function describeBuiltInStatus(status) {
    if (!status || status.provider !== "builtin") {
      return "";
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
      return "Chrome built-in AI model is ready.";
    }
    if (status.state === "expired") {
      return status.error || "Chrome built-in AI prewarm expired before it was used.";
    }
    if (status.state === "error") {
      return `Chrome built-in AI is not ready: ${status.error || "unknown error"}`;
    }
    return "";
  }

  function attachBuiltInProgress(progress) {
    function onBuiltInStatus(event) {
      const detail = describeBuiltInStatus(event.detail);
      if (detail) {
        progress.setDetail(detail);
      }
    }

    window.addEventListener("continueIt:builtinStatus", onBuiltInStatus);
    return () => window.removeEventListener("continueIt:builtinStatus", onBuiltInStatus);
  }

  async function exportConversation() {
    if (exportInFlight) {
      ui.toast("An export is already running on this tab.", "warning");
      return;
    }
    exportInFlight = true;

    const progress = ui.createProgress({
      launcherId: LAUNCHER_ID,
      busyLabel: "Exporting",
      label: "Starting export"
    });

    try {
      return await _exportConversation(progress);
    } catch (error) {
      console.error("[Continue It] Export failed:", error);
      if (isContextInvalidated(error)) {
        progress.fail("Extension reloaded", "Refresh this page (F5), then try again.");
        ui.toast("Extension was reloaded — please refresh this page (F5), then try again.", "error", 8000);
      } else {
        progress.fail("Export failed", error?.message || String(error));
        ui.toast(`Export failed: ${error?.message || String(error)}`, "error", 8000);
      }
    } finally {
      exportInFlight = false;
    }
  }

  async function _exportConversation(progress) {
    const builtInPrewarm = window.ContinueItAI && typeof window.ContinueItAI.prewarmBuiltInModel === "function"
      ? window.ContinueItAI.prewarmBuiltInModel()
      : null;

    progress.phase({
      label: `Scanning ${provider.name} conversation`,
      detail: "Scrolling back for the full transcript…",
      from: 0,
      to: 0.5
    });

    const { messages, diagnostics, rawCandidates, sourceArtifacts } = await captureConversation({
      onProgress: ({ fraction, detail }) => progress.set(fraction, detail)
    });
    if (!messages.length) {
      progress.fail("No messages found", `Nothing to export from this ${provider.name} page.`);
      ui.toast(`No ${provider.name} messages found on this page.`, "error");
      return;
    }

    progress.phase({
      label: "Building handoff",
      detail: `${messages.length} messages captured.`,
      from: 0.5,
      to: 0.58
    });

    const summaryMode = await shared.getSummaryMode();
    const handoff = shared.buildHandoff({
      source: provider.name,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      pageUrl: location.href,
      summaryMode,
      messages,
      rawMessages: rawMessagesFromCandidates(rawCandidates),
      diagnostics,
      sourceArtifacts
    });

    // Track where the final summary actually came from, so the user gets an
    // unambiguous signal (server API vs their own key vs local DOM heuristic).
    let summarySource = "Local (no AI)";

    if (window.ContinueItAI) {
      const aiSettings = await window.ContinueItAI.getSettings();
      const modes = window.ContinueItAI.AI_MODES;
      const usingAI = aiSettings.mode !== modes.none;
      if (aiSettings.mode === modes.builtin && builtInPrewarm) {
        builtInPrewarm.then((result) => {
          if (result && !result.ok && result.error) {
            console.warn(`[Continue It] Chrome built-in AI prewarm failed: ${result.error}`);
          }
        });
      }
      if (usingAI) {
        const phaseLabel = aiSettings.mode === modes.server
          ? "Contacting Server AI"
          : aiSettings.mode === modes.builtin
            ? "Summarizing with Chrome built-in AI"
            : "Summarizing with your API key";
        // The request length is unknowable, so this phase creeps toward its end
        // and shows elapsed time — the bar must never look parked.
        progress.phase({
          label: phaseLabel,
          detail: "Waiting for the model to respond…",
          from: 0.58,
          to: 0.94,
          creep: true,
          slowHintAfter: 12000,
          slowHint: "Still waiting on the model. Long conversations can take a minute or more."
        });
      } else {
        progress.phase({ label: "Summarizing locally", from: 0.58, to: 0.94 });
      }
      const detachBuiltInProgress = aiSettings.mode === modes.builtin ? attachBuiltInProgress(progress) : null;
      if (detachBuiltInProgress && typeof window.ContinueItAI.getBuiltInStatus === "function") {
        const detail = describeBuiltInStatus(await window.ContinueItAI.getBuiltInStatus());
        if (detail) {
          progress.setDetail(detail);
        }
      }
      let aiResult;
      try {
        aiResult = await window.ContinueItAI.summarizeConversation({
          source: provider.name,
          messages: handoff.messages,
          mode: summaryMode,
          shared
        });
      } finally {
        if (detachBuiltInProgress) {
          detachBuiltInProgress();
        }
      }
      if (aiResult.summary) {
        handoff.summary = aiResult.summary;
        (aiResult.warnings || []).forEach((warning) => handoff.warnings.push(warning));
        if (aiSettings.mode === modes.server) {
          summarySource = "Server AI (backend API)";
          const left = aiResult.quota && Number.isFinite(aiResult.quota.remaining)
            ? ` ${aiResult.quota.remaining}/${aiResult.quota.limit} free exports left today.`
            : "";
          ui.toast(`✓ Summary generated by the Server API.${left}`, "success", 5000);
        } else if (aiSettings.mode === modes.builtin) {
          summarySource = "Chrome built-in AI";
          ui.toast("✓ Summary generated by Chrome built-in AI.", "success", 4000);
        } else {
          summarySource = "Your own API key";
          ui.toast("✓ Summary generated by your own API key.", "success", 4000);
        }
      } else if (aiResult.used && aiResult.error) {
        // AI was attempted but failed — the local DOM summary from buildHandoff stands.
        summarySource = "Local (AI failed)";
        handoff.warnings.push(`AI summarization failed, local summary used instead: ${aiResult.error}`);
        ui.toast(`⚠ AI failed — used the local (DOM) summary instead. ${aiResult.error}`, "warning", 7000);
      } else if (!usingAI) {
        ui.toast("Summary generated locally (no AI). Enable Chrome built-in AI, Server AI, or add your key for smarter summaries.", "default", 4500);
      }
    }

    handoff.summarySource = summarySource;

    progress.phase({ label: "Preparing review", detail: "", from: 0.94, to: 1 });
    await shared.resetChunkCursor(handoff.id);
    await openExportModal(handoff, { rawCandidates, diagnostics, messageCount: messages.length });
    progress.succeed("Export ready");
  }

  async function importConversation() {
    try {
      const handoff = await shared.getHandoff();
      if (!handoff) {
        ui.toast("No saved handoff found. Export from any supported AI first.", "error");
        return;
      }
      await openImportModal(handoff);
    } catch (error) {
      console.error("[Continue It] Import failed:", error);
      if (isContextInvalidated(error)) {
        ui.toast("Extension was reloaded — please refresh this page (F5), then try again.", "error", 8000);
      } else {
        ui.toast(`Import failed: ${error?.message || String(error)}`, "error", 8000);
      }
    }
  }

  function getLauncherAnchor() {
    return findComposer() || getConversationRoot();
  }

  function boot() {
    if (window.ContinueItAI && typeof window.ContinueItAI.getSettings === "function") {
      window.ContinueItAI.getSettings();
    }
    ui.mountLauncher({
      id: LAUNCHER_ID,
      label: "Continue It",
      getAnchor: getLauncherAnchor,
      actions: [
        { label: "Export Context", onClick: exportConversation },
        { label: "Import Context", onClick: importConversation }
      ]
    });
  }

  boot();
})();
