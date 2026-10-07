import { Box, Container, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const securityItems = [
  {
    title: 'Organization scoped',
    description: 'Clients see only their own requests, reports, and tickets.',
  },
  {
    title: 'Assignment scoped',
    description: 'Inspectors and engineers see the work assigned to them.',
  },
  {
    title: 'Decision history',
    description: 'Statuses and accepted report versions stay queryable.',
  },
];

export function SecuritySection() {
  return (
    <Box id="security" component="section" sx={{ bgcolor: '#ffffff', py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.045em', color: '#12222b', fontWeight: 700 }}>
          Access follows the work.
        </Typography>
        <Stack spacing={2} sx={{ mt: 4 }}>
          {securityItems.map((item) => (
            <Stack key={item.title} direction="row" spacing={2} sx={{ alignItems: 'flex-start', py: 1 }}>
              <Box sx={{ mt: 0.5, color: '#3aa5bd' }}>
                <VerifiedUserIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#12222b', fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: '#5a7280' }}>
                  {item.description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
