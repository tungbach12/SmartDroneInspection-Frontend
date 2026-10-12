import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';

const mocks = vi.hoisted(() => ({
  evidenceQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  candidateQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  qualityQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  preparationsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  upload: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  decideQuality: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  analyze: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  review: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  manual: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  authorManualDraft: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionEvidence: () => mocks.evidenceQuery,
  useFindingCandidates: () => mocks.candidateQuery,
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useInspectionPreparations: () => mocks.preparationsQuery,
  useUploadInspectionEvidence: () => mocks.upload,
  useDecideEvidenceQuality: () => mocks.decideQuality,
  useAnalyzeEvidence: () => mocks.analyze,
  useReviewFindingCandidate: () => mocks.review,
  useCreateManualFinding: () => mocks.manual,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
}));

// MF2 panels are covered by their own suites; the workspace only composes them.
vi.mock('../pages/InspectionPreparationPanel', () => ({
  default: () => <div data-testid="preparation-panel" />,
}));
vi.mock('../pages/ReadinessReviewPanel', () => ({
  default: () => <div data-testid="readiness-panel" />,
}));

import { InspectorWorkspace } from './InspectorWorkspace';

const INSPECTION_ID = 'inspection-1';

function imageEvidence() {
  return {
    id: 'evidence-1',
    fileName: 'span.png',
    contentType: 'image/png',
    sizeBytes: 8,
    checksumSha256: 'abcdef1234567890',
  };
}

function accepted() {
  return [
    { id: 'decision-1', inspectionId: INSPECTION_ID, decision: 'ACCEPTED' },
  ];
}

function renderWorkspace(isInspector = true) {
  return renderWithRouter(
    <InspectorWorkspace inspectionId={INSPECTION_ID} isInspector={isInspector} />,
  );
}

/** MF3-03 makes the comparison a required input, so every decision path starts here. */
function writeComparison(text = 'Span P4 covered; east face not observed.') {
  fireEvent.change(screen.getByLabelText(/shot-list comparison/i), {
    target: { value: text },
  });
}

describe('InspectorWorkspace', () => {
  beforeEach(() => {
    cleanup();
    Object.values(mocks).forEach((value) => {
      if ('mutate' in value && typeof value.mutate === 'function') value.mutate.mockReset();
    });
    mocks.evidenceQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.candidateQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.preparationsQuery = {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.upload.isError = false;
    mocks.upload.error = null;
  });

  afterEach(() => cleanup());

  it('hands a chosen file to MF3-01 intake and keeps the upload blocked until one is chosen', () => {
    renderWorkspace();

    const upload = screen.getByRole('button', { name: /upload evidence/i }) as HTMLButtonElement;
    expect(upload.disabled).toBe(true);

    const file = new File(['evidence'], 'span.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });

    expect(
      (screen.getByRole('button', { name: /upload evidence/i }) as HTMLButtonElement).disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /upload evidence/i }));
    expect(mocks.upload.mutate).toHaveBeenCalledWith(file, expect.any(Object));
  });

  it('refuses every quality decision until the Inspector records a shot-list comparison', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWorkspace();

    const accept = screen.getByRole('button', {
      name: 'Accept evidence set',
    }) as HTMLButtonElement;
    expect(accept.disabled).toBe(true);

    writeComparison();
    expect(
      (screen.getByRole('button', { name: 'Accept evidence set' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('sends the shot-list comparison and the limitation with the decision it belongs to', async () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWorkspace();

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

  it('requires a stated limitation before a limited decision can be sent', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWorkspace();

    const limited = screen.getByRole('button', {
      name: 'Accept with limitation',
    }) as HTMLButtonElement;
    writeComparison();
    expect(limited.disabled).toBe(true);
  });

  it('offers no detection before the evidence set is accepted', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    renderWorkspace();

    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(
      screen.getByText(/Detection starts after an accepted evidence quality decision/),
    ).toBeTruthy();
  });

  it('keeps LIMITED ineligible for detection and drafting, matching the backend gate', () => {
    mocks.evidenceQuery = { data: [imageEvidence()], isLoading: false, error: null, refetch: vi.fn() };
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: INSPECTION_ID, decision: 'LIMITED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWorkspace();

    // EvidenceQualityDecision.isAccepted admits ACCEPTED alone, so LIMITED stays blocked here
    // rather than enabling a control the server then refuses with 409.
    expect(screen.queryByRole('button', { name: 'Analyze' })).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('runs detection automatically once accepted, and only for image evidence', async () => {
    mocks.evidenceQuery = {
      data: [imageEvidence(), { id: 'evidence-2', fileName: 'permit.pdf', contentType: 'application/pdf', sizeBytes: 8, checksumSha256: 'abcdef1234567891' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWorkspace();

    await waitFor(() => expect(mocks.analyze.mutate).toHaveBeenCalledWith('evidence-1'));
    expect(mocks.analyze.mutate).not.toHaveBeenCalledWith('evidence-2');
    expect(mocks.analyze.mutate).toHaveBeenCalledTimes(1);
  });

  it('leaves opening the report document to the page, which owns that single affordance', () => {
    mocks.qualityQuery = { data: accepted(), isLoading: false, error: null, refetch: vi.fn() };

    renderWorkspace();

    // The detail page's Report summary card carries the one "Open report document" button. A
    // second copy here would put the same action twice on one screen.
    expect(screen.queryByRole('button', { name: /open report document/i })).toBeNull();
  });

  it('shows a reader the reason they cannot decide instead of the workflow', () => {
    renderWorkspace(false);

    expect(screen.getByText(/you are viewing this inspection as a reader/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept evidence set' })).toBeNull();
  });
});
