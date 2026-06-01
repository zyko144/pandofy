import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import IntroSplash from './components/IntroSplash';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Views from './components/Views';
import UploadModal from './components/UploadModal';
import AuthModal from './components/AuthModal';
import PlaylistModal from './components/PlaylistModal';
import SupportModal from './components/SupportModal';
<SupportModal />
import UpdateModal from './components/UpdateModal';
import QueuePanel from './components/QueuePanel';
import MiniPlayer from './components/MiniPlayer';
import { User as UserIcon, LogIn, RotateCw, Search as SearchIcon, Music, X, Keyboard } from 'lucide-react';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { API_BASE } from './utils/api'

const AP_URL = API_BASE;

// ─── Modal Raccourcis clavier ─────────────────────────────────────────────────
function ShortcutsModal({ onClose }) {
  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <span className="shortcuts-modal-title">⌨️ Raccourcis clavier</span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <table className="shortcuts-table">
          <tbody>
            {KEYBOARD_SHORTCUTS.map((s, i) => (
              <tr key={i}>
                <td>
                  {s.keys.map((k, j) => (
                    <span key={j} className="shortcut-key">{k}</span>
                  ))}
                </td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
function AppContent() {
  const {
    user,
    setShowAuthModal,
    activeTab,
    setActiveTab,
    activePlaylistId,
    toastMessage,
    refreshData,
    playTrack,
    tracks,
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    setMuted,
    muted,
    toggleLike,
  } = useContext(AppContext);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], users: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // MiniPlayer: show when a track is playing and NOT on the main player area
  // For simplicity, we show MiniPlayer only in views that don't have the full player visible
  // (the full bottom player is always visible, so mini player is hidden by default)
  // Actually we hide MiniPlayer — the bottom player serves the same purpose.
  // Keep it available but only show in specific tab contexts if needed.
  const showMiniPlayer = false; // Can be enabled per tab if needed

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await refreshData();
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Focus search shortcut handler
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    setMuted,
    muted,
    toggleLike,
    currentTrack,
    focusSearch,
  });

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults({ tracks: [], users: [] });
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [tracksRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/tracks/search?q=${encodeURIComponent(searchQuery)}`),
          fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        ]);
        const tracksData = tracksRes.ok ? await tracksRes.json() : [];
        const usersData = usersRes.ok ? await usersRes.json() : [];
        setSearchResults({ tracks: tracksData.slice(0, 5), users: usersData.slice(0, 3) });
        setShowDropdown(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setShowShortcuts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchTrackClick = (track) => {
    playTrack(track, searchResults.tracks);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchUserClick = (username) => {
    setActiveTab('account');
    setSearchQuery('');
    setShowDropdown(false);
  };

  const getHeaderTitle = () => {
    if (activePlaylistId) {
      return activePlaylistId === 'liked' ? 'Titres Likés' : 'Playlist';
    }
    switch (activeTab) {
      case 'home': return 'Accueil';
      case 'search': return 'Rechercher';
      case 'library': return 'Bibliothèque';
      case 'premium': return 'Espace Premium';
      case 'account': return 'Mon Compte';
      default: return 'Pandofy';
    }
  };

  // Generate dynamic profile color style overrides
  const getCustomThemeInlineStyle = () => {
    if (user && user.profileColor) {
      return {
        '--color-primary': user.profileColor,
        '--color-primary-hover': user.profileColor + 'CC',
        '--color-primary-glow': user.profileColor + '66'
      };
    }
    return {};
  };

  const formatBadge = (format) => {
    if (!format) return null;
    const colors = { FLAC: '#FF8800', WAV: '#2196F3', OGG: '#9C27B0', M4A: '#4CAF50', MP3: '#888' };
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4,
        backgroundColor: colors[format] || '#888', color: '#fff', letterSpacing: '0.05em',
        flexShrink: 0
      }}>
        {format}
      </span>
    );
  };

  return (
    <div className="app-container" style={getCustomThemeInlineStyle()}>
      {/* Intro Animation Screen */}
      <IntroSplash />

      {/* Floating Incoming simulated e-mail toast alert */}
      {toastMessage && (
        <div className="email-toast">
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            animation: 'glowPulse 1s infinite alternate'
          }}></div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Central Content Area */}
      <main className="main-content">
        <header className="main-header">
          <h2 className="main-view-title">{getHeaderTitle()}</h2>

          <div className="header-actions">
            {/* Global Search Bar */}
            <div className="header-search-wrapper" ref={searchRef}>
              <div className="header-search-bar">
                <SearchIcon size={15} className="header-search-icon" />
                <input
                  id="global-search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Rechercher... (Ctrl+F)"
                  className="header-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.tracks.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    className="header-search-clear"
                    onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                    title="Effacer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {showDropdown && (searchResults.tracks.length > 0 || searchResults.users.length > 0) && (
                <div className="search-dropdown">
                  {searchResults.tracks.length > 0 && (
                    <div className="search-dropdown-section">
                      <div className="search-dropdown-label">Morceaux</div>
                      {searchResults.tracks.map(track => (
                        <div
                          key={track.id}
                          className="search-dropdown-item"
                          onClick={() => handleSearchTrackClick(track)}
                        >
                          <img
                            src={track.coverUrl}
                            alt=""
                            className="search-dropdown-cover"
                            onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&auto=format&fit=crop&q=60'}
                          />
                          <div className="search-dropdown-meta">
                            <div className="search-dropdown-title">{track.title}</div>
                            <div className="search-dropdown-artist">{track.artistName}</div>
                          </div>
                          {track.format && formatBadge(track.format)}
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.users.length > 0 && (
                    <div className="search-dropdown-section">
                      <div className="search-dropdown-label">Artistes</div>
                      {searchResults.users.map(u => (
                        <div
                          key={u.username}
                          className="search-dropdown-item"
                          onClick={() => handleSearchUserClick(u.username)}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: u.profileColor || 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '1rem', color: '#000'
                          }}>
                            {(u.displayName || u.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="search-dropdown-meta">
                            <div className="search-dropdown-title">{u.displayName || u.username}</div>
                            <div className="search-dropdown-artist">@{u.username} · {u.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showDropdown && isSearching && (
                <div className="search-dropdown" style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Recherche en cours...
                </div>
              )}
            </div>

            {/* Raccourcis clavier button */}
            <button
              onClick={() => setShowShortcuts(true)}
              title="Raccourcis clavier"
              aria-label="Voir les raccourcis clavier"
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)', borderRadius: 8,
                padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-main)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              <Keyboard size={15} />
            </button>

            {/* Sync / Refresh Button */}
            <button
              className={`btn-sync ${isSyncing ? 'spinning' : ''}`}
              onClick={handleSync}
              title="Actualiser les données"
              aria-label="Actualiser les données"
            >
              <RotateCw size={18} />
            </button>

            {/* User Profile Badge or Login Button */}
            {user ? (
              <div
                className="user-badge"
                onClick={() => setActiveTab('account')}
                style={user.profileColor ? { borderColor: user.profileColor } : {}}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: user.profileColor || 'var(--color-primary)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <span>{user.displayName}</span>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                onClick={() => setShowAuthModal(true)}
              >
                <LogIn size={16} />
                Se connecter
              </button>
            )}

            {/* Window Controls (Electron only) */}
            {window.electronAPI && (
              <div className="window-controls">
                <button
                  className="win-btn win-minimize"
                  onClick={() => window.electronAPI.minimize()}
                  title="Réduire"
                  aria-label="Réduire"
                />
                <button
                  className="win-btn win-fullscreen"
                  onClick={() => window.electronAPI.toggleFullscreen()}
                  title="Plein écran"
                  aria-label="Plein écran"
                />
                <button
                  className="win-btn win-close"
                  onClick={() => window.electronAPI.close()}
                  title="Fermer"
                  aria-label="Fermer"
                />
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Views wrapper */}
        <Views />
      </main>

      {/* Bottom Audio Player controls */}
      <Player onToggleQueue={() => setShowQueue(q => !q)} showQueue={showQueue} />

      {/* Queue Panel (slide-in from right) */}
      <QueuePanel isOpen={showQueue} onClose={() => setShowQueue(false)} />

      {/* Mini Player (when track is active and user scrolls away) */}
      <MiniPlayer
        visible={showMiniPlayer && !!currentTrack}
        onExpand={() => {/* no-op: full player is always visible */}}
      />

      {/* Overlays / Modals */}
      <UploadModal />
      <AuthModal />
      <PlaylistModal />
      <UpdateModal />

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
