import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import Mf1ReviewPage from './Mf1ReviewPage';
import { mf1ReviewApi } from '../api/mf1ReviewApi';
import { inspectorApplicationApi } from '@/features/auth/api/inspectorApplicationApi';
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

vi.mock('@/features/auth/api/inspectorApplicationApi', () => ({
  inspectorApplicationApi: {
    listPending: vi.fn().mockResolvedValue([]),
    listApprovedAwaitingContract: vi.fn().mockResolvedValue([]),
    getLicenseScanBlob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/png' })),
    approve: vi.fn(),
    reject: vi.fn(),
    uploadSignedContract: vi.fn(),
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
    const reviewBtn = await screen.findByRole('button', { name: /Review application|Thẩm định hồ sơ/i });
    expect(reviewBtn).toBeTruthy();
    fireEvent.click(reviewBtn);
    expect(
      await screen.findByText(/Review Compliance Application|Thẩm định hồ sơ Phương tiện Drone/i),
    ).toBeTruthy();
  });

  it('requires a rejection note before refusing a drone application', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review application|Thẩm định hồ sơ/i }));
    await screen.findByText(/Review Compliance Application|Thẩm định hồ sơ Phương tiện Drone/i);
    const rejectActionBtn = await screen.findByRole('button', { name: /Reject|Từ chối/i });
    fireEvent.click(rejectActionBtn);
    const confirmRejectBtn = screen.getByRole('button', { name: /Confirm rejection|Xác nhận từ chối/i });
    fireEvent.click(confirmRejectBtn);
    expect(
      await screen.findByText(
        /Please provide a clear rejection reason so the applicant can resubmit\.|Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại\./i,
      ),
    ).toBeTruthy();
    expect(mf1ReviewApi.rejectDrone).not.toHaveBeenCalled();
  });

  it('allows switching to Customer airspace tab and opens customer review dialog', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Customer airspace|Vùng bay khách hàng/i }));
    expect(await screen.findByText('Bridge Co')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Review|Thẩm định/i }));
    expect(
      await screen.findByText(/Review Compliance Application|Thẩm định hồ sơ Phương tiện Drone/i),
    ).toBeTruthy();
  });

  it('allows reviewing pending inspector applications and viewing license scan', async () => {
    vi.mocked(inspectorApplicationApi.listPending).mockResolvedValue([
      {
        id: 'app-1',
        email: 'sangditrau123@gmail.com',
        fullName: 'Nguyen Van Sang',
        phoneNumber: '0901234567',
        citizenId: '079200012345',
        address: '123 Le Loi, Q1, TP.HCM',
        pilotLicenseNumber: 'UAV-999',
        pilotLicenseClass: 'Hạng A',
        pilotLicenseExpiresAt: '2028-12-31',
        hasLicenseScan: true,
        status: 'PENDING_REVIEW',
        createdAt: '2026-11-14T00:00:00Z',
      },
    ]);
    renderPage();
    fireEvent.click(
      await screen.findByRole('tab', { name: /Inspector Apps|Inspector Applications|Đơn Inspector|Đơn đăng ký Inspector/i }),
    );
    expect(await screen.findByText('Nguyen Van Sang')).toBeTruthy();
    expect(screen.getByText(/079200012345/)).toBeTruthy();
    fireEvent.click(
      await screen.findByRole('button', { name: /Review application|Xem hồ sơ & Duyệt/i }),
    );
    expect(
      await screen.findByText(/Review Inspector Application|Thẩm định Đơn đăng ký Inspector/i),
    ).toBeTruthy();
    expect(inspectorApplicationApi.getLicenseScanBlob).toHaveBeenCalledWith('app-1');
  });

  it('uses structured MTOW and clean model name so DJI Matrice 350 RTK is classified accurately as Category 3', async () => {
    vi.mocked(mf1ReviewApi.pendingDrones).mockResolvedValue([]);
    vi.mocked(mf1ReviewApi.droneHistory).mockResolvedValue([
      {
        id: 'drone-history-350',
        inspectorUserId: 'pilot-1',
        inspectorFullName: 'Inspector Two',
        inspectorEmail: 'inspector2@test.com',
        serialNumber: 'DJI-M350-SG-0001',
        model: 'DJI Matrice 350 RTK',
        manufacturer: 'DJI',
        registrationNumber: 'REG-350-1',
        registrationFileKey: 'drone/reg',
        registrationExpiresAt: '2027-12-31T00:00:00Z',
        ownershipFileKey: 'drone/owner',
        mtowKg: 6.47,
        maxFlightTimeMinutes: 55,
        cameraSensor: '20 MP',
        legalCategory: 'CATEGORY_3',
        status: 'APPROVED',
        reviewNote: null,
        droneId: 'drone-uuid-350',
        createdAt: '2026-11-24T00:00:00Z',
      },
    ]);

    renderPage();
    expect(await screen.findByText('DJI Matrice 350 RTK')).toBeTruthy();
    expect(screen.getByText(/Loại 3 \(2 – < 25 kg\)/)).toBeTruthy();
    expect(screen.queryByText(/Loại 5/)).toBeNull();
    expect(screen.getByText(/6\.47 kg/)).toBeTruthy();
    expect(screen.getByText(/20 MP/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /View details|Xem chi tiết/i }));
    expect(
      await screen.findByText(/Drone registration approved|Hồ sơ drone đã được phê duyệt/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Confirm approval|Xác nhận duyệt/i })).toBeNull();
  });

  it('filters inspector applications by license class, phone search, and awaiting contract status', async () => {
    vi.mocked(inspectorApplicationApi.listPending).mockResolvedValue([
      {
        id: 'app-a',
        email: 'pilot.a@test.com',
        fullName: 'Pilot Class A',
        phoneNumber: '0901112222',
        citizenId: '079200011111',
        address: 'District 1',
        pilotLicenseNumber: 'UAV-A-1',
        pilotLicenseClass: 'CLASS_A',
        pilotLicenseExpiresAt: '2028-12-31',
        hasLicenseScan: true,
        status: 'PENDING_REVIEW',
        createdAt: '2026-11-14T00:00:00Z',
      },
    ]);
    vi.mocked(inspectorApplicationApi.listApprovedAwaitingContract).mockResolvedValue([
      {
        id: 'app-b',
        email: 'pilot.b@test.com',
        fullName: 'Pilot Class B',
        phoneNumber: '0987654321',
        citizenId: '079200022222',
        address: 'District 7',
        pilotLicenseNumber: 'UAV-B-2',
        pilotLicenseClass: 'CLASS_B',
        pilotLicenseExpiresAt: '2028-12-31',
        hasLicenseScan: false,
        status: 'APPROVED',
        createdAt: '2026-11-15T00:00:00Z',
      },
    ]);

    renderPage();
    fireEvent.click(
      await screen.findByRole('tab', { name: /Inspector Apps|Inspector Applications|Đơn Inspector|Đơn đăng ký Inspector/i }),
    );
    expect(await screen.findByText('Pilot Class A')).toBeTruthy();
    expect(screen.getByText('Pilot Class B')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Awaiting contract \(1\)|Chờ hợp đồng \(1\)/i })).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0987654321' } });
    expect(screen.getByText('Pilot Class B')).toBeTruthy();
    expect(screen.queryByText('Pilot Class A')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Clear all|Xóa hết/i }));
    expect(screen.getByText('Pilot Class A')).toBeTruthy();

    fireEvent.mouseDown(screen.getByLabelText(/License class|Hạng bằng lái/i));
    fireEvent.click(await screen.findByRole('option', { name: /Class B|Hạng B/i }));
    expect(screen.getByText('Pilot Class B')).toBeTruthy();
    expect(screen.queryByText('Pilot Class A')).toBeNull();
  });
});
