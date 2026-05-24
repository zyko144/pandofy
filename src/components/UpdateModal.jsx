import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Sparkles } from 'lucide-react';

export default function UpdateModal() {
  const { updateInfo, setUpdateInfo } = useContext(AppContext);

  if (!updateInfo) return null;

  const handleClose = () => {
    localStorage.setItem('pandofy_last_seen_version', updateInfo.version);
    setUpdateInfo(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <button className="modal-close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: 12, 
            borderRadius: '50%', 
            backgroundColor: 'rgba(255, 102, 0, 0.1)', 
            color: 'var(--color-primary)',
            marginBottom: 12
          }}>
            <Sparkles size={32} />
          </div>
          <h2 className="modal-title" style={{ margin: 0 }}>Mise à jour installée !</h2>
          <div style={{ 
            fontSize: '0.85rem', 
            color: 'var(--color-primary)', 
            fontWeight: 700, 
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Version {updateInfo.version}
          </div>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, textAlign: 'center', marginBottom: 20 }}>
          L'application a été mise à jour automatiquement en arrière-plan. Vous n'avez pas besoin de réinstaller l'application.
        </p>

        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 8, padding: 16, border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, color: '#fff' }}>Nouveautés :</div>
          <ul style={{ paddingLeft: 20, margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {updateInfo.changelog.map((item, idx) => (
              <li key={idx} style={{ lineHeight: 1.4 }}>{item}</li>
            ))}
          </ul>
        </div>

        <button className="btn-primary modal-submit-btn" onClick={handleClose}>
          Génial !
        </button>
      </div>
    </div>
  );
}
