import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Sparkles, Download, RefreshCw, CheckCircle, Info } from 'lucide-react';

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
    <div 
      className="modal-overlay" 
      style={{ 
        zIndex: 10000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }} 
      onClick={isLaunchInfo ? handleClose : undefined}
    >
      <div 
        className="modal-content animate-fade-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: 480, 
          width: '90%', 
          background: 'radial-gradient(circle at top, rgba(255, 102, 0, 0.08) 0%, #111111 80%)', 
          border: '1.5px solid #FF6600', 
          borderRadius: 20, 
          padding: '36px 30px 30px', 
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 102, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Close Button "X" */}
        <button 
          onClick={handleClose} 
          title="Fermer"
          style={{ 
            position: 'absolute', 
            top: 20, 
            right: 20, 
            background: 'none', 
            border: 'none', 
            color: 'rgba(255, 255, 255, 0.35)', 
            cursor: 'pointer', 
            transition: 'color 0.2s, transform 0.2s',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.35)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <X size={20} />
        </button>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              padding: 16, 
              borderRadius: '50%', 
              backgroundColor: '#1c1c1c', 
              border: '2px solid #FF6600', 
              color: '#FF6600', 
              marginBottom: 16,
              boxShadow: '0 0 15px rgba(255, 102, 0, 0.25)' 
            }}
          >
            {isDownloaded ? <CheckCircle size={32} /> : isLaunchInfo ? <Sparkles size={32} /> : <Info size={32} />}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>
            {isDownloaded ? 'Mise à jour prête !' : isLaunchInfo ? `Bienvenue sur Pandofy` : 'Mise à jour disponible'}
          </h2>
          <div style={{ fontSize: '0.8rem', color: '#FF6600', fontWeight: 800, marginTop: 8, textTransform: 'uppercase', letterSpacing: '2px' }}>
            Version {updateInfo.version}
          </div>
        </div>

        {/* Changelog Box */}
        {updateInfo.changelog && updateInfo.changelog.length > 0 && (
          <div 
            style={{ 
              background: '#0d0d0d', 
              border: '1px solid rgba(255, 255, 255, 0.05)', 
              borderRadius: 14, 
              padding: '18px 20px', 
              marginBottom: 24 
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.75rem', marginBottom: 12, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ✨ Nouveautés de cette version
            </div>
            <div 
              style={{ 
                maxHeight: 180, 
                overflowY: 'auto', 
                paddingRight: 6,
                scrollbarWidth: 'thin',
                scrollbarColor: '#FF6600 rgba(255,255,255,0.05)'
              }}
            >
              <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {updateInfo.changelog.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: '#e0e0e0', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Download progress */}
        {progress && !isDownloaded && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              <span>Téléchargement de la mise à jour...</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>{Math.round(progress.percent || 0)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${progress.percent || 0}%`, 
                  background: 'linear-gradient(to right, #FF6600, #FF3300)', 
                  borderRadius: 3, 
                  transition: 'width 0.2s ease' 
                }} 
              />
            </div>
          </div>
        )}

        {/* Actions Button Bar */}
        <div style={{ display: 'flex', gap: 12 }}>
          {isDownloaded ? (
            <>
              <button 
                onClick={handleInstall} 
                disabled={installing}
                style={{ 
                  flex: 2, 
                  padding: '13px 20px', 
                  borderRadius: 9999, 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #FF6600, #FF3300)', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: '0.95rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8, 
                  opacity: installing ? 0.75 : 1,
                  boxShadow: '0 4px 15px rgba(255,102,0,0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { if (!installing) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {installing ? (
                  <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Redémarrage...</>
                ) : (
                  <><Download size={16} />Installer et redémarrer</>
                )}
              </button>
              <button 
                onClick={handleClose}
                style={{ 
                  flex: 1, 
                  padding: '13px 18px', 
                  borderRadius: 9999, 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  background: 'transparent', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Plus tard
              </button>
            </>
          ) : isLaunchInfo ? (
            <>
              <button 
                onClick={handleClose}
                style={{ 
                  flex: 2, 
                  padding: '13px 20px', 
                  borderRadius: 9999, 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #FF6600, #FF3300)', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: '0.95rem', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255,102,0,0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Commencer l'écoute 🎧
              </button>
              {window.electronAPI && (
                <button 
                  onClick={handleCheckUpdate}
                  style={{ 
                    flex: 1, 
                    padding: '13px 16px', 
                    borderRadius: 9999, 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    background: 'transparent', 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 6,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <RefreshCw size={14} /> Mises à jour
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                disabled
                style={{ 
                  flex: 2, 
                  padding: '13px 20px', 
                  borderRadius: 9999, 
                  border: 'none', 
                  background: 'rgba(255, 102, 0, 0.12)', 
                  color: '#FF6600', 
                  fontWeight: 600, 
                  cursor: 'not-allowed', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8 
                }}
              >
                <RefreshCw size={16} style={{ animation: 'spin 2s linear infinite' }} /> Téléchargement automatique...
              </button>
              <button 
                onClick={handleClose}
                style={{ 
                  flex: 1, 
                  padding: '13px 18px', 
                  borderRadius: 9999, 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  background: 'transparent', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Plus tard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
