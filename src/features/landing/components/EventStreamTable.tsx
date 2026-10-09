import { useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusType } from './StatusChip';

interface LifecycleStep {
  id: string;
  name: string;
  phaseLabel: string;
  timeLabel: string;
  offsetPct: number;
  widthPct: number;
  status: StatusType;
  details: string;
}

const lifecycleSteps: LifecycleStep[] = [
  {
    id: 'STEP-01',
    name: '1. Site Scope & Flight Cadence Approval',
    phaseLabel: 'PLANNING',
    timeLabel: 'PRE-FLIGHT',
    offsetPct: 0,
    widthPct: 14,
    status: 'pass',
    details: 'Asset owner approves inspection cadence, airspace corridor, and target structural areas.',
  },
  {
    id: 'STEP-02',
    name: '2. Autonomous Waypoint Trajectory',
    phaseLabel: 'EXECUTION',
    timeLabel: 'FLIGHT',
    offsetPct: 14,
    widthPct: 20,
    status: 'pass',
    details: 'Autonomous drone follows 3D CAD waypoints at 0.8mm/px GSD with zero human climbing risk.',
  },
  {
    id: 'STEP-03',
    name: '3. Raw Evidence Ingestion & Cryptographic Seal',
    phaseLabel: 'INGEST',
    timeLabel: 'EVIDENCE',
    offsetPct: 34,
    widthPct: 32,
    status: 'active',
    details: 'High-res 4K & thermal radiometric images stamped with on-device SHA-256 hash chains.',
  },
  {
    id: 'STEP-04',
    name: '4. AI Vision Screening (Cracks & Spalling)',
    phaseLabel: 'AI VISION',
    timeLabel: 'SCREENING',
    offsetPct: 66,
    widthPct: 14,
    status: 'pass',
    details: 'Computer-vision flags micro-fractures, corrosion pitting, and structural thermal anomalies.',
  },
  {
    id: 'STEP-05',
    name: '5. Licensed Inspector Verification Gate',
    phaseLabel: 'QUALITY GATE',
    timeLabel: 'REVIEW',
    offsetPct: 80,
    widthPct: 10,
    status: 'warn',
    details: 'Certified inspector reviews all AI candidate defects to guarantee zero false-positive releases.',
  },
  {
    id: 'STEP-06',
    name: '6. Maintenance Workorder & Closeout',
    phaseLabel: 'CLOSEOUT',
    timeLabel: 'REPAIR',
    offsetPct: 90,
    widthPct: 10,
    status: 'pass',
    details: 'Approved defects generate repair tickets for field engineers with before and after photo proof.',
  },
];

export function EventStreamTable() {
  const [selectedId, setSelectedId] = useState<string>('STEP-03');

  const selectedStep = lifecycleSteps.find((s) => s.id === selectedId) || lifecycleSteps[2];

  return (
    <Box
      id="event-stream"
      component="section"
      sx={{
        bgcolor: '#F7F9FA',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(23, 54, 74, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Heading: Outcome & Value Focus */}
        <Box sx={{ mb: 4 }}>
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
            END-TO-END INSPECTION LIFECYCLE
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
            From Flight to Fix in Six Steps
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#5D707B',
              maxWidth: '680px',
            }}
          >
            See how SmartDroneInspection turns complex aerial missions into certified reports and actionable repair tickets with zero human climbing risk.
          </Typography>
        </Box>

        {/* Card-based Table */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(23, 54, 74, 0.14)',
            boxShadow: '0 18px 48px rgba(23, 54, 74, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              bgcolor: '#F7F9FA',
              borderBottom: '1px solid rgba(23, 54, 74, 0.14)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '13px',
                  color: '#253746',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                LIFECYCLE FLOW: MISSION #SDI-2026-9041A
              </Typography>
              <StatusChip status="pass" label="ACTIVE LIFECYCLE" />
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status="pass" label="GSD: 0.8MM/PX" />
              <StatusChip status="active" label="AI SCREENING: ENABLED" />
              <StatusChip status="fail" label="INSPECTOR SIGN-OFF: REQUIRED" />
            </Stack>
          </Box>

          {/* Split View */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
              minHeight: '400px',
            }}
          >
            {/* Left Sidebar */}
            <Box
              sx={{
                borderRight: { xs: 'none', md: '1px solid rgba(23, 54, 74, 0.14)' },
                borderBottom: { xs: '1px solid rgba(23, 54, 74, 0.14)', md: 'none' },
                bgcolor: '#F7F9FA',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#5D707B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    mb: 1.5,
                    px: 1,
                  }}
                >
                  LIFECYCLE PHASES
                </Typography>

                <Stack spacing={0.5}>
                  {lifecycleSteps.map((step) => {
                    const isSelected = step.id === selectedId;
                    return (
                      <Box
                        key={step.id}
                        onClick={() => setSelectedId(step.id)}
                        sx={{
                          p: '8px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: isSelected ? 'rgba(8, 126, 139, 0.08)' : 'transparent',
                          borderLeft: isSelected ? '2px solid #087E8B' : '2px solid transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(8, 126, 139, 0.1)' : 'rgba(23, 54, 74, 0.04)',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: step.status === 'pass' ? '#62c073' : step.status === 'active' ? '#087E8B' : '#ededed',
                            }}
                          />
                          <Typography
                            sx={{
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: '12px',
                              color: isSelected ? '#075B67' : '#526773',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {step.id}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: '10px',
                            color: '#5D707B',
                          }}
                        >
                          {step.phaseLabel}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {/* 3D Flight Mission CAD Preview */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(23, 54, 74, 0.08)' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '110px',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    border: '1px solid rgba(23, 54, 74, 0.14)',
                    mb: 1.5,
                  }}
                >
                  <Box
                    component="img"
                    src="/images/landing/flight-mission-plan.jpg"
                    alt="Autonomous 3D Drone Flight Plan"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'contrast(1.2) brightness(0.9)',
                    }}
                  />
                  <Box sx={{ position: 'absolute', bottom: 6, left: 6 }}>
                    <StatusChip status="active" label="AUTONOMOUS 3D FLIGHT" />
                  </Box>
                </Box>

                {/* Selected Details */}
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#526773',
                    lineHeight: 1.45,
                    bgcolor: '#F7F9FA',
                    p: 1.25,
                    border: '1px solid rgba(23, 54, 74, 0.08)',
                  }}
                >
                  {selectedStep?.details ?? 'Lifecycle step active and monitored.'}
                </Typography>
              </Box>
            </Box>

            {/* Right Side: Timeline Table */}
            <Box sx={{ overflowX: 'auto', p: { xs: 2, sm: 3 } }}>
              <Box sx={{ minWidth: '560px' }}>
                {/* Header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
                    pb: 1.5,
                    borderBottom: '1px solid rgba(23, 54, 74, 0.08)',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#5D707B',
                    letterSpacing: '0.08em',
                  }}
                >
                  <Box>INSPECTION STAGE</Box>
                  <Box>PIPELINE PROGRESSION</Box>
                  <Box sx={{ textAlign: 'right' }}>PHASE</Box>
                  <Box sx={{ textAlign: 'right' }}>STATUS</Box>
                </Box>

                {/* Rows */}
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {lifecycleSteps.map((step) => {
                    const isSelected = step.id === selectedId;
                    return (
                      <Box
                        key={step.id}
                        onClick={() => setSelectedId(step.id)}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
                          alignItems: 'center',
                          p: '10px 12px',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(8, 126, 139, 0.06)' : '#FFFFFF',
                          border: isSelected ? '1px solid rgba(8, 126, 139, 0.25)' : '1px solid rgba(23, 54, 74, 0.06)',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: 'rgba(23, 54, 74, 0.06)',
                          },
                        }}
                      >
                        {/* Name */}
                        <Typography
                          sx={{
                            fontFamily: '"Geist Sans", sans-serif',
                            fontSize: '13px',
                            color: isSelected ? '#075B67' : '#253746',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            pr: 1,
                          }}
                        >
                          {step.name}
                        </Typography>

                        {/* Progress Bar */}
                        <Box sx={{ pr: 2 }}>
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              height: '6px',
                              bgcolor: 'rgba(23, 54, 74, 0.08)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${step.offsetPct}%`,
                                width: `${step.widthPct}%`,
                                bgcolor: isSelected || step.status === 'active' ? '#087E8B' : 'rgba(23, 54, 74, 0.14)',
                                borderRadius: '2px',
                                boxShadow: isSelected ? '0 0 8px rgba(8, 126, 139, 0.45)' : 'none',
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Phase label */}
                        <Typography
                          sx={{
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: '11px',
                            color: '#5D707B',
                            textAlign: 'right',
                          }}
                        >
                          {step.timeLabel}
                        </Typography>

                        {/* Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <StatusChip status={step.status} label={step.status} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
