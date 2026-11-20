# Changelog

For installers, checksums, and notes by build, see [GitHub Releases](https://github.com/T6ck/Agenetic-By-groundplanes/releases).

## 0.2.17

- Choose Atlas, Clusters, Orbit, Flow, or Freeform. Each layout remembers its camera. Orbit can center on any record. Clusters show which records share a region.
- Trace paths, inspect the reviewed passage beside the current source, find claims affected by an edit, and save an investigation to reopen later.
- On the Atlas, rotation draws lighter contours during a drag. The reader can follow named wiki references and return to the previous record.

- Research keeps matching passages in the model input and checks their upstream evidence before saving each pass. Follow-ups remain proposals across restarts. Archived duplicates release review capacity.
- Pan and wheel gestures move the graph immediately. Label placement checks nearby nodes after the gesture settles.
- Select a passage directly in claim review. Package previews show the community upload size, and team workflow uploads accept up to 16 MB.

- Align graph titles with their status labels while zooming. Canvas cards now use the same type colors as the graph and show a stronger selection outline.
- The Research plan links directly to pending drafts or the selected source passages and shows run controls as they become available.

- Add a persistent Research tab with a local task queue, source-change monitoring, saved pass checkpoints, and optional bounded follow-up questions. Research continues across views while the app stays open and the device stays awake.
- Save results as linked drafts for claim review. Pause on changed sources or runner failures, and resume only unfinished passes. Limit concurrent requests and daily runs.
- Place new research beside existing sources without rearranging manual layouts. Optionally archive exact duplicate generated drafts with a restore control.
- Add document reading mode, clearer node states and navigation icons, a quieter community composer, and improved small-screen controls.
- Verify scheduler concurrency, interruption, persistence, source revisions, themes and navigation with 72 automated tests and 18 Chromium checks. Browser model responses are controlled test fixtures; all-day real-model endurance remains under beta testing.

- Show the installed version from the workspace and show the release channel before you check for updates. Apply a downloaded update from the Releases panel.
- Share one check between startup and manual requests, and keep a downloaded update ready until it is installed.
- Prioritize relevant excerpts from different sources so one long document cannot crowd out other evidence.

- Save graph edits and reviewed claims without reopening the editor. Close Companion with Escape or its close button.
- Rework the Groundplane and Graphite palettes and use direct labels for appearance and research controls.
- Keep evidence and critique together for synthesis, with prompts that ask for concrete findings, citations, and a specific next check.

- Sign Windows beta installers with Azure Artifact Signing. Install this build once to move from the unsigned preview onto the automatic update channel.
- Verify Windows trust and the exact signing profile before accepting beta updates.

## 0.2.16

- Show the installed version, release channel, and update status together when you select **Check for updates**.

## 0.2.15

### Fixed from beta feedback

- Opening Graph search with Ctrl+K or Cmd+K now saves a pending edit before expanding the Explorer.
- Previous Graph fixes carry through to this build. Explorer clicks stay available at narrower widths, and searching the Explorer keeps the panel visible.

### Release and updates

- Added a Releases entry in the app with an update check and links to patch notes and bug reporting.
- Added a signed beta release channel for pushes to `main`. Signed stable installers use a separate feed. Unsigned previews still install manually.
