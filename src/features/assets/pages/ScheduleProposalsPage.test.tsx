import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const select = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ assetId: 'a1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/useProposals', () => ({
  useProposals: () => ({
    data: [
      {
        id: 'p1',
        assetId: 'a1',
        checklistTemplateId: 'c1',
        frequencyUnit: 'MONTH',
        frequencyInterval: 3,
        status: 'MANAGER_APPROVED',
        managerNote: 'Standard',
      },
      {
        id: 'p2',
        assetId: 'a1',
        checklistTemplateId: 'c1',
        frequencyUnit: 'YEAR',
        frequencyInterval: 1,
        status: 'MANAGER_APPROVED',
        managerNote: null,
      },
    ],
    isLoading: false,
  }),
  useSelectProposal: () => ({ mutate: select, isPending: false }),
}));

import ScheduleProposalsPage from './ScheduleProposalsPage';

describe('ScheduleProposalsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists every approved option and selects the chosen one', () => {
    render(<ScheduleProposalsPage />);

    screen.getByText('Every 3 months');
    screen.getByText('Every 1 year');
    screen.getByText('Standard');

    fireEvent.click(screen.getAllByRole('button', { name: 'Select' })[0]!);

    expect(select).toHaveBeenCalledWith('p1');
  });
});
