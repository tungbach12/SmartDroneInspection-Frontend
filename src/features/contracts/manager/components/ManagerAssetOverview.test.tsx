import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { ServiceRequest } from '../../api/contractApi';
import { ManagerAssetOverview } from './ManagerAssetOverview';

const useAssetMock = vi.fn();
const usePartnerDronesMock = vi.fn();

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAsset: (id: string) => useAssetMock(id),
}));
vi.mock('../../hooks/useContracts', () => ({
  usePartnerDrones: (enabled?: boolean) => usePartnerDronesMock(enabled),
}));
vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'en',
    formatDate: (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
        value.getDate(),
      ).padStart(2, '0')}`,
  }),
}));

function assignedRequest(): ServiceRequest {
  return {
    id: 'req-1',
    ownerCustomerId: 'customer-1',
    ownerCustomerName: 'Saigon Infrastructure Co.',
    assetId: 'asset-1',
    description: 'Bridge survey',
    requestedFrom: '2026-12-01',
    requestedUntil: '2026-12-01',
    timezone: 'Asia/Ho_Chi_Minh',
    windowStart: '08:00',
    windowEnd: '17:00',
    requestType: 'ONE_TIME',
    recurrenceUnit: null,
    recurrenceInterval: null,
    occurrenceCount: null,
    recurrenceEndDate: null,
    status: 'ASSIGNED',
    acceptedQuoteId: 'quote-1',
    acceptedAt: '2026-11-20T00:00:00Z',
    acceptedByUserId: 'customer-1',
    acceptedTermsSnapshot: {},
    contractFileName: 'signed-contract.pdf',
    contractContentType: 'application/pdf',
    contractSizeBytes: 1024,
    contractUploadedAt: '2026-11-20T00:00:00Z',
    createdAt: '2026-11-19T00:00:00Z',
    currentQuote: null,
    assignedManagerId: 'manager-1',
    managerAssignedAt: '2026-11-19T00:00:00Z',
    managerAssignedByUserId: 'manager-1',
    serviceManager: null,
    canClaim: false,
    occurrences: [
      {
        id: 'occ-1',
        occurrenceIndex: 1,
        plannedStartAt: '2026-12-01T01:00:00Z',
        plannedEndAt: '2026-12-01T03:00:00Z',
        status: 'ASSIGNED',
        inspectorId: 'inspector-1',
        droneId: 'drone-1',
        inspectionId: 'inspection-1',
        assignedAt: '2026-11-20T00:00:00Z',
        invoice: null,
        payment: null,
        payout: null,
      },
    ],
    messages: [],
    sourceInspectionId: null,
  } as unknown as ServiceRequest;
}

describe('ManagerAssetOverview', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    useAssetMock.mockReturnValue({
      data: { id: 'asset-1', name: 'Bridge 1', code: 'BR-1', status: 'ACTIVE' },
      isPending: false,
    });
    usePartnerDronesMock.mockReturnValue({
      data: [{ id: 'drone-1', model: 'DJI M300', serialNumber: 'SN-001' }],
      isPending: false,
    });
  });

  it('shows the asset and request context above every workflow step', () => {
    render(<ManagerAssetOverview request={assignedRequest()} />);

    expect(screen.getByText('Bridge 1')).toBeTruthy();
    expect(screen.getByText('BR-1')).toBeTruthy();
    expect(screen.getByText('Saigon Infrastructure Co.')).toBeTruthy();
    expect(screen.getByText('Platform Manager')).toBeTruthy();
    expect(screen.getByText('DJI M300 · SN-001')).toBeTruthy();
    expect(screen.getByText('2026-12-01 · 08:00 – 17:00')).toBeTruthy();
  });

  it('collapses and expands the overview details', () => {
    render(<ManagerAssetOverview request={assignedRequest()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByText('Saigon Infrastructure Co.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByText('Saigon Infrastructure Co.')).toBeTruthy();
  });
});
