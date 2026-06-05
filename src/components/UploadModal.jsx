import React, { useState, useContext, useRef, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Upload, Music, Image as ImageIcon, CheckCircle, Link, Plus, Trash2 } from 'lucide-react';
import { API_BASE } from '../utils/api';

const GENRES = ['Hip-Hop','Trap','Rap FR','UK Drill','R&B Rap','Afro-Rap','Pop','Electro House','Lo-Fi','Rock','Classique'];

const EMPTY_TRACK = () => ({ id: Date.now() + Math.random(), audioFile: null, title: '', genre: 'Hip-Hop', coverFile: null, coverPreview: '', youtubeUrl: '', status: 'idle', progress: 0, error: '' });

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, user, setTracks } = useContext(AppContext);
  const [mode, setMode] = useState('file'); // 'file' | 'youtube'
  const [tracks, setLocalTracks] = useState([EMPTY_TRACK()]);
  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const audioRefs = useRef({});
  const coverRefs = useRef({});

  if (!showUploadModal) return null;

  const handleClose = () => {
    if (uploading) return;
    setShowUploadModal(false);
    setLocalTracks([EMPTY_TRACK()]);
    setAllDone(false);
  };

  const addTrack = () => {
    if (tracks.length >= 10) return;
    setLocalTracks(prev => [...prev, EMPTY_TRACK()]);
  };

  const removeTrack = (id) => {
    if (tracks.length === 1) return;
    setLocalTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrack = (id, field, value) => {
    setLocalTracks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleAudioFiles = (id, files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    setLocalTracks(prev => {
      let nextTracks = [...prev];
      const targetIdx = nextTracks.findIndex(t => t.id === id);
      if (targetIdx === -1) return prev;

      const firstFile = fileList[0];
      const firstName = firstFile.name.replace(/\.[^.]+$/, '');
      nextTracks[targetIdx] = {
        ...nextTracks[targetIdx],
        audioFile: firstFile,
        title: nextTracks[targetIdx].title || firstName
      };

      const remainingSlots = 10 - nextTracks.length;
      const filesToAdd = fileList.slice(1, 1 + remainingSlots);

      filesToAdd.forEach(file => {
        const name = file.name.replace(/\.[^.]+$/, '');
        nextTracks.push({
          id: Date.now() + Math.random(),
          audioFile: file,
          title: name,
          genre: nextTracks[targetIdx].genre || 'Hip-Hop',
          coverFile: null,
          coverPreview: '',
          youtubeUrl: '',
          status: 'idle',
          progress: 0,
          error: ''
        });
      });

      return nextTracks;
    });
  };

  const handleCoverFile = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLocalTracks(prev => prev.map(t => t.id === id ? { ...t, coverFile: file, coverPreview: ev.target.result } : t));
    reader.readAsDataURL(file);
  };

  const uploadOne = async (track) => {
    const token = localStorage.getItem('pandofy_token');

    if (mode === 'youtube') {
      const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
      if (!ytRegex.test(track.youtubeUrl)) throw new Error('Lien YouTube invalide');
      const res = await fetch(`${API_BASE}/api/tracks/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: track.title, genre: track.genre, artistId: user.username, artistName: user.displayName, youtubeUrl: track.youtubeUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      return data;
    } else {
      if (!track.audioFile) throw new Error('Fichier audio requis');
      const formData = new FormData();
      formData.append('audio', track.audioFile);
      if (track.coverFile) formData.append('cover', track.coverFile);
      formData.append('title', track.title.trim());
      formData.append('genre', track.genre);
      formData.append('artistId', user.username);
      formData.append('artistName', user.displayName);
      const res = await fetch(`${API_BASE}/api/tracks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      return data;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    // Validate
    for (const t of tracks) {
      if (!t.title.trim()) { updateTrack(t.id, 'error', 'Titre requis'); setUploading(false); return; }
      if (mode === 'file' && !t.audioFile) { updateTrack(t.id, 'error', 'Fichier audio requis'); setUploading(false); return; }
      if (mode === 'youtube' && !t.youtubeUrl.trim()) { updateTrack(t.id, 'error', 'Lien YouTube requis'); setUploading(false); return; }
    }

    // Upload all in parallel — non-blocking UI
    const results = await Promise.allSettled(
      tracks.map(async (track) => {
        updateTrack(track.id, 'status', 'uploading');
        updateTrack(track.id, 'progress', 30);
        try {
          const data = await uploadOne(track);
          updateTrack(track.id, 'status', 'done');
          updateTrack(track.id, 'progress', 100);
          // Add to global tracks immediately — don't wait for others
          setTracks(prev => [data, ...prev]);
          return data;
        } catch (err) {
          updateTrack(track.id, 'status', 'error');
          updateTrack(track.id, 'error', err.message);
          throw err;
        }
      })
    );

    const allSuccess = results.every(r => r.status === 'fulfilled');
    setUploading(false);
    if (allSuccess) {
      setAllDone(true);
      setTimeout(() => { handleClose(); }, 2000);
    }
  };

  const pendingCount = tracks.filter(t => t.status === 'idle').length;
  const doneCount = tracks.filter(t => t.status === 'done').length;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close-btn" onClick={handleClose} disabled={uploading}><X size={20} /></button>

        <h2 className="modal-title">Publier de la musique</h2>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
          {[['file', '🎵 Fichier MP3'], ['youtube', '▶️ YouTube']].map(([m, label]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setLocalTracks([EMPTY_TRACK()]); }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                background: mode === m ? 'var(--color-primary)' : 'transparent', color: mode === m ? '#000' : 'var(--color-text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {allDone ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <CheckCircle size={52} color="var(--color-primary)" style={{ marginBottom: 12 }} />
            <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{doneCount} son{doneCount > 1 ? 's' : ''} publié{doneCount > 1 ? 's' : ''} !</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Visibles par toute la communauté</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {tracks.map((track, idx) => (
              <div key={track.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${track.status === 'error' ? '#FF4400' : track.status === 'done' ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative' }}>

                {/* Track header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    {track.status === 'done' ? '✅' : track.status === 'uploading' ? '⏳' : track.status === 'error' ? '❌' : `Son ${idx + 1}`}
                  </span>
                  {tracks.length > 1 && track.status === 'idle' && (
                    <button type="button" onClick={() => removeTrack(track.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4400' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {track.error && <div style={{ color: '#FF4400', fontSize: '0.8rem', marginBottom: 8 }}>{track.error}</div>}

                {/* Progress bar */}
                {track.status === 'uploading' && (
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${track.progress}%`, background: 'linear-gradient(to right, var(--color-primary), #CC44FF)', borderRadius: 2, transition: 'width 0.3s ease', animation: 'pulse 1s infinite' }} />
                  </div>
                )}

                {track.status !== 'uploading' && track.status !== 'done' && (
                  <>
                    {/* Audio file or YouTube URL */}
                    {mode === 'file' ? (
                      <div style={{ marginBottom: 10 }}>
                        <input ref={el => audioRefs.current[track.id] = el} type="file" multiple accept="audio/mpeg,audio/flac,audio/wav,audio/ogg,audio/x-m4a" style={{ display: 'none' }} onChange={e => handleAudioFiles(track.id, e.target.files)} />
                        <div onClick={() => audioRefs.current[track.id]?.click()}
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAudioFiles(track.id, e.dataTransfer.files);
                          }}
                          style={{ border: `2px dashed ${track.audioFile ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '12px', textAlign: 'center', cursor: 'pointer', background: track.audioFile ? 'var(--color-primary-glow)' : 'transparent' }}>
                          {track.audioFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <Music size={16} color="var(--color-primary)" />
                              <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{track.audioFile.name}</span>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                              <Upload size={18} style={{ marginBottom: 4 }} /><br/>Glisser-déposer ou cliquer pour ajouter des MP3
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
                          <Link size={14} color="#FF0000" />
                          <input type="url" placeholder="https://youtube.com/watch?v=..." value={track.youtubeUrl}
                            onChange={e => updateTrack(track.id, 'youtubeUrl', e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }} />
                        </div>
                      </div>
                    )}

                    {/* Title */}
                    <input type="text" className="modal-input" placeholder="Titre du morceau" value={track.title}
                      onChange={e => updateTrack(track.id, 'title', e.target.value)}
                      style={{ marginBottom: 8, fontSize: '0.9rem' }} />

                    {/* Genre */}
                    <select className="modal-input" value={track.genre} onChange={e => updateTrack(track.id, 'genre', e.target.value)}
                      style={{ background: '#1F1F1F', fontSize: '0.85rem', marginBottom: 8 }}>
                      {GENRES.map(g => <option key={g}>{g}</option>)}
                    </select>

                    {/* Cover */}
                    <input ref={el => coverRefs.current[track.id] = el} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleCoverFile(track.id, e)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div onClick={() => coverRefs.current[track.id]?.click()}
                        style={{ width: 44, height: 44, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.15)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.03)' }}>
                        {track.coverPreview ? <img src={track.coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <ImageIcon size={16} color="var(--color-text-muted)" />}
                      </div>
                      <button type="button" onClick={() => coverRefs.current[track.id]?.click()}
                        style={{ padding: '5px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}>
                        {track.coverPreview ? 'Changer' : 'Couverture (optionnel)'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add track button */}
            {tracks.length < 10 && !uploading && (
              <button type="button" onClick={addTrack}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                <Plus size={14} /> Ajouter un son ({tracks.length}/10)
              </button>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary modal-submit-btn" disabled={uploading}
              style={{ opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {uploading
                ? <><Upload size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Publication en cours ({doneCount}/{tracks.length})...</>
                : `Publier ${tracks.length} son${tracks.length > 1 ? 's' : ''}`
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
