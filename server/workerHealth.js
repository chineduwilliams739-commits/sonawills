export async function checkWorker(url, timeoutMs = 8000) {
  if (!url) return { ok: false, reason: 'NOT_CONFIGURED' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/health`, { signal: controller.signal });
    if (!response.ok) return { ok: false, reason: `HTTP_${response.status}` };
    const data = await response.json().catch(() => ({}));
    return { ok: true, ...data };
  } catch (error) {
    return { ok: false, reason: error?.name === 'AbortError' ? 'TIMEOUT' : 'UNREACHABLE' };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverHealthyWorkers(configs) {
  const entries = await Promise.all(Object.entries(configs).map(async ([id, url]) => [id, await checkWorker(url)]));
  return Object.fromEntries(entries);
}
