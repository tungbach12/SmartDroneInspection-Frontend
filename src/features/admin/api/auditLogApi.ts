import { api } from '@/shared/api/client';

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorFullName: string | null;
  action: string;
  aggregateType: string;
  aggregateId: string;
  outcome: string | null;
  traceId: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  /** Distinct action names recorded on the platform, for the action filter dropdown. */
  availableActions?: string[];
}

export interface AuditLogQuery {
  page: number;
  size: number;
  action?: string;
  query?: string;
  outcome?: string;
  days?: number;
}

export const auditLogApi = {
  list: (params: AuditLogQuery) =>
    api
      .get<AuditLogPage>('/admin/audit-logs', { params })
      .then((response) => response.data),
};
