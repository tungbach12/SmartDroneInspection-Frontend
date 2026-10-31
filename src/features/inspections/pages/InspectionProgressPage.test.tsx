import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InspectionProgressPage from './InspectionProgressPage';

const mocks = vi.hoisted(() => ({
  inspectionQuery: {
    data: {
      id: 'inspection-1',
      assetName: 'Cau Nhat Tan',
      inspectorName: 'Nguyen Van A',
      droneModel: 'Matrice 30T',
      status: 'UNDER_REVIEW',
      inspectionType: 'INITIAL',
    },
    isLoading: false,
    error: null,
  },
  workflowQuery: {
    data: { status: 'UNDER_REVIEW' },
    isLoading: false,
    error: null,
  },
  evidenceQuery: {
    data: [{ id: 'ev-1', isDeleted: false }, { id: 'ev-2', isDeleted: false }],
    isLoading: false,
    error: null,
  },
  versionsQuery: {
    data: [] as Array<{ id: string; status: string }>,
    isLoading: false,
    error: null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspection: () => mocks.inspectionQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useReportVersions: () => mocks.versionsQuery,
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    formatDate: (val: Date) => val.toISOString(),
  }),
}));

describe('InspectionProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workflowQuery.data = { status: 'UNDER_REVIEW' };
    mocks.versionsQuery.data = [];
  });

  it('renders asset name and 5-stage lifecycle progress', () => {
    render(
      <MemoryRouter>
        <InspectionProgressPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Cau Nhat Tan').length).toBeGreaterThan(0);
    expect(screen.getByText('Inspection Lifecycle Progress')).toBeTruthy();
    expect(screen.getByText('Aerial drone survey')).toBeTruthy();
    expect(screen.getByText('Evidence intake & AI defect analysis')).toBeTruthy();
    expect(screen.getByText('Technical report review')).toBeTruthy();
    expect(screen.getByText('Official report publication')).toBeTruthy();
  });

  it('shows quality review notice when report is not yet published', () => {
    render(
      <MemoryRouter>
        <InspectionProgressPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Quality Review in Progress').length).toBeGreaterThan(0);
    expect(screen.queryByText('View official report')).toBeNull();
  });

  it('displays view official report button when report is published', () => {
    mocks.versionsQuery.data = [{ id: 'v1', status: 'PUBLISHED' }];
    render(
      <MemoryRouter>
        <InspectionProgressPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Official report has been published!')).toBeTruthy();
    expect(screen.getAllByText('View official report').length).toBeGreaterThan(0);
  });
});
