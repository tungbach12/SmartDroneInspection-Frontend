import { useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusType } from './StatusChip';

interface EventSpan {
  id: string;
  name: string;
  startLabel: string;
  durationLabel: string;
  offsetPct: number;
  widthPct: number;
  status: StatusType;
  details: string;
}

const eventSpans: EventSpan[] = [
  {
    id: 'EVT-101',
    name: 'mission.scope.client_cadence_authorization',
    startLabel: '+00:00:00.000',
    durationLabel: '140.2ms',
    offsetPct: 0,
    widthPct: 12,
    status: 'pass',
    details: 'Client approved quote and site clearance for High-Voltage Tower Sector B.',
  },
  {
    id: 'EVT-102',
    name: 'flight.rtk.waypoint_trajectory_lock',
    startLabel: '+00:00:00.140',
    durationLabel: '280.5ms',
    offsetPct: 12,
    widthPct: 18,
    status: 'pass',
    details: 'Dual-frequency RTK fixed, sub-centimeter waypoint flight plan active.',
  },
  {
    id: 'EVT-103',
    name: 'payload.sensor.highres_raw_capture_stream',
    startLabel: '+00:00:00.420',
    durationLabel: '1,420.0ms',
    offsetPct: 30,
    widthPct: 38,
    status: 'active',
    details: '4K orthophoto + radiometric thermal capture with 0.8mm/px GSD resolution.',
  },
  {
    id: 'EVT-104',
    name: 'crypto.evidence.sha256_tamper_evident_seal',
    startLabel: '+00:00:01.840',
    durationLabel: '190.4ms',
    offsetPct: 68,
    widthPct: 12,
    status: 'pass',
    details: 'Cryptographic hash chain generated on-device, preserving immutable chain of custody.',
  },
  {
    id: 'EVT-105',
    name: 'ai.detection.candidate_screening_ensemble',
    startLabel: '+00:00:02.030',
    durationLabel: '320.1ms',
    offsetPct: 80,
    widthPct: 10,
    status: 'pass',
    details: 'YOLOv11 & SAM-2 screening: 3 concrete crack candidates, 1 rebar exposure flagged.',
  },
  {
    id: 'EVT-106',
    name: 'manager.gate.human_verification_signoff',
    startLabel: '+00:00:02.350',
    durationLabel: 'HOLD',
    offsetPct: 90,
    widthPct: 10,
    status: 'warn',
    details: 'Assigned Service Manager must review AI bounding boxes before client release.',
  },
];

export function EventStreamTable() {
  const [selectedId, setSelectedId] = useState<string>('EVT-103');

  const selectedSpan = eventSpans.find((s) => s.id === selectedId) || eventSpans[2];

  return (
    <Box
      id="event-stream"
      component="section"
      sx={{
        bgcolor: '#000000',
        py: { xs: 8, md: 14 },
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Heading */}
        <Box sx={{ mb: 4 }}>
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
            MISSION TELEMETRY & LIFECYCLE AUDIT
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
            Inspection Mission Event Stream
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Follow the live lifecycle of an infrastructure inspection: flight mission planning, raw sensor telemetry, SHA-256 evidence hashing, and human verification gates.
          </Typography>
        </Box>

        {/* Card-based Table per spec (#0a0a0a, 1px ring border rgba(255,255,255,0.145)) */}
        <Box
          sx={{
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.145)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar: Trace ID & Duration Chips */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              bgcolor: '#0e0e0e',
              borderBottom: '1px solid rgba(255, 255, 255, 0.145)',
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
                  color: '#FFFFFF',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                MISSION-ID: SDI-MSN-2026-9041A
              </Typography>
              <StatusChip status="pass" label="FLIGHT ACTIVE" />
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status="pass" label="RTK ACCURACY: 0.8CM" />
              <StatusChip status="active" label="FLIGHT TIME: 42m 18s" />
              <StatusChip status="fail" label="EVIDENCE: SHA-256 SEALED" />
            </Stack>
          </Box>

          {/* Split View: Left Sidebar 260px + Right Table */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
              minHeight: '400px',
            }}
          >
            {/* Left Sidebar: 260px event checkpoints & trajectory thumbnail */}
            <Box
              sx={{
                borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.145)' },
                borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.145)', md: 'none' },
                bgcolor: '#0a0a0a',
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
                    color: '#999999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    mb: 1.5,
                    px: 1,
                  }}
                >
                  MISSION CHECKPOINTS
                </Typography>

                <Stack spacing={0.5}>
                  {eventSpans.map((span) => {
                    const isSelected = span.id === selectedId;
                    return (
                      <Box
                        key={span.id}
                        onClick={() => setSelectedId(span.id)}
                        sx={{
                          p: '8px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: isSelected ? 'rgba(82, 168, 255, 0.12)' : 'transparent',
                          borderLeft: isSelected ? '2px solid #52a8ff' : '2px solid transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(82, 168, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: span.status === 'pass' ? '#62c073' : span.status === 'active' ? '#52a8ff' : '#ededed',
                            }}
                          />
                          <Typography
                            sx={{
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: '12px',
                              color: isSelected ? '#FFFFFF' : '#999999',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {span.id}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: '11px',
                            color: '#999999',
                          }}
                        >
                          {span.durationLabel}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {/* 3D Waypoint Trajectory Asset Preview */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '110px',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    mb: 1.5,
                  }}
                >
                  <Box
                    component="img"
                    src="/images/landing/flight-mission-plan.jpg"
                    alt="3D Flight Trajectory Waypoint CAD"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'contrast(1.2) brightness(0.9)',
                    }}
                  />
                  <Box sx={{ position: 'absolute', bottom: 6, left: 6 }}>
                    <StatusChip status="active" label="3D WAYPOINTS" />
                  </Box>
                </Box>

                {/* Selected checkpoint log details */}
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#e7e7e7',
                    lineHeight: 1.45,
                    bgcolor: '#141414',
                    p: 1.25,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {selectedSpan?.details ?? 'Flight telemetry and verification checkpoint active.'}
                </Typography>
              </Box>
            </Box>

            {/* Right Side: Table with SPAN, START (Progress visualization), and DURATION */}
            <Box sx={{ overflowX: 'auto', p: { xs: 2, sm: 3 } }}>
              <Box sx={{ minWidth: '560px' }}>
                {/* Table Header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(210px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
                    pb: 1.5,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#999999',
                    letterSpacing: '0.08em',
                  }}
                >
                  <Box>SPAN & EVENT PIPELINE</Box>
                  <Box>OFFSET & TIMELINE (EXECUTION)</Box>
                  <Box sx={{ textAlign: 'right' }}>DURATION</Box>
                  <Box sx={{ textAlign: 'right' }}>STATUS</Box>
                </Box>

                {/* Table Body Rows (all monospace per spec) */}
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {eventSpans.map((span) => {
                    const isSelected = span.id === selectedId;
                    return (
                      <Box
                        key={span.id}
                        onClick={() => setSelectedId(span.id)}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(210px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
                          alignItems: 'center',
                          p: '10px 12px',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(82, 168, 255, 0.08)' : '#0e0e0e',
                          border: isSelected ? '1px solid rgba(82, 168, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                          },
                        }}
                      >
                        {/* Span Name */}
                        <Typography
                          sx={{
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: '12px',
                            color: isSelected ? '#52a8ff' : '#FFFFFF',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            pr: 1,
                          }}
                        >
                          {span.name}
                        </Typography>

                        {/* START & Timeline progress-bar visualization (1.5h / 6px) */}
                        <Box sx={{ pr: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography
                              sx={{
                                fontFamily: '"Geist Mono", monospace',
                                fontSize: '10px',
                                color: '#999999',
                              }}
                            >
                              {span.startLabel}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              height: '6px',
                              bgcolor: 'rgba(255, 255, 255, 0.06)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${span.offsetPct}%`,
                                width: `${span.widthPct}%`,
                                bgcolor: isSelected || span.status === 'active' ? '#52a8ff' : 'rgba(255, 255, 255, 0.18)',
                                borderRadius: '2px',
                                boxShadow: isSelected ? '0 0 8px rgba(82, 168, 255, 0.8)' : 'none',
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Duration */}
                        <Typography
                          sx={{
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: '12px',
                            color: '#999999',
                            textAlign: 'right',
                          }}
                        >
                          {span.durationLabel}
                        </Typography>

                        {/* Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <StatusChip status={span.status} label={span.status} />
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
