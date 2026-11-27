import { Box, Button, Link, Stack, Typography } from '@mui/material';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { NextAdminLogoMark } from '@/shared/ui/NextAdminIcons';
import { getDedicatedLandingAudience, LANDING_PATHS, type LandingAudience } from '../landingAudience';

const roleLinks = [
  { audience: 'customer', label: 'Customer' },
  { audience: 'inspector', label: 'Inspector' },
  { audience: 'staff', label: 'Manager / Admin' },
] as const;

const signUpLinks = {
  customer: { href: '/register', label: 'Sign up' },
  inspector: { href: '/inspector/register', label: 'Apply as Inspector' },
  staff: null,
};

export function LandingHeader({ audience, overlay = false }: { audience: LandingAudience; overlay?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const signUp = signUpLinks[audience];
  const showRoleNavigation = getDedicatedLandingAudience(window.location.hostname) === null;

  return (
    <Box
      component="header"
      sx={{
        position: overlay ? 'absolute' : 'relative',
        inset: overlay ? '0 0 auto' : undefined,
        zIndex: 2,
        px: { xs: 2, sm: 3, md: 6 },
        py: { xs: 1.5, md: 2 },
        borderBottom: '1px solid rgba(255,255,255,.15)',
      }}
    >
      <Box
        sx={{
          maxWidth: 1440,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) auto',
            md: showRoleNavigation ? 'minmax(0, 1fr) auto minmax(0, 1fr)' : '1fr auto',
          },
          alignItems: 'center',
          gap: { xs: '8px 12px', md: 2 },
        }}
      >
        <Link href="/" underline="none" aria-label={t('SDI home')} sx={{ justifySelf: 'start', color: '#fff' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <NextAdminLogoMark width={32} height={32} />
            <Typography component="span" sx={{ fontWeight: 700 }}>
              SDI
            </Typography>
          </Stack>
        </Link>

        {showRoleNavigation && (
          <Stack
            component="nav"
            aria-label={t('Landing pages by role')}
            direction="row"
            sx={{
              gridColumn: { xs: '1 / -1', md: '2' },
              gridRow: { xs: 2, md: 1 },
              justifyContent: { xs: 'space-between', sm: 'center' },
              gap: { xs: 1.5, sm: 3, md: 2.5 },
            }}
          >
            {roleLinks.map(({ audience: role, label }) => (
              <Link
                key={role}
                href={LANDING_PATHS[role]}
                aria-current={role === audience ? 'page' : undefined}
                underline="none"
                sx={{
                  color: 'rgba(255,255,255,.78)',
                  borderBottom: '2px solid transparent',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  py: 1,
                  '&:hover': { color: '#fff' },
                  '&[aria-current]': { borderColor: '#71b8ff', color: '#fff' },
                }}
              >
                {t(label)}
              </Link>
            ))}
          </Stack>
        )}

        <Stack direction="row" sx={{ gridRow: 1, alignItems: 'center', justifySelf: 'end', gap: 0.75 }}>
          <Button
            size="small"
            aria-label={t('Language')}
            title={locale === 'en' ? 'Tiếng Việt' : 'English'}
            onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
            sx={{ minWidth: 0, px: 0.75, color: '#fff' }}
          >
            <LanguageRounded sx={{ fontSize: 16, mr: 0.5, display: { xs: 'none', sm: 'block' } }} />
            {locale === 'en' ? 'VI' : 'EN'}
          </Button>
          <Link href={audience === 'inspector' ? '/inspector/login' : '/login'} underline="hover"
            sx={{ color: '#fff', px: 0.75, fontSize: '0.875rem', fontWeight: 600 }}
          >
            {t('Sign in')}
          </Link>
          {signUp && (
            <Button
              component="a"
              href={signUp.href}
              size="small"
              sx={{
                bgcolor: '#fff',
                color: '#111310',
                px: 1.25,
                minHeight: 36,
                textTransform: 'none',
                fontWeight: 650,
                borderRadius: '8px',
                '&:hover': { bgcolor: '#e8eaed' },
              }}
            >
              {t(signUp.label)}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
