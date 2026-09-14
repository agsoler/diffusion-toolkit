# Text encoder selection

Settings → Z-Image text encoder controls the next Generate or Compare run.
An empty path selects the stock encoder. Training job configuration is unaffected.
The UI reads the saved setting once per run, freezes it for the comparison, and
records `te_name_or_path` in the engine-confirmed model metadata. Restoring an
image does not override this global preference; its tooltip shows its original encoder.

Rankings default to separate encoder cohorts within the selected LoRA folder.
The Settings checkbox can pool cohorts without altering stored results. Missing
encoder overrides in older records mean stock. Manual generations and baselines
remain excluded from competing standings.

Single-file Qwen3 encoders use the base model's tokenizer/configuration. Their
optional language-generation head is ignored: Z-Image consumes hidden states.
Scaled ComfyUI FP8 checkpoints use the existing quantization importer. The
Generate page's existing text-encoder quantization preference still applies;
ConvRot8 therefore requantizes imported FP8 weights. This is not a promise of
bit-identical ComfyUI output or improved adherence.

After deploying Python changes, restart an idle inference engine before testing.
Routine encoder changes subsequently trigger model reloads automatically.

Checks (run Node scripts from `ui`):

- `node test-ranking.cjs`
- `node test-compare-folder.cjs`
- `node test-encoder-identity.cjs`
- `python test-local-encoder.py <checkpoint> <base-model-directory> [quantization]`

The last check loads the actual encoder and runs a short CPU forward pass; it
requires installed Toolkit dependencies and several GB of available RAM.
