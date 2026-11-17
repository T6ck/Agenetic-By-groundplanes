# Research project implementation

This branch starts the approved next-phase brief. It is a review build, not a new desktop release or a completed product audit.

## Implemented

- Plan, Sources, Review and Brief sections share one workspace journal. The question remains visible. Next actions connect setup, passage inspection, review and writing.
- Audience, deliverable and completion criteria are saved and included in newly queued requests. Completion criteria are user instructions, not an automatic proof that a project is finished.
- Sources shows the actual next-run passages, character locators, scan coverage, missing text and keyword-match warnings. Direct source opening preserves the research section for return.
- Incremental, in-memory lexical passage indexing reads up to 2 MiB per selected source. Four selected sources remain the request limit. It explicitly reports partial coverage. This is not semantic retrieval or full-vault indexing.
- New evidence/supported nodes created through appendResearchNode retain a deduplicated full-text source revision in the workspace. Any subsequent text change makes these nodes ineligible, including changes outside the quote. Legacy evidence without a revision retains its prior quote validation and requires re-review to obtain this protection.
- Claim decisions can record a rationale. Reviewed claims assemble a deterministic proposed brief, without another inference request. The before/after view must be applied explicitly. Previous text and citations are retained for undo. Citations that become ineligible are flagged; the text is not silently rewritten.
- Working brief edits save when moving between research sections or using the shared navigation. Failed saves keep the editor open and preserve the draft. Unsaved setup edits prevent leaving until saved.
- Follow-ups require approval. Five waiting draft reviews stop new inference. A reviewed draft can be explicitly finished after at least one claim decision; this does not certify every sentence in the draft.
- A completed result remains complete if follow-up scheduling fails. History is paginated and the previous 200-task hard stop is removed.

## Storage and compatibility

Project metadata is additive under workspace.researchDesk.project, version 1. Source revisions are additive under workspace.sourceRevisions. No existing IDs, original notes or graph positions are rewritten. Whole-vault backups preserve these fields; bounded community workflow packages still exclude research history and brief content. Source revision snapshots retain historical source text locally, including when its original note is edited or removed.

History pagination currently limits rendering, not database I/O. The full journal and revision archive are still part of the existing IndexedDB profile record. A separate durable paged store and retention policy are required before claiming large-vault scalability.

## Validation

Node tests cover late evidence beyond the former 256 KiB scan boundary, duplicate titles, unreadable text, incremental invalidation, explicit partial coverage, proposal approval, human-edit preservation, changed evidence, history pagination and review backlog limits. Chromium checks exercise research navigation, passage previews, working-text persistence, proposal/apply/undo, staleness and direct source opening on a small viewport. Model responses in these tests are mocked.

## Remaining implementation gates

- Unify all manual, agent, workflow and background run entry points under one durable transactional scheduler; persist outputs and follow-ups idempotently under storage failures.
- Add explicit typed dependency editing and migration. The new supplies-context label alone does not change legacy dependency behavior.
- Complete source revision migration, passage locators for PDF pages, contradiction decisions, review undo and a scalable revision archive.
- Add bounded plan generation, task-level scope and stop conditions, a persistent return digest, and explicit user-approved plan changes.
- Add graph relationship inspection, accessible graph paths, large-graph culling and measured graph performance.
- Validate whole-project recovery, multiple windows, abrupt termination, low memory and an eight-hour real-model soak on Windows hardware. No performance or hardware claims are inferred from the browser fixture.
- Publish only after review. This branch does not bump a version, sign an installer or change the update feed.
