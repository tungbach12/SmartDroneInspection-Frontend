import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Role, useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  listQuery: {
    data: undefined as
      | { items: unknown[]; page: number; pageSize: number; totalCount: number; totalPages: number }
      | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  evidenceQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  candidateQuery: { data: [] as unknown[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
  qualityQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  upload: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  decideQuality: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  analyze: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  authorManualDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspections: () => mocks.listQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useFindingCandidates: () => mocks.candidateQuery,
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useDecideEvidenceQuality: () => mocks.decideQuality,
  useUploadInspectionEvidence: () => mocks.upload,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
}));

import InspectionsPage from './InspectionsPage';

function listedInspection() {
  return {
    id: 'inspection-1',
    organizationId: 'org-1',
    assetId: 'asset-1',
    inspectorId: 'inspector-1',
    objective: 'Inspect the main span',
    status: 'FIELD_COMPLETED',
    plannedStartAt: null,
    plannedEndAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
  };
}

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'user@example.test',
      fullName: 'User',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

function signInAsInspector() {
  signInAs(['INSPECTOR']);
}

/** Opens the MF3 workspace by choosing a row, replacing the retired identifier input. */
function openInspection() {
  fireEvent.click(screen.getByRole('row', { name: /Inspect the main span/ }));
}

describe('InspectionsPage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.listQuery = {
      data: {
        items: [listedInspection()],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.upload.isError = false;
    mocks.upload.error = null;
  });

  afterEach(() => useAuthStore.getState().clearSession());

  it('opens an inspection from the list and retries an evidence upload with the retained file', async () => {
    const { container, rerender } = render(<InspectionsPage />);
    openInspection();

    await screen.findByRole('heading', { name: 'Evidence' });
    expect(screen.queryByText('Checklist')).toBeNull();
    expect(screen.getByText(/checklist execution and inspection start belong to MF1\/MF2/i)).toBeTruthy();
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

  it('lists the inspections the backend returns and requires no typed identifier', async () => {
    render(<InspectionsPage />);

    expect(await screen.findByRole('row', { name: /Inspect the main span/ })).toBeTruthy();
    expect(screen.getByText('FIELD_COMPLETED')).toBeTruthy();
    // The retired identifier field is gone; rows replace it.
    expect(screen.queryByLabelText('Inspection ID')).toBeNull();
    expect(screen.getByText('No inspection selected')).toBeTruthy();
  });

  it('says so plainly when the caller has no inspections in scope', () => {
    mocks.listQuery = {
      data: { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    render(<InspectionsPage />);

    expect(screen.getByText('No inspections available')).toBeTruthy();
  });

  it('offers retry when the list cannot be loaded', async () => {
    const refetch = vi.fn();
    mocks.listQuery = { data: undefined, isLoading: false, error: new Error('boom'), refetch };

    render(<InspectionsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('lets an organization admin browse the list without the Inspector workspace', async () => {
    signInAs(['ORG_ADMIN']);

    render(<InspectionsPage />);

    expect(await screen.findByRole('row', { name: /Inspect the main span/ })).toBeTruthy();

    // Choosing a row must not open the Inspector-only evidence workspace.
    openInspection();
    expect(screen.queryByRole('heading', { name: 'Evidence' })).toBeNull();
    expect(screen.getByText(/You are viewing this inspection as a reader/)).toBeTruthy();
  });

  it('tells a maintenance engineer where to look instead', async () => {
    signInAs(['MAINTENANCE_ENGINEER']);

    render(<InspectionsPage />);

    expect(await screen.findByText(/available to Inspectors, organization administrators/)).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Inspect the main span/ })).toBeNull();
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
