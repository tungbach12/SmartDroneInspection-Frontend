import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CustomCursorPointer } from './CustomCursorPointer';
import { useCustomTheme } from './CustomThemeContext';
import { CustomThemeProvider } from './CustomThemeProvider';

function PointerHarness() {
  const { setCursorStyle, setCursorColor } = useCustomTheme();
  return (
    <div>
      <button type="button" data-cursor-tag="FLY" onClick={() => setCursorStyle('pilot-badge')}>
        Use Pilot Badge
      </button>
      <button type="button" onClick={() => setCursorColor('#087E8B')}>
        Set Teal Cursor
      </button>
      <button type="button" onClick={() => setCursorStyle('system')}>
        Use System Cursor
      </button>
      <input type="text" aria-label="Search input" />
      <CustomCursorPointer />
    </div>
  );
}

describe('CustomCursorPointer (10 Designs + Color)', () => {
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

  it('defaults to Waypoint Diamond, supports switching cursor design & color, and toggles to system cursor', () => {
    render(
      <CustomThemeProvider>
        <PointerHarness />
      </CustomThemeProvider>,
    );

    expect(document.documentElement.classList.contains('sdi-custom-cursor')).toBe(true);
    const pointer = screen.getByTestId('custom-cursor-pointer');
    expect(pointer.getAttribute('data-cursor-style')).toBe('waypoint-diamond');

    fireEvent.click(screen.getByText('Set Teal Cursor'));
    expect(screen.getByTestId('custom-cursor-pointer').getAttribute('data-cursor-color')).toBe(
      '#087E8B',
    );

    const pilotBtn = screen.getByText('Use Pilot Badge');
    fireEvent.click(pilotBtn);
    expect(screen.getByTestId('custom-cursor-pointer').getAttribute('data-cursor-style')).toBe(
      'pilot-badge',
    );
    fireEvent(pilotBtn, new MouseEvent('pointermove', { bubbles: true, clientX: 60, clientY: 40 }));
    expect(screen.getByTestId('custom-cursor-tag').textContent).toBe('FLY');

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
