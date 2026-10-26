import {
  Box,
  IconButton,
  ListItem,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type { PortalId } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { NotificationItem } from '../api/notificationApi';
import { resolveSafeNotificationRoute } from '../utils/targetPath';

interface NotificationItemCardProps {
  notification: NotificationItem;
  portal: PortalId;
  onSelect: (notification: NotificationItem, safeRoute: string | null) => void;
  onMarkAsRead: (id: string) => void;
  isMarkingRead?: boolean;
}

export function NotificationItemCard({
  notification,
  portal,
  onSelect,
  onMarkAsRead,
  isMarkingRead = false,
}: NotificationItemCardProps) {
  const { t, formatDateTime } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const safeRoute = resolveSafeNotificationRoute(
    notification.targetPath,
    portal,
    roles,
  );
  const isUnread = !notification.read && notification.status !== 'READ';

  return (
    <ListItem
      disablePadding
      secondaryAction={
        isUnread ? (
          <Tooltip title={t('Mark as read')}>
            <span>
              <IconButton
                edge="end"
                size="small"
                disabled={isMarkingRead}
                aria-label={t('Mark as read')}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                sx={{
                  mr: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <CheckRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : undefined
      }
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: isUnread ? 'action.hover' : 'inherit',
      }}
    >
      <ListItemButton
        onClick={() => onSelect(notification, safeRoute)}
        sx={{
          py: 1.5,
          px: 2,
          gap: 1.5,
          alignItems: 'flex-start',
          pr: isUnread ? 6 : 2,
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            mt: 0.75,
            flexShrink: 0,
            bgcolor: isUnread ? 'primary.main' : 'transparent',
          }}
        />

        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: isUnread ? 700 : 500,
                color: isUnread ? 'text.primary' : 'text.secondary',
                lineHeight: 1.3,
              }}
            >
              {notification.title}
            </Typography>
            {safeRoute && (
              <ArrowForwardRounded
                fontSize="inherit"
                sx={{
                  color: 'text.disabled',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              />
            )}
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.8125rem',
              lineHeight: 1.4,
            }}
          >
            {notification.body}
          </Typography>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: '0.75rem', mt: 0.25 }}
          >
            {formatDateTime(notification.createdAt)}
          </Typography>
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}

