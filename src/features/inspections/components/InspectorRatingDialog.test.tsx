import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorRatingPromptCard } from './InspectorRatingDialog';

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
});
