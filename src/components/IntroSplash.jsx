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
    const t1 = setTimeout(() => { initAudioCtx(); setPhase('news'); }, 1400);
    const t2 = setTimeout(() => setPhase('fade'), 6000);
    const t3 = setTimeout(() => setRemoved(true), 6800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [initAudioCtx]);

  const dismiss = () => { setPhase('fade'); setTimeout(() => setRemoved(true), 800); };

  if (removed) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'fade' ? 0 : 1,
      transition: 'opacity 0.8s ease',
    }}>
      {/* Close button */}
      {phase === 'news' && (
        <button onClick={dismiss} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, color: '#fff', padding: '6px 14px', cursor: 'pointer',
          fontSize: 13, fontWeight: 600,
        }}>Fermer ✕</button>
      )}

      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 48, height: 48 }}>
            <path d="M51 25 H55 C63 30 69 42 65 54 C60 41 55 36 55 36 V67 C55 67 50 73 42 78 C34 83 29 81 29 73 C29 65 34 58 40 58 C46 58 49 60 51 62.5 V25 Z" fill="#FF6600" />
          </svg>
          <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: 4 }}>PANDOFY</h1>
        </div>
        <p style={{ color: '#FF6600', fontSize: '0.8rem', fontWeight: 600, marginBottom: 32, letterSpacing: 2 }}>NEXT-GEN MUSIC</p>

        {/* News */}
        {phase === 'news' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Nouveautés</p>
            {NEWS.map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 16px', marginBottom: 8, textAlign: 'left',
                animation: `fadeInUp 0.4s ease ${i * 0.1}s both`,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{n.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', lineHeight: 1.4 }}>{n.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
