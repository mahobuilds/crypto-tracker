import { LANGUAGE_DIRECTION, LANGUAGES } from '@crypto-tracker/shared';
import type { Language } from '@crypto-tracker/shared';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

type TranslationTree = Record<string, unknown>;

const modules = import.meta.glob<TranslationTree>('./{en,ar}/*.json', {
  eager: true,
  import: 'default',
});

const resources: Record<Language, { translation: TranslationTree }> = {
  en: { translation: {} },
  ar: { translation: {} },
};

for (const [path, tree] of Object.entries(modules)) {
  const match = /^\.\/(en|ar)\/([^/]+)\.json$/.exec(path);
  if (!match) continue;
  const language = match[1] as Language;
  const feature = match[2] as string;
  resources[language].translation[feature] = tree;
}

void i18next.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: [...LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function applyLanguage(lang: Language): void {
  if (i18next.language !== lang) {
    void i18next.changeLanguage(lang);
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGUAGE_DIRECTION[lang];
}

export default i18next;
