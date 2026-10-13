import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import ReportDetailPage from './ReportDetailPage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';

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

describe('ReportDetailPage MF3 gates', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.listEvidence.mockResolvedValue([]);
    setRole(['ORG_ADMIN']);
  });

  it('offers approve and return-with-reason to the reviewer on a submitted version', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);

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

  it('hides review actions from an Inspector', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([version({})]);

    renderPage();

    await screen.findByText(/The north span was surveyed/);
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByLabelText('Reason for return')).toBeNull();
  });

  it('reports a no-repair publication without inventing corrective work', async () => {
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'APPROVED', authorUserId: 'someone-else' }),
    ]);
    mockedApi.publishVersion.mockResolvedValue({
      reportVersionId: 'version-1',
      versionNo: 1,
      publishedAt: '2026-10-01T12:00:00Z',
      repairRequiredFindingIds: [],
      inspectionStatus: 'COMPLETED',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish immutable version' }));

    await waitFor(() =>
      expect(screen.getByText(/No corrective work was required/)).toBeTruthy(),
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
