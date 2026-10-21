import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/shared/ui/Toast';
import { inspectionApi } from '../api/inspectionApi';
import { inspectionKeys } from './useInspections';
import {
  useAnalyzeEvidence,
  useBulkRetireEvidence,
  useConfirmFindings,
  useCreateManualFinding,
  useDecideEvidenceQuality,
  useDeleteFinding,
  useRetireEvidence,
  useConfirmFinding,
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
      decideEvidenceQuality: vi.fn(),
      confirmFindings: vi.fn(),
      submitVersion: vi.fn(),
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
    const statusKey = [...inspectionKeys.findings('inspection-1'), 'analysis-status'];
    client.setQueryData(statusKey, []);
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
    expect(client.getQueryState(statusKey)?.isInvalidated).toBe(true);
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
        (runner.mutateAsync as (input: { evidenceId: string; reason: string }) => Promise<unknown>)({
          evidenceId: 'evidence-1',
          reason: 'blurred',
        }),
      successMessage: 'Evidence retired and retained for audit.',
    },
    {
      name: 'bulk retirement',
      apiMock: vi.mocked(inspectionApi.bulkRetireEvidence),
      apiResult: [{ id: 'evidence-1', fileName: 'defect-01.jpg', retiredAt: '2026-10-19T00:00:00Z' }],
      render: (client) => renderMutation(client, () => useBulkRetireEvidence('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            evidenceIds: string[];
            reason: string;
          }) => Promise<unknown>
        )({ evidenceIds: ['evidence-1'], reason: 'blurred' }),
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
            recommendedAction: string;
          }) => Promise<unknown>
        )({
          evidenceId: 'evidence-1',
          defectLabel: 'Crack',
          severity: 'HIGH',
          technicalNotes: 'notes',
          recommendedAction: 'repair',
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
        (runner.mutateAsync as (input: { findingId: string; reason: string }) => Promise<unknown>)({
          findingId: 'finding-1',
          reason: 'duplicate',
        }),
      successMessage: 'Finding removed from the confirmed set.',
    },
    {
      name: 'evidence quality decision',
      apiMock: vi.mocked(inspectionApi.decideEvidenceQuality),
      render: (client) => renderMutation(client, () => useDecideEvidenceQuality('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            decision: string;
            shotListComparison: string;
          }) => Promise<unknown>
        )({ decision: 'ACCEPTED', shotListComparison: 'complete' }),
      successMessage: 'Evidence quality accepted; the set is ready for detection.',
    },
    {
      name: 'additional-session quality decision',
      apiMock: vi.mocked(inspectionApi.decideEvidenceQuality),
      render: (client) => renderMutation(client, () => useDecideEvidenceQuality('inspection-1')),
      run: (runner) =>
        (
          runner.mutateAsync as (input: {
            decision: string;
            shotListComparison: string;
            limitationReason: string;
          }) => Promise<unknown>
        )({
          decision: 'ADDITIONAL_SESSION_REQUIRED',
          shotListComparison: 'east face not captured',
          limitationReason: 'access unavailable',
        }),
      successMessage:
        'Additional field work requested. Update preparation and wait for readiness review.',
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
      successMessage: 'Report submitted for Organization Admin review.',
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
