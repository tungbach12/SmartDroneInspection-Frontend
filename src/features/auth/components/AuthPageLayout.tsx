import type { PropsWithChildren, ReactNode } from 'react';
import { Box, Button, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { NextAdminLogoMark } from '@/shared/ui/NextAdminIcons';
import { DroneScene3D } from './DroneScene3D';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function BrandLogo() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.15 }}>
      <NextAdminLogoMark width={32} height={32} style={{ display: 'block' }} />
      <Typography
        sx={{
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#18181B',
          fontFamily: 'inherit',
        }}
      >
        SDI<Box component="span" sx={{ color: '#2B84EB' }}>.</Box>
      </Typography>
    </Box>
  );
}

interface AuthPageLayoutProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string | null;
  subtitleText?: string;
  subtitleLinkText?: string;
  subtitleLinkTo?: string;
  backLabel?: string;
  backTo?: string;
  heroTagline?: { line1: string; line2: string };
  socialPrompt?: string;
  showSocial?: boolean;
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  footer?: ReactNode;
  workspaceCopy?: { sideLabel: string; sideTitle: string; sideBody: string };
  sideLabels?: readonly string[];
  formMaxWidth?: number | string;
}

const defaultGoogleLogin = () => {
  const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
  window.location.href = `${apiBase}/auth/oauth2/authorize/google?client_type=web`;
};

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  subtitleText,
  subtitleLinkText,
  subtitleLinkTo,
  backLabel = 'Back to website',
  backTo = '/',
  heroTagline = {
    line1: 'Autonomous Aerial Inspection',
    line2: 'Precision 3D Infrastructure Telemetry',
  },
  socialPrompt = 'Or, Login with',
  showSocial = true,
  onGoogleClick,
  onAppleClick: _onAppleClick,
  footer,
  formMaxWidth = '400px',
  children,
}: AuthPageLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#FFFFFF',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '60fr 40fr', lg: '64fr 36fr' },
        alignItems: 'stretch',
        fontFamily: 'var(--lytic-font, "Geist Sans", sans-serif)',
      }}
    >
      {/* Left Pane: Interactive Three.js 3D Drone Inspection Animation */}
      <DroneScene3D
        backLabel={backLabel}
        backTo={backTo}
        heroTagline={heroTagline}
      />

      {/* Right Pane: Clean Form */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 2.5, sm: 3.5, md: 4, lg: 4.5 },
          py: { xs: 3, md: 4 },
          bgcolor: '#FFFFFF',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: formMaxWidth }}>
          {/* Top-Left Brand Logo */}
          <Box sx={{ mb: 3.5 }}>
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 0.85 },
              }}
            >
              <BrandLogo />
            </Link>
          </Box>

          {/* Left-Aligned Bold Heading & Subtitle */}
          <Box sx={{ mb: 3 }}>
            {eyebrow && (
              <Typography
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.09em',
                  color: '#2B84EB',
                  mb: 0.75,
                }}
              >
                {eyebrow}
              </Typography>
            )}
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '28px', sm: '32px' },
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#18181B',
                lineHeight: 1.2,
                mb: 0.75,
              }}
            >
              {title}
            </Typography>
            {description !== null && (
              <Typography sx={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                {description || 'Enter to get unlimited access to data & information.'}
              </Typography>
            )}
          </Box>

          {/* Form Fields & Primary Submit Button */}
          <Box>{children}</Box>

          {/* Divider & Social Button Below Form (Matches Reference Image) */}
          {showSocial && (
            <Box sx={{ mt: 2.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2.25,
                }}
              >
                <Box sx={{ flex: 1, height: '1px', bgcolor: '#E2E8F0' }} />
                <Typography sx={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  {socialPrompt}
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: '#E2E8F0' }} />
              </Box>

              <Button
                type="button"
                variant="outlined"
                fullWidth
                onClick={onGoogleClick ?? defaultGoogleLogin}
                startIcon={<GoogleIcon />}
                sx={{
                  height: 46,
                  borderRadius: '10px',
                  borderColor: '#E2E8F0',
                  color: '#1E293B',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  bgcolor: '#FFFFFF',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#CBD5E1',
                    bgcolor: '#F8FAFC',
                  },
                }}
              >
                Continue with Google
              </Button>
            </Box>
          )}

          {/* Bottom Register/Login Switch Link */}
          {subtitleText && (
            <Typography
              sx={{
                mt: 3,
                textAlign: 'center',
                fontSize: '13.5px',
                color: '#0F172A',
                fontWeight: 500,
              }}
            >
              {subtitleText}{' '}
              {subtitleLinkText && subtitleLinkTo && (
                <Link
                  component={RouterLink}
                  to={subtitleLinkTo}
                  underline="hover"
                  sx={{
                    color: '#2B84EB',
                    fontWeight: 600,
                    transition: 'color 0.2s ease',
                    '&:hover': { color: '#1F71D4' },
                  }}
                >
                  {subtitleLinkText}
                </Link>
              )}
            </Typography>
          )}

          {footer && (
            <Box sx={{ pt: 2, textAlign: 'center' }}>
              {footer}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
