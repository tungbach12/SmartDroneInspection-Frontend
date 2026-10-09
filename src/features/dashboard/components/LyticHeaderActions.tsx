import React, { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import type { RoleId } from '../data/report3DashboardData';

export interface LyticHeaderActionsProps {
  currentRole: RoleId;
  onRoleChange: (role: RoleId) => void;
  onRefresh?: () => void;
  onExport?: () => void;
}

export const LyticHeaderActions: React.FC<LyticHeaderActionsProps> = ({
  currentRole,
  onRoleChange,
  onRefresh,
  onExport,
}) => {
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
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          bgcolor: 'var(--lytic-border-light, #f3f4f6)',
          p: 0.5,
          borderRadius: '10px',
          border: '1px solid var(--lytic-border, #e5e7eb)',
          gap: 0.5,
        }}
      >
        {roles.map((r) => {
          const isActive = currentRole === r.id;
          return (
            <Button
              key={r.id}
              size="small"
              onClick={() => onRoleChange(r.id)}
              sx={{
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--lytic-text, #6b7280)',
                bgcolor: isActive ? 'var(--lytic-primary, #3758F9)' : 'transparent',
                borderRadius: '8px',
                px: 1.25,
                py: 0.5,
                minHeight: 28,
                textTransform: 'none',
                boxShadow: isActive ? '0 1px 2px 0 rgba(55, 88, 249, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? 'var(--lytic-primary-hover, #2237ee)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {r.label}
            </Button>
          );
        })}
      </Box>

      {/* Refresh Button */}
      <Tooltip title="Refresh metrics">
        <IconButton
          onClick={handleRefresh}
          aria-label="Refresh metrics"
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            border: '1px solid var(--lytic-border, #e5e7eb)',
            bgcolor: 'var(--lytic-bg-card, #ffffff)',
            color: 'var(--lytic-title, #1f2937)',
            '&:hover': { bgcolor: 'var(--lytic-border-light, #f3f4f6)' },
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
          border: '1px solid var(--lytic-border, #e5e7eb)',
          bgcolor: 'var(--lytic-bg-card, #ffffff)',
          color: 'var(--lytic-title, #1f2937)',
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { bgcolor: 'var(--lytic-border-light, #f3f4f6)' },
        }}
      >
        Sep 09 - Oct 09
      </Button>

      {/* Export Button */}
      <Button
        onClick={onExport}
        startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />}
        sx={{
          height: 40,
          px: 2,
          borderRadius: '8px',
          bgcolor: 'var(--lytic-primary, #3758F9)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': { bgcolor: 'var(--lytic-primary-hover, #2237ee)' },
        }}
      >
        Export
      </Button>
    </Box>
  );
};
