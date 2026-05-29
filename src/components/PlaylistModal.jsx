import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X } from 'lucide-react';

export default function PlaylistModal() {
  const { showPlaylistModal, setShowPlaylistModal, createNewPlaylist } = useContext(AppContext);
  const [playlistName, setPlaylistName] = useState('');
  const [error, setError] = useState('');

  if (!showPlaylistModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!playlistName.trim()) {
      setError("Le nom de la playlist ne peut pas être vide.");
      return;
    }

    try {
      await createNewPlaylist(playlistName.trim());
      setPlaylistName('');
      setShowPlaylistModal(false);
    } catch (err) {
      setError("Erreur lors de la création de la playlist.");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowPlaylistModal(false)}>
          <X size={20} />
        </button>

        <h2 className="modal-title">Créer une Playlist</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="modal-form-group">
            <label className="modal-label">Nom de la playlist</label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Ma super playlist"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary modal-submit-btn" style={{ marginTop: 8 }}>
            Créer la playlist
          </button>
        </form>
      </div>
    </div>
  );
}
