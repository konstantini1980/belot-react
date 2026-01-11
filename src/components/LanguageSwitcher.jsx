import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        className={`lang-button ${language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        title={t('english')}
      >
        🇬🇧
      </button>
      <button
        className={`lang-button ${language === 'bg' ? 'active' : ''}`}
        onClick={() => changeLanguage('bg')}
        title={t('bulgarian')}
      >
        🇧🇬
      </button>
    </div>
  );
}

