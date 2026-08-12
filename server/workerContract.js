export const GENERATION_STATUS = ['queued', 'generating', 'rendering', 'complete', 'failed'];

export function createJobResponse(job, status = 'queued') {
  return {
    id: job.id,
    status,
    duration: Math.min(300, job.duration),
    shots: job.shots?.length || 0,
    downloadUrl: null,
    error: null
  };
}
