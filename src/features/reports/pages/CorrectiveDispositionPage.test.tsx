import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import CorrectiveDispositionPage from './CorrectiveDispositionPage';
import {
  inspectionApi,
  type Finding,
} from '@/features/inspections/api/inspectionApi';

vi.mock('@/features/inspections/api/inspectionApi', () => ({
  inspectionApi: {
    listVersions: vi.fn(),
    listFindings: vi.fn(),
    listEvidence: vi.fn(),
    workflowState: vi.fn(),
    recordCorrectiveAction: vi.fn(),
    completeCorrectiveHandoff: vi.fn(),
    declareNoCorrectiveWork: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

const mockedApi = vi.mocked(inspectionApi);

function setRole(roles: Role[]) {
  useAuthStore.setState({
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'user@example.test',
      fullName: 'Test User',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
    roles,
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPage(route = '/client/inspections/inspection-1/corrective') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <>
      <QueryClientProvider client={client}>
        <CorrectiveDispositionPage />
      </QueryClientProvider>
      <LocationProbe />
    </>,
    { route },
  );
}

function version(status: 'SUBMITTED' | 'PUBLISHED' = 'PUBLISHED') {
  return {
    id: 'version-1',
    inspectionReportId: 'report-1',
    versionNo: 1,
    status,
    authorUserId: 'someone-else',
    authorVerifiedAt: '2026-10-01T10:00:00Z',
    reviewerUserId: 'reviewer-1',
    reviewedAt: '2026-10-01T11:00:00Z',
    reviewReason: null,
    returnReasonType: null,
    withdrawnByUserId: null,
    withdrawnAt: null,
    withdrawalReason: null,
    llmModel: 'test-model',
    promptVersion: 'mf3-report-v1',
    generatedAt: '2026-10-01T09:00:00Z',
    evidenceSnapshotHash: 'abcdef1234567890',
    findingsSnapshotHash: 'fedcba0987654321',
    publishedAt: '2026-10-01T12:00:00Z',
    createdAt: '2026-10-01T09:00:00Z',
    narrative: 'The north span was surveyed.',
  };
}

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: null,
    status: 'CONFIRMED',
    deletedAt: null,
    deletedByUserId: null,
    deletionReason: null,
    findingCode: 'F-1',
    defectLabel: 'Spalling on the north parapet',
    severity: 'HIGH',
    locationDescription: 'North parapet, bay 3',
    technicalNotes: 'Surface loss of 5 mm',
    boundingBox: null,
    modelName: null,
    modelVersion: null,
    modelProvider: null,
    confidence: null,
    recommendedAction: 'Patch and seal',
    component: 'Parapet',
    description: 'Spalling',
    observedCondition: 'Active spalling',
    priority: 'HIGH',
    measurement: '5 mm',
    inspectorConfirmedAt: '2026-10-01T11:00:00Z',
    decidedByUserId: null,
    repairRequired: true,
    correctiveActionRequired: true,
    correctiveActionPriority: null,
    correctiveActionDueAt: null,
    correctiveActionReviewedByUserId: null,
    correctiveActionReviewedAt: null,
    correctiveActionRationale: null,
    ...overrides,
  } as Finding;
}

describe('CorrectiveDispositionPage', () => {
  beforeEach(() => {
    cleanup();
    setRole(['ORG_ADMIN']);
    mockedApi.listVersions.mockResolvedValue([version()] as never);
    mockedApi.listFindings.mockResolvedValue([] as never);
    mockedApi.workflowState.mockResolvedValue({
      status: 'REPORT_PUBLISHED',
      findingsConfirmedByUserId: 'inspector-1',
      findingsConfirmedAt: '2026-10-01T11:00:00Z',
      findingsSnapshotHash: 'abc123',
    } as never);
    mockedApi.recordCorrectiveAction.mockReset();
    mockedApi.completeCorrectiveHandoff.mockReset();
    mockedApi.declareNoCorrectiveWork.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('records the corrective outcome on a published finding', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({ correctiveActionRequired: true, repairRequired: true }),
    ] as never);

    renderPage();

    fireEvent.mouseDown(await screen.findByLabelText('Corrective action'));
    fireEvent.click(screen.getByRole('option', { name: /Not required within observed scope/ }));
    fireEvent.change(screen.getByLabelText(/Corrective action rationale/), {
      target: { value: 'No repair is needed within the observed span.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record corrective action' }));

    await waitFor(() =>
      expect(mockedApi.recordCorrectiveAction).toHaveBeenCalledWith('inspection-1', 'finding-1', {
        correctiveActionRequired: false,
        rationale: 'No repair is needed within the observed span.',
      }),
    );
  });

  it('requires a rationale before declaring that no corrective work is needed', async () => {
    renderPage();

    const close = (await screen.findByRole('button', {
      name: 'Record no corrective work and close inspection',
    })) as HTMLButtonElement;
    expect(close.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/No-repair rationale for the observed scope/), {
      target: { value: 'The observed scope needs no corrective work.' },
    });
    expect(close.disabled).toBe(false);

    fireEvent.click(close);
    await waitFor(() =>
      expect(mockedApi.declareNoCorrectiveWork).toHaveBeenCalledWith(
        'inspection-1',
        'The observed scope needs no corrective work.',
      ),
    );
  });

  it('hands corrective outcomes to MF4 only when every confirmed finding is reviewed', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({
        id: 'finding-1',
        correctiveActionRequired: false,
        correctiveActionReviewedByUserId: 'reviewer-1',
        correctiveActionReviewedAt: '2026-10-01T13:00:00Z',
        correctiveActionRationale: 'No repair is needed.',
      }),
      finding({ id: 'finding-2', correctiveActionRequired: true }),
    ] as never);

    renderPage();

    const handoff = (await screen.findByRole('button', {
      name: 'Complete corrective handoff to MF4',
    })) as HTMLButtonElement;
    expect(handoff.disabled).toBe(true);
  });

  it('hands reviewed corrective outcomes to MF4 and reports the resulting inspection status', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({
        correctiveActionRequired: true,
        correctiveActionPriority: 'HIGH',
        correctiveActionReviewedByUserId: 'reviewer-1',
        correctiveActionReviewedAt: '2026-10-01T13:00:00Z',
        correctiveActionRationale: 'Repair is required.',
      }),
    ] as never);
    mockedApi.completeCorrectiveHandoff.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: ['finding-1'],
      inspectionStatus: 'REPAIR_PENDING',
    } as never);

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Complete corrective handoff to MF4' }),
    );

    await waitFor(() =>
      expect(mockedApi.completeCorrectiveHandoff).toHaveBeenCalledWith('inspection-1'),
    );
    await waitFor(() =>
      expect(screen.getByText(/Inspection status: REPAIR_PENDING/)).toBeTruthy(),
    );
  });

  it('says so when there is no published version to disposition', async () => {
    mockedApi.listVersions.mockResolvedValue([version('SUBMITTED')] as never);

    renderPage();

    expect(
      await screen.findByText(/no published report version yet/i),
    ).toBeTruthy();
  });

  it('offers the disposition to an organization administrator only', async () => {
    setRole(['INSPECTOR']);
    renderPage();

    expect(
      await screen.findByText(/corrective disposition is recorded by the organization administrator/i),
    ).toBeTruthy();
  });
});
