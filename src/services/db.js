import { API_BASE } from '../utils/api';
const API_URL = API_BASE;
import { authFetch } from '../utils/authFetch';

// We maintain IndexedDB code as a transparent fallback in case the server is offline!
import { 
  openDB, 
  getUsers as localGetUsers, 
  getUser as localGetUser, 
  saveUser as localSaveUser, 
  getTracks as localGetTracks, 
  saveTrack as localSaveTrack, 
  deleteTrack as localDeleteTrack, 
  getPlaylists as localGetPlaylists, 
  savePlaylist as localSavePlaylist, 
  deletePlaylist as localDeletePlaylist, 
  seedDatabaseIfEmpty as localSeedDatabaseIfEmpty 
} from './db_indexeddb_fallback';

export async function isServerOnline() {
  try {
    const res = await fetch(`${API_URL}/api/tracks`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch (e) {
    return false;
  }
}


// -------------------------------------------------------------
// REST API wrappers with transparent IndexedDB fallback
// -------------------------------------------------------------

export async function getUsers() {
  return localGetUsers();
}

export async function getUser(username) {
  try {
    const res = await fetch(`${API_URL}/api/users/${username}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server offline, reading user from local IndexedDB fallback.");
  }
  return localGetUser(username);
}

export async function saveUser(user) {
  try {
    const res = await authFetch(`${API_URL}/api/users/${user.username}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        displayName: user.displayName,
        bio: user.bio,
        profileColor: user.profileColor
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server offline, saving user to local IndexedDB fallback.");
  }

  return localSaveUser(user);
}

export async function getTracks() {
  try {
    const res = await fetch(`${API_URL}/api/tracks`);
    if (res.ok) {
      const data = await res.json();
      // Handle both paginated {tracks:[]} and legacy array response
      const serverTracks = Array.isArray(data) ? data : (data?.tracks || []);
      return serverTracks.map(t => ({
        ...t,
        audioUrl: t.audioUrl?.startsWith('/uploads') ? `${API_URL}${t.audioUrl}` : t.audioUrl,
        coverUrl: t.coverUrl?.startsWith('/uploads') ? `${API_URL}${t.coverUrl}` : t.coverUrl
      }));
    }
  } catch (e) {
    console.warn("Server offline, fetching local tracks from IndexedDB fallback.");
  }
  return localGetTracks();
}

export async function saveTrack(track) {
  return localSaveTrack(track);
}

export async function deleteTrack(trackId) {
  return localDeleteTrack(trackId);
}

export async function getPlaylists() {
  try {
    const res = await fetch(`${API_URL}/api/playlists`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server offline, fetching local playlists from IndexedDB fallback.");
  }

  return localGetPlaylists();
}

export async function savePlaylist(playlist) {
  try {
    const res = await fetch(`${API_URL}/api/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: playlist.name,
        userId: playlist.userId
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server offline, saving playlist to IndexedDB fallback.");
  }

  return localSavePlaylist(playlist);
}

export async function deletePlaylist(playlistId) {
  return localDeletePlaylist(playlistId);
}

export async function seedDatabaseIfEmpty() {
  await localSeedDatabaseIfEmpty();
}
