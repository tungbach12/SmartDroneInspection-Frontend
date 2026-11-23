import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorRatingPromptCard, InspectorRatingsBreakdownPanel } from './InspectorRatingDialog';

const mocks = vi.hoisted(() => ({
  getInspectionRatings: vi.fn(),
  upsertInspectionRating: vi.fn(),
}));

vi.mock('../api/ratingApi', () => ({
  ratingApi: {
    getInspectionRatings: mocks.getInspectionRatings,
    upsertInspectionRating: mocks.upsertInspectionRating,
    getInspectorRatings: vi.fn(),
    getMyRatings: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('InspectorRatingPromptCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Rate Inspector action and submits customer criteria score', async () => {
    mocks.getInspectionRatings.mockResolvedValue({
      inspectionId: 'insp-1',
      inspectorId: 'u-insp',
      inspectorName: 'Phạm Văn Bay',
      inspectorAvatarUrl: null,
      canRate: true,
      ineligibleReason: null,
      actorRole: 'CUSTOMER',
      expectedCriteriaKeys: ['evidenceQuality', 'communication', 'professionalism'],
      editableUntil: null,
      myRating: null,
      customerRating: null,
      managerRating: null,
      inspectorAverageRating: 4.5,
      inspectorRatingCount: 2,
    });
    mocks.upsertInspectionRating.mockResolvedValue({
      inspectionId: 'insp-1',
      inspectorId: 'u-insp',
      inspectorName: 'Phạm Văn Bay',
      inspectorAvatarUrl: null,
      canRate: true,
      ineligibleReason: null,
      actorRole: 'CUSTOMER',
      expectedCriteriaKeys: ['evidenceQuality', 'communication', 'professionalism'],
      editableUntil: new Date(Date.now() + 5 * 86400_000).toISOString(),
      myRating: {
        id: 'r-1',
        inspectionId: 'insp-1',
        inspectorId: 'u-insp',
        raterUserId: 'u-cust',
        raterName: 'Customer',
        raterAvatarUrl: null,
        raterRole: 'CUSTOMER',
        assetName: 'Bridge',
        assetPhotoDocumentId: null,
        overallScore: 5,
        criterionScores: { evidenceQuality: 5, communication: 5, professionalism: 5 },
        comment: 'Clean work',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editableUntil: new Date(Date.now() + 5 * 86400_000).toISOString(),
        editable: true,
      },
      customerRating: null,
      managerRating: null,
      inspectorAverageRating: 4.7,
      inspectorRatingCount: 3,
    });

    renderWithClient(<InspectorRatingPromptCard inspectionId="insp-1" />);

    expect(await screen.findByText('Phạm Văn Bay')).toBeTruthy();
    expect(screen.getByText('4.5 (2)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Rate Inspector' }));
    fireEvent.change(await screen.findByLabelText(/Comment/), {
      target: { value: 'Clean work' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    await waitFor(() =>
      expect(mocks.upsertInspectionRating).toHaveBeenCalledWith('insp-1', {
        overallScore: 5,
        criterionScores: { evidenceQuality: 5, communication: 5, professionalism: 5 },
        comment: 'Clean work',
      }),
    );
  });

  it('opens rating detail dialog when clicking a review card', async () => {
    const onNavigate = vi.fn();
    renderWithClient(
      <InspectorRatingsBreakdownPanel
        portalBase="/operations"
        onNavigate={onNavigate}
        profile={{
          historyVisible: true,
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          summary: {
            inspectorId: 'u-insp',
            averageRating: 5,
            ratingCount: 1,
            customerAverageRating: 5,
            customerRatingCount: 1,
            managerAverageRating: null,
            managerRatingCount: 0,
            starDistribution: { '5': 1 },
            customerCriteriaAverages: { evidenceQuality: 5 },
            managerCriteriaAverages: {},
          },
          ratings: [
            {
              id: 'r-1',
              inspectionId: 'insp-42',
              inspectorId: 'u-insp',
              raterUserId: 'u-cust',
              raterName: 'Customer Alpha',
              raterAvatarUrl: 'data:image/png;base64,iVBORw0KGgo=',
              raterRole: 'CUSTOMER',
              assetName: 'Bitexco Tower',
              assetPhotoDocumentId: null,
              overallScore: 5,
              criterionScores: { evidenceQuality: 5, communication: 5, professionalism: 5 },
              comment: 'Sharp facade photos.',
              createdAt: '2026-11-23T10:00:00Z',
              updatedAt: '2026-11-23T10:00:00Z',
              editableUntil: '2026-11-30T10:00:00Z',
              editable: true,
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByText('Customer Alpha'));
    expect(await screen.findByRole('button', { name: 'Open inspection' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open inspection' }));
    expect(onNavigate).toHaveBeenCalledWith('/operations/inspections/insp-42/report');
  });
});
