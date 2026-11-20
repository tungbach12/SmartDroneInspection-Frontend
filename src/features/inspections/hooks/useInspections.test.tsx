import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/shared/ui/Toast';
import { inspectionApi } from '../api/inspectionApi';
import {
  useAnalyzeEvidence,
  useBulkRetireEvidence,
  useConfirmFindings,
  useCreateManualFinding,
  useDeleteFinding,
  useFindingRecommendations,
  useInspectionKnowledgeRecommendations,
  useUploadFlightPermit,
  useRetireEvidence,
  useConfirmFinding,
  useDraftAllFindingNotes,
  useDraftFindingNote,
  useSubmitReportVersion,
  useUpdateEvidenceLocation,
  useUpdateFinding,
} from './useInspections';

vi.mock('../api/inspectionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/inspectionApi')>();
  return {
    ...actual,
    inspectionApi: {
      ...actual.inspectionApi,
      analyzeEvidence: vi.fn(),
      retireEvidence: vi.fn(),
      bulkRetireEvidence: vi.fn(),
      updateEvidenceLocation: vi.fn(),
      confirmFinding: vi.fn(),
      createManualFinding: vi.fn(),
      updateFinding: vi.fn(),
      deleteFinding: vi.fn(),
      uploadFlightPermit: vi.fn(),
      reviewFlightPermit: vi.fn(),
      confirmFindings: vi.fn(),
      submitVersion: vi.fn(),
      getFindingRecommendations: vi.fn(),
      getInspectionKnowledgeRecommendations: vi.fn(),
      draftFindingNote: vi.fn(),
    },
  };
});

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** The mutation hooks differ only in their input type; each case casts at its call site. */
interface MutationRunner {
  mutateAsync: (input: never) => Promise<unknown>;
}

function renderMutation(client: QueryClient, useHook: () => MutationRunner): MutationRunner {
  return renderHook(useHook, { wrapper: wrapper(client) }).result.current;
}

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ open: false, message: '', severity: 'success' });
});

describe('useAnalyzeEvidence', () => {
  it('notifies when a completed analysis returns no detections', async () => {
    const client = createClient();
    vi.mocked(inspectionApi.analyzeEvidence).mockResolvedValue([]);
    const { result } = renderHook(() => useAnalyzeEvidence('inspection-1'), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.analyzeMany(['evidence-1']);
    });

    expect(useToastStore.getState()).toMatchObject({
      open: true,
      message: 'Analysis completed; no defects were detected in this image.',
      severity: 'info',
    });
    expect(result.current.completedIds).toEqual(['evidence-1']);
    expect(result.current.noDetectionIds).toEqual(['evidence-1']);
  });

  it('shows an error notification when analysis fails', async () => {
    const client = createClient();
    vi.mocked(inspectionApi.analyzeEvidence).mockRejectedValue(new Error('Detector unavailable'));
    const { result } = renderHook(() => useAnalyzeEvidence('inspection-1'), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.analyzeMany(['evidence-1']);
    });

    expect(useToastStore.getState()).toMatchObject({
      open: true,
      message: 'Detector unavailable',
      severity: 'error',
    });
  });
});

/**
 * Every Findings/Evidence mutation reports its outcome through the shared toast host, so a
 * decision that reaches the server is never silent. A failure keeps its inline alert detail and
 * also surfaces the message here.
 */
interface MutationCase {
  name: string;
  apiMock: ReturnType<typeof vi.fn>;
  /** Value the API returns on success; the toast may depend on it. */
  apiResult?: unknown;
  render: (client: QueryClient) => MutationRunner;
  run: (runner: MutationRunner) => Promise<unknown>;
  successMessage: string;
}

function buildCases(): MutationCase[] {
  return [
    {
      name: 'evidence retirement',
      apiMock: vi.mocked(inspectionApi.retireEvidence),
      render: (client) => renderMutation(client, () => useRetireEvidence('inspection-1')),
      run: (runner) =>
        (runner.mutateAsync as (evidenceId: string) => Promise<unknown>)('evidence-1'),
      successMessage: 'Evidence retired and retained for audit.',
    },
    {
      name: 'bulk retirement',
      apiMock: vi.mocked(inspectionApi.bulkRetireEvidence),
      apiResult: [{ id: 'evidence-1', fileName: 'defect-01.jpg', isDeleted: true }],
      render: (client) => renderMutation(client, () => useBulkRetireEvidence('inspection-1')),
      run: (runner) =>
        (runner.mutateAsync as (evidenceIds: string[]) => Promise<unknown>)(['evidence-1']),
      successMessage: 'Retired 1 capture(s); originals remain available for audit.',
    },
    {
      name: 'shared evidence location',
      apiMock: vi.mocked(inspectionApi.updateEvidenceLocation),
      render: (client) => renderMutation(client, () => useUpdateEvidenceLocation('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            evidenceId: string;
            locationDescription: string;
          }) => Promise<unknown>
        )({ evidenceId: 'evidence-1', locationDescription: 'Pier 2' }),
      successMessage: 'Shared evidence location saved.',
    },
    {
      name: 'finding confirmation',
      apiMock: vi.mocked(inspectionApi.confirmFinding),
      render: (client) => renderMutation(client, () => useConfirmFinding('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            findingId: string;
            input: { defectLabel: string; severity: string };
          }) => Promise<unknown>
        )({
          findingId: 'finding-1',
          input: { defectLabel: 'Crack', severity: 'HIGH' },
        }),
      successMessage: 'Finding confirmed.',
    },
    {
      name: 'manual finding creation',
      apiMock: vi.mocked(inspectionApi.createManualFinding),
      render: (client) => renderMutation(client, () => useCreateManualFinding('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            evidenceId: string;
            defectLabel: string;
            severity: string;
            technicalNotes: string;
          }) => Promise<unknown>
        )({
          evidenceId: 'evidence-1',
          defectLabel: 'Crack',
          severity: 'HIGH',
          technicalNotes: 'notes',
        }),
      successMessage: 'Manual finding added.',
    },
    {
      name: 'finding update',
      apiMock: vi.mocked(inspectionApi.updateFinding),
      render: (client) => renderMutation(client, () => useUpdateFinding('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            findingId: string;
            input: { defectLabel: string; severity: string };
          }) => Promise<unknown>
        )({ findingId: 'finding-1', input: { defectLabel: 'Crack', severity: 'HIGH' } }),
      successMessage: 'Finding updated.',
    },
    {
      name: 'finding removal',
      apiMock: vi.mocked(inspectionApi.deleteFinding),
      render: (client) => renderMutation(client, () => useDeleteFinding('inspection-1')),
      run: (runner) =>
        (runner.mutateAsync as (findingId: string) => Promise<unknown>)('finding-1'),
      successMessage: 'Finding removed from the confirmed set.',
    },
    {
      name: 'flight permit upload',
      apiMock: vi.mocked(inspectionApi.uploadFlightPermit),
      render: (client) => renderMutation(client, () => useUploadFlightPermit('inspection-1')),
      run: (runner) =>
        (runner.mutateAsync as (input: unknown) => Promise<unknown>)({
          file: new File(['test'], 'permit.pdf', { type: 'application/pdf' }),
          permitNumber: '184/GP-TC',
          issuingAuthority: 'Cục Tác chiến',
          validFrom: '2026-11-15T00:00:00Z',
          validTo: '2026-11-16T00:00:00Z',
        }),
      successMessage: 'Flight permit submitted for manager verification',
    },
    {
      name: 'findings confirmation',
      apiMock: vi.mocked(inspectionApi.confirmFindings),
      render: (client) => renderMutation(client, () => useConfirmFindings('inspection-1')),
      run: (runner) => (runner.mutateAsync as (input: boolean) => Promise<unknown>)(false),
      successMessage: 'Findings confirmed and locked for the report stage.',
    },
    {
      name: 'report submission',
      apiMock: vi.mocked(inspectionApi.submitVersion),
      render: (client) => renderMutation(client, () => useSubmitReportVersion('inspection-1')),
      run: (runner) => (runner.mutateAsync as (input: string) => Promise<unknown>)('version-1'),
      successMessage: 'Report submitted for Organization Manager review.',
    },
  ];
}

describe('inspection mutation outcome toasts', () => {
  it.each(buildCases())('reports the success of $name', async (testCase) => {
    const client = createClient();
    testCase.apiMock.mockResolvedValue(testCase.apiResult ?? []);
    const runner = testCase.render(client);

    await act(async () => {
      await testCase.run(runner);
    });

    expect(useToastStore.getState()).toMatchObject({
      open: true,
      message: testCase.successMessage,
      severity: 'success',
    });
  });

  it.each(buildCases())('reports the failure of $name', async (testCase) => {
    const client = createClient();
    testCase.apiMock.mockRejectedValue(new Error('Server rejected the change'));
    const runner = testCase.render(client);

    await act(async () => {
      await expect(testCase.run(runner)).rejects.toThrow('Server rejected the change');
    });

    expect(useToastStore.getState()).toMatchObject({
      open: true,
      message: 'Server rejected the change',
      severity: 'error',
    });
  });
});

describe('knowledge recommendation queries', () => {
  const response = {
    retrievalMode: 'HYBRID_MATCH',
    cases: [],
    guidelines: [],
  };

  it('fetches finding recommendations only when enabled and returns the response', async () => {
    const client = createClient();
    vi.mocked(inspectionApi.getFindingRecommendations).mockResolvedValue(response);

    const disabled = renderHook(
      () => useFindingRecommendations('inspection-1', 'finding-1', false),
      { wrapper: wrapper(client) },
    );
    expect(disabled.result.current.data).toBeUndefined();
    expect(inspectionApi.getFindingRecommendations).not.toHaveBeenCalled();

    const enabled = renderHook(
      () => useFindingRecommendations('inspection-1', 'finding-1', true),
      { wrapper: wrapper(client) },
    );
    await waitFor(() => expect(enabled.result.current.data).toEqual(response));
    expect(inspectionApi.getFindingRecommendations).toHaveBeenCalledWith(
      'inspection-1',
      'finding-1',
      3,
    );
  });

  it('fetches inspection recommendations with the report-level limit', async () => {
    const client = createClient();
    vi.mocked(inspectionApi.getInspectionKnowledgeRecommendations).mockResolvedValue(response);

    const { result } = renderHook(
      () => useInspectionKnowledgeRecommendations('inspection-1', true),
      { wrapper: wrapper(client) },
    );
    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(inspectionApi.getInspectionKnowledgeRecommendations).toHaveBeenCalledWith(
      'inspection-1',
      4,
    );
  });
});

describe('useDraftFindingNote', () => {
  it('sends the finding id, locale and existing note to the scoped backend endpoint', async () => {
    const client = createClient();
    const drafted = {
      note: 'AI-written note',
      mode: 'AI_VISION_RAG',
      retrievalMode: 'PGVECTOR_RAG',
      citedCases: [],
      citedGuidelines: [],
    };
    vi.mocked(inspectionApi.draftFindingNote).mockResolvedValue(drafted);

    const mutation = renderMutation(client, () => useDraftFindingNote('inspection-1'));
    const result = await mutation.mutateAsync({
      findingId: 'finding-1',
      locale: 'vi',
      existingNote: 'Old note',
    } as never);

    expect(result).toEqual(drafted);
    expect(inspectionApi.draftFindingNote).toHaveBeenCalledWith('inspection-1', 'finding-1', {
      locale: 'vi',
      existingNote: 'Old note',
    });
  });
});

describe('useDraftAllFindingNotes', () => {
  it('drafts and persists notes for every target finding and updates the findings cache', async () => {
    const client = createClient();
    const finding = {
      id: 'finding-1',
      inspectionId: 'inspection-1',
      evidenceId: 'evidence-1',
      status: 'PENDING' as const,
      findingCode: 'F-0001',
      defectLabel: 'Coating blistering',
      severity: 'HIGH' as const,
      technicalNotes: 'Old note',
      boundingBox: null,
      modelName: 'yolo11s',
      confidence: 0.85,
      isDeleted: false,
      createdAt: '2026-01-01T00:00:00Z',
    };
    client.setQueryData(['inspections', 'inspection-1', 'findings'], [finding]);
    const drafted = {
      note: 'AI-synthesized batch note.',
      mode: 'AI_VISION_RAG',
      retrievalMode: 'PGVECTOR_RAG',
      citedCases: [],
      citedGuidelines: [],
    };
    const updated = { ...finding, technicalNotes: 'AI-synthesized batch note.' };
    vi.mocked(inspectionApi.draftFindingNote).mockResolvedValue(drafted);
    vi.mocked(inspectionApi.updateFinding).mockResolvedValue(updated);

    const { result } = renderHook(() => useDraftAllFindingNotes('inspection-1'), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.draftMany([{ finding, existingNote: 'Old note' }], { locale: 'en' });
    });

    expect(inspectionApi.draftFindingNote).toHaveBeenCalledWith('inspection-1', 'finding-1', {
      locale: 'en',
      existingNote: 'Old note',
    });
    expect(inspectionApi.updateFinding).toHaveBeenCalledWith('inspection-1', 'finding-1', {
      evidenceId: 'evidence-1',
      defectLabel: 'Coating blistering',
      severity: 'HIGH',
      technicalNotes: 'AI-synthesized batch note.',
    });
    expect(result.current.draftedNotes['finding-1']).toEqual(drafted);
    expect(client.getQueryData(['inspections', 'inspection-1', 'findings'])).toEqual([updated]);
    expect(useToastStore.getState()).toMatchObject({
      open: true,
      message: 'Drafted notes for 1 finding(s).',
      severity: 'success',
    });
  });
});
