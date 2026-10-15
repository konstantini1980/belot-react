import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

// A small X that exits the game in progress (after a confirmation) and goes back to the start screen
export default function ExitGameButton({ onExitGame, confirmText }) {
  const { t } = useLanguage();

  const handleClick = () => {
    if (window.confirm(confirmText || t('confirmExitGame'))) onExitGame();
  };

  return (
    <button className="lang-button icon-button" onClick={handleClick} title={t('exitGame')} aria-label={t('exitGame')}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
