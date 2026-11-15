import { useId } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes, useTheme } from '@mui/material/styles';

const orbitSpin = keyframes`
  to { transform: rotate(360deg); }
`;

const haloPulse = keyframes`
  0%, 100% { transform: scale(0.92); opacity: 0.72; }
  50% { transform: scale(1.08); opacity: 1; }
`;

const irisBreathe = keyframes`
  0%, 100% { transform: rotate(0deg) scale(0.96); }
  50% { transform: rotate(12deg) scale(1.04); }
`;

const barSweep = keyframes`
  0% { transform: translateX(-110%); }
  100% { transform: translateX(230%); }
`;

interface BrandLoadingScreenProps {
  label?: string;
  minHeight?: string | number;
}

export function BrandLoadingScreen({
  label,
  minHeight = '100vh',
}: BrandLoadingScreenProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const gradientId = useId();

  return (
    <Box
      role="status"
      aria-label={label ?? 'Loading'}
      sx={{
        minHeight,
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        background: isDark
          ? 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.14), transparent 52%), radial-gradient(circle at 52% 56%, rgba(45, 212, 191, 0.1), transparent 46%), #0b1120'
          : 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.11), transparent 52%), radial-gradient(circle at 52% 56%, rgba(45, 212, 191, 0.09), transparent 46%), #f8fafc',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 96,
            height: 96,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: -10,
              borderRadius: '999px',
              background:
                'radial-gradient(circle, rgba(59, 130, 246, 0.24) 0%, rgba(45, 212, 191, 0.12) 48%, transparent 72%)',
              animation: `${haloPulse} 2.4s ease-in-out infinite`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '999px',
              padding: '3px',
              background:
                'conic-gradient(from 0deg, #3b82f6 0deg, #0ea5e9 95deg, #2dd4bf 190deg, rgba(59, 130, 246, 0.08) 280deg, transparent 360deg)',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              animation: `${orbitSpin} 1.45s cubic-bezier(0.45, 0.15, 0.55, 0.85) infinite`,
            }}
          />
          <Box
            sx={{
              position: 'relative',
              width: 72,
              height: 72,
              borderRadius: '999px',
              bgcolor: isDark
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(255, 255, 255, 0.92)',
              border: '1px solid',
              borderColor: isDark
                ? 'rgba(148, 163, 184, 0.18)'
                : 'rgba(148, 163, 184, 0.24)',
              boxShadow: '0 12px 32px -12px rgba(15, 23, 42, 0.18)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              sx={{
                width: 44,
                height: 44,
                animation: `${irisBreathe} 2.4s ease-in-out infinite`,
              }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="8"
                  y1="6"
                  x2="40"
                  y2="42"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>
              <path
                d="M9.97 12.72A18 18 0 0 1 33.6 8.78L29.88 18A8.4 8.4 0 0 0 19.83 16.71Z"
                fill="#3B82F6"
              />
              <path
                d="M35.28 9.97A18 18 0 0 1 39.22 33.6L30 29.88A8.4 8.4 0 0 0 31.29 19.83Z"
                fill="#0EA5E9"
              />
              <path
                d="M38.03 35.28A18 18 0 0 1 14.4 39.22L18.12 30A8.4 8.4 0 0 0 28.17 31.29Z"
                fill={`url(#${gradientId})`}
              />
              <path
                d="M12.72 38.03A18 18 0 0 1 8.78 14.4L18 18.12A8.4 8.4 0 0 0 16.71 28.17Z"
                fill="#2B84EB"
              />
              <circle cx="24" cy="24" r="5.6" fill={`url(#${gradientId})`} />
              <circle cx="24" cy="24" r="2.4" fill="#FFFFFF" />
            </Box>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            SDI
          </Typography>
          {label ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontWeight: 500 }}
            >
              {label}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            width: 144,
            height: 3,
            borderRadius: '999px',
            bgcolor: isDark
              ? 'rgba(59, 130, 246, 0.2)'
              : 'rgba(59, 130, 246, 0.14)',
            overflow: 'hidden',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              width: '46%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #3b82f6, #0ea5e9, #2dd4bf)',
              animation: `${barSweep} 1.5s ease-in-out infinite`,
            },
          }}
        />
      </Box>
    </Box>
  );
}
