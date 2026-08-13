"""SonaWills Wan2.2 GPU worker for Modal.

This worker is intentionally provider-specific and lives outside the browser app.
It uses Wan2.2 TI2V-5B for short cinematic clips, then optionally muxes the
user's music underneath the generated clip. Longer music videos are assembled
by SonaWills from multiple clips.
"""

from __future__ import annotations

import os
import subprocess
import uuid
from pathlib import Path
from typing import Any

import modal

APP_NAME = "sonawills-wan2"
MODEL_DIR = Path("/models/Wan2.2-TI2V-5B")
OUTPUT_DIR = Path("/outputs")

model_volume = modal.Volume.from_name("sonawills-models", create_if_missing=True)
output_volume = modal.Volume.from_name("sonawills-outputs", create_if_missing=True)

# Wan2.2's documented TI2V-5B path needs >=24 GB VRAM. Prefer L40S and
# automatically fall back to a 40 GB A100 if L40S capacity is unavailable.
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg", "build-essential")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "torchaudio==2.5.1",
        "opencv-python-headless>=4.9.0.80",
        "diffusers>=0.31.0",
        "transformers>=4.49.0,<=4.51.3",
        "tokenizers>=0.20.3",
        "accelerate>=1.1.1",
        "tqdm",
        "imageio[ffmpeg]",
        "easydict",
        "ftfy",
        "dashscope",
        "imageio-ffmpeg",
        "decord",
        "numpy>=1.23.5,<2",
        "huggingface_hub",
        "fastapi[standard]",
    )
    .pip_install("flash-attn==2.7.4.post1", extra_options="--no-build-isolation")
    .run_commands(
        "git clone --depth 1 https://github.com/Wan-Video/Wan2.2.git /opt/Wan2.2",
    )
    .env({"PYTHONPATH": "/opt/Wan2.2"})
)

app = modal.App(name=APP_NAME)


def _ensure_model() -> None:
    """Download the 5B checkpoint into persistent Modal storage once."""
    marker = MODEL_DIR / ".ready"
    if marker.exists():
        return

    from huggingface_hub import snapshot_download

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id="Wan-AI/Wan2.2-TI2V-5B",
        local_dir=str(MODEL_DIR),
    )
    marker.write_text("ready\n")
    model_volume.commit()


def _download(url: str, destination: Path) -> None:
    import urllib.request

    with urllib.request.urlopen(url, timeout=120) as response, destination.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)


@app.function(
    image=image,
    gpu=["L40S", "A100-40GB"],
    timeout=60 * 30,
    volumes={"/models": model_volume, "/outputs": output_volume},
    retries=1,
)
def generate_clip(job_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Generate one Wan2.2 5-second clip and optionally mux music."""
    _ensure_model()

    work = Path("/tmp") / f"sonawills-{job_id}"
    work.mkdir(parents=True, exist_ok=True)
    raw_video = work / "raw.mp4"
    final_video = OUTPUT_DIR / f"{job_id}.mp4"

    prompt = str(data.get("prompt") or "cinematic music video scene")
    image_url = data.get("image_url")
    audio_url = data.get("audio_url")

    image_path = None
    if image_url:
        image_path = work / "reference.jpg"
        _download(image_url, image_path)

    command = [
        "python",
        "/opt/Wan2.2/generate.py",
        "--task",
        "ti2v-5B",
        "--size",
        "1280*704",
        "--ckpt_dir",
        str(MODEL_DIR),
        "--offload_model",
        "True",
        "--convert_model_dtype",
        "--t5_cpu",
        "--save_file",
        str(raw_video),
        "--prompt",
        prompt,
    ]
    if image_path:
        command += ["--image", str(image_path)]

    subprocess.run(command, cwd="/opt/Wan2.2", check=True, timeout=25 * 60)

    if audio_url:
        audio_path = work / "audio"
        _download(audio_url, audio_path)
        # First test/clip path: trim the music to the generated clip. Full
        # SonaWills projects will later concatenate many generated clips and
        # mux the original audio once at the final render stage.
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_video),
                "-i",
                str(audio_path),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                str(final_video),
            ],
            check=True,
            timeout=180,
        )
    else:
        raw_video.replace(final_video)

    output_volume.commit()
    return {
        "status": "done",
        "job_id": job_id,
        "path": str(final_video),
        "duration_seconds": 5,
        "fps": 24,
        "model": "Wan2.2-TI2V-5B",
    }


@app.function(
    image=image,
    volumes={"/outputs": output_volume},
)
@modal.asgi_app(requires_proxy_auth=True)
def web_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import FileResponse, JSONResponse

    api = FastAPI(title="SonaWills GPU Worker")

    @api.get("/health")
    async def health():
        return {"ok": True, "model": "Wan2.2-TI2V-5B", "gpu_min_vram_gb": 24}

    @api.post("/submit")
    async def submit(data: dict[str, Any]):
        job_id = uuid.uuid4().hex
        call = await generate_clip.spawn.aio(job_id, data)
        return {"job_id": job_id, "call_id": call.object_id, "status": "queued"}

    @api.get("/status/{call_id}")
    async def status(call_id: str):
        try:
            call = modal.FunctionCall.from_id(call_id)
            try:
                result = await call.get.aio(timeout=0)
            except TimeoutError:
                return JSONResponse({"status": "running", "call_id": call_id}, status_code=202)
            return {"status": "done", "call_id": call_id, "result": result}
        except modal.exception.OutputExpiredError:
            raise HTTPException(status_code=404, detail="Generation result expired")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @api.get("/download/{job_id}")
    async def download(job_id: str):
        path = OUTPUT_DIR / f"{job_id}.mp4"
        if not path.exists():
            raise HTTPException(status_code=404, detail="Video is not ready")
        return FileResponse(path, media_type="video/mp4", filename=f"sonawills-{job_id}.mp4")

    return api
