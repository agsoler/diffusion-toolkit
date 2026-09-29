# Diffusion Toolkit: agent working agreement

## Purpose and remotes

This is Albert's fork of Ostris AI Toolkit. Preserve upstream compatibility while improving training, generation, comparison and LoRA evaluation workflows.

- `origin`: https://github.com/agsoler/diffusion-toolkit.git
- `upstream`: https://github.com/ostris/ai-toolkit.git
- Be direct and precise. Distinguish completed work from plans and verified facts from assumptions.

## Checkouts and branches

- `D:\Apps\LORA-Training` is the installed, running application and the `integration` checkout.
- `D:\Dev\diffusion-toolkit` is a linked development worktree. Use it for feature development and testing. It is not permanently restricted to `main`.
- `main` remains a clean upstream mirror. Do not put fork-specific features on it.
- `integration` combines approved features for Albert's working installation.
- Use focused `feature/*` branches for new work. Choose the base according to dependencies:
  - Independent upstream-ready feature: branch from clean `main`.
  - Feature depending on another feature: branch from that prerequisite branch.
  - Feature depending on the combined fork: branch from `integration`.
- Do not insist that every feature starts from `main`. Dependent features need their prerequisites.
- A feature branch based on `integration` includes its unmerged ancestors in a PR to upstream `main`. Before preparing an upstream PR, inspect the complete diff and isolate the intended changes, or wait for prerequisites to land.
- Never switch the installed checkout away from `integration` for feature development. Use the development worktree or another explicitly agreed worktree.

## Development and deployment

1. Inspect branch, worktree status and relevant local instructions before editing.
2. Develop and test in the development worktree on the appropriate feature branch.
3. Keep commits focused; review both the feature and its dependency chain.
4. Merge approved, tested changes into the installed `integration` checkout. Preserve existing uncommitted changes; never overwrite or reset them to make a merge work.
5. Build and restart the application only when deployment is in scope. A Git merge alone does not update the running UI.

The installed UI runs at `http://localhost:8675`. Do not interrupt training, captioning or generation for source-control housekeeping. When deploying UI-only changes, identify the current web UI process before restarting it; do not terminate the inference engine, worker or a broad process tree. Never reuse a PID from previous conversation history.

The development worktree is not automatically an isolated runtime. Before starting it, verify its ports, database paths, output paths and worker/engine behaviour so it cannot interfere with the installed application.

## Protect local data and customisations

- Back up dirty source, launch scripts, configuration and databases before restructuring existing changes.
- Use SQLite's backup mechanism for live databases; copying a database file alone may omit WAL changes.
- Keep models, datasets, generated images, databases, secrets, build output and temporary prototypes out of commits and upstream PRs.
- Keep machine-specific launch scripts, absolute model paths and local installation customisations separate from upstream-ready feature changes.
- Preserve unrelated edits. Do not use destructive reset/checkout/clean commands to tidy this installation.
- Do not submit upstream PRs without Albert's approval.

## Migration status

- Both worktrees and remotes are configured.
- The installed integration checkout includes upstream `ecee894` through merge commit `27e83cb` (2026-09-29). Keep `main` as the clean upstream mirror; sync upstream changes through a tested branch before advancing `integration`.
- Production improvements remain on `integration`. The configurable UI bind address and local setup scripts are committed; runtime data and the throwaway ranking prototype are not in source control.
- Focused branches have been reconstructed on the clean upstream `main` base `87f8090`:
  - `feature/generation-settings`: metadata/tooltips and restoring settings; base `main`.
  - `feature/folder-comparison`: checkpoint/strength sweeps; base `feature/generation-settings`.
  - `feature/survivor-ranking`: ledger, folder-scoped rankings and evidence; base `feature/folder-comparison`.
  - `feature/themed-scrollbars`: global scrollbar styling; independent base `main`.
- See `docs/FORK-WORKFLOW.md` for PR sequencing and the relationship to the integration baseline. Do not merge these reconstructed branches into integration just to duplicate changes already preserved there.
- Before branching from integration for dependent work, ensure the required customisations have been captured in commits. A new branch/worktree does not inherit another worktree's uncommitted files.
- Existing improvements include generation metadata, sending image settings back to Generate, folder comparison sweeps, survivor tracking and three ranking views, plus theme-aware scrollbars.
- The comparison/ranking workflow is scoped to the selected LoRA output folder, supports repeated prompts without a fixed trial count, and ranks surviving images by checkpoint or checkpoint-strength combination.
- A verified pre-restructuring backup is at `D:\Apps\LORA-Training-Backups\2026-09-14-integration`. It includes changed source, Git metadata, configuration and integrity-checked database backups, not a full copy of models/datasets.

Update this status as migration proceeds. This agreement is committed on integration; clean upstream-based feature branches do not automatically contain it. Consult the installed checkout's agreement when working in the linked development worktree.
