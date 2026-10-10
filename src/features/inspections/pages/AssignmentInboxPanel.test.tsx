import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Role, useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  inboxQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  respond: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useAssignmentInbox: () => mocks.inboxQuery,
  useRespondToAssignment: () => mocks.respond,
}));

import AssignmentInboxPanel from './AssignmentInboxPanel';

const ASSIGNMENT_ID = 'assignment-1';

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'inspector@example.test',
      fullName: 'Inspector',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

function assignment() {
  return {
    id: ASSIGNMENT_ID,
    organizationId: 'org-1',
    assetId: 'asset-1',
    assetName: 'Sung Han Bridge',
    inspectorUserId: 'inspector-1',
    droneId: 'drone-1',
    droneSerialNumber: 'DJI-M350-001',
    droneServiceability: 'ACTIVE',
    validFrom: '2026-11-01T00:00:00Z',
    validUntil: '2026-11-30T00:00:00Z',
    status: 'ACTIVE',
    reason: null,
    assignmentResponse: null,
    respondedAt: null,
    assignedAt: '2026-10-09T09:00:00Z',
  };
}

describe('AssignmentInboxPanel', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('opens MF2 by showing what the administrator paired the inspector with', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];

    render(<AssignmentInboxPanel />);

    expect(screen.getByRole('heading', { name: /assignment/i })).toBeTruthy();
    expect(screen.getByText('Sung Han Bridge')).toBeTruthy();
    expect(screen.getByText(/DJI-M350-001/)).toBeTruthy();
  });

  it('accepts the assignment with no reason required', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];

    render(<AssignmentInboxPanel />);

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(mocks.respond.mutate).toHaveBeenCalledWith({
      assignmentId: ASSIGNMENT_ID,
      response: 'ACCEPTED',
      rejectionReason: undefined,
    });
  });

  /**
   * MF2-01 requires a reason when declining, and the backend refuses without one. The reason has to
   * be typed here rather than the server deciding what went wrong.
   */
  it('asks for a reason before declining', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];

    render(<AssignmentInboxPanel />);

    expect(screen.getByLabelText(/reason/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'No night-flight qualification' },
    });
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(mocks.respond.mutate).toHaveBeenCalledWith({
      assignmentId: ASSIGNMENT_ID,
      response: 'REJECTED',
      rejectionReason: 'No night-flight qualification',
    });
  });

  it('keeps the decline unavailable until a reason is written', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];

    render(<AssignmentInboxPanel />);

    expect(screen.getByRole('button', { name: /decline/i })).toHaveProperty('disabled', true);
  });

  it('says accepting is not flight clearance', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];

    render(<AssignmentInboxPanel />);

    // MF2-02: accepting records that the inspector took the job. It is not readiness.
    expect(screen.getByText(/not flight clearance|does not mean the mission may fly/i)).toBeTruthy();
  });

  it('shows the server reason when a response is refused', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [assignment()];
    mocks.respond.isError = true;
    mocks.respond.error = new Error('409 ASSIGNMENT_NOT_ACTIVE');

    render(<AssignmentInboxPanel />);

    expect(screen.getByText(/ASSIGNMENT_NOT_ACTIVE/)).toBeTruthy();
  });

  it('is hidden from a reader who is not an inspector', () => {
    signInAs(['ORG_ADMIN']);

    render(<AssignmentInboxPanel />);

    expect(screen.queryByRole('heading', { name: /assignment/i })).toBeNull();
  });

  it('tells an inspector with nothing to answer where to go', () => {
    signInAs(['INSPECTOR']);
    mocks.inboxQuery.data = [];

    render(<AssignmentInboxPanel />);

    expect(screen.getByText(/nothing to answer|no assignments/i)).toBeTruthy();
  });
});
