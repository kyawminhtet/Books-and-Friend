'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './locales/en';
import my from './locales/my';
import ja from './locales/ja';

export type Locale = 'en' | 'my' | 'ja';
type Key = keyof typeof en;
const messages = { en, my, ja } as const;
const storageKey = 'books-and-friends-language';
type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: Key, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'en' || saved === 'my' || saved === 'ja') setLocaleState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages[locale]['meta.title'];
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = messages[locale]['meta.description'];
  }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(storageKey, next);
  }, []);
  const t = useCallback((key: Key, values: Record<string, string | number> = {}) => {
    let text: string = messages[locale][key] ?? en[key];
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`language-select ${compact ? 'language-select-compact' : ''}`}>
    <span>{t('language.label')}</span>
    <select aria-label={t('language.label')} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
      <option value="en">{t('language.english')}</option>
      <option value="my">{t('language.burmese')}</option>
      <option value="ja">{t('language.japanese')}</option>
    </select>
  </label>;
}
