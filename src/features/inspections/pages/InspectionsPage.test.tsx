import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignmentQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  checklistQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  evidenceQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  candidateQuery: { data: [] as unknown[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
  start: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  save: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  upload: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  analyze: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionAssignments: () => mocks.assignmentQuery,
  useInspectionChecklist: () => mocks.checklistQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useFindingCandidates: () => mocks.candidateQuery,
  useStartInspection: () => mocks.start,
  useSaveChecklistResponse: () => mocks.save,
  useUploadInspectionEvidence: () => mocks.upload,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
}));

vi.mock('@/features/reports/hooks/useReports', () => ({
  useCreateReportDraft: () => mocks.createDraft,
}));

import InspectionsPage from './InspectionsPage';
import { useAuthStore } from '@/features/auth/store/authStore';

const assignment = {
  assignmentId: 'assignment-1',
  serviceOrderId: 'order-1',
  assetId: 'asset-1',
  deadline: null,
  status: 'ACCEPTED',
  inspectionId: null,
};

function signInAsInspector() {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'inspector@example.test',
      fullName: 'Inspector',
      roles: ['INSPECTOR'],
      actorZone: 'SERVICE_WORKFORCE',
      organizationId: null,
    },
  });
}

describe('InspectionsPage', () => {
  beforeEach(() => {
    signInAsInspector();
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
    mocks.start.mutateAsync.mockReset().mockResolvedValue({ inspectionId: 'inspection-1' });
    mocks.assignmentQuery = { data: [assignment], isLoading: false, error: null, refetch: vi.fn() };
    mocks.checklistQuery = {
      data: [], isLoading: false, error: null, refetch: vi.fn(),
    };
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    mocks.upload.isError = false;
    mocks.upload.error = null;
  });

  afterEach(() => useAuthStore.getState().clearSession());

  it('loads assigned work and retries an evidence upload with the retained file', async () => {
    const { container, rerender } = render(<InspectionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start inspection' }));

    await screen.findByText('Checklist');
    const file = new File(['evidence'], 'span.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [file] },
    });

    mocks.upload.isError = true;
    mocks.upload.error = new Error('network down');
    rerender(<InspectionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry upload' }));

    expect(mocks.upload.mutate).toHaveBeenCalledWith(file);
  });

  it('shows a recoverable load error and offers retry', () => {
    const refetch = vi.fn();
    mocks.assignmentQuery = {
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      refetch,
    };
    render(<InspectionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
