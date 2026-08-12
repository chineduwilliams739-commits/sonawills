"""SonaWills local GPU inference worker.

Runs Wan2.2 through Diffusers on a machine with a compatible NVIDIA GPU.
The web frontend never receives model credentials or executes inference.
"""
import os
import uuid
from pathlib import Path

import torch
from PIL import Image
from diffusers import WanPipeline, AutoencoderKLWan
from diffusers.utils import export_to_video

MODEL_ID = os.getenv("SONAWILLS_MODEL", "Wan-AI/Wan2.2-TI2V-5B-Diffusers")
OUT_DIR = Path(os.getenv("SONAWILLS_OUTPUT_DIR", "./outputs"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

_pipe = None


def get_pipeline():
    global _pipe
    if _pipe is None:
        vae = AutoencoderKLWan.from_pretrained(
            MODEL_ID, subfolder="vae", torch_dtype=torch.float32
        )
        _pipe = WanPipeline.from_pretrained(
            MODEL_ID, vae=vae, torch_dtype=torch.bfloat16
        )
        _pipe.to("cuda")
    return _pipe


def generate_shot(prompt, image_path=None, width=1280, height=704,
                  num_frames=73, steps=35, guidance=5.0, seed=-1):
    if not torch.cuda.is_available():
        raise RuntimeError("SonaWills GPU worker requires a CUDA-capable NVIDIA GPU")

    pipe = get_pipeline()
    if seed < 0:
        seed = torch.randint(0, 2**32 - 1, (1,), device="cuda").item()
    generator = torch.Generator(device="cuda").manual_seed(seed)

    params = {
        "prompt": prompt,
        "height": height,
        "width": width,
        "num_frames": num_frames,
        "guidance_scale": guidance,
        "num_inference_steps": steps,
        "generator": generator,
    }
    if image_path:
        params["image"] = Image.open(image_path).convert("RGB")

    frames = pipe(**params).frames[0]
    output = OUT_DIR / f"shot-{uuid.uuid4().hex}.mp4"
    export_to_video(frames, str(output), fps=24)
    return str(output), seed
