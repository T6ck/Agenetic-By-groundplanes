# Agenetic graph design and workflow audit

Reviewed November 20, 2026 against Agenetic main at d918d8f. The reference material was the Mindcorpus homepage, its seven-stage workspace walkthrough, its tutorial and questions, and the preview image from the linked dashboard clip. The walkthrough uses an invented record. The preview shows colored traces on a dark plot. Full TikTok playback and the private Mindcorpus application were unavailable.

| Research task | What the reference shows or describes | What changed in Agenetic |
| --- | --- | --- |
| Recognize the workspace from a distance | A layered brain silhouette stays recognizable while the records are too small to read. A chart can show the same record from another angle. | Atlas places actual workspace records on a rotatable, original bilateral surface. A small set of landmark titles stays visible at overview scale. The surface has no selectable or counted records of its own. Empty workspaces show the import and note actions. |
| Understand why records sit together | The walkthrough lights a note's hub and paths. The guide explains the meaning of the marks in each layout. | Atlas groups by connected hubs and components. Marker shape and color identify type. Size reflects visible degree. Curve selection uses saved references, parsed wiki links, model attachments, source attachments and task assignments. A nearby record or a contour is never evidence of a link. |
| Follow one source through a workflow | The dashboard preview uses distinct colored traces. In the walkthrough a selection can also light the related records elsewhere. | Flow places model, source, agent and task records in columns, drawing only existing relationships. Selecting a record highlights its neighbors in either projection. The inspector distinguishes incoming and outgoing relations, including cited sources and task inputs. |
| Find a note, then recover its context | The tutorial describes retrieving a record and inspecting the entries behind it. | Exploring a search result restores its one-hop neighborhood even when its neighbors have different names or types. Following an inspector link reveals its target if filters previously hid it. Named wiki references open directly from the passage. Back returns to the preceding record. Missing or ambiguous references remain plain text. |
| Correct a record and trace its origins | The guide describes keeping original entries separate from interpretations and dating corrections. | Agenetic already retains reviewed source passages and links drafts to sources. The graph routes to those records. Unrestricted note-edit history, tool-driven corrections with undo, and a new history store are separate work. |
| Navigate a large or changing graph | The scripted walkthrough illustrates a 70,000-entry record. It does not establish an interactive performance measurement. | Atlas groups once per topology change. Rotation projects local coordinates and reuses the SVG elements. Wheel zoom moves the existing world transform. Dense-label collision checks and keyboard navigation use the same graph as Freeform. No model call is needed to lay out records. |
| Return to an existing project | An alternate view should preserve the user's sense of place. | Workspaces with a saved graph camera or manually placed nodes start in Freeform. A new space starts in Atlas. The mode, three cameras and atlas angle belong to the workspace. Freeform keeps its positions and undo history. |

## Design decisions

The original graph's equal-size document glyphs, rectangular organization and distant labels made the overview read like a diagram of files. Its strongest behaviors were the cursor-anchored zoom, reader, keyboard navigation and real-link filtering. Atlas and Flow share those behaviors. Atlas supplies orientation and Flow exposes the links precisely enough to read. An isolated record remains selectable. Its proximity to another record never creates a stored relationship.

Agenetic's role colors follow the device theme. The Atlas uses distinct marker shapes for grayscale reading, uses a fixed initial angle, and rotates only on input. Freeform remains the editing surface for manual placement. The inspector and graph can be used with a keyboard.

## Where the workflows differ

| Step | What the Mindcorpus public guide describes | Agenetic behavior and decision |
| --- | --- | --- |
| Capture | Import dated conversations and notes or deliberately enable live capture for individual sources. | Files enter the local vault by explicit import. The graph reads the active workspace. Adding chat capture would require origin metadata, author attribution, duplicate detection and source-level removal. |
| Organize | Agents suggest how entries should be filed. The record can be explored from the brain, a timeline or a table. | Atlas computes groups from the existing links. Switching views writes display preferences only. It does not assign sources to an agent, rewrite a note or generate a claim. |
| Investigate | A note or a time range can light the relevant paths. A guide explains the current projection. | Atlas encodes type in shape and connection count in size. Flow exposes typed links and whether a record supplies or receives context. The original Freeform view handles manual dragging. Each layout's explanation is available in Graph settings. |
| Review | The guide describes separate original writing, machine interpretation, and dated corrections. | A saved draft opens in the existing review path. A reviewed excerpt links back to its source and stored revision. The graph label “Draws from” identifies a source relationship. It does not certify the contents of the claim. |

## Implementation and verification

The browser and Electron renderer load the same graph code. The spatial layout uses a multi-source traversal from agents and high-degree records, groups disconnected components separately, and projects the resulting 3D coordinates into the existing SVG. Dragging the Atlas rotates the coordinates. Zooming transforms the existing world. Flow and Freeform reuse the same workspace records, link index, keyboard targets and inspector.

The regression checks exercise mode changes against the populated Fieldwork workspace, verify real edge counts, follow a wiki reference and return, and reload after rotating and organizing. A separate Chromium test uses 600 linked notes. The layout fixture uses 1,500 records. Those checks establish behavior at their tested sizes. They do not establish parity with the scale depicted in the Mindcorpus walkthrough.

## Scope and remaining questions

A date wheel would require a trustworthy record date, timezone policy and explicit handling for undated imports. Live chat capture would require a source-specific ingestion, permission and deletion workflow. The reference's research licensing program describes a separate product direction. None of these capabilities is necessary for exploring the records already in Agenetic.

For release validation, measure input latency in the packaged Windows app on an integrated GPU with a representative large vault. Verify touch gestures on hardware and test whether first-time users can distinguish a surface contour from a saved link without opening settings.

[Mindcorpus homepage and workspace walkthrough](https://mindcorpus.org/#home) · [Tutorial](https://mindcorpus.org/#tutorial) · [Questions](https://mindcorpus.org/#questions) · [Dashboard clip](https://www.tiktok.com/t/ZPNFhBBre/)
