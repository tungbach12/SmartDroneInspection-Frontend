import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssignmentsLedger } from './AssignmentsLedger';
import type { InspectionListItem } from '../api/inspectionApi';

describe('AssignmentsLedger', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps acceptance badge primary and renders operational state as quiet secondary text', () => {
    const rows: InspectionListItem[] = [
      {
        id: 'insp-pending',
        ownerCustomerId: 'cust-1',
        assetId: 'asset-1',
        assetName: 'Wind Turbine Unit WTG-07',
        assetCode: 'WT-07',
        assetLocation: 'Tuy Phong, Binh Thuan',
        inspectorId: 'ins-1',
        plannedStartAt: '2026-12-26T01:00:00Z',
        plannedEndAt: '2026-12-28T10:00:00Z',
        status: 'SCHEDULED',
        assignmentStatus: 'PENDING_ACCEPTANCE',
        reportId: null,
        reportStatus: null,
        reportVersionNo: null,
        pendingAction: 'NONE',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'insp-accepted',
        ownerCustomerId: 'cust-1',
        assetId: 'asset-2',
        assetName: 'Cau Nhat Tan',
        assetCode: 'BRIDGE-01',
        inspectorId: 'ins-1',
        plannedStartAt: '2026-12-20T01:00:00Z',
        plannedEndAt: '2026-12-20T03:00:00Z',
        status: 'SCHEDULED',
        assignmentStatus: 'ACCEPTED',
        reportId: null,
        reportStatus: null,
        reportVersionNo: null,
        pendingAction: 'NONE',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];
    rows.push({
      ...rows[0]!,
      id: 'insp-cancelled',
      assetName: 'Cancelled inspection',
      assetCode: 'BRIDGE-02',
      plannedStartAt: '2026-12-21T01:00:00Z',
      plannedEndAt: '2026-12-21T03:00:00Z',
      status: 'CANCELLED',
      assignmentStatus: 'DECLINED',
    });

    const onAccept = vi.fn();
    const { container } = render(
      <AssignmentsLedger
        rows={rows}
        onAccept={onAccept}
        onDecline={vi.fn()}
        onOverview={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText('Pending acceptance')).toBeTruthy();
    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.getAllByText('Scheduled')).toHaveLength(2);
    expect(screen.getByText(/Dec 26\s*[–-]\s*Dec 28,\s*2026/)).toBeTruthy();

    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledWith('insp-pending');

    fireEvent.click(screen.getByRole('tab', { name: /Declined/ }));
    expect(screen.queryByText('Cancelled inspection')).toBeNull();
  });
});
