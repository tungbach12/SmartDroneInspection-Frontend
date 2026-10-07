import { Box, Container, Stack, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { StatusChip } from './StatusChip';

const roles = [
  {
    role: 'CLIENT',
    title: 'Asset Owner & Inspection Requestor',
    description:
      'Register site assets, submit inspection cadence requests, approve commercial quotes, and inspect immutable, signed reports with high-res evidence links.',
    status: 'pass' as const,
    statusLabel: 'VERIFIED ACCESS',
    actionText: 'Client Portal',
    href: '/login',
  },
  {
    role: 'SERVICE MANAGER',
    title: 'Operations & Quality Lead',
    description:
      'Review client scopes, prepare detailed quotations, assign flight inspectors, and sign off on verified defect reports before customer release.',
    status: 'active' as const,
    statusLabel: 'RELEASE GATE',
    actionText: 'Manager Console',
    href: 'https://smartdroneinspection-provider.duckdns.org/login',
  },
  {
    role: 'INSPECTOR',
    title: 'Flight Planning & Raw Evidence Capture',
    description:
      'Configure GSD, AGL, camera overlap, airspace NOTAMs; pilot mission execution and upload cryptographic SHA-256 sealed telemetry packages.',
    status: 'pass' as const,
    statusLabel: 'FIELD TELEMETRY',
    actionText: 'Flight Console',
    href: 'https://smartdroneinspection-provider.duckdns.org/login',
  },
  {
    role: 'MAINTENANCE ENGINEER',
    title: 'Defect Remediation & Closeout',
    description:
      'Receive approved defect workorders, execute physical on-site structural remediation, and upload before/after closure evidence with audit stamps.',
    status: 'warn' as const,
    statusLabel: 'WORKORDERS',
    actionText: 'Repair Desk',
    href: 'https://smartdroneinspection-provider.duckdns.org/login',
  },
];

export function DarkRoleConsole() {
  return (
    <Box
      id="security"
      component="section"
      sx={{
        bgcolor: '#000000',
        py: { xs: 8, md: 14 },
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
            ROLE-BASED WORKSPACE ARCHITECTURE
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
            Separation of Duties by Design
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#999999',
              maxWidth: '680px',
            }}
          >
            Role permissions and organization boundaries prevent unverified findings from releasing without an assigned human sign-off.
          </Typography>
        </Box>

        {/* 4 Cards Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {roles.map((item) => (
            <Box
              key={item.role}
              sx={{
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(255, 255, 255, 0.145)',
                p: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                },
              }}
            >
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '12px',
                      color: '#52a8ff',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {item.role}
                  </Typography>
                  <StatusChip status={item.status} label={item.statusLabel} />
                </Stack>

                <Typography
                  sx={{
                    fontFamily: '"Geist Sans", sans-serif',
                    fontSize: '22px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    mb: 1.5,
                  }}
                >
                  {item.title}
                </Typography>

                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#999999',
                    lineHeight: 1.65,
                  }}
                >
                  {item.description}
                </Typography>
              </Box>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box
                  component="a"
                  href={item.href}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    bgcolor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    px: '14px',
                    py: '8px',
                    borderRadius: '0px',
                    textDecoration: 'none',
                    fontFamily: '"Geist Sans", sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#FFFFFF',
                      color: '#121212',
                      borderColor: '#FFFFFF',
                    },
                  }}
                >
                  {item.actionText}
                  <NorthEastIcon sx={{ fontSize: 13 }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
