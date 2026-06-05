import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Play, 
  Pause, 
  Search as SearchIcon, 
  Heart, 
  Music, 
  Sparkles, 
  User as UserIcon, 
  Plus, 
  Trash,
  LogOut,
  FolderHeart,
  Palette,
  Edit2,
  Mail,
  MailOpen,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Compass,
  TrendingUp,
  History,
  Settings
} from 'lucide-react';

export default function Views() {
  const { activeTab } = useContext(AppContext);

  switch (activeTab) {
    case 'home':
      return <HomeView />;
    case 'search':
      return <SearchView />;
    case 'library':
      return <LibraryView />;
    case 'premium':
      return <PremiumView />;
    case 'account':
      return <AccountView />;
    case 'playlist':
      return <PlaylistDetailView />;
    case 'discover':
      return <DiscoverView />;
    case 'trends':
      return <TrendsView />;
    case 'history':
      return <HistoryView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <HomeView />;
  }
}

// Helper to format Time
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// -------------------------------------------------------------
// HOME VIEW
// -------------------------------------------------------------
function HomeView() {
  const { tracks, playTrack, currentTrack, isPlaying, togglePlay, user, deleteTrack, formatDuration, loadMoreTracks } = useContext(AppContext);
  const [greeting, setGreeting] = useState('Bonjour');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);

  const getFormatBadge = (format) => {
    if (!format) return null;
    const cls = format.toLowerCase();
    return <span className={`format-badge ${cls}`}>{format}</span>;
  };

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true);
        const more = await loadMoreTracks(tracks.length);
        setHasMore(more);
        setLoadingMore(false);
      }
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [tracks.length, hasMore, loadingMore]);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('Bon matin');
    else if (hours < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
  }, []);

  const handleTrackCardPlay = (track, e) => {
    e.stopPropagation();
    if (currentTrack && currentTrack.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  return (
    <>
    <div className="scrollable">
      <div className="home-hero">
        <div className="home-hero-content">
          <span className="account-role-badge" style={{ marginBottom: 12 }}>Serveur Communautaire Pandofy</span>
          <h1>{greeting}{user ? `, ${user.displayName}` : ''} !</h1>
          <p>
            Écoutez les morceaux partagés par les artistes de notre serveur en temps réel. Créez des playlists, personnalisez votre profil, abonnez-vous pour du son 320 kbps haute fidélité, ou téléversez vos propres créations !
          </p>
        </div>
      </div>

      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Flux Musical (Sons partagés)</h2>
        </div>
        
        <div className="perspective-container grid-cards">
          {tracks.map(track => {
            const isCurrent = currentTrack && currentTrack.id === track.id;
            return (
              <div 
                key={track.id} 
                className="music-card" 
                onClick={() => playTrack(track, tracks)}
              >
                <div className="music-card-cover-wrapper">
                  <img 
                    src={track.coverUrl} 
                    alt={track.title} 
                    className="music-card-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60";
                    }}
                  />
                  <button 
                    className="card-play-btn" 
                    onClick={(e) => handleTrackCardPlay(track, e)}
                  >
                    {isCurrent && isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" />}
                  </button>
                </div>
                <div className="music-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {getFormatBadge(track.format)}
                    {user && (user.username === 'cdeveloppeur' || user.role === 'developer' || user.role === 'admin' || user.username === track.artistId) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: track.id, title: track.title }); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4400', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Supprimer mon son"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="music-card-artist">{track.artistName}</div>
                  {track.duration > 0 && <span className="track-duration">{formatDuration(track.duration)}</span>}
                </div>
              </div>
            );
          })}
          {tracks.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <Music className="empty-state-icon" size={48} />
              <p>Le serveur n'a pas encore de sons publiés. Lancez le bal en créant un compte Artiste !</p>
            </div>
          )}
        </div>

        {/* Infinite scroll loader */}
        <div ref={loaderRef} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {loadingMore && <span>Chargement...</span>}
          {!hasMore && tracks.length > 0 && <span style={{ opacity: 0.4 }}>— Fin de la bibliothèque —</span>}
        </div>
      </div>
    </div>

    {/* Modal confirmation suppression */}
    {confirmDelete && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#1A1A1A', border: '1px solid rgba(255,68,0,0.3)', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
          <h3 style={{ color: '#fff', marginBottom: 8, fontFamily: 'var(--font-display)' }}>Supprimer ce son ?</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>"{confirmDelete.title}" sera supprimé définitivement pour tous les utilisateurs.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 24px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
            <button onClick={() => { deleteTrack(confirmDelete.id); setConfirmDelete(null); }} style={{ padding: '10px 24px', borderRadius: 9999, border: 'none', background: '#FF4400', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Supprimer</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// -------------------------------------------------------------
// SEARCH VIEW
// -------------------------------------------------------------
function SearchView() {
  const { tracks, playTrack, currentTrack, isPlaying, togglePlay, toggleLike, user, deleteTrack, formatDuration } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTracks([]);
    } else {
      const q = searchQuery.toLowerCase().trim();
      const results = tracks.filter(
        t => t.title.toLowerCase().includes(q) || t.artistName.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q)
      );
      setFilteredTracks(results);
    }
  }, [searchQuery, tracks]);

  const handleTrackCardPlay = (track, e) => {
    e.stopPropagation();
    if (currentTrack && currentTrack.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, filteredTracks.length > 0 ? filteredTracks : tracks);
    }
  };

  const defaultGenres = [
    { name: 'Lo-Fi', color: '#8A2BE2', decor: '☕' },
    { name: 'Synthwave', color: '#FF007F', decor: '🌇' },
    { name: 'Cyberpunk', color: '#00F0FF', decor: '🧬' },
    { name: 'Electro House', color: '#FF6600', decor: '🎧' },
    { name: 'Pop', color: '#FF3366', decor: '🌟' },
    { name: 'Hip-Hop', color: '#FFCC00', decor: '🎤' }
  ];

  return (
    <>
    <div className="scrollable search-container">
      <div className="search-bar-wrapper">
        <SearchIcon className="search-icon-inside" size={20} />
        <input 
          type="text" 
          placeholder="Artistes, titres ou genres..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchQuery.trim() === '' ? (
        <>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Parcourir tout</h2>
          <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {defaultGenres.map((genre, idx) => (
              <div 
                key={idx} 
                className="search-genre-card" 
                style={{ backgroundColor: genre.color }}
                onClick={() => setSearchQuery(genre.name)}
              >
                <div className="search-genre-name">{genre.name}</div>
                <div className="search-genre-decor">{genre.decor}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Résultats de la recherche</h2>
          <div className="track-list-table">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrack && currentTrack.id === track.id;
              return (
                <div 
                  key={track.id}
                  className={`track-row ${isCurrent ? 'active' : ''}`}
                  onClick={() => playTrack(track, filteredTracks)}
                >
                  <div className="track-row-index">
                    {isCurrent && isPlaying ? (
                      <button style={{ color: 'var(--color-primary)' }} onClick={(e) => handleTrackCardPlay(track, e)}>
                        <Pause size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button onClick={(e) => handleTrackCardPlay(track, e)}>
                        <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
                      </button>
                    )}
                  </div>
                  <div className="track-row-title-col">
                    <img 
                      src={track.coverUrl} 
                      alt="" 
                      className="track-row-img" 
                      onError={(e) => e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60"}
                    />
                    <div className="track-row-meta">
                      <div className="track-row-title">{track.title}</div>
                      <div className="track-row-artist">{track.artistName}</div>
                    </div>
                  </div>
                  <div>{track.genre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {track.duration > 0 && <span className="track-duration">{formatDuration(track.duration)}</span>}
                    {track.format && <span className={`format-badge ${track.format.toLowerCase()}`}>{track.format}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <Heart 
                        size={14} 
                        fill={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'none'} 
                        color={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'currentColor'}
                        style={{ opacity: user && user.likedTracks.map(String).includes(String(track.id)) ? 1 : 0.6 }}
                      />
                    </button>
                    {user && (user.username === 'cdeveloppeur' || user.role === 'developer' || user.role === 'admin' || user.username === track.artistId) && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`Supprimer "${track.title}" ?`)) {
                            deleteTrack(track.id);
                          }
                        }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4400', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Supprimer mon son"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTracks.length === 0 && (
              <div className="empty-state">
                <SearchIcon className="empty-state-icon" size={48} />
                <p>Aucun titre ne correspond à votre recherche "{searchQuery}"</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {confirmDelete && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#1A1A1A', border: '1px solid rgba(255,68,0,0.3)', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
          <h3 style={{ color: '#fff', marginBottom: 8, fontFamily: 'var(--font-display)' }}>Supprimer ce son ?</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>"{confirmDelete.title}" sera supprimé définitivement.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 24px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
            <button onClick={() => { deleteTrack(confirmDelete.id); setConfirmDelete(null); }} style={{ padding: '10px 24px', borderRadius: 9999, border: 'none', background: '#FF4400', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Supprimer</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// -------------------------------------------------------------
// LIBRARY VIEW
// -------------------------------------------------------------
function LibraryView() {
  const { playlists, user, tracks, playTrack, setActivePlaylistId, setActiveTab } = useContext(AppContext);

  const userPlaylists = playlists.filter(p => !user || p.userId === user.username);
  const artistTracks = tracks.filter(t => user && t.artistId === user.username);

  const handlePlaylistClick = (id) => {
    setActivePlaylistId(id);
    setActiveTab('playlist');
  };

  return (
    <div className="scrollable" style={{ padding: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 24, fontSize: '2rem' }}>Votre Bibliothèque</h1>

      <h2 className="section-title" style={{ marginBottom: 16 }}>Playlists</h2>
      <div className="grid-cards" style={{ marginBottom: 40 }}>
        {/* Liked Songs Card */}
        <div className="music-card" onClick={() => handlePlaylistClick('liked')}>
          <div className="music-card-cover-wrapper" style={{
            background: 'linear-gradient(135deg, #7209b7 0%, #f72585 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FolderHeart size={48} color="#fff" />
          </div>
          <div className="music-card-title">Titres Likés</div>
          <div className="music-card-artist">
            {user ? `${user.likedTracks.length} titres` : '0 titre'}
          </div>
        </div>

        {/* User Playlists */}
        {userPlaylists.map(playlist => {
          return (
            <div key={playlist.id} className="music-card" onClick={() => handlePlaylistClick(playlist.id)}>
              <div className="music-card-cover-wrapper">
                <img 
                  src={playlist.coverUrl} 
                  alt={playlist.name} 
                  className="music-card-cover"
                  onError={(e) => e.target.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60"}
                />
              </div>
              <div className="music-card-title">{playlist.name}</div>
              <div className="music-card-artist">
                {playlist.trackIds.length} {playlist.trackIds.length > 1 ? 'titres' : 'titre'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Artist publications */}
      {user && user.role === 'artist' && (
        <>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Vos Publications</h2>
          <div className="grid-cards">
            {artistTracks.map(track => (
              <div key={track.id} className="music-card" onClick={() => playTrack(track, artistTracks)}>
                <div className="music-card-cover-wrapper">
                  <img 
                    src={track.coverUrl} 
                    alt={track.title} 
                    className="music-card-cover"
                    onError={(e) => e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60"}
                  />
                </div>
                <div className="music-card-title">{track.title}</div>
                <div className="music-card-artist">{track.genre}</div>
              </div>
            ))}
            {artistTracks.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <Music className="empty-state-icon" size={40} />
                <p>Vous n'avez pas encore publié de son. Cliquez sur "Publier un son" dans la barre latérale !</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PREMIUM VIEW (WITH SECURE CHECKOUT FORM SIMULATOR)
// -------------------------------------------------------------
function PremiumView() {
  const { 
    user, 
    setShowAuthModal, 
    showPaymentModal, 
    setShowPaymentModal, 
    selectedPlanForPayment, 
    setSelectedPlanForPayment,
    subscribeToPlan
  } = useContext(AppContext);

  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const plans = [
    {
      id: 'premium_student',
      title: 'Premium Étudiant',
      price: '4.90',
      period: 'mois',
      trial: '30 jours gratuits',
      bitrate: 'Qualité 256 kbps certifiée',
      features: [
        'Qualité supérieure (256kbps)',
        'Aucune coupure publicitaire',
        'Zapping illimité de pistes',
        'Écoute et stockage serveur local',
        'Validation tarif étudiant'
      ],
      color: 'rgba(255, 102, 0, 0.03)'
    },
    {
      id: 'premium_individual',
      title: 'Premium Personnel',
      price: '8.90',
      period: 'mois',
      trial: '30 jours gratuits',
      bitrate: 'Qualité 320 kbps Hi-Fi débloquée',
      features: [
        'Qualité Haute Fidélité (320kbps)',
        'Aucune coupure publicitaire',
        'Zapping illimité de pistes',
        'Visualisateur canvas synchronisé',
        'Redirection PayPal incluse'
      ],
      popular: true,
      color: 'linear-gradient(180deg, rgba(255,102,0,0.05) 0%, rgba(22,22,22,0.8) 100%)'
    },
    {
      id: 'premium_family',
      title: 'Premium Famille',
      price: '14.90',
      period: 'mois',
      trial: '30 jours gratuits',
      bitrate: 'Qualité 320 kbps Multi-Comptes',
      features: [
        'Qualité Haute Fidélité (320kbps)',
        'Aucune coupure publicitaire',
        'Zapping illimité de pistes',
        'Jusqu\'à 6 profils personnalisables',
        'Partage de musiques instantané'
      ],
      color: 'rgba(255, 102, 0, 0.03)'
    }
  ];

  const handleCheckoutClick = (plan) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedPlanForPayment(plan);
    setShowPaymentModal(true);
    // Reset form errors/success
    setErrorMsg('');
    setPaymentSuccess(false);
  };

  const handleSimulatePayPal = () => {
    if (!selectedPlanForPayment) return;
    setProcessing(true);
    
    // Trigger simulated checkout process with standard delay
    setTimeout(async () => {
      try {
        await subscribeToPlan(
          selectedPlanForPayment.id,
          selectedPlanForPayment.title,
          selectedPlanForPayment.price,
          null, // No card number since it's PayPal
          "PayPal account"
        );
        setPaymentSuccess(true);
        setProcessing(false);
        
        // Open Paypal link
        window.open('https://www.paypal.me/zyko921', '_blank');
        
        // Close modal
        setTimeout(() => {
          setShowPaymentModal(false);
        }, 2000);
      } catch (err) {
        setErrorMsg("Erreur lors de l'enregistrement de l'achat.");
        setProcessing(false);
      }
    }, 1500);
  };

  const handleFormCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder || !expiry || !cvc) {
      setErrorMsg("Tous les champs bancaires sont obligatoires.");
      return;
    }
    setErrorMsg('');
    setProcessing(true);

    setTimeout(async () => {
      try {
        await subscribeToPlan(
          selectedPlanForPayment.id,
          selectedPlanForPayment.title,
          selectedPlanForPayment.price,
          cardNumber,
          cardHolder
        );
        setPaymentSuccess(true);
        setProcessing(false);
        
        // Close payment modal
        setTimeout(() => {
          setShowPaymentModal(false);
        }, 2000);
      } catch (err) {
        setErrorMsg(err.message || "Erreur de connexion.");
        setProcessing(false);
      }
    }, 2000); // 2s simulated checkout processing
  };

  return (
    <div className="scrollable premium-container">
      <h1 className="premium-title">Profitez d'un son haute définition</h1>
      <p className="premium-subtitle">
        Passez au Premium. Débloquez un débit binaire allant jusqu'à **320 kbps** pour une qualité studio, sans publicités et avec sauts illimités. Essai gratuit de 30 jours !
      </p>

      <div className="perspective-container premium-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`premium-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="premium-card-badge">Populaire</div>}
            <h3 className="premium-card-title">{plan.title}</h3>
            <div className="premium-card-trial">{plan.trial}</div>
            
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--color-primary)',
              fontWeight: 700,
              marginBottom: 10,
              textTransform: 'uppercase'
            }}>
              {plan.bitrate}
            </div>

            <div className="premium-card-price">
              {plan.price}€<span>/{plan.period}</span>
            </div>
            
            <ul className="premium-features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <Sparkles size={16} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              className="btn-primary premium-btn"
              onClick={() => handleCheckoutClick(plan)}
            >
              Débutez l'essai gratuit
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 50, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Le support et les transactions bancaires sont chiffrés. Lien direct vers le créateur : Paypal zyko921.
      </div>

      {/* SECURE CHECKOUT MODAL OVERLAY */}
      {showPaymentModal && selectedPlanForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>✕</button>
            
            <h2 className="modal-title" style={{ marginBottom: 12 }}>Paiement Sécurisé</h2>
            <div style={{ textAlign: 'center', marginBottom: 24, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Souscription à : <span style={{ color: '#fff', fontWeight: 700 }}>{selectedPlanForPayment.title}</span> ({selectedPlanForPayment.price}€/mois)
            </div>

            {errorMsg && <div className="error-message">{errorMsg}</div>}
            {paymentSuccess && (
              <div className="error-message" style={{ backgroundColor: 'rgba(0,255,0,0.1)', borderColor: 'green', color: '#4DFF4D' }}>
                🎉 Paiement approuvé ! Activation en cours...
              </div>
            )}

            <form onSubmit={handleFormCheckoutSubmit}>
              <div className="modal-form-group">
                <label className="modal-label">Titulaire de la carte</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder="Jean Dupont"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required
                  />
                  <UserCheck size={18} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Numéro de carte</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder="4000 1234 5678 9010"
                    maxLength="19"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                  <CreditCard size={18} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="modal-form-group">
                  <label className="modal-label">Date d'expiration</label>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder="MM/AA"
                    maxLength="5"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Code CVC</label>
                  <input 
                    type="password" 
                    className="modal-input" 
                    placeholder="123"
                    maxLength="3"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 20px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Passerelle chiffrée SSL de paiement 100% sécurisée.</span>
              </div>

              <button 
                type="submit" 
                className="btn-primary modal-submit-btn" 
                disabled={processing}
                style={{ opacity: processing ? 0.7 : 1 }}
              >
                {processing ? "Traitement bancaire..." : `Valider l'achat — ${selectedPlanForPayment.price}€`}
              </button>
            </form>

            <div style={{ margin: '16px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>— OU —</div>

            <button 
              className="btn-secondary" 
              onClick={handleSimulatePayPal}
              disabled={processing}
              style={{ width: '100%', borderColor: '#FFCC00', color: '#FFCC00', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Procéder via PayPal <span style={{ fontWeight: 800 }}>zyko921</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// ACCOUNT VIEW (WITH INBOX SIMULATED TAB & PROFILE PERSONALIZATION)
// -------------------------------------------------------------
function AccountView() {
  const { 
    user, 
    handleLogout, 
    tracks, 
    playlists, 
    updateProfile,
    markMessagesAsRead
  } = useContext(AppContext);
  
  const [activeAccountSubTab, setActiveAccountSubTab] = useState('profile'); // profile, customize, inbox

  // Profile Edit fields
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState('#FF6600');

  // Load user data into inputs when customizer opens
  useEffect(() => {
    if (user) {
      setEditDisplayName(user.displayName || '');
      setEditBio(user.bio || '');
      setEditColor(user.profileColor || '#FF6600');
    }
  }, [user, activeAccountSubTab]);

  const countLikes = user ? user.likedTracks.length : 0;
  const countPlaylists = playlists.filter(p => user && p.userId === user.username).length;
  const countUploads = tracks.filter(t => user && t.artistId === user.username).length;

  const countUnreadEmails = user && user.messages ? user.messages.filter(m => !m.read).length : 0;

  const handleProfileCustomizeSave = async (e) => {
    e.preventDefault();
    await updateProfile(editDisplayName, editBio, editColor);
    setActiveAccountSubTab('profile');
  };

  const handleInboxTabClick = async () => {
    setActiveAccountSubTab('inbox');
    // Mark inbox messages as read when opening
    await markMessagesAsRead();
  };

  const getPlanName = (status) => {
    if (!status) return 'Gratuit';
    if (status.startsWith('pending_')) {
      return "Validation en cours...";
    }
    switch (status) {
      case 'premium_student': return 'Premium Étudiant (256 kbps)';
      case 'premium_individual': return 'Premium Personnel (320 kbps Hi-Fi)';
      case 'premium_family': return 'Premium Famille (320 kbps Hi-Fi)';
      default: return 'Gratuit (128 kbps)';
    }
  };

  const getCustomSkinStyle = () => {
    if (user && user.profileColor) {
      return { borderTopColor: user.profileColor };
    }
    return { borderTopColor: 'var(--color-primary)' };
  };

  const getAvatarStyle = () => {
    if (user && user.profileColor) {
      return { backgroundColor: user.profileColor };
    }
    return { backgroundColor: 'var(--color-primary)' };
  };

  if (!user) {
    return (
      <div className="scrollable account-container">
        <div className="account-card" style={{ maxWidth: '460px', margin: '80px auto' }}>
          <h2 className="modal-title">Connectez-vous pour gérer votre espace</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 20 }}>
            La connexion vous permet de personnaliser votre profil, consulter votre boîte de réception et publier vos créations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollable account-container">
      {/* Account Sub-Tabs navigation */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
        <button 
          className={`sidebar-menu-item ${activeAccountSubTab === 'profile' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => setActiveAccountSubTab('profile')}
        >
          <UserIcon size={16} />
          Profil
        </button>
        <button 
          className={`sidebar-menu-item ${activeAccountSubTab === 'customize' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => setActiveAccountSubTab('customize')}
        >
          <Palette size={16} />
          Personnaliser
        </button>
        <button 
          className={`sidebar-menu-item ${activeAccountSubTab === 'inbox' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px', position: 'relative' }}
          onClick={handleInboxTabClick}
        >
          <Mail size={16} />
          Boîte mail
          {countUnreadEmails > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -6,
              background: '#FF0000',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 900,
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {countUnreadEmails}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: PROFILE DETAILS */}
      {activeAccountSubTab === 'profile' && (
        <div className="account-card" style={getCustomSkinStyle()}>
          <div className="profile-card-glow" style={{ backgroundColor: user.profileColor || 'var(--color-primary)' }}></div>
          <div className="account-profile-header">
            <div className="account-avatar-large" style={getAvatarStyle()}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="account-info-details">
              <h2>{user.displayName}</h2>
              <div className="account-bio">"{user.bio || 'Aucune description disponible.'}"</div>
              
              <div style={{ marginTop: 14 }}>
                <span className="account-role-badge" style={{ backgroundColor: user.profileColor || 'var(--color-primary)' }}>
                  {user.role === 'artist' ? 'Artiste' : 'Auditeur'}
                </span>
                <span className={`account-premium-badge ${user.premiumStatus !== 'none' ? 'active' : ''}`} style={user.premiumStatus !== 'none' ? { borderColor: user.profileColor, color: user.profileColor } : {}}>
                  {getPlanName(user.premiumStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="account-stats">
            <div>
              <div className="account-stat-val" style={{ color: user.profileColor || 'var(--color-primary)' }}>{countPlaylists}</div>
              <div className="account-stat-lbl">Playlists</div>
            </div>
            <div>
              <div className="account-stat-val" style={{ color: user.profileColor || 'var(--color-primary)' }}>{countLikes}</div>
              <div className="account-stat-lbl">Titres Likés</div>
            </div>
            <div>
              <div className="account-stat-val" style={{ color: user.profileColor || 'var(--color-primary)' }}>
                {user.role === 'artist' ? countUploads : 'N/A'}
              </div>
              <div className="account-stat-lbl">Morceaux</div>
            </div>
          </div>

          <button 
            className="btn-secondary" 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, borderColor: '#ff4d4d', color: '#ff4d4d' }}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      )}

      {/* TAB CONTENT: PROFILE CUSTOMIZER */}
      {activeAccountSubTab === 'customize' && (
        <div className="account-card" style={getCustomSkinStyle()}>
          <div className="profile-card-glow" style={{ backgroundColor: user.profileColor || 'var(--color-primary)' }}></div>
          <h3 className="section-title" style={{ marginBottom: 20 }}>Personnaliser mon Espace</h3>
          
          <form onSubmit={handleProfileCustomizeSave}>
            <div className="modal-form-group">
              <label className="modal-label">Pseudo public</label>
              <input 
                type="text" 
                className="modal-input"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Ex: ZYKO921"
                required
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Description / Bio</label>
              <textarea 
                className="modal-input"
                style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Décrivez votre univers musical..."
              />
            </div>

            <div className="modal-form-group" style={{ marginBottom: 28 }}>
              <label className="modal-label">Couleur de profil favorite</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input 
                  type="color" 
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'none',
                    width: '50px',
                    height: '40px',
                    cursor: 'pointer'
                  }}
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Cette couleur décorera votre avatar public, vos boutons et vos badges de compte.
                </span>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={editColor ? { backgroundColor: editColor } : {}}>
              Enregistrer les modifications
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: SIMULATED INBOX SIMULATOR */}
      {activeAccountSubTab === 'inbox' && (
        <div className="account-card" style={getCustomSkinStyle()}>
          <div className="profile-card-glow" style={{ backgroundColor: user.profileColor || 'var(--color-primary)' }}></div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Boîte mail sécurisée Pandofy</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
            Lisez vos reçus de paiement chiffrés et vos messages de bienvenue reçus du serveur.
          </p>

          <div className="inbox-list">
            {user.messages && user.messages.length > 0 ? (
              user.messages.map((msg) => (
                <div key={msg.id} className={`inbox-item ${!msg.read ? 'unread' : ''}`} style={!msg.read ? { borderLeftColor: user.profileColor } : {}}>
                  <div className="inbox-item-header">
                    <span className="inbox-sender" style={{ color: user.profileColor || 'var(--color-primary)' }}>
                      {msg.sender}
                    </span>
                    <span className="inbox-date">
                      {new Date(msg.date).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="inbox-subject">{msg.subject}</div>
                  <div className="inbox-body-preview">{msg.body}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <MailOpen className="empty-state-icon" size={48} />
                <p>Votre boîte de réception est vide pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PLAYLIST DETAIL VIEW
// -------------------------------------------------------------
function PlaylistDetailView() {
  const { 
    activePlaylistId, 
    playlists, 
    tracks, 
    user, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    toggleLike,
    deleteTrack,
    formatDuration
  } = useContext(AppContext);

  const [playlist, setPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);

  useEffect(() => {
    if (activePlaylistId === 'liked') {
      const likedTrackIds = user ? user.likedTracks.map(String) : [];
      const matched = tracks.filter(t => likedTrackIds.includes(String(t.id)));
      
      setPlaylist({
        name: "Titres Likés",
        description: "Tous vos titres coups de cœur",
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60",
        isLikedList: true
      });
      setPlaylistTracks(matched);
    } else {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) {
        setPlaylist(pl);
        const matched = pl.trackIds.map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
        setPlaylistTracks(matched);
      }
    }
  }, [activePlaylistId, playlists, tracks, user]);

  if (!playlist) {
    return (
      <div className="scrollable empty-state">
        <Music size={48} className="empty-state-icon" />
        <p>Playlist introuvable.</p>
      </div>
    );
  }

  const handlePlayPlaylist = () => {
    if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks);
    }
  };

  return (
    <div className="scrollable">
      <div className="playlist-detail-header">
        {playlist.isLikedList ? (
          <div className="playlist-detail-cover" style={{
            background: 'linear-gradient(135deg, #7209b7 0%, #f72585 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Heart size={64} fill="#fff" color="#fff" />
          </div>
        ) : (
          <img 
            src={playlist.coverUrl} 
            alt={playlist.name} 
            className="playlist-detail-cover"
            onError={(e) => e.target.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60"}
          />
        )}
        <div className="playlist-detail-info">
          <div className="playlist-detail-type">Playlist</div>
          <h1 className="playlist-detail-name">{playlist.name}</h1>
          <div className="playlist-detail-meta">
            {playlist.isLikedList ? (
              <>Créée pour <span>{user ? user.displayName : 'Auditeur'}</span> • {playlistTracks.length} {playlistTracks.length > 1 ? 'titres' : 'titre'}</>
            ) : (
              <>Créée par <span>{playlist.userId}</span> • {playlistTracks.length} {playlistTracks.length > 1 ? 'titres' : 'titre'}</>
            )}
          </div>
        </div>
      </div>

      <div className="playlist-detail-actions">
        {playlistTracks.length > 0 && (
          <button className="playlist-play-btn" onClick={handlePlayPlaylist} title="Tout jouer">
            <Play size={24} fill="#000" color="#000" style={{ transform: 'translateX(1.5px)' }} />
          </button>
        )}
      </div>

      <div className="section-container" style={{ paddingTop: 0 }}>
        {playlistTracks.length > 0 ? (
          <div className="track-list-table">
            <div className="track-row" style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'default' }}>
              <div className="track-row-index">#</div>
              <div>Titre</div>
              <div>Genre</div>
              <div>Date d'ajout</div>
              <div></div>
            </div>
            {playlistTracks.map((track, index) => {
              const isCurrent = currentTrack && currentTrack.id === track.id;
              return (
                <div 
                  key={track.id}
                  className={`track-row ${isCurrent ? 'active' : ''}`}
                  onClick={() => playTrack(track, playlistTracks)}
                >
                  <div className="track-row-index">
                    {isCurrent && isPlaying ? (
                      <span style={{ color: 'var(--color-primary)' }}><Pause size={14} fill="currentColor" /></span>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="track-row-title-col">
                    <img 
                      src={track.coverUrl} 
                      alt="" 
                      className="track-row-img" 
                      onError={(e) => e.target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60"}
                    />
                    <div className="track-row-meta">
                      <div className="track-row-title">{track.title}</div>
                      <div className="track-row-artist">{track.artistName}</div>
                    </div>
                  </div>
                  <div>{track.genre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {track.duration > 0 && <span className="track-duration">{formatDuration(track.duration)}</span>}
                    {track.format && <span className={`format-badge ${track.format.toLowerCase()}`}>{track.format}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <Heart 
                        size={14} 
                        fill={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'none'} 
                        color={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'currentColor'}
                      />
                    </button>
                    {user && (user.username === 'cdeveloppeur' || user.role === 'developer' || user.role === 'admin' || user.username === track.artistId) && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`Supprimer "${track.title}" ?`)) {
                            deleteTrack(track.id);
                          }
                        }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4400', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Supprimer mon son"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Music className="empty-state-icon" size={48} />
            <p>Cette playlist est encore vide. Ajoutez des titres depuis la page d'accueil ou de recherche !</p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEW DISCOVER VIEW
// -------------------------------------------------------------
function DiscoverView() {
  const { tracks, playTrack, currentTrack, isPlaying, togglePlay } = useContext(AppContext);
  
  const recommendedTracks = tracks.slice(0, 6);
  const newReleases = tracks.slice(6, 12);

  const handlePlayRecommended = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  return (
    <div className="scrollable view-container" style={{ padding: '24px 32px' }}>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900 }}>Découverte Musicale</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Des recommandations fraîches basées sur vos préférences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(255,102,0,0.15) 0%, rgba(204,68,255,0.15) 100%)', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Découvertes de la semaine</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', lineHeight: 1.4 }}>Une playlist personnalisée générée chaque lundi avec des pépites rien que pour vous.</p>
          </div>
          <button onClick={() => recommendedTracks[0] && playTrack(recommendedTracks[0], recommendedTracks)} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 16 }}>
            <Play size={16} fill="#000" /> Écouter
          </button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(30,144,255,0.15) 0%, rgba(0,250,154,0.15) 100%)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Radar des nouveautés</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', lineHeight: 1.4 }}>Ne manquez aucune sortie de vos artistes favoris sur notre serveur communautaire.</p>
          </div>
          <button onClick={() => newReleases[0] && playTrack(newReleases[0], newReleases)} className="btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 16 }}>
            <Sparkles size={16} /> Parcourir
          </button>
        </div>
      </div>

      <div className="section-container" style={{ marginBottom: 32 }}>
        <h3 className="section-title" style={{ marginBottom: 16 }}>Recommandé pour vous</h3>
        <div className="grid-cards">
          {recommendedTracks.map(track => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div key={track.id} className="music-card" onClick={() => playTrack(track, tracks)}>
                <div className="music-card-cover-wrapper">
                  <img src={track.coverUrl} alt="" className="music-card-cover" onError={e => e.target.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60'} />
                  <button className="card-play-btn" onClick={(e) => { e.stopPropagation(); handlePlayRecommended(track); }}>
                    {isCurrent && isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" />}
                  </button>
                </div>
                <div className="music-card-title">{track.title}</div>
                <div className="music-card-artist">{track.artistName}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEW TRENDS VIEW
// -------------------------------------------------------------
function TrendsView() {
  const { tracks, playTrack, currentTrack, isPlaying, togglePlay, user, toggleLike, deleteTrack } = useContext(AppContext);
  
  const trendingTracks = [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 15);

  const handlePlayTrending = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, trendingTracks);
    }
  };

  return (
    <div className="scrollable view-container" style={{ padding: '24px 32px' }}>
      <div className="home-hero" style={{ background: 'linear-gradient(135deg, rgba(255,102,0,0.18) 0%, rgba(7,7,7,0.8) 100%)', marginBottom: 24, padding: 32 }}>
        <span className="account-role-badge">Top Hits</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: 12 }}>Tendances Pandofy</h1>
        <p>Les morceaux les plus écoutés de la communauté Pandofy en ce moment.</p>
      </div>

      <div className="section-container">
        <div className="tracks-list-header" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 150px 100px 80px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <div>#</div>
          <div>TITRE</div>
          <div>GENRE</div>
          <div>ÉCOUTES</div>
          <div></div>
        </div>

        <div className="tracks-list" style={{ marginTop: 8 }}>
          {trendingTracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div 
                key={track.id} 
                className={`track-list-row ${isCurrent ? 'active' : ''}`}
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 150px 100px 80px', alignItems: 'center', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }}
                onClick={() => playTrack(track, trendingTracks)}
              >
                <div style={{ color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 700 }}>{index + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={track.coverUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} onError={e => e.target.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'} />
                  <div>
                    <div style={{ fontWeight: 600, color: isCurrent ? 'var(--color-primary)' : '#fff' }}>{track.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{track.artistName}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{track.genre}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{(track.plays || 0).toLocaleString()}</div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }} style={{ color: user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Heart size={15} fill={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'none'} />
                  </button>
                  {user && (user.username === 'cdeveloppeur' || user.role === 'developer' || user.role === 'admin' || user.username === track.artistId) && (
                    <button onClick={(e) => { e.stopPropagation(); if(confirm(`Supprimer ${track.title} ?`)) deleteTrack(track.id); }} style={{ color: '#FF4400', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEW HISTORY VIEW
// -------------------------------------------------------------
function HistoryView() {
  const { history, playTrack, currentTrack, isPlaying, togglePlay, user, toggleLike } = useContext(AppContext);

  return (
    <div className="scrollable view-container" style={{ padding: '24px 32px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900 }}>Historique d'écoute</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Retrouvez les morceaux que vous avez écoutés récemment.</p>
      </div>

      {history.length > 0 ? (
        <div className="tracks-list">
          {history.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div 
                key={`${track.id}-${idx}`}
                className={`track-list-row ${isCurrent ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 6, transition: 'background 0.2s' }}
                onClick={() => playTrack(track, history)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img src={track.coverUrl} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} onError={e => e.target.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'} />
                  <div>
                    <div style={{ fontWeight: 600, color: isCurrent ? 'var(--color-primary)' : '#fff' }}>{track.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{track.artistName}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{track.genre}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }} style={{ color: user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Heart size={15} fill={user && user.likedTracks.map(String).includes(String(track.id)) ? 'var(--color-primary)' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <History className="empty-state-icon" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Votre historique d'écoute est encore vide. Lancez quelques titres !</p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// NEW SETTINGS VIEW
// -------------------------------------------------------------
const SETTINGS_THEME_COLORS = [
  { name: 'Orange', value: '#FF6600' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Or', value: '#F59E0B' },
];

const getSettingsBgGlowColors = (color) => {
  const map = {
    '#FF6600': { start: '#301400', end: '#2b1100' }, // Orange
    '#8B5CF6': { start: '#1d0e3d', end: '#14082e' }, // Violet
    '#3B82F6': { start: '#0c1b3d', end: '#06102b' }, // Bleu
    '#EF4444': { start: '#380c0c', end: '#290606' }, // Rouge
    '#EC4899': { start: '#3b0d24', end: '#290616' }, // Rose
    '#10B981': { start: '#06291a', end: '#031c11' }, // Vert
    '#06B6D4': { start: '#042730', end: '#021a21' }, // Cyan
    '#F59E0B': { start: '#2e1c02', end: '#211301' }, // Or
  };
  return map[color] || { start: '#161616', end: '#0a0a0a' };
};

function SettingsView() {
  const { user, updateProfile, themeAccent, setThemeAccent } = useContext(AppContext);
  const [shareActivity, setShareActivity] = useState(true);

  const applyTheme = (color) => {
    localStorage.setItem('pandofy_theme_color', color);
    setThemeAccent(color);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', color + 'CC');
    document.documentElement.style.setProperty('--color-primary-glow', color + '66');
    const glows = getSettingsBgGlowColors(color);
    document.documentElement.style.setProperty('--color-bg-glow-start', glows.start);
    document.documentElement.style.setProperty('--color-bg-glow-end', glows.end);
    if (user) {
      updateProfile(user.displayName, user.bio, color);
    }
  };

  return (
    <div className="scrollable view-container" style={{ padding: '24px 32px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900 }}>Paramètres de l'application</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Gérez vos préférences, votre thème de couleur et la configuration.</p>
      </div>

      <div className="account-card" style={{ padding: 24, marginBottom: 20, borderTop: '2px solid var(--color-primary)', background: 'rgba(30, 30, 30, 0.45)', borderRadius: 12 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>🎨 Thème visuel (Couleur d'accentuation)</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Personnalisez la couleur principale de l'interface de Pandofy.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
          {SETTINGS_THEME_COLORS.map(tc => (
            <button 
              key={tc.value} 
              onClick={() => applyTheme(tc.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px',
                borderRadius: 12, border: `2px solid ${themeAccent === tc.value ? tc.value : 'rgba(255,255,255,0.06)'}`,
                background: themeAccent === tc.value ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: tc.value }} />
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{tc.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="account-card" style={{ padding: 24, marginBottom: 20, borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(30, 30, 30, 0.45)', borderRadius: 12 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>🔒 Social & Confidentialité</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>Partager mon activité d'écoute</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Permettre à vos amis de voir ce que vous écoutez.</div>
          </div>
          <input 
            type="checkbox" 
            checked={shareActivity} 
            onChange={(e) => setShareActivity(e.target.checked)} 
            style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
          />
        </div>
      </div>

      <div className="account-card" style={{ padding: 24, borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(30, 30, 30, 0.45)', borderRadius: 12 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>ℹ️ Informations Système</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Version de l'application</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>Pandofy Desktop v1.5.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Client Electron</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>Electron v34.3.0 (Chromium 132)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Statut du serveur de base de données</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Connecté (Local SQLite fallback)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
