import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { Link } from 'react-router-dom';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { resolveOccurrenceStatusChipProps } from '../../shared/contractStage';

interface CustomerOccurrencesStepProps {
  request: ServiceRequest;
  onError: (message: string) => void;
}

export function CustomerOccurrencesStep({
  request,
}: CustomerOccurrencesStepProps) {
  const { formatNumber, t } = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isOneTime =
    request.requestType === 'ONE_TIME' && request.occurrences.length <= 1;

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          borderColor: 'divider',
          borderRadius: '12px',
          bgcolor: 'background.paper',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {isOneTime
              ? t('Scheduled inspection')
              : `${t('Occurrences')} (${request.occurrences.length})`}
          </Typography>
        </Box>

        {isMobile ? (
          <Box>
          {request.occurrences.map((occurrence, index) => {
            const isCancelled = occurrence.status === 'CANCELLED';
            const occurrenceChip = resolveOccurrenceStatusChipProps(occurrence.status);
            const isPaid = occurrence.paymentStatus === 'PAID';
            const isPaymentDue = occurrence.paymentStatus === 'PAYMENT_DUE';
            const feeVnd =
              occurrence.totalPrice != null && occurrence.totalPrice > 0
                ? `${formatNumber(occurrence.totalPrice)} ₫`
                : '—';
            const inspectionUrl =
              !isCancelled && occurrence.inspectionId
                ? `/client/inspections/${occurrence.inspectionId}/${
                    occurrence.reportAcceptedAt || isPaid ? 'report' : 'tracking'
                  }`
                : null;

            return (
              <Box
                key={occurrence.id}
                sx={{
                  p: 2,
                  borderTop: index > 0 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {isOneTime
                          ? t('Inspection flight')
                          : `${t('Occurrence')} ${occurrence.occurrenceIndex}`}
                      </Typography>
                      <StatusChip
                        status={occurrenceChip.status}
                        label={occurrenceChip.label}
                        tone={occurrenceChip.tone}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {feeVnd}
                    </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(occurrence.plannedStartAt).toLocaleString(undefined, {
                      timeZone: request.timezone,
                    })}{' '}
                    –{' '}
                    {new Date(occurrence.plannedEndAt).toLocaleString(undefined, {
                      timeZone: request.timezone,
                    })}
                  </Typography>

                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {isPaid && <StatusChip status="paid" label="Paid" tone="success" />}
                      {isPaymentDue && <StatusChip status="payment_due" label="Payment Due" tone="warning" />}
                      {occurrence.reportAcceptedAt && (
                        <StatusChip status="accepted" label="Report accepted" tone="success" />
                      )}
                    </Stack>
                    {inspectionUrl && (
                      <Button
                        component={Link}
                        to={inspectionUrl}
                        size="small"
                        variant="outlined"
                        endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                        sx={{
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('Open inspection')}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
          </Box>
        ) : (
          <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {isOneTime ? t('Inspection') : t('Occurrence')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('Requested window')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>{t('Status')}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('Service invoice')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('Action')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {request.occurrences.map((occurrence) => {
                const isCancelled = occurrence.status === 'CANCELLED';
                const occurrenceChip = resolveOccurrenceStatusChipProps(occurrence.status);
                const isPaid = occurrence.paymentStatus === 'PAID';
                const isPaymentDue = occurrence.paymentStatus === 'PAYMENT_DUE';
                const feeVnd =
                  occurrence.totalPrice != null && occurrence.totalPrice > 0
                    ? `${formatNumber(occurrence.totalPrice)} ₫`
                    : '—';

                return (
                  <TableRow key={occurrence.id} hover>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {isOneTime
                        ? t('Inspection flight')
                        : `${t('Occurrence')} ${occurrence.occurrenceIndex}`}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                      {new Date(occurrence.plannedStartAt).toLocaleString(undefined, {
                        timeZone: request.timezone,
                      })}{' '}
                      –{' '}
                      {new Date(occurrence.plannedEndAt).toLocaleString(undefined, {
                        timeZone: request.timezone,
                      })}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <StatusChip
                          status={occurrenceChip.status}
                          label={occurrenceChip.label}
                          tone={occurrenceChip.tone}
                        />
                        {occurrence.reportAcceptedAt && (
                          <StatusChip status="accepted" label="Report accepted" tone="success" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {feeVnd}
                        </Typography>
                        {isPaid && <StatusChip status="paid" label="Paid" tone="success" />}
                        {isPaymentDue && (
                          <StatusChip status="payment_due" label="Payment Due" tone="warning" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {!isCancelled && occurrence.inspectionId ? (
                        <Button
                          component={Link}
                          to={`/client/inspections/${occurrence.inspectionId}/${
                            occurrence.reportAcceptedAt || isPaid ? 'report' : 'tracking'
                          }`}
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                          sx={{
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('Open inspection')}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
