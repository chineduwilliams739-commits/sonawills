import { PROVIDERS, selectProvider, markUnavailable, shouldRetryOnNextProvider } from './providerPool.js';

export function createSchedulerState() {
  return { providers: PROVIDERS.map(p => ({ ...p })), attempts: [] };
}

export async function runShotWithFailover(shot, { model = 'wan2.2', state, dispatch }) {
  let providers = state.providers;
  while (true) {
    const provider = selectProvider({ model, providers });
    if (!provider) throw new Error('NO_GPU_WORKER_AVAILABLE');
    state.attempts.push({ shotId: shot.id, provider: provider.id, startedAt: Date.now() });
    try {
      const result = await dispatch(provider, shot, model);
      state.attempts.at(-1).completedAt = Date.now();
      return result;
    } catch (error) {
      state.attempts.at(-1).error = String(error?.message || error);
      if (!shouldRetryOnNextProvider(error)) throw error;
      providers = markUnavailable(providers, provider.id);
      state.providers = providers;
    }
  }
}
