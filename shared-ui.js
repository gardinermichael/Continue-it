(() => {
  if (window.ContinueItUI) {
    return;
  }

  function ensureUIStyles() {
    if (document.getElementById("continue-it-ui-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "continue-it-ui-style";
    style.textContent = `
      :root {
        --ci-bg: #ffffff;
        --ci-surface: #f8fafc;
        --ci-text: #0f172a;
        --ci-muted: #475467;
        --ci-border: #d0d5dd;
        --ci-primary: #111827;
        --ci-primary-text: #ffffff;
        --ci-secondary: #e2e8f0;
        --ci-secondary-text: #0f172a;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --ci-bg: #111827;
          --ci-surface: #1f2937;
          --ci-text: #f9fafb;
          --ci-muted: #cbd5e1;
          --ci-border: #374151;
          --ci-primary: #f9fafb;
          --ci-primary-text: #111827;
          --ci-secondary: #374151;
          --ci-secondary-text: #f9fafb;
        }
      }
      .continue-it-toast {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        max-width: 380px;
        padding: 12px 14px;
        border-radius: 10px;
        color: #ffffff;
        font: 13px/1.45 Arial, sans-serif;
        box-shadow: 0 12px 30px rgba(0,0,0,0.25);
      }
      .continue-it-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .continue-it-modal {
        width: min(960px, calc(100vw - 48px));
        max-height: calc(100vh - 48px);
        overflow: auto;
        background: var(--ci-bg);
        color: var(--ci-text);
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .continue-it-modal h2 {
        margin: 0 0 6px;
        font-size: 20px;
      }
      .continue-it-muted {
        color: var(--ci-muted);
        font-size: 13px;
      }
      .continue-it-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin: 14px 0;
      }
      .continue-it-meta-card {
        border: 1px solid var(--ci-border);
        border-radius: 10px;
        background: var(--ci-surface);
        padding: 10px 12px;
      }
      .continue-it-meta-card strong {
        display: block;
        color: var(--ci-muted);
        font-size: 12px;
        margin-bottom: 4px;
      }
      .continue-it-meta-card span {
        color: var(--ci-text);
        font-size: 13px;
      }
      .continue-it-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 14px 0;
      }
      .continue-it-pill,
      .continue-it-primary,
      .continue-it-secondary,
      .continue-it-danger,
      .continue-it-launcher,
      .continue-it-menu button {
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        font: 600 13px Arial, sans-serif;
        cursor: pointer;
      }
      .continue-it-pill {
        border: 1px solid var(--ci-border);
        background: var(--ci-bg);
        color: var(--ci-text);
        border-radius: 999px;
        padding: 8px 12px;
      }
      .continue-it-pill.active,
      .continue-it-primary,
      .continue-it-launcher {
        background: var(--ci-primary);
        color: var(--ci-primary-text);
      }
      .continue-it-secondary,
      .continue-it-menu button {
        background: var(--ci-secondary);
        color: var(--ci-secondary-text);
      }
      .continue-it-danger {
        background: #b42318;
        color: #ffffff;
      }
      .continue-it-textarea,
      .continue-it-pre {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--ci-border);
        border-radius: 12px;
        padding: 12px;
        font: 13px/1.5 Arial, sans-serif;
        color: var(--ci-text);
        background: var(--ci-bg);
        margin-top: 10px;
      }
      .continue-it-textarea {
        min-height: 260px;
        resize: vertical;
      }
      .continue-it-pre {
        max-height: 220px;
        overflow: auto;
        white-space: pre-wrap;
      }
      .continue-it-warning-list {
        margin: 12px 0 0;
        padding-left: 18px;
        color: #b42318;
        font-size: 13px;
      }
      .continue-it-launcher-wrap {
        position: fixed;
        z-index: 2147483647;
        display: none;
      }
      .continue-it-launcher {
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
      }
      .continue-it-menu {
        position: absolute;
        right: 0;
        bottom: calc(100% + 8px);
        min-width: 180px;
        background: var(--ci-bg);
        border: 1px solid var(--ci-border);
        border-radius: 12px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
        padding: 8px;
        display: none;
      }
      .continue-it-menu.open {
        display: block;
      }
      .continue-it-menu button {
        width: 100%;
        text-align: left;
        margin: 0 0 6px;
      }
      .continue-it-menu button:last-child {
        margin-bottom: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function toast(message, tone = "default", duration = 3800) {
    ensureUIStyles();
    const el = document.createElement("div");
    el.className = "continue-it-toast";
    el.textContent = message;
    el.style.background = tone === "error"
      ? "#b42318"
      : tone === "success"
        ? "#067647"
        : tone === "warning"
          ? "#b54708"
          : "#344054";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  function mountLauncher({ id, label, getAnchor, actions }) {
    ensureUIStyles();
    const existing = document.getElementById(id);
    if (existing) {
      return existing;
    }

    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "continue-it-launcher-wrap";
    wrap.innerHTML = `
      <button type="button" class="continue-it-launcher">${label}</button>
      <div class="continue-it-menu"></div>
    `;

    const button = wrap.querySelector(".continue-it-launcher");
    const menu = wrap.querySelector(".continue-it-menu");
    actions.forEach((action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = action.label;
      item.addEventListener("click", async () => {
        menu.classList.remove("open");
        await action.onClick();
      });
      menu.appendChild(item);
    });

    function position() {
      const anchor = getAnchor();
      if (!anchor || !document.body.contains(anchor)) {
        wrap.style.display = "none";
        return;
      }

      wrap.style.display = "block";
      wrap.style.bottom = "20px";
      wrap.style.right = "20px";
      wrap.style.top = "auto";
      wrap.style.left = "auto";
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("open");
      position();
    });

    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target)) {
        menu.classList.remove("open");
      }
    });

    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    setInterval(position, 1200);

    document.body.appendChild(wrap);
    position();
    return wrap;
  }

  function createModal(id, title, subtitle) {
    ensureUIStyles();

    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "continue-it-overlay";
    overlay.innerHTML = `
      <div class="continue-it-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <h2>${title}</h2>
        ${subtitle ? `<p class="continue-it-muted">${subtitle}</p>` : ""}
        <div class="continue-it-modal-content"></div>
      </div>
    `;

    const content = overlay.querySelector(".continue-it-modal-content");
    function close() {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        close();
      }
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close();
      }
    });

    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);

    return { overlay, content, close };
  }

  window.ContinueItUI = {
    ensureUIStyles,
    toast,
    mountLauncher,
    createModal
  };
})();