import pt from "./locales/pt";
import en from "./locales/en";
import de from "./locales/de";
import es from "./locales/es";
import it from "./locales/it";

export type Locale = "pt" | "en" | "de" | "es" | "it";
export type TranslationKey = keyof typeof pt;

const locales: Record<Locale, Record<string, string>> = { pt, en, de, es, it };

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Portugues",
  en: "English",
  de: "Deutsch",
  es: "Espanol",
  it: "Italiano",
};

const STORAGE_KEY = "ll_locale";

export function getStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in locales) return stored as Locale;
  // Auto-detect from browser
  const lang = navigator.language.split("-")[0];
  if (lang in locales) return lang as Locale;
  return "pt";
}

export function setStoredLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function t(key: TranslationKey, params?: Record<string, string | number>, locale?: Locale): string {
  const currentLocale = locale ?? getStoredLocale();
  const translations = locales[currentLocale] ?? locales.pt;
  let text = translations[key] ?? locales.pt[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return text;
}

export { locales };
