export function analyzeAudio(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve({
        duration,
        targetDuration: Math.min(300, Math.max(1, Math.ceil(duration + 2))),
        capped: duration > 300,
        filename: file.name,
        type: file.type || 'audio/*'
      });
    };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unable to read audio metadata')); };
    audio.src = url;
  });
}

export function buildTimeline(duration, shotSeconds = 6) {
  const total = Math.min(300, Math.max(1, Math.ceil(duration + 2)));
  const shots = [];
  for (let start = 0, index = 1; start < total; start += shotSeconds, index += 1) {
    shots.push({ id: `shot-${index}`, start, end: Math.min(start + shotSeconds, total), duration: Math.min(shotSeconds, total - start) });
  }
  return shots;
}
