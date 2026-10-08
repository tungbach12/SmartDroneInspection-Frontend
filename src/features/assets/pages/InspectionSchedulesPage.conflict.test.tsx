import { AxiosError } from 'axios';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InspectionSchedule } from '../api/scheduleApi';

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

const pausedSchedule: InspectionSchedule = {
  id: 's1',
  assetId: 'a1',
  checklistTemplateId: 'c1',
  frequencyUnit: 'MONTH',
  frequencyInterval: 3,
  nextDueAt: '2026-12-01T00:00:00Z',
  status: 'PAUSED',
};

let schedules: InspectionSchedule[] = [pausedSchedule];
let toggleState: { isError: boolean; error: unknown; isPending: boolean } = {
  isError: false,
  error: null,
  isPending: false,
};
const toggle = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ assetId: 'a1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/useSchedules', () => ({
  useSchedules: () => ({ data: schedules, isLoading: false }),
  useToggleSchedule: () => ({
    mutate: toggle,
    isError: toggleState.isError,
    error: toggleState.error,
    isPending: toggleState.isPending,
  }),
}));

import InspectionSchedulesPage from './InspectionSchedulesPage';

describe('InspectionSchedulesPage activation conflict', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    schedules = [pausedSchedule];
    toggleState = { isError: false, error: null, isPending: false };
  });

  it('keeps every listed schedule and offers the untouched state change after a 409', () => {
    schedules = [
      pausedSchedule,
      { ...pausedSchedule, id: 's2', status: 'ACTIVE', nextDueAt: '2026-11-01T00:00:00Z' },
    ];
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(409, 'Asset already has an active schedule', 'INVALID_STATE'),
    };

    render(<InspectionSchedulesPage />);

    // a refusal mutates nothing server-side, so both rows survive and both actions stay offered
    expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Activate' })).toHaveLength(1);
  });

  it('keeps a non-conflict failure as a generic error', () => {
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(400, 'Request validation failed.', 'VALIDATION_FAILED'),
    };

    render(<InspectionSchedulesPage />);

    screen.getByText('Request validation failed.');
    expect(screen.queryByTestId('schedule-conflict')).toBeNull();
  });

  it('shows the server reason for a pause refused because the schedule is not active', () => {
    // The client dispatches pause for an ACTIVE row, so a stale view can make it answer 409 with
    // "Only active schedules can be paused" — nothing to do with another active schedule.
    schedules = [{ ...pausedSchedule, id: 's9', status: 'ACTIVE' }];
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(409, 'Only active schedules can be paused', 'INVALID_STATE'),
    };

    render(<InspectionSchedulesPage />);

    const alert = screen.getByTestId('schedule-conflict');
    expect(alert.textContent).toContain('Only active schedules can be paused');
    // the old heading claimed a competing active schedule, which this refusal is not about
    expect(alert.textContent).not.toContain('This asset already has an active schedule');
    expect(alert.textContent).not.toContain('Pause the active schedule');
  });

  it('shows the server reason when the refusal is an inactive asset or checklist', () => {
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(
        409,
        'Active schedule requires an active asset and checklist template',
        'INVALID_STATE',
      ),
    };

    render(<InspectionSchedulesPage />);

    const alert = screen.getByTestId('schedule-conflict');
    expect(alert.textContent).toContain(
      'Active schedule requires an active asset and checklist template',
    );
    expect(alert.textContent).not.toContain('This asset already has an active schedule');
  });

  it('shows the server reason when the refusal really is a competing active schedule', () => {
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(409, 'Asset already has an active schedule', 'INVALID_STATE'),
    };

    render(<InspectionSchedulesPage />);

    const alert = screen.getByTestId('schedule-conflict');
    expect(alert.textContent).toContain('Asset already has an active schedule');
    // a heading that cannot contradict any of the three 409s the service can raise
    expect(alert.textContent).not.toContain('This asset already has an active schedule');
  });

  it('names the action the server refused, so the advice cannot be about the wrong one', async () => {
    schedules = [{ ...pausedSchedule, id: 's9', status: 'ACTIVE' }];
    toggleState = {
      isError: true,
      isPending: false,
      error: problemError(409, 'Only active schedules can be paused', 'INVALID_STATE'),
    };

    render(<InspectionSchedulesPage />);
    screen.getByRole('button', { name: 'Pause' }).click();

    // the refusal arrived for a Pause; any advice offered must be about pausing, not resuming
    const alert = await screen.findByTestId('schedule-conflict');
    expect(alert.textContent.toLowerCase()).not.toContain('resume');
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
