import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  qualityQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  versionsQuery: {
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
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  authorManualDraft: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useReportVersions: () => mocks.versionsQuery,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionDraftPage from './InspectionDraftPage';

function signInAsInspector() {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'inspector@example.test',
      fullName: 'Inspector',
      roles: ['INSPECTOR'],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

describe('InspectionDraftPage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.versionsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED', findingsConfirmedByUserId: null, findingsConfirmedAt: null, findingsSnapshotHash: null }, isLoading: false, error: null };
    mocks.createDraft.mutate.mockReset();
    mocks.createDraft.isPending = false;
    mocks.authorManualDraft.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('keeps draft generation blocked until the evidence set is accepted', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(
      (screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText(/Accept the evidence set before generating/)).toBeTruthy();
  });

  it('keeps draft creation disabled until findings have been confirmed', () => {
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    expect((screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Save structured draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: 'Go to Findings' })).toBeTruthy();
  });

  it('generates a draft once accepted and findings are confirmed', () => {
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedByUserId: 'inspector-1', findingsConfirmedAt: '2026-10-14T12:00:00Z', findingsSnapshotHash: 'abc123' },
      isLoading: false,
      error: null,
    };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate report draft' }));
    expect(mocks.createDraft.mutate).toHaveBeenCalledOnce();
  });

  it('shows truthful pending copy without simulated drafting stages or percentages', () => {
    mocks.createDraft.isPending = true;
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.getByText('Generating report draft')).toBeTruthy();
    expect(screen.getByText(/Progress stages are not available/)).toBeTruthy();
    expect(screen.getByText(/review and verify every section/)).toBeTruthy();
    expect(screen.queryByText(/Data Collection|% estimated|Typical time/)).toBeNull();
  });

  it('animates the draft wait state without implying a stage or an estimate', () => {
    mocks.createDraft.isPending = true;
    renderWithRouter(<InspectionDraftPage />);

    // Playful, but still indeterminate: the endpoint reports no intermediate stages.
    const figures = screen.getAllByRole('img', { name: 'Report drafting in progress' });
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      expect(figure.getAttribute('src')).toContain('/images/ai-motion/');
    }

    // Scope the no-estimate check to the wait state, so unrelated page copy cannot make it noisy.
    const waitState = screen.getByText('Generating report draft').closest('.MuiCard-root');
    expect(waitState?.textContent ?? '').not.toMatch(/\d+\s*%|%|\b\d+\s*(s|sec|seconds|min|minutes)\b/i);
  });

  it('keeps the draft motion still until generation is requested', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.queryByRole('img', { name: 'Report drafting in progress' })).toBeNull();
  });

  it('keeps the report link disabled until a version exists', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(
      (screen.getByRole('button', { name: 'Open the report document' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('opens the report document once a version exists', () => {
    mocks.versionsQuery = {
      data: [{ id: 'version-1', inspectionId: 'inspection-1', versionNo: 1, status: 'DRAFT' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    const link = screen.getByRole('link', { name: 'Open the report document' });
    expect(link.getAttribute('href')).toContain('inspection-1');
  });

  it('seeds a manual draft with the narrative and disclosure after findings confirmation', () => {
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedByUserId: 'inspector-1', findingsConfirmedAt: '2026-10-14T12:00:00Z', findingsSnapshotHash: 'abc123' },
      isLoading: false,
      error: null,
    };
    renderWithRouter(<InspectionDraftPage />);

    fireEvent.change(screen.getByLabelText('Narrative'), {
      target: { value: 'Span inspected from the ground.' },
    });
    fireEvent.change(screen.getByLabelText('Omitted analysis disclosure'), {
      target: { value: 'No model run; east face omitted.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save structured draft' }));

    expect(mocks.authorManualDraft.mutate).toHaveBeenCalledWith({
      narrative: 'Span inspected from the ground.',
      omissionDisclosure: 'No model run; east face omitted.',
    });
  });
});
