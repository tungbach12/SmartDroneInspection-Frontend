import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  evidenceQuery: {
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
  upload: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  decideQuality: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionEvidence: () => mocks.evidenceQuery,
  useEvidenceQualityHistory: () => mocks.qualityQuery,
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
  };
}

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

/** MF3-03 makes the comparison a required input, so the accept path starts here. */
function writeComparison(text = 'Span P4 covered; east face not observed.') {
  fireEvent.change(screen.getByLabelText(/shot-list comparison/i), {
    target: { value: text },
  });
}

describe('InspectionEvidencePage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.upload.mutateAsync.mockReset();
    mocks.upload.mutateAsync.mockResolvedValue({ id: 'evidence-1' });
    mocks.decideQuality.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
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
      data: [imageEvidence()],
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
      data: [imageEvidence()],
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
      data: [imageEvidence()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
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

    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    expect(
      (screen.getByRole('button', { name: 'Accept with limitation' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('sends the limitation with the limited decision it belongs to', () => {
    mocks.evidenceQuery = {
      data: [imageEvidence()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison('Span P4 covered; east face not observed.');
    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept with limitation' }));

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith({
      decision: 'LIMITED',
      shotListComparison: 'Span P4 covered; east face not observed.',
      limitationReason: 'The east face was not observed',
    });
  });

  it.each([
    { label: 'Re-upload required', decision: 'REUPLOAD_REQUIRED' },
    { label: 'Additional session needed', decision: 'ADDITIONAL_SESSION_REQUIRED' },
  ])('sends comparison and reason with $decision', ({ label, decision }) => {
    mocks.evidenceQuery = {
      data: [imageEvidence()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison('Span P4 covered; east face not observed.');
    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith({
      decision,
      shotListComparison: 'Span P4 covered; east face not observed.',
      limitationReason: 'The east face was not observed',
    });
  });

  it('keeps non-accept decisions disabled without stored evidence', () => {
    renderWithRouter(<InspectionEvidencePage />);

    writeComparison();
    fireEvent.change(screen.getByLabelText(/limitation or reason/i), {
      target: { value: 'The east face was not observed' },
    });
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
      data: [imageEvidence()],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionEvidencePage />);

    expect(screen.getByText('Evidence register (1)')).toBeTruthy();
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
