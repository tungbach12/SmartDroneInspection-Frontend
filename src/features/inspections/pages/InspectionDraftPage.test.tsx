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
    data: {
      status: 'FIELD_COMPLETED' as string,
      findingsConfirmedAt: null as string | null,
      findingsSnapshotHash: null as string | null,
    },
    isLoading: false,
    error: null as Error | null,
  },
  findingsQuery: {
    data: [] as unknown[],
    isLoading: false,
    error: null as Error | null,
  },
  evidenceQuery: {
    data: [] as unknown[],
    isLoading: false,
    error: null as Error | null,
  },
  createDraft: {
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
  },
  authorManualDraft: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  saveSections: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  verifyVersion: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  submitVersion: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  withdrawVersion: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useReportVersions: () => mocks.versionsQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
  useSaveReportSections: () => mocks.saveSections,
  useVerifyReportVersion: () => mocks.verifyVersion,
  useSubmitReportVersion: () => mocks.submitVersion,
  useWithdrawReportVersion: () => mocks.withdrawVersion,
  useReinspectionVerifications: () => ({ data: [] }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionDraftPage from './InspectionDraftPage';

function signInAs(role: 'INSPECTOR' | 'CUSTOMER') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'CUSTOMER' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'CUSTOMER' ? 'Organization Manager' : 'Inspector',
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
    mocks.workflowQuery = {
      data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: null, findingsSnapshotHash: null },
      isLoading: false,
      error: null,
    };
    mocks.findingsQuery = { data: [], isLoading: false, error: null };
    mocks.evidenceQuery = { data: [], isLoading: false, error: null };
    mocks.createDraft.mutate.mockReset();
    mocks.createDraft.isPending = false;
    mocks.createDraft.isSuccess = false;
    mocks.authorManualDraft.mutate.mockReset();
    mocks.saveSections.mutateAsync.mockReset();
    mocks.verifyVersion.mutate.mockReset();
    mocks.submitVersion.mutate.mockReset();
    mocks.withdrawVersion.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('keeps draft submission blocked until findings have been confirmed', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(mocks.createDraft.mutate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Accept the evidence set/)).toBeNull();
  });

  it('keeps report draft submission disabled until findings have been confirmed', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(mocks.createDraft.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Go to Findings' })).toBeTruthy();
  });

  it('shows submit button once findings are confirmed and submits on confirmation', () => {
    mocks.workflowQuery = {
      data: {
        status: 'FIELD_COMPLETED',
        findingsConfirmedAt: '2026-10-14T12:00:00Z',
        findingsSnapshotHash: 'abc123',
      },
      isLoading: false,
      error: null,
    };
    renderWithRouter(<InspectionDraftPage />);

    const submitBtn = screen.getByRole('button', { name: 'Submit for review' });
    expect(submitBtn).toBeTruthy();

    fireEvent.click(submitBtn);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm and Submit' });
    fireEvent.click(confirmBtn);

    expect(mocks.createDraft.mutate).toHaveBeenCalledOnce();
  });

  it('shows truthful pending copy without simulated drafting stages or percentages', () => {
    mocks.createDraft.isPending = true;
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.getByText('Compiling inspection report')).toBeTruthy();
    expect(screen.queryByText(/Progress stages are not available/)).toBeNull();
    expect(screen.queryByText(/Data Collection|% estimated|Typical time/)).toBeNull();
  });

  it('animates the draft wait state without implying a stage or an estimate', () => {
    mocks.createDraft.isPending = true;
    renderWithRouter(<InspectionDraftPage />);

    const figures = screen.getAllByRole('img', { name: 'Compiling report in progress' });
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      expect(figure.getAttribute('src')).toContain('/images/ai-motion/');
    }

    const waitState = screen.getByText('Compiling inspection report').closest('.MuiCard-root');
    expect(waitState?.textContent ?? '').not.toMatch(/\d+\s*%|%|\b\d+\s*(s|sec|seconds|min|minutes)\b/i);
  });

  it('keeps the draft motion still until generation is requested', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.queryByRole('img', { name: 'Compiling report in progress' })).toBeNull();
  });

  it('shows the empty report state until a version exists', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.getByText('No report version yet')).toBeTruthy();
  });

  it('renders report details and allows resubmitting when a version was returned', () => {
    mocks.workflowQuery = {
      data: {
        status: 'FIELD_COMPLETED',
        findingsConfirmedAt: '2026-10-14T11:00:00Z',
        findingsSnapshotHash: 'abc123',
      },
      isLoading: false,
      error: null,
    };
    mocks.versionsQuery = {
      data: [
        {
          id: 'version-1',
          inspectionReportId: 'inspection-1',
          versionNo: 1,
          status: 'RETURNED',
          authorUserId: 'inspector-1',
          createdAt: '2026-10-14T12:00:00Z',
          returnReason: 'Clarify findings',
          sections: {
            executiveSummary: 'Main span inspected.',
            methodEquipmentConditions: 'Visual drone survey.',
            omissionDisclosure: 'None.',
            conclusionsRecommendations: 'Monitor hairline crack.',
            overallCondition: 'GOOD',
          },
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    expect(screen.getByText('Report details')).toBeTruthy();

    // In-place submit action opens ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and Submit' }));
    expect(mocks.submitVersion.mutate).toHaveBeenCalledWith('version-1', expect.anything());
  });

  it('allows the Inspector to withdraw a submitted version in-place before reviewer action', () => {
    mocks.workflowQuery = {
      data: {
        status: 'FIELD_COMPLETED',
        findingsConfirmedAt: '2026-10-14T11:00:00Z',
        findingsSnapshotHash: 'abc123',
      },
      isLoading: false,
      error: null,
    };
    mocks.versionsQuery = {
      data: [
        {
          id: 'version-1',
          inspectionReportId: 'inspection-1',
          versionNo: 1,
          status: 'SUBMITTED',
          authorUserId: 'inspector-1',
          reviewerUserId: null,
          reviewedAt: null,
          createdAt: '2026-10-14T12:00:00Z',
          sections: {},
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionDraftPage />);

    const withdrawBtn = screen.getByRole('button', { name: 'Withdraw submission and revise' });
    fireEvent.click(withdrawBtn);
    expect(mocks.withdrawVersion.mutate).toHaveBeenCalledWith({ versionId: 'version-1' });
  });

  it('does not ask an already published inspection to confirm findings again', () => {
    mocks.workflowQuery = {
      data: {
        status: 'COMPLETED',
        findingsConfirmedAt: '2026-10-15T09:00:00Z',
        findingsSnapshotHash: 'abc123',
      },
      isLoading: false,
      error: null,
    };
    mocks.versionsQuery = {
      data: [
        {
          id: 'version-1',
          inspectionReportId: 'inspection-1',
          versionNo: 1,
          status: 'PUBLISHED',
          authorUserId: 'inspector-1',
          createdAt: '2026-10-15T10:00:00Z',
          sections: {},
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionDraftPage />);

    expect(screen.getByText(/The report has been published/)).toBeTruthy();
  });
});
