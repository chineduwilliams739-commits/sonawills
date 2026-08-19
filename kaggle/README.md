# SonaWills free GPU worker

SonaWills no longer uses Modal. The existing Wan2.2 generation flow now uses a Kaggle GPU notebook and a temporary Cloudflare Quick Tunnel.

## One-time setup

1. Open `SonaWills_Kaggle_GPU.ipynb` in Kaggle.
2. Enable the GPU accelerator and use the available 2-GPU Tesla T4 session when offered.
3. In Kaggle **Add-ons → Secrets**, add a secret named `SONAWILLS_GITHUB_TOKEN` containing a fine-grained GitHub token with **Contents: Read and write** access to this repository.
4. Run the notebook cells in order.
5. Wait for the final health check to report HTTP 200.
6. Keep the notebook session running while generating videos.

The notebook automatically writes the temporary public GPU URL to `public/gpu-config.json`; the existing GitHub Pages app then uses that URL without changing its UI or generation flow.

Kaggle GPU sessions are free but quota-based, and the Cloudflare Quick Tunnel URL is temporary. Restarting the notebook after a Kaggle session ends creates a new URL and syncs it again.
