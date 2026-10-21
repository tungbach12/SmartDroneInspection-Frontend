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
  type Finding,
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
    withdrawVersion: vi.fn(),
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

function renderPage(route = '/operations/reports/inspection-1') {
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
    { route },
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
    returnReasonType: null,
    withdrawnByUserId: null,
    withdrawnAt: null,
    withdrawalReason: null,
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
      inspectorCoverageAssessment: null,
      methodEquipmentConditions: null,
      conclusionsRecommendations: null,
      overallCondition: null,
      omissionDisclosure: null,
    },
    ...overrides,
  };
}

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: 'evidence-1',
    deletedAt: null,
    deletedByUserId: null,
    deletionReason: null,
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    locationDescription: null,
    technicalNotes: 'Visible crack',
    boundingBox: null,
    modelName: null,
    modelVersion: null,
    modelProvider: null,
    confidence: null,
    recommendedAction: null,
    component: 'Pier 2',
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    inspectorConfirmedAt: null,
    repairRequired: false,
    status: 'PENDING',
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

  it('allows the Organization Admin to approve the report without per-finding decisions', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([
      finding({ status: 'CONFIRMED', inspectorConfirmedAt: '2026-10-18T07:00:00Z' }),
    ]);

    renderPage();

    const approve = (await screen.findByRole('button', { name: 'Approve' })) as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
    expect(screen.getByText(/not separately accepted/i)).toBeTruthy();
    expect(screen.queryByText(/Decide every proposed finding/)).toBeNull();
  });

  it('orders editable report sections like the generated PDF and keeps them separate', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.listEvidence.mockResolvedValue([]);

    renderPage();
    await screen.findByRole('heading', { name: 'Identification' });

    const headings = [...document.querySelectorAll('h2')].map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Identification',
      'Executive summary',
      'Limitations and omissions',
      'Purpose, scope and criteria',
      'Method, equipment and conditions',
      'Evidence register',
      'Confirmed findings',
      'Conclusions and recommendations',
      'Appendices',
      'Approval and revisions',
    ]);
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
      expect(mockedApi.reviewVersion).toHaveBeenCalledWith('inspection-1', 'version-1', false, 'The east face coverage is not disclosed', 'TEXT_REVISION'),
    );
  });

  it('lets the Organization Admin return the whole report for a findings/evidence revision', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);
    mockedApi.listFindings.mockResolvedValue([]);

    renderPage();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'What needs revision?' }));
    fireEvent.click(screen.getByRole('option', { name: /Findings\/evidence/ }));
    fireEvent.change(screen.getByLabelText('Reason for return'), { target: { value: 'Revisit the evidence and findings.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Return with reason' }));

    await waitFor(() =>
      expect(mockedApi.reviewVersion).toHaveBeenCalledWith(
        'inspection-1',
        'version-1',
        false,
        'Revisit the evidence and findings.',
        'FINDINGS_REVISION',
      ),
    );
  });

  it('lets the Inspector withdraw a submitted report before report-level reviewer action', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([version({ status: 'SUBMITTED', authorUserId: 'user-1' })]);
    mockedApi.listFindings.mockResolvedValue([finding({ inspectorConfirmedAt: '2026-10-01T11:00:00Z' })]);
    mockedApi.withdrawVersion.mockResolvedValue(
      version({ status: 'RETURNED', authorUserId: 'user-1', withdrawnByUserId: 'user-1', withdrawnAt: '2026-10-01T12:00:00Z', withdrawalReason: 'Correct the report.' }),
    );

    renderPage();
    fireEvent.change(await screen.findByLabelText('Reason for withdrawal'), { target: { value: 'Correct the report.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw submission and revise' }));

    await waitFor(() =>
      expect(mockedApi.withdrawVersion).toHaveBeenCalledWith('inspection-1', 'version-1', 'Correct the report.'),
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

  it('reveals the MF3-12 outcomes as soon as the reviewer publishes the version', async () => {
    // The inspection only reaches REPORT_PUBLISHED through the publish call, so the page has to
    // refetch the workflow state; without that the corrective-outcome pointer stays hidden until a
    // manual reload even though the page tells the reviewer to record outcomes.
    mockedApi.listVersions
      .mockResolvedValueOnce([version({ status: 'APPROVED', authorUserId: 'someone-else' })])
      .mockResolvedValue([
        version({
          status: 'PUBLISHED',
          authorUserId: 'someone-else',
          publishedAt: '2026-10-01T12:00:00Z',
        }),
      ]);
    mockedApi.workflowState
      .mockResolvedValueOnce({
        status: 'REPORT_DRAFT',
        findingsConfirmedByUserId: 'inspector-1',
        findingsConfirmedAt: '2026-10-01T11:00:00Z',
        findingsSnapshotHash: 'abc123',
      })
      .mockResolvedValue({
        status: 'REPORT_PUBLISHED',
        findingsConfirmedByUserId: 'inspector-1',
        findingsConfirmedAt: '2026-10-01T11:00:00Z',
        findingsSnapshotHash: 'abc123',
      });
    mockedApi.listFindings.mockResolvedValue([finding({})]);
    mockedApi.publishVersion.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: [],
      inspectionStatus: 'REPORT_PUBLISHED',
    });

    renderPage();

    expect(screen.queryByText(/Send to Maintenance \(MF3-12\)/)).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish immutable version' }));

    expect(await screen.findByText(/Send to Maintenance \(MF3-12\)/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /send findings to maintenance/i }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record corrective action' })).toBeNull();
  });

  it('returns to the reports queue on the inspections list', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);

    setRole(['ORG_ADMIN']);
    renderPage('/client/reports/inspection-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Back to review queue' }));

    expect(screen.getByTestId('location').textContent).toBe(
      '/client/inspections?view=reports',
    );
  });
});
