import { Navigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Button, Container, Stack, Typography } from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  canAccessSection,
  getAvailablePortals,
  getSectionPath,
  isSectionId,
  PORTAL_CONFIG,
  type PortalId,
} from '@/app/permissions/accessPolicy';

export default function PortalSelectionPage() {
  const roles = useAuthStore((state) => state.roles);
  const [searchParams] = useSearchParams();
  const sectionQuery = searchParams.get('section');
  const requestedSection = isSectionId(sectionQuery) ? sectionQuery : null;
  const choices = getAvailablePortals(roles)
    .filter((portal) =>
      requestedSection
        ? canAccessSection(portal, requestedSection, roles)
        : true,
    )
    .map((portal: PortalId) => ({
      portal,
      path: getSectionPath(
        portal,
        requestedSection ?? 'dashboard',
      ),
    }));

  if (choices.length === 0) {
    return <Navigate to="/forbidden" replace />;
  }

  const singleChoice = choices[0];
  if (choices.length === 1 && singleChoice) {
    return <Navigate to={singleChoice.path} replace />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Choose a workspace
        </Typography>
        <Typography color="text.secondary">
          {requestedSection
            ? `Choose the workspace for ${requestedSection}.`
            : 'Your account has access to more than one workspace.'}
        </Typography>
        {choices.map(({ portal, path }) => (
          <Button
            key={portal}
            component={RouterLink}
            to={path}
            variant="outlined"
            size="large"
            sx={{ justifyContent: 'flex-start', py: 1.5 }}
          >
            {PORTAL_CONFIG[portal].label}
          </Button>
        ))}
      </Stack>
    </Container>
  );
}
