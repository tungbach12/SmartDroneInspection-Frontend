﻿import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { workflowSteps } from '../content';
import { useLandingColors } from '../landingTheme';

export function WorkflowTimeline() {
  const colors = useLandingColors();

  return (
    <Box id="workflow" component="section" sx={{ bgcolor: colors.paper, py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.72fr) minmax(0, 1.28fr)' }, gap: { xs: 4, md: 8 }, alignItems: 'end' }}>
          <Box>
            <Typography variant="overline" sx={{ color: colors.tealDark, letterSpacing: '0.16em', fontWeight: 800 }}>
              How the service works
            </Typography>
            <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.05em', color: colors.text }}>
              From request to follow-up.
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ maxWidth: 620, color: colors.muted, lineHeight: 1.75 }}>
            The platform records the main steps from a customer request through service delivery, report review, and maintenance follow-up.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mt: 6 }}>
          {workflowSteps.map((step, index) => (
            <Paper key={step.number} elevation={0} sx={{ position: 'relative', p: 2.5, minHeight: 250, bgcolor: colors.surface, border: `1px solid ${colors.line}`, borderRadius: index % 2 === 0 ? '18px 18px 6px 18px' : '18px 18px 18px 6px' }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="overline" sx={{ color: colors.tealDark, fontWeight: 800, letterSpacing: '0.16em' }}>
                  {step.number}
                </Typography>
                {index < workflowSteps.length - 1 && <ArrowForwardIcon sx={{ display: { xs: 'none', lg: 'block' }, color: colors.line }} />}
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 4, color: colors.muted, fontWeight: 700 }}>
                {step.label}
              </Typography>
              <Typography variant="h6" sx={{ mt: 1, color: colors.text, fontWeight: 800, letterSpacing: '-0.025em' }}>
                {step.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.5, color: colors.muted, lineHeight: 1.6 }}>
                {step.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
