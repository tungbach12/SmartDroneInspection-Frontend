import { api, postWithBrowserCsrf } from '@/shared/api/client';

export interface InspectorApplication {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  citizenId: string;
  address: string;
  pilotLicenseNumber: string;
  pilotLicenseClass: string;
  pilotLicenseExpiresAt: string | null;
  hasLicenseScan: boolean;
  hasSignedContract?: boolean;
  signedContractSha256?: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  approvedUserId?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : (value as T);
}

export const inspectorApplicationApi = {
  uploadLicenseScan: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await postWithBrowserCsrf<{ fileKey: string } | { data: { fileKey: string } }>(
      '/inspector-applications/license-scan',
      form,
    );
    return unwrap(data).fileKey;
  },
  submit: async (input: {
    email: string;
    fullName: string;
    phoneNumber?: string | undefined;
    citizenId: string;
    address: string;
    pilotLicenseNumber: string;
    pilotLicenseClass: string;
    pilotLicenseExpiresAt?: string | undefined;
    licenseScanFileKey: string;
    password: string;
    otpChallengeToken: string;
    otpCode: string;
  }) => {
    const { data } = await postWithBrowserCsrf<InspectorApplication | { data: InspectorApplication }>(
      '/auth/registration/inspector-application',
      input,
    );
    return unwrap(data);
  },
  listPending: async () => {
    const { data } = await api.get<InspectorApplication[] | { data: InspectorApplication[] }>(
      '/inspector-applications',
    );
    return unwrap(data);
  },
  listApprovedAwaitingContract: async () => {
    const { data } = await api.get<InspectorApplication[] | { data: InspectorApplication[] }>(
      '/inspector-applications/approved-awaiting-contract',
    );
    return unwrap(data);
  },
  getLicenseScanBlob: async (id: string): Promise<Blob> => {
    const response = await api.get(`/inspector-applications/${id}/license-scan`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  getSignedContractBlob: async (id: string): Promise<Blob> => {
    const response = await api.get(`/inspector-applications/${id}/signed-contract`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  getLicenseScan: async (id: string) => {
    const response = await api.get(`/inspector-applications/${id}/license-scan`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data as Blob);
  },
  approve: async (id: string) => {
    const { data } = await api.post(`/inspector-applications/${id}/approve`);
    return unwrap(data);
  },
  reject: async (id: string, reason: string) => {
    const { data } = await api.post(`/inspector-applications/${id}/reject`, { reason });
    return unwrap(data);
  },
  retryRejectedCleanup: async (id: string) => {
    const { data } = await api.post(`/inspector-applications/${id}/cleanup-rejected`);
    return unwrap(data);
  },
  uploadSignedContract: async (id: string, file: File): Promise<InspectorApplication> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<InspectorApplication | { data: InspectorApplication }>(
      `/inspector-applications/${id}/signed-contract`,
      form,
    );
    return unwrap(data);
  },
};
