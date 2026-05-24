import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Home, 
  Search, 
  Library, 
  User, 
  Sparkles, 
  Plus, 
  Heart, 
  Upload,
  Globe
} from 'lucide-react';

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    playlists,
    user,
    activePlaylistId,
    setActivePlaylistId,
    setShowPlaylistModal,
    setShowUploadModal,
    setShowAuthModal
  } = useContext(AppContext);

  // Filter playlists created by the current user
  const userPlaylists = playlists.filter(p => !user || p.userId === user.username);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActivePlaylistId(null);
  };

  const handlePlaylistClick = (playlistId) => {
    setActivePlaylistId(playlistId);
    setActiveTab('playlist'); // Custom view for displaying playlist items
  };

  const handleCreatePlaylist = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowPlaylistModal(true);
  };

  const handlePublishClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowUploadModal(true);
  };

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <a href="#" className="sidebar-logo" onClick={() => handleTabChange('home')}>
        <svg className="logo-note-svg" viewBox="0 0 100 100" style={{width: 32, height: 32}} xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="38" cy="72" rx="16" ry="11" transform="rotate(-25 38 72)" fill="var(--color-primary)" />
          <rect x="47" y="20" width="7" height="52" rx="2" fill="var(--color-primary)" />
          <path d="M 52,20 C 74,20 74,48 52,48" fill="none" strokeWidth="7" strokeLinecap="round" stroke="var(--color-primary)" />
        </svg>
        <span>Pandofy</span>
      </a>

      {/* Main Navigation */}
      <div className="sidebar-menu-section">
        <button 
          className={`sidebar-menu-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabChange('home')}
        >
          <Home size={20} />
          <span>Accueil</span>
        </button>
        <button 
          className={`sidebar-menu-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleTabChange('search')}
        >
          <Search size={20} />
          <span>Rechercher</span>
        </button>
        <button 
          className={`sidebar-menu-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => handleTabChange('library')}
        >
          <Library size={20} />
          <span>Bibliothèque</span>
        </button>
        <button 
          className={`sidebar-menu-item ${activeTab === 'premium' ? 'active' : ''}`}
          onClick={() => handleTabChange('premium')}
        >
          <Sparkles size={20} />
          <span>Premium</span>
        </button>
        <button 
          className={`sidebar-menu-item ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => handleTabChange('account')}
        >
          <User size={20} />
          <span>{user ? user.displayName : 'Compte'}</span>
        </button>
        <button 
          className="sidebar-menu-item"
          onClick={() => {
            if (window.electronAPI?.openExternalLink) {
              window.electronAPI.openExternalLink('https://pandofy.app');
            } else if (window.electronAPI?.openWebsite) {
              window.electronAPI.openWebsite();
            } else {
              window.open('https://pandofy.app', '_blank');
            }
          }}
          title="Consulter le site officiel"
        >
          <Globe size={20} style={{ color: 'var(--color-primary)' }} />
          <span>Site Officiel</span>
        </button>
      </div>

      <div className="sidebar-divider"></div>

      {/* Action buttons */}
      <div className="sidebar-menu-section" style={{ marginBottom: 16 }}>
        <button className="sidebar-menu-item" onClick={handleCreatePlaylist}>
          <Plus size={20} />
          <span>Créer une playlist</span>
        </button>
        
        {/* Only show upload button to artists and developers */}
        {user && (user.role === 'artist' || user.role === 'developer' || user.role === 'admin' || user.username === 'cdeveloppeur') && (
          <button className="sidebar-menu-item" onClick={handlePublishClick} style={{ color: 'var(--color-primary)' }}>
            <Upload size={20} />
            <span>Publier un son</span>
          </button>
        )}
      </div>

      <div className="sidebar-divider"></div>

      {/* Playlists and Likes */}
      <div className="playlists-container">
        <div className="playlists-list-title">
          <span>Vos Playlists</span>
        </div>

        {/* Liked Songs Item */}
        <div 
          className={`playlist-sidebar-item ${activePlaylistId === 'liked' ? 'active' : ''}`}
          onClick={() => handlePlaylistClick('liked')}
        >
          <div className="playlist-sidebar-img" style={{
            background: 'linear-gradient(135deg, #7209b7 0%, #f72585 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Heart size={16} fill="#fff" color="#fff" />
          </div>
          <div className="playlist-sidebar-info">
            <div className="playlist-sidebar-name">Titres Likés</div>
            <div className="playlist-sidebar-count">
              {user ? `${user.likedTracks.length} titres` : '0 titre'}
            </div>
          </div>
        </div>

        {/* User Playlists list */}
        {userPlaylists.map(playlist => {
          let coverUrl = playlist.coverUrl;
          if (playlist.coverBlob) {
            coverUrl = URL.createObjectURL(playlist.coverBlob);
          }
          return (
            <div 
              key={playlist.id}
              className={`playlist-sidebar-item ${activePlaylistId === playlist.id ? 'active' : ''}`}
              onClick={() => handlePlaylistClick(playlist.id)}
            >
              <img 
                src={coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=60"} 
                alt={playlist.name} 
                className="playlist-sidebar-img"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=60";
                }}
              />
              <div className="playlist-sidebar-info">
                <div className="playlist-sidebar-name">{playlist.name}</div>
                <div className="playlist-sidebar-count">
                  {playlist.trackIds.length} {playlist.trackIds.length > 1 ? 'titres' : 'titre'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
