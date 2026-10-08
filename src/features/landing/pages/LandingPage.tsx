import { useEffect } from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

const services = [
  {
    number: '01',
    title: 'Drone-ready inspections',
    description:
      'Bring hard-to-reach places into view with imagery from your drone team or inspection partner.',
    Icon: FlightTakeoffIcon,
  },
  {
    number: '02',
    title: 'AI-assisted review',
    description:
      'Computer vision can highlight details like concrete cracks, sealant gaps and corrosion for a closer look.',
    Icon: AutoAwesomeIcon,
  },
  {
    number: '03',
    title: 'Connected asset records',
    description:
      'Keep photos, inspection notes and reports together with the building or structure they belong to.',
    Icon: AccountTreeIcon,
  },
  {
    number: '04',
    title: 'Clear follow-up',
    description:
      'Give your team an organized path from a reviewed finding to the next action.',
    Icon: TaskAltIcon,
  },
];

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'About us', href: '#about' },
  { label: 'How it works', href: '#how-it-works' },
];

const actionSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  minHeight: 46,
  px: 2.5,
  bgcolor: '#39F20A',
  color: '#071006',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background-color 160ms ease',
  '&:hover': { bgcolor: '#2bd500' },
  '&:focus-visible': { outline: '2px solid #39F20A', outlineOffset: 3 },
};

export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'SmartDroneInspection | A clearer view of every asset';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        overflowX: 'hidden',
        bgcolor: '#050605',
        color: '#f5f5f3',
        fontFamily: '"Geist Sans", sans-serif',
      }}
    >
      <Box
        component="header"
        sx={{
          position: 'absolute',
          zIndex: 2,
          inset: '0 0 auto',
          px: { xs: 2.5, md: 6 },
          py: { xs: 2, md: 2.5 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1440,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Link
            href="/"
            underline="none"
            sx={{ color: '#fff', fontSize: 15, fontWeight: 650, letterSpacing: '-0.04em' }}
          >
            SmartDroneInspection
          </Link>
          <Stack
            component="nav"
            direction="row"
            spacing={{ xs: 2, md: 4 }}
            aria-label="Main navigation"
            sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}
          >
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                underline="none"
                sx={{
                  color: 'rgba(255,255,255,.66)',
                  fontSize: 10,
                  fontWeight: 550,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  '&:hover': { color: '#fff' },
                }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              underline="none"
              sx={{
                color: 'rgba(255,255,255,.66)',
                fontSize: 10,
                fontWeight: 550,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                '&:hover': { color: '#fff' },
              }}
            >
              Sign in
            </Link>
          </Stack>
          <Box component="a" href="/register" sx={{ ...actionSx, minHeight: 38, px: 2, fontSize: 11 }}>
            Get a consultation
          </Box>
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          minHeight: '100vh',
          '@supports (height: 100svh)': { minHeight: '100svh' },
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          px: { xs: 3, md: 8 },
          pt: { xs: 15, md: 20 },
          pb: { xs: 9, md: 14 },
          isolation: 'isolate',
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(90deg, rgba(3,5,4,.78) 0%, rgba(3,5,4,.46) 43%, rgba(3,5,4,.12) 100%), linear-gradient(0deg, rgba(3,5,4,.32) 0%, rgba(3,5,4,.04) 55%), url(/images/landing/akor-drone-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 48%',
          backgroundRepeat: 'no-repeat',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            background: 'radial-gradient(ellipse at 72% 38%, rgba(46,51,48,.46), transparent 42%), linear-gradient(90deg, rgba(3,5,4,.18) 0%, rgba(3,5,4,.03) 65%, rgba(3,5,4,.28) 100%)',
          },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto', position: 'relative' }}>
          <Typography
            component="h1"
            sx={{
              maxWidth: 1050,
              fontSize: 'clamp(56px, 7.3vw, 100px)',
              fontWeight: 400,
              lineHeight: 0.98,
              letterSpacing: '-0.065em',
              textWrap: 'balance',
            }}
          >
            Clearer asset inspections
            <br />
            with drones and AI.
          </Typography>
          <Typography
            sx={{
              maxWidth: 530,
              mt: 3,
              color: 'rgba(255,255,255,.69)',
              fontSize: { xs: 14, md: 16 },
              lineHeight: 1.7,
            }}
          >
            Drone imagery and AI-assisted inspection help your team understand the places and structures you’re responsible for—and decide what to do next.
          </Typography>
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center', mt: 3.5, flexWrap: 'wrap', rowGap: 2 }}>
            <Box component="a" href="/register" sx={actionSx}>
              Get a consultation <NorthEastIcon sx={{ fontSize: 16 }} />
            </Box>
            <Link
              href="#how-it-works"
              underline="none"
              sx={{
                color: '#f5f5f3',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                borderBottom: '1px solid #39F20A',
                pb: 0.5,
              }}
            >
              How it works
            </Link>
          </Stack>
        </Box>
      </Box>

      <Box
        id="services"
        component="section"
        sx={{
          minHeight: '100vh',
          '@supports (height: 100svh)': { minHeight: '100svh' },
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#f5f5f3',
          color: '#111310',
          px: { xs: 3, md: 8 },
          py: { xs: 7, md: 8 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Typography
            sx={{
              color: '#868a83',
              fontSize: 10,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              pb: 2,
              borderBottom: '1px solid #d9dbd6',
            }}
          >
            What we do
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '0.86fr 1.5fr' },
              columnGap: { xs: 5, md: 10 },
              rowGap: 5,
              alignItems: 'center',
              pt: { xs: 5, md: 6 },
            }}
          >
            <Box>
              <Typography
                component="h2"
                sx={{
                  maxWidth: 440,
                  fontSize: 'clamp(34px, 4.4vw, 58px)',
                  fontWeight: 450,
                  lineHeight: 1.02,
                  letterSpacing: '-.06em',
                  textWrap: 'balance',
                }}
              >
                One platform for the assets you’re responsible for.
              </Typography>
              <Box component="a" href="/register" sx={{ ...actionSx, mt: 3.5 }}>
                Get a consultation <NorthEastIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                borderTop: { xs: '1px solid #d9dbd6', sm: 0 },
              }}
            >
              {services.map((item, index) => (
                <Box
                  key={item.number}
                  sx={{
                    minHeight: { xs: 0, sm: 260 },
                    py: { xs: 3, sm: 3 },
                    px: { xs: 0, sm: 4 },
                    borderTop: { xs: '0', sm: '1px solid #d9dbd6' },
                    borderLeft: { xs: 0, sm: index % 2 === 1 ? '1px solid #d9dbd6' : 0 },
                    borderBottom: { xs: '1px solid #d9dbd6', sm: index < 2 ? 0 : '1px solid #d9dbd6' },
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 54,
                      height: 54,
                      mb: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#e9ece7',
                      color: '#38bc1b',
                    }}
                  >
                    <item.Icon sx={{ fontSize: 29, strokeWidth: 1 }} />
                  </Box>
                  <Typography sx={{ color: '#a5a8a2', fontSize: 10, letterSpacing: '.1em' }}>
                    {item.number}
                  </Typography>
                  <Typography component="h3" sx={{ mt: 1.5, fontSize: 19, fontWeight: 550, lineHeight: 1.2, letterSpacing: '-.04em' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ mt: 1.25, maxWidth: 270, color: '#777b75', fontSize: 12, lineHeight: 1.65 }}>
                    {item.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        id="about"
        component="section"
        sx={{
          minHeight: '100vh',
          '@supports (height: 100svh)': { minHeight: '100svh' },
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#050605',
          color: '#f5f5f3',
          px: { xs: 3, md: 8 },
          py: { xs: 7, md: 8 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Typography sx={{ color: '#777b75', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', pb: 2, borderBottom: '1px solid #252724' }}>
            About us
          </Typography>
          <Box
            id="how-it-works"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 5, md: 8 },
              pt: { xs: 5, md: 8 },
              alignItems: 'stretch',
            }}
          >
            <Box
              sx={{
                minHeight: { xs: 320, md: 500 },
                position: 'relative',
                overflow: 'hidden',
                display: 'grid',
                alignItems: 'end',
                borderRight: { md: '1px solid #252724' },
                pr: { md: 8 },
                bgcolor: '#111411',
              }}
            >
              <Box
                component="img"
                src="/images/landing/ai-defect-review.jpg"
                alt="Illustrative AI-assisted inspection highlighting a possible concrete crack and surface corrosion"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'brightness(.94) saturate(.86)',
                }}
              />
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(0deg, rgba(3,5,4,.7) 0%, rgba(3,5,4,.08) 44%, transparent 76%)',
                }}
              />
              <Box sx={{ position: 'relative', left: { xs: 14, md: 30 }, bottom: { xs: 14, md: 30 }, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#39F20A', boxShadow: '0 0 10px #39F20A' }} />
                <Typography sx={{ color: 'rgba(255,255,255,.8)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                  Illustrative AI confidence — not a risk score
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: { md: 3 }, maxWidth: 570 }}>
              <Typography
                component="h2"
                sx={{ fontSize: 'clamp(34px, 4.3vw, 58px)', fontWeight: 430, lineHeight: 1.03, letterSpacing: '-.065em', textWrap: 'balance' }}
              >
                Technology brings it into view. People decide what it means.
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: 490, color: 'rgba(255,255,255,.62)', fontSize: 14, lineHeight: 1.8 }}>
                AI can help your team notice and organize details. Inspectors review the evidence, make the call and keep the next step connected to the asset.
              </Typography>
              <Box component="a" href="/register" sx={{ ...actionSx, mt: 3.5, alignSelf: 'flex-start' }}>
                See how the platform works <NorthEastIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component="footer"
        sx={{
          minHeight: { xs: 220, md: 260 },
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 5 },
          bgcolor: '#050605',
          borderTop: '1px solid #252724',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            <Typography sx={{ color: '#f5f5f3', fontSize: 18, fontWeight: 650, letterSpacing: '-.04em' }}>
              SmartDroneInspection
            </Typography>
            <Stack
              component="nav"
              aria-label="Footer navigation"
              direction="row"
              spacing={{ xs: 2, md: 3.5 }}
              sx={{ flexWrap: 'wrap', rowGap: 1.5 }}
            >
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} underline="none" sx={{ color: '#858982', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', '&:hover': { color: '#fff' } }}>
                  {item.label}
                </Link>
              ))}
              <Link href="/login" underline="none" sx={{ color: '#858982', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', '&:hover': { color: '#fff' } }}>
                Sign in
              </Link>
            </Stack>
          </Box>
          <Typography sx={{ color: '#686c66', fontSize: 12 }}>
            © 2026 SmartDroneInspection. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
