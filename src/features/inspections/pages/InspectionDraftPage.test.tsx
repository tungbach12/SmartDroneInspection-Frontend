import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  versionsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  workflowQuery: {
    data: { status: 'FIELD_COMPLETED' as string, findingsConfirmedAt: null as string | null, findingsSnapshotHash: null as string | null },
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

function signInAs(role: 'INSPECTOR' | 'ORG_ADMIN') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'ORG_ADMIN' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'ORG_ADMIN' ? 'Organization Admin' : 'Inspector',
      roles: [role],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

describe('InspectionDraftPage', () => {
  beforeEach(() => {
    cleanup();
    signInAs('INSPECTOR');
    mocks.versionsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: null, findingsSnapshotHash: null }, isLoading: false, error: null };
    mocks.createDraft.mutate.mockReset();
    mocks.createDraft.isPending = false;
    mocks.authorManualDraft.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('keeps draft generation blocked until findings have been confirmed, without an evidence decision', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(
      (screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.queryByText(/Accept the evidence set/)).toBeNull();
  });

  it('keeps manual draft creation disabled until findings have been confirmed', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect((screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Create manual draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: 'Go to Findings' })).toBeTruthy();
  });

  it('generates a draft once findings are confirmed, without an evidence decision', () => {
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedAt: '2026-10-14T12:00:00Z', findingsSnapshotHash: 'abc123' },
      isLoading: false,
      error: null,
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

  it('does not ask an already published inspection to confirm findings again', () => {
    mocks.workflowQuery = {
      data: {
        status: 'REPORT_PUBLISHED',
        findingsConfirmedAt: '2026-10-15T09:00:00Z',
        findingsSnapshotHash: 'abc123',
      },
      isLoading: false,
      error: null,
    };
    mocks.versionsQuery = {
      data: [{ id: 'version-1', inspectionId: 'inspection-1', versionNo: 1, status: 'PUBLISHED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionDraftPage />);

    expect(screen.queryByRole('link', { name: 'Go to Findings' })).toBeNull();
    expect(screen.getByText(/report has been published/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Create manual draft' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the reviewer version list without Inspector draft controls', () => {
    signInAs('ORG_ADMIN');
    mocks.versionsQuery = {
      data: [{ id: 'version-1', inspectionId: 'inspection-1', versionNo: 1, status: 'SUBMITTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />, { route: '/client/inspections/inspection-1/report' });

    expect(screen.getByText('Organization Admin review actions are available on the Review report tab. This stage is retained for read-only status and version history.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Report versions' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Generate report draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create manual draft' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open the report document' }).getAttribute('href')).toContain('/client/reports/inspection-1');
  });

  it('creates an empty manual structured draft after findings confirmation', () => {
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedAt: '2026-10-14T12:00:00Z', findingsSnapshotHash: 'abc123' },
      isLoading: false,
      error: null,
    };
    renderWithRouter(<InspectionDraftPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create manual draft' }));
    expect(mocks.authorManualDraft.mutate).toHaveBeenCalledWith({});
    expect(screen.queryByLabelText('Narrative')).toBeNull();
    expect(screen.queryByLabelText('Omitted analysis disclosure')).toBeNull();
  });
});
