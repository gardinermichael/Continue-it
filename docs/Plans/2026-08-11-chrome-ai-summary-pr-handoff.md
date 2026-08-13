---
title: "Chrome AI Summary and Knowledge Export PR Handoff"
date: "2026-08-11"
authors: ["Codex"]
purpose: "Review handoff for the stacked PR from agent/chrome-built-in-ai-summary onto agent/fix-devtools-csp-probe."
source_branch: "agent/chrome-built-in-ai-summary"
base_branch: "agent/fix-devtools-csp-probe"
---

# Chrome AI Summary and Knowledge Export PR Handoff

## Review Target

This branch is intended to be reviewed as a stacked PR against the earlier
`agent/fix-devtools-csp-probe` branch, not directly against upstream `main`.

The earlier branch already contains the Server AI backend configuration and the
quiet DevTools probe handler. This branch builds on top of it with Chrome
built-in AI robustness, project agent governance, local skills, and a session
knowledge export spec.

## What Changed

- Added a root `AGENTS.md` for this repository.
- Added the required output-mode prefix rule for future agent responses.
- Added repo-specific agent guidance for:
  - Manifest V3 architecture boundaries
  - Chrome built-in AI API usage
  - Server AI and BYOK privacy rules
  - session-first knowledge export direction
  - verification expectations
- Installed/project-staged local skills:
  - `.agents/skills/chrome-ai`
  - `.agents/skills/chrome-extensions`
  - `.agents/skills/built-in-ai`
  - `.agents/skills/to-spec`
- Added `docs/Plans/session-knowledge-repo-spec.md`, a full implementation
  plan for exporting sessions to a Git-backed, Obsidian-friendly LLM wiki.
- Expanded the export spec with lessons from bookmark organizers, AI chat
  importers/exporters, context-anchor systems, tab organizers, prompt-packet
  tools, and personal RAG/search systems.
- Added `docs/Plans/README.md` and `docs/index.jsonl` to index repo-local
  planning docs.
- Updated Chrome built-in AI summary handling in `background.js`:
  - reads `LanguageModel.params()` when available
  - uses `promptStreaming()` when available
  - logs `measureContextUsage()` when available
  - detects context overflow and routes the user toward Server AI or BYOK
  - destroys model sessions after use
- Updated `README.md` to explain why Continue it uses the Prompt API instead of
  Chrome's task-specific Summarizer API for comprehensive handoffs.
- Updated `.gitignore` to ignore `.DS_Store`.

## Why It Changed

The product direction is shifting from simple handoff export toward a durable
session knowledge repository. The central design premise is that Chrome built-in
AI can be useful even when it is weaker than hosted frontier models, provided
the extension supplies the missing structure:

- explicit plans
- immutable raw transcript saves
- manifests with hashes and token counts
- continuously updated handoff files
- verification gates
- rolling synthesis from saved artifacts

The new spec captures that architecture so future implementation can happen in
small, reviewable slices.

## Important Design Notes

- Chrome built-in AI should be treated as a bounded local worker, not as an
  autonomous publisher.
- Server AI remains separate from the extension. Shared provider keys must not
  be bundled into extension source.
- BYOK keys remain local extension settings and should only be sent to the
  configured provider.
- The session knowledge export plan separates:
  - `sessions/` for complete per-session folders
  - `raw/` for immutable transcripts
  - `projects/` for rolling project synthesis
  - `concepts/` for reusable knowledge pages
  - `skills/` for distilled procedures
  - `meta/` for manifests, changelogs, and health checks
- The spec includes source matrices for DeepWiki research across AI chat
  exporters, Chrome AI implementations, WebMCP examples, repo packagers,
  handoff systems, autoresearch loops, bookmark organizers, tab/context
  systems, prompt-packet tools, and personal search/RAG systems.
- The latest research pass added explicit guidance for:
  - dual JSON/Markdown exports
  - top-level indexes and metadata files
  - first-class reference/bookmark objects
  - URL normalization and deduplication
  - attachment preservation with relative links
  - source-bound annotation sidecars
  - canonical snapshot layers
  - background/offscreen write authority
  - local semantic and hybrid search
  - preview/approval gates for structural changes
  - backups before destructive reorganizations
  - RAG provenance capture
  - state-anchor handoffs

## Review Checklist

- Confirm the stacked PR base is `agent/fix-devtools-csp-probe`.
- Review `background.js` for current Chrome built-in AI API compatibility.
- Review `README.md` for accurate Prompt API vs Summarizer wording.
- Review `AGENTS.md` for repo governance and response-prefix expectations.
- Review `docs/Plans/session-knowledge-repo-spec.md` for product direction and
  scope boundaries.
- Review the spec's new bookmark/reference/context section and added matrix rows
  for Relai, ChatGPT exporters, SiftMarks, Context-Sync, MindVault, Context
  Anchor, promptPACK, TabBrain, Khoj, AI-MarkDone, and related bookmark tools.
- Generated multi-tool skill mirrors under `.bob`, `.bolt`, `.cline`, `.cursor`,
  `.github`, `.kilo`, `.roo`, and `output/` are intentionally ignored after the
  second-pass PR. Review the canonical `.agents/skills/*` folders instead.

## Validation

Recommended checks before merge:

```bash
node --check background.js
node --check server/server.js
```

Manual validation still required:

- Reload unpacked extension in Chrome.
- Use Chrome built-in AI mode on a supported Chrome profile.
- Confirm a normal-sized conversation summarizes.
- Confirm a large conversation produces a clear context-window fallback warning.
- Confirm Server AI and BYOK still work from the popup.

## Known Risks

- Chrome built-in AI APIs are still changing. Older examples use deprecated
  `window.ai` APIs; this branch intentionally uses the current `LanguageModel`
  path.
- MV3 service worker lifecycle can interrupt long-running work. Future Git
  bridge or rolling synthesis work may need an offscreen document or extension
  page.
- The session knowledge export spec is intentionally broad. Implementation
  should start with a narrow artifact builder and local zip/download flow before
  GitHub sync or autonomous synthesis.
- Generated skill mirrors are not canonical and should not be reviewed as source
  after the second-pass cleanup. Re-run the generator locally when those mirrors
  are needed for another tool.

## Next Implementation Slice

1. Add a session artifact builder that emits:
   - `session.json`
   - `transcript.jsonl`
   - `transcript.xml`
   - `summary.md`
   - `handoff.md`
   - `manifest.json`
2. Add a local zip/download export for one session folder.
3. Add stronger scroll-to-top diagnostics and top-proof metadata.
4. Add fixture-based tests for artifact shape.
5. Add optional GitHub sync only after local export artifacts are stable.
