import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [audio, setAudio] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5');
  const [ratio, setRatio] = useState('16:9');
  const [style, setStyle] = useState('Cinematic');
  const [created, setCreated] = useState(false);

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
          <label className="upload"><input type="file" accept="audio/*" onChange={e => setAudio(e.target.files?.[0] || null)} /><span className="upload-icon">♫</span><b>{audio ? audio.name : 'Upload your song'}</b><small>MP3, WAV, M4A and more</small></label>

          <Step n="02" title="Your characters" />
          <label className="upload compact"><input type="file" accept="image/*" multiple onChange={e => setCharacters([...e.target.files].slice(0, 3))} /><span className="upload-icon">＋</span><b>{characters.length ? `${characters.length} character reference${characters.length > 1 ? 's' : ''}` : 'Add character references'}</b><small>Up to 3 images • SonaWills keeps identity consistent</small></label>

          <Step n="03" title="Your vision" />
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the setting, story, mood, locations, wardrobe, lighting, camera style…" />

          <Step n="04" title="Production" />
          <div className="controls">
            <select value={duration} onChange={e => setDuration(e.target.value)}><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option></select>
            <select value={ratio} onChange={e => setRatio(e.target.value)}><option>16:9</option><option>9:16</option></select>
            <select value={style} onChange={e => setStyle(e.target.value)}><option>Cinematic</option><option>Afrobeats</option><option>Performance</option><option>Anime</option><option>Surreal</option></select>
          </div>

          <button className="create" onClick={() => setCreated(true)}>Create music video <span>→</span></button>
          <p className="fine">SonaWills will analyze your audio, plan short scenes, preserve character identity, add performance/lip-sync moments where appropriate, then assemble the final video.</p>
        </section>

        <section className="panel preview-panel">
          <div className="preview-head"><div><span>DIRECTOR'S VIEW</span><h2>{created ? 'Production queued' : 'Your music video'}</h2></div><div className="status">● Ready</div></div>
          <div className={`stage ${created ? 'created' : ''}`}>
            {created ? <><div className="orb">✦</div><h3>Your SonaWills project is ready for the generation engine.</h3><p>The next build connects this director interface to the open video-model pipeline, audio analysis, character continuity, lip-sync and MP4 rendering.</p></> : <><div className="play">▶</div><h3>Your cinematic preview will appear here</h3><p>Start with a song, character and creative vision.</p></>}
          </div>
          <div className="specs"><span>{duration} min</span><span>{ratio}</span><span>{style}</span><span>MP4 output</span></div>
        </section>
      </main>
      <footer>SonaWills <span>•</span> Building cinematic AI tools with open models.</footer>
    </div>
  );
}
function Step({ n, title }) { return <div className="step"><span>{n}</span><b>{title}</b></div> }
createRoot(document.getElementById('root')).render(<App />);
