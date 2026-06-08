import React, { createContext, useState, useEffect, useRef } from 'react';
import { 
  seedDatabaseIfEmpty, 
  getTracks, 
  getPlaylists, 
  getUser, 
  saveUser, 
  isServerOnline 
} from '../services/db';
import { authFetch } from '../utils/authFetch';
import { API_BASE } from '../utils/api';

export const AppContext = createContext();

const API_URL = API_BASE;

// Normalize relative URLs to full URLs (uploaded files on Render)
const normalizeUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('/')) return API_URL + url;
  return url;
};

// Fisher-Yates shuffle — returns a shuffled array of indices
function fisherYates(arr) {
  const a = [...arr.keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const AppProvider = ({ children }) => {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('home'); // home, search, library, premium, account, playlist, inbox
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  
  // Custom Toasts for incoming emails or actions
  const [toastMessage, setToastMessage] = useState(null);

  // App data state
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isServerActive, setIsServerActive] = useState(false);

  // Audio player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('pandofy_volume') || '0.8'));
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(() => localStorage.getItem('pandofy_shuffle') === 'true');
  const [repeatMode, setRepeatMode] = useState(() => localStorage.getItem('pandofy_repeat') || 'off'); // 'off'|'all'|'one'
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => parseInt(localStorage.getItem('pandofy_crossfade') || '0'));
  const [sleepTimer, setSleepTimer] = useState(null); // { endsAt: timestamp, type: string } | null
  const [shuffledIndices, setShuffledIndices] = useState([]); // Fisher-Yates shuffled indices
  const [shufflePos, setShufflePos] = useState(0); // position in shuffledIndices

  // Newly Added Audit States: History and Theme Accent
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pandofy_history') || '[]');
    } catch {
      return [];
    }
  });
  const [themeAccent, setThemeAccent] = useState(() => localStorage.getItem('pandofy_theme_color') || '#FF6600');
  const [analyserNode, setAnalyserNode] = useState(null);

  // Backward compat alias
  const isRepeat = repeatMode !== 'off';

  const audioRef = useRef(null);
  const audioBRef = useRef(null); // second audio for crossfade
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  if (!audioBRef.current) {
    audioBRef.current = new Audio();
    audioBRef.current.preload = 'auto';
  }
  const crossfadeAnimRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const isAudioContextInitializedRef = useRef(false);

  // Pre-initialize AudioContext and pipeline on mount to eliminate runtime reconstruction latency
  useEffect(() => {
    if (audioRef.current) audioRef.current.preload = 'auto';
    if (audioBRef.current) audioBRef.current.preload = 'auto';

    const initPipeline = () => {
      if (isAudioContextInitializedRef.current) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);
        sourceRef.current = source;
        isAudioContextInitializedRef.current = true;
        console.log("AudioContext and Web Audio pipeline pre-connected on mount");
      } catch (e) {
        console.warn("AudioContext mount-init error:", e);
      }
    };

    // Pre-initialize pipeline right away (starts in suspended state, which is normal)
    initPipeline();

    // Set up a global click/key listener to activate (resume) the AudioContext as early as possible
    const handleGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext active via early gesture");
          document.removeEventListener('click', handleGesture);
          document.removeEventListener('keydown', handleGesture);
        }).catch(() => {});
      } else if (audioContextRef.current && audioContextRef.current.state === 'running') {
        document.removeEventListener('click', handleGesture);
        document.removeEventListener('keydown', handleGesture);
      }
    };

    document.addEventListener('click', handleGesture);
    document.addEventListener('keydown', handleGesture);

    return () => {
      document.removeEventListener('click', handleGesture);
      document.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Persist preferences to localStorage
  useEffect(() => { localStorage.setItem('pandofy_shuffle', isShuffle); }, [isShuffle]);
  useEffect(() => { localStorage.setItem('pandofy_repeat', repeatMode); }, [repeatMode]);
  useEffect(() => { localStorage.setItem('pandofy_volume', volume); }, [volume]);
  useEffect(() => { localStorage.setItem('pandofy_crossfade', crossfadeDuration); }, [crossfadeDuration]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Check if Express Server is active
  useEffect(() => {
    async function checkServer() {
      const active = await isServerOnline();
      setIsServerActive(active);
    }
    checkServer();
  }, []);

  // Fetch initial tracks, playlists and reload user session
  const refreshData = async () => {
    try {
      const tracksResponse = await getTracks();
      const allPlaylists = await getPlaylists();
      // Handle both paginated {tracks, total} and legacy array response
      const rawTracks = Array.isArray(tracksResponse) ? tracksResponse : (tracksResponse?.tracks || []);
      const normalizedTracks = rawTracks.map(t => ({
        ...t,
        audioUrl: normalizeUrl(t.audioUrl),
        coverUrl: normalizeUrl(t.coverUrl),
      }));
      setTracks(normalizedTracks);
      setPlaylists(allPlaylists);

      const storedUser = localStorage.getItem('pandofy_session_user');
      if (storedUser) {
        const dbUser = await getUser(storedUser);
        if (dbUser) {
          // If there's an incoming new message that we didn't have before, trigger an email alert!
          if (user && dbUser.messages && dbUser.messages.length > user.messages.length) {
            const newMsg = dbUser.messages[0];
            triggerToast(`📧 Nouvel e-mail : "${newMsg.subject}"`);
          }
          setUser(dbUser);
        }
      }
    } catch (e) {
      console.error("Error refreshing data:", e);
    }
  };

  const loadMoreTracks = async (offset) => {
    try {
      const res = await fetch(`${API_URL}/api/tracks?limit=30&offset=${offset}`);
      if (!res.ok) return false;
      const data = await res.json();
      const rawTracks = Array.isArray(data) ? data : (data?.tracks || []);
      if (rawTracks.length === 0) return false;
      const normalized = rawTracks.map(t => ({
        ...t,
        audioUrl: normalizeUrl(t.audioUrl),
        coverUrl: normalizeUrl(t.coverUrl),
      }));
      setTracks(prev => {
        const ids = new Set(prev.map(t => t.id));
        return [...prev, ...normalized.filter(t => !ids.has(t.id))];
      });
      return rawTracks.length === 30;
    } catch { return false; }
  };

  const checkAppVersion = async () => {
    try {
      const res = await fetch(`${API_URL}/api/version`);
      if (res.ok) {
        const data = await res.json();
        const lastSeen = localStorage.getItem('pandofy_last_seen_version');
        if (data.version && data.version !== lastSeen) {
          setUpdateInfo({ ...data, showOnLaunch: true });
        }
      }
    } catch (e) {
      console.warn("Could not check version:", e);
    }
  };

  useEffect(() => {
    // Max 8 attempts × 400ms = 3.2 seconds before giving up
    async function waitForServerReady(maxRetries = 8, delay = 400) {
      for (let i = 0; i < maxRetries; i++) {
        const online = await isServerOnline();
        if (online) return true;
        await new Promise(r => setTimeout(r, delay));
      }
      return false;
    }

    async function initApp() {
      // 1. Load cached data from IndexedDB instantly — no waiting
      try {
        await seedDatabaseIfEmpty();
        const cachedTracks = await getTracks();
        const cachedPlaylists = await getPlaylists();
        const normalizedTracks = cachedTracks.map(t => ({
          ...t,
          audioUrl: normalizeUrl(t.audioUrl),
          coverUrl: normalizeUrl(t.coverUrl),
        }));
        setTracks(normalizedTracks);
        setPlaylists(cachedPlaylists);

        const storedUser = localStorage.getItem('pandofy_session_user');
        if (storedUser) {
          const cachedUser = await getUser(storedUser);
          if (cachedUser) setUser(cachedUser);
        }
      } catch (e) {
        console.warn('Cache load error:', e);
      }

      // 2. Show UI immediately
      setLoading(false);

      // 3. Refresh from server in background (non-blocking)
      const serverReady = await waitForServerReady();
      if (serverReady) {
        setIsServerActive(true);
        await refreshData();
        await checkAppVersion();
      }
    }
    initApp();
  }, []);

  // Setup dynamic polling for Premium updates & new e-mails
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const freshUser = await getUser(user.username);
        if (freshUser) {
          // Detect plan activation changes
          if (freshUser.premiumStatus !== user.premiumStatus) {
            if (freshUser.premiumStatus.startsWith('pending_')) {
              triggerToast(`💳 Paiement reçu ! Activation en cours...`);
            } else if (!freshUser.premiumStatus.startsWith('pending_') && freshUser.premiumStatus !== 'none') {
              triggerToast(`🎉 Pandofy Premium Activé avec succès !`);
            }
            setUser(freshUser);
          }
          
          // Detect incoming emails
          const oldMsgCount = user.messages ? user.messages.length : 0;
          const newMsgCount = freshUser.messages ? freshUser.messages.length : 0;
          if (newMsgCount > oldMsgCount) {
            const newMail = freshUser.messages[0];
            triggerToast(`📧 Nouvel E-mail : "${newMail.subject}"`);
            setUser(freshUser);
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  const playTrackedRef = useRef(false);
  const lastSecondRef = useRef(-1);

  useEffect(() => {
    playTrackedRef.current = false;
    lastSecondRef.current = -1;
  }, [currentTrack]);

  // Audio handlers
  useEffect(() => {
    const audio = audioRef.current;
    
    const onTimeUpdate = () => {
      // 1. Play tracking
      if (audio.currentTime > 30 && !playTrackedRef.current && currentTrack && !currentTrack.audioUrl?.startsWith('yt:')) {
        playTrackedRef.current = true;
        authFetch(`${API_BASE}/api/tracks/${currentTrack.id}/play`, {
          method: 'POST',
          body: JSON.stringify({ username: user?.username })
        }).catch(() => {});
      }
      
      // 2. Throttle context updates to once per 2 seconds to eliminate React lag
      const sec = Math.floor(audio.currentTime);
      if (sec % 2 === 0 && sec !== lastSecondRef.current) {
        lastSecondRef.current = sec;
        setCurrentTime(audio.currentTime);
      }
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => handleTrackEnd();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue, queueIndex, repeatMode, isShuffle, shuffledIndices, shufflePos, currentTrack, user]);

  useEffect(() => {
    audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    if (!currentTrack) return;

    const audio = audioRef.current;

    // Build full URL — relative paths (ex: /uploads/...) need API_BASE prefix
    const isYT = currentTrack.audioUrl?.startsWith('yt:');
    if (isYT) {
      audio.src = '';
      audio.load();
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const fullUrl = currentTrack.audioUrl.startsWith('/')
      ? API_URL + currentTrack.audioUrl
      : currentTrack.audioUrl;

    // Only assign and load if the source URL has actually changed.
    // Setting .src when it is already set causes audio stream disruption and latency.
    if (audio.src !== fullUrl) {
      audio.src = fullUrl;
      audio.preload = 'auto';

      // CORS config
      if (fullUrl.startsWith(API_URL)) {
        audio.crossOrigin = 'anonymous';
      } else {
        audio.removeAttribute('crossorigin');
      }

      audio.load();
      audio.currentTime = 0;
      setCurrentTime(0);
    } else {
      // If it's the same URL, just restart it
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    if (isPlaying) {
      // Ensure context is running before executing play
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          audio.play().catch(e => {
            console.log("Autoplay prevention:", e);
            setIsPlaying(false);
          });
        });
      } else {
        audio.play().catch(e => {
          console.log("Autoplay prevention:", e);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  const initAudioCtx = () => {
    if (isAudioContextInitializedRef.current) {
      // If initialized but suspended, resume it
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.warn(e));
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAnalyserNode(analyser); // set state reactively
      sourceRef.current = source;
      isAudioContextInitializedRef.current = true;
      console.log("AudioContext initiated");

      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e));
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  };

  const togglePlay = () => {
    initAudioCtx();
    if (!currentTrack && tracks.length > 0) {
      playTrack(tracks[0], tracks);
      return;
    }
    if (!currentTrack) return;

    const isYT = currentTrack?.audioUrl?.startsWith('yt:');

    if (isPlaying) {
      if (!isYT) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!isYT) {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(err => {
              console.error(err);
              setIsPlaying(false);
            });
          });
        } else {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error(err);
            setIsPlaying(false);
          });
        }
      } else {
        setIsPlaying(true);
      }
    }
  };

  const playTrack = (track, newQueue = []) => {
    initAudioCtx();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn(e));
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    
    if (newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      setQueueIndex(idx);
    } else {
      setQueue([track]);
      setQueueIndex(0);
    }

    // Enregistrer dans l'historique de lecture
    setHistory(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const next = [track, ...filtered].slice(0, 50);
      localStorage.setItem('pandofy_history', JSON.stringify(next));
      return next;
    });
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setCurrentTime(0);
      return;
    }
    
    if (isShuffle) {
      // Move through shuffled indices
      const nextPos = (shufflePos + 1) % shuffledIndices.length;
      if (nextPos === 0 && repeatMode === 'off') {
        setIsPlaying(false);
        audioRef.current.pause();
        return;
      }
      setShufflePos(nextPos);
      const nextIdx = shuffledIndices[nextPos];
      setQueueIndex(nextIdx);
      setCurrentTrack(queue[nextIdx]);
      setIsPlaying(true);
      return;
    }
    
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        audioRef.current.pause();
        return;
      }
    }
    setQueueIndex(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    
    // If more than 3 seconds played, restart current track
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode !== 'off' ? queue.length - 1 : 0;
    }
    setQueueIndex(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    nextTrack();
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Toggle shuffle — generates Fisher-Yates indices when turning on
  const toggleShuffle = () => {
    const newShuffle = !isShuffle;
    setIsShuffle(newShuffle);
    if (newShuffle && queue.length > 0) {
      const indices = fisherYates(queue);
      // Put current track first
      const currentIdx = indices.indexOf(queueIndex);
      if (currentIdx > 0) {
        indices.splice(currentIdx, 1);
        indices.unshift(queueIndex);
      }
      setShuffledIndices(indices);
      setShufflePos(0);
    }
  };

  // Cycle repeat: off -> all -> one -> off
  const cycleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  // Queue management functions
  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
  };

  const playNext = (track) => {
    setQueue(prev => {
      const next = [...prev];
      next.splice(queueIndex + 1, 0, track);
      return next;
    });
  };

  const removeFromQueue = (idx) => {
    setQueue(prev => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    if (idx < queueIndex) setQueueIndex(i => i - 1);
  };

  const reorderQueue = (newQueue) => {
    const currentTrackInNew = newQueue.findIndex(t => t.id === currentTrack?.id);
    setQueue(newQueue);
    if (currentTrackInNew !== -1) setQueueIndex(currentTrackInNew);
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(-1);
  };

  // Auth Operations
  const handleRegister = async (username, password, displayName, role) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, role }),
        signal: AbortSignal.timeout(8000) // 8s max — évite le chargement infini
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur d'inscription");
      }
      if (data.token) localStorage.setItem('pandofy_token', data.token);
      setUser(data);
      localStorage.setItem('pandofy_session_user', data.username);
      setShowAuthModal(false);
      triggerToast(`👋 Bienvenue sur Pandofy, ${data.displayName} !`);
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        throw new Error('Le serveur ne répond pas. Vérifiez qu\'il est bien lancé.');
      }
      throw e;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(8000) // 8s max — évite le chargement infini
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur d'authentification");
      }
      if (data.token) localStorage.setItem('pandofy_token', data.token);
      setUser(data);
      localStorage.setItem('pandofy_session_user', data.username);
      setShowAuthModal(false);
      triggerToast(`🔓 Ravis de vous revoir, ${data.displayName} !`);
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        throw new Error('Le serveur ne répond pas. Vérifiez qu\'il est bien lancé.');
      }
      throw e;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pandofy_session_user');
    localStorage.removeItem('pandofy_token');
    setActiveTab('home');
    triggerToast("👋 Vous êtes déconnecté");
  };

  // Profile customization update
  const updateProfile = async (displayName, bio, profileColor) => {
    if (!user) return;
    try {
      const res = await authFetch(`${API_URL}/api/users/${user.username}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ displayName, bio, profileColor })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de mise à jour");
      }
      setUser(data);
      triggerToast("🎨 Profil personnalisé avec succès !");
    } catch (e) {
      console.error(e);
      triggerToast("❌ Erreur lors de la mise à jour");
    }
  };

  // Publish sound via server MultiPart
  const uploadTrack = async (title, genre, audioFile, coverFile) => {
    if (!user || (user.role !== 'artist' && user.role !== 'developer' && user.role !== 'admin' && user.username !== 'cdeveloppeur')) {
      throw new Error("Seuls les artistes peuvent publier des musiques");
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('genre', genre);
    formData.append('artistId', user.username);
    formData.append('artistName', user.displayName);
    formData.append('audio', audioFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    try {
      const token = localStorage.getItem('pandofy_token');
      const res = await fetch(`${API_URL}/api/tracks`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de téléversement");
      }
      triggerToast(`🎶 Votre son "${title}" est publié en ligne !`);
      await refreshData();
      return data;
    } catch (e) {
      throw e;
    }
  };

  // Playlist Management
  const createNewPlaylist = async (name) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await authFetch(`${API_URL}/api/playlists`, {
        method: 'POST',
        body: JSON.stringify({ name, userId: user.username })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`📁 Playlist "${name}" créée !`);
        await refreshData();
        return data;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addTrackToPlaylist = async (playlistId, trackId) => {
    try {
      const res = await authFetch(`${API_URL}/api/playlists/${playlistId}/add`, {
        method: 'POST',
        body: JSON.stringify({ trackId })
      });
      if (res.ok) {
        triggerToast("🎵 Morceau ajouté à la playlist");
        await refreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deletePlaylist = async (playlistId) => {
    try {
      const res = await authFetch(`${API_URL}/api/playlists/${playlistId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast("🗑️ Playlist supprimée avec succès");
        await refreshData();
        if (activePlaylistId === playlistId) {
          setActivePlaylistId(null);
          setActiveTab('home');
        }
      } else {
        const data = await res.json();
        triggerToast(`❌ Erreur: ${data.error || 'Impossible de supprimer la playlist'}`);
      }
    } catch (e) {
      console.error(e);
      triggerToast("❌ Erreur lors de la suppression");
    }
  };

  // Like Song sync
  const toggleLike = async (trackId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await authFetch(`${API_URL}/api/tracks/${trackId}/like`, {
        method: 'POST',
        body: JSON.stringify({ username: user.username })
      });
      if (res.ok) {
        const data = await res.json();
        const liked = data.user.likedTracks.map(String).includes(String(trackId));
        triggerToast(liked ? "💖 Ajouté à vos Titres Likés" : "💔 Retiré de vos Titres Likés");
        setUser(data.user);
        await refreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Track (Developer / Admin only)
  const deleteTrack = async (trackId) => {
    if (!user) return;
    try {
      const res = await authFetch(`${API_URL}/api/tracks/${trackId}`, {
        method: 'DELETE'
        // username n'est plus nécessaire : le serveur l'identifie via le JWT
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast("🗑️ Morceau supprimé avec succès");
        if (currentTrack && String(currentTrack.id) === String(trackId)) {
          setCurrentTrack(null);
          setIsPlaying(false);
        }
        await refreshData();
      } else {
        triggerToast(`❌ Erreur: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      triggerToast("❌ Erreur de suppression");
    }
  };

  // Secure Subscription checkout
  const subscribeToPlan = async (planId, planTitle, price, cardNumber, cardHolder) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await authFetch(`${API_URL}/api/payments/subscribe`, {
        method: 'POST',
        body: JSON.stringify({
          username: user.username,
          planId,
          planTitle,
          price,
          cardNumber,
          cardHolder
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        triggerToast("🔒 Paiement validé. Activation technique en cours...");
        setShowPaymentModal(false);
        return data;
      } else {
        throw new Error(data.error || "Erreur de paiement");
      }
    } catch (e) {
      throw e;
    }
  };

  // Mark simulated emails as read
  const markMessagesAsRead = async () => {
    if (!user) return;
    try {
      const res = await authFetch(`${API_URL}/api/users/${user.username}/messages/read`, {
        method: 'POST'
      });
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle simulated OAuth popups callback messages
  useEffect(() => {
    const handleOAuthMessage = (event) => {
      if (event.data?.type === 'oauth-success') {
        const { data } = event.data;
        if (data.token) {
          localStorage.setItem('pandofy_token', data.token);
          setUser(data);
          localStorage.setItem('pandofy_session_user', data.username);
          setShowAuthModal(false);
          triggerToast(`🔓 Connecté avec succès via OAuth, ${data.displayName} !`);
          refreshData();
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const startOAuthFlow = (provider) => {
  const width = 800;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  const realProviders = ['google', 'discord'];
  const url = realProviders.includes(provider)
    ? `${API_URL}/api/auth/${provider}`
    : `${API_URL}/api/auth/oauth-mock?provider=${provider}`;
  window.open(
    url,
    `Connexion via ${provider}`,
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
  );
};

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      activePlaylistId,
      setActivePlaylistId,
      showUploadModal,
      setShowUploadModal,
      showSupportModal,
      setShowSupportModal,
      showAuthModal,
      setShowAuthModal,
      showPaymentModal,
      setShowPaymentModal,
      showPlaylistModal,
      setShowPlaylistModal,
      updateInfo,
      setUpdateInfo,
      selectedPlanForPayment,
      setSelectedPlanForPayment,
      toastMessage,
      user,
      setUser,
      tracks,
      setTracks,
      playlists,
      loading,
      currentTrack,
      setCurrentTrack,
      isPlaying,
      setIsPlaying,
      volume,
      setVolume,
      muted,
      setMuted,
      currentTime,
      setCurrentTime,
      duration,
      setDuration,
      queue,
      queueIndex,
      // Shuffle
      isShuffle,
      setIsShuffle,
      toggleShuffle,
      // Repeat
      repeatMode,
      setRepeatMode,
      cycleRepeat,
      isRepeat,
      setIsRepeat: cycleRepeat, // backward compat alias
      // Crossfade
      crossfadeDuration,
      setCrossfadeDuration,
      // Sleep timer
      sleepTimer,
      setSleepTimer,
      // Audio refs
      audioRef,
      audioBRef,
      // Playback
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      seek,
      // Queue management
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      // Auth
      handleRegister,
      handleLogin,
      handleLogout,
      startOAuthFlow,
      // Social
      toggleLike,
      deleteTrack,
      // Playlists
      createNewPlaylist,
      addTrackToPlaylist,
      deletePlaylist,
      // Upload
      uploadTrack,
      // Payments
      subscribeToPlan,
      // Profile
      updateProfile,
      // Messages
      markMessagesAsRead,
      // Visualizer
      analyserNode, // Now reactive state!
      initAudioCtx,
      // Server
      isServerActive,
      refreshData,
      loadMoreTracks,
      // Utils
      formatDuration,
      // Newly Added Audit Values
      history,
      setHistory,
      themeAccent,
      setThemeAccent
    }}>
      {children}
    </AppContext.Provider>
  );
};
