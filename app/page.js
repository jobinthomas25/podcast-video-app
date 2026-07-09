'use client';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleSubmit = async () => {
    if (!file) return alert('Please upload an audio file.');
    setStatus('processing');
    setProgress('Uploading and transcribing audio...');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title || 'Episode');
    formData.append('chapters', JSON.stringify([]));

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setProgress('Rendering video in cloud...');

      // Poll for render completion
      const pollInterval = setInterval(async () => {
        const pollRes = await fetch(`/api/render-status?renderId=${data.renderId}&bucketName=${data.bucketName}`);
        const pollData = await pollRes.json();

        if (pollData.done) {
          clearInterval(pollInterval);
          setDownloadUrl(pollData.url);
          setStatus('done');
        } else if (pollData.error) {
          clearInterval(pollInterval);
          throw new Error(pollData.error);
        } else {
          setProgress(`Rendering... ${Math.round(pollData.progress * 100)}%`);
        }
      }, 5000);

    } catch (err) {
      alert('Error: ' + err.message);
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <div style={{ backgroundColor: '#111', minHeight: '100vh', padding: '40px', fontFamily: 'Georgia, serif', color: '#F5A623' }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>✅ Video Ready!</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>Your podcast video has been rendered and is ready to download.</p>
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Episode: {result?.title}</h2>
          <p style={{ color: '#888', fontSize: 14 }}>{result?.segments?.length} caption segments</p>
          {result?.chapters?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Auto-detected chapters:</p>
              {result.chapters.map((ch, i) => (
                <p key={i} style={{ color: '#ddd', fontSize: 14, marginBottom: 4 }}>• {ch.title}</p>
              ))}
            </div>
          )}
        </div>
        <a href={downloadUrl} download style={{ display: 'inline-block', backgroundColor: '#F5A623', color: '#111', padding: '16px 32px', borderRadius: 8, fontSize: 18, fontWeight: 'bold', textDecoration: 'none', marginBottom: 16 }}>
          ⬇️ Download MP4
        </a>
        <br />
        <button onClick={() => { setStatus('idle'); setFile(null); setResult(null); setDownloadUrl(null); }} style={{ backgroundColor: 'transparent', color: '#888', border: '1px solid #333', padding: '12px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer', marginTop: 16 }}>
          Process Another Episode
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', padding: '40px', fontFamily: 'Georgia, serif', color: '#F5A623' }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Life Skills with Jobin</h1>
      <p style={{ color: '#888', marginBottom: 40, fontSize: 18 }}>Podcast Video Generator</p>

      {status === 'processing' ? (
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ fontSize: 20, color: '#ddd' }}>{progress}</p>
          <p style={{ color: '#555', marginTop: 8 }}>Please wait — this takes a few minutes...</p>
        </div>
      ) : (
        <div style={{ maxWidth: 600 }}>
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>Episode Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Stereotypes"
              style={{ width: '100%', padding: '12px 16px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#ddd', fontSize: 16, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>Upload Audio File</label>
            <div
              onClick={() => document.getElementById('fileInput').click()}
              style={{ border: '2px dashed #333', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#1a1a1a' }}
            >
              {file ? (
                <p style={{ color: '#F5A623' }}>✅ {file.name}</p>
              ) : (
                <p style={{ color: '#555' }}>Click to upload MP3 or M4A</p>
              )}
              <input id="fileInput" type="file" accept=".mp3,.m4a,.wav" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            style={{ width: '100%', padding: '16px', backgroundColor: '#F5A623', color: '#111', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}
          >
            Generate Video →
          </button>
        </div>
      )}
    </div>
  );
}