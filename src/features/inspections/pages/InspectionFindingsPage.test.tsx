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
  candidateQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  findingsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  qualityQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  workflowQuery: {
    data: { status: 'FIELD_COMPLETED' as string, findingsConfirmedByUserId: null as string | null, findingsConfirmedAt: null as string | null, findingsSnapshotHash: null as string | null },
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
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  reviseReview: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  updateFinding: { mutate: vi.fn(), isPending: false, error: null as Error | null },
  deleteFinding: { mutate: vi.fn(), isPending: false, error: null as Error | null },
  decideFinding: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionEvidence: () => mocks.evidenceQuery,
  useFindingCandidates: () => mocks.candidateQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useConfirmFindings: () => mocks.confirm,
  useReopenFindings: () => mocks.reopen,
  useReportVersions: () => mocks.reportVersionsQuery,
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
  useUpdateFinding: () => mocks.updateFinding,
  useDeleteFinding: () => mocks.deleteFinding,
  useReviseReviewedCandidate: () => mocks.reviseReview,
  useDecideFinding: () => mocks.decideFinding,
}));

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
    checksumSha256: 'abcdef1234567890',
  };
}

function accepted() {
  return [{ id: 'decision-1', inspectionId: INSPECTION_ID, decision: 'ACCEPTED' }];
}

function pendingCandidate() {
  return {
    id: 'candidate-1',
    evidenceId: 'evidence-1',
    modelName: 'advisor',
    modelVersion: 'v3',
    predictedLabel: 'Coating crack',
    confidence: 0.82,
    boundingBox: '',
    status: 'PENDING',
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: '2026-10-08T08:15:00Z',
  };
}

/** An MF3-06 finding the qualified reviewer has not decided, so it is not official yet. */
function undecidedFinding() {
  return {
    id: 'finding-1',
    inspectionId: INSPECTION_ID,
    evidenceId: 'evidence-1',
    aiCandidateId: null,
    source: 'MANUAL',
    findingCode: 'F-0001',
    defectLabel: 'Coating blistering',
    severity: 'HIGH',
    locationDescription: 'Girder G4',
    technicalNotes: 'Roughly 60mm across.',
    recommendedAction: 'Repaint.',
    component: null,
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    decision: null,
    decidedByUserId: null,
    decidedAt: null,
    repairRequired: true,
    status: 'ACTIVE',
    correctiveActionRequired: true,
    correctiveActionPriority: null,
    correctiveActionDueAt: null,
    correctiveActionReviewedByUserId: null,
    correctiveActionReviewedAt: null,
    correctiveActionRationale: null,
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
      id: roles.includes('ORG_ADMIN') ? 'admin-1' : 'inspector-1',
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
    mocks.candidateQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    mocks.findingsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED', findingsConfirmedByUserId: null, findingsConfirmedAt: null, findingsSnapshotHash: null }, isLoading: false, error: null };
    mocks.reportVersionsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.analyze.isPending = false;
    mocks.analyze.analysingIds = [];
    mocks.analyze.analyzeMany.mockReset();
    // The one-time auto-detection offer is remembered per user and inspection for the tab session.
    window.sessionStorage.clear();
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
    mocks.findingsQuery = { data: [undecidedFinding()], isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByText('Inspector findings')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByLabelText(/Defect label/), { target: { value: 'Corrected coating blister' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save finding' }));

    await waitFor(() => expect(mocks.updateFinding.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ findingId: 'finding-1', input: expect.objectContaining({ defectLabel: 'Corrected coating blister', evidenceId: 'evidence-1' }) }),
    ));
  });

  it('lets the Inspector soft-delete a finding with a reason while the report is not submitted', async () => {
    mocks.findingsQuery = { data: [undecidedFinding()], isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.change(await screen.findByLabelText(/Removal reason/), { target: { value: 'False alarm after source review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));

    await waitFor(() => expect(mocks.deleteFinding.mutate).toHaveBeenCalledWith({ findingId: 'finding-1', reason: 'False alarm after source review' }));
  });

  it('offers no detection before the evidence set is accepted', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(
      screen.getByText(/Detection starts after an accepted evidence quality decision/),
    ).toBeTruthy();
  });

  it('runs detection automatically once accepted, and only for unanalysed images', async () => {
    mocks.evidenceQuery = {
      data: [
        imageEvidence(),
        {
          id: 'evidence-2',
          fileName: 'permit.pdf',
          contentType: 'application/pdf',
          sizeBytes: 8,
          checksumSha256: 'abcdef1234567891',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    await waitFor(() => expect(mocks.analyze.analyzeMany).toHaveBeenCalledTimes(1));
    // One parallel pass over the images that have no candidates yet; the PDF is not analysed.
    expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1']);
  });

  it('analyses every unanalysed image in one parallel pass', async () => {
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
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    // MF3-05: the accepted set is analysed together, not one image after another, so each result can
    // reach the Findings list as it arrives instead of waiting for the slowest image.
    await waitFor(() => expect(mocks.analyze.analyzeMany).toHaveBeenCalledTimes(1));
    expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith([
      'evidence-1',
      'evidence-2',
      'evidence-3',
    ]);
  });

  it('animates advisory detection only while the analysis request is in flight', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    // Idle must be still: the motion is a signal that a request is running, not decoration.
    await screen.findByRole('heading', { name: 'Advisory detection' });
    expect(screen.queryByRole('img', { name: 'Advisory detection in progress' })).toBeNull();
  });

  it('does not auto-analyze again after the Inspector reopens findings', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    // First arrival with an accepted evidence set: detection offers itself once and runs.
    const { unmount } = renderWithRouter(<InspectionFindingsPage />);
    await waitFor(() => expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1']));
    unmount();
    mocks.analyze.analyzeMany.mockClear();

    // The Inspector confirms findings, leaves the stage, and comes back to reopen it. Unmounting is
    // what tab navigation does, so the automatic offer has to be remembered outside the component.
    mocks.workflowQuery = {
      data: {
        status: 'REPORT_DRAFT',
        findingsConfirmedByUserId: 'inspector-1',
        findingsConfirmedAt: '2026-10-08T09:00:00Z',
        findingsSnapshotHash: 'abcdef1234567890',
      },
      isLoading: false,
      error: null,
    };
    const reopened = renderWithRouter(<InspectionFindingsPage />);
    await screen.findByRole('button', { name: 'Reopen Findings' });

    // Reopening returns the inspection to FIELD_COMPLETED. Detection must not silently re-fire
    // just because the Inspector changed their mind about the reviewed set: reopening is a review
    // action, not a request to run the model.
    mocks.workflowQuery = {
      data: {
        status: 'FIELD_COMPLETED',
        findingsConfirmedByUserId: null,
        findingsConfirmedAt: null,
        findingsSnapshotHash: null,
      },
      isLoading: false,
      error: null,
    };
    reopened.rerender(<InspectionFindingsPage />);

    await screen.findByRole('heading', { name: 'Advisory detection' });
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
  });

  it('re-runs detection on an analysed image and asks the server to replace its suggestions', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [pendingCandidate()],
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
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Analyze' }));

    await waitFor(() =>
      expect(mocks.analyze.analyzeMany).toHaveBeenCalledWith(['evidence-1'], { replace: false }),
    );
  });

  it('shows the detection motion and names the image being analysed', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.analyze.isPending = true;
    mocks.analyze.analysingIds = ['evidence-1'];

    renderWithRouter(<InspectionFindingsPage />);

    expect(await screen.findByRole('img', { name: 'Advisory detection in progress' })).toBeTruthy();
    // Which image is in flight is real information, not a guessed stage.
    expect(screen.getByText('Analysing span.png…')).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Analysing span.png' }).getAttribute('src'),
    ).toContain('/images/ai-motion/');
  });

  it('says no detected defects for an image that produced no candidates', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWithRouter(<InspectionFindingsPage />);

    // Detection ran and returned nothing. Say so about detection rather than about findings, because
    // an image can carry a finding the Inspector recorded while detection itself returned nothing.
    expect(screen.getAllByText('No detected defects').length).toBeGreaterThan(0);
    expect(screen.queryByText('0 detected defects')).toBeNull();
  });

  it('does not auto-analyze an image once findings confirmation moved the inspection forward', async () => {
    // MF3: confirmation advances the inspection to the Report step, where analysis is locked. A
    // page loaded in that state must not fire analysis the backend would refuse with 409.
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = {
      data: {
        status: 'REPORT_DRAFT',
        findingsConfirmedByUserId: 'user-1',
        findingsConfirmedAt: '2026-10-08T09:00:00Z',
        findingsSnapshotHash: 'abcdef1234567890',
      },
      isLoading: false,
      error: null,
    };

    renderWithRouter(<InspectionFindingsPage />);

    await screen.findByRole('heading', { name: 'Findings' });
    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
  });


  it('requires explicit acknowledgment when the reviewed set is empty', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
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

  it('blocks aggregate confirmation while any candidate remains pending', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = { data: [pendingCandidate()], isLoading: false, isError: false, refetch: vi.fn() };
    renderWithRouter(<InspectionFindingsPage />);

    expect((screen.getByRole('button', { name: 'Confirm findings and continue' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/1 AI candidate still need a decision/)).toBeTruthy();
  });

  it('requires no-findings acknowledgment after every AI candidate is rejected', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [{ ...pendingCandidate(), status: 'REJECTED' }],
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

  it('waits for existing candidate records before starting the automatic detection pass', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(mocks.analyze.analyzeMany).not.toHaveBeenCalled();
  });

  it('allows confirming a candidate without location prose', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [pendingCandidate()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mocks.review.mutate).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
      input: expect.objectContaining({ decision: 'CONFIRMED', locationDescription: undefined }),
    });
  });

  it('sends CONFIRMED with optional location and image-backed candidate context', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [pendingCandidate()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);
    fireEvent.change(screen.getByLabelText(/Location for/), { target: { value: 'Girder G4, east face' } });
    fireEvent.mouseDown(screen.getByLabelText(/Severity for/));
    fireEvent.click(screen.getByRole('option', { name: 'HIGH' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mocks.review.mutate).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
      input: {
        decision: 'CONFIRMED',
        severity: 'HIGH',
        locationDescription: 'Girder G4, east face',
        technicalNotes: 'Confirmed by assigned Inspector',
      },
    });
  });

  it('shows the defect photo on each candidate card', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [pendingCandidate()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    // AuthenticatedImage renders the stored content endpoint on its image element.
    const photo = document.querySelector(
      'img[data-src*="/api/v1/inspections/inspection-1/evidence/evidence-1/content"]',
    );
    expect(photo?.getAttribute('alt')).toBe('Coating crack');
    expect(screen.getByText(/Defect photo capture/)).toBeTruthy();
  });

  it('withholds reviewer verdict actions from the Inspector who only proposes findings', () => {
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.getByText(/awaits the reviewer verdict/)).toBeTruthy();
  });

  it('keeps detection Inspector-only and exposes ORG_ADMIN decisions only for a submitted report', () => {
    signInAs(['ORG_ADMIN']);
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
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
    expect(screen.getByRole('button', { name: 'Confirm finding' })).toBeTruthy();
  });

  it('does not expose ORG_ADMIN finding decisions while the selected report is a draft', () => {
    signInAs(['ORG_ADMIN']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
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
    expect(screen.getByText(/awaits the reviewer verdict/)).toBeTruthy();
  });

  it('uses the latest report version status when deciding whether reviewer verdicts are available', () => {
    signInAs(['ORG_ADMIN']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
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
  });

  it('withholds ORG_ADMIN finding decisions from the report author', () => {
    signInAs(['ORG_ADMIN']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
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
    expect(screen.getByText(/awaits the reviewer verdict/)).toBeTruthy();
  });
  it('allows Inspector to edit / correct a reviewed candidate before reviewer decision', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = {
      data: [{ ...pendingCandidate(), status: 'CONFIRMED' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [
        {
          ...undecidedFinding(),
          aiCandidateId: 'candidate-1',
          defectLabel: 'Coating crack',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    expect(screen.getByText(/Inspector: CONFIRMED/)).toBeTruthy();
    const editBtn = screen.getByRole('button', { name: 'Edit / Change defect' });
    fireEvent.click(editBtn);

    fireEvent.change(screen.getByLabelText('Defect label'), { target: { value: 'Coating blistering' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));

    expect(mocks.reviseReview.mutate).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
      input: expect.objectContaining({
        decision: 'MODIFIED',
        defectLabel: 'Coating blistering',
      }),
    });
  });
});
