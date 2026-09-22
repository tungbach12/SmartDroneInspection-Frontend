﻿import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { ColorModeToggle } from '@/shared/ui/ColorModeToggle';
import { useLandingColors } from '../landingTheme';

const navigationItems = [
  { label: 'How it works', href: '#workflow' },
  { label: 'For teams', href: '#roles' },
  { label: 'Security', href: '#security' },
] as const;

export function LandingHeader() {
  const colors = useLandingColors();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <Box
      component="header"
      sx={{
        position: 'absolute',
        inset: '0 0 auto',
        zIndex: 10,
        color: colors.heroText,
      }}
    >
      <Container maxWidth="lg" sx={{ width: '100%', maxWidth: 1240, boxSizing: 'border-box', mx: 'auto', px: { xs: 2, sm: 3 }, py: 2.25 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Link
            href="/"
            underline="none"
            color="inherit"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, mr: 'auto' }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                border: `1px solid ${colors.heroLine}`,
                borderRadius: '12px 12px 4px 12px',
                color: colors.teal,
              }}
            >
              <TrackChangesIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                SmartDroneInspection
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: 'block', color: colors.heroMuted, letterSpacing: '0.08em' }}
              >
                INSPECTION MANAGEMENT
              </Typography>
            </Box>
          </Link>

          <Stack
            component="nav"
            aria-label="Primary navigation"
            direction="row"
            spacing={3}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                underline="none"
                color="inherit"
                sx={{
                  fontSize: '0.875rem',
                  color: colors.heroMuted,
                  '&:hover': { color: colors.heroText },
                }}
              >
                {item.label}
              </Link>
            ))}
          </Stack>

          <Button
            href="/login"
            variant="outlined"
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              color: colors.heroText,
              borderColor: colors.heroLine,
              '&:hover': { borderColor: colors.teal, color: colors.teal },
            }}
          >
            Log in
          </Button>
          <Box sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            <ColorModeToggle />
          </Box>
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: colors.heroText }}
          >
            <MenuIcon />
          </IconButton>
        </Stack>
      </Container>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={closeMobileMenu}
        slotProps={{
          paper: {
            sx: {
              width: 'min(82vw, 320px)',
              bgcolor: colors.ink,
              color: colors.inverse,
              p: 2,
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <IconButton aria-label="Close navigation menu" onClick={closeMobileMenu} sx={{ color: 'inherit' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              underline="none"
              color="inherit"
              sx={{ p: 1, fontSize: '1.125rem' }}
            >
              {item.label}
            </Link>
          ))}
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
            <Typography variant="body2" sx={{ color: 'rgba(246, 251, 247, 0.72)' }}>Appearance</Typography>
            <ColorModeToggle />
          </Stack>
          <Button href="/login" variant="contained" onClick={closeMobileMenu} sx={{ bgcolor: colors.tealDark }}>
            Log in
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
