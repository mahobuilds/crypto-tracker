import type { Language } from '@crypto-tracker/shared';
import { isLanguage } from '@/i18n';

export const LANGUAGE_STORAGE_KEY = 'crypto-tracker.language';

/** Language chosen before sign-in, if any. Safe when storage is unavailable. */
export function readStoredLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage may be unavailable (private mode); the choice simply is not remembered.
  }
}
