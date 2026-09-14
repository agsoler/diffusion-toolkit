from transformers import Qwen3ForCausalLM, Qwen3Model

from .._mixin import OstrisTransformersMixin


class Qwen3TextEncoder(Qwen3ForCausalLM, OstrisTransformersMixin):
    """Qwen3 causal-LM text encoder (Z-Image family, Zeta-Chroma, ...). Loads
    from a checkpoint's text_encoder/ subfolder, a hub repo, or a single
    .safetensors file; the tokenizer rides in the checkpoint's tokenizer/
    subfolder."""

    aitk_subfolder = "text_encoder"
    aitk_tokenizer_subfolder = "tokenizer"

    @classmethod
    def get_transformer_block_names(cls):
        return ["model.layers"]


class Qwen3ModelEncoder(Qwen3Model, OstrisTransformersMixin):
    """The inner Qwen3 base model (anima's text encoder)."""

    aitk_subfolder = "text_encoder"
    aitk_tokenizer_subfolder = "tokenizer"

    @classmethod
    def get_transformer_block_names(cls):
        return ["layers"]


class Qwen3SingleFileEncoder(Qwen3ModelEncoder):
    """ComfyUI Qwen3 features: no causal-LM head is needed by Z-Image."""

    aitk_cast_quantized_load = True

    @classmethod
    def convert_state_dict_on_load(cls, state_dict):
        return {
            key.removeprefix("model."): value
            for key, value in state_dict.items()
            if key != "lm_head.weight"
        }
