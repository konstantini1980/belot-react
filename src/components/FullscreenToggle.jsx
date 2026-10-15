import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

// Optional full screen on the table. Esc and the system back gesture still
// exit it (the browser handles those); the icon follows the actual state.
export default function FullscreenToggle() {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const update = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  // iPhone Safari has no full screen API, so there is nothing to offer there
  if (!document.fullscreenEnabled) return null;

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Refused by the browser; the icon stays on the real state
    }
  };

  const label = isFullscreen ? t('exitFullScreen') : t('enterFullScreen');

  return (
    <button className="lang-button fullscreen-button" onClick={toggle} title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {isFullscreen ? (
          // Corners pointing in: leave full screen
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          // Corners pointing out: go full screen
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
}
