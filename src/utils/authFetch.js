/**
 * authFetch — Helper pour les requêtes HTTP authentifiées avec JWT.
 * Ajoute automatiquement le header Authorization si un token est présent
 * dans le localStorage.
 */
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('pandofy_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}
