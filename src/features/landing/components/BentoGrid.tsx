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
            Inspection Intelligence Grid
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Visual defect AI candidate screening, radiometric thermal anomaly clustering, and cryptographic report sign-off.
          </Typography>
        </Box>

        {/* 3-Column Bento Grid with Generated Assets */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {/* Card 1: AI Defect Vision Screening */}
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
                AI Defect Detection
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 2.5 }}>
                Automated bounding box detection for concrete fractures, rust pitting, and structural spalling.
              </Typography>

              {/* Generated Image Asset: Camera POV with Bounding Boxes */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  mb: 2.5,
                }}
              >
                <Box
                  component="img"
                  src="/images/landing/defect-detection-preview.jpg"
                  alt="Drone camera defect bounding box detection"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.1) brightness(0.95)',
                  }}
                />
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusChip status="pass" label="YOLOv11: 96.4%" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="warn" label="HUMAN REVIEW REQUIRED" />
                </Box>
              </Box>

              {/* Key Defect Summary */}
              <Stack spacing={1}>
                {[
                  { name: 'Bridge Pier Crack #04', delta: '+12.4%', chip: 'ACTION', status: 'fail' as const },
                  { name: 'Rebar Rust Exposure', delta: '-2.1%', chip: 'MONITOR', status: 'warn' as const },
                  { name: 'High-Torque Bolt Gap', delta: '0.0%', chip: 'PASS', status: 'pass' as const },
                ].map((item) => (
                  <Box
                    key={item.name}
                    sx={{
                      p: 1.25,
                      bgcolor: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: '11px',
                          color: '#999999',
                        }}
                      >
                        GSD: 0.8mm // DELTA: {item.delta}
                      </Typography>
                    </Box>
                    <StatusChip status={item.status} label={item.chip} />
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
              ZERO DEFECT AUTO-RELEASES // HUMAN GATE MANDATORY
            </Typography>
          </Box>

          {/* Card 2: Thermal & Spatial Anomaly Clustering */}
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
                Thermal & Spatial Map
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 2.5 }}>
                LiDAR false-color point clouds and radiometric orthomosaics for solar, turbine, and roof surveys.
              </Typography>

              {/* Generated Image Asset: LiDAR False Color Heatmap */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  mb: 2.5,
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
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusChip status="active" label="RADIOMETRIC HUD" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="pass" label="RTK GPS SUB-CM" />
                </Box>
              </Box>

              {/* Severity breakdown */}
              <Stack spacing={1.5}>
                {[
                  { label: 'Surface Thermal Delta (Solar/Roof)', value: 82, color: '#52a8ff' },
                  { label: 'Structural Concrete Spalling Area', value: 64, color: '#62c073' },
                  { label: 'High-Voltage Corridor Clear Space', value: 95, color: '#52a8ff' },
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
                      }}
                    >
                      <Box sx={{ width: `${item.value}%`, bgcolor: item.color, height: '100%' }} />
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
              RADIOMETRIC ACCURACY: ±2°C // TIFF COG SERVING
            </Typography>
          </Box>

          {/* Card 3: Cryptographic Report & Audit Verification */}
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
                Immutable Reports
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#999999', mb: 2.5 }}>
                Cryptographic PDF certificates tied to SHA-256 evidence records and maintenance repair workorders.
              </Typography>

              {/* Generated Image Asset: Immutable Inspection Certificate */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  mb: 2.5,
                }}
              >
                <Box
                  component="img"
                  src="/images/landing/immutable-report-preview.jpg"
                  alt="Cryptographic immutable inspection report preview"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.1) brightness(0.95)',
                  }}
                />
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusChip status="pass" label="SHA-256 VERIFIED" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="active" label="REPAIR TICKET #TK-402" />
                </Box>
              </Box>

              {/* Verified Ledger Trail */}
              <Stack spacing={1}>
                {[
                  { tag: '+ EVIDENCE', text: '1.4GB RAW 4K images sealed', color: '#62c073' },
                  { tag: '~ REVIEWER', text: 'Service Manager signed v2.1', color: '#52a8ff' },
                  { tag: '+ CLOSEOUT', text: 'Maintenance before/after attached', color: '#62c073' },
                ].map((item) => (
                  <Box
                    key={item.text}
                    sx={{
                      p: 1.25,
                      bgcolor: '#121212',
                      borderLeft: `3px solid ${item.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: '11px',
                        color: item.color,
                        fontWeight: 600,
                      }}
                    >
                      {item.tag}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: '12px',
                        color: '#FFFFFF',
                      }}
                    >
                      {item.text}
                    </Typography>
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
              WORM STORAGE // TAMPER-EVIDENT ARCHIVE
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
