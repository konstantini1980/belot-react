import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDialog from './ConfirmDialog';
import './LanguageSwitcher.css';

// A small X that exits the game in progress (after a confirmation) and goes back to the start screen.
// With noConfirm it closes straight away (an online panel with nothing to lose).
export default function ExitGameButton({ onExitGame, confirmText, noConfirm = false, className = 'lang-button icon-button', label }) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const title = label || t('exitGame');

  return (
    <>
      <button className={className} onClick={() => (noConfirm ? onExitGame() : setConfirming(true))} title={title} aria-label={title}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {confirming && (
        <ConfirmDialog
          message={confirmText || t('confirmExitGame')}
          confirmLabel={t('exitGame')}
          onConfirm={() => { setConfirming(false); onExitGame(); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
