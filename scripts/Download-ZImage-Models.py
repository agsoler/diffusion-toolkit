"""Prefetch the Z-Image Turbo training prerequisites without loading a GPU model."""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))
os.environ.setdefault('HF_HOME', str(root / '.cache' / 'huggingface'))
os.environ.setdefault('MODELS_PATH', str(root / 'models'))

from huggingface_hub import HfApi, snapshot_download, hf_hub_download
from toolkit.models.v2.diffusion_models.z_image import ZImageTransformer2DModel


api = HfApi()
repo = 'Tongyi-MAI/Z-Image-Turbo'
revision = api.model_info(repo).sha

print(f'Base model revision: {revision}', flush=True)
snapshot_download(repo, revision=revision, allow_patterns=[
    'model_index.json', 'scheduler/*', 'tokenizer/*', 'text_encoder/*',
    'vae/*', 'transformer/config.json',
], max_workers=4)
print('Base model supporting components downloaded.', flush=True)

path = ZImageTransformer2DModel.resolve_comfy_weights(repo, subfolder='transformer', qtype='qfloat8')
if not path:
    raise RuntimeError('Trainer did not resolve its preferred transformer weights')
print(f'Transformer: {path}', flush=True)

adapter_repo = 'ostris/zimage_turbo_training_adapter'
adapter_revision = api.model_info(adapter_repo).sha
print(f'Adapter revision: {adapter_revision}', flush=True)
print(hf_hub_download(adapter_repo, 'zimage_turbo_training_adapter_v2.safetensors', revision=adapter_revision), flush=True)
print('All Z-Image Turbo prerequisites downloaded. No training started.', flush=True)
