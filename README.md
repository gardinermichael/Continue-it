# Continue it

> Carry your AI conversation to any platform — without losing context.

**Continue it** is a zero-dependency Chrome extension (Manifest V3) that extracts a full conversation from one AI chat platform and packages it into a portable prompt you can drop into any other platform — instantly resuming where you left off.

---

## What it does

When you're deep in a conversation with Claude, ChatGPT, Gemini, Grok, or Perplexity and want to switch platforms (or start a fresh session while keeping context), Continue it:

1. **Scrolls through and captures** your entire conversation history from the page DOM
2. **Generates a summary** of the thread — task, requirements, decisions, blockers, files, timeline. Choose one of three modes: **local (no AI)**, **shared Server AI** (5 free/day), or **your own API key** (unlimited) — see [AI summaries](#ai-summaries-three-modes)
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

Sentences are scored by length, position, message order, and keyword relevance before selection. This local summary is always produced as a baseline; the AI modes below refine it into a higher-quality handoff.

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

| Key | Contents |
|---|---|
| `continueIt.latestHandoff` | Full handoff object (JSON) |
| `continueIt.summaryMode` | Preferred verbosity level |
| `continueIt.chunkCursor` | Per-handoff chunk index for staged imports |
| `continueIt.handoffHistory` | Last 10 exports (metadata only) |
| `continueIt.ai.mode` | AI summary mode: `none` / `server` / `byok` |
| `continueIt.ai.serverUrl` | Shared backend URL (Server AI mode) |
| `continueIt.ai.byokBaseUrl` / `byokModel` / `byokApiKey` / `byokProvider` | Your own provider config |
| `continueIt.clientId` | Anonymous id used for the Server AI daily quota |

Handoff data lives in `chrome.storage.local`. In **No AI** mode nothing ever leaves the browser. In **Server AI** / **Your own key** modes, a compacted summary of the conversation is sent to the endpoint you choose (see below).

---

## AI summaries (three modes)

Pick a mode in the popup under **AI summary mode**. All three produce the same portable handoff; they differ only in how the summary is written.

| Mode | Quality | Cost | Privacy | Setup |
|---|---|---|---|---|
| **No AI** (default) | Good (local heuristic) | Free | Fully local, offline | None |
| **Server AI** | Better (real LLM) | Free, **5 exports / 24h** | Summary sent to the shared backend | None for the user |
| **Your own API key** | Best (any model you like) | Free on the providers below | Summary sent to your chosen provider | Paste a key |

If an AI request ever fails (rate limit, bad key, network), the extension automatically falls back to the local summary and adds a warning — an export never breaks.

### Your own API key — free OpenAI-compatible providers

Any OpenAI-compatible endpoint works. Create a key (most need no credit card), pick it in the popup, paste the key, and click **Save AI settings** (this also grants the extension permission to reach that host). Use **Test connection** to verify.

| Provider | Base URL | Example free model | Get a key |
|---|---|---|---|
| **OpenRouter** | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct:free` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Groq** (fastest) | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | [console.groq.com/keys](https://console.groq.com/keys) |
| **Cerebras** (highest volume) | `https://api.cerebras.ai/v1` | `llama-3.3-70b` | [cloud.cerebras.ai](https://cloud.cerebras.ai/) |
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.1-70b-instruct` | [build.nvidia.com](https://build.nvidia.com/) |
| **Mistral** | `https://api.mistral.ai/v1` | `mistral-small-latest` | [console.mistral.ai](https://console.mistral.ai/api-keys/) |

Free-tier limits change often — verify the current numbers on each provider's site. Keys are stored only in `chrome.storage.local` on your machine and are sent only to the provider you configured.

### Server AI — running the shared backend (for maintainers)

The Server AI mode lets you offer smart summaries to users without them needing a key, capped at **5 exports per 24h per user** (by anonymous client id + IP) so it stays cheap.

```bash
cd server            # from the repo root
npm install          # installs express, cors, dotenv (once, at repo root)
cp .env.example .env # then edit .env
npm start
```

Configure `.env` with any **free** OpenAI-compatible provider so it costs you nothing:

```bash
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-...            # your key, never exposed to users
OPENAI_MODEL=meta-llama/llama-3.3-70b-instruct:free
DAILY_LIMIT=5                       # exports per window
RATE_WINDOW_HOURS=24
```

Then set the **Server URL** in the popup (default `http://localhost:8787`) and choose **Server AI**. Deploy the server anywhere (Render, Railway, Fly, a VPS) and point the popup at that URL.

> The in-memory rate limiter is per-instance and resets on restart. For a hardened multi-instance deployment, back it with Redis or a database.

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
├── background.js          # Service worker — performs AI summarize requests (Server AI + BYO)
├── provider-config.js     # Provider registry (selectors, role hints per platform)
├── shared-handoff.js      # Core data model, local summarizer, chunker, storage API
├── shared-ai.js           # Unified AI client — modes, provider presets, settings, permissions
├── shared-ui.js           # Toast, modal, and launcher button components
├── content-site.js        # Generic content script injected on all supported sites
├── popup.html/.css/.js    # Popup UI (stats, AI mode selector, handoff controls)
└── server/
    └── server.js          # Optional shared backend — OpenAI-compatible upstream + rate limiter
```

### Content script load order

```
provider-config.js  →  shared-handoff.js  →  shared-ai.js  →  shared-ui.js  →  content-site.js
(provider registry)     (data model/API)      (AI client)      (UI library)     (button + modal)
```

### AI request flow

The content script never calls an AI provider directly (page CSP/CORS would block it on strict
sites). Instead it hands a compacted summary to the **background service worker**, which holds the
host permission and makes the cross-origin request:

```js
// content-site.js → shared-ai.js → background.js
chrome.runtime.sendMessage({ type: "continueIt.summarize", payload }, cb)
// → Server AI: POST <serverUrl>/api/summarize   (with x-continue-it-client header)
// → Your key:  POST <baseUrl>/chat/completions  (Authorization: Bearer <key>)

// Response shape
{ ok, used, summary, quota?: { limit, remaining, resetAt }, error }
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
| `optional_host_permissions` | Requested only when you enable Server AI or your own API key — grants access to that one endpoint |

In **No AI** mode, no network requests are made and no data leaves your browser. In **Server AI** or **Your own API key** mode, a compacted summary is sent only to the endpoint you configured, and the extension asks for permission to reach that host at the moment you save the setting.

---

## Version

**0.7.0** — Manifest V3, schema v2. Adds three AI summary modes (local / Server AI with 5-per-day quota / bring-your-own OpenAI-compatible key) and an optional rate-limited backend.
