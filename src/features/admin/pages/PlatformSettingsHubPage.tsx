import { useSearchParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import PlatformFinanceSettingsPage from './PlatformFinanceSettingsPage';
import PlatformOperationsSettingsPage from './PlatformOperationsSettingsPage';
import PlatformAiSettingsPage from './PlatformAiSettingsPage';
import { RatingCriteriaConfigTab } from '../components/RatingCriteriaConfigTab';

const SETTINGS_TABS = [
  { value: 'finance', label: 'Finance & Tax', icon: <ReceiptLongOutlined fontSize="small" /> },
  { value: 'operations', label: 'Operations & Dispatch', icon: <TuneRounded fontSize="small" /> },
  { value: 'ai', label: 'AI & Model Performance', icon: <AnalyticsOutlined fontSize="small" /> },
  { value: 'ratings', label: 'Inspector Ratings', icon: <StarOutlineRounded fontSize="small" /> },
] as const;

export type PlatformSettingsTab = (typeof SETTINGS_TABS)[number]['value'];

function resolveTab(value: string | null): PlatformSettingsTab {
  const match = SETTINGS_TABS.find((tab) => tab.value === value);
  return match?.value ?? 'finance';
}

/**
 * Single Governance entry point for platform-wide configuration. Finance, dispatch operations,
 * and AI model settings live here as tabs so the sidebar stays at six clean workspaces; the
 * retired `/admin/finance-settings`, `/admin/operations-settings`, and `/admin/ai-settings` links
 * redirect into the matching tab.
 */
export default function PlatformSettingsHubPage() {
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTab(searchParams.get('tab'));

  return (
    <Box className="workspace-page workspace-page--platform-settings">
      <PageHeader
        title={t('Platform settings')}
        subtitle={t(
          'Configure settlement rates, dispatch acceptance rules, and AI defect-analysis thresholds in one place.',
        )}
        breadcrumbs={[
          { label: t('Governance'), to: '/admin/dashboard' },
          { label: t('Platform settings') },
        ]}
      />

      <Tabs
        value={activeTab}
        onChange={(_, value: PlatformSettingsTab) => {
          setSearchParams(value === 'finance' ? {} : { tab: value });
        }}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={t('Platform settings')}
        sx={{
          mb: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { px: 1.5 },
        }}
      >
        {SETTINGS_TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            icon={tab.icon}
            iconPosition="start"
            label={t(tab.label)}
          />
        ))}
      </Tabs>

      {activeTab === 'finance' && <PlatformFinanceSettingsPage embedded />}
      {activeTab === 'operations' && <PlatformOperationsSettingsPage embedded />}
      {activeTab === 'ai' && <PlatformAiSettingsPage embedded />}
      {activeTab === 'ratings' && <RatingCriteriaConfigTab />}
    </Box>
  );
}
