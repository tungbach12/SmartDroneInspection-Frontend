import { useState } from 'react';
import { Box, Drawer, IconButton, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import NorthEastIcon from '@mui/icons-material/NorthEast';

const navLinks = [
  { label: 'Mission Stream', href: '#event-stream' },
  { label: 'Inspection Matrix', href: '#bento-matrix' },
  { label: 'Operational Metrics', href: '#metrics' },
  { label: 'Role Console', href: '#security' },
];

export function DarkHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      component="header"
      sx={{
        position: 'absolute',
        top: { xs: '20px', md: '38px' },
        left: 0,
        right: 0,
        zIndex: 50,
        px: { xs: '24px', md: '56px' },
      }}
    >
      <Box
        sx={{
          maxWidth: '1440px',
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Generated AI Logo + Brand Name */}
        <Link
          href="/"
          underline="none"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            color: '#253746',
          }}
        >
          <Box
            component="img"
            src="/images/landing/logo.png"
            alt="SmartDroneInspection Logo"
            sx={{
              width: 32,
              height: 32,
              borderRadius: '2px',
              border: '1px solid rgba(8, 126, 139, 0.3)',
              boxShadow: '0 0 12px rgba(8, 126, 139, 0.14)',
              flexShrink: 0,
              objectFit: 'contain',
              bgcolor: '#FFFFFF',
            }}
          />
          <Typography
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontWeight: 500,
              fontSize: '20px',
              letterSpacing: '-0.5px',
              color: '#253746',
            }}
          >
            SmartDroneInspection
          </Typography>
        </Link>

        {/* Center: Desktop Nav */}
        <Stack
          component="nav"
          direction="row"
          spacing={4}
          sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              underline="none"
              sx={{
                fontSize: '15px',
                fontWeight: 400,
                color: '#253746',
                opacity: 0.82,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1, color: '#087E8B' },
              }}
            >
              {item.label}
            </Link>
          ))}
        </Stack>

        {/* Right: Brutalist 0px radius button */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            component="a"
            href="/login"
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              alignItems: 'center',
              gap: '6px',
              bgcolor: '#087E8B',
              color: '#FFFFFF',
              px: '16px',
              py: '8px',
              borderRadius: '0px',
              textDecoration: 'none',
              fontFamily: '"Geist Sans", sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'background-color 0.2s ease, transform 0.15s ease',
              '&:hover': {
                bgcolor: '#075B67',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Access Portal
            <NorthEastIcon sx={{ fontSize: 13 }} />
          </Box>

          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#253746', p: 0.5 }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: '100%',
              maxWidth: 360,
              bgcolor: '#FFFFFF',
              borderLeft: '1px solid rgba(23, 54, 74, 0.14)',
              p: 4,
            },
          },
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                component="img"
                src="/images/landing/logo.png"
                alt="SmartDroneInspection Logo"
                sx={{ width: 28, height: 28 }}
              />
              <Typography sx={{ color: '#253746', fontFamily: '"Geist Sans", sans-serif', fontWeight: 600, fontSize: '16px' }}>
                SmartDroneInspection
              </Typography>
            </Stack>
            <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#253746' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Stack spacing={2.5}>
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                underline="none"
                sx={{
                  color: '#253746',
                  fontSize: '18px',
                  fontWeight: 500,
                  '&:hover': { color: '#087E8B' },
                }}
              >
                {item.label}
              </Link>
            ))}
          </Stack>
          <Box
            component="a"
            href="/login"
            onClick={() => setMobileOpen(false)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              bgcolor: '#087E8B',
              color: '#FFFFFF',
              py: '12px',
              borderRadius: '0px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              mt: 3,
            }}
          >
            Access Portal
            <NorthEastIcon sx={{ fontSize: 14 }} />
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
}
