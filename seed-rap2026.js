// ─────────────────────────────────────────────────────────────
// PANDOFY — SEED TOP 50 RAP 2026
// Lance ce fichier depuis la racine de ton projet :
//   node seed-rap2026.js
// ─────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_FILE = path.join(__dirname, 'server', 'pandofy.db');
const db = new Database(SQLITE_FILE);

// 17 MP3 libres de droits (SoundHelix) — réutilisés en rotation
const audioUrls = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3',
];

// Covers rap (Unsplash, libres de droits)
const covers = [
  'https://images.unsplash.com/photo-1571609149665-c3c6b82e6c96?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1499415479124-43c32433a620?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=60',
];

const top50 = [
  { title: 'E85', artistName: 'Don Toliver', genre: 'Hip-Hop', plays: 9800, likes: 412 },
  { title: 'Body', artistName: 'Don Toliver', genre: 'Hip-Hop', plays: 8700, likes: 389 },
  { title: 'What You Saying', artistName: 'Lil Uzi Vert', genre: 'Rap', plays: 8200, likes: 356 },
  { title: 'FDO', artistName: 'Pooh Shiesty', genre: 'Trap', plays: 7900, likes: 341 },
  { title: 'Two Six', artistName: 'J. Cole', genre: 'Hip-Hop', plays: 7600, likes: 318 },
  { title: 'FATHER (feat. Travis Scott)', artistName: 'Gunna', genre: 'Trap', plays: 7400, likes: 302 },
  { title: 'Cannonball (feat. Don Toliver)', artistName: 'A$AP Rocky', genre: 'Hip-Hop', plays: 7100, likes: 287 },
  { title: 'Pipe Down (feat. Travis Scott)', artistName: 'Young Thug', genre: 'Trap', plays: 6900, likes: 271 },
  { title: 'Secondhand (feat. Rema)', artistName: 'Don Toliver', genre: 'Afro-Rap', plays: 6700, likes: 258 },
  { title: 'Budget (feat. Latto)', artistName: 'Megan Thee Stallion', genre: 'Rap', plays: 6500, likes: 244 },
  { title: 'PIECES ON MY NECK (feat. 21 Savage)', artistName: 'Drake', genre: 'Hip-Hop', plays: 6300, likes: 231 },
  { title: 'DON\'T KILL THE PARTY (feat. Quavo)', artistName: 'Ty Dolla $ign', genre: 'Trap', plays: 6100, likes: 219 },
  { title: 'BOAT REMIX (feat. Pooh Shiesty)', artistName: 'Trim', genre: 'Trap', plays: 5900, likes: 207 },
  { title: 'ALREADY LEGEND', artistName: 'Future', genre: 'Trap', plays: 5700, likes: 196 },
  { title: 'Folded', artistName: 'Kehlani', genre: 'R&B Rap', plays: 5500, likes: 186 },
  { title: 'I Just Might', artistName: 'Bruno Mars', genre: 'R&B Rap', plays: 5300, likes: 176 },
  { title: 'PGD (feat. Kyle Richh)', artistName: 'A Boogie Wit da Hoodie', genre: 'Rap', plays: 5100, likes: 167 },
  { title: 'Casino', artistName: 'Baby Keem', genre: 'Hip-Hop', plays: 4900, likes: 158 },
  { title: 'wgft (feat. Burna Boy)', artistName: 'Don Toliver', genre: 'Afro-Rap', plays: 4700, likes: 149 },
  { title: 'The Fall-Off', artistName: 'J. Cole', genre: 'Hip-Hop', plays: 4600, likes: 141 },
  { title: 'Not Like Us', artistName: 'Kendrick Lamar', genre: 'Hip-Hop', plays: 4500, likes: 135 },
  { title: 'Luther', artistName: 'Kendrick Lamar & SZA', genre: 'R&B Rap', plays: 4400, likes: 129 },
  { title: 'Squabble Up', artistName: 'Kendrick Lamar', genre: 'Hip-Hop', plays: 4300, likes: 124 },
  { title: 'Timeless (feat. Playboi Carti)', artistName: 'The Weeknd', genre: 'R&B Rap', plays: 4200, likes: 119 },
  { title: 'NOKIA', artistName: 'Drake', genre: 'Hip-Hop', plays: 4100, likes: 114 },
  { title: 'Residuals', artistName: 'Chris Brown', genre: 'R&B Rap', plays: 4000, likes: 109 },
  { title: 'Kehlani', artistName: 'Lil Baby', genre: 'Trap', plays: 3900, likes: 104 },
  { title: 'Guns Up (feat. Future)', artistName: 'Gunna', genre: 'Trap', plays: 3800, likes: 100 },
  { title: 'HARLEYS IN HAWAII', artistName: 'Travis Scott', genre: 'Trap', plays: 3700, likes: 96 },
  { title: 'SICKO MODE 2', artistName: 'Travis Scott ft. Drake', genre: 'Trap', plays: 3600, likes: 92 },
  { title: 'Meltdown', artistName: 'Travis Scott ft. Drake', genre: 'Trap', plays: 3500, likes: 88 },
  { title: 'Carnival', artistName: 'Kanye West & Ty Dolla $ign', genre: 'Hip-Hop', plays: 3400, likes: 84 },
  { title: 'Paid The Fine', artistName: 'Lil Wayne', genre: 'Rap', plays: 3300, likes: 80 },
  { title: 'Hoodoo (feat. Lil Wayne)', artistName: 'Jack Harlow', genre: 'Rap', plays: 3200, likes: 77 },
  { title: 'Back Outside', artistName: 'Lil Durk', genre: 'Trap', plays: 3100, likes: 74 },
  { title: 'Rich Flex 2', artistName: 'Drake & 21 Savage', genre: 'Hip-Hop', plays: 3000, likes: 71 },
  { title: 'Bop', artistName: '21 Savage', genre: 'Trap', plays: 2900, likes: 68 },
  { title: 'Never Fold', artistName: 'Meek Mill', genre: 'Rap', plays: 2800, likes: 65 },
  { title: 'Money Counter', artistName: 'A$AP Ferg', genre: 'Trap', plays: 2700, likes: 62 },
  { title: 'Paranoid', artistName: 'Playboi Carti', genre: 'Trap', plays: 2600, likes: 59 },
  { title: 'Sky Walk', artistName: 'Young Thug', genre: 'Trap', plays: 2500, likes: 56 },
  { title: 'Pressure', artistName: 'Lil Baby ft. Gunna', genre: 'Trap', plays: 2400, likes: 53 },
  { title: 'Freestyle', artistName: 'Central Cee', genre: 'UK Drill', plays: 2300, likes: 50 },
  { title: 'Band4Band', artistName: 'Central Cee ft. Lil Baby', genre: 'UK Drill', plays: 2200, likes: 47 },
  { title: 'Sprinter', artistName: 'Dave & Central Cee', genre: 'UK Drill', plays: 2100, likes: 44 },
  { title: 'Link Up', artistName: 'Ninho', genre: 'Rap FR', plays: 2000, likes: 41 },
  { title: 'Tout Va Bien', artistName: 'Ninho ft. SCH', genre: 'Rap FR', plays: 1900, likes: 38 },
  { title: 'Chocolat', artistName: 'Sch', genre: 'Rap FR', plays: 1800, likes: 35 },
  { title: 'Mosaique Solaire', artistName: 'Damso', genre: 'Rap FR', plays: 1700, likes: 32 },
  { title: 'Dinner', artistName: 'Gazo', genre: 'Rap FR', plays: 1600, likes: 29 },
];

const insertTrack = db.prepare(`
  INSERT OR IGNORE INTO tracks 
  (id, title, artistId, artistName, genre, audioUrl, coverUrl, likes, plays, uploadDate, isDefault, duration, format)
  VALUES (@id, @title, @artistId, @artistName, @genre, @audioUrl, @coverUrl, @likes, @plays, @uploadDate, 1, 210, 'MP3')
`);

const insertMany = db.transaction(() => {
  top50.forEach((track, i) => {
    insertTrack.run({
      id: 2000 + i,
      title: track.title,
      artistId: 'zyko921',
      artistName: track.artistName,
      genre: track.genre,
      audioUrl: audioUrls[i % audioUrls.length],
      coverUrl: covers[i % covers.length],
      likes: track.likes,
      plays: track.plays,
      uploadDate: Date.now() - (50 - i) * 1000 * 60 * 60 * 24,
    });
  });
});

insertMany();
console.log('✅ Top 50 Rap 2026 ajouté avec succès dans la base de données !');
db.close();
