import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCustomTheme } from './CustomThemeContext';
import { CustomThemeProvider } from './CustomThemeProvider';
import { CursorEffectOverlay } from './CursorEffectOverlay';

function OverlayHarness() {
  const { setCursorEffect } = useCustomTheme();
  return (
    <>
      <button type="button" onClick={() => setCursorEffect('reticle')}>
        Enable Reticle
      </button>
      <button type="button" onClick={() => setCursorEffect('none')}>
        Disable Effect
      </button>
      <CursorEffectOverlay />
    </>
  );
}

describe('CursorEffectOverlay', () => {
  const originalMatchMedia = window.matchMedia;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    window.localStorage.clear();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof originalGetContext;
    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      user: {
        id: 'cursor-user',
        email: 'cursor@test.com',
        fullName: 'Cursor User',
        roles: ['CUSTOMER'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  it('defaults to off and renders non-blocking canvas overlay when enabled or disabled', () => {
    render(
      <CustomThemeProvider>
        <OverlayHarness />
      </CustomThemeProvider>,
    );

    expect(screen.queryByTestId('cursor-effect-overlay')).toBeNull();

    fireEvent.click(screen.getByText('Enable Reticle'));
    const overlay = screen.getByTestId('cursor-effect-overlay');
    expect(overlay.getAttribute('data-effect')).toBe('reticle');
    expect(overlay.style.pointerEvents).toBe('none');

    fireEvent.click(screen.getByText('Disable Effect'));
    expect(screen.queryByTestId('cursor-effect-overlay')).toBeNull();
  });

  it('disables cursor overlay when prefers-reduced-motion is enabled', () => {
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
        <OverlayHarness />
      </CustomThemeProvider>,
    );

    expect(screen.queryByTestId('cursor-effect-overlay')).toBeNull();
  });
});
