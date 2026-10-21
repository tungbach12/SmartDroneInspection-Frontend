import { AxiosError } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Role, useAuthStore } from '@/features/auth/store/authStore';

/** Builds the AxiosError the shared problem helpers classify, matching the repo's other tests. */
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
  // Spy so a test can assert the hook was never reached, which is what keeps the 403 off the wire.
  useComplianceGate: vi.fn(() => mocks.compliance),
}));

import InspectionPreparationPanel from './InspectionPreparationPanel';
import { useComplianceGate } from '../hooks/useInspections';

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
    plannedStartAt: '2026-11-01T09:00:00Z',
    plannedEndAt: '2026-11-01T11:00:00Z',
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
    expect(screen.getByText('SUBMITTED')).toBeTruthy();
    expect(screen.getByText(/version 1 · submitted/i)).toBeTruthy();
  });

  /**
   * The status must come from the shared StatusChip, whose colour map is what the rest of the app
   * reads. A locally chosen chip colour would make this panel look like a different product.
   */
  it('renders the preparation status through the shared status chip', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [submittedPreparation()];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    // StatusChip renders the raw status; submitted work is waiting on a reviewer, which the shared
    // map colours as a warning. MUI puts the colour variant on the chip root, capitalised.
    const chip = screen.getByText('SUBMITTED').closest('.MuiChip-root');
    expect(chip?.className).toContain('MuiChip-colorWarning');
  });

  it('labels a refused mutation as a business rule rather than a fault', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [];
    mocks.prepare.isError = true;
    mocks.prepare.error = problemError(409, 'Only a draft preparation may be edited.', 'PREPARATION_NOT_EDITABLE');

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    expect(screen.getByTestId('draft-refusal')).toBeTruthy();
    expect(screen.getByText(/Only a draft preparation may be edited/)).toBeTruthy();
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

  it('lets an additional-session preparation update the planned session window', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [{ ...submittedPreparation(), preparationVersion: 2 }];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    fireEvent.change(screen.getByLabelText(/planned session start/i), {
      target: { value: '2026-12-01T09:00' },
    });
    fireEvent.change(screen.getByLabelText(/planned session end/i), {
      target: { value: '2026-12-01T11:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    expect(mocks.prepare.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          plannedStartAt: new Date('2026-12-01T09:00').toISOString(),
          plannedEndAt: new Date('2026-12-01T11:00').toISOString(),
        }),
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

  it('does not ask an inspector for the compliance gate the backend scopes to ORG_ADMIN', () => {
    signInAs(['INSPECTOR']);
    mocks.preparationsQuery.data = [];
    vi.mocked(useComplianceGate).mockClear();

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector />);

    // The hook is what issues the request, so not reaching it is what keeps the 403 off the wire.
    expect(vi.mocked(useComplianceGate)).not.toHaveBeenCalled();
    expect(screen.queryByText(/PERMIT_MISSING/)).toBeNull();
  });

  it('still reads the gate for a compliance officer', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [];
    vi.mocked(useComplianceGate).mockClear();

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    expect(vi.mocked(useComplianceGate)).toHaveBeenCalledWith(INSPECTION_ID);
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

  /**
   * A reviewer judges a submitted preparation, so the content has to be readable to them. The
   * editor is the author's alone, so the reviewer's copy is a separate read-only rendering.
   */
  it('shows the submitted preparation to a reviewer read-only', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [submittedPreparation()];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    expect(screen.getByText(/component shot-list/i)).toBeTruthy();
    expect(screen.getByText(/Span P4/)).toBeTruthy();
    expect(screen.getByText(/Live 110V near pier 3/)).toBeTruthy();
    expect(screen.queryByLabelText(/component shot-list/i)).toBeNull();
  });

  it('tells a reviewer that there is nothing to review when no preparation exists', () => {
    signInAs(['ORG_ADMIN']);
    mocks.preparationsQuery.data = [];

    render(<InspectionPreparationPanel inspectionId={INSPECTION_ID} isInspector={false} />);

    expect(screen.getByText(/no preparation has been recorded/i)).toBeTruthy();
  });
});
