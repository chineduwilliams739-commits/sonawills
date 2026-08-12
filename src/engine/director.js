import { buildTimeline } from './audioAnalysis.js';

export function createDirectorPlan({ audioDuration, prompt, style = 'Cinematic', ratio = '16:9', characters = [] }) {
  const timeline = buildTimeline(audioDuration);
  const visualBrief = prompt?.trim() || 'Create a cinematic music video that follows the emotional arc of the music.';

  return {
    version: 1,
    style,
    ratio,
    visualBrief,
    characters: characters.map((file, index) => ({ id: `character-${index + 1}`, name: file.name })),
    duration: timeline.at(-1)?.end ?? 0,
    shots: timeline.map((shot, index) => ({
      ...shot,
      prompt: `${visualBrief}. Shot ${index + 1}: cinematic music-video composition, intentional camera movement, coherent lighting and production design, preserve the same character identity and wardrobe across shots.`,
      needsPerformance: index % 4 === 2,
      needsLipSync: index % 4 === 2
    }))
  };
}
