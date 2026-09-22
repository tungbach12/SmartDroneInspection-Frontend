﻿import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
import { useLandingColors } from '../landingTheme';

export function LandingFooter() {
  const colors = useLandingColors();

  return (
    <Box component="footer" sx={{ bgcolor: colors.ink, color: colors.inverse }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>SmartDroneInspection</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.52)' }}>Inspection management for infrastructure teams.</Typography>
          </Box>
          <Stack direction="row" spacing={2.5}>
            <Link href="#workflow" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: 'rgba(246, 251, 247, 0.72)' }}>How it works</Link>
            <Link href="/login" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: 'rgba(246, 251, 247, 0.72)' }}>Log in</Link>
          </Stack>
        </Stack>
        <Divider sx={{ my: 3, borderColor: colors.lightLine }} />
        <Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.45)' }}>The platform manages inspection evidence and service workflows. Drone flight control remains outside SmartDroneInspection.</Typography>
      </Container>
    </Box>
  );
}
