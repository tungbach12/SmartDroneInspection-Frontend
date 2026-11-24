import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  BACKGROUND_PRESETS,
  DEFAULT_USER_THEME_PREFERENCES,
  getUserThemeStorageKey,
} from './customTheme';
import { useCustomTheme } from './CustomThemeContext';
import { CustomThemeProvider } from './CustomThemeProvider';

function ThemeProbe() {
  const {
    preferences,
    activePreset,
    activeBackgroundUrl,
    setPresetId,
    selectBackgroundPreset,
    selectDefaultBackground,
    uploadCustomBackground,
    removeCustomBackground,
    setBackgroundTarget,
    setSurfaceOpacity,
    resetToDefault,
  } = useCustomTheme();

  return (
    <div>
      <span data-testid="preset-id">{preferences.presetId}</span>
      <span data-testid="primary-color">{activePreset.primary}</span>
      <span data-testid="bg-source">{preferences.backgroundSource}</span>
      <span data-testid="bg-url">{activeBackgroundUrl ?? 'none'}</span>
      <span data-testid="bg-target">{preferences.backgroundTarget}</span>
      <span data-testid="opacity">{preferences.surfaceOpacity}</span>
      <button type="button" onClick={() => setPresetId('aero-teal')}>
        Set Teal
      </button>
      <button type="button" onClick={() => selectBackgroundPreset(BACKGROUND_PRESETS[0]!.id)}>
        Set Preset Bg
      </button>
      <button type="button" onClick={selectDefaultBackground}>
        Use Default Bg
      </button>
      <button type="button" onClick={() => setBackgroundTarget('sidebar')}>
        Target Sidebar
      </button>
      <button type="button" onClick={() => setSurfaceOpacity(0.8)}>
        Set Opacity
      </button>
      <button type="button" onClick={removeCustomBackground}>
        Remove Custom
      </button>
      <button type="button" onClick={resetToDefault}>
        Reset All
      </button>
      <input
        type="file"
        data-testid="probe-upload"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadCustomBackground(file);
        }}
      />
    </div>
  );
}

describe('CustomThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      user: {
        id: 'user-a',
        email: 'a@test.com',
        fullName: 'User A',
        roles: ['CUSTOMER'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    window.localStorage.clear();
  });

  it('starts with default preferences and persists changes per user', async () => {
    render(
      <CustomThemeProvider>
        <ThemeProbe />
      </CustomThemeProvider>,
    );

    expect(screen.getByTestId('preset-id').textContent).toBe(DEFAULT_USER_THEME_PREFERENCES.presetId);
    expect(screen.getByTestId('bg-url').textContent).toBe('none');

    fireEvent.click(screen.getByText('Set Teal'));
    fireEvent.click(screen.getByText('Set Preset Bg'));
    fireEvent.click(screen.getByText('Target Sidebar'));
    fireEvent.click(screen.getByText('Set Opacity'));

    expect(screen.getByTestId('preset-id').textContent).toBe('aero-teal');
    expect(screen.getByTestId('primary-color').textContent).toBe('#087E8B');
    expect(screen.getByTestId('bg-source').textContent).toBe('preset');
    expect(screen.getByTestId('bg-url').textContent).toBe(BACKGROUND_PRESETS[0]!.imageUrl);
    expect(screen.getByTestId('bg-target').textContent).toBe('sidebar');
    expect(screen.getByTestId('opacity').textContent).toBe('0.8');

    const storedA = window.localStorage.getItem(getUserThemeStorageKey('user-a'));
    expect(storedA).toContain('aero-teal');

    // Switching user isolates theme preferences
    act(() => {
      useAuthStore.getState().setSession({
        accessToken: 'token-2',
        user: {
          id: 'user-b',
          email: 'b@test.com',
          fullName: 'User B',
          roles: ['INSPECTOR'],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('preset-id').textContent).toBe('default');
      expect(screen.getByTestId('bg-url').textContent).toBe('none');
    });
  });

  it('uploads a custom background image and resets cleanly to default', async () => {
    render(
      <CustomThemeProvider>
        <ThemeProbe />
      </CustomThemeProvider>,
    );

    const file = new File(['mock-image-bytes'], 'skyline.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('probe-upload'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('bg-source').textContent).toBe('custom');
      expect(screen.getByTestId('bg-url').textContent).toContain('data:image/png;base64,');
    });

    fireEvent.click(screen.getByText('Reset All'));
    expect(screen.getByTestId('preset-id').textContent).toBe('default');
    expect(screen.getByTestId('bg-source').textContent).toBe('default');
    expect(screen.getByTestId('bg-url').textContent).toBe('none');
  });
});
