// Provider-agnostic GPU scheduler. It only uses workers that are explicitly configured
// and reachable; it never attempts to bypass provider quotas or account limits.
export const PROVIDERS = [
  { id: 'kaggle', priority: 10, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'lightning', priority: 20, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'colab', priority: 30, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'modal', priority: 40, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'paperspace', priority: 50, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'saturn', priority: 60, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'tiber', priority: 70, capabilities: ['wan2.2', 'ltx'], status: 'available' },
  { id: 'huggingface-zerogpu', priority: 80, capabilities: ['wan2.2', 'ltx'], status: 'available' }
];

export function selectProvider({ model = 'wan2.2', providers = PROVIDERS } = {}) {
  return [...providers]
    .filter((p) => p.status === 'available' && p.capabilities.includes(model))
    .sort((a, b) => a.priority - b.priority)[0] || null;
}

export function markUnavailable(providers, providerId) {
  return providers.map((p) => p.id === providerId ? { ...p, status: 'unavailable' } : p);
}

export function shouldRetryOnNextProvider(error) {
  const code = error?.code || error?.status;
  return ['GPU_UNAVAILABLE', 'QUOTA_EXHAUSTED', 'TIMEOUT', 429, 503].includes(code);
}
