import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ExitGameButton from './ExitGameButton';
import { useLanguage } from '../contexts/LanguageContext';

// Language and exit, in the top bar on desktop and on the table on phones
export function TableControls({ onExitGame, confirmText }) {
  return <><LanguageSwitcher /><ExitGameButton onExitGame={onExitGame} confirmText={confirmText} /></>;
}

export default function AppHeader({ onExitGame, confirmText }) {
  const { t } = useLanguage();
  return (
    <header className="app-header">
      <h1 className="app-logo" title={t('appTitle')}>
        {t('logo')}
        <span className="app-logo-suits" aria-hidden="true">♣<span className="red">♦♥</span>♠</span>
      </h1>
      <div className="app-header-controls">
        <TableControls onExitGame={onExitGame} confirmText={confirmText} />
      </div>
    </header>
  );
}
