import { AxiosError } from 'axios';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const baseProposal: Proposal = {
  id: 'p1',
  assetId: 'a1',
  checklistTemplateId: 'c1',
  frequencyUnit: 'MONTH',
  frequencyInterval: 3,
  status: 'MANAGER_APPROVED',
  managerNote: 'Standard',
};

let proposals: Proposal[] = [baseProposal];
let selectState: { isError: boolean; error: unknown; isPending: boolean } = {
  isError: false,
  error: null,
  isPending: false,
};
const select = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ assetId: 'a1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/useProposals', () => ({
  useProposals: () => ({ data: proposals, isLoading: false }),
  useSelectProposal: () => ({
    mutate: select,
    isError: selectState.isError,
    error: selectState.error,
    isPending: selectState.isPending,
  }),
}));

import ScheduleProposalsPage from './ScheduleProposalsPage';

describe('ScheduleProposalsPage selection outcomes', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    proposals = [baseProposal];
    selectState = { isError: false, error: null, isPending: false };
  });

  it('renders a 409 as a business-rule conflict, not a generic failure', () => {
    selectState = {
      isError: true,
      isPending: false,
      error: problemError(409, 'Asset already has an active schedule', 'INVALID_STATE'),
    };

    render(<ScheduleProposalsPage />);

    // the server's reason is shown as-is, with no client heading that could contradict it
    const alert = screen.getByTestId('schedule-conflict');
    expect(alert.textContent).toBe('Asset already has an active schedule');
    expect(alert.textContent).not.toContain('This asset already has an active schedule');
  });

  it('offers Select only on an approved row, which is the only status the client list returns', () => {
    // listForClient filters on MANAGER_APPROVED, so a CLIENT caller receives only that status.
    // Every row is therefore offered the action, and the gate never hides one.
    proposals = [baseProposal, { ...baseProposal, id: 'p2', frequencyInterval: 6 }];

    render(<ScheduleProposalsPage />);

    const buttons = screen.getAllByRole('button', { name: 'Select' });
    expect(buttons).toHaveLength(2);
    buttons[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(select).toHaveBeenCalledWith('p1');
  });

  it('does not offer Select on a status the server would refuse, even if a stale view showed it', () => {
    // clientSelect permits MANAGER_APPROVED only. Offering the action on CLIENT_SELECTED would let
    // a stale view reach the server's unhandled IllegalStateException (a 500), so it stays hidden.
    proposals = [
      baseProposal,
      { ...baseProposal, id: 'p2', status: 'CLIENT_SELECTED' },
      { ...baseProposal, id: 'p3', status: 'SUPERSEDED' },
      { ...baseProposal, id: 'p4', status: 'GENERATED' },
      { ...baseProposal, id: 'p5', status: 'MANAGER_REJECTED' },
    ];

    render(<ScheduleProposalsPage />);

    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(1);
  });

  it('adds no selected marker of its own for a selected-looking row', () => {
    // listForClient filters on MANAGER_APPROVED, so a CLIENT_SELECTED row cannot reach this page;
    // it appears here only as a stale view. The row keeps the server's own status chip and offers
    // no selection affordance — the page does not add a client-side claim about a selection the
    // client-facing contract never reports.
    proposals = [
      { ...baseProposal, id: 'p1', status: 'CLIENT_SELECTED' },
      baseProposal,
    ];

    render(<ScheduleProposalsPage />);

    expect(screen.getByText('CLIENT_SELECTED')).not.toBeNull();
    expect(screen.queryByTestId('selected-proposal')).toBeNull();
  });
});
