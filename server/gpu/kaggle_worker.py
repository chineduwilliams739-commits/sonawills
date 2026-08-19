"""SonaWills free Kaggle GPU worker for Wan2.2 TI2V-5B.

Runs as a single-job FastAPI service inside a Kaggle notebook. The notebook
exposes this service through a temporary Cloudflare Quick Tunnel and can sync
the tunnel URL into public/gpu-config.json for the GitHub Pages frontend.
"""
from __future__ import annotations

import os
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

ROOT = Path(os.environ.get("SONAWILLS_ROOT", "/kaggle/working/sonawills-worker"))
WAN_DIR = Path(os.environ.get("WAN_DIR", "/kaggle/working/Wan2.2"))
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/kaggle/working/Wan2.2-TI2V-5B"))
OUTPUT_DIR = ROOT / "jobs"
DEFAULT_SIZE = "832*480"
DEFAULT_FRAME_NUM = 81
DEFAULT_STEPS = 20
MAX_AUDIO_SECONDS = 300

ROOT.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SonaWills Free GPU Worker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

jobs: dict[str, dict[str, Any]] = {}
queue: list[str] = []
queue_lock = threading.Lock()
worker_started = False


def _set(job_id: str, **values: Any) -> None:
    jobs.setdefault(job_id, {}).update(values)


def _run_generation(job_id: str) -> None:
    job = jobs[job_id]
    job_dir = Path(job["job_dir"])
    raw_video = job_dir / "raw.mp4"
    final_video = job_dir / "video.mp4"
    command = [
        "torchrun", "--standalone", "--nproc_per_node=2",
        str(WAN_DIR / "generate.py"),
        "--task", "ti2v-5B",
        "--size", job["size"],
        "--ckpt_dir", str(MODEL_DIR),
        "--dit_fsdp", "--t5_fsdp", "--ulysses_size", "2",
        "--offload_model", "True", "--convert_model_dtype",
        "--t5_cpu",
        "--sample_steps", str(job["sample_steps"]),
        "--frame_num", str(job["frame_num"]),
        "--save_file", str(raw_video),
        "--prompt", job["prompt"],
    ]
    if job.get("image_path"):
        command += ["--image", job["image_path"]]

    _set(job_id, status="generating", progress=15, message="Wan2.2 is rendering")
    log_path = job_dir / "generation.log"
    with log_path.open("w", encoding="utf-8") as log:
        try:
            process = subprocess.Popen(
                command,
                cwd=str(WAN_DIR),
                stdout=log,
                stderr=subprocess.STDOUT,
                text=True,
            )
            rc = process.wait(timeout=55 * 60)
            if rc != 0:
                tail = log_path.read_text(encoding="utf-8", errors="replace")[-5000:]
                raise RuntimeError(f"Wan2.2 exited with code {rc}: {tail}")

            if not raw_video.exists():
                raise RuntimeError("Wan2.2 finished without producing an MP4.")

            if job.get("audio_path"):
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-stream_loop", "-1", "-i", str(raw_video),
                        "-i", job["audio_path"], "-map", "0:v:0", "-map", "1:a:0",
                        "-t", str(MAX_AUDIO_SECONDS), "-c:v", "libx264",
                        "-preset", "veryfast", "-crf", "23", "-c:a", "aac",
                        "-shortest", str(final_video),
                    ],
                    check=True,
                    timeout=15 * 60,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.STDOUT,
                )
                raw_video.unlink(missing_ok=True)
            else:
                raw_video.replace(final_video)

            _set(
                job_id,
                status="done",
                progress=100,
                message="Video ready",
                video_path=str(final_video),
                duration_seconds=job["frame_num"] / 24,
            )
        except Exception as exc:
            _set(job_id, status="failed", progress=0, error=str(exc))


def _queue_loop() -> None:
    while True:
        job_id = None
        with queue_lock:
            if queue:
                job_id = queue.pop(0)
        if job_id:
            _run_generation(job_id)
        else:
            threading.Event().wait(1)


def start_worker_thread() -> None:
    global worker_started
    if worker_started:
        return
    worker_started = True
    threading.Thread(target=_queue_loop, daemon=True).start()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "SonaWills Free Kaggle GPU Worker",
        "model": "Wan2.2-TI2V-5B",
        "gpu": "2x Tesla T4 via FSDP",
        "test_size": DEFAULT_SIZE,
        "test_frame_num": DEFAULT_FRAME_NUM,
        "queue_depth": len(queue),
    }


@app.post("/submit")
async def submit(
    prompt: str = Form(...),
    size: str = Form(DEFAULT_SIZE),
    frame_num: int = Form(DEFAULT_FRAME_NUM),
    sample_steps: int = Form(DEFAULT_STEPS),
    audio: UploadFile | None = File(default=None),
    character: UploadFile | None = File(default=None),
):
    start_worker_thread()
    job_id = uuid.uuid4().hex
    job_dir = OUTPUT_DIR / job_id
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

    jobs[job_id] = {
        "status": "queued",
        "progress": 8,
        "job_id": job_id,
        "call_id": job_id,
        "job_dir": str(job_dir),
        "prompt": str(prompt),
        "size": str(size) if str(size) in {"832*480", "480*832"} else DEFAULT_SIZE,
        "frame_num": max(9, min(int(frame_num), 121)),
        "sample_steps": max(8, min(int(sample_steps), 30)),
        "audio_path": str(audio_path) if audio_path else None,
        "image_path": str(image_path) if image_path else None,
    }
    with queue_lock:
        queue.append(job_id)
    return {"job_id": job_id, "call_id": job_id, "status": "queued"}


@app.get("/status/{call_id}")
def status(call_id: str):
    job = jobs.get(call_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found. The Kaggle worker may have restarted.")
    return {
        "status": job.get("status"),
        "call_id": call_id,
        "job_id": job.get("job_id"),
        "progress": job.get("progress", 0),
        "message": job.get("message"),
        "error": job.get("error"),
        "result": {
            "status": "done",
            "job_id": call_id,
            "duration_seconds": job.get("duration_seconds"),
        } if job.get("status") == "done" else None,
    }


@app.get("/download/{job_id}")
def download(job_id: str):
    job = jobs.get(job_id)
    path = Path(job["video_path"]) if job and job.get("video_path") else OUTPUT_DIR / job_id / "video.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video is not ready")
    return FileResponse(path, media_type="video/mp4", filename=f"sonawills-{job_id}.mp4")
