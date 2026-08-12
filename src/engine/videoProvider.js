/**
 * Provider-neutral video generation adapter.
 *
 * The browser never receives a Hugging Face token. A future backend/worker
 * should call the selected Space and return generated clip URLs.
 */
export function createVideoJob({ shot, characterReferences = [] }) {
  return {
    provider: 'huggingface-space',
    status: 'queued',
    shotId: shot.id,
    duration: shot.duration,
    prompt: shot.prompt,
    characterReferences,
    needsLipSync: Boolean(shot.needsLipSync),
    needsPerformance: Boolean(shot.needsPerformance)
  };
}

export function createProviderConfig({ space = 'OpenKing/wan2-video-generation' } = {}) {
  return {
    space,
    endpoint: 'gradio_api',
    requiresServerProxy: true
  };
}
