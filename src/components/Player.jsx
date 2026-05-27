import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE } from '../utils/api';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, Heart, Volume1, ListMusic, Moon,
} from 'lucide-react';

export default function Player({ onToggleQueue, showQueue }) {
  const {
    currentTrack, isPlaying, setIsPlaying, togglePlay, nextTrack, prevTrack,
    volume, setVolume, muted, setMuted, currentTime, duration, seek,
    isShuffle, toggleShuffle, repeatMode, cycleRepeat, user, toggleLike,
    analyserNode, formatDuration, audioRef, sleepTimer, setSleepTimer, queue, queueIndex,
  } = useContext(AppContext);

  const canvasRef = useRef(null);
  const playTracked = useRef(false);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const [sleepCountdown, setSleepCountdown] = useState('');
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const sleepIntervalRef = useRef(null);
  const [ytReady, setYtReady] = useState(false);

  // Detect YouTube track
  const isYouTube = currentTrack?.audioUrl?.startsWith('yt:');
  const getYtId = (url) => {
    if (!url) return null;
    const raw = url.replace('yt:', '');
    const m = raw.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  const ytId = isYouTube ? getYtId(currentTrack.audioUrl) : null;

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT) { setYtReady(true); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
  }, []);

  // Create/destroy YouTube player when track changes
  useEffect(() => {
    if (!isYouTube || !ytReady || !ytId || !ytContainerRef.current) return;

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }

    ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
      videoId: ytId,
      height: '0',
      width: '0',
      playerVars: { autoplay: 1, controls: 0, disablekb: 1 },
      events: {
        onReady: (e) => { if (isPlaying) e.target.playVideo(); },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) nextTrack();
        },
      },
    });

    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [ytId, ytReady]);

  // Sync play/pause with YouTube player
  useEffect(() => {
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } catch {}
  }, [isPlaying]);

  // Sync volume with YouTube player
  useEffect(() => {
    if (!ytPlayerRef.current) return;
    try {
      ytPlayerRef.current.setVolume(muted ? 0 : volume * 100);
    } catch {}
  }, [volume, muted]);

  // Canvas visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 16, barWidth = 3, barGap = 2;
      const startX = (canvas.width - (barCount * (barWidth + barGap))) / 2;
      let data = [];
      if (analyserNode && isPlaying) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
        if (dataArray.some(v => v > 0)) {
          for (let i = 0; i < barCount; i++) {
            data.push(dataArray[Math.floor((i / barCount) * bufferLength * 0.7)]);
          }
        }
      }
      if (data.length === 0) {
        for (let i = 0; i < barCount; i++) {
          if (isPlaying) {
            const t = Date.now() * 0.004;
            const f = (i / barCount) * Math.PI * 2;
            let val = Math.abs(Math.sin(t*1.5+f)*0.5 + Math.cos(t*0.8-f*1.5)*0.3 + Math.sin(t*2.3+f*0.5)*0.2);
            val = Math.max(0, Math.min(1, val + (Math.random()-0.5)*0.15));
            data.push(Math.floor(val * 255 * (muted ? 0.05 : 0.2 + volume*0.8)));
          } else {
            data.push(5 + Math.sin(Date.now()*0.002+i)*2);
          }
        }
      }
      for (let i = 0; i < barCount; i++) {
        const percent = data[i] / 255;
        const barH = Math.max(2, percent * canvas.height);
        const x = startX + i*(barWidth+barGap);
        const y = canvas.height - barH;
        const g = ctx.createLinearGradient(x, y, x, canvas.height);
        g.addColorStop(0, '#FF8800'); g.addColorStop(1, '#FF4400');
        ctx.fillStyle = g;
        try { ctx.roundRect(x, y, barWidth, barH, 1.5); ctx.fill(); }
        catch { ctx.fillRect(x, y, barWidth, barH); }
      }
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, volume, muted, analyserNode]);

  // Play tracking
  useEffect(() => { if (!currentTrack) { playTracked.current = false; } }, [currentTrack]);
  useEffect(() => {
    if (!currentTrack || !user) return;
    if (currentTime > 30 && !playTracked.current) {
      playTracked.current = true;
      authFetch(`${API_BASE}/api/tracks/${currentTrack.id}/play`, {
        method: 'POST', body: JSON.stringify({ username: user.username })
      }).catch(() => {});
    }
  }, [currentTime, currentTrack, user]);

  // Media Session
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title, artist: currentTrack.artistName, album: 'Pandofy',
      artwork: currentTrack.coverUrl ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => { audioRef?.current?.play(); setIsPlaying(true); });
    navigator.mediaSession.setActionHandler('pause', () => { audioRef?.current?.pause(); setIsPlaying(false); });
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime !== undefined) seek(d.seekTime); });
    return () => { ['play','pause','previoustrack','nexttrack','seekto'].forEach(a => { try { navigator.mediaSession.setActionHandler(a, null); } catch {} }); };
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Sleep timer
  useEffect(() => {
    if (!sleepTimer) { clearInterval(sleepIntervalRef.current); setSleepCountdown(''); return; }
    const tick = () => {
      const remaining = sleepTimer.endsAt - Date.now();
      if (remaining <= 0) {
        clearInterval(sleepIntervalRef.current); setSleepTimer(null);
        audioRef?.current?.pause(); setIsPlaying(false);
        return;
      }
      const m = Math.floor(remaining/60000), s = Math.floor((remaining%60000)/1000);
      setSleepCountdown(`${m}:${s.toString().padStart(2,'0')}`);
    };
    tick(); sleepIntervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(sleepIntervalRef.current);
  }, [sleepTimer]);

  const setSleepTimerOption = (minutes) => {
    setShowSleepMenu(false);
    if (minutes === null) { setSleepTimer(null); return; }
    setSleepTimer({ endsAt: Date.now() + minutes*60000, type: `${minutes}min` });
  };

  const getQualityBadge = () => {
    if (!user) return <span className="quality-badge standard">128 kbps</span>;
    const plan = user.premiumStatus;
    if (plan?.startsWith('pending_')) return <span className="quality-badge medium" style={{ animation: 'glowPulse 1s infinite alternate' }}>Activation...</span>;
    switch (plan) {
      case 'premium_student': return <span className="quality-badge medium">256 kbps</span>;
      case 'premium_individual': case 'premium_family': return <span className="quality-badge high">320 kbps Hi-Fi</span>;
      default: return <span className="quality-badge standard">128 kbps</span>;
    }
  };

  const formatTime = (s) => {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
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
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="player">
      {/* Hidden YouTube iframe container */}
      {isYouTube && <div ref={ytContainerRef} style={{ display: 'none' }} />}

      {/* Left: Track Info */}
      <div className="player-track-info">
        {currentTrack ? (
          <>
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="player-cover"
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'; }} />
            <div className="player-metadata">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

        {/* Progress bar — simple white/orange style */}
        <div className="player-progress-wrapper">
          <div className="player-time">{formatTime(currentTime)}</div>
          <div
            className="player-progress-bar"
            onClick={handleProgressClick}
            style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 8px' }}
          >
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(to right, #FF6600, #CC44FF)',
              borderRadius: 2,
              position: 'relative',
              transition: 'width 0.1s linear'
            }}>
              <div style={{
                position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: '#fff', boxShadow: '0 0 4px rgba(255,102,0,0.8)'
              }} />
            </div>
          </div>
          <div className="player-time player-time-total">{formatTime(duration)}</div>
        </div>
      </div>

      {/* Right: Volume, Visualizer, Queue, Sleep */}
      <div className="player-extra-controls">
        <div className="visualizer-canvas-container">
          <canvas ref={canvasRef} className="visualizer-canvas" width="100" height="30" />
        </div>

        {/* Sleep Timer */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowSleepMenu(!showSleepMenu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: sleepTimer ? '#FF6600' : 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <Moon size={16} />
            {sleepCountdown && <span className="sleep-timer-countdown">{sleepCountdown}</span>}
          </button>
          {showSleepMenu && (
            <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 0', zIndex: 1000, minWidth: 150, boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }}>
              <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sleep timer</div>
              {[15,30,45,60].map(m => (
                <button key={m} onClick={() => setSleepTimerOption(m)} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)', textAlign: 'left', fontSize: 13 }}>{m} minutes</button>
              ))}
              {sleepTimer && <button onClick={() => setSleepTimerOption(null)} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF4444', textAlign: 'left', fontSize: 13 }}>Désactiver</button>}
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="queue-btn-wrapper">
          <button onClick={onToggleQueue} title="File d'attente"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQueue ? '#FF6600' : 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}>
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
