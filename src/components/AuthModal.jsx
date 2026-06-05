import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Loader, RefreshCw, WifiOff } from 'lucide-react';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, handleLogin, handleRegister, isServerActive, refreshData, startOAuthFlow } = useContext(AppContext);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('listener');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Reset error on mode switch
  useEffect(() => { setError(''); }, [isRegisterMode]);

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!username || !password || !displayName) {
          throw new Error('Tous les champs sont requis');
        }
        await handleRegister(username, password, displayName, role);
      } else {
        if (!username || !password) {
          throw new Error('Identifiant et mot de passe requis');
        }
        await handleLogin(username, password);
      }

      // On success — reset fields
      setUsername('');
      setPassword('');
      setDisplayName('');
      setError('');
    } catch (err) {
      const msg = err.message || '';
      if (
        msg === 'Failed to fetch' ||
        msg.toLowerCase().includes('fetch') ||
        msg.includes('ne répond pas')
      ) {
        setError('❌ Le serveur ne répond pas. Assurez-vous que Pandofy est bien lancé puis réessayez.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    setRetrying(true);
    setError('');
    try {
      await refreshData();
    } catch {}
    setRetrying(false);
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowAuthModal(false)} aria-label="Fermer">
          <X size={20} />
        </button>

        <h2 className="modal-title">
          {isRegisterMode ? 'Rejoindre Pandofy' : 'Se connecter'}
        </h2>

        {/* Server status banner */}
        {!isServerActive && (
          <div style={{
            backgroundColor: 'rgba(255, 140, 0, 0.08)',
            border: '1px solid rgba(255,140,0,0.3)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WifiOff size={14} color="#FF8C00" />
              <span style={{ fontSize: 13, color: '#FF8C00' }}>Serveur hors ligne ou en démarrage</span>
            </div>
            <button
              onClick={handleRetryConnection}
              disabled={retrying}
              style={{
                background: 'none', border: '1px solid #FF8C00', color: '#FF8C00',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
              }}
            >
              <RefreshCw size={12} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
              {retrying ? 'Test...' : 'Réessayer'}
            </button>
          </div>
        )}

        {error && (
          <div className="error-message" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="modal-form-group">
              <label className="modal-label">Nom d'affichage (Artiste ou Pseudo)</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Ex: ZYKO921"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="modal-form-group">
            <label className="modal-label">Nom d'utilisateur</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Ex: zyko921"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Mot de passe</label>
            <input
              type="password"
              className="modal-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegisterMode && (
            <div className="modal-form-group">
              <label className="modal-label">Choisissez votre rôle</label>
              <div className="role-selector">
                <div
                  className={`role-option ${role === 'listener' ? 'selected' : ''}`}
                  onClick={() => !loading && setRole('listener')}
                >
                  Auditeur
                </div>
                <div
                  className={`role-option ${role === 'artist' ? 'selected' : ''}`}
                  onClick={() => !loading && setRole('artist')}
                >
                  Artiste
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary modal-submit-btn"
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading
              ? (isRegisterMode ? 'Création...' : 'Connexion...')
              : (isRegisterMode ? 'Créer mon compte' : 'Se connecter')
            }
          </button>
        </form>

        <div style={{ margin: '18px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>Ou se connecter avec</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          <button type="button" onClick={() => startOAuthFlow('google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '1.2rem', transition: 'all 0.2s' }} title="Google" className="btn-social-oauth">
            🌐
          </button>
          <button type="button" onClick={() => startOAuthFlow('github')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '1.2rem', transition: 'all 0.2s' }} title="GitHub" className="btn-social-oauth">
            🐙
          </button>
          <button type="button" onClick={() => startOAuthFlow('discord')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '1.2rem', transition: 'all 0.2s' }} title="Discord" className="btn-social-oauth">
            💬
          </button>
          <button type="button" onClick={() => startOAuthFlow('apple')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '1.2rem', transition: 'all 0.2s' }} title="Apple" className="btn-social-oauth">
            🍎
          </button>
        </div>

        <div className="modal-toggle-auth">
          {isRegisterMode ? (
            <>Déjà inscrit ? <span onClick={toggleMode}>Se connecter</span></>
          ) : (
            <>Nouveau sur Pandofy ? <span onClick={toggleMode}>Créer un compte</span></>
          )}
        </div>
      </div>
    </div>
  );
}
