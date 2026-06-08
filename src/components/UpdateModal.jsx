import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Sparkles, Download, RefreshCw, CheckCircle } from 'lucide-react';

export default function WhatsNewModal() {
  const { updateInfo, setUpdateInfo } = useContext(AppContext);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onUpdateProgress?.((p) => setProgress(p));
  }, []);

  if (!updateInfo) return null;

  const isDownloaded = updateInfo.downloaded;
  const isLaunchInfo = updateInfo.showOnLaunch && !isDownloaded;

  const handleClose = () => {
    localStorage.setItem('pandofy_last_seen_version', updateInfo.version);
    setUpdateInfo(null);
  };

  const handleInstall = () => {
    setInstalling(true);
    window.electronAPI?.installUpdate?.();
  };

  const handleCheckUpdate = () => {
    window.electronAPI?.checkForUpdates?.();
    handleClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={isLaunchInfo ? handleClose : undefined}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: '100%', background: '#121212', border: '1.5px solid #FF6600', borderRadius: 20, padding: 30, boxShadow: '0 20px 40px rgba(0,0,0,0.9), 0 0 25px rgba(255,102,0,0.25)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: '50%', backgroundColor: '#181818', border: '2px solid #FF6600', color: '#FF6600', marginBottom: 14, boxShadow: '0 0 15px rgba(255,102,0,0.2)' }}>
            {isDownloaded ? <CheckCircle size={32} /> : <Sparkles size={32} />}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>
            {isDownloaded ? 'Mise à jour prête !' : isLaunchInfo ? `Bienvenue sur Pandofy` : 'Nouvelle version disponible'}
          </h2>
          <div style={{ fontSize: '0.8rem', color: '#FF6600', fontWeight: 800, marginTop: 8, textTransform: 'uppercase', letterSpacing: '2px' }}>
            Version {updateInfo.version}
          </div>
        </div>

        {/* Changelog */}
        {updateInfo.changelog && updateInfo.changelog.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,102,0,0.12)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: '#FF6600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ✨ Nouveautés de cette version
            </div>
            <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {updateInfo.changelog.map((item, idx) => (
                <li key={idx} style={{ fontSize: '0.88rem', color: '#DDD', lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Download progress */}
        {progress && !isDownloaded && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
              <span>Téléchargement en cours...</span>
              <span>{Math.round(progress.percent || 0)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${progress.percent || 0}%`, background: 'linear-gradient(to right, #FF6600, #CC44FF)', borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          {isDownloaded ? (
            <button onClick={handleInstall} disabled={installing}
              style={{ flex: 1, padding: '13px 20px', borderRadius: 9999, border: 'none', background: 'linear-gradient(135deg, #FF6600, #CC44FF)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: installing ? 0.7 : 1 }}>
              {installing ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Redémarrage...</> : <><Download size={16} />Installer et redémarrer</>}
            </button>
          ) : isLaunchInfo ? (
            <>
              <button onClick={handleClose}
                style={{ flex: 1, padding: '13px 20px', borderRadius: 9999, border: 'none', background: 'linear-gradient(135deg, #FF6600, #CC44FF)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                Commencer l'écoute 🎧
              </button>
              {window.electronAPI && (
                <button onClick={handleCheckUpdate}
                  style={{ padding: '13px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} />Mises à jour
                </button>
              )}
            </>
          ) : (
            <button disabled
              style={{ flex: 1, padding: '13px 20px', borderRadius: 9999, border: 'none', background: 'rgba(255,102,0,0.2)', color: '#FF6600', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RefreshCw size={16} style={{ animation: 'spin 2s linear infinite' }} />Téléchargement automatique...
            </button>
          )}
          {!isDownloaded && !isLaunchInfo && (
            <button onClick={handleClose}
              style={{ padding: '13px 18px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
