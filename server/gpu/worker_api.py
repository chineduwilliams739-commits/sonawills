import os
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title='SonaWills GPU Worker')
OUTPUT = Path(os.getenv('OUTPUT_DIR', '/tmp/sonawills'))
OUTPUT.mkdir(parents=True, exist_ok=True)

class Shot(BaseModel):
    jobId: str
    model: str = 'wan2.2'
    prompt: str
    duration: int = Field(default=5, ge=1, le=10)
    characterReferences: list[str] = []
    performance: bool = False
    lipSync: bool = False

@app.get('/health')
def health():
    return {'ok': True, 'worker': 'sonawills-gpu', 'cuda': os.getenv('CUDA_VISIBLE_DEVICES', 'auto')}

@app.post('/generate')
def generate(shot: Shot):
    # Model loading/inference is intentionally isolated behind this API.
    # The production image should load Wan/LTX once at worker startup and write
    # the resulting MP4 to OUTPUT. This endpoint currently fails explicitly
    # instead of pretending to have generated a clip when no model is loaded.
    if shot.model not in {'wan2.2', 'ltx'}:
        raise HTTPException(400, 'Unsupported model')
    raise HTTPException(503, 'GPU model runtime is not installed on this worker yet')
