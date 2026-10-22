import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { maintenanceApi } from './maintenanceApi';

describe('maintenanceApi', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches repair candidates from backend endpoint', async () => {
    const mockCandidates = [
      {
        assetId: 'asset-1',
        inspectionId: 'insp-1',
        reportId: 'rep-1',
        reportVersionId: 'ver-1',
        findingId: 'fnd-1',
        findingCode: 'FND-001',
        defectLabel: 'Crack on beam',
        description: 'Deep structural crack',
        severity: 'HIGH',
        recommendedAction: 'Replace beam support',
        reportPublishedAt: '2026-10-14T00:00:00Z',
      },
    ];

    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockCandidates } as never);

    const result = await maintenanceApi.getRepairCandidates();

    expect(getSpy).toHaveBeenCalledWith('/maintenance/repair-candidates');
    expect(result).toEqual(mockCandidates);
  });

  it('lists work orders with pagination parameters', async () => {
    const mockPage = {
      items: [],
      page: 1,
      size: 10,
      total: 0,
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockPage } as never);

    const result = await maintenanceApi.listWorkOrders({ page: 1, size: 10 });

    expect(getSpy).toHaveBeenCalledWith('/maintenance/work-orders', {
      params: { page: 1, size: 10 },
    });
    expect(result).toEqual(mockPage);
  });

  it('fetches single work order by id', async () => {
    const mockWorkOrder = {
      id: 'wo-1',
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      status: 'APPROVED',
      priority: 'HIGH',
      dueAt: null,
      correctiveScope: 'Scope A',
      acceptanceCriteria: 'Criteria A',
      ownerUserId: 'user-1',
      budgetApproverUserId: 'user-1',
      teamLeadUserId: 'user-2',
      reportAuthorUserId: 'user-3',
      acceptingReviewerUserId: 'user-4',
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockWorkOrder } as never);

    const result = await maintenanceApi.getWorkOrder('wo-1');

    expect(getSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1');
    expect(result).toEqual(mockWorkOrder);
  });

  it('posts to create a work order', async () => {
    const input = {
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      budgetApproverUserId: 'admin-1',
      priority: 'HIGH' as const,
      correctiveScope: 'Weld support bracket',
    };
    const mockCreated = { id: 'wo-new', ...input };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockCreated } as never);

    const result = await maintenanceApi.createWorkOrder(input);

    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders', input);
    expect(result).toEqual(mockCreated);
  });

  it('posts to assign team to a work order', async () => {
    const input = {
      leadUserId: 'lead-1',
      reportAuthorUserId: 'author-1',
      acceptingReviewerUserId: 'rev-1',
      reason: 'Qualified team',
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'wo-1' } } as never);

    await maintenanceApi.assignTeam('wo-1', input);

    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/team', input);
  });

  it('posts to approve and reject estimates', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { versionNo: 1 } } as never);

    await maintenanceApi.approveEstimate('wo-1', 1);
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/estimate-versions/1/approve',
    );

    await maintenanceApi.rejectEstimate('wo-1', 1, 'Revise labor rate');
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/estimate-versions/1/reject',
      { reason: 'Revise labor rate' },
    );
  });

  it('posts acceptance decision and close order', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'wo-1' } } as never);

    await maintenanceApi.recordAcceptance('wo-1', {
      decision: 'ACCEPTED',
      technicalComments: 'Looks good',
    });
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/acceptance-decisions',
      { decision: 'ACCEPTED', technicalComments: 'Looks good' },
    );

    await maintenanceApi.closeWorkOrder('wo-1');
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/close');
  });

  it('posts task creation, release, and start work order', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'task-1' } } as never);

    await maintenanceApi.createTask('wo-1', { name: 'Inspect weld' });
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/tasks', {
      name: 'Inspect weld',
    });

    await maintenanceApi.releaseWorkOrder('wo-1');
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/release');

    await maintenanceApi.startWorkOrder('wo-1');
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/start');
  });

  it('posts work log recording, submit, verify, and complete', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'log-1' } } as never);

    await maintenanceApi.recordWorkLog('wo-1', { taskId: 'task-1', hours: 2 });
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/work-logs', {
      taskId: 'task-1',
      hours: 2,
    });

    await maintenanceApi.submitWorkLog('wo-1', 'log-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/work-logs/log-1/submit',
    );

    await maintenanceApi.verifyWorkLog('wo-1', 'log-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/work-logs/log-1/verify',
    );

    await maintenanceApi.declareComplete('wo-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/declare-complete',
    );
  });

  it('posts change order proposal and report submission', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { versionNo: 1 } } as never);

    await maintenanceApi.proposeChange('wo-1', {
      reason: 'Extra materials',
      proposedDelta: 100,
    });
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/changes', {
      reason: 'Extra materials',
      proposedDelta: 100,
    });

    await maintenanceApi.createReport('wo-1', { contentSnapshot: '{}' });
    expect(postSpy).toHaveBeenCalledWith('/maintenance/work-orders/wo-1/reports', {
      contentSnapshot: '{}',
    });

    await maintenanceApi.verifyReport('wo-1', 1);
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/reports/1/verify',
    );

    await maintenanceApi.submitReport('wo-1', 1);
    expect(postSpy).toHaveBeenCalledWith(
      '/maintenance/work-orders/wo-1/reports/1/submit',
    );
  });
});
