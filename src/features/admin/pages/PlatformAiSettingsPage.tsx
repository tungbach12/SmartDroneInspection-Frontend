import { Box } from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { AdminAiModelAnalyticsPanel } from '../components/AdminAiModelAnalyticsPanel';
import { usePlatformAiAnalytics } from '../hooks/usePlatformAiSettings';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function PlatformAiSettingsPage() {
  const { t } = useLocale();
  const analyticsQuery = usePlatformAiAnalytics(true);

  return (
    <Box className="workspace-page" sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title={t('AI Configuration & Model Performance')}
        breadcrumbs={[{ label: t('Governance'), to: '/admin/dashboard' }, { label: t('AI settings') }]}
      />

      <QueryState
        isLoading={analyticsQuery.isLoading}
        error={analyticsQuery.error}
        onRetry={() => void analyticsQuery.refetch()}
        loadingLabel={t('Loading AI analytics…')}
      >
        <AdminAiModelAnalyticsPanel mode="full" />
      </QueryState>
    </Box>
  );
}
