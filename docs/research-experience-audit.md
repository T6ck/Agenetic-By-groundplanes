# Agenetic research experience audit

Date: 17 November 2026. Baseline: `ee6283ac2ca9f23045a47df9440ae39d9353c95b` (beta 31 source).

## Finding

Agenetic needs to make a research question, its evidence, its decisions and its next task feel like one continuous piece of work. The graph currently shows objects better than it explains progress. The app has useful evidence checks, but navigating between them requires too much memory. A more attractive graph alone will not solve this.

The product direction is **a local research workbench with visible evidence and deliberate execution**. Its distinguishing capability should be a traceable path from a source passage to a claim, a review decision, a next task and a final document. This is a product recommendation, not a claim that the entire path is delivered.

This report separates confirmed source defects, implemented corrections, design recommendations and unverified behavior. It is a code and interaction audit supported by product documentation, not a study of recruited users, a penetration test, a whole-app accessibility certification or a model-quality benchmark.

## Why the references work

### Obsidian: context before spectacle

The local graph narrows the relationship map to an active note and adjustable depth. Backlinks provide a textual route through relationships, including surrounding context. Canvas offers a different spatial task: users arrange and group material themselves. These are complementary views rather than a requirement that every task happen inside the global graph. [1–3]

**Agenetic decision:** retain the overall map, but make a selected note's neighborhood and a readable relationship list first-class working surfaces. Preserve the user's camera and hand placements. Give automatic organization an explicit undo. Explain what each edge means and whether it changes execution.

**Do not copy:** Obsidian's brand, default accent, a densely packed constellation as a success metric, or every plugin setting. The value is contextual access and control.

### Zotero: keep the return path to the source

Zotero's annotation-to-note flow retains a citation and a link to the original PDF page. Reading, excerpting and writing stay connected. [4]

**Agenetic decision:** every extracted passage needs source identity, document revision, location and an Open original action. Model prose and user-approved claims remain distinct from original source material. Source changes must make affected results visibly stale.

**Do not copy:** bibliographic complexity where the user only needs a plain note. Add metadata where it enables retrieval, attribution or reproducibility.

### Obsidian workspaces, bookmarks and command palette: return to work

Saved layouts preserve open files and sidebar state; bookmarks provide shortcuts to files, graphs, searches and smaller locations. A searchable command palette exposes actions and keyboard routes. [5–7]

**Agenetic decision:** remember expanded explorer sections, preserve local views and add back/forward navigation. Eventually offer saved research views containing a query, filters, selected material and camera. Search should expose actions as well as record titles.

### General interaction principles

Progressive disclosure keeps common actions available while deferring configuration. Recognition reduces the burden of remembering commands and prior work. These support a visible review queue, clear task states and contextual actions. [8–9]

The W3C target-size guidance gives a minimum of 24 CSS pixels or qualifying spacing/equivalent controls. Agenetic should target 36-pixel desktop utilities and 44-pixel important touch actions, with keyboard alternatives for dragging. These are proposed product targets, not measured compliance. [10]

## Confirmed findings and first corrections

Severity describes impact on research work, not security severity. High means a core action fails or misrepresents evidence continuity. Medium means a recurring navigation or comprehension problem.

| ID | Severity | Finding and reproduction | Evidence in baseline | Disposition |
| --- | --- | --- | --- | --- |
| R01 | High | Start a three-pass evidence review. The handler queries an explicit submit selector that the form does not contain. | `execution.js`, `cycleDialog` and submit handler | Explicit submit type added; real DOM regression added. |
| R02 | High | Use four long excerpts. Prefix truncation can exclude later documents from the review while the source list names them. | `research-cycle.mjs`, `context.slice(0,1500)` | Divide the compact evidence budget across supplied blocks. This remains excerpt review, not full-document reading. |
| R03 | High | A long evidence review fills the previous-analysis budget. The critical review can disappear from synthesis. | `research-cycle.mjs`, combined prior text sliced to 550 characters | Allocate a share to each completed pass; long-output regression added. |
| R04 | High | Run a single workflow step in evidence mode through its agent dialog. The evidence-save call omits the step, unlike batch execution. | `app.js`, `run` evidence branch | Pass the originating step; regression checks downstream provenance input. |
| R05 | High | Create duplicate note titles in separate spaces. The graph resolves from a profile-wide title map, while retrieval uses workspace-limited, ambiguity-aware resolution. | `knowledge.js`, `studioLinks`; `app.js`, `agentSourceScope` | Restrict inferred wiki links to unambiguous files in this workspace. Stable-ID links and rename migration remain future work. |
| R06 | Medium | Disconnect an inferred wiki link. The action saves and redraws without removing its source markup. | `canvas.js`, `unlinkStudio` handles no wiki-link case | Show Edit link, opening the source note. Guard the unsupported disconnect route. |
| R07 | Medium | Close an explorer category, then save or rerender. Every category is emitted open again. | `knowledge.js`, explorer markup | Persist category disclosure per workspace; verify reload. |
| R08 | High | A later review pass fails. Earlier results are retained only inside the throwing cycle and cannot be saved from that review dialog. | `research-cycle.mjs` and `execution.js` | Expose each completed pass and permit saving an explicitly incomplete draft. Durable resumable runs remain separate work. |
| R09 | Medium | Choose Graphite. Several surfaces use legacy near-black constants instead of the palette displayed in Appearance. | `groundplane.css`, Graphite override | Use the same semantic surface tokens as other built-in/imported themes. |
| R10 | Medium | Select sans headings or flat background with a grid. Later styles override the chosen heading and couple grid visibility to depth. | `family.css`, `groundplane.css`, `polish.css` | Separate grid from depth and restore dialog heading preference. |
| R11 | High | Accumulate drafts and claims. Review state exists in records but no dedicated queue offers a list of work awaiting attention. | `app.js`, `reviewResearchDraft`; `research.js` | Add workspace review queue with pending, unresolved and stale-source records; add explorer state labels. |
| R12 | Medium | Use a viewport narrower than 600 pixels. Navigate is explicitly hidden, removing access to secondary destinations. | `polish.css` | Keep Navigate reachable; exercise 1024, 768 and 390 widths in Chromium. |

The review queue does not approve claims automatically. “Reviewed claim” means the user made a decision using a quote. It does not mean the model independently established truth.

## The complete workflow to design around

Use one acceptance scenario throughout development: import three sources that disagree, ask a precise question, inspect the passages, run a comparison, reject an unsupported claim, save a supported one, branch the next question, close the application and resume. Export only material the user chose.

| Stage | What the user needs to know | Current limitation | Required behavior |
| --- | --- | --- | --- |
| Capture | Did the file arrive and become readable? | A file, extracted text and its processing status are not a unified source record. | Show original name, import state, extraction result, pages/sections where available and a retry action. |
| Frame | What question are we answering? | Freeform tasks lack a visible deliverable and completion criterion. | Task includes question, expected artifact, source scope, stop condition and reviewer. |
| Select | Which material will actually reach the model? | Retrieval scans bounded portions and sends only a few excerpts. Scope is easy to overestimate. | Preview selected passages, exclusions, scanned coverage and remaining budget before starting. |
| Execute | Is it queued, loading, generating, waiting or blocked? | A global running flag and modal-owned flows make a long operation difficult to revisit. | Durable run records with a visible queue, stage checkpoints and explicit errors. |
| Review | Which claim is supported, contradicted or still unknown? | Review is mostly per claim inside a modal; source preview is a truncated text dump. | Claim and source passage side by side, location jump, decision rationale and unresolved queue. |
| Synthesize | What can enter the final document? | Draft text can sound certain even when only tags were checked. | Compose from reviewed evidence; mark unsupported statements; preserve citations through edits. |
| Branch | What should happen next, and why? | Next steps are possible but the overall research trail is difficult to revisit. | Create a successor task carrying selected evidence, unresolved questions and explicit dependencies. |
| Resume | What changed while I was away? | Runs and local dialog state do not form a resumable project journal. | Show last artifact, outstanding review and blocked tasks. Never silently restart inference. |
| Share | What exactly leaves the device? | Workflow packages exclude saved research and have tight original-file limits. | Separate template sharing, selected research publication and full private backup. Preview exclusions and size before export. |

## Architecture findings requiring follow-through

### 1. Execution should not belong to a dialog

`executeStep` checks whether its dialog and button still exist during the batch. Closing a window changes execution flow. `researchCycle` is in-memory state; trace records store individual model outputs, but they are not a durable multi-pass job. A single `running` flag serializes work without a visible scheduler.

Create a local run store with immutable input snapshots and states `queued`, `running`, `waiting_for_review`, `blocked`, `completed`, `failed`, `cancelled` and `interrupted`. Store the current stage, completed stage IDs, source revisions, output IDs, failure reason and parent task. On restart, mark unfinished running work interrupted. Resume should be deliberate and reuse only valid checkpoints. Never infer completion from a closed window or successful HTTP response alone.

Start with one inference slot by default. Queue multiple tasks without loading multiple models into memory. Make concurrency a hardware-aware advanced setting only after measured memory behavior. Local scheduling should not send hardware identifiers to a server.

Acceptance: queue three tasks; close every panel; finish one, block one and cancel one; restart; see correct states and preserved outputs; retry without duplicating committed research nodes.

### 2. Relations need semantics shared by graph and runner

The app derives some relations from agent assignments and wiki text, while storing other connections as generic `from/to` pairs. A task-to-task connection is treated as a dependency by the scheduler. A generic-looking line therefore has operational consequences.

Introduce explicit relation types: references, supplies context, uses model, depends on, produced, supports and contradicts. Only depends-on edges schedule prerequisites. Supports/contradicts edges carry review provenance. Inferred wiki links remain visibly distinct and are changed at their source text. Provide a textual relation label in the inspector even when the graph is zoomed out.

Migration must preserve old behavior deliberately, preview inferred task dependencies and retain an undoable backup. Do not silently reinterpret every existing link.

### 3. Source identity and revision must survive editing

Wiki links are title-based. Renaming a title can break references. Duplicate titles now avoid a wrong graph edge, but the user still needs an ambiguity message and a way to choose the intended file. A file's extracted text, editable note and original blob can diverge. The current `includes(excerpt)` check is useful but not a full source revision system.

Use stable source IDs, content revisions and passage locators. Keep source text separate from interpretation. Store the exact excerpt used, page/section or offsets, extractor version and source checksum. A changed source should invalidate its dependent claim visibly while preserving the historical decision. Source identity must survive export/import with remapped IDs.

Acceptance: rename a source; edit its text; replace its original; reopen an older claim. Each case must explain what remains valid and which version was reviewed.

### 4. Retrieval coverage is a product state

`selectContext` scans at most 256 Ki characters per selected file, with a 1 Mi-character aggregate budget, and returns up to four approximately 1000-character passages. This is bounded keyword retrieval, not a complete reading of a large knowledge base. The runner may further trim context to fit its performance profile.

Add a preflight result reporting files selected, files readable, text scanned, passages chosen, truncation and empty/unmatched sources. Preserve headings and page locations during chunking. Show exact final model input coverage, not just the upstream selection. An index should be incremental and local. Add retrieval fixtures containing paraphrases, repeated boilerplate, multilingual text, OCR errors, contradictory results and a relevant passage beyond the current scan cap.

### 5. Model writing quality needs evidence-based evaluation

A better prompt helps but cannot turn a small model into a reliable independent researcher. Evaluate factual support, citation accuracy, uncertainty, contradiction handling, task completion and plain-language usefulness separately. A sentence with a valid source tag can still be unsupported.

Use a fixed corpus with known claims and reviewer judgments. Score whether the output changes a user's next action, not whether it sounds polished. Require outputs to distinguish what the source says, what the run inferred and what remains untested. Keep conversational filler out of saved research, but never hide uncertainty to make the text sound more human.

### 6. One state owner per interface surface

Multiple scripts wrap `render`, replace inspector functions and attach global handlers. CSS spans many overlapping files with extensive `!important` overrides. This makes regressions such as reopened panels and inconsistent themes predictable.

Move toward explicit workspace state, panel state and run state. Keep graph selection separate from inspector visibility. Closing a panel should survive background completion and redraw. Render a panel from one owner; update only the region that changed. Establish semantic tokens for surfaces, text, lines, focus, selection and status; retire competing legacy rules rather than adding permanent override layers.

## Graph interaction specification

The global map is for orientation. The local graph is for explaining a question. Canvas is for deliberate composition. A task queue is for execution. A document view is for reading. They operate on the same records without pretending to be interchangeable.

| Interaction | Required behavior |
| --- | --- |
| Select | Single click selects and opens a readable inspector. Keyboard focus exposes the same label and context. |
| Follow connection | Open the linked item with a back route. Preserve the previous selection, scroll and camera. |
| Focus neighborhood | Keep the source node visible and show depth, active filters and hidden-node count. Clearing focus restores the prior global camera. |
| Center | Change the camera only. Do not move nodes or require saving unrelated edits. |
| Organize | Change only the visible layout, preserve hidden/manual placements according to an explicit policy, and provide undo. |
| Search | Display meaningful matches and excerpts; explain whether filtering affects the list, graph or both. Offer Clear search. |
| Zoom | Preserve the point under the cursor. Increase detail with zoom rather than shrinking everything into unreadability. |
| Large collection | Use viewport culling, an adjacency index and bounded label work. Dense graphs should default to selected neighborhoods or grouped overview. |
| Active run | Animate only real traversal events. Respect reduced motion. A label still communicates activity when motion is disabled. |
| No data | Offer import, note and example actions with exact next steps. Do not render fake relationships. |
| Failed/blocked | State the cause and a recovery action at the affected task; retain completed research. |

`placeNetworkLabels` currently compares candidate boxes against previous labels and node boxes while measuring SVG text. It runs on camera changes and dragging. The large-node layout shortcut does not remove this label cost. The 1500-node organization unit test validates deterministic positions; it is not evidence of smooth 1500-node interaction.

Proposed performance gates, to measure rather than advertise: input feedback below 100 ms for ordinary work; no multi-second main-thread stall at 1000 notes; p95 pan/zoom frame time within 33 ms on the defined low-spec test machine. Test 100, 1000 and 5000 nodes, sparse and dense links, long labels and isolated clusters. Record hardware, build, memory, frame times and input latency. If a limit is exceeded, offer a focused view with a clear explanation.

## Visual system

Keep the existing mark, Agenetic by Groundplanes attribution, pill navigation and restrained editorial character. The application needs less empty ceremony than the launch page because it is used repeatedly for work.

### Type and spacing

Use Instrument Sans for controls and working text, an editorial serif for workspace/document titles, and IBM Plex Mono only for technical identifiers and compact metadata. Proposed scale: 12 px metadata, 14 px controls, 15–16 px reading copy, 20 px panel title, 30–32 px workspace title. Avoid using 9–10 px as the default for important status. Maintain 1.5–1.7 line height for reading and cap long-form lines near 65–75 characters.

Use a 4-pixel spacing base: 8 within a control group, 12 between related fields, 16 within compact panels, 24 between sections and 32 around major reading areas. Border radius communicates level: pill for navigation, 10–12 px for fields and cards, 18–22 px for a floating panel. Do not round every nested element into the same shape.

### Color and depth

Use one neutral foundation and restrained category colors. Keep category identity separate from validity: a teal source is not automatically verified. Write review status as text and supplement it with shape or an icon. Define light and dark semantic tokens once and test both built-in and community themes against those tokens.

Depth should come from a quiet canvas, a distinct reading surface, thin boundaries and controlled elevation. Keep atmospheric tint at the perimeter. Do not put noise over text or use a bright halo for every node. The quieter option is selected-edge emphasis; continuous glowing traffic was considered and rejected because it suggests work that may not be occurring.

### Working surfaces

The inspector needs clear Read, Edit and Connections responsibilities. Evidence review should place claim and source beside each other on wide screens, with an explicit source switch on narrow screens. Model configuration belongs behind a setup action unless it blocks the current run. Community is a distinct publishing destination with visible privacy boundaries, not a competing primary toolbar.

A compact review queue is implemented in this patch. A full split document reader, navigation history, saved views and task journal are specified here but not delivered by that queue.

## Validation and release sequence

1. Repair state/provenance defects and add regressions before changing the interaction model.
2. Exercise the actual DOM through save, close, reopen, filters, review, theme changes and narrow navigation. Use a clearly mocked model boundary to isolate UI behavior.
3. Build durable task/checkpoint storage with interruption, retry and migration tests.
4. Add source locators and final-context preflight; evaluate against the fixed research corpus.
5. Refactor the shell and tokens behind screenshot/interaction tests. Do not remove features to obtain a cleaner screenshot.
6. Test real Windows inference on supported small and larger GGUFs, then signed install/update with populated local vaults.

For this patch, automated tests cover actual DOM behavior in Chromium, five default themes, narrower navigation and the evidence submit path. They do not exercise real model inference, user comprehension, every screen, production identity, original PDF page navigation, hardware memory limits or screen-reader usability. Screenshots are diagnostic artifacts, not automatic design approval.

Before calling the redesign ready: test keyboard-only use, focus return after dialogs, contrast under custom themes, 200% scaling, 390/768/1024/1440 widths, long filenames, right-to-left text, reduced motion, offline operation, failed writes, changed sources, interrupted inference and export/restore. Observe several researchers completing the acceptance scenario without coaching. Measure task success and recovery, not only preferences about appearance.

## Observed validation results

Commit `75ec796b01bb587571a181a4e678efd89266d9c1` passed [GitHub Actions run 44068406022](https://github.com/T6ck/Agenetic-By-groundplanes/actions/runs/44068406022): 65 unit tests and 14 Chromium interaction checks. The model boundary was mocked. No real inference or Windows update claim follows from these results.

Manual inspection of the generated 1440-pixel Porcelain screenshot shows a consistent light surface and readable node labels, but the lower explorer has too many competing destinations and the central graph remains crowded. The 390-pixel screenshot shows header overflow and an explorer occupying most of the graph. The narrow-screen test proves destination reachability only; it does not prove responsive layout quality. These are open design defects. Add explicit overflow and usable-canvas assertions before treating mobile layout as supported.

The first CI attempt failed while installing Chromium dependencies on the newer Ubuntu image. Pinning the audit runner to Ubuntu 24.04 resolved that infrastructure failure. Diagnostic screenshots and the check manifest are attached to the successful run.

## Sources

1. [Obsidian Graph view](https://obsidian.md/help/plugins/graph)
2. [Obsidian Backlinks](https://obsidian.md/help/plugins/backlinks)
3. [Obsidian Canvas](https://obsidian.md/help/plugins/canvas)
4. [Zotero PDF reader and note editor](https://www.zotero.org/support/pdf_reader)
5. [Obsidian Workspaces](https://obsidian.md/help/plugins/workspaces)
6. [Obsidian Bookmarks](https://obsidian.md/help/plugins/bookmarks)
7. [Obsidian Command palette](https://obsidian.md/help/plugins/command-palette)
8. [Nielsen Norman Group: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
9. [Nielsen Norman Group: Recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/)
10. [W3C: Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
