import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import ReportsPage from './ReportsPage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';

vi.mock('@/features/inspections/api/inspectionApi', () => ({
  inspectionApi: {
    listVersions: vi.fn(),
    verifyVersion: vi.fn(),
    submitVersion: vi.fn(),
    reviewVersion: vi.fn(),
    publishVersion: vi.fn(),
  },
}));

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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
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
    ...overrides,
  };
}

function loadVersions(inspectionId = 'inspection-1') {
  fireEvent.change(screen.getByLabelText('Inspection ID'), {
    target: { value: inspectionId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Load versions' }));
}

describe('ReportsPage MF3 gates', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setRole(['ORG_ADMIN']);
  });

  it('prompts for an inspection before showing any version', () => {
    renderPage();

    expect(screen.getByText('No inspection selected')).toBeTruthy();
    expect(mockedApi.listVersions).not.toHaveBeenCalled();
  });

  it('offers approve and return-with-reason to the reviewer on a submitted version', async () => {
    mockedApi.listVersions.mockResolvedValue([version({})]);

    renderPage();
    loadVersions();

    expect(await screen.findByText(/Version 1/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();

    // Returning requires a reason, so the button stays disabled until one is typed.
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
    loadVersions();

    expect(await screen.findByText('Immutable')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish immutable version' })).toBeNull();
  });

  it('lets the Inspector author verify a draft', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([
      version({ status: 'DRAFT', authorUserId: 'user-1' }),
    ]);

    renderPage();
    loadVersions();

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
    loadVersions();

    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));
    await waitFor(() =>
      expect(mockedApi.submitVersion).toHaveBeenCalledWith('inspection-1', 'version-1'),
    );
  });

  it('hides review actions from an Inspector', async () => {
    setRole(['INSPECTOR']);
    mockedApi.listVersions.mockResolvedValue([version({})]);

    renderPage();
    loadVersions();

    await screen.findByText(/Version 1/);
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
    loadVersions();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish immutable version' }));

    await waitFor(() =>
      expect(screen.getByText(/No corrective work was required/)).toBeTruthy(),
    );
  });
});