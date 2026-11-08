import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { getSectionPath, type PortalId } from '@/app/permissions/accessPolicy';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { UnreadChatNotification } from '@/features/contracts/hooks/useContracts';
import {
  useMarkNotificationAsRead,
  useNotifications,
  useNotificationUnreadCount,
} from '../hooks/useNotifications';
import type { NotificationItem } from '../api/notificationApi';
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
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
  } = useNotifications(
    {
      page,
      pageSize: 10,
      unreadOnly: unreadOnly ? true : undefined,
    },
    { enabled: open },
  );

  const { data: unreadData } = useNotificationUnreadCount({ enabled: open });
  const unreadCount = unreadData?.unreadCount ?? 0;
  const markReadMutation = useMarkNotificationAsRead();

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setUnreadOnly(newValue === 1);
    setPage(1);
  };

  const handleItemSelect = (
    item: NotificationItem,
    safeRoute: string | null,
  ) => {
    if (!item.read && item.status !== 'READ') {
      markReadMutation.mutate(item.id);
    }
    if (safeRoute) {
      navigate(safeRoute);
      onClose();
    }
  };

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllInViewAsRead = () => {
    if (!pageData?.items) return;
    const unreadItems = pageData.items.filter(
      (item) => !item.read && item.status !== 'READ',
    );
    for (const item of unreadItems) {
      markReadMutation.mutate(item.id);
    }
  };

  const items = pageData?.items ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const hasUnreadInView = items.some(
    (item) => !item.read && item.status !== 'READ',
  );

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
            width: { xs: 340, sm: 400 },
            maxHeight: 560,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, pb: 1, bgcolor: 'background.paper' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Notifications')}
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} ${t('Unread')}`}
                size="small"
                color="primary"
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {hasUnreadInView && (
              <Tooltip title={t('Mark all as read')}>
                <Button
                  size="small"
                  startIcon={<DoneAllRounded fontSize="small" />}
                  onClick={handleMarkAllInViewAsRead}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    py: 0.25,
                    px: 1,
                  }}
                >
                  {t('Mark all as read')}
                </Button>
              </Tooltip>
            )}
            <Chip
              label={t('In-app')}
              variant="outlined"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.625rem',
                color: 'text.secondary',
                borderColor: 'divider',
              }}
            />
          </Stack>
        </Stack>

        <Tabs
          value={unreadOnly ? 1 : 0}
          onChange={handleTabChange}
          sx={{
            minHeight: 36,
            mt: 1,
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
      <Box sx={{ flex: 1, minHeight: 200, overflowY: 'auto' }}>
        {isLoading && (
          <Stack
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }}
          >
            <CircularProgress size={28} />
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
              sx={{ borderRadius: 1.5 }}
            >
              {t('Failed to load notifications')}
            </Alert>
          </Box>
        )}

        {/* Unread Contract Chat Messages */}
        {unreadChatItems && unreadChatItems.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(87, 80, 241, 0.1)' : '#eef2ff',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <ForumRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 750,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('Contract negotiation messages')}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {unreadChatItems.map((chat) => (
                <Box
                  key={chat.requestId}
                  onClick={() => {
                    navigate(`${getSectionPath(portal, 'contracts')}?requestId=${chat.requestId}`);
                    onClose();
                  }}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, fontSize: '0.8125rem' }}
                      noWrap
                    >
                      {chat.requestDescription}
                    </Typography>
                    <Chip
                      size="small"
                      color="error"
                      label={`${chat.unreadCount} ${t('New')}`}
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                    />
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                    noWrap
                  >
                    <strong>{chat.latestMessageAuthor}:</strong> {chat.latestMessageBody}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {!isLoading && !isError && items.length === 0 && (!unreadChatItems || unreadChatItems.length === 0) && (
          <Box sx={{ py: 3, px: 2 }}>
            <EmptyState
              title={t('No notifications')}
              description={t('You have no notifications right now.')}
            />
          </Box>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <List disablePadding>
            {items.map((item) => (
              <NotificationItemCard
                key={item.id}
                notification={item}
                portal={portal}
                onSelect={handleItemSelect}
                onMarkAsRead={handleMarkAsRead}
                isMarkingRead={markReadMutation.isPending}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Footer / Pagination */}
      {totalPages > 1 && (
        <>
          <Divider />
          <Box
            sx={{
              p: 1,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {page} / {totalPages}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeftRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                aria-label="Next page"
              >
                <ChevronRightRounded fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </>
      )}
    </Popover>
  );
}

