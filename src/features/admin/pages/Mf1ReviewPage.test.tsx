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

vi.mock('@/features/assets/api/droneFeatureConfigApi', () => ({
  droneFeatureConfigApi: {
    list: vi.fn().mockResolvedValue([]),
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
    useAuthStore.setState({ roles: ['MANAGER'] });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:license-evidence');
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
        imageFileKeys: ['drone/img-0'],
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
    expect(await screen.findByText(/Drone photos|Hình ảnh thiết bị bay/i)).toBeTruthy();
  });

  it('requires a rejection note before refusing a drone application', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review application|Thẩm định hồ sơ/i }));
    await screen.findByText(/Review Compliance Application|Thẩm định hồ sơ Phương tiện Drone/i);
    const rejectBtn = await screen.findByRole('button', { name: /^Reject$|^Từ chối$/i });
    fireEvent.click(rejectBtn);
    expect(
      await screen.findByText(
        /Please provide a clear rejection reason so the applicant can resubmit\.|Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại\./i,
      ),
    ).toBeTruthy();
    expect(mf1ReviewApi.rejectDrone).not.toHaveBeenCalled();
  });

  it('renders MF1 queues in read-only view mode for ADMIN without approve/reject actions', async () => {
    useAuthStore.setState({ roles: ['ADMIN'] });
    renderPage();
    expect(screen.queryByRole('tab', { name: /Customer airspace|Vùng bay khách hàng/i })).toBeNull();
    const viewBtn = await screen.findByRole('button', { name: /View details|Xem chi tiết/i });
    fireEvent.click(viewBtn);
    expect(
      await screen.findByText(/Review Compliance Application|Thẩm định hồ sơ Phương tiện Drone/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Approve$|^Duyệt$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Reject$|^Từ chối$/i })).toBeNull();
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
    expect(screen.queryByRole('button', { name: /^Approve$|^Duyệt$/i })).toBeNull();
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

    fireEvent.mouseDown(screen.getByLabelText(/Status|Trạng thái/i));
    expect(
      await screen.findByRole('option', { name: /Awaiting contract \(1\)|Chờ hợp đồng \(1\)/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: /All \(2\)|Tất cả \(2\)/i }));

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

  it('uses server-side paginated droneQueue endpoint when available', async () => {
    const queueSpy = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'drone-app-paged-1',
          inspectorUserId: 'pilot-1',
          serialNumber: 'SN-PAGE-1',
          model: 'Matrice 350 RTK',
          manufacturer: 'DJI',
          registrationNumber: 'REG-PAGE-1',
          registrationFileKey: 'drone/reg',
          registrationExpiresAt: '2027-12-31T00:00:00Z',
          ownershipFileKey: 'drone/owner',
          inspectionFileKey: 'drone/inspection',
          imageFileKeys: ['drone/img-0'],
          status: 'PENDING',
          reviewNote: null,
          droneId: null,
          createdAt: '2026-10-29T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
      totalAllCount: 15,
      pendingCount: 12,
      approvedCount: 2,
      rejectedCount: 1,
    });
    Object.defineProperty(mf1ReviewApi, 'droneQueue', {
      configurable: true,
      writable: true,
      value: queueSpy,
    });
    try {
      renderPage();
      expect(await screen.findByText('Matrice 350 RTK')).toBeTruthy();
      expect(screen.getByText('Showing 1–10 of 12')).toBeTruthy();
      expect(queueSpy).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        status: 'ALL',
        tier: 'ALL',
        sort: 'NEWEST',
      });

      fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
      expect(queueSpy).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 10,
        status: 'ALL',
        tier: 'ALL',
        sort: 'NEWEST',
      });
    } finally {
      Reflect.deleteProperty(mf1ReviewApi, 'droneQueue');
    }
  });
});
