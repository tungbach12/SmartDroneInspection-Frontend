import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';

export function LandingFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>SmartDroneInspection</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Inspection management for infrastructure teams.</Typography>
          </Box>
          <Stack direction="row" spacing={2.5}>
            <Link href="#features" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Features</Link>
            <Link href="/login" underline="hover" color="inherit" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Log in</Link>
          </Stack>
        </Stack>
        <Divider sx={{ my: 3, borderColor: 'divider' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>The platform manages inspection evidence and service workflows. Drone flight control remains outside SmartDroneInspection.</Typography>
      </Container>
    </Box>
  );
}
