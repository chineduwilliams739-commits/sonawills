# SonaWills generation architecture

## No artificial daily quota

SonaWills will not impose a product-level daily generation limit. The application should not depend on a hosted free GPU quota as its core inference service.

The production architecture is provider-neutral:

`GitHub Pages UI -> generation API/worker -> local or self-hosted GPU inference -> clip store -> FFmpeg renderer -> downloadable MP4`

## Why self-hosted inference

High-quality open video models require substantial GPU compute. A genuinely unlimited hosted service cannot be assumed to be free. Hugging Face ZeroGPU and other free hosted GPUs can be useful for experiments, but their quotas must not become a hidden daily limit in SonaWills.

For unlimited use, the compute must instead be supplied by hardware the operator controls (for example a local GPU workstation or a self-hosted GPU server). The SonaWills application itself will not cap the number of projects per day.

## Model adapter

The video provider is deliberately abstracted so Wan/LTX or another compatible open model can be swapped without rewriting the UI, director, timeline or renderer.

## Rendering

Each generated shot is kept short. The director aligns shots to audio sections and marks performance/lip-sync shots. FFmpeg then assembles the selected clips against the original audio and exports one MP4 whose duration is derived from the audio and capped at five minutes.
