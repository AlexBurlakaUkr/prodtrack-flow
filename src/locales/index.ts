import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, TranslationKey } from './en';
import { ua } from './ua';
import { Language } from '../types';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  ua,
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('prodtrack_lang') as Language;
    return saved === 'en' || saved === 'ua' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('prodtrack_lang', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let template: string = translations[language]?.[key] || translations.en[key] || key;
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        const val = String(params[paramKey]);
        template = template.split(`{${paramKey}}`).join(val);
      });
    }
    return template;
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
  };

  return React.createElement(I18nContext.Provider, { value: contextValue }, children);
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
