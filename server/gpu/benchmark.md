# SonaWills GPU benchmark

Run a fixed 5-second shot on each legitimately available worker and record:

- GPU model and VRAM
- model/version and quantization
- resolution and frames
- wall-clock generation time
- GPU-active time
- peak VRAM
- output seconds
- failures/OOMs

Do not extrapolate weekly finished-video capacity until this benchmark is measured. A GPU-hour is compute time, not finished-video time.

Weekly finished-video estimate:
`available_GPU_hours * 3600 / measured_seconds_per_output_second`

Then apply a practical utilization factor (for startup, downloads, retries, scene transitions and rendering) rather than assuming 100% utilization.

Free-provider quotas must be obeyed; do not create extra accounts or use workarounds to evade limits.
