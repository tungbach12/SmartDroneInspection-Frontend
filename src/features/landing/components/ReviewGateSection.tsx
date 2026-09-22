import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLandingColors } from '../landingTheme';

export function ReviewGateSection() {
  const colors = useLandingColors();

  return (
    <Box component="section" sx={{ bgcolor: colors.ink, color: colors.inverse, py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }, gap: { xs: 5, md: 9 }, alignItems: 'center' }}>
          <Box>
            <Chip label="Review gate" sx={{ bgcolor: `${colors.teal}18`, color: colors.teal, border: `1px solid ${colors.teal}44`, fontWeight: 700 }} />
            <Typography component="h2" variant="h2" sx={{ mt: 2, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.055em' }}>
              Findings are reviewed before release.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: 'rgba(246, 251, 247, 0.68)', lineHeight: 1.75 }}>
              Candidate findings stay separate from the official report until an assigned Inspector checks the evidence and confirms or updates the record.
            </Typography>
          </Box>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, bgcolor: colors.panel, color: colors.inverse, border: `1px solid ${colors.lightLine}`, borderRadius: '24px 24px 6px 24px' }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} sx={{ p: 1.75, bgcolor: `${colors.amber}12`, border: `1px solid ${colors.amber}38`, borderRadius: 2, alignItems: 'center' }}>
                <WarningAmberIcon sx={{ color: colors.amber }} />
                <Box sx={{ flex: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Candidate finding</Typography><Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.56)' }}>Surface crack · requires review</Typography></Box>
                <Chip size="small" label="Review" sx={{ bgcolor: `${colors.amber}22`, color: colors.amber, fontWeight: 800 }} />
              </Stack>
              <Stack direction="row" sx={{ color: colors.teal, justifyContent: 'center' }}><ArrowForwardIcon sx={{ transform: 'rotate(90deg)' }} /></Stack>
              <Stack direction="row" spacing={1.5} sx={{ p: 1.75, bgcolor: `${colors.teal}12`, border: `1px solid ${colors.teal}40`, borderRadius: 2, alignItems: 'center' }}>
                <PersonIcon sx={{ color: colors.teal }} />
                <Box sx={{ flex: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Inspector review</Typography><Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.56)' }}>Evidence checked against the asset record</Typography></Box>
                <CheckCircleIcon sx={{ color: colors.teal }} />
              </Stack>
              <Typography variant="caption" sx={{ pt: 1, color: 'rgba(246, 251, 247, 0.5)' }}>Only Inspector-reviewed findings can move into an official report or maintenance task.</Typography>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
