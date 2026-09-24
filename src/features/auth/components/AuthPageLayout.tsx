import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { ArrowBackRounded, FlightTakeoffRounded, WavesRounded } from '@mui/icons-material';
import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useColorScheme } from '@mui/material/styles';

interface AuthPageLayoutProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  backLabel?: string;
  backTo?: string;
  footer?: ReactNode;
}

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  backLabel = 'Back to overview',
  backTo = '/',
  footer,
  children,
}: AuthPageLayoutProps) {
  const { mode, setMode } = useColorScheme();

  useEffect(() => {
    if (mode !== 'light') {
      setMode('light');
    }
  }, [mode, setMode]);

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: '#f3f8fb',
        color: '#153447',
        display: 'flex',
        alignItems: 'center',
        px: { xs: 2, sm: 3, lg: 4 },
        py: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1220,
          minHeight: { xs: 'auto', md: 700 },
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.92fr 1fr' },
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 5 },
          bgcolor: '#fff',
          boxShadow: '0 28px 80px rgba(18, 71, 96, 0.12)',
        }}
      >
        <Box
          component="aside"
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            p: { md: 5, lg: 6 },
            color: '#f3fbff',
            background:
              'radial-gradient(circle at 85% 18%, rgba(84, 218, 209, .3), transparent 27%), radial-gradient(circle at 10% 100%, rgba(44, 169, 197, .28), transparent 37%), linear-gradient(145deg, #0b496b 0%, #087c92 58%, #0b9c9d 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              width: 470,
              height: 470,
              right: -230,
              bottom: -250,
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '50%',
              boxShadow:
                '0 0 0 36px rgba(255,255,255,.035), 0 0 0 76px rgba(255,255,255,.03), 0 0 0 118px rgba(255,255,255,.025)',
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ zIndex: 1, alignItems: 'center' }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2.5,
                bgcolor: 'rgba(255,255,255,.16)',
                border: '1px solid rgba(255,255,255,.2)',
              }}
            >
              <FlightTakeoffRounded />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                SmartDroneInspection
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(243,251,255,.76)' }}>
                Infrastructure intelligence
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={3} sx={{ zIndex: 1, maxWidth: 450, my: 5 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                color: '#b7fff0',
                bgcolor: 'rgba(255,255,255,.12)',
              }}
            >
              <WavesRounded />
            </Box>
            <Typography
              variant="overline"
              sx={{ color: '#a9f1e6', fontWeight: 800, letterSpacing: '.16em' }}
            >
              A clearer view of every asset
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontSize: { md: 38, lg: 44 }, lineHeight: 1.12, fontWeight: 800 }}
            >
              Inspection work, connected from field to report.
            </Typography>
            <Typography sx={{ color: 'rgba(243,251,255,.8)', lineHeight: 1.8 }}>
              Bring teams, evidence and decisions together in one secure workspace
              built for infrastructure inspection.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {['Client workspace', 'Field operations', 'Admin'].map((label) => (
                <Box
                  key={label}
                  sx={{
                    px: 1.4,
                    py: 0.75,
                    borderRadius: 99,
                    fontSize: 12,
                    color: '#e9fffc',
                    border: '1px solid rgba(220,255,251,.24)',
                    bgcolor: 'rgba(255,255,255,.08)',
                  }}
                >
                  {label}
                </Box>
              ))}
            </Stack>
          </Stack>

          <Typography variant="caption" sx={{ zIndex: 1, color: 'rgba(243,251,255,.7)' }}>
            Secure access for every authorized role.
          </Typography>
        </Box>

        <Box
          component="section"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 0, sm: 2, md: 4, lg: 6 },
            py: { xs: 2, sm: 4, md: 6 },
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              display: { xs: 'flex', md: 'none' },
              mb: 3,
              px: 1,
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #0b5d7d, #10a7a0)',
              }}
            >
              <FlightTakeoffRounded fontSize="small" />
            </Box>
            <Typography sx={{ fontWeight: 800, color: '#153447' }}>
              SmartDroneInspection
            </Typography>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              maxWidth: 500,
              mx: 'auto',
              p: { xs: 2.5, sm: 4, md: 4.5 },
              borderRadius: 3.5,
              borderColor: '#e0eaf0',
              bgcolor: '#fff',
              boxShadow: { xs: '0 10px 34px rgba(18,71,96,.06)', md: 'none' },
            }}
          >
            <Stack spacing={3}>
              <Stack spacing={0.8}>
                <Typography
                  variant="overline"
                  sx={{ color: '#087c92', fontWeight: 800, letterSpacing: '.13em' }}
                >
                  {eyebrow}
                </Typography>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ color: '#12364a', fontSize: { xs: 28, sm: 32 }, fontWeight: 800 }}
                >
                  {title}
                </Typography>
                <Typography sx={{ color: '#617887', lineHeight: 1.65 }}>
                  {description}
                </Typography>
              </Stack>
              {children}
            </Stack>
          </Paper>

          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: '100%',
              maxWidth: 500,
              mx: 'auto',
              mt: 2.5,
              px: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {footer ?? (
              <Link
                component={RouterLink}
                to={backTo}
                underline="hover"
                sx={{ color: '#547080', display: 'inline-flex', alignItems: 'center', gap: 0.7 }}
              >
                <ArrowBackRounded sx={{ fontSize: 16 }} />
                {backLabel}
              </Link>
            )}
            <Typography variant="caption" sx={{ color: '#8295a0' }}>
              Protected workspace
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
