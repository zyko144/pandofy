import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Link, Upload } from 'lucide-react';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, user, setTracks } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverBase64, setCoverBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  if (!showUploadModal) return null;

  const API_URL = import.meta.env.VITE_API_URL || 'https://pandofy-1.onrender.com';

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverPreview(ev.target.result);
      setCoverBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          genre,
          artistId: user.username,
          artistName: user.displayName,
          youtubeUrl: youtubeUrl.trim(),
          coverUrl: coverBase64 || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      setTracks(prev => [data, ...prev]);
      setSuccess(true);
      setTitle(''); setYoutubeUrl(''); setCoverBase64(''); setCoverPreview('');

      setTimeout(() => { setShowUploadModal(false); setSuccess(false); }, 1500);
    } catch (err) {
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}><X size={20} /></button>
        <h2 className="modal-title">Publier votre musique</h2>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="error-message" style={{ backgroundColor: 'rgba(255,102,0,0.1)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
            Musique publiée avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* YouTube URL */}
          <div className="modal-form-group">
            <label className="modal-label">🎵 Lien YouTube</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link size={16} color="#FF0000" />
              <input type="url" className="modal-input"
                placeholder="https://youtube.com/watch?v=XXXXXXXXXXX"
                value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} style={{ flex: 1 }} />
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
              La miniature YouTube est récupérée automatiquement
            </small>
          </div>

          {/* Titre */}
          <div className="modal-form-group">
            <label className="modal-label">Titre du son</label>
            <input type="text" className="modal-input" placeholder="Ex: Mon Morceau"
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

          {/* Image depuis le PC */}
          <div className="modal-form-group" style={{ marginBottom: 28 }}>
            <label className="modal-label">🖼️ Image de couverture (depuis votre PC)</label>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {coverPreview ? (
                <img src={coverPreview} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: 8, border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={20} color="var(--color-text-muted)" />
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                {coverPreview ? 'Changer l\'image' : 'Choisir une image'}
              </button>
              {coverPreview && (
                <button type="button" onClick={() => { setCoverPreview(''); setCoverBase64(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Supprimer
                </button>
              )}
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 6, display: 'block' }}>
              Laisse vide = miniature YouTube automatique
            </small>
          </div>

          <button type="submit" className="btn-primary modal-submit-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Publication..." : "Publier maintenant"}
          </button>
        </form>
      </div>
    </div>
  );
}
