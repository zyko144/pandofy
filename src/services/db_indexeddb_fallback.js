const DB_NAME = 'pandofy_db';
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }

      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
        trackStore.createIndex('uploadDate', 'uploadDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Database Helpers
export async function getUsers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getUser(username) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(username.toLowerCase().trim());
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveUser(user) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    user.username = user.username.toLowerCase().trim();
    const request = store.put(user);
    request.onsuccess = () => resolve(user);
    request.onerror = () => reject(request.error);
  });
}

export async function getTracks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readonly');
    const store = transaction.objectStore('tracks');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => b.uploadDate - a.uploadDate);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.put(track);
    request.onsuccess = () => resolve({ ...track, id: request.result });
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrack(trackId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.delete(trackId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlaylists() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('playlists', 'readonly');
    const store = transaction.objectStore('playlists');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylist(playlist) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('playlists', 'readwrite');
    const store = transaction.objectStore('playlists');
    const request = store.put(playlist);
    request.onsuccess = () => resolve({ ...playlist, id: request.result });
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlaylist(playlistId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('playlists', 'readwrite');
    const store = transaction.objectStore('playlists');
    const request = store.delete(playlistId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function seedDatabaseIfEmpty() {
  const tracks = await getTracks();
  if (tracks.length > 0) return;

  const defaultTracks = [
    {
      title: "Neon Horizon",
      artistName: "Pandofy Beats",
      genre: "Electro House",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=60",
      likes: 42,
      plays: 1204,
      uploadDate: Date.now() - 1000 * 60 * 60 * 24 * 3,
      isDefault: true
    },
    {
      title: "Solitude Groove",
      artistName: "Lofi Cafe",
      genre: "Lo-Fi",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
      likes: 85,
      plays: 3519,
      uploadDate: Date.now() - 1000 * 60 * 60 * 24 * 2,
      isDefault: true
    },
    {
      title: "Amber Skyline",
      artistName: "Sunset Rider",
      genre: "Synthwave",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      likes: 121,
      plays: 8902,
      uploadDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
      isDefault: true
    }
  ];

  for (const track of defaultTracks) {
    await saveTrack(track);
  }

  const adminArtist = {
    username: "zyko921",
    displayName: "ZYKO921",
    password: "password123",
    role: "artist",
    premiumStatus: "premium_individual",
    bio: "Créateur de Pandofy - Bienvenue sur mon profil !",
    profileColor: "#FF6600",
    avatarSeed: "zyko",
    playlists: [],
    likedTracks: [],
    messages: []
  };

  const adminListener = {
    username: "auditeur",
    displayName: "Auditeur Test",
    password: "password123",
    role: "listener",
    premiumStatus: "none",
    bio: "Mélomane passionné",
    profileColor: "#A7A7A7",
    avatarSeed: "auditeur",
    playlists: [],
    likedTracks: [],
    messages: []
  };

  await saveUser(adminArtist);
  await saveUser(adminListener);
}
