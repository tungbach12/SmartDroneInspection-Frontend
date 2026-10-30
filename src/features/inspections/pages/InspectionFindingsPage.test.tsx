import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  evidenceQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  removedFindingsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  findingsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  } as {
    data?: unknown[] | undefined;
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    refetch?: ReturnType<typeof vi.fn>;
  },
  workflowQuery: {
    data: { status: 'FIELD_COMPLETED' as string, findingsConfirmedAt: null as string | null, findingsSnapshotHash: null as string | null },
    isLoading: false,
    error: null as Error | null,
  },
  confirm: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  reopen: { mutate: vi.fn(), isPending: false },
  reportVersionsQuery: {
    data: [] as unknown[],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  analyze: {
    analyzeMany: vi.fn(),
    analysingIds: [] as string[],
    completedIds: [] as string[],
    noDetectionIds: [] as string[],
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  restore: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  updateLocation: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  updateFinding: { mutate: vi.fn(), isPending: false, error: null as Error | null },
  deleteFinding: { mutate: vi.fn(), isPending: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionEvidence: () => mocks.evidenceQuery,
  useRemovedFindings: () => mocks.removedFindingsQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useConfirmFindings: () => mocks.confirm,
  useReopenFindings: () => mocks.reopen,
  useReportVersions: () => mocks.reportVersionsQuery,
  useAnalyzeEvidence: () => mocks.analyze,
  useConfirmFinding: () => mocks.review,
  useRestoreFinding: () => mocks.restore,
  useCreateManualFinding: () => mocks.manual,
  useUpdateFinding: () => mocks.updateFinding,
  useDeleteFinding: () => mocks.deleteFinding,
  useUpdateEvidenceLocation: () => mocks.updateLocation,
  useInspection: () => ({ data: { inspectionType: 'INITIAL' } }),
  useReinspectionVerifications: () => ({ data: [] }),
  useUpdateReinspectionVerification: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));

vi.mock('@/shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn().mockImplementation((url, config) => {
        if (config?.responseType === 'blob') {
          return Promise.resolve({ data: new Blob(['fake-img'], { type: 'image/png' }) });
        }
        return actual.api.get(url, config);
      }),
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionFindingsPage from './InspectionFindingsPage';

const INSPECTION_ID = 'inspection-1';

function imageEvidence() {
  return {
    id: 'evidence-1',
    fileName: 'span.png',
    contentType: 'image/png',
    sizeBytes: 8,
    isDeleted: false,
    locationDescription: null,
    deduplicated: false,
  };
}

/** A finding the detector proposed and the Inspector has not looked at yet. */
function pendingFinding() {
  return {
    id: 'finding-detected-1',
    inspectionId: INSPECTION_ID,
    evidenceId: 'evidence-1',
    status: 'PENDING',
    findingCode: 'F-0002',
    defectLabel: 'Coating crack',
    severity: 'HIGH',
    technicalNotes: 'Coating crack',
    recommendedAction: null,
    boundingBox: '',
    modelName: 'advisor',
    confidence: 0.82,
    forwardedToMaintenanceAt: null,
    isDeleted: false,
  };
}

/** A finding the Inspector recorded and has not confirmed yet. */
function undecidedFinding() {
  return {
    id: 'finding-1',
    inspectionId: INSPECTION_ID,
    evidenceId: 'evidence-1',
    status: 'PENDING',
    findingCode: 'F-0001',
    defectLabel: 'Coating blistering',
    severity: 'HIGH',
    technicalNotes: 'Roughly 60mm across.',
    recommendedAction: 'Repaint.',
    boundingBox: null,
    modelName: null,
    confidence: null,
    forwardedToMaintenanceAt: null,
    isDeleted: false,
  };
}

function reportVersion(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'version-1',
    versionNo: 1,
    status,
    authorUserId: 'inspector-1',
    ...overrides,
  };
}

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: roles.includes('ORG_MANAGER') ? 'admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: 'User',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

describe('InspectionFindingsPage', () => {
  beforeEach(() => {
    cleanup();
    signInAs(['INSPECTOR']);
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: null, findingsSnapshotHash: null }, isLoading: false, error: null };
    mocks.reportVersionsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.analyze.isPending = false;
    mocks.analyze.analysingIds = [];
    mocks.analyze.completedIds = [];
    mocks.analyze.noDetectionIds = [];
    mocks.analyze.analyzeMany.mockReset();
    mocks.confirm.mutate.mockReset();
    mocks.reopen.mutate.mockReset();
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('lets the Inspector edit a manual finding while the report is not submitted', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [undecidedFinding()], isLoading: false, isError: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByText('Inspector findings')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByLabelText(/Defect label/), { target: { value: 'Corrected coating blister' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save finding' }));

    await waitFor(() => expect(mocks.updateFinding.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ findingId: 'finding-1', input: expect.objectContaining({ defectLabel: 'Corrected coating blister', evidenceId: 'evidence-1' }) }),
    ));
  });

  it('lets the Inspector soft-delete a finding without collecting a UI-only reason', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [undecidedFinding()], isLoading: false, isError: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove finding' }));

    await waitFor(() => expect(mocks.deleteFinding.mutate).toHaveBeenCalledWith('finding-1', expect.anything()));
  });

  it('offers no detection before any capture exists', () => {
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(
      screen.getByText(/Upload current image captures before running advisory detection/),
    ).toBeTruthy();
  });

  it('does not analyse retired images or show them in the Findings list', async () => {
    mocks.evidenceQuery = {
      data: [
        imageEvidence(),
        { ...imageEvidence(), id: 'retired-evidence', fileName: 'retired-span.png', isDeleted: true },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [{ ...pendingFinding(), evidenceId: 'retired-evidence' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    // Detection is an explicit action: nothing runs until the Inspector asks for it.
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
    expect(screen.queryByText('retired-span.png')).toBeNull();
    expect(screen.queryByText('Coating crack')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Coating crack' })).toBeNull();
    fireEvent.click(screen.getByLabelText(/No finding was observed within the scope/));
    expect(
      (screen.getByRole('button', { name: 'Confirm findings and continue' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('does not analyse automatically and analyses only when the Inspector asks', async () => {
    mocks.evidenceQuery = {
      data: [
        imageEvidence(),
        {
          id: 'evidence-2',
          fileName: 'permit.pdf',
          contentType: 'application/pdf',
          sizeBytes: 8,
          isDeleted: false,
          locationDescription: null,
          deduplicated: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    // Opening the stage must not start the model on its own.
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();

    // One request over the images only; the PDF is not analysed.
    fireEvent.click(screen.getByRole('button', { name: /Analyze all images \(1\)/ }));
    await waitFor(() => expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1']));
  });

  it('analyses every image in one parallel pass on request', async () => {
    mocks.evidenceQuery = {
      data: [
        imageEvidence(),
        { ...imageEvidence(), id: 'evidence-2', fileName: 'shot-02.png' },
        { ...imageEvidence(), id: 'evidence-3', fileName: 'shot-03.png' },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    // MF3-05: the images are analysed together, not one image after another, so each result can
    // reach the Findings list as it arrives instead of waiting for the slowest image.
    fireEvent.click(screen.getByRole('button', { name: /Analyze all images \(3\)/ }));
    await waitFor(() =>
      expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith([
        'evidence-1',
        'evidence-2',
        'evidence-3',
      ]),
    );
  });

  it('animates advisory detection only while the analysis request is in flight', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    // Idle must be still: the motion is a signal that a request is running, not decoration.
    await screen.findByRole('heading', { name: 'Defect Analysis & Findings' });
    expect(screen.queryByRole('img', { name: 'Advisory detection in progress' })).toBeNull();
  });

  it('does not auto-analyze when the Inspector reopens findings', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };

    // The Inspector confirms findings, leaves the stage, and comes back to reopen it. Detection
    // must not silently re-fire just because the Inspector changed their mind about the reviewed
    // set: reopening is a review action, not a request to run the model.
    const reopened = renderWithRouter(<InspectionFindingsPage />);
    await screen.findByRole('button', { name: 'Confirm findings and continue' });

    // Reopening returns the inspection to FIELD_COMPLETED. Detection must not silently re-fire
    // just because the Inspector changed their mind about the reviewed set: reopening is a review
    // action, not a request to run the model.
    mocks.workflowQuery = {
      data: {
        status: 'FIELD_COMPLETED',
        findingsConfirmedAt: null,
        findingsSnapshotHash: null,
      },
      isLoading: false,
      error: null,
    };
    reopened.rerender(<InspectionFindingsPage />);

    await screen.findByRole('heading', { name: 'Defect Analysis & Findings' });
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
  });

  it('re-runs detection on an analysed image and asks the server to replace its suggestions', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [pendingFinding()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    // MF3-05: the Inspector re-detects after a detector or threshold change. The request carries
    // replace so the server swaps the unreviewed suggestions instead of returning the old ones.
    expect(screen.getByText('Detection complete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze again' }));

    await waitFor(() =>
      expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1'], { replace: true }),
    );
  });

  it('analyses an image that has no candidates without replacing anything', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Analyze image' }));

    await waitFor(() =>
      expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1'], { replace: false }),
    );
  });

  it('shows the detection motion and names the image being analysed', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.analyze.isPending = true;
    mocks.analyze.analysingIds = ['evidence-1'];

    renderWithRouter(<InspectionFindingsPage />);

    expect(await screen.findByRole('img', { name: 'Analysing span.png' })).toBeTruthy();
    expect(screen.getByText(/Advisory detection is running/)).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Analysing span.png' }).getAttribute('src'),
    ).toContain('/images/ai-motion/');
  });

  it('shows no-defects status only for an analysis completed in the current page session', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.analyze.completedIds = ['evidence-1'];
    mocks.analyze.noDetectionIds = ['evidence-1'];
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByRole('button', { name: 'Analyze again' })).toBeTruthy();
  });

  it('does not claim an analysis result before the Inspector runs it', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByText('No defects detected')).toBeNull();
    expect(screen.getByText('No findings yet')).toBeTruthy();
  });

  it('keeps findings editable and analysis available during report drafting', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = {
      data: {
        status: 'REPORT_DRAFT',
        findingsConfirmedAt: '2026-10-08T09:00:00Z',
        findingsSnapshotHash: 'abcdef1234567890',
      },
      isLoading: false,
      error: null,
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('DRAFT')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(await screen.findByRole('button', { name: /Analyze all images/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reopen Findings' })).toBeNull();
    expect(await screen.findByText(/remain editable while authoring the report/)).toBeTruthy();
  });

  it('does not auto-analyze after findings confirmation moved the inspection forward', async () => {
    // A report draft allows explicit user-requested detection, but loading it does not auto-analyze.
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = {
      data: {
        status: 'REPORT_DRAFT',
        findingsConfirmedAt: '2026-10-08T09:00:00Z',
        findingsSnapshotHash: 'abcdef1234567890',
      },
      isLoading: false,
      error: null,
    };

    renderWithRouter(<InspectionFindingsPage />);

    await screen.findByRole('heading', { name: 'Defect Analysis & Findings' });
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Analyze all images/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reopen Findings' })).toBeNull();
  });


  it('requires explicit acknowledgment when the reviewed set is empty', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm findings and continue' }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/No finding was observed within the scope/));
    expect(confirmButton.disabled).toBe(false);
    fireEvent.click(confirmButton);
    expect(mocks.confirm.mutate).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('blocks aggregate confirmation while any finding remains undecided', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [pendingFinding()], isLoading: false, isError: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    expect((screen.getByRole('button', { name: 'Confirm findings and continue' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/1 finding still need a decision/)).toBeTruthy();
  });

  it('requires no-findings acknowledgment when the working set is empty', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm findings and continue' }) as HTMLButtonElement;
    expect(screen.getByLabelText(/No finding was observed within the scope/)).toBeTruthy();
    expect(confirmButton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/No finding was observed within the scope/));
    fireEvent.click(confirmButton);

    expect(mocks.confirm.mutate).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('waits for existing candidate records before enabling manual detection', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
  });

  it('allows editing confirmed findings during REPORT_DRAFT and blocks them while submitted', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [{ ...undecidedFinding(), status: 'CONFIRMED' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedAt: '2026-10-08T09:00:00Z', findingsSnapshotHash: 'hash' },
      isLoading: false,
      error: null,
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('DRAFT')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = renderWithRouter(<InspectionFindingsPage />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByLabelText('Asset location description for this photo').hasAttribute('disabled')).toBe(false);

    mocks.reportVersionsQuery = {
      data: [reportVersion('SUBMITTED')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    rerender(<InspectionFindingsPage />);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.getByLabelText('Asset location description for this photo').hasAttribute('disabled')).toBe(true);
  });

  it('allows confirming a candidate without location prose', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [pendingFinding()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mocks.review.mutate).toHaveBeenCalledWith({
      findingId: 'finding-detected-1',
      input: expect.objectContaining({ technicalNotes: 'Coating crack' }),
    });
  });

  it('confirms candidate severity and notes while persisting the shared evidence location', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [pendingFinding()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);
    const sharedLocation = screen.getByLabelText('Asset location description for this photo');
    fireEvent.change(sharedLocation, { target: { value: 'Girder G4, east face' } });
    fireEvent.blur(sharedLocation);
    fireEvent.mouseDown(screen.getAllByLabelText('Severity')[1]!);
    fireEvent.click(screen.getByRole('option', { name: 'HIGH' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mocks.review.mutate).toHaveBeenCalledWith({
      findingId: 'finding-detected-1',
      input: {
        severity: 'HIGH',
        technicalNotes: 'Coating crack',
      },
    });
    expect(mocks.updateLocation.mutate).toHaveBeenCalledWith(
      { evidenceId: 'evidence-1', locationDescription: 'Girder G4, east face' },
      expect.any(Object),
    );
  });

  it('does not show a retired evidence image in reviewer verdicts', () => {
    signInAs(['ORG_MANAGER']);
    mocks.evidenceQuery = {
      data: [{ ...imageEvidence(), isDeleted: true }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('SUBMITTED')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('img', { name: 'Coating blistering' })).toBeNull();
    expect(document.querySelector('img[data-src*="/evidence/evidence-1/content"]')).toBeNull();
  });

  it('shows labelled bounding boxes and hides them with the evidence toggle', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [pendingFinding()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mocks.findingsQuery.data = [{ ...pendingFinding(), boundingBox: '{"xMin":0.1,"yMin":0.2,"xMax":0.4,"yMax":0.6}' }];
    renderWithRouter(<InspectionFindingsPage />);

    // AuthenticatedImage renders the stored content endpoint on its image element.
    const photo = document.querySelector(
      'img[data-src*="/api/v1/inspections/inspection-1/evidence/evidence-1/content"]',
    );
    expect(photo?.getAttribute('alt')).toBe('Inspection evidence span.png');
    expect(screen.getByText(/Defect photo capture/)).toBeTruthy();
    expect(document.querySelector('[aria-label="Coating crack, 82 percent confidence"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Show detected regions' }));
    expect(document.querySelector('[aria-label="Coating crack, 82 percent confidence"]')).toBeNull();
  });

  it('shows a read-only Inspector findings overview for Organization Manager', () => {
    signInAs(['ORG_MANAGER']);
    mocks.findingsQuery = {
      data: [
        {
          ...undecidedFinding(),
          status: 'CONFIRMED',
          defectLabel: 'Deck spall',
          severity: 'HIGH',
        },
      ],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByText('Inspector findings')).toBeTruthy();
    expect(screen.getByText('Deck spall')).toBeTruthy();
    expect(screen.getByText('0 awaiting Inspector review')).toBeTruthy();
    expect(screen.queryByText('Advisory detection')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add manual finding' })).toBeNull();
  });

  it('does not show a per-finding Organization Manager reviewer panel', () => {
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.queryByText(/Reviewer Verdicts/)).toBeNull();
    expect(screen.queryByText(/awaiting decision/)).toBeNull();
  });

  it('keeps detection Inspector-only and never exposes per-finding Org Manager decisions', () => {
    signInAs(['ORG_MANAGER']);
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('SUBMITTED')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Re-run detection' })).toBeNull();
    expect(screen.queryByText(/Add manual finding/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.queryByText(/Reviewer Verdicts/)).toBeNull();
  });

  it('does not show the removed per-finding reviewer surface on a draft', () => {
    signInAs(['ORG_MANAGER']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('DRAFT')],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.queryByText(/Reviewer Verdicts/)).toBeNull();
  });

  it('does not bring back per-finding controls from an older submitted report version', () => {
    signInAs(['ORG_MANAGER']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('SUBMITTED'), reportVersion('DRAFT', { id: 'version-2', versionNo: 2 })],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.queryByText(/Reviewer Verdicts/)).toBeNull();
  });

  it('withholds the removed per-finding reviewer surface from report authors too', () => {
    signInAs(['ORG_MANAGER']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportVersionsQuery = {
      data: [reportVersion('SUBMITTED', { authorUserId: 'admin-1' })],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.queryByText(/Reviewer Verdicts/)).toBeNull();
  });
  it('allows the Inspector to edit a reviewed candidate before report submission', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [{ ...pendingFinding(), status: 'CONFIRMED' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [
        {
          ...undecidedFinding(),
          id: 'finding-detected-1',
          status: 'CONFIRMED',
          defectLabel: 'Coating crack',
        },
      ],
      isLoading: false, isError: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByText(/Inspector confirmed/)).toBeTruthy();
    const editBtn = screen.getByRole('button', { name: 'Edit / Change defect' });
    fireEvent.click(editBtn);

    expect(screen.queryByText('Correct Inspector finding details:')).toBeNull();
    expect(screen.queryByLabelText('Evidence location')).toBeNull();
    fireEvent.change(screen.getByLabelText('Defect label'), { target: { value: 'Coating blistering' } });
    fireEvent.change(screen.getByLabelText(/Technical notes/), { target: { value: 'Updated technical notes' } });
    fireEvent.change(screen.getByLabelText(/Recommended action/), { target: { value: 'Apply protective epoxy coating' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));

    expect(mocks.updateFinding.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        findingId: 'finding-detected-1',
        input: expect.objectContaining({
          defectLabel: 'Coating blistering',
          technicalNotes: 'Updated technical notes',
          recommendedAction: 'Apply protective epoxy coating',
        }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
