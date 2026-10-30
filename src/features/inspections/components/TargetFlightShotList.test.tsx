import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TargetFlightShotList } from './TargetFlightShotList';
import type { ReinspectionVerificationItem, EvidenceItem } from '../api/inspectionApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockItem: ReinspectionVerificationItem = {
  id: 'verif-1',
  reinspectionId: 'reinsp-1',
  sourceFindingId: 'finding-1',
  sourceFindingCode: 'F-001',
  sourceDefectLabel: 'Spalling Concrete',
  sourceSeverity: 'CRITICAL',
  sourceTechnicalNotes: 'Spalling at Pier T1 south face, depth 15mm',
  sourceEvidenceId: 'ev-source-1',
  sourceLocationDescription: 'Pier T1 - South Elevation',
  sourceLatitude: 10.77653,
  sourceLongitude: 106.70098,
  newEvidenceId: null,
  resolutionStatus: 'UNRESOLVED',
  createdAt: '2026-10-28T09:00:00Z',
  updatedAt: '2026-10-28T09:00:00Z',
};

const mockEvidenceList: EvidenceItem[] = [
  {
    id: 'ev-new-1',
    inspectionId: 'reinsp-1',
    fieldSessionId: null,
    fileName: 'DJI_0045_repaired_pier.JPG',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    captureTime: null,
    latitude: 10.7769,
    longitude: 106.7009,
    createdAt: '2026-10-29T10:00:00Z',
    isDeleted: false,
    locationDescription: null,
    deduplicated: false,
  },
];

describe('TargetFlightShotList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders flight-guidance mode with target defect, location and GPS', () => {
    render(
      <MemoryRouter>
        <TargetFlightShotList
          inspectionId="reinsp-1"
          sourceInspectionId="insp-source-1"
          items={[mockItem]}
          mode="flight-guidance"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Target Flight Locations')).toBeTruthy();
    expect(screen.getByText('Spalling Concrete')).toBeTruthy();
    expect(screen.getByText('CRITICAL')).toBeTruthy();
    expect(screen.getByText('Pier T1 - South Elevation')).toBeTruthy();
    expect(screen.getByText(/GPS: 10.77653, 106.70098/)).toBeTruthy();
    expect(screen.getByText(/Spalling at Pier T1 south face/)).toBeTruthy();
    expect(screen.getByText(/Pilot Flight Guidance/)).toBeTruthy();
  });

  it('renders evidence-assignment mode and allows linking a fresh flight capture', async () => {
    const handleLink = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <TargetFlightShotList
          inspectionId="reinsp-1"
          sourceInspectionId="insp-source-1"
          items={[mockItem]}
          evidenceList={mockEvidenceList}
          mode="evidence-assignment"
          onLinkEvidence={handleLink}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Target Re-capture Checklist')).toBeTruthy();
    expect(screen.getByText('Awaiting capture link')).toBeTruthy();

    const linkSelect = screen.getByRole('combobox', { name: /Link flight capture/i });
    fireEvent.mouseDown(linkSelect);

    const option = await screen.findByRole('option', { name: 'DJI_0045_repaired_pier.JPG' });
    fireEvent.click(option);

    await waitFor(() => {
      expect(handleLink).toHaveBeenCalledWith('verif-1', 'ev-new-1');
    });

    const proceedBtn = screen.getByRole('button', { name: /Proceed to Defect Verification/i });
    fireEvent.click(proceedBtn);
    expect(mockNavigate).toHaveBeenCalledWith('../findings');
  });
});
