import type { PropsWithChildren, ReactNode } from 'react';
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style={{ display: 'block' }}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.06 1.73-.93 2.76 1 .08 2-.51 2.62-1.26" />
    </svg>
  );
}

function BrandLogo() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <path
          d="M16 3L28 10V22L16 29L4 22V10L16 3Z"
          stroke="#63BAC0"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="4" fill="#FFFFFF" />
        <path
          d="M16 6V11M16 21V26M6 16H11M21 16H26"
          stroke="#63BAC0"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <Typography
        sx={{
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: '#FFFFFF',
          fontFamily: 'inherit',
        }}
      >
        SmartDrone
      </Typography>
    </Box>
  );
}

interface AuthPageLayoutProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  subtitleText?: string;
  subtitleLinkText?: string;
  subtitleLinkTo?: string;
  backLabel?: string;
  backTo?: string;
  heroTagline?: { line1: string; line2: string };
  socialPrompt?: string;
  showSocial?: boolean;
  footer?: ReactNode;
  workspaceCopy?: { sideLabel: string; sideTitle: string; sideBody: string };
  sideLabels?: readonly string[];
}

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
    line1: 'Capturing Perspectives,',
    line2: 'Creating Confidence',
  },
  socialPrompt = 'Or register with',
  showSocial = true,
  footer,
  children,
}: AuthPageLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: '#131D26',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 3, md: 5 },
        px: { xs: 2, sm: 3, md: 4 },
        fontFamily: 'var(--lytic-font, "Geist Sans", sans-serif)',
      }}
    >
      {/* Ambient Landing Page Lighting */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '650px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8, 126, 139, 0.18) 0%, transparent 65%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: '-12%',
          right: '8%',
          width: '550px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 186, 192, 0.12) 0%, transparent 65%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10 }}>
        {/* Main Floating Outer Card */}
        <Box
          sx={{
            width: '100%',
            maxWidth: '1020px',
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            borderRadius: { xs: '20px', md: '26px' },
            bgcolor: '#0B141C',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 35px 80px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.04)',
            p: { xs: 2, md: '18px' },
            gap: { xs: 3, md: 4 },
            alignItems: 'stretch',
          }}
        >
          {/* Left Inner Frame: Realistic Drone Photo Showcase Card */}
          <Box
            component="aside"
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: '20px',
              minHeight: '560px',
              p: 3.5,
              position: 'relative',
              overflow: 'hidden',
              backgroundImage:
                "linear-gradient(180deg, rgba(8, 20, 29, 0.55) 0%, rgba(8, 20, 29, 0.15) 45%, rgba(8, 20, 29, 0.88) 100%), url('/images/auth/real-drone-building.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Top Bar: Brand Logo & Back to Website Pill */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 2,
              }}
            >
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

              <Link
                component={RouterLink}
                to={backTo}
                underline="none"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  bgcolor: 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '9999px',
                  px: 1.75,
                  py: 0.6,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.24)',
                    color: '#FFFFFF',
                  },
                }}
              >
                {backLabel} &rarr;
              </Link>
            </Box>

            {/* Bottom Section: Hero Tagline & 3 Pagination Dashes */}
            <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', pb: 1 }}>
              <Typography
                component="h2"
                sx={{
                  fontSize: '26px',
                  fontWeight: 600,
                  lineHeight: 1.35,
                  letterSpacing: '-0.025em',
                  color: '#FFFFFF',
                  mb: 2.5,
                  textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                }}
              >
                {heroTagline.line1}
                <br />
                {heroTagline.line2}
              </Typography>

              {/* Slider Pagination Dashes (matching reference: inactive, inactive, active) */}
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 20,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />
                <Box
                  sx={{
                    width: 20,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />
                <Box
                  sx={{
                    width: 32,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.6)',
                  }}
                />
              </Stack>
            </Box>
          </Box>

          {/* Right Form Pane */}
          <Box
            sx={{
              minWidth: 0,
              p: { xs: 1, sm: 2.5, md: '16px 20px 16px 8px' },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Header: Title and Welcoming Subtitle Link */}
            <Box sx={{ mb: 2.5 }}>
              {eyebrow && (
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#63BAC0',
                    mb: 0.5,
                  }}
                >
                  {eyebrow}
                </Typography>
              )}
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: '28px', sm: '34px' },
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  mb: 0.75,
                }}
              >
                {title}
              </Typography>

              {subtitleText && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#8A9FA8',
                    lineHeight: 1.5,
                  }}
                >
                  {subtitleText}{' '}
                  {subtitleLinkText && subtitleLinkTo && (
                    <Link
                      component={RouterLink}
                      to={subtitleLinkTo}
                      underline="hover"
                      sx={{
                        color: '#63BAC0',
                        fontWeight: 600,
                        transition: 'color 0.2s ease',
                        '&:hover': { color: '#88D6DC' },
                      }}
                    >
                      {subtitleLinkText}
                    </Link>
                  )}
                </Typography>
              )}

              {description && !subtitleText && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#8A9FA8',
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </Typography>
              )}
            </Box>

            {/* Form Fields */}
            <Box sx={{ mb: 1 }}>{children}</Box>

            {/* Social / SSO Divider & Buttons */}
            {showSocial && (
              <Box sx={{ mt: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    my: 1.75,
                  }}
                >
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255, 255, 255, 0.08)' }} />
                  <Typography sx={{ fontSize: '12px', color: '#6A7D8C' }}>
                    {socialPrompt}
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255, 255, 255, 0.08)' }} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    sx={{
                      height: 44,
                      borderRadius: '8px',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      bgcolor: '#14202B',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.22)',
                        bgcolor: '#192837',
                      },
                    }}
                  >
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AppleIcon />}
                    sx={{
                      height: 44,
                      borderRadius: '8px',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      bgcolor: '#14202B',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.22)',
                        bgcolor: '#192837',
                      },
                    }}
                  >
                    Apple
                  </Button>
                </Box>
              </Box>
            )}

            {/* Custom footer if passed */}
            {footer && (
              <Box sx={{ pt: 2, textAlign: 'center' }}>
                {footer}
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
