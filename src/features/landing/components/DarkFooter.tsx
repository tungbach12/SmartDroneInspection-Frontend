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
                component="svg"
                viewBox="0 0 28 28"
                sx={{ width: 22, height: 22, flexShrink: 0 }}
              >
                <polygon
                  points="14,2 26,8 26,20 14,26 2,20 2,8"
                  fill="none"
                  stroke="#52a8ff"
                  strokeWidth="2"
                />
                <circle cx="14" cy="14" r="4" fill="#FFFFFF" />
              </Box>
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
              High-Integrity Telemetry & Evidence Verification Engine
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
              Event Stream
            </Link>
            <Link
              href="#bento-matrix"
              underline="none"
              sx={{ fontSize: '14px', color: '#999999', '&:hover': { color: '#FFFFFF' } }}
            >
              Bento Matrix
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
              Security
            </Link>
            <Link
              href="/login"
              underline="none"
              sx={{ fontSize: '14px', color: '#52a8ff', '&:hover': { color: '#FFFFFF' } }}
            >
              Sign In ↗
            </Link>
          </Stack>

          {/* Status Indicator Pill */}
          <StatusChip status="pass" label="ALL SYSTEMS OPERATIONAL" />
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
            © 2026 SmartDroneInspection. All rights reserved. Cryptographic telemetry verification platform.
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '11px',
              color: '#555555',
            }}
          >
            LATENCY: 42MS // REGION: VN-ORACLE-ARM64
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
