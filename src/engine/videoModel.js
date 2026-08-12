// Provider-neutral video model adapter.
// A real hosted/open model endpoint can be plugged in without changing the director UI.
export function createVideoGenerationRequest(shot, options = {}) {
  return {
    model: options.model || 'open-video-model',
    prompt: shot.prompt,
    duration: shot.duration,
    aspectRatio: options.ratio || '16:9',
    referenceImages: options.referenceImages || [],
    performance: Boolean(shot.needsPerformance),
    lipSync: Boolean(shot.needsLipSync)
  };
}

export async function generateShot(shot, options = {}) {
  const request = createVideoGenerationRequest(shot, options);
  if (!options.endpoint) {
    return { status: 'planned', request, message: 'No video provider connected yet.' };
  }
  const response = await fetch(options.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`Video generation failed: ${response.status}`);
  return response.json();
}
