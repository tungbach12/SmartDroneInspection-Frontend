import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorModeContext } from '@/app/layouts/ColorModeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CustomThemeProvider } from './CustomThemeProvider';
import { ThemeCustomizationPanel } from './ThemeCustomizationPanel';
import { theme } from './theme';

function renderPanel() {
  return render(
    <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="sdi-mode">
      <ColorModeContext.Provider value={{ mode: 'light', toggle: vi.fn() }}>
        <CustomThemeProvider>
          <ThemeCustomizationPanel showColorModeToggle />
        </CustomThemeProvider>
      </ColorModeContext.Provider>
    </ThemeProvider>,
  );
}

describe('ThemeCustomizationPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      user: {
        id: 'user-panel',
        email: 'panel@test.com',
        fullName: 'Panel User',
        roles: ['INSPECTOR'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    window.localStorage.clear();
  });

  it('allows selecting preset themes, preset wallpapers, and resetting to default', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('theme-preset-emerald-field'));
    expect(screen.getByTestId('theme-preset-emerald-field').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByTestId('bg-preset-teal-mesh'));
    expect(screen.getByTestId('bg-preset-teal-mesh').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('bg-target-both')).toBeTruthy();

    fireEvent.click(screen.getByTestId('bg-target-sidebar'));
    expect(screen.getByTestId('bg-target-sidebar').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByTestId('cursor-style-micro-drone'));
    expect(screen.getByTestId('cursor-style-micro-drone').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByTestId('cursor-color-059669'));
    expect(screen.getByTestId('cursor-color-059669').getAttribute('aria-pressed')).toBe('true');

    fireEvent.change(screen.getByTestId('cursor-color-picker'), { target: { value: '#ff5500' } });

    fireEvent.click(screen.getByTestId('cursor-style-system'));
    expect(screen.getByTestId('cursor-style-system').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByTestId('cursor-effect-reticle'));
    expect(screen.getByTestId('cursor-effect-reticle').getAttribute('aria-pressed')).toBe('true');

    expect(screen.getByTestId('pet-companion-none').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByTestId('pet-companion-drone-buddy'));
    expect(screen.getByTestId('pet-companion-drone-buddy').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByTestId('theme-reset-default-button'));
    expect(screen.getByTestId('theme-preset-default').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('cursor-style-waypoint-diamond').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('cursor-effect-trail').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('pet-companion-none').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('bg-target-both')).toBeNull();
  });

  it('rejects non-image uploads and supports valid custom background upload & removal', async () => {
    renderPanel();

    const input = screen.getByTestId('custom-background-file-input');
    const invalidFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(
      await screen.findByText('Please select a valid image file (PNG, JPEG, WEBP, GIF).'),
    ).toBeTruthy();

    const validImage = new File(['png-bytes'], 'custom-wallpaper.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [validImage] } });

    await waitFor(() => {
      expect(screen.getByTestId('remove-custom-background-button')).toBeTruthy();
      expect(screen.getByText('custom-wallpaper.png')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('remove-custom-background-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('remove-custom-background-button')).toBeNull();
    });
  });
});
