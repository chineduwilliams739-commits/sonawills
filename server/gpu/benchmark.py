"""Small, honest GPU benchmark for SonaWills workers.
Run this only on a configured GPU worker. It measures wall-clock generation
latency and writes a JSON result; it does not claim successful inference unless
an actual output file exists.
"""
import json, os, time
from pathlib import Path

RESULT = Path(os.getenv('BENCHMARK_RESULT', '/tmp/sonawills-benchmark.json'))
SECONDS = int(os.getenv('BENCHMARK_SECONDS', '5'))
MODEL = os.getenv('MODEL', 'wan2.2')

# The model-specific inference call is intentionally injected by the worker
# runtime. This script is the measurement harness, not a fake generator.
def run_inference():
    raise RuntimeError('Attach the installed Wan/LTX inference pipeline before running the benchmark')

start = time.perf_counter()
try:
    output = run_inference()
    elapsed = time.perf_counter() - start
    output_exists = bool(output) and Path(output).exists()
    result = {'model': MODEL, 'requested_seconds': SECONDS, 'elapsed_seconds': elapsed, 'output_exists': output_exists}
except Exception as exc:
    result = {'model': MODEL, 'requested_seconds': SECONDS, 'error': str(exc), 'output_exists': False}
RESULT.write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
