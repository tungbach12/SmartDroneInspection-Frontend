import { useState } from 'react';
import { Box, Drawer, IconButton, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import NorthEastIcon from '@mui/icons-material/NorthEast';

const navLinks = [
  { label: 'Event Stream', href: '#event-stream' },
  { label: 'Bento Matrix', href: '#bento-matrix' },
  { label: 'Metrics Grid', href: '#metrics' },
  { label: 'Security & Audit', href: '#security' },
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
        {/* Left: Geometric SVG Logo + Brand */}
        <Link
          href="/"
          underline="none"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            color: '#FFFFFF',
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 28 28"
            sx={{ width: 26, height: 26, flexShrink: 0 }}
          >
            <polygon
              points="14,2 26,8 26,20 14,26 2,20 2,8"
              fill="none"
              stroke="#52a8ff"
              strokeWidth="2"
            />
            <circle cx="14" cy="14" r="4" fill="#FFFFFF" />
            <line x1="14" y1="2" x2="14" y2="10" stroke="#52a8ff" strokeWidth="1.5" />
            <line x1="14" y1="18" x2="14" y2="26" stroke="#52a8ff" strokeWidth="1.5" />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontWeight: 500,
              fontSize: '20px',
              letterSpacing: '-0.5px',
              color: '#FFFFFF',
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
                fontSize: '16px',
                fontWeight: 400,
                color: '#FFFFFF',
                opacity: 0.82,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
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
              bgcolor: '#FFFFFF',
              color: '#121212',
              px: '14px',
              py: '8px',
              borderRadius: '0px',
              textDecoration: 'none',
              fontFamily: '"Geist Sans", sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'background-color 0.2s ease, transform 0.15s ease',
              '&:hover': {
                bgcolor: '#ededed',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Launch Console
            <NorthEastIcon sx={{ fontSize: 13 }} />
          </Box>

          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#FFFFFF', p: 0.5 }}
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
              bgcolor: '#0a0a0a',
              borderLeft: '1px solid rgba(255, 255, 255, 0.145)',
              p: 4,
            },
          },
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ color: '#999999', fontFamily: '"Geist Mono", monospace', fontSize: '13px' }}>
              NAVIGATION
            </Typography>
            <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#FFFFFF' }}>
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
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: 500,
                  '&:hover': { color: '#52a8ff' },
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
              bgcolor: '#FFFFFF',
              color: '#121212',
              py: '12px',
              borderRadius: '0px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              mt: 3,
            }}
          >
            Launch Console
            <NorthEastIcon sx={{ fontSize: 14 }} />
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
}
