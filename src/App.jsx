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
import UpdateModal from './components/UpdateModal';
import QueuePanel from './components/QueuePanel';
import MiniPlayer from './components/MiniPlayer';
import { User as UserIcon, LogIn, RotateCw, Search as SearchIcon, Music, X, Keyboard } from 'lucide-react';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { API_BASE } from './utils/api';

const API_URL = API_BASE;

// ─── Raccourcis clavier Modal ─────────────────────────────────────────────────
function ShortcutsModal({ onClose }) {
  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <span className="shortcuts-modal-title">⌨️ Raccourcis clavier</span>
          <button onClick={onClose} aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <table className="shortcuts-table">
          <tbody>
            {KEYBOARD_SHORTCUTS.map((s, i) => (
              <tr key={i}>
                <td>{s.keys.map((k, j) => <span key={j} className="shortcut-key">{k}</span>)}</td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const THEME_COLORS = [
  { name: 'Orange', value: '#FF6600' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Or', value: '#F59E0B' },
];

function ThemePicker({ onClose }) {
  const currentTheme = localStorage.getItem('pandofy_theme_color') || '#FF6600';
  const applyTheme = (color) => {
    localStorage.setItem('pandofy_theme_color', color);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', color + 'CC');
    document.documentElement.style.setProperty('--color-primary-glow', color + '66');
    onClose?.();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <h2 className="modal-title">🎨 Thème de couleur</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
          Choisissez la couleur principale de l'interface
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {THEME_COLORS.map(tc => (
            <button key={tc.value} onClick={() => applyTheme(tc.value)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 8px', borderRadius: 12, border: `2px solid ${currentTheme === tc.value ? tc.value : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: tc.value, boxShadow: `0 0 12px ${tc.value}66` }} />
              <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}>{tc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
function AppContent() {
  const {
    user, setShowAuthModal, activeTab, setActiveTab,
    activePlaylistId, toastMessage, refreshData,
    playTrack, tracks, currentTrack, isPlaying,
    togglePlay, nextTrack, prevTrack, setVolume,
    setMuted, muted, toggleLike,
  } = useContext(AppContext);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], users: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Apply saved theme on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('pandofy_theme_color');
    if (savedColor && savedColor !== '#FF6600') {
      document.documentElement.style.setProperty('--color-primary', savedColor);
      document.documentElement.style.setProperty('--color-primary-hover', savedColor + 'CC');
      document.documentElement.style.setProperty('--color-primary-glow', savedColor + '66');
    }
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await refreshData();
    setTimeout(() => setIsSyncing(false), 800);
  };

  const focusSearch = useCallback(() => searchInputRef.current?.focus(), []);

  useKeyboardShortcuts({ togglePlay, nextTrack, prevTrack, setVolume, setMuted, muted, toggleLike, currentTrack, focusSearch });

  // Debounced global search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setSearchResults({ tracks: [], users: [] }); setShowDropdown(false); return; }
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
      } catch (e) { console.error('Search error:', e); }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    const handleKeyDown = (e) => { if (e.key === 'Escape') { setShowDropdown(false); setShowShortcuts(false); } };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleKeyDown); };
  }, []);

  const handleSearchTrackClick = (track) => { playTrack(track, searchResults.tracks); setSearchQuery(''); setShowDropdown(false); };
  const handleSearchUserClick = () => { setActiveTab('account'); setSearchQuery(''); setShowDropdown(false); };

  const getHeaderTitle = () => {
    if (activePlaylistId) return activePlaylistId === 'liked' ? 'Titres Likés' : 'Playlist';
    switch (activeTab) {
      case 'home': return 'Accueil'; case 'search': return 'Rechercher';
      case 'library': return 'Bibliothèque'; case 'premium': return 'Espace Premium';
      case 'account': return 'Mon Compte'; default: return 'Pandofy';
    }
  };

  const formatBadge = (format) => {
    if (!format) return null;
    const colors = { FLAC: '#FF8800', WAV: '#2196F3', OGG: '#9C27B0', M4A: '#4CAF50', MP3: '#888', YouTube: '#FF0000' };
    return <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: (colors[format] || '#888') + '22', color: colors[format] || '#888', border: `1px solid ${(colors[format] || '#888')}44` }}>{format}</span>;
  };

  const appStyle = user?.profileColor ? {
    '--color-primary': user.profileColor,
    '--color-primary-hover': user.profileColor + 'CC',
    '--color-primary-glow': user.profileColor + '66'
  } : {};

  return (
    <div className="app-container" style={appStyle}>
      <IntroSplash />

      {/* Toast notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: 'rgba(30,30,30,0.95)', border: '1px solid var(--color-primary)', borderRadius: 12, padding: '12px 20px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toastMessage}
        </div>
      )}

      <Sidebar />

      <main className="main-content">
        <header className="main-header">
          <h2 className="main-view-title">{getHeaderTitle()}</h2>
          <div className="header-actions">

            {/* Global Search */}
            <div className="header-search-wrapper" ref={searchRef}>
              <div className="header-search-bar">
                <SearchIcon size={15} className="header-search-icon" />
                <input id="global-search-input" ref={searchInputRef} type="text"
                  placeholder="Rechercher... (Ctrl+F)" className="header-search-input"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.tracks.length > 0 && setShowDropdown(true)}
                  autoComplete="off" />
                {searchQuery && (
                  <button className="header-search-clear" onClick={() => { setSearchQuery(''); setShowDropdown(false); }} title="Effacer">
                    <X size={13} />
                  </button>
                )}
              </div>
              {showDropdown && (searchResults.tracks.length > 0 || searchResults.users.length > 0) && (
                <div className="search-dropdown">
                  {searchResults.tracks.length > 0 && (
                    <div className="search-dropdown-section">
                      <div className="search-dropdown-label">Morceaux</div>
                      {searchResults.tracks.map(track => (
                        <div key={track.id} className="search-dropdown-item" onClick={() => handleSearchTrackClick(track)}>
                          <img src={track.coverUrl} alt="" className="search-dropdown-cover" loading="lazy"
                            onError={e => e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&auto=format&fit=crop&q=60'} />
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
                        <div key={u.username} className="search-dropdown-item" onClick={() => handleSearchUserClick(u.username)}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, backgroundColor: u.profileColor || 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: '#000' }}>
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
                <div className="search-dropdown" style={{ padding: 12, textAlign: 'center', color: 'var(--color-text-muted)' }}>Recherche...</div>
              )}
            </div>

            {/* Theme color picker button */}
            <button onClick={() => setShowThemePicker(true)} title="Changer le thème"
              style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-primary)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '1rem' }}>
              🎨
            </button>

            {/* Keyboard shortcuts */}
            <button onClick={() => setShowShortcuts(true)} title="Raccourcis clavier"
              style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Keyboard size={15} />
            </button>

            {/* Sync */}
            <button className={`btn-sync ${isSyncing ? 'spinning' : ''}`} onClick={handleSync} title="Actualiser">
              <RotateCw size={18} />
            </button>

            {/* User / Login */}
            {user ? (
              <div className="user-badge" onClick={() => setActiveTab('account')} style={user.profileColor ? { borderColor: user.profileColor } : {}}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: user.profileColor || 'var(--color-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <span>{user.displayName}</span>
              </div>
            ) : (
              <button className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => setShowAuthModal(true)}>
                <LogIn size={16} /> Se connecter
              </button>
            )}

            {/* Window controls (Electron) */}
            {window.electronAPI && (
              <div className="window-controls">
                <button className="win-btn win-minimize" onClick={() => window.electronAPI.minimize()} title="Réduire" />
                <button className="win-btn win-fullscreen" onClick={() => window.electronAPI.toggleFullscreen()} title="Plein écran" />
                <button className="win-btn win-close" onClick={() => window.electronAPI.close()} title="Fermer" />
              </div>
            )}
          </div>
        </header>

        <Views />
      </main>

      <Player onToggleQueue={() => setShowQueue(q => !q)} showQueue={showQueue} />
      <QueuePanel isOpen={showQueue} onClose={() => setShowQueue(false)} />
      <MiniPlayer visible={false} onExpand={() => {}} />

      {/* ─── Modals ─── */}
      <UploadModal />
      <AuthModal />
      <PlaylistModal />
      <SupportModal />
      <UpdateModal />

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
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
