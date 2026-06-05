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
            <circle cx="50" cy="50" r="45" stroke="#FF6600" strokeWidth="6" />
            {/* A stylized music note */}
            <path d="M42 32V60C39.3 58.3 35.8 58.7 33.3 61.2C30.4 64.1 30.4 68.9 33.3 71.8C36.2 74.7 41 74.7 43.9 71.8C45.9 69.8 46.5 66.8 46 64.1V40H62V52C59.3 50.3 55.8 50.7 53.3 53.2C50.4 56.1 50.4 60.9 53.3 63.8C56.2 66.7 61 66.7 63.9 63.8C65.9 61.8 66.5 58.8 66 56.1V32H42Z" fill="#FF6600" />
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
