import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  listInspectors: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('../api/platformUserApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/platformUserApi')>();
  return {
    ...actual,
    platformUserApi: {
      ...actual.platformUserApi,
      list: mocks.listUsers,
      create: mocks.createUser,
    },
  };
});

vi.mock('../api/inspectorProfileApi', () => ({
  inspectorProfileApi: {
    list: mocks.listInspectors,
    get: mocks.getProfile,
    listFlightLogs: vi.fn().mockResolvedValue([]),
    updateProfile: vi.fn(),
    createFlightLog: vi.fn(),
  },
}));

import ManagerPartnerInspectorsPage from './ManagerPartnerInspectorsPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ManagerPartnerInspectorsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ManagerPartnerInspectorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listUsers.mockResolvedValue([
      {
        id: 'ins-1',
        email: 'primary+inspector1@test.com',
        fullName: 'Pham Van Bay',
        roles: ['INSPECTOR'],
        status: 'ACTIVE',
      },
      {
        id: 'ins-2',
        email: 'inspector2@test.com',
        fullName: 'Do Thi Phi Cong',
        roles: ['INSPECTOR'],
        status: 'SUSPENDED',
      },
      {
        id: 'mgr-1',
        email: 'manager@test.com',
        fullName: 'Primary Manager',
        roles: ['MANAGER'],
        status: 'ACTIVE',
      },
    ]);
    mocks.listInspectors.mockResolvedValue([
      {
        id: 'ins-1',
        email: 'primary+inspector1@test.com',
        fullName: 'Pham Van Bay',
        phoneNumber: '0909000111',
        avatarUrl: null,
        status: 'ACTIVE',
        pilotLicenseNumber: 'VN-UAV-001',
        pilotLicenseClass: 'CLASS_B',
        hasLicenseScan: true,
        licenseExpirationStatus: 'VALID',
        licenseRemainingDays: 300,
        priorFlightHours: 20,
        companyFlightHours: 14.5,
        totalFlightHours: 34.5,
        companyFlightsCount: 12,
        onboardingStatus: 'APPROVED',
        hasPartnerContract: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'ins-2',
        email: 'inspector2@test.com',
        fullName: 'Do Thi Phi Cong',
        phoneNumber: '0908000222',
        avatarUrl: null,
        status: 'SUSPENDED',
        pilotLicenseNumber: 'VN-UAV-002',
        pilotLicenseClass: 'CLASS_A',
        hasLicenseScan: false,
        licenseExpirationStatus: 'EXPIRING_SOON',
        licenseRemainingDays: 10,
        priorFlightHours: 5,
        companyFlightHours: 2,
        totalFlightHours: 7,
        companyFlightsCount: 2,
        onboardingStatus: 'APPROVED',
        hasPartnerContract: false,
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
    ]);
    mocks.getProfile.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('merges inspector profiles, excludes non-inspectors, and renders KPI summary metrics', async () => {
    renderPage();

    expect(await screen.findByText('Pham Van Bay')).toBeTruthy();
    expect(screen.getByText('Do Thi Phi Cong')).toBeTruthy();
    expect(screen.queryByText('Primary Manager')).toBeNull();
    expect(screen.getByText('VN-UAV-001')).toBeTruthy();
    expect(screen.getByText('34.5 hrs')).toBeTruthy();
    expect(screen.getByText('Valid licenses')).toBeTruthy();
    expect(screen.getByText('Attention needed')).toBeTruthy();
  });

  it('filters partner inspectors by search query, license class, license status, and clears filters', async () => {
    renderPage();
    expect(await screen.findByText('Pham Van Bay')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search partner inspectors' }), {
      target: { value: '0908000222' },
    });
    expect(screen.getByText('Do Thi Phi Cong')).toBeTruthy();
    expect(screen.queryByText('Pham Van Bay')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(await screen.findByText('Pham Van Bay')).toBeTruthy();

    fireEvent.mouseDown(screen.getByLabelText('License class'));
    fireEvent.click(await screen.findByRole('option', { name: 'Class B' }));
    expect(screen.getByText('Pham Van Bay')).toBeTruthy();
    expect(screen.queryByText('Do Thi Phi Cong')).toBeNull();

    fireEvent.mouseDown(screen.getByLabelText('License status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Expired' }));
    expect(screen.getByText('No matching partner inspectors')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Do Thi Phi Cong')).toBeTruthy();
  });

  it('opens the InspectorProfileDialog from Pilot profile button', async () => {
    renderPage();
    expect(await screen.findByText('Pham Van Bay')).toBeTruthy();

    const profileButtons = screen.getAllByRole('button', { name: 'Pilot profile' });
    const targetButton = profileButtons[1];
    expect(targetButton).toBeDefined();
    if (targetButton) {
      fireEvent.click(targetButton);
    }

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(mocks.getProfile).toHaveBeenCalledWith('ins-1');
  });
});
