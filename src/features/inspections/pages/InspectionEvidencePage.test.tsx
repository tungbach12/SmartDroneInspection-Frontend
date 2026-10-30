import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  queryEvidence: vi.fn(),
  evidenceQuery: {
    data: { items: [] as unknown[], totalCount: 0, totalPages: 0, page: 1, pageSize: 50, activeCount: 0, retiredCount: 0, latestCreatedAt: null as string | null, latestRetiredAt: null as string | null },
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  workflowQuery: {
    data: { status: 'FIELD_COMPLETED' as string },
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  sessionQuery: {
    data: [
      {
        id: 'session-1',
        inspectionId: 'inspection-1',
        status: 'FIELD_COMPLETED',
        preFlightChecklistNote: 'Drone identified; bridge accessible',
        startedAt: '2026-10-08T08:00:00Z',
        endedAt: '2026-10-08T09:00:00Z',
        postponementReason: null,
        abortReason: null,
        outcomeNotes: 'Main span surveyed',
      },
    ] as unknown[],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  upload: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  versions: { data: [] as unknown[], isLoading: false, error: null as Error | null, refetch: vi.fn() },
  retire: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  bulkRetire: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionEvidenceQuery: (
    _inspectionId: string,
    filters: { status: string; mediaType: string; search: string },
  ) => {
    mocks.queryEvidence('inspection-1', filters);
    // The API filters and pages server-side; the mock emulates that contract so the UI tests
    // exercise the real request/filter relationship instead of a client-side filter.
    const all = (mocks.evidenceQuery.data?.items ?? []) as Array<{
      id: string;
      fileName: string;
      contentType: string;
      isDeleted: boolean;
    }>;
    const items = all.filter((item) => {
      const statusMatches =
        filters.status === 'ALL' ||
        (filters.status === 'ACTIVE' ? !item.isDeleted : item.isDeleted);
      const mediaTypeMatches =
        filters.mediaType === 'ALL' ||
        (filters.mediaType === 'IMAGE' && item.contentType.startsWith('image/')) ||
        (filters.mediaType === 'VIDEO' && item.contentType.startsWith('video/')) ||
        (filters.mediaType === 'DOCUMENT' &&
          !item.contentType.startsWith('image/') &&
          !item.contentType.startsWith('video/'));
      const searchMatches =
        !filters.search ||
        item.fileName.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.contentType.toLowerCase().includes(filters.search.toLowerCase());
      return statusMatches && mediaTypeMatches && searchMatches;
    });
    return {
      ...mocks.evidenceQuery,
      data: { ...mocks.evidenceQuery.data, items, totalCount: items.length },
    };
  },
  useInspectionEvidence: () => mocks.evidenceQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useFieldSessions: () => mocks.sessionQuery,
  useReportVersions: () => mocks.versions,
  useRetireEvidence: () => mocks.retire,
  useBulkRetireEvidence: () => mocks.bulkRetire,
  useUploadInspectionEvidence: () => mocks.upload,
  useInspection: () => ({ data: { id: 'inspection-1', inspectionType: 'INITIAL' }, isLoading: false }),
  useReinspectionVerifications: () => ({ data: [], isLoading: false }),
  useUpdateReinspectionVerification: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionEvidencePage from './InspectionEvidencePage';

function imageEvidence() {
  return {
    id: 'evidence-1',
    fileName: 'span.png',
    contentType: 'image/png',
    sizeBytes: 8,
    captureTime: '2026-10-08T08:15:00Z',
    isDeleted: false,
  }; 
}

function signInAs(role: 'INSPECTOR' | 'ORG_MANAGER') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'ORG_MANAGER' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'ORG_MANAGER' ? 'Organization Manager' : 'Inspector',
      roles: [role],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

describe('InspectionEvidencePage', () => {
  beforeEach(() => {
    cleanup();
    signInAs('INSPECTOR');
    mocks.queryEvidence.mockReset();
    mocks.evidenceQuery = { data: { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 50, activeCount: 0, retiredCount: 0, latestCreatedAt: null as string | null, latestRetiredAt: null as string | null }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED' }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.versions = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.retire.mutate.mockReset();
    mocks.bulkRetire.mutateAsync.mockReset();
    mocks.upload.mutateAsync.mockReset();
    mocks.upload.mutateAsync.mockResolvedValue({ id: 'evidence-1' });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('keeps evidence editable during report drafting and locks it while submitted', () => {
    mocks.workflowQuery = { data: { status: 'REPORT_DRAFT' }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: null, latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = renderWithRouter(<InspectionEvidencePage />);
    expect(screen.getByRole('button', { name: 'Choose evidence files' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete evidence' })).toBeTruthy();
    expect(screen.queryByText(/Reopen Findings/)).toBeNull();

    mocks.versions = {
      data: [{ id: 'version-1', versionNo: 1, status: 'SUBMITTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = { data: { status: 'REPORT_DRAFT' }, isLoading: false, error: null, refetch: vi.fn() };
    rerender(<InspectionEvidencePage />);
    expect(screen.queryByRole('button', { name: 'Choose evidence files' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete evidence' })).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Withdraw the submission if it has not been reviewed');
  });

  it('gives Organization Manager a read-only evidence register instead of Inspector intake controls', () => {
    signInAs('ORG_MANAGER');
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('heading', { name: 'Evidence intake' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
    expect(screen.queryByLabelText(/shot-list comparison/i)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Evidence register' })).toBeTruthy();
    expect(screen.getAllByText('span.png').length).toBeGreaterThan(0);
  });

  it('does not expose an evidence quality accept action', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
    expect(screen.queryByLabelText(/shot-list comparison/i)).toBeNull();
  });

  it('leaves coverage authoring to the report instead of adding an evidence comparison input', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByLabelText(/shot-list comparison/i)).toBeNull();
  });

  it('does not create or send an evidence quality decision', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
  });

  it('keeps additional-session requests out of the MF3 Evidence page', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('button', { name: 'Additional session needed' })).toBeNull();
    expect(screen.queryByLabelText(/why is another field session needed/i)).toBeNull();
  });

  it('omits the redundant evidence coverage card and checkpoints link', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('heading', { name: 'Evidence coverage' })).toBeNull();
    expect(screen.queryByRole('link', { name: /checkpoints in field session/i })).toBeNull();
    expect(screen.queryByLabelText(/why is another field session needed/i)).toBeNull();
  });







  it('hides retired captures by default and shows them in the retired audit filter', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 1, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getAllByText('span.png').length).toBeGreaterThan(0);
    expect(screen.queryByText('retired-span.png')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Evidence status' }));
    fireEvent.click(screen.getByRole('option', { name: /Deleted \(1\)/ }));
    expect(mocks.queryEvidence).toHaveBeenCalledWith(
      'inspection-1',
      expect.objectContaining({ status: 'RETIRED', page: 1 }),
    );
  });

  it('filters evidence by filename and file type', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence(), { ...imageEvidence(), id: 'evidence-2', fileName: 'inspection.pdf', contentType: 'application/pdf' }], page: 1, pageSize: 50, totalCount: 2, totalPages: 1, activeCount: 2, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.change(screen.getByLabelText('Search evidence'), { target: { value: 'inspection' } });
    expect(mocks.queryEvidence).toHaveBeenCalledWith(
      'inspection-1',
      expect.objectContaining({ search: 'inspection', page: 1 }),
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'File type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Images' }));
    expect(mocks.queryEvidence).toHaveBeenCalledWith(
      'inspection-1',
      expect.objectContaining({ mediaType: 'IMAGE', page: 1 }),
    );
  });

  it('shows the retired original through the retired filter without a quality-decision gate', () => {
    mocks.evidenceQuery = {
      data: { items: [{ ...imageEvidence(), isDeleted: true }], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 0, retiredCount: 1, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: '2026-10-17T10:00:00Z' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByText('Deleted')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Evidence status' }));
    fireEvent.click(screen.getByRole('option', { name: /Deleted \(1\)/ }));

    expect(mocks.queryEvidence).toHaveBeenCalledWith(
      'inspection-1',
      expect.objectContaining({ status: 'RETIRED' }),
    );
    expect(screen.getByText(/original bytes remain available for audit/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
  });

  it('offers a delete action while the report is editable', async () => {
    mocks.evidenceQuery = { data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null }, isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete evidence' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }));

    expect(mocks.retire.mutate).toHaveBeenCalledWith('evidence-1');
  });

  it('allows bulk deleting active captures without a UI-only reason', async () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence(), { ...imageEvidence(), id: 'evidence-2', fileName: 'span2.png' }], page: 1, pageSize: 50, totalCount: 2, totalPages: 1, activeCount: 2, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.click(screen.getByRole('button', { name: /Select all/ }));
    fireEvent.click(screen.getByRole('button', { name: /Delete all/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(mocks.bulkRetire.mutateAsync).toHaveBeenCalledWith(['evidence-1', 'evidence-2']);
  });



  it('picker admits exactly the backend allowlist', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(document.querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/png,image/jpeg,image/webp,image/tiff,video/mp4,application/pdf',
    );
  });

  it('uploads each queued file with its own mutation and keeps a failed file retryable', async () => {
    const first = new File(['one'], 'span-a.png', { type: 'image/png' });
    const second = new File(['two'], 'span-b.png', { type: 'image/png' });
    mocks.upload.mutateAsync
      .mockResolvedValueOnce({ id: 'evidence-1' })
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ id: 'evidence-2' });
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [first, second] },
    });
    fireEvent.click(screen.getByRole('button', { name: /upload staged files/i }));

    await waitFor(() => expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(2));
    // The failed file stays in the queue with its error while the success leaves.
    expect(await screen.findByText(/network down/)).toBeTruthy();
    expect(screen.queryByText('span-a.png')).toBeNull();
    expect(screen.getByText('span-b.png')).toBeTruthy();

    // Retry uploads the remaining file with a third mutation and clears the queue.
    fireEvent.click(screen.getByRole('button', { name: /upload staged files/i }));
    await waitFor(() => expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('span-b.png')).toBeNull();
  });

  it('does not offer the MF2 additional-session action from Evidence', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByRole('button', { name: 'Additional session needed' })).toBeNull();
  });

  it('allows uploading evidence when a completed field session exists even if workflow status is READY_FOR_FLIGHT', () => {
    mocks.workflowQuery = { data: { status: 'READY_FOR_FLIGHT' }, isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByRole('button', { name: 'Choose evidence files' })).toBeTruthy();
  });

  it('renders the stored evidence register without non-persisted checksum/source fields', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('Evidence register')).toBeTruthy();
    expect(screen.getByText('Showing 1 of 1 matching captures')).toBeTruthy();
    expect(screen.getAllByText('span.png').length).toBeGreaterThan(0);
    expect(screen.queryByText(/abcdef1234567890/)).toBeNull();
    expect(screen.queryByText(/WEB_UPLOAD/)).toBeNull();
    // AuthenticatedImage renders the stored content endpoint on its image element.
    const preview = document.querySelector(
      'img[data-src*="/api/v1/inspections/inspection-1/evidence/evidence-1/content"]',
    );
    expect(preview?.getAttribute('alt')).toBe('span.png');
  });

  it('reports an empty evidence register rather than a blank panel', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText(/no evidence recorded/i)).toBeTruthy();
  });
});
