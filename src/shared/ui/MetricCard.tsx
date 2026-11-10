import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  subtext?: string;
  iconType?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  positive = true,
  subtext,
  iconType,
}) => {
  const { t } = useLocale();

  const getNextAdminIconConfig = () => {
    switch (iconType) {
      case 'building':
      case 'plane':
      case 'eye':
      case 'flight':
        return {
          bgcolor: 'rgba(59, 130, 246, 0.10)',
          color: '#3B82F6',
          svg: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1.68452 9.99242C1.27207 9.38798 1.27207 8.61202 1.68452 8.00758C3.22591 5.74848 5.93297 3.75 9 3.75C12.067 3.75 14.7741 5.74848 16.3155 8.00758C16.7279 8.61202 16.7279 9.38798 16.3155 9.99242C14.7741 12.2515 12.067 14.25 9 14.25C5.93297 14.25 3.22591 12.2515 1.68452 9.99242Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="9"
                cy="9"
                r="2.25"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          ),
        };
      case 'dollar':
      case 'check-circle':
      case 'wallet':
      case 'fact-check':
        return {
          bgcolor: 'rgba(34, 197, 94, 0.10)',
          color: '#16A34A',
          svg: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1.5 10.5C1.5 7.67157 1.5 6.25736 2.37868 5.37868C3.25736 4.5 4.67157 4.5 7.5 4.5H10.5C13.3284 4.5 14.7426 4.5 15.6213 5.37868C16.5 6.25736 16.5 7.67157 16.5 10.5C16.5 13.3284 16.5 14.7426 15.6213 15.6213C14.7426 16.5 13.3284 16.5 10.5 16.5H7.5C4.67157 16.5 3.25736 16.5 2.37868 15.6213C1.5 14.7426 1.5 13.3284 1.5 10.5Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M12 4.5C12 3.08579 12 2.37868 11.5607 1.93934C11.1213 1.5 10.4142 1.5 9 1.5C7.58579 1.5 6.87868 1.5 6.43934 1.93934C6 2.37868 6 3.08579 6 4.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M9 13C9.82843 13 10.5 12.3284 10.5 11.5C10.5 10.6716 9.82843 10 9 10C8.17157 10 7.5 10.6716 7.5 11.5C7.5 12.3284 8.17157 13 9 13ZM9 13V14M9 10V9"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ),
        };
      case 'clock':
      case 'users':
      case 'user':
      case 'lightning':
      case 'access-time':
        return {
          bgcolor: 'rgba(168, 85, 247, 0.10)',
          color: '#A855F7',
          svg: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="6.75"
                cy="4.5"
                r="3"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M11.25 6.75C12.4926 6.75 13.5 5.74264 13.5 4.5C13.5 3.25736 12.4926 2.25 11.25 2.25"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <ellipse
                cx="6.75"
                cy="12.75"
                rx="5.25"
                ry="3"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M13.5 10.5C14.8157 10.7885 15.75 11.5192 15.75 12.375C15.75 13.1471 14.9896 13.8172 13.875 14.1558"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ),
        };
      case 'shield':
      case 'wrench':
      case 'alert':
      case 'box':
      case 'report':
      default:
        return {
          bgcolor: 'rgba(249, 115, 22, 0.10)',
          color: '#F97316',
          svg: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11.6833 2.53648L13.1833 3.32364C14.6661 4.10173 15.4075 4.49077 15.8288 5.16109C16.25 5.83141 16.25 6.6691 16.25 8.34447V9.65553C16.25 11.3309 16.25 12.1686 15.8288 12.8389C15.4075 13.5092 14.6661 13.8983 13.1833 14.6764L11.6833 15.4635C10.3711 16.1521 9.71499 16.4964 9 16.4964C8.28501 16.4964 7.62889 16.1521 6.31666 15.4635L4.81666 14.6764C3.33389 13.8983 2.5925 13.5092 2.17125 12.8389C1.75 12.1686 1.75 11.3309 1.75 9.65553V8.34447C1.75 6.6691 1.75 5.83141 2.17125 5.16109C2.5925 4.49077 3.33389 4.10173 4.81666 3.32364L6.31666 2.53648C7.62889 1.8479 8.28501 1.50361 9 1.50361C9.71499 1.50361 10.3711 1.8479 11.6833 2.53648Z"
                fill="currentColor"
                fillOpacity="0.15"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M15.75 5.625L12.75 7.125M9 9L2.25 5.625M9 9V16.125M9 9L12.75 7.125M12.75 7.125L6 3.375"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ),
        };
    }
  };

  const iconConfig = getNextAdminIconConfig();
  const displayChange = change ?? subtext;

  return (
    <Box
      component="div"
      role="group"
      aria-label={`${t(label)}: ${value}`}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        p: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
      }}
    >
      {/* Top Row: 32x32 soft-tinted icon badge */}
      <Box
        sx={{
          display: 'flex',
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          bgcolor: iconConfig.bgcolor,
          color: iconConfig.color,
          flexShrink: 0,
        }}
      >
        {iconConfig.svg}
      </Box>

      {/* Middle Value */}
      <Typography
        component="p"
        sx={{
          mt: '24px',
          mb: '5px',
          fontSize: { xs: '1.25rem', md: '1.5rem' },
          lineHeight: { xs: '1.75rem', md: '2rem' },
          fontWeight: 600,
          color: 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {t(value)}
      </Typography>

      {/* Bottom Row: Label on left, Change with NextAdmin arrow on right */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            fontWeight: 500,
            color: '#71717A',
          }}
        >
          {t(label)}
        </Typography>

        {displayChange && (
          <Box
            component="span"
            sx={{
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              fontWeight: 500,
              color: positive ? '#16A34A' : '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span>{t(displayChange)}</span>
            {positive ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 13.3332L8 2.6665M4 6.6665L8 2.6665L12 6.6665"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 2.6665L8 13.3332M4 9.33317L8 13.3332L12 9.33317"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
