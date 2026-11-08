import type { InspectionListItem, ReportPaymentStatusDetails } from '../api/inspectionApi';
import { PlatformSettlementInvoiceCard } from './PlatformSettlementInvoiceCard';
import { InspectorPayoutStatementCard } from './InspectorPayoutStatementCard';

interface InspectorPayoutSummaryBarProps {
  inspectionId: string;
  listRow?: Partial<InspectionListItem> | null | undefined;
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null | undefined;
  roleView?: 'inspector' | 'manager';
}

export function InspectorPayoutSummaryBar({
  inspectionId,
  listRow,
  paymentDetails,
  roleView = 'inspector',
}: InspectorPayoutSummaryBarProps) {
  if (roleView === 'manager') {
    return (
      <PlatformSettlementInvoiceCard
        inspectionId={inspectionId}
        listRow={listRow}
        paymentDetails={paymentDetails}
      />
    );
  }
  return (
    <InspectorPayoutStatementCard
      inspectionId={inspectionId}
      listRow={listRow}
      paymentDetails={paymentDetails}
    />
  );
}
