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
    name: 'mission.preflight.airspace_clearance',
    startLabel: '+00:00:00.000',
    durationLabel: '180.2ms',
    offsetPct: 0,
    widthPct: 14,
    status: 'pass',
    details: 'NOTAM check verified, FAA/CAAV corridor unlocked, battery 99.4%',
  },
  {
    id: 'EVT-102',
    name: 'telemetry.rtk.kinematic_lock',
    startLabel: '+00:00:00.180',
    durationLabel: '342.1ms',
    offsetPct: 14,
    widthPct: 18,
    status: 'pass',
    details: 'Base station dual-frequency RTK fixed, sub-centimeter fix',
  },
  {
    id: 'EVT-103',
    name: 'payload.raw_capture.sensor_ingest',
    startLabel: '+00:00:00.522',
    durationLabel: '1,280.4ms',
    offsetPct: 32,
    widthPct: 36,
    status: 'active',
    details: '4K orthophoto + thermal radiometric stream at 30fps with GSD 0.8mm/px',
  },
  {
    id: 'EVT-104',
    name: 'crypto.checksum.sha256_audit_block',
    startLabel: '+00:00:01.802',
    durationLabel: '210.0ms',
    offsetPct: 68,
    widthPct: 12,
    status: 'pass',
    details: 'Image hash chain verified against on-disk immutable ledger',
  },
  {
    id: 'EVT-105',
    name: 'ai.detection.candidate_screening',
    startLabel: '+00:00:02.012',
    durationLabel: '315.6ms',
    offsetPct: 80,
    widthPct: 12,
    status: 'pass',
    details: '4 crack candidates isolated, 0.94 confidence threshold passed',
  },
  {
    id: 'EVT-106',
    name: 'reviewer.human_gate.signature_required',
    startLabel: '+00:00:02.327',
    durationLabel: 'PENDING',
    offsetPct: 92,
    widthPct: 8,
    status: 'warn',
    details: 'Assigned Service Manager must sign before release to Client',
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
            REALTIME TELEMETRY & TRACE AUDIT
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
            Inspection Event Stream Table
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Trace flight operations at sub-millisecond precision. Inspect sensor payloads, telemetry offsets, cryptographic evidence seals, and human review gates.
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
                TRACE: SDI-MSN-2026-9041A
              </Typography>
              <StatusChip status="pass" label="ACTIVE STREAM" />
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status="pass" label="RTK FIX: 100%" />
              <StatusChip status="active" label="DURATION: 42m 18s" />
              <StatusChip status="fail" label="PAYLOAD: 1.4 GB SHA-256" />
            </Stack>
          </Box>

          {/* Split View: Left Sidebar 240px + Right Table */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
              minHeight: '380px',
            }}
          >
            {/* Left Sidebar: 240px event IDs with status dots */}
            <Box
              sx={{
                borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.145)' },
                borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.145)', md: 'none' },
                bgcolor: '#0a0a0a',
                p: 2,
              }}
            >
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
                EVENT CHECKPOINTS
              </Typography>

              <Stack spacing={0.5}>
                {eventSpans.map((span) => {
                  const isSelected = span.id === selectedId;
                  return (
                    <Box
                      key={span.id}
                      onClick={() => setSelectedId(span.id)}
                      sx={{
                        p: '8px 12px',
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

              {/* Selected Span Detail card */}
              <Box
                sx={{
                  mt: 3,
                  p: 1.5,
                  bgcolor: '#141414',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '10px',
                    color: '#52a8ff',
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  ACTIVE INSPECTOR LOG
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#e7e7e7',
                    lineHeight: 1.45,
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
                    gridTemplateColumns: 'minmax(200px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
                    pb: 1.5,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '11px',
                    color: '#999999',
                    letterSpacing: '0.08em',
                  }}
                >
                  <Box>SPAN</Box>
                  <Box>START & OFFSET (TIMELINE)</Box>
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
                          gridTemplateColumns: 'minmax(200px, 1.8fr) minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(80px, 0.8fr)',
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
