import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import Mf1ReviewPage from './Mf1ReviewPage';
import { mf1ReviewApi } from '../api/mf1ReviewApi';
import { useAuthStore } from '@/features/auth/store/authStore';

const originalCreateObjectUrl = URL.createObjectURL;

vi.mock('../api/mf1ReviewApi', () => ({
  mf1ReviewApi: {
    pendingCustomers: vi.fn(),
    approveCustomer: vi.fn(),
    rejectCustomer: vi.fn(),
    droneEvidence: vi.fn(),
    pendingDrones: vi.fn(),
    approveDrone: vi.fn(),
    rejectDrone: vi.fn(),
    droneHistory: vi.fn(),
  },
}));

vi.mock('../api/inspectorProfileApi', () => ({
  inspectorProfileApi: {
    list: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn(),
    createFlightLog: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Mf1ReviewPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe('MF1 review queues', () => {
  afterEach(() => {
    cleanup();
    URL.createObjectURL = originalCreateObjectUrl;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ roles: ['ADMIN'] });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:license-evidence');
    vi.mocked(mf1ReviewApi.pendingCustomers).mockResolvedValue([
      {
        id: 'review-1',
        userId: 'user-1',
        organizationName: 'Bridge Co',
        organizationCode: 'BRIDGE',
        assetName: 'Main bridge',
        assetCode: 'AST-1',
        airspaceClassification: 'UNKNOWN',
        status: 'PENDING',
        reviewNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt: '2026-10-29T00:00:00Z',
      },
    ]);
    vi.mocked(mf1ReviewApi.droneEvidence).mockResolvedValue(new Blob(['%PDF-1.7']));
    vi.mocked(mf1ReviewApi.droneHistory).mockResolvedValue([]);
    vi.mocked(mf1ReviewApi.pendingDrones).mockResolvedValue([
      {
        id: 'drone-application-1',
        inspectorUserId: 'pilot-1',
        serialNumber: 'SN-1',
        model: 'Surveyor',
        manufacturer: 'Aero',
        registrationNumber: 'REG-1',
        registrationFileKey: 'drone/reg',
        registrationExpiresAt: '2027-12-31T00:00:00Z',
        ownershipFileKey: 'drone/owner',
        inspectionFileKey: 'drone/inspection',
        status: 'PENDING',
        reviewNote: null,
        droneId: null,
        createdAt: '2026-10-29T00:00:00Z',
      },
    ]);
  });

  it('renders drone registrations tab and allows opening drone review modal', async () => {
    renderPage();
    const reviewBtn = await screen.findByRole('button', { name: /Thẩm định hồ sơ/i });
    expect(reviewBtn).toBeTruthy();
    fireEvent.click(reviewBtn);
    expect(await screen.findByText('Thẩm định hồ sơ Phương tiện Drone')).toBeTruthy();
  });

  it('requires a rejection note before refusing a drone application', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Thẩm định hồ sơ/i }));
    await screen.findByText('Thẩm định hồ sơ Phương tiện Drone');
    const rejectActionBtn = await screen.findByRole('button', { name: /Từ chối/i });
    fireEvent.click(rejectActionBtn);
    const confirmRejectBtn = screen.getByRole('button', { name: /Xác nhận từ chối/i });
    fireEvent.click(confirmRejectBtn);
    expect(await screen.findByText('Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại.')).toBeTruthy();
    expect(mf1ReviewApi.rejectDrone).not.toHaveBeenCalled();
  });

  it('allows switching to Customer airspace tab and opens customer review dialog', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Vùng bay khách hàng/i }));
    expect(await screen.findByText('Bridge Co')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Thẩm định/i }));
    expect(await screen.findByText('Thẩm định hồ sơ Phương tiện Drone')).toBeTruthy();
  });
});
