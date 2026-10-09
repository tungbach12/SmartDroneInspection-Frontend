import { Box, Container, Stack, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { StatusChip } from './StatusChip';

const roles = [
  {
    role: 'ADMIN',
    title: 'Platform Administrator',
    description:
      'Manage platform access and maintain secure, reliable service across workspaces.',
    status: 'active' as const,
    statusLabel: 'PLATFORM ACCESS',
    actionText: 'Platform Sign In',
    href: '/login',
  },
  {
    role: 'ORG_ADMIN',
    title: 'Organization Admin',
    description:
      'Register site assets, submit inspection requests, and review released inspection reports.',
    status: 'pass' as const,
    statusLabel: 'ORGANIZATION ACCESS',
    actionText: 'Organization Sign In',
    href: '/login',
  },
  {
    role: 'INSPECTOR',
    title: 'Inspector',
    description:
      'Plan assigned inspections and capture traceable field evidence for human review.',
    status: 'pass' as const,
    statusLabel: 'FIELD OPERATIONS',
    actionText: 'Operations Sign In',
    href: '/login',
  },
  {
    role: 'MAINTENANCE_ENGINEER',
    title: 'Maintenance Engineer',
    description:
      'Complete assigned maintenance work and record evidence of close-out.',
    status: 'warn' as const,
    statusLabel: 'MAINTENANCE',
    actionText: 'Operations Sign In',
    href: '/login',
  },
];

export function DarkRoleConsole() {
  return (
    <Box
      id="security"
      component="section"
      sx={{
        bgcolor: '#F7F9FA',
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
              color: '#087E8B',
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
              color: '#253746',
            }}
          >
            Separation of Duties by Design
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '16px',
              color: '#5D707B',
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
                bgcolor: '#FFFFFF',
                border: '1px solid rgba(23, 54, 74, 0.14)',
                p: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(23, 54, 74, 0.3)',
                },
              }}
            >
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '12px',
                      color: '#087E8B',
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
                    color: '#253746',
                    mb: 1.5,
                  }}
                >
                  {item.title}
                </Typography>

                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#5D707B',
                    lineHeight: 1.65,
                  }}
                >
                  {item.description}
                </Typography>
              </Box>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(23, 54, 74, 0.08)' }}>
                <Box
                  component="a"
                  href={item.href}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    bgcolor: 'transparent',
                    border: '1px solid rgba(23, 54, 74, 0.2)',
                    color: '#253746',
                    px: '14px',
                    py: '8px',
                    borderRadius: '0px',
                    textDecoration: 'none',
                    fontFamily: '"Geist Sans", sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#087E8B',
                      color: '#FFFFFF',
                      borderColor: '#087E8B',
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
