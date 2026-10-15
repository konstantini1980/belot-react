import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'en', short: 'EN', nameKey: 'languageEnglish' },
  { code: 'bg', short: 'БГ', nameKey: 'languageBulgarian' },
];

// One small button showing the current language; tapping it opens a list to pick another
export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on a tap outside the menu or on Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="language-switcher" ref={rootRef}>
      <button
        className="lang-button"
        onClick={() => setOpen(o => !o)}
        title={t('chooseLanguage')}
        aria-label={t('chooseLanguage')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current.short}
      </button>
      {open && (
        <div className="language-menu" role="menu">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={l.code === language}
              className={`language-menu-item ${l.code === language ? 'active' : ''}`}
              onClick={() => {
                changeLanguage(l.code);
                setOpen(false);
              }}
            >
              {t(l.nameKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
