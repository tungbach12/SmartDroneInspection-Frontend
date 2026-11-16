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
  findingsQuery: {
    data: [] as unknown[],
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
  retryProcessing: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
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
  useInspectionFindings: () => mocks.findingsQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useFieldSessions: () => mocks.sessionQuery,
  useReportVersions: () => mocks.versions,
  useRetireEvidence: () => mocks.retire,
  useRetryEvidenceProcessing: () => mocks.retryProcessing,
  useBulkRetireEvidence: () => mocks.bulkRetire,
  useInvalidateInspectionEvidence: () => vi.fn().mockResolvedValue(undefined),
  useUploadInspectionEvidence: () => mocks.upload,
  useInspection: () => ({ data: { id: 'inspection-1' }, isLoading: false }),
  useReinspectionVerifications: () => ({ data: [], isLoading: false, error: null }),
  useUpdateReinspectionVerification: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

vi.mock('@/shared/ui/AuthenticatedMedia', () => ({
  AuthenticatedMedia: ({
    alt,
    contentType = 'image/jpeg',
    src,
    videoRef,
  }: {
    alt: string;
    contentType?: string;
    src: string;
    videoRef?: { current: HTMLVideoElement | null };
  }) =>
    contentType.startsWith('video/') ? (
      <video ref={videoRef} aria-label={alt} data-src={src} />
    ) : (
      <img alt={alt} data-src={src} />
    ),
}));

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

function signInAs(role: 'INSPECTOR' | 'CUSTOMER') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'CUSTOMER' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'CUSTOMER' ? 'Organization Manager' : 'Inspector',
      roles: [role],
    },
  });
}

describe('InspectionEvidencePage', () => {
  beforeEach(() => {
    cleanup();
    signInAs('INSPECTOR');
    mocks.queryEvidence.mockReset();
    mocks.evidenceQuery = { data: { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 50, activeCount: 0, retiredCount: 0, latestCreatedAt: null as string | null, latestRetiredAt: null as string | null }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.findingsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
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
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED' }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: null, latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = renderWithRouter(<InspectionEvidencePage />);
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete evidence' })).toBeTruthy();
    expect(screen.queryByText(/Reopen Findings/)).toBeNull();

    mocks.versions = {
      data: [{ id: 'version-1', versionNo: 1, status: 'SUBMITTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = { data: { status: 'FIELD_COMPLETED' }, isLoading: false, error: null, refetch: vi.fn() };
    rerender(<InspectionEvidencePage />);
    expect(
      (screen.getByRole('button', { name: 'Choose files (locked)' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Delete evidence' })).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Withdraw the unreviewed submission or ask the reviewer to return it');

    mocks.versions = {
      data: [{ id: 'version-1', versionNo: 1, status: 'PUBLISHED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    rerender(<InspectionEvidencePage />);
    expect(screen.getByRole('alert').textContent).toContain('report is approved or published');
    expect(screen.getByRole('alert').textContent).not.toContain('Withdraw');
  });

  it('gives Organization Manager a read-only evidence register instead of Inspector intake controls', () => {
    signInAs('CUSTOMER');
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
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/i }));

    await waitFor(() => expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(2));
    // The failed file stays in the queue with its error while the success leaves.
    expect(await screen.findByText(/network down/)).toBeTruthy();
    expect(screen.queryByText('span-a.png')).toBeNull();
    expect(screen.getByText('span-b.png')).toBeTruthy();

    // Retry uploads the remaining file with a third mutation and clears the queue.
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/i }));
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

    expect(screen.getByRole('button', { name: 'Choose files' })).toBeTruthy();
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
    expect(screen.getByText('Upload captures above to review them here.')).toBeTruthy();
  });

  it('shows concise video tools when an active video is selected', () => {
    mocks.evidenceQuery = {
      data: {
        items: [
          {
            id: 'video-1',
            fileName: 'flight.mp4',
            contentType: 'video/mp4',
            sizeBytes: 1024,
            captureTime: '2026-10-08T08:15:00Z',
            isDeleted: false,
          },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 1,
        totalPages: 1,
        activeCount: 1,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('Video tools')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '-1s' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '-0.1s' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+0.1s' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+1s' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Capture frame' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Scan video for defects/i })).toBeNull();

    // Fine-stepping updates the video timecode readout cleanly.
    fireEvent.click(screen.getByRole('button', { name: '+1s' }));
    expect(screen.getByText('00:01.0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '-0.1s' }));
    expect(screen.getByText('00:00.9')).toBeTruthy();
  });

  it('rejects oversized >2 GB video files and renders FAILED retry / resumable chunked uploads', async () => {
    const { inspectionApi } = await import('../api/inspectionApi');
    const beginSpy = vi.spyOn(inspectionApi, 'beginEvidenceUpload').mockResolvedValue({
      sessionId: 'sess-1',
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      fileName: 'long-flight.mp4',
      contentType: 'video/mp4',
      declaredSizeBytes: 12,
      chunkSizeBytes: 5,
      totalParts: 3,
      uploadedPartNumbers: [],
      status: 'OPEN',
      evidenceId: null,
      errorMessage: null,
      expiresAt: '2026-11-16T00:00:00Z',
      createdAt: '2026-11-15T00:00:00Z',
      completedAt: null,
    });
    const partSpy = vi
      .spyOn(inspectionApi, 'uploadEvidencePart')
      .mockRejectedValueOnce(new Error('transient timeout'))
      .mockImplementation(async (_inspId, _sessId, partNo) => ({
        sessionId: 'sess-1',
        inspectionId: 'inspection-1',
        fieldSessionId: 'session-1',
        fileName: 'long-flight.mp4',
        contentType: 'video/mp4',
        declaredSizeBytes: 12,
        chunkSizeBytes: 5,
        totalParts: 3,
        uploadedPartNumbers: Array.from({ length: partNo }, (_, i) => i + 1),
        status: 'OPEN',
        evidenceId: null,
        errorMessage: null,
        expiresAt: '2026-11-16T00:00:00Z',
        createdAt: '2026-11-15T00:00:00Z',
        completedAt: null,
      }));
    const completeSpy = vi.spyOn(inspectionApi, 'completeEvidenceUpload').mockResolvedValue({
      sessionId: 'sess-1',
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      fileName: 'long-flight.mp4',
      contentType: 'video/mp4',
      declaredSizeBytes: 12,
      chunkSizeBytes: 5,
      totalParts: 3,
      uploadedPartNumbers: [1, 2, 3],
      status: 'PROCESSING',
      evidenceId: 'ev-video-1',
      errorMessage: null,
      expiresAt: '2026-11-16T00:00:00Z',
      createdAt: '2026-11-15T00:00:00Z',
      completedAt: null,
    });

    mocks.evidenceQuery = {
      data: {
        items: [
          {
            id: 'video-failed',
            fileName: 'failed.mp4',
            contentType: 'video/mp4',
            sizeBytes: 1024,
            processingStatus: 'FAILED',
            processingError: 'FFmpeg timed out',
            captureTime: '2026-10-08T08:15:00Z',
            isDeleted: false,
          },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 1,
        totalPages: 1,
        activeCount: 1,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    window.sessionStorage.clear();
    renderWithRouter(<InspectionEvidencePage />);

    // Failed video disables tools and exposes retry processing.
    expect(screen.getByText('FFmpeg timed out')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Capture frame' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry processing' }));
    expect(mocks.retryProcessing.mutate).toHaveBeenCalledWith('video-failed');

    // Oversized > 2 GB file is rejected client-side.
    const hugeFile = { name: 'huge.mp4', type: 'video/mp4', size: 2 * 1024 * 1024 * 1024 + 1 } as File;
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [hugeFile] },
    });
    expect(await screen.findByText(/Video uploads cannot exceed 2 GB/)).toBeTruthy();

    // Valid MP4 uses resumable chunk upload with transient chunk retry.
    const validVideo = new File(['0123456789AB'], 'long-flight.mp4', { type: 'video/mp4' });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [validVideo] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/i }));

    await waitFor(() => expect(completeSpy).toHaveBeenCalledWith('inspection-1', 'sess-1'));
    expect(beginSpy).toHaveBeenCalledTimes(1);
    expect(partSpy).toHaveBeenCalledTimes(4); // 1 failed + 3 succeeded
  });

  it('keeps manual video Capture frame and Watch in video traceback without AI video scan', async () => {
    mocks.evidenceQuery = {
      data: {
        items: [
          {
            id: 'video-1',
            fileName: 'commercial_tower_orbit_mission.mp4',
            contentType: 'video/mp4',
            sizeBytes: 4096,
            captureTime: '2026-10-08T08:15:00Z',
            isDeleted: false,
          },
          {
            id: 'frame-child',
            fileName: 'orbit_frame_08s.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1024,
            captureTime: '2026-10-08T08:16:00Z',
            sourceVideoEvidenceId: 'video-1',
            sourceTimestampSeconds: 8,
            isDeleted: false,
          },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 2,
        totalPages: 1,
        activeCount: 2,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:16:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByRole('button', { name: 'Capture frame' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Scan video for defects/i })).toBeNull();

    // Selecting the extracted child frame displays the clickable video traceback action
    fireEvent.click(screen.getByText('orbit_frame_08s.jpg'));
    expect(await screen.findByRole('button', { name: /Watch in video @ 00:08/i }, { timeout: 3000 })).toBeTruthy();
  });

  it('keeps the source video selected after capturing a frame so timeline tracking can continue', async () => {
    const { inspectionApi } = await import('../api/inspectionApi');
    const updateLocSpy = vi
      .spyOn(inspectionApi, 'updateEvidenceLocation')
      .mockResolvedValue({} as never);

    const videoItem = {
      id: 'video-1',
      fileName: 'commercial_tower_orbit_mission.mp4',
      contentType: 'video/mp4',
      sizeBytes: 4096,
      captureTime: '2026-10-08T08:15:00Z',
      isDeleted: false,
    };
    const savedFrame = {
      id: 'frame-12s',
      fileName: 'video_crop_00m12s_1234.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024,
      captureTime: '2026-10-08T08:16:00Z',
      sourceVideoEvidenceId: 'video-1',
      sourceTimestampSeconds: 12,
      isDeleted: false,
    };

    mocks.upload.mutateAsync.mockResolvedValue(savedFrame);
    const refetchMock = vi.fn().mockImplementation(async () => {
      // Simulate newest-first ordering where the newly captured frame lands at index 0.
      mocks.evidenceQuery.data.items = [savedFrame, videoItem];
      mocks.evidenceQuery.data.totalCount = 2;
      mocks.evidenceQuery.data.activeCount = 2;
    });

    mocks.evidenceQuery = {
      data: {
        items: [videoItem],
        page: 1,
        pageSize: 50,
        totalCount: 1,
        totalPages: 1,
        activeCount: 1,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: refetchMock,
    };

    const OriginalImage = globalThis.Image;
    class MockImage {
      naturalWidth = 640;
      naturalHeight = 360;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,ZmFrZQ==');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
      cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });

    try {
      const view = renderWithRouter(<InspectionEvidencePage />);
      const videoEl = view.container.querySelector('video') as HTMLVideoElement;
      expect(videoEl).toBeTruthy();

      Object.defineProperty(videoEl, 'readyState', { value: 2, configurable: true });
      Object.defineProperty(videoEl, 'videoWidth', { value: 640, configurable: true });
      Object.defineProperty(videoEl, 'videoHeight', { value: 360, configurable: true });
      Object.defineProperty(videoEl, 'currentTime', { value: 12, writable: true, configurable: true });
      videoEl.pause = vi.fn();

      fireEvent.click(screen.getByRole('button', { name: 'Capture frame' }));
      const saveBtn = await screen.findByRole('button', { name: /Save cropped image to Evidence/i });
      expect(screen.getByText('Crop preview')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Center 50%' })).toBeTruthy();
      expect((screen.getByLabelText('Evidence file name') as HTMLInputElement).value).toBe(
        'video_crop_00m12s.jpg',
      );
      fireEvent.click(saveBtn);

      await waitFor(() => expect(refetchMock).toHaveBeenCalledTimes(1));
      view.rerender(<InspectionEvidencePage />);

      // Viewer must stay on the video with timeline intact instead of switching to the new frame.
      expect(view.container.querySelector('video[aria-label="commercial_tower_orbit_mission.mp4"]')).toBeTruthy();
      expect(screen.getByText('Video tools')).toBeTruthy();
      expect(screen.getByText(/Saved captured frame video_crop_00m12s_1234\.jpg \(00:12\)\./)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Watch in video/i })).toBeNull();
      expect(updateLocSpy).toHaveBeenCalled();
    } finally {
      vi.stubGlobal('Image', OriginalImage);
      vi.restoreAllMocks();
    }
  });

  it('warns when selected captures cite active findings and removes them before deleting if accepted', async () => {
    const { inspectionApi } = await import('../api/inspectionApi');
    const deleteFindingSpy = vi
      .spyOn(inspectionApi, 'deleteFinding')
      .mockResolvedValue(undefined as never);

    mocks.evidenceQuery = {
      data: {
        items: [
          imageEvidence(),
          { ...imageEvidence(), id: 'evidence-2', fileName: 'abscission_frame.jpg' },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 2,
        totalPages: 1,
        activeCount: 2,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [
        {
          id: 'finding-1',
          inspectionId: 'inspection-1',
          evidenceId: 'evidence-2',
          status: 'CONFIRMED',
          findingCode: 'FND-001',
          defectLabel: 'abscission',
          severity: 'MEDIUM',
          technicalNotes: '',
          recommendedAction: null,
          boundingBox: null,
          modelName: 'yolo11',
          confidence: 0.9,
          isDeleted: false,
        },
        {
          id: 'finding-2',
          inspectionId: 'inspection-1',
          evidenceId: 'evidence-1',
          status: 'AI_CANDIDATE',
          findingCode: 'FND-002',
          defectLabel: 'crack',
          severity: 'HIGH',
          technicalNotes: '',
          recommendedAction: null,
          boundingBox: null,
          modelName: 'yolo11',
          confidence: 0.85,
          isDeleted: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.bulkRetire.mutateAsync.mockResolvedValue([]);

    try {
      renderWithRouter(<InspectionEvidencePage />);

      // Select both items via batch select-all and open confirmation dialog.
      fireEvent.click(screen.getByRole('button', { name: /Select all/ }));
      fireEvent.click(screen.getByRole('button', { name: /Delete all \(2\)/i }));

      expect(await screen.findByText('Confirm Deletion with Linked Findings')).toBeTruthy();
      expect(screen.getByText(/2 active finding\(s\) cite the selected capture\(s\)\./)).toBeTruthy();
      expect(screen.getByText('FND-001')).toBeTruthy();
      expect(screen.getByText(/abscission \(MEDIUM\) — abscission_frame\.jpg/)).toBeTruthy();
      expect(screen.getByText('FND-002')).toBeTruthy();
      expect(screen.getByText(/crack \(HIGH\) — span\.png/)).toBeTruthy();

      // Cancelling leaves findings and captures untouched.
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(deleteFindingSpy).not.toHaveBeenCalled();
      expect(mocks.bulkRetire.mutateAsync).not.toHaveBeenCalled();

      // Re-open and accept warning: deletes linked findings first, then retires captures.
      fireEvent.click(screen.getByRole('button', { name: /Delete all \(2\)/i }));
      fireEvent.click(await screen.findByRole('button', { name: 'Delete findings & captures' }));

      await waitFor(() => expect(mocks.bulkRetire.mutateAsync).toHaveBeenCalledWith(['evidence-1', 'evidence-2']));
      expect(deleteFindingSpy).toHaveBeenNthCalledWith(1, 'inspection-1', 'finding-1');
      expect(deleteFindingSpy).toHaveBeenNthCalledWith(2, 'inspection-1', 'finding-2');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('notifies about duplicate filenames, predicts (1) (2) suffixes, and uploads without blocking', async () => {
    mocks.evidenceQuery = {
      data: {
        items: [{ ...imageEvidence(), isDeleted: true }],
        page: 1,
        pageSize: 50,
        totalCount: 0,
        totalPages: 1,
        activeCount: 0,
        retiredCount: 1,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: '2026-10-17T10:00:00Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    const first = new File(['one'], 'span.png', { type: 'image/png' });
    const second = new File(['two'], 'span.png', { type: 'image/png' });
    mocks.upload.mutateAsync
      .mockResolvedValueOnce({ id: 'evidence-2', fileName: 'span (1).png' })
      .mockResolvedValueOnce({ id: 'evidence-3', fileName: 'span (2).png' });

    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [first, second] },
    });

    // Duplicate notice appears when staged, predicts (1) & (2), and Upload remains enabled.
    expect(screen.getByText(/Duplicate filename detected/i)).toBeTruthy();
    expect(screen.getAllByText(/span \(1\)\.png/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/span \(2\)\.png/).length).toBeGreaterThan(0);
    const uploadButton = screen.getByRole('button', { name: /^Upload$/i }) as HTMLButtonElement;
    expect(uploadButton.disabled).toBe(false);

    fireEvent.click(uploadButton);

    await waitFor(() => expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Duplicate filename notice — automatically renamed on upload/i)).toBeTruthy();
    expect(screen.getByText('span (1).png')).toBeTruthy();
    expect(screen.getByText('span (2).png')).toBeTruthy();
  });

  it('displays a clickable View on map action instead of raw GPS coordinates and opens the map dialog', async () => {
    mocks.evidenceQuery = {
      data: {
        items: [
          {
            ...imageEvidence(),
            fileName: 'photo-01-defect-north-crown-spalling.jpg',
            contentType: 'image/jpeg',
            latitude: 10.875333,
            longitude: 106.800525,
          },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 1,
        totalPages: 1,
        activeCount: 1,
        retiredCount: 0,
        latestCreatedAt: '2026-10-08T08:15:00Z',
        latestRetiredAt: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionEvidencePage />);

    // Raw GPS text must not be rendered inline on the cards.
    expect(screen.queryByText(/10\.875333/)).toBeNull();
    const viewOnMapButtons = screen.getAllByRole('button', { name: /View on map/i });
    expect(viewOnMapButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(viewOnMapButtons[0]!);

    expect(await screen.findByText('Capture location on map')).toBeTruthy();
    expect(screen.getByText(/10\.875333° N, 106\.800525° E/)).toBeTruthy();
    const mapSurface = screen.getByTitle(
      'Map location for photo-01-defect-north-crown-spalling.jpg',
    );
    expect(
      screen.getByRole('button', { name: 'Capture pin photo-01-defect-north-crown-spalling.jpg' }),
    ).toBeTruthy();
    const initialTile = mapSurface.querySelector('img') as HTMLImageElement;
    expect(initialTile.src).toContain('lyrs=s');

    fireEvent.click(screen.getByRole('button', { name: 'Street map' }));
    const streetTile = mapSurface.querySelector('img') as HTMLImageElement;
    expect(streetTile.src).toContain('lyrs=m');
    expect(streetTile.src).toContain('apistyle=s.t:2%7Cs.e:a%7Cp.v:off');

    const externalLink = screen.getByRole('link', { name: /Open in Google Maps/i }) as HTMLAnchorElement;
    expect(externalLink.href).toContain('https://www.google.com/maps?q=10.875333,106.800525');
  });
});
