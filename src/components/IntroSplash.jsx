import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function IntroSplash() {
  const [faded, setFaded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const { initAudioCtx } = useContext(AppContext);

  useEffect(() => {
    // Automatically transition to the application after 1.8 seconds
    const fadeTimeout = setTimeout(() => {
      initAudioCtx();
      setFaded(true);
    }, 1800);

    const removeTimeout = setTimeout(() => {
      setRemoved(true);
    }, 2600);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, [initAudioCtx]);

  if (removed) return null;

  return (
    <div className={`splash-container ${faded ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="logo-note-wrapper">
          <svg className="logo-note-3d" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Eighth note (croche) logo without circle, matching the user's uploaded image */}
            <path d="M51 25 H55 C63 30 69 42 65 54 C60 41 55 36 55 36 V67 C55 67 50 73 42 78 C34 83 29 81 29 73 C29 65 34 58 40 58 C46 58 49 60 51 62.5 V25 Z" fill="#FF6600" />
          </svg>
        </div>
        
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <h1 className="splash-title" style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>PANDOFY</h1>
          <p className="splash-subtitle" style={{ color: '#FF6600', fontSize: '1rem', margin: '5px 0 0 0', fontWeight: 600 }}>NEXT-GEN MUSIC</p>
        </div>
      </div>
    </div>
  );
}
