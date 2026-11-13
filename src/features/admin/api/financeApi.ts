import { api } from '@/shared/api/client';

export interface InspectionFinanceSettings {
  commissionRate: number | null;
  vatRate: number | null;
  tncnRate: number | null;
  configured: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
  accountingDisclaimer: string;
}

export interface UpdateInspectionFinanceSettingsPayload {
  commissionRate: number;
  vatRate: number;
  tncnRate: number;
}

export interface ServiceInvoiceSummary {
  totalPrice: number | null;
  vatRate: number | null;
  commissionRate: number | null;
  tncnRate: number | null;
  reportAcceptedAt: string | null;
}

export interface ServicePaymentSummary {
  status: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | null;
  payosOrderCode: number | null;
  method: string | null;
  reference: string | null;
  confirmedAt: string | null;
}

export interface InspectorPayoutSummary {
  status: 'PENDING' | 'ELIGIBLE' | 'PAID' | null;
  reference: string | null;
  recordedAt: string | null;
  heldForRefund?: boolean;
  finalPayoutAmount?: number | null;
  refundReconciliationReference?: string | null;
}

export interface OccurrenceFinanceProjection {
  currency: string;
  totalCustomerPrice: number | null;
  preVatServiceBase: number | null;
  vatAmount: number | null;
  commissionRate: number | null;
  platformCommissionAmount: number | null;
  inspectorTaxableBase: number | null;
  tncnRate: number | null;
  tncnWithheldAmount: number | null;
  inspectorNetPayout: number | null;
  paymentStatus: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | null;
  payoutStatus: 'PENDING' | 'ELIGIBLE' | 'PAID' | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  payosOrderCode?: number | null;
  payoutReference?: string | null;
  invoice?: ServiceInvoiceSummary | null;
  payment?: ServicePaymentSummary | null;
  payout?: InspectorPayoutSummary | null;
  accountingDisclaimer: string;
}

export interface ConfirmOccurrencePaymentPayload {
  paymentReference: string;
  amount: number;
  note?: string;
}

export interface RecordOccurrencePayoutPayload {
  payoutReference: string;
  note?: string;
}

export interface PayOSPaymentLinkResponse {
  orderCode: number;
  amount: number;
  description: string;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
}

export const financeApi = {
  getAdminSettings: () =>
    api
      .get<InspectionFinanceSettings>('/contracts/admin/finance-settings')
      .then((res) => res.data),

  updateAdminSettings: (payload: UpdateInspectionFinanceSettingsPayload) =>
    api
      .put<InspectionFinanceSettings>('/contracts/admin/finance-settings', payload)
      .then((res) => res.data),

  getOccurrenceFinance: (requestId: string, occurrenceId: string) =>
    api
      .get<OccurrenceFinanceProjection>(
        `/contracts/requests/${requestId}/occurrences/${occurrenceId}/finance`,
      )
      .then((res) => res.data),

  confirmOccurrencePayment: (
    requestId: string,
    occurrenceId: string,
    payload: ConfirmOccurrencePaymentPayload,
  ) =>
    api
      .post(
        `/contracts/requests/${requestId}/occurrences/${occurrenceId}/confirm-payment`,
        payload,
      )
      .then((res) => res.data),

  recordOccurrencePayout: (
    requestId: string,
    occurrenceId: string,
    payload: RecordOccurrencePayoutPayload,
  ) =>
    api
      .post(
        `/contracts/requests/${requestId}/occurrences/${occurrenceId}/record-payout`,
        payload,
      )
      .then((res) => res.data),

  createPayOSPaymentLink: (requestId: string, occurrenceId: string) =>
    api
      .post<PayOSPaymentLinkResponse>(
        `/contracts/requests/${requestId}/occurrences/${occurrenceId}/payos/create-payment-link`,
      )
      .then((res) => res.data),
};
