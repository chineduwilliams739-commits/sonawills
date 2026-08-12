# SonaWills GPU worker deployment

The GPU worker is intentionally separate from GitHub Pages. It exposes a small HTTP job API and runs the open video model locally on an NVIDIA CUDA machine.

## Target
- NVIDIA CUDA GPU with enough VRAM for the selected Wan/LTX configuration
- Docker + NVIDIA Container Toolkit
- Python/PyTorch/Diffusers
- FFmpeg

## Free-GPU strategy
Free notebook GPUs are useful for testing but are not reliable unlimited production backends. Kaggle currently advertises free NVIDIA P100 access with a weekly quota (typically 30 hours or higher depending on demand). Google Colab provides free GPU access but explicitly says resources are not guaranteed or unlimited. Hugging Face ZeroGPU is also quota-based for free users. Therefore SonaWills keeps the worker provider-neutral: a Kaggle/Colab machine can be used for experiments, while a persistent self-hosted GPU can be used when available.

The frontend must never receive a provider secret. Only the backend/worker should hold model credentials or storage credentials.
