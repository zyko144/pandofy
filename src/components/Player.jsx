import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE } from '../utils/api';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, Heart, Volume1, ListMusic, Moon, RefreshCw,
} from 'lucide-react';

export default function Player({ onToggleQueue, showQueue }) {
  const {
    currentTrack, isPlaying, setIsPlaying, togglePlay, nextTrack, prevTrack,
    volume, setVolume, muted, setMuted, currentTime, setCurrentTime, duration, setDuration, seek,
    isShuffle, toggleShuffle, repeatMode, cycleRepeat, user, toggleLike,
    analyserNode, formatDuration, audioRef, sleepTimer, setSleepTimer, queue, queueIndex,
  } = useContext(AppContext);

  const canvasRef = useRef(null);
  const playTracked = useRef(false);
  const ytPlayerRef = useRef(null);
  const [ytReady, setYtReady] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState('');
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const sleepIntervalRef = useRef(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const bufRef = useRef(null);
  const [localTime, setLocalTime] = useState(0);

  const isYouTube = currentTrack?.audioUrl?.startsWith('yt:');

  useEffect(() => {
    setLocalTime(0);
  }, [currentTrack]);

  const getYtId = (url) => {
    if (!url) return null;
    const raw = url.replace('yt:', '');
    const m = raw.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  const ytId = isYouTube ? getYtId(currentTrack?.audioUrl) : null;

  // Load YouTube Iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YouTube Player
  useEffect(() => {
    let checkInterval;
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        if (!document.getElementById('yt-player-container')) return;
        try {
          ytPlayerRef.current = new window.YT.Player('yt-player-container', {
            height: '200',
            width: '300',
            playerVars: {
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              origin: window.location.origin
            },
            events: {
              onReady: () => {
                setYtReady(true);
              },
              onStateChange: (event) => {
                if (event.data === 0) {
                  nextTrack();
                }
              }
            }
          });
        } catch (err) {
          console.error("Failed to init YouTube player:", err);
        }
      }
    };

    checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player && document.getElementById('yt-player-container')) {
        clearInterval(checkInterval);
        initPlayer();
      }
    }, 200);

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // Sync YouTube track change
  useEffect(() => {
    if (!isYouTube || !ytId || !ytReady || !ytPlayerRef.current) {
      if (!isYouTube && ytReady && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      }
      return;
    }
    try {
      if (isPlaying) {
        ytPlayerRef.current.loadVideoById(ytId);
        if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute();
      } else {
        ytPlayerRef.current.cueVideoById(ytId);
      }
      ytPlayerRef.current.setVolume(muted ? 0 : Math.round(volume * 100));
    } catch (err) {
      console.error("YouTube load error:", err);
    }
  }, [ytId, ytReady]);

  // Sync YouTube play/pause
  useEffect(() => {
    if (!isYouTube || !ytReady || !ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute();
        if (typeof ytPlayerRef.current.playVideo === 'function') ytPlayerRef.current.playVideo();
      } else {
        if (typeof ytPlayerRef.current.pauseVideo === 'function') ytPlayerRef.current.pauseVideo();
      }
    } catch (err) {
      console.error("YouTube play/pause sync error:", err);
    }
  }, [isPlaying, isYouTube, ytReady]);

  // Sync YouTube volume/mute
  useEffect(() => {
    if (!isYouTube || !ytReady || !ytPlayerRef.current) return;
    try {
      if (typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(muted ? 0 : Math.round(volume * 100));
      }
      if (!muted && volume > 0 && typeof ytPlayerRef.current.unMute === 'function') {
        ytPlayerRef.current.unMute();
      }
    } catch (err) {
      console.error("YouTube volume sync error:", err);
    }
  }, [volume, muted, isYouTube, ytReady]);

  // Track YouTube current time and duration
  useEffect(() => {
    if (!isYouTube || !isPlaying || !ytReady || !ytPlayerRef.current) return;
    const interval = setInterval(() => {
      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const time = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          setLocalTime(time);
          if (dur) setDuration(dur);
        }
      } catch {}
    }, 250);
    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, ytReady]);

  // Canvas visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let lastDrawTime = 0;
    const draw = () => {
      if (isPlaying) {
        animId = requestAnimationFrame(draw);
      }
      
      const now = Date.now();
      if (now - lastDrawTime < 33) return; // Limit to ~30 FPS
      lastDrawTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const count = 16, bw = 3, gap = 2;
      const startX = (canvas.width - count * (bw + gap)) / 2;
      let data = [];
      if (analyserNode && isPlaying && !isYouTube) {
        if (!bufRef.current || bufRef.current.length !== analyserNode.frequencyBinCount) {
          bufRef.current = new Uint8Array(analyserNode.frequencyBinCount);
        }
        const buf = bufRef.current;
        analyserNode.getByteFrequencyData(buf);
        if (buf.some(v => v > 0)) {
          for (let i = 0; i < count; i++) data.push(buf[Math.floor((i / count) * buf.length * 0.7)]);
        }
      }
      if (data.length === 0) {
        for (let i = 0; i < count; i++) {
          if (isPlaying) {
            const t = Date.now() * 0.004;
            const f = (i / count) * Math.PI * 2;
            let v = Math.abs(Math.sin(t * 1.5 + f) * 0.5 + Math.cos(t * 0.8 - f * 1.5) * 0.3);
            v = Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.15));
            data.push(Math.floor(v * 255 * (muted ? 0.05 : 0.2 + volume * 0.8)));
          } else {
            data.push(15);
          }
        }
      }

      // Read active primary theme color dynamically
      const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#FF6600';
      ctx.fillStyle = themeColor;

      for (let i = 0; i < count; i++) {
        const pct = data[i] / 255;
        const bh = Math.max(2, pct * canvas.height);
        const x = startX + i * (bw + gap);
        const y = canvas.height - bh;
        try { ctx.roundRect(x, y, bw, bh, 1.5); ctx.fill(); } catch { ctx.fillRect(x, y, bw, bh); }
      }
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, volume, muted, analyserNode, isYouTube]);

  // Sync HTML5 audio currentTime to local state
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const updateTime = () => {
      if (!isYouTube) {
        setLocalTime(audio.currentTime);
      }
    };
    audio.addEventListener('timeupdate', updateTime);
    return () => audio.removeEventListener('timeupdate', updateTime);
  }, [isYouTube, audioRef]);

  // Media Session
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title, artist: currentTrack.artistName, album: 'Pandofy',
      artwork: currentTrack.coverUrl ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  }, [currentTrack]);

  // Sleep timer
  useEffect(() => {
    if (!sleepTimer) { clearInterval(sleepIntervalRef.current); setSleepCountdown(''); return; }
    const tick = () => {
      const rem = sleepTimer.endsAt - Date.now();
      if (rem <= 0) {
        clearInterval(sleepIntervalRef.current); setSleepTimer(null);
        if (!isYouTube) audioRef?.current?.pause();
        setIsPlaying(false); return;
      }
      const m = Math.floor(rem / 60000), s = Math.floor((rem % 60000) / 1000);
      setSleepCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick(); sleepIntervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(sleepIntervalRef.current);
  }, [sleepTimer]);

  const setSleepOption = (min) => {
    setShowSleepMenu(false);
    if (min === null) { setSleepTimer(null); return; }
    setSleepTimer({ endsAt: Date.now() + min * 60000, type: `${min}min` });
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    window.electronAPI?.checkForUpdates?.();
    setTimeout(() => setCheckingUpdate(false), 3000);
  };

  const getQualityBadge = () => {
    if (!user) return <span className="quality-badge standard">128 kbps</span>;
    switch (user.premiumStatus) {
      case 'premium_student': return <span className="quality-badge medium">256 kbps</span>;
      case 'premium_individual': case 'premium_family': return <span className="quality-badge high">320 kbps Hi-Fi</span>;
      default: return <span className="quality-badge standard">128 kbps</span>;
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleSeek = (time) => {
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(time, true);
        setLocalTime(time);
      } catch (err) {
        console.error("YouTube seek error:", err);
      }
    } else {
      seek(time);
      setLocalTime(time);
    }
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickTime = ((e.clientX - rect.left) / rect.width) * duration;
    handleSeek(clickTime);
  };

  const handleVolumeMouseDown = (e) => {
    const slider = e.currentTarget;
    const update = (ev) => {
      const rect = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      setVolume(pct); if (muted) setMuted(false);
    };
    update(e);
    const onMove = (ev) => update(ev);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const isLiked = currentTrack && user && user.likedTracks?.map(String).includes(String(currentTrack.id));
  const upcomingCount = queue.length > 0 ? Math.max(0, queue.length - queueIndex - 1) : 0;
  const progress = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <footer className="player">
      {/* Off-screen container for YouTube Player API */}
      <div 
        style={{ position: 'fixed', top: -1000, left: -1000, width: 300, height: 200, pointerEvents: 'none', zIndex: -1000 }}
        dangerouslySetInnerHTML={{ __html: '<div id="yt-player-container"></div>' }}
      />

      {/* Left: Track info */}
      <div className="player-track-info">
        {currentTrack ? (
          <>
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="player-cover"
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'; }} />
            <div className="player-metadata">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div className="player-title">{currentTrack.title}</div>
                {getQualityBadge()}
                {isYouTube && <span style={{ fontSize: '0.65rem', background: '#FF0000', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>YT</span>}
              </div>
              <div className="player-artist">{currentTrack.artistName}</div>
            </div>
            {user && (
              <button className={`player-like-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(currentTrack.id)}>
                <Heart size={18} fill={isLiked ? 'var(--color-primary)' : 'none'} color={isLiked ? 'var(--color-primary)' : 'currentColor'} />
              </button>
            )}
          </>
        ) : (
          <div className="player-metadata">
            <div className="player-title" style={{ color: 'var(--color-text-muted)' }}>Aucune lecture en cours</div>
            <div className="player-artist">Choisissez un titre pour commencer</div>
          </div>
        )}
      </div>

      {/* Center: Controls + Progress */}
      <div className="player-controls-container">
        <div className="player-buttons">
          <button className={`player-btn-icon ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle"><Shuffle size={16} /></button>
          <button className="player-btn-icon" onClick={prevTrack} title="Précédent"><SkipBack size={20} fill="currentColor" /></button>
          <button className={`player-play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlay} title={isPlaying ? 'Pause' : 'Lecture'}>
            {isPlaying ? <Pause size={20} fill="#000" color="#000" /> : <Play size={20} fill="#000" color="#000" style={{ transform: 'translateX(1.5px)' }} />}
          </button>
          <button className="player-btn-icon" onClick={nextTrack} title="Suivant"><SkipForward size={20} fill="currentColor" /></button>
          <button className={`player-btn-icon ${repeatMode !== 'off' ? 'active' : ''}`} onClick={cycleRepeat} title="Répétition">
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="player-progress-wrapper">
          <div className="player-time">{fmt(localTime)}</div>
          <div className="player-progress-bar" onClick={handleProgressClick}
            style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 8px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, var(--color-primary), #CC44FF)', borderRadius: 2, position: 'relative', transition: 'width 0.1s linear' }}>
              <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px var(--color-primary)' }} />
            </div>
          </div>
          <div className="player-time player-time-total">{fmt(duration)}</div>
        </div>
      </div>

      {/* Right: Visualizer, Sleep, Update, Queue, Volume */}
      <div className="player-extra-controls">
        <div className="visualizer-canvas-container">
          <canvas ref={canvasRef} className="visualizer-canvas" width="100" height="30" />
        </div>

        {/* Check for updates button */}
        {window.electronAPI && (
          <button onClick={handleCheckUpdate} title="Vérifier les mises à jour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={15} style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}

        {/* Sleep timer */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowSleepMenu(!showSleepMenu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: sleepTimer ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <Moon size={16} />
            {sleepCountdown && <span className="sleep-timer-countdown">{sleepCountdown}</span>}
          </button>
          {showSleepMenu && (
            <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 0', zIndex: 1000, minWidth: 150, boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }}>
              <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sleep timer</div>
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => setSleepOption(m)} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', textAlign: 'left', fontSize: 13 }}>{m} minutes</button>
              ))}
              {sleepTimer && <button onClick={() => setSleepOption(null)} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF4444', textAlign: 'left', fontSize: 13 }}>Désactiver</button>}
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="queue-btn-wrapper">
          <button onClick={onToggleQueue} title="File d'attente"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQueue ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <ListMusic size={18} />
          </button>
          {upcomingCount > 0 && <span className="queue-btn-badge">{upcomingCount}</span>}
        </div>

        {/* Volume */}
        <div className="player-volume-wrapper">
          <button onClick={() => setMuted(!muted)} title={muted ? 'Réactiver' : 'Couper'}>
            {muted || volume === 0 ? <VolumeX size={18} /> : volume < 0.4 ? <Volume1 size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="player-volume-slider" onMouseDown={handleVolumeMouseDown}>
            <div className="player-volume-fill" style={{ width: `${muted ? 0 : volume * 100}%` }}>
              <div className="player-volume-knob" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
