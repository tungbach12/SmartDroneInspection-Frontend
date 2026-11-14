import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useCreatePlatformUser,
  usePlatformUsers,
} from '../hooks/usePlatformUsers';
import type { PlatformUser } from '../api/platformUserApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { InspectorProfileDialog } from '../components/InspectorProfileDialog';

/**
 * Dedicated Partner Inspectors roster page for Platform Manager (/manager/platform-users).
 * Displays only Partner Inspector accounts with pilot license & drone qualification profile inspection.
 */
export default function ManagerPartnerInspectorsPage() {
  const { t } = useLocale();
  const users = usePlatformUsers();
  const createUser = useCreatePlatformUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const items = (users.data ?? []).filter(
    (user) => user.roles.includes('INSPECTOR') || user.actorZone === 'INSPECTOR',
  );

  const columns: DataTableColumn<PlatformUser>[] = [
    {
      id: 'email',
      label: t('Partner Inspector'),
      render: (user) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
            {user.fullName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{user.email}</Typography>
        </Box>
      ),
    },
    {
      id: 'roles',
      label: t('Roles'),
      width: 220,
      render: (user) => (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          {user.roles.map((role) => (
            <Chip
              key={role}
              size="small"
              label={role}
              sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
            />
          ))}
        </Stack>
      ),
    },
    {
      id: 'actions',
      label: '',
      width: 200,
      align: 'right' as const,
      render: (user: PlatformUser) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<FlightTakeoffRounded />}
            onClick={() => {
              setSelectedInspectorId(user.id);
              setProfileDialogOpen(true);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '8px',
            }}
          >
            {t('Pilot profile')}
          </Button>
        </Stack>
      ),
    },
  ];

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      {
        email: email.trim(),
        fullName: fullName.trim(),
        actorZone: 'INSPECTOR',
        roles: ['INSPECTOR'],
      },
      {
        onSuccess: (created) => {
          setIssuedPassword({
            email: created.user.email,
            temporaryPassword: created.temporaryPassword,
          });
          setCreateOpen(false);
          setEmail('');
          setFullName('');
        },
      },
    );
  };

  const newInspectorButton = (
    <Button
      variant="contained"
      startIcon={<PersonAddAlt />}
      onClick={() => setCreateOpen(true)}
      sx={{
        borderRadius: '8px',
        px: 2,
        py: 0.875,
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
      }}
    >
      {t('New partner inspector')}
    </Button>
  );

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={t('Partner workforce')}
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: t('Partner workforce') },
        ]}
      />

      <Box>
        <MutationProblemAlert
          error={createUser.error}
          isError={createUser.isError}
          fallbackMessage={t('Could not create the account.')}
        />

        {issuedPassword && (
          <Alert
            severity="success"
            onClose={() => setIssuedPassword(null)}
            sx={{ mb: 2, borderRadius: '10px' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Temporary password issued for')} {issuedPassword.email}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
              {issuedPassword.temporaryPassword}
            </Typography>
          </Alert>
        )}

        <QueryState
          isLoading={users.isLoading}
          error={users.error}
          isEmpty={items.length === 0}
          onRetry={() => void users.refetch()}
          empty={
            <EmptyState
              title={t('No partner inspectors found')}
              description={t('Approved partner drone inspectors will appear in this roster.')}
            />
          }
        >
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(user) => user.id}
            searchable
            searchPlaceholder={t('Search by id, name, or email…')}
            searchPredicate={(user, query) =>
              user.fullName.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query)
            }
            actions={newInspectorButton}
          />
        </QueryState>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('New partner inspector')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Full name')}
                required
                fullWidth
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={createUser.isPending}
              disabled={!email.trim() || !fullName.trim()}
            >
              {t('Create account')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      <InspectorProfileDialog
        open={profileDialogOpen}
        inspectorId={selectedInspectorId}
        onClose={() => {
          setProfileDialogOpen(false);
          setSelectedInspectorId(null);
        }}
      />
    </Box>
  );
}
