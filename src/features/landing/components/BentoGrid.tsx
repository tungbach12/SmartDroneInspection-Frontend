import { Box, Container, Stack, Typography } from '@mui/material';
import { StatusChip } from './StatusChip';

export function BentoGrid() {
  return (
    <Box
      id="bento-matrix"
      component="section"
      sx={{
        bgcolor: '#F7F9FA',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(23, 54, 74, 0.1)',
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
            INTELLIGENT DRONE INSPECTION CAPABILITIES
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
            How AI and Drones Protect Your Assets
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#5D707B',
              maxWidth: '680px',
            }}
          >
            Replace manual inspection guesswork with automated crack vision, thermal heat loss detection, and certified compliance reports.
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
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(23, 54, 74, 0.14)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 32px rgba(23, 54, 74, 0.08)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#5D707B',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                COMPUTER VISION
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#253746',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Sub-Millimeter Defect Detection
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#5D707B', mb: 2.5, lineHeight: 1.6 }}>
                Neural vision models analyze 4K aerial imagery down to 0.8mm resolution, instantly spotting fractures and corrosion before structural failures occur.
              </Typography>

              {/* Generated Image Asset: Camera POV with Bounding Boxes */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(23, 54, 74, 0.14)',
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
                  <StatusChip status="pass" label="AI CONFIDENCE: 96%" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="warn" label="HUMAN REVIEW GATE" />
                </Box>
              </Box>

              {/* Detected Defect Findings */}
              <Stack spacing={1}>
                {[
                  { name: 'Bridge Pier Surface Crack', delta: 'HIGH SEVERITY', chip: 'ACTION', status: 'fail' as const },
                  { name: 'Rebar Corrosion Exposure', delta: 'MONITORING', chip: 'REVIEW', status: 'warn' as const },
                  { name: 'High-Torque Flange Bolts', delta: 'NORMAL FIT', chip: 'PASS', status: 'pass' as const },
                ].map((item) => (
                  <Box
                    key={item.name}
                    sx={{
                      p: 1.25,
                      bgcolor: '#FFFFFF',
                      border: '1px solid rgba(23, 54, 74, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '13px', color: '#253746', fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: '11px',
                          color: '#5D707B',
                        }}
                      >
                        STATUS: {item.delta}
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
                color: '#5D707B',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(23, 54, 74, 0.08)',
              }}
            >
              ZERO FALSE ALARM RELEASES // VERIFIED BY INSPECTORS
            </Typography>
          </Box>

          {/* Card 2: Thermal & Spatial Anomaly Clustering */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(23, 54, 74, 0.14)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 32px rgba(23, 54, 74, 0.08)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#5D707B',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                RADIOMETRIC THERMAL
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#253746',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Thermal & Spatial Mapping
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#5D707B', mb: 2.5, lineHeight: 1.6 }}>
                Pinpoint invisible insulation leaks, solar cell hotspots, and roof moisture traps without drilling or dismantling physical infrastructure.
              </Typography>

              {/* Generated Image Asset: LiDAR False Color Heatmap */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(23, 54, 74, 0.14)',
                  mb: 2.5,
                }}
              >
                <Box
                  component="img"
                  src="/images/landing/inspection-scan-ortho.jpg"
                  alt="Thermal radiometric scan and orthomosaic map"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.15) brightness(0.9)',
                  }}
                />
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusChip status="active" label="THERMAL OVERLAY" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="pass" label="RTK GPS ACCURATE" />
                </Box>
              </Box>

              {/* Heat breakdown */}
              <Stack spacing={1.5}>
                {[
                  { label: 'Rooftop Moisture & Leak Ingress', value: 85, color: '#087E8B' },
                  { label: 'Solar Photovoltaic Cell Hotspots', value: 72, color: '#62c073' },
                  { label: 'High-Voltage Insulator Heat Delta', value: 94, color: '#087E8B' },
                ].map((item) => (
                  <Box key={item.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px', color: '#253746', fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '11px', color: '#5D707B' }}>
                        {item.value}% EFFICIENCY
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: '6px',
                        bgcolor: 'rgba(23, 54, 74, 0.08)',
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
                color: '#5D707B',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(23, 54, 74, 0.08)',
              }}
            >
              ACCURATE TEMPERATURE PROFILING // INSTANT ROI
            </Typography>
          </Box>

          {/* Card 3: Cryptographic Report & Audit Verification */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(23, 54, 74, 0.14)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 32px rgba(23, 54, 74, 0.08)',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '11px',
                  color: '#5D707B',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                COMPLIANCE & AUDIT
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#253746',
                  mt: 0.5,
                  mb: 1,
                }}
              >
                Certified Compliance Reports
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#5D707B', mb: 2.5, lineHeight: 1.6 }}>
                Turn aerial findings into tamper-proof inspection certificates that regulators and insurers accept, then dispatch verified maintenance tickets.
              </Typography>

              {/* Generated Image Asset: Immutable Inspection Certificate */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid rgba(23, 54, 74, 0.14)',
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
                  <StatusChip status="pass" label="SEALED EVIDENCE" />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  <StatusChip status="active" label="MAINTENANCE DISPATCHED" />
                </Box>
              </Box>

              {/* Real Value Outcomes */}
              <Stack spacing={1}>
                {[
                  { tag: 'EVIDENCE', text: 'Tamper-proof RAW 4K photos attached', color: '#62c073' },
                  { tag: 'SIGN-OFF', text: 'Certified Inspector signed report', color: '#087E8B' },
                  { tag: 'REPAIRS', text: 'Before and after photo verification', color: '#62c073' },
                ].map((item) => (
                  <Box
                    key={item.text}
                    sx={{
                      p: 1.25,
                      bgcolor: '#FFFFFF',
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
                        fontFamily: '"Geist Sans", sans-serif',
                        fontSize: '13px',
                        color: '#253746',
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
                color: '#5D707B',
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(23, 54, 74, 0.08)',
              }}
            >
              INSURANCE-READY & REGULATORY-COMPLIANT
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
