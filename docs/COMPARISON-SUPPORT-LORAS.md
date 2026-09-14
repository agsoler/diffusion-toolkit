# Supporting LoRAs in Compare

Compare snapshots enabled panel LoRAs with their exact weights. LoRAs under the
configured training folder, or under the folder being compared, are excluded from
that supporting stack. Each candidate is appended at 0.6, 0.8 and 1.0. The reference
retains supporting LoRAs but omits the tested checkpoint. Panel settings are not
modified. The existing merge/hook mode is preserved.

Each comparison result's round metadata identifies its candidate (or explicitly
null for the reference). Ranking and evidence use that identity, verified against
engine-confirmed LoRAs. Supporting LoRAs never receive candidate votes. Folder
scoping follows the comparison folder rather than supporting-model locations.
Older single-LoRA comparisons retain their original attribution; unmarked legacy
stacks remain excluded. Full stacks and weights remain in result metadata/tooltips.

Keep supporting configurations consistent across rounds when assessing a
checkpoint: the rankings pool rounds within the existing folder/encoder filters,
not separately by supporting stack.

Checks from `ui`: `node test-support-loras.cjs`, `node test-compare-folder.cjs`,
`node test-ranking.cjs`, `node test-round-deletion.cjs`.
