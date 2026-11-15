import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InspectionDetail } from '../api/inspectionApi';
import { FlightPermitVerificationPanel } from './FlightPermitVerificationPanel';

const mocks = vi.hoisted(() => ({
  reviewFlightPermit: vi.fn(),
}));

vi.mock('../api/inspectionApi', async () => {
  const actual = await vi.importActual<typeof import('../api/inspectionApi')>(
    '../api/inspectionApi',
  );
  return {
    ...actual,
    inspectionApi: {
      ...actual.inspectionApi,
      reviewFlightPermit: mocks.reviewFlightPermit,
    },
  };
});

const BASE_INSPECTION: InspectionDetail = {
  id: 'inspection-1',
  ownerCustomerId: 'cust-1',
  assetId: 'asset-1',
  assetName: 'Rural Solar Farm',
  locationText: JSON.stringify({ latitude: 10.95, longitude: 106.95, label: 'Dong Nai' }),
  inspectorId: 'insp-1',
  inspectorName: 'Tran Van Inspector',
  droneId: 'drone-1',
  droneSerialNumber: 'SN-DJI-M300-88',
  droneModel: 'DJI Matrice 300',
  droneServiceability: 'ACTIVE',
  flightPermitFileKey: 'permits/gp-184.pdf',
  flightPermitFileName: 'gp-184.pdf',
  flightPermitNumber: '184/GP-TC',
  flightPermitAuthority: 'Cục Tác chiến - Bộ Tổng Tham mưu',
  flightPermitValidFrom: new Date(Date.now() - 3_600_000).toISOString(),
  flightPermitValidTo: new Date(Date.now() + 86_400_000).toISOString(),
  flightPermitDroneSerial: 'SN-DJI-M300-88',
  flightPermitMaxAltitudeM: 120,
  flightPermitFileSha256: 'a'.repeat(64),
  flightPermitFileSizeBytes: 24576,
  flightPermitContentType: 'application/pdf',
  flightPermitUploadedAt: new Date(Date.now() - 1_800_000).toISOString(),
  flightPermitVerificationStatus: 'PENDING_REVIEW',
  inspectionItems: ['Deck'],
  plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
  plannedEndAt: new Date(Date.now() + 7_200_000).toISOString(),
  status: 'SCHEDULED',
  createdAt: new Date(Date.now() - 7_200_000).toISOString(),
  updatedAt: new Date(Date.now() - 1_800_000).toISOString(),
};

function renderPanel(inspection: InspectionDetail, canReview = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FlightPermitVerificationPanel
        inspection={inspection}
        canReview={canReview}
        onPreviewPermit={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe('FlightPermitVerificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewFlightPermit.mockResolvedValue({
      ...BASE_INSPECTION,
      flightPermitVerificationStatus: 'APPROVED',
    });
  });

  afterEach(() => cleanup());

  it('requires mandatory Platform Manager verification even in CLEAR_ZONE and allows approving', async () => {
    renderPanel(BASE_INSPECTION, true);

    expect(screen.getByText(/CLEAR_ZONE/)).toBeTruthy();
    expect(
      screen.getByText(
        /mandatory Platform Manager verification for every flight permit regardless of airspace zone/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText('184/GP-TC')).toBeTruthy();
    expect(screen.getByText(/Matches drone/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Verification notes/i), {
      target: { value: 'Verified against official CAAV docket' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve flight permit' }));

    await waitFor(() =>
      expect(mocks.reviewFlightPermit).toHaveBeenCalledWith('inspection-1', {
        decision: 'APPROVED',
        notes: 'Verified against official CAAV docket',
      }),
    );
  });

  it('requires a reason when rejecting a flight permit', async () => {
    renderPanel(BASE_INSPECTION, true);

    fireEvent.click(screen.getByRole('button', { name: 'Reject flight permit' }));
    const confirmBtn = screen.getByRole('button', { name: 'Confirm permit rejection' }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Rejection reason/i), {
      target: { value: 'Authority signature is illegible' },
    });
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(mocks.reviewFlightPermit).toHaveBeenCalledWith('inspection-1', {
        decision: 'REJECTED',
        reason: 'Authority signature is illegible',
        notes: undefined,
      }),
    );
  });

  it('disables Approve button when permit UAV serial mismatches assigned drone', () => {
    renderPanel(
      {
        ...BASE_INSPECTION,
        flightPermitDroneSerial: 'SN-WRONG-99',
      },
      true,
    );

    expect(screen.getByText(/Permit UAV serial does not match the assigned drone serial/i)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Approve flight permit' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
