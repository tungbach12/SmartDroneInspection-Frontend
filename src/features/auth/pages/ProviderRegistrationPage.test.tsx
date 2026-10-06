import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  registerProvider: vi.fn(),
}));

vi.mock('../api/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/authApi')>();
  return {
    ...actual,
    registerProvider: mocks.registerProvider,
  };
});

vi.mock('../components/AuthSessionBootstrapper', () => ({
  AuthLoadingScreen: () => <div>loading</div>,
}));

import ProviderRegistrationPage from './ProviderRegistrationPage';
import { MemoryRouter } from 'react-router-dom';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProviderRegistrationPage />
    </MemoryRouter>,
  );
}

describe('ProviderRegistrationPage', () => {
  beforeEach(() => {
    mocks.registerProvider.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the registration form fields', () => {
    renderPage();
    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByLabelText(/provider name/i)).toBeTruthy();
    expect(screen.getByLabelText(/legal name/i)).toBeTruthy();
    expect(screen.getByLabelText(/tax code/i)).toBeTruthy();
    expect(screen.getByLabelText(/business license/i)).toBeTruthy();
    expect(screen.getByLabelText(/work email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
  });

  it('shows validation errors and does not call registerProvider on empty submit', async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: /register provider organization/i }),
    );

    await waitFor(() => {
      expect(screen.getAllByText(/enter your full name/i).length).toBeGreaterThan(0);
    });
    expect(mocks.registerProvider).not.toHaveBeenCalled();
  });

  it('calls registerProvider with valid values and shows confirmation', async () => {
    mocks.registerProvider.mockResolvedValue({
      providerId: 'p1',
      activationLink: 'https://app.test/activate-provider?token=abc',
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(/provider name/i), {
      target: { value: 'SkyWatch Inspections' },
    });
    fireEvent.change(screen.getByLabelText(/legal name/i), {
      target: { value: 'SkyWatch Inspections LLC' },
    });
    fireEvent.change(screen.getByLabelText(/tax code/i), {
      target: { value: 'TAX-123' },
    });
    fireEvent.change(screen.getByLabelText(/business license/i), {
      target: { value: 'LIC-456' },
    });
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: 'ada@skywatch.test' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'a-very-strong-password' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'a-very-strong-password' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /register provider organization/i }),
    );

    await waitFor(() => {
      expect(mocks.registerProvider).toHaveBeenCalledWith({
        email: 'ada@skywatch.test',
        fullName: 'Ada Lovelace',
        providerName: 'SkyWatch Inspections',
        legalName: 'SkyWatch Inspections LLC',
        taxCode: 'TAX-123',
        businessLicenseNo: 'LIC-456',
        password: 'a-very-strong-password',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/check your email for the activation link/i),
      ).toBeTruthy();
    });
    expect(
      screen.getByText(/https:\/\/app\.test\/activate-provider\?token=abc/i),
    ).toBeTruthy();
  });
});
