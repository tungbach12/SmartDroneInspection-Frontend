import { useEffect } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LandingHeader } from '../components/LandingHeader';

const pages = {
  inspector: {
    pageTitle: 'Partner Inspector',
    title: 'Take inspections from the field to the report.',
    description: 'Join as a partner Inspector to manage assigned missions, record flight permits, and turn field evidence into findings and reports.',
    action: { href: '/inspector/register', label: 'Apply as Inspector' },
    image: '/images/landing/inspection-context.jpg',
    imageAlt: 'Drone inspecting the exterior of an industrial building',
    sectionTitle: 'Your field workflow',
    sections: [
      {
        title: 'Prepare for the mission',
        description: 'Review the assignment, confirm your availability, and upload the flight permit before starting the field session.',
      },
      {
        title: 'Capture evidence',
        description: 'Record the field session and upload photos and videos for review.',
      },
      {
        title: 'Confirm findings',
        description: 'Review AI suggestions, confirm defects, and submit the inspection report for Manager review.',
      },
    ],
  },
  staff: {
    pageTitle: 'Manager / Admin',
    title: 'Coordinate inspections. Manage the platform.',
    description: 'Sign in with your staff account to open the workspace assigned to you.',
    action: { href: '/login', label: 'Staff sign in' },
    image: '/images/landing/ai-defect-review.jpg',
    imageAlt: 'Illustrative AI-assisted inspection highlighting a possible concrete crack and surface corrosion',
    sectionTitle: 'Staff workspaces',
    sections: [
      {
        title: 'Manager',
        description: 'Review requests, issue quotations, assign Inspectors and drones, and review reports for publication.',
      },
      {
        title: 'Admin',
        description: 'Govern accounts and platform settings, manage asset categories, and oversee platform activity.',
      },
    ],
  },
} as const;

export default function RoleLandingPage({ audience }: { audience: keyof typeof pages }) {
  const { t } = useLocale();
  const page = pages[audience];
  const pageTitle = t(page.pageTitle);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageTitle} | SDI`;
    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#101411', color: '#f5f5f3', fontFamily: '"Geist Sans", sans-serif' }}>
      <LandingHeader audience={audience} />
      <Box component="main">
        <Box
          sx={{
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 2.5, sm: 4, lg: 6 },
            py: { xs: 4, md: 7, lg: 9 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' },
            gap: { xs: 4, lg: 8 },
            alignItems: 'center',
          }}
        >
          <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Typography
              component="h1"
              sx={{
                maxWidth: '14ch',
                fontSize: 'clamp(2.25rem, 5.4vw, 4.75rem)',
                fontWeight: 500,
                letterSpacing: '-0.04em',
                lineHeight: 1.04,
                textWrap: 'balance',
              }}
            >
              {t(page.title)}
            </Typography>
            <Typography sx={{ maxWidth: '48ch', color: '#d2d7d1', lineHeight: 1.65 }}>
              {t(page.description)}
            </Typography>
            <Button
              component="a"
              href={page.action.href}
              variant="contained"
              disableElevation
              endIcon={<NorthEastRounded fontSize="small" />}
              sx={{
                bgcolor: '#245bab',
                color: '#fff',
                minHeight: 46,
                px: 2.5,
                textTransform: 'none',
                fontWeight: 650,
                borderRadius: '8px',
                '&:hover': { bgcolor: '#1b498f' },
              }}
            >
              {t(page.action.label)}
            </Button>
          </Stack>

          <Box
            component="img"
            src={page.image}
            alt={t(page.imageAlt)}
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: { xs: '16 / 10', lg: '6 / 5' },
              objectFit: 'cover',
              objectPosition: 'center',
              borderRadius: '12px',
              bgcolor: '#252925',
            }}
          />
        </Box>

        <Box component="section" aria-labelledby="role-workflow" sx={{ bgcolor: '#f5f5f3', color: '#181b18' }}>
          <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2.5, sm: 4, lg: 6 }, py: { xs: 4, md: 6 } }}>
            <Typography
              component="h2"
              id="role-workflow"
              sx={{ fontSize: { xs: '1.625rem', md: '2rem' }, fontWeight: 600, mb: 2.5 }}
            >
              {t(page.sectionTitle)}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: `repeat(${page.sections.length}, minmax(0, 1fr))` },
                columnGap: { sm: 3, lg: 5 },
              }}
            >
              {page.sections.map((section) => (
                <Box key={section.title} sx={{ py: 2.25, borderTop: '1px solid #cdd2cd' }}>
                  <Typography component="h3" sx={{ fontSize: '1.125rem', fontWeight: 650 }}>
                    {t(section.title)}
                  </Typography>
                  <Typography sx={{ maxWidth: '42ch', mt: 0.75, color: '#444d46', lineHeight: 1.6 }}>
                    {t(section.description)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
