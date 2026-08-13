const runChecksButton = document.getElementById("runChecks");
const testChromeAiButton = document.getElementById("testChromeAi");
const checkedAtEl = document.getElementById("checkedAt");
const liveChecksEl = document.getElementById("liveChecks");
const testResultEl = document.getElementById("testResult");

const REQUIRED_OPTIONS = {
  expectedInputs: [{ type: "text" }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
};

function addCheck(label, state, detail) {
  const item = document.createElement("li");
  const badge = document.createElement("span");
  const body = document.createElement("div");
  const title = document.createElement("strong");
  const text = document.createElement("p");

  badge.className = `badge ${state}`;
  badge.textContent = state === "pass" ? "Pass" : state === "fail" ? "Fail" : state === "pending" ? "Checking" : "Review";
  title.textContent = label;
  text.textContent = detail;

  body.appendChild(title);
  body.appendChild(text);
  item.appendChild(badge);
  item.appendChild(body);
  liveChecksEl.appendChild(item);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown";
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function chromeVersionFromUserAgent() {
  const match = navigator.userAgent.match(/Chrome\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function setTestResult(message, state) {
  testResultEl.textContent = message;
  testResultEl.className = `test-result ${state}`;
  testResultEl.hidden = !message;
}

function sendToWorker(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "No response from background worker." });
      });
    } catch (error) {
      resolve({ ok: false, error: error?.message || "Failed to reach background worker." });
    }
  });
}

async function readStorageEstimate() {
  if (!navigator.storage || typeof navigator.storage.estimate !== "function") {
    addCheck("Browser storage estimate", "warn", "This browser did not expose navigator.storage.estimate(), so free profile storage cannot be estimated here.");
    return;
  }

  const estimate = await navigator.storage.estimate();
  const quota = Number(estimate.quota);
  const usage = Number(estimate.usage);
  const remaining = Number.isFinite(quota) && Number.isFinite(usage) ? quota - usage : NaN;
  const state = remaining >= 22 * 1024 * 1024 * 1024 ? "pass" : "warn";
  addCheck(
    "Profile storage estimate",
    state,
    `Estimated available browser storage is ${formatBytes(remaining)}. Chrome's documented requirement is at least 22 GB free on the profile volume for initial model setup.`
  );
}

async function runChecks() {
  runChecksButton.disabled = true;
  liveChecksEl.textContent = "";
  checkedAtEl.textContent = "Running checks...";

  try {
    const version = chromeVersionFromUserAgent();
    addCheck(
      "Chrome version",
      version >= 138 ? "pass" : "fail",
      version ? `Detected Chrome ${version}. Prompt API in extensions requires Chrome 138 or newer.` : "Could not detect a Chrome version from the user agent."
    );

    addCheck(
      "Extension secure context",
      window.isSecureContext ? "pass" : "fail",
      window.isSecureContext ? "This extension page is running in a secure context." : "Built-in AI APIs require a secure context."
    );

    addCheck(
      "Desktop platform hint",
      /Mac|Win|Linux|CrOS/.test(navigator.platform || "") ? "pass" : "warn",
      `Detected platform: ${navigator.platform || "unknown"}. Foundation-model APIs are not available on mobile Chrome.`
    );

    if (!globalThis.LanguageModel) {
      addCheck(
        "LanguageModel API exposure",
        "fail",
        "LanguageModel is undefined in this extension context. Enable the Chrome flags below, relaunch Chrome, and check chrome://on-device-internals."
      );
      await readStorageEstimate();
      return;
    }

    addCheck("LanguageModel API exposure", "pass", "LanguageModel exists in this extension context.");

    if (typeof LanguageModel.params === "function") {
      try {
        const params = await LanguageModel.params();
        addCheck(
          "Prompt API parameters",
          params ? "pass" : "warn",
          params
            ? `params() returned defaultTopK=${params.defaultTopK}, maxTopK=${params.maxTopK}, defaultTemperature=${params.defaultTemperature}, maxTemperature=${params.maxTemperature}.`
            : "params() returned no values. The API may be present but not fully initialized."
        );
      } catch (error) {
        addCheck("Prompt API parameters", "warn", `params() failed: ${error?.message || String(error)}`);
      }
    } else {
      addCheck("Prompt API parameters", "warn", "LanguageModel.params() is not exposed. This can indicate an unsupported or policy-limited Prompt API surface.");
    }

    try {
      const availability = await LanguageModel.availability(REQUIRED_OPTIONS);
      addCheck(
        "Text session availability",
        availability === "unavailable" ? "fail" : "pass",
        `LanguageModel.availability() returned "${availability}" for Continue It's text-to-English session options.`
      );
    } catch (error) {
      addCheck("Text session availability", "fail", `availability() failed: ${error?.message || String(error)}`);
    }

    await readStorageEstimate();
  } finally {
    checkedAtEl.textContent = `Last checked ${new Date().toLocaleString()}`;
    runChecksButton.disabled = false;
  }
}

async function testChromeAi() {
  testChromeAiButton.disabled = true;
  setTestResult("Testing Chrome built-in AI through the extension service worker...", "pending");

  const result = await sendToWorker({
    type: "continueIt.test",
    payload: {
      aiMode: "builtin",
      clientId: "builtin-ai-help"
    }
  });

  if (result && result.ok) {
    setTestResult("Chrome built-in AI responded successfully through the extension service worker.", "pass");
  } else {
    setTestResult(`Chrome built-in AI test failed: ${result?.error || "no response"}`, "fail");
  }
  testChromeAiButton.disabled = false;
}

runChecksButton.addEventListener("click", runChecks);
testChromeAiButton.addEventListener("click", testChromeAi);
void runChecks();
