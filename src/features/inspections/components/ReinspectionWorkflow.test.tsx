import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { TargetFlightShotList } from './TargetFlightShotList';
import { ReinspectionVerificationSection } from './ReinspectionVerificationSection';
import type { EvidenceItem, ReinspectionVerificationItem } from '../api/inspectionApi';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

afterEach(() => {
  cleanup();
});

const baseVerification: ReinspectionVerificationItem = {
  id: 'verif-1',
  reinspectionId: 'reinsp-1',
  sourceFindingId: 'finding-1',
  newEvidenceId: null,
  resolutionStatus: 'RESOLVED',
  inspectorNotes: null,
  sourceDefectLabel: 'Concrete Spalling',
  sourceSeverity: 'HIGH',
  sourceTechnicalNotes: 'North pier cap corner spalling 40cm',
  sourceLocationDescription: 'North Pier Cap',
  sourceEvidenceId: 'ev-before-1',
  createdAt: '2026-11-15T09:00:00Z',
  updatedAt: '2026-11-15T09:00:00Z',
};

const freshEvidence: EvidenceItem[] = [
  {
    id: 'ev-after-1',
    inspectionId: 'reinsp-1',
    fileName: 'after_north_pier.jpg',
    contentType: 'image/jpeg',
    byteSize: 204800,
    checksumSha256: 'abc',
    capturedAt: '2026-11-15T10:00:00Z',
    latitude: 21.0285,
    longitude: 105.8542,
    locationDescription: 'North Pier Cap',
    deleted: false,
    processingStatus: 'READY',
    createdAt: '2026-11-15T10:00:00Z',
  } as unknown as EvidenceItem,
];

describe('Standalone Re-inspection components', () => {
  it('renders TargetFlightShotList in flight-guidance and evidence-assignment modes', async () => {
    const onLinkEvidence = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderWithRouter(
      <TargetFlightShotList
        inspectionId="reinsp-1"
        sourceInspectionId="orig-1"
        items={[baseVerification]}
        mode="flight-guidance"
      />,
    );

    expect(screen.getByText('Target Flight Locations')).toBeTruthy();
    expect(screen.getByText('Concrete Spalling')).toBeTruthy();
    expect(screen.getByText('North Pier Cap')).toBeTruthy();
    expect(screen.getByText('North pier cap corner spalling 40cm')).toBeTruthy();

    rerender(
      <TargetFlightShotList
        inspectionId="reinsp-1"
        sourceInspectionId="orig-1"
        items={[baseVerification]}
        evidenceList={freshEvidence}
        mode="evidence-assignment"
        onLinkEvidence={onLinkEvidence}
      />,
    );

    expect(screen.getByText('Target Re-capture Checklist')).toBeTruthy();
    expect(screen.getByText('Some targets are still awaiting captures')).toBeTruthy();

    const selectTrigger = screen.getByLabelText('Link flight capture');
    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByText('after_north_pier.jpg');
    fireEvent.click(option);

    await waitFor(() => {
      expect(onLinkEvidence).toHaveBeenCalledWith('verif-1', 'ev-after-1');
    });
  });

  it('renders Before vs After comparison, blocks RESOLVED without evidence, and saves when fresh evidence is attached', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderWithRouter(
      <QueryClientProvider client={queryClient}>
        <ReinspectionVerificationSection
          inspectionId="reinsp-1"
          sourceInspectionId="orig-1"
          items={[baseVerification]}
          evidenceList={freshEvidence}
          onUpdate={onUpdate}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Before / After Defect Verification')).toBeTruthy();
    expect(screen.getByText('1. Prior Defect (Before)')).toBeTruthy();
    expect(screen.getByText('2. Drone Re-capture (After)')).toBeTruthy();
    expect(screen.queryByText(/Maintenance|Work Order|Rework/i)).toBeNull();

    // Attempting to save RESOLVED with no newEvidenceId shows validation alert
    fireEvent.click(screen.getByRole('button', { name: 'Save verification' }));
    expect(
      await screen.findByText('A fresh re-inspection evidence capture is required to mark a defect as RESOLVED.'),
    ).toBeTruthy();
    expect(onUpdate).not.toHaveBeenCalled();

    // Select fresh capture, add notes, and save
    const captureSelect = screen.getByLabelText('Or select existing capture');
    fireEvent.mouseDown(captureSelect);
    fireEvent.click(await screen.findByText('after_north_pier.jpg'));

    const notesInput = screen.getByLabelText('Inspector field verification notes');
    fireEvent.change(notesInput, { target: { value: 'Concrete patched smoothly, no spalling remains.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save verification' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('verif-1', {
        resolutionStatus: 'RESOLVED',
        newEvidenceId: 'ev-after-1',
        inspectorNotes: 'Concrete patched smoothly, no spalling remains.',
      });
    });
  });

  it('shows when a RESOLVED verdict expires and flags an expired one', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const validItem: ReinspectionVerificationItem = {
      ...baseVerification,
      newEvidenceId: 'ev-after-1',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { rerender } = renderWithRouter(
      <QueryClientProvider client={queryClient}>
        <ReinspectionVerificationSection
          inspectionId="reinsp-1"
          sourceInspectionId="orig-1"
          items={[validItem]}
          evidenceList={freshEvidence}
          onUpdate={vi.fn()}
          readOnly
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/stays valid until/i)).toBeTruthy();

    const expiredItem: ReinspectionVerificationItem = {
      ...baseVerification,
      newEvidenceId: 'ev-after-1',
      validUntil: new Date(Date.now() - 60 * 1000).toISOString(),
    };

    rerender(
      <QueryClientProvider client={queryClient}>
        <ReinspectionVerificationSection
          inspectionId="reinsp-1"
          sourceInspectionId="orig-1"
          items={[expiredItem]}
          evidenceList={freshEvidence}
          onUpdate={vi.fn()}
          readOnly
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/expired and must be re-verified|expired on/i)).toBeTruthy();
  });
});
