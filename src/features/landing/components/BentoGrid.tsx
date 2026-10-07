import { Box, Container, Stack, Typography } from '@mui/material';
import { StatusChip } from './StatusChip';

export function BentoGrid() {
  return (
    <Box
      id="bento-matrix"
      component="section"
      sx={{
        bgcolor: '#000000',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
            INTELLIGENCE & VERIFICATION MATRIX
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
            Bento Feature Grid
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Continuous structural screening, cluster anomaly analytics, and an append-only cryptographic audit trail.
          </Typography>
        </Box>

        {/* 3-Column Bento Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {/* Card 1: Regression / Defect Screening */}
          <Box
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.145)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#999999',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                MODULE 01
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Defect Regression Matrix
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 3 }}>
                Automated detection screening comparing current flight imagery to historical asset baseline.
              </Typography>

              {/* Vertical list of status rows with PASS/FAIL chips and percentage changes */}
              <Stack spacing={1.5}>
                {[
                  { name: 'Surface Micro-Crack', delta: '+12.4%', status: 'fail' as const, chip: 'ACTION' },
                  { name: 'Rebar Rust Pitting', delta: '-4.1%', status: 'pass' as const, chip: 'PASS' },
                  { name: 'High-Bolt Torque Lock', delta: '0.0%', status: 'pass' as const, chip: 'PASS' },
                  { name: 'Spalling Delamination', delta: '+8.9%', status: 'warn' as const, chip: 'WARN' },
                  { name: 'Thermal Insulation Loss', delta: '-1.2%', status: 'pass' as const, chip: 'PASS' },
                ].map((row) => (
                  <Box
                    key={row.name}
                    sx={{
                      p: 1.5,
                      bgcolor: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 500 }}>
                        {row.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: '11px',
                          color: row.delta.startsWith('+') ? '#ededed' : '#62c073',
                        }}
                      >
                        DELTA: {row.delta}
                      </Typography>
                    </Box>
                    <StatusChip status={row.status} label={row.chip} />
                  </Box>
                ))}
              </Stack>
            </Box>

            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '11px',
                color: '#999999',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              YOLOv11 & SAM-2 SCREENING ENSEMBLE
            </Typography>
          </Box>

          {/* Card 2: Failure Clustering & Heatmap */}
          <Box
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.145)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#999999',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                MODULE 02
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Failure Clustering
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 2 }}>
                Spatial density and failure clustering mapped to realworld LiDAR and radiometric coordinates.
              </Typography>

              {/* Generated Ortho Heatmap Preview */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '140px',
                  overflow: 'hidden',
                  mb: 2.5,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Box
                  component="img"
                  src="/images/landing/inspection-scan-ortho.jpg"
                  alt="LiDAR orthophoto telemetry scan"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.15) brightness(0.9)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                  }}
                >
                  <StatusChip status="active" label="LIDAR OVERLAY" />
                </Box>
              </Box>

              {/* Stacked Horizontal Bar Charts for error metrics */}
              <Stack spacing={1.75}>
                {[
                  { label: 'Surface Fatigue Zone A', value: 78, bar1: 52, bar2: 26, color: '#52a8ff' },
                  { label: 'Rebar Corrosion Cluster', value: 64, bar1: 40, bar2: 24, color: '#62c073' },
                  { label: 'Structural Tilt / Vibration', value: 38, bar1: 20, bar2: 18, color: '#ededed' },
                  { label: 'Thermal Loss Anomalies', value: 85, bar1: 60, bar2: 25, color: '#52a8ff' },
                ].map((item) => (
                  <Box key={item.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '11px', color: '#999999' }}>
                        {item.value}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: '6px',
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                    >
                      <Box sx={{ width: `${item.bar1}%`, bgcolor: item.color, height: '100%' }} />
                      <Box sx={{ width: `${item.bar2}%`, bgcolor: 'rgba(255, 255, 255, 0.25)', height: '100%' }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '11px',
                color: '#999999',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              SPATIAL POINT DENSITY: 12,400 PTS/M2
            </Typography>
          </Box>

          {/* Card 3: Version Replay & Code Diff */}
          <Box
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.145)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#999999',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                MODULE 03
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Version Replay & Checksum Diff
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 3 }}>
                Cryptographic audit trail with green and blue side-borders for added and verified lines.
              </Typography>

              {/* Code-diff View per spec */}
              <Box
                sx={{
                  bgcolor: '#060606',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  p: 2,
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11.5px',
                  lineHeight: 1.6,
                }}
              >
                <Stack spacing={1}>
                  <Box
                    sx={{
                      p: '4px 8px',
                      bgcolor: 'rgba(98, 192, 115, 0.08)',
                      borderLeft: '3px solid #62c073',
                      color: '#62c073',
                    }}
                  >
                    + sha256: d8a902...b41c0 (raw evidence verified)
                  </Box>

                  <Box
                    sx={{
                      p: '4px 8px',
                      bgcolor: 'rgba(82, 168, 255, 0.08)',
                      borderLeft: '3px solid #52a8ff',
                      color: '#52a8ff',
                    }}
                  >
                    ~ signer: "ServiceManager" signed release v2.1
                  </Box>

                  <Box
                    sx={{
                      p: '4px 8px',
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      borderLeft: '3px solid rgba(255, 255, 255, 0.2)',
                      color: '#999999',
                    }}
                  >
                    &nbsp;&nbsp;asset_id: "TOWER-N204-SECTOR-A"
                  </Box>

                  <Box
                    sx={{
                      p: '4px 8px',
                      bgcolor: 'rgba(98, 192, 115, 0.08)',
                      borderLeft: '3px solid #62c073',
                      color: '#62c073',
                    }}
                  >
                    + maintenance_ticket: "TK-402 routed to engineer"
                  </Box>

                  <Box
                    sx={{
                      p: '4px 8px',
                      bgcolor: 'rgba(82, 168, 255, 0.08)',
                      borderLeft: '3px solid #52a8ff',
                      color: '#52a8ff',
                    }}
                  >
                    ~ client_access: ORG_SCOPE_VERIFIED (read-only)
                  </Box>

                  <Box
                    sx={{
                      p: '4px 8px',
                      color: '#666666',
                    }}
                  >
                    &nbsp;&nbsp;immutable_lock: [0x41f8...99e] CLOSED
                  </Box>
                </Stack>
              </Box>
            </Box>

            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '11px',
                color: '#999999',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              WORM STORAGE // APPEND-ONLY LEDGER
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
