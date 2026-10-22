import React, { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import type { RoleId } from '../data/report3DashboardData';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface DashboardHeaderActionsProps {
  currentRole: RoleId;
  availableRoles: readonly RoleId[];
  onRoleChange: (role: RoleId) => void;
  onRefresh?: () => void;
  onExport?: () => void;
}

export const DashboardHeaderActions: React.FC<DashboardHeaderActionsProps> = ({
  currentRole,
  availableRoles,
  onRoleChange,
  onRefresh,
  onExport,
}) => {
  const { t } = useLocale();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setSpinning(false), 700);
  };

  const roles: Array<{ id: RoleId; label: string }> = [
    { id: 'ORG_ADMIN', label: 'Org Admin' },
    { id: 'ADMIN', label: 'Platform Admin' },
    { id: 'INSPECTOR', label: 'Inspector' },
    { id: 'MAINTENANCE_ENGINEER', label: 'Maintenance' },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      {/* Role Switcher Pills */}
      <Box
        sx={{
          display: { xs: 'none', md: availableRoles.length > 1 ? 'flex' : 'none' },
          alignItems: 'center',
          bgcolor: 'action.hover',
          p: 0.5,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          gap: 0.5,
        }}
      >
        {roles.filter((role) => availableRoles.includes(role.id)).map((r) => {
          const isActive = currentRole === r.id;
          return (
            <Button
              key={r.id}
              size="small"
              onClick={() => onRoleChange(r.id)}
              sx={{
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'primary.contrastText' : 'text.secondary',
                bgcolor: isActive ? 'primary.main' : 'transparent',
                borderRadius: '8px',
                px: 1.25,
                py: 0.5,
                minHeight: 28,
                textTransform: 'none',
                boxShadow: isActive ? '0 1px 2px 0 rgb(87 80 241 / 0.3)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              {r.label}
            </Button>
          );
        })}
      </Box>

      {/* Refresh Button */}
      <Tooltip title={t('Refresh metrics')}>
        <IconButton
          onClick={handleRefresh}
          aria-label={t('Refresh metrics')}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.primary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <AutorenewRounded
            sx={{
              fontSize: 18,
              transition: 'transform 0.6s ease',
              transform: spinning ? 'rotate(360deg)' : 'none',
            }}
          />
        </IconButton>
      </Tooltip>

      {/* Date Range Picker Button */}
      <Button
        startIcon={<CalendarTodayOutlined sx={{ fontSize: 16 }} />}
        sx={{
          height: 40,
          px: 1.75,
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {t('Sep 09 - Oct 09')}
      </Button>

      {/* Export Button */}
      <Button
        onClick={onExport}
        startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />}
        sx={{
          height: 40,
          px: 2,
          borderRadius: '8px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {t('Export')}
      </Button>
    </Box>
  );
};
