import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider, useLocale } from './LocaleProvider';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = '';
});

function LocaleProbe() {
  const { locale, setLocale, t, formatNumber, formatDate } = useLocale();
  return (
    <div>
      <span>{locale}</span>
      <span>{t('Cancel')}</span>
      <span>{formatNumber(1234.5)}</span>
      <span>{formatDate(new Date('2026-10-22T00:00:00Z'))}</span>
      <button onClick={() => setLocale('vi')}>change language</button>
    </div>
  );
}

describe('LocaleProvider', () => {
  it('starts in explicit English regardless of browser locale', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'vi-VN' });
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);

    expect(screen.getByText('en')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('sdi-locale')).toBeNull();
  });

  it('persists Vietnamese and applies its catalog and Intl formatting', () => {
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'change language' }));

    expect(screen.getByText('vi')).toBeTruthy();
    expect(screen.getByText('Hủy')).toBeTruthy();
    expect(document.documentElement.lang).toBe('vi');
    expect(localStorage.getItem('sdi-locale')).toBe('vi');
    expect(screen.getByText('1.234,5')).toBeTruthy();
  });

  it('restores a saved supported locale and ignores invalid preferences', () => {
    localStorage.setItem('sdi-locale', 'vi');
    const { rerender } = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    expect(screen.getByText('vi')).toBeTruthy();

    localStorage.setItem('sdi-locale', 'fr');
    rerender(<LocaleProvider key="fallback"><LocaleProbe /></LocaleProvider>);
    expect(screen.getByText('en')).toBeTruthy();
  });
});
