import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const NEWS = [
  { icon: '🎵', text: 'Lecteur YouTube amélioré — démarrage et progression fluides' },
  { icon: '🗑️', text: 'Suppression de playlist — le créateur supprime pour tous' },
  { icon: '🎮', text: 'Connexion Discord OAuth — rejoins avec ton compte Discord' },
];

export default function IntroSplash() {
  const [phase, setPhase] = useState('logo'); // logo → news → fade
  const [removed, setRemoved] = useState(false);
  const { initAudioCtx } = useContext(AppContext);

  useEffect(() => {
    // Phase transition: logo is shown for 1.4s, then news is shown.
    const t1 = setTimeout(() => { 
      initAudioCtx(); 
      setPhase('news'); 
    }, 1400);

    // Auto-dismiss after 15s in case user is AFK, but they can dismiss manually
    const t2 = setTimeout(() => setPhase('fade'), 15000);
    const t3 = setTimeout(() => setRemoved(true), 15800);

    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
    };
  }, [initAudioCtx]);

  const dismiss = () => { 
    setPhase('fade'); 
    setTimeout(() => setRemoved(true), 800); 
  };

  if (removed) return null;

  return (
    <div style={{
      position: 'fixed', 
      inset: 0, 
      background: 'radial-gradient(circle at center, rgba(255, 102, 0, 0.12) 0%, #080808 80%)', 
      zIndex: 99999,
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      opacity: phase === 'fade' ? 0 : 1,
      transition: 'opacity 0.8s ease',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ 
        textAlign: 'center', 
        maxWidth: 440, 
        width: '90%',
        padding: '40px 32px',
        background: 'rgba(18, 18, 18, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 102, 0, 0.25)',
        borderRadius: 24,
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(255, 102, 0, 0.12)',
        animation: 'scaleInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo Section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 12, 
          marginBottom: phase === 'news' ? 24 : 0,
          transition: 'margin-bottom 0.4s ease'
        }}>
          <div style={{
            animation: 'pulseGlow 2.5s infinite ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 64 }}>
              <path d="M51 25 H55 C63 30 69 42 65 54 C60 41 55 36 55 36 V67 C55 67 50 73 42 78 C34 83 29 81 29 73 C29 65 34 58 40 58 C46 58 49 60 51 62.5 V25 Z" fill="#FF6600" />
            </svg>
          </div>
          <h1 style={{ 
            color: '#fff', 
            fontSize: '2.2rem', 
            fontWeight: 900, 
            margin: 0, 
            letterSpacing: 6, 
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            PANDOFY
          </h1>
          <p style={{ 
            color: '#FF6600', 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            margin: 0, 
            letterSpacing: 4, 
            textTransform: 'uppercase',
            opacity: 0.9 
          }}>
            NEXT-GEN MUSIC
          </p>
        </div>

        {/* News Section */}
        {phase === 'news' && (
          <div style={{ 
            animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.45)', 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              letterSpacing: 2, 
              textTransform: 'uppercase', 
              marginBottom: 4,
              marginTop: 10
            }}>
              ✨ Nouveautés de cette version
            </p>
            {NEWS.map((n, i) => (
              <div 
                key={i} 
                className="news-card"
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 14,
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 102, 0, 0.08)',
                  borderRadius: 14, 
                  padding: '12px 16px', 
                  textAlign: 'left',
                  animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s both`,
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
              >
                <div style={{ 
                  fontSize: '1.1rem',
                  background: 'rgba(255, 102, 0, 0.1)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 102, 0, 0.2)'
                }}>
                  {n.icon}
                </div>
                <span style={{ 
                  color: 'rgba(255, 255, 255, 0.85)', 
                  fontSize: '0.84rem', 
                  lineHeight: 1.45,
                  fontWeight: 500 
                }}>
                  {n.text}
                </span>
              </div>
            ))}

            {/* Bottom CTA Action Button */}
            <button 
              onClick={dismiss} 
              style={{
                marginTop: 18,
                background: 'linear-gradient(135deg, #FF6600, #FF3300)',
                border: 'none',
                borderRadius: 9999,
                color: '#fff',
                padding: '14px 28px',
                fontSize: '0.98rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(255, 102, 0, 0.35)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 102, 0, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 102, 0, 0.35)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px)';
              }}
            >
              Commencer l'écoute 🎧
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleInUp {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { 
            transform: scale(1); 
            filter: drop-shadow(0 0 4px rgba(255, 102, 0, 0.2)); 
          }
          50% { 
            transform: scale(1.05); 
            filter: drop-shadow(0 0 16px rgba(255, 102, 0, 0.65)); 
          }
        }
        .news-card:hover {
          background: rgba(255, 102, 0, 0.05) !important;
          border-color: rgba(255, 102, 0, 0.25) !important;
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
