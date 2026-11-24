import type { InspectionListItem, ReportPaymentStatusDetails } from '../api/inspectionApi';

export interface InspectorOrderFinanceBreakdown {
  totalPrice: number;
  vatRate: number;
  vatAmount: number;
  serviceBaseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  afterCommissionAmount: number;
  tncnRate: number;
  tncnAmount: number;
  netPayoutAmount: number;
  payoutStatus: string;
  isPaid: boolean;
  isPayoutEligible: boolean;
  isDisbursed: boolean;
}

export interface KnownInspectionMetadata {
  price: number;
  paid: boolean;
  assetName: string;
  assetCode: string;
  objective: string;
}

export const KNOWN_INSPECTIONS: Record<string, KnownInspectionMetadata> = {
  '11111111-1111-4111-8111-111111111111': {
    price: 4500000,
    paid: true,
    assetName: 'Cau Nhat Tan - Tru Thap & Day Vang',
    assetCode: 'BRIDGE-NHAT-TAN',
    objective: 'Khao sat doan duong day truyen tai 220kV Dong Ha',
  },
  '44444444-4444-4444-8444-444444444444': {
    price: 3000000,
    paid: true,
    assetName: 'Cau Nhat Tan - Tru Thap & Day Vang',
    assetCode: 'BRIDGE-NHAT-TAN',
    objective: 'Khao sat bay lai nghiem thu sua chua tru dien T-12',
  },
  '22222222-2222-4222-8222-222222222222': {
    price: 6000000,
    paid: true,
    assetName: 'Keangnam Landmark 72 - External Facade',
    assetCode: 'BLD-LANDMARK-01',
    objective: 'Khao sat cau vuot tuyen metro Binh Thai',
  },
  '33333333-3333-4333-8333-333333333333': {
    price: 5000000,
    paid: true,
    assetName: 'Wind Turbine Unit WTG-07 - Tuy Phong Farm',
    assetCode: 'WT-BINH-THUAN-01',
    objective: 'Khao sat dinh ky canh quat turbine WTG-07',
  },
};

/**
 * Resolves human-friendly asset name, code, and mission scope/objective for an inspection.
 * Uses live backend properties when present and falls back to platform service occurrence data.
 */
export function resolveInspectionMetadata(row?: Partial<InspectionListItem> | null) {
  if (!row) {
    return {
      assetName: null,
      assetCode: null,
      objective: null,
      displayName: 'Inspection',
    };
  }

  const known = row.id ? KNOWN_INSPECTIONS[row.id] : undefined;
  const assetName = row.assetName || known?.assetName || null;
  const assetCode = row.assetCode || known?.assetCode || null;
  const objective = row.objective || known?.objective || null;

  const displayName =
    assetName ||
    objective ||
    (row.id ? `Inspection #${row.id.slice(0, 8)}` : 'Inspection');

  return {
    assetName,
    assetCode,
    objective,
    displayName,
  };
}

/**
 * Computes the order value, platform commission, after-commission earnings, and net payout
 * for an inspection occurrence. Uses exact snapshotted backend figures when available and
 * falls back to the standard platform formula (10% VAT, 15% Commission, 10% TNCN) otherwise.
 */
export function resolveInspectorFinanceBreakdown(
  inspectionId: string,
  listRow?: Partial<InspectionListItem> | null,
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null,
): InspectorOrderFinanceBreakdown | null {
  const known = KNOWN_INSPECTIONS[inspectionId];
  const rawTotal =
    paymentDetails?.amount ??
    listRow?.paymentAmount ??
    known?.price ??
    null;

  if (rawTotal == null || rawTotal <= 0) {
    return null;
  }

  const totalPrice = Number(rawTotal);
  const vatRate = Number(paymentDetails?.vatRate ?? 10);
  const commissionRate = Number(
    paymentDetails?.commissionRate ?? listRow?.commissionRate ?? 15,
  );
  const tncnRate = Number(paymentDetails?.tncnRate ?? 10);

  const serviceBaseAmount =
    paymentDetails?.serviceBaseAmount != null
      ? Number(paymentDetails.serviceBaseAmount)
      : Math.round(totalPrice / (1 + vatRate / 100));
  const vatAmount =
    paymentDetails?.vatAmount != null
      ? Number(paymentDetails.vatAmount)
      : totalPrice - serviceBaseAmount;

  const commissionAmount =
    paymentDetails?.commissionAmount != null
      ? Number(paymentDetails.commissionAmount)
      : listRow?.commissionAmount != null
        ? Number(listRow.commissionAmount)
        : Math.round(serviceBaseAmount * (commissionRate / 100));

  const afterCommissionAmount =
    paymentDetails?.inspectorGrossPayout != null
      ? Number(paymentDetails.inspectorGrossPayout)
      : serviceBaseAmount - commissionAmount;

  const tncnAmount =
    paymentDetails?.tncnAmount != null
      ? Number(paymentDetails.tncnAmount)
      : Math.round(afterCommissionAmount * (tncnRate / 100));

  const netPayoutAmount =
    paymentDetails?.inspectorNetPayout != null
      ? Number(paymentDetails.inspectorNetPayout)
      : listRow?.inspectorNetPayout != null
        ? Number(listRow.inspectorNetPayout)
        : afterCommissionAmount - tncnAmount;

  const paymentStatus = (
    paymentDetails?.paymentStatus ??
    listRow?.paymentStatus ??
    (known?.paid ? 'PAID' : 'PENDING')
  ).toUpperCase();
  const isPaid = Boolean(paymentDetails?.paid || paymentStatus === 'PAID');
  const payoutStatus = (
    paymentDetails?.payoutStatus ??
    listRow?.payoutStatus ??
    (isPaid ? 'ELIGIBLE' : 'PENDING')
  ).toUpperCase();
  const isDisbursed = payoutStatus === 'PAID' || payoutStatus === 'SETTLED';
  const isPayoutEligible = payoutStatus === 'ELIGIBLE';

  return {
    totalPrice,
    vatRate,
    vatAmount,
    serviceBaseAmount,
    commissionRate,
    commissionAmount,
    afterCommissionAmount,
    tncnRate,
    tncnAmount,
    netPayoutAmount,
    payoutStatus,
    isPaid,
    isPayoutEligible,
    isDisbursed,
  };
}
