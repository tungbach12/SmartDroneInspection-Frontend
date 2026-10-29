import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { mf1DroneApi, type DroneRegistrationInput } from '../api/mf1DroneApi';
import { PageHeader } from '@/shared/ui/PageHeader';

const emptyForm: DroneRegistrationInput = {
  serialNumber: '', model: '', manufacturer: '', registrationNumber: '',
  registrationFileKey: '', registrationExpiresAt: '', ownershipFileKey: '', inspectionFileKey: '',
};

export default function InspectorDroneRegistrationPage() {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const applications = useQuery({ queryKey: ['inspector-drone-applications'], queryFn: mf1DroneApi.mine });
  const drones = useQuery({ queryKey: ['inspector-drones'], queryFn: mf1DroneApi.drones });
  const submit = useMutation({
    mutationFn: mf1DroneApi.submit,
    onSuccess: async () => {
      setForm(emptyForm);
      setMessage('Drone registration submitted for administrator review.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspector-drone-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['inspector-drones'] }),
      ]);
    },
  });
  const update = (field: keyof DroneRegistrationInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    submit.mutate({ ...form, registrationExpiresAt: new Date(form.registrationExpiresAt).toISOString() });
  };

  return (
    <Box className="workspace-page">
      <PageHeader title="Register an inspection drone" subtitle="Submit registration and ownership evidence. The drone becomes available after an administrator approves the application." />
      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Drone and registration</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField required label="Serial number" value={form.serialNumber} onChange={update('serialNumber')} />
            <TextField label="Model" value={form.model} onChange={update('model')} />
            <TextField label="Manufacturer" value={form.manufacturer} onChange={update('manufacturer')} />
            <TextField required label="Registration number" value={form.registrationNumber} onChange={update('registrationNumber')} />
            <TextField required type="date" label="Registration expiry" value={form.registrationExpiresAt} onChange={update('registrationExpiresAt')} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Evidence file keys</Typography>
          <TextField required label="Registration document file key" value={form.registrationFileKey} onChange={update('registrationFileKey')} />
          <TextField required label="Ownership document file key" value={form.ownershipFileKey} onChange={update('ownershipFileKey')} />
          <TextField required label="Inspection evidence file key" value={form.inspectionFileKey} onChange={update('inspectionFileKey')} />
          <Typography variant="body2" color="text.secondary">File upload is not available in this release. Enter evidence file keys from an approved storage workflow.</Typography>
          {submit.isError && <Alert severity="error">The application could not be submitted. Check the evidence and try again.</Alert>}
          {message && <Alert severity="success" role="status">{message}</Alert>}
          <Button type="submit" variant="contained" disabled={submit.isPending || !form.registrationExpiresAt}>{submit.isPending ? 'Submitting…' : 'Submit drone for review'}</Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6">My drone registration applications</Typography>
        {applications.error && <Alert severity="error">Could not load your applications.</Alert>}
        {applications.isLoading ? <Typography>Loading applications…</Typography> : (applications.data ?? []).length === 0 ? <Typography color="text.secondary">No applications submitted.</Typography> : (applications.data ?? []).map((application) => (
          <Box key={application.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 600 }}>{application.serialNumber} · {application.registrationNumber}</Typography>
            <Typography variant="body2" color="text.secondary">{application.status}{application.reviewNote ? ` · ${application.reviewNote}` : ''}</Typography>
          </Box>
        ))}
      </Paper>
      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6">My approved drones</Typography>
        {drones.error && <Alert severity="error">Could not load your registered drones.</Alert>}
        {(drones.data ?? []).map((drone) => <Box key={drone.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}><Typography sx={{ fontWeight: 600 }}>{drone.serialNumber} · {drone.model ?? 'Model not provided'}</Typography><Typography variant="body2" color="text.secondary">{drone.manufacturer ?? '—'} · {drone.serviceability}</Typography></Box>)}
      </Paper>
    </Box>
  );
}
