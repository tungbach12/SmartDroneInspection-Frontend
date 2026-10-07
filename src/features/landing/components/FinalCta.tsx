import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export function FinalCta() {
  return (
    <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ p: { xs: 3, md: 6 }, bgcolor: 'background.paper', color: 'text.primary', borderRadius: 4 }}>
          <Typography component="h2" sx={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.05, letterSpacing: '-0.04em', fontWeight: 700 }}>
            Start with one asset or site.
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary', maxWidth: 560 }}>
            Create a Client account or register your provider organization. The same chain carries asset, mission, evidence, report, and maintenance forward.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button
              href="/register"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: '#3aa5bd', color: 'text.primary', px: 3, py: 1.4, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
            >
              Create Client account
            </Button>
            <Button
              href="/login"
              variant="outlined"
              sx={{ color: 'text.primary', borderColor: 'divider', px: 3, py: 1.4, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
            >
              Open workspace
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
