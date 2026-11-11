import { api } from '@/shared/api/client';

export interface InspectorProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: string;
  actorZone: string;
  citizenId?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
  // Pilot License
  pilotLicenseNumber?: string | null;
  pilotLicenseClass?: string | null;
  pilotLicenseIssuedDate?: string | null;
  pilotLicenseExpiresAt?: string | null;
  pilotLicenseAuthority?: string | null;
  pilotLicenseFileKey?: string | null;
  hasLicenseScan: boolean;
  licenseExpirationStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  licenseRemainingDays?: number | null;
  // Flight Experience
  priorFlightHours: number;
  companyFlightHours: number;
  totalFlightHours: number;
  companyFlightsCount: number;
  certifiedDroneModels?: string | null;
  specializations?: string | null;
  experienceSummary?: string | null;
  // Hybrid Onboarding & Partner Contract
  onboardingStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  partnerContractFileKey?: string | null;
  partnerContractSha256?: string | null;
  partnerContractUploadedAt?: string | null;
  hasPartnerContract?: boolean;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInspectorProfileInput {
  fullName: string;
  phoneNumber?: string | null;
  citizenId?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
  pilotLicenseNumber?: string | null;
  pilotLicenseClass?: string | null;
  pilotLicenseIssuedDate?: string | null;
  pilotLicenseExpiresAt?: string | null;
  pilotLicenseAuthority?: string | null;
  priorFlightHours?: number | null;
  certifiedDroneModels?: string | null;
  specializations?: string | null;
  experienceSummary?: string | null;
}

export interface InspectorFlightLog {
  id: string;
  inspectorUserId: string;
  flightCode: string;
  flightDate: string;
  missionTitle: string;
  droneModel: string;
  droneSerialNumber?: string | null;
  location: string;
  flightDurationMinutes: number;
  flightDurationHours: number;
  inspectionType: string;
  safetyIncident: boolean;
  notes?: string | null;
  recordedByUserId?: string | null;
  createdAt: string;
}

export interface CreateInspectorFlightLogInput {
  flightCode: string;
  flightDate: string;
  missionTitle: string;
  droneModel: string;
  droneSerialNumber?: string | null;
  location: string;
  flightDurationMinutes: number;
  inspectionType: string;
  safetyIncident: boolean;
  notes?: string | null;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : (value as T);
}

export const inspectorProfileApi = {
  list: () =>
    api
      .get<InspectorProfile[] | { data: InspectorProfile[] }>('/platform/inspectors')
      .then((r) => unwrap(r.data)),

  get: (inspectorId: string) =>
    api
      .get<InspectorProfile | { data: InspectorProfile }>(`/platform/inspectors/${inspectorId}`)
      .then((r) => unwrap(r.data)),

  update: (inspectorId: string, input: UpdateInspectorProfileInput) =>
    api
      .put<InspectorProfile | { data: InspectorProfile }>(
        `/platform/inspectors/${inspectorId}`,
        input,
      )
      .then((r) => unwrap(r.data)),

  updateLicenseClass: (input: { licenseNumber: string; licenseClass: string; expiresAt?: string | null }) =>
    api.put('/users/me/pilot-license', input).then((r) => r.data),

  uploadLicenseScan: async (inspectorId: string, file: File): Promise<InspectorProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<InspectorProfile | { data: InspectorProfile }>(
      `/platform/inspectors/${inspectorId}/license-scan`,
      formData,
    );
    return unwrap(data);
  },

  getLicenseScanBlobUrl: async (inspectorId: string): Promise<{ blobUrl: string; contentType: string }> => {
    const response = await api.get(`/platform/inspectors/${inspectorId}/license-scan`, {
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, contentType: blob.type };
  },

  downloadDraftPartnerContractPdf: async (inspectorId: string, fullName?: string): Promise<void> => {
    const response = await api.get(`/platform/inspectors/${inspectorId}/partner-contract-template`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (fullName || inspectorId.slice(0, 8)).replace(/\s+/g, '_');
    link.href = url;
    link.download = `Du-Thao-Hop-Dong-Doi-Tac-${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  uploadPartnerContract: async (inspectorId: string, file: File): Promise<InspectorProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<InspectorProfile | { data: InspectorProfile }>(
      `/platform/inspectors/${inspectorId}/partner-contract`,
      formData,
    );
    return unwrap(data);
  },

  getPartnerContractBlobUrl: async (inspectorId: string): Promise<{ blobUrl: string; contentType: string }> => {
    const response = await api.get(`/platform/inspectors/${inspectorId}/partner-contract`, {
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, contentType: blob.type };
  },

  approveOnboarding: async (inspectorId: string): Promise<InspectorProfile> => {
    const { data } = await api.post<InspectorProfile | { data: InspectorProfile }>(
      `/platform/inspectors/${inspectorId}/approve`,
    );
    return unwrap(data);
  },

  rejectOnboarding: async (inspectorId: string, reason: string): Promise<InspectorProfile> => {
    const { data } = await api.post<InspectorProfile | { data: InspectorProfile }>(
      `/platform/inspectors/${inspectorId}/reject`,
      { reason },
    );
    return unwrap(data);
  },

  listFlightLogs: (inspectorId: string) =>
    api
      .get<InspectorFlightLog[] | { data: InspectorFlightLog[] }>(
        `/platform/inspectors/${inspectorId}/flight-logs`,
      )
      .then((r) => unwrap(r.data)),

  recordFlightLog: (inspectorId: string, input: CreateInspectorFlightLogInput) =>
    api
      .post<InspectorFlightLog | { data: InspectorFlightLog }>(
        `/platform/inspectors/${inspectorId}/flight-logs`,
        input,
      )
      .then((r) => unwrap(r.data)),

  deleteFlightLog: (inspectorId: string, logId: string) =>
    api
      .delete(`/platform/inspectors/${inspectorId}/flight-logs/${logId}`)
      .then((r) => unwrap(r.data)),
};
