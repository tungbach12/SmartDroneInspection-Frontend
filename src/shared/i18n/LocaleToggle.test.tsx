import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider } from './LocaleProvider';
import { LocaleToggle } from './LocaleToggle';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('LocaleToggle', () => {
  it('shows the active language and lists both supported locales', () => {
    render(
      <LocaleProvider>
        <LocaleToggle />
      </LocaleProvider>,
    );

    const combo = screen.getByRole('combobox');
    expect(combo.textContent).toBe('English');
    expect(combo.getAttribute('aria-label')).toBe('Language');

    fireEvent.mouseDown(combo);
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tiếng Việt').length).toBeGreaterThan(0);
  });

  it('renders the toggle label in the selected language', () => {
    localStorage.setItem('sdi-locale', 'vi');
    render(
      <LocaleProvider>
        <LocaleToggle />
      </LocaleProvider>,
    );

    const combo = screen.getByRole('combobox');
    expect(combo.textContent).toBe('Tiếng Việt');
    expect(combo.getAttribute('aria-label')).toBe('Ngôn ngữ');
  });
});
