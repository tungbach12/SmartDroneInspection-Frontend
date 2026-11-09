import { useState } from 'react';
import { Button, Stack, Tab, Tabs } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type WorkOrder } from '../api/maintenanceApi';
import { OverviewTab } from './tabs/OverviewTab';
import { ExecutionTab } from './tabs/ExecutionTab';
import { EstimateTab } from './tabs/EstimateTab';
import { ChangesTab } from './tabs/ChangesTab';
import { ReportTab } from './tabs/ReportTab';
import { CostsTab } from './tabs/CostsTab';

export interface WorkOrderDetailPanelProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
  onClose: () => void;
  onOpenInspection?: (() => void) | undefined;
}

export type DetailTab = 'overview' | 'execution' | 'estimate' | 'changes' | 'report' | 'costs';

const TABS: { value: DetailTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'execution', label: 'Tasks & work' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'changes', label: 'Changes' },
  { value: 'report', label: 'Completion report' },
  { value: 'costs', label: 'Costs & acceptance' },
];

/**
 * MF4 detail: one work order and the actions its role may perform.
 *
 * Decomposed into dedicated, modular tab components to prevent DOM bloat
 * and ensure responsive, high-performance rendering across all data scales.
 */
export function WorkOrderDetailPanel({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
  onClose,
  onOpenInspection,
}: WorkOrderDetailPanelProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<DetailTab>('overview');

  return (
    <Stack spacing={2.5}>
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={onClose}
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'none',
          borderRadius: '8px',
          alignSelf: 'flex-start',
        }}
      >
        {t('Back to work orders')}
      </Button>

      <PageHeader
        title={workOrder.correctiveScope}
        subtitle={`${t('Work orders')} · ${t('Priority')} ${workOrder.priority}`}
        actions={<StatusChip status={workOrder.status} size="medium" />}
      />

      <Tabs
        value={tab}
        onChange={(_e, next: DetailTab) => setTab(next)}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 650,
            fontSize: '0.9rem',
            minHeight: 44,
          },
        }}
      >
        {TABS.map((entry) => (
          <Tab
            key={entry.value}
            value={entry.value}
            label={t(entry.label)}
          />
        ))}
      </Tabs>

      {tab === 'overview' && (
        <OverviewTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
          onOpenInspection={onOpenInspection}
        />
      )}
      {tab === 'execution' && (
        <ExecutionTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
        />
      )}
      {tab === 'estimate' && (
        <EstimateTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
        />
      )}
      {tab === 'changes' && (
        <ChangesTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
        />
      )}
      {tab === 'report' && (
        <ReportTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
        />
      )}
      {tab === 'costs' && (
        <CostsTab
          workOrder={workOrder}
          isOrgAdmin={isOrgAdmin}
          isEngineer={isEngineer}
        />
      )}
    </Stack>
  );
}
