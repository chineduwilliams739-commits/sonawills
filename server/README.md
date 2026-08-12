# SonaWills generation worker

This folder defines the server-side boundary for GPU video generation. GitHub Pages remains a static frontend and must never contain private model credentials.

## Intended flow

1. Frontend uploads audio/character references to a backend object store.
2. Backend creates a normalized generation job.
3. GPU worker runs an open video model (initial target: Wan 2.2) per short shot.
4. Worker returns generated clip paths/objects.
5. Render worker uses FFmpeg to concatenate clips, preserve the original audio, and cap the final duration at 300 seconds.
6. Frontend receives a temporary download URL.

The worker is intentionally provider-neutral so SonaWills is not locked to a hosted daily-quota service. A self-hosted GPU is the target for unlimited SonaWills-side generation; actual hardware availability/cost is separate from the application limit.
