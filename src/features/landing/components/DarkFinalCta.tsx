import { Box, Container, Stack, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { StatusChip } from './StatusChip';

export function DarkFinalCta() {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: '#F7F9FA',
        py: { xs: 8, md: 16 },
        borderTop: '1px solid rgba(23, 54, 74, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle blue accent glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: '30%',
          right: '15%',
          width: '420px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8, 126, 139, 0.08) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10 }}>
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(23, 54, 74, 0.14)',
            p: { xs: 3, sm: 4, md: 7 },
            boxShadow: '0 18px 52px rgba(23, 54, 74, 0.1)',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
            <StatusChip status="pass" label="START TODAY" />
            <StatusChip status="active" label="ZERO COMMITMENT" />
          </Stack>

          <Typography
            component="h2"
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontSize: 'clamp(30px, 4.5vw, 52px)',
              fontWeight: 500,
              letterSpacing: '-2px',
              color: '#253746',
              maxWidth: '740px',
              lineHeight: 1.08,
            }}
          >
            Ready to Protect Your Infrastructure with Drone AI?
          </Typography>

          <Typography
            sx={{
              mt: 2,
              fontSize: '16px',
              color: '#5D707B',
              maxWidth: '640px',
              lineHeight: 1.65,
            }}
          >
            Start with a single bridge, solar farm, or industrial facility. Experience 10x faster defect detection, zero climbing hazard, and instant repair dispatch.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mt: 5 }}
          >
            <Box
              component="a"
              href="/register"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                bgcolor: '#087E8B',
                color: '#FFFFFF',
                px: '26px',
                py: '14px',
                borderRadius: '0px',
                textDecoration: 'none',
                fontFamily: '"Geist Sans", sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#075B67',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Start Free Inspection
              <NorthEastIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box
              component="a"
              href="/login"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                bgcolor: 'transparent',
                border: '1px solid rgba(23, 54, 74, 0.22)',
                color: '#253746',
                px: '24px',
                py: '14px',
                borderRadius: '0px',
                textDecoration: 'none',
                fontFamily: '"Geist Sans", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#087E8B',
                  color: '#087E8B',
                },
              }}
            >
              Sign In for Field Operations
              <NorthEastIcon sx={{ fontSize: 14 }} />
            </Box>
          </Stack>

          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '12px',
              color: '#5D707B',
              mt: 2.5,
            }}
          >
            No credit card required · Free onboarding support · Setup in minutes
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
