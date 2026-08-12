import { analyzeAudio } from './audioAnalysis.js';
import { createDirectorPlan } from './director.js';

export async function createProject({ audio, prompt, style, ratio, characters }) {
  if (!audio) throw new Error('Music is required.');
  if (!prompt?.trim()) throw new Error('A visual prompt is required.');

  const analysis = await analyzeAudio(audio);
  const directorPlan = createDirectorPlan({
    audioDuration: analysis.duration,
    prompt,
    style,
    ratio,
    characters
  });

  return {
    id: `sona-${Date.now()}`,
    audio: analysis,
    directorPlan,
    generation: {
      status: 'ready',
      completedShots: 0,
      totalShots: directorPlan.shots.length
    }
  };
}
