import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import InspectorDroneRegistrationPage from './InspectorDroneRegistrationPage';

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setLocale: vi.fn(), t: (s: string) => s }),
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: ['INSPECTOR'] }),
}));

vi.mock('../api/droneDocumentConfigApi', () => ({
  droneDocumentConfigApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/droneFeatureConfigApi', () => ({
  droneFeatureConfigApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/mf1DroneApi', () => ({
  mf1DroneApi: {
    mine: vi.fn().mockResolvedValue([]),
    drones: vi.fn().mockResolvedValue([]),
    submit: vi.fn(),
    resubmit: vi.fn(),
    updateMyDroneServiceability: vi.fn(),
    deleteMyDrone: vi.fn(),
    evidence: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
  },
  uploadDroneEvidence: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <InspectorDroneRegistrationPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectorDroneRegistrationPage Capabilities & Safety Checklist', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hides the capabilities and safety checklist in the registration dialog', async () => {
    const { droneFeatureConfigApi } = await import('../api/droneFeatureConfigApi');
    vi.mocked(droneFeatureConfigApi.list).mockResolvedValueOnce([
      {
        id: 'f-1',
        code: 'THERMAL_CAMERA',
        nameVi: 'Camera nhiệt',
        nameEn: 'Thermal Camera',
        category: 'CAPABILITY',
        isActive: true,
        displayOrder: 1,
        createdAt: '2026-11-24T00:00:00Z',
        updatedAt: '2026-11-24T00:00:00Z',
      },
    ]);

    renderPage();

    const registerButtons = screen.getAllByRole('button', { name: /Register New Drone/i });
    const registerBtn = registerButtons[0];
    if (!registerBtn) throw new Error('Expected Register New Drone button');
    fireEvent.click(registerBtn);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByRole('button', {
        name: /Capabilities & Safety Checklist/i,
      }),
    ).toBeNull();
    expect(within(dialog).queryByPlaceholderText(/Add custom capability/i)).toBeNull();
  });

  it('opens detail dialog when clicking an approved drone card', async () => {
    const { mf1DroneApi } = await import('../api/mf1DroneApi');
    vi.mocked(mf1DroneApi.drones).mockResolvedValueOnce([
      {
        id: 'drone-1',
        serialNumber: 'DJI-M350-TEST-01',
        model: 'Matrice 350 RTK',
        manufacturer: 'DJI',
        serviceability: 'ACTIVE',
        registrationNumber: 'VN-DRONE-M350-2026',
        registrationExpiresAt: '2030-01-01T00:00:00Z',
        mtowKg: 6.47,
        maxFlightTimeMinutes: 55,
        cameraSensor: '45 MP',
        maxWindResistanceMps: 12,
        maxAltitudeMeters: 500,
        opticalZoomLevel: '20x',
        features: ['RTK_POSITIONING', 'Custom Thermal Payload'],
      },
    ]);

    renderPage();

    const droneTitle = await screen.findByText('Matrice 350 RTK');
    fireEvent.click(droneTitle);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('DJI-M350-TEST-01')).toBeTruthy();
    expect(within(dialog).getByText('VN-DRONE-M350-2026')).toBeTruthy();
    expect(within(dialog).getByText('Custom Thermal Payload')).toBeTruthy();
    expect(within(dialog).getAllByRole('button', { name: /^Close$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('toggles drone serviceability between Retire and Set Active with immediate UI update', async () => {
    const { mf1DroneApi } = await import('../api/mf1DroneApi');
    const activeDrone = {
      id: 'drone-1',
      serialNumber: 'DJI-M3E-SG-0001',
      model: 'DJI Mavic 3 Enterprise',
      manufacturer: 'DJI',
      serviceability: 'ACTIVE',
      registrationNumber: 'VN-DRN-2026-0001',
      registrationExpiresAt: '2029-12-31T00:00:00Z',
    };
    const retiredDrone = { ...activeDrone, serviceability: 'RETIRED' };

    vi.mocked(mf1DroneApi.drones)
      .mockResolvedValueOnce([activeDrone])
      .mockResolvedValueOnce([retiredDrone])
      .mockResolvedValueOnce([activeDrone]);
    vi.mocked(mf1DroneApi.updateMyDroneServiceability)
      .mockResolvedValueOnce(retiredDrone)
      .mockResolvedValueOnce(activeDrone);

    renderPage();

    const retireBtn = await screen.findByRole('button', { name: /^Retire$/i });
    expect(screen.queryByRole('button', { name: /Mark Maintenance/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete$/i })).toBeNull();

    fireEvent.click(retireBtn);

    await waitFor(() => {
      expect(mf1DroneApi.updateMyDroneServiceability).toHaveBeenCalledWith('drone-1', 'RETIRED');
    });
    const setActiveBtn = await screen.findByRole('button', { name: /^Set Active$/i });
    expect(screen.getByText('RETIRED')).toBeTruthy();

    fireEvent.click(setActiveBtn);
    await waitFor(() => {
      expect(mf1DroneApi.updateMyDroneServiceability).toHaveBeenCalledWith('drone-1', 'ACTIVE');
    });
    await screen.findByRole('button', { name: /^Retire$/i });
  });

  it('shows fleet and applications pagination by default and paginates beyond 6 items', async () => {
    const fleet = Array.from({ length: 8 }, (_, idx) => ({
      id: `drone-${idx + 1}`,
      serialNumber: `SER-${idx + 1}`,
      model: `Drone Model ${idx + 1}`,
      manufacturer: 'DJI',
      serviceability: 'ACTIVE',
      registrationNumber: `VN-DRN-${idx + 1}`,
      registrationExpiresAt: '2029-12-31T00:00:00Z',
    }));
    const { mf1DroneApi } = await import('../api/mf1DroneApi');
    vi.mocked(mf1DroneApi.drones).mockResolvedValue(fleet);
    vi.mocked(mf1DroneApi.mine).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Showing 1–6 of 8')).toBeTruthy();
    expect(screen.getByText('Drone Model 1')).toBeTruthy();
    expect(screen.queryByText('Drone Model 7')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(screen.getByText('Showing 7–8 of 8')).toBeTruthy();
    expect(screen.getByText('Drone Model 7')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Submitted Applications/i }));
    expect(await screen.findByText('Showing 0 of 0')).toBeTruthy();
  });
});
