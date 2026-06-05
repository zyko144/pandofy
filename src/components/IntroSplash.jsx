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
      <div className="logo-note-wrapper">
        {/* SVG Custom Cinematic 3D Orange Logo */}
        <svg className="logo-note-3d" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Note Head */}
          <ellipse cx="38" cy="72" rx="16" ry="11" transform="rotate(-25 38 72)" fill="#FF6600" />
          {/* Stem */}
          <rect x="47" y="20" width="7" height="52" rx="2" fill="#FF6600" />
          {/* P-Loop */}
          <path d="M 52,20 C 74,20 74,48 52,48" fill="none" strokeWidth="7" strokeLinecap="round" stroke="#FF6600" />
        </svg>
      </div>

      <h1 className="splash-title">PANDOFY</h1>
      <p className="splash-subtitle">Écoutez. Créez. Partagez.</p>
    </div>
  );
}
