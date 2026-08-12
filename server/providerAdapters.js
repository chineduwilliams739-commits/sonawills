// Provider adapters intentionally accept endpoint URLs/configuration at runtime.
// Credentials must be supplied through the deployment environment, never committed here.

export function createProviderAdapter(providerId, config = {}) {
  return {
    providerId,
    async dispatch(job, shot) {
      if (!config.endpoint) throw Object.assign(new Error(`GPU worker for ${providerId} is not configured`), { code: 'GPU_UNAVAILABLE' });
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(config.headers || {}) },
        body: JSON.stringify({ jobId: job.id, model: job.model, shot })
      });
      if (!response.ok) {
        const code = response.status === 429 ? 'QUOTA_EXHAUSTED' : response.status >= 500 ? 'GPU_UNAVAILABLE' : response.status;
        throw Object.assign(new Error(`Provider ${providerId} returned ${response.status}`), { code, status: response.status });
      }
      return response.json();
    }
  };
}

export function buildProviderAdapters(env = {}) {
  const ids = ['kaggle','lightning','colab','modal','paperspace','saturn','tiber','huggingface-zerogpu'];
  return Object.fromEntries(ids.map(id => [id, createProviderAdapter(id, {
    endpoint: env[`${id.toUpperCase().replace(/-/g, '_')}_WORKER_URL`],
    headers: env[`${id.toUpperCase().replace(/-/g, '_')}_WORKER_HEADERS`] || {}
  })]));
}
