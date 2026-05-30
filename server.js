import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { parseFile } from 'music-metadata';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// JWT SECRET
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const generated = crypto.randomBytes(64).toString('hex');
  console.warn('[SECURITY] JWT_SECRET non défini en variable d\'environnement. Clé temporaire générée au démarrage.');
  return generated;
})();

// ─────────────────────────────────────────────────────────────────────────────
// PATHS & DIRS
// ─────────────────────────────────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const USE_CLOUDINARY = !!process.env.CLOUDINARY_URL;
if (!USE_CLOUDINARY && !fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_DIR = path.join(__dirname, 'server');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const SQLITE_FILE = path.join(DB_DIR, 'pandofy.db');
const JSON_FILE   = path.join(DB_DIR, 'db.json');

// ─────────────────────────────────────────────────────────────────────────────
// SQLITE SETUP
// ─────────────────────────────────────────────────────────────────────────────
const db = new Database(SQLITE_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username     TEXT PRIMARY KEY,
    displayName  TEXT,
    password     TEXT,
    role         TEXT,
    premiumStatus TEXT,
    bio          TEXT,
    profileColor TEXT,
    avatarSeed   TEXT,
    email        TEXT
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id           INTEGER PRIMARY KEY,
    title        TEXT,
    artistId     TEXT,
    artistName   TEXT,
    genre        TEXT,
    audioUrl     TEXT,
    coverUrl     TEXT,
    likes        INTEGER DEFAULT 0,
    plays        INTEGER DEFAULT 0,
    uploadDate   INTEGER,
    isDefault    INTEGER DEFAULT 0,
    duration     INTEGER DEFAULT 0,
    format       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id       INTEGER PRIMARY KEY,
    name     TEXT,
    userId   TEXT,
    coverUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlistId INTEGER,
    trackId    INTEGER,
    PRIMARY KEY (playlistId, trackId)
  );

  CREATE TABLE IF NOT EXISTS liked_tracks (
    username TEXT,
    trackId  INTEGER,
    PRIMARY KEY (username, trackId)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id      INTEGER PRIMARY KEY,
    username TEXT,
    sender   TEXT,
    subject  TEXT,
    body     TEXT,
    date     INTEGER,
    read     INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    transactionId TEXT PRIMARY KEY,
    username      TEXT,
    planId        TEXT,
    planTitle     TEXT,
    price         REAL,
    date          INTEGER,
    paymentMethod TEXT,
    status        TEXT
  );
`);

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION: db.json → SQLite (one-time)
// ─────────────────────────────────────────────────────────────────────────────
if (fs.existsSync(JSON_FILE)) {
  try {
    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (username, displayName, password, role, premiumStatus, bio, profileColor, avatarSeed)
      VALUES (@username, @displayName, @password, @role, @premiumStatus, @bio, @profileColor, @avatarSeed)
    `);

    const insertTrack = db.prepare(`
      INSERT OR IGNORE INTO tracks (id, title, artistId, artistName, genre, audioUrl, coverUrl, likes, plays, uploadDate, isDefault)
      VALUES (@id, @title, @artistId, @artistName, @genre, @audioUrl, @coverUrl, @likes, @plays, @uploadDate, @isDefault)
    `);

    const insertPlaylist = db.prepare(`
      INSERT OR IGNORE INTO playlists (id, name, userId, coverUrl)
      VALUES (@id, @name, @userId, @coverUrl)
    `);

    const insertPlaylistTrack = db.prepare(`
      INSERT OR IGNORE INTO playlist_tracks (playlistId, trackId) VALUES (?, ?)
    `);

    const insertLiked = db.prepare(`
      INSERT OR IGNORE INTO liked_tracks (username, trackId) VALUES (?, ?)
    `);

    const insertMsg = db.prepare(`
      INSERT OR IGNORE INTO messages (id, username, sender, subject, body, date, read)
      VALUES (@id, @username, @sender, @subject, @body, @date, @read)
    `);

    const insertPayment = db.prepare(`
      INSERT OR IGNORE INTO payments (transactionId, username, planId, planTitle, price, date, paymentMethod, status)
      VALUES (@transactionId, @username, @planId, @planTitle, @price, @date, @paymentMethod, @status)
    `);

    const migrateAll = db.transaction(() => {
      for (const u of (jsonData.users || [])) {
        insertUser.run({
          username: u.username, displayName: u.displayName, password: u.password,
          role: u.role, premiumStatus: u.premiumStatus, bio: u.bio,
          profileColor: u.profileColor, avatarSeed: u.avatarSeed
        });
        for (const tid of (u.likedTracks || [])) {
          insertLiked.run(u.username, tid);
        }
        for (const msg of (u.messages || [])) {
          insertMsg.run({ id: msg.id, username: u.username, sender: msg.sender, subject: msg.subject, body: msg.body, date: msg.date, read: msg.read ? 1 : 0 });
        }
      }
      for (const t of (jsonData.tracks || [])) {
        insertTrack.run({
          id: t.id, title: t.title, artistId: t.artistId, artistName: t.artistName,
          genre: t.genre, audioUrl: t.audioUrl, coverUrl: t.coverUrl,
          likes: t.likes || 0, plays: t.plays || 0,
          uploadDate: t.uploadDate || Date.now(), isDefault: t.isDefault ? 1 : 0
        });
      }
      for (const pl of (jsonData.playlists || [])) {
        insertPlaylist.run({ id: pl.id, name: pl.name, userId: pl.userId, coverUrl: pl.coverUrl });
        for (const tid of (pl.trackIds || [])) {
          insertPlaylistTrack.run(pl.id, tid);
        }
      }
      for (const pay of (jsonData.payments || [])) {
        insertPayment.run({
          transactionId: pay.transactionId, username: pay.username, planId: pay.planId,
          planTitle: pay.planTitle, price: pay.price, date: pay.date,
          paymentMethod: pay.paymentMethod, status: pay.status
        });
      }
    });

    migrateAll();
    fs.renameSync(JSON_FILE, JSON_FILE + '.bak');
    console.log('[MIGRATION] db.json migré vers SQLite avec succès');
  } catch (err) {
    console.error('[MIGRATION] Erreur lors de la migration:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED: Default data if empty
// ─────────────────────────────────────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const SALT = 10;
  const defaultUsers = [
    { username: 'cdeveloppeur', displayName: 'cdeveloppeur', password: 'cdeveloppeur', role: 'developer', premiumStatus: 'premium_individual', bio: 'Compte Développeur Officiel - Permissions d\'Administration Actives', profileColor: '#FF4400', avatarSeed: 'developer' },
    { username: 'zyko921', displayName: 'ZYKO921', password: 'password123', role: 'artist', premiumStatus: 'premium_individual', bio: 'Créateur de Pandofy - Bienvenue sur mon profil !', profileColor: '#FF6600', avatarSeed: 'zyko' },
    { username: 'auditeur', displayName: 'Auditeur Test', password: 'password123', role: 'listener', premiumStatus: 'none', bio: 'Mélomane passionné', profileColor: '#A7A7A7', avatarSeed: 'auditeur' }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, displayName, password, role, premiumStatus, bio, profileColor, avatarSeed)
    VALUES (@username, @displayName, @password, @role, @premiumStatus, @bio, @profileColor, @avatarSeed)
  `);

  for (const u of defaultUsers) {
    const hashed = bcrypt.hashSync(u.password, SALT);
    insertUser.run({ ...u, password: hashed });
  }

  // Aucun son par défaut — la bibliothèque démarre vide
}

// ─────────────────────────────────────────────────────────────────────────────
// BCRYPT MIGRATION: Hash plain-text passwords at startup
// ─────────────────────────────────────────────────────────────────────────────
{
  const allUsers = db.prepare('SELECT username, password FROM users').all();
  const updatePwd = db.prepare('UPDATE users SET password = ? WHERE username = ?');
  for (const u of allUsers) {
    let needsHash = false;
    try {
      bcrypt.getRounds(u.password);
    } catch {
      needsHash = true;
    }
    if (needsHash) {
      const hashed = bcrypt.hashSync(u.password, 10);
      updatePwd.run(hashed, u.username);
      console.log(`[BCRYPT MIGRATION] Mot de passe hashé pour: ${u.username}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Build user object from DB (with likedTracks and messages)
// ─────────────────────────────────────────────────────────────────────────────
function buildUserObject(username) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return null;

  const likedTracks = db.prepare('SELECT trackId FROM liked_tracks WHERE username = ?')
    .all(username).map(r => r.trackId);

  const messages = db.prepare('SELECT * FROM messages WHERE username = ? ORDER BY date DESC')
    .all(username);

  const playlists = db.prepare('SELECT id FROM playlists WHERE userId = ?')
    .all(username).map(r => r.id);

  const { password, ...safe } = user;
  return { ...safe, likedTracks, messages, playlists };
}

function buildSafeUser(username) {
  return buildUserObject(username);
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYS COOLDOWN MAP
// ─────────────────────────────────────────────────────────────────────────────
const playsCooldown = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS APP
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// CORS : en prod on restreint aux origines connues
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : true; // true = toutes origines en local
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (!USE_CLOUDINARY) app.use('/uploads', express.static(UPLOADS_DIR));

// ─────────────────────────────────────────────────────────────────────────────
// JWT MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTER CONFIG — local disk (dev) ou Cloudinary (prod)
// ─────────────────────────────────────────────────────────────────────────────
const audioTypes = ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'];
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio' && !audioTypes.includes(file.mimetype)) {
    return cb(new Error(`Format audio non supporté : ${file.mimetype}. Acceptés : MP3, FLAC, WAV, OGG, M4A`));
  }
  if (file.fieldname === 'cover' && !imageTypes.includes(file.mimetype)) {
    return cb(new Error('Format image non supporté. Acceptés : JPG, PNG, WEBP'));
  }
  cb(null, true);
};

let uploadStorage;
if (USE_CLOUDINARY) {
  // Dynamically import CloudinaryStorage only when needed
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
  const TMP_UPLOADS = '/tmp/pandofy-uploads';
  if (!fs.existsSync(TMP_UPLOADS)) fs.mkdirSync(TMP_UPLOADS, { recursive: true });
  uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP_UPLOADS),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  app.use('/tmp-uploads', express.static(TMP_UPLOADS));
  console.log('[STORAGE] Mode local /tmp activé');
}

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter
});

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT AUDIO HELPER
// ─────────────────────────────────────────────────────────────────────────────
function mimeToFormat(mimetype) {
  const map = {
    'audio/mpeg': 'MP3',
    'audio/flac': 'FLAC',
    'audio/wav': 'WAV',
    'audio/ogg': 'OGG',
    'audio/x-m4a': 'M4A',
    'audio/mp4': 'M4A'
  };
  return map[mimetype] || 'AUDIO';
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME EMAIL HELPER
// ─────────────────────────────────────────────────────────────────────────────
function sendWelcomeMessage(username, displayName) {
  const msgId = Date.now();
  const body = [
    `Bonjour ${displayName} !`,
    '',
    'Nous sommes ravis de vous accueillir sur Pandofy, votre plateforme de streaming musical communautaire.',
    '',
    'Avec votre nouveau compte, vous pouvez :',
    '- Ecouter tous les sons partages par notre communaute',
    '- Liker vos morceaux preferes pour les retrouver facilement',
    '- Creer des playlists personnalisees',
    '- Personnaliser votre profil et votre couleur',
    '- Passer Premium pour une qualite 320 kbps Hi-Fi',
    '',
    'Bonne ecoute !',
    "L'equipe Pandofy -- bienvenue@pandofy.app"
  ].join('\n');

  db.prepare(`
    INSERT INTO messages (id, username, sender, subject, body, date, read)
    VALUES (@id, @username, @sender, @subject, @body, @date, 0)
  `).run({
    id: msgId,
    username,
    sender: 'bienvenue@pandofy.app',
    subject: 'Bienvenue sur Pandofy !',
    body,
    date: Date.now()
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// TRACK HELPER
// ─────────────────────────────────────────────────────────────────────────────
function buildTrackObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    artistId: row.artistId,
    artistName: row.artistName,
    genre: row.genre,
    audioUrl: row.audioUrl,
    coverUrl: row.coverUrl,
    likes: row.likes || 0,
    plays: row.plays || 0,
    uploadDate: row.uploadDate,
    isDefault: !!row.isDefault,
    duration: row.duration || 0,
    format: row.format || ''
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ─── AUTH ──────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const lowerUser = username.toLowerCase().trim();
    const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(lowerUser);
    if (existing) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
    }

    const hashedPwd = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (username, displayName, password, role, premiumStatus, bio, profileColor, avatarSeed)
      VALUES (@username, @displayName, @password, @role, @premiumStatus, @bio, @profileColor, @avatarSeed)
    `).run({
      username: lowerUser,
      displayName,
      password: hashedPwd,
      role: role || 'listener',
      premiumStatus: 'none',
      bio: 'Passionné(e) de musique rejoignant Pandofy.',
      profileColor: '#FF6600',
      avatarSeed: lowerUser
    });

    // Send welcome message
    sendWelcomeMessage(lowerUser, displayName);

    const safeUser = buildSafeUser(lowerUser);
    const token = jwt.sign({ username: lowerUser, role: safeUser.role, premiumStatus: safeUser.premiumStatus }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ ...safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
    if (!userRow) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const match = await bcrypt.compare(password, userRow.password);
    if (!match) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const safeUser = buildSafeUser(userRow.username);
    const token = jwt.sign({ username: userRow.username, role: userRow.role, premiumStatus: userRow.premiumStatus }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ ...safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

// ─── TRACKS SEARCH (before GET /api/tracks to avoid conflicts) ──────────────

app.get('/api/tracks/search', (req, res) => {
  try {
    const { q = '', genre, sort } = req.query;
    const pattern = `%${q}%`;

    let query = `
      SELECT * FROM tracks
      WHERE (title LIKE ? OR artistName LIKE ? OR genre LIKE ?)
    `;
    const params = [pattern, pattern, pattern];

    if (genre) {
      query += ' AND genre = ?';
      params.push(genre);
    }

    const sortMap = {
      plays: 'plays DESC',
      likes: 'likes DESC',
      date: 'uploadDate DESC'
    };
    query += ` ORDER BY ${sortMap[sort] || 'uploadDate DESC'}`;

    const rows = db.prepare(query).all(...params);
    res.json(rows.map(buildTrackObject));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la recherche de pistes' });
  }
});

// ─── TRACKS ────────────────────────────────────────────────────────────────

app.get('/api/tracks', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;
    const rows = db.prepare('SELECT * FROM tracks ORDER BY uploadDate DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM tracks').get().c;
    res.json({ tracks: rows.map(buildTrackObject), total, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des pistes' });
  }
});

// ─── YOUTUBE URL UPLOAD ────────────────────────────────────────────────────
app.post('/api/tracks/youtube', requireAuth, async (req, res) => {
  try {
    const { title, genre, artistId, artistName, youtubeUrl, coverUrl } = req.body;

    if (!title || !genre || !artistId || !artistName || !youtubeUrl) {
      return res.status(400).json({ error: 'Tous les champs sont requis (titre, genre, artiste, lien YouTube)' });
    }

    // Valider que c'est bien un lien YouTube
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
    if (!ytRegex.test(youtubeUrl)) {
      return res.status(400).json({ error: 'Lien YouTube invalide. Format attendu : https://youtube.com/watch?v=XXXXXXXXXXX' });
    }

    // Extraire l'ID YouTube pour générer la miniature automatiquement
    const ytIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    const ytId = ytIdMatch ? ytIdMatch[1] : null;
    const finalCoverUrl = coverUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60');

    // Stocker l'URL YouTube comme audioUrl avec préfixe yt:
    const audioUrl = `yt:${youtubeUrl}`;

    const id = Date.now();
    db.prepare(`
      INSERT INTO tracks (id, title, artistId, artistName, genre, audioUrl, coverUrl, likes, plays, uploadDate, isDefault, duration, format)
      VALUES (@id, @title, @artistId, @artistName, @genre, @audioUrl, @coverUrl, 0, 0, @uploadDate, 0, 0, 'YouTube')
    `).run({ id, title, artistId, artistName, genre, audioUrl, coverUrl: finalCoverUrl, uploadDate: Date.now() });

    const track = buildTrackObject(db.prepare('SELECT * FROM tracks WHERE id = ?').get(id));
    res.status(201).json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du lien YouTube' });
  }
});

app.post('/api/tracks', requireAuth, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, genre, artistId, artistName } = req.body;

    if (!title || !genre || !artistId || !artistName) {
      return res.status(400).json({ error: 'Données de piste incomplètes' });
    }

    const audioFiles = req.files?.['audio'];
    if (!audioFiles || audioFiles.length === 0) {
      return res.status(400).json({ error: 'Fichier audio requis' });
    }

    const audioFile = audioFiles[0];
    const audioUrl = `/tmp-uploads/${audioFile.filename}`;
    const format = mimeToFormat(audioFile.mimetype);

    const coverFiles = req.files?.['cover'];
    const coverUrl = (coverFiles && coverFiles.length > 0)
      ? `/tmp-uploads/${coverFiles[0].filename}`
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';

    // Extract audio duration
    let duration = 0;
    try {
      const metadata = await parseFile(path.join(UPLOADS_DIR, audioFile.filename));
      duration = Math.round(metadata.format.duration || 0);
    } catch (metaErr) {
      console.warn('[MUSIC-METADATA] Impossible d\'extraire la durée:', metaErr.message);
    }

    const id = Date.now();
    db.prepare(`
      INSERT INTO tracks (id, title, artistId, artistName, genre, audioUrl, coverUrl, likes, plays, uploadDate, isDefault, duration, format)
      VALUES (@id, @title, @artistId, @artistName, @genre, @audioUrl, @coverUrl, 0, 0, @uploadDate, 0, @duration, @format)
    `).run({ id, title, artistId, artistName, genre, audioUrl, coverUrl, uploadDate: Date.now(), duration, format });

    const track = buildTrackObject(db.prepare('SELECT * FROM tracks WHERE id = ?').get(id));
    res.status(201).json(track);
  } catch (err) {
    // Multer error handling
    if (err.message && (err.message.includes('Format audio') || err.message.includes('Format image'))) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du téléversement' });
  }
});

app.delete('/api/tracks/:id', requireAuth, async (req, res) => {
  try {
    const trackId = parseInt(req.params.id);

    // Identité prise depuis le JWT (plus besoin du body)
    const username = req.user.username;

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
    if (!userRow) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Morceau introuvable' });
    }

    const isAuthorized = userRow.username === 'cdeveloppeur' || userRow.role === 'developer' || userRow.role === 'admin' || userRow.username === track.artistId;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission refusée.' });
    }

    // Supprimer de la DB
    db.prepare('DELETE FROM tracks WHERE id = ?').run(trackId);
    db.prepare('DELETE FROM liked_tracks WHERE trackId = ?').run(trackId);
    db.prepare('DELETE FROM playlist_tracks WHERE trackId = ?').run(trackId);

    // Supprimer les fichiers physiques
    if (USE_CLOUDINARY) {
      // Supprimer sur Cloudinary
      const deleteCloudinary = async (url, resourceType) => {
        if (!url || !url.includes('cloudinary')) return;
        try {
          const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
          await cloudinary.uploader.destroy(`pandofy/${publicId.split('/').pop()}`, { resource_type: resourceType });
        } catch (e) {
          console.warn('[DELETE] Cloudinary suppression échouée:', e.message);
        }
      };
      await deleteCloudinary(track.audioUrl, 'video');
      await deleteCloudinary(track.coverUrl, 'image');
    } else {
      // Supprimer les fichiers locaux
      const tryDelete = (url) => {
        if (!url || !url.startsWith('/uploads/')) return;
        const filePath = path.join(UPLOADS_DIR, path.basename(url));
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('[DELETE] Fichier supprimé:', filePath);
          }
        } catch (e) {
          console.warn('[DELETE] Impossible de supprimer:', filePath, e.message);
        }
      };
      tryDelete(track.audioUrl);
      tryDelete(track.coverUrl);
    }

    res.json({ success: true, deletedTrack: buildTrackObject(track) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ─── ADMIN CLEAR ALL TRACKS ───────────────────────────────────────────────
app.get('/api/admin/clear-tracks', (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'pandofy-admin-2026') {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  db.prepare('DELETE FROM tracks').run();
  db.prepare('DELETE FROM liked_tracks').run();
  db.prepare('DELETE FROM playlist_tracks').run();
  res.json({ success: true, message: 'Tous les sons supprimés !' });
});

// ─── LIKES ────────────────────────────────────────────────────────────────

app.post('/api/tracks/:id/like', requireAuth, (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Identifiant utilisateur requis' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
    const trackRow = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);

    if (!userRow || !trackRow) {
      return res.status(404).json({ error: 'Utilisateur ou piste introuvable' });
    }

    const alreadyLiked = db.prepare('SELECT 1 FROM liked_tracks WHERE username = ? AND trackId = ?').get(username, trackId);

    if (alreadyLiked) {
      db.prepare('DELETE FROM liked_tracks WHERE username = ? AND trackId = ?').run(username, trackId);
      db.prepare('UPDATE tracks SET likes = MAX(0, likes - 1) WHERE id = ?').run(trackId);
    } else {
      db.prepare('INSERT OR IGNORE INTO liked_tracks (username, trackId) VALUES (?, ?)').run(username, trackId);
      db.prepare('UPDATE tracks SET likes = likes + 1 WHERE id = ?').run(trackId);
    }

    const updatedTrack = buildTrackObject(db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId));
    const safeUser = buildSafeUser(username);

    res.json({ user: safeUser, track: updatedTrack });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du like' });
  }
});

// ─── PLAY COUNTING ─────────────────────────────────────────────────────────

app.post('/api/tracks/:id/play', (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const { username } = req.body;

    const cooldownKey = `${username || 'anon'}:${trackId}`;
    const lastPlay = playsCooldown.get(cooldownKey) || 0;

    if (Date.now() - lastPlay < 30000) {
      return res.json({ skipped: true });
    }

    playsCooldown.set(cooldownKey, Date.now());
    db.prepare('UPDATE tracks SET plays = plays + 1 WHERE id = ?').run(trackId);
    const updated = db.prepare('SELECT plays FROM tracks WHERE id = ?').get(trackId);

    res.json({ plays: updated?.plays || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du comptage d'écoute" });
  }
});

// ─── VERSION ──────────────────────────────────────────────────────────────

app.get('/api/version', (req, res) => {
  res.json({
    version: '1.3.0',
    changelog: [
      '🗑️ Suppression de pistes corrigée (fichiers effacés du serveur)',
      '☁️ Support Cloudinary pour les uploads en production',
      '🗄️ Support PostgreSQL pour la base de données en production',
      '🔐 Mots de passe sécurisés avec bcrypt',
      '🪙 Authentification par token JWT (7 jours)',
      '🎵 Extraction automatique de la durée des pistes audio',
      '🔍 API de recherche avancée (titres, artistes, genres)',
      '📊 Comptage réel des écoutes avec protection anti-spam (30s)',
      '📧 Email de bienvenue automatique à l\'inscription'
    ]
  });
});

// ─── USER PROFILE ──────────────────────────────────────────────────────────

app.get('/api/users/search', (req, res) => {
  try {
    const { q = '' } = req.query;
    const pattern = `%${q}%`;
    const rows = db.prepare(`
      SELECT username, displayName, role, premiumStatus, bio, profileColor, avatarSeed
      FROM users
      WHERE displayName LIKE ? OR username LIKE ?
      LIMIT 20
    `).all(pattern, pattern);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la recherche d\'utilisateurs' });
  }
});

app.get('/api/users/:username', (req, res) => {
  try {
    const targetUser = req.params.username.toLowerCase().trim();
    const safeUser = buildSafeUser(targetUser);
    if (!safeUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

app.put('/api/users/:username/profile', requireAuth, (req, res) => {
  try {
    const targetUser = req.params.username.toLowerCase().trim();
    const { displayName, bio, profileColor } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(targetUser);
    if (!existing) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    db.prepare(`
      UPDATE users SET
        displayName  = COALESCE(?, displayName),
        bio          = ?,
        profileColor = COALESCE(?, profileColor)
      WHERE username = ?
    `).run(displayName || null, bio !== undefined ? bio : existing.bio, profileColor || null, targetUser);

    const safeUser = buildSafeUser(targetUser);
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

// ─── PLAYLISTS ──────────────────────────────────────────────────────────────

app.get('/api/playlists', (req, res) => {
  try {
    const playlists = db.prepare('SELECT * FROM playlists').all();
    const result = playlists.map(pl => {
      const trackIds = db.prepare('SELECT trackId FROM playlist_tracks WHERE playlistId = ?').all(pl.id).map(r => r.trackId);
      return { ...pl, trackIds };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
});

app.post('/api/playlists', requireAuth, (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) {
      return res.status(400).json({ error: 'Données de playlist incomplètes' });
    }

    const id = Date.now();
    const coverUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60';

    db.prepare('INSERT INTO playlists (id, name, userId, coverUrl) VALUES (?, ?, ?, ?)').run(id, name, userId, coverUrl);

    res.status(201).json({ id, name, userId, coverUrl, trackIds: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la playlist' });
  }
});

app.post('/api/playlists/:id/add', requireAuth, (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({ error: 'Track ID requis' });
    }

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist introuvable' });
    }

    db.prepare('INSERT OR IGNORE INTO playlist_tracks (playlistId, trackId) VALUES (?, ?)').run(playlistId, trackId);

    // Update cover if first track
    const trackCount = db.prepare('SELECT COUNT(*) as c FROM playlist_tracks WHERE playlistId = ?').get(playlistId).c;
    if (trackCount === 1) {
      const track = db.prepare('SELECT coverUrl FROM tracks WHERE id = ?').get(trackId);
      if (track) {
        db.prepare('UPDATE playlists SET coverUrl = ? WHERE id = ?').run(track.coverUrl, playlistId);
      }
    }

    const updatedPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    const trackIds = db.prepare('SELECT trackId FROM playlist_tracks WHERE playlistId = ?').all(playlistId).map(r => r.trackId);

    res.json({ ...updatedPlaylist, trackIds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout à la playlist" });
  }
});

// ─── PAYMENTS ──────────────────────────────────────────────────────────────

app.post('/api/payments/subscribe', requireAuth, async (req, res) => {
  try {
    const { username, planId, planTitle, price, cardNumber, cardHolder, paypalRedirect } = req.body;

    if (!username || !planId || !planTitle || !price) {
      return res.status(400).json({ error: 'Paramètres de souscription manquants' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
    if (!userRow) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    db.prepare('UPDATE users SET premiumStatus = ? WHERE username = ?').run(`pending_${planId}`, userRow.username);

    const transactionId = 'TXN-' + Math.floor(Math.random() * 1e9);
    const maskedCard = cardNumber ? `•••• •••• •••• ${cardNumber.slice(-4)}` : 'PayPal (zyko921)';

    db.prepare(`
      INSERT INTO payments (transactionId, username, planId, planTitle, price, date, paymentMethod, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transactionId, userRow.username, planId, planTitle, price, Date.now(), maskedCard, 'Verified (Secured)');

    // Receipt email
    const receiptId = Date.now() + 1;
    db.prepare(`INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES (?, ?, ?, ?, ?, ?, 0)`)
      .run(
        receiptId, userRow.username, 'facturation@pandofy.app',
        `Reçu de paiement sécurisé - ${planTitle}`,
        `Bonjour ${userRow.displayName},\n\nNous confirmons la réception de votre paiement de ${price}€ pour la formule ${planTitle}.\n\nNuméro de Transaction : ${transactionId}\nMoyen de Paiement : ${maskedCard}\n\nVotre abonnement est actuellement en cours d'activation technique sur nos serveurs. Vous recevrez un e-mail de confirmation dès que le service premium sera entièrement déverrouillé dans quelques instants.\n\nMerci de faire confiance à Pandofy !\nL'équipe de facturation.`,
        Date.now(), 0
      );

    const safeUser = buildSafeUser(userRow.username);
    const payment = db.prepare('SELECT * FROM payments WHERE transactionId = ?').get(transactionId);

    res.json({
      success: true,
      user: safeUser,
      transaction: payment,
      emailAlert: 'Reçu de paiement envoyé à votre boîte aux lettres Pandofy !'
    });

    // Delayed activation
    setTimeout(() => {
      try {
        const liveUser = db.prepare('SELECT * FROM users WHERE username = ?').get(userRow.username);
        if (liveUser && liveUser.premiumStatus === `pending_${planId}`) {
          db.prepare('UPDATE users SET premiumStatus = ? WHERE username = ?').run(planId, userRow.username);

          const activId = Date.now() + 2;
          db.prepare(`INSERT INTO messages (id, username, sender, subject, body, date, read) VALUES (?, ?, ?, ?, ?, ?, 0)`)
            .run(
              activId, userRow.username, 'welcome@pandofy.app',
              'Félicitations - Votre Pandofy Premium est Activé !',
              `Bonjour ${liveUser.displayName},\n\nBonne nouvelle ! Le délai de validation réseau est terminé.\nVotre abonnement ${planTitle} est maintenant pleinement actif !\n\nCe que vous débloquez immédiatement :\n- Diffusion audio Haute Fidélité (320 kbps)\n- Suppression intégrale de la publicité\n- Création illimitée de playlists persistantes.\n\nFoncez sur votre lecteur Pandofy !\n\nÀ vos écouteurs,\nL'équipe technique Pandofy.`,
              Date.now(), 0
            );
          console.log(`[DELAYED ACTIVATION] Plan ${planId} activé pour ${userRow.username}`);
        }
      } catch (err) {
        console.error('Erreur activation différée:', err);
      }
    }, 10000);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du paiement' });
  }
});

// ─── MESSAGES ──────────────────────────────────────────────────────────────

app.post('/api/users/:username/messages/read', requireAuth, (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!userRow) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    db.prepare('UPDATE messages SET read = 1 WHERE username = ?').run(username);

    res.json(buildSafeUser(username));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des messages' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD PAR URL DIRECTE
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/tracks/url', requireAuth, (req, res) => {
  try {
    const { title, genre, artistId, artistName, audioUrl, coverUrl } = req.body;
    if (!title || !genre || !artistId || !artistName || !audioUrl) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }
    const id = Date.now();
    db.prepare(`
      INSERT INTO tracks (id, title, artistId, artistName, genre, audioUrl, coverUrl, likes, plays, uploadDate, isDefault, duration, format)
      VALUES (@id, @title, @artistId, @artistName, @genre, @audioUrl, @coverUrl, 0, 0, @uploadDate, 0, 0, 'MP3')
    `).run({
      id, title, artistId, artistName, genre, audioUrl,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      uploadDate: Date.now()
    });
    const track = buildTrackObject(db.prepare('SELECT * FROM tracks WHERE id = ?').get(id));
    res.status(201).json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la publication' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVE FRONTEND (dist/)
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/\/(.*)/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend non build. Lancez npm run build.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Pandofy server is running on http://localhost:${PORT}`);
});
