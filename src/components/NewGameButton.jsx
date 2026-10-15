import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

// Abandons the game in progress (after a confirmation) and deals a new one.
// Shows as an icon on phones and as an icon with text on desktop.
export default function NewGameButton({ onNewGame }) {
  const { t } = useLanguage();

  const handleClick = () => {
    if (window.confirm(t('confirmNewGame'))) onNewGame();
  };

  return (
    <button className="lang-button new-game-top-button" onClick={handleClick} title={t('newGame')} aria-label={t('newGame')}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
      </svg>
      <span className="new-game-top-label">{t('newGame')}</span>
    </button>
  );
}
