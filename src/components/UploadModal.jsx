import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Link, Image as ImageIcon } from 'lucide-react';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, user, setTracks } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!showUploadModal) return null;

  const API_URL = import.meta.env.VITE_API_URL || 'https://pandofy-1.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError("Le titre est requis");
    if (!youtubeUrl.trim()) return setError("Le lien YouTube est requis");

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
    if (!ytRegex.test(youtubeUrl.trim())) {
      return setError("Lien YouTube invalide. Ex: https://youtube.com/watch?v=XXXXXXXXXXX");
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('pandofy_token');
      const res = await fetch(`${API_URL}/api/tracks/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          genre,
          artistId: User.username,
          artistName: User.displayName,
          youtubeUrl: youtubeUrl.trim(),
          coverUrl: coverUrl.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      setTracks(prev => [data, ...prev]);
      setSuccess(true);
      setTitle(''); setYoutubeUrl(''); setCoverUrl('');

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
          {/* URL YouTube */}
          <div className="modal-form-group">
            <label className="modal-label">🎵 Lien YouTube</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link size={16} color="#FF0000" />
              <input
                type="url"
                className="modal-input"
                placeholder="https://youtube.com/watch?v=XXXXXXXXXXX"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
              Colle le lien YouTube du morceau — la miniature est récupérée automatiquement
            </small>
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

          {/* URL Cover optionnelle */}
          <div className="modal-form-group" style={{ marginBottom: 28 }}>
            <label className="modal-label">🖼️ Image de couverture (Optionnel)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={16} color="var(--color-text-muted)" />
              <input
                type="url"
                className="modal-input"
                placeholder="Laisse vide = miniature YouTube automatique"
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
