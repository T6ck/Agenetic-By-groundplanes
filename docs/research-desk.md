# Research tab

The Research tab keeps a local queue and update journal for the current workspace. Choose a goal, a registered local model, and one to four readable sources, save setup, then select Start research.

## What runs

A changed source revision queues a comparison. Each task performs evidence review, critical review, and synthesis sequentially. Every completed pass is saved before the next request. Completed results become linked draft nodes and enter claim review; generated text never becomes approved evidence automatically.

Optional follow-ups branch from the same original sources to a maximum depth of two. Automatic placement preserves existing positions. Optional duplicate handling archives only exact unattended draft duplicates with matching source provenance. Sources and reviewed claims are never automatically deleted. Restore is available in Duplicate recovery.

## Controls and limits

- One local request at a time, including competing scheduler ticks.
- Quick or Balanced request profiles, source checks every 5–60 minutes, and a configurable 1–48 run limit per rolling 24 hours.
- Up to 20 unfinished tasks per workspace. Finished tasks remain in paginated history. Capacity errors pause scheduling with a visible explanation.
- Pause saves the current completed pass and schedules no next pass. Stop asks the runner to cancel; cancellation support determines how quickly the active request ends.
- Source changes during inference block stale output. Resume retains completed passes only while the source revision still matches.
- Changing workspaces pauses scheduling. Relaunching the app preserves the journal but requires an explicit restart.

Agenetic must stay open and the device must stay awake. Desktop windows have background throttling disabled for minimized operation. Browsers can suspend background tabs. There is no closed-app service, unattended internet browsing, external tool execution, or automatic publishing in this feature.

## Validation

Automated tests exercise queue limits, daily budgets, checkpoint recovery, provenance-aware duplicate recovery, and position preservation. Chromium checks use controlled model responses to test persistence, cross-view execution, concurrent timer ticks, interruption, and mid-run source changes. These do not establish real-model quality, Windows sleep/resume behavior, or an all-day hardware endurance result.
