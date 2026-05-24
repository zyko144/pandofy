import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Link, Image as ImageIcon } from 'lucide-react';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, currentUser, setTracks } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!showUploadModal) return null;

  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError("Le titre est requis");
    if (!audioUrl.trim()) return setError("L'URL du son est requise");

    try {
      setLoading(true);
      const token = localStorage.getItem('pandofy_token');
      const res = await fetch(`${API_URL}/api/tracks/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          genre,
          artistId: currentUser.username,
          artistName: currentUser.displayName,
          audioUrl: audioUrl.trim(),
          coverUrl: coverUrl.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      setTracks(prev => [data, ...prev]);
      setSuccess(true);
      setTitle(''); setAudioUrl(''); setCoverUrl('');

      setTimeout(() => {
        setShowUploadModal(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}>
          <X size={20} />
        </button>

        <h2 className="modal-title">Publier votre musique</h2>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="error-message" style={{
            backgroundColor: 'rgba(255,102,0,0.1)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary)'
          }}>
            Musique publiée avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* URL Audio */}
          <div className="modal-form-group">
            <label className="modal-label">🔗 URL du fichier audio (lien MP3 direct)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link size={16} color="var(--color-text-muted)" />
              <input
                type="url"
                className="modal-input"
                placeholder="https://exemple.com/son.mp3"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Titre */}
          <div className="modal-form-group">
            <label className="modal-label">Titre du son</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Ex: Mon Morceau"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Genre */}
          <div className="modal-form-group">
            <label className="modal-label">Genre</label>
            <select
              className="modal-input"
              style={{ background: '#1F1F1F', cursor: 'pointer' }}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option>Hip-Hop</option>
              <option>Trap</option>
              <option>Rap FR</option>
              <option>UK Drill</option>
              <option>R&B Rap</option>
              <option>Afro-Rap</option>
              <option>Pop</option>
              <option>Electro House</option>
              <option>Lo-Fi</option>
              <option>Rock</option>
              <option>Classique</option>
            </select>
          </div>

          {/* URL Cover */}
          <div className="modal-form-group" style={{ marginBottom: 28 }}>
            <label className="modal-label">🖼️ URL image de couverture (Optionnel)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={16} color="var(--color-text-muted)" />
              <input
                type="url"
                className="modal-input"
                placeholder="https://exemple.com/cover.jpg"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary modal-submit-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Publication..." : "Publier maintenant"}
          </button>
        </form>
      </div>
    </div>
  );
}
