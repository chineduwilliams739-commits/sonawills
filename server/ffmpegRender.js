export const MAX_SECONDS = 300;

export function createRenderPlan({ clips = [], audioPath, duration }) {
  const total = Math.min(MAX_SECONDS, Math.max(1, Number(duration) || 1));
  return {
    output: 'sonawills-final.mp4',
    duration: total,
    audioPath,
    clips: clips.map((clip, i) => ({
      index: i,
      path: clip.path,
      start: Math.max(0, Number(clip.start) || 0),
      end: Math.min(total, Number(clip.end) || total)
    }))
  };
}

// The actual worker can translate this manifest into ffmpeg commands.
// We intentionally keep process execution out of the GitHub Pages bundle.
export function buildRenderArgs(plan) {
  return {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    shortest: true,
    maxDuration: plan.duration
  };
}
