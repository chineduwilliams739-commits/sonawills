import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function App() {
  const [audio, setAudio] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [style, setStyle] = useState('Cinematic');
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!audio) { setAudioDuration(null); return; }
    const url = URL.createObjectURL(audio);
    const probe = document.createElement('audio');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const detected = Number.isFinite(probe.duration) ? probe.duration : null;
      setAudioDuration(detected);
      URL.revokeObjectURL(url);
    };
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  const targetDuration = audioDuration == null ? null : Math.min(300, Math.max(1, Math.ceil(audioDuration + 2)));
  const exceedsLimit = audioDuration != null && audioDuration > 300;

  const chooseAudio = (file) => {
    setAudio(file || null);
    setCreated(false);
  };

  return (
    <div className="app">
      <header className="nav">
        <div className="brand"><div className="logo">S</div><div><strong>SonaWills</strong><small>AI MUSIC VIDEO STUDIO</small></div></div>
        <span className="pill">FREE • OPEN MODEL READY</span>
      </header>

      <section className="hero">
        <span className="eyebrow">MUSIC → STORY → CINEMA</span>
        <h1>Turn your song into a <em>music video.</em></h1>
        <p>Upload your music, add your characters, describe the world, and let SonaWills direct a cinematic video around the feeling of your song.</p>
      </section>

      <main className="workspace">
        <section className="panel form-panel">
          <Step n="01" title="Your music" />
          <label className="upload"><input type="file" accept="audio/*" onChange={e => chooseAudio(e.target.files?.[0])} /><span className="upload-icon">♫</span><b>{audio ? audio.name : 'Upload your song'}</b><small>{audioDuration ? `Detected length: ${formatTime(audioDuration)}` : 'MP3, WAV, M4A and more'}</small></label>
          {audioDuration && <div className={`duration-note ${exceedsLimit ? 'warning' : ''}`}><b>{exceedsLimit ? 'Song is longer than the 5-minute limit' : 'Video length locked to your song'}</b><span>{exceedsLimit ? 'SonaWills will use the first 5:00 of the audio.' : `Target video: ${formatTime(targetDuration)} (audio + up to 2 seconds, never over 5:00)`}</span></div>}

          <Step n="02" title="Your characters" />
          <label className="upload compact"><input type="file" accept="image/*" multiple onChange={e => setCharacters([...e.target.files].slice(0, 3))} /><span className="upload-icon">＋</span><b>{characters.length ? `${characters.length} character reference${characters.length > 1 ? 's' : ''}` : 'Add character references'}</b><small>Up to 3 images • SonaWills keeps identity consistent</small></label>

          <Step n="03" title="Your vision" />
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the setting, story, mood, locations, wardrobe, lighting, camera style…" />

          <Step n="04" title="Production" />
          <div className="controls">
            <div className="locked-duration"><span>VIDEO LENGTH</span><b>{targetDuration ? formatTime(targetDuration) : 'Matches audio'}</b></div>
            <select value={ratio} onChange={e => setRatio(e.target.value)}><option>16:9</option><option>9:16</option></select>
            <select value={style} onChange={e => setStyle(e.target.value)}><option>Cinematic</option><option>Afrobeats</option><option>Performance</option><option>Anime</option><option>Surreal</option></select>
          </div>

          <button className="create" onClick={() => setCreated(true)} disabled={!audio || !prompt.trim()}>Create music video <span>→</span></button>
          <p className="fine">SonaWills will match the final video to the audio length, analyze the song, plan short scenes, preserve character identity, add performance/lip-sync moments where appropriate, then assemble the final MP4.</p>
        </section>

        <section className="panel preview-panel">
          <div className="preview-head"><div><span>DIRECTOR'S VIEW</span><h2>{created ? 'Production queued' : 'Your music video'}</h2></div><div className="status">● Ready</div></div>
          <div className={`stage ${created ? 'created' : ''}`}>
            {created ? <><div className="orb">✦</div><h3>Your SonaWills project is ready for the generation engine.</h3><p>{targetDuration ? `Target duration: ${formatTime(targetDuration)}.` : ''} The next build connects this director interface to the open video-model pipeline, audio analysis, character continuity, lip-sync and MP4 rendering.</p></> : <><div className="play">▶</div><h3>Your cinematic preview will appear here</h3><p>Start with a song, character and creative vision.</p></>}
          </div>
          <div className="specs"><span>{targetDuration ? formatTime(targetDuration) : 'Audio length'}</span><span>{ratio}</span><span>{style}</span><span>MP4 output</span></div>
        </section>
      </main>
      <footer>SonaWills <span>•</span> Building cinematic AI tools with open models.</footer>
    </div>
  );
}
function Step({ n, title }) { return <div className="step"><span>{n}</span><b>{title}</b></div> }
createRoot(document.getElementById('root')).render(<App />);
