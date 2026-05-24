import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, UploadCloud, Music, Image as ImageIcon } from 'lucide-react';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, uploadTrack } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Electro House');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!showUploadModal) return null;

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      // Auto-populate title if empty
      if (!title) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!title.trim()) {
      setError("Le titre de la chanson est requis");
      return;
    }
    if (!audioFile) {
      setError("Vous devez sélectionner un fichier audio (.mp3 ou .wav)");
      return;
    }

    try {
      setLoading(true);
      await uploadTrack(title.trim(), genre, audioFile, coverFile);
      setSuccess(true);
      
      // Reset form fields
      setTitle('');
      setAudioFile(null);
      setCoverFile(null);
      
      // Auto close after delay
      setTimeout(() => {
        setShowUploadModal(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError("Erreur lors de la publication : " + err.message);
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
            backgroundColor: 'rgba(255, 102, 0, 0.1)', 
            borderColor: 'var(--color-primary)', 
            color: 'var(--color-primary)' 
          }}>
            Votre musique a été publiée avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Audio upload area */}
          <div className="modal-form-group">
            <label className="modal-label">Fichier Audio (Requis)</label>
            <div className="role-option" style={{ 
              borderStyle: 'dashed', 
              padding: '20px', 
              cursor: 'pointer',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 8,
              borderColor: audioFile ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'
            }} onClick={() => document.getElementById('audio-input').click()}>
              <UploadCloud size={28} color={audioFile ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
              <span style={{ fontSize: '0.85rem' }}>
                {audioFile ? audioFile.name : "Sélectionner un fichier audio (.mp3, .wav)"}
              </span>
              <input 
                id="audio-input" 
                type="file" 
                accept="audio/*" 
                style={{ display: 'none' }} 
                onChange={handleAudioChange} 
              />
            </div>
          </div>

          {/* Title */}
          <div className="modal-form-group">
            <label className="modal-label">Titre du son</label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Ex: Mon Morceau Électro"
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
              <option value="Electro House">Electro House</option>
              <option value="Lo-Fi">Lo-Fi</option>
              <option value="Synthwave">Synthwave</option>
              <option value="Cyberpunk">Cyberpunk</option>
              <option value="Pop">Pop</option>
              <option value="Hip-Hop">Hip-Hop</option>
              <option value="Rock">Rock</option>
              <option value="Classique">Classique</option>
            </select>
          </div>

          {/* Cover photo upload area */}
          <div className="modal-form-group" style={{ marginBottom: 28 }}>
            <label className="modal-label">Image de couverture (Optionnel)</label>
            <div className="role-option" style={{ 
              borderStyle: 'dashed', 
              padding: '16px', 
              cursor: 'pointer',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 6,
              borderColor: coverFile ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'
            }} onClick={() => document.getElementById('cover-input').click()}>
              <ImageIcon size={22} color={coverFile ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
              <span style={{ fontSize: '0.8rem' }}>
                {coverFile ? coverFile.name : "Glisser ou sélectionner une image (.png, .jpg)"}
              </span>
              <input 
                id="cover-input" 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleCoverChange} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary modal-submit-btn" 
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Envoi en cours..." : "Publier maintenant"}
          </button>
        </form>
      </div>
    </div>
  );
}
