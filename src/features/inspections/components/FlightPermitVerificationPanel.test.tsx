import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InspectionDetail } from '../api/inspectionApi';
import { FlightPermitVerificationPanel } from './FlightPermitVerificationPanel';

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

type PanelProps = Partial<ComponentProps<typeof FlightPermitVerificationPanel>>;

function renderPanel(inspection: InspectionDetail, props: PanelProps = {}) {
  return render(
    <FlightPermitVerificationPanel
      inspection={inspection}
      onPreviewPermit={vi.fn()}
      {...props}
    />,
  );
}

describe('FlightPermitVerificationPanel', () => {
  afterEach(() => cleanup());

  it('is read-only and explains that a changed drone or schedule needs a re-upload', () => {
    renderPanel(BASE_INSPECTION);

    expect(screen.getByText('Flight Permit')).toBeTruthy();
    expect(screen.queryByText('Flight Permit Verification')).toBeNull();
    expect(screen.getByText('Re-upload required')).toBeTruthy();
    expect(
      screen.getByText(
        /The drone or schedule changed\. The assigned Inspector must upload an updated permit before pre-flight\./,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Clear Zone/i)).toBeTruthy();
    expect(screen.getByText('184/GP-TC')).toBeTruthy();
    expect(screen.getByText(/Matches drone/i)).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Approve flight permit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject flight permit' })).toBeNull();
    expect(screen.queryByText('Manager Verification Decision')).toBeNull();
  });

  it('labels self-attested permits as submitted by the Inspector', () => {
    renderPanel({ ...BASE_INSPECTION, flightPermitVerificationStatus: 'APPROVED' });

    expect(screen.getByText('Submitted by Inspector')).toBeTruthy();
    expect(
      screen.getByText(
        /Uploaded and self-attested by the assigned Inspector for this mission window\./,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Verified by/i)).toBeNull();
  });

  it('labels invalid permits and only shows a rejection reason when one is recorded', () => {
    renderPanel({
      ...BASE_INSPECTION,
      flightPermitVerificationStatus: 'REJECTED',
      flightPermitRejectionReason: 'Blurry scan',
      flightPermitReviewNotes: 'Legacy review note',
    });

    expect(screen.getByText('Invalid — re-upload required')).toBeTruthy();
    expect(screen.getByText(/Rejection reason: Blurry scan/)).toBeTruthy();
    expect(screen.queryByText(/Reviewed by/i)).toBeNull();
    expect(screen.queryByText('Reviewer Notes')).toBeNull();
    expect(screen.queryByText('Legacy review note')).toBeNull();
  });

  it('does not show a rejection reason when the legacy field is empty', () => {
    renderPanel({ ...BASE_INSPECTION, flightPermitVerificationStatus: 'REJECTED' });

    expect(screen.getByText('Invalid — re-upload required')).toBeTruthy();
    expect(screen.queryByText('Rejection reason')).toBeNull();
  });

  it('hides the airspace strip, pending prompt and approval text when requested', () => {
    renderPanel(
      { ...BASE_INSPECTION, flightPermitVerificationStatus: 'APPROVED' },
      {
        compact: true,
        hideHeader: true,
        hideEmptyNotice: true,
        showAirspace: false,
        showPendingPrompt: false,
      },
    );

    expect(screen.queryByText(/Airspace:/i)).toBeNull();
    expect(screen.queryByText(/Clear Zone/i)).toBeNull();
    expect(screen.queryByText(/The drone or schedule changed/i)).toBeNull();
    expect(screen.queryByText('SHA-256 Digest')).toBeNull();
    expect(screen.queryByText(/Uploaded and self-attested/i)).toBeNull();
    expect(screen.getByText('Validity Window')).toBeTruthy();
  });
});
