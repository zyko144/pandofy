import { useEffect } from 'react';

/**
 * useKeyboardShortcuts — Raccourcis clavier globaux pour Pandofy.
 * Ignorés si le focus est dans un champ texte (INPUT, TEXTAREA, SELECT).
 */
export function useKeyboardShortcuts({
  togglePlay,
  nextTrack,
  prevTrack,
  setVolume,
  setMuted,
  muted,
  toggleLike,
  currentTrack,
  focusSearch,
}) {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay?.();
          break;

        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            nextTrack?.();
          }
          break;

        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            prevTrack?.();
          }
          break;

        case 'ArrowUp':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setVolume?.(v => Math.min(1, parseFloat((v + 0.05).toFixed(2))));
          }
          break;

        case 'ArrowDown':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setVolume?.(v => Math.max(0, parseFloat((v - 0.05).toFixed(2))));
          }
          break;

        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) {
            setMuted?.(m => !m);
          }
          break;

        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey && currentTrack) {
            toggleLike?.(currentTrack.id);
          }
          break;

        case 'KeyF':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            focusSearch?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, nextTrack, prevTrack, setVolume, setMuted, muted, toggleLike, currentTrack, focusSearch]);
}

/**
 * Liste des raccourcis pour l'affichage dans le modal d'aide.
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Espace'], description: 'Lecture / Pause' },
  { keys: ['Ctrl', '→'], description: 'Piste suivante' },
  { keys: ['Ctrl', '←'], description: 'Piste précédente' },
  { keys: ['↑'], description: 'Volume +5%' },
  { keys: ['↓'], description: 'Volume -5%' },
  { keys: ['M'], description: 'Muet / Son' },
  { keys: ['L'], description: 'Liker le morceau en cours' },
  { keys: ['Ctrl', 'F'], description: 'Focuser la recherche' },
];
