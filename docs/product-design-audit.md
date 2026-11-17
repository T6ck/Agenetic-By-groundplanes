# Agenetic product design audit

17 November 2026. Reviewed source on `research-ux-audit` at `0c1e13b5a953a3ec36566c990ffe470b9d75cd67`, alongside the previous Chromium screenshots and interaction audit. This is an expert assessment, not usability research with participants. Community, onboarding and models findings below are source-based; they are not claims of fresh visual testing on every screen. Recommendations are not shipped changes.

## Overall judgment

The Groundplanes identity is starting to hold together: restrained surfaces, editorial titles, a recognizable mark and the floating pill header. Keep those. The product still feels assembled from separate features because the navigation, terminology, symbols and reading surfaces do not agree on what matters most.

The central problem is hierarchy. Notes, setup, donations, research actions, account identity and model plumbing compete at similar visual weight. The graph makes a document, a claim and a research output look like the same object. The copy then has to explain distinctions the interface should already communicate.

Target feeling: a calm, precise research workbench. The user should know what they are reading, where it came from, what is running and what needs a decision. Character should come from well-made objects, typography and confident interaction. More ambient effects would not solve the current problems. The louder option of glowing nodes and continuous animated edges was considered; selected-path emphasis and event-driven motion are the quieter choice.

## Findings by priority

| Priority | Finding | Evidence | Required change |
|---|---|---|---|
| P1 | Navigate shows a document symbol | `navigation.js` requests `lineIcon('menu')`; `knowledge.js` has no menu path and silently falls back to note | Add the intended navigation symbol; validate icon names so mistakes cannot masquerade as documents |
| P1 | Ordinary confirmations look destructive | `product.js` assigns every `confirmRemoval` confirmation the danger class; downloads and tool calls also use it | Separate neutral, external-action and destructive confirmations; retain the requested second confirmation for deletion/publication |
| P1 | Several names describe the same action | Review evidence, Research cycle and Start research cycle refer to the same three-pass flow | One destination/action label: Compare sources; use implementation details in supporting text |
| P1 | Companion names two different things | `research.js` uses Companion for suggestions; `models.js` and `execution.js` use companion for the local runtime | Research assistant for the optional helper; Local runtime for the model service |
| P1 | Research types collapse into file appearance | `signals.js` branches by file/agent/task/model; a file-based claim uses the same document silhouette | Preserve base record type but show source/draft/claim subtype and review status at useful zoom levels |
| P1 | The source-to-result path is visually obscure | Graph legend combines context, assignment and model relationships; most lines share presentation | Explain the selected relation in text; distinguish dependency, source reference and produced result before adding visual density |
| P1 | Mobile reachability is mistaken for usability | Earlier 390 px screenshot has header overflow and an explorer covering much of the graph | A compact shell and explicit list/map switch; test overflow, focus and usable content, not just whether a button exists |
| P2 | Sidebar utility growth squeezes the actual collection | Footer additions in `navigation.js` and `product.js` append multiple destinations | Separate collection navigation from utilities; put support/licensing in About, keeping support discoverable but quiet |
| P2 | Interface copy contains development history | Models says “There is no 1 MB model limit”; onboarding says no model is “secretly running” | Describe the current operation and limits without rebutting old bugs |
| P2 | Copy frequently sounds like marketing | “Find your way.”, “Find your working light.”, “Real execution, inspectable.” | Plain task names inside the app; reserve expressive voice for welcome/brand moments |
| P2 | Workspaces, spaces and local profiles overlap conceptually | `canvas.js`, `profiles.js`, `identity.js` use all three | Workspace is a project collection; profile is a separate local data collection; identity is name/avatar. Explain isolation at profile creation |
| P2 | Community spends too much attention explaining itself | `community.js` contains a slogan, introductory paragraph, boundaries, scope and composer explanation | Lead with discussions and contributions; retain concise visibility information next to Publish with detailed disclosure available |
| P2 | Theme previews do not represent working conditions | `appearance.js` shows background plus little swatches | Preview text, selected node, relation, field and focus state together |
| P2 | The model catalog requires expertise before giving direction | `models.js` leads with connection commands, file formats and repository inspection | Separate installed models, finding a model and advanced runtime setup; show next action and verification state |
| P2 | Commercial copy is stale against the product | `product.js` says the license does not include a desktop release despite the desktop beta | Resolve actual commercial entitlement, then update copy. Do not silently invent license terms |
| P3 | Background, radius and serif treatment spread across too many surfaces | `family.css`, `polish.css`, `groundplane.css` and theme overrides | One component/token owner for each surface; avoid adding another permanent override layer |

## Copy system and exact revisions

Voice: direct, thoughtful and specific. Name the object, state the result and give the next action. Avoid making the app sound conscious, making local storage sound encrypted, or making model output sound verified. Do not remove useful uncertainty to make research sound more human.

| Current text | Proposed text | Reason |
|---|---|---|
| Find your way. | Navigate | Identifies the actual action |
| Your ideas start here | Add your first source | Gives the empty state a useful next step |
| Find your working light. | Choose an appearance | Clear setup step |
| Your files, your responsibility. | Keep a backup of your work | Helpful instead of accusatory |
| Models, on your machine. | Local models | Matches navigation |
| There is no 1 MB model limit. | Model size is limited by disk space. Running a model also requires enough memory. | Current facts rather than support history |
| Select a registered model | Choose a model | Avoids internal vocabulary |
| Research cycle | Compare sources | Describes the research task |
| Real execution, inspectable. | Run history | Describes the destination |
| Local runner session available | Local runtime connected | Describes connection, not verified inference |
| Ideas travel. Your vault stays. | Community | Frees reading space for actual contributions |
| Choose what to share. | New post | Makes the composer recognizable |
| No model is secretly running | Example documents and tasks are included. Runs start only when you choose Run. | Neutral and operational |
| Download appearance | Export theme | Matches the shared object |
| Import appearance | Import theme | Matches export |
| Publish reviewed package | Publish theme / Publish workflow | Name the actual object |
| No open questions or missing references found by local checks | No suggestions from the current checks. You can compare selected sources or create a task. | Does not imply exhaustive review |

Use Task everywhere for an executable work item; Step only when describing its position in a workflow. Use Notes and sources for the explorer section rather than the vague Knowledge. Use Connections in ordinary UI; retain graph and node in graph settings and technical documentation. Keep GGUF visible where selecting files, with one short explanation rather than hiding the required format.

Error pattern: what failed, what was preserved, what can be done next. Example: “The comparison stopped during synthesis. The first two passes are saved in this session. Save the draft or retry synthesis.” Only use “saved” after durable persistence; the current partial results are not a resumable journal. Never substitute reassuring copy for missing recovery.

Status language must distinguish loading a model, reading selected passages, generating, waiting for review, blocked, failed and complete. A connected runtime is not proof that the chosen model runs. A completed model request is not proof that the research task succeeded.

## Icons: a small, consistent vocabulary

Keep a single 24-unit source grid, consistent stroke weight and optical alignment. Use 16–18 px icons in labeled controls and 20 px in major navigation. Click targets are larger than the visible glyph. Test at 100%, 125% and 200% scaling. All icon-only actions need an accessible name and visible focus.

| Meaning | Symbol decision | Constraint |
|---|---|---|
| Navigate | Simple menu/list | Never fall back to a document |
| Explorer toggle | Split panel | Orientation indicates which panel changes |
| Appearance | Palette | Separate from graph sliders |
| Graph settings | Sliders | Reserved for display/layout controls |
| Source/note | Document | Subtype text distinguishes imported source and authored note |
| Agent | Existing hexagonal mark | Keep recognizable; do not use its plus sign to imply Add |
| Task | Checklist/action glyph | Same identity in explorer, graph and canvas |
| Model | Chip | Runtime engine, not a running-state indicator |
| Review | Document with check | Check means review action, not automatic factual truth |
| Run history | History/clock | Avoid graph icon, which already means another destination |
| Export | Download arrow | Reserve upload/share for outgoing publication |
| Delete | Trash | Close X should close, not delete a local profile |

`signals.js` currently renders a task as an arrow-shaped object while the explorer uses a checklist. These can be variants only if the task label remains clear and the family resemblance is intentional. Current agent hexagon-plus can read as medical/add; keep its outline but choose an interior mark through a small recognition test. Do not replace everything with a different icon library solely for novelty.

## Nodes: objects with meaning, not ornaments

Retain differentiated geometry. The current rendered graph uses document, hexagon, arrow and chip shapes; the older orb renderer remains in source but is overridden by `signals.js`. Do not mistake that dead/overridden rendering path for the current appearance.

Use three levels of detail:

1. Overview: compact type silhouette, selected/focused labels, quiet connections. No decorative halos or status paragraph on every object.
2. Working view: readable title, subtype and one necessary state such as Draft, Needs review, Blocked or Source changed.
3. Selected object: inspector with source passages, incoming/outgoing relationships, last result and the next useful action.

Do not encode importance by connection count alone. A heavily linked note is not necessarily more trustworthy. Default to stable type sizes; optionally show degree as a separate graph preference. Category color answers “what is this?” State text answers “what needs attention?” A reviewed claim can still be disputed or invalidated by a source change.

Labels should have restrained backing or a clear exclusion region so edges do not cross through text. Selected titles take precedence; unresolved collisions hide lower-priority labels and preserve access through the list. Use semantic zoom rather than letting text become tiny. A hover title is supplementary, not the only way to identify an object.

Graph relations need direction only when direction matters. A source reference and a task dependency should not look equally executable. On selection, emphasize incoming/outgoing relevant paths and dim the rest. Show the edge meaning in the inspector. Keep packet pulses tied to observed activity and stop them when the request stops. Motion must have a static equivalent.

Acceptance scene: an original PDF, two extracted passages, one draft, one disputed claim, a reviewing agent and a blocked next task. A user should be able to identify each without opening every node and explain why the next task is blocked. This is the design benchmark, not a larger constellation of sample dots.

## Shell, reading and overall feel

Keep the Groundplanes pill header, but give it a disciplined budget: workspace switcher, Graph/Canvas, search/navigation and profile. Creation belongs near the workspace; configuration belongs in settings. The explorer should devote most of its area to the collection. Show research review/task counts where they support work, not as dashboard metrics.

At narrow widths, use one primary surface at a time. Explorer and inspector become dismissible sheets with explicit return routes. Preserve camera and selection. The header must fit without horizontal scrolling. Do not squeeze desktop toolbar contents into smaller text.

Reading is currently subordinate to graph interaction. Give source reading a stable pane, generous line height, section navigation and source location. Review should put claim and source together. Long-form research should not live in a small generic modal surrounded by configuration controls. Short confirmations remain dialogs.

Use Instrument Sans for controls and reading, the existing editorial serif for workspace/document titles, and IBM Plex Mono sparingly for identifiers. A title does not need to become a launch-page headline on every screen. Adopt 12/14/16/20/30–32 px roles; important status must not depend on 9–10 px metadata. Use spacing to group related actions rather than boxes around everything.

Themes should share structure and behavior. Preserve five choices but make their purpose clear: Groundplane for the default light workspace, Graphite for neutral dark, Slate for cool dark, Paper for warm reading and Tide for cool light. Three light themes currently vary hue more than function. Make reading surface, selection and focus visibly distinct in all of them. Custom node colors must not make review status indistinguishable. Test token combinations instead of approving swatches in isolation.

Onboarding should demonstrate a small successful task after the necessary local-storage explanation. Let users read and organize without choosing a model. Put Python commands and advanced runtime flags behind setup help. The current six-step flow has useful facts but too much documentation before the first useful result. Keep the required privacy explanations and improve their placement rather than deleting them.

Community needs a contribution-first layout: channel navigation, feed, then a composer opened by New post. A permanently open third column competes with reading. Theme/workflow listings should show preview, author, version, compatibility, contents and import effect before installation. Keep precise disclosure at publication. Avoid repeating the same privacy paragraph in three regions of the page.

## Delivery order and acceptance

1. Correct icon fallbacks, destructive styling on neutral actions and inconsistent names. Confirm that accessible labels still match visible text and test descriptions.
2. Consolidate navigation and identity vocabulary. Verify new users can find source import, models, review, backup and update information without coaching.
3. Implement the node subtype/state system and relationship inspector against the acceptance scene above. Check monochrome and reduced motion.
4. Build the reading/review surface, then simplify community and model discovery around actual tasks.
5. Consolidate theme tokens and remove competing overrides. Check all five themes, one deliberately difficult imported theme, long text and narrow widths.

Measure task completion, incorrect actions, recovery and comprehension. Test with researchers who did not build the app. Include a weak laptop, a large collection, empty collection, failed model run and changed source. Existing 65 unit/14 browser checks do not validate these broader design claims.

Do not call this audit a completed redesign. The previous PR contains the first functional corrections. This document expands the design backlog with concrete copy, icon, node and screen decisions. No new desktop release or update delivery is implied.
