import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AdminTableToolbar } from '../components/AdminTableToolbar';
import { auditLogApi, type AuditLogEntry } from '../api/auditLogApi';

const PAGE_SIZE = 50;

const OUTCOME_OPTIONS = [
  { value: 'ALL', label: 'All outcomes' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'DENIED', label: 'Denied' },
  { value: 'FAILURE', label: 'Failure' },
];

const TIME_RANGE_OPTIONS = [
  { value: 'ALL', label: 'All time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const KNOWN_ACTIONS = [
  'INSPECTOR_PROFILE_UPDATED',
  'PLATFORM_SETTINGS_UPDATED',
  'AUDIT_LOG_RETENTION_PURGED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
];

export default function AdminAuditLogPage() {
  const { locale, t } = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [timeRange, setTimeRange] = useState('ALL');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const query = useQuery({
    queryKey: [
      'admin-audit-logs',
      page,
      search.trim(),
      actionFilter,
      outcomeFilter,
      timeRange,
    ],
    queryFn: () =>
      auditLogApi.list({
        page,
        size: PAGE_SIZE,
        ...(search.trim() ? { query: search.trim() } : {}),
        ...(actionFilter !== 'ALL' ? { action: actionFilter } : {}),
        ...(outcomeFilter !== 'ALL' ? { outcome: outcomeFilter } : {}),
        ...(timeRange !== 'ALL' ? { days: Number(timeRange) } : {}),
      }),
  });

  const data = query.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const actionOptions = useMemo(() => {
    const available = new Set([...(data?.availableActions ?? []), ...KNOWN_ACTIONS]);
    if (actionFilter !== 'ALL') available.add(actionFilter);
    return [
      { value: 'ALL', label: t('All actions') },
      ...[...available].sort().map((action) => ({ value: action, label: action })),
    ];
  }, [actionFilter, data?.availableActions, t]);

  const setSearchAndReset = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <Box className="workspace-page" sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title={t('Platform activity log')}
        subtitle={t('Read-only record of privileged actions on the platform.')}
        breadcrumbs={[
          { label: t('Governance'), to: '/admin/dashboard' },
          { label: t('Activity log') },
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {t('Refresh')}
          </Button>
        }
      />

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearchAndReset}
        searchPlaceholder={t('Search actor, target, or trace ID')}
        searchLabel={t('Search activity')}
        visibleCount={items.length}
        totalCount={data?.total ?? 0}
        onClearAll={() => {
          setSearch('');
          setActionFilter('ALL');
          setOutcomeFilter('ALL');
          setTimeRange('ALL');
          setPage(0);
        }}
        filters={[
          {
            key: 'action',
            label: t('Action'),
            value: actionFilter,
            options: actionOptions,
            onChange: (value) => {
              setActionFilter(value);
              setPage(0);
            },
            width: 230,
          },
          {
            key: 'outcome',
            label: t('Outcome'),
            value: outcomeFilter,
            options: OUTCOME_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            })),
            onChange: (value) => {
              setOutcomeFilter(value);
              setPage(0);
            },
          },
          {
            key: 'days',
            label: t('Time range'),
            value: timeRange,
            options: TIME_RANGE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            })),
            onChange: (value) => {
              setTimeRange(value);
              setPage(0);
            },
          },
        ]}
      />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={items.length === 0}
        loadingLabel={t('Loading activity log…')}
        empty={
          <EmptyState
            title={t('No activity found')}
            description={t('Privileged actions will appear here as they are recorded.')}
          />
        }
      >
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}
              aria-label={t('Activity log')}
            >
              <Box component="thead">
                <Box component="tr">
                  {[
                    t('Time'),
                    t('Actor'),
                    t('Action'),
                    t('Target'),
                    t('Outcome'),
                  ].map((header) => (
                    <Box
                      component="th"
                      key={header}
                      sx={{
                        textAlign: 'left',
                        px: 2,
                        py: 1.25,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'text.secondary',
                        letterSpacing: '0.02em',
                        bgcolor: (muiTheme) =>
                          muiTheme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.03)'
                            : '#F9FAFB',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {items.map((entry) => (
                  <Box
                    component="tr"
                    key={entry.id}
                    tabIndex={0}
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={(event: ReactKeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedEntry(entry);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                      '& td': {
                        px: 2,
                        py: 1.25,
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <Box component="td" sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(entry.createdAt).toLocaleString(dateLocale)}
                    </Box>
                    <Box component="td">
                      <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        {entry.actorFullName || entry.actorEmail || '—'}
                      </Typography>
                      {entry.actorEmail && entry.actorFullName && (
                        <Typography variant="caption" color="text.secondary">
                          {entry.actorEmail}
                        </Typography>
                      )}
                    </Box>
                    <Box component="td">
                      <Typography
                        component="span"
                        sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                      >
                        {entry.action}
                      </Typography>
                    </Box>
                    <Box component="td">
                      <Typography variant="body2" color="text.secondary">
                        {entry.aggregateType} · {entry.aggregateId}
                      </Typography>
                    </Box>
                    <Box component="td">
                      <Typography variant="body2">{entry.outcome || '—'}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </QueryState>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mt: 2, alignItems: 'center', justifyContent: 'flex-end' }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('Page')} {totalPages === 0 ? 0 : page + 1} / {totalPages} · {data?.total ?? 0}{' '}
          {t('events')}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={page <= 0 || query.isFetching}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          {t('Previous')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={page + 1 >= totalPages || query.isFetching}
          onClick={() => setPage((current) => current + 1)}
        >
          {t('Next')}
        </Button>
      </Stack>

      <Dialog
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        fullWidth
        maxWidth="md"
      >
        {selectedEntry && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>{t('Activity event detail')}</DialogTitle>
            <Divider />
            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {t('Action')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                    {selectedEntry.action}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.75,
                  }}
                >
                  <DetailField label={t('Actor')} value={selectedEntry.actorFullName} />
                  <DetailField label={t('Email')} value={selectedEntry.actorEmail} />
                  <DetailField label={t('Outcome')} value={selectedEntry.outcome} />
                  <DetailField
                    label={t('Timestamp')}
                    value={new Date(selectedEntry.createdAt).toLocaleString(dateLocale)}
                  />
                  <DetailField label={t('Target type')} value={selectedEntry.aggregateType} />
                  <DetailField label={t('Target ID')} value={selectedEntry.aggregateId} mono />
                  <DetailField label={t('Trace ID')} value={selectedEntry.traceId} mono />
                  <DetailField label={t('Event ID')} value={selectedEntry.id} mono />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSelectedEntry(null)}>{t('Close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        color={value ? 'text.primary' : 'text.secondary'}
        sx={mono ? { fontFamily: 'monospace', overflowWrap: 'anywhere' } : undefined}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}
