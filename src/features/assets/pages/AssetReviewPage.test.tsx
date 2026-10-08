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
import { useAuthStore } from '@/features/auth/store/authStore';

describe('AssetReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'mgr-1',
        email: 'mgr@example.com',
        fullName: 'Mgr',
        roles: ['ORG_ADMIN'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
  });

  it('lists pending assets and approves one', () => {
    render(<AssetReviewPage />);

    screen.getByText('North bridge (BR-1)');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(review.mock.calls[0]![0]).toEqual({ id: 'a1', input: { action: 'APPROVE' } });
  });

  it('disables review actions when the user lacks the assets.review capability', () => {
    useAuthStore.setState({
      user: {
        id: 'insp-1',
        email: 'insp@example.com',
        fullName: 'Ins',
        roles: ['INSPECTOR'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });

    render(<AssetReviewPage />);

    const allApprove = screen.getAllByRole('button', { name: 'Approve' });
    const allReject = screen.getAllByRole('button', { name: 'Reject' });
    expect(allApprove.length).toBeGreaterThan(0);
    for (const btn of allApprove) expect((btn as HTMLButtonElement).disabled).toBe(true);
    for (const btn of allReject) expect((btn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(allApprove[0]!);
    expect(review).not.toHaveBeenCalled();
  });
});
