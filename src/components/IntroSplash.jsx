import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function IntroSplash() {
  const [faded, setFaded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const { initAudioCtx } = useContext(AppContext);

  const handleEnter = () => {
    // Initialize AudioContext on user click to comply with browser autoplay security policies
    initAudioCtx();
    setFaded(true);
    // Remove from DOM after transition completes
    setTimeout(() => {
      setRemoved(true);
    }, 800);
  };

  if (removed) return null;

  return (
    <div className={`splash-container ${faded ? 'fade-out' : ''}`}>
      <div className="logo-note-wrapper">
        <div className="wave-circle"></div>
        <div className="wave-circle"></div>
        <div className="wave-circle"></div>
        
        {/* SVG Custom Orange "P" shaped as a musical note */}
        <svg className="logo-note-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Note Head (Tilted Ellipse at bottom-left) */}
          <ellipse cx="38" cy="72" rx="16" ry="11" transform="rotate(-25 38 72)" />
          {/* Stem (Vertical Line on the right side of the note head) */}
          <rect x="47" y="20" width="7" height="52" rx="2" />
          {/* P-Loop (Half circle on the right at the top) */}
          <path d="M 52,20 C 74,20 74,48 52,48" fill="none" strokeWidth="7" strokeLinecap="round" stroke="currentColor" />
        </svg>
      </div>

      <h1 className="splash-title">PANDOFY</h1>
      <p className="splash-subtitle">Écoutez. Créez. Partagez.</p>
      
      <button className="btn-primary enter-button" onClick={handleEnter}>
        Accedez à Pandofy
      </button>
    </div>
  );
}
