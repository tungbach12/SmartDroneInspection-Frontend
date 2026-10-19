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
  qualityQuery: {
    data: [] as unknown[] | undefined,
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
  decideQuality: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
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
      retiredAt: string | null;
    }>;
    const items = all.filter((item) => {
      const statusMatches =
        filters.status === 'ALL' ||
        (filters.status === 'ACTIVE' ? item.retiredAt == null : item.retiredAt != null);
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
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useReportVersions: () => mocks.versions,
  useRetireEvidence: () => mocks.retire,
  useBulkRetireEvidence: () => mocks.bulkRetire,
  useUploadInspectionEvidence: () => mocks.upload,
  useDecideEvidenceQuality: () => mocks.decideQuality,
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
    checksumSha256: 'abcdef1234567890',
    captureTime: '2026-10-08T08:15:00Z',
    source: 'WEB_UPLOAD',
    retiredByUserId: null,
    retiredAt: null,
    retirementReason: null,
  }; 
}

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

/** MF3-03 makes the comparison a required input, so the accept path starts here. */
function writeComparison(text = 'Span P4 covered; east face not observed.') {
  fireEvent.change(screen.getByLabelText(/shot-list comparison/i), {
    target: { value: text },
  });
}

describe('InspectionEvidencePage', () => {
  beforeEach(() => {
    cleanup();
    signInAs('INSPECTOR');
    mocks.queryEvidence.mockReset();
    mocks.evidenceQuery = { data: { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 50, activeCount: 0, retiredCount: 0, latestCreatedAt: null as string | null, latestRetiredAt: null as string | null }, isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.versions = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.retire.mutate.mockReset();
    mocks.bulkRetire.mutateAsync.mockReset();
    mocks.upload.mutateAsync.mockReset();
    mocks.upload.mutateAsync.mockResolvedValue({ id: 'evidence-1' });
    mocks.decideQuality.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('gives Organization Admin a read-only evidence review instead of disabled Inspector intake controls', () => {
    signInAs('ORG_ADMIN');
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED', shotListComparison: 'Main span captured; east face not observed.', limitationReason: null, decidedByUserId: 'inspector-1', decidedAt: '2026-10-08T09:00:00Z' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByRole('heading', { name: 'Inspector evidence assessment' })).toBeTruthy();
    expect(screen.getByText('Main span captured; east face not observed.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Evidence intake' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
    expect(screen.queryByLabelText(/shot-list comparison/i)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Evidence register' })).toBeTruthy();
    expect(screen.getAllByText('span.png').length).toBeGreaterThan(0);
  });

  it('refuses the accept decision until a comparison and at least one evidence item exist', () => {
    renderWithRouter(<InspectionEvidencePage />);

    const accept = screen.getByRole('button', {
      name: 'Accept evidence set',
    }) as HTMLButtonElement;
    expect(accept.disabled).toBe(true);

    // Comparison alone is not enough without stored evidence.
    writeComparison();
    expect(
      (screen.getByRole('button', { name: 'Accept evidence set' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('enables accept once a comparison is entered and evidence exists', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison();
    expect(
      (screen.getByRole('button', { name: 'Accept evidence set' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('sends the shot-list comparison with the accept decision', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison('Span P4 covered; east face not observed.');
    fireEvent.click(screen.getByRole('button', { name: 'Accept evidence set' }));

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith({
      decision: 'ACCEPTED',
      shotListComparison: 'Span P4 covered; east face not observed.',
    });
  });

  it('requires a stated limitation before a limited decision can be sent', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    // The reason field is not on screen until a reason-carrying decision is chosen, so an
    // ordinary acceptance stays a single click (Report 3 MF3-03).
    writeComparison();
    expect(screen.queryByLabelText(/limitation or reason/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Re-upload required' }));
    expect(
      (screen.getByRole('button', { name: 'Confirm Re-upload required' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    expect(
      (screen.getByRole('button', { name: 'Confirm Re-upload required' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('sends the limitation with the limited decision it belongs to', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison('Span P4 covered; east face not observed.');
    fireEvent.click(screen.getByRole('button', { name: 'Accept with limitation' }));
    // The consequence of a limited acceptance is stated before it is recorded.
    expect(screen.getByText(/does not unlock automated\s+processing/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Accept with limitation' }));

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith(
      {
        decision: 'LIMITED',
        shotListComparison: 'Span P4 covered; east face not observed.',
        limitationReason: 'The east face was not observed',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it.each([
    { label: 'Re-upload required', decision: 'REUPLOAD_REQUIRED' },
    { label: 'Additional session needed', decision: 'ADDITIONAL_SESSION_REQUIRED' },
  ])('sends comparison and reason with $decision', ({ label, decision }) => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison('Span P4 covered; east face not observed.');
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    fireEvent.click(screen.getByRole('button', { name: `Confirm ${label}` }));

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith(
      {
        decision,
        shotListComparison: 'Span P4 covered; east face not observed.',
        limitationReason: 'The east face was not observed',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows the recorded decision text so the Inspector can see what was disclosed', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', fieldSessionId: null, decision: 'LIMITED', shotListComparison: 'Span P4 covered; east face not observed.', limitationReason: 'The east face was not observed', decidedByUserId: 'inspector-1', decidedAt: '2026-10-08T09:00:00Z' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('Span P4 covered; east face not observed.')).toBeTruthy();
    expect(screen.getByText(/Limitation or reason: The east face was not observed/)).toBeTruthy();
  });

  it('hides retired captures by default and shows them in the retired audit filter', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 1, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('span.png')).toBeTruthy();
    expect(screen.queryByText('retired-span.png')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Evidence status' }));
    fireEvent.click(screen.getByRole('option', { name: /Retired audit \(1\)/ }));
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

  it('shows the retired original through the retired filter and requires a fresh quality decision', () => {
    mocks.evidenceQuery = {
      data: { items: [{ ...imageEvidence(), retiredAt: '2026-10-17T10:00:00Z', retiredByUserId: 'inspector-1', retirementReason: 'Replaced with a sharper capture' }], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 0, retiredCount: 1, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: '2026-10-17T10:00:00Z' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', fieldSessionId: null, decision: 'ACCEPTED', shotListComparison: 'Old set accepted', limitationReason: null, decidedByUserId: 'inspector-1', decidedAt: '2026-10-16T10:00:00Z' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.queryByText('Retired — audit copy')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Evidence status' }));
    fireEvent.click(screen.getByRole('option', { name: /Retired audit \(1\)/ }));

    expect(mocks.queryEvidence).toHaveBeenCalledWith(
      'inspection-1',
      expect.objectContaining({ status: 'RETIRED' }),
    );
    expect(screen.getByText(/EVIDENCE SET CHANGED — REASSESS/)).toBeTruthy();
    expect(screen.getByText(/original bytes remain available for audit/i)).toBeTruthy();
    // The stale decision is still shown, labelled as no longer current, so the Inspector can see
    // what the previous disclosure said before replacing it.
    expect(screen.getByText(/Old set accepted/)).toBeTruthy();
    expect(screen.getByText(/no longer current, shown for reference/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Accept evidence set' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers a reasoned retire action while the report is editable', () => {
    mocks.evidenceQuery = { data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null }, isLoading: false, error: null, refetch: vi.fn() };
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.change(screen.getByLabelText('Reason for replacing this capture'), { target: { value: 'Image is blurred' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retire from current evidence set' }));

    expect(mocks.retire.mutate).toHaveBeenCalledWith(
      { evidenceId: 'evidence-1', reason: 'Image is blurred' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('allows bulk retiring active captures with a shared audit reason', async () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence(), { ...imageEvidence(), id: 'evidence-2', fileName: 'span2.png' }], page: 1, pageSize: 50, totalCount: 2, totalPages: 1, activeCount: 2, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    fireEvent.click(screen.getByRole('button', { name: /Bulk retire all active/ }));
    fireEvent.change(screen.getByLabelText(/Shared reason for retiring batch/), {
      target: { value: 'Imported wrong SD card from another flight session' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm bulk retire' }));

    expect(mocks.bulkRetire.mutateAsync).toHaveBeenCalledWith({
      evidenceIds: ['evidence-1', 'evidence-2'],
      reason: 'Imported wrong SD card from another flight session',
    });
  });

  it('keeps non-accept decisions disabled without stored evidence', () => {
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison();
    expect(
      (screen.getByRole('button', { name: 'Accept with limitation' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Re-upload required' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Additional session needed' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
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

  it('links to the preparation stage for shot-list review', () => {
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByRole('link', { name: /shot-list in preparation/i })).toBeTruthy();
  });

  it('renders the stored evidence register with checksum and provenance', () => {
    mocks.evidenceQuery = {
      data: { items: [imageEvidence()], page: 1, pageSize: 50, totalCount: 1, totalPages: 1, activeCount: 1, retiredCount: 0, latestCreatedAt: '2026-10-08T08:15:00Z', latestRetiredAt: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('Evidence register')).toBeTruthy();
    expect(screen.getByText('Showing 1 of 1 matching captures')).toBeTruthy();
    expect(screen.getByText('span.png')).toBeTruthy();
    expect(screen.getByText(/abcdef1234567890/)).toBeTruthy();
    expect(screen.getByText(/WEB_UPLOAD/)).toBeTruthy();
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
