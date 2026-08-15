"""SonaWills Wan2.2 GPU worker on Modal.

The web layer accepts uploads, queues a real Wan2.2 TI2V-5B job, and exposes
status/download endpoints for the SonaWills GitHub Pages frontend.
"""

from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

import modal

APP_NAME = "sonawills-wan22"
MODEL_DIR = Path("/models/Wan2.2-TI2V-5B")
OUTPUT_DIR = Path("/outputs")
GPU_TYPES = ["L4", "T4"]
DEFAULT_SIZE = "832*480"
DEFAULT_FRAME_NUM = 81
DEFAULT_STEPS = 20
MAX_AUDIO_SECONDS = 300

model_volume = modal.Volume.from_name("sonawills-models", create_if_missing=True)
output_volume = modal.Volume.from_name("sonawills-outputs", create_if_missing=True)

# Start from an official PyTorch CUDA runtime so Modal does not have to download
# and install another multi-gigabyte PyTorch wheel during every image build.
image = (
    modal.Image.from_registry("pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "opencv-python-headless>=4.9.0.80",
        "diffusers==0.33.0",
        "transformers==4.51.3",
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
        "pillow",
        "fastapi[standard]",
    )
    .run_commands("git clone --depth 1 https://github.com/Wan-Video/Wan2.2.git /opt/Wan2.2")
    .env({"PYTHONPATH": "/opt/Wan2.2"})
)

app = modal.App(name=APP_NAME)


def _ensure_model() -> None:
    marker = MODEL_DIR / ".ready"
    if marker.exists():
        return

    from huggingface_hub import snapshot_download

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id="Wan-AI/Wan2.2-TI2V-5B",
        local_dir=str(MODEL_DIR),
        ignore_patterns=["assets/*", "examples/*", "google/*", "README.md"],
    )
    marker.write_text("ready\n")
    model_volume.commit()


def _run(command: list[str], timeout: int) -> None:
    subprocess.run(command, check=True, timeout=timeout)


@app.function(
    image=image,
    gpu=GPU_TYPES,
    timeout=45 * 60,
    startup_timeout=20 * 60,
    volumes={"/models": model_volume, "/outputs": output_volume},
    retries=1,
)
def generate_clip(job_id: str, data: dict[str, Any]) -> dict[str, Any]:
    output_volume.reload()
    _ensure_model()

    job_dir = OUTPUT_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    raw_video = job_dir / "raw.mp4"
    final_video = job_dir / "video.mp4"

    prompt = str(data.get("prompt") or "cinematic music video scene")
    size = str(data.get("size") or DEFAULT_SIZE)
    frame_num = int(data.get("frame_num") or DEFAULT_FRAME_NUM)
    sample_steps = int(data.get("sample_steps") or DEFAULT_STEPS)
    image_path = data.get("image_path")
    audio_path = data.get("audio_path")

    command = [
        "python",
        "/opt/Wan2.2/generate.py",
        "--task",
        "ti2v-5B",
        "--size",
        size,
        "--frame_num",
        str(frame_num),
        "--sample_steps",
        str(sample_steps),
        "--sample_shift",
        "3",
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

    _run(command, timeout=40 * 60)

    if audio_path:
        # Loop the generated short cinematic shot to the uploaded song for the
        # first end-to-end test. The next scene-generation pass can replace the
        # loop with multiple independently generated shots.
        _run(
            [
                "ffmpeg",
                "-y",
                "-stream_loop",
                "-1",
                "-i",
                str(raw_video),
                "-i",
                str(audio_path),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-t",
                str(MAX_AUDIO_SECONDS),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-shortest",
                str(final_video),
            ],
            timeout=10 * 60,
        )
        raw_video.unlink(missing_ok=True)
    else:
        raw_video.replace(final_video)

    # Remove uploaded source files after rendering so the output volume does not
    # grow with every test.
    for child in job_dir.iterdir():
        if child.name not in {"video.mp4"}:
            if child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink(missing_ok=True)
    output_volume.commit()

    return {
        "status": "done",
        "job_id": job_id,
        "path": str(final_video),
        "duration_seconds": frame_num / 24,
        "fps": 24,
        "model": "Wan2.2-TI2V-5B",
        "gpu": "L4/T4 fallback",
        "size": size,
        "sample_steps": sample_steps,
    }


@app.function(image=image, volumes={"/outputs": output_volume})
@modal.concurrent(max_inputs=20)
@modal.asgi_app(requires_proxy_auth=False)
def web_app():
    from fastapi import FastAPI, File, Form, HTTPException, UploadFile
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse, JSONResponse

    api = FastAPI(title="SonaWills GPU Worker")
    api.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://chineduwilliams739-commits.github.io",
            "http://localhost:5173",
            "http://localhost:4173",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/health")
    async def health():
        return {
            "ok": True,
            "model": "Wan2.2-TI2V-5B",
            "gpu": "L4 preferred, T4 fallback",
            "test_size": DEFAULT_SIZE,
            "test_frame_num": DEFAULT_FRAME_NUM,
        }

    @api.post("/submit")
    async def submit(
        prompt: str = Form(...),
        size: str = Form(DEFAULT_SIZE),
        frame_num: int = Form(DEFAULT_FRAME_NUM),
        sample_steps: int = Form(DEFAULT_STEPS),
        audio: UploadFile | None = File(default=None),
        character: UploadFile | None = File(default=None),
    ):
        job_id = uuid.uuid4().hex
        job_dir = OUTPUT_DIR / "jobs" / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        audio_path = None
        image_path = None
        if audio:
            audio_path = job_dir / "audio"
            with audio_path.open("wb") as f:
                while chunk := await audio.read(1024 * 1024):
                    f.write(chunk)
        if character:
            image_path = job_dir / "character.jpg"
            with image_path.open("wb") as f:
                while chunk := await character.read(1024 * 1024):
                    f.write(chunk)

        output_volume.commit()
        call = await generate_clip.spawn.aio(
            job_id,
            {
                "prompt": prompt,
                "size": size,
                "frame_num": max(9, min(frame_num, 121)),
                "sample_steps": max(8, min(sample_steps, 40)),
                "audio_path": str(audio_path) if audio_path else None,
                "image_path": str(image_path) if image_path else None,
            },
        )
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
            return JSONResponse(
                {"status": "failed", "call_id": call_id, "error": str(exc)},
                status_code=500,
            )

    @api.get("/download/{job_id}")
    async def download(job_id: str):
        output_volume.reload()
        path = OUTPUT_DIR / "jobs" / job_id / "video.mp4"
        if not path.exists():
            raise HTTPException(status_code=404, detail="Video is not ready")
        return FileResponse(path, media_type="video/mp4", filename=f"sonawills-{job_id}.mp4")

    return api
