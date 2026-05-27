import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Sparkles, Download, RefreshCw } from 'lucide-react';

export default function UpdateModal() {
  const { updateInfo, setUpdateInfo } = useContext(AppContext);
  const [installing, setInstalling] = useState(false);

  if (!updateInfo) return null;

  const handleClose = () => {
    localStorage.setItem('pandofy_last_seen_version', updateInfo.version);
    setUpdateInfo(null);
  };

  const handleInstall = () => {
    setInstalling(true);
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    } else {
      setTimeout(() => setInstalling(false), 2000);
    }
  };

  const isDownloaded = updateInfo.downloaded;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <button className="modal-close-btn" onClick={handleClose}><X size={20} /></button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', backgroundColor: 'rgba(255, 102, 0, 0.1)', color: 'var(--color-primary)', marginBottom: 12 }}>
            <Sparkles size={32} />
          </div>
          <h2 className="modal-title" style={{ margin: 0 }}>
            {isDownloaded ? 'Prête à installer !' : 'Mise à jour disponible !'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Version {updateInfo.version}
          </div>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, textAlign: 'center', marginBottom: 20 }}>
          {isDownloaded
            ? 'La mise à jour a été téléchargée. Cliquez sur "Installer maintenant" pour redémarrer et appliquer la mise à jour.'
            : 'Une nouvelle version de Pandofy est disponible et se télécharge en arrière-plan.'}
        </p>

        {updateInfo.changelog && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, color: '#fff' }}>Nouveautés :</div>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {updateInfo.changelog.map((item, idx) => (
                <li key={idx} style={{ lineHeight: 1.4 }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {isDownloaded ? (
            <button className="btn-primary modal-submit-btn" onClick={handleInstall} disabled={installing}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: installing ? 0.7 : 1 }}>
              {installing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
              {installing ? 'Redémarrage...' : 'Installer maintenant'}
            </button>
          ) : (
            <button className="btn-primary modal-submit-btn" onClick={handleClose} style={{ flex: 1 }}>
              Téléchargement en cours...
            </button>
          )}
          <button onClick={handleClose}
            style={{ padding: '12px 20px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
