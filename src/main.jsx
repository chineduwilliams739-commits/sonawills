import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const GPU_WORKER_URL = 'https://chineduwilliams739-commits--sonawills-wan22-web-app.modal.run';

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
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

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
    setStatus('idle');
    setError('');
    setVideoUrl('');
  };

  const createVideo = async () => {
    if (!audio || !prompt.trim()) return;
    setStatus('uploading');
    setError('');
    setVideoUrl('');

    try {
      const body = new FormData();
      body.append('prompt', `${prompt.trim()}. Visual style: ${style}.`);
      body.append('size', ratio === '16:9' ? '832*480' : '480*832');
      body.append('frame_num', '81');
      body.append('sample_steps', '20');
      body.append('audio', audio);
      if (characters[0]) body.append('character', characters[0]);

      const response = await fetch(`${GPU_WORKER_URL}/submit`, { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Could not queue the generation job.');

      setJobId(data.job_id);
      setStatus('queued');
      pollJob(data.call_id, data.job_id);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Something went wrong while starting generation.');
    }
  };

  const pollJob = async (callId, id) => {
    for (let i = 0; i < 600; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const response = await fetch(`${GPU_WORKER_URL}/status/${callId}`);
        const data = await response.json();
        if (data.status === 'done') {
          setStatus('done');
          setVideoUrl(`${GPU_WORKER_URL}/download/${id}`);
          return;
        }
        if (data.status === 'failed') throw new Error(data.error || 'The GPU worker failed.');
        setStatus('generating');
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Generation failed.');
        return;
      }
    }
    setStatus('error');
    setError('The generation job took too long to report back. Check Modal logs for the job.');
  };

  const statusLabel = {
    idle: 'Ready', uploading: 'Uploading', queued: 'Queued', generating: 'Generating', done: 'Complete', error: 'Error'
  }[status];

  return (
    <div className="app">
      <header className="nav">
        <div className="brand"><div className="logo">S</div><div><strong>SonaWills</strong><small>AI MUSIC VIDEO STUDIO</small></div></div>
        <span className="pill">WAN2.2 GPU ENGINE</span>
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
          <label className="upload compact"><input type="file" accept="image/*" multiple onChange={e => setCharacters([...e.target.files].slice(0, 3))} /><span className="upload-icon">＋</span><b>{characters.length ? `${characters.length} character reference${characters.length > 1 ? 's' : ''}` : 'Add character references'}</b><small>Up to 3 images • first reference used for the initial Wan2.2 test</small></label>

          <Step n="03" title="Your vision" />
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the setting, story, mood, locations, wardrobe, lighting, camera style…" />

          <Step n="04" title="Production" />
          <div className="controls">
            <div className="locked-duration"><span>VIDEO LENGTH</span><b>{targetDuration ? formatTime(targetDuration) : 'Matches audio'}</b></div>
            <select value={ratio} onChange={e => setRatio(e.target.value)}><option>16:9</option><option>9:16</option></select>
            <select value={style} onChange={e => setStyle(e.target.value)}><option>Cinematic</option><option>Afrobeats</option><option>Performance</option><option>Anime</option><option>Surreal</option></select>
          </div>

          <button className="create" onClick={createVideo} disabled={!audio || !prompt.trim() || ['uploading','queued','generating'].includes(status)}>{status === 'generating' ? 'Generating…' : status === 'queued' ? 'Queued…' : 'Create music video'} <span>→</span></button>
          {error && <p className="fine" style={{color:'#ff8c8c'}}>{error}</p>}
          <p className="fine">The first real engine test generates an 81-frame Wan2.2 cinematic shot and loops it to the uploaded song so we can verify the complete upload → GPU → MP4 pipeline before replacing the loop with multi-scene generation.</p>
        </section>

        <section className="panel preview-panel">
          <div className="preview-head"><div><span>DIRECTOR'S VIEW</span><h2>{status === 'done' ? 'Your SonaWills video' : status === 'generating' ? 'GPU generation in progress' : status === 'queued' ? 'Production queued' : 'Your music video'}</h2></div><div className="status">● {statusLabel}</div></div>
          <div className={`stage ${status !== 'idle' ? 'created' : ''}`}>
            {status === 'done' && videoUrl ? <video controls playsInline src={videoUrl} style={{width:'100%',height:'100%',objectFit:'contain',borderRadius:18}} /> : status === 'error' ? <><div className="orb">!</div><h3>Generation stopped</h3><p>{error}</p></> : status !== 'idle' ? <><div className="orb">✦</div><h3>{status === 'generating' ? 'Wan2.2 is rendering your shot.' : 'Your SonaWills project is queued.'}</h3><p>{targetDuration ? `Target duration: ${formatTime(targetDuration)}.` : ''} Keep this page open while the first real GPU test runs.</p></> : <><div className="play">▶</div><h3>Your cinematic preview will appear here</h3><p>Start with a song, character and creative vision.</p></>}
          </div>
          <div className="specs"><span>{targetDuration ? formatTime(targetDuration) : 'Audio length'}</span><span>{ratio}</span><span>{style}</span><span>MP4 output</span></div>
          {status === 'done' && videoUrl && <a className="create" href={videoUrl} download={`sonawills-${jobId}.mp4`} style={{display:'block',textAlign:'center',textDecoration:'none',marginTop:14}}>Download MP4 →</a>}
        </section>
      </main>
      <footer>SonaWills <span>•</span> Building cinematic AI tools with open models.</footer>
    </div>
  );
}
function Step({ n, title }) { return <div className="step"><span>{n}</span><b>{title}</b></div> }
createRoot(document.getElementById('root')).render(<App />);
