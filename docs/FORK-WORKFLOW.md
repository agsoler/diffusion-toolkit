# Fork integration and feature branches

## Checkouts

The installed application at `D:\Apps\LORA-Training` stays on `integration`.
Development happens at `D:\Dev\diffusion-toolkit`, a linked worktree where feature branches can be switched without touching the installation.

The development worktree currently shares the installed UI's `node_modules` through a local Windows junction for validation. Do not install, upgrade or delete dependencies through that junction; those operations would affect the installation. Provision independent dependencies before dependency-changing work. This junction is not committed.

## Preserved baseline

`5091da5` on integration preserves all production UI improvements together on the installed upstream base `881143c`. It excludes machine-local launch scripts, the localhost binding change, databases, models, generated data and the throwaway ranking prototype. The prototype route import/gate was removed from production source; prototype files remain locally backed up.

The focused branches below were reconstructed on upstream `87f8090`; integration was not rebased or silently upgraded. Their different ancestry is intentional. Do not force-push integration or merge reconstructed commits merely to add features already present in the baseline.

## Focused commits and dependencies

| Branch | Feature commit | Base / proposed review target |
| --- | --- | --- |
| `feature/generation-settings` | `8dbf7b3` | `main` |
| `feature/folder-comparison` | `d2f659c` | `feature/generation-settings` |
| `feature/survivor-ranking` | `99bf395` | `feature/folder-comparison` |
| `feature/themed-scrollbars` | `31df20a` | `main` |

Generation settings includes engine-confirmed metadata, informative result tooltips and the right-click action to restore settings. Folder comparison adds serial fixed-strength sweeps, consistent seeds, cancellation and completion handling. Ranking adds persistent attempts/survivors, filtering and three evidence views. Scrollbars is independent.

For upstream submissions, metadata and scrollbars can be reviewed independently. Comparison depends on metadata; ranking depends on comparison. A PR to upstream main from a dependent branch includes its unmerged prerequisites. Use stacked PRs within the fork for focused review, or submit upstream sequentially after prerequisites land and adjust the remaining branch base deliberately.

No upstream PR is authorised merely by creating or pushing these branches. Obtain Albert's approval before submitting one.

## Continuing development

Choose a feature base according to its actual dependencies. Integration-based work is valid when it needs the combined fork; inspect its full upstream diff before proposing a PR. Keep main clean. Merge tested, approved new features into integration without losing local customisations; deploy separately and never interrupt active GPU work for Git housekeeping.

The pre-migration source/configuration/Git and live-database backups are stored locally at `D:\Apps\LORA-Training-Backups\2026-09-14-integration`.
