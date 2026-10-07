import { Box, Container, Typography } from '@mui/material';

const metrics = [
  {
    value: '99.98',
    unit: '%',
    label: 'Telemetry and evidence checksum integrity across all flights',
  },
  {
    value: '42',
    unit: 'ms',
    label: 'Raw sensor ingestion and cryptographic hashing pipeline latency',
  },
  {
    value: '1.8',
    unit: 'M',
    label: 'Dense orthophoto pointcloud coordinates indexed per infrastructure scan',
  },
  {
    value: '0',
    unit: 'FAIL',
    label: 'Unverified defect escapes across production releases',
  },
];

export function MetricsGrid() {
  return (
    <Box
      id="metrics"
      component="section"
      sx={{
        bgcolor: '#000000',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Heading */}
        <Box sx={{ mb: 6 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '12px',
              color: '#52a8ff',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            SYSTEM BENCHMARKS & RELIABILITY
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 500,
              letterSpacing: '-1.5px',
              color: '#FFFFFF',
            }}
          >
            Precision Performance Metrics
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Hard numbers measured across autonomous flights, raw sensor ingestion, and human-verified releases.
          </Typography>
        </Box>

        {/* 4-Column Border-Connected Grid per spec */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            border: '1px solid rgba(255, 255, 255, 0.145)',
            bgcolor: '#0a0a0a',
          }}
        >
          {metrics.map((item, index) => (
            <Box
              key={item.label}
              sx={{
                p: { xs: 3, md: 4 },
                borderRight: {
                  xs: 'none',
                  sm: index % 2 === 0 ? '1px solid rgba(255, 255, 255, 0.145)' : 'none',
                  lg: index < 3 ? '1px solid rgba(255, 255, 255, 0.145)' : 'none',
                },
                borderBottom: {
                  xs: index < 3 ? '1px solid rgba(255, 255, 255, 0.145)' : 'none',
                  sm: index < 2 ? '1px solid rgba(255, 255, 255, 0.145)' : 'none',
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
                      color: '#FFFFFF',
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
                      color: '#52a8ff',
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
                  color: '#999999',
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
