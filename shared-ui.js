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
        position: relative;
        overflow: hidden;
      }
      .continue-it-launcher-label {
        position: relative;
        z-index: 1;
      }
      /* Progress fill inside the launcher button itself, so the button doubles
         as a progress bar while a long export is running. */
      .continue-it-launcher.is-busy::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--ci-progress, 0%);
        background: linear-gradient(90deg, #4f46e5, #8b5cf6);
        transition: width 0.3s ease, background 0.3s ease;
      }
      .continue-it-launcher.is-busy {
        background: #312e81;
        color: #ffffff;
      }
      .continue-it-launcher.is-busy.is-success::before {
        background: linear-gradient(90deg, #067647, #12b76a);
      }
      .continue-it-launcher.is-busy.is-error::before {
        background: linear-gradient(90deg, #b42318, #f04438);
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

      /* --- Long-running work indicator ------------------------------------
         Three cooperating layers, all pointer-events: none so the page stays
         usable: a desaturating scrim, a progress "light" tracing the viewport
         edge, and a status chip with the current phase and elapsed time. */
      /* Host box only — kept out of the page flow so no site rule targeting
         direct children of body can give it size or margins. */
      .continue-it-progress {
        position: fixed;
        inset: 0;
        z-index: 2147483644;
        pointer-events: none;
      }
      .continue-it-progress-scrim {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        /* Flat colour on purpose: a backdrop-filter here would promote the whole
           page to a composited layer while we are programmatically scrolling a
           long transcript, which is exactly when we can least afford the jank. */
        background: rgba(100, 116, 139, 0.22);
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .continue-it-progress-ring {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .continue-it-progress-ring svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .ci-ring-track {
        fill: none;
        stroke: rgba(99, 102, 241, 0.22);
        stroke-width: 3;
      }
      .ci-ring-beam {
        fill: none;
        stroke: #6366f1;
        stroke-width: 3;
        stroke-linecap: round;
        filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.85));
        transition: stroke-dasharray 0.35s ease, stroke 0.3s ease, opacity 0.2s ease;
        animation: ci-beam-pulse 1.8s ease-in-out infinite;
      }
      .continue-it-progress.is-success .ci-ring-beam {
        stroke: #12b76a;
        filter: drop-shadow(0 0 6px rgba(18, 183, 106, 0.85));
        animation: none;
      }
      .continue-it-progress.is-error .ci-ring-beam {
        stroke: #f04438;
        filter: drop-shadow(0 0 6px rgba(240, 68, 56, 0.85));
        animation: none;
      }
      .continue-it-progress-chip {
        position: fixed;
        right: 20px;
        bottom: 72px;
        z-index: 2;
        box-sizing: border-box;
        width: 300px;
        max-width: calc(100vw - 40px);
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid var(--ci-border);
        background: var(--ci-bg);
        color: var(--ci-text);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.24);
        font: 13px/1.45 Arial, sans-serif;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.22s ease, transform 0.22s ease;
      }
      .ci-chip-live {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      .continue-it-progress.is-visible .continue-it-progress-scrim,
      .continue-it-progress.is-visible .continue-it-progress-ring,
      .continue-it-progress.is-visible .continue-it-progress-chip {
        opacity: 1;
      }
      .continue-it-progress.is-visible .continue-it-progress-chip {
        transform: translateY(0);
      }
      .ci-chip-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ci-chip-spinner {
        flex: 0 0 auto;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(99, 102, 241, 0.28);
        border-top-color: #6366f1;
        animation: ci-spin 0.8s linear infinite;
      }
      .continue-it-progress.is-success .ci-chip-spinner,
      .continue-it-progress.is-error .ci-chip-spinner {
        border: 0;
        animation: none;
        font-size: 14px;
        line-height: 14px;
        text-align: center;
      }
      .continue-it-progress.is-success .ci-chip-spinner::before {
        content: "✓";
        color: #067647;
        font-weight: 700;
      }
      .continue-it-progress.is-error .ci-chip-spinner::before {
        content: "✕";
        color: #b42318;
        font-weight: 700;
      }
      .ci-chip-label {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ci-chip-elapsed {
        margin-left: auto;
        flex: 0 0 auto;
        font-variant-numeric: tabular-nums;
        color: var(--ci-muted);
        font-size: 12px;
      }
      .ci-chip-bar {
        height: 6px;
        margin-top: 10px;
        border-radius: 999px;
        background: var(--ci-secondary);
        overflow: hidden;
      }
      .ci-chip-bar-fill {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #4f46e5, #8b5cf6);
        transition: width 0.35s ease, background 0.3s ease;
      }
      .continue-it-progress.is-success .ci-chip-bar-fill {
        background: linear-gradient(90deg, #067647, #12b76a);
      }
      .continue-it-progress.is-error .ci-chip-bar-fill {
        background: linear-gradient(90deg, #b42318, #f04438);
      }
      .ci-chip-detail {
        margin-top: 8px;
        color: var(--ci-muted);
        font-size: 12px;
      }
      .ci-chip-detail:empty {
        display: none;
      }
      @keyframes ci-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes ci-beam-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.65; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ci-chip-spinner,
        .ci-ring-beam {
          animation: none;
        }
        .continue-it-progress-scrim,
        .continue-it-progress-ring,
        .continue-it-progress-chip,
        .ci-chip-bar-fill,
        .ci-ring-beam,
        .continue-it-launcher.is-busy::before {
          transition: none;
        }
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
      <button type="button" class="continue-it-launcher"><span class="continue-it-launcher-label">${label}</span></button>
      <div class="continue-it-menu"></div>
    `;
    wrap.dataset.idleLabel = label;

    const button = wrap.querySelector(".continue-it-launcher");
    const menu = wrap.querySelector(".continue-it-menu");
    actions.forEach((action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = action.label;
      item.addEventListener("click", async () => {
        menu.classList.remove("open");
        try {
          await action.onClick();
        } catch (error) {
          console.error("[Continue It] Unhandled error in", action.label, error);
          if (window.ContinueItUI && window.ContinueItUI.toast) {
            window.ContinueItUI.toast(`Error in "${action.label}": ${error?.message || String(error)}`, "error", 8000);
          }
        }
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

  const PROGRESS_ID = "continue-it-progress";
  const PROGRESS_TICK_MS = 400;
  // Per-tick share of the remaining distance to crawl through when a phase has
  // no measurable progress (an in-flight API call). Slow enough that a minute
  // long request keeps visibly moving instead of parking at the phase end.
  const CREEP_RATE = 0.02;

  function clamp01(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value < 0 ? 0 : value > 1 ? 1 : value;
  }

  function formatElapsed(ms) {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 100) {
      return `${totalSeconds}s`;
    }
    return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
  }

  // Turns the floating launcher button into its own progress bar. Kept separate
  // from createProgress so a caller can drive the button on its own if needed.
  function setLauncherBusy(launcherId, state) {
    if (!launcherId) {
      return;
    }
    const wrap = document.getElementById(launcherId);
    const button = wrap && wrap.querySelector(".continue-it-launcher");
    if (!button) {
      return;
    }
    const labelEl = button.querySelector(".continue-it-launcher-label") || button;
    if (!wrap.dataset.idleLabel) {
      wrap.dataset.idleLabel = labelEl.textContent;
    }

    if (!state || state.busy === false) {
      button.classList.remove("is-busy", "is-success", "is-error");
      button.style.removeProperty("--ci-progress");
      button.removeAttribute("aria-busy");
      labelEl.textContent = wrap.dataset.idleLabel;
      return;
    }

    button.classList.add("is-busy");
    button.classList.toggle("is-success", state.tone === "success");
    button.classList.toggle("is-error", state.tone === "error");
    button.setAttribute("aria-busy", state.tone ? "false" : "true");
    button.style.setProperty("--ci-progress", `${Math.round(clamp01(state.fraction) * 100)}%`);
    if (state.label) {
      labelEl.textContent = state.label;
    }
  }

  let activeProgress = null;

  /**
   * Persistent progress indicator for work that can take a long time (DOM
   * scanning plus an LLM round trip). Without it a slow API call is
   * indistinguishable from a frozen extension.
   *
   * Phases map onto slices of one overall bar, so the caller never has to think
   * about global percentages:
   *
   *   const progress = ui.createProgress({ launcherId, busyLabel: "Exporting" });
   *   progress.phase({ label: "Scanning", from: 0, to: 0.55 });
   *   progress.set(0.4, "120 messages found");
   *   progress.phase({ label: "Summarizing", from: 0.55, to: 0.95, creep: true });
   *   progress.succeed("Done");
   */
  function createProgress({ launcherId = null, busyLabel = "Working", label = "Working" } = {}) {
    ensureUIStyles();

    // Shut the previous one down properly — dropping the node alone would leave
    // its tick interval running against detached elements.
    if (activeProgress) {
      activeProgress.close();
    }
    const orphan = document.getElementById(PROGRESS_ID);
    if (orphan) {
      orphan.remove();
    }

    const host = document.createElement("div");
    host.id = PROGRESS_ID;
    host.className = "continue-it-progress";
    host.innerHTML = `
      <div class="continue-it-progress-scrim"></div>
      <div class="continue-it-progress-ring" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <rect class="ci-ring-track" pathLength="100"></rect>
          <rect class="ci-ring-beam" pathLength="100"></rect>
        </svg>
      </div>
      <div class="continue-it-progress-chip">
        <div class="ci-chip-top">
          <span class="ci-chip-spinner" aria-hidden="true"></span>
          <span class="ci-chip-label"></span>
          <span class="ci-chip-elapsed"></span>
        </div>
        <div class="ci-chip-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="ci-chip-bar-fill"></div>
        </div>
        <div class="ci-chip-detail"></div>
        <div class="ci-chip-live" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;

    const svg = host.querySelector(".continue-it-progress-ring svg");
    const rings = Array.from(host.querySelectorAll(".ci-ring-track, .ci-ring-beam"));
    const beam = host.querySelector(".ci-ring-beam");
    const labelEl = host.querySelector(".ci-chip-label");
    const elapsedEl = host.querySelector(".ci-chip-elapsed");
    const detailEl = host.querySelector(".ci-chip-detail");
    const liveEl = host.querySelector(".ci-chip-live");
    const barEl = host.querySelector(".ci-chip-bar");
    const barFillEl = host.querySelector(".ci-chip-bar-fill");

    const state = {
      label,
      detail: "",
      value: 0,
      from: 0,
      to: 1,
      creep: false,
      dots: 0,
      phaseStartedAt: Date.now(),
      slowHintAfter: 0,
      slowHint: "",
      terminal: false
    };
    let closed = false;
    let terminalTimeout = null;

    function sizeRing() {
      const width = Math.max(window.innerWidth || 0, 1);
      const height = Math.max(window.innerHeight || 0, 1);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      rings.forEach((ring) => {
        ring.setAttribute("x", "3");
        ring.setAttribute("y", "3");
        ring.setAttribute("width", String(Math.max(width - 6, 1)));
        ring.setAttribute("height", String(Math.max(height - 6, 1)));
        ring.setAttribute("rx", "10");
      });
    }

    function render() {
      const percent = clamp01(state.value) * 100;
      beam.setAttribute("stroke-dasharray", `${percent.toFixed(2)} 100`);
      beam.style.opacity = percent <= 0 ? "0" : "1";
      barFillEl.style.width = `${percent.toFixed(1)}%`;
      barEl.setAttribute("aria-valuenow", String(Math.round(percent)));

      const elapsed = Date.now() - state.phaseStartedAt;
      labelEl.textContent = state.terminal ? state.label : `${state.label}${".".repeat(state.dots)}`;
      elapsedEl.textContent = !state.terminal && elapsed >= 2000 ? formatElapsed(elapsed) : "";

      const showSlowHint = !state.terminal && state.slowHintAfter && elapsed >= state.slowHintAfter;
      detailEl.textContent = showSlowHint ? state.slowHint : state.detail;

      setLauncherBusy(launcherId, {
        busy: true,
        fraction: state.value,
        label: state.terminal ? state.label : `${busyLabel}${".".repeat(state.dots)}`,
        tone: state.terminal || null
      });
    }

    function announce() {
      liveEl.textContent = state.detail ? `${state.label}. ${state.detail}` : state.label;
    }

    function tick() {
      if (state.terminal) {
        return;
      }
      if (state.creep) {
        state.value += (state.to - state.value) * CREEP_RATE;
      }
      state.dots = (state.dots + 1) % 4;
      render();
    }

    let timer = setInterval(tick, PROGRESS_TICK_MS);
    window.addEventListener("resize", sizeRing);

    document.body.appendChild(host);
    sizeRing();
    render();
    announce();
    // Next frame, so the fade-in transition actually runs.
    requestAnimationFrame(() => host.classList.add("is-visible"));

    function close() {
      if (closed) {
        return;
      }
      closed = true;
      // Any later phase()/set()/succeed() call on this controller is a no-op, so
      // a superseded export cannot repaint the shared launcher button.
      state.terminal = state.terminal || "closed";
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (terminalTimeout) {
        clearTimeout(terminalTimeout);
        terminalTimeout = null;
      }
      window.removeEventListener("resize", sizeRing);
      setLauncherBusy(launcherId, { busy: false });
      host.classList.remove("is-visible");
      setTimeout(() => host.remove(), 300);
      if (activeProgress === controller) {
        activeProgress = null;
      }
    }

    function phase({ label: phaseLabel, detail = "", from, to, creep = false, slowHintAfter = 0, slowHint = "" }) {
      if (state.terminal || closed) {
        return;
      }
      if (phaseLabel) {
        state.label = phaseLabel;
      }
      state.detail = detail;
      state.from = Number.isFinite(from) ? clamp01(from) : state.to;
      state.to = Number.isFinite(to) ? clamp01(to) : state.to;
      // Never walk the bar backwards — a retreating bar reads as a bug.
      state.value = Math.max(state.value, state.from);
      state.creep = Boolean(creep);
      state.phaseStartedAt = Date.now();
      state.slowHintAfter = slowHintAfter;
      state.slowHint = slowHint;
      state.dots = 0;
      render();
      announce();
    }

    // `fraction` is progress within the current phase, 0..1.
    function set(fraction, detail) {
      if (state.terminal || closed) {
        return;
      }
      const target = state.from + (state.to - state.from) * clamp01(fraction);
      state.value = Math.max(state.value, target);
      if (typeof detail === "string") {
        state.detail = detail;
      }
      render();
    }

    function setDetail(detail) {
      if (state.terminal || closed) {
        return;
      }
      state.detail = detail || "";
      render();
    }

    function finish(tone, message, detail, holdMs) {
      if (state.terminal || closed) {
        return;
      }
      state.terminal = tone;
      state.creep = false;
      state.label = message;
      state.detail = detail || "";
      state.slowHintAfter = 0;
      if (tone === "success") {
        state.value = 1;
      }
      host.classList.add(tone === "success" ? "is-success" : "is-error");
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      render();
      announce();
      terminalTimeout = setTimeout(close, holdMs);
    }

    const controller = {
      phase,
      set,
      setDetail,
      succeed: (message = "Done", detail = "") => finish("success", message, detail, 1400),
      fail: (message = "Failed", detail = "") => finish("error", message, detail, 4000),
      close
    };

    activeProgress = controller;
    return controller;
  }

  window.ContinueItUI = {
    ensureUIStyles,
    toast,
    mountLauncher,
    createModal,
    setLauncherBusy,
    createProgress
  };
})();
