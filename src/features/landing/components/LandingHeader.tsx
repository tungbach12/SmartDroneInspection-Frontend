import { useState } from 'react';
import { Box, Button, Container, Drawer, IconButton, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { ColorModeToggle } from '@/shared/ui/ColorModeToggle';

const navigationItems = [
  { label: 'Features', href: '#features' },
  { label: 'For teams', href: '#roles' },
  { label: 'Security', href: '#security' },
] as const;

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'rgba(244, 248, 250, 0.86)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #dde8ee',
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', position: 'relative' }}>
          <Link href="/" underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mr: 'auto', color: '#12222b' }}>
            <Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', color: '#3aa5bd' }}>
              <TrackChangesIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              SmartDroneInspection
            </Typography>
          </Link>

          <Stack component="nav" direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href} underline="none" sx={{ fontSize: '0.875rem', color: '#4d6673', '&:hover': { color: '#12222b' } }}>
                {item.label}
              </Link>
            ))}
          </Stack>

          <Button href="/login" variant="outlined" sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderColor: '#c4d4dd', color: '#12222b', textTransform: 'none', fontWeight: 600, borderRadius: 999 }}>
            Log in
          </Button>
          <Box sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            <ColorModeToggle />
          </Box>
          <IconButton aria-label="Open navigation menu" onClick={() => setMobileOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#12222b' }}>
            <MenuIcon />
          </IconButton>
        </Stack>
      </Container>

      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Stack spacing={2} sx={{ width: 'min(82vw, 320px)', p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <IconButton aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} underline="none" sx={{ p: 1, fontSize: '1.125rem', color: '#12222b' }}>
              {item.label}
            </Link>
          ))}
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
            <Typography variant="body2" sx={{ color: '#5a7280' }}>
              Appearance
            </Typography>
            <ColorModeToggle />
          </Stack>
          <Button href="/login" variant="contained" onClick={() => setMobileOpen(false)} sx={{ bgcolor: '#12222b' }}>
            Log in
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
