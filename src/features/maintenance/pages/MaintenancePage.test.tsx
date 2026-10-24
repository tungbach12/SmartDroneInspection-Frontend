import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roles = vi.hoisted(() => ({ current: ['MAINTENANCE_ENGINEER'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: roles.current }),
}));

const mocks = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  listTeam: vi.fn(),
  listTasks: vi.fn(),
  listWorkLogs: vi.fn(),
  listEstimateVersions: vi.fn(),
  listChanges: vi.fn(),
  listReportVersions: vi.fn(),
  listAcceptanceDecisions: vi.fn(),
  reconciliationSummary: vi.fn(),
  markReady: vi.fn(),
  markInProgress: vi.fn(),
  markWorkCompleted: vi.fn(),
  resumeAfterRework: vi.fn(),
  recordWork: vi.fn(),
  submitWorkLog: vi.fn(),
  createTask: vi.fn(),
  createEstimateVersion: vi.fn(),
  submitEstimate: vi.fn(),
  approveEstimate: vi.fn(),
  rejectEstimate: vi.fn(),
  proposeChange: vi.fn(),
  approveChange: vi.fn(),
  rejectChange: vi.fn(),
  returnChange: vi.fn(),
  createReportVersion: vi.fn(),
  verifyReport: vi.fn(),
  submitReport: vi.fn(),
  recordAcceptance: vi.fn(),
  reconcile: vi.fn(),
  close: vi.fn(),
  repairCandidates: vi.fn(),
  suggestScope: vi.fn(),
  createWorkOrder: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock('../api/maintenanceApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/maintenanceApi')>();
  return {
    ...actual,
    maintenanceApi: {
      ...actual.maintenanceApi,
      listWorkOrders: mocks.listWorkOrders,
      listTeam: mocks.listTeam,
      listTasks: mocks.listTasks,
      listWorkLogs: mocks.listWorkLogs,
      listEstimateVersions: mocks.listEstimateVersions,
      listChanges: mocks.listChanges,
      listReportVersions: mocks.listReportVersions,
      listAcceptanceDecisions: mocks.listAcceptanceDecisions,
      reconciliationSummary: mocks.reconciliationSummary,
      markReady: mocks.markReady,
      markInProgress: mocks.markInProgress,
      markWorkCompleted: mocks.markWorkCompleted,
      resumeAfterRework: mocks.resumeAfterRework,
      recordWork: mocks.recordWork,
      submitWorkLog: mocks.submitWorkLog,
      createTask: mocks.createTask,
      createEstimateVersion: mocks.createEstimateVersion,
      submitEstimate: mocks.submitEstimate,
      approveEstimate: mocks.approveEstimate,
      rejectEstimate: mocks.rejectEstimate,
      proposeChange: mocks.proposeChange,
      approveChange: mocks.approveChange,
      rejectChange: mocks.rejectChange,
      returnChange: mocks.returnChange,
      createReportVersion: mocks.createReportVersion,
      verifyReport: mocks.verifyReport,
      submitReport: mocks.submitReport,
      recordAcceptance: mocks.recordAcceptance,
      reconcile: mocks.reconcile,
      close: mocks.close,
      repairCandidates: mocks.repairCandidates,
      suggestScope: mocks.suggestScope,
      createWorkOrder: mocks.createWorkOrder,
    },
  };
});

vi.mock('@/features/workforce/hooks/useWorkforce', () => ({
  useWorkforceUsers: () => ({ data: mocks.listUsers() }),
}));

import MaintenancePage from './MaintenancePage';

const WORK_ORDER = {
  id: 'wo-1',
  assetId: 'asset-1',
  sourceReportVersionId: 'rv-1',
  sourceFindingId: 'f-1',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  dueAt: '2026-11-01T00:00:00Z',
  correctiveScope: 'Replace corroded girder splice on span 4',
  acceptanceCriteria: 'Load test passes per ASCE',
  ownerUserId: null,
  budgetApproverUserId: 'admin-1',
  teamLeadUserId: 'eng-1',
  reportAuthorUserId: 'eng-1',
  acceptingReviewerUserId: 'admin-1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
};

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roles.current = ['MAINTENANCE_ENGINEER'];
    mocks.listWorkOrders.mockResolvedValue({
      items: [WORK_ORDER],
      page: 0,
      size: 20,
      total: 1,
    });
    mocks.listTeam.mockResolvedValue([]);
    mocks.listTasks.mockResolvedValue([]);
    mocks.listWorkLogs.mockResolvedValue([]);
    mocks.listEstimateVersions.mockResolvedValue([]);
    mocks.listChanges.mockResolvedValue([]);
    mocks.listReportVersions.mockResolvedValue([]);
    mocks.listAcceptanceDecisions.mockResolvedValue([]);
    mocks.repairCandidates.mockResolvedValue([]);
    mocks.reconciliationSummary.mockResolvedValue({
      approvedBaselineTotal: '1000000',
      approvedChangeDelta: '0',
      authorizedAmount: '1000000',
      actualTotal: '950000',
      variance: '-50000',
      variancePercent: '-5.0',
      currency: 'VND',
    });
    mocks.listUsers.mockReturnValue([
      {
        userId: 'eng-1',
        email: 'lead@example.test',
        fullName: 'Lead Engineer',
        roles: ['MAINTENANCE_ENGINEER'],
        status: 'ACTIVE',
        organizationId: 'org-1',
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('lists the organization work orders with their scope and status', async () => {
    renderWithClient();

    expect(await screen.findByText('Replace corroded girder splice on span 4')).toBeTruthy();
    expect(screen.getByText('IN_PROGRESS')).toBeTruthy();
    expect(screen.getByLabelText('Total Work Orders: 1')).toBeTruthy();
  });

  it('opens a work order and shows its corrective scope and gates', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));

    expect(await screen.findByText('Load test passes per ASCE')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark ready' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start execution' })).toBeTruthy();
  });

  it('offers the engineer the execution transitions but not the close action', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));

    expect(await screen.findByRole('button', { name: 'Mark ready' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close work order' })).toBeNull();
  });

  it('offers the administrator the close action only after cost reconciliation', async () => {
    roles.current = ['ORG_ADMIN'];
    mocks.listWorkOrders.mockResolvedValue({
      items: [{ ...WORK_ORDER, status: 'COST_RECONCILED' }],
      page: 0,
      size: 20,
      total: 1,
    });

    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));

    expect(await screen.findByRole('button', { name: 'Close work order' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start execution' })).toBeNull();
  });

  it('records the engineer execution transition through the named action', async () => {
    mocks.markWorkCompleted.mockResolvedValue({ ...WORK_ORDER, status: 'WORK_COMPLETED' });
    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));
    fireEvent.click(await screen.findByRole('button', { name: 'Declare work completed' }));

    await waitFor(() => expect(mocks.markWorkCompleted).toHaveBeenCalledWith('wo-1'));
  });

  it('shows the reconciliation figures the platform computed', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Costs & acceptance' }));

    expect(await screen.findByText('Authorized amount')).toBeTruthy();
    expect(screen.getAllByText('1000000 VND').length).toBeGreaterThan(0);
    expect(screen.getByText('-50000 VND')).toBeTruthy();
  });

  it('offers Submit for verification on IN_PROGRESS work logs and Approve on AWAITING_APPROVAL changes', async () => {
    mocks.listWorkLogs.mockResolvedValue([
      {
        id: 'log-1',
        taskId: 'task-1',
        engineerUserId: 'eng-1',
        startedAt: '2026-10-05T08:00:00Z',
        endedAt: '2026-10-05T10:00:00Z',
        hours: '2',
        actualCostReferences: null,
        asLeftCondition: 'Cleaned and primed',
        testReadings: '225 um',
        status: 'IN_PROGRESS',
      },
    ]);
    mocks.submitWorkLog.mockResolvedValue({
      id: 'log-1',
      status: 'SUBMITTED',
    });

    renderWithClient();

    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Tasks & work' }));

    const submitBtn = await screen.findByRole('button', { name: 'Submit for verification' });
    fireEvent.click(submitBtn);
    await waitFor(() => expect(mocks.submitWorkLog).toHaveBeenCalledWith('wo-1', 'log-1'));
  });

  it('allows ORG_ADMIN to generate AI RAG scope and approve AWAITING_APPROVAL change orders', async () => {
    roles.current = ['ORG_ADMIN'];
    mocks.repairCandidates.mockResolvedValue([
      {
        assetId: 'asset-1',
        inspectionId: 'insp-1',
        reportId: 'rep-1',
        reportVersionId: 'rv-1',
        findingId: 'f-2',
        findingCode: 'F-002',
        defectLabel: 'Concrete crack',
        technicalNotes: '0.4mm crack on pier cap',
        severity: 'HIGH',
        recommendedAction: 'Epoxy injection',
        reportPublishedAt: '2026-10-01T00:00:00Z',
      },
    ]);
    mocks.suggestScope.mockResolvedValue({
      correctiveScope: 'Low-pressure epoxy injection per TCVN 9343:2012',
      acceptanceCriteria: 'UPV recovery >= 90%',
      referenceStandards: ['TCVN 9343:2012'],
      suggestedTasks: [
        {
          taskNumber: 1,
          name: 'Clean crack and install ports',
          method: 'Wire brush and compressed air',
          acceptanceCriteria: 'Clean surface',
        },
      ],
      modelName: 'engineering-standards-fallback',
      fallbackApplied: true,
    });
    mocks.listChanges.mockResolvedValue([
      {
        id: 'chg-1',
        changeNumber: 1,
        reason: 'Additional deeper crack found',
        affectedTasks: null,
        proposedDelta: '50000',
        status: 'AWAITING_APPROVAL',
        requestedByUserId: 'eng-1',
        decidedByUserId: null,
        decidedAt: null,
        decisionReason: null,
      },
    ]);
    mocks.approveChange.mockResolvedValue({ id: 'chg-1', status: 'APPROVED' });

    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Open work order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'AI Suggest Scope & Criteria (RAG)' }));

    await waitFor(() =>
      expect(mocks.suggestScope).toHaveBeenCalledWith(
        expect.objectContaining({
          findingCode: 'F-002',
          defectLabel: 'Concrete crack',
          description: '0.4mm crack on pier cap',
        }),
      ),
    );
    expect(await screen.findByText('TCVN 9343:2012')).toBeTruthy();
    expect(screen.getByText('Clean crack and install ports')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByText('Replace corroded girder splice on span 4'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Changes' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(mocks.approveChange).toHaveBeenCalledWith(
        'wo-1',
        1,
        'Approved by the budget approver',
      ),
    );
  });
});
