import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';

export function LandingFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: '#10222b', color: '#e6eef3' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>SmartDroneInspection</Typography>
            <Typography variant="caption" sx={{ color: '#7ba0b0' }}>Inspection management for infrastructure teams.</Typography>
          </Box>
          <Stack direction="row" spacing={2.5}>
            <Link href="#features" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: '#9fb9c7' }}>Features</Link>
            <Link href="/login" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: '#9fb9c7' }}>Log in</Link>
          </Stack>
        </Stack>
        <Divider sx={{ my: 3, borderColor: '#1e3a49' }} />
        <Typography variant="caption" sx={{ color: '#5e8294' }}>The platform manages inspection evidence and service workflows. Drone flight control remains outside SmartDroneInspection.</Typography>
      </Container>
    </Box>
  );
}
