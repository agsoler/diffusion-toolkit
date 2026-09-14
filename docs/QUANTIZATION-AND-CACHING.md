# Quantization and model caching

This describes the v2 component loader used by the fork's Z-Image inference engine,
checked on 14 September 2026. Other model loaders and future versions may differ.

## What the Generate controls mean

**Quantize Transformer** selects the runtime quantization of the diffusion
transformer, not the required format of the input checkpoint. **Quantize Text
Encoder** independently selects the text encoder's quantization. Neither setting
overwrites the source model or changes the saved LoRA file.

ConvRot8 rotates eligible weights and activations using a fixed Hadamard-based
transform to spread outliers, then uses symmetric 8-bit integer quantization.
Its accelerated inference path uses 8-bit weights and activations (W8A8).
Unsupported execution paths can fall back to dequantized matrix multiplication.
Excluded or ineligible layers remain higher precision: this is not an assertion
that every tensor uses eight bits, or that total VRAM use halves.

The benefits are reduced weight memory and potentially faster computation.
Quantization can change outputs; speed depends on hardware, kernels, model and
offloading. Training uses a different computation path from inference.

## Input files with ConvRot8 selected

| Input checkpoint | Loader behaviour |
| --- | --- |
| BF16 | Loads the weights and quantizes eligible layers to ConvRot8. |
| Plain FP8 weights | The standard cast-on-load path casts weights to the requested computation dtype, then quantizes to ConvRot8. |
| Recognised scaled/mixed FP8 | Imports the quantized layers with their scales, then requantizes to ConvRot8. |
| Supported NVFP4 | Imports the packed weights and quantization metadata, then requantizes to ConvRot8. |
| Recognised ConvRot8 | Keeps the shipped quantization when it matches the requested backend. |

Requantization between supported Ostris backends reconstructs approximate weights
and converts one layer at a time; it does not require keeping a second complete
full-precision model resident throughout the conversion.

`.safetensors` is a container, not a guarantee of compatibility. Architecture,
tensor names, packing, scales and format markers must match the loader's support.
An arbitrary file labelled FP8 or NVFP4 may not load correctly. The importer
recognises formats such as `.comfy_quant` layer metadata and legacy `scaled_fp8`
markers; filenames alone do not identify these formats.

## Preserving an existing quantization

The requested backend governs the result. Selecting ConvRot8 for an NVFP4 source
does **not** keep it at four bits. Select NVFP4 to preserve a compatible checkpoint's
shipped NVFP4 quantization. Matching is by backend identifier, not just nominal
bit width. For intentionally mixed checkpoints, a requested backend present among
the shipped backends can preserve the whole shipped mixture.

Selecting no quantization reconstructs supported quantized layers at the requested
floating-point precision. It does not recover information lost when the source
was quantized. Accuracy-recovery-adapter loading also takes a fresh conversion
path rather than simply retaining the shipped quantization.

## Does conversion create a cached model file?

**Not automatically on disk.** The inference engine keeps loaded components in an
in-process component pool for reuse. Subsequent requests can reuse compatible
resident components; configuration changes can cause conversion, reload or eviction.
Stopping the engine clears that in-memory reuse. A later start loads and converts
again unless the source is already in a compatible quantized format.

Downloaded source files have a separate disk cache. That cache is not an automatic
export of the runtime ConvRot8 conversion. The source checkpoint remains unchanged.

## Quality and memory implications

- BF16 is the cleaner starting point for a new ConvRot8 conversion.
- FP8 → ConvRot8 retains the FP8 source's existing information loss and can add
  conversion error.
- NVFP4 → ConvRot8 does not regain BF16 quality. It generally increases weight
  storage relative to retaining NVFP4 and can add further quantization error.
- Loading/conversion can need more memory than steady-state generation. Allow
  headroom for temporary buffers, activations and the other model components.

The same principle applies to the custom text encoder: loading an FP8 Huihui file
with ConvRot8 selected requantizes it. See [Text encoder selection](TEXT-ENCODER-SELECTION.md).

## Implementation references

- [`_mixin.py`](../toolkit/models/v2/_mixin.py): `load_model`,
  `load_from_state_dict`, and the pre-quantized handling in `aitk_post_load`.
- [`comfy_quant_import.py`](../toolkit/util/comfy_quant_import.py): supported
  checkpoint markers, packing and scale import.
- [`convrot_quant.py`](../toolkit/util/convrot_quant.py): `ConvRotInt8Quantizer`,
  eligible layers and computation paths.
- [`pool.py`](../toolkit/models/v2/pool.py): in-memory component reuse.
- [`engine.py`](../extensions_built_in/inference_engine/engine.py): pool lifetime
  and model-loading decisions.
