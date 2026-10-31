import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type IssueServiceQuoteInput, type ServiceRequest } from '../api/contractApi';
import { dateTimeInputToInstant } from '../api/scheduleTime';
import {
  useAcceptServiceQuote,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
} from '../hooks/useContracts';

interface RequestQuotePanelProps {
  request: ServiceRequest;
  customer: boolean;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function RequestQuotePanel({
  request,
  customer,
  manager,
  onChanged,
  onError,
}: RequestQuotePanelProps) {
  const latest = request.quotes[0];
  const accept = useAcceptServiceQuote(request.id);
  const issue = useIssueServiceQuote(request.id);
  const inspectors = usePartnerInspectors();
  const drones = usePartnerDrones();

  const [scope, setScope] = useState(request.description);
  const [start, setStart] = useState(`${request.requestedFrom}T08:00`);
  const [end, setEnd] = useState(`${request.requestedFrom}T10:00`);
  const [inspectorId, setInspectorId] = useState('');
  const [droneId, setDroneId] = useState('');
  const [price, setPrice] = useState('11000000');

  const availableDrones = (drones.data ?? []).filter((drone) => drone.inspectorOwnerId === inspectorId);
  const selectedDroneId = availableDrones.some((drone) => drone.id === droneId) ? droneId : '';

  const issueQuote = async () => {
    if (!scope.trim()) {
      onError('Enter the quoted inspection scope.');
      return;
    }
    if (!inspectorId || !selectedDroneId) {
      onError('Select a registered partner Inspector and one of their drones.');
      return;
    }
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) {
      onError('Enter a positive price with no more than two decimal places.');
      return;
    }
    try {
      const startAt = dateTimeInputToInstant(start, request.timezone);
      const endAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(endAt) <= Date.parse(startAt)) {
        onError('The proposed occurrence end must be after its start.');
        return;
      }
      await issue.mutateAsync({
        scopeSnapshot: scope.trim(),
        firstOccurrenceStartAt: startAt,
        firstOccurrenceEndAt: endAt,
        inspectorId,
        droneId: selectedDroneId,
        pricePerOccurrenceVnd: amount,
        pricePerOccurrenceUsd: amount,
      } satisfies IssueServiceQuoteInput);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to issue quote.';
      onError(msg);
    }
  };

  const acceptLatest = async () => {
    if (!latest) return;
    try {
      await accept.mutateAsync(latest.versionNo);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to accept quote.';
      onError(msg);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Quotes
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {request.quotes.length === 0 ? (
            <Typography color="text.secondary">No quote issued yet.</Typography>
          ) : (
            request.quotes.map((quote) => {
              const isLatest = quote.versionNo === latest?.versionNo;
              return (
                <Box
                  key={quote.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: isLatest ? 'primary.main' : 'divider',
                    bgcolor: isLatest ? 'primary.50' : 'background.paper',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontWeight: 750 }}>
                      Version {quote.versionNo}
                      {isLatest ? ' · Latest' : ''}
                    </Typography>
                    <Chip
                      size="small"
                      color="primary"
                      label={
                        quote.currency === 'VND' || (quote.pricePerOccurrenceVnd != null && quote.pricePerOccurrenceVnd > 0)
                          ? `${Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd).toLocaleString('vi-VN')} VND / đợt`
                          : `$${quote.pricePerOccurrenceUsd.toFixed(2)} USD / occurrence`
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                    {quote.scopeSnapshot}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    First occurrence proposal: {new Date(quote.firstOccurrenceStartAt).toLocaleString()} –{' '}
                    {new Date(quote.firstOccurrenceEndAt).toLocaleString()} · Inspector {quote.inspectorId} · Drone {quote.droneId}
                  </Typography>
                  {customer && request.status === 'QUOTED' && isLatest && (
                    <Box sx={{ mt: 1.5 }}>
                      <LoadingButton
                        loading={accept.isPending}
                        variant="contained"
                        color="success"
                        onClick={() => void acceptLatest()}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        Accept latest quote
                      </LoadingButton>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Stack>

        {manager && ['OPEN', 'QUOTED'].includes(request.status) && (
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Issue quote version
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label="Quoted scope"
                multiline
                minRows={2}
                size="small"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="First occurrence start"
                  type="datetime-local"
                  size="small"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="First occurrence end"
                  type="datetime-local"
                  size="small"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="partner-inspector-label">Partner Inspector</InputLabel>
                  <Select
                    labelId="partner-inspector-label"
                    label="Partner Inspector"
                    value={inspectorId}
                    onChange={(e) => {
                      setInspectorId(e.target.value);
                      setDroneId('');
                    }}
                  >
                    {(inspectors.data ?? []).map((inspector) => (
                      <MenuItem key={inspector.id} value={inspector.id}>
                        {inspector.fullName} · License expires{' '}
                        {inspector.licenseExpiresAt
                          ? new Date(inspector.licenseExpiresAt).toLocaleDateString()
                          : 'not recorded'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" disabled={!inspectorId || drones.isPending}>
                  <InputLabel id="partner-drone-label">Partner drone</InputLabel>
                  <Select
                    labelId="partner-drone-label"
                    label="Partner drone"
                    value={selectedDroneId}
                    onChange={(e) => setDroneId(e.target.value)}
                  >
                    {availableDrones.map((drone) => (
                      <MenuItem key={drone.id} value={drone.id}>
                        {drone.serialNumber} · {drone.model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Price per occurrence (VND/USD)"
                type="number"
                size="small"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                helperText="Ví dụ: 11000000 VND"
              />
              <Box sx={{ pt: 0.5 }}>
                <LoadingButton
                  loading={issue.isPending}
                  variant="contained"
                  onClick={() => void issueQuote()}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Issue new quote version
                </LoadingButton>
              </Box>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
