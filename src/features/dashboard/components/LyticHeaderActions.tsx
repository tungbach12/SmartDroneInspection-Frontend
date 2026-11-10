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
    { id: 'CUSTOMER', label: 'Org Manager' },
    { id: 'ADMIN', label: 'Platform Admin' },
    { id: 'MANAGER', label: 'Platform Manager' },
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
                fontSize: '0.75rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : '#71717A',
                bgcolor: isActive ? '#3758F9' : 'transparent',
                borderRadius: '8px',
                px: 1.25,
                py: 0.5,
                minHeight: 28,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: isActive ? '#4338CA' : 'action.hover',
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

      {/* Reporting Period Badge */}
      <Box
        role="region"
        aria-label={t('Reporting period')}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          height: 40,
          px: 1.75,
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.secondary',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <CalendarTodayOutlined sx={{ fontSize: 15 }} />
        <span>
          {`${t('Year')} ${new Date().getFullYear()} (01/01 - ${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')})`}
        </span>
      </Box>

      {/* Export Button */}
      <Button
        variant="outlined"
        onClick={onExport}
        aria-label={t('Export dashboard')}
        startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />}
        sx={{
          height: 40,
          px: 2,
          borderRadius: '8px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
        }}
      >
        {t('Export')}
      </Button>
    </Box>
  );
};
