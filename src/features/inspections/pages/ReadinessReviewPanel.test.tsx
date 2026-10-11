import { AxiosError } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Role, useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  sourcesQuery: {
    data: undefined as
      | {
          inspectionId: string;
          inspectorUserId: string;
          droneId: string;
          inspectorCredentials: unknown[];
          droneDocuments: unknown[];
        }
      | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  ownCredentialsQuery: { data: [] as unknown[] | undefined, isLoading: false, isError: false, error: null as Error | null, refetch: vi.fn() },
  complianceQuery: {
    data: undefined as { blockers: unknown[]; linkedPermitIds: string[]; requiresHumanVerification: boolean } | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  approve: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  returnPreparation: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useInspections', () => ({
  useReadinessSources: () => mocks.sourcesQuery,
  useMyCredentials: () => mocks.ownCredentialsQuery,
  useComplianceGate: () => mocks.complianceQuery,
  useApproveReadiness: () => mocks.approve,
  useReturnReadiness: () => mocks.returnPreparation,
}));

import ReadinessReviewPanel from './ReadinessReviewPanel';

const INSPECTION_ID = 'inspection-1';
const PREPARATION_ID = 'prep-1';
const REVIEWER_CREDENTIAL_ID = 'cred-reviewer-1';
const INSPECTOR_CREDENTIAL_ID = 'cred-inspector-1';
const DRONE_DOCUMENT_ID = 'doc-1';

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

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'admin-1',
      email: 'admin@example.test',
      fullName: 'Admin',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

function reviewerCredential() {
  return {
    id: REVIEWER_CREDENTIAL_ID,
    credentialType: 'PILOT',
    issuer: 'Aviation Authority',
    credentialReference: 'LIC-REVIEWER',
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-11-30T00:00:00Z',
    status: 'ACTIVE',
    verifiedByUserId: 'admin-1',
    verifiedAt: '2026-09-02T00:00:00Z',
    verificationReason: 'Verified source evidence',
  };
}

function sources() {
  return {
    inspectionId: INSPECTION_ID,
    inspectorUserId: 'inspector-1',
    droneId: 'drone-1',
    inspectorCredentials: [
      {
        id: INSPECTOR_CREDENTIAL_ID,
        credentialType: 'PILOT',
        issuer: 'Aviation Authority',
        credentialReference: 'LIC-INSPECTOR',
        issuedAt: '2026-09-01T00:00:00Z',
        expiresAt: '2026-11-30T00:00:00Z',
        status: 'ACTIVE',
        verifiedAt: '2026-09-02T00:00:00Z',
      },
    ],
    droneDocuments: [
      {
        id: DRONE_DOCUMENT_ID,
        documentType: 'AIRWORTHINESS_CERTIFICATE',
        issuer: 'Aviation Authority',
        documentReference: 'DOC-AIRWORTHINESS',
        validFrom: '2026-09-01T00:00:00Z',
        validUntil: '2026-11-30T00:00:00Z',
        status: 'ACTIVE',
        reviewedAt: '2026-09-02T00:00:00Z',
      },
    ],
  };
}

describe('ReadinessReviewPanel', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('offers the review sources a decision must name, without asking for UUIDs', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = { blockers: [], linkedPermitIds: [], requiresHumanVerification: false };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    expect(screen.getByRole('checkbox', { name: /LIC-REVIEWER/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /LIC-INSPECTOR/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /DOC-AIRWORTHINESS/ })).toBeTruthy();
  });

  it('sends the ids the reviewer selected rather than free text', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = { blockers: [], linkedPermitIds: [], requiresHumanVerification: false };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /LIC-REVIEWER/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /LIC-INSPECTOR/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /DOC-AIRWORTHINESS/ }));
    fireEvent.change(screen.getByLabelText(/applicability basis reference/i), {
      target: { value: 'inspection-scope-policy-2026' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /applicability attestation complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /approve readiness/i }));

    expect(mocks.approve.mutate).toHaveBeenCalledWith({
      inspectionId: INSPECTION_ID,
      preparationId: PREPARATION_ID,
      input: expect.objectContaining({
        reviewerCredentialId: REVIEWER_CREDENTIAL_ID,
        inspectorCredentialIds: [INSPECTOR_CREDENTIAL_ID],
        droneDocumentIds: [DRONE_DOCUMENT_ID],
        applicabilityComplete: true,
        applicabilityBasisReference: 'inspection-scope-policy-2026',
      }),
    });
  });

  /**
   * MF2-07 requires a category-specific reason when a selection is empty, so "nothing applies" is a
   * recorded judgement rather than an omission. The client cannot word it for the reviewer.
   */
  it('asks for a reason when the reviewer selects no Drone document', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = { blockers: [], linkedPermitIds: [], requiresHumanVerification: false };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /LIC-REVIEWER/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /LIC-INSPECTOR/ }));
    fireEvent.click(screen.getByLabelText(/applicability basis reference/i), {
      target: { value: 'inspection-scope-policy-2026' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /applicability attestation complete/i }));

    expect(screen.getByLabelText(/no drone document reason/i)).toBeTruthy();
  });

  it('requires a stated reason before returning the preparation', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = { blockers: [], linkedPermitIds: [], requiresHumanVerification: false };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /LIC-REVIEWER/ }));
    fireEvent.change(screen.getByLabelText(/return reason/i), {
      target: { value: 'Airworthiness document is missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /return preparation/i }));

    expect(mocks.returnPreparation.mutate).toHaveBeenCalledWith({
      inspectionId: INSPECTION_ID,
      preparationId: PREPARATION_ID,
      input: expect.objectContaining({ reason: 'Airworthiness document is missing' }),
    });
  });

  it('keeps the approval disabled while a compliance blocker stands', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = {
      blockers: [{ code: 'PERMIT_MISSING', detail: 'No applicable flight permit is linked.' }],
      linkedPermitIds: [],
      requiresHumanVerification: false,
    };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    expect(screen.getByRole('button', { name: /approve readiness/i })).toHaveProperty('disabled', true);
    expect(screen.getByText(/PERMIT_MISSING/)).toBeTruthy();
  });

  it('asks for a human-verification basis when the gate reports one', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = {
      blockers: [],
      linkedPermitIds: [],
      requiresHumanVerification: true,
    };

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    expect(screen.getByLabelText(/human verification basis/i)).toBeTruthy();
  });

  it('shows a refused approval with the server reason rather than a generic failure', () => {
    signInAs(['ORG_ADMIN']);
    mocks.ownCredentialsQuery.data = [reviewerCredential()];
    mocks.sourcesQuery.data = sources();
    mocks.complianceQuery.data = { blockers: [], linkedPermitIds: [], requiresHumanVerification: false };
    mocks.approve.isError = true;
    mocks.approve.error = problemError(409, 'The assigned Inspector cannot review their own mission.', 'REVIEWER_NOT_INDEPENDENT');

    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    expect(screen.getByTestId('approval-refusal')).toBeTruthy();
    expect(screen.getByText(/cannot review their own mission/)).toBeTruthy();
  });

  it('is hidden from an inspector, who is the subject of this review', () => {
    signInAs(['INSPECTOR']);
    render(
      <ReadinessReviewPanel inspectionId={INSPECTION_ID} preparationId={PREPARATION_ID} />,
    );

    expect(screen.queryByRole('button', { name: /approve readiness/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /return preparation/i })).toBeNull();
  });
});
