import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parseFile } from 'music-metadata';
import { v2 as cloudinary } from 'cloudinary';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── LOAD ENV FILE MANUALLY ──────────────────────────────────
function loadEnv(envPath) {
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
      console.log(`[ENV] Loaded environment variables from: ${envPath}`);
    }
  } catch (err) {
    console.warn('[ENV] Error loading env file:', err.message);
  }
}

const possiblePaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  'C:/Users/noamb/.gemini/antigravity/scratch/pandofy/.env'
];
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    loadEnv(p);
    break;
  }
}

// ─── JWT SECRET ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const g = crypto.randomBytes(64).toString('hex');
  console.warn('[SECURITY] JWT_SECRET non défini — clé temporaire générée.');
  return g;
})();

// ─── STORAGE ─────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const USE_CLOUDINARY = !!process.env.CLOUDINARY_URL;
if (!USE_CLOUDINARY && !fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── DATABASE (PostgreSQL or SQLite fallback) ─────────────────
let dbQuery, dbGet, dbRun;

const sqlInitSchema = `
  CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    "displayName" TEXT,
    password      TEXT,
    role          TEXT,
    "premiumStatus" TEXT DEFAULT 'none',
    bio           TEXT,
    "profileColor" TEXT DEFAULT '#FF6600',
    "avatarSeed"  TEXT,
    email         TEXT
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id          BIGINT PRIMARY KEY,
    title       TEXT,
    "artistId"  TEXT,
    "artistName" TEXT,
    genre       TEXT,
    "audioUrl"  TEXT,
    "coverUrl"  TEXT,
    likes       INTEGER DEFAULT 0,
    plays       INTEGER DEFAULT 0,
    "uploadDate" BIGINT,
    "isDefault" INTEGER DEFAULT 0,
    duration    INTEGER DEFAULT 0,
    format      TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id       BIGINT PRIMARY KEY,
    name     TEXT,
    "userId" TEXT,
    "coverUrl" TEXT
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    "playlistId" BIGINT,
    "trackId"    BIGINT,
    PRIMARY KEY ("playlistId", "trackId")
  );

  CREATE TABLE IF NOT EXISTS liked_tracks (
    username TEXT,
    "trackId" BIGINT,
    PRIMARY KEY (username, "trackId")
  );

  CREATE TABLE IF NOT EXISTS messages (
    id       BIGINT PRIMARY KEY,
    username TEXT,
    sender   TEXT,
    subject  TEXT,
    body     TEXT,
    date     BIGINT,
    read     INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    "transactionId" TEXT PRIMARY KEY,
    username        TEXT,
    "planId"        TEXT,
    "planTitle"     TEXT,
    price           REAL,
    date            BIGINT,
    "paymentMethod" TEXT,
    status          TEXT
  );
`;

if (process.env.DATABASE_URL) {
  console.log('[DATABASE] Mode PostgreSQL activé');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
  });
  dbQuery = async (sql, params = []) => (await pool.query(sql, params)).rows;
  dbGet = async (sql, params = []) => (await pool.query(sql, params)).rows[0] || null;
  dbRun = async (sql, params = []) => await pool.query(sql, params);
  
  await pool.query(sqlInitSchema);
} else {
  console.log('[DATABASE] Mode SQLite (local) activé');
  const Database = (await import('better-sqlite3')).default;
  const SQLITE_FILE = path.join(__dirname, 'server', 'pandofy.db');
  const sqliteDb = new Database(SQLITE_FILE);
  
  const translateSql = (sql) => {
    return sql.replace(/\$\d+/g, '?').replace(/ILIKE/gi, 'LIKE');
  };
  
  dbQuery = async (sql, params = []) => {
    try {
      return sqliteDb.prepare(translateSql(sql)).all(...params);
    } catch (err) {
      console.error("[SQLITE ERROR] dbQuery:", err, "\nSQL:", translateSql(sql));
      throw err;
    }
  };
  dbGet = async (sql, params = []) => {
    try {
      return sqliteDb.prepare(translateSql(sql)).get(...params) || null;
    } catch (err) {
      console.error("[SQLITE ERROR] dbGet:", err, "\nSQL:", translateSql(sql));
      throw err;
    }
  };
  dbRun = async (sql, params = []) => {
    try {
      return sqliteDb.prepare(translateSql(sql)).run(...params);
    } catch (err) {
      console.error("[SQLITE ERROR] dbRun:", err, "\nSQL:", translateSql(sql));
      throw err;
    }
  };
  
  sqliteDb.exec(sqlInitSchema);
}

// ─── SEED DEFAULT USERS ──────────────────────────────────────
const SALT = 10;
const defaultUsers = [
  { username: 'cdeveloppeur', displayName: 'cdeveloppeur', password: 'cdeveloppeur', role: 'developer', premiumStatus: 'premium_individual', bio: 'Compte Développeur Officiel', profileColor: '#FF4400', avatarSeed: 'developer' },
  { username: 'zyko921', displayName: 'ZYKO921', password: 'password123', role: 'artist', premiumStatus: 'premium_individual', bio: 'Créateur de Pandofy', profileColor: '#FF6600', avatarSeed: 'zyko' },
  { username: 'pandofy', displayName: 'Pandofy', password: 'password123', role: 'admin', premiumStatus: 'premium_individual', bio: 'Compte Officiel Pandofy', profileColor: '#FF6600', avatarSeed: 'pandofy' },
  { username: 'zyko59430', displayName: 'Zyko59430', password: 'password123', role: 'artist', premiumStatus: 'premium_individual', bio: 'Co-créateur de Pandofy', profileColor: '#FF6600', avatarSeed: 'zyko' },
];
for (const u of defaultUsers) {
  const hashed = await bcrypt.hash(u.password, SALT);
  await dbRun(
    `INSERT INTO users (username, "displayName", password, role, "premiumStatus", bio, "profileColor", "avatarSeed") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [u.username, u.displayName, hashed, u.role, u.premiumStatus, u.bio, u.profileColor, u.avatarSeed]
  );
}
console.log('[SEED] Utilisateurs par défaut configurés');

// ─── BCRYPT MIGRATION ─────────────────────────────────────────
const allUsers = await dbQuery('SELECT username, password FROM users');
for (const u of allUsers) {
  let needsHash = false;
  try { bcrypt.getRounds(u.password); } catch { needsHash = true; }
  if (needsHash) {
    const hashed = await bcrypt.hash(u.password, 10);
    await dbRun('UPDATE users SET password = $1 WHERE username = $2', [hashed, u.username]);
  }
}

// ─── HELPER: Build user object ────────────────────────────────
async function buildUserObject(username) {
  const user = await dbGet('SELECT * FROM users WHERE username = $1', [username]);
  if (!user) return null;
  const likedTracks = (await dbQuery('SELECT "trackId" FROM liked_tracks WHERE username = $1', [username])).map(r => r.trackId);
  const messages = await dbQuery('SELECT * FROM messages WHERE username = $1 ORDER BY date DESC', [username]);
  const playlists = (await dbQuery('SELECT id FROM playlists WHERE "userId" = $1', [username])).map(r => r.id);
  const { password, ...safe } = user;
  return { ...safe, likedTracks, messages, playlists };
}

function buildTrackObject(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, artistId: row.artistId || row['artistId'],
    artistName: row.artistName || row['artistName'], genre: row.genre,
    audioUrl: row.audioUrl || row['audioUrl'], coverUrl: row.coverUrl || row['coverUrl'],
    likes: row.likes || 0, plays: row.plays || 0, uploadDate: row.uploadDate || row['uploadDate'],
    isDefault: !!(row.isDefault || row['isDefault']), duration: row.duration || 0, format: row.format || ''
  };
}

// ─── WELCOME MESSAGE ─────────────────────────────────────────
async function sendWelcomeMessage(username, displayName) {
  const msgId = Date.now();
  const body = `Bonjour ${displayName} !\n\nBienvenue sur Pandofy ! Vous pouvez maintenant écouter de la musique, créer des playlists, et publier vos propres sons.\n\nBonne écoute !\nL'équipe Pandofy`;
  await dbRun(
    `INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES ($1,$2,$3,$4,$5,$6,0)`,
    [msgId, username, 'bienvenue@pandofy.app', 'Bienvenue sur Pandofy !', body, Date.now()]
  );
}

const playsCooldown = new Map();

// ─── EXPRESS APP ─────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (!USE_CLOUDINARY) {
  app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (res, path) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));
}

// ─── JWT MIDDLEWARE ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(authHeader.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token invalide ou expiré' }); }
}

// ─── MULTER ──────────────────────────────────────────────────
const audioTypes = ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'];
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio' && !audioTypes.includes(file.mimetype)) return cb(new Error(`Format audio non supporté`));
  if (file.fieldname === 'cover' && !imageTypes.includes(file.mimetype)) return cb(new Error('Format image non supporté'));
  cb(null, true);
};

let uploadStorage;
if (USE_CLOUDINARY) {
  const { CloudinaryStorage } = await import('multer-storage-cloudinary');
  uploadStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: 'pandofy',
      resource_type: file.fieldname === 'audio' ? 'video' : 'image',
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`
    })
  });
  console.log('[STORAGE] Mode Cloudinary activé');
} else {
  uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });
}

const upload = multer({ storage: uploadStorage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

function mimeToFormat(mimetype) {
  const map = { 'audio/mpeg': 'MP3', 'audio/flac': 'FLAC', 'audio/wav': 'WAV', 'audio/ogg': 'OGG', 'audio/x-m4a': 'M4A', 'audio/mp4': 'M4A' };
  return map[mimetype] || 'AUDIO';
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// ─── AUTH ────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName) return res.status(400).json({ error: 'Tous les champs sont requis' });
    const lower = username.toLowerCase().trim();
    const existing = await dbGet('SELECT username FROM users WHERE username = $1', [lower]);
    if (existing) return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
    const hashed = await bcrypt.hash(password, 10);
    await dbRun(
      `INSERT INTO users (username, "displayName", password, role, "premiumStatus", bio, "profileColor", "avatarSeed") VALUES ($1,$2,$3,$4,'none',$5,'#FF6600',$6)`,
      [lower, displayName, hashed, role || 'listener', 'Passionné(e) de musique rejoignant Pandofy.', lower]
    );
    await sendWelcomeMessage(lower, displayName);
    const safeUser = await buildUserObject(lower);
    const token = jwt.sign({ username: lower, role: safeUser.role, premiumStatus: safeUser.premiumStatus }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ ...safeUser, token });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur lors de l'inscription" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    const userRow = await dbGet('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    if (!userRow) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const match = await bcrypt.compare(password, userRow.password);
    if (!match) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const safeUser = await buildUserObject(userRow.username);
    const token = jwt.sign({ username: userRow.username, role: userRow.role, premiumStatus: userRow.premiumStatus }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ...safeUser, token });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur lors de la connexion" }); }
});

// ─── TRACKS SEARCH ───────────────────────────────────────────
app.get('/api/tracks/search', async (req, res) => {
  try {
    const { q = '', genre, sort } = req.query;
    const pattern = `%${q}%`;
    let sql = `SELECT * FROM tracks WHERE (title ILIKE $1 OR "artistName" ILIKE $1 OR genre ILIKE $1)`;
    const params = [pattern];
    if (genre) { sql += ` AND genre = $2`; params.push(genre); }
    const sortMap = { plays: '"plays" DESC', likes: '"likes" DESC', date: '"uploadDate" DESC' };
    sql += ` ORDER BY ${sortMap[sort] || '"uploadDate" DESC'}`;
    const rows = await dbQuery(sql, params);
    res.json(rows.map(buildTrackObject));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur recherche' }); }
});

// ─── TRACKS ──────────────────────────────────────────────────
app.get('/api/tracks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;
    const rows = await dbQuery(`SELECT * FROM tracks ORDER BY "uploadDate" DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const total = (await dbGet('SELECT COUNT(*) as c FROM tracks')).c;
    res.json({ tracks: rows.map(buildTrackObject), total: parseInt(total), limit, offset });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur récupération pistes' }); }
});

app.post('/api/tracks', requireAuth, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, genre, artistId, artistName } = req.body;
    if (!title || !genre || !artistId || !artistName) return res.status(400).json({ error: 'Données incomplètes' });
    const audioFiles = req.files?.['audio'];
    if (!audioFiles?.length) return res.status(400).json({ error: 'Fichier audio requis' });
    const audioFile = audioFiles[0];
    const audioUrl = USE_CLOUDINARY ? audioFile.path : `/uploads/${audioFile.filename}`;
    const format = mimeToFormat(audioFile.mimetype);
    const coverFiles = req.files?.['cover'];
    const coverUrl = coverFiles?.length
      ? (USE_CLOUDINARY ? coverFiles[0].path : `/uploads/${coverFiles[0].filename}`)
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
    let duration = 0;
    if (!USE_CLOUDINARY) {
      try {
        const meta = await parseFile(path.join(UPLOADS_DIR, audioFile.filename));
        duration = Math.round(meta.format.duration || 0);
      } catch {}
    }
    const id = Date.now();
    await dbRun(
      `INSERT INTO tracks (id, title, "artistId", "artistName", genre, "audioUrl", "coverUrl", likes, plays, "uploadDate", "isDefault", duration, format) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,0,$9,$10)`,
      [id, title, artistId, artistName, genre, audioUrl, coverUrl, Date.now(), duration, format]
    );
    const track = buildTrackObject(await dbGet('SELECT * FROM tracks WHERE id = $1', [id]));
    res.status(201).json(track);
  } catch (err) {
    if (err.message?.includes('Format')) return res.status(400).json({ error: err.message });
    console.error(err); res.status(500).json({ error: 'Erreur upload' });
  }
});

app.delete('/api/tracks/:id', requireAuth, async (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const username = req.user.username;
    const userRow = await dbGet('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!userRow) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const track = await dbGet('SELECT * FROM tracks WHERE id = $1', [trackId]);
    if (!track) return res.status(404).json({ error: 'Morceau introuvable' });
    const isAuthorized = userRow.username === 'cdeveloppeur' || userRow.role === 'developer' || userRow.role === 'admin' || userRow.username === (track.artistId || track['artistId']);
    if (!isAuthorized) return res.status(403).json({ error: 'Permission refusée.' });
    await dbRun('DELETE FROM tracks WHERE id = $1', [trackId]);
    await dbRun('DELETE FROM liked_tracks WHERE "trackId" = $1', [trackId]);
    await dbRun('DELETE FROM playlist_tracks WHERE "trackId" = $1', [trackId]);
    res.json({ success: true, deletedTrack: buildTrackObject(track) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur suppression' }); }
});

// ─── YOUTUBE URL UPLOAD ──────────────────────────────────────
app.post('/api/tracks/youtube', requireAuth, async (req, res) => {
  try {
    const { title, genre, artistId, artistName, youtubeUrl, coverUrl } = req.body;
    if (!title || !genre || !artistId || !artistName || !youtubeUrl) return res.status(400).json({ error: 'Tous les champs requis' });
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
    if (!ytRegex.test(youtubeUrl)) return res.status(400).json({ error: 'Lien YouTube invalide' });
    const ytIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    const ytId = ytIdMatch?.[1];
    const finalCoverUrl = coverUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
    const audioUrl = `yt:${youtubeUrl}`;
    const id = Date.now();
    await dbRun(
      `INSERT INTO tracks (id, title, "artistId", "artistName", genre, "audioUrl", "coverUrl", likes, plays, "uploadDate", "isDefault", duration, format) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,0,0,'YouTube')`,
      [id, title, artistId, artistName, genre, audioUrl, finalCoverUrl, Date.now()]
    );
    const track = buildTrackObject(await dbGet('SELECT * FROM tracks WHERE id = $1', [id]));
    res.status(201).json(track);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur ajout YouTube' }); }
});

// ─── LIKES ───────────────────────────────────────────────────
app.post('/api/tracks/:id/like', requireAuth, async (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username requis' });
    const userRow = await dbGet('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    const trackRow = await dbGet('SELECT * FROM tracks WHERE id = $1', [trackId]);
    if (!userRow || !trackRow) return res.status(404).json({ error: 'Introuvable' });
    const alreadyLiked = await dbGet('SELECT 1 FROM liked_tracks WHERE username = $1 AND "trackId" = $2', [username, trackId]);
    if (alreadyLiked) {
      await dbRun('DELETE FROM liked_tracks WHERE username = $1 AND "trackId" = $2', [username, trackId]);
      await dbRun('UPDATE tracks SET likes = GREATEST(0, likes - 1) WHERE id = $1', [trackId]);
    } else {
      await dbRun('INSERT INTO liked_tracks (username, "trackId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [username, trackId]);
      await dbRun('UPDATE tracks SET likes = likes + 1 WHERE id = $1', [trackId]);
    }
    const updatedTrack = buildTrackObject(await dbGet('SELECT * FROM tracks WHERE id = $1', [trackId]));
    const safeUser = await buildUserObject(username);
    res.json({ user: safeUser, track: updatedTrack });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur like' }); }
});

// ─── PLAYS ───────────────────────────────────────────────────
app.post('/api/tracks/:id/play', async (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const { username } = req.body;
    const key = `${username || 'anon'}:${trackId}`;
    const lastPlay = playsCooldown.get(key) || 0;
    if (Date.now() - lastPlay < 30000) return res.json({ skipped: true });
    playsCooldown.set(key, Date.now());
    await dbRun('UPDATE tracks SET plays = plays + 1 WHERE id = $1', [trackId]);
    const updated = await dbGet('SELECT plays FROM tracks WHERE id = $1', [trackId]);
    res.json({ plays: updated?.plays || 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur plays' }); }
});

// ─── ADMIN CLEAR TRACKS ──────────────────────────────────────
app.get('/api/admin/clear-tracks', async (req, res) => {
  if (req.query.secret !== 'pandofy-admin-2026') return res.status(403).json({ error: 'Non autorisé' });
  await dbRun('DELETE FROM tracks');
  await dbRun('DELETE FROM liked_tracks');
  await dbRun('DELETE FROM playlist_tracks');
  res.json({ success: true, message: 'Tous les sons supprimés !' });
});

// ─── VERSION ─────────────────────────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.2.9',
    changelog: [
      '⚙️ Intégration d\'un chargeur d\'.env natif au démarrage du serveur backend pour lire les clés d\'API Google',
      '🛠️ Fix du bouton de suppression de playlist (implémentation de la fonction deletePlaylist dans le contexte client)',
      '📦 Migration complète de l\'archive d\'exécution (désactivation ASAR pour stabiliser le chargeur Node ESM et SQLite native)',
      '🛡️ Fix du démarrage du serveur local en processus séparé (correctif bug ASAR de chargement ESM et blocages de ports)',
      '🌐 Remplacement des emojis de connexion sociale par les vrais logos de marque (Google, GitHub, Discord, Apple)',
      '🔑 Connexion via de vrais comptes Google (OAuth 2.0) avec invite de sélection de compte',
      '⚡ Élimination totale de la latence de chargement et de buffering audio',
      '🎨 Icône d\'application officielle personnalisée (croche orange 3D) sous Windows',
      '🏷️ Application renommée en pandofy (minuscules)',
      '📍 Logo de démarrage recentré mathématiquement',
      '⚡ Latence audio de démarrage totalement éliminée',
      '🎵 Nouveau Logo de démarrage (croche orange unique) sans cercle',
      '🎵 Import YouTube et Lecture optimisés',
      '✨ Animation épurée et Logo Cinématique au démarrage',
      '⚡ Fluidité extrême et réduction de la latence (optimisé pour tous les PC)',
      '🎨 Thèmes d\'accentuation dynamiques sans nuances orange résiduelles',
      '🛠️ Nouveau Help Center interactif avec FAQ double colonne',
      '📊 Onglets inspirés de Spotify : Découverte, Tendances, Historique, Paramètres',
      '🛡️ Stabilité renforcée : Résolution des conflits de ports au démarrage',
    ]
  });
});

// ─── DOWNLOAD SETUP ──────────────────────────────────────────
app.get('/download', (req, res) => {
  const distDesktopDir = path.join(__dirname, 'dist-desktop');
  if (fs.existsSync(distDesktopDir)) {
    const files = fs.readdirSync(distDesktopDir);
    const setupFile = files.find(f => f.toLowerCase().startsWith('pandofy setup') && f.endsWith('.exe'));
    if (setupFile) {
      return res.download(path.join(distDesktopDir, setupFile));
    }
  }
  res.status(404).send('Setup file not found');
});

// ─── USERS ───────────────────────────────────────────────────
app.get('/api/users/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const rows = await dbQuery(
      `SELECT username, "displayName", role, "premiumStatus", bio, "profileColor", "avatarSeed" FROM users WHERE "displayName" ILIKE $1 OR username ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erreur recherche utilisateurs' }); }
});

app.get('/api/users/:username', async (req, res) => {
  try {
    const safeUser = await buildUserObject(req.params.username.toLowerCase());
    if (!safeUser) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(safeUser);
  } catch (err) { res.status(500).json({ error: 'Erreur profil' }); }
});

app.put('/api/users/:username/profile', requireAuth, async (req, res) => {
  try {
    const target = req.params.username.toLowerCase();
    const { displayName, bio, profileColor } = req.body;
    await dbRun(
      `UPDATE users SET "displayName" = COALESCE($1, "displayName"), bio = COALESCE($2, bio), "profileColor" = COALESCE($3, "profileColor") WHERE username = $4`,
      [displayName || null, bio !== undefined ? bio : null, profileColor || null, target]
    );
    res.json(await buildUserObject(target));
  } catch (err) { res.status(500).json({ error: 'Erreur profil' }); }
});

// ─── PLAYLISTS ───────────────────────────────────────────────
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await dbQuery('SELECT * FROM playlists');
    const result = await Promise.all(playlists.map(async pl => {
      const trackIds = (await dbQuery('SELECT "trackId" FROM playlist_tracks WHERE "playlistId" = $1', [pl.id])).map(r => r.trackId);
      return { ...pl, trackIds };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Erreur playlists' }); }
});

app.post('/api/playlists', requireAuth, async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ error: 'Données incomplètes' });
    const id = Date.now();
    const coverUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60';
    await dbRun('INSERT INTO playlists (id, name, "userId", "coverUrl") VALUES ($1,$2,$3,$4)', [id, name, userId, coverUrl]);
    res.status(201).json({ id, name, userId, coverUrl, trackIds: [] });
  } catch (err) { res.status(500).json({ error: 'Erreur création playlist' }); }
});

app.post('/api/playlists/:id/add', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'Track ID requis' });
    const playlist = await dbGet('SELECT * FROM playlists WHERE id = $1', [playlistId]);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });
    await dbRun('INSERT INTO playlist_tracks ("playlistId", "trackId") VALUES ($1,$2) ON CONFLICT DO NOTHING', [playlistId, trackId]);
    const count = (await dbGet('SELECT COUNT(*) as c FROM playlist_tracks WHERE "playlistId" = $1', [playlistId])).c;
    if (parseInt(count) === 1) {
      const track = await dbGet('SELECT "coverUrl" FROM tracks WHERE id = $1', [trackId]);
      if (track) await dbRun('UPDATE playlists SET "coverUrl" = $1 WHERE id = $2', [track.coverUrl, playlistId]);
    }
    const updated = await dbGet('SELECT * FROM playlists WHERE id = $1', [playlistId]);
    const trackIds = (await dbQuery('SELECT "trackId" FROM playlist_tracks WHERE "playlistId" = $1', [playlistId])).map(r => r.trackId);
    res.json({ ...updated, trackIds });
  } catch (err) { res.status(500).json({ error: 'Erreur ajout playlist' }); }
});

app.delete('/api/playlists/:id', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const username = req.user.username;
    const playlist = await dbGet('SELECT * FROM playlists WHERE id = $1', [playlistId]);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });
    const ownerId = playlist.userId || playlist['userId'];
    const userRow = await dbGet('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    const isOwner = ownerId === username;
    const isAdmin = userRow && (userRow.role === 'admin' || userRow.role === 'developer' || username === 'cdeveloppeur');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Permission refusée.' });
    await dbRun('DELETE FROM playlist_tracks WHERE "playlistId" = $1', [playlistId]);
    await dbRun('DELETE FROM playlists WHERE id = $1', [playlistId]);
    res.json({ success: true, deletedPlaylistId: playlistId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur suppression playlist' }); }
});

// ─── PAYMENTS ────────────────────────────────────────────────
app.post('/api/payments/subscribe', requireAuth, async (req, res) => {
  try {
    const { username, planId, planTitle, price, cardNumber } = req.body;
    if (!username || !planId || !planTitle || !price) return res.status(400).json({ error: 'Paramètres manquants' });
    const userRow = await dbGet('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!userRow) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await dbRun('UPDATE users SET "premiumStatus" = $1 WHERE username = $2', [`pending_${planId}`, userRow.username]);
    const transactionId = 'TXN-' + Math.floor(Math.random() * 1e9);
    const maskedCard = cardNumber ? `•••• •••• •••• ${cardNumber.slice(-4)}` : 'PayPal (zyko921)';
    await dbRun(
      `INSERT INTO payments ("transactionId", username, "planId", "planTitle", price, date, "paymentMethod", status) VALUES ($1,$2,$3,$4,$5,$6,$7,'Verified')`,
      [transactionId, userRow.username, planId, planTitle, price, Date.now(), maskedCard]
    );
    const receiptId = Date.now() + 1;
    await dbRun(
      `INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES ($1,$2,$3,$4,$5,$6,0)`,
      [receiptId, userRow.username, 'facturation@pandofy.app', `Reçu - ${planTitle}`, `Paiement de ${price}€ confirmé.\nTransaction: ${transactionId}`, Date.now()]
    );
    const safeUser = await buildUserObject(userRow.username);
    const payment = await dbGet('SELECT * FROM payments WHERE "transactionId" = $1', [transactionId]);
    res.json({ success: true, user: safeUser, transaction: payment, emailAlert: 'Reçu envoyé !' });
    setTimeout(async () => {
      try {
        const liveUser = await dbGet('SELECT * FROM users WHERE username = $1', [userRow.username]);
        if (liveUser?.premiumStatus === `pending_${planId}`) {
          await dbRun('UPDATE users SET "premiumStatus" = $1 WHERE username = $2', [planId, userRow.username]);
          const activId = Date.now() + 2;
          await dbRun(
            `INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES ($1,$2,$3,$4,$5,$6,0)`,
            [activId, userRow.username, 'welcome@pandofy.app', `${planTitle} Activé !`, `Votre abonnement ${planTitle} est maintenant actif !`, Date.now()]
          );
        }
      } catch {}
    }, 10000);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur paiement' }); }
});

// ─── MESSAGES ────────────────────────────────────────────────
app.post('/api/users/:username/messages/read', requireAuth, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    await dbRun('UPDATE messages SET read = 1 WHERE username = $1', [username]);
    res.json(await buildUserObject(username));
  } catch (err) { res.status(500).json({ error: 'Erreur messages' }); }
});

// ─── SUPPORT ─────────────────────────────────────────────────
app.post('/api/support', async (req, res) => {
  try {
    const { category, message, email, username } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const msgId = Date.now();
    const body = `Catégorie: ${category || 'Non spécifié'}\nUtilisateur: ${username}\nEmail: ${email || 'Non renseigné'}\n\nMessage:\n${message}`;
    
    // Insérer pour les deux comptes de support : pandofy et zyko59430
    await dbRun(
      `INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES ($1,$2,$3,$4,$5,$6,0)`,
      [msgId, 'pandofy', email || `${username}@pandofy.app`, `[SUPPORT] ${category || 'Message'}`, body, Date.now()]
    );
    await dbRun(
      `INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES ($1,$2,$3,$4,$5,$6,0)`,
      [msgId + 1, 'zyko59430', email || `${username}@pandofy.app`, `[SUPPORT] ${category || 'Message'}`, body, Date.now()]
    );
    
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur envoi support' }); }
});

// ─── REAL GOOGLE OAUTH ───────────────────────────────────────
app.get('/api/auth/google', (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Configuration Requise — Google OAuth</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0d0d0d;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #181818;
            border-radius: 16px;
            border: 1px solid rgba(255,102,0,0.2);
            padding: 40px;
            width: 480px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
          }
          .logo {
            font-size: 48px;
            margin-bottom: 24px;
            text-align: center;
          }
          h2 {
            margin: 0 0 16px 0;
            font-size: 22px;
            font-weight: 800;
            color: #FF6600;
            text-align: center;
          }
          p {
            color: #a7a7a7;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .code-block {
            background: #000;
            border-radius: 8px;
            padding: 16px;
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            color: #00FF66;
            overflow-x: auto;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.05);
          }
          .btn-close {
            display: block;
            width: 100%;
            background: #FF6600;
            border: none;
            border-radius: 10px;
            padding: 14px;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
            text-align: center;
            text-decoration: none;
          }
          .btn-close:hover {
            background: #e05500;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">⚙️</div>
          <h2>Configuration de Google OAuth</h2>
          <p>
            Pour activer la connexion avec de vrais comptes Google, vous devez configurer les clés API de Google.
            Créez un projet sur la <strong>Console Google Cloud</strong> et ajoutez les variables suivantes à votre fichier <code>.env</code> :
          </p>
          <div class="code-block">
GOOGLE_CLIENT_ID=votre_client_id_google<br>
GOOGLE_CLIENT_SECRET=votre_client_secret_google
          </div>
          <p style="font-size: 12px; color: #777;">
            <strong>URI de redirection autorisé :</strong><br>
            <code>${redirectUri}</code>
          </p>
          <button class="btn-close" onclick="window.close()">Fermer cette fenêtre</button>
        </div>
      </body>
      </html>
    `);
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}` +
    `&prompt=select_account`;
  
  res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    console.error("Google Auth error:", error);
    return res.status(400).send(`Erreur Google Auth: ${error}`);
  }
  if (!code) {
    return res.status(400).send("Code d'autorisation manquant.");
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Error exchanging code:", errText);
      return res.status(500).send(`Erreur lors de l'échange du jeton Google: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      const errText = await userinfoResponse.text();
      console.error("Error fetching user info:", errText);
      return res.status(500).send(`Erreur lors de la récupération du profil Google: ${errText}`);
    }

    const googleUser = await userinfoResponse.json();
    const { email, name: displayName } = googleUser;

    if (!email) {
      return res.status(400).send("L'e-mail est requis pour se connecter via Google.");
    }

    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'googleuser';
    let userRow = await dbGet('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (!userRow) {
      let finalUsername = usernameBase;
      let existingUser = await dbGet('SELECT * FROM users WHERE username = $1', [finalUsername]);
      if (existingUser) {
        finalUsername = `${usernameBase}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      await dbRun(
        `INSERT INTO users (username, "displayName", password, role, "premiumStatus", bio, "profileColor", "avatarSeed", email) VALUES ($1,$2,$3,$4,'none',$5,$6,$7,$8)`,
        [finalUsername, displayName || finalUsername, hashed, 'artist', 'Compte connecté via Google.', '#FF6600', finalUsername, email.toLowerCase().trim()]
      );
      await sendWelcomeMessage(finalUsername, displayName || finalUsername);
      userRow = await dbGet('SELECT * FROM users WHERE username = $1', [finalUsername]);
    } else {
      if (userRow.role === 'listener') {
        await dbRun('UPDATE users SET role = $1 WHERE username = $2', ['artist', userRow.username]);
        userRow.role = 'artist';
      }
    }

    const safeUser = await buildUserObject(userRow.username);
    const token = jwt.sign(
      { username: userRow.username, role: userRow.role, premiumStatus: userRow.premiumStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const oauthData = { ...safeUser, token };

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Connexion réussie</title>
      </head>
      <body style="background: #0d0d0d; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2 style="color: #FF6600;">Connexion réussie !</h2>
          <p style="color: #a7a7a7;">Redirection en cours...</p>
        </div>
        <script>
          const oauthData = ${JSON.stringify(oauthData)};
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-success', data: oauthData }, '*');
            window.close();
          } else {
            document.body.innerHTML = '<h2 style="color: #FF4444;">Erreur : fen&ecirc;tre parente introuvable</h2>';
          }
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error("Callback catch err:", err);
    res.status(500).send(`Erreur serveur interne lors de l'authentification Google : ${err.message}`);
  }
});

// ─── DISCORD OAUTH ───────────────────────────────────────────
app.get('/api/auth/discord', (req, res) => {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Configuration Discord</title>
      <style>body{font-family:sans-serif;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
      .card{background:#181818;border-radius:16px;border:1px solid rgba(88,101,242,0.3);padding:40px;width:440px;text-align:center;}
      h2{color:#5865F2;} p{color:#a7a7a7;font-size:14px;} code{background:#000;padding:2px 6px;border-radius:4px;color:#00FF66;font-size:12px;}
      button{background:#5865F2;border:none;border-radius:10px;padding:14px 28px;color:#fff;font-weight:700;cursor:pointer;margin-top:16px;}</style>
      </head><body><div class="card">
      <div style="font-size:48px;margin-bottom:16px;">⚙️</div>
      <h2>Configuration Discord OAuth</h2>
      <p>Ajoutez ces variables sur Render :</p>
      <p><code>DISCORD_CLIENT_ID</code> et <code>DISCORD_CLIENT_SECRET</code></p>
      <p style="font-size:12px;color:#777;">Redirect URI : <code>${redirectUri}</code></p>
      <button onclick="window.close()">Fermer</button>
      </div></body></html>
    `);
  }

  const authUrl = `https://discord.com/api/oauth2/authorize?` +
    `client_id=${encodeURIComponent(DISCORD_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('identify email')}`;

  res.redirect(authUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.status(400).send(`Erreur Discord Auth: ${error || 'code manquant'}`);

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return res.status(500).send(`Erreur token Discord: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userInfoResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userInfoResponse.ok) return res.status(500).send('Erreur récupération profil Discord');

    const discordUser = await userInfoResponse.json();
    const { id, username: discordUsername, global_name, email, avatar } = discordUser;

    const displayName = global_name || discordUsername;
    const usernameBase = discordUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `discord${id}`;
    const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;

    let userRow = email ? await dbGet('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]) : null;

    if (!userRow) {
      userRow = await dbGet('SELECT * FROM users WHERE username = $1', [usernameBase]);
      if (!userRow) {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashed = await bcrypt.hash(randomPassword, 10);
        await dbRun(
          `INSERT INTO users (username, "displayName", password, role, "premiumStatus", bio, "profileColor", "avatarSeed", email) VALUES ($1,$2,$3,$4,'none',$5,$6,$7,$8)`,
          [usernameBase, displayName, hashed, 'artist', 'Compte connecté via Discord.', '#5865F2', usernameBase, email?.toLowerCase() || null]
        );
        await sendWelcomeMessage(usernameBase, displayName);
        userRow = await dbGet('SELECT * FROM users WHERE username = $1', [usernameBase]);
      }
    }

    const safeUser = await buildUserObject(userRow.username);
    const token = jwt.sign(
      { username: userRow.username, role: userRow.role, premiumStatus: userRow.premiumStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const oauthData = { ...safeUser, token };

    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Connexion Discord réussie</title></head>
      <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <h2 style="color:#5865F2;">Connexion Discord réussie !</h2>
        <p style="color:#a7a7a7;">Redirection en cours...</p>
      </div>
      <script>
        const oauthData = ${JSON.stringify(oauthData)};
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-success', data: oauthData }, '*');
          window.close();
        } else {
          document.body.innerHTML = '<h2 style="color:#FF4444;">Erreur : fenêtre parente introuvable</h2>';
        }
      </script>
      </body></html>
    `);
  } catch (err) {
    console.error('Discord callback error:', err);
    res.status(500).send(`Erreur serveur Discord: ${err.message}`);
  }
});

// ─── SIMULATED OAUTH ─────────────────────────────────────────
app.get('/api/auth/oauth-mock', (req, res) => {
  const { provider = 'google' } = req.query;
  const capitalized = provider.charAt(0).toUpperCase() + provider.slice(1);
  const colorMap = {
    google: '#4285F4',
    github: '#333333',
    discord: '#5865F2',
    apple: '#000000'
  };
  const themeColor = colorMap[provider] || '#FF6600';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Connexion avec ${capitalized}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0d0d0d;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: #181818;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 32px;
          width: 380px;
          text-align: center;
          box-shadow: 0 10px 35px rgba(0,0,0,0.6);
        }
        .logo {
          font-size: 44px;
          margin-bottom: 20px;
        }
        h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 800; }
        p { color: #a7a7a7; font-size: 14px; margin: 0 0 28px 0; }
        .btn-account {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 14px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.2s ease;
          text-align: left;
        }
        .btn-account:hover {
          background: rgba(255,255,255,0.08);
          border-color: ${themeColor};
          transform: translateY(-1px);
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${themeColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff;
          font-size: 16px;
        }
        .footer {
          margin-top: 24px;
          font-size: 11px;
          color: #555;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🔑</div>
        <h2>Connexion via ${capitalized}</h2>
        <p>Sélectionnez un compte pour vous connecter à Pandofy</p>
        
        <button class="btn-account" onclick="login('${provider}_demo', 'Utilisateur Démo', '${provider}_demo@pandofy.app')">
          <div class="avatar">D</div>
          <div>
            <div style="font-weight: 700;">Utilisateur Démo</div>
            <div style="font-size: 12px; color: #a7a7a7; font-weight: 400;">${provider}_demo@pandofy.app</div>
          </div>
        </button>

        <button class="btn-account" onclick="login('${provider}_artist', 'Artiste Démo', '${provider}_artist@pandofy.app', 'artist')">
          <div class="avatar" style="background-color: #8B5CF6;">A</div>
          <div>
            <div style="font-weight: 700;">Artiste Démo</div>
            <div style="font-size: 12px; color: #a7a7a7; font-weight: 400;">${provider}_artist@pandofy.app</div>
          </div>
        </button>

        <div class="footer">
          CONNEXION SECURISEE SIMULEE OAUTH2
        </div>
      </div>

      <script>
        function login(username, displayName, email, role = 'listener') {
          fetch('/api/auth/oauth-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName, email, role, provider: '${provider}' })
          })
          .then(res => res.json())
          .then(data => {
            if (data.token) {
              window.opener.postMessage({ type: 'oauth-success', data }, '*');
              window.close();
            } else {
              alert('Erreur de connexion OAuth');
            }
          })
          .catch(err => {
            console.error(err);
            alert('Erreur technique de communication avec le serveur backend');
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/api/auth/oauth-callback', async (req, res) => {
  try {
    const { username, displayName, email, role, provider } = req.body;
    if (!username) return res.status(400).json({ error: 'Username requis' });
    
    const lower = username.toLowerCase().trim();
    let userRow = await dbGet('SELECT * FROM users WHERE username = $1', [lower]);
    
    if (!userRow) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      await dbRun(
        `INSERT INTO users (username, "displayName", password, role, "premiumStatus", bio, "profileColor", "avatarSeed", email) VALUES ($1,$2,$3,$4,'none',$5,$6,$7,$8)`,
        [lower, displayName, hashed, role || 'listener', `Compte connecté via ${provider}.`, '#FF6600', lower, email]
      );
      await sendWelcomeMessage(lower, displayName);
      userRow = await dbGet('SELECT * FROM users WHERE username = $1', [lower]);
    }
    
    const safeUser = await buildUserObject(userRow.username);
    const token = jwt.sign(
      { username: userRow.username, role: userRow.role, premiumStatus: userRow.premiumStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ ...safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth callback crash' });
  }
});

// ─── STATIC FILES (for Electron) ─────────────────────────────
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  // Set headers to disable caching on index.html and static files to avoid Electron loading outdated UI
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  app.use(express.static(distPath, { etag: false, lastModified: false }));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) res.sendFile(indexFile);
    else next();
  });
}

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => console.log(`Pandofy server running on port ${PORT}`));
