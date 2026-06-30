const LAST_HANDOFF_KEY = "continueIt.lastHandoff";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "SAVE_HANDOFF") {
    chrome.storage.local.set({ [LAST_HANDOFF_KEY]: message.payload }, () => {
      sendResponse({ ok: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message || null });
    });
    return true;
  }

  if (message.type === "GET_HANDOFF") {
    chrome.storage.local.get([LAST_HANDOFF_KEY], (result) => {
      sendResponse({ ok: true, payload: result[LAST_HANDOFF_KEY] || null });
    });
    return true;
  }

  return false;
});