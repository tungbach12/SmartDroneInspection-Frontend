import { api } from '@/shared/api/client';

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type BillingPeriodMonths = 1 | 6 | 12 | number;

export interface TermsClause {
  id: string;
  title: string;
  text: string;
}

export interface PricingTier {
  billingPeriodMonths: number;
  monthlyPriceUsd: number;
  totalPriceUsd: number;
  savingsPercent: number;
}

export interface ContractTerms {
  version: string;
  effectiveDate: string;
  planCode: string;
  pricingTiers: PricingTier[];
  clauses: TermsClause[];
}

export interface TermsSnapshot {
  termsVersion: string;
  agreedAt: string;
  agreedByUserId: string;
  agreedByUserEmail: string;
  agreedByFullName: string;
  planCode: string;
  billingPeriodMonths: number;
  standardMonthlyPriceUsd?: number;
  standardTotalPriceUsd?: number;
  standardSavingsPercent?: number;
  proposedPriceUsd?: number;
  negotiationNotes?: string;
  monthlyPriceUsd?: number;
  totalPriceUsd?: number;
  savingsPercent?: number;
  clauses: TermsClause[];
}

export interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  planCode: string;
  billingPeriodMonths: number;
  status: SubscriptionStatus;
  startsAt: string | null;
  endsAt: string | null;
  externalReference: string | null;
  agreedAmountUsd?: number | null;
  termsSnapshot: TermsSnapshot | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInstructions {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftBic: string;
  referenceCode: string;
  amountUsd: number;
  currency: string;
  instructions: string;
}

export interface PaymentTransaction {
  id: string;
  subscriptionId: string;
  paypalOrderId: string;
  paypalCaptureId: string | null;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'REFUNDED';
  payerEmail?: string | null;
  capturedAt: string | null;
}

export interface PayPalOrderResponse {
  paypalOrderId: string;
  status: string;
  amount: number;
  currency: string;
  approvalUrl: string | null;
}

export interface SubscriptionCurrentData {
  currentSubscription: Subscription | null;
  history: Subscription[];
  termsPreview: ContractTerms;
  paymentInstructions: PaymentInstructions;
}

export interface CreateSubscriptionInput {
  billingPeriodMonths: number;
  agreeToTerms: boolean;
  termsVersion?: string | undefined;
  proposedPriceUsd?: number | undefined;
  negotiationNotes?: string | undefined;
}

export interface ConfirmPaymentInput {
  externalReference: string;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  agreedAmountUsd?: number | undefined;
  adminNotes?: string | undefined;
}

export interface CapturePayPalOrderInput {
  subscriptionId: string;
  paypalOrderId: string;
}

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  termsPreview: () => [...subscriptionKeys.all, 'terms-preview'] as const,
  platformList: (status?: string) =>
    [...subscriptionKeys.all, 'platform', status ?? 'ALL'] as const,
  platformDetail: (id: string) => [...subscriptionKeys.all, 'platform', 'detail', id] as const,
  transactions: (subscriptionId: string) =>
    [...subscriptionKeys.all, 'transactions', subscriptionId] as const,
};

export const subscriptionApi = {
  getCurrent: async (): Promise<SubscriptionCurrentData> => {
    const response = await api.get<SubscriptionCurrentData>('/subscriptions/current');
    return response.data;
  },

  getTermsPreview: async (): Promise<ContractTerms> => {
    const response = await api.get<ContractTerms>('/subscriptions/terms-preview');
    return response.data;
  },

  create: async (input: CreateSubscriptionInput): Promise<Subscription> => {
    const response = await api.post<Subscription>('/subscriptions', input);
    return response.data;
  },

  createPayPalOrder: async (subscriptionId: string): Promise<PayPalOrderResponse> => {
    const response = await api.post<PayPalOrderResponse>('/subscriptions/paypal/create-order', {
      subscriptionId,
    });
    return response.data;
  },

  capturePayPalOrder: async (
    input: CapturePayPalOrderInput,
  ): Promise<PaymentTransaction> => {
    const response = await api.post<PaymentTransaction>(
      '/subscriptions/paypal/capture-order',
      input,
    );
    return response.data;
  },

  listTransactions: async (subscriptionId: string): Promise<PaymentTransaction[]> => {
    const response = await api.get<PaymentTransaction[]>(
      `/subscriptions/${subscriptionId}/transactions`,
    );
    return response.data;
  },

  platformList: async (status?: string): Promise<Subscription[]> => {
    const params = status && status !== 'ALL' ? { status } : {};
    const response = await api.get<Subscription[]>('/platform/subscriptions', { params });
    return response.data;
  },

  platformDetail: async (id: string): Promise<Subscription> => {
    const response = await api.get<Subscription>(`/platform/subscriptions/${id}`);
    return response.data;
  },

  confirmPayment: async (
    id: string,
    input: ConfirmPaymentInput,
  ): Promise<Subscription> => {
    const response = await api.post<Subscription>(
      `/platform/subscriptions/${id}/confirm-payment`,
      input,
    );
    return response.data;
  },
};
