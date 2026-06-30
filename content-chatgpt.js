(() => {
  const shared = window.ContinueItShared;
  const ui = window.ContinueItUI;
  if (!shared || !ui || window.__continueItChatgptLoaded) {
    return;
  }
  window.__continueItChatgptLoaded = true;

  function isVisible(element) {
    if (!element) {
      return false;
    }
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function findComposer() {
    const selectors = [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'form textarea',
      'form [contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]'
    ];

    for (const selector of selectors) {
      const matches = Array.from(document.querySelectorAll(selector));
      const visible = matches.find((element) => isVisible(element));
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

  async function insertRecommendedPrompt(handoff) {
    const composer = findComposer();
    if (!composer) {
      ui.toast("Could not find the ChatGPT prompt box.", "error");
      return;
    }

    const packageInfo = shared.buildPromptPackage(handoff);
    const prompt = packageInfo.recommendedInsertPrompt;
    const inserted = setComposerValue(composer, prompt);
    if (!inserted) {
      const copied = await shared.copyText(prompt);
      ui.toast(copied ? "Direct insert failed. Prompt copied for manual paste with Ctrl+V." : "Failed to insert or copy the prompt.", copied ? "warning" : "error", 5000);
      return;
    }

    if (packageInfo.recommendedAdvance > 0) {
      await shared.setChunkCursor(handoff.id, packageInfo.recommendedAdvance);
    }

    ui.toast(
      packageInfo.recommendedMode === "single"
        ? "Full context inserted into ChatGPT. Review it, then send."
        : "Starter context inserted. Send it first, then use Copy next chunk for the remaining transcript parts.",
      "success",
      5000
    );
  }

  async function openImportModal(handoff) {
    const validation = shared.validateHandoff(handoff);
    if (!validation.ok) {
      ui.toast(validation.error, "error", 5000);
      return;
    }

    const packageInfo = shared.buildPromptPackage(handoff);
    const currentChunkIndex = await shared.getChunkCursor(handoff.id);
    const modal = ui.createModal(
      "continue-it-import-overlay",
      "Import handoff into ChatGPT",
      "Choose how to transfer the saved context. Large conversations are staged into transcript chunks."
    );

    modal.content.innerHTML = `
      <div class="continue-it-meta-grid">
        <div class="continue-it-meta-card"><strong>Total messages</strong><span>${handoff.stats.totalMessages}</span></div>
        <div class="continue-it-meta-card"><strong>User / Claude</strong><span>${handoff.stats.userMessages} / ${handoff.stats.assistantMessages}</span></div>
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

    modal.content.querySelector("#continue-it-import-preview").textContent = packageInfo.recommendedInsertPrompt;

    modal.content.querySelector("#continue-it-insert-recommended").addEventListener("click", async () => {
      await insertRecommendedPrompt(handoff);
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

    modal.content.querySelector("#continue-it-close").addEventListener("click", () => {
      modal.close();
    });
  }

  async function importConversation() {
    const handoff = await shared.getHandoff();
    if (!handoff) {
      ui.toast("No saved handoff found. Export from Claude first.", "error");
      return;
    }

    await openImportModal(handoff);
  }

  function boot() {
    ui.makeFloatingButton("Import Context", importConversation, "left");
  }

  boot();
})();