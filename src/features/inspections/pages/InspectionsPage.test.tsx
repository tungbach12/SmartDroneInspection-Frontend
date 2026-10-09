import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checklistQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  evidenceQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  candidateQuery: { data: [] as unknown[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
  qualityQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  save: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  upload: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  decideQuality: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  analyze: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  authorManualDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionChecklist: () => mocks.checklistQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useFindingCandidates: () => mocks.candidateQuery,
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useDecideEvidenceQuality: () => mocks.decideQuality,
  useSaveChecklistResponse: () => mocks.save,
  useUploadInspectionEvidence: () => mocks.upload,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
}));

import InspectionsPage from './InspectionsPage';
import { useAuthStore } from '@/features/auth/store/authStore';

/** Opens the MF3 workspace for one inspection, replacing the retired assignment picker. */
function openInspection() {
  fireEvent.change(screen.getByLabelText('Inspection ID'), {
    target: { value: 'inspection-1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open inspection' }));
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

describe('InspectionsPage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
    mocks.checklistQuery = {
      data: [], isLoading: false, error: null, refetch: vi.fn(),
    };
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.upload.isError = false;
    mocks.upload.error = null;
  });

  afterEach(() => useAuthStore.getState().clearSession());

  it('opens an inspection by identifier and retries an evidence upload with the retained file', async () => {
    const { container, rerender } = render(<InspectionsPage />);
    openInspection();

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

  it('shows a recoverable load error and offers retry', async () => {
    const refetch = vi.fn();
    mocks.candidateQuery = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    };

    render(<InspectionsPage />);
    openInspection();
    await screen.findByText('Could not load findings.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps analysis and drafting blocked until the Inspector accepts the evidence set', async () => {
    mocks.evidenceQuery = {
      data: [{ id: 'evidence-1', fileName: 'span.png', contentType: 'image/png', sizeBytes: 8, checksumSha256: 'abcdef1234567890' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = render(<InspectionsPage />);
    openInspection();
    await screen.findByText('Evidence quality decision');

    const analyze = screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement;
    const draft = screen.getByRole('button', {
      name: 'Generate report draft',
    }) as HTMLButtonElement;
    expect(analyze.disabled).toBe(true);
    expect(draft.disabled).toBe(true);
    expect(
      screen.getByText(/Accept the evidence set before running advisory detection/),
    ).toBeTruthy();

    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    rerender(<InspectionsPage />);

    expect(
      (screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('requires a stated limitation before a limited decision can be sent', async () => {
    mocks.evidenceQuery = {
      data: [{ id: 'evidence-1', fileName: 'span.png', contentType: 'image/png', sizeBytes: 8, checksumSha256: 'abcdef1234567890' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    render(<InspectionsPage />);
    openInspection();
    await screen.findByText('Evidence quality decision');

    const limited = screen.getByRole('button', {
      name: 'Accept with limitation',
    }) as HTMLButtonElement;
    expect(limited.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Limitation or reason/), {
      target: { value: 'The east face was not observed' },
    });
    fireEvent.click(limited);

    expect(mocks.decideQuality.mutate).toHaveBeenCalledWith({
      decision: 'LIMITED',
      limitationReason: 'The east face was not observed',
    });
  });

  it('lets the author save a structured manual draft once the evidence is accepted', async () => {
    mocks.evidenceQuery = {
      data: [{ id: 'evidence-1', fileName: 'span.png', contentType: 'image/png', sizeBytes: 8, checksumSha256: 'abcdef1234567890' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    render(<InspectionsPage />);
    openInspection();
    await screen.findByText('Author the draft yourself');

    const save = screen.getByRole('button', { name: 'Save structured draft' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Narrative'), {
      target: { value: 'The north span was surveyed from both walkways.' },
    });
    fireEvent.change(screen.getByLabelText('Omitted analysis disclosure'), {
      target: { value: 'Automated detection was not run.' },
    });
    fireEvent.click(save);

    expect(mocks.authorManualDraft.mutate).toHaveBeenCalledWith({
      narrative: 'The north span was surveyed from both walkways.',
      omissionDisclosure: 'Automated detection was not run.',
    });
  });
});
