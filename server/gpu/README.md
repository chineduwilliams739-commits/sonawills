# SonaWills GPU worker deployment

The application is ready to connect to a real GPU worker. The worker is intentionally separate from GitHub Pages and exposes a small HTTP job API running on an NVIDIA CUDA machine.

## Launch contract
- NVIDIA CUDA GPU with enough VRAM for the selected Wan/LTX configuration
- Docker + NVIDIA Container Toolkit
- Python/PyTorch/Diffusers
- FFmpeg
- Expose `/health` and `/generate` to the SonaWills backend

## Free-GPU strategy
Free notebook GPUs are useful for testing but are not reliable unlimited production backends. Kaggle, Colab, Lightning, Modal, and similar services may impose quotas, session limits, or availability constraints. SonaWills keeps the worker provider-neutral and never attempts to bypass those limits.

## Real inference test
The next integration test must run a short real clip, verify that an MP4 actually exists, measure wall-clock generation time, and record GPU/model settings. That measurement is required before estimating weekly video capacity.

The frontend must never receive provider secrets. Credentials and worker URLs belong in the backend/deployment environment.