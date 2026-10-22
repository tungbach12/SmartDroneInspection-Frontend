import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LocaleContext,
  createLocaleValue,
  type Locale,
} from './localeContext';

export type { Locale, LocaleContextValue } from './localeContext';
export { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './localeContext';

function readInitialLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'vi' ? 'vi' : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The in-memory preference still applies when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => createLocaleValue(locale, setLocale), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

const fallbackValue = createLocaleValue(DEFAULT_LOCALE, () => undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  return context ?? fallbackValue;
}
