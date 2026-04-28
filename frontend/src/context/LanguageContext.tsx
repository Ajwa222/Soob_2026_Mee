/**
 * Language and theme context — provides multi-language translations and light/dark theme.
 *
 * Supported: en, ar, ur, hi, bn, tl. ar and ur render RTL; all others render LTR.
 *
 * Only English is bundled into the main JS chunk. Other languages live in
 * separate files under `src/locales/` and are dynamic-imported the first time
 * the user picks them. This keeps the initial payload small — ~25 KB instead
 * of ~180 KB — while still giving users all 6 languages.
 *
 * Usage: const { lang, t, setLang, toggleLang, theme, toggleTheme } = useLang();
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import en from '../locales/en';

export type Lang = 'en' | 'ar' | 'ur' | 'hi' | 'bn' | 'tl';
type Theme = 'light' | 'dark';

export const SUPPORTED_LANGS: Lang[] = ['en', 'ar', 'ur', 'hi', 'bn', 'tl'];
const RTL_LANGS: Lang[] = ['ar', 'ur'];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  ar: 'العربية',
  ur: 'اردو',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  tl: 'Filipino',
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (path: string, params?: Record<string, string>) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const LanguageContext = createContext<LangContextValue | null>(null);

type Dict = Record<string, unknown>;

// In-memory cache of loaded dictionaries. EN is pre-populated synchronously.
const dictCache: Partial<Record<Lang, Dict>> = { en: en as Dict };

// Per-language loader map — Vite turns each dynamic import() into its own chunk,
// so users only download the dict they actually switch to.
const loaders: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Dict }>> = {
  ar: () => import('../locales/ar'),
  ur: () => import('../locales/ur'),
  hi: () => import('../locales/hi'),
  bn: () => import('../locales/bn'),
  tl: () => import('../locales/tl'),
};

/** Loads a language dict if not already cached. Returns the dict (or EN fallback on failure). */
async function loadDict(lang: Lang): Promise<Dict> {
  if (dictCache[lang]) return dictCache[lang]!;
  if (lang === 'en') return en as Dict;
  try {
    const mod = await loaders[lang]();
    dictCache[lang] = mod.default;
    return mod.default;
  } catch (err) {
    console.warn(`[i18n] failed to load ${lang}, falling back to English`, err);
    return en as Dict;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('soob-lang') as Lang | null;
    return stored && SUPPORTED_LANGS.includes(stored) ? stored : 'en';
  });
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('soob-theme') as Theme) || 'light');
  // Tick bumps every time a new dict finishes loading — forces t() consumers to re-render
  // with the newly available strings without changing the `lang` identity.
  const [dictTick, setDictTick] = useState(0);

  // Kick off a load whenever lang changes. If already cached, this is a no-op await.
  useEffect(() => {
    let cancelled = false;
    if (!dictCache[lang]) {
      loadDict(lang).then(() => {
        if (!cancelled) setDictTick((n) => n + 1);
      });
    }
    return () => { cancelled = true; };
  }, [lang]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem('soob-theme', t);
    setThemeState(t);
  }, []);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem('soob-lang', next);
    setLangState(next);
    // Warm the cache in the background if it isn't there yet — reduces the flicker
    // when the component re-renders with the stale dict before the load completes.
    if (!dictCache[next]) {
      loadDict(next).then(() => setDictTick((n) => n + 1));
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('soob-lang', next);
      if (!dictCache[next]) loadDict(next).then(() => setDictTick((n) => n + 1));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('soob-theme', next);
      return next;
    });
  }, []);

  /**
   * Translates a dot-path key. Falls back to English if the current language dict
   * hasn't loaded yet, or a specific key is missing. Reads from the cache directly
   * — no useState for the dict, so React doesn't re-render the whole tree on load;
   * only the `dictTick` increments, which is what drives the re-render.
   */
  const t = useCallback((path: string, params?: Record<string, string>): string => {
    const keys = path.split('.');
    const lookup = (dict: Dict | undefined): unknown => {
      if (!dict) return undefined;
      let cur: unknown = dict;
      for (const key of keys) {
        cur = (cur as Record<string, unknown>)?.[key];
      }
      return cur;
    };
    let result = lookup(dictCache[lang]);
    if (result === undefined || result === null) result = lookup(dictCache.en);
    if (result === undefined || result === null) return path;
    if (params && typeof result === 'string') {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, v),
        result,
      );
    }
    return result as string;
  // dictTick in deps forces t() consumers to re-run lookup once the dict lands.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, dictTick]);

  // HTML dir/lang — deferred to idle time so the click-handler paint doesn't block on the reflow.
  useEffect(() => {
    const apply = () => {
      const html = document.documentElement;
      html.setAttribute('dir', RTL_LANGS.includes(lang) ? 'rtl' : 'ltr');
      html.setAttribute('lang', lang);
    };
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(apply, { timeout: 500 });
      return () => { if (typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(id); };
    }
    const id = setTimeout(apply, 16);
    return () => clearTimeout(id);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo(() => ({
    lang, setLang, toggleLang, t, theme, setTheme, toggleTheme,
  }), [lang, setLang, toggleLang, t, theme, setTheme, toggleTheme]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
};
