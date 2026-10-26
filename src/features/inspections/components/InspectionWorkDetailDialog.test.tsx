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
  assetPairAssignmentId: 'pair-123',
  inspectorId: 'user-inspector-1',
  inspectorName: 'Bob Inspector',
  droneId: 'drone-777',
  droneSerialNumber: 'DJI-MATRICE-300-RTK',
  droneModel: 'Matrice 300 RTK',
  droneServiceability: 'ACTIVE',
  flightPermitReference: 'PERMIT-MND-2026-088',
  flightPermitAuthority: 'Department of Operations - MND',
  flightPermitValidFrom: '2026-10-01T00:00:00Z',
  flightPermitValidUntil: '2026-12-31T23:59:59Z',
  flightPermitStatus: 'READY',
  objective: 'Structural cable tension and corrosion visual inspection',
  scope: '{"method": "high-res-rgb", "distance": "5m"}',
  componentScope: '["Cable Stay 1", "Pylon North", "Deck Joint East"]',
  acceptanceCriteria: '{"minGSD": "0.5mm/px", "coverage": "100%"}',
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

    // Objective & Status
    expect(screen.getByText('Structural cable tension and corrosion visual inspection')).toBeTruthy();
    expect(screen.getByText('READY_FOR_FLIGHT')).toBeTruthy();

    // Asset & Location
    expect(screen.getByText('Thu Thiem Bridge No. 2')).toBeTruthy();
    expect(screen.getByText('10.7769° N, 106.7009° E')).toBeTruthy();

    // Drone & Permit
    expect(screen.getByText(/DJI-MATRICE-300-RTK/)).toBeTruthy();
    expect(screen.getByText('PERMIT-MND-2026-088')).toBeTruthy();
    expect(screen.getByText(/Department of Operations - MND/)).toBeTruthy();

    // Components shot-list chips
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

  it('navigates to preparation when inspection status is ASSIGNED', () => {
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
    const actionButton = screen.getByRole('button', { name: /Prepare mission shot-list/i });
    fireEvent.click(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-12345678-abcd/preparation');
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
