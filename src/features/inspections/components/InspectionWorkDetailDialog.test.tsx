import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectionWorkDetailDialog } from './InspectionWorkDetailDialog';
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
  status: 'READY_FOR_FLIGHT',
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-25T10:00:00Z',
};

const mockUseInspection = vi.fn();
vi.mock('../hooks/useInspections', () => ({
  useInspection: (id: string | null, enabled: boolean) => mockUseInspection(id, enabled),
}));

describe('InspectionWorkDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInspection.mockReturnValue({
      data: mockInspectionData,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
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
    expect(screen.getByText('READY_FOR_FLIGHT')).toBeTruthy();

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

    // Guidance banner for READY_FOR_FLIGHT
    expect(screen.getByText(/Flight readiness approved/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Start field session/i })).toBeTruthy();
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

    const actionButton = screen.getByRole('button', { name: /Start field session/i });
    fireEvent.click(actionButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-12345678-abcd/field-session');
  });

  it('navigates to field-session when inspection status is ASSIGNED', () => {
    mockUseInspection.mockReturnValue({
      data: {
        ...mockInspectionData,
        status: 'ASSIGNED',
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

    expect(screen.getByText(/This inspection is assigned to you/i)).toBeTruthy();
    const actionButton = screen.getByRole('button', { name: /Open field session/i });
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
});
