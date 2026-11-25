import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  InputAdornment,
  List,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import SearchIcon from '@mui/icons-material/Search';
import { getSectionPath, PORTAL_IDS, type PortalId } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useMarkInspectionMessagesRead,
  useMarkMessagesRead,
  useMarkPartnerMessagesRead,
  useUnreadChatSummary,
} from '@/features/contracts/hooks/useContracts';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { NotificationItemCard } from '../components/NotificationItemCard';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useNotificationUnreadCount,
} from '../hooks/useNotifications';
import {
  buildUnifiedNotificationEntries,
  groupNotificationsByDay,
  type UnifiedNotificationEntry,
} from '../utils/notificationFeed';

export default function NotificationsPage() {
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const notificationsQuery = useNotifications({
    page,
    pageSize,
    unreadOnly: unreadOnly ? true : undefined,
  });
  const { data: unreadCountData } = useNotificationUnreadCount();
  const { items: unreadChatItems, totalUnread: unreadChatCount } = useUnreadChatSummary();
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();
  const markChatReadMutation = useMarkMessagesRead();
  const markInspectionChatReadMutation = useMarkInspectionMessagesRead('');
  const markPartnerChatReadMutation = useMarkPartnerMessagesRead('', '');

  const markChatEntryRead = (entry: UnifiedNotificationEntry) => {
    const channel = entry.chatChannel ?? 'requests';
    if (channel === 'inspections') {
      const inspectionId = entry.chatInspectionId ?? entry.chatRequestId;
      if (inspectionId) {
        markInspectionChatReadMutation.mutate(inspectionId);
      }
      return;
    }
    if (channel === 'partners') {
      if (entry.chatRequestId && entry.chatInspectorId) {
        markPartnerChatReadMutation.mutate({
          requestId: entry.chatRequestId,
          inspectorId: entry.chatInspectorId,
        });
      }
      return;
    }
    if (entry.chatRequestId) {
      markChatReadMutation.mutate(entry.chatRequestId);
    }
  };

  const totalUnread = (unreadCountData?.unreadCount ?? 0) + unreadChatCount;
  const rawItems = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );
  const totalPages = notificationsQuery.data?.totalPages ?? 1;

  const filteredEntries = useMemo(() => {
    const entries = buildUnifiedNotificationEntries(
      rawItems,
      page === 1 ? unreadChatItems : undefined,
      portal,
      roles,
      unreadOnly,
      locale,
    );
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.body.toLowerCase().includes(q),
    );
  }, [rawItems, page, unreadChatItems, portal, roles, unreadOnly, locale, searchQuery]);

  const dayGroups = useMemo(
    () => groupNotificationsByDay(filteredEntries),
    [filteredEntries],
  );

  const hasUnreadInView = filteredEntries.some((entry) => entry.isUnread);

  const handleEntrySelect = (entry: UnifiedNotificationEntry) => {
    if (entry.kind === 'chat') {
      markChatEntryRead(entry);
    } else if (entry.isUnread) {
      markReadMutation.mutate(entry.id);
    }
    if (entry.safeRoute) {
      navigate(entry.safeRoute);
    }
  };

  const handleMarkAsRead = (entry: UnifiedNotificationEntry) => {
    if (entry.kind === 'notification') {
      markReadMutation.mutate(entry.id);
    }
  };

  const handleMarkAllInViewAsRead = () => {
    if (filteredEntries.some((entry) => entry.kind === 'notification' && entry.isUnread)) {
      markAllReadMutation.mutate();
    }
    for (const entry of filteredEntries) {
      if (!entry.isUnread || entry.kind !== 'chat') continue;
      markChatEntryRead(entry);
    }
  };

  return (
    <Box className="workspace-page workspace-page--notifications">
      <PageHeader
        title={t('Notifications')}
        breadcrumbs={[
          { label: 'Home', to: getSectionPath(portal, 'dashboard') },
          { label: t('Notifications') },
        ]}
      />

      <Paper
        variant="outlined"
        sx={{
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          boxShadow: 'none',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            pt: 1.5,
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Tabs
            value={unreadOnly ? 1 : 0}
            onChange={(_e, next) => {
              setUnreadOnly(next === 1);
              setPage(1);
            }}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.75,
                px: 1.75,
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
              },
            }}
          >
            <Tab label={t('All')} />
            <Tab
              label={
                totalUnread > 0
                  ? `${t('Only unread')} (${totalUnread})`
                  : t('Only unread')
              }
            />
          </Tabs>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{ alignItems: { sm: 'center' }, width: { xs: '100%', md: 'auto' } }}
          >
            <TextField
              size="small"
              placeholder={t('Search notifications…')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('Search notifications') },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: '100%', sm: 250 },
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                },
              }}
            />

            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={!hasUnreadInView}
              startIcon={<DoneAllRounded fontSize="small" />}
              onClick={handleMarkAllInViewAsRead}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                borderColor: 'divider',
                minHeight: 40,
                px: 1.75,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t('Mark all as read')}
            </Button>
          </Stack>
        </Box>

        {/* Feed */}
        <QueryState
          isLoading={notificationsQuery.isLoading}
          error={notificationsQuery.error}
          isEmpty={dayGroups.length === 0}
          onRetry={() => void notificationsQuery.refetch()}
          loadingLabel={t('Loading notifications…')}
          empty={
            <Box sx={{ py: 4, px: 2 }}>
              <EmptyState
                title={t('No notifications')}
                description={t('You have no notifications right now.')}
              />
            </Box>
          }
        >
          <Box>
            {dayGroups.map((group) => (
              <Box key={group.bucket}>
                <Box
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.03)'
                        : '#F9FAFB',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      letterSpacing: '0.06em',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(group.label)}
                  </Typography>
                </Box>
                <List disablePadding>
                  {group.items.map((entry) => (
                    <NotificationItemCard
                      key={entry.id}
                      entry={entry}
                      portal={portal}
                      onSelect={handleEntrySelect}
                      onMarkAsRead={handleMarkAsRead}
                      isMarkingRead={markReadMutation.isPending}
                    />
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        </QueryState>

        {totalPages > 1 && (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, next) => setPage(next)}
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
