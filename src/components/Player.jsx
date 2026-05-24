import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE } from '../utils/api';
import WaveSurfer from 'wavesurfer.js';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Volume1,
  ListMusic,
  Moon,
} from 'lucide-react';

export default function Player({ onToggleQueue, showQueue }) {
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    muted,
    setMuted,
    currentTime,
    duration,
    seek,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    isRepeat,
    user,
    toggleLike,
    analyserNode,
    formatDuration,
    audioRef,
    sleepTimer,
    setSleepTimer,
    queue,
    queueIndex,
  } = useContext(AppContext);

  const canvasRef = useRef(null);
  const playTracked = useRef(false);

  // WaveSurfer refs
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [waveformLoading, setWaveformLoading] = useState(false);

  // Sleep timer local state
  const [sleepCountdown, setSleepCountdown] = useState('');
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const sleepIntervalRef = useRef(null);

  // ─── WaveSurfer integration ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !waveformRef.current) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }

    setWaveformLoading(true);

    let ws;
    try {
      const opts = {
        container: waveformRef.current,
        waveColor: 'rgba(255,102,0,0.35)',
        progressColor: '#FF6600',
        height: 44,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        interact: true,
        normalize: true,
        url: currentTrack.audioUrl,
      };
      // Use existing audio element if available (avoids double-loading)
      if (audioRef?.current) {
        opts.media = audioRef.current;
        delete opts.url;
      }
      ws = WaveSurfer.create(opts);

      ws.on('ready', () => setWaveformLoading(false));
      ws.on('error', () => setWaveformLoading(false));
      ws.on('interaction', (newTime) => {
        seek(newTime);
      });

      wavesurferRef.current = ws;
    } catch (e) {
      console.warn('[WaveSurfer] init error:', e);
      setWaveformLoading(false);
    }

    return () => {
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch {}
        wavesurferRef.current = null;
      }
    };
  }, [currentTrack?.id]);

  // Sync WaveSurfer time with audio position
  useEffect(() => {
    if (!wavesurferRef.current || !duration || duration === 0) return;
    try {
      wavesurferRef.current.setTime(currentTime);
    } catch {}
  }, [currentTime]);

  // ─── Media Session API ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: 'Pandofy',
      artwork: currentTrack.coverUrl
        ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef?.current?.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef?.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'].forEach(a => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // ─── Sleep timer logic ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sleepTimer) {
      clearInterval(sleepIntervalRef.current);
      setSleepCountdown('');
      return;
    }

    const tick = () => {
      const remaining = sleepTimer.endsAt - Date.now();
      if (remaining <= 0) {
        clearInterval(sleepIntervalRef.current);
        setSleepTimer(null);
        audioRef?.current?.pause();
        setIsPlaying(false);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pandofy', { body: 'Sleep timer terminé — bonne nuit ! 🌙' });
        }
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setSleepCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    };

    tick();
    sleepIntervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(sleepIntervalRef.current);
  }, [sleepTimer]);

  const setSleepTimerOption = (minutes) => {
    setShowSleepMenu(false);
    if (minutes === null) {
      setSleepTimer(null);
      return;
    }
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setSleepTimer({ endsAt: Date.now() + minutes * 60000, type: `${minutes}min` });
  };

  // ─── Dynamic Audio Streaming Quality Badge ─────────────────────────────────
  const getQualityBadge = () => {
    if (!user) return <span className="quality-badge standard">128 kbps</span>;
    const plan = user.premiumStatus;
    if (plan.startsWith('pending_')) {
      return <span className="quality-badge medium" style={{ animation: 'glowPulse 1s infinite alternate' }}>Activation...</span>;
    }
    switch (plan) {
      case 'premium_student':
        return <span className="quality-badge medium" title="Qualité Supérieure">256 kbps</span>;
      case 'premium_individual':
      case 'premium_family':
        return <span className="quality-badge high" title="Qualité Haute Fidélité (Hi-Fi) Débloquée !">320 kbps Hi-Fi</span>;
      default:
        return <span className="quality-badge standard" title="Qualité Standard (Abonnez-vous pour du 320kbps)">128 kbps</span>;
    }
  };

  // ─── Canvas visualizer ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 16;
      const barWidth = 3;
      const barGap = 2;
      const startX = (canvas.width - (barCount * (barWidth + barGap))) / 2;

      let data = [];

      if (analyserNode && isPlaying) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
        const hasData = dataArray.some(val => val > 0);
        if (hasData) {
          for (let i = 0; i < barCount; i++) {
            const dataIdx = Math.floor((i / barCount) * bufferLength * 0.7);
            data.push(dataArray[dataIdx]);
          }
        }
      }

      if (data.length === 0) {
        for (let i = 0; i < barCount; i++) {
          if (isPlaying) {
            const time = Date.now() * 0.004;
            const freqFactor = (i / barCount) * Math.PI * 2;
            const wave1 = Math.sin(time * 1.5 + freqFactor);
            const wave2 = Math.cos(time * 0.8 - freqFactor * 1.5);
            const wave3 = Math.sin(time * 2.3 + freqFactor * 0.5);
            let val = Math.abs(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);
            val += (Math.random() - 0.5) * 0.15;
            val = Math.max(0, Math.min(1, val));
            const volumeMultiplier = muted ? 0.05 : 0.2 + (volume * 0.8);
            data.push(Math.floor(val * 255 * volumeMultiplier));
          } else {
            data.push(5 + Math.sin(Date.now() * 0.002 + i) * 2);
          }
        }
      }

      for (let i = 0; i < barCount; i++) {
        const value = data[i];
        const percent = value / 255;
        const barHeight = Math.max(2, percent * canvas.height);
        const x = startX + i * (barWidth + barGap);
        const y = canvas.height - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        gradient.addColorStop(0, '#FF8800');
        gradient.addColorStop(1, '#FF4400');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        try {
          ctx.roundRect(x, y, barWidth, barHeight, 1.5);
          ctx.fill();
        } catch {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, volume, muted, analyserNode]);

  // ─── Play tracking: report play after 30 seconds ───────────────────────────
  useEffect(() => {
    if (!currentTrack) { playTracked.current = false; return; }
    playTracked.current = false;
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || !user) return;
    if (currentTime > 30 && !playTracked.current) {
      playTracked.current = true;
      authFetch(`${API_BASE}/api/tracks/${currentTrack.id}/play`, {
        method: 'POST',
        body: JSON.stringify({ username: user.username })
      }).catch(() => {});
    }
  }, [currentTime, currentTrack, user]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    seek(clickPercent * duration);
  };

  const handleVolumeMouseDown = (e) => {
    const slider = e.currentTarget;
    const updateVolume = (moveEvent) => {
      const rect = slider.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      setVolume(percent);
      if (muted) setMuted(false);
    };
    updateVolume(e);
    const handleMouseMove = (ev) => updateVolume(ev);
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const isLiked = currentTrack && user && user.likedTracks?.map(String).includes(String(currentTrack.id));
  const upcomingCount = queue.length > 0 ? Math.max(0, queue.length - queueIndex - 1) : 0;

  return (
    <footer className="player">
      {/* Left side: Track Info + Quality Badge */}
      <div className="player-track-info">
        {currentTrack ? (
          <>
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="player-cover"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60';
              }}
            />
            <div className="player-metadata">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="player-title">{currentTrack.title}</div>
                {getQualityBadge()}
              </div>
              <div className="player-artist">{currentTrack.artistName}</div>
            </div>
            <button
              className={`player-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => toggleLike(currentTrack.id)}
              aria-label={isLiked ? 'Retirer des likés' : 'Liker ce morceau'}
            >
              <Heart
                size={18}
                fill={isLiked ? 'var(--color-primary)' : 'none'}
                color={isLiked ? 'var(--color-primary)' : 'currentColor'}
              />
            </button>
          </>
        ) : (
          <div className="player-metadata">
            <div className="player-title" style={{ color: 'var(--color-text-muted)' }}>Aucune lecture en cours</div>
            <div className="player-artist">Choisissez un titre pour commencer</div>
          </div>
        )}
      </div>

      {/* Center: Playback Controls + WaveSurfer */}
      <div className="player-controls-container">
        <div className="player-buttons">
          {/* Shuffle */}
          <button
            className={`player-btn-icon ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            title={isShuffle ? 'Désactiver le shuffle' : 'Activer le shuffle'}
            aria-label="Lecture aléatoire"
          >
            <Shuffle size={16} />
          </button>

          {/* Prev */}
          <button className="player-btn-icon" onClick={prevTrack} title="Précédent" aria-label="Piste précédente">
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Play/Pause */}
          <button
            className={`player-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Lecture'}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? (
              <Pause size={20} fill="#000" color="#000" />
            ) : (
              <Play size={20} fill="#000" color="#000" style={{ transform: 'translateX(1.5px)' }} />
            )}
          </button>

          {/* Next */}
          <button className="player-btn-icon" onClick={nextTrack} title="Suivant" aria-label="Piste suivante">
            <SkipForward size={20} fill="currentColor" />
          </button>

          {/* Repeat (3-state) */}
          <button
            className={`player-btn-icon ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={cycleRepeat}
            title={repeatMode === 'off' ? 'Répétition désactivée' : repeatMode === 'all' ? 'Répéter la file' : 'Répéter ce morceau'}
            aria-label={`Mode répétition: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress: WaveSurfer + fallback seek bar */}
        <div className="player-progress-wrapper">
          <div className="player-time">{formatTime(currentTime)}</div>

          {/* WaveSurfer waveform — shown when track is loaded */}
          {currentTrack ? (
            <div className="waveform-container" style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              {waveformLoading && (
                <div className="waveform-skeleton">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="waveform-skeleton-bar"
                      style={{ height: `${18 + Math.sin(i * 0.7) * 14 + 4}px` }}
                    />
                  ))}
                </div>
              )}
              <div
                ref={waveformRef}
                style={{ display: waveformLoading ? 'none' : 'block', width: '100%' }}
              />
              {/* Fallback progress bar (always shown, overlaid when waveform loads) */}
              {waveformLoading && (
                <div
                  className="player-progress-bar"
                  onClick={handleProgressClick}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0 }}
                  aria-hidden
                >
                  <div
                    className="player-progress-fill"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    <div className="player-progress-knob" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No track: show static progress bar */
            <div className="player-progress-bar" onClick={handleProgressClick}>
              <div className="player-progress-fill" style={{ width: '0%' }}>
                <div className="player-progress-knob" />
              </div>
            </div>
          )}

          <div className="player-time player-time-total">{formatTime(duration)}</div>
        </div>
      </div>

      {/* Right side: Volume, Visualizer, Queue, Sleep Timer */}
      <div className="player-extra-controls">
        {/* Canvas visualizer */}
        <div className="visualizer-canvas-container" title="Visualisateur audio">
          <canvas
            ref={canvasRef}
            className="visualizer-canvas"
            width="100"
            height="30"
          />
        </div>

        {/* Sleep Timer */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSleepMenu(!showSleepMenu)}
            aria-label="Sleep timer"
            title={sleepTimer ? `Sleep timer : ${sleepCountdown}` : 'Activer le sleep timer'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: sleepTimer ? '#FF6600' : 'var(--color-text-muted)',
              padding: '4px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11
            }}
          >
            <Moon size={16} />
            {sleepCountdown && <span className="sleep-timer-countdown">{sleepCountdown}</span>}
          </button>
          {showSleepMenu && (
            <div style={{
              position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '8px 0', zIndex: 1000, minWidth: 150,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
            }}>
              <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Sleep timer
              </div>
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => setSleepTimerOption(m)}
                  style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--color-text-main)', textAlign: 'left', fontSize: 13 }}>
                  {m} minutes
                </button>
              ))}
              {sleepTimer && (
                <button onClick={() => setSleepTimerOption(null)}
                  style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#FF4444', textAlign: 'left', fontSize: 13 }}>
                  Désactiver
                </button>
              )}
            </div>
          )}
        </div>

        {/* Queue button with badge */}
        <div className="queue-btn-wrapper">
          <button
            onClick={onToggleQueue}
            aria-label={showQueue ? 'Fermer la file d\'attente' : 'Ouvrir la file d\'attente'}
            title="File d'attente"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: showQueue ? '#FF6600' : 'var(--color-text-muted)',
              padding: '4px', display: 'flex', alignItems: 'center'
            }}
          >
            <ListMusic size={18} />
          </button>
          {upcomingCount > 0 && (
            <span className="queue-btn-badge">{upcomingCount}</span>
          )}
        </div>

        {/* Volume */}
        <div className="player-volume-wrapper">
          <button
            onClick={() => setMuted(!muted)}
            title={muted ? 'Réactiver le son' : 'Couper le son'}
            aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
          >
            {muted || volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 0.4 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          <div className="player-volume-slider" onMouseDown={handleVolumeMouseDown}>
            <div
              className="player-volume-fill"
              style={{ width: `${muted ? 0 : volume * 100}%` }}
            >
              <div className="player-volume-knob" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
