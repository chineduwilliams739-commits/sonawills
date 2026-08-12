# SonaWills GPU provider pool

The scheduler can use any worker that is legitimately available and has enough VRAM. It does not create extra accounts, bypass quotas, or evade provider controls.

## Candidate providers

- Lightning AI — strong candidate for a persistent worker; current docs advertise free GPU access after verification and monthly free credits.
- Kaggle — strong free notebook/testing candidate.
- Google Colab — useful for development and short inference sessions, but free GPU availability is variable.
- Hugging Face ZeroGPU — useful for experiments; quota-based, so it is a fallback rather than the primary production worker.
- Modal — serverless architecture is attractive; current Starter plan includes free monthly compute credits, after which compute is billed.
- Paperspace — useful as an additional worker where free/eligible capacity is available.
- Saturn Cloud — candidate for free/recurring notebook GPU access where available.
- Intel Tiber AI Cloud — candidate for Gaudi/Intel accelerator experimentation; requires model/runtime compatibility testing.

## Scheduling rule

Jobs are divided into short shots. A provider is selected per shot. If a worker becomes unavailable, exhausts its legitimate quota, times out, or fails, the next healthy provider can take the next uncompleted shot.

A single shot is not migrated halfway through generation. Completed clips are persisted before moving to the next shot.

## Production note

Free tiers are not a source of unlimited compute. SonaWills itself has no daily-generation counter, but external provider quotas and availability remain real constraints. A persistent self-hosted or paid GPU worker can be added to the same pool later without changing the application pipeline.
