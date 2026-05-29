import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Upload, Music, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, user, setTracks } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const audioRef = useRef(null);
  const coverRef = useRef(null);

  if (!showUploadModal) return null;

  const handleAudioFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleCoverFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Le titre est requis');
    if (!audioFile) return setError('Sélectionne un fichier MP3');

    try {
      setLoading(true);
      setProgress(10);
      const token = localStorage.getItem('pandofy_token');
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      formData.append('title', title.trim());
      formData.append('genre', genre);
      formData.append('artistId', user.username);
      formData.append('artistName', user.displayName);

      setProgress(30);

      const res = await fetch(`${API_BASE}/api/tracks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      setProgress(90);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      setTracks(prev => [data, ...prev]);
      setProgress(100);
      setSuccess(true);
      setTitle(''); setAudioFile(null); setCoverFile(null); setCoverPreview('');

      setTimeout(() => { setShowUploadModal(false); setSuccess(false); setProgress(0); }, 2000);
    } catch (err) {
      setError('Erreur : ' + err.message);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && setShowUploadModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="modal-close-btn" onClick={() => !loading && setShowUploadModal(false)} disabled={loading}>
          <X size={20} />
        </button>

        <h2 className="modal-title">Publier un son</h2>

        {error && <div className="error-message">{error}</div>}

        {success && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="#FF6600" style={{ marginBottom: 12 }} />
            <div style={{ color: '#FF6600', fontWeight: 700, fontSize: '1.1rem' }}>Son publié avec succès !</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Visible par toute la communauté</div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>

            {/* Audio MP3 */}
            <div className="modal-form-group">
              <label className="modal-label">🎵 Fichier audio (MP3, WAV, FLAC)</label>
              <input ref={audioRef} type="file" accept="audio/mpeg,audio/flac,audio/wav,audio/ogg,audio/x-m4a" style={{ display: 'none' }} onChange={handleAudioFile} />
              <div
                onClick={() => audioRef.current?.click()}
                style={{ border: `2px dashed ${audioFile ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: audioFile ? 'rgba(255,102,0,0.05)' : 'transparent' }}
              >
                {audioFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Music size={20} color="var(--color-primary)" />
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{audioFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={24} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Clique pour sélectionner un fichier audio</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: 4 }}>MP3, WAV, FLAC — max 50 Mo</div>
                  </>
                )}
              </div>
            </div>

            {/* Titre */}
            <div className="modal-form-group">
              <label className="modal-label">Titre</label>
              <input type="text" className="modal-input" placeholder="Nom du morceau"
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Genre */}
            <div className="modal-form-group">
              <label className="modal-label">Genre</label>
              <select className="modal-input" style={{ background: '#1F1F1F', cursor: 'pointer' }}
                value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option>Hip-Hop</option><option>Trap</option><option>Rap FR</option>
                <option>UK Drill</option><option>R&B Rap</option><option>Afro-Rap</option>
                <option>Pop</option><option>Electro House</option><option>Lo-Fi</option>
                <option>Rock</option><option>Classique</option>
              </select>
            </div>

            {/* Cover */}
            <div className="modal-form-group" style={{ marginBottom: 28 }}>
              <label className="modal-label">🖼️ Image de couverture (optionnel)</label>
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleCoverFile} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div onClick={() => coverRef.current?.click()}
                  style={{ width: 64, height: 64, borderRadius: 8, border: `1px dashed ${coverPreview ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
                  {coverPreview ? <img src={coverPreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} color="var(--color-text-muted)" />}
                </div>
                <div>
                  <button type="button" onClick={() => coverRef.current?.click()}
                    style={{ padding: '7px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.83rem', display: 'block', marginBottom: 4 }}>
                    {coverPreview ? "Changer" : "Choisir une image"}
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>JPG, PNG, WEBP</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #FF6600, #CC44FF)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {progress < 30 ? 'Préparation...' : progress < 90 ? 'Upload en cours...' : 'Finalisation...'}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary modal-submit-btn" disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><Upload size={16} style={{ animation: 'spin 1s linear infinite' }} /> Publication...</> : 'Publier maintenant'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
