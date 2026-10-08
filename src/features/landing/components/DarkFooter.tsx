import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { StatusChip } from './StatusChip';

export function DarkFooter() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#000000',
        color: '#FFFFFF',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        py: { xs: 6, md: 8 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 4,
            pb: 6,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Brand */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                component="img"
                src="/images/landing/logo.png"
                alt="SmartDroneInspection Logo"
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '2px',
                  border: '1px solid rgba(82, 168, 255, 0.35)',
                  bgcolor: '#000000',
                  objectFit: 'contain',
                }}
              />
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontWeight: 500,
                  fontSize: '18px',
                  color: '#FFFFFF',
                }}
              >
                SmartDroneInspection
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '12px',
                color: '#999999',
                mt: 1,
              }}
            >
              Infrastructure Inspection & Defect Lifecycle Platform
            </Typography>
          </Box>

          {/* Links */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 4 }}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Link
              href="#event-stream"
              underline="none"
              sx={{ fontSize: '14px', color: '#999999', '&:hover': { color: '#FFFFFF' } }}
            >
              Mission Stream
            </Link>
            <Link
              href="#bento-matrix"
              underline="none"
              sx={{ fontSize: '14px', color: '#999999', '&:hover': { color: '#FFFFFF' } }}
            >
              Inspection Matrix
            </Link>
            <Link
              href="#metrics"
              underline="none"
              sx={{ fontSize: '14px', color: '#999999', '&:hover': { color: '#FFFFFF' } }}
            >
              Metrics
            </Link>
            <Link
              href="#security"
              underline="none"
              sx={{ fontSize: '14px', color: '#999999', '&:hover': { color: '#FFFFFF' } }}
            >
              Role Console
            </Link>
            <Link
              href="/login"
              underline="none"
              sx={{ fontSize: '14px', color: '#52a8ff', '&:hover': { color: '#FFFFFF' } }}
            >
              Access Portal ↗
            </Link>
          </Stack>

          {/* Status Indicator Pill */}
          <StatusChip status="pass" label="ALL PIPELINES OPERATIONAL" />
        </Box>

        {/* Bottom row */}
        <Box
          sx={{
            pt: 4,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '12px',
              color: '#666666',
            }}
          >
            © 2026 SmartDroneInspection. All rights reserved. Cryptographic evidence verification engine.
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '11px',
              color: '#555555',
            }}
          >
            EVIDENCE INTEGRITY: SHA-256 // CLOUD: ORACLE-ARM64
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
