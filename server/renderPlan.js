export function createRenderPlan(project, clips = []) {
  const targetDuration = Math.min(300, Math.ceil(Number(project.duration) || 0));
  const ordered = [...clips].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  let cursor = 0;
  const timeline = ordered.map((clip, index) => {
    const duration = Math.max(0, Math.min(Number(clip.duration) || 0, targetDuration - cursor));
    const item = { index, clipId: clip.id, start: cursor, end: cursor + duration, duration };
    cursor += duration;
    return item;
  }).filter(item => item.duration > 0);

  return {
    audio: project.audioUrl || null,
    targetDuration,
    output: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    timeline
  };
}
