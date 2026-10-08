import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaintenancePage from './MaintenancePage';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  ticketsQuery: {
    data: {
      content: [
        {
          id: 'ticket-1',
          organizationId: 'org-1',
          assetId: 'asset-1',
          acceptedReportVersionId: 'ver-1',
          priority: 'HIGH' as const,
          status: 'ORDER_CONFIRMED',
          resolutionDecision: null,
          preferredDeadline: null,
          createdAt: new Date().toISOString(),
          acceptedAt: null,
          closedAt: null,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    },
    isLoading: false,
    error: null,
  },
  quotationsQuery: { data: [], isLoading: false, error: null },
  ordersQuery: { data: [], isLoading: false, error: null },
  workLogsQuery: { data: [], isLoading: false, error: null },
  confirmPayment: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../hooks/useMaintenance', () => ({
  useMaintenanceTickets: () => mocks.ticketsQuery,
  useMaintenanceQuotations: () => mocks.quotationsQuery,
  useMaintenanceOrders: () => mocks.ordersQuery,
  useMaintenanceWorkLogs: () => mocks.workLogsQuery,
  useConfirmMaintenancePayment: () => mocks.confirmPayment,
  useCreateMaintenanceTicket: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApproveMaintenanceQuotation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRejectMaintenanceQuotation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateMaintenanceOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAcceptMaintenanceCompletion: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('MaintenancePage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'client-1',
        email: 'client@example.test',
        fullName: 'Client User',
        roles: ['CLIENT'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
  });

  it('renders maintenance header and lists tickets for client', () => {
    render(<MaintenancePage />);

    expect(screen.getByText('Maintenance & Defect Rectification')).toBeTruthy();
    expect(screen.getByText('Create Maintenance Ticket')).toBeTruthy();
    expect(screen.getByText(/Ticket #ticket-1/i)).toBeTruthy();
  });
});
