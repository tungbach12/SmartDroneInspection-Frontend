import { createContext } from 'react';
import { viCatalog } from './viCatalog';

export type Locale = 'en' | 'vi';
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'sdi-locale';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (english: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function getIntlLocale(locale: Locale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

export function createLocaleValue(locale: Locale, setLocale: (locale: Locale) => void): LocaleContextValue {
  const intlLocale = getIntlLocale(locale);
  const formatDate = (input: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, options).format(input instanceof Date ? input : new Date(input));
  return {
    locale,
    setLocale,
    t: (english) => locale === 'vi' ? viCatalog[english] ?? english : english,
    formatNumber: (number, options) => new Intl.NumberFormat(intlLocale, options).format(number),
    formatDate,
    formatDateTime: (input, options) => formatDate(input, { dateStyle: 'medium', timeStyle: 'short', ...options }),
  };
}
