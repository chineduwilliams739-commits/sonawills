# SonaWills Kaggle GPU test worker

This notebook blueprint is intended for a Kaggle NVIDIA GPU session. It installs the SonaWills GPU worker dependencies, loads an open video model, generates short clips from normalized SonaWills shot jobs, and writes MP4 outputs to the notebook working directory.

## Important
Kaggle's official documentation says free GPU usage is quota-based: up to 30 GPU hours per week, sometimes higher depending on demand/resources. The quota is **GPU compute time, not video duration**. A 30-hour quota does NOT mean 30 hours of finished music videos. A model may take many GPU minutes to generate a few seconds of video.

## SonaWills strategy
- Use GPU only for inference.
- Keep audio analysis, storyboard planning, upload handling, and rendering preparation off GPU.
- Generate short shots and reuse loaded model weights.
- Render/assemble separately with FFmpeg.
- Treat Kaggle as a development/free-compute backend, not as an unlimited production server.

## Example setup cells
```bash
pip install -U diffusers transformers accelerate safetensors imageio imageio-ffmpeg fastapi uvicorn
```

Then load the selected model and call the SonaWills worker's `createInferenceRequest()` for each shot. The exact model checkpoint should be selected after benchmarking VRAM and generation speed on the available Kaggle GPU.
