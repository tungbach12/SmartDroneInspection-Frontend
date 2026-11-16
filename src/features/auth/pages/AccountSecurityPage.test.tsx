import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ColorModeContext } from '@/app/layouts/ColorModeContext';
import { theme } from '@/app/theme/theme';
import { ThemeProvider } from '@mui/material';
import AccountSecurityPage from './AccountSecurityPage';
import * as authApi from '../api/authApi';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof authApi>();
  return {
    ...actual,
    changePassword: vi.fn(),
    logoutCurrentSession: vi.fn(),
    logoutAllSessions: vi.fn(),
    updateAvatar: vi.fn(),
    updateProfile: vi.fn(),
    updatePilotLicense: vi.fn(),
    updateVisionFallbackPreference: vi.fn(),
  };
});

function renderSettings(initialPath = '/client/settings') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="sdi-mode">
      <ColorModeContext.Provider value={{ mode: 'light', toggle: vi.fn() }}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>
            <AccountSecurityPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ColorModeContext.Provider>
    </ThemeProvider>,
  );
}

describe('AccountSecurityPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 'token-123',
      roles: ['CUSTOMER'],
      user: {
        id: 'cust-1',
        email: 'customer@smartdrone.local',
        fullName: 'Test Customer',
        phoneNumber: '+84 901 234 567',
        roles: ['CUSTOMER'],
        avatarUrl: 'data:image/png;base64,AAAA',
        visionFallbackEnabled: true,
      },
      userId: 'cust-1',
      userName: 'Test Customer',
      email: 'customer@smartdrone.local',
    });
  });

  it('renders NextAdmin Account tab with editable name/phone, read-only identity, save/cancel, and avatar remove', async () => {
    vi.mocked(authApi.updateAvatar).mockResolvedValue({
      id: 'cust-1',
      email: 'customer@smartdrone.local',
      fullName: 'Test Customer',
      phoneNumber: '+84 901 234 567',
      roles: ['CUSTOMER'],
      avatarUrl: 'data:image/png;base64,AAAA',
      visionFallbackEnabled: true,
    });

    renderSettings('/client/settings');

    expect(screen.getByText('Account Details')).toBeTruthy();
    const fullNameInput = screen.getByRole('textbox', { name: 'Full Name' }) as HTMLInputElement;
    const emailInput = screen.getByRole('textbox', { name: 'Email address' }) as HTMLInputElement;
    const phoneInput = screen.getByRole('textbox', { name: 'Phone Number' }) as HTMLInputElement;
    expect(fullNameInput.value).toBe('Test Customer');
    expect(fullNameInput.readOnly).toBe(false);
    expect(emailInput.value).toBe('customer@smartdrone.local');
    expect(emailInput.readOnly).toBe(true);
    expect(phoneInput.value).toBe('+84 901 234 567');
    expect(phoneInput.readOnly).toBe(false);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();

    fireEvent.change(fullNameInput, { target: { value: 'Temporary Edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fullNameInput.value).toBe('Test Customer');

    vi.mocked(authApi.updateProfile).mockResolvedValue({
      id: 'cust-1',
      email: 'customer@smartdrone.local',
      fullName: 'Saved Customer',
      phoneNumber: '+84 909 111 222',
      roles: ['CUSTOMER'],
      avatarUrl: 'data:image/png;base64,AAAA',
      visionFallbackEnabled: true,
    });
    fireEvent.change(fullNameInput, { target: { value: 'Saved Customer' } });
    fireEvent.change(phoneInput, { target: { value: '+84 909 111 222' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(authApi.updateProfile).toHaveBeenCalledWith({
      fullName: 'Saved Customer',
      phoneNumber: '+84 909 111 222',
    }));
    expect(await screen.findByText('Profile changes saved.')).toBeTruthy();
    expect(useAuthStore.getState().user?.fullName).toBe('Saved Customer');
    expect(useAuthStore.getState().user?.phoneNumber).toBe('+84 909 111 222');

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(authApi.updateAvatar).toHaveBeenCalledWith('');
  });

  it('switches to Security tab and supports password expansion and logout everywhere dialog', () => {
    renderSettings('/manager/settings');

    fireEvent.click(screen.getByRole('tab', { name: /Security/ }));
    expect(screen.getByText('Current Password')).toBeTruthy();
    expect(screen.getByText('Active Session')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Current password')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out everywhere' }));
    expect(screen.getByText('Sign out on every device?')).toBeTruthy();
  });

  it('renders read-only Notification tab from query parameter with disabled switches', () => {
    renderSettings('/client/settings?tab=notification');

    expect(screen.getByText('Workflow & Lifecycle Notifications')).toBeTruthy();
    expect(
      screen.getByText(
        'System notifications are delivered automatically according to workflow events and your role (read-only).',
      ),
    ).toBeTruthy();
    const switches = screen.getAllByRole('switch') as HTMLInputElement[];
    expect(switches).toHaveLength(3);
    expect(switches.every((item) => item.disabled)).toBe(true);
  });
});
