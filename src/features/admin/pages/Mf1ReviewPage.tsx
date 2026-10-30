import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mf1ReviewApi, type DroneRegistrationApplication, type InspectorPartnerApplication, type ProspectiveCustomerReview } from '../api/mf1ReviewApi';
import { PageHeader } from '@/shared/ui/PageHeader';

const panels = ['Customer airspace', 'Inspector partners', 'Drone registrations'] as const;
type Panel = (typeof panels)[number];
type ReviewItem = ProspectiveCustomerReview | InspectorPartnerApplication | DroneRegistrationApplication;

export default function Mf1ReviewPage() {
  const [panel, setPanel] = useState<Panel>(panels[0]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [partnerContractFileKey, setPartnerContractFileKey] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<Array<{ label: string; url: string }>>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceFailed, setEvidenceFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  const customers = useQuery({ queryKey: ['mf1-reviews', 'customers'], queryFn: mf1ReviewApi.pendingCustomers });
  const partners = useQuery({ queryKey: ['mf1-reviews', 'partners'], queryFn: mf1ReviewApi.pendingPartners });
  const drones = useQuery({ queryKey: ['mf1-reviews', 'drones'], queryFn: mf1ReviewApi.pendingDrones });

  const items: ReviewItem[] = panel === 'Customer airspace'
    ? customers.data ?? []
    : panel === 'Inspector partners'
      ? partners.data ?? []
      : drones.data ?? [];

  const closeDialog = () => {
    if (pending) return;
    setSelected(null);
    setReviewNote('');
    setPartnerContractFileKey('');
    evidenceUrls.forEach(({ url }) => URL.revokeObjectURL(url));
    setEvidenceUrls([]);
    setEvidenceLoading(false);
    setEvidenceFailed(false);
    setError(null);
  };

  const openReview = async (item: ReviewItem) => {
    evidenceUrls.forEach(({ url }) => URL.revokeObjectURL(url));
    setEvidenceUrls([]);
    setSelected(item);
    setAction('approve');
    setError(null);
    setEvidenceFailed(false);
    setEvidenceLoading(true);
    try {
      const documents = panel === 'Inspector partners'
        ? [{ label: 'Pilot license', load: () => mf1ReviewApi.partnerLicenseDocument(item.id) }]
        : panel === 'Drone registrations'
          ? (['REGISTRATION', 'OWNERSHIP', 'INSPECTION'] as const).map((type) => ({
              label: type === 'REGISTRATION' ? 'Registration document' : type === 'OWNERSHIP' ? 'Ownership document' : 'Inspection evidence',
              load: () => mf1ReviewApi.droneEvidence(item.id, type),
            }))
          : [];
      if (documents.length === 0) {
        setEvidenceLoading(false);
        return;
      }
      const loaded = await Promise.all(documents.map(async ({ label, load }) => ({ label, blob: await load() })));
      setEvidenceUrls(loaded.map(({ label, blob }) => ({ label, url: URL.createObjectURL(blob) })));
    } catch {
      setEvidenceFailed(true);
      setError('Evidence documents could not be loaded. Refresh the queue and try again.');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const review = async () => {
    if (!selected) return;
    if (action === 'reject' && !reviewNote.trim()) {
      setError('A reason is required to reject an application.');
      return;
    }
    if (panel === 'Customer airspace' && action === 'approve' && !reviewNote.trim()) {
      setError('An administrator review note is required for non-clear locations.');
      return;
    }
    if (panel === 'Inspector partners' && action === 'approve' && !partnerContractFileKey.trim()) {
      setError('A verified partner contract file key is required before approval.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (panel === 'Customer airspace') {
        if (action === 'approve') await mf1ReviewApi.approveCustomer(selected.id, reviewNote.trim());
        else await mf1ReviewApi.rejectCustomer(selected.id, reviewNote.trim());
      } else if (panel === 'Inspector partners') {
        if (action === 'approve') await mf1ReviewApi.approvePartner(selected.id, partnerContractFileKey.trim(), reviewNote.trim());
        else await mf1ReviewApi.rejectPartner(selected.id, reviewNote.trim());
      } else {
        if (action === 'approve') await mf1ReviewApi.approveDrone(selected.id);
        else await mf1ReviewApi.rejectDrone(selected.id, reviewNote.trim());
      }
      await queryClient.invalidateQueries({ queryKey: ['mf1-reviews'] });
      closeDialog();
    } catch {
      setError('The review could not be saved. Refresh the queue and try again.');
    } finally {
      setPending(false);
    }
  };

  const loading = customers.isLoading || partners.isLoading || drones.isLoading;
  const loadError = customers.error || partners.error || drones.error;

  return (
    <Box className="workspace-page">
      <PageHeader title="MF1 onboarding reviews" subtitle="Review customer airspace, inspector partner and drone registration applications." />
      {loadError && <Alert severity="error">Could not load the review queues. Refresh to retry.</Alert>}
      <Paper variant="outlined" sx={{ mt: 2 }}>
        <Tabs value={panel} onChange={(_, value: Panel) => setPanel(value)} aria-label="MF1 review queues" variant="scrollable">
          {panels.map((name) => <Tab key={name} value={name} label={`${name} (${name === 'Customer airspace' ? customers.data?.length ?? 0 : name === 'Inspector partners' ? partners.data?.length ?? 0 : drones.data?.length ?? 0})`} />)}
        </Tabs>
        {loading ? <Typography sx={{ p: 3 }}>Loading review queue…</Typography> : items.length === 0 ? <Typography sx={{ p: 3 }}>No pending applications.</Typography> : (
          <Stack divider={<Box component="hr" sx={{ border: 0, borderTop: '1px solid', borderColor: 'divider', m: 0 }} />}>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{panel === 'Customer airspace' ? (item as ProspectiveCustomerReview).organizationName : panel === 'Inspector partners' ? (item as InspectorPartnerApplication).fullName : (item as DroneRegistrationApplication).serialNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {panel === 'Customer airspace' ? `${(item as ProspectiveCustomerReview).assetName} · ${(item as ProspectiveCustomerReview).airspaceClassification}` : panel === 'Inspector partners' ? `${(item as InspectorPartnerApplication).email} · license ${(item as InspectorPartnerApplication).pilotLicenseNumber}` : `${(item as DroneRegistrationApplication).model ?? 'Drone'} · ${(item as DroneRegistrationApplication).registrationNumber}`}
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => void openReview(item)}>Review</Button>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={selected !== null} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Review {panel === 'Customer airspace' ? 'customer registration' : panel === 'Inspector partners' ? 'inspector partner application' : 'drone registration'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selected && <Alert severity="info">{panel === 'Customer airspace' ? `${(selected as ProspectiveCustomerReview).organizationName} · ${(selected as ProspectiveCustomerReview).assetName} · ${(selected as ProspectiveCustomerReview).airspaceClassification}` : panel === 'Inspector partners' ? `${(selected as InspectorPartnerApplication).fullName} · ${(selected as InspectorPartnerApplication).pilotLicenseNumber} · expires ${(selected as InspectorPartnerApplication).pilotLicenseExpiresAt}` : `${(selected as DroneRegistrationApplication).serialNumber} · ${(selected as DroneRegistrationApplication).registrationNumber}`}</Alert>}
            {evidenceLoading && <Typography>Loading evidence documents…</Typography>}
            {evidenceUrls.map(({ label, url }) => (
              <Box key={url} sx={{ display: 'grid', gap: 0.5 }}>
                <Typography variant="subtitle2">{label}</Typography>
                <Box component="iframe" src={url} title={label} sx={{ width: '100%', height: 320, border: 1, borderColor: 'divider', borderRadius: 1 }} />
              </Box>
            ))}
            {panel === 'Inspector partners' && action === 'approve' && <TextField label="Verified partner contract file key" value={partnerContractFileKey} onChange={(event) => setPartnerContractFileKey(event.target.value)} required fullWidth />}
            {panel !== 'Drone registrations' && action === 'approve' && <TextField label="Review note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} required={panel === 'Customer airspace'} multiline minRows={2} fullWidth />}
            {action === 'reject' && <TextField label="Rejection reason" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} required multiline minRows={3} fullWidth />}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <TextField select size="small" label="Decision" value={action} onChange={(event) => { setAction(event.target.value as typeof action); setError(null); }}>
            <MenuItem value="approve">Approve</MenuItem><MenuItem value="reject">Reject</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={closeDialog} disabled={pending}>Cancel</Button>
            <Button variant={action === 'reject' ? 'contained' : 'contained'} color={action === 'reject' ? 'error' : 'primary'} onClick={() => void review()} disabled={pending || evidenceLoading || (action === 'approve' && panel !== 'Customer airspace' && evidenceFailed)}>{pending ? 'Saving…' : action === 'reject' ? 'Reject' : 'Approve'}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
