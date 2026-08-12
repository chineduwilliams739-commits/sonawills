export function buildRenderPlan({ shots = [], audioDuration = 0 }) {
  const targetDuration = Math.min(300, Math.max(1, Math.ceil(audioDuration + 2)));
  return {
    targetDuration,
    audioDuration,
    maxDuration: 300,
    output: 'mp4',
    audioTrack: 'original-upload',
    shots: shots.map((shot, index) => ({
      ...shot,
      order: index + 1,
      transition: index === 0 ? 'fade-in' : 'cut',
      preserveOriginalAudio: true
    }))
  };
}

export function getRenderProgress(completed, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}
