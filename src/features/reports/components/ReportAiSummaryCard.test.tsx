import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { ReportAiSummaryCard } from './ReportAiSummaryCard';

const mocks = vi.hoisted(() => ({
  knowledgeData: {
    retrievalMode: 'HYBRID_MATCH',
    cases: [
      {
        id: 'case-1',
        defectLabel: 'Deck spall',
        severity: 'HIGH',
        assetCategory: 'BRIDGE',
        assetLabel: 'North span',
        sameAsset: true,
        sameOrganization: false,
        similarity: 0.9,
        technicalNotes: 'Patched with structural repair mortar after cleaning.',
        outcome: 'RESOLVED',
        publishedAt: '2026-01-02T00:00:00Z',
      },
    ],
    guidelines: [
      {
        id: 'guide-1',
        standardCode: 'TCVN 9343:2012',
        title: 'Repair of concrete defects',
        severity: 'HIGH',
        similarity: 0.8,
        guidance: 'Remove unsound concrete and restore the protective cover.',
        referenceUrl: null,
      },
    ],
  },
  knowledgeLoading: false,
  remoteSummary: {
    summary: 'Visual inspection found one confirmed defect.',
    keyHighlights: ['Deck spall'],
    recommendedActions: 'Patch the affected area.',
    overallRisk: 'HIGH',
    knowledgeReferences: [
      { kind: 'CASE', codeOrLabel: 'Deck spall', summary: 'Similar deck spall resolved' },
      { kind: 'GUIDELINE', codeOrLabel: 'TCVN 9343:2012', summary: 'Concrete repair standard' },
    ],
  },
}));

/** The footer query is mocked so rendering never needs a QueryClient provider. */
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspectionKnowledgeRecommendations: () => ({
    data: mocks.knowledgeData,
    isLoading: mocks.knowledgeLoading,
  }),
}));

vi.mock('@/features/inspections/api/inspectionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/inspections/api/inspectionApi')>();
  return {
    ...actual,
    inspectionApi: {
      ...actual.inspectionApi,
      getAiSummary: vi.fn(),
    },
  };
});

beforeEach(() => {
  cleanup();
  mocks.knowledgeLoading = false;
  vi.mocked(inspectionApi.getAiSummary).mockResolvedValue(mocks.remoteSummary as never);
});

afterEach(() => cleanup());

describe('ReportAiSummaryCard matched knowledge footer', () => {
  it('shows crisp pill chips and reveals case/standard rows only on demand', async () => {
    render(<ReportAiSummaryCard inspectionId="i1" versionId="v1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    await screen.findByText('Visual inspection found one confirmed defect.');

    const bar = await screen.findByTestId('matched-knowledge-bar');
    expect(screen.getByText('Matched Cases & Standards')).toBeTruthy();
    expect(screen.getByText('TCVN 9343:2012')).toBeTruthy();
    expect(screen.getByText('2 similar cases')).toBeTruthy();
    expect(screen.queryByTestId('knowledge-recommendation-panel')).toBeNull();

    fireEvent.click(bar);

    expect(await screen.findByTestId('knowledge-recommendation-panel')).toBeTruthy();
    expect(screen.getAllByTestId('knowledge-case-row')).toHaveLength(1);
    expect(screen.getAllByTestId('knowledge-guideline-row')).toHaveLength(1);
  });

  it('renders the summary header and knowledge footer without sparkle icons', async () => {
    render(<ReportAiSummaryCard inspectionId="i1" versionId="v1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    await screen.findByText('Visual inspection found one confirmed defect.');

    const sparkle = ['Auto', 'Awesome'].join('');
    expect(screen.getByText('AI Executive Summary')).toBeTruthy();
    expect(screen.queryByTestId(`${sparkle}RoundedIcon`)).toBeNull();
  });

  it('hides the footer cleanly for a preview version with no persisted source', async () => {
    render(<ReportAiSummaryCard inspectionId="i1" versionId="preview-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));

    expect(screen.queryByTestId('matched-knowledge-bar')).toBeNull();
  });

  it('hides the footer when the recommendations endpoint is unavailable', async () => {
    const api = inspectionApi as unknown as Record<string, unknown>;
    const original = api.getInspectionKnowledgeRecommendations;
    api.getInspectionKnowledgeRecommendations = undefined;
    try {
      render(<ReportAiSummaryCard inspectionId="i1" versionId="v1" />);

      fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
      await screen.findByText('Visual inspection found one confirmed defect.');

      expect(screen.queryByTestId('matched-knowledge-bar')).toBeNull();
    } finally {
      api.getInspectionKnowledgeRecommendations = original;
    }
  });
});
