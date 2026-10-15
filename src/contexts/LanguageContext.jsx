import React, { createContext, useContext, useState, useMemo } from 'react';
import en from '../locales/en';
import bg from '../locales/bg';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('belot-language');
    return savedLanguage || 'en';
  });

  // Built once per language, so consumers only re-render when the language changes
  const value = useMemo(() => {
    const translations = language === 'bg' ? bg : en;

    const t = (key, params = {}) => {
      let translation = translations[key] || key;

      // Replace parameters in translation
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });

      return translation;
    };

    const changeLanguage = (lang) => {
      setLanguage(lang);
      localStorage.setItem('belot-language', lang);
    };

    return { language, changeLanguage, t };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

