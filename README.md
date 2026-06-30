# Continue it

> Carry your AI conversation to any platform — without losing context.

**Continue it** is a zero-dependency Chrome extension (Manifest V3) that extracts a full conversation from one AI chat platform and packages it into a portable prompt you can drop into any other platform — instantly resuming where you left off.

---

## What it does

When you're deep in a conversation with Claude, ChatGPT, Gemini, Grok, or Perplexity and want to switch platforms (or start a fresh session while keeping context), Continue it:

1. **Scrolls through and captures** your entire conversation history from the page DOM
2. **Generates an intelligent summary** of the thread — task, requirements, decisions, blockers, files, timeline
3. **Packages the context** into a prompt (or a sequence of chunks for long conversations) ready to paste into any target LLM
4. **Tracks chunk progress** in the popup so you can send large transcripts in staged batches

---

## Supported platforms

| Platform | Extract from | Import to |
|---|---|---|
| Claude | claude.ai | ✓ |
| ChatGPT | chatgpt.com, chat.openai.com | ✓ |
| Gemini | gemini.google.com | ✓ |
| Grok | grok.com, x.com/i/grok | ✓ |
| Perplexity | perplexity.ai | ✓ |

---

## Features

### Conversation extraction
- Auto-scrolls up to 80 steps (700 px each) to load the full chat history
- Role detection via DOM attributes, ARIA labels, and keyword heuristics (7-level parent scan)
- Deduplication by content hash — no repeated messages even with dynamic loading
- Noise filtering strips buttons, UI labels, and short non-message text
- Stability detection stops early when no new messages appear across multiple scroll steps

### Intelligent summarization
Three verbosity levels — **short**, **medium** (default), **detailed** — each producing:

| Section | What it captures |
|---|---|
| Task | Primary objective + current request |
| Timeline | Sampled messages across the conversation arc |
| Key requirements | Scored user-intent sentences |
| Assistant findings | Scored assistant insights and outputs |
| File references | Paths, filenames, CSS selectors, backtick tokens |
| Blockers | Error and problem statements |
| Decisions | Choices discussed and confirmed |
| Next action | Recommended continuation prompt |

Sentences are scored by length, position, message order, and keyword relevance before selection.

### Export modes

**Direct import** (≤ 6,500 tokens)
Single prompt with header + summary + chunk digest + import instructions. Paste once, continue.

**Staged import** (> 6,500 tokens)
- A starter prompt the target AI acknowledges first
- Transcript divided into ~12 KB chunks sent one at a time
- The popup's **Copy next chunk** button advances the cursor automatically

### Popup dashboard
- Stats: source platform, captured-at timestamp, message counts, chunk progress
- Summary mode selector (persisted to storage)
- Editable summary and prompt previews
- Buttons: copy recommended prompt, copy next chunk, reset chunk queue, download JSON, clear handoff

### Storage
All data lives in `chrome.storage.local` — nothing leaves the browser.

| Key | Contents |
|---|---|
| `continueIt.latestHandoff` | Full handoff object (JSON) |
| `continueIt.summaryMode` | Preferred verbosity level |
| `continueIt.chunkCursor` | Per-handoff chunk index for staged imports |
| `continueIt.handoffHistory` | Last 10 exports (metadata only) |

---

## Installation

> Continue it is an unpacked extension — no Chrome Web Store listing yet.

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `Continue it` folder
6. The extension icon appears in your toolbar

Supports any Chromium-based browser that handles Manifest V3: Chrome, Edge, Brave, Arc.

---

## How to use

### Exporting a conversation

1. Open any supported AI chat page with an active conversation
2. Click the **Export Context** button that appears on the right side of the page
3. The extension scrolls through and captures the full thread
4. A modal opens showing:
   - Conversation stats (messages, roles, estimated tokens, chunks)
   - Editable summary (switch mode to regenerate)
   - Recommended prompt or chunk-by-chunk controls
5. Click **Copy recommended prompt** (or download the raw JSON)

### Importing into a new platform

**Short conversations (direct mode):**
- Paste the copied prompt into the target AI's chat input and send

**Long conversations (staged mode):**
1. Paste the **starter prompt** and send — the AI acknowledges the incoming context
2. Open the extension popup
3. Click **Copy next chunk** → paste → send
4. Repeat until all chunks are sent
5. The target AI now has the full conversation history reconstructed

### Popup controls

| Button | Action |
|---|---|
| Copy recommended prompt | Copies the smart-selected prompt (direct or starter) |
| Copy next chunk | Copies next transcript chunk and advances the cursor |
| Reset chunk queue | Resets cursor to chunk 0 |
| Download JSON | Downloads the full handoff as a `.json` file |
| Clear saved handoff | Wipes the current handoff from storage |

---

## Architecture

```
Continue it/
├── manifest.json          # Extension config (MV3), permissions, host permissions
├── background.js          # Service worker — SAVE_HANDOFF / GET_HANDOFF message bus
├── provider-config.js     # Provider registry (selectors, role hints per platform)
├── shared-handoff.js      # Core data model, summarizer, chunker, storage API
├── shared-ui.js           # Toast, modal, and launcher button components
├── content-site.js        # Generic content script injected on all supported sites
├── content-claude.js      # Claude-specific extraction overrides
├── content-chatgpt.js     # ChatGPT-specific composer insertion
├── content-common.js      # Legacy utility file (superseded by shared-handoff.js)
├── popup.html             # Popup UI markup
├── popup.css              # Popup styles
└── popup.js               # Popup logic and event handlers
```

### Content script load order

```
provider-config.js   →  shared-handoff.js  →  shared-ui.js  →  content-site.js
(provider registry)      (data model/API)      (UI library)     (button + modal)
```

### Message protocol (content ↔ background)

```js
// Save a captured handoff
chrome.runtime.sendMessage({ type: "SAVE_HANDOFF", payload: handoff }, cb)

// Retrieve the latest handoff
chrome.runtime.sendMessage({ type: "GET_HANDOFF" }, cb)

// Response shape
{ ok: true, payload?: any } | { ok: false, error: string }
```

### Handoff schema (v2)

```js
{
  schemaVersion: 2,
  id: "handoff_<timestamp>_<hash>",
  source: "Claude" | "ChatGPT" | "Gemini" | "Grok" | "Perplexity",
  createdAt: "<ISO 8601>",
  pageTitle: string,
  pageUrl: string,
  summaryMode: "short" | "medium" | "detailed",
  summary: string,
  messages: [{ id, role, text }],
  stats: {
    totalMessages, userMessages, assistantMessages,
    unknownMessages, totalCharacters, estimatedTranscriptTokens
  },
  diagnostics: { hitStepLimit, scanSteps },
  warnings: string[],
  detectedFiles: string[]
}
```

---

## Key limits

| Limit | Value |
|---|---|
| Max scroll steps per extraction | 80 |
| Scroll step size | 700 px |
| Direct import token threshold | 6,500 tokens |
| Transcript chunk size | ~12,000 characters |
| Storage warning threshold | 4 MB |
| Handoff history kept | 10 entries |

---

## Development

No build step, no dependencies.

```bash
# Edit any file directly, then reload the extension:
# chrome://extensions/ → Continue it → ↺ (reload icon)
```

The extension is plain ES6+ JavaScript — no TypeScript, no bundler, no npm.

To test on a platform, navigate to a chat page with an active conversation and trigger the **Export Context** button.

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist handoffs and chunk cursors across sessions |
| `unlimitedStorage` | Allow large conversation exports without hitting the default 5 MB quota |
| `clipboardWrite` | Copy prompts and chunks to clipboard |
| Host permissions (8 domains) | Inject content scripts on supported AI platforms |

No network requests are made. No data is sent anywhere outside your browser.

---

## Version

**0.6.0** — Manifest V3, schema v2
