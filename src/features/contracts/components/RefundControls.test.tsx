import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceRequestOccurrence } from '../api/contractApi';
import { RefundControls } from './RefundControls';

const mocks = vi.hoisted(() => ({
  finance: { data: undefined as unknown, isError: false },
  initiate: { mutateAsync: vi.fn(), isPending: false },
  complete: { mutateAsync: vi.fn(), isPending: false },
  cancel: { mutateAsync: vi.fn(), isPending: false },
  reconcile: { mutateAsync: vi.fn(), isPending: false },
  recovery: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../hooks/useContracts', () => ({
  useOccurrenceFinance: () => mocks.finance,
  useInitiateOccurrenceRefund: () => mocks.initiate,
  useCompleteOccurrenceRefund: () => mocks.complete,
  useCancelOccurrenceRefund: () => mocks.cancel,
  useReconcileRefundAllocation: () => mocks.reconcile,
  useRecordReceivableRecovery: () => mocks.recovery,
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    formatNumber: (value: number) => String(value),
  }),
}));

const occurrence = (overrides: Partial<ServiceRequestOccurrence> = {}): ServiceRequestOccurrence =>
  ({
    id: 'occ-1',
    payout: { status: 'ELIGIBLE' },
    refunds: [],
    ...overrides,
  }) as ServiceRequestOccurrence;

const renderControls = (
  props: Partial<Parameters<typeof RefundControls>[0]> = {},
): ReturnType<typeof render> =>
  render(
    <RefundControls
      requestId="req-1"
      occurrence={occurrence()}
      enabled
      onChanged={vi.fn()}
      onError={vi.fn()}
      {...props}
    />,
  );

const initiateButton = () =>
  screen.getByRole('button', { name: 'Initiate refund' }) as HTMLButtonElement;

/** Fills every field the initiate guard requires for an ELIGIBLE (not yet paid) payout. */
const fillRequiredInitiateFields = (amount = '2500000') => {
  fireEvent.change(screen.getByLabelText('Refund amount (per contract)'), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByLabelText('Request reference'), { target: { value: 'REF-001' } });
  const [reasonSelect, stageSelect] = screen.getAllByRole('combobox');
  if (!reasonSelect || !stageSelect) {
    throw new Error('Expected reason and stage comboboxes');
  }
  fireEvent.change(reasonSelect, { target: { value: 'CUSTOMER_CANCELLATION' } });
  fireEvent.change(stageSelect, { target: { value: 'FIELDWORK_COMPLETED' } });
  fireEvent.change(screen.getByLabelText('Contract clause/reference'), {
    target: { value: 'Clause 7.2' },
  });
  fireEvent.change(screen.getByLabelText('Supporting evidence reference'), {
    target: { value: 'mail/refund-1.pdf' },
  });
  fireEvent.change(screen.getByLabelText('Case details / reason'), {
    target: { value: 'Customer withdrew before fieldwork' },
  });
};

describe('RefundControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.finance.data = { refunds: [], inspectorReceivables: [] };
    mocks.finance.isError = false;
  });

  afterEach(cleanup);

  it('keeps "Initiate refund" disabled until every required field is filled', () => {
    renderControls();

    expect(initiateButton().disabled).toBe(true);

    fillRequiredInitiateFields();

    expect(initiateButton().disabled).toBe(false);
  });

  it('keeps the button disabled while the occurrence finance ledger is still loading', () => {
    mocks.finance.data = undefined;
    renderControls();

    fillRequiredInitiateFields();

    expect(initiateButton().disabled).toBe(true);
  });

  it('rejects a zero or negative refund amount before calling the API', () => {
    renderControls();

    fillRequiredInitiateFields('0');

    expect(initiateButton().disabled).toBe(true);
  });

  it('sends the entered amount, reference and plan when an unpaid payout is refunded', async () => {
    renderControls();
    fillRequiredInitiateFields('2500000');

    fireEvent.click(initiateButton());
    await screen.findByRole('button', { name: 'Initiate refund' });

    expect(mocks.initiate.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500000,
        requestReference: 'REF-001',
        reasonCode: 'CUSTOMER_CANCELLATION',
        serviceStage: 'FIELDWORK_COMPLETED',
        contractClauseReference: 'Clause 7.2',
        evidenceReference: 'mail/refund-1.pdf',
        inspectorReceivableAmount: 0,
        platformAbsorbedAmount: 0,
      }),
    );
  });

  it('requires the receivable and absorbed plans to add up to the refund when payout was already paid', () => {
    renderControls({ occurrence: occurrence({ payout: { status: 'PAID' } as never }) });

    fillRequiredInitiateFields('1000000');
    expect(initiateButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Inspector receivable plan'), {
      target: { value: '600000' },
    });
    fireEvent.change(screen.getByLabelText('Platform absorbed plan'), {
      target: { value: '300000' },
    });
    // 600000 + 300000 != 1000000 -> still blocked
    expect(initiateButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Platform absorbed plan'), {
      target: { value: '400000' },
    });
    expect(initiateButton().disabled).toBe(false);
  });

  it('shows the payout-hold warning while a refund is still INITIATED', () => {
    renderControls({
      occurrence: occurrence({
        payout: { status: 'ELIGIBLE' } as never,
        refunds: [{ id: 'r1', status: 'INITIATED', amount: 100, requestReference: 'REF-1' }] as never,
      }),
    });

    expect(screen.getByText(/Inspector payout is on hold/)).toBeTruthy();
  });

  it('does not render the refund ledger when the control is disabled', () => {
    mocks.finance.data = {
      refunds: [{ id: 'r1', status: 'INITIATED', amount: 100, requestReference: 'REF-1' }],
      inspectorReceivables: [],
    };
    renderControls({
      enabled: false,
      occurrence: occurrence({
        refunds: [{ id: 'r1', status: 'INITIATED', amount: 100 }] as never,
      }),
    });

    expect(screen.queryByText(/2\. Transfer externally/)).toBeNull();
  });

  it('surfaces a wallet-style error when the finance ledger fails to load', () => {
    mocks.finance.isError = true;
    renderControls();

    expect(screen.getByText(/Refund and receivable ledger could not be loaded/)).toBeTruthy();
  });

  it('reports a failed action through onError instead of swallowing it', async () => {
    const onError = vi.fn();
    mocks.initiate.mutateAsync.mockRejectedValueOnce(new Error('REFUND_REQUEST_REFERENCE_DUPLICATE'));
    renderControls({ onError });

    fillRequiredInitiateFields();
    fireEvent.click(initiateButton());
    await screen.findByRole('button', { name: 'Initiate refund' });

    expect(onError).toHaveBeenCalledWith('REFUND_REQUEST_REFERENCE_DUPLICATE');
  });
});
