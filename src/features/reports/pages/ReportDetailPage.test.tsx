import { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import ReportDetailPage from './ReportDetailPage';
import {
  inspectionApi,
  type VerifiedFinding,
} from '@/features/inspections/api/inspectionApi';

function problemError(status: number, detail: string, code: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { type: 'about:blank', title: 'Conflict', status, detail, code },
      status,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

vi.mock('@/features/inspections/api/inspectionApi', () => ({
  inspectionApi: {
    listWithReports: vi.fn(),
    listVersions: vi.fn(),
    listFindings: vi.fn(),
    listEvidence: vi.fn(),
    verifyVersion: vi.fn(),
    submitVersion: vi.fn(),
    reviewVersion: vi.fn(),
    publishVersion: vi.fn(),
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
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <>
      <QueryClientProvider client={client}>
        <ReportDetailPage />
      </QueryClientProvider>
      <LocationProbe />
    </>,
    { route: '/operations/reports/inspection-1' },
  );
}

function version(overrides: Partial<Awaited<ReturnType<typeof inspectionApi.listVersions>>[number]>) {
  return {
    id: 'version-1',
    inspectionReportId: 'report-1',
    versionNo: 1,
    status: 'SUBMITTED' as const,
    authorUserId: 'someone-else',
    authorVerifiedAt: '2026-10-01T10:00:00Z',
    reviewerUserId: null,
    reviewedAt: null,
    reviewReason: null,
    llmModel: 'test-model',
    promptVersion: 'mf3-report-v1',
    generatedAt: '2026-10-01T09:00:00Z',
    evidenceSnapshotHash: 'abcdef1234567890',
    findingsSnapshotHash: 'fedcba0987654321',
    publishedAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    narrative: 'The north span was surveyed from both maintenance walkways.',
    omissionDisclosure: null,
    sections: {
      executiveSummary: 'The north span was surveyed from both maintenance walkways.',
      purposeScopeCriteria: null,
      methodEquipmentConditions: null,
      conclusionsRecommendations: null,
      overallCondition: null,
      omissionDisclosure: null,
    },
    ...overrides,
  };
}

function finding(overrides: Partial<VerifiedFinding> = {}): VerifiedFinding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: 'evidence-1',
    aiCandidateId: null,
    source: 'MANUAL',
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    locationDescription: null,
    technicalNotes: 'Visible crack',
    recommendedAction: null,
    component: 'Pier 2',
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    decision: 'CONFIRMED',
    decidedByUserId: 'reviewer-1',
    decidedAt: '2026-10-01T11:00:00Z',
    repairRequired: false,
    status: 'OPEN',
    correctiveActionRequired: false,
    correctiveActionPriority: null,
    correctiveActionDueAt: null,
    correctiveActionReviewedByUserId: null,
    correctiveActionReviewedAt: null,
    correctiveActionRationale: null,
    ...overrides,
  };
}

describe('ReportDetailPage MF3 gates', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.listEvidence.mockResolvedValue([]);
    setRole(['ORG_ADMIN']);
  });

  it('keeps approval disabled until every finding has an independent decision', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([
      finding({ decision: null, decidedByUserId: null, decidedAt: null }),
    ]);

    renderPage();

    const approve = (await screen.findByRole('button', { name: 'Approve' })) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(screen.getByText(/Decide every proposed finding/)).toBeTruthy();
  });

  it('offers approve and return-with-reason to the reviewer on a submitted version', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/The north span was surveyed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();

    const returnButton = screen.getByRole('button', {
      name: 'Return with reason',
    }) as HTMLButtonElement;
    expect(returnButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Reason for return'), {
      target: { value: 'The east face coverage is not disclosed' },
    });
    expect(returnButton.disabled).toBe(false);

    fireEvent.click(returnButton);
    await waitFor(() =>
      expect(mockedApi.reviewVersion).toHaveBeenCalledWith('inspection-1', 'version-1', false, 'The east face coverage is not disclosed'),
    );
  });

  it.each([
    { action: 'approve', button: 'Approve' },
    { action: 'return', button: 'Return with reason' },
  ])('shows a user-visible error when report review $action fails', async ({ action, button }) => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.reviewVersion.mockRejectedValue(new Error(`Review ${action} failed.`));

    renderPage();

    if (action === 'return') {
      fireEvent.change(await screen.findByLabelText('Reason for return'), {
        target: { value: 'Please clarify the inspection scope.' },
      });
    }
    fireEvent.click(await screen.findByRole('button', { name: button }));

    expect(await screen.findByText(`Review ${action} failed.`)).toBeTruthy();
  });

  it('shows a user-visible error when report publishing fails', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'APPROVED', authorUserId: 'someone-else' }),
    ]);
    mockedApi.publishVersion.mockRejectedValue(new Error('Publishing failed.'));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish immutable version' }));

    expect(await screen.findByText('Publishing failed.')).toBeTruthy();
  });

  it('marks a published version immutable and offers no further action', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({
        status: 'PUBLISHED',
        versionNo: 2,
        authorUserId: 'user-1',
        reviewerUserId: 'user-2',
        reviewedAt: '2026-10-01T11:00:00Z',
        publishedAt: '2026-10-01T12:00:00Z',
      }),
    ]);

    renderPage();

    // A published version is immutable, so it offers no author or reviewer action and its sections are
// read-only. The download of the published deliverable is the only thing it offers.
    expect(
      await screen.findByRole('button', { name: 'Download report' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save sections' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish immutable version' })).toBeNull();
  });

  it('lets the Inspector author verify a draft', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'DRAFT', authorUserId: 'user-1' }),
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Verify as author' }));
    await waitFor(() =>
      expect(mockedApi.verifyVersion).toHaveBeenCalledWith('inspection-1', 'version-1'),
    );
  });

  it('lets the Inspector re-verify a returned report version', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'RETURNED', authorUserId: 'user-1', reviewReason: 'Clarify east-face coverage' }),
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Verify as author' }));
    await waitFor(() =>
      expect(mockedApi.verifyVersion).toHaveBeenCalledWith('inspection-1', 'version-1'),
    );
  });

  it('lets the verified Inspector submit the version for review', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'AUTHOR_VERIFIED', authorUserId: 'user-1' }),
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));
    await waitFor(() =>
      expect(mockedApi.submitVersion).toHaveBeenCalledWith('inspection-1', 'version-1'),
    );
  });
  it.each([
    {
      action: 'verify' as const,
      button: 'Verify as author',
      status: 'DRAFT' as const,
      request: () => mockedApi.verifyVersion,
    },
    {
      action: 'submit' as const,
      button: 'Submit for review',
      status: 'AUTHOR_VERIFIED' as const,
      request: () => mockedApi.submitVersion,
    },
  ])('shows the server stale-snapshot refusal when $action fails', async ({ action, button, status, request }) => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([version({ status, authorUserId: 'user-1' })]);
    request().mockRejectedValue(
      problemError(409, 'Evidence changed since this report draft was created.', 'REPORT_SNAPSHOT_STALE'),
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: button }));

    expect((await screen.findByTestId(`report-${action}-refusal`)).textContent).toContain(
      'Evidence changed since this report draft was created.',
    );
  });

  it('hides review actions from an Inspector', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([version({})]);

    renderPage();

    await screen.findByText(/The north span was surveyed/);
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByLabelText('Reason for return')).toBeNull();
  });

  it('publishes without inventing corrective work and points to the MF3-12 outcomes', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'APPROVED', authorUserId: 'someone-else' }),
    ]);
    mockedApi.publishVersion.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: [],
      inspectionStatus: 'REPORT_PUBLISHED',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish immutable version' }));

    await waitFor(() =>
      expect(
        screen.getByText(/record corrective outcomes before handing findings to MF4/i),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/No corrective work was required/)).toBeNull();
  });

  it('records the reviewer corrective-action outcome on a published finding', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({
        status: 'PUBLISHED',
        authorUserId: 'someone-else',
        publishedAt: '2026-10-01T12:00:00Z',
      }),
    ]);
    mockedApi.workflowState.mockResolvedValue({
      status: 'REPORT_PUBLISHED',
      findingsConfirmedByUserId: 'inspector-1',
      findingsConfirmedAt: '2026-10-01T11:00:00Z',
      findingsSnapshotHash: 'abc123',
    });
    mockedApi.listFindings.mockResolvedValue([
      finding({ correctiveActionRequired: true, repairRequired: true }),
    ]);

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
    mockedApi.listVersions.mockResolvedValue([
      version({
        status: 'PUBLISHED',
        authorUserId: 'someone-else',
        publishedAt: '2026-10-01T12:00:00Z',
      }),
    ]);
    mockedApi.workflowState.mockResolvedValue({
      status: 'REPORT_PUBLISHED',
      findingsConfirmedByUserId: 'inspector-1',
      findingsConfirmedAt: '2026-10-01T11:00:00Z',
      findingsSnapshotHash: 'abc123',
    });

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
    mockedApi.listVersions.mockResolvedValue([
      version({
        status: 'PUBLISHED',
        authorUserId: 'someone-else',
        publishedAt: '2026-10-01T12:00:00Z',
      }),
    ]);
    mockedApi.workflowState.mockResolvedValue({
      status: 'REPORT_PUBLISHED',
      findingsConfirmedByUserId: 'inspector-1',
      findingsConfirmedAt: '2026-10-01T11:00:00Z',
      findingsSnapshotHash: 'abc123',
    });
    mockedApi.listFindings.mockResolvedValue([
      finding({
        id: 'finding-1',
        correctiveActionRequired: false,
        correctiveActionReviewedByUserId: 'reviewer-1',
        correctiveActionReviewedAt: '2026-10-01T13:00:00Z',
        correctiveActionRationale: 'No repair is needed.',
      }),
      finding({ id: 'finding-2', correctiveActionRequired: true }),
    ]);

    renderPage();

    const handoff = (await screen.findByRole('button', {
      name: 'Complete corrective handoff to MF4',
    })) as HTMLButtonElement;
    expect(handoff.disabled).toBe(true);
  });

  it('hands reviewed corrective outcomes to MF4 and reports the resulting inspection status', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({
        status: 'PUBLISHED',
        authorUserId: 'someone-else',
        publishedAt: '2026-10-01T12:00:00Z',
      }),
    ]);
    mockedApi.workflowState.mockResolvedValue({
      status: 'REPORT_PUBLISHED',
      findingsConfirmedByUserId: 'inspector-1',
      findingsConfirmedAt: '2026-10-01T11:00:00Z',
      findingsSnapshotHash: 'abc123',
    });
    mockedApi.listFindings.mockResolvedValue([
      finding({
        id: 'finding-1',
        correctiveActionRequired: true,
        correctiveActionPriority: 'HIGH',
        correctiveActionReviewedByUserId: 'reviewer-1',
        correctiveActionReviewedAt: '2026-10-01T13:00:00Z',
        correctiveActionRationale: 'Repair is required.',
      }),
    ]);
    mockedApi.completeCorrectiveHandoff.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: ['finding-1'],
      inspectionStatus: 'REPAIR_PENDING',
    });

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

  it('returns to the reports queue on the inspections list', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Back to reports list' }));

    expect(screen.getByTestId('location').textContent).toBe(
      '/operations/inspections?view=reports',
    );
  });
});
