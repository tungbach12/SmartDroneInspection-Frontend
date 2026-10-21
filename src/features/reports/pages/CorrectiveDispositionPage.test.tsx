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
    repairRequired: false,
    correctiveActionRequired: false,
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
    mockedApi.completeCorrectiveHandoff.mockReset();
    mockedApi.declareNoCorrectiveWork.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('selects all unforwarded findings by default and sends them to maintenance on button click', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({ id: 'finding-1', defectLabel: 'Crack on beam' }),
      finding({ id: 'finding-2', findingCode: 'F-2', defectLabel: 'Corrosion on flange' }),
    ] as never);
    mockedApi.completeCorrectiveHandoff.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: ['finding-1', 'finding-2'],
      inspectionStatus: 'REPAIR_PENDING',
    } as never);

    renderPage();

    expect(await screen.findByText('Crack on beam')).toBeTruthy();
    expect(screen.getByText('Corrosion on flange')).toBeTruthy();

    const sendButton = await screen.findByRole('button', { name: /Send 2 finding\(s\) to Maintenance/i });
    expect(sendButton).toBeTruthy();

    fireEvent.click(sendButton);

    await waitFor(() =>
      expect(mockedApi.completeCorrectiveHandoff).toHaveBeenCalledWith('inspection-1', ['finding-1', 'finding-2']),
    );
  });

  it('allows deselecting a finding to exclude it from the maintenance handoff', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({ id: 'finding-1', defectLabel: 'Crack on beam' }),
      finding({ id: 'finding-2', findingCode: 'F-2', defectLabel: 'Corrosion on flange' }),
    ] as never);
    mockedApi.completeCorrectiveHandoff.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: ['finding-2'],
      inspectionStatus: 'REPAIR_PENDING',
    } as never);

    renderPage();

    // Click checkbox for finding-1 to uncheck it
    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0]!);

    // Now button should say "Send 1 finding(s) to Maintenance"
    const sendButton = await screen.findByRole('button', { name: /Send 1 finding\(s\) to Maintenance/i });
    fireEvent.click(sendButton);

    await waitFor(() =>
      expect(mockedApi.completeCorrectiveHandoff).toHaveBeenCalledWith('inspection-1', ['finding-2']),
    );
  });

  it('shows already forwarded findings as read-only chips', async () => {
    mockedApi.listFindings.mockResolvedValue([
      finding({
        id: 'finding-1',
        repairRequired: true,
        correctiveActionReviewedByUserId: 'reviewer-1',
      }),
    ] as never);

    renderPage();

    expect(await screen.findByText(/All confirmed findings from this report have already been forwarded/i)).toBeTruthy();
    expect(screen.getByText(/1 already forwarded/i)).toBeTruthy();
  });

  it('allows completing an inspection without repair when no findings exist', async () => {
    mockedApi.listFindings.mockResolvedValue([] as never);
    mockedApi.declareNoCorrectiveWork.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: [],
      inspectionStatus: 'COMPLETED',
    } as never);

    renderPage();

    const closeButton = await screen.findByRole('button', {
      name: /Complete inspection without repair/i,
    });
    fireEvent.click(closeButton);

    await waitFor(() =>
      expect(mockedApi.declareNoCorrectiveWork).toHaveBeenCalledWith(
        'inspection-1',
        'No findings observed in inspected scope',
      ),
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
      await screen.findByText(/reserved for the organization administrator/i),
    ).toBeTruthy();
  });
});
