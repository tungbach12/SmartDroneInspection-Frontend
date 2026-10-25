import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import ContractDocumentModal from './ContractDocumentModal';
import type { Subscription } from '../api/subscriptionApi';

const mockSubscriptionWithDeal: Subscription = {
  id: 'sub-deal-24m',
  organizationId: 'org-vietnam-infra',
  organizationName: 'Vietnam Infrastructure Inspection JSC',
  planCode: 'ENTERPRISE',
  billingPeriodMonths: 24,
  status: 'PENDING',
  startsAt: null,
  endsAt: null,
  externalReference: null,
  agreedAmountUsd: null,
  termsSnapshot: {
    termsVersion: '2026.1',
    agreedAt: '2026-10-21T09:30:00Z',
    agreedByUserId: 'user-org-admin-1',
    agreedByUserEmail: 'ceo@vn-infra.test',
    agreedByFullName: 'Nguyen Van A',
    planCode: 'ENTERPRISE',
    billingPeriodMonths: 24,
    standardMonthlyPriceUsd: 750,
    standardTotalPriceUsd: 18000,
    standardSavingsPercent: 37.5,
    proposedPriceUsd: 15000,
    negotiationNotes: 'Multi-year contract with advance settlement discount',
    clauses: [
      {
        id: 'scope',
        title: 'Service Scope & Availability',
        text: 'Platform grants a non-exclusive subscription license; service levels require a separate approved SLA.',
      },
      {
        id: 'responsibility',
        title: 'Aviation & Airspace Operational Responsibility',
        text: 'Customer holds sole liability for drone flight permits, licensing, and airspace safety.',
      },
    ],
  },
  confirmedByUserId: 'admin-platform',
  confirmedAt: '2026-10-21T10:00:00Z',
  createdAt: '2026-10-21T09:30:00Z',
  updatedAt: '2026-10-21T10:00:00Z',
};

describe('ContractDocumentModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a draft subscription order preview and labels consent without signature claims', () => {
    renderWithRouter(
      <ContractDocumentModal
        open={true}
        onClose={vi.fn()}
        subscription={mockSubscriptionWithDeal}
      />,
    );

    // Header & Draft caveat
    expect(screen.getByText(/ENTERPRISE SUBSCRIPTION ORDER SUMMARY/i)).toBeTruthy();
    expect(screen.getByText(/TÓM TẮT ĐƠN ĐĂNG KÝ VÀ ĐIỀU KHOẢN/i)).toBeTruthy();
    expect(screen.getByText(/Draft for legal review/i)).toBeTruthy();
    expect(screen.getByText(/not a certified electronic signature/i)).toBeTruthy();

    // Parties
    expect(screen.getAllByText(/Vietnam Infrastructure Inspection JSC/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nguyen Van A/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ceo@vn-infra.test/i).length).toBeGreaterThan(0);

    // Commercial Terms & Negotiated Deal Price
    expect(screen.getByText(/24 Tháng/i)).toBeTruthy();
    expect(screen.getByText(/\$18[.,]000 USD/i)).toBeTruthy();
    expect(screen.getByText(/CHƯA ĐƯỢC PHÊ DUYỆT.*\$15[.,]000 USD/i)).toBeTruthy();
    expect(screen.getByText(/Pending price approval/i)).toBeTruthy();
    expect(screen.getByText(/Multi-year contract with advance settlement discount/i)).toBeTruthy();
    expect(screen.queryByText(/E-SIGNED|SIGNED|signature confirmation/i)).toBeNull();

    // Acknowledgement status is not presented as an electronic signature.
    expect(screen.getByText(/TERMS ACCEPTANCE RECORDED/i)).toBeTruthy();
    expect(screen.queryByText(/E-SIGNED BY ORG_MANAGER/i)).toBeNull();

    // The sample clause is retained from the snapshot without inventing an uptime promise.
    expect(screen.queryByText(/99\.98% uptime SLA/i)).toBeNull();
    expect(screen.getAllByText(/Aviation & Airspace Operational Responsibility/i).length).toBeGreaterThan(0);
  });

  it('triggers window.print when clicking the Print / Save as PDF button', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    renderWithRouter(
      <ContractDocumentModal
        open={true}
        onClose={vi.fn()}
        subscription={mockSubscriptionWithDeal}
      />,
    );

    const printButtons = screen.getAllByRole('button', { name: /Print \/ Save as PDF/i });
    fireEvent.click(printButtons[0]!);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
