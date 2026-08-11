# AGENTS

Last updated: 2026-08-11

This is the canonical instruction file for agents working in this repository.
Prefer updating this file over creating duplicate tool-specific instruction
files.

## Output Mode Prefix

Begin every assistant text response with exactly one of these mode prefixes on
its own line, matching the current activity:

- `planning> ` — planning, exploring, designing, or proposing approaches before
  changes.
- `act> ` — executing or implementing: editing files, running commands, making
  changes.
- `review> ` — reviewing, summarizing results, or reporting completed work.
- `error> ` — reporting a failure, blocker, or problem encountered.

Use exactly one prefix per response. If the mode changes mid-response, switch by
starting a new line with the new prefix.

## Project

Continue it is a Manifest V3 Chrome extension for exporting long AI chat
conversations from Claude, ChatGPT, Gemini, Grok, and Perplexity into portable
handoffs. It also includes an optional local/shared Node backend for Server AI.

Primary files:

- `manifest.json` — MV3 permissions, host permissions, content script order.
- `background.js` — extension service worker; AI summary routing and Chrome
  built-in AI calls.
- `content-site.js` — injected page capture, scroll/load workflow, modal launch.
- `provider-config.js` — supported AI site selectors and role hints.
- `shared-handoff.js` — handoff schema, local summarizer, chunking, storage.
- `shared-ai.js` — AI modes, provider settings, permissions, background calls.
- `shared-ui.js` — reusable extension UI helpers.
- `popup.html`, `popup.css`, `popup.js` — extension popup controls.
- `server/server.js` — optional Express backend for Server AI.
- `docs/Plans/` — repo-local plans and specs.

## Operating Style

Use these rules from the Karpathy-style guidance:

- Think before editing. State assumptions when they matter.
- Prefer the smallest change that solves the requested problem.
- Touch only files that are directly in scope.
- Match the existing plain JavaScript style. Do not add a build system unless
  the task explicitly calls for one.
- Do not refactor adjacent code, comments, formatting, or dead code just because
  you noticed it.
- If the request is ambiguous and the wrong interpretation would be costly, ask
  before changing files.
- Define success criteria for nontrivial work and verify against them.

Every changed line should trace back to the user request, the active spec, or a
bug found while implementing that request.

## Planning

For nontrivial features, write or update a plan/spec before broad edits.

- Use `docs/Plans/` for repo-local plans, specs, and cross-session design work.
- Keep plans concrete: context, files, steps, verification, and known risks.
- Prefer markdown task lists for executable plans.
- Update the plan as implementation discovers important new facts.
- Do not bury project handoffs or large design decisions in chat only.

The current session knowledge export direction is captured in
`docs/Plans/session-knowledge-repo-spec.md`.

## Skills And References

Before changing Chrome extension APIs, Chrome built-in AI, or Web Store-facing
behavior, read the relevant local skills if present:

- `.agents/skills/chrome-extensions/SKILL.md`
- `.agents/skills/chrome-ai/SKILL.md`
- `.agents/skills/built-in-ai/SKILL.md`
- `.agents/skills/to-spec/SKILL.md` when turning discussion into specs

Use these skills as project context, not as permission to make broad unrelated
changes.

## Architecture Rules

- Keep content scripts focused on DOM capture, page interaction, and UI
  injection.
- Keep cross-origin provider calls and Chrome built-in AI calls in
  `background.js` or another extension context with the right permissions.
- Preserve content script load order from `manifest.json`:
  `provider-config.js`, `shared-handoff.js`, `shared-ai.js`, `shared-ui.js`,
  `content-site.js`.
- Treat `shared-handoff.js` as the handoff data contract. Schema changes need
  explicit compatibility handling.
- Treat `shared-ai.js` as the unified client boundary for AI modes and settings.
- Keep the extension usable in No AI mode. AI failures must fall back to local
  summaries with clear warnings.
- Do not put provider API keys or shared secrets in extension source.
- `.env` is local secret configuration for the optional server and must stay
  untracked.

## Chrome Built-In AI

- Use current Chrome built-in AI APIs, not deprecated examples. Prefer
  `LanguageModel`, `LanguageModel.availability()`, `LanguageModel.params()`,
  `LanguageModel.create()`, `prompt()`, `promptStreaming()`,
  `measureContextUsage()`, and `destroy()` where available.
- Record availability, context overflow, and fallback warnings in generated
  handoffs.
- Chrome built-in AI is a bounded local worker. Use it for summarization,
  classification, extraction, compression, and handoff drafting. Do not rely on
  it for irreversible publishing or unreviewed GitHub writes.
- Destroy sessions after use to avoid leaking memory in long-running extension
  sessions.

## Server AI And BYOK

- Server AI means the configured backend owns provider credentials. Users only
  avoid keys when they point at a backend someone else operates.
- BYOK keys live in extension local storage and are sent only to the configured
  provider endpoint.
- Do not bundle the server or shared provider keys into the extension package.
- If changing `server/server.js`, preserve `/health`,
  `POST /api/summarize`, quota behavior, and the quiet 204 handler for
  `/.well-known/appspecific/com.chrome.devtools.json`.

## Export And Knowledge-Repo Direction

The planned next architecture is session-first and wiki-friendly:

- Each exported session gets its own folder.
- Raw transcripts are immutable and duplicated into a raw source layer.
- Session summaries, immediate handoffs, produced documents, and references are
  separate artifacts.
- Manifests should include hashes, token counts, capture diagnostics, backend
  used, warnings, and synthesis status.
- Rolling synthesis should operate from saved files, not from model memory.
- Weak/local AI work should be guided by explicit plans, persisted outputs,
  verification gates, and resumable handoff files.

## Verification

There is no full automated extension test suite yet. Use the strongest practical
checks for the files you touch:

- For JavaScript changes, run syntax checks where possible, for example
  `node --check background.js` or the touched server/content file.
- For server changes, run or smoke-test `npm start` with a safe local `.env`
  when practical, then check `/health`.
- For extension behavior, reload the unpacked extension in Chrome and manually
  test the affected provider flow when browser validation is required.
- For docs-only changes, verify links/paths and read the rendered markdown shape.

If you cannot run the relevant check, say so in the final response.

## Git And Safety

- The worktree may contain user changes. Do not revert, delete, or reformat
  files you did not intentionally touch.
- Check `git status` before committing or summarizing work.
- Keep commits scoped to the confirmed task.
- Do not commit unless the user explicitly asks for a commit.
- Do not remove untracked agent/tool directories unless the user explicitly asks.

## Avoid

- Broad rewrites of the extension architecture without a plan.
- New dependencies for the extension path unless the benefit is concrete.
- Hidden network calls in No AI or Chrome built-in AI mode.
- Storing secrets in exported artifacts, docs, screenshots, or extension files.
- Polished summaries that hide incomplete transcript capture.
- Treating browser examples that use deprecated `window.ai` APIs as copy-paste
  implementation targets.
