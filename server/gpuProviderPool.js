// Provider-neutral GPU scheduler for SonaWills.
// Providers are attempted in priority order; a job is retried on another
// legitimately available worker between shots. This does NOT bypass provider quotas.

export const GPU_PROVIDERS = [
  { id: 'lightning', name: 'Lightning AI', priority: 10, kind: 'persistent', freeTier: true },
  { id: 'kaggle', name: 'Kaggle', priority: 20, kind: 'notebook', freeTier: true },
  { id: 'colab', name: 'Google Colab', priority: 30, kind: 'notebook', freeTier: true },
  { id: 'huggingface', name: 'Hugging Face ZeroGPU', priority: 40, kind: 'space', freeTier: true },
  { id: 'modal', name: 'Modal', priority: 50, kind: 'serverless', freeTier: true },
  { id: 'paperspace', name: 'Paperspace', priority: 60, kind: 'notebook', freeTier: true },
  { id: 'saturn', name: 'Saturn Cloud', priority: 70, kind: 'cloud', freeTier: true },
  { id: 'intel-tiber', name: 'Intel Tiber AI Cloud', priority: 80, kind: 'cloud', freeTier: true }
];

export function rankProviders(health = {}) {
  return [...GPU_PROVIDERS]
    .filter((p) => health[p.id]?.enabled !== false)
    .sort((a, b) => (health[b.id]?.ready ? 1 : 0) - (health[a.id]?.ready ? 1 : 0) || a.priority - b.priority);
}

export function chooseProvider(health = {}, requiredVramGb = 16) {
  return rankProviders(health).find((p) => {
    const h = health[p.id] || {};
    return h.ready === true && (Number(h.vramGb) || 0) >= requiredVramGb;
  }) || null;
}

export function shouldFailOver(result) {
  return ['unavailable', 'quota_exhausted', 'session_expired', 'worker_error', 'timeout'].includes(result?.reason);
}
