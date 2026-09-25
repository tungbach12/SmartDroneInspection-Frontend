import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reportQuery: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() },
  assign: { mutate: vi.fn(), isPending: false, error: null },
  submit: { mutate: vi.fn(), isPending: false, error: null },
  review: { mutate: vi.fn(), isPending: false, error: null },
  release: { mutate: vi.fn(), isPending: false, error: null },
  decision: { mutate: vi.fn(), isPending: false, error: null },
  revision: { mutate: vi.fn(), isPending: false, error: null },
}));

vi.mock('../hooks/useReports', () => ({
  useReports: () => mocks.reportQuery,
  useAssignReportReviewer: () => mocks.assign,
  useSubmitReportForReview: () => mocks.submit,
  useReviewReport: () => mocks.review,
  useReleaseReport: () => mocks.release,
  useClientReportDecision: () => mocks.decision,
  useCreateReportRevision: () => mocks.revision,
}));

vi.mock('../api/reportApi', () => ({
  reportApi: { evidenceContent: vi.fn() },
}));

import ReportsPage from './ReportsPage';
import { useAuthStore } from '@/features/auth/store/authStore';

const releasedReport = {
  reportId: 'report-1',
  versionId: 'version-1',
  versionNumber: 1,
  inspectionId: 'inspection-1',
  authorUserId: 'author-1',
  sourceVersionId: null,
  reportStatus: 'RELEASED',
  versionStatus: 'RELEASED',
  contentSnapshot: {
    inspectionId: 'inspection-1',
    serviceOrderId: 'order-1',
    assetId: 'asset-1',
    checklistTemplateId: 'template-1',
    checklistName: 'Bridge inspection',
    generatedAt: '2026-09-24T00:00:00Z',
    checklist: [],
    findings: [],
    evidence: [],
  },
  review: null,
  createdAt: '2026-09-24T00:00:00Z',
  releasedAt: '2026-09-24T00:00:00Z',
  acceptedAt: null,
  clientDecisionByUserId: null,
  clientDecisionReason: null,
};

describe('ReportsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'client-1',
        email: 'client@example.test',
        fullName: 'Client',
        roles: ['CLIENT'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
    mocks.reportQuery = { data: [releasedReport], isLoading: false, error: null, refetch: vi.fn() };
    mocks.decision.mutate.mockReset();
  });

  afterEach(() => useAuthStore.getState().clearSession());

  it('shows only the released version actions to a Client and submits the decision', () => {
    render(<ReportsPage />);

    expect(screen.getByText('Bridge inspection')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accept report' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request revision' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Release approved version' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Accept report' }));
    expect(mocks.decision.mutate).toHaveBeenCalledWith({
      reportId: 'report-1',
      versionId: 'version-1',
      decision: 'ACCEPT',
    });
  });

  it('shows a loading state while the report list is being fetched', () => {
    mocks.reportQuery = { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
    render(<ReportsPage />);
    expect(screen.getByText('Loading records…')).toBeTruthy();
  });
});
