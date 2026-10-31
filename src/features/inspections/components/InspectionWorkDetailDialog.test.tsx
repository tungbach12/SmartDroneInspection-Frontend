import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectionWorkDetailDialog } from './InspectionWorkDetailDialog';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { InspectionDetail } from '../api/inspectionApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/operations/inspections' }),
  };
});

const mockInspectionData: InspectionDetail = {
  id: 'insp-12345678-abcd',
  organizationId: 'org-111',
  assetId: 'asset-999',
  assetName: 'Thu Thiem Bridge No. 2',
  locationText: '10.7769° N, 106.7009° E',
  inspectorId: 'user-inspector-1',
  inspectorName: 'Bob Inspector',
  droneId: 'drone-777',
  droneSerialNumber: 'DJI-MATRICE-300-RTK',
  droneModel: 'Matrice 300 RTK',
  droneServiceability: 'ACTIVE',
  flightPermitFileKey: 'permits/permit-mnd-2026-088.pdf',
  flightPermitFileName: 'PERMIT-MND-2026-088.pdf',
  flightPermitUploadedAt: '2026-10-20T09:30:00Z',
  inspectionItems: ['Cable Stay 1', 'Pylon North', 'Deck Joint East'],
  plannedStartAt: '2026-11-05T09:00:00Z',
  plannedEndAt: '2026-11-05T12:00:00Z',
  status: 'SCHEDULED',
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-25T10:00:00Z',
};

const mockUseInspection = vi.fn();
const mockUseFieldSessions = vi.fn();
const mockUseReschedule = vi.fn();
const mockUseCancel = vi.fn();

vi.mock('../hooks/useInspections', () => ({
  useInspection: (id: string | null, enabled: boolean) => mockUseInspection(id, enabled),
  useFieldSessions: (id: string | null, enabled: boolean) => mockUseFieldSessions(id, enabled),
  useRescheduleInspection: () => ({ mutate: mockUseReschedule, isPending: false, isError: false }),
  useCancelInspection: () => ({ mutate: mockUseCancel, isPending: false, isError: false }),
}));

describe('InspectionWorkDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ roles: ['CUSTOMER'] });
    mockUseInspection.mockReturnValue({
      data: mockInspectionData,
      isLoading: false,
      isError: false,
    });
    mockUseFieldSessions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('renders loading state when query is loading', () => {
    mockUseInspection.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Loading inspection details/i)).toBeTruthy();
  });

  it('renders complete work details and equipment information', () => {
    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={vi.fn()}
      />,
    );

    // Header & Status
    expect(screen.getAllByText('Thu Thiem Bridge No. 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SCHEDULED')).toBeTruthy();

    // Asset & Location
    expect(screen.getByText('10.7769° N, 106.7009° E')).toBeTruthy();

    // Drone & Permit
    expect(screen.getByText(/DJI-MATRICE-300-RTK/)).toBeTruthy();
    expect(screen.getByText('PERMIT-MND-2026-088.pdf')).toBeTruthy();
    expect(screen.getByText(/Uploaded/i)).toBeTruthy();

    // Inspection checkpoints
    expect(screen.getByText('Cable Stay 1')).toBeTruthy();
    expect(screen.getByText('Pylon North')).toBeTruthy();
    expect(screen.getByText('Deck Joint East')).toBeTruthy();

    // Guidance banner for SCHEDULED
    expect(screen.getByText(/This inspection is scheduled/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open field session/i })).toBeTruthy();
  });

  it('navigates to field session when action button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={handleClose}
      />,
    );

    const actionButton = screen.getByRole('button', { name: /Open field session/i });
    fireEvent.click(actionButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-12345678-abcd/field-session');
  });

  it('navigates to field-session when inspection status is IN_PROGRESS', () => {
    mockUseInspection.mockReturnValue({
      data: {
        ...mockInspectionData,
        status: 'IN_PROGRESS',
      },
      isLoading: false,
      isError: false,
    });

    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Field session is actively in progress/i)).toBeTruthy();
    const actionButton = screen.getByRole('button', { name: /Go to field session/i });
    fireEvent.click(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-12345678-abcd/field-session');
  });

  it('navigates to full inspection view when footer button is clicked', () => {
    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={vi.fn()}
      />,
    );

    const fullViewBtn = screen.getByRole('button', { name: /Open full inspection workspace/i });
    fireEvent.click(fullViewBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-12345678-abcd');
  });

  it('renders aborted session warning alert and manager dispatch actions', () => {
    mockUseFieldSessions.mockReturnValue({
      data: [
        {
          id: 'sess-1',
          status: 'ABORTED',
          abortReason: 'Heavy thunderstorm on site',
          endedAt: '2026-10-25T11:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(
      <InspectionWorkDetailDialog
        open={true}
        inspectionId="insp-12345678-abcd"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Reschedule required')).toBeTruthy();
    expect(screen.getByText('Previous flight session was aborted')).toBeTruthy();
    expect(screen.getByText(/Heavy thunderstorm on site/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel inspection' })).toBeTruthy();
  });
});
