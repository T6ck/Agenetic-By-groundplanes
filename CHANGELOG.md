# Changelog

For installers, checksums, and notes by build, see [GitHub Releases](https://github.com/T6ck/Agenetic-By-groundplanes/releases).

## 0.2.17

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
