import { ArrowBack, LockOutlined } from '@mui/icons-material';
import { Box, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import { ColorModeToggle } from '@/shared/ui/ColorModeToggle';

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 5, bgcolor: 'background.default', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ColorModeToggle />
      </Box>
      <Paper variant="outlined" sx={{ width: 'min(100%, 460px)', p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <LockOutlined />
            </Box>
            <IconButton component="a" href="/" aria-label="Back to home">
              <ArrowBack />
            </IconButton>
          </Stack>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Sign in</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Access your organization’s inspection workspace.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            Authentication screens are being connected to the backend contract. No account data is stored in this page.
          </Typography>
          <Link href="/" underline="hover" sx={{ alignSelf: 'flex-start' }}>Return to overview</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
