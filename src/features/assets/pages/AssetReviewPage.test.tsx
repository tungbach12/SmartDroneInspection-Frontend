import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const review = vi.fn();

vi.mock('../hooks/useAssets', () => ({
  usePendingReviewAssets: () => ({
    data: {
      items: [
        {
          id: 'a1',
          code: 'BR-1',
          name: 'North bridge',
          description: null,
          locationText: 'District 1',
          latitude: null,
          longitude: null,
          status: 'PENDING_REVIEW',
          categoryId: 'c1',
          createdAt: '2026-09-25T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useReviewAsset: () => ({ mutate: review, isPending: false }),
}));

vi.mock('../hooks/useProposals', () => ({
  useProposals: () => ({ data: [], isLoading: false }),
  useReviewProposal: () => ({ mutate: vi.fn(), isPending: false }),
}));

import AssetReviewPage from './AssetReviewPage';

describe('AssetReviewPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists pending assets and approves one', () => {
    render(<AssetReviewPage />);

    screen.getByText('North bridge (BR-1)');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(review.mock.calls[0]![0]).toEqual({ id: 'a1', input: { action: 'APPROVE' } });
  });
});
