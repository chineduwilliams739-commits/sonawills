/**
 * SonaWills generation worker contract.
 *
 * This is intentionally provider-agnostic: the public GitHub Pages app must
 * never contain a Hugging Face/API secret. A server with a GPU can implement
 * generateShot() using Wan 2.2 (or another open model), then call the render
 * endpoint described here.
 */

export function validateGenerationJob(job) {
  if (!job || !job.project) throw new Error('Missing generation project');
  const duration = Number(job.project.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid duration');
  if (duration > 300) throw new Error('SonaWills videos cannot exceed 5 minutes');
  if (!Array.isArray(job.project.shots) || job.project.shots.length === 0) {
    throw new Error('No shots supplied');
  }
  return true;
}

export function buildWorkerQueue(project) {
  validateGenerationJob({ project });
  return project.shots.map((shot, index) => ({
    id: shot.id || `shot-${index + 1}`,
    index,
    duration: Math.min(10, Math.max(1, Number(shot.duration) || 6)),
    prompt: shot.prompt,
    characterRefs: shot.characterRefs || [],
    needsLipSync: Boolean(shot.needsLipSync),
    needsPerformance: Boolean(shot.needsPerformance),
    status: 'queued'
  }));
}

export async function generateShot(provider, shot, context = {}) {
  if (!provider || typeof provider.generate !== 'function') {
    throw new Error('No video inference provider configured');
  }
  return provider.generate({ ...shot, context });
}
