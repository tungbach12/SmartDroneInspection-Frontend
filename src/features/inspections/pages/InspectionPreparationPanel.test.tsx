import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Role, useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  preparationsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  prepare: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  submit: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  linkPermits: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  compliance: {
    data: undefined as { blockers: unknown[]; linkedPermitIds: string[] } | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionPreparations: () => mocks.preparationsQuery,
  usePrepareShotList: () => mocks.prepare,
  useSubmitPreparation: () => mocks.submit,
  useLinkPermitReferences: () => mocks.linkPermits,
  useComplianceGate: () => mocks.compliance,
}));

import InspectionPreparationPanel from './InspectionPreparationPanel';

const INSPECTION_ID = 'inspection-1';

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'user@example.test',
      fullName: 'User',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

function submittedPreparation() {
  return {
    id: 'prep-1',
    inspectionId: INSPECTION_ID,
    inspectorUserId: 'inspector-1',
    preparationVersion: 1,
    shotList: '[{"component":"Span P4","modality":"RGB","required":true}]',
    evidenceTypes: '["RGB"]',
    accessConstraints: null,
    safetyObservations: 'Live 110V near pier 3',
    permitDocumentReferences: null,
    status: 'SUBMITTED',
    submittedAt: '2026-10-09T09:00:00Z',
    createdAt: '2026-10-09T08:00:00Z',
    updatedAt: '2026-10-09T09:00:00Z',
  };
}

describe('InspectionPreparationPanel', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('shows the preparation an inspector already submitted', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [submittedPreparation()];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    expect(screen.getByRole('heading', { name: /mission preparation/i })).toBeTruthy();
    // The chip, not the version line, which also contains the word "submitted".
    expect(screen.getByText('Submitted for review')).toBeTruthy();
    expect(screen.getByText(/version 1 · submitted/i)).toBeTruthy();
  });

  it('lets the assigned inspector save a shot list and safety observations', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    fireEvent.change(screen.getByLabelText(/component shot-list/i), {
      target: { value: '[{"component":"Span P4","modality":"RGB"}]' },
    });
    fireEvent.change(screen.getByLabelText(/evidence types/i), {
      target: { value: '["RGB"]' },
    });
    fireEvent.change(screen.getByLabelText(/safety observations/i), {
      target: { value: 'Live 110V near pier 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    expect(mocks.prepare.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionId: INSPECTION_ID,
        input: expect.objectContaining({ safetyObservations: 'Live 110V near pier 3' }),
      }),
    );
  });

  it('offers submission only once a submitted preparation exists', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [submittedPreparation()];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    fireEvent.change(screen.getByLabelText(/safety acknowledgment/i), {
      target: { value: 'Restrictions read' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit preparation/i }));

    expect(mocks.submit.mutate).toHaveBeenCalledWith({
      inspectionId: INSPECTION_ID,
      preparationId: 'prep-1',
      acknowledgment: 'Restrictions read',
    });
  });

  it('keeps the inspection status visible so the inspector knows why submit is unavailable', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [{ ...submittedPreparation(), status: 'READY' }];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    expect(screen.getByText(/readiness decision has been made/i)).toBeTruthy();
  });

  it('shows a compliance blocker instead of hiding it behind an error', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [];
    mocks.compliance.data = {
      blockers: [{ code: 'PERMIT_MISSING', detail: 'No applicable flight permit is linked.' }],
      linkedPermitIds: [],
    };

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    expect(screen.getByText(/PERMIT_MISSING/)).toBeTruthy();
  });

  it('hides the preparation editor from a reader who is not the assigned inspector', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    expect(screen.queryByRole('button', { name: /save draft/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /submit preparation/i })).toBeNull();
  });

  it('lets an organization admin link a permit the organization holds', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [{ ...submittedPreparation(), status: 'DRAFT' }];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    fireEvent.change(screen.getByLabelText(/permit id/i), { target: { value: 'permit-1' } });
    fireEvent.click(screen.getByRole('button', { name: /link permit/i }));

    expect(mocks.linkPermits.mutate).toHaveBeenCalledWith({
      inspectionId: INSPECTION_ID,
      permitIds: ['permit-1'],
    });
  });

  it('shows a save failure with the server code so the inspector can act on it', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [];
    mocks.prepare.isError = true;
    mocks.prepare.error = new Error('409 PREPARATION_NOT_ALLOWED');

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    expect(screen.getByText(/PREPARATION_NOT_ALLOWED/)).toBeTruthy();
  });
});
