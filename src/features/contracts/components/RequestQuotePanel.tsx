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
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type IssueServiceQuoteInput, type ServiceRequest } from '../api/contractApi';
import { dateTimeInputToInstant } from '../api/scheduleTime';
import {
  useAcceptServiceQuote,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
} from '../hooks/useContracts';

function describeDroneLegalCategory(model?: string | null): string {
  if (!model) return 'Chưa rõ MTOW · Kiểm tra Hạng A/B';
  const match = model.match(/mtow\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  const lower = model.toLowerCase();
  let mtow: number | null = match?.[1] ? Number(match[1].replace(',', '.')) : null;
  if (mtow == null) {
    if (lower.includes('matrice 350') || lower.includes('m350') || lower.includes('matrice 300')) mtow = 9.2;
    else if (lower.includes('matrice 30') || lower.includes('m30')) mtow = 4.07;
    else if (lower.includes('wingtra')) mtow = 4.5;
    else if (lower.includes('elios 3') && lower.includes('lidar')) mtow = 2.5;
    else if (lower.includes('mavic 3') || lower.includes('m3e') || lower.includes('m3t')) mtow = 1.05;
    else if (lower.includes('mini 4')) mtow = 0.249;
  }
  if (mtow == null) return 'NĐ 288/2025 · Kiểm tra MTOW';
  if (mtow < 0.25) return `Loại 1 (${mtow} kg < 0,25 kg) · Bằng Hạng A/B`;
  if (mtow < 2) return `Loại 2 (${mtow} kg: 0,25–<2 kg) · Bằng Hạng A/B`;
  if (mtow < 25) return `Loại 3 (${mtow} kg: 2–<25 kg) · Bắt buộc Bằng Hạng B`;
  if (mtow < 150) return `Loại 4 (${mtow} kg: 25–<150 kg) · Bắt buộc Bằng Hạng B`;
  return `Loại 5 (${mtow} kg ≥ 150 kg) · Bắt buộc Bằng Hạng B`;
}

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
  const { locale, t } = useLocale();
  const latest = request.quotes[0];
  const accept = useAcceptServiceQuote(request.id);
  const issue = useIssueServiceQuote(request.id);
  const inspectors = usePartnerInspectors(manager);
  const drones = usePartnerDrones(manager);

  const [scope, setScope] = useState(request.description);
  const [start, setStart] = useState(`${request.requestedFrom}T08:00`);
  const [end, setEnd] = useState(`${request.requestedFrom}T10:00`);
  const [inspectorId, setInspectorId] = useState('');
  const [droneId, setDroneId] = useState('');
  const [price, setPrice] = useState('11000000');
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);

  const availableDrones = (drones.data ?? []).filter((drone) => drone.inspectorOwnerId === inspectorId);
  const selectedDroneId = availableDrones.some((drone) => drone.id === droneId) ? droneId : '';
  const hasDispatchedOccurrence = request.occurrences.some(
    (o) => o.status === 'ASSIGNED' || (o.status as string) === 'COMPLETED',
  );

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
        pricePerOccurrenceVnd: Math.round(amount),
        pricePerOccurrenceUsd: Math.round((amount / 25000) * 100) / 100,
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
      setConfirmAcceptOpen(false);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to accept quote.';
      onError(msg);
    }
  };

  const formatQuotePrice = (quote: ServiceRequest['quotes'][number]) =>
    quote.currency === 'VND' || (quote.pricePerOccurrenceVnd != null && quote.pricePerOccurrenceVnd > 0)
      ? `${Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND / ${locale === 'vi' ? 'đợt' : 'occurrence'}`
      : `$${quote.pricePerOccurrenceUsd.toFixed(2)} USD / occurrence`;

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Quotes
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {request.quotes.length === 0 ? (
            <Typography color="text.secondary">
              {hasDispatchedOccurrence
                ? t('Commercial terms settled under active dispatch schedule.')
                : 'No quote issued yet.'}
            </Typography>
          ) : (
            request.quotes.map((quote) => {
              const isLatest = quote.versionNo === latest?.versionNo;
              const matchedInspector = (inspectors.data ?? []).find((i) => i.id === quote.inspectorId);
              const matchedDrone = (drones.data ?? []).find((d) => d.id === quote.droneId);
              const inspectorLabel =
                matchedInspector?.fullName ??
                (quote.inspectorId ? t('Assigned partner pilot') : t('Unassigned'));
              const droneLabel = matchedDrone
                ? `${matchedDrone.model} (${matchedDrone.serialNumber})`
                : quote.droneId
                  ? t('Assigned inspection drone')
                  : t('Unassigned');

              return (
                <Box
                  key={quote.id}
                  sx={{
                    p: 2,
                    borderRadius: '8px',
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
                      label={formatQuotePrice(quote)}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                    {quote.scopeSnapshot}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    First occurrence proposal: {new Date(quote.firstOccurrenceStartAt).toLocaleString()} –{' '}
                    {new Date(quote.firstOccurrenceEndAt).toLocaleString()}
                    {manager && (quote.inspectorId || quote.droneId)
                      ? ` · ${t('Inspector')}: ${inspectorLabel} · ${t('Drone')}: ${droneLabel}`
                      : ''}
                  </Typography>
                  {customer && request.status === 'QUOTED' && isLatest && (
                    <Box sx={{ mt: 1.5 }}>
                      <LoadingButton
                        loading={accept.isPending}
                        variant="contained"
                        color="success"
                        onClick={() => setConfirmAcceptOpen(true)}
                        sx={{ fontWeight: 700, borderRadius: '8px' }}
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
                        {drone.serialNumber} · {drone.model} ({describeDroneLegalCategory(drone.model)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label={locale === 'vi' ? 'Đơn giá mỗi đợt bay (VND)' : 'Price per occurrence (VND)'}
                type="number"
                size="small"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                helperText={
                  locale === 'vi'
                    ? 'Ví dụ: 11.000.000 VND (tự động quy đổi USD tương đương)'
                    : 'e.g. 11,000,000 VND (automatically converted to USD equivalent)'
                }
              />
              <Box sx={{ pt: 0.5 }}>
                <LoadingButton
                  loading={issue.isPending}
                  variant="contained"
                  onClick={() => void issueQuote()}
                  sx={{ borderRadius: '8px', fontWeight: 700 }}
                >
                  Issue new quote version
                </LoadingButton>
              </Box>
            </Stack>
          </Box>
        )}

        <ConfirmDialog
          open={confirmAcceptOpen}
          title={t('Confirm Quote Acceptance')}
          message={
            latest
              ? locale === 'vi'
                ? `Bạn xác nhận đồng ý Báo giá Phiên bản ${latest.versionNo} (${formatQuotePrice(latest)})? Bước tiếp theo: hai bên ký hợp đồng giấy ngoại tuyến và Quản lý sàn sẽ tải bản scan hợp đồng đã ký lên hệ thống.`
                : `Confirm acceptance of Quote Version ${latest.versionNo} (${formatQuotePrice(latest)})? Next step: both parties sign the paper contract offline and the Platform Manager uploads the signed contract scan before flight dispatch.`
              : ''
          }
          confirmLabel={t('Accept quote')}
          cancelLabel={t('Cancel')}
          confirmColor="success"
          loading={accept.isPending}
          onCancel={() => setConfirmAcceptOpen(false)}
          onConfirm={() => void acceptLatest()}
        />
      </CardContent>
    </Card>
  );
}
