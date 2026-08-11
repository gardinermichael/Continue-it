---
title: "Source Re-Sweep and Ideonomy Review of the Session Knowledge Export Spec"
date: "2026-08-11"
authors: ["Claude"]
purpose: "Second-pass review of session-knowledge-repo-spec.md: a fresh sweep of all referenced repositories plus a structural audit for missed patterns and contradictions."
reviews: "session-knowledge-repo-spec.md"
---

# Source Re-Sweep and Ideonomy Review

## Process

All 49 referenced repositories were re-swept, one focused pass per repo, using
DeepWiki plus repomix source inspection for ground truth. The sweep produced 193
concrete implementation tidbits: 7 already reflected in the spec, 164 that extend
a spec lesson, and 22 that are genuinely new or that contradict a current spec
decision.

The findings were then audited for what the spec *missed* through two structural
lenses (Gunkel/Kind ideonomy), each drawn independently:

- **Lens A** — operators combination / dimension-identification / abstraction-lift;
  organons *lattice* and *state-machine*.
- **Lens B** — operators abstraction-lift / substitution / cross-domain
  re-instantiation; organons *graph* and *matrix*.

The strongest signal is where the two lenses converged from different directions
on the same gap.

## Convergent findings (highest confidence)

1. **Verifier independence.** The weak local model can generate an artifact *and*
   be asked to verify its own completeness — self-grading dressed as a gate.
   `Superkikim`-style adjudicator/proposer separation and
   `Auto-claude-code-research-in-sleep`'s required different reviewer family both
   guard this. The manifest must record which backend *generated* versus which
   *verified* each artifact; same-model self-verification lowers confidence rather
   than counting as a passed gate.

2. **Atomic multi-file write.** The 6–7 file `sessions/<id>/` bundle can tear
   (transcript lands, manifest does not). The spec only *detects* this after the
   fact via hashes; it never *prevents* it. Write to a temp directory and make
   `manifest.json` the last file written (the commit marker) — `leonhartX/gas-github`'s
   blob→tree→commit→ref sequencing applied to local disk. This also gives the
   otherwise-unschematized `meta/manifest.json` a concrete role.

3. **"Verification gates" is two mechanisms under one name.** *Verify* (did the
   artifact improve — density, coverage, token delta → rework) and *Guard* (was an
   invariant violated — schema, refs resolve, no dropped messages → hard revert)
   have opposite failure semantics. `karpathy/autoresearch`, `uditgoenka/autoresearch`,
   and `supratikpm/gemini-autoresearch` all split them.

4. **Loops have no bounds.** The `CAPTURE_INCOMPLETE → SCROLLING_TO_TOP` retry
   cycle and the rolling-synthesis loop lack a retry cap, wall-clock ceiling, and
   stuck-recovery — unlike every autoresearch repo in the corpus (`karpathy`'s
   time budget, `uditgoenka`'s max-iterations, `supratikpm`/`davidondrej`'s
   stuck-recovery). A provider stuck on a loading spinner retries forever.

5. **Session lifecycle leak.** `LanguageModel` sessions are destroyed only after
   generation, not on service-worker suspend / tab close / extension disable —
   `Mazen-Embaby/gogo-va-extension` defines `destroy()` and never calls it. Add
   lifecycle handlers that best-effort destroy, and a manifest flag distinguishing
   "session ended cleanly" from "killed mid-flight."

6. **Claim-level provenance.** The spec's own goal — "every durable claim
   traceable back to the source session" — is implemented only at reference/URL
   level. `wanshuiyin/Anti-Autoresearch`'s span-anchored claims ledger and
   `pzqpzq/Principia`'s canonical-tuple hydration ground individual sentences to
   byte-offset + hash. The goal outruns the mechanism once `concepts/` and
   `projects/` compile prose from multiple sessions.

## The contradiction that should change the design

**Branch/DAG capture.** The scroll-to-top state machine assumes one *linear* path,
but regenerate/edit on ChatGPT and Claude produce a *tree*, and the rejected
branches are exactly the "failed approaches" material `REMvisual/claude-handoff`
rates as high-value. The current model silently flattens them.

This resolves together with the spec's own sharpest internal tension — "prefer
API-derived or canonical data" versus the DOM-scroll emphasis. A canonical
provider-graph snapshot (`zhaoliangbin42/AI-MarkDone`, `daugaard47`'s
branch-disambiguation) yields the message DAG *and* sidesteps virtualization.
Recommended capture order: canonical/API snapshot first, DOM-scroll fallback; and
`transcript.jsonl` carries `parent_message_id` per entry.

## Consolidated tiering

Promoted to first-slice requirements and written into the spec's new
"Second-Pass Requirements" section: atomic bundle write with manifest-as-commit-marker;
Verify/Guard split; loop bounds and capture retry cap; deterministic session
`destroy()` on lifecycle events; provenance-backlink field on `concepts/`/`skills/`;
mechanical anti-skimming density floor on `summary.md`/`handoff.md`; branch/DAG-aware
transcript schema.

Kept as future notes: full cross-model independent-review gate; claim-level ledger;
MCP *inversion* (expose the wiki as an MCP server, not only consume MCP —
`greyhaven-ai/autocontext` precedent); session chain-continuity metadata (thread
across providers/dates, distinct from topic rollup); an archive/retirement
absorbing state (nothing prunes today); multi-writer concurrency and handoff
revision/lock.

## Appendix A — Lens A organons (lattice + state-machine)

### Continuity, verification, and grounding: a generality lattice

```
EXTERNAL STATE ANCHOR (any mechanism externalizing convo state past context loss)
├── ROLLING HANDOFF (mutable, re-read every resume)   ⟷ INCOMPARABLE ⟷   SINGLE-USE CAPSULE (write-once, cleared on consume)
│     [spec handoff.md; context-anchor persona/state/next]     [relai pendingContext; Context-Sync PENDING_INJECT_KEY]
│     ⚠ DIAMOND HAZARD: handoff.md has no version/lock field, so it behaves like a
│       ROLLING HANDOFF but gets consumed like a SINGLE-USE CAPSULE when two
│       devices/tabs resume the same project — neither parent's contract is honored.
VERIFICATION GATE (something must pass before a change is kept)
├── GROUND-TRUTH METRIC ISOLATION (metric code walled off)        [karpathy/autoresearch]
│     └── MECHANICAL METRIC GATE (numeric-only, no subjective override)   [uditgoenka, supratikpm]
├── ADJUDICATED FINDING GATE (LLM proposes; separate deterministic code rules)   [Anti-Autoresearch]
└── DEBATE / REBUTTAL GATE (adversarial cross-examination)         [Auto-claude-code-research-in-sleep]
      — LEAF WITH NO SPEC-SIDE PARENT: the spec's review/preview gates never climb here.
EVIDENCE GROUNDING (claims must trace to a source)
├── REFERENCE-LEVEL DEDUP/NORMALIZATION (URL/domain identity)      [spec, khoj, SiftMarks]
└── CLAIM-LEVEL SPAN-ANCHORED LEDGER (sentence → byte-offset+hash) [Anti-Autoresearch, Principia]
      — the spec's stated goal is at CLAIM level; its only built mechanism is one level down.
```

### Capture-to-synthesis lifecycle: a state machine with missing edges

Key gaps surfaced: the `CAPTURE_INCOMPLETE → SCROLLING_TO_TOP` cycle is unbounded
(no retry cap / wall-clock timeout, unlike every autoresearch loop); `CAPTURE_INCOMPLETE
→ patch-in-place → CAPTURE_COMPLETE` is a *forbidden* transition (raw immutability
forces a full restart) that is never named as a tradeoff; `HANDOFF_ROLLING →
HANDOFF_STALE` has *no trigger* (two writers both believe they hold latest state);
`VERIFICATION_FAILED → COMMITTED` is *undefined* (may a user commit a session that
failed its own health check?); and there is *no absorbing archive/prune state* —
`sessions/`, `raw/`, `projects/` only ever grow.

## Appendix B — Lens B organons (graph + matrix)

### Dependency-and-contradiction map (selected edges)

- `DualGate(Verify, Guard)` **splits** the single `VerificationGates` node into two
  mechanisms with different failure semantics.
- `EvidenceHydrationRegistry` **requires** `RawTranscript` but **contradicts**
  `Concepts/Skills` (paraphrase-by-design cannot carry verbatim quotes) — an
  `M(A,B) ≠ M(B,A)` asymmetry; the repair edge is a provenance backlink (hash/id
  pointer, not a quote).
- `AtomicMultiFileWrite` has **no named edge** from `SessionBundle` — the clearest
  "edge you cannot name" in the spec.
- `BranchDAGPreservation` **contradicts** `ScrollToTopStateMachine` (built for one
  linear path).
- `MCPServerInversion` **inverts** MCP(backend): the spec only consumes MCP; nothing
  exposes the local wiki *as* an MCP server.
- Hidden hubs by degree: the weak-model-needs-external-structure thesis (highest
  implicit in-degree, never an explicit node); the `sessions/` bundle (actual
  capture↔synthesis join point); `manifest.json` (could double as the atomic commit
  marker, treated only as bookkeeping today).

### Missed-technique × storage-layer applicability

The `sessions/` column is hit "Strong" by six of eight missed-technique rows — it
is the load-bearing layer the spec under-specifies relative to its centrality. The
`meta/` column is almost entirely passive ("Partial"/"Guard-only") where several
rows (chain-continuity, atomic-write, evidence-audit) want it to be an active
enforcement point. Independent-review and MCP-inversion concentrate in the synthesis
tier (`projects/`, `concepts+skills/`); branch/DAG concentrates in capture/`raw`/`sessions`
and is the one row that actively contradicts an already-built mechanism.
