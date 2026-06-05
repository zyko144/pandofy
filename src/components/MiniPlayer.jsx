import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Play, Pause, SkipForward, SkipBack, Heart } from 'lucide-react';

/**
 * MiniPlayer — Barre compacte 64px affichée en bas de l'écran
 * quand un morceau est actif ET que l'utilisateur n'est pas sur la vue principale.
 * Cliquable pour revenir au player principal.
 */
export default function MiniPlayer({ visible, onExpand }) {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    user,
    toggleLike,
  } = useContext(AppContext);

  if (!visible || !currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const isLiked = user && user.likedTracks?.map(String).includes(String(currentTrack.id));

  const handleProgressClick = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    seek(pct * duration);
  };

  return (
    <div className="mini-player" aria-label="Mini lecteur">
      {/* Progress bar slim — at very top of mini player */}
      <div
        className="mini-player-progress"
        onClick={handleProgressClick}
        aria-label={`Progression : ${Math.round(progress)}%`}
        role="slider"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="mini-player-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mini-player-content">
        {/* Cover + Info — click to expand */}
        <div
          className="mini-player-track"
          onClick={onExpand}
          style={{ cursor: 'pointer' }}
          role="button"
          aria-label="Agrandir le lecteur"
        >
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="mini-player-cover"
            onError={e => {
              e.target.src = 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=100';
            }}
          />
          <div className="mini-player-info">
            <span className="mini-player-title">{currentTrack.title}</span>
            <span className="mini-player-artist">{currentTrack.artistName}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mini-player-controls">
          {/* Like */}
          {user && (
            <button
              className="mini-player-btn"
              onClick={() => toggleLike(currentTrack.id)}
              aria-label={isLiked ? 'Retirer des likés' : 'Liker ce morceau'}
              title={isLiked ? 'Retirer des likés' : 'Liker'}
            >
              <Heart
                size={16}
                fill={isLiked ? 'var(--color-primary)' : 'none'}
                color={isLiked ? 'var(--color-primary)' : 'currentColor'}
              />
            </button>
          )}

          {/* Prev */}
          <button
            className="mini-player-btn"
            onClick={prevTrack}
            aria-label="Piste précédente"
            title="Précédent"
          >
            <SkipBack size={18} />
          </button>

          {/* Play/Pause */}
          <button
            className="mini-player-btn mini-player-btn--play"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Next */}
          <button
            className="mini-player-btn"
            onClick={nextTrack}
            aria-label="Piste suivante"
            title="Suivant"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
