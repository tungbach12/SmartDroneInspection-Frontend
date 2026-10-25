import { api } from '@/shared/api/client';

export type PlatformDroneStatus =
  | 'AVAILABLE'
  | 'LEASED'
  | 'MAINTENANCE'
  | 'RETIRED';

export type DroneLeaseStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'RECLAIMED'
  | 'CANCELLED';

export interface PlatformDrone {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string | null;
  payloadMetadata: string | null;
  monthlyRateUsd: number;
  status: PlatformDroneStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DroneLease {
  id: string;
  platformDroneId: string;
  serialNumber?: string | null;
  droneSerialNumber?: string | null;
  model?: string | null;
  droneModel?: string | null;
  manufacturer?: string | null;
  droneManufacturer?: string | null;
  organizationId: string;
  organizationName: string | null;
  customerDroneId: string | null;
  requestedByUserId?: string | null;
  leasePeriodMonths: number;
  monthlyRateUsd: number;
  agreedAmountUsd: number;
  status: DroneLeaseStatus;
  startsAt: string | null;
  endsAt: string | null;
  reclaimedAt: string | null;
  externalReference: string | null;
  wireReferenceCode: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformDroneInput {
  serialNumber: string;
  model: string;
  manufacturer?: string | undefined;
  payloadMetadata?: string | undefined;
  monthlyRateUsd: number;
  notes?: string | undefined;
}

export interface UpdatePlatformDroneStatusInput {
  status: PlatformDroneStatus;
  notes?: string | undefined;
}

export interface ConfirmDroneLeasePaymentInput {
  externalReference: string;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  agreedAmountUsd?: number | undefined;
  notes?: string | undefined;
}

export interface ReclaimDroneLeaseInput {
  notes?: string | undefined;
}

export interface CreateDroneLeaseInput {
  platformDroneId: string;
  leasePeriodMonths: number;
  notes?: string | undefined;
}

export interface PayPalLeaseOrderResponse {
  orderId: string;
  paypalOrderId?: string;
  status: string;
  approvalUrl: string | null;
}

export interface CapturePayPalLeaseOrderInput {
  paypalOrderId: string;
}

export const droneLeaseKeys = {
  all: ['drone-leases'] as const,
  pool: () => [...droneLeaseKeys.all, 'pool'] as const,
  platformLeases: (status?: string) =>
    [...droneLeaseKeys.all, 'platform', status ?? 'ALL'] as const,
  availableDrones: () => [...droneLeaseKeys.all, 'available-drones'] as const,
  organizationLeases: () => [...droneLeaseKeys.all, 'organization'] as const,
};

export const droneLeaseApi = {
  // Platform endpoints
  listPool: async (): Promise<PlatformDrone[]> => {
    const response = await api.get<PlatformDrone[]>('/platform/drone-leases/pool');
    return response.data;
  },

  createPoolDrone: async (input: CreatePlatformDroneInput): Promise<PlatformDrone> => {
    const response = await api.post<PlatformDrone>('/platform/drone-leases/pool', input);
    return response.data;
  },

  updatePoolDroneStatus: async (
    id: string,
    input: UpdatePlatformDroneStatusInput,
  ): Promise<PlatformDrone> => {
    const response = await api.patch<PlatformDrone>(
      `/platform/drone-leases/pool/${id}/status`,
      input,
    );
    return response.data;
  },

  listPlatformLeases: async (status?: string): Promise<DroneLease[]> => {
    const params = status && status !== 'ALL' ? { status } : {};
    const response = await api.get<DroneLease[]>('/platform/drone-leases', { params });
    return response.data;
  },

  confirmPayment: async (
    leaseId: string,
    input: ConfirmDroneLeasePaymentInput,
  ): Promise<DroneLease> => {
    const response = await api.post<DroneLease>(
      `/platform/drone-leases/${leaseId}/confirm-payment`,
      input,
    );
    return response.data;
  },

  reclaimLease: async (
    leaseId: string,
    input?: ReclaimDroneLeaseInput,
  ): Promise<DroneLease> => {
    const response = await api.post<DroneLease>(
      `/platform/drone-leases/${leaseId}/reclaim`,
      input ?? {},
    );
    return response.data;
  },

  // Customer (ORG_MANAGER) endpoints
  listAvailableDrones: async (): Promise<PlatformDrone[]> => {
    const response = await api.get<PlatformDrone[]>('/drone-leases/available-drones');
    return response.data;
  },

  listOrganizationLeases: async (): Promise<DroneLease[]> => {
    const response = await api.get<DroneLease[]>('/drone-leases');
    return response.data;
  },

  requestLease: async (input: CreateDroneLeaseInput): Promise<DroneLease> => {
    const response = await api.post<DroneLease>('/drone-leases', input);
    return response.data;
  },

  createPayPalOrder: async (leaseId: string): Promise<PayPalLeaseOrderResponse> => {
    const response = await api.post<PayPalLeaseOrderResponse>(
      `/drone-leases/${leaseId}/paypal/create-order`,
    );
    return response.data;
  },

  capturePayPalOrder: async (
    leaseId: string,
    input: CapturePayPalLeaseOrderInput,
  ): Promise<DroneLease> => {
    const response = await api.post<DroneLease>(
      `/drone-leases/${leaseId}/paypal/capture-order`,
      input,
    );
    return response.data;
  },
};
