/**
 * API_BASE — URL du serveur backend Pandofy.
 * En développement local (Electron) : http://localhost:3001
 * En production (Railway) : défini par VITE_API_URL dans .env.production
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
