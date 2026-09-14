import torch
from toolkit.models.v2.text_encoders.qwen3 import Qwen3SingleFileEncoder as Qwen3TextEncoder

if __name__ == '__main__':
    import sys
    model = Qwen3TextEncoder.load(sys.argv[1], config_path=sys.argv[2], dtype=torch.bfloat16, device='cpu', use_comfy_weights=False, qtype=sys.argv[3] if len(sys.argv) > 3 else None)
    with torch.no_grad():
        result = model(torch.tensor([[1, 2, 3]]), output_hidden_states=True)
    assert torch.isfinite(result.hidden_states[-2]).all()
    print('PASS encoder CPU load and forward:', tuple(result.hidden_states[-2].shape))
