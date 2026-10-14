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
  analyze: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  reviseReview: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
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
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
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
    repairRequired: true,
    status: 'ACTIVE',
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
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
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

    await waitFor(() => expect(mocks.analyze.mutate).toHaveBeenCalledWith('evidence-1'));
    expect(mocks.analyze.mutate).not.toHaveBeenCalledWith('evidence-2');
    expect(mocks.analyze.mutate).toHaveBeenCalledTimes(1);
  });


  it('sends CONFIRMED with the per-candidate severity and location', () => {
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

  it('withholds the reviewer verdict from the Inspector, who only recommends', () => {
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

  it('shows the MF3-09 reviewer control only to ORG_ADMIN on undecided findings', () => {
    signInAs(['ORG_ADMIN']);
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionFindingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm finding' }));
    expect(mocks.decideFinding.mutate).toHaveBeenCalledWith({
      findingId: 'finding-1',
      decision: 'CONFIRMED',
      rationale: '',
    });
  });

  it('keeps detection controls Inspector-only while retaining Org Admin review controls', () => {
    signInAs(['ORG_ADMIN']);
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = {
      data: [undecidedFinding()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionFindingsPage />);

    expect(mocks.analyze.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Re-run detection' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirm finding' })).toBeTruthy();
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
