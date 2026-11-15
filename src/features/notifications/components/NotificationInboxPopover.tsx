import { useMemo, useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Popover,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenInFullRounded from '@mui/icons-material/OpenInFullRounded';
import { getSectionPath, type PortalId } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  useMarkMessagesRead,
  type UnreadChatNotification,
} from '@/features/contracts/hooks/useContracts';
import {
  useMarkNotificationAsRead,
  useNotifications,
} from '../hooks/useNotifications';
import {
  buildUnifiedNotificationEntries,
  groupNotificationsByDay,
  type UnifiedNotificationEntry,
} from '../utils/notificationFeed';
import { NotificationItemCard } from './NotificationItemCard';

interface NotificationInboxPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  portal: PortalId;
  unreadChatItems?: UnreadChatNotification[];
}

export function NotificationInboxPopover({
  anchorEl,
  open,
  onClose,
  portal,
  unreadChatItems,
}: NotificationInboxPopoverProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
  } = useNotifications(
    {
      page: 1,
      pageSize: 15,
      unreadOnly: unreadOnly ? true : undefined,
    },
    { enabled: open },
  );

  const markReadMutation = useMarkNotificationAsRead();
  const markChatReadMutation = useMarkMessagesRead();

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setUnreadOnly(newValue === 1);
  };

  const handleEntrySelect = (entry: UnifiedNotificationEntry) => {
    if (entry.kind === 'chat' && entry.chatRequestId) {
      markChatReadMutation.mutate(entry.chatRequestId);
    } else if (entry.isUnread) {
      markReadMutation.mutate(entry.id);
    }
    if (entry.safeRoute) {
      navigate(entry.safeRoute);
      onClose();
    }
  };

  const handleMarkAsRead = (entry: UnifiedNotificationEntry) => {
    if (entry.kind === 'notification') {
      markReadMutation.mutate(entry.id);
    }
  };

  const rawItems = useMemo(() => pageData?.items ?? [], [pageData?.items]);
  const unifiedEntries = useMemo(
    () =>
      buildUnifiedNotificationEntries(
        rawItems,
        unreadChatItems,
        portal,
        roles,
        unreadOnly,
      ),
    [rawItems, unreadChatItems, portal, roles, unreadOnly],
  );
  const dayGroups = useMemo(
    () => groupNotificationsByDay(unifiedEntries),
    [unifiedEntries],
  );

  const hasUnreadInView = unifiedEntries.some((entry) => entry.isUnread);

  const handleMarkAllInViewAsRead = () => {
    for (const entry of unifiedEntries) {
      if (!entry.isUnread) continue;
      if (entry.kind === 'chat' && entry.chatRequestId) {
        markChatReadMutation.mutate(entry.chatRequestId);
      } else {
        markReadMutation.mutate(entry.id);
      }
    }
  };

  const handleViewAll = () => {
    navigate(getSectionPath(portal, 'notifications'));
    onClose();
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100vw - 24px)', sm: 400 },
            maxWidth: 400,
            maxHeight: 580,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5, bgcolor: 'background.paper' }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {t('Notifications')}
          </Typography>
          <Tooltip title={t('Open notifications page')}>
            <IconButton
              size="small"
              aria-label={t('Open notifications page')}
              onClick={handleViewAll}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <OpenInFullRounded sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Tabs
          value={unreadOnly ? 1 : 0}
          onChange={handleTabChange}
          sx={{
            minHeight: 36,
            mt: 0.5,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab label={t('All')} />
          <Tab label={t('Only unread')} />
        </Tabs>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 220, overflowY: 'auto' }}>
        {isLoading && (
          <Stack
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }}
          >
            <CircularProgress size={26} />
            <Typography variant="body2" color="text.secondary">
              {t('Loading notifications…')}
            </Typography>
          </Stack>
        )}

        {isError && (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  {t('Try again')}
                </Button>
              }
              sx={{ borderRadius: '8px' }}
            >
              {t('Failed to load notifications')}
            </Alert>
          </Box>
        )}

        {!isLoading && !isError && dayGroups.length === 0 && (
          <Box sx={{ py: 4, px: 2 }}>
            <EmptyState
              title={t('No notifications')}
              description={t('You have no notifications right now.')}
            />
          </Box>
        )}

        {!isLoading && !isError && dayGroups.length > 0 && (
          <Box>
            {dayGroups.map((group) => (
              <Box key={group.bucket}>
                <Box
                  sx={{
                    px: 2.5,
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
                      fontSize: '0.72rem',
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
                      compact
                    />
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Button
          size="small"
          variant="text"
          disabled={!hasUnreadInView}
          onClick={handleMarkAllInViewAsRead}
          sx={{
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'text.secondary',
            textDecoration: 'underline',
            px: 0.5,
            minWidth: 'auto',
            '&:hover': {
              bgcolor: 'transparent',
              color: 'text.primary',
              textDecoration: 'underline',
            },
          }}
        >
          {t('Mark all as read')}
        </Button>

        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleViewAll}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            borderRadius: '8px',
            px: 2.25,
            py: 0.75,
            boxShadow: 'none',
          }}
        >
          {t('View All')}
        </Button>
      </Box>
    </Popover>
  );
}
