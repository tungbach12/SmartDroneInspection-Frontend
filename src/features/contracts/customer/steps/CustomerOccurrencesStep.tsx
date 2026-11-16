import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { ContractFileBanner } from '../../shared/ContractFileBanner';

interface CustomerOccurrencesStepProps {
  request: ServiceRequest;
  onError: (message: string) => void;
}

export function CustomerOccurrencesStep({
  request,
  onError,
}: CustomerOccurrencesStepProps) {
  const { formatNumber, t } = useLocale();

  return (
    <Stack spacing={2.5}>
      <ContractFileBanner request={request} onError={onError} />

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {t('Occurrences')} ({request.occurrences.length})
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {t('Occurrence')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {t('Requested window')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{t('Status')}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {t('Service invoice')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {t('Action')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {request.occurrences.map((occurrence) => {
                const isAssigned = occurrence.status === 'ASSIGNED';
                const isPaid = occurrence.paymentStatus === 'PAID';
                const isPaymentDue = occurrence.paymentStatus === 'PAYMENT_DUE';
                const feeVnd =
                  occurrence.totalPrice != null && occurrence.totalPrice > 0
                    ? `${formatNumber(occurrence.totalPrice)} ₫`
                    : '—';

                return (
                  <TableRow key={occurrence.id} hover>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {t('Occurrence')} {occurrence.occurrenceIndex}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
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
                        <Chip
                          size="small"
                          label={occurrence.status.replaceAll('_', ' ')}
                          color={isAssigned ? 'success' : 'default'}
                          sx={{ height: 22, borderRadius: '6px', fontWeight: 600 }}
                        />
                        {occurrence.reportAcceptedAt && (
                          <Chip
                            size="small"
                            label={t('Report accepted')}
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, borderRadius: '6px', fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {feeVnd}
                        </Typography>
                        {isPaid && (
                          <Chip
                            size="small"
                            icon={<CheckCircleRounded sx={{ fontSize: 14 }} />}
                            label={t('Paid')}
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, borderRadius: '6px', fontWeight: 600 }}
                          />
                        )}
                        {isPaymentDue && (
                          <Chip
                            size="small"
                            label={t('Payment Due')}
                            color="warning"
                            sx={{ height: 22, borderRadius: '6px', fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {occurrence.inspectionId ? (
                        <Button
                          component="a"
                          href={`/client/inspections/${occurrence.inspectionId}/${
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
      </Box>
    </Stack>
  );
}
