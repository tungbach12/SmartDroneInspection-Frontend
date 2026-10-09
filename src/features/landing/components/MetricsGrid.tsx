import { Box, Container, Typography } from '@mui/material';

const metrics = [
  {
    value: '85',
    unit: '%',
    label: 'Reduction in inspection costs compared to manual scaffolding and rope access',
  },
  {
    value: '10',
    unit: 'x',
    label: 'Faster turnaround from flight takeoff to certified repair workorders',
  },
  {
    value: '0',
    unit: 'RISK',
    label: 'Fatalities or field climbing incidents with 100% ground-operated drone flights',
  },
  {
    value: '100',
    unit: '%',
    label: 'Findings certified by licensed engineers before release to site owners',
  },
];

export function MetricsGrid() {
  return (
    <Box
      id="metrics"
      component="section"
      sx={{
        bgcolor: '#F7F9FA',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(23, 54, 74, 0.1)',
        borderBottom: '1px solid rgba(23, 54, 74, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Heading: Outcome & Value Focus */}
        <Box sx={{ mb: 6 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '12px',
              color: '#087E8B',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            PROVEN OPERATIONAL IMPACT
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 500,
              letterSpacing: '-1.5px',
              color: '#253746',
            }}
          >
            Measurable Value for Infrastructure Owners
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#5D707B',
              maxWidth: '680px',
            }}
          >
            Real outcomes delivered across energy grids, bridges, telecommunications, and industrial facilities.
          </Typography>
        </Box>

        {/* 4-Column Border-Connected Grid per spec */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            border: '1px solid rgba(23, 54, 74, 0.14)',
            bgcolor: '#FFFFFF',
          }}
        >
          {metrics.map((item, index) => (
            <Box
              key={item.label}
              sx={{
                p: { xs: 3, md: 4 },
                borderRight: {
                  xs: 'none',
                  sm: index % 2 === 0 ? '1px solid rgba(23, 54, 74, 0.14)' : 'none',
                  lg: index < 3 ? '1px solid rgba(23, 54, 74, 0.14)' : 'none',
                },
                borderBottom: {
                  xs: index < 3 ? '1px solid rgba(23, 54, 74, 0.14)' : 'none',
                  sm: index < 2 ? '1px solid rgba(23, 54, 74, 0.14)' : 'none',
                  lg: 'none',
                },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Geist Sans", sans-serif',
                      fontSize: '56px',
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: '-3.36px',
                      color: '#253746',
                    }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '20px',
                      fontWeight: 500,
                      color: '#087E8B',
                    }}
                  >
                    {item.unit}
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#5D707B',
                  mt: 3,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
