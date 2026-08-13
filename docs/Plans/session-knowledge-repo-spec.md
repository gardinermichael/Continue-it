---
title: "Session Knowledge Repository Export Spec"
date: "2026-08-11"
authors: ["Codex"]
purpose: "Plan a Chrome extension workflow that captures AI chat sessions into a Git-backed, wiki-friendly knowledge repository."
source_files:
  - "/Users/m/Downloads/revivalstack-ai-chat-exporter-8a5edab282632443.txt"
  - "https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=en"
  - "https://mcp.deepwiki.com/mcp"
  - "https://developer.chrome.com/docs/ai/prompt-api"
  - "https://developer.chrome.com/docs/ai/summarizer-api"
  - "https://deepwiki.com/nico-martin/gemma4-browser-extension"
  - "https://deepwiki.com/mrauter1/GitPreProcess"
  - "https://deepwiki.com/atjsh/llmlingua-2-js"
  - "https://deepwiki.com/kiro0x/five-mcp"
  - "https://deepwiki.com/ulyssestenn/funes"
  - "https://deepwiki.com/adam-s/cordyceps"
  - "https://deepwiki.com/yamadashy/repomix"
  - "https://deepwiki.com/coderamp-labs/gitingest"
  - "https://deepwiki.com/leonhartX/gas-github"
  - "https://deepwiki.com/natsu1211/deepwiki-skill"
  - "https://deepwiki.com/saharmor/sidekick-dev-web"
  - "https://deepwiki.com/REMvisual/claude-handoff"
  - "https://deepwiki.com/wanshuiyin/Auto-claude-code-research-in-sleep"
  - "https://deepwiki.com/karpathy/autoresearch"
  - "https://deepwiki.com/gaasher/Agent-Loop-Skills"
  - "https://deepwiki.com/jmilinovich/goal-md"
  - "https://deepwiki.com/pzqpzq/Principia"
  - "https://deepwiki.com/davidondrej/jailbreak-autoresearch"
  - "https://deepwiki.com/greyhaven-ai/autocontext"
  - "https://deepwiki.com/uditgoenka/autoresearch"
  - "https://deepwiki.com/wanshuiyin/Anti-Autoresearch"
  - "https://deepwiki.com/Rescenix/ResceneAgent"
  - "https://deepwiki.com/supratikpm/gemini-autoresearch"
  - "https://deepwiki.com/revivalstack/ai-chat-exporter"
  - "https://deepwiki.com/Mazen-Embaby/gogo-va-extension"
  - "https://deepwiki.com/itamaker/go-chrome-ai"
  - "https://deepwiki.com/donpark/chrome-ai-tools"
  - "https://deepwiki.com/7Xme/chrome-ai-learning-assistant"
  - "https://deepwiki.com/moerasermax/Tools_ForSharing"
  - "https://deepwiki.com/matoliva/grammar-ai"
  - "https://deepwiki.com/V-Gutierrez/browser-llm-lab"
  - "https://deepwiki.com/oliuntangled/webmcp-gen"
  - "https://deepwiki.com/airwomandivanbed693/gemini-nano-chrome"
  - "https://deepwiki.com/kirillpolevoy/relai"
  - "https://deepwiki.com/FdezRomero/chatgpt-exporter"
  - "https://deepwiki.com/Edmon02/bookmark-ai-organizer"
  - "https://deepwiki.com/Superkikim/nexus-ai-chat-importer"
  - "https://deepwiki.com/daugaard47/ChatGPT_Conversations_To_Markdown"
  - "https://deepwiki.com/Lling0000/SiftMarks"
  - "https://deepwiki.com/Vineetpandey0/Context-Sync"
  - "https://deepwiki.com/rathi-yash/MindVault-AI-Bookmarker"
  - "https://deepwiki.com/andrewjtyo-glitch/context-anchor"
  - "https://deepwiki.com/LumenHelixLab/promptPACK"
  - "https://deepwiki.com/redzumi/ai-ai-bookmarks"
  - "https://deepwiki.com/ooye-sanket/Deja-vu"
  - "https://deepwiki.com/kyruntime/bookmark-organizer"
  - "https://deepwiki.com/ndg8743/TabBrain"
  - "https://deepwiki.com/khoj-ai/khoj"
  - "https://deepwiki.com/zhaoliangbin42/AI-MarkDone"
---

# Session Knowledge Repository Export Spec

## Problem Statement

Users have long AI conversations across ChatGPT, Claude, Gemini, Grok,
Perplexity, and similar browser products. Those conversations often contain
requirements, decisions, code, references, generated documents, rejected
approaches, and handoff state. Browser UIs virtualize old messages and often
only expose the latest loaded portion of a conversation, so an export that does
not intentionally scroll to the beginning can silently lose the earliest
context.

The current extension can capture a conversation and create a portable handoff,
but the next product goal is larger: preserve each session as a Git-backed,
human-readable and machine-readable knowledge unit. Each session should retain
the full raw transcript, a pretty GitHub/Obsidian-readable summary, an immediate
handoff, any produced documents, any referenced sources, and enough metadata for
later rolling synthesis into projects, concepts, skills, and research indexes.

The user wants this organized like an LLM wiki: raw sources remain immutable,
session-level notes are compiled from those sources, project and concept pages
are synthesized over time, and every durable claim remains traceable back to the
source session.

## Solution

Build a session knowledge export workflow around three outputs:

1. **Full export**: complete transcript plus metadata, diagnostics, attachments,
   references, produced files, and hashes.
2. **Summary export**: GitHub/Obsidian-friendly session summary with frontmatter,
   tags, wikilinks, source provenance, and a concise but complete narrative.
3. **Immediate handoff export**: continuation-focused handoff optimized for the
   next AI session, including current goal, exact state, open blockers, and next
   action.

Each exported session becomes a directory:

```text
sessions/
  2026-08-11-chatgpt-title/
    session.json
    transcript.jsonl
    transcript.xml
    summary.md
    handoff.md
    manifest.json
    produced/
      ...
    references/
      ...
```

The same immutable raw transcript is also copied or indexed into a raw source
layer so future agents can synthesize skills and higher-level knowledge without
rewriting the session folder:

```text
raw/
  sessions/
    2026/
      08/
        2026-08-11-chatgpt-title.transcript.jsonl
```

Compiled knowledge lives separately:

```text
projects/
  continue-it/
    continue-it.md
    session-index.md
    handoff.md
    synthesis/
      chrome-ai-session-capture.md

concepts/
  chrome-built-in-ai.md
  browser-transcript-virtualization.md
  git-backed-llm-wiki.md

skills/
  chrome-ai-session-export.md

meta/
  manifest.json
  changelog.md
  health/
```

The extension owns browser capture and export artifact creation. A repo-side
maintenance process owns rolling synthesis, manifest refreshes, Git commits,
health checks, and optional MCP/WebMCP integrations.

## Core Thesis

Chrome built-in AI models should not be treated like one-shot frontier models.
The product should make weaker local models useful by giving them a narrow job,
an explicit plan, durable files, and a recoverable loop. The model does not need
to remember the whole project if the extension saves each step into a
well-structured repository.

The loop should work like this:

1. Capture the page state and transcript.
2. Write immutable raw files.
3. Generate or update a small handoff file.
4. Generate a session summary with provenance and tags.
5. Update a manifest with hashes, token counts, capture diagnostics, and open
   work.
6. Run a cheap verification pass over required files and links.
7. Save or commit the artifact package.
8. Resume the next pass from the files, not from model memory.

This is the practical bridge between Chrome built-in AI and larger agentic
workflows. The browser model can summarize, classify, compress, extract
references, and draft handoffs because every output is immediately externalized
and checked. Larger Server AI, BYOK, MCP, or repo-side agents can later consume
the same saved state for deeper synthesis.

## User Stories

1. As a user, I want a full transcript export, so that no conversation context is
   lost.
2. As a user, I want a summary export, so that I can review a session quickly on
   GitHub.
3. As a user, I want an immediate handoff export, so that a new AI session can
   continue work without re-reading everything.
4. As a user, I want every session in its own directory, so that related files do
   not get scattered.
5. As a user, I want produced documents saved under the session, so that code,
   plans, specs, prompts, and generated artifacts stay attached to their origin.
6. As a user, I want referenced sources saved under the session, so that links,
   docs, PDFs, and repo references are available later.
7. As a user, I want raw transcripts copied into a raw source layer, so that the
   wiki can be rebuilt or resynthesized later.
8. As a user, I want session summaries synthesized into project pages, so that
   related sessions compound into useful project memory.
9. As a user, I want references and produced documents to feed concept pages, so
   that repeated ideas become reusable knowledge.
10. As a user, I want sessions tagged and linked, so that Obsidian graph and
    GitHub search both work well.
11. As a user, I want the browser to scroll to the top automatically, so that I
    do not have to remember a manual pre-export step.
12. As a user, I want the extension to track whether the beginning was captured,
    so that it can warn or retry when the transcript is incomplete.
13. As a user, I want transcript view or verbose view preferred, so that the
    exporter captures complete text instead of compressed UI cards.
14. As a user, I want capture diagnostics, so that I can tell whether the export
    hit a scroll limit, missed roles, or stopped early.
15. As a user, I want machine-readable transcripts, so that scripts and agents can
    process sessions without parsing Markdown.
16. As a user, I want pretty Markdown summaries, so that humans can read sessions
    directly in GitHub.
17. As an Obsidian user, I want frontmatter and wikilinks, so that exported
    sessions connect into a graph.
18. As an AI agent, I want a manifest with hashes and token counts, so that I can
    skip unchanged files and choose the right processing tier.
19. As an AI agent, I want chunk maps for long transcripts, so that I can avoid
    missing middle context.
20. As an AI agent, I want rolling handoff files, so that I can resume from the
    latest validated state rather than the latest chat tail.
21. As a user, I want one session export to be one reviewable Git change, so that
    I can inspect and revert it cleanly.
22. As a user, I want GitHub sync, so that session knowledge is preserved outside
    browser storage.
23. As a user, I want safe GitHub authentication, so that tokens are not exposed
    in exported artifacts.
24. As a user, I want explicit commit boundaries, so that each session can become
    a meaningful commit.
25. As a user, I want rolling analysis only after enough sessions exist, so that
    synthesis is based on evidence rather than one-off guesses.
26. As a user, I want rolling synthesis to be bounded and logged, so that agents
    do not loop forever.
27. As a user, I want references to DeepWiki and MCP sources preserved, so that
    later agents can revisit the source reasoning.
28. As a user, I want Chrome built-in AI used when appropriate, so that local,
    private summaries work on supported devices.
29. As a user, I want Server AI or BYOK fallback, so that large handoffs and
    unsupported Chrome AI states still work.
30. As a user, I want language and context limits detected, so that the exporter
    can choose the right summarization backend.
31. As a user, I want a health check over the knowledge repo, so that broken
    links, stale manifests, missing raw files, and orphaned summaries are caught.
32. As a user, I want artifact and reference classification, so that screenshots,
    code, docs, URLs, and generated files are searchable by type.
33. As a user, I want future skill synthesis, so that repeated session patterns
    can become reusable agent skills.
34. As a developer, I want tests at the export-package seam, so that refactors do
    not break the shape of saved sessions.
35. As a developer, I want browser automation validation, so that scroll-to-top
    capture works on real supported providers.
36. As a developer, I want explicit out-of-scope boundaries, so that WebMCP,
    MCP, vector databases, and agent loops do not bloat the first implementation.

## Implementation Decisions

- Treat a session as the primary unit of storage, review, and commit.
- Store all files for one session under a slugged date-provider-title directory.
- Store full transcripts in both JSONL and XML-compatible forms. JSONL is the
  primary machine format; XML is the continuation-friendly structured format.
- Keep raw transcripts immutable. Never edit raw transcript files after export;
  write corrected or normalized derivatives as compiled files.
- Maintain a session manifest with:
  - stable session id
  - provider
  - source URL
  - title
  - capture timestamp
  - message count
  - role counts
  - estimated token count
  - content hashes
  - capture diagnostics
  - generated file inventory
  - reference inventory
  - synthesis status
- Use hash-based caching for rolling analysis. If a raw transcript hash has not
  changed, repo-side analysis should skip transcript reprocessing.
- Use token counts to choose processing mode:
  - quick pass for short sessions
  - deep pass for medium sessions
  - chunked map-reduce pass for very long sessions
- Prefer transcript or verbose platform views when available.
- Add a capture-state model that records whether the top of the conversation was
  reached.

Prototype decision shape:

```json
{
  "capture": {
    "state": "idle|scrolling_to_top|top_reached|extracting|complete|incomplete",
    "topReached": true,
    "topProof": {
      "scrollTop": 0,
      "oldestMessageHash": "sha256:...",
      "stableIterations": 3
    },
    "warnings": []
  }
}
```

- Automatic scroll must be incremental, observable, and cancellable. It should
  scroll upward until it reaches a stable top condition, not merely a fixed step
  count.
- Top detection should combine scroll position, oldest message identity, message
  count stability, and provider-specific loading indicators.
- The extension should remember oldest captured message hashes per conversation
  URL/session so it can detect whether a later export includes the beginning.
- Deduplication must preserve order and role while removing repeated dynamically
  loaded messages.
- The local capture layer should not rely on Chrome DevTools Protocol.
- Browser automation should be implemented through extension APIs and DOM APIs,
  borrowing the Cordyceps-style lesson that robust DOM automation needs
  frame-aware and shadow-aware extraction where possible.
- Treat tab management, page extraction, scroll/load, artifact detection, and
  GitHub sync as separate internal tools with structured results.
- Chrome built-in AI should use `LanguageModel` for comprehensive handoff and
  wiki-style summary generation.
- Chrome `Summarizer` may be used later for preview cards or short summaries,
  but not as the main handoff path because task-specific summaries are too short
  and currently do not fit the background service worker flow.
- `LanguageModel.availability()` and `LanguageModel.create()` must receive
  matching options.
- Use `LanguageModel.params()` when available to tune local generation.
- Use `promptStreaming()` and concatenate chunks because streaming chunks are
  independent.
- Use `measureContextUsage()` and `contextoverflow` handling to route large
  sessions to Server AI or BYOK.
- Do not use deprecated `window.ai.*` names.
- Use Server AI or BYOK for large sessions, unsupported languages, unsupported
  hardware, or higher-quality rolling synthesis.
- Keep MCP and WebMCP separate:
  - MCP is for persistent backend capabilities such as DeepWiki, GitHub, and
    repo maintenance.
  - WebMCP is for live page affordances exposed to browser agents while a page
    is open.
- Consider WebMCP as a future browser-agent interface, not a replacement for the
  extension's Git-backed export pipeline.
- GitHub sync should be optional and explicit. The extension can create local
  export bundles first, then add GitHub commit/PR support behind configuration.
- GitHub operations must be auditable and user-confirmed unless the user
  intentionally enables automatic session commits.
- Rolling analysis should happen repo-side, not inside the content script.
- Rolling analysis should use bounded loops:
  - one change per iteration
  - explicit queue
  - mechanical checks
  - append-only log
  - stop criteria
  - reviewable Git diff
- Maintain a continuously updated project handoff file, but derive it from
  session summaries and raw manifests rather than rewriting it from memory.
- Use LLM-wiki layering:
  - raw session transcript as source
  - session summary as source note
  - project synthesis as compiled knowledge
  - concept pages as reusable knowledge
  - skills as distilled procedures
- Produced documents and references should remain attached to their source
  session, then be indexed into compiled layers.
- Add a meta changelog for every repo-side synthesis operation.
- Add health checks for:
  - missing raw files
  - session folders missing required files
  - stale manifests
  - broken links
  - orphaned concept pages
  - duplicate concepts
  - summaries not reflected in project synthesis

## Testing Decisions

- The highest-value test seam is: given a fully loaded transcript capture result,
  exporting produces a complete session artifact bundle with raw transcript,
  summary, handoff, manifest, references, produced artifacts, and diagnostics.
- Tests should assert external behavior and artifact shape, not implementation
  details.
- The first automated tests should cover:
  - session slug creation
  - JSONL transcript generation
  - XML transcript generation
  - summary Markdown frontmatter
  - immediate handoff Markdown sections
  - manifest hashes and token counts
  - raw-layer copy/index records
  - warning when top-of-chat proof is missing
  - warning when scan/scroll limit is hit
  - chunked transcript map generation
- Browser-level validation should cover supported providers with fixture DOMs
  and at least one live manual or DevTools MCP run per provider class.
- Scroll-to-top behavior should be tested as a state machine:
  - begins at nonzero scroll position
  - detects loading while older messages appear
  - stops only after top proof is stable
  - records incomplete capture when proof is absent
- GitHub sync should be tested with a mocked GitHub API first:
  - create session files
  - commit one session directory
  - reject commits with missing required files
  - handle API failures without losing local export data
- Rolling synthesis should be tested on fixture sessions:
  - one session updates only session-level files
  - multiple related sessions update a project synthesis page
  - unchanged hashes skip reprocessing
  - health check reports missing links and stale manifests
- Chrome built-in AI should be validated in real Chrome because Node cannot run
  the browser built-in AI APIs.
- Server AI and BYOK paths should remain fallback-compatible with the same
  payload contract used by Chrome built-in AI.

## Chrome AI Implementation Lessons

The Chrome AI examples support a practical implementation strategy, but they
also show API drift. Older examples use `window.ai`, `window.ai.languageModel`,
or `createTextSession()`. Continue it should not copy those calls directly.
Use the current API surface already reflected in this repo: `LanguageModel`,
`LanguageModel.availability()`, `LanguageModel.params()`,
`LanguageModel.create()`, `session.prompt()`, `session.promptStreaming()`,
`session.measureContextUsage()`, and `session.destroy()`.

Implementation lessons to carry forward:

- Always record the backend used for a generated artifact:
  `chrome-built-in-ai`, `server-ai`, `byok-openai`, `byok-anthropic`, or
  `manual`.
- Record model availability at generation time:
  `readily`, `after-download`, `no`, unsupported language, unsupported device,
  context overflow, or API exception.
- Treat Chrome built-in AI as a bounded local worker. It should summarize,
  classify, compress, extract references, draft handoff updates, and validate
  file completeness, but it should not own irreversible GitHub publication.
- Destroy model sessions after generation to avoid memory leaks in long-running
  extension use.
- Use streaming where possible, but persist only validated complete outputs.
  Partial streaming text can be shown in UI, but exported Markdown should be
  written after completion or marked incomplete.
- Keep service-worker lifecycle limits in mind. Long-lived work, local bridge
  connections, or heavy browser-side model execution may need an extension page
  or offscreen document rather than relying only on the MV3 background service
  worker.
- Do not assume the model is available. The UI needs an explicit state for
  unavailable, downloading, ready, generation failed, and routed to fallback.
- Capture prompt/system instructions and model parameters in `manifest.json` so
  generated summaries are reproducible enough for audit.
- Keep privacy posture explicit. Chrome AI paths are local, but GitHub sync,
  Server AI, and BYOK paths may move private transcript data outside the
  browser.
- Treat WebMCP tools as typed live-page affordances. Mutating tools should carry
  annotations and human confirmation, especially if future tools can commit,
  upload, delete, or rewrite wiki files.

## Bookmark, Reference, and Context Lessons

The bookmark, tab, ChatGPT export, and personal-search systems point to a
broader artifact model. Continue it should not treat an AI chat transcript as
the only source worth preserving. A session folder should be able to carry the
conversation, referenced URLs, bookmarks, visible tabs, source annotations,
attachments, generated files, and context filters that shaped the session.

Implementation lessons to carry forward:

- Use dual exports by default: structured JSON for machines and readable
  Markdown for GitHub/Obsidian review.
- Add top-level and per-session indexes. A session folder can be self-contained,
  but a repo-level `index.json`, `metadata.json`, or manifest makes incremental
  processing practical.
- Treat references as first-class objects with normalized URL, title,
  description, domain, favicon, tags, source page, capture timestamp, and
  extraction method.
- Normalize URLs before deduplication. Strip obvious tracking noise and account
  for protocol/trailing-slash differences while preserving the original URL.
- Preserve attachments with relative links from Markdown. Images, audio,
  documents, generated code, and tool outputs belong in `produced/` or
  `references/` with manifest entries.
- Add source-bound annotations as sidecars. Highlights, comments, message
  bookmarks, and reader notes should point back to stable message/reference ids
  rather than modifying raw transcript files.
- Prefer API-derived or canonical data when available. DOM capture is necessary
  for live AI chat pages, but a canonical snapshot layer should shield export,
  reader, bookmark, and word-count features from DOM churn.
- Keep the background/offscreen layer as the write authority for sensitive
  storage writes. Content scripts should submit capture intents and snapshots,
  not own final persistent writes.
- Use local-first semantic search where possible. Small embeddings or local
  browser models can rank references, bookmarks, and summaries without sending
  private browsing context to a provider.
- Support hybrid search later: keyword/FTS for exact filenames, domains, and
  errors; embeddings for semantic retrieval; tags and project filters for user
  control.
- Add review gates before destructive or structural changes. Reorganizing
  bookmarks, rewriting project pages, restoring backups, or applying AI
  refactors should use virtual previews and explicit approval.
- Create backups before mutating user-controlled knowledge stores. Git history is
  useful, but an export/import JSON backup gives users a separate recovery path.
- Track incremental export state: new, changed, skipped, unavailable,
  permanently unavailable, retried, and failed.
- Keep privacy labels on every generated artifact. Record whether it was local,
  sent to BYOK, sent to Server AI, or produced from an external metadata service.
- Use state anchors for long conversations. A compact, approved anchor with
  persona/role, current state, key artifacts, constraints, and next action can
  become the continuously updated `handoff.md`.
- Treat prompt packs as first-class produced artifacts. Prompt compression,
  must-fact preservation, and structured handoff packets should be saved under
  `produced/` with their source transcript chunk ids.
- For RAG sessions, save the retrieved context. Exported answers should identify
  which notes, bookmarks, tabs, or references were used to generate them.

## Second-Pass Requirements (2026-08-11 Source Re-Sweep)

A second sweep of all referenced repositories and a structural audit
(`docs/Plans/2026-08-11-source-resweep-review.md`) promoted the following from
implicit assumptions to first-slice requirements. Each is traceable to a
convergent pattern across multiple swept repositories.

- **Atomic session-bundle write.** Write a session folder to a temporary
  directory and make `manifest.json` the last file written — the commit marker.
  After every content file and the manifest are complete, atomically rename or
  promote the temporary directory into `sessions/<id>`. A bundle without a final
  `manifest.json`, or one still under a temporary name, is treated as torn and
  ignored on read. Do not rely on post-hoc hash verification to detect a partial
  write.
  (Pattern: `leonhartX/gas-github` blob→tree→commit→ref sequencing.)
- **Split verification into Verify and Guard.** *Guard* checks invariants (schema
  valid, references resolve, no dropped messages, raw hash matches) and, on
  violation, forces a hard revert/discard. *Verify* checks improvement (density,
  coverage, token delta) and, on regression, triggers rework. They are separate
  gates with separate decision rules, not one "verification gate."
  (Pattern: `karpathy/autoresearch`, `uditgoenka/autoresearch`,
  `supratikpm/gemini-autoresearch`.)
- **Bounded capture and synthesis loops.** The capture state machine gets a
  `maxScrollRetries` cap and a wall-clock ceiling alongside `topProof.stableIterations`.
  Rolling synthesis gets a max-iteration count and stop criteria. No loop may run
  unbounded. (Pattern: every autoresearch-family repo.)
- **Deterministic session teardown.** Destroy `LanguageModel` sessions on
  generation completion *and* on service-worker suspend, tab close, and extension
  disable/update. Record in the manifest whether an artifact's generating session
  ended cleanly or was killed mid-flight. (Pattern: the unenforced `destroy()`
  gap in `Mazen-Embaby/gogo-va-extension`.)
- **Verifier-backend provenance.** The manifest records both the backend that
  *generated* an artifact and the backend (if any) that *verified* it. A summary
  verified by the same model that produced it is not a passed gate; it lowers
  recorded confidence. (Pattern: `wanshuiyin/Auto-claude-code-research-in-sleep`
  different-family reviewer requirement.)
- **Provenance backlink on compiled layers.** Every `concepts/` and `skills/`
  entry carries `source_session` id + `raw_chunk_hash` pointers rather than
  assuming reference sidecars suffice at every tier. This closes the tension
  between distilled paraphrase and "never trust the model's re-quoting."
  (Pattern: `pzqpzq/Principia`, `wanshuiyin/Anti-Autoresearch`.)
- **Mechanical anti-skimming density floor.** `summary.md` and `handoff.md` must
  pass a minimum-specificity score (quote count, file/URL/error-token count)
  before a synthesis pass is accepted. A second gap-filling pass may not be used
  to reach the floor. This is the operational form of the core thesis applied to
  the one step where the spec currently trusts the weak model unsupervised.
  (Pattern: `REMvisual/claude-handoff` baseline-then-gap-fill enforcement.)
- **Branch/DAG-aware transcript.** `transcript.jsonl` carries `parent_message_id`
  per entry so regenerate/edit branches are preserved, not flattened by the
  linear scroll-to-top model. Prefer a canonical provider-graph/API snapshot as
  the primary capture path (it yields the DAG and sidesteps virtualization); use
  DOM scroll-to-top as the fallback. Rejected branches are retained as the
  high-value "failed approaches" record. (Pattern: `zhaoliangbin42/AI-MarkDone`,
  `daugaard47/ChatGPT_Conversations_To_Markdown`.)

Deferred to future notes (not first slice): full cross-model independent-review
gate before promotion; claim-level span-anchored ledger; MCP inversion (exposing
the wiki as an MCP server); session chain-continuity metadata distinct from topic
rollup; an archive/retirement absorbing state; and multi-writer concurrency with
handoff revision/lock semantics.

## Out of Scope

- Building a full autonomous research agent inside the extension.
- Replacing GitHub with a full database-backed sync service.
- Requiring a hosted server for users who only want local or BYOK exports.
- Making `Summarizer` the primary handoff generator.
- Implementing a complete vector database in the first version.
- Automatically publishing private transcripts without explicit user setup.
- Guaranteeing perfect extraction from every future AI website redesign.
- Solving all iframe and shadow DOM extraction issues in the first pass.
- Auto-generating public skills from private transcripts without review.
- Treating WebMCP as a replacement for MCP or the extension pipeline.

## Further Notes

The RevivalStack AI Chat Exporter reference is useful for export formatting,
multi-provider support, Markdown/JSON output, metadata, table of contents, and
platform-specific selector maintenance. Continue it should borrow the export
discipline, but not become a Tampermonkey script; it should keep the stronger
MV3 extension architecture and existing handoff workflow.

## Source Incorporation Matrix

| Source | Incorporated lesson | Concrete design implication |
| --- | --- | --- |
| `nico-martin/gemma4-browser-extension` | Browser agents should expose tab, page/RAG, and history tools as explicit capabilities. | Model capture as internal tools: tab inventory, page extraction, scroll/load, reference extraction, and history lookup. |
| `mrauter1/GitPreProcess` | AI-friendly repos need manifests with classification, summaries, relevancy, hashes, and token counts. | Add `manifest.json` per session and aggregate manifests under `meta/` for delta processing and routing. |
| `atjsh/llmlingua-2-js` | Weak models benefit from lossy-but-faithful compression before expensive passes. | Add a compression stage for long transcripts before Chrome AI summaries, while preserving immutable raw transcripts. |
| `kiro0x/five-mcp` | Agents need external goal/state anchors when context windows expire. | Keep `handoff.md`, active goal fields, progress state, and resume instructions in every session folder. |
| `ulyssestenn/funes` | Git-backed knowledge work should separate raw sources, compiled wiki, outputs, metadata, changelog, and health. | Use `raw/`, `sessions/`, `projects/`, `concepts/`, `skills/`, and `meta/health/` as separate layers. |
| `adam-s/cordyceps` | Extension/DOM automation can be robust without CDP if it uses snapshot-style extraction and frame-aware locators. | Keep capture in MV3 content scripts and DOM APIs; plan for frame and shadow DOM extraction rather than DevTools-only capture. |
| `yamadashy/repomix` | Repositories can be packed into single AI-friendly context artifacts. | Add future `packs/` or generated context bundles for session folders, projects, and selected concept clusters. |
| `coderamp-labs/gitingest` | Repo ingestion should classify, filter, and package source trees for downstream agents. | Make exports both human-readable folders and machine-ingestable bundles. |
| `leonhartX/gas-github` | Browser Git integration needs explicit provider auth, repo binding, and safe commit operations. | Keep GitHub sync optional, auditable, and separate from transcript capture; never store tokens in exported artifacts. |
| `natsu1211/deepwiki-skill` | Codebase/wiki generation works best with comprehensive, structured Markdown pages. | Generate wiki-style summaries with frontmatter, headings, source links, tags, and cross-links. |
| `saharmor/sidekick-dev-web` | Agent context files should be generated automatically and optimized for downstream coding agents. | Treat summary, handoff, manifest, and context pack files as first-class generated artifacts. |
| `REMvisual/claude-handoff` | Handoff documents preserve continuity better than raw chat tails. | Maintain continuously updated `handoff.md` with goal, state, blockers, next actions, and verification notes. |
| Chrome WebMCP compare doc | MCP and WebMCP solve different layers: backend persistent tools vs live page affordances. | Use MCP for DeepWiki/GitHub/repo services and consider WebMCP for live browser page interaction, not as a replacement pipeline. |
| `wanshuiyin/Auto-claude-code-research-in-sleep` | Long-running agents resume from structured pipeline status and project wiki files. | Store session status and project-level rolling handoff in files that are re-read at the start of each pass. |
| `karpathy/autoresearch` | Small agents improve through repeated bounded research loops with written state. | Add rolling analysis queues that work from saved files and stop at explicit criteria. |
| `gaasher/Agent-Loop-Skills` | Loops need a skill/program, artifact slot, feedback signal, run ledger, and termination condition. | Define each synthesis job with inputs, outputs, checks, log entry, and stop condition. |
| `jmilinovich/goal-md` | Goal files, fitness checks, iteration logs, and keep/revert decisions limit drift. | Add `goal.md` or manifest goal fields plus `iterations.jsonl` for rolling synthesis. |
| `pzqpzq/Principia` | Research systems need staged evidence, critique, evolution, selection, and portable packs. | Require references to be source-linked and use staged synthesis before promoting concept pages. |
| `davidondrej/jailbreak-autoresearch` | A fixed rubric and success signal make iterative experiments comparable. | Let summary/synthesis jobs include rubrics such as completeness, provenance, link health, and user-approved usefulness. |
| `greyhaven-ai/autocontext` | Agents improve by curating durable playbooks and lessons from prior runs. | Periodically distill repeated successful session patterns into `skills/` and project playbooks. |
| `uditgoenka/autoresearch` | Atomic change, commit, verify, decide, log, repeat is a durable weak-agent loop. | Make rolling analysis atomic: one session or one synthesis target per iteration, with logs and rollback. |
| `wanshuiyin/Anti-Autoresearch` | Loop systems need explicit failure-mode awareness and anti-patterns. | Add guardrails against infinite loops, fabricated progress, overcompression, and unreviewed publication. |
| `Rescenix/ResceneAgent` | Local audit trails and rollback protect agent-written files. | Keep append-only changelogs and file hashes so generated wiki changes can be reviewed or reverted. |
| `supratikpm/gemini-autoresearch` | Dual-gate loops keep only changes that improve the target and pass guards. | Require both content-quality checks and repository-health checks before promoting rolling synthesis. |
| `revivalstack/ai-chat-exporter` | A mature chat exporter needs rich frontmatter, export metadata, table of contents, platform-specific selectors, customizable filenames, and scroll-to-load handling. | Use RevivalStack-style metadata and organization, but implement it as MV3 extension artifacts rather than a userscript-only export. |
| `Mazen-Embaby/gogo-va-extension` | Chrome AI extensions can combine side panel UI, background message routing, content scripts, local conversation storage, and availability checks across Prompt, Summarizer, Translator, Writer, and Rewriter style APIs. | Define explicit session/message types, store drafts in `chrome.storage.local`, and expose model-ready/download/unavailable states before generating summaries. |
| `itamaker/go-chrome-ai` | Chrome AI feature availability can depend on local flags, region, model download policy, and OS-managed policy state. | Do not try to modify Chrome state from the extension; instead surface clear diagnostics and setup guidance when built-in AI is unavailable. |
| `donpark/chrome-ai-tools` | MV3 service workers are fragile for persistent local bridges; offscreen documents or extension pages are better for long-lived connections and model/tool routing. | Put local Git bridge or long synthesis streams behind an offscreen/extension-page design, with dynamic tokens and origin checks. |
| `7Xme/chrome-ai-learning-assistant` | Chrome AI apps can compose Prompt, Summarizer, Translator, Writer, Rewriter, and Proofreader APIs for different task shapes. | Route by task: `LanguageModel` for handoffs, summarizer for quick preview cards, writer/rewriter/proofreader for future cleanup passes if available. |
| `moerasermax/Tools_ForSharing` | Page context capture works best as layered extraction: user selection, readability extraction, then raw DOM fallback. | Use layered capture for references and produced page context rather than relying only on chat message selectors. |
| `matoliva/grammar-ai` | DeepWiki did not find Chrome extension or Chrome built-in AI implementation details; it appears to be a Next.js app rather than an MV3 extension. | Treat as low-relevance for extension architecture; at most borrow general grammar/writing UX ideas after separate inspection. |
| `V-Gutierrez/browser-llm-lab` | Browser LLM labs show backend switching, availability guardrails, download progress, params inspection, streaming, JSON-mode experiments, and explicit session destruction. | Record backend, params, availability, prompt mode, and guardrail status in manifests; destroy sessions after generation. |
| `oliuntangled/webmcp-gen` | WebMCP benefits from generated typed tool definitions, schemas, annotations, compatibility shims, and human-in-the-loop security. | Future WebMCP export tools should be generated from typed schemas and mark mutating actions as confirmation-required. |
| `airwomandivanbed693/gemini-nano-chrome` | Simple MV3 Gemini Nano examples separate popup UI from background AI orchestration and stream chunks back over extension messaging. | Keep UI responsive by routing generation through background/offscreen logic and sending progress events without persisting partial output as final. |
| `kirillpolevoy/relai` | Local AI chat transfer tools benefit from IndexedDB persistence, JSON backup/restore, vanilla MV3 architecture, and platform-specific extractors. | Consider IndexedDB for larger local staging; keep JSON backup/restore separate from GitHub sync. |
| `FdezRomero/chatgpt-exporter` | Robust chat backup uses both per-conversation JSON and Markdown, a top-level `metadata.json`, an `index.json`, incremental mode, attachment handling, retries, and unavailable-file tracking. | Add top-level export metadata and incremental processing state; preserve attachments with relative paths and retry/unavailable markers. |
| `Edmon02/bookmark-ai-organizer` | Bookmark organization should generate folder/tag suggestions while keeping state local and surfacing AI-provider dependence. | Treat bookmark/reference categorization as suggested metadata, not automatic truth; store provider and confidence. |
| `Superkikim/nexus-ai-chat-importer` | Importers need provider adapters, a standardized conversation model, attachment handling, smart dedupe, selective import, detailed reports, and Obsidian-friendly Markdown. | Define `StandardConversation`-style normalized session objects and write import reports beside exported artifacts. |
| `daugaard47/ChatGPT_Conversations_To_Markdown` | Chat exports should support local browser or script conversion, YAML frontmatter, folder-per-conversation organization, multimodal attachments, and alternate date/category layouts. | Keep Markdown exports frontmatter-rich and attachment-aware; allow alternate repo views without moving immutable raw files. |
| `Lling0000/SiftMarks` | Local-first bookmark knowledge can use SQLite, CLI/web/extension/MCP entry points, AI summaries/tags/embeddings, FTS plus vector hybrid search, and review-first cleanup suggestions. | Future knowledge repo tooling can expose an MCP/search layer and use hybrid search over sessions, bookmarks, and references. |
| `Vineetpandey0/Context-Sync` | Cross-platform AI chat transfer works best with a normalized capsule schema, local storage, searchable saved conversations, and optional compression that preserves code blocks. | Add a capsule-style session interchange format and compression rules that keep code/tool output verbatim. |
| `rathi-yash/MindVault-AI-Bookmarker` | Bookmark clustering can extract title/description/domain metadata, embed content, cluster with semantic similarity, and label groups while allowing user correction. | Add reference metadata fields and optional local categorization/tagging with user-editable labels. |
| `andrewjtyo-glitch/context-anchor` | Long chats can be stabilized with approved state anchors containing persona, current state, key artifacts, constraints, and next action, then rebooted into new sessions. | Make `handoff.md` an anchor-derived artifact and store approved anchor history with ids and timestamps. |
| `LumenHelixLab/promptPACK` | Local-first prompt compression should be objective-aware and preserve must-keep facts while producing structured handoff packets. | Add prompt-pack artifacts under `produced/` and record preserved facts plus source chunk ids in the manifest. |
| `redzumi/ai-ai-bookmarks` | AI bookmark refactors should be virtual-first, approval-gated, backup-first, and provider-abstracted through tool-calling agents. | Require preview/approval and backup before applying structural wiki/bookmark reorganizations. |
| `ooye-sanket/Deja-vu` | Local semantic bookmark search can run in an MV3 background worker using a small local embeddings model, structured bookmark metadata, tags, and similarity ranking. | Support local semantic search indexes over references without making network calls by default. |
| `kyruntime/bookmark-organizer` | Bookmark agents need full-tree capture, parent-child JSON, domain clustering, URL normalization, propose-confirm-execute flow, backups, and rollback. | Use explicit tree schemas for bookmark/reference hierarchies and require backups before destructive reorganizations. |
| `ndg8743/TabBrain` | Tab/bookmark AI tools benefit from side panel UI, strict message contracts, typed domain objects, duplicate detection, window/topic metadata, retrying batch processors, and messy JSON parsers. | Add typed `TabInfo`/`ReferenceInfo` artifacts, duplicate checks, prompt builders, and robust AI response parsing. |
| `khoj-ai/khoj` | Personal AI assistants should save retrieved context, support offline/online modes, export conversations, and use Git-like traces for query/response/system-prompt provenance. | For RAG-backed summaries, save retrieved notes/references and system prompts alongside the generated answer. |
| `zhaoliangbin42/AI-MarkDone` | High-quality ChatGPT tooling uses canonical snapshots from provider graphs, background-as-write-authority, versioned runtime messages, immutable semantic models, source-bound annotations, and safe restore previews. | Add a canonical snapshot layer, versioned message protocol, annotation sidecars, and preview-before-restore semantics. |

The likely first implementation slice is (reordered so capture-completeness, the
foundational correctness property, comes first — everything downstream is
worthless if capture silently drops the beginning):

1. Strengthen capture: bounded scroll-to-top state machine with `topProof`,
   `maxScrollRetries`, and a wall-clock ceiling; branch/DAG-aware transcript with
   `parent_message_id`; a hard "capture incomplete" marker propagated into the
   manifest, summary, and handoff when top-proof is absent.
2. Add a session artifact builder that emits JSONL, XML, summary Markdown,
   handoff Markdown, and manifest objects from captures whether complete or
   incomplete. Incomplete captures must carry the hard warning into every
   generated artifact. Promotion to rolling synthesis, not local artifact
   creation, requires `verified-complete`.
3. Apply the Verify/Guard split and the anti-skimming density floor to generated
   summaries and handoffs; record verifier-backend provenance in the manifest.
4. Add export/download UI for a zipped session directory, plus repo layout
   documentation and fixtures.
5. Add optional GitHub sync after local artifact export is stable — with a
   secret-redaction/scan pass over every file selected for sync, including
   transcripts, summaries, handoffs, manifests, produced documents, references,
   attachments, and generated packs. Block the entire commit if any artifact
   fails the gate.

The main risk is silent incompleteness. The extension should prefer an explicit
"capture incomplete" warning over a polished but partial summary. See
`docs/Plans/2026-08-11-source-resweep-review.md` for the full second-pass audit
and the Second-Pass Requirements section above for concrete acceptance criteria.
