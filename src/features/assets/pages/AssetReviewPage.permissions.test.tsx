import { AxiosError } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Proposal } from '../api/proposalApi';

function problemError(status: number, detail: string, code: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { type: 'about:blank', title: 'Error', status, detail, code },
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

const forbidden = () =>
  problemError(403, 'Only an active Service Manager may review assets', 'FORBIDDEN');

const proposal: Proposal = {
  id: 'p1',
  assetId: 'a1',
  checklistTemplateId: 'c1',
  frequencyUnit: 'MONTH',
  frequencyInterval: 3,
  status: 'GENERATED',
  managerNote: null,
};

// vi.hoisted: mock factories are evaluated while this module's imports are resolved, which happens
// before the plain top-level bindings below would be initialised.
const state = vi.hoisted(() => ({
  reviewState: { isError: false, error: null as unknown },
  proposalReviewState: { isError: false, error: null as unknown },
  proposals: [] as Proposal[],
  review: vi.fn(),
  reviewProposal: vi.fn(),
}));

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
  useReviewAsset: () => ({
    mutate: state.review,
    isPending: false,
    isError: state.reviewState.isError,
    error: state.reviewState.error,
  }),
}));

vi.mock('../hooks/useProposals', () => ({
  useProposals: () => ({ data: state.proposals, isLoading: false }),
  useReviewProposal: () => ({
    mutate: state.reviewProposal,
    isPending: false,
    isError: state.proposalReviewState.isError,
    error: state.proposalReviewState.error,
  }),
}));

import AssetReviewPage from './AssetReviewPage';

/** The proposal queue is only shown for an asset id entered in the manager field. */
function renderWithProposalQueue() {
  render(<AssetReviewPage />);
  fireEvent.change(screen.getByLabelText('Approved asset id'), { target: { value: 'a1' } });
}

describe('AssetReviewPage review denial', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    state.reviewState = { isError: false, error: null };
    state.proposalReviewState = { isError: false, error: null };
    state.proposals = [];
  });

  it('renders a 403 review denial as a permissions outcome, not a generic failure', () => {
    state.reviewState = { isError: true, error: forbidden() };

    render(<AssetReviewPage />);

    const alert = screen.getByTestId('permission-denied');
    expect(alert.textContent).toContain('Permission required');
    // the server's own reason is shown, not a client-invented one
    expect(alert.textContent).toContain('Only an active Service Manager may review assets');
    expect(screen.queryByText('Could not record the review decision.')).toBeNull();
  });

  it('still lists the pending queue when the denial is a permissions outcome', () => {
    state.reviewState = { isError: true, error: forbidden() };

    render(<AssetReviewPage />);

    // a denial mutates nothing server-side, so the queue must stay on screen
    expect(screen.getByText('North bridge (BR-1)')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThan(0);
    expect(state.review).not.toHaveBeenCalled();
  });

  it('renders a 403 proposal-review denial as a permissions outcome too', () => {
    // ScheduleProposalService.review re-authorizes exactly as asset review does, so this surface can
    // answer 403 as well and must not report a permissions decision as a generic failure.
    state.proposals = [proposal];
    state.proposalReviewState = {
      isError: true,
      error: problemError(403, 'Only an active Service Manager may review proposals', 'FORBIDDEN'),
    };

    renderWithProposalQueue();

    const alert = screen.getByTestId('permission-denied');
    expect(alert.textContent).toContain('Permission required');
    expect(alert.textContent).toContain('Only an active Service Manager may review proposals');
    // a denial mutates nothing, so the proposal queue survives it
    expect(screen.getByText('MONTH · 3')).not.toBeNull();
  });

  it('keeps a non-permission proposal-review failure as a generic error', () => {
    state.proposals = [proposal];
    state.proposalReviewState = {
      isError: true,
      error: problemError(409, 'Proposal is already decided', 'INVALID_STATE'),
    };

    renderWithProposalQueue();

    expect(screen.queryByTestId('permission-denied')).toBeNull();
    expect(screen.getByText('Proposal is already decided')).not.toBeNull();
  });
});
