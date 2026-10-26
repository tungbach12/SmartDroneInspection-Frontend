import { useState, type MouseEvent } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import type { PortalId } from '@/app/permissions/accessPolicy';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useNotificationUnreadCount } from '../hooks/useNotifications';
import { NotificationInboxPopover } from './NotificationInboxPopover';

interface NotificationBellProps {
  portal: PortalId;
}

export function NotificationBell({ portal }: NotificationBellProps) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data } = useNotificationUnreadCount();
  const unreadCount = data?.unreadCount ?? 0;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const label =
    unreadCount > 0
      ? `${t('Notifications')} (${unreadCount})`
      : t('Notifications');

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          color="inherit"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchorEl)}
          onClick={handleClick}
          data-testid="notification-bell-button"
          sx={{
            mr: 1,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            overlap="circular"
          >
            <NotificationsOutlined fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <NotificationInboxPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        portal={portal}
      />
    </>
  );
}

