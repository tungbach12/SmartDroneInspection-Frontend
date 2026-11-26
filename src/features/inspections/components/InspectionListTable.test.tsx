import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InspectionListTable } from './InspectionListTable';
import type { InspectionListItem } from '../api/inspectionApi';

describe('InspectionListTable action menu', () => {
  const baseRow: InspectionListItem = {
    id: 'insp-actions',
    ownerCustomerId: 'cust-1',
    assetId: 'asset-1',
    assetName: 'Bridge inspection',
    inspectorId: 'ins-1',
    plannedStartAt: '2026-12-20T01:00:00Z',
    plannedEndAt: '2026-12-20T03:00:00Z',
    status: 'SCHEDULED',
    assignmentStatus: 'PENDING_ACCEPTANCE',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
    pendingAction: 'NONE',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };

  const renderTable = (props: Partial<ComponentProps<typeof InspectionListTable>> = {}) =>
    render(
      <InspectionListTable
        rows={[baseRow]}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
        {...props}
      />,
    );

  it('offers Inspector acceptance actions only for a pending scheduled assignment', () => {
    renderTable({
      roleView: 'inspector',
      onAccept: vi.fn(),
      onDecline: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inspection actions' }));
    expect(screen.getByRole('menuitem', { name: 'Accept mission' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Decline mission' })).toBeTruthy();
  });

  it('offers dispatch actions only when explicitly enabled for a Manager', () => {
    const callbacks = {
      onReschedule: vi.fn(),
      onReassign: vi.fn(),
      onCancelInspection: vi.fn(),
      onForceAbort: vi.fn(),
    };
    renderTable({ roleView: 'manager', ...callbacks });

    fireEvent.click(screen.getByRole('button', { name: 'Inspection actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Reschedule' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Reassign Inspector & Drone' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Cancel inspection' })).toBeNull();

    cleanup();
    renderTable({ roleView: 'manager', canDispatch: true, ...callbacks });
    fireEvent.click(screen.getByRole('button', { name: 'Inspection actions' }));
    expect(screen.getByRole('menuitem', { name: 'Reschedule' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Reassign Inspector & Drone' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Cancel inspection' })).toBeTruthy();
  });

  it('keeps row clicks opening the workspace while menu selection runs only its action', () => {
    const onOpen = vi.fn();
    const onOverview = vi.fn();
    renderTable({ onOpen, onOverview });

    const row = screen.getByRole('row', { name: /Bridge inspection/ });
    fireEvent.click(row);
    expect(onOpen).toHaveBeenCalledWith(baseRow.id);

    fireEvent.click(screen.getByRole('button', { name: 'Inspection actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Overview' }));
    expect(onOverview).toHaveBeenCalledWith(baseRow.id);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('InspectionListTable multi-day schedule formatting', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows both start and end dates when an inspection spans multiple days', () => {
    const rows: InspectionListItem[] = [
      {
        id: 'insp-3day',
        ownerCustomerId: 'cust-1',
        assetId: 'asset-1',
        assetName: 'Cau Nhat Tan',
        assetCode: 'BRIDGE-NHAT-TAN',
        inspectorId: 'ins-1',
        plannedStartAt: '2026-12-20T01:00:00Z',
        plannedEndAt: '2026-12-23T03:00:00Z',
        status: 'SCHEDULED',
        reportId: null,
        reportStatus: null,
        reportVersionNo: null,
        pendingAction: 'NONE',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    render(
      <InspectionListTable
        rows={rows}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(/Dec 20\s*[–-]\s*Dec 23,\s*2026/)).toBeTruthy();
  });

  it('shows one primary status chip for pending acceptance with Scheduled as secondary text', () => {
    const rows: InspectionListItem[] = [
      {
        id: 'insp-pending',
        ownerCustomerId: 'cust-1',
        assetId: 'asset-1',
        assetName: 'Wind Turbine Unit WTG-07',
        assetCode: 'WT-07',
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
    ];

    const { container } = render(
      <InspectionListTable
        rows={rows}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText('Pending acceptance')).toBeTruthy();
    expect(screen.getByText(/Scheduled/)).toBeTruthy();
    // Only one status chip in the row (asset code badge removed)
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(1);
  });

  it('shows role-scoped counterpart/drone columns and Customer payment instead of Net Payout', () => {
    const richRow: InspectionListItem = {
      id: 'insp-roles',
      ownerCustomerId: 'cust-1',
      ownerCustomerName: 'Saigon Infrastructure Co.',
      ownerCustomerAvatarUrl: 'https://cdn.example.com/customer.png',
      assetId: 'asset-1',
      assetName: 'Cau Nhat Tan - Tru Thap & Day Vang',
      assetCode: 'CNT-01',
      inspectorId: 'ins-1',
      inspectorName: 'Pham Van Bay',
      inspectorAvatarUrl: 'https://cdn.example.com/inspector.png',
      managerName: 'Tran Minh Quan Ly',
      droneModel: 'DJI Matrice 350 RTK',
      droneSerialNumber: '1581F4B0C2301009',
      plannedStartAt: '2026-12-20T01:00:00Z',
      plannedEndAt: '2026-12-20T03:00:00Z',
      status: 'FIELD_COMPLETED',
      reportId: null,
      reportStatus: null,
      reportVersionNo: null,
      pendingAction: 'NONE',
      paymentAmount: 25000000,
      paymentStatus: 'PAYMENT_DUE',
      inspectorNetPayout: 18000000,
      payoutStatus: 'ELIGIBLE',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };

    const { rerender } = render(
      <InspectionListTable
        rows={[richRow]}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
        roleView="inspector"
      />,
    );

    expect(screen.getByText('Customer & Drone')).toBeTruthy();
    expect(screen.getByText('Saigon Infrastructure Co.')).toBeTruthy();
    expect(document.querySelector('img[src="https://cdn.example.com/customer.png"]')).toBeTruthy();
    expect(screen.getByText('DJI Matrice 350 RTK · 1581F4B0C2301009')).toBeTruthy();
    expect(screen.getByText('Net Payout')).toBeTruthy();
    expect(screen.getByText('Eligible')).toBeTruthy();

    rerender(
      <InspectionListTable
        rows={[richRow]}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
        roleView="manager"
      />,
    );

    expect(screen.getByText('Inspector & Drone')).toBeTruthy();
    expect(screen.getByText('Pham Van Bay')).toBeTruthy();
    expect(document.querySelector('img[src="https://cdn.example.com/inspector.png"]')).toBeTruthy();
    expect(screen.getByText('Customer: Saigon Infrastructure Co.')).toBeTruthy();
    expect(screen.getByText('Platform Fee')).toBeTruthy();

    rerender(
      <InspectionListTable
        rows={[richRow]}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
        roleView="customer"
      />,
    );

    expect(screen.getByText('Assigned Partner')).toBeTruthy();
    expect(screen.getByText('Manager: Tran Minh Quan Ly')).toBeTruthy();
    expect(screen.getByText('Payment')).toBeTruthy();
    expect(screen.getByText('Payment due')).toBeTruthy();
    expect(screen.queryByText('Net Payout')).toBeNull();
  });

  it('rounds VND platform fees without decimals and folds report version into stage when report column is hidden', () => {
    const managerRow: InspectionListItem = {
      id: 'insp-round',
      ownerCustomerId: 'cust-1',
      ownerCustomerName: 'Saigon Infrastructure Co.',
      assetId: 'asset-1',
      assetName: 'Highlands Coffee',
      assetCode: 'AST-3JPWR',
      inspectorId: 'ins-1',
      inspectorName: 'Do Thi Phi Cong',
      droneModel: 'DJI Matrice 30T',
      plannedStartAt: '2026-11-23T07:38:00Z',
      plannedEndAt: '2026-11-23T09:38:00Z',
      status: 'COMPLETED',
      reportId: 'rep-1',
      reportStatus: 'PUBLISHED',
      reportVersionNo: 1,
      pendingAction: 'NONE',
      paymentAmount: 12000000,
      commissionRate: 15,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };

    const onSearchChange = vi.fn();
    const onSortOrderChange = vi.fn();

    render(
      <InspectionListTable
        rows={[managerRow]}
        page={1}
        pageSize={10}
        totalCount={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
        roleView="manager"
        searchQuery="Highlands"
        onSearchChange={onSearchChange}
        sortOrder="DEFAULT"
        onSortOrderChange={onSortOrderChange}
        sortOptions={[
          { value: 'DEFAULT', label: 'Default order' },
          { value: 'AMOUNT_DESC', label: 'Highest value' },
        ]}
      />,
    );

    expect(screen.queryByText('Report')).toBeNull();
    expect(screen.queryByText('AST-3JPWR')).toBeNull();
    expect(screen.queryByText(/\bv1\b/)).toBeNull();
    expect(screen.getByText('+1,636,364 ₫')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onSearchChange).toHaveBeenCalledWith('');

    fireEvent.mouseDown(screen.getByLabelText('Sort inspections'));
    fireEvent.click(screen.getByRole('option', { name: 'Highest value' }));
    expect(onSortOrderChange).toHaveBeenCalledWith('AMOUNT_DESC');
  });
});
