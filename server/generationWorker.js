// SonaWills self-hostable generation-worker contract.
// This keeps GPU inference outside the GitHub Pages browser bundle.

export const MAX_VIDEO_SECONDS = 300;

export function normalizeGenerationJob(input) {
  const duration = Math.min(MAX_VIDEO_SECONDS, Math.max(1, Number(input.duration) || 1));
  return {
    id: input.id || crypto.randomUUID(),
    duration,
    model: input.model || 'wan2.2',
    prompt: String(input.prompt || '').trim(),
    characterReferences: Array.isArray(input.characterReferences) ? input.characterReferences : [],
    shots: Array.isArray(input.shots) ? input.shots : [],
    audio: input.audio || null,
    output: 'mp4'
  };
}

export function createInferenceRequest(job, shot) {
  return {
    jobId: job.id,
    model: job.model,
    prompt: shot.prompt,
    duration: Math.min(10, Math.max(1, Number(shot.duration) || 1)),
    characterReferences: job.characterReferences,
    performance: Boolean(shot.needsPerformance),
    lipSync: Boolean(shot.needsLipSync)
  };
}

export function createRenderManifest(job, clips) {
  return {
    jobId: job.id,
    output: 'mp4',
    duration: job.duration,
    audio: job.audio,
    clips: clips.map((clip) => ({
      path: clip.path,
      start: clip.start,
      end: clip.end
    }))
  };
}
