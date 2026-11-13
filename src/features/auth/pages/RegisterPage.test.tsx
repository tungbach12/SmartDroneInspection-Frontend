import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { useAuthStore } from '../store/authStore';
import RegisterPage from './RegisterPage';

const mocks = vi.hoisted(() => ({
  getAuthErrorMessage: vi.fn(() => 'Registration failed.'),
  registerOrganization: vi.fn(),
  sendRegistrationOtp: vi.fn(),
}));

vi.mock('../api/authApi', () => ({
  getAuthErrorMessage: mocks.getAuthErrorMessage,
  registerOrganization: mocks.registerOrganization,
  sendRegistrationOtp: mocks.sendRegistrationOtp,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}{location.search}</output>;
}

function renderRegister() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

async function fillRegistrationForm() {
  const fields = [
    ['Your full name', 'Customer Admin'],
    ['Work email', 'customer@example.test'],
    ['Organization name', 'Example Infrastructure'],
    ['Organization code', 'EXAMPLE'],
    ['Password', 'SecurePass1!'],
    ['Confirm password', 'SecurePass1!'],
  ];
  for (const [label, value] of fields) {
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  }
}

describe('customer organization registration', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
    mocks.sendRegistrationOtp.mockResolvedValue({
      challengeToken: 'challenge-token-1',
      expiresInSeconds: 300,
    });
  });

  it('requires organization details and valid password as part of registration', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter your full name.')).toBeTruthy();
    expect(mocks.sendRegistrationOtp).not.toHaveBeenCalled();
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });

  it('verifies OTP and keeps pending airspace registration out of login', async () => {
    mocks.registerOrganization.mockResolvedValue({
      registrationStatus: 'PENDING_AIRSPACE_REVIEW',
      reviewMessage: 'An administrator must review your location.',
      user: { id: 'prospect-1', email: 'customer@example.test', fullName: 'Customer Admin', roles: ['CUSTOMER'], actorZone: 'CUSTOMER' },
    });
    renderRegister();
    await fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mocks.sendRegistrationOtp).toHaveBeenCalledWith({
        email: 'customer@example.test',
        phoneNumber: undefined,
        channel: 'EMAIL',
      });
    });

    const otpInput = await screen.findByLabelText(/Mã OTP \(6 chữ số\)/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & Tạo tài khoản' }));

    await waitFor(() => {
      expect(mocks.registerOrganization).toHaveBeenCalled();
      expect(screen.getByText('An administrator must review your location.')).toBeTruthy();
    });
    expect(mocks.registerOrganization).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Customer Admin',
      email: 'customer@example.test',
      organizationName: 'Example Infrastructure',
      organizationCode: 'EXAMPLE',
      otpChallengeToken: 'challenge-token-1',
      otpCode: '123456',
    }));
    expect(screen.getByLabelText('Current location').textContent).toContain('/register');
  });

  it('surfaces error and blocks registration when OTP dispatch fails', async () => {
    mocks.sendRegistrationOtp.mockRejectedValue(new Error('OTP error'));
    renderRegister();
    await fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(mocks.sendRegistrationOtp).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Registration failed.')).toBeTruthy());
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });
});
