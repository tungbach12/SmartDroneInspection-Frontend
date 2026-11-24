import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CustomCursorPointer } from './CustomCursorPointer';
import { useCustomTheme } from './CustomThemeContext';
import { CustomThemeProvider } from './CustomThemeProvider';

function PointerHarness() {
  const { setCursorStyle } = useCustomTheme();
  return (
    <div>
      <button type="button" onClick={() => setCursorStyle('system')}>
        Use System Cursor
      </button>
      <input type="text" aria-label="Search input" />
      <CustomCursorPointer />
    </div>
  );
}

describe('CustomCursorPointer (Waypoint Diamond)', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('sdi-custom-cursor');
    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      user: {
        id: 'pointer-user',
        email: 'pointer@test.com',
        fullName: 'Pointer User',
        roles: ['CUSTOMER'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('sdi-custom-cursor');
    useAuthStore.getState().clearSession();
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it('activates Waypoint Diamond globally, morphs on text inputs, and toggles back to system cursor', () => {
    render(
      <CustomThemeProvider>
        <PointerHarness />
      </CustomThemeProvider>,
    );

    expect(document.documentElement.classList.contains('sdi-custom-cursor')).toBe(true);
    const pointer = screen.getByTestId('custom-cursor-pointer');
    expect(pointer.getAttribute('data-cursor-style')).toBe('waypoint-diamond');

    const input = screen.getByLabelText('Search input');
    fireEvent(input, new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 80 }));
    expect(screen.getByTestId('custom-cursor-pointer').getAttribute('data-cursor-mode')).toBe(
      'ibeam',
    );

    fireEvent.click(screen.getByText('Use System Cursor'));
    expect(document.documentElement.classList.contains('sdi-custom-cursor')).toBe(false);
    expect(screen.queryByTestId('custom-cursor-pointer')).toBeNull();
  });

  it('disables custom cursor when prefers-reduced-motion is enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <CustomThemeProvider>
        <PointerHarness />
      </CustomThemeProvider>,
    );

    expect(document.documentElement.classList.contains('sdi-custom-cursor')).toBe(false);
    expect(screen.queryByTestId('custom-cursor-pointer')).toBeNull();
  });
});
